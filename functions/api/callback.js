const ORIGIN = "https://skunklaofficial.com";
const COOKIE = "skunkla_oauth_state";
const NO_STORE = {"Cache-Control":"no-store","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff"};
function fail(message,status=400){return new Response(message,{status,headers:{"Content-Type":"text/plain; charset=utf-8",...NO_STORE}});}
export async function onRequestGet({request,env}) {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) return fail("Admin authentication has not been configured.",503);
  const url = new URL(request.url);
  if (url.origin !== ORIGIN) return fail("Invalid origin");
  const code=url.searchParams.get("code"), state=url.searchParams.get("state");
  const cookie=request.headers.get("Cookie")||"";
  const match=cookie.match(/(?:^|;\s*)skunkla_oauth_state=([0-9a-f]{64})(?:;|$)/);
  if (!code || !state || !match || !/^[0-9a-f]{64}$/.test(state) || match[1]!==state) return fail("Invalid or expired login request.");
  const headers={"Content-Type":"application/json","Accept":"application/json","User-Agent":"skunklaofficial-admin"};
  const exchange=await fetch("https://github.com/login/oauth/access_token",{
    method:"POST",headers,
    body:JSON.stringify({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,code,state,redirect_uri:ORIGIN+"/api/callback"})
  });
  if (!exchange.ok) return fail("GitHub authentication failed.",502);
  const tokenResult=await exchange.json();
  if (!tokenResult.access_token) return fail("GitHub did not authorize this login.",403);
  const who=await fetch("https://api.github.com/user",{headers:{Authorization:"Bearer "+tokenResult.access_token,Accept:"application/vnd.github+json","User-Agent":"skunklaofficial-admin"}});
  if (!who.ok) return fail("Could not verify GitHub account.",502);
  const user=await who.json();
  if (user.login!=="moewalters0099") return fail("This GitHub account is not authorized for SKUNKLA administration.",403);
  const payload=JSON.stringify({token:tokenResult.access_token,provider:"github"}).replace(/</g,"\\u003c");
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>Completing sign-in</title></head><body><p>Completing secure sign-in…</p><script>
  const payload=${payload};
  if(window.opener){window.opener.postMessage("authorization:github:success:"+JSON.stringify(payload),${JSON.stringify(ORIGIN)});window.close();}
  else document.body.textContent="Return to the SKUNKLA editor and try signing in again.";
  </script></body></html>`;
  return new Response(html,{headers:{"Content-Type":"text/html; charset=utf-8",...NO_STORE,"Set-Cookie":COOKIE+"=; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=0","Content-Security-Policy":"default-src 'none'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"}});
}
