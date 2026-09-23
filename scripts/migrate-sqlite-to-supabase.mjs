import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const config = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/)
  .filter((line) => line && !line.startsWith("#") && line.includes("="))
  .map((line) => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1)]; }));
const url = config.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const key = config.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local.");
const sqlite = new DatabaseSync("data/lemail-studio.db", { readOnly: true });
// Authentication sessions and OTP challenges are intentionally never migrated.
// Users will authenticate again after the application is switched to Supabase.
const tables = ["studios", "professionals", "services", "appointments", "public_testimonials"];
const jsonColumns = new Set(["settings_json", "availability_json"]);

for (const table of tables) {
  const rows = sqlite.prepare(`SELECT * FROM ${table}`).all().map((row) => {
    const record = { ...row };
    for (const column of jsonColumns) if (typeof record[column] === "string") record[column] = JSON.parse(record[column] || "{}");
    if (table === "services") record.active = Boolean(record.active);
    return record;
  });
  if (!rows.length) continue;
  const response = await fetch(`${url}/rest/v1/${table}?on_conflict=id`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!response.ok) throw new Error(`${table}: ${response.status} ${await response.text()}`);
  console.log(`${table}: ${rows.length} registro(s) migrado(s)`);
}
sqlite.close();
