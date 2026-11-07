import type { Metadata } from "next";
import SqlPortal from "@/components/partner/SqlPortal";

export const metadata: Metadata = { title: "Bãi đỗ xe | EZ-Space Partner" };
export default function Page() { return <SqlPortal key="lots" view="lots" />; }
