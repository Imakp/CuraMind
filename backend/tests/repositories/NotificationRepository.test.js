const NotificationRepository = require('../../repositories/NotificationRepository');
const { query } = require('../../config/database');

// Mock the database module
jest.mock('../../config/database');

describe('NotificationRepository', () => {
  let notificationRepository;
  let mockQuery;

  beforeEach(() => {
    notificationRepository = new NotificationRepository();
    mockQuery = query;
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new notification with all fields', async () => {
      const notificationData = {
        medicine_id: 1,
        type: 'BUY_SOON',
        message: 'Test notification message',
        payload: { test: 'data' },
        is_read: false
      };

      const mockResult = {
        rows: [{
          id: 1,
          medicine_id: 1,
          type: 'BUY_SOON',
          message: 'Test notification message',
          payload: '{"test":"data"}',
          is_read: false,
          created_at: new Date('2024-01-01T10:00:00Z')
        }]
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await notificationRepository.create(notificationData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        [1, 'BUY_SOON', 'Test notification message', '{"test":"data"}', false, expect.any(Date)]
      );

      expect(result).toEqual({
        id: 1,
        medicine_id: 1,
        medication_name: null,
        medication_strength: null,
        type: 'BUY_SOON',
        message: 'Test notification message',
        payload: { test: 'data' },
        is_read: false,
        created_at: new Date('2024-01-01T10:00:00Z')
      });
    });

    it('should create notification without medicine_id', async () => {
      const notificationData = {
        type: 'DOSE_DUE',
        message: 'General notification'
      };

      const mockResult = {
        rows: [{
          id: 2,
          medicine_id: null,
          type: 'DOSE_DUE',
          message: 'General notification',
          payload: null,
          is_read: false,
          created_at: new Date('2024-01-01T10:00:00Z')
        }]
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await notificationRepository.create(notificationData);

      expect(result.medicine_id).toBeNull();
      expect(result.type).toBe('DOSE_DUE');
    });

    it('should throw error if type is missing', async () => {
      const notificationData = {
        message: 'Test message'
      };

      await expect(notificationRepository.create(notificationData))
        .rejects.toThrow('Notification type is required');
    });

    it('should throw error if message is missing', async () => {
      const notificationData = {
        type: 'BUY_SOON'
      };

      await expect(notificationRepository.create(notificationData))
        .rejects.toThrow('Notification message is required');
    });

    it('should throw error for invalid notification type', async () => {
      const notificationData = {
        type: 'INVALID_TYPE',
        message: 'Test message'
      };

      await expect(notificationRepository.create(notificationData))
        .rejects.toThrow('Invalid notification type: INVALID_TYPE');
    });
  });

  describe('findById', () => {
    it('should find notification by ID with medication details', async () => {
      const mockResult = {
        rows: [{
          id: 1,
          medicine_id: 1,
          medication_name: 'Aspirin',
          medication_strength: '100mg',
          type: 'BUY_SOON',
          message: 'Test message',
          payload: '{"test":"data"}',
          is_read: false,
          created_at: new Date('2024-01-01T10:00:00Z')
        }]
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await notificationRepository.findById(1);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT n.*, m.name as medication_name'),
        [1]
      );

      expect(result).toEqual({
        id: 1,
        medicine_id: 1,
        medication_name: 'Aspirin',
        medication_strength: '100mg',
        type: 'BUY_SOON',
        message: 'Test message',
        payload: { test: 'data' },
        is_read: false,
        created_at: new Date('2024-01-01T10:00:00Z')
      });
    });

    it('should return null if notification not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await notificationRepository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should find all notifications with default options', async () => {
      const mockResult = {
        rows: [
          {
            id: 1,
            medicine_id: 1,
            medication_name: 'Aspirin',
            medication_strength: '100mg',
            type: 'BUY_SOON',
            message: 'Test message 1',
            payload: null,
            is_read: false,
            created_at: new Date('2024-01-01T10:00:00Z')
          },
          {
            id: 2,
            medicine_id: 2,
            medication_name: 'Ibuprofen',
            medication_strength: '200mg',
            type: 'DOSE_DUE',
            message: 'Test message 2',
            payload: null,
            is_read: true,
            created_at: new Date('2024-01-01T09:00:00Z')
          }
        ]
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await notificationRepository.findAll();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY n.created_at DESC'),
        []
      );

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
    });

    it('should filter by medication ID', async () => {
      const mockResult = { rows: [] };
      mockQuery.mockResolvedValue(mockResult);

      await notificationRepository.findAll({ medicine_id: 1 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE n.medicine_id = $1'),
        [1]
      );
    });

    it('should filter by notification type', async () => {
      const mockResult = { rows: [] };
      mockQuery.mockResolvedValue(mockResult);

      await notificationRepository.findAll({ type: 'BUY_SOON' });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE n.type = $1'),
        ['BUY_SOON']
      );
    });

    it('should filter by read status', async () => {
      const mockResult = { rows: [] };
      mockQuery.mockResolvedValue(mockResult);

      await notificationRepository.findAll({ is_read: false });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE n.is_read = $1'),
        [false]
      );
    });

    it('should apply pagination', async () => {
      const mockResult = { rows: [] };
      mockQuery.mockResolvedValue(mockResult);

      await notificationRepository.findAll({ limit: 10, offset: 20 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        [10, 20]
      );
    });

    it('should combine multiple filters', async () => {
      const mockResult = { rows: [] };
      mockQuery.mockResolvedValue(mockResult);

      await notificationRepository.findAll({
        medicine_id: 1,
        type: 'BUY_SOON',
        is_read: false
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE n.medicine_id = $1 AND n.type = $2 AND n.is_read = $3'),
        [1, 'BUY_SOON', false]
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const mockResult = {
        rows: [{
          id: 1,
          medicine_id: 1,
          type: 'BUY_SOON',
          message: 'Test message',
          payload: null,
          is_read: true,
          created_at: new Date('2024-01-01T10:00:00Z')
        }]
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await notificationRepository.markAsRead(1);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        [1]
      );

      expect(result.is_read).toBe(true);
    });

    it('should throw error if notification not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(notificationRepository.markAsRead(999))
        .rejects.toThrow('Notification not found');
    });
  });

  describe('markMultipleAsRead', () => {
    it('should mark multiple notifications as read', async () => {
      const mockResult = {
        rows: [
          { id: 1, is_read: true, medicine_id: 1, type: 'BUY_SOON', message: 'Test 1', payload: null, created_at: new Date() },
          { id: 2, is_read: true, medicine_id: 2, type: 'DOSE_DUE', message: 'Test 2', payload: null, created_at: new Date() }
        ]
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await notificationRepository.markMultipleAsRead([1, 2]);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        [1, 2]
      );

      expect(result).toHaveLength(2);
      expect(result[0].is_read).toBe(true);
      expect(result[1].is_read).toBe(true);
    });

    it('should throw error for empty array', async () => {
      await expect(notificationRepository.markMultipleAsRead([]))
        .rejects.toThrow('Array of notification IDs is required');
    });
  });

  describe('deleteById', () => {
    it('should delete notification by ID', async () => {
      const mockResult = {
        rows: [{
          id: 1,
          medicine_id: 1,
          type: 'BUY_SOON',
          message: 'Test message',
          payload: null,
          is_read: false,
          created_at: new Date('2024-01-01T10:00:00Z')
        }]
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await notificationRepository.deleteById(1);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM notifications'),
        [1]
      );

      expect(result.id).toBe(1);
    });

    it('should throw error if notification not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(notificationRepository.deleteById(999))
        .rejects.toThrow('Notification not found');
    });
  });

  describe('existsByTypeAndMedication', () => {
    it('should return true if notification exists within time window', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '1' }] });

      const result = await notificationRepository.existsByTypeAndMedication('BUY_SOON', 1, 24);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) as count'),
        ['BUY_SOON', 1, 24]
      );

      expect(result).toBe(true);
    });

    it('should return false if no notification exists', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '0' }] });

      const result = await notificationRepository.existsByTypeAndMedication('BUY_SOON', 1, 24);

      expect(result).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return notification statistics', async () => {
      const mockResult = {
        rows: [{
          total_notifications: '10',
          unread_count: '3',
          read_count: '7',
          buy_soon_count: '2',
          dose_due_count: '5',
          missed_dose_count: '3',
          earliest_notification: new Date('2024-01-01T08:00:00Z'),
          latest_notification: new Date('2024-01-01T18:00:00Z')
        }]
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await notificationRepository.getStats();

      expect(result).toEqual({
        total_notifications: 10,
        unread_count: 3,
        read_count: 7,
        buy_soon_count: 2,
        dose_due_count: 5,
        missed_dose_count: 3,
        earliest_notification: new Date('2024-01-01T08:00:00Z'),
        latest_notification: new Date('2024-01-01T18:00:00Z')
      });
    });

    it('should filter statistics by medication ID', async () => {
      const mockResult = {
        rows: [{
          total_notifications: '5',
          unread_count: '2',
          read_count: '3',
          buy_soon_count: '1',
          dose_due_count: '2',
          missed_dose_count: '2',
          earliest_notification: new Date('2024-01-01T08:00:00Z'),
          latest_notification: new Date('2024-01-01T18:00:00Z')
        }]
      };

      mockQuery.mockResolvedValue(mockResult);

      await notificationRepository.getStats(1);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE n.medicine_id = $1'),
        [1]
      );
    });
  });

  describe('convenience methods', () => {
    describe('createBuySoonNotification', () => {
      it('should create buy-soon notification if none exists', async () => {
        // Mock existsByTypeAndMedication to return false
        mockQuery
          .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // existsByTypeAndMedication
          .mockResolvedValueOnce({ // create
            rows: [{
              id: 1,
              medicine_id: 1,
              type: 'BUY_SOON',
              message: 'Aspirin is running low. 5 tablets remaining (2 days).',
              payload: '{"medication_name":"Aspirin","current_tablets":5,"days_remaining":2}',
              is_read: false,
              created_at: new Date('2024-01-01T10:00:00Z')
            }]
          });

        const alertData = {
          medication_name: 'Aspirin',
          current_tablets: 5,
          days_remaining: 2
        };

        const result = await notificationRepository.createBuySoonNotification(1, alertData);

        expect(result).toBeTruthy();
        expect(result.type).toBe('BUY_SOON');
        expect(result.message).toContain('Aspirin is running low');
      });

      it('should return null if notification already exists', async () => {
        // Mock existsByTypeAndMedication to return true
        mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }] });

        const alertData = {
          medication_name: 'Aspirin',
          current_tablets: 5,
          days_remaining: 2
        };

        const result = await notificationRepository.createBuySoonNotification(1, alertData);

        expect(result).toBeNull();
      });
    });

    describe('createDoseDueNotification', () => {
      it('should create dose due notification', async () => {
        const mockResult = {
          rows: [{
            id: 1,
            medicine_id: 1,
            type: 'DOSE_DUE',
            message: 'Time to take Aspirin - 1 tablets at 08:00.',
            payload: '{"medication_name":"Aspirin","dose_amount":1,"time_of_day":"08:00"}',
            is_read: false,
            created_at: new Date('2024-01-01T10:00:00Z')
          }]
        };

        mockQuery.mockResolvedValue(mockResult);

        const doseData = {
          medication_name: 'Aspirin',
          dose_amount: 1,
          time_of_day: '08:00'
        };

        const result = await notificationRepository.createDoseDueNotification(1, doseData);

        expect(result.type).toBe('DOSE_DUE');
        expect(result.message).toContain('Time to take Aspirin');
      });
    });

    describe('createMissedDoseNotification', () => {
      it('should create missed dose notification', async () => {
        const mockResult = {
          rows: [{
            id: 1,
            medicine_id: 1,
            type: 'MISSED_DOSE',
            message: 'Missed dose: Aspirin - 1 tablets at 08:00.',
            payload: '{"medication_name":"Aspirin","dose_amount":1,"time_of_day":"08:00"}',
            is_read: false,
            created_at: new Date('2024-01-01T10:00:00Z')
          }]
        };

        mockQuery.mockResolvedValue(mockResult);

        const doseData = {
          medication_name: 'Aspirin',
          dose_amount: 1,
          time_of_day: '08:00'
        };

        const result = await notificationRepository.createMissedDoseNotification(1, doseData);

        expect(result.type).toBe('MISSED_DOSE');
        expect(result.message).toContain('Missed dose: Aspirin');
      });
    });
  });

  describe('formatNotification', () => {
    it('should format notification with all fields', () => {
      const row = {
        id: 1,
        medicine_id: 1,
        medication_name: 'Aspirin',
        medication_strength: '100mg',
        type: 'BUY_SOON',
        message: 'Test message',
        payload: '{"test":"data"}',
        is_read: false,
        created_at: new Date('2024-01-01T10:00:00Z')
      };

      const result = notificationRepository.formatNotification(row);

      expect(result).toEqual({
        id: 1,
        medicine_id: 1,
        medication_name: 'Aspirin',
        medication_strength: '100mg',
        type: 'BUY_SOON',
        message: 'Test message',
        payload: { test: 'data' },
        is_read: false,
        created_at: new Date('2024-01-01T10:00:00Z')
      });
    });

    it('should handle null payload', () => {
      const row = {
        id: 1,
        medicine_id: 1,
        medication_name: 'Aspirin',
        medication_strength: '100mg',
        type: 'BUY_SOON',
        message: 'Test message',
        payload: null,
        is_read: false,
        created_at: new Date('2024-01-01T10:00:00Z')
      };

      const result = notificationRepository.formatNotification(row);

      expect(result.payload).toBeNull();
    });
  });
});