# Warranty V1 Phase 0 Audit Report

> **Status:** AUDIT COMPLETE  
> **Target Spec:** `docs/SERVIO_WARRANTY_V1_LOCKED_MASTER_PHASED_IMPLEMENTATION_PROMPT.md`  
> **Scope:** Provider + Worker + Customer Only (Excluding CEO / Admin / Operations redesign)  
> **Date:** 2026-09-24  
> **Branch:** master  

---

## 1. Audit Metadata
- **Auditor:** Antigravity AI Coding Agent
- **Repository:** SERVIO Web Application (`servio_web`)
- **Workspace Directory:** `d:\website latihan\servio_web`
- **Execution Date:** 2026-09-24T04:22:26+07:00
- **Canonical Specification:** `docs/SERVIO_WARRANTY_V1_LOCKED_MASTER_PHASED_IMPLEMENTATION_PROMPT.md`
- **Objective:** Exhaustive forensic audit of the existing codebase to identify implemented components, reusable domain/repository logic, legacy artifacts, architectural conflicts, and produce an implementation-ready roadmap for Phase 1 through Phase 8.

---

## 2. Locked Spec Verification
- **LOCKED SPEC PATH:** `docs/SERVIO_WARRANTY_V1_LOCKED_MASTER_PHASED_IMPLEMENTATION_PROMPT.md`
- **LOCKED SPEC FOUND:** YES
- **LOCKED SPEC READ COMPLETELY:** YES (3,179 lines verified)
- **Key Locked Business Rules Verified:**
  1. **Canonical Navigation Structure:**
     - Provider: `GARANSI` -> `Garansi` (`/provider/warranty`) & `Pengajuan Garansi` (`/provider/warranty/requests`)
     - Worker: `GARANSI` -> `Garansi` (`/worker/warranty`)
     - Customer: `Pesanan` -> `Pesanan` (`/orders`) & `Garansi` (`/warranties`)
  2. **Provider 3 Decisions Exclusivity:**
     - `✓ Setujui Perbaikan Garansi` (COVERED)
     - `Rp Ajukan Pekerjaan Berbayar` (NOT COVERED -> Commercial Proposal)
     - `↻ Minta Informasi Tambahan` (MORE INFO)
     - *No 4th decision* (e.g., "Tidak Dikerjakan" or "Tolak Tanpa Pengerjaan").
  3. **Paid Work Separation & Order Immutability:**
     - Original completed order is an immutable financial record.
     - Paid work generates a brand-new linked `ServiceOrder` (`isPaidWork: true`, `parentWarrantyClaimId`, `originalServiceOrderId`).
     - Customer alone authorizes paid work; customer rejection safely terminates paid work without mutating the original order.
  4. **One Active Claim Rule:**
     - Exactly one active claim per warranty at any given time.
  5. **Exclusive Commercial Ownership:**
     - Worker never determines warranty coverage or final pricing.
     - Worker only submits technical diagnosis and recommendations.

---

## 3. Repository / Tech Stack Snapshot
- **Framework:** Next.js `16.3.5` (App Router)
- **React Runtime:** React `19.2.8` & React-DOM `19.2.8`
- **Styling:** Tailwind CSS `^4.0.0` with `@tailwindcss/postcss`, Phosphor Icons (`@phosphor-icons/react` `^2.1.10`), Framer Motion `^13.4.0`
- **Language / Typing:** TypeScript `^5.0.0` (ESNext / Bundler resolution)
- **Forms & Validation:** Zod `^4.6.5`, React Hook Form `^7.88.0`
- **Architecture Pattern:** In-memory reactive repository pattern (`DomainRepository`) with unified fixture graph (`src/mocks/warranties.ts`) and React hooks layer (`useWarranties.ts`, `useServiceOrder.ts`, `useActiveRole.ts`).

---

## 4. Route Audit

### 4.1 Route Matrix

| Role | Route | Existing File | Current Purpose | Status & Gap | Recommended Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Provider** | `/provider/warranty` | `src/app/(business)/provider/warranty/page.tsx` | Warranty Store configuration (toggle, durations, service config, pending activation) | Implemented with full UI and mutations. Minor gap: UI styling aligns with older theme. | **KEEP / REFACTOR** (Phase 2) |
| **Provider** | `/provider/warranties` | `src/app/(business)/provider/warranties/page.tsx` | Alias redirecting to `../warranty/page` | Duplicate route wrapper. | **DEPRECATE LATER** (Phase 2) |
| **Provider** | `/provider/warranty/requests` | `src/app/(business)/provider/warranty/requests/page.tsx` | Warranty claim operations center (review, assignment, 3 decisions, proof review) | High gap: Uses 6 legacy filter groups instead of locked 7 groupings. | **MODIFY** (Phase 3) |
| **Provider** | `/provider/services` | `src/app/(business)/provider/services/page.tsx` | Service catalog management with warranty duration selector | Implemented with dynamic duration dropdown from active provider durations. | **KEEP** (Phase 2) |
| **Worker** | `/worker/warranty` | `src/app/(business)/worker/warranty/page.tsx` | Worker warranty job execution (check-in, diagnosis, completion proof) | Implemented. Gap: Collapses Start/OTW directly into Check-in; lacks standalone OTW stage. | **MODIFY** (Phase 4) |
| **Customer** | `/orders` | `src/app/(customer)/orders/page.tsx` | Customer orders list with top tab to Garansi | Implemented with top tabs `[Pesanan]` and `[Garansi]`. | **KEEP** (Phase 5) |
| **Customer** | `/warranties` | `src/app/(customer)/warranties/page.tsx` | Customer warranty center (active, pending, expired, claims, proposals) | Implemented with unified top tabs and responsive cards. | **KEEP** (Phase 5) |
| **Customer** | `/warranties/[warrantyId]` | `src/app/(customer)/warranties/[warrantyId]/page.tsx` | Warranty digital certificate detail, QR code, claim submission modal, customer-safe timeline | Implemented. Verified customer-safe timeline. | **KEEP** (Phase 5) |
| **Ops Admin** | `/ops/admin/warranties` | `src/app/(ops)/admin/warranties/page.tsx` | Platform operations warranty monitoring and SLA tracking | Implemented for Operations role. Out of scope for Warranty V1 provider/worker/customer redesign. | **DO NOT TOUCH** |

