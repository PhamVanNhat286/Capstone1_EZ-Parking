# Partner: PostgreSQL integration

## Source

Authoritative SQL: [develop/database](https://github.com/PhamVanNhat286/Capstone1_EZ-Parking/tree/ef18ea8732d1938ec5a7a83408c1d2b5adfaf5db/database).
The feature branch was merged with develop to retain the team's current booking/payment implementation.
The canonical SQL files match develop; no application data is reset during normal startup or synchronization.

## Runtime

`SqlWorkspace` authenticates via `/api/auth/login` and reads `/api/partner/snapshot`.
The manager identity comes from the verified JWT and an active manager row in PostgreSQL.
There is no fixed manager ID and no seed fallback in the browser runtime.
A session token is kept in sessionStorage for this Partner tab; passwords are only sent to the login API.
Next.js proxies same-origin API requests to `PARTNER_BACKEND_URL` (default port 5000).

A snapshot is read in one REPEATABLE READ, READ ONLY transaction. Every table is scoped through
parking_lot_managers, reservations and their related records. Only customers/actors referenced by those
records are included. Snapshot responses use no-store. Raw provider payloads, QR hashes, password hashes
and OTPs are excluded, including nested audit JSON.
BIGINT IDs remain strings; SQL decimals become numbers and DATE fields remain YYYY-MM-DD.
Payment providers include the new bank enum value.

Snapshots refresh after writes, every 15 seconds while visible, and on focus/visibility changes.
The last successful snapshot remains visible with a stale-data notice if a later refresh fails.
Authentication failures clear the session. In-flight old requests cannot replace a newer session snapshot.

## Writes

Partner API endpoints support lot create/update/status, slot create/update, pricing create/update,
profile updates and cancellation of unpaid holding reservations. Request fields are explicitly selected;
role, approval and foreign actor fields cannot be set by the client.
All writes verify the active manager in PostgreSQL, lock the lot assignment and affected records,
validate ownership and SQL constraints, and commit state plus audit/history together.
Updated records require expected_updated_at to prevent stale form edits. Duplicate code/grid/phone
conflicts return 409. The UI submits once and disables the form while saving.
A committed write is not retried simply because its follow-up refresh failed.

New lots use the SQL pending default and receive a manager assignment. Approval belongs to Admin.
Slots with a vehicle or unfinished reservation cannot be edited. Capacity cannot shrink below inventory.
Pricing changes preserve booked prices and existing payment records.
Cancellation updates the holding reservation and slot in one transaction and creates no refund/payment.
Profile updates only affect the authenticated manager's full_name and phone.

Gate Kiosk reads the real reservation, QR metadata and session. The former preview mutations are removed
from live screens; signed QR verification and device control require their own integration.
The shared expiration worker now preserves slots attached to paid/entered reservations, preventing a
paid deposit from making its position appear available before the arrival deadline.

Login verifies bcrypt hashes only; the former hard-coded password shortcuts from develop are removed.
JWT IDs are strings so PostgreSQL BIGINT identities are not rounded through Number().

## Screens and calculations

Lots, layout, reservations, sessions, pricing, revenue, audit and settings consume the same snapshot.
Availability groups standard as Sedan, large as SUV, ev_charging as EV and disabled separately as priority.
Only available, active slot rows are listed; undeclared capacity is never fabricated as positions.
Revenue counts successful deposit/final payments and successful refunds separately. It does not add
reservation/session totals again and has no net/difference column. Reporting periods use Vietnam local
dates from paid_at, with an explicit created_at fallback for transactions without paid_at.

The SQL has no floors, arbitrary gate geometry, per-vehicle pricing, grace/overtime settings, 2FA or
trusted-device session data. The UI keeps those unsupported concepts out of operational configuration.

## Setup tools and tests

`backend/scripts/partner-database.mjs` checks the SQL table/column/enum contract. Init refuses to run seed
if public contains tables; sync only adds bank to an existing payment_provider and checks the contract.

The generated public SQL artifact remains a build/test contract fixture. It is not imported by the live
workspace. The seed currently has 5 users, 4 vehicles, 3 lots, 55 slots and 3 payments; this does not imply
that the connected database must have those counts. Runtime counts always come from PostgreSQL.
Known source inconsistencies are displayed for investigation rather than silently rewriting records.

Validation includes 36 frontend model/API tests, 4 backend unit tests, existing shared-payment tests,
and PostgreSQL HTTP integration tests. The integration suite uses a generated partner_test_* schema,
checks its search_path before loading canonical SQL, and drops only that schema after completion.
Coverage includes login/role restrictions, tenant isolation, secret redaction, persistent writes,
stale edits, protected slots, pricing dates, cancellation atomicity, profiles, bank payments,
shared deposit synchronization, expiration behavior and manager revocation.
