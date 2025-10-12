const MedicineDose = require('../../models/MedicineDose');

describe('MedicineDose Model', () => {
  describe('Constructor', () => {
    test('should create dose with default values', () => {
      const dose = new MedicineDose();
      
      expect(dose.id).toBeNull();
      expect(dose.medicine_id).toBeNull();
      expect(dose.dose_amount).toBeNull();
      expect(dose.time_of_day).toBeNull();
      expect(dose.route_override).toBeNull();
      expect(dose.instructions).toBe('');
      expect(dose.created_at).toBeNull();
    });

    test('should create dose with provided data', () => {
      const data = {
        id: 1,
        medicine_id: 5,
        dose_amount: 2.5,
        time_of_day: '08:30',
        route_override: 2,
        instructions: 'Take with breakfast',
        created_at: '2024-01-01T00:00:00Z'
      };

      const dose = new MedicineDose(data);
      
      expect(dose.id).toBe(1);
      expect(dose.medicine_id).toBe(5);
      expect(dose.dose_amount).toBe(2.5);
      expect(dose.time_of_day).toBe('08:30');
      expect(dose.route_override).toBe(2);
      expect(dose.instructions).toBe('Take with breakfast');
      expect(dose.created_at).toBe('2024-01-01T00:00:00Z');
    });

    test('should handle zero values correctly', () => {
      const data = {
        medicine_id: 0,
        dose_amount: 0,
        route_override: 0
      };

      const dose = new MedicineDose(data);
      
      expect(dose.medicine_id).toBe(0);
      expect(dose.dose_amount).toBe(0);
      expect(dose.route_override).toBe(0);
    });
  });

  describe('Validation', () => {
    test('should validate required fields', () => {
      const dose = new MedicineDose();
      const result = dose.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toContainEqual({ field: 'medicine_id', message: 'Medicine ID is required' });
      expect(result.errors).toContainEqual({ field: 'dose_amount', message: 'Dose amount is required' });
      expect(result.errors).toContainEqual({ field: 'time_of_day', message: 'Time of day is required' });
    });

    test('should validate medicine_id as positive integer', () => {
      const dose = new MedicineDose({
        medicine_id: -1,
        dose_amount: 1,
        time_of_day: '08:00'
      });
      const result = dose.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({ field: 'medicine_id', message: 'Medicine ID must be a positive integer' });
    });

    test('should validate dose_amount as positive number', () => {
      const dose = new MedicineDose({
        medicine_id: 1,
        dose_amount: -1,
        time_of_day: '08:00'
      });
      const result = dose.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({ field: 'dose_amount', message: 'Dose amount must be a positive number' });
    });

    test('should validate time format', () => {
      const dose = new MedicineDose({
        medicine_id: 1,
        dose_amount: 1,
        time_of_day: 'invalid-time'
      });
      const result = dose.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({ field: 'time_of_day', message: 'Time of day must be in HH:MM format (24-hour)' });
    });

    test('should validate route_override as positive integer when provided', () => {
      const dose = new MedicineDose({
        medicine_id: 1,
        dose_amount: 1,
        time_of_day: '08:00',
        route_override: -1
      });
      const result = dose.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({ field: 'route_override', message: 'Route override must be a positive integer' });
    });

    test('should pass validation with valid data', () => {
      const dose = new MedicineDose({
        medicine_id: 1,
        dose_amount: 2.5,
        time_of_day: '08:30',
        route_override: 2,
        instructions: 'Take with food'
      });
      const result = dose.validate();
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should pass validation without optional fields', () => {
      const dose = new MedicineDose({
        medicine_id: 1,
        dose_amount: 1,
        time_of_day: '08:00'
      });
      const result = dose.validate();
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Time Format Validation', () => {
    test('should validate correct time formats', () => {
      const dose = new MedicineDose();
      
      expect(dose.isValidTimeFormat('00:00')).toBe(true);
      expect(dose.isValidTimeFormat('08:30')).toBe(true);
      expect(dose.isValidTimeFormat('12:00')).toBe(true);
      expect(dose.isValidTimeFormat('23:59')).toBe(true);
      expect(dose.isValidTimeFormat('9:05')).toBe(true);
    });

    test('should reject invalid time formats', () => {
      const dose = new MedicineDose();
      
      expect(dose.isValidTimeFormat('24:00')).toBe(false);
      expect(dose.isValidTimeFormat('12:60')).toBe(false);
      expect(dose.isValidTimeFormat('8:5')).toBe(false);
      expect(dose.isValidTimeFormat('08:5')).toBe(false);
      expect(dose.isValidTimeFormat('invalid')).toBe(false);
      expect(dose.isValidTimeFormat('')).toBe(false);
      expect(dose.isValidTimeFormat(null)).toBe(false);
      expect(dose.isValidTimeFormat(123)).toBe(false);
    });

    test('should reject out-of-range times', () => {
      const dose = new MedicineDose();
      
      expect(dose.isValidTimeFormat('25:00')).toBe(false);
      expect(dose.isValidTimeFormat('12:70')).toBe(false);
      expect(dose.isValidTimeFormat('-1:30')).toBe(false);
    });
  });

  describe('Time Calculations', () => {
    test('should convert time to minutes correctly', () => {
      const dose = new MedicineDose({ time_of_day: '08:30' });
      
      expect(dose.getTimeInMinutes()).toBe(510); // 8*60 + 30
    });

    test('should handle midnight and noon correctly', () => {
      const midnightDose = new MedicineDose({ time_of_day: '00:00' });
      const noonDose = new MedicineDose({ time_of_day: '12:00' });
      
      expect(midnightDose.getTimeInMinutes()).toBe(0);
      expect(noonDose.getTimeInMinutes()).toBe(720); // 12*60
    });

    test('should return 0 for invalid time', () => {
      const dose = new MedicineDose({ time_of_day: 'invalid' });
      
      expect(dose.getTimeInMinutes()).toBe(0);
    });

    test('should convert any time string to minutes', () => {
      const dose = new MedicineDose();
      
      expect(dose.convertTimeToMinutes('14:45')).toBe(885); // 14*60 + 45
      expect(dose.convertTimeToMinutes('invalid')).toBe(0);
    });
  });

  describe('Time Formatting', () => {
    test('should format time in 24-hour format by default', () => {
      const dose = new MedicineDose({ time_of_day: '08:30' });
      
      expect(dose.getFormattedTime()).toBe('08:30');
      expect(dose.getFormattedTime('24h')).toBe('08:30');
    });

    test('should format time in 12-hour format', () => {
      const morningDose = new MedicineDose({ time_of_day: '08:30' });
      const afternoonDose = new MedicineDose({ time_of_day: '14:45' });
      const midnightDose = new MedicineDose({ time_of_day: '00:00' });
      const noonDose = new MedicineDose({ time_of_day: '12:00' });
      
      expect(morningDose.getFormattedTime('12h')).toBe('8:30 AM');
      expect(afternoonDose.getFormattedTime('12h')).toBe('2:45 PM');
      expect(midnightDose.getFormattedTime('12h')).toBe('12:00 AM');
      expect(noonDose.getFormattedTime('12h')).toBe('12:00 PM');
    });

    test('should return original time for invalid format', () => {
      const dose = new MedicineDose({ time_of_day: 'invalid' });
      
      expect(dose.getFormattedTime()).toBe('invalid');
      expect(dose.getFormattedTime('12h')).toBe('invalid');
    });
  });

  describe('Schedule Matching', () => {
    test('should match exact scheduled time', () => {
      const dose = new MedicineDose({ time_of_day: '08:30' });
      
      expect(dose.isScheduledAt('08:30')).toBe(true);
      expect(dose.isScheduledAt('08:31')).toBe(false);
    });

    test('should match within tolerance', () => {
      const dose = new MedicineDose({ time_of_day: '08:30' });
      
      expect(dose.isScheduledAt('08:25', 10)).toBe(true);  // 5 minutes away
      expect(dose.isScheduledAt('08:35', 10)).toBe(true);  // 5 minutes away
      expect(dose.isScheduledAt('08:20', 10)).toBe(true);  // exactly 10 minutes away
      expect(dose.isScheduledAt('08:19', 10)).toBe(false); // 11 minutes away
      expect(dose.isScheduledAt('08:41', 10)).toBe(false); // 11 minutes away
    });

    test('should handle invalid time strings', () => {
      const dose = new MedicineDose({ time_of_day: '08:30' });
      
      expect(dose.isScheduledAt('invalid')).toBe(false);
      expect(dose.isScheduledAt('')).toBe(false);
      expect(dose.isScheduledAt(null)).toBe(false);
    });
  });

  describe('Database Format Conversion', () => {
    test('should convert to database format', () => {
      const dose = new MedicineDose({
        id: 1,
        medicine_id: 5,
        dose_amount: 2.5,
        time_of_day: '08:30',
        route_override: 2,
        instructions: '  Take with food  '
      });

      const dbFormat = dose.toDbFormat();
      
      expect(dbFormat.id).toBe(1);
      expect(dbFormat.medicine_id).toBe(5);
      expect(dbFormat.dose_amount).toBe(2.5);
      expect(dbFormat.time_of_day).toBe('08:30');
      expect(dbFormat.route_override).toBe(2);
      expect(dbFormat.instructions).toBe('Take with food');
    });

    test('should create from database row', () => {
      const row = {
        id: 1,
        medicine_id: 5,
        dose_amount: '2.50',
        time_of_day: '08:30',
        route_override: 2,
        instructions: 'Take with food',
        created_at: '2024-01-01T00:00:00Z'
      };

      const dose = MedicineDose.fromDbRow(row);
      
      expect(dose.id).toBe(1);
      expect(dose.medicine_id).toBe(5);
      expect(dose.dose_amount).toBe(2.50);
      expect(dose.time_of_day).toBe('08:30');
      expect(dose.route_override).toBe(2);
      expect(dose.instructions).toBe('Take with food');
      expect(dose.created_at).toBe('2024-01-01T00:00:00Z');
    });
  });

  describe('Static Methods', () => {
    test('should sort doses by time', () => {
      const doses = [
        new MedicineDose({ time_of_day: '14:00' }),
        new MedicineDose({ time_of_day: '08:00' }),
        new MedicineDose({ time_of_day: '20:00' }),
        new MedicineDose({ time_of_day: '06:30' })
      ];

      const sorted = MedicineDose.sortByTime(doses);
      
      expect(sorted[0].time_of_day).toBe('06:30');
      expect(sorted[1].time_of_day).toBe('08:00');
      expect(sorted[2].time_of_day).toBe('14:00');
      expect(sorted[3].time_of_day).toBe('20:00');
    });

    test('should group doses by time period', () => {
      const doses = [
        new MedicineDose({ time_of_day: '07:00' }), // morning
        new MedicineDose({ time_of_day: '13:00' }), // afternoon
        new MedicineDose({ time_of_day: '19:00' }), // evening
        new MedicineDose({ time_of_day: '23:00' }), // night
        new MedicineDose({ time_of_day: '02:00' })  // night
      ];

      const grouped = MedicineDose.groupByTimePeriod(doses);
      
      expect(grouped.morning).toHaveLength(1);
      expect(grouped.afternoon).toHaveLength(1);
      expect(grouped.evening).toHaveLength(1);
      expect(grouped.night).toHaveLength(2);
      
      expect(grouped.morning[0].time_of_day).toBe('07:00');
      expect(grouped.afternoon[0].time_of_day).toBe('13:00');
      expect(grouped.evening[0].time_of_day).toBe('19:00');
      expect(grouped.night.map(d => d.time_of_day)).toContain('23:00');
      expect(grouped.night.map(d => d.time_of_day)).toContain('02:00');
    });
  });

  describe('Daily Dose Amount', () => {
    test('should return dose amount for daily calculation', () => {
      const dose = new MedicineDose({ dose_amount: 2.5 });
      
      expect(dose.getDailyDoseAmount()).toBe(2.5);
    });
  });
});