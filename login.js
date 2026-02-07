const API_BASE = `${location.protocol}//${location.hostname}:3000`;

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("loginForm");
  const msg = document.getElementById("msg");
  const googleBtn = document.querySelector('a.btn.google');

  // Keep the Google button consistent with the hostname (localhost vs 127.0.0.1)
  if (googleBtn) googleBtn.href = `${API_BASE}/api/auth/google`;

  // لو المستخدم أصلاً مسجل دخول، رجّعه للهوم
  try {
    const meRes = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include" });
    const me = await meRes.json().catch(() => null);
    if (me?.user) {
      window.location.href = "index.html";
      return;
    }
  } catch (_) {}

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (msg) msg.textContent = "";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      const r = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await r.json().catch(() => null);

      if (!r.ok || !data?.ok) {
        if (msg) msg.textContent = "بيانات الدخول غير صحيحة.";
        return;
      }

      // بعد تسجيل الدخول: لو فيه next رجّعه ليه، غير كده للهوم
      const params = new URLSearchParams(location.search);
      const next = params.get("next");
      window.location.href = next ? decodeURIComponent(next) : "index.html";
    } catch (err) {
      if (msg) msg.textContent = "في مشكلة في السيرفر.. جرّب تاني.";
    }
  });
});
