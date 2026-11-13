"use server";

import { refresh } from "next/cache";
import { cancelSignup, updateSignup, type SignupPayload } from "@/server/public-signups";
import type { ActionResult } from "@/lib/types";

export async function saveSignupChanges(editToken: string, payload: SignupPayload): Promise<ActionResult> {
  const result = await updateSignup(editToken, payload);
  // The refreshed page arrives with the action's response, so the saved quantities show immediately.
  if (result.ok) refresh();
  return result;
}

export async function cancelSignupAction(editToken: string): Promise<ActionResult> {
  // No refresh() here: it would re-render this page as "not found" for a moment.
  // The client navigates to the list and refreshes it instead.
  return cancelSignup(editToken);
}
