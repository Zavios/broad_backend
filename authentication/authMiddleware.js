import { createRemoteJWKSet, jwtVerify } from "jose";
import dotenv from "dotenv";

dotenv.config();

// Build a JWKS fetcher from Supabase's well-known endpoint.
// The keys are cached automatically by jose.
const JWKS = createRemoteJWKSet(new URL(process.env.SUPABASE_JWKS_URL));

/**
 * Express middleware that verifies the Supabase JWT from the
 * `Authorization: Bearer <token>` header.
 *
 * On success it attaches the decoded payload to `req.user` and calls `next()`.
 * On failure it returns 401.
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ error: "Missing or malformed Authorization header" });
    }

    const token = authHeader.split(" ")[1];

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `${process.env.SUPABASE_URL}/auth/v1`,
    });

    // Attach the verified claims to the request for downstream handlers
    req.user = payload;

    next();
  } catch (err) {
    console.error("JWT verification failed:", err.message);

    if (err.code === "ERR_JWT_EXPIRED") {
      return res
        .status(401)
        .json({ error: "Token has expired. Please refresh your session." });
    }

    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
