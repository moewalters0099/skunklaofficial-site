const cartKey = "skunkla-cart";
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const price = (cents) => currency.format(cents / 100);
const cents = (product) => Math.round(Number(product.price) * 100);
function productPrice(product) {
  const amounts = Object.values(product.weightPrices ?? {}).map((amount) => Math.round(Number(amount) * 100));
  const low = cents(product);
  const high = amounts.length ? Math.max(...amounts) : low;
  return high === low ? price(low) : price(low) + " – " + price(high);
}

function cartLines(available) {
  const used = new Map();
  return [...cart].map(([key, qty]) => {
    const [id, weight] = key.split("|");
    const product = available.get(id);
    const amount = weight ? product?.weightPrices?.[weight] : product?.weightPrices ? undefined : product?.price;
    const stock = amount === undefined ? 0 : Math.max(0, stockUnits(product) - (used.get(id) ?? 0));
    const remaining = Math.min(qty, stock);
    used.set(id, (used.get(id) ?? 0) + remaining);
    return { key, id, weight, qty, product, stock, remaining, unitPrice: Math.round(Number(amount) * 100) };
  });
}
const stockUnits = (product) => product.stock === null ? 999999999 : Number(product.stock);
const make = (tag, value) => {
  const element = document.createElement(tag);
  element.textContent = value;
  return element;
};
function readCart() {
  try {
    const pairs = JSON.parse(localStorage.getItem(cartKey) || "[]");
    return new Map(pairs.filter(([id, qty]) => typeof id === "string" && Number.isSafeInteger(qty) && qty > 0));
  } catch {
    return new Map();
  }
}

const cart = readCart();

function saveCart() {
  localStorage.setItem(cartKey, JSON.stringify([...cart]));
}

function showCatalog(products, grid) {
  const requestedCategory = new URLSearchParams(location.search).get("category");
  const category = grid.dataset.category || (grid.hasAttribute("data-featured") ? "" : requestedCategory);
  const search = (new URLSearchParams(location.search).get("q") ?? "").trim().toLowerCase();
  const filters = document.querySelector("[data-catalog-filters]");
  const query = new URLSearchParams(location.search);
  const subcategory = query.get("subcategory") || "";
  const bracket = query.get("price") || "";
  const lower = Number(bracket);
  const hasConfiguredRanges = ["wax", "vapes", "edibles", "mushies"].includes(category);
  const configuredRange = hasConfiguredRanges ? [...(filters?.querySelectorAll('[data-filter="price"]') ?? [])]
    .find((link) => link.dataset.value === bracket && bracket !== "") : null;
  if (filters) {
    for (const link of filters.querySelectorAll("[data-filter]")) {
      const { filter, value } = link.dataset;
      const next = new URLSearchParams(query);
      if (value) next.set(filter, value);
      else next.delete(filter);
      link.href = location.pathname + (next.size ? "?" + next : "");
      if ((query.get(filter) || "") === value) link.setAttribute("aria-current", "true");
    }
  }
  const listings = products.filter((item) => {
    const primaryCategory = item.category.trim().toLowerCase();
    const secondary = item.categoryMemberships?.[category];
    if (category && primaryCategory !== category && !secondary) return false;
    if (search && ![item.name, item.sku, item.category].some((value) => value?.toLowerCase().includes(search))) return false;
    if (!filters) return true;
    const subcategories = secondary ?? item.subcategories ?? [item.subcategory];
    if (subcategory && !subcategories.includes(subcategory)) return false;
    const amounts = item.weightPrices ? Object.values(item.weightPrices).map((amount) => Math.round(Number(amount) * 100)) : [cents(item)];
    if (hasConfiguredRanges) {
      if (!configuredRange) return true;
      const upper = configuredRange.dataset.upper;
      const upperCents = Number(upper) * 100;
      return amounts.some((amount) => amount >= lower * 100 && (!upper || amount < upperCents ||
        (configuredRange.hasAttribute("data-inclusive") && amount === upperCents)));
    }
    return !bracket || amounts.some((amount) => amount >= lower * 100 && (lower === 1600 ? amount <= 200000 : amount < (lower + 400) * 100));
  });
  if (category === "wax") listings.sort((a, b) => a.name.localeCompare(b.name));
  const matches = grid.hasAttribute("data-featured") ? listings.slice(0, 6) : listings;
  document.querySelector(".catalog-count").textContent = matches.length + (matches.length === 1 ? " item listed" : " items listed");
  const message = document.querySelector("#catalog-message");
  message.textContent = matches.length ? "" : "No products match this selection.";
  grid.replaceChildren(...matches.map((product) => {
    const card = make("article", "");
    card.className = "product-card";
    const link = make("a", "");
    link.href = "/product?id=" + encodeURIComponent(product.id);
    link.className = "product-card-link";
    if (product.photo_url?.startsWith("https://")) {
      const photo = make("img", "");
      photo.src = product.photo_url;
      photo.alt = "";
      photo.loading = "lazy";
      link.append(photo);
    }
    link.append(make("h2", product.name));
    const cost = make("p", "");
    if (Number(product.originalPrice) > Number(product.price)) {
      cost.append(make("del", currency.format(Number(product.originalPrice))), " ");
    }
    cost.append(productPrice(product));
    card.append(link, cost);
    return card;
  }));
}

