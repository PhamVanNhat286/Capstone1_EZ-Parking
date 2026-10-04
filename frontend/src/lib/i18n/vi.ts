export const vi = {
  home: {
    greeting: "Chào bạn 👋",
    subtitle: "Bạn muốn đỗ xe ở đâu hôm nay?",
    searchPlaceholder: "Tìm bãi xe, quận, khu vực…",
    filters: {
      all: "Tất cả",
      sedan: "Sedan",
      suv: "SUV",
      ev: "EV Sạc",
      availableNow: "Còn trống ngay",
    },
    activeBooking: {
      title: "Đặt chỗ đang hoạt động",
      spot: "Ô A3 • Bãi Hải Châu A",
    },
    nearby: "Bãi xe gần bạn",
    lotsCount: (count: number) => `${count} bãi`,
    emptyState: {
      title: "Không tìm thấy bãi phù hợp",
      clearBtn: "Xóa bộ lọc",
    },
  },
  lotCard: {
    available: "chỗ trống",
    pricePerHour: "₫/giờ",
    labels: {
      hasEv: "Có EV",
      covered: "Có mái che",
      outdoor: "Ngoài trời",
      twentyFourSeven: "24/7",
    },
  },
  nav: {
    explore: "Khám phá",
    history: "Vé và lịch sử",
    ai: "AI",
    profile: "Hồ sơ",
  },
  formatMoney: (amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(amount) + " ₫";
  },
  formatDistance: (dist: number) => {
    return dist.toString().replace(".", ",") + " km";
  },
};
