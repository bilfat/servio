# SERVIO — PHASE 05B ORDER JASA
## FULL BACKEND TECHNICAL SPECIFICATION V2 — 10 KOMPONEN + FINANCE 06 EXTENSION CONTRACT + FRONTEND/API MAPPING

**Dokumen:** `SERVIO_PHASE-05B-ORDER-JASA-BACKEND-TECHNICAL-SPEC-V2.md`  
**Tanggal baseline bisnis:** 28 Oktober 2026  
**Status dokumen:** **TECHNICAL SPECIFICATION V2 — DESIGN BASELINE; BELUM DINYATAKAN IMPLEMENTED/PASS**  
**Sumber bisnis utama:** `SERVIO_PHASE-05B-ORDER-JASA-PLANNING-V2-BUSINESS-LOCKED.md` (925 baris).  
**Referensi teknis:** `SERVIO_PHASE-05A-ORDER-BARANG-BACKEND-TECHNICAL-SPEC-10-KOMPONEN-DRAFT-ACC.md`, `SERVIO_PHASE-06-FINANCE-SPAY-V3-BACKEND-TECHNICAL-SPEC-10-POINT.md`, source-only snapshots `SERVIO_05A_PROMPT05_source-only.zip` dan `SERVIO_finance-service_PROMPT05_source-only.zip`.  
**Platform target:** Next.js frontend; Laravel REST API; MySQL per bounded context; microservice/service-to-service authentication sesuai implementasi resmi.  
**Maksud:** landasan implementasi backend 05B dan perluasan aman Finance 06, lalu integrasi frontend yang sedang/disiapkan; **bukan** laporan bahwa service 05B atau endpoint baru sudah tersedia.

> **ATURAN MEMBACA:** `LOCKED` = keputusan bisnis pengguna dari planning V2; `DESIGN PROPOSED` = pilihan implementasi yang disarankan dan dapat disesuaikan setelah audit repository; `CONTRACT PENDING` = membutuhkan implementasi/otorisasi service lain; `VERIFIED SNAPSHOT` = diperiksa dalam artefak source-only yang diunggah, **belum** jaminan sama dengan HEAD repository. Jangan mengganti keputusan bisnis LOCKED secara diam-diam atas alasan teknis.

---

# 00 — KONTRAK BISNIS MUTLAK DAN NON-GOALS

## 00.1 Invariant yang tidak boleh dilanggar

1. Semua Order Jasa menjalani **pemeriksaan/diagnosis Worker**. Diagnosis boleh gratis (`Rp0`) jika Phase 04 menetapkannya; gratis bukan Payment Finance `PAID` palsu.
2. **Diagnosis berbayar dibayar saat booking**, biaya platform kebijakan CEO **dikecualikan** untuk pembayaran diagnosis. Pajak/kewajiban wajib hukum diperlakukan terpisah dan diverifikasi Finance, bukan tarif fiktif frontend.
3. Satu Order Jasa yang sampai pengerjaan umumnya memiliki **dua kewajiban pembayaran berbeda**: `DIAGNOSIS` ketika booking dan `SERVICE_EXECUTION` **SETELAH Worker `WORKER_FINISHED`**. Bukan satu invoice total di awal; tidak menagih diagnosis dua kali.
4. Status tagihan Finance **PENDING** sampai ada hasil PAID resmi. Customer/Worker/Provider tidak memiliki tombol `mark-paid`; simulasi demo hanya Finance Ops authorized, nonproduction.
5. Hasil pemeriksaan dan rincian biaya dibuat Worker dalam satu alur UI; versi final immutable, harga & sumber part yang diubah membutuhkan versi baru dan persetujuan baru.
6. **Customer di lokasi:** Worker boleh mencatat persetujuan **lisan** dengan atribusi `WORKER_RECORDED_IN_PERSON`, bukan menyamar sebagai Customer. **Customer remote:** approval/rejection oleh akun Customer sendiri, maksimal **30 menit** sejak hasil final tersedia secara sah; tidak ada auto-approve.
7. Persetujuan scope/harga valid → Worker **boleh mulai pekerjaan TANPA menunggu pembayaran pengerjaan**. **Tidak ada Provider ACC harga** per Order; WhatsApp boleh untuk koordinasi tetapi harga resmi hanya versi yang tercatat di 05B.
8. Worker `FINISHED` mensyaratkan foto sebelum dan sesudah, ringkasan, hasil pemeriksaan/pengujian, dan penggunaan sparepart. **Setelah** FINISHED 05B meminta Finance membuat tagihan pengerjaan (expiry 6 jam).
9. SOP normal: Worker tetap berada di lokasi sampai pembayaran PAID lalu `Akhiri Kunjungan`. Jika tidak aman, koneksi bermasalah, pembayaran tidak berjalan, ada `Laporkan Kendala Pembayaran`; Worker tidak ditahan di lokasi selamanya.
10. Tagihan pengerjaan expired setelah pekerjaan terlaksana → **Pembayaran Terlambat**, Order **BUKAN** otomatis BATAL/COMPLETED; replacement tetap **satu kewajiban**, tidak double collection.
11. Completion manual/otomatis hanya setelah **WORKER_FINISHED + pembayaran pengerjaan PAID** (atau pengecualian nol-rupiah yang secara eksplisit dibenarkan Finance); auto-completion **72 jam dari saat kedua syarat terpenuhi**, setelah pemeriksaan bukti/isu aktif.
12. Hak bersih Provider **HELD 120 jam sesudah Order COMPLETED** sebelum eligible AVAILABLE. Diagnosis valid pada Order yang **BATAL setelah diagnosis** eligible melalui **HELD 120 jam sejak penutupan BATAL yang sah**, bukan fake COMPLETED.
13. Cancel sebelum Worker OTW setelah diagnosis PAID → **refund penuh diagnosis**; Customer S-Pay dikredit hanya setelah Finance refund `SUCCEEDED`. Setelah diagnosis sah, Customer menolak/sparepart unavailable/remote timeout → BATAL, fee diagnosis sah **tidak refund**.
14. Saat Worker `OTW`/`ARRIVED`, tombol batal normal disembunyikan; jalur `Laporkan Kendala` tetap tersedia. Admin/Provider berwenang mengatasi kegagalan layanan; tidak membuat klaim diagnosis selesai tanpa bukti.
15. Worker belum `ACCEPTED` → **identitas Worker tidak boleh dikirim kepada Customer**. Assignment response **30 menit jam operasional authoritative**; satu active assignment per booking.
16. Sparepart: `PROVIDER_SUPPLIED` (nama, qty, unit price, subtotal terhitung), `SERVIO_MERCHANT` (Order Barang 05A terpisah, tidak ditagih ulang), `CUSTOMER_SUPPLIED` (tidak ditagih 05B). Tidak ada affiliate, GPS live, atau engine Multiple Visit.
17. Sparepart tak tersedia saat kunjungan → **Order awal BATAL** dengan reason, follow-up **draft Order baru** prefilled dari hasil diagnosis lama, tanpa diagnosis charge kedua bila eligible, tanpa aktivasi booking/assignment otomatis.
18. Nama/besaran/target biaya pengerjaan adalah **kebijakan CEO di Finance 06** (Customer, Merchant, Provider, kombinasi), bukan angka/nama yang di-hardcode 05B. Provider/Worker tidak bisa menentukan komisi melalui harga manual.
19. S-Pay Provider dan Customer **bukan top-up wallet**: Customer hanya saldo refund, Provider hanya hak earnings yang released. Withdrawal manual min **Rp20.000**, parsial, biaya transfer dipotong dari nominal pencairan, rekening verified + step-up menurut Finance.
20. UI tab LOCKED: Customer `[Belum Bayar, Menunggu Jadwal, Berlangsung, Selesai, Batal]`; Worker `[Tugas Masuk, Terjadwal, Berlangsung, Selesai, Riwayat]`; Provider `[Booking Masuk, Penugasan, Berlangsung, Selesai, Batal]`.

## 00.2 Non-goals

Tidak membuat pembayaran/ledger/QRIS/VA di 05B; tidak mengubah transaksi 05A; tidak membuat Finance service kedua; tidak melakukan cross-service DB join; tidak membuat pembayaran gaji Worker; tidak mengimplementasikan Customer COD; tidak menganggap Word/WA sebagai sumber persetujuan resmi; tidak mengubah service Service Catalog master; tidak membuat loyalty, rating, affiliate, warranty/return/claim, real GPS, atau multiple visits canonical. Penanganan masalah menggunakan authority yang sah / kontrak pending, bukan menyisipkan arbitrase finansial diam-diam ke 05B.

## 00.3 Traceability status dokumen

| Kapabilitas | Status sumber | Sikap implementasi |
|---|---|---|
| Planning 05B V2 | LOCKED BUSINESS | Implementasikan persis kecuali change request |
| `POST /api/v1/finance/demo/payments/{payment_id}/simulate` | VERIFIED SNAPSHOT Finance | Reuse, audit autentikasi dan publisher saat integrasi |
| Finance `/api/v1/finance/ops/payments`, `/payments/{id}` | VERIFIED SNAPSHOT Finance | Reuse untuk pembacaan authorized |
| Finance internal `/checkout-quotes`, `/checkouts/.../payment-intents`, `/refunds/order-cancellations`, `/order-events` | VERIFIED SNAPSHOT **untuk 05A** | Jangan memasukkan payload jasa ke kontrak 05A tanpa extension/version baru |
| Provider finance org S-Pay | CONTRACT PENDING | Route snapshot saat ini mengizinkan MERCHANT/FINANCE OPS; perlu permission/owner Provider sah |
| Backend Order Jasa 05B | NOT VERIFIED/NEW | Desain endpoint & tabel dalam dokumen ini masih PROPOSED |
| 01: jam kerja, worker membership, address | CONTRACT PENDING/REQUIRES AUDIT | Tidak boleh fabricated |
| 04: offering, diagnosis fee, coverage, schedule | CONTRACT PENDING/REQUIRES AUDIT | Tidak boleh fake saat transaksi nyata |
| 03/05A: related product order dan readiness | CONTRACT PENDING/REQUIRES AUDIT | 05A tetap lifecycle sendiri, batas katalog satu kota |
| Complaint clearance / issue authority | CONTRACT PENDING | Freeze action finansial jika authority unavailable |

---

# 01 — SERVICE ARCHITECTURE, BOUNDED CONTEXT DAN RUNTIME

## 1.1 Komponen sistem

```text
Next.js Customer / Provider / Worker / Admin / Finance Ops
   │ authenticated via Identity 01 + gateway/BFF
   ├── Service Catalog 04 (offering, price model, coverage, slots)
   ├── Identity 01 (account, role, provider/worker membership, addresses, hours)
   ├── Order Jasa 05B  [NEW Laravel/MySQL BOUNDED CONTEXT]
   │     ├── Orders, Booking, Assignment, Visit/Execution
   │     ├── Diagnosis & Priced Work Version, Consent, Evidence
   │     ├── Cancellation/Follow-up/Issues, projections, audit
   │     ├── Integration Outbox/Inbox, scheduler/reconciliation
   │     └── READ ONLY projections for Provider/Worker/Customer/Admin
   ├── Finance 06 [EXISTING + SERVICE ORDER EXTENSION]
   │     ├── Invoices/Payment PENDING → PAID via trusted Finance verification
   │     ├── Refund ledger, service entitlements, HELD → AVAILABLE
   │     ├── S-Pay Provider/Customer, withdrawal, policy engine
   │     └── Existing Finance Ops demo simulator (NONPROD ONLY)
   └── Product 03 / Order Barang 05A (independent related sparepart orders)

05B outbox → authenticated S2S → Finance 06 inbox
Finance outbox → authenticated S2S → 05B inbox
Notification consumes domain events; no financial source of truth
```

## 1.2 Service ownership matrix

| Data/aksi | Owner authority | 05B menyimpan |
|---|---|---|
| Account roles/provider membership/worker active | Identity 01 | ID + snapshot display/eligibility check evidence |
| Address Book current | Identity 01 | immutable recipient/address snapshot at order |
| Service Offering pricing/area/capability | Phase 04 | snapshot validated at booking, IDs/version |
| Worker assignment, visit, diagnosis, consent, execution | **05B** | canonical records |
| Finance payment records/ledger/refund/held/S-Pay | **06** | IDs + event-confirmed projection only |
| Merchant catalog/order/sparepart logistics | 03/05A | references + status snapshot; no new purchase orchestration |
| Issue resolution and clearance affecting money | authority approved by platform | issue ref, hold flags, verified decision refs |
| Notifications | Notification domain | notification outbox intent, no email service clone |

## 1.3 Tech stack dan conventions

- `DESIGN PROPOSED`: `backend/services/order-jasa-service/` Laravel current version aligned with repo; **MySQL database dedicated `order_jasa`**, utf8mb4, `UTC` DATETIME(6), integer Rupiah, ULID IDs (`CHAR(26)`) or same ID standard found in repository. MySQL selection must be formally reconciled with old 05B header mentioning MongoDB; V2 encourages following actual 05A/06 stack.
- Do not cross-use Finance MySQL connection in 05B. Database transactions only cover the local service; outbox-based eventual consistency crosses services.
- Public base proposed: `/api/v1/order-jasa`. Internal proposed: `/internal/v1/order-jasa`; **route names not claimed existing**.
- Finance actual source snapshot is Laravel route file `finance-service/routes/api.php` + `routes/internal.php`; exact base as printed above. Role naming is subject to Identity 01 registry verification; role names `CUSTOMER`, `PROVIDER`, `WORKER`, `ADMIN_OPERATIONS`, `FINANCE_PAYMENT_OPS` are conceptual until identity audit.
- `Idempotency-Key` required for critical create/mutations; request hash includes actor + resource + canonical payload. JSON responses must carry request IDs, error code, not arbitrary framework exception text.
- All security-critical decisions server-side; UTC and business-zone/timezone conversion from authoritative provider configuration. Do not assume timezone is server machine default.

## 1.4 Modul domain backend 05B (DESIGN PROPOSED)

`ServiceOrderApplicationService`, `BookingScheduleService`, `WorkerEligibilityService`, `AssignmentService`, `VisitService`, `DiagnosisVersionService`, `PricingAndPartService`, `ConsentService`, `ExecutionService`, `CancellationService`, `FollowUpOrderService`, `IssueProjectionService`, `OrderHistoryService`, `PaymentProjectionService`, `FinanceIntegrationClient`, `OutboxDispatcher`, `InboxProcessor`, `ReconciliationService`, `OperationsReadService`.

**Separation:** controller → request validation → policy → application service → DB transaction → outbox; never controller directly updates Finance balances or transits status without service guard.

## 1.5 Dependency/gate bila upstream belum siap

- `PENDING_IDENTITY_WORKER_ELIGIBILITY_AND_HOURS`: reassign timeout 30 min operational **not production-ready** without authoritative working schedules/membership.
- `PENDING_PHASE04_OFFERING_AND_SLOT_CONTRACT`: booking cannot charge real diagnostic fees or reserve invented time slots.
- `PENDING_FINANCE_SERVICE_PAYMENT_CONTRACT`: 05B cannot create financial invoices from 05A checkout payloads.
- `PENDING_FINANCE_SERVICE_REFUND_HOLD_CONTRACT`: no refund/Provider release until Finance has verified extension.
- `PENDING_ISSUE_CLEARANCE_CONTRACT`: no auto completion or hold release if an unresolved issue cannot be reliably checked.
- `PENDING_FINANCE_REPLACEMENT_AND_RECONCILIATION`: overdue invoices require atomic one-obligation protection.
- `PENDING_PROVIDER_SPAY_PERMISSION`: current Finance route role checks must explicitly support Provider membership.
- `PENDING_SPAREPART_LINK_VALIDATION`: do not equate catalog suggestion with 05A paid/delivered product order.

All pending contracts must be tracked with owner, expected request/response, implementation stage and evidence. An unimplemented contract is not a PASS.

---

# 02 — DOMAIN DATA MODEL / ERD (MYSQL)

## 2.1 Relasi canonical di dalam 05B

```text
service_orders 1 ── 1 service_bookings
service_orders 1 ── N order_events / order_audits
service_orders 1 ── N booking_schedule_revisions
service_bookings 1 ── N worker_assignment_attempts (one active)
service_orders 1 ── 1 service_visits (single canonical visit)
service_orders 1 ── N diagnosis_versions (one current submitted)
diagnosis_versions 1 ── N service_work_items
                 └── N service_part_items
service_orders 1 ── N customer_consents (version-bound)
service_orders 1 ── 0..1 service_executions (one execution canonical)
service_executions 1 ── N execution_evidence / used_part_records
service_orders 1 ── 0..N cancellation_records / operational_issues
service_orders 1 ── 0..N service_payment_obligations (max one each phase)
service_payment_obligations 1 ── N payment_attempt_refs
service_orders 1 ── 0..N service_finance_projections / refund_refs
service_orders 1 ── 0..1 followup_draft (from unavailable part)
service_orders 0..1 ── 0..1 prior_order_id (follow-up lineage)
service_orders 1 ── N integration_outbox / integration_inbox
```

All foreign keys linking 05B records are local. Cross-service refs (`provider_org_id`, `offering_id`, `customer_id`, `payment_id`, `related_product_order_id`) **are NOT SQL FKs** to external service DBs.

## 2.2 Primary entities and cardinality

