# SERVIO — TODO FRONTEND ROLE FLOW REVISION FINAL
## Customer × Service Provider × Worker × Merchant/Toko

**Status:** 🔒 LOCKED SPECIFICATION — READY FOR IMPLEMENTATION
**Revision Type:** Business Flow / Role Surface / Service + Sparepart + Partner Merchant / Affiliate
**Scope:** Frontend role-flow correction and integration hardening
**Canonical Core:** Feature #1–#27 remains unchanged
**Primary Roles in this revision:** Customer, Service Provider, Worker/Technician, Merchant/Toko

---

# 0. PURPOSE

Dokumen ini adalah execution checklist terbaru untuk memperbaiki alur frontend Servio pada empat role utama yang terlibat langsung dalam service journey:

```text
CUSTOMER
    ↓
SERVICE PROVIDER
    ↓
WORKER / TECHNICIAN
    ↓
MERCHANT / TOKO PARTNER
```

Perubahan utama berasal dari kebutuhan bisnis terbaru:

1. Provider Jasa tetap memiliki sparepart secara fisik, tetapi **Servio TIDAK mengelola inventory/stock sparepart milik Provider Jasa**.
2. Provider Jasa menyimpan sparepart secara manual/off-platform.
3. AI hanya memberikan rekomendasi sparepart yang mungkin diperlukan berdasarkan service/problem context.
4. Worker dapat membawa sparepart milik Provider berdasarkan persiapan manual Provider.
5. Sparepart milik Provider **tidak otomatis masuk Order, Invoice, atau Struk** sebelum benar-benar dibutuhkan dan disetujui Customer.
6. Jika sparepart Provider digunakan, Worker mencatat sparepart setelah diagnosis dan Customer menyetujui penambahannya ke transaksi.
7. Jika Provider tidak memiliki sparepart, Worker dapat menggunakan jaringan Merchant/Toko Partner yang sebelumnya bekerja sama dengan Provider.
8. Worker dapat mencari sparepart partner, mengirim recommendation ke Customer, atau membantu input order.
9. **Customer tetap menjadi pihak yang memberikan persetujuan pembelian/order.**
10. Product Order hasil rekomendasi tetap memakai lifecycle Product Order #22–#27.
11. Product Order tersebut terhubung ke Service Order melalui service context.
12. Provider dan Worker yang menghasilkan recommendation mendapatkan **affiliate attribution / affiliate points** sesuai policy.
13. Merchant/Toko melihat Affiliate Order sebagai bagian dari **order engine yang sama**, bukan membuat order system baru.
14. Customer memiliki timeline sparepart di dalam Service Order agar perjalanan pengadaan tetap terlihat jelas.
15. **Provider Model Locked**: Provider = Commercial Authority + Service Business Owner + Monitoring / Service Oversight. Worker = Field Execution + Diagnosis + Timeline Owner + Material/Sparepart Input + Price Adjustment Preparation. Customer = Final Approval + Payment + Purchase + Completion Confirmation.
16. **Order Operasional** adalah satu kesatuan Service Order Workspace untuk SEMUA Service Order yang terkait Provider di seluruh lifecyclenya (bukan satu fase terpisah, dan bukan terpisah dari Penawaran Harga atau Pelaksanaan Servis).
17. **Penawaran Harga & Pelaksanaan Servis** bukan lifecycle atau menu sidebar terpisah, melainkan contextual action/state di dalam Order Operasional.
18. **Price Adjustment & Quotation Flow**: Worker menyusun kebutuhan biaya/jasa/sparepart pasca-diagnosis; otorisasi Provider bersifat CONDITIONAL berdasarkan policy / service configuration / threshold; persetujuan final mutlak di tangan Customer.
19. **Provider tidak menjalankan timeline Worker**: Worker yang berangkat (Depart), tiba (Arrive), melakukan Diagnosis, menyiapkan pengajuan biaya, menginput material, eksekusi, upload bukti (Proof), dan submit penyelesaian. Provider hanya memonitor, chat, mengotorisasi saat dibutuhkan, dan menangani exception.
20. **Komunikasi Lapangan**: Worker dapat berkomunikasi melalui chat dengan Provider untuk keputusan bisnis/estimasi, namun Chat ≠ Official Price Record.
21. **Mode Toko Partner**: Mode A (Direct Input / Deal di tempat saat Customer hadir) vs Mode B (Recommendation). Kehadiran Customer hanya menentukan Approval Mode, bukan otoritas (Customer tetap final approval owner).

Dokumen ini **tidak mengganti 27 feature core**. Ini adalah koreksi dan extension flow terhadap frontend role surface dan integrasi antar feature yang sudah ada.

---

# 1. SOURCE OF TRUTH

Implementasi wajib membaca dan mengikuti:

- `servio-master-blueprint-final.md`
- `PRD_FRONTEND.md`
- `SERVIO_DESIGN_SYSTEM_FINAL.md`
- `TODO_SERVIO_FRONTEND_FINAL_v3.md`
- seluruh 12 locked frontend layers
- `servio-service-product-integration-final.md`
- `servio-payment-protection-jasa-final.md`
- `servio-booking-order-jasa-final.md`
- `servio-pricing-quotation-communication-jasa-final.md`
- `servio-service-execution-jasa-final.md`
- `servio-tracking-detail-jasa-final.md`
- `servio-proof-of-service-jasa-final.md`
- `servio-completion-customer-confirmation-jasa-final.md`
- `servio-rating-review-jasa-final.md`
- `servio-complaint-dispute-jasa-final.md`
- `servio-warranty-jasa-final.md`
- `servio-service-history-jasa-final.md`
- `servio-maintenance-reminder-jasa-final.md`
- `servio-rebooking-favorite-loyalty-jasa-final.md`
- `servio-role-access-architecture-feature-1-19-final.md`
- inventory / fulfillment / shipping / return product specifications

Jika requirement baru membutuhkan extension yang belum ada:

```text
Gap
↓
Identify Domain
↓
Identify Existing Feature
↓
Minimal Extension
↓
Update Source of Truth if needed
↓
Implement
↓
Verify
```

Jangan membuat domain parallel hanya untuk mengakomodasi UI.

---

# 2. LOCKED BUSINESS DECISIONS — ROLE FLOW REVISION

## 2.1 Provider Jasa tidak menggunakan Inventory Management untuk sparepart sendiri

### HAPUS dari Provider Jasa

- Material Inventory dashboard
- Provider Warehouse management untuk sparepart service
- Stock Movement UI untuk sparepart provider
- On-hand stock dashboard provider
- Reserved stock dashboard provider
- Provider sparepart stock deduction sebagai inventory engine Servio

### TETAP BOLEH ADA

Servio boleh mencatat:

- sparepart yang dibawa
- sparepart yang benar-benar digunakan
- quantity digunakan
- biaya sparepart
- sumber sparepart
- hubungan sparepart dengan Service Order
- siapa yang memasukkan sparepart
- siapa yang menyetujui

Ini adalah **transaction/service context**, bukan inventory management.

---

## 2.2 Sparepart tidak otomatis masuk transaksi

Urutan canonical baru:

```text
Order Jasa
↓
Diagnosis / Inspection
↓
Sparepart Required
↓
Source Selection
↓
Customer Approval jika ada biaya
↓
Sparepart Added / Product Order
```

Jangan:

```text
AI Recommendation
↓
Auto add to invoice
```

Jangan:

```text
Provider membawa barang
↓
Auto charge customer
```

---

## 2.3 AI tidak menjadi inventory authority

AI hanya boleh menyatakan:

```text
Kemungkinan diperlukan:
- Kapasitor 35uF
- Kabel 2.5mm
- Freon R32
```

AI tidak boleh mengklaim:

```text
Provider memiliki stock
Merchant pasti memiliki stock
Harga pasti sekian
Product SKU pasti cocok
```

AI recommendation harus selalu grounded ke data yang tersedia.

---

## 2.4 Customer confirmation tetap wajib

Worker boleh membantu mencari produk.

Worker boleh memberikan rekomendasi.

Worker boleh membantu input order.

Tetapi order barang yang menimbulkan transaksi Customer harus tetap melalui:

```text
Recommendation
↓
Customer Review
↓
Customer Confirmation
↓
Product Order
```

Tidak boleh:

```text
Worker
↓
One-click purchase
↓
Automatic customer charge
```

---

## 2.5 Locked Provider Model & Boundary

Tiga role utama dalam siklus pelaksanaan servis memiliki tanggung jawab tegas:

```text
Provider:
Commercial Authority
+
Service Business Owner
+
Monitoring / Service Oversight

Worker:
Field Execution
+
Diagnosis
+
Timeline Owner
+
Material / Sparepart Input
+
Price Adjustment Preparation

Customer:
Final Approval
+
Payment
+
Purchase
+
Completion Confirmation
```

Provider tidak menjalankan peran teknis di lapangan, tidak menginput material fisik atas nama Worker, dan tidak berpura-pura menjadi Worker.

---

## 2.6 Order Operasional — Unified Service Order Workspace

Order Operasional didefinisikan sebagai:

```text
ORDER OPERASIONAL
= SEMUA SERVICE ORDER YANG TERKAIT DENGAN PROVIDER
```

Bukan:
- `Order Operasional` sebagai satu fase pelaksanaan tertentu saja;
- `Penawaran Harga` sebagai lifecycle atau database terpisah;
- `Pelaksanaan Servis` sebagai lifecycle atau database terpisah.

Melainkan satu kesatuan Service Order Workspace:

```text
Order Operasional
↓
Service Order Workspace
├── Timeline & Tracking
├── Diagnosis & Inspection
├── Pricing & Adjustments (Quotation Context)
├── Sparepart & Material Context
├── Customer Approval Flow
├── Payment Status & Verification
├── Field Execution Monitoring
├── Proof of Service Review
└── Completion & Warranty Context
```

---

## 2.7 Price Adjustment & Conditional Provider Authorization

Setelah diagnosis di lokasi, Worker dapat menyusun estimasi kebutuhan biaya (Biaya Jasa Final / Penyesuaian Biaya Jasa):
```text
Biaya Jasa Final / Penyesuaian Biaya Jasa
+
Sparepart / Material jika dibutuhkan (Provider-owned / Partner Store)
+
Pekerjaan Tambahan (Additional Work) jika ada temuan baru
=
Total Biaya (Total Cost)
```

Aturan otoritas harga:
1. Worker bukan pembuat quotation independen yang bertindak atas nama institusi Provider. Worker bertugas menyusun proposal/pengajuan penyesuaian biaya berdasarkan temuan diagnosis teknis.
2. Otorisasi Provider bersifat **CONDITIONAL**:
   - Berdasarkan policy / konfigurasi layanan / threshold nominal yang ditentukan.
   - Jika di bawah threshold / policy mengizinkan: Worker langsung mengajukan ke Customer.
   - Jika membutuhkan otorisasi Provider: Masuk ke queue Provider untuk ditinjau & disetujui sebelum dikirim ke Customer.
3. Official quotation formal tetap digunakan apabila pricing model atau customer agreement membutuhkan dokumen penawaran resmi (context-bound ke Service Order).
4. Persetujuan akhir selalu berada di tangan **Customer** (Final Commercial Approval Authority).

---

## 2.8 Worker Field Timeline Ownership (Provider Monitors, Worker Executes)

Setelah Provider menugaskan (assign) Worker ke suatu Service Order:
- **Worker adalah pemilik timeline lapangan (Timeline Owner)**:
  - Berangkat (Depart)
  - Tiba di lokasi (Arrive)
  - Melakukan Diagnosis
  - Menyiapkan penyesuaian biaya / input material
  - Memulai dan menyelesaikan perbaikan (Execution)
  - Mengunggah bukti kerja (Proof)
  - Mengajukan penyelesaian (Submit Completion)
- **Provider hanya memonitor dan mengawasi**:
  - Memantau pergerakan & status (Monitor)
  - Berkomunikasi dengan Worker & Customer (Chat)
  - Memberikan otorisasi harga saat diperlukan (Authorize when required)
  - Menangani kendala / eskalasi (Exception Handling)
  - Meninjau bukti kerja (Proof Review)
- **DILARANG**: Provider memiliki tombol/CTA untuk "Start Service" atas nama Worker, melakukan diagnosis atas nama Worker, atau memajukan timeline teknis Worker secara sepihak tanpa mekanisme audit exception yang sah.

---

## 2.9 Chat Provider ↔ Worker Boundary (Chat ≠ Official Price Record)

Worker dapat berkomunikasi dengan Provider melalui chat saat membutuhkan keputusan bisnis di lapangan (misalnya temuan kerusakan tambahan atau opsi sumber sparepart).

Prinsip fundamental:
```text
Chat ≠ Official Price Record
Chat ≠ Payment Record
Chat ≠ Order Status
```
Chat berfungsi untuk komunikasi dan konsensus internal; seluruh angka, kuantitas, persetujuan, dan status resmi wajib dicatat dalam domain record transaksi Servio.

---

## 2.10 Dua Mode Toko Partner (Mode A & Mode B)

Jika sparepart tidak tersedia dari Provider, Worker dapat memanfaatkan Toko Partner:

### Mode A — Worker Direct Input / Deal di Tempat (Customer Hadir)
```text
Worker
↓
Select Partner Product
↓
Input Product + Price
↓
Customer Confirmation / Approval Langsung
↓
Product Order Terbentuk
```
*"Deal di tempat"* hanya berarti persetujuan diberikan langsung secara fisik/tatap muka oleh Customer pada perangkatnya. Worker tidak pernah membeli atau menyetujui atas nama Customer.

### Mode B — Recommendation (Customer Tidak Hadir / Review Mandiri)
```text
Worker
↓
Recommend Partner Product
↓
Customer Menerima Rekomendasi
├── Setuju → Product Order Terbentuk
└── Pilih Toko/Produk Lain → Customer Product Discovery → Product Order
```
Rekomendasi tidak pernah secara otomatis berubah menjadi order tanpa konfirmasi Customer.

---

## 2.11 Nuansa Kehadiran Customer (Customer Presence)

Kehadiran Customer di lokasi hanya mengubah **APPROVAL MODE**, bukan **APPROVAL AUTHORITY**:
- **Customer Hadir**: Diagnosis → Biaya disiapkan → Approval langsung di tempat → Kondisi pembayaran → Servis berlanjut.
- **Customer Tidak Hadir**: Diagnosis → Biaya disiapkan → Otorisasi Provider (jika perlu) → Notifikasi request approval ke aplikasi Customer → Menunggu konfirmasi Customer → Kondisi pembayaran → Servis berlanjut.
- Dalam kedua mode, **Customer tetap pemilik persetujuan akhir**.

---

## 2.12 Provider Dashboard — Order Monitoring + Action Required + Exception

Dashboard Provider wajib fokus pada:
1. **Order Monitoring**: Ringkasan status seluruh order yang sedang berjalan.
2. **Action Required Queue**: Hal-hal yang membutuhkan tindakan segera dari Provider (misal: review biaya dari Worker, assign teknisi, review bukti kerja).
3. **Exception Alerts**: Isu operasional (misal: Customer belum approve, pengiriman sparepart terlambat, sengketa).

KPI Utama:
- Order Aktif
- Menunggu Diagnosis
- Menunggu Persetujuan Biaya
- Sedang Dikerjakan
- Menunggu Sparepart
- Menunggu Verifikasi

Attention Queue:
- Worker mengajukan penyesuaian biaya
- Customer belum menyetujui
- Sparepart partner terlambat
- Verifikasi bukti kerja

