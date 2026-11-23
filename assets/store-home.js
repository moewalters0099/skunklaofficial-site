(() => {
  const menu = document.querySelector(".store-menu");
  for (const button of document.querySelectorAll("[data-menu-open]")) {
    button.onclick = () => menu.showModal();
  }
  menu.onclick = (event) => { if (event.target === menu) menu.close(); };
  const search = document.querySelector(".store-search");
  for (const button of document.querySelectorAll("[data-search-open]")) {
    button.onclick = () => {
      search.classList.add("is-open");
      document.querySelector("#store-query").focus();
    };
  }
  search.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      search.classList.remove("is-open");
      document.querySelector("[data-search-open]").focus();
    }
  });
  const slides = [...document.querySelectorAll("#store-slide > a")];
  const controls = [...document.querySelectorAll(".store-slide-controls button[aria-pressed]")];
  let activeSlide = 0;
  function showSlide(index) {
    activeSlide = (index + slides.length) % slides.length;
    slides.forEach((slide, position) => { slide.hidden = position !== activeSlide; });
    controls.forEach((control, position) => control.setAttribute("aria-pressed", String(position === activeSlide)));
  }
  controls.forEach((button, index) => { button.onclick = () => showSlide(index); });
  for (const button of document.querySelectorAll("[data-slide-step]")) {
    button.onclick = () => showSlide(activeSlide + Number(button.dataset.slideStep));
  }

  const categoryStrip = document.querySelector(".store-chips");
  const banner = document.querySelector(".store-feature");
  const categoryCarousel = document.querySelector(".store-chip-carousel");
  const motion = document.querySelector("[data-store-motion]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let paused = reducedMotion.matches;
  function moveCategories(direction, automatic = false) {
    const maximum = categoryStrip.scrollWidth - categoryStrip.clientWidth;
    const next = categoryStrip.scrollLeft + direction * (categoryStrip.firstElementChild.offsetWidth + 16);
    const position = automatic && categoryStrip.scrollLeft >= maximum - 1 ? 0 : Math.max(0, Math.min(next, maximum));
    categoryStrip.scrollTo({ left: position, behavior: reducedMotion.matches ? "instant" : "smooth" });
  }
  for (const control of document.querySelectorAll("[data-category-step]")) {
    control.onclick = () => moveCategories(Number(control.dataset.categoryStep));
  }
  function updateMotion() {
    motion.textContent = paused ? "Play rotation" : "Pause rotation";
  }
  motion.onclick = () => {
    paused = !paused;
    updateMotion();
  };
  reducedMotion.addEventListener("change", (event) => {
    paused = event.matches;
    updateMotion();
  });
  updateMotion();
  function canRotate(region) {
    return !paused && !document.hidden && !region.matches(":hover, :focus-within");
  }
  window.setInterval(() => {
    if (canRotate(banner)) showSlide(activeSlide + 1);
  }, 6000);
  window.setInterval(() => {
    if (canRotate(categoryCarousel)) moveCategories(1, true);
  }, 4200);
  let swipeStart;
  banner.addEventListener("touchstart", (event) => {
    const touch = event.changedTouches[0];
    swipeStart = [touch.clientX, touch.clientY];
  }, { passive: true });
  banner.addEventListener("touchend", (event) => {
    if (!swipeStart) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - swipeStart[0];
    const dy = touch.clientY - swipeStart[1];
    swipeStart = undefined;
    if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy)) showSlide(activeSlide + (dx < 0 ? 1 : -1));
  }, { passive: true });

  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const isSale = (item) => Number(item.originalPrice) > Number(item.price);
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }
  function productCard(item, collection) {
    const link = element("a", "store-product-card");
    link.href = "/product?id=" + encodeURIComponent(item.id);
    const media = element("div", "store-card-media");
    if (item.category.toLowerCase() === "flower") media.classList.add("is-flower");
    if (item.photo_url?.startsWith("https://")) {
      const image = element("img");
      image.src = item.photo_url;
      image.loading = "lazy";
      image.alt = "";
      media.append(image);
    }
    const discounted = isSale(item);
    const soldOut = item.stock !== null && Number(item.stock) === 0;
    if (soldOut) {
      media.append(element("span", "store-card-badge", "Sold out"));
    } else if (collection === "new") {
      media.append(element("span", "store-card-badge is-new", "New"));
    } else if (discounted) {
      const percent = Math.round((1 - Number(item.price) / Number(item.originalPrice)) * 100);
      media.append(element("span", "store-card-badge", "−" + percent + "%"));
    }
    const category = (item.subcategory || item.category).replaceAll("-", " ");
    const name = item.displayName || [item.name, item.sku].filter(Boolean).join(" – ");
    const amount = Number(item.price);
    const high = Math.max(amount, ...Object.values(item.weightPrices ?? {}).map(Number));
    const price = element("span", "store-card-price" + (discounted ? " is-sale" : ""));
    if (discounted) price.append(element("del", "", money.format(Number(item.originalPrice))));
    price.append(high > amount ? money.format(amount) + " – " + money.format(high) : money.format(amount));
    link.append(media, element("span", "store-card-category", category), element("h3", "", name), price);
    const card = element("article", "store-product-shell");
    card.append(link);
    const actions = window.storeProductActions?.controls(item);
    if (actions) card.append(actions);
    return card;
  }
  async function loadShelves() {
    const shelves = [...document.querySelectorAll("[data-shelf]")];
    try {
      const response = await fetch("/api/catalog-products");
      if (!response.ok) throw new Error("Catalog unavailable");
      const products = await response.json();
      window.storeProductActions?.mount(products, shelves[0]);
      const byId = new Map(products.map((item) => [item.id, item]));
      for (const shelf of shelves) {
        const collection = shelf.dataset.shelf;
        const ids = new Set(shelf.dataset.products.split(" ").filter(Boolean));
        const chosen = [...ids].map((id) => byId.get(id)).filter(Boolean);
        const items = collection === "sale"
          ? [...chosen.filter(isSale), ...products.filter((item) => !ids.has(item.id) && isSale(item))]
          : chosen;
        const grid = shelf.querySelector(".store-product-grid");
        const message = shelf.querySelector("[data-shelf-message]");
        const expand = shelf.querySelector("[data-expand]");
        const label = expand.textContent;
        function render(expanded) {
          grid.replaceChildren(...(expanded ? items : items.slice(0, 5)).map((item) => productCard(item, collection)));
          expand.setAttribute("aria-expanded", String(expanded));
          expand.textContent = expanded ? "Show fewer products" : label;
        }
        expand.hidden = items.length <= 5;
        expand.onclick = () => render(expand.getAttribute("aria-expanded") !== "true");
        message.textContent = items.length ? "" : "No products are currently listed here.";
        message.hidden = items.length > 0;
        render(false);
      }
    } catch {
      for (const shelf of shelves) {
        shelf.querySelector("[data-shelf-message]").textContent = "Products are temporarily unavailable.";
      }
    }
  }
  loadShelves();

  function updateCount() {
    try {
      const count = JSON.parse(localStorage.getItem("skunkla-cart") || "[]")
        .reduce((total, [, quantity]) => total + quantity, 0);
      document.querySelector(".store-cart-count").textContent = count;
    } catch {}
  }
  updateCount();
  window.addEventListener("storage", updateCount);
  window.addEventListener("pageshow", updateCount);
  document.addEventListener("click", () => queueMicrotask(updateCount));
})();
