"use client";

/**
 * Remembers a parent's own signups on this device (localStorage), so the
 * public list can show "Dine bidrag" with a link back to the edit page.
 * Purely a convenience; the private edit link is the real source of truth.
 */

const KEY = "korpsfix:signups:v1";
const NAME_KEY = "korpsfix:contact:v1";

export interface RememberedSignup {
  eventToken: string;
  editToken: string;
  name: string;
  savedAt: string;
}

function read(): RememberedSignup[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as RememberedSignup[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(list: RememberedSignup[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(-50)));
  } catch {
    // Storage full or blocked (private mode) – ignore.
  }
}

export function rememberSignup(entry: Omit<RememberedSignup, "savedAt">) {
  const list = read().filter((s) => s.editToken !== entry.editToken);
  list.push({ ...entry, savedAt: new Date().toISOString() });
  write(list);
}

export function forgetSignup(editToken: string) {
  write(read().filter((s) => s.editToken !== editToken));
}

export function signupsForEvent(eventToken: string) {
  return read().filter((s) => s.eventToken === eventToken);
}

export interface RememberedContact {
  name: string;
  email?: string;
  phone?: string;
}

export function loadContact(): RememberedContact | null {
  try {
    const raw = window.localStorage.getItem(NAME_KEY);
    return raw ? (JSON.parse(raw) as RememberedContact) : null;
  } catch {
    return null;
  }
}

export function saveContact(contact: RememberedContact) {
  try {
    window.localStorage.setItem(NAME_KEY, JSON.stringify(contact));
  } catch {
    // ignore
  }
}
