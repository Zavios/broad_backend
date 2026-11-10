import supabaseAdmin from "../db/supabase.js";

// ──────────────────────────────────────────────
//  Publish a Ride (with stops)
// ──────────────────────────────────────────────
export const publishRide = async (req, res) => {
  try {
    const driverId = req.user.sub;
    const {
      vehicle_id,
      departure_at,
      seat_offered,
      price_per_seat,
      currency,
      route_polyline,
      description,
      stops,
    } = req.body;

    // Insert the ride
    const { data: ride, error: rideError } = await supabaseAdmin
      .from("rides")
      .insert({
        driver_id: driverId,
        vehicle_id,
        departure_at,
        seat_offered,
        seat_available: seat_offered,
        price_per_seat,
        currency: currency || "INR",
        route_polyline: route_polyline || null,
        description: description || null,
        status: "active",
      })
      .select()
      .single();

    if (rideError) throw rideError;

    // Insert all stops with the ride's id
    const stopsPayload = stops.map((stop) => ({
      ride_id: ride.id,
      stop_order: stop.stop_order,
      stop_type: stop.stop_type,
      location_name: stop.location_name,
      longitude: stop.longitude,
      latitude: stop.latitude,
      scheduled_at: stop.scheduled_at || null,
      allow_pickup: stop.allow_pickup ?? true,
      allow_dropoff: stop.allow_dropoff ?? true,
    }));

    const { data: rideStops, error: stopsError } = await supabaseAdmin
      .from("rides_stops")
      .insert(stopsPayload)
      .select();

    if (stopsError) {
      // Rollback the ride if stops fail
      await supabaseAdmin.from("rides").delete().eq("id", ride.id);
      throw stopsError;
    }

    return res.status(201).json({
      success: true,
      data: { ...ride, stops: rideStops },
    });
  } catch (err) {
    console.error("publishRide error:", err.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error." });
  }
};

// ──────────────────────────────────────────────
//  Get Ride by ID (with stops & driver profile)
// ──────────────────────────────────────────────
export const getRideById = async (req, res) => {
  try {
    const { rideId } = req.params;

    const { data: ride, error } = await supabaseAdmin
      .from("rides")
      .select(
        "*, rides_stops(*), profiles:driver_id(id, username, firstName, lastName, verification_status)",
      )
      .eq("id", rideId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res
          .status(404)
          .json({ success: false, error: "Ride not found." });
      }
      throw error;
    }

    return res.status(200).json({ success: true, data: ride });
  } catch (err) {
    console.error("getRideById error:", err.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error." });
  }
};

// ──────────────────────────────────────────────
//  Search Rides
// ──────────────────────────────────────────────
export const searchRides = async (req, res) => {
  try {
    const { status = "active", min_seats, departure_date } = req.query;

    let query = supabaseAdmin
      .from("rides")
      .select(
        "*, rides_stops(*), profiles:driver_id(id, username, firstName, lastName)",
      )
      .eq("status", status)
      .gt("seat_available", 0)
      .order("departure_at", { ascending: true });

    if (min_seats) {
      query = query.gte("seat_available", parseInt(min_seats, 10));
    }

    if (departure_date) {
      query = query.eq("departure_at", departure_date);
    }

    const { data, error } = await query;

    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("searchRides error:", err.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error." });
  }
};

// ──────────────────────────────────────────────
//  Get My Published Rides
// ──────────────────────────────────────────────
export const getMyPublishedRides = async (req, res) => {
  try {
    const driverId = req.user.sub;

    const { data, error } = await supabaseAdmin
      .from("rides")
      .select("*, rides_stops(*)")
      .eq("driver_id", driverId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("getMyPublishedRides error:", err.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error." });
  }
};

// ──────────────────────────────────────────────
//  Update Ride (driver only, active rides only)
// ──────────────────────────────────────────────
export const updateRide = async (req, res) => {
  try {
    const driverId = req.user.sub;
    const { rideId } = req.params;

    // Fetch ride to verify ownership and status
    const { data: existingRide, error: fetchError } = await supabaseAdmin
      .from("rides")
      .select("*")
      .eq("id", rideId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return res
          .status(404)
          .json({ success: false, error: "Ride not found." });
      }
      throw fetchError;
    }

    if (existingRide.driver_id !== driverId) {
      return res.status(403).json({
        success: false,
        error: "Only the driver can update this ride.",
      });
    }

    if (
      existingRide.status === "cancelled" ||
      existingRide.status === "completed"
    ) {
      return res.status(400).json({
        success: false,
        error: `Cannot update a ride with status '${existingRide.status}'.`,
      });
    }

    // Whitelist updatable fields
    const allowedFields = [
      "departure_at",
      "price_per_seat",
      "description",
      "seat_offered",
    ];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // If seat_offered changes, recalculate seat_available
    if (updates.seat_offered !== undefined) {
      const bookedSeats =
        existingRide.seat_offered - existingRide.seat_available;
      const newAvailable = updates.seat_offered - bookedSeats;

      if (newAvailable < 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot reduce seat_offered below already booked seats (${bookedSeats}).`,
        });
      }

      updates.seat_available = newAvailable;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid fields provided for update.",
      });
    }

    const { data, error } = await supabaseAdmin
      .from("rides")
      .update(updates)
      .eq("id", rideId)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("updateRide error:", err.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error." });
  }
};

// ──────────────────────────────────────────────
//  Cancel Ride (driver cancels + all bookings)
// ──────────────────────────────────────────────
export const cancelRide = async (req, res) => {
  try {
    const driverId = req.user.sub;
    const { rideId } = req.params;

    // Verify ownership
    const { data: ride, error: fetchError } = await supabaseAdmin
      .from("rides")
      .select("*")
      .eq("id", rideId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return res
          .status(404)
          .json({ success: false, error: "Ride not found." });
      }
      throw fetchError;
    }

    if (ride.driver_id !== driverId) {
      return res.status(403).json({
        success: false,
        error: "Only the driver can cancel this ride.",
      });
    }

    if (ride.status === "cancelled") {
      return res.status(400).json({
        success: false,
        error: "Ride is already cancelled.",
      });
    }

    // Cancel the ride
    const { data: cancelledRide, error: cancelError } = await supabaseAdmin
      .from("rides")
      .update({ status: "cancelled" })
      .eq("id", rideId)
      .select()
      .single();

    if (cancelError) throw cancelError;

    // Cancel all pending/confirmed bookings for this ride
    await supabaseAdmin
      .from("booking")
      .update({ status: "cancelled" })
      .eq("ride_id", rideId)
      .in("status", ["pending", "confirmed"]);

    return res.status(200).json({
      success: true,
      data: cancelledRide,
      message: "Ride and associated bookings have been cancelled.",
    });
  } catch (err) {
    console.error("cancelRide error:", err.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error." });
  }
};

// ──────────────────────────────────────────────
//  Request Tag Along (passenger books a ride)
// ──────────────────────────────────────────────
export const requestTagAlong = async (req, res) => {
  try {
    const passengerId = req.user.sub;
    const { rideId } = req.params;
    const { pickup_stop_id, dropoff_stop_id, seats_booked } = req.body;

    // Fetch the ride
    const { data: ride, error: rideError } = await supabaseAdmin
      .from("rides")
      .select("*")
      .eq("id", rideId)
      .single();

    if (rideError) {
      if (rideError.code === "PGRST116") {
        return res
          .status(404)
          .json({ success: false, error: "Ride not found." });
      }
      throw rideError;
    }

    // Validations
    if (ride.status !== "active") {
      return res.status(400).json({
        success: false,
        error: "This ride is not accepting bookings.",
      });
    }

    if (ride.driver_id === passengerId) {
      return res.status(400).json({
        success: false,
        error: "You cannot book your own ride.",
      });
    }

    if (ride.seat_available < seats_booked) {
      return res.status(400).json({
        success: false,
        error: `Only ${ride.seat_available} seat(s) available. Requested ${seats_booked}.`,
      });
    }

    const total_amount = seats_booked * ride.price_per_seat;

    // Create the booking
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("booking")
      .insert({
        ride_id: rideId,
        passenger_id: passengerId,
        pickup_stop_id,
        dropoff_stop_id,
        seats_booked,
        total_amount,
        status: "pending",
      })
      .select()
      .single();

    if (bookingError) throw bookingError;

    // Decrement available seats
    const { error: seatError } = await supabaseAdmin
      .from("rides")
      .update({ seat_available: ride.seat_available - seats_booked })
      .eq("id", rideId);

    if (seatError) throw seatError;

    return res.status(201).json({ success: true, data: booking });
  } catch (err) {
    console.error("requestTagAlong error:", err.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error." });
  }
};

// ──────────────────────────────────────────────
//  Respond to Booking (driver confirms/rejects)
// ──────────────────────────────────────────────
export const respondToBooking = async (req, res) => {
  try {
    const driverId = req.user.sub;
    const { rideId, bookingId } = req.params;
    const { action } = req.body; // 'confirm' or 'reject'

    if (!action || !["confirm", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        error: "action must be 'confirm' or 'reject'.",
      });
    }

    // Verify ride ownership
    const { data: ride, error: rideError } = await supabaseAdmin
      .from("rides")
      .select("driver_id, seat_available")
      .eq("id", rideId)
      .single();

    if (rideError) {
      if (rideError.code === "PGRST116") {
        return res
          .status(404)
          .json({ success: false, error: "Ride not found." });
      }
      throw rideError;
    }

    if (ride.driver_id !== driverId) {
      return res.status(403).json({
        success: false,
        error: "Only the ride's driver can respond to bookings.",
      });
    }

    // Fetch the booking
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("booking")
      .select("*")
      .eq("id", bookingId)
      .eq("ride_id", rideId)
      .single();

    if (bookingError) {
      if (bookingError.code === "PGRST116") {
        return res
          .status(404)
          .json({ success: false, error: "Booking not found." });
      }
      throw bookingError;
    }

    if (booking.status !== "pending") {
      return res.status(400).json({
        success: false,
        error: `Cannot ${action} a booking with status '${booking.status}'.`,
      });
    }

    const newStatus = action === "confirm" ? "confirmed" : "rejected";

    const { data: updatedBooking, error: updateError } = await supabaseAdmin
      .from("booking")
      .update({ status: newStatus })
      .eq("id", bookingId)
      .select()
      .single();

    if (updateError) throw updateError;

    // If rejected, give the seats back
    if (action === "reject") {
      await supabaseAdmin
        .from("rides")
        .update({
          seat_available: ride.seat_available + booking.seats_booked,
        })
        .eq("id", rideId);
    }

    return res.status(200).json({ success: true, data: updatedBooking });
  } catch (err) {
    console.error("respondToBooking error:", err.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error." });
  }
};

// ──────────────────────────────────────────────
//  Cancel Booking (passenger cancels own booking)
// ──────────────────────────────────────────────
export const cancelBooking = async (req, res) => {
  try {
    const passengerId = req.user.sub;
    const { rideId, bookingId } = req.params;

    // Fetch the booking
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from("booking")
      .select("*")
      .eq("id", bookingId)
      .eq("ride_id", rideId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return res
          .status(404)
          .json({ success: false, error: "Booking not found." });
      }
      throw fetchError;
    }

    if (booking.passenger_id !== passengerId) {
      return res.status(403).json({
        success: false,
        error: "Only the passenger can cancel their booking.",
      });
    }

    if (!["pending", "confirmed"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel a booking with status '${booking.status}'.`,
      });
    }

    // Cancel the booking
    const { data: cancelledBooking, error: cancelError } = await supabaseAdmin
      .from("booking")
      .update({ status: "cancelled" })
      .eq("id", bookingId)
      .select()
      .single();

    if (cancelError) throw cancelError;

    // Give seats back to the ride
    const { data: ride } = await supabaseAdmin
      .from("rides")
      .select("seat_available")
      .eq("id", rideId)
      .single();

    if (ride) {
      await supabaseAdmin
        .from("rides")
        .update({
          seat_available: ride.seat_available + booking.seats_booked,
        })
        .eq("id", rideId);
    }

    return res.status(200).json({ success: true, data: cancelledBooking });
  } catch (err) {
    console.error("cancelBooking error:", err.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error." });
  }
};

// ──────────────────────────────────────────────
//  Get My Bookings (as passenger)
// ──────────────────────────────────────────────
export const getMyBookings = async (req, res) => {
  try {
    const passengerId = req.user.sub;

    const { data, error } = await supabaseAdmin
      .from("booking")
      .select(
        "*, rides:ride_id(id, departure_at, status, price_per_seat, currency, rides_stops(*))",
      )
      .eq("passenger_id", passengerId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("getMyBookings error:", err.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error." });
  }
};

// ──────────────────────────────────────────────
//  Get Ride Bookings (driver views bookings)
// ──────────────────────────────────────────────
export const getRideBookings = async (req, res) => {
  try {
    const driverId = req.user.sub;
    const { rideId } = req.params;

    // Verify ride ownership
    const { data: ride, error: rideError } = await supabaseAdmin
      .from("rides")
      .select("driver_id")
      .eq("id", rideId)
      .single();

    if (rideError) {
      if (rideError.code === "PGRST116") {
        return res
          .status(404)
          .json({ success: false, error: "Ride not found." });
      }
      throw rideError;
    }

    if (ride.driver_id !== driverId) {
      return res.status(403).json({
        success: false,
        error: "Only the driver can view bookings for this ride.",
      });
    }

    const { data, error } = await supabaseAdmin
      .from("booking")
      .select("*, profiles:passenger_id(id, username, firstName, lastName)")
      .eq("ride_id", rideId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("getRideBookings error:", err.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error." });
  }
};
