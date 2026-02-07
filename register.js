const API_BASE = `${location.protocol}//${location.hostname}:3000`;

const form = document.getElementById("registerForm");
const msg = document.getElementById("msg");

function setMsg(text, ok = false) {
  msg.textContent = text;
  msg.style.color = ok ? "#2dd4bf" : "#f87171";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      const code = data.error || `HTTP_${res.status}`;
      if (code === "EMAIL_EXISTS") return setMsg("الإيميل مستخدم قبل كده.");
      if (code === "MISSING_FIELDS") return setMsg("من فضلك اكتب كل البيانات.");
      return setMsg("حصل خطأ.. جرّب تاني.");
    }

    setMsg("تم إنشاء الحساب ✅", true);
    window.location.href = "account.html";
  } catch (err) {
    console.error(err);
    setMsg("تعذر الاتصال بالسيرفر.. اتأكد إن الباك اند شغال.");
  }
});
