// Minimalist line-style SVG icon set (stroke-based, 24x24 viewBox). No emoji anywhere.
const ICONS = {
  food: '<path d="M6 2v7a2 2 0 0 0 4 0V2M8 2v20M8 13a2 2 0 0 0 2-2M17 2c-2 2-2 5-2 7s1 3 2 3v10"/>',
  cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h2l2.6 12.4a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L21 7H6"/>',
  car: '<path d="M4 16V9.5L6 5h12l2 4.5V16"/><path d="M4 16h16v3a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H7v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3z"/><circle cx="7.5" cy="13" r="1.3"/><circle cx="16.5" cy="13" r="1.3"/>',
  fuel: '<path d="M4 21V6a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v15M4 10h8M2 21h12"/><path d="M14 8l3 2v6a1.5 1.5 0 0 0 3 0v-4.5L18 9"/>',
  drink: '<path d="M6 3h12l-1.5 8a4.5 4.5 0 0 1-9 0z"/><path d="M12 15v6M8 21h8"/>',
  health: '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V6a4 4 0 0 1 8 0v2M12 12v4M10 14h4"/>',
  clothes: '<path d="M8 4 4 7v3h3v10h10V10h3V7l-4-3-3 2h-2z"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  subscriptions: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
  travel: '<path d="M10.5 21 12 16l-7 2-1-1 5-4-6-3 1-2 8 1.5L17 3a1.4 1.4 0 0 1 2 2l-6.5 6.5L14 20z"/>',
  home: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9"/>',
  gift: '<rect x="3" y="9" width="18" height="12" rx="1"/><path d="M3 13h18M12 9v12"/><path d="M12 9C9 9 8 6.5 9.5 5S12 6 12 9zM12 9c3 0 4-2.5 2.5-4S12 6 12 9z"/>',
  book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>',
  paw: '<circle cx="7" cy="9" r="1.6"/><circle cx="12" cy="6.5" r="1.6"/><circle cx="17" cy="9" r="1.6"/><path d="M12 12c-3 0-5.5 2-5.5 4.5S8 21 12 21s5.5-2 5.5-4.5S15 12 12 12z"/>',
  income: '<path d="M3 17 9 11l4 4 8-8"/><path d="M15 6h6v6"/>',
  sport: '<path d="M6.5 6.5 2 11l3 3M17.5 6.5 22 11l-3 3M8 8l8 8M6 18l2-2M18 6l-2 2"/>',
  beauty: '<circle cx="12" cy="7" r="4"/><path d="M12 11v10M9 17h6"/>',
  kids: '<circle cx="12" cy="6" r="3"/><path d="M7 21v-4a5 5 0 0 1 10 0v4"/>',
  tech: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/>',
  wallet: '<path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M16 12h3v3h-3a1.5 1.5 0 0 1 0-3z"/>',
  other: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',

  // nav
  navEntry: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  navDashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  navCategories: '<path d="M4 4h7v7H4zM13 4l7 7-7 7-7-7z" transform="translate(0 0)"/>',
  navStats: '<path d="M4 20V10M11 20V4M18 20v-7"/>',
  navSettings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1z"/>',

  // ui
  chevronLeft: '<path d="M15 5 8 12l7 7"/>',
  chevronRight: '<path d="M9 5l7 7-7 7"/>',
  chevronDown: '<path d="M5 8l7 7 7-7"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="M4 12l6 6L20 6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  note: '<path d="M4 4h13l3 3v13H4z"/><path d="M14 4v4h4M8 13h8M8 17h5"/>',
  trash: '<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/>',
  download: '<path d="M12 3v13M7 11l5 5 5-5M4 21h16"/>',
  upload: '<path d="M12 21V8M7 12l5-5 5 5M4 3h16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17z"/><path d="M13.5 6.5l4 4"/>',
};

function icon(name, cls) {
  const inner = ICONS[name] || ICONS.other;
  return `<svg class="icon${cls ? " " + cls : ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

// Category icon field may hold either an SVG icon key or a literal emoji
// typed via the iOS emoji keyboard. This renders whichever it is.
function renderCatIcon(value) {
  if (ICONS[value]) return icon(value);
  return `<span class="emoji-ic">${value || "?"}</span>`;
}
