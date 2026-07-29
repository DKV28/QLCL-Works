"use client";

import { useState } from "react";
import { Modal } from "./Modal";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export function useConfirmDialog() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  function confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      setPending({ ...options, resolve });
    });
  }

  function close(result: boolean) {
    pending?.resolve(result);
    setPending(null);
  }

  const confirmDialog = (
    <Modal
      open={pending !== null}
      onClose={() => close(false)}
      title={pending?.title ?? "Xác nhận"}
    >
      <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
        {pending?.message}
      </p>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={() => close(false)}>
          Hủy
        </button>
        <button
          type="button"
          className={pending?.danger ? "btn-danger" : "btn-primary"}
          onClick={() => close(true)}
        >
          {pending?.confirmLabel ?? "Xác nhận"}
        </button>
      </div>
    </Modal>
  );

  return { confirm, confirmDialog };
}
