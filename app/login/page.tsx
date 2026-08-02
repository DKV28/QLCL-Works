import { LoginForm } from "@/components/auth/LoginForm";
import { AuthShell } from "@/components/auth/AuthShell";
import Link from "next/link";

export default function LoginPage() {
  return (
    <AuthShell
      title="Không gian quản lý công việc của Phòng QLCL"
      description="Theo dõi công việc, dự án và tiến độ chung trong một hệ thống thống nhất."
    >
        <div className="mb-7 lg:hidden">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-lg font-bold text-white shadow-sm">
            Q
          </div>
          <h1 className="text-2xl font-bold tracking-tight">QLCL Works</h1>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            Không gian quản lý công việc của Phòng QLCL
          </p>
        </div>
        <div className="card p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-tight">Đăng nhập</h2>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              Sử dụng tài khoản nội bộ của bạn để tiếp tục.
            </p>
          </div>
          <LoginForm />
        </div>
        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Chưa có tài khoản?{" "}
          <Link href="/dang-ky" className="font-medium text-brand hover:underline">
            Đăng ký Thành viên
          </Link>
        </p>
    </AuthShell>
  );
}
