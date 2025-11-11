INSERT INTO rooms (name, capacity, default_layout)
VALUES
    ('Room 1', 20, 'boardroom'),
    ('Room 2', 25, 'boardroom'),
    ('Room 3', 30, 'theatre'),
    ('Room 4', 30, 'theatre'),
    ('The Pod', 8, 'u-shape'),
    ('Boardroom', 12, 'boardroom'),
    ('Members Lounge Room', 40, 'theatre')
ON CONFLICT (name) DO NOTHING;
