// Database tests for the Korpsfix schema.
//
// Runs the migration in an in-process Postgres (PGlite) with a minimal stub of
// the Supabase environment (auth schema, roles, auth.uid()) and verifies RLS,
// the public signup functions and the over-allocation guard.
//
//   npm run test:db

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "..", "migrations");

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text, created_at timestamptz default now());
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  create schema extensions;
  grant usage on schema extensions to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

const db = new PGlite({ extensions: { pgcrypto } });
await db.exec(SUPABASE_STUB);
for (const file of readdirSync(migrationsDir).sort()) {
  await db.exec(readFileSync(join(migrationsDir, file), "utf8"));
}
await db.exec(`grant all on all tables in schema public to service_role;`);

const U1 = "11111111-1111-1111-1111-111111111111";
const U2 = "22222222-2222-2222-2222-222222222222";
await db.exec(`insert into auth.users (id, email) values ('${U1}', 'a@x.no'), ('${U2}', 'b@x.no');`);

async function as(role, userId, fn) {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${userId ?? ""}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}
const q = async (sql, params) => (await db.query(sql, params)).rows;
const one = async (sql, params) => (await q(sql, params))[0];
async function rejects(promise, code) {
  await assert.rejects(promise, (err) => {
    assert.match(String(err.message), new RegExp(code));
    return true;
  });
}

let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    throw err;
  }
}

console.log("Korpsfix database tests");

let orgId, eventId, token, cakeId, waffleId, coffeeId;

await test("organizer creates organization, event and items", async () => {
  await as("authenticated", U1, async () => {
    orgId = (await one(`select public.create_organization('Solberg skolekorps') as id`)).id;
    const ev = await one(
      `insert into public.events (organization_id, title, event_date) values ($1, 'Loppemarked', '2027-04-24') returning id, public_token`,
      [orgId],
    );
    eventId = ev.id;
    token = ev.public_token;
    assert.equal(token.length, 16);
    const cat = await one(`insert into public.categories (event_id, name) values ($1, 'Kaker') returning id`, [eventId]);
    cakeId = (await one(
      `insert into public.items (event_id, category_id, name, target_quantity, unit) values ($1, $2, 'Sjokoladekake', 10, 'stk') returning id`,
      [eventId, cat.id],
    )).id;
    waffleId = (await one(
      `insert into public.items (event_id, name, target_quantity, unit) values ($1, 'Vaffelrøre', 20, 'liter') returning id`,
      [eventId],
    )).id;
    coffeeId = (await one(
      `insert into public.items (event_id, name, target_quantity, unit, allow_extra) values ($1, 'Kaffe', 2, 'poser', true) returning id`,
      [eventId],
    )).id;
  });
});

await test("other organizers cannot see or modify the organization", async () => {
  await as("authenticated", U2, async () => {
    assert.equal((await q(`select * from public.organizations`)).length, 0);
    assert.equal((await q(`select * from public.events`)).length, 0);
    assert.equal((await q(`select * from public.items`)).length, 0);
    await rejects(
      q(`insert into public.events (organization_id, title) values ($1, 'Hack')`, [orgId]),
      "row-level security",
    );
    const upd = await db.query(`update public.items set target_quantity = 1 where id = $1`, [cakeId]);
    assert.equal(upd.affectedRows, 0);
  });
});

await test("anonymous users cannot read tables or call public functions", async () => {
  await as("anon", null, async () => {
    await rejects(q(`select * from public.events`), "permission denied");
    await rejects(q(`select public.get_public_event($1)`, [token]), "permission denied");
  });
});

await test("public event view has items and no contact info", async () => {
  await as("service_role", null, async () => {
    const ev = (await one(`select public.get_public_event($1) as e`, [token])).e;
    assert.equal(ev.title, "Loppemarked");
    assert.equal(ev.items.length, 3);
    assert.equal(ev.items[0].allocated, 0);
    assert.equal((await one(`select public.get_public_event('wrong-token-123') as e`)).e, null);
  });
});

