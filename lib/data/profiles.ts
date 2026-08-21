// Data access: profiles. Chỉ chứa query Supabase, không JSX.
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/**
 * ID người dùng đang đăng nhập, đọc CỤC BỘ từ session (không gọi mạng tới
 * Supabase Auth). An toàn vì middleware đã xác thực bằng getUser() trên mỗi
 * request, và RLS/PostgREST kiểm chữ ký JWT ở mọi query. Bọc cache() để mọi lần
 * gọi trong cùng một request chỉ đọc một lần.
 */
export const getSessionUserId = cache(async (): Promise<string | null> => {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user.id ?? null;
});

/** Hồ sơ người dùng đang đăng nhập (null nếu chưa đăng nhập). */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  return (data as Profile) ?? null;
});

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
