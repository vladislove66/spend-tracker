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
    row.innerHTML = cats
      .map((c) => {
        const active = c.id === App.state.entry.categoryId;
        return `<button class="cat-chip${active ? " active" : ""}" style="--cc:${c.color}" data-cat="${c.id}">
          <span class="cat-ic">${renderCatIcon(c.icon)}</span><span>${c.name}</span>
        </button>`;
      })
      .join("");
    row.querySelectorAll(".cat-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        App.state.entry.categoryId = btn.dataset.cat;
        renderCategoryRow();
      });
    });
  }

  function renderAmount() {
    const disp = document.getElementById("amountDisplay");
    const val = document.getElementById("amountValue");
    const cur = document.getElementById("amountCur");
    val.textContent = App.state.entry.amount;
    cur.textContent = App.state.currency;
    disp.classList.toggle("expense", App.state.entry.type === "expense");
    disp.classList.toggle("income", App.state.entry.type === "income");
  }

  function renderTypeToggle() {
    document.querySelectorAll("#entryTypeToggle button").forEach((b) => {
      b.classList.toggle("active", b.dataset.type === App.state.entry.type);
      b.classList.toggle("expense", b.dataset.type === "expense");
      b.classList.toggle("income", b.dataset.type === "income");
    });
    const confirmBtn = document.getElementById("confirmBtn");
    confirmBtn.classList.toggle("expense", App.state.entry.type === "expense");
    confirmBtn.classList.toggle("income", App.state.entry.type === "income");
  }

  function renderNoteIndicator() {
    const btn = document.getElementById("noteBtn");
    const hasNote = App.state.entry.note && App.state.entry.note.trim().length > 0;
    const isOther = App.state.entry.date !== App.todayISO();
    let dot = btn.querySelector(".dot");
    if (hasNote || isOther) {
      if (!dot) btn.insertAdjacentHTML("beforeend", '<span class="dot"></span>');
    } else if (dot) {
      dot.remove();
    }
  }

  function render() {
    renderTypeToggle();
    renderCategoryRow();
    renderAmount();
    renderNoteIndicator();
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
    document.getElementById("calLabel").textContent = `${App.MONTHS_UK[month - 1]} ${year}`;
    const first = new Date(year, month - 1, 1);
    const startOffset = (first.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = new Date(year, month, 0).getDate();
    const todayStr = App.todayISO();

    let cells = App.DOW_UK.map((d) => `<div class="dow">${d}</div>`).join("");
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

  function init() {
    document.querySelectorAll("#entryTypeToggle button").forEach((btn) => {
      btn.addEventListener("click", () => {
        App.state.entry.type = btn.dataset.type;
        App.state.entry.categoryId = null;
        render();
      });
    });

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
      if (!amount || amount <= 0) { App.toast("Введіть суму"); return; }
      if (!App.state.entry.categoryId) { App.toast("Оберіть категорію"); return; }
      await Db.addTransaction({
        type: App.state.entry.type,
        amount,
        currency: App.state.currency,
        categoryId: App.state.entry.categoryId,
        date: App.state.entry.date,
        note: App.state.entry.note || "",
      });
      App.toast("Додано");
      App.state.entry.amount = "0";
      App.state.entry.note = "";
      App.state.entry.date = App.todayISO();
      render();
    });
  }

  return { init, render };
})();
