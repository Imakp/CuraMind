const { query, transaction } = require('../config/database');
const Route = require('../models/Route');

class RouteRepository {
  // Create a new route
  async create(routeData) {
    const route = new Route(routeData);
    const validation = route.validate();
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Check for unique name
    const existingRoutes = await this.findAll();
    if (!Route.validateUniqueName(existingRoutes, route.name)) {
      throw new Error('Route name already exists');
    }

    const dbData = route.toDbFormat();
    
    const insertQuery = `
      INSERT INTO routes (name, description)
      VALUES ($1, $2)
      RETURNING *
    `;
    
    const values = [dbData.name, dbData.description];

    const result = await query(insertQuery, values);
    return Route.fromDbRow(result.rows[0]);
  }

  // Find route by ID
  async findById(id) {
    const selectQuery = 'SELECT * FROM routes WHERE id = $1';
    const result = await query(selectQuery, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return Route.fromDbRow(result.rows[0]);
  }

  // Find all routes
  async findAll(options = {}) {
    let selectQuery = 'SELECT * FROM routes';
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
    return result.rows.map(row => Route.fromDbRow(row));
  }

  // Find route by name
  async findByName(name) {
    const selectQuery = 'SELECT * FROM routes WHERE LOWER(name) = LOWER($1)';
    const result = await query(selectQuery, [name.trim()]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return Route.fromDbRow(result.rows[0]);
  }

  // Update route
  async update(id, routeData) {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('Route not found');
    }

    // Merge existing data with updates
    const updatedData = { ...existing, ...routeData, id };
    const route = new Route(updatedData);
    const validation = route.validate();
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Check for unique name (excluding current route)
    const existingRoutes = await this.findAll();
    if (!Route.validateUniqueName(existingRoutes, route.name, id)) {
      throw new Error('Route name already exists');
    }

    const dbData = route.toDbFormat();
    
    const updateQuery = `
      UPDATE routes SET
        name = $2,
        description = $3,
        updated_at = now()
      WHERE id = $1
      RETURNING *
    `;
    
    const values = [id, dbData.name, dbData.description];
    const result = await query(updateQuery, values);
    
    return Route.fromDbRow(result.rows[0]);
  }

  // Delete route (with referential integrity check)
  async delete(id) {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('Route not found');
    }

    // Check if route is referenced by medications
    const referencesQuery = `
      SELECT COUNT(*) as medication_count,
             COUNT(CASE WHEN md.route_override = $1 THEN 1 END) as dose_count
      FROM medications m
      LEFT JOIN medicine_doses md ON m.id = md.medicine_id
      WHERE m.route_id = $1 OR md.route_override = $1
    `;
    
    const referencesResult = await query(referencesQuery, [id]);
    const { medication_count, dose_count } = referencesResult.rows[0];
    
    if (parseInt(medication_count) > 0 || parseInt(dose_count) > 0) {
      throw new Error('Cannot delete route: it is referenced by existing medications or doses');
    }

    const deleteQuery = 'DELETE FROM routes WHERE id = $1 RETURNING *';
    const result = await query(deleteQuery, [id]);
    
    return result.rows.length > 0;
  }

