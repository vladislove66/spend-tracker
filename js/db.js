// Fixed ids (rather than random uuids) so a one-time historical-data import
// file can reference these exact categories without first reading them back
// out of this browser's IndexedDB.
const DEFAULT_CATEGORIES = [
  { id: "cat-groceries", name: "Groceries", icon: "cart", color: "#0ea5e9", type: "expense" },
  { id: "cat-restaurants", name: "Restaurants", icon: "food", color: "#f97316", type: "expense" },
  { id: "cat-food-delivery", name: "Food Delivery", icon: "dinner", color: "#ec4899", type: "expense" },
  { id: "cat-transport", name: "Transport", icon: "car", color: "#64748b", type: "expense" },
  { id: "cat-entertainment", name: "Entertainment", icon: "drink", color: "#d946ef", type: "expense" },
  { id: "cat-subscriptions", name: "Subscriptions", icon: "card", color: "#6366f1", type: "expense" },
  { id: "cat-other", name: "Other", icon: "tools", color: "#94a3b8", type: "expense" },
  { id: "cat-health", name: "Health", icon: "health", color: "#ef4444", type: "expense" },
  { id: "cat-personal-care", name: "Personal Care", icon: "heels", color: "#8b5cf6", type: "expense" },
  { id: "cat-clothes", name: "Clothes", icon: "clothes", color: "#14b8a6", type: "expense" },
  { id: "cat-travel", name: "Travel", icon: "travel", color: "#0891b2", type: "expense" },
  { id: "cat-rent", name: "Rent", icon: "home", color: "#84cc16", type: "expense" },
  { id: "cat-income", name: "Income", icon: "moneybag", color: "#22c55e", type: "income" },
];

const Db = (() => {
  const DB_NAME = "vytraty-db";
  const DB_VERSION = 2;
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("transactions")) {
          const ts = db.createObjectStore("transactions", { keyPath: "id" });
          ts.createIndex("byDate", "date");
          ts.createIndex("byCategory", "categoryId");
          ts.createIndex("byType", "type");
        }
        if (!db.objectStoreNames.contains("categories")) {
          db.createObjectStore("categories", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" });
        }
        // Separate store so a silent internal auto-backup survives
        // "Clear All Data" and other bugs that wipe the stores above.
        if (!db.objectStoreNames.contains("backupSnapshot")) {
          db.createObjectStore("backupSnapshot", { keyPath: "key" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function tx(storeName, mode) {
    return open().then((db) => db.transaction(storeName, mode).objectStore(storeName));
  }

  function reqToPromise(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function uuid() {
    return crypto.randomUUID ? crypto.randomUUID() : "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  async function seedIfEmpty() {
    const store = await tx("categories", "readonly");
    const count = await reqToPromise(store.count());
    if (count === 0) {
      const wstore = await tx("categories", "readwrite");
      DEFAULT_CATEGORIES.forEach((c, i) => wstore.put({ order: i, ...c }));
    }
  }

  // Backfills `order` for categories created before manual reordering
  // existed. Uses each category's current (arbitrary, UUID-sorted) position
  // as its starting order — the user can then drag to rearrange from there.
  async function migrateCategoryOrder() {
    const store = await tx("categories", "readonly");
    const cats = await reqToPromise(store.getAll());
    if (!cats.length || cats.every((c) => typeof c.order === "number")) return;
    const wstore = await tx("categories", "readwrite");
    cats.forEach((c, i) => {
      if (typeof c.order !== "number") wstore.put({ ...c, order: i });
    });
  }

  return {
    uuid,

    async init() {
      await open();
      await seedIfEmpty();
      await migrateCategoryOrder();
    },
    migrateCategoryOrder,

    // Transactions
    async addTransaction(t) {
      const store = await tx("transactions", "readwrite");
      const record = { id: uuid(), createdAt: new Date().toISOString(), ...t };
      await reqToPromise(store.put(record));
      return record;
    },
    async updateTransaction(t) {
      const store = await tx("transactions", "readwrite");
      await reqToPromise(store.put(t));
    },
    async deleteTransaction(id) {
      const store = await tx("transactions", "readwrite");
      await reqToPromise(store.delete(id));
    },
    async getAllTransactions() {
      const store = await tx("transactions", "readonly");
      return reqToPromise(store.getAll());
    },
    async getTransactionsByDateRange(startISO, endISO) {
      const store = await tx("transactions", "readonly");
      return reqToPromise(store.index("byDate").getAll(IDBKeyRange.bound(startISO, endISO)));
    },
    async getTransactionsByMonth(year, month) {
      const prefix = `${year}-${String(month).padStart(2, "0")}`;
      return this.getTransactionsByDateRange(`${prefix}-01`, `${prefix}-31`);
    },

    // Categories
    async addCategory(c) {
      const store = await tx("categories", "readwrite");
      const record = { id: uuid(), ...c };
      await reqToPromise(store.put(record));
      return record;
    },
    async updateCategory(c) {
      const store = await tx("categories", "readwrite");
      await reqToPromise(store.put(c));
    },
    async deleteCategory(id) {
      const store = await tx("categories", "readwrite");
      await reqToPromise(store.delete(id));
    },
    async getCategories() {
      const store = await tx("categories", "readonly");
      const cats = await reqToPromise(store.getAll());
      return cats.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    },
    async reorderCategories(orderedIds) {
      const cats = await this.getCategories();
      const byId = new Map(cats.map((c) => [c.id, c]));
      const wstore = await tx("categories", "readwrite");
      orderedIds.forEach((id, i) => {
        const c = byId.get(id);
        if (c) wstore.put({ ...c, order: i });
      });
    },

    // Settings (key-value)
    async getSetting(key, fallback) {
      const store = await tx("settings", "readonly");
      const res = await reqToPromise(store.get(key));
      return res ? res.value : fallback;
    },
    async setSetting(key, value) {
      const store = await tx("settings", "readwrite");
      await reqToPromise(store.put({ key, value }));
    },

    // Full export/import for backup
    async exportAll() {
      const [transactions, categories] = await Promise.all([this.getAllTransactions(), this.getCategories()]);
      const settingsStore = await tx("settings", "readonly");
      const settings = await reqToPromise(settingsStore.getAll());
      return { version: DB_VERSION, exportedAt: new Date().toISOString(), transactions, categories, settings };
    },
    async importAll(data) {
      const tStore = await tx("transactions", "readwrite");
      for (const t of data.transactions || []) tStore.put(t);
      const cStore = await tx("categories", "readwrite");
      for (const c of data.categories || []) cStore.put(c);
      const sStore = await tx("settings", "readwrite");
      for (const s of data.settings || []) sStore.put(s);
    },
    async clearAll() {
      // backupSnapshot is intentionally excluded: it's the safety net for
      // exactly this kind of wipe (accidental click or future bug).
      for (const name of ["transactions", "categories", "settings"]) {
        const store = await tx(name, "readwrite");
        await reqToPromise(store.clear());
      }
      await seedIfEmpty();
    },

    // Silent internal backup snapshot (separate store, survives clearAll)
    async getBackupSnapshot() {
      const store = await tx("backupSnapshot", "readonly");
      return reqToPromise(store.get("snapshot"));
    },
    async setBackupSnapshot(data) {
      const store = await tx("backupSnapshot", "readwrite");
      await reqToPromise(store.put({ key: "snapshot", data, savedAt: new Date().toISOString() }));
    },
  };
})();
