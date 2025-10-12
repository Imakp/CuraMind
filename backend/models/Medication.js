class Medication {
  constructor(data = {}) {
    this.id = data.id !== undefined ? data.id : null;
    this.name = data.name || '';
    this.strength = data.strength || '';
    this.route_id = data.route_id !== undefined ? data.route_id : null;
    this.frequency_id = data.frequency_id !== undefined ? data.frequency_id : null;
    this.start_date = data.start_date !== undefined ? data.start_date : null;
    this.end_date = data.end_date !== undefined ? data.end_date : null;
    this.sheet_size = data.sheet_size !== undefined ? data.sheet_size : 10;
    this.total_tablets = data.total_tablets !== undefined ? data.total_tablets : 0;
    this.notes = data.notes || '';
    this.created_at = data.created_at !== undefined ? data.created_at : null;
    this.updated_at = data.updated_at !== undefined ? data.updated_at : null;
  }

  // Validation methods
  validate() {
    const errors = [];

    // Required field validations
    if (!this.name || this.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Name is required' });
    }

    if (!this.start_date) {
      errors.push({ field: 'start_date', message: 'Start date is required' });
    }

    // Date validations
    if (this.start_date && !this.isValidDate(this.start_date)) {
      errors.push({ field: 'start_date', message: 'Start date must be a valid date' });
    }

    if (this.end_date && !this.isValidDate(this.end_date)) {
      errors.push({ field: 'end_date', message: 'End date must be a valid date' });
    }

    // End date must be after start date
    if (this.start_date && this.end_date) {
      const startDate = new Date(this.start_date);
      const endDate = new Date(this.end_date);
      
      if (endDate <= startDate) {
        errors.push({ field: 'end_date', message: 'End date must be after start date' });
      }
    }

    // Inventory validations
    if (this.sheet_size !== null && this.sheet_size !== undefined) {
      if (!Number.isInteger(this.sheet_size) || this.sheet_size <= 0) {
        errors.push({ field: 'sheet_size', message: 'Sheet size must be a positive integer' });
      }
    }

    if (this.total_tablets !== null && this.total_tablets !== undefined) {
      if (typeof this.total_tablets !== 'number' || this.total_tablets < 0) {
        errors.push({ field: 'total_tablets', message: 'Total tablets must be a non-negative number' });
      }
    }

    // Foreign key validations
    if (this.route_id !== null && this.route_id !== undefined) {
      if (!Number.isInteger(this.route_id) || this.route_id <= 0) {
        errors.push({ field: 'route_id', message: 'Route ID must be a positive integer' });
      }
    }

    if (this.frequency_id !== null && this.frequency_id !== undefined) {
      if (!Number.isInteger(this.frequency_id) || this.frequency_id <= 0) {
        errors.push({ field: 'frequency_id', message: 'Frequency ID must be a positive integer' });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

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

  // Check if medication is active on a given date
  isActiveOnDate(date) {
    const checkDate = new Date(date);
    const startDate = new Date(this.start_date);
    
    if (checkDate < startDate) {
      return false;
    }

    if (this.end_date) {
      const endDate = new Date(this.end_date);
      if (checkDate > endDate) {
        return false;
      }
    }

    return true;
  }

  // Calculate total tablets from sheet count
  calculateTotalTabletsFromSheets(sheetCount) {
    if (!Number.isInteger(sheetCount) || sheetCount < 0) {
      throw new Error('Sheet count must be a non-negative integer');
    }
    
    if (!Number.isInteger(this.sheet_size) || this.sheet_size <= 0) {
      throw new Error('Sheet size must be a positive integer');
    }

    return sheetCount * this.sheet_size;
  }

  // Calculate sheet equivalent from total tablets
  calculateSheetEquivalent() {
    if (!Number.isInteger(this.sheet_size) || this.sheet_size <= 0) {
      return 0;
    }

    return Math.floor(this.total_tablets / this.sheet_size);
  }

  // Update inventory safely
  updateInventory(newTotalTablets) {
    if (typeof newTotalTablets !== 'number' || newTotalTablets < 0) {
      throw new Error('Total tablets must be a non-negative number');
    }

    this.total_tablets = newTotalTablets;
    this.updated_at = new Date().toISOString();
  }

  // Consume tablets (for dose tracking)
  consumeTablets(amount) {
    if (typeof amount !== 'number' || amount <= 0) {
      throw new Error('Amount must be a positive number');
    }

    const originalTotal = this.total_tablets;
    const consumed = Math.min(amount, originalTotal);
    const newTotal = Math.max(0, originalTotal - amount);
    
    this.updateInventory(newTotal);
    
    return {
      consumed: consumed,
      remaining: newTotal,
      wasShort: originalTotal < amount
    };
  }

  // Convert to database format
  toDbFormat() {
    return {
      id: this.id,
      name: this.name.trim(),
      strength: this.strength.trim(),
      route_id: this.route_id,
      frequency_id: this.frequency_id,
      start_date: this.start_date,
      end_date: this.end_date,
      sheet_size: this.sheet_size,
      total_tablets: this.total_tablets,
      notes: this.notes.trim(),
      updated_at: new Date().toISOString()
    };
  }

  // Create from database row
  static fromDbRow(row) {
    return new Medication({
      id: row.id,
      name: row.name,
      strength: row.strength,
      route_id: row.route_id,
      frequency_id: row.frequency_id,
      start_date: row.start_date,
      end_date: row.end_date,
      sheet_size: row.sheet_size,
      total_tablets: parseFloat(row.total_tablets),
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at
    });
  }
}

module.exports = Medication;