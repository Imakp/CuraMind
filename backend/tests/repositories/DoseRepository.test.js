const DoseRepository = require('../../repositories/DoseRepository');
const MedicineDose = require('../../models/MedicineDose');
const { query, transaction } = require('../../config/database');

// Mock the database module
jest.mock('../../config/database');

describe('DoseRepository', () => {
  let repository;
  let mockQuery;
  let mockTransaction;

  beforeEach(() => {
    repository = new DoseRepository();
    mockQuery = query;
    mockTransaction = transaction;
    jest.clearAllMocks();
  });

  describe('create', () => {
    const validDoseData = {
      medicine_id: 1,
      dose_amount: 2.5,
      time_of_day: '08:00',
      route_override: null,
      instructions: 'Take with food'
    };

    it('should create a dose successfully', async () => {
      const mockDbRow = {
        id: 1,
        ...validDoseData,
        created_at: '2024-01-01T00:00:00Z'
      };

      mockQuery.mockResolvedValue({ rows: [mockDbRow] });

      const result = await repository.create(validDoseData);

      expect(result).toBeInstanceOf(MedicineDose);
      expect(result.id).toBe(1);
      expect(result.dose_amount).toBe(2.5);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO medicine_doses'),
        expect.arrayContaining([1, 2.5, '08:00', null, 'Take with food'])
      );
    });

    it('should throw validation error for invalid data', async () => {
      const invalidData = { ...validDoseData, dose_amount: -1 };

      await expect(repository.create(invalidData)).rejects.toThrow('Validation failed');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should handle foreign key constraint violations', async () => {
      mockQuery.mockRejectedValue({ code: '23503' });

      await expect(repository.create(validDoseData)).rejects.toThrow('Invalid medicine_id or route_override provided');
    });
  });

  describe('findById', () => {
    it('should return dose when found', async () => {
      const mockDbRow = {
        id: 1,
        medicine_id: 1,
        dose_amount: 2.5,
        time_of_day: '08:00',
        route_override: 1,
        instructions: 'Take with food',
        created_at: '2024-01-01T00:00:00Z',
        route_name: 'Oral'
      };

      mockQuery.mockResolvedValue({ rows: [mockDbRow] });

      const result = await repository.findById(1);

      expect(result).toBeInstanceOf(MedicineDose);
      expect(result.id).toBe(1);
      expect(result.route_name).toBe('Oral');
    });

    it('should return null when dose not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findByMedicationId', () => {
    it('should return doses for medication ordered by time', async () => {
      const mockDoses = [
        {
          id: 1,
          medicine_id: 1,
          dose_amount: 1,
          time_of_day: '08:00',
          route_override: null,
          instructions: '',
          created_at: '2024-01-01T00:00:00Z',
          route_name: null
        },
        {
          id: 2,
          medicine_id: 1,
          dose_amount: 1,
          time_of_day: '20:00',
          route_override: null,
          instructions: '',
          created_at: '2024-01-01T00:00:00Z',
          route_name: null
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockDoses });

      const result = await repository.findByMedicationId(1);

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(MedicineDose);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY md.time_of_day ASC'),
        [1]
      );
    });
  });

  describe('findByMedicationIds', () => {
    it('should return doses for multiple medications', async () => {
      const mockDoses = [
        {
          id: 1,
          medicine_id: 1,
          dose_amount: 1,
          time_of_day: '08:00',
          route_override: null,
          instructions: '',
          created_at: '2024-01-01T00:00:00Z',
          route_name: null
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockDoses });

      const result = await repository.findByMedicationIds([1, 2]);

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE md.medicine_id IN ($1,$2)'),
        [1, 2]
      );
    });

    it('should return empty array for empty input', async () => {
      const result = await repository.findByMedicationIds([]);

      expect(result).toEqual([]);
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('findForSchedule', () => {
    it('should find doses for schedule with time range', async () => {
      const mockDoses = [
        {
          id: 1,
          medicine_id: 1,
          dose_amount: 1,
          time_of_day: '08:00',
          route_override: null,
          instructions: '',
          created_at: '2024-01-01T00:00:00Z',
          route_name: null
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockDoses });

      const result = await repository.findForSchedule(1, '06:00', '12:00');

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('md.time_of_day >= $2 AND md.time_of_day <= $3'),
        [1, '06:00', '12:00']
      );
    });

    it('should find doses without time range', async () => {
      const mockDoses = [];
      mockQuery.mockResolvedValue({ rows: mockDoses });

      const result = await repository.findForSchedule(1);

      expect(result).toEqual([]);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE md.medicine_id = $1'),
        [1]
      );
    });
  });

  describe('getTotalDailyDose', () => {
    it('should calculate total daily dose', async () => {
      mockQuery.mockResolvedValue({ rows: [{ total_daily_dose: '5.5' }] });

      const result = await repository.getTotalDailyDose(1);

      expect(result).toBe(5.5);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SUM(dose_amount)'),
        [1]
      );
    });
  });

  describe('getDoseStats', () => {
    it('should return dose statistics', async () => {
      const mockStats = [
        {
          medicine_id: 1,
          dose_count: '2',
          total_daily_dose: '3.0',
          first_dose_time: '08:00',
          last_dose_time: '20:00'
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockStats });

      const result = await repository.getDoseStats([1]);

      expect(result).toHaveLength(1);
      expect(result[0].dose_count).toBe(2);
      expect(result[0].total_daily_dose).toBe(3.0);
    });

    it('should return empty array for empty input', async () => {
      const result = await repository.getDoseStats([]);

      expect(result).toEqual([]);
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const existingDose = {
      id: 1,
      medicine_id: 1,
      dose_amount: 1,
      time_of_day: '08:00',
      route_override: null,
      instructions: 'Original instructions'
    };

    it('should update dose successfully', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(existingDose);
      
      const updatedRow = {
        ...existingDose,
        dose_amount: 2,
        instructions: 'Updated instructions'
      };

      mockQuery.mockResolvedValue({ rows: [updatedRow] });

      const result = await repository.update(1, { 
        dose_amount: 2, 
        instructions: 'Updated instructions' 
      });

      expect(result).toBeInstanceOf(MedicineDose);
      expect(result.dose_amount).toBe(2);
      expect(result.instructions).toBe('Updated instructions');
    });

    it('should throw error when dose not found', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      await expect(repository.update(999, { dose_amount: 2 })).rejects.toThrow('Dose not found');
    });
  });

  describe('delete', () => {
    it('should delete dose successfully', async () => {
      const existingDose = { id: 1, medicine_id: 1 };
      jest.spyOn(repository, 'findById').mockResolvedValue(existingDose);
      
      mockQuery.mockResolvedValue({ rows: [existingDose] });

      const result = await repository.delete(1);

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM medicine_doses WHERE id = $1 RETURNING *',
        [1]
      );
    });

    it('should throw error when dose not found', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      await expect(repository.delete(999)).rejects.toThrow('Dose not found');
    });
  });

  describe('createBulk', () => {
    it('should create multiple doses in transaction', async () => {
      const dosesData = [
        { dose_amount: 1, time_of_day: '08:00', instructions: 'Morning' },
        { dose_amount: 1, time_of_day: '20:00', instructions: 'Evening' }
      ];

      const mockClient = {
        query: jest.fn()
      };
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1, medicine_id: 1, ...dosesData[0] }] })
        .mockResolvedValueOnce({ rows: [{ id: 2, medicine_id: 1, ...dosesData[1] }] });

      mockTransaction.mockImplementation(async (callback) => {
        return await callback(mockClient);
      });

      const result = await repository.createBulk(1, dosesData);

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(MedicineDose);
      expect(mockClient.query).toHaveBeenCalledTimes(2);
    });

    it('should return empty array for empty input', async () => {
      const result = await repository.createBulk(1, []);

      expect(result).toEqual([]);
      expect(mockTransaction).not.toHaveBeenCalled();
    });
  });

  describe('findConflictingDoses', () => {
    it('should find doses within tolerance', async () => {
      const mockDoses = [
        {
          id: 1,
          medicine_id: 1,
          dose_amount: 1,
          time_of_day: '08:05',
          route_override: null,
          instructions: '',
          created_at: '2024-01-01T00:00:00Z',
          route_name: null
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockDoses });

      const result = await repository.findConflictingDoses(1, '08:00', 15);

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ABS(EXTRACT(EPOCH FROM'),
        [1, '08:00', 15]
      );
    });

    it('should exclude specific dose ID', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findConflictingDoses(1, '08:00', 15, 2);

      expect(result).toEqual([]);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND md.id != $4'),
        [1, '08:00', 15, 2]
      );
    });
  });
});