  // Get route usage statistics
  async getUsageStats(id) {
    const statsQuery = `
      SELECT 
        r.id,
        r.name,
        COUNT(DISTINCT m.id) as medication_count,
        COUNT(DISTINCT md.id) as dose_override_count,
        COUNT(DISTINCT CASE WHEN m.start_date <= CURRENT_DATE AND (m.end_date IS NULL OR m.end_date >= CURRENT_DATE) THEN m.id END) as active_medication_count
      FROM routes r
      LEFT JOIN medications m ON r.id = m.route_id
      LEFT JOIN medicine_doses md ON r.id = md.route_override
      WHERE r.id = $1
      GROUP BY r.id, r.name
    `;

    const result = await query(statsQuery, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return {
      id: result.rows[0].id,
      name: result.rows[0].name,
      medication_count: parseInt(result.rows[0].medication_count),
      dose_override_count: parseInt(result.rows[0].dose_override_count),
      active_medication_count: parseInt(result.rows[0].active_medication_count),
      can_be_deleted: parseInt(result.rows[0].medication_count) === 0 && parseInt(result.rows[0].dose_override_count) === 0
    };
  }

  // Get all routes with usage statistics
  async findAllWithUsage() {
    const statsQuery = `
      SELECT 
        r.*,
        COUNT(DISTINCT m.id) as medication_count,
        COUNT(DISTINCT md.id) as dose_override_count,
        COUNT(DISTINCT CASE WHEN m.start_date <= CURRENT_DATE AND (m.end_date IS NULL OR m.end_date >= CURRENT_DATE) THEN m.id END) as active_medication_count
      FROM routes r
      LEFT JOIN medications m ON r.id = m.route_id
      LEFT JOIN medicine_doses md ON r.id = md.route_override
      GROUP BY r.id, r.name, r.description, r.created_at, r.updated_at
      ORDER BY r.name ASC
    `;

    const result = await query(statsQuery);
    
    return result.rows.map(row => {
      const route = Route.fromDbRow(row);
      route.medication_count = parseInt(row.medication_count);
      route.dose_override_count = parseInt(row.dose_override_count);
      route.active_medication_count = parseInt(row.active_medication_count);
      route.can_be_deleted = route.medication_count === 0 && route.dose_override_count === 0;
      return route;
    });
  }

  // Bulk create routes (useful for initial setup)
  async createBulk(routesData) {
    if (!Array.isArray(routesData) || routesData.length === 0) {
      return [];
    }

    return await transaction(async (client) => {
      const createdRoutes = [];
      
      for (const routeData of routesData) {
        const route = new Route(routeData);
        const validation = route.validate();
        
        if (!validation.isValid) {
          throw new Error(`Validation failed for route "${route.name}": ${validation.errors.map(e => e.message).join(', ')}`);
        }

        const dbData = route.toDbFormat();
        
        const insertQuery = `
          INSERT INTO routes (name, description)
          VALUES ($1, $2)
          ON CONFLICT (name) DO UPDATE SET
            description = EXCLUDED.description,
            updated_at = now()
          RETURNING *
        `;
        
        const values = [dbData.name, dbData.description];
        const result = await client.query(insertQuery, values);
        createdRoutes.push(Route.fromDbRow(result.rows[0]));
      }
      
      return createdRoutes;
    });
  }

  // Search routes
  async search(query, options = {}) {
    if (!query || query.trim().length === 0) {
      return await this.findAll(options);
    }

    return await this.findAll({ ...options, search: query });
  }

  // Get route count
  async getCount() {
    const countQuery = 'SELECT COUNT(*) as count FROM routes';
    const result = await query(countQuery);
    return parseInt(result.rows[0].count);
  }

  // Check if route name exists (for validation)
  async nameExists(name, excludeId = null) {
    let checkQuery = 'SELECT COUNT(*) as count FROM routes WHERE LOWER(name) = LOWER($1)';
    let values = [name.trim()];

    if (excludeId) {
      checkQuery += ' AND id != $2';
      values.push(excludeId);
    }

    const result = await query(checkQuery, values);
    return parseInt(result.rows[0].count) > 0;
  }

  // Get most used routes
  async getMostUsed(limit = 10) {
    const mostUsedQuery = `
      SELECT 
        r.*,
        COUNT(DISTINCT m.id) + COUNT(DISTINCT md.id) as usage_count
      FROM routes r
      LEFT JOIN medications m ON r.id = m.route_id
      LEFT JOIN medicine_doses md ON r.id = md.route_override
      GROUP BY r.id, r.name, r.description, r.created_at, r.updated_at
      HAVING COUNT(DISTINCT m.id) + COUNT(DISTINCT md.id) > 0
      ORDER BY usage_count DESC, r.name ASC
      LIMIT $1
    `;

    const result = await query(mostUsedQuery, [limit]);
    
    return result.rows.map(row => {
      const route = Route.fromDbRow(row);
      route.usage_count = parseInt(row.usage_count);
      return route;
    });
  }

  // Initialize with common routes if table is empty
  async initializeCommonRoutes() {
    const count = await this.getCount();
    
    if (count === 0) {
      const commonRoutes = Route.getCommonRoutes();
      return await this.createBulk(commonRoutes);
    }
    
    return [];
  }
}

module.exports = RouteRepository;