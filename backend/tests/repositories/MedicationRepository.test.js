const MedicationRepository = require('../../repositories/MedicationRepository');
const Medication = require('../../models/Medication');
const { query, transaction } = require('../../config/database');

// Mock the database module
jest.mock('../../config/database');

describe('MedicationRepository', () => {
  let repository;
  let mockQuery;
  let mockTransaction;

  beforeEach(() => {
    repository = new MedicationRepository();
    mockQuery = query;
    mockTransaction = transaction;
    jest.clearAllMocks();
  });

  describe('create', () => {
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

    it('should create a medication successfully', async () => {
      const mockDbRow = {
        id: 1,
        ...validMedicationData,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockQuery.mockResolvedValue({ rows: [mockDbRow] });

      const result = await repository.create(validMedicationData);

      expect(result).toBeInstanceOf(Medication);
      expect(result.id).toBe(1);
      expect(result.name).toBe('Test Medication');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO medications'),
        expect.arrayContaining([
          'Test Medication',
          '10mg',
          1,
          1,
          '2024-01-01',
          '2024-12-31',
          10,
          100,
          'Test notes'
        ])
      );
    });

    it('should throw validation error for invalid data', async () => {
      const invalidData = { ...validMedicationData, name: '' };

      await expect(repository.create(invalidData)).rejects.toThrow('Validation failed');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should handle foreign key constraint violations', async () => {
      mockQuery.mockRejectedValue({ code: '23503' });

      await expect(repository.create(validMedicationData)).rejects.toThrow('Invalid route_id or frequency_id provided');
    });

    it('should propagate other database errors', async () => {
      const dbError = new Error('Database connection failed');
      mockQuery.mockRejectedValue(dbError);

      await expect(repository.create(validMedicationData)).rejects.toThrow('Database connection failed');
    });
  });

  describe('findById', () => {
    it('should return medication when found', async () => {
      const mockDbRow = {
        id: 1,
        name: 'Test Medication',
        strength: '10mg',
        route_id: 1,
        frequency_id: 1,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        sheet_size: 10,
        total_tablets: 100,
        notes: 'Test notes',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        route_name: 'Oral',
        frequency_name: 'Once daily'
      };

      mockQuery.mockResolvedValue({ rows: [mockDbRow] });

      const result = await repository.findById(1);

      expect(result).toBeInstanceOf(Medication);
      expect(result.id).toBe(1);
      expect(result.route_name).toBe('Oral');
      expect(result.frequency_name).toBe('Once daily');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT m.*, r.name as route_name, f.name as frequency_name'),
        [1]
      );
    });

    it('should return null when medication not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    const mockMedications = [
      {
        id: 1,
        name: 'Medication A',
        strength: '10mg',
        route_id: 1,
        frequency_id: 1,
        start_date: '2024-01-01',
        end_date: null,
        sheet_size: 10,
        total_tablets: 100,
        notes: '',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        route_name: 'Oral',
        frequency_name: 'Once daily'
      },
      {
        id: 2,
        name: 'Medication B',
        strength: '20mg',
        route_id: 2,
        frequency_id: 2,
        start_date: '2024-01-01',
        end_date: '2024-06-01',
        sheet_size: 20,
        total_tablets: 5,
        notes: 'Low inventory',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        route_name: 'Inhaled',
        frequency_name: 'Twice daily'
      }
    ];

    it('should return all medications without filters', async () => {
      mockQuery.mockResolvedValue({ rows: mockMedications });

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Medication);
      expect(result[0].route_name).toBe('Oral');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY m.name ASC'),
        []
      );
    });

    it('should filter by active status', async () => {
      mockQuery.mockResolvedValue({ rows: [mockMedications[0]] });

      const result = await repository.findAll({ active: true });

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('(m.end_date IS NULL OR m.end_date >= CURRENT_DATE)'),
        []
      );
    });

    it('should filter by date', async () => {
      mockQuery.mockResolvedValue({ rows: mockMedications });

      const result = await repository.findAll({ date: '2024-03-01' });

      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('m.start_date <= $1 AND (m.end_date IS NULL OR m.end_date >= $1)'),
        ['2024-03-01']
      );
    });

    it('should filter by search term', async () => {
      mockQuery.mockResolvedValue({ rows: [mockMedications[0]] });

      const result = await repository.findAll({ search: 'Medication A' });

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(m.name) LIKE LOWER($1)'),
        ['%Medication A%']
      );
    });

    it('should sort by specified field', async () => {
      mockQuery.mockResolvedValue({ rows: mockMedications });

      const result = await repository.findAll({ sort_by: 'start_date', sort_direction: 'desc' });

      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY m.start_date DESC'),
        []
      );
    });

    it('should filter by low inventory', async () => {
      mockQuery.mockResolvedValue({ rows: [mockMedications[1]] });

      const result = await repository.findAll({ low_inventory: true });

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('m.total_tablets <= 10'),
        []
      );
    });
  });

  describe('findActiveByDate', () => {
    it('should return active medications for specific date excluding skip dates', async () => {
      const mockMedications = [
        {
          id: 1,
          name: 'Active Medication',
          strength: '10mg',
          route_id: 1,
          frequency_id: 1,
          start_date: '2024-01-01',
          end_date: null,
          sheet_size: 10,
          total_tablets: 100,
          notes: '',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          route_name: 'Oral',
          frequency_name: 'Once daily'
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockMedications });

      const result = await repository.findActiveByDate('2024-03-01');

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Medication);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('NOT EXISTS ('),
        ['2024-03-01']
      );
    });
  });

  describe('update', () => {
    const existingMedication = {
      id: 1,
      name: 'Existing Medication',
      strength: '10mg',
      route_id: 1,
      frequency_id: 1,
      start_date: '2024-01-01',
      end_date: null,
      sheet_size: 10,
      total_tablets: 100,
      notes: 'Original notes'
    };

    it('should update medication successfully', async () => {
      // Mock findById call
      jest.spyOn(repository, 'findById').mockResolvedValue(existingMedication);
      
      const updatedRow = {
        ...existingMedication,
        name: 'Updated Medication',
        notes: 'Updated notes',
        updated_at: '2024-01-02T00:00:00Z'
      };

      mockQuery.mockResolvedValue({ rows: [updatedRow] });

      const result = await repository.update(1, { 
        name: 'Updated Medication', 
        notes: 'Updated notes' 
      });

      expect(result).toBeInstanceOf(Medication);
      expect(result.name).toBe('Updated Medication');
      expect(result.notes).toBe('Updated notes');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE medications SET'),
        expect.arrayContaining([1, 'Updated Medication'])
      );
    });

    it('should throw error when medication not found', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      await expect(repository.update(999, { name: 'Updated' })).rejects.toThrow('Medication not found');
    });

    it('should validate updated data', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(existingMedication);

      await expect(repository.update(1, { name: '' })).rejects.toThrow('Validation failed');
    });
  });

  describe('updateInventory', () => {
    const existingMedication = {
      id: 1,
      name: 'Test Medication',
      total_tablets: 100
    };

    it('should update inventory with transaction', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(existingMedication);
      
      const mockClient = {
        query: jest.fn()
      };
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ ...existingMedication, total_tablets: 80 }] })
        .mockResolvedValueOnce({ rows: [] }); // audit log insert

      mockTransaction.mockImplementation(async (callback) => {
        return await callback(mockClient);
      });

      const result = await repository.updateInventory(1, 80, 'Manual adjustment');

      expect(result).toBeInstanceOf(Medication);
      expect(result.total_tablets).toBe(80);
      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE medications SET'),
        [1, 80]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.arrayContaining([1, -20])
      );
    });

    it('should throw error for invalid inventory amount', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(existingMedication);

      await expect(repository.updateInventory(1, -5)).rejects.toThrow('Total tablets must be a non-negative number');
    });

    it('should throw error when medication not found', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      await expect(repository.updateInventory(999, 50)).rejects.toThrow('Medication not found');
    });
  });

  describe('markDoseGiven', () => {
    const existingMedication = new Medication({
      id: 1,
      name: 'Test Medication',
      total_tablets: 100
    });

    it('should mark dose as given and update inventory', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(existingMedication);
      
      const mockClient = {
        query: jest.fn()
      };
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ ...existingMedication, total_tablets: 98 }] })
        .mockResolvedValueOnce({ rows: [] }); // audit log insert

      mockTransaction.mockImplementation(async (callback) => {
        return await callback(mockClient);
      });

      const result = await repository.markDoseGiven(1, 2);

      expect(result).toBeInstanceOf(Medication);
      expect(result.total_tablets).toBe(98);
      expect(result.dose_result).toBeDefined();
      expect(result.dose_result.consumed).toBe(2);
      expect(result.dose_result.remaining).toBe(98);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.arrayContaining([1, -2])
      );
    });

    it('should throw error for invalid dose amount', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(existingMedication);

      await expect(repository.markDoseGiven(1, 0)).rejects.toThrow('Dose amount must be a positive number');
      await expect(repository.markDoseGiven(1, -1)).rejects.toThrow('Dose amount must be a positive number');
    });
  });

  describe('delete', () => {
    it('should soft delete active medication', async () => {
      const activeMedication = {
        id: 1,
        name: 'Active Medication',
        end_date: null
      };

      jest.spyOn(repository, 'findById').mockResolvedValue(activeMedication);
      jest.spyOn(repository, 'update').mockResolvedValue({ ...activeMedication, end_date: '2024-01-01' });

      const result = await repository.delete(1);

      expect(result.end_date).toBeDefined();
      expect(repository.update).toHaveBeenCalledWith(1, expect.objectContaining({
        end_date: expect.any(String)
      }));
    });

    it('should hard delete ended medication', async () => {
      const endedMedication = {
        id: 1,
        name: 'Ended Medication',
        end_date: '2023-12-31'
      };

      jest.spyOn(repository, 'findById').mockResolvedValue(endedMedication);
      
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] })
      };
      
      // Mock the delete query to return the deleted row
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // DELETE FROM medicine_doses
        .mockResolvedValueOnce({ rows: [] }) // DELETE FROM skip_dates  
        .mockResolvedValueOnce({ rows: [] }) // DELETE FROM notifications
        .mockResolvedValueOnce({ rows: [endedMedication] }); // DELETE FROM medications

      mockTransaction.mockImplementation(async (callback) => {
        return await callback(mockClient);
      });

      const result = await repository.delete(1);

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM medications WHERE id = $1 RETURNING *',
        [1]
      );
    });

    it('should throw error when medication not found', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      await expect(repository.delete(999)).rejects.toThrow('Medication not found');
    });
  });

  describe('findLowInventoryMedications', () => {
    it('should return medications with low inventory', async () => {
      const lowInventoryMeds = [
        {
          id: 1,
          name: 'Low Inventory Med',
          total_tablets: 5,
          daily_consumption: 2,
          route_name: 'Oral',
          frequency_name: 'Twice daily'
        }
      ];

      mockQuery.mockResolvedValue({ rows: lowInventoryMeds });

      const result = await repository.findLowInventoryMedications(3);

      expect(result).toHaveLength(1);
      expect(result[0].days_remaining).toBe(2); // 5 tablets / 2 daily = 2.5 days, floored to 2
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('HAVING m.total_tablets <= (COALESCE(SUM(md.dose_amount), 1) * $1)'),
        [3]
      );
    });
  });

  describe('getStats', () => {
    it('should return medication statistics', async () => {
      const mockStats = {
        total: '10',
        active: '8',
        ended: '2',
        low_inventory: '3'
      };

      mockQuery.mockResolvedValue({ rows: [mockStats] });

      const result = await repository.getStats();

      expect(result).toEqual(mockStats);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*) as total')
      );
    });
  });
});