import { onRequestGet as checkSession } from "./admin-session.js";
import { hashAdminPassword, passwordHashScheme } from "../_shared/admin-password.js";

const json = (body, status = 200) => Response.json(body, {
  status,
  headers: { "Cache-Control": "no-store" },
});

export async function onRequestGet(context) {
  const session = await checkSession(context);
  if (!session.ok) return session;
  const { results } = await context.env.DB.prepare(
    "SELECT email, created_at FROM admin_users ORDER BY email"
  ).all();
  return json(results);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (request.headers.get("Origin") !== new URL(request.url).origin) {
    return json({ error: "Open the dashboard on the website." }, 403);
  }
  const session = await checkSession(context);
  if (!session.ok) return session;

  const input = await request.json().catch(() => null);
  const email = typeof input?.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = input?.password;
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof password !== "string" || password.length < 14 || password.length > 128) {
    return json({ error: "Enter an email and a password of 14 to 128 characters." }, 400);
  }

  const salt = crypto.randomUUID().replaceAll("-", "");
  const digest = await hashAdminPassword(password, salt);
  const result = await env.DB.prepare(
    "INSERT INTO admin_users (email,password_hash) VALUES (?,?) ON CONFLICT(email) DO NOTHING"
  ).bind(email, passwordHashScheme + ":" + salt + ":" + digest).run();
  if (!result.meta.changes) return json({ error: "An admin with this email already exists." }, 409);
  return json({ email }, 201);
}
