export const ARRIVAL_REMINDER_MINUTES = 20;
export const EARLY_ARRIVAL_MINUTES = 20;
export const LATE_ARRIVAL_MINUTES = 20;
export const DEPARTURE_REMINDER_MINUTES = 10;

export function entryOpensAt(startTime: Date): Date {
  return new Date(startTime.getTime() - EARLY_ARRIVAL_MINUTES * 60_000);
}

export function arrivalDeadline(startTime: Date): Date {
  return new Date(startTime.getTime() + LATE_ARRIVAL_MINUTES * 60_000);
}

export function parkingCharge(startTime: Date, endTime: Date, checkOutTime: Date, hourlyRate: number) {
  if (![startTime.getTime(), endTime.getTime(), checkOutTime.getTime(), hourlyRate].every(Number.isFinite) ||
      endTime <= startTime || hourlyRate < 0) {
    throw new Error("Ngày giờ hoặc đơn giá đỗ xe không hợp lệ");
  }
  const bookedHours = Math.max(1, Math.ceil((endTime.getTime() - startTime.getTime()) / 3600_000));
  const overdueHours = Math.ceil(Math.max(0, checkOutTime.getTime() - endTime.getTime()) / 3600_000);
  return {
    bookedHours,
    overdueHours,
    billableHours: bookedHours + overdueHours,
    overdueFee: overdueHours * hourlyRate,
    totalFee: (bookedHours + overdueHours) * hourlyRate,
  };
}
