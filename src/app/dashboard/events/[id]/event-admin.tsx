"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  ExternalLink,
  FolderTree,
  Link2,
  ListChecks,
  Lock,
  LockOpen,
  MapPin,
  MoreHorizontal,
  PackageCheck,
  PartyPopper,
  Pencil,
  PieChart,
  Plus,
  RefreshCw,
  Share2,
  Trash2,
  Users,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useAutoRefresh } from "@/components/public/use-auto-refresh";
import { formatEventDate, formatNumber } from "@/lib/format";
import { eventTypeLabel } from "@/lib/kinds";
import { groupItems } from "@/lib/group";
import { cn } from "@/lib/utils";
import type { Item } from "@/lib/types";
import type { EventDetail } from "@/server/dashboard";
import { deleteEvent, regenerateShareLink, setEventStatus } from "../../actions";
import { EventForm } from "../event-form";
import { CategoriesDialog } from "./categories-dialog";
import { ItemAdminCard } from "./item-admin-card";
import { ItemDialog } from "./item-dialog";
import { PeopleList } from "./people-list";
import { ShareDialog } from "./share-dialog";

interface Props {
  detail: EventDetail;
  shareUrl: string;
  justCreated: boolean;
}

export function EventAdmin({ detail, shareUrl, justCreated }: Props) {
  const router = useRouter();
  const { event, categories, items, stats } = detail;
  const [view, setView] = useState<"items" | "people">("items");
  const [shareOpen, setShareOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [itemDialog, setItemDialog] = useState<{ open: boolean; item: Item | null; categoryId?: string | null }>({
    open: justCreated && items.length === 0,
    item: null,
  });
  const [confirm, setConfirm] = useState<"delete" | "regenerate" | null>(null);
  const [statusPending, startStatus] = useTransition();

  // Show new sign-ups without a manual reload: fetch fresh data every 5 seconds
  // and whenever the tab becomes visible again. Paused while a dialog is open,
  // so a refresh never resets a form the organizer is filling in.
  const dialogOpen = shareOpen || editOpen || categoriesOpen || itemDialog.open || confirm !== null;
  useAutoRefresh(5000, !dialogOpen);

  const groups = useMemo(() => groupItems(items, categories, true), [items, categories]);
  const date = formatEventDate(event.event_date);
  const typeLabel = eventTypeLabel(event.event_type);
  const isOpen = event.status === "open";
  const deliveryHref = `/dashboard/events/${event.id}/delivery` as const;

  // Drop "?ny=1" once handled so a reload doesn't reopen the item dialog.
  useEffect(() => {
    if (justCreated) window.history.replaceState(null, "", `/dashboard/events/${event.id}`);
  }, [justCreated, event.id]);

  const openNewItem = (categoryId?: string | null) => setItemDialog({ open: true, item: null, categoryId });

  const toggleStatus = () =>
    startStatus(async () => {
      const result = await setEventStatus(event.id, isOpen ? "closed" : "open");
      if (!result.ok) return void toast.error(result.error);
      toast.success(isOpen ? "Påmeldingen er stengt" : "Påmeldingen er åpnet igjen");
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> {event.organization.name}
        </Link>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-balance">{event.title}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {typeLabel && (
                <span className="rounded-full bg-brand-muted px-2 py-0.5 text-xs font-medium text-primary">
                  {typeLabel}
                </span>
              )}
              {date && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-4" /> {date}
                </span>
              )}
              {event.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4" /> {event.location}
                </span>
              )}
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                  isOpen ? "bg-success-muted text-success" : "bg-muted text-muted-foreground",
                )}
              >
                {isOpen ? <LockOpen className="size-3" /> : <Lock className="size-3" />}
                {isOpen ? "Åpen for påmelding" : "Påmelding stengt"}
              </span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="icon-xl" aria-label="Flere valg" />}>
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil /> Rediger arrangement
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCategoriesOpen(true)}>
                <FolderTree /> Kategorier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleStatus} disabled={statusPending}>
                {isOpen ? <Lock /> : <LockOpen />} {isOpen ? "Steng påmeldingen" : "Åpne påmeldingen"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setConfirm("regenerate")}>
                <RefreshCw /> Lag ny delingslenke
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setConfirm("delete")}>
                <Trash2 /> Slett arrangement
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2 sm:flex">
          <Button size="xl" onClick={() => setShareOpen(true)} className="sm:px-6">
            <Share2 /> Del arrangement
          </Button>
          <a
            href={`/a/${event.public_token}`}
            target="_blank"
            rel="noopener"
            className={buttonVariants({ variant: "outline", size: "xl" })}
          >
            <ExternalLink /> <span className="hidden sm:inline">Se som deltaker</span>
          </a>
        </div>
      </div>

      {justCreated && items.length === 0 && (
        <div className="flex gap-3 rounded-2xl bg-success-muted p-4 text-sm">
          <PartyPopper className="size-5 shrink-0 text-success" />
          <p>
            <span className="font-semibold">Arrangementet er opprettet!</span> Legg inn det dere trenger, og trykk «Del
            arrangement» når du er klar.
          </p>
        </div>
      )}

      {/* Stats */}
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Users} label="Påmeldte" value={formatNumber(stats.signupCount)} />
        <Stat
          icon={PieChart}
          label="Av behovet dekket"
          value={`${stats.coverage}%`}
          tone={items.length > 0 && stats.coverage >= 100 ? "success" : "default"}
        />
        <Stat
          icon={ListChecks}
          label={stats.missingCount === 1 ? "Bidrag mangler" : "Bidrag mangler"}
          value={formatNumber(stats.missingCount)}
          tone={items.length > 0 && stats.missingCount === 0 ? "success" : "default"}
        />
        <Stat
          icon={PackageCheck}
          label="Krysset av"
          value={`${stats.deliveredCount}/${stats.contributionCount}`}
          href={deliveryHref}
          linkLabel={`Avkrysning: ${stats.deliveredCount} av ${stats.contributionCount} bidrag er krysset av`}
        />
      </dl>

      {items.length > 0 && (
        <Link href={deliveryHref} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}>
          <PackageCheck /> Avkrysning
          <ChevronRight className="ml-auto sm:ml-0" />
        </Link>
      )}

      {/* View switch + item actions. On phones the actions wrap onto their own full-width line. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-muted p-1" role="tablist" aria-label="Visning">
          {(
            [
              ["items", "Bidrag"],
              ["people", "Hvem gjør hva"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={view === key}
              onClick={() => setView(key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                view === key ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {view === "items" && (
          <div className={cn("ml-auto flex gap-2", items.length > 0 && "w-full sm:w-auto")}>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setCategoriesOpen(true)}
              className={cn(items.length > 0 && "flex-auto sm:flex-none")}
            >
              <FolderTree /> Kategorier
              {categories.length > 0 && <span className="text-muted-foreground tabular-nums">({categories.length})</span>}
            </Button>
            {items.length > 0 && (
              <Button size="lg" onClick={() => openNewItem()} className="flex-auto sm:flex-none">
                <Plus /> <span className="hidden sm:inline">Legg til bidrag</span>
                <span className="sm:hidden">Legg til</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {view === "people" ? (
        <PeopleList items={items} />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed bg-card/50 px-6 py-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-muted">
            <ListChecks className="size-7 text-primary" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Hva trenger dere hjelp til?</h2>
            <p className="max-w-sm text-muted-foreground">
              Legg inn ting å ta med, oppgaver, vakter og transport, f.eks. 6 kaker, 2 kioskvakter kl. 10–12 og
              4 personer til rydding. Deltakerne ser hva som mangler.
            </p>
          </div>
          <Button size="xl" onClick={() => openNewItem()}>
            <Plus /> Legg til første bidrag
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.category?.id ?? "none"} className="space-y-3">
              {(group.category || categories.length > 0) && (
                <div className="flex items-center justify-between gap-2 px-1">
                  <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                    {group.category?.name ?? "Uten kategori"}
                  </h2>
                  {group.category && (
                    <Button variant="ghost" size="sm" onClick={() => openNewItem(group.category?.id)}>
                      <Plus /> Legg til her
                    </Button>
                  )}
                </div>
              )}
              {group.items.length === 0 ? (
                <p className="rounded-2xl border border-dashed p-4 text-center text-sm text-muted-foreground">
                  Ingen bidrag i denne kategorien ennå.
                </p>
              ) : (
                <ul className="space-y-3">
                  {group.items.map((item, index) => (
                    <li key={item.id}>
                      <ItemAdminCard
                        item={item}
                        isFirst={index === 0}
                        isLast={index === group.items.length - 1}
                        onEdit={() => setItemDialog({ open: true, item })}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      {/* Floating share hint for mobile when there's something to share */}
      {items.length > 0 && stats.signupCount === 0 && (
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="flex w-full items-center gap-3 rounded-2xl bg-brand-muted p-4 text-left text-sm"
        >
          <Link2 className="size-5 shrink-0 text-primary" />
          <span>
            <span className="font-semibold">Klar til å dele?</span> Kopier lenken og send den til deltakerne, der dere vanligvis snakker sammen.
          </span>
        </button>
      )}

      {/* Dialogs */}
      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        url={shareUrl}
        title={event.title}
        eventDate={event.event_date}
      />
      <ItemDialog
        open={itemDialog.open}
        onOpenChange={(open) => setItemDialog((s) => ({ ...s, open }))}
        eventId={event.id}
        categories={categories}
        item={itemDialog.item}
        defaultCategoryId={itemDialog.categoryId}
      />
      <CategoriesDialog
        open={categoriesOpen}
        onOpenChange={setCategoriesOpen}
        eventId={event.id}
        categories={categories}
      />
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">Rediger arrangement</DialogTitle>
          </DialogHeader>
          <EventForm
            eventId={event.id}
            initial={{
              title: event.title,
              event_date: event.event_date ?? "",
              location: event.location ?? "",
              description: event.description ?? "",
              event_type: event.event_type ?? "",
            }}
            onDone={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Slette «${event.title}»?`}
        description="Alle bidrag og påmeldinger slettes, og delingslenken slutter å virke. Dette kan ikke angres."
        confirmLabel="Slett arrangement"
        onConfirm={async () => {
          const result = await deleteEvent(event.id);
          if (result && !result.ok) {
            toast.error(result.error);
            return false;
          }
        }}
      />
      <ConfirmDialog
        open={confirm === "regenerate"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Lage ny delingslenke?"
        description="Den gamle lenken slutter å virke med en gang. Bruk dette hvis lenken er delt med feil personer. Påmeldingene beholdes."
        confirmLabel="Lag ny lenke"
        destructive={false}
        onConfirm={async () => {
          const result = await regenerateShareLink(event.id);
          if (!result.ok) {
            toast.error(result.error);
            return false;
          }
          toast.success("Ny lenke er laget. Husk å dele den på nytt.");
          router.refresh();
          setShareOpen(true);
        }}
      />
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone = "default",
  href,
  linkLabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "default" | "success";
  /** Makes the whole card a link (stretched over the card, so the dl stays valid). */
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl p-4 ring-1",
        tone === "success" ? "bg-success-muted ring-success/20" : "bg-card ring-foreground/10",
        href &&
          "group relative transition-all has-[a:hover]:shadow-md has-[a:hover]:ring-primary/30 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring",
      )}
    >
      <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Icon className="size-4" /> {label}
        {href && (
          <ChevronRight className="ml-auto size-4 shrink-0 transition-transform group-has-[a:hover]:translate-x-0.5" />
        )}
      </dt>
      <dd className={cn("mt-1 text-2xl font-bold tabular-nums", tone === "success" && "text-success")}>
        {href ? (
          <Link href={href} aria-label={linkLabel} className="outline-none after:absolute after:inset-0 after:rounded-2xl">
            {value}
          </Link>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
