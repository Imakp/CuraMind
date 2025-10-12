class Frequency {
  constructor(data = {}) {
    this.id = data.id !== undefined ? data.id : null;
    this.name = data.name || '';
    this.description = data.description || '';
    this.created_at = data.created_at !== undefined ? data.created_at : null;
  }

  // Validation methods
  validate() {
    const errors = [];

    // Required field validations
    if (!this.name || this.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Frequency name is required' });
    }

    // Name length validation
    if (this.name && this.name.trim().length > 50) {
      errors.push({ field: 'name', message: 'Frequency name must be 50 characters or less' });
    }

    // Description length validation
    if (this.description && this.description.trim().length > 255) {
      errors.push({ field: 'description', message: 'Description must be 255 characters or less' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Check if frequency name is unique (requires external validation)
  static validateUniqueName(frequencies, name, excludeId = null) {
    const trimmedName = name.trim().toLowerCase();
    
    return !frequencies.some(frequency => 
      frequency.name.trim().toLowerCase() === trimmedName && 
      frequency.id !== excludeId
    );
  }

  // Get display name (capitalized)
  getDisplayName() {
    return this.name.trim().charAt(0).toUpperCase() + this.name.trim().slice(1).toLowerCase();
  }

  // Check if frequency can be deleted (not referenced by medications)
  canBeDeleted(medications = []) {
    return !medications.some(medication => medication.frequency_id === this.id);
  }

  // Convert to database format
  toDbFormat() {
    return {
      id: this.id,
      name: this.name.trim(),
      description: this.description.trim()
    };
  }

  // Create from database row
  static fromDbRow(row) {
    return new Frequency({
      id: row.id,
      name: row.name,
      description: row.description,
      created_at: row.created_at
    });
  }

  // Sort frequencies alphabetically by name
  static sortByName(frequencies) {
    return frequencies.sort((a, b) => 
      a.name.trim().toLowerCase().localeCompare(b.name.trim().toLowerCase())
    );
  }

  // Get common frequency presets
  static getCommonFrequencies() {
    return [
      { name: 'Once daily', description: 'Take once per day' },
      { name: 'Twice daily', description: 'Take twice per day (every 12 hours)' },
      { name: 'Three times daily', description: 'Take three times per day (every 8 hours)' },
      { name: 'Four times daily', description: 'Take four times per day (every 6 hours)' },
      { name: 'Every other day', description: 'Take every other day' },
      { name: 'Weekly', description: 'Take once per week' },
      { name: 'Twice weekly', description: 'Take twice per week' },
      { name: 'Monthly', description: 'Take once per month' },
      { name: 'As needed', description: 'Take as needed (PRN)' },
      { name: 'Before meals', description: 'Take before meals' },
      { name: 'With meals', description: 'Take with meals' },
      { name: 'After meals', description: 'Take after meals' },
      { name: 'At bedtime', description: 'Take at bedtime' },
      { name: 'Every 4 hours', description: 'Take every 4 hours' },
      { name: 'Every 6 hours', description: 'Take every 6 hours' },
      { name: 'Every 8 hours', description: 'Take every 8 hours' },
      { name: 'Every 12 hours', description: 'Take every 12 hours' }
    ];
  }

  // Search frequencies by name or description
  static search(frequencies, query) {
    if (!query || query.trim().length === 0) {
      return frequencies;
    }

    const searchTerm = query.trim().toLowerCase();
    
    return frequencies.filter(frequency => 
      frequency.name.toLowerCase().includes(searchTerm) ||
      frequency.description.toLowerCase().includes(searchTerm)
    );
  }

  // Group frequencies by type
  static groupByType(frequencies) {
    const groups = {
      daily: [],
      weekly: [],
      monthly: [],
      asNeeded: [],
      other: []
    };

    frequencies.forEach(frequency => {
      const name = frequency.name.toLowerCase();
      
      if (name.includes('daily') || name.includes('day') || name.includes('hour')) {
        groups.daily.push(frequency);
      } else if (name.includes('weekly') || name.includes('week')) {
        groups.weekly.push(frequency);
      } else if (name.includes('monthly') || name.includes('month')) {
        groups.monthly.push(frequency);
      } else if (name.includes('needed') || name.includes('prn')) {
        groups.asNeeded.push(frequency);
      } else {
        groups.other.push(frequency);
      }
    });

    return groups;
  }
}

module.exports = Frequency;