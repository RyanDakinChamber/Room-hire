import { getPool } from "../config/database.js";
import { ensureHalfHourIncrement, ensureSameDay } from "../utils/time.js";

const mapBookingRow = (row) => ({
  id: row.id,
  contactName: row.contact_name,
  attendeeCount: row.attendee_count,
  layout: row.layout,
  refreshments: row.refreshments,
  refreshmentsDetails: row.refreshments_details,
  lunch: row.lunch,
  lunchDetails: row.lunch_details,
  equipment: row.equipment ?? [],
  startTime: row.start_time,
  endTime: row.end_time,
  rooms: row.rooms || []
});

const fetchRoomsForBookings = async (pool, bookingIds) => {
  if (bookingIds.length === 0) return {};
  const { rows } = await pool.query(
    `SELECT br.booking_id, r.id, r.name, r.capacity, r.default_layout
     FROM booking_rooms br
     INNER JOIN rooms r ON r.id = br.room_id
     WHERE br.booking_id = ANY($1)`,
    [bookingIds]
  );

  return rows.reduce((acc, row) => {
    if (!acc[row.booking_id]) {
      acc[row.booking_id] = [];
    }
    acc[row.booking_id].push({
      id: row.id,
      name: row.name,
      capacity: row.capacity,
      defaultLayout: row.default_layout
    });
    return acc;
  }, {});
};

export const getBookingsForDate = async (date) => {
  const pool = getPool();
  const startOfDay = new Date(`${date}T00:00:00`);
  const endOfDay = new Date(`${date}T23:59:59`);

  const { rows } = await pool.query(
    `SELECT *
     FROM bookings
     WHERE start_time >= $1 AND start_time <= $2
     ORDER BY start_time ASC`,
    [startOfDay, endOfDay]
  );

  const bookingsRooms = await fetchRoomsForBookings(
    pool,
    rows.map((row) => row.id)
  );

  return rows.map((row) =>
    mapBookingRow({
      ...row,
      rooms: bookingsRooms[row.id] ?? []
    })
  );
};

const checkConflicts = async (pool, rooms, startTime, endTime, excludeId = null) => {
  const { rows } = await pool.query(
    `SELECT b.id, r.name
     FROM bookings b
     INNER JOIN booking_rooms br ON br.booking_id = b.id
     INNER JOIN rooms r ON r.id = br.room_id
     WHERE br.room_id = ANY($1)
       AND b.start_time < $3
       AND b.end_time > $2
       ${excludeId ? "AND b.id <> $4" : ""}`,
    excludeId
      ? [rooms, startTime, endTime, excludeId]
      : [rooms, startTime, endTime]
  );

  if (rows.length > 0) {
    const roomNames = [...new Set(rows.map((row) => row.name))];
    const error = new Error(
      `Conflict detected with existing booking(s) in: ${roomNames.join(", ")}`
    );
    error.status = 409;
    throw error;
  }
};

const upsertBookingRooms = async (client, bookingId, rooms) => {
  await client.query("DELETE FROM booking_rooms WHERE booking_id = $1", [bookingId]);
  const insertValues = rooms
    .map((roomId, idx) => `($1, $${idx + 2})`)
    .join(", ");
  const params = [bookingId, ...rooms];
  await client.query(
    `INSERT INTO booking_rooms (booking_id, room_id)
     VALUES ${insertValues}`,
    params
  );
};

const buildBookingResponse = async (client, bookingId) => {
  const bookingResult = await client.query("SELECT * FROM bookings WHERE id = $1", [
    bookingId
  ]);

  if (bookingResult.rows.length === 0) {
    const error = new Error("Booking not found");
    error.status = 404;
    throw error;
  }

  const bookingRow = bookingResult.rows[0];

  const roomResult = await client.query(
    `SELECT r.id, r.name, r.capacity, r.default_layout
     FROM booking_rooms br
     INNER JOIN rooms r ON r.id = br.room_id
     WHERE br.booking_id = $1`,
    [bookingId]
  );

  return mapBookingRow({ ...bookingRow, rooms: roomResult.rows });
};

export const createBooking = async (payload) => {
  const pool = getPool();
  const {
    contactName,
    attendeeCount,
    layout,
    refreshments,
    refreshmentsDetails,
    lunch,
    lunchDetails,
    equipment = [],
    startTime,
    endTime,
    rooms
  } = payload;

  ensureHalfHourIncrement(startTime, endTime);
  ensureSameDay(startTime, endTime);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await checkConflicts(client, rooms, startTime, endTime);

    const insertResult = await client.query(
      `INSERT INTO bookings (
        contact_name, attendee_count, layout,
        refreshments, refreshments_details,
        lunch, lunch_details,
        equipment, start_time, end_time
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING id`,
      [
        contactName,
        attendeeCount,
        layout,
        refreshments ?? false,
        refreshmentsDetails ?? null,
        lunch ?? false,
        lunchDetails ?? null,
        equipment,
        startTime,
        endTime
      ]
    );

    const bookingId = insertResult.rows[0].id;
    await upsertBookingRooms(client, bookingId, rooms);
    await client.query("COMMIT");

    return buildBookingResponse(client, bookingId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const updateBooking = async (bookingId, payload) => {
  const pool = getPool();
  const {
    contactName,
    attendeeCount,
    layout,
    refreshments,
    refreshmentsDetails,
    lunch,
    lunchDetails,
    equipment = [],
    startTime,
    endTime,
    rooms
  } = payload;

  ensureHalfHourIncrement(startTime, endTime);
  ensureSameDay(startTime, endTime);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await checkConflicts(client, rooms, startTime, endTime, bookingId);

    const result = await client.query(
      `UPDATE bookings SET
        contact_name = $1,
        attendee_count = $2,
        layout = $3,
        refreshments = $4,
        refreshments_details = $5,
        lunch = $6,
        lunch_details = $7,
        equipment = $8,
        start_time = $9,
        end_time = $10,
        updated_at = NOW()
      WHERE id = $11`,
      [
        contactName,
        attendeeCount,
        layout,
        refreshments ?? false,
        refreshmentsDetails ?? null,
        lunch ?? false,
        lunchDetails ?? null,
        equipment,
        startTime,
        endTime,
        bookingId
      ]
    );

    if (result.rowCount === 0) {
      const error = new Error("Booking not found");
      error.status = 404;
      throw error;
    }

    await upsertBookingRooms(client, bookingId, rooms);
    await client.query("COMMIT");

    return buildBookingResponse(client, bookingId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const deleteBooking = async (bookingId) => {
  const pool = getPool();
  const result = await pool.query("DELETE FROM bookings WHERE id = $1", [bookingId]);

  if (result.rowCount === 0) {
    const error = new Error("Booking not found");
    error.status = 404;
    throw error;
  }
};
