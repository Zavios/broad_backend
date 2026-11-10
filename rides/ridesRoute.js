import { Router } from "express";
import { authenticate } from "../authentication/authMiddleware.js";
import {
  validatePublishRide,
  validateBooking,
} from "./ridesMiddleware.js";
import {
  publishRide,
  getRideById,
  searchRides,
  getMyPublishedRides,
  updateRide,
  cancelRide,
  requestTagAlong,
  respondToBooking,
  cancelBooking,
  getMyBookings,
  getRideBookings,
} from "./ridesController.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── Specific routes BEFORE parameterized /:rideId ────────────────────────────
router.get("/search", searchRides);
router.get("/my/published", getMyPublishedRides);
router.get("/my/bookings", getMyBookings);

// ── Ride CRUD ────────────────────────────────────────────────────────────────
router.post("/", validatePublishRide, publishRide);
router.get("/:rideId", getRideById);
router.patch("/:rideId", updateRide);
router.post("/:rideId/cancel", cancelRide);

// ── Booking (tag along) ──────────────────────────────────────────────────────
router.post("/:rideId/book", validateBooking, requestTagAlong);
router.patch("/:rideId/booking/:bookingId", respondToBooking);
router.post("/:rideId/booking/:bookingId/cancel", cancelBooking);
router.get("/:rideId/bookings", getRideBookings);

export default router;