const shipping = [
  ["Standard · 5–7 days", 3500],
  ["Ground · 3–7 days", 5000],
  ["Priority · 2–3 days", 10000],
  ["Express · 1–2 days", 20000],
];

function renderCart(products, panel) {
  const root = panel.querySelector("[data-cart-items]");
  const available = new Map(products.map((product) => [product.id, product]));
  let subtotal = 0;
  let units = 0;
  const rows = [];
  const lines = cartLines(available);
  for (const { key: id, qty, product, weight, remaining, unitPrice } of lines) {
    const reserved = lines.filter((line) => line.product?.id === product?.id).reduce((sum, line) => sum + line.remaining, 0);
    const stock = remaining ? stockUnits(product) - reserved + remaining : 0;
    const name = [product?.name ?? "Unavailable product", weight].filter(Boolean).join(" · ");
    const row = make("article", "");
    row.className = "cart-line";
    if (product?.photo_url?.startsWith("https://")) {
      const image = make("img", "");
      image.src = product.photo_url;
      image.alt = "";
      row.append(image);
    }
    const detail = make("div", "");
    detail.append(make("strong", name), make("p", remaining ? price(unitPrice) + " each" : "Unavailable"));
    units += remaining;
    if (remaining) subtotal += remaining * unitPrice;
    if (remaining && remaining < qty) detail.append(make("small", "Only " + remaining + " available"));
    const controls = make("div", "");
    controls.className = "cart-controls";
    function control(label, accessible, newQty, disabled = false) {
      const button = make("button", label);
      button.type = "button";
      button.disabled = disabled;
      button.setAttribute("aria-label", accessible + " " + name);
      button.onclick = () => {
        if (newQty) cart.set(id, newQty);
        else cart.delete(id);
        try {
          saveCart();
          renderCart(products, panel);
        } catch {
          cart.set(id, qty);
          panel.querySelector("[data-cart-message]").textContent = "Your browser could not update the cart.";
        }
      };
      return button;
    }
    controls.append(control("−", "Decrease quantity for", remaining - 1, remaining <= 1),
      make("output", String(remaining)), control("+", "Increase quantity for", remaining + 1, remaining >= stock),
      control("Remove", "Remove", 0));
    detail.append(controls);
    row.append(detail);
    rows.push(row);
  }
  root.replaceChildren(...rows);
  const selected = Number(panel.querySelector("[data-shipping]").value);
  const fee = units > 0 ? shipping[selected][1] : 0;
  panel.querySelector("[data-subtotal]").textContent = price(subtotal);
  panel.querySelector("[data-total]").textContent = price(subtotal + fee);
  panel.querySelector("[data-cart-empty]").hidden = rows.length > 0;
  panel.querySelector("[data-checkout]").hidden = units === 0;
  panel.dataset.total = subtotal + fee;
}

