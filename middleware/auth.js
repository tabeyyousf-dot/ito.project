// backend/middleware/auth.js
function requireLogin(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ ok: false, error: "NOT_LOGGED_IN" });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ ok: false, error: "NOT_LOGGED_IN" });
  if (req.session.user.role !== "admin") return res.status(403).json({ ok: false, error: "FORBIDDEN" });
  next();
}

module.exports = { requireLogin, requireAdmin };
