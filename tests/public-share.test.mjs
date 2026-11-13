// End-to-end check of event sharing, as seen by someone who is NOT logged in.
//
// Runs against a running app (local `next start` or production) and sends
// requests without any cookies, exactly like a parent opening a shared link.
//
//   npm run test:share                                  -> http://localhost:3000
//   SHARE_TEST_BASE_URL=https://vistiller.com npm run test:share
//
// The share token is taken from SHARE_TEST_TOKEN, or looked up in Supabase with
// the keys in .env.local (first event that is not archived). Nothing secret or
// personal is printed.

import assert from "node:assert/strict";
import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const BASE = (process.env.SHARE_TEST_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
const SECRET = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

async function findToken() {
  if (process.env.SHARE_TEST_TOKEN) return process.env.SHARE_TEST_TOKEN;
  assert.ok(SUPABASE_URL && SECRET, "Sett SHARE_TEST_TOKEN, eller Supabase-nøklene i .env.local.");
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/events?select=public_token&status=neq.archived&order=created_at.desc&limit=1`,
    { headers: { apikey: SECRET } },
  );
  assert.equal(res.status, 200, "Kunne ikke slå opp et arrangement i Supabase.");
  const rows = await res.json();
  assert.ok(rows.length > 0, "Det finnes ingen arrangementer å teste med. Opprett ett først.");
  return rows[0].public_token;
}

/** Anonymous request: no cookies, redirects are not followed. */
const get = (path) => fetch(`${BASE}${path}`, { redirect: "manual", headers: { accept: "text/html" } });

/**
 * What the visitor ends up seeing. The texts of not-found.tsx and error.tsx are
 * shipped with every page, so the outcome is read from the markers Next streams
 * when a boundary is actually triggered, not from the texts themselves.
 */
function outcome(html) {
  if (html.includes("NEXT_HTTP_ERROR_FALLBACK;404")) return "not-found";
  if (/E{\\"digest\\":\\"d+/.test(html)) return "server-error";
  if (html.includes("Lenken er ikke gyldig")) return "invalid-link";
  return "ok";
}

let passed = 0;
let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed++;
    console.error(`  ✗ ${name}\n    ${error.message}`);
  }
}

console.log(`Deling av arrangement uten innlogging – ${BASE}`);
const token = await findToken();
let event;

await test("API-et gir arrangementet og bidragslisten uten innlogging", async () => {
  const res = await fetch(`${BASE}/api/v1/events/${token}`);
  assert.equal(res.status, 200, `forventet 200, fikk ${res.status}`);
  event = await res.json();
  assert.equal(event.token, token);
  assert.ok(event.title);
  assert.ok(Array.isArray(event.items));
  // The public JSON must never carry contact details.
  assert.doesNotMatch(JSON.stringify(event), /contributor_(email|phone|name)|edit_token|ip_hash/);
});

await test("delingslenken /a/[token] åpnes uten innlogging og viser bidragslisten", async () => {
  const res = await get(`/a/${token}`);
  assert.equal(res.status, 200, `forventet 200, fikk ${res.status} (location: ${res.headers.get("location")})`);
  const html = await res.text();
  assert.equal(outcome(html), "ok");
  assert.ok(event, "API-testen må bestå først");
  assert.ok(html.includes(escapeHtml(event.title)), "tittelen på arrangementet mangler");
  for (const item of event.items) {
    assert.ok(html.includes(escapeHtml(item.name)), "et bidrag i listen mangler på siden");
  }
});

await test("oversikten /a/[token]/oversikt åpnes uten innlogging", async () => {
  const res = await get(`/a/${token}/oversikt`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.equal(outcome(html), "ok");
  assert.ok(html.includes(escapeHtml(event.title)));
});

await test("ukjent token gir «fant ikke», ikke serverfeil", async () => {
  const html = await (await get("/a/ukjentTokenAbc123")).text();
  assert.equal(outcome(html), "not-found");
  assert.equal((await fetch(`${BASE}/api/v1/events/ukjentTokenAbc123`)).status, 404);
});

await test("ufullstendig lenke gir egen melding om ugyldig lenke", async () => {
  const html = await (await get("/a/kort")).text();
  assert.equal(outcome(html), "invalid-link");
  assert.equal((await fetch(`${BASE}/api/v1/events/kort`)).status, 400);
});

await test("offentlige sider sender ikke til innlogging", async () => {
  for (const path of [`/a/${token}`, `/a/${token}/oversikt`]) {
    const res = await get(path);
    assert.ok(res.status < 300 || res.status >= 400, `${path} ga redirect til ${res.headers.get("location")}`);
  }
});

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}

console.log(`\n${passed} bestått, ${failed} feilet`);
process.exit(failed ? 1 : 0);
