const NotificationRepository = require('../repositories/NotificationRepository');
const InventoryService = require('./InventoryService');
const MedicationRepository = require('../repositories/MedicationRepository');
const DoseRepository = require('../repositories/DoseRepository');
const cron = require('node-cron');

class NotificationService {
  constructor() {
    this.notificationRepository = new NotificationRepository();
    this.inventoryService = new InventoryService();
    this.medicationRepository = new MedicationRepository();
    this.doseRepository = new DoseRepository();
    this.backgroundJobs = new Map();
  }

  // Generate buy-soon alerts for all medications
  async generateBuySoonAlerts(daysAhead = 1) {
    if (!Number.isInteger(daysAhead) || daysAhead < 1 || daysAhead > 30) {
      throw new Error('Days ahead must be an integer between 1 and 30');
    }

    try {
      const alerts = await this.inventoryService.calculateBuySoonAlerts(daysAhead);
      const notifications = [];

      for (const alert of alerts) {
        if (alert.needs_refill) {
          // Check if we already have a recent buy-soon notification for this medication
          const existingNotification = await this.notificationRepository.existsByTypeAndMedication(
            'BUY_SOON', 
            alert.medication_id, 
            24 // Within last 24 hours
          );

          if (!existingNotification) {
            const notification = await this.notificationRepository.createBuySoonNotification(
              alert.medication_id,
              alert
            );
            
            if (notification) {
              notifications.push(notification);
            }
          }
        }
      }

      return {
        alerts_checked: alerts.length,
        notifications_created: notifications.length,
        notifications: notifications
      };
    } catch (error) {
      throw new Error(`Failed to generate buy-soon alerts: ${error.message}`);
    }
  }

  // Generate dose due notifications for upcoming doses
  async generateDoseDueNotifications(minutesAhead = 15) {
    if (!Number.isInteger(minutesAhead) || minutesAhead < 1 || minutesAhead > 120) {
      throw new Error('Minutes ahead must be an integer between 1 and 120');
    }

    try {
      const now = new Date();
      const targetTime = new Date(now.getTime() + (minutesAhead * 60 * 1000));
      const today = now.toISOString().split('T')[0];
      
      // Get all active medications for today
      const activeMedications = await this.medicationRepository.findActiveByDate(today);
      const notifications = [];

      for (const medication of activeMedications) {
        // Get doses for this medication
        const doses = await this.doseRepository.findByMedicationId(medication.id);
        
        for (const dose of doses) {
          // Create a datetime for the dose today
          const doseDateTime = new Date(`${today}T${dose.time_of_day}`);
          
          // Check if this dose is due within the specified time window
          if (doseDateTime >= now && doseDateTime <= targetTime) {
            // Check if we already have a notification for this dose today
            const existingNotification = await this.notificationRepository.existsByTypeAndMedication(
              'DOSE_DUE',
              medication.id,
              1 // Within last 1 hour
            );

            if (!existingNotification) {
              const doseData = {
                medication_name: medication.name,
                medication_strength: medication.strength,
                dose_amount: dose.dose_amount,
                time_of_day: dose.time_of_day,
                route: dose.route_override || medication.route_name,
                instructions: dose.instructions,
                scheduled_time: doseDateTime.toISOString()
              };

              const notification = await this.notificationRepository.createDoseDueNotification(
                medication.id,
                doseData
              );
              
              notifications.push(notification);
            }
          }
        }
      }

      return {
        medications_checked: activeMedications.length,
        notifications_created: notifications.length,
        notifications: notifications
      };
    } catch (error) {
      throw new Error(`Failed to generate dose due notifications: ${error.message}`);
    }
  }

