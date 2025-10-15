const MedicationRepository = require('../repositories/MedicationRepository');
const DoseRepository = require('../repositories/DoseRepository');
const SkipDateRepository = require('../repositories/SkipDateRepository');
const AuditLogRepository = require('../repositories/AuditLogRepository');

class InventoryService {
  constructor() {
    this.medicationRepository = new MedicationRepository();
    this.doseRepository = new DoseRepository();
    this.skipDateRepository = new SkipDateRepository();
    this.auditLogRepository = new AuditLogRepository();
  }

  // Track dose consumption and update inventory
  async consumeDose(medicationId, doseAmount, timestamp = new Date()) {
    if (!medicationId || !Number.isInteger(parseInt(medicationId))) {
      throw new Error('Valid medication ID is required');
    }

    if (!doseAmount || typeof doseAmount !== 'number' || doseAmount <= 0) {
      throw new Error('Valid dose amount is required');
    }

    try {
      const medication = await this.medicationRepository.findById(medicationId);
      if (!medication) {
        throw new Error('Medication not found');
      }

      // Validate that medication is active on the given date
      const doseDate = timestamp.toISOString().split('T')[0];
      if (!medication.isActiveOnDate(doseDate)) {
        throw new Error('Cannot consume dose for inactive medication on this date');
      }

      // Check for skip dates
      const isSkipDate = await this.skipDateRepository.shouldSkipOnDate(medicationId, doseDate);
      if (isSkipDate) {
        throw new Error('Cannot consume dose on a skip date');
      }

      // Mark dose as given and update inventory
      const result = await this.medicationRepository.markDoseGiven(medicationId, doseAmount, timestamp);
      
      return {
        medication: result,
        consumed: result.dose_result.consumed,
        remaining: result.dose_result.remaining,
        was_short: result.dose_result.wasShort,
        timestamp: timestamp.toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to consume dose: ${error.message}`);
    }
  }

  // Calculate buy-soon alerts for medications
  async calculateBuySoonAlerts(daysAhead = 1) {
    if (!Number.isInteger(daysAhead) || daysAhead < 1 || daysAhead > 30) {
      throw new Error('Days ahead must be an integer between 1 and 30');
    }

    try {
      // Get all active medications
      const today = new Date().toISOString().split('T')[0];
      const activeMedications = await this.medicationRepository.findActiveByDate(today);
      
      const alerts = [];

      for (const medication of activeMedications) {
        const alert = await this.calculateMedicationAlert(medication, daysAhead);
        if (alert.needs_refill) {
          alerts.push(alert);
        }
      }

      // Sort by urgency (days remaining ascending)
      alerts.sort((a, b) => {
        if (a.days_remaining === null) return 1;
        if (b.days_remaining === null) return -1;
        return a.days_remaining - b.days_remaining;
      });

      return alerts;
    } catch (error) {
      throw new Error(`Failed to calculate buy-soon alerts: ${error.message}`);
    }
  }

  // Calculate alert for a specific medication
  async calculateMedicationAlert(medication, daysAhead = 1) {
    try {
      // Get daily consumption
      const doses = await this.doseRepository.findByMedicationId(medication.id);
      const dailyConsumption = doses.reduce((sum, dose) => sum + dose.dose_amount, 0);

      if (dailyConsumption === 0) {
        return {
          medication_id: medication.id,
          medication_name: medication.name,
          medication_strength: medication.strength,
          current_tablets: medication.total_tablets,
          daily_consumption: 0,
          days_remaining: null,
          tablets_needed_for_period: 0,
          needs_refill: false,
          alert_level: 'none'
        };
      }

      // Calculate days remaining with current inventory
      const daysRemaining = Math.floor(medication.total_tablets / dailyConsumption);
      
      // Calculate tablets needed for the specified period
      const tabletsNeededForPeriod = dailyConsumption * daysAhead;
      
      // Determine if refill is needed
      const needsRefill = medication.total_tablets <= tabletsNeededForPeriod;
      
      // Determine alert level
      let alertLevel = 'none';
      if (daysRemaining === 0) {
        alertLevel = 'critical'; // Out of stock
      } else if (daysRemaining === 1) {
        alertLevel = 'urgent'; // Exactly 1 day remaining
      } else if (daysRemaining <= daysAhead) {
        alertLevel = 'warning'; // Within the alert threshold
      }

      return {
        medication_id: medication.id,
        medication_name: medication.name,
        medication_strength: medication.strength,
        current_tablets: medication.total_tablets,
        daily_consumption: dailyConsumption,
        days_remaining: daysRemaining,
        tablets_needed_for_period: tabletsNeededForPeriod,
        needs_refill: needsRefill,
        alert_level: alertLevel
      };
    } catch (error) {
      throw new Error(`Failed to calculate medication alert: ${error.message}`);
    }
  }

  // Update inventory automatically when doses are marked as given
  async processAutomaticInventoryUpdate(medicationId, doseAmount, timestamp = new Date()) {
    try {
      const result = await this.consumeDose(medicationId, doseAmount, timestamp);
      
      // Check if this creates a buy-soon alert
      const medication = await this.medicationRepository.findById(medicationId);
      const alert = await this.calculateMedicationAlert(medication, 1);
      
      return {
        inventory_update: result,
        alert_triggered: alert.needs_refill,
        alert_details: alert.needs_refill ? alert : null
      };
    } catch (error) {
      throw new Error(`Failed to process automatic inventory update: ${error.message}`);
    }
  }

  // Get comprehensive inventory status for a medication
  async getInventoryStatus(medicationId) {
    if (!medicationId || !Number.isInteger(parseInt(medicationId))) {
      throw new Error('Valid medication ID is required');
    }

    try {
      const medication = await this.medicationRepository.findById(medicationId);
      if (!medication) {
        throw new Error('Medication not found');
      }

      const doses = await this.doseRepository.findByMedicationId(medicationId);
      const dailyConsumption = doses.reduce((sum, dose) => sum + dose.dose_amount, 0);

      // Calculate sheet equivalents
      const fullSheets = Math.floor(medication.total_tablets / medication.sheet_size);
      const remainingTablets = medication.total_tablets % medication.sheet_size;
      const totalSheets = medication.total_tablets / medication.sheet_size;

      // Calculate days remaining
      const daysRemaining = dailyConsumption > 0 
        ? Math.floor(medication.total_tablets / dailyConsumption) 
        : null;

      // Get recent consumption history (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentConsumption = await this.getConsumptionHistory(
        medicationId, 
        sevenDaysAgo.toISOString().split('T')[0],
        new Date().toISOString().split('T')[0]
      );

      // Calculate average daily consumption from history
      const actualDailyConsumption = recentConsumption.length > 0
        ? recentConsumption.reduce((sum, entry) => sum + entry.quantity_consumed, 0) / 7
        : dailyConsumption;

      // Get buy-soon alert
      const alert = await this.calculateMedicationAlert(medication, 1);

      return {
        medication_id: medication.id,
        medication_name: medication.name,
        medication_strength: medication.strength,
        inventory: {
          total_tablets: medication.total_tablets,
          sheet_size: medication.sheet_size,
          full_sheets: fullSheets,
          remaining_tablets: remainingTablets,
          total_sheets: totalSheets
        },
        consumption: {
          scheduled_daily: dailyConsumption,
          actual_daily_average: actualDailyConsumption,
          days_remaining_scheduled: daysRemaining,
          days_remaining_actual: actualDailyConsumption > 0 
            ? Math.floor(medication.total_tablets / actualDailyConsumption)
            : null
        },
        alert: alert,
        recent_history: recentConsumption
      };
    } catch (error) {
      throw new Error(`Failed to get inventory status: ${error.message}`);
    }
  }

  // Get consumption history for a medication within a date range
  async getConsumptionHistory(medicationId, startDate, endDate) {
    if (!medicationId || !Number.isInteger(parseInt(medicationId))) {
      throw new Error('Valid medication ID is required');
    }

    if (!startDate?.match(/^\d{4}-\d{2}-\d{2}$/) || !endDate?.match(/^\d{4}-\d{2}-\d{2}$/)) {
      throw new Error('Dates must be in YYYY-MM-DD format');
    }

    try {
      // Get audit logs for dose consumption in the date range
      const { query } = require('../config/database');
      
      const historyQuery = `
        SELECT 
          DATE(created_at) as consumption_date,
          SUM(ABS(quantity_change)) as quantity_consumed,
          COUNT(*) as dose_count,
          ARRAY_AGG(
            JSON_BUILD_OBJECT(
              'timestamp', created_at,
              'amount', ABS(quantity_change),
              'details', new_values
            ) ORDER BY created_at
          ) as doses
        FROM audit_logs
        WHERE medicine_id = $1
          AND action = 'DOSE_GIVEN'
          AND DATE(created_at) BETWEEN $2 AND $3
        GROUP BY DATE(created_at)
        ORDER BY consumption_date DESC
      `;

      const result = await query(historyQuery, [medicationId, startDate, endDate]);
      
      return result.rows.map(row => ({
        date: row.consumption_date,
        quantity_consumed: parseFloat(row.quantity_consumed),
        dose_count: parseInt(row.dose_count),
        doses: row.doses
      }));
    } catch (error) {
      throw new Error(`Failed to get consumption history: ${error.message}`);
    }
  }

  // Bulk update inventory for multiple medications
  async bulkUpdateInventory(updates) {
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new Error('Updates array is required');
    }

    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        if (!update.medication_id || !Number.isInteger(parseInt(update.medication_id))) {
          throw new Error('Valid medication_id is required');
        }

        let newTotalTablets;
        let reason = update.reason || 'Bulk inventory update';

        if (update.total_tablets !== undefined) {
          newTotalTablets = update.total_tablets;
        } else if (update.sheet_count !== undefined) {
          const medication = await this.medicationRepository.findById(update.medication_id);
          if (!medication) {
            throw new Error('Medication not found');
          }
          newTotalTablets = update.sheet_count * medication.sheet_size;
          reason = `Bulk update via sheet count: ${update.sheet_count} sheets`;
        } else if (update.add_tablets !== undefined) {
          const medication = await this.medicationRepository.findById(update.medication_id);
          if (!medication) {
            throw new Error('Medication not found');
          }
          newTotalTablets = medication.total_tablets + update.add_tablets;
          reason = `Bulk update: added ${update.add_tablets} tablets`;
        } else {
          throw new Error('Must provide total_tablets, sheet_count, or add_tablets');
        }

        if (typeof newTotalTablets !== 'number' || newTotalTablets < 0) {
          throw new Error('Total tablets must be a non-negative number');
        }

        const updatedMedication = await this.medicationRepository.updateInventory(
          update.medication_id,
          newTotalTablets,
          reason
        );

        results.push({
          medication_id: update.medication_id,
          success: true,
          old_tablets: updatedMedication.total_tablets - (newTotalTablets - updatedMedication.total_tablets),
          new_tablets: updatedMedication.total_tablets,
          reason: reason
        });
      } catch (error) {
        errors.push({
          medication_id: update.medication_id,
          success: false,
          error: error.message
        });
      }
    }

    return {
      successful_updates: results.length,
      failed_updates: errors.length,
      results: results,
      errors: errors
    };
  }

  // Calculate projected inventory depletion dates
  async calculateDepletionProjections(medicationId, projectionDays = 30) {
    if (!medicationId || !Number.isInteger(parseInt(medicationId))) {
      throw new Error('Valid medication ID is required');
    }

    if (!Number.isInteger(projectionDays) || projectionDays < 1 || projectionDays > 365) {
      throw new Error('Projection days must be an integer between 1 and 365');
    }

    try {
      const medication = await this.medicationRepository.findById(medicationId);
      if (!medication) {
        throw new Error('Medication not found');
      }

      const doses = await this.doseRepository.findByMedicationId(medicationId);
      const dailyConsumption = doses.reduce((sum, dose) => sum + dose.dose_amount, 0);

      if (dailyConsumption === 0) {
        return {
          medication_id: medicationId,
          current_tablets: medication.total_tablets,
          daily_consumption: 0,
          depletion_date: null,
          days_until_depletion: null,
          projections: []
        };
      }

      // Calculate depletion date
      const daysUntilDepletion = Math.floor(medication.total_tablets / dailyConsumption);
      const depletionDate = new Date();
      depletionDate.setDate(depletionDate.getDate() + daysUntilDepletion);

      // Generate daily projections
      const projections = [];
      let remainingTablets = medication.total_tablets;
      
      for (let day = 0; day <= Math.min(projectionDays, daysUntilDepletion); day++) {
        const projectionDate = new Date();
        projectionDate.setDate(projectionDate.getDate() + day);
        
        // Check if this date should be skipped
        const dateStr = projectionDate.toISOString().split('T')[0];
        const isSkipDate = await this.skipDateRepository.shouldSkipOnDate(medicationId, dateStr);
        
        // For day 0, show current tablets before consumption
        const tabletsBeforeConsumption = remainingTablets;
        
        if (!isSkipDate && medication.isActiveOnDate(dateStr) && day > 0) {
          remainingTablets -= dailyConsumption;
        }

        projections.push({
          date: dateStr,
          remaining_tablets: Math.max(0, day === 0 ? tabletsBeforeConsumption : remainingTablets),
          consumption_on_date: (!isSkipDate && medication.isActiveOnDate(dateStr) && day > 0) ? dailyConsumption : 0,
          is_skip_date: isSkipDate,
          is_active: medication.isActiveOnDate(dateStr)
        });

        if (remainingTablets <= 0 && day > 0) {
          break;
        }
      }

      return {
        medication_id: medicationId,
        current_tablets: medication.total_tablets,
        daily_consumption: dailyConsumption,
        depletion_date: depletionDate.toISOString().split('T')[0],
        days_until_depletion: daysUntilDepletion,
        projections: projections
      };
    } catch (error) {
      throw new Error(`Failed to calculate depletion projections: ${error.message}`);
    }
  }

  // Get inventory summary for all active medications
  async getInventorySummary() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const activeMedications = await this.medicationRepository.findActiveByDate(today);
      
      const summary = {
        total_medications: activeMedications.length,
        medications_with_alerts: 0,
        critical_alerts: 0,
        urgent_alerts: 0,
        warning_alerts: 0,
        total_tablets: 0,
        medications: []
      };

      for (const medication of activeMedications) {
        const alert = await this.calculateMedicationAlert(medication, 1);
        
        summary.total_tablets += medication.total_tablets;
        
        if (alert.needs_refill) {
          summary.medications_with_alerts++;
          
          switch (alert.alert_level) {
            case 'critical':
              summary.critical_alerts++;
              break;
            case 'urgent':
              summary.urgent_alerts++;
              break;
            case 'warning':
              summary.warning_alerts++;
              break;
          }
        }

        summary.medications.push({
          id: medication.id,
          name: medication.name,
          strength: medication.strength,
          total_tablets: medication.total_tablets,
          days_remaining: alert.days_remaining,
          alert_level: alert.alert_level,
          needs_refill: alert.needs_refill
        });
      }

      // Sort medications by urgency
      summary.medications.sort((a, b) => {
        const alertPriority = { critical: 0, urgent: 1, warning: 2, none: 3 };
        const aPriority = alertPriority[a.alert_level];
        const bPriority = alertPriority[b.alert_level];
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        if (a.days_remaining === null) return 1;
        if (b.days_remaining === null) return -1;
        return a.days_remaining - b.days_remaining;
      });

      return summary;
    } catch (error) {
      throw new Error(`Failed to get inventory summary: ${error.message}`);
    }
  }
}

module.exports = InventoryService;