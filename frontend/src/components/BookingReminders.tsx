"use client";

import { useEffect } from "react";
import { useStore } from "@/store";

// Nhắc trong ứng dụng khi trang đang mở; không yêu cầu quyền thông báo của trình duyệt.
export default function BookingReminders() {
  const booking = useStore((state) => state.activeBooking);
  const addToast = useStore((state) => state.addToast);

  useEffect(() => {
    if (!booking) return;

    const check = () => {
      const now = Date.now();
      const start = booking.startTime ? new Date(booking.startTime).getTime() : NaN;
      const end = booking.endTime ? new Date(booking.endTime).getTime() : NaN;
      let reminder: "arrival" | "departure" | null = null;
      let message = "";

      if (booking.status === "paid" && now >= start - 20 * 60_000 && now < start) {
        reminder = "arrival";
        message = `Còn khoảng 20 phút đến giờ vào ô ${booking.spotId}. Vé đã có thể quét nếu ô đỗ đang trống.`;
      } else if (booking.status === "entered" && now >= end - 10 * 60_000 && now < end) {
        reminder = "departure";
        message = `Sắp đến giờ ra khỏi ô ${booking.spotId}. Vui lòng chuẩn bị lấy xe.`;
      }

      if (!reminder) return;
      const key = `ez-parking-reminder:${booking.id}:${reminder}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "shown");
      addToast(message, "info");
    };

    check();
    const timer = window.setInterval(check, 30_000);
    return () => window.clearInterval(timer);
  }, [booking, addToast]);

  return null;
}