---

## 5. Navigation Audit
- **Configuration File:** `src/config/navigation.ts`
- **Provider Navigation (`SERVICE_PROVIDER`):**
  - Section title: `GARANSI` (line 154–155)
  - Items:
    - `Garansi` (`/provider/warranty`, icon: `ShieldCheck`)
    - `Pengajuan Garansi` (`/provider/warranty/requests`, icon: `ClipboardText`)
  - Status: **Matches locked spec exactly.** Canonical flat navigation is in place.
- **Worker Navigation (`WORKER_TECHNICIAN`):**
  - Section title: `GARANSI` (line 194–195)
  - Items:
    - `Garansi` (`/worker/warranty`, icon: `ShieldCheck`)
  - Status: **Matches locked spec exactly.**
- **Customer Navigation (`CUSTOMER`):**
  - Mobile: Handled via `BottomNav.tsx` (`/orders` with unified `isItemActive` supporting `/warranties`).
  - Desktop: Handled via `Navbar.tsx` (`/orders` with `isOrdersActive` supporting `/warranties`).
  - Status: **Matches locked spec exactly.**

---

## 6. Provider Warranty Store Audit (`/provider/warranty`)
- **File:** `src/app/(business)/provider/warranty/page.tsx` (611 lines)
- **Features Implemented:**
  1. **Warranty Store Status:** Toggle active/inactive with warning banner and disabled state explanation.
  2. **Active Durations List:** Displays configured durations (30, 45, 60 days).
  3. **Add Duration Modal:** Adds positive integer duration with duplicate prevention.
  4. **Archive Duration Action:** Soft-archives duration without mutating historical warranties.
  5. **Service Warranty Configuration:** Modal allowing selection of active duration for each master service.
  6. **Pending Activation List:** Displays completed orders awaiting warranty grant with `Aktifkan Garansi` button.
  7. **Operation Center Link Banner:** Top gradient banner linking to `/provider/warranty/requests` with pending claims counter badge.
- **Data Source:** Connected directly to `useWarranties()` and `DomainRepository`.
- **Finding:** Durations are dynamic and driven by `ProviderWarrantyDuration` models, NOT hardcoded.

---

## 7. Provider Services / ServiceCard Audit
- **Component:** `src/components/features/services/ServiceCard.tsx`
  - Badge: `✓ Garansi Tersedia` is conditionally rendered at line 54–58 when `hasWarranty` is true.
  - Duration display: Currently only shows the badge without explicit days text on the card thumbnail.
- **Page / Modal:** `src/app/(business)/provider/services/page.tsx`
  - `Tambah Layanan` modal: Includes dynamic dropdown mapping over `activeDurations` from `repo.getProviderWarrantyDurations(currentProviderId)`.
  - `Edit Layanan` modal: Includes dynamic dropdown mapping over `activeDurations`.
  - Store OFF handling: Displays warning message informing the provider to activate Warranty Store first.
  - Persistence: Calls `repo.configureServiceWarranty()`, which updates `serviceWarrantyConfigs` reactively.

---

## 8. Provider Pengajuan Garansi Audit (`/provider/warranty/requests`)
- **File:** `src/app/(business)/provider/warranty/requests/page.tsx` (1,535 lines)
- **Current Tab Filtering Concept:**
  - `ALL` (Semua)
  - `ACTION_NEEDED` (Perlu Tindakan)
  - `IN_PROGRESS` (Sedang Ditangani)
  - `WAITING_DECISION` (Menunggu Keputusan)
  - `WAITING_CUSTOMER` (Menunggu Customer)
  - `COMPLETED` (Selesai)
