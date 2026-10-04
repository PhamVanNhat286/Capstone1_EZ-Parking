import { lots, Lot } from "../mock/lots";

type AIResponse = {
  text: string;
  cards?: { lotId: string; reason: string; tab?: string }[];
  chips?: string[];
};

const normalize = (str: string) => 
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const getFallbackResponse = (query: string): AIResponse => {
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
    if (num < 1000) num *= 1000; // "30k" -> 30000
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
  let filtered = lots.filter(l => l.available.total > 0);
  
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
    filtered.sort((a, b) => a.distance - b.distance);
  }

  // Results
  if (filtered.length > 0) {
    const lot = filtered[0];
    let reason = "Bãi đỗ phù hợp nhất với yêu cầu của bạn.";
    if (isCheap) reason = "Bãi đỗ rẻ nhất có chỗ trống.";
    else if (isNear) reason = "Bãi đỗ gần bạn nhất hiện tại.";
    else if (isAirport) reason = "Bãi đỗ sân bay có chỗ trống.";
    
    if (budget < Infinity) {
      reason += ` Giá dưới ${budget.toLocaleString("vi-VN")}₫.`;
    }

    let tab = "Tất cả";
    if (isSUV) tab = "SUV";
    else if (isEV) tab = "EV";
    else if (isSedan) tab = "Sedan";

    return {
      text: `Mình tìm thấy bãi đỗ phù hợp cho bạn. ${lot.name} hiện đang có ${lot.available.total} chỗ trống.`,
      cards: [{ lotId: lot.id, reason, tab }],
      chips: ["Xem bãi khác", "Hỏi về hoàn cọc"]
    };
  }

  // Out of scope / Not found
  if (isSUV || isEV || isSedan || isEmpty || isAirport || isCheap || isNear || budget < Infinity) {
    return {
      text: "Hiện chưa có bãi phù hợp với điều kiện của bạn. Bạn thử nới lỏng yêu cầu xem sao nhé.",
      chips: ["Bãi gần nhất", "Tất cả bãi"]
    };
  }

  // Catch all
  return {
    text: "Xin lỗi, mình chỉ có thể hỗ trợ các vấn đề về tìm bãi đỗ xe, giá cả, và chính sách cọc. Bạn có muốn tìm bãi đỗ không?",
    chips: ["Tìm chỗ rẻ nhất", "Tìm bãi có sạc EV"]
  };
};
