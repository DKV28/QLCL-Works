import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QLCL Works — Quản lý Dự án & Công việc",
  description: "App quản lý dự án và công việc — Phòng Quản lý Chất lượng",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
