import type { Metadata } from "next";
import SqlPortal from "@/components/partner/SqlPortal";

export const metadata: Metadata = { title: "Gate Kiosk | EZ-Space Partner" };
export default function Page() { return <SqlPortal key="kiosk" view="kiosk" />; }
