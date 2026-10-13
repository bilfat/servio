# SERVIO — SERVICE ORDER & PRICING FLOW REVISION
## LOCKED BUSINESS FLOW SPECIFICATION

> **Status:** 🔒 LOCKED REVISION
> **Purpose:** Mengunci revisi terbaru agar flow Service Order, Diagnosis, Penyesuaian Biaya, Sparepart, Customer Approval, Worker Execution, dan Provider Monitoring tidak kembali ke konsep lama.
> **Scope:** Flow Jasa + Sparepart/Product Context. Dokumen ini menjadi bahan rekonsiliasi `docs/todo.md` sebelum implementasi fase berikutnya.

---

# 1. CORE DECISION — ONE SERVICE ORDER, ONE SERVICE TIMELINE

Servio memperlakukan satu pekerjaan jasa sebagai **satu Service Order dengan satu lifecycle**.

Jangan membuat tiga lifecycle yang berdiri sendiri:

```text
Order Operasional
→ Penawaran Harga
→ Pelaksanaan Servis
```

Yang benar:

```text
SERVICE ORDER
│
├── Booking / Confirmation
├── Worker Assignment
├── Departure
├── Arrival
├── Diagnosis
├── Pricing / Cost Adjustment
├── Customer Approval
├── Payment
├── Sparepart / Material
├── Execution
├── Proof
├── Customer Confirmation
└── Completion
```

### Konsekuensi UX Provider

- `Order Operasional` menjadi **workspace utama** untuk lifecycle order.
- `Penawaran Harga` bukan lifecycle terpisah.
- `Pelaksanaan Servis` bukan lifecycle terpisah.
- Pricing, diagnosis, material, payment, execution, proof, dan completion tetap berada dalam konteks Service Order yang sama.
- Filtering berdasarkan pricing/execution tetap boleh tersedia di dalam workspace Order Operasional.

---

# 2. ROLE OWNERSHIP

## 2.1 Provider

```text
Commercial Authority
+
Service Business Owner
+
Monitoring / Control Tower
```

Provider dapat:
- menerima/menyetujui booking;
- memastikan worker assignment;
- melakukan/menyetujui tindakan komersial yang memang menjadi wewenangnya;
- mengotorisasi penyesuaian biaya ketika policy/condition mewajibkan;
- mengelola partnership toko;
- memantau order, diagnosis, material, payment, dan execution;
- menangani exception.

Provider tidak perlu melakukan setiap langkah eksekusi lapangan.

## 2.2 Worker

```text
Field Executor
+
Diagnosis Operator
+
Material / Sparepart Inputter
+
Price Adjustment Requester
```

Worker dapat:
- berangkat;
- tiba/check-in;
- melakukan diagnosis;
- mencatat hasil diagnosis;
- menentukan kebutuhan jasa tambahan;
- mencatat kebutuhan sparepart;
- memilih sumber sparepart sesuai scope;
- menginput material;
- mengirim rekomendasi;
- mengajukan penyesuaian biaya;
- menjalankan pekerjaan;
- mengunggah proof.

Worker **tidak** otomatis menjadi Provider dan **tidak** boleh bertindak sebagai Customer.

## 2.3 Customer

Customer adalah pemegang keputusan untuk:
- approval biaya;
- approval/rejection sparepart;
- pembelian produk;
- pemilihan alternatif produk;
- confirmation hasil layanan.

---

# 3. MASTER END-TO-END FLOW

```text
CUSTOMER BOOKING
↓
PROVIDER CONFIRM
↓
SERVICE ORDER CREATED
↓
WORKER ASSIGNED
↓
WORKER DEPART
↓
WORKER ARRIVE
↓
DIAGNOSIS
↓
DIAGNOSIS RESULT
↓
TENTUKAN BIAYA JASA
+
TENTUKAN SPAREPART JIKA DIPERLUKAN
↓
KONSOLIDASI BIAYA
↓
CUSTOMER APPROVAL BILA DIPERLUKAN
↓
PAYMENT / PAYMENT CONDITION
↓
SPAREPART AVAILABILITY
↓
SERVICE EXECUTION
↓
PROOF
↓
CUSTOMER CONFIRMATION
↓
COMPLETION
```

---

# 4. INITIAL PRICE VS FINAL PRICE

