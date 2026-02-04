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
('admin123', '$2a$10$vI8A7ugYvjD/LAnT/Xks8OTpM.vL2Fz7m5Q.tB1R1hWfS/tQ1YI.W', 'admin') -- admin123 with password admin123
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
    user_id INTEGER REFERENCES users(id), -- Added tracking
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    purpose VARCHAR(255),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCEL_REQUESTED', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO resources (name, type, capacity, features) VALUES
('Main Seminar Hall', 'HALL', 200, 'Projector, Sound System, AC'),
('Classroom 101', 'CLASSROOM', 60, 'Whiteboard, Projector'),
('Classroom 102', 'CLASSROOM', 60, 'Whiteboard'),
('Classroom 103', 'CLASSROOM', 60, 'Whiteboard'),
('Computer Lab 1', 'LAB', 40, '30 PCs (Core i7), Internet'),
('Computer Lab 2', 'LAB', 40, '30 PCs, Internet'),
('Physics Lab', 'LAB', 30, 'Lab Equipment'),
('Chemistry Lab', 'LAB', 30, 'Chemistry Equipment')
ON CONFLICT (name) DO UPDATE SET 
    type = EXCLUDED.type,
    capacity = EXCLUDED.capacity,
    features = EXCLUDED.features;
