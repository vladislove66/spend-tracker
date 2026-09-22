const Settings = (() => {
  const AUTO_SNAPSHOT_INTERVAL_DAYS = 5;
  const EXPORT_REMINDER_INTERVAL_DAYS = 30;

  function fmtDate(iso) {
    if (!iso) return "Never done yet";
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB") + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }

  function daysSince(iso) {
    return iso ? (Date.now() - new Date(iso).getTime()) / 86400000 : Infinity;
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

  async function markExportDone() {
    const now = new Date().toISOString();
    await Db.setSetting("lastRealExportAt", now);
    const el = document.getElementById("lastBackupDate");
    if (el) el.textContent = fmtDate(now);
  }

  // Manual, user-initiated: writes a real file to Files/iCloud (via share
  // sheet or download). This is the only path that shows any OS UI.
  async function performBackup() {
    const data = await Db.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `vytraty-backup-${stamp}.json`;

    const file = new File([blob], filename, { type: "application/json" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Expense backup" });
        await markExportDone();
        App.toast("Backup saved");
      } catch (err) {
        if (err && err.name === "AbortError") return; // user cancelled the share sheet
        downloadBlob(blob, filename);
        await markExportDone();
        App.toast("Backup saved to Files");
      }
    } else {
      downloadBlob(blob, filename);
      await markExportDone();
      App.toast("Backup saved to Files");
    }
  }

  // Automatic, on app-open: writes a snapshot into the app's own storage.
  // No file system / share sheet involved, so no OS dialog ever appears.
  async function maybeAutoBackup() {
    const last = await Db.getSetting("lastAutoBackupAt", null);
    if (daysSince(last) < AUTO_SNAPSHOT_INTERVAL_DAYS) return;
    const data = await Db.exportAll();
    await Db.setBackupSnapshot(data);
    await Db.setSetting("lastAutoBackupAt", new Date().toISOString());
  }

  // Automatic, on app-open: a non-blocking toast (no dialog) nudging the
  // user toward a real off-device export if it's been a long while.
  async function maybeRemindExport() {
    const last = await Db.getSetting("lastRealExportAt", null);
    if (daysSince(last) < EXPORT_REMINDER_INTERVAL_DAYS) return;
    App.toast("It has been a while since your last backup — consider making one in Settings");
  }

  async function restoreFromAutoBackup() {
    const snap = await Db.getBackupSnapshot();
    if (!snap) { App.toast("No auto-backup yet"); return; }
    if (!confirm(`Restore data from the internal snapshot dated ${fmtDate(snap.savedAt)}? Current data will be replaced.`)) return;
    await Db.importAll(snap.data);
    await App.refreshCategories();
    App.toast("Data restored");
    render();
  }

  async function render() {
    document.getElementById("currencySelect").value = App.state.currency;
    const startBalance = await Db.getSetting("startBalance", 0);
    document.getElementById("startBalanceInput").value = startBalance;
    const last = await Db.getSetting("lastRealExportAt", null);
    document.getElementById("lastBackupDate").textContent = fmtDate(last);
    const snap = await Db.getBackupSnapshot();
    document.getElementById("autoBackupDate").textContent = snap ? fmtDate(snap.savedAt) : "Not yet";
  }

  function init() {
    document.getElementById("currencySelect").addEventListener("change", async (e) => {
      App.state.currency = e.target.value;
      await Db.setSetting("currency", App.state.currency);
      Entry.render();
      App.toast("Currency changed");
    });

    document.getElementById("startBalanceInput").addEventListener("change", async (e) => {
      const val = parseFloat(e.target.value) || 0;
      await Db.setSetting("startBalance", val);
      App.toast("Saved");
    });

    document.getElementById("exportBtn").addEventListener("click", () => performBackup());
    document.getElementById("restoreAutoBackupBtn").addEventListener("click", () => restoreFromAutoBackup());

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
        await Db.migrateCategoryOrder();
        await App.refreshCategories();
        App.toast("Data imported");
        render();
      } catch (err) {
        App.toast("Could not read the file");
      }
      e.target.value = "";
    });

    document.getElementById("clearDataBtn").addEventListener("click", async () => {
      if (!confirm("Delete all data with no way to recover it?")) return;
      await Db.clearAll();
      await App.refreshCategories();
      App.toast("Data cleared");
      render();
    });
  }

  return { init, render, performBackup, maybeAutoBackup, maybeRemindExport };
})();
