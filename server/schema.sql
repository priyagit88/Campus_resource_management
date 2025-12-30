DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS resources;

CREATE TABLE resources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('HALL', 'CLASSROOM', 'LAB')),
    capacity INTEGER NOT NULL,
    features TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    resource_id INTEGER REFERENCES resources(id),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    purpose VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO resources (name, type, capacity, features) VALUES
('Seminar Hall A', 'HALL', 200, 'Projector, Sound System, AC'),
('Seminar Hall B', 'HALL', 150, 'Projector, AC'),
('Classroom 101', 'CLASSROOM', 60, 'Whiteboard, Projector'),
('Classroom 102', 'CLASSROOM', 60, 'Whiteboard'),
('Computer Lab 1', 'LAB', 40, '30 PCs, Internet'),
('Physics Lab', 'LAB', 30, 'Lab Equipment');
