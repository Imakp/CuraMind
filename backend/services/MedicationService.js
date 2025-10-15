const MedicationRepository = require('../repositories/MedicationRepository');
const DoseRepository = require('../repositories/DoseRepository');
const SkipDateRepository = require('../repositories/SkipDateRepository');
const AuditLogRepository = require('../repositories/AuditLogRepository');

class MedicationService {
  constructor() {
    this.medicationRepository = new MedicationRepository();
    this.doseRepository = new DoseRepository();
    this.skipDateRepository = new SkipDateRepository();
    this.auditLogRepository = new AuditLogRepository();
  }

  // Create medication with business logic validation
  async createMedication(medicationData) {
    try {
      // Additional business logic validation
      this.validateMedicationBusinessRules(medicationData);
      
      // Create the medication
      const medication = await this.medicationRepository.create(medicationData);
      
      // Log creation
      await this.auditLogRepository.create({
        medicine_id: medication.id,
        action: 'CREATED',
        new_values: medication.toDbFormat()
      });
      
      return medication;
    } catch (error) {
      throw new Error(`Failed to create medication: ${error.message}`);
    }
  }

  // Get medication by ID with full details
  async getMedicationById(id) {
    if (!id || !Number.isInteger(parseInt(id))) {
      throw new Error('Valid medication ID is required');
    }

    const medication = await this.medicationRepository.findById(id);
    if (!medication) {
      throw new Error('Medication not found');
    }

    return medication;
  }

  // Get all medications with filtering and business logic
  async getAllMedications(filters = {}) {
    // Validate filter parameters
    this.validateFilters(filters);
    
    return await this.medicationRepository.findAll(filters);
  }

  // Update medication with business logic
  async updateMedication(id, updateData) {
    if (!id || !Number.isInteger(parseInt(id))) {
      throw new Error('Valid medication ID is required');
    }

    try {
      // Get existing medication for audit trail
      const existingMedication = await this.medicationRepository.findById(id);
      if (!existingMedication) {
        throw new Error('Medication not found');
      }

      // Additional business logic validation
      this.validateMedicationBusinessRules(updateData, existingMedication);
      
      // Update the medication
      const updatedMedication = await this.medicationRepository.update(id, updateData);
      
      // Log update
      await this.auditLogRepository.create({
        medicine_id: id,
        action: 'UPDATED',
        old_values: existingMedication.toDbFormat(),
        new_values: updatedMedication.toDbFormat()
      });
      
      return updatedMedication;
    } catch (error) {
      throw new Error(`Failed to update medication: ${error.message}`);
    }
  }

  // Delete medication with business logic
  async deleteMedication(id) {
    if (!id || !Number.isInteger(parseInt(id))) {
      throw new Error('Valid medication ID is required');
    }

    try {
      const existingMedication = await this.medicationRepository.findById(id);
      if (!existingMedication) {
        throw new Error('Medication not found');
      }

      // Check if medication has future doses or active schedule
      const today = new Date().toISOString().split('T')[0];
      const isCurrentlyActive = existingMedication.isActiveOnDate(today);
      
      if (isCurrentlyActive) {
        // Soft delete by setting end_date to yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const endDate = yesterday.toISOString().split('T')[0];
        
        const updatedMedication = await this.medicationRepository.update(id, { end_date: endDate });
        
        // Log soft deletion
        await this.auditLogRepository.create({
          medicine_id: id,
          action: 'SOFT_DELETED',
          old_values: existingMedication.toDbFormat(),
          new_values: updatedMedication.toDbFormat()
        });
        
        return { deleted: true, soft: true, medication: updatedMedication };
      } else {
        // Hard delete if already ended
        const deleted = await this.medicationRepository.delete(id);
        
        // Log hard deletion
        await this.auditLogRepository.create({
          medicine_id: id,
          action: 'DELETED',
          old_values: existingMedication.toDbFormat()
        });
        
        return { deleted, soft: false };
      }
    } catch (error) {
      throw new Error(`Failed to delete medication: ${error.message}`);
    }
  }

