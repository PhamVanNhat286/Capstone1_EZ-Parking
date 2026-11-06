import type { OverviewLot, ParkingSession } from "./overview-model";

export type RevenueRange = "today" | "yesterday" | "all";
export function dashboardRevenue(lot: OverviewLot, range: RevenueRange) {
  const sessions = lot.sessions.filter(s => range === "all" || (range === "yesterday" ? s.time.startsWith("Hôm qua") : !s.time.startsWith("Hôm qua")));
  const completed = sessions.filter(s => s.status === "completed");
  const hourly = Array.from({ length: 12 }, (_, i) => ({ label: `${String(i * 2).padStart(2, "0")}:00`, value: 0 }));
  for (const session of completed) {
    const hour = Number(session.time.match(/(?:^|\D)(\d{1,2}):\d{2}/)?.[1]);
    // A newly completed demo session has a relative label, not a timestamp.
    // Keep it in an explicit unassigned bucket instead of inventing a time.
    if (Number.isFinite(hour) && hour >= 0 && hour < 24) hourly[Math.floor(hour / 2)].value += session.amount;
  }
  const total = completed.reduce((sum, s) => sum + s.amount, 0);
  return { sessions, completed, total, deposits: sessions.filter(s => ["holding", "confirmed", "parked"].includes(s.status)).reduce((sum, s) => sum + s.deposit, 0), hourly, unassigned: total - hourly.reduce((sum, h) => sum + h.value, 0) };
}

export function dashboardVehicleCounts(lot: OverviewLot) {
  const active = lot.sessions.filter(s => ["holding", "confirmed", "parked"].includes(s.status));
  return { small: active.filter(s => s.vehicle !== "suv").length, large: active.filter(s => s.vehicle === "suv").length };
}

export function dashboardActivities(sessions: ParkingSession[]) {
  return sessions.filter(s => !s.time.startsWith("Hôm qua") && ["parked", "completed", "cancelled"].includes(s.status)).slice(0, 4);
}
