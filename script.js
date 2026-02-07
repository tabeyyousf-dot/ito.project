// Home page interactions + auth-aware UI

// Use the same hostname the user opened the site with (localhost vs 127.0.0.1)
// so session cookies work correctly.
const API_BASE = `${location.protocol}//${location.hostname}:3000`;
const PAID_PRODUCT_KEY = "book_paid";

function qs(sel) {
  return document.querySelector(sel);
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
  const ct = res.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");
  const data = isJson ? await res.json() : { ok: false, error: await res.text() };
  if (!res.ok) throw Object.assign(new Error(data?.error || "HTTP_ERROR"), { status: res.status, data });
  return data;
}

async function hydrateAuthUi() {
  const signinBtn = document.getElementById("signinBtn");
  const modalSigninBtn = document.getElementById("modalSigninBtn");
  const buyNowBtn = document.getElementById("buyNowBtn");

  let me = null;
  try {
    me = await apiGet("/api/auth/me");
  } catch (_) {
    // ignore
  }

  const user = me?.user || null;

  // Header button
  if (signinBtn) {
    if (user) {
      signinBtn.textContent = "حسابي";
      signinBtn.href = "account.html";
    } else {
      signinBtn.textContent = "Sign-in";
      signinBtn.href = "login.html";
    }
  }

  // Modal sign-in button (hide if user already logged in)
  if (modalSigninBtn) {
    if (user) {
      modalSigninBtn.style.display = "none";
    } else {
      modalSigninBtn.style.display = "inline-flex";
      modalSigninBtn.addEventListener("click", () => {
        window.location.href = "login.html";
      });
    }
  }

  // Paid book CTA: if user has approved purchase => اقرأ الآن
  if (buyNowBtn && user) {
    try {
      const myBooks = await apiGet("/api/user/my-books");
      const hasPaid = (myBooks?.books || []).some((b) => b.product_key === PAID_PRODUCT_KEY);
      if (hasPaid) {
        // Turn the CTA into read button and bypass modal
        buyNowBtn.textContent = "اقرأ الآن";
        buyNowBtn.href = "book-paid.html";
        buyNowBtn.setAttribute("data-direct", "true");
      }
    } catch (_) {
      // ignore
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // ===== Smooth scroll لأي لينك داخلي (ويستثني # لوحدها) =====
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (!href || href === "#") return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
    });
  });

  // ===== Tap effect =====
  function addTapFx(el) {
    el.addEventListener("mousedown", () => el.classList.add("tap"));
    el.addEventListener("mouseup", () => el.classList.remove("tap"));
    el.addEventListener("mouseleave", () => el.classList.remove("tap"));
  }
  document.querySelectorAll(".hoverfx, .hovercard").forEach(addTapFx);

  // ===== Modal =====
  const buyBtn = document.getElementById("buyNowBtn");
  const modal = document.getElementById("buyModal");
  const closeBtn = document.getElementById("closeModalBtn");

  function openModal() {
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }

  if (buyBtn) {
    buyBtn.addEventListener("click", (e) => {
      // لو الزرار اتغير لـ اقرأ الآن (للي اشترى) خلي اللينك يفتح عادي
      const direct = buyBtn.getAttribute("data-direct") === "true";
      const href = buyBtn.getAttribute("href") || "";
      if (direct || href.includes("book-paid.html")) return;

      e.preventDefault();
      openModal();
    });
  }

  if (closeBtn) closeBtn.addEventListener("click", closeModal);

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target && e.target.getAttribute("data-close") === "true") closeModal();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && modal.classList.contains("is-open")) closeModal();
  });

  // Auth-aware UI (single source of truth)
  hydrateAuthUi();
});