| Entity | Purpose | Notable uniqueness |
|---|---|---|
| `service_orders` | canonical Order + snapshots | `order_no` unique; `idempotency_scope` key separate |
| `service_bookings` | one current booking/order | `order_id` unique |
| `booking_schedule_revisions` | immutable proposal/acceptance | `(booking_id, revision_no)` unique |
| `worker_assignment_attempts` | assign/reassign history | `(booking_id, attempt_no)` unique; active slot lock |
| `service_visits` | single canonical visit | `order_id` unique |
| `diagnosis_versions` | immutable submitted snapshot | `(order_id, version_no)` unique |
| `service_work_items` | work price lines of version | `(diagnosis_version_id,line_no)` unique |
| `service_part_items` | part lines by source | `(diagnosis_version_id,line_no)` unique |
| `customer_consents` | actor/source and version-approved | `(order_id, consent_request_id)` unique |
| `service_executions` | execution + finishing | `order_id` unique |
| `execution_evidence` | before/after/results | `(execution_id,evidence_type,ordinal)` unique |
| `service_payment_obligations` | one debt per phase | `(order_id,purpose)` unique |
| `service_payment_attempts` | Finance attempt projections | `(finance_payment_id)` unique; `(obligation_id,attempt_no)` unique |
| `service_finance_entitlement_refs` | release/refund summaries | `(finance_event_id)` unique |
| `cancellation_records` | terminal reason & actor | at most one committed cancellation per Order |
| `followup_order_drafts` | prepared derived Order context | `origin_order_id` unique active draft, `entitlement_token_hash` unique |
| `operational_issues` | exceptions/Customer reports | `issue_no` unique |
| `integration_outbox_events` | delivery with retry | `event_id` unique |
| `integration_inbox_events` | de-dup of received event | `(producer,event_id)` unique |
| `idempotency_records` | mutation replay | `(actor_scope,operation,idempotency_key_hash)` unique |

## 2.3 Domain invariant ringkas

- One Order has exactly one Booking and at most one active assigned Worker. Sequential assignment attempts stored, no simultaneous ACTIVE attempts.
- One canonical visit per Order. When part unavailable, close original Order and create new **draft** referencing original; do **not** create a second visit in same Order.
- Exactly one **active** diagnosis version for consent/execution. Previous submitted version remains immutable. Updated price/part invalidates prior consent as a usable execution permission.
- Only a `WORKER_RECORDED_IN_PERSON` or `CUSTOMER_REMOTE_APPROVED` consent for the **same** `diagnosis_version_id` can authorize execution; report of potentially fraudulent consent freezes progression via issue rule.
- One unique payment obligation for `DIAGNOSIS` and one for `SERVICE_EXECUTION` per Order. Each may have multiple **attempt references** only after expiry/void, but obligations and paid amounts are never duplicated.
- Order `CANCELLED` before execution cannot have `WORKER_FINISHED`; Order `COMPLETED` requires explicit completion guard. `SERVICE_EXECUTION` payment must not be created before `WORKER_FINISHED`.
- Diagnosis revenue on `CANCELLED` requires verifiable delivered diagnosis, source event and non-refunded Finance payment; not a blanket property of all cancellations.

---
# 03 — DATABASE SCHEMA, INDEX, CONSTRAINT DAN MIGRATION PLAN

**DESIGN PROPOSED:** kolom berikut adalah rancangan implementasi, **bukan migrasi yang telah dibuat**. Gunakan naming/conventions repository setelah audit. Semua nilai uang **BIGINT signed dalam Rupiah** dengan `CHECK >= 0` untuk harga/nominal dan server-side validation; total ditulis sebagai snapshot immutable. Timestamp `DATETIME(6)` UTC, local timezone ID (`Asia/Jakarta` dsb.) dicatat bila relevan. `JSON` untuk immutable display snapshot/bukti terstruktur; atribut yang sering difilter masuk kolom terindeks tersendiri.

## 3.1 `service_orders`

| Kolom | Tipe | Constraint/penjelasan |
|---|---|---|
| `id` | CHAR(26) | ULID PK |
| `order_no` | VARCHAR(48) | UNIQUE, user-facing |
| `customer_id` | VARCHAR(64) | required from authenticated Identity |
| `provider_org_id` | VARCHAR(64) | required; valid membership/ownership |
| `service_offering_id`, `service_offering_version` | VARCHAR(64) | reference/snapshot; offerings externally verified |
| `service_snapshot` | JSON | name, category, provider, scope, pricing model, terms |
| `recipient_snapshot`, `address_snapshot` | JSON | name, phone, region, notes, maybe coordinates from official Address Book |
| `complaint_text` | TEXT | sanitized; required unless legitimate follow-up prefill |
| `symptoms_json`, `customer_media_refs` | JSON | optional, validated media refs |
| `diagnosis_fee_idr` | BIGINT | >=0 immutable at confirmed booking |
| `diagnosis_fee_exemption_type` | VARCHAR(40) nullable | e.g. `FOLLOWUP_ALREADY_PAID`, not arbitrary Customer choice |
| `status` | VARCHAR(32) | `CREATED/CONFIRMED/IN_PROGRESS/COMPLETED/CANCELLED` |
| `phase` | VARCHAR(48) | canonical internal stage separate from status (see §06) |
| `cancel_reason_code` | VARCHAR(72) nullable | committed terminal reason |
| `original_order_id` | CHAR(26) nullable | self FK for follow-up lineage |
| `version` | BIGINT | optimistic concurrency; increments on mutation |
| `created_at`, `updated_at`, `completed_at`, `cancelled_at` | DATETIME(6) | UTC |

Indexes: `(customer_id,created_at DESC)`, `(provider_org_id,status,created_at DESC)`, `(status,phase,updated_at)`, `(original_order_id)`, `(cancel_reason_code,cancelled_at)`. Validate allowed transitions in domain service, not just enum UI. Partition/retention decision separately.

## 3.2 `service_bookings` dan `booking_schedule_revisions`

`service_bookings`: `id`, `order_id UNIQUE FK`, `customer_id`, `provider_org_id`, `scheduled_start_at`, `scheduled_end_at`, `timezone`, `slot_reference`, `status REQUESTED/READY/RESCHEDULE_PROPOSED/CANCELLED`, `schedule_revision`, `created_at`, `updated_at`. Composite indexes `(provider_org_id,scheduled_start_at,status)` and `(order_id,status)`.

`booking_schedule_revisions`: `id`, `booking_id FK`, `revision_no`, `proposed_by_type`, `proposed_by_id`, `old_start_at`, `old_end_at`, `new_start_at`, `new_end_at`, `reason`, `status PENDING/ACCEPTED/REJECTED/EXPIRED`, `customer_decided_at`, `created_at`, unique `(booking_id,revision_no)`. **Provider tidak boleh silent reschedule**; slot baru hanya berlaku after Customer acceptance + slot revalidation and conflict locking.

## 3.3 `worker_assignment_attempts`

`id`, `booking_id FK`, `order_id FK`, `attempt_no`, `worker_id`, `provider_org_id`, `status ASSIGNED/ACCEPTED/REJECTED/EXPIRED/CANCELLED`, `assigned_by_id`, `assigned_at`, `response_due_at`, `accepted_at`, `rejected_at`, `rejection_reason_code`, `rejection_notes`, `expiry_reason`, `worker_capability_snapshot`, `worker_membership_snapshot`, `version`, timestamps. `UNIQUE(booking_id,attempt_no)`.

**MySQL active-slot invariant:** use separate `booking_active_assignments` (`booking_id PK`, `attempt_id UNIQUE FK`) which exists only while an active assignment is `ASSIGNED`/`ACCEPTED`. Assign/reassign must acquire row lock on booking and update slot + attempt atomically; delete/update slot when rejected/expired/cancelled or booking closed. Do not rely on partial unique index unsupported by stock MySQL. Accepted worker may remain active until visit/Order terminal; reassign requires explicit termination of previous accepted attempt and audit.

## 3.4 `service_visits` dan `diagnosis_versions`

`service_visits`: `id`, `order_id UNIQUE FK`, `assignment_id`, `worker_id`, `status NOT_STARTED/ON_THE_WAY/ARRIVED/DIAGNOSING/DIAGNOSIS_SUBMITTED/APPROVED/EXECUTING/WORKER_FINISHED/VISIT_CLOSED`, `otw_at`, `arrived_at`, `diagnosis_started_at`, `diagnosis_submitted_at`, `visit_closed_at`, `visit_close_reason`, `version`, timestamps. `worker_id` must equal currently accepted assigned worker at critical mutations.

`diagnosis_versions`: `id`, `order_id FK`, `visit_id FK`, `version_no`, `status DRAFT/SUBMITTED/SUPERSEDED`, `worker_id`, `initial_condition`, `findings`, `suspected_cause`, `recommended_actions`, `safety_notes`, `diagnosis_photo_refs`, `work_subtotal_idr`, `provider_part_subtotal_idr`, `service_total_base_idr`, `currency IDR`, `price_snapshot_hash`, `submitted_at`, `published_to_customer_at`, `remote_response_due_at`, `client_visibility_evidence_json`, timestamps; unique `(order_id,version_no)`. A submitted version is **immutable**; amendments create new version; update `current_diagnosis_version_id` through locked transaction, not destructive edit.

`service_work_items`: `id`, `diagnosis_version_id FK`, `line_no`, `name`, `description`, `quantity_decimal` (DECIMAL(12,3) if units meaningful; simple `INT` otherwise), `unit`, `unit_price_idr BIGINT`, `subtotal_idr BIGINT`, unique `(diagnosis_version_id,line_no)`; quantities and price validated >=0; deterministic rounding if fraction is supported. 

`service_part_items`: `id`, `diagnosis_version_id FK`, `line_no`, `part_name`, `specification`, `source ENUM-like VARCHAR(PROVIDER_SUPPLIED/SERVIO_MERCHANT/CUSTOMER_SUPPLIED)`, `quantity`, `unit`, `unit_price_idr nullable`, `subtotal_idr`, `related_product_id nullable`, `related_product_order_id nullable`, `availability_status`, `compatibility_check_status`, `worker_note`; unique `(diagnosis_version_id,line_no)`. Server enforces `subtotal=qty*unit_price` on Provider items; on non-Provider items **not billable in 05B** (even when display price estimate exists).

## 3.5 `customer_consents` dan `service_executions`

`customer_consents`: `id`, `order_id FK`, `diagnosis_version_id FK`, `method CUSTOMER_REMOTE/WORKER_RECORDED_IN_PERSON`, `decision APPROVED/REJECTED/WITHDRAWN/INVALIDATED`, `recorded_by_type`, `recorded_by_id`, `customer_id`, `statement_acknowledged BOOLEAN`, `customer_present_reported BOOLEAN`, `submitted_at`, `remote_due_at`, `price_snapshot_hash`, `client_context_json`, `issue_reference nullable`; unique `(order_id,consent_request_id)`. **Do not store Worker record as Customer actor**. A remote consent must come from authenticated Customer owner; server checks version and due timestamp.

`service_executions`: `id`, `order_id UNIQUE FK`, `visit_id FK`, `diagnosis_version_id FK`, `consent_id FK`, `worker_id`, `status NOT_STARTED/IN_PROGRESS/WORKER_FINISHED`, `started_at`, `finished_at`, `summary`, `test_result`, `actual_part_usage_json`, `completion_evidence_validated_at`, `version`, timestamps. Before `IN_PROGRESS`, check consent version, no safety issue, accepted worker, valid visit status; no payment pengerjaan prerequisite.

`execution_evidence`: `id`, `execution_id FK`, `evidence_type BEFORE/AFTER/TEST/OTHER`, `media_reference`, `sha256`, `mime`, `size_bytes`, `capture_at nullable`, `uploaded_by`, `created_at`. Evidence files in authorized media service/object storage; store IDs and metadata, not binary in main DB. When reusing diagnosis-before image, store reference and audit that it was previously validated. For categories genuinely unable to provide photographs, `approved_evidence_exception_id` authorized operational exception + substitute proof; do not silently skip.

## 3.6 `service_payment_obligations` dan `service_payment_attempts`

`service_payment_obligations`: `id`, `order_id FK`, `purpose DIAGNOSIS/SERVICE_EXECUTION`, `pricing_snapshot_id/hash`, `approved_diagnosis_version_id nullable`, `principal_idr`, `currency`, `state NOT_REQUIRED/REQUIRES_INVOICE/INVOICE_PENDING/PAID/OVERDUE/SETTLED/CLOSED`, `finance_obligation_ref nullable`, `active_finance_payment_id nullable`, `paid_at nullable`, `payment_due_at nullable`, `version`, timestamps; **UNIQUE(order_id,purpose)**.

- `DIAGNOSIS` zero fee = `NOT_REQUIRED` with **no** Finance payment.
- `SERVICE_EXECUTION` exists only if work actually FINISHED; one immutable approved price basis.
- Finance computes applicable CEO fees and authoritative customer payable amount; 05B caches **read-only breakdown**, never directly settles.

`service_payment_attempts`: `id`, `obligation_id FK`, `attempt_no`, `finance_payment_id UNIQUE`, `finance_invoice_ref`, `method QRIS/VA`, `reported_status PENDING/PAID/EXPIRED/VOID/FAILED`, `amount_due_idr` **Finance-confirmed**, `issued_at`, `expires_at`, `status_last_verified_at`, `finance_event_id nullable`, `is_current BOOLEAN`, timestamps; UNIQUE `(obligation_id,attempt_no)`. Only one current nonterminal attempt enforced under `obligation FOR UPDATE`; lookup old attempt for late callback reconciliation.

`service_finance_entitlement_refs`: `id`, `order_id FK`, `purpose`, `finance_entitlement_id`, `finance_event_id UNIQUE`, `hold_status`, `release_eligible_at`, `net_provider_idr`, `payment_allocation_reference`, timestamps. These are projections; if source absent, display `UNKNOWN/WAITING_FINANCE`, not invented money.

## 3.7 `cancellation_records`, `operational_issues`, `followup_order_drafts`

`cancellation_records`: `id`, `order_id FK`, `cancelled_by_type`, `cancelled_by_id`, `reason_code`, `reason_text`, `status_at_cancel`, `diagnosis_fulfilled BOOLEAN`, `diagnosis_evidence_ref`, `refund_eligibility_snapshot`, `refund_finance_ref nullable`, `cancelled_at`; UNIQUE `(order_id,terminal_record_type)` with type `CANCELLED` or simpler UNIQUE `order_id` if only one terminal cancel.

`operational_issues`: `id`, `issue_no UNIQUE`, `order_id FK`, `reported_by_role`, `reported_by_id`, `issue_kind PAYMENT/CONSENT/NO_SHOW/SAFETY/WORK_QUALITY/OTHER`, `status OPEN/REQUIRES_REVIEW/RESOLVED`, `description`, `evidence_refs`, `affects_completion BOOLEAN`, `affects_funds BOOLEAN`, `authority_ref nullable`, `resolution_code nullable`, `resolved_at`, timestamps. **05B records reports**; financial clearance must be verified from authorized issue authority, not from Worker click or untrusted request.

`followup_order_drafts`: `id`, `origin_order_id FK`, `customer_id`, `provider_org_id`, `diagnosis_version_id`, `service_offering_id`, `draft_snapshot`, `diagnosis_reuse_entitlement_hash UNIQUE`, `status DRAFT/ACTIVATED/EXPIRED/INELIGIBLE`, `activated_order_id nullable UNIQUE`, `eligibility_reason`, `created_at`, `expires_at nullable`, timestamps. One origin diagnosis cannot issue unlimited fee waivers; enforce a controlled reuse policy, keep original diagnosis revenue in original Order.

## 3.8 `order_status_history`, integration/reliability tables

`service_order_events`: `id`, `order_id`, `sequence_no`, `event_type`, `actor_type`, `actor_id`, `from_state`, `to_state`, `metadata_json` (redacted), `occurred_at`; UNIQUE `(order_id,sequence_no)`, index `(event_type,occurred_at)`.

`order_audit_logs`: `id`, `request_id`, `actor`, `action`, `resource`, `old_version`, `new_version`, `reason`, `ip_hash`, `created_at`; append-only access protected.

`integration_outbox_events`: `event_id ULID UNIQUE`, `aggregate_type`, `aggregate_id`, `aggregate_version`, `event_type`, `schema_version`, `payload_json`, `destination`, `status PENDING/PROCESSING/DELIVERED/FAILED`, `attempts`, `next_retry_at`, `locked_by`, `locked_until`, `created_at`, `delivered_at`; index `(status,next_retry_at,id)`.

`integration_inbox_events`: `id`, `producer`, `source_event_id`, `event_type`, `schema_version`, `payload_hash`, `processing_status`, `last_error`, `received_at`, `processed_at`, UNIQUE `(producer,source_event_id)`; reject same event ID different payload hash.

`idempotency_records`: `id`, `actor_scope`, `operation`, `key_hash`, `request_hash`, `response_status`, `response_body_redacted`, `state PROCESSING/COMPLETED`, `expires_at`, UNIQUE `(actor_scope,operation,key_hash)`.

`job_leases` optional if repo standard scheduler/queue already supports uniqueness; don't invent shared Redis locks if DB transaction enough. Media access metadata has separate ACL tokens; never store reusable signed URLs indefinitely.

## 3.9 Migration order (DESIGN PROPOSED)

1. service_orders + service_bookings + booking_schedule_revisions.
2. worker_assignment_attempts + booking_active_assignments + service_visits.
3. diagnosis_versions + work/part items + consents.
4. executions + evidence.
5. payment obligations/attempts + Finance entitlement projections.
6. cancellation/issue/followup.
7. status/audit events + outbox/inbox/idempotency.
8. Add indexes/checks/constraints, validate reversible migration and seeded fixtures in isolated test DB.

