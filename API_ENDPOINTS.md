# Broad Backend — API Endpoints Specification

This document details all API endpoints available in the Broad Backend ride-sharing application, including HTTP methods, URL paths, authentication requirements, path parameters, query parameters, request bodies, and expected responses (success and error states).

---

## Base Configuration & Authentication

- **Base URL:** `http://localhost:5000` (or `PORT` defined in `.env`)
- **Headers for JSON requests:** `Content-Type: application/json`
- **Protected Endpoints:** Require an Authorization header containing the Supabase JWT token:
  ```http
  Authorization: Bearer <jwt_access_token>
  ```

---

## 1. Authentication Module (`/api/auth`)

### 1.1 Register / Sign Up

Create a new user in Supabase Auth.

- **Method:** `POST`
- **Path:** `/api/auth/signup`
- **Auth Required:** No (Public)
- **Request Body:**

  ```json
  {
    "email": "student@college.edu",
    "password": "StrongPassword123!",
    "name": "Jane Doe"
  }
  ```

  | Field      | Type   | Required | Description                                     |
  | ---------- | ------ | -------- | ----------------------------------------------- |
  | `email`    | String | Yes      | User's email address                            |
  | `password` | String | Yes      | Plaintext password                              |
  | `name`     | String | No       | Full name (stored in `user_metadata.full_name`) |

- **Responses:**
  - **`201 Created`**
    ```json
    {
      "message": "Sign-up successful. Please check your email to confirm your account.",
      "user": {
        "id": "c71fa79e-4bdf-4a6f-b258-2ecab275211b",
        "email": "student@college.edu",
        "user_metadata": {
          "full_name": "Jane Doe"
        },
        "created_at": "2026-11-09T01:00:00.000Z"
      },
      "session": null
    }
    ```
  - **`400 Bad Request`**
    ```json
    {
      "error": "Email and password are required"
    }
    ```

---

### 1.2 Sign In (Password)

Sign in with email and password to receive access and refresh tokens.

- **Method:** `POST`
- **Path:** `/api/auth/signin`
- **Auth Required:** No (Public)
- **Request Body:**

  ```json
  {
    "email": "student@college.edu",
    "password": "StrongPassword123!"
  }
  ```

  | Field      | Type   | Required | Description      |
  | ---------- | ------ | -------- | ---------------- |
  | `email`    | String | Yes      | Registered email |
  | `password` | String | Yes      | Password         |

- **Responses:**
  - **`200 OK`**
    ```json
    {
      "message": "Sign-in successful",
      "user": {
        "id": "c71fa79e-4bdf-4a6f-b258-2ecab275211b",
        "email": "student@college.edu"
      },
      "session": {
        "access_token": "eyJhbGciOi...",
        "token_type": "bearer",
        "expires_in": 3600,
        "refresh_token": "a1b2c3d4..."
      }
    }
    ```
  - **`401 Unauthorized`**
    ```json
    {
      "error": "Invalid login credentials"
    }
    ```

---

### 1.3 Google OAuth URL

Obtain the OAuth authorization URL to initiate Google Sign-In with Supabase.

- **Method:** `GET`
- **Path:** `/api/auth/google`
- **Auth Required:** No (Public)
- **Query Parameters:**
  | Parameter | Type | Required | Default | Description |
  |---|---|---|---|---|
  | `redirect_to` | String | No | `http://localhost:5173/auth/callback` | Client redirect URL after OAuth approval |

- **Responses:**
  - **`200 OK`**
    ```json
    {
      "url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=..."
    }
    ```
  - **`400 Bad Request`**
    ```json
    {
      "error": "Failed to generate OAuth URL"
    }
    ```

---

### 1.4 OAuth Callback

Exchange authorization code for a session token when using PKCE or server-side OAuth code flow.

- **Method:** `GET`
- **Path:** `/api/auth/callback`
- **Auth Required:** No (Public)
- **Query Parameters:**
  | Parameter | Type | Required | Description |
  |---|---|---|---|
  | `code` | String | Yes | OAuth authorization code returned by Google/Supabase |

- **Responses:**
  - **`200 OK`**
    ```json
    {
      "message": "OAuth sign-in successful",
      "user": {
        "id": "c71fa79e-4bdf-4a6f-b258-2ecab275211b",
        "email": "student@gmail.com"
      },
      "session": {
        "access_token": "eyJhbGciOi...",
        "refresh_token": "d4c3b2a1..."
      }
    }
    ```
  - **`400 Bad Request`**
    ```json
    {
      "error": "Authorization code is required"
    }
    ```

---

### 1.5 Refresh Session

Refresh an expired JWT access token using a valid refresh token.

