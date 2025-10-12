const SkipDateRepository = require('../../repositories/SkipDateRepository');
const SkipDate = require('../../models/SkipDate');
const { query, transaction } = require('../../config/database');

// Mock the database module
jest.mock('../../config/database');

describe('SkipDateRepository', () => {
  let repository;
  let mockQuery;
  let mockTransaction;

  beforeEach(() => {
    repository = new SkipDateRepository();
    mockQuery = query;
    mockTransaction = transaction;
    jest.clearAllMocks();
  });

  describe('create', () => {
    const validSkipDateData = {
      medicine_id: 1,
      skip_date: '2024-03-15',
      reason: 'Vacation'
    };

    it('should create a skip date successfully', async () => {
      const mockDbRow = {
        id: 1,
        ...validSkipDateData,
        created_at: '2024-01-01T00:00:00Z'
      };

      mockQuery.mockResolvedValue({ rows: [mockDbRow] });

      const result = await repository.create(validSkipDateData);

      expect(result).toBeInstanceOf(SkipDate);
      expect(result.id).toBe(1);
      expect(result.skip_date).toBe('2024-03-15');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO skip_dates'),
        expect.arrayContaining([1, '2024-03-15', 'Vacation'])
      );
    });

    it('should throw validation error for invalid data', async () => {
      const invalidData = { ...validSkipDateData, skip_date: 'invalid-date' };

      await expect(repository.create(invalidData)).rejects.toThrow('Validation failed');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should handle foreign key constraint violations', async () => {
      mockQuery.mockRejectedValue({ code: '23503' });

      await expect(repository.create(validSkipDateData)).rejects.toThrow('Invalid medicine_id provided');
    });

    it('should handle unique constraint violations', async () => {
      mockQuery.mockRejectedValue({ code: '23505' });

      await expect(repository.create(validSkipDateData)).rejects.toThrow('Skip date already exists for this medication');
    });
  });

  describe('findById', () => {
    it('should return skip date when found', async () => {
      const mockDbRow = {
        id: 1,
        medicine_id: 1,
        skip_date: '2024-03-15',
        reason: 'Vacation',
        created_at: '2024-01-01T00:00:00Z',
        medication_name: 'Test Medication'
      };

      mockQuery.mockResolvedValue({ rows: [mockDbRow] });

      const result = await repository.findById(1);

      expect(result).toBeInstanceOf(SkipDate);
      expect(result.id).toBe(1);
      expect(result.medication_name).toBe('Test Medication');
    });

    it('should return null when skip date not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findByMedicationId', () => {
    it('should return skip dates for medication ordered by date', async () => {
      const mockSkipDates = [
        {
          id: 1,
          medicine_id: 1,
          skip_date: '2024-03-15',
          reason: 'Vacation',
          created_at: '2024-01-01T00:00:00Z',
          medication_name: 'Test Medication'
        },
        {
          id: 2,
          medicine_id: 1,
          skip_date: '2024-03-20',
          reason: 'Travel',
          created_at: '2024-01-01T00:00:00Z',
          medication_name: 'Test Medication'
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockSkipDates });

      const result = await repository.findByMedicationId(1);

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(SkipDate);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY sd.skip_date ASC'),
        [1]
      );
    });
  });

  describe('findByMedicationIds', () => {
    it('should return skip dates for multiple medications', async () => {
      const mockSkipDates = [
        {
          id: 1,
          medicine_id: 1,
          skip_date: '2024-03-15',
          reason: 'Vacation',
          created_at: '2024-01-01T00:00:00Z',
          medication_name: 'Test Medication'
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockSkipDates });

      const result = await repository.findByMedicationIds([1, 2]);

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE sd.medicine_id IN ($1,$2)'),
        [1, 2]
      );
    });

    it('should return empty array for empty input', async () => {
      const result = await repository.findByMedicationIds([]);

      expect(result).toEqual([]);
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('findByDateRange', () => {
    it('should find skip dates within date range', async () => {
      const mockSkipDates = [
        {
          id: 1,
          medicine_id: 1,
          skip_date: '2024-03-15',
          reason: 'Vacation',
          created_at: '2024-01-01T00:00:00Z',
          medication_name: 'Test Medication'
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockSkipDates });

      const result = await repository.findByDateRange('2024-03-01', '2024-03-31');

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('sd.skip_date >= $1 AND sd.skip_date <= $2'),
        ['2024-03-01', '2024-03-31']
      );
    });

    it('should filter by medication ID when provided', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findByDateRange('2024-03-01', '2024-03-31', 1);

      expect(result).toEqual([]);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('sd.medicine_id = $3'),
        ['2024-03-01', '2024-03-31', 1]
      );
    });
  });

  describe('findByDate', () => {
    it('should find skip dates for specific date', async () => {
      const mockSkipDates = [
        {
          id: 1,
          medicine_id: 1,
          skip_date: '2024-03-15',
          reason: 'Vacation',
          created_at: '2024-01-01T00:00:00Z',
          medication_name: 'Test Medication'
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockSkipDates });

      const result = await repository.findByDate('2024-03-15');

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('sd.skip_date = $1'),
        ['2024-03-15']
      );
    });

    it('should filter by medication ID when provided', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findByDate('2024-03-15', 1);

      expect(result).toEqual([]);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('sd.medicine_id = $2'),
        ['2024-03-15', 1]
      );
    });
  });

  describe('shouldSkipOnDate', () => {
    it('should return true when skip date exists', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '1' }] });

      const result = await repository.shouldSkipOnDate(1, '2024-03-15');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*)'),
        [1, '2024-03-15']
      );
    });

    it('should return false when skip date does not exist', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '0' }] });

      const result = await repository.shouldSkipOnDate(1, '2024-03-15');

      expect(result).toBe(false);
    });
  });

  describe('findForScheduleGeneration', () => {
    it('should find skip dates for schedule generation excluding past dates', async () => {
      const mockSkipDates = [
        {
          id: 1,
          medicine_id: 1,
          skip_date: '2024-03-15',
          reason: 'Vacation',
          created_at: '2024-01-01T00:00:00Z',
          medication_name: 'Test Medication'
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockSkipDates });

      const result = await repository.findForScheduleGeneration([1, 2]);

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('sd.skip_date >= CURRENT_DATE'),
        [1, 2]
      );
    });

    it('should include past dates when requested', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findForScheduleGeneration([1], true);

      expect(result).toEqual([]);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.not.stringContaining('sd.skip_date >= CURRENT_DATE'),
        [1]
      );
    });

    it('should return empty array for empty input', async () => {
      const result = await repository.findForScheduleGeneration([]);

      expect(result).toEqual([]);
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('findUpcoming', () => {
    it('should find upcoming skip dates', async () => {
      const mockSkipDates = [
        {
          id: 1,
          medicine_id: 1,
          skip_date: '2024-03-15',
          reason: 'Vacation',
          created_at: '2024-01-01T00:00:00Z',
          medication_name: 'Test Medication'
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockSkipDates });

      const result = await repository.findUpcoming(null, 7);

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('CURRENT_DATE + INTERVAL \'1 day\' * $1'),
        [7]
      );
    });

    it('should filter by medication ID when provided', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findUpcoming(1, 7);

      expect(result).toEqual([]);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('sd.medicine_id = $2'),
        [7, 1]
      );
    });
  });

  describe('update', () => {
    const existingSkipDate = {
      id: 1,
      medicine_id: 1,
      skip_date: '2024-03-15',
      reason: 'Original reason'
    };

    it('should update skip date successfully', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(existingSkipDate);
      
      const updatedRow = {
        ...existingSkipDate,
        skip_date: '2024-03-20',
        reason: 'Updated reason'
      };

      mockQuery.mockResolvedValue({ rows: [updatedRow] });

      const result = await repository.update(1, { 
        skip_date: '2024-03-20', 
        reason: 'Updated reason' 
      });

      expect(result).toBeInstanceOf(SkipDate);
      expect(result.skip_date).toBe('2024-03-20');
      expect(result.reason).toBe('Updated reason');
    });

    it('should throw error when skip date not found', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      await expect(repository.update(999, { reason: 'Updated' })).rejects.toThrow('Skip date not found');
    });

    it('should handle unique constraint violations', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(existingSkipDate);
      mockQuery.mockRejectedValue({ code: '23505' });

      await expect(repository.update(1, { skip_date: '2024-03-20' })).rejects.toThrow('Skip date already exists for this medication');
    });
  });

  describe('delete', () => {
    it('should delete skip date successfully', async () => {
      const existingSkipDate = { id: 1, medicine_id: 1 };
      jest.spyOn(repository, 'findById').mockResolvedValue(existingSkipDate);
      
      mockQuery.mockResolvedValue({ rows: [existingSkipDate] });

      const result = await repository.delete(1);

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM skip_dates WHERE id = $1 RETURNING *',
        [1]
      );
    });

    it('should throw error when skip date not found', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      await expect(repository.delete(999)).rejects.toThrow('Skip date not found');
    });
  });

  describe('deleteByMedicationAndDate', () => {
    it('should delete skip date by medication and date', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });

      const result = await repository.deleteByMedicationAndDate(1, '2024-03-15');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM skip_dates WHERE medicine_id = $1 AND skip_date = $2 RETURNING *',
        [1, '2024-03-15']
      );
    });

    it('should return false when no skip date found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.deleteByMedicationAndDate(1, '2024-03-15');

      expect(result).toBe(false);
    });
  });

  describe('createBulk', () => {
    it('should create multiple skip dates in transaction', async () => {
      const skipDatesData = [
        { skip_date: '2024-03-15', reason: 'Vacation' },
        { skip_date: '2024-03-20', reason: 'Travel' }
      ];

      const mockClient = {
        query: jest.fn()
      };
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1, medicine_id: 1, ...skipDatesData[0] }] })
        .mockResolvedValueOnce({ rows: [{ id: 2, medicine_id: 1, ...skipDatesData[1] }] });

      mockTransaction.mockImplementation(async (callback) => {
        return await callback(mockClient);
      });

      const result = await repository.createBulk(1, skipDatesData);

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(SkipDate);
      expect(mockClient.query).toHaveBeenCalledTimes(2);
    });

    it('should return empty array for empty input', async () => {
      const result = await repository.createBulk(1, []);

      expect(result).toEqual([]);
      expect(mockTransaction).not.toHaveBeenCalled();
    });
  });

  describe('getSkipDateStats', () => {
    it('should return skip date statistics', async () => {
      const mockStats = [
        {
          medicine_id: 1,
          total_skip_dates: '3',
          future_skip_dates: '2',
          past_skip_dates: '1',
          earliest_skip_date: '2024-01-15',
          latest_skip_date: '2024-03-15'
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockStats });

      const result = await repository.getSkipDateStats([1]);

      expect(result).toHaveLength(1);
      expect(result[0].total_skip_dates).toBe(3);
      expect(result[0].future_skip_dates).toBe(2);
      expect(result[0].past_skip_dates).toBe(1);
    });

    it('should return empty array for empty input', async () => {
      const result = await repository.getSkipDateStats([]);

      expect(result).toEqual([]);
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('validateAgainstMedication', () => {
    it('should validate skip dates against medication date range', async () => {
      mockQuery.mockResolvedValue({ 
        rows: [{ start_date: '2024-01-01', end_date: '2024-12-31' }] 
      });

      const skipDates = [
        { skip_date: '2024-03-15', reason: 'Valid date' },
        { skip_date: '2025-01-15', reason: 'Invalid - after end date' }
      ];

      const result = await repository.validateAgainstMedication(1, skipDates);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].skip_date).toBe('2025-01-15');
    });

    it('should throw error when medication not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(repository.validateAgainstMedication(999, [])).rejects.toThrow('Medication not found');
    });
  });

  describe('cleanupPastSkipDates', () => {
    it('should clean up old skip dates', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 1 }, { id: 2 }] });

      const result = await repository.cleanupPastSkipDates(90);

      expect(result).toBe(2);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('CURRENT_DATE - INTERVAL \'1 day\' * $1'),
        [90]
      );
    });
  });
});