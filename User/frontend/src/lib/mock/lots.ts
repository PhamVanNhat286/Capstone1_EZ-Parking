export type Lot = {
  id: string;
  name: string;
  address: string;
  district: string;
  latitude: number;
  longitude: number;
  distance?: number;
  total: number;
  available: {
    total: number;
    sedan: number;
    suv: number;
    ev: number;
  };
  holding: number;
  occupied: number;
  price: number;
  labels: string[];
  gradient: string;
  image: string;
};

export const lots: Lot[] = [
  {
    id: "hai-chau-a",
    name: "Bãi Hải Châu A",
    address: "15 Lê Duẩn, Hải Châu, Đà Nẵng",
    district: "Hải Châu",
    latitude: 16.0718,
    longitude: 108.2222,
    total: 80,
    available: { total: 14, sedan: 9, suv: 2, ev: 2 },
    holding: 2,
    occupied: 4,
    price: 20000,
    labels: ["Có EV", "Có mái che", "24/7"],
    gradient: "from-blue-500 to-cyan-400",
    image: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800&q=80",
  },
  {
    id: "cau-rong",
    name: "Bãi Cầu Rồng",
    address: "Đường Trần Hưng Đạo, Sơn Trà, Đà Nẵng (Chân Cầu Rồng)",
    district: "Sơn Trà",
    latitude: 16.061,
    longitude: 108.227,
    total: 120,
    available: { total: 9, sedan: 5, suv: 4, ev: 0 },
    holding: 1,
    occupied: 5,
    price: 15000,
    labels: ["24/7"],
    gradient: "from-amber-500 to-orange-400",
    image: "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800&q=80",
  },
  {
    id: "san-bay-t1",
    name: "Sân bay Đà Nẵng T1",
    address: "Ga T1, Sân bay Quốc tế Đà Nẵng, Q. Hải Châu",
    district: "Hải Châu",
    latitude: 16.0538,
    longitude: 108.1995,
    total: 340,
    available: { total: 16, sedan: 10, suv: 4, ev: 2 },
    holding: 1,
    occupied: 3,
    price: 12000,
    labels: ["Có EV", "Ngoài trời", "24/7"],
    gradient: "from-emerald-500 to-teal-400",
    image: "https://images.unsplash.com/photo-1545179605-1296651e9d43?w=800&q=80",
  },
];

const SLUG_BY_ID: Record<string, string> = { "1": "hai-chau-a", "2": "cau-rong", "3": "san-bay-t1" };

// Tìm bãi theo slug ("hai-chau-a") hoặc theo id của backend ("1"); không thấy thì lấy bãi đầu tiên
export const getLotByAnyId = (lotId?: string): Lot =>
  lots.find((l) => l.id === (SLUG_BY_ID[lotId || ""] || lotId)) || lots[0];