/* ============================================
   АКРОТЕРА — основной скрипт
   Загружает data/products.json, рисует каталог,
   управляет модалками и мобильным меню.
   ============================================ */

(function () {
  "use strict";

  let DATA = null;
  let activeGroupId = "concrete";

  const el = {
    catTabs: document.getElementById("catTabs"),
    catMeta: document.getElementById("catMeta"),
    productGrid: document.getElementById("productGrid"),
    burgerBtn: document.getElementById("burgerBtn"),
    mainNav: document.getElementById("mainNav"),
    header: document.getElementById("header"),
  };

  /* ---------- ЗАГРУЗКА ДАННЫХ ---------- */
  async function loadData() {
    try {
      const res = await fetch("data/products.json");
      if (!res.ok) throw new Error("Network response was not ok");
      DATA = await res.json();
    } catch (err) {
      console.error("Не удалось загрузить каталог:", err);
      DATA = { categories: [], groups: [], colorSwatches: {} };
    }
    renderTabs();
    renderGroup(activeGroupId);
  }

  /* ---------- ФОРМАТИРОВАНИЕ ---------- */
  function formatPrice(product) {
    if (product && product.price_label) return product.price_label;
    const num = product && product.price !== undefined ? product.price : product;
    if (num === null || num === undefined) return "По запросу";
    return new Intl.NumberFormat("ru-RU").format(num) + " \u20BD";
  }

  function placeholderIcon() {
    return `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 50 L32 12 L48 50 Z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M22 50 L42 50" stroke="currentColor" stroke-width="2.5"/>
    </svg>`;
  }

  function thumbContent(product) {
    if (product.images && product.images.length > 0) {
      return `<img src="${product.images[0]}" alt="${escapeHtml(product.name)}" loading="lazy">`;
    }
    return placeholderIcon();
  }

  /* ---------- ТАБЫ ГРУПП ---------- */
  function renderTabs() {
    if (!DATA) return;
    const groups = DATA.groups || [];
    el.catTabs.innerHTML = "";
    groups.forEach((group) => {
      const btn = document.createElement("button");
      btn.className = "cat-tab" + (group.id === activeGroupId ? " is-active" : "");
      btn.type = "button";
      btn.dataset.group = group.id;
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", group.id === activeGroupId ? "true" : "false");
      btn.textContent = group.title;
      btn.addEventListener("click", () => setActiveGroup(group.id, true));
      el.catTabs.appendChild(btn);
    });
  }

  function setActiveGroup(groupId, scrollIntoView) {
    activeGroupId = groupId;
    document.querySelectorAll(".cat-tab").forEach((t) => {
      const isActive = t.dataset.group === groupId;
      t.classList.toggle("is-active", isActive);
      t.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    renderGroup(groupId);
    if (scrollIntoView) {
      document.getElementById("catalog").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  /* ---------- РЕНДЕР ГРУППЫ ---------- */
  function renderGroup(groupId) {
    if (!DATA) return;
    const groups = DATA.groups || [];
    const group = groups.find((g) => g.id === groupId) || groups[0];
    if (!group) return;

    // Собрать все категории группы
    const cats = (group.categories || [])
      .map((catId) => DATA.categories.find((c) => c.id === catId))
      .filter(Boolean);

    // Мета-заголовок группы
    el.catMeta.innerHTML = `
      <div>
        <div class="cat-meta-title">${escapeHtml(group.title)}</div>
      </div>
    `;

    el.productGrid.innerHTML = "";
    el.productGrid.style.background = "";
    el.productGrid.style.border = "";

    cats.forEach((cat) => {
      renderCategoryBlock(cat);
    });
  }

  /* ---------- РЕНДЕР ОДНОЙ КАТЕГОРИИ ВНУТРИ ГРУППЫ ---------- */
  function renderCategoryBlock(cat) {
    // Заголовок подкатегории
    const sectionHead = document.createElement("div");
    sectionHead.className = "cat-section-head";
    sectionHead.innerHTML = `
      <span class="cat-section-title">${escapeHtml(cat.title)}</span>
      ${cat.subtitle ? `<span class="cat-section-sub">${escapeHtml(cat.subtitle)}</span>` : ""}
      ${cat.material ? `<span class="cat-meta-material">${escapeHtml(cat.material)}</span>` : ""}
    `;
    el.productGrid.appendChild(sectionHead);

    const hasProducts = cat.products && cat.products.length > 0;
    const hasGallery = cat.gallery && cat.gallery.length > 0;

    // Галерея (фасадный декор)
    if (hasGallery) {
      const galleryWrap = document.createElement("div");
      galleryWrap.className = "cat-gallery cat-gallery--compact";
      galleryWrap.innerHTML = `
        ${cat.note ? `<p class="cat-gallery-note">${escapeHtml(cat.note)}</p>` : ""}
        <div class="cat-gallery-grid">
          ${cat.gallery.map(src => `<a href="${src}" target="_blank" class="cat-gallery-item"><img src="${src}" alt="Фасадный декор" loading="lazy"></a>`).join("")}
        </div>
        <div class="cat-gallery-cta">
          <p>Карнизы, наличники, пилястры, молдинги — изготавливаем по вашему проекту. Цена рассчитывается индивидуально.</p>
          <button type="button" class="btn btn-primary" data-open-modal="order">Запросить расчёт</button>
        </div>
        ${hasProducts ? `<h3 class="cat-gallery-subhead">Плиты пенопласта — в наличии</h3><p class="cat-gallery-subnote">Размеры до 1,2 × 2 × 1 м. Скидки на объём.</p>` : ""}
      `;
      galleryWrap.querySelectorAll('[data-open-modal]').forEach(btn => {
        btn.addEventListener("click", () => openOverlay(document.getElementById("modalOverlay")));
      });
      el.productGrid.appendChild(galleryWrap);
    }

    if (!hasProducts) {
      if (!hasGallery) {
        const empty = document.createElement("div");
        empty.className = "cat-empty";
        empty.innerHTML = escapeHtml(cat.note || "Изготавливается по индивидуальному проекту.");
        el.productGrid.appendChild(empty);
      }
      return;
    }

    // Сетка товаров
    const grid = document.createElement("div");
    grid.className = "product-subgrid";

    cat.products.forEach((product) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "product-card";
      card.setAttribute("aria-haspopup", "dialog");

      const swatches = (product.colors || [])
        .map((colorName) => {
          const hex = (DATA.colorSwatches && DATA.colorSwatches[colorName]) || "#ccc";
          return `<span class="swatch" style="background:${hex}" title="${escapeHtml(colorName)}"></span>`;
        })
        .join("");

      card.innerHTML = `
        <div class="product-thumb${product.images && product.images.length ? " has-image" : ""}">${thumbContent(product)}</div>
        <div class="product-name">${escapeHtml(product.name)}</div>
        <div class="product-dim">${product.dimensions && product.dimensions.startsWith("Серия") ? `<span class="series-badge">${escapeHtml(product.dimensions)}</span>` : escapeHtml(product.dimensions || "")}</div>
        <div class="product-bottom">
          <span class="product-price">${formatPrice(product)}</span>
          <span class="product-swatches">${swatches}</span>
        </div>
      `;
      card.addEventListener("click", () => openProductModal(cat, product));
      grid.appendChild(card);
    });

    el.productGrid.appendChild(grid);
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /* ---------- ПРОДУКТ МОДАЛКА ---------- */
  const productOverlay = document.getElementById("productModalOverlay");
  const productBody = document.getElementById("productModalBody");
  const productClose = document.getElementById("productModalClose");

  function openProductModal(cat, product) {
    const swatches = (product.colors || [])
      .map((colorName) => {
        const hex = (DATA.colorSwatches && DATA.colorSwatches[colorName]) || "#ccc";
        return `<span class="pm-swatch" style="background:${hex}" title="${escapeHtml(colorName)}"></span>`;
      })
      .join("");

    const hasImages = product.images && product.images.length > 0;
    const mainImage = hasImages
      ? `<img src="${product.images[0]}" alt="${escapeHtml(product.name)}" id="pmMainImg">`
      : placeholderIcon();

    const thumbsHtml =
      hasImages && product.images.length > 1
        ? `<div class="pm-thumbs">${product.images
            .map(
              (src, i) =>
                `<button type="button" class="pm-thumb-btn${i === 0 ? " is-active" : ""}" data-src="${src}"><img src="${src}" alt=""></button>`
            )
            .join("")}</div>`
        : "";

    productBody.innerHTML = `
      <div class="pm-thumb${hasImages ? " has-image" : ""}">${mainImage}</div>
      ${thumbsHtml}
      <div class="pm-category">${escapeHtml(cat.title)}</div>
      <div class="pm-name">${escapeHtml(product.name)}</div>
      <div class="pm-row"><span>Размеры</span><span>${escapeHtml(product.dimensions || "—")}</span></div>
      ${product.weight ? `<div class="pm-row"><span>Вес</span><span>${escapeHtml(product.weight)}</span></div>` : ""}
      <div class="pm-price">
        <span class="pm-price-val">${formatPrice(product)}</span>
        <span class="pm-swatches">${swatches}</span>
      </div>
      <button type="button" class="btn btn-primary btn-block" id="pmOrderBtn">Заказать этот вариант</button>
    `;
    openOverlay(productOverlay);

    if (hasImages && product.images.length > 1) {
      productBody.querySelectorAll(".pm-thumb-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          document.getElementById("pmMainImg").src = btn.dataset.src;
          productBody.querySelectorAll(".pm-thumb-btn").forEach((b) => b.classList.remove("is-active"));
          btn.classList.add("is-active");
        });
      });
    }

    document.getElementById("pmOrderBtn").addEventListener("click", () => {
      closeOverlay(productOverlay);
      const orderOverlay = document.getElementById("modalOverlay");
      openOverlay(orderOverlay);
      const msgField = document.querySelector('#orderForm textarea[name="message"]');
      if (msgField) msgField.value = `Интересует: ${product.name} (${cat.title})`;
    });
  }

  productClose.addEventListener("click", () => closeOverlay(productOverlay));
  productOverlay.addEventListener("click", (e) => {
    if (e.target === productOverlay) closeOverlay(productOverlay);
  });

  /* ---------- ORDER МОДАЛКА ---------- */
  const orderOverlay = document.getElementById("modalOverlay");
  const orderClose = document.getElementById("modalClose");
  const orderForm = document.getElementById("orderForm");
  const formStatus = document.getElementById("formStatus");

  document.querySelectorAll('[data-open-modal="order"]').forEach((btn) => {
    btn.addEventListener("click", () => openOverlay(orderOverlay));
  });
  orderClose.addEventListener("click", () => closeOverlay(orderOverlay));
  orderOverlay.addEventListener("click", (e) => {
    if (e.target === orderOverlay) closeOverlay(orderOverlay);
  });

  orderForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!orderForm.checkValidity()) {
      formStatus.textContent = "Заполните обязательные поля.";
      formStatus.className = "form-status is-error";
      return;
    }
    formStatus.textContent = "Заявка отправлена! Свяжемся с вами в ближайшее время.";
    formStatus.className = "form-status is-success";
    orderForm.reset();
    setTimeout(() => closeOverlay(orderOverlay), 1800);
  });

  /* ---------- ОБЩИЕ ФУНКЦИИ МОДАЛОК ---------- */
  function openOverlay(overlay) {
    overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }
  function closeOverlay(overlay) {
    overlay.classList.remove("is-open");
    document.body.style.overflow = "";
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeOverlay(orderOverlay);
      closeOverlay(productOverlay);
    }
  });

  /* ---------- НАВИГАЦИЯ ИЗ МЕНЮ/ФУТЕРА ---------- */
  document.querySelectorAll('a[data-group]').forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const groupId = link.dataset.group;
      closeMobileNav();
      setActiveGroup(groupId, true);
    });
  });
  document.querySelectorAll('a[data-cat]').forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const catId = link.dataset.cat;
      const groups = DATA ? DATA.groups || [] : [];
      const group = groups.find((g) => g.categories.includes(catId));
      closeMobileNav();
      if (group) setActiveGroup(group.id, true);
    });
  });

  /* ---------- МОБИЛЬНОЕ МЕНЮ ---------- */
  function closeMobileNav() {
    el.mainNav.classList.remove("is-open");
    el.burgerBtn.setAttribute("aria-expanded", "false");
  }
  el.burgerBtn.addEventListener("click", () => {
    const isOpen = el.mainNav.classList.toggle("is-open");
    el.burgerBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });
  el.mainNav.querySelectorAll("a:not([data-cat])").forEach((link) => {
    link.addEventListener("click", closeMobileNav);
  });

  /* ---------- ИНИЦИАЛИЗАЦИЯ ---------- */
  loadData();
})();
