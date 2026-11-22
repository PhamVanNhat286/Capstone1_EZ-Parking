export function parseBookingTime(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatBookingTime(value?: string | null): string {
  const date = parseBookingTime(value);
  if (!date) return "Chưa có";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function bookingDuration(start?: string | null, end?: string | null) {
  const from = parseBookingTime(start);
  const to = parseBookingTime(end);
  if (!from || !to) return null;
  const minutes = Math.round((to.getTime() - from.getTime()) / 60000);
  if (minutes < 60) return null;
  const hours = Math.ceil(minutes / 60);
  const whole = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const text = `${whole ? `${whole} giờ` : ""}${rest ? ` ${rest} phút` : ""}`.trim();
  return { minutes, hours, text, isNextDay: from.toDateString() !== to.toDateString() };
}