- **Locked Spec Requirement Conflict (HIGH):**
  - The locked spec specifies **7 canonical request groupings**:
    1. `Perlu Tindakan` (Claim baru diajukan customer / perlu ditinjau awal: `SUBMITTED`)
    2. `Sudah Ditindak` (Claim sudah disetujui untuk pemeriksaan & menunggu Worker ditugaskan: `UNDER_REVIEW`)
    3. `Sedang Berjalan` (Worker ditugaskan, terjadwal, OTW, check-in, pemeriksaan: `INSPECTION_ASSIGNED`, `INSPECTION_SCHEDULED`, `INSPECTION_IN_PROGRESS`)
    4. `Hasil` (Worker sudah submit diagnosis: `DIAGNOSIS_SUBMITTED`, `WAITING_PROVIDER_DECISION`)
    5. `Pengerjaan` (Perbaikan garansi disetujui: `REPAIR_APPROVED`, `REPAIR_SCHEDULED`, `REPAIR_IN_PROGRESS`)
    6. `Menunggu Pembayaran` (Proposal pekerjaan berbayar dikirim ke customer: `PROPOSAL_SENT`, `WAITING_CUSTOMER_APPROVAL`)
    7. `Selesai` (`RESOLVED`, `REJECTED`, `DISPUTED`)
  - **Resolution Plan:** In Phase 3, align the filter tab bar and category mapping functions to exactly match these 7 locked groupings.

---

## 9. Provider Card Flow Audit
- **Card Rendering in `requests/page.tsx`:**
  - Renders unified cards mapped over `filteredClaims`.
  - Card fields present:
    - Status Badge & Claim ID (`#CLM-...`)
    - Service Title & Category
    - Customer Name & Contact
    - Assigned Worker Name
    - Original Order ID (`#SRV-...`)
    - Scheduled Date & Time Slot
    - Problem Summary / Customer Complaint
    - Dynamic Contextual Primary CTA (e.g., "Tugaskan Teknisi", "Buat Keputusan", "Tinjau Bukti Selesai", "Kirim Proposal")
    - Secondary CTA ("Detail Kasus")
- **Data Source:** Connected directly to `claimsV1` in `useWarranties()` (shared reactive domain state).
- **Finding:** No disconnected fake arrays found; all cards are derived from the unified claim repository.

---

## 10. Provider Detail / Stepper Audit
- **Detail Modal in `requests/page.tsx`:** Lines 750–1200.
- **Section Order:**
  - Case Header & Badges
  - Customer & Service Info
  - Original Order Reference
  - Assignment & Schedule Cards
  - 10-Step Visual Stepper (`calculateStepperStage`):
    1. Pengajuan (`SUBMITTED`)
    2. Review Provider (`UNDER_REVIEW`)
    3. Teknisi Ditugaskan (`INSPECTION_ASSIGNED`)
    4. Jadwal Pemeriksaan (`INSPECTION_SCHEDULED`)
    5. Teknisi Datang / Check-in (`IN_PROGRESS`)
    6. Pemeriksaan Unit
    7. Diagnosis Diserahkan (`DIAGNOSIS_SUBMITTED`)
    8. Keputusan Provider (`WAITING_PROVIDER_DECISION`)
    9. Perbaikan / Eksekusi (`REPAIR_APPROVED` / `REPAIR_IN_PROGRESS`)
    10. Selesai (`RESOLVED`)
  - Technical Diagnosis Breakdown (Findings, Diagnosis, Condition, Recommended Action, Evidence Photos)
  - 3 Decision Buttons
  - Commercial Proposal Breakdown (Line items, fees, total, reason)
  - Completion Proof Viewer (Before & After photos, notes)
  - Timeline & Audit Trail

---

## 11. Worker Audit (`/worker/warranty`)
- **File:** `src/app/(business)/worker/warranty/page.tsx` (1,015 lines)
- **Top Tabs:**
  - `[Tugas Garansi]` (Active assignments)
  - `[Riwayat Garansi]` (Completed / resolved assignments)
- **Filter Chips:**
  - `Semua` (`ALL`)
  - `Mendatang` (`UPCOMING`)
  - `Hari Ini` (`TODAY`)
  - `Sedang Berjalan` (`IN_PROGRESS`)
  - `Menunggu Provider` (`WAITING_PROVIDER`)
  - `Selesai` (`COMPLETED`)
- **Execution Actions:**
  - `Mulai Penanganan`: Performs `handleCheckIn(assignment)`.
  - `Isi Diagnosis`: Opens diagnosis modal.
  - `Ajukan Rekomendasi Berbayar`: Opens paid work technical recommendation modal.
  - `Unggah Bukti Selesai`: Opens completion proof submission modal with Before & After image uploads.
- **Finding / Gap (MEDIUM):**
  - The worker interface combines `Mulai Penanganan` and `Check-in` into one single button click. The locked spec expects an explicit `OTW` state prior to `Check-in`.
  - **Resolution Plan:** In Phase 4, introduce the explicit intermediate `Mulai Penanganan (OTW)` -> `Check-in (Di Lokasi)` flow.

---

## 12. Customer Audit (`/orders`, `/warranties`, `/warranties/[warrantyId]`)
- **Routes & UI:**
  - `/orders`: Displays orders with active Top Nav `[Pesanan]` (with service/product filters) and link to `[Garansi]`.
  - `/warranties`: Displays customer warranty catalog with Top Nav `[Pesanan]` and `[Garansi]` (active).
    - Segment chips: `Aktif`, `Menunggu Aktivasi`, `Habis`, `Riwayat Klaim`.
    - Pending Paid Work Proposal card: Fully interactive (Approve -> creates linked order; Reject -> halts work).
    - Claim in-progress card: Shows visit schedule, worker name, and link to tracker.
    - Warranty list cards: Shows status, expiry date, provider name, worker name, claim count.
  - `/warranties/[warrantyId]`: Digital certificate detail, QR code, claim submission modal, customer-safe timeline.
