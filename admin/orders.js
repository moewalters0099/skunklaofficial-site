(() => {
  const status = document.querySelector("#order-list-status");
  const list = document.querySelector("#order-list");
  const money = (cents) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
  const shippingNames = ["Standard", "Ground", "Priority", "Express"];
  const make = (tag, text) => {
    const element = document.createElement(tag);
    element.textContent = text;
    return element;
  };
  async function load() {
    if (location.hash !== "#orders" || document.querySelector("#workspace").hidden) return;
    status.textContent = "Loading order requests…";
    try {
      const orders = await api("/api/order-requests");
      list.replaceChildren(...orders.map((order) => {
        const card = make("article", "");
        card.className = "panel";
        card.append(make("h2", "Order " + order.id),
          make("p", order.created_at + " UTC · " + (order.status === "pending_payment" ? "Pending payment" : "Awaiting review")),
          make("p", "Email: " + order.email), make("p", "Shipping address: " + order.address),
          make("p", shippingNames[order.shippingIndex] + " shipping · " + money(order.fee)),
          make("p", (order.paymentMethods ?? [{ name: order.asset, network: order.network }]).map(({ name, network }) => name + " · " + network).join(", ")),
          make("p", "Estimated total: " + money(order.total)));
        const items = make("ul", "");
        items.append(...order.lines.map((line) => make("li", line.qty + " × " + line.name + " · " + money(line.unitPrice) + " each")));
        card.append(items);
        if (order.note) card.append(make("p", "Customer note: " + order.note));
        return card;
      }));
      status.textContent = orders.length ? "Latest order requests" : "No order requests yet.";
    } catch (error) {
      status.textContent = error.message;
    }
  }
  window.addEventListener("hashchange", load);
  document.addEventListener("dashboard-ready", load);
})();
