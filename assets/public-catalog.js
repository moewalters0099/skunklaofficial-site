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

function showCart(products, root) {
  const available = new Map(products.map((product) => [product.id, product]));
  let subtotal = 0;
  const rows = [];
  for (const [id, qty] of cart) {
    const product = available.get(id);
    const remaining = Math.min(qty, Number(product?.stock ?? 0));
    const row = make("div", "");
    row.className = "item";
    if (remaining > 0) subtotal += remaining * cents(product);
    const name = product?.name ?? "Unavailable product";
    row.append(make("strong", name), make("span",
      remaining > 0 ? remaining + " × " + price(cents(product)) : "Unavailable"));
    if (remaining > 0 && remaining < qty) row.append(make("small", "Quantity adjusted to available stock."));
    const remove = make("button", "Remove");
    remove.type = "button";
    remove.setAttribute("aria-label", "Remove " + name);
    remove.onclick = () => {
      cart.delete(id);
      try {
        saveCart();
        showCart(products, root);
      } catch {
        cart.set(id, qty);
        document.querySelector("#catalog-message").textContent = "Your browser could not update the cart.";
      }
    };
    row.append(remove);
    rows.push(row);
  }
  root.replaceChildren(...rows);
  document.querySelector("#subtotal").textContent = price(subtotal);
  document.querySelector("#catalog-message").textContent = rows.length ? "" : "Your cart is empty.";
}

(async () => {
  try {
    const response = await fetch("/api/catalog-products", { cache: "no-store" });
    if (!response.ok) throw new Error("Catalog unavailable");
    const products = await response.json();
    const grid = document.querySelector("[data-category]");
    if (grid) showCatalog(products, grid);
    else showCart(products, document.querySelector("#items"));
  } catch {
    document.querySelector("#catalog-message").textContent = "Products could not be loaded. Refresh to try again.";
  }
})();
