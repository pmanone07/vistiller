import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  HandHeart,
  Link2,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { ItemProgress } from "@/components/item-progress";
import { cn } from "@/lib/utils";

const DEMO_ITEMS = [
  { name: "Sjokoladekaker", allocated: 8, target: 10, unit: "stk" },
  { name: "Vaffelrøre", allocated: 15, target: 20, unit: "liter" },
  { name: "Boller", allocated: 100, target: 100, unit: "stk" },
];

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link href="/login" className={buttonVariants({ variant: "ghost", size: "lg" })}>
            Logg inn
          </Link>
          <Link href="/register" className={cn(buttonVariants({ size: "lg" }), "hidden sm:inline-flex")}>
            Kom i gang
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-8 pb-16 sm:px-6 lg:grid-cols-2 lg:pt-16">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full bg-brand-muted px-3 py-1 text-sm font-medium text-primary">
              <HandHeart className="size-4" /> For skolekorps og dugnadskomiteer
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              Hvem tar med hva? <span className="text-primary">Nå vet alle det.</span>
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Lag en bidragsliste til loppemarkedet, konserten eller 17. mai-kiosken. Del lenken i Spond, så melder
              foreldrene seg på uten konto og ser med en gang hva som mangler.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className={buttonVariants({ size: "xl" })}>
                Lag en bidragsliste gratis <ArrowRight />
              </Link>
              <Link href="/a/demo-loppemarked-2027" className={buttonVariants({ size: "xl", variant: "outline" })}>
                Se et eksempel
              </Link>
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {["Ingen app å installere", "Foreldre trenger ikke konto", "Gratis å starte"].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-success" /> {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Phone mockup */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-br from-primary/20 via-brand-muted to-success-muted blur-2xl" />
            <div className="rounded-[2.5rem] border-8 border-foreground/90 bg-background p-4 shadow-2xl">
              <p className="text-xs font-medium text-primary">Solberg skolekorps</p>
              <p className="text-lg font-bold">Loppemarked – Våren 2027</p>
              <p className="mb-4 text-xs text-muted-foreground">Lørdag 24. april 2027</p>
              <div className="space-y-3">
                {DEMO_ITEMS.map((item) => {
                  const done = item.allocated >= item.target;
                  return (
                    <div
                      key={item.name}
                      className={cn("rounded-2xl bg-card p-3 ring-1", done ? "bg-success-muted/60 ring-success/25" : "ring-foreground/10")}
                    >
                      <p className="mb-2 text-sm font-semibold">{item.name}</p>
                      <ItemProgress size="sm" allocated={item.allocated} target={item.target} unit={item.unit} className="text-xs [&_span]:text-xs" />
                      {!done && (
                        <div className="mt-2.5 flex h-9 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
                          <HandHeart className="size-4" /> Jeg tar med
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
        <section className="border-y bg-card py-16">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <h2 className="text-center text-3xl font-bold tracking-tight">Klart på tre minutter</h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-muted-foreground">
              Korpsfix gjør én ting, og gjør den skikkelig: holder styr på bidragene.
            </p>
            <ol className="mt-10 grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: ClipboardList,
                  title: "1. Lag listen",
                  text: "Skriv inn hva dere trenger: 10 kaker, 20 liter vaffelrøre, 100 boller.",
                },
                {
                  icon: Link2,
                  title: "2. Del lenken",
                  text: "Lim lenken inn i Spond, Messenger eller på SMS. Eller heng opp QR-koden.",
                },
                {
                  icon: Users,
                  title: "3. Foreldrene melder seg",
                  text: "De velger hva de tar med på under ett minutt. Alle ser hva som mangler.",
                },
              ].map(({ icon: Icon, title, text }) => (
                <li key={title} className="rounded-2xl bg-background p-6 ring-1 ring-foreground/10">
                  <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-brand-muted">
                    <Icon className="size-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-muted-foreground">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold tracking-tight">Fungerer sammen med Spond</h2>
              <p className="text-lg text-muted-foreground">
                Korpsfix er ikke enda en app foreldrene må lære seg. Dere fortsetter å kommunisere der dere gjør i dag.
                Korpsfix er bare listen dere lenker til, så slipper dere regneark, papirlapper og
                «hvem tok egentlig gulrotkaka?».
              </p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: Smartphone, title: "Laget for mobil", text: "Store knapper og få steg. Kan installeres som app." },
                { icon: CheckCircle2, title: "Aldri for mange kaker", text: "Listen stopper automatisk når behovet er dekket." },
                { icon: QrCode, title: "Lenke og QR-kode", text: "Del digitalt, eller heng opp en plakat." },
                { icon: ShieldCheck, title: "Personvern", text: "Telefon og e-post vises bare for arrangøren." },
                { icon: MessageCircle, title: "Endre selv", text: "Foreldre får en privat lenke for å endre eller avbestille." },
                { icon: Users, title: "Full oversikt", text: "Se hvem som tar med hva, og marker det som er levert." },
              ].map(({ icon: Icon, title, text }) => (
                <li key={title} className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
                  <Icon className="mb-2 size-5 text-primary" />
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 pb-20 sm:px-6">
          <div className="mx-auto max-w-4xl rounded-3xl bg-primary px-6 py-12 text-center text-primary-foreground shadow-xl shadow-primary/20">
            <h2 className="text-3xl font-bold tracking-tight">Neste dugnad blir enklere</h2>
            <p className="mx-auto mt-2 max-w-lg text-primary-foreground/80">
              Gratis for ett aktivt arrangement. Ingen kredittkort.
            </p>
            <Link
              href="/register"
              className={cn(buttonVariants({ size: "xl", variant: "secondary" }), "mt-6 bg-white text-primary hover:bg-white/90")}
            >
              Opprett konto <ArrowRight />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        Korpsfix · Laget for norske skolekorps
      </footer>
    </div>
  );
}