- **Method:** `POST`
- **Path:** `/api/auth/refresh`
- **Auth Required:** No (Public)
- **Request Body:**

  ```json
  {
    "refresh_token": "d4c3b2a1e0..."
  }
  ```

  | Field           | Type   | Required | Description            |
  | --------------- | ------ | -------- | ---------------------- |
  | `refresh_token` | String | Yes      | Supabase refresh token |

- **Responses:**
  - **`200 OK`**
    ```json
    {
      "message": "Session refreshed",
      "session": {
        "access_token": "eyJhbGciOi...",
        "refresh_token": "newRefreshToken..."
      },
      "user": {
        "id": "c71fa79e-4bdf-4a6f-b258-2ecab275211b"
      }
    }
    ```
  - **`401 Unauthorized`**
    ```json
    {
      "error": "Invalid Refresh Token: Already Used"
    }
    ```

---

### 1.6 Sign Out

Invalidate the current session.

- **Method:** `POST`
- **Path:** `/api/auth/signout`
- **Auth Required:** Yes (`Bearer <token>`)
- **Request Body:** None
- **Responses:**
  - **`200 OK`**
    ```json
    {
      "message": "Signed out successfully"
    }
    ```
  - **`401 Unauthorized`**
    ```json
    {
      "error": "Missing or malformed Authorization header"
    }
    ```

---

### 1.7 Get Current Auth User

Fetch Supabase auth user details by ID directly from the admin auth service.

- **Method:** `GET`
- **Path:** `/api/auth/me`
- **Auth Required:** Yes (`Bearer <token>`)
- **Request Body:** None
- **Responses:**
  - **`200 OK`**
    ```json
    {
      "user": {
        "id": "c71fa79e-4bdf-4a6f-b258-2ecab275211b",
        "email": "student@college.edu",
        "created_at": "2026-11-09T00:00:00.000Z"
      }
    }
    ```
  - **`404 Not Found`**
    ```json
    {
      "error": "User not found"
    }
    ```

---

## 2. Profile & Vehicle Module (`/api/profile`)

### 2.1 Create Profile

Create the user's initial application profile. Automatically links `id` with `req.user.sub` and sets `initial_setup: true` and `verification_status: "pending"`.

- **Method:** `POST`
- **Path:** `/api/profile`
- **Auth Required:** Yes (`Bearer <token>`)
- **Request Body:**

  ```json
  {
    "username": "janedoe",
    "first_name": "Jane",
    "last_name": "Doe",
    "email": "jane@college.edu",
    "dob": "2003-04-12",
    "phone": 9876,
    "bio": "CS Major, daily commuter."
  }
  ```

  | Field        | Type                | Required | Description     |
  | ------------ | ------------------- | -------- | --------------- |
  | `username`   | String              | Yes      | Unique handle   |
  | `first_name` | String              | Yes      | First name      |
  | `last_name`  | String              | Yes      | Last name       |
  | `email`      | String              | Yes      | Contact email   |
  | `dob`        | String (YYYY-MM-DD) | No       | Date of birth   |
  | `phone`      | Integer (smallint)  | No       | Phone number    |
  | `bio`        | String              | No       | Short biography |

- **Responses:**
  - **`201 Created`**
    ```json
    {
      "success": true,
      "data": {
        "id": "c71fa79e-4bdf-4a6f-b258-2ecab275211b",
        "username": "janedoe",
        "first_name": "Jane",
        "last_name": "Doe",
        "verification_status": "pending",
        "dob": "2003-04-12",
        "created_at": "2026-11-09T01:10:00.000Z",
        "email": "jane@college.edu",
        "phone": 9876,
        "bio": "CS Major, daily commuter.",
        "initial_setup": true
      }
    }
    ```
  - **`400 Bad Request`**
    ```json
    {
      "success": false,
      "error": "username, first_name, last_name, and email are required."
    }
    ```
  - **`409 Conflict`**
    ```json
    {
      "success": false,
      "error": "Profile already exists for this user."
    }
    ```

---

### 2.2 Get My Profile

Retrieve all details for the currently logged-in user.

- **Method:** `GET`
- **Path:** `/api/profile/me`
- **Auth Required:** Yes (`Bearer <token>`)
- **Responses:**
  - **`200 OK`**
    ```json
    {
      "success": true,
      "data": {
        "id": "c71fa79e-4bdf-4a6f-b258-2ecab275211b",
        "username": "janedoe",
        "first_name": "Jane",
        "last_name": "Doe",
        "verification_status": "verified",
        "dob": "2003-04-12",
        "email": "jane@college.edu",
        "phone": 9876,
        "bio": "CS Major, daily commuter.",
        "initial_setup": true,
        "created_at": "2026-11-09T01:10:00.000Z"
      }
    }
    ```
  - **`404 Not Found`**
    ```json
    {
      "success": false,
      "error": "Profile not found."
    }
    ```

---

