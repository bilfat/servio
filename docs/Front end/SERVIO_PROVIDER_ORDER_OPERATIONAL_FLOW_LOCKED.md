# SERVIO — PROVIDER ORDER OPERATIONAL FLOW
## LOCKED ROLE REVISION

> Status: 🔒 LOCKED  
> Scope: Provider Jasa only  
> Purpose: Mengunci perubahan tanggung jawab Provider sebelum implementasi/revisi Worker dan Customer.
>
> Source of Truth implementasi tetap `docs/todo.md`. Dokumen ini menjadi lock keputusan role Provider terbaru yang wajib direkonsiliasi ke TODO sebelum implementasi lanjutan.

---

# 1. CORE DECISION

Provider Jasa **bukan pelaksana utama timeline lapangan**.

Setelah Worker ditugaskan:

```text
Provider
= Monitor + Commercial/Service Oversight

Worker
= Field Execution + Diagnosis + Timeline Owner

Customer
= Approval + Purchase/Confirmation Owner
```

Provider tidak lagi menjalankan setiap step eksekusi satu per satu.

---

# 2. ORDER OPERASIONAL = SEMUA SERVICE ORDER PROVIDER

`Order Operasional` adalah satu workspace untuk seluruh Service Order yang dimiliki/terkait dengan Provider.

Bukan hanya order yang sedang dikerjakan.

Contoh filter:

```text
Semua
Menunggu Worker
Worker Berangkat
Worker Tiba
Diagnosis
Menunggu Persetujuan
Menunggu Sparepart
Sedang Dikerjakan
Menunggu Verifikasi
Selesai
```

Status/filter harus berasal dari state canonical; jangan membuat state liar.

---

# 3. ORDER OPERASIONAL = MONITORING HUB

Provider membuka:

```text
Order Operasional
↓
Daftar semua Service Order
↓
Pilih Order
↓
Service Order Detail
```

Pada detail order Provider harus dapat melihat:

```text
Order Info
Customer
Worker
Timeline Worker
Diagnosis
Price Request / Price Context
Sparepart Context
Payment State
Tracking
Proof
Completion
```

Provider tidak berpindah ke lifecycle terpisah untuk menjalankan pekerjaan.

---

# 4. WORKER = TIMELINE OWNER

Setelah assignment:

```text
Provider Assign Worker
↓
Worker menerima Job
↓
Worker menjalankan timeline
```

Timeline lapangan utama dikendalikan oleh Worker:

```text
Assigned
↓
Depart
↓
Arrive
↓
Diagnosis
↓
Price/Material Preparation
↓
Approval
↓
Execution
↓
Proof
↓
Completion Submission
```

Provider hanya memonitor state tersebut.

---

# 5. PROVIDER ACTIONS SETELAH ASSIGNMENT

Provider dapat:

- melihat worker status;
- melihat lokasi/tracking sesuai permission;
- melihat diagnosis;
- melihat pengajuan harga;
- berkomunikasi/chat dengan Worker;
- memberi persetujuan/otorisasi komersial jika condition/policy mengharuskan;
- melihat status sparepart;
- menangani exception;
- melihat proof;
- memonitor completion.

Provider tidak wajib:

- menekan Start Service;
- menekan Diagnosis;
- mengisi timeline Worker;
- menginput material fisik yang ditemukan Worker;
- berpura-pura menjadi Worker.

---

# 6. DIAGNOSIS

Worker melakukan:

```text
Arrive
↓
Diagnosis
↓
Diagnosis Result
```

Diagnosis dapat menemukan:

```text
Service Scope
+
Additional Work
+
Sparepart Requirement
```

---

# 7. PRICE ADJUSTMENT — PROVIDER ROLE

Setelah diagnosis, Worker dapat menyusun pengajuan biaya berdasarkan hasil diagnosis.

Komponen:

```text
Biaya Jasa
+
Sparepart/Material jika ada
+
Additional Work jika ada
```

Worker bukan pembuat quotation independen.

Flow Provider:

