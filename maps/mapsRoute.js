import { Router } from "express";
import { authenticate } from "../authentication/authMiddleware.js";
import { validateCoordinates } from "./mapsMiddleware.js";
import {
  getRoutes,
  getDistance,
  geocode,
  reverseGeocode,
  autocomplete,
} from "./mapsController.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── Coordinate-based routes (validated) ──────────
router.post("/routes", validateCoordinates, getRoutes);
router.post("/distance", validateCoordinates, getDistance);

// ── Geocoding & autocomplete ─────────────────────
router.get("/geocode", geocode);
router.get("/reverse-geocode", reverseGeocode);
router.get("/autocomplete", autocomplete);

export default router;
