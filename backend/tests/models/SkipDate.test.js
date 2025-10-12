const SkipDate = require('../../models/SkipDate');

describe('SkipDate Model', () => {
  describe('Constructor', () => {
    test('should create skip date with default values', () => {
      const skipDate = new SkipDate();
      
      expect(skipDate.id).toBeNull();
      expect(skipDate.medicine_id).toBeNull();
      expect(skipDate.skip_date).toBeNull();
      expect(skipDate.reason).toBe('');
      expect(skipDate.created_at).toBeNull();
    });

    test('should create skip date with provided data', () => {
      const data = {
        id: 1,
        medicine_id: 5,
        skip_date: '2024-12-25',
        reason: 'Holiday',
        created_at: '2024-01-01T00:00:00Z'
      };

      const skipDate = new SkipDate(data);
      
      expect(skipDate.id).toBe(1);
      expect(skipDate.medicine_id).toBe(5);
      expect(skipDate.skip_date).toBe('2024-12-25');
      expect(skipDate.reason).toBe('Holiday');
      expect(skipDate.created_at).toBe('2024-01-01T00:00:00Z');
    });
  });

  describe('Validation', () => {
    test('should validate required fields', () => {
      const skipDate = new SkipDate();
      const result = skipDate.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContainEqual({ field: 'medicine_id', message: 'Medicine ID is required' });
      expect(result.errors).toContainEqual({ field: 'skip_date', message: 'Skip date is required' });
    });

    test('should validate medicine_id as positive integer', () => {
      const skipDate = new SkipDate({
        medicine_id: -1,
        skip_date: '2024-01-01'
      });
      const result = skipDate.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({ field: 'medicine_id', message: 'Medicine ID must be a positive integer' });
    });

    test('should validate skip_date format', () => {
      const skipDate = new SkipDate({
        medicine_id: 1,
        skip_date: 'invalid-date'
      });
      const result = skipDate.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({ field: 'skip_date', message: 'Skip date must be a valid date in YYYY-MM-DD format' });
    });

    test('should pass validation with valid data', () => {
      const skipDate = new SkipDate({
        medicine_id: 1,
        skip_date: '2024-12-25',
        reason: 'Holiday'
      });
      const result = skipDate.validate();
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Date Validation', () => {
    test('should validate correct date format', () => {
      const skipDate = new SkipDate();
      
      expect(skipDate.isValidDate('2024-01-01')).toBe(true);
      expect(skipDate.isValidDate('2024-12-31')).toBe(true);
    });

    test('should reject invalid date formats', () => {
      const skipDate = new SkipDate();
      
      expect(skipDate.isValidDate('2024-1-1')).toBe(false);
      expect(skipDate.isValidDate('01-01-2024')).toBe(false);
      expect(skipDate.isValidDate('2024/01/01')).toBe(false);
      expect(skipDate.isValidDate('invalid')).toBe(false);
      expect(skipDate.isValidDate('')).toBe(false);
      expect(skipDate.isValidDate(null)).toBe(false);
    });

    test('should reject invalid dates', () => {
      const skipDate = new SkipDate();
      
      expect(skipDate.isValidDate('2024-13-01')).toBe(false);
      expect(skipDate.isValidDate('2024-02-30')).toBe(false);
      expect(skipDate.isValidDate('2024-00-01')).toBe(false);
    });
  });

  describe('Date Application', () => {
    test('should check if skip date applies to given date', () => {
      const skipDate = new SkipDate({ skip_date: '2024-12-25' });
      
      expect(skipDate.appliesToDate('2024-12-25')).toBe(true);
      expect(skipDate.appliesToDate('2024-12-24')).toBe(false);
      expect(skipDate.appliesToDate('invalid')).toBe(false);
    });
  });

  describe('Date Comparisons', () => {
    // Note: These tests may be sensitive to the current date
    // In a real application, you might want to mock the Date constructor
    
    test('should identify past dates', () => {
      const pastSkipDate = new SkipDate({ skip_date: '2020-01-01' });
      
      expect(pastSkipDate.isPastDate()).toBe(true);
    });

    test('should identify future dates', () => {
      const futureSkipDate = new SkipDate({ skip_date: '2030-01-01' });
      
      expect(futureSkipDate.isFutureDate()).toBe(true);
    });

    test('should handle invalid dates in comparisons', () => {
      const invalidSkipDate = new SkipDate({ skip_date: 'invalid' });
      
      expect(invalidSkipDate.isPastDate()).toBe(false);
      expect(invalidSkipDate.isFutureDate()).toBe(false);
      expect(invalidSkipDate.isToday()).toBe(false);
    });
  });

  describe('Date Formatting', () => {
    test('should format date in different formats', () => {
      const skipDate = new SkipDate({ skip_date: '2024-03-15' });
      
      expect(skipDate.getFormattedDate()).toBe('2024-03-15');
      expect(skipDate.getFormattedDate('MM/DD/YYYY')).toBe('03/15/2024');
      expect(skipDate.getFormattedDate('DD/MM/YYYY')).toBe('15/03/2024');
      expect(skipDate.getFormattedDate('readable')).toContain('March');
      expect(skipDate.getFormattedDate('readable')).toContain('15');
      expect(skipDate.getFormattedDate('readable')).toContain('2024');
    });

    test('should return original date for invalid dates', () => {
      const skipDate = new SkipDate({ skip_date: 'invalid' });
      
      expect(skipDate.getFormattedDate()).toBe('invalid');
      expect(skipDate.getFormattedDate('MM/DD/YYYY')).toBe('invalid');
    });
  });

  describe('Medication Date Validation', () => {
    test('should validate skip date within medication range', () => {
      const skipDate = new SkipDate({ skip_date: '2024-06-15' });
      
      const result = skipDate.validateAgainstMedicationDates('2024-01-01', '2024-12-31');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject skip date before medication start', () => {
      const skipDate = new SkipDate({ skip_date: '2023-12-31' });
      
      const result = skipDate.validateAgainstMedicationDates('2024-01-01', '2024-12-31');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({ 
        field: 'skip_date', 
        message: 'Skip date cannot be before medication start date' 
      });
    });

    test('should reject skip date after medication end', () => {
      const skipDate = new SkipDate({ skip_date: '2025-01-01' });
      
      const result = skipDate.validateAgainstMedicationDates('2024-01-01', '2024-12-31');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({ 
        field: 'skip_date', 
        message: 'Skip date cannot be after medication end date' 
      });
    });

    test('should handle ongoing medications (no end date)', () => {
      const skipDate = new SkipDate({ skip_date: '2025-01-01' });
      
      const result = skipDate.validateAgainstMedicationDates('2024-01-01', null);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Database Format Conversion', () => {
    test('should convert to database format', () => {
      const skipDate = new SkipDate({
        id: 1,
        medicine_id: 5,
        skip_date: '2024-12-25',
        reason: '  Holiday  '
      });

      const dbFormat = skipDate.toDbFormat();
      
      expect(dbFormat.id).toBe(1);
      expect(dbFormat.medicine_id).toBe(5);
      expect(dbFormat.skip_date).toBe('2024-12-25');
      expect(dbFormat.reason).toBe('Holiday');
    });

    test('should create from database row', () => {
      const row = {
        id: 1,
        medicine_id: 5,
        skip_date: '2024-12-25',
        reason: 'Holiday',
        created_at: '2024-01-01T00:00:00Z'
      };

      const skipDate = SkipDate.fromDbRow(row);
      
      expect(skipDate.id).toBe(1);
      expect(skipDate.medicine_id).toBe(5);
      expect(skipDate.skip_date).toBe('2024-12-25');
      expect(skipDate.reason).toBe('Holiday');
      expect(skipDate.created_at).toBe('2024-01-01T00:00:00Z');
    });
  });

  describe('Static Methods', () => {
    test('should sort skip dates by date', () => {
      const skipDates = [
        new SkipDate({ skip_date: '2024-12-25' }),
        new SkipDate({ skip_date: '2024-01-01' }),
        new SkipDate({ skip_date: '2024-06-15' })
      ];

      const sorted = SkipDate.sortByDate(skipDates);
      
      expect(sorted[0].skip_date).toBe('2024-01-01');
      expect(sorted[1].skip_date).toBe('2024-06-15');
      expect(sorted[2].skip_date).toBe('2024-12-25');
    });

    test('should filter skip dates by date range', () => {
      const skipDates = [
        new SkipDate({ skip_date: '2024-01-01' }),
        new SkipDate({ skip_date: '2024-06-15' }),
        new SkipDate({ skip_date: '2024-12-25' })
      ];

      const filtered = SkipDate.filterByDateRange(skipDates, '2024-06-01', '2024-12-01');
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].skip_date).toBe('2024-06-15');
    });

    test('should get skip dates for specific month', () => {
      const skipDates = [
        new SkipDate({ skip_date: '2024-06-01' }),
        new SkipDate({ skip_date: '2024-06-15' }),
        new SkipDate({ skip_date: '2024-07-01' })
      ];

      const juneSkipDates = SkipDate.getForMonth(skipDates, 2024, 6);
      
      expect(juneSkipDates).toHaveLength(2);
      expect(juneSkipDates.map(sd => sd.skip_date)).toContain('2024-06-01');
      expect(juneSkipDates.map(sd => sd.skip_date)).toContain('2024-06-15');
    });
  });
});