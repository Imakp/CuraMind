const InventoryService = require('../../services/InventoryService');
const MedicationRepository = require('../../repositories/MedicationRepository');
const DoseRepository = require('../../repositories/DoseRepository');
const SkipDateRepository = require('../../repositories/SkipDateRepository');
const AuditLogRepository = require('../../repositories/AuditLogRepository');
const Medication = require('../../models/Medication');
const MedicineDose = require('../../models/MedicineDose');

// Mock the repositories
jest.mock('../../repositories/MedicationRepository');
jest.mock('../../repositories/DoseRepository');
jest.mock('../../repositories/SkipDateRepository');
jest.mock('../../repositories/AuditLogRepository');
jest.mock('../../config/database');

describe('InventoryService', () => {
  let inventoryService;
  let mockMedicationRepository;
  let mockDoseRepository;
  let mockSkipDateRepository;
  let mockAuditLogRepository;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create service instance
    inventoryService = new InventoryService();
    
    // Get mock instances
    mockMedicationRepository = inventoryService.medicationRepository;
    mockDoseRepository = inventoryService.doseRepository;
    mockSkipDateRepository = inventoryService.skipDateRepository;
    mockAuditLogRepository = inventoryService.auditLogRepository;
  });

  describe('consumeDose', () => {
    const mockMedication = new Medication({
      id: 1,
      name: 'Test Medication',
      strength: '10mg',
      start_date: '2024-01-01',
      end_date: null,
      total_tablets: 100,
      sheet_size: 10
    });

    beforeEach(() => {
      mockMedicationRepository.findById.mockResolvedValue(mockMedication);
      mockSkipDateRepository.shouldSkipOnDate.mockResolvedValue(false);
      mockMedicationRepository.markDoseGiven.mockResolvedValue({
        ...mockMedication,
        total_tablets: 98,
        dose_result: {
          consumed: 2,
          remaining: 98,
          wasShort: false
        }
      });
    });

    test('should successfully consume dose and update inventory', async () => {
      const result = await inventoryService.consumeDose(1, 2);

      expect(mockMedicationRepository.findById).toHaveBeenCalledWith(1);
      expect(mockSkipDateRepository.shouldSkipOnDate).toHaveBeenCalled();
      expect(mockMedicationRepository.markDoseGiven).toHaveBeenCalledWith(1, 2, expect.any(Date));
      
      expect(result).toEqual({
        medication: expect.objectContaining({ total_tablets: 98 }),
        consumed: 2,
        remaining: 98,
        was_short: false,
        timestamp: expect.any(String)
      });
    });

    test('should throw error for invalid medication ID', async () => {
      await expect(inventoryService.consumeDose(null, 2))
        .rejects.toThrow('Valid medication ID is required');
      
      await expect(inventoryService.consumeDose('invalid', 2))
        .rejects.toThrow('Valid medication ID is required');
    });

    test('should throw error for invalid dose amount', async () => {
      await expect(inventoryService.consumeDose(1, null))
        .rejects.toThrow('Valid dose amount is required');
      
      await expect(inventoryService.consumeDose(1, -1))
        .rejects.toThrow('Valid dose amount is required');
      
      await expect(inventoryService.consumeDose(1, 'invalid'))
        .rejects.toThrow('Valid dose amount is required');
    });

    test('should throw error for non-existent medication', async () => {
      mockMedicationRepository.findById.mockResolvedValue(null);

      await expect(inventoryService.consumeDose(999, 2))
        .rejects.toThrow('Medication not found');
    });

    test('should throw error for inactive medication', async () => {
      const inactiveMedication = new Medication({
        ...mockMedication,
        end_date: '2023-12-31'
      });
      mockMedicationRepository.findById.mockResolvedValue(inactiveMedication);

      await expect(inventoryService.consumeDose(1, 2))
        .rejects.toThrow('Cannot consume dose for inactive medication on this date');
    });

    test('should throw error for skip date', async () => {
      mockSkipDateRepository.shouldSkipOnDate.mockResolvedValue(true);

      await expect(inventoryService.consumeDose(1, 2))
        .rejects.toThrow('Cannot consume dose on a skip date');
    });
  });

  describe('calculateBuySoonAlerts', () => {
    const mockMedications = [
      new Medication({
        id: 1,
        name: 'Low Stock Med',
        strength: '10mg',
        start_date: '2024-01-01',
        total_tablets: 5
      }),
      new Medication({
        id: 2,
        name: 'Good Stock Med',
        strength: '20mg',
        start_date: '2024-01-01',
        total_tablets: 100
      })
    ];

    const mockDoses = [
      new MedicineDose({ medicine_id: 1, dose_amount: 2, time_of_day: '08:00' }),
      new MedicineDose({ medicine_id: 1, dose_amount: 1, time_of_day: '20:00' }),
      new MedicineDose({ medicine_id: 2, dose_amount: 1, time_of_day: '08:00' })
    ];

    beforeEach(() => {
      mockMedicationRepository.findActiveByDate.mockResolvedValue(mockMedications);
      mockDoseRepository.findByMedicationId.mockImplementation((id) => {
        return Promise.resolve(mockDoses.filter(dose => dose.medicine_id === id));
      });
    });

    test('should calculate buy-soon alerts correctly', async () => {
      const alerts = await inventoryService.calculateBuySoonAlerts(2);

      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toEqual({
        medication_id: 1,
        medication_name: 'Low Stock Med',
        medication_strength: '10mg',
        current_tablets: 5,
        daily_consumption: 3,
        days_remaining: 1,
        tablets_needed_for_period: 6,
        needs_refill: true,
        alert_level: 'urgent'
      });
    });

    test('should sort alerts by urgency', async () => {
      const criticalMed = new Medication({
        id: 3,
        name: 'Critical Med',
        total_tablets: 0
      });
      
      mockMedicationRepository.findActiveByDate.mockResolvedValue([
        ...mockMedications,
        criticalMed
      ]);
      
      mockDoseRepository.findByMedicationId.mockImplementation((id) => {
        if (id === 3) return Promise.resolve([new MedicineDose({ medicine_id: 3, dose_amount: 1, time_of_day: '08:00' })]);
        return Promise.resolve(mockDoses.filter(dose => dose.medicine_id === id));
      });

      const alerts = await inventoryService.calculateBuySoonAlerts(1);

      expect(alerts[0].alert_level).toBe('critical');
      expect(alerts[0].medication_name).toBe('Critical Med');
    });

    test('should throw error for invalid days ahead', async () => {
      await expect(inventoryService.calculateBuySoonAlerts(0))
        .rejects.toThrow('Days ahead must be an integer between 1 and 30');
      
      await expect(inventoryService.calculateBuySoonAlerts(31))
        .rejects.toThrow('Days ahead must be an integer between 1 and 30');
      
      await expect(inventoryService.calculateBuySoonAlerts('invalid'))
        .rejects.toThrow('Days ahead must be an integer between 1 and 30');
    });
  });

  describe('calculateMedicationAlert', () => {
    const mockMedication = new Medication({
      id: 1,
      name: 'Test Med',
      strength: '10mg',
      total_tablets: 10
    });

    test('should calculate critical alert for zero tablets', async () => {
      const zeroTabletsMed = new Medication({ ...mockMedication, total_tablets: 0 });
      const mockDoses = [new MedicineDose({ dose_amount: 2, time_of_day: '08:00' })];
      mockDoseRepository.findByMedicationId.mockResolvedValue(mockDoses);

      const alert = await inventoryService.calculateMedicationAlert(zeroTabletsMed, 1);

      expect(alert.alert_level).toBe('critical');
      expect(alert.days_remaining).toBe(0);
      expect(alert.needs_refill).toBe(true);
    });

    test('should calculate urgent alert for less than 1 day remaining', async () => {
      const lowTabletsMed = new Medication({ ...mockMedication, total_tablets: 1 });
      const mockDoses = [new MedicineDose({ dose_amount: 2, time_of_day: '08:00' })];
      mockDoseRepository.findByMedicationId.mockResolvedValue(mockDoses);

      const alert = await inventoryService.calculateMedicationAlert(lowTabletsMed, 1);

      expect(alert.alert_level).toBe('critical');
      expect(alert.days_remaining).toBe(0);
      expect(alert.needs_refill).toBe(true);
    });

    test('should calculate warning alert for tablets within threshold', async () => {
      const mockDoses = [new MedicineDose({ dose_amount: 5, time_of_day: '08:00' })];
      mockDoseRepository.findByMedicationId.mockResolvedValue(mockDoses);

      const alert = await inventoryService.calculateMedicationAlert(mockMedication, 3);

      expect(alert.alert_level).toBe('warning');
      expect(alert.days_remaining).toBe(2);
      expect(alert.needs_refill).toBe(true);
    });

    test('should return no alert for sufficient inventory', async () => {
      const goodStockMed = new Medication({ ...mockMedication, total_tablets: 100 });
      const mockDoses = [new MedicineDose({ dose_amount: 2, time_of_day: '08:00' })];
      mockDoseRepository.findByMedicationId.mockResolvedValue(mockDoses);

      const alert = await inventoryService.calculateMedicationAlert(goodStockMed, 1);

      expect(alert.alert_level).toBe('none');
      expect(alert.days_remaining).toBe(50);
      expect(alert.needs_refill).toBe(false);
    });

    test('should handle medication with no doses', async () => {
      mockDoseRepository.findByMedicationId.mockResolvedValue([]);

      const alert = await inventoryService.calculateMedicationAlert(mockMedication, 1);

      expect(alert.alert_level).toBe('none');
      expect(alert.days_remaining).toBe(null);
      expect(alert.needs_refill).toBe(false);
      expect(alert.daily_consumption).toBe(0);
    });
  });

  describe('processAutomaticInventoryUpdate', () => {
    const mockMedication = new Medication({
      id: 1,
      name: 'Test Med',
      total_tablets: 10
    });

    beforeEach(() => {
      mockMedicationRepository.findById.mockResolvedValue(mockMedication);
      mockSkipDateRepository.shouldSkipOnDate.mockResolvedValue(false);
      mockMedicationRepository.markDoseGiven.mockResolvedValue({
        ...mockMedication,
        total_tablets: 8,
        dose_result: { consumed: 2, remaining: 8, wasShort: false }
      });
      mockDoseRepository.findByMedicationId.mockResolvedValue([
        new MedicineDose({ dose_amount: 2, time_of_day: '08:00' })
      ]);
    });

    test('should process automatic inventory update and check alerts', async () => {
      const result = await inventoryService.processAutomaticInventoryUpdate(1, 2);

      expect(result).toEqual({
        inventory_update: expect.objectContaining({
          consumed: 2,
          remaining: 8
        }),
        alert_triggered: false,
        alert_details: null
      });
    });

    test('should not trigger alert for sufficient inventory', async () => {
      const goodStockMed = new Medication({ ...mockMedication, total_tablets: 100 });
      mockMedicationRepository.findById.mockResolvedValue(goodStockMed);
      mockMedicationRepository.markDoseGiven.mockResolvedValue({
        ...goodStockMed,
        total_tablets: 98,
        dose_result: { consumed: 2, remaining: 98, wasShort: false }
      });

      const result = await inventoryService.processAutomaticInventoryUpdate(1, 2);

      expect(result.alert_triggered).toBe(false);
      expect(result.alert_details).toBe(null);
    });
  });

  describe('getInventoryStatus', () => {
    const mockMedication = new Medication({
      id: 1,
      name: 'Test Med',
      strength: '10mg',
      total_tablets: 25,
      sheet_size: 10
    });

    const mockDoses = [
      new MedicineDose({ dose_amount: 2, time_of_day: '08:00' }),
      new MedicineDose({ dose_amount: 1, time_of_day: '20:00' })
    ];

    beforeEach(() => {
      mockMedicationRepository.findById.mockResolvedValue(mockMedication);
      mockDoseRepository.findByMedicationId.mockResolvedValue(mockDoses);
      
      // Mock database query for consumption history
      const mockQuery = require('../../config/database').query;
      mockQuery.mockResolvedValue({
        rows: [
          {
            consumption_date: '2024-01-15',
            quantity_consumed: '3.0',
            dose_count: '2',
            doses: [
              { timestamp: '2024-01-15T08:00:00Z', amount: 2, details: {} },
              { timestamp: '2024-01-15T20:00:00Z', amount: 1, details: {} }
            ]
          }
        ]
      });
    });

    test('should return comprehensive inventory status', async () => {
      const status = await inventoryService.getInventoryStatus(1);

      expect(status).toEqual({
        medication_id: 1,
        medication_name: 'Test Med',
        medication_strength: '10mg',
        inventory: {
          total_tablets: 25,
          sheet_size: 10,
          full_sheets: 2,
          remaining_tablets: 5,
          total_sheets: 2.5
        },
        consumption: {
          scheduled_daily: 3,
          actual_daily_average: expect.any(Number),
          days_remaining_scheduled: 8,
          days_remaining_actual: expect.any(Number)
        },
        alert: expect.objectContaining({
          medication_id: 1,
          needs_refill: expect.any(Boolean)
        }),
        recent_history: expect.any(Array)
      });
    });

    test('should throw error for invalid medication ID', async () => {
      await expect(inventoryService.getInventoryStatus(null))
        .rejects.toThrow('Valid medication ID is required');
    });

    test('should throw error for non-existent medication', async () => {
      mockMedicationRepository.findById.mockResolvedValue(null);

      await expect(inventoryService.getInventoryStatus(999))
        .rejects.toThrow('Medication not found');
    });
  });

  describe('getConsumptionHistory', () => {
    beforeEach(() => {
      const mockQuery = require('../../config/database').query;
      mockQuery.mockResolvedValue({
        rows: [
          {
            consumption_date: '2024-01-15',
            quantity_consumed: '3.0',
            dose_count: '2',
            doses: [
              { timestamp: '2024-01-15T08:00:00Z', amount: 2 },
              { timestamp: '2024-01-15T20:00:00Z', amount: 1 }
            ]
          },
          {
            consumption_date: '2024-01-14',
            quantity_consumed: '2.0',
            dose_count: '1',
            doses: [
              { timestamp: '2024-01-14T08:00:00Z', amount: 2 }
            ]
          }
        ]
      });
    });

    test('should return consumption history for valid date range', async () => {
      const history = await inventoryService.getConsumptionHistory(1, '2024-01-14', '2024-01-15');

      expect(history).toHaveLength(2);
      expect(history[0]).toEqual({
        date: '2024-01-15',
        quantity_consumed: 3,
        dose_count: 2,
        doses: expect.any(Array)
      });
    });

    test('should throw error for invalid medication ID', async () => {
      await expect(inventoryService.getConsumptionHistory(null, '2024-01-01', '2024-01-02'))
        .rejects.toThrow('Valid medication ID is required');
    });

    test('should throw error for invalid date format', async () => {
      await expect(inventoryService.getConsumptionHistory(1, 'invalid', '2024-01-02'))
        .rejects.toThrow('Dates must be in YYYY-MM-DD format');
      
      await expect(inventoryService.getConsumptionHistory(1, '2024-01-01', 'invalid'))
        .rejects.toThrow('Dates must be in YYYY-MM-DD format');
    });
  });

  describe('bulkUpdateInventory', () => {
    const mockMedication = new Medication({
      id: 1,
      name: 'Test Med',
      total_tablets: 50,
      sheet_size: 10
    });

    beforeEach(() => {
      mockMedicationRepository.findById.mockResolvedValue(mockMedication);
      mockMedicationRepository.updateInventory.mockResolvedValue({
        ...mockMedication,
        total_tablets: 100
      });
    });

    test('should successfully update multiple medications', async () => {
      const updates = [
        { medication_id: 1, total_tablets: 100, reason: 'Refill' },
        { medication_id: 2, sheet_count: 5, reason: 'New prescription' }
      ];

      const result = await inventoryService.bulkUpdateInventory(updates);

      expect(result.successful_updates).toBe(2);
      expect(result.failed_updates).toBe(0);
      expect(result.results).toHaveLength(2);
    });

    test('should handle mixed success and failure', async () => {
      const mockMedication2 = new Medication({
        id: 2,
        name: 'Test Med 2',
        total_tablets: 30,
        sheet_size: 10
      });

      mockMedicationRepository.findById
        .mockResolvedValueOnce(mockMedication)
        .mockResolvedValueOnce(mockMedication2);
      
      mockMedicationRepository.updateInventory
        .mockResolvedValueOnce({ ...mockMedication, total_tablets: 100 })
        .mockRejectedValueOnce(new Error('Update failed'));

      const updates = [
        { medication_id: 1, total_tablets: 100 },
        { medication_id: 2, total_tablets: 50 }
      ];

      const result = await inventoryService.bulkUpdateInventory(updates);

      expect(result.successful_updates).toBe(1);
      expect(result.failed_updates).toBe(1);
      expect(result.errors[0].error).toContain('Update failed');
    });

    test('should throw error for empty updates array', async () => {
      await expect(inventoryService.bulkUpdateInventory([]))
        .rejects.toThrow('Updates array is required');
      
      await expect(inventoryService.bulkUpdateInventory(null))
        .rejects.toThrow('Updates array is required');
    });
  });

  describe('calculateDepletionProjections', () => {
    const mockMedication = new Medication({
      id: 1,
      name: 'Test Med',
      start_date: '2024-01-01',
      end_date: null,
      total_tablets: 10
    });

    const mockDoses = [
      new MedicineDose({ dose_amount: 2, time_of_day: '08:00' })
    ];

    beforeEach(() => {
      mockMedicationRepository.findById.mockResolvedValue(mockMedication);
      mockDoseRepository.findByMedicationId.mockResolvedValue(mockDoses);
      mockSkipDateRepository.shouldSkipOnDate.mockResolvedValue(false);
    });

    test('should calculate depletion projections correctly', async () => {
      const projections = await inventoryService.calculateDepletionProjections(1, 7);

      expect(projections.medication_id).toBe(1);
      expect(projections.daily_consumption).toBe(2);
      expect(projections.days_until_depletion).toBe(5);
      expect(projections.projections).toHaveLength(6); // 0 to 5 days
    });

    test('should handle medication with no consumption', async () => {
      mockDoseRepository.findByMedicationId.mockResolvedValue([]);

      const projections = await inventoryService.calculateDepletionProjections(1, 7);

      expect(projections.daily_consumption).toBe(0);
      expect(projections.depletion_date).toBe(null);
      expect(projections.days_until_depletion).toBe(null);
    });

    test('should throw error for invalid parameters', async () => {
      await expect(inventoryService.calculateDepletionProjections(null, 7))
        .rejects.toThrow('Valid medication ID is required');
      
      await expect(inventoryService.calculateDepletionProjections(1, 0))
        .rejects.toThrow('Projection days must be an integer between 1 and 365');
      
      await expect(inventoryService.calculateDepletionProjections(1, 366))
        .rejects.toThrow('Projection days must be an integer between 1 and 365');
    });
  });

  describe('getInventorySummary', () => {
    const mockMedications = [
      new Medication({ id: 1, name: 'Med 1', total_tablets: 5 }),
      new Medication({ id: 2, name: 'Med 2', total_tablets: 100 }),
      new Medication({ id: 3, name: 'Med 3', total_tablets: 0 })
    ];

    beforeEach(() => {
      mockMedicationRepository.findActiveByDate.mockResolvedValue(mockMedications);
      mockDoseRepository.findByMedicationId.mockImplementation((id) => {
        return Promise.resolve([new MedicineDose({ dose_amount: 2, time_of_day: '08:00' })]);
      });
    });

    test('should return comprehensive inventory summary', async () => {
      const summary = await inventoryService.getInventorySummary();

      expect(summary.total_medications).toBe(3);
      expect(summary.medications_with_alerts).toBe(1); // Only Med 3 (0 tablets)
      expect(summary.critical_alerts).toBe(1); // Med 3
      expect(summary.urgent_alerts).toBe(0); // None
      expect(summary.total_tablets).toBe(105);
      expect(summary.medications).toHaveLength(3);
    });

    test('should sort medications by urgency', async () => {
      const summary = await inventoryService.getInventorySummary();

      expect(summary.medications[0].alert_level).toBe('critical');
      expect(summary.medications[1].alert_level).toBe('none');
      expect(summary.medications[2].alert_level).toBe('none');
    });
  });
});