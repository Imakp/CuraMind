const express = require('express');
const MedicationService = require('../services/MedicationService');
const DoseRepository = require('../repositories/DoseRepository');
const SkipDateRepository = require('../repositories/SkipDateRepository');

const router = express.Router();
const medicationService = new MedicationService();
const doseRepository = new DoseRepository();
const skipDateRepository = new SkipDateRepository();

// Import nested routes
const doseRoutes = require('./doses');

// Validation middleware
const validateMedicationData = (req, res, next) => {
  const { name, start_date, sheet_size, total_tablets } = req.body;
  
  const errors = [];
  
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name is required and must be a non-empty string' });
  }
  
  if (!start_date || !start_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    errors.push({ field: 'start_date', message: 'Start date is required and must be in YYYY-MM-DD format' });
  }
  
  if (req.body.end_date && !req.body.end_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    errors.push({ field: 'end_date', message: 'End date must be in YYYY-MM-DD format' });
  }
  
  if (req.body.end_date && start_date) {
    const startDate = new Date(start_date);
    const endDate = new Date(req.body.end_date);
    if (endDate <= startDate) {
      errors.push({ field: 'end_date', message: 'End date must be after start date' });
    }
  }
  
  if (sheet_size !== undefined && (!Number.isInteger(sheet_size) || sheet_size < 1)) {
    errors.push({ field: 'sheet_size', message: 'Sheet size must be a positive integer' });
  }
  
  if (total_tablets !== undefined && (typeof total_tablets !== 'number' || total_tablets < 0)) {
    errors.push({ field: 'total_tablets', message: 'Total tablets must be a non-negative number' });
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid medication data',
        details: errors
      }
    });
  }
  
  next();
};

// GET /api/medications - Get all medications with filtering
router.get('/', async (req, res) => {
  try {
    const filters = {};
    
    // Parse query parameters
    if (req.query.date) {
      if (!req.query.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid date format',
            details: [{ field: 'date', message: 'Date must be in YYYY-MM-DD format' }]
          }
        });
      }
      filters.date = req.query.date;
    }
    
    if (req.query.active !== undefined) {
      filters.active = req.query.active === 'true';
    }
    
    if (req.query.search) {
      filters.search = req.query.search.trim();
    }
    
    if (req.query.route_id) {
      const routeId = parseInt(req.query.route_id);
      if (!Number.isInteger(routeId)) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid route ID',
            details: [{ field: 'route_id', message: 'Route ID must be an integer' }]
          }
        });
      }
      filters.route_id = routeId;
    }
    
    if (req.query.low_inventory !== undefined) {
      filters.low_inventory = req.query.low_inventory === 'true';
    }
    
    if (req.query.sort_by) {
      filters.sort_by = req.query.sort_by;
    }
    
    if (req.query.sort_direction) {
      filters.sort_direction = req.query.sort_direction;
    }
    
    const medications = await medicationService.getAllMedications(filters);
    
    // Include doses and skip dates for each medication if requested
    if (req.query.include_details === 'true') {
      for (const medication of medications) {
        medication.doses = await doseRepository.findByMedicationId(medication.id);
        medication.skip_dates = await skipDateRepository.findByMedicationId(medication.id);
      }
    }
    
    res.json({
      data: medications,
      count: medications.length,
      filters: filters
    });
  } catch (error) {
    console.error('Error fetching medications:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch medications',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// GET /api/medications/:id - Get specific medication
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (!Number.isInteger(id)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid medication ID',
          details: [{ field: 'id', message: 'ID must be an integer' }]
        }
      });
    }
    
    const medication = await medicationService.getMedicationById(id);
    
    // Include related data
    medication.doses = await doseRepository.findByMedicationId(id);
    medication.skip_dates = await skipDateRepository.findByMedicationId(id);
    
    // Include inventory stats
    medication.inventory_stats = await medicationService.getInventoryStats(id);
    
    res.json({
      data: medication
    });
  } catch (error) {
    console.error('Error fetching medication:', error);
    
    if (error.message === 'Medication not found') {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Medication not found'
        }
      });
    }
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch medication',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// POST /api/medications - Create new medication
router.post('/', validateMedicationData, async (req, res) => {
  try {
    const medicationData = {
      name: req.body.name.trim(),
      strength: req.body.strength?.trim() || null,
      route_id: req.body.route_id || null,
      frequency_id: req.body.frequency_id || null,
      start_date: req.body.start_date,
      end_date: req.body.end_date || null,
      sheet_size: req.body.sheet_size || 10,
      total_tablets: req.body.total_tablets || 0,
      notes: req.body.notes?.trim() || null
    };
    
    const medication = await medicationService.createMedication(medicationData);
    
    res.status(201).json({
      data: medication,
      message: 'Medication created successfully'
    });
  } catch (error) {
    console.error('Error creating medication:', error);
    
    if (error.message.includes('validation') || error.message.includes('Invalid')) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message
        }
      });
    }
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create medication',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// PUT /api/medications/:id - Update medication
router.put('/:id', validateMedicationData, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (!Number.isInteger(id)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid medication ID',
          details: [{ field: 'id', message: 'ID must be an integer' }]
        }
      });
    }
    
    const updateData = {
      name: req.body.name.trim(),
      strength: req.body.strength?.trim() || null,
      route_id: req.body.route_id || null,
      frequency_id: req.body.frequency_id || null,
      start_date: req.body.start_date,
      end_date: req.body.end_date || null,
      sheet_size: req.body.sheet_size || 10,
      total_tablets: req.body.total_tablets || 0,
      notes: req.body.notes?.trim() || null
    };
    
    const medication = await medicationService.updateMedication(id, updateData);
    
    res.json({
      data: medication,
      message: 'Medication updated successfully'
    });
  } catch (error) {
    console.error('Error updating medication:', error);
    
    if (error.message === 'Medication not found') {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Medication not found'
        }
      });
    }
    
    if (error.message.includes('validation') || error.message.includes('Invalid')) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message
        }
      });
    }
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update medication',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// DELETE /api/medications/:id - Delete medication
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (!Number.isInteger(id)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid medication ID',
          details: [{ field: 'id', message: 'ID must be an integer' }]
        }
      });
    }
    
    const result = await medicationService.deleteMedication(id);
    
    if (result.soft) {
      res.json({
        data: result.medication,
        message: 'Medication deactivated (soft delete)',
        soft_delete: true
      });
    } else {
      res.json({
        message: 'Medication deleted successfully',
        soft_delete: false
      });
    }
  } catch (error) {
    console.error('Error deleting medication:', error);
    
    if (error.message === 'Medication not found') {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Medication not found'
        }
      });
    }
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete medication',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// Import skip date routes
const skipDateRoutes = require('./skipDates');

