"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ContactValue {
  name: string;
  email: string;
  phone: string;
}

/** Name (required) + optional phone/email. Contact info is only shown to organizers. */
export function ContactFields({
  value,
  onChange,
  errors = {},
  autoFocus,
}: {
  value: ContactValue;
  onChange: (value: ContactValue) => void;
  errors?: Record<string, string>;
  autoFocus?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="kf-name">Navnet ditt</Label>
        <Input
          id="kf-name"
          name="name"
          autoComplete="name"
          placeholder="F.eks. Kari (mor til Ola)"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          aria-invalid={Boolean(errors.name)}
          maxLength={80}
          required
          autoFocus={autoFocus}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="kf-phone">
            Mobil <span className="font-normal text-muted-foreground">(valgfritt)</span>
          </Label>
          <Input
            id="kf-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="900 00 000"
            value={value.phone}
            onChange={(e) => onChange({ ...value, phone: e.target.value })}
            aria-invalid={Boolean(errors.phone)}
            maxLength={30}
          />
          {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="kf-email">
            E-post <span className="font-normal text-muted-foreground">(valgfritt)</span>
          </Label>
          <Input
            id="kf-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="kari@eksempel.no"
            value={value.email}
            onChange={(e) => onChange({ ...value, email: e.target.value })}
            aria-invalid={Boolean(errors.email)}
            maxLength={200}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Kontaktinfo vises bare for arrangøren, ikke for andre deltakere.
      </p>
    </div>
  );
}
