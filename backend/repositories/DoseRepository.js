const { query, transaction } = require('../config/database');
const MedicineDose = require('../models/MedicineDose');

class DoseRepository {
  // Create a new dose
  async create(doseData) {
    const dose = new MedicineDose(doseData);
    const validation = dose.validate();
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const dbData = dose.toDbFormat();
    
    const insertQuery = `
      INSERT INTO medicine_doses (
        medicine_id, dose_amount, time_of_day, route_override, instructions
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [
      dbData.medicine_id,
      dbData.dose_amount,
      dbData.time_of_day,
      dbData.route_override,
      dbData.instructions
    ];

    try {
      const result = await query(insertQuery, values);
      return MedicineDose.fromDbRow(result.rows[0]);
    } catch (error) {
      if (error.code === '23503') { // Foreign key violation
        throw new Error('Invalid medicine_id or route_override provided');
      }
      throw error;
    }
  }

  // Find dose by ID
  async findById(id) {
    const selectQuery = `
      SELECT md.*, r.name as route_name
      FROM medicine_doses md
      LEFT JOIN routes r ON md.route_override = r.id
      WHERE md.id = $1
    `;

    const result = await query(selectQuery, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const dose = MedicineDose.fromDbRow(result.rows[0]);
    dose.route_name = result.rows[0].route_name;
    
    return dose;
  }

  // Find all doses for a medication
  async findByMedicationId(medicineId) {
    const selectQuery = `
      SELECT md.*, r.name as route_name
      FROM medicine_doses md
      LEFT JOIN routes r ON md.route_override = r.id
      WHERE md.medicine_id = $1
      ORDER BY md.time_of_day ASC
    `;

    const result = await query(selectQuery, [medicineId]);
    
    return result.rows.map(row => {
      const dose = MedicineDose.fromDbRow(row);
      dose.route_name = row.route_name;
      return dose;
    });
  }

  // Find doses for multiple medications
  async findByMedicationIds(medicineIds) {
    if (!Array.isArray(medicineIds) || medicineIds.length === 0) {
      return [];
    }

    const placeholders = medicineIds.map((_, index) => `$${index + 1}`).join(',');
    
    const selectQuery = `
      SELECT md.*, r.name as route_name
      FROM medicine_doses md
      LEFT JOIN routes r ON md.route_override = r.id
      WHERE md.medicine_id IN (${placeholders})
      ORDER BY md.medicine_id, md.time_of_day ASC
    `;

    const result = await query(selectQuery, medicineIds);
    
    return result.rows.map(row => {
      const dose = MedicineDose.fromDbRow(row);
      dose.route_name = row.route_name;
      return dose;
    });
  }

  // Find doses for schedule generation (by medication and time range)
  async findForSchedule(medicineId, timeFrom = null, timeTo = null) {
    let whereConditions = ['md.medicine_id = $1'];
    let values = [medicineId];
    let paramCount = 1;

    if (timeFrom) {
      paramCount++;
      whereConditions.push(`md.time_of_day >= $${paramCount}`);
      values.push(timeFrom);
    }

    if (timeTo) {
      paramCount++;
      whereConditions.push(`md.time_of_day <= $${paramCount}`);
      values.push(timeTo);
    }

    const selectQuery = `
      SELECT md.*, r.name as route_name
      FROM medicine_doses md
      LEFT JOIN routes r ON md.route_override = r.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY md.time_of_day ASC
    `;

    const result = await query(selectQuery, values);
    
    return result.rows.map(row => {
      const dose = MedicineDose.fromDbRow(row);
      dose.route_name = row.route_name;
      return dose;
    });
  }

  // Get doses grouped by time periods for dashboard display
  async findGroupedByTimePeriod(medicineIds) {
    if (!Array.isArray(medicineIds) || medicineIds.length === 0) {
      return { morning: [], afternoon: [], evening: [], night: [] };
    }

    const doses = await this.findByMedicationIds(medicineIds);
    return MedicineDose.groupByTimePeriod(doses);
  }

  // Calculate total daily dose amount for a medication
  async getTotalDailyDose(medicineId) {
    const selectQuery = `
      SELECT COALESCE(SUM(dose_amount), 0) as total_daily_dose
      FROM medicine_doses
      WHERE medicine_id = $1
    `;

    const result = await query(selectQuery, [medicineId]);
    return parseFloat(result.rows[0].total_daily_dose);
  }

  // Get dose statistics for multiple medications
  async getDoseStats(medicineIds) {
    if (!Array.isArray(medicineIds) || medicineIds.length === 0) {
      return [];
    }

    const placeholders = medicineIds.map((_, index) => `$${index + 1}`).join(',');
    
    const selectQuery = `
      SELECT 
        medicine_id,
        COUNT(*) as dose_count,
        SUM(dose_amount) as total_daily_dose,
        MIN(time_of_day) as first_dose_time,
        MAX(time_of_day) as last_dose_time
      FROM medicine_doses
      WHERE medicine_id IN (${placeholders})
      GROUP BY medicine_id
    `;

    const result = await query(selectQuery, medicineIds);
    
    return result.rows.map(row => ({
      medicine_id: row.medicine_id,
      dose_count: parseInt(row.dose_count),
      total_daily_dose: parseFloat(row.total_daily_dose),
      first_dose_time: row.first_dose_time,
      last_dose_time: row.last_dose_time
    }));
  }

  // Update dose
  async update(id, doseData) {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('Dose not found');
    }

    // Merge existing data with updates
    const updatedData = { ...existing, ...doseData, id };
    const dose = new MedicineDose(updatedData);
    const validation = dose.validate();
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const dbData = dose.toDbFormat();
    
    const updateQuery = `
      UPDATE medicine_doses SET
        dose_amount = $2,
        time_of_day = $3,
        route_override = $4,
        instructions = $5,
        updated_at = now()
      WHERE id = $1
      RETURNING *
    `;
    
    const values = [
      id,
      dbData.dose_amount,
      dbData.time_of_day,
      dbData.route_override,
      dbData.instructions
    ];

    try {
      const result = await query(updateQuery, values);
      return MedicineDose.fromDbRow(result.rows[0]);
    } catch (error) {
      if (error.code === '23503') { // Foreign key violation
        throw new Error('Invalid route_override provided');
      }
      throw error;
    }
  }

  // Delete dose
  async delete(id) {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('Dose not found');
    }

    const deleteQuery = 'DELETE FROM medicine_doses WHERE id = $1 RETURNING *';
    const result = await query(deleteQuery, [id]);
    
    return result.rows.length > 0;
  }

  // Delete all doses for a medication
  async deleteByMedicationId(medicineId) {
    const deleteQuery = 'DELETE FROM medicine_doses WHERE medicine_id = $1 RETURNING *';
    const result = await query(deleteQuery, [medicineId]);
    
    return result.rows.length;
  }

  // Bulk create doses for a medication
  async createBulk(medicineId, dosesData) {
    if (!Array.isArray(dosesData) || dosesData.length === 0) {
      return [];
    }

    return await transaction(async (client) => {
      const createdDoses = [];
      
      for (const doseData of dosesData) {
        const dose = new MedicineDose({ ...doseData, medicine_id: medicineId });
        const validation = dose.validate();
        
        if (!validation.isValid) {
          throw new Error(`Validation failed for dose: ${validation.errors.map(e => e.message).join(', ')}`);
        }

        const dbData = dose.toDbFormat();
        
        const insertQuery = `
          INSERT INTO medicine_doses (
            medicine_id, dose_amount, time_of_day, route_override, instructions
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `;
        
        const values = [
          dbData.medicine_id,
          dbData.dose_amount,
          dbData.time_of_day,
          dbData.route_override,
          dbData.instructions
        ];

        const result = await client.query(insertQuery, values);
        createdDoses.push(MedicineDose.fromDbRow(result.rows[0]));
      }
      
      return createdDoses;
    });
  }

  // Replace all doses for a medication (delete existing and create new)
  async replaceAllForMedication(medicineId, dosesData) {
    return await transaction(async (client) => {
      // Delete existing doses
      await client.query('DELETE FROM medicine_doses WHERE medicine_id = $1', [medicineId]);
      
      // Create new doses
      const createdDoses = [];
      
      for (const doseData of dosesData) {
        const dose = new MedicineDose({ ...doseData, medicine_id: medicineId });
        const validation = dose.validate();
        
        if (!validation.isValid) {
          throw new Error(`Validation failed for dose: ${validation.errors.map(e => e.message).join(', ')}`);
        }

        const dbData = dose.toDbFormat();
        
        const insertQuery = `
          INSERT INTO medicine_doses (
            medicine_id, dose_amount, time_of_day, route_override, instructions
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `;
        
        const values = [
          dbData.medicine_id,
          dbData.dose_amount,
          dbData.time_of_day,
          dbData.route_override,
          dbData.instructions
        ];

        const result = await client.query(insertQuery, values);
        createdDoses.push(MedicineDose.fromDbRow(result.rows[0]));
      }
      
      return createdDoses;
    });
  }

  // Find doses that conflict with a new dose time (within tolerance)
  async findConflictingDoses(medicineId, timeOfDay, toleranceMinutes = 15, excludeId = null) {
    const selectQuery = `
      SELECT md.*, r.name as route_name
      FROM medicine_doses md
      LEFT JOIN routes r ON md.route_override = r.id
      WHERE md.medicine_id = $1
        AND ABS(EXTRACT(EPOCH FROM (md.time_of_day::time - $2::time)) / 60) <= $3
        ${excludeId ? 'AND md.id != $4' : ''}
      ORDER BY md.time_of_day ASC
    `;

    const values = [medicineId, timeOfDay, toleranceMinutes];
    if (excludeId) {
      values.push(excludeId);
    }

    const result = await query(selectQuery, values);
    
    return result.rows.map(row => {
      const dose = MedicineDose.fromDbRow(row);
      dose.route_name = row.route_name;
      return dose;
    });
  }
}

module.exports = DoseRepository;