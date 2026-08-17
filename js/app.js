const App = (() => {
  const MONTHS_UK = ["Січень","Лютий","Березень","Квітень","Травень","Червень","Липень","Серпень","Вересень","Жовтень","Листопад","Грудень"];
  const DOW_UK = ["Пн","Вт","Ср","Чт","Пт","Сб","Нд"];
  const DOW_FULL_UK = ["Понеділок","Вівторок","Середа","Четвер","П'ятниця","Субота","Неділя"];

  const state = {
    categories: [],
    currency: "UAH",
    entry: { type: "expense", amount: "0", categoryId: null, date: todayISO(), note: "" },
    dashboardDate: currentYM(),
    dashboardSelectedDay: todayISO(),
    statsDate: currentYM(),
  };

  function currentYM() {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }
  function todayISO() {
    return isoDate(new Date());
  }
  function isoDate(d) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  function fmtMoney(n) {
    const val = Math.round(n).toLocaleString("uk-UA");
    return `${val} ${state.currency}`;
  }

  const ESCAPE_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]);
  }

  function catById(id) {
    return state.categories.find((c) => c.id === id);
  }

  function emptyState(iconName, text) {
    return `<div class="empty-state">${icon(iconName)}<div>${escapeHtml(text)}</div></div>`;
  }

  function bindMonthNav(prevId, nextId, dateKey, renderFn) {
    document.getElementById(prevId).addEventListener("click", () => {
      const s = state[dateKey];
      s.month--; if (s.month < 1) { s.month = 12; s.year--; }
      renderFn();
    });
    document.getElementById(nextId).addEventListener("click", () => {
      const s = state[dateKey];
      s.month++; if (s.month > 12) { s.month = 1; s.year++; }
      renderFn();
    });
  }

  let toastTimer = null;
  function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
  }

  function openModal(id) { document.getElementById(id).classList.add("open"); }
  function closeModal(id) { document.getElementById(id).classList.remove("open"); }

  function showTab(name) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    document.getElementById(`screen-${name}`).classList.add("active");
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
    if (name === "entry") Entry.render();
    if (name === "dashboard") Dashboard.render();
    if (name === "categories") Categories.render();
    if (name === "stats") Stats.render();
    if (name === "settings") Settings.render();
  }

  function applyStaticIcons(root = document) {
    root.querySelectorAll("[data-icon]").forEach((el) => {
      el.innerHTML = icon(el.dataset.icon);
    });
  }

  async function refreshCategories() {
    state.categories = await Db.getCategories();
  }

  async function checkAutoBackup() {
    try {
      await Settings.maybeAutoBackup();
    } catch (e) { /* silent: internal snapshot is best-effort */ }
    try {
      await Settings.maybeRemindExport();
    } catch (e) { /* silent */ }
  }

  async function init() {
    applyStaticIcons();
    await Db.init();
    state.currency = await Db.getSetting("currency", "UAH");
    await refreshCategories();

    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => showTab(btn.dataset.tab));
    });

    document.querySelectorAll("[data-close-modal]").forEach((btn) => {
      btn.addEventListener("click", () => closeModal(btn.dataset.closeModal));
    });
    document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) backdrop.classList.remove("open");
      });
    });

    Entry.init();
    Categories.init();
    Settings.init();
    Dashboard.init();
    Stats.init();

    Entry.render();

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }

    checkAutoBackup();
  }

  document.addEventListener("DOMContentLoaded", init);

  return { state, MONTHS_UK, DOW_UK, DOW_FULL_UK, todayISO, isoDate, fmtMoney, escapeHtml, catById, bindMonthNav, emptyState, toast, openModal, closeModal, showTab, applyStaticIcons, refreshCategories };
})();
