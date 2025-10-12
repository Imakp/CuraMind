const { query, transaction } = require('../config/database');
const Frequency = require('../models/Frequency');

class FrequencyRepository {
  // Create a new frequency
  async create(frequencyData) {
    const frequency = new Frequency(frequencyData);
    const validation = frequency.validate();
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Check for unique name
    const existingFrequencies = await this.findAll();
    if (!Frequency.validateUniqueName(existingFrequencies, frequency.name)) {
      throw new Error('Frequency name already exists');
    }

    const dbData = frequency.toDbFormat();
    
    const insertQuery = `
      INSERT INTO frequencies (name, description)
      VALUES ($1, $2)
      RETURNING *
    `;
    
    const values = [dbData.name, dbData.description];

    const result = await query(insertQuery, values);
    return Frequency.fromDbRow(result.rows[0]);
  }

  // Find frequency by ID
  async findById(id) {
    const selectQuery = 'SELECT * FROM frequencies WHERE id = $1';
    const result = await query(selectQuery, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return Frequency.fromDbRow(result.rows[0]);
  }

  // Find all frequencies
  async findAll(options = {}) {
    let selectQuery = 'SELECT * FROM frequencies';
    let values = [];

    // Add search functionality
    if (options.search) {
      selectQuery += ` WHERE LOWER(name) LIKE LOWER($1) OR LOWER(description) LIKE LOWER($1)`;
      values.push(`%${options.search}%`);
    }

    // Add ordering
    const sortBy = options.sort_by || 'name';
    const sortDirection = options.sort_direction === 'desc' ? 'DESC' : 'ASC';
    
    if (['name', 'description', 'created_at'].includes(sortBy)) {
      selectQuery += ` ORDER BY ${sortBy} ${sortDirection}`;
    } else {
      selectQuery += ` ORDER BY name ASC`;
    }

    const result = await query(selectQuery, values);
    return result.rows.map(row => Frequency.fromDbRow(row));
  }

  // Find frequency by name
  async findByName(name) {
    const selectQuery = 'SELECT * FROM frequencies WHERE LOWER(name) = LOWER($1)';
    const result = await query(selectQuery, [name.trim()]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return Frequency.fromDbRow(result.rows[0]);
  }

  // Update frequency
  async update(id, frequencyData) {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('Frequency not found');
    }

    // Merge existing data with updates
    const updatedData = { ...existing, ...frequencyData, id };
    const frequency = new Frequency(updatedData);
    const validation = frequency.validate();
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Check for unique name (excluding current frequency)
    const existingFrequencies = await this.findAll();
    if (!Frequency.validateUniqueName(existingFrequencies, frequency.name, id)) {
      throw new Error('Frequency name already exists');
    }

    const dbData = frequency.toDbFormat();
    
    const updateQuery = `
      UPDATE frequencies SET
        name = $2,
        description = $3,
        updated_at = now()
      WHERE id = $1
      RETURNING *
    `;
    
    const values = [id, dbData.name, dbData.description];
    const result = await query(updateQuery, values);
    
    return Frequency.fromDbRow(result.rows[0]);
  }

  // Delete frequency (with referential integrity check)
  async delete(id) {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('Frequency not found');
    }

    // Check if frequency is referenced by medications
    const referencesQuery = `
      SELECT COUNT(*) as medication_count
      FROM medications
      WHERE frequency_id = $1
    `;
    
    const referencesResult = await query(referencesQuery, [id]);
    const { medication_count } = referencesResult.rows[0];
    
    if (parseInt(medication_count) > 0) {
      throw new Error('Cannot delete frequency: it is referenced by existing medications');
    }

    const deleteQuery = 'DELETE FROM frequencies WHERE id = $1 RETURNING *';
    const result = await query(deleteQuery, [id]);
    
    return result.rows.length > 0;
  }

