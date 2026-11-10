import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

// Admin client — uses the service role key for server-side operations
// (e.g. fetching user by ID, admin-level queries). Never expose this to the client.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Public client — uses the publishable (anon) key.
// Used for auth flows (signUp, signIn, OAuth) where Supabase needs to set
// session cookies / tokens for the end user.
export const supabaseAuth = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: true,
  },
});

export default supabaseAdmin;
