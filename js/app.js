const App = (() => {
  const MONTHS_UK = ["Січень","Лютий","Березень","Квітень","Травень","Червень","Липень","Серпень","Вересень","Жовтень","Листопад","Грудень"];
  const DOW_UK = ["Пн","Вт","Ср","Чт","Пт","Сб","Нд"];
  const DOW_FULL_UK = ["Понеділок","Вівторок","Середа","Четвер","П'ятниця","Субота","Неділя"];

  const state = {
    categories: [],
    currency: "UAH",
    entry: { type: "expense", amount: "0", categoryId: null, date: todayISO(), note: "" },
    dashboardDate: currentYM(),
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
    const last = await Db.getSetting("lastBackupDate", null);
    const now = Date.now();
    const days = last ? (now - new Date(last).getTime()) / 86400000 : Infinity;
    if (days >= 5) {
      try {
        await Settings.performBackup(true);
      } catch (e) { /* silent: backup is best-effort */ }
    }
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

  return { state, MONTHS_UK, DOW_UK, DOW_FULL_UK, todayISO, isoDate, fmtMoney, toast, openModal, closeModal, showTab, applyStaticIcons, refreshCategories };
})();