### 2.3 Get Public Profile by ID

Get a public view of any user's profile. Sensitive fields like email, phone, and dob are excluded.

- **Method:** `GET`
- **Path:** `/api/profile/:id`
- **Auth Required:** Yes (`Bearer <token>`)
- **Path Parameters:**
  | Parameter | Type | Required | Description |
  |---|---|---|---|
  | `id` | UUID | Yes | Target user profile UUID |

- **Responses:**
  - **`200 OK`**
    ```json
    {
      "success": true,
      "data": {
        "id": "c71fa79e-4bdf-4a6f-b258-2ecab275211b",
        "username": "janedoe",
        "first_name": "Jane",
        "last_name": "Doe",
        "verification_status": "verified",
        "bio": "CS Major, daily commuter.",
        "created_at": "2026-11-09T01:10:00.000Z"
      }
    }
    ```
  - **`404 Not Found`**
    ```json
    {
      "success": false,
      "error": "Profile not found."
    }
    ```

---

### 2.4 Update My Profile

Modify mutable profile fields for the authenticated user.

- **Method:** `PATCH`
- **Path:** `/api/profile`
- **Auth Required:** Yes (`Bearer <token>`)
- **Request Body:** (Provide at least one field)

  ```json
  {
    "first_name": "Janet",
    "bio": "Updated bio details"
  }
  ```

  | Field        | Type                | Allowed | Description        |
  | ------------ | ------------------- | ------- | ------------------ |
  | `username`   | String              | Yes     | Updated username   |
  | `first_name` | String              | Yes     | Updated first name |
  | `last_name`  | String              | Yes     | Updated last name  |
  | `dob`        | String (YYYY-MM-DD) | Yes     | Updated DOB        |
  | `phone`      | Integer (smallint)  | Yes     | Updated phone      |
  | `bio`        | String              | Yes     | Updated bio        |

- **Responses:**
  - **`200 OK`**
    ```json
    {
      "success": true,
      "data": {
        "id": "c71fa79e-4bdf-4a6f-b258-2ecab275211b",
        "username": "janedoe",
        "first_name": "Janet",
        "last_name": "Doe",
        "bio": "Updated bio details"
      }
    }
    ```
  - **`400 Bad Request`**
    ```json
    {
      "success": false,
      "error": "No valid fields provided for update."
    }
    ```

---

### 2.5 Add Vehicle

Register a vehicle for the authenticated user.

- **Method:** `POST`
- **Path:** `/api/profile/vehicle`
- **Auth Required:** Yes (`Bearer <token>`)
- **Request Body:**

  ```json
  {
    "make": "Toyota",
    "model": "Innova",
    "color": "Silver",
    "registration_no": "DL-01-AB-1234",
    "seat_capacity": 6
  }
  ```

  | Field             | Type    | Required | Description                           |
  | ----------------- | ------- | -------- | ------------------------------------- |
  | `make`            | String  | Yes      | Vehicle manufacturer                  |
  | `model`           | String  | Yes      | Vehicle model                         |
  | `color`           | String  | Yes      | Color                                 |
  | `registration_no` | String  | Yes      | Plate / Registration number           |
  | `seat_capacity`   | Integer | Yes      | Passenger capacity (positive integer) |

- **Responses:**
  - **`201 Created`**
    ```json
    {
      "success": true,
      "data": {
        "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        "owner_id": "c71fa79e-4bdf-4a6f-b258-2ecab275211b",
        "make": "Toyota",
        "model": "Innova",
        "color": "Silver",
        "registration_no": "DL-01-AB-1234",
        "seat_capacity": 6,
        "created_at": "2026-11-09T01:12:00.000Z"
      }
    }
    ```
  - **`400 Bad Request`**
    ```json
    {
      "success": false,
      "error": "make, model, color, registration_no, and seat_capacity are required."
    }
    ```
  - **`409 Conflict`**
    ```json
    {
      "success": false,
      "error": "A vehicle with this registration number already exists."
    }
    ```

---

### 2.6 Get My Vehicles

List all vehicles owned by the authenticated user.

- **Method:** `GET`
- **Path:** `/api/profile/vehicle`
- **Auth Required:** Yes (`Bearer <token>`)
- **Responses:**
  - **`200 OK`**
    ```json
    {
      "success": true,
      "data": [
        {
          "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
          "owner_id": "c71fa79e-4bdf-4a6f-b258-2ecab275211b",
          "make": "Toyota",
          "model": "Innova",
          "color": "Silver",
          "registration_no": "DL-01-AB-1234",
          "seat_capacity": 6,
          "created_at": "2026-11-09T01:12:00.000Z"
        }
      ]
    }
    ```

---

### 2.7 Update Vehicle

Update vehicle attributes. Verified against vehicle ownership (`owner_id = req.user.sub`).

