import { mediaUrl } from "../_shared/media-url.js";
import { onRequestGet as checkSession } from "./admin-session.js";

const json = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const fields = {
  products: { name: 120, sku: 80, category: 80, price: 12, stock: 9, status: 8 },
  payments: { name: 120, network: 80, address: 256, status: 8 },
};

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;
  if (!["GET", "POST"].includes(method)) return json({ error: "Method unavailable." }, 405);
  const url = new URL(request.url);
  if (method === "POST" && request.headers.get("Origin") !== url.origin) {
    return json({ error: "Open the editor on your website." }, 403);
  }
  const session = await checkSession(context);
  if (!session.ok) return session;
  const kind = url.searchParams.get("kind");
  if (!Object.hasOwn(fields, kind)) return json({ error: "Unknown record type." }, 400);

  if (method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT id, details FROM admin_records WHERE kind=? ORDER BY updated_at DESC, id"
    ).bind(kind).all();
    return json(results.map(({ id, details }) => ({ id, ...JSON.parse(details) })));
  }
  const input = await request.json().catch(() => null);
  const id = input?.id;
  if (id != null && (typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id))) {
    return json({ error: "Invalid record ID." }, 400);
  }
  const details = {};
  for (const [field, limit] of Object.entries(fields[kind])) {
    const value = input?.[field];
    if (typeof value !== "string" || !value.trim() || value.length > limit) {
      return json({ error: "Check the " + field + " field." }, 400);
    }
    details[field] = value.trim();
  }
  if (!["active", "inactive"].includes(details.status)) return json({ error: "Choose a valid status." }, 400);
  if (kind === "products" && (!/^\d{1,9}(\.\d{1,2})?$/.test(details.price) || !/^\d{1,9}$/.test(details.stock))) {
    return json({ error: "Enter a USD price and a whole-number stock count." }, 400);
  }
  if (kind === "products") {
    for (const field of ["photo_url", "video_url"]) {
      const value = mediaUrl(input?.[field]);
      if (value === null) return json({ error: "Use direct HTTPS links for product media." }, 400);
      details[field] = value;
    }
  }
  const now = new Date().toISOString();
  if (id) {
    const updated = await env.DB.prepare("UPDATE admin_records SET details=?, updated_at=? WHERE id=? AND kind=?")
      .bind(JSON.stringify(details), now, id, kind).run();
    if (!updated.meta.changes) return json({ error: "Record was not found." }, 404);
    return json({ id });
  }
  const newId = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO admin_records (id,kind,details,updated_at) VALUES (?,?,?,?)")
    .bind(newId, kind, JSON.stringify(details), now).run();
  return json({ id: newId }, 201);
}
