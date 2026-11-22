import { hashAdminPassword } from "../_shared/admin-password.js";

const EMAIL="moewalters0099@gmail.com";
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
const bytesToHex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
async function equal(a,b){const x=new TextEncoder().encode(a),y=new TextEncoder().encode(b);if(x.length!==y.length)return false;let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0}
export async function onRequestPost({request,env}){if(!env.DB||!env.ADMIN_SETUP_TOKEN||env.ADMIN_SETUP_TOKEN.length<32)return json({error:"Secure setup has not been configured."},503);let input;try{input=await request.json()}catch{return json({error:"Invalid request"},400)}
const {email,password,setupToken}=input||{};if(String(email).toLowerCase()!==EMAIL||typeof password!=="string"||password.length<14||password.length>128||typeof setupToken!=="string"||!await equal(setupToken,env.ADMIN_SETUP_TOKEN))return json({error:"Setup details are invalid."},403);
try {
const existing=await env.DB.prepare("SELECT id FROM admin_users LIMIT 1").first();if(existing)return json({error:"Administrator already exists. Setup is closed."},409);
const salt=bytesToHex(crypto.getRandomValues(new Uint8Array(24)));const password_hash="pbkdf2-sha256:310000:"+salt+":"+await hashAdminPassword(password,salt);
await env.DB.prepare("INSERT INTO admin_users (email,password_hash) VALUES (?,?)").bind(EMAIL,password_hash).run();return json({ok:true})}catch(error){console.error("Admin account creation failed",error?.name);return json({error:"Could not create administrator."},500)}
}
