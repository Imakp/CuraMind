const express = require('express');
const cors = require('cors');
const { testConnection, closePool } = require('./config/database');
const NotificationService = require('./services/NotificationService');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    res.json({
      status: 'ok',
      database: dbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Import routes
const medicationRoutes = require('./routes/medications');
const settingsRoutes = require('./routes/settings');
const notificationRoutes = require('./routes/notifications');
const scheduleRoutes = require('./routes/schedule');
const auditRoutes = require('./routes/audit');

// Basic API route
app.get('/api', (req, res) => {
  res.json({ message: 'Medication Management API' });
});

// API routes
app.use('/api/medications', medicationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/audit', auditRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');

  // Stop notification background jobs
  try {
    notificationService.stopAllBackgroundJobs();
    console.log('Notification background jobs stopped');
  } catch (error) {
    console.error('Error stopping notification jobs:', error.message);
  }

  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');

  // Stop notification background jobs
  try {
    notificationService.stopAllBackgroundJobs();
    console.log('Notification background jobs stopped');
  } catch (error) {
    console.error('Error stopping notification jobs:', error.message);
  }

  await closePool();
  process.exit(0);
});

// Initialize notification service and start background jobs
const notificationService = new NotificationService();

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);

  // Start background jobs for notifications
  try {
    const jobResults = notificationService.startAllBackgroundJobs();
    console.log('Notification background jobs started:', jobResults.jobs.map(j => j.job_name).join(', '));
  } catch (error) {
    console.error('Failed to start notification background jobs:', error.message);
  }
});

module.exports = app;