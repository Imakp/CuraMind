const request = require('supertest');
const app = require('../../server');
const { pool } = require('../../config/database');

describe('Medication API Endpoints', () => {
  let testMedicationId;
  let testRouteId;
  let testFrequencyId;

  beforeAll(async () => {
    // Clean up any existing test data
    await pool.query('DELETE FROM medications WHERE name LIKE $1', ['Test Medication%']);
    await pool.query('DELETE FROM routes WHERE name LIKE $1', ['Test Route%']);
    await pool.query('DELETE FROM frequencies WHERE name LIKE $1', ['Test Frequency%']);

    // Create test route and frequency
    const routeResult = await pool.query(
      'INSERT INTO routes (name, description) VALUES ($1, $2) RETURNING id',
      ['Test Route', 'Test route for API testing']
    );
    testRouteId = routeResult.rows[0].id;

    const frequencyResult = await pool.query(
      'INSERT INTO frequencies (name, description) VALUES ($1, $2) RETURNING id',
      ['Test Frequency', 'Test frequency for API testing']
    );
    testFrequencyId = frequencyResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testMedicationId) {
      await pool.query('DELETE FROM medications WHERE id = $1', [testMedicationId]);
    }
    await pool.query('DELETE FROM routes WHERE id = $1', [testRouteId]);
    await pool.query('DELETE FROM frequencies WHERE id = $1', [testFrequencyId]);
  });

  describe('POST /api/medications', () => {
    it('should create a new medication with valid data', async () => {
      const medicationData = {
        name: 'Test Medication 1',
        strength: '500mg',
        route_id: testRouteId,
        frequency_id: testFrequencyId,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        sheet_size: 10,
        total_tablets: 100,
        notes: 'Test medication for API testing'
      };

      const response = await request(app)
        .post('/api/medications')
        .send(medicationData)
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe(medicationData.name);
      expect(response.body.data.strength).toBe(medicationData.strength);
      expect(response.body.data.route_id).toBe(medicationData.route_id);
      expect(response.body.data.frequency_id).toBe(medicationData.frequency_id);
      expect(response.body.data.start_date).toBe(medicationData.start_date);
      expect(response.body.data.end_date).toBe(medicationData.end_date);
      expect(response.body.data.sheet_size).toBe(medicationData.sheet_size);
      expect(response.body.data.total_tablets).toBe(medicationData.total_tablets);
      expect(response.body.data.notes).toBe(medicationData.notes);
      expect(response.body.message).toBe('Medication created successfully');

      testMedicationId = response.body.data.id;
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/medications')
        .send({
          strength: '500mg'
          // Missing name and start_date
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toHaveLength(2);
      expect(response.body.error.details.some(d => d.field === 'name')).toBe(true);
      expect(response.body.error.details.some(d => d.field === 'start_date')).toBe(true);
    });

    it('should return 400 for invalid date format', async () => {
      const response = await request(app)
        .post('/api/medications')
        .send({
          name: 'Test Medication',
          start_date: 'invalid-date'
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.some(d => d.field === 'start_date')).toBe(true);
    });

    it('should return 400 when end_date is before start_date', async () => {
      const response = await request(app)
        .post('/api/medications')
        .send({
          name: 'Test Medication',
          start_date: '2024-12-31',
          end_date: '2024-01-01'
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.some(d => d.field === 'end_date')).toBe(true);
    });

    it('should create medication with minimal required data', async () => {
      const medicationData = {
        name: 'Test Medication Minimal',
        start_date: '2024-01-01'
      };

      const response = await request(app)
        .post('/api/medications')
        .send(medicationData)
        .expect(201);

      expect(response.body.data.name).toBe(medicationData.name);
      expect(response.body.data.start_date).toBe(medicationData.start_date);
      expect(response.body.data.sheet_size).toBe(10); // Default value
      expect(response.body.data.total_tablets).toBe(0); // Default value

      // Clean up
      await pool.query('DELETE FROM medications WHERE id = $1', [response.body.data.id]);
    });
  });

  describe('GET /api/medications', () => {
    it('should return all medications', async () => {
      const response = await request(app)
        .get('/api/medications')
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeDefined();
      expect(response.body.filters).toBeDefined();
    });

    it('should filter medications by active status', async () => {
      const response = await request(app)
        .get('/api/medications?active=true')
        .expect(200);

      expect(response.body.filters.active).toBe(true);
    });

    it('should filter medications by date', async () => {
      const response = await request(app)
        .get('/api/medications?date=2024-06-15')
        .expect(200);

      expect(response.body.filters.date).toBe('2024-06-15');
    });

    it('should return 400 for invalid date format', async () => {
      const response = await request(app)
        .get('/api/medications?date=invalid-date')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should include details when requested', async () => {
      const response = await request(app)
        .get('/api/medications?include_details=true')
        .expect(200);

      if (response.body.data.length > 0) {
        expect(response.body.data[0].doses).toBeDefined();
        expect(response.body.data[0].skip_dates).toBeDefined();
      }
    });

    it('should search medications by name', async () => {
      const response = await request(app)
        .get('/api/medications?search=Test Medication 1')
        .expect(200);

      expect(response.body.filters.search).toBe('Test Medication 1');
    });

    it('should sort medications', async () => {
      const response = await request(app)
        .get('/api/medications?sort_by=name&sort_direction=asc')
        .expect(200);

      expect(response.body.filters.sort_by).toBe('name');
      expect(response.body.filters.sort_direction).toBe('asc');
    });
  });

  describe('GET /api/medications/:id', () => {
    it('should return specific medication with details', async () => {
      const response = await request(app)
        .get(`/api/medications/${testMedicationId}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testMedicationId);
      expect(response.body.data.doses).toBeDefined();
      expect(response.body.data.skip_dates).toBeDefined();
      expect(response.body.data.inventory_stats).toBeDefined();
    });

    it('should return 404 for non-existent medication', async () => {
      const response = await request(app)
        .get('/api/medications/99999')
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/medications/invalid-id')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/medications/:id', () => {
    it('should update medication with valid data', async () => {
      const updateData = {
        name: 'Test Medication 1 Updated',
        strength: '750mg',
        route_id: testRouteId,
        frequency_id: testFrequencyId,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        sheet_size: 20,
        total_tablets: 200,
        notes: 'Updated test medication'
      };

      const response = await request(app)
        .put(`/api/medications/${testMedicationId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.strength).toBe(updateData.strength);
      expect(response.body.data.sheet_size).toBe(updateData.sheet_size);
      expect(response.body.data.total_tablets).toBe(updateData.total_tablets);
      expect(response.body.message).toBe('Medication updated successfully');
    });

    it('should return 404 for non-existent medication', async () => {
      const response = await request(app)
        .put('/api/medications/99999')
        .send({
          name: 'Test',
          start_date: '2024-01-01'
        })
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .put(`/api/medications/${testMedicationId}`)
        .send({
          name: '', // Invalid empty name
          start_date: '2024-01-01'
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/medications/:id', () => {
    it('should delete medication', async () => {
      // Create a medication to delete
      const medicationData = {
        name: 'Test Medication To Delete',
        start_date: '2020-01-01', // Past date to ensure hard delete
        end_date: '2020-12-31'
      };

      const createResponse = await request(app)
        .post('/api/medications')
        .send(medicationData)
        .expect(201);

      const medicationId = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/medications/${medicationId}`)
        .expect(200);

      expect(response.body.message).toContain('deleted successfully');
    });

    it('should soft delete active medication', async () => {
      // Create an active medication
      const medicationData = {
        name: 'Test Active Medication To Delete',
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };

      const createResponse = await request(app)
        .post('/api/medications')
        .send(medicationData)
        .expect(201);

      const medicationId = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/medications/${medicationId}`)
        .expect(200);

      expect(response.body.soft_delete).toBe(true);
      expect(response.body.message).toContain('deactivated');

      // Clean up
      await pool.query('DELETE FROM medications WHERE id = $1', [medicationId]);
    });

    it('should return 404 for non-existent medication', async () => {
      const response = await request(app)
        .delete('/api/medications/99999')
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .delete('/api/medications/invalid-id')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});