Harga awal service dapat berupa:

```text
Fixed Price
Estimated Range
Inspection / Survey Based
Quotation / Custom
```

Contoh:

```text
Estimasi awal:
Rp300.000 – Rp400.000
```

Harga awal tidak selalu merupakan harga final ketika diagnosis diperlukan.

Setelah diagnosis, Worker dapat menemukan:
- kerusakan tambahan;
- pekerjaan tambahan;
- material tambahan;
- sparepart;
- scope yang berubah.

---

# 5. DIAGNOSIS = DECISION POINT

```text
WORKER ARRIVE
↓
DIAGNOSIS
↓
DIAGNOSIS RESULT
```

Hasil diagnosis secara konseptual dapat memuat:
- masalah yang ditemukan;
- unit/asset yang diperiksa;
- pekerjaan yang diperlukan;
- material/sparepart yang diperlukan;
- catatan teknisi;
- bukti diagnosis bila relevan.

Setelah diagnosis selesai, Worker mengevaluasi dua komponen:

```text
1. BIAYA JASA
2. SPAREPART / MATERIAL (JIKA ADA)
```

---

# 6. BIAYA JASA SETELAH DIAGNOSIS

Contoh:

```text
Estimasi awal:
Rp300.000 – Rp400.000

Hasil diagnosis:
Biaya jasa aktual = Rp400.000
```

Worker menyiapkan usulan biaya aktual berdasarkan diagnosis.

Worker **tidak** membuat quotation independen atas nama Provider.

---

# 7. SPAREPART SOURCE — THREE SCENARIOS

Jika sparepart diperlukan:

```text
A. PROVIDER-OWNED
B. PARTNER MERCHANT
C. CUSTOMER SELF-PURCHASE
```

---

# 8. SCENARIO A — PROVIDER-OWNED SPAREPART

Provider boleh memiliki sparepart secara fisik di luar inventory management Servio.

```text
Provider-owned physical sparepart
≠
Provider Inventory Management
```

Flow:

```text
Diagnosis
↓
Need Sparepart
↓
Provider-Owned Available
↓
Worker Input Material
↓
Customer Approval when required
↓
Payment when required
↓
Use Material
```

Material dicatat sebagai `ProviderMaterialLine` dalam Service Order context.

Jangan membuat stock movement dari input tersebut.

---

# 9. SCENARIO B — PARTNER MERCHANT

Jika Provider-Owned tidak tersedia:

```text
Diagnosis
↓
Need Sparepart
↓
Partner Merchant Search
↓
Compatible Product
```

Setelah produk ditemukan, terdapat dua mode.

---

# 10. PARTNER MODE A — DIRECT / DEAL DI TEMPAT

Dipakai ketika Customer berada di lokasi atau dapat memberikan keputusan secara langsung.

```text
Worker
↓
Select Partner Product
↓
Input Product / Price
↓
Customer Sees Item
↓
Customer Approval / Confirmation
↓
Product Order
↓
Fulfillment / Procurement
↓
Worker Uses Product when Available
```

**Deal di tempat bukan berarti tanpa approval.**

Artinya approval dilakukan langsung di lokasi.

Worker tidak boleh membeli atau menyetujui atas nama Customer.

---

# 11. PARTNER MODE B — SEND RECOMMENDATION

```text
Worker
↓
Select Compatible Partner Product
↓
Send Recommendation
↓
Customer Receives Recommendation
```

Customer mempunyai dua pilihan utama.

## 11.1 Accept Recommendation

```text
Customer Accept
↓
Product Order
↓
Partner Merchant
↓
Affiliate Attribution
↓
Fulfillment / Shipping
```

## 11.2 Choose Another Store / Product

```text
Customer Receives Recommendation
↓
Customer Searches Independently
↓
Customer Selects Another Merchant/Product
↓
Customer Places Product Order
```

Recommendation original tidak otomatis menjadi order.

Jika Customer akhirnya memilih merchant lain, attribution dari recommendation original tidak otomatis dianggap sebagai affiliate order kecuali policy attribution secara eksplisit menyatakannya.

---

# 12. SCENARIO C — CUSTOMER SELF-PURCHASE