function showWallets(target, order) {
  target.replaceChildren(make("h3", "Pay with crypto"), make("p", "Order total: " + price(order.total)));
  if (!order.wallets.length) {
    target.append(make("p", "No wallet is available right now. Contact SKUNKLA with your order reference."));
    return;
  }
  target.append(make("p", "Choose one wallet. Confirm the network and use your wallet’s USD conversion for the total shown."));
  for (const wallet of order.wallets) {
    const details = make("details", "");
    details.className = "cart-summary";
    details.append(make("summary", wallet.name + " · " + wallet.network));
    const address = make("p", wallet.address);
    address.style.overflowWrap = "anywhere";
    details.append(address);
    if (/^data:image\/(png|jpeg);base64,/.test(wallet.qr_image ?? "")) {
      const image = make("img", "");
      image.src = wallet.qr_image;
      image.alt = wallet.name + " wallet QR code";
      image.style.cssText = "display:block;max-width:100%;width:200px;height:auto;background:#fff;padding:8px";
      details.append(image);
    }
    const button = make("button", "Copy wallet address");
    button.type = "button";
    button.onclick = async () => {
      try {
        await navigator.clipboard.writeText(wallet.address);
        button.textContent = "Copied";
      } catch {
        button.textContent = "Select the address to copy it";
      }
    };
    details.append(button);
    target.append(details);
  }
}

