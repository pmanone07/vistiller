import { Mail, PackageCheck, Phone } from "lucide-react";
import { formatNumber } from "@/lib/format";
import type { Signup } from "@/lib/types";
import type { AdminItem } from "@/server/dashboard";

interface PersonRow {
  signup: Signup;
  lines: { itemName: string; quantity: number; unit: string; delivered: boolean }[];
}

/** "Hvem tar med hva": contributions grouped per person, sorted by name. */
export function PeopleList({ items }: { items: AdminItem[] }) {
  const people = new Map<string, PersonRow>();
  for (const item of items) {
    for (const c of item.contributions) {
      const row = people.get(c.signup_id) ?? { signup: c.signup, lines: [] };
      row.lines.push({ itemName: item.name, quantity: c.quantity, unit: item.unit, delivered: Boolean(c.delivered_at) });
      people.set(c.signup_id, row);
    }
  }
  const rows = [...people.values()].sort((a, b) =>
    a.signup.contributor_name.localeCompare(b.signup.contributor_name, "nb"),
  );

  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
        Ingen har meldt seg på ennå. Del lenken for å komme i gang.
      </p>
    );
  }

  return (
    <ul className="divide-y overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
      {rows.map(({ signup, lines }) => (
        <li key={signup.id} className="space-y-1.5 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="font-semibold">{signup.contributor_name}</p>
            <div className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
              {signup.contributor_phone && (
                <a href={`tel:${signup.contributor_phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1 hover:text-foreground">
                  <Phone className="size-3.5" /> {signup.contributor_phone}
                </a>
              )}
              {signup.contributor_email && (
                <a href={`mailto:${signup.contributor_email}`} className="inline-flex items-center gap-1 hover:text-foreground">
                  <Mail className="size-3.5" /> {signup.contributor_email}
                </a>
              )}
            </div>
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {lines.map((line) => (
              <li
                key={line.itemName}
                className={
                  line.delivered
                    ? "inline-flex items-center gap-1 rounded-full bg-success-muted px-2.5 py-1 text-sm text-success"
                    : "rounded-full bg-brand-muted px-2.5 py-1 text-sm"
                }
              >
                {line.delivered && <PackageCheck className="size-3.5" />}
                {formatNumber(line.quantity)} {line.unit} {line.itemName.toLowerCase()}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