  // Generate missed dose notifications for overdue doses
  async generateMissedDoseNotifications(hoursOverdue = 1) {
    if (!Number.isInteger(hoursOverdue) || hoursOverdue < 1 || hoursOverdue > 24) {
      throw new Error('Hours overdue must be an integer between 1 and 24');
    }

    try {
      const now = new Date();
      const overdueThreshold = new Date(now.getTime() - (hoursOverdue * 60 * 60 * 1000));
      const today = now.toISOString().split('T')[0];
      
      // Get all active medications for today
      const activeMedications = await this.medicationRepository.findActiveByDate(today);
      const notifications = [];

      for (const medication of activeMedications) {
        // Get doses for this medication
        const doses = await this.doseRepository.findByMedicationId(medication.id);
        
        for (const dose of doses) {
          // Create a datetime for the dose today
          const doseDateTime = new Date(`${today}T${dose.time_of_day}`);
          
          // Check if this dose is overdue
          if (doseDateTime <= overdueThreshold) {
            // Check if we already have a missed dose notification for this dose today
            const existingNotification = await this.notificationRepository.existsByTypeAndMedication(
              'MISSED_DOSE',
              medication.id,
              6 // Within last 6 hours to avoid spam
            );

            if (!existingNotification) {
              const doseData = {
                medication_name: medication.name,
                medication_strength: medication.strength,
                dose_amount: dose.dose_amount,
                time_of_day: dose.time_of_day,
                route: dose.route_override || medication.route_name,
                instructions: dose.instructions,
                scheduled_time: doseDateTime.toISOString(),
                hours_overdue: Math.floor((now - doseDateTime) / (1000 * 60 * 60))
              };

              const notification = await this.notificationRepository.createMissedDoseNotification(
                medication.id,
                doseData
              );
              
              notifications.push(notification);
            }
          }
        }
      }

      return {
        medications_checked: activeMedications.length,
        notifications_created: notifications.length,
        notifications: notifications
      };
    } catch (error) {
      throw new Error(`Failed to generate missed dose notifications: ${error.message}`);
    }
  }

  // Get all notifications with filtering options
  async getNotifications(options = {}) {
    try {
      return await this.notificationRepository.findAll(options);
    } catch (error) {
      throw new Error(`Failed to get notifications: ${error.message}`);
    }
  }

