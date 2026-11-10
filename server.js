import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";
import authRouter from "./authentication/authRoute.js";
import profileRouter from "./profile/profileRoute.js";
import mapsRouter from "./maps/mapsRoute.js";
import ridesRouter from "./rides/ridesRoute.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = express();

app.use(morgan("dev"));
app.use(
  cors({
    origin: ["http://localhost:5173", "https://yourdomain.com"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Set-Cookie"],
  }),
);
app.use(express.json());

// ── Routes ──────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/maps", mapsRouter);
app.use("/api/rides", ridesRouter);

// ── Start ───────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
