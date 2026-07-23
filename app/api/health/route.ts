// Endpoint kiểm tra sức khỏe cho uptime monitor (UptimeRobot/cron-job.org).
// Ping mỗi 5 phút để chống Supabase Free tự pause sau 7 ngày không request.
// Thực hiện 1 truy vấn nhẹ để "chạm" vào database.
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );

    // Truy vấn cực nhẹ: đếm 1 dòng có head:true (không kéo dữ liệu).
    const { error } = await supabase
      .from("projects")
      .select("id", { count: "exact", head: true });

    if (error) {
      return NextResponse.json(
        { status: "error", db: "unreachable" },
        { status: 503 },
      );
    }

    return NextResponse.json({ status: "ok", ts: new Date().toISOString() });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