- **Finding:**
  - Customer interface is fully functional, type-safe, and connected to the shared domain state.

---

## 13. Domain Model / State Machine Audit

### 13.1 Canonical Status Enums (`src/types/domain.ts`)
- **Warranty Status (`WarrantyV1Status`):**
  `PENDING_ACTIVATION` | `ACTIVE` | `EXPIRED`
- **Claim Status (`WarrantyClaimStatus`):**
  `SUBMITTED` | `UNDER_REVIEW` | `INSPECTION_ASSIGNED` | `INSPECTION_SCHEDULED` | `INSPECTION_IN_PROGRESS` | `DIAGNOSIS_SUBMITTED` | `WAITING_PROVIDER_DECISION` | `REPAIR_APPROVED` | `REPAIR_SCHEDULED` | `REPAIR_IN_PROGRESS` | `RESOLVED` | `REJECTED` | `DISPUTED`
- **Assignment Status (`WarrantyAssignmentStatus`):**
  `UNSCHEDULED` | `SCHEDULED` | `IN_PROGRESS` | `COMPLETED` | `CANCELLED` | `RESCHEDULED`
- **Assignment Type (`WarrantyAssignmentType`):**
  `INSPECTION` | `REPAIR`
- **Paid Work Status (`WarrantyPaidWorkStatus`):**
  `RECOMMENDED` | `INFO_REQUIRED` | `PROVIDER_REJECTED` | `PROPOSAL_SENT` | `CUSTOMER_APPROVED` | `CUSTOMER_REJECTED` | `AUTHORIZED` | `IN_PROGRESS` | `COMPLETED` | `CANCELLED`

### 13.2 Domain Transition Matrix

| Current State | Action | Actor | Current Next State | Required Next State | Status / Gap |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `PENDING_ACTIVATION` | `grantWarranty` | Provider | `ACTIVE` | `ACTIVE` | **COMPATIBLE** |
| `ACTIVE` | `submitWarrantyClaim` | Customer | `SUBMITTED` | `SUBMITTED` | **COMPATIBLE** (Enforces One Active Claim & Expiry) |
| `SUBMITTED` | `reviewWarrantyClaim (ACCEPT)` | Provider | `UNDER_REVIEW` | `UNDER_REVIEW` | **COMPATIBLE** |
| `SUBMITTED` | `reviewWarrantyClaim (REJECT)` | Provider | `REJECTED` | `REJECTED` | **COMPATIBLE** (Requires reason) |
| `UNDER_REVIEW` | `assignWarrantyWorker (INSPECTION)`| Provider | `INSPECTION_SCHEDULED` | `INSPECTION_SCHEDULED` | **COMPATIBLE** |
| `INSPECTION_SCHEDULED`| `workerStartWarrantyHandling` | Worker | `INSPECTION_IN_PROGRESS` | `INSPECTION_IN_PROGRESS` | **PARTIAL** (OTW intermediate state collapsed) |
| `INSPECTION_IN_PROGRESS`| `workerSubmitWarrantyDiagnosis` | Worker | `WAITING_PROVIDER_DECISION` | `WAITING_PROVIDER_DECISION` | **COMPATIBLE** |
| `WAITING_PROVIDER_DECISION` | `providerDecideCoverage (COVERED)` | Provider | `REPAIR_APPROVED` | `REPAIR_APPROVED` | **COMPATIBLE** |
| `WAITING_PROVIDER_DECISION` | `providerDecideCoverage (NOT_COVERED)` | Provider | `WAITING_PROVIDER_DECISION` + Proposal | `WAITING_PROVIDER_DECISION` + Proposal | **COMPATIBLE** |
| `WAITING_PROVIDER_DECISION` | `providerRequestMoreInfo` | Provider | `WAITING_PROVIDER_DECISION` (flagged) | `WAITING_PROVIDER_DECISION` (flagged) | **COMPATIBLE** |
| `REPAIR_APPROVED` | `assignWarrantyWorker (REPAIR)` | Provider | `REPAIR_SCHEDULED` | `REPAIR_SCHEDULED` | **COMPATIBLE** |
| `REPAIR_SCHEDULED` | `workerCheckInWarranty` | Worker | `REPAIR_IN_PROGRESS` | `REPAIR_IN_PROGRESS` | **COMPATIBLE** |
| `REPAIR_IN_PROGRESS`| `workerSubmitCompletionProof` | Worker | `REPAIR_IN_PROGRESS` (proof SUBMITTED) | `REPAIR_IN_PROGRESS` (proof SUBMITTED) | **COMPATIBLE** |
| Proof `SUBMITTED` | `providerReviewCompletionProof (APPROVE)`| Provider | `RESOLVED` | `RESOLVED` | **COMPATIBLE** (Warranty remains ACTIVE) |
| Proposal `PROPOSAL_SENT`| `customerRespondPaidWorkProposal (APPROVE)`| Customer | Proposal `CUSTOMER_APPROVED` + New Order | Proposal `CUSTOMER_APPROVED` + New Order | **COMPATIBLE** (Immutable original order) |
| Proposal `PROPOSAL_SENT`| `customerRespondPaidWorkProposal (REJECT)` | Customer | Proposal `CUSTOMER_REJECTED`, Claim `REJECTED` | Proposal `CUSTOMER_REJECTED`, Claim `REJECTED` | **COMPATIBLE** (Safe stop, no new order) |
| Claim `REJECTED` | `customerDisputeClaim` | Customer | `DISPUTED` + `DisputeCase` created | `DISPUTED` + `DisputeCase` created | **COMPATIBLE** |

