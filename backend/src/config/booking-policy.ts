export const ARRIVAL_REMINDER_MINUTES = 20;
export const LATE_ARRIVAL_MINUTES = 20;
export const DEPARTURE_REMINDER_MINUTES = 10;

export function arrivalDeadline(startTime: Date): Date {
  return new Date(startTime.getTime() + LATE_ARRIVAL_MINUTES * 60_000);
}
