import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Organization } from "@/lib/types";

/** Returns the signed-in organizer or redirects to /login. */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { supabase, user: data.user };
});

/** The organizations the current user is a member of (oldest first). */
export const getOrganizations = cache(async (): Promise<Organization[]> => {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, plan, created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Organization[];
});
