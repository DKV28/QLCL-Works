import { TasksView } from "@/components/tasks/TasksView";
import { listAllTasks } from "@/lib/data/tasks";
import { listProfiles } from "@/lib/data/profiles";
import { listProjects } from "@/lib/data/projects";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const [tasks, profiles, projects] = await Promise.all([
    listAllTasks(),
    listProfiles(),
    listProjects(),
  ]);

  const assignees = profiles.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email,
  }));

  const projectOptions = projects.map((p) => ({ id: p.id, name: p.name }));

  return (
    <TasksView
      tasks={tasks}
      assignees={assignees}
      projects={projectOptions}
    />
  );
}
