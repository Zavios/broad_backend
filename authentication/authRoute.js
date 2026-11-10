import { Router } from "express";
import {
  signUp,
  signIn,
  googleOAuth,
  oauthCallback,
  refreshSession,
  signOut,
  getMe,
} from "./authController.js";
import { authenticate } from "./authMiddleware.js";

const router = Router();

// ── Public routes ───────────────────────────────
router.post("/signup", signUp);
router.post("/signin", signIn);
router.get("/google", googleOAuth);
router.get("/callback", oauthCallback);
router.post("/refresh", refreshSession);

// ── Protected routes ────────────────────────────
router.post("/signout", authenticate, signOut);
router.get("/me", authenticate, getMe);

export default router;