  // Get unread notifications
  async getUnreadNotifications(medicineId = null) {
    try {
      const options = { is_read: false };
      if (medicineId) {
        options.medicine_id = medicineId;
      }
      return await this.notificationRepository.findAll(options);
    } catch (error) {
      throw new Error(`Failed to get unread notifications: ${error.message}`);
    }
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId) {
    if (!notificationId || !Number.isInteger(parseInt(notificationId))) {
      throw new Error('Valid notification ID is required');
    }

    try {
      return await this.notificationRepository.markAsRead(notificationId);
    } catch (error) {
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  // Mark multiple notifications as read
  async markMultipleNotificationsAsRead(notificationIds) {
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      throw new Error('Array of notification IDs is required');
    }

    try {
      return await this.notificationRepository.markMultipleAsRead(notificationIds);
    } catch (error) {
      throw new Error(`Failed to mark notifications as read: ${error.message}`);
    }
  }

  // Mark all notifications as read for a medication
  async markAllNotificationsAsReadForMedication(medicineId) {
    if (!medicineId || !Number.isInteger(parseInt(medicineId))) {
      throw new Error('Valid medication ID is required');
    }

    try {
      return await this.notificationRepository.markAllAsReadForMedication(medicineId);
    } catch (error) {
      throw new Error(`Failed to mark all notifications as read: ${error.message}`);
    }
  }

  // Delete notification
  async deleteNotification(notificationId) {
    if (!notificationId || !Number.isInteger(parseInt(notificationId))) {
      throw new Error('Valid notification ID is required');
    }

    try {
      return await this.notificationRepository.deleteById(notificationId);
    } catch (error) {
      throw new Error(`Failed to delete notification: ${error.message}`);
    }
  }

  // Get notification statistics
  async getNotificationStats(medicineId = null) {
    try {
      return await this.notificationRepository.getStats(medicineId);
    } catch (error) {
      throw new Error(`Failed to get notification statistics: ${error.message}`);
    }
  }

  // Get notification summary by type
  async getNotificationSummary() {
    try {
      return await this.notificationRepository.getSummaryByType();
    } catch (error) {
      throw new Error(`Failed to get notification summary: ${error.message}`);
    }
  }

  // Clean up old notifications
  async cleanupOldNotifications(daysOld = 30) {
    if (!Number.isInteger(daysOld) || daysOld < 1 || daysOld > 365) {
      throw new Error('Days old must be an integer between 1 and 365');
    }

    try {
      const deletedCount = await this.notificationRepository.deleteOldNotifications(daysOld);
      return {
        deleted_count: deletedCount,
        cleanup_date: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to cleanup old notifications: ${error.message}`);
    }
  }

  // Start background job for buy-soon alerts
  startBuySoonAlertJob(cronExpression = '0 8 * * *') { // Daily at 8 AM
    if (this.backgroundJobs.has('buySoonAlerts')) {
      this.stopBuySoonAlertJob();
    }

    const job = cron.schedule(cronExpression, async () => {
      try {
        console.log('Running buy-soon alerts job...');
        const result = await this.generateBuySoonAlerts(1);
        console.log(`Buy-soon alerts job completed: ${result.notifications_created} notifications created`);
      } catch (error) {
        console.error('Buy-soon alerts job failed:', error.message);
      }
    }, {
      scheduled: false
    });

    this.backgroundJobs.set('buySoonAlerts', job);
    job.start();
    
    return {
      job_name: 'buySoonAlerts',
      cron_expression: cronExpression,
      status: 'started'
    };
  }

  // Start background job for dose due notifications
  startDoseDueNotificationJob(cronExpression = '*/15 * * * *') { // Every 15 minutes
    if (this.backgroundJobs.has('doseDueNotifications')) {
      this.stopDoseDueNotificationJob();
    }

    const job = cron.schedule(cronExpression, async () => {
      try {
        console.log('Running dose due notifications job...');
        const result = await this.generateDoseDueNotifications(15);
        console.log(`Dose due notifications job completed: ${result.notifications_created} notifications created`);
      } catch (error) {
        console.error('Dose due notifications job failed:', error.message);
      }
    }, {
      scheduled: false
    });

    this.backgroundJobs.set('doseDueNotifications', job);
    job.start();
    
    return {
      job_name: 'doseDueNotifications',
      cron_expression: cronExpression,
      status: 'started'
    };
  }

  // Start background job for missed dose notifications
  startMissedDoseNotificationJob(cronExpression = '0 */2 * * *') { // Every 2 hours
    if (this.backgroundJobs.has('missedDoseNotifications')) {
      this.stopMissedDoseNotificationJob();
    }

    const job = cron.schedule(cronExpression, async () => {
      try {
        console.log('Running missed dose notifications job...');
        const result = await this.generateMissedDoseNotifications(1);
        console.log(`Missed dose notifications job completed: ${result.notifications_created} notifications created`);
      } catch (error) {
        console.error('Missed dose notifications job failed:', error.message);
      }
    }, {
      scheduled: false
    });

    this.backgroundJobs.set('missedDoseNotifications', job);
    job.start();
    
    return {
      job_name: 'missedDoseNotifications',
      cron_expression: cronExpression,
      status: 'started'
    };
  }

  // Start background job for cleanup
  startCleanupJob(cronExpression = '0 2 * * 0') { // Weekly on Sunday at 2 AM
    if (this.backgroundJobs.has('cleanup')) {
      this.stopCleanupJob();
    }

    const job = cron.schedule(cronExpression, async () => {
      try {
        console.log('Running notification cleanup job...');
        const result = await this.cleanupOldNotifications(30);
        console.log(`Cleanup job completed: ${result.deleted_count} old notifications deleted`);
      } catch (error) {
        console.error('Cleanup job failed:', error.message);
      }
    }, {
      scheduled: false
    });

    this.backgroundJobs.set('cleanup', job);
    job.start();
    
    return {
      job_name: 'cleanup',
      cron_expression: cronExpression,
      status: 'started'
    };
  }

  // Stop buy-soon alert job
  stopBuySoonAlertJob() {
    const job = this.backgroundJobs.get('buySoonAlerts');
    if (job) {
      job.stop();
      this.backgroundJobs.delete('buySoonAlerts');
      return { job_name: 'buySoonAlerts', status: 'stopped' };
    }
    return { job_name: 'buySoonAlerts', status: 'not_running' };
  }

  // Stop dose due notification job
  stopDoseDueNotificationJob() {
    const job = this.backgroundJobs.get('doseDueNotifications');
    if (job) {
      job.stop();
      this.backgroundJobs.delete('doseDueNotifications');
      return { job_name: 'doseDueNotifications', status: 'stopped' };
    }
    return { job_name: 'doseDueNotifications', status: 'not_running' };
  }

  // Stop missed dose notification job
  stopMissedDoseNotificationJob() {
    const job = this.backgroundJobs.get('missedDoseNotifications');
    if (job) {
      job.stop();
      this.backgroundJobs.delete('missedDoseNotifications');
      return { job_name: 'missedDoseNotifications', status: 'stopped' };
    }
    return { job_name: 'missedDoseNotifications', status: 'not_running' };
  }

  // Stop cleanup job
  stopCleanupJob() {
    const job = this.backgroundJobs.get('cleanup');
    if (job) {
      job.stop();
      this.backgroundJobs.delete('cleanup');
      return { job_name: 'cleanup', status: 'stopped' };
    }
    return { job_name: 'cleanup', status: 'not_running' };
  }

  // Start all background jobs with default schedules
  startAllBackgroundJobs() {
    const results = [];
    
    results.push(this.startBuySoonAlertJob());
    results.push(this.startDoseDueNotificationJob());
    results.push(this.startMissedDoseNotificationJob());
    results.push(this.startCleanupJob());
    
    return {
      message: 'All background jobs started',
      jobs: results
    };
  }

  // Stop all background jobs
  stopAllBackgroundJobs() {
    const results = [];
    
    results.push(this.stopBuySoonAlertJob());
    results.push(this.stopDoseDueNotificationJob());
    results.push(this.stopMissedDoseNotificationJob());
    results.push(this.stopCleanupJob());
    
    return {
      message: 'All background jobs stopped',
      jobs: results
    };
  }

  // Get status of all background jobs
  getBackgroundJobStatus() {
    const jobs = [];
    
    for (const [jobName, job] of this.backgroundJobs) {
      jobs.push({
        name: jobName,
        running: job.running || false,
        scheduled: job.scheduled || false
      });
    }
    
    return {
      total_jobs: jobs.length,
      jobs: jobs
    };
  }

  // Trigger immediate notification check (for testing or manual triggers)
  async triggerImmediateNotificationCheck() {
    try {
      const results = [];
      
      // Generate buy-soon alerts
      const buySoonResult = await this.generateBuySoonAlerts(1);
      results.push({
        type: 'buy_soon',
        ...buySoonResult
      });
      
      // Generate dose due notifications
      const doseDueResult = await this.generateDoseDueNotifications(15);
      results.push({
        type: 'dose_due',
        ...doseDueResult
      });
      
      // Generate missed dose notifications
      const missedDoseResult = await this.generateMissedDoseNotifications(1);
      results.push({
        type: 'missed_dose',
        ...missedDoseResult
      });
      
      return {
        message: 'Immediate notification check completed',
        timestamp: new Date().toISOString(),
        results: results
      };
    } catch (error) {
      throw new Error(`Failed to trigger immediate notification check: ${error.message}`);
    }
  }
}

module.exports = NotificationService;