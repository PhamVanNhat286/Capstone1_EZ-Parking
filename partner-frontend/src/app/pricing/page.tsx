import type { Metadata } from "next";
import PartnerPricing from "@/components/partner/PartnerPricing";

export const metadata: Metadata = { title: "Bảng giá | EZ-Space Partner" };
export default function Page() { return <PartnerPricing />; }
