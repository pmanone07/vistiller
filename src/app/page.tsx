import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Baby,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Eye,
  GraduationCap,
  HeartHandshake,
  ListChecks,
  Music,
  PartyPopper,
  QrCode,
  Share2,
  Smartphone,
  Timer,
  Trophy,
  UserCheck,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { ItemProgress } from "@/components/item-progress";
import { BRAND } from "@/lib/brand";
import { ITEM_KINDS, type ItemKind } from "@/lib/kinds";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const DEMO_ITEMS: { name: string; kind: ItemKind; time?: string; allocated: number; target: number; unit: string }[] = [
  { name: "Kaker", kind: "bring", allocated: 4, target: 6, unit: "stk" },
  { name: "Kioskvakt", kind: "shift", time: "10:00–12:00", allocated: 1, target: 2, unit: "personer" },
  { name: "Rydding", kind: "task", allocated: 4, target: 4, unit: "personer" },
];

const STEPS = [
  {
    icon: CalendarPlus,
    title: "Opprett et arrangement",
    text: "Gi det et navn, en dato og et sted. Start tomt eller fra en ferdig mal.",
  },
  {
    icon: ListChecks,
    title: "Legg til oppgaver og bidrag",
    text: "Ting å ta med, oppgaver, vakter med klokkeslett og transport, i én og samme liste.",
  },
  {
    icon: Share2,
    title: "Del lenken med deltakerne",
    text: "Send lenken der dere vanligvis snakker sammen, eller heng opp QR-koden.",
  },
  {
    icon: Eye,
    title: "Følg med på hvem som stiller opp",
    text: "Se hvem som har meldt seg på, hva som gjenstår, og kryss av underveis.",
  },
];

const AUDIENCES = [
  {
    icon: GraduationCap,
    title: "Skoler og FAU",
    text: "Skoleavslutninger, forestillinger, kakesalg, klasseturer og skoledugnader.",
  },
  {
    icon: Trophy,
    title: "Idrettslag",
    text: "Cuper og turneringer, kioskvakter, kjøring til kamper og sesongavslutninger.",
  },
  {
    icon: Music,
    title: "Korps og kultur",
    text: "Loppemarkeder, konserter, festivaler, kafé og uniformsdugnader.",
  },
  {
    icon: Baby,
    title: "Barnehager",
    text: "Sommerfester, foreldrekaffe, dugnader og andre fellesarrangementer.",
  },
  {
    icon: HeartHandshake,
    title: "Dugnad og frivillighet",
    text: "Velforeninger, grendelag, nabolagsdugnader og innsamlingsaksjoner.",
  },
  {
    icon: PartyPopper,
    title: "Andre arrangementer",
    text: "Alt der flere skal bidra: sosiale samlinger, jubileer og lokale arrangementer.",
  },
];

