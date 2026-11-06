"use client";

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { createDemoLot, type OverviewLot } from "@/lib/overview-model";
import { changeLotStatus, initialManagedLots, syncOverviewProfile, updateLotProfile, validateLotInput, type LotInput, type ManagedLot } from "@/lib/managed-lots";
import { publishParkingLayout, trimLayoutToInventory, type ParkingLayout } from "@/lib/parking-layout";
import { initialPricingProfile, type PricingProfile } from "@/lib/pricing-rules";

type Workspace = {
  catalog: ManagedLot[]; selectedId: string; selectLot: (id: string) => void;
  overviews: Record<string, OverviewLot>; setOverviews: Dispatch<SetStateAction<Record<string, OverviewLot>>>;
  saveLot: (input: LotInput, id?: string, resubmit?: boolean) => string;
  transitionLot: (id: string, action: "pause" | "resume") => void;
  layouts: Record<string, ParkingLayout>; layoutDrafts: Record<string, ParkingLayout>;
  setLayoutDrafts: Dispatch<SetStateAction<Record<string, ParkingLayout>>>;
  saveLayout: (id: string, layout: ParkingLayout) => ParkingLayout;
  pricing: Record<string, PricingProfile>; updatePricing: (id: string, profile: PricingProfile) => void;
};
const Context = createContext<Workspace | null>(null);

export default function PartnerWorkspace({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState(initialManagedLots);
  const [selectedId, setSelectedId] = useState("hai-chau-1");
  const [layouts, setLayouts] = useState<Record<string, ParkingLayout>>({});
  const [layoutDrafts, setLayoutDrafts] = useState<Record<string, ParkingLayout>>({});
  const [pricing, setPricing] = useState<Record<string, PricingProfile>>({ "hai-chau-1": initialPricingProfile(), "nguyen-hue": initialPricingProfile() });
  const [overviews, setOverviews] = useState<Record<string, OverviewLot>>(() => {
    const initial = initialManagedLots();
    return Object.fromEntries(initial.filter(lot => ["active", "paused"].includes(lot.status)).map(lot => [lot.id, syncOverviewProfile(lot.id === "hai-chau-1" ? createDemoLot() : undefined, lot)]));
  });
  function selectLot(id: string) {
    if (catalog.some(lot => lot.id === id && ["active", "paused"].includes(lot.status))) setSelectedId(id);
  }
  function saveLot(input: LotInput, id?: string, resubmit = false) {
    const current = id ? catalog.find(lot => lot.id === id) : undefined;
    if (id && !current) throw new Error("Không tìm thấy bãi đỗ.");
    const operational = id ? overviews[id] : undefined;
    const busy = operational?.slots.filter(s => ["holding", "occupied"].includes(s.state)).length ?? 0;
    const cleaned = validateLotInput(input, catalog, id, busy);
    const newId = id ?? `lot-${catalog.length + 1}`;
    const updated: ManagedLot = current ? updateLotProfile(current, cleaned, resubmit) : { ...cleaned, id: newId, code: `EZ-NEW${String(catalog.length + 1).padStart(2, '0')}`, status: "pending", submittedAt: "Vừa gửi" };
    const nextOverview = operational ? cleaned.capacity === current?.capacity ? { ...operational, name: updated.name, location: updated.address } : syncOverviewProfile(operational, updated) : undefined;
    setCatalog(value => current ? value.map(lot => lot.id === id ? updated : lot) : [...value, updated]);
    if (nextOverview) setOverviews(value => ({ ...value, [newId]: nextOverview }));
    if (nextOverview && current && cleaned.capacity !== current.capacity) {
      setLayouts(value => value[newId] ? { ...value, [newId]: trimLayoutToInventory(value[newId], nextOverview, cleaned.capacity) } : value);
      setLayoutDrafts(value => value[newId] ? { ...value, [newId]: trimLayoutToInventory(value[newId], nextOverview, cleaned.capacity) } : value);
    }
    return newId;
  }
  function transitionLot(id: string, action: "pause" | "resume") {
    const current = catalog.find(lot => lot.id === id);
    if (!current) throw new Error("Không tìm thấy bãi đỗ.");
    const updated = changeLotStatus(current, action);
    setCatalog(value => value.map(lot => lot.id === id ? updated : lot));
    if (!overviews[id]) setOverviews(value => ({ ...value, [id]: syncOverviewProfile(undefined, updated) }));
  }
  function saveLayout(id: string, layout: ParkingLayout) {
    const profile = catalog.find(lot => lot.id === id);
    if (!profile || !["active", "paused"].includes(profile.status) || !overviews[id]) throw new Error("Bãi chưa được duyệt để cấu hình sơ đồ.");
    const result = publishParkingLayout(layout, overviews[id], profile.capacity, profile.vehicles);
    setOverviews(value => ({ ...value, [id]: result.lot }));
    setLayouts(value => ({ ...value, [id]: result.layout }));
    setLayoutDrafts(value => ({ ...value, [id]: result.layout }));
    return result.layout;
  }
  function updatePricing(id: string, profile: PricingProfile) { setPricing(value => ({ ...value, [id]: profile })); }
  return <Context.Provider value={{ catalog, selectedId, selectLot, overviews, setOverviews, saveLot, transitionLot, layouts, layoutDrafts, setLayoutDrafts, saveLayout, pricing, updatePricing }}>{children}</Context.Provider>;
}

export function usePartnerWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error("PartnerWorkspace is required.");
  return value;
}
