import type { Metadata } from "next";
import SqlPortal from "@/components/partner/SqlPortal";

export const metadata: Metadata = { title: "Sơ đồ ô đỗ | EZ-Space Partner" };
export default function Page() { return <SqlPortal key="layout" view="layout" />; }
