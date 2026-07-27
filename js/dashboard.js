const Dashboard = (() => {
  function catById(id) {
    return App.state.categories.find((c) => c.id === id);
  }

  async function render() {
    const { year, month } = App.state.dashboardDate;
    document.getElementById("monthLabel").textContent = `${App.MONTHS_UK[month - 1]} ${year}`;

    const txs = await Db.getTransactionsByMonth(year, month);
    const expenses = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const incomes = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const balance = incomes - expenses;

    const balanceEl = document.getElementById("monthBalance");
    balanceEl.textContent = App.fmtMoney(balance);

    const catTotals = {};
    txs.forEach((t) => {
      if (!catTotals[t.categoryId]) catTotals[t.categoryId] = 0;
      catTotals[t.categoryId] += t.type === "expense" ? t.amount : 0;
    });
    const catCards = Object.entries(catTotals)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([id, v]) => {
        const c = catById(id);
        if (!c) return "";
        return `<div class="cat-card">
          <span class="cat-ic" style="background:${c.color}">${icon(c.icon)}</span>
          <div class="name">${c.name}</div>
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
      dayListEl.innerHTML = '<div class="empty-state">Немає операцій за цей місяць</div>';
    } else {
      dayListEl.innerHTML = days
        .map((iso) => {
          const d = new Date(iso + "T00:00:00");
          const net = byDay[iso].income - byDay[iso].expense;
          const cls = net >= 0 ? "income" : "expense";
          const sign = net >= 0 ? "+" : "";
          return `<div class="day-row">
            <span class="dnum">${d.getDate()}</span>
            <span class="dname">${App.DOW_FULL_UK[(d.getDay() + 6) % 7]}</span>
            <span class="dsum" style="color:var(--${cls})">${sign}${App.fmtMoney(Math.abs(net)).replace(App.state.currency, "").trim()} ${App.state.currency}</span>
          </div>`;
        })
        .join("");
    }
  }

  function init() {
    document.getElementById("prevMonth").addEventListener("click", () => {
      const s = App.state.dashboardDate;
      s.month--; if (s.month < 1) { s.month = 12; s.year--; }
      render();
    });
    document.getElementById("nextMonth").addEventListener("click", () => {
      const s = App.state.dashboardDate;
      s.month++; if (s.month > 12) { s.month = 1; s.year++; }
      render();
    });
  }

  return { init, render };
})();
