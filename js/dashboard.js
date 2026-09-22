const Dashboard = (() => {
  function renderDayDetail(dayTxs, selected) {
    const label = document.getElementById("dayDetailLabel");
    const listEl = document.getElementById("dayDetailList");

    if (!selected) {
      label.textContent = "Операції";
      listEl.innerHTML = App.emptyState("calendar", "Немає операцій цього місяця");
      return;
    }

    const d = new Date(selected + "T00:00:00");
    label.textContent =
      selected === App.todayISO()
        ? "Сьогодні"
        : `${d.getDate()} ${App.MONTHS_UK[d.getMonth()].toLowerCase()}, ${App.DOW_FULL_UK[(d.getDay() + 6) % 7].toLowerCase()}`;

    if (!dayTxs.length) {
      listEl.innerHTML = App.emptyState("calendar", "Немає операцій за цей день");
      return;
    }

    listEl.innerHTML = dayTxs
      .slice()
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
      .map((t) => {
        const c = App.catById(t.categoryId);
        const sign = t.type === "income" ? "+" : "-";
        const amt = `${sign}${App.fmtMoney(t.amount).replace(App.state.currency, "").trim()} ${App.state.currency}`;
        return `<div class="swipe-row" data-id="${t.id}">
          <button class="swipe-delete">${icon("trash")}</button>
          <div class="swipe-content">
            <span class="row-ic" style="background:${c ? c.color : "#94a3b8"}">${c ? renderCatIcon(c.icon) : icon("other")}</span>
            <span style="flex:1;min-width:0">
              <div class="row-title">${App.escapeHtml(c ? c.name : "Без категорії")}</div>
              ${t.note ? `<div class="row-sub">${App.escapeHtml(t.note)}</div>` : ""}
            </span>
            <span class="row-value" style="color:var(--${t.type}-text);font-weight:700">${amt}</span>
          </div>
        </div>`;
      })
      .join("");
  }

  // Swipe-left-to-delete via Pointer Events (touch + mouse). A horizontal
  // drag past a threshold reveals the delete button behind the row; the
  // vertical-vs-horizontal check in the first few px lets page scroll win
  // when the gesture is mostly vertical.
  function initSwipeToDelete(container, onDelete) {
    const REVEAL = 76;
    let row = null, content = null, startX = 0, startY = 0, baseX = 0, dx = 0, dragging = false;
    let openRow = null, suppressNextClick = false, suppressTimer = null;

    function close(except) {
      if (openRow && openRow !== except) {
        openRow.querySelector(".swipe-content").style.transform = "";
        openRow.classList.remove("swiped");
        openRow = null;
      }
    }

    container.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".swipe-delete")) return;
      const swipeRow = e.target.closest(".swipe-row");
      if (!swipeRow) return;
      close(swipeRow);
      row = swipeRow;
      content = row.querySelector(".swipe-content");
      baseX = row.classList.contains("swiped") ? -REVEAL : 0;
      startX = e.clientX;
      startY = e.clientY;
      dx = baseX;
      dragging = false;
      content.style.transition = "none";
    });

    container.addEventListener("pointermove", (e) => {
      if (!row) return;
      const rawDx = e.clientX - startX;
      const rawDy = e.clientY - startY;
      if (!dragging) {
        if (Math.abs(rawDy) > Math.abs(rawDx)) { row = null; return; } // vertical scroll wins
        if (Math.abs(rawDx) < 6) return; // not enough movement to decide yet
        dragging = true;
        row.setPointerCapture(e.pointerId);
      }
      dx = Math.max(-REVEAL - 14, Math.min(0, baseX + rawDx));
      content.style.transform = `translateX(${dx}px)`;
    });

    function finish() {
      if (!row) return;
      if (dragging) {
        suppressNextClick = true;
        // Safety net: not every browser fires a click after a captured drag,
        // so don't rely solely on the click listener below to clear this —
        // otherwise a swipe with no following click leaves it stuck true.
        clearTimeout(suppressTimer);
        suppressTimer = setTimeout(() => { suppressNextClick = false; }, 250);
        content.style.transition = "";
        const shouldOpen = dx < -REVEAL / 2;
        content.style.transform = shouldOpen ? `translateX(-${REVEAL}px)` : "";
        row.classList.toggle("swiped", shouldOpen);
        openRow = shouldOpen ? row : null;
      }
      row = null;
      dragging = false;
    }

    container.addEventListener("pointerup", finish);
    container.addEventListener("pointercancel", finish);

    container.addEventListener("click", async (e) => {
      const delBtn = e.target.closest(".swipe-delete");
      if (delBtn) {
        const swipeRow = delBtn.closest(".swipe-row");
        await onDelete(swipeRow.dataset.id);
        return;
      }
      if (suppressNextClick) { suppressNextClick = false; return; }
      if (openRow) close(null);
    });
  }

  async function deleteTransaction(id) {
    await Db.deleteTransaction(id);
    App.toast("Видалено");
    render();
  }

  async function render() {
    const { year, month } = App.state.dashboardDate;
    document.getElementById("monthLabel").textContent = `${App.MONTHS_UK[month - 1]} ${year}`;

    const txs = await Db.getTransactionsByMonth(year, month);
    const expenses = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const incomes = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const balance = incomes - expenses;

    document.getElementById("monthBalance").textContent = App.fmtMoney(balance);

    const allTxs = await Db.getAllTransactions();
    const startBalance = await Db.getSetting("startBalance", 0);
    const totalBalance =
      startBalance + allTxs.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0);
    document.getElementById("totalBalance").textContent = App.fmtMoney(totalBalance);

    const catTotals = {};
    txs.forEach((t) => {
      if (!catTotals[t.categoryId]) catTotals[t.categoryId] = 0;
      catTotals[t.categoryId] += t.type === "expense" ? t.amount : 0;
    });
    const catCards = Object.entries(catTotals)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([id, v]) => {
        const c = App.catById(id);
        if (!c) return "";
        return `<div class="cat-card">
          <div class="name">${App.escapeHtml(c.name)}</div>
          <span class="cat-ic">${renderCatIcon(c.icon)}</span>
          <div class="amt">${App.fmtMoney(v)}</div>
        </div>`;
      })
      .join("");

    document.getElementById("dashCards").innerHTML = `
      <div class="stat-card expenses"><div class="t">Витрати</div><div class="v">${App.fmtMoney(expenses)}</div></div>
      <div class="stat-card incomes"><div class="t">Доходи</div><div class="v">${App.fmtMoney(incomes)}</div></div>
      ${catCards}
    `;

    const byDay = {};
    txs.forEach((t) => {
      if (!byDay[t.date]) byDay[t.date] = { expense: 0, income: 0 };
      byDay[t.date][t.type] += t.amount;
    });
    const days = Object.keys(byDay).sort((a, b) => (a < b ? 1 : -1));
    const dayListEl = document.getElementById("dayList");
    if (!days.length) {
      dayListEl.innerHTML = App.emptyState("calendar", "Немає операцій за цей місяць");
    } else {
      dayListEl.innerHTML = days
        .map((iso) => {
          const d = new Date(iso + "T00:00:00");
          const net = byDay[iso].income - byDay[iso].expense;
          const cls = net >= 0 ? "income" : "expense";
          const sign = net >= 0 ? "+" : "";
          const selectedCls = iso === App.state.dashboardSelectedDay ? " selected" : "";
          return `<button class="day-row${selectedCls}" data-date="${iso}">
            <span class="dnum">${d.getDate()}</span>
            <span class="dname">${App.DOW_FULL_UK[(d.getDay() + 6) % 7]}</span>
            <span class="dsum" style="color:var(--${cls}-text)">${sign}${App.fmtMoney(Math.abs(net)).replace(App.state.currency, "").trim()} ${App.state.currency}</span>
          </button>`;
        })
        .join("");
      dayListEl.querySelectorAll(".day-row").forEach((row) => {
        row.addEventListener("click", () => {
          App.state.dashboardSelectedDay = row.dataset.date;
          render();
        });
      });
    }

    // Default to today while viewing the current month; otherwise fall back
    // to the most recent day with activity in the displayed month.
    const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
    const isRealCurrentMonth = monthPrefix === App.todayISO().slice(0, 7);
    let selected = App.state.dashboardSelectedDay;
    if (!selected || !selected.startsWith(monthPrefix)) {
      selected = isRealCurrentMonth ? App.todayISO() : days[0] || null;
      App.state.dashboardSelectedDay = selected;
    }
    renderDayDetail(txs.filter((t) => t.date === selected), selected);
  }

  // Swipe left/right between the "Monthly Balance" and "Total Balance"
  // hero pages via drag, snapping to whichever page is closer.
  function initHeroSwipe() {
    const swipe = document.getElementById("dashHeroSwipe");
    const dots = document.querySelectorAll("#heroDots span");
    let page = 0;
    let startX = 0, dx = 0, dragging = false, width = 0;

    function setPage(p, animate) {
      page = Math.max(0, Math.min(1, p));
      swipe.classList.toggle("dragging", !animate);
      swipe.style.transition = animate ? "transform .25s ease" : "none";
      swipe.style.transform = `translateX(${-page * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle("active", i === page));
    }

    swipe.addEventListener("pointerdown", (e) => {
      width = swipe.getBoundingClientRect().width;
      startX = e.clientX;
      dx = 0;
      dragging = true;
      swipe.setPointerCapture(e.pointerId);
      swipe.style.transition = "none";
    });
    swipe.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      dx = e.clientX - startX;
      const pct = (-page * 100) + (dx / width) * 100;
      swipe.style.transform = `translateX(${pct}%)`;
    });
    function finish() {
      if (!dragging) return;
      dragging = false;
      if (Math.abs(dx) > width * 0.2) setPage(page + (dx < 0 ? 1 : -1), true);
      else setPage(page, true);
    }
    swipe.addEventListener("pointerup", finish);
    swipe.addEventListener("pointercancel", finish);
    setPage(0, true);
  }

  async function renderMonthOverlay() {
    const listEl = document.getElementById("monthOverlayList");
    const txs = await Db.getAllTransactions();
    const { year: curY, month: curM } = App.state.dashboardDate;
    const byMonth = {};
    txs.forEach((t) => {
      const key = t.date.slice(0, 7);
      if (!byMonth[key]) byMonth[key] = { expense: 0, income: 0 };
      byMonth[key][t.type] += t.amount;
    });
    const curKey = `${curY}-${String(curM).padStart(2, "0")}`;
    if (!byMonth[curKey]) byMonth[curKey] = { expense: 0, income: 0 };
    const keys = Object.keys(byMonth).sort((a, b) => (a < b ? 1 : -1));
    listEl.innerHTML = keys
      .map((key) => {
        const [y, m] = key.split("-").map(Number);
        const cls = key === curKey ? " current" : "";
        return `<button class="month-overlay-row${cls}" data-year="${y}" data-month="${m}">
          <span class="m-name">${App.MONTHS_UK[m - 1].toUpperCase()} ${y}</span>
          <span class="m-exp">${App.fmtMoney(byMonth[key].expense).replace(App.state.currency, "").trim()}</span>
          <span class="m-inc">${App.fmtMoney(byMonth[key].income).replace(App.state.currency, "").trim()}</span>
        </button>`;
      })
      .join("");
    listEl.querySelectorAll(".month-overlay-row").forEach((row) => {
      row.addEventListener("click", () => {
        App.state.dashboardDate = { year: Number(row.dataset.year), month: Number(row.dataset.month) };
        App.state.dashboardSelectedDay = null;
        closeMonthOverlay();
        render();
      });
    });
  }

  function openMonthOverlay() {
    renderMonthOverlay();
    document.getElementById("monthOverlay").classList.add("open");
  }
  function closeMonthOverlay() {
    document.getElementById("monthOverlay").classList.remove("open");
  }

  function init() {
    initHeroSwipe();
    document.getElementById("dashGridBtn").addEventListener("click", () => App.showTab("entry"));
    document.getElementById("dashSettingsBtn").addEventListener("click", () => App.showTab("settings"));
    document.getElementById("monthPickerBtn").addEventListener("click", openMonthOverlay);
    document.getElementById("monthOverlayBackdrop").addEventListener("click", closeMonthOverlay);
    initSwipeToDelete(document.getElementById("dayDetailList"), deleteTransaction);
  }

  return { init, render };
})();
