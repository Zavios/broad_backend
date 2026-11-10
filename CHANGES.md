# Broad Backend — Changelog & API Reference

## Changes Made

### 1. `db/supabase.js` — Supabase Client Setup

- Exports **two** Supabase clients:
  - `supabaseAdmin` — service-role key, used for all server-side DB queries (profiles, rides, bookings, vehicles).
  - `supabaseAuth` — publishable (anon) key, used for auth flows (signup, signin, OAuth).
- Default export is `supabaseAdmin`.

### 2. `authentication/` — Auth Feature

| File                | What it does                                                               |
| ------------------- | -------------------------------------------------------------------------- |
| `authController.js` | Handlers for signup, signin, Google OAuth, token refresh, signout, get-me. |
| `authMiddleware.js` | JWT verification via Supabase JWKS endpoint (using `jose` library).        |
| `authRoute.js`      | Route definitions mounted at `/api/auth`.                                  |

- The `authenticate` middleware verifies `Authorization: Bearer <token>` header, decodes the JWT, and attaches `req.user` (with `req.user.sub` = user UUID).

### 3. `profile/` — Profile & Vehicle Feature

| File                   | What it does                                                                    |
| ---------------------- | ------------------------------------------------------------------------------- |
| `profileController.js` | CRUD for `profiles` table + CRUD for `vehicles` table (with ownership checks).  |
| `profileRoute.js`      | Route definitions mounted at `/api/profile`. All routes require `authenticate`. |

**Key behaviors:**

- `createProfile` sets `initial_setup = true` and `verification_status = 'pending'` automatically.
- `getProfileById` returns only public-safe fields (no phone, email, dob).
- `updateProfile` whitelists updatable fields: `username`, `firstName`, `lastName`, `dob`, `phone`, `bio`.
- Vehicle operations check `owner_id === req.user.sub` before allowing update/delete.

### 4. `maps/` — Google Maps API Feature

| File                | What it does                                                                 |
| ------------------- | ---------------------------------------------------------------------------- |
| `mapsController.js` | Wraps Google Routes API, Geocoding API, and Places Autocomplete API.         |
| `mapsMiddleware.js` | `validateCoordinates` — validates `origin`/`destination` lat/lng ranges.     |
| `mapsRoute.js`      | Route definitions mounted at `/api/maps`. All routes require `authenticate`. |

**Key behaviors:**

- POST routes (`/routes`, `/distance`) use `validateCoordinates` middleware.
- `autocomplete` supports optional location bias via `lat`/`lng` query params.
- All handlers use `process.env.GOOGLE_MAPS_API_KEY`.

### 5. `rides/` — Rides & Booking Feature

| File                 | What it does                                                                     |
| -------------------- | -------------------------------------------------------------------------------- |
| `ridesController.js` | Ride publishing, searching, updating, cancelling. Booking (tag along) lifecycle. |
| `ridesMiddleware.js` | `validatePublishRide` and `validateBooking` input validators.                    |
| `ridesRoute.js`      | Route definitions mounted at `/api/rides`. All routes require `authenticate`.    |

**Key behaviors:**

- `publishRide` inserts into `rides` + `rides_stops` atomically (rolls back ride if stops fail).
- `seat_available` is automatically managed: decremented on booking, restored on reject/cancel.
- `cancelRide` cascades — cancels all `pending`/`confirmed` bookings.
- `updateRide` recalculates `seat_available` when `seat_offered` changes, prevents reducing below booked count.
- Specific routes (`/search`, `/my/published`, `/my/bookings`) registered before `/:rideId` to avoid param collision.

### 6. `server.js` — Entry Point

- Removed the Google Maps API test code that was previously in server.js.
- Added `express.json()` middleware.
- Mounted all four feature routers:
  ```js
  app.use("/api/auth", authRouter);
  app.use("/api/profile", profileRouter);
  app.use("/api/maps", mapsRouter);
  app.use("/api/rides", ridesRouter);
  ```

---

## Complete Route & Params Reference

> 🔓 = Public (no token needed)
>
> 🔒 = Protected (requires `Authorization: Bearer <token>` header)

---

### Auth — `/api/auth`

#### `POST /api/auth/signup` 🔓

Register a new user with email and password.

**Body:**

```json
{
  "email": "user@example.com", // required
  "password": "securePass123", // required
  "name": "John Doe" // optional — stored in user_metadata
}
```

**Response:** `201` — `{ message, user, session }`

---

#### `POST /api/auth/signin` 🔓

