import type { Metadata } from "next";
import SqlPortal from "@/components/partner/SqlPortal";

export const metadata: Metadata = { title: "Bảng giá | EZ-Space Partner" };
export default function Page() { return <SqlPortal key="pricing" view="pricing" />; }
