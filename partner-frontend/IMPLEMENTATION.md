# Partner: SQL alignment

Authoritative source selected by the user:
[develop/database/schema.sql](https://github.com/PhamVanNhat286/Capstone1_EZ-Parking/blob/ba5fb8d51289d70c112d3671e7ce13c7aa692a3b/database/schema.sql).
The branch was synchronized with develop at ba5fb8d before this change.
SQL files and the customer frontend/backend were not changed by the Partner rewrite.

## Data model

The old Figma fixture models were removed from operational routes.
database-model.ts uses actual table/column names and exact enums:

- BIGSERIAL/BIGINT IDs remain strings; they are not UUIDs, slugs or display slot codes.
- Vehicle types: Sedan, SUV, EV.
- Lot statuses: pending, active, inactive, rejected.
- Slot statuses: available, holding, occupied, unavailable.
- Slot types: standard, ev_charging, large, disabled.
- Reservation statuses: holding, paid, entered, completed, cancelled, forfeited, refunded.

| Screen | Source / relationship |
| --- | --- |
| Lots | parking_lots plus parking_lot_managers and parking_lot_vehicle_types |
| Layout | slots.id, code, row_index, col_index, slot_type, status, is_active |
| Pricing | pricing_rules with hourly_rate, surcharge, start/end_time, effective_from/to |
| Reservations | reservations joined through user_id, vehicle_id, slot_id, parking_lot_id |
| Sessions | parking_sessions through reservation_id; actual check-in/out timestamps |
| Kiosk | reservation plus qr_tickets and parking_sessions; never payment QR |
| Revenue | payments through reservation_id; provider, payment_type, amount and status |
| Audit | audit_logs plus manager_history; no fabricated signature or ledger counters |
| Settings | public users fields; assigned lots through parking_lot_managers |

The schema has no floors, arbitrary lane/gate geometry, per-vehicle pricing,
grace-period or overtime-fee configuration, 2FA or device-session records.
Those unsupported controls were removed from operational screens.
Physical slots and vehicle profiles remain because the selected SQL includes them.

## Seed generation

scripts/generate-database.mjs parses only the INSERT expressions currently used by seed.sql,
including NOW() offsets and its SHA-256 seed ticket expression. Unknown expressions fail
explicitly; there is no eval, SQL execution or database connection.
The generated artifact contains SQL hashes, enum/table metadata and public seed rows.
Password hashes and raw provider IPN payloads are excluded.

NOW() expressions resolve against one clock when the browser preview opens.
The dataset has 4 users, 4 vehicles, 3 lots, 55 slots, 5 pricing rules, 3 reservations,
3 payments, 1 QR ticket, 1 completed parking session and 2 audit rows.
Manager 2 can view lots 1 and 2. No fake active session is generated from occupied slots.
Capacity 80 does not mean 80 slots exist: lot 1 contains only 20 seed slot rows.

Reservation 2 paid / slot A-04 occupied is an upstream seed inconsistency.
It is displayed and blocks invalid check-in instead of being silently repaired.

## Preview mutations

- New lots are pending with no approval; they receive a manager assignment, not fake slots.
- Lot editing enforces SQL field limits and prevents shrinking below the declared inventory.
- Slot editing enforces unique code/grid within a lot, valid types, and protects unfinished bookings.
- Pricing is per lot, handles overnight/null periods and decimal precision, and leaves reservation snapshots unchanged.
- Cancellation is restricted to unpaid holding reservations; no fake refund is created.
- Check-in preview requires paid, valid QR metadata/deadline, active lot and holding slot; it updates
  reservation, slot, QR and session together. It is not signed QR verification.
- Check-out preview requires entered plus active session, occupied slot and sufficient recorded
  successful funds. The final amount is entered explicitly; no invented fee or payment is added.
- Changes append schema-shaped audit rows/history using valid action types.
- Reports count successful deposit/final payments as receipts and successful refund rows separately.
  Reservation totals and session final_amount are not added again. Date filters use Vietnam dates.
- Profile editing changes public full_name/phone only; no credential is collected or stored.

All state is browser memory shared across routes. No API authentication, DB persistence,
concurrency protection, provider reconciliation, production QR verification or hardware control
is claimed. Permission and transaction checks must also run on the backend before live integration.

## Validation

- 18 model/contract tests cover source hashes, exact columns/enums, seed counts/links,
  ownership, capacity vs inventory, SQL uniqueness, pricing snapshots, money aggregation,
  unpaid cancellation, seed diagnostics, gate transitions/replay/expiry, profiles and safe CSV.
- TypeScript and production build are run for the complete app.
