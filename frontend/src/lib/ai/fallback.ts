import { lots, Lot } from "../mock/lots";

type AIResponse = {
  text: string;
  cards?: { lotId: string; reason: string; tab?: string }[];
  chips?: string[];
};

const normalize = (str: string) => 
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export const getFallbackResponse = (
  query: string,
  userLocation?: { latitude: number; longitude: number }
): AIResponse => {
  const norm = normalize(query);
  
  // Rules
  const isGreeting = /chao|hi |hello/.test(norm);
  const isThanks = /cam on|thanks/.test(norm);
  const isPolicy = /coc|hoan tien|huy|thanh toan/.test(norm);
  const isSUV = /suv/.test(norm);
  const isEV = /ev|sac/.test(norm);
  const isSedan = /sedan/.test(norm);
  const isAirport = /san bay/.test(norm);
  const isCheap = /re |re nhat|gia re/.test(norm);
  const isNear = /gan|gần/.test(norm);
  const isEmpty = /trong|cho|vang/.test(norm);
  
  // Extract budget: "duoi 30k" or "duoi 30000" or "duoi 30.000"
  const budgetMatch = norm.match(/duoi (\d+)[\.\s]?(k|000| ngan| nghin)?/);
  let budget = Infinity;
  if (budgetMatch) {
    let num = parseInt(budgetMatch[1], 10);
    if (num < 1000) num *= 1000;
    budget = num;
  }

  // Handle conversational
  if (isGreeting) {
    return {
      text: "Chào bạn! Mình có thể giúp gì cho việc đỗ xe của bạn hôm nay?",
      chips: ["Tìm bãi gần nhất", "Chính sách hoàn cọc"]
    };
  }
  if (isThanks) {
    return {
      text: "Không có gì! Chúc bạn một ngày tốt lành. Cần gì cứ gọi mình nhé.",
      chips: ["Tìm bãi xe", "Về trang chủ"]
    };
  }
  if (isPolicy) {
    return {
      text: "Theo quy định của EZ-Space, bạn cần đặt cọc 50.000 ₫ để giữ chỗ trong 10 phút. Bạn phải đến bãi trong vòng 20 phút. Bạn sẽ được hoàn 100% tiền cọc nếu hủy trong 5 phút đầu tiên.",
      chips: ["Tìm bãi đỗ", "Xem sơ đồ bãi"]
    };
  }

  // Determine filtering
  let filtered = lots.filter(l => l.available.total > 0).map(l => {
    let dist = l.distance;
    if (userLocation && l.latitude && l.longitude) {
      dist = calculateDistance(userLocation.latitude, userLocation.longitude, l.latitude, l.longitude);
    }
    return { ...l, distance: dist };
  });
  
  if (isSUV) filtered = filtered.filter(l => l.available.suv > 0);
  if (isEV) filtered = filtered.filter(l => l.available.ev > 0);
  if (isSedan && !isSUV && !isEV) filtered = filtered.filter(l => l.available.sedan > 0);
  if (isAirport) filtered = filtered.filter(l => normalize(l.name).includes("san bay") || normalize(l.district).includes("san bay"));
  
  if (budget < Infinity) {
    filtered = filtered.filter(l => l.price <= budget);
  }

  // Sorting
  if (isCheap) {
    filtered.sort((a, b) => a.price - b.price);
  } else if (isNear) {
    filtered.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
  }

  // Results
  if (filtered.length > 0) {
    const lot = filtered[0];
    let distText = lot.distance !== undefined ? ` (cách bạn ~${lot.distance} km)` : "";
    let reason = "Bãi đỗ phù hợp nhất với yêu cầu của bạn.";
    if (isCheap) reason = "Bãi đỗ rẻ nhất có chỗ trống.";
    else if (isNear) reason = `Bãi đỗ gần bạn nhất hiện tại${distText}.`;
    else if (isAirport) reason = "Bãi đỗ sân bay có chỗ trống.";
    
    if (budget < Infinity) {
      reason += ` Giá dưới ${budget.toLocaleString("vi-VN")}₫.`;
    }

    let tab = "Tất cả";
    if (isSUV) tab = "SUV";
    else if (isEV) tab = "EV";
    else if (isSedan) tab = "Sedan";

    return {
      text: `Mình tìm thấy bãi đỗ phù hợp cho bạn. ${lot.name}${distText} hiện đang có ${lot.available.total} chỗ trống.`,
      cards: [{ lotId: lot.id, reason, tab }],
      chips: ["Xem bãi khác", "Hỏi về hoàn cọc"]
    };
  }

  return {
    text: "Rất tiếc, mình không tìm thấy bãi đỗ nào khớp hoàn toàn với yêu cầu của bạn lúc này. Bạn thử tìm kiếm với tiêu chí khác xem sao nhé!",
    chips: ["Xem tất cả bãi", "Bãi còn chỗ"]
  };
};
