const express = require("express");
const db = require("../db");
const { requireLogin } = require("../middleware/auth");

const router = express.Router();

// all routes here require login
router.use(requireLogin);

// ✅ Check access for a product
router.get("/has-access", async (req, res) => {
  try {
    const productKey = String(req.query.product || "").trim();
    if (!productKey) {
      return res.status(400).json({ ok: false, error: "MISSING_PRODUCT" });
    }

    const userId = req.session.user.id;
    const [rows] = await db.query(
      "SELECT id FROM purchases WHERE user_id = ? AND product_key = ? AND status = 'approved' LIMIT 1",
      [userId, productKey]
    );

    return res.json({ ok: true, hasAccess: rows.length > 0 });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

// ✅ List user's approved books
router.get("/my-books", async (req, res) => {
  try {
    const userId = req.session.user.id;
    const [rows] = await db.query(
      "SELECT product_key, status, created_at FROM purchases WHERE user_id = ? AND status = 'approved' ORDER BY created_at DESC",
      [userId]
    );
    return res.json({ ok: true, books: rows });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

// ✅ Request purchase (creates/keeps a pending row)
router.post("/request-purchase", async (req, res) => {
  try {
    const key = String((req.body || {}).product_key || "").trim();
    if (!key) return res.status(400).json({ ok: false, error: "MISSING_PRODUCT_KEY" });

    const userId = req.session.user.id;
    await db.query(
      `INSERT INTO purchases (user_id, product_key, status)
       VALUES (?, ?, 'pending')
       ON DUPLICATE KEY UPDATE
         status = IF(status='approved', status, 'pending')`,
      [userId, key]
    );

    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

module.exports = router;
