const HALF_HOUR_MS = 30 * 60 * 1000;

const isHalfHourIncrement = (date) => {
  const minutes = date.getUTCMinutes();
  return minutes === 0 || minutes === 30;
};

export const ensureHalfHourIncrement = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);

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

  if (!isHalfHourIncrement(start) || !isHalfHourIncrement(end)) {
    const error = new Error("Bookings must start and end on 30-minute boundaries");
    error.status = 400;
    throw error;
  }

  const duration = end.getTime() - start.getTime();
  if (duration % HALF_HOUR_MS !== 0) {
    const error = new Error("Booking duration must be in 30-minute increments");
    error.status = 400;
    throw error;
  }
};

export const ensureSameDay = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (
    start.getUTCFullYear() !== end.getUTCFullYear() ||
    start.getUTCMonth() !== end.getUTCMonth() ||
    start.getUTCDate() !== end.getUTCDate()
  ) {
    const error = new Error("Bookings must start and end on the same day");
    error.status = 400;
    throw error;
  }
};
