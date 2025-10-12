const { query, transaction } = require('../config/database');
const SkipDate = require('../models/SkipDate');

class SkipDateRepository {
  // Create a new skip date
  async create(skipDateData) {
    const skipDate = new SkipDate(skipDateData);
    const validation = skipDate.validate();
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const dbData = skipDate.toDbFormat();
    
    const insertQuery = `
      INSERT INTO skip_dates (
        medicine_id, skip_date, reason
      ) VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const values = [
      dbData.medicine_id,
      dbData.skip_date,
      dbData.reason
    ];

    try {
      const result = await query(insertQuery, values);
      return SkipDate.fromDbRow(result.rows[0]);
    } catch (error) {
      if (error.code === '23503') { // Foreign key violation
        throw new Error('Invalid medicine_id provided');
      }
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Skip date already exists for this medication');
      }
      throw error;
    }
  }

  // Find skip date by ID
  async findById(id) {
    const selectQuery = `
      SELECT sd.*, m.name as medication_name
      FROM skip_dates sd
      LEFT JOIN medications m ON sd.medicine_id = m.id
      WHERE sd.id = $1
    `;

    const result = await query(selectQuery, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const skipDate = SkipDate.fromDbRow(result.rows[0]);
    skipDate.medication_name = result.rows[0].medication_name;
    
    return skipDate;
  }

  // Find all skip dates for a medication
  async findByMedicationId(medicineId) {
    const selectQuery = `
      SELECT sd.*, m.name as medication_name
      FROM skip_dates sd
      LEFT JOIN medications m ON sd.medicine_id = m.id
      WHERE sd.medicine_id = $1
      ORDER BY sd.skip_date ASC
    `;

    const result = await query(selectQuery, [medicineId]);
    
    return result.rows.map(row => {
      const skipDate = SkipDate.fromDbRow(row);
      skipDate.medication_name = row.medication_name;
      return skipDate;
    });
  }

  // Find skip dates for multiple medications
  async findByMedicationIds(medicineIds) {
    if (!Array.isArray(medicineIds) || medicineIds.length === 0) {
      return [];
    }

    const placeholders = medicineIds.map((_, index) => `$${index + 1}`).join(',');
    
    const selectQuery = `
      SELECT sd.*, m.name as medication_name
      FROM skip_dates sd
      LEFT JOIN medications m ON sd.medicine_id = m.id
      WHERE sd.medicine_id IN (${placeholders})
      ORDER BY sd.medicine_id, sd.skip_date ASC
    `;

    const result = await query(selectQuery, medicineIds);
    
    return result.rows.map(row => {
      const skipDate = SkipDate.fromDbRow(row);
      skipDate.medication_name = row.medication_name;
      return skipDate;
    });
  }

  // Find skip dates by date range
  async findByDateRange(startDate, endDate, medicineId = null) {
    let whereConditions = ['sd.skip_date >= $1', 'sd.skip_date <= $2'];
    let values = [startDate, endDate];
    let paramCount = 2;

    if (medicineId) {
      paramCount++;
      whereConditions.push(`sd.medicine_id = $${paramCount}`);
      values.push(medicineId);
    }

    const selectQuery = `
      SELECT sd.*, m.name as medication_name
      FROM skip_dates sd
      LEFT JOIN medications m ON sd.medicine_id = m.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY sd.skip_date ASC, m.name ASC
    `;

    const result = await query(selectQuery, values);
    
    return result.rows.map(row => {
      const skipDate = SkipDate.fromDbRow(row);
      skipDate.medication_name = row.medication_name;
      return skipDate;
    });
  }

  // Find skip dates for a specific date
  async findByDate(date, medicineId = null) {
    let whereConditions = ['sd.skip_date = $1'];
    let values = [date];

    if (medicineId) {
      whereConditions.push('sd.medicine_id = $2');
      values.push(medicineId);
    }

    const selectQuery = `
      SELECT sd.*, m.name as medication_name
      FROM skip_dates sd
      LEFT JOIN medications m ON sd.medicine_id = m.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY m.name ASC
    `;

    const result = await query(selectQuery, values);
    
    return result.rows.map(row => {
      const skipDate = SkipDate.fromDbRow(row);
      skipDate.medication_name = row.medication_name;
      return skipDate;
    });
  }

  // Check if a medication should be skipped on a specific date
  async shouldSkipOnDate(medicineId, date) {
    const selectQuery = `
      SELECT COUNT(*) as count
      FROM skip_dates
      WHERE medicine_id = $1 AND skip_date = $2
    `;

    const result = await query(selectQuery, [medicineId, date]);
    return parseInt(result.rows[0].count) > 0;
  }

  // Get skip dates for schedule generation (excludes past dates by default)
  async findForScheduleGeneration(medicineIds, includePast = false) {
    if (!Array.isArray(medicineIds) || medicineIds.length === 0) {
      return [];
    }

    const placeholders = medicineIds.map((_, index) => `$${index + 1}`).join(',');
    let whereConditions = [`sd.medicine_id IN (${placeholders})`];
    let values = [...medicineIds];

    if (!includePast) {
      whereConditions.push('sd.skip_date >= CURRENT_DATE');
    }

    const selectQuery = `
      SELECT sd.*, m.name as medication_name
      FROM skip_dates sd
      LEFT JOIN medications m ON sd.medicine_id = m.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY sd.skip_date ASC, m.name ASC
    `;

    const result = await query(selectQuery, values);
    
    return result.rows.map(row => {
      const skipDate = SkipDate.fromDbRow(row);
      skipDate.medication_name = row.medication_name;
      return skipDate;
    });
  }

  // Find upcoming skip dates (next N days)
  async findUpcoming(medicineId = null, days = 7) {
    let whereConditions = [
      'sd.skip_date >= CURRENT_DATE',
      'sd.skip_date <= CURRENT_DATE + INTERVAL \'1 day\' * $1'
    ];
    let values = [days];
    let paramCount = 1;

    if (medicineId) {
      paramCount++;
      whereConditions.push(`sd.medicine_id = $${paramCount}`);
      values.push(medicineId);
    }

    const selectQuery = `
      SELECT sd.*, m.name as medication_name
      FROM skip_dates sd
      LEFT JOIN medications m ON sd.medicine_id = m.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY sd.skip_date ASC, m.name ASC
    `;

    const result = await query(selectQuery, values);
    
    return result.rows.map(row => {
      const skipDate = SkipDate.fromDbRow(row);
      skipDate.medication_name = row.medication_name;
      return skipDate;
    });
  }

  // Update skip date
  async update(id, skipDateData) {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('Skip date not found');
    }

    // Merge existing data with updates
    const updatedData = { ...existing, ...skipDateData, id };
    const skipDate = new SkipDate(updatedData);
    const validation = skipDate.validate();
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const dbData = skipDate.toDbFormat();
    
    const updateQuery = `
      UPDATE skip_dates SET
        skip_date = $2,
        reason = $3
      WHERE id = $1
      RETURNING *
    `;
    
    const values = [
      id,
      dbData.skip_date,
      dbData.reason
    ];

    try {
      const result = await query(updateQuery, values);
      return SkipDate.fromDbRow(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Skip date already exists for this medication');
      }
      throw error;
    }
  }

  // Delete skip date
  async delete(id) {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('Skip date not found');
    }

    const deleteQuery = 'DELETE FROM skip_dates WHERE id = $1 RETURNING *';
    const result = await query(deleteQuery, [id]);
    
    return result.rows.length > 0;
  }

  // Delete skip date by medication and date
  async deleteByMedicationAndDate(medicineId, date) {
    const deleteQuery = 'DELETE FROM skip_dates WHERE medicine_id = $1 AND skip_date = $2 RETURNING *';
    const result = await query(deleteQuery, [medicineId, date]);
    
    return result.rows.length > 0;
  }

  // Delete all skip dates for a medication
  async deleteByMedicationId(medicineId) {
    const deleteQuery = 'DELETE FROM skip_dates WHERE medicine_id = $1 RETURNING *';
    const result = await query(deleteQuery, [medicineId]);
    
    return result.rows.length;
  }

  // Bulk create skip dates for a medication
  async createBulk(medicineId, skipDatesData) {
    if (!Array.isArray(skipDatesData) || skipDatesData.length === 0) {
      return [];
    }

    return await transaction(async (client) => {
      const createdSkipDates = [];
      
      for (const skipDateData of skipDatesData) {
        const skipDate = new SkipDate({ ...skipDateData, medicine_id: medicineId });
        const validation = skipDate.validate();
        
        if (!validation.isValid) {
          throw new Error(`Validation failed for skip date: ${validation.errors.map(e => e.message).join(', ')}`);
        }

        const dbData = skipDate.toDbFormat();
        
        const insertQuery = `
          INSERT INTO skip_dates (
            medicine_id, skip_date, reason
          ) VALUES ($1, $2, $3)
          ON CONFLICT (medicine_id, skip_date) DO UPDATE SET
            reason = EXCLUDED.reason
          RETURNING *
        `;
        
        const values = [
          dbData.medicine_id,
          dbData.skip_date,
          dbData.reason
        ];

        const result = await client.query(insertQuery, values);
        createdSkipDates.push(SkipDate.fromDbRow(result.rows[0]));
      }
      
      return createdSkipDates;
    });
  }

  // Replace all skip dates for a medication (delete existing and create new)
  async replaceAllForMedication(medicineId, skipDatesData) {
    return await transaction(async (client) => {
      // Delete existing skip dates
      await client.query('DELETE FROM skip_dates WHERE medicine_id = $1', [medicineId]);
      
      // Create new skip dates
      const createdSkipDates = [];
      
      for (const skipDateData of skipDatesData) {
        const skipDate = new SkipDate({ ...skipDateData, medicine_id: medicineId });
        const validation = skipDate.validate();
        
        if (!validation.isValid) {
          throw new Error(`Validation failed for skip date: ${validation.errors.map(e => e.message).join(', ')}`);
        }

        const dbData = skipDate.toDbFormat();
        
        const insertQuery = `
          INSERT INTO skip_dates (
            medicine_id, skip_date, reason
          ) VALUES ($1, $2, $3)
          RETURNING *
        `;
        
        const values = [
          dbData.medicine_id,
          dbData.skip_date,
          dbData.reason
        ];

        const result = await client.query(insertQuery, values);
        createdSkipDates.push(SkipDate.fromDbRow(result.rows[0]));
      }
      
      return createdSkipDates;
    });
  }

  // Get skip date statistics for medications
  async getSkipDateStats(medicineIds) {
    if (!Array.isArray(medicineIds) || medicineIds.length === 0) {
      return [];
    }

    const placeholders = medicineIds.map((_, index) => `$${index + 1}`).join(',');
    
    const selectQuery = `
      SELECT 
        medicine_id,
        COUNT(*) as total_skip_dates,
        COUNT(CASE WHEN skip_date >= CURRENT_DATE THEN 1 END) as future_skip_dates,
        COUNT(CASE WHEN skip_date < CURRENT_DATE THEN 1 END) as past_skip_dates,
        MIN(skip_date) as earliest_skip_date,
        MAX(skip_date) as latest_skip_date
      FROM skip_dates
      WHERE medicine_id IN (${placeholders})
      GROUP BY medicine_id
    `;

    const result = await query(selectQuery, medicineIds);
    
    return result.rows.map(row => ({
      medicine_id: row.medicine_id,
      total_skip_dates: parseInt(row.total_skip_dates),
      future_skip_dates: parseInt(row.future_skip_dates),
      past_skip_dates: parseInt(row.past_skip_dates),
      earliest_skip_date: row.earliest_skip_date,
      latest_skip_date: row.latest_skip_date
    }));
  }

  // Validate skip dates against medication date range
  async validateAgainstMedication(medicineId, skipDates) {
    // Get medication details
    const medicationQuery = `
      SELECT start_date, end_date
      FROM medications
      WHERE id = $1
    `;
    
    const medicationResult = await query(medicationQuery, [medicineId]);
    
    if (medicationResult.rows.length === 0) {
      throw new Error('Medication not found');
    }

    const { start_date, end_date } = medicationResult.rows[0];
    const errors = [];

    for (const skipDateData of skipDates) {
      const skipDate = new SkipDate(skipDateData);
      const validation = skipDate.validateAgainstMedicationDates(start_date, end_date);
      
      if (!validation.isValid) {
        errors.push({
          skip_date: skipDate.skip_date,
          errors: validation.errors
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Clean up past skip dates (optional maintenance function)
  async cleanupPastSkipDates(daysOld = 90) {
    const deleteQuery = `
      DELETE FROM skip_dates 
      WHERE skip_date < CURRENT_DATE - INTERVAL '1 day' * $1
      RETURNING *
    `;
    
    const result = await query(deleteQuery, [daysOld]);
    return result.rows.length;
  }
}

module.exports = SkipDateRepository;