function setupCart(products, panel) {
  const checkout = Boolean(document.querySelector("[data-checkout-page]"));
  const summary = `
    <h2>Order summary</h2>
    <p data-cart-message role="status"></p>
    <p data-cart-empty hidden>Your cart is empty.</p>
    <div class="cart-lines" data-cart-items></div>
    <label for="cart-shipping">Shipping</label>
    <select id="cart-shipping" data-shipping></select>
    ${checkout ? `<label for="cart-note">Order note (optional)</label><textarea id="cart-note" maxlength="500" rows="2"></textarea>` : ""}
    <dl><div><dt>Subtotal</dt><dd data-subtotal></dd></div>
    <div><dt>Total (USD)</dt><dd data-total></dd></div></dl>`;
  function field(label, name, autocomplete, limit, type = "text", required = true) {
    return `<label>${label}<input name="${name}" type="${type}" autocomplete="${autocomplete}" maxlength="${limit}" ${required ? "required" : ""}></label>`;
  }
  panel.innerHTML = checkout ? `
    <form class="checkout-grid" data-order-form>
      <section class="checkout-card">
        <h2>Billing details</h2>
        <p>Use the address where you want your order delivered. Required fields are marked with *.</p>
        <div class="checkout-pair">${field("First name *","firstName","given-name",80)}
        ${field("Last name *","lastName","family-name",80)}</div>
        <label>Country / Region *<select name="country" autocomplete="country-name" required><option>United States</option></select></label>
        ${field("Street address *","street","address-line1",140)}
        ${field("Apartment, suite or unit (optional)","unit","address-line2",100,"text",false)}
        ${field("Town / City *","city","address-level2",80)}
        <div class="checkout-pair">${field("State *","state","address-level1",50)}
        ${field("ZIP code *","zip","postal-code",10)}</div>
        <div class="checkout-pair">${field("Phone (optional)","phone","tel",40,"tel",false)}
        ${field("Email address *","email","email",254,"email")}</div>
      </section>
      <section class="checkout-card cart-summary">
        ${summary}
        <div data-checkout>
          <h2>Payment information</h2>
          <p><strong>Cryptocurrency</strong></p>
          <p>Place your order to see the available wallets and QR codes.</p>
          <button type="submit" class="cart-link">Place order</button>
        </div>
        <p data-order-result role="status"></p><div data-wallets></div>
      </section>
    </form>` : `
    <div class="cart-summary">${summary}
      <a data-checkout class="cart-link" href="/checkout">Checkout</a>
    </div>`;
  const select = panel.querySelector("[data-shipping]");
  shipping.forEach(([label, fee], index) => select.add(new Option(label + " · " + price(fee), index)));
  const selected = new URLSearchParams(location.search).get("shipping");
  if (selected !== null && shipping[Number(selected)]) select.value = String(Number(selected));
  const refresh = () => {
    renderCart(products, panel);
    if (!checkout) panel.querySelector("[data-checkout]").href = "/checkout?shipping=" + select.value;
  };
  select.onchange = refresh;
  refresh();
  if (!checkout) return;
  const form = panel.querySelector("[data-order-form]");
  const result = panel.querySelector("[data-order-result]");
  let orderId;
  form.onsubmit = async (event) => {
    event.preventDefault();
    orderId ??= crypto.randomUUID();
    const submit = form.querySelector('button[type="submit"]');
    const data = Object.fromEntries(new FormData(form));
    const { firstName, lastName, country, street, unit, city, state, zip, phone, email } = data;
    const address = [street, unit, city, state + " " + zip, country].map((line) => line.trim()).filter(Boolean).join(", ");
    const available = new Map(products.map((product) => [product.id, product]));
    const items = cartLines(available).filter(({ remaining }) => remaining > 0)
      .map(({ id, weight, remaining }) => ({ id, weight, qty: remaining }));
    submit.disabled = true;
    result.textContent = "Submitting…";
    try {
      const response = await fetch("/api/order-requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, address, firstName, lastName, phone, id: orderId, items, shippingIndex: Number(select.value),
          note: panel.querySelector("#cart-note").value, expectedTotal: Number(panel.dataset.total) }),
      });
      const order = await response.json();
      if (!response.ok) throw new Error(order.error ?? "Could not submit your order.");
      orderId = undefined;
      cart.clear();
      try { saveCart(); } catch {}
      form.reset();
      form.querySelector(".checkout-card").hidden = true;
      renderCart(products, panel);
      result.textContent = "Order " + order.id + " placed · Pending payment.";
      showWallets(panel.querySelector("[data-wallets]"), order);
    } catch (error) {
      result.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  };
  renderCart(products, panel);
}

let drawer;
function openCart(products, message = "") {
  if (!drawer) {
    drawer = document.createElement("dialog");
    drawer.className = "cart-drawer";
    drawer.setAttribute("aria-labelledby", "cart-drawer-title");
    drawer.innerHTML = '<header><h2 id="cart-drawer-title">Shopping cart</h2><form method="dialog"><button type="submit" aria-label="Close cart">Close</button></form></header><div data-cart-panel></div><a class="cart-link" href="/cart-preview">View full cart</a>';
    document.body.append(drawer);
    setupCart(products, drawer.querySelector("[data-cart-panel]"));
  }
  const panel = drawer.querySelector("[data-cart-panel]");
  panel.querySelector("[data-cart-message]").textContent = message;
  renderCart(products, panel);
  if (!drawer.open) drawer.showModal();
}

