import { Lot } from "./mock/lots";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const LOT_IMAGES: Record<string, { image: string; gradient: string; address: string; district: string; labels: string[] }> = {
  "1": {
    image: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800&q=80",
    gradient: "from-blue-500 to-cyan-400",
    address: "15 Lê Duẩn, Hải Châu, Đà Nẵng",
    district: "Hải Châu",
    labels: ["Có EV", "Có mái che", "24/7"],
  },
  "2": {
    image: "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800&q=80",
    gradient: "from-amber-500 to-orange-400",
    address: "Đường Trần Hưng Đạo, Sơn Trà, Đà Nẵng (Chân Cầu Rồng)",
    district: "Sơn Trà",
    labels: ["Gần Cầu Rồng", "24/7"],
  },
  "3": {
    image: "https://images.unsplash.com/photo-1545179605-1296651e9d43?w=800&q=80",
    gradient: "from-emerald-500 to-teal-400",
    address: "Ga T1, Sân bay Quốc tế Đà Nẵng, Q. Hải Châu",
    district: "Hải Châu",
    labels: ["Có EV", "Ngoài trời", "24/7"],
  },
};

export async function getLotsApi(): Promise<Lot[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/lots`, { cache: "no-store" });
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) return [];

    return json.data.map((item: any) => {
      const extra = LOT_IMAGES[String(item.id)] || {
        image: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800&q=80",
        gradient: "from-blue-500 to-cyan-400",
        address: "Đà Nẵng",
        district: "Đà Nẵng",
        labels: ["24/7"],
      };

      return {
        id: String(item.id),
        name: item.name,
        address: item.address || extra.address,
        district: extra.district,
        latitude: item.latitude ? Number(item.latitude) : 16.0718,
        longitude: item.longitude ? Number(item.longitude) : 108.2222,
        total: item.total || 80,
        available: {
          total: item.available?.total ?? 0,
          sedan: item.available?.sedan ?? 0,
          suv: item.available?.suv ?? 0,
          ev: item.available?.ev ?? 0,
        },
        holding: item.holding ?? 0,
        occupied: item.occupied ?? 0,
        price: item.price ?? 20000,
        labels: extra.labels,
        gradient: extra.gradient,
        image: extra.image,
      };
    });
  } catch (error) {
    console.warn("Không kết nối được tới Backend, sử dụng dữ liệu fallback:", error);
    return [];
  }
}

export async function getLotByIdApi(lotId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/lots/${lotId}`, { cache: "no-store" });
    const json = await res.json();
    if (!json.success || !json.data) return null;
    return json.data;
  } catch (error) {
    return null;
  }
}

export async function getLotSlotsApi(lotId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/lots/${lotId}/slots`, { cache: "no-store" });
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) return [];

    return json.data.map((s: any) => ({
      id: s.code || `A${s.id}`,
      dbId: s.id,
      type: s.slot_type === "ev_charging" ? "ev" : s.slot_type === "large" ? "suv" : "sedan",
      status: s.status === "available" ? "empty" : s.status,
      rowIndex: s.row_index,
      colIndex: s.col_index,
      isElevator: s.col_index === 0,
    }));
  } catch (error) {
    console.warn("Không thể tải ô đỗ từ Backend:", error);
    return [];
  }
}

export async function loginApi(email: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function registerApi(data: { full_name: string; email: string; phone?: string; password: string }) {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getMeApi(token: string) {
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}