```text
Worker Recommends / Identifies Need
↓
Customer Chooses Self Purchase
↓
Customer Finds Product
↓
Product Order
↓
Payment
↓
Shipping
↓
Customer Receives / Makes Available
↓
Worker Verifies
↓
Use
```

Worker hanya menerima informasi yang diperlukan untuk execution.

---

# 13. ONE ORDER / ONE UNIFIED RECEIPT EXPERIENCE

Secara UX, Customer harus merasakan bahwa jasa + sparepart adalah satu konteks transaksi servis.

Contoh:

```text
ORDER #SRV-001

SERVICE
Service AC                 Rp350.000

SPAREPART
Kapasitor                  Rp180.000

-------------------------------
TOTAL                      Rp530.000
```

Namun domain tetap dipisahkan:

```text
Service Order #SRV-001
│
├── Service Line
├── ProviderMaterialLine (jika Provider-owned)
└── Related Product Order(s) (jika merchant/customer purchase)
```

**One receipt experience ≠ satu entity untuk semua commerce.**

Service Order dan Product Order tetap domain berbeda, tetapi Product Order memiliki service context.

---

# 14. FINAL COST CONSOLIDATION

Setelah diagnosis:

```text
FINAL SERVICE COST
+
SPAREPART COST (optional)
+
OTHER APPROVED COST (if applicable)
=
TOTAL COST
```

Contoh:

```text
Jasa                         Rp350.000
Kapasitor                    Rp180.000
Seal                           Rp35.000
--------------------------------------
TOTAL                        Rp565.000
```

Customer harus dapat melihat breakdown yang transparan.

Tidak boleh ada silent charge.

---

# 15. PRICE ADJUSTMENT FLOW

Flow canonical:

```text
DIAGNOSIS
↓
INPUT SERVICE COST
↓
INPUT SPAREPART IF NEEDED
↓
CALCULATE TOTAL
↓
CHECK PROVIDER AUTHORIZATION CONDITION
├── NOT REQUIRED
│      ↓
│   CUSTOMER APPROVAL
│
└── REQUIRED
       ↓
    PROVIDER REVIEW / AUTHORIZE
       ↓
    CUSTOMER APPROVAL
```

Jangan memaksa semua case melewati manual Provider jika policy/service configuration menyatakan tidak perlu.

Tetapi Worker tetap tidak menjadi pihak yang membuat quotation independen sebagai Provider.

---

# 16. CUSTOMER PRESENT VS ABSENT

Kehadiran Customer hanya mengubah **cara approval**, bukan siapa yang berwenang melakukan approval.

## 16.1 Customer ada di lokasi

```text
Diagnosis
↓
Worker prepares cost
↓
Customer sees total
↓
Customer Approves
↓
Payment / Payment Condition
↓
Sparepart Handling
↓
Continue Execution
```

## 16.2 Customer tidak ada di lokasi

```text
Diagnosis
↓
Worker prepares cost
↓
Provider authorization if required
↓
Customer receives approval request
↓
WAITING CUSTOMER APPROVAL
↓
Customer Approves
↓
Payment / Payment Condition
↓
Sparepart Order / Procurement
↓
Continue when prerequisite is met
```

Tidak ada bypass approval.

---

# 17. ORDER OPERASIONAL = PROVIDER WORKSPACE

`Order Operasional` menjadi pusat lifecycle Provider.

## 17.1 List

Contoh filter contextual:

```text
Semua
Menunggu Diagnosis
Diagnosis Selesai
Menunggu Persetujuan
Menunggu Payment
Menunggu Sparepart
Sedang Dikerjakan
Menunggu Verifikasi
Selesai
```

Nama state/filter harus mengikuti state canonical yang digunakan repository/TODO.

## 17.2 Detail

Minimum contextual sections:

```text
ORDER HEADER
↓
ORDER TIMELINE
↓
CUSTOMER
↓
WORKER
↓
DIAGNOSIS
↓
PRICE / COST ADJUSTMENT
↓
SPAREPART & MATERIAL
↓
PAYMENT
↓
TRACKING
↓
PROOF
↓
COMPLETION
```

Semua merupakan konteks satu Service Order.

---

# 18. PROVIDER — PENAWARAN HARGA

`Penawaran Harga` tidak lagi dianggap sebagai lifecycle utama yang berdiri sendiri.

