import { SignupForm } from "@/components/auth/SignupForm";
import { LogoMark } from "@/components/Logo";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-10 dark:bg-gray-950">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <LogoMark className="mx-auto mb-3 h-12 w-auto" />
          <h1 className="text-2xl font-bold tracking-tight">Tạo tài khoản</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Tạo tài khoản Thành viên không cần email
          </p>
        </div>
        <div className="card p-6 sm:p-8">
          <SignupForm />
        </div>
      </div>
    </main>
  );
}
