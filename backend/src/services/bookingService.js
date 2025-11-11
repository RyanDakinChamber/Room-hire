import { ensureHalfHourIncrement, ensureSameDay } from "../utils/time.js";
import { findRoomsByIds } from "./roomService.js";

let bookings = [];
let nextId = 1;

const normalizeBoolean = (value) => Boolean(value);

const assertRoomsExist = (roomIds) => {
  const matchedRooms = findRoomsByIds(roomIds);
  if (matchedRooms.length !== roomIds.length) {
    const missing = roomIds.filter(
      (roomId) => !matchedRooms.some((room) => room.id === roomId)
    );
    const error = new Error(`Unknown room id(s): ${missing.join(", ")}`);
    error.status = 400;
    throw error;
  }
};

const buildResponse = (booking) => ({
  id: booking.id,
  contactName: booking.contactName,
  attendeeCount: booking.attendeeCount,
  layout: booking.layout,
  refreshments: booking.refreshments,
  refreshmentsDetails: booking.refreshmentsDetails,
  lunch: booking.lunch,
  lunchDetails: booking.lunchDetails,
  equipment: booking.equipment,
  startTime: booking.startTime,
  endTime: booking.endTime,
  rooms: findRoomsByIds(booking.rooms)
});

const hasOverlap = (startA, endA, startB, endB) => startA < endB && endA > startB;

const checkConflicts = (roomIds, startTime, endTime, excludeId) => {
  const start = new Date(startTime);
  const end = new Date(endTime);

  const conflicts = bookings.filter((booking) => {
    if (excludeId && booking.id === excludeId) {
      return false;
    }
    const sharesRoom = booking.rooms.some((roomId) => roomIds.includes(roomId));
    if (!sharesRoom) {
      return false;
    }
    const bookingStart = new Date(booking.startTime);
    const bookingEnd = new Date(booking.endTime);
    return hasOverlap(bookingStart, bookingEnd, start, end);
  });

  if (conflicts.length > 0) {
    const roomNames = [
      ...new Set(
        conflicts.flatMap((booking) =>
          findRoomsByIds(booking.rooms)
            .filter((room) => roomIds.includes(room.id))
            .map((room) => room.name)
        )
      )
    ];
    const error = new Error(
      `Conflict detected with existing booking(s) in: ${roomNames.join(", ")}`
    );
    error.status = 409;
    throw error;
  }
};

const coerceIsoString = (value) => new Date(value).toISOString();

const sanitizeOptionalText = (enabled, value) => (enabled ? value ?? null : null);

export const getBookingsForDate = async (date) => {
  const [year, month, day] = date.split("-").map(Number);

  return bookings
    .filter((booking) => {
      const start = new Date(booking.startTime);
      return (
        start.getUTCFullYear() === year &&
        start.getUTCMonth() + 1 === month &&
        start.getUTCDate() === day
      );
    })
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
    .map(buildResponse);
};

export const createBooking = async (payload) => {
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
  assertRoomsExist(rooms);
  checkConflicts(rooms, startTime, endTime);

  const normalizedRefreshments = normalizeBoolean(refreshments);
  const normalizedLunch = normalizeBoolean(lunch);

  const booking = {
    id: nextId++,
    contactName,
    attendeeCount,
    layout,
    refreshments: normalizedRefreshments,
    refreshmentsDetails: sanitizeOptionalText(
      normalizedRefreshments,
      refreshmentsDetails
    ),
    lunch: normalizedLunch,
    lunchDetails: sanitizeOptionalText(normalizedLunch, lunchDetails),
    equipment,
    startTime: coerceIsoString(startTime),
    endTime: coerceIsoString(endTime),
    rooms
  };

  bookings.push(booking);
  return buildResponse(booking);
};

export const updateBooking = async (bookingId, payload) => {
  const existingIndex = bookings.findIndex((booking) => booking.id === bookingId);

  if (existingIndex === -1) {
    const error = new Error("Booking not found");
    error.status = 404;
    throw error;
  }

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
  assertRoomsExist(rooms);
  checkConflicts(rooms, startTime, endTime, bookingId);

  const normalizedRefreshments = normalizeBoolean(refreshments);
  const normalizedLunch = normalizeBoolean(lunch);

  const updatedBooking = {
    ...bookings[existingIndex],
    contactName,
    attendeeCount,
    layout,
    refreshments: normalizedRefreshments,
    refreshmentsDetails: sanitizeOptionalText(
      normalizedRefreshments,
      refreshmentsDetails
    ),
    lunch: normalizedLunch,
    lunchDetails: sanitizeOptionalText(normalizedLunch, lunchDetails),
    equipment,
    startTime: coerceIsoString(startTime),
    endTime: coerceIsoString(endTime),
    rooms
  };

  bookings[existingIndex] = updatedBooking;
  return buildResponse(updatedBooking);
};

export const deleteBooking = async (bookingId) => {
  const existingIndex = bookings.findIndex((booking) => booking.id === bookingId);

  if (existingIndex === -1) {
    const error = new Error("Booking not found");
    error.status = 404;
    throw error;
  }

  bookings.splice(existingIndex, 1);
};

export const resetBookings = () => {
  bookings = [];
  nextId = 1;
};
