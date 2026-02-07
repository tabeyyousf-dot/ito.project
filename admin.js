// Admin dashboard (pending approvals + list subscribers)
// NOTE: we keep API_BASE dynamic to avoid localhost/127 cookie mismatch.
const API_BASE = `${location.protocol}//${location.hostname}:3000`;

async function api(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...opts,
  });
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : await res.text();
  return { ok: res.ok, status: res.status, data };
}

const $ = (id) => document.getElementById(id);

function fmtDate(v) {
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v || "");
  }
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

async function requireAdminOrRedirect() {
  const me = await api("/api/auth/me");
  if (!me.ok || !me.data?.user) {
    window.location.href = "login.html";
    return null;
  }
  const role = String(me.data.user.role || "").toLowerCase();
  if (role !== "admin") {
    alert("هذه الصفحة للأدمن فقط");
    window.location.href = "index.html";
    return null;
  }
  return me.data.user;
}

async function loadPending() {
  const rowsEl = $("pendingRows");
  const msg = $("msg");

  const pending = await api("/api/admin/pending");
  if (!pending.ok) {
    msg.textContent = `❌ خطأ في تحميل الطلبات: ${pending.status}`;
    rowsEl.innerHTML = "";
    return;
  }

  const items = pending.data.items || [];
  if (!items.length) {
    msg.textContent = "لا توجد طلبات معلّقة.";
    rowsEl.innerHTML = "";
    return;
  }

  msg.textContent = `طلبات معلّقة: ${items.length}`;

  rowsEl.innerHTML = items
    .map(
      (it) => `
      <tr>
        <td>${esc(it.user_name)}</td>
        <td>${esc(it.user_email)}</td>
        <td><b>${esc(it.product_key)}</b></td>
        <td>${esc(fmtDate(it.created_at))}</td>
        <td>
          <button class="btn btn--primary btn--sm" data-approve="${it.id}">تفعيل</button>
        </td>
      </tr>
    `
    )
    .join("");

  rowsEl.querySelectorAll("[data-approve]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      const purchaseId = Number(btn.getAttribute("data-approve"));
      const r = await api("/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchase_id: purchaseId }),
      });
      if (!r.ok) {
        btn.disabled = false;
        alert("فشل التفعيل");
        return;
      }
      // reload both lists so "المشتركين" يتحدث
      await loadAll();
    });
  });
}

async function loadSubscribers() {
  const rowsEl = $("subsRows");
  const subsMsg = $("subsMsg");

  const r = await api("/api/admin/subscriptions");
  if (!r.ok) {
    subsMsg.textContent = `❌ خطأ في تحميل المشتركين: ${r.status}`;
    rowsEl.innerHTML = "";
    return;
  }

  const items = r.data.items || [];
  subsMsg.textContent = items.length ? `مشتركين: ${items.length}` : "لا يوجد اشتراكات مفعّلة حتى الآن.";

  rowsEl.innerHTML = items
    .map(
      (it) => `
      <tr>
        <td>${esc(it.user_name)}</td>
        <td>${esc(it.user_email)}</td>
        <td><b>${esc(it.product_key)}</b></td>
        <td>${esc(fmtDate(it.updated_at || it.created_at))}</td>
        <td>
          <button class="btn btn--ghost btn--sm" data-revoke="${it.id}">إلغاء</button>
        </td>
      </tr>
    `
    )
    .join("");

  rowsEl.querySelectorAll("[data-revoke]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.getAttribute("data-revoke"));
      if (!confirm("متأكد إنك عايز تلغي تفعيل الكتاب للمستخدم؟")) return;
      btn.disabled = true;
      const rr = await api("/api/admin/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchase_id: id }),
      });
      if (!rr.ok) {
        btn.disabled = false;
        alert("فشل الإلغاء");
        return;
      }
      await loadAll();
    });
  });
}

async function loadAll() {
  await loadPending();
  await loadSubscribers();
}

(async function main() {
  const ok = await requireAdminOrRedirect();
  if (!ok) return;
  await loadAll();

  $("refreshBtn")?.addEventListener("click", loadAll);
  $("logoutBtn")?.addEventListener("click", async () => {
    await api("/api/auth/logout", { method: "POST" });
    window.location.href = "index.html";
  });
})();
