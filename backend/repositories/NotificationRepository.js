const { query } = require('../config/database');

class NotificationRepository {
  // Create a new notification
  async create(notificationData) {
    const {
      medicine_id = null,
      type,
      message,
      payload = null,
      is_read = false,
      created_at = new Date()
    } = notificationData;

    // Validate required fields
    if (!type) {
      throw new Error('Notification type is required');
    }

    if (!message) {
      throw new Error('Notification message is required');
    }

    const validTypes = ['BUY_SOON', 'DOSE_DUE', 'MISSED_DOSE'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid notification type: ${type}. Must be one of: ${validTypes.join(', ')}`);
    }

    const insertQuery = `
      INSERT INTO notifications (
        medicine_id, type, message, payload, is_read, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      medicine_id,
      type,
      message,
      payload ? JSON.stringify(payload) : null,
      is_read,
      created_at
    ];

    const result = await query(insertQuery, values);
    return this.formatNotification(result.rows[0]);
  }

  // Find notification by ID
  async findById(id) {
    const selectQuery = `
      SELECT n.*, m.name as medication_name, m.strength as medication_strength
      FROM notifications n
      LEFT JOIN medications m ON n.medicine_id = m.id
      WHERE n.id = $1
    `;

    const result = await query(selectQuery, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.formatNotification(result.rows[0]);
  }

  // Find all notifications with filtering and pagination
  async findAll(options = {}) {
    let whereConditions = [];
    let values = [];
    let paramCount = 0;

    // Filter by medication ID
    if (options.medicine_id) {
      paramCount++;
      whereConditions.push(`n.medicine_id = $${paramCount}`);
      values.push(options.medicine_id);
    }

    // Filter by notification type
    if (options.type) {
      paramCount++;
      whereConditions.push(`n.type = $${paramCount}`);
      values.push(options.type);
    }

    // Filter by read status
    if (options.is_read !== undefined) {
      paramCount++;
      whereConditions.push(`n.is_read = $${paramCount}`);
      values.push(options.is_read);
    }

    // Filter by date range
    if (options.start_date) {
      paramCount++;
      whereConditions.push(`n.created_at >= $${paramCount}`);
      values.push(options.start_date);
    }

    if (options.end_date) {
      paramCount++;
      whereConditions.push(`n.created_at <= $${paramCount}`);
      values.push(options.end_date);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Build ORDER BY clause
    const sortBy = options.sort_by || 'created_at';
    const sortDirection = options.sort_direction === 'asc' ? 'ASC' : 'DESC';
    
    let orderBy = 'ORDER BY n.created_at DESC';
    if (['created_at', 'type', 'is_read'].includes(sortBy)) {
      orderBy = `ORDER BY n.${sortBy} ${sortDirection}`;
    }

    // Add pagination
    let limitClause = '';
    if (options.limit) {
      paramCount++;
      limitClause = `LIMIT $${paramCount}`;
      values.push(options.limit);
      
      if (options.offset) {
        paramCount++;
        limitClause += ` OFFSET $${paramCount}`;
        values.push(options.offset);
      }
    }

    const selectQuery = `
      SELECT n.*, m.name as medication_name, m.strength as medication_strength
      FROM notifications n
      LEFT JOIN medications m ON n.medicine_id = m.id
      ${whereClause}
      ${orderBy}
      ${limitClause}
    `;

    const result = await query(selectQuery, values);
    
    return result.rows.map(row => this.formatNotification(row));
  }

  // Find notifications for a specific medication
  async findByMedicationId(medicineId, options = {}) {
    return await this.findAll({ ...options, medicine_id: medicineId });
  }

  // Find notifications by type
  async findByType(type, options = {}) {
    return await this.findAll({ ...options, type });
  }

  // Find unread notifications
  async findUnread(options = {}) {
    return await this.findAll({ ...options, is_read: false });
  }

  // Find recent notifications
  async findRecent(limit = 50, medicineId = null) {
    const options = { 
      limit,
      sort_by: 'created_at',
      sort_direction: 'desc'
    };
    
    if (medicineId) {
      options.medicine_id = medicineId;
    }

    return await this.findAll(options);
  }

  // Mark notification as read
  async markAsRead(id) {
    const updateQuery = `
      UPDATE notifications 
      SET is_read = true 
      WHERE id = $1 
      RETURNING *
    `;

    const result = await query(updateQuery, [id]);
    
    if (result.rows.length === 0) {
      throw new Error('Notification not found');
    }

    return this.formatNotification(result.rows[0]);
  }

  // Mark multiple notifications as read
  async markMultipleAsRead(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('Array of notification IDs is required');
    }

    const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
    const updateQuery = `
      UPDATE notifications 
      SET is_read = true 
      WHERE id IN (${placeholders})
      RETURNING *
    `;

    const result = await query(updateQuery, ids);
    
    return result.rows.map(row => this.formatNotification(row));
  }

  // Mark all notifications as read for a medication
  async markAllAsReadForMedication(medicineId) {
    const updateQuery = `
      UPDATE notifications 
      SET is_read = true 
      WHERE medicine_id = $1 AND is_read = false
      RETURNING *
    `;

    const result = await query(updateQuery, [medicineId]);
    
    return result.rows.map(row => this.formatNotification(row));
  }

  // Delete notification by ID
  async deleteById(id) {
    const deleteQuery = `
      DELETE FROM notifications 
      WHERE id = $1 
      RETURNING *
    `;

    const result = await query(deleteQuery, [id]);
    
    if (result.rows.length === 0) {
      throw new Error('Notification not found');
    }

    return this.formatNotification(result.rows[0]);
  }

  // Delete old notifications (maintenance function)
  async deleteOldNotifications(daysOld = 30) {
    const deleteQuery = `
      DELETE FROM notifications 
      WHERE created_at < CURRENT_DATE - INTERVAL '1 day' * $1
      RETURNING *
    `;
    
    const result = await query(deleteQuery, [daysOld]);
    return result.rows.length;
  }

  // Delete notifications by type
  async deleteByType(type, medicineId = null) {
    let deleteQuery = `
      DELETE FROM notifications 
      WHERE type = $1
    `;
    let values = [type];

    if (medicineId) {
      deleteQuery += ` AND medicine_id = $2`;
      values.push(medicineId);
    }

    deleteQuery += ` RETURNING *`;

    const result = await query(deleteQuery, values);
    return result.rows.length;
  }

  // Get notification statistics
  async getStats(medicineId = null) {
    let whereClause = '';
    let values = [];

    if (medicineId) {
      whereClause = 'WHERE n.medicine_id = $1';
      values.push(medicineId);
    }

    const statsQuery = `
      SELECT 
        COUNT(*) as total_notifications,
        COUNT(CASE WHEN is_read = false THEN 1 END) as unread_count,
        COUNT(CASE WHEN is_read = true THEN 1 END) as read_count,
        COUNT(CASE WHEN type = 'BUY_SOON' THEN 1 END) as buy_soon_count,
        COUNT(CASE WHEN type = 'DOSE_DUE' THEN 1 END) as dose_due_count,
        COUNT(CASE WHEN type = 'MISSED_DOSE' THEN 1 END) as missed_dose_count,
        MIN(created_at) as earliest_notification,
        MAX(created_at) as latest_notification
      FROM notifications n
      ${whereClause}
    `;

    const result = await query(statsQuery, values);
    
    return {
      total_notifications: parseInt(result.rows[0].total_notifications),
      unread_count: parseInt(result.rows[0].unread_count),
      read_count: parseInt(result.rows[0].read_count),
      buy_soon_count: parseInt(result.rows[0].buy_soon_count),
      dose_due_count: parseInt(result.rows[0].dose_due_count),
      missed_dose_count: parseInt(result.rows[0].missed_dose_count),
      earliest_notification: result.rows[0].earliest_notification,
      latest_notification: result.rows[0].latest_notification
    };
  }

  // Check if notification already exists to prevent duplicates
  async existsByTypeAndMedication(type, medicineId, withinHours = 24) {
    const checkQuery = `
      SELECT COUNT(*) as count
      FROM notifications
      WHERE type = $1 
        AND medicine_id = $2
        AND created_at > NOW() - INTERVAL '1 hour' * $3
    `;

    const result = await query(checkQuery, [type, medicineId, withinHours]);
    return parseInt(result.rows[0].count) > 0;
  }

  // Get notification summary by type
  async getSummaryByType() {
    const summaryQuery = `
      SELECT 
        type,
        COUNT(*) as total_count,
        COUNT(CASE WHEN is_read = false THEN 1 END) as unread_count,
        MAX(created_at) as latest_notification
      FROM notifications
      GROUP BY type
      ORDER BY type
    `;

    const result = await query(summaryQuery);
    
    return result.rows.map(row => ({
      type: row.type,
      total_count: parseInt(row.total_count),
      unread_count: parseInt(row.unread_count),
      latest_notification: row.latest_notification
    }));
  }

  // Format notification for consistent output
  formatNotification(row) {
    return {
      id: row.id,
      medicine_id: row.medicine_id,
      medication_name: row.medication_name || null,
      medication_strength: row.medication_strength || null,
      type: row.type,
      message: row.message,
      payload: row.payload ? JSON.parse(row.payload) : null,
      is_read: row.is_read,
      created_at: row.created_at
    };
  }

  // Convenience method to create buy-soon notification
  async createBuySoonNotification(medicineId, alertData) {
    const message = `${alertData.medication_name} is running low. ${alertData.current_tablets} tablets remaining (${alertData.days_remaining} days).`;
    
    // Check if similar notification already exists
    const exists = await this.existsByTypeAndMedication('BUY_SOON', medicineId, 24);
    if (exists) {
      return null; // Don't create duplicate
    }

    return await this.create({
      medicine_id: medicineId,
      type: 'BUY_SOON',
      message: message,
      payload: alertData
    });
  }

  // Convenience method to create dose due notification
  async createDoseDueNotification(medicineId, doseData) {
    const message = `Time to take ${doseData.medication_name} - ${doseData.dose_amount} tablets at ${doseData.time_of_day}.`;
    
    return await this.create({
      medicine_id: medicineId,
      type: 'DOSE_DUE',
      message: message,
      payload: doseData
    });
  }

  // Convenience method to create missed dose notification
  async createMissedDoseNotification(medicineId, doseData) {
    const message = `Missed dose: ${doseData.medication_name} - ${doseData.dose_amount} tablets at ${doseData.time_of_day}.`;
    
    return await this.create({
      medicine_id: medicineId,
      type: 'MISSED_DOSE',
      message: message,
      payload: doseData
    });
  }
}

module.exports = NotificationRepository;