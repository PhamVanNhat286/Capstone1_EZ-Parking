import type { Metadata } from "next";
import SqlPortal from "@/components/partner/SqlPortal";

export const metadata: Metadata = { title: "Báo cáo doanh thu | EZ-Space Partner" };
export default function Page() { return <SqlPortal key="revenue" view="revenue" />; }
