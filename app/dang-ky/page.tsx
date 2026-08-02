import { SignupForm } from "@/components/auth/SignupForm";
import { AuthShell } from "@/components/auth/AuthShell";

export default function SignupPage() {
  return (
    <AuthShell
      title="Tạo tài khoản Thành viên không cần email"
      description="Bắt đầu với quyền Thành viên. Quản trị viên có thể điều chỉnh quyền sau khi đăng ký."
    >
        <div className="mb-7 lg:hidden">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-lg font-bold text-white shadow-sm">
            Q
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Tạo tài khoản</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Tạo tài khoản Thành viên không cần email
          </p>
        </div>
        <div className="card p-6 sm:p-8">
          <h2 className="mb-6 text-xl font-bold tracking-tight">Thông tin tài khoản</h2>
          <SignupForm />
        </div>
    </AuthShell>
  );
}
