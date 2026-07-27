import { redirect } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { getCurrentProfile } from "@/lib/data/profiles";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r border-gray-200 bg-white md:block dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <Link href="/" className="text-lg font-bold text-brand">
            QLCL Works
          </Link>
        </div>
        <Sidebar isAdmin={profile.role === "admin"} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar profile={profile} />
        <div className="border-b border-gray-200 bg-white md:hidden dark:border-gray-800 dark:bg-gray-900">
          <Sidebar isAdmin={profile.role === "admin"} compact />
        </div>
        <main className="flex-1 overflow-x-hidden p-3 sm:p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
