import type { Metadata } from "next";
import PartnerKiosk from "@/components/partner/PartnerKiosk";

export const metadata: Metadata = { title: "Gate Kiosk | EZ-Space Partner" };
export default function Page() { return <PartnerKiosk />; }
