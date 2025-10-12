class SkipDate {
  constructor(data = {}) {
    this.id = data.id !== undefined ? data.id : null;
    this.medicine_id = data.medicine_id !== undefined ? data.medicine_id : null;
    this.skip_date = data.skip_date !== undefined ? data.skip_date : null;
    this.reason = data.reason || '';
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

    if (!this.skip_date) {
      errors.push({ field: 'skip_date', message: 'Skip date is required' });
    } else if (!this.isValidDate(this.skip_date)) {
      errors.push({ field: 'skip_date', message: 'Skip date must be a valid date in YYYY-MM-DD format' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate date format and value
  isValidDate(dateString) {
    if (!dateString) return false;
    
    // Check format first
    if (!dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return false;
    }
    
    const date = new Date(dateString);
    // Check if date is valid and matches the input string
    return date instanceof Date && !isNaN(date) && date.toISOString().slice(0, 10) === dateString;
  }

  // Check if this skip date applies to a given date
  appliesToDate(dateString) {
    if (!this.isValidDate(dateString)) {
      return false;
    }

    return this.skip_date === dateString;
  }

  // Check if skip date is in the past
  isPastDate() {
    if (!this.isValidDate(this.skip_date)) {
      return false;
    }

    const skipDate = new Date(this.skip_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day

    return skipDate < today;
  }

  // Check if skip date is in the future
  isFutureDate() {
    if (!this.isValidDate(this.skip_date)) {
      return false;
    }

    const skipDate = new Date(this.skip_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day

    return skipDate > today;
  }

  // Check if skip date is today
  isToday() {
    if (!this.isValidDate(this.skip_date)) {
      return false;
    }

    const skipDate = new Date(this.skip_date);
    const today = new Date();
    
    return skipDate.toISOString().slice(0, 10) === today.toISOString().slice(0, 10);
  }

  // Get formatted date for display
  getFormattedDate(format = 'YYYY-MM-DD') {
    if (!this.isValidDate(this.skip_date)) {
      return this.skip_date;
    }

    const date = new Date(this.skip_date);
    
    switch (format) {
      case 'MM/DD/YYYY':
        return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
      case 'DD/MM/YYYY':
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
      case 'readable':
        return date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      default:
        return this.skip_date;
    }
  }

  // Validate skip date against medication date range
  validateAgainstMedicationDates(startDate, endDate) {
    const errors = [];

    if (!this.isValidDate(this.skip_date)) {
      return { isValid: false, errors: [{ field: 'skip_date', message: 'Invalid skip date' }] };
    }

    const skipDate = new Date(this.skip_date);
    
    if (startDate) {
      const medicationStart = new Date(startDate);
      if (skipDate < medicationStart) {
        errors.push({ 
          field: 'skip_date', 
          message: 'Skip date cannot be before medication start date' 
        });
      }
    }

    if (endDate) {
      const medicationEnd = new Date(endDate);
      if (skipDate > medicationEnd) {
        errors.push({ 
          field: 'skip_date', 
          message: 'Skip date cannot be after medication end date' 
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Convert to database format
  toDbFormat() {
    return {
      id: this.id,
      medicine_id: this.medicine_id,
      skip_date: this.skip_date,
      reason: this.reason.trim()
    };
  }

  // Create from database row
  static fromDbRow(row) {
    return new SkipDate({
      id: row.id,
      medicine_id: row.medicine_id,
      skip_date: row.skip_date,
      reason: row.reason,
      created_at: row.created_at
    });
  }

  // Sort skip dates chronologically
  static sortByDate(skipDates) {
    return skipDates.sort((a, b) => {
      const dateA = new Date(a.skip_date);
      const dateB = new Date(b.skip_date);
      return dateA - dateB;
    });
  }

  // Filter skip dates by date range
  static filterByDateRange(skipDates, startDate, endDate) {
    return skipDates.filter(skipDate => {
      if (!skipDate.isValidDate(skipDate.skip_date)) {
        return false;
      }

      const date = new Date(skipDate.skip_date);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start && date < start) return false;
      if (end && date > end) return false;

      return true;
    });
  }

  // Get skip dates for a specific month
  static getForMonth(skipDates, year, month) {
    return skipDates.filter(skipDate => {
      if (!skipDate.isValidDate(skipDate.skip_date)) {
        return false;
      }

      const date = new Date(skipDate.skip_date);
      return date.getFullYear() === year && date.getMonth() === month - 1;
    });
  }
}

module.exports = SkipDate;