"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { clientIp, createSignup, hashIp, type SignupPayload } from "@/server/public-signups";
import type { ActionResult } from "@/lib/types";

export async function submitSignup(
  token: string,
  payload: SignupPayload,
): Promise<ActionResult<{ editToken: string }>> {
  const ipHash = hashIp(clientIp(await headers()));
  const result = await createSignup(token, payload, ipHash);
  // Drop cached copies of the list so going back to it shows the new numbers at once.
  if (result.ok) refresh();
  return result;
}
