import { redirect } from "next/navigation";

export default async function AdminUsersPage() {
  redirect("/cai-dat?tab=nguoi-dung");
}
