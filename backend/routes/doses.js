const express = require('express');
const DoseRepository = require('../repositories/DoseRepository');
const MedicationRepository = require('../repositories/MedicationRepository');
const AuditLogRepository = require('../repositories/AuditLogRepository');

const router = express.Router({ mergeParams: true });
const doseRepository = new DoseRepository();
const medicationRepository = new MedicationRepository();
const auditLogRepository = new AuditLogRepository();

// Validation middleware for dose data
const validateDoseData = (req, res, next) => {
  const { dose_amount, time_of_day } = req.body;
  
  const errors = [];
  
  if (!dose_amount || typeof dose_amount !== 'number' || dose_amount <= 0) {
    errors.push({ field: 'dose_amount', message: 'Dose amount is required and must be a positive number' });
  }
  
  if (!time_of_day || !time_of_day.match(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
    errors.push({ field: 'time_of_day', message: 'Time of day is required and must be in HH:MM format (24-hour)' });
  }
  
  if (req.body.route_override && !Number.isInteger(req.body.route_override)) {
    errors.push({ field: 'route_override', message: 'Route override must be an integer' });
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid dose data',
        details: errors
      }
    });
  }
  
  next();
};

// Middleware to validate medication exists
const validateMedicationExists = async (req, res, next) => {
  try {
    const medicationId = parseInt(req.params.medicationId);
    
    if (!Number.isInteger(medicationId)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid medication ID',
          details: [{ field: 'medicationId', message: 'Medication ID must be an integer' }]
        }
      });
    }
    
    const medication = await medicationRepository.findById(medicationId);
    if (!medication) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Medication not found'
        }
      });
    }
    
    req.medication = medication;
    next();
  } catch (error) {
    console.error('Error validating medication:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to validate medication',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
};

// GET /api/medications/:medicationId/doses - Get all doses for a medication
router.get('/', validateMedicationExists, async (req, res) => {
  try {
    const medicationId = parseInt(req.params.medicationId);
    const doses = await doseRepository.findByMedicationId(medicationId);
    
    res.json({
      data: doses,
      count: doses.length,
      medication_id: medicationId
    });
  } catch (error) {
    console.error('Error fetching doses:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch doses',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// GET /api/medications/:medicationId/doses/:doseId - Get specific dose
router.get('/:doseId', validateMedicationExists, async (req, res) => {
  try {
    const doseId = parseInt(req.params.doseId);
    
    if (!Number.isInteger(doseId)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid dose ID',
          details: [{ field: 'doseId', message: 'Dose ID must be an integer' }]
        }
      });
    }
    
    const dose = await doseRepository.findById(doseId);
    
    if (!dose) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Dose not found'
        }
      });
    }
    
    // Verify dose belongs to the medication
    if (dose.medicine_id !== parseInt(req.params.medicationId)) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Dose not found for this medication'
        }
      });
    }
    
    res.json({
      data: dose
    });
  } catch (error) {
    console.error('Error fetching dose:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch dose',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// POST /api/medications/:medicationId/doses - Create new dose
router.post('/', validateMedicationExists, validateDoseData, async (req, res) => {
  try {
    const medicationId = parseInt(req.params.medicationId);
    
    const doseData = {
      medicine_id: medicationId,
      dose_amount: req.body.dose_amount,
      time_of_day: req.body.time_of_day,
      route_override: req.body.route_override || null,
      instructions: req.body.instructions?.trim() || null
    };
    
    const dose = await doseRepository.create(doseData);
    
    // Log the creation
    await auditLogRepository.create({
      medicine_id: medicationId,
      action: 'DOSE_CREATED',
      new_values: dose.toDbFormat()
    });
    
    res.status(201).json({
      data: dose,
      message: 'Dose created successfully'
    });
  } catch (error) {
    console.error('Error creating dose:', error);
    
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
        message: 'Failed to create dose',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// PUT /api/medications/:medicationId/doses/:doseId - Update dose
router.put('/:doseId', validateMedicationExists, validateDoseData, async (req, res) => {
  try {
    const medicationId = parseInt(req.params.medicationId);
    const doseId = parseInt(req.params.doseId);
    
    if (!Number.isInteger(doseId)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid dose ID',
          details: [{ field: 'doseId', message: 'Dose ID must be an integer' }]
        }
      });
    }
    
    // Check if dose exists and belongs to medication
    const existingDose = await doseRepository.findById(doseId);
    if (!existingDose) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Dose not found'
        }
      });
    }
    
    if (existingDose.medicine_id !== medicationId) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Dose not found for this medication'
        }
      });
    }
    
    const updateData = {
      dose_amount: req.body.dose_amount,
      time_of_day: req.body.time_of_day,
      route_override: req.body.route_override || null,
      instructions: req.body.instructions?.trim() || null
    };
    
    const updatedDose = await doseRepository.update(doseId, updateData);
    
    // Log the update
    await auditLogRepository.create({
      medicine_id: medicationId,
      action: 'DOSE_UPDATED',
      old_values: existingDose.toDbFormat(),
      new_values: updatedDose.toDbFormat()
    });
    
    res.json({
      data: updatedDose,
      message: 'Dose updated successfully'
    });
  } catch (error) {
    console.error('Error updating dose:', error);
    
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
        message: 'Failed to update dose',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// DELETE /api/medications/:medicationId/doses/:doseId - Delete dose
router.delete('/:doseId', validateMedicationExists, async (req, res) => {
  try {
    const medicationId = parseInt(req.params.medicationId);
    const doseId = parseInt(req.params.doseId);
    
    if (!Number.isInteger(doseId)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid dose ID',
          details: [{ field: 'doseId', message: 'Dose ID must be an integer' }]
        }
      });
    }
    
    // Check if dose exists and belongs to medication
    const existingDose = await doseRepository.findById(doseId);
    if (!existingDose) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Dose not found'
        }
      });
    }
    
    if (existingDose.medicine_id !== medicationId) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Dose not found for this medication'
        }
      });
    }
    
    const deleted = await doseRepository.delete(doseId);
    
    if (deleted) {
      // Log the deletion
      await auditLogRepository.create({
        medicine_id: medicationId,
        action: 'DOSE_DELETED',
        old_values: existingDose.toDbFormat()
      });
      
      res.json({
        message: 'Dose deleted successfully'
      });
    } else {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete dose'
        }
      });
    }
  } catch (error) {
    console.error('Error deleting dose:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete dose',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

module.exports = router;