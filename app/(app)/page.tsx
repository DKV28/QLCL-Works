import { redirect } from "next/navigation";

// Trang chủ khu vực app -> mở thẳng danh sách công việc.
export default function HomePage() {
  redirect("/cong-viec");
}