**FORBIDDEN / DILARANG pada Dashboard Provider**:
- ❌ Provider Stock
- ❌ Low Stock Provider
- ❌ Inventory Value
- ❌ Warehouse Activity
- ❌ Stock Adjustment
- ❌ Provider Fulfillment Queue
- ❌ Provider Shipping Queue
- ❌ Provider Return Queue

---

# 3. THREE SPAREPART SOURCING SCENARIOS

Servio sekarang harus mendukung tiga sumber sparepart:

```text
A. Provider-Owned Sparepart
B. Partner Merchant Sparepart
C. Customer Self-Purchase
```

Semua terhubung ke Service Order Context.

---

# 4. SCENARIO A — PROVIDER-OWNED SPAREPART

## 4.1 Business Flow

```text
Customer
↓
Booking
↓
Provider Accept & Assign Worker
↓
Service Order (Order Operasional Workspace)
↓
Worker Depart & Arrive
↓
Worker Diagnosis / Inspection
↓
Sparepart Required (Provider-Owned Available)
↓
Worker Prepares Cost & Material Line (ProviderMaterialLine)
↓
Provider Authorization IF Required by Policy/Threshold
↓
Customer Approval (Direct if present, Remote if absent)
↓
Payment Condition Met / Additional Payment
↓
Worker Executes Service
↓
Worker Uploads Proof
↓
Customer Confirms Completion
↓
Service Completed
```

### Penting:
- **Provider Physical Material ≠ Provider Inventory Management**: Provider boleh memiliki material fisik, tetapi Servio TIDAK menyediakan inventory dashboard, stock adjustment, atau warehouse management untuk Provider. Material dicatat murni sebagai context transaksi (`ProviderMaterialLine`).
- **Worker Timeline**: Worker yang berangkat, mendiagnosis, menginput material, dan mengeksekusi. Provider memonitor dan mengotorisasi jika disyaratkan.

---

## 4.2 Frontend Requirement

Worker Job Detail harus memiliki contextual module:

```text
Sparepart & Material
```

State awal:

```text
AI Suggested
Provider Prepared
Not Yet Confirmed
```

Ketika benar-benar dibutuhkan:

```text
[ Tambahkan Sparepart ke Order ]
```

Modal wajib menampilkan:

- nama sparepart
- quantity
- unit price
- source = Provider
- alasan / diagnosis context
- total tambahan
- customer confirmation status

---

## 4.3 Pricing Rule

### Jika Order belum final paid

Biaya jasa dan sparepart masuk ke alur persetujuan biaya / quotation context:

```text
Worker Diagnosis
↓
Worker Prepares Cost + Sparepart
↓
Provider Authorization (Conditional)
↓
Customer Approval
↓
Payment Condition Met
↓
Execution
```

### Jika Order sudah paid

Jangan mengubah total secara diam-diam.

Gunakan additional payment flow:

```text
Existing Paid Order
↓
Additional Sparepart / Work Required post-diagnosis
↓
Worker Prepares Additional Cost
↓
Provider Authorization (Conditional)
↓
Customer Approval
↓
Additional Payment Required
↓
Payment Success
↓
Order Financial State Updated
```

### Receipt

Receipt lama tidak boleh diam-diam berubah.

Jika payment tambahan menghasilkan transaksi tambahan:

```text
Original Receipt
+
Additional Payment Receipt / Transaction Reference
```

---

# 5. SCENARIO B — PARTNER MERCHANT / TOKO

## 5.1 Business Flow & Dua Mode Partner

Jika sparepart milik Provider tidak tersedia:

```text
Worker Diagnosis
↓
Sparepart Required
↓
Provider-owned sparepart tidak tersedia
↓
Worker membuka Partner Store (Kemitraan Provider ↔ Merchant)
↓
Cari Kompatibilitas Produk & Signal Ketersediaan Toko
```

Selanjutnya alur mengikuti mode interaksi:

### Mode A — Worker Direct Input / Deal di Tempat (Customer Hadir)
```text
Worker Pilih Produk Toko Partner
↓
Input Detail Produk + Harga Sesuai Etalase Partner
↓
Customer Melakukan Review & Persetujuan Langsung di Tempat
↓
Product Order Terbentuk (Commerce Engine Existing #22–#27)
↓
Merchant Terima & Proses Order
↓
Fulfillment & Pengiriman
↓
Barang Diterima di Lokasi Servis
↓
Worker Pasang Sparepart & Lanjutkan Servis
```

### Mode B — Recommendation (Customer Tidak Hadir / Review Mandiri)
```text
Worker Kirim Rekomendasi Produk Partner ke Customer
↓
Customer Menerima Notifikasi Rekomendasi
├── Customer Setuju Rekomendasi
│    ↓
│    Product Order Terbentuk (Commerce Engine Existing)
│    ↓
│    Merchant Fulfillment & Pengiriman
│    ↓
│    Barang Diterima & Servis Berlanjut
│
└── Customer Memilih Toko Lain / Produk Mandiri
     ↓
     Customer Product Discovery
     ↓
     Product Order Terbentuk Mandiri
     ↓
     Fulfillment & Pengiriman
     ↓
     Barang Diterima & Servis Berlanjut
```

### Aturan Kunci:
1. **Bukan Automatic Order**: Rekomendasi tidak pernah secara otomatis membuat pesanan tanpa konfirmasi Customer.
2. **Bukan Pembelian oleh Worker**: Worker tidak membeli atas nama Customer.
3. **Provider bukan Merchant**: Provider hanya mengelola hubungan kemitraan (`StorePartnership`), tidak mengelola stok/pengiriman Merchant.

---

## 5.2 Partner Store Discovery Criteria

Worker mencari toko berdasarkan:

- lokasi / jarak
- rating
- review
- product category
- compatibility
- availability signal

Availability signal harus berasal dari Merchant/Product system.

Provider tidak mengelola stock Merchant.

---

# 6. SCENARIO C — CUSTOMER SELF-PURCHASE

Customer dapat memilih untuk membeli sendiri ketika sparepart dibutuhkan.

Flow:

```text
Worker / Provider informs requirement
↓
Customer opens recommendation/product context
↓
Customer Product Discovery
↓
Product Detail
↓
Customer Order
↓
Payment
↓
Fulfillment
↓
Shipping
↓
Worker receives / service continues
```

Product Order tetap terkait dengan Service Order:

```text
Product Order
serviceOrderId = Service Order terkait
```

---

# 7. SERVICE ORDER ↔ PRODUCT ORDER RELATIONSHIP

## 7.1 Provider-Owned Sparepart

```text
Service Order
└── Additional Service Material Line
```

Ini bukan Product Order Merchant.

## 7.2 Merchant Sparepart

```text
Service Order
└── Sparepart Requirement
       ↓
   Product Order
       ↓
   Merchant Order
```

## 7.3 Customer Self Purchase

```text
Service Order
└── Sparepart Requirement
       ↓
   Customer Product Order
```

---

# 8. AFFILIATE ATTRIBUTION

## 8.1 Attribution Concept

Jika recommendation dibuat oleh Worker atas dasar Provider Jasa yang telah bermitra dengan Merchant:

```text
Service Order
↓
Sparepart Requirement
↓
Partner Merchant
↓
Product Recommendation
↓
Customer Approval
↓
Product Order
```

Product Order harus dapat menyimpan / menurunkan attribution:

```text
source = SERVICE_RECOMMENDATION
providerId
workerId
merchantId
productId
serviceOrderId
```

Jangan membuat Affiliate Order Engine baru.

---

## 8.2 Affiliate Points

Provider dan Worker dapat memperoleh affiliate points berdasarkan attribution.

Contoh model:

```text
Provider: +X points
Worker:   +Y points
```

Nominal / formula point harus configurable melalui policy/domain extension.

Tidak boleh hardcode di page.

---

## 8.3 Attribution Conditions

Affiliate attribution hanya valid jika:

- recommendation berasal dari Worker/Provider
- recommendation dikirim melalui Servio
- customer melakukan confirmation
- Product Order benar-benar created
- attribution belum didaftarkan ke order lain secara duplikat

Jika order cancelled / returned / refunded:

affiliate point outcome mengikuti policy loyalty/affiliate yang berlaku.

Jangan menganggap point selalu final pada saat recommendation.

---

# 9. MERCHANT — AFFILIATE ORDERS

## 9.1 Do NOT create a second order system

Merchant tetap menggunakan satu Order Engine.

UI dapat memiliki:

```text
Pesanan
├── Semua
├── Pesanan Langsung
└── Pesanan Affiliate
```

atau:

```text
Orders
↓
Filter: Order Source
    ├── Direct
    └── Affiliate
```

Jangan:

```text
DirectOrderEngine
AffiliateOrderEngine
```

---

## 9.2 Affiliate Order Badge

Merchant harus bisa melihat:

```text
AFFILIATE
```

Dengan attribution:

```text
Partner Provider:
PT Servio Mandiri Teknik

Recommended By:
Dani — Worker

Service Context:
Service Order #SRV-001
```

---

## 9.3 Merchant Order Detail

Minimum information:

- order ID
- customer
- product
- quantity
- service context
- provider
- worker
- affiliate source
- payment status
- fulfillment status
- shipment status
- return eligibility

Merchant tidak boleh melihat informasi Customer yang melampaui permission/privacy scope.

---

# 10. PROVIDER JASA — NAVIGATION REVISION

## 10.1 Remove Inventory

HAPUS menu Provider Jasa:

```text
Material & Produk
└── Inventory
```

dan semua child route yang khusus untuk Provider-owned stock management.

---

## 10.2 Add Partner Stores

Tambahkan section:

```text
KEMITRAAN TOKO
└── Kerja Sama Toko
```

Fungsi:

- daftar Merchant Partner
- cari Merchant
- filter jarak
- filter rating
- filter review
- lihat kategori produk
- lihat compatibility coverage
- request partnership
- status partnership
- active partnership
- inactive partnership

---

## 10.3 Provider sidebar target

Sidebar Provider difokuskan pada pengawasan bisnis, monitoring operasional, kemitraan toko, dan keuangan:

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

---

## 10.4 Alasan Penghapusan Menu Terpisah `Penawaran Harga` & `Pelaksanaan Servis`

1. **Bukan Lifecycle Terpisah**: Penawaran harga dan pelaksanaan servis bukanlah order independen yang berdiri sendiri, melainkan tahapan (contextual state) di dalam sebuah Service Order.
2. **Order Operasional adalah Single Workspace**: Semua Service Order yang masuk ditangani di dalam workspace **Order Operasional**. Di dalamnya terdapat:
   - Pengajuan biaya / Quotation context (jika ada penyesuaian biaya dari Worker pasca diagnosis).
   - Pemantauan timeline pelaksanaan lapangan (dimiliki dan dijalankan oleh Worker).
   - Konteks sparepart (Provider-owned atau Partner Store).
   - Verifikasi bukti servis dan penyelesaian.
3. Menjaga navigation model tetap berorientasi monitoring bisnis bagi Provider, tanpa menduplikasi alur kerja Worker di lapangan.

---

# 11. PROVIDER — KERJA SAMA TOKO

## 11.1 Partner Discovery

Provider dapat mencari merchant berdasarkan:

- distance
- rating
- review
- category
- specialization

## 11.2 Partnership Request

Flow:

```text
Search Merchant
↓
Merchant Detail
↓
Request Partnership
↓
Pending
↓
Merchant Accept / Reject
↓
Active / Rejected
```

## 11.3 Partnership Detail

Display:

- Merchant name
- location
- rating
- review count
- product categories
- serviceability
- collaboration status
- partnership start date
- contact channel if authorized

---

# 12. WORKER — NAVIGATION REVISION

Worker harus fokus pada field execution.

Target:

```text
DASHBOARD

PEKERJAAN
├── Pekerjaan Saya
├── Pekerjaan Mendatang
└── Pekerjaan Aktif

PELAKSANAAN
├── Tracking
├── Sparepart & Material
└── Bukti Pekerjaan

TOKO PARTNER
└── Cari Sparepart

PENGIRIMAN
└── Pesanan Sparepart

BANTUAN

PROFILE
```

Semua store/product actions harus tetap terikat ke Job/Service Order context.

---

# 13. WORKER — SPAREPART & MATERIAL

## 13.1 Section structure

Dalam Job Detail:

```text
Sparepart & Material
├── AI Recommendation
├── Provider Prepared
├── Required After Inspection
├── Customer Approval
├── Provider-Owned Material
├── Partner Product
├── Customer Purchase
└── Usage Record
```

Tidak perlu menu inventory.

---

## 13.2 Provider Prepared Material

Worker melihat:

```text
Disiapkan Provider
Kapasitor 35uF × 1
Status: Dibawa
```

Setelah diagnosis:

```text
[ Tambahkan ke Order ]
```

---

## 13.3 Partner Product Recommendation

Worker flow:

```text
Sparepart Needed
↓
Cari Toko Partner
↓
Search Product
↓
Compatibility Check
↓
Select Product
↓
Preview Recommendation
↓
Send Customer
```

---

## 13.4 Assisted Input

Worker boleh membantu input Product Order.

Tetapi wajib:

```text
Worker prepares order
↓
Customer confirms
↓
Order Created
```

Worker tidak boleh menganggap customer sudah menyetujui sebelum ada explicit confirmation.

---

# 14. WORKER — SHIPMENT TIMELINE

Worker harus dapat melihat shipment yang berasal dari sparepart requirement.

Contoh:

```text
Sparepart Required
↓
Customer Approved
↓
Order Created
↓
Merchant Accepted
↓
Preparing
↓
Packed
↓
Shipped
↓
In Transit
↓
Delivered
↓
Received by Worker / Site
↓
Used
```

Jangan menggabungkan shipment dengan execution status.

---

# 15. WORKER — WHEN CUSTOMER DOES NOT USE PARTNER SHOP

Worker tetap membutuhkan fallback:

```text
Partner Product Unavailable
OR
Customer Chooses Other Product
OR
Customer Already Has Sparepart
```

Worker harus bisa mencatat outcome:

```text
Customer Purchased Elsewhere
Customer Already Owns Part
Customer Declined Recommendation
Alternative Product Used
Service Delayed Waiting for Customer
```

Do not create fake Partner Order.

---

# 16. CUSTOMER — NAVIGATION PRINCIPLE

JANGAN membuat sidebar baru:

```text
Sparepart
```

Sparepart harus contextual dalam Service Order.

Customer tetap:

```text
Beranda
Jasa
Produk
Pesanan
Favorit
Aset & Perawatan
Smart
Notifications
Cart
Profile
```

Feature #1–#27 mapping tetap dijaga.

---

# 17. CUSTOMER — SERVICE ORDER DETAIL REVISION

Service Order Detail harus menjadi lifecycle hub.

Struktur minimum:

```text
Service Order
├── Service Information
├── Provider
├── Worker
├── Schedule
├── Location
├── Pricing
├── Quotation
├── Payment
├── Communication
├── Tracking
├── Execution Progress
├── Sparepart & Pengadaan
├── Proof of Service
├── Customer Confirmation
├── Rating & Review
├── Warranty
├── Complaint / Dispute
├── Service History
└── Book Again
```

Tidak semua section harus aktif bersamaan.

Visibility berdasarkan order state dan applicability.

---

# 18. CUSTOMER — SPAREPART & PENGADAAN

Customer harus dapat melihat tiga sumber:

```text
Provider-Owned
Partner Merchant
Customer Purchase
```

---

## 18.1 Provider-Owned

Customer melihat:

