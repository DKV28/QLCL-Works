import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8 dark:bg-gray-950">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-brand">Đăng ký QLCL Works</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Tạo tài khoản Thành viên
          </p>
        </div>
        <div className="card p-6">
          <SignupForm />
        </div>
      </div>
    </main>
  );
}