- **Method:** `PATCH`
- **Path:** `/api/profile/vehicle/:vehicleId`
- **Auth Required:** Yes (`Bearer <token>`)
- **Path Parameters:**
  | Parameter | Type | Required | Description |
  |---|---|---|---|
  | `vehicleId` | UUID | Yes | Target vehicle UUID |
- **Request Body:** (Provide at least one field)
  ```json
  {
    "color": "Dark Grey",
    "seat_capacity": 5
  }
  ```
- **Responses:**
  - **`200 OK`**
    ```json
    {
      "success": true,
      "data": {
        "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        "make": "Toyota",
        "model": "Innova",
        "color": "Dark Grey",
        "registration_no": "DL-01-AB-1234",
        "seat_capacity": 5
      }
    }
    ```
  - **`404 Not Found`**
    ```json
    {
      "success": false,
      "error": "Vehicle not found or you are not the owner."
    }
    ```

---

### 2.8 Delete Vehicle

Delete a vehicle belonging to the user.

- **Method:** `DELETE`
- **Path:** `/api/profile/vehicle/:vehicleId`
- **Auth Required:** Yes (`Bearer <token>`)
- **Path Parameters:**
  | Parameter | Type | Required | Description |
  |---|---|---|---|
  | `vehicleId` | UUID | Yes | Target vehicle UUID |
- **Responses:**
  - **`200 OK`**
    ```json
    {
      "success": true,
      "data": {
        "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        "registration_no": "DL-01-AB-1234"
      }
    }
    ```
  - **`404 Not Found`**
    ```json
    {
      "success": false,
      "error": "Vehicle not found or you are not the owner."
    }
    ```

---

## 3. Google Maps Module (`/api/maps`)

All `/api/maps` routes require authentication.

### 3.1 Compute Routes

Computes driving route alternatives between origin and destination with traffic awareness and polylines.

- **Method:** `POST`
- **Path:** `/api/maps/routes`
- **Auth Required:** Yes (`Bearer <token>`)
- **Request Body:**

  ```json
  {
    "origin": {
      "latitude": 28.6139,
      "longitude": 77.209
    },
    "destination": {
      "latitude": 28.4595,
      "longitude": 77.0266
    },
    "computeAlternatives": true
  }
  ```

  | Field                   | Type    | Required | Description                                 |
  | ----------------------- | ------- | -------- | ------------------------------------------- |
  | `origin.latitude`       | Number  | Yes      | Lat (-90 to 90)                             |
  | `origin.longitude`      | Number  | Yes      | Lng (-180 to 180)                           |
  | `destination.latitude`  | Number  | Yes      | Lat (-90 to 90)                             |
  | `destination.longitude` | Number  | Yes      | Lng (-180 to 180)                           |
  | `computeAlternatives`   | Boolean | No       | Return alternative routes (default: `true`) |

- **Responses:**
  - **`200 OK`**
    ```json
    {
      "success": true,
      "data": [
        {
          "distanceMeters": 32450,
          "distanceKm": "32.45",
          "duration": "2450s",
          "encodedPolyline": "m{~tD_ifsM_@...",
          "legs": []
        }
      ]
    }
    ```
  - **`400 Bad Request`**
    ```json
    {
      "success": false,
      "error": "origin.latitude must be between -90 and 90."
    }
    ```

---

### 3.2 Get Distance & Duration

Lightweight route calculation returning only the distance and travel duration without polyline points.

- **Method:** `POST`
- **Path:** `/api/maps/distance`
- **Auth Required:** Yes (`Bearer <token>`)
- **Request Body:**
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
- **Responses:**
  - **`200 OK`**
    ```json
    {
      "success": true,
      "data": {
        "distanceMeters": 32450,
        "distanceKm": "32.45",
        "duration": "2450s"
      }
    }
    ```
  - **`404 Not Found`**
    ```json
    {
      "success": false,
      "error": "No route found."
    }
    ```

---

### 3.3 Forward Geocode Address

Converts a street address / location query string into geographic coordinates (`latitude`, `longitude`).

- **Method:** `GET`
- **Path:** `/api/maps/geocode`
- **Auth Required:** Yes (`Bearer <token>`)
- **Query Parameters:**
  | Parameter | Type | Required | Description |
  |---|---|---|---|
  | `address` | String | Yes | Plain text address or landmark (e.g. `Connaught Place, New Delhi`) |

- **Responses:**
  - **`200 OK`**
    ```json
    {
      "success": true,
      "data": {
        "formatted_address": "Connaught Place, New Delhi, Delhi 110001, India",
        "latitude": 28.6315,
        "longitude": 77.2167,
        "place_id": "ChIJL_P_CXD-DDkR3wqE0..."
      }
    }
    ```
  - **`400 Bad Request`**
    ```json
    {
      "success": false,
      "error": "address query param is required."
    }
    ```

