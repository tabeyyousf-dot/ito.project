const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const passport = require("passport");

const router = express.Router();

// ✅ Register (name + email + password)
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ ok: false, error: "MISSING_FIELDS" });
    }

    const cleanName = String(name).trim();
    const cleanEmail = String(email).trim().toLowerCase();

    // check email exists
    const [exists] = await db.query("SELECT id FROM users WHERE email = ? LIMIT 1", [cleanEmail]);
    if (exists.length) {
      return res.status(409).json({ ok: false, error: "EMAIL_EXISTS" });
    }

    const hash = await bcrypt.hash(String(password), 10);

    // ⚠️ جدولك اسمه password مش password_hash
    const [result] = await db.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'user')",
      [cleanName, cleanEmail, hash]
    );

    req.session.user = { id: result.insertId, name: cleanName, email: cleanEmail, role: "user" };
    return res.json({ ok: true, user: req.session.user });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

// ✅ Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "MISSING_FIELDS" });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const [rows] = await db.query(
      "SELECT id, name, email, password, role FROM users WHERE email = ? LIMIT 1",
      [cleanEmail]
    );

    if (!rows.length) {
      return res.status(401).json({ ok: false, error: "INVALID_CREDENTIALS" });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(String(password), user.password);

    if (!ok) {
      return res.status(401).json({ ok: false, error: "INVALID_CREDENTIALS" });
    }

    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    return res.json({ ok: true, user: req.session.user });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

// ✅ Logout
router.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// ✅ Google OAuth (اختياري)
router.get("/google", (req, res, next) => {
  if (!req.app.get("googleEnabled")) {
    return res.status(501).json({ ok: false, error: "GOOGLE_OAUTH_NOT_CONFIGURED" });
  }
  return passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

router.get(
  "/google/callback",
  (req, res, next) => {
    if (!req.app.get("googleEnabled")) {
      return res.status(501).json({ ok: false, error: "GOOGLE_OAUTH_NOT_CONFIGURED" });
    }
    return passport.authenticate("google", {
      failureRedirect: `${req.app.get("frontendUrl")}/login.html?e=google_failed`,
    })(req, res, next);
  },
  (req, res) => {
    // req.user is set by passport
    const u = req.user;
    req.session.user = { id: u.id, name: u.name, email: u.email, role: u.role };
    return res.redirect(`${req.app.get("frontendUrl")}/account.html`);
  }
);

// ✅ Get current user
router.get("/me", (req, res) => {
  res.json({ ok: true, user: req.session?.user || null });
});

module.exports = router;