Sign in with email and password.

**Body:**

```json
{
  "email": "user@example.com", // required
  "password": "securePass123" // required
}
```

**Response:** `200` — `{ message, user, session }`

---

#### `GET /api/auth/google` 🔓

Get Google OAuth redirect URL.

**Query Params:**

| Param         | Type   | Required | Default                               |
| ------------- | ------ | -------- | ------------------------------------- |
| `redirect_to` | string | No       | `http://localhost:5173/auth/callback` |

**Response:** `200` — `{ url }` (redirect the user to this URL)

---

#### `GET /api/auth/callback` 🔓

Exchange OAuth authorization code for a session.

**Query Params:**

| Param  | Type   | Required |
| ------ | ------ | -------- |
| `code` | string | Yes      |

**Response:** `200` — `{ message, user, session }`

---

#### `POST /api/auth/refresh` 🔓

Refresh an expired session.

**Body:**

```json
{
  "refresh_token": "your-refresh-token" // required
}
```

**Response:** `200` — `{ message, session, user }`

---

#### `POST /api/auth/signout` 🔒

Sign out the current user.

**Body:** None

**Response:** `200` — `{ message }`

---

#### `GET /api/auth/me` 🔒

Get the authenticated user's full auth info.

**Params:** None

**Response:** `200` — `{ user }`

---

### Profile — `/api/profile`

#### `POST /api/profile` 🔒

Create a new profile for the authenticated user (initial setup).

**Body:**

```json
{
  "username": "johndoe", // required
  "firstName": "John", // required
  "lastName": "Doe", // required
  "email": "john@example.com", // required
  "dob": "2000-05-15", // optional (date)
  "phone": 9876543210, // optional (smallint)
  "bio": "Hey there!" // optional
}
```

**Auto-set:** `id = req.user.sub`, `initial_setup = true`, `verification_status = "pending"`

**Response:** `201` — `{ success: true, data: { ...profile } }`

---

#### `GET /api/profile/me` 🔒

Get the authenticated user's full profile (all fields).

**Params:** None

**Response:** `200` — `{ success: true, data: { ...profile } }`

---

#### `GET /api/profile/:id` 🔒

Get a public profile by user ID. Sensitive fields (phone, email, dob) are omitted.

**URL Params:**

| Param | Type | Description           |
| ----- | ---- | --------------------- |
| `id`  | uuid | The user's profile ID |

**Response:** `200` — `{ success: true, data: { id, username, firstName, lastName, verification_status, bio, created_at } }`

---

#### `PATCH /api/profile` 🔒

Update the authenticated user's profile. Only whitelisted fields accepted.

**Body (all optional, at least one required):**

```json
{
  "username": "newusername",
  "firstName": "Jane",
  "lastName": "Smith",
  "dob": "1999-12-01",
  "phone": 1234567890,
  "bio": "Updated bio"
}
```

**Response:** `200` — `{ success: true, data: { ...updatedProfile } }`

---

#### `POST /api/profile/vehicle` 🔒

Add a vehicle for the authenticated user.

**Body:**

```json
{
  "make": "Toyota", // required
  "model": "Innova", // required
  "color": "White", // required
  "registration_no": "KA01AB1234", // required
  "seat_capacity": 6 // required (positive integer)
}
```

**Auto-set:** `owner_id = req.user.sub`

**Response:** `201` — `{ success: true, data: { ...vehicle } }`

---

#### `GET /api/profile/vehicle` 🔒

List all vehicles belonging to the authenticated user.

**Params:** None

**Response:** `200` — `{ success: true, data: [ ...vehicles ] }`

---

#### `PATCH /api/profile/vehicle/:vehicleId` 🔒

Update a vehicle. Only the owner can update.

**URL Params:**

| Param       | Type | Description    |
| ----------- | ---- | -------------- |
| `vehicleId` | uuid | The vehicle ID |

**Body (all optional, at least one required):**

```json
{
  "make": "Honda",
  "model": "City",
  "color": "Black",
  "registration_no": "KA02CD5678",
  "seat_capacity": 4
}
```

**Response:** `200` — `{ success: true, data: { ...updatedVehicle } }`

---

#### `DELETE /api/profile/vehicle/:vehicleId` 🔒

Delete a vehicle. Only the owner can delete.

**URL Params:**

| Param       | Type | Description    |
| ----------- | ---- | -------------- |
| `vehicleId` | uuid | The vehicle ID |

**Response:** `200` — `{ success: true, data: { ...deletedVehicle } }`

