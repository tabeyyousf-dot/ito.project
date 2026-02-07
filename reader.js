document.addEventListener("DOMContentLoaded", async () => {
  const pagesWrap = document.getElementById("pdfPages");
  const statusEl = document.getElementById("pdfStatus");
  const curEl = document.getElementById("curPage");
  const totalEl = document.getElementById("totalPages");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  if (!pagesWrap || !statusEl || !curEl || !totalEl || !prevBtn || !nextBtn) return;

  if (!window.pdfjsLib) {
    statusEl.textContent = "PDF.js لم يتم تحميله.";
    return;
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  const pdfSrc = pagesWrap.getAttribute("data-pdf-src") || "ito-free-fixed.pdf";

  let pdfDoc;
  try {
    statusEl.textContent = "جاري تحميل الكتاب…";
    pdfDoc = await pdfjsLib.getDocument(pdfSrc).promise;
  } catch (err) {
    console.error(err);
    statusEl.textContent =
      "لم يتم تحميل الكتاب. تأكد أن ito-free-fixed.pdf موجود بجانب free-book.html وأنك فاتح بـ Live Server.";
    return;
  }

  const totalPages = pdfDoc.numPages;
  totalEl.textContent = String(totalPages);
  statusEl.textContent = "";

  // Create holders
  const holders = [];
  for (let i = 1; i <= totalPages; i++) {
    const holder = document.createElement("div");
    holder.className = "pdf-page";
    holder.dataset.page = String(i);
    holder.dataset.rendered = "0";
    holder.innerHTML = `<div style="padding:14px;text-align:center;color:rgba(241,250,238,.7)">صفحة ${i}…</div>`;
    pagesWrap.appendChild(holder);
    holders.push(holder);
  }

  async function renderPage(pageNum, holder) {
    if (holder.dataset.rendered === "1") return;
    holder.dataset.rendered = "1";

    const page = await pdfDoc.getPage(pageNum);
    const baseViewport = page.getViewport({ scale: 1 });

    const containerWidth = holder.clientWidth - 20;
    const scale = Math.max(1.4, containerWidth / baseViewport.width);

    const dpr = window.devicePixelRatio || 1;

const viewport = page.getViewport({ scale });
const scaledViewport = page.getViewport({ scale: scale * dpr });

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d", { alpha: false });

canvas.width = Math.floor(scaledViewport.width);
canvas.height = Math.floor(scaledViewport.height);

canvas.style.width = Math.floor(viewport.width) + "px";
canvas.style.height = Math.floor(viewport.height) + "px";

ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    holder.innerHTML = "";
    holder.appendChild(canvas);

    await page.render({ canvasContext: ctx, viewport }).promise;
  }

  // Lazy render by intersection
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const holder = entry.target;
      const p = Number(holder.dataset.page);
      renderPage(p, holder).catch(console.error);
    });
  }, { root: null, threshold: 0.12 });

  holders.forEach(h => io.observe(h));

  // Counter update: closest page to viewport center (accurate)
  function updateCurrentByViewport() {
    const mid = window.innerHeight * 0.45;
    let bestPage = 1;
    let bestDist = Infinity;

    for (const h of holders) {
      const rect = h.getBoundingClientRect();
      const dist = Math.abs(rect.top - mid);
      if (dist < bestDist) {
        bestDist = dist;
        bestPage = Number(h.dataset.page);
      }
    }
    curEl.textContent = String(bestPage);
  }

  updateCurrentByViewport();
  window.addEventListener("scroll", updateCurrentByViewport, { passive: true });
  window.addEventListener("resize", updateCurrentByViewport);

  // ===== Arrows: Tap + Press&Hold (SLOWER + SMOOTHER) =====
  const TAP_STEP = 120;      // نزلة النقرة
  const HOLD_START = 18;     // بداية الضغط المطوّل
  const HOLD_MAX = 85;       // أقصى سرعة
  const TICK_MS = 24;        // أبطأ شوية من 16 (أهدى)

  let holdTimer = null;
  let holdSpeed = HOLD_START;
  let holdTicks = 0;
  let suppressClickUntil = 0;

  function stopHold() {
    if (holdTimer) {
      clearInterval(holdTimer);
      holdTimer = null;
    }
    holdSpeed = HOLD_START;
    holdTicks = 0;
    suppressClickUntil = Date.now() + 260; // يمنع قفزة بعد الإفلات
  }

  function startHold(dir) {
    stopHold();

    holdTimer = setInterval(() => {
      holdTicks++;

      // تسريع تدريجي أهدى
      if (holdTicks % 14 === 0 && holdSpeed < HOLD_MAX) {
        holdSpeed += 4;
      }

      window.scrollBy({ top: dir * holdSpeed, behavior: "auto" });
    }, TICK_MS);
  }

  function attach(btn, dir) {
    btn.addEventListener("click", (e) => {
      if (Date.now() < suppressClickUntil) {
        e.preventDefault();
        return;
      }
      window.scrollBy({ top: dir * TAP_STEP, behavior: "smooth" });
    });

    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      startHold(dir);
    });

    btn.addEventListener("pointerup", stopHold);
    btn.addEventListener("pointercancel", stopHold);
    btn.addEventListener("pointerleave", stopHold);
  }

  attach(prevBtn, -1);
  attach(nextBtn, +1);

  // Render first pages quickly
  try {
    await renderPage(1, holders[0]);
    if (holders[1]) await renderPage(2, holders[1]);
  } catch (e) {
    console.error(e);
  }
});