  // Get frequency usage statistics
  async getUsageStats(id) {
    const statsQuery = `
      SELECT 
        f.id,
        f.name,
        COUNT(DISTINCT m.id) as medication_count,
        COUNT(DISTINCT CASE WHEN m.start_date <= CURRENT_DATE AND (m.end_date IS NULL OR m.end_date >= CURRENT_DATE) THEN m.id END) as active_medication_count
      FROM frequencies f
      LEFT JOIN medications m ON f.id = m.frequency_id
      WHERE f.id = $1
      GROUP BY f.id, f.name
    `;

    const result = await query(statsQuery, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return {
      id: result.rows[0].id,
      name: result.rows[0].name,
      medication_count: parseInt(result.rows[0].medication_count),
      active_medication_count: parseInt(result.rows[0].active_medication_count),
      can_be_deleted: parseInt(result.rows[0].medication_count) === 0
    };
  }

  // Get all frequencies with usage statistics
  async findAllWithUsage() {
    const statsQuery = `
      SELECT 
        f.*,
        COUNT(DISTINCT m.id) as medication_count,
        COUNT(DISTINCT CASE WHEN m.start_date <= CURRENT_DATE AND (m.end_date IS NULL OR m.end_date >= CURRENT_DATE) THEN m.id END) as active_medication_count
      FROM frequencies f
      LEFT JOIN medications m ON f.id = m.frequency_id
      GROUP BY f.id, f.name, f.description, f.created_at, f.updated_at
      ORDER BY f.name ASC
    `;

    const result = await query(statsQuery);
    
    return result.rows.map(row => {
      const frequency = Frequency.fromDbRow(row);
      frequency.medication_count = parseInt(row.medication_count);
      frequency.active_medication_count = parseInt(row.active_medication_count);
      frequency.can_be_deleted = frequency.medication_count === 0;
      return frequency;
    });
  }

  // Get frequencies grouped by type
  async findAllGrouped() {
    const frequencies = await this.findAll();
    return Frequency.groupByType(frequencies);
  }

  // Bulk create frequencies (useful for initial setup)
  async createBulk(frequenciesData) {
    if (!Array.isArray(frequenciesData) || frequenciesData.length === 0) {
      return [];
    }

    return await transaction(async (client) => {
      const createdFrequencies = [];
      
      for (const frequencyData of frequenciesData) {
        const frequency = new Frequency(frequencyData);
        const validation = frequency.validate();
        
        if (!validation.isValid) {
          throw new Error(`Validation failed for frequency "${frequency.name}": ${validation.errors.map(e => e.message).join(', ')}`);
        }

        const dbData = frequency.toDbFormat();
        
        const insertQuery = `
          INSERT INTO frequencies (name, description)
          VALUES ($1, $2)
          ON CONFLICT (name) DO UPDATE SET
            description = EXCLUDED.description,
            updated_at = now()
          RETURNING *
        `;
        
        const values = [dbData.name, dbData.description];
        const result = await client.query(insertQuery, values);
        createdFrequencies.push(Frequency.fromDbRow(result.rows[0]));
      }
      
      return createdFrequencies;
    });
  }

  // Search frequencies
  async search(query, options = {}) {
    if (!query || query.trim().length === 0) {
      return await this.findAll(options);
    }

    return await this.findAll({ ...options, search: query });
  }

  // Get frequency count
  async getCount() {
    const countQuery = 'SELECT COUNT(*) as count FROM frequencies';
    const result = await query(countQuery);
    return parseInt(result.rows[0].count);
  }

  // Check if frequency name exists (for validation)
  async nameExists(name, excludeId = null) {
    let checkQuery = 'SELECT COUNT(*) as count FROM frequencies WHERE LOWER(name) = LOWER($1)';
    let values = [name.trim()];

    if (excludeId) {
      checkQuery += ' AND id != $2';
      values.push(excludeId);
    }

    const result = await query(checkQuery, values);
    return parseInt(result.rows[0].count) > 0;
  }

  // Get most used frequencies
  async getMostUsed(limit = 10) {
    const mostUsedQuery = `
      SELECT 
        f.*,
        COUNT(DISTINCT m.id) as usage_count
      FROM frequencies f
      LEFT JOIN medications m ON f.id = m.frequency_id
      GROUP BY f.id, f.name, f.description, f.created_at, f.updated_at
      HAVING COUNT(DISTINCT m.id) > 0
      ORDER BY usage_count DESC, f.name ASC
      LIMIT $1
    `;

    const result = await query(mostUsedQuery, [limit]);
    
    return result.rows.map(row => {
      const frequency = Frequency.fromDbRow(row);
      frequency.usage_count = parseInt(row.usage_count);
      return frequency;
    });
  }

  // Get frequencies suitable for specific medication types
  async findByType(type) {
    const allFrequencies = await this.findAll();
    const grouped = Frequency.groupByType(allFrequencies);
    
    return grouped[type] || [];
  }

  // Initialize with common frequencies if table is empty
  async initializeCommonFrequencies() {
    const count = await this.getCount();
    
    if (count === 0) {
      const commonFrequencies = Frequency.getCommonFrequencies();
      return await this.createBulk(commonFrequencies);
    }
    
    return [];
  }
}

module.exports = FrequencyRepository;