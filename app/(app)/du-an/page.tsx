import { ProjectsClient } from "@/components/projects/ProjectsClient";
import { listProjects } from "@/lib/data/projects";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await listProjects();
  return <ProjectsClient projects={projects} />;
}
