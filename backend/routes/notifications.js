const express = require('express');
const NotificationRepository = require('../repositories/NotificationRepository');

const router = express.Router();
const notificationRepository = new NotificationRepository();

// GET /api/notifications - Get all notifications
router.get('/', async (req, res) => {
  try {
    const filters = {};

    // Parse query parameters
    if (req.query.is_read !== undefined) {
      filters.is_read = req.query.is_read === 'true';
    }

    if (req.query.type) {
      filters.type = req.query.type;
    }

    if (req.query.medicine_id) {
      const medicineId = parseInt(req.query.medicine_id);
      if (!Number.isInteger(medicineId)) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid medicine ID',
            details: [{ field: 'medicine_id', message: 'Medicine ID must be an integer' }]
          }
        });
      }
      filters.medicine_id = medicineId;
    }

    if (req.query.limit) {
      const limit = parseInt(req.query.limit);
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid limit',
            details: [{ field: 'limit', message: 'Limit must be an integer between 1 and 100' }]
          }
        });
      }
      filters.limit = limit;
    }

    const notifications = await notificationRepository.findAll(filters);

    res.json({
      data: notifications,
      count: notifications.length,
      filters: filters
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch notifications',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// GET /api/notifications/:id - Get specific notification
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid notification ID',
          details: [{ field: 'id', message: 'ID must be an integer' }]
        }
      });
    }

    const notification = await notificationRepository.findById(id);

    if (!notification) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Notification not found'
        }
      });
    }

    res.json({
      data: notification
    });
  } catch (error) {
    console.error('Error fetching notification:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch notification',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// POST /api/notifications/:id/mark-read - Mark notification as read
router.post('/:id/mark-read', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid notification ID',
          details: [{ field: 'id', message: 'ID must be an integer' }]
        }
      });
    }

    const notification = await notificationRepository.markAsRead(id);

    if (!notification) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Notification not found'
        }
      });
    }

    res.json({
      data: notification,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to mark notification as read',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// POST /api/notifications/mark-all-read - Mark all notifications as read
router.post('/mark-all-read', async (req, res) => {
  try {
    let count = 0;

    // Allow filtering which notifications to mark as read
    if (req.body.medicine_id) {
      const medicineId = parseInt(req.body.medicine_id);
      if (!Number.isInteger(medicineId)) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid medicine ID',
            details: [{ field: 'medicine_id', message: 'Medicine ID must be an integer' }]
          }
        });
      }

      const notifications = await notificationRepository.markAllAsReadForMedication(medicineId);
      count = notifications.length;
    } else {
      // Mark all unread notifications as read
      const unreadNotifications = await notificationRepository.findUnread();
      const notificationIds = unreadNotifications.map(n => n.id);

      if (notificationIds.length > 0) {
        await notificationRepository.markMultipleAsRead(notificationIds);
        count = notificationIds.length;
      }
    }

    res.json({
      message: `${count} notifications marked as read`,
      count: count
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to mark notifications as read',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid notification ID',
          details: [{ field: 'id', message: 'ID must be an integer' }]
        }
      });
    }

    const deleted = await notificationRepository.deleteById(id);

    if (!deleted) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Notification not found'
        }
      });
    }

    res.json({
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete notification',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// GET /api/notifications/unread-count - Get count of unread notifications
router.get('/unread-count', async (req, res) => {
  try {
    const unreadNotifications = await notificationRepository.findUnread({ limit: 1000 });
    const count = unreadNotifications.length;

    res.json({
      count: count
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get unread count',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

module.exports = router;