---

## 14. Repository / Domain Function Audit
- **File:** `src/lib/repository/domainRepository.ts` (10,134 lines)
- **Key Methods Verified:**
  1. `grantWarranty(providerId, warrantyId)`: Idempotent snapshot of duration and start/expiry dates.
  2. `submitWarrantyClaim(customerId, warrantyId, data)`: Enforces active status, pre-expiry timestamp, and rejects concurrent claims.
  3. `reviewWarrantyClaim(providerId, claimId, decision, reason)`: Handles initial triage. Rejection requires explicit explanation.
  4. `assignWarrantyWorker(providerId, claimId, data)`: Verifies worker provider membership, capability matching against `providerMasterServiceId`, schedule conflict checks.
  5. `rescheduleWarrantyAssignment(providerId, assignmentId, newSchedule)`: Preserves old assignment as `RESCHEDULED` and links via `rescheduledFromId`.
  6. `workerCheckInWarranty(workerId, assignmentId)`: Sets check-in timestamp and updates assignment & claim to `IN_PROGRESS`.
  7. `workerSubmitWarrantyDiagnosis(workerId, claimId, data)`: Stores technical findings, condition, required material, evidence photos. Worker CANNOT set coverage or pricing.
  8. `providerDecideCoverage(providerId, claimId, isCovered, notes)`: Provider exclusive decision. Sets `coverageDecision` to `COVERED` or `NOT_COVERED`.
  9. `providerRequestMoreInfo(providerId, claimId, notes)`: Flags `infoRequested: true`, logs audit event, notifies worker.
  10. `providerCreatePaidWorkProposal(providerId, requestId, proposalData)`: Creates commercial proposal with itemized materials, labor, platform fee, total amount, reason outside warranty.
  11. `customerRespondPaidWorkProposal(customerId, proposalId, approved, reason)`: Enforces customer ownership. If approved, creates new canonical `ServiceOrder` and `WorkerJob`. If rejected, stops paid work cleanly.
  12. `workerSubmitCompletionProof(workerId, claimId, proofData)`: Stores before/after photos and work summary.
  13. `providerReviewCompletionProof(providerId, proofId, approved, notes)`: Approves completion proof and transitions claim to `RESOLVED`.
  14. `customerDisputeClaim(customerId, claimId, reason)`: Creates canonical `DisputeCase` and transitions claim to `DISPUTED`.
  15. `getWarrantyTimeline(warrantyId, role)`: Returns role-filtered timeline events (filters out private notes and raw telemetry for Customer).

---

## 15. Original Order Immutability Audit
- **Findings:**
  - Audited method: `customerRespondPaidWorkProposal` (lines 9550–9620).
  - When customer approves a paid-work proposal:
    - A new `ServiceOrder` (`ORD-PAID-${Date.now()}`) is generated.
    - The new order explicitly references `parentWarrantyClaimId` and `originalServiceOrderId`.
    - `isPaidWork: true` is attached to the new order.
    - **Original completed order is NEVER reopened, mutated, or re-invoiced.**
    - Original order pricing, completion timestamp, worker records, and completion status remain 100% frozen.
- **Classification:** **COMPLIANT (Zero Mutation Risk)**.

---

## 16. Paid Work Audit
- **End-to-End Trace:**
  1. Worker identifies out-of-warranty condition -> Submits diagnosis & technical recommendation (`workerRecommendPaidWork`).
  2. Provider decides `NOT_COVERED` -> Drafts itemized commercial proposal (`providerCreatePaidWorkProposal`).
  3. Customer receives notification and views proposal card in `/warranties` -> Chooses `Setujui & Buat Order Berbayar` or `Tolak Penawaran`.
  4. If Customer approves:
     - New linked `ServiceOrder` is created in canonical engine.
     - New `WorkerJob` is enqueued for technician.
     - Worker receives `PAID WORK` task badge.
  5. If Customer rejects:
     - Proposal marked `CUSTOMER_REJECTED`.
     - Claim marked `REJECTED`.
     - No worker execution allowed.
     - Original order untouched.
- **Finding:** Flow strictly adheres to Section 2.1 & Section 20 of the locked specification.

---

## 17. Fixture / Mock Audit
- **File:** `src/mocks/warranties.ts` (1,084 lines)
- **Fixtures Verified:**
  - `INITIAL_PROVIDER_WARRANTY_SETTINGS`: Provider store toggle states.
  - `INITIAL_PROVIDER_WARRANTY_DURATIONS`: 30, 45, 60 days.
  - `INITIAL_SERVICE_WARRANTY_CONFIGS`: AC Cleaning (30d), AC Repair (45d), AC Installation (60d), Electrical Repair (30d).
  - `INITIAL_WARRANTIES_V1`: 6 deterministic warranties covering Pending Activation, Active, and Expired states.
  - `INITIAL_WARRANTY_CLAIMS_V1`: Claims covering `SUBMITTED`, `UNDER_REVIEW`, `INSPECTION_SCHEDULED`, `DIAGNOSIS_SUBMITTED`, `WAITING_PROVIDER_DECISION`, `REPAIR_APPROVED`, `REPAIR_IN_PROGRESS`, `RESOLVED`, `REJECTED`, `DISPUTED`.
  - `INITIAL_WARRANTY_ASSIGNMENTS_V1`: Linked assignments with worker IDs, schedules, and reschedule pointers (`rescheduledFromId`).
  - `INITIAL_WARRANTY_DIAGNOSES_V1`: Technical diagnosis records with evidence photos.
  - `INITIAL_WARRANTY_PAID_WORK_PROPOSALS_V1`: Proposals for out-of-warranty repairs.
  - `INITIAL_WARRANTY_COMPLETION_PROOFS_V1`: Proof records with before/after photos.
  - `INITIAL_WARRANTY_TIMELINE_EVENTS_V1`: Linked timeline events with role-based visibility.
- **Finding:** Single unified graph connects Provider, Customer, Worker, Orders, and Warranties.

---

## 18. Schedule / Cross-Role Sync Audit
- **Schedule Source of Truth:**
  - Provider, Worker, and Customer all read from the same `warrantyAssignmentsV1` collection via `domainRepository.ts`.
  - Schedule changes executed by Provider via `rescheduleWarrantyAssignment` immediately update the assignment record and emit reactive notifications.
  - Worker sees updated date/time in `/worker/warranty` (`Mendatang` filter).
  - Customer sees updated date/time in `/warranties` and `/warranties/[warrantyId]`.
- **Finding:** No isolated schedule representations detected.

---

## 19. Tracking Audit
- **Investigation:**
  - Warranty jobs use standard Worker identity and scheduling models.
  - Test `WAR-CORR-11` explicitly verifies that stopping worker tracking or closing tracking telemetry does NOT cancel, alter, or fail the warranty claim.
  - Customer-safe timeline filters out raw worker GPS coordinates and telemetry.

---

## 20. Notification Audit
- **Engine:** `domainRepository.sendNotification()` and `domainRepository.notifications` collection.
- **Warranty Integration:**
  - Automated persisted notifications dispatched for all critical domain events:
    1. Claim submission -> Customer & Provider
    2. Initial review accept/reject -> Customer
    3. Worker assignment & scheduling -> Worker & Customer
    4. Worker check-in -> Provider
    5. Diagnosis submission -> Provider
    6. Request more info -> Worker
    7. Paid work proposal -> Customer
    8. Paid work customer approval/rejection -> Provider & Worker
    9. Completion proof submission -> Provider
    10. Claim resolution -> Customer
- **Finding:** Reuses platform canonical notification engine without creating a duplicate notification system.

---

## 21. Dispute / Escalation Audit
- **Investigation:**
  - Provider claim rejection (`claim.status === "REJECTED"`) allows customer to escalate via `customerDisputeClaim`.
  - Creates a canonical `DisputeCase` in `domainRepository.disputes`.
  - Rejection of Paid Work by customer does NOT trigger a dispute case; it is treated as commercial rejection and terminates safely.
- **Finding:** Reuses existing platform dispute engine; no duplicate dispute system created.

---

## 22. Finance / Payment Audit
- **Investigation:**
  - Standard warranty repairs are 100% covered and zero-cost; they do not invoke the billing/escrow engine or generate invoices.
  - Paid work proposals generate standard `ServiceOrder` items with line items, service fee, and platform fee, processed through canonical order checkout and payment flows.
- **Finding:** Clean separation between free warranty protection and commercial paid work transactions.

---

## 23. RBAC / Tenant Isolation Audit
- **Enforcement Points in `domainRepository.ts`:**
  - `grantWarranty`: Enforces `actorRole === "SERVICE_PROVIDER"`.
  - `workerSubmitWarrantyDiagnosis`: Restricts coverage/pricing authority.
  - `providerDecideCoverage`: Restricts commercial decision to Provider only.
  - `customerRespondPaidWorkProposal`: Validates `proposal.customerId === customerId`.
  - Multi-tenant checks: Validates `warranty.providerId === providerId` across provider mutations.
- **Finding:** Server/repository-level validation prevents privilege escalation and cross-tenant leakage.

---

## 24. Test Audit

### Test Execution Summary
```text
COMMAND:
npx tsx --test tests/warranty-v1.test.ts

EXIT CODE:
0

RESULT:
PASS

SUMMARY:
tests 60
suites 22
pass 60
fail 0
duration_ms 563.425
```

```text
COMMAND:
npx tsx --test tests/*.test.ts

EXIT CODE:
0

RESULT:
PASS

SUMMARY:
tests 270
suites 49
pass 270
fail 0
duration_ms 1833.567
```

```text
COMMAND:
npx tsc --noEmit

EXIT CODE:
0

RESULT:
PASS

SUMMARY:
0 TypeScript errors detected across entire repository.
```

---

## 25. Browser / UI Testability Audit
- **Development Server:** `npm run dev` running on `http://localhost:3000`.
- **Role Switching:** Handled dynamically via `RoleContext` and `RoleSwitcher` floating widget.
- **Route Reachability Assessment:**
  - `/provider/services`: Reachable (Role: `SERVICE_PROVIDER`). Renders service catalog and warranty selectors.
  - `/provider/warranty`: Reachable (Role: `SERVICE_PROVIDER`). Renders store status, duration list, service configurations, pending activations.
  - `/provider/warranty/requests`: Reachable (Role: `SERVICE_PROVIDER`). Renders claims list, detail modal, stepper, 3 decision buttons.
  - `/worker/warranty`: Reachable (Role: `WORKER_TECHNICIAN`). Renders active tasks, history, filter chips, diagnosis and completion modals.
  - `/orders`: Reachable (Role: `CUSTOMER`). Renders customer order list with top tab to Garansi.
  - `/warranties`: Reachable (Role: `CUSTOMER`). Renders customer warranty list, proposals, in-progress claims, and top tab to Pesanan.
  - `/warranties/[warrantyId]`: Reachable (Role: `CUSTOMER`). Renders digital certificate, QR code, and customer-safe timeline.

---

## 26. Conflicts With Locked V1

### Classification of Identified Gaps

| ID | Issue | Severity | Component / File | Conflict Description | Recommended Fix Phase |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GAP-01** | Provider Request Center Tab Groupings | **HIGH** | `src/app/(business)/provider/warranty/requests/page.tsx` | UI uses 6 groups (`ALL`, `ACTION_NEEDED`, `IN_PROGRESS`, `WAITING_DECISION`, `WAITING_CUSTOMER`, `COMPLETED`) instead of locked 7 groupings (`Perlu Tindakan`, `Sudah Ditindak`, `Sedang Berjalan`, `Hasil`, `Pengerjaan`, `Menunggu Pembayaran`, `Selesai`). | **Phase 3** |
| **GAP-02** | Worker Check-in Intermediate OTW State | **MEDIUM** | `src/app/(business)/worker/warranty/page.tsx` | `Mulai Penanganan` immediately executes `workerCheckInWarranty`, collapsing OTW travel and on-site check-in into a single action. | **Phase 4** |
| **GAP-03** | ServiceCard Warranty Duration Text | **LOW** | `src/components/features/services/ServiceCard.tsx` | Badge shows `✓ Garansi Tersedia` but does not print the explicit duration (e.g. `(30 Hari)`). | **Phase 2** |
| **GAP-04** | Duplicate Route Directory | **LOW** | `src/app/(business)/provider/warranties/` | Directory exists merely as re-export wrapper of `/provider/warranty`. | **Phase 2 / Phase 7** |

---

## 27. Missing Pieces / Gaps
1. **Request Operation Center Tabs:** Alignment of 7 locked category tabs in `/provider/warranty/requests`.
2. **Worker OTW Step:** Separation of Start Handling (OTW) and On-site Check-in.
3. **Card Duration Badge:** Explicit duration display on customer-facing service cards.

---

## 28. Reusable Existing Pieces
1. **Canonical Types:** `WarrantyV1`, `WarrantyClaimV1`, `WarrantyAssignmentV1`, `WarrantyDiagnosisV1`, `WarrantyPaidWorkProposalV1`, `WarrantyCompletionProofV1`, `ProviderWarrantySettings`, `ProviderWarrantyDuration` in `src/types/domain.ts` are 100% compliant.
2. **Repository Mutations:** All 15+ canonical warranty methods in `DomainRepository` are implemented, unit-tested, and idempotent.
3. **Unified Fixture Graph:** `src/mocks/warranties.ts` contains the full linked fixture graph across all 11 lifecycle scenarios.
4. **Customer UI:** `/orders`, `/warranties`, and `/warranties/[warrantyId]` are already unified with responsive top tabs and synchronized bottom navigation.
5. **Role Context:** `RoleContext.tsx` and `RoleSwitcher.tsx` provide instantaneous role switching during manual and automated UI testing.

---

## 29. Proposed File Change Map

### 29.1 File Change Matrix

