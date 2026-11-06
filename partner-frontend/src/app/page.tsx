import type { Metadata } from "next";
import PartnerOverview from "@/components/partner/PartnerOverview";

export const metadata: Metadata = { title: "Tổng quan bãi đỗ xe | EZ-Space Partner" };

export default function Page() {
  return <PartnerOverview />;
}
