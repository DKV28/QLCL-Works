import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/lib/data/profiles";
import { reportScope } from "@/lib/data/permissions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const canViewReports = (await reportScope()) !== "none";

  return (
    <AppShell profile={profile} canViewReports={canViewReports}>
      {children}
    </AppShell>
  );
}