---

### 3.4 Reverse Geocode Coordinates

Converts coordinates (`lat`, `lng`) into a formatted physical address.

- **Method:** `GET`
- **Path:** `/api/maps/reverse-geocode`
- **Auth Required:** Yes (`Bearer <token>`)
- **Query Parameters:**
  | Parameter | Type | Required | Description |
  |---|---|---|---|
  | `lat` | Number | Yes | Latitude |
  | `lng` | Number | Yes | Longitude |

- **Responses:**
  - **`200 OK`**
    ```json
    {
      "success": true,
      "data": {
        "formatted_address": "Indira Gandhi International Airport, New Delhi, Delhi 110037, India",
        "place_id": "ChIJc1e3W5b1DDkR8c..."
      }
    }
    ```
  - **`400 Bad Request`**
    ```json
    {
      "success": false,
      "error": "lat and lng query params are required."
    }
    ```

---

### 3.5 Place Autocomplete

Search query autocomplete for addresses/places with optional location bias.

- **Method:** `GET`
- **Path:** `/api/maps/autocomplete`
- **Auth Required:** Yes (`Bearer <token>`)
- **Query Parameters:**
  | Parameter | Type | Required | Description |
  |---|---|---|---|
  | `input` | String | Yes | Text typed by the user |
  | `lat` | Number | No | Center latitude for 50km search bias |
  | `lng` | Number | No | Center longitude for 50km search bias |

- **Responses:**
  - **`200 OK`**
    ```json
    {
      "success": true,
      "data": [
        {
          "placeId": "ChIJL_P_CXD-DDkR3wqE0...",
          "mainText": "Connaught Place",
          "secondaryText": "New Delhi, Delhi, India",
          "fullText": "Connaught Place, New Delhi, Delhi, India"
        }
      ]
    }
    ```

---

## 4. Rides & Tag Along (Booking) Module (`/api/rides`)

All `/api/rides` routes require authentication (`Authorization: Bearer <token>`).

### 4.1 Search Available Rides

Search published rides that are active and have seats remaining.

- **Method:** `GET`
- **Path:** `/api/rides/search`
- **Auth Required:** Yes (`Bearer <token>`)
- **Query Parameters:**
  | Parameter | Type | Required | Default | Description |
  |---|---|---|---|---|
  | `status` | String | No | `"active"` | Ride status filter (`active`, `completed`, `cancelled`) |
  | `min_seats` | Integer | No | — | Filter for `seat_available >= min_seats` |
  | `departure_date` | String (YYYY-MM-DD) | No | — | Filter for exact departure date |

- **Responses:**
  - **`200 OK`**
    ```json
    {
      "success": true,
      "data": [
        {
          "id": "e44cb89a-05c7-43cf-bcfe-e25675e01bb2",
          "driver_id": "c71fa79e-4bdf-4a6f-b258-2ecab275211b",
          "vehicle_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
          "departure_at": "2026-11-15",
          "seat_offered": 4,
          "seat_available": 3,
          "price_per_seat": 120,
          "currency": "INR",
          "status": "active",
          "route_polyline": "...",
          "description": "Traveling to North Campus",
          "rides_stops": [
            {
              "id": "11111111-2222-3333-4444-555555555555",
              "stop_order": 1,
              "stop_type": "origin",
              "location_name": "South Extension",
              "latitude": 28.5714,
              "longitude": 77.2212
            },
            {
              "id": "22222222-3333-4444-5555-666666666666",
              "stop_order": 2,
              "stop_type": "destination",
              "location_name": "Delhi University",
              "latitude": 28.6893,
              "longitude": 77.2104
            }
          ],
          "profiles": {
            "id": "c71fa79e-4bdf-4a6f-b258-2ecab275211b",
            "username": "janedoe",
            "first_name": "Jane",
            "last_name": "Doe"
          }
        }
      ]
    }
    ```

---

### 4.2 Get My Published Rides (Driver)

Lists all rides published by the currently authenticated user.

- **Method:** `GET`
- **Path:** `/api/rides/my/published`
- **Auth Required:** Yes (`Bearer <token>`)
- **Responses:**
  - **`200 OK`**
    ```json
    {
      "success": true,
      "data": [
        {
          "id": "e44cb89a-05c7-43cf-bcfe-e25675e01bb2",
          "departure_at": "2026-11-15",
          "seat_offered": 4,
          "seat_available": 3,
          "price_per_seat": 120,
          "status": "active",
          "rides_stops": [...]
        }
      ]
    }
    ```

---

### 4.3 Get My Bookings (Passenger)

Lists all bookings (requests to tag along) submitted by the authenticated passenger.

