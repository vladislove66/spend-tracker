const Entry = (() => {
  let calView = { year: 0, month: 0 }; // calendar navigation cursor (1-12 month)

  function categoriesForType(type) {
    return App.state.categories.filter((c) => c.type === type);
  }

  function renderCategoryRow() {
    const row = document.getElementById("categoryRow");
    const cats = categoriesForType(App.state.entry.type);
    const stillExists = cats.some((c) => c.id === App.state.entry.categoryId);
    if (!stillExists) App.state.entry.categoryId = cats.length ? cats[0].id : null;
    row.classList.toggle("expense", App.state.entry.type === "expense");
    row.classList.toggle("income", App.state.entry.type === "income");
    row.innerHTML =
      cats
        .map((c) => {
          const active = c.id === App.state.entry.categoryId;
          return `<button class="cat-chip${active ? " active" : ""}" data-cat="${c.id}">
            <span class="cat-ic">${renderCatIcon(c.icon)}</span><span>${App.escapeHtml(c.name)}</span>
          </button>`;
        })
        .join("") +
      `<button class="cat-chip more" data-more="1">
        <span class="cat-ic">${icon("more")}</span><span>More</span>
      </button>`;
    row.querySelectorAll(".cat-chip[data-cat]").forEach((btn) => {
      btn.addEventListener("click", () => {
        App.state.entry.categoryId = btn.dataset.cat;
        renderCategoryRow();
      });
    });
    row.querySelector(".cat-chip.more").addEventListener("click", () => App.showTab("categories"));
  }

  function renderAmount() {
    const disp = document.getElementById("amountDisplay");
    const val = document.getElementById("amountValue");
    const cur = document.getElementById("amountCur");
    val.textContent = App.state.entry.amount;
    cur.textContent = App.state.currency;
    disp.classList.toggle("expense", App.state.entry.type === "expense");
    disp.classList.toggle("income", App.state.entry.type === "income");

    const hasAmount = parseFloat(App.state.entry.amount) > 0;
    document.getElementById("todayTotal").style.display = hasAmount ? "none" : "";
    document.getElementById("confirmBtn").style.display = hasAmount ? "" : "none";
    document.getElementById("noteBtn").style.display = hasAmount ? "" : "none";
  }

  function renderTypeToggle() {
    const type = App.state.entry.type;
    const title = document.getElementById("entryTypeTitle");
    title.textContent = type === "expense" ? "Expense" : "Income";
    title.classList.toggle("expense", type === "expense");
    title.classList.toggle("income", type === "income");
    const confirmBtn = document.getElementById("confirmBtn");
    confirmBtn.classList.toggle("expense", type === "expense");
    confirmBtn.classList.toggle("income", type === "income");
    document.getElementById("todayTotal").classList.toggle("expense", type === "expense");
    document.getElementById("todayTotal").classList.toggle("income", type === "income");
  }

  function renderNoteIndicator() {
    const btn = document.getElementById("noteBtn");
    const hasNote = App.state.entry.note && App.state.entry.note.trim().length > 0;
    const isOther = App.state.entry.date !== App.todayISO();
    btn.classList.toggle("has-note", Boolean(hasNote || isOther));
  }

  async function renderTodayTotal() {
    const txs = await Db.getTransactionsByDateRange(App.todayISO(), App.todayISO());
    const total = txs.filter((t) => t.type === App.state.entry.type).reduce((s, t) => s + t.amount, 0);
    document.getElementById("todayTotal").textContent = `Today: ${App.fmtMoney(total).replace(App.state.currency, "").trim()}`;
  }

  function render() {
    renderTypeToggle();
    renderCategoryRow();
    renderAmount();
    renderNoteIndicator();
    renderTodayTotal();
  }

  function onKey(k) {
    let amt = App.state.entry.amount;
    if (k === "back") {
      amt = amt.length > 1 ? amt.slice(0, -1) : "0";
    } else if (k === ".") {
      if (!amt.includes(".")) amt += ".";
    } else {
      if (amt === "0") amt = k;
      else if (amt.length < 10) amt += k;
    }
    App.state.entry.amount = amt;
    renderAmount();
    const val = document.getElementById("amountValue");
    val.classList.remove("pulse");
    void val.offsetWidth; // restart the animation on repeated same-value presses
    val.classList.add("pulse");
  }

  // ---- Note + date modal ----
  function openNoteModal() {
    document.getElementById("noteText").value = App.state.entry.note;
    const today = App.todayISO();
    const yest = App.isoDate(new Date(Date.now() - 86400000));
    let tab = "calendar";
    if (App.state.entry.date === today) tab = "today";
    else if (App.state.entry.date === yest) tab = "yesterday";
    setDateTab(tab);
    const d = new Date(App.state.entry.date + "T00:00:00");
    calView = { year: d.getFullYear(), month: d.getMonth() + 1 };
    renderCalendar();
    App.openModal("noteModal");
  }

  function setDateTab(tab) {
    document.querySelectorAll(".date-tabs button").forEach((b) => b.classList.toggle("active", b.dataset.datetab === tab));
    document.getElementById("calendarBox").style.display = tab === "calendar" ? "block" : "none";
    if (tab === "today") App.state.entry.date = App.todayISO();
    if (tab === "yesterday") App.state.entry.date = App.isoDate(new Date(Date.now() - 86400000));
  }

  function renderCalendar() {
    const { year, month } = calView;
    document.getElementById("calLabel").textContent = `${App.MONTHS[month - 1]} ${year}`;
    const first = new Date(year, month - 1, 1);
    const startOffset = (first.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = new Date(year, month, 0).getDate();
    const todayStr = App.todayISO();

    let cells = App.DOW.map((d) => `<div class="dow">${d}</div>`).join("");
    for (let i = 0; i < startOffset; i++) cells += `<div class="day muted"></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const cls = ["day"];
      if (iso === todayStr) cls.push("today");
      if (iso === App.state.entry.date) cls.push("selected");
      cells += `<button class="${cls.join(" ")}" data-date="${iso}">${d}</button>`;
    }
    document.getElementById("calendarGrid").innerHTML = cells;
    document.querySelectorAll("#calendarGrid .day[data-date]").forEach((btn) => {
      btn.addEventListener("click", () => {
        App.state.entry.date = btn.dataset.date;
        renderCalendar();
      });
    });
  }

  function toggleType() {
    App.state.entry.type = App.state.entry.type === "expense" ? "income" : "expense";
    App.state.entry.categoryId = null;
    render();
  }

  // Swipe left/right on the header/category area switches Expense <-> Income,
  // mirroring the original app (which has no visible toggle control there).
  function initSwipeType(el) {
    let startX = 0, startY = 0, tracking = false;
    el.addEventListener("pointerdown", (e) => {
      startX = e.clientX; startY = e.clientY; tracking = true;
    });
    el.addEventListener("pointerup", (e) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) toggleType();
    });
    el.addEventListener("pointercancel", () => { tracking = false; });
  }

  function init() {
    document.getElementById("entryTypeTitle").addEventListener("click", toggleType);
    initSwipeType(document.getElementById("entryHeader"));
    initSwipeType(document.getElementById("amountDisplay"));

    document.getElementById("statsShortcutBtn").addEventListener("click", () => App.showTab("stats"));

    document.getElementById("keypad").addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (btn) onKey(btn.dataset.k);
    });

    document.getElementById("noteBtn").addEventListener("click", openNoteModal);
    document.getElementById("noteSaveBtn").addEventListener("click", () => {
      App.state.entry.note = document.getElementById("noteText").value;
      App.closeModal("noteModal");
      renderNoteIndicator();
    });

    document.querySelectorAll(".date-tabs button").forEach((btn) => {
      btn.addEventListener("click", () => setDateTab(btn.dataset.datetab));
    });
    document.getElementById("calPrev").addEventListener("click", () => {
      calView.month--; if (calView.month < 1) { calView.month = 12; calView.year--; }
      renderCalendar();
    });
    document.getElementById("calNext").addEventListener("click", () => {
      calView.month++; if (calView.month > 12) { calView.month = 1; calView.year++; }
      renderCalendar();
    });

    document.getElementById("confirmBtn").addEventListener("click", async () => {
      const amount = parseFloat(App.state.entry.amount);
      if (!amount || amount <= 0) { App.toast("Enter an amount"); return; }
      if (!App.state.entry.categoryId) { App.toast("Choose a category"); return; }
      await Db.addTransaction({
        type: App.state.entry.type,
        amount,
        currency: App.state.currency,
        categoryId: App.state.entry.categoryId,
        date: App.state.entry.date,
        note: App.state.entry.note || "",
      });
      App.toast("Added");
      App.state.entry.amount = "0";
      App.state.entry.note = "";
      App.state.entry.date = App.todayISO();
      render();
    });
  }

  return { init, render };
})();
