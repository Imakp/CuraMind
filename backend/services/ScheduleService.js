const MedicationRepository = require('../repositories/MedicationRepository');
const DoseRepository = require('../repositories/DoseRepository');
const SkipDateRepository = require('../repositories/SkipDateRepository');

class ScheduleService {
  constructor() {
    this.medicationRepository = new MedicationRepository();
    this.doseRepository = new DoseRepository();
    this.skipDateRepository = new SkipDateRepository();
  }

  // Generate daily medication schedule for a specific date
  async generateDailySchedule(date) {
    try {
      // Validate date format
      if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        throw new Error('Date must be in YYYY-MM-DD format');
      }

      // Get active medications for the date
      const activeMedications = await this.medicationRepository.findActiveByDate(date);
      
      if (activeMedications.length === 0) {
        return {
          date,
          medications: [],
          schedule: {
            morning: [],
            afternoon: [],
            evening: [],
            night: []
          },
          total_medications: 0,
          total_doses: 0
        };
      }

      // Get medication IDs
      const medicationIds = activeMedications.map(med => med.id);

      // Get all doses for active medications
      const allDoses = await this.doseRepository.findByMedicationIds(medicationIds);

      // Get skip dates for active medications on this date
      const skipDates = await this.skipDateRepository.findByDate(date);
      const skippedMedicationIds = new Set(skipDates.map(skip => skip.medicine_id));

      // Filter out medications that should be skipped
      const scheduledMedications = activeMedications.filter(med => 
        !skippedMedicationIds.has(med.id)
      );

      // Build schedule entries
      const scheduleEntries = [];
      
      for (const medication of scheduledMedications) {
        const medicationDoses = allDoses.filter(dose => dose.medicine_id === medication.id);
        
        for (const dose of medicationDoses) {
          scheduleEntries.push({
            medication_id: medication.id,
            medication_name: medication.name,
            medication_strength: medication.strength,
            route: dose.route_name || medication.route_name,
            dose_id: dose.id,
            dose_amount: dose.dose_amount,
            time_of_day: dose.time_of_day,
            instructions: dose.instructions,
            remaining_tablets: medication.total_tablets,
            is_low_inventory: medication.total_tablets <= this.calculateDailyConsumption(medicationDoses)
          });
        }
      }

      // Group by time periods
      const groupedSchedule = this.groupScheduleByTimePeriod(scheduleEntries);

      return {
        date,
        medications: scheduledMedications,
        schedule: groupedSchedule,
        total_medications: scheduledMedications.length,
        total_doses: scheduleEntries.length,
        skipped_medications: activeMedications.filter(med => 
          skippedMedicationIds.has(med.id)
        ).map(med => ({
          id: med.id,
          name: med.name,
          reason: skipDates.find(skip => skip.medicine_id === med.id)?.reason || 'Skip date'
        }))
      };
    } catch (error) {
      throw new Error(`Failed to generate daily schedule: ${error.message}`);
    }
  }

  // Generate schedule for multiple days
  async generateMultiDaySchedule(startDate, endDate) {
    try {
      // Validate date formats
      if (!startDate?.match(/^\d{4}-\d{2}-\d{2}$/) || !endDate?.match(/^\d{4}-\d{2}-\d{2}$/)) {
        throw new Error('Dates must be in YYYY-MM-DD format');
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start > end) {
        throw new Error('Start date must be before or equal to end date');
      }

      // Limit to reasonable range (max 30 days)
      const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      if (daysDiff > 30) {
        throw new Error('Date range cannot exceed 30 days');
      }

      const schedules = [];
      const currentDate = new Date(start);

      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dailySchedule = await this.generateDailySchedule(dateStr);
        schedules.push(dailySchedule);
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return {
        start_date: startDate,
        end_date: endDate,
        total_days: schedules.length,
        schedules
      };
    } catch (error) {
      throw new Error(`Failed to generate multi-day schedule: ${error.message}`);
    }
  }

  // Get schedule for current week
  async getWeeklySchedule(referenceDate = null) {
    try {
      const refDate = referenceDate ? new Date(referenceDate) : new Date();
      
      // Get start of week (Monday)
      const startOfWeek = new Date(refDate);
      const dayOfWeek = startOfWeek.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startOfWeek.setDate(startOfWeek.getDate() + daysToMonday);
      
      // Get end of week (Sunday)
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);

      const startDate = startOfWeek.toISOString().split('T')[0];
      const endDate = endOfWeek.toISOString().split('T')[0];

      return await this.generateMultiDaySchedule(startDate, endDate);
    } catch (error) {
      throw new Error(`Failed to get weekly schedule: ${error.message}`);
    }
  }

  // Calculate active days for a medication (excluding skip dates)
  async calculateActiveDays(medicationId, startDate = null, endDate = null) {
    try {
      const medication = await this.medicationRepository.findById(medicationId);
      if (!medication) {
        throw new Error('Medication not found');
      }

      const medStartDate = new Date(startDate || medication.start_date);
      const medEndDate = endDate ? new Date(endDate) : 
                         (medication.end_date ? new Date(medication.end_date) : new Date());

      if (medStartDate > medEndDate) {
        return 0;
      }

      // Calculate total days in range
      const totalDays = Math.ceil((medEndDate - medStartDate) / (1000 * 60 * 60 * 24)) + 1;

      // Get skip dates in the range
      const skipDates = await this.skipDateRepository.findByDateRange(
        medStartDate.toISOString().split('T')[0],
        medEndDate.toISOString().split('T')[0],
        medicationId
      );

      const activeDays = totalDays - skipDates.length;
      
      return {
        total_days: totalDays,
        skip_days: skipDates.length,
        active_days: Math.max(0, activeDays),
        skip_dates: skipDates.map(skip => skip.skip_date)
      };
    } catch (error) {
      throw new Error(`Failed to calculate active days: ${error.message}`);
    }
  }

  // Get next scheduled dose time for a medication
  async getNextScheduledDose(medicationId, fromDateTime = null) {
    try {
      const medication = await this.medicationRepository.findById(medicationId);
      if (!medication) {
        throw new Error('Medication not found');
      }

      const fromDate = fromDateTime ? new Date(fromDateTime) : new Date();
      const currentDate = fromDate.toISOString().split('T')[0];
      const currentTime = fromDate.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format

      // Check if medication is active today
      if (!medication.isActiveOnDate(currentDate)) {
        return null;
      }

      // Check if today is a skip date
      const isSkipDate = await this.skipDateRepository.shouldSkipOnDate(medicationId, currentDate);
      if (isSkipDate) {
        // Look for next non-skip date
        return await this.findNextNonSkipDate(medicationId, fromDate);
      }

      // Get doses for this medication
      const doses = await this.doseRepository.findByMedicationId(medicationId);
      if (doses.length === 0) {
        return null;
      }

      // Find next dose today
      const futureDosesToday = doses.filter(dose => dose.time_of_day > currentTime);
      
      if (futureDosesToday.length > 0) {
        // Return earliest future dose today
        const nextDose = futureDosesToday.sort((a, b) => 
          a.time_of_day.localeCompare(b.time_of_day)
        )[0];
        
        return {
          date: currentDate,
          time: nextDose.time_of_day,
          dose: nextDose,
          medication: medication
        };
      }

      // No more doses today, look for tomorrow
      return await this.findNextNonSkipDate(medicationId, fromDate, 1);
    } catch (error) {
      throw new Error(`Failed to get next scheduled dose: ${error.message}`);
    }
  }

  // Group schedule entries by time period
  groupScheduleByTimePeriod(scheduleEntries) {
    const periods = {
      morning: [],    // 05:00 - 11:59
      afternoon: [],  // 12:00 - 16:59
      evening: [],    // 17:00 - 21:59
      night: []       // 22:00 - 04:59
    };

    for (const entry of scheduleEntries) {
      const time = entry.time_of_day;
      const hour = parseInt(time.split(':')[0]);

      if (hour >= 5 && hour < 12) {
        periods.morning.push(entry);
      } else if (hour >= 12 && hour < 17) {
        periods.afternoon.push(entry);
      } else if (hour >= 17 && hour < 22) {
        periods.evening.push(entry);
      } else {
        periods.night.push(entry);
      }
    }

    // Sort each period by time
    Object.keys(periods).forEach(period => {
      periods[period].sort((a, b) => a.time_of_day.localeCompare(b.time_of_day));
    });

    return periods;
  }

  // Calculate daily consumption for a medication
  calculateDailyConsumption(doses) {
    return doses.reduce((total, dose) => total + dose.dose_amount, 0);
  }

  // Find next non-skip date for a medication
  async findNextNonSkipDate(medicationId, fromDate, daysAhead = 0) {
    try {
      const medication = await this.medicationRepository.findById(medicationId);
      if (!medication) {
        return null;
      }

      const doses = await this.doseRepository.findByMedicationId(medicationId);
      if (doses.length === 0) {
        return null;
      }

      const searchDate = new Date(fromDate);
      searchDate.setDate(searchDate.getDate() + daysAhead + 1);

      // Limit search to 30 days ahead
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(searchDate);
        checkDate.setDate(checkDate.getDate() + i);
        const checkDateStr = checkDate.toISOString().split('T')[0];

        // Check if medication is active on this date
        if (!medication.isActiveOnDate(checkDateStr)) {
          continue;
        }

        // Check if this is a skip date
        const isSkipDate = await this.skipDateRepository.shouldSkipOnDate(medicationId, checkDateStr);
        if (!isSkipDate) {
          // Found a non-skip date, return first dose of the day
          const firstDose = doses.sort((a, b) => 
            a.time_of_day.localeCompare(b.time_of_day)
          )[0];

          return {
            date: checkDateStr,
            time: firstDose.time_of_day,
            dose: firstDose,
            medication: medication
          };
        }
      }

      return null; // No non-skip date found within 30 days
    } catch (error) {
      throw new Error(`Failed to find next non-skip date: ${error.message}`);
    }
  }

  // Get schedule summary for dashboard
  async getScheduleSummary(date) {
    try {
      const schedule = await this.generateDailySchedule(date);
      
      const summary = {
        date: schedule.date,
        total_medications: schedule.total_medications,
        total_doses: schedule.total_doses,
        periods: {
          morning: schedule.schedule.morning.length,
          afternoon: schedule.schedule.afternoon.length,
          evening: schedule.schedule.evening.length,
          night: schedule.schedule.night.length
        },
        low_inventory_count: schedule.schedule.morning
          .concat(schedule.schedule.afternoon)
          .concat(schedule.schedule.evening)
          .concat(schedule.schedule.night)
          .filter(entry => entry.is_low_inventory).length,
        skipped_count: schedule.skipped_medications.length
      };

      return summary;
    } catch (error) {
      throw new Error(`Failed to get schedule summary: ${error.message}`);
    }
  }

  // Validate schedule generation parameters
  validateScheduleParams(params) {
    const errors = [];

    if (params.date && !params.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      errors.push('Date must be in YYYY-MM-DD format');
    }

    if (params.startDate && !params.startDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      errors.push('Start date must be in YYYY-MM-DD format');
    }

    if (params.endDate && !params.endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      errors.push('End date must be in YYYY-MM-DD format');
    }

    if (params.startDate && params.endDate) {
      const start = new Date(params.startDate);
      const end = new Date(params.endDate);
      
      if (start > end) {
        errors.push('Start date must be before or equal to end date');
      }

      const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      if (daysDiff > 30) {
        errors.push('Date range cannot exceed 30 days');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = ScheduleService;