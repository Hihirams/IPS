import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");
dotenv.config({ path: path.join(root, ".env") });
const base = "http://localhost:4000";
const jar = new Map();
async function request(method, urlPath, body) {
  const headers = { "Content-Type": "application/json" };
  const csrf = jar.get("csrf");
  if (csrf) headers["x-csrf-token"] = csrf;
  const cookie = Array.from(jar.entries()).filter(([k]) => k !== "csrf").map(([k,v]) => `${k}=${v}`).join("; ");
  if (cookie) headers.Cookie = cookie;
  const fetchBody = method === "GET" || method === "HEAD" ? undefined : JSON.stringify(body !== undefined ? body : {});
  const res = await fetch(base + urlPath, { method, headers, body: fetchBody });
  const setCookie = res.headers.getSetCookie?.() || [];
  for (const c of setCookie) { const [pair] = c.split(";"); const [k,v]=pair.split("="); if(k&&v) jar.set(k.trim(),v.trim()); }
  const text = await res.text();
  const json = JSON.parse(text);
  if (!res.ok) throw new Error(method+" "+urlPath+" "+res.status);
  return json;
}
const csrf = await request("GET", "/api/auth/csrf-token");
jar.set("csrf", csrf.csrfToken);
await request("POST", "/api/auth/login", { email: "admin@ecommerce.com", password: "AdminSecure123!" });
const prod = await request("POST", "/api/admin/sync/products", { categoryId: "22", maxPages: 2 });
console.log(JSON.stringify(prod.data));