---

### Maps — `/api/maps`

#### `POST /api/maps/routes` 🔒

Compute driving routes between two points with alternatives.

**Middleware:** `validateCoordinates`

**Body:**

```json
{
  "origin": {
    "latitude": 28.6139, // required (-90 to 90)
    "longitude": 77.209 // required (-180 to 180)
  },
  "destination": {
    "latitude": 28.4595, // required (-90 to 90)
    "longitude": 77.0266 // required (-180 to 180)
  },
  "computeAlternatives": true // optional (default: true)
}
```

**Response:** `200` — `{ success: true, data: [{ distanceMeters, distanceKm, duration, encodedPolyline, legs }] }`

---

#### `POST /api/maps/distance` 🔒

Get distance and duration only (no polyline, lighter response).

**Middleware:** `validateCoordinates`

**Body:**

```json
{
  "origin": {
    "latitude": 28.6139,
    "longitude": 77.209
  },
  "destination": {
    "latitude": 28.4595,
    "longitude": 77.0266
  }
}
```

**Response:** `200` — `{ success: true, data: { distanceMeters, distanceKm, duration } }`

---

#### `GET /api/maps/geocode` 🔒

Forward geocode — convert an address to coordinates.

**Query Params:**

| Param     | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `address` | string | Yes      | The address to geocode |

**Response:** `200` — `{ success: true, data: { formatted_address, latitude, longitude, place_id } }`

---

#### `GET /api/maps/reverse-geocode` 🔒

Reverse geocode — convert coordinates to an address.

**Query Params:**

| Param | Type   | Required | Description |
| ----- | ------ | -------- | ----------- |
| `lat` | number | Yes      | Latitude    |
| `lng` | number | Yes      | Longitude   |

**Response:** `200` — `{ success: true, data: { formatted_address, place_id } }`

---

#### `GET /api/maps/autocomplete` 🔒

Place autocomplete suggestions.

**Query Params:**

| Param   | Type   | Required | Description                        |
| ------- | ------ | -------- | ---------------------------------- |
| `input` | string | Yes      | Search text                        |
| `lat`   | number | No       | Latitude for location bias center  |
| `lng`   | number | No       | Longitude for location bias center |

**Response:** `200` — `{ success: true, data: [{ placeId, mainText, secondaryText, fullText }] }`

---

### Rides — `/api/rides`

#### `POST /api/rides` 🔒

Publish a new ride with stops.

**Middleware:** `validatePublishRide`

**Body:**

```json
{
  "vehicle_id": "uuid", // required
  "departure_at": "2026-12-01", // required (date)
  "seat_offered": 3, // required (positive integer)
  "price_per_seat": 150.0, // required (>= 0)
  "currency": "INR", // optional (default: "INR")
  "route_polyline": "encoded_string", // optional
  "description": "Morning ride to campus", // optional
  "stops": [
    // required (array, >= 2 items)
    {
      "stop_order": 1, // required
      "stop_type": "origin", // required: "origin" | "stop" | "destination"
      "location_name": "Connaught Place", // required
      "latitude": 28.6315, // required
      "longitude": 77.2167, // required
      "scheduled_at": "2026-12-01T08:00:00Z", // optional
      "allow_pickup": true, // optional (default: true)
      "allow_dropoff": false // optional (default: true)
    },
    {
      "stop_order": 2,
      "stop_type": "destination",
      "location_name": "BITS Pilani Goa",
      "latitude": 15.3909,
      "longitude": 73.8787,
      "scheduled_at": "2026-12-01T18:00:00Z",
      "allow_pickup": false,
      "allow_dropoff": true
    }
  ]
}
```

**Auto-set:** `driver_id = req.user.sub`, `seat_available = seat_offered`, `status = "active"`

**Response:** `201` — `{ success: true, data: { ...ride, stops: [...] } }`

---

#### `GET /api/rides/search` 🔒

Search for available rides.

**Query Params:**

| Param            | Type   | Required | Default    | Description                         |
| ---------------- | ------ | -------- | ---------- | ----------------------------------- |
| `status`         | string | No       | `"active"` | Ride status filter                  |
| `min_seats`      | number | No       | —          | Minimum available seats             |
| `departure_date` | date   | No       | —          | Exact departure date (`YYYY-MM-DD`) |

**Response:** `200` — `{ success: true, data: [{ ...ride, rides_stops, profiles }] }`

---

#### `GET /api/rides/my/published` 🔒

Get all rides published by the authenticated user (as driver).

