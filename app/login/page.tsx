import { LoginForm } from "@/components/auth/LoginForm";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-brand">QLCL Works</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Quản lý Dự án &amp; Công việc — Phòng QLCL
          </p>
        </div>
        <div className="card p-6">
          <LoginForm />
        </div>
        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Chưa có tài khoản?{" "}
          <Link href="/dang-ky" className="font-medium text-brand hover:underline">
            Đăng ký Thành viên
          </Link>
        </p>
      </div>
    </main>
  );
}