  // Update inventory with business logic and validation
  async updateInventory(id, inventoryData) {
    if (!id || !Number.isInteger(parseInt(id))) {
      throw new Error('Valid medication ID is required');
    }

    try {
      const existingMedication = await this.medicationRepository.findById(id);
      if (!existingMedication) {
        throw new Error('Medication not found');
      }

      let newTotalTablets;
      let reason = inventoryData.reason || 'Manual update';

      // Handle different inventory update methods
      if (inventoryData.total_tablets !== undefined) {
        // Direct tablet count update
        newTotalTablets = inventoryData.total_tablets;
      } else if (inventoryData.sheet_count !== undefined) {
        // Sheet-to-tablet conversion
        newTotalTablets = this.convertSheetsToTablets(
          inventoryData.sheet_count, 
          existingMedication.sheet_size
        );
        reason = `Updated via sheet count: ${inventoryData.sheet_count} sheets`;
      } else if (inventoryData.add_tablets !== undefined) {
        // Add tablets to existing inventory
        newTotalTablets = existingMedication.total_tablets + inventoryData.add_tablets;
        reason = `Added ${inventoryData.add_tablets} tablets`;
      } else {
        throw new Error('Must provide total_tablets, sheet_count, or add_tablets');
      }

      // Validate new total
      if (typeof newTotalTablets !== 'number' || newTotalTablets < 0) {
        throw new Error('Total tablets must be a non-negative number');
      }

      // Update inventory
      const updatedMedication = await this.medicationRepository.updateInventory(
        id, 
        newTotalTablets, 
        reason
      );

      return updatedMedication;
    } catch (error) {
      throw new Error(`Failed to update inventory: ${error.message}`);
    }
  }

  // Mark dose as given with business logic
  async markDoseGiven(id, doseData) {
    if (!id || !Number.isInteger(parseInt(id))) {
      throw new Error('Valid medication ID is required');
    }

    try {
      const existingMedication = await this.medicationRepository.findById(id);
      if (!existingMedication) {
        throw new Error('Medication not found');
      }

      // Validate dose data
      if (!doseData.dose_amount || typeof doseData.dose_amount !== 'number' || doseData.dose_amount <= 0) {
        throw new Error('Valid dose amount is required');
      }

      const timestamp = doseData.timestamp ? new Date(doseData.timestamp) : new Date();
      
      // Check if medication is active on the given date
      const doseDate = timestamp.toISOString().split('T')[0];
      if (!existingMedication.isActiveOnDate(doseDate)) {
        throw new Error('Cannot mark dose for inactive medication on this date');
      }

      // Check for skip dates
      const skipDates = await this.skipDateRepository.findByMedicationId(id);
      const isSkipDate = skipDates.some(skip => skip.skip_date === doseDate);
      
      if (isSkipDate) {
        throw new Error('Cannot mark dose on a skip date');
      }

      // Mark dose as given
      const result = await this.medicationRepository.markDoseGiven(
        id, 
        doseData.dose_amount, 
        timestamp
      );

      return result;
    } catch (error) {
      throw new Error(`Failed to mark dose as given: ${error.message}`);
    }
  }

  // Sheet-to-tablet conversion utility
  convertSheetsToTablets(sheetCount, sheetSize) {
    if (!Number.isInteger(sheetCount) || sheetCount < 0) {
      throw new Error('Sheet count must be a non-negative integer');
    }
    
    if (!Number.isInteger(sheetSize) || sheetSize <= 0) {
      throw new Error('Sheet size must be a positive integer');
    }

    return sheetCount * sheetSize;
  }

  // Tablet-to-sheet conversion utility
  convertTabletsToSheets(totalTablets, sheetSize) {
    if (typeof totalTablets !== 'number' || totalTablets < 0) {
      throw new Error('Total tablets must be a non-negative number');
    }
    
    if (!Number.isInteger(sheetSize) || sheetSize <= 0) {
      throw new Error('Sheet size must be a positive integer');
    }

    return {
      fullSheets: Math.floor(totalTablets / sheetSize),
      remainingTablets: totalTablets % sheetSize,
      totalSheets: totalTablets / sheetSize
    };
  }

