const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'bookings.json');
const PUBLIC_DIR = __dirname;

const VALID_ROOMS = new Set([
  'Room 1',
  'Room 2',
  'Room 3',
  'Room 4',
  'Chamber Pod',
  'Boardroom',
  'Members Lounge Room'
]);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

fs.mkdirSync(DATA_DIR, { recursive: true });

let bookings = loadBookingsFromFile();

function loadBookingsFromFile() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return [];
    }
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(normaliseBooking);
    }
  } catch (error) {
    console.error('Failed to load bookings database', error);
  }
  return [];
}

function persistBookingsToFile() {
  fs.writeFileSync(DB_PATH, JSON.stringify(bookings, null, 2), 'utf8');
}

function normaliseBooking(raw) {
  return {
    id: raw.id ?? crypto.randomUUID(),
    date: raw.date,
    start: raw.start,
    end: raw.end,
    name: raw.name,
    attendees: Number.parseInt(raw.attendees, 10) || 0,
    rooms: Array.isArray(raw.rooms) ? raw.rooms : [],
    layouts: Array.isArray(raw.layouts) ? raw.layouts : [],
    services: Array.isArray(raw.services) ? raw.services : [],
    notes: raw.notes ?? '',
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? new Date().toISOString()
  };
}

function toMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function validateBookingPayload(body) {
  const errors = [];

  const date = typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : null;
  if (!date) {
    errors.push('A valid booking date is required.');
  }

  const rooms = Array.isArray(body.rooms)
    ? [...new Set(
        body.rooms
          .filter((room) => typeof room === 'string')
          .map((room) => room.trim())
          .filter((room) => VALID_ROOMS.has(room))
      )]
    : [];
  if (!rooms.length) {
    errors.push('Select at least one room.');
  }

  const timePattern = /^\d{2}:\d{2}$/;
  const start = typeof body.start === 'string' && timePattern.test(body.start) ? body.start : null;
  const end = typeof body.end === 'string' && timePattern.test(body.end) ? body.end : null;
  if (!start || !end) {
    errors.push('Start and end times are required.');
  }

  let startMinutes;
  let endMinutes;
  if (start && end) {
    startMinutes = toMinutes(start);
    endMinutes = toMinutes(end);
    if (startMinutes >= endMinutes) {
      errors.push('The end time must be after the start time.');
    }
    if (startMinutes % 30 !== 0 || endMinutes % 30 !== 0) {
      errors.push('Times must be set in 30-minute increments.');
    }
    if (endMinutes - startMinutes < 30) {
      errors.push('Bookings must be at least 30 minutes long.');
    }
  }

  const name = typeof body.name === 'string' && body.name.trim().length ? body.name.trim() : null;
  if (!name) {
    errors.push('Booked by is required.');
  }

  const attendees = Number.parseInt(body.attendees, 10);
  if (!Number.isFinite(attendees) || attendees < 1) {
    errors.push('Attendees must be a positive number.');
  }

  const layouts = Array.isArray(body.layouts) ? body.layouts.filter((item) => typeof item === 'string' && item.trim()) : [];
  const services = Array.isArray(body.services) ? body.services.filter((item) => typeof item === 'string' && item.trim()) : [];
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';

  return {
    valid: errors.length === 0,
    errors,
    payload: {
      date,
      rooms,
      start,
      end,
      name,
      attendees,
      layouts,
      services,
      notes
    }
  };
}

function findConflict(booking, ignoreId) {
  const bookingStart = toMinutes(booking.start);
  const bookingEnd = toMinutes(booking.end);

  for (const existing of bookings) {
    if (existing.date !== booking.date) continue;
    if (ignoreId && existing.id === ignoreId) continue;
    const sharedRooms = existing.rooms.filter((room) => booking.rooms.includes(room));
    if (!sharedRooms.length) continue;
    const existingStart = toMinutes(existing.start);
    const existingEnd = toMinutes(existing.end);
    const overlaps = bookingStart < existingEnd && bookingEnd > existingStart;
    if (overlaps) {
      return { booking: existing, room: sharedRooms[0] };
    }
  }
  return null;
}

function sendJson(res, statusCode, payload) {
  const data = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data)
  });
  res.end(data);
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(text)
  });
  res.end(text);
}

