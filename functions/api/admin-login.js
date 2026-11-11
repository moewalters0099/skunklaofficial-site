const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store",...extra}});
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
async function hash(password,salt){const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveBits"]);return hex(await crypto.subtle.deriveBits({name:"PBKDF2",salt:new TextEncoder().encode(salt),iterations:310000,hash:"SHA-256"},key,256))}
async function equal(a,b){if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0}
export async function onRequestPost({request,env}){if(!env.DB)return json({error:"Database unavailable"},503);let input;try{input=await request.json()}catch{return json({error:"Invalid request"},400)}
const email=String(input.email||"").trim().toLowerCase(),password=input.password;if(typeof password!=="string"||password.length>128)return json({error:"Invalid credentials"},401);
const user=await env.DB.prepare("SELECT id,password_hash FROM admin_users WHERE email=?").bind(email).first();if(!user)return json({error:"Invalid credentials"},401);
const parts=user.password_hash.split(":");if(parts.length!==4||parts[0]!=="pbkdf2-sha256"||parts[1]!=="310000")return json({error:"Account requires password reset"},403);
const digest=await hash(password,parts[2]);if(!equal(digest,parts[3]))return json({error:"Invalid credentials"},401);
const token=hex(crypto.getRandomValues(new Uint8Array(32))),expiry=new Date(Date.now()+8*3600000).toISOString();await env.DB.prepare("INSERT INTO admin_sessions(id,user_id,expires_at) VALUES(?,?,?)").bind(token,user.id,expiry).run();return json({ok:true},200,{"Set-Cookie":"skunkla_admin="+token+"; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800"})}
}