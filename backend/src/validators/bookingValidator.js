import { body, param, query } from "express-validator";

const layoutOptions = ["boardroom", "u-shape", "theatre"];
const equipmentOptions = ["laptop", "projector", "flipchart"];

export const dateQueryValidator = [
  query("date")
    .isISO8601({ strict: true })
    .withMessage("Date must be in ISO8601 format (YYYY-MM-DD)")
];

const baseBookingValidators = [
  body("contactName").trim().isLength({ min: 2 }).withMessage("Contact name required"),
  body("attendeeCount")
    .isInt({ min: 1 })
    .withMessage("Attendee count must be a positive integer"),
  body("layout")
    .isIn(layoutOptions)
    .withMessage(`Layout must be one of: ${layoutOptions.join(", ")}`),
  body("refreshments").optional().isBoolean().withMessage("Refreshments must be boolean"),
  body("refreshmentsDetails")
    .optional({ nullable: true })
    .isString()
    .withMessage("Refreshments details must be text"),
  body("lunch").optional().isBoolean().withMessage("Lunch must be boolean"),
  body("lunchDetails")
    .optional({ nullable: true })
    .isString()
    .withMessage("Lunch details must be text"),
  body("equipment")
    .optional()
    .isArray()
    .withMessage("Equipment must be an array of strings")
    .bail()
    .custom((value) => value.every((item) => equipmentOptions.includes(item)))
    .withMessage(`Equipment must be within: ${equipmentOptions.join(", ")}`),
  body("rooms")
    .isArray({ min: 1 })
    .withMessage("At least one room is required")
    .bail()
    .custom((value) => value.every((item) => Number.isInteger(item)))
    .withMessage("Rooms must be an array of numeric IDs"),
  body("startTime").isISO8601().withMessage("Start time must be ISO8601 datetime"),
  body("endTime").isISO8601().withMessage("End time must be ISO8601 datetime")
];

export const createBookingValidator = [...baseBookingValidators];

export const updateBookingValidator = [
  param("id").isInt().withMessage("Booking ID must be an integer"),
  ...baseBookingValidators
];