Secara UX, informasi quotation/price adjustment berada di Service Order.

Bila diperlukan menu/filter khusus untuk menemukan order yang menunggu pricing review, menu tersebut harus dianggap sebagai **shortcut view**, bukan domain/lifecycle terpisah.

Jangan membuat quotation orphan.

Quotation harus selalu memiliki eligible Service Order context.

---

# 19. PROVIDER — PELAKSANAAN SERVIS

`Pelaksanaan Servis` juga bukan lifecycle lain.

Execution adalah tahap operational di dalam Service Order.

Provider:
```text
MONITOR
```

Worker:
```text
EXECUTE
```

Provider dapat melihat execution state tanpa mengambil alih action lapangan Worker.

---

# 20. PROVIDER — CONTROL TOWER VIEW

Contoh:

```text
ORDER #SRV-001

✓ Confirmed
✓ Worker Assigned
✓ Worker Arrived
✓ Diagnosis Complete

PRICING
Status: CUSTOMER APPROVAL

SERVICE
Status: WAITING APPROVAL

SPAREPART
Source: Partner Merchant

PRODUCT ORDER
PO-001

SHIPMENT
In Transit

WORKER
Active
```

Provider memonitor dan mengambil action ketika memang diperlukan.

---

# 21. PROVIDER DASHBOARD REVISION

Dashboard Provider bergeser dari menu-centric menjadi action/exception-centric.

## KPI

```text
12  Order Aktif
3   Menunggu Diagnosis
2   Menunggu Persetujuan Biaya
4   Sedang Dikerjakan
1   Menunggu Sparepart
2   Menunggu Verifikasi
```

## Attention Queue

```text
⚠ Pengajuan biaya #SRV-001
   Total Rp565.000
   [Review]

⚠ Order #SRV-013
   Menunggu Customer Approval

⚠ Order #SRV-021
   Partner Product Delayed
```

## Active Workers

```text
Andi
AC Service
Diagnosis
2.4 km

Budi
Electrical
Execution
4.1 km
```

### Jangan menampilkan Provider Inventory KPI

```text
❌ Total Stock Provider
❌ Low Stock Provider
❌ Inventory Value
❌ Warehouse Activity
❌ Stock Movement
```

---

# 22. PROVIDER INVENTORY CLEANUP BOUNDARY

## REMOVE

```text
Provider Inventory Management
Provider Warehouse Management
Provider Stock Adjustment
Provider Stock CRUD
Provider Internal Inventory Fulfillment
Provider Internal Inventory Shipping
Provider Internal Inventory Returns
```

## KEEP

```text
ProviderMaterialLine
SparepartRequirement
Service Order Material Context
Provider-Owned Source
Material Usage
Sparepart Recommendation
Partner Merchant Context
Product Order Relation
```

Rule:

```text
Hapus Provider Inventory Engine
+
Pertahankan Service Material Context
```

---

# 23. PARTNER MERCHANT + AFFILIATE

Affiliate recommendation:

```text
Worker Recommendation
↓
Customer Acceptance
↓
Product Order
↓
Attribution Created
↓
Eligibility Evaluated
```

Tidak boleh:

```text
Recommendation
↓
Automatic Product Order
```

Affiliate bukan commerce engine baru.

Tetap memakai Product Order existing engine.

---

# 24. SHIPMENT VISIBILITY

## Partner recommendation accepted

Customer:
- Product Order;
- shipment timeline.

Worker:
- operational shipment timeline karena memengaruhi execution.

Provider:
- monitoring/context.

## Customer chooses another merchant

Customer:
- full Product Order + shipment.

Worker:
- hanya dependency operasional, misalnya `WAITING_CUSTOMER_PART`.

Provider:
- service dependency / monitoring.

---

# 25. PRODUCT ORDER RELATION

Product Order tetap entity commerce terpisah.

Context minimal yang dapat dibutuhkan:

```text
serviceOrderId
sparepartRequirementId
providerId
workerId
merchantId
productId
```

Tujuan relation:
- menjaga service context;
- mengetahui product order terkait service;
- menjaga attribution;
- memungkinkan tracking tanpa duplicate order engine.

---

# 26. SERVICE BLOCKING RULE

Jika sparepart mandatory dan belum tersedia:

```text
WAITING_SPAREPART
```