```text
Sparepart dibawa teknisi

Kapasitor 35uF
Rp125.000

Reason:
Dibutuhkan berdasarkan hasil pemeriksaan

[ Setujui Tambahan ]
[ Tolak ]
```

Setelah approved:

```text
Added to Service Order
```

---

## 18.2 Partner Merchant Recommendation

Customer melihat:

```text
Teknisi Dani merekomendasikan:

Kapasitor AC 35uF
Rp125.000

Toko Teknik Bandung
4.8 ★
1.2 km

[ Lihat Produk ]
[ Setuju & Pesan ]
[ Tolak ]
```

Customer harus dapat memahami:

- product
- merchant
- price
- reason
- compatibility information where available
- shipping estimate
- relation to current Service Order

---

## 18.3 Customer Self Purchase

Jika Customer memilih beli sendiri:

```text
Open Product
↓
Add to Cart / Buy
↓
Checkout
↓
Payment
↓
Shipment
```

Service context tetap dipertahankan.

---

# 19. CUSTOMER — SPAREPART TIMELINE

Wajib ada timeline contextual di Service Order.

Example:

```text
14:35
Teknisi menemukan kapasitor yang perlu diganti.

14:38
Rekomendasi sparepart dikirim.

14:40
Anda menyetujui pembelian.

14:41
Pesanan sparepart dibuat.

14:45
Toko menerima pesanan.

15:05
Sparepart disiapkan.

15:20
Sparepart dikirim.

16:00
Sparepart tiba di lokasi.

16:05
Teknisi menerima sparepart.

16:10
Sparepart digunakan.
```

Timeline harus dihasilkan dari event/domain, bukan hardcoded UI.

---

# 20. CUSTOMER — ORDER STATUS VS SPAREPART STATUS

Jangan menggabungkan:

```text
Service Order Status
```

dengan:

```text
Sparepart Procurement Status
```

Contoh:

```text
Service Order:
WAITING_FOR_MATERIAL

Sparepart:
IN_TRANSIT
```

atau:

```text
Service Order:
IN_PROGRESS

Sparepart:
USED
```

Sparepart context adalah secondary state.

---

# 21. SPAREPART STATUS MODEL

Gunakan status yang meaningful untuk service procurement context:

```text
RECOMMENDED
CUSTOMER_PENDING
APPROVED
REJECTED
ORDERED
PROCESSING
SHIPPED
IN_TRANSIT
DELIVERED
RECEIVED
USED
CANCELLED
UNAVAILABLE
```

Status ini tidak boleh menggantikan status:

- Product Order
- Payment
- Fulfillment
- Shipment
- Service Order

Masing-masing domain tetap memiliki source of truth sendiri.

---

# 22. SERVICE ORDER BLOCKING RULE

Jika sparepart adalah mandatory untuk menyelesaikan service:

```text
Sparepart Required
↓
Not Available
↓
Service Cannot Continue
↓
Order / Execution State = Waiting / Blocked sesuai canonical execution state
```

Jika sparepart optional:

```text
Sparepart Declined
↓
Service Continues if possible
```

Worker harus dapat menjelaskan:

- blocked karena material
- customer declined
- customer bought elsewhere
- alternative used
- provider material unavailable

---

# 23. PARTNER MERCHANT SEARCH

## 23.1 Worker search criteria

Minimum:

- location
- distance
- rating
- reviews
- product
- compatibility
- availability signal

## 23.2 Provider partner visibility

Worker hanya boleh melihat merchant yang:

```text
Partner aktif dengan Provider organisasi yang menaungi Worker
```

Worker tidak boleh melihat semua partner platform sebagai default.

Exception:

Jika architecture secara eksplisit mengizinkan platform-wide discovery,
permission dan scope harus berbeda dan harus terdokumentasi.

Default implementation:

```text
Worker
→ Provider Partnership
→ Active Partner Merchant
```

---

# 24. MERCHANT/TOKO — ORDER SOURCE

Tambahkan `orderSource` / equivalent domain concept jika memang diperlukan oleh existing architecture.

Minimal values:

```text
DIRECT_CUSTOMER
SERVICE_RECOMMENDATION
```

Jangan mengubah order lifecycle.

Order source hanya menjadi attribution/context.

---

# 25. MERCHANT — AFFILIATE ORDER FILTER

Merchant Orders page harus mendukung:

```text
All
Direct
Affiliate
```

Optional filter:

```text
Provider
Worker
Service Order
```

Search:

- Order ID
- Customer
- Product
- Service Order ID
- Provider
- Worker

---

# 26. MERCHANT — AFFILIATE ORDER DETAIL

Detail harus menunjukkan:

```text
Order
│
├── Customer
├── Products
├── Payment
├── Fulfillment
├── Shipping
├── Return
│
└── Attribution
    ├── Source: SERVICE_RECOMMENDATION
    ├── Provider
    ├── Worker
    └── Service Order
```

Merchant tidak mengubah attribution setelah order dibuat kecuali melalui authorized governance process.

---

# 27. MERCHANT — FULFILLMENT

Affiliate Order memakai fulfillment engine existing:

```text
Order
↓
Fulfillment
↓
Pick
↓
Pack
↓
QC
↓
Handover
↓
Shipment
```

Do NOT create affiliate-specific fulfillment lifecycle.

---

# 28. MERCHANT — SHIPPING

Affiliate Order memakai shipment engine existing:

```text
Shipment Created
↓
Carrier
↓
Pickup
↓
Transit
↓
Delivery
↓
POD
```

Service context tetap ditampilkan pada detail jika authorized.

---

# 29. CUSTOMER / PRODUCT ORDER RELATIONSHIP

Customer harus dapat membedakan:

```text
Service Order
```

dan:

```text
Product Order
```

Tetapi tetap menyediakan relationship:

```text
Service Order #SRV-001
└── Sparepart Product Order #PRD-001
```

Product Order dapat dibuka secara detail tanpa kehilangan service context.

---

# 30. PAYMENT RULES FOR SPAREPART

## Provider-owned sparepart

Jika menjadi additional charge:

```text
Customer Approval
↓
Additional Payment if required
```

## Merchant product

Mengikuti Product Payment #23.

Default:

```text
Product Order
↓
Payment Required
↓
Countdown where applicable
```

## Important

Do NOT allow Worker to alter final customer payment amount silently.

Do NOT allow Provider to bypass payment requirement.

Do NOT allow Merchant to alter Service Order commercial amount.

---

# 31. COMMUNICATION

Sparepart recommendation harus memiliki contextual communication capability.

Contoh:

```text
Service Order #SRV-001
└── Conversation
    └── Sparepart Recommendation
```

Recommendation event dan chat message bukan entity yang sama.

---

# 32. NOTIFICATION FLOW

## Customer

Trigger:

- sparepart required
- provider sparepart proposed
- merchant recommendation received
- recommendation approved
- order created
- merchant accepted
- package shipped
- package delivered
- sparepart received
- sparepart used
- service blocked
- service resumed

## Provider

Trigger:

- worker reports sparepart required
- customer approval
- partner order created
- merchant delay
- material received
- service blocked

## Worker

Trigger:

- recommendation approved
- product order status update
- shipment update
- material delivered
- customer rejection
- service resumed

## Merchant

Trigger:

- affiliate order received
- order accepted
- fulfillment status
- shipping exception
- return

---

# 33. AUDIT TRAIL

Critical actions must create audit entries where applicable:

Provider:
- partnership request
- partnership termination if supported

Worker:
- material usage entry
- customer recommendation
- assisted order preparation

Customer:
- sparepart approval
- product purchase
- rejection

Merchant:
- order processing
- fulfillment
- shipping

System:
- affiliate attribution creation
- affiliate point posting

Audit must preserve:

- actor
- role
- action
- resource
- timestamp
- source
- result

---

# 34. ROLE × ACTION MATRIX

| Action | Customer | Provider Jasa | Worker | Merchant |
|---|---|---|---|---|
| View service order | ALLOW own | ALLOW organization/related | ALLOW assigned | CONDITIONAL related product order |
| Receive booking | — | ALLOW | — | — |
| Accept booking | — | ALLOW | — | — |
| Assign worker | — | ALLOW | DENY | — |
| Field timeline (Depart/Arrive) | VIEW | MONITOR | ALLOW assigned (Timeline Owner) | — |
| Perform Diagnosis | VIEW summary | MONITOR / VIEW | ALLOW assigned | — |
| Prepare Price Adjustment | — | — | ALLOW assigned (Post-diagnosis) | — |
| Authorize Price Adjustment | — | CONDITIONAL (policy/threshold) | DENY | — |
| Issue Formal Quotation | — | ALLOW (when required by model) | DENY | — |
| Approve Price / Quotation | ALLOW (Final Authority) | — | DENY | — |
| Pay service | ALLOW | — | DENY | — |
| Start execution | VIEW progress | MONITOR | ALLOW assigned (Timeline Owner) | — |
| Track | VIEW own context | MONITOR | CREATE/UPDATE own tracking | shipment only |
| Record material used | APPROVE | VIEW (Contextual) | ALLOW assigned (ProviderMaterialLine) | — |
| Recommend partner product | VIEW / DECIDE | CONFIGURE partnership / MONITOR | ALLOW assigned (Mode A/B) | — |
| Approve sparepart | ALLOW (Final Authority) | — | — | — |
| Create customer-facing product order | CONFIRM | — | ASSISTED ONLY (No self-buy) | RECEIVE |
| Process affiliate order | — | — | — | ALLOW own store |
| Fulfill | — | — | — | ALLOW own store |
| Ship | — | — | CONDITIONAL assigned shipment | ALLOW own store |
| Upload proof of service | VIEW | REVIEW | ALLOW assigned | — |
| Submit completion | — | MONITOR | ALLOW assigned | — |
| Confirm completion | ALLOW (Final Authority) | MONITOR | — | — |
| Rating | ALLOW | RESPOND | — | Rating according to product surface |

Do not implement permissions solely from this table.
Final access must use:

```text
ROLE + PERMISSION + RESOURCE + SCOPE + BUSINESS CONDITION
```

---

# 35. PROVIDER ↔ WORKER BOUNDARY

## Locked Model:

```text
Provider:
Commercial Authority
+
Service Business Owner
+
Monitoring / Service Oversight

Worker:
Field Execution
+
Diagnosis
+
Timeline Owner
+
Material / Sparepart Input
+
Price Adjustment Preparation
```

### Provider can:

- configure service catalog & pricing models
- receive & accept/reject booking
- manage Order Operasional (Service Order Workspace)
- assign worker to booking/order
- monitor field timeline progress
- chat with worker and customer
- authorize price adjustments when required by policy/threshold
- issue official quotation if formal quotation document is required
- manage store partnerships (`StorePartnership`)
- review proof of service
- handle operational exceptions

### Worker can:

- depart and arrive at service location
- perform technical diagnosis
- prepare price adjustment (service fee + sparepart + additional work)
- input physical materials used (`ProviderMaterialLine`)
- search partner stores and recommend products (Mode A direct input / Mode B recommendation)
- update tracking state and field progress
- execute service repair
- upload proof of service
- submit completion

### Worker cannot by default:

- change baseline service catalog price
- create independent commercial quotations as the Provider entity
- bypass Provider authorization when required by policy/threshold
- assign workers
- manage provider store partnerships
- manage platform fee or provider payout
- approve on behalf of Customer or make purchases using Customer funds

### Provider cannot:

- click "Start Service" or run the field execution timeline on behalf of Worker
- perform diagnosis on behalf of Worker
- overwrite Worker timeline events without valid audit exception
- record physical materials found on site on behalf of Worker

---

# 36. PROVIDER ↔ MERCHANT BOUNDARY

Provider and Merchant are separate business roles.

Provider:

```text
Needs sparepart
```

Merchant:

```text
Sells sparepart
```

Provider does not modify Merchant inventory.

Merchant does not modify Service Order pricing.

Merchant only sees service context necessary to fulfill the product order.

---

# 37. CUSTOMER ↔ WORKER BOUNDARY

Worker may:

- explain diagnosis
- recommend sparepart
- help input order
- explain shipping status

Customer decides:

- approve/reject sparepart
- purchase product
- choose another product
- decline
- confirm service completion

Worker cannot silently act as Customer.

---

# 38. CUSTOMER ↔ MERCHANT BOUNDARY

Customer:

- sees product recommendation
- sees product detail
- places order
- pays
- tracks shipment
- returns/refunds according to policy

Merchant:

- accepts order
- fulfills
- ships
- handles product return operationally

Customer does not become hidden in service context.

---

# 39. ROLE NAVIGATION ACCEPTANCE

## Provider Jasa

Required:

- no Provider stock dashboard
- no Provider warehouse management
- `Kerja Sama Toko` visible
- service order context available
- quotation available
- worker management available

## Worker

Required:

- assigned job visible
- partner shop search available contextually
- sparepart recommendation available
- shipment timeline available
- material usage input available
- no provider business management

## Customer

Required:

- Booking
- Service Orders
- contextual Payment
- contextual Quotation
- contextual Tracking
- contextual Proof
- contextual Completion
- contextual Sparepart Procurement
- contextual Warranty/Dispute

No global `Sparepart` sidebar unless later explicitly approved.

## Merchant

Required:

- Orders
- Affiliate filter/tab
- attribution detail
- fulfillment
- shipping
- returns

---

# 40. PAGE-TO-PAGE FLOW ACCEPTANCE

Every relevant flow must follow:

```text
LIST
↓
DETAIL
↓
ACTION
↓
RESULT
↓
PARENT
```

Examples:

```text
Provider Partner List
↓
Merchant Detail
↓
Request Partnership
↓
Result
↓
Partner List
```

```text
Worker Job
↓
Sparepart Needed
↓
Partner Search
↓
Product Detail
↓
Recommendation
↓
Customer Order
↓
Service Order
```

```text
Customer Service Order
↓
Sparepart Timeline
↓
Product Order
↓
Shipment
↓
Back to Service Order
```

---

# 41. STATE REQUIREMENTS

## Sparepart recommendation

```text
RECOMMENDED
CUSTOMER_PENDING
APPROVED
REJECTED
```

## Product Order

Use canonical Product Order states.

## Shipment

Use canonical Shipping states.

## Service Order

Use canonical Service Order states.

Do NOT use one generic state machine across all three.

---

# 42. SEARCH / FILTER / SORT

## Provider — Partner Store

Search:
- store name
- category
- product specialization

Filter:
- distance
- rating
- reviews
- partnership status

Sort:
- nearest
- rating
- review volume where supported

## Worker — Partner Product

Search:
- product
- SKU
- category

Filter:
- compatibility
- partner store
- availability signal

Sort:
- nearest store
- rating
- relevance

## Merchant — Orders

Search:
- order
- customer
- product
- service order
- provider
- worker

Filter:
- source
- status
- fulfillment
- shipping

## Customer — Sparepart Timeline

No generic marketplace search required.

Context comes from Service Order.

---

# 43. FORM & VALIDATION REQUIREMENTS

## Provider Partnership

Require:

- merchant
- relationship/request reason where required

## Worker Recommendation

Require:

- service order
- product
- quantity
- recommendation reason where applicable
- customer context

## Customer Approval

Require explicit:

- product/material
- quantity
- total
- confirmation

## Provider-owned sparepart addition

Require:

- material name
- quantity
- unit price if chargeable
- reason/diagnosis
- confirmation

Use React Hook Form + Zod for complex forms.

---

# 44. VALIDATION RULES

Prevent:

