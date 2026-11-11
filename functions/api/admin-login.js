// Fail closed until independent administrator identity, password hashing,
// session storage, rate limiting and protected publishing endpoints are configured.
// Do not replace this with client-side password checks.
export async function onRequestPost(){return new Response(JSON.stringify({error:'Administrator password login is not yet activated.'}),{status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
