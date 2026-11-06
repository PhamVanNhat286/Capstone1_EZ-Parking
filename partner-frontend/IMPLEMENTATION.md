# Partner portal implementation

`partner-frontend` is an independent Next.js application with its own dependencies,
layout and styles. It does not import the customer frontend and runs on port 3001.
See [README.md](README.md) for setup and review instructions.

## Screens

| Route | Scope | Figma reference |
| --- | --- | --- |
| `/design-system` | Colors, typography and component states | `1:2` |
| `/` | Operational parking overview | `1:569` |
| `/lots` | Lot registration and management | `1:1257` |
| `/layout` | Interactive parking layout editor | `1:1732` and supplied screenshot |
| `/pricing` | Standalone pricing rules and quote simulator | Supplied screenshot |
| `/sessions` | Reservations and parking sessions | `7:4111` |
| `/kiosk` | QR gate kiosk and scan simulator | `7:4812` |
| `/dashboard` | Dashboard overview | `7:5187` |
| `/revenue` | Revenue report | `7:6955` |
| `/audit` | Operation history and reconciliation UI | `7:8525` |
| `/settings` | Account profile and security prototype | `7:9164` |

Design file: `https://www.figma.com/design/3heUuXWQXhGGaOUY9o4i3V`.
The security tab follows the profile screen's style, as requested; no separate security
reference was supplied. Later screens were visually inspected in Figma when design-context
tools reached their quota. This is not a claim of exhaustive pixel matching.

## State and limitations

- `PartnerWorkspace` shares lots, slots, sessions, pricing, saved layouts and layout drafts
  across operational routes. Refresh resets this demo state.
- Check-in/out, cancellation, walk-ins and maintenance update the operational model.
  Busy slots and active sessions are protected; paused lots cannot accept new arrivals.
- Layout tools include floors, multi-selection, placement, automatic grids, lanes, gates,
  undo/redo, zoom and publishing. Removing a cell does not delete its session history.
- Pricing supports per-vehicle rates, peak rules, grace periods and overtime calculation.
- Kiosk supports manual tickets, scenarios and QR decoding where BarcodeDetector is
  available. Camera access is opt-in with cleanup. No gate hardware is controlled.
- Dashboard values derive from operational demo state. Completions without an absolute
  hour are not silently assigned to hourly buckets. Operational counters and layouts can
  therefore differ from the original static reference snapshot.
- Revenue intentionally starts with the October 2026 Figma fixture: 48.250.000đ and 412
  transactions. Filters, search, pagination, details, CSV and print use
  `revenue-design-data.ts`. The displayed report is separate from operational receipt
  helpers in `revenue-report.ts`.
- Audit uses six reference rows with table/timeline, filtering, read-only details and CSV.
  Ledger counters, live reconciliation and SHA-256 labels are reference content; no
  backend audit verification or tamper-proof storage is implemented.
- Account edits stay on the settings page; email and role are fixed. JPG/PNG avatar
  previews are local and limited to 2MB. Password validation clears its inputs without
  storing or sending credentials. Two-factor and session controls are labelled demos.

There is no Partner authentication, API integration, persistent storage, signed-ticket
verification, VNPay/bank reconciliation, real refund/payment or account security change.
The kiosk camera scene is a code illustration; the lot placeholder is the local Figma
export at `public/figma/parking-placeholder.png`.

## Validation

Run in `partner-frontend`:

```sh
npm run typecheck
npm test
npm run build
```

The suite has 38 model tests for operational state, capacity, layouts, kiosk validation,
dashboard totals, receipts, audit filtering/CSV and settings validation. TypeScript and
the production Webpack build also pass.

Browser review covered operational transitions, editor tools, pricing examples, kiosk
validation, report filters/details, audit table/timeline, and settings save/cancel with
security demo controls. Some operational screens were checked at mobile width. Revenue,
audit and settings preserve the 1280px reference desktop width and can scroll horizontally
on narrower viewports.
