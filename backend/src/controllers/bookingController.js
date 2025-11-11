import * as bookingService from "../services/bookingService.js";

export const getBookingsByDate = async (req, res, next) => {
  try {
    const { date } = req.query;
    const bookings = await bookingService.getBookingsForDate(date);
    res.json({ bookings });
  } catch (error) {
    next(error);
  }
};

export const createBooking = async (req, res, next) => {
  try {
    const booking = await bookingService.createBooking(req.body);
    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
};

export const updateBooking = async (req, res, next) => {
  try {
    const bookingId = parseInt(req.params.id, 10);
    const booking = await bookingService.updateBooking(bookingId, req.body);
    res.json(booking);
  } catch (error) {
    next(error);
  }
};

export const deleteBooking = async (req, res, next) => {
  try {
    const bookingId = parseInt(req.params.id, 10);
    await bookingService.deleteBooking(bookingId);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
