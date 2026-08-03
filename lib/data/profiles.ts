// Data access: profiles. Chỉ chứa query Supabase, không JSX.
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** Hồ sơ người dùng đang đăng nhập (null nếu chưa đăng nhập). */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (data as Profile) ?? null;
}

/** Toàn bộ danh bạ người dùng (để chọn người phụ trách, lọc...). */
export async function listProfiles(): Promise<Profile[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) throw error;
  return (data as Profile[]) ?? [];
}
