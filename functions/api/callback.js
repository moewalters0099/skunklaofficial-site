// Reserved OAuth callback endpoint for SKUNKLA's future admin authentication.
// Never accept authorization codes or exchange tokens until a secure OAuth
// implementation with CSRF state verification and server-side secrets exists.
export async function onRequestGet() {
  return new Response("SKUNKLA admin authentication is not yet enabled.", {
    status: 503,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer"
    }
  });
}
