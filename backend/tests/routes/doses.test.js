const request = require('supertest');
const app = require('../../server');
const { pool } = require('../../config/database');

describe('Dose API Endpoints', () => {
  let testMedicationId;
  let testDoseId;
  let testRouteId;

  beforeAll(async () => {
    // Clean up any existing test data
    await pool.query('DELETE FROM medicine_doses WHERE medicine_id IN (SELECT id FROM medications WHERE name LIKE $1)', ['Test Dose Medication%']);
    await pool.query('DELETE FROM medications WHERE name LIKE $1', ['Test Dose Medication%']);
    await pool.query('DELETE FROM routes WHERE name LIKE $1', ['Test Dose Route%']);

    // Create test route
    const routeResult = await pool.query(
      'INSERT INTO routes (name, description) VALUES ($1, $2) RETURNING id',
      ['Test Dose Route', 'Test route for dose API testing']
    );
    testRouteId = routeResult.rows[0].id;

    // Create test medication
    const medicationResult = await pool.query(
      'INSERT INTO medications (name, start_date, sheet_size, total_tablets) VALUES ($1, $2, $3, $4) RETURNING id',
      ['Test Dose Medication', '2024-01-01', 10, 100]
    );
    testMedicationId = medicationResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM medicine_doses WHERE medicine_id = $1', [testMedicationId]);
    await pool.query('DELETE FROM medications WHERE id = $1', [testMedicationId]);
    await pool.query('DELETE FROM routes WHERE id = $1', [testRouteId]);
  });

  describe('POST /api/medications/:medicationId/doses', () => {
    it('should create a new dose with valid data', async () => {
      const doseData = {
        dose_amount: 1.5,
        time_of_day: '08:00',
        route_override: testRouteId,
        instructions: 'Take with food'
      };

      const response = await request(app)
        .post(`/api/medications/${testMedicationId}/doses`)
        .send(doseData)
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.dose_amount).toBe(doseData.dose_amount);
      expect(response.body.data.time_of_day).toBe(doseData.time_of_day);
      expect(response.body.data.route_override).toBe(doseData.route_override);
      expect(response.body.data.instructions).toBe(doseData.instructions);
      expect(response.body.data.medicine_id).toBe(testMedicationId);
      expect(response.body.message).toBe('Dose created successfully');

      testDoseId = response.body.data.id;
    });

    it('should create dose with minimal required data', async () => {
      const doseData = {
        dose_amount: 2.0,
        time_of_day: '20:00'
      };

      const response = await request(app)
        .post(`/api/medications/${testMedicationId}/doses`)
        .send(doseData)
        .expect(201);

      expect(response.body.data.dose_amount).toBe(doseData.dose_amount);
      expect(response.body.data.time_of_day).toBe(doseData.time_of_day);
      expect(response.body.data.route_override).toBeNull();
      expect(response.body.data.instructions).toBeNull();

      // Clean up
      await pool.query('DELETE FROM medicine_doses WHERE id = $1', [response.body.data.id]);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post(`/api/medications/${testMedicationId}/doses`)
        .send({
          time_of_day: '08:00'
          // Missing dose_amount
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.some(d => d.field === 'dose_amount')).toBe(true);
    });

    it('should return 400 for invalid time format', async () => {
      const response = await request(app)
        .post(`/api/medications/${testMedicationId}/doses`)
        .send({
          dose_amount: 1.0,
          time_of_day: '25:00' // Invalid time
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.some(d => d.field === 'time_of_day')).toBe(true);
    });

    it('should return 400 for invalid dose amount', async () => {
      const response = await request(app)
        .post(`/api/medications/${testMedicationId}/doses`)
        .send({
          dose_amount: -1.0, // Invalid negative amount
          time_of_day: '08:00'
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.some(d => d.field === 'dose_amount')).toBe(true);
    });

    it('should return 404 for non-existent medication', async () => {
      const response = await request(app)
        .post('/api/medications/99999/doses')
        .send({
          dose_amount: 1.0,
          time_of_day: '08:00'
        })
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid medication ID', async () => {
      const response = await request(app)
        .post('/api/medications/invalid-id/doses')
        .send({
          dose_amount: 1.0,
          time_of_day: '08:00'
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/medications/:medicationId/doses', () => {
    it('should return all doses for a medication', async () => {
      const response = await request(app)
        .get(`/api/medications/${testMedicationId}/doses`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeDefined();
      expect(response.body.medication_id).toBe(testMedicationId);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent medication', async () => {
      const response = await request(app)
        .get('/api/medications/99999/doses')
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/medications/:medicationId/doses/:doseId', () => {
    it('should return specific dose', async () => {
      const response = await request(app)
        .get(`/api/medications/${testMedicationId}/doses/${testDoseId}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testDoseId);
      expect(response.body.data.medicine_id).toBe(testMedicationId);
    });

    it('should return 404 for non-existent dose', async () => {
      const response = await request(app)
        .get(`/api/medications/${testMedicationId}/doses/99999`)
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 404 for dose from different medication', async () => {
      // Create another medication and dose
      const otherMedResult = await pool.query(
        'INSERT INTO medications (name, start_date) VALUES ($1, $2) RETURNING id',
        ['Other Medication', '2024-01-01']
      );
      const otherMedId = otherMedResult.rows[0].id;

      const otherDoseResult = await pool.query(
        'INSERT INTO medicine_doses (medicine_id, dose_amount, time_of_day) VALUES ($1, $2, $3) RETURNING id',
        [otherMedId, 1.0, '12:00']
      );
      const otherDoseId = otherDoseResult.rows[0].id;

      const response = await request(app)
        .get(`/api/medications/${testMedicationId}/doses/${otherDoseId}`)
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');

      // Clean up
      await pool.query('DELETE FROM medicine_doses WHERE id = $1', [otherDoseId]);
      await pool.query('DELETE FROM medications WHERE id = $1', [otherMedId]);
    });

    it('should return 400 for invalid dose ID', async () => {
      const response = await request(app)
        .get(`/api/medications/${testMedicationId}/doses/invalid-id`)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/medications/:medicationId/doses/:doseId', () => {
    it('should update dose with valid data', async () => {
      const updateData = {
        dose_amount: 2.5,
        time_of_day: '09:00',
        route_override: testRouteId,
        instructions: 'Take with water'
      };

      const response = await request(app)
        .put(`/api/medications/${testMedicationId}/doses/${testDoseId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.dose_amount).toBe(updateData.dose_amount);
      expect(response.body.data.time_of_day).toBe(updateData.time_of_day);
      expect(response.body.data.route_override).toBe(updateData.route_override);
      expect(response.body.data.instructions).toBe(updateData.instructions);
      expect(response.body.message).toBe('Dose updated successfully');
    });

    it('should return 404 for non-existent dose', async () => {
      const response = await request(app)
        .put(`/api/medications/${testMedicationId}/doses/99999`)
        .send({
          dose_amount: 1.0,
          time_of_day: '08:00'
        })
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .put(`/api/medications/${testMedicationId}/doses/${testDoseId}`)
        .send({
          dose_amount: 0, // Invalid zero amount
          time_of_day: '08:00'
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/medications/:medicationId/doses/:doseId', () => {
    it('should delete dose', async () => {
      // Create a dose to delete
      const doseResult = await pool.query(
        'INSERT INTO medicine_doses (medicine_id, dose_amount, time_of_day) VALUES ($1, $2, $3) RETURNING id',
        [testMedicationId, 1.0, '14:00']
      );
      const doseToDeleteId = doseResult.rows[0].id;

      const response = await request(app)
        .delete(`/api/medications/${testMedicationId}/doses/${doseToDeleteId}`)
        .expect(200);

      expect(response.body.message).toBe('Dose deleted successfully');

      // Verify dose is deleted
      const checkResult = await pool.query('SELECT * FROM medicine_doses WHERE id = $1', [doseToDeleteId]);
      expect(checkResult.rows.length).toBe(0);
    });

    it('should return 404 for non-existent dose', async () => {
      const response = await request(app)
        .delete(`/api/medications/${testMedicationId}/doses/99999`)
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid dose ID', async () => {
      const response = await request(app)
        .delete(`/api/medications/${testMedicationId}/doses/invalid-id`)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});