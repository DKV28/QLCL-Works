import { LoginForm } from "@/components/auth/LoginForm";
import { LogoMark } from "@/components/Logo";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-10 dark:bg-gray-950">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <LogoMark className="mx-auto mb-3 h-12 w-auto" />
          <h1 className="text-2xl font-bold tracking-tight">QLCL Works</h1>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            Không gian quản lý công việc của Phòng QLCL
          </p>
        </div>
        <div className="card p-6 sm:p-8">
          <h2 className="mb-5 text-lg font-semibold">Đăng nhập</h2>
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
