"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setDelivered } from "../../actions";

interface Props {
  contributionId: string;
  delivered: boolean;
  /** Show the text label at all widths. By default it is visually hidden below `sm` (icon only). */
  alwaysShowLabel?: boolean;
  /** Called after the action succeeded, with the new state. */
  onToggled?: (delivered: boolean) => void;
  className?: string;
}

/**
 * "Marker levert" / "Levert" toggle for one contribution. Runs the server
 * action, which refreshes the current route so the surrounding list updates.
 */
export function DeliveredToggle({ contributionId, delivered, alwaysShowLabel = false, onToggled, className }: Props) {
  const [pending, startTransition] = useTransition();

  const toggle = () =>
    startTransition(async () => {
      const result = await setDelivered(contributionId, !delivered);
      if (!result.ok) return void toast.error(result.error);
      onToggled?.(!delivered);
    });

  return (
    <Button
      variant={delivered ? "default" : "outline"}
      size="lg"
      onClick={toggle}
      disabled={pending}
      className={cn("shrink-0", delivered && "bg-success text-success-foreground hover:bg-success/90", className)}
      aria-pressed={delivered}
    >
      {pending ? <Loader2 className="animate-spin" /> : <PackageCheck />}
      <span className={alwaysShowLabel ? undefined : "sr-only sm:not-sr-only"}>
        {delivered ? "Levert" : "Marker levert"}
      </span>
    </Button>
  );
}
