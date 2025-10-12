const RouteRepository = require('../../repositories/RouteRepository');
const Route = require('../../models/Route');
const { query, transaction } = require('../../config/database');

// Mock the database module
jest.mock('../../config/database');

describe('RouteRepository', () => {
  let repository;
  let mockQuery;
  let mockTransaction;

  beforeEach(() => {
    repository = new RouteRepository();
    mockQuery = query;
    mockTransaction = transaction;
    jest.clearAllMocks();
  });

  describe('create', () => {
    const validRouteData = {
      name: 'Oral',
      description: 'By mouth'
    };

    it('should create a route successfully', async () => {
      // Mock findAll for uniqueness check
      jest.spyOn(repository, 'findAll').mockResolvedValue([]);
      
      const mockDbRow = {
        id: 1,
        ...validRouteData,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockQuery.mockResolvedValue({ rows: [mockDbRow] });

      const result = await repository.create(validRouteData);

      expect(result).toBeInstanceOf(Route);
      expect(result.id).toBe(1);
      expect(result.name).toBe('Oral');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO routes'),
        expect.arrayContaining(['Oral', 'By mouth'])
      );
    });

    it('should throw validation error for invalid data', async () => {
      const invalidData = { ...validRouteData, name: '' };

      await expect(repository.create(invalidData)).rejects.toThrow('Validation failed');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should throw error for duplicate name', async () => {
      const existingRoute = new Route({ id: 1, name: 'Oral', description: 'Existing' });
      jest.spyOn(repository, 'findAll').mockResolvedValue([existingRoute]);

      await expect(repository.create(validRouteData)).rejects.toThrow('Route name already exists');
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return route when found', async () => {
      const mockDbRow = {
        id: 1,
        name: 'Oral',
        description: 'By mouth',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockQuery.mockResolvedValue({ rows: [mockDbRow] });

      const result = await repository.findById(1);

      expect(result).toBeInstanceOf(Route);
      expect(result.id).toBe(1);
      expect(result.name).toBe('Oral');
    });

    it('should return null when route not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    const mockRoutes = [
      {
        id: 1,
        name: 'Oral',
        description: 'By mouth',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 2,
        name: 'Topical',
        description: 'Applied to skin',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ];

    it('should return all routes without filters', async () => {
      mockQuery.mockResolvedValue({ rows: mockRoutes });

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Route);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY name ASC'),
        []
      );
    });

    it('should filter by search term', async () => {
      mockQuery.mockResolvedValue({ rows: [mockRoutes[0]] });

      const result = await repository.findAll({ search: 'oral' });

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(name) LIKE LOWER($1)'),
        ['%oral%']
      );
    });

    it('should sort by specified field', async () => {
      mockQuery.mockResolvedValue({ rows: mockRoutes });

      const result = await repository.findAll({ sort_by: 'created_at', sort_direction: 'desc' });

      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        []
      );
    });
  });

  describe('findByName', () => {
    it('should return route when found by name', async () => {
      const mockDbRow = {
        id: 1,
        name: 'Oral',
        description: 'By mouth',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockQuery.mockResolvedValue({ rows: [mockDbRow] });

      const result = await repository.findByName('Oral');

      expect(result).toBeInstanceOf(Route);
      expect(result.name).toBe('Oral');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(name) = LOWER($1)'),
        ['Oral']
      );
    });

    it('should return null when route not found by name', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findByName('NonExistent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const existingRoute = {
      id: 1,
      name: 'Oral',
      description: 'Original description'
    };

    it('should update route successfully', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(existingRoute);
      jest.spyOn(repository, 'findAll').mockResolvedValue([existingRoute]);
      
      const updatedRow = {
        ...existingRoute,
        description: 'Updated description',
        updated_at: '2024-01-02T00:00:00Z'
      };

      mockQuery.mockResolvedValue({ rows: [updatedRow] });

      const result = await repository.update(1, { description: 'Updated description' });

      expect(result).toBeInstanceOf(Route);
      expect(result.description).toBe('Updated description');
    });

    it('should throw error when route not found', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      await expect(repository.update(999, { description: 'Updated' })).rejects.toThrow('Route not found');
    });

    it('should throw error for duplicate name', async () => {
      const otherRoute = new Route({ id: 2, name: 'Topical', description: 'Other' });
      jest.spyOn(repository, 'findById').mockResolvedValue(existingRoute);
      jest.spyOn(repository, 'findAll').mockResolvedValue([existingRoute, otherRoute]);

      await expect(repository.update(1, { name: 'Topical' })).rejects.toThrow('Route name already exists');
    });
  });

  describe('delete', () => {
    it('should delete route when not referenced', async () => {
      const existingRoute = { id: 1, name: 'Oral' };
      jest.spyOn(repository, 'findById').mockResolvedValue(existingRoute);
      
      // Mock references check - no references
      mockQuery
        .mockResolvedValueOnce({ rows: [{ medication_count: '0', dose_count: '0' }] })
        .mockResolvedValueOnce({ rows: [existingRoute] });

      const result = await repository.delete(1);

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM routes WHERE id = $1 RETURNING *',
        [1]
      );
    });

    it('should throw error when route is referenced', async () => {
      const existingRoute = { id: 1, name: 'Oral' };
      jest.spyOn(repository, 'findById').mockResolvedValue(existingRoute);
      
      // Mock references check - has references
      mockQuery.mockResolvedValue({ rows: [{ medication_count: '1', dose_count: '0' }] });

      await expect(repository.delete(1)).rejects.toThrow('Cannot delete route: it is referenced by existing medications or doses');
    });

    it('should throw error when route not found', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      await expect(repository.delete(999)).rejects.toThrow('Route not found');
    });
  });

  describe('getUsageStats', () => {
    it('should return usage statistics', async () => {
      const mockStats = {
        id: 1,
        name: 'Oral',
        medication_count: '5',
        dose_override_count: '2',
        active_medication_count: '3'
      };

      mockQuery.mockResolvedValue({ rows: [mockStats] });

      const result = await repository.getUsageStats(1);

      expect(result.medication_count).toBe(5);
      expect(result.dose_override_count).toBe(2);
      expect(result.active_medication_count).toBe(3);
      expect(result.can_be_deleted).toBe(false);
    });

    it('should return null when route not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.getUsageStats(999);

      expect(result).toBeNull();
    });
  });

  describe('createBulk', () => {
    it('should create multiple routes in transaction', async () => {
      const routesData = [
        { name: 'Oral', description: 'By mouth' },
        { name: 'Topical', description: 'Applied to skin' }
      ];

      const mockClient = {
        query: jest.fn()
      };
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1, ...routesData[0] }] })
        .mockResolvedValueOnce({ rows: [{ id: 2, ...routesData[1] }] });

      mockTransaction.mockImplementation(async (callback) => {
        return await callback(mockClient);
      });

      const result = await repository.createBulk(routesData);

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Route);
      expect(mockClient.query).toHaveBeenCalledTimes(2);
    });

    it('should return empty array for empty input', async () => {
      const result = await repository.createBulk([]);

      expect(result).toEqual([]);
      expect(mockTransaction).not.toHaveBeenCalled();
    });
  });

  describe('getCount', () => {
    it('should return route count', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '5' }] });

      const result = await repository.getCount();

      expect(result).toBe(5);
      expect(mockQuery).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM routes');
    });
  });

  describe('nameExists', () => {
    it('should return true when name exists', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '1' }] });

      const result = await repository.nameExists('Oral');

      expect(result).toBe(true);
    });

    it('should return false when name does not exist', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '0' }] });

      const result = await repository.nameExists('NonExistent');

      expect(result).toBe(false);
    });

    it('should exclude specific ID when checking', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '0' }] });

      const result = await repository.nameExists('Oral', 1);

      expect(result).toBe(false);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND id != $2'),
        ['Oral', 1]
      );
    });
  });

  describe('getMostUsed', () => {
    it('should return most used routes', async () => {
      const mockRoutes = [
        {
          id: 1,
          name: 'Oral',
          description: 'By mouth',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          usage_count: '10'
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockRoutes });

      const result = await repository.getMostUsed(5);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Route);
      expect(result[0].usage_count).toBe(10);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1'),
        [5]
      );
    });
  });

  describe('initializeCommonRoutes', () => {
    it('should initialize common routes when table is empty', async () => {
      jest.spyOn(repository, 'getCount').mockResolvedValue(0);
      jest.spyOn(repository, 'createBulk').mockResolvedValue([]);

      const result = await repository.initializeCommonRoutes();

      expect(repository.createBulk).toHaveBeenCalledWith(Route.getCommonRoutes());
      expect(result).toEqual([]);
    });

    it('should not initialize when table has data', async () => {
      jest.spyOn(repository, 'getCount').mockResolvedValue(5);
      jest.spyOn(repository, 'createBulk').mockResolvedValue([]);

      const result = await repository.initializeCommonRoutes();

      expect(repository.createBulk).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});