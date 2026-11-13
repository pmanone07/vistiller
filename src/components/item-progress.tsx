import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber, itemProgress } from "@/lib/format";

interface Props {
  allocated: number;
  target: number;
  unit: string;
  /** Extra quantity the current user is about to add (shown as a lighter segment). */
  pending?: number;
  size?: "sm" | "md";
  className?: string;
}

/** Progress bar + "8 av 10 stk fordelt" + remaining, with a clear done state. */
export function ItemProgress({ allocated, target, unit, pending = 0, size = "md", className }: Props) {
  // `p` positions the solid part of the bar (what others have taken); `shown`
  // is what the text reports: the same plus the person's own pending choice.
  const p = itemProgress(allocated, target);
  const shown = itemProgress(allocated + pending, target);
  const pendingPercent = Math.min(100 - p.percent, Math.round((pending / target) * 100));
  const done = shown.complete;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        className={cn("relative w-full overflow-hidden rounded-full bg-muted", size === "sm" ? "h-1.5" : "h-2.5")}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={Math.min(shown.allocated, target)}
        aria-label={`${shown.allocated} av ${target} ${unit} fordelt`}
      >
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
            p.complete ? "bg-success" : "bg-primary",
          )}
          style={{ width: `${p.percent}%` }}
        />
        {pending > 0 && (
          <div
            className={cn(
              "absolute inset-y-0 rounded-full transition-all duration-300",
              done ? "bg-success/50" : "bg-primary/35",
            )}
            style={{ left: `${p.percent}%`, width: `${pendingPercent}%` }}
          />
        )}
      </div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground tabular-nums">
          <span className="font-medium text-foreground">{formatNumber(shown.allocated)}</span> av{" "}
          {formatNumber(target)} {unit} fordelt
          {pending > 0 && <span> med ditt valg</span>}
        </span>
        {shown.complete ? (
          <span className="inline-flex items-center gap-1 font-medium text-success">
            <CheckCircle2 className="size-4" />
            {shown.extra > 0 ? `Fullført (+${formatNumber(shown.extra)})` : "Fullført"}
          </span>
        ) : (
          <span className="font-medium tabular-nums text-foreground">
            Mangler {formatNumber(shown.remaining)} {unit}
          </span>
        )}
      </div>
    </div>
  );
}
