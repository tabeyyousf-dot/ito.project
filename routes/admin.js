const express = require("express");
const db = require("../db");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();
router.use(requireAdmin);

// ✅ list pending purchases
router.get("/pending", async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.id, p.user_id, p.product_key, p.status, p.created_at,
              u.name AS user_name, u.email AS user_email
       FROM purchases p
       JOIN users u ON u.id = p.user_id
       WHERE p.status = 'pending'
       ORDER BY p.created_at DESC`,
    );
    return res.json({ ok: true, items: rows });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

// ✅ list approved subscriptions ("subscribers")
router.get("/subscriptions", async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.id, p.user_id, p.product_key, p.status, p.created_at,
              u.name AS user_name, u.email AS user_email
       FROM purchases p
       JOIN users u ON u.id = p.user_id
       WHERE p.status = 'approved'
       ORDER BY p.created_at DESC`,
    );
    return res.json({ ok: true, items: rows });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

// ✅ approve purchase
router.post("/approve", async (req, res) => {
  try {
    const purchase_id = Number(req.body?.purchase_id);
    if (!purchase_id) return res.status(400).json({ ok: false, error: "MISSING_PURCHASE_ID" });

    const [result] = await db.query(
      "UPDATE purchases SET status = 'approved' WHERE id = ?",
      [purchase_id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

// ✅ revoke an approved purchase (keeps record but removes access)
router.post("/revoke", async (req, res) => {
  try {
    const purchase_id = Number(req.body?.purchase_id);
    if (!purchase_id) return res.status(400).json({ ok: false, error: "MISSING_PURCHASE_ID" });

    const [result] = await db.query(
      "UPDATE purchases SET status = 'revoked' WHERE id = ?",
      [purchase_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

module.exports = router;
