CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    capacity INTEGER,
    default_layout VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    contact_name VARCHAR(150) NOT NULL,
    attendee_count INTEGER NOT NULL,
    layout VARCHAR(50) NOT NULL,
    refreshments BOOLEAN DEFAULT FALSE,
    refreshments_details TEXT,
    lunch BOOLEAN DEFAULT FALSE,
    lunch_details TEXT,
    equipment TEXT[],
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS booking_rooms (
    booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    PRIMARY KEY (booking_id, room_id)
);

CREATE INDEX IF NOT EXISTS idx_bookings_start_end ON bookings (start_time, end_time);