```text
Worker
↓
Prepare Price Adjustment
↓
Provider Review / Chat
↓
Provider Authorize jika diperlukan
↓
Customer Approval
```

### IMPORTANT

Tidak semua kasus harus berhenti di Provider.

Gunakan:

```text
Provider Authorization
= conditional according to policy / service configuration / threshold
```

Jika authorization tidak diwajibkan:

```text
Worker
↓
Prepare final cost
↓
Customer approval
```

Jika authorization diwajibkan:

```text
Worker
↓
Price adjustment request
↓
Provider authorization
↓
Customer approval
```

---

# 8. CHAT PROVIDER ↔ WORKER

Chat menjadi bagian penting dari Order Operasional ketika Worker membutuhkan keputusan Provider.

Contoh:

```text
Worker:
"Pak, hasil diagnosis AC unit 2 ada kebocoran.
Biaya jasa tambahan Rp150.000."

Provider:
"Setuju, lanjut."

Worker:
"Sparepart kapasitor tersedia dari provider /
atau saya rekomendasikan toko partner."
```

Chat bukan pengganti data transaksi.

```text
Chat ≠ Official Price Record
Chat ≠ Payment Record
Chat ≠ Order Status
```

Price/action resmi tetap disimpan di domain record.

---

# 9. SPAREPART — PROVIDER BUKAN INVENTORY MANAGER

Provider tetap boleh memiliki barang secara fisik.

Namun:

```text
Provider-owned physical sparepart
≠
Provider Inventory Management
```

Provider tidak memiliki:

```text
Inventory Dashboard
Stock Adjustment
Warehouse Management
Stock Movement
Internal Fulfillment
Internal Shipping
Internal Returns
```

di dalam Servio untuk stok sparepart milik Provider.

---

# 10. SPAREPART PROVIDER-OWNED

Jika Worker menemukan kebutuhan sparepart dan barang Provider tersedia:

```text
Diagnosis
↓
Sparepart Required
↓
Provider-Owned
↓
Worker Input Material
↓
Material menjadi Service Order Line / ProviderMaterialLine
```

Tidak membuat inventory transaction.

Customer tetap melihat cost dan approval sesuai policy.

---

# 11. PARTNER MERCHANT

Jika Provider-owned tidak tersedia:

```text
Worker
↓
Partner Store Search
↓
Compatible Product
```

Provider dapat melihat hasil/monitoring karena memiliki partnership context.

Provider tidak melakukan:

- Merchant inventory mutation;
- Merchant fulfillment;
- Merchant shipping.

---

# 12. TWO PARTNER MODES

## Mode A — Worker Direct Input / Deal di Tempat

Jika Customer hadir:

```text
Worker
↓
Select Partner Product
↓
Input Product + Price
↓
Customer Confirmation / Approval
↓
Product Order
```

"Deal di tempat" hanya berarti approval dapat dilakukan langsung.

Tidak berarti Worker dapat membeli/menyetujui atas nama Customer.

---

## Mode B — Recommendation

```text
Worker
↓
Recommend Product
↓
Customer receives
```

Customer dapat:

```text
Accept Recommendation
OR
Choose another merchant/product
```

Provider hanya memonitor relation/status.

---

# 13. CUSTOMER ACCEPTS PARTNER RECOMMENDATION

```text
Recommendation
↓
Customer Accept
↓
Product Order
↓
Merchant
↓
Fulfillment
↓
Shipping
```

Service Order tetap menjadi konteks utama.

Product Order tetap entity commerce tersendiri.

---

# 14. CUSTOMER CHOOSES ANOTHER STORE

```text
Recommendation
↓
Customer searches independently
↓
Select other store/product
↓
Product Order
```

Provider tidak memaksa merchant partner.

Worker tidak menjadi pihak pembeli Customer.

Affiliate attribution dari recommendation original tidak otomatis diterapkan ke merchant lain.

---

# 15. CUSTOMER PRESENCE

Kehadiran Customer hanya mengubah cara approval dilakukan.

## Customer hadir

```text
Diagnosis
↓
Cost prepared
↓
Customer approval langsung
↓
Payment / condition met
↓
Continue
```

