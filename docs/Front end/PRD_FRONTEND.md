# SERVIO — PRD FRONTEND
## Product Requirements Document — Frontend Architecture, Pages, Flows & Component System

**Status:** 🔒 FINAL FRONTEND BLUEPRINT
**Scope:** Feature #1–#27 + Role & Access + Middleware/Authorization
**Implementation Order:** Frontend → ERD / Database → Backend / API
**Canonical business reference:** `servio-master-blueprint-final.md`

---

# 1. Purpose

Dokumen ini menerjemahkan seluruh business flow Servio menjadi kontrak frontend yang dapat langsung dijadikan acuan saat implementasi. Setiap route/page harus dapat ditelusuri ke feature, role, permission, scope, resource, dan business state yang sudah di-lock.

Frontend PRD ini harus menjawab untuk setiap surface:
- halaman apa yang tersedia;
- siapa yang boleh mengakses;
- data/section yang tampil;
- input yang diterima;
- action yang tersedia;
- kapan action disabled/hidden;
- state loading/empty/error/offline/stale/processing;
- hubungan ke feature lain;
- komponen reusable yang dipakai;
- route berikutnya setelah action berhasil.

# 2. Scope Boundaries

PRD ini menentukan presentasi, navigation, interaction, frontend state, mock contract, dan component composition. PRD ini tidak mengubah business rule, source of truth, financial authority, inventory authority, ataupun authorization policy dari blueprint.

| Layer | Frontend responsibility | Not allowed |
| --- | --- | --- |
| UI | Render state, data projection, interaction | Menjadi source of truth bisnis |
| Route | Navigation dan coarse protection | Menggantikan backend authorization |
| Component | Reusable visual/domain interaction | Menyimpan seluruh aplikasi dalam satu file |
| Mock | Data dan scenario untuk frontend-first | Mengklaim sebagai data produksi |
| Domain adapter | Kontrak data untuk UI | Menghitung ulang business source of truth secara liar |

# 3. Frontend Technical Baseline

```text
Next.js App Router
React + TypeScript
Tailwind CSS
Component-driven architecture
Role-aware route groups
Domain feature folders
Mock / fixture data first
API adapters later
Permission-aware UI
```


Tahap pertama menggunakan mock/fixture yang bentuknya mengikuti domain final. Setelah ERD dan backend dibuat, adapter data diganti tanpa mengubah information architecture utama.

# 4. Core Principles

- **Page = composition.** `page.tsx` hanya menggabungkan layout + feature components.
- **No giant component.** Form, table, modal, timeline, card, map, dan state logic dipisah menjadi component/hook/domain unit.
- **Backend is authority.** PermissionGate di UI hanya untuk UX; API/service layer tetap melakukan authorization.
- **State is explicit.** Status domain tidak disamakan dengan keberhasilan UI request.
- **No silent mutation.** Action penting/financial/destructive membutuhkan explicit confirmation.
- **Dynamic forms are schema-driven.** Booking dan asset/product forms menyesuaikan context.
- **AI is assistive.** AI recommendation tidak boleh terlihat seperti official truth.
- **History is historical.** UI tidak boleh membuat snapshot lama terlihat sebagai data aktif.
- **Responsive and accessible.** Critical action tetap tersedia pada ukuran layar berbeda.

# 5. Global State Standards

| State | Frontend behavior |
| --- | --- |
| Loading | Skeleton yang mempertahankan struktur layout |
| Empty | Penjelasan + CTA yang relevan |
| Error | Pesan jelas + retry/back/recover |
| Permission Denied | Forbidden state + safe navigation |
| Offline | Tampilkan last known data bila valid; jangan klaim mutation sukses |
| Stale | Tampilkan last updated bila data sensitif terhadap freshness |
| Processing | Disable duplicate submit + progress indicator |
| Success | Konfirmasi hasil + next logical action |
| Partial | Pisahkan item selesai dan pending |
| Locked | Jelaskan state yang mengunci action |
| Expired | Jelaskan deadline/policy + alternatif yang tersedia |

# 6. Global Components

| Component | Purpose |
| --- | --- |
| AppShell | Kerangka global aplikasi |
| RoleSidebar | Navigasi berdasarkan active role |
| RoleSwitcher | Ganti active role |
| OrganizationSwitcher | Ganti organisasi untuk multi-org account |
| PageHeader | Title/description/actions |
| Breadcrumbs | Context navigation |
| SearchBar | Global/scoped search |
| FilterBar | Filter controls |
| SortMenu | Sorting |
| StatusBadge | Normalized state display |
| Timeline | Historical event display |
| DataTable | Operational/analytics list |
| EntityCard | Service/provider/product/shipment/asset |
| DetailSection | Grouped data |
| FormSection | Grouped form fields |
| DynamicFieldRenderer | Field rendering dari schema |
| PriceBreakdown | Harga/fee/total |
| PermissionGate | Conditional action/section visibility |
| ConfirmationDialog | Action confirmation |
| Drawer | Contextual detail |
| Modal | Focused interaction |
| Toast | Action feedback |
| EmptyState | No data guidance |
| ErrorState | Recoverable error |
| Skeleton | Loading |
| UploadDropzone | Media/evidence |
| MediaGallery | Preview media |
| ChatComposer | Messages |
| MapView | Location/tracking |
| Countdown | Deadline countdown |
| ProgressStepper | Multi-step process |
| ReviewForm | Rating/review |
| AuditTimeline | Operational history |
| ExceptionBanner | Important exception |
| ApprovalPanel | Approve/reject workflow |

# 7. Component Architecture Rule

```text
Page
├── PageHeader
├── PageToolbar
├── FeatureSection
│   ├── DomainCard / Table
│   ├── Form
│   └── Timeline / Map / Media
├── SidePanel / Modal
└── ActionBar
```


Business logic ditempatkan pada feature hooks/services, bukan pada markup halaman.

# 8. Recommended Folder Structure

```text
src/
├── app/
│   ├── (public)/
│   ├── (customer)/
│   ├── (business)/
│   ├── (ops)/
│   ├── (executive)/
│   ├── auth/
│   ├── forbidden/
│   ├── not-found/
│   └── error/
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── navigation/
│   ├── feedback/
│   ├── form/
│   ├── data-display/
│   ├── map/
│   └── features/
│       ├── discovery/
│       ├── booking/
│       ├── order/
│       ├── pricing/
│       ├── communication/
│       ├── payment/
│       ├── execution/
│       ├── tracking/
│       ├── proof/
│       ├── completion/
│       ├── review/
│       ├── dispute/
│       ├── warranty/
│       ├── history/
│       ├── asset/
│       ├── maintenance/
│       ├── loyalty/
│       ├── ai/
│       ├── service-product/
│       ├── product/
│       ├── cart/
│       ├── commerce-order/
│       ├── commerce-payment/
│       ├── inventory/
│       ├── fulfillment/
│       ├── shipping/
│       └── return-refund/
│
├── features/
│   ├── discovery/
│   ├── booking/
│   ├── product/
│   ├── order/
│   ├── payment/
│   ├── execution/
│   ├── shipping/
│   ├── return-refund/
│   └── ...
├── hooks/
├── stores/
├── lib/
│   ├── auth/
│   ├── permissions/
│   ├── formatters/
│   ├── validators/
│   └── adapters/
├── mocks/
│   ├── fixtures/
│   ├── scenarios/
│   └── factories/
├── types/
├── config/
├── constants/
└── styles/
```


# 9. Folder Responsibilities

| Folder | Responsibility |
| --- | --- |
| app/** | Route composition, layout, loading/error boundaries |
| components/ui/** | Atomic design system |
| components/features/** | Reusable domain UI |
| features/** | Domain-specific schema, state, interaction logic |
| hooks/** | Reusable client hooks |
| stores/** | UI/session state that is not server source of truth |
| lib/auth/** | Identity/session/context helper |
| lib/permissions/** | Permission/scope helper for UI |
| lib/adapters/** | Data interface layer |
| mocks/** | Deterministic fixture/scenarios |
| types/** | Shared types/view models |
| config/** | Navigation and feature configuration |

# 10. Route Group Architecture

```text
(public)
├── service/product discovery
├── service/provider detail
└── smart discovery

(customer)
├── service lifecycle
├── product lifecycle
├── assets/history/maintenance
└── returns/support

(business)
├── provider
├── worker
├── merchant
└── supplier

(ops)
├── support
├── finance
└── admin

(executive)
└── ceo
```

# 11. Canonical Navigation

| Role | Primary navigation |
| --- | --- |
| CUSTOMER | Home; Discover; Bookings; Orders; Products; Cart; Tracking; Favorites; Recommendations; Assets; Maintenance; History; Warranties; Loyalty; Returns; Support |
| SERVICE_PROVIDER | Dashboard; Bookings; Orders; Services; Quotations; Execution; Tracking; Proof; Completion; Ratings; Disputes; Warranties; Service+Product; Inventory; Fulfillment; Shipping; Returns |
| WORKER_TECHNICIAN | Dashboard; Assigned Jobs; Tracking; Proof; Materials; Assigned Shipments; Support |
| CUSTOMER_SUPPORT | Dashboard; Case Queue; Assigned Cases; Communication; Escalations |
| FINANCE_PAYMENT_OPS | Dashboard; Payments; Refunds; Payouts; Reconciliation; Financial Reports |
| MERCHANT | Dashboard; Products; Orders; Inventory; Fulfillment; Shipping; Returns; Settlement |
| SUPPLIER | Dashboard; Supply Products; Inventory; Fulfillment; Shipping; Returns |
| ADMIN_OPERATIONS | Dashboard; Users/Organizations; Taxonomy; Services; Products; Orders; Disputes; Warranties; Inventory; Fulfillment; Shipping; Returns; Moderation; Audit |
| CEO_PRODUCT_OWNER | Executive Dashboard; Taxonomy Governance; Fee/Pricing Policy; Shipping/Return Policy; AI Monitoring |

# 12. Global Authorization UX

- Navigation is derived from active role + permission + organization context.
- PermissionGate hides or disables only what UX requires; backend remains authoritative.
- Direct unauthorized route → `/forbidden`.
- Resource mismatch → resource-level forbidden/not-found depending security policy.
- Financial/destructive action → confirmation dialog with consequence summary.
- Multi-role switch refreshes shell, route permissions, and data projection.

# 13. Frontend-First Data Strategy

```text
UI Page
  ↓
View Model / Fixture
  ↓
Feature Hook
  ↓
Adapter Interface
  ↓
[MOCK now] / [API later]
  ↓
Domain Data
```


Mock scenario IDs harus stabil agar semua flow dapat diuji ulang. Buat scenario normal, empty, error, delayed, permission denied, partial, expired, and exceptional untuk domain kritis.
---

# 14. CUSTOMER — DETAILED PAGE CONTRACTS

## 14.1. Home

**Route:** `/`  
**Role:** `CUSTOMER / PUBLIC`  
**Purpose:** Entry point yang mengarahkan customer ke service/product discovery dan pekerjaan yang sedang berjalan.

**Tampilan / Sections:**
- Hero search
- 6 service domain cards
- Smart Discovery CTA
- Nearby/relevant services
- Recommended providers/products
- Active booking/order summary
- Maintenance reminders
- Favorites shortcuts
- Cart summary

**Input:**
- Search query
- Optional location permission/context

**Allowed Actions:**
- Search; browse category; open smart discovery; open active order; open maintenance; open cart; open recommendation

**State:**
- Loading per section
- Location unavailable
- Recommendation unavailable
- Empty active orders

**Handoff / Next:**
- Search → #1; Smart Discovery → #18; Service → #2; Product → #20; active order → #3/#22

**Primary Components:**
- AppShell
- SearchBar
- CategoryGrid
- RecommendationCarousel
- ActiveOrderCard
- MaintenanceReminderCard
- CartIndicator

## 14.2. Search Results

**Route:** `/search`  
**Role:** `CUSTOMER / PUBLIC`  
**Purpose:** Menampilkan hasil pencarian service, provider, product, atau problem.

**Tampilan / Sections:**
- Query header
- Result type tabs
- Filter bar
- Sort
- Result cards
- Related services/problems
- Recent searches when no query

**Input:**
- Keyword
- Category/subcategory
- Location
- Rating
- Price range
- Service mode
- Availability
- Product attribute filters

**Allowed Actions:**
- Search; filter; sort; open detail; favorite; start problem discovery; clear filters

**State:**
- Loading
- Empty
- No exact result
- Error
- Filtered zero result

**Handoff / Next:**
- Service → #2; provider → provider booking; product → #20/#21; problem → #18

**Primary Components:**
- SearchBar
- FilterBar
- SortMenu
- ServiceCard
- ProviderCard
- ProductCard
- EmptyState

## 14.3. Categories

**Route:** `/categories`  
**Role:** `CUSTOMER / PUBLIC`  
**Purpose:** Browse centrally controlled service taxonomy.

**Tampilan / Sections:**
- Main category cards
- Subcategory listing
- Service counts if available
- Smart Discovery CTA

**Input:**
- Category
- Subcategory

**Allowed Actions:**
- Open category; open subcategory; start smart discovery

**State:**
- Loading
- No active subcategory
- Empty

**Handoff / Next:**
- Service list → #1/#2

**Primary Components:**
- CategoryGrid
- SubcategoryList
- Breadcrumbs

## 14.4. Service Detail

**Route:** `/services/[serviceId]`  
**Role:** `CUSTOMER / PUBLIC`  
**Purpose:** Memahami pekerjaan sebelum masuk booking.

**Tampilan / Sections:**
- Service identity
- Category/subcategory
- Description
- Service modes
- Supported booking types
- Pricing model
- Included/excluded
- Requirements
- Provider list
- Rating
- Service area
- Related products/assets
- Primary booking CTA

**Input:**
- Provider selection
- Mode/booking type if selectable
- Optional asset

**Allowed Actions:**
- Book; choose provider; favorite; ask AI; open related product; view reviews; contact where allowed

**State:**
- Unavailable
- No provider
- Booking not compatible
- Policy/price note

**Handoff / Next:**
- Book → #2; AI → #18; product → #19/#20; provider → provider profile

**Primary Components:**
- DetailSection
- StatusBadge
- ProviderCard
- ModeChips
- PriceSummary
- PrimaryActionBar

## 14.5. Provider Profile

**Route:** `/providers/[providerId]`  
**Role:** `CUSTOMER / PUBLIC`  
**Purpose:** Membantu customer mengevaluasi provider.

**Tampilan / Sections:**
- Business profile
- Capabilities/skills
- Service offerings
- Rating/reviews
- Service area
- Availability signal
- Relevant badges
- CTA per offering

**Input:**
- Offering selection
- Sort/filter offerings

**Allowed Actions:**
- Select service; favorite provider; book; open reviews; contact when allowed

**State:**
- No rating yet
- Unavailable
- No active offering

**Handoff / Next:**
- Selected offering → #2

**Primary Components:**
- ProviderHeader
- OfferingCard
- RatingSummary
- ReviewList
- FavoriteButton

## 14.6. Smart Discovery

**Route:** `/smart-discovery`  
**Role:** `CUSTOMER / PUBLIC`  
**Purpose:** Mengubah deskripsi masalah menjadi structured context dan possible service.

**Tampilan / Sections:**
- Problem prompt
- Conversation/stepper
- Dynamic question cards
- Media upload
- Answer summary
- Possible service matches
- Explanation / disclaimer
- CTA to selected service

**Input:**
- Text problem
- Photo/video where supported
- Structured answer buttons
- Optional location
- Urgency

**Allowed Actions:**
- Answer; edit answer; upload/remove media; choose service; restart; continue

**State:**
- AI loading
- AI unavailable
- Insufficient info
- Ambiguous result
- Fallback search

**Handoff / Next:**
- Selected service → #2; recommendation → #18

**Primary Components:**
- ChatPanel
- DynamicQuestionCard
- UploadDropzone
- RecommendationCard
- ProgressStepper

## 14.7. Service Booking Wizard

**Route:** `/bookings/new`  
**Role:** `CUSTOMER`  
**Purpose:** Mengumpulkan data booking dinamis untuk service offering + booking type.

**Tampilan / Sections:**
- Selected service/provider summary
- Dynamic service fields
- Booking type
- Service mode
- Schedule
- Address/location
- Asset selector
- Issue description
- Attachments
- Preferences when supported
- Price/survey fee notice
- Summary

**Input:**
- Service offering
- Booking type
- Schedule
- Address
- Asset
- Issue description
- Attachments
- Notes
- Provider preference when allowed

**Allowed Actions:**
- Back; save draft; edit context; select slot; continue; submit/confirm

**State:**
- Validation error
- Slot expired
- Provider unavailable
- Address outside service area
- Survey fee notice
- Price changed

**Handoff / Next:**
- Submit → #3; quotation path → #4; communication → #5

**Primary Components:**
- BookingStep
- DynamicFieldRenderer
- DateTimePicker
- AddressPicker
- AssetSelect
- MediaUpload
- BookingSummary
- FeeNotice

## 14.8. Booking Detail

**Route:** `/bookings/[bookingId]`  
**Role:** `CUSTOMER`  
**Purpose:** Melihat dan mengelola booking sebelum/selama transisi ke order.

**Tampilan / Sections:**
- Booking status
- Service/provider
- Booking type
- Schedule
- Location
- Asset
- Scope/context
- Policy
- Price context
- Survey fee rule
- Activity timeline

**Input:**
- Editable booking fields as policy allows

**Allowed Actions:**
- Edit; confirm; cancel; continue to order; open communication

**State:**
- Pending provider
- Confirmed
- Rejected
- Expired
- Cancelled
- Locked fields

**Handoff / Next:**
- Confirmed → #3; issue → #12

**Primary Components:**
- DetailSection
- StatusBadge
- Timeline
- ActionBar
- ConfirmationDialog

## 14.9. Service Order List

**Route:** `/orders`  
**Role:** `CUSTOMER`  
**Purpose:** Daftar service/product order customer.

**Tampilan / Sections:**
- Tabs: service/product
- Status filters
- Date range
- Search
- Order cards/table

**Input:**
- Search
- Status
- Date
- Service/product type

**Allowed Actions:**
- Open; cancel where allowed; rebook; return for product; report issue

**State:**
- Empty
- No filtered result
- Loading

**Handoff / Next:**
- Open service order → #3; product order → #22

**Primary Components:**
- DataTable
- OrderCard
- FilterBar
- StatusBadge

## 14.10. Service Order Detail

**Route:** `/orders/[orderId]`  
**Role:** `CUSTOMER`  
**Purpose:** Single source customer-facing view dari perjalanan service order.

**Tampilan / Sections:**
- Order header/status
- Booking
- Quotation
- Price breakdown
- Payment/protection
- Execution
- Tracking
- Proof
- Completion
- Rating
- Warranty
- History
- Communication
- Issue actions

**Input:**
- Issue/report fields when requested
- Additional information

**Allowed Actions:**
- View quote; accept/reject quote; pay; chat; track; review proof; confirm completion; report issue; rate; complaint; warranty/history; rebook

**State:**
- Payment pending
- Execution active
- Proof revision
- Awaiting confirmation
- Disputed
- Completed

**Handoff / Next:**
- #4,#5,#6,#7,#8,#9,#10,#11,#12,#13,#14,#17

**Primary Components:**
- OrderHeader
- OrderTimeline
- PriceBreakdown
- StatusStepper
- ActionBar
- ContextLinkCard

## 14.11. Quotation Detail

**Route:** `/orders/[orderId]/quotation`  
**Role:** `CUSTOMER`  
**Purpose:** Review quotation formal dan melakukan decision/negotiation.

**Tampilan / Sections:**
- Quotation version
- Scope
- Included/excluded
- Price components
- Survey fee
- Validity
- History of versions
- Provider note

**Input:**
- Negotiation message
- Counter values only if policy supports

**Allowed Actions:**
- Accept; reject; request revision; open communication

**State:**
- Draft
- Sent
- Viewed
- Negotiating
- Revised
- Accepted
- Rejected
- Expired

**Handoff / Next:**
- Accepted → #6; revision → #4/#5

**Primary Components:**
- QuotationCard
- VersionTimeline
- PriceBreakdown
- ConfirmationDialog

## 14.12. Communication

**Route:** `/chat/[conversationId]`  
**Role:** `CUSTOMER`  
**Purpose:** Komunikasi kontekstual dengan provider/worker/support.

**Tampilan / Sections:**
- Participants
- Context banner
- Message history
- Attachment previews
- System events

**Input:**
- Message
- Attachment

**Allowed Actions:**
- Send; retry; open related order/execution; report conversation issue

**State:**
- Offline
- Sending
- Failed
- Closed

**Handoff / Next:**
- Order/execution/dispute action → linked feature

**Primary Components:**
- ChatThread
- ChatComposer
- AttachmentPreview
- ContextBanner

## 14.13. Service Payment

**Route:** `/payments/[paymentId]`  
**Role:** `CUSTOMER`  
**Purpose:** Menyelesaikan dan melihat status pembayaran service.

**Tampilan / Sections:**
- Amount
- Price breakdown
- Payment timing
- Due date
- Countdown if applicable
- Method options
- Payment status
- Protection/escrow
- Attempt history
- Receipt link

**Input:**
- Payment method
- Partial amount if policy allows

**Allowed Actions:**
- Pay; retry valid intent; view receipt; view refund

**State:**
- Unpaid
- Requires action
- Processing
- Paid
- Failed
- Expired
- Refund pending

**Handoff / Next:**
- Paid/precondition → #7; issue → #12

**Primary Components:**
- PaymentSummary
- Countdown
- PaymentMethodList
- PriceBreakdown
- PaymentStatus
- ConfirmationDialog

## 14.14. Service Tracking

**Route:** `/tracking/service/[orderId]`  
**Role:** `CUSTOMER`  
**Purpose:** Melihat perjalanan provider dan progress service bila tracking relevan.

**Tampilan / Sections:**
- Provider/worker identity
- Current state
- Map when relevant
- ETA
- Distance
- Timeline
- Last updated
- Share tracking
- Communication

**Input:**
- Refresh
- Share settings

**Allowed Actions:**
- Refresh; share; chat/call; help; report issue

**State:**
- No live location
- Stale
- Offline
- Workshop
- Remote
- Ended

**Handoff / Next:**
- Tracking → #7/#8; issue → #12

**Primary Components:**
- MapView
- TrackingTimeline
- ETAChip
- TrackingShareDialog
- StaleBanner

## 14.15. Proof Review

**Route:** `/orders/[orderId]/proof`  
**Role:** `CUSTOMER`  
**Purpose:** Review proof package service.

**Tampilan / Sections:**
- Proof package status
- Before/during/after
- Media
- Checklist
- Measurements
- Tests
- Report
- Version
- Exceptions

**Input:**
- Review decision
- Revision reason
- Optional comment

**Allowed Actions:**
- Accept proof; request revision; open issue

**State:**
- Uploading
- Validating
- Review
- Revision required
- Accepted
- Locked

**Handoff / Next:**
- Accepted → #10; issue → #12

**Primary Components:**
- ProofPackage
- MediaGallery
- ChecklistView
- MeasurementList
- RevisionPanel

## 14.16. Completion Confirmation

**Route:** `/orders/[orderId]/completion`  
**Role:** `CUSTOMER`  
**Purpose:** Final gate sebelum order service dianggap completed.

**Tampilan / Sections:**
- Execution summary
- Proof summary
- Scope completion
- Additional cost status
- Unresolved issue
- Confirmation deadline

**Input:**
- Confirmation
- Issue report
- Comment

**Allowed Actions:**
- Confirm completion; report issue; open dispute

**State:**
- Not ready
- Awaiting customer
- Revision required
- Disputed
- Auto completion pending
- Completed

**Handoff / Next:**
- Completed → #11/#13/#14; issue → #12

**Primary Components:**
- CompletionSummary
- ConfirmationPanel
- IssueReportForm
- DeadlineBanner

## 14.17. Rating & Review

**Route:** `/orders/[orderId]/review`  
**Role:** `CUSTOMER`  
**Purpose:** Feedback setelah completion.

**Tampilan / Sections:**
- Eligibility
- Overall stars
- Dimensions
- Tags
- Review text
- Media
- Existing response

**Input:**
- Stars
- Dimensions
- Tags
- Review text
- Optional media

**Allowed Actions:**
- Submit; report issue; view provider response

**State:**
- Not eligible
- Draft
- Submitted
- Published
- Flagged
- Hidden

**Handoff / Next:**
- Feedback signals → #1/#18

**Primary Components:**
- ReviewForm
- StarRating
- TagSelector
- MediaUpload
- ProviderResponse

## 14.18. Complaint / Dispute

**Route:** `/complaints/[caseId]`  
**Role:** `CUSTOMER`  
**Purpose:** Track masalah/resolution formal.

**Tampilan / Sections:**
- Case header
- Category/severity/priority
- Statements
- Evidence
- Timeline
- SLA
- Resolution
- Appeal

**Input:**
- Statement
- Evidence
- Response
- Appeal reason

**Allowed Actions:**
- Submit; add evidence; respond; accept/reject resolution; appeal

**State:**
- Triaging
- Info required
- Investigating
- Negotiating
- Resolution proposed
- Resolved
- Closed

**Handoff / Next:**
- Can affect #6/#10/#13/#27

**Primary Components:**
- CaseHeader
- EvidenceList
- CaseTimeline
- ResolutionPanel
- SLAIndicator

## 14.19. Warranty Center

**Route:** `/warranties`  
**Role:** `CUSTOMER`  
**Purpose:** Daftar warranty dan claim.

**Tampilan / Sections:**
- Active/expired warranties
- Coverage
- Exclusions
- Dates/usage conditions
- Claim statuses
- Related asset/order

**Input:**
- Filter/status/asset

**Allowed Actions:**
- Open; submit claim

**State:**
- No warranties
- Expired
- Claim pending

**Handoff / Next:**
- Claim → #13

**Primary Components:**
- WarrantyCard
- FilterBar
- StatusBadge

## 14.20. Warranty Detail

**Route:** `/warranties/[warrantyId]`  
**Role:** `CUSTOMER`  
**Purpose:** Detail warranty + claim action.

**Tampilan / Sections:**
- Contract
- Coverage/exclusion
- Source
- Start/end/usage
- Related order/service/asset
- Claim history
- Inspection/resolution

**Input:**
- Claim description
- Evidence
- Notes

**Allowed Actions:**
- Submit claim; view inspection; appeal; view resolution

**State:**
- Active
- Claim submitted
- Inspection required
- Approved
- Rejected
- Fulfilled

**Handoff / Next:**
- Rework/resolution → #7/#10; dispute → #12

**Primary Components:**
- WarrantySummary
- ClaimForm
- CoverageList
- ClaimTimeline

## 14.21. Service History

**Route:** `/history`  
**Role:** `CUSTOMER`  
**Purpose:** Digital service record jangka panjang.

**Tampilan / Sections:**
- Timeline
- Completed services
- Provider
- Scope
- Price snapshot
- Result
- Proof links
- Warranty
- Asset relation

**Input:**
- Filter asset/date/category
- Personal note/label

**Allowed Actions:**
- Open; add personal note/label; share authorized record

**State:**
- Empty
- Imported not verified

**Handoff / Next:**
- Asset → #15; maintenance → #16; rebook → #17

**Primary Components:**
- HistoryTimeline
- HistoryCard
- NoteEditor
- ShareDialog

## 14.22. Asset List

**Route:** `/assets`  
**Role:** `CUSTOMER`  
**Purpose:** Registry aset.

**Tampilan / Sections:**
- Asset cards
- Type
- Brand/model
- Serial/VIN/plate
- Status
- Last service
- Next maintenance

**Input:**
- Search
- Type/status filters

**Allowed Actions:**
- Register; open; archive; transfer/share

**State:**
- Empty
- Verification pending
- Archived

**Handoff / Next:**
- Asset detail → #15

**Primary Components:**
- AssetCard
- FilterBar
- PrimaryActionBar

## 14.23. Asset Detail

**Route:** `/assets/[assetId]`  
**Role:** `CUSTOMER`  
**Purpose:** Identity + ownership + serviceable object context.

**Tampilan / Sections:**
- Identity
- Owners/users
- Location
- Condition
- Components
- Documents
- Photos
- Verification
- Service links
- History
- Maintenance
- Warranty

**Input:**
- Dynamic type fields
- Location
- Photos
- Documents
- User/access changes

**Allowed Actions:**
- Edit; add document/photo; manage access; transfer; archive; create maintenance plan

**State:**
- Unverified
- Active
- Under service
- Transferred
- Retired
- Archived

**Handoff / Next:**
- Maintenance → #16; service → #2; history → #14

**Primary Components:**
- AssetHeader
- DynamicFieldRenderer
- ComponentTree
- DocumentList
- AccessPanel

## 14.24. Maintenance Dashboard

**Route:** `/maintenance`  
**Role:** `CUSTOMER`  
**Purpose:** Planned maintenance across assets.

**Tampilan / Sections:**
- Upcoming
- Due
- Overdue
- Plans
- Asset
- Service
- Reminder status
- Occurrences

**Input:**
- Asset/status/date filter

**Allowed Actions:**
- Book maintenance; snooze; reschedule; skip; open plan

**State:**
- Upcoming
- Due
- Overdue
- In service
- Completed
- Skipped
- Cancelled

**Handoff / Next:**
- Book → #2; history → #14

**Primary Components:**
- MaintenanceCard
- StatusTabs
- ReminderBanner
- FilterBar

## 14.25. Maintenance Plan Detail

**Route:** `/maintenance/[planId]`  
**Role:** `CUSTOMER`  
**Purpose:** Rule + schedule maintenance.

**Tampilan / Sections:**
- Asset
- Service
- Trigger
- Frequency
- Next due
- Warranty/compliance relation
- History

**Input:**
- Schedule/reschedule when allowed

**Allowed Actions:**
- Book; reschedule; skip; pause/resume; open history/warranty

**State:**
- Scheduled
- Due
- Overdue
- Paused
- Cancelled
- Not applicable

**Handoff / Next:**
- Booking → #2

**Primary Components:**
- PlanSummary
- ScheduleEditor
- ReminderSettings
- HistoryTimeline

## 14.26. Favorites

**Route:** `/favorites`  
**Role:** `CUSTOMER`  
**Purpose:** Saved provider/service/offering.

**Tampilan / Sections:**
- Tabs by target type
- Search/sort

**Input:**
- Search/filter

**Allowed Actions:**
- Open; unfavorite; book

**State:**
- Empty

**Handoff / Next:**
- Book → #2

**Primary Components:**
- FavoriteCard
- Tabs
- SearchBar

## 14.27. Loyalty Wallet

**Route:** `/loyalty`  
**Role:** `CUSTOMER`  
**Purpose:** Points and rewards.

**Tampilan / Sections:**
- Balance
- Ledger
- Rewards
- Campaigns
- Expiry/reversal

**Input:**
- Reward select
- Redeem confirmation

**Allowed Actions:**
- Redeem; inspect ledger; open campaign

**State:**
- No points
- Redemption unavailable
- Processing

**Handoff / Next:**
- Redemption result → loyalty ledger

**Primary Components:**
- BalanceCard
- LedgerTable
- RewardCard
- ConfirmationDialog

## 14.28. Recommendations

**Route:** `/recommendations`  
**Role:** `CUSTOMER`  
**Purpose:** Personalized recommendations with transparent context.

**Tampilan / Sections:**
- Recommendation sections
- Reason/explanation
- Category/provider/product/maintenance/rebook CTA

**Input:**
- Optional preference/context

**Allowed Actions:**
- Open; dismiss; favorite; proceed

**State:**
- Loading
- No recommendations
- Fallback rules

**Handoff / Next:**
- Normal flow #1/#2/#20/#16/#17

**Primary Components:**
- RecommendationCard
- ExplanationChip
- DismissAction

## 14.29. Product Discovery

**Route:** `/products`  
**Role:** `CUSTOMER`  
**Purpose:** Discover products/materials.

**Tampilan / Sections:**
- Search
- Category filters
- Attributes
- Compatibility target
- Seller/offer
- Availability signal
- Sort

**Input:**
- Keyword
- Category
- Attributes
- Compatibility target
- Seller
- Price range
- Location

**Allowed Actions:**
- Search; filter; sort; open; select offer; add to cart

**State:**
- No result
- Out of stock
- Compatibility not verified

**Handoff / Next:**
- Product → #21

**Primary Components:**
- ProductGrid
- FilterBar
- CompatibilityBadge
- OfferSelector

## 14.30. Product Detail

**Route:** `/products/[productId]`  
**Role:** `CUSTOMER`  
**Purpose:** Evaluate product and offer.

**Tampilan / Sections:**
- Identity
- Variant
- Media
- Specifications
- Compatibility
- Offers/sellers
- Price
- Availability
- Warranty context
- Related services

**Input:**
- Variant
- Quantity
- Compatibility target
- Offer

**Allowed Actions:**
- Add to cart; favorite; choose offer; view compatibility

**State:**
- Out of stock
- Offer inactive
- Variant unavailable
- Not compatible

**Handoff / Next:**
- Add to cart → #21; service use → #19

**Primary Components:**
- ProductGallery
- VariantSelector
- OfferList
- CompatibilityPanel
- PriceCard

## 14.31. Cart

**Route:** `/cart`  
**Role:** `CUSTOMER`  
**Purpose:** Prepare product purchase.

**Tampilan / Sections:**
- Cart groups
- Items
- Seller
- Context
- Quantity
- Price snapshot
- Validation warnings
- Totals

**Input:**
- Quantity
- Item/group selection

**Allowed Actions:**
- Increase/decrease/remove; select checkout group; resolve validation; proceed

**State:**
- Price changed
- Out of stock
- Seller unavailable
- Compatibility conflict
- Expired cart

**Handoff / Next:**
- Checkout → #22

**Primary Components:**
- CartGroup
- CartItem
- QuantityControl
- ValidationAlert
- CartSummary

## 14.32. Product Checkout / Order Preview

**Route:** `/checkout/products`  
**Role:** `CUSTOMER`  
**Purpose:** Preview sebelum official product order.

**Tampilan / Sections:**
- Items
- Seller groups
- Address
- Shipping method
- Delivery charge
- Platform fee
- Total
- Booking/reservation context
- Cancellation policy

**Input:**
- Address
- Shipping method
- Booking slot if applicable
- Payment context

**Allowed Actions:**
- Edit cart; confirm order; reserve; continue to payment

**State:**
- Price/inventory changed
- Slot unavailable
- Invalid item

**Handoff / Next:**
- Order → #22; payment → #23

**Primary Components:**
- CheckoutStepper
- AddressPicker
- ShippingMethodSelector
- OrderPreview
- ConfirmationDialog

## 14.33. Product Order Detail

**Route:** `/orders/products/[orderId]`  
**Role:** `CUSTOMER`  
**Purpose:** Monitor product order.

**Tampilan / Sections:**
- Order status
- Seller groups
- Items
- Payment
- Fulfillment
- Shipment
- Tracking
- Delivery
- Return entry

**Input:**
- Issue details when needed

**Allowed Actions:**
- Pay; cancel; view shipment; return/refund; reorder

**State:**
- Pending confirmation
- Confirmed
- Partially fulfilled
- Fulfilled
- Completed
- Cancelled

**Handoff / Next:**
- #23/#25/#26/#27

**Primary Components:**
- OrderHeader
- SellerGroup
- ShipmentCards
- ReturnCTA

## 14.34. Product Payment

**Route:** `/payments/products/[paymentId]`  
**Role:** `CUSTOMER`  
**Purpose:** Payment product.

**Tampilan / Sections:**
- Amount
- Countdown
- Payment methods
- Attempt history
- Status
- Receipt

**Input:**
- Payment method

**Allowed Actions:**
- Pay; retry valid intent; view receipt

**State:**
- Requires payment
- Warning
- Expiring soon
- Expired
- Paid
- Failed

**Handoff / Next:**
- Payment success → fulfillment eligibility

**Primary Components:**
- Countdown
- PaymentMethodList
- AttemptTimeline
- PaymentSummary

## 14.35. Shipment Tracking

**Route:** `/tracking/shipment/[shipmentId]`  
**Role:** `CUSTOMER`  
**Purpose:** Track forward shipment.

**Tampilan / Sections:**
- Carrier
- Tracking number
- Status
- Location if available
- ETA
- Timeline
- Packages
- POD
- Exception
- Last updated

**Input:**
- Share settings
- Issue report

**Allowed Actions:**
- Refresh; share; view POD; report delivery issue

**State:**
- Live
- Periodic
- No live location
- Stale
- Delayed
- Delivered
- Lost
- Damaged
- RTS

**Handoff / Next:**
- Issue → #27/#12

**Primary Components:**
- MapView
- ShipmentTimeline
- ETACard
- PODCard
- TrackingShareDialog
- ExceptionBanner

## 14.36. Return Center

**Route:** `/returns`  
**Role:** `CUSTOMER`  
**Purpose:** Daftar return/refund.

**Tampilan / Sections:**
- Return number
- Order
- Items
- Status
- Refund/replacement
- Deadline

**Input:**
- Search
- Status/reason/date filters

**Allowed Actions:**
- Open; create return

**State:**
- Empty

**Handoff / Next:**
- Create → #27

**Primary Components:**
- ReturnCard
- FilterBar

## 14.37. Create Return

**Route:** `/returns/new`  
**Role:** `CUSTOMER`  
**Purpose:** Request return/replacement/refund.

**Tampilan / Sections:**
- Order selector
- Eligible item selector
- Quantity
- Reason
- Policy/window
- Evidence requirement
- Return method
- Shipping responsibility
- Resolution options

**Input:**
- Item
- Quantity
- Reason
- Evidence
- Comments
- Desired resolution

**Allowed Actions:**
- Submit; save draft; cancel

**State:**
- Not eligible
- Partial eligible
- Evidence missing
- Policy exception

**Handoff / Next:**
- Submitted → #27; dispute → #12

**Primary Components:**
- ReturnForm
- EligibilityBanner
- ItemSelector
- UploadDropzone
- ResolutionSelector

## 14.38. Return Detail

**Route:** `/returns/[returnId]`  
**Role:** `CUSTOMER`  
**Purpose:** Track reverse transaction.

**Tampilan / Sections:**
- Return status
- Items
- Policy snapshot
- Shipment
- Inspection
- Disposition
- Resolution
- Refund
- Replacement

**Input:**
- Evidence
- Response to info request

**Allowed Actions:**
- Upload evidence; track return; respond; accept resolution when allowed; dispute

**State:**
- Under review
- Return shipped
- Received
- Inspection
- Refund pending
- Replacement in progress
- Completed

**Handoff / Next:**
- Refund → #23; replacement → #25/#26; dispute → #12

**Primary Components:**
- ReturnHeader
- ReturnTimeline
- InspectionStatus
- RefundStatus
- ReplacementCard

---

# 15. SERVICE PROVIDER — DETAILED PAGE CONTRACTS

## 15.1. Provider Dashboard

**Route:** `/provider`  
**Role:** `SERVICE_PROVIDER`  
**Purpose:** Operational cockpit provider.

**Tampilan / Sections:**
- Booking queue
- Today schedule
- Active executions
- Pending quotations
- Exceptions
- Rating/revenue summary
- Material alerts

**Input:**
- Date/category/status

**Allowed Actions:**
- Open queue; assign worker; open quote; open execution; resolve alert

**State:**
- No jobs
- Delayed jobs

**Handoff / Next:**
- Bookings → #2/#3; execution → #7; exceptions → #12/#27

**Primary Components:**
- MetricCard
- QueueList
- AlertCard
- ScheduleCard

## 15.2. Service Offerings

**Route:** `/provider/services`  
**Role:** `SERVICE_PROVIDER`  
**Purpose:** Manage own offerings against platform taxonomy.

**Tampilan / Sections:**
- Category/subcategory/service
- Offering status
- Modes
- Booking types
- Pricing model
- Service area
- Availability

**Input:**
- Service; description; modes; booking types; configuration

**Allowed Actions:**
- Create/edit; activate/deactivate; request category

**State:**
- Draft
- Pending review
- Active
- Inactive

**Handoff / Next:**
- Discovery → #1; pricing → #4

**Primary Components:**
- OfferingForm
- BookingTypeSelector
- ModeSelector
- StatusBadge

## 15.3. Booking Queue

**Route:** `/provider/bookings`  
**Role:** `SERVICE_PROVIDER`  
**Purpose:** Process incoming booking.

**Tampilan / Sections:**
- Booking list
- Customer
- Service
- Schedule
- Location
- Asset
- Status
- Price context

**Input:**
- Status/date/service filters

**Allowed Actions:**
- Accept/reject/hold; open booking; communicate; continue order flow

**State:**
- Pending
- Expired
- Rejected
- Accepted

**Handoff / Next:**
- Accepted → #3; pricing → #4

**Primary Components:**
- BookingTable
- FilterBar
- ActionMenu

## 15.4. Order Detail

**Route:** `/provider/orders/[orderId]`  
**Role:** `SERVICE_PROVIDER`  
**Purpose:** Operational order view.

**Tampilan / Sections:**
- Customer
- Service
- Booking
- Quote
- Payment
- Execution
- Proof
- Completion
- Issue/warranty

**Input:**
- Operational note
- Action-specific fields

**Allowed Actions:**
- Quote; communicate; assign worker; start execution; handle issue

**State:**
- Payment pending
- Disputed
- Cancelled
- Completed

**Handoff / Next:**
- #4/#5/#6/#7/#12/#13

**Primary Components:**
- OrderDetail
- ContextTabs
- ActionBar

## 15.5. Quotation Workspace

**Route:** `/provider/orders/[orderId]/quotation`  
**Role:** `SERVICE_PROVIDER`  
**Purpose:** Create formal quotation.

**Tampilan / Sections:**
- Scope
- Included/excluded
- Price items
- Fees
- Survey fee
- Validity
- Versions
- Customer status

**Input:**
- Price items
- Scope
- Material
- Survey fee setting
- Expiration

**Allowed Actions:**
- Save; send; revise; cancel

**State:**
- Draft
- Sent
- Viewed
- Negotiating
- Revised
- Accepted
- Rejected
- Expired

**Handoff / Next:**
- Accepted → #6; revision → #5

**Primary Components:**
- QuotationEditor
- PriceBreakdown
- VersionHistory
- FeeEditor

## 15.6. Provider Chat

**Route:** `/provider/chat/[conversationId]`  
**Role:** `SERVICE_PROVIDER`  
**Purpose:** Communicate with customer/worker/support.

**Tampilan / Sections:**
- Participants
- Order context
- Messages
- Attachments

**Input:**
- Message
- Attachment

**Allowed Actions:**
- Send; attach; escalate

**State:**
- Offline
- Closed

**Handoff / Next:**
- Linked order/execution

**Primary Components:**
- ChatThread
- ChatComposer
- ContextPanel

## 15.7. Execution Workspace

**Route:** `/provider/executions/[executionId]`  
**Role:** `SERVICE_PROVIDER`  
**Purpose:** Manage actual job execution.

**Tampilan / Sections:**
- Assignment
- Readiness
- Tasks/checklist
- Materials
- Issues
- Tests
- Progress
- Completion gate

**Input:**
- Task/checklist
- Pause reason
- Issue
- Requirement
- Material
- Test result

**Allowed Actions:**
- Start; pause/resume; assign/reassign; task updates; issue; add requirement; submit completion

**State:**
- Preparing
- Ready
- Started
- In progress
- Paused
- Blocked
- Safety stop
- Testing
- Partial
- Completion submitted
- Failed

**Handoff / Next:**
- #8/#9/#10

**Primary Components:**
- ExecutionHeader
- TaskList
- Checklist
- IssuePanel
- MaterialPanel
- TestPanel

## 15.8. Worker Assignment

**Route:** `/provider/executions/[executionId]/assignment`  
**Role:** `SERVICE_PROVIDER`  
**Purpose:** Assign eligible worker.

**Tampilan / Sections:**
- Worker list
- Skill/certification
- Availability
- Current assignments

**Input:**
- Worker
- Assignment time
- Note

**Allowed Actions:**
- Assign; reassign; remove where allowed

**State:**
- No eligible worker

**Handoff / Next:**
- Execution → #7

**Primary Components:**
- WorkerTable
- SkillBadge
- AvailabilityBadge
- AssignmentDialog

## 15.9. Tracking Operations

**Route:** `/provider/tracking/[orderId]`  
**Role:** `SERVICE_PROVIDER`  
**Purpose:** Operational visibility perjalanan.

**Tampilan / Sections:**
- Worker location when relevant
- ETA
- Timeline
- Session
- Delay state

**Input:**
- Manual arrival/status fallback where allowed

**Allowed Actions:**
- Monitor; fallback status; contact worker; exception

**State:**
- GPS unavailable
- Offline
- Workshop
- Remote
- Ended

**Handoff / Next:**
- Execution/tracking

**Primary Components:**
- MapView
- TrackingTimeline
- ETAChip
- ExceptionBanner

## 15.10. Proof Workspace

**Route:** `/provider/executions/[executionId]/proof`  
**Role:** `SERVICE_PROVIDER`  
**Purpose:** Create required service evidence.

**Tampilan / Sections:**
- Required proof
- Stages
- Uploads
- Measurements
- Tests
- Materials
- Report

**Input:**
- Photo/video
- Checklist
- Measurements
- Test
- Notes

**Allowed Actions:**
- Upload; draft; submit; revise

**State:**
- Uploading
- Validating
- Submitted
- Revision required
- Accepted
- Locked

**Handoff / Next:**
- #10

**Primary Components:**
- ProofBuilder
- UploadDropzone
- ChecklistEditor
- MeasurementForm
- TestResult

## 15.11. Completion Workspace

**Route:** `/provider/orders/[orderId]/completion`  
**Role:** `SERVICE_PROVIDER`  
**Purpose:** Submit service completion.

**Tampilan / Sections:**
- Execution
- Proof
- Scope
- Additional costs
- Issues
- Customer confirmation

**Input:**
- Completion note
- Additional cost proposal

**Allowed Actions:**
- Submit; request confirmation; respond issue; rework

**State:**
- Not ready
- Awaiting customer
- Revision
- Disputed

**Handoff / Next:**
- #10/#11/#13/#14

**Primary Components:**
- CompletionSubmit
- ProofSummary
- CostApproval
- IssueList

## 15.12. Ratings

**Route:** `/provider/ratings`  
**Role:** `SERVICE_PROVIDER`  
**Purpose:** Review provider reputation.

**Tampilan / Sections:**
- Aggregate rating
- Dimensions
- Review list
- Tags
- Trends

**Input:**
- Filter/sort

**Allowed Actions:**
- Respond once; report problematic review

**State:**
- No rating
- Moderation

**Handoff / Next:**
- Feedback → #1/#18

**Primary Components:**
- RatingSummary
- ReviewTable
- ResponseForm

## 15.13. Dispute Case

**Route:** `/provider/disputes/[caseId]`  
**Role:** `SERVICE_PROVIDER`  
**Purpose:** Handle provider-side case.

**Tampilan / Sections:**
- Case
- Statements
- Evidence
- SLA
- Resolution
- Appeal

**Input:**
- Response
- Evidence
- Position

**Allowed Actions:**
- Respond; evidence; accept/reject resolution; appeal

**State:**
- Investigating
- Negotiating
- Escalated
- Resolved

**Handoff / Next:**
- #12

**Primary Components:**
- CaseDetail
- EvidenceList
- ResolutionPanel

## 15.14. Warranty Center

**Route:** `/provider/warranties`  
**Role:** `SERVICE_PROVIDER`  
**Purpose:** Manage service warranty cases.

**Tampilan / Sections:**
- Warranty contracts
- Claims
- Coverage
- Inspection
- Resolution

**Input:**
- Filter
- Decision fields

**Allowed Actions:**
- Inspect; eligibility; propose resolution; rework

**State:**
- Claim submitted
- Inspection
- Eligible
- Rejected
- Fulfilled

**Handoff / Next:**
- #13/#12

**Primary Components:**
- WarrantyTable
- InspectionPanel
- ResolutionPanel

## 15.15. Service History Context

**Route:** `/provider/history`  
**Role:** `SERVICE_PROVIDER`  
**Purpose:** Authorized historical context.

**Tampilan / Sections:**
- History
- Asset
- Previous services

**Input:**
- Filter

**Allowed Actions:**
- Open relevant history; use context

**State:**
- Limited access

**Handoff / Next:**
- New service context

**Primary Components:**
- HistoryTimeline
- HistoryCard

## 15.16. Service + Product Workspace

**Route:** `/provider/service-products/[orderId]`  
**Role:** `SERVICE_PROVIDER`  
**Purpose:** Source and manage required product/material.

**Tampilan / Sections:**
- Requirement
- Mandatory/recommended
- Compatibility
- Source
- Offers
- Price
- Approval
- Received/used

**Input:**
- Quantity
- Product option
- Source
- Note

**Allowed Actions:**
- Recommend; request approval; procure; received; used/installed

**State:**
- Out of stock
- No compatible
- Approval pending
- Received
- Used

**Handoff / Next:**
- #19 → #20–#26 / #7

**Primary Components:**
- RequirementCard
- CompatibilityPanel
- ProductOptionList
- ApprovalPanel

## 15.17. Provider Inventory

**Route:** `/provider/inventory`  
**Role:** `SERVICE_PROVIDER`  
**Purpose:** Manage provider-owned inventory/material.

**Tampilan / Sections:**
- Stock by location
- On hand/reserved/allocated/available
- Holds
- Movement context

**Input:**
- Product/location filters
- Authorized adjustment form

**Allowed Actions:**
- View; reserve/allocate; transfer/adjust/reconcile when authorized

**State:**
- Low stock
- Quarantine
- Held
- Mismatch

**Handoff / Next:**
- #24

**Primary Components:**
- InventoryTable
- StockCard
- LocationSelector
- AdjustmentDialog

## 15.18. Provider Fulfillment

**Route:** `/provider/fulfillment`  
**Role:** `SERVICE_PROVIDER`  
**Purpose:** Prepare provider product/material.

**Tampilan / Sections:**
- Queue
- Pick
- Verify
- Pack
- QC
- Handover
- Exceptions
- Package

**Input:**
- Scan/manual verification
- Quantity
- Package
- QC

**Allowed Actions:**
- Pick; verify; pack; hold; handover; resolve exception

**State:**
- Short pick
- Wrong item
- Damaged
- On hold
- Ready for shipping

**Handoff / Next:**
- #26

**Primary Components:**
- FulfillmentStepper
- PickList
- PackageEditor
- QCPanel
- HandoverDialog

## 15.19. Provider Shipping

**Route:** `/provider/shipping`  
**Role:** `SERVICE_PROVIDER`  
**Purpose:** Manage service-related/provider-owned shipment.

**Tampilan / Sections:**
- Shipment
- Carrier
- Tracking
- ETA
- Status
- Exceptions
- POD

**Input:**
- Carrier/method when authorized

**Allowed Actions:**
- Create; assign; monitor; exception; share

**State:**
- Created
- Ready
- Picked up
- In transit
- Delayed
- Delivered
- RTS

**Handoff / Next:**
- #26

**Primary Components:**
- ShipmentTable
- TrackingTimeline
- CarrierSelector
- ExceptionPanel

## 15.20. Provider Returns

**Route:** `/provider/returns`  
**Role:** `SERVICE_PROVIDER`  
**Purpose:** Manage authorized returns.

**Tampilan / Sections:**
- Queue
- Items
- Reason
- Evidence
- Inspection
- Resolution
- Refund/replacement

**Input:**
- Inspection data
- Decision
- Resolution

**Allowed Actions:**
- Approve; reject; request info; receive; inspect; resolve; replacement

**State:**
- Under review
- Received
- Inspection
- Partial accepted

**Handoff / Next:**
- #27/#23/#25/#26

**Primary Components:**
- ReturnTable
- InspectionPanel
- ResolutionPanel

---

# 16. WORKER / TECHNICIAN — DETAILED PAGE CONTRACTS

## 16.1. Worker Dashboard

**Route:** `/worker`  
**Role:** `WORKER_TECHNICIAN`  
**Purpose:** Assigned work cockpit.

**Tampilan / Sections:**
- Today jobs
- Next job
- Active execution
- Travel state
- Proof required
- Issues
- Notifications

**Input:**
- Date/status

**Allowed Actions:**
- Open job; start trip; continue execution; upload proof

**State:**
- No assignment
- Offline

**Handoff / Next:**
- #7/#8/#9

**Primary Components:**
- JobCard
- PriorityBadge
- ActionBar

## 16.2. Assigned Jobs

**Route:** `/worker/jobs`  
**Role:** `WORKER_TECHNICIAN`  
**Purpose:** Only assigned executions.

**Tampilan / Sections:**
- Service
- Address
- Schedule
- Priority
- Customer
- Asset
- Status

**Input:**
- Status/date

**Allowed Actions:**
- Open; tracking; communication where allowed

**State:**
- No jobs

**Handoff / Next:**
- #7

**Primary Components:**
- DataTable
- FilterBar

## 16.3. Worker Job Detail

**Route:** `/worker/jobs/[executionId]`  
**Role:** `WORKER_TECHNICIAN`  
**Purpose:** Execute assigned job.

**Tampilan / Sections:**
- Service
- Customer
- Address
- Asset
- Checklist
- Materials
- Safety
- Instructions
- Status

**Input:**
- Task inputs
- Notes
- Issue
- Material usage
- Test result

**Allowed Actions:**
- Start; pause/resume; task complete; issue; support; proof; submit execution input

**State:**
- Blocked
- Safety stop
- Reassigned
- Testing failed
- Completed

**Handoff / Next:**
- #8/#9/#10

**Primary Components:**
- ExecutionHeader
- Checklist
- TaskCard
- IssueForm
- MaterialUsage

## 16.4. Worker Tracking

**Route:** `/worker/jobs/[executionId]/tracking`  
**Role:** `WORKER_TECHNICIAN`  
**Purpose:** Travel/status tracking when relevant.

**Tampilan / Sections:**
- Destination
- Map
- Travel state
- ETA
- Session
- Last update

**Input:**
- Manual arrival fallback when policy allows

**Allowed Actions:**
- Start trip; arrive; stop tracking; retry location

**State:**
- GPS unavailable
- Offline
- Tracking ended

**Handoff / Next:**
- #8

**Primary Components:**
- MapView
- TravelStatus
- LocationStatus

## 16.5. Worker Proof

**Route:** `/worker/jobs/[executionId]/proof`  
**Role:** `WORKER_TECHNICIAN`  
**Purpose:** Capture required proof.

**Tampilan / Sections:**
- Stages
- Required checklist
- Camera/upload
- Measurement
- Test

**Input:**
- Photo/video
- Checklist
- Measurement
- Notes

**Allowed Actions:**
- Capture; upload; submit; revise

**State:**
- Uploading
- Failed
- Revision required
- Locked

**Handoff / Next:**
- #9

**Primary Components:**
- UploadDropzone
- CameraCapture
- Checklist
- MeasurementForm

## 16.6. Worker Materials

**Route:** `/worker/jobs/[executionId]/materials`  
**Role:** `WORKER_TECHNICIAN`  
**Purpose:** Use/confirm service materials.

**Tampilan / Sections:**
- Required/recommended
- Qty
- Source
- Received

**Input:**
- Qty used
- Shortage note

**Allowed Actions:**
- Confirm received/used; report shortage; request alternative

**State:**
- Missing product
- Compatibility issue

**Handoff / Next:**
- #19/#24

**Primary Components:**
- MaterialList
- QuantityControl
- IssueForm

## 16.7. Worker Shipment

**Route:** `/worker/shipments/[shipmentId]`  
**Role:** `WORKER_TECHNICIAN`  
**Purpose:** View assigned service-related shipment.

**Tampilan / Sections:**
- Package
- Tracking
- ETA
- Destination
- Handover

**Input:**
- Handover confirmation when authorized

**Allowed Actions:**
- View; confirm handover; report issue

**State:**
- Not assigned
- In transit
- Delivered

**Handoff / Next:**
- #26

**Primary Components:**
- ShipmentSummary
- PODCard
- HandoverForm

---

# 17. CUSTOMER SUPPORT — DETAILED PAGE CONTRACTS

## 17.1 Support Dashboard

**Route:** `/support`  
**Role:** `CUSTOMER_SUPPORT`  
**Purpose:** Cockpit antrean support.

**Tampilan / Sections:**
- Assigned cases
- Unassigned/available queue when permitted
- SLA at risk
- High priority
- Waiting customer/provider
- Recent escalations

**Input:**
- Status
- Priority
- Queue
- Date

**Allowed Actions:**
- Open case
- claim/assign if authorized
- escalate

**State:**
- Empty
- SLA risk
- Loading

**Handoff / Next:**
- Case detail → #12/#27/#13/#26/#23

**Components:**
- MetricCard
- CaseCard
- SLAIndicator
- FilterBar

## 17.2 Support Case Queue

**Route:** `/support/cases`  
**Role:** `CUSTOMER_SUPPORT`  
**Purpose:** Operational list kasus customer.

**Tampilan / Sections:**
- Case number
- Customer
- Related order
- Type
- Priority
- Status
- SLA
- Assigned agent

**Input:**
- Search
- Status
- Priority
- Date
- Case type

**Allowed Actions:**
- Open
- filter
- assign if allowed
- escalate

**State:**
- Empty
- Permission limited

**Handoff / Next:**
- Case detail

**Components:**
- DataTable
- FilterBar
- StatusBadge

## 17.3 Support Case Detail

**Route:** `/support/cases/[caseId]`  
**Role:** `CUSTOMER_SUPPORT`  
**Purpose:** Mengerjakan case dengan akses related/assigned.

**Tampilan / Sections:**
- Case header
- Case timeline
- Customer/provider/seller context
- Related order/payment/return/warranty/shipment
- Evidence
- Customer-visible notes
- Internal notes
- SLA

**Input:**
- Message
- Internal note
- Evidence
- Escalation reason

**Allowed Actions:**
- Respond
- request information
- escalate
- handoff finance/admin
- close when policy allows

**State:**
- Triaging
- Info required
- Waiting response
- Investigating
- Escalated
- Resolved
- Closed

**Handoff / Next:**
- #12/#13/#23/#26/#27

**Components:**
- CaseHeader
- Timeline
- EvidenceList
- ChatComposer
- RelatedEntityPanel
- SLAIndicator

## 17.4 Support Communication

**Route:** `/support/cases/[caseId]/chat`  
**Role:** `CUSTOMER_SUPPORT`  
**Purpose:** Komunikasi support.

**Tampilan / Sections:**
- Participants
- Conversation
- Templates
- Linked case

**Input:**
- Message
- Attachment

**Allowed Actions:**
- Send
- retry
- escalate

**State:**
- Offline
- Sending
- Failed

**Handoff / Next:**
- Case detail

**Components:**
- ChatThread
- ChatComposer
- QuickReplyMenu

---

# 18. FINANCE / PAYMENT OPERATIONS — DETAILED PAGE CONTRACTS

## 18.1 Finance Dashboard

**Route:** `/finance`  
**Role:** `FINANCE_PAYMENT_OPS`  
**Purpose:** Cockpit operasi finansial.

**Tampilan / Sections:**
- Payment pending/failed
- Refund queue
- Payout queue
- Reconciliation exceptions
- Settlement summary
- Financial KPI

**Input:**
- Date
- Status
- Provider/merchant

**Allowed Actions:**
- Open transaction
- reconcile
- open refund
- open payout

**State:**
- Data freshness
- Empty
- Failed integration

**Handoff / Next:**
- Payments / refunds / payouts / reconciliation

**Components:**
- MetricGrid
- DataTable
- AlertCard
- FilterBar

## 18.2 Payment Operations

**Route:** `/finance/payments`  
**Role:** `FINANCE_PAYMENT_OPS`  
**Purpose:** Monitor payment domain.

**Tampilan / Sections:**
- Intent
- Attempts
- Transactions
- Deadline
- Method
- Status
- Allocations
- Receipt reference

**Input:**
- Search
- Status
- Date
- Customer/provider/merchant

**Allowed Actions:**
- Open
- reconcile
- inspect failure
- authorized operational action

**State:**
- Processing
- Failed
- Expired
- Paid
- Requires action

**Handoff / Next:**
- #6/#23

**Components:**
- PaymentTable
- AttemptTimeline
- PaymentDetail
- StatusBadge

## 18.3 Refund Operations

**Route:** `/finance/refunds`  
**Role:** `FINANCE_PAYMENT_OPS`  
**Purpose:** Execute/monitor refund operations.

**Tampilan / Sections:**
- Refund request
- Return/order
- Requested/approved/completed amount
- Payment transaction
- Allocation
- Status
- Reason

**Input:**
- Status
- Date
- Amount
- Reason

**Allowed Actions:**
- Approve/execute/retry only when permission
- open return/order
- inspect allocation

**State:**
- Requested
- Approved
- Processing
- Failed
- Completed
- Partial

**Handoff / Next:**
- #27 ↔ #23

**Components:**
- RefundTable
- RefundDetail
- ApprovalPanel
- AllocationTable
- ConfirmationDialog

## 18.4 Payout Operations

**Route:** `/finance/payouts`  
**Role:** `FINANCE_PAYMENT_OPS`  
**Purpose:** Manage provider/merchant payout operations.

**Tampilan / Sections:**
- Beneficiary
- Eligible/pending/hold/processing/paid/failed
- Amount
- Related orders

**Input:**
- Date
- Status
- Beneficiary

**Allowed Actions:**
- Open
- hold/release when policy allows
- reconcile

**State:**
- Pending
- Hold
- Processing
- Paid
- Failed

**Handoff / Next:**
- #6

**Components:**
- PayoutTable
- PayoutDetail
- StatusBadge

## 18.5 Reconciliation

**Route:** `/finance/reconciliation`  
**Role:** `FINANCE_PAYMENT_OPS`  
**Purpose:** Mencocokkan transaksi internal vs external.

**Tampilan / Sections:**
- Batch
- Internal transaction
- External reference
- Match state
- Difference
- Adjustment case

**Input:**
- Date
- Batch
- Status
- Provider/gateway

**Allowed Actions:**
- Review
- match
- create adjustment case
- export

**State:**
- Pending
- Matched
- Mismatch
- Resolved

**Handoff / Next:**
- #6/#23

**Components:**
- ReconciliationTable
- MismatchPanel
- AuditTimeline

---

# 19. MERCHANT — DETAILED PAGE CONTRACTS

## 19.1 Merchant Dashboard

**Route:** `/merchant`  
**Role:** `MERCHANT`  
**Purpose:** Cockpit commerce own organization.

**Tampilan / Sections:**
- Sales/order summary
- Low stock
- Fulfillment queue
- Shipping delays
- Returns
- Settlement

**Input:**
- Date
- Status

**Allowed Actions:**
- Open queue
- open order/inventory/return

**State:**
- Empty
- Delayed

**Handoff / Next:**
- #22/#24/#25/#26/#27

**Components:**
- MetricGrid
- QueueCards
- AlertList

## 19.2 Merchant Products

**Route:** `/merchant/products`  
**Role:** `MERCHANT`  
**Purpose:** Manage own products/offers.

**Tampilan / Sections:**
- Product identity
- Variants
- Media
- Taxonomy
- Attributes
- Compatibility
- Offers
- Status

**Input:**
- Name
- Description
- Category/subcategory selection
- Variants
- Attributes
- Media
- Offer fields

**Allowed Actions:**
- Create
- edit
- submit for review
- activate/deactivate according to policy

**State:**
- Draft
- Pending review
- Published
- Suspended
- Archived

**Handoff / Next:**
- #20

**Components:**
- ProductTable
- ProductForm
- VariantEditor
- MediaManager
- AttributeEditor

## 19.3 Merchant Orders

**Route:** `/merchant/orders`  
**Role:** `MERCHANT`  
**Purpose:** Own seller order operations.

**Tampilan / Sections:**
- Order
- Customer limited projection
- Items
- Acceptance
- Payment state
- Fulfillment
- Shipment
- Return

**Input:**
- Search/status/date

**Allowed Actions:**
- Accept/reject where supported
- open fulfillment
- cancel when allowed

**State:**
- Pending confirmation
- Accepted
- Rejected
- Partial
- Fulfilled
- Cancelled

**Handoff / Next:**
- #22/#25/#26/#27

**Components:**
- OrderTable
- SellerOrderDetail
- ActionMenu

## 19.4 Merchant Inventory

**Route:** `/merchant/inventory`  
**Role:** `MERCHANT`  
**Purpose:** Own inventory authority surface.

**Tampilan / Sections:**
- Locations
- On hand
- Reserved
- Allocated
- Unavailable
- Available
- Holds
- Movement

**Input:**
- Location
- Product
- Stock state
- Authorized adjustment fields

**Allowed Actions:**
- Reserve/allocate context
- transfer
- adjust/reconcile when authorized

**State:**
- Low stock
- Quarantine
- Mismatch
- Held

**Handoff / Next:**
- #24

**Components:**
- InventoryTable
- StockBalanceCard
- AdjustmentDialog
- MovementTimeline

## 19.5 Merchant Fulfillment

**Route:** `/merchant/fulfillment`  
**Role:** `MERCHANT`  
**Purpose:** Prepare seller order.

**Tampilan / Sections:**
- Queue
- Items
- Pick
- Verify
- Package
- QC
- Handover
- Exceptions
- SLA

**Input:**
- Scan/manual verification
- Quantity
- Package
- QC result

**Allowed Actions:**
- Pick
- verify
- pack
- hold
- handover
- resolve exception

**State:**
- Pending
- Picking
- Verifying
- Packing
- QC fail
- Ready shipping
- Fulfilled

**Handoff / Next:**
- #26

**Components:**
- FulfillmentStepper
- PickList
- PackageEditor
- QCPanel
- HandoverDialog

## 19.6 Merchant Shipping

**Route:** `/merchant/shipping`  
**Role:** `MERCHANT`  
**Purpose:** Operate own shipments.

**Tampilan / Sections:**
- Shipment
- Package
- Carrier
- Tracking
- ETA
- Status
- Exceptions
- POD

**Input:**
- Carrier/method when authorized

**Allowed Actions:**
- Create
- assign
- monitor
- resolve exception
- share

**State:**
- Created
- Picked up
- In transit
- Delayed
- Delivered
- RTS

**Handoff / Next:**
- #26

**Components:**
- ShipmentTable
- CarrierSelector
- TrackingTimeline
- ExceptionPanel

## 19.7 Merchant Returns

**Route:** `/merchant/returns`  
**Role:** `MERCHANT`  
**Purpose:** Own return queue.

**Tampilan / Sections:**
- Return request
- Item
- Reason
- Evidence
- Inspection
- Resolution
- Refund/replacement

**Input:**
- Decision
- Inspection
- Resolution

**Allowed Actions:**
- Approve/reject
- request info
- receive
- inspect
- resolve

**State:**
- Requested
- Approved
- Received
- Inspection
- Partial
- Completed

**Handoff / Next:**
- #27

**Components:**
- ReturnTable
- InspectionPanel
- ResolutionPanel

## 19.8 Merchant Settlement

**Route:** `/merchant/settlement`  
**Role:** `MERCHANT`  
**Purpose:** Settlement read model.

**Tampilan / Sections:**
- Gross sales
- fees
- refund deductions
- payouts
- pending/paid

**Input:**
- Date/status

**Allowed Actions:**
- View
- export

**State:**
- Pending
- Paid

**Handoff / Next:**
- Finance detail when authorized

**Components:**
- SettlementTable
- SummaryCards

---

# 20. SUPPLIER — DETAILED PAGE CONTRACTS

## 20.1 Supplier Dashboard

**Route:** `/supplier`  
**Role:** `SUPPLIER`  
**Purpose:** Supply chain cockpit.

**Tampilan / Sections:**
- Supply orders
- Stock alerts
- Fulfillment queue
- Shipping exceptions
- Returns

**Input:**
- Date/status

**Allowed Actions:**
- Open queue

**State:**
- Empty
- Exception

**Handoff / Next:**
- #24/#25/#26/#27

**Components:**
- MetricGrid
- QueueCards

## 20.2 Supply Products

**Route:** `/supplier/products`  
**Role:** `SUPPLIER`  
**Purpose:** Manage authorized supply product context.

**Tampilan / Sections:**
- Product identity
- Variants
- Catalog relation
- Status

**Input:**
- Product metadata where authorized

**Allowed Actions:**
- Create/update own supply listing
- submit review

**State:**
- Draft
- Pending review
- Active
- Suspended

**Handoff / Next:**
- #20

**Components:**
- ProductTable
- ProductForm

## 20.3 Supply Inventory

**Route:** `/supplier/inventory`  
**Role:** `SUPPLIER`  
**Purpose:** Operate supply inventory.

**Tampilan / Sections:**
- Location
- On hand
- Reserved
- Allocated
- Available
- Movement

**Input:**
- Filters
- authorized stock inputs

**Allowed Actions:**
- View
- transfer
- reconcile/adjust according to permission

**State:**
- Low stock
- Quarantine
- Mismatch

**Handoff / Next:**
- #24

**Components:**
- InventoryTable
- MovementTimeline
- AdjustmentDialog

## 20.4 Supply Fulfillment

**Route:** `/supplier/fulfillment`  
**Role:** `SUPPLIER`  
**Purpose:** Prepare supply shipments.

**Tampilan / Sections:**
- Pick
- Verify
- Pack
- QC
- Handover
- Exceptions

**Input:**
- Scan/manual
- Quantity
- Package
- QC

**Allowed Actions:**
- Pick
- verify
- pack
- hold
- handover

**State:**
- Exception
- Ready shipping

**Handoff / Next:**
- #26

**Components:**
- FulfillmentStepper
- PackageEditor
- QCPanel

## 20.5 Supply Shipping

**Route:** `/supplier/shipping`  
**Role:** `SUPPLIER`  
**Purpose:** Operate supply shipments.

**Tampilan / Sections:**
- Shipment
- Carrier
- Tracking
- ETA
- Status
- Exception

**Input:**
- Carrier/method

**Allowed Actions:**
- Create
- monitor
- exception handling

**State:**
- Delayed
- Failed
- Delivered
- RTS

**Handoff / Next:**
- #26

**Components:**
- ShipmentTable
- TrackingTimeline
- ExceptionPanel

## 20.6 Supply Returns

**Route:** `/supplier/returns`  
**Role:** `SUPPLIER`  
**Purpose:** Handle authorized supply returns.

**Tampilan / Sections:**
- Return
- Reason
- Inspection
- Disposition
- Replacement/refund context

**Input:**
- Inspection
- Disposition

**Allowed Actions:**
- Review
- inspect
- resolve

**State:**
- Received
- Inspection
- Completed

**Handoff / Next:**
- #27/#24

**Components:**
- ReturnTable
- InspectionPanel
- DispositionPanel

---

# 21. ADMIN / OPERATIONS — DETAILED PAGE CONTRACTS

## 21.1 Admin Dashboard

**Route:** `/admin`  
**Role:** `ADMIN_OPERATIONS`  
**Purpose:** Platform operations cockpit.

**Tampilan / Sections:**
- Orders/bookings
- Disputes
- Returns
- Shipping exceptions
- Moderation
- SLA
- Provider/merchant status
- System health

**Input:**
- Date
- Feature/category/status
- Severity

**Allowed Actions:**
- Open issue
- investigate
- controlled intervention

**State:**
- Partial system failure
- No incidents

**Handoff / Next:**
- All features via deep links

**Components:**
- MetricGrid
- IncidentList
- SLAWidget
- ExceptionCard

## 21.2 Users & Organizations

**Route:** `/admin/users`  
**Role:** `ADMIN_OPERATIONS`  
**Purpose:** Identity and membership operations.

**Tampilan / Sections:**
- User
- Role
- Organization
- Membership
- Account status
- Security events

**Input:**
- Search
- status
- role
- organization
- governed role fields

**Allowed Actions:**
- View
- suspend/reinstate where authorized
- manage membership via governed flow

**State:**
- Active
- Suspended
- Locked

**Handoff / Next:**
- Middleware / access context

**Components:**
- DataTable
- UserDetail
- RoleMembershipPanel
- AuditTimeline

## 21.3 Taxonomy Management

**Route:** `/admin/taxonomy`  
**Role:** `ADMIN_OPERATIONS`  
**Purpose:** Manage centrally controlled service/product taxonomy.

**Tampilan / Sections:**
- Category tree
- Subcategory
- Service
- Status
- Provider requests

**Input:**
- Name
- Description
- Parent
- Status
- Governance note

**Allowed Actions:**
- Create/update/deactivate
- review provider request
- publish after approval

**State:**
- Draft
- Pending
- Active
- Archived

**Handoff / Next:**
- #1/#20

**Components:**
- TreeView
- TaxonomyEditor
- ApprovalPanel

## 21.4 Service Operations

**Route:** `/admin/services`  
**Role:** `ADMIN_OPERATIONS`  
**Purpose:** Operate service catalog/offering issues.

**Tampilan / Sections:**
- Service
- Offering
- Provider
- Booking type compatibility
- Status

**Input:**
- Filters
- controlled edit

**Allowed Actions:**
- Review
- suspend
- resolve issue

**State:**
- Active
- Suspended
- Archived

**Handoff / Next:**
- #1/#2/#4

**Components:**
- DataTable
- OfferingDetail
- ActionPanel

## 21.5 Product Operations

**Route:** `/admin/products`  
**Role:** `ADMIN_OPERATIONS`  
**Purpose:** Moderate product catalog.

**Tampilan / Sections:**
- Product
- Variant
- Offer
- Seller
- Compatibility
- Status

**Input:**
- Search/filter
- review fields

**Allowed Actions:**
- Approve/reject/suspend/unpublish

**State:**
- Pending
- Published
- Suspended
- Archived

**Handoff / Next:**
- #20

**Components:**
- ProductModerationTable
- ProductDetail
- ApprovalPanel

## 21.6 Order Operations

**Route:** `/admin/orders`  
**Role:** `ADMIN_OPERATIONS`  
**Purpose:** Platform-wide order investigation.

**Tampilan / Sections:**
- Service/product orders
- State
- Related domains
- Audit

**Input:**
- Search
- status/date/customer/provider/seller

**Allowed Actions:**
- View
- investigate
- controlled override

**State:**
- Any order state

**Handoff / Next:**
- #3/#22

**Components:**
- OrderTable
- Order360View
- AuditTimeline

## 21.7 Dispute Center

**Route:** `/admin/disputes`  
**Role:** `ADMIN_OPERATIONS`  
**Purpose:** Formal dispute operations.

**Tampilan / Sections:**
- Case
- Parties
- Evidence
- Statements
- SLA
- Resolution
- Appeal

**Input:**
- Resolution inputs
- notes
- escalation

**Allowed Actions:**
- Investigate
- request info
- propose/record resolution
- escalate
- override per policy

**State:**
- Triaging
- Investigating
- Negotiating
- Escalated
- Resolved
- Appeal

**Handoff / Next:**
- #12

**Components:**
- CaseTable
- Case360
- EvidencePanel
- ResolutionPanel
- SLAIndicator

## 21.8 Warranty Operations

**Route:** `/admin/warranties`  
**Role:** `ADMIN_OPERATIONS`  
**Purpose:** Warranty claim operations.

**Tampilan / Sections:**
- Contracts
- Claims
- Coverage
- Inspection
- Decision

**Input:**
- Decision
- Inspection notes

**Allowed Actions:**
- Review
- inspect
- approve/reject
- controlled intervention

**State:**
- Pending
- Inspection
- Eligible
- Rejected
- Fulfilled

**Handoff / Next:**
- #13

**Components:**
- WarrantyTable
- ClaimDetail
- InspectionPanel

## 21.9 Inventory Operations

**Route:** `/admin/inventory`  
**Role:** `ADMIN_OPERATIONS`  
**Purpose:** Platform inventory monitoring.

**Tampilan / Sections:**
- Owner
- Location
- Balances
- Reservations
- Allocations
- Holds
- Reconciliation

**Input:**
- Owner/location/product/status filters

**Allowed Actions:**
- Investigate
- controlled adjustment workflow
- reconcile

**State:**
- Mismatch
- Quarantine
- Held

**Handoff / Next:**
- #24

**Components:**
- InventoryTable
- BalanceDetail
- MovementTimeline
- ReconciliationPanel

## 21.10 Fulfillment Operations

**Route:** `/admin/fulfillment`  
**Role:** `ADMIN_OPERATIONS`  
**Purpose:** Monitor fulfillment across owners.

**Tampilan / Sections:**
- Fulfillment queue
- Package
- Exceptions
- SLA

**Input:**
- Status/owner/location

**Allowed Actions:**
- Investigate
- hold/release
- controlled override

**State:**
- Exception
- On hold
- Partial

**Handoff / Next:**
- #25

**Components:**
- FulfillmentTable
- FulfillmentDetail
- ExceptionPanel

## 21.11 Shipping Operations

**Route:** `/admin/shipping`  
**Role:** `ADMIN_OPERATIONS`  
**Purpose:** Monitor shipment operations.

**Tampilan / Sections:**
- Shipment
- Carrier
- Tracking
- ETA
- Exceptions
- SLA

**Input:**
- Carrier/status/region

**Allowed Actions:**
- Investigate
- manage exception
- controlled override

**State:**
- Delayed
- Lost
- Damaged
- RTS

**Handoff / Next:**
- #26

**Components:**
- ShipmentTable
- Shipment360
- TrackingTimeline
- ExceptionPanel

## 21.12 Return Operations

**Route:** `/admin/returns`  
**Role:** `ADMIN_OPERATIONS`  
**Purpose:** Monitor return/refund/replacement.

**Tampilan / Sections:**
- Return
- Eligibility
- Inspection
- Resolution
- Refund
- Replacement

**Input:**
- Status/reason/seller

**Allowed Actions:**
- Investigate
- controlled override
- coordinate finance

**State:**
- High risk
- Disputed
- Inspection
- Refund pending

**Handoff / Next:**
- #27

**Components:**
- ReturnTable
- Return360
- InspectionPanel
- RefundContext

## 21.13 Moderation

**Route:** `/admin/moderation`  
**Role:** `ADMIN_OPERATIONS`  
**Purpose:** Review flagged content/evidence/reviews.

**Tampilan / Sections:**
- Flag
- content
- report
- target
- status

**Input:**
- Moderation decision
- reason

**Allowed Actions:**
- Flag/hide/remove/restore according to policy

**State:**
- Queued
- Under review
- Resolved

**Handoff / Next:**
- #9/#11/#12

**Components:**
- ModerationQueue
- ContentViewer
- DecisionPanel

## 21.14 Audit & Security

**Route:** `/admin/audit`  
**Role:** `ADMIN_OPERATIONS`  
**Purpose:** Inspect critical platform actions.

**Tampilan / Sections:**
- Actor
- role
- organization
- action
- resource
- timestamp
- result
- reason

**Input:**
- Search/filter/export

**Allowed Actions:**
- View; export according to policy

**State:**
- Large dataset
- Sensitive

**Handoff / Next:**
- All features

**Components:**
- AuditTimeline
- FilterBar
- DataTable

---

# 22. CEO / PRODUCT OWNER — DETAILED PAGE CONTRACTS

## 22.1 Executive Dashboard

**Route:** `/ceo`  
**Role:** `CEO_PRODUCT_OWNER`  
**Purpose:** Aggregate platform health.

**Tampilan / Sections:**
- Orders
- Revenue/GMV context
- Service demand
- Product volume
- Category trends
- Rating
- Cancellation
- Returns/refunds
- SLA
- Supply/demand

**Input:**
- Period
- Category
- Region
- Role/org aggregation

**Allowed Actions:**
- Drill into analytics
- open policy area

**State:**
- Data freshness
- Metric unavailable

**Handoff / Next:**
- Governance/analytics

**Components:**
- MetricGrid
- TrendChart
- CategoryTable
- SLAWidget

## 22.2 Taxonomy Governance

**Route:** `/ceo/taxonomy`  
**Role:** `CEO_PRODUCT_OWNER`  
**Purpose:** Govern taxonomy strategy and approval context.

**Tampilan / Sections:**
- Category tree
- Demand/supply
- Provider requests
- Performance

**Input:**
- Governance decision fields
- filters

**Allowed Actions:**
- Approve/reject/configure within authority

**State:**
- Pending review
- Active

**Handoff / Next:**
- #1/#20

**Components:**
- TaxonomyTree
- ApprovalPanel
- AnalyticsTable

## 22.3 Fee / Pricing Governance

**Route:** `/ceo/policies/fees`  
**Role:** `CEO_PRODUCT_OWNER`  
**Purpose:** Configure platform fee hierarchy.

**Tampilan / Sections:**
- Global/category/subcategory/service/product scope
- Fee type
- Payer
- Effective dates
- Version

**Input:**
- Scope
- Percentage/fixed
- Amount
- Payer
- Effective date

**Allowed Actions:**
- Create/version/activate
- preview impact

**State:**
- Draft
- Scheduled
- Active
- Expired

**Handoff / Next:**
- #4/#6/#23

**Components:**
- PolicyEditor
- FeePreview
- VersionTimeline

## 22.4 Shipping / Return Policy

**Route:** `/ceo/policies`  
**Role:** `CEO_PRODUCT_OWNER`  
**Purpose:** Govern shipping/return policies and SLA.

**Tampilan / Sections:**
- Policy versions
- Shipping SLA
- Return window
- Return responsibility
- Scope

**Input:**
- Policy fields
- effective date
- scope

**Allowed Actions:**
- Create/version/activate

**State:**
- Draft
- Scheduled
- Active
- Expired

**Handoff / Next:**
- #26/#27

**Components:**
- PolicyTabs
- PolicyEditor
- VersionHistory

## 22.5 AI Monitoring

**Route:** `/ceo/ai`  
**Role:** `CEO_PRODUCT_OWNER`  
**Purpose:** Monitor recommendation/AI systems.

**Tampilan / Sections:**
- Model version
- Recommendation metrics
- Fallback
- Feedback
- Quality
- Risk signals

**Input:**
- Date/model/category filters

**Allowed Actions:**
- Analyze
- govern model/policy
- open monitoring

**State:**
- Fallback active
- Model issue
- Healthy

**Handoff / Next:**
- #18

**Components:**
- MetricGrid
- ModelTable
- MonitoringPanel

---

# 23. CROSS-FEATURE FRONTEND CONTRACT — FEATURE #1–#27

Setiap feature berikut memiliki frontend contract. Detail ini merupakan terjemahan dari business rules yang sudah di-lock menjadi UI/interaction, bukan perubahan business rule.

## 23.1 Feature #1 — Discovery

**Surface:** Surface: home, search, categories, service/provider detail, smart discovery entry.

**Input:** Keyword/problem/provider search; category; subcategory; location; filters; sort; optional natural-language problem.

**Allowed actions:** Search, filter, sort, open entity, favorite, start smart discovery.

**Handoff:** Primary result → #2 or #20; AI-assisted search → #18.

**State handling:** Empty search, no results, stale recommendation, location unavailable.

**Primary components:** SearchBar, FilterBar, SortMenu, ServiceCard, ProviderCard, CategoryGrid, RecommendationCard.

## 23.2 Feature #2 — Booking Jasa

**Surface:** Surface: booking wizard, booking detail, booking summary.

**Input:** Service offering, booking type, service mode, schedule/slot, address, asset, issue, attachments, preferences, notes, survey-fee notice.

**Allowed actions:** Edit allowed fields, save draft, slot select, submit, confirm, cancel/reschedule where policy allows.

**Handoff:** Confirmed booking → #3; quotation path → #4.

**State handling:** Slot expired, provider unavailable, service-area conflict, validation failure, policy change.

**Primary components:** BookingStepper, DynamicFieldRenderer, SchedulePicker, AddressPicker, AssetSelector, FeeNotice.

## 23.3 Feature #3 — Order Jasa

**Surface:** Surface: service order list/detail.

**Input:** Mostly snapshot/read context; cancel reason or issue form where relevant.

**Allowed actions:** View, cancel where allowed, follow payment/execution/proof/completion, rebook.

**Handoff:** Order opens linked #4–#17 surfaces.

**State handling:** Pending, confirmed, processing, cancelled, completed, disputed.

**Primary components:** OrderHeader, OrderStepper, ActionBar, ContextTabs.

## 23.4 Feature #4 — Pricing & Quotation

**Surface:** Surface: quotation detail/workspace, price breakdown.

**Input:** Scope, included/excluded, price items, materials, fees, survey fee, validity, negotiation fields.

**Allowed actions:** Provider: draft/send/revise/cancel. Customer: accept/reject/request revision.

**Handoff:** Accepted quotation → #6 Payment.

**State handling:** Draft, sent, viewed, negotiating, revised, accepted, rejected, expired.

**Primary components:** QuotationEditor, PriceBreakdown, VersionTimeline, FeeEditor, AcceptancePanel.

## 23.5 Feature #5 — Communication

**Surface:** Surface: contextual chat.

**Input:** Message, attachments, optional quick replies.

**Allowed actions:** Send, retry, attach, report, jump to linked resource.

**Handoff:** Contextual sidecar to booking/order/execution/dispute/etc.

**State handling:** Offline, sending, failed, closed.

**Primary components:** ChatThread, ChatComposer, AttachmentPreview, ContextBanner.

## 23.6 Feature #6 — Payment & Protection Jasa

**Surface:** Surface: payment page/detail, protection/escrow card.

**Input:** Payment method, amount, due date/countdown, additional charge approval, survey-fee context.

**Allowed actions:** Pay, retry valid intent, approve additional cost, view receipt, view refund.

**Handoff:** Payment state gates/permits later flow; refund → payment layer.

**State handling:** Requires payment/action, processing, paid, failed, expired, refund states.

**Primary components:** PaymentSummary, Countdown, PaymentMethodList, PriceBreakdown, ProtectionStatus.

## 23.7 Feature #7 — Service Execution

**Surface:** Surface: provider/worker execution workspace.

**Input:** Tasks, checklist, issue, pause reason, materials, tests, progress, notes.

**Allowed actions:** Start, pause/resume, assign/reassign, task/checklist, report issue, add requirement, submit completion.

**Handoff:** Events consumed by #8; proof → #9; completion → #10.

**State handling:** Preparing, ready, started, in progress, paused, blocked, safety stop, testing, partial, failed.

**Primary components:** ExecutionHeader, TaskList, ChecklistEditor, IssuePanel, MaterialPanel, TestPanel.

## 23.8 Feature #8 — Tracking Detail Jasa

**Surface:** Surface: service tracking.

**Input:** Status, map when relevant, ETA, distance, timeline, session freshness, share.

**Allowed actions:** Refresh/share; provider-worker manual fallback fields when allowed.

**Handoff:** Tracking visualizes execution; does not replace #7.

**State handling:** Not started, on the way, arrived, active, paused, offline, completion pending, ended.

**Primary components:** MapView, TrackingTimeline, ETAChip, ShareDialog, StaleBanner.

## 23.9 Feature #9 — Proof of Service

**Surface:** Surface: provider proof builder + customer review.

**Input:** Required evidence, stages, media, checklist, measurements, tests, materials, report, version.

**Allowed actions:** Capture/upload, save draft, submit, customer accept/request revision.

**Handoff:** Proof package → #10; evidence supports #12/#13/#14/#19.

**State handling:** Uploading, validating, submitted, revision required, accepted, locked.

**Primary components:** ProofBuilder, UploadDropzone, MediaGallery, ChecklistEditor, MeasurementForm, TestResult.

## 23.10 Feature #10 — Completion & Customer Confirmation

**Surface:** Surface: provider submit + customer confirmation.

**Input:** Execution/proof/scope/additional-cost/issues summary, deadline.

**Allowed actions:** Customer confirm/report issue; provider submit/rework.

**Handoff:** Completed → #11/#13/#14; issue → #12.

**State handling:** Not ready, submitted, awaiting customer, reviewed, revision, disputed, auto-completion pending, completed.

**Primary components:** CompletionSummary, ConfirmationPanel, IssueReportForm, DeadlineBanner.

## 23.11 Feature #11 — Rating & Review

**Surface:** Surface: review form/list/provider reputation.

**Input:** 1–5 overall, dimensions, tags, text, optional media, provider response.

**Allowed actions:** Submit review; provider response; report.

**Handoff:** Signals can feed #1/#18.

**State handling:** Not eligible, draft, submitted, published, flagged, hidden.

**Primary components:** StarRating, RatingForm, TagSelector, ReviewList, ResponseForm.

## 23.12 Feature #12 — Complaint / Dispute

**Surface:** Surface: customer/provider/admin case center.

**Input:** Category, severity/priority, statements, evidence, SLA, resolution, appeals.

**Allowed actions:** Statement, evidence, response, resolution acceptance/rejection, appeal.

**Handoff:** Can block/affect #10/#13/#27 and financial holds in #6/#23.

**State handling:** Draft, submitted, triaging, info required, investigating, negotiating, escalated, resolved, closed.

**Primary components:** CaseHeader, EvidenceList, CaseTimeline, SLAIndicator, ResolutionPanel, AppealPanel.

## 23.13 Feature #13 — Warranty

**Surface:** Surface: warranty list/detail/claim.

**Input:** Contract, source, coverage, exclusions, dates/usage, related service/product/asset.

**Allowed actions:** Claim, evidence, inspection/resolution responses, appeal.

**Handoff:** Claim may use #7–#10 for rework; dispute → #12.

**State handling:** Active, claim submitted, under review, inspection, eligible, approved, rejected, expired, fulfilled.

**Primary components:** WarrantySummary, CoverageList, ClaimForm, InspectionPanel, ResolutionPanel.

## 23.14 Feature #14 — Service History

**Surface:** Surface: history/logbook.

**Input:** Historical snapshot, provider/service/scope/result/price context, proof, warranty, asset links.

**Allowed actions:** Filter; personal notes/labels.

**Handoff:** Open #15 asset, #16 maintenance, #17 rebooking.

**State handling:** Pending, generated, published, updated, locked, archived; imported not verified.

**Primary components:** HistoryTimeline, HistoryCard, NoteEditor, ShareDialog.

## 23.15 Feature #15 — Asset

**Surface:** Surface: asset list/detail/register/edit.

**Input:** Type-specific identity, ownership/users, location, condition, components, documents, photos, verification.

**Allowed actions:** Dynamic attributes, location, docs/photos, access/transfer.

**Handoff:** Asset context → #14/#16/#19.

**State handling:** Draft, registered, active, under service/maintenance/repair, transferred, retired, archived.

**Primary components:** AssetHeader, DynamicFieldRenderer, ComponentTree, DocumentList, AccessPanel.

## 23.16 Feature #16 — Maintenance & Reminder

**Surface:** Surface: maintenance dashboard/plan.

**Input:** Asset, plan, trigger, next due, occurrence, reminder, compliance/warranty relation.

**Allowed actions:** Schedule/reschedule/snooze/skip/pause fields.

**Handoff:** Due → #2 booking; completion → #14 history and next schedule.

**State handling:** Upcoming, due, overdue, in service, completed, skipped, cancelled, rescheduled.

**Primary components:** MaintenanceCard, ReminderBanner, PlanSummary, ScheduleEditor.

## 23.17 Feature #17 — Rebooking / Favorite / Loyalty

**Surface:** Surface: favorites, book-again CTA, loyalty wallet.

**Input:** Targets, previous order context, points balance/ledger/rewards/campaign.

**Allowed actions:** Repeat confirmation, favorite toggle, reward selection.

**Handoff:** Book Again → current #2 flow after revalidation.

**State handling:** Favorite active/inactive; points earned/redeemed/expired/reversed; rewards unavailable.

**Primary components:** FavoriteCard, BookAgainCard, BalanceCard, LedgerTable, RewardCard.

## 23.18 Feature #18 — Smart Recommendation & AI Agent

**Surface:** Surface: AI assistant, recommendation cards.

**Input:** Conversation context, retrieved services/providers/products, explanation, tool results.

**Allowed actions:** Natural-language prompt, answers, confirmation for transactional actions.

**Handoff:** AI hands off to normal #1–#27 flow.

**State handling:** Loading, fallback, blocked action, ambiguous result.

**Primary components:** ChatPanel, RecommendationCard, ExplanationCard, ConfirmationDialog, ToolResultCard.

## 23.19 Feature #19 — Service + Product Integration

**Surface:** Surface: product requirement panel inside service/order/execution.

**Input:** Requirement type, reason, compatibility, source, options, price, approval, received/used state.

**Allowed actions:** Quantity, product option, source, customer approval.

**Handoff:** Handoff → #20–#27 or back to #7.

**State handling:** No compatible product, out of stock, approval pending, received, used/installed.

**Primary components:** RequirementCard, CompatibilityPanel, ProductOptionList, ApprovalPanel.

## 23.20 Feature #20 — Product Discovery

**Surface:** Surface: product search/detail/offers.

**Input:** Product/variant, specs, media, compatibility, seller/offer, price, availability signal.

**Allowed actions:** Keyword, taxonomy, attributes, compatibility target, seller, price/location filters.

**Handoff:** Add/selection → #21.

**State handling:** Unavailable, out of stock, not verified compatibility, no result.

**Primary components:** ProductGrid, ProductCard, OfferList, CompatibilityPanel, FilterBar.

## 23.21 Feature #21 — Cart

**Surface:** Surface: cart/groups/validation.

**Input:** Seller group, context, product/variant/offer, quantity, price snapshot, validation.

**Allowed actions:** Quantity, selection, remove.

**Handoff:** Selected valid items → #22.

**State handling:** Price changed, out of stock, seller unavailable, compatibility conflict, expired.

**Primary components:** CartGroup, CartItem, QuantityControl, ValidationAlert, CartSummary.

## 23.22 Feature #22 — Booking / Order Barang

**Surface:** Surface: product checkout/order/reservation.

**Input:** Order preview, seller groups, address, shipping, booking slot, cancellation, acceptance.

**Allowed actions:** Address, shipping method, reservation slot, confirmation.

**Handoff:** Confirm → #23/#24/#25; booking lifecycle may be separate from order.

**State handling:** Pending confirmation, seller partial acceptance, confirmed, processing, fulfilled, cancelled.

**Primary components:** CheckoutStepper, OrderPreview, SellerGroup, ReservationPanel.

## 23.23 Feature #23 — Payment Barang

**Surface:** Surface: payment/countdown/receipt.

**Input:** Amount, server due time, countdown, methods, attempts, status, receipt.

**Allowed actions:** Payment method; action.

**Handoff:** Successful payment enables downstream according to policy.

**State handling:** Normal, warning, expiring soon, expired, failed, processing, paid.

**Primary components:** Countdown, PaymentMethodList, AttemptTimeline, ReceiptCard.

## 23.24 Feature #24 — Inventory

**Surface:** Surface: customer availability signal + operational inventory pages.

**Input:** Available/reserved/allocated/on hand/unavailable and location for authorized roles.

**Allowed actions:** Operational filter and adjustment fields where allowed.

**Handoff:** Inventory feeds #21 validation/#25 fulfillment/#27 disposition.

**State handling:** Available, limited, out of stock, pre-order, unknown; quarantine/hold internally.

**Primary components:** StockBadge, InventoryTable, BalanceCard, MovementTimeline, ReservationStatus.

## 23.25 Feature #25 — Fulfillment Barang

**Surface:** Surface: fulfillment queue/workspace.

**Input:** Pick, verify, pack, QC, package, handover, exceptions, SLA.

**Allowed actions:** Scan/manual verification, quantity, package, QC.

**Handoff:** Pick, verify, pack, hold, handover, resolve exception.

**State handling:** Pending, picking, verifying, packing, QC, ready shipping, partial, failed, on hold.

**Primary components:** FulfillmentStepper, PickList, PackageEditor, QCPanel, HandoverDialog.

## 23.26 Feature #26 — Shipping & Tracking Barang

**Surface:** Surface: shipment creation/detail/tracking.

**Input:** Shipment, package, carrier, tracking number, status, ETA, timeline, attempts, POD, exceptions.

**Allowed actions:** Carrier/method when authorized; share/report inputs.

**Handoff:** Create/assign/monitor/exception/share/POD review.

**State handling:** Created, ready, pickup requested, picked up, transit, destination, out for delivery, attempted, delivered, lost, damaged, RTS.

**Primary components:** ShipmentTable, ShipmentHeader, TrackingTimeline, MapView, ETACard, PODCard, ExceptionPanel.

## 23.27 Feature #27 — Return / Refund Barang

**Surface:** Surface: return center/create/detail, inspection, resolution.

**Input:** Eligibility/policy, items, quantity, reason, evidence, shipment, inspection, disposition, refund, replacement.

**Allowed actions:** Item, quantity, reason, evidence, resolution preference, inspection data for operators.

**Handoff:** Request, approve/reject, receive, inspect, resolve, refund handoff, replacement.

**State handling:** Requested, approved, return shipped, received, inspection, refund pending, replacement, completed, expired.

**Primary components:** ReturnForm, EligibilityBanner, EvidenceList, InspectionPanel, ResolutionPanel, RefundStatus, ReplacementCard.

---

# 24. CROSS-FEATURE FLOW SCENARIOS

## 24.1 Standard Service

```text
Customer Home → #1 Discovery → #2 Booking → #3 Order → #4 Pricing if needed → #5 Communication → #6 Payment → #7 Execution → #8 Tracking → #9 Proof → #10 Completion → #11 Rating → #14 History → #13 Warranty if applicable → #16 Maintenance if applicable → #17 Rebook/Loyalty.
```


## 24.2 Smart Problem-to-Service

```text
Customer → #18 Smart Discovery → structured answers → possible service → #1 Service/Provider discovery → #2 Booking → normal service flow.
```


## 24.3 Quotation Service

```text
Discovery → Booking → Order → #4 Quotation DRAFT → SENT → customer views → negotiation/revision if required → ACCEPTED → #6 Payment → #7 Execution.
```


## 24.4 Service With Material

```text
Service → #19 Product Requirement → #20 Product Discovery → #21 Cart or service-related procurement → #22 Order → #23 Payment → #24 Inventory → #25 Fulfillment → #26 Shipping → Provider/Worker receives → #7 Execution → Product Used/Installed → #9/#10 → #14/#15 → warranty/maintenance.
```


## 24.5 Maintenance-triggered Service

```text
Asset #15 → Maintenance Plan #16 → Reminder → customer books #2 → #3 Order → normal execution/proof/completion → next maintenance schedule.
```


## 24.6 Service Issue

```text
Execution/Tracking/Proof/Completion → issue detected → #12 Complaint/Dispute → resolution such as rework, additional service, price adjustment, partial/full refund → related domain resumes.
```


## 24.7 Product Purchase

```text
Public/Product Discovery #20 → Product Detail → #21 Cart → #22 Order → #23 Payment → #24 Inventory → #25 Fulfillment → #26 Shipping → Delivered.
```


## 24.8 Product Return

```text
Delivered → #27 Return Request → eligibility → approval → return shipment via #26 infrastructure → received → inspection → disposition via #24 → refund via #23 or replacement via #25/#26 → complete.
```


## 24.9 Product Delivery Issue

```text
#26 Delivery Attempted/Lost/Damaged/RTS → #27 and/or #12 according to issue → resolution.
```


## 24.10 Multi-role Worker

```text
User with Provider + Worker memberships → active context Worker → assigned job → #7/#8/#9/#10 only for assigned scope. Switching to Provider exposes organization-level provider surfaces subject to permission.
```


---

# 25. EXACT FILES / MODULES TO CREATE

Struktur berikut menjadi target implementasi. Tidak semua file harus dibuat pada hari pertama; file dibuat bertahap sesuai milestone. Yang penting setiap responsibility memiliki rumah yang jelas.

## 25.1 App Routes

```text
src/app/
├── (public)/
│   ├── page.tsx
│   ├── search/page.tsx
│   ├── categories/page.tsx
│   ├── categories/[categoryId]/page.tsx
│   ├── services/[serviceId]/page.tsx
│   ├── providers/[providerId]/page.tsx
│   ├── smart-discovery/page.tsx
│   └── products/
│       ├── page.tsx
│       └── [productId]/page.tsx
│
├── (customer)/
│   ├── bookings/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [bookingId]/page.tsx
│   ├── orders/
│   │   ├── page.tsx
│   │   ├── [orderId]/page.tsx
│   │   └── products/[orderId]/page.tsx
│   ├── payments/
│   │   ├── [paymentId]/page.tsx
│   │   └── products/[paymentId]/page.tsx
│   ├── chat/[conversationId]/page.tsx
│   ├── tracking/
│   │   ├── service/[orderId]/page.tsx
│   │   └── shipment/[shipmentId]/page.tsx
│   ├── warranties/
│   │   ├── page.tsx
│   │   └── [warrantyId]/page.tsx
│   ├── history/page.tsx
│   ├── assets/
│   │   ├── page.tsx
│   │   └── [assetId]/page.tsx
│   ├── maintenance/
│   │   ├── page.tsx
│   │   └── [planId]/page.tsx
│   ├── favorites/page.tsx
│   ├── loyalty/page.tsx
│   ├── recommendations/page.tsx
│   ├── cart/page.tsx
│   ├── checkout/products/page.tsx
│   ├── reviews/[orderId]/page.tsx
│   ├── complaints/[caseId]/page.tsx
│   ├── returns/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [returnId]/page.tsx
│   └── support/page.tsx
│
├── (business)/
│   ├── provider/...
│   ├── worker/...
│   ├── merchant/...
│   └── supplier/...
│
├── (ops)/
│   ├── support/...
│   ├── finance/...
│   └── admin/...
│
└── (executive)/
    └── ceo/...
```

## 25.2 Feature Component Families

| Feature folder | Expected component examples |
| --- | --- |
| discovery | SearchBar, SearchResultList, CategoryGrid, ServiceCard, ProviderCard, SmartDiscoveryCTA |
| booking | BookingStepper, DynamicFieldRenderer, SchedulePicker, AddressPicker, BookingSummary |
| order | OrderHeader, OrderTimeline, OrderCard, OrderActionBar |
| pricing | QuotationCard, QuotationEditor, PriceBreakdown, FeeLineItem, VersionTimeline |
| communication | ChatThread, ChatComposer, AttachmentPreview, ConversationContext |
| payment | PaymentSummary, PaymentMethodList, Countdown, AttemptTimeline, ProtectionStatus |
| execution | ExecutionHeader, TaskList, ChecklistEditor, IssuePanel, MaterialPanel, TestPanel |
| tracking | MapView, TrackingTimeline, ETAChip, TrackingShareDialog, FreshnessBanner |
| proof | ProofPackage, ProofBuilder, MediaGallery, ChecklistView, MeasurementForm, TestResult |
| completion | CompletionSummary, ConfirmationPanel, IssueReportForm, DeadlineBanner |
| review | StarRating, RatingForm, TagSelector, ReviewList, ProviderResponse |
| dispute | CaseHeader, CaseTimeline, EvidenceList, ResolutionPanel, SLAIndicator, AppealPanel |
| warranty | WarrantyCard, WarrantySummary, CoverageList, ClaimForm, InspectionPanel |
| history | HistoryCard, HistoryTimeline, NoteEditor, HistoryShareDialog |
| asset | AssetCard, AssetHeader, DynamicFieldRenderer, ComponentTree, DocumentList, AccessPanel |
| maintenance | MaintenanceCard, ReminderBanner, PlanSummary, ScheduleEditor |
| loyalty | FavoriteCard, BookAgainCard, BalanceCard, LedgerTable, RewardCard |
| ai | AIChatPanel, RecommendationCard, ExplanationCard, ToolResultCard, AIActionConfirmation |
| service-product | RequirementCard, CompatibilityPanel, ProductOptionList, ApprovalPanel, MaterialStatus |
| product | ProductCard, ProductGrid, ProductGallery, VariantSelector, OfferList, CompatibilityPanel |
| cart | CartGroup, CartItem, QuantityControl, CartValidation, CartSummary |
| commerce-order | OrderPreview, SellerGroup, ReservationPanel, ProductOrderStatus |
| commerce-payment | ProductPaymentSummary, PaymentCountdown, AttemptTimeline, ReceiptCard |
| inventory | StockBadge, InventoryTable, BalanceCard, MovementTimeline, ReservationStatus |
| fulfillment | FulfillmentStepper, PickList, PackageEditor, QCPanel, HandoverDialog |
| shipping | ShipmentHeader, ShipmentTable, TrackingTimeline, CarrierSelector, PODCard, ExceptionPanel |
| return-refund | ReturnForm, EligibilityBanner, ReturnTimeline, InspectionPanel, DispositionPanel, RefundStatus, ReplacementCard |

## 25.3 Shared Infrastructure Files

```text
src/components/ui/*.tsx
src/components/layout/*.tsx
src/components/navigation/*.tsx
src/components/feedback/*.tsx
src/components/form/*.tsx
src/components/data-display/*.tsx
src/components/map/*.tsx

src/lib/auth/session.ts
src/lib/auth/context.ts
src/lib/permissions/hasPermission.ts
src/lib/permissions/hasScope.ts
src/lib/permissions/isRelated.ts
src/lib/formatters/currency.ts
src/lib/formatters/date.ts
src/lib/formatters/status.ts
src/lib/validators/*.ts

src/hooks/useActiveRole.ts
src/hooks/usePermission.ts
src/hooks/useOrganization.ts
src/hooks/useDebouncedSearch.ts
src/hooks/useCountdown.ts
src/hooks/useMediaUpload.ts

src/mocks/fixtures/*.ts
src/mocks/scenarios/*.ts
src/mocks/factories/*.ts

src/types/*.ts
src/config/navigation.ts
src/config/status.ts
src/config/feature-flags.ts
```

## 25.4 Important Rule: Do Not Create One Full-Page File

- `page.tsx` should compose existing components.
- Complex forms should be separate components with schema/type files.
- Tables should not define all columns, filters, and cell interaction inline if those pieces are reusable.
- Dialogs/drawers must be separate when they contain significant logic.
- Domain state should be exposed through hooks or feature state modules.
- Never put the entire customer/provider/admin application inside one dashboard component.

---

# 26. MOCK / FIXTURE ARCHITECTURE

Frontend-first development requires realistic but deterministic fixtures.

```text
src/mocks/
├── fixtures/
│   ├── users.ts
│   ├── organizations.ts
│   ├── services.ts
│   ├── providers.ts
│   ├── bookings.ts
│   ├── orders.ts
│   ├── quotations.ts
│   ├── payments.ts
│   ├── executions.ts
│   ├── tracking.ts
│   ├── proofs.ts
│   ├── completions.ts
│   ├── reviews.ts
│   ├── disputes.ts
│   ├── warranties.ts
│   ├── history.ts
│   ├── assets.ts
│   ├── maintenance.ts
│   ├── loyalty.ts
│   ├── products.ts
│   ├── carts.ts
│   ├── product-orders.ts
│   ├── inventory.ts
│   ├── fulfillment.ts
│   ├── shipments.ts
│   └── returns.ts
│
├── scenarios/
│   ├── service-happy-path.ts
│   ├── quotation.ts
│   ├── execution-blocked.ts
│   ├── tracking-offline.ts
│   ├── proof-revision.ts
│   ├── completion-issue.ts
│   ├── product-checkout.ts
│   ├── payment-expired.ts
│   ├── partial-fulfillment.ts
│   ├── shipping-delayed.ts
│   ├── return-inspection.ts
│   └── permissions.ts
└── factories/
    └── ...
```

## 26.1 Required Scenarios
- Normal service order end-to-end
- Quotation + negotiation
- Payment pending / expired / failed
- Execution blocked / safety stop / partial completion
- Tracking GPS unavailable / stale / ended
- Proof revision required
- Completion issue / dispute
- Warranty active / claim / rejected
- Maintenance due / overdue
- Rebooking with changed price
- Product out of stock / price changed in cart
- Multi-seller product order
- Partial fulfillment
- Shipping delayed / delivery attempted / lost / damaged / RTS
- Return partial / inspection partial / refund partial
- Permission denied / wrong organization / wrong assignment

---

# 27. UX / INTERACTION REQUIREMENTS

## 27.1 Primary Action Rule

Setiap page harus memiliki satu primary user goal dan satu dominant CTA jika memang ada action utama. Secondary actions harus tidak mengaburkan lifecycle.

## 27.2 Confirmation Rule
- Payment → show amount/deadline before action.
- Cancel → explain consequence and downstream effect.
- Return → show eligible quantity/reason/policy before submit.
- Refund/approval → show financial consequence and permission state.
- Policy changes → preview impact before activate when applicable.

## 27.3 Read vs Write Visual Distinction

```text
READ-ONLY DATA
→ neutral presentation

USER INPUT
→ explicit form control

PREDICTION / AI
→ labeled as suggestion/prediction

OFFICIAL STATUS
→ canonical status component

DESTRUCTIVE / FINANCIAL ACTION
→ prominent but confirmation-protected
```

## 27.4 Accessibility
- Every input has label or accessible name.
- Error messages are associated with the field.
- Keyboard focus is visible.
- Buttons describe their action, not only an icon.
- Dialog focus is managed and returns to trigger.
- Maps/tracking have text fallback.
- Color is never the only status signal.

## 27.5 Responsive
- Desktop operational dashboards may use sidebar + content.
- Customer flows should work on mobile and desktop.
- Tables may become cards on narrow screens while preserving data priority.
- Sticky bottom action bar is permitted for long mobile forms.
- Map and timeline layouts must degrade gracefully to a list.

---

# 28. FEATURE COMPLETION CHECKLIST #1–#27

| Feature | Name | Frontend deliverable | Components | Authorization | State handling |
| --- | --- | --- | --- | --- | --- |
| #1 | Discovery | Search + category + provider + smart discovery | Componentized | Role-aware | State-aware |
| #2 | Booking Jasa | Dynamic booking wizard + summary | Componentized | Role-aware | State-aware |
| #3 | Order Jasa | Order list/detail + state-aware actions | Componentized | Role-aware | State-aware |
| #4 | Pricing & Quotation | Quotation view/editor + version + price breakdown | Componentized | Role-aware | State-aware |
| #5 | Communication | Contextual chat | Componentized | Role-aware | State-aware |
| #6 | Payment & Protection Jasa | Payment + protection + countdown where applicable | Componentized | Role-aware | State-aware |
| #7 | Service Execution | Execution task/workspace | Componentized | Role-aware | State-aware |
| #8 | Tracking Detail Jasa | Tracking/map/timeline | Componentized | Role-aware | State-aware |
| #9 | Proof of Service | Proof builder/review | Componentized | Role-aware | State-aware |
| #10 | Completion & Customer Confirmation | Completion/confirmation | Componentized | Role-aware | State-aware |
| #11 | Rating & Review | Rating/review | Componentized | Role-aware | State-aware |
| #12 | Complaint / Dispute | Case/evidence/resolution | Componentized | Role-aware | State-aware |
| #13 | Warranty | Warranty/claim | Componentized | Role-aware | State-aware |
| #14 | Service History | History/logbook | Componentized | Role-aware | State-aware |
| #15 | Asset | Asset registry/detail | Componentized | Role-aware | State-aware |
| #16 | Maintenance & Reminder | Maintenance/reminder | Componentized | Role-aware | State-aware |
| #17 | Rebooking / Favorite / Loyalty | Favorites/rebook/loyalty | Componentized | Role-aware | State-aware |
| #18 | Smart Recommendation & AI Agent | AI assistant/recommendation | Componentized | Role-aware | State-aware |
| #19 | Service + Product Integration | Requirement/compatibility/sourcing | Componentized | Role-aware | State-aware |
| #20 | Product Discovery | Product discovery/detail | Componentized | Role-aware | State-aware |
| #21 | Cart | Cart/group/validation | Componentized | Role-aware | State-aware |
| #22 | Booking / Order Barang | Checkout/order/reservation | Componentized | Role-aware | State-aware |
| #23 | Payment Barang | Payment/countdown/receipt | Componentized | Role-aware | State-aware |
| #24 | Inventory | Inventory visibility/ops | Componentized | Role-aware | State-aware |
| #25 | Fulfillment Barang | Fulfillment workflow | Componentized | Role-aware | State-aware |
| #26 | Shipping & Tracking Barang | Shipment/tracking/POD | Componentized | Role-aware | State-aware |
| #27 | Return / Refund Barang | Return/inspection/refund/replacement | Componentized | Role-aware | State-aware |

---

# 29. DEVELOPMENT PHASES — FRONTEND FIRST

| Phase | Work | Feature coverage |
| --- | --- | --- |
| Phase 0 — Foundation | App shell, design system primitives, typography/spacing, navigation, active role, permission helpers, mock framework, error/forbidden states. | No domain transaction yet. |
| Phase 1 — Discovery | Home, search, categories, service/provider detail, smart discovery. | Covers #1 and entry to #18/#2/#20. |
| Phase 2 — Service Booking to Payment | Booking wizard, order detail, quotation, communication, payment. | Covers #2–#6. |
| Phase 3 — Execution to Completion | Execution workspace, tracking, proof, completion, rating, complaints. | Covers #7–#12. |
| Phase 4 — Longitudinal Service | Warranty, history, asset, maintenance, rebook/favorite/loyalty. | Covers #13–#17. |
| Phase 5 — AI + Service Product | AI assistant/recommendations + product requirement/integration. | Covers #18–#19. |
| Phase 6 — Product Commerce | Product discovery, cart, order/booking, payment. | Covers #20–#23. |
| Phase 7 — Operations Product | Inventory, fulfillment, shipping/tracking, returns. | Covers #24–#27. |
| Phase 8 — Role Surfaces | Worker, Support, Finance, Merchant, Supplier, Admin, CEO pages and scoped dashboards. | Completes cross-role exposure of #1–#27. |
| Phase 9 — Frontend Hardening | Responsive, accessibility, state/error coverage, permission checks, performance, visual consistency. | Before database/backend integration. |

## 29.1 Implementation Rule
- Finish a page family before starting another if it shares components/state.
- Do not wait for database to design the page.
- Do not fake backend semantics to compensate for missing API. Use fixtures and adapters.
- Lock reusable components before duplicating variants.
- After each phase, verify against the corresponding business flow in this PRD.

---

# 30. ACCEPTANCE CRITERIA

A feature/page is considered frontend-ready when all applicable criteria are satisfied:
- Route exists in the correct route group.
- Active role and organization context are represented.
- Unauthorized access has a dedicated forbidden behavior.
- Page is composed of reusable components.
- Primary data sections are present according to page contract.
- All required inputs have labels, validation state, and clear required/optional treatment.
- Allowed actions are visible only when state/permission permits.
- Destructive/financial actions use explicit confirmation.
- Loading, empty, error, and locked/expired states are implemented.
- Offline/stale states are present when the domain requires freshness visibility.
- Navigation after success follows the business flow.
- No page contains a complete application flow in one monolithic component.
- Mock scenario exists for the normal path and at least one exception path for critical features.
- Component is responsive and keyboard-usable.
- No frontend-only assumption is treated as server authorization.

# 31. QA TRACEABILITY MATRIX

| Flow | Must be testable in frontend |
| --- | --- |
| Discovery → Booking | Search result opens exact service/provider context into booking |
| Booking → Order | Confirmed booking navigates to order state |
| Quotation → Payment | Accepted quotation shows official payable context |
| Payment → Execution | Paid/precondition state changes next available action |
| Execution → Tracking | Tracking reflects execution/travel context without inventing data |
| Execution → Proof → Completion | Proof revision/acceptance changes completion availability |
| Completion → Rating/Warranty/History | Completion exposes correct post-service actions |
| Complaint/Dispute | Issue action reaches case with source context |
| Asset → Maintenance → Booking | Due maintenance deep-links to configured service booking |
| Rebooking | Old order becomes prefilled context but current values are revalidated |
| Service → Product | Requirement can hand off to product discovery/cart/order |
| Product → Cart → Order → Payment | Commerce flow preserves seller/item/price context |
| Order → Inventory → Fulfillment → Shipping | Operational progression is visible in appropriate role surfaces |
| Shipping → Return | Delivery issue/RTS reaches return workflow when applicable |
| Return → Refund/Replacement | Resolution visibly branches to payment or fulfillment/shipping |
| Multi-role | Switching role changes navigation/data projection |
| Organization isolation | User cannot see another organization’s resource |

---

# 32. FRONTEND HANDOFF TO ERD / DATABASE

Setelah frontend blueprint dan implementation structure ini selesai, database/ERD phase mengambil kebutuhan dari UI tanpa menjadikan UI sebagai source of truth.

```text
FRONTEND PRD
  ↓
Page + Form + State + View Model
  ↓
Identify Entities / Relationships / Status
  ↓
ERD / Database
  ↓
API Contract
  ↓
Adapters replace mocks
  ↓
Frontend remains structurally stable
```


Information yang harus dipertahankan saat turun ke ERD:
- resource identity used by the UI
- status/state enum used by the UI
- relationships/deep links
- role and scope expectations
- snapshot fields that must appear historically
- event/timeline requirements
- partial quantities and partial states
- policy/version context
- audit actor/context
- reference IDs between domains

---

# 33. FINAL FRONTEND BLUEPRINT STATUS

```text
FEATURE #1–#27                  ✅ COVERED
ROLE SURFACES                  ✅ COVERED
ADDITIONAL ROLES               ✅ COVERED
MIDDLEWARE / AUTH UX           ✅ COVERED
PAGE MAP                        ✅ DEFINED
INPUTS                          ✅ DEFINED
ALLOWED ACTIONS                 ✅ DEFINED
STATE / EMPTY / ERROR          ✅ DEFINED
COMPONENT ARCHITECTURE          ✅ DEFINED
FOLDER STRUCTURE                ✅ DEFINED
MOCK / FIXTURE STRATEGY         ✅ DEFINED
END-TO-END FLOWS                ✅ DEFINED
ACCEPTANCE CRITERIA              ✅ DEFINED
IMPLEMENTATION ORDER             ✅ FRONTEND FIRST
```


## FINAL IMPLEMENTATION ORDER
```text
1. FRONTEND PRD + INFORMATION ARCHITECTURE
2. DESIGN SYSTEM / SHARED COMPONENTS
3. CUSTOMER FLOWS
4. PROVIDER / WORKER / OPS FLOWS
5. FRONTEND MOCK INTEGRATION
6. ERD / DATABASE
7. BACKEND DOMAIN SERVICES
8. API CONTRACTS
9. API ADAPTER INTEGRATION
10. END-TO-END HARDENING
```


# END — SERVIO PRD FRONTEND
