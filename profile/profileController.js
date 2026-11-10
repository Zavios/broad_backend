import supabaseAdmin from "../db/supabase.js";

// ─── Profile Handlers ───────────────────────────────────────────────────────

/**
 * POST /api/profile
 * Creates a new profile row for the authenticated user.
 */
export const createProfile = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { username, firstName, lastName, dob, email, phone, bio } = req.body;

    // --- Input validation ---
    if (!username || !firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        error: "username, firstName, lastName, and email are required.",
      });
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userId,
        username,
        firstName,
        lastName,
        dob: dob || null,
        email,
        phone: phone || null,
        bio: bio || null,
        initial_setup: true,
        verification_status: "pending",
      })
      .select()
      .single();

    if (error) {
      // Unique-violation / duplicate key
      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          error: "Profile already exists for this user.",
        });
      }
      throw error;
    }

    return res.status(201).json({ success: true, data });
  } catch (err) {
    console.error("createProfile error:", err.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error." });
  }
};

/**
 * GET /api/profile/me
 * Returns the full profile of the currently authenticated user.
 */
export const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.sub;

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res
          .status(404)
          .json({ success: false, error: "Profile not found." });
      }
      throw error;
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("getMyProfile error:", err.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error." });
  }
};

/**
 * GET /api/profile/:id
 * Returns a public view of a profile (sensitive fields omitted).
 */
export const getProfileById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, error: "Profile id is required." });
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, username, firstName, lastName, verification_status, bio, created_at",
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res
          .status(404)
          .json({ success: false, error: "Profile not found." });
      }
      throw error;
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("getProfileById error:", err.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error." });
  }
};

/**
 * PATCH /api/profile
 * Updates allowed fields on the authenticated user's profile.
 */
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.sub;

    // Only allow these fields to be updated
    const allowedFields = [
      "username",
      "firstName",
      "lastName",
      "dob",
      "phone",
      "bio",
    ];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid fields provided for update.",
      });
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res
          .status(404)
          .json({ success: false, error: "Profile not found." });
      }
      throw error;
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("updateProfile error:", err.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error." });
  }
};

// ─── Vehicle Handlers ────────────────────────────────────────────────────────

/**
 * POST /api/profile/vehicle
 * Adds a new vehicle owned by the authenticated user.
 */
export const addVehicle = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { make, model, color, registration_no, seat_capacity } = req.body;

    // --- Input validation ---
    if (
      !make ||
      !model ||
      !color ||
      !registration_no ||
      seat_capacity == null
    ) {
      return res.status(400).json({
        success: false,
        error:
          "make, model, color, registration_no, and seat_capacity are required.",
      });
    }

    if (!Number.isInteger(seat_capacity) || seat_capacity < 1) {
      return res.status(400).json({
        success: false,
        error: "seat_capacity must be a positive integer.",
      });
    }

    const { data, error } = await supabaseAdmin
      .from("vehicles")
      .insert({
        owner_id: userId,
        make,
        model,
        color,
        registration_no,
        seat_capacity,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          error: "A vehicle with this registration number already exists.",
        });
      }
      throw error;
    }

    return res.status(201).json({ success: true, data });
  } catch (err) {
    console.error("addVehicle error:", err.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error." });
  }
};

/**
 * GET /api/profile/vehicle
 * Returns all vehicles belonging to the authenticated user.
 */
export const getMyVehicles = async (req, res) => {
  try {
    const userId = req.user.sub;

    const { data, error } = await supabaseAdmin
      .from("vehicles")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("getMyVehicles error:", err.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error." });
  }
};

/**
 * PATCH /api/profile/vehicle/:vehicleId
 * Updates a vehicle only if the authenticated user owns it.
 */
export const updateVehicle = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { vehicleId } = req.params;

    if (!vehicleId) {
      return res
        .status(400)
        .json({ success: false, error: "vehicleId is required." });
    }

    // Only allow these fields to be updated
    const allowedFields = [
      "make",
      "model",
      "color",
      "registration_no",
      "seat_capacity",
    ];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid fields provided for update.",
      });
    }

    // Validate seat_capacity if provided
    if (
      updates.seat_capacity !== undefined &&
      (!Number.isInteger(updates.seat_capacity) || updates.seat_capacity < 1)
    ) {
      return res.status(400).json({
        success: false,
        error: "seat_capacity must be a positive integer.",
      });
    }

    // Update only if the vehicle belongs to the authenticated user
    const { data, error } = await supabaseAdmin
      .from("vehicles")
      .update(updates)
      .eq("id", vehicleId)
      .eq("owner_id", userId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          error: "Vehicle not found or you are not the owner.",
        });
      }
      throw error;
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("updateVehicle error:", err.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error." });
  }
};

/**
 * DELETE /api/profile/vehicle/:vehicleId
 * Deletes a vehicle only if the authenticated user owns it.
 */
export const deleteVehicle = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { vehicleId } = req.params;

    if (!vehicleId) {
      return res
        .status(400)
        .json({ success: false, error: "vehicleId is required." });
    }

    // Delete only if the vehicle belongs to the authenticated user
    const { data, error } = await supabaseAdmin
      .from("vehicles")
      .delete()
      .eq("id", vehicleId)
      .eq("owner_id", userId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          error: "Vehicle not found or you are not the owner.",
        });
      }
      throw error;
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("deleteVehicle error:", err.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error." });
  }
};