async function playableVideo(source) {
  if (!/^https:\/\/skunkla\.com\/wp-content\/uploads\/(?:[a-z0-9_-]+\/)*[a-z0-9_.-]+\.mov$/i.test(source ?? "")) return source;
  try {
    const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
    const key = [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const path = "/assets/products/converted/" + key + ".mp4";
    const response = await fetch(path, { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(2000) });
    if (response.ok && response.headers.get("Content-Type")?.startsWith("video/mp4")) return new URL(path, location.origin).href;
  } catch {
    // Keep the original link available if the converted file is still deploying.
  }
  return source;
}

async function showProduct(products, root) {
  const id = new URLSearchParams(location.search).get("id");
  const product = products.find((item) => item.id === id);
  const message = document.querySelector("#catalog-message");
  if (!product) {
    message.textContent = "This product is unavailable.";
    return;
  }
  document.title = product.name + " | SKUNKLA";
  message.textContent = "";
  const media = root.querySelector("[data-product-media]");
  const photos = [...new Set([product.photo_url, product.photo_url_2, product.photo_url_3, product.photo_url_4, ...(product.extraPhotos ?? [])]
    .filter((url) => typeof url === "string" && url.startsWith("https://")))];
  const slides = photos.map((url, index) => {
    const image = make("img", "");
    image.src = url;
    image.alt = product.name + " photo " + (index + 1);
    image.loading = index === 0 ? "eager" : "lazy";
    return { element: image, label: "Photo " + (index + 1) };
  });
  let videoLink;
  const videoSource = await playableVideo(product.video_url);
  if (videoSource?.startsWith("https://")) {
    videoLink = make("a", "Open product video");
    videoLink.href = videoSource;
    videoLink.target = "_blank";
    videoLink.rel = "noopener noreferrer";
    if (/\.(mp4|webm)(?:[?#]|$)/i.test(videoSource)) {
      const video = make("video", "");
      video.src = videoSource;
      video.controls = true;
      video.playsInline = true;
      video.preload = "none";
      if (photos.length) video.poster = photos[0];
      video.setAttribute("aria-label", product.name + " video");
      slides.push({ element: video, label: "Video" });
    }
  }
  if (slides.length) {
    const gallery = make("div", "");
    gallery.className = "product-gallery";
    const stage = make("div", "");
    stage.className = "product-gallery-stage";
    stage.append(...slides.map(({ element }) => element));
    gallery.append(stage);
    if (slides.length > 1) {
      gallery.classList.add("has-thumbnails");
      const thumbnails = make("div", "");
      thumbnails.className = "product-thumbnails";
      const counter = make("output", "");
      counter.className = "product-gallery-counter";
      counter.setAttribute("aria-live", "polite");
      let active = 0;
      function show(index) {
        active = (index + slides.length) % slides.length;
        slides.forEach(({ element }, position) => {
          element.hidden = position !== active;
          if (element.hidden && element.tagName === "VIDEO") element.pause();
          thumbnails.children[position].setAttribute("aria-pressed", String(position === active));
        });
        counter.textContent = (active + 1) + " / " + slides.length;
      }
      slides.forEach(({ element, label }, index) => {
        const button = make("button", "");
        button.type = "button";
        button.setAttribute("aria-label", "Show " + label.toLowerCase());
        const preview = element.tagName === "VIDEO" ? element.poster : element.src;
        if (preview) {
          const thumb = make("img", "");
          thumb.src = preview;
          thumb.alt = "";
          thumb.loading = "lazy";
          button.append(thumb);
        }
        if (element.tagName === "VIDEO") button.append(make("span", "▶"));
        button.onclick = () => show(index);
        thumbnails.append(button);
      });
      gallery.prepend(thumbnails);
      for (const [step, label, symbol] of [[-1, "Previous media", "‹"], [1, "Next media", "›"]]) {
        const arrow = make("button", symbol);
        arrow.type = "button";
        arrow.className = "product-gallery-arrow " + (step < 0 ? "previous" : "next");
        arrow.setAttribute("aria-label", label);
        arrow.onclick = () => show(active + step);
        stage.append(arrow);
      }
      stage.append(counter);
      gallery.addEventListener("keydown", (event) => {
        if (event.target.tagName === "VIDEO" || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
        event.preventDefault();
        show(active + (event.key === "ArrowLeft" ? -1 : 1));
      });
      let touchStart;
      stage.addEventListener("touchstart", (event) => {
        const touch = event.touches[0];
        touchStart = event.touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : null;
      }, { passive: true });
      stage.addEventListener("touchcancel", () => { touchStart = null; });
      stage.addEventListener("touchend", (event) => {
        if (!touchStart) return;
        const touch = event.changedTouches[0];
        const dx = touch.clientX - touchStart.x;
        const dy = touch.clientY - touchStart.y;
        touchStart = null;
        if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.3) show(active + (dx < 0 ? 1 : -1));
      }, { passive: true });
      show(0);
    }
    media.append(gallery);
  }
  if (videoLink) media.append(videoLink);
  root.querySelector("h1").textContent = product.displayName || [product.name, product.sku].filter(Boolean).join(" – ");
  const priceLabel = root.querySelector("[data-price]");
  priceLabel.textContent = productPrice(product);
  if (Number(product.originalPrice) > Number(product.price)) {
    priceLabel.prepend(make("del", currency.format(Number(product.originalPrice))), " ");
  }
  if (product.cashPrice) priceLabel.after(make("p", product.cashPrice));
  root.querySelector("[data-category-name]").textContent = [product.category, product.subcategory?.replaceAll("-", " ")].filter(Boolean).join(" / ");
  if (product.description) {
    root.querySelector("[data-description]").textContent = product.description;
    root.querySelector("[data-product-description]").hidden = false;
  }
  const form = root.querySelector("form");
  const quantity = form.elements.quantity;
  let weightSelect;
  if (product.weightPrices) {
    const label = make("label", "Weight");
    weightSelect = document.createElement("select");
    weightSelect.required = true;
    weightSelect.add(new Option("Choose a weight", ""));
    for (const weight of ["2 Gram", "3.5g", "Half Ounce", "Ounce", "Quarter Pound", "Half Pound", "Pound", "100g", "kg"]) {
      const amount = product.weightPrices[weight];
      if (amount !== undefined) weightSelect.add(new Option(weight + " · " + currency.format(Number(amount)), weight));
    }
    weightSelect.onchange = () => {
      priceLabel.textContent = weightSelect.value ? currency.format(Number(product.weightPrices[weightSelect.value])) : productPrice(product);
    };
    label.append(weightSelect);
    form.prepend(label);
  }
  const stock = stockUnits(product);
  quantity.max = String(stock);
  if (stock < 1) {
    form.hidden = true;
    message.textContent = "Out of stock";
  }
  form.onsubmit = (event) => {
    event.preventDefault();
    const count = Number(quantity.value);
    const weight = weightSelect?.value;
    if (weightSelect && !weight) return;
    const key = weight ? id + "|" + weight : id;
    const previous = cart.get(key) ?? 0;
    const reserved = cartLines(new Map([[id, product]])).reduce((sum, line) => sum + line.remaining, 0);
    if (!Number.isSafeInteger(count) || count < 1 || reserved + count > stock) {
      message.textContent = "Choose a quantity within available stock, including items already in your cart.";
      return;
    }
    cart.set(key, previous + count);
    try {
      saveCart();
    } catch {
      if (previous) cart.set(key, previous);
      else cart.delete(key);
      message.textContent = "Your browser could not save the cart.";
      return;
    }
    if (event.submitter?.value === "checkout") location.assign("/checkout");
    else openCart(products, product.name + " added to your cart.");
  };
  root.hidden = false;
}

(async () => {
  try {
    const response = await fetch("/api/catalog-products", { cache: "no-store" });
    if (!response.ok) throw new Error("Catalog unavailable");
    const products = await response.json();
    const grid = document.querySelector("[data-category]");
    const productPage = document.querySelector("[data-product-page]");
    if (productPage) await showProduct(products, productPage);
    else if (grid) {
      showCatalog(products, grid);
      grid.closest("section")?.querySelector("[data-open-cart], .catalog-toolbar a")?.addEventListener("click", (event) => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        openCart(products);
      });
    } else {
      setupCart(products, document.querySelector("#items"));
      document.querySelector("#catalog-message").textContent = "";
    }
  } catch {
    document.querySelector("#catalog-message").textContent = "Products could not be loaded. Refresh to try again.";
  }
})();
