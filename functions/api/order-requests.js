import { onRequestGet as checkSession } from "./admin-session.js";

const shipping = [3500, 5000, 10000, 20000];
const json = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;

function publicWallets(rows) {
  return rows.map(({ details }) => {
    const { name, network, address, qr_image } = JSON.parse(details);
    return { name, network, address, qr_image };
  });
}

async function checkoutResult(env, id, status = 200) {
  const order = await env.DB.prepare("SELECT details FROM order_requests WHERE id=?").bind(id).first();
  const { total } = JSON.parse(order.details);
  const { results } = await env.DB.prepare(
    "SELECT details FROM admin_records WHERE kind='payments' AND json_extract(details,'$.status')='active' ORDER BY updated_at DESC,id"
  ).all();
  return json({ id, total, wallets: publicWallets(results) }, status);
}

export async function onRequestGet(context) {
  const session = await checkSession(context);
  if (!session.ok) return session;
  const { results } = await context.env.DB.prepare(
    "SELECT id,details,created_at FROM order_requests ORDER BY created_at DESC LIMIT 100"
  ).all();
  return json(results.map(({ id, details, created_at }) => ({ id, created_at, ...JSON.parse(details) })));
}

export async function onRequestPost({ request, env }) {
  if (request.headers.get("Origin") !== new URL(request.url).origin) return json({ error: "Use the site's checkout." }, 403);
  const input = await request.json().catch(() => null);
  const { id, items, shippingIndex, email, address, note, expectedTotal } = input ?? {};
  if (typeof id !== "string" || !uuid.test(id) || !Array.isArray(items) || !items.length ||
      items.length > 40 || !Number.isInteger(shippingIndex) || shipping[shippingIndex] === undefined ||
      typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof address !== "string" || !address.trim() || address.length > 500 ||
      typeof note !== "string" || note.length > 500 || !Number.isSafeInteger(expectedTotal)) {
    return json({ error: "Check your cart, email and shipping address." }, 400);
  }
  if (items.some((item) => !item || typeof item.id !== "string" || !uuid.test(item.id) ||
      !Number.isSafeInteger(item.qty) || item.qty < 1 ||
      (item.weight !== undefined && !["Ounce", "Quarter Pound", "Half Pound", "Pound"].includes(item.weight))) ||
      new Set(items.map((item) => item.id + "|" + (item.weight ?? ""))).size !== items.length) {
    return json({ error: "One or more cart items are invalid." }, 400);
  }
  const contact = {};
  for (const [key, max] of [["firstName",80],["lastName",80],["phone",40]]) {
    const value = input[key];
    if (value === undefined) continue;
    if (typeof value !== "string" || value.length > max || (key !== "phone" && !value.trim())) {
      return json({ error: "Check the name and phone fields." }, 400);
    }
    contact[key] = value.trim();
  }
  const previous = await env.DB.prepare("SELECT id FROM order_requests WHERE id=?").bind(id).first();
  if (previous) return checkoutResult(env, id);

  const { results } = await env.DB.prepare(
    "SELECT id,kind,details FROM admin_records WHERE json_extract(details,'$.status')='active' AND (kind='payments' OR (kind='products' AND id IN (" +
    items.map(() => "?").join(",") + "))) ORDER BY updated_at DESC,id"
  ).bind(...items.map((item) => item.id)).all();
  const methods = results.filter(({ kind }) => kind === "payments");
  if (!methods.length) return json({ error: "Payment is temporarily unavailable." }, 503);

  const products = new Map(results.filter(({ kind }) => kind === "products")
    .map(({ id: productId, details }) => [productId, JSON.parse(details)]));
  const lines = [];
  let subtotal = 0;
  const quantities = new Map();
  for (const item of items) {
    const product = products.get(item.id);
    const quantity = (quantities.get(item.id) ?? 0) + item.qty;
    if (!product || quantity > Number(product.stock)) return json({ error: "Stock changed. Refresh your cart and check the quantities." }, 409);
    quantities.set(item.id, quantity);
    const amount = product.weightPrices ? product.weightPrices[item.weight] : item.weight ? undefined : product.price;
    if (amount === undefined) return json({ error: "A weight option changed. Refresh your cart and choose an available weight." }, 409);
    const unitPrice = Math.round(Number(amount) * 100);
    subtotal += unitPrice * item.qty;
    lines.push({ name: item.weight ? product.name + " · " + item.weight : product.name, qty: item.qty, unitPrice });
  }
  const fee = shipping[shippingIndex];
  const total = subtotal + fee;
  if (!Number.isSafeInteger(total) || total !== expectedTotal) {
    return json({ error: "The total changed. Refresh the cart to review the new price." }, 409);
  }
  const details = { ...contact, lines, subtotal, fee, total, shippingIndex, email: email.trim(), address: address.trim(), note: note.trim(), status: "pending_payment", paymentMethods: methods.map(({ details }) => {
    const { name, network } = JSON.parse(details);
    return { name, network };
  }) };
  await env.DB.prepare("INSERT INTO order_requests (id,details) VALUES (?,?) ON CONFLICT(id) DO NOTHING")
    .bind(id, JSON.stringify(details)).run();
  return checkoutResult(env, id, 201);
}
