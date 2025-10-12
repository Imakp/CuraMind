-- Initial database schema for Medication Management System
-- This migration creates all core tables, indexes, and constraints

-- Enable UUID extension for future use
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Master Data Tables
CREATE TABLE routes (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE frequencies (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Core Medication Table
CREATE TABLE medications (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    strength TEXT,
    route_id INT REFERENCES routes(id),
    frequency_id INT REFERENCES frequencies(id),
    start_date DATE NOT NULL,
    end_date DATE,
    sheet_size INT NOT NULL DEFAULT 10 CHECK (sheet_size > 0),
    total_tablets NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_tablets >= 0),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Ensure end_date is after start_date
    CONSTRAINT check_date_range CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Dose Configuration
CREATE TABLE medicine_doses (
    id SERIAL PRIMARY KEY,
    medicine_id INT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    dose_amount NUMERIC(10,2) NOT NULL CHECK (dose_amount > 0),
    time_of_day TIME NOT NULL,
    route_override INT REFERENCES routes(id),
    instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Skip Dates
CREATE TABLE skip_dates (
    id SERIAL PRIMARY KEY,
    medicine_id INT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    skip_date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Ensure unique skip dates per medication
    UNIQUE(medicine_id, skip_date)
);

-- Notifications
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    medicine_id INT REFERENCES medications(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('BUY_SOON', 'DOSE_DUE', 'MISSED_DOSE')),
    message TEXT NOT NULL,
    payload JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Audit Trail
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    medicine_id INT REFERENCES medications(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('DOSE_GIVEN', 'INVENTORY_UPDATED', 'CREATED', 'UPDATED', 'DELETED')),
    old_values JSONB,
    new_values JSONB,
    quantity_change NUMERIC(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Performance Indexes
-- Index for active medications lookup
CREATE INDEX idx_medications_active ON medications(start_date, end_date) 
WHERE end_date IS NULL OR end_date >= CURRENT_DATE;

-- Index for medication name searches
CREATE INDEX idx_medications_name ON medications(name);

-- Index for dose time lookups
CREATE INDEX idx_medicine_doses_time ON medicine_doses(medicine_id, time_of_day);

-- Index for skip date lookups
CREATE INDEX idx_skip_dates_lookup ON skip_dates(medicine_id, skip_date);

-- Index for unread notifications
CREATE INDEX idx_notifications_unread ON notifications(medicine_id, is_read, created_at);

-- Index for audit log queries
CREATE INDEX idx_audit_logs_medicine ON audit_logs(medicine_id, created_at);

-- Index for notification type queries
CREATE INDEX idx_notifications_type ON notifications(type, created_at);

-- Composite index for medication filtering
CREATE INDEX idx_medications_composite ON medications(start_date, end_date, route_id, frequency_id);

-- Insert default master data
INSERT INTO routes (name, description) VALUES
('Oral', 'Taken by mouth'),
('Sublingual', 'Under the tongue'),
('Topical', 'Applied to skin'),
('Inhaled', 'Breathed in through lungs'),
('Subcutaneous', 'Injected under the skin'),
('Intramuscular', 'Injected into muscle'),
('Intravenous', 'Injected into vein'),
('Rectal', 'Inserted into rectum'),
('Ophthalmic', 'Applied to eyes'),
('Otic', 'Applied to ears');

INSERT INTO frequencies (name, description) VALUES
('Once daily', 'Take once per day'),
('Twice daily', 'Take twice per day'),
('Three times daily', 'Take three times per day'),
('Four times daily', 'Take four times per day'),
('Every 4 hours', 'Take every 4 hours'),
('Every 6 hours', 'Take every 6 hours'),
('Every 8 hours', 'Take every 8 hours'),
('Every 12 hours', 'Take every 12 hours'),
('As needed', 'Take as needed'),
('Weekly', 'Take once per week'),
('Twice weekly', 'Take twice per week'),
('Monthly', 'Take once per month');

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON routes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_frequencies_updated_at BEFORE UPDATE ON frequencies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medications_updated_at BEFORE UPDATE ON medications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medicine_doses_updated_at BEFORE UPDATE ON medicine_doses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_medication_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (medicine_id, action, old_values, created_at)
        VALUES (OLD.id, 'DELETED', row_to_json(OLD), now());
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (medicine_id, action, old_values, new_values, created_at)
        VALUES (NEW.id, 'UPDATED', row_to_json(OLD), row_to_json(NEW), now());
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (medicine_id, action, new_values, created_at)
        VALUES (NEW.id, 'CREATED', row_to_json(NEW), now());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Apply audit trigger to medications table
CREATE TRIGGER audit_medications_trigger
    AFTER INSERT OR UPDATE OR DELETE ON medications
    FOR EACH ROW EXECUTE FUNCTION audit_medication_changes();