const { query } = require('../config/database');

class AuditLogRepository {
  // Create a new audit log entry
  async create(auditData) {
    const {
      medicine_id,
      action,
      old_values = null,
      new_values = null,
      quantity_change = null,
      created_at = new Date()
    } = auditData;

    // Validate required fields
    if (!action) {
      throw new Error('Action is required for audit log');
    }

    const validActions = ['DOSE_GIVEN', 'INVENTORY_UPDATED', 'CREATED', 'UPDATED', 'DELETED'];
    if (!validActions.includes(action)) {
      throw new Error(`Invalid action: ${action}. Must be one of: ${validActions.join(', ')}`);
    }

    const insertQuery = `
      INSERT INTO audit_logs (
        medicine_id, action, old_values, new_values, quantity_change, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      medicine_id,
      action,
      old_values ? JSON.stringify(old_values) : null,
      new_values ? JSON.stringify(new_values) : null,
      quantity_change,
      created_at
    ];

    const result = await query(insertQuery, values);
    return this.formatAuditLog(result.rows[0]);
  }

  // Find audit log by ID
  async findById(id) {
    const selectQuery = `
      SELECT al.*, m.name as medication_name
      FROM audit_logs al
      LEFT JOIN medications m ON al.medicine_id = m.id
      WHERE al.id = $1
    `;

    const result = await query(selectQuery, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.formatAuditLog(result.rows[0]);
  }

  // Find all audit logs with filtering and pagination
  async findAll(options = {}) {
    let whereConditions = [];
    let values = [];
    let paramCount = 0;

    // Filter by medication ID
    if (options.medicine_id) {
      paramCount++;
      whereConditions.push(`al.medicine_id = $${paramCount}`);
      values.push(options.medicine_id);
    }

    // Filter by action
    if (options.action) {
      paramCount++;
      whereConditions.push(`al.action = $${paramCount}`);
      values.push(options.action);
    }

    // Filter by date range
    if (options.start_date) {
      paramCount++;
      whereConditions.push(`al.created_at >= $${paramCount}`);
      values.push(options.start_date);
    }

    if (options.end_date) {
      paramCount++;
      whereConditions.push(`al.created_at <= $${paramCount}`);
      values.push(options.end_date);
    }

    // Filter by quantity changes (positive, negative, or zero)
    if (options.quantity_filter) {
      if (options.quantity_filter === 'positive') {
        whereConditions.push('al.quantity_change > 0');
      } else if (options.quantity_filter === 'negative') {
        whereConditions.push('al.quantity_change < 0');
      } else if (options.quantity_filter === 'zero') {
        whereConditions.push('al.quantity_change = 0');
      }
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Build ORDER BY clause
    const sortBy = options.sort_by || 'created_at';
    const sortDirection = options.sort_direction === 'asc' ? 'ASC' : 'DESC';
    
    let orderBy = 'ORDER BY al.created_at DESC';
    if (['created_at', 'action', 'quantity_change'].includes(sortBy)) {
      orderBy = `ORDER BY al.${sortBy} ${sortDirection}`;
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
      SELECT al.*, m.name as medication_name
      FROM audit_logs al
      LEFT JOIN medications m ON al.medicine_id = m.id
      ${whereClause}
      ${orderBy}
      ${limitClause}
    `;

    const result = await query(selectQuery, values);
    
    return result.rows.map(row => this.formatAuditLog(row));
  }

  // Find audit logs for a specific medication
  async findByMedicationId(medicineId, options = {}) {
    return await this.findAll({ ...options, medicine_id: medicineId });
  }

  // Find audit logs by action type
  async findByAction(action, options = {}) {
    return await this.findAll({ ...options, action });
  }

  // Find recent audit logs
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

