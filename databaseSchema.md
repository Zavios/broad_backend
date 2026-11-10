# profiles

-- id uuid (primary key, foreign key from auth.users)
-- username text
-- firstName text
-- lastName text
-- verification_status text
-- dob date
-- created_at timestamp with time zone
-- email text
-- phone smallint
-- bio text
-- initial_setup boolean

# vehicles

-- id uuid (primary key)
-- owner_id uuid (foreign key from profiles)
-- make text
-- model text
-- color text
-- registration_no text
-- seat_capacity smallint
-- created_at timestamp with time zone

# rides

-- id uuid (primary key)
-- driver_id uuid (foreign key from profiles)
-- vehicle_id uuid (foreign key from vehicles)
-- departure_at date
-- seat_offered smallint
-- seat_available smallint
-- price_per_seat numeric
-- currency text
-- route_polyline text
-- description text
-- status text
-- created_at timestamp with time zone

# rides_stops

-- id uuid (primary key)
-- ride_id uuid (foreign key from rides)
-- stop_order smallint
-- stop_type text
-- location_name text
-- longitude numeric
-- latitude numeric
-- scheduled_at timestamp with time zone
-- allow_pickup boolean
-- allow_dropoff boolean
-- created_at timestamp with time zone

# booking

-- id bigint (primary key)
-- ride_id uuid (foreign key from rides)
-- passenger_id uuid (foreign key from profiles)
-- pickup_stop_id uuid (foreign key from rides_stops)
-- dropoff_stop_id uuid (foreign key from rides_stops)
-- seats_booked smallint
-- total_amount numeric
-- status text
-- created_at timestamp with time zone
