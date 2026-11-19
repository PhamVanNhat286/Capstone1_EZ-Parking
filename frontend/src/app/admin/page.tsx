"use client";

import { useEffect, useState } from "react";
import { confirmManualRefundApi, getPendingRefundsApi, type PendingRefund } from "@/lib/api";
import { useStore } from "@/store";

export default function AdminRefundsPage() {
  const user = useStore((s) => s.user);
  const [items, setItems] = useState<PendingRefund[]>([]);
  const [references, setReferences] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const reload = async () => {
    if (!user?.token || user.role !== "admin") return;
    try {
      const result = await getPendingRefundsApi(user.token);
      if (result.success) setItems(result.data || []);
      else setMessage(result.message || "Không tải được yêu cầu hoàn cọc");
    } catch { setMessage("Không kết nối được máy chủ"); }
  };

  useEffect(() => { void reload(); }, [user?.token, user?.role]);

  const confirm = async (item: PendingRefund) => {
    if (!user?.token || !checked[item.id] || !references[item.id]?.trim()) return;
    setWorkingId(item.id);
    setMessage("");
    try {
      const result = await confirmManualRefundApi(item.id, references[item.id].trim(), user.token);
      setMessage(result.message || (result.success ? "Đã xác nhận" : "Không xác nhận được"));
      if (result.success) await reload();
    } catch { setMessage("Không kết nối được máy chủ"); }
    finally { setWorkingId(null); }
  };

  if (user?.role !== "admin") return <p className="p-6 text-sm">Chỉ quản trị viên được xem yêu cầu hoàn cọc.</p>;
  return <div className="min-h-full bg-slate-50 p-4 space-y-4">
    <header className="rounded-2xl bg-blue-700 p-5 text-white">
      <h1 className="text-xl font-extrabold">Đối soát hoàn cọc</h1>
      <p className="mt-1 text-xs text-blue-100">Chỉ xác nhận sau khi tiền đã được hoàn thực tế qua ngân hàng hoặc cổng thanh toán.</p>
    </header>
    <button type="button" onClick={() => void reload()} className="rounded-xl bg-white border px-3 py-2 text-sm font-bold">Làm mới danh sách</button>
    {message && <p role="status" className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm">{message}</p>}
    {items.length === 0 && <p className="rounded-xl bg-white border p-4 text-sm">Không có yêu cầu hoàn cọc đang chờ.</p>}
    {items.map((item) => <article key={item.id} className="rounded-2xl bg-white border p-4 space-y-3 text-sm">
      <div className="flex justify-between font-bold"><span>Đơn EZ-{item.reservation_id}</span><span>{Number(item.amount).toLocaleString("vi-VN")}đ</span></div>
      <p className="text-xs text-slate-600">{item.customer_name} · {item.customer_email}<br />{item.lot_name} · ô {item.slot_code} · cọc {item.provider}</p>
      <input aria-label={`Mã giao dịch hoàn tiền đơn EZ-${item.reservation_id}`} value={references[item.id] || ""} onChange={(e) => setReferences(v => ({ ...v, [item.id]: e.target.value }))} placeholder="Mã giao dịch hoàn tiền thực tế" className="w-full rounded-xl border p-2.5" />
      <label className="flex gap-2 items-start text-xs"><input type="checkbox" checked={!!checked[item.id]} onChange={(e) => setChecked(v => ({ ...v, [item.id]: e.target.checked }))} /><span>Tôi đã chuyển đủ tiền cho khách và có mã giao dịch để đối soát.</span></label>
      <button type="button" disabled={!checked[item.id] || !references[item.id]?.trim() || workingId !== null} onClick={() => void confirm(item)} className="w-full rounded-xl bg-blue-600 p-3 font-bold text-white disabled:bg-slate-300">{workingId === item.id ? "Đang ghi nhận..." : "Xác nhận đã hoàn tiền"}</button>
    </article>)}
  </div>;
}
