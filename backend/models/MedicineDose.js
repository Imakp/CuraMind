class MedicineDose {
  constructor(data = {}) {
    this.id = data.id !== undefined ? data.id : null;
    this.medicine_id = data.medicine_id !== undefined ? data.medicine_id : null;
    this.dose_amount = data.dose_amount !== undefined ? data.dose_amount : null;
    this.time_of_day = data.time_of_day !== undefined ? data.time_of_day : null;
    this.route_override = data.route_override !== undefined ? data.route_override : null;
    this.instructions = data.instructions || '';
    this.created_at = data.created_at !== undefined ? data.created_at : null;
  }

  // Validation methods
  validate() {
    const errors = [];

    // Required field validations
    if (this.medicine_id === null || this.medicine_id === undefined) {
      errors.push({ field: 'medicine_id', message: 'Medicine ID is required' });
    } else if (!Number.isInteger(this.medicine_id) || this.medicine_id <= 0) {
      errors.push({ field: 'medicine_id', message: 'Medicine ID must be a positive integer' });
    }

    if (this.dose_amount === null || this.dose_amount === undefined) {
      errors.push({ field: 'dose_amount', message: 'Dose amount is required' });
    } else if (typeof this.dose_amount !== 'number') {
      errors.push({ field: 'dose_amount', message: 'Dose amount must be a number' });
    } else if (this.dose_amount <= 0) {
      errors.push({ field: 'dose_amount', message: 'Dose amount must be a positive number' });
    }

    if (!this.time_of_day) {
      errors.push({ field: 'time_of_day', message: 'Time of day is required' });
    } else if (!this.isValidTimeFormat(this.time_of_day)) {
      errors.push({ field: 'time_of_day', message: 'Time of day must be in HH:MM format (24-hour)' });
    }

    // Optional field validations
    if (this.route_override !== null && this.route_override !== undefined) {
      if (!Number.isInteger(this.route_override) || this.route_override <= 0) {
        errors.push({ field: 'route_override', message: 'Route override must be a positive integer' });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate time format (HH:MM in 24-hour format)
  isValidTimeFormat(timeString) {
    if (!timeString || typeof timeString !== 'string') {
      return false;
    }

    // Check format HH:MM
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(timeString)) {
      return false;
    }

    // Additional validation to ensure it's a valid time
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
  }

  // Convert time to minutes since midnight for sorting
  getTimeInMinutes() {
    if (!this.isValidTimeFormat(this.time_of_day)) {
      return 0;
    }

    const [hours, minutes] = this.time_of_day.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Format time for display (can be extended for 12-hour format)
  getFormattedTime(format = '24h') {
    if (!this.isValidTimeFormat(this.time_of_day)) {
      return this.time_of_day;
    }

    if (format === '12h') {
      const [hours, minutes] = this.time_of_day.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    }

    return this.time_of_day;
  }

  // Check if this dose should be taken at a specific time (with tolerance)
  isScheduledAt(timeString, toleranceMinutes = 0) {
    if (!this.isValidTimeFormat(timeString)) {
      return false;
    }

    const doseMinutes = this.getTimeInMinutes();
    const checkMinutes = this.convertTimeToMinutes(timeString);

    if (toleranceMinutes === 0) {
      return doseMinutes === checkMinutes;
    }

    return Math.abs(doseMinutes - checkMinutes) <= toleranceMinutes;
  }

  // Helper method to convert any time string to minutes
  convertTimeToMinutes(timeString) {
    if (!this.isValidTimeFormat(timeString)) {
      return 0;
    }

    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Calculate total daily dose amount for this dose entry
  getDailyDoseAmount() {
    return this.dose_amount;
  }

  // Convert to database format
  toDbFormat() {
    return {
      id: this.id,
      medicine_id: this.medicine_id,
      dose_amount: this.dose_amount,
      time_of_day: this.time_of_day,
      route_override: this.route_override,
      instructions: this.instructions.trim()
    };
  }

  // Create from database row
  static fromDbRow(row) {
    return new MedicineDose({
      id: row.id,
      medicine_id: row.medicine_id,
      dose_amount: parseFloat(row.dose_amount),
      time_of_day: row.time_of_day,
      route_override: row.route_override,
      instructions: row.instructions,
      created_at: row.created_at
    });
  }

  // Sort doses by time of day
  static sortByTime(doses) {
    return doses.sort((a, b) => a.getTimeInMinutes() - b.getTimeInMinutes());
  }

  // Group doses by time periods (morning, afternoon, evening, night)
  static groupByTimePeriod(doses) {
    const periods = {
      morning: [],    // 06:00 - 11:59
      afternoon: [],  // 12:00 - 17:59
      evening: [],    // 18:00 - 21:59
      night: []       // 22:00 - 05:59
    };

    doses.forEach(dose => {
      const minutes = dose.getTimeInMinutes();
      const hours = Math.floor(minutes / 60);

      if (hours >= 6 && hours < 12) {
        periods.morning.push(dose);
      } else if (hours >= 12 && hours < 18) {
        periods.afternoon.push(dose);
      } else if (hours >= 18 && hours < 22) {
        periods.evening.push(dose);
      } else {
        periods.night.push(dose);
      }
    });

    return periods;
  }
}

module.exports = MedicineDose;