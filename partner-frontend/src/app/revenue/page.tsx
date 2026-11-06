import type { Metadata } from "next";
import PartnerRevenue from "@/components/partner/PartnerRevenue";

export const metadata: Metadata = { title: "Báo cáo doanh thu | EZ-Space Partner" };
export default function Page(){ return <PartnerRevenue/>; }
