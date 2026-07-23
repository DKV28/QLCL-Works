import { LoginForm } from "@/components/auth/LoginForm";

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
        <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
          Chưa có tài khoản? Liên hệ quản trị viên để được cấp.
        </p>
      </div>
    </main>
  );
}
