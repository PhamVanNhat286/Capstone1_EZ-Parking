import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { lots } from "@/lib/mock/lots";
import { getFallbackResponse, calculateDistance } from "@/lib/ai/fallback";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body.message || "";
    const userLocation = body.userLocation as { latitude: number; longitude: number } | undefined;

    if (!message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Nếu chưa cấu hình GEMINI_API_KEY, chuyển sang fallback bot có sẵn
    if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
      const fallback = getFallbackResponse(message, userLocation);
      return NextResponse.json({
        ...fallback,
        isFallback: true,
      });
    }

    // Danh sách dữ liệu các bãi xe thực tế kèm khoảng cách nếu có GPS
    let lotsSummary = lots.map((l) => {
      let distanceKm: number | null = null;
      if (userLocation && typeof userLocation.latitude === "number" && typeof userLocation.longitude === "number") {
        distanceKm = calculateDistance(userLocation.latitude, userLocation.longitude, l.latitude, l.longitude);
      }
      return {
        id: l.id,
        name: l.name,
        address: l.address,
        district: l.district,
        latitude: l.latitude,
        longitude: l.longitude,
        distanceKm: distanceKm !== null ? `${distanceKm} km` : "Chưa có GPS",
        distanceValue: distanceKm ?? 9999,
        pricePerHour: l.price,
        totalSlots: l.total,
        availableSlots: l.available.total,
        slotsByType: {
          sedan: l.available.sedan,
          suv: l.available.suv,
          ev: l.available.ev,
        },
        features: l.labels,
      };
    });

    if (userLocation) {
      lotsSummary.sort((a, b) => a.distanceValue - b.distanceValue);
    }

    const locationContext = userLocation
      ? `Người dùng ĐÃ BẬT ĐỊNH VỊ GPS: Tọa độ (${userLocation.latitude.toFixed(5)}, ${userLocation.longitude.toFixed(5)}).
Khoảng cách thực tế từ vị trí người dùng đến các bãi xe (đã sắp xếp từ gần đến xa):
${lotsSummary.map((l, i) => `${i + 1}. ${l.name} (${l.address}) - Cách người dùng: ${l.distanceKm} - Còn ${l.availableSlots} chỗ trống`).join("\n")}

QUY TẮC BẮT BUỘC KHI CÓ GPS:
- Khi người dùng hỏi bãi nào gần nhất, gần tôi, hoặc cần tìm bãi đỗ: BẮT BUỘC ưu tiên bãi có khoảng cách gần nhất (khoảng cách nhỏ nhất).
- Trong câu trả lời (text) và lý do (reason), PHẢI nêu rõ khoảng cách cụ thể (ví dụ: "cách bạn khoảng ${lotsSummary[0]?.distanceKm || 'gần bạn'}") để người dùng dễ hình dung.`
      : `Người dùng CHƯA bật GPS.
QUY TẮC KHI CHƯA CÓ GPS:
- Nếu trong câu hỏi người dùng có nhắc đến địa danh (ví dụ: Cầu Rồng, Lê Duẩn, Sân bay, Chợ Cồn, Sơn Trà, Hải Châu...), hãy phân tích địa danh đó và gợi ý bãi xe nằm gần hoặc cùng khu vực với địa danh đó nhất.
- Nếu người dùng hỏi chung chung "bãi nào gần nhất", hãy trả lời và lịch sự gợi ý người dùng bấm nút Định vị 📍 trên thanh chat hoặc cho biết địa điểm hiện tại để tìm bãi sát nhất.`;

    const systemInstruction = `
Bạn là trợ lý AI thông minh của nền tảng đỗ xe thông minh "EZ-Space" (Đà Nẵng).
Nhiệm vụ của bạn là hỗ trợ tài xế tìm kiếm bãi xe gần nhất, tư vấn ô đỗ (Sedan, SUV, sạc điện EV), giải đáp giá vé và chính sách đặt chỗ.

THÔNG TIN VỊ TRÍ & BÃI XE:
${locationContext}

Dữ liệu chi tiết các bãi xe hiện có:
${JSON.stringify(lotsSummary, null, 2)}

Chính sách & Quy định EZ-Space:
- Đặt cọc: 50.000 ₫ để giữ chỗ trong 10 phút.
- Thời hạn đến bãi: Có 20 phút kể từ lúc thanh toán cọc thành công để đến bãi và quét QR vào cổng. Quá 20 phút sẽ tự động hủy và mất cọc.
- Hoàn cọc: Hoàn 100% tiền cọc nếu người dùng chủ động hủy giữ chỗ trong vòng 5 phút đầu tiên.
- Loại xe hỗ trợ: Sedan, SUV, Xe điện (EV - có trụ sạc).

YÊU CẦU ĐỊNH DẠNG TRẢ VỀ:
- CHỈ GỢI Ý ĐÚNG 1 BÃI XE PHÙ HỢP NHẤT. Tuyệt đối KHÔNG trả về nhiều bãi trùng lặp.
- Mảng "cards" CHỈ CHỨA TỐI ĐA 1 PHẦN TỬ DUY NHẤT của bãi tốt nhất (hoặc mảng rỗng [] nếu chỉ chào hỏi hoặc hỏi chính sách chung).
- "lotId" BẮT BUỘC phải là chính xác một trong 3 id: 'hai-chau-a', 'cau-rong', 'san-bay-t1'.

BẮT BUỘC chỉ trả về đúng định dạng JSON tuân thủ schema sau (tuyệt đối không bọc trong thẻ markdown codeblock):
{
  "text": "Câu trả lời thân thiện, lịch sự, ngắn gọn và hữu ích bằng tiếng Việt",
  "cards": [
    {
      "lotId": "chính xác một trong ba id: 'hai-chau-a', 'cau-rong', 'san-bay-t1'",
      "reason": "Lý do gợi ý bãi tốt nhất này kèm khoảng cách nếu có (ngắn gọn trong 1 câu)",
      "tab": "Tất cả"
    }
  ]
}
`;

    const ai = new GoogleGenAI({ apiKey });
    const primaryModel = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

    let responseText = "";

    try {
      const response = await ai.models.generateContent({
        model: primaryModel,
        contents: message,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
        },
      });
      responseText = response.text || "";
    } catch (modelErr: any) {
      console.warn(`Error with primary model ${primaryModel}, trying fallback model:`, modelErr?.message);
      const backupModel = primaryModel === "gemini-3.5-flash-lite" ? "gemini-3.8-flash" : "gemini-3.5-flash-lite";
      const fallbackResponse = await ai.models.generateContent({
        model: backupModel,
        contents: message,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
        },
      });
      responseText = fallbackResponse.text || "";
    }

    try {
      const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);

      const validLotIds = ["hai-chau-a", "cau-rong", "san-bay-t1"];
      const rawCards = Array.isArray(parsed.cards) ? parsed.cards : [];
      const finalCards: any[] = [];
      const seen = new Set<string>();

      for (const card of rawCards) {
        let lotId = card.lotId;
        if (!validLotIds.includes(lotId)) {
          const match = lots.find(
            (l) =>
              l.id === lotId ||
              l.name.toLowerCase().includes(String(lotId || "").toLowerCase()) ||
              String(card.reason || "").toLowerCase().includes(l.name.toLowerCase())
          );
          lotId = match ? match.id : "cau-rong";
        }
        if (!seen.has(lotId)) {
          seen.add(lotId);
          finalCards.push({ ...card, lotId });
        }
        // ONLY 1 best lot card as requested
        if (finalCards.length >= 1) break;
      }

      return NextResponse.json({
        text: parsed.text || "Mình đã tìm thấy thông tin bãi đỗ cho bạn.",
        cards: finalCards,
        chips: parsed.chips || [],
        isFallback: false,
      });
    } catch {
      return NextResponse.json({
        text: responseText,
        cards: [],
        chips: [],
        isFallback: false,
      });
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error?.message || error);
    const fallback = getFallbackResponse("");
    return NextResponse.json({
      ...fallback,
      isFallback: true,
      error: error?.message || "Đã dùng phản hồi dự phòng.",
    });
  }
}
