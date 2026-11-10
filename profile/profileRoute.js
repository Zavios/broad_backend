import { Router } from "express";
import { authenticate } from "../authentication/authMiddleware.js";
import {
  createProfile,
  getMyProfile,
  getProfileById,
  updateProfile,
  addVehicle,
  getMyVehicles,
  updateVehicle,
  deleteVehicle,
} from "./profileController.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// ─── Profile routes ──────────────────────────────────────────────────────────
router.post("/", createProfile);
router.get("/me", getMyProfile);
router.get("/:id", getProfileById);
router.patch("/", updateProfile);

// ─── Vehicle routes ──────────────────────────────────────────────────────────
router.post("/vehicle", addVehicle);
router.get("/v/all", getMyVehicles);
router.patch("/vehicle/:vehicleId", updateVehicle);
router.delete("/vehicle/:vehicleId", deleteVehicle);

export default router;