## Customer tidak hadir

```text
Diagnosis
↓
Cost prepared
↓
Provider authorization if required
↓
Customer approval request
↓
Wait
↓
Approved
↓
Payment / condition met
↓
Continue
```

Authority tetap:

```text
Customer = final approval
```

---

# 16. PROVIDER DASHBOARD REVISION

Dashboard Provider harus menekankan:

```text
ORDER MONITORING
+
ACTION REQUIRED
+
EXCEPTION
```

Contoh KPI:

```text
12  Order Aktif
3   Menunggu Diagnosis
2   Menunggu Persetujuan Biaya
4   Sedang Dikerjakan
1   Menunggu Sparepart
2   Menunggu Verifikasi
```

Contoh Attention Queue:

```text
⚠ Worker Andi mengajukan biaya Rp365.000
   Order #SRV-001
   [Review]

⚠ Customer belum menyetujui
   Order #SRV-004

⚠ Sparepart partner terlambat
   Order #SRV-010
```

---

# 17. PROVIDER DASHBOARD — FORBIDDEN

Jangan tampilkan:

```text
❌ Provider Stock
❌ Low Stock Provider
❌ Inventory Value
❌ Warehouse Activity
❌ Stock Adjustment
❌ Provider Fulfillment Queue
❌ Provider Shipping Queue
❌ Provider Return Queue
```

---

# 18. PROVIDER SERVICE ORDER DETAIL

Provider harus dapat melihat satu timeline gabungan:

```text
ORDER #SRV-001

✓ Order Confirmed
✓ Worker Assigned
✓ Worker Departed
✓ Worker Arrived
✓ Diagnosis Complete
● Price / Cost Review
○ Customer Approval
○ Payment
○ Sparepart
○ Execution
○ Proof
○ Completion
```

Timeline merupakan projection dari state domain.

---

# 19. WORKER TIMELINE VS PROVIDER VIEW

## Worker

```text
ACTION
↓
UPDATE TIMELINE
```

## Provider

```text
VIEW / MONITOR
↓
CHAT
↓
AUTHORIZE WHEN REQUIRED
↓
EXCEPTION HANDLING
```

Provider tidak boleh overwrite event Worker tanpa audit/permission yang memang diizinkan.

---

# 20. PROVIDER QUOTATION ROLE REVISION

Jangan gunakan asumsi:

```text
Provider
→ create quotation
→ Worker executes
```

Untuk flow revision ini:

```text
Worker diagnosis
↓
Worker prepares price adjustment
↓
Provider authorization when required
↓
Customer approval
↓
Execution
```

Official quotation record tetap dapat digunakan bila pricing model/service policy memang membutuhkan quotation formal.

Quotation tetap harus terikat ke Service Order yang eligible.

---

# 21. ORDER OPERATIONAL VS QUOTATION VS EXECUTION

Secara UI:

```text
ORDER OPERASIONAL
= parent workspace
```

Sedangkan:

```text
Pricing / Quotation
= contextual section / action

Execution
= contextual timeline / execution state

Material
= contextual section

Payment
= contextual state

Tracking
= contextual section

Proof
= contextual section
```

Jangan membuat ketiganya menjadi tiga lifecycle yang berbeda.

---

# 22. NAVIGATION IMPACT

Provider navigation tidak perlu memiliki menu:

```text
❌ Penawaran Harga
❌ Pelaksanaan Servis
```

sebagai lifecycle terpisah.

Fungsinya berada di:

```text
Order Operasional
```

Menu utama Provider tetap berorientasi bisnis/monitoring.

Target:

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
```

---

# 23. PROVIDER ROLE BOUNDARY

Provider:

```text
RECEIVE
ACCEPT
ASSIGN
MONITOR
CHAT
AUTHORIZE WHEN REQUIRED
MANAGE PARTNERSHIP
REVIEW PROOF
HANDLE EXCEPTION
```

Worker:

```text
DEPART
ARRIVE
DIAGNOSE
PREPARE COST REQUEST
INPUT MATERIAL
RECOMMEND PRODUCT
EXECUTE
TRACK
UPLOAD PROOF
SUBMIT COMPLETION
```

Customer:

```text
APPROVE
REJECT
PAY
PURCHASE
TRACK OWN PRODUCT ORDER
CONFIRM COMPLETION
```

---

# 24. CRITICAL RULE

Jangan membuat shortcut:

```text
Worker
→ Customer approval otomatis

