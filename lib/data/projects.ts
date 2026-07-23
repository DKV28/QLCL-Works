// Data access: projects. Chỉ chứa query Supabase, không JSX.
import { createClient } from "@/lib/supabase/server";
import { duplicateTask } from "./tasks";
import type { Project, ProjectStatus } from "@/lib/types";

export async function listProjects(): Promise<Project[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as Project[]) ?? [];
}

export async function getProject(id: string): Promise<Project | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  return (data as Project) ?? null;
}

export interface ProjectInput {
  name: string;
  description?: string | null;
  status?: ProjectStatus;
  owner_id?: string | null;
}

export async function createProject(input: ProjectInput): Promise<Project> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return data as Project;
}

export async function updateProject(
  id: string,
  input: Partial<ProjectInput>,
): Promise<Project> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Project;
}

/** Nhân bản dự án + toàn bộ công việc bên trong (không copy tệp đính kèm). */
export async function duplicateProject(id: string): Promise<Project> {
  const supabase = createClient();

  const { data: src, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  const source = src as Project;

  const { data: created, error: e2 } = await supabase
    .from("projects")
    .insert({
      name: `${source.name} (bản sao)`,
      description: source.description,
      owner_id: source.owner_id,
      status: source.status,
    })
    .select("*")
    .single();
  if (e2) throw e2;
  const newProject = created as Project;

  const { data: taskRows } = await supabase
    .from("tasks")
    .select("id")
    .eq("project_id", id)
    .is("deleted_at", null);

  for (const row of (taskRows as { id: string }[]) ?? []) {
    await duplicateTask(row.id, newProject.id);
  }

  return newProject;
}

/** Soft delete: đặt deleted_at thay vì xóa cứng. */
export async function softDeleteProject(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("projects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}
