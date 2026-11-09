import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PartnerDesignSystem from "@/components/partner/PartnerDesignSystem";

export const metadata: Metadata = { title: "Bộ quy chuẩn giao diện | EZ-Space Partner" };

export default function Page() {
  return <><nav aria-label="Điều hướng Partner" style={{ maxWidth: 1280, margin: "16px auto 0", padding: "0 32px" }}><Link href="/" style={{ display: "inline-flex", gap: 8, alignItems: "center", color: "#1d4ed8", fontSize: 13 }}><ArrowLeft size={16} /> Tổng quan Partner</Link></nav><PartnerDesignSystem /></>;
}
