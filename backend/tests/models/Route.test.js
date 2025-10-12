const Route = require('../../models/Route');

describe('Route Model', () => {
  describe('Constructor', () => {
    test('should create route with default values', () => {
      const route = new Route();
      
      expect(route.id).toBeNull();
      expect(route.name).toBe('');
      expect(route.description).toBe('');
      expect(route.created_at).toBeNull();
    });

    test('should create route with provided data', () => {
      const data = {
        id: 1,
        name: 'Oral',
        description: 'By mouth',
        created_at: '2024-01-01T00:00:00Z'
      };

      const route = new Route(data);
      
      expect(route.id).toBe(1);
      expect(route.name).toBe('Oral');
      expect(route.description).toBe('By mouth');
      expect(route.created_at).toBe('2024-01-01T00:00:00Z');
    });
  });

  describe('Validation', () => {
    test('should validate required fields', () => {
      const route = new Route();
      const result = route.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors).toContainEqual({ field: 'name', message: 'Route name is required' });
    });

    test('should validate empty name', () => {
      const route = new Route({ name: '   ' });
      const result = route.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({ field: 'name', message: 'Route name is required' });
    });

    test('should validate name length', () => {
      const longName = 'a'.repeat(51);
      const route = new Route({ name: longName });
      const result = route.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({ field: 'name', message: 'Route name must be 50 characters or less' });
    });

    test('should validate description length', () => {
      const longDescription = 'a'.repeat(256);
      const route = new Route({ 
        name: 'Oral',
        description: longDescription 
      });
      const result = route.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({ field: 'description', message: 'Description must be 255 characters or less' });
    });

    test('should pass validation with valid data', () => {
      const route = new Route({
        name: 'Oral',
        description: 'By mouth'
      });
      const result = route.validate();
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should pass validation without description', () => {
      const route = new Route({ name: 'Oral' });
      const result = route.validate();
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Unique Name Validation', () => {
    test('should validate unique name', () => {
      const existingRoutes = [
        new Route({ id: 1, name: 'Oral' }),
        new Route({ id: 2, name: 'Topical' })
      ];

      expect(Route.validateUniqueName(existingRoutes, 'Sublingual')).toBe(true);
      expect(Route.validateUniqueName(existingRoutes, 'Oral')).toBe(false);
      expect(Route.validateUniqueName(existingRoutes, 'ORAL')).toBe(false); // case insensitive
    });

    test('should allow same name when excluding current ID', () => {
      const existingRoutes = [
        new Route({ id: 1, name: 'Oral' }),
        new Route({ id: 2, name: 'Topical' })
      ];

      expect(Route.validateUniqueName(existingRoutes, 'Oral', 1)).toBe(true);
      expect(Route.validateUniqueName(existingRoutes, 'Oral', 2)).toBe(false);
    });
  });

  describe('Display Methods', () => {
    test('should get display name with proper capitalization', () => {
      const route1 = new Route({ name: 'oral' });
      const route2 = new Route({ name: 'TOPICAL' });
      const route3 = new Route({ name: 'SubLingual' });
      
      expect(route1.getDisplayName()).toBe('Oral');
      expect(route2.getDisplayName()).toBe('Topical');
      expect(route3.getDisplayName()).toBe('Sublingual');
    });

    test('should handle empty name in display', () => {
      const route = new Route({ name: '   ' });
      
      expect(route.getDisplayName()).toBe('');
    });
  });

  describe('Deletion Validation', () => {
    test('should allow deletion when not referenced', () => {
      const route = new Route({ id: 1, name: 'Oral' });
      const medications = [
        { route_id: 2, doses: [] },
        { route_id: 3, doses: [{ route_override: 2 }] }
      ];

      expect(route.canBeDeleted(medications)).toBe(true);
    });

    test('should prevent deletion when referenced by medication', () => {
      const route = new Route({ id: 1, name: 'Oral' });
      const medications = [
        { route_id: 1, doses: [] },
        { route_id: 2, doses: [] }
      ];

      expect(route.canBeDeleted(medications)).toBe(false);
    });

    test('should prevent deletion when referenced by dose override', () => {
      const route = new Route({ id: 1, name: 'Oral' });
      const medications = [
        { 
          route_id: 2, 
          doses: [
            { route_override: 1 },
            { route_override: 2 }
          ] 
        }
      ];

      expect(route.canBeDeleted(medications)).toBe(false);
    });

    test('should allow deletion with empty medications array', () => {
      const route = new Route({ id: 1, name: 'Oral' });

      expect(route.canBeDeleted([])).toBe(true);
      expect(route.canBeDeleted()).toBe(true);
    });
  });

  describe('Database Format Conversion', () => {
    test('should convert to database format', () => {
      const route = new Route({
        id: 1,
        name: '  Oral  ',
        description: '  By mouth  '
      });

      const dbFormat = route.toDbFormat();
      
      expect(dbFormat.id).toBe(1);
      expect(dbFormat.name).toBe('Oral');
      expect(dbFormat.description).toBe('By mouth');
    });

    test('should create from database row', () => {
      const row = {
        id: 1,
        name: 'Oral',
        description: 'By mouth',
        created_at: '2024-01-01T00:00:00Z'
      };

      const route = Route.fromDbRow(row);
      
      expect(route.id).toBe(1);
      expect(route.name).toBe('Oral');
      expect(route.description).toBe('By mouth');
      expect(route.created_at).toBe('2024-01-01T00:00:00Z');
    });
  });

  describe('Static Methods', () => {
    test('should sort routes by name', () => {
      const routes = [
        new Route({ name: 'Topical' }),
        new Route({ name: 'Oral' }),
        new Route({ name: 'Sublingual' })
      ];

      const sorted = Route.sortByName(routes);
      
      expect(sorted[0].name).toBe('Oral');
      expect(sorted[1].name).toBe('Sublingual');
      expect(sorted[2].name).toBe('Topical');
    });

    test('should get common routes', () => {
      const commonRoutes = Route.getCommonRoutes();
      
      expect(commonRoutes).toBeInstanceOf(Array);
      expect(commonRoutes.length).toBeGreaterThan(0);
      expect(commonRoutes[0]).toHaveProperty('name');
      expect(commonRoutes[0]).toHaveProperty('description');
      
      const oralRoute = commonRoutes.find(r => r.name === 'Oral');
      expect(oralRoute).toBeDefined();
      expect(oralRoute.description).toBe('By mouth');
    });

    test('should search routes by name and description', () => {
      const routes = [
        new Route({ name: 'Oral', description: 'By mouth' }),
        new Route({ name: 'Topical', description: 'Applied to skin' }),
        new Route({ name: 'Sublingual', description: 'Under the tongue' })
      ];

      const searchByName = Route.search(routes, 'oral');
      expect(searchByName).toHaveLength(1);
      expect(searchByName[0].name).toBe('Oral');

      const searchByDescription = Route.search(routes, 'skin');
      expect(searchByDescription).toHaveLength(1);
      expect(searchByDescription[0].name).toBe('Topical');

      const searchEmpty = Route.search(routes, '');
      expect(searchEmpty).toHaveLength(3);

      const searchNotFound = Route.search(routes, 'xyz');
      expect(searchNotFound).toHaveLength(0);
    });
  });
});