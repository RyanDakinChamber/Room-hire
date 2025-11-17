import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { promises as fs } from "fs";
import { nanoid } from "nanoid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "bookings.json");

const app = express();
const PORT = process.env.PORT || 4000;

const rooms = [
  { id: "room-1", name: "Room 1" },
  { id: "room-2", name: "Room 2" },
  { id: "room-3", name: "Room 3" },
  { id: "room-4", name: "Room 4" },
  { id: "pod", name: "The Pod" },
  { id: "boardroom", name: "Boardroom" },
  { id: "members-lounge", name: "Members Lounge Room" }
];

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const ensureDataFile = async () => {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify({ bookings: [] }, null, 2));
  }
};

const loadBookings = async () => {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  return JSON.parse(raw).bookings;
};

const saveBookings = async (bookings) => {
  await fs.writeFile(DATA_FILE, JSON.stringify({ bookings }, null, 2));
};

const isSameDay = (start, dateStr) => {
  const target = new Date(dateStr + "T00:00:00Z");
  return (
    start.getUTCFullYear() === target.getUTCFullYear() &&
    start.getUTCMonth() === target.getUTCMonth() &&
    start.getUTCDate() === target.getUTCDate()
  );
};

const isHalfHourBoundary = (date) => {
  const minutes = date.getUTCMinutes();
  return minutes === 0 || minutes === 30;
};

const validateBookingPayload = (payload) => {
  const required = [
    "companyName",
    "contactName",
    "attendeeCount",
    "layout",
    "rooms",
    "startTime",
    "endTime"
  ];

  const missing = required.filter((field) => payload[field] === undefined || payload[field] === null || payload[field] === "");
  if (missing.length) {
    const error = new Error(`Missing required fields: ${missing.join(", ")}`);
    error.status = 400;
    throw error;
  }

  if (!Array.isArray(payload.rooms) || payload.rooms.length === 0) {
    const error = new Error("At least one room must be selected");
    error.status = 400;
    throw error;
  }

  const start = new Date(payload.startTime);
  const end = new Date(payload.endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    const error = new Error("Invalid start or end time");
    error.status = 400;
    throw error;
  }

  if (end <= start) {
    const error = new Error("End time must be after start time");
    error.status = 400;
    throw error;
  }

  if (!isHalfHourBoundary(start) || !isHalfHourBoundary(end)) {
    const error = new Error("Times must align with 30-minute increments");
    error.status = 400;
    throw error;
  }

  if (start.toISOString().slice(0, 10) !== end.toISOString().slice(0, 10)) {
    const error = new Error("Bookings must start and end on the same day");
    error.status = 400;
    throw error;
  }
};

const detectConflicts = (bookings, payload, excludeId) => {
  const start = new Date(payload.startTime);
  const end = new Date(payload.endTime);

  for (const booking of bookings) {
    if (excludeId && booking.id === excludeId) continue;
    const overlap = new Date(booking.startTime) < end && new Date(booking.endTime) > start;
    const roomClash = booking.rooms.some((room) => payload.rooms.includes(room));
    if (overlap && roomClash) {
      const clashRooms = rooms.filter((room) => payload.rooms.includes(room.id)).map((room) => room.name);
      const error = new Error(`Time clash with existing booking in: ${clashRooms.join(", ")}`);
      error.status = 409;
      throw error;
    }
  }
};

app.get("/api/rooms", (_req, res) => {
  res.json({ rooms });
});

app.get("/api/bookings", async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) {
      const err = new Error("Query parameter 'date' is required (YYYY-MM-DD)");
      err.status = 400;
      throw err;
    }

    const bookings = await loadBookings();
    const filtered = bookings.filter((booking) => booking.startTime.startsWith(date));
    res.json({ bookings: filtered });
  } catch (error) {
    next(error);
  }
});

app.post("/api/bookings", async (req, res, next) => {
  try {
    const payload = req.body;
    validateBookingPayload(payload);
    const bookings = await loadBookings();
    detectConflicts(bookings, payload);

    const booking = {
      id: nanoid(),
      companyName: payload.companyName,
      contactName: payload.contactName,
      attendeeCount: Number(payload.attendeeCount),
      layout: payload.layout,
      refreshments: Boolean(payload.refreshments),
      refreshmentsDetails: payload.refreshmentsDetails || "",
      lunch: Boolean(payload.lunch),
      lunchDetails: payload.lunchDetails || "",
      equipment: Array.isArray(payload.equipment) ? payload.equipment : [],
      rooms: payload.rooms,
      startTime: payload.startTime,
      endTime: payload.endTime,
      notes: payload.notes || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    bookings.push(booking);
    await saveBookings(bookings);
    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
});

app.put("/api/bookings/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const payload = req.body;
    validateBookingPayload(payload);
    const bookings = await loadBookings();
    const index = bookings.findIndex((booking) => booking.id === id);
    if (index === -1) {
      const error = new Error("Booking not found");
      error.status = 404;
      throw error;
    }

    detectConflicts(bookings, payload, id);

    const updated = {
      ...bookings[index],
      ...payload,
      attendeeCount: Number(payload.attendeeCount),
      equipment: Array.isArray(payload.equipment) ? payload.equipment : [],
      rooms: payload.rooms,
      startTime: payload.startTime,
      endTime: payload.endTime,
      updatedAt: new Date().toISOString()
    };

    bookings[index] = updated;
    await saveBookings(bookings);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/bookings/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const bookings = await loadBookings();
    const filtered = bookings.filter((booking) => booking.id !== id);
    if (filtered.length === bookings.length) {
      const error = new Error("Booking not found");
      error.status = 404;
      throw error;
    }

    await saveBookings(filtered);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Room Hire server listening on port ${PORT}`);
});