- zero/negative quantity
- missing product
- missing service order
- mismatched service context
- unauthorized merchant
- duplicate recommendation
- duplicate product order from same recommendation
- duplicate affiliate attribution
- customer approval without price visibility
- worker order creation without customer confirmation

---

# 45. PRODUCT COMPATIBILITY

When Worker searches partner products:

Display compatibility signal when supported:

```text
Compatible
Likely Compatible
Requires Verification
Not Compatible
```

Do not claim exact compatibility when the source data does not support it.

AI may assist interpretation, but product/domain data remains authoritative.

---

# 46. NO SILENT SUBSTITUTION

If recommended product becomes unavailable:

```text
UNAVAILABLE
↓
Notify Customer
↓
Alternative Recommendation
↓
Customer Approval Again
```

Do not automatically replace:

Product A
→ Product B

without customer confirmation.

---

# 47. PRICE CHANGE HANDLING

If merchant changes price after recommendation but before purchase:

```text
Old Recommendation
↓
Price Changed
↓
Invalidate / Refresh Recommendation
↓
Customer sees new price
↓
Customer confirms again
```

No silent price update.

---

# 48. SHIPPING DELAY HANDLING

If sparepart shipment is delayed:

Customer:

```text
Shipment Delayed
```

Worker:

```text
Waiting for Material
```

Provider:

```text
Service At Risk / Blocked
```

Merchant:

```text
Shipping Exception / SLA
```

These are related views over distinct domain states.

---

# 49. SERVICE CONTINUATION RULE

After sparepart delivery:

```text
Sparepart Delivered
↓
Worker Receives
↓
Inspect Part
↓
Use Material
↓
Continue Execution
↓
Proof
```

If delivered but not usable:

```text
Delivered
↓
Rejected / Incorrect / Damaged
↓
Return / Replacement according to product flow
↓
Service remains blocked if mandatory
```

---

# 50. RETURN / REFUND RELATION

If merchant product is returned:

Use Product Return/Refund #27.

Do not resolve it by simply deleting the sparepart from Service Order.

Flow:

```text
Product Order
↓
Return
↓
Inspection
↓
Resolution
↓
Refund / Replacement
```

Then update Service Order sparepart context via domain relation.

---

# 51. WARRANTY RELATION

If sparepart causes or resolves warranty context:

Warranty remains Feature #13 source of truth.

Example:

```text
Service Completed
↓
Warranty Active
↓
Problem Reappears
↓
Warranty Claim
↓
Inspection
↓
Decision
```

Do not create a second sparepart warranty engine.

---

# 52. SERVICE HISTORY RELATION

Service History should show material context where appropriate:

```text
Service History
└── Service Order
    ├── Service
    ├── Result
    └── Materials Used
```

Provider and Customer can see appropriate history according to scope.

---

# 53. ASSET RELATION

If sparepart installation affects Asset:

```text
Asset
↓
Component
↓
Sparepart / Part Installed
↓
Service History
```

Do not make sparepart system become Asset system.

Asset remains Feature #15 source of truth.

---

# 54. MAINTENANCE RELATION

A newly installed sparepart may influence maintenance context:

```text
Service Completed
↓
Maintenance Rule / Reminder
```

Use Feature #16.

Do not create a separate maintenance engine inside sparepart flow.

---

# 55. FEATURE #19 — SERVICE + PRODUCT INTEGRATION REVISION

Feature #19 must explicitly support:

```text
Service Order
↓
Material Requirement
↓
Source Selection
├── Provider-Owned
├── Partner Merchant
└── Customer Self-Purchase
```

Then:

```text
Provider-Owned
→ Service Order Additional Material
```

or:

```text
Partner Merchant
→ Product Order
```

or:

```text
Customer Self-Purchase
→ Product Order
```

Feature #19 acts as integration/orchestration context.

It must not become a new order/inventory/payment engine.

---

# 56. EXISTING FEATURE #20–#27 INTEGRATION

Partner merchant sparepart flow must reuse:

```text
#20 Product Discovery
#21 Cart
#22 Product Order / Booking
#23 Product Payment
#24 Inventory
#25 Fulfillment
#26 Shipping
#27 Return / Refund
```

Merchant stock remains authoritative in #24.

Merchant fulfillment remains authoritative in #25.

Shipment remains authoritative in #26.

Return/refund remains authoritative in #27.

---


# 56A. LOCKED EXECUTION CONTRACT — DO NOT LEAVE THE BUSINESS FLOW

Bagian ini adalah **aturan wajib implementasi** untuk revisi role-flow terbaru.
Business flow, role responsibility, source selection, approval, order relation, dan attribution di bawah ini dianggap **LOCKED**.

Implementer / AI **WAJIB** mengikuti flow yang tertulis.
Implementer / AI **DILARANG** menambah flow baru hanya karena menemukan ide UX lain, membuat shortcut bisnis, atau membuat fitur tambahan di luar scope.

## 56A.1 NON-NEGOTIABLE RULE — DO NOT GO OUTSIDE THE FLOW

```text
SPEC LOCKED
↓
IMPLEMENT EXACTLY
↓
VERIFY
↓
MARK [x]
```

Tidak boleh:

- mengubah urutan business flow;
- membuat shortcut yang melewati customer approval;
- membuat order barang otomatis dari recommendation;
- membuat payment otomatis dari quotation;
- memasukkan sparepart ke invoice sebelum benar-benar diperlukan dan disetujui;
- membuat inventory management untuk sparepart Provider Jasa;
- membuat Affiliate Order Engine terpisah;
- membuat Partner Store engine terpisah dari Merchant/Product ecosystem;
- membuat Worker memiliki kemampuan Provider;
- membuat Provider memiliki kemampuan Admin/CEO;
- membuat Customer dapat melakukan operational mutation;
- membuat domain baru hanya karena kebutuhan UI lokal;
- mengubah nama/status bisnis canonical tanpa source-of-truth review;
- membuat halaman tambahan yang tidak memiliki alasan dari flow terkunci;
- menghapus flow hanya karena belum ada backend;
- mengganti authoritative state dengan local UI state.

Jika menemukan kebutuhan baru:

```text
Observed Gap
↓
Identify Existing Feature / Domain
↓
Check Locked Flow
↓
If not supported:
DOCUMENT GAP — DO NOT INVENT
```

## 56A.2 DEFINITION OF DONE UNTUK SETIAP `[ ]`

Setiap checklist `[ ]` hanya boleh menjadi `[x]` jika seluruh kondisi berikut benar:

- [ ] UI benar-benar dibuat pada route yang ditentukan.
- [ ] UI dapat dibuka melalui navigation/context yang benar.
- [ ] Semua field/data yang diwajibkan tampil.
- [ ] Semua primary action tampil.
- [ ] Semua conditional action memiliki business condition.
- [ ] Loading state tersedia.
- [ ] Empty state tersedia bila applicable.
- [ ] Error state tersedia.
- [ ] Permission denied tersedia bila applicable.
- [ ] Processing state tersedia untuk mutation.
- [ ] Success feedback tersedia.
- [ ] Partial / stale / locked / expired tersedia bila applicable.
- [ ] Data berasal dari repository/domain/fixture yang authoritative.
- [ ] Tidak ada fake static business value yang menggantikan domain data.
- [ ] Form menggunakan schema validation sesuai layer terkunci.
- [ ] Navigation setelah action benar.
- [ ] Back/context preservation benar.
- [ ] Role permission benar.
- [ ] Responsive benar.
- [ ] Accessibility dasar benar.
- [ ] Tidak ada dead button / dead link.
- [ ] Cross-role handoff dapat ditelusuri.
- [ ] Relevant audit/notification dibuat bila diperlukan.
- [ ] Browser verification dilakukan.
- [ ] Automated verification dilakukan bila applicable.
- [ ] Hanya setelah semua kondisi di atas terpenuhi, ubah `[ ]` → `[x]`.

Jangan pernah mencentang checklist hanya karena file/route sudah ada.

## 56A.3 ONE SOURCE OF TRUTH RULE

```text
Page
↓
Repository / Domain Hook
↓
CentralDomainStore / API-shaped Fixture
↓
Authoritative State
```

Local state hanya untuk:

- modal terbuka/tutup;
- tab aktif sementara;
- input draft;
- filter sementara;
- UI interaction.

Local state **tidak boleh** menjadi sumber kebenaran untuk:

- order status;
- payment status;
- inventory state;
- quotation state;
- partner status;
- affiliate attribution;
- shipment status;
- service completion;
- warranty decision.

---

# 56B. LOCKED SCREEN-BY-SCREEN IMPLEMENTATION CONTRACT

Bagian ini mewajibkan implementasi **semua tampilan yang diperlukan oleh flow**, bukan hanya sidebar/page skeleton.

Setiap screen harus memiliki:

```text
SCREEN
→ Purpose
→ Entry Point
→ Data
→ UI Sections
→ Primary CTA
→ Secondary CTA
→ Conditional CTA
→ State
→ Permission
→ Next Page / Context
→ Feedback
```

## 56B.1 SHARED SCREEN RULE

Untuk setiap screen:

- [ ] Header/title jelas.
- [ ] Context/breadcrumb jelas bila halaman dalam.
- [ ] Resource identity jelas.
- [ ] Status badge canonical.
- [ ] Primary action jelas.
- [ ] Secondary actions tidak menyaingi primary action.
- [ ] Data kosong memiliki empty state.
- [ ] Error tidak menghilang tanpa feedback.
- [ ] Mutation memiliki processing lock agar tidak double-submit.
- [ ] Confirmation tersedia untuk critical action.
- [ ] Modal/drawer memiliki close behavior.
- [ ] Mobile version tetap memiliki primary CTA.

---

# 56C. PROVIDER JASA — COMPLETE SCREEN CONTRACT

Provider Jasa **tidak memiliki inventory UI** untuk sparepart sendiri.

## 56C.1 Dashboard Provider

### Tampilan

```text
Header
├── Greeting
├── Organization
└── Notification

KPI Ringkasan Operasional & Bisnis
├── Order Aktif
├── Menunggu Diagnosis
├── Menunggu Persetujuan Biaya
├── Sedang Dikerjakan
├── Menunggu Sparepart
├── Menunggu Verifikasi Bukti
├── Booking Baru
├── Rating Layanan
└── Pendapatan Hari Ini / Bulan Ini

Attention Queue (Tindakan Diperlukan & Exception)
├── ⚠ Pengajuan Biaya Worker Perlu Otorisasi (Order #SRV-xxx) [Review / Authorize]
├── ⚠ Customer Belum Menyetujui Biaya / Sparepart (Order #SRV-xxx)
├── ⚠ Sparepart Partner Terlambat / Tertunda (Order #SRV-xxx)
├── ⚠ Bukti Servis Perlu Verifikasi (Order #SRV-xxx) [Verifikasi]
├── Booking Baru Perlu Ditinjau
├── Worker Belum Ditugaskan
└── Sengketa / Klaim Garansi Aktif

Quick Actions
├── Kelola Layanan
├── Antrean Booking
├── Order Operasional
└── Kerja Sama Toko
```

### Data minimum

- active order counts by stage (monitoring)
- pending diagnosis count
- pending price adjustment authorization count
- pending customer approval count
- active execution count
- pending sparepart count
- pending proof verification count
- booking counts
- provider rating
- revenue summary
- operational alerts / exception queue

### Aturan & Batasan

- [ ] Fokus pada: **ORDER MONITORING + ACTION REQUIRED + EXCEPTION**.
- [ ] **FORBIDDEN**: Tidak ada card atau metrik `Material Inventory`.
- [ ] **FORBIDDEN**: Tidak ada stock on-hand Provider.
- [ ] **FORBIDDEN**: Tidak ada warehouse management Provider.
- [ ] **FORBIDDEN**: Tidak ada stock adjustment / inventory value.
- [ ] **FORBIDDEN**: Tidak ada Provider fulfillment queue, shipping queue, atau return queue (karena ini milik Merchant Toko).
- [ ] Quick action `Kerja Sama Toko` tersedia untuk kelola partnership dengan Merchant.

---

## 56C.2 Katalog Layanan — List

### Tampilan

```text
Header
[+ Tambah Layanan]

Search
Filter: Domain / Subcategory / Status / Booking Type

Service Table/Card
├── Service
├── Category
├── Pricing Model
├── Service Mode
├── Booking Types
├── Area
├── Status
└── Actions
```

Actions:

- View
- Edit
- Activate/Deactivate

Tidak boleh membuat taxonomy baru dari Provider.

## 56C.3 Service Create/Edit

Fields minimum:

- service name
- canonical category
- canonical subcategory
- description
- supported service modes
- supported booking types
- pricing model
- duration
- service area
- customer requirements
- material/sparepart recommendation context

Buttons:

```text
Save Draft
Save & Activate
Cancel
```

## 56C.4 Antrean Booking

Tampilan:

```text
Summary Chips
├── Pending
├── Accepted
├── Rejected
└── Reschedule

Table/List
├── Booking ID
├── Customer
├── Service
├── Date/Time
├── Location
├── Booking Type
├── Pricing Model
├── Status
└── Action
```

## 56C.5 Booking Detail

Sections:

```text
Booking Header
Customer
Service
Schedule
Location
Problem / Request
Attachments
Asset Context
Pricing Context
Provider Decision
```

Actions:

- Accept
- Reject
- Reschedule where applicable
- Open Order after accepted

Reject wajib reason.

## 56C.6 Order Operasional — List

**Definisi**: Order Operasional adalah workspace sentral untuk **SEMUA SERVICE ORDER** yang terkait dengan Provider di seluruh lifecyclenya (bukan satu fase terpisah, dan bukan terpisah dari Penawaran Harga atau Pelaksanaan Servis).

Tabs / Filter:

```text
Semua Order (All)
Order Aktif
Menunggu Diagnosis
Menunggu Persetujuan Biaya / Otorisasi
Menunggu Sparepart
Sedang Dikerjakan (In Progress)
Menunggu Verifikasi Bukti
Selesai (Completed)
Kendala / Exception
```

Columns:

- Order ID
- Customer
- Service
- Worker Ditugaskan
- Jadwal Servis
- Status Timeline Lapangan (Assigned, Departed, Arrived, Diagnosed, Executing, Proof Uploaded, Completed)
- Status Biaya / Quotation (Original, Adjustment Proposed, Provider Authorized, Customer Approved)
- Status Pembayaran (Unpaid, Paid, Additional Required, Additional Paid)
- Konteks Sparepart (Tidak Ada / Provider-Owned / Partner Store)
- Tindakan Cepat (Detail Order, Review Otorisasi, Chat Worker/Customer, Verifikasi Bukti)

---

## 56C.7 Order Detail (Master Service Order Workspace)

Lifecycle & monitoring hub Provider yang menyatukan seluruh konteks order dalam satu workspace terpadu:

### Proyeksi Timeline Terpadu (Unified Timeline Projection)

```text
ORDER #SRV-xxx

✓ Order Dikonfirmasi
✓ Worker Ditugaskan (Andi)
✓ Worker Berangkat
✓ Worker Tiba di Lokasi
✓ Diagnosis Selesai
● Peninjauan Biaya / Sparepart (Disusun Worker, Otorisasi Provider jika perlu)
○ Persetujuan Customer
○ Kondisi Pembayaran Terpenuhi
○ Kesiapan Sparepart (Provider / Partner)
○ Pelaksanaan Pekerjaan (Execution)
○ Unggah Bukti Servis (Proof)
○ Konfirmasi Customer
○ Penyelesaian & Garansi
```

