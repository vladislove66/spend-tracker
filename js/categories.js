const Categories = (() => {
  const ICON_CHOICES = ["food","cart","car","fuel","drink","health","clothes","phone","subscriptions","travel","home","gift","book","paw","income","sport","beauty","kids","tech","wallet","other"];
  const COLOR_CHOICES = ["#f97316","#0ea5e9","#64748b","#a16207","#d946ef","#ef4444","#14b8a6","#6366f1","#84cc16","#0891b2","#94a3b8","#22c55e","#eab308","#ec4899","#8b5cf6"];

  let editing = { id: null, type: "expense", icon: "other", emoji: "", color: COLOR_CHOICES[0] };

  async function render() {
    const cats = await Db.getCategories();
    App.state.categories = cats;
    const list = document.getElementById("categoriesList");
    if (!cats.length) {
      list.innerHTML = App.emptyState("wallet", "Немає категорій");
      return;
    }
    list.innerHTML = cats
      .map(
        (c) => `<button class="list-row" data-id="${c.id}">
          <span class="row-ic" style="background:${c.color}">${renderCatIcon(c.icon)}</span>
          <span style="flex:1">
            <div class="row-title">${App.escapeHtml(c.name)}</div>
            <div class="row-sub">${c.type === "income" ? "Дохід" : "Витрата"}</div>
          </span>
          <span class="drag-handle">${icon("drag")}</span>
        </button>`
      )
      .join("");
    list.querySelectorAll(".list-row").forEach((row) => {
      row.addEventListener("click", () => openEditor(cats.find((c) => c.id === row.dataset.id)));
    });
  }

  // Drag-to-reorder via a dedicated handle (keeps tapping the rest of the
  // row free to open the editor, and setPointerCapture works for touch+mouse).
  function initReorder() {
    const list = document.getElementById("categoriesList");
    let dragRow = null, originalOrder = [], order = [], dragIndex = 0, startY = 0, rowH = 0;
    let suppressClick = false, suppressTimer = null;

    function rows() {
      return Array.from(list.querySelectorAll(".list-row"));
    }

    list.addEventListener("pointerdown", (e) => {
      const handle = e.target.closest(".drag-handle");
      if (!handle) return;
      const row = handle.closest(".list-row");
      if (!row) return;
      e.preventDefault();
      const all = rows();
      originalOrder = all.map((r) => r.dataset.id);
      order = originalOrder.slice();
      dragRow = row;
      dragIndex = order.indexOf(row.dataset.id);
      startY = e.clientY;
      rowH = row.offsetHeight;
      dragRow.style.transition = "none";
      dragRow.setPointerCapture(e.pointerId);
      dragRow.classList.add("dragging");
      list.classList.add("reordering");
    });

    list.addEventListener("pointermove", (e) => {
      if (!dragRow) return;
      const dy = e.clientY - startY;
      if (Math.abs(dy) > 4) suppressClick = true;
      dragRow.style.transform = `translateY(${dy}px)`;

      const slotShift = Math.round(dy / rowH);
      const targetIndex = Math.max(0, Math.min(originalOrder.length - 1, dragIndex + slotShift));
      const currentPos = order.indexOf(dragRow.dataset.id);
      if (targetIndex !== currentPos) {
        order.splice(currentPos, 1);
        order.splice(targetIndex, 0, dragRow.dataset.id);
      }

      rows().forEach((row) => {
        if (row === dragRow) return;
        const id = row.dataset.id;
        const offset = (order.indexOf(id) - originalOrder.indexOf(id)) * rowH;
        row.style.transform = offset ? `translateY(${offset}px)` : "";
      });
    });

    async function finishDrag(e) {
      if (!dragRow) return;
      dragRow.releasePointerCapture(e.pointerId);
      dragRow.classList.remove("dragging");
      dragRow.style.transition = "";
      dragRow.style.transform = "";
      list.classList.remove("reordering");
      rows().forEach((row) => { row.style.transform = ""; });
      const changed = order.some((id, i) => id !== originalOrder[i]);
      const finalOrder = order;
      dragRow = null;
      if (suppressClick) {
        // A real drag happened. If the browser fires a synthetic click right
        // after pointerup despite the movement, the capture-phase listener
        // below consumes exactly that one click. Some browsers never fire it
        // at all though, which would otherwise leave suppressClick stuck
        // true forever and silently swallow every future tap on the list —
        // so always clear it shortly after, whether or not a click arrives.
        clearTimeout(suppressTimer);
        suppressTimer = setTimeout(() => { suppressClick = false; }, 250);
      }
      if (changed) {
        await Db.reorderCategories(finalOrder);
        await App.refreshCategories();
        render();
      }
    }

    list.addEventListener("pointerup", finishDrag);
    list.addEventListener("pointercancel", finishDrag);

    // Suppress the row's own click (which opens the editor) after a real drag.
    list.addEventListener(
      "click",
      (e) => {
        if (suppressClick) {
          e.stopPropagation();
          e.preventDefault();
          suppressClick = false;
        }
      },
      true
    );
  }

  function renderIconGrid() {
    document.getElementById("categoryIconGrid").innerHTML = ICON_CHOICES.map(
      (i) => `<button data-icon-choice="${i}" class="${i === editing.icon ? "selected" : ""}">${icon(i)}</button>`
    ).join("");
    document.querySelectorAll("#categoryIconGrid button").forEach((btn) => {
      btn.addEventListener("click", () => {
        editing.icon = btn.dataset.iconChoice;
        editing.emoji = "";
        document.getElementById("categoryEmojiInput").value = "";
        renderIconGrid();
      });
    });
  }

  function renderColorGrid() {
    document.getElementById("categoryColorGrid").innerHTML = COLOR_CHOICES.map(
      (c) => `<button data-color="${c}" style="background:${c}" class="${c === editing.color ? "selected" : ""}"></button>`
    ).join("");
    document.querySelectorAll("#categoryColorGrid button").forEach((btn) => {
      btn.addEventListener("click", () => {
        editing.color = btn.dataset.color;
        renderColorGrid();
      });
    });
  }

  function renderTypeToggle() {
    document.querySelectorAll("#categoryTypeToggle button").forEach((b) => {
      b.classList.toggle("active", b.dataset.ctype === editing.type);
      b.classList.toggle("expense", b.dataset.ctype === "expense");
      b.classList.toggle("income", b.dataset.ctype === "income");
    });
  }

  function openEditor(cat) {
    if (cat) {
      const isEmoji = !ICONS[cat.icon];
      editing = { id: cat.id, type: cat.type, icon: isEmoji ? "other" : cat.icon, emoji: isEmoji ? cat.icon : "", color: cat.color };
      document.getElementById("categoryModalTitle").textContent = "Редагувати категорію";
      document.getElementById("categoryNameInput").value = cat.name;
      document.getElementById("categoryDeleteBtn").style.display = "block";
    } else {
      editing = { id: null, type: "expense", icon: "other", emoji: "", color: COLOR_CHOICES[0] };
      document.getElementById("categoryModalTitle").textContent = "Нова категорія";
      document.getElementById("categoryNameInput").value = "";
      document.getElementById("categoryDeleteBtn").style.display = "none";
    }
    document.getElementById("categoryEmojiInput").value = editing.emoji;
    renderTypeToggle();
    renderIconGrid();
    renderColorGrid();
    App.openModal("categoryModal");
  }

  function init() {
    initReorder();
    document.getElementById("addCategoryBtn").addEventListener("click", () => openEditor(null));

    document.querySelectorAll("#categoryTypeToggle button").forEach((btn) => {
      btn.addEventListener("click", () => {
        editing.type = btn.dataset.ctype;
        renderTypeToggle();
      });
    });

    document.getElementById("categoryEmojiInput").addEventListener("input", (e) => {
      editing.emoji = e.target.value;
    });

    document.getElementById("categorySaveBtn").addEventListener("click", async () => {
      const name = document.getElementById("categoryNameInput").value.trim();
      if (!name) { App.toast("Введіть назву"); return; }
      const iconValue = editing.emoji.trim() ? editing.emoji.trim() : editing.icon;
      const record = { id: editing.id || Db.uuid(), name, icon: iconValue, color: editing.color, type: editing.type };
      if (editing.id) await Db.updateCategory(record);
      else await Db.addCategory({ ...record, order: App.state.categories.length });
      await App.refreshCategories();
      App.closeModal("categoryModal");
      render();
      App.toast("Збережено");
    });

    document.getElementById("categoryDeleteBtn").addEventListener("click", async () => {
      if (!editing.id) return;
      await Db.deleteCategory(editing.id);
      await App.refreshCategories();
      App.closeModal("categoryModal");
      render();
      App.toast("Видалено");
    });
  }

  return { init, render };
})();
