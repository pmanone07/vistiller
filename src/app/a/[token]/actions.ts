"use server";

import { headers } from "next/headers";
import { clientIp, createSignup, hashIp, type SignupPayload } from "@/server/public-signups";
import type { ActionResult } from "@/lib/types";

export async function submitSignup(
  token: string,
  payload: SignupPayload,
): Promise<ActionResult<{ editToken: string }>> {
  const ipHash = hashIp(clientIp(await headers()));
  return createSignup(token, payload, ipHash);
}
