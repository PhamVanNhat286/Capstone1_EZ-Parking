// Cùng khung giá với frontend/src/lib/pricing.ts; cần cập nhật cả hai khi đổi bảng giá.
export function parkingHourlyRate(lotId: number, at: Date, fallbackRate: number): number {
  const hour = at.getHours();
  const weekend = at.getDay() === 0 || at.getDay() === 6;
  if (lotId === 2 && weekend && hour >= 19 && hour < 22) return 25000;

  if (hour >= 22 || hour < 6) {
    if (lotId === 1) return 10000;
    if (lotId === 2 || lotId === 3) return 8000;
    return Math.round(fallbackRate * 0.5);
  }

  const peak = lotId === 3
    ? (hour >= 6 && hour < 9) || (hour >= 15 && hour < 19)
    : (hour >= 7 && hour < 9) || (hour >= 17 && hour < 21);
  if (peak) {
    if (lotId === 1) return 25000;
    if (lotId === 2 || lotId === 3) return 20000;
    return Math.round(fallbackRate * 1.3);
  }

  if (lotId === 1) return 20000;
  if (lotId === 2 || lotId === 3) return 15000;
  return fallbackRate;
}

export function parkingFeeForHours(lotId: number, start: Date, hours: number, fallbackRate: number): number {
  let total = 0;
  for (let hour = 0; hour < hours; hour++) {
    const at = new Date(start);
    at.setHours(at.getHours() + hour);
    total += parkingHourlyRate(lotId, at, fallbackRate);
  }
  return total;
}
