const Settings = (() => {
  function fmtDate(iso) {
    if (!iso) return "Ще не робився";
    const d = new Date(iso);
    return d.toLocaleDateString("uk-UA") + " " + d.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function markBackupDone() {
    const now = new Date().toISOString();
    await Db.setSetting("lastBackupDate", now);
    const el = document.getElementById("lastBackupDate");
    if (el) el.textContent = fmtDate(now);
  }

  async function performBackup(silent) {
    const data = await Db.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `vytraty-backup-${stamp}.json`;

    if (silent) {
      // Automatic background backup: no user gesture available, so Web Share
      // is not allowed by the browser. Falls back to the Downloads folder.
      downloadBlob(blob, filename);
      await markBackupDone();
      App.toast("Автоматичний бекап збережено");
      return;
    }

    const file = new File([blob], filename, { type: "application/json" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Бекап витрат" });
        await markBackupDone();
        App.toast("Бекап збережено");
      } catch (err) {
        if (err && err.name === "AbortError") return; // user cancelled the share sheet
        downloadBlob(blob, filename);
        await markBackupDone();
        App.toast("Бекап збережено у Файли");
      }
    } else {
      downloadBlob(blob, filename);
      await markBackupDone();
      App.toast("Бекап збережено у Файли");
    }
  }

  async function render() {
    document.getElementById("currencySelect").value = App.state.currency;
    const startBalance = await Db.getSetting("startBalance", 0);
    document.getElementById("startBalanceInput").value = startBalance;
    const last = await Db.getSetting("lastBackupDate", null);
    document.getElementById("lastBackupDate").textContent = fmtDate(last);
  }

  function init() {
    document.getElementById("currencySelect").addEventListener("change", async (e) => {
      App.state.currency = e.target.value;
      await Db.setSetting("currency", App.state.currency);
      Entry.render();
      App.toast("Валюту змінено");
    });

    document.getElementById("startBalanceInput").addEventListener("change", async (e) => {
      const val = parseFloat(e.target.value) || 0;
      await Db.setSetting("startBalance", val);
      App.toast("Збережено");
    });

    document.getElementById("exportBtn").addEventListener("click", () => performBackup(false));

    document.getElementById("importBtn").addEventListener("click", () => {
      document.getElementById("importFile").click();
    });
    document.getElementById("importFile").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await Db.importAll(data);
        await App.refreshCategories();
        App.toast("Дані імпортовано");
        render();
      } catch (err) {
        App.toast("Не вдалося прочитати файл");
      }
      e.target.value = "";
    });

    document.getElementById("clearDataBtn").addEventListener("click", async () => {
      if (!confirm("Видалити всі дані без можливості відновлення?")) return;
      await Db.clearAll();
      await App.refreshCategories();
      App.toast("Дані очищено");
      render();
    });
  }

  return { init, render, performBackup };
})();
