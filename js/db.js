const DEFAULT_CATEGORIES = [
  { name: "Їжа", icon: "food", color: "#f97316", type: "expense" },
  { name: "Покупки", icon: "cart", color: "#0ea5e9", type: "expense" },
  { name: "Транспорт", icon: "car", color: "#64748b", type: "expense" },
  { name: "Пальне", icon: "fuel", color: "#a16207", type: "expense" },
  { name: "Дозвілля", icon: "drink", color: "#d946ef", type: "expense" },
  { name: "Здоров'я", icon: "health", color: "#ef4444", type: "expense" },
  { name: "Одяг", icon: "clothes", color: "#14b8a6", type: "expense" },
  { name: "Підписки", icon: "subscriptions", color: "#6366f1", type: "expense" },
  { name: "Житло", icon: "home", color: "#84cc16", type: "expense" },
  { name: "Подорожі", icon: "travel", color: "#0891b2", type: "expense" },
  { name: "Інше", icon: "other", color: "#94a3b8", type: "expense" },
  { name: "Дохід", icon: "income", color: "#22c55e", type: "income" },
];

const Db = (() => {
  const DB_NAME = "vytraty-db";
  const DB_VERSION = 1;
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
      for (const c of DEFAULT_CATEGORIES) {
        wstore.put({ id: uuid(), ...c });
      }
    }
  }

  return {
    uuid,

    async init() {
      await open();
      await seedIfEmpty();
    },

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
    async getTransactionsByMonth(year, month) {
      const all = await this.getAllTransactions();
      const prefix = `${year}-${String(month).padStart(2, "0")}`;
      return all.filter((t) => t.date.startsWith(prefix));
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
      return reqToPromise(store.getAll());
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
      for (const name of ["transactions", "categories", "settings"]) {
        const store = await tx(name, "readwrite");
        await reqToPromise(store.clear());
      }
      await seedIfEmpty();
    },
  };
})();
