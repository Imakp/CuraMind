const MedicationService = require('../../services/MedicationService');
const MedicationRepository = require('../../repositories/MedicationRepository');
const DoseRepository = require('../../repositories/DoseRepository');
const SkipDateRepository = require('../../repositories/SkipDateRepository');
const AuditLogRepository = require('../../repositories/AuditLogRepository');
const Medication = require('../../models/Medication');

// Mock the repositories
jest.mock('../../repositories/MedicationRepository');
jest.mock('../../repositories/DoseRepository');
jest.mock('../../repositories/SkipDateRepository');
jest.mock('../../repositories/AuditLogRepository');

describe('MedicationService', () => {
  let medicationService;
  let mockMedicationRepository;
  let mockDoseRepository;
  let mockSkipDateRepository;
  let mockAuditLogRepository;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create service instance
    medicationService = new MedicationService();
    
    // Get mock instances
    mockMedicationRepository = MedicationRepository.mock.instances[0];
    mockDoseRepository = DoseRepository.mock.instances[0];
    mockSkipDateRepository = SkipDateRepository.mock.instances[0];
    mockAuditLogRepository = AuditLogRepository.mock.instances[0];
  });

  describe('createMedication', () => {
    const validMedicationData = {
      name: 'Test Medication',
      strength: '10mg',
      route_id: 1,
      frequency_id: 1,
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      sheet_size: 10,
      total_tablets: 100,
      notes: 'Test notes'
    };

    it('should create medication successfully with valid data', async () => {
      const mockMedication = new Medication({ ...validMedicationData, id: 1 });
      const mockDbFormat = { ...validMedicationData, id: 1, updated_at: '2024-01-01T00:00:00.000Z' };
      mockMedication.toDbFormat = jest.fn().mockReturnValue(mockDbFormat);
      
      mockMedicationRepository.create.mockResolvedValue(mockMedication);
      mockAuditLogRepository.create.mockResolvedValue({});

      const result = await medicationService.createMedication(validMedicationData);

      expect(mockMedicationRepository.create).toHaveBeenCalledWith(validMedicationData);
      expect(mockAuditLogRepository.create).toHaveBeenCalledWith({
        medicine_id: 1,
        action: 'CREATED',
        new_values: mockDbFormat
      });
      expect(result).toEqual(mockMedication);
    });

    it('should reject medication with start date more than 1 year in future', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);
      const invalidData = {
        ...validMedicationData,
        start_date: futureDate.toISOString().split('T')[0]
      };

      await expect(medicationService.createMedication(invalidData))
        .rejects.toThrow('Start date cannot be more than one year in the future');
    });

    it('should reject medication with end date more than 10 years from start', async () => {
      const invalidData = {
        ...validMedicationData,
        start_date: '2024-01-01',
        end_date: '2035-01-01'
      };

      await expect(medicationService.createMedication(invalidData))
        .rejects.toThrow('End date cannot be more than 10 years from start date');
    });

    it('should reject medication with invalid sheet size', async () => {
      const invalidData = {
        ...validMedicationData,
        sheet_size: 0
      };

      await expect(medicationService.createMedication(invalidData))
        .rejects.toThrow('Sheet size must be between 1 and 1000');
    });

    it('should reject medication with invalid total tablets', async () => {
      const invalidData = {
        ...validMedicationData,
        total_tablets: -1
      };

      await expect(medicationService.createMedication(invalidData))
        .rejects.toThrow('Total tablets must be between 0 and 100,000');
    });

    it('should handle repository errors', async () => {
      mockMedicationRepository.create.mockRejectedValue(new Error('Database error'));

      await expect(medicationService.createMedication(validMedicationData))
        .rejects.toThrow('Failed to create medication: Database error');
    });
  });

  describe('getMedicationById', () => {
    it('should return medication when found', async () => {
      const mockMedication = new Medication({ id: 1, name: 'Test Med' });
      mockMedicationRepository.findById.mockResolvedValue(mockMedication);

      const result = await medicationService.getMedicationById(1);

      expect(mockMedicationRepository.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockMedication);
    });

    it('should throw error when medication not found', async () => {
      mockMedicationRepository.findById.mockResolvedValue(null);

      await expect(medicationService.getMedicationById(1))
        .rejects.toThrow('Medication not found');
    });

    it('should throw error with invalid ID', async () => {
      await expect(medicationService.getMedicationById('invalid'))
        .rejects.toThrow('Valid medication ID is required');
    });
  });

  describe('getAllMedications', () => {
    it('should return all medications with valid filters', async () => {
      const mockMedications = [
        new Medication({ id: 1, name: 'Med 1' }),
        new Medication({ id: 2, name: 'Med 2' })
      ];
      mockMedicationRepository.findAll.mockResolvedValue(mockMedications);

      const filters = { active: true, sort_by: 'name' };
      const result = await medicationService.getAllMedications(filters);

      expect(mockMedicationRepository.findAll).toHaveBeenCalledWith(filters);
      expect(result).toEqual(mockMedications);
    });

    it('should validate filter parameters', async () => {
      const invalidFilters = { date: 'invalid-date' };

      await expect(medicationService.getAllMedications(invalidFilters))
        .rejects.toThrow('Date filter must be in YYYY-MM-DD format');
    });

    it('should validate sort fields', async () => {
      const invalidFilters = { sort_by: 'invalid_field' };

      await expect(medicationService.getAllMedications(invalidFilters))
        .rejects.toThrow('Invalid sort field');
    });
  });

  describe('updateMedication', () => {
    const existingMedication = new Medication({
      id: 1,
      name: 'Original Med',
      total_tablets: 50
    });

    it('should update medication successfully', async () => {
      const updateData = { name: 'Updated Med' };
      const updatedMedication = new Medication({ ...existingMedication, ...updateData });
      
      const oldDbFormat = { ...existingMedication, updated_at: '2024-01-01T00:00:00.000Z' };
      const newDbFormat = { ...updatedMedication, updated_at: '2024-01-01T00:00:00.000Z' };
      
      existingMedication.toDbFormat = jest.fn().mockReturnValue(oldDbFormat);
      updatedMedication.toDbFormat = jest.fn().mockReturnValue(newDbFormat);
      
      mockMedicationRepository.findById.mockResolvedValue(existingMedication);
      mockMedicationRepository.update.mockResolvedValue(updatedMedication);
      mockAuditLogRepository.create.mockResolvedValue({});

      const result = await medicationService.updateMedication(1, updateData);

      expect(mockMedicationRepository.update).toHaveBeenCalledWith(1, updateData);
      expect(mockAuditLogRepository.create).toHaveBeenCalledWith({
        medicine_id: 1,
        action: 'UPDATED',
        old_values: oldDbFormat,
        new_values: newDbFormat
      });
      expect(result).toEqual(updatedMedication);
    });

    it('should throw error when medication not found', async () => {
      mockMedicationRepository.findById.mockResolvedValue(null);

      await expect(medicationService.updateMedication(1, { name: 'Updated' }))
        .rejects.toThrow('Medication not found');
    });

    it('should warn about large inventory increases', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const updateData = { total_tablets: 1100 }; // Increase of 1050
      
      mockMedicationRepository.findById.mockResolvedValue(existingMedication);
      mockMedicationRepository.update.mockResolvedValue(existingMedication);
      mockAuditLogRepository.create.mockResolvedValue({});

      await medicationService.updateMedication(1, updateData);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Large inventory increase detected')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('deleteMedication', () => {
    it('should soft delete active medication', async () => {
      const activeMedication = new Medication({
        id: 1,
        name: 'Active Med',
        start_date: '2024-01-01',
        end_date: null
      });
      
      const softDeletedMedication = new Medication({
        ...activeMedication,
        end_date: '2024-01-14' // Yesterday
      });

      const oldDbFormat = { ...activeMedication, updated_at: '2024-01-01T00:00:00.000Z' };
      const newDbFormat = { ...softDeletedMedication, updated_at: '2024-01-01T00:00:00.000Z' };
      
      activeMedication.toDbFormat = jest.fn().mockReturnValue(oldDbFormat);
      softDeletedMedication.toDbFormat = jest.fn().mockReturnValue(newDbFormat);

      mockMedicationRepository.findById.mockResolvedValue(activeMedication);
      mockMedicationRepository.update.mockResolvedValue(softDeletedMedication);
      mockAuditLogRepository.create.mockResolvedValue({});

      const result = await medicationService.deleteMedication(1);

      expect(result.deleted).toBe(true);
      expect(result.soft).toBe(true);
      expect(mockAuditLogRepository.create).toHaveBeenCalledWith({
        medicine_id: 1,
        action: 'SOFT_DELETED',
        old_values: oldDbFormat,
        new_values: newDbFormat
      });
    });

    it('should hard delete inactive medication', async () => {
      const inactiveMedication = new Medication({
        id: 1,
        name: 'Inactive Med',
        start_date: '2023-01-01',
        end_date: '2023-12-31'
      });

      const oldDbFormat = { ...inactiveMedication, updated_at: '2024-01-01T00:00:00.000Z' };
      inactiveMedication.toDbFormat = jest.fn().mockReturnValue(oldDbFormat);

      mockMedicationRepository.findById.mockResolvedValue(inactiveMedication);
      mockMedicationRepository.delete.mockResolvedValue(true);
      mockAuditLogRepository.create.mockResolvedValue({});

      const result = await medicationService.deleteMedication(1);

      expect(result.deleted).toBe(true);
      expect(result.soft).toBe(false);
      expect(mockAuditLogRepository.create).toHaveBeenCalledWith({
        medicine_id: 1,
        action: 'DELETED',
        old_values: oldDbFormat
      });
    });
  });

  describe('updateInventory', () => {
    const existingMedication = new Medication({
      id: 1,
      name: 'Test Med',
      sheet_size: 10,
      total_tablets: 50
    });

    beforeEach(() => {
      mockMedicationRepository.findById.mockResolvedValue(existingMedication);
    });

    it('should update inventory with direct tablet count', async () => {
      const updatedMedication = new Medication({ ...existingMedication, total_tablets: 100 });
      mockMedicationRepository.updateInventory.mockResolvedValue(updatedMedication);

      const result = await medicationService.updateInventory(1, { total_tablets: 100 });

      expect(mockMedicationRepository.updateInventory).toHaveBeenCalledWith(
        1, 100, 'Manual update'
      );
      expect(result).toEqual(updatedMedication);
    });

    it('should update inventory with sheet count conversion', async () => {
      const updatedMedication = new Medication({ ...existingMedication, total_tablets: 50 });
      mockMedicationRepository.updateInventory.mockResolvedValue(updatedMedication);

      const result = await medicationService.updateInventory(1, { sheet_count: 5 });

      expect(mockMedicationRepository.updateInventory).toHaveBeenCalledWith(
        1, 50, 'Updated via sheet count: 5 sheets'
      );
      expect(result).toEqual(updatedMedication);
    });

    it('should add tablets to existing inventory', async () => {
      const updatedMedication = new Medication({ ...existingMedication, total_tablets: 70 });
      mockMedicationRepository.updateInventory.mockResolvedValue(updatedMedication);

      const result = await medicationService.updateInventory(1, { add_tablets: 20 });

      expect(mockMedicationRepository.updateInventory).toHaveBeenCalledWith(
        1, 70, 'Added 20 tablets'
      );
      expect(result).toEqual(updatedMedication);
    });

    it('should reject negative tablet counts', async () => {
      await expect(medicationService.updateInventory(1, { total_tablets: -10 }))
        .rejects.toThrow('Total tablets must be a non-negative number');
    });

    it('should require at least one update parameter', async () => {
      await expect(medicationService.updateInventory(1, {}))
        .rejects.toThrow('Must provide total_tablets, sheet_count, or add_tablets');
    });
  });

  describe('markDoseGiven', () => {
    const existingMedication = new Medication({
      id: 1,
      name: 'Test Med',
      start_date: '2024-01-01',
      end_date: null,
      total_tablets: 50
    });

    beforeEach(() => {
      mockMedicationRepository.findById.mockResolvedValue(existingMedication);
      mockSkipDateRepository.findByMedicationId.mockResolvedValue([]);
    });

    it('should mark dose as given successfully', async () => {
      const doseResult = {
        ...existingMedication,
        total_tablets: 48,
        dose_result: { consumed: 2, remaining: 48, wasShort: false }
      };
      
      mockMedicationRepository.markDoseGiven.mockResolvedValue(doseResult);

      const result = await medicationService.markDoseGiven(1, { 
        dose_amount: 2,
        timestamp: '2024-01-15T10:00:00Z'
      });

      expect(mockMedicationRepository.markDoseGiven).toHaveBeenCalledWith(
        1, 2, new Date('2024-01-15T10:00:00Z')
      );
      expect(result).toEqual(doseResult);
    });

    it('should reject invalid dose amount', async () => {
      await expect(medicationService.markDoseGiven(1, { dose_amount: 0 }))
        .rejects.toThrow('Valid dose amount is required');
    });

    it('should reject dose on skip date', async () => {
      mockSkipDateRepository.findByMedicationId.mockResolvedValue([
        { skip_date: '2024-01-15' }
      ]);

      await expect(medicationService.markDoseGiven(1, { 
        dose_amount: 2,
        timestamp: '2024-01-15T10:00:00Z'
      })).rejects.toThrow('Cannot mark dose on a skip date');
    });

    it('should reject dose for inactive medication', async () => {
      const inactiveMedication = new Medication({
        id: 1,
        start_date: '2023-01-01',
        end_date: '2023-12-31'
      });
      
      mockMedicationRepository.findById.mockResolvedValue(inactiveMedication);

      await expect(medicationService.markDoseGiven(1, { 
        dose_amount: 2,
        timestamp: '2024-01-15T10:00:00Z'
      })).rejects.toThrow('Cannot mark dose for inactive medication on this date');
    });
  });

  describe('convertSheetsToTablets', () => {
    it('should convert sheets to tablets correctly', () => {
      const result = medicationService.convertSheetsToTablets(5, 10);
      expect(result).toBe(50);
    });

    it('should handle zero sheets', () => {
      const result = medicationService.convertSheetsToTablets(0, 10);
      expect(result).toBe(0);
    });

    it('should reject negative sheet count', () => {
      expect(() => medicationService.convertSheetsToTablets(-1, 10))
        .toThrow('Sheet count must be a non-negative integer');
    });

    it('should reject invalid sheet size', () => {
      expect(() => medicationService.convertSheetsToTablets(5, 0))
        .toThrow('Sheet size must be a positive integer');
    });
  });

  describe('convertTabletsToSheets', () => {
    it('should convert tablets to sheets correctly', () => {
      const result = medicationService.convertTabletsToSheets(55, 10);
      expect(result).toEqual({
        fullSheets: 5,
        remainingTablets: 5,
        totalSheets: 5.5
      });
    });

    it('should handle exact sheet multiples', () => {
      const result = medicationService.convertTabletsToSheets(50, 10);
      expect(result).toEqual({
        fullSheets: 5,
        remainingTablets: 0,
        totalSheets: 5
      });
    });

    it('should reject negative tablet count', () => {
      expect(() => medicationService.convertTabletsToSheets(-1, 10))
        .toThrow('Total tablets must be a non-negative number');
    });
  });

  describe('getInventoryStats', () => {
    it('should calculate inventory statistics correctly', async () => {
      const medication = new Medication({
        id: 1,
        total_tablets: 55,
        sheet_size: 10
      });
      
      const doses = [
        { dose_amount: 2 },
        { dose_amount: 1 }
      ];

      mockMedicationRepository.findById.mockResolvedValue(medication);
      mockDoseRepository.findByMedicationId.mockResolvedValue(doses);

      const result = await medicationService.getInventoryStats(1);

      expect(result).toEqual({
        total_tablets: 55,
        sheet_size: 10,
        full_sheets: 5,
        remaining_tablets: 5,
        total_sheets: 5.5,
        daily_consumption: 3,
        days_remaining: 18,
        is_low_inventory: false
      });
    });

    it('should handle medications with no doses', async () => {
      const medication = new Medication({
        id: 1,
        total_tablets: 50,
        sheet_size: 10
      });

      mockMedicationRepository.findById.mockResolvedValue(medication);
      mockDoseRepository.findByMedicationId.mockResolvedValue([]);

      const result = await medicationService.getInventoryStats(1);

      expect(result.daily_consumption).toBe(0);
      expect(result.days_remaining).toBeNull();
      expect(result.is_low_inventory).toBe(false);
    });

    it('should identify low inventory medications', async () => {
      const medication = new Medication({
        id: 1,
        total_tablets: 2,
        sheet_size: 10
      });
      
      const doses = [{ dose_amount: 3 }];

      mockMedicationRepository.findById.mockResolvedValue(medication);
      mockDoseRepository.findByMedicationId.mockResolvedValue(doses);

      const result = await medicationService.getInventoryStats(1);

      expect(result.days_remaining).toBe(0);
      expect(result.is_low_inventory).toBe(true);
    });
  });

  describe('getLowInventoryMedications', () => {
    it('should return low inventory medications', async () => {
      const lowInventoryMeds = [
        { id: 1, name: 'Low Med 1', days_remaining: 0 },
        { id: 2, name: 'Low Med 2', days_remaining: 1 }
      ];

      mockMedicationRepository.findLowInventoryMedications.mockResolvedValue(lowInventoryMeds);

      const result = await medicationService.getLowInventoryMedications(2);

      expect(mockMedicationRepository.findLowInventoryMedications).toHaveBeenCalledWith(2);
      expect(result).toEqual(lowInventoryMeds);
    });

    it('should use default days ahead parameter', async () => {
      mockMedicationRepository.findLowInventoryMedications.mockResolvedValue([]);

      await medicationService.getLowInventoryMedications();

      expect(mockMedicationRepository.findLowInventoryMedications).toHaveBeenCalledWith(1);
    });
  });

  describe('validateFilters', () => {
    it('should accept valid filters', () => {
      const validFilters = {
        date: '2024-01-15',
        sort_by: 'name',
        sort_direction: 'asc',
        active: true,
        low_inventory: false
      };

      expect(() => medicationService.validateFilters(validFilters)).not.toThrow();
    });

    it('should reject invalid date format', () => {
      expect(() => medicationService.validateFilters({ date: '2024/01/15' }))
        .toThrow('Date filter must be in YYYY-MM-DD format');
    });

    it('should reject invalid sort direction', () => {
      expect(() => medicationService.validateFilters({ sort_direction: 'invalid' }))
        .toThrow('Sort direction must be "asc" or "desc"');
    });

    it('should reject non-boolean active filter', () => {
      expect(() => medicationService.validateFilters({ active: 'true' }))
        .toThrow('Active filter must be a boolean');
    });
  });
});