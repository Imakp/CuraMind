const ScheduleService = require('../../services/ScheduleService');
const MedicationRepository = require('../../repositories/MedicationRepository');
const DoseRepository = require('../../repositories/DoseRepository');
const SkipDateRepository = require('../../repositories/SkipDateRepository');
const Medication = require('../../models/Medication');
const MedicineDose = require('../../models/MedicineDose');
const SkipDate = require('../../models/SkipDate');

// Mock the repositories
jest.mock('../../repositories/MedicationRepository');
jest.mock('../../repositories/DoseRepository');
jest.mock('../../repositories/SkipDateRepository');

describe('ScheduleService', () => {
  let scheduleService;
  let mockMedicationRepository;
  let mockDoseRepository;
  let mockSkipDateRepository;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create service instance
    scheduleService = new ScheduleService();
    
    // Get mock instances
    mockMedicationRepository = scheduleService.medicationRepository;
    mockDoseRepository = scheduleService.doseRepository;
    mockSkipDateRepository = scheduleService.skipDateRepository;
  });

  describe('generateDailySchedule', () => {
    const testDate = '2024-01-15';
    
    beforeEach(() => {
      // Setup default mocks
      mockMedicationRepository.findActiveByDate.mockResolvedValue([]);
      mockDoseRepository.findByMedicationIds.mockResolvedValue([]);
      mockSkipDateRepository.findByDate.mockResolvedValue([]);
    });

    test('should generate empty schedule when no active medications', async () => {
      const result = await scheduleService.generateDailySchedule(testDate);

      expect(result).toEqual({
        date: testDate,
        medications: [],
        schedule: {
          morning: [],
          afternoon: [],
          evening: [],
          night: []
        },
        total_medications: 0,
        total_doses: 0
      });

      expect(mockMedicationRepository.findActiveByDate).toHaveBeenCalledWith(testDate);
    });

    test('should throw error for invalid date format', async () => {
      await expect(scheduleService.generateDailySchedule('invalid-date'))
        .rejects.toThrow('Date must be in YYYY-MM-DD format');
    });

    test('should generate schedule with medications and doses', async () => {
      const mockMedication = new Medication({
        id: 1,
        name: 'Test Medicine',
        strength: '10mg',
        route_id: 1,
        frequency_id: 1,
        start_date: '2024-01-01',
        end_date: null,
        sheet_size: 10,
        total_tablets: 100,
        notes: 'Test notes'
      });
      mockMedication.route_name = 'Oral';

      const mockDose1 = new MedicineDose({
        id: 1,
        medicine_id: 1,
        dose_amount: 1,
        time_of_day: '08:00',
        route_override: null,
        instructions: 'With breakfast'
      });

      const mockDose2 = new MedicineDose({
        id: 2,
        medicine_id: 1,
        dose_amount: 1,
        time_of_day: '20:00',
        route_override: null,
        instructions: 'With dinner'
      });

      mockMedicationRepository.findActiveByDate.mockResolvedValue([mockMedication]);
      mockDoseRepository.findByMedicationIds.mockResolvedValue([mockDose1, mockDose2]);
      mockSkipDateRepository.findByDate.mockResolvedValue([]);

      const result = await scheduleService.generateDailySchedule(testDate);

      expect(result.date).toBe(testDate);
      expect(result.total_medications).toBe(1);
      expect(result.total_doses).toBe(2);
      expect(result.schedule.morning).toHaveLength(1);
      expect(result.schedule.evening).toHaveLength(1);
      expect(result.schedule.morning[0]).toMatchObject({
        medication_id: 1,
        medication_name: 'Test Medicine',
        dose_amount: 1,
        time_of_day: '08:00'
      });
    });

    test('should exclude medications with skip dates', async () => {
      const mockMedication = new Medication({
        id: 1,
        name: 'Test Medicine',
        strength: '10mg',
        route_id: 1,
        frequency_id: 1,
        start_date: '2024-01-01',
        end_date: null,
        sheet_size: 10,
        total_tablets: 100
      });

      const mockSkipDate = new SkipDate({
        id: 1,
        medicine_id: 1,
        skip_date: testDate,
        reason: 'Doctor appointment'
      });

      mockMedicationRepository.findActiveByDate.mockResolvedValue([mockMedication]);
      mockDoseRepository.findByMedicationIds.mockResolvedValue([]);
      mockSkipDateRepository.findByDate.mockResolvedValue([mockSkipDate]);

      const result = await scheduleService.generateDailySchedule(testDate);

      expect(result.total_medications).toBe(0);
      expect(result.skipped_medications).toHaveLength(1);
      expect(result.skipped_medications[0]).toMatchObject({
        id: 1,
        name: 'Test Medicine',
        reason: 'Doctor appointment'
      });
    });

    test('should group doses by time periods correctly', async () => {
      const mockMedication = new Medication({
        id: 1,
        name: 'Test Medicine',
        strength: '10mg',
        route_id: 1,
        frequency_id: 1,
        start_date: '2024-01-01',
        end_date: null,
        sheet_size: 10,
        total_tablets: 100
      });

      const doses = [
        new MedicineDose({ id: 1, medicine_id: 1, dose_amount: 1, time_of_day: '06:00' }), // morning
        new MedicineDose({ id: 2, medicine_id: 1, dose_amount: 1, time_of_day: '14:00' }), // afternoon
        new MedicineDose({ id: 3, medicine_id: 1, dose_amount: 1, time_of_day: '19:00' }), // evening
        new MedicineDose({ id: 4, medicine_id: 1, dose_amount: 1, time_of_day: '23:00' })  // night
      ];

      mockMedicationRepository.findActiveByDate.mockResolvedValue([mockMedication]);
      mockDoseRepository.findByMedicationIds.mockResolvedValue(doses);
      mockSkipDateRepository.findByDate.mockResolvedValue([]);

      const result = await scheduleService.generateDailySchedule(testDate);

      expect(result.schedule.morning).toHaveLength(1);
      expect(result.schedule.afternoon).toHaveLength(1);
      expect(result.schedule.evening).toHaveLength(1);
      expect(result.schedule.night).toHaveLength(1);
    });
  });

  describe('generateMultiDaySchedule', () => {
    test('should generate schedule for multiple days', async () => {
      const startDate = '2024-01-15';
      const endDate = '2024-01-17';

      // Mock generateDailySchedule calls
      const mockDailySchedule = {
        date: '2024-01-15',
        medications: [],
        schedule: { morning: [], afternoon: [], evening: [], night: [] },
        total_medications: 0,
        total_doses: 0
      };

      jest.spyOn(scheduleService, 'generateDailySchedule').mockResolvedValue(mockDailySchedule);

      const result = await scheduleService.generateMultiDaySchedule(startDate, endDate);

      expect(result.start_date).toBe(startDate);
      expect(result.end_date).toBe(endDate);
      expect(result.total_days).toBe(3);
      expect(result.schedules).toHaveLength(3);
      expect(scheduleService.generateDailySchedule).toHaveBeenCalledTimes(3);
    });

    test('should throw error for invalid date range', async () => {
      await expect(scheduleService.generateMultiDaySchedule('2024-01-17', '2024-01-15'))
        .rejects.toThrow('Start date must be before or equal to end date');
    });

    test('should throw error for date range exceeding 30 days', async () => {
      await expect(scheduleService.generateMultiDaySchedule('2024-01-01', '2024-02-15'))
        .rejects.toThrow('Date range cannot exceed 30 days');
    });
  });

  describe('getWeeklySchedule', () => {
    test('should generate weekly schedule starting from Monday', async () => {
      const referenceDate = '2024-01-17'; // Wednesday
      
      jest.spyOn(scheduleService, 'generateMultiDaySchedule').mockResolvedValue({
        start_date: '2024-01-15',
        end_date: '2024-01-21',
        total_days: 7,
        schedules: []
      });

      const result = await scheduleService.getWeeklySchedule(referenceDate);

      expect(scheduleService.generateMultiDaySchedule).toHaveBeenCalledWith('2024-01-15', '2024-01-21');
      expect(result.total_days).toBe(7);
    });
  });

  describe('calculateActiveDays', () => {
    test('should calculate active days excluding skip dates', async () => {
      const medicationId = 1;
      const mockMedication = new Medication({
        id: 1,
        name: 'Test Medicine',
        start_date: '2024-01-01',
        end_date: '2024-01-10'
      });

      const mockSkipDates = [
        new SkipDate({ id: 1, medicine_id: 1, skip_date: '2024-01-03' }),
        new SkipDate({ id: 2, medicine_id: 1, skip_date: '2024-01-07' })
      ];

      mockMedicationRepository.findById.mockResolvedValue(mockMedication);
      mockSkipDateRepository.findByDateRange.mockResolvedValue(mockSkipDates);

      const result = await scheduleService.calculateActiveDays(medicationId);

      expect(result.total_days).toBe(10);
      expect(result.skip_days).toBe(2);
      expect(result.active_days).toBe(8);
      expect(result.skip_dates).toEqual(['2024-01-03', '2024-01-07']);
    });

    test('should throw error for non-existent medication', async () => {
      mockMedicationRepository.findById.mockResolvedValue(null);

      await expect(scheduleService.calculateActiveDays(999))
        .rejects.toThrow('Medication not found');
    });
  });

  describe('getNextScheduledDose', () => {
    test('should return next dose today if available', async () => {
      const medicationId = 1;
      const fromDateTime = new Date('2024-01-15T10:00:00');
      
      const mockMedication = new Medication({
        id: 1,
        name: 'Test Medicine',
        start_date: '2024-01-01',
        end_date: null
      });

      const mockDoses = [
        new MedicineDose({ id: 1, medicine_id: 1, dose_amount: 1, time_of_day: '08:00' }),
        new MedicineDose({ id: 2, medicine_id: 1, dose_amount: 1, time_of_day: '14:00' }),
        new MedicineDose({ id: 3, medicine_id: 1, dose_amount: 1, time_of_day: '20:00' })
      ];

      mockMedicationRepository.findById.mockResolvedValue(mockMedication);
      mockSkipDateRepository.shouldSkipOnDate.mockResolvedValue(false);
      mockDoseRepository.findByMedicationId.mockResolvedValue(mockDoses);

      const result = await scheduleService.getNextScheduledDose(medicationId, fromDateTime);

      expect(result.date).toBe('2024-01-15');
      expect(result.time).toBe('14:00');
      expect(result.dose.id).toBe(2);
    });

    test('should return null for inactive medication', async () => {
      const medicationId = 1;
      const mockMedication = new Medication({
        id: 1,
        name: 'Test Medicine',
        start_date: '2024-01-01',
        end_date: '2024-01-10'
      });

      mockMedicationRepository.findById.mockResolvedValue(mockMedication);

      const result = await scheduleService.getNextScheduledDose(medicationId, new Date('2024-01-15'));

      expect(result).toBeNull();
    });

    test('should skip to next day if on skip date', async () => {
      const medicationId = 1;
      const mockMedication = new Medication({
        id: 1,
        name: 'Test Medicine',
        start_date: '2024-01-01',
        end_date: null
      });

      mockMedicationRepository.findById.mockResolvedValue(mockMedication);
      mockSkipDateRepository.shouldSkipOnDate.mockResolvedValue(true);
      
      jest.spyOn(scheduleService, 'findNextNonSkipDate').mockResolvedValue({
        date: '2024-01-16',
        time: '08:00',
        dose: { id: 1 },
        medication: mockMedication
      });

      const result = await scheduleService.getNextScheduledDose(medicationId, new Date('2024-01-15'));

      expect(result.date).toBe('2024-01-16');
    });
  });

  describe('groupScheduleByTimePeriod', () => {
    test('should group schedule entries by time periods', () => {
      const scheduleEntries = [
        { time_of_day: '06:00', medication_name: 'Med1' },
        { time_of_day: '14:00', medication_name: 'Med2' },
        { time_of_day: '19:00', medication_name: 'Med3' },
        { time_of_day: '23:00', medication_name: 'Med4' }
      ];

      const result = scheduleService.groupScheduleByTimePeriod(scheduleEntries);

      expect(result.morning).toHaveLength(1);
      expect(result.afternoon).toHaveLength(1);
      expect(result.evening).toHaveLength(1);
      expect(result.night).toHaveLength(1);
      expect(result.morning[0].medication_name).toBe('Med1');
    });

    test('should sort entries within each period by time', () => {
      const scheduleEntries = [
        { time_of_day: '10:00', medication_name: 'Med2' },
        { time_of_day: '08:00', medication_name: 'Med1' },
        { time_of_day: '09:00', medication_name: 'Med3' }
      ];

      const result = scheduleService.groupScheduleByTimePeriod(scheduleEntries);

      expect(result.morning).toHaveLength(3);
      expect(result.morning[0].time_of_day).toBe('08:00');
      expect(result.morning[1].time_of_day).toBe('09:00');
      expect(result.morning[2].time_of_day).toBe('10:00');
    });
  });

  describe('calculateDailyConsumption', () => {
    test('should calculate total daily consumption from doses', () => {
      const doses = [
        new MedicineDose({ dose_amount: 1.5 }),
        new MedicineDose({ dose_amount: 2.0 }),
        new MedicineDose({ dose_amount: 0.5 })
      ];

      const result = scheduleService.calculateDailyConsumption(doses);

      expect(result).toBe(4.0);
    });

    test('should return 0 for empty doses array', () => {
      const result = scheduleService.calculateDailyConsumption([]);
      expect(result).toBe(0);
    });
  });

  describe('getScheduleSummary', () => {
    test('should return schedule summary with counts', async () => {
      const testDate = '2024-01-15';
      const mockSchedule = {
        date: testDate,
        total_medications: 2,
        total_doses: 4,
        schedule: {
          morning: [{ is_low_inventory: true }, { is_low_inventory: false }],
          afternoon: [{ is_low_inventory: false }],
          evening: [{ is_low_inventory: true }],
          night: []
        },
        skipped_medications: [{ id: 1, name: 'Skipped Med' }]
      };

      jest.spyOn(scheduleService, 'generateDailySchedule').mockResolvedValue(mockSchedule);

      const result = await scheduleService.getScheduleSummary(testDate);

      expect(result).toEqual({
        date: testDate,
        total_medications: 2,
        total_doses: 4,
        periods: {
          morning: 2,
          afternoon: 1,
          evening: 1,
          night: 0
        },
        low_inventory_count: 2,
        skipped_count: 1
      });
    });
  });

  describe('validateScheduleParams', () => {
    test('should validate correct parameters', () => {
      const params = {
        date: '2024-01-15',
        startDate: '2024-01-15',
        endDate: '2024-01-17'
      };

      const result = scheduleService.validateScheduleParams(params);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should return errors for invalid date formats', () => {
      const params = {
        date: 'invalid-date',
        startDate: '2024/01/15',
        endDate: '15-01-2024'
      };

      const result = scheduleService.validateScheduleParams(params);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Date must be in YYYY-MM-DD format');
      expect(result.errors).toContain('Start date must be in YYYY-MM-DD format');
      expect(result.errors).toContain('End date must be in YYYY-MM-DD format');
    });

    test('should return error for invalid date range', () => {
      const params = {
        startDate: '2024-01-17',
        endDate: '2024-01-15'
      };

      const result = scheduleService.validateScheduleParams(params);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Start date must be before or equal to end date');
    });

    test('should return error for date range exceeding 30 days', () => {
      const params = {
        startDate: '2024-01-01',
        endDate: '2024-02-15'
      };

      const result = scheduleService.validateScheduleParams(params);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Date range cannot exceed 30 days');
    });
  });

  describe('findNextNonSkipDate', () => {
    test('should find next available date that is not skipped', async () => {
      const medicationId = 1;
      const fromDate = new Date('2024-01-15');
      
      const mockMedication = new Medication({
        id: 1,
        name: 'Test Medicine',
        start_date: '2024-01-01',
        end_date: null
      });

      const mockDose = new MedicineDose({
        id: 1,
        medicine_id: 1,
        dose_amount: 1,
        time_of_day: '08:00'
      });

      mockMedicationRepository.findById.mockResolvedValue(mockMedication);
      mockDoseRepository.findByMedicationId.mockResolvedValue([mockDose]);
      
      // Mock skip date checks - first date is skipped, second is not
      mockSkipDateRepository.shouldSkipOnDate
        .mockResolvedValueOnce(true)  // 2024-01-16 is skipped
        .mockResolvedValueOnce(false); // 2024-01-17 is not skipped

      const result = await scheduleService.findNextNonSkipDate(medicationId, fromDate);

      expect(result.date).toBe('2024-01-17');
      expect(result.time).toBe('08:00');
      expect(result.dose.id).toBe(1);
    });

    test('should return null if no non-skip date found within 30 days', async () => {
      const medicationId = 1;
      const fromDate = new Date('2024-01-15');
      
      const mockMedication = new Medication({
        id: 1,
        name: 'Test Medicine',
        start_date: '2024-01-01',
        end_date: null
      });

      mockMedicationRepository.findById.mockResolvedValue(mockMedication);
      mockDoseRepository.findByMedicationId.mockResolvedValue([]);

      const result = await scheduleService.findNextNonSkipDate(medicationId, fromDate);

      expect(result).toBeNull();
    });
  });
});