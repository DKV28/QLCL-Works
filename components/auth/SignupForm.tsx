"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { signUp } from "@/lib/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Đang đăng ký..." : "Đăng ký tài khoản"}
    </button>
  );
}

export function SignupForm() {
  const [state, formAction] = useFormState(signUp, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="full_name">Họ và tên</label>
        <input
          id="full_name"
          name="full_name"
          autoComplete="name"
          required
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="password">Mật khẩu</label>
        <input
          id="password"
          name="password"
          type="password"
          minLength={6}
          autoComplete="new-password"
          required
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="password_confirmation">
          Xác nhận mật khẩu
        </label>
        <input
          id="password_confirmation"
          name="password_confirmation"
          type="password"
          minLength={6}
          autoComplete="new-password"
          required
          className="input"
        />
      </div>

      <p className="rounded-md bg-blue-50 p-3 text-xs text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
        Tài khoản tự đăng ký luôn có quyền Thành viên. Quản trị viên có thể
        thay đổi quyền sau nếu cần.
      </p>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && (
        <p className="text-sm text-green-600">{state.success}</p>
      )}
      {!state?.success && <SubmitButton />}
      <Link href="/login" className="btn-secondary block w-full text-center">
        Quay lại đăng nhập
      </Link>
    </form>
  );
}
