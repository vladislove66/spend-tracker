const Stats = (() => {
  async function render() {
    const { year, month } = App.state.statsDate;
    document.getElementById("statsMonthLabel").textContent = `${App.MONTHS_UK[month - 1]} ${year}`;

    // Fetch the whole 6-month trend window in a single indexed range query
    // instead of re-scanning the transactions store once per month.
    let startY = year, startM = month - 5;
    while (startM < 1) { startM += 12; startY--; }
    const startISO = `${startY}-${String(startM).padStart(2, "0")}-01`;
    const endISO = `${year}-${String(month).padStart(2, "0")}-31`;
    const rangeTxs = await Db.getTransactionsByDateRange(startISO, endISO);

    const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
    const totals = {};
    rangeTxs
      .filter((t) => t.type === "expense" && t.date.startsWith(monthPrefix))
      .forEach((t) => {
        totals[t.categoryId] = (totals[t.categoryId] || 0) + t.amount;
      });
    const items = Object.entries(totals)
      .map(([id, value]) => {
        const c = App.catById(id);
        return c ? { label: c.name, value, color: c.color } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.value - a.value);

    document.getElementById("donutChart").innerHTML = Charts.donut(items);

    const trend = [];
    for (let i = 5; i >= 0; i--) {
      let m = month - i, y = year;
      while (m < 1) { m += 12; y--; }
      const prefix = `${y}-${String(m).padStart(2, "0")}`;
      const total = rangeTxs
        .filter((t) => t.type === "expense" && t.date.startsWith(prefix))
        .reduce((s, t) => s + t.amount, 0);
      trend.push({ label: App.MONTHS_UK[m - 1].slice(0, 3), value: total });
    }
    document.getElementById("trendChart").innerHTML = Charts.bars(trend);
  }

  function init() {
    App.bindMonthNav("statsPrevMonth", "statsNextMonth", "statsDate", render);
  }

  return { init, render };
})();
