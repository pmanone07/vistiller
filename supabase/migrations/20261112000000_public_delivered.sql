-- =============================================================================
-- ViStiller – expose delivered quantity per item in the public event JSON
--
-- The parent-facing overview shows, per item, how much is registered, how much
-- has been handed in and how much is still missing. `delivered` is the summed
-- quantity of contributions the organizer has marked as delivered. It is an
-- aggregate per item and reveals nothing about who delivered.
--
-- Safe to run on an existing database: it only replaces the function body.
-- get_public_event and get_signup_by_token both build on this function.
-- =============================================================================

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
