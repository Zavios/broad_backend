import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// ──────────────────────────────────────────────
//  Compute Routes (Routes API v2 with Directions API fallback)
// ──────────────────────────────────────────────
export const getRoutes = async (req, res) => {
  try {
    const { origin, destination, computeAlternatives = true } = req.body;

    // 1. Try Routes API v2 first
    try {
      const response = await axios.post(
        "https://routes.googleapis.com/directions/v2:computeRoutes",
        {
          origin: { location: { latLng: origin } },
          destination: { location: { latLng: destination } },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE",
          computeAlternativeRoutes: computeAlternatives,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": API_KEY,
            "X-Goog-FieldMask":
              "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs",
          },
          timeout: 8000,
        },
      );

      const routes = (response.data.routes || []).map((route) => ({
        distanceMeters: route.distanceMeters,
        distanceKm: (route.distanceMeters / 1000).toFixed(2),
        duration: route.duration,
        encodedPolyline: route.polyline?.encodedPolyline || null,
        legs: route.legs || [],
      }));

      if (routes.length > 0) {
        return res.status(200).json({ success: true, data: routes });
      }
    } catch (v2Error) {
      console.warn("Routes API v2 failed or not enabled, attempting Directions API fallback...", v2Error.response?.data?.error?.message || v2Error.message);
    }

    // 2. Fallback to classic Directions API (maps.googleapis.com)
    console.log("Calling classic Directions API fallback...");
    const dirResponse = await axios.get(
      "https://maps.googleapis.com/maps/api/directions/json",
      {
        params: {
          origin: `${origin.latitude},${origin.longitude}`,
          destination: `${destination.latitude},${destination.longitude}`,
          alternatives: computeAlternatives,
          mode: "driving",
          key: API_KEY,
        },
        timeout: 8000,
      },
    );

    const dirData = dirResponse.data;
    if (dirData.status === "OK" && Array.isArray(dirData.routes) && dirData.routes.length > 0) {
      const routes = dirData.routes.map((route) => {
        const totalDistanceMeters = route.legs.reduce((acc, leg) => acc + (leg.distance?.value || 0), 0);
        const totalDurationSeconds = route.legs.reduce((acc, leg) => acc + (leg.duration?.value || 0), 0);
        return {
          distanceMeters: totalDistanceMeters,
          distanceKm: (totalDistanceMeters / 1000).toFixed(2),
          duration: `${totalDurationSeconds}s`,
          encodedPolyline: route.overview_polyline?.points || null,
          legs: route.legs || [],
        };
      });

      return res.status(200).json({ success: true, data: routes });
    }

    // If directions API returned an error status (e.g. ZERO_RESULTS, REQUEST_DENIED)
    if (dirData.status && dirData.status !== "OK") {
      console.error("Directions API returned non-OK status:", dirData.status, dirData.error_message);
      return res.status(400).json({
        success: false,
        error: dirData.error_message || `Directions API returned: ${dirData.status}`,
      });
    }

    return res.status(404).json({ success: false, error: "No routes found." });
  } catch (error) {
    console.error("getRoutes error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to compute routes.",
      details: error.response?.data || error.message,
    });
  }
};

// ──────────────────────────────────────────────
//  Get Distance Only (lightweight)
// ──────────────────────────────────────────────
export const getDistance = async (req, res) => {
  try {
    const { origin, destination } = req.body;

    const response = await axios.post(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        origin: { location: { latLng: origin } },
        destination: { location: { latLng: destination } },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": API_KEY,
          "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
        },
      },
    );

    const route = response.data.routes?.[0];

    if (!route) {
      return res.status(404).json({ success: false, error: "No route found." });
    }

    return res.status(200).json({
      success: true,
      data: {
        distanceMeters: route.distanceMeters,
        distanceKm: (route.distanceMeters / 1000).toFixed(2),
        duration: route.duration,
      },
    });
  } catch (error) {
    console.error("getDistance error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to compute distance.",
      details: error.response?.data || error.message,
    });
  }
};

// ──────────────────────────────────────────────
//  Forward Geocode (address → lat/lng)
// ──────────────────────────────────────────────
export const geocode = async (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res
        .status(400)
        .json({ success: false, error: "address query param is required." });
    }

    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/geocode/json",
      { params: { address, key: API_KEY } },
    );

    const result = response.data.results?.[0];
    console.log(response);

    if (!result) {
      return res
        .status(404)
        .json({ success: false, error: "No results found for the address." });
    }

    return res.status(200).json({
      success: true,
      data: {
        formatted_address: result.formatted_address,
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        place_id: result.place_id,
      },
    });
  } catch (error) {
    console.error("geocode error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: "Geocoding failed.",
      details: error.response?.data || error.message,
    });
  }
};

// ──────────────────────────────────────────────
//  Reverse Geocode (lat/lng → address)
// ──────────────────────────────────────────────
export const reverseGeocode = async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: "lat and lng query params are required.",
      });
    }

    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/geocode/json",
      { params: { latlng: `${lat},${lng}`, key: API_KEY } },
    );

    const result = response.data.results?.[0];

    if (!result) {
      return res.status(404).json({
        success: false,
        error: "No results found for the coordinates.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        formatted_address: result.formatted_address,
        place_id: result.place_id,
      },
    });
  } catch (error) {
    console.error(
      "reverseGeocode error:",
      error.response?.data || error.message,
    );
    return res.status(500).json({
      success: false,
      error: "Reverse geocoding failed.",
      details: error.response?.data || error.message,
    });
  }
};

// ──────────────────────────────────────────────
//  Place Autocomplete (Places API New)
// ──────────────────────────────────────────────
export const autocomplete = async (req, res) => {
  try {
    const { input, lat, lng } = req.query;

    if (!input) {
      return res
        .status(400)
        .json({ success: false, error: "input query param is required." });
    }

    const requestBody = { input };

    // Optional location bias (circle around user's location)
    if (lat && lng) {
      requestBody.locationBias = {
        circle: {
          center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
          radius: 50000, // 50 km radius
        },
      };
    }

    const response = await axios.post(
      "https://places.googleapis.com/v1/places:autocomplete",
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": API_KEY,
        },
      },
    );

    const suggestions = (response.data.suggestions || []).map((s) => ({
      placeId: s.placePrediction?.placeId || null,
      mainText: s.placePrediction?.structuredFormat?.mainText?.text || "",
      secondaryText:
        s.placePrediction?.structuredFormat?.secondaryText?.text || "",
      fullText: s.placePrediction?.text?.text || "",
    }));

    return res.status(200).json({ success: true, data: suggestions });
  } catch (error) {
    console.error("autocomplete error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: "Autocomplete failed.",
      details: error.response?.data || error.message,
    });
  }
};
