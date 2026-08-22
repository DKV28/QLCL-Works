import { redirect } from "next/navigation";
import { ReportsClient } from "@/components/reports/ReportsClient";
import { listAllTasks } from "@/lib/data/tasks";
import { getMyMemberId, listActiveMemberLites } from "@/lib/data/members";
import { listProjects } from "@/lib/data/projects";
import { reportScope } from "@/lib/data/permissions";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const scope = await reportScope();
  // Không có chức năng báo cáo -> đưa về trang chủ.
  if (scope === "none") redirect("/");

  const [tasks, members, projects, myMemberId] = await Promise.all([
    listAllTasks(),
    listActiveMemberLites(),
    listProjects(),
    scope === "own" ? getMyMemberId() : Promise.resolve(null),
  ]);

  const projectOptions = projects.map((p) => ({ id: p.id, name: p.name }));

  return (
    <ReportsClient
      tasks={tasks}
      members={members}
      projects={projectOptions}
      scope={scope}
      myMemberId={myMemberId}
    />
  );
}
