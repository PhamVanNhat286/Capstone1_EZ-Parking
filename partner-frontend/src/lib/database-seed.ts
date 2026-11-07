import generated from './database.generated.json' with { type: 'json' };
import type { PartnerData } from './database-model';

export const databaseSource = generated;
// Only a preview of SQL seed rows, never an assertion that a database is connected.
export function createSqlPreview(now = new Date().toISOString()): PartnerData {
  const base = Date.parse(now);
  const stamp = { created_at: now, updated_at: now };
  const defaults: Record<string, Record<string, unknown>> = {
    users: { ...stamp, phone: null, avatar_url: null },
    vehicles: { ...stamp, vehicle_name: null, is_default: false },
    parking_lots: { ...stamp, latitude: null, longitude: null, description: null, open_time: null, close_time: null, approved_by: null, approved_at: null },
    parking_lot_vehicle_types: {}, parking_lot_managers: { assigned_at: now },
    slots: { ...stamp, status: 'available', slot_type: 'standard', is_active: true },
    pricing_rules: { ...stamp, name: null, start_time: null, end_time: null, surcharge: 0, effective_from: null, effective_to: null },
    reservations: { ...stamp, arrival_expires_at: null, total_amount: null, cancelled_at: null, cancel_reason: null },
    payments: { ...stamp, transaction_ref: null, response_code: null, ipn_received_at: null, paid_at: null },
    qr_tickets: { created_at: now, used_at: null },
    parking_sessions: { ...stamp, check_in_at: null, check_out_at: null, checked_in_by: null, checked_out_by: null, final_amount: null },
    audit_logs: { created_at: now, user_id: null, parking_lot_id: null, entity_type: null, entity_id: null, old_value: null, new_value: null, note: null },
    manager_history: { created_at: now, old_value: null, new_value: null, note: null },
  };
  return Object.fromEntries(Object.entries(defaults).map(([table, values]) => [table,
    (generated.rows as Record<string, Record<string, unknown>[]>)[table].map(row => Object.fromEntries(Object.entries({ ...values, ...row }).map(([key, value]) => {
      if (typeof value === 'object' && value !== null && '$now' in value) return [key, new Date(base + Number(value.$now)).toISOString()];
      if ((key === 'id' || key.endsWith('_id') || ['approved_by', 'checked_in_by', 'checked_out_by'].includes(key)) && value !== null) return [key, String(value)];
      return [key, value];
    })))
  ])) as PartnerData;
}
