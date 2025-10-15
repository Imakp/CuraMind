const express = require('express');
const RouteRepository = require('../repositories/RouteRepository');
const FrequencyRepository = require('../repositories/FrequencyRepository');

const router = express.Router();
const routeRepository = new RouteRepository();
const frequencyRepository = new FrequencyRepository();

// Validation middleware for route data
const validateRouteData = (req, res, next) => {
  const { name } = req.body;
  
  const errors = [];
  
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name is required and must be a non-empty string' });
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid route data',
        details: errors
      }
    });
  }
  
  next();
};

// Validation middleware for frequency data
const validateFrequencyData = (req, res, next) => {
  const { name } = req.body;
  
  const errors = [];
  
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name is required and must be a non-empty string' });
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid frequency data',
        details: errors
      }
    });
  }
  
  next();
};

// Routes endpoints
// GET /api/settings/routes - Get all routes
router.get('/routes', async (req, res) => {
  try {
    const routes = await routeRepository.findAll();
    
    res.json({
      data: routes,
      count: routes.length
    });
  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch routes',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// GET /api/settings/routes/:id - Get specific route
router.get('/routes/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (!Number.isInteger(id)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid route ID',
          details: [{ field: 'id', message: 'ID must be an integer' }]
        }
      });
    }
    
    const route = await routeRepository.findById(id);
    
    if (!route) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Route not found'
        }
      });
    }
    
    res.json({
      data: route
    });
  } catch (error) {
    console.error('Error fetching route:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch route',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// POST /api/settings/routes - Create new route
router.post('/routes', validateRouteData, async (req, res) => {
  try {
    const routeData = {
      name: req.body.name.trim(),
      description: req.body.description?.trim() || null
    };
    
    const route = await routeRepository.create(routeData);
    
    res.status(201).json({
      data: route,
      message: 'Route created successfully'
    });
  } catch (error) {
    console.error('Error creating route:', error);
    
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Route name already exists'
        }
      });
    }
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create route',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// PUT /api/settings/routes/:id - Update route
router.put('/routes/:id', validateRouteData, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (!Number.isInteger(id)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid route ID',
          details: [{ field: 'id', message: 'ID must be an integer' }]
        }
      });
    }
    
    const updateData = {
      name: req.body.name.trim(),
      description: req.body.description?.trim() || null
    };
    
    const route = await routeRepository.update(id, updateData);
    
    if (!route) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Route not found'
        }
      });
    }
    
    res.json({
      data: route,
      message: 'Route updated successfully'
    });
  } catch (error) {
    console.error('Error updating route:', error);
    
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Route name already exists'
        }
      });
    }
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update route',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// DELETE /api/settings/routes/:id - Delete route
router.delete('/routes/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (!Number.isInteger(id)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid route ID',
          details: [{ field: 'id', message: 'ID must be an integer' }]
        }
      });
    }
    
    // Check if route is referenced by any medications
    const isReferenced = await routeRepository.isReferenced(id);
    
    if (isReferenced) {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Cannot delete route that is referenced by medications'
        }
      });
    }
    
    const deleted = await routeRepository.delete(id);
    
    if (!deleted) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Route not found'
        }
      });
    }
    
    res.json({
      message: 'Route deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting route:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete route',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// Frequencies endpoints
// GET /api/settings/frequencies - Get all frequencies
router.get('/frequencies', async (req, res) => {
  try {
    const frequencies = await frequencyRepository.findAll();
    
    res.json({
      data: frequencies,
      count: frequencies.length
    });
  } catch (error) {
    console.error('Error fetching frequencies:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch frequencies',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// GET /api/settings/frequencies/:id - Get specific frequency
router.get('/frequencies/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (!Number.isInteger(id)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid frequency ID',
          details: [{ field: 'id', message: 'ID must be an integer' }]
        }
      });
    }
    
    const frequency = await frequencyRepository.findById(id);
    
    if (!frequency) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Frequency not found'
        }
      });
    }
    
    res.json({
      data: frequency
    });
  } catch (error) {
    console.error('Error fetching frequency:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch frequency',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// POST /api/settings/frequencies - Create new frequency
router.post('/frequencies', validateFrequencyData, async (req, res) => {
  try {
    const frequencyData = {
      name: req.body.name.trim(),
      description: req.body.description?.trim() || null
    };
    
    const frequency = await frequencyRepository.create(frequencyData);
    
    res.status(201).json({
      data: frequency,
      message: 'Frequency created successfully'
    });
  } catch (error) {
    console.error('Error creating frequency:', error);
    
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Frequency name already exists'
        }
      });
    }
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create frequency',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// PUT /api/settings/frequencies/:id - Update frequency
router.put('/frequencies/:id', validateFrequencyData, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (!Number.isInteger(id)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid frequency ID',
          details: [{ field: 'id', message: 'ID must be an integer' }]
        }
      });
    }
    
    const updateData = {
      name: req.body.name.trim(),
      description: req.body.description?.trim() || null
    };
    
    const frequency = await frequencyRepository.update(id, updateData);
    
    if (!frequency) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Frequency not found'
        }
      });
    }
    
    res.json({
      data: frequency,
      message: 'Frequency updated successfully'
    });
  } catch (error) {
    console.error('Error updating frequency:', error);
    
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Frequency name already exists'
        }
      });
    }
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update frequency',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// DELETE /api/settings/frequencies/:id - Delete frequency
router.delete('/frequencies/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (!Number.isInteger(id)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid frequency ID',
          details: [{ field: 'id', message: 'ID must be an integer' }]
        }
      });
    }
    
    // Check if frequency is referenced by any medications
    const isReferenced = await frequencyRepository.isReferenced(id);
    
    if (isReferenced) {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Cannot delete frequency that is referenced by medications'
        }
      });
    }
    
    const deleted = await frequencyRepository.delete(id);
    
    if (!deleted) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Frequency not found'
        }
      });
    }
    
    res.json({
      message: 'Frequency deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting frequency:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete frequency',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

module.exports = router;