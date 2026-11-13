-- =============================================================================
-- ViStiller – event types and flexible contribution kinds
--
-- Makes the list useful for more than "who brings what":
--
-- * events.event_type  Optional category for the event (school, sports, …).
-- * items.kind         What is being asked for: bring something, do a task,
--                      take a shift or help with transport. Existing rows
--                      become 'bring', which is what they have always been.
-- * items.starts_at /  Optional time of day, mainly for shifts
--   items.ends_at      ("Kioskvakt 10:00–12:00").
--
-- Purely additive and safe to run on a live database: new columns are nullable
-- or have a default, nothing is dropped or rewritten, and existing events,
-- signups and share links are untouched. Safe to run more than once.
-- =============================================================================

alter table public.events
  add column if not exists event_type text
  check (event_type is null or event_type in
    ('school', 'sports', 'culture', 'dugnad', 'social', 'fundraising', 'other'));

alter table public.items
  add column if not exists kind text not null default 'bring'
  check (kind in ('bring', 'task', 'shift', 'transport'));

alter table public.items add column if not exists starts_at time;
alter table public.items add column if not exists ends_at time;

-- events has column-level INSERT/UPDATE grants (see the init and
-- harden_column_grants migrations), so the new column must be granted
-- explicitly. items uses table-level grants and needs nothing.
grant insert (event_type), update (event_type) on public.events to authenticated;

-- Public event JSON: same shape as before plus event_type and, per item,
-- kind / starts_at / ends_at. Still no contact details.
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
    'event_type',        e.event_type,
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
               'kind',            i.kind,
               'starts_at',       to_char(i.starts_at, 'HH24:MI'),
               'ends_at',         to_char(i.ends_at, 'HH24:MI'),
               'target_quantity', i.target_quantity,
               'unit',            i.unit,
               'allow_extra',     i.allow_extra,
               'sort_order',      i.sort_order,
               'allocated',       coalesce((select sum(ct.quantity) from public.contributions ct where ct.item_id = i.id), 0),
               'delivered',       coalesce((select sum(ct.quantity) from public.contributions ct
                                            where ct.item_id = i.id and ct.delivered_at is not null), 0)
             ) order by i.sort_order, i.created_at)
      from public.items i where i.event_id = e.id
    ), '[]'::jsonb)
  )
  from public.events e
  join public.organizations o on o.id = e.organization_id
  where e.id = p_event_id;
$$;

-- Make the REST API see the new columns right away.
notify pgrst, 'reload schema';
