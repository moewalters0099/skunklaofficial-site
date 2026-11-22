export function mediaUrl(value = "") {
  if (typeof value !== "string" || value.length > 2048) return null;
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}
