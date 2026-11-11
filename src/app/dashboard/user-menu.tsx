import { requireUser } from "@/lib/auth";
import { UserMenuClient } from "./user-menu-client";

export async function UserMenu() {
  const { user } = await requireUser();
  return <UserMenuClient email={user.email ?? ""} />;
}
