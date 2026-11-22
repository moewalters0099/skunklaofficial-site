export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT id, title, summary, body, published_at, photo_url, video_url FROM blog_posts WHERE published_at IS NOT NULL ORDER BY published_at DESC, id DESC"
  ).all();
  return Response.json(results, { headers: { "Cache-Control": "no-store" } });
}