function createResponseConflict(conflict) {
  if (!conflict) {
    return null;
  }
  return {
    message: `Conflicts with ${conflict.booking.name} in ${conflict.room} (${conflict.booking.start} – ${conflict.booking.end})`
  };
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        resolve(parsed);
      } catch (error) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function handleApiRequest(req, res, parsedUrl) {
  if (req.method === 'GET' && parsedUrl.pathname === '/api/bookings') {
    const date = parsedUrl.searchParams.get('date');
    if (!date) {
      sendJson(res, 400, { message: 'Query parameter "date" is required.' });
      return;
    }
    const matches = bookings
      .filter((booking) => booking.date === date)
      .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
    sendJson(res, 200, matches);
    return;
  }

  if (req.method === 'POST' && parsedUrl.pathname === '/api/bookings') {
    readJsonBody(req)
      .then((body) => {
        const { valid, errors, payload } = validateBookingPayload(body || {});
        if (!valid) {
          sendJson(res, 400, { message: 'Validation failed', errors });
          return;
        }
        const conflict = findConflict(payload);
        if (conflict) {
          sendJson(res, 409, createResponseConflict(conflict));
          return;
        }
        const now = new Date().toISOString();
        const booking = {
          ...payload,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now
        };
        bookings.push(booking);
        persistBookingsToFile();
        sendJson(res, 201, booking);
      })
      .catch((error) => {
        console.error(error);
        sendJson(res, 400, { message: error.message });
      });
    return;
  }

  if (req.method === 'PUT' && parsedUrl.pathname.startsWith('/api/bookings/')) {
    const id = parsedUrl.pathname.split('/')[3];
    if (!id) {
      sendJson(res, 400, { message: 'Invalid booking id.' });
      return;
    }
    const index = bookings.findIndex((booking) => booking.id === id);
    if (index === -1) {
      sendJson(res, 404, { message: 'Booking not found.' });
      return;
    }
    readJsonBody(req)
      .then((body) => {
        const { valid, errors, payload } = validateBookingPayload(body || {});
        if (!valid) {
          sendJson(res, 400, { message: 'Validation failed', errors });
          return;
        }
        const conflict = findConflict(payload, id);
        if (conflict) {
          sendJson(res, 409, createResponseConflict(conflict));
          return;
        }
        const updated = {
          ...bookings[index],
          ...payload,
          updatedAt: new Date().toISOString()
        };
        bookings[index] = updated;
        persistBookingsToFile();
        sendJson(res, 200, updated);
      })
      .catch((error) => {
        console.error(error);
        sendJson(res, 400, { message: error.message });
      });
    return;
  }

  if (req.method === 'DELETE' && parsedUrl.pathname.startsWith('/api/bookings/')) {
    const id = parsedUrl.pathname.split('/')[3];
    if (!id) {
      sendJson(res, 400, { message: 'Invalid booking id.' });
      return;
    }
    const next = bookings.filter((booking) => booking.id !== id);
    if (next.length === bookings.length) {
      sendJson(res, 404, { message: 'Booking not found.' });
      return;
    }
    bookings = next;
    persistBookingsToFile();
    res.writeHead(204);
    res.end();
    return;
  }

  sendJson(res, 404, { message: 'Not found' });
}

function serveStaticFile(res, filePath) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    const type = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    stream.on('error', (error) => {
      console.error(error);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal server error');
    });
  });
}

const server = http.createServer((req, res) => {
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

    if (parsedUrl.pathname.startsWith('/api/')) {
      handleApiRequest(req, res, parsedUrl);
      return;
    }

    let pathname = decodeURIComponent(parsedUrl.pathname);
    if (pathname === '/') {
      pathname = '/index.html';
    }

    const requestedPath = path.normalize(path.join(PUBLIC_DIR, pathname));
    if (!requestedPath.startsWith(PUBLIC_DIR)) {
      sendText(res, 403, 'Forbidden');
      return;
    }

    serveStaticFile(res, requestedPath);
  } catch (error) {
    console.error(error);
    sendText(res, 500, 'Internal server error');
  }
});

server.listen(PORT, () => {
  console.log(`Staffordshire Chambers room hire app running at http://localhost:${PORT}`);
});
