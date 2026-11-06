import type { Metadata } from "next";
import PartnerDashboard from "@/components/partner/PartnerDashboard";

export const metadata: Metadata = { title: "Dashboard Overview | EZ-Space Partner" };
export default function Page() { return <PartnerDashboard />; }
