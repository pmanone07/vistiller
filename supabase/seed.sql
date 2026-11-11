-- =============================================================================
-- Korpsfix – testdata: Solberg skolekorps med loppemarked
--
-- Offentlig lenke etter seeding:  /a/demo-loppemarked-2027
-- Privat redigeringslenke (Kari): /b/demo-rediger-kari-000000000000
--
-- Organisasjonen knyttes til den første registrerte brukeren (hvis det finnes
-- en). Registrer deg i appen først og kjør deretter denne filen i SQL-editoren,
-- eller knytt organisasjonen til en bruker manuelt:
--
--   insert into public.organization_members (organization_id, user_id, role)
--   select '00000000-0000-4000-a000-000000000001', id, 'owner'
--   from auth.users where email = 'din@epost.no';
-- =============================================================================

do $$
declare
  v_org   uuid := '00000000-0000-4000-a000-000000000001';
  v_event uuid := '00000000-0000-4000-a000-000000000010';
  v_cat_bakst  uuid := '00000000-0000-4000-a000-000000000101';
  v_cat_kafe   uuid := '00000000-0000-4000-a000-000000000102';
  v_cat_utstyr uuid := '00000000-0000-4000-a000-000000000103';
  v_sjoko  uuid := '00000000-0000-4000-a000-000000001001';
  v_gulrot uuid := '00000000-0000-4000-a000-000000001002';
  v_boller uuid := '00000000-0000-4000-a000-000000001003';
  v_vaffel uuid := '00000000-0000-4000-a000-000000001004';
  v_kaffe  uuid := '00000000-0000-4000-a000-000000001005';
  v_kopper uuid := '00000000-0000-4000-a000-000000001006';
  v_bord   uuid := '00000000-0000-4000-a000-000000001007';
  v_user  uuid;
  v_signup uuid;
  r record;
begin
  delete from public.organizations where id = v_org;

  insert into public.organizations (id, name) values (v_org, 'Solberg skolekorps');

  select id into v_user from auth.users order by created_at nulls last limit 1;
  if v_user is not null then
    insert into public.organization_members (organization_id, user_id, role)
    values (v_org, v_user, 'owner')
    on conflict do nothing;
  end if;

  insert into public.events (id, organization_id, title, description, location, event_date, public_token, status, created_by)
  values (
    v_event, v_org,
    'Loppemarked – Våren 2027',
    'Vårens store loppemarked i gymsalen på Solberg skole. Alt overskudd går til korpstur og nye instrumenter. Lever kaker og bakst i kafeen fra kl. 09.00.',
    'Gymsalen, Solberg skole',
    '2027-04-24',
    'demo-loppemarked-2027',
    'open',
    v_user
  );

  insert into public.events (organization_id, title, event_date, status, created_by) values
    (v_org, 'Sommerkonsert 2027', '2027-06-10', 'open', v_user),
    (v_org, '17. mai-kiosk 2027', '2027-05-17', 'open', v_user);

  insert into public.categories (id, event_id, name, sort_order) values
    (v_cat_bakst,  v_event, 'Kaker og bakst', 1),
    (v_cat_kafe,   v_event, 'Mat og drikke', 2),
    (v_cat_utstyr, v_event, 'Utstyr', 3);

  insert into public.items (id, event_id, category_id, name, description, target_quantity, unit, allow_extra, sort_order) values
    (v_sjoko,  v_event, v_cat_bakst,  'Sjokoladekaker', 'Langpanne. Merk gjerne med allergener.', 10, 'stk', false, 1),
    (v_gulrot, v_event, v_cat_bakst,  'Gulrotkaker', null, 5, 'stk', false, 2),
    (v_boller, v_event, v_cat_bakst,  'Boller', 'Hveteboller eller skoleboller.', 100, 'stk', true, 3),
    (v_vaffel, v_event, v_cat_kafe,   'Vaffelrøre', 'Lever i kanne eller flaske med lokk.', 20, 'liter', false, 1),
    (v_kaffe,  v_event, v_cat_kafe,   'Kaffe', 'Filtermalt.', 10, 'poser', false, 2),
    (v_kopper, v_event, v_cat_utstyr, 'Pappkopper', null, 200, 'stk', false, 1),
    (v_bord,   v_event, v_cat_utstyr, 'Bord til utlån', 'Hentes søndag kveld.', 4, 'stk', false, 2);

  for r in
    select * from (values
      ('Kari Nordmann',    'kari@example.no',  '+47 900 00 001', 'demo-rediger-kari-000000000000', v_sjoko,  2),
      ('Ola Hansen',       null,               '+47 900 00 002', null,                              v_sjoko,  2),
      ('Ingrid Berg',      'ingrid@example.no', null,            null,                              v_sjoko,  2),
      ('Ahmed Ali',        null,               '+47 900 00 004', null,                              v_vaffel, 10),
      ('Sofie Larsen',     'sofie@example.no', null,             null,                              v_vaffel, 5),
      ('Jonas Johansen',   null,               null,             null,                              v_boller, 40),
      ('Maria Pettersen',  'maria@example.no', '+47 900 00 007', null,                              v_kaffe,  4),
      ('Lars Olsen',       null,               null,             null,                              v_kopper, 200),
      ('Emma Kristiansen', null,               '+47 900 00 009', null,                              v_gulrot, 1)
    ) as t(name, email, phone, edit_token, item_id, qty)
  loop
    insert into public.signups (event_id, contributor_name, contributor_email, contributor_phone, edit_token_hash, source)
    values (v_event, r.name, r.email, r.phone,
            case when r.edit_token is null then null else public.hash_token(r.edit_token) end,
            case when r.edit_token is null and r.email is null and r.phone is null then 'manual' else 'public' end)
    returning id into v_signup;

    insert into public.contributions (event_id, signup_id, item_id, quantity, delivered_at)
    values (v_event, v_signup, r.item_id, r.qty,
            case when r.item_id = v_kopper then now() else null end);
  end loop;

  -- Kari tar også med kaffe.
  insert into public.contributions (event_id, signup_id, item_id, quantity)
  select v_event, s.id, v_kaffe, 2 from public.signups s
  where s.event_id = v_event and s.contributor_name = 'Kari Nordmann';
end;
$$;
