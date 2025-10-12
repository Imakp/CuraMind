const fs = require('fs').promises;
const path = require('path');
const { query, testConnection, closePool } = require('../config/database');

// Migration tracking table
const createMigrationsTable = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      version VARCHAR(255) NOT NULL UNIQUE,
      filename VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
  `;
  
  try {
    await query(createTableQuery);
    console.log('Migration tracking table ready');
  } catch (err) {
    console.error('Error creating migrations table:', err.message);
    throw err;
  }
};

// Get executed migrations
const getExecutedMigrations = async () => {
  try {
    const result = await query('SELECT version FROM schema_migrations ORDER BY version');
    return result.rows.map(row => row.version);
  } catch (err) {
    console.error('Error fetching executed migrations:', err.message);
    return [];
  }
};

// Get pending migrations
const getPendingMigrations = async () => {
  try {
    const migrationsDir = path.join(__dirname);
    const files = await fs.readdir(migrationsDir);
    
    // Filter SQL migration files
    const migrationFiles = files
      .filter(file => file.endsWith('.sql') && file.match(/^\d{3}_/))
      .sort();
    
    const executedMigrations = await getExecutedMigrations();
    
    const pendingMigrations = migrationFiles.filter(file => {
      const version = file.replace('.sql', '');
      return !executedMigrations.includes(version);
    });
    
    return pendingMigrations;
  } catch (err) {
    console.error('Error getting pending migrations:', err.message);
    throw err;
  }
};

// Execute a single migration
const executeMigration = async (filename) => {
  try {
    const migrationPath = path.join(__dirname, filename);
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    const version = filename.replace('.sql', '');
    
    console.log(`Executing migration: ${filename}`);
    
    // Execute migration in a transaction
    await query('BEGIN');
    
    try {
      // Execute the migration SQL
      await query(migrationSQL);
      
      // Record the migration as executed
      await query(
        'INSERT INTO schema_migrations (version, filename) VALUES ($1, $2)',
        [version, filename]
      );
      
      await query('COMMIT');
      console.log(`✓ Migration ${filename} executed successfully`);
      
    } catch (err) {
      await query('ROLLBACK');
      throw err;
    }
    
  } catch (err) {
    console.error(`✗ Migration ${filename} failed:`, err.message);
    throw err;
  }
};

// Run all pending migrations
const runMigrations = async () => {
  try {
    console.log('Starting database migration...');
    
    // Test database connection
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Cannot connect to database');
    }
    
    // Create migrations table if it doesn't exist
    await createMigrationsTable();
    
    // Get pending migrations
    const pendingMigrations = await getPendingMigrations();
    
    if (pendingMigrations.length === 0) {
      console.log('No pending migrations found');
      return;
    }
    
    console.log(`Found ${pendingMigrations.length} pending migration(s)`);
    
    // Execute each pending migration
    for (const migration of pendingMigrations) {
      await executeMigration(migration);
    }
    
    console.log('All migrations completed successfully');
    
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
};

// Show migration status
const showStatus = async () => {
  try {
    const connected = await testConnection();
    if (!connected) {
      console.log('Cannot connect to database');
      return;
    }
    
    await createMigrationsTable();
    
    const executedMigrations = await getExecutedMigrations();
    const pendingMigrations = await getPendingMigrations();
    
    console.log('\n=== Migration Status ===');
    console.log(`Executed migrations: ${executedMigrations.length}`);
    executedMigrations.forEach(migration => {
      console.log(`  ✓ ${migration}`);
    });
    
    console.log(`\nPending migrations: ${pendingMigrations.length}`);
    pendingMigrations.forEach(migration => {
      console.log(`  - ${migration}`);
    });
    
  } catch (err) {
    console.error('Error showing status:', err.message);
  }
};

// Main execution
const main = async () => {
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'status':
        await showStatus();
        break;
      case 'up':
      default:
        await runMigrations();
        break;
    }
  } finally {
    await closePool();
  }
};

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('Migration script error:', err.message);
    process.exit(1);
  });
}

module.exports = {
  runMigrations,
  showStatus,
  getPendingMigrations,
  getExecutedMigrations
};