// POST /api/medications/:id/mark-dose-given - Mark dose as given
router.post('/:id/mark-dose-given', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (!Number.isInteger(id)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid medication ID',
          details: [{ field: 'id', message: 'ID must be an integer' }]
        }
      });
    }
    
    const { dose_amount, timestamp } = req.body;
    
    if (!dose_amount || typeof dose_amount !== 'number' || dose_amount <= 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid dose amount',
          details: [{ field: 'dose_amount', message: 'Dose amount is required and must be a positive number' }]
        }
      });
    }
    
    const doseData = {
      dose_amount,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    };
    
    const result = await medicationService.markDoseGiven(id, doseData);
    
    res.json({
      data: result,
      message: 'Dose marked as given successfully'
    });
  } catch (error) {
    console.error('Error marking dose as given:', error);
    
    if (error.message === 'Medication not found') {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Medication not found'
        }
      });
    }
    
    if (error.message.includes('validation') || error.message.includes('Invalid') || error.message.includes('Cannot mark')) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message
        }
      });
    }
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to mark dose as given',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// POST /api/medications/:id/update-inventory - Update inventory manually
router.post('/:id/update-inventory', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (!Number.isInteger(id)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid medication ID',
          details: [{ field: 'id', message: 'ID must be an integer' }]
        }
      });
    }
    
    const inventoryData = req.body;
    
    // Validate at least one inventory update method is provided
    if (!inventoryData.total_tablets && !inventoryData.sheet_count && !inventoryData.add_tablets) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Must provide total_tablets, sheet_count, or add_tablets',
          details: [{ field: 'inventory', message: 'At least one inventory update method is required' }]
        }
      });
    }
    
    const updatedMedication = await medicationService.updateInventory(id, inventoryData);
    
    res.json({
      data: updatedMedication,
      message: 'Inventory updated successfully'
    });
  } catch (error) {
    console.error('Error updating inventory:', error);
    
    if (error.message === 'Medication not found') {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Medication not found'
        }
      });
    }
    
    if (error.message.includes('validation') || error.message.includes('Invalid') || error.message.includes('must be')) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message
        }
      });
    }
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update inventory',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// Nested routes for doses and skip dates
router.use('/:medicationId/doses', doseRoutes);
router.use('/:medicationId/skip-dates', skipDateRoutes);

module.exports = router;