import type { Metadata } from "next";
import SqlPortal from "@/components/partner/SqlPortal";

export const metadata: Metadata = { title: "Cài đặt tài khoản | EZ-Space Partner" };
export default function Page() { return <SqlPortal key="settings" view="settings" />; }
