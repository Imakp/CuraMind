const express = require('express');
const ScheduleService = require('../services/ScheduleService');

const router = express.Router();
const scheduleService = new ScheduleService();

// GET /api/schedule/daily?date=YYYY-MM-DD - Get daily schedule
router.get('/daily', async (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().split('T')[0];

        // Validate date format
        if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid date format',
                    details: [{ field: 'date', message: 'Date must be in YYYY-MM-DD format' }]
                }
            });
        }

        const schedule = await scheduleService.generateDailySchedule(date);

        res.json({
            data: schedule
        });
    } catch (error) {
        console.error('Error fetching daily schedule:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to fetch daily schedule',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }
        });
    }
});

// GET /api/schedule/summary?date=YYYY-MM-DD - Get schedule summary
router.get('/summary', async (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().split('T')[0];

        // Validate date format
        if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid date format',
                    details: [{ field: 'date', message: 'Date must be in YYYY-MM-DD format' }]
                }
            });
        }

        const summary = await scheduleService.getScheduleSummary(date);

        res.json({
            data: summary
        });
    } catch (error) {
        console.error('Error fetching schedule summary:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to fetch schedule summary',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }
        });
    }
});

module.exports = router;