Worker
→ Payment otomatis

Worker
→ Product Order otomatis

Provider
→ Start service otomatis

Provider
→ Complete service otomatis
```

Semua transition harus mengikuti canonical state/business condition.

---

# 25. DATA RELATION

Satu Service Order dapat memiliki:

```text
Service Order
│
├── Worker Assignment
├── Diagnosis
├── Price Adjustment / Quotation
├── ProviderMaterialLine
├── SparepartRequirement
├── Product Order relation
├── Payment
├── Tracking
├── Proof
└── Completion
```

Product Order tetap entity commerce tersendiri.

Tidak membuat duplicate commerce engine.

---

# 26. FINAL LOCKED PROVIDER FLOW

```text
BOOKING
↓
PROVIDER CONFIRM
↓
SERVICE ORDER CREATED
↓
WORKER ASSIGNED
↓
ORDER OPERATIONAL
↓
WORKER DEPART
↓
WORKER ARRIVE
↓
DIAGNOSIS
↓
WORKER PREPARES:
├── SERVICE COST
└── SPAREPART IF NEEDED
        ↓
   PROVIDER AUTHORIZATION?
      /           \
    YES            NO
     ↓              ↓
PROVIDER         CUSTOMER
AUTHORIZATION    APPROVAL
     ↓              ↓
     └──────┬───────┘
            ↓
       CUSTOMER APPROVAL
            ↓
      PAYMENT CONDITION
            ↓
      SPAREPART READY?
        /          \
      YES           NO
       ↓             ↓
   EXECUTION     WAITING PART
       ↓             ↓
      PROOF       PART ARRIVES
       ↓             ↓
       └──────┬──────┘
              ↓
       CUSTOMER CONFIRM
              ↓
          COMPLETION
```

---

# 27. PROVIDER UI PRINCIPLE

Provider melihat:

> "Apa yang terjadi pada semua order saya, dan apakah ada sesuatu yang perlu saya lakukan?"

Bukan:

> "Bagaimana saya menjalankan semua langkah servis?"

Worker melihat:

> "Apa langkah pekerjaan saya berikutnya?"

Customer melihat:

> "Apa yang terjadi pada pesanan saya dan apa yang harus saya setujui/bayar?"

---

# 28. IMPLEMENTATION RULE

Sebelum mengubah code:

```text
Reconcile docs/todo.md
↓
Remove conflicting Provider flow
↓
Implement Provider role
↓
Verify
↓
Only then continue Worker/Customer revision
```

Jangan menggunakan flow lama dan flow baru secara bersamaan.

---

# 29. FINAL STATUS

```text
🔒 PROVIDER = MONITOR + COMMERCIAL/SERVICE OVERSIGHT
🔒 ORDER OPERASIONAL = ALL SERVICE ORDERS
🔒 WORKER = FIELD TIMELINE OWNER
🔒 PROVIDER = CHAT + AUTHORIZE WHEN REQUIRED
🔒 DIAGNOSIS = WORKER ACTION
🔒 PRICE ADJUSTMENT = WORKER PREPARES
🔒 OFFICIAL QUOTATION = CONTEXTUAL/CONDITIONAL
🔒 CUSTOMER = FINAL APPROVAL
🔒 PROVIDER INVENTORY = REMOVED
🔒 SERVICE MATERIAL CONTEXT = KEPT
🔒 PARTNER STORE = PROVIDER PARTNERSHIP
🔒 PRODUCT ORDER = EXISTING COMMERCE ENGINE
🔒 ONE SERVICE ORDER = ONE SERVICE LIFECYCLE
```

**LOCKED — PROVIDER ROLE REVISION READY FOR TODO RECONCILIATION**
