/**
 * Copies text to the clipboard. Resolves to false if it could not be copied.
 *
 * `navigator.clipboard` only exists in secure contexts (HTTPS or localhost), so
 * it is missing when the page is served over plain HTTP from another host, as
 * the Android shell does against the dev server. Fall back to the legacy
 * selection-based copy there.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or document not focused: try the fallback below.
  }
  return legacyCopy(text);
}

function legacyCopy(text: string): boolean {
  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  // Stay inside an open dialog: its focus trap would pull focus back out of an
  // element appended to <body>, and the copy needs the focused selection.
  const host = active?.closest('[role="dialog"]') ?? document.body;
  const field = document.createElement("textarea");
  field.value = text;
  field.readOnly = true;
  field.setAttribute("aria-hidden", "true");
  field.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;";
  host.appendChild(field);
  try {
    field.focus({ preventScroll: true });
    field.select();
    field.setSelectionRange(0, text.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    field.remove();
    active?.focus({ preventScroll: true });
  }
}
