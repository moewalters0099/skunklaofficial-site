const sourcePattern = /^https:\/\/skunkla\.com\/wp-content\/uploads\/(?:[a-z0-9_-]+\/)*[a-z0-9_.-]+\.mov$/i;

export async function queueProductVideo(env, kind, id) {
  if (kind !== "products") return;
  try {
    const row = await env.DB.prepare("SELECT details FROM admin_records WHERE id=? AND kind='products'").bind(id).first();
    if (!row) return;
    const { status, video_url: source } = JSON.parse(row.details);
    if (status !== "active" || !source || !sourcePattern.test(source)) return;
    if (!env.VIDEO_WORKFLOW_TOKEN) return "failed";
    const response = await fetch(
      "https://api.github.com/repos/moewalters0099/skunklaofficial-site/actions/workflows/convert-product-video.yml/dispatches",
      {
        method: "POST",
        signal: AbortSignal.timeout(5000),
        headers: {
          Authorization: "Bearer " + env.VIDEO_WORKFLOW_TOKEN,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "User-Agent": "SKUNKLA-Video-Workflow",
        },
        body: JSON.stringify({ ref: "main", inputs: { source } }),
      }
    );
    if (response.ok) return "queued";
    console.warn("Product video dispatch failed", response.status);
  } catch {
    console.warn("Product video dispatch unavailable");
  }
  return "failed";
}
