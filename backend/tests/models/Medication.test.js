const Medication = require('../../models/Medication');

describe('Medication Model', () => {
  describe('Constructor', () => {
    test('should create medication with default values', () => {
      const medication = new Medication();
      
      expect(medication.id).toBeNull();
      expect(medication.name).toBe('');
      expect(medication.strength).toBe('');
      expect(medication.route_id).toBeNull();
      expect(medication.frequency_id).toBeNull();
      expect(medication.start_date).toBeNull();
      expect(medication.end_date).toBeNull();
      expect(medication.sheet_size).toBe(10);
      expect(medication.total_tablets).toBe(0);
      expect(medication.notes).toBe('');
    });

    test('should create medication with provided data', () => {
      const data = {
        id: 1,
        name: 'Aspirin',
        strength: '100mg',
        route_id: 1,
        frequency_id: 1,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        sheet_size: 20,
        total_tablets: 100,
        notes: 'Take with food'
      };

      const medication = new Medication(data);
      
      expect(medication.id).toBe(1);
      expect(medication.name).toBe('Aspirin');
      expect(medication.strength).toBe('100mg');
      expect(medication.route_id).toBe(1);
      expect(medication.frequency_id).toBe(1);
      expect(medication.start_date).toBe('2024-01-01');
      expect(medication.end_date).toBe('2024-12-31');
      expect(medication.sheet_size).toBe(20);
      expect(medication.total_tablets).toBe(100);
      expect(medication.notes).toBe('Take with food');
    });
  });

  describe('Validation', () => {
    test('should validate required fields', () => {
      const medication = new Medication();
      const result = medication.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toEqual({ field: 'name', message: 'Name is required' });
      expect(result.errors[1]).toEqual({ field: 'start_date', message: 'Start date is required' });
    });

    test('should validate empty name', () => {
      const medication = new Medication({ name: '   ', start_date: '2024-01-01' });
      const result = medication.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({ field: 'name', message: 'Name is required' });
    });

    test('should validate date formats', () => {
      const medication = new Medication({
        name: 'Test Med',
        start_date: 'invalid-date',
        end_date: '2024-13-45'
      });
      const result = medication.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({ field: 'start_date', message: 'Start date must be a valid date' });
      expect(result.errors).toContainEqual({ field: 'end_date', message: 'End date must be a valid date' });
    });

    test('should validate end date after start date', () => {
      const medication = new Medication({
        name: 'Test Med',
        start_date: '2024-12-31',
        end_date: '2024-01-01'
      });
      const result = medication.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({ field: 'end_date', message: 'End date must be after start date' });
    });

    test('should validate sheet size', () => {
      const medication = new Medication({
        name: 'Test Med',
        start_date: '2024-01-01',
        sheet_size: -5
      });
      const result = medication.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({ field: 'sheet_size', message: 'Sheet size must be a positive integer' });
    });

    test('should validate total tablets', () => {
      const medication = new Medication({
        name: 'Test Med',
        start_date: '2024-01-01',
        total_tablets: -10
      });
      const result = medication.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({ field: 'total_tablets', message: 'Total tablets must be a non-negative number' });
    });

    test('should validate foreign key IDs', () => {
      const medication = new Medication({
        name: 'Test Med',
        start_date: '2024-01-01',
        route_id: -1,
        frequency_id: 0
      });
      const result = medication.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({ field: 'route_id', message: 'Route ID must be a positive integer' });
      expect(result.errors).toContainEqual({ field: 'frequency_id', message: 'Frequency ID must be a positive integer' });
    });

    test('should pass validation with valid data', () => {
      const medication = new Medication({
        name: 'Aspirin',
        strength: '100mg',
        route_id: 1,
        frequency_id: 1,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        sheet_size: 20,
        total_tablets: 100,
        notes: 'Take with food'
      });
      const result = medication.validate();
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Date Validation Helper', () => {
    test('should validate correct date format', () => {
      const medication = new Medication();
      
      expect(medication.isValidDate('2024-01-01')).toBe(true);
      expect(medication.isValidDate('2024-12-31')).toBe(true);
    });

    test('should reject invalid date formats', () => {
      const medication = new Medication();
      
      expect(medication.isValidDate('2024-1-1')).toBe(false);
      expect(medication.isValidDate('01-01-2024')).toBe(false);
      expect(medication.isValidDate('2024/01/01')).toBe(false);
      expect(medication.isValidDate('invalid')).toBe(false);
      expect(medication.isValidDate('')).toBe(false);
      expect(medication.isValidDate(null)).toBe(false);
    });

    test('should reject invalid dates', () => {
      const medication = new Medication();
      
      expect(medication.isValidDate('2024-13-01')).toBe(false);
      expect(medication.isValidDate('2024-02-30')).toBe(false);
      expect(medication.isValidDate('2024-00-01')).toBe(false);
    });
  });

  describe('Active Date Check', () => {
    test('should return true for date within range', () => {
      const medication = new Medication({
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      });
      
      expect(medication.isActiveOnDate('2024-06-15')).toBe(true);
      expect(medication.isActiveOnDate('2024-01-01')).toBe(true);
      expect(medication.isActiveOnDate('2024-12-31')).toBe(true);
    });

    test('should return false for date before start', () => {
      const medication = new Medication({
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      });
      
      expect(medication.isActiveOnDate('2023-12-31')).toBe(false);
    });

    test('should return false for date after end', () => {
      const medication = new Medication({
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      });
      
      expect(medication.isActiveOnDate('2025-01-01')).toBe(false);
    });

    test('should handle ongoing medication (no end date)', () => {
      const medication = new Medication({
        start_date: '2024-01-01'
      });
      
      expect(medication.isActiveOnDate('2024-06-15')).toBe(true);
      expect(medication.isActiveOnDate('2025-01-01')).toBe(true);
      expect(medication.isActiveOnDate('2023-12-31')).toBe(false);
    });
  });

  describe('Inventory Calculations', () => {
    test('should calculate total tablets from sheet count', () => {
      const medication = new Medication({ sheet_size: 10 });
      
      expect(medication.calculateTotalTabletsFromSheets(5)).toBe(50);
      expect(medication.calculateTotalTabletsFromSheets(0)).toBe(0);
    });

    test('should throw error for invalid sheet count', () => {
      const medication = new Medication({ sheet_size: 10 });
      
      expect(() => medication.calculateTotalTabletsFromSheets(-1)).toThrow('Sheet count must be a non-negative integer');
      expect(() => medication.calculateTotalTabletsFromSheets(1.5)).toThrow('Sheet count must be a non-negative integer');
    });

    test('should throw error for invalid sheet size', () => {
      const medication = new Medication({ sheet_size: 0 });
      
      expect(() => medication.calculateTotalTabletsFromSheets(5)).toThrow('Sheet size must be a positive integer');
    });

    test('should calculate sheet equivalent', () => {
      const medication = new Medication({ sheet_size: 10, total_tablets: 55 });
      
      expect(medication.calculateSheetEquivalent()).toBe(5);
    });

    test('should handle zero sheet size in sheet equivalent', () => {
      const medication = new Medication({ sheet_size: 0, total_tablets: 55 });
      
      expect(medication.calculateSheetEquivalent()).toBe(0);
    });
  });

  describe('Inventory Updates', () => {
    test('should update inventory safely', () => {
      const medication = new Medication({ total_tablets: 50 });
      
      medication.updateInventory(75);
      
      expect(medication.total_tablets).toBe(75);
      expect(medication.updated_at).toBeDefined();
    });

    test('should throw error for invalid inventory update', () => {
      const medication = new Medication({ total_tablets: 50 });
      
      expect(() => medication.updateInventory(-10)).toThrow('Total tablets must be a non-negative number');
      expect(() => medication.updateInventory('invalid')).toThrow('Total tablets must be a non-negative number');
    });

    test('should consume tablets correctly', () => {
      const medication = new Medication({ total_tablets: 50 });
      
      const result = medication.consumeTablets(10);
      
      expect(result.consumed).toBe(10);
      expect(result.remaining).toBe(40);
      expect(result.wasShort).toBe(false);
      expect(medication.total_tablets).toBe(40);
    });

    test('should handle consuming more tablets than available', () => {
      const medication = new Medication({ total_tablets: 5 });
      
      const result = medication.consumeTablets(10);
      
      expect(result.consumed).toBe(5);
      expect(result.remaining).toBe(0);
      expect(result.wasShort).toBe(true);
      expect(medication.total_tablets).toBe(0);
    });

    test('should throw error for invalid consumption amount', () => {
      const medication = new Medication({ total_tablets: 50 });
      
      expect(() => medication.consumeTablets(-5)).toThrow('Amount must be a positive number');
      expect(() => medication.consumeTablets(0)).toThrow('Amount must be a positive number');
      expect(() => medication.consumeTablets('invalid')).toThrow('Amount must be a positive number');
    });
  });

  describe('Database Format Conversion', () => {
    test('should convert to database format', () => {
      const medication = new Medication({
        id: 1,
        name: '  Aspirin  ',
        strength: '  100mg  ',
        route_id: 1,
        frequency_id: 1,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        sheet_size: 20,
        total_tablets: 100,
        notes: '  Take with food  '
      });

      const dbFormat = medication.toDbFormat();
      
      expect(dbFormat.id).toBe(1);
      expect(dbFormat.name).toBe('Aspirin');
      expect(dbFormat.strength).toBe('100mg');
      expect(dbFormat.notes).toBe('Take with food');
      expect(dbFormat.updated_at).toBeDefined();
    });

    test('should create from database row', () => {
      const row = {
        id: 1,
        name: 'Aspirin',
        strength: '100mg',
        route_id: 1,
        frequency_id: 1,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        sheet_size: 20,
        total_tablets: '100.50',
        notes: 'Take with food',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const medication = Medication.fromDbRow(row);
      
      expect(medication.id).toBe(1);
      expect(medication.name).toBe('Aspirin');
      expect(medication.total_tablets).toBe(100.50);
      expect(medication.created_at).toBe('2024-01-01T00:00:00Z');
    });
  });
});