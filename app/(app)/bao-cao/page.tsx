import { ReportsClient } from "@/components/reports/ReportsClient";
import { listAllTasks } from "@/lib/data/tasks";
import { listActiveMemberLites } from "@/lib/data/members";
import { listProjects } from "@/lib/data/projects";
import { getCurrentProfile } from "@/lib/data/profiles";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const [tasks, members, projects, profile] = await Promise.all([
    listAllTasks(),
    listActiveMemberLites(),
    listProjects(),
    getCurrentProfile(),
  ]);

  const projectOptions = projects.map((p) => ({ id: p.id, name: p.name }));

  return (
    <ReportsClient
      tasks={tasks}
      members={members}
      projects={projectOptions}
      canViewWeekly={
        profile?.role === "manager" || profile?.role === "admin"
      }
    />
  );
}