- **Method:** `GET`
- **Path:** `/api/rides/my/bookings`
- **Auth Required:** Yes (`Bearer <token>`)
- **Responses:**
  - **`200 OK`**
    ```json
    {
      "success": true,
      "data": [
        {
          "id": 101,
          "ride_id": "e44cb89a-05c7-43cf-bcfe-e25675e01bb2",
          "passenger_id": "8f38d384-569d-42bc-9022-ee5b99a9a3b1",
          "pickup_stop_id": "11111111-2222-3333-4444-555555555555",
          "dropoff_stop_id": "22222222-3333-4444-5555-666666666666",
          "seats_booked": 1,
          "total_amount": 120,
          "status": "confirmed",
          "created_at": "2026-11-09T01:14:00.000Z",
          "rides": {
            "id": "e44cb89a-05c7-43cf-bcfe-e25675e01bb2",
            "departure_at": "2026-11-15",
            "status": "active",
            "price_per_seat": 120,
            "currency": "INR",
            "rides_stops": [...]
          }
        }
      ]
    }
    ```

---

### 4.4 Publish a Ride with Stops

Publish a new ride schedule along with intermediate pick-up/drop-off stops.

- **Method:** `POST`
- **Path:** `/api/rides`
- **Auth Required:** Yes (`Bearer <token>`)
- **Request Body:**

  ```json
  {
    "vehicle_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "departure_at": "2026-11-15",
    "seat_offered": 3,
    "price_per_seat": 120.0,
    "currency": "INR",
    "route_polyline": "m{~tD_ifsM_@...",
    "description": "Daily morning campus commute.",
    "stops": [
      {
        "stop_order": 1,
        "stop_type": "origin",
        "location_name": "South Extension",
        "latitude": 28.5714,
        "longitude": 77.2212,
        "scheduled_at": "2026-11-15T08:00:00Z",
        "allow_pickup": true,
        "allow_dropoff": false
      },
      {
        "stop_order": 2,
        "stop_type": "stop",
        "location_name": "Kashmere Gate",
        "latitude": 28.6675,
        "longitude": 77.2285,
        "scheduled_at": "2026-11-15T08:30:00Z",
        "allow_pickup": true,
        "allow_dropoff": true
      },
      {
        "stop_order": 3,
        "stop_type": "destination",
        "location_name": "Delhi University",
        "latitude": 28.6893,
        "longitude": 77.2104,
        "scheduled_at": "2026-11-15T09:00:00Z",
        "allow_pickup": false,
        "allow_dropoff": true
      }
    ]
  }
  ```

  | Field                   | Type                | Required | Description                                               |
  | ----------------------- | ------------------- | -------- | --------------------------------------------------------- |
  | `vehicle_id`            | UUID                | Yes      | Existing vehicle ID belonging to driver                   |
  | `departure_at`          | String (YYYY-MM-DD) | Yes      | Date of departure                                         |
  | `seat_offered`          | Integer             | Yes      | Total seats offered (>= 1)                                |
  | `price_per_seat`        | Number              | Yes      | Price per passenger seat                                  |
  | `currency`              | String              | No       | Currency code (default: `"INR"`)                          |
  | `route_polyline`        | String              | No       | Encoded Google Maps polyline                              |
  | `description`           | String              | No       | Notes/Instructions for passengers                         |
  | `stops`                 | Array               | Yes      | Array of stops (minimum 2 items: 1 origin, 1 destination) |
  | `stops[].stop_order`    | Integer             | Yes      | Sequence index (1, 2, 3...)                               |
  | `stops[].stop_type`     | String              | Yes      | `"origin"`, `"stop"`, or `"destination"`                  |
  | `stops[].location_name` | String              | Yes      | Stop display name                                         |
  | `stops[].latitude`      | Number              | Yes      | Latitude                                                  |
  | `stops[].longitude`     | Number              | Yes      | Longitude                                                 |
  | `stops[].scheduled_at`  | String (ISO)        | No       | Estimated arrival timestamp                               |
  | `stops[].allow_pickup`  | Boolean             | No       | Passenger pickup allowed (default: `true`)                |
  | `stops[].allow_dropoff` | Boolean             | No       | Passenger dropoff allowed (default: `true`)               |

- **Responses:**
  - **`201 Created`**
    ```json
    {
      "success": true,
      "data": {
        "id": "e44cb89a-05c7-43cf-bcfe-e25675e01bb2",
        "driver_id": "c71fa79e-4bdf-4a6f-b258-2ecab275211b",
        "vehicle_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        "departure_at": "2026-11-15",
        "seat_offered": 3,
        "seat_available": 3,
        "price_per_seat": 120,
        "currency": "INR",
        "status": "active",
        "stops": [ ...stopsCreated ]
      }
    }
    ```
  - **`400 Bad Request`**
    ```json
    {
      "success": false,
      "error": "stops must include at least one stop with stop_type 'origin'."
    }
    ```

