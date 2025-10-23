const express = require('express');
const AuditLogRepository = require('../repositories/AuditLogRepository');

const router = express.Router();
const auditLogRepository = new AuditLogRepository();

// Get all audit logs with filtering and pagination
router.get('/', async (req, res) => {
    try {
        const {
            medicine_id,
            action,
            start_date,
            end_date,
            quantity_filter,
            sort_by,
            sort_direction,
            limit,
            offset,
            page,
            per_page
        } = req.query;

        // Handle pagination
        let paginationOptions = {};
        if (page && per_page) {
            const pageNum = parseInt(page);
            const perPageNum = parseInt(per_page);
            paginationOptions.limit = perPageNum;
            paginationOptions.offset = (pageNum - 1) * perPageNum;
        } else if (limit) {
            paginationOptions.limit = parseInt(limit);
            if (offset) {
                paginationOptions.offset = parseInt(offset);
            }
        }

        const options = {
            medicine_id: medicine_id ? parseInt(medicine_id) : undefined,
            action,
            start_date,
            end_date,
            quantity_filter,
            sort_by,
            sort_direction,
            ...paginationOptions
        };

        const auditLogs = await auditLogRepository.findAll(options);

        res.json({
            success: true,
            data: auditLogs,
            pagination: {
                page: page ? parseInt(page) : 1,
                per_page: per_page ? parseInt(per_page) : auditLogs.length,
                total: auditLogs.length
            }
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch audit logs',
            message: error.message
        });
    }
});

// Get recent audit logs with default limit (must be before /:id route)
router.get('/recent', async (req, res) => {
    try {
        const { medicine_id } = req.query;

        const recentLogs = await auditLogRepository.findRecent(
            50,
            medicine_id ? parseInt(medicine_id) : null
        );

        res.json({
            success: true,
            data: recentLogs
        });
    } catch (error) {
        console.error('Error fetching recent audit logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch recent audit logs',
            message: error.message
        });
    }
});

// Get recent audit logs with custom limit (must be before /:id route)
router.get('/recent/:limit', async (req, res) => {
    try {
        const { limit } = req.params;
        const { medicine_id } = req.query;

        const recentLogs = await auditLogRepository.findRecent(
            limit ? parseInt(limit) : 50,
            medicine_id ? parseInt(medicine_id) : null
        );

        res.json({
            success: true,
            data: recentLogs
        });
    } catch (error) {
        console.error('Error fetching recent audit logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch recent audit logs',
            message: error.message
        });
    }
});

// Get audit log by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const auditLog = await auditLogRepository.findById(parseInt(id));

        if (!auditLog) {
            return res.status(404).json({
                success: false,
                error: 'Audit log not found'
            });
        }

        res.json({
            success: true,
            data: auditLog
        });
    } catch (error) {
        console.error('Error fetching audit log:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch audit log',
            message: error.message
        });
    }
});

// Get audit logs for a specific medication
router.get('/medication/:medicineId', async (req, res) => {
    try {
        const { medicineId } = req.params;
        const { limit, sort_by, sort_direction } = req.query;

        const options = {
            limit: limit ? parseInt(limit) : undefined,
            sort_by,
            sort_direction
        };

        const auditLogs = await auditLogRepository.findByMedicationId(parseInt(medicineId), options);

        res.json({
            success: true,
            data: auditLogs
        });
    } catch (error) {
        console.error('Error fetching medication audit logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch medication audit logs',
            message: error.message
        });
    }
});

// Get audit log statistics
router.get('/stats/summary', async (req, res) => {
    try {
        const { medicine_id } = req.query;
        const medicineId = medicine_id ? parseInt(medicine_id) : null;

        const stats = await auditLogRepository.getStats(medicineId);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error fetching audit stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch audit statistics',
            message: error.message
        });
    }
});

// Get daily activity summary
router.get('/stats/daily-activity', async (req, res) => {
    try {
        const { start_date, end_date, medicine_id } = req.query;

        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                error: 'start_date and end_date are required'
            });
        }

        const medicineId = medicine_id ? parseInt(medicine_id) : null;
        const activity = await auditLogRepository.getDailyActivity(start_date, end_date, medicineId);

        res.json({
            success: true,
            data: activity
        });
    } catch (error) {
        console.error('Error fetching daily activity:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch daily activity',
            message: error.message
        });
    }
});

// Get compliance data for a medication
router.get('/compliance/:medicineId', async (req, res) => {
    try {
        const { medicineId } = req.params;
        const { start_date, end_date } = req.query;

        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                error: 'start_date and end_date are required'
            });
        }

        const compliance = await auditLogRepository.getComplianceData(
            parseInt(medicineId),
            start_date,
            end_date
        );

        res.json({
            success: true,
            data: compliance
        });
    } catch (error) {
        console.error('Error fetching compliance data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch compliance data',
            message: error.message
        });
    }
});

// Get inventory timeline for a medication
router.get('/inventory-timeline/:medicineId', async (req, res) => {
    try {
        const { medicineId } = req.params;
        const { limit } = req.query;

        const timeline = await auditLogRepository.getInventoryTimeline(
            parseInt(medicineId),
            limit ? parseInt(limit) : 100
        );

        res.json({
            success: true,
            data: timeline
        });
    } catch (error) {
        console.error('Error fetching inventory timeline:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch inventory timeline',
            message: error.message
        });
    }
});

// Export audit logs
router.get('/export/logs', async (req, res) => {
    try {
        const {
            medicine_id,
            action,
            start_date,
            end_date,
            format = 'json'
        } = req.query;

        const options = {
            medicine_id: medicine_id ? parseInt(medicine_id) : undefined,
            action,
            start_date,
            end_date
        };

        const exportData = await auditLogRepository.exportLogs(options);

        if (format === 'csv') {
            // Convert to CSV format
            const csvHeaders = [
                'ID', 'Medication ID', 'Medication Name', 'Action',
                'Quantity Change', 'Created At', 'Old Values', 'New Values'
            ];

            const csvRows = exportData.logs.map(log => [
                log.id,
                log.medicine_id || '',
                log.medication_name || '',
                log.action,
                log.quantity_change || '',
                log.created_at,
                log.old_values ? JSON.stringify(log.old_values) : '',
                log.new_values ? JSON.stringify(log.new_values) : ''
            ]);

            const csvContent = [
                csvHeaders.join(','),
                ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
            ].join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.csv"`);
            res.send(csvContent);
        } else {
            // JSON format
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.json"`);
            res.json(exportData);
        }
    } catch (error) {
        console.error('Error exporting audit logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to export audit logs',
            message: error.message
        });
    }
});



module.exports = router;