// Lightweight dependency-free SVG chart helpers.
const Charts = {
  donut(items) {
    // items: [{label, value, color}]
    const total = items.reduce((s, i) => s + i.value, 0);
    if (total <= 0) {
      return '<div class="empty-state"><div>Немає витрат за цей період</div></div>';
    }
    const r = 40, cx = 50, cy = 50, circ = 2 * Math.PI * r;
    let offset = 0;
    let circles = "";
    items.forEach((it) => {
      const frac = it.value / total;
      const len = frac * circ;
      circles += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${it.color}" stroke-width="14"
        stroke-dasharray="${len} ${circ - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})" />`;
      offset += len;
    });
    const svg = `<svg viewBox="0 0 100 100" style="width:180px;height:180px;display:block;margin:0 auto">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="14" />
      ${circles}
      <text x="50" y="47" text-anchor="middle" font-size="11" fill="var(--text-dim)">Всього</text>
      <text x="50" y="60" text-anchor="middle" font-size="13" font-weight="700" fill="var(--text)">${Math.round(total).toLocaleString("uk-UA")}</text>
    </svg>`;

    const legend = items
      .map(
        (it) =>
          `<div class="legend-row"><span class="sw" style="background:${it.color}"></span><span class="lname">${it.label}</span><span class="lval">${Math.round(it.value).toLocaleString("uk-UA")}</span></div>`
      )
      .join("");

    return svg + `<div class="legend">${legend}</div>`;
  },

  bars(items) {
    // items: [{label, value}]
    if (items.every((i) => i.value === 0)) {
      return '<div class="empty-state"><div>Немає даних</div></div>';
    }
    const max = Math.max(...items.map((i) => i.value), 1);
    const vbW = 300;
    const w = vbW / items.length;
    let bars = "";
    items.forEach((it, i) => {
      const h = (it.value / max) * 70;
      const x = i * w + w * 0.22;
      const bw = w * 0.56;
      bars += `<rect x="${x}" y="${82 - h}" width="${bw}" height="${Math.max(h, 1.5)}" rx="2" fill="var(--accent)" />`;
      bars += `<text x="${x + bw / 2}" y="93" text-anchor="middle" font-size="7" fill="var(--text-dim)">${it.label}</text>`;
    });
    return `<svg viewBox="0 0 ${vbW} 100" style="width:100%;height:170px;display:block">${bars}</svg>`;
  },
};
