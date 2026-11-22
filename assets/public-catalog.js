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
  const matches = products.filter((item) => !category || item.category.trim().toLowerCase() === category);
  document.querySelector(".catalog-count").textContent = matches.length + (matches.length === 1 ? " item listed" : " items listed");
  const message = document.querySelector("#catalog-message");
  message.textContent = matches.length ? "" : "No products listed in this category yet.";
  grid.replaceChildren(...matches.map((product) => {
    const card = make("article", "");
    card.className = "product-card";
    if (product.photo_url?.startsWith("https://")) {
      const photo = make("img", "");
      photo.src = product.photo_url;
      photo.alt = product.name;
      photo.loading = "lazy";
      card.append(photo);
    }
    card.append(make("h2", product.name), make("p", price(cents(product))));
    if (product.video_url?.startsWith("https://")) {
      const link = make("a", "Watch video");
      link.href = product.video_url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      card.append(link);
    }
    const button = make("button", Number(product.stock) > 0 ? "Add to cart" : "Out of stock");
    button.type = "button";
    button.disabled = Number(product.stock) < 1;
    button.onclick = () => {
      const qty = cart.get(product.id) || 0;
      if (qty >= Number(product.stock)) {
        message.textContent = "Your cart already contains the available quantity.";
        return;
      }
      cart.set(product.id, qty + 1);
      try {
        saveCart();
        message.textContent = product.name + " added to your cart.";
        openCart(products, message.textContent);
      } catch {
        if (qty) cart.set(product.id, qty);
        else cart.delete(product.id);
        message.textContent = "Your browser could not save the cart.";
      }
    };
    card.append(button);
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

function setupCart(products, panel) {
  panel.innerHTML = `
    <p data-cart-message role="status"></p>
    <p data-cart-empty hidden>Your cart is empty.</p>
    <div class="cart-lines" data-cart-items></div>
    <div class="cart-summary">
      <label for="cart-shipping">Shipping estimate</label>
      <select id="cart-shipping" data-shipping></select>
      <p class="cart-small">First Class · $15 for eligible small items. Eligibility has not been set up.</p>
      <label for="cart-note">Order note</label>
      <textarea id="cart-note" maxlength="500" rows="2" placeholder="Optional"></textarea>
      <dl><div><dt>Subtotal</dt><dd data-subtotal></dd></div>
      <div><dt>Estimated total</dt><dd data-total></dd></div></dl>
      <details data-checkout class="checkout">
        <summary>Checkout</summary>
        <form data-order-form>
          <p>Submit an order request. Payment and shipping are confirmed by SKUNKLA after review.</p>
          <label>Email <input name="email" type="email" maxlength="254" autocomplete="email" required></label>
          <label>Shipping address <textarea name="address" maxlength="500" autocomplete="street-address" rows="3" required></textarea></label>
          <button type="submit">Submit order request</button>
        </form>
      </details>
      <p data-order-result role="status"></p>
    </div>`;
  const select = panel.querySelector("[data-shipping]");
  shipping.forEach(([label, fee], index) => select.add(new Option(label + " · " + price(fee), index)));
  select.onchange = () => renderCart(products, panel);
  const form = panel.querySelector("[data-order-form]");
  const result = panel.querySelector("[data-order-result]");
  let orderId;
  form.onsubmit = async (event) => {
    event.preventDefault();
    orderId ??= crypto.randomUUID();
    const submit = form.querySelector("button");
    const data = Object.fromEntries(new FormData(form));
    const stock = new Map(products.map((product) => [product.id, Number(product.stock)]));
    const items = [...cart].map(([id, qty]) => ({ id, qty: Math.min(qty, stock.get(id) ?? 0) })).filter(({ qty }) => qty > 0);
    submit.disabled = true;
    result.textContent = "Submitting…";
    try {
      const response = await fetch("/api/order-requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, id: orderId, items, shippingIndex: Number(select.value),
          note: panel.querySelector("#cart-note").value, expectedTotal: Number(panel.dataset.total) }),
      });
      const order = await response.json();
      if (!response.ok) throw new Error(order.error ?? "Could not submit your order.");
      orderId = undefined;
      cart.clear();
      try { saveCart(); } catch {}
      form.reset();
      renderCart(products, panel);
      result.textContent = "Order request " + order.id + " received. Wait for payment instructions before sending funds.";
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

(async () => {
  try {
    const response = await fetch("/api/catalog-products", { cache: "no-store" });
    if (!response.ok) throw new Error("Catalog unavailable");
    const products = await response.json();
    const grid = document.querySelector("[data-category]");
    if (grid) {
      showCatalog(products, grid);
      document.querySelector(".catalog-toolbar a").addEventListener("click", (event) => {
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
