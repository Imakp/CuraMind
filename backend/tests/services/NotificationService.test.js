const NotificationService = require('../../services/NotificationService');
const NotificationRepository = require('../../repositories/NotificationRepository');
const InventoryService = require('../../services/InventoryService');
const MedicationRepository = require('../../repositories/MedicationRepository');
const DoseRepository = require('../../repositories/DoseRepository');

// Mock dependencies
jest.mock('../../repositories/NotificationRepository');
jest.mock('../../services/InventoryService');
jest.mock('../../repositories/MedicationRepository');
jest.mock('../../repositories/DoseRepository');
jest.mock('node-cron');

describe('NotificationService', () => {
  let notificationService;
  let mockNotificationRepository;
  let mockInventoryService;
  let mockMedicationRepository;
  let mockDoseRepository;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockNotificationRepository = {
      createBuySoonNotification: jest.fn(),
      createDoseDueNotification: jest.fn(),
      createMissedDoseNotification: jest.fn(),
      existsByTypeAndMedication: jest.fn(),
      findAll: jest.fn(),
      findUnread: jest.fn(),
      markAsRead: jest.fn(),
      markMultipleAsRead: jest.fn(),
      markAllAsReadForMedication: jest.fn(),
      deleteById: jest.fn(),
      getStats: jest.fn(),
      getSummaryByType: jest.fn(),
      deleteOldNotifications: jest.fn()
    };

    mockInventoryService = {
      calculateBuySoonAlerts: jest.fn()
    };

    mockMedicationRepository = {
      findActiveByDate: jest.fn()
    };

    mockDoseRepository = {
      findByMedicationId: jest.fn()
    };

    // Mock constructors
    NotificationRepository.mockImplementation(() => mockNotificationRepository);
    InventoryService.mockImplementation(() => mockInventoryService);
    MedicationRepository.mockImplementation(() => mockMedicationRepository);
    DoseRepository.mockImplementation(() => mockDoseRepository);

    notificationService = new NotificationService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateBuySoonAlerts', () => {
    it('should generate buy-soon alerts for medications that need refill', async () => {
      const mockAlerts = [
        {
          medication_id: 1,
          medication_name: 'Test Med 1',
          current_tablets: 5,
          days_remaining: 2,
          needs_refill: true
        },
        {
          medication_id: 2,
          medication_name: 'Test Med 2',
          current_tablets: 10,
          days_remaining: 5,
          needs_refill: false
        }
      ];

      const mockNotification = {
        id: 1,
        medicine_id: 1,
        type: 'BUY_SOON',
        message: 'Test Med 1 is running low. 5 tablets remaining (2 days).',
        is_read: false
      };

      mockInventoryService.calculateBuySoonAlerts.mockResolvedValue(mockAlerts);
      mockNotificationRepository.existsByTypeAndMedication.mockResolvedValue(false);
      mockNotificationRepository.createBuySoonNotification.mockResolvedValue(mockNotification);

      const result = await notificationService.generateBuySoonAlerts(1);

      expect(mockInventoryService.calculateBuySoonAlerts).toHaveBeenCalledWith(1);
      expect(mockNotificationRepository.existsByTypeAndMedication).toHaveBeenCalledWith('BUY_SOON', 1, 24);
      expect(mockNotificationRepository.createBuySoonNotification).toHaveBeenCalledWith(1, mockAlerts[0]);
      expect(result).toEqual({
        alerts_checked: 2,
        notifications_created: 1,
        notifications: [mockNotification]
      });
    });

    it('should not create duplicate notifications', async () => {
      const mockAlerts = [
        {
          medication_id: 1,
          medication_name: 'Test Med 1',
          current_tablets: 5,
          days_remaining: 2,
          needs_refill: true
        }
      ];

      mockInventoryService.calculateBuySoonAlerts.mockResolvedValue(mockAlerts);
      mockNotificationRepository.existsByTypeAndMedication.mockResolvedValue(true);

      const result = await notificationService.generateBuySoonAlerts(1);

      expect(mockNotificationRepository.createBuySoonNotification).not.toHaveBeenCalled();
      expect(result).toEqual({
        alerts_checked: 1,
        notifications_created: 0,
        notifications: []
      });
    });

    it('should validate days ahead parameter', async () => {
      await expect(notificationService.generateBuySoonAlerts(0)).rejects.toThrow('Days ahead must be an integer between 1 and 30');
      await expect(notificationService.generateBuySoonAlerts(31)).rejects.toThrow('Days ahead must be an integer between 1 and 30');
      await expect(notificationService.generateBuySoonAlerts('invalid')).rejects.toThrow('Days ahead must be an integer between 1 and 30');
    });
  });

  describe('generateDoseDueNotifications', () => {
    it('should generate dose due notifications for upcoming doses', async () => {
      const now = new Date('2024-01-15T08:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      const mockMedications = [
        {
          id: 1,
          name: 'Test Med 1',
          strength: '10mg',
          route_name: 'Oral'
        }
      ];

      const mockDoses = [
        {
          id: 1,
          dose_amount: 1,
          time_of_day: '08:10:00',
          route_override: null,
          instructions: 'Take with food'
        }
      ];

      const mockNotification = {
        id: 1,
        medicine_id: 1,
        type: 'DOSE_DUE',
        message: 'Time to take Test Med 1 - 1 tablets at 08:10:00.',
        is_read: false
      };

      mockMedicationRepository.findActiveByDate.mockResolvedValue(mockMedications);
      mockDoseRepository.findByMedicationId.mockResolvedValue(mockDoses);
      mockNotificationRepository.existsByTypeAndMedication.mockResolvedValue(false);
      mockNotificationRepository.createDoseDueNotification.mockResolvedValue(mockNotification);

      const result = await notificationService.generateDoseDueNotifications(15);

      expect(mockMedicationRepository.findActiveByDate).toHaveBeenCalledWith('2024-01-15');
      expect(mockDoseRepository.findByMedicationId).toHaveBeenCalledWith(1);
      expect(mockNotificationRepository.createDoseDueNotification).toHaveBeenCalled();
      expect(result.notifications_created).toBe(1);
    });

    it('should validate minutes ahead parameter', async () => {
      await expect(notificationService.generateDoseDueNotifications(0)).rejects.toThrow('Minutes ahead must be an integer between 1 and 120');
      await expect(notificationService.generateDoseDueNotifications(121)).rejects.toThrow('Minutes ahead must be an integer between 1 and 120');
    });
  });

  describe('generateMissedDoseNotifications', () => {
    it('should generate missed dose notifications for overdue doses', async () => {
      const now = new Date('2024-01-15T10:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      const mockMedications = [
        {
          id: 1,
          name: 'Test Med 1',
          strength: '10mg',
          route_name: 'Oral'
        }
      ];

      const mockDoses = [
        {
          id: 1,
          dose_amount: 1,
          time_of_day: '08:00:00',
          route_override: null,
          instructions: 'Take with food'
        }
      ];

      const mockNotification = {
        id: 1,
        medicine_id: 1,
        type: 'MISSED_DOSE',
        message: 'Missed dose: Test Med 1 - 1 tablets at 08:00:00.',
        is_read: false
      };

      mockMedicationRepository.findActiveByDate.mockResolvedValue(mockMedications);
      mockDoseRepository.findByMedicationId.mockResolvedValue(mockDoses);
      mockNotificationRepository.existsByTypeAndMedication.mockResolvedValue(false);
      mockNotificationRepository.createMissedDoseNotification.mockResolvedValue(mockNotification);

      const result = await notificationService.generateMissedDoseNotifications(1);

      expect(mockNotificationRepository.createMissedDoseNotification).toHaveBeenCalled();
      expect(result.notifications_created).toBe(1);
    });

    it('should validate hours overdue parameter', async () => {
      await expect(notificationService.generateMissedDoseNotifications(0)).rejects.toThrow('Hours overdue must be an integer between 1 and 24');
      await expect(notificationService.generateMissedDoseNotifications(25)).rejects.toThrow('Hours overdue must be an integer between 1 and 24');
    });
  });

  describe('getNotifications', () => {
    it('should get notifications with options', async () => {
      const mockNotifications = [
        { id: 1, type: 'BUY_SOON', is_read: false },
        { id: 2, type: 'DOSE_DUE', is_read: true }
      ];

      mockNotificationRepository.findAll.mockResolvedValue(mockNotifications);

      const options = { is_read: false, limit: 10 };
      const result = await notificationService.getNotifications(options);

      expect(mockNotificationRepository.findAll).toHaveBeenCalledWith(options);
      expect(result).toEqual(mockNotifications);
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark notification as read', async () => {
      const mockNotification = { id: 1, is_read: true };
      mockNotificationRepository.markAsRead.mockResolvedValue(mockNotification);

      const result = await notificationService.markNotificationAsRead(1);

      expect(mockNotificationRepository.markAsRead).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockNotification);
    });

    it('should validate notification ID', async () => {
      await expect(notificationService.markNotificationAsRead(null)).rejects.toThrow('Valid notification ID is required');
      await expect(notificationService.markNotificationAsRead('invalid')).rejects.toThrow('Valid notification ID is required');
    });
  });

  describe('markMultipleNotificationsAsRead', () => {
    it('should mark multiple notifications as read', async () => {
      const mockNotifications = [
        { id: 1, is_read: true },
        { id: 2, is_read: true }
      ];
      mockNotificationRepository.markMultipleAsRead.mockResolvedValue(mockNotifications);

      const result = await notificationService.markMultipleNotificationsAsRead([1, 2]);

      expect(mockNotificationRepository.markMultipleAsRead).toHaveBeenCalledWith([1, 2]);
      expect(result).toEqual(mockNotifications);
    });

    it('should validate notification IDs array', async () => {
      await expect(notificationService.markMultipleNotificationsAsRead(null)).rejects.toThrow('Array of notification IDs is required');
      await expect(notificationService.markMultipleNotificationsAsRead([])).rejects.toThrow('Array of notification IDs is required');
    });
  });

  describe('background jobs', () => {
    it('should start buy-soon alert job', () => {
      const result = notificationService.startBuySoonAlertJob();

      expect(result).toEqual({
        job_name: 'buySoonAlerts',
        cron_expression: '0 8 * * *',
        status: 'started'
      });
    });

    it('should start dose due notification job', () => {
      const result = notificationService.startDoseDueNotificationJob();

      expect(result).toEqual({
        job_name: 'doseDueNotifications',
        cron_expression: '*/15 * * * *',
        status: 'started'
      });
    });

    it('should start all background jobs', () => {
      const result = notificationService.startAllBackgroundJobs();

      expect(result.message).toBe('All background jobs started');
      expect(result.jobs).toHaveLength(4);
    });

    it('should stop all background jobs', () => {
      // Start jobs first
      notificationService.startAllBackgroundJobs();

      const result = notificationService.stopAllBackgroundJobs();

      expect(result.message).toBe('All background jobs stopped');
      expect(result.jobs).toHaveLength(4);
    });
  });

  describe('triggerImmediateNotificationCheck', () => {
    it('should trigger immediate notification check', async () => {
      mockInventoryService.calculateBuySoonAlerts.mockResolvedValue([]);
      mockMedicationRepository.findActiveByDate.mockResolvedValue([]);

      const result = await notificationService.triggerImmediateNotificationCheck();

      expect(result.message).toBe('Immediate notification check completed');
      expect(result.results).toHaveLength(3);
      expect(result.results[0].type).toBe('buy_soon');
      expect(result.results[1].type).toBe('dose_due');
      expect(result.results[2].type).toBe('missed_dose');
    });
  });

  describe('cleanupOldNotifications', () => {
    it('should cleanup old notifications', async () => {
      mockNotificationRepository.deleteOldNotifications.mockResolvedValue(5);

      const result = await notificationService.cleanupOldNotifications(30);

      expect(mockNotificationRepository.deleteOldNotifications).toHaveBeenCalledWith(30);
      expect(result.deleted_count).toBe(5);
      expect(result.cleanup_date).toBeDefined();
    });

    it('should validate days old parameter', async () => {
      await expect(notificationService.cleanupOldNotifications(0)).rejects.toThrow('Days old must be an integer between 1 and 365');
      await expect(notificationService.cleanupOldNotifications(366)).rejects.toThrow('Days old must be an integer between 1 and 365');
    });
  });
});