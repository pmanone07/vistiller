-- =============================================================================
-- Korpsfix – initial schema
--
-- Design notes
-- * Organizers (authenticated users) work directly against the tables, guarded
--   by Row Level Security: they only ever see organizations they are members of.
-- * The public (parents/volunteers) never touch the tables directly. All public
--   reads/writes go through SECURITY DEFINER functions that are only executable
--   by the `service_role` (i.e. the Korpsfix server). The server adds rate
--   limiting, honeypot checks and validation before calling them.
-- * A "signup" is one submission by one person (name + contact info + private
--   edit token). A signup has one or more "contributions" (item + quantity).
--   This lets a parent bring several different items and edit/cancel all of
--   them through one private link.
-- * Over-allocation is prevented inside the database: items are locked with
--   SELECT ... FOR UPDATE before the remaining quantity is checked, so
--   concurrent signups cannot exceed the target.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

-- URL-safe random token. 12 bytes -> 16 chars, 24 bytes -> 32 chars.
create or replace function public.generate_token(num_bytes integer default 12)
returns text
language sql
volatile
security definer
set search_path = ''
as $$
  select translate(encode(extensions.gen_random_bytes(num_bytes), 'base64'), E'+/=\n', '-_');
$$;

create or replace function public.hash_token(token text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(sha256(convert_to(token, 'UTF8')), 'hex');
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 100),
  plan        text not null default 'free' check (plan in ('free', 'pro')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.organization_members (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  role             text not null default 'owner' check (role in ('owner', 'admin')),
  created_at       timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index organization_members_user_id_idx on public.organization_members (user_id);

create table public.events (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  title            text not null check (char_length(btrim(title)) between 1 and 120),
  description      text check (char_length(description) <= 2000),
  location         text check (char_length(location) <= 200),
  event_date       date,
  public_token     text not null unique default public.generate_token(12)
                   check (char_length(public_token) between 12 and 64),
  status           text not null default 'open' check (status in ('open', 'closed', 'archived')),
  created_by       uuid references auth.users (id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index events_organization_id_idx on public.events (organization_id);

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (id, event_id)
);
create index categories_event_id_idx on public.categories (event_id);

create table public.items (
  id               uuid primary key default gen_random_uuid(),
  event_id         uuid not null references public.events (id) on delete cascade,
  category_id      uuid,
  name             text not null check (char_length(btrim(name)) between 1 and 80),
  description      text check (char_length(description) <= 500),
  target_quantity  integer not null check (target_quantity between 1 and 100000),
  unit             text not null default 'stk' check (char_length(btrim(unit)) between 1 and 20),
  allow_extra      boolean not null default false,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (id, event_id),
  -- A category must belong to the same event as the item.
  foreign key (category_id, event_id)
    references public.categories (id, event_id)
    on delete set null (category_id)
);
create index items_event_id_idx on public.items (event_id);
create index items_category_id_idx on public.items (category_id);

create table public.signups (
  id                 uuid primary key default gen_random_uuid(),
  event_id           uuid not null references public.events (id) on delete cascade,
  contributor_name   text not null check (char_length(btrim(contributor_name)) between 1 and 80),
  contributor_email  text check (char_length(contributor_email) <= 200),
  contributor_phone  text check (char_length(contributor_phone) <= 30),
  edit_token_hash    text unique,                -- null for entries added manually by an organizer
  source             text not null default 'public' check (source in ('public', 'manual')),
  ip_hash            text,                       -- salted hash, used only for rate limiting
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (id, event_id)
);
create index signups_event_id_idx on public.signups (event_id);
create index signups_ip_hash_created_at_idx on public.signups (ip_hash, created_at) where ip_hash is not null;

create table public.contributions (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events (id) on delete cascade,
  signup_id     uuid not null,
  item_id       uuid not null,
  quantity      integer not null check (quantity between 1 and 100000),
  delivered_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (signup_id, item_id),
  -- Item and signup must belong to the same event as the contribution.
  foreign key (signup_id, event_id) references public.signups (id, event_id) on delete cascade,
  foreign key (item_id, event_id)   references public.items (id, event_id)   on delete cascade
);
create index contributions_item_id_idx on public.contributions (item_id);
create index contributions_event_id_idx on public.contributions (event_id);

create trigger organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();
create trigger events_updated_at before update on public.events
  for each row execute function public.set_updated_at();
create trigger items_updated_at before update on public.items
  for each row execute function public.set_updated_at();
create trigger signups_updated_at before update on public.signups
  for each row execute function public.set_updated_at();
create trigger contributions_updated_at before update on public.contributions
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Membership helpers (SECURITY DEFINER to avoid RLS recursion)
-- -----------------------------------------------------------------------------

create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org_id
      and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_event_member(ev_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.events e
    join public.organization_members m on m.organization_id = e.organization_id
    where e.id = ev_id
      and m.user_id = (select auth.uid())
  );
$$;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.organizations        enable row level security;
alter table public.organization_members enable row level security;
alter table public.events               enable row level security;
alter table public.categories           enable row level security;
alter table public.items                enable row level security;
alter table public.signups              enable row level security;
alter table public.contributions        enable row level security;

-- Anonymous users get nothing directly. Public access goes through the server.
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- organizations: created via create_organization(); members can read/update.
create policy "members read organization" on public.organizations
  for select to authenticated using (public.is_org_member(id));
create policy "members update organization" on public.organizations
  for update to authenticated using (public.is_org_member(id)) with check (public.is_org_member(id));

-- organization_members: read-only for members (managed via functions).
create policy "members read memberships" on public.organization_members
  for select to authenticated using (public.is_org_member(organization_id));

-- events
create policy "members manage events" on public.events
  for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- categories / items / signups / contributions
create policy "members manage categories" on public.categories
  for all to authenticated
  using (public.is_event_member(event_id))
  with check (public.is_event_member(event_id));

create policy "members manage items" on public.items
  for all to authenticated
  using (public.is_event_member(event_id))
  with check (public.is_event_member(event_id));

create policy "members manage signups" on public.signups
  for all to authenticated
  using (public.is_event_member(event_id))
  with check (public.is_event_member(event_id));

create policy "members manage contributions" on public.contributions
  for all to authenticated
  using (public.is_event_member(event_id))
  with check (public.is_event_member(event_id));

-- Organizers can't forge edit tokens or IP hashes for signups.
revoke insert, update on public.signups from authenticated;
grant insert (event_id, contributor_name, contributor_email, contributor_phone, source)
  on public.signups to authenticated;
grant update (contributor_name, contributor_email, contributor_phone)
  on public.signups to authenticated;

-- An event's id/organization/token are not freely editable.
revoke update on public.events from authenticated;
grant update (title, description, location, event_date, status) on public.events to authenticated;

-- -----------------------------------------------------------------------------
-- Organizer functions (run as the calling user; RLS applies)
-- -----------------------------------------------------------------------------

-- Creates an organization and makes the caller its owner.
create or replace function public.create_organization(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_org  uuid;
begin
  if v_user is null then
    raise exception 'KF_NOT_AUTHENTICATED';
  end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 100 then
    raise exception 'KF_INVALID_NAME';
  end if;
  if (select count(*) from public.organization_members where user_id = v_user) >= 10 then
    raise exception 'KF_TOO_MANY_ORGANIZATIONS';
  end if;

  insert into public.organizations (name) values (btrim(p_name)) returning id into v_org;
  insert into public.organization_members (organization_id, user_id, role) values (v_org, v_user, 'owner');
  return v_org;
end;
$$;

-- Issues a new share link for an event (invalidates the old one).
create or replace function public.regenerate_event_token(p_event_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text := public.generate_token(12);
begin
  if not public.is_event_member(p_event_id) then
    raise exception 'KF_NOT_FOUND';
  end if;
  update public.events set public_token = v_token where id = p_event_id;
  return v_token;
end;
$$;

-- Organizer adds a contribution by hand (e.g. someone called in). Organizers
-- may exceed the target. Runs as invoker so RLS applies.
create or replace function public.add_manual_contribution(
  p_item_id  uuid,
  p_name     text,
  p_quantity integer,
  p_email    text default null,
  p_phone    text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_event  uuid;
  v_signup uuid;
begin
  select event_id into v_event from public.items where id = p_item_id;
  if v_event is null then
    raise exception 'KF_NOT_FOUND';
  end if;
  if p_quantity is null or p_quantity not between 1 and 100000 then
    raise exception 'KF_INVALID_QUANTITY';
  end if;

  insert into public.signups (event_id, contributor_name, contributor_email, contributor_phone, source)
  values (v_event, btrim(p_name), nullif(btrim(p_email), ''), nullif(btrim(p_phone), ''), 'manual')
  returning id into v_signup;

  insert into public.contributions (event_id, signup_id, item_id, quantity)
  values (v_event, v_signup, p_item_id, p_quantity);

  return v_signup;
end;
$$;

-- -----------------------------------------------------------------------------
-- Public functions (service_role only – called by the Korpsfix server)
-- -----------------------------------------------------------------------------

-- Public JSON representation of an event. Never includes contact details.
create or replace function public.public_event_json(p_event_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'token',             e.public_token,
    'title',             e.title,
    'description',       e.description,
    'location',          e.location,
    'event_date',        e.event_date,
    'status',            e.status,
    'organization_name', o.name,
    'contributor_count', (select count(*) from public.signups s where s.event_id = e.id),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'sort_order', c.sort_order)
                       order by c.sort_order, c.created_at)
      from public.categories c where c.event_id = e.id
    ), '[]'::jsonb),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id',              i.id,
               'category_id',     i.category_id,
               'name',            i.name,
               'description',     i.description,
               'target_quantity', i.target_quantity,
               'unit',            i.unit,
               'allow_extra',     i.allow_extra,
               'sort_order',      i.sort_order,
               'allocated',       coalesce((select sum(ct.quantity) from public.contributions ct where ct.item_id = i.id), 0)
             ) order by i.sort_order, i.created_at)
      from public.items i where i.event_id = e.id
    ), '[]'::jsonb)
  )
  from public.events e
  join public.organizations o on o.id = e.organization_id
  where e.id = p_event_id;
