require("dotenv").config();

const express = require("express");
const session = require("express-session");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const db = require("./db");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const adminRoutes = require("./routes/admin");

const app = express();

app.use(express.json({ limit: "1mb" }));

// During dev (Live Server on 5500) allow browser requests
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(
  session({
    name: "ito_sid",
    secret: process.env.SESSION_SECRET || "dev_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // set true on https in prod
    },
  })
);

// -----------------
// Passport (Google OAuth) - optional
// -----------------
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const [rows] = await db.query(
      "SELECT id, name, email, role FROM users WHERE id = ? LIMIT 1",
      [id]
    );
    if (!rows.length) return done(null, false);
    return done(null, rows[0]);
  } catch (e) {
    return done(e);
  }
});

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleCallbackUrl =
  process.env.GOOGLE_CALLBACK_URL ||
  "http://localhost:3000/api/auth/google/callback";

if (googleClientId && googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: googleCallbackUrl,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email =
            (profile.emails && profile.emails[0] && profile.emails[0].value) ||
            "";
          const name = profile.displayName || "Google User";

          if (!email) return done(null, false);

          const cleanEmail = String(email).trim().toLowerCase();
          const [rows] = await db.query(
            "SELECT id, name, email, role FROM users WHERE email = ? LIMIT 1",
            [cleanEmail]
          );

          if (rows.length) return done(null, rows[0]);

          // create a user (set a random password hash because column may be NOT NULL)
          const randomPwd = bcrypt.hashSync(
            `google_${Date.now()}_${Math.random()}`,
            10
          );
          const [result] = await db.query(
            "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'user')",
            [name, cleanEmail, randomPwd]
          );

          return done(null, {
            id: result.insertId,
            name,
            email: cleanEmail,
            role: "user",
          });
        } catch (e) {
          return done(e);
        }
      }
    )
  );
}

app.set("googleEnabled", Boolean(googleClientId && googleClientSecret));
app.set("frontendUrl", process.env.FRONTEND_URL || "http://127.0.0.1:5500");

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.get("/api/health", (req, res) => res.json({ ok: true }));

// make passport accessible in auth routes
app.set("passport", passport);

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);

// Create admin user once (optional)
async function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const pass = process.env.ADMIN_PASSWORD || "";
  if (!email || !pass) return;

  const [rows] = await db.query(
    "SELECT id, role FROM users WHERE email = ? LIMIT 1",
    [email]
  );
  if (rows.length) {
    // if exists but not admin, upgrade
    if (rows[0].role !== "admin") {
      await db.query("UPDATE users SET role='admin' WHERE id = ?", [rows[0].id]);
    }
    return;
  }

  const hash = bcrypt.hashSync(pass, 10);
  await db.query(
    "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')",
    ["Admin", email, hash]
  );
  console.log("✅ Admin created:", email);
}

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  ensureAdmin().catch((e) => console.error("ensureAdmin error:", e));
  console.log(`✅ API running on http://localhost:${PORT}`);
});
