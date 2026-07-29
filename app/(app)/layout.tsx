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
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <aside className="hidden w-64 shrink-0 border-r border-gray-200/80 bg-white md:block dark:border-gray-800 dark:bg-gray-900">
        <div className="flex h-16 items-center border-b border-gray-200/80 px-5 dark:border-gray-800">
          <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight text-gray-950 dark:text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm text-white">
              Q
            </span>
            <span>QLCL Works</span>
          </Link>
        </div>
        <Sidebar isAdmin={profile.role === "admin"} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar profile={profile} />
        <div className="border-b border-gray-200 bg-white md:hidden dark:border-gray-800 dark:bg-gray-900">
          <Sidebar isAdmin={profile.role === "admin"} compact />
        </div>
        <main className="flex-1 overflow-x-hidden p-3 sm:p-5 md:p-7">
          <div className="mx-auto w-full max-w-[1680px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
