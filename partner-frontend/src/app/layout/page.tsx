import type { Metadata } from "next";
import PartnerLayoutEditor from "@/components/partner/PartnerLayoutEditor";

export const metadata: Metadata = { title: "Sơ đồ ô đỗ & Bản đồ trực quan | EZ-Space Partner" };
export default function Page() { return <PartnerLayoutEditor />; }
