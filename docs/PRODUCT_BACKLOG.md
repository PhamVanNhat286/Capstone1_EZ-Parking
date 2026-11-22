# INTERNATIONAL SCHOOL - DUY TAN UNIVERSITY
## CAPSTONE PROJECT 1 — CMU-SE 450
# PRODUCT BACKLOG DOCUMENT

**Version:** 1.0  
**Project Title:** The Smart Parking Space Search and Capacity Optimization Platform  
**Project Acronym:** EZ-Space  
**Mentor:** M.Sc. Pham Thanh Dat  
**Team Code:** C1SE.78  

**Team Members:**
- Pham Van Nhat (Leader / Product Owner)
- Pham Thuan Hoang (Backend Developer)
- Pham Van Huy (Frontend / DevOps Engineer)
- Pham Tran Vu Thai (Frontend / Scrum Master / QA)

**Approved by:** M.Sc. Pham Thanh Dat  
**Product Backlog Review Panel Representative:**

| Name | Signature | Date |
| :--- | :--- | :--- |
| | | |

**Capstone Project 1 - Mentor:**

| Name | Signature | Date |
| :--- | :--- | :--- |
| M.Sc. Pham Thanh Dat | | |

---

## REVISION HISTORY

| Version | Date | Description of Changes | Author |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026/09/10 | Initial Product Backlog document based on system requirements & architecture | Team C1SE.78 |

---

## PROJECT INFORMATION

| Project acronym | EZ-Space | | |
| :--- | :--- | :--- | :--- |
| **Project Title** | The Smart Parking Space Search and Capacity Optimization Platform | | |
| **Start Date** | 21 Aug 2026 | **End Date** | 06 Dec 2026 |
| **Lead Institution** | International School, Duy Tan University | | |
| **Project Mentor** | Pham Thanh Dat, M.Sc. | | |
| **Project Manager & contact details** | Pham Van Nhat  <br>Email: nhatpv.dtu@gmail.com  <br>Tel: 09xx-xxx-xxx | | |
| **Partner Organization** | Duy Tan University Software Center | | |
| **Project Web URL** | https://ezspace.vercel.app | | |

### Team Members Details

| Student ID | Name | Role | Email | Tel |
| :--- | :--- | :--- | :--- | :--- |
| 272112xxxxx | Pham Van Nhat | Team Leader / Product Owner / Backend | nhatpv.dtu@gmail.com | 09xx-xxx-xxx |
| 272112xxxxx | Pham Thuan Hoang | Backend Developer | hoangpt.dtu@gmail.com | 09xx-xxx-xxx |
| 272112xxxxx | Pham Van Huy | Frontend / DevOps Engineer | huypv.dtu@gmail.com | 09xx-xxx-xxx |
| 272112xxxxx | Pham Tran Vu Thai | Frontend / Scrum Master / QA | thaipv.dtu@gmail.com | 09xx-xxx-xxx |

---

## SIGNATURE & DOCUMENT APPROVALS

The following signatures are required for formal approval of this document:

| Role | Full Name | Signature | Date |
| :--- | :--- | :--- | :--- |
| **Mentor** | Pham Thanh Dat, M.Sc. | | |
| **Scrum Master** | Pham Tran Vu Thai | | |
| **Product Owner** | Pham Van Nhat | | |
| **Team Member** | Pham Thuan Hoang | | |
| **Team Member** | Pham Van Huy | | |

---

## TABLE OF CONTENTS