---

### 4.5 Get Ride by ID

Fetch full details of a specific ride, including its ordered stops and driver verification profile.

- **Method:** `GET`
- **Path:** `/api/rides/:rideId`
- **Auth Required:** Yes (`Bearer <token>`)
- **Path Parameters:**
  | Parameter | Type | Required | Description |
  |---|---|---|---|
  | `rideId` | UUID | Yes | Target ride UUID |

- **Responses:**
  - **`200 OK`**
    ```json
    {
      "success": true,
      "data": {
        "id": "e44cb89a-05c7-43cf-bcfe-e25675e01bb2",
        "departure_at": "2026-11-15",
        "seat_offered": 3,
        "seat_available": 3,
        "price_per_seat": 120,
        "status": "active",
        "rides_stops": [...],
        "profiles": {
          "id": "c71fa79e-4bdf-4a6f-b258-2ecab275211b",
          "username": "janedoe",
          "first_name": "Jane",
          "last_name": "Doe",
          "verification_status": "verified"
        }
      }
    }
    ```
  - **`404 Not Found`**
    ```json
    {
      "success": false,
      "error": "Ride not found."
    }
    ```

---

### 4.6 Update Ride

Update ride settings (date, price, seats, description). Available only to the ride's driver while the ride is active.

- **Method:** `PATCH`
- **Path:** `/api/rides/:rideId`
- **Auth Required:** Yes (`Bearer <token>`)
- **Path Parameters:**
  | Parameter | Type | Required | Description |
  |---|---|---|---|
  | `rideId` | UUID | Yes | Target ride UUID |
- **Request Body:** (Provide at least one field)
  ```json
  {
    "departure_at": "2026-11-16",
    "price_per_seat": 130.0,
    "description": "Updated time: starting 15 mins later",
    "seat_offered": 4
  }
  ```
- **Responses:**
  - **`200 OK`**
    ```json
    {
      "success": true,
      "data": {
        "id": "e44cb89a-05c7-43cf-bcfe-e25675e01bb2",
        "departure_at": "2026-11-16",
        "price_per_seat": 130,
        "seat_offered": 4,
        "seat_available": 4
      }
    }
    ```
  - **`400 Bad Request`**
    ```json
    {
      "success": false,
      "error": "Cannot reduce seat_offered below already booked seats (2)."
    }
    ```
  - **`403 Forbidden`**
    ```json
    {
      "success": false,
      "error": "Only the driver can update this ride."
    }
    ```

---

### 4.7 Cancel Ride

Cancel a published ride. Automatically marks the ride as `cancelled` and marks all existing `pending` and `confirmed` passenger bookings as `cancelled`.

- **Method:** `POST`
- **Path:** `/api/rides/:rideId/cancel`
- **Auth Required:** Yes (`Bearer <token>`)
- **Path Parameters:**
  | Parameter | Type | Required | Description |
  |---|---|---|---|
  | `rideId` | UUID | Yes | Target ride UUID |
- **Request Body:** None
- **Responses:**
  - **`200 OK`**
    ```json
    {
      "success": true,
      "data": {
        "id": "e44cb89a-05c7-43cf-bcfe-e25675e01bb2",
        "status": "cancelled"
      },
      "message": "Ride and associated bookings have been cancelled."
    }
    ```
  - **`403 Forbidden`**
    ```json
    {
      "success": false,
      "error": "Only the driver can cancel this ride."
    }
    ```

---

### 4.8 Request Tag Along (Book Ride)

Allows a passenger to request seats on an active ride. Checks seat availability and reserves seats by decrementing `seat_available`.

- **Method:** `POST`
- **Path:** `/api/rides/:rideId/book`
- **Auth Required:** Yes (`Bearer <token>`)
- **Path Parameters:**
  | Parameter | Type | Required | Description |
  |---|---|---|---|
  | `rideId` | UUID | Yes | Target ride UUID |
- **Request Body:**

  ```json
  {
    "pickup_stop_id": "11111111-2222-3333-4444-555555555555",
    "dropoff_stop_id": "22222222-3333-4444-5555-666666666666",
    "seats_booked": 2
  }
  ```

  | Field             | Type    | Required | Description                      |
  | ----------------- | ------- | -------- | -------------------------------- |
  | `pickup_stop_id`  | UUID    | Yes      | Stop ID where passenger boards   |
  | `dropoff_stop_id` | UUID    | Yes      | Stop ID where passenger gets off |
  | `seats_booked`    | Integer | Yes      | Number of seats requested (>= 1) |

