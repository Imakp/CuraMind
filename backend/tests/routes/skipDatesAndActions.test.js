const request = require('supertest');
const app = require('../../server');
const { pool } = require('../../config/database');

describe('Skip Date and Action API Endpoints', () => {
  let testMedicationId;
  let testSkipDateId;

  beforeAll(async () => {
    // Clean up any existing test data
    await pool.query('DELETE FROM skip_dates WHERE medicine_id IN (SELECT id FROM medications WHERE name LIKE $1)', ['Test Action Medication%']);
    await pool.query('DELETE FROM medications WHERE name LIKE $1', ['Test Action Medication%']);

    // Create test medication
    const medicationResult = await pool.query(
      'INSERT INTO medications (name, start_date, end_date, sheet_size, total_tablets) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      ['Test Action Medication', '2024-01-01', '2024-12-31', 10, 100]
    );
    testMedicationId = medicationResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM skip_dates WHERE medicine_id = $1', [testMedicationId]);
    await pool.query('DELETE FROM medications WHERE id = $1', [testMedicationId]);
  });

  describe('Skip Date Endpoints', () => {
    describe('POST /api/medications/:medicationId/skip-dates', () => {
      it('should create a new skip date with valid data', async () => {
        const skipDateData = {
          skip_date: '2024-06-15',
          reason: 'Vacation'
        };

        const response = await request(app)
          .post(`/api/medications/${testMedicationId}/skip-dates`)
          .send(skipDateData)
          .expect(201);

        expect(response.body.data).toBeDefined();
        expect(response.body.data.skip_date).toBe(skipDateData.skip_date);
        expect(response.body.data.reason).toBe(skipDateData.reason);
        expect(response.body.data.medicine_id).toBe(testMedicationId);
        expect(response.body.message).toBe('Skip date created successfully');

        testSkipDateId = response.body.data.id;
      });

      it('should create skip date with minimal data', async () => {
        const skipDateData = {
          skip_date: '2024-07-15'
        };

        const response = await request(app)
          .post(`/api/medications/${testMedicationId}/skip-dates`)
          .send(skipDateData)
          .expect(201);

        expect(response.body.data.skip_date).toBe(skipDateData.skip_date);
        expect(response.body.data.reason).toBeNull();

        // Clean up
        await pool.query('DELETE FROM skip_dates WHERE id = $1', [response.body.data.id]);
      });

      it('should return 400 for missing skip_date', async () => {
        const response = await request(app)
          .post(`/api/medications/${testMedicationId}/skip-dates`)
          .send({
            reason: 'No date provided'
          })
          .expect(400);

        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.error.details.some(d => d.field === 'skip_date')).toBe(true);
      });

      it('should return 400 for invalid date format', async () => {
        const response = await request(app)
          .post(`/api/medications/${testMedicationId}/skip-dates`)
          .send({
            skip_date: 'invalid-date'
          })
          .expect(400);

        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should return 400 for skip date before medication start', async () => {
        const response = await request(app)
          .post(`/api/medications/${testMedicationId}/skip-dates`)
          .send({
            skip_date: '2023-12-31' // Before 2024-01-01 start date
          })
          .expect(400);

        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.error.message).toContain('before medication start date');
      });

      it('should return 400 for skip date after medication end', async () => {
        const response = await request(app)
          .post(`/api/medications/${testMedicationId}/skip-dates`)
          .send({
            skip_date: '2025-01-01' // After 2024-12-31 end date
          })
          .expect(400);

        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.error.message).toContain('after medication end date');
      });

      it('should return 409 for duplicate skip date', async () => {
        const response = await request(app)
          .post(`/api/medications/${testMedicationId}/skip-dates`)
          .send({
            skip_date: '2024-06-15' // Same as first test
          })
          .expect(409);

        expect(response.body.error.code).toBe('CONFLICT');
      });

      it('should return 404 for non-existent medication', async () => {
        const response = await request(app)
          .post('/api/medications/99999/skip-dates')
          .send({
            skip_date: '2024-06-15'
          })
          .expect(404);

        expect(response.body.error.code).toBe('NOT_FOUND');
      });
    });

    describe('GET /api/medications/:medicationId/skip-dates', () => {
      it('should return all skip dates for a medication', async () => {
        const response = await request(app)
          .get(`/api/medications/${testMedicationId}/skip-dates`)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.count).toBeDefined();
        expect(response.body.medication_id).toBe(testMedicationId);
        expect(response.body.data.length).toBeGreaterThan(0);
      });

      it('should return 404 for non-existent medication', async () => {
        const response = await request(app)
          .get('/api/medications/99999/skip-dates')
          .expect(404);

        expect(response.body.error.code).toBe('NOT_FOUND');
      });
    });

    describe('DELETE /api/medications/:medicationId/skip-dates/:skipDateId', () => {
      it('should delete skip date', async () => {
        // Create a skip date to delete
        const skipDateResult = await pool.query(
          'INSERT INTO skip_dates (medicine_id, skip_date, reason) VALUES ($1, $2, $3) RETURNING id',
          [testMedicationId, '2024-08-15', 'To be deleted']
        );
        const skipDateToDeleteId = skipDateResult.rows[0].id;

        const response = await request(app)
          .delete(`/api/medications/${testMedicationId}/skip-dates/${skipDateToDeleteId}`)
          .expect(200);

        expect(response.body.message).toBe('Skip date deleted successfully');

        // Verify skip date is deleted
        const checkResult = await pool.query('SELECT * FROM skip_dates WHERE id = $1', [skipDateToDeleteId]);
        expect(checkResult.rows.length).toBe(0);
      });

      it('should return 404 for non-existent skip date', async () => {
        const response = await request(app)
          .delete(`/api/medications/${testMedicationId}/skip-dates/99999`)
          .expect(404);

        expect(response.body.error.code).toBe('NOT_FOUND');
      });

      it('should return 400 for invalid skip date ID', async () => {
        const response = await request(app)
          .delete(`/api/medications/${testMedicationId}/skip-dates/invalid-id`)
          .expect(400);

        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });
  });

  describe('Action Endpoints', () => {
    describe('POST /api/medications/:id/mark-dose-given', () => {
      it('should mark dose as given with valid data', async () => {
        const doseData = {
          dose_amount: 1.5,
          timestamp: '2024-06-15T08:00:00Z'
        };

        const response = await request(app)
          .post(`/api/medications/${testMedicationId}/mark-dose-given`)
          .send(doseData)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(response.body.message).toBe('Dose marked as given successfully');
      });

      it('should mark dose as given with current timestamp', async () => {
        const doseData = {
          dose_amount: 2.0
          // No timestamp provided, should use current time
        };

        const response = await request(app)
          .post(`/api/medications/${testMedicationId}/mark-dose-given`)
          .send(doseData)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(response.body.message).toBe('Dose marked as given successfully');
      });

      it('should return 400 for missing dose_amount', async () => {
        const response = await request(app)
          .post(`/api/medications/${testMedicationId}/mark-dose-given`)
          .send({
            timestamp: '2024-06-15T08:00:00Z'
          })
          .expect(400);

        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.error.details.some(d => d.field === 'dose_amount')).toBe(true);
      });

      it('should return 400 for invalid dose_amount', async () => {
        const response = await request(app)
          .post(`/api/medications/${testMedicationId}/mark-dose-given`)
          .send({
            dose_amount: -1.0
          })
          .expect(400);

        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should return 404 for non-existent medication', async () => {
        const response = await request(app)
          .post('/api/medications/99999/mark-dose-given')
          .send({
            dose_amount: 1.0
          })
          .expect(404);

        expect(response.body.error.code).toBe('NOT_FOUND');
      });

      it('should return 400 for invalid medication ID', async () => {
        const response = await request(app)
          .post('/api/medications/invalid-id/mark-dose-given')
          .send({
            dose_amount: 1.0
          })
          .expect(400);

        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('POST /api/medications/:id/update-inventory', () => {
      it('should update inventory with total_tablets', async () => {
        const inventoryData = {
          total_tablets: 150,
          reason: 'Refill'
        };

        const response = await request(app)
          .post(`/api/medications/${testMedicationId}/update-inventory`)
          .send(inventoryData)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(response.body.data.total_tablets).toBe(inventoryData.total_tablets);
        expect(response.body.message).toBe('Inventory updated successfully');
      });

      it('should update inventory with sheet_count', async () => {
        const inventoryData = {
          sheet_count: 20 // 20 sheets * 10 tablets = 200 tablets
        };

        const response = await request(app)
          .post(`/api/medications/${testMedicationId}/update-inventory`)
          .send(inventoryData)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(response.body.data.total_tablets).toBe(200);
      });

      it('should update inventory with add_tablets', async () => {
        // First get current inventory
        const currentResponse = await request(app)
          .get(`/api/medications/${testMedicationId}`)
          .expect(200);
        
        const currentTablets = currentResponse.body.data.total_tablets;
        
        const inventoryData = {
          add_tablets: 50
        };

        const response = await request(app)
          .post(`/api/medications/${testMedicationId}/update-inventory`)
          .send(inventoryData)
          .expect(200);

        expect(response.body.data.total_tablets).toBe(currentTablets + 50);
      });

      it('should return 400 for missing inventory data', async () => {
        const response = await request(app)
          .post(`/api/medications/${testMedicationId}/update-inventory`)
          .send({
            reason: 'No inventory data'
          })
          .expect(400);

        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.error.message).toContain('Must provide total_tablets, sheet_count, or add_tablets');
      });

      it('should return 404 for non-existent medication', async () => {
        const response = await request(app)
          .post('/api/medications/99999/update-inventory')
          .send({
            total_tablets: 100
          })
          .expect(404);

        expect(response.body.error.code).toBe('NOT_FOUND');
      });

      it('should return 400 for invalid medication ID', async () => {
        const response = await request(app)
          .post('/api/medications/invalid-id/update-inventory')
          .send({
            total_tablets: 100
          })
          .expect(400);

        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });
  });
});