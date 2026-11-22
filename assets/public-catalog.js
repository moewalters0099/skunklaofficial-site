const cartKey = "skunkla-cart";
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const price = (cents) => currency.format(cents / 100);
const cents = (product) => Math.round(Number(product.price) * 100);
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
  const category = grid.dataset.category;
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
    if (category && item.category.trim().toLowerCase() !== category) return false;
    if (!filters) return true;
    if (subcategory && item.subcategory !== subcategory) return false;
    const amount = cents(item);
    if (hasConfiguredRanges) {
      if (!configuredRange) return true;
      const upper = configuredRange.dataset.upper;
      const upperCents = Number(upper) * 100;
      return amount >= lower * 100 && (!upper || amount < upperCents ||
        (configuredRange.hasAttribute("data-inclusive") && amount === upperCents));
    }
    return !bracket || (amount >= lower * 100 && (lower === 1600 ? amount <= 200000 : amount < (lower + 400) * 100));
  });
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
    card.append(link, make("p", price(cents(product))));
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
  for (const [id, qty] of cart) {
    const product = available.get(id);
    const stock = Number(product?.stock ?? 0);
    const remaining = Math.min(qty, stock);
    const name = product?.name ?? "Unavailable product";
    const row = make("article", "");
    row.className = "cart-line";
    if (product?.photo_url?.startsWith("https://")) {
      const image = make("img", "");
      image.src = product.photo_url;
      image.alt = "";
      row.append(image);
    }
    const detail = make("div", "");
    detail.append(make("strong", name), make("p", remaining ? price(cents(product)) + " each" : "Unavailable"));
    units += remaining;
    if (remaining) subtotal += remaining * cents(product);
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
    const stock = new Map(products.map((product) => [product.id, Number(product.stock)]));
    const items = [...cart].map(([id, qty]) => ({ id, qty: Math.min(qty, stock.get(id) ?? 0) })).filter(({ qty }) => qty > 0);
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

function showProduct(products, root) {
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
  const image = make("img", "");
  if (product.photo_url?.startsWith("https://")) {
    image.src = product.photo_url;
    image.alt = product.name;
    media.append(image);
  }
  if (product.video_url?.startsWith("https://")) {
    const videoLink = make("a", "Open product video");
    videoLink.href = product.video_url;
    videoLink.target = "_blank";
    videoLink.rel = "noopener noreferrer";
    if (/\.(mp4|webm)(?:[?#]|$)/i.test(product.video_url)) {
      const video = make("video", "");
      video.src = product.video_url;
      video.controls = true;
      video.playsInline = true;
      video.preload = "none";
      if (image.src) video.poster = image.src;
      video.setAttribute("aria-label", product.name + " video");
      const selector = make("div", "");
      selector.className = "product-actions";
      for (const [label, showVideo] of [["Photo", false], ["Video", true]]) {
        if (!showVideo && !image.src) continue;
        const button = make("button", label);
        button.setAttribute("aria-pressed", String(showVideo === !image.src));
        button.onclick = () => {
          image.hidden = showVideo;
          video.hidden = !showVideo;
          if (!showVideo) video.pause();
          for (const peer of selector.children) peer.setAttribute("aria-pressed", String(peer === button));
        };
        selector.append(button);
      }
      video.hidden = Boolean(image.src);
      media.append(video, selector);
    }
    media.append(videoLink);
  }
  root.querySelector("h1").textContent = [product.name, product.sku].filter(Boolean).join(" · ");
  root.querySelector("[data-price]").textContent = price(cents(product));
  root.querySelector("[data-category-name]").textContent = [product.category, product.subcategory?.replaceAll("-", " ")].filter(Boolean).join(" / ");
  if (product.description) {
    root.querySelector("[data-description]").textContent = product.description;
    root.querySelector("[data-product-description]").hidden = false;
  }
  const form = root.querySelector("form");
  const quantity = form.elements.quantity;
  const stock = Number(product.stock);
  quantity.max = String(stock);
  if (stock < 1) {
    form.hidden = true;
    message.textContent = "Out of stock";
  }
  form.onsubmit = (event) => {
    event.preventDefault();
    const count = Number(quantity.value);
    const previous = cart.get(id) ?? 0;
    if (!Number.isSafeInteger(count) || count < 1 || previous + count > stock) {
      message.textContent = "Choose a quantity within available stock, including items already in your cart.";
      return;
    }
    cart.set(id, previous + count);
    try {
      saveCart();
    } catch {
      if (previous) cart.set(id, previous);
      else cart.delete(id);
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
    if (productPage) showProduct(products, productPage);
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
