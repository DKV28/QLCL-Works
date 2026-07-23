"use client";

import { useEffect, useState, useTransition } from "react";
import {
  addCommentAction,
  deleteCommentAction,
  getTaskThreadAction,
} from "@/lib/actions/comments";
import type { ActivityEntry, Comment } from "@/lib/types";

const ACTION_LABEL: Record<string, string> = {
  tao_cong_viec: "Tạo công việc",
  cap_nhat_cong_viec: "Cập nhật công việc",
  doi_trang_thai: "Đổi trạng thái",
  danh_dau_hoan_thanh: "Đánh dấu hoàn thành",
  mo_lai: "Mở lại",
  binh_luan: "Bình luận",
  nhan_ban_cong_viec: "Nhân bản công việc",
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(
    d.getMinutes(),
  )}`;
}

export function TaskThread({ taskId }: { taskId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  async function load() {
    const res = await getTaskThreadAction(taskId);
    setComments(res.comments);
    setActivity(res.activity);
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  function add() {
    const clean = body.trim();
    if (!clean) return;
    startTransition(async () => {
      await addCommentAction(taskId, clean);
      setBody("");
      await load();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteCommentAction(id);
      await load();
    });
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {/* Bình luận */}
      <div>
        <span className="label">Bình luận</span>
        <div className="mb-2 max-h-48 space-y-2 overflow-y-auto">
          {loading ? (
            <p className="text-xs text-gray-400">Đang tải...</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-gray-400">Chưa có bình luận.</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="rounded-md bg-gray-50 p-2 text-sm dark:bg-gray-800/50">
                <div className="mb-0.5 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    {c.author_name ?? "Ẩn danh"}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400">
                      {formatDateTime(c.created_at)}
                    </span>
                    <button
                      onClick={() => remove(c.id)}
                      disabled={pending}
                      className="text-[11px] text-gray-400 hover:text-red-600"
                    >
                      Xóa
                    </button>
                  </span>
                </div>
                <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                  {c.body}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Viết bình luận..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            disabled={pending}
          />
          <button
            className="btn-secondary shrink-0"
            onClick={add}
            disabled={pending || !body.trim()}
          >
            Gửi
          </button>
        </div>
      </div>

      {/* Lịch sử hoạt động */}
      <div>
        <span className="label">Lịch sử hoạt động</span>
        <div className="max-h-56 space-y-1.5 overflow-y-auto">
          {loading ? (
            <p className="text-xs text-gray-400">Đang tải...</p>
          ) : activity.length === 0 ? (
            <p className="text-xs text-gray-400">Chưa có hoạt động.</p>
          ) : (
            activity.map((a) => (
              <div key={a.id} className="text-xs text-gray-600 dark:text-gray-400">
                <span className="text-gray-400">{formatDateTime(a.created_at)}</span>
                {" · "}
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {a.actor_name ?? "Hệ thống"}
                </span>{" "}
                {ACTION_LABEL[a.action] ?? a.action}
                {a.detail ? `: ${a.detail}` : ""}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
