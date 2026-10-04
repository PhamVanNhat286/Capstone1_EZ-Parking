export type Lot = {
  id: string;
  name: string;
  district: string;
  distance: number;
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
    district: "Hải Châu",
    distance: 0.6,
    total: 80,
    available: { total: 24, sedan: 10, suv: 10, ev: 4 },
    holding: 6,
    occupied: 50,
    price: 20000,
    labels: ["Có EV", "Có mái che", "24/7"],
    gradient: "from-blue-500 to-cyan-400",
    image: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800&q=80",
  },
  {
    id: "cau-rong",
    name: "Bãi Cầu Rồng",
    district: "Sơn Trà",
    distance: 1.8,
    total: 120,
    available: { total: 9, sedan: 5, suv: 4, ev: 0 },
    holding: 4,
    occupied: 107,
    price: 15000,
    labels: ["24/7"],
    gradient: "from-amber-500 to-orange-400",
    image: "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800&q=80",
  },
  {
    id: "san-bay-t1",
    name: "Sân bay Đà Nẵng T1 – Dài hạn",
    district: "Hải Châu",
    distance: 3.2,
    total: 340,
    available: { total: 120, sedan: 60, suv: 50, ev: 10 },
    holding: 15,
    occupied: 205,
    price: 12000,
    labels: ["Có EV", "Ngoài trời", "24/7"],
    gradient: "from-emerald-500 to-teal-400",
    image: "https://images.unsplash.com/photo-1545179605-1296651e9d43?w=800&q=80",
  },
];
