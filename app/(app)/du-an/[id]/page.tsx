import { notFound } from "next/navigation";
import { ProjectDetailClient } from "@/components/projects/ProjectDetailClient";
import { getProject } from "@/lib/data/projects";
import { listTasksByProject } from "@/lib/data/tasks";
import { listActiveMemberLites } from "@/lib/data/members";
import { listTags } from "@/lib/data/tags";
import { listTaskPrioritySettings } from "@/lib/data/settings";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const project = await getProject(params.id);
  if (!project) notFound();

  const [tasks, members, tags, prioritySettings] = await Promise.all([
    listTasksByProject(params.id),
    listActiveMemberLites(),
    listTags(),
    listTaskPrioritySettings(),
  ]);

  return (
    <ProjectDetailClient
      project={project}
      tasks={tasks}
      members={members}
      tags={tags}
      prioritySettings={prioritySettings}
    />
  );
}
