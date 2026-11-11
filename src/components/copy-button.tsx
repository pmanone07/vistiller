"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Props = Omit<React.ComponentProps<typeof Button>, "onClick"> & {
  value: string;
  label?: string;
  copiedLabel?: string;
};

export function CopyButton({ value, label = "Kopier", copiedLabel = "Kopiert!", ...props }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Lenken er kopiert");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kunne ikke kopiere. Marker lenken og kopier manuelt.");
    }
  }

  return (
    <Button type="button" onClick={copy} {...props}>
      {copied ? <Check /> : <Copy />}
      {copied ? copiedLabel : label}
    </Button>
  );
}
