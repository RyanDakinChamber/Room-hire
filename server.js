import http from "http";
import { URL } from "url";
import path from "path";
import { fileURLToPath } from "url";
import { promises as fs, createReadStream } from "fs";
import { randomUUID } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "bookings.json");
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

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon"
};

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

const isHalfHourBoundary = (date) => {
  const minutes = date.getUTCMinutes();
  return minutes === 0 || minutes === 30;
};

const validateBookingPayload = (payload) => {
  const required = ["companyName", "contactName", "layout", "rooms", "startTime", "endTime"];

  const missing = required.filter((field) =>
    payload[field] === undefined || payload[field] === null || payload[field] === ""
  );
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
      const clashRooms = rooms
        .filter((room) => payload.rooms.includes(room.id))
        .map((room) => room.name);
      const error = new Error(`Time clash with existing booking in: ${clashRooms.join(", ")}`);
      error.status = 409;
      throw error;
    }
  }
};

const sendJson = (res, status, data) => {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
  });
  res.end(JSON.stringify(data));
};

const readRequestBody = (req) =>
  new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        req.socket.destroy();
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      try {
        const parsed = data ? JSON.parse(data) : {};
        resolve(parsed);
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });

const handleApiRequest = async (req, res, url) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
    });
    res.end();
    return;
  }

  try {
    if (url.pathname === "/api/rooms" && req.method === "GET") {
      sendJson(res, 200, { rooms });
      return;
    }

    if (url.pathname === "/api/bookings" && req.method === "GET") {
      const date = url.searchParams.get("date");
      if (!date) {
        const err = new Error("Query parameter 'date' is required (YYYY-MM-DD)");
        err.status = 400;
        throw err;
      }
      const bookings = await loadBookings();
      const filtered = bookings.filter((booking) => booking.startTime.startsWith(date));
      sendJson(res, 200, { bookings: filtered });
      return;
    }

    if (url.pathname === "/api/bookings" && req.method === "POST") {
      const payload = await readRequestBody(req);
      validateBookingPayload(payload);
      const bookings = await loadBookings();
      detectConflicts(bookings, payload);

      const booking = {
        id: randomUUID(),
        companyName: payload.companyName,
        contactName: payload.contactName,
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
      sendJson(res, 201, booking);
      return;
    }

    if (url.pathname.startsWith("/api/bookings/") && req.method === "PUT") {
      const id = url.pathname.split("/").pop();
      const payload = await readRequestBody(req);
      validateBookingPayload(payload);
      const bookings = await loadBookings();
      const index = bookings.findIndex((booking) => booking.id === id);
      if (index === -1) {
        const err = new Error("Booking not found");
        err.status = 404;
        throw err;
      }
      detectConflicts(bookings, payload, id);
      const updated = {
        ...bookings[index],
        companyName: payload.companyName,
        contactName: payload.contactName,
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
        updatedAt: new Date().toISOString()
      };
      bookings[index] = updated;
      await saveBookings(bookings);
      sendJson(res, 200, updated);
      return;
    }

    if (url.pathname.startsWith("/api/bookings/") && req.method === "DELETE") {
      const id = url.pathname.split("/").pop();
      const bookings = await loadBookings();
      const filtered = bookings.filter((booking) => booking.id !== id);
      if (filtered.length === bookings.length) {
        const err = new Error("Booking not found");
        err.status = 404;
        throw err;
      }
      await saveBookings(filtered);
      sendJson(res, 204, {});
      return;
    }

    if (url.pathname === "/api/health" && req.method === "GET") {
      sendJson(res, 200, { status: "ok" });
      return;
    }

    const notFound = new Error("Not found");
    notFound.status = 404;
    throw notFound;
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Internal server error" });
  }
};

const serveStatic = async (req, res, url) => {
  let filePath = path.join(PUBLIC_DIR, url.pathname);
  if (url.pathname === "/") {
    filePath = path.join(PUBLIC_DIR, "index.html");
  }

  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname.startsWith("/api")) {
    handleApiRequest(req, res, url);
  } else {
    serveStatic(req, res, url);
  }
});

server.listen(PORT, () => {
  console.log(`Room Hire server listening on port ${PORT}`);
});
