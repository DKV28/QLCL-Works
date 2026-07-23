import { redirect } from "next/navigation";
import { UsersClient } from "@/components/admin/UsersClient";
import { getCurrentProfile, listProfiles } from "@/lib/data/profiles";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const me = await getCurrentProfile();
  if (!me || me.role !== "admin") redirect("/cong-viec");

  const users = await listProfiles();
  return <UsersClient users={users} />;
}
