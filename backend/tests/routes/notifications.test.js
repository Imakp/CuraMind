const request = require('supertest');
const app = require('../../server');
const NotificationRepository = require('../../repositories/NotificationRepository');

// Mock the NotificationRepository
jest.mock('../../repositories/NotificationRepository');

describe('Notification Routes', () => {
    let mockNotificationRepository;

    beforeEach(() => {
        jest.clearAllMocks();

        mockNotificationRepository = {
            findAll: jest.fn(),
            findById: jest.fn(),
            markAsRead: jest.fn(),
            markAllAsReadForMedication: jest.fn(),
            markMultipleAsRead: jest.fn(),
            findUnread: jest.fn(),
            deleteById: jest.fn()
        };

        NotificationRepository.mockImplementation(() => mockNotificationRepository);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('GET /api/notifications', () => {
        it('should get all notifications', async () => {
            const mockNotifications = [
                {
                    id: 1,
                    medicine_id: 1,
                    medication_name: 'Test Med',
                    type: 'BUY_SOON',
                    message: 'Test message',
                    is_read: false,
                    created_at: new Date().toISOString()
                }
            ];

            // Mock the constructor to return our mock instance
            NotificationRepository.mockImplementation(() => mockNotificationRepository);
            mockNotificationRepository.findAll.mockResolvedValue(mockNotifications);

            const response = await request(app)
                .get('/api/notifications')
                .expect(200);

            expect(response.body.data).toEqual(mockNotifications);
            expect(response.body.count).toBe(1);
            expect(mockNotificationRepository.findAll).toHaveBeenCalledWith({});
        });

        it('should filter notifications by read status', async () => {
            const mockNotifications = [
                {
                    id: 1,
                    type: 'BUY_SOON',
                    is_read: false
                }
            ];

            mockNotificationRepository.findAll.mockResolvedValue(mockNotifications);

            const response = await request(app)
                .get('/api/notifications?is_read=false')
                .expect(200);

            expect(mockNotificationRepository.findAll).toHaveBeenCalledWith({
                is_read: false
            });
        });

        it('should filter notifications by medication ID', async () => {
            const mockNotifications = [];
            mockNotificationRepository.findAll.mockResolvedValue(mockNotifications);

            const response = await request(app)
                .get('/api/notifications?medicine_id=123')
                .expect(200);

            expect(mockNotificationRepository.findAll).toHaveBeenCalledWith({
                medicine_id: 123
            });
        });

        it('should filter notifications by type', async () => {
            const mockNotifications = [];
            mockNotificationRepository.findAll.mockResolvedValue(mockNotifications);

            const response = await request(app)
                .get('/api/notifications?type=BUY_SOON')
                .expect(200);

            expect(mockNotificationRepository.findAll).toHaveBeenCalledWith({
                type: 'BUY_SOON'
            });
        });

        it('should limit notifications', async () => {
            const mockNotifications = [];
            mockNotificationRepository.findAll.mockResolvedValue(mockNotifications);

            const response = await request(app)
                .get('/api/notifications?limit=10')
                .expect(200);

            expect(mockNotificationRepository.findAll).toHaveBeenCalledWith({
                limit: 10
            });
        });

        it('should validate invalid medicine ID', async () => {
            const response = await request(app)
                .get('/api/notifications?medicine_id=invalid')
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
            expect(response.body.error.message).toBe('Invalid medicine ID');
        });

        it('should validate invalid limit', async () => {
            const response = await request(app)
                .get('/api/notifications?limit=0')
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
            expect(response.body.error.message).toBe('Invalid limit');
        });

        it('should handle repository errors', async () => {
            mockNotificationRepository.findAll.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .get('/api/notifications')
                .expect(500);

            expect(response.body.error.code).toBe('INTERNAL_ERROR');
            expect(response.body.error.message).toBe('Failed to fetch notifications');
        });
    });

    describe('GET /api/notifications/:id', () => {
        it('should get notification by ID', async () => {
            const mockNotification = {
                id: 1,
                medicine_id: 1,
                medication_name: 'Test Med',
                type: 'BUY_SOON',
                message: 'Test message',
                is_read: false,
                created_at: new Date().toISOString()
            };

            mockNotificationRepository.findById.mockResolvedValue(mockNotification);

            const response = await request(app)
                .get('/api/notifications/1')
                .expect(200);

            expect(response.body.data).toEqual(mockNotification);
            expect(mockNotificationRepository.findById).toHaveBeenCalledWith(1);
        });

        it('should return 404 for non-existent notification', async () => {
            mockNotificationRepository.findById.mockResolvedValue(null);

            const response = await request(app)
                .get('/api/notifications/999')
                .expect(404);

            expect(response.body.error.code).toBe('NOT_FOUND');
            expect(response.body.error.message).toBe('Notification not found');
        });

        it('should validate invalid notification ID', async () => {
            const response = await request(app)
                .get('/api/notifications/invalid')
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
            expect(response.body.error.message).toBe('Invalid notification ID');
        });
    });

    describe('POST /api/notifications/:id/mark-read', () => {
        it('should mark notification as read', async () => {
            const mockNotification = {
                id: 1,
                is_read: true
            };

            mockNotificationRepository.markAsRead.mockResolvedValue(mockNotification);

            const response = await request(app)
                .post('/api/notifications/1/mark-read')
                .expect(200);

            expect(response.body.data).toEqual(mockNotification);
            expect(response.body.message).toBe('Notification marked as read');
            expect(mockNotificationRepository.markAsRead).toHaveBeenCalledWith(1);
        });

        it('should handle non-existent notification', async () => {
            mockNotificationRepository.markAsRead.mockRejectedValue(new Error('Notification not found'));

            const response = await request(app)
                .post('/api/notifications/999/mark-read')
                .expect(500);

            expect(response.body.error.code).toBe('INTERNAL_ERROR');
        });

        it('should validate invalid notification ID', async () => {
            const response = await request(app)
                .post('/api/notifications/invalid/mark-read')
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
            expect(response.body.error.message).toBe('Invalid notification ID');
        });
    });

    describe('POST /api/notifications/mark-all-read', () => {
        it('should mark all notifications as read', async () => {
            const mockUnreadNotifications = [
                { id: 1, is_read: false },
                { id: 2, is_read: false }
            ];

            mockNotificationRepository.findUnread.mockResolvedValue(mockUnreadNotifications);
            mockNotificationRepository.markMultipleAsRead.mockResolvedValue([]);

            const response = await request(app)
                .post('/api/notifications/mark-all-read')
                .send({})
                .expect(200);

            expect(response.body.message).toBe('2 notifications marked as read');
            expect(response.body.count).toBe(2);
            expect(mockNotificationRepository.markMultipleAsRead).toHaveBeenCalledWith([1, 2]);
        });

        it('should mark all notifications as read for specific medication', async () => {
            const mockNotifications = [
                { id: 1, medicine_id: 123, is_read: true }
            ];

            mockNotificationRepository.markAllAsReadForMedication.mockResolvedValue(mockNotifications);

            const response = await request(app)
                .post('/api/notifications/mark-all-read')
                .send({ medicine_id: 123 })
                .expect(200);

            expect(response.body.message).toBe('1 notifications marked as read');
            expect(response.body.count).toBe(1);
            expect(mockNotificationRepository.markAllAsReadForMedication).toHaveBeenCalledWith(123);
        });

        it('should handle no unread notifications', async () => {
            mockNotificationRepository.findUnread.mockResolvedValue([]);

            const response = await request(app)
                .post('/api/notifications/mark-all-read')
                .send({})
                .expect(200);

            expect(response.body.message).toBe('0 notifications marked as read');
            expect(response.body.count).toBe(0);
        });

        it('should validate invalid medicine ID', async () => {
            const response = await request(app)
                .post('/api/notifications/mark-all-read')
                .send({ medicine_id: 'invalid' })
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
            expect(response.body.error.message).toBe('Invalid medicine ID');
        });
    });

    describe('DELETE /api/notifications/:id', () => {
        it('should delete notification', async () => {
            const mockNotification = { id: 1 };
            mockNotificationRepository.deleteById.mockResolvedValue(mockNotification);

            const response = await request(app)
                .delete('/api/notifications/1')
                .expect(200);

            expect(response.body.message).toBe('Notification deleted successfully');
            expect(mockNotificationRepository.deleteById).toHaveBeenCalledWith(1);
        });

        it('should handle non-existent notification', async () => {
            mockNotificationRepository.deleteById.mockRejectedValue(new Error('Notification not found'));

            const response = await request(app)
                .delete('/api/notifications/999')
                .expect(500);

            expect(response.body.error.code).toBe('INTERNAL_ERROR');
        });

        it('should validate invalid notification ID', async () => {
            const response = await request(app)
                .delete('/api/notifications/invalid')
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
            expect(response.body.error.message).toBe('Invalid notification ID');
        });
    });

    describe('GET /api/notifications/unread-count', () => {
        it('should get unread notification count', async () => {
            const mockUnreadNotifications = [
                { id: 1, is_read: false },
                { id: 2, is_read: false },
                { id: 3, is_read: false }
            ];

            mockNotificationRepository.findUnread.mockResolvedValue(mockUnreadNotifications);

            const response = await request(app)
                .get('/api/notifications/unread-count')
                .expect(200);

            expect(response.body.count).toBe(3);
            expect(mockNotificationRepository.findUnread).toHaveBeenCalledWith({ limit: 1000 });
        });

        it('should return 0 when no unread notifications', async () => {
            mockNotificationRepository.findUnread.mockResolvedValue([]);

            const response = await request(app)
                .get('/api/notifications/unread-count')
                .expect(200);

            expect(response.body.count).toBe(0);
        });

        it('should handle repository errors', async () => {
            mockNotificationRepository.findUnread.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .get('/api/notifications/unread-count')
                .expect(500);

            expect(response.body.error.code).toBe('INTERNAL_ERROR');
            expect(response.body.error.message).toBe('Failed to get unread count');
        });
    });
});