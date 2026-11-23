(() => {
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const products = new Map();
  const collections = { wishlist: "Wishlist", compare: "Compare" };
  const lists = Object.fromEntries(Object.keys(collections).map((key) => {
    try {
      const items = JSON.parse(localStorage.getItem("skunkla-" + key) ?? "[]");
      return [key, new Set(Array.isArray(items) ? items.filter((id) => typeof id === "string") : [])];
    } catch {
      return [key, new Set()];
    }
  }));
  const dialog = document.createElement("dialog");
  dialog.className = "product-action-dialog";
  dialog.setAttribute("aria-labelledby", "product-action-title");
  const title = node("h2", "");
  title.id = "product-action-title";
  const content = node("div", "");
  const close = button("Close", () => dialog.close());
  const bar = node("nav", "");
  bar.className = "product-action-bar";
  bar.setAttribute("aria-label", "Saved products");
  const summary = {};
  const header = document.querySelector("[data-product-actions-header]");
  const status = node("span", "");
  status.setAttribute("role", "status");
  const buttons = new Map();
  let active;
  dialog.append(close, title, content);
  document.body.append(dialog);
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  for (const key of Object.keys(collections)) {
    summary[key] = button("", () => showList(key));
    bar.append(summary[key]);
  }
  if (header) {
    bar.classList.add("product-action-bar-header");
    status.className = "sr-only";
  }
  bar.append(status);

  function node(tag, text) {
    const element = document.createElement(tag);
    element.textContent = text;
    return element;
  }
  function button(text, action) {
    const control = node("button", text);
    control.type = "button";
    control.addEventListener("click", action);
    return control;
  }
  function name(product) {
    return product.displayName || [product.name, product.sku].filter(Boolean).join(" – ");
  }
  function availability(product) {
    return product.stock === null || Number(product.stock) > 0 ? "Available" : "Sold out";
  }
  function pricing(product) {
    const prices = [Number(product.price), ...Object.values(product.weightPrices ?? {}).map(Number)];
    const low = Math.min(...prices);
    const high = Math.max(...prices);
    return low === high ? money.format(low) : money.format(low) + " – " + money.format(high);
  }
  function detailLink(product) {
    const link = node("a", "View product");
    link.href = "/product?id=" + encodeURIComponent(product.id);
    return link;
  }
  function open(label, elements) {
    title.textContent = label;
    content.replaceChildren(...elements);
    if (!dialog.open) dialog.showModal();
  }
  function quickView(product) {
    active = undefined;
    const elements = [];
    if (product.photo_url?.startsWith("https://")) {
      const photo = node("img", "");
      photo.className = "product-quick-photo";
      photo.src = product.photo_url;
      photo.alt = name(product);
      elements.push(photo);
    }
    elements.push(node("p", pricing(product) + " · " + availability(product)));
    if (product.weightPrices) {
      const weights = node("ul", "");
      for (const [weight, price] of Object.entries(product.weightPrices)) {
        weights.append(node("li", weight + " · " + money.format(Number(price))));
      }
      elements.push(weights);
    }
    if (product.description) {
      const description = node("p", product.description);
      description.className = "product-quick-description";
      elements.push(description);
    }
    elements.push(detailLink(product));
    open(name(product), elements);
  }
  function showList(key) {
    active = key;
    const list = [...lists[key]];
    if (!list.length) {
      open(collections[key], [node("p", key === "compare" ? "Choose products to compare." : "Your wishlist is empty.")]);
      return;
    }
    const grid = node("div", "");
    grid.className = "product-saved-grid";
    for (const id of list) {
      const product = products.get(id);
      const cell = node("article", "");
      cell.append(node("h3", product ? name(product) : "Product unavailable"));
      if (product) {
        cell.append(node("p", product.category), node("p", pricing(product)), node("p", availability(product)));
        if (product.weightPrices) {
          const sizes = node("ul", "");
          for (const [weight, price] of Object.entries(product.weightPrices)) {
            sizes.append(node("li", weight + " · " + money.format(Number(price))));
          }
          cell.append(sizes);
        }
        cell.append(detailLink(product));
      }
      const remove = button("Remove", () => toggle(key, id));
      remove.setAttribute("aria-label", "Remove " + (product ? name(product) : "unavailable product"));
      cell.append(remove);
      grid.append(cell);
    }
    open(collections[key], [grid]);
  }
  function refresh() {
    for (const key of Object.keys(collections)) {
      const label = collections[key] + " (" + lists[key].size + ")";
      summary[key].textContent = header ? (key === "wishlist" ? "☆" : "⇄") : label;
      summary[key].setAttribute("aria-label", label);
      summary[key].title = collections[key];
    }
    for (const [control, { key, id }] of buttons) {
      if (!control.isConnected) {
        buttons.delete(control);
        continue;
      }
      control.setAttribute("aria-pressed", String(lists[key].has(id)));
    }
  }
  function toggle(key, id) {
    if (lists[key].has(id)) {
      lists[key].delete(id);
    } else {
      if (key === "compare" && lists[key].size >= 4) {
        status.textContent = "You can compare up to four products.";
        return;
      }
      lists[key].add(id);
    }
    status.textContent = lists[key].has(id) ? "Added to " + collections[key].toLowerCase() + "." : "Removed from " + collections[key].toLowerCase() + ".";
    try {
      localStorage.setItem("skunkla-" + key, JSON.stringify([...lists[key]]));
    } catch {
      status.textContent += " This browser could not save your selection between visits.";
    }
    refresh();
    if (dialog.open && active === key) {
      showList(key);
      close.focus();
    }
  }
  window.storeProductActions = {
    mount(items, anchor) {
      for (const item of items) products.set(item.id, item);
      if (!bar.isConnected) {
        if (header) header.append(bar);
        else anchor.before(bar);
      }
      refresh();
    },
    controls(product) {
      const group = node("div", "");
      group.className = "product-card-actions";
      for (const [key, label, icon] of [["wishlist", "Add to wishlist", "☆"], ["compare", "Compare", "⇄"], ["quick", "Quick view", "◉"]]) {
        const control = button(icon, () => key === "quick" ? quickView(product) : toggle(key, product.id));
        control.title = label;
        control.setAttribute("aria-label", label + " · " + name(product));
        if (key !== "quick") {
          control.setAttribute("aria-pressed", String(lists[key].has(product.id)));
          buttons.set(control, { key, id: product.id });
        }
        group.append(control);
      }
      return group;
    },
  };
})();
