"use client";

import { useState } from "react";
import Link from "next/link";
import { kioskScanInApi, kioskScanOutApi } from "@/lib/api";
import { useStore } from "@/store";

type ScanResult = { success: boolean; message?: string; data?: { slot_code?: string; vehicle_plate?: string; total_amount?: number; overdue_fee?: number } };

export default function ParkingGatePage() {
  const user = useStore((state) => state.user);
  const [ticket, setTicket] = useState("");
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  if (user?.role !== "admin" && user?.role !== "manager") {
    return <p className="p-6 text-sm">Chỉ nhân viên bãi và quản trị viên được quét vé.</p>;
  }

  const scan = async (direction: "in" | "out") => {
    const code = ticket.trim().replace(/^EZ-([1-9]\d*)$/i, "$1");
    if (!code || working) return;
    setWorking(true);
    setResult(null);
    try {
      const response = direction === "in"
        ? await kioskScanInApi({ ticket_code: code }, user.token)
        : await kioskScanOutApi({ ticket_code: code }, user.token);
      setResult(response);
    } catch {
      setResult({ success: false, message: "Không kết nối được backend. Hãy kiểm tra máy chủ." });
    } finally {
      setWorking(false);
    }
  };

  return <div className="min-h-full bg-slate-50 p-4 space-y-4">
    <header className="rounded-2xl bg-blue-700 p-5 text-white">
      <h1 className="text-xl font-extrabold">Cổng bãi xe</h1>
      <p className="mt-1 text-xs text-blue-100">Nhập mã EZ-123 hoặc nội dung QR trên vé để xác nhận xe vào và ra.</p>
    </header>
    <Link href="/admin" className="text-sm font-bold text-blue-700">Đối soát hoàn cọc →</Link>
    <section className="rounded-2xl border bg-white p-4 space-y-3">
      <label htmlFor="ticket-code" className="block text-sm font-bold">Mã vé hoặc nội dung QR</label>
      <input id="ticket-code" value={ticket} onChange={(event) => setTicket(event.target.value)} placeholder="EZ-123" className="w-full rounded-xl border px-3 py-3 text-sm" />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={!ticket.trim() || working} onClick={() => void scan("in")} className="rounded-xl bg-blue-600 p-3 text-sm font-bold text-white disabled:opacity-50">Xác nhận vào</button>
        <button type="button" disabled={!ticket.trim() || working} onClick={() => void scan("out")} className="rounded-xl bg-slate-800 p-3 text-sm font-bold text-white disabled:opacity-50">Xác nhận ra</button>
      </div>
    </section>
    {result && <section role="status" className={`rounded-2xl border p-4 text-sm ${result.success ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-rose-300 bg-rose-50 text-rose-800"}`}>
      <p className="font-bold">{result.message || (result.success ? "Đã xác nhận" : "Không thể xác nhận vé")}</p>
      {result.data?.slot_code && <p className="mt-1">Ô đỗ: {result.data.slot_code}</p>}
      {result.data?.vehicle_plate && <p>Biển số: {result.data.vehicle_plate}</p>}
      {result.data?.total_amount !== undefined && <p>Tổng phí: {Number(result.data.total_amount).toLocaleString("vi-VN")}đ</p>}
      {Number(result.data?.overdue_fee) > 0 && <p>Phí quá giờ: {Number(result.data?.overdue_fee).toLocaleString("vi-VN")}đ</p>}
    </section>}
  </div>;
}