- [1. Sprint 1: System Foundation, Authentication & Multi-Tenant Setup](#1-sprint-1-system-foundation-authentication--multi-tenant-setup)
  - [1.1. User Story 1: User Registration & Profile Management](#11-user-story-1-user-registration--profile-management)
  - [1.2. User Story 2: Secure JWT Authentication & OTP Password Recovery](#12-user-story-2-secure-jwt-authentication--otp-password-recovery)
  - [1.3. User Story 3: Customer Vehicle Management](#13-user-story-3-customer-vehicle-management)
  - [1.4. User Story 4: Parking Lot Registration & Profile Configuration](#14-user-story-4-parking-lot-registration--profile-configuration)
  - [1.5. User Story 5: 2D Parking Slot Matrix & Classification Builder](#15-user-story-5-2d-parking-slot-matrix--classification-builder)
- [2. Sprint 2: Parking Discovery, Real-time 2D Map & Concurrency Reservation Engine](#2-sprint-2-parking-discovery-real-time-2d-map--concurrency-reservation-engine)
  - [2.1. User Story 6: Parking Lot Search & Multi-criteria Filtering](#21-user-story-6-parking-lot-search--multi-criteria-filtering)
  - [2.2. User Story 7: Real-time 2D Visual Slot Map Display](#22-user-story-7-real-time-2d-visual-slot-map-display)
  - [2.3. User Story 8: Rule-based Smart Slot Recommendation](#23-user-story-8-rule-based-smart-slot-recommendation)
  - [2.4. User Story 9: High-Concurrency Slot Holding Engine with Conflict Lock](#24-user-story-9-high-concurrency-slot-holding-engine-with-conflict-lock)
  - [2.5. User Story 10: Automated Background Worker for Expired Hold Release](#25-user-story-10-automated-background-worker-for-expired-hold-release)
- [3. Sprint 3: Payment Gateway, Dynamic QR Ticketing & Kiosk Gate Operations](#3-sprint-3-payment-gateway-dynamic-qr-ticketing--kiosk-gate-operations)
  - [3.1. User Story 11: Sandbox Deposit Payment Integration](#31-user-story-11-sandbox-deposit-payment-integration)
  - [3.2. User Story 12: Cryptographic Dynamic QR Ticket Issuance](#32-user-story-12-cryptographic-dynamic-qr-ticket-issuance)
  - [3.3. User Story 13: Kiosk Scan-In Check-In Terminal](#33-user-story-13-kiosk-scan-in-check-in-terminal)
  - [3.4. User Story 14: Kiosk Scan-Out Settle & Release Terminal](#34-user-story-14-kiosk-scan-out-settle--release-terminal)
  - [3.5. User Story 15: Automated No-Show Forfeiture Worker](#35-user-story-15-automated-no-show-forfeiture-worker)
- [4. Sprint 4: Conversational AI Assistant, Manager Analytics & Operations](#4-sprint-4-conversational-ai-assistant-manager-analytics--operations)
  - [4.1. User Story 16: Conversational AI Assistant for Parking Recommendations](#41-user-story-16-conversational-ai-assistant-for-parking-recommendations)
  - [4.2. User Story 17: Booking History, Directions & Active Session Monitoring](#42-user-story-17-booking-history-directions--active-session-monitoring)
  - [4.3. User Story 18: Booking Cancellation & Grace Period Deposit Refund](#43-user-story-18-booking-cancellation--grace-period-deposit-refund)
  - [4.4. User Story 19: Parking Manager Occupancy & Revenue Analytics](#44-user-story-19-parking-manager-occupancy--revenue-analytics)
  - [4.5. User Story 20: System Administration, Audit Logs & Simulation Controls](#45-user-story-20-system-administration-audit-logs--simulation-controls)

---

## 1. Sprint 1: System Foundation, Authentication & Multi-Tenant Setup

### 1.1. User Story 1: User Registration & Profile Management
**As a** customer/driver,  
**I want to** register an account and manage my personal profile information,  
**So that** I can access the parking booking platform and manage my activities.

- **Acceptance Criteria:**
  - Users can create an account by providing Full Name, Email, Phone Number, and Password.
  - The system validates unique email and phone number formats before persisting to the database.
  - Passwords must be securely hashed using BCrypt (salt rounds >= 10).
  - Users can update their personal information (full name, phone number, avatar URL).
  - The system provides confirmation feedback upon successful account creation and profile update.
- **Severity:** High
- **Estimation Points:** 5

---

### 1.2. User Story 2: Secure JWT Authentication & OTP Password Recovery
**As a** registered user (customer, manager, admin),  
**I want to** log in securely using JWT tokens and reset my password via email OTP,  
**So that** my account remains protected while maintaining convenient password recovery.

- **Acceptance Criteria:**
  - Users can authenticate with registered email and password to receive a signed JWT token.
  - The system implements role-based access control (RBAC: `customer`, `manager`, `admin`).
  - Unauthenticated requests to protected endpoints return `401 Unauthorized`.
  - Users who forgot their password can request a 6-digit verification OTP sent via email (Gmail SMTP).
  - OTP expires after 5 minutes and can only be verified once to prevent brute-force attacks.
  - Users can successfully set a new password upon providing a valid, verified OTP code.
- **Severity:** High
- **Estimation Points:** 8

---

### 1.3. User Story 3: Customer Vehicle Management
**As a** customer/driver,  
**I want to** add, view, update, and remove vehicles in my personal garage,  
**So that** the system can recommend appropriate parking slots matching my vehicle specifications.

- **Acceptance Criteria:**
  - Customers can add one or multiple vehicles with License Plate, Vehicle Type (`Sedan`, `SUV`, `EV`), and Brand/Model.
  - The system validates license plate format and enforces uniqueness per customer.
  - Customers can set one vehicle as their primary/default vehicle for quick booking.
  - Customers can edit vehicle details or remove existing vehicles from their profile.
  - Deleting a vehicle currently linked to an active reservation is prevented with an appropriate warning message.
- **Severity:** High
- **Estimation Points:** 3

---

### 1.4. User Story 4: Parking Lot Registration & Profile Configuration
**As a** parking manager,  
**I want to** submit a new parking lot profile with operating hours, location, and pricing policies,  
**So that** my parking facility can be published and discoverable by drivers.

- **Acceptance Criteria:**
  - Managers can create parking lots with Name, Address, Ward/District, Coordinates (Latitude, Longitude), Total Capacity, and Operating Hours.
  - Managers can configure flexible pricing rules: Base hourly rate and peak-hour surcharges.
  - Newly submitted parking lots default to `pending` status until reviewed and approved by System Admin.
  - Managers can toggle their lot status between `active` and `inactive` (e.g., temporary maintenance).
  - Form validation prevents invalid time ranges or negative pricing values.
- **Severity:** High
- **Estimation Points:** 8

---

### 1.5. User Story 5: 2D Parking Slot Matrix & Classification Builder
**As a** parking manager,  
**I want to** design the 2D layout matrix of parking slots and designate slot types,  
**So that** drivers can visualize the physical layout and reserve spots that fit their vehicles.

- **Acceptance Criteria:**
  - Managers can define slot identifiers (e.g., A-01, B-02) and specify row/column matrix coordinates.
  - Managers can assign specialized slot types: `standard`, `ev_charging`, `large` (SUV), and `disabled`.
  - Each slot can be set with an initial status (`available` or `unavailable`).
  - The system prevents duplicate slot codes within the same parking lot.
  - The platform provides a visual preview of the configured 2D slot grid.
- **Severity:** High
- **Estimation Points:** 8

---

## 2. Sprint 2: Parking Discovery, Real-time 2D Map & Concurrency Reservation Engine

### 2.1. User Story 6: Parking Lot Search & Multi-criteria Filtering
**As a** customer/driver,  
**I want to** search and filter parking lots by location keyword, district, vehicle type, and available spaces,  
**So that** I can quickly find the most suitable parking location near my destination.

- **Acceptance Criteria:**
  - Drivers can search lots by name, address keyword, or select specific districts from a filter dropdown.
  - The search results display total capacity, number of currently available slots, distance, and base price.
  - Drivers can filter lots that specifically support their vehicle type (`Sedan`, `SUV`, `EV`).
  - API response time for parking search returns within 500ms under standard load.
  - The system displays a friendly empty state if no parking lots match the selected search criteria.
- **Severity:** High
- **Estimation Points:** 5

---

### 2.2. User Story 7: Real-time 2D Visual Slot Map Display
**As a** customer/driver,  
**I want to** view an interactive 2D floor plan of parking slots color-coded by real-time status,  
**So that** I can intuitively inspect slot positions and choose a preferred spot.

- **Acceptance Criteria:**
  - The 2D map renders all slots in grid rows/columns reflecting the physical parking layout.
  - Slots are clearly differentiated by status colors: 🟢 Green (`available`), 🟡 Yellow (`holding`), and 🔴 Red (`occupied`).
  - Special attributes such as EV charging icons and disabled parking signs are clearly rendered on applicable slots.
  - Clicking on an `available` slot displays its detail card (Slot code, type, hourly rate, and "Hold Spot" button).
  - Slots with `holding` or `occupied` status are disabled and cannot be selected.
- **Severity:** High
- **Estimation Points:** 8

---

### 2.3. User Story 8: Rule-based Smart Slot Recommendation
**As a** customer/driver,  
**I want** the system to automatically recommend the most suitable parking slot for my vehicle,  
**So that** I do not have to manually browse and evaluate slots on the map.

- **Acceptance Criteria:**
  - The recommendation engine inspects the driver's selected vehicle type before suggesting a slot.
  - EVs are prioritized for `ev_charging` slots; SUVs are assigned to `large` slots; Sedans are routed to `standard` slots.
  - When multiple slots match, the engine selects the slot closest to the entrance/elevator.
  - Recommended slot is visually highlighted with an animated badge on the 2D map.
  - The user has the freedom to accept the recommendation or manually choose another available slot.
- **Severity:** Medium
- **Estimation Points:** 5

---

### 2.4. User Story 9: High-Concurrency Slot Holding Engine with Conflict Lock
**As a** customer/driver,  
**I want to** hold a chosen parking spot for 10 minutes while completing deposit payment,  
**So that** no other driver can reserve or book the same spot simultaneously.

- **Acceptance Criteria:**
  - When a user clicks "Hold Spot", the system acquires a distributed lock (via Redis / DB transaction).
  - If another user attempts to hold the same spot concurrently, the system rejects the second request with `409 Conflict`.
  - Upon successful hold, the slot status immediately transitions from `available` to `holding`.
  - A reservation record is created with status `holding` and an exact 10-minute countdown timestamp (`holding_expires_at`).
  - The user interface displays a dynamic 10-minute countdown timer and payment redirect button.
- **Severity:** High
- **Estimation Points:** 13

---

### 2.5. User Story 10: Automated Background Worker for Expired Hold Release
**As a** system administrator / parking manager,  
**I want** an automated background scheduler to release slots whose 10-minute hold has expired,  
**So that** abandoned spots become immediately available for other drivers.

- **Acceptance Criteria:**
  - A background scheduled task executes periodically every 30 seconds.
  - The worker queries all reservations in `holding` status where `holding_expires_at < NOW()`.
  - Expired reservations are updated to status `cancelled`.
  - Associated parking slots are atomically updated back to `available` (Green).
  - The release operation logs audit events and maintains database consistency without blocking user requests.
- **Severity:** High
- **Estimation Points:** 8

---

## 3. Sprint 3: Payment Gateway, Dynamic QR Ticketing & Kiosk Gate Operations

### 3.1. User Story 11: Sandbox Deposit Payment Integration
**As a** customer/driver,  
**I want to** pay a required reservation deposit through a sandbox payment gateway (VNPay/MoMo),  
**So that** my parking reservation is confirmed and guaranteed before I depart.

- **Acceptance Criteria:**
  - Users can initiate deposit payment from the reservation countdown screen.
  - The system creates a pending payment transaction and redirects to the VNPay Sandbox payment gateway.
  - Payment callback and IPN webhooks verify HMAC-SHA256 digital signatures to prevent tampering.
  - Upon successful payment:
    - Payment status changes to `success`.
    - Reservation status changes to `paid`.
    - A 20-minute arrival grace period countdown is triggered (`arrival_deadline = NOW() + 20 minutes`).
  - If payment fails or is cancelled, the user is notified with options to retry before the 10-minute hold expires.
- **Severity:** High
- **Estimation Points:** 13

---

### 3.2. User Story 12: Cryptographic Dynamic QR Ticket Issuance
**As a** customer/driver,  
**I want to** receive an encrypted dynamic QR code ticket after paying the deposit,  
**So that** I can present it at the parking gate kiosk for touchless entry.

- **Acceptance Criteria:**
  - Upon deposit payment confirmation, the system generates a unique QR ticket payload.
  - The QR payload contains signed, encrypted data including Reservation ID, License Plate, Slot Code, and Expiry Timestamp.
  - The customer can access the QR ticket screen (`/ve/[id]`) showing the live QR code, slot location, and arrival countdown.
  - The QR ticket includes a dynamic visual indicator to prevent static screenshot counterfeiting.
  - The ticket displays explicit arrival instructions and warning of deposit forfeiture after 20 minutes of no-show.
- **Severity:** High
- **Estimation Points:** 5

---

### 3.3. User Story 13: Kiosk Scan-In Check-In Terminal
**As a** parking manager / kiosk attendant,  
**I want to** scan customer QR tickets at the parking entrance gate,  
**So that** I can authenticate arriving drivers, open the barrier, and register vehicle entry.

- **Acceptance Criteria:**
  - Kiosk terminal provides an API endpoint `POST /api/kiosk/scan-in` receiving the scanned QR ticket string.
  - The system verifies ticket authenticity, active status, matching license plate, and validity window.
  - Upon successful verification:
    - Reservation status changes to `entered`.
    - Associated slot on the 2D map immediately transitions from Yellow (`holding`) to 🔴 Red (`occupied`).
    - An active `parking_session` record is created logging the exact entry timestamp.
  - If the QR ticket is expired, already used, or cancelled, the kiosk displays a clear error warning and denies entry.
- **Severity:** High
- **Estimation Points:** 8

---

### 3.4. User Story 14: Kiosk Scan-Out Settle & Release Terminal
**As a** parking manager / kiosk attendant,  
**I want to** scan customer QR tickets at the parking exit gate,  
**So that** the system calculates parking duration, settles remaining fees, and releases the slot.

- **Acceptance Criteria:**
  - Kiosk terminal provides an API endpoint `POST /api/kiosk/scan-out` to scan the departing driver's ticket.
  - The system calculates actual parking duration (`exit_time - entry_time`) based on the lot's hourly fee schedule.
  - The system automatically deducts the prepaid deposit and computes any remaining balance due.
  - Once payment is settled:
    - The parking session status is updated to `completed`.
    - The slot status immediately reverts from 🔴 Red (`occupied`) to 🟢 Green (`available`).
    - Reservation status is marked as `completed`.
  - The kiosk displays summary receipt details: Entry time, exit time, total duration, and final bill.
- **Severity:** High
- **Estimation Points:** 8

---

### 3.5. User Story 15: Automated No-Show Forfeiture Worker
**As a** parking manager,  
**I want** the system to automatically cancel reservations and forfeit deposits if drivers fail to arrive within 20 minutes,  
**So that** slots are not blocked indefinitely by absent customers.

- **Acceptance Criteria:**
  - The background worker checks for `paid` reservations where `arrival_deadline < NOW()` and vehicle has not entered.
  - Unclaimed reservations are transitioned to status `forfeited`.
  - Prepaid deposit is retained by the parking facility according to the cancellation policy.
  - The reserved parking slot is atomically restored to `available` (Green) for other customers.
  - An automated notification/email is dispatched to the customer informing them of the forfeited reservation.
- **Severity:** Medium
- **Estimation Points:** 5

---

## 4. Sprint 4: Conversational AI Assistant, Manager Analytics & Operations

### 4.1. User Story 16: Conversational AI Assistant for Parking Recommendations
**As a** customer/driver,  
**I want to** chat with an AI assistant using natural language to discover parking lots and inquire about policies,  
**So that** I can get fast, personalized parking recommendations without navigating multiple menus.

- **Acceptance Criteria:**
  - Drivers can type natural language inquiries (e.g., *"Find me an EV parking spot with charging near Hai Chau district under 20k/hr"*).
  - The AI assistant parses intent, queries live parking lot availability, and returns structured card previews.
  - Cards include direct links to view the 2D layout and initiate booking.
  - Conversation history is saved per user (`GET /api/chat/history`) and persists across browser sessions.
  - Quick reply suggestion chips are provided to facilitate common driver inquiries.
- **Severity:** Medium
- **Estimation Points:** 8

---

### 4.2. User Story 17: Booking History, Directions & Active Session Monitoring
**As a** customer/driver,  
**I want to** review my historical parking sessions, inspect active bookings, and get directions to the lot,  
**So that** I can easily navigate to my reserved spot and track my parking expenses.

- **Acceptance Criteria:**
  - The `/lich-su` screen lists all past and ongoing reservations categorized by status (`holding`, `paid`, `entered`, `completed`, `cancelled`).
  - Drivers can view full details for each booking: Lot address, slot code, timestamps, and payment breakdown.
  - Drivers can launch Google Maps / Map directions directly from the active reservation card.
  - An active banner is prominently displayed on the homepage while a reservation or parking session is ongoing.
- **Severity:** Low
- **Estimation Points:** 5

---

### 4.3. User Story 18: Booking Cancellation & Grace Period Deposit Refund
**As a** customer/driver,  
**I want to** cancel my reservation within the allowable grace period and receive a deposit refund,  
**So that** I am not penalized if my travel schedule unexpectedly changes.

- **Acceptance Criteria:**
  - Drivers can initiate cancellation from the active reservation screen before entering the lot.
  - If cancelled within the eligible grace window, the system marks the reservation as `refunded` and issues a refund record.
  - If cancelled after the grace window expires, the system displays the penalty policy before user confirmation.
  - Upon confirmed cancellation, the reserved slot is immediately freed and restored to `available` (Green).
  - The customer receives confirmation of the cancellation and refund status.
- **Severity:** Medium
- **Estimation Points:** 5

---

### 4.4. User Story 19: Parking Manager Occupancy & Revenue Analytics
**As a** parking manager,  
**I want to** view dashboard analytics on occupancy rates, revenue metrics, and peak traffic hours,  
**So that** I can make data-driven decisions to optimize pricing and lot capacity.

- **Acceptance Criteria:**
  - Managers can view a centralized analytics dashboard covering all lots under their management.
  - Metrics include: Real-time occupancy percentage, total daily/weekly revenue, total vehicles served, and peak turnover hours.
  - Visual charts illustrate hourly occupancy trends and revenue distribution between standard and EV slots.
  - Managers can filter analytics data by date ranges (Today, Past 7 days, Past 30 days, Custom range).
  - Data can be exported to CSV/Excel format for bookkeeping and reporting.
- **Severity:** Low
- **Estimation Points:** 8

---

### 4.5. User Story 20: System Administration, Audit Logs & Simulation Controls
**As a** system administrator,  
**I want to** manage user privileges, review audit logs, and trigger simulation test cases,  
**So that** I can maintain platform integrity and demonstrate system behavior during capstone evaluation.

- **Acceptance Criteria:**
  - Admins can view and manage all registered users, with capabilities to activate, deactivate, or ban accounts.
  - Admins can audit all managerial actions and payment transaction logs.
  - The platform provides a simulation endpoint (`POST /api/cron/simulate-expire`) to simulate 10-minute hold and 20-minute no-show expirations on demand for capstone demonstration.
  - System health endpoint `GET /api/health` monitors database connection pool, Redis cache, and background worker status.
- **Severity:** Low
- **Estimation Points:** 5

---

## 5. PRODUCT BACKLOG SUMMARY & METRICS

| Sprint | Focus Area | Total User Stories | Total Story Points |
| :--- | :--- | :---: | :---: |
| **Sprint 1** | Foundation, Auth, Vehicle & Multi-tenant Layout Setup | 5 | 29 |
| **Sprint 2** | Discovery, 2D Floor Plan, Concurrency Lock & 10m Hold | 5 | 39 |
| **Sprint 3** | Payment Gateway, Dynamic QR Ticket & Kiosk Terminals | 5 | 42 |
| **Sprint 4** | AI Assistant, History/Refunds, Manager Analytics & Admin Controls | 5 | 31 |
| **TOTAL** | **Full Product Scope (Agile Scrum)** | **20** | **141** |

### Story Points Breakdown by Role / Persona
- **Customer / Driver Stories:** 10 User Stories (68 Story Points)
- **Parking Manager Stories:** 6 User Stories (45 Story Points)
- **System Admin / Scheduler Stories:** 4 User Stories (28 Story Points)
