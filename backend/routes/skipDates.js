const express = require('express');
const SkipDateRepository = require('../repositories/SkipDateRepository');
const MedicationRepository = require('../repositories/MedicationRepository');
const AuditLogRepository = require('../repositories/AuditLogRepository');

const router = express.Router({ mergeParams: true });
const skipDateRepository = new SkipDateRepository();
const medicationRepository = new MedicationRepository();
const auditLogRepository = new AuditLogRepository();

// Validation middleware for skip date data
const validateSkipDateData = (req, res, next) => {
  const { skip_date } = req.body;
  
  const errors = [];
  
  if (!skip_date || !skip_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    errors.push({ field: 'skip_date', message: 'Skip date is required and must be in YYYY-MM-DD format' });
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid skip date data',
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

// GET /api/medications/:medicationId/skip-dates - Get all skip dates for a medication
router.get('/', validateMedicationExists, async (req, res) => {
  try {
    const medicationId = parseInt(req.params.medicationId);
    const skipDates = await skipDateRepository.findByMedicationId(medicationId);
    
    res.json({
      data: skipDates,
      count: skipDates.length,
      medication_id: medicationId
    });
  } catch (error) {
    console.error('Error fetching skip dates:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch skip dates',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// POST /api/medications/:medicationId/skip-dates - Create new skip date
router.post('/', validateMedicationExists, validateSkipDateData, async (req, res) => {
  try {
    const medicationId = parseInt(req.params.medicationId);
    const skipDate = req.body.skip_date;
    
    // Validate skip date is within medication period
    const medication = req.medication;
    const skipDateObj = new Date(skipDate);
    const startDate = new Date(medication.start_date);
    
    if (skipDateObj < startDate) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Skip date cannot be before medication start date',
          details: [{ field: 'skip_date', message: 'Skip date must be on or after medication start date' }]
        }
      });
    }
    
    if (medication.end_date) {
      const endDate = new Date(medication.end_date);
      if (skipDateObj > endDate) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Skip date cannot be after medication end date',
            details: [{ field: 'skip_date', message: 'Skip date must be on or before medication end date' }]
          }
        });
      }
    }
    
    const skipDateData = {
      medicine_id: medicationId,
      skip_date: skipDate,
      reason: req.body.reason?.trim() || null
    };
    
    const createdSkipDate = await skipDateRepository.create(skipDateData);
    
    // Log the creation
    await auditLogRepository.create({
      medicine_id: medicationId,
      action: 'SKIP_DATE_CREATED',
      new_values: createdSkipDate.toDbFormat()
    });
    
    res.status(201).json({
      data: createdSkipDate,
      message: 'Skip date created successfully'
    });
  } catch (error) {
    console.error('Error creating skip date:', error);
    
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Skip date already exists for this medication'
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
        message: 'Failed to create skip date',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// DELETE /api/medications/:medicationId/skip-dates/:skipDateId - Delete skip date
router.delete('/:skipDateId', validateMedicationExists, async (req, res) => {
  try {
    const medicationId = parseInt(req.params.medicationId);
    const skipDateId = parseInt(req.params.skipDateId);
    
    if (!Number.isInteger(skipDateId)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid skip date ID',
          details: [{ field: 'skipDateId', message: 'Skip date ID must be an integer' }]
        }
      });
    }
    
    // Check if skip date exists and belongs to medication
    const existingSkipDate = await skipDateRepository.findById(skipDateId);
    if (!existingSkipDate) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Skip date not found'
        }
      });
    }
    
    if (existingSkipDate.medicine_id !== medicationId) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Skip date not found for this medication'
        }
      });
    }
    
    const deleted = await skipDateRepository.delete(skipDateId);
    
    if (deleted) {
      // Log the deletion
      await auditLogRepository.create({
        medicine_id: medicationId,
        action: 'SKIP_DATE_DELETED',
        old_values: existingSkipDate.toDbFormat()
      });
      
      res.json({
        message: 'Skip date deleted successfully'
      });
    } else {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete skip date'
        }
      });
    }
  } catch (error) {
    console.error('Error deleting skip date:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete skip date',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

module.exports = router;