| File Path | Current Role / Feature | Phase | Action | Risk | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/types/domain.ts` | Shared Domain Types | Phase 1 | **KEEP** | LOW | Already 100% aligned with locked V1 specification. |
| `src/lib/repository/domainRepository.ts` | Shared Repository | Phase 1 | **KEEP / REFACTOR** | LOW | Core mutations already implemented and verified by 60 unit tests. |
| `src/mocks/warranties.ts` | Seed Fixtures | Phase 1 | **KEEP** | LOW | Complete linked fixture graph already seeded. |
| `src/components/features/services/ServiceCard.tsx` | Service Card | Phase 2 | **MODIFY** | LOW | Add explicit duration display alongside `✓ Garansi Tersedia`. |
| `src/app/(business)/provider/services/page.tsx` | Provider Services | Phase 2 | **KEEP** | LOW | Already connects dynamic duration dropdown to `repo.getProviderWarrantyDurations`. |
| `src/app/(business)/provider/warranty/page.tsx` | Provider Warranty Store | Phase 2 | **MODIFY** | LOW | Polish UI, ensure operation center banner links to requests. |
| `src/app/(business)/provider/warranties/page.tsx` | Provider Alias | Phase 2 | **DEPRECATE LATER** | LOW | Re-export wrapper; can be safely phased out. |
| `src/app/(business)/provider/warranty/requests/page.tsx` | Provider Request Center | Phase 3 | **MODIFY** | MEDIUM | Align filter tabs to 7 locked groupings (`Perlu Tindakan`, `Sudah Ditindak`, `Sedang Berjalan`, `Hasil`, `Pengerjaan`, `Menunggu Pembayaran`, `Selesai`). |
| `src/app/(business)/worker/warranty/page.tsx` | Worker Warranty Execution | Phase 4 | **MODIFY** | MEDIUM | Separate `Mulai Penanganan (OTW)` and `Check-in (Di Lokasi)` states. |
| `src/app/(customer)/orders/page.tsx` | Customer Orders List | Phase 5 | **KEEP** | LOW | Unified top tabs already implemented. |
| `src/app/(customer)/warranties/page.tsx` | Customer Warranties Center | Phase 5 | **KEEP** | LOW | Unified layout, proposals, and in-progress cards already implemented. |
| `src/app/(customer)/warranties/[warrantyId]/page.tsx` | Customer Warranty Detail | Phase 5 | **KEEP** | LOW | Digital certificate, QR code, and customer-safe timeline already implemented. |
| `tests/warranty-v1.test.ts` | Master Test Suite | Phase 7 | **KEEP** | LOW | 60 unit/integration tests currently passing 100%. |

---

## 30. Dependency Order For Phase 1–8

```text
PHASE 0: AUDIT ONLY (Completed)
   │
   ▼
PHASE 1: SHARED DOMAIN & FIXTURE INTEGRITY
   │   - Confirm canonical types and fixture links
   │   - Run test suite: npx tsx --test tests/warranty-v1.test.ts
   ▼
PHASE 2: PROVIDER WARRANTY STORE & SERVICE CONFIGURATION
   │   - Update ServiceCard to show explicit duration text
   │   - Verify /provider/warranty store toggle and active durations
   │   - Verify /provider/services duration selector
   ▼
PHASE 3: PROVIDER PENGAJUAN GARANSI (OPERATION CENTER)
   │   - Refactor /provider/warranty/requests tabs to 7 locked groupings:
   │     [Perlu Tindakan] [Sudah Ditindak] [Sedang Berjalan] [Hasil]
   │     [Pengerjaan] [Menunggu Pembayaran] [Selesai]
   │   - Verify 3 decision buttons in diagnosis view
   ▼
PHASE 4: WORKER WARRANTY EXECUTION UI
   │   - Refactor /worker/warranty to separate OTW and Check-in steps
   │   - Verify 5 status chips: [Mendatang] [Hari Ini] [Sedang Berjalan] [Menunggu Provider] [Selesai]
   ▼
PHASE 5: CUSTOMER WARRANTY EXPERIENCE
   │   - Verify /orders and /warranties tab switching
   │   - Verify paid work proposal approve/reject cards and order creation
   ▼
PHASE 6: CROSS-ROLE STATE SYNCHRONIZATION
   │   - Verify end-to-end multi-role flow (Grant -> Assign -> Schedule -> OTW -> Check-in -> Dx -> Decision -> Repair / Paid Work -> Selesai)
   ▼
PHASE 7: TEST & FORENSIC VERIFICATION
   │   - Execute: npx tsc --noEmit
   │   - Execute: npx tsx --test tests/warranty-v1.test.ts
   │   - Execute: npx tsx --test tests/*.test.ts
   ▼
PHASE 8: BROWSER VERIFICATION & FINAL LOCK
       - Visual confirmation across Provider, Worker, and Customer routes in browser
```

---

## 31. Phase 0 Completion Gate

- [x] Locked master spec read completely.
- [x] Repository structure mapped.
- [x] Current warranty routes identified.
- [x] Provider navigation identified.
- [x] Provider Warranty Store implementation identified.
- [x] Provider request center identified.
- [x] Provider cards identified.
- [x] Provider detail / stepper identified.
- [x] Worker Warranty implementation identified.
- [x] Customer Warranty implementation identified.
- [x] Domain statuses identified from actual code.
- [x] State transitions traced from actual code.
- [x] Repository mutations mapped.
- [x] Original order immutability checked.
- [x] Paid-work flow checked end-to-end.
- [x] Fixture graph checked.
- [x] Cross-role schedule source checked.
- [x] Tracking integration checked.
- [x] Notification engine identified.
- [x] Dispute engine identified.
- [x] Finance/payment engine identified.
- [x] RBAC enforcement identified.
- [x] Existing Warranty tests located.
- [x] Relevant test status recorded.
- [x] Browser route testability assessed.
- [x] Card readiness matrix produced.
- [x] Cross-role matrix produced.
- [x] Critical/high gaps identified.
- [x] Proposed file change map produced.
- [x] Dependency order for Phase 1–8 produced.
- [x] Audit report saved to `docs/SERVIO_WARRANTY_V1_PHASE_0_AUDIT_REPORT.md`.

---
*End of Audit Report.*
