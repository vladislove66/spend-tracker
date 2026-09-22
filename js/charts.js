// Lightweight dependency-free SVG chart helpers.
function formatCompact(n) {
  if (n >= 1000) return (n / 1000).toLocaleString("uk-UA", { maximumFractionDigits: 1 }) + "k";
  return Math.round(n).toLocaleString("uk-UA");
}

const Charts = {
  donut(items) {
    // items: [{label, value, color}]
    const total = items.reduce((s, i) => s + i.value, 0);
    if (total <= 0) {
      return App.emptyState("wallet", "No expenses in this period");
    }
    const r = 40, cx = 50, cy = 50, circ = 2 * Math.PI * r;
    const gap = items.length > 1 ? 2 : 0; // small visual seam between segments
    let offset = 0;
    let circles = "";
    items.forEach((it) => {
      const frac = it.value / total;
      const len = frac * circ;
      const drawLen = Math.max(len - gap, 0);
      circles += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${it.color}" stroke-width="14" stroke-linecap="round"
        stroke-dasharray="${drawLen} ${circ - drawLen}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})" />`;
      offset += len;
    });
    const svg = `<svg class="donut-svg" viewBox="0 0 100 100" style="width:180px;height:180px;display:block;margin:0 auto">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="14" />
      ${circles}
      <text x="50" y="47" text-anchor="middle" font-size="11" fill="var(--text-dim)">Total</text>
      <text x="50" y="60" text-anchor="middle" font-size="13" font-weight="700" fill="var(--text)">${Math.round(total).toLocaleString("uk-UA")}</text>
    </svg>`;

    const legend = items
      .map((it, i) => {
        const pct = Math.round((it.value / total) * 100);
        return `<div class="legend-row" style="animation-delay:${i * 40}ms"><span class="sw" style="background:${it.color}"></span><span class="lname">${App.escapeHtml(it.label)}</span><span class="lpct">${pct}%</span><span class="lval">${Math.round(it.value).toLocaleString("uk-UA")}</span></div>`;
      })
      .join("");

    return svg + `<div class="legend">${legend}</div>`;
  },

  // items: [{label, value}]; highlightIndex defaults to the last item
  // (stats.js always builds the trend ending at the currently selected month).
  bars(items, highlightIndex = items.length - 1) {
    if (items.every((i) => i.value === 0)) {
      return App.emptyState("navStats", "No data");
    }
    const max = Math.max(...items.map((i) => i.value), 1);
    const vbW = 300, baseY = 82;
    const w = vbW / items.length;
    let bars = `<line x1="0" y1="${baseY}" x2="${vbW}" y2="${baseY}" stroke="var(--border)" stroke-width="1" />`;
    items.forEach((it, i) => {
      const isCurrent = i === highlightIndex;
      const h = (it.value / max) * 58;
      const barH = it.value > 0 ? Math.max(h, 1.5) : 0;
      const x = i * w + w * 0.22;
      const bw = w * 0.56;
      const fill = isCurrent ? "var(--accent)" : "color-mix(in srgb, var(--accent) 32%, var(--surface-2))";
      bars += `<rect class="trend-bar" x="${x}" y="${baseY - barH}" width="${bw}" height="${barH}" rx="2" fill="${fill}" style="animation-delay:${i * 45}ms" />`;
      if (it.value > 0) {
        bars += `<text x="${x + bw / 2}" y="${Math.max(baseY - barH - 5, 9)}" text-anchor="middle" font-size="7.5" font-weight="700" fill="var(--text-dim)">${formatCompact(it.value)}</text>`;
      }
      bars += `<text x="${x + bw / 2}" y="${baseY + 10}" text-anchor="middle" font-size="7" font-weight="${isCurrent ? 700 : 400}" fill="${isCurrent ? "var(--accent)" : "var(--text-dim)"}">${it.label}</text>`;
    });
    return `<svg viewBox="0 0 ${vbW} 100" style="width:100%;height:170px;display:block">${bars}</svg>`;
  },
};