$$;

create or replace function public.get_public_event(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.public_event_json(e.id)
  from public.events e
  where e.public_token = p_token
    and e.status <> 'archived';
$$;

-- Validates contact details; raises KF_* errors.
create or replace function public.validate_contact(p_name text, p_email text, p_phone text)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 80 then
    raise exception 'KF_INVALID_NAME';
  end if;
  if nullif(btrim(p_email), '') is not null
     and (char_length(p_email) > 200 or btrim(p_email) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    raise exception 'KF_INVALID_EMAIL';
  end if;
  if nullif(btrim(p_phone), '') is not null
     and (char_length(p_phone) > 30 or btrim(p_phone) !~ '^\+?[0-9 ()-]{5,}$') then
    raise exception 'KF_INVALID_PHONE';
  end if;
end;
$$;

-- Applies a desired set of quantities for one signup.
--   p_items: [{ "item_id": uuid, "quantity": int }]
-- Quantity 0 (or omission when p_replace) removes the contribution.
-- Locks the affected items so concurrent signups can't exceed the target.
create or replace function public.apply_signup_items(
  p_event_id  uuid,
  p_signup_id uuid,
  p_items     jsonb,
  p_replace   boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids      uuid[];
  v_qtys     integer[];
  v_idx      integer;
  v_item     public.items;
  v_existing public.contributions;
  v_has      boolean;
  v_others   integer;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 100 then
    raise exception 'KF_INVALID_ITEMS';
  end if;

  -- Parse the request into parallel arrays.
  begin
    select coalesce(array_agg((el->>'item_id')::uuid order by ord), '{}'),
           coalesce(array_agg((el->>'quantity')::integer order by ord), '{}')
    into v_ids, v_qtys
    from jsonb_array_elements(p_items) with ordinality as t(el, ord);
  exception when others then
    raise exception 'KF_INVALID_ITEMS';
  end;

  if array_position(v_ids, null) is not null then
    raise exception 'KF_INVALID_ITEMS';
  end if;
  if cardinality(v_ids) <> (select count(distinct x) from unnest(v_ids) as x) then
    raise exception 'KF_DUPLICATE_ITEM';
  end if;
  if exists (select 1 from unnest(v_qtys) as q where q is null or q < 0 or q > 10000) then
    raise exception 'KF_INVALID_QUANTITY';
  end if;
  -- All referenced items must belong to the event.
  if exists (
    select 1 from unnest(v_ids) as x
    where not exists (select 1 from public.items i where i.id = x and i.event_id = p_event_id)
  ) then
    raise exception 'KF_ITEM_NOT_FOUND';
  end if;

  -- Lock every item touched (requested + currently held) in a stable order, so
  -- concurrent signups for the same item are serialized.
  perform 1
  from public.items i
  where i.event_id = p_event_id
    and (i.id = any (v_ids)
         or i.id in (select c.item_id from public.contributions c where c.signup_id = p_signup_id))
  order by i.id
  for update;

  -- Removals: quantity 0, or (when replacing) items no longer in the request.
  for v_existing in
    select c.* from public.contributions c
    where c.signup_id = p_signup_id
      and (
        exists (select 1 from unnest(v_ids, v_qtys) as r(id, q) where r.id = c.item_id and r.q = 0)
        or (p_replace and not (c.item_id = any (v_ids)))
      )
  loop
    if v_existing.delivered_at is not null then
      raise exception 'KF_ALREADY_DELIVERED';
    end if;
    delete from public.contributions where id = v_existing.id;
  end loop;

  -- Inserts / updates.
  for v_idx in 1 .. coalesce(cardinality(v_ids), 0) loop
    continue when v_qtys[v_idx] = 0;

    select * into v_item from public.items where id = v_ids[v_idx];
    select * into v_existing from public.contributions
      where signup_id = p_signup_id and item_id = v_ids[v_idx];
    v_has := found;

    continue when v_has and v_existing.quantity = v_qtys[v_idx];

    if v_has and v_existing.delivered_at is not null then
      raise exception 'KF_ALREADY_DELIVERED';
    end if;

    -- Only increases are checked against the target; reducing is always allowed.
    if not v_item.allow_extra and (not v_has or v_qtys[v_idx] > v_existing.quantity) then
      select coalesce(sum(c.quantity), 0) into v_others
      from public.contributions c
      where c.item_id = v_item.id and c.signup_id <> p_signup_id;

      if v_others + v_qtys[v_idx] > v_item.target_quantity then
        raise exception 'KF_NOT_ENOUGH_REMAINING'
          using detail = jsonb_build_object(
            'item_id',   v_item.id,
            'item_name', v_item.name,
            'remaining', greatest(v_item.target_quantity - v_others, 0),
            'unit',      v_item.unit
          )::text;
      end if;
    end if;

    insert into public.contributions (event_id, signup_id, item_id, quantity)
    values (p_event_id, p_signup_id, v_item.id, v_qtys[v_idx])
    on conflict (signup_id, item_id) do update set quantity = excluded.quantity;
  end loop;

  if not exists (select 1 from public.contributions where signup_id = p_signup_id) then
    raise exception 'KF_NO_ITEMS';
  end if;
end;
$$;

-- Creates a signup from the public page. Returns the plaintext edit token
-- (only time it is ever available – only its hash is stored).
create or replace function public.create_public_signup(
  p_token   text,
  p_name    text,
  p_email   text,
  p_phone   text,
  p_items   jsonb,
  p_ip_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event      public.events;
  v_signup_id  uuid;
  v_edit_token text := public.generate_token(24);
begin
  select * into v_event from public.events where public_token = p_token;
  if not found or v_event.status = 'archived' then
    raise exception 'KF_EVENT_NOT_FOUND';
  end if;
  if v_event.status <> 'open' then
    raise exception 'KF_EVENT_CLOSED';
  end if;

  perform public.validate_contact(p_name, p_email, p_phone);

  -- Rate limiting / abuse protection.
  if p_ip_hash is not null and (
    select count(*) from public.signups
    where ip_hash = p_ip_hash and created_at > now() - interval '10 minutes'
  ) >= 15 then
    raise exception 'KF_RATE_LIMITED';
  end if;
  if (select count(*) from public.signups where event_id = v_event.id) >= 2000 then
    raise exception 'KF_EVENT_FULL';
  end if;

  insert into public.signups (event_id, contributor_name, contributor_email, contributor_phone,
                              edit_token_hash, source, ip_hash)
  values (v_event.id, btrim(p_name), nullif(btrim(p_email), ''), nullif(btrim(p_phone), ''),
          public.hash_token(v_edit_token), 'public', p_ip_hash)
  returning id into v_signup_id;

  perform public.apply_signup_items(v_event.id, v_signup_id, p_items, false);

  return jsonb_build_object('signup_id', v_signup_id, 'edit_token', v_edit_token);
end;
$$;

-- A signup as seen by its owner (via the private edit link).
create or replace function public.get_signup_by_token(p_edit_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'signup', jsonb_build_object(
      'id',                s.id,
      'contributor_name',  s.contributor_name,
      'contributor_email', s.contributor_email,
      'contributor_phone', s.contributor_phone,
      'created_at',        s.created_at,
      'updated_at',        s.updated_at
    ),
    'contributions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'item_id', c.item_id, 'quantity', c.quantity, 'delivered_at', c.delivered_at))
      from public.contributions c where c.signup_id = s.id
    ), '[]'::jsonb),
    'event', public.public_event_json(s.event_id)
  )
  from public.signups s
  join public.events e on e.id = s.event_id
  where s.edit_token_hash = public.hash_token(p_edit_token)
    and e.status <> 'archived';
$$;

create or replace function public.update_public_signup(
  p_edit_token text,
  p_name       text,
  p_email      text,
  p_phone      text,
  p_items      jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_signup public.signups;
  v_status text;
begin
  select s.* into v_signup from public.signups s
  where s.edit_token_hash = public.hash_token(p_edit_token)
  for update;
  if not found then
    raise exception 'KF_SIGNUP_NOT_FOUND';
  end if;

  select status into v_status from public.events where id = v_signup.event_id;
  if v_status = 'archived' then
    raise exception 'KF_SIGNUP_NOT_FOUND';
  end if;
  if v_status <> 'open' then
    raise exception 'KF_EVENT_CLOSED';
  end if;

  perform public.validate_contact(p_name, p_email, p_phone);

  update public.signups
  set contributor_name  = btrim(p_name),
      contributor_email = nullif(btrim(p_email), ''),
      contributor_phone = nullif(btrim(p_phone), '')
  where id = v_signup.id;

  perform public.apply_signup_items(v_signup.event_id, v_signup.id, p_items, true);
end;
$$;

create or replace function public.cancel_public_signup(p_edit_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_signup public.signups;
  v_status text;
begin
  select s.* into v_signup from public.signups s
  where s.edit_token_hash = public.hash_token(p_edit_token)
  for update;
  if not found then
    raise exception 'KF_SIGNUP_NOT_FOUND';
  end if;

  select status into v_status from public.events where id = v_signup.event_id;
  if v_status = 'archived' then
    raise exception 'KF_SIGNUP_NOT_FOUND';
  end if;

  if exists (select 1 from public.contributions where signup_id = v_signup.id and delivered_at is not null) then
    raise exception 'KF_ALREADY_DELIVERED';
  end if;

  delete from public.signups where id = v_signup.id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Function privileges
-- -----------------------------------------------------------------------------

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.is_org_member(uuid)            to authenticated;
grant execute on function public.is_event_member(uuid)          to authenticated;
grant execute on function public.create_organization(text)      to authenticated;
grant execute on function public.regenerate_event_token(uuid)   to authenticated;
grant execute on function public.add_manual_contribution(uuid, text, integer, text, text) to authenticated;
-- Used by column defaults / triggers when organizers insert rows.
grant execute on function public.generate_token(integer)        to authenticated;
grant execute on function public.set_updated_at()               to authenticated;

grant execute on function public.get_public_event(text)                                   to service_role;
grant execute on function public.create_public_signup(text, text, text, text, jsonb, text) to service_role;
grant execute on function public.get_signup_by_token(text)                                to service_role;
grant execute on function public.update_public_signup(text, text, text, text, jsonb)       to service_role;
grant execute on function public.cancel_public_signup(text)                               to service_role;