Use additive migrations for existing Finance 06 only; backfill/default operations must not reinterpret 05A transactions. Never run `migrate:fresh` on shared/prod DB. Migrations reviewed before execution.

## 3.10 Monetary/rounding and Finance-owned totals

All amounts in IDR integer. Example Provider part qty=2, unit price=Rp75.000 → subtotal Rp150.000 (calculated server side); service work Rp200.000 → base Rp350.000. Finance receives immutable approved input and computes actual Customer total/Provider net using versioned applicable policies. For percent fees use Finance existing rounding conventions after verifying source; do not independently create different 05B rounding method. Vendor/merchant product amounts remain in 05A, never included in 05B service invoice.

---

# 04 — REST API CONTRACT (PROPOSED) + REQUEST/RESPONSE

All 05B endpoints in this section are **DESIGN PROPOSED**, not actual verified routes. Prefix illustration `/api/v1/order-jasa` follows existing 05A `/api/v1/order-barang`; adjust exact middleware/controller filenames to repo. Validate strict request schemas, server-generated IDs/prices, ownership/membership, idempotency, concurrency via `version`/`If-Match` when changed state could race.

## 4.1 Common request/response conventions

Successful response:

```json
{
  "data": { "id": "01SERVICEORDEREXAMPLE000001", "order_no": "JSA-2026-000125", "status": "CREATED", "phase": "DIAGNOSIS_PAYMENT_PENDING" },
  "meta": { "request_id": "request-001", "server_time": "2026-10-28T12:00:00Z", "version": 1 }
}
```

Error response:

```json
{
  "error": { "code": "SERVICE_ORDER_INVALID_TRANSITION", "message": "Pesanan tidak dapat diproses pada tahap saat ini.", "details": { "expected": "WORKER_FINISHED" }, "request_id": "request-001" }
}
```

Standard HTTP: `200` read/update, `201` create, `202` external asynchronous action accepted, `204` no content if appropriate, `400/422` validation, `401` anonymous, `403` unauthorized, `404` foreign hidden, `409` conflict/version/idempotency, `410` expired stale action, `429` rate limit, `502/503` upstream dependency failure. Do not turn dependency error into false financial success. `Idempotency-Key` required for every externally visible state mutation.

**Security:** browser token/session must use official Identity gateway; no `X-Role`/`X-User-Id` arbitrary authority. Internal route must cryptographically verify service identity and permission. `X-Source-Service` header by itself is insufficient.

## 4.2 Customer endpoint table

| Method | Route proposed | Purpose | Guard |
|---|---|---|---|
| `POST` | `/api/v1/order-jasa/bookings/quotes` | Validate offering/slot/fee/coverage before submit | CUSTOMER; quote expiring, no payment |
| `POST` | `/api/v1/order-jasa/orders` | Idempotently create Order + Booking/snapshots | CUSTOMER, quote/version, `Idempotency-Key` |
| `GET` | `/api/v1/order-jasa/orders` | List/filter/paginated customer orders | own customer scope |
| `GET` | `/api/v1/order-jasa/orders/{id}` | Full authorized detail, stage/action availability | own customer scope |
| `GET` | `/api/v1/order-jasa/orders/{id}/timeline` | Actual audited events | own customer scope |
| `GET` | `/api/v1/order-jasa/orders/{id}/payments` | Diagnosis/service Finance projection | own, no internal secrets |
| `POST` | `/api/v1/order-jasa/orders/{id}/diagnosis-payment` | Request/retrieve idempotent diagnosis invoice; returns 06 ref | own; quote valid; only >0 |
| `POST` | `/api/v1/order-jasa/orders/{id}/cancel` | Cancel before OTW / approved eligible stage | own, version/reason |
| `POST` | `/api/v1/order-jasa/orders/{id}/reschedule-response` | Accept/reject proposed schedule | own, pending version |
| `GET` | `/api/v1/order-jasa/orders/{id}/diagnosis` | Current published diagnosis + version | own, visible only once published |
| `POST` | `/api/v1/order-jasa/orders/{id}/diagnosis-response` | Remote approve/reject | own, remote clock, price version |
| `POST` | `/api/v1/order-jasa/orders/{id}/part-selection` | Request part source change/revision | own, before execution |
| `POST` | `/api/v1/order-jasa/orders/{id}/confirm-completion` | Complete after FINISHED+PAID+checks | own, version |
| `POST` | `/api/v1/order-jasa/orders/{id}/issues` | Report issue/unauthorized consent | own, evidence scope |
| `GET` | `/api/v1/order-jasa/orders/{id}/follow-up` | Show eligible prefilled draft | own |
| `POST` | `/api/v1/order-jasa/follow-ups/{draft_id}/activate` | Confirm schedule and activate new Order | own, entitlement guard |

Payment QRIS/VA actual read stays in Finance `/api/v1/finance/payments/{payment_id}` via authorized gateway, or BFF if necessary. 05B may return approved `payment_id` and safe instruction reference; **never** generate own QR/VA.

## 4.3 Provider endpoint table

| Method | Proposed route | Action |
|---|---|---|
| `GET` | `/api/v1/order-jasa/provider/orders?tab=...` | Provider organization-scoped list/count/status |
| `GET` | `/api/v1/order-jasa/provider/orders/{id}` | Full Provider order detail |
| `GET` | `/api/v1/order-jasa/provider/bookings/{id}/eligible-workers` | Fetch eligible workers after external Identity checks |
| `POST` | `/api/v1/order-jasa/provider/bookings/{id}/assignments` | Assign Worker; locks one active assignment |
| `POST` | `/api/v1/order-jasa/provider/bookings/{id}/reschedules` | Propose schedule to Customer; no silent update |
| `GET` | `/api/v1/order-jasa/provider/bookings/{id}/assignment-history` | Attempts, actors, reasons |
| `GET` | `/api/v1/order-jasa/provider/orders/{id}/finance-summary` | Read-only service Finance projection |
| `POST` | `/api/v1/order-jasa/provider/orders/{id}/issues` | Report operational issue/worker no-show |

Every Provider request derives `provider_org_id` from **verified membership + resource**; never trust a `provider_id` query alone to grant visibility. A Provider cannot approve Customer remotely or mark paid.

## 4.4 Worker endpoint table

| Method | Proposed route | Action / guard |
|---|---|---|
| `GET` | `/api/v1/order-jasa/worker/tasks?tab=...` | Assigned/accepted/history tasks scoped to worker |
| `GET` | `/api/v1/order-jasa/worker/tasks/{assignment_id}` | Read own task and eligible details |
| `POST` | `/api/v1/order-jasa/worker/assignments/{id}/accept` | Accept before operational due time |
| `POST` | `/api/v1/order-jasa/worker/assignments/{id}/reject` | Reject with mandatory reason |
| `POST` | `/api/v1/order-jasa/worker/orders/{id}/otw` | Accepted + eligible time/booking |
| `POST` | `/api/v1/order-jasa/worker/orders/{id}/arrived` | Only after OTW |
| `POST` | `/api/v1/order-jasa/worker/orders/{id}/diagnosis/draft` | Save draft without publish/payment |
| `POST` | `/api/v1/order-jasa/worker/orders/{id}/diagnosis/submit` | Publish immutable version and remote deadline |
| `POST` | `/api/v1/order-jasa/worker/orders/{id}/consents/in-person` | Record oral consent with Worker as actor |
| `POST` | `/api/v1/order-jasa/worker/orders/{id}/execution/start` | Active accepted Worker + current consent + no issue |
| `POST` | `/api/v1/order-jasa/worker/orders/{id}/execution/draft` | Save report/evidence draft |
| `POST` | `/api/v1/order-jasa/worker/orders/{id}/execution/finish` | Verify before/after etc.; trigger invoice outbox |
| `POST` | `/api/v1/order-jasa/worker/orders/{id}/visit/close` | After verified Finance PAID, or authorized exception path |
| `POST` | `/api/v1/order-jasa/worker/orders/{id}/issues` | Payment/safety/operational issues |

Worker must be exactly the active accepted assignee for mutation, and must not be suspended/removed from Provider (revalidation policy for in-progress exceptions). Client cannot send `finance_status=PAID` or `customer_id` as authority.

## 4.5 Admin Operations global read APIs

| Method | Proposed route | Purpose |
|---|---|---|
| `GET` | `/api/v1/order-jasa/admin/orders?status=...&payment=...&search=...&page=...` | Paginated all authorized Service Orders; counters/filters |
| `GET` | `/api/v1/order-jasa/admin/orders/{id}` | Full global Order detail including reason, versions, evidence refs, finance projections |
| `GET` | `/api/v1/order-jasa/admin/orders/aggregates` | Count by status/phase, no double counting payments |
| `GET` | `/api/v1/order-jasa/admin/issues` | Authorized exception queue; overdue, assignment failure, no-show |

Do not permit Admin to mark PAID, change approved price, directly move money, or complete on behalf of Customer without separately approved business override contract. Admin access requires real `ADMIN_OPERATIONS` permission; masking personal details on lists.

## 4.6 Example contracts

### 4.6.1 Customer create Order + Booking

```http
POST /api/v1/order-jasa/orders
Idempotency-Key: order-jasa-create-opaque-001
Content-Type: application/json
```

```json
{
  "offering_id": "OFF-AC-001",
  "booking_quote_ref": "QUOTE-VALIDATED-001",
  "complaint": "AC hidup tetapi tidak dingin",
  "symptoms": ["udara hangat"],
  "address_book_entry_id": "ADDR-OWN-001",
  "scheduled_start_at": "2026-10-29T02:00:00Z",
  "slot_reference": "SLOT-REAL-001",
  "client_request_id": "REQ-001"
}
```

`201` returns `order_id`, `booking_id`, `order_no`, `diagnosis_fee_idr`, `status`, `phase`, `diagnosis_payment_required`. Server resolves recipient/address and fee from trusted services, snapshots them and rejects mutated quote/slot. If external commit partially fails, reconciliation/outbox handles it; do not create a PAID Order on browser-only return.

### 4.6.2 Worker submit diagnosis version

```json
{
  "expected_order_version": 8,
  "diagnosis_draft_id": "DRAFT-DIAG-001",
  "initial_condition": "AC tidak dingin",
  "findings": "Kapasitor melemah",
  "recommendations": "Ganti kapasitor dan tes pendinginan",
  "before_evidence_refs": ["MEDIA-VALID-001"],
  "work_items": [{"line_no":1,"name":"Jasa ganti kapasitor","quantity":1,"unit_price_idr":175000}],
  "part_items": [{"line_no":1,"name":"Kapasitor AC","source":"PROVIDER_SUPPLIED","quantity":1,"unit_price_idr":95000}],
  "currency": "IDR"
}
```

Response includes `{diagnosis_version_id,version_no,service_base_total_idr:270000,price_snapshot_hash,submitted_at,remote_response_due_at (only remote)}`. Actual Finance checkout total **not** returned as definitive here unless Finance-priced quote is available; 05B can label **total dasar** only.

### 4.6.3 Worker in-person consent — not Customer action

```json
{
  "diagnosis_version_id":"DIAG-V2-001",
  "price_snapshot_hash":"SHA256-APPROVED-PRICE",
  "customer_present_reported":true,
  "verbal_explanation_confirmed":true,
  "statement":"Saya sudah menjelaskan pekerjaan dan rincian harga kepada Customer di lokasi."
}
```

Server: creates `method=WORKER_RECORDED_IN_PERSON`, `recorded_by_type=WORKER`, `recorded_by_id` from session, immutable timestamp and audit. No `approved_by=CUSTOMER` substitution. Notifying Customer and offering report/objection path are required. Worker cannot change version after record; submission does not set Finance PAID.

### 4.6.4 Worker finish report

```json
{
  "diagnosis_version_id":"DIAG-V2-001",
  "expected_execution_version":2,
  "before_evidence_refs":["MEDIA-VALID-001"],
  "after_evidence_refs":["MEDIA-VALID-POST-001"],
  "summary":"Kapasitor diganti dan pendinginan diuji",
  "test_result":"AC dingin setelah pengujian",
  "used_part_items":[{"approved_part_line_no":1,"quantity_used":1}]
}
```

Only after validating evidence, consent version, assignment, execution active and no contradictory data: set `WORKER_FINISHED` **once**, set `finished_at`, create `SERVICE_EXECUTION_PAYMENT_REQUESTED` outbox event; return `202` while Finance invoice pending creation. Subsequent retry returns the same finish result/payment obligation, never creates duplicate debt.

### 4.6.5 Customer confirm completion

```json
{
  "expected_order_version": 19,
  "acknowledgement":"Hasil pekerjaan telah saya periksa",
  "evidence_read":true
}
```

Server checks `WORKER_FINISHED`, Finance `SERVICE_EXECUTION PAID` verified, relevant event provenance, `completion_evidence_valid`, `no_active_issue`, and visit normal close or authorized issue resolution. If any check missing → `409 COMPLETION_NOT_ELIGIBLE` with safe missing guard codes; not fake COMPLETED.

## 4.7 Representative read payload / role-specific action flags

```json
{
  "data": {
    "order_id":"JSA-ID-001", "order_no":"JSA-000125",
    "status":"IN_PROGRESS", "phase":"EXECUTION_PAYMENT_PENDING",
    "service":{"name":"Perbaikan AC","provider_name":"Sejuk Jaya"},
    "booking":{"scheduled_at":"2026-10-29T02:00:00Z","timezone":"Asia/Jakarta"},
    "worker":{"public_name":"Teknisi A","visible":true},
    "diagnosis":{"version_no":2,"total_base_idr":270000,"status":"SUBMITTED"},
    "payments":{"diagnosis":{"status":"PAID","amount_idr":50000},"service_execution":{"status":"PENDING","finance_payment_id":"PAY-FIN-REAL-REF","expires_at":"2026-10-29T11:00:00Z"}},
    "actions":{"can_cancel":false,"can_pay_service":true,"can_confirm_complete":false,"can_report_issue":true},
    "timeline":[]
  }
}
```

**Illustrative payload.** Actual payment amount/method/expiry must be Finance-originated; read projection is eventually consistent and should expose `last_synced_at`/`pending_reconciliation`. Never send worker identity to Customer if assignment not `ACCEPTED` even if a foreign Worker row exists.

---
# 05 — AUTHENTICATION, RBAC, TENANCY & PRIVACY

## 5.1 Role/permission mapping (DESIGN PROPOSED; verify Identity registry)

| Permission conceptual | CUSTOMER | WORKER | PROVIDER | FINANCE OPS | ADMIN OPS |
|---|---:|---:|---:|---:|---:|
| `service_order.customer.create/read_own` | ✓ | — | — | — | — |
| `service_order.customer.cancel_eligible/respond_diagnosis/confirm` | ✓ own | — | — | — | — |
| `service_order.worker.read_assigned` | — | ✓ own | — | — | — |
| `service_order.worker.assignment.accept_reject` | — | ✓ own | — | — | — |
| `service_order.worker.visit/diagnosis/execute` | — | ✓ current assignment | — | — | — |
| `service_order.provider.read_org` | — | — | ✓ own org | — | — |
| `service_order.provider.assign/reschedule` | — | — | ✓ own org | — | — |
| `service_order.admin.global.read` | — | — | — | — | ✓ authorized |
| `service_order.admin.issue.read_or_operate` | — | — | — | — | ✓ narrow permission |
| `finance.ops.payment.simulate_demo` | — | — | — | ✓ nonprod | — |
| `finance.ops.refund.read/handle` | — | — | — | ✓ | — |
| `finance.spay.provider.read/withdraw` | — | — | ✓ with finance org permission | — | — |
| `finance.spay.customer_refund.read/withdraw` | ✓ own | — | — | — | — |

CEO policies managed by role `CEO_PRODUCT_OWNER` in Finance only; not Order 05B. The exact role/permission code must be resolved from Identity source before code. A role membership alone might be insufficient: verify service provider org finance rights separately. All roles must pass `authenticated → account active → permission → org/assignment membership → resource ownership → state guard`.

## 5.2 Public authorization rules

- Customer: service_orders.customer_id strictly from authenticated Identity, not body. Customer-only refund and contact masked as allowed. Order detail unauthorized returns 404/403 without existence leak.
- Provider: provider org is current authorized organization of user; get explicit scoped organization context, not any user-provided `org_id`.
- Worker: may view assigned tasks only; assignment `ASSIGNED` gives limited job info, `ACCEPTED` enables full operational details. Only **one current active** worker mutation at a time; invalidated/expired assignment loses action authority.
- Admin: read-only global queries authorized; no direct paid/refund/withdraw action in Service Order detail. Audit admin viewed sensitive data if required.
- Finance Ops: read payments/ledger according to finance permission; simulator additionally nonproduction guard, role, amount and idempotent provider event verification. No simulation button for worker/customer/provider.

## 5.3 Service-to-service trust boundary

Finance ↔ 05B must authenticate via **approved S2S secret/signature identity/mTLS/gateway credential** and bind it to producer+permissions; HTTP `X-Source-Service` is only an informational header and cannot authenticate a request. Verify method/path/body digest, event ID, timestamp skew, signing key rotation if HMAC chosen. Internal routes must not be internet/browser accessible. No replay of stale signed messages without idempotency check; no shared production key exposed to Next.js.

## 5.4 Evidence/access policy

