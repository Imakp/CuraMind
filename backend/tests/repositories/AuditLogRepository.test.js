const AuditLogRepository = require('../../repositories/AuditLogRepository');
const { query } = require('../../config/database');

// Mock the database module
jest.mock('../../config/database');

describe('AuditLogRepository', () => {
  let repository;
  let mockQuery;

  beforeEach(() => {
    repository = new AuditLogRepository();
    mockQuery = query;
    jest.clearAllMocks();
  });

  describe('create', () => {
    const validAuditData = {
      medicine_id: 1,
      action: 'DOSE_GIVEN',
      new_values: { dose_amount: 2, consumed: 2 },
      quantity_change: -2
    };

    it('should create an audit log successfully', async () => {
      const mockDbRow = {
        id: 1,
        medicine_id: 1,
        action: 'DOSE_GIVEN',
        old_values: null,
        new_values: '{"dose_amount":2,"consumed":2}',
        quantity_change: -2,
        created_at: '2024-01-01T00:00:00Z'
      };

      mockQuery.mockResolvedValue({ rows: [mockDbRow] });

      const result = await repository.create(validAuditData);

      expect(result.id).toBe(1);
      expect(result.action).toBe('DOSE_GIVEN');
      expect(result.new_values).toEqual({ dose_amount: 2, consumed: 2 });
      expect(result.quantity_change).toBe(-2);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.arrayContaining([1, 'DOSE_GIVEN', null, '{"dose_amount":2,"consumed":2}', -2])
      );
    });

    it('should throw error for missing action', async () => {
      const invalidData = { ...validAuditData, action: null };

      await expect(repository.create(invalidData)).rejects.toThrow('Action is required for audit log');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should throw error for invalid action', async () => {
      const invalidData = { ...validAuditData, action: 'INVALID_ACTION' };

      await expect(repository.create(invalidData)).rejects.toThrow('Invalid action: INVALID_ACTION');
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return audit log when found', async () => {
      const mockDbRow = {
        id: 1,
        medicine_id: 1,
        action: 'DOSE_GIVEN',
        old_values: null,
        new_values: '{"dose_amount":2}',
        quantity_change: -2,
        created_at: '2024-01-01T00:00:00Z',
        medication_name: 'Test Medication'
      };

      mockQuery.mockResolvedValue({ rows: [mockDbRow] });

      const result = await repository.findById(1);

      expect(result.id).toBe(1);
      expect(result.medication_name).toBe('Test Medication');
      expect(result.new_values).toEqual({ dose_amount: 2 });
    });

    it('should return null when audit log not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    const mockAuditLogs = [
      {
        id: 1,
        medicine_id: 1,
        action: 'DOSE_GIVEN',
        old_values: null,
        new_values: '{"dose_amount":2}',
        quantity_change: -2,
        created_at: '2024-01-01T00:00:00Z',
        medication_name: 'Test Medication'
      },
      {
        id: 2,
        medicine_id: 1,
        action: 'INVENTORY_UPDATED',
        old_values: '{"total_tablets":100}',
        new_values: '{"total_tablets":120}',
        quantity_change: 20,
        created_at: '2024-01-02T00:00:00Z',
        medication_name: 'Test Medication'
      }
    ];

    it('should return all audit logs without filters', async () => {
      mockQuery.mockResolvedValue({ rows: mockAuditLogs });

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[0].new_values).toEqual({ dose_amount: 2 });
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY al.created_at DESC'),
        []
      );
    });

    it('should filter by medication ID', async () => {
      mockQuery.mockResolvedValue({ rows: [mockAuditLogs[0]] });

      const result = await repository.findAll({ medicine_id: 1 });

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('al.medicine_id = $1'),
        [1]
      );
    });

    it('should filter by action', async () => {
      mockQuery.mockResolvedValue({ rows: [mockAuditLogs[0]] });

      const result = await repository.findAll({ action: 'DOSE_GIVEN' });

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('al.action = $1'),
        ['DOSE_GIVEN']
      );
    });

    it('should filter by date range', async () => {
      mockQuery.mockResolvedValue({ rows: mockAuditLogs });

      const result = await repository.findAll({ 
        start_date: '2024-01-01', 
        end_date: '2024-01-31' 
      });

      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('al.created_at >= $1 AND al.created_at <= $2'),
        ['2024-01-01', '2024-01-31']
      );
    });

    it('should filter by quantity changes', async () => {
      mockQuery.mockResolvedValue({ rows: [mockAuditLogs[0]] });

      const result = await repository.findAll({ quantity_filter: 'negative' });

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('al.quantity_change < 0'),
        []
      );
    });

    it('should apply pagination', async () => {
      mockQuery.mockResolvedValue({ rows: [mockAuditLogs[0]] });

      const result = await repository.findAll({ limit: 10, offset: 5 });

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        [10, 5]
      );
    });
  });

  describe('findByMedicationId', () => {
    it('should find audit logs for specific medication', async () => {
      const mockAuditLogs = [
        {
          id: 1,
          medicine_id: 1,
          action: 'DOSE_GIVEN',
          old_values: null,
          new_values: '{"dose_amount":2}',
          quantity_change: -2,
          created_at: '2024-01-01T00:00:00Z',
          medication_name: 'Test Medication'
        }
      ];

      jest.spyOn(repository, 'findAll').mockResolvedValue(mockAuditLogs);

      const result = await repository.findByMedicationId(1);

      expect(result).toHaveLength(1);
      expect(repository.findAll).toHaveBeenCalledWith({ medicine_id: 1 });
    });
  });

  describe('findByAction', () => {
    it('should find audit logs by action type', async () => {
      const mockAuditLogs = [
        {
          id: 1,
          medicine_id: 1,
          action: 'DOSE_GIVEN',
          old_values: null,
          new_values: '{"dose_amount":2}',
          quantity_change: -2,
          created_at: '2024-01-01T00:00:00Z',
          medication_name: 'Test Medication'
        }
      ];

      jest.spyOn(repository, 'findAll').mockResolvedValue(mockAuditLogs);

      const result = await repository.findByAction('DOSE_GIVEN');

      expect(result).toHaveLength(1);
      expect(repository.findAll).toHaveBeenCalledWith({ action: 'DOSE_GIVEN' });
    });
  });

  describe('getStats', () => {
    it('should return audit log statistics', async () => {
      const mockStats = {
        total_logs: '10',
        dose_given_count: '5',
        inventory_updated_count: '3',
        created_count: '1',
        updated_count: '1',
        deleted_count: '0',
        total_quantity_change: '-15.5',
        total_quantity_added: '20.0',
        total_quantity_consumed: '35.5',
        earliest_log: '2024-01-01T00:00:00Z',
        latest_log: '2024-01-10T00:00:00Z'
      };

      mockQuery.mockResolvedValue({ rows: [mockStats] });

      const result = await repository.getStats();

      expect(result.total_logs).toBe(10);
      expect(result.dose_given_count).toBe(5);
      expect(result.inventory_updated_count).toBe(3);
      expect(result.total_quantity_change).toBe(-15.5);
      expect(result.total_quantity_added).toBe(20.0);
      expect(result.total_quantity_consumed).toBe(35.5);
    });

    it('should return statistics for specific medication', async () => {
      const mockStats = {
        total_logs: '5',
        dose_given_count: '3',
        inventory_updated_count: '2',
        created_count: '0',
        updated_count: '0',
        deleted_count: '0',
        total_quantity_change: '-10.0',
        total_quantity_added: '0.0',
        total_quantity_consumed: '10.0',
        earliest_log: '2024-01-01T00:00:00Z',
        latest_log: '2024-01-05T00:00:00Z'
      };

      mockQuery.mockResolvedValue({ rows: [mockStats] });

      const result = await repository.getStats(1);

      expect(result.total_logs).toBe(5);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE al.medicine_id = $1'),
        [1]
      );
    });
  });

  describe('getDailyActivity', () => {
    it('should return daily activity summary', async () => {
      const mockActivity = [
        {
          activity_date: '2024-01-01',
          total_activities: '5',
          doses_given: '3',
          inventory_updates: '2',
          tablets_consumed: '6.0'
        },
        {
          activity_date: '2024-01-02',
          total_activities: '3',
          doses_given: '2',
          inventory_updates: '1',
          tablets_consumed: '4.0'
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockActivity });

      const result = await repository.getDailyActivity('2024-01-01', '2024-01-02');

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2024-01-01');
      expect(result[0].total_activities).toBe(5);
      expect(result[0].doses_given).toBe(3);
      expect(result[0].tablets_consumed).toBe(6.0);
    });

    it('should filter by medication ID', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.getDailyActivity('2024-01-01', '2024-01-02', 1);

      expect(result).toEqual([]);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('al.medicine_id = $3'),
        ['2024-01-01', '2024-01-02', 1]
      );
    });
  });

  describe('getComplianceData', () => {
    it('should return compliance data for medication', async () => {
      const mockCompliance = [
        {
          date: '2024-01-01',
          doses_taken: '2',
          total_dose_amount: '4.0'
        },
        {
          date: '2024-01-02',
          doses_taken: '1',
          total_dose_amount: '2.0'
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockCompliance });

      const result = await repository.getComplianceData(1, '2024-01-01', '2024-01-02');

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2024-01-01');
      expect(result[0].doses_taken).toBe(2);
      expect(result[0].total_dose_amount).toBe(4.0);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('action = \'DOSE_GIVEN\''),
        [1, '2024-01-01', '2024-01-02']
      );
    });
  });

  describe('deleteOldLogs', () => {
    it('should delete old audit logs', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 1 }, { id: 2 }] });

      const result = await repository.deleteOldLogs(365);

      expect(result).toBe(2);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('CURRENT_DATE - INTERVAL \'1 day\' * $1'),
        [365]
      );
    });
  });

  describe('exportLogs', () => {
    it('should export audit logs to JSON format', async () => {
      const mockLogs = [
        {
          id: 1,
          medicine_id: 1,
          action: 'DOSE_GIVEN',
          new_values: { dose_amount: 2 },
          quantity_change: -2,
          created_at: '2024-01-01T00:00:00Z'
        }
      ];

      jest.spyOn(repository, 'findAll').mockResolvedValue(mockLogs);

      const result = await repository.exportLogs({ medicine_id: 1 });

      expect(result.total_records).toBe(1);
      expect(result.filters).toEqual({ medicine_id: 1 });
      expect(result.logs).toEqual(mockLogs);
      expect(result.export_date).toBeDefined();
    });
  });

  describe('convenience methods', () => {
    beforeEach(() => {
      jest.spyOn(repository, 'create').mockResolvedValue({ id: 1 });
    });

    it('should log dose given', async () => {
      const doseData = { dose_amount: 2, consumed: 2 };
      
      await repository.logDoseGiven(1, doseData);

      expect(repository.create).toHaveBeenCalledWith({
        medicine_id: 1,
        action: 'DOSE_GIVEN',
        new_values: doseData,
        quantity_change: -2
      });
    });

    it('should log inventory update', async () => {
      await repository.logInventoryUpdate(1, 100, 120, 'Refill');

      expect(repository.create).toHaveBeenCalledWith({
        medicine_id: 1,
        action: 'INVENTORY_UPDATED',
        old_values: { total_tablets: 100 },
        new_values: { total_tablets: 120, reason: 'Refill' },
        quantity_change: 20
      });
    });

    it('should log medication created', async () => {
      const medicationData = { name: 'Test Med', strength: '10mg' };
      
      await repository.logMedicationCreated(1, medicationData);

      expect(repository.create).toHaveBeenCalledWith({
        medicine_id: 1,
        action: 'CREATED',
        new_values: medicationData
      });
    });

    it('should log medication updated', async () => {
      const oldData = { name: 'Old Name' };
      const newData = { name: 'New Name' };
      
      await repository.logMedicationUpdated(1, oldData, newData);

      expect(repository.create).toHaveBeenCalledWith({
        medicine_id: 1,
        action: 'UPDATED',
        old_values: oldData,
        new_values: newData
      });
    });

    it('should log medication deleted', async () => {
      const medicationData = { name: 'Deleted Med', strength: '10mg' };
      
      await repository.logMedicationDeleted(1, medicationData);

      expect(repository.create).toHaveBeenCalledWith({
        medicine_id: 1,
        action: 'DELETED',
        old_values: medicationData
      });
    });
  });
});