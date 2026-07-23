import { TasksView } from "@/components/tasks/TasksView";
import { listAllTasks } from "@/lib/data/tasks";
import { listProfiles } from "@/lib/data/profiles";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const [tasks, profiles] = await Promise.all([
    listAllTasks(),
    listProfiles(),
  ]);

  const assignees = profiles.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email,
  }));

  return <TasksView tasks={tasks} assignees={assignees} />;
}