Evidence before/after and diagnosis can expose interior homes or private items. Upload via authorized media service with MIME sniffing, size limits, malware scanning policy, private object ACL, expiring signed read URLs, integrity SHA256, retention rules, consent/access logging as required. Never return permanent public CDN URL for private photos. Customer can view own, Worker only own assigned/history as policy, Provider own org, Admin narrowly authorized.

## 5.5 Privilege test matrix

- Customer A cannot read Customer B's Order, diagnosis, invoice, address, follow-up draft or refund.
- Worker A cannot mutate Worker B task, even with guessed Order ID; old rejected/expired assignee cannot OTW or finish.
- Worker ASSIGNED pending not visible by name on Customer payload (not just hidden by CSS).
- Provider org A cannot view/mutate org B; suspended Provider blocked for new operations while history remains.
- Remote consent from Worker token forbidden; Worker in-person consent must retain Worker actor.
- Finance PAID event from fake header/browser rejected; `provider_org_id` cannot be changed in billing payload to divert earnings.
- ADMIN_OPERATIONS cannot trigger simulation/withdrawal with forged finance role query/header.
- Finance 06 service simulator nonprod-only; test `APP_ENV=production` denies regardless of operator.

---

# 06 — STATE MACHINES, BUSINESS TRANSACTIONS, CLOCKS & SCHEDULERS

## 6.1 Core state separation

Do **not** place dozens of UI labels into `service_orders.status`. Separate:

| Aggregate | Suggested states | Source |
|---|---|---|
| ServiceOrder | `CREATED`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` | 05B |
| Booking | `REQUESTED`, `READY`, `RESCHEDULE_PROPOSED`, `CANCELLED` | 05B |
| AssignmentAttempt | `ASSIGNED`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `CANCELLED` | 05B |
| Visit | `NOT_STARTED`, `ON_THE_WAY`, `ARRIVED`, `DIAGNOSING`, `DIAGNOSIS_SUBMITTED`, `APPROVED`, `EXECUTING`, `WORKER_FINISHED`, `VISIT_CLOSED` | 05B |
| DiagnosisVersion | `DRAFT`, `SUBMITTED`, `SUPERSEDED` | 05B |
| Consent | `APPROVED`, `REJECTED`, `INVALIDATED` and `method` | 05B |
| Execution | `NOT_STARTED`, `IN_PROGRESS`, `WORKER_FINISHED` | 05B |
| Payment | `PENDING`, `PAID`, `EXPIRED`, `FAILED`, `VOID` per actual Finance | Finance 06 |
| Obligation (05B projection) | `NOT_REQUIRED`, `REQUIRES_INVOICE`, `INVOICE_PENDING`, `PAID`, `OVERDUE`, `CLOSED` | 05B derived, Finance authoritative |
| Funds | `HELD`, `AVAILABLE`, `LOCKED`, etc. actual Finance state | Finance 06 |
| Issues | `OPEN`, `REQUIRES_REVIEW`, `RESOLVED` | issue authority / 05B projection |

Optional `service_orders.phase` stage is a **projection** with stable codes (e.g. `DIAGNOSIS_PAYMENT_PENDING`, `WAITING_ASSIGNMENT`, `WORKER_ASSIGNED`, `WORKER_ACCEPTED`, `WORKER_OTW`, `WORKER_ARRIVED`, `DIAGNOSIS_IN_PROGRESS`, `CONSENT_PENDING`, `EXECUTING`, `WORKER_FINISHED_PAYMENT_PENDING`, `PAYMENT_OVERDUE`, `WAITING_CUSTOMER_COMPLETION`). Stage derives from committed aggregates/events via centralized domain projector; one phase update does not delete detail states.

## 6.2 Order canonical transitions

```text
CREATED (Booking+snapshot committed; diagnosis invoice if required)
   ├── diagnosis PAID / zero-fee eligible → CONFIRMED
   └── cancel / diagnosis expires unpaid → CANCELLED
CONFIRMED (booking ready, assign, accept, OTW, ARRIVED)
   ├── Worker OTW/ARRIVED/diagnosis → IN_PROGRESS
   └── eligible cancel before OTW / provider unable → CANCELLED
IN_PROGRESS
   ├── diagnosis submitted + Customer rejects / valid remote timeout / part unavailable → CANCELLED
   ├── consent valid → EXECUTION_IN_PROGRESS (visit/execution stage)
   ├── Worker FINISHED → service invoice PENDING/OVERDUE → still IN_PROGRESS
   └── FINISHED + service PAID + completion guards → COMPLETED
CANCELLED terminal; COMPLETED terminal for 05B canonical progression
```

**Do not** transition `WORKER_FINISHED → COMPLETED` merely because evidence exists. **Do not** transition `PENDING → PAID` in Order state from client simulation; only consume verified Finance event.

## 6.3 Transition guard/action matrix

| Mutation | Precondition | Commit 05B | Outbox / side effect |
|---|---|---|---|
| Create booking | Customer active, offering/Provider/area/slot validated | Order CREATED, Booking REQUESTED, snapshots | `DIAGNOSIS_INVOICE_REQUESTED` if fee>0 |
| Diagnosis payment PAID | verified Finance event matching Order+purpose+amount | obligation paid, Order CONFIRMED, Booking READY | BookingReady notification |
| Diagnosis free | trusted Phase04 snapshot fee=0 | obligation NOT_REQUIRED, Order CONFIRMED | BookingReady |
| Provider assign | booking READY, worker eligible, no active assignment | attempt ASSIGNED + active slot | AssignmentCreated notification |
| Worker accept | assigned, owner, not expired, still eligible | attempt ACCEPTED | WorkerAccepted; Customer visibility enabled |
| Worker reject | assigned, owner, reason | REJECTED, active slot cleared | Provider reassign notification |
| Worker OTW | accepted, booking valid, not cancelled | visit ON_THE_WAY, Order IN_PROGRESS | OTW event; disable normal Customer cancel |
| Worker ARRIVED | ON_THE_WAY | visit ARRIVED | ARRIVED event |
| Start diagnosis | ARRIVED | visit DIAGNOSING | audit |
| Submit diagnosis | valid draft/evidence/items/Worker | immutable SUBMITTED diagnosis, current version, visit pending consent | Customer notification; remote 30m scheduler eligibility |
| Record in-person | Worker current, Customer presence reported, exact version | Worker-authored consent APPROVED, audit | Notify Customer + objection possibility |
| Remote response | Customer owner, current published version, 30m valid | APPROVED or REJECTED consent | approved enables execution; rejected cancels |
| Start execution | consent valid, version unchanged, no relevant active issue, worker accepted | execution IN_PROGRESS | audit |
| Worker finish | execution in progress; before/after/test valid | FINISHED, immutable approved basis, obligation REQUIRES_INVOICE | **Finance service invoice request** only now |
| Service payment PAID | verified Finance event, same obligation | obligation PAID, paid_at | notify Customer/Worker/Provider |
| Worker close visit | Finance PAID verified or authorized issue exit | VISIT_CLOSED and reason | audit |
| Customer complete | FINISHED+PAID+valid evidence+no active issue+visit guards | Order COMPLETED, `completed_at` | `SERVICE_ORDER_COMPLETED` to Finance |
| Auto complete | same plus elapsed 72h | Order COMPLETED | same event once |
| Cancel pre-OTW | no OTW, authorized Customer, no service delivered | Order CANCELLED, cancellation record | request Finance refund of paid diagnosis, if any |
| Cancel after valid diagnosis | reason eligible, no started execution | Order CANCELLED; `diagnosis_fulfilled=true` after proof validation | `DIAGNOSIS_EARNED_ON_CANCEL` for Finance hold |

## 6.4 Booking/payment sequence and atomicity

1. Customer requests quote. 05B validates offering, Provider, coverage and slot via real 01/04 authority. Capture short-lived quote/revision with authoritative fee and terms; quote not a payment.
2. Customer submits Order with idempotency key; 05B local transaction creates Order, Booking, diagnosis obligation, snapshots, audit, outbox. Commit Order before triggering Finance call; only once.
3. Outbox dispatcher securely calls Finance service invoice creation. Finance has own transaction/ID + outbox. If Finance unavailable, 05B shows `WAITING_INVOICE` and retry, **not** booking eligible.
4. Finance creates QRIS/VA mock PENDING with `issued_at`, `expires_at=+6h`; invoice read projection updated via trusted response/event; Customer may read Finance safe payment instruction.
5. Finance Ops demo simulates SUCCESS through existing route; Finance verifies reference/amount/time/state; ledger posted once; outbox PAID event delivered 05B; 05B inbox + Order/Booking update locally.
6. Payment may arrive before `PENDING` projection due out-of-order callback: accept verified monotonic PAID only if obligation/payment ownership/amount matches, reconcile via Finance read; do not regress to PENDING.
7. If diagnosis fee zero: no Finance payment or cash ledger; set `NOT_REQUIRED` and explicit valid eligibility. Refund of zero is no-op, never S-Pay credit.

**Compensation** if slot gets invalidated after Order created: keep Order safely pending/resolution, do not create multiple Finance invoices. If paid and Provider cannot serve before OTW, cancellation/refund path must work even if booking service temporarily unavailable.

## 6.5 Assignment response 30 **operational** minutes

- Start at `assigned_at` with provider/worker authoritative timezone and hours; store computed `response_due_at` derived by 01/04 operating schedule. Do **not** take server time as local business hours without conversion.
- The counter pauses outside valid operating periods if that is how authoritative 30 operating minutes is defined; no invented 08–17 fallback in prod.
- Acceptance races expiry job: acquire assignment + booking active slot lock, compare status+time (DB/server authoritative); exactly one wins. If expiry wins, Worker gets `410 ASSIGNMENT_EXPIRED` and Provider may reassign.
- Scheduler every minute (configurable) queries due ASSIGNED attempts with `SKIP LOCKED`/safe claim; only attempts still current become EXPIRED; record event. Worker previously REJECTED does not get reactivated.
- If hours contract missing: `PENDING_OPERATING_SCHEDULE` operational blocked in production; demo can use explicit fixture with mock label, no fabricated SLA PASS.

## 6.6 Remote 30m consent clock

- Only remote consent is timed. Start from `diagnosis_versions.published_to_customer_at` **and confirmed delivery/availability basis**. Do not start from Worker drafting or field showing before Customer can access.
- Publish creates version-bound consent request, `remote_response_due_at=available_at+30min`. Backend scheduler expires **only** if no valid Customer response and no issue indicating notification/access failure.
- No auto-consent. Valid timeout closes original Order `CANCELLED/CUSTOMER_REMOTE_NO_RESPONSE` if diagnosis was genuinely fulfilled. Otherwise `REQUIRES_REVIEW` until authority determines safe next step, no automatic earned income.
- Customer in-person consent has **no 30m deadline**. Worker reports it with audit; Customer objection can create active issue and pause work if raised before start, and block later completion/release if reported afterward. Worker can't mark issue resolved.
- Version changed → old consent invalidated; new version needs a new request/clock; prevent endless resets by abuse controls and audit.

## 6.7 Sparepart decisions and follow-up (no multiple visit)

- Sources validated per item. `PROVIDER_SUPPLIED`: server computes qty×price, snapshots unit; customer selects accepted source/version.
- `SERVIO_MERCHANT`: only Product 03/05A order refs from authenticated owner and compatible item specs; payment and shipping independent 05A; 05B **never** credits Provider with the 05A product amount.
- `CUSTOMER_SUPPLIED`: price excluded from 05B invoice, compatibility/safety assessment by Worker before execution.
- If part unavailable for same visit and execution not begun: Order BATAL reason `SPAREPART_UNAVAILABLE`, diagnosis fulfilled if valid, Finance hold begins from authorized cancel; follow-up DRAFT generated idempotently with original diagnosis version + entitlement to skip survey charge.
- Activating follow-up revalidates service/Provider/Customer/slot and eligible diagnosis reuse. New Order has one new Booking, **no Worker copied as active**; same complaint/diagnosis photo prefills. Never auto charge diagnosis second time. If significant condition change requires new paid diagnosis, require a separate explicit approval; no arbitrary entitlement timeout hidden from Customer.
- If part unavailable after execution already started: safety/issue procedure; do not force cancel as if pre-execution. For V2 keep issue OPEN and operational decision pending; price adjustments under authorized process, not automatic.

## 6.8 Finish → service invoice (post-work) exactly once

Critical transaction:

```text
BEGIN 05B local transaction
  SELECT service_order FOR UPDATE
  SELECT execution FOR UPDATE
  assert status EXECUTION_IN_PROGRESS + approved version + evidence valid
  update execution WORKER_FINISHED, finished_at=server UTC
  set service obligation (order_id, SERVICE_EXECUTION) REQUIRES_INVOICE
     unique(order_id,purpose), immutable price basis/diagnosis_version_id
  insert status event + outbox SERVICE_EXECUTION_INVOICE_REQUESTED
COMMIT
Outbox → trusted Finance 06 service invoice create (idempotent)
Finance creates one obligation / first payment attempt PENDING (expiry 6h)
Finance event → 05B inbox → projection updated
```

If after finish there is no amount owed for a legitimately zero-priced service, no fake PAID; use explicit contract `NO_PAYMENT_REQUIRED` approved by Finance with full ledger/no-charge semantics. **Do not silently conclude every service is free**. For failures in invoice creation, show `Tagihan Sedang Disiapkan` and retry outbox, not `PAID`.

## 6.9 Worker visit closure and payment issue

Normal `Akhiri Kunjungan` requires Finance service payment PAID confirmation; close visit is **not** Order completion (Customer may still need to confirm). Exception `Laporkan Kendala Pembayaran` creates issue, reason, evidence; operational safety permits Worker to leave, with `visit_close_reason=PAYMENT_ISSUE_AUTHORIZED` only by proper procedure. **Never lock Worker at site until expiry or instruct coercion.** Invoice obligation remains due, visit closed exception, Customer/Provider/Admin see pending/overdue and follow-up.

## 6.10 Six-hour overdue and replacement attempt

- Finance invoice issued after FINISHED; `expires_at=issued_at+6h` is source of truth.
- At Finance EXPIRED, 05B remains `IN_PROGRESS` and projection becomes `PAYMENT_OVERDUE`; show Customer tab Belum Bayar and a safe Pay Again/refresh action.
- **One obligation, at most one active attempt**: Finance must atomically close expired prior attempt and create replacement for same obligation reference/price snapshot. Reuse same obligation ID, don't create new work/double fees/second payable ledger.
- Concurrent old PAID vs replacement creation: Finance first locks obligation and checks all attempts; if any attempt paid, no replacement and reconciliation marks obligation satisfied; if old response arrives late, reconcile provider event validity and reverse/cancel replacement as needed, **never accept two successful funds as one obligation** without explicit overpayment refund handling. If a true double payment occurs, Finance records duplicate collection liability and separately refunds it; never double credit Provider.
- Payment now overdue **does not** auto BATAL, COMPLETED, refund, or start release 120h. Optional reminder schedule at invoice creation, before expiry, and after 24h admin follow-up remains optional operational defaults; no fee penalties hardcoded.

## 6.11 Completion: customer action and 72h auto

**Eligibility must be checked atomically at completion:**

```text
execution.status == WORKER_FINISHED
AND diagnosis_version/current_consent valid for completed work
AND evidence.before and evidence.after valid OR authorized evidence exception
AND Finance 06 authoritative SERVICE_EXECUTION obligation == PAID
    (or explicit trusted NO_PAYMENT_REQUIRED, if applicable)
AND confirmed payment amount/ref + same approved price revision
AND no active Customer issue/consent objection/safety/payment issue affecting completion
AND visit closed normal OR authorized resolved exit path
AND Order not CANCELLED or already COMPLETED
```

`auto_eligible_at = max(worker_finished_at, service_payment_paid_at) + 72 hours` (LOCKED rule from V2); **not** `issued_at+72h`, **not** after diagnosis PAID. Timer and explicit Customer completion share the same `SELECT FOR UPDATE` transition service and same idempotent single `SERVICE_ORDER_COMPLETED` outbox.

If issue authority unavailable, **do not** mark eligibility `true` from missing response. Completion can remain pending with readable reason. Customer clicking confirmation during unsettled issue returns conflict; do not erase history.

## 6.12 Cancellation/refund and earned diagnosis

| Scenario | Order state | 05B outbox | Finance authority/result |
|---|---|---|---|
| Diagnosis unpaid, Customer cancel | CANCELLED | invoice void/cancel if active | no refund; PENDING not cash |
| Diagnosis PAID, Worker not OTW | CANCELLED | `SERVICE_DIAGNOSIS_REFUND_REQUESTED` | full amount paid refunded; S-Pay Customer only when SUCCEEDED |
| Worker OTW but Provider failed/no diagnosis | special operational resolution | authorized failure + refund request | no earned diagnosis unless proof validates |
| Valid diagnosis; reject price | CANCELLED | `SERVICE_DIAGNOSIS_EARNED_ON_CANCEL` | HELD 120h from validated `cancelled_at` |
| Valid diagnosis; part unavailable | CANCELLED | earned diagnosis + followup draft | same; no double fee on followup |
| Remote no response after valid publication | CANCELLED | earned diagnosis | same, with delivery/availability proof |
| Service FINISHED unpaid/overdue | NOT CANCELLED | invoice still due, issue if needed | no earned execution release |
| Paid execution but never started, cancel eligible | CANCELLED | refund execution if any payment exists | full execution allocation refund, survey earned if already done |
| Work quality complaint after finish | IN_PROGRESS/pending handling | issue hold and decision proof | funds blocked, no guessed refund amount |

**Cancellation and refund are different operations**. If Finance event hasn't been delivered, 05B remains BATAL with `refund=PENDING/UNKNOWN`. Complaint resolution cannot be performed by inventing Admin authority; expose dependency `PENDING_ISSUE_CLEARANCE` and allow safe freeze.

## 6.13 Scheduler matrix

| Job proposed | Frequency | Data gate | Idempotent action |
|---|---|---|---|
| `ExpireDiagnosisPayments` | 1–5 minutes | Finance confirmed EXPIRED/unpaid | cancel 05B if unpaid, never if PAID |
| `ExpireWorkerAssignments` | 1 minute | computed 30 operating min passed, current attempt | attempt EXPIRED, release active slot |
| `ExpireRemoteConsents` | 1 minute | 30m since published/access valid, no decision/issue | cancel with reason, earned survey if fulfilled |
| `ReconcileFinancePayments` | periodic + on retry | pending invoice/late event, authenticated Finance read | monotonic update, no double obligation |
| `CreateMissingServiceInvoices` | outbox worker | FINISHED and no invoice | one invoice obligation and attempt |
| `AutoCompleteEligibleOrders` | 5–15 minutes | FINISHED+PAID, due 72h, all guards | COMPLETED once |
| `Dispatch05BOutboxEvents` | queue/1 minute | retry-able outbox, safe leases | signed S2S, backoff/dead letter |
| `HandleStuckBookingsAndIssues` | configurable | assignment no-worker, payment overdue | notify/admin attention; no silent money movement |
| `FinanceMatureServiceFunds` | Finance existing scheduler extended | 120h + entitlement/issue check | HELD→AVAILABLE once in Finance |
| `FinanceExpirePaymentAttempts` | Finance existing scheduler | expiry and not PAID | EXPIRED, notify 05B, no ledger receipt |

Use transactionally safe claim and recheck inside job; jobs must tolerate repeated triggers, worker crashes, out-of-order events, and temporary service outages.

---
# 07 — FINANCE 06 EXTENSION: S2S APIs, EVENTS, LEDGER, REFUND, S-PAY

**CRITICAL:** Finance snapshot has 05A-oriented controllers/routes; the service-order extension below is **CONTRACT PENDING**. Reuse finance data model, CEO policy engine, existing simulator and ledger primitives when compatible; **do not** send a fictitious `merchant_order_id` as service Order to a 05A refund endpoint. Payment ownership, component allocations and entitlement triggers differ. Implement additive migrations/handlers and feature flags if required.

## 7.1 Actual Finance routes observed in provided source-only ZIP

| Current Finance endpoint observed | Notes |
|---|---|
| `GET /api/v1/finance/payments/{payment_id}` | customer/authorized read; scope check to be verified |
| `GET /api/v1/finance/payments/{payment_id}/receipt` | after PAID; don't expose cross-owner allocations |
| `POST /api/v1/finance/demo/payments/{payment_id}/simulate` | Finance Ops + demo middleware, payload `outcome,provider_event_id,reported_amount_idr` |
| `GET /api/v1/finance/ops/payments` | Finance Ops operational listing |
| `GET /api/v1/finance/ops/refunds` | read refunds |
| `GET /api/v1/finance/ops/withdrawals` | withdrawals read |
| `GET /api/v1/finance/spay/me` | current Customer only |
| `GET /api/v1/finance/spay/organizations/{org_id}` | current route middleware `MERCHANT,FINANCE_PAYMENT_OPS`, **Provider role not enabled in snapshot** |
| `GET /api/v1/finance/held-funds` | current Merchant/Finance Ops scope |
| `POST /api/v1/finance/withdrawals/quote`, `/withdrawals` | current withdrawal engine; Provider authorization extension needed |
| `POST /internal/v1/finance/checkout-quotes` | 05A product group contract |
| `POST /internal/v1/finance/checkouts/{checkout_group_id}/payment-intents` | 05A payment contract |
| `POST /internal/v1/finance/refunds/order-cancellations` | 05A cancellation contract |
| `POST /internal/v1/finance/order-events` | 05A event contract |
| `POST /internal/v1/finance/held-funds/process-matured` | service release job endpoint existing, needs service-order semantics |

These were inspected in **uploaded source-only snapshot**, not live head; Coding Agent MUST compare with actual repo and regression tests. Existing simulator must remain non-production and not directly set PAID without existing verification layer.

## 7.2 Finance 05B entities (ADDITIVE DESIGN PROPOSED)

Avoid duplicating ledger or wallet tables. Extend existing Finance entities with a **typed service transaction source** and purpose:

| Finance entity/column concept | Purpose/constraints |
|---|---|
| `finance_service_orders` or generalized transaction context | order_id, customer_id, provider_org_id, service_version, currency, source_domain `SERVICE_05B` |
| `service_payment_obligations` | one Order+`DIAGNOSIS` / `SERVICE_EXECUTION`; pricing source/version/hash, financial customer obligation |
| `service_payment_attempts` or existing `payment_intents` adapted | 1..N attempts per obligation, 1 current, Finance-owned PENDING/PAID/EXPIRED, method, 6h expiry |
| `service_payment_allocations` | snapshot payer/customer charges, provider earnings, applicable policy/fees and tax references |
| `held_order_funds` generalization | hold purpose `DIAGNOSIS_CANCELLED_EARNED` or `SERVICE_COMPLETED_EARNED`, release times, source event unique |
| `refund_transactions` generalization | scoped to specific service obligation + paid attempt, full/partial eligibility decision, not 05A merchant allocation |
| `spay_accounts` owner type extension | `PROVIDER_ORGANIZATION` with verified membership, same ledger/account security as Merchant, no duplicate physical account when owner identity is same |
| `ledger_journals`, `ledger_lines`, `spay_movements` | **Reuse** double-entry, unique event IDs, strict balancing and available/held invariants |
| `finance_inbox_events`, `finance_outbox_events` | dedup + reliable delivery to 05B |

Finance implementation team must inspect actual table structure/migrations before choosing separate tables vs generalized polymorphic type; respect existing unique keys/foreign indexes and preserve 05A ledger semantics. **No direct 05B SQL FK into Finance DB.**

## 7.3 New internal Finance capabilities (proposed contract)

| Method | Route proposal | Service caller | Contract/result |
|---|---|---|---|
| `POST` | `/internal/v1/finance/service-orders/{order_id}/diagnosis-invoices` | authenticated 05B | create/reuse diagnosis obligation+PENDING invoice after booking or NO_PAYMENT_REQUIRED |
| `POST` | `/internal/v1/finance/service-orders/{order_id}/execution-invoices` | authenticated 05B | only valid 05B FINISHED event + approved immutable basis; create/reuse service obligation + attempt |
| `GET` | `/internal/v1/finance/service-orders/{order_id}/payments` | 05B | authoritative payment statuses, attempt refs and amounts |
| `POST` | `/internal/v1/finance/service-orders/{order_id}/payment-replacements` | 05B authorized workflow | expire/lock prior attempt, create one replacement on same obligation |
| `POST` | `/internal/v1/finance/service-orders/{order_id}/refunds` | trusted 05B authorized cancel/resolution | refund eligible paid obligation allocation, receipt, status |
| `GET` | `/internal/v1/finance/service-orders/{order_id}/refunds` | trusted 05B | refund status authoritative |
| `POST` | `/internal/v1/finance/service-orders/{order_id}/events` | trusted 05B event handler | 05B completed/cancelled-with-valid-diagnosis/issue hold/clearance |
| `GET` | `/internal/v1/finance/service-orders/{order_id}/funds` | trusted 05B | held/available summary without unrelated tenant data |
| `POST` | `/internal/v1/finance/service-orders/{order_id}/reconciliation` | internal service worker | reconcile one obligation; no side effects unless authorized and idempotent |

**Names are proposals**. Decide final URL shape after route audit. Existing 05A payment creation route can be refactored into shared internal domain service but do not break its wire contract or accidentally accept 05B under `checkouts/` without explicit schema/version/routing.

### 7.3.1 Request diagnosis invoice

```json
{
  "source_domain":"SERVICE_05B",
  "source_event_id":"05B-DIAGNOSIS-BILL-001",
  "service_order_id":"JSA-ORDER-ID-001",
  "customer_id":"CUSTOMER-01",
  "provider_org_id":"PROVIDER-ORG-01",
  "purpose":"DIAGNOSIS",
  "service_offering_id":"OFFERING-01",
  "diagnosis_fee_idr":50000,
  "offering_snapshot_version":"V4",
  "booking_snapshot_hash":"SHA256-BOOKING-PRICE-SNAPSHOT",
  "platform_policy_fee_exempt":true,
  "currency":"IDR",
  "preferred_method":"QRIS"
}
```

**Response concept**:

```json
{
  "data": {
    "finance_obligation_id":"OBL-DIAG-001",
    "payment_id":"FIN-PAY-001",
    "purpose":"DIAGNOSIS",
    "status":"PENDING",
    "currency":"IDR",
    "customer_total_idr":50000,
    "expires_at":"2026-10-29T11:00:00Z",
    "payment_instruction":{"type":"DEMO_QRIS","is_real_payment":false,"display_text":"SIMULASI"},
    "policy_exemption_applied":true
  }
}
```

**Rules**: `platform_policy_fee_exempt` in body is **not authoritative on its own**—Finance validates source_domain+purpose+S2S caller and its own documented diagnosis exemption. If diagnosis_fee_idr 0: Finance may return `NO_PAYMENT_REQUIRED` without payment_id, or 05B avoids call with trusted Phase04 proof; decide official contract and test. Never apply an invented customer fee or negative Provider entitlement. Check lawful tax treatment independently; do not silently count tax as a platform fee.

### 7.3.2 Request service execution invoice (after finished)

```json
{
  "source_domain":"SERVICE_05B",
  "source_event_id":"05B-FINISH-EVT-001",
  "service_order_id":"JSA-ORDER-ID-001",
  "customer_id":"CUSTOMER-01",
  "provider_org_id":"PROVIDER-ORG-01",
  "purpose":"SERVICE_EXECUTION",
  "execution_id":"EXEC-001",
  "worker_finished_at":"2026-10-29T10:00:00Z",
  "approved_diagnosis_version_id":"DIAG-V2-001",
  "approved_price_snapshot_hash":"SHA256-APPROVED-PRICE",
  "work_items":[{"line_no":1,"name":"Jasa ganti kapasitor","quantity":1,"unit_price_idr":175000,"subtotal_idr":175000}],
  "provider_part_items":[{"line_no":1,"name":"Kapasitor","quantity":1,"unit_price_idr":95000,"subtotal_idr":95000}],
  "excluded_part_references":[{"source":"SERVIO_MERCHANT","order_barang_ref":"MORD-EXAMPLE-IF-ANY"}],
  "currency":"IDR"
}
```

Finance verifies event is from authenticated 05B and ServiceOrder state/proof is genuine through trusted event/confirmation; does **not** treat arbitrary body booleans as proof. It computes **applicable CEO fee policies** by target and version, adds customer-target charges correctly, deducts Provider-target charges from entitlement, stores immutable version snapshots and legal tax references, issues exactly one current payment attempt. Service Order cannot set final policy commission. Cross-service cache/version mismatches → `409 PRICING_SNAPSHOT_MISMATCH` and payment not issued until reconciliation.

**Example with no CEO fees (test fixture only):** work Rp175.000 + Provider part Rp95.000 → base Rp270.000, payment PENDING amount Rp270.000. If CEO policy applies, Finance authoritative amount may differ. Never hardcode that zero-fee sample as production.

### 7.3.3 Trusted Finance paid event

```json
{
  "event_id":"FIN-EVT-PAID-001",
  "event_type":"FINANCE_PAYMENT_PAID",
  "event_schema_version":1,
  "producer":"FINANCE_06",
  "occurred_at":"2026-10-29T10:20:00Z",
  "source_domain":"SERVICE_05B",
  "service_order_id":"JSA-ORDER-ID-001",
  "finance_obligation_id":"OBL-SERVICE-001",
  "finance_payment_id":"FIN-PAY-002",
  "purpose":"SERVICE_EXECUTION",
  "status":"PAID",
  "amount_paid_idr":270000,
  "currency":"IDR",
  "price_snapshot_hash":"SHA256-APPROVED-PRICE",
  "finance_journal_ref":"JOURNAL-UNIQUE-001"
}
```

Transport envelope must be authenticated + idempotent; source event IDs and payload stable; an event using same ID with different content is security failure. 05B validates order/purpose/payment ref/amount vs known Finance obligation (via authenticated reconciliation if missing) before marking projection PAID. Duplicate PAID event leaves the same state, never duplicates completed event or S-Pay balance.

### 7.3.4 Trusted 05B cancel with diagnosis earned event

```json
{
  "source_event_id":"05B-CANCEL-EVT-001",
  "event_type":"SERVICE_DIAGNOSIS_EARNED_ON_CANCEL",
  "service_order_id":"JSA-ORDER-ID-001",
  "customer_id":"CUSTOMER-01",
  "provider_org_id":"PROVIDER-ORG-01",
  "cancelled_at":"2026-10-29T10:10:00Z",
  "cancel_reason_code":"CUSTOMER_DECLINED_REPAIR",
  "diagnosis_fulfilled":true,
  "diagnosis_version_id":"DIAG-V2-001",
  "diagnosis_evidence_hash":"SHA256-EVIDENCE",
  "diagnosis_payment_ref":"FIN-PAY-001"
}
```

Finance independently verifies diagnosis payment **actually PAID** and no refund already funded, cancellation rule eligible, no issue hold; entitlement equals verified paid diagnosis amount subject to lawful obligations, not arbitrary value from Worker. `HELD release_eligible_at = cancelled_at + 120h`; **the original Order stays CANCELLED**. Event from 05B with `diagnosis_fulfilled=true` alone insufficient absent evidence/approved guard: Finance may require attestation/ref/source proof and reconciliation.

### 7.3.5 Trusted completion event

```json
{
  "source_event_id":"05B-COMPLETED-EVT-001",
  "event_type":"SERVICE_ORDER_COMPLETED",
  "service_order_id":"JSA-ORDER-ID-001",
  "completed_at":"2026-11-01T10:00:00Z",
  "provider_org_id":"PROVIDER-ORG-01",
  "execution_payment_ref":"FIN-PAY-002",
  "diagnosis_payment_ref":"FIN-PAY-001",
  "completion_evidence_hash":"SHA256-COMPLETION-EVIDENCE",
  "issue_clearance_ref":"AUTHORIZED-CLEARANCE-IF-REQUIRED"
}
```

Finance derives net entitlement from its allocations of verified receipts. It creates HELD records **once** per unique earning source, releases after 120h if eligible. A service order that later generated a follow-up must not credit original diagnosis again. Completion cannot be imported from 05A `DELIVERED` event semantics.

### 7.3.6 Refund request

```json
{
  "source_event_id":"05B-REFUND-REQUEST-001",
  "service_order_id":"JSA-ORDER-ID-001",
  "purpose":"DIAGNOSIS",
  "cancel_reason_code":"CUSTOMER_CANCEL_PRE_OTW",
  "cancelled_at":"2026-10-29T08:00:00Z",
  "refund_eligibility_ref":"05B-AUTHORIZED-CANCELLATION-RECORD"
}
```

Finance computes refund against **paid amount/allocation snapshot**, not accepting a client `refund_amount_idr` as authoritative. For pre-OTW full refund → total diagnosis payment returned (subject only to lawful obligatory treatment). `PENDING` refund creates no S-Pay Customer credit. `SUCCEEDED` triggers exactly one funded movement and event. If old finance journal already released/withdrawn, enforce funded-source/exception workflow, never conjure negative balance.

## 7.4 CEO fee & tax integration requirements

1. Fee policy stores arbitrary CEO-created **name**, amount type fixed/percentage, effective revision, payer/recipient target combinations (`CUSTOMER`,`MERCHANT`,`PROVIDER`), applicability including product/service and checkout/payment occurrence rules. For 05B execution, Finance uses only applicable target(s) and snapshots.
2. Diagnosis exemption is a platform-level rule keyed by transaction type, not a UI label or silent 0 when policy service unreachable. If 06 cannot prove exemption, return configured failure and block payable invoice, not fake settled data.
3. Transaction that touches Customer and Provider may have separate **Customer charge** and **Provider commission**; do not combine both as a Customer charge unless CEO policy explicitly says so. Merchant-target fee does not automatically apply to Provider Jasa.
4. Policy once-per-order vs once-per-payment must be explicit: for 05B, diagnosis exempt and execution charged according to official effective per-Order applicability; no duplicated fee on replaced invoice or follow-up for same underlying obligation.
5. Item-level base eligibility: fees/tax may depend on service work vs Provider part; Finance identifies category and basis, stores exact policy version, hash, approved price version and rounding method.
6. Tax obligations required by law are not erased by exemption of CEO platform fees; do not invent PPN/PPh rates in 05B. Finance must have verified reference/rule or clearly block taxed production transactions until compliant.
7. Snapshot after invoice created: edits to CEO policies must not retroactively change an already approved/issued debt or replacement invoice. Amendments require controlled adjustment/resolution, not silent reprice after Worker finishes.

## 7.5 Ledger/accounting invariants

- Payment PENDING: **no received cash journal**; Finance Ops list can still display it.
- PAID: record received cash/clearing and matching customer obligation/allocated funds once, according to Finance existing double-entry model. **PAID ≠ AVAILABLE**.
- Earned diagnosis on authorized BATAL after service delivered: move provider entitled amount into HELD with 120h, not create second cash receipt.
- Order COMPLETED with service PAID: entitlement for completed service and any diagnosis payment not yet released becomes HELD for 120h after completion; no separate overlapping release record for diagnosis.
- Do not allow an Order BATAL with previously refunded diagnosis to also release that diagnosis to Provider. A single payment allocation cannot simultaneously be fully refunded and fully provider-released.
- Refund SUCCEEDED: Customer refund S-Pay credited exactly once, backed by actual Finance funded source. Reverse/adjust relevant Provider entitlement safely when permitted; do not allow negative ledger by ignoring already-withdrawn payouts.
- Customer S-Pay can receive small refunds below withdrawal min; balance exists but cashout blocked until >= Rp20.000.
- Provider S-Pay `AVAILABLE` is withdrawal-eligible, not payment PAID; only Finance release changes it after lock + issue check.
- Concurrent release vs refund/hold: lock payment allocation/entitlement and use unique movement refs. One wins, other rechecks and may enter exception needing funding if funds already paid out.
- All ledger journals balanced; money conserved. Use durable source_ref (`SERVICE_05B`, order_id, purpose, payment/refund/event) and uniqueness constraints across retries.

## 7.6 Hold and release state machine

```text
Finance payment PAID → funds received / allocated but not S-Pay AVAILABLE
   ├── Order CANCELLED pre OTW → refund pathway → Customer S-Pay after SUCCEEDED
   ├── Order CANCELLED + diagnosis delivered valid → Provider entitlement HELD
   │      └── 120h + no blocking issue → AVAILABLE
   └── Worker FINISHED + service PAID + Order COMPLETED → Provider entitlement HELD
          └── 120h + no blocking issue → AVAILABLE
AVAILABLE → withdrawal request (LOCKED) → bank payout SUCCESS/FAILED
FAILED confirmed → restore the locked nominal to AVAILABLE exactly once
```

**No release from payment issuance**, no release from Worker FINISHED, no release because Finance simulator was clicked, and no release from Customer opening a receipt page.

## 7.7 Customer and Provider S-Pay API extension

- Customer refund uses existing `/api/v1/finance/spay/me` and movement paths, only after Finance refund SUCCEEDED.
- Provider org S-Pay must support Provider authorized membership/finance permission; snapshot routes currently `MERCHANT/FINANCE_PAYMENT_OPS`, so **explicitly extend/migrate role-aware account access** and test that Merchant 05A still works. Avoid separate finance wallet that breaks consolidation by organization if Identity uses same organization entity.
- Provider earnings view shows `HELD`, `AVAILABLE`, event source `DIAGNOSIS` or `SERVICE_EXECUTION`, gross, fee snapshot, net, `release_eligible_at`, issue lock.
- Withdrawal min Rp20.000, partial amount, verified bank, step-up, quote fee deducted from amount, nonce + idempotency, status/failed recredit as existing Finance 06 policy. Customer S-Pay refund no top-up/payment use.
- Finance Ops must be able to view service payments, refunds, held fund details, provider payouts and reconciliation in existing sidebar, with filters by source/purpose, **not** new silo named Finance Jasa.

## 7.8 Reliable outbox/inbox and reconciliation

**Outbox event examples from 05B:** `SERVICE_ORDER_CREATED`, `DIAGNOSIS_INVOICE_REQUESTED`, `DIAGNOSIS_FULFILLED`, `SERVICE_EXECUTION_INVOICE_REQUESTED`, `SERVICE_ORDER_COMPLETED`, `SERVICE_ORDER_CANCELLED`, `SERVICE_DIAGNOSIS_EARNED_ON_CANCEL`, `SERVICE_REFUND_REQUESTED`, `SERVICE_ISSUE_OPENED`, `SERVICE_ISSUE_RESOLVED`, `FOLLOWUP_DRAFT_ACTIVATED` (not all Finance-bound).

**Finance → 05B:** `FINANCE_PAYMENT_PENDING`, `FINANCE_PAYMENT_PAID`, `FINANCE_PAYMENT_EXPIRED`, `FINANCE_REFUND_STATUS_CHANGED`, `FINANCE_SERVICE_FUNDS_HELD`, `FINANCE_SERVICE_FUNDS_AVAILABLE`, `FINANCE_SERVICE_PAYMENT_ATTEMPT_REPLACED`.

Envelope fields: `event_id`, `event_type`, `producer`, `aggregate_type`, `aggregate_id`, `aggregate_version`, `schema_version`, `occurred_at`, `correlation_id`, `causation_id`, `payload_hash`, `payload`; transport authenticated and replay-resistant. Consumers reject unknown version/producer unauthorized rather than silently applying. Persist inbox dedup, apply local mutation + inbox status transactionally; if event is valid but referential prerequisite not yet visible, queue delayed retry/reconcile, never fabricate reference.

Dispatcher requirements: DB claim atomic with lease, finite retries/backoff+jitter, visible dead-letter/manual replay with same source event_id, idempotent destination, metrics. Finance outbox must have real dispatcher path or explicit worker test evidence; having an `OutboxPublisher` class alone is **not** proof events reach 05B. Source snapshot must be audited for full transport and publisher startup.

**Reconciliation:** if 05B says PENDING but Finance says PAID, reconcile via trusted Finance read → update projection while respecting events/ledger proof. If 05B says PAID and Finance has no matching paid event/journal, freeze completion, record anomaly and investigate; don't downgrade history blindly. If old and new payment attempts both paid, Finance treats surplus as overpayment liability and avoids second Provider entitlement.

## 7.9 Payment simulation current behavior and tests

Existing snapshot route:

```http
POST /api/v1/finance/demo/payments/{payment_id}/simulate
Content-Type: application/json
# authenticated FINANCE_PAYMENT_OPS session and demo environment
```

```json
{
  "outcome":"SUCCESS",
  "provider_event_id":"MOCK-SERVICE-PAY-UNIQUE-001",
  "reported_amount_idr":270000
}
```

This is **not** a public Customer endpoint; `provider_event_id` unique, `reported_amount_idr` must equal actual **Finance issued amount** (example no-fee fixture only). `SUCCESS` is processed by existing Finance verification service; only then PAID/outbox. Need verify that new source type `SERVICE_05B` is supported by its validation and allocation handlers before enabling service simulator. Never send a fake 05B Payment ID not yet created by Finance and claim success.

Test failures: `401` missing session; `403/404` wrong role/environment; `404` unknown Payment ID; `409/410` EXPIRED or already terminal; `422` wrong amount/method/event body; `500` real bug with logs, no blanket UI success. Repeating same simulation event ID is idempotent; different event ID after Paid cannot double-post ledger. E2E result requires **05B Order projection changes after Finance successful simulation**, not just Finance card turning green.

## 7.10 Integration dependency/status tracker

| Integration | Owner | Implementation status before work | Acceptance evidence |
|---|---|---|---|
| Finance service-order diagnosis invoice | Finance 06 | PENDING | real MySQL `PENDING`, amount no platform fee, Finance Ops visible |
| Finance service-order execution invoice | Finance 06 | PENDING | only created after FINISHED, approved amount/policy snapshot |
| Finance service-source simulator | Finance 06 | PENDING EXTENSION | same demo endpoint + service source success → 05B PAID |
| Finance order-event earned diagnosis on CANCELLED | Finance 06 | PENDING | HELD 120h→AVAILABLE without `COMPLETED` |
| Finance cancellation refund | Finance 06 | PENDING | SUCCEEDED → Customer S-Pay exactly once |
| Finance Provider org S-Pay | Finance 06 + Identity | PENDING | Provider member access own org, Merchant unaffected |
| Finance replacement invoice | Finance 06 | PENDING | one obligation, no double paid or fee |
| Finance issue hold clearance | Issue authority + Finance | PENDING | cannot release with open blocked issue |
| Authenticated Finance↔05B outbox/inbox | Both | PENDING | trusted signed events and replay test |
| Phase 04 offering fee/coverage/slot | Service 04 | PENDING | real authoritative fee and availability validated |
| Identity worker/hours | Identity 01 | PENDING | 30 operational minutes test crossing closed hours |

---
# 08 — FRONTEND↔BACKEND CONTRACT: TAB, CARD, DETAIL, MODAL, STATUS

**Purpose:** frontend-first 05B mock UI can later swap to real adapters without rebuilding pages; do not leak source 05A/06 credentials into browser. All role UIs consume centralized `ServiceOrderView`/stage/action mapper from 05B read API (Finance data authoritative even when projected). Server returns allowed actions based on actual ownership/state; disabled frontend button is only UX and not security.

## 8.1 Canonical tab projection matrix

| Trigger / phase | Customer tab (substatus) | Worker tab | Provider tab | Finance |
|---|---|---|---|---|
| Order created, diagnosis invoice PENDING | **Belum Bayar — Diagnosis** | — | Not assignable | diagnosis PENDING |
| Diagnosis fee Rp0, eligible | **Menunggu Jadwal** | — | **Booking Masuk** | no invoice |
| Diagnosis PAID | **Menunggu Jadwal** | — | **Booking Masuk** | diagnosis PAID, funds received but not available |
| Provider assignment ASSIGNED | Menunggu Jadwal — Mencari Teknisi | **Tugas Masuk** | **Penugasan** | unchanged |
| Worker REJECTED/EXPIRED | Menunggu Jadwal — Mencari Teknisi | **Riwayat** | Penugasan — Cari Pengganti | unchanged |
| Worker ACCEPTED | Menunggu Jadwal — Teknisi Ditugaskan | **Terjadwal** | **Berlangsung** | unchanged |
| Worker ON_THE_WAY | **Berlangsung — Teknisi Menuju Lokasi** | **Berlangsung** | Berlangsung | unchanged |
| Worker ARRIVED | Berlangsung — Teknisi Tiba | Berlangsung | Berlangsung | unchanged |
| Diagnosis draft/in progress | Berlangsung — Sedang Diperiksa | Berlangsung | Berlangsung | unchanged |
| Diagnosis submitted, consent pending | Berlangsung — Menunggu Persetujuan | Berlangsung | Berlangsung | NO service invoice yet |
| Consent recorded by Worker in person | Berlangsung — Disetujui di Lokasi (catatan Worker) | Berlangsung | Berlangsung | NO service invoice yet |
| Remote Customer approves | Berlangsung — Disetujui | Berlangsung | Berlangsung | NO service invoice yet |
| Execution IN_PROGRESS | Berlangsung — Sedang Dikerjakan | Berlangsung | Berlangsung | NO service invoice yet |
| Worker FINISHED, invoice being created | **Belum Bayar — Tagihan Sedang Disiapkan** | **Selesai — Menunggu Bayar** | Berlangsung | payment creation pending |
| Service invoice PENDING | Belum Bayar — Bayar Pengerjaan | Selesai — Menunggu Bayar | Berlangsung | execution PENDING |
| Execution payment EXPIRED | Belum Bayar — Pembayaran Terlambat | Selesai — Menunggu Bayar | Berlangsung — Pembayaran Terlambat | EXPIRED / replacement |
| Finance execution PAID | Berlangsung — Konfirmasi Selesai | Selesai — Pembayaran Berhasil | Berlangsung — Menunggu Konfirmasi | execution PAID |
| Worker visit closed | Berlangsung — Menunggu Konfirmasi | Selesai — Kunjungan Diakhiri | Berlangsung | unchanged |
| Customer/auto completes | **Selesai** | Selesai | **Selesai** | entitlement HELD 120h |
| Customer cancels before OTW | **Batal** | Riwayat if previously assigned | Batal | refund pending/succeeded if paid |
| Customer declines after valid diagnosis | Batal — Tidak Lanjut | Riwayat | Batal | diagnosis earned HELD |
| Sparepart unavailable | Batal — Sparepart Tidak Tersedia | Riwayat | Batal | diagnosis earned HELD; draft follow-up |
| Remote response timeout valid | Batal — Tidak Ada Respons | Riwayat | Batal | diagnosis earned HELD |
| Worker issue/no-show | stage based, Laporkan Kendala | own applicable stage | Provider operational handling | funds blocked/refund only if authorized |

**No duplicate tab counts:** each unique Order counted once in Customer and Provider. Worker can have multiple assignment attempts for one Order; Worker **Tugas Masuk/History** counts unique **assignment attempts**, current active worker tasks unique by active assignment and not duplicated across tabs. Admin Service Orders counter counts **Orders**, not payment attempts.

## 8.2 Customer list/card/detail contracts

| Tab | Card primary fields | Detail panels | Actions |
|---|---|---|---|
| Belum Bayar | order_no, service name/photo, Provider, scheduled slot, type DIAGNOSIS/EXECUTION, due amount, expiry/overdue | booking, diagnosis if available, price/fee breakdown, Finance QRIS/VA instructions & payment history | Bayar, Cek Status, Lihat Detail, Batalkan only eligible, Laporkan Masalah |
| Menunggu Jadwal | order_no, Provider, location summary, date/time, diagnosis status, assignment stage | complaint, address snapshot, schedule change, worker identity **only if accepted**, history | Lihat Detail, Batalkan pre-OTW, Tanggapi Reschedule |
| Berlangsung | service, Provider, Worker accepted, stage, timestamp, action request | diagnosis/photo, work lines, parts, consent, work progress/evidence, completion, issues | Lihat Diagnosis, Pilih Part, Setujui/Tolak, Konfirmasi Selesai, Laporkan Masalah as eligible |
| Selesai | service, Provider, Worker, completed_at, total paid (two phases separated), after photo | read-only audit timeline, diagnosis, final work, before/after, receipt and after-sales availability | Detail, Bukti, After-Sales link if actual |
| Batal | reason label, cancellation time, diagnosis delivered flag, refund status, follow-up eligibility | audit, valid diagnosis evidence, refund amount/status, follow-up draft | Detail, Refund, Hasil Diagnosis, Lanjutkan Perbaikan if eligible |

**ServiceOrderDetail view** two-column desktop: left service/complaint/schedule/contact snapshot/diagnosis/version/priced work/parts/consent/photos; right current status and one primary CTA/timer/Finance invoice/Refund/timeline/issue. Render `WAITING_FINANCE` gracefully; never substitute fake PAID to avoid blank card. Address/private data only on authorized detail. All timestamps display Asia/Jakarta or actual saved service timezone.

## 8.3 Worker list/card/detail contracts

| Tab | Dataset | Card | CTA |
|---|---|---|---|
| **Tugas Masuk** | assignment `ASSIGNED` current worker | assignment_ref, order_no, service, Provider, area, slot, complaint, 30 operating min remaining | Terima, Tolak(+reason), Detail |
| **Terjadwal** | own assignment ACCEPTED, visit NOT_STARTED | Customer contact/visit address allowed, schedule, issue flags | Mulai Perjalanan, Detail, Laporkan Kendala |
| **Berlangsung** | own current accepted visit OTW through executing | visit stage, approved diagnosis version, consent, part source, timer remote | Saya Tiba, Mulai Diagnosis, Draft/Submit, Catat Persetujuan di Lokasi, Mulai Pekerjaan, Selesaikan |
| **Selesai** | own `WORKER_FINISHED` job (may be payment PENDING) | before/after preview, summary, payment status, visit close status | Detail, Akhiri Kunjungan when PAID, Laporkan Kendala Pembayaran |
| **Riwayat** | own rejected/expired/cancelled attempts or Order cancelled after diagnosis | outcome/reason/time, proof if eligible | Lihat Riwayat |

Worker detail must avoid displaying Provider S-Pay and bank data. Worker cannot simulate payment, set Customer remote consent, or alter Finance fee. If payment PENDING, `Akhiri Kunjungan` disabled in normal path; issue report option remains.

## 8.4 Provider list/card/detail contracts

| Tab | Order predicate | Card | CTA |
|---|---|---|---|
| **Booking Masuk** | diagnosis paid/free eligible; no active assignment | customer, service, complaint, slot, area, diagnosis paid | Pilih Worker, Lihat Detail, Usulkan Reschedule |
| **Penugasan** | active ASSIGNED or reassign required | candidate Worker, due, last rejection, attempts | Tugaskan Ulang, Detail, Reschedule |
| **Berlangsung** | ACCEPTED through FINISHED/PAID before Order completion | Worker, stage, consent, service finance status | Monitor, Detail, Hubungi Worker, Laporkan Kendala |
| **Selesai** | Order COMPLETED | order, Customer, Worker, paid totals, Provider held/available source | Detail, Bukti, Lihat S-Pay |
| **Batal** | Order CANCELLED | reason, diagnosed flag, status refund, diagnosis earning eligibility | Detail, Hasil Pemeriksaan, Riwayat Dana |

Provider detail: Worker history, booking versions, diagnosis and price version, consent source, part selection, before/after, Finance status/receipt references, timeline, issue, fund eligibility (Finance-only), verified profile. Provider has **no ACC Harga** modal/button.

## 8.5 Finance Ops existing sidebar mapping

### Escrow & Bayar

- One table/filters by source `PRODUCT_05A`, `SERVICE_05B_DIAGNOSIS`, `SERVICE_05B_EXECUTION`.
- Required fields: invoice/payment id, linked Order, Customer, provider/merchant, payer, purpose, `PENDING/PAID/EXPIRED`, method QRIS/VA, amount, `issued_at`, `expires_at`, receipt/allocated.
- Existing demo `Simulasi Pembayaran` only for Finance Ops and eligible nonprod payment. **Mock payment being displayed ≠ received escrow**. No special Worker paid button.
- For service execution, show two accounting lines separately: already paid diagnosis and current service obligation; diagnosis not recharged.

### Refund, Dana Ditahan, S-Pay

- Refund: linked service Order and purpose, status/PENDING/SUCCEEDED/FAILED, finance evidence, customer SPay movement only when SUCCESS.
- Held: provider earnings for diagnosis-cancelled or completed work, gross/fee/net, eligible release, blocked issue flags; Finance owned.
- Provider S-Pay screen reuse Merchant structure but Provider organization-scope and permissions; quote/withdrawal from Finance server, customer S-Pay refund-only.

## 8.6 Admin Operations Global Orders → Service Orders

- Must appear within existing Admin `Order Global` tab **Service Orders**, next to Product Orders; do not break Product Orders or count both payments as two Orders.
- Table fields: Order ID + service name + picture, Customer+area, Provider+accepted Worker, scheduled date/slot, diagnosis payment status, service payment status (if exists), current stage, cancellation reason/overdue, latest activity, `Lihat Detail`.
- Filters: status tab, phase, payment diagnosis vs service, overdue, date, Provider, location, unassigned/no-show/issue, search `order_no`, customer/provider/service/accepted Worker. Server-side pagination and aggregate counts based on 05B Order tables.
- Detail two columns: immutable service/address/complaint snapshot, assignment attempts, visit OTW/arrived, diagnosis versions/evidence, price/consent source, work before/after, two payment refs, refund/HELD status, issue/audit timeline. Admin uses authorized aggregate read model and Finance scoped reference, **no direct Finance account lookup with spoofed org IDs**.
- Actions read-only by default. Authorized operational resolution separately permissioned and audited; never provide `mark PAID`, hidden refund ledger control, Customer-consent impersonation.

## 8.7 Modal/Form contract and server-side validation matrix

| Modal/form | Field/action | Server guard |
|---|---|---|
| Customer Booking | complaint, address ID, slot, quote | offering/area/slot valid, idempotency |
| Booking Cancel | reason | Order current, Worker NOT OTW, refund eligibility |
| Reschedule Response | proposal version + accept/reject | Customer owner, slot revalidated, no silent change |
| Provider Assign | Worker ID | membership ACTIVE, capable, area/time eligible, one active |
| Worker Reject | reason, note | assigned owner and status, not stale |
| Worker OTW/Arrived | action | accepted, sequential visit guard |
| Worker Diagnosis | findings, before photo, work & part item arrays | media private and valid, subtotal server computed, version hash |
| Worker Consent in Person | statement, version, reported presence | Worker actor, no Customer impersonation; notify/report |
| Customer Remote Consent | version/hash + approve/reject | owner, 30m remote, published version, no auto |
| Customer Part Selection | selected source and proof | pricing revision & consent invalidation |
| Worker Start Work | no arbitrary price/payment state | valid consent, current worker and version |
| Worker Finish | before/after/test/parts | evidence and execution valid; invoice requested once |
| Worker Close Visit | finish + Finance PAID | normal PAID or authorized safe exit |
| Customer Completion | acknowledgement | FINISHED + PAID + issue clear + time/visit guards |
| Customer Issue | reason/photos | permitted stage, no self-resolution of hold |
| Customer Followup Activate | draft ID, new slot | no second survey charge, eligibility, customer confirm |
| Finance Demo Sim | existing Finance JSON | role+nonprod+true payment and amount verification |

## 8.8 UI error/loading status contract

- `401` → authenticated login refresh; `403` → izin tidak ada; `404` → resource hidden/not found; `409/410` → data changed, refresh detail and show specific reason; `422` → field errors; `429` → backoff; `503` upstream unavailable → show pending, no false paid or released.
- Display `Tagihan Sedang Disiapkan` when 05B finish committed but Finance invoice not yet created; don't invent QRIS.
- If PAID Finance but 05B projection pending due outbox delay, show `Memverifikasi Status Pembayaran` and refresh, not Worker normal close until authoritative evidence available.
- Stale modal must include `expected_version`, reject after someone else acted; prevents dual assignment/consent/finish from two tabs.
- During real integration, frontend adapter swaps `MockOrderJasaRepository` → real API calls; dev mock must be disabled in production; no local mock PAID used in real ledger.

---

# 09 — ERROR HANDLING, TEST PLAN, CONCURRENCY, E2E ACCEPTANCE

## 9.1 Test infrastructure and safety

- Isolated MySQL databases for `order_jasa_test`, `finance_test`, and simulated 01/04 dependencies with contract mocks clearly identified. Never run destructive migrations/tests against default development shared DB or production.
- Test actor matrix Customer A/B, Provider org A/B, Worker assigned/unassigned, Finance Ops, Admin Ops. Test two timezones/closed-business-hours intervals and deterministic frozen clocks.
- Use server/Finance simulator actual endpoint in E2E, not hand-patch database PAID. Keep 05A baseline suite green separately.
- Unit test state machine, row-lock concurrency, timestamp, amount, policy eligibility; integration test outbox delivery, service auth, event retries, Finance ledger uniqueness; UI E2E at least main route and cancellation/overdue.

## 9.2 Functional test matrix — booking, identity, assignment

| ID | Scenario | Expected result |
|---|---|---|
| B01 | Active offering, valid Customer/area/slot, fee diagnosis>0 | one Order/Booking, obligation, Finance PENDING invoice |
| B02 | Free diagnosis fee=0 | eligible booking; no payment_id/ledger fake PAID |
| B03 | Cancel unpaid booking | BATAL, no refund balance; void invoice if active |
| B04 | Finance sim diagnosis SUCCESS | Finance PAID, 05B CONFIRMED, Provider Booking Masuk, Customer Menunggu Jadwal |
| B05 | PAID event duplicate/out-of-order | one status transition, no duplicate journal/events |
| B06 | Customer tries second Order with same idempotency key/payload | original result returned; no second booking/payment |
| B07 | Same key different payload | 409; no duplicate |
| B08 | Invalid/suspended offering/Provider/area | 422/409; no payable invoice |
| B09 | Slot concurrent booking | one booking eligible; other conflict, no double charging |
| A01 | Assign Worker ineligible/not same Provider | denied; no assignment |
| A02 | Two concurrent Provider assignments for same booking | one active slot, one conflict |
| A03 | Worker reject with reason | historical REJECTED, Provider reassign |
| A04 | Worker reject without reason | validation error |
| A05 | Worker accept before due | ACCEPTED, Customer gets worker public profile |
| A06 | Worker accept simultaneously with expiry | exactly one winner; no phantom accepted after expired |
| A07 | Assignment clock across closed hours | due based on verified operating schedule, not wall 30min |
| A08 | Worker ASSIGNED but not accepted | Customer API does not contain Worker identity |
| A09 | Worker tries OTW before accepting | 409; no stage mutation |
| A10 | Worker tries ARRIVED before OTW | 409 |
| A11 | Provider proposes reschedule without Customer accept | schedule unchanged; history pending |
| A12 | Customer accepts reschedule | booking revision applied with slot revalidation |

## 9.3 Functional test matrix — diagnosis, consent, sparepart, execution

| ID | Scenario | Expected result |
|---|---|---|
| D01 | Worker submits diagnosis before ARRIVED | reject |
| D02 | Missing before photo on photo-applicable service | reject or authorized evidence exception |
| D03 | Invalid attachment owner/MIME/size | reject, no media leak |
| D04 | Provider part qty×unit price manipulated from client | server recomputes; mismatch reject |
| D05 | Customer-owned part has price | excluded from 05B billing; other fields preserved |
| D06 | SERVIO 05A part order ref doesn't belong Customer | reject/hidden |
| D07 | Worker submits version 1 and edits after submission | immutable; version 2 required, history retained |
| D08 | Worker records oral consent | actor=WORKER, method in-person, Customer informed |
| D09 | Worker submits `CUSTOMER_REMOTE_APPROVED` | forbidden |
| D10 | Customer remote approve 29m, same version | valid if accessible and eligible |
| D11 | Customer remote approve after due & expiry committed | 410/409; no work grant |
| D12 | Remote timer source not accessible/delivery failure | not silently cancel+earn; operational review |
| D13 | Remote no response 30m valid | BATAL reason, diagnosis earnings only if valid |
| D14 | Customer rejects price | BATAL, diagnosis held, no service invoice |
| D15 | Customer changes Provider part to self-owned | new version; Provider price removed; prior consent invalid |
| D16 | Unsafe/incompatible Customer part | Worker refuses, issue/cancellation flow; no unsafe start |
| D17 | Part unavailable before work | BATAL + follow-up draft without survey recharge |
| D18 | Follow-up activated by wrong Customer | forbidden |
| D19 | Follow-up reused for different problem | deny benefit, no silent new charge |
| D20 | Start execution without valid consent | reject; NO service invoice |
| D21 | Worker starts after valid consent before service payment | **allowed** (payment is after finish) |
| D22 | Worker tries change price after consent without revision | reject |
| D23 | Worker finish without after evidence/summary | reject; not FINISHED |
| D24 | Worker double-click finish / network retry | one finish, one obligation, one invoice request |

## 9.4 Payment/ledger/hold/refund tests

| ID | Scenario | Expected result |
|---|---|---|
| F01 | Worker approves price / starts execution | **NO service invoice** before finish |
| F02 | Worker FINISHED verified | exactly one Finance service execution invoice PENDING, 6h expiry |
| F03 | Finance Ops simulator untouched | PENDING, Customer Belum Bayar, Worker Selesai, Provider Berlangsung |
| F04 | Finance Ops sim SUCCESS with correct reference/amount | Finance PAID and 05B projection converges; Worker Close Visit eligible |
| F05 | Wrong actor/browser calls demo endpoint | 401/403/404, no paid journal |
| F06 | Wrong reported amount/event ID | 422/409; no ledger change |
| F07 | Simulate same SUCCESS twice | one payment journal, one event, no duplicated S-Pay balance |
| F08 | Payment 6h EXPIRED after real work | Order IN_PROGRESS / OVERDUE, not BATAL or COMPLETED |
| F09 | Create replacement concurrently from two requests | one current attempt for same obligation, no repricing/fee duplication |
| F10 | Late old payment PAID races replacement | financial reconciliation without double collection or Provider credit |
| F11 | Service FINISHED, payment still pending after 72h | auto-COMPLETED blocked |
| F12 | Service PAID, FINISHED, visit/evidence all valid, Customer completes | COMPLETED once, hold begin |
| F13 | 72h elapsed since max(finish,paid), issue OPEN | auto completion blocked |
| F14 | Issue authority unreachable | fail closed; no premature COMPLETED/release |
| F15 | 120h after COMPLETED | Provider entitlement AVAILABLE exactly once if eligible |
| F16 | PAID diagnosis + Customer cancel pre OTW | diagnosis refund full, no Provider earning |
| F17 | Refund still PENDING | Customer S-Pay not credited |
| F18 | Refund SUCCEEDED reprocessed | Customer S-Pay credit once |
| F19 | BATAL after valid diagnosis | Provider diagnosis HELD 120h from cancelled_at, no Completed fraud |
| F20 | BATAL after fake/unverified diagnosis | no earned entitlement; issue/review |
| F21 | Follow-up with reused diagnosis | no second survey invoice and no second Provider survey release |
| F22 | CEO policy changed after service invoice | already issued debt/fee snapshot unchanged |
| F23 | Service invoice includes Merchant 05A sparepart | **must fail**; only Provider-supplied part billed by 05B |
| F24 | Provider tries cross-org S-Pay | 403/404, no data leak |
| F25 | Refund Rp15.000 | Customer S-Pay credited, withdrawal blocked <Rp20k |
| F26 | Provider withdrawal >=Rp20k with bank fee | correct quote net, one lock, SUCCESS posts once |
| F27 | Payout FAILED confirmed | locked nominal returned AVAILABLE once |
| F28 | Held release race with refund | one valid financial state; no negative ledger or duplicate movement |

## 9.5 End-to-end scenarios (run with actual backend; not mock-only)

**E2E-01 Normal full service:**

1. Customer opens active Service Offering; booking; diagnosis invoice PENDING (Finance Ops sees it).
2. Finance simulator SUCCESS → `PAID`; 05B booking READY; Provider Booking Masuk.
3. Provider assigns Worker; Worker accepts; Customer only now sees Worker profile.
4. Worker OTW→ARRIVED→submit diagnosis/photo/price/part; Customer remote approves or Worker records genuine in-person report; Worker start work **before execution payment**.
5. Worker finish with before/after and summary; only NOW Finance execution invoice PENDING. Verify Customer Belum Bayar, Worker Selesai, Provider Berlangsung, Admin Global still one Order.
6. Finance Ops simulator SUCCESS → Finance PAID; Worker close visit; Customer confirm; Order COMPLETED; Finance HELD 120h; scheduler moves funds AVAILABLE once; Provider requests manual withdrawal min20k.
7. Verify 05A regressions unchanged; payment, ledger, S-Pay and Order IDs correlate across services.

**E2E-02 Customer cancel pre OTW after paid diagnosis:** refund full, S-Pay Customer credits only SUCCEEDED, Provider does not earn diagnosis.

**E2E-03 Customer rejects after valid diagnosis:** BATAL, no execution invoice, diagnosis hold 120h from cancellation and release once.

**E2E-04 Sparepart unavailable:** original BATAL and follow-up draft, activation reuses diagnosis evidence/fee waiver, new booking/worker assignment; old diagnosis funds not credited twice.

**E2E-05 Worker FINISHED but Finance PENDING/EXPIRED:** worker reports issue, can leave safely; Customer overdue, new payment attempt on same obligation; no auto-cancel/complete; late payment reconciliation.

**E2E-06 Fraudulent in-person consent report:** Customer dispute/report; audit Worker; block progression or completion/release based on issue; never claim remote approved.

**E2E-07 Source event replay:** outbox dispatch duplicated + Finance event duplicated across restart; one invoice, one paid ledger, one completion, one hold, one release, one refund credit.

**E2E-08 Admin Global:** count Service Orders, open detail including diagnosis/payment/refund, ensure read-only and Product Orders 05A unaffected.

## 9.6 Security, performance, failure testing

- Auth/tenant isolation, guessed resource IDs, hidden Worker identity, finance secret leakage from Next.js build; role spoofing and fake `X-Source-Service` header.
- Rate limit diagnosis/finish/complaints; Customer address privacy; signed photo URLs expire; cross-role evidence ACL.
- Connection down between 05B and Finance: 05B local commit/outbox retries, no duplicate invoice. Finance PAID but 05B restart: inbox/reconciliation eventually converges.
- MySQL lock tests with competing assignments, cancellation vs OTW, diagnosis consent timeout vs acceptance, Finish vs duplicate Finish, PAID vs EXPIRED, refund vs release, Payout vs Release.
- Pagination and indexes on 10k+ Order demo seed for Admin Service Orders; aggregation count not dependent on page size; no N+1 issuing Finance calls per row. Use authorized projection/batch read.
- Production flags: Finance demo endpoints 404/403, all MOCK_05B state stores disabled, test data not shown as actual 05A records.

## 9.7 Proposed run commands and PASS evidence

**Audit repository first**, then run only commands valid for actual paths/environment:

```bash
# From real 05B Laravel service path (illustrative)
php -v
php artisan route:list
php artisan migrate:status
php artisan schedule:list
php artisan test

# Finance 06 regressions in isolated test DB
php artisan route:list
php artisan test

# Frontend Next.js
npx tsc --noEmit
npm run lint       # only if script exists
npm run build
```

No test command is considered PASS until actual stdout, exit code, database environment and assertions are provided. Never run `migrate:fresh` on a shared/prod database. `php artisan test` may be dangerous if configured test database is wrong—inspect `.env.testing` and CI config first. For browser E2E use permitted test credentials and nonproduction Finance simulator only.

## 9.8 Error catalog (stable codes proposed)

| Code | HTTP | Meaning |
|---|---:|---|
| `SERVICE_OFFERING_NOT_ELIGIBLE` | 409/422 | inactive, wrong Provider/area or invalid price snapshot |
| `BOOKING_SLOT_CONFLICT` | 409 | slot already unavailable |
| `DIAGNOSIS_PAYMENT_NOT_PAID` | 409 | no Worker assignment before paid/free eligible |
| `ASSIGNMENT_ALREADY_ACTIVE` | 409 | one active Worker only |
| `ASSIGNMENT_EXPIRED` | 410 | 30m operating deadline elapsed |
| `WORKER_NOT_CURRENT_ASSIGNEE` | 403/404 | Worker not assigned or invalidated |
| `VISIT_INVALID_TRANSITION` | 409 | ARRIVED without OTW etc. |
| `DIAGNOSIS_VERSION_STALE` | 409 | consent/pricing version mismatch |
| `REMOTE_CONSENT_EXPIRED` | 410 | decision after valid 30m window |
| `CONSENT_NOT_VALID` | 409 | no valid consent/issue active |
| `SPAREPART_NOT_AVAILABLE_FOR_VISIT` | 409 | cannot proceed work, followup path |
| `WORK_FINISH_EVIDENCE_INCOMPLETE` | 422 | before/after/report missing |
| `SERVICE_INVOICE_NOT_READY` | 409/503 | Finance creation in progress/dependency down |
| `SERVICE_PAYMENT_NOT_PAID` | 409 | no normal visit close/completion |
| `PAYMENT_ATTEMPT_EXPIRED` | 410 | 6h expired; replacement path |
| `PAYMENT_OBLIGATION_ALREADY_SATISFIED` | 409 | no second customer charge |
| `COMPLETION_NOT_ELIGIBLE` | 409 | unpaid, unfinished, issue active or missing evidence |
| `CANCELLATION_NOT_ELIGIBLE` | 409 | after OTW normal cancel blocked |
| `ISSUE_AUTHORITY_UNAVAILABLE` | 503 | fail-closed on financial/completion guards |
| `FOLLOWUP_DIAGNOSIS_REUSE_NOT_ELIGIBLE` | 409 | entitlement invalid/abuse/changed issue |
| `FINANCE_CONTRACT_PENDING` | 503 | required 05B contract missing, no false success |
| `IDEMPOTENCY_KEY_REUSED` | 409 | same key different payload |

---
# 10 — FINAL IMPLEMENTATION GATES, AUDIT CHECKLIST & DELIVERY PLAN

## 10.1 Gate status (do not confuse DESIGN with IMPLEMENTED)

| Gate | Required evidence | Current state of this specification |
|---|---|---|
| **G0 — Business semantics** | Planning V2 signed/ACC, no major business contradiction | **DESIGN BASELINE** |
| **G1 — Contract audit** | Repo Identity 01, Service 04, Finance 06, Product 03/05A, issue authority inspected; exact API/permissions verified | **PENDING** |
| **G2 — Schema migrations** | MySQL 05B migrations/constraints, additive Finance extensions, rollback/index QA | **NOT IMPLEMENTED HERE** |
| **G3 — 05B backend core** | Order/booking/assignment/visit/diagnosis/consent/finish/cancel/followup test suite | **NOT IMPLEMENTED HERE** |
| **G4 — Finance extension** | diagnosis/service invoices, PAID event, fees, refund, earned diagnosis cancel, holds, Provider S-Pay, replacement | **NOT IMPLEMENTED HERE** |
| **G5 — S2S reliability** | signed identity, verified outbox dispatcher/inbox, retries, reconciliation, dedup | **NOT IMPLEMENTED HERE** |
| **G6 — Frontend integration** | Customer, Worker, Provider, Finance, Admin Service Orders API-mode live data | **NOT VERIFIED HERE** |
| **G7 — End-to-end acceptance** | actual test IDs, Finance simulator success + ledger evidence, role transitions, S-Pay, regression 05A | **NOT TESTED HERE** |

This document alone is **not** a claim that money flows are operational. It provides an implementation contract to be validated and developed.

## 10.2 Coding Agent mandatory repository audit report

Before writing controllers/migrations, provide:

1. Actual microservice paths and framework versions; composer.json, lockfiles, Next router, canonical auth middleware/role codes.
2. Actual Finance 06 routes and payloads, current 05A product services and regression tests, demo simulator, payment verification, ledger journal, outbox transport, refund and held services.
3. Exact Identity/Phase 04 service contracts for offering/Provider coverage, diagnosis price, Worker eligibility and operating hours/slot.
4. An existing means to validate report/issue resolution and prevent premature completion/release (or explicit dependency gap).
5. MySQL DB layout, FK conventions, ULID conventions, timezone, queue/scheduler infrastructure, BFF/gateway strategy.
6. Privacy/media upload permission and retention policy.
7. Gap matrix: `CURRENT_FILE/ROUTE → REQUIRED_CHANGE → OWNER → IMPLEMENTATION_STEP → TEST`.

No silent renaming of old Finance 05A endpoints/columns. Any changes from this proposed 05B URL/schema must be documented in API contract diff and frontend adapters.

## 10.3 Implementation phases and acceptance gates

**Phase A — Contract verification & skeleton**

- Confirm 05B Laravel/MySQL service path, health/auth middleware, schedule and queue, media support.
- Build source-scoped API client stubs with typed contract errors; feature flags disabled until Finance 05B ready.
- Fix/list upstream contracts for 01/04/06; set exact role permissions.
- Baseline safety: 05A and Finance existing test suites unchanged.

**Phase B — 05B DB and order/booking**

- Migrations, order creation with snapshot/idempotency, quote and slot validation, Customer/Provider/Admin read projections, booking cancellation before OTW.
- Unit/integration: duplicate create, invalid slot, multi-tenancy, saved address snapshots.
- Gate: no placeholder diagnosis PAID or fake upstream permission.

**Phase C — assignments and worker lifecycle**

- Eligibility, one active assignment, 30 operational min deadline, accept/reject, OTW/ARRIVED, reschedule Customer consent and no-show issues.
- Gate: concurrent attempts zero overlap, Customer Worker visibility after ACCEPTED only.

**Phase D — diagnosis, cost version, consent and execution**

- Unified diagnosis form domain, Provider part qty×price, 05A part linking only after validation, Customer-provided part check, Worker oral consent audit, remote 30 min consent timeout, immutable price revisions, safe work start and finish evidence.
- Gate: start work **without payment pengerjaan** allowed only after valid consent; no invoice before finish.

**Phase E — Finance 06 service extensions**

- Add service-order obligation and typed payments, diagnosis platform fee exemption, Execution CEO policy allocations, Finance Ops existing demo simulator route extension, event delivery, refund, diagnosis earnings on BATAL, 120h hold, Provider S-Pay, overdue replacement.
- Gate: Finance route simulator works for **real 05B PENDING invoice**, PAID goes to 05B via trusted event, double simulate cannot duplicate ledger; 05A payment/refund/held suite PASS.

**Phase F — completion + issues + follow-up**

- Customer complete/72h auto with payment/evidence/issue guards, Worker visit close normal/issue, earned diagnosis on cancelled, follow-up draft without duplicate survey charge, Admin global read filters/counter/detail.
- Gate: service overdue not auto-cancel/complete; issue active blocks fund release; no duplicate follow-up earning.

**Phase G — frontend 05B and Finance 06 API mode**

- Replace mock repository with real 05B HTTP adapter, preserve UI routes/components; Customer, Worker, Provider, Finance Ops, Admin Operations `Service Orders` display real role-scoped data.
- Gate: no local paid setState in real flow; no mock Finance records mixed with 05A live data; correct tab counts and primary CTAs.

**Phase H — full E2E and audit**

- Execute E2E-01..08, concurrency and role tests, Finance ledger audits, screenshot desktop/mobile, admin global counts, full 05A regression suite.
- Gate: source-derived test IDs, server logs/event IDs, exit codes and database evidence all recorded; no unverified PASS claim.

## 10.4 Ten-component implementation checklist

### A. Architecture / Domain

- [ ] 05B service/DB isolated; 06 remains sole money authority.
- [ ] 05A/product stock/checkout data not directly mutated by 05B.
- [ ] All external contracts versioned and tracked; no made-up endpoints.
- [ ] Identity auth/membership and server-side role enforcement work.

### B. ERD / Database

- [ ] All canonical tables, indexes, FK local, snapshots, unique keys implemented.
- [ ] Exactly one active assignment via DB transaction and active-slot schema.
- [ ] Submitted diagnosis price versions immutable; consent version-bound.
- [ ] One unique obligation per Order/payment purpose; attempts idempotent.

### C. API & RBAC

- [ ] Customer/Worker/Provider/Admin list/detail/mutations properly scoped.
- [ ] Worker profile omitted from Customer before ACCEPTED at response level.
- [ ] No Worker/Customer mark PAID endpoints.
- [ ] Finance role Provider S-Pay access added with tests, without breaking Merchant.

### D. Operational Lifecycle

- [ ] Booking after diagnosis payment PAID (unless genuine free diagnosis).
- [ ] Worker 30 operating min, reject reason, reassign history.
- [ ] OTW before ARRIVED; cancellation disabled after OTW normal path.
- [ ] Unified diagnosis, part validation and price snapshot.
- [ ] In-person Worker-authored consent vs Customer remote consent (30m) distinct.
- [ ] Worker execution after consent, **before** pengerjaan payment allowed.
- [ ] Finish requires before/after/summary/test, creates one Finance invoice request.
- [ ] Worker normal visit close after PAID, safe issue route if not.

### E. Finance Payments

- [ ] DIAGNOSIS invoice pure platform-fee-exempt, PENDING max6h, no fake zero invoice.
- [ ] SERVICE_EXECUTION invoice created only after FINISHED, max6h, CEO policy version snapshot.
- [ ] Existing Finance Ops mock simulator reused with S2S service context, no PAID before success.
- [ ] Overdue after performed work not cancelled/completed, safe replacement same obligation.
- [ ] Late-callback/duplicate simulation reconciliation prevents double collection.

### F. Cancellations / Refunds / Follow-ups

- [ ] Pre-OTW cancel paid diagnosis refunded fully after Finance SUCCEEDED.
- [ ] Valid earned diagnosis on BATAL never refunded merely because Order cancelled.
- [ ] No diagnosis earnings on fake/unperformed diagnosis, issue/authority guard.
- [ ] Part unavailable BATAL + follow-up draft no second diagnosis charge.
- [ ] Follow-up cannot activate booking or Worker automatically; no double payout.

### G. Completion / S-Pay

- [ ] Manual and auto 72h require FINISHED+PAID+evidence+clear issue.
- [ ] Finance holds Provider earnings 120h after COMPLETED.
- [ ] Finance holds earned diagnosis on authorized BATAL 120h from cancellation.
- [ ] Held release once, never when issue active or Finance authority offline.
- [ ] Refund Customer S-Pay credit once after funded refund SUCCEEDED.
- [ ] Withdrawal manual min Rp20k, fee deducted from amount, partial, failure recredit.

### H. Frontend and Admin

- [ ] Customer five tabs/cards/detail/modals and payment post-finish.
- [ ] Worker five tabs/finish/close/issue and assignment.
- [ ] Provider five tabs/assignment/monitor + S-Pay.
- [ ] Finance existing Escrow & Bayar/Refund/held view service source.
- [ ] Admin Global **Service Orders** table/count/filter/detail read-only; Product Orders unchanged.
- [ ] All roles reflect same backend events after refetch; timer backend authoritative.

### I. Reliability & Audit

- [ ] Atomic local writes with outbox, authenticated producer-bound S2S.
- [ ] Consumer inbox and replay safe, unique Finance journal events, event schema versioning.
- [ ] Scheduler concurrent-safe with live status rechecks.
- [ ] Price, actor, time, evidence, fee policy, refund, hold and payout traceable.
- [ ] Private data/photo access is scoped and auditable.

### J. Tests & Delivery

- [ ] All listed unit/contract/integration/E2E tests run in isolated DB.
- [ ] 05A regression passes and Finance existing mock simulator not broken.
- [ ] Test runner exit codes and real evidence attached.
- [ ] All pending contracts explicitly disclosed; no PASS without proof.

## 10.5 Definition of Done and release labels

**`05B_BACKEND_CORE_IMPLEMENTED`** only if 05B local business API/migrations/tests work but Finance money integration may still be pending (declare pending gates).  
**`05B_FINANCE_INTEGRATED`** only if real Finance 06 service-order contract passes: diagnosis invoice→PAID, execution after FINISHED→PAID, refund, held earnings on BATAL/COMPLETED, Provider S-Pay; verified outbox/inbox.  
**`05B_FRONTEND_BACKEND_E2E_PASS`** only if Customer/Worker/Provider/Finance/Admin flow tested against real backend and 05A regression passes.  
**`05B_BLOCKED_CONTRACT`** if no valid source from 01/04/06/issue authority; **never** substitute a mock in production and declare success.  
**`05B_READY_FOR_PRODUCTION`** only after production-grade payment provider/legal tax/regulatory security and all dependency gates met; nonproduction demo payments do not qualify.

---

# LAMPIRAN A — INTEGRATION DEFINITION CHECKLIST (FRONTEND-FIRST)

| UI interaction | Preferred server resource | 05B/Finance authority | Integration note |
|---|---|---|---|
| Pesan Jasa | Order+Booking quote/create | 05B/04/01 | frontend mock swap to API |
| Bayar Diagnosis | diagnosis payment | Finance 06 | no UI mark paid |
| Provider pilih Worker | Assignment | 05B/01 | role/org scoped |
| Worker Accept/Reject | Assignment attempt | 05B | 30 operational min |
| OTW/ARRIVED | Visit | 05B | not GPS |
| Isi Diagnosis + Sparepart | Versioned diagnosis | 05B | Provider part only billed |
| Worker ACC di Lokasi | Consent record | 05B | Worker actor, not Customer impersonation |
| Customer Remote ACC/Tolak | Consent response | 05B | 30m, source availability valid |
| Worker Mulai Pekerjaan | Execution | 05B | no payment-service precondition |
| Worker Selesai | Execution finish | 05B | triggers invoice request once |
| Bayar Pengerjaan | Payment | Finance 06 | PENDING until authorized PAID |
| Finance Simulasi | Mock provider payment | existing Finance demo route | new 05B source extension; no mock ID in real API |
| Worker Akhiri Kunjungan | Visit close | 05B | PAID or authorized safety exception |
| Customer Konfirmasi | Order completion | 05B | 72h auto only eligible |
| Batal sebelum OTW | Cancellation+refund | 05B → Finance 06 | Customer SPay after SUCCESS |
| Batal setelah diagnosis | Cancellation+earned diagnosis | 05B → Finance 06 | HELD 120h after cancel |
| Lanjut Perbaikan | follow-up draft → new Order/Booking | 05B | same diagnosis not billed again |
| S-Pay Provider | held/available/withdrawal | Finance 06 | Provider membership required |
| Admin Global Service Orders | Global read model | 05B + Finance scoped refs | never fake admin by query param |

# LAMPIRAN B — DATA FLOW INTEGRITY EXAMPLE

**Example only, not live transaction:** Customer order `JSA-000125`, diagnosis Rp50.000 paid at booking. Worker accepts, arrives and records diagnosis: work Rp175.000 + Provider capacitor Rp95.000, basic service total Rp270.000; Customer verbally agrees and Worker records `WORKER_RECORDED_IN_PERSON`. Worker starts work **before** service payment, finishes with photos. Finance then computes real policy-aware service invoice: Rp270.000 **only if no applicable CEO fee in the test fixture**, status PENDING. Finance Ops simulator SUCCESS confirms PAID. Worker closes visit, Customer confirms Order COMPLETED. Finance calculates Provider net entitlement (may differ from Customer payment total), holds 120h from COMPLETED then AVAILABLE; Provider manually withdraws >=Rp20.000. No extra diagnosis fee and no double-paid Provider part. If Customer instead declined after diagnosis, Order BATAL; no service invoice; Finance holds genuine paid diagnosis for 120h from valid cancellation. If cancelled pre-OTW, Finance refunds paid diagnosis to Customer S-Pay after SUCCEEDED.

# LAMPIRAN C — OPEN CONTRACT/RISK LOG FOR CODING AGENT

| ID | Open point | Owner | Safe interim behavior |
|---|---|---|---|
| P-01 | Service 04 offering/price/slot API final | Phase 04 | booking blocked if cannot validate |
| P-02 | Worker role/member/capability/time operating | Identity 01 | assignment or expiry not production-ready without trusted source |
| P-03 | Finance source `SERVICE_05B` obligations and quote | Finance 06 | pending finance dependency; no invented invoice |
| P-04 | Finance provider earnings allocation / platform fee policy-target execution | Finance 06 | do not hardcode fees or withdraw |
| P-05 | Finance earned diagnosis on CANCELLED, ref source | Finance 06 | no fabricated HELD/release |
| P-06 | Finance Provider S-Pay permission and owner type | Finance 06 / Identity | do not reuse Merchant session as impersonated Provider |
| P-07 | Finance service invoice replacement/late double-paid reconciliation | Finance 06 | mark overdue safely, require finance verified recovery |
| P-08 | Issue authority/clearance and authorized resolution | Issue/After-Sales + Finance | block premature completion/release |
| P-09 | 05A Product Order sparepart correlation/read permissions | Product/05A | display independent unlinked part or require valid explicit ref |
| P-10 | Media evidence categories/exceptions and private access | Media/05B | do not pretend evidence verified |
| P-11 | Follow-up diagnosis eligibility expiry/change-of-problem policy | Business/05B | single eligible reuse only, require explicit exception for new diagnosis |
| P-12 | Tax applicability and legal compliance | Finance/CEO/legal review | do not generate unverified tax claims/amounts |
| P-13 | Real Finance event publication/dispatcher status | Finance 06 | implement/test actual outbox delivery before E2E claim |
| P-14 | Provider/Worker safety incident and external payment collection | Operations/05B | Worker may leave safely, debt remains and issue logged |

**Policy distinction:** P-* items are **implementation contract/policy details to validate**; they do not reopen the business decision that service work is paid *after* FINISHED. If a material new business change becomes necessary, record explicit `CHANGE_REQUEST` against Planning V2, solicit the user's ACC, then version both planning and technical spec.

---

# PENUTUP — SOURCE OF TRUTH ORDERING

1. **Business behavior:** `SERVIO_PHASE-05B-ORDER-JASA-PLANNING-V2-BUSINESS-LOCKED.md`.
2. **05B technical target:** THIS document (design baseline; proposed routes/schema until repository audit).
3. **Finance semantics/source implementation:** verified Finance 06 source + Finance V3 specification, **plus explicitly approved new service-order contracts**.
4. **Existing product isolation:** actual 05A routes/source and Finance 05A contracts remain unchanged except proven backward-compatible additive changes.
5. **Runtime evidence:** migrations, typed API contract tests, Finance verified events/ledger, MySQL test assertions, and E2E execution are required to elevate any feature to PASS.

**END OF SERVIO PHASE 05B TECHNICAL SPECIFICATION V2**
