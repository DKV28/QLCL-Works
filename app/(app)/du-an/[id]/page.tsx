import { notFound } from "next/navigation";
import { ProjectDetailClient } from "@/components/projects/ProjectDetailClient";
import { getProject } from "@/lib/data/projects";
import { listTasksByProject } from "@/lib/data/tasks";
import { listProfiles } from "@/lib/data/profiles";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const project = await getProject(params.id);
  if (!project) notFound();

  const [tasks, profiles] = await Promise.all([
    listTasksByProject(params.id),
    listProfiles(),
  ]);

  const assignees = profiles.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email,
  }));

  return (
    <ProjectDetailClient
      project={project}
      tasks={tasks}
      assignees={assignees}
    />
  );
}
