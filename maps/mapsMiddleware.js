/**
 * Validates that origin and destination in req.body contain valid
 * latitude (-90 to 90) and longitude (-180 to 180) values.
 */
export const validateCoordinates = (req, res, next) => {
  const { origin, destination } = req.body;

  if (!origin || !destination) {
    return res.status(400).json({
      success: false,
      error: "origin and destination are required.",
    });
  }

  const isValid = (coord, label) => {
    const errors = [];

    if (coord.latitude === undefined || coord.latitude === null) {
      errors.push(`${label}.latitude is required.`);
    } else if (coord.latitude < -90 || coord.latitude > 90) {
      errors.push(`${label}.latitude must be between -90 and 90.`);
    }

    if (coord.longitude === undefined || coord.longitude === null) {
      errors.push(`${label}.longitude is required.`);
    } else if (coord.longitude < -180 || coord.longitude > 180) {
      errors.push(`${label}.longitude must be between -180 and 180.`);
    }

    return errors;
  };

  const errors = [
    ...isValid(origin, "origin"),
    ...isValid(destination, "destination"),
  ];

  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: errors.join(" ") });
  }

  next();
};
