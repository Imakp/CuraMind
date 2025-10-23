const request = require('supertest');
const app = require('../../server');
const { pool } = require('../../config/database');

describe('Settings and Notifications API Endpoints', () => {
  let testRouteId;
  let testFrequencyId;
  let testNotificationId;
  let testMedicationId;

  beforeAll(async () => {
    // Clean up any existing test data in correct order (child tables first)
    await pool.query('DELETE FROM audit_logs WHERE medicine_id IN (SELECT id FROM medications WHERE name LIKE $1)', ['Test Settings Medication%']);
    await pool.query('DELETE FROM notifications WHERE medicine_id IN (SELECT id FROM medications WHERE name LIKE $1)', ['Test Settings Medication%']);
    await pool.query('DELETE FROM medications WHERE name LIKE $1', ['Test Settings Medication%']);
    await pool.query('DELETE FROM routes WHERE name LIKE $1', ['Test Settings Route%']);
    await pool.query('DELETE FROM frequencies WHERE name LIKE $1', ['Test Settings Frequency%']);

    // Create test medication for notifications
    const medicationResult = await pool.query(
      'INSERT INTO medications (name, start_date) VALUES ($1, $2) RETURNING id',
      ['Test Settings Medication', '2024-01-01']
    );
    testMedicationId = medicationResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM notifications WHERE medicine_id = $1', [testMedicationId]);
    await pool.query('DELETE FROM medications WHERE id = $1', [testMedicationId]);
    if (testRouteId) {
      await pool.query('DELETE FROM routes WHERE id = $1', [testRouteId]);
    }
    if (testFrequencyId) {
      await pool.query('DELETE FROM frequencies WHERE id = $1', [testFrequencyId]);
    }
  });

  describe('Routes Endpoints', () => {
    describe('POST /api/settings/routes', () => {
      it('should create a new route with valid data', async () => {
        const routeData = {
          name: 'Test Settings Route',
          description: 'Test route for settings API testing'
        };

        const response = await request(app)
          .post('/api/settings/routes')
          .send(routeData)
          .expect(201);

        expect(response.body.data).toBeDefined();
        expect(response.body.data.name).toBe(routeData.name);
        expect(response.body.data.description).toBe(routeData.description);
        expect(response.body.message).toBe('Route created successfully');

        testRouteId = response.body.data.id;
      });

      it('should create route with minimal data', async () => {
        const routeData = {
          name: 'Test Minimal Route'
        };

        const response = await request(app)
          .post('/api/settings/routes')
          .send(routeData)
          .expect(201);

        expect(response.body.data.name).toBe(routeData.name);
        expect(response.body.data.description).toBeNull();

        // Clean up
        await pool.query('DELETE FROM routes WHERE id = $1', [response.body.data.id]);
      });

      it('should return 400 for missing name', async () => {
        const response = await request(app)
          .post('/api/settings/routes')
          .send({
            description: 'Route without name'
          })
          .expect(400);

        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.error.details.some(d => d.field === 'name')).toBe(true);
      });

      it('should return 409 for duplicate name', async () => {
        const response = await request(app)
          .post('/api/settings/routes')
          .send({
            name: 'Test Settings Route' // Same as first test
          })
          .expect(409);

        expect(response.body.error.code).toBe('CONFLICT');
      });
    });

    describe('GET /api/settings/routes', () => {
      it('should return all routes', async () => {
        const response = await request(app)
          .get('/api/settings/routes')
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.count).toBeDefined();
        expect(response.body.data.length).toBeGreaterThan(0);
      });
    });

    describe('GET /api/settings/routes/:id', () => {
      it('should return specific route', async () => {
        const response = await request(app)
          .get(`/api/settings/routes/${testRouteId}`)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(response.body.data.id).toBe(testRouteId);
      });

      it('should return 404 for non-existent route', async () => {
        const response = await request(app)
          .get('/api/settings/routes/99999')
          .expect(404);

        expect(response.body.error.code).toBe('NOT_FOUND');
      });
    });

    describe('PUT /api/settings/routes/:id', () => {
      it('should update route with valid data', async () => {
        const updateData = {
          name: 'Test Settings Route Updated',
          description: 'Updated description'
        };

        const response = await request(app)
          .put(`/api/settings/routes/${testRouteId}`)
          .send(updateData)
          .expect(200);

        expect(response.body.data.name).toBe(updateData.name);
        expect(response.body.data.description).toBe(updateData.description);
        expect(response.body.message).toBe('Route updated successfully');
      });

      it('should return 404 for non-existent route', async () => {
        const response = await request(app)
          .put('/api/settings/routes/99999')
          .send({
            name: 'Non-existent route'
          })
          .expect(404);

        expect(response.body.error.code).toBe('NOT_FOUND');
      });
    });

    describe('DELETE /api/settings/routes/:id', () => {
      it('should return 409 when trying to delete referenced route', async () => {
        // Create a medication that references the route
        const medicationResult = await pool.query(
          'INSERT INTO medications (name, start_date, route_id) VALUES ($1, $2, $3) RETURNING id',
          ['Medication with Route', '2024-01-01', testRouteId]
        );
        const medicationId = medicationResult.rows[0].id;

        const response = await request(app)
          .delete(`/api/settings/routes/${testRouteId}`)
          .expect(409);

        expect(response.body.error.code).toBe('CONFLICT');
        expect(response.body.error.message).toContain('referenced by medications');

        // Clean up
        await pool.query('DELETE FROM medications WHERE id = $1', [medicationId]);
      });

      it('should delete unreferenced route', async () => {
        // Create a route to delete
        const routeResult = await pool.query(
          'INSERT INTO routes (name, description) VALUES ($1, $2) RETURNING id',
          ['Route to Delete', 'This route will be deleted']
        );
        const routeToDeleteId = routeResult.rows[0].id;

        const response = await request(app)
          .delete(`/api/settings/routes/${routeToDeleteId}`)
          .expect(200);

        expect(response.body.message).toBe('Route deleted successfully');
      });

      it('should return 404 for non-existent route', async () => {
        const response = await request(app)
          .delete('/api/settings/routes/99999')
          .expect(404);

        expect(response.body.error.code).toBe('NOT_FOUND');
      });
    });
  });

  describe('Frequencies Endpoints', () => {
    describe('POST /api/settings/frequencies', () => {
      it('should create a new frequency with valid data', async () => {
        const frequencyData = {
          name: 'Test Settings Frequency',
          description: 'Test frequency for settings API testing'
        };

        const response = await request(app)
          .post('/api/settings/frequencies')
          .send(frequencyData)
          .expect(201);

        expect(response.body.data).toBeDefined();
        expect(response.body.data.name).toBe(frequencyData.name);
        expect(response.body.data.description).toBe(frequencyData.description);
        expect(response.body.message).toBe('Frequency created successfully');

        testFrequencyId = response.body.data.id;
      });

      it('should return 400 for missing name', async () => {
        const response = await request(app)
          .post('/api/settings/frequencies')
          .send({
            description: 'Frequency without name'
          })
          .expect(400);

        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.error.details.some(d => d.field === 'name')).toBe(true);
      });
    });

    describe('GET /api/settings/frequencies', () => {
      it('should return all frequencies', async () => {
        const response = await request(app)
          .get('/api/settings/frequencies')
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.count).toBeDefined();
      });
    });

    describe('PUT /api/settings/frequencies/:id', () => {
      it('should update frequency with valid data', async () => {
        const updateData = {
          name: 'Test Settings Frequency Updated',
          description: 'Updated frequency description'
        };

        const response = await request(app)
          .put(`/api/settings/frequencies/${testFrequencyId}`)
          .send(updateData)
          .expect(200);

        expect(response.body.data.name).toBe(updateData.name);
        expect(response.body.data.description).toBe(updateData.description);
      });
    });

    describe('DELETE /api/settings/frequencies/:id', () => {
      it('should delete unreferenced frequency', async () => {
        // Create a frequency to delete
        const frequencyResult = await pool.query(
          'INSERT INTO frequencies (name, description) VALUES ($1, $2) RETURNING id',
          ['Frequency to Delete', 'This frequency will be deleted']
        );
        const frequencyToDeleteId = frequencyResult.rows[0].id;

        const response = await request(app)
          .delete(`/api/settings/frequencies/${frequencyToDeleteId}`)
          .expect(200);

        expect(response.body.message).toBe('Frequency deleted successfully');
      });
    });
  });

  describe('Notifications Endpoints', () => {
    beforeAll(async () => {
      // Create test notification
      const notificationResult = await pool.query(
        'INSERT INTO notifications (medicine_id, type, message, is_read) VALUES ($1, $2, $3, $4) RETURNING id',
        [testMedicationId, 'BUY_SOON', 'Test notification message', false]
      );
      testNotificationId = notificationResult.rows[0].id;
    });

    describe('GET /api/notifications', () => {
      it('should return all notifications', async () => {
        const response = await request(app)
          .get('/api/notifications')
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.count).toBeDefined();
        expect(response.body.filters).toBeDefined();
      });

      it('should filter notifications by read status', async () => {
        const response = await request(app)
          .get('/api/notifications?is_read=false')
          .expect(200);

        expect(response.body.filters.is_read).toBe(false);
      });

      it('should filter notifications by type', async () => {
        const response = await request(app)
          .get('/api/notifications?type=BUY_SOON')
          .expect(200);

        expect(response.body.filters.type).toBe('BUY_SOON');
      });

      it('should limit notifications', async () => {
        const response = await request(app)
          .get('/api/notifications?limit=5')
          .expect(200);

        expect(response.body.filters.limit).toBe(5);
      });

      it('should return 400 for invalid limit', async () => {
        const response = await request(app)
          .get('/api/notifications?limit=invalid')
          .expect(400);

        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('GET /api/notifications/:id', () => {
      it('should return specific notification', async () => {
        const response = await request(app)
          .get(`/api/notifications/${testNotificationId}`)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(response.body.data.id).toBe(testNotificationId);
      });

      it('should return 404 for non-existent notification', async () => {
        const response = await request(app)
          .get('/api/notifications/99999')
          .expect(404);

        expect(response.body.error.code).toBe('NOT_FOUND');
      });
    });

    describe('POST /api/notifications/:id/mark-read', () => {
      it('should mark notification as read', async () => {
        const response = await request(app)
          .post(`/api/notifications/${testNotificationId}/mark-read`)
          .expect(200);

        expect(response.body.data.is_read).toBe(true);
        expect(response.body.message).toBe('Notification marked as read');
      });

      it('should return 404 for non-existent notification', async () => {
        const response = await request(app)
          .post('/api/notifications/99999/mark-read')
          .expect(404);

        expect(response.body.error.code).toBe('NOT_FOUND');
      });
    });

    describe('POST /api/notifications/mark-all-read', () => {
      it('should mark all notifications as read', async () => {
        // Create another unread notification
        await pool.query(
          'INSERT INTO notifications (medicine_id, type, message, is_read) VALUES ($1, $2, $3, $4)',
          [testMedicationId, 'DOSE_DUE', 'Another test notification', false]
        );

        const response = await request(app)
          .post('/api/notifications/mark-all-read')
          .expect(200);

        expect(response.body.count).toBeGreaterThan(0);
        expect(response.body.message).toContain('notifications marked as read');
      });

      it('should mark filtered notifications as read', async () => {
        // Create unread notification
        await pool.query(
          'INSERT INTO notifications (medicine_id, type, message, is_read) VALUES ($1, $2, $3, $4)',
          [testMedicationId, 'BUY_SOON', 'Filtered notification', false]
        );

        const response = await request(app)
          .post('/api/notifications/mark-all-read')
          .send({
            type: 'BUY_SOON'
          })
          .expect(200);

        expect(response.body.count).toBeGreaterThan(0);
      });
    });

    describe('GET /api/notifications/unread-count', () => {
      it('should return unread count', async () => {
        const response = await request(app)
          .get('/api/notifications/unread-count')
          .expect(200);

        expect(response.body.count).toBeDefined();
        expect(typeof response.body.count).toBe('number');
      });
    });

    describe('DELETE /api/notifications/:id', () => {
      it('should delete notification', async () => {
        // Create a notification to delete
        const notificationResult = await pool.query(
          'INSERT INTO notifications (medicine_id, type, message) VALUES ($1, $2, $3) RETURNING id',
          [testMedicationId, 'TEST', 'Notification to delete']
        );
        const notificationToDeleteId = notificationResult.rows[0].id;

        const response = await request(app)
          .delete(`/api/notifications/${notificationToDeleteId}`)
          .expect(200);

        expect(response.body.message).toBe('Notification deleted successfully');
      });

      it('should return 404 for non-existent notification', async () => {
        const response = await request(app)
          .delete('/api/notifications/99999')
          .expect(404);

        expect(response.body.error.code).toBe('NOT_FOUND');
      });
    });
  });
});