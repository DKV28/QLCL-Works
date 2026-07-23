import { DashboardClient } from "@/components/reports/DashboardClient";
import { listAllTasks } from "@/lib/data/tasks";
import { listActiveMemberLites } from "@/lib/data/members";
import { listProjects } from "@/lib/data/projects";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const [tasks, members, projects] = await Promise.all([
    listAllTasks(),
    listActiveMemberLites(),
    listProjects(),
  ]);

  const projectOptions = projects.map((p) => ({ id: p.id, name: p.name }));

  return (
    <DashboardClient
      tasks={tasks}
      members={members}
      projects={projectOptions}
    />
  );
}
