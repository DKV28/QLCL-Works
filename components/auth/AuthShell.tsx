import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-shell">
      <div className="absolute right-5 top-5 z-10">
        <ThemeToggle />
      </div>
      <section className="auth-brand-panel" aria-label="QLCL Works">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-base font-bold text-white shadow-sm">
            Q
          </span>
          <span className="text-lg font-bold tracking-tight">QLCL Works</span>
        </div>

        <div className="max-w-md pb-8">
          <p className="mb-4 text-sm font-semibold text-brand-light">
            Phòng Quản lý Chất lượng
          </p>
          <h1 className="max-w-[12ch] text-4xl font-bold leading-[1.06] tracking-[-0.045em] xl:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-[44ch] text-base leading-7 text-slate-300">
            {description}
          </p>
        </div>

        <p className="text-xs text-slate-500">Hệ thống quản lý công việc nội bộ</p>
      </section>

      <section className="auth-form-panel">
        <div className="auth-enter w-full max-w-md">{children}</div>
      </section>
    </main>
  );
}