let editToken;
await test("parent signs up for several items", async () => {
  await as("service_role", null, async () => {
    const res = (await one(
      `select public.create_public_signup($1, 'Kari', 'kari@example.no', '+47 900 00 000', $2::jsonb, 'iphash') as r`,
      [token, JSON.stringify([{ item_id: cakeId, quantity: 6 }, { item_id: waffleId, quantity: 5 }])],
    )).r;
    editToken = res.edit_token;
    assert.equal(editToken.length, 32);
    const ev = (await one(`select public.get_public_event($1) as e`, [token])).e;
    assert.equal(ev.items.find((i) => i.id === cakeId).allocated, 6);
    assert.equal(ev.contributor_count, 1);
    assert.ok(!JSON.stringify(ev).includes("kari@example.no"));
    const stored = await one(`select edit_token_hash from public.signups`);
    assert.notEqual(stored.edit_token_hash, editToken);
  });
});

await test("over-allocation is rejected with remaining quantity", async () => {
  await as("service_role", null, async () => {
    await assert.rejects(
      q(`select public.create_public_signup($1, 'Ola', null, null, $2::jsonb)`, [
        token, JSON.stringify([{ item_id: cakeId, quantity: 5 }]),
      ]),
      (err) => {
        assert.match(err.message, /KF_NOT_ENOUGH_REMAINING/);
        assert.equal(JSON.parse(err.detail).remaining, 4);
        return true;
      },
    );
    // Nothing was written for the failed attempt.
    assert.equal((await one(`select count(*)::int as n from public.signups`)).n, 1);
    // Exactly the remaining amount works.
    await q(`select public.create_public_signup($1, 'Ola', null, null, $2::jsonb)`, [
      token, JSON.stringify([{ item_id: cakeId, quantity: 4 }]),
    ]);
  });
});

await test("allow_extra items accept more than the target", async () => {
  await as("service_role", null, async () => {
    await q(`select public.create_public_signup($1, 'Per', null, null, $2::jsonb)`, [
      token, JSON.stringify([{ item_id: coffeeId, quantity: 5 }]),
    ]);
  });
});

await test("invalid input is rejected", async () => {
  await as("service_role", null, async () => {
    const cases = [
      [" ", [{ item_id: cakeId, quantity: 1 }], "KF_INVALID_NAME"],
      ["A", [{ item_id: waffleId, quantity: -1 }], "KF_INVALID_QUANTITY"],
      ["A", [{ item_id: waffleId, quantity: 0 }], "KF_NO_ITEMS"],
      ["A", [], "KF_NO_ITEMS"],
      ["A", [{ item_id: "nope", quantity: 1 }], "KF_INVALID_ITEMS"],
      ["A", [{ item_id: U1, quantity: 1 }], "KF_ITEM_NOT_FOUND"],
      ["A", [{ item_id: waffleId, quantity: 1 }, { item_id: waffleId, quantity: 1 }], "KF_DUPLICATE_ITEM"],
    ];
    for (const [name, items, code] of cases) {
      await rejects(
        q(`select public.create_public_signup($1, $2, null, null, $3::jsonb)`, [token, name, JSON.stringify(items)]),
        code,
      );
    }
    await rejects(
      q(`select public.create_public_signup($1, 'A', 'not-an-email', null, $2::jsonb)`, [
        token, JSON.stringify([{ item_id: waffleId, quantity: 1 }]),
      ]),
      "KF_INVALID_EMAIL",
    );
  });
});

await test("parent edits own signup via edit token", async () => {
  await as("service_role", null, async () => {
    const before = (await one(`select public.get_signup_by_token($1) as s`, [editToken])).s;
    assert.equal(before.signup.contributor_name, "Kari");
    assert.equal(before.contributions.length, 2);
    // Cake is full (6 + 4). Kari cannot increase cakes...
    await rejects(
      q(`select public.update_public_signup($1, 'Kari', null, null, $2::jsonb)`, [
        editToken, JSON.stringify([{ item_id: cakeId, quantity: 7 }]),
      ]),
      "KF_NOT_ENOUGH_REMAINING",
    );
    // ...but can reduce cakes and drop waffles.
    await q(`select public.update_public_signup($1, 'Kari N.', null, null, $2::jsonb)`, [
      editToken, JSON.stringify([{ item_id: cakeId, quantity: 3 }]),
    ]);
    const after = (await one(`select public.get_signup_by_token($1) as s`, [editToken])).s;
    assert.equal(after.signup.contributor_name, "Kari N.");
    assert.deepEqual(after.contributions.map((c) => c.quantity), [3]);
    assert.equal((await one(`select public.get_signup_by_token('bogus') as s`)).s, null);
  });
});

