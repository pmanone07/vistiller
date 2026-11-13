# ViStiller

**Sammen får vi det til.** Organiser dugnader, arrangementer og bidrag på ett sted, for skoler og FAU, idrettslag, korps, barnehager og frivillige.

Arrangøren lager et arrangement, legger inn hva som trengs (ting å ta med, oppgaver, vakter med klokkeslett og transport) og deler en lenke eller QR-kode. Deltakerne melder seg på uten konto, og alle ser hva som fortsatt mangler.

## Teknologi

- **Next.js 16** (App Router, Cache Components, Server Actions), TypeScript
- **Tailwind CSS 4** + **shadcn/ui** (Base UI) + Lucide-ikoner
- **Supabase**: PostgreSQL, Auth, Row Level Security
- PWA: web app manifest, ikoner, service worker med offline-side

## Kom i gang

### 1. Supabase

1. Opprett et prosjekt på [supabase.com](https://supabase.com).
2. Kjør databaseskjemaet. Enten:
   - kjør alle filene i `supabase/migrations/` i **SQL Editor**, én og én i rekkefølge (eldste først, etter tidsstempelet i filnavnet). Har du allerede kjørt `20261110000000_init.sql`, kjører du bare de nyere filene, eller
   - med Supabase CLI: `npx supabase init`, `npx supabase link --project-ref <ref>` og `npx supabase db push`.
3. Under **Authentication → URL Configuration**:
   - **Site URL**: `https://vistiller.com` (lokalt: `http://localhost:3000`)
   - **Redirect URLs**: legg til `https://vistiller.com/**`, `https://www.vistiller.com/**` og `http://localhost:3000/auth/callback`
4. (Valgfritt) Oversett e-postmalene under **Authentication → Email Templates** til norsk.

### 2. Miljøvariabler

```bash
cp .env.example .env.local
```

Fyll inn verdiene fra **Project Settings → API / API Keys**:

| Variabel | Innhold | Hvor |
|---|---|---|
| `SUPABASE_URL` | Prosjekt-URL | Trygg å eksponere |
| `SUPABASE_PUBLISHABLE_KEY` (eller `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) | Publishable key (`sb_publishable_…`) | Trygg å eksponere |
| `SUPABASE_SECRET_KEY` | Secret key (`sb_secret_…`) | **Kun på serveren** |
| `NEXT_PUBLIC_SITE_URL` | Offentlig adresse for delingslenker, QR-koder og e-postlenker | Trygg å eksponere |
| `IP_HASH_SALT` | Hemmelig salt for IP-hashing (rate limiting). Anbefales i produksjon | **Kun på serveren** |
| `API_ALLOWED_ORIGINS` | Valgfritt: tillatte origins for `/api/v1` | – |

De klassiske navnene godtas fortsatt: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_ANON_KEY` (anon-nøkkel) og `SUPABASE_SERVICE_ROLE_KEY` (service_role-nøkkel, kun på serveren). Hemmelige verdier skal aldri ha `NEXT_PUBLIC_`-prefiks.

Er `IP_HASH_SALT` tom, brukes `SUPABASE_SECRET_KEY` (eller `SUPABASE_SERVICE_ROLE_KEY`) som salt. Mangler alle, feiler påmeldingen med en tydelig feilmelding i stedet for å hashe med et kjent salt.

### 3. Kjør

```bash
npm install
npm run dev
```

Åpne <http://localhost:3000>.

### Testdata

`supabase/seed.sql` lager *Solberg skolekorps* med et loppemarked, kategorier, varer og påmeldinger. Registrer deg i appen først, og kjør deretter filen i SQL Editor. Organisasjonen knyttes da til den første brukeren.

- Offentlig liste: `/a/demo-loppemarked-2027`
- Kari sin private redigeringslenke: `/b/demo-rediger-kari-000000000000`

Lenken «Se et eksempel» på forsiden peker til demolisten. Fjern den, eller seed demodata, før lansering.

## Skript

| Kommando | Beskrivelse |
|---|---|
| `npm run dev` | Utviklingsserver |
| `npm run build` | Produksjonsbygg |
| `npm run lint` | ESLint |
| `npm run typecheck` | Genererer rutetyper og kjører `tsc` |
| `npm run test:db` | Tester databaseskjema, RLS og påmeldingsfunksjoner i en innebygd Postgres (PGlite) |

## Arkitektur

```
src/
  app/
    page.tsx                 Forside
    (auth)/                  login, register, glemt-passord, nytt-passord
    auth/callback/           Lander for e-postlenker (bekreftelse, nytt passord)
    a/[token]/               Offentlig bidragsliste + påmelding
    b/[editToken]/           Bekreftelse, endring og avbestilling (privat lenke)
    dashboard/               Arrangørens sider (krever innlogging)
      events/new             Nytt arrangement
      events/[id]            Administrer arrangement: bidrag, påmeldte, deling, QR
      settings               Organisasjon og konto
    api/v1/                  JSON-API for de offentlige flytene (for en fremtidig app)
  components/                Felles UI (fremdrift, antallsvelger, dialoger …)
  lib/                       Typer, formattering, Supabase-klienter, feilmeldinger
  server/                    Server-only datatilgang (offentlig og dashboard)
supabase/
  migrations/                Skjema, RLS og databasefunksjoner
  seed.sql                   Testdata
  tests/db.test.mjs          Databasetester
```

### Datamodell

`organizations` → `events` → `categories` / `items` → `contributions`.
Én **signup** er én innsending fra én person (navn, kontaktinfo og privat redigeringskode). Den kan ha flere **contributions** (vare + antall). Slik kan en deltaker melde seg på flere ting og endre alt via én lenke.

### Sikkerhet

- **RLS:** innloggede arrangører ser og endrer bare data i organisasjoner de er medlem av.
- **Kolonnetilgang:** i tillegg begrenser kolonnerettigheter hva arrangører kan lese og skrive. De kan ikke lese IP-hash eller hash av redigeringskoden på påmeldinger, ikke endre `plan` på organisasjonen (bare navnet), og ikke velge delingskode eller `created_by` når de lager et arrangement.
- **Offentlig tilgang** går aldri direkte mot tabellene. Deltakere bruker kontrollerte `SECURITY DEFINER`-funksjoner (`get_public_event`, `create_public_signup`, `update_public_signup`, `cancel_public_signup`). Bare `service_role`, altså Korpsfix-serveren, kan kjøre dem.
- **Ingen overbooking:** varene låses med `SELECT … FOR UPDATE` før gjenstående mengde sjekkes, så samtidige påmeldinger ikke kan gå over målet (med mindre «tillat ekstra» er på).
- **Delingskoder** er 16 tegn tilfeldig base64url (96 bit). **Redigeringskoder** er 32 tegn og lagres bare som SHA-256-hash.
- **Personvern:** den offentlige listen viser aldri navn, telefon eller e-post til andre.
- **Misbruk:** honeypot-felt, validering i både app og database, grenser for lengde og antall, og rate limiting per (saltet, hashet) IP: maks 15 påmeldinger per 10 minutter.
- **Ikke søkbart:** `/a` og `/b` sendes med `noindex`, er stengt i `robots.txt`, og `/b` sendes uten referrer.

### Mobil / Capacitor

Appen er en installerbar PWA. Hele den offentlige påmeldingsflyten finnes også som JSON-API under `/api/v1`, med samme logikk som server actions. En Capacitor-app kan derfor bruke det samme backendet. Sett `API_ALLOWED_ORIGINS` for å tillate app-opprinnelsen.

## Senere versjoner

Arkitekturen er klar for, men implementerer ikke: påminnelser, Vipps, eksport, flere administratorer per organisasjon (`organization_members.role` finnes allerede) og abonnement (`organizations.plan` finnes allerede, men gratisgrensen håndheves ikke ennå).
