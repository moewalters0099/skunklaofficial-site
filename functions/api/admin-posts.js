import { mediaUrl } from "../_shared/media-url.js";
import { onRequestGet as checkSession } from "./admin-session.js";

const json = (data, status = 200) => Response.json(data, {
  status, headers: { "Cache-Control": "no-store" },
});

export async function onRequestGet(context) {
  const session = await checkSession(context);
  if (!session.ok) return session;
  const { results } = await context.env.DB.prepare(
    "SELECT * FROM blog_posts ORDER BY updated_at DESC"
  ).all();
  return json(results);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (request.headers.get("Origin") !== new URL(request.url).origin) {
    return json({ error: "Open the editor on the website." }, 403);
  }
  const session = await checkSession(context);
  if (!session.ok) return session;

  const input = await request.json().catch(() => null);
  const { id, title, summary, body, action } = input ?? {};
  const photoUrl = mediaUrl(input?.photo_url);
  const videoUrl = mediaUrl(input?.video_url);
  if (photoUrl === null || videoUrl === null) return json({ error: "Use direct HTTPS links for media." }, 400);
  if (
    (id != null && (typeof id !== "string" || !/^[a-f0-9-]{36}$/.test(id))) ||
    typeof title !== "string" || !title.trim() || title.length > 160 ||
    typeof summary !== "string" || summary.length > 500 ||
    typeof body !== "string" || body.length > 50000 ||
    !["draft", "publish"].includes(action) || (action === "publish" && !body.trim() && !photoUrl && !videoUrl)
  ) return json({ error: "Enter a title and add text, a photo, or a video before publishing." }, 400);

  const now = new Date().toISOString();
  const publishedAt = action === "publish" ? now : null;
  const values = [title.trim(), summary.trim(), body.trim(), publishedAt, now, photoUrl, videoUrl];
  if (id) {
    const result = await env.DB.prepare(
      "UPDATE blog_posts SET title=?, summary=?, body=?, published_at=CASE WHEN ? IS NULL THEN NULL ELSE COALESCE(published_at, ?) END, updated_at=?, photo_url=?, video_url=? WHERE id=?"
    ).bind(...values.slice(0, 4), publishedAt, now, photoUrl, videoUrl, id).run();
    if (!result.meta.changes) return json({ error: "Post was not found." }, 404);
    return json({ id });
  }

  const postId = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO blog_posts (id,title,summary,body,published_at,updated_at,photo_url,video_url) VALUES (?,?,?,?,?,?,?,?)"
  ).bind(postId, ...values).run();
  return json({ id: postId }, 201);
}