  // Calculate inventory statistics
  async getInventoryStats(id) {
    if (!id || !Number.isInteger(parseInt(id))) {
      throw new Error('Valid medication ID is required');
    }

    try {
      const medication = await this.medicationRepository.findById(id);
      if (!medication) {
        throw new Error('Medication not found');
      }

      // Get doses for daily consumption calculation
      const doses = await this.doseRepository.findByMedicationId(id);
      const dailyConsumption = doses.reduce((sum, dose) => sum + dose.dose_amount, 0);

      // Calculate sheet equivalents
      const sheetInfo = this.convertTabletsToSheets(medication.total_tablets, medication.sheet_size);

      // Calculate days remaining
      const daysRemaining = dailyConsumption > 0 
        ? Math.floor(medication.total_tablets / dailyConsumption)
        : null;

      return {
        total_tablets: medication.total_tablets,
        sheet_size: medication.sheet_size,
        full_sheets: sheetInfo.fullSheets,
        remaining_tablets: sheetInfo.remainingTablets,
        total_sheets: sheetInfo.totalSheets,
        daily_consumption: dailyConsumption,
        days_remaining: daysRemaining,
        is_low_inventory: daysRemaining !== null && daysRemaining <= 1
      };
    } catch (error) {
      throw new Error(`Failed to get inventory stats: ${error.message}`);
    }
  }

  // Get medications needing refill alerts
  async getLowInventoryMedications(daysAhead = 1) {
    try {
      return await this.medicationRepository.findLowInventoryMedications(daysAhead);
    } catch (error) {
      throw new Error(`Failed to get low inventory medications: ${error.message}`);
    }
  }

  // Business rule validation
  validateMedicationBusinessRules(medicationData, existingMedication = null) {
    // Validate start date is not in the far future (more than 1 year)
    if (medicationData.start_date) {
      const startDate = new Date(medicationData.start_date);
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      
      if (startDate > oneYearFromNow) {
        throw new Error('Start date cannot be more than one year in the future');
      }
    }

    // Validate end date is reasonable (not more than 10 years from start)
    if (medicationData.start_date && medicationData.end_date) {
      const startDate = new Date(medicationData.start_date);
      const endDate = new Date(medicationData.end_date);
      const tenYearsFromStart = new Date(startDate);
      tenYearsFromStart.setFullYear(tenYearsFromStart.getFullYear() + 10);
      
      if (endDate > tenYearsFromStart) {
        throw new Error('End date cannot be more than 10 years from start date');
      }
    }

    // Validate sheet size is reasonable (1-1000)
    if (medicationData.sheet_size !== undefined) {
      if (medicationData.sheet_size < 1 || medicationData.sheet_size > 1000) {
        throw new Error('Sheet size must be between 1 and 1000');
      }
    }

    // Validate total tablets is reasonable (0-100000)
    if (medicationData.total_tablets !== undefined) {
      if (medicationData.total_tablets < 0 || medicationData.total_tablets > 100000) {
        throw new Error('Total tablets must be between 0 and 100,000');
      }
    }

    // If updating an existing medication, validate inventory changes
    if (existingMedication && medicationData.total_tablets !== undefined) {
      const inventoryChange = medicationData.total_tablets - existingMedication.total_tablets;
      
      // Warn about large inventory increases (more than 1000 tablets)
      if (inventoryChange > 1000) {
        // This is a warning, not an error - could be a legitimate refill
        console.warn(`Large inventory increase detected: ${inventoryChange} tablets for medication ${existingMedication.id}`);
      }
    }
  }

  // Filter validation
  validateFilters(filters) {
    // Validate date format
    if (filters.date && !filters.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      throw new Error('Date filter must be in YYYY-MM-DD format');
    }

    // Validate sort fields
    const validSortFields = ['name', 'start_date', 'end_date', 'total_tablets', 'created_at'];
    if (filters.sort_by && !validSortFields.includes(filters.sort_by)) {
      throw new Error(`Invalid sort field. Must be one of: ${validSortFields.join(', ')}`);
    }

    // Validate sort direction
    if (filters.sort_direction && !['asc', 'desc'].includes(filters.sort_direction.toLowerCase())) {
      throw new Error('Sort direction must be "asc" or "desc"');
    }

    // Validate boolean filters
    if (filters.active !== undefined && typeof filters.active !== 'boolean') {
      throw new Error('Active filter must be a boolean');
    }

    if (filters.low_inventory !== undefined && typeof filters.low_inventory !== 'boolean') {
      throw new Error('Low inventory filter must be a boolean');
    }
  }
}

module.exports = MedicationService;