### Bagian Kontekstual

```text
1. Header & Overview (Status Order, SLA, Quick Actions)
2. Data Customer & Lokasi Servis
3. Layanan & Ruang Lingkup Awal
4. Teknisi / Worker Ditugaskan
5. Timeline Lapangan (Departed, Arrived, Diagnosis, Execution, Proof) — Authoritative Worker
6. Hasil Diagnosis & Temuan Masalah Lapangan
7. Penyesuaian Biaya & Quotation Context (Review pengajuan Worker & Tombol Otorisasi jika disyaratkan)
8. Konteks Sparepart & Material (ProviderMaterialLine / Rekomendasi Toko Partner)
9. Status Finansial & Pembayaran (Service Payment, Additional Payment)
10. Verifikasi Bukti Servis (Foto Sebelum/Sesudah, Checklist Pekerjaan)
11. Penyelesaian, Garansi, & Sengketa
12. Riwayat Audit & Log Perubahan Status
13. Panel Komunikasi (Chat Provider ↔ Worker & Provider ↔ Customer)
```

Aturan:
- Provider dapat melihat seluruh konteks sparepart transaksi, namun **TIDAK ADA inventory dashboard** atau pemotongan stok gudang di Servio.
- Provider memonitor timeline, Worker yang mengeksekusi tahapan lapangan.

---

## 56C.8 Penyesuaian Biaya & Quotation — Contextual di dalam Order Operasional

Penawaran harga / penyesuaian biaya **BUKAN lifecycle atau menu sidebar terpisah**, melainkan alur kontekstual di dalam Order Operasional:

```text
Worker Diagnosis
↓
Worker Menyusun Pengajuan Biaya (Jasa + Material + Pekerjaan Tambahan)
↓
Provider Review / Authorization (CONDITIONAL berdasarkan threshold/kebijakan)
↓
Customer Approval (Langsung jika hadir di tempat, Remote via aplikasi jika tidak hadir)
↓
Kondisi Pembayaran Terpenuhi
↓
Pelaksanaan Servis
```

Tampilan di dalam Order Detail / Modal Penyesuaian Biaya:

- Adjustment / Quote Reference ID
- Service Order ID Terkait
- Trigger: Temuan Diagnosis Lapangan
- Komponen Biaya:
  - Biaya Jasa Final / Penyesuaian Biaya Jasa (Final Service Cost / Adjustment)
  - Material Fisik Provider (`ProviderMaterialLine`) jika digunakan
  - Rekomendasi Toko Partner (jika mengarahkan ke Partner Store)
  - Pekerjaan Tambahan (Additional Work) jika ada temuan baru
  - Biaya Kunjungan / Biaya Darurat resmi jika berlaku
  = Total Biaya (Total Cost)
- Status Alur:
  - `DRAFT_BY_WORKER`
  - `PENDING_PROVIDER_AUTH` (jika nominal melebihi threshold atau kebijakan mensyaratkan)
  - `AUTHORIZED_BY_PROVIDER`
  - `PENDING_CUSTOMER_APPROVAL`
  - `APPROVED_BY_CUSTOMER`
  - `REJECTED_BY_CUSTOMER`
- Aksi Provider:
  - [Setujui Pengajuan Biaya] (Otorisasi ke Customer)
  - [Tolak / Minta Klarifikasi] (Kirim catatan / chat ke Worker)
  - [Lihat Log & Detail Temuan Diagnosis]

---

## 56C.9 Buat Quotation Resmi — CONTEXT-RESTRICTED

Tombol `Buat Quotation Resmi` digunakan **hanya jika** pricing model / kebijakan layanan mensyaratkan penerbitan dokumen penawaran harga formal:

```text
Eligible Order Picker (Service Order Aktif)
↓
Diagnosis / Inspection Context
↓
Formulir Quotation Resmi
↓
Kirim Penawaran ke Customer
```

- **Strict Constraint**: Tidak boleh ada orphan quotation (quotation tanpa Service Order terkait).
- Formulir mencakup: Service Order, Customer, Service Scope, Line Items resmi, Subtotal, Pajak/Diskon jika ada, Total, Batas Berlaku, Catatan.
- `Send to Customer` wajib melalui review dan konfirmasi Provider.

---

## 56C.10 Operations / Execution Monitor — Contextual di dalam Order Operasional

Bagian pemantauan pelaksanaan pekerjaan lapangan:

Tampilan:
- Daftar Pekerjaan Aktif & Lokasi Lapangan
- Teknisi yang Ditugaskan
- Status Terakhir Timeline (Berangkat, Tiba, Mendiagnosis, Mengerjakan, Bukti Diunggah)
- Status Hambatan / Blocker (Menunggu persetujuan customer, menunggu kedatangan sparepart partner)
- Material yang Digunakan di Lokasi
- Bukti Pekerjaan yang Siap Ditinjau

**Aturan Otoritas**:
- Provider memantau (*monitoring & oversight*); Worker yang secara authoritatif mengupdate status pergerakan lapangan.
- Provider DILARANG memiliki tombol untuk mengklik "Start Service" atau "Complete Service" atas nama Worker tanpa exception audit trail yang sah.

---

## 56C.11 Manajemen Teknisi

List:

- Worker
- Skill
- Certification
- Availability
- Current Job
- Area
- Status

Detail Worker:

- profile
- competency
- certification
- assigned jobs
- availability
- performance

## 56C.12 Tracking Radar

Tampilan:

```text
Map
Worker list
ETA
Travel state
Arrival
Service progress
```

No fake live location.

## 56C.13 Verifikasi Bukti

List:

- Job
- Worker
- Proof completeness
- Submitted at
- Status

Detail:

- before evidence
- process evidence
- after evidence
- measurement
- test result
- checklist
- signature

Actions:

```text
Accept
Request Rework
```

## 56C.14 Penyelesaian Servis

Tampilan:

- order
- execution summary
- proof completeness
- customer confirmation status
- completion eligibility
- warranty eligibility

Tidak boleh force complete tanpa valid conditions.

## 56C.15 Kerja Sama Toko — List

Tampilan:

```text
Search Merchant
Filter
├── Jarak
├── Rating
├── Review
├── Category
└── Specialization

Partner Cards
├── Store Name
├── Distance
├── Rating
├── Review Count
├── Product Categories
├── Partnership Status
└── Action
```

## 56C.16 Merchant Detail / Partnership Request

Tampilkan:

- store profile
- location
- rating
- reviews
- categories
- serviceability
- partnership status
- start date if active

Action:

```text
Request Partnership
Cancel Request
End Partnership
```

Action availability mengikuti status.

## 56C.17 Ratings / Disputes / Warranties / History

Setiap list harus memiliki:

- search
- status/filter yang relevan
- detail entry
- contextual link ke Order
- action sesuai permission

## 56C.18 Finance Provider

### Earnings

- gross revenue
- platform fee
- other authorized fees
- net earnings
- pending
- available

### Payouts

- payout ID
- amount
- status
- date
- reference

### Transactions

- transaction ID
- order
- type
- amount
- fee
- status
- date

Tidak ada menu untuk mengubah policy platform fee.

---

# 56D. WORKER — COMPLETE SCREEN CONTRACT

Worker fokus pada field execution.

## 56D.1 Worker Dashboard

Tampilan:

```text
Today's Jobs
Upcoming Jobs
Active Job
Alerts
ETA
Quick Continue
```

Tidak menampilkan GMV bisnis Provider.

## 56D.2 Pekerjaan Saya — List

Columns/cards:

- Job ID
- Service
- Customer
- Time
- Location
- Status
- Sparepart Status
- Action

## 56D.3 Job Detail — MASTER WORKER SCREEN

Sections:

```text
Job Header
Customer
Location
Schedule
Service
Requirements
Asset Context
Execution Checklist
Sparepart & Material
Tracking
Proof
Issue / Safety
Communication
```

Primary action berubah sesuai state:

```text
Start Trip
Arrived
Start Work
Pause
Resume
Complete Task
Submit Proof
Submit Completion
```

## 56D.4 Sparepart & Material — Contextual

Tampilan:

```text
AI Suggested
Provider Prepared
Required After Inspection
Customer Approval
Provider-Owned
Partner Product
Customer Purchase
Usage Record
```

### Provider-owned

```text
Kapasitor 35uF × 1
Source: Provider
Status: Brought

[ Tambahkan ke Order ]
```

Modal:

- part name
- quantity
- unit price
- source
- diagnosis reason
- total
- customer approval state

## 56D.5 Partner Store Search

Tampilan:

```text
Required Part

Partner Stores
├── Store
├── Distance
├── Rating
├── Reviews
├── Product
├── Compatibility
├── Availability Signal
└── Select
```

Worker hanya melihat active partner sesuai Provider organization scope.

## 56D.6 Product Recommendation Preview

Tampilan:

```text
Product
Merchant
Price
Compatibility
Shipping Estimate
Reason
Service Order Context

[ Kirim ke Customer ]
```

Tidak ada `Buy Now` yang langsung membebankan Customer.

## 56D.7 Customer Recommendation Status

Tampilan:

```text
Recommendation Sent
Customer Pending
Approved
Rejected
Order Created
```

Action hanya sesuai state.

## 56D.8 Shipment Timeline

Tampilan:

```text
Required
↓
Approved
↓
Order Created
↓
Merchant Accepted
↓
Preparing
↓
Packed
↓
Shipped
↓
In Transit
↓
Delivered
↓
Received
↓
Used
```

Shipment status tetap berasal dari shipping domain.

## 56D.9 Customer Self-Purchase Outcome

Worker dapat mencatat:

```text
Customer Purchased Elsewhere
Customer Already Owns Part
Customer Declined
Alternative Product Used
Waiting Customer
```

Tidak membuat fake partner order.

## 56D.10 Tracking

Tampilan:

- map where applicable
- current travel state
- ETA
- tracking session
- arrival
- working

## 56D.11 Proof

Worker upload:

- before
- process
- after
- measurement
- test
- checklist
- signature

Submit Proof wajib feedback.

## 56D.12 Support

Actions:

- report job issue
- report safety issue
- report customer unavailable
- report material shortage
- contact support

---

# 56E. CUSTOMER — COMPLETE SERVICE ORDER CONTRACT

Customer adalah pihak yang harus mampu mengikuti seluruh journey.

## 56E.1 Service Order List

Tabs:

```text
All
Upcoming
Active
Completed
Issue
```

Fields:

- Order ID
- Service
- Provider
- Worker
- Schedule
- Amount / pricing state
- Payment state
- Service state
- Sparepart indicator
- Action

## 56E.2 Service Order Detail — MASTER CUSTOMER SCREEN

Wajib memiliki contextual modules:

```text
Header / Status
Service Information
Provider
Worker
Schedule
Location
Pricing
Quotation
Payment
Communication
Tracking
Execution Progress
Sparepart & Pengadaan
Proof of Service
Customer Confirmation
Rating & Review
Warranty
Complaint / Dispute
Service History
Book Again
```

Module visibility mengikuti current state.

## 56E.3 Booking Screen

Fields:

- service
- date/time
- location
- booking type
- problem
- attachment
- asset
- notes
- dynamic service requirements

## 56E.4 Booking Detail

Tampilkan:

- booking status
- provider
- service
- schedule
- location
- request
- attachments
- pricing model
- next action

## 56E.5 Quotation Review

Tampilkan:

- quote version
- service
- inspection summary
- diagnosis
- line items
- material
- fees
- total
- validity
- notes

Actions:

```text
Accept
Reject
Request Revision
Negotiate (conditional)
```

Tidak ada payment sebelum commercial agreement sesuai flow.

## 56E.6 Payment Screen — SERVICE

Tampilkan:

```text
Invoice / Amount Due
Fee Breakdown
Protection
Payment Method
Deadline if applicable
Payment Status
```

Status harus mampu merepresentasikan canonical payment states yang applicable:

```text
UNPAID
REQUIRES_PAYMENT
REQUIRES_ACTION
PROCESSING
PAID
FAILED
EXPIRED
CANCELLED
REFUND_PENDING
PARTIALLY_REFUNDED
REFUNDED
```

Payment proof upload tidak boleh dibuat sebagai status baru tanpa source-of-truth review.

## 56E.7 Payment Processing / Result

Success:

```text
PAID
Receipt
Order Ready
```

Failed:

```text
FAILED
Reason
Retry / Change Method
```

Requires Action:

```text
REQUIRES_ACTION
Required customer action
```

Expired:

```text
EXPIRED
Resolution / Retry if allowed
```

## 56E.8 Sparepart Recommendation

Jika Worker mengirim:

```text
Technician Recommendation
Product
Merchant
Price
Reason
Compatibility
Shipping Estimate
Service Order Link
```

Actions:

```text
Lihat Produk
Setuju & Pesan
Tolak
```

## 56E.9 Provider-Owned Sparepart Approval

Tampilan:

```text
Sparepart dibawa teknisi
Part
Qty
Price
Reason

[ Setujui Tambahan ]
[ Tolak ]
```

Jika approve:

```text
Customer Approved
↓
Service Order Additional Material
↓
Payment / Additional Payment according to state
```

Tidak boleh auto-charge hanya karena Worker membawa sparepart.

## 56E.10 Sparepart & Pengadaan Timeline

Wajib menampilkan event domain:

```text
Required
Recommendation
Customer Approval
Order Created
Merchant Accepted
Preparing
Shipped
In Transit
Delivered
Received
Used
```

Event tidak boleh hardcoded hanya di UI.

## 56E.11 Product Order Detail Context

Jika sparepart berasal dari Merchant:

Customer dapat membuka Product Order tanpa kehilangan:

- Service Order ID
- purpose
- worker recommendation
- provider context

## 56E.12 Tracking

Customer melihat:

- worker
- ETA
- travel state
- arrival
- service progress

## 56E.13 Execution Progress

Timeline:

```text
Assigned
En Route
Arrived
Working
Testing
Proof
Waiting Customer Confirmation
Completed
```

Gunakan canonical state mapping, bukan duplicate state engine.

## 56E.14 Proof Review

Tampilkan:

- evidence gallery
- checklist
- measurement
- test result
- worker/provider context

Actions:

```text
Acknowledge / Continue
Report Issue
```

## 56E.15 Customer Confirmation

Tampilan critical:

```text
Pekerjaan selesai?

[ Pekerjaan Selesai ]
[ Ada Masalah ]
```

Jika selesai:

```text
Customer Confirmation
↓
Completion
↓
Rating
```

Jika masalah:

```text
Report Issue
↓
Complaint / Dispute
```

Provider/Worker tidak boleh mengambil alih customer confirmation.

## 56E.16 Rating & Review

Fields:

- overall rating
- optional dimensions
- comment

Submit setelah completion eligibility.

## 56E.17 Warranty

Customer dapat:

- lihat warranty
- lihat coverage
- lihat expiry
- submit claim
- upload evidence
- track claim

## 56E.18 Dispute

Customer dapat:

- create complaint
- submit evidence
- see status
- communicate
- see resolution
- see refund reference if applicable

## 56E.19 Service History

Tampilkan:

- service
- provider
- worker when relevant
- date
- result
- materials used where available
- cost
- warranty relation

## 56E.20 Maintenance / Rebook Context

After eligible completion:

```text
Maintenance Reminder
Book Again
```

Book Again selalu membuat Booking baru.

---

# 56F. MERCHANT / TOKO — COMPLETE AFFILIATE ORDER CONTRACT

Merchant tetap memakai **satu Order Engine**.

## 56F.1 Orders List

Tabs:

