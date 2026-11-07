import type { Metadata } from "next";
import SqlPortal from "@/components/partner/SqlPortal";

export const metadata: Metadata = { title: "Lịch sử thao tác | EZ-Space Partner" };
export default function Page() { return <SqlPortal key="audit" view="audit" />; }
