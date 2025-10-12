# Medication Management System - Backend

## Database Setup

### Prerequisites

1. Install PostgreSQL 14 or later
2. Create a database named `medication_management`
3. Ensure PostgreSQL is running on localhost:5432

### Environment Configuration

1. Copy `.env.example` to `.env`
2. Update database credentials in `.env` file

### Database Migration

Run the initial migration to set up the database schema:

```bash
npm run migrate
```

To check migration status:

```bash
node migrations/migrate.js status
```

### Database Schema

The system uses the following core tables:

- **routes**: Medication administration routes (oral, topical, etc.)
- **frequencies**: Dosing frequency presets (once daily, twice daily, etc.)
- **medications**: Core medication records with inventory tracking
- **medicine_doses**: Individual dose configurations per medication
- **skip_dates**: Dates to skip medication administration
- **notifications**: System alerts and reminders
- **audit_logs**: Complete audit trail of all changes
- **schema_migrations**: Migration version tracking

### Key Features

- **Connection Pooling**: Efficient database connection management
- **Transaction Support**: ACID compliance for complex operations
- **Audit Trail**: Automatic logging of all medication changes
- **Data Integrity**: Foreign key constraints and validation rules
- **Performance Indexes**: Optimized queries for time-based lookups
- **Migration System**: Version-controlled schema changes

### Development

Start the development server:

```bash
npm run dev
```

The server will start on port 3001 with the following endpoints:

- `GET /health` - Health check with database status
- `GET /api` - Basic API information

### Database Connection

The database connection is configured in `config/database.js` with:

- Connection pooling (max 20 connections)
- Automatic reconnection
- Query logging in development
- Graceful shutdown handling

### Migration System

Migrations are stored in the `migrations/` directory and follow the naming convention:
`001_migration_name.sql`

The migration system:
- Tracks executed migrations in `schema_migrations` table
- Executes migrations in transaction for rollback safety
- Provides status checking and pending migration detection
- Supports both up migrations and status checking