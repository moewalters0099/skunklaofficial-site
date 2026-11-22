export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT id, details FROM admin_records WHERE kind = 'products' AND json_extract(details, '$.status') = 'active' ORDER BY updated_at DESC, id"
  ).all();
  const products = results.map(({ id, details }) => {
    const { name, sku, category, subcategory, description, price, stock, photo_url, photo_url_2, photo_url_3, photo_url_4, video_url } = JSON.parse(details);
    return { id, name, sku, category, subcategory, description, price, stock, photo_url, photo_url_2, photo_url_3, photo_url_4, video_url };
  });
  return Response.json(products, { headers: { "Cache-Control": "no-store" } });
}
