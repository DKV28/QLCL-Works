import { TasksView } from "@/components/tasks/TasksView";
import { listAllTasks } from "@/lib/data/tasks";
import { listActiveMemberLites } from "@/lib/data/members";
import { listProjects } from "@/lib/data/projects";
import { listTags } from "@/lib/data/tags";
import {
  listTaskPrioritySettings,
  listTaskStatusSettings,
} from "@/lib/data/settings";

export const dynamic = "force-dynamic";

export default async function TasksPage({
  searchParams,
}: {
  searchParams?: { task?: string };
}) {
  const [tasks, members, projects, tags, prioritySettings, statusSettings] =
    await Promise.all([
    listAllTasks(),
    listActiveMemberLites(),
    listProjects(),
    listTags(),
    listTaskPrioritySettings(),
    listTaskStatusSettings(),
  ]);

  const projectOptions = projects.map((p) => ({ id: p.id, name: p.name }));

  return (
    <TasksView
      tasks={tasks}
      members={members}
      projects={projectOptions}
      tags={tags}
      prioritySettings={prioritySettings}
      statusSettings={statusSettings}
      initialTaskId={searchParams?.task}
    />
  );
}