atau state canonical equivalent yang sudah dikunci.

Dilarang:

```text
❌ mark service completed
❌ fake progress
❌ bypass prerequisite
```

---

# 27. PAYMENT RULE

```text
Customer Approval
≠
Payment Success
```

Flow:

```text
Customer Approves
↓
Payment Required
↓
Payment Processing
↓
Payment Success
↓
Execution Eligible
```

Payment gagal:

```text
PAYMENT
↓
FAILED
↓
Retry / Change Method
```

Approval saja tidak cukup untuk menyatakan transaksi paid.

---

# 28. SURVEY / DIAGNOSIS FEE

Survey/diagnosis fee harus transparan dan mengikuti condition/policy yang sudah ditetapkan.

Contoh:

```text
Diagnosis Fee:
Rp50.000

Condition:
dibebankan bila service ditolak/cancel setelah inspection.
```

Saat Customer menolak:

```text
Customer Reject
↓
Can Service Continue?
├── YES → Continue allowed scope
└── NO  → Service Blocked / Cancelled
          ↓
          Survey Fee if applicable
```

Jangan menciptakan fee secara diam-diam setelah rejection.

---

# 29. CUSTOMER REJECTION

## Price Adjustment rejected

```text
Customer Reject
↓
Is Extra Scope Optional?
├── YES → Service continues if technically possible
└── NO  → Service blocked / alternate resolution
```

## Provider-owned sparepart rejected

```text
Reject
↓
Can Service Continue?
├── YES → Continue without part
└── NO  → Service Blocked / Alternative
```

## Partner product rejected

```text
Reject
↓
Alternative Recommendation
OR
Customer Self-Purchase
OR
Service Hold
```

Tidak boleh membuat Product Order otomatis.

---

# 30. CHAT IS NOT THE TRANSACTION SOURCE OF TRUTH

Chat digunakan untuk komunikasi.

Contoh:

```text
Service Order #SRV-001
└── Conversation
    ├── Diagnosis Message
    ├── Price Discussion
    └── Sparepart Recommendation
```

Tetapi:

```text
Chat message ≠ official quotation
Chat message ≠ payment record
Chat message ≠ order status
```

Data transaksi resmi harus tetap berasal dari domain/state yang tepat.

---

# 31. CUSTOMER TIMELINE

## 31.1 No price adjustment

```text
✓ Order Dikonfirmasi
✓ Teknisi Berangkat
✓ Teknisi Tiba
✓ Diagnosis
● Pengerjaan
○ Verifikasi
○ Selesai
```

## 31.2 Price adjustment

```text
✓ Order Dikonfirmasi
✓ Teknisi Berangkat
✓ Teknisi Tiba
✓ Diagnosis
✓ Biaya Ditetapkan
● Menunggu Persetujuan
○ Pembayaran
○ Sparepart
○ Pengerjaan
○ Verifikasi
○ Selesai
```

## 31.3 Partner product accepted

```text
✓ Diagnosis
✓ Biaya Disetujui
✓ Sparepart Dipesan
● Menunggu Sparepart
○ Pengerjaan
○ Verifikasi
○ Selesai
```

Contextual sparepart timeline:

```text
✓ Order Dibuat
✓ Merchant Menerima
✓ Diproses
● Dikirim
○ Dalam Perjalanan
○ Diterima
○ Digunakan
```

## 31.4 Customer purchases elsewhere

```text
✓ Diagnosis
✓ Approval
● Menunggu Sparepart Customer
○ Pengerjaan
○ Verifikasi
```

Customer memegang detail Product Order/shipment sendiri.

---

# 32. WORKER TIMELINE

Worker membutuhkan detail operational:

```text
✓ Berangkat
✓ Tiba
✓ Diagnosis
✓ Cost Prepared
✓ Approval
✓ Sparepart Ordered
● Menunggu Sparepart
○ Pengerjaan
○ Testing
○ Proof
○ Completion
```

Jika product partner memiliki shipment:

```text
SPAREPART DELIVERY

✓ Product Order
✓ Merchant Accepted
✓ Preparing
✓ Shipped
● In Transit
○ Delivered
○ Used
```

---

# 33. CUSTOMER PRESENCE DOES NOT CHANGE AUTHORITY

```text
Customer Hadir
= Approval langsung di lokasi

Customer Tidak Hadir
= Approval melalui request/remote
```

Keduanya tetap:

```text
Worker proposes
→ Provider authorization when required
→ Customer approves/rejects
```

---

# 34. STATE SEPARATION

Jangan mencampur seluruh lifecycle ke satu status besar.

Secara konseptual pisahkan:

```text
Service Order State
Execution Stage
Pricing State
Payment State
Sparepart State
Product Order State
Shipment State
Proof / Completion State
```

Timeline UI adalah projection dari state tersebut.

---

# 35. NAVIGATION REVISION — PROVIDER

Karena lifecycle sudah menjadi satu workspace:

```text
JASA & LAYANAN
├── Dashboard
├── Katalog Layanan
├── Antrean Booking
├── Order Operasional
└── Obrolan Pelanggan

OPERASIONAL LAPANGAN
├── Manajemen Teknisi
├── Radar Pelacakan
├── Verifikasi Bukti
└── Penyelesaian Servis

KEMITRAAN TOKO
└── Kerja Sama Toko

PELANGGAN & KUALITAS
├── Rating & Ulasan
├── Sengketa
├── Garansi
└── Riwayat Layanan

KEUANGAN
├── Pendapatan
├── Payout
└── Transaksi

PENGATURAN
├── Profil
├── Area Layanan
├── Jam Operasional
├── Konfigurasi Layanan
├── Manajemen Teknisi
├── Pengaturan Booking
└── Notifikasi
```

`Penawaran Harga` dan `Pelaksanaan Servis` tidak menjadi lifecycle menu terpisah.

---

# 36. ROLE BOUNDARY — FINAL

| Action | Customer | Provider | Worker | Merchant |
|---|---|---|---|---|
| View own service order | ✓ | related/org scope | assigned scope | conditional product context |
| Accept booking | — | ✓ | — | — |
| Assign worker | — | ✓ | — | — |
| Diagnosis | — | Monitor | ✓ | — |
| Prepare price adjustment | — | Monitor/authorize conditionally | ✓ | — |
| Create official Provider quotation | — | ✓ | — | — |
| Approve price | ✓ | — | — | — |
| Pay | ✓ | — | — | ✓ for own product orders |
| Input provider material | — | View | ✓ | — |
| Recommend partner product | — | Configure/monitor | ✓ | — |
| Approve sparepart | ✓ | — | — | — |
| Create product order | Confirm | — | Assisted only | Receive |
| Fulfill product | — | — | — | ✓ |
| Track service | ✓ | Monitor | Update own | — |
| Upload proof | — | Monitor | ✓ | — |
| Confirm service completion | ✓ | Monitor/submit where allowed | Submit evidence | — |

Final access tetap mengikuti:

```text
ROLE + PERMISSION + RESOURCE + SCOPE + BUSINESS CONDITION
```

---

# 37. FORBIDDEN SHORTCUTS

Dilarang:

```text
❌ Worker silently approves for Customer
❌ Recommendation automatically creates Product Order
❌ Worker silently changes final customer amount without required authorization
❌ Provider bypasses required Customer approval
❌ Additional cost charged without transparent approval/payment condition
❌ Provider inventory engine created again
❌ Product Order engine duplicated
❌ Merchant substitution silently applied
❌ Mandatory sparepart unavailable tetapi service marked completed
❌ Quotation orphan tanpa eligible Service Order
❌ Separate execution order dibuat untuk satu service
```

---

# 38. IMPLEMENTATION PRINCIPLE

Gunakan urutan:

```text
LOCKED FLOW
↓
DOMAIN
↓
STATE
↓
PERMISSION
↓
UI
↓
ACTION
↓
VERIFICATION
```

Jangan membuat UI tanpa state/domain/action yang sah.

Jangan membuat action yang melompati approval, payment, atau prerequisite.

---

# 39. REQUIRED TEST SCENARIOS

Minimal harus dapat direpresentasikan:

### SC-FLOW-01
Booking → Provider Confirm → Service Order.

### SC-FLOW-02
Service Order → Worker Assigned → Depart → Arrive → Diagnosis.

### SC-FLOW-03
Diagnosis → No Price Adjustment → Execution.

### SC-FLOW-04
Diagnosis → Price Adjustment → Customer Present → Approval → Continue.

### SC-FLOW-05
Diagnosis → Price Adjustment → Customer Absent → Remote Approval → Continue.

### SC-FLOW-06
Diagnosis → Provider-Owned Sparepart → Worker Input → Customer Approval.

### SC-FLOW-07
Diagnosis → Partner Product → Direct Input → Customer Approval.

### SC-FLOW-08
Diagnosis → Partner Product → Recommendation → Customer Accept → Product Order.

### SC-FLOW-09
Recommendation → Customer Chooses Another Merchant → Product Order not automatically affiliated.

### SC-FLOW-10
Mandatory Sparepart unavailable → WAITING_SPAREPART.

### SC-FLOW-11
Optional addition rejected → Service continues when technically possible.

### SC-FLOW-12
Mandatory addition rejected → Service blocked / alternate resolution.

### SC-FLOW-13
Payment failed after approval → Retry/change payment.

### SC-FLOW-14
Partner product shipped → Worker and Customer receive operational shipment context.

### SC-FLOW-15
Customer self-purchase → Customer owns Product Order/shipment detail; Worker sees only execution dependency needed.

---

# 40. TODO RECONCILIATION REQUIRED

Sebelum implementation phase berikutnya, `docs/todo.md` harus direview agar tidak ada wording lama yang bertentangan dengan revisi ini.

Area yang wajib direkonsiliasi:

```text
Pricing / Quotation
Service Order lifecycle
Provider ↔ Worker boundary
Worker price adjustment
Customer approval
Customer timeline
Worker timeline
Provider Order Operasional
Sparepart sourcing
Provider-owned material
Partner product
Customer self-purchase
Affiliate attribution
Payment timing
Survey / diagnosis fee
Provider dashboard
Provider navigation
```

**Jangan mengimplementasikan flow baru dan flow lama secara bersamaan.**

---

# 41. FINAL LOCKED DECISIONS

```text
🔒 SERVICE ORDER = SINGLE LIFECYCLE
🔒 ORDER OPERASIONAL = PROVIDER WORKSPACE
🔒 PENAWARAN HARGA = CONTEXTUAL STAGE / VIEW, NOT SEPARATE LIFECYCLE
🔒 PELAKSANAAN SERVIS = CONTEXTUAL EXECUTION STAGE
🔒 DIAGNOSIS = PRICE + MATERIAL DECISION POINT
🔒 WORKER = FIELD INPUT + PRICE ADJUSTMENT REQUESTER
🔒 PROVIDER = CONDITIONAL COMMERCIAL AUTHORITY
🔒 CUSTOMER = FINAL APPROVAL OWNER
🔒 PROVIDER-OWNED = MATERIAL LINE, NOT INVENTORY ENGINE
🔒 PARTNER = PRODUCT ORDER
🔒 SELF-PURCHASE = CUSTOMER PRODUCT ORDER
🔒 RECOMMENDATION ≠ ORDER
🔒 APPROVAL ≠ PAYMENT
🔒 PAYMENT ≠ EXECUTION
🔒 SHIPMENT ≠ SERVICE COMPLETION
🔒 CUSTOMER PRESENCE CHANGES APPROVAL MODE, NOT AUTHORITY
🔒 ONE SERVICE ORDER / ONE UNIFIED RECEIPT EXPERIENCE
🔒 SERVICE ORDER AND PRODUCT ORDER REMAIN DISTINCT DOMAIN ENTITIES
🔒 PRODUCT ORDER REMAINS THE SINGLE COMMERCE ENGINE
🔒 PROVIDER DASHBOARD = MONITORING + ACTION / EXCEPTION
🔒 PROVIDER INVENTORY MANAGEMENT = REMOVED
🔒 SERVICE MATERIAL CONTEXT = PRESERVED
```

---

# 42. FINAL STATUS

**🔒 LOCKED — READY FOR TODO RECONCILIATION**

Dokumen ini mengunci revisi flow terbaru dan harus digunakan untuk memperbarui `docs/todo.md` sebelum agent coding berikutnya menjalankan implementasi.

**STOP CONDITION:** Jangan lanjut implementasi Phase berikutnya sampai TODO sudah direkonsiliasi dengan flow locked ini.