```text
All
Direct
Affiliate
```

Optional filters:

- Provider
- Worker
- Service Order
- Product
- Customer
- Order status

## 56F.2 Affiliate Order Badge

Tampilkan:

```text
AFFILIATE
Source: SERVICE_RECOMMENDATION
Provider: ...
Recommended By: Worker ...
Service Order: ...
```

## 56F.3 Affiliate Order Detail

Sections:

```text
Order
Customer
Products
Payment
Fulfillment
Shipping
Return
Service Context
Attribution
```

Attribution:

```text
Provider
Worker
Merchant
Product
Service Order
```

## 56F.4 Fulfillment

Gunakan existing:

```text
Pick
Verify
Pack
QC
Handover
```

Tidak boleh ada affiliate-specific fulfillment lifecycle.

## 56F.5 Shipping

Gunakan existing shipment engine:

```text
Shipment Created
Pickup
Transit
Delivery
POD
Exception
```

## 56F.6 Affiliate Attribution / Points

Attribution hanya eligible setelah:

```text
Recommendation
↓
Customer Confirmation
↓
Product Order Created
```

Point outcome mengikuti policy dan harus menangani cancellation/return/refund.

---

# 56G. CROSS-ROLE SCREEN CONSISTENCY CONTRACT

Satu event harus tampil konsisten pada role berbeda.

Contoh:

```text
SERVICE ORDER SRV-001
```

Customer:

```text
Waiting for Sparepart
```

Provider:

```text
Service At Risk / Waiting Material
```

Worker:

```text
Waiting Material
```

Merchant:

```text
Affiliate Order — In Transit
```

Ini **boleh berbeda dalam wording UI**, tetapi harus berasal dari relasi/domain state yang sama.

Tidak boleh menjadi empat state engine yang berbeda.

---

# 56H. COMPLETE BUSINESS FLOW — MUST NOT DEVIATE

## 56H.1 STANDARD SERVICE — NO SPAREPART

```text
Customer Discovery
↓
Service Detail
↓
Booking
↓
Provider Accept & Assign Worker
↓
Service Order Created (Order Operasional Workspace)
↓
Worker Depart
↓
Worker Arrive
↓
Worker Diagnosis
↓
Worker Prepares Final Cost / Confirms Scope
↓
Provider Authorization IF Required by Threshold/Policy
↓
Customer Approval
↓
Payment Condition Met
↓
Worker Execution
↓
Worker Uploads Proof of Service
↓
Customer Confirmation
↓
Service Completed
↓
Rating & Service History
```

## 56H.2 PROVIDER-OWNED SPAREPART

```text
Service Order Active (Order Operasional)
↓
Worker Assigned
↓
Worker Depart
↓
Worker Arrive
↓
Worker Diagnosis
↓
Sparepart Required (Provider Physical Material Available)
↓
Worker Prepares:
├── Biaya Jasa Final / Penyesuaian Jasa (Service Cost / Adjustment)
├── Material Line (ProviderMaterialLine)
└── Pekerjaan Tambahan jika ada (Additional Work)
        ↓
Provider Authorization IF Required by Policy/Threshold
        ↓
Customer Approval (Direct if present, Remote if absent)
        ↓
Payment Condition Met / Additional Payment
        ↓
Worker Execution
        ↓
Worker Uploads Proof
        ↓
Customer Confirmation
        ↓
Service Completed
```

## 56H.3 PARTNER MERCHANT SPAREPART

```text
Service Order Active (Order Operasional)
↓
Worker Depart & Arrive
↓
Worker Diagnosis
↓
Sparepart Required (Provider Part Unavailable)
↓
Worker Searches Partner Store (Provider ↔ Merchant Network)
↓
Compatible Product Identified
↓
┌─────────────────────────────────┬─────────────────────────────────┐
│ Mode A: Customer Hadir di Lokasi │ Mode B: Customer Tidak Hadir    │
│ (Direct Input / Deal di Tempat) │ (Product Recommendation)        │
├─────────────────────────────────┼─────────────────────────────────┤
│ Worker input produk & harga     │ Worker kirim rekomendasi        │
│ Customer approve langsung di HP │ Customer terima & konfirmasi    │
└─────────────────────────────────┴─────────────────────────────────┘
        ↓
Product Order Terbentuk (Commerce Engine Existing #22–#27)
        ↓
Merchant Fulfills & Ships Sparepart
        ↓
Status Order Jasa: `waiting_material` (Jika pekerjaan terhenti)
        ↓
Sparepart Tiba di Lokasi Servis
        ↓
Worker Pasang Sparepart & Lanjutkan Eksekusi
        ↓
Worker Uploads Proof
        ↓
Customer Confirmation
        ↓
Service Completed
```

## 56H.4 CUSTOMER SELF PURCHASE

```text
Sparepart Required
↓
Customer Chooses Self Purchase
↓
Product Discovery
↓
Product Order
↓
Payment
↓
Fulfillment
↓
Shipping
↓
Worker Receives
↓
Use Part
↓
Continue Service
```

## 56H.5 CUSTOMER REJECTS PROVIDER PART

```text
Provider Part Offered
↓
Customer Reject
↓
No Additional Material Line
↓
Choose Alternative / Self Purchase / Partner Store
```

No charge if not otherwise authorized by policy.

## 56H.6 CUSTOMER REJECTS PARTNER RECOMMENDATION

```text
Recommendation
↓
Customer Reject
↓
No Product Order Created
↓
Worker records outcome
↓
Service continues / waits according to requirement
```

## 56H.7 PARTNER ORDER CANCELLED / RETURNED

Product lifecycle remains:

```text
Product Order
↓
Return / Refund #27
```

Do not delete relation from Service Order as a workaround.

## 56H.8 PAYMENT FAILURE

```text
Payment
↓
FAILED
↓
Retry / Change Method
```

Execution remains blocked if payment is required.

## 56H.9 ADDITIONAL PAYMENT FAILURE

```text
Sparepart Approved
↓
Additional Payment Required
↓
FAILED
↓
Retry / Resolution
```

Do not mark sparepart financially settled without successful payment or authorized policy outcome.

## 56H.10 SHIPMENT DELAY

```text
Merchant
→ Shipment Delayed

Customer
→ Shipment Delayed

Worker
→ Waiting Material

Provider
→ Service At Risk / Blocked
```

Each is a contextual view over canonical domains.

---

# 56I. SCREEN STATE + CONDITIONAL CTA MATRIX

Every affected screen must map actions to states.

| Context | State | Allowed Primary Action | Forbidden Action |
|---|---|---|---|
| Booking | pending | Accept/Review for Provider; Cancel where policy allows for Customer | Complete |
| Booking | accepted | Open Order | Create duplicate order |
| Quotation | draft | Edit/Send | Payment before agreement |
| Quotation | sent | Review / Decide | Duplicate blind send |
| Quotation | rejected | Revise if allowed | Pretend accepted |
| Payment | unpaid | Pay | Start execution if payment required |
| Payment | processing | Wait/Retry according to rule | Double pay |
| Payment | failed | Retry | Mark PAID manually |
| Payment | requires_action | Complete required action | Start execution |
| Payment | expired | Resolution/Retry if policy allows | Reuse expired intent |
| Payment | paid | Continue eligible flow | Duplicate charge |
| Sparepart | customer_pending | Approve/Reject | Auto-order |
| Sparepart | approved | Process correct next domain | Silent charge |
| Product Order | created | Merchant process | Edit attribution arbitrarily |
| Shipment | in_transit | Track | Pretend delivered |
| Shipment | delivered | Receive/Use if context valid | Fake receipt |
| Service | waiting_material | Wait/resolve source | Mark completed |
| Proof | submitted | Review | Silent completion |
| Completion | awaiting_customer | Customer Confirm/Issue | Worker auto-confirm customer |
| Warranty | eligible | Claim handling | New commercial order automatically |

---

# 56J. DATA CONTRACT — MINIMUM FIELDS FOR NEW ROLE-FLOW EXTENSION

These are conceptual contracts. Reuse existing types where possible.

## 56J.1 SparepartRequirement

```text
id
serviceOrderId
sourceType
partName
productId?
merchantId?
providerId
workerId?
quantity
reason
diagnosisContext?
unitPrice?
totalPrice?
customerApprovalStatus
procurementStatus
productOrderId?
shipmentId?
usedAt?
createdAt
updatedAt
```

## 56J.2 StorePartnership

```text
id
providerId
merchantId
status
requestedAt
approvedAt?
endedAt?
scope
createdAt
updatedAt
```

## 56J.3 ProductRecommendation

```text
id
serviceOrderId
workerId
providerId
merchantId
productId
reason
compatibilityContext
priceSnapshot
availabilitySnapshot
shippingEstimateSnapshot?
status
customerDecision
createdAt
updatedAt
```

## 56J.4 AffiliateAttribution

```text
id
productOrderId
serviceOrderId
providerId
workerId
merchantId
productId
source
eligibilityStatus
pointsProvider?
pointsWorker?
createdAt
finalizedAt?
```

Do not duplicate existing order/payment/shipment entities merely to store these relations.

---

# 56K. NOTIFICATION CONTRACT FOR ROLE FLOW

## Customer

- [ ] Booking submitted
- [ ] Booking accepted
- [ ] Booking rejected
- [ ] Quotation received
- [ ] Quotation revised
- [ ] Payment required
- [ ] Payment success
- [ ] Payment failed
- [ ] Payment expired
- [ ] Worker assigned
- [ ] Worker en route
- [ ] Sparepart recommendation received
- [ ] Sparepart approved/rejected
- [ ] Product order created
- [ ] Shipment update
- [ ] Proof available
- [ ] Completion confirmation requested
- [ ] Dispute update
- [ ] Warranty update

## Provider

- [ ] Booking received
- [ ] Customer quotation decision
- [ ] Worker issue
- [ ] Sparepart recommendation outcome
- [ ] Merchant order outcome where relevant
- [ ] Proof submitted
- [ ] Customer confirmation
- [ ] Dispute
- [ ] Warranty

## Worker

- [ ] Job assigned
- [ ] Schedule changed
- [ ] Sparepart requirement update
- [ ] Customer recommendation decision
- [ ] Merchant shipment update
- [ ] Customer issue
- [ ] Support response

## Merchant

- [ ] Affiliate order created
- [ ] Payment/order eligibility where authorized
- [ ] Fulfillment due
- [ ] Shipment created
- [ ] Shipment exception
- [ ] Return request

---

# 56L. SEARCH / FILTER / SORT — ROLE FLOW REVISION

Provider:

- [ ] Partner Store search by distance/rating/review/category.
- [ ] Booking search/filter.
- [ ] Order search/filter.
- [ ] Quotation search/filter.
- [ ] Worker search/filter.

Worker:

- [ ] Assigned Job search/filter.
- [ ] Partner Store search.
- [ ] Product search.
- [ ] Shipment search.

Customer:

- [ ] Booking search/filter.
- [ ] Service Order search/filter.
- [ ] Product context search.
- [ ] Sparepart timeline filtering only if volume requires it.

Merchant:

- [ ] Order search.
- [ ] Direct/Affiliate filter.
- [ ] Provider/Worker/Service Order filter where supported.

No search/filter may silently change the user's query.

---

# 56M. RESPONSIVE SCREEN CONTRACT

Every affected screen must be verified at:

```text
360
390
480
640
768
834
1024
1280
1536
```

Provider:

- [ ] dashboard adapts
- [ ] bookings adapt
- [ ] quotation form adapts
- [ ] partner cards adapt
- [ ] tables adapt

Worker:

- [ ] Job Detail remains usable at 360px
- [ ] sticky action remains reachable
- [ ] tracking is usable
- [ ] proof upload is usable
- [ ] partner product search is usable

Customer:

- [ ] Booking wizard adapts
- [ ] Order Detail adapts
- [ ] Payment remains clear
- [ ] Recommendation card adapts
- [ ] Timeline remains readable
- [ ] Completion confirmation remains prominent

Merchant:

- [ ] affiliate badge remains visible
- [ ] order filters remain usable
- [ ] order detail attribution remains readable

---

# 56N. ACCESSIBILITY CONTRACT

For every new/modified screen:

- [ ] keyboard navigation
- [ ] visible focus
- [ ] semantic headings
- [ ] labeled forms
- [ ] error association
- [ ] modal focus management
- [ ] Escape behavior
- [ ] icon button accessible name
- [ ] no color-only meaning
- [ ] touch target >= 44x44px where applicable
- [ ] reduced motion respected

---

# 56O. IMPLEMENTATION PHASE GATE

The AI MUST execute in this order:

```text
PHASE 0
Read / confirm source of truth
        ↓
PHASE 1
Audit existing implementation
        ↓
PHASE 2
Update domain contracts only where required
        ↓
PHASE 3
Provider Jasa
        ↓
PHASE 4
Worker
        ↓
PHASE 5
Merchant / Toko
        ↓
PHASE 6
Customer
        ↓
PHASE 7
Cross-role integration
        ↓
PHASE 8
Payment / Fulfillment / Shipping regression
        ↓
PHASE 9
12-layer verification
        ↓
PHASE 10
11-state verification
        ↓
PHASE 11
Responsive + Accessibility
        ↓
PHASE 12
Automated test
        ↓
PHASE 13
Browser walkthrough
        ↓
PHASE 14
Second forensic pass
        ↓
PHASE 15
Mark [x] only for verified items
```

Do not skip to Phase 6 before Provider/Worker/Merchant dependencies are stable.

---

# 56P. MANDATORY IMPLEMENTATION REPORT

When implementation is complete, report EVERY modified screen.

Format:

```text
SCREEN
Route:
Role:
Purpose:
Data:
Primary CTA:
Secondary CTA:
States:
Permission:
Entry:
Next:
Verified:
```

For each screen state:

```text
PASS / PARTIAL / FAIL
```

Do not summarize 20 screens as simply `Provider PASS`.

Every screen must be individually traceable.

---

# 56Q. LOCK RE-VALIDATION GATE

The role-flow revision can only be declared **FINAL LOCKED** after:

- [ ] Provider Jasa screen contract implemented.
- [ ] Worker screen contract implemented.
- [ ] Customer screen contract implemented.
- [ ] Merchant/Toko screen contract implemented.
- [ ] Provider-owned sparepart flow verified.
- [ ] Partner merchant sparepart flow verified.
- [ ] Customer self-purchase flow verified.
- [ ] Customer approval verified.
- [ ] Provider partnership verified.
- [ ] Affiliate attribution verified.
- [ ] Affiliate order filter/detail verified.
- [ ] Product Order ↔ Service Order relation verified.
- [ ] Shipping timeline verified.
- [ ] Additional payment verified.
- [ ] Payment failure verified.
- [ ] Return/refund relation verified.
- [ ] Warranty relation verified.
- [ ] Service history relation verified.
- [ ] Asset relation verified.
- [ ] Maintenance relation verified.
- [ ] Notifications verified.
- [ ] Search/filter/sort verified.
- [ ] Responsive verified.
- [ ] Accessibility verified.
- [ ] 12-layer verification verified.
- [ ] 11-state affected-page verification verified.
- [ ] M0–M11 regression verified.
- [ ] TypeScript 0 errors.
- [ ] Lint 0 errors.
- [ ] Build 0 errors.
- [ ] Automated tests pass.
- [ ] Browser walkthrough pass.
- [ ] Second forensic pass has no unresolved P0/P1.

Only after all applicable items above are `[x]`:

```text
ROLE FLOW REVISION
        ✅

PROVIDER JASA
        ✅

WORKER
        ✅

CUSTOMER
        ✅

MERCHANT / TOKO
        ✅

CROSS-ROLE
        ✅

SPAREPART
        ✅

AFFILIATE
        ✅

PAYMENT
        ✅

SHIPPING
        ✅

12 LAYERS
        ✅

REGRESSION
        ✅

FINAL FORENSIC
        ✅

READY
        ✅
```

Do NOT mark `[x]` before verification.
Do NOT declare `READY` merely because implementation compiled.

---

# 57. 12-LAYER IMPACT

This role-flow revision affects all 12 layers.

## L1 Page Content

- [ ] Provider `Kerja Sama Toko` exists.
- [ ] Provider Inventory removed.
- [ ] Worker Partner Product contextual entry exists.
- [ ] Customer Sparepart appears contextually in Service Order.
- [ ] Merchant Affiliate Order context exists.

## L2 User Flow

- [ ] Service → Inspection → Sparepart Requirement.
- [ ] Provider-owned flow.
- [ ] Partner merchant flow.
- [ ] Customer self-purchase flow.
- [ ] Customer confirmation before Product Order.

## L3 Page-to-Page

- [ ] Service Order → Partner Product.
- [ ] Partner Product → Customer Recommendation.
- [ ] Recommendation → Product Order.
- [ ] Product Order → Shipment.
- [ ] Shipment → Service Order context.

## L4 State

- [ ] Sparepart secondary state separated from order state.
- [ ] Product state remains canonical.
- [ ] Shipment state remains canonical.

## L5 Data Contract

- [ ] Sparepart requirement typed.
- [ ] Product Order service relation typed.
- [ ] Attribution typed.
- [ ] Recommendation typed.

## L6 Components

- [ ] SparepartRequirementCard.
- [ ] PartnerStoreCard.
- [ ] ProductRecommendationCard.
- [ ] SparepartTimeline.
- [ ] AffiliateBadge.

Reuse existing components when equivalent ones already exist.

## L7 Validation

- [ ] Customer confirmation validation.
- [ ] Worker recommendation validation.
- [ ] Provider partnership validation.
- [ ] Quantity/price validation.

## L8 RBAC

- [ ] Worker partner visibility scoped to Provider.
- [ ] Customer own service context.
- [ ] Merchant own order context.
- [ ] Provider organization scope.

## L9 Responsive

- [ ] Worker mobile recommendation workflow.
- [ ] Customer mobile approval.
- [ ] Merchant dense order list.
- [ ] Provider partner discovery.

## L10 Notification

- [ ] Recommendation.
- [ ] Approval.
- [ ] Order.
- [ ] Shipment.
- [ ] Delivery.
- [ ] Material used.

## L11 Search / Filter / Sort

- [ ] Provider partner search.
- [ ] Worker product search.
- [ ] Merchant affiliate order filter.

## L12 Permission + Navigation

- [ ] Provider Inventory hidden/removed.
- [ ] Partner Store shown to authorized Provider.
- [ ] Worker Partner Store contextual.
- [ ] Customer Sparepart contextual.
- [ ] Merchant Affiliate filter visible.

---

# 58. COMPONENT CHECKLIST

## Shared

- [ ] Timeline component reused.
- [ ] Status Badge reused.
- [ ] Product Card reused.
- [ ] Order relation card reused.
- [ ] Confirmation Modal reused.

## Service Domain

- [ ] Sparepart Requirement Card.
- [ ] Provider-Owned Material Card.
- [ ] Service Order Material Line.
- [ ] Sparepart Timeline.

## Partner Domain

- [ ] Partner Store Card.
- [ ] Partner Store Detail.
- [ ] Partnership Status Badge.

## Recommendation

- [ ] Recommendation Card.
- [ ] Recommendation Preview.
- [ ] Customer Approval Modal.
- [ ] Compatibility Indicator.

## Merchant

- [ ] Affiliate Order Badge.
- [ ] Attribution Panel.

---

# 59. FRONTEND DATA CONTRACT CHECKLIST

Required conceptual objects:

```text
SparepartRequirement
SparepartRecommendation
ProviderPreparedMaterial
PartnerMerchantContext
ProductOrderRelation
AffiliateAttribution
SparepartTimelineEvent
```

Fields should be minimal and domain-driven.

Do not duplicate full Product Order, Shipment, Inventory, or Payment entities inside sparepart objects.

Relationships should point to authoritative entities.

---

# 60. EVENT / TIMELINE CHECKLIST

Minimum events:

```text
SPAREPART_RECOMMENDED
SPAREPART_CUSTOMER_APPROVAL_REQUIRED
SPAREPART_APPROVED
SPAREPART_REJECTED
PROVIDER_MATERIAL_PREPARED
SPAREPART_PRODUCT_ORDER_CREATED
SPAREPART_MERCHANT_ACCEPTED
SPAREPART_FULFILLMENT_STARTED
SPAREPART_SHIPPED
SPAREPART_DELIVERED
SPAREPART_RECEIVED
SPAREPART_USED
SPAREPART_UNAVAILABLE
SERVICE_WAITING_FOR_MATERIAL
SERVICE_RESUMED_AFTER_MATERIAL
```

Do not create events already represented more authoritatively by Product Order/Shipment unless the timeline needs a contextual projection.

---

# 61. DUPLICATION PREVENTION

Before creating anything, search for equivalent existing concepts.

Never create:

- another Product Order engine
- another Shipment engine
- another Payment engine
- Provider Inventory engine
- another Affiliate Order engine
- another Recommendation engine if Feature #18 already supports this domain
- another Warranty engine
- another Maintenance engine

Extend and reuse existing architecture.

---

# 62. NAVIGATION SOURCE OF TRUTH

Central navigation registry remains authoritative.

After modification verify:

```text
Role
→ Navigation Item
→ Permission
→ Route
→ Page Contract
→ Parent Context
```

No critical feature should be reachable only by manually typing URLs.

---

# 63. WORKER MOBILE-FIRST ACCEPTANCE

Because Worker operates in field:

- [ ] Job Detail usable at 360px.
- [ ] Sparepart recommendation flow usable with one hand.
- [ ] Customer confirmation status visible.
- [ ] Shipment status visible.
- [ ] Upload/proof remains reachable.
- [ ] Tracking remains reachable.
- [ ] Touch targets ≥ 44×44px.
- [ ] No long modal workflow that blocks urgent execution unnecessarily.

---

# 64. CUSTOMER MOBILE ACCEPTANCE

- [ ] Service Order Detail usable at 360px.
- [ ] Payment CTA visible.
- [ ] Sparepart approval CTA visible when required.
- [ ] Recommendation product card readable.
- [ ] Shipment timeline readable.
- [ ] Completion confirmation easy to reach.
- [ ] Report issue available.

---

# 65. PROVIDER DESKTOP ACCEPTANCE

- [ ] Booking queue efficient.
- [ ] Quotation workspace efficient.
- [ ] Worker assignment visible.
- [ ] Partner Store discovery efficient.
- [ ] Service order sparepart context visible.
- [ ] No stock management clutter.

---

# 66. MERCHANT DESKTOP ACCEPTANCE

- [ ] Affiliate order source visible.
- [ ] Filter works.
- [ ] Attribution visible.
- [ ] Service context visible where authorized.
- [ ] Existing order workflow unchanged.

---

# 67. EXCEPTION FLOWS

## 67.1 Provider has no sparepart

```text
No Provider Material
→ Partner Search
```

## 67.2 No partner product

```text
No Compatible Partner Product
→ Customer Self Purchase / Alternative / Service Hold
```

## 67.3 Customer rejects

```text
Recommendation Rejected
→ Service continues if possible
OR
Service blocked / cannot complete
```

## 67.4 Partner rejects order

```text
Merchant Reject
→ Alternative Merchant / Customer Choice
```

## 67.5 Shipment delayed

```text
Shipping Exception
→ Notify
→ Service At Risk / Waiting
```

## 67.6 Wrong product

```text
Delivered
→ Inspection
→ Incorrect
→ Return / Replacement
```

## 67.7 Damaged product

```text
Delivered
→ Damaged
→ Return / Replacement
```

## 67.8 Customer already owns product

```text
Customer Existing Sparepart
→ Worker validates
→ Record usage if approved
```

No Product Order should be created.

---

# 68. BUSINESS INVARIANTS

The following must remain true:

1. Provider does not expose a stock management engine for self-owned sparepart.
2. AI recommendation does not equal purchase.
3. Worker recommendation does not equal customer consent.
4. Customer consent is required before chargeable product order creation.
5. Provider-owned sparepart can be added to Service Order only after actual requirement is established.
6. Additional charges never silently mutate payment amount.
7. Merchant orders use one order engine.
8. Affiliate attribution does not create a duplicate order lifecycle.
9. Merchant inventory remains authoritative in Product Inventory domain.
10. Shipment remains authoritative in Shipping domain.
11. Refund remains authoritative in Return/Refund + Finance domains.
12. Service Order and Product Order remain separate entities.
13. Sparepart timeline is a contextual projection, not a new transaction engine.
14. Worker only sees partner merchants within authorized provider relationship by default.
15. Customer can understand who recommended the product.
16. Customer can reject a recommendation.
17. No silent product substitution.
18. No silent price change.
19. Affiliate points are not final merely because recommendation was sent.
20. Affiliate attribution is tied to a real Product Order.
21. Service can continue without sparepart only when business state permits it.
22. Mandatory material shortage can block service without faking completion.

---

# 69. IMPLEMENTATION PHASES

## PHASE A — PRE-IMPLEMENTATION AUDIT

- [x] Inspect current Provider sidebar.
- [x] Inspect current Worker sidebar.
- [x] Inspect current Customer Service Order Detail.
- [x] Inspect current Merchant Orders.
- [x] Locate existing inventory references in Provider.
- [x] Locate quotation flow.
- [x] Locate Service + Product Integration.
- [x] Locate AI recommendation implementation.
- [x] Locate Product Order relation.
- [x] Locate notification system.
- [x] Locate audit system.
- [x] Do not modify until mapping is complete.

## PHASE B — DOMAIN CONTRACT REVIEW

- [x] Define SparepartRequirement extension.
- [x] Define recommendation context.
- [x] Define serviceOrderId/productOrderId relationship.
- [x] Define affiliate attribution.
- [x] Define provider-owned material line.
- [x] Define timeline projection.
- [x] Confirm no duplicate inventory engine.

## PHASE C — PROVIDER (IMPLEMENTATION PENDING)

- [ ] Remove Provider inventory UI & obsolete route references.
- [ ] Add Kerja Sama Toko (Store Partnerships) overview.
- [ ] Add partner discovery & search.
- [ ] Add partnership request & detail screens.
- [ ] Connect worker-visible partner scope to Provider partnerships.
- [ ] Implement Order Operasional as the unified Service Order Workspace.
- [ ] Implement Provider Dashboard (Order Monitoring + Action Required + Exception queue).
- [ ] Implement contextual Price Adjustment review & conditional authorization in Order Operasional.
- [ ] Connect Provider proof verification and completion monitoring.

## PHASE D — WORKER

- [ ] Add contextual Sparepart & Material.
- [ ] Add Provider Prepared material view.
- [ ] Add inspection-based material addition.
- [ ] Add Partner Store search.
- [ ] Add product compatibility.
- [ ] Add recommendation preview.
- [ ] Add customer approval handoff.
- [ ] Add assisted order flow.
- [ ] Add shipment timeline.
- [ ] Add material usage result.
- [ ] Add fallback outcomes.

## PHASE E — MERCHANT

- [ ] Add Affiliate filter/tab.
- [ ] Add affiliate badge.
- [ ] Add attribution detail.
- [ ] Show service context where authorized.
- [ ] Keep existing Order engine.
- [ ] Connect to existing Fulfillment.
- [ ] Connect to existing Shipping.
- [ ] Connect to existing Return.

## PHASE F — CUSTOMER

- [ ] Audit Service Order Detail.
- [ ] Add payment states where missing.
- [ ] Add quotation state where missing.
- [ ] Add Sparepart & Pengadaan contextual section.
- [ ] Add Provider-owned sparepart approval.
- [ ] Add partner recommendation.
- [ ] Add product detail context.
- [ ] Add Product Order relation.
- [ ] Add sparepart timeline.
- [ ] Add shipment timeline.
- [ ] Add service blocked/waiting state.
- [ ] Add customer self-purchase path.
- [ ] Preserve completion/rating/warranty/dispute links.

## PHASE G — CROSS-ROLE INTEGRATION

- [ ] Customer booking appears to Provider.
- [ ] Provider order appears correctly.
- [ ] Worker assignment receives same order.
- [ ] Worker can access relevant partners.
- [ ] Recommendation appears to Customer.
- [ ] Customer approval reaches Worker.
- [ ] Product Order appears to Merchant.
- [ ] Attribution preserved.
- [ ] Fulfillment updates propagate.
- [ ] Shipping updates propagate.
- [ ] Customer timeline updates.
- [ ] Worker sees delivery.
- [ ] Material usage returns to Service Order.
- [ ] Completion flow continues.

## PHASE H — FINANCIAL / DOMAIN REGRESSION

- [ ] Fixed price with no sparepart.
- [ ] Fixed price + provider sparepart additional payment.
- [ ] Quotation with provider sparepart.
- [ ] Product order from partner merchant.
- [ ] Product payment.
- [ ] Payment failure.
- [ ] Payment requires action.
- [ ] Payment expiry where applicable.
- [ ] Refund.
- [ ] Return.
- [ ] No silent amount mutation.

## PHASE I — RESPONSIVE / ACCESSIBILITY

- [ ] Provider desktop.
- [ ] Worker 360px.
- [ ] Worker 390px.
- [ ] Customer 360px.
- [ ] Customer 390px.
- [ ] Merchant desktop.
- [ ] Tablet 768px.
- [ ] Desktop 1280px.
- [ ] Desktop 1536px.
- [ ] Keyboard.
- [ ] Focus.
- [ ] Reduced motion.

## PHASE J — FINAL FORENSIC TEST

- [ ] Automated role-flow tests.
- [ ] Cross-role browser test.
- [ ] 12-layer review.
- [ ] 11-state review for affected pages.
- [ ] Navigation audit.
- [ ] RBAC audit.
- [ ] Search/filter/sort audit.
- [ ] Notification audit.
- [ ] Audit trail audit.
- [ ] Dead UI sweep.
- [ ] Regression M0–M11.

---

# 70. MASTER END-TO-END SCENARIOS

## SC-01 Standard service without sparepart

```text
Customer
→ Booking
→ Provider Accept
→ Order
→ Payment
→ Worker
→ Execution
→ Proof
→ Customer Confirm
→ Completion
```

## SC-02 Provider-owned sparepart

```text
Order
→ AI Recommendation
→ Provider prepares manually
→ Worker carries
→ Inspection
→ Material Required
→ Customer Approval
→ Additional Order Line
→ Payment if required
→ Use
→ Proof
→ Completion
```

## SC-03 Partner merchant sparepart

```text
Order
→ Inspection
→ Material Required
→ Worker Partner Search
→ Recommendation
→ Customer Approval
→ Product Order
→ Merchant
→ Fulfillment
→ Shipping
→ Delivery
→ Worker
→ Use
→ Service Completion
```

## SC-04 Customer self-purchase

```text
Inspection
→ Sparepart Recommendation
→ Customer chooses self purchase
→ Product Order
→ Payment
→ Shipping
→ Worker
→ Use
```

## SC-05 Customer rejects provider sparepart

```text
Recommendation
→ Reject
→ Service continues if possible
OR
→ Service blocked / alternate resolution
```

## SC-06 Customer rejects partner product

```text
Recommendation
→ Reject
→ Alternative recommendation / self purchase / service hold
```

## SC-07 Partner store unavailable

```text
Selected Merchant
→ Unavailable
→ Alternative Merchant
→ Customer re-confirmation
```

## SC-08 Price changed

```text
Recommendation
→ Price Changed
→ Customer notified
→ Re-confirm
```

## SC-09 Product damaged

```text
Shipment Delivered
→ Damaged
→ Return / Replacement
→ Service waiting if mandatory
```

## SC-10 Wrong product

```text
Delivered
→ Worker inspection
→ Wrong product
→ Return / Replacement
```

## SC-11 Shipment delayed

```text
Shipped
→ Delayed
→ Worker waiting
→ Customer notified
→ Service At Risk / Waiting
```

## SC-12 Provider partnership

```text
Provider
→ Search Merchant
→ Request
→ Merchant Accept
→ Active Partner
```

## SC-13 Affiliate attribution

```text
Worker Recommendation
→ Customer Approval
→ Product Order
→ Attribution Created
→ Affiliate Points Eligible
```

## SC-14 Affiliate cancellation

```text
Affiliate Order
→ Cancelled
→ Attribution outcome recalculated by policy
```

## SC-15 Affiliate return/refund

```text
Affiliate Order
→ Return
→ Refund
→ Affiliate outcome recalculated by policy
```

## SC-16 No Provider sparepart + no Partner sparepart

```text
Need Part
→ Provider unavailable
→ Partner unavailable
→ Customer self-purchase / alternative / service hold
```

## SC-17 Customer already owns sparepart

```text
Need Part
→ Customer provides part
→ Worker verifies
→ Customer approval if needed
→ Use
→ Proof
```

## SC-18 Worker unavailable

Existing Provider reassignment flow remains authoritative.

## SC-19 Payment failed

```text
Payment
→ FAILED
→ Retry / Change Method
```

## SC-20 Additional payment failed

```text
Sparepart Approved
→ Additional Payment Required
→ FAILED
→ Retry
→ Service remains in allowed state
```

---

# 71. AUTOMATED TEST REQUIREMENTS

Create/run a dedicated verification suite for this role-flow revision.

Minimum:

### TEST-ROLE-01
Customer booking appears in Provider.

### TEST-ROLE-02
Accepted booking creates Service Order.

### TEST-ROLE-03
Service Order appears consistently to Customer/Provider.

### TEST-ROLE-04
Provider can issue official quotation only for eligible context-bound Service Order (no orphan quotation; standard field price adjustments are prepared by Worker post-diagnosis).

### TEST-ROLE-05
Worker assignment reaches Worker.

### TEST-ROLE-06
Worker sees only assigned job context.

### TEST-ROLE-07
AI recommendation does not mutate Order.

### TEST-ROLE-08
Provider-owned material is not added before confirmation.

### TEST-ROLE-09
Provider-owned material becomes Order line only after required confirmation.

### TEST-ROLE-10
Additional payment is required when applicable.

### TEST-ROLE-11
Partner Merchant visibility is scoped to Provider partnership.

### TEST-ROLE-12
Worker can search Partner Merchant.

### TEST-ROLE-13
Worker can recommend compatible product.

### TEST-ROLE-14
Customer receives recommendation.

### TEST-ROLE-15
Customer rejection prevents Product Order creation.

### TEST-ROLE-16
Customer confirmation creates Product Order.

### TEST-ROLE-17
Product Order links back to Service Order.

### TEST-ROLE-18
Merchant sees Affiliate Order.

### TEST-ROLE-19
Merchant sees Provider/Worker attribution.

### TEST-ROLE-20
Affiliate attribution is unique.

### TEST-ROLE-21
Affiliate points are not awarded before eligible event.

### TEST-ROLE-22
Affiliate return outcome is handled by policy.

### TEST-ROLE-23
Fulfillment updates propagate.

### TEST-ROLE-24
Shipping updates propagate.

### TEST-ROLE-25
Customer timeline updates from domain events.

### TEST-ROLE-26
Worker sees shipment status.

### TEST-ROLE-27
Worker records material used.

### TEST-ROLE-28
Service Order uses material relation.

### TEST-ROLE-29
No Provider inventory mutation is attempted.

### TEST-ROLE-30
No duplicate Product Order is created from repeated recommendation.

### TEST-ROLE-31
Price change requires re-confirmation.

### TEST-ROLE-32
Unavailable product requires alternative confirmation.

### TEST-ROLE-33
Worker cannot purchase on behalf of Customer without confirmation.

### TEST-ROLE-34
Customer can see payment state.

### TEST-ROLE-35
Customer can see receipt/payment result where applicable.

### TEST-ROLE-36
Customer can access Proof.

### TEST-ROLE-37
Customer can confirm completion.

### TEST-ROLE-38
Customer can report issue.

### TEST-ROLE-39
Provider can see worker execution changes.

### TEST-ROLE-40
Worker cannot access Provider business controls.

---

# 72. BROWSER WALKTHROUGH REQUIREMENT

Run real browser sessions for:

## Customer

```text
Login
→ Browse Service
→ Book
→ View Order
→ View Pricing/Quotation
→ Payment
→ View Worker
→ Tracking
→ Sparepart Recommendation
→ Approve/Reject
→ Product Order
→ Timeline
→ Proof
→ Confirmation
→ Rating
```

## Provider

```text
Login
→ Dashboard
→ Booking
→ Order
→ Quotation
→ Assign Worker
→ Partner Store
→ Partner Detail
→ Active Partnership
→ Service Order
→ Material context
```

## Worker

```text
Login
→ Assigned Job
→ Inspection
→ Sparepart Required
→ Provider Material
OR
Partner Store
→ Product Search
→ Recommendation
→ Customer Approval
→ Shipment Timeline
→ Material Received
→ Material Used
→ Proof
→ Completion Submission
```

## Merchant

```text
Login
→ Orders
→ Affiliate Filter
→ Affiliate Order
→ Attribution Detail
→ Fulfillment
→ Shipping
→ Delivery
```

---

# 73. FORENSIC UI SWEEP

Look specifically for:

- Provider Inventory menu still visible
- Provider warehouse card still visible
- Worker inventory controls
- Worker price editing
- Worker quotation creation without authority
- Worker one-click customer purchase
- Customer missing recommendation
- Customer missing approval
- Customer missing shipment timeline
- Merchant missing affiliate source
- Merchant duplicate order page
- Product Order without Service Order context
- Service Order with fake product line
- stale timeline
- fake tracking
- fake availability
- silent product substitution
- silent price change
- dead CTA
- dead route
- missing status
- missing error state
- missing loading state

---

# 74. DATA INTEGRITY CHECK

For one canonical scenario, verify identifiers:

```text
Booking ID
Service Order ID
Worker Assignment ID
Sparepart Requirement ID
Recommendation ID
Product Order ID
Fulfillment ID
Shipment ID
Attribution ID
```

Relations must be traceable.

Example:

```text
SRV-001
  ├── BKG-001
  ├── JOB-001
  ├── SPR-001
  ├── REC-001
  └── PRD-001
        ├── FUL-001
        ├── SHP-001
        └── AFF-001
```

Do not use string labels as the only relationship.

---

# 75. FINAL ACCEPTANCE MATRIX

| Area | Acceptance Requirement | Status |
|---|---|---|
| Provider Inventory | Removed from Service Provider UI | [ ] |
| Provider Partnership | Store partnership available | [ ] |
| Worker Partner Search | Available in assigned job context | [ ] |
| Worker Recommendation | Works with customer confirmation | [ ] |
| Provider-Owned Sparepart | Added only after actual need + approval | [ ] |
| Customer Recommendation | Visible in Service Order | [ ] |
| Customer Timeline | Sparepart timeline visible | [ ] |
| Customer Self-Purchase | Supported | [ ] |
| Product Order Relation | Linked to Service Order | [ ] |
| Merchant Affiliate Orders | Same Order Engine + filter/tab | [ ] |
| Attribution | Provider + Worker traceable | [ ] |
| Affiliate Points | Policy-driven and event-based | [ ] |
| Fulfillment | Reuses #25 | [ ] |
| Shipping | Reuses #26 | [ ] |
| Return | Reuses #27 | [ ] |
| Payment | No silent amount change | [ ] |
| RBAC | Correct role boundaries | [ ] |
| Notification | Critical events covered | [ ] |
| Timeline | Domain-event driven | [ ] |
| Responsive | 360–1536 tested | [ ] |
| Accessibility | Keyboard/focus/reduced motion | [ ] |
| 12 Layers | Fully reviewed | [ ] |
| Regression | M0–M11 pass | [ ] |

---

# 76. REGRESSION AGAINST EXISTING MILESTONES

## M0–M3

- [ ] Design system intact.
- [ ] Repository architecture intact.
- [ ] Mock fixture engine remains deterministic.

## M4 Customer

- [ ] Discovery intact.
- [ ] Booking intact.
- [ ] Service Order intact.
- [ ] Customer navigation intact.

## M5 Provider

- [ ] Service management intact.
- [ ] Booking management intact.
- [ ] Quotation intact.
- [ ] Worker assignment intact.

## M6 Worker

- [ ] Assigned Jobs intact.
- [ ] Execution intact.
- [ ] Tracking intact.
- [ ] Proof intact.

## M7 Support

- [ ] Complaint escalation intact.

## M8 Finance

- [ ] Payment intact.
- [ ] Additional payment routed correctly.
- [ ] Refund remains Finance/#27 controlled.

## M9 Merchant/Supplier

- [ ] Merchant direct orders intact.
- [ ] Affiliate order does not break direct order.
- [ ] Inventory authority remains Merchant/Supplier.
- [ ] Fulfillment intact.
- [ ] Shipping intact.
- [ ] Returns intact.

## M10 Admin

- [ ] Admin can inspect relevant service/product/order context.
- [ ] Admin remains operational, not partner inventory owner.

## M11 CEO

- [ ] Analytics can reflect service/product orders.
- [ ] Policy governance remains separate.
- [ ] Affiliate policy/points, if introduced, remain policy-driven.

---

# 77. FINAL TODO DISCIPLINE

This document is a role-flow revision execution tracker.

Before implementation:

```text
All items = [ ]
```

Only mark an item `[x]` after:

1. actual implementation
2. browser verification where UI is involved
3. domain/data verification
4. permission verification
5. regression verification

Never mark a checkbox because:

- file exists
- route exists
- component exists
- test fixture exists

---

# 78. FINAL LOCK CONDITION

This role-flow revision can be marked COMPLETE only if:

```text
Customer ✅
Provider Jasa ✅
Worker ✅
Merchant/Toko ✅
        ↓
Cross-role flow ✅
        ↓
Sparepart sourcing ✅
        ↓
Service + Product Integration ✅
        ↓
Affiliate attribution ✅
        ↓
Payment integrity ✅
        ↓
Fulfillment / Shipping ✅
        ↓
Return ✅
        ↓
RBAC ✅
        ↓
Navigation ✅
        ↓
12 Layers ✅
        ↓
Regression M0–M11 ✅
```

No unresolved P0/P1 issue may remain.

---

# 79. FINAL REPORT FORMAT

After implementation, create:

```text
SERVIO — ROLE FLOW REVISION FINAL FORENSIC REPORT
```

Required sections:

1. Executive Summary
2. Business Flow Before vs After
3. Provider Changes
4. Worker Changes
5. Customer Changes
6. Merchant Changes
7. Sparepart Flow Matrix
8. Affiliate Flow
9. Customer Service Order Flow
10. Payment Flow
11. Product Order Relation
12. Shipment Timeline
13. RBAC Matrix
14. Navigation Matrix
15. 12-Layer Matrix
16. 11-State Matrix for affected pages
17. Automated Test Results
18. Browser Walkthrough
19. Responsive
20. Accessibility
21. Runtime / Console
22. Regression M0–M11
23. Remaining Gaps
24. Final Status

Use:

PASS / PARTIAL / FAIL

Do not claim COMPLETE if any critical/high blocking issue remains.

---

# 80. FINAL ARCHITECTURE SUMMARY

The intended final flow is:

```text
                         CUSTOMER
                            │
                         BOOKING
                            │
                            ▼
                    SERVICE PROVIDER
                            │
                    ACCEPT / QUOTATION
                            │
                            ▼
                      SERVICE ORDER
                            │
                    INSPECTION / DIAGNOSIS
                            │
                     SPAREPART REQUIRED
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
   PROVIDER-OWNED     PARTNER MERCHANT   CUSTOMER SELF-BUY
       PART                 PRODUCT            PRODUCT
          │                 │                 │
          │                 ▼                 ▼
          │          PRODUCT ORDER       PRODUCT ORDER
          │                 │                 │
          │          FULFILLMENT          FULFILLMENT
          │                 │                 │
          │             SHIPPING             │
          │                 │                 │
          └─────────────────┼─────────────────┘
                            ▼
                         WORKER
                            │
                         USE PART
                            │
                        EXECUTION
                            │
                           PROOF
                            │
                    CUSTOMER CONFIRMATION
                            │
                        COMPLETION
                            │
                 RATING / WARRANTY / HISTORY
```

For partner merchant recommendation:

```text
Provider Partnership
        ↓
Worker accesses authorized partner stores
        ↓
Product Recommendation
        ↓
Customer Confirmation
        ↓
Product Order
        ↓
Merchant
        ↓
Fulfillment
        ↓
Shipping
        ↓
Worker / Service Site
```

Affiliate attribution:

```text
Provider + Worker Recommendation
        ↓
Customer-approved Product Order
        ↓
Affiliate Attribution
        ↓
Eligible Affiliate Points
```

The core principle remains:

```text
SERVICE ORDER ≠ PRODUCT ORDER

PROVIDER-OWNED MATERIAL
≠ MERCHANT INVENTORY

RECOMMENDATION
≠ CUSTOMER APPROVAL

CUSTOMER APPROVAL
≠ PAYMENT SUCCESS

FULFILLMENT
≠ SHIPPING

RETURN
≠ REFUND
```

---

# 81. STATUS — LOCKED SPECIFICATION / IMPLEMENTATION PENDING

```text
BUSINESS DECISIONS        🔒 LOCKED
SCREEN CONTRACT            🔒 LOCKED
FLOW SEQUENCE              🔒 LOCKED
ROLE BOUNDARIES            🔒 LOCKED
DATA RELATIONS             🔒 LOCKED
UI REQUIREMENTS            🔒 LOCKED
12-LAYER REQUIREMENTS      🔒 LOCKED

IMPLEMENTATION
────────────────────────────
Provider Jasa     ⬜
Worker            ⬜
Customer          ⬜
Merchant/Toko     ⬜
Cross-role        ⬜
Affiliate         ⬜
Sparepart Flow    ⬜
Payment           ⬜
Shipping          ⬜
12 Layers         ⬜
Regression        ⬜
Final Forensic    ⬜
────────────────────────────
READY             ⬜
```

**SPECIFICATION IS LOCKED. IMPLEMENTATION IS NOT CONSIDERED COMPLETE UNTIL EVERY APPLICABLE `[ ]` IS VERIFIED AND THEN CHANGED TO `[x]` BY THE IMPLEMENTER/AI.**

The implementer must not leave the defined business flow, must not invent new business behavior, and must not declare the revision ready before real browser verification and forensic validation are complete.
