"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface ActionItem {
  label: string;
  onClick: () => void;
  danger?: boolean; // hiển thị màu đỏ (vd: Xóa)
  emphasize?: boolean; // hiển thị nổi bật (vd: Bước tiếp theo)
}

/**
 * Nút "⋯" gọn gàng, mở menu các thao tác. Menu render qua portal + fixed
 * position để không bị cắt bởi vùng cuộn ngang của bảng.
 */
export function ActionsMenu({
  items,
  label = "Thao tác",
}: {
  items: ActionItem[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || btnRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function close() {
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    // Cuộn/đổi kích thước → đóng để tránh menu lệch vị trí.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  function toggle() {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      setCoords({
        top: rect.bottom + 4,
        right: Math.max(8, window.innerWidth - rect.right),
      });
    }
    setOpen((o) => !o);
  }

  if (items.length === 0) return null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className="btn-secondary px-2 text-base leading-none"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        ⋯
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: "fixed", top: coords.top, right: coords.right }}
            className="z-50 min-w-[168px] overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
          >
            {items.map((item, i) => (
              <button
                key={i}
                role="menuitem"
                type="button"
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  item.danger
                    ? "text-red-600 dark:text-red-400"
                    : item.emphasize
                      ? "font-medium text-brand"
                      : "text-gray-700 dark:text-gray-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
