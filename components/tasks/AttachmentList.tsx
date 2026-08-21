"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  createAttachmentAction,
  deleteAttachmentAction,
  getAttachmentsAction,
} from "@/lib/actions/attachments";
import { ATTACHMENTS_BUCKET, type Attachment } from "@/lib/types";

const MAX_SIZE = 15 * 1024 * 1024; // 15 MB

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function AttachmentList({ taskId }: { taskId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function load() {
    const data = await getAttachmentsAction(taskId);
    setAttachments(data);
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (file.size > MAX_SIZE) {
      setError("Tệp quá lớn (tối đa 15 MB).");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const path = `${taskId}/${crypto.randomUUID()}-${sanitize(file.name)}`;

    const { error: upErr } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .upload(path, file, { contentType: file.type || undefined });

    if (upErr) {
      setUploading(false);
      setError("Tải tệp lên thất bại. Vui lòng thử lại.");
      return;
    }

    const res = await createAttachmentAction({
      task_id: taskId,
      file_name: file.name,
      storage_path: path,
      mime_type: file.type || null,
      size_bytes: file.size,
    });

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (!res.ok) {
      setError(res.error);
      return;
    }
    await load();
    router.refresh(); // cập nhật badge đếm ở danh sách
  }

  async function view(att: Attachment) {
    const supabase = createClient();
    const { data } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .createSignedUrl(att.storage_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  function remove(att: Attachment) {
    setConfirmingDeleteId(null);
    startTransition(async () => {
      const result = await deleteAttachmentAction(att.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await load();
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="label mb-0">Tệp đính kèm</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {attachments.length > 0 ? `${attachments.length} tệp` : ""}
        </span>
      </div>

      <div className="space-y-1">
        {attachments.map((att) => (
          <div
            key={att.id}
            className="flex items-center gap-2 rounded px-1 py-1 text-sm"
          >
            <button
              type="button"
              onClick={() => view(att)}
              className="flex-1 truncate text-left text-brand hover:underline"
              title={att.file_name}
            >
              {att.file_name}
            </button>
            <span className="shrink-0 text-xs text-gray-400">
              {formatSize(att.size_bytes)}
            </span>
            {confirmingDeleteId === att.id ? (
              <span className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingDeleteId(null)}
                  className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => remove(att)}
                  className="text-xs font-medium text-red-600 hover:text-red-700"
                >
                  Xác nhận
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDeleteId(att.id)}
                className="shrink-0 text-xs text-gray-400 hover:text-red-600"
              >
                Xóa
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-2">
        <input
          ref={inputRef}
          type="file"
          onChange={handleFile}
          disabled={uploading}
          className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-brand-dark dark:text-gray-300"
        />
        {uploading && (
          <p className="mt-1 text-xs text-gray-500">Đang tải lên...</p>
        )}
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
