import { supabaseAuth, supabaseAdmin } from "../db/supabase.js";

// ──────────────────────────────────────────────
//  Email / Password — Sign Up
// ──────────────────────────────────────────────
export const signUp = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const { data, error } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name }, // stored in user_metadata
      },
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({
      message:
        "Sign-up successful. Please check your email to confirm your account.",
      user: data.user,
      session: data.session,
    });
  } catch (err) {
    console.error("signUp error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ──────────────────────────────────────────────
//  Email / Password — Sign In
// ──────────────────────────────────────────────
export const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    return res.status(200).json({
      message: "Sign-in successful",
      user: data.user,
      session: data.session,
    });
  } catch (err) {
    console.error("signIn error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ──────────────────────────────────────────────
//  Google OAuth — get the redirect URL
// ──────────────────────────────────────────────
export const googleOAuth = async (req, res) => {
  try {
    // The frontend redirect URL after Google sign-in completes.
    // Supabase redirects here with access_token & refresh_token in the hash.
    const redirectTo =
      req.query.redirect_to || "http://localhost:5173/auth/callback";

    const { data, error } = await supabaseAuth.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Return the Supabase-generated OAuth URL for the client to navigate to
    return res.status(200).json({ url: data.url });
  } catch (err) {
    console.error("googleOAuth error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ──────────────────────────────────────────────
//  OAuth Callback — exchange code for session
//  (used with PKCE / server-side code exchange)
// ──────────────────────────────────────────────
export const oauthCallback = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ error: "Authorization code is required" });
    }

    const { data, error } = await supabaseAuth.auth.exchangeCodeForSession(
      code,
    );

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({
      message: "OAuth sign-in successful",
      user: data.user,
      session: data.session,
    });
  } catch (err) {
    console.error("oauthCallback error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ──────────────────────────────────────────────
//  Refresh Session
// ──────────────────────────────────────────────
export const refreshSession = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: "Refresh token is required" });
    }

    const { data, error } = await supabaseAuth.auth.refreshSession({
      refresh_token,
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    return res.status(200).json({
      message: "Session refreshed",
      session: data.session,
      user: data.user,
    });
  } catch (err) {
    console.error("refreshSession error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ──────────────────────────────────────────────
//  Sign Out
// ──────────────────────────────────────────────
export const signOut = async (req, res) => {
  try {
    const { error } = await supabaseAuth.auth.signOut();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ message: "Signed out successfully" });
  } catch (err) {
    console.error("signOut error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ──────────────────────────────────────────────
//  Get Current User (protected route handler)
// ──────────────────────────────────────────────
export const getMe = async (req, res) => {
  try {
    // req.user is attached by the auth middleware
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(
      req.user.sub,
    );

    if (error) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ user: data.user });
  } catch (err) {
    console.error("getMe error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

