import type { VehicleKind } from "./overview-model";

export type PeakRule = { id: string; name: string; start: string; end: string; kinds: VehicleKind[] | "all"; surcharge: number; until: string; enabled: boolean };
export type PricingProfile = { hourly: Record<"sedan" | "suv", number>; enabled: Record<"sedan" | "suv", boolean>; blockMinutes: number; freeGrace: number; overtimeHourly: number; separateVehicleLateFee: boolean; overtimeByVehicle: Record<"sedan" | "suv", number>; lateFeeEnabled: boolean; peakRules: PeakRule[] };
export const initialPricingProfile = (): PricingProfile => ({
  hourly: { sedan: 20000, suv: 25000 }, enabled: { sedan: true, suv: true }, blockMinutes: 60, freeGrace: 15, overtimeHourly: 25000, separateVehicleLateFee: false, overtimeByVehicle: { sedan: 20000, suv: 25000 }, lateFeeEnabled: true,
  peakRules: [
    { id: "morning", name: "Cao điểm sáng", start: "07:00", end: "09:00", kinds: "all", surcharge: 5000, until: "Không giới hạn", enabled: true },
    { id: "evening", name: "Cao điểm chiều & tối", start: "17:00", end: "19:30", kinds: ["sedan", "suv"], surcharge: 10000, until: "31/12/2026", enabled: true },
  ],
});

export function estimateCharge(profile: PricingProfile, kind: "sedan" | "suv", start: string, durationMinutes: number, lateEnabled: boolean, overtimeMinutes = 0) {
  const block = profile.blockMinutes;
  const blocks = Math.max(1, Math.ceil(durationMinutes / block));
  const base = blocks * profile.hourly[kind];
  const startAt = Number(start.slice(0, 2)) * 60 + Number(start.slice(3, 5));
  const endAt = startAt + durationMinutes;
  const peak = profile.peakRules.filter(rule => rule.enabled && (rule.kinds === "all" || rule.kinds.includes(kind))).reduce((total, rule) => {
    const low = Number(rule.start.slice(0, 2)) * 60 + Number(rule.start.slice(3, 5));
    const high = Number(rule.end.slice(0, 2)) * 60 + Number(rule.end.slice(3, 5));
    return total + (startAt < high && endAt > low ? rule.surcharge * 2 : 0);
  }, 0);
  const isLate = lateEnabled && overtimeMinutes > profile.freeGrace;
  const late = isLate && profile.lateFeeEnabled ? profile.separateVehicleLateFee ? profile.overtimeByVehicle[kind] : profile.overtimeHourly : 0;
  return { blocks, base, peak, late, gross: base + peak + late, appCredit: 50000, kioskDue: Math.max(0, base + peak + late - 50000), isLate };
}

export function formatDong(value: number) { return `${Math.round(value).toLocaleString("vi-VN")}đ`; }
