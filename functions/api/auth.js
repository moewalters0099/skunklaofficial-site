const ORIGIN = "https://skunklaofficial.com";
const CLIENT_ID_KEY = "GITHUB_CLIENT_ID";
const COOKIE = "skunkla_oauth_state";
export async function onRequestGet({ request, env }) {
  if (!env[CLIENT_ID_KEY] || !env.GITHUB_CLIENT_SECRET) {
    return new Response("Admin authentication has not been configured.", {status:503,headers:{"Cache-Control":"no-store"}});
  }
  const url = new URL(request.url);
  if (url.origin !== ORIGIN) return new Response("Invalid origin", {status:400});
  const state = [...crypto.getRandomValues(new Uint8Array(32))].map(b=>b.toString(16).padStart(2,"0")).join("");
  const destination = new URL("https://github.com/login/oauth/authorize");
  destination.searchParams.set("client_id", env[CLIENT_ID_KEY]);
  destination.searchParams.set("redirect_uri", ORIGIN + "/api/callback");
  destination.searchParams.set("state", state);
  destination.searchParams.set("scope", "repo");
  return new Response(null,{status:302,headers:{
    Location:destination.toString(),
    "Set-Cookie":COOKIE+"="+state+"; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=600",
    "Cache-Control":"no-store",
    "Referrer-Policy":"no-referrer"
  }});
}