await test("delivered contributions can't be changed by the parent", async () => {
  await as("authenticated", U1, async () => {
    await q(`update public.contributions set delivered_at = now() where item_id = $1 and quantity = 3`, [cakeId]);
  });
  await as("service_role", null, async () => {
    await rejects(q(`select public.cancel_public_signup($1)`, [editToken]), "KF_ALREADY_DELIVERED");
    await rejects(
      q(`select public.update_public_signup($1, 'Kari', null, null, $2::jsonb)`, [
        editToken, JSON.stringify([{ item_id: cakeId, quantity: 2 }]),
      ]),
      "KF_ALREADY_DELIVERED",
    );
  });
});

await test("closed events reject new signups; cancel works", async () => {
  await as("service_role", null, async () => {
    const r = (await one(`select public.create_public_signup($1, 'Lise', null, null, $2::jsonb) as r`, [
      token, JSON.stringify([{ item_id: waffleId, quantity: 2 }]),
    ])).r;
    await q(`select public.cancel_public_signup($1)`, [r.edit_token]);
    assert.equal((await one(`select public.get_signup_by_token($1) as s`, [r.edit_token])).s, null);
  });
  await as("authenticated", U1, async () => {
    await q(`update public.events set status = 'closed' where id = $1`, [eventId]);
  });
  await as("service_role", null, async () => {
    await rejects(
      q(`select public.create_public_signup($1, 'Sen', null, null, $2::jsonb)`, [
        token, JSON.stringify([{ item_id: waffleId, quantity: 1 }]),
      ]),
      "KF_EVENT_CLOSED",
    );
  });
});

await test("organizer can add manual contributions and sees contact info", async () => {
  await as("authenticated", U1, async () => {
    await q(`select public.add_manual_contribution($1, 'Bestemor', 15, null, '99999999')`, [waffleId]);
    const rows = await q(
      `select s.contributor_name, s.contributor_phone, c.quantity from public.contributions c
       join public.signups s on s.id = c.signup_id where c.item_id = $1`,
      [waffleId],
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].contributor_phone, "99999999");
  });
  await as("authenticated", U2, async () => {
    await rejects(q(`select public.add_manual_contribution($1, 'X', 1)`, [waffleId]), "KF_NOT_FOUND|row-level security");
  });
});

await test("organizer cannot forge edit tokens or move events", async () => {
  await as("authenticated", U1, async () => {
    await rejects(q(`update public.signups set edit_token_hash = 'x'`), "permission denied");
    await rejects(q(`update public.events set public_token = 'aaaaaaaaaaaaaaaa'`), "permission denied");
    const newToken = (await one(`select public.regenerate_event_token($1) as t`, [eventId])).t;
    assert.notEqual(newToken, token);
  });
});

await test("organizer cannot read ip hashes or edit token hashes", async () => {
  await as("authenticated", U1, async () => {
    await rejects(q(`select ip_hash from public.signups`), "permission denied");
    await rejects(q(`select edit_token_hash from public.signups`), "permission denied");
    await rejects(q(`select * from public.signups`), "permission denied");
    // Not even indirectly, by filtering on the column.
    await rejects(q(`select count(*) from public.signups where ip_hash = 'iphash'`), "permission denied");

    // Everything the dashboard reads still works.
    const rows = await q(
      `select id, event_id, contributor_name, contributor_email, contributor_phone, source, created_at, updated_at
       from public.signups where event_id = $1`,
      [eventId],
    );
    assert.ok(rows.some((r) => r.contributor_name === "Kari N."));
    const embedded = await q(
      `select c.id, s.id as signup_id, s.contributor_name, s.contributor_email, s.contributor_phone, s.source, s.created_at
       from public.contributions c
       join public.signups s on s.id = c.signup_id and s.event_id = c.event_id
       where c.event_id = $1`,
      [eventId],
    );
    assert.ok(embedded.length > 0);
    assert.equal((await one(`select count(*)::int as n from public.signups where event_id = $1`, [eventId])).n, rows.length);

    // Manual entry, edit and delete by id (deleteContribution) still work.
    const signupId = (await one(`select public.add_manual_contribution($1, 'Midlertidig', 1) as id`, [coffeeId])).id;
    const upd = await db.query(`update public.signups set contributor_phone = '12345678' where id = $1`, [signupId]);
    assert.equal(upd.affectedRows, 1);
    await q(`delete from public.contributions where signup_id = $1`, [signupId]);
    const del = await db.query(`delete from public.signups where id = $1`, [signupId]);
    assert.equal(del.affectedRows, 1);
  });
  await as("service_role", null, async () => {
    assert.equal((await q(`select ip_hash from public.signups where ip_hash = 'iphash'`)).length, 1);
  });
});

