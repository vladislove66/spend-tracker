const Categories = (() => {
  const ICON_CHOICES = ["food","cart","car","fuel","drink","health","clothes","phone","subscriptions","travel","home","gift","book","paw","income","sport","beauty","kids","tech","wallet","other"];
  const COLOR_CHOICES = ["#f97316","#0ea5e9","#64748b","#a16207","#d946ef","#ef4444","#14b8a6","#6366f1","#84cc16","#0891b2","#94a3b8","#22c55e","#eab308","#ec4899","#8b5cf6"];

  let editing = { id: null, type: "expense", icon: "other", color: COLOR_CHOICES[0] };

  async function render() {
    const cats = await Db.getCategories();
    App.state.categories = cats;
    const list = document.getElementById("categoriesList");
    if (!cats.length) {
      list.innerHTML = '<div class="empty-state">Немає категорій</div>';
      return;
    }
    list.innerHTML = cats
      .map(
        (c) => `<button class="list-row" data-id="${c.id}">
          <span class="row-ic" style="background:${c.color}">${icon(c.icon)}</span>
          <span style="flex:1">
            <div class="row-title">${c.name}</div>
            <div class="row-sub">${c.type === "income" ? "Дохід" : "Витрата"}</div>
          </span>
          <span class="chev">${icon("chevronRight")}</span>
        </button>`
      )
      .join("");
    list.querySelectorAll(".list-row").forEach((row) => {
      row.addEventListener("click", () => openEditor(cats.find((c) => c.id === row.dataset.id)));
    });
  }

  function renderIconGrid() {
    document.getElementById("categoryIconGrid").innerHTML = ICON_CHOICES.map(
      (i) => `<button data-icon-choice="${i}" class="${i === editing.icon ? "selected" : ""}">${icon(i)}</button>`
    ).join("");
    document.querySelectorAll("#categoryIconGrid button").forEach((btn) => {
      btn.addEventListener("click", () => {
        editing.icon = btn.dataset.iconChoice;
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
    });
  }

  function openEditor(cat) {
    if (cat) {
      editing = { id: cat.id, type: cat.type, icon: cat.icon, color: cat.color };
      document.getElementById("categoryModalTitle").textContent = "Редагувати категорію";
      document.getElementById("categoryNameInput").value = cat.name;
      document.getElementById("categoryDeleteBtn").style.display = "block";
    } else {
      editing = { id: null, type: "expense", icon: "other", color: COLOR_CHOICES[0] };
      document.getElementById("categoryModalTitle").textContent = "Нова категорія";
      document.getElementById("categoryNameInput").value = "";
      document.getElementById("categoryDeleteBtn").style.display = "none";
    }
    renderTypeToggle();
    renderIconGrid();
    renderColorGrid();
    App.openModal("categoryModal");
  }

  function init() {
    document.getElementById("addCategoryBtn").addEventListener("click", () => openEditor(null));

    document.querySelectorAll("#categoryTypeToggle button").forEach((btn) => {
      btn.addEventListener("click", () => {
        editing.type = btn.dataset.ctype;
        renderTypeToggle();
      });
    });

    document.getElementById("categorySaveBtn").addEventListener("click", async () => {
      const name = document.getElementById("categoryNameInput").value.trim();
      if (!name) { App.toast("Введіть назву"); return; }
      const record = { id: editing.id || Db.uuid(), name, icon: editing.icon, color: editing.color, type: editing.type };
      if (editing.id) await Db.updateCategory(record);
      else await Db.addCategory(record);
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
