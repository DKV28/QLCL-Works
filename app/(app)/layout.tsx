import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/lib/data/profiles";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  return <AppShell profile={profile}>{children}</AppShell>;
}
