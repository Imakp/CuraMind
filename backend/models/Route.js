class Route {
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
      errors.push({ field: 'name', message: 'Route name is required' });
    }

    // Name length validation
    if (this.name && this.name.trim().length > 50) {
      errors.push({ field: 'name', message: 'Route name must be 50 characters or less' });
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

  // Check if route name is unique (requires external validation)
  static validateUniqueName(routes, name, excludeId = null) {
    const trimmedName = name.trim().toLowerCase();
    
    return !routes.some(route => 
      route.name.trim().toLowerCase() === trimmedName && 
      route.id !== excludeId
    );
  }

  // Get display name (capitalized)
  getDisplayName() {
    return this.name.trim().charAt(0).toUpperCase() + this.name.trim().slice(1).toLowerCase();
  }

  // Check if route can be deleted (not referenced by medications)
  canBeDeleted(medications = []) {
    return !medications.some(medication => 
      medication.route_id === this.id || 
      (medication.doses && medication.doses.some(dose => dose.route_override === this.id))
    );
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
    return new Route({
      id: row.id,
      name: row.name,
      description: row.description,
      created_at: row.created_at
    });
  }

  // Sort routes alphabetically by name
  static sortByName(routes) {
    return routes.sort((a, b) => 
      a.name.trim().toLowerCase().localeCompare(b.name.trim().toLowerCase())
    );
  }

  // Get common route presets
  static getCommonRoutes() {
    return [
      { name: 'Oral', description: 'By mouth' },
      { name: 'Sublingual', description: 'Under the tongue' },
      { name: 'Topical', description: 'Applied to skin' },
      { name: 'Inhaled', description: 'Breathed in through lungs' },
      { name: 'Subcutaneous', description: 'Injected under the skin' },
      { name: 'Intramuscular', description: 'Injected into muscle' },
      { name: 'Intravenous', description: 'Injected into vein' },
      { name: 'Rectal', description: 'Inserted into rectum' },
      { name: 'Nasal', description: 'Applied to or through nose' },
      { name: 'Ophthalmic', description: 'Applied to eyes' },
      { name: 'Otic', description: 'Applied to ears' }
    ];
  }

  // Search routes by name or description
  static search(routes, query) {
    if (!query || query.trim().length === 0) {
      return routes;
    }

    const searchTerm = query.trim().toLowerCase();
    
    return routes.filter(route => 
      route.name.toLowerCase().includes(searchTerm) ||
      route.description.toLowerCase().includes(searchTerm)
    );
  }
}

module.exports = Route;