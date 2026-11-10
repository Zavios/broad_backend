/**
 * Rides Middleware — input validation for ride publishing and booking.
 */

/**
 * Validates the request body for publishing a new ride.
 * Required fields: vehicle_id, departure_at, seat_offered, price_per_seat, stops.
 * stops must be an array with >= 2 items, including at least one 'origin' and one 'destination'.
 */
export const validatePublishRide = (req, res, next) => {
  const { vehicle_id, departure_at, seat_offered, price_per_seat, stops } =
    req.body;

  const errors = [];

  if (!vehicle_id) {
    errors.push("vehicle_id is required.");
  }

  if (!departure_at) {
    errors.push("departure_at is required.");
  }

  if (seat_offered === undefined || seat_offered === null) {
    errors.push("seat_offered is required.");
  } else if (!Number.isInteger(seat_offered) || seat_offered < 1) {
    errors.push("seat_offered must be a positive integer.");
  }

  if (price_per_seat === undefined || price_per_seat === null) {
    errors.push("price_per_seat is required.");
  } else if (typeof price_per_seat !== "number" || price_per_seat < 0) {
    errors.push("price_per_seat must be a non-negative number.");
  }

  // Validate stops array
  if (!stops) {
    errors.push("stops is required.");
  } else if (!Array.isArray(stops)) {
    errors.push("stops must be an array.");
  } else if (stops.length < 2) {
    errors.push("stops must contain at least 2 items (origin and destination).");
  } else {
    const hasOrigin = stops.some((s) => s.stop_type === "origin");
    const hasDestination = stops.some((s) => s.stop_type === "destination");

    if (!hasOrigin) {
      errors.push("stops must include at least one stop with stop_type 'origin'.");
    }
    if (!hasDestination) {
      errors.push(
        "stops must include at least one stop with stop_type 'destination'.",
      );
    }

    // Validate each stop's required fields
    stops.forEach((stop, index) => {
      if (!stop.location_name) {
        errors.push(`stops[${index}].location_name is required.`);
      }
      if (stop.longitude === undefined || stop.longitude === null) {
        errors.push(`stops[${index}].longitude is required.`);
      }
      if (stop.latitude === undefined || stop.latitude === null) {
        errors.push(`stops[${index}].latitude is required.`);
      }
      if (stop.stop_order === undefined || stop.stop_order === null) {
        errors.push(`stops[${index}].stop_order is required.`);
      }
      if (!stop.stop_type) {
        errors.push(`stops[${index}].stop_type is required.`);
      } else if (!["origin", "stop", "destination"].includes(stop.stop_type)) {
        errors.push(
          `stops[${index}].stop_type must be 'origin', 'stop', or 'destination'.`,
        );
      }
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: errors.join(" ") });
  }

  next();
};

/**
 * Validates the request body for requesting a tag-along (booking).
 * Required fields: pickup_stop_id, dropoff_stop_id, seats_booked (>= 1).
 */
export const validateBooking = (req, res, next) => {
  const { pickup_stop_id, dropoff_stop_id, seats_booked } = req.body;

  const errors = [];

  if (!pickup_stop_id) {
    errors.push("pickup_stop_id is required.");
  }

  if (!dropoff_stop_id) {
    errors.push("dropoff_stop_id is required.");
  }

  if (seats_booked === undefined || seats_booked === null) {
    errors.push("seats_booked is required.");
  } else if (!Number.isInteger(seats_booked) || seats_booked < 1) {
    errors.push("seats_booked must be an integer >= 1.");
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: errors.join(" ") });
  }

  next();
};
