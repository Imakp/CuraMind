const { query, transaction } = require('../config/database');
const Medication = require('../models/Medication');

class MedicationRepository {
  // Create a new medication
  async create(medicationData) {
    const medication = new Medication(medicationData);
    const validation = medication.validate();
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const dbData = medication.toDbFormat();
    
    const insertQuery = `
      INSERT INTO medications (
        name, strength, route_id, frequency_id, start_date, end_date,
        sheet_size, total_tablets, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      dbData.name,
      dbData.strength,
      dbData.route_id,
      dbData.frequency_id,
      dbData.start_date,
      dbData.end_date,
      dbData.sheet_size,
      dbData.total_tablets,
      dbData.notes
    ];

    try {
      const result = await query(insertQuery, values);
      return Medication.fromDbRow(result.rows[0]);
    } catch (error) {
      if (error.code === '23503') { // Foreign key violation
        throw new Error('Invalid route_id or frequency_id provided');
      }
      throw error;
    }
  }

  // Find medication by ID
  async findById(id) {
    const selectQuery = `
      SELECT m.*, r.name as route_name, f.name as frequency_name
      FROM medications m
      LEFT JOIN routes r ON m.route_id = r.id
      LEFT JOIN frequencies f ON m.frequency_id = f.id
      WHERE m.id = $1
    `;

    const result = await query(selectQuery, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const medication = Medication.fromDbRow(result.rows[0]);
    // Add route and frequency names for convenience
    medication.route_name = result.rows[0].route_name;
    medication.frequency_name = result.rows[0].frequency_name;
    
    return medication;
  }

  // Find all medications with optional filtering
  async findAll(filters = {}) {
    let whereConditions = [];
    let values = [];
    let paramCount = 0;

    // Build WHERE clause based on filters
    if (filters.active !== undefined) {
      if (filters.active) {
        whereConditions.push(`(m.end_date IS NULL OR m.end_date >= CURRENT_DATE)`);
      } else {
        whereConditions.push(`(m.end_date IS NOT NULL AND m.end_date < CURRENT_DATE)`);
      }
    }

    if (filters.date) {
      paramCount++;
      whereConditions.push(`m.start_date <= $${paramCount} AND (m.end_date IS NULL OR m.end_date >= $${paramCount})`);
      values.push(filters.date);
    }

    if (filters.route_id) {
      paramCount++;
      whereConditions.push(`m.route_id = $${paramCount}`);
      values.push(filters.route_id);
    }

    if (filters.frequency_id) {
      paramCount++;
      whereConditions.push(`m.frequency_id = $${paramCount}`);
      values.push(filters.frequency_id);
    }

    if (filters.search) {
      paramCount++;
      whereConditions.push(`(
        LOWER(m.name) LIKE LOWER($${paramCount}) OR 
        LOWER(m.strength) LIKE LOWER($${paramCount}) OR 
        LOWER(m.notes) LIKE LOWER($${paramCount})
      )`);
      values.push(`%${filters.search}%`);
    }

    if (filters.low_inventory) {
      // This is a simplified check - in practice you'd want to calculate based on daily consumption
      whereConditions.push(`m.total_tablets <= 10`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Build ORDER BY clause
    let orderBy = 'ORDER BY m.name ASC';
    if (filters.sort_by) {
      const validSortFields = ['name', 'start_date', 'end_date', 'total_tablets', 'created_at'];
      if (validSortFields.includes(filters.sort_by)) {
        const direction = filters.sort_direction === 'desc' ? 'DESC' : 'ASC';
        orderBy = `ORDER BY m.${filters.sort_by} ${direction}`;
      }
    }

    const selectQuery = `
      SELECT m.*, r.name as route_name, f.name as frequency_name
      FROM medications m
      LEFT JOIN routes r ON m.route_id = r.id
      LEFT JOIN frequencies f ON m.frequency_id = f.id
      ${whereClause}
      ${orderBy}
    `;

    const result = await query(selectQuery, values);
    
    return result.rows.map(row => {
      const medication = Medication.fromDbRow(row);
      medication.route_name = row.route_name;
      medication.frequency_name = row.frequency_name;
      return medication;
    });
  }

  // Find active medications for a specific date
  async findActiveByDate(date) {
    const selectQuery = `
      SELECT m.*, r.name as route_name, f.name as frequency_name
      FROM medications m
      LEFT JOIN routes r ON m.route_id = r.id
      LEFT JOIN frequencies f ON m.frequency_id = f.id
      WHERE m.start_date <= $1 
        AND (m.end_date IS NULL OR m.end_date >= $1)
        AND NOT EXISTS (
          SELECT 1 FROM skip_dates sd 
          WHERE sd.medicine_id = m.id AND sd.skip_date = $1
        )
      ORDER BY m.name ASC
    `;

    const result = await query(selectQuery, [date]);
    
    return result.rows.map(row => {
      const medication = Medication.fromDbRow(row);
      medication.route_name = row.route_name;
      medication.frequency_name = row.frequency_name;
      return medication;
    });
  }

  // Update medication
  async update(id, medicationData) {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('Medication not found');
    }

    // Merge existing data with updates
    const updatedData = { ...existing, ...medicationData, id };
    const medication = new Medication(updatedData);
    const validation = medication.validate();
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const dbData = medication.toDbFormat();
    
    const updateQuery = `
      UPDATE medications SET
        name = $2,
        strength = $3,
        route_id = $4,
        frequency_id = $5,
        start_date = $6,
        end_date = $7,
        sheet_size = $8,
        total_tablets = $9,
        notes = $10,
        updated_at = now()
      WHERE id = $1
      RETURNING *
    `;
    
    const values = [
      id,
      dbData.name,
      dbData.strength,
      dbData.route_id,
      dbData.frequency_id,
      dbData.start_date,
      dbData.end_date,
      dbData.sheet_size,
      dbData.total_tablets,
      dbData.notes
    ];

    try {
      const result = await query(updateQuery, values);
      return Medication.fromDbRow(result.rows[0]);
    } catch (error) {
      if (error.code === '23503') { // Foreign key violation
        throw new Error('Invalid route_id or frequency_id provided');
      }
      throw error;
    }
  }

  // Update inventory only
  async updateInventory(id, totalTablets, reason = 'Manual update') {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('Medication not found');
    }

    if (typeof totalTablets !== 'number' || totalTablets < 0) {
      throw new Error('Total tablets must be a non-negative number');
    }

    return await transaction(async (client) => {
      // Update medication inventory
      const updateQuery = `
        UPDATE medications SET
          total_tablets = $2,
          updated_at = now()
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await client.query(updateQuery, [id, totalTablets]);
      
      // Log inventory change
      const quantityChange = totalTablets - existing.total_tablets;
      const auditQuery = `
        INSERT INTO audit_logs (medicine_id, action, quantity_change, new_values, created_at)
        VALUES ($1, 'INVENTORY_UPDATED', $2, $3, now())
      `;
      
      await client.query(auditQuery, [
        id, 
        quantityChange, 
        JSON.stringify({ total_tablets: totalTablets, reason })
      ]);
      
      return Medication.fromDbRow(result.rows[0]);
    });
  }

  // Mark dose as given (consume tablets)
  async markDoseGiven(id, doseAmount, timestamp = new Date()) {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('Medication not found');
    }

    if (typeof doseAmount !== 'number' || doseAmount <= 0) {
      throw new Error('Dose amount must be a positive number');
    }

    return await transaction(async (client) => {
      const consumeResult = existing.consumeTablets(doseAmount);
      
      // Update medication inventory
      const updateQuery = `
        UPDATE medications SET
          total_tablets = $2,
          updated_at = now()
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await client.query(updateQuery, [id, consumeResult.remaining]);
      
      // Log dose given
      const auditQuery = `
        INSERT INTO audit_logs (medicine_id, action, quantity_change, new_values, created_at)
        VALUES ($1, 'DOSE_GIVEN', $2, $3, $4)
      `;
      
      await client.query(auditQuery, [
        id, 
        -consumeResult.consumed, 
        JSON.stringify({ 
          dose_amount: doseAmount,
          consumed: consumeResult.consumed,
          remaining: consumeResult.remaining,
          was_short: consumeResult.wasShort,
          timestamp: timestamp.toISOString()
        }),
        timestamp
      ]);
      
      const updatedMedication = Medication.fromDbRow(result.rows[0]);
      updatedMedication.dose_result = consumeResult;
      
      return updatedMedication;
    });
  }

  // Delete medication (soft delete by setting end_date)
  async delete(id) {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('Medication not found');
    }

    // Check if medication has future doses or is currently active
    const today = new Date().toISOString().split('T')[0];
    if (!existing.end_date || existing.end_date >= today) {
      // Soft delete by setting end_date to yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const endDate = yesterday.toISOString().split('T')[0];
      
      return await this.update(id, { end_date: endDate });
    }

    // Hard delete if already ended
    return await transaction(async (client) => {
      // Delete related records first (cascade should handle this, but being explicit)
      await client.query('DELETE FROM medicine_doses WHERE medicine_id = $1', [id]);
      await client.query('DELETE FROM skip_dates WHERE medicine_id = $1', [id]);
      await client.query('DELETE FROM notifications WHERE medicine_id = $1', [id]);
      
      // Delete medication
      const deleteQuery = 'DELETE FROM medications WHERE id = $1 RETURNING *';
      const result = await client.query(deleteQuery, [id]);
      
      return result.rows.length > 0;
    });
  }

  // Get medications that need inventory alerts
  async findLowInventoryMedications(daysAhead = 1) {
    // This is a simplified version - in practice you'd calculate based on actual dose consumption
    const selectQuery = `
      SELECT m.*, r.name as route_name, f.name as frequency_name,
             COALESCE(SUM(md.dose_amount), 0) as daily_consumption
      FROM medications m
      LEFT JOIN routes r ON m.route_id = r.id
      LEFT JOIN frequencies f ON m.frequency_id = f.id
      LEFT JOIN medicine_doses md ON m.id = md.medicine_id
      WHERE m.start_date <= CURRENT_DATE 
        AND (m.end_date IS NULL OR m.end_date >= CURRENT_DATE)
      GROUP BY m.id, r.name, f.name
      HAVING m.total_tablets <= (COALESCE(SUM(md.dose_amount), 1) * $1)
      ORDER BY (m.total_tablets / NULLIF(SUM(md.dose_amount), 0)) ASC
    `;

    const result = await query(selectQuery, [daysAhead]);
    
    return result.rows.map(row => {
      const medication = Medication.fromDbRow(row);
      medication.route_name = row.route_name;
      medication.frequency_name = row.frequency_name;
      medication.daily_consumption = parseFloat(row.daily_consumption);
      medication.days_remaining = medication.daily_consumption > 0 
        ? Math.floor(medication.total_tablets / medication.daily_consumption)
        : null;
      return medication;
    });
  }

  // Get medication count by status
  async getStats() {
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN end_date IS NULL OR end_date >= CURRENT_DATE THEN 1 END) as active,
        COUNT(CASE WHEN end_date IS NOT NULL AND end_date < CURRENT_DATE THEN 1 END) as ended,
        COUNT(CASE WHEN total_tablets <= 10 THEN 1 END) as low_inventory
      FROM medications
    `;

    const result = await query(statsQuery);
    return result.rows[0];
  }
}

module.exports = MedicationRepository;