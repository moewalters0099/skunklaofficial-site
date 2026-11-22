(() => {
  const configurations = {
    products: {
      section: "products", noun: "product",
      fields: [["name", "Product name", 120], ["sku", "SKU", 80], ["category", "Category", 80],
        ["price", "Price (USD)", 12, "decimal"], ["stock", "Stock units", 9, "numeric"], ["photo_url", "Photo URL (optional)", 2048, "url"], ["video_url", "Video URL (optional)", 2048, "url"]],
    },
    payments: {
      section: "payments", noun: "payment method",
      fields: [["name", "Asset name", 120], ["network", "Network", 80], ["address", "Public wallet address", 256]],
    },
  };
  const dialog = document.querySelector("#record-dialog");
  const form = document.querySelector("#record-form");
  const feedback = document.querySelector("#record-feedback");
  const search = document.querySelector("#product-search");
  const submit = form.querySelector('button[type="submit"]');
  const data = {};
  let editing;

  function node(tag, content) {
    const element = document.createElement(tag);
    element.textContent = content;
    return element;
  }

  function open(kind, record) {
    editing = { kind, id: record?.id ?? null };
    const configuration = configurations[kind];
    document.querySelector("#record-title").textContent = (record ? "Edit " : "Add ") + configuration.noun;
    const fields = document.querySelector("#record-fields");
    fields.replaceChildren();
    for (const [key, title, maxLength, inputMode] of configuration.fields) {
      const label = node("label", title);
      label.htmlFor = "record-" + key;
      const input = document.createElement("input");
      input.id = label.htmlFor;
      input.name = key;
      input.maxLength = maxLength;
      input.required = inputMode !== "url";
      if (inputMode === "url") {
        input.type = "url";
        input.placeholder = "Direct HTTPS link";
      } else if (inputMode) input.inputMode = inputMode;
      input.value = record?.[key] ?? "";
      fields.append(label, input);
    }
    form.elements.status.value = record?.status ?? "inactive";
    feedback.textContent = "";
    dialog.showModal();
  }

  function editButton(kind, record) {
    const button = node("button", "Edit");
    button.type = "button";
    button.setAttribute("aria-label", "Edit " + record.name);
    button.onclick = () => open(kind, record);
    return button;
  }

  function render(kind) {
    const list = document.querySelector("#" + kind + "-list");
    const query = search.value.trim().toLowerCase();
    const records = kind === "products"
      ? data[kind].filter((item) => [item.name, item.sku, item.category].some((value) => value.toLowerCase().includes(query)))
      : data[kind];
    const rows = records.map((record) => {
      if (kind === "payments") {
        const card = node("li", "");
        const address = node("code", record.address);
        card.append(node("h2", record.name), node("p", record.network + " · " + record.status), address, editButton(kind, record));
        return card;
      }
      const row = node("tr", "");
      const product = node("td", record.name);
      product.append(node("small", record.sku));
      if (record.photo_url?.startsWith("https://")) {
        const photo = document.createElement("img");
        photo.src = record.photo_url;
        photo.alt = "";
        photo.width = 48;
        photo.height = 48;
        photo.style.objectFit = "cover";
        photo.loading = "lazy";
        product.append(photo);
      }
      if (record.video_url?.startsWith("https://")) {
        const video = node("a", "Open video");
        video.href = record.video_url;
        video.target = "_blank";
        video.rel = "noopener noreferrer";
        product.append(node("br", ""), video);
      }
      const actions = node("td", "");
      actions.append(editButton(kind, record));
      const price = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(record.price));
      row.append(product, node("td", record.category), node("td", price),
        node("td", record.stock), node("td", record.status), actions);
      return row;
    });
    list.replaceChildren(...rows);
    document.querySelector("#" + kind + "-status").textContent = rows.length
      ? records.length + (records.length === 1 ? " record" : " records")
      : "No " + configurations[kind].noun + " records to display.";
  }

  async function load(kind) {
    const status = document.querySelector("#" + kind + "-status");
    status.textContent = "Loading…";
    try {
      data[kind] = await api("/api/admin-records?kind=" + kind);
      render(kind);
    } catch (error) {
      status.textContent = error.message;
    }
  }

  function onView() {
    const kind = location.hash.slice(1);
    if (Object.hasOwn(configurations, kind) && !document.querySelector("#workspace").hidden) void load(kind);
  }
  window.addEventListener("hashchange", onView);
  document.addEventListener("dashboard-ready", onView);
  search.addEventListener("input", () => { if (data.products) render("products"); });
  for (const kind of Object.keys(configurations)) {
    document.querySelector("#" + kind + "-add").onclick = () => open(kind);
  }
  document.querySelector("#record-cancel").onclick = () => { if (!submit.disabled) dialog.close(); };
  dialog.addEventListener("cancel", (event) => { if (submit.disabled) event.preventDefault(); });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const { kind, id } = editing;
    submit.disabled = true;
    feedback.textContent = "Saving…";
    try {
      await api("/api/admin-records?kind=" + kind, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(new FormData(form)), id }),
      });
      dialog.close();
      await load(kind);
    } catch (error) {
      feedback.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  });
})();