  // Get audit log statistics
  async getStats(medicineId = null) {
    let whereClause = '';
    let values = [];

    if (medicineId) {
      whereClause = 'WHERE al.medicine_id = $1';
      values.push(medicineId);
    }

    const statsQuery = `
      SELECT 
        COUNT(*) as total_logs,
        COUNT(CASE WHEN action = 'DOSE_GIVEN' THEN 1 END) as dose_given_count,
        COUNT(CASE WHEN action = 'INVENTORY_UPDATED' THEN 1 END) as inventory_updated_count,
        COUNT(CASE WHEN action = 'CREATED' THEN 1 END) as created_count,
        COUNT(CASE WHEN action = 'UPDATED' THEN 1 END) as updated_count,
        COUNT(CASE WHEN action = 'DELETED' THEN 1 END) as deleted_count,
        COALESCE(SUM(quantity_change), 0) as total_quantity_change,
        COALESCE(SUM(CASE WHEN quantity_change > 0 THEN quantity_change END), 0) as total_quantity_added,
        COALESCE(SUM(CASE WHEN quantity_change < 0 THEN ABS(quantity_change) END), 0) as total_quantity_consumed,
        MIN(created_at) as earliest_log,
        MAX(created_at) as latest_log
      FROM audit_logs al
      ${whereClause}
    `;

    const result = await query(statsQuery, values);
    
    return {
      total_logs: parseInt(result.rows[0].total_logs),
      dose_given_count: parseInt(result.rows[0].dose_given_count),
      inventory_updated_count: parseInt(result.rows[0].inventory_updated_count),
      created_count: parseInt(result.rows[0].created_count),
      updated_count: parseInt(result.rows[0].updated_count),
      deleted_count: parseInt(result.rows[0].deleted_count),
      total_quantity_change: parseFloat(result.rows[0].total_quantity_change),
      total_quantity_added: parseFloat(result.rows[0].total_quantity_added),
      total_quantity_consumed: parseFloat(result.rows[0].total_quantity_consumed),
      earliest_log: result.rows[0].earliest_log,
      latest_log: result.rows[0].latest_log
    };
  }

  // Get daily activity summary
  async getDailyActivity(startDate, endDate, medicineId = null) {
    let whereConditions = [
      'al.created_at >= $1',
      'al.created_at <= $2'
    ];
    let values = [startDate, endDate];

    if (medicineId) {
      whereConditions.push('al.medicine_id = $3');
      values.push(medicineId);
    }

    const activityQuery = `
      SELECT 
        DATE(al.created_at) as activity_date,
        COUNT(*) as total_activities,
        COUNT(CASE WHEN action = 'DOSE_GIVEN' THEN 1 END) as doses_given,
        COUNT(CASE WHEN action = 'INVENTORY_UPDATED' THEN 1 END) as inventory_updates,
        COALESCE(SUM(CASE WHEN quantity_change < 0 THEN ABS(quantity_change) END), 0) as tablets_consumed
      FROM audit_logs al
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY DATE(al.created_at)
      ORDER BY activity_date DESC
    `;

    const result = await query(activityQuery, values);
    
    return result.rows.map(row => ({
      date: row.activity_date,
      total_activities: parseInt(row.total_activities),
      doses_given: parseInt(row.doses_given),
      inventory_updates: parseInt(row.inventory_updates),
      tablets_consumed: parseFloat(row.tablets_consumed)
    }));
  }

  // Get medication compliance data
  async getComplianceData(medicineId, startDate, endDate) {
    const complianceQuery = `
      SELECT 
        DATE(al.created_at) as date,
        COUNT(CASE WHEN action = 'DOSE_GIVEN' THEN 1 END) as doses_taken,
        COALESCE(SUM(CASE WHEN action = 'DOSE_GIVEN' THEN 
          CAST(new_values->>'dose_amount' AS NUMERIC) END), 0) as total_dose_amount
      FROM audit_logs al
      WHERE al.medicine_id = $1
        AND al.created_at >= $2
        AND al.created_at <= $3
        AND action = 'DOSE_GIVEN'
      GROUP BY DATE(al.created_at)
      ORDER BY date ASC
    `;

    const result = await query(complianceQuery, [medicineId, startDate, endDate]);
    
    return result.rows.map(row => ({
      date: row.date,
      doses_taken: parseInt(row.doses_taken),
      total_dose_amount: parseFloat(row.total_dose_amount)
    }));
  }

  // Delete old audit logs (maintenance function)
  async deleteOldLogs(daysOld = 365) {
    const deleteQuery = `
      DELETE FROM audit_logs 
      WHERE created_at < CURRENT_DATE - INTERVAL '1 day' * $1
      RETURNING *
    `;
    
    const result = await query(deleteQuery, [daysOld]);
    return result.rows.length;
  }

  // Export audit logs to JSON format
  async exportLogs(options = {}) {
    const logs = await this.findAll(options);
    
    return {
      export_date: new Date().toISOString(),
      total_records: logs.length,
      filters: options,
      logs: logs
    };
  }

  // Get inventory change timeline for a medication
  async getInventoryTimeline(medicineId, limit = 100) {
    const timelineQuery = `
      SELECT 
        al.*,
        m.name as medication_name,
        LAG(CAST(new_values->>'total_tablets' AS NUMERIC)) OVER (ORDER BY created_at) as previous_inventory
      FROM audit_logs al
      LEFT JOIN medications m ON al.medicine_id = m.id
      WHERE al.medicine_id = $1
        AND (action = 'INVENTORY_UPDATED' OR action = 'DOSE_GIVEN' OR action = 'CREATED')
        AND quantity_change IS NOT NULL
      ORDER BY al.created_at DESC
      LIMIT $2
    `;

    const result = await query(timelineQuery, [medicineId, limit]);
    
    return result.rows.map(row => this.formatAuditLog(row));
  }

  // Format audit log for consistent output
  formatAuditLog(row) {
    return {
      id: row.id,
      medicine_id: row.medicine_id,
      medication_name: row.medication_name || null,
      action: row.action,
      old_values: row.old_values ? JSON.parse(row.old_values) : null,
      new_values: row.new_values ? JSON.parse(row.new_values) : null,
      quantity_change: row.quantity_change ? parseFloat(row.quantity_change) : null,
      created_at: row.created_at,
      previous_inventory: row.previous_inventory ? parseFloat(row.previous_inventory) : null
    };
  }

  // Log dose given action (convenience method)
  async logDoseGiven(medicineId, doseData) {
    return await this.create({
      medicine_id: medicineId,
      action: 'DOSE_GIVEN',
      new_values: doseData,
      quantity_change: -Math.abs(doseData.consumed || doseData.dose_amount || 0)
    });
  }

  // Log inventory update action (convenience method)
  async logInventoryUpdate(medicineId, oldInventory, newInventory, reason = null) {
    const quantityChange = newInventory - oldInventory;
    
    return await this.create({
      medicine_id: medicineId,
      action: 'INVENTORY_UPDATED',
      old_values: { total_tablets: oldInventory },
      new_values: { total_tablets: newInventory, reason },
      quantity_change: quantityChange
    });
  }

  // Log medication creation (convenience method)
  async logMedicationCreated(medicineId, medicationData) {
    return await this.create({
      medicine_id: medicineId,
      action: 'CREATED',
      new_values: medicationData
    });
  }

  // Log medication update (convenience method)
  async logMedicationUpdated(medicineId, oldData, newData) {
    return await this.create({
      medicine_id: medicineId,
      action: 'UPDATED',
      old_values: oldData,
      new_values: newData
    });
  }

  // Log medication deletion (convenience method)
  async logMedicationDeleted(medicineId, medicationData) {
    return await this.create({
      medicine_id: medicineId,
      action: 'DELETED',
      old_values: medicationData
    });
  }
}

module.exports = AuditLogRepository;