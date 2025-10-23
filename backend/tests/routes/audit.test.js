const request = require('supertest');
const app = require('../../server');
const { query } = require('../../config/database');

describe('Audit API Routes', () => {
    let testMedicationId;
    let testAuditLogIds = [];

    beforeAll(async () => {
        // Clean up any existing test data first
        await query('DELETE FROM audit_logs WHERE medicine_id IN (SELECT id FROM medications WHERE name = $1)', ['Test Audit Med']);
        await query('DELETE FROM medications WHERE name = $1', ['Test Audit Med']);
        await query('DELETE FROM routes WHERE name = $1', ['Test Route']);
        await query('DELETE FROM frequencies WHERE name = $1', ['Test Frequency']);

        // Create test route and frequency first
        const routeResult = await query(`
      INSERT INTO routes (name, description) 
      VALUES ('Test Route', 'Test route for audit tests')
      ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
      RETURNING id
    `);
        const routeId = routeResult.rows[0].id;

        const frequencyResult = await query(`
      INSERT INTO frequencies (name, description) 
      VALUES ('Test Frequency', 'Test frequency for audit tests')
      ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
      RETURNING id
    `);
        const frequencyId = frequencyResult.rows[0].id;

        // Create test medication
        const medicationResult = await query(`
      INSERT INTO medications (name, strength, route_id, frequency_id, start_date, sheet_size, total_tablets)
      VALUES ('Test Audit Med', '10mg', $1, $2, CURRENT_DATE, 10, 100)
      RETURNING id
    `, [routeId, frequencyId]);
        testMedicationId = medicationResult.rows[0].id;

        // Create test audit logs
        const auditLogs = [
            {
                medicine_id: testMedicationId,
                action: 'CREATED',
                new_values: JSON.stringify({ name: 'Test Audit Med', strength: '10mg' })
            },
            {
                medicine_id: testMedicationId,
                action: 'DOSE_GIVEN',
                new_values: JSON.stringify({ dose_amount: 1.5, time: '10:30' }),
                quantity_change: -1.5
            },
            {
                medicine_id: testMedicationId,
                action: 'INVENTORY_UPDATED',
                old_values: JSON.stringify({ total_tablets: 100 }),
                new_values: JSON.stringify({ total_tablets: 150, reason: 'Refill' }),
                quantity_change: 50
            }
        ];

        for (const log of auditLogs) {
            const result = await query(`
        INSERT INTO audit_logs (medicine_id, action, old_values, new_values, quantity_change)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [log.medicine_id, log.action, log.old_values, log.new_values, log.quantity_change]);
            testAuditLogIds.push(result.rows[0].id);
        }
    });

    afterAll(async () => {
        // Clean up test data
        await query('DELETE FROM audit_logs WHERE medicine_id = $1', [testMedicationId]);
        await query('DELETE FROM medications WHERE id = $1', [testMedicationId]);
    });

    describe('GET /api/audit', () => {
        it('should return all audit logs', async () => {
            const response = await request(app)
                .get('/api/audit')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
        });

        it('should filter audit logs by medication ID', async () => {
            const response = await request(app)
                .get(`/api/audit?medicine_id=${testMedicationId}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBeGreaterThanOrEqual(3);
            response.body.data.forEach(log => {
                expect(log.medicine_id).toBe(testMedicationId);
            });
        });

        it('should filter audit logs by action', async () => {
            const response = await request(app)
                .get('/api/audit?action=DOSE_GIVEN')
                .expect(200);

            expect(response.body.success).toBe(true);
            response.body.data.forEach(log => {
                expect(log.action).toBe('DOSE_GIVEN');
            });
        });

        it('should filter audit logs by date range', async () => {
            const today = new Date().toISOString().split('T')[0];
            const response = await request(app)
                .get(`/api/audit?start_date=${today}&end_date=${today}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            response.body.data.forEach(log => {
                const logDate = new Date(log.created_at).toISOString().split('T')[0];
                expect(logDate).toBe(today);
            });
        });

        it('should filter audit logs by quantity change', async () => {
            const response = await request(app)
                .get('/api/audit?quantity_filter=negative')
                .expect(200);

            expect(response.body.success).toBe(true);
            response.body.data.forEach(log => {
                if (log.quantity_change !== null) {
                    expect(parseFloat(log.quantity_change)).toBeLessThan(0);
                }
            });
        });

        it('should sort audit logs correctly', async () => {
            const response = await request(app)
                .get('/api/audit?sort_by=action&sort_direction=asc')
                .expect(200);

            expect(response.body.success).toBe(true);

            // Check if sorted by action ascending
            for (let i = 1; i < response.body.data.length; i++) {
                expect(response.body.data[i].action >= response.body.data[i - 1].action).toBe(true);
            }
        });

        it('should limit results when limit parameter is provided', async () => {
            const response = await request(app)
                .get('/api/audit?limit=2')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBeLessThanOrEqual(2);
        });
    });

    describe('GET /api/audit/:id', () => {
        it('should return specific audit log by ID', async () => {
            const auditLogId = testAuditLogIds[0];
            const response = await request(app)
                .get(`/api/audit/${auditLogId}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe(auditLogId);
            expect(response.body.data.medicine_id).toBe(testMedicationId);
        });

        it('should return 404 for non-existent audit log', async () => {
            const response = await request(app)
                .get('/api/audit/99999')
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Audit log not found');
        });
    });

    describe('GET /api/audit/medication/:medicineId', () => {
        it('should return audit logs for specific medication', async () => {
            const response = await request(app)
                .get(`/api/audit/medication/${testMedicationId}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBeGreaterThanOrEqual(3);
            response.body.data.forEach(log => {
                expect(log.medicine_id).toBe(testMedicationId);
            });
        });

        it('should limit results for medication audit logs', async () => {
            const response = await request(app)
                .get(`/api/audit/medication/${testMedicationId}?limit=2`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBe(2);
        });
    });

    describe('GET /api/audit/stats/summary', () => {
        it('should return audit statistics', async () => {
            const response = await request(app)
                .get('/api/audit/stats/summary')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('total_logs');
            expect(response.body.data).toHaveProperty('dose_given_count');
            expect(response.body.data).toHaveProperty('inventory_updated_count');
            expect(response.body.data).toHaveProperty('total_quantity_change');
            expect(typeof response.body.data.total_logs).toBe('number');
        });

        it('should return medication-specific statistics', async () => {
            const response = await request(app)
                .get(`/api/audit/stats/summary?medicine_id=${testMedicationId}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.total_logs).toBeGreaterThanOrEqual(3);
            expect(response.body.data.dose_given_count).toBe(1);
            expect(response.body.data.inventory_updated_count).toBe(1);
        });
    });

    describe('GET /api/audit/stats/daily-activity', () => {
        it('should return daily activity summary', async () => {
            const today = new Date().toISOString().split('T')[0];
            const response = await request(app)
                .get(`/api/audit/stats/daily-activity?start_date=${today}&end_date=${today}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);

            if (response.body.data.length > 0) {
                expect(response.body.data[0]).toHaveProperty('activity_date');
                expect(response.body.data[0]).toHaveProperty('total_activities');
                expect(response.body.data[0]).toHaveProperty('doses_given');
                expect(response.body.data[0]).toHaveProperty('inventory_updates');
            }
        });

        it('should require start_date and end_date parameters', async () => {
            const response = await request(app)
                .get('/api/audit/stats/daily-activity')
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('start_date and end_date are required');
        });
    });

    describe('GET /api/audit/compliance/:medicineId', () => {
        it('should return compliance data for medication', async () => {
            const today = new Date().toISOString().split('T')[0];
            const response = await request(app)
                .get(`/api/audit/compliance/${testMedicationId}?start_date=${today}&end_date=${today}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should require start_date and end_date parameters', async () => {
            const response = await request(app)
                .get(`/api/audit/compliance/${testMedicationId}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('start_date and end_date are required');
        });
    });

    describe('GET /api/audit/inventory-timeline/:medicineId', () => {
        it('should return inventory timeline for medication', async () => {
            const response = await request(app)
                .get(`/api/audit/inventory-timeline/${testMedicationId}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);

            // Should include inventory-related logs
            response.body.data.forEach(log => {
                expect(['INVENTORY_UPDATED', 'DOSE_GIVEN', 'CREATED']).toContain(log.action);
            });
        });

        it('should limit timeline results', async () => {
            const response = await request(app)
                .get(`/api/audit/inventory-timeline/${testMedicationId}?limit=2`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBeLessThanOrEqual(2);
        });
    });

    describe('GET /api/audit/export/logs', () => {
        it('should export audit logs as JSON', async () => {
            const response = await request(app)
                .get('/api/audit/export/logs?format=json')
                .expect(200);

            expect(response.headers['content-type']).toContain('application/json');
            expect(response.headers['content-disposition']).toContain('attachment');
            expect(response.body).toHaveProperty('export_date');
            expect(response.body).toHaveProperty('logs');
            expect(Array.isArray(response.body.logs)).toBe(true);
        });

        it('should export audit logs as CSV', async () => {
            const response = await request(app)
                .get('/api/audit/export/logs?format=csv')
                .expect(200);

            expect(response.headers['content-type']).toContain('text/csv');
            expect(response.headers['content-disposition']).toContain('attachment');
            expect(typeof response.text).toBe('string');
            expect(response.text).toContain('ID,Medication ID,Medication Name');
        });

        it('should filter exported logs by medication', async () => {
            const response = await request(app)
                .get(`/api/audit/export/logs?medicine_id=${testMedicationId}&format=json`)
                .expect(200);

            expect(response.body.logs.length).toBeGreaterThanOrEqual(3);
            response.body.logs.forEach(log => {
                expect(log.medicine_id).toBe(testMedicationId);
            });
        });
    });

    describe('GET /api/audit/recent/:limit?', () => {
        it('should return recent audit logs with default limit', async () => {
            const response = await request(app)
                .get('/api/audit/recent')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBeLessThanOrEqual(50);
        });

        it('should return recent audit logs with custom limit', async () => {
            const response = await request(app)
                .get('/api/audit/recent/10')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBeLessThanOrEqual(10);
        });

        it('should filter recent logs by medication', async () => {
            const response = await request(app)
                .get(`/api/audit/recent/10?medicine_id=${testMedicationId}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            response.body.data.forEach(log => {
                expect(log.medicine_id).toBe(testMedicationId);
            });
        });
    });

    describe('Error handling', () => {
        it('should handle invalid medication ID gracefully', async () => {
            const response = await request(app)
                .get('/api/audit/medication/invalid')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual([]);
        });

        it('should handle invalid audit log ID gracefully', async () => {
            const response = await request(app)
                .get('/api/audit/invalid')
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Failed to fetch audit log');
        });
    });
});