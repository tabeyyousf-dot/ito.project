function requireAdmin(req, res, next) {
  const u = req.session?.user;
  if (!u) return res.status(401).json({ ok: false, error: "NOT_AUTHENTICATED" });
  if (u.role !== "admin") return res.status(403).json({ ok: false, error: "FORBIDDEN" });
  next();
}

module.exports = { requireAdmin };
