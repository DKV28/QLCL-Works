"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import {
  createTagAction,
  deleteTagAction,
  updateTagAction,
} from "@/lib/actions/tags";
import { TAG_COLORS, type Tag } from "@/lib/types";

function TagForm({
  tag,
  onSubmit,
  onDone,
}: {
  tag?: Tag;
  onSubmit: (name: string, color: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  onDone: () => void;
}) {
  const [name, setName] = useState(tag?.name ?? "");
  const [color, setColor] = useState(tag?.color ?? TAG_COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await onSubmit(name, color);
      if (res.ok) onDone();
      else setError(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Tên nhãn</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Màu</label>
        <div className="flex flex-wrap gap-2">
          {TAG_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-7 w-7 rounded-full ${
                color === c ? "ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-900" : ""
              }`}
              style={{ backgroundColor: c }}
              aria-label={c}
            />
          ))}
        </div>
      </div>
      <div>
        <span className="label">Xem trước</span>
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
          style={{ backgroundColor: color }}
        >
          {name || "Nhãn"}
        </span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button className="btn-secondary" onClick={onDone} disabled={pending}>
          Hủy
        </button>
        <button
          className="btn-primary"
          onClick={submit}
          disabled={pending || !name.trim()}
        >
          {pending ? "Đang lưu..." : "Lưu"}
        </button>
      </div>
    </div>
  );
}

export function TagsClient({ tags }: { tags: Tag[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Tag | null>(null);
  const [, startTransition] = useTransition();

  function refresh() {
    setCreating(false);
    setEditing(null);
    router.refresh();
  }

  function remove(t: Tag) {
    if (!confirm(`Xóa nhãn "${t.name}"? Nhãn sẽ bị gỡ khỏi mọi công việc.`))
      return;
    startTransition(async () => {
      await deleteTagAction(t.id);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Nhãn công việc</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Dùng nhãn để nhóm và tìm nhanh các công việc liên quan.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <span className="text-lg leading-none">+</span>
          Nhãn
        </button>
      </div>

      {tags.length === 0 ? (
        <div className="empty-state">
          Chưa có nhãn nào.
        </div>
      ) : (
        <div className="card divide-y divide-gray-100 dark:divide-gray-800">
          {tags.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-3">
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: t.color }}
              >
                {t.name}
              </span>
              <div className="flex gap-2">
                <button
                  className="btn-secondary text-xs"
                  onClick={() => setEditing(t)}
                >
                  Sửa
                </button>
                <button
                  className="btn-danger text-xs"
                  onClick={() => remove(t)}
                >
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Tạo nhãn">
        <TagForm
          onSubmit={(name, color) => createTagAction(name, color)}
          onDone={refresh}
        />
      </Modal>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Sửa nhãn">
        {editing && (
          <TagForm
            tag={editing}
            onSubmit={(name, color) => updateTagAction(editing.id, name, color)}
            onDone={refresh}
          />
        )}
      </Modal>
    </div>
  );
}
