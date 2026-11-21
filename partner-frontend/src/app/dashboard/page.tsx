import type { Metadata } from "next";
import SqlPortal from "@/components/partner/SqlPortal";

export const metadata: Metadata = { title: "Tổng quan | EZ-Space Partner" };
export default function Page() { return <SqlPortal key="dashboard" view="dashboard" />; }
