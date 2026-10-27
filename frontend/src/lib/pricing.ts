/**
 * EZ-Space Dynamic Pricing Engine
 * Tự động tính cước phí theo khung giờ (Cao điểm, Tiêu chuẩn, Giờ đêm)
 * và hỗ trợ cộng dồn lũy tiến khi đỗ xe vắt qua nhiều khung giờ.
 */

export type PricingTier = "PEAK" | "STANDARD" | "NIGHT";

export interface HourlyRateResult {
  rate: number;
  tier: PricingTier;
  label: string;
}

export interface HourBreakdown {
  hour: number;
  hourLabel: string; // VD: "18:00 - 19:00"
  rate: number;
  tier: PricingTier;
  label: string;
}

export interface DetailedFeeResult {
  totalFee: number;
  breakdown: HourBreakdown[];
  averageRate: number;
  isCrossTier: boolean;
  primaryTier: PricingTier;
  summaryLabel: string;
}

// Bảng cấu hình khung giờ mặc định cho từng bãi xe
interface LotPricingConfig {
  basePrice: number;
  peakPrice: number;
  nightPrice: number;
  weekendEventPrice?: number;
  peakHours: Array<{ start: number; end: number }>; // Giờ 24h
  nightHours: Array<{ start: number; end: number }>;
}

const LOT_CONFIGS: Record<string, LotPricingConfig> = {
  // 1. Bãi Hải Châu A (Lê Duẩn)
  "hai-chau-a": {
    basePrice: 20000,
    peakPrice: 25000,
    nightPrice: 10000,
    peakHours: [
      { start: 7, end: 9 },    // 07:00 - 09:00 (Sáng)
      { start: 17, end: 21 },  // 17:00 - 20:59 (Tan tầm & tối)
    ],
    nightHours: [
      { start: 22, end: 6 },   // 22:00 - 06:00
    ],
  },
  "1": {
    basePrice: 20000,
    peakPrice: 25000,
    nightPrice: 10000,
    peakHours: [
      { start: 7, end: 9 },
      { start: 17, end: 21 },
    ],
    nightHours: [
      { start: 22, end: 6 },
    ],
  },

  // 2. Bãi Cầu Rồng (Trần Hưng Đạo)
  "cau-rong": {
    basePrice: 15000,
    peakPrice: 20000,
    nightPrice: 8000,
    weekendEventPrice: 25000, // Tối T7, CN xem Cầu Rồng phun lửa (19:00 - 22:00)
    peakHours: [
      { start: 7, end: 9 },
      { start: 17, end: 21 },
    ],
    nightHours: [
      { start: 22, end: 6 },
    ],
  },
  "2": {
    basePrice: 15000,
    peakPrice: 20000,
    nightPrice: 8000,
    weekendEventPrice: 25000,
    peakHours: [
      { start: 7, end: 9 },
      { start: 17, end: 21 },
    ],
    nightHours: [
      { start: 22, end: 6 },
    ],
  },

  // 3. Sân bay Đà Nẵng T1
  "san-bay-t1": {
    basePrice: 15000,
    peakPrice: 20000,
    nightPrice: 8000,
    peakHours: [
      { start: 6, end: 9 },    // 06:00 - 09:00 (Giờ bay sáng sớm)
      { start: 15, end: 19 },  // 15:00 - 18:59 (Giờ bay chiều)
    ],
    nightHours: [
      { start: 22, end: 6 },
    ],
  },
  "3": {
    basePrice: 15000,
    peakPrice: 20000,
    nightPrice: 8000,
    peakHours: [
      { start: 6, end: 9 },
      { start: 15, end: 19 },
    ],
    nightHours: [
      { start: 22, end: 6 },
    ],
  },
};

/**
 * Lấy đơn giá của 1 giờ cụ thể (hour: 0..23) cho 1 bãi xe
 */
