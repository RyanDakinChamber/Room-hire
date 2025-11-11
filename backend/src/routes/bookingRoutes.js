import { Router } from "express";
import {
  createBooking,
  deleteBooking,
  getBookingsByDate,
  updateBooking
} from "../controllers/bookingController.js";
import {
  createBookingValidator,
  updateBookingValidator,
  dateQueryValidator
} from "../validators/bookingValidator.js";
import validateRequest from "../middleware/validateRequest.js";

const router = Router();

router.get("/", dateQueryValidator, validateRequest, getBookingsByDate);
router.post("/", createBookingValidator, validateRequest, createBooking);
router.put("/:id", updateBookingValidator, validateRequest, updateBooking);
router.delete("/:id", deleteBooking);

export default router;
