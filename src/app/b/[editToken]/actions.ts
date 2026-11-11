"use server";

import { cancelSignup, updateSignup, type SignupPayload } from "@/server/public-signups";
import type { ActionResult } from "@/lib/types";

export async function saveSignupChanges(editToken: string, payload: SignupPayload): Promise<ActionResult> {
  return updateSignup(editToken, payload);
}

export async function cancelSignupAction(editToken: string): Promise<ActionResult> {
  return cancelSignup(editToken);
}
