import type { Metadata } from "next";
import PartnerAudit from "@/components/partner/PartnerAudit";

export const metadata: Metadata = {title:"Lịch sử thao tác & Đối soát | EZ-Space Partner"};

export default function Page() {
  return <PartnerAudit/>;
}
