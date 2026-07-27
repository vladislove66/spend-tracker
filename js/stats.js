const Stats = (() => {
  function catById(id) {
    return App.state.categories.find((c) => c.id === id);
  }

  async function render() {
    const { year, month } = App.state.statsDate;
    document.getElementById("statsMonthLabel").textContent = `${App.MONTHS_UK[month - 1]} ${year}`;

    const txs = await Db.getTransactionsByMonth(year, month);
    const totals = {};
    txs.filter((t) => t.type === "expense").forEach((t) => {
      totals[t.categoryId] = (totals[t.categoryId] || 0) + t.amount;
    });
    const items = Object.entries(totals)
      .map(([id, value]) => {
        const c = catById(id);
        return c ? { label: c.name, value, color: c.color } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.value - a.value);

    document.getElementById("donutChart").innerHTML = Charts.donut(items);

    // trend: last 6 months ending at statsDate month
    const trend = [];
    for (let i = 5; i >= 0; i--) {
      let m = month - i, y = year;
      while (m < 1) { m += 12; y--; }
      const mtxs = await Db.getTransactionsByMonth(y, m);
      const total = mtxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      trend.push({ label: App.MONTHS_UK[m - 1].slice(0, 3), value: total });
    }
    document.getElementById("trendChart").innerHTML = Charts.bars(trend);
  }

  function init() {
    document.getElementById("statsPrevMonth").addEventListener("click", () => {
      const s = App.state.statsDate;
      s.month--; if (s.month < 1) { s.month = 12; s.year--; }
      render();
    });
    document.getElementById("statsNextMonth").addEventListener("click", () => {
      const s = App.state.statsDate;
      s.month++; if (s.month > 12) { s.month = 1; s.year++; }
      render();
    });
  }

  return { init, render };
})();