export function getRateForHour(
  lotId: string,
  hour: number,
  fallbackBasePrice: number = 15000,
  dayOfWeek: number = new Date().getDay()
): HourlyRateResult {
  const normId = String(lotId).toLowerCase();
  const config = LOT_CONFIGS[normId] || {
    basePrice: fallbackBasePrice,
    peakPrice: Math.round(fallbackBasePrice * 1.3),
    nightPrice: Math.round(fallbackBasePrice * 0.5),
    peakHours: [
      { start: 7, end: 9 },
      { start: 17, end: 21 },
    ],
    nightHours: [{ start: 22, end: 6 }],
  };

  // 1. Kiểm tra sự kiện cuối tuần đặc biệt (Bãi Cầu Rồng tối T7 & CN: 19h - 22h)
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // 0 = Chủ Nhật, 6 = Thứ Bảy
  if (config.weekendEventPrice && isWeekend && hour >= 19 && hour < 22) {
    return {
      rate: config.weekendEventPrice,
      tier: "PEAK",
      label: "Sự kiện Cầu Rồng",
    };
  }

  // 2. Kiểm tra giờ đêm (22h - 6h)
  const isNight = hour >= 22 || hour < 6;
  if (isNight) {
    return {
      rate: config.nightPrice,
      tier: "NIGHT",
      label: "Giờ đêm tiết kiệm",
    };
  }

  // 3. Kiểm tra giờ cao điểm
  const isPeak = config.peakHours.some((p) => hour >= p.start && hour < p.end);
  if (isPeak) {
    return {
      rate: config.peakPrice,
      tier: "PEAK",
      label: "Giờ cao điểm",
    };
  }

  // 4. Mặc định là giờ tiêu chuẩn
  return {
    rate: config.basePrice,
    tier: "STANDARD",
    label: "Giờ tiêu chuẩn",
  };
}

/**
 * Tính cước phí chi tiết khi đỗ từ startTime (VD: "18:00") trong billableHours tiếng
 */
export function calculateDetailedFee(
  lotId: string,
  startTimeStr: string,
  billableHours: number,
  fallbackBasePrice: number = 15000,
  referenceDate: Date = new Date()
): DetailedFeeResult {
  const safeHours = Math.max(1, Math.min(24, billableHours || 1));
  let startHour = referenceDate.getHours();

  if (startTimeStr && startTimeStr.includes(":")) {
    const parsedH = parseInt(startTimeStr.split(":")[0], 10);
    if (!isNaN(parsedH)) {
      startHour = parsedH;
    }
  }

  const breakdown: HourBreakdown[] = [];
  let totalFee = 0;
  const tiersCount: Record<PricingTier, number> = { PEAK: 0, STANDARD: 0, NIGHT: 0 };

  for (let i = 0; i < safeHours; i++) {
    const curHour = (startHour + i) % 24;
    // Tính ngày trong tuần (nếu vắt qua ngày hôm sau)
    const dayOffset = Math.floor((startHour + i) / 24);
    const dayOfWeek = (referenceDate.getDay() + dayOffset) % 7;

    const hourRateInfo = getRateForHour(lotId, curHour, fallbackBasePrice, dayOfWeek);
    totalFee += hourRateInfo.rate;
    tiersCount[hourRateInfo.tier] = (tiersCount[hourRateInfo.tier] || 0) + 1;

    const nextH = (curHour + 1) % 24;
    breakdown.push({
      hour: curHour,
      hourLabel: `${String(curHour).padStart(2, "0")}:00 - ${String(nextH).padStart(2, "0")}:00`,
      rate: hourRateInfo.rate,
      tier: hourRateInfo.tier,
      label: hourRateInfo.label,
    });
  }

  const uniqueTiers = Object.keys(tiersCount).filter((t) => tiersCount[t as PricingTier] > 0);
  const isCrossTier = uniqueTiers.length > 1;

  // Xác định tier chủ đạo
  let primaryTier: PricingTier = "STANDARD";
  if (tiersCount.PEAK > 0 && tiersCount.PEAK >= tiersCount.STANDARD) {
    primaryTier = "PEAK";
  } else if (tiersCount.NIGHT > 0 && tiersCount.NIGHT >= safeHours / 2) {
    primaryTier = "NIGHT";
  }

  let summaryLabel = "Giờ tiêu chuẩn";
  if (isCrossTier) {
    summaryLabel = "Lũy tiến đa khung giờ";
  } else if (primaryTier === "PEAK") {
    summaryLabel = breakdown[0]?.label || "Giờ cao điểm";
  } else if (primaryTier === "NIGHT") {
    summaryLabel = "Giờ đêm tiết kiệm";
  }

  return {
    totalFee,
    breakdown,
    averageRate: Math.round(totalFee / safeHours),
    isCrossTier,
    primaryTier,
    summaryLabel,
  };
}

/**
 * Lấy thông tin giá tức thời tại thời điểm hiện tại (Dùng cho Card bãi xe ở Trang chủ)
 */
export function getCurrentLotRate(lotId: string, fallbackBasePrice: number = 15000): HourlyRateResult {
  const now = new Date();
  return getRateForHour(lotId, now.getHours(), fallbackBasePrice, now.getDay());
}
