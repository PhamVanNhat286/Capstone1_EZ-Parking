export function parseBookingTime(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatBookingTime(value?: string | null): string {
  const date = parseBookingTime(value);
  return date ? date.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) : "Chưa có";
}

export function bookingDuration(start?: string | null, end?: string | null) {
  const from = parseBookingTime(start);
  const to = parseBookingTime(end);
  if (!from || !to) return null;
  const minutes = Math.round((to.getTime() - from.getTime()) / 60000);
  if (minutes <= 0 || minutes > 24 * 60) return null;
  const hours = Math.ceil(minutes / 60);
  const whole = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const text = `${whole ? `${whole} giờ` : ""}${rest ? ` ${rest} phút` : ""}`.trim();
  return { minutes, hours, text, isNextDay: from.toDateString() !== to.toDateString() };
}