const BENEFITS = [
  {
    icon: UserCheck,
    title: "Ingen konto for deltakere",
    text: "De åpner lenken, velger hva de vil bidra med og skriver inn navnet sitt.",
  },
  {
    icon: QrCode,
    title: "Del med lenke eller QR-kode",
    text: "Én lenke til alle. QR-koden kan lastes ned og henges opp.",
  },
  {
    icon: Smartphone,
    title: "Fungerer på mobil",
    text: "Store knapper og få steg. Kan også installeres som app.",
  },
  {
    icon: ListChecks,
    title: "Full oversikt over bidrag",
    text: "Alle ser hva som er dekket og hva som mangler. Listen stopper når behovet er fylt.",
  },
  {
    icon: Timer,
    title: "Mindre administrasjon",
    text: "Slipp regneark og purringer. Deltakerne kan selv endre eller trekke seg med sin egen lenke.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2" aria-label="Hovedmeny">
          <Link href="/login" className={buttonVariants({ variant: "ghost", size: "lg" })}>
            Logg inn
          </Link>
          <Link href="/register" className={cn(buttonVariants({ size: "lg" }), "hidden sm:inline-flex")}>
            Kom i gang
          </Link>
        </nav>
      </header>

      <main className="flex-1 overflow-x-clip">
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-8 pb-16 sm:px-6 lg:grid-cols-2 lg:pt-16">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full bg-brand-muted px-3 py-1 text-sm font-medium text-primary">
              <HeartHandshake className="size-4" /> {BRAND.slogan}
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              Enklere å få alle til å <span className="text-primary">stille opp.</span>
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Skoleavslutning, fotballcup, loppemarked eller dugnad? Med {BRAND.name} fordeler dere oppgaver og bidrag
              på minutter. Del én lenke og få full oversikt.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className={buttonVariants({ size: "xl" })}>
                Opprett gratis arrangement <ArrowRight />
              </Link>
              <a href="#slik-fungerer-det" className={buttonVariants({ size: "xl", variant: "outline" })}>
                Se hvordan det fungerer
              </a>
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {["Ingen konto for deltakere", "Ingen app å installere", "Gratis å komme i gang"].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-success" /> {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Phone mockup: one list that mixes things to bring, shifts and tasks. */}
          <div className="relative mx-auto w-full max-w-sm" aria-hidden="true">
            <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-br from-primary/25 via-brand-muted to-warm-muted blur-2xl" />
            <div className="rounded-[2.5rem] border-8 border-foreground/90 bg-background p-4 shadow-2xl">
              <p className="text-xs font-medium text-primary">FAU Solberg skole</p>
              <p className="text-lg font-bold">Sommeravslutning 5B</p>
              <p className="mb-4 text-xs text-muted-foreground">Torsdag 17. juni 2027</p>
              <div className="space-y-3">
                {DEMO_ITEMS.map((item) => {
                  const done = item.allocated >= item.target;
                  const kind = ITEM_KINDS[item.kind];
                  const KindIcon = kind.icon;
                  return (
                    <div
                      key={item.name}
                      className={cn("rounded-2xl bg-card p-3 ring-1", done ? "bg-success-muted/60 ring-success/25" : "ring-foreground/10")}
                    >
                      <p className="mb-1 flex items-center gap-2 text-[0.7rem] font-medium text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <KindIcon className="size-3" /> {kind.tag}
                        </span>
                        {item.time && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-muted px-1.5 py-0.5 text-primary">
                            <Clock className="size-3" /> {item.time}
                          </span>
                        )}
                      </p>
                      <p className="mb-2 text-sm font-semibold">{item.name}</p>
                      <ItemProgress size="sm" allocated={item.allocated} target={item.target} unit={item.unit} className="text-xs [&_span]:text-xs" />
                      {!done && (
                        <div className="mt-2.5 flex h-9 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
                          <KindIcon className="size-4" /> {kind.cta}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="slik-fungerer-det" className="scroll-mt-6 border-y bg-card py-16">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <h2 className="text-center text-3xl font-bold tracking-tight">Slik fungerer det</h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-muted-foreground">
              Fra idé til ferdig liste på noen få minutter.
            </p>
            <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map(({ icon: Icon, title, text }, index) => (
                <li key={title} className="rounded-2xl bg-background p-6 ring-1 ring-foreground/10">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-brand-muted">
                      <Icon className="size-6 text-primary" />
                    </span>
                    <span className="text-sm font-semibold text-muted-foreground">Steg {index + 1}</span>
                  </div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-muted-foreground">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Who it is for */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">Passer til</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-muted-foreground">
            Alle steder der mange skal bidra litt hver.
          </p>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {AUDIENCES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
                <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-warm-muted">
                  <Icon className="size-6 text-warm" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Benefits */}
        <section className="border-t bg-card py-16">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:items-start">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold tracking-tight">Fordeler</h2>
              <p className="text-lg text-muted-foreground">
                {BRAND.name} er ikke enda en app deltakerne må lære seg. Dere fortsetter å snakke sammen der dere gjør
                i dag. {BRAND.name} er listen dere lenker til.
              </p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {BENEFITS.map(({ icon: Icon, title, text }) => (
                <li key={title} className="rounded-2xl bg-background p-4 ring-1 ring-foreground/10">
                  <Icon className="mb-2 size-5 text-primary" />
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-4xl rounded-3xl bg-primary px-6 py-12 text-center text-primary-foreground shadow-xl shadow-primary/20">
            <h2 className="text-3xl font-bold tracking-tight">{BRAND.slogan}</h2>
            <p className="mx-auto mt-2 max-w-lg text-primary-foreground/85">
              Opprett en liste, del en lenke og la alle velge hvordan de vil bidra.
            </p>
            <Link
              href="/register"
              className={cn(buttonVariants({ size: "xl", variant: "secondary" }), "mt-6 bg-white text-primary hover:bg-white/90")}
            >
              Opprett gratis arrangement <ArrowRight />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        {BRAND.name} · {BRAND.slogan}
      </footer>
    </div>
  );
}
