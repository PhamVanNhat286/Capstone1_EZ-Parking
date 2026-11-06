import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import PartnerWorkspace from "@/components/partner/PartnerWorkspace";

export const metadata: Metadata = {
  title: "EZ-Space Partner | Bộ quy chuẩn giao diện",
  description: "Ứng dụng riêng dành cho đối tác EZ-Space.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="vi"><body><PartnerWorkspace><main>{children}</main></PartnerWorkspace></body></html>;
}
