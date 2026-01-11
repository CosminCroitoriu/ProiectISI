-- RoadAlert Database Setup
-- Run this in your PostgreSQL terminal or pgAdmin

-- Create database
CREATE DATABASE roadalert;

-- Connect to the database
\c roadalert

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    reputation_score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create incident_types table
CREATE TABLE incident_types (
    id SERIAL PRIMARY KEY,
    type_name VARCHAR(50) UNIQUE NOT NULL,
    icon_url VARCHAR(255)
);

-- Create reports table
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type_id INTEGER REFERENCES incident_types(id),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP  -- TTL: reports expire after this time unless extended
);

-- Migration: Add expires_at column if table already exists
-- ALTER TABLE reports ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

-- Create votes table (legacy - for general votes)
CREATE TABLE votes (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    vote_type VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(report_id, user_id)
);

-- Create report_votes table (for keep/remove voting system)
CREATE TABLE report_votes (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('keep', 'remove')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(report_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created_at ON reports(created_at);
CREATE INDEX idx_reports_location ON reports(latitude, longitude);
CREATE INDEX idx_votes_report_id ON votes(report_id);
CREATE INDEX idx_report_votes_report_id ON report_votes(report_id);

-- Insert default incident types
INSERT INTO incident_types (type_name, icon_url) VALUES
    ('ACCIDENT', '/icons/accident.png'),
    ('POLICE', '/icons/police.png'),
    ('POTHOLE', '/icons/pothole.png'),
    ('TRAFFIC_JAM', '/icons/traffic.png');

-- Verify tables were created
\dt

-- Display all tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

