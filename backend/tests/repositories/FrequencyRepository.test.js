const FrequencyRepository = require('../../repositories/FrequencyRepository');
const Frequency = require('../../models/Frequency');
const { query, transaction } = require('../../config/database');

// Mock the database module
jest.mock('../../config/database');

describe('FrequencyRepository', () => {
  let repository;
  let mockQuery;
  let mockTransaction;

  beforeEach(() => {
    repository = new FrequencyRepository();
    mockQuery = query;
    mockTransaction = transaction;
    jest.clearAllMocks();
  });

  describe('create', () => {
    const validFrequencyData = {
      name: 'Once daily',
      description: 'Take once per day'
    };

    it('should create a frequency successfully', async () => {
      // Mock findAll for uniqueness check
      jest.spyOn(repository, 'findAll').mockResolvedValue([]);
      
      const mockDbRow = {
        id: 1,
        ...validFrequencyData,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockQuery.mockResolvedValue({ rows: [mockDbRow] });

      const result = await repository.create(validFrequencyData);

      expect(result).toBeInstanceOf(Frequency);
      expect(result.id).toBe(1);
      expect(result.name).toBe('Once daily');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO frequencies'),
        expect.arrayContaining(['Once daily', 'Take once per day'])
      );
    });

    it('should throw validation error for invalid data', async () => {
      const invalidData = { ...validFrequencyData, name: '' };

      await expect(repository.create(invalidData)).rejects.toThrow('Validation failed');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should throw error for duplicate name', async () => {
      const existingFrequency = new Frequency({ id: 1, name: 'Once daily', description: 'Existing' });
      jest.spyOn(repository, 'findAll').mockResolvedValue([existingFrequency]);

      await expect(repository.create(validFrequencyData)).rejects.toThrow('Frequency name already exists');
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return frequency when found', async () => {
      const mockDbRow = {
        id: 1,
        name: 'Once daily',
        description: 'Take once per day',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockQuery.mockResolvedValue({ rows: [mockDbRow] });

      const result = await repository.findById(1);

      expect(result).toBeInstanceOf(Frequency);
      expect(result.id).toBe(1);
      expect(result.name).toBe('Once daily');
    });

    it('should return null when frequency not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    const mockFrequencies = [
      {
        id: 1,
        name: 'Once daily',
        description: 'Take once per day',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 2,
        name: 'Twice daily',
        description: 'Take twice per day',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ];

    it('should return all frequencies without filters', async () => {
      mockQuery.mockResolvedValue({ rows: mockFrequencies });

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Frequency);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY name ASC'),
        []
      );
    });

    it('should filter by search term', async () => {
      mockQuery.mockResolvedValue({ rows: [mockFrequencies[0]] });

      const result = await repository.findAll({ search: 'once' });

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(name) LIKE LOWER($1)'),
        ['%once%']
      );
    });

    it('should sort by specified field', async () => {
      mockQuery.mockResolvedValue({ rows: mockFrequencies });

      const result = await repository.findAll({ sort_by: 'created_at', sort_direction: 'desc' });

      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        []
      );
    });
  });

  describe('findByName', () => {
    it('should return frequency when found by name', async () => {
      const mockDbRow = {
        id: 1,
        name: 'Once daily',
        description: 'Take once per day',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockQuery.mockResolvedValue({ rows: [mockDbRow] });

      const result = await repository.findByName('Once daily');

      expect(result).toBeInstanceOf(Frequency);
      expect(result.name).toBe('Once daily');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(name) = LOWER($1)'),
        ['Once daily']
      );
    });

    it('should return null when frequency not found by name', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findByName('NonExistent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const existingFrequency = {
      id: 1,
      name: 'Once daily',
      description: 'Original description'
    };

    it('should update frequency successfully', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(existingFrequency);
      jest.spyOn(repository, 'findAll').mockResolvedValue([existingFrequency]);
      
      const updatedRow = {
        ...existingFrequency,
        description: 'Updated description',
        updated_at: '2024-01-02T00:00:00Z'
      };

      mockQuery.mockResolvedValue({ rows: [updatedRow] });

      const result = await repository.update(1, { description: 'Updated description' });

      expect(result).toBeInstanceOf(Frequency);
      expect(result.description).toBe('Updated description');
    });

    it('should throw error when frequency not found', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      await expect(repository.update(999, { description: 'Updated' })).rejects.toThrow('Frequency not found');
    });

    it('should throw error for duplicate name', async () => {
      const otherFrequency = new Frequency({ id: 2, name: 'Twice daily', description: 'Other' });
      jest.spyOn(repository, 'findById').mockResolvedValue(existingFrequency);
      jest.spyOn(repository, 'findAll').mockResolvedValue([existingFrequency, otherFrequency]);

      await expect(repository.update(1, { name: 'Twice daily' })).rejects.toThrow('Frequency name already exists');
    });
  });

  describe('delete', () => {
    it('should delete frequency when not referenced', async () => {
      const existingFrequency = { id: 1, name: 'Once daily' };
      jest.spyOn(repository, 'findById').mockResolvedValue(existingFrequency);
      
      // Mock references check - no references
      mockQuery
        .mockResolvedValueOnce({ rows: [{ medication_count: '0' }] })
        .mockResolvedValueOnce({ rows: [existingFrequency] });

      const result = await repository.delete(1);

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM frequencies WHERE id = $1 RETURNING *',
        [1]
      );
    });

    it('should throw error when frequency is referenced', async () => {
      const existingFrequency = { id: 1, name: 'Once daily' };
      jest.spyOn(repository, 'findById').mockResolvedValue(existingFrequency);
      
      // Mock references check - has references
      mockQuery.mockResolvedValue({ rows: [{ medication_count: '1' }] });

      await expect(repository.delete(1)).rejects.toThrow('Cannot delete frequency: it is referenced by existing medications');
    });

    it('should throw error when frequency not found', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      await expect(repository.delete(999)).rejects.toThrow('Frequency not found');
    });
  });

  describe('getUsageStats', () => {
    it('should return usage statistics', async () => {
      const mockStats = {
        id: 1,
        name: 'Once daily',
        medication_count: '5',
        active_medication_count: '3'
      };

      mockQuery.mockResolvedValue({ rows: [mockStats] });

      const result = await repository.getUsageStats(1);

      expect(result.medication_count).toBe(5);
      expect(result.active_medication_count).toBe(3);
      expect(result.can_be_deleted).toBe(false);
    });

    it('should return null when frequency not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.getUsageStats(999);

      expect(result).toBeNull();
    });
  });

  describe('findAllGrouped', () => {
    it('should return frequencies grouped by type', async () => {
      const mockFrequencies = [
        new Frequency({ id: 1, name: 'Once daily', description: 'Daily' }),
        new Frequency({ id: 2, name: 'Weekly', description: 'Weekly' }),
        new Frequency({ id: 3, name: 'As needed', description: 'PRN' })
      ];

      jest.spyOn(repository, 'findAll').mockResolvedValue(mockFrequencies);

      const result = await repository.findAllGrouped();

      expect(result).toHaveProperty('daily');
      expect(result).toHaveProperty('weekly');
      expect(result).toHaveProperty('asNeeded');
      expect(result.daily).toHaveLength(1);
      expect(result.weekly).toHaveLength(1);
      expect(result.asNeeded).toHaveLength(1);
    });
  });

  describe('createBulk', () => {
    it('should create multiple frequencies in transaction', async () => {
      const frequenciesData = [
        { name: 'Once daily', description: 'Take once per day' },
        { name: 'Twice daily', description: 'Take twice per day' }
      ];

      const mockClient = {
        query: jest.fn()
      };
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1, ...frequenciesData[0] }] })
        .mockResolvedValueOnce({ rows: [{ id: 2, ...frequenciesData[1] }] });

      mockTransaction.mockImplementation(async (callback) => {
        return await callback(mockClient);
      });

      const result = await repository.createBulk(frequenciesData);

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Frequency);
      expect(mockClient.query).toHaveBeenCalledTimes(2);
    });

    it('should return empty array for empty input', async () => {
      const result = await repository.createBulk([]);

      expect(result).toEqual([]);
      expect(mockTransaction).not.toHaveBeenCalled();
    });
  });

  describe('getCount', () => {
    it('should return frequency count', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '5' }] });

      const result = await repository.getCount();

      expect(result).toBe(5);
      expect(mockQuery).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM frequencies');
    });
  });

  describe('nameExists', () => {
    it('should return true when name exists', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '1' }] });

      const result = await repository.nameExists('Once daily');

      expect(result).toBe(true);
    });

    it('should return false when name does not exist', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '0' }] });

      const result = await repository.nameExists('NonExistent');

      expect(result).toBe(false);
    });

    it('should exclude specific ID when checking', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '0' }] });

      const result = await repository.nameExists('Once daily', 1);

      expect(result).toBe(false);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND id != $2'),
        ['Once daily', 1]
      );
    });
  });

  describe('getMostUsed', () => {
    it('should return most used frequencies', async () => {
      const mockFrequencies = [
        {
          id: 1,
          name: 'Once daily',
          description: 'Take once per day',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          usage_count: '10'
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockFrequencies });

      const result = await repository.getMostUsed(5);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Frequency);
      expect(result[0].usage_count).toBe(10);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1'),
        [5]
      );
    });
  });

  describe('findByType', () => {
    it('should return frequencies by type', async () => {
      const mockFrequencies = [
        new Frequency({ id: 1, name: 'Once daily', description: 'Daily' }),
        new Frequency({ id: 2, name: 'Twice daily', description: 'Daily' })
      ];

      jest.spyOn(repository, 'findAll').mockResolvedValue(mockFrequencies);

      const result = await repository.findByType('daily');

      expect(result).toHaveLength(2);
    });

    it('should return empty array for unknown type', async () => {
      jest.spyOn(repository, 'findAll').mockResolvedValue([]);

      const result = await repository.findByType('unknown');

      expect(result).toEqual([]);
    });
  });

  describe('initializeCommonFrequencies', () => {
    it('should initialize common frequencies when table is empty', async () => {
      jest.spyOn(repository, 'getCount').mockResolvedValue(0);
      jest.spyOn(repository, 'createBulk').mockResolvedValue([]);

      const result = await repository.initializeCommonFrequencies();

      expect(repository.createBulk).toHaveBeenCalledWith(Frequency.getCommonFrequencies());
      expect(result).toEqual([]);
    });

    it('should not initialize when table has data', async () => {
      jest.spyOn(repository, 'getCount').mockResolvedValue(5);
      jest.spyOn(repository, 'createBulk').mockResolvedValue([]);

      const result = await repository.initializeCommonFrequencies();

      expect(repository.createBulk).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});