import type { Id, Slot, SlotType } from './database-model';

// Same vehicle categories as backend/src/controllers/lot.controller.ts.
export const availabilityTypes = [
  { slotType: 'standard', label: 'Sedan', description: 'Ô tiêu chuẩn' },
  { slotType: 'large', label: 'SUV', description: 'Ô lớn' },
  { slotType: 'ev_charging', label: 'EV', description: 'Ô sạc điện' },
  { slotType: 'disabled', label: 'Ưu tiên', description: 'Ô dành cho người khuyết tật' },
] as const satisfies readonly { slotType: SlotType; label: string; description: string }[];

export function getLotAvailability(slots: readonly Slot[], lotId: Id) {
  const registered = slots.filter(slot => slot.parking_lot_id === lotId);
  const available = registered.filter(slot => slot.is_active && slot.status === 'available')
    .sort((a, b) => a.row_index - b.row_index || a.col_index - b.col_index || a.code.localeCompare(b.code, 'vi', { numeric: true }));
  const groups = availabilityTypes.map(type => ({
    ...type,
    slots: available.filter(slot => slot.slot_type === type.slotType),
    registered: registered.filter(slot => slot.slot_type === type.slotType).length,
  }));
  return { registered: registered.length, available, groups };
}
