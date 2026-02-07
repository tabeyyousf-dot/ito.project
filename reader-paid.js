// PDF reader for paid book (requires login + approved purchase)
// Adds a watermark with the user's name on every page.

const API_BASE = `${location.protocol}//${location.hostname}:3000`;
const PAID_PRODUCT_KEY = "book_paid";

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : await res.text();
  return { ok: res.ok, status: res.status, data };
}

function goLogin() {
  // رجّعه بعد اللوجين لنفس صفحة الكتاب
  const next = encodeURIComponent("book-paid.html");
  window.location.href = `login.html?next=${next}`;
}

async function requireAccess() {
  const me = await apiGet("/api/auth/me");
  if (!me.ok || !me.data?.user) return { allowed: false };

  const books = await apiGet("/api/user/my-books");
  const list = (books.data?.books || []).map((b) => b.product_key);
  const allowed = list.includes(PAID_PRODUCT_KEY);
  return { allowed, user: me.data.user };
}

function watermark(ctx, width, height, name) {
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px Cairo, sans-serif";

  // مَيّل الكلام شوية
  ctx.translate(width / 2, height / 2);
  ctx.rotate((-25 * Math.PI) / 180);

  const text = `ito.coding • ${name}`;
  const stepX = 360;
  const stepY = 220;

  for (let y = -height; y <= height; y += stepY) {
    for (let x = -width; x <= width; x += stepX) {
      ctx.fillText(text, x, y);
    }
  }

  ctx.restore();
}

async function loadPDF(userName) {
  const pdfUrl = "paid-book.pdf"; // ✅ حط ملفك هنا بنفس الاسم
  const loading = document.getElementById("pdfStatus");
  const pagesContainer = document.getElementById("pdfPages");
  const counter = document.getElementById("pdfCounter");

  const show = (t) => (loading.textContent = t);

  try {
    show("جاري تحميل الكتاب...");
    const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
    show("");
    counter.textContent = `عدد الصفحات: ${pdf.numPages}`;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.4 });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.className = "pdf-page";

      await page.render({ canvasContext: ctx, viewport }).promise;

      // watermark فوق الصفحة
      watermark(ctx, canvas.width, canvas.height, userName);

      pagesContainer.appendChild(canvas);
    }
  } catch (err) {
    console.error(err);
    show("فشل تحميل الكتاب. تأكد إن ملف paid-book.pdf موجود في نفس فولدر المشروع.");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // Load pdf.js
  const sc = document.createElement("script");
  sc.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.min.js";
  sc.onload = async () => {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js";

    const access = await requireAccess();
    if (!access.allowed) {
      document.getElementById("blocked").style.display = "block";
      document.getElementById("pdfStatus").textContent = "";
      return;
    }

    await loadPDF(access.user?.name || access.user?.email || "User");
  };
  document.body.appendChild(sc);

  // زر الرجوع
  document.getElementById("backHomeBtn")?.addEventListener("click", () => {
    window.location.href = "index.html";
  });
  document.getElementById("goLoginBtn")?.addEventListener("click", goLogin);
});