**Params:** None

**Response:** `200` — `{ success: true, data: [{ ...ride, rides_stops }] }`

---

#### `GET /api/rides/my/bookings` 🔒

Get all bookings made by the authenticated user (as passenger).

**Params:** None

**Response:** `200` — `{ success: true, data: [{ ...booking, rides: { ...ride, rides_stops } }] }`

---

#### `GET /api/rides/:rideId` 🔒

Get a single ride with stops and driver profile.

**URL Params:**

| Param    | Type | Description |
| -------- | ---- | ----------- |
| `rideId` | uuid | The ride ID |

**Response:** `200` — `{ success: true, data: { ...ride, rides_stops, profiles } }`

---

#### `PATCH /api/rides/:rideId` 🔒

Update a ride. Only the driver can update. Ride must be `active`.

**URL Params:**

| Param    | Type | Description |
| -------- | ---- | ----------- |
| `rideId` | uuid | The ride ID |

**Body (all optional, at least one required):**

```json
{
  "departure_at": "2026-12-05",
  "price_per_seat": 200.0,
  "description": "Updated description",
  "seat_offered": 4
}
```

**Note:** If `seat_offered` changes, `seat_available` is recalculated. Cannot reduce below already-booked count.

**Response:** `200` — `{ success: true, data: { ...updatedRide } }`

---

#### `POST /api/rides/:rideId/cancel` 🔒

Cancel a ride. Only the driver can cancel. Also cancels all `pending`/`confirmed` bookings.

**URL Params:**

| Param    | Type | Description |
| -------- | ---- | ----------- |
| `rideId` | uuid | The ride ID |

**Body:** None

**Response:** `200` — `{ success: true, data: { ...cancelledRide }, message }`

---

#### `POST /api/rides/:rideId/book` 🔒

Request to tag along (book seats on a ride).

**Middleware:** `validateBooking`

**URL Params:**

| Param    | Type | Description |
| -------- | ---- | ----------- |
| `rideId` | uuid | The ride ID |

**Body:**

```json
{
  "pickup_stop_id": "uuid", // required — must be a rides_stops.id
  "dropoff_stop_id": "uuid", // required — must be a rides_stops.id
  "seats_booked": 2 // required (integer >= 1)
}
```

**Auto-set:** `passenger_id = req.user.sub`, `total_amount = seats_booked × price_per_seat`, `status = "pending"`

**Validations:** Ride must be `active`, user cannot book own ride, `seat_available >= seats_booked`.

**Response:** `201` — `{ success: true, data: { ...booking } }`

---

#### `GET /api/rides/:rideId/bookings` 🔒

View all bookings for a ride. Only the ride's driver can access.

**URL Params:**

| Param    | Type | Description |
| -------- | ---- | ----------- |
| `rideId` | uuid | The ride ID |

**Response:** `200` — `{ success: true, data: [{ ...booking, profiles: { passenger info } }] }`

---

#### `PATCH /api/rides/:rideId/booking/:bookingId` 🔒

Driver confirms or rejects a pending booking.

**URL Params:**

| Param       | Type   | Description    |
| ----------- | ------ | -------------- |
| `rideId`    | uuid   | The ride ID    |
| `bookingId` | bigint | The booking ID |

**Body:**

```json
{
  "action": "confirm" // required: "confirm" or "reject"
}
```

**Note:** On `reject`, `seat_available` is restored.

**Response:** `200` — `{ success: true, data: { ...updatedBooking } }`

---

#### `POST /api/rides/:rideId/booking/:bookingId/cancel` 🔒

Passenger cancels their own booking. Must be `pending` or `confirmed`.

**URL Params:**

| Param       | Type   | Description    |
| ----------- | ------ | -------------- |
| `rideId`    | uuid   | The ride ID    |
| `bookingId` | bigint | The booking ID |

**Body:** None

**Note:** `seat_available` is restored on the ride.

**Response:** `200` — `{ success: true, data: { ...cancelledBooking } }`

---

## Environment Variables

| Variable                   | Description                                 |
| -------------------------- | ------------------------------------------- |
| `PORT`                     | Server port (default: 5000)                 |
| `SUPABASE_URL`             | Supabase project URL                        |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key               |
| `SUPABASE_SECRET_KEY`      | Supabase service role key                   |
| `SUPABASE_JWKS_URL`        | Supabase JWKS endpoint for JWT verification |
| `GOOGLE_MAPS_API_KEY`      | Google Maps Platform API key                |