await test("organizer can rename the organization but not change its plan", async () => {
  await as("authenticated", U1, async () => {
    await rejects(q(`update public.organizations set plan = 'pro' where id = $1`, [orgId]), "permission denied");
    await rejects(q(`update public.organizations set created_at = now() - interval '1 year' where id = $1`, [orgId]), "permission denied");
    const upd = await db.query(`update public.organizations set name = 'Solberg skolekorps (ny)' where id = $1`, [orgId]);
    assert.equal(upd.affectedRows, 1);
    const org = await one(`select name, plan from public.organizations where id = $1`, [orgId]);
    assert.deepEqual(org, { name: "Solberg skolekorps (ny)", plan: "free" });

    // Organizations and memberships are only managed through functions.
    await rejects(q(`insert into public.organizations (name, plan) values ('Gratis pro', 'pro')`), "permission denied");
    await rejects(q(`delete from public.organizations where id = $1`, [orgId]), "permission denied");
    await rejects(
      q(`insert into public.organization_members (organization_id, user_id) values ($1, $2)`, [orgId, U2]),
      "permission denied",
    );
    await rejects(q(`update public.organization_members set role = 'admin'`), "permission denied");
  });
});

await test("organizer cannot choose share token or creator for a new event", async () => {
  await as("authenticated", U1, async () => {
    await rejects(
      q(`insert into public.events (organization_id, title, public_token) values ($1, 'Valgt token', 'aaaaaaaaaaaaaaaa')`, [orgId]),
      "permission denied",
    );
    await rejects(
      q(`insert into public.events (organization_id, title, created_by) values ($1, 'Falsk eier', $2)`, [orgId, U2]),
      "permission denied",
    );
    const ev = await one(
      `insert into public.events (organization_id, title, description, location, event_date, status)
       values ($1, 'Julekonsert', 'Kakesalg', 'Aulaen', '2027-12-10', 'closed') returning id, public_token, created_by`,
      [orgId],
    );
    assert.equal(ev.public_token.length, 16);
    assert.equal(ev.created_by, U1);
    await q(`delete from public.events where id = $1`, [ev.id]);
  });
});

await test("rate limiting by ip hash", async () => {
  await as("authenticated", U1, async () => {
    await q(`update public.events set status = 'open' where id = $1`, [eventId]);
  });
  const tok = (await one(`select public_token from public.events where id = $1`, [eventId])).public_token;
  await as("service_role", null, async () => {
    const items = JSON.stringify([{ item_id: coffeeId, quantity: 1 }]);
    for (let i = 0; i < 15; i++) {
      await q(`select public.create_public_signup($1, 'Bot', null, null, $2::jsonb, 'spam')`, [tok, items]);
    }
    await rejects(
      q(`select public.create_public_signup($1, 'Bot', null, null, $2::jsonb, 'spam')`, [tok, items]),
      "KF_RATE_LIMITED",
    );
  });
});

await test("seed data loads", async () => {
  await db.exec(`insert into auth.users (id, email) values ('33333333-3333-3333-3333-333333333333', 'demo@korpsfix.no')`);
  await db.exec(readFileSync(join(here, "..", "seed.sql"), "utf8"));
  await as("service_role", null, async () => {
    const ev = (await one(`select public.get_public_event('demo-loppemarked-2027') as e`)).e;
    assert.equal(ev.title, "Loppemarked – Våren 2027");
    assert.ok(ev.items.length >= 6);
  });
});

console.log(`\n${passed} tester bestått`);
