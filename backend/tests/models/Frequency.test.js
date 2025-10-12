const Frequency = require('../../models/Frequency');

describe('Frequency Model', () => {
  describe('Constructor', () => {
    test('should create frequency with default values', () => {
      const frequency = new Frequency();
      
      expect(frequency.id).toBeNull();
      expect(frequency.name).toBe('');
      expect(frequency.description).toBe('');
      expect(frequency.created_at).toBeNull();
    });

    test('should create frequency with provided data', () => {
      const data = {
        id: 1,
        name: 'Once daily',
        description: 'Take once per day',
        created_at: '2024-01-01T00:00:00Z'
      };

      const frequency = new Frequency(data);
      
      expect(frequency.id).toBe(1);
      expect(frequency.name).toBe('Once daily');
      expect(frequency.description).toBe('Take once per day');
      expect(frequency.created_at).toBe('2024-01-01T00:00:00Z');
    });
  });

  describe('Validation', () => {
    test('should validate required fields', () => {
      const frequency = new Frequency();
      const result = frequency.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors).toContainEqual({ field: 'name', message: 'Frequency name is required' });
    });

    test('should validate empty name', () => {
      const frequency = new Frequency({ name: '   ' });
      const result = frequency.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({ field: 'name', message: 'Frequency name is required' });
    });

    test('should validate name length', () => {
      const longName = 'a'.repeat(51);
      const frequency = new Frequency({ name: longName });
      const result = frequency.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({ field: 'name', message: 'Frequency name must be 50 characters or less' });
    });

    test('should validate description length', () => {
      const longDescription = 'a'.repeat(256);
      const frequency = new Frequency({ 
        name: 'Once daily',
        description: longDescription 
      });
      const result = frequency.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({ field: 'description', message: 'Description must be 255 characters or less' });
    });

    test('should pass validation with valid data', () => {
      const frequency = new Frequency({
        name: 'Once daily',
        description: 'Take once per day'
      });
      const result = frequency.validate();
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should pass validation without description', () => {
      const frequency = new Frequency({ name: 'Once daily' });
      const result = frequency.validate();
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Unique Name Validation', () => {
    test('should validate unique name', () => {
      const existingFrequencies = [
        new Frequency({ id: 1, name: 'Once daily' }),
        new Frequency({ id: 2, name: 'Twice daily' })
      ];

      expect(Frequency.validateUniqueName(existingFrequencies, 'Three times daily')).toBe(true);
      expect(Frequency.validateUniqueName(existingFrequencies, 'Once daily')).toBe(false);
      expect(Frequency.validateUniqueName(existingFrequencies, 'ONCE DAILY')).toBe(false); // case insensitive
    });

    test('should allow same name when excluding current ID', () => {
      const existingFrequencies = [
        new Frequency({ id: 1, name: 'Once daily' }),
        new Frequency({ id: 2, name: 'Twice daily' })
      ];

      expect(Frequency.validateUniqueName(existingFrequencies, 'Once daily', 1)).toBe(true);
      expect(Frequency.validateUniqueName(existingFrequencies, 'Once daily', 2)).toBe(false);
    });
  });

  describe('Display Methods', () => {
    test('should get display name with proper capitalization', () => {
      const frequency1 = new Frequency({ name: 'once daily' });
      const frequency2 = new Frequency({ name: 'TWICE DAILY' });
      const frequency3 = new Frequency({ name: 'Three Times Daily' });
      
      expect(frequency1.getDisplayName()).toBe('Once daily');
      expect(frequency2.getDisplayName()).toBe('Twice daily');
      expect(frequency3.getDisplayName()).toBe('Three times daily');
    });

    test('should handle empty name in display', () => {
      const frequency = new Frequency({ name: '   ' });
      
      expect(frequency.getDisplayName()).toBe('');
    });
  });

  describe('Deletion Validation', () => {
    test('should allow deletion when not referenced', () => {
      const frequency = new Frequency({ id: 1, name: 'Once daily' });
      const medications = [
        { frequency_id: 2 },
        { frequency_id: 3 }
      ];

      expect(frequency.canBeDeleted(medications)).toBe(true);
    });

    test('should prevent deletion when referenced by medication', () => {
      const frequency = new Frequency({ id: 1, name: 'Once daily' });
      const medications = [
        { frequency_id: 1 },
        { frequency_id: 2 }
      ];

      expect(frequency.canBeDeleted(medications)).toBe(false);
    });

    test('should allow deletion with empty medications array', () => {
      const frequency = new Frequency({ id: 1, name: 'Once daily' });

      expect(frequency.canBeDeleted([])).toBe(true);
      expect(frequency.canBeDeleted()).toBe(true);
    });
  });

  describe('Database Format Conversion', () => {
    test('should convert to database format', () => {
      const frequency = new Frequency({
        id: 1,
        name: '  Once daily  ',
        description: '  Take once per day  '
      });

      const dbFormat = frequency.toDbFormat();
      
      expect(dbFormat.id).toBe(1);
      expect(dbFormat.name).toBe('Once daily');
      expect(dbFormat.description).toBe('Take once per day');
    });

    test('should create from database row', () => {
      const row = {
        id: 1,
        name: 'Once daily',
        description: 'Take once per day',
        created_at: '2024-01-01T00:00:00Z'
      };

      const frequency = Frequency.fromDbRow(row);
      
      expect(frequency.id).toBe(1);
      expect(frequency.name).toBe('Once daily');
      expect(frequency.description).toBe('Take once per day');
      expect(frequency.created_at).toBe('2024-01-01T00:00:00Z');
    });
  });

  describe('Static Methods', () => {
    test('should sort frequencies by name', () => {
      const frequencies = [
        new Frequency({ name: 'Twice daily' }),
        new Frequency({ name: 'Once daily' }),
        new Frequency({ name: 'Three times daily' })
      ];

      const sorted = Frequency.sortByName(frequencies);
      
      expect(sorted[0].name).toBe('Once daily');
      expect(sorted[1].name).toBe('Three times daily');
      expect(sorted[2].name).toBe('Twice daily');
    });

    test('should get common frequencies', () => {
      const commonFrequencies = Frequency.getCommonFrequencies();
      
      expect(commonFrequencies).toBeInstanceOf(Array);
      expect(commonFrequencies.length).toBeGreaterThan(0);
      expect(commonFrequencies[0]).toHaveProperty('name');
      expect(commonFrequencies[0]).toHaveProperty('description');
      
      const onceDaily = commonFrequencies.find(f => f.name === 'Once daily');
      expect(onceDaily).toBeDefined();
      expect(onceDaily.description).toBe('Take once per day');
    });

    test('should search frequencies by name and description', () => {
      const frequencies = [
        new Frequency({ name: 'Once daily', description: 'Take once per day' }),
        new Frequency({ name: 'Twice daily', description: 'Take twice per day' }),
        new Frequency({ name: 'As needed', description: 'Take as needed (PRN)' })
      ];

      const searchByName = Frequency.search(frequencies, 'once');
      expect(searchByName).toHaveLength(1);
      expect(searchByName[0].name).toBe('Once daily');

      const searchByDescription = Frequency.search(frequencies, 'PRN');
      expect(searchByDescription).toHaveLength(1);
      expect(searchByDescription[0].name).toBe('As needed');

      const searchEmpty = Frequency.search(frequencies, '');
      expect(searchEmpty).toHaveLength(3);

      const searchNotFound = Frequency.search(frequencies, 'xyz');
      expect(searchNotFound).toHaveLength(0);
    });

    test('should group frequencies by type', () => {
      const frequencies = [
        new Frequency({ name: 'Once daily' }),
        new Frequency({ name: 'Every 8 hours' }),
        new Frequency({ name: 'Weekly' }),
        new Frequency({ name: 'Monthly' }),
        new Frequency({ name: 'As needed' }),
        new Frequency({ name: 'Before meals' })
      ];

      const grouped = Frequency.groupByType(frequencies);
      
      expect(grouped.daily).toHaveLength(2);
      expect(grouped.weekly).toHaveLength(1);
      expect(grouped.monthly).toHaveLength(1);
      expect(grouped.asNeeded).toHaveLength(1);
      expect(grouped.other).toHaveLength(1);
      
      expect(grouped.daily.map(f => f.name)).toContain('Once daily');
      expect(grouped.daily.map(f => f.name)).toContain('Every 8 hours');
      expect(grouped.weekly[0].name).toBe('Weekly');
      expect(grouped.monthly[0].name).toBe('Monthly');
      expect(grouped.asNeeded[0].name).toBe('As needed');
      expect(grouped.other[0].name).toBe('Before meals');
    });
  });
});