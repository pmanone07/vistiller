"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  onChange: (value: number) => void;
  /** Max the person can pick (remaining + what they already hold). null = no limit. */
  max: number | null;
  unit: string;
  label: string;
}

/**
 * Quick-pick chips (1, 2, 3 …) for the common case, plus a stepper for
 * larger amounts. Designed for one-thumb use on a phone.
 */
export function QuantityPicker({ value, onChange, max, unit, label }: Props) {
  const limit = max ?? 10000;
  const chips = quickChoices(limit);
  const clamp = (n: number) => Math.max(0, Math.min(limit, Math.floor(n)));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label={`Velg antall ${label}`}>
        {chips.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? 0 : n)}
            aria-pressed={value === n}
            className={cn(
              "h-11 min-w-11 rounded-xl border px-3 text-base font-semibold tabular-nums transition-colors",
              value === n
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-input bg-card hover:border-primary/50 hover:bg-brand-muted",
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon-xl"
          onClick={() => onChange(clamp(value - 1))}
          disabled={value <= 0}
          aria-label="Færre"
        >
          <Minus />
        </Button>
        <label className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-input bg-card px-3 h-12">
          <span className="sr-only">Antall {label}</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={limit}
            value={value === 0 ? "" : value}
            placeholder="0"
            onChange={(e) => onChange(clamp(Number(e.target.value || 0)))}
            className="w-16 bg-transparent text-center text-lg font-semibold tabular-nums outline-none"
          />
          <span className="text-muted-foreground">{unit}</span>
        </label>
        <Button
          type="button"
          variant="outline"
          size="icon-xl"
          onClick={() => onChange(clamp(value + 1))}
          disabled={value >= limit}
          aria-label="Flere"
        >
          <Plus />
        </Button>
      </div>
      {max !== null && (
        <p className="text-xs text-muted-foreground">
          Du kan bidra med opptil {max} {unit}.
        </p>
      )}
    </div>
  );
}

/** 1–4 for small needs; sensible round numbers for bigger ones. */
function quickChoices(limit: number): number[] {
  if (limit <= 0) return [];
  const base = limit <= 6 ? [1, 2, 3, 4, 5, 6] : limit <= 30 ? [1, 2, 3, 4, 5, 10] : [1, 2, 5, 10, 20, 50];
  return base.filter((n) => n <= limit);
}