- **Responses:**
  - **`201 Created`**
    ```json
    {
      "success": true,
      "data": {
        "id": 105,
        "ride_id": "e44cb89a-05c7-43cf-bcfe-e25675e01bb2",
        "passenger_id": "8f38d384-569d-42bc-9022-ee5b99a9a3b1",
        "pickup_stop_id": "11111111-2222-3333-4444-555555555555",
        "dropoff_stop_id": "22222222-3333-4444-5555-666666666666",
        "seats_booked": 2,
        "total_amount": 240,
        "status": "pending",
        "created_at": "2026-11-09T01:20:00.000Z"
      }
    }
    ```
  - **`400 Bad Request`**
    ```json
    {
      "success": false,
      "error": "Only 1 seat(s) available. Requested 2."
    }
    ```
    _(or `"You cannot book your own ride."`)_

---

### 4.9 Get Ride Bookings (Driver View)

Allows the driver of a ride to view all passenger bookings placed on their ride.

- **Method:** `GET`
- **Path:** `/api/rides/:rideId/bookings`
- **Auth Required:** Yes (`Bearer <token>`)
- **Path Parameters:**
  | Parameter | Type | Required | Description |
  |---|---|---|---|
  | `rideId` | UUID | Yes | Target ride UUID |
- **Responses:**
  - **`200 OK`**
    ```json
    {
      "success": true,
      "data": [
        {
          "id": 105,
          "ride_id": "e44cb89a-05c7-43cf-bcfe-e25675e01bb2",
          "passenger_id": "8f38d384-569d-42bc-9022-ee5b99a9a3b1",
          "seats_booked": 2,
          "total_amount": 240,
          "status": "pending",
          "created_at": "2026-11-09T01:20:00.000Z",
          "profiles": {
            "id": "8f38d384-569d-42bc-9022-ee5b99a9a3b1",
            "username": "alex99",
            "first_name": "Alex",
            "last_name": "Smith"
          }
        }
      ]
    }
    ```
  - **`403 Forbidden`**
    ```json
    {
      "success": false,
      "error": "Only the driver can view bookings for this ride."
    }
    ```

---

### 4.10 Respond to Booking (Confirm / Reject)

Driver approves or rejects a passenger's pending tag-along request. Rejecting restores the booked seats back to the ride's `seat_available`.

- **Method:** `PATCH`
- **Path:** `/api/rides/:rideId/booking/:bookingId`
- **Auth Required:** Yes (`Bearer <token>`)
- **Path Parameters:**
  | Parameter | Type | Required | Description |
  |---|---|---|---|
  | `rideId` | UUID | Yes | Target ride UUID |
  | `bookingId` | BigInt / Integer | Yes | Target booking ID |
- **Request Body:**

  ```json
  {
    "action": "confirm"
  }
  ```

  | Field    | Type   | Required | Values                    |
  | -------- | ------ | -------- | ------------------------- |
  | `action` | String | Yes      | `"confirm"` or `"reject"` |

- **Responses:**
  - **`200 OK` (Confirmed)**
    ```json
    {
      "success": true,
      "data": {
        "id": 105,
        "ride_id": "e44cb89a-05c7-43cf-bcfe-e25675e01bb2",
        "status": "confirmed"
      }
    }
    ```
  - **`200 OK` (Rejected)**
    ```json
    {
      "success": true,
      "data": {
        "id": 105,
        "ride_id": "e44cb89a-05c7-43cf-bcfe-e25675e01bb2",
        "status": "rejected"
      }
    }
    ```
  - **`400 Bad Request`**
    ```json
    {
      "success": false,
      "error": "action must be 'confirm' or 'reject'."
    }
    ```
  - **`403 Forbidden`**
    ```json
    {
      "success": false,
      "error": "Only the ride's driver can respond to bookings."
    }
    ```

---

### 4.11 Cancel Booking (Passenger)

Passenger cancels their own booking request. Automatically restores `seats_booked` to the ride's `seat_available`.

- **Method:** `POST`
- **Path:** `/api/rides/:rideId/booking/:bookingId/cancel`
- **Auth Required:** Yes (`Bearer <token>`)
- **Path Parameters:**
  | Parameter | Type | Required | Description |
  |---|---|---|---|
  | `rideId` | UUID | Yes | Target ride UUID |
  | `bookingId` | BigInt / Integer | Yes | Target booking ID |
- **Request Body:** None
- **Responses:**
  - **`200 OK`**
    ```json
    {
      "success": true,
      "data": {
        "id": 105,
        "ride_id": "e44cb89a-05c7-43cf-bcfe-e25675e01bb2",
        "status": "cancelled"
      }
    }
    ```
  - **`400 Bad Request`**
    ```json
    {
      "success": false,
      "error": "Cannot cancel a booking with status 'rejected'."
    }
    ```
  - **`403 Forbidden`**
    ```json
    {
      "success": false,
      "error": "Only the passenger can cancel their booking."
    }
    ```
