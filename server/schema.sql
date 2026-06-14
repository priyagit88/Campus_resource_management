-- Non-destructive schema

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (username, password_hash, role) 
VALUES 
('admin', '$2a$10$vI8A7ugYvjD/LAnT/Xks8OTpM.vL2Fz7m5Q.tB1R1hWfS/tQ1YI.W', 'admin'),
('admin123', '$2a$10$LPzJoLyyfJ3VaNYM0xKtq.MJa77d9KoKQ798Zh2UO2pezVYcn0XRm', 'admin') -- admin123 with password admin123
ON CONFLICT (username) DO NOTHING;


CREATE TABLE IF NOT EXISTS resources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL, -- Added UNIQUE for seeding stability
    type VARCHAR(20) NOT NULL CHECK (type IN ('HALL', 'CLASSROOM', 'LAB')),
    capacity INTEGER NOT NULL,
    features TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    resource_id INTEGER REFERENCES resources(id),
    user_id INTEGER REFERENCES users(id),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    purpose VARCHAR(255),
    semester VARCHAR(50), -- New column
    subject VARCHAR(100),  -- New column
    status VARCHAR(20) DEFAULT 'PENDING', 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure columns exist (for migration)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS semester VARCHAR(50);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS subject VARCHAR(100);

-- Update check constraint (dropping old one if exists might be complex, so we'll just handle it in app logic if needed, 
-- but let's try to update it)
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check 
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCEL_REQUESTED', 'CANCELLED', 'BLOCKED', 'TIMETABLE'));

CREATE TABLE IF NOT EXISTS timetable (
    id SERIAL PRIMARY KEY,
    resource_id INTEGER REFERENCES resources(id),
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun, 1=Mon, etc.
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    semester VARCHAR(50) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO resources (name, type, capacity, features) VALUES 
('MC005', 'CLASSROOM', 60, 'Projector, ICT Enabled'),
('MC213', 'CLASSROOM', 60, 'Projector, Wifi'),
('MC210', 'CLASSROOM', 60, 'Projector, Wifi'),
('LAB1', 'LAB', 30, 'High-end PCs, AC'),
('LAB2', 'LAB', 30, 'High-end PCs, AC'),
('LAB3', 'LAB', 30, 'High-end PCs, AC'),
('LAB4', 'LAB', 30, 'High-end PCs, AC'),
('IOT LAB', 'LAB', 25, 'Microcontrollers, Sensors, High-Speed Internet'),
('MCA SEMINAR HALL', 'HALL', 150, 'Audio-Visual System, Stage, AC')
ON CONFLICT (name) DO UPDATE SET 
    type = EXCLUDED.type,
    capacity = EXCLUDED.capacity,
    features = EXCLUDED.features;
