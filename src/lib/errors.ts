/** Maps database error codes (raised as KF_*) to Norwegian user-facing text. */
const MESSAGES: Record<string, string> = {
  KF_EVENT_NOT_FOUND: "Fant ikke arrangementet. Lenken kan være feil eller utløpt.",
  KF_EVENT_CLOSED: "Påmeldingen er stengt for dette arrangementet.",
  KF_EVENT_FULL: "Arrangementet tar ikke imot flere påmeldinger.",
  KF_INVALID_NAME: "Skriv inn navnet ditt (maks 80 tegn).",
  KF_INVALID_EMAIL: "E-postadressen ser ikke riktig ut.",
  KF_INVALID_PHONE: "Telefonnummeret ser ikke riktig ut.",
  KF_INVALID_ITEMS: "Noe gikk galt med valgene dine. Prøv igjen.",
  KF_DUPLICATE_ITEM: "Samme bidrag er valgt to ganger.",
  KF_INVALID_QUANTITY: "Ugyldig antall.",
  KF_ITEM_NOT_FOUND: "Et av bidragene finnes ikke lenger. Last inn siden på nytt.",
  KF_NO_ITEMS: "Velg minst ett bidrag.",
  KF_RATE_LIMITED: "Du har sendt mange påmeldinger på kort tid. Vent litt og prøv igjen.",
  KF_SIGNUP_NOT_FOUND: "Fant ikke påmeldingen. Den kan være slettet.",
  KF_ALREADY_DELIVERED: "Det arrangøren har krysset av som levert eller utført, kan ikke endres. Kontakt arrangøren.",
  KF_NOT_AUTHENTICATED: "Du må være logget inn.",
  KF_TOO_MANY_ORGANIZATIONS: "Du kan ikke opprette flere organisasjoner.",
  KF_INVALID_NAME_ORG: "Navnet må være mellom 1 og 100 tegn.",
  KF_NOT_FOUND: "Fant ikke det du lette etter.",
};

export const GENERIC_ERROR = "Noe gikk galt. Prøv igjen om litt.";

interface DbError {
  message?: string;
  details?: string | null;
  code?: string;
}

export function errorCode(error: DbError | null | undefined): string | undefined {
  return error?.message?.match(/KF_[A-Z_]+/)?.[0];
}

export function dbErrorMessage(error: DbError | null | undefined): string {
  if (!error) return GENERIC_ERROR;
  const code = errorCode(error);

  if (code === "KF_NOT_ENOUGH_REMAINING") {
    try {
      const d = JSON.parse(error.details ?? "{}") as {
        item_name?: string;
        remaining?: number;
        unit?: string;
      };
      const name = d.item_name ?? "bidraget";
      if (!d.remaining) return `Beklager, ${name} er allerede fullt fordelt. Noen kom deg i forkjøpet.`;
      return `Beklager, det mangler bare ${d.remaining} ${d.unit ?? ""} av ${name} nå. Noen kom deg i forkjøpet.`;
    } catch {
      return "Det er ikke nok igjen av et av bidragene. Last inn siden og prøv igjen.";
    }
  }
  if (code && MESSAGES[code]) return MESSAGES[code];
  if (error.code === "42501") return "Du har ikke tilgang til dette.";
  if (error.code === "23514") return "Noen av verdiene er ugyldige.";
  return GENERIC_ERROR;
}
