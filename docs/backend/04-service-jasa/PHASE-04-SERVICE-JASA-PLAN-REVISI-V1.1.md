# PHASE 04 — SERVICE / JASA
## SERVIO — Source of Truth / Business Specification

**Status:** REVISED DRAFT — MENUNGGU REVIEW & ACC PENGGUNA (belum LOCKED)  
**Revisi:** V1.1 — Penyelarasan frontend Provider, katalog publik, Admin; publikasi langsung dan tanpa radius layanan  
**Scope:** Service / Jasa Catalog Domain (Modul 04)  
**Dependency:** Modul 01 Identity & Access; Modul 02 Category Management  
**Reference UX:** Modul 03 Product Catalog (pola UX, bukan kepemilikan data)  
**Downstream:** Modul 05B Order Jasa (bukan Modul 05A Order Barang)  
**Stack Context:** Next.js 16 / React 19 / TypeScript → Laravel Microservice → MySQL localhost (database independen)  
**Status implementasi:** Dokumentasi bisnis; tidak membuktikan backend/frontend telah terhubung

---

# 0. Register Keputusan & Aturan Revisi (V1.1)

| Kode | Keputusan / klarifikasi pengguna | Konsekuensi untuk Modul 04 |
|---|---|---|
| **DEC04-01 — PUBLIKASI LANGSUNG** | Provider dapat menerbitkan Service Offering miliknya secara langsung, **tanpa approval/perizinan publikasi per jasa oleh Admin**. | Saat Provider mengubah offering valid menjadi `ACTIVE`, penawaran langsung eligible tampil di Customer/Guest; tidak ada `PENDING_APPROVAL`, antrian approval offering, atau tombol Approve/Reject offering di Admin. |
| **DEC04-02 — TANPA RADIUS** | **Hapus konfigurasi radius layanan berbasis km/meter.** | Tidak ada input radius, maksimum jarak perjalanan, slider radius, proximity/distance badge jasa, atau penyaringan kilometer sebagai syarat publikasi/penemuan. |
| **DEC04-03 — LOKASI SEKOTA** | Tetap pertahankan pengalaman katalog berdasarkan **kota aktif Customer/Guest** dan wilayah kota yang dilayani offering. | Pencocokan menggunakan identitas kota administratif (`city_code`/ID kota stabil) dalam daftar kota cakupan penawaran, **bukan jarak km dari kantor Provider**, worker GPS, atau geofence radius. Detail referensi wilayah administratif perlu divalidasi pada spesifikasi teknis. |
| **DEC04-04 — TIGA PERMUKAAN KATALOG** | Penawaran Provider harus dapat tampil pada katalog Provider, katalog publik Customer/Guest, dan tampilan pengawasan katalog jasa Admin. | Satu domain offering milik Modul 04; view berbeda sesuai role, tidak menyalin offering ke database Admin/Identity/Order. |
| **DEC04-05 — OPERASIONAL SERVIS TETAP** | Tampilan Admin `/admin/services` yang saat ini memuat order/teknisi/escrow tidak dibuang; ditata ulang agar katalog jasa juga dapat dipantau. | Bedakan subview **Katalog Jasa (Modul 04)** dan **Operasional Pesanan (Modul 05B)**; rute/tab implementasi mengikuti verifikasi frontend; Phase 04 tidak membangun backend order. |
| **DEC04-06 — DETAIL & TOKO** | Katalog publik mencakup Detail Layanan Jasa dan tombol kunjungan profil usaha/Provider beserta daftar jasa aktifnya. | Gunakan `Service Detail` dan `Provider Service Storefront`; profil usaha publik bersumber dari Identity 01, bukan entitas toko baru di Modul 04. |

**Prioritas keputusan:** ketentuan V1.1 di atas menggantikan teks V1.0 yang bertentangan tentang persetujuan offering, radius, penyajian katalog, atau pemisahan Admin. Ketentuan lama lainnya tetap berlaku. **Review & ACC pengguna masih diperlukan untuk mengunci hasil revisi.** Istilah survei/diagnosa pada penawaran adalah konfigurasi biaya jasa katalog; pelaksanaan diagnosis tetap di Modul 05B.

**Batas perubahan terhadap modul sebelumnya:** tidak mengubah kontrak FINAL Identity 01, Category 02, maupun Product 03; hanya menggunakan kontrak internal yang tersedia dan menandai dependensi lain sebagai pending. Root Category adalah **`JASA`**, bukan `SERVICE`. Default autentikasi browser merujuk Sanctum SPA stateful session milik Identity 01.

---

# 1. Purpose

Phase 04 mengelola seluruh fondasi bisnis dan katalog jasa SERVIO: jenis jasa yang dikenali platform, jasa yang ditawarkan Provider, informasi jasa, pricing, survey, estimasi durasi, **cakupan kota administratif tanpa radius jarak**, capability yang dibutuhkan, media, katalog jasa Customer/Guest, katalog Provider, dashboard pengawasan katalog Admin, detail jasa, dan storefront Provider.

Phase 04 **tidak mengelola transaksi atau pelaksanaan pekerjaan**. Setelah Customer memilih jasa dan melanjutkan ke transaksi, proses berpindah ke Modul 05B — Order Jasa.

Prinsip utama:

> **Phase 04 menjawab “jasa apa yang ditawarkan, oleh siapa, dengan karakteristik dan ketentuan apa?”**  
> **Modul 05B menjawab “kapan jasa dipesan, bagaimana booking-nya, siapa yang mengerjakan, dan bagaimana pengerjaannya berlangsung?”**

---

# 2. Boundary Lock

## 2.1 In Scope

1. Service Definition / Canonical Service
2. Provider Service Offering
3. Service information
4. Provider-specific display name and description
5. Service media/gallery
6. Pricing model
7. Price range
8. Free service
9. After-survey pricing
10. Survey configuration
11. Survey requirement
12. Survey fee
13. Estimated duration
14. Service coverage **berbasis daftar kota tanpa radius kilometer**
15. Service capability requirement
16. Service requirements
17. Service lifecycle/status
18. Service catalog publik (Customer & Guest) dan katalog Provider
19. Service card
20. Service detail
21. Provider service storefront
22. Related services
23. Services from the same Provider
24. Provider ownership and authorization
25. Validation and business rules
26. Admin service-offering catalog monitoring (read-only untuk offering Provider)
27. Public city-based discovery, tanpa distance/radius
28. Direct Provider publication of valid ACTIVE offerings

## 2.2 Out of Scope

- User account creation, authentication, OTP, role assignment, Provider membership
- Worker account/invitation
- Product catalog, variant, stock, pricing
- Supplier Product / B2B procurement
- Cart
- Order
- Booking
- Schedule execution
- Technician assignment / dispatch
- Service execution
- Diagnosis execution
- AI diagnosis/recommendation execution
- Sparepart purchase
- Payment / Payment Gateway / Escrow / Balance / Settlement / Payout
- Refund / Warranty / Return / Claim
- Rating and Review
- Support / Dispute
- Notification delivery
- CEO Analytics
- Radius layanan berbasis kilometer/meter, proximity badge/km, dan kalkulasi jarak tempuh
- Persetujuan Admin atas publikasi tiap offering Provider (tidak ada review queue/approval status offering)

---

# 3. Dependencies

## 3.1 Phase 01 — Identity & Access

Phase 04 consumes authenticated user, account status, SERVICE_PROVIDER role, Provider organization/context, membership/ownership context, permission, and relevant verification state.

Phase 04 does not modify Identity data.

Kontrak publik profil usaha (nama, logo, alamat/kota kantor bila layak ditampilkan) dikonsumsi dari Identity melalui API internal yang terautentikasi. Identitas kota Customer, bila berasal dari alamat tersimpan, tetap dimiliki Identity. Guest boleh memilih kota secara manual tanpa login. **Alamat kantor Provider berbeda dari kota yang dicakup tiap offering**; keduanya tidak boleh disamakan.

## 3.2 Phase 02 — Category

Service Offering references:

- Master Category = `JASA` (kode resmi Category Service, bukan `SERVICE`)
- Category
- Subcategory

Provider cannot create or modify category structure from Phase 04.

## 3.3 Modul 05B — Order Jasa

Modul 05B mengonsumsi penawaran jasa `ACTIVE` dan eligible untuk membuat Order Jasa, Booking, penjadwalan, assignment, serta execution. Modul 05A adalah Order Barang dan bukan konsumen utama katalog jasa.

Phase 04 provides catalog/configuration; Modul 05B owns transaction and execution lifecycle. Perubahan harga/cakupan/ketentuan katalog berlaku untuk transaksi baru; transaksi yang sudah terbentuk memakai snapshot sesuai Modul 05B.

---

# 4. Core Business Model

```text
SERVICE DEFINITION
        ↓
PROVIDER
        ↓
SERVICE OFFERING
        ↓
SERVICE CATALOG
        ↓
CUSTOMER
        ↓
PHASE 05B — ORDER JASA + BOOKING
```

A Service Definition is canonical.

A Service Offering is a Provider's actual offering of that canonical service.

Example:

```text
Service Definition:
Perbaikan AC

Provider A:
Perbaikan AC Rumah
Rp100.000–Rp300.000

Provider B:
Service AC Tidak Dingin
Rp125.000–Rp250.000

Provider C:
Perbaikan AC
Harga setelah survey
```

All three offerings can reference the same canonical Service Definition.

---

# 5. Service Definition

## 5.1 Definition

Service Definition is the canonical definition of a type of service recognized by SERVIO.

Example:

```text
ID          : SRV-001
Name        : Perbaikan AC
Master      : JASA
Category    : Pemeliharaan
Subcategory : AC
Status      : ACTIVE
```

## 5.2 Owner

Operational owner: **ADMIN_OPERATIONS**.

CEO provides governance/oversight but does not perform routine catalog CRUD.

## 5.3 Responsibilities

Service Definition provides:

- canonical service name
- canonical category reference
- canonical subcategory reference
- canonical description where applicable
- status
- optional canonical media
- capability template/reference where applicable

It must NOT store Provider-specific price, price range, survey fee, coverage, Provider availability, Worker assignment, Provider-specific gallery, or Provider-specific business terms.

## 5.4 Provider Cannot Create Canonical Services

Provider selects an existing **ACTIVE Service Definition** owned by Admin. Setelah memilih kategori dan subkategori `JASA`, form perlu menampilkan pilihan canonical service yang sesuai; `Nama Layanan Service` adalah **display name offering**, bukan tindakan membuat canonical service baru. Perbedaan form screenshot saat ini ditangani sebagai penyelarasan UI yang tidak mengubah ownership.

If a needed service is missing:

```text
Provider Request
      ↓
Admin Review
      ↓
Admin Decision
      ↓
Admin Creates Canonical Service
```

There is no automatic canonical service creation.

---

# 6. Service Offering

Service Offering is a Provider-specific commercial/service presentation based on a canonical Service Definition.

Example:

```text
Provider       : ACME Teknik
Service        : Perbaikan AC
Display Name   : Perbaikan AC Rumah
Price          : Rp100.000–Rp300.000
Survey         : Required
Survey Fee     : Rp50.000
Duration       : 1–2 hours
Coverage       : Bandung
Status         : ACTIVE
```

**Tidak ada status persetujuan Admin pada Offering.** Offering `ACTIVE` yang telah lolos seluruh syarat publikasi langsung tersedia di katalog publik (sesuai kota aktif pengguna).

A Service Offering belongs to exactly one Provider.

Provider can customize:

- display name
- description
- included items
- exclusions
- requirements
- media
- price
- survey configuration
- estimated duration
- coverage
- capability requirements
- active/inactive status

Provider cannot modify canonical Service Definition, category hierarchy, another Provider's offering, or global Capability Master without governance.

---

# 7. Service Definition vs Service Offering

| Aspect | Service Definition | Service Offering |
|---|---|---|
| Purpose | Canonical service concept | Provider's actual offering |
| Owner | Admin Operations | Provider |
| Name | Canonical | Provider display name allowed |
| Category | Reference | Reference |
| Price | No | Yes |
| Price range | No | Yes |
| Survey | Template/reference if applicable | Yes |
| Coverage | No | Yes |
| Duration | Canonical guideline if applicable | Provider estimate |
| Media | Optional canonical media | Provider media |
| Worker assignment | No | No |
| Booking | No | No |
| Order | No | No |

---

# 8. Service Pricing

Pricing is Provider-specific.

## 8.1 Pricing Models

```text
FREE
RANGE
AFTER_SURVEY
```

## 8.2 FREE

```text
price_model = FREE
```

Price range fields are null/not applicable.

Customer display:

> Gratis

## 8.3 RANGE

```text
price_model = RANGE
min_price = 100000
max_price = 300000
currency = IDR
```

Customer display:

> Rp100.000 – Rp300.000

Rules:

```text
min_price >= 0
max_price >= min_price
```

If minimum equals maximum, UI may display a single price.

## 8.4 AFTER_SURVEY

```text
price_model = AFTER_SURVEY
```

Customer display:

> Harga ditentukan setelah survey

This is not equivalent to FREE and must not be represented as zero.

## 8.5 Price Snapshot Boundary

Phase 04 owns current catalog pricing.

Once an order is created, transaction-specific price must be snapshotted oleh Modul 05B, sementara pembayaran yang relevan dikelola Modul 06 sesuai kontrak transaksi masing-masing.

A later Provider price change must not silently rewrite a historical order.

---

# 9. Survey Configuration

Survey is separate from service price.

A survey may be:

1. Not available
2. Available + optional
3. Available + required

If available, fee can be:

- Free
- Paid

## 9.1 Valid Combinations

### No Survey

```text
availability = NOT_AVAILABLE
```

### Optional Free

```text
availability = AVAILABLE
requirement = OPTIONAL
fee = FREE
```

### Required Free

```text
availability = AVAILABLE
requirement = REQUIRED
fee = FREE
```

### Optional Paid

```text
availability = AVAILABLE
requirement = OPTIONAL
fee = PAID
survey_fee > 0
```

### Required Paid

```text
availability = AVAILABLE
requirement = REQUIRED
fee = PAID
survey_fee > 0
```

## 9.2 After-Survey Rule

If:

```text
price_model = AFTER_SURVEY
```

then survey must be:

```text
availability = AVAILABLE
requirement = REQUIRED
```

Otherwise configuration is invalid.

## 9.3 Survey Fee

Survey fee is not the same as service price.

Example:

```text
Service price:
Rp100.000–Rp300.000

Survey:
Rp50.000
```

Rp50.000 is the survey fee, not the service fee.

## 9.4 Transaction Boundary

Phase 04 defines survey policy and fee.

When Customer actually purchases a paid survey, resulting transaction belongs to Modul 05B and payment belongs to Phase 06.

---

# 10. Duration

Service duration is an estimate, not a booking schedule.

Recommended structure:

```text
duration_min
duration_max
duration_unit
```

Example:

> 1–2 jam

Rules:

- duration must be positive when supplied
- minimum cannot exceed maximum
- duration does not reserve a time slot
- exact appointment time belongs to Modul 05B

---

# 11. Service Coverage — Kota Administratif, TANPA Radius

**Keputusan V1.1:** coverage merupakan **daftar satu atau lebih kota/kabupaten administratif** yang dilayani oleh *masing-masing* Provider Service Offering. Pengguna tidak mengisi radius dalam km atau meter. Coverage dapat berbeda antarlayanan dari Provider yang sama. Area hanya menjawab apakah jasa **melayani lokasi target**, bukan berapa kilometer jarak Provider/Worker ke alamat Customer.

Model bisnis (konseptual; physical schema dan format identifier ditentukan setelah ACC):

```text
Provider Offering: Cuci AC Inverter
Kota cakupan    : Kota Bandung, Kota Cimahi
Kota aktif user : Kota Cimahi
Eligibility     : TAMPIL (kota aktif terdapat dalam kota cakupan)

Kota aktif user : Kota Jakarta Selatan
Eligibility     : TIDAK DITAMPILKAN pada penelusuran sekota
```

- Gunakan **kode/ID kota administratif yang stabil** untuk penyamaan data; nama kota bersifat display. Kabupaten dan kota tidak boleh disamakan hanya karena nama menyerupai; nomenklatur administratif perlu distandardisasi saat teknis.
- Katalog Guest dan Customer memperlihatkan penawaran yang `ACTIVE`, Provider/Category/canonical valid, dan **mencakup kota yang dipilih**. Tidak ada filter jarak km ataupun angka `2.4 km` dari pola Product.
- Di header katalog publik tampil kontrol **`Lokasi layanan: [Kota dipilih] [Ubah]`**. Customer dapat memakai kota alamat layanan yang dipilih dari address book Modul 01 atau memilih kota secara manual; Guest memilih kota tanpa kewajiban login.
- Jika belum ada kota dipilih, tampilkan pemilih kota; jangan mengasumsikan kota dari IP, GPS, atau membuat hasil katalog 'sekota' palsu. Jika tidak ada penawaran pada kota itu, tampilkan empty state dan opsi mengganti kota.
- Profil Provider dapat menampilkan kota kantor dari Identity, tetapi kelayakan layanan dihitung berdasarkan **cakupan kota pada offering**, bukan kota kantor.
- Aturan lokasi berlaku juga pada direct URL detail, daftar jasa serupa, dan daftar jasa storefront bila berinteraksi dalam konteks lokasi Customer/Guest. Halaman detail yang dibuka dari tautan langsung dapat menampilkan identitas jasa publik dengan status **'di luar cakupan lokasi Anda'** dan CTA order nonaktif; jangan menjanjikan pemesanan jika lokasi tidak eligible.

## 11.1 Tanpa Radius, GPS, atau Worker Matching

Tidak ada `service_radius_km`, `max_distance_km`, proximity/distance badge jasa, hitungan jarak geografis, slider radius, geofence, atau biaya tambahan otomatis berbasis kilometer di Modul 04. Estimasi jarak tempuh bukan atribut katalog. Modul 05B memutuskan apakah ada Worker yang cocok, jadwal tersedia, dan order boleh diproses; tidak memakai radius catalog yang sudah dihapus.

## 11.2 Perubahan Kota Cakupan

Perubahan daftar kota layanan hanya memengaruhi discovery/eligibility **transaksi baru**. Tidak menghapus, membatalkan, atau menulis ulang order historis di Modul 05B. Offering `ACTIVE` harus memiliki cakupan kota valid; jika kota dihapus hingga kosong, sistem harus mencegah invalidasi diam-diam (misal: Provider perlu menonaktifkan offering dahulu, lalu memperbaiki cakupan).

## 11.3 Batas Harga Perjalanan

Tidak ada komponen atau input biaya perjalanan berdasarkan radius/jarak pada katalog Modul 04. Jika kelak diperlukan ongkos kunjungan atau biaya lintas wilayah, itu memerlukan keputusan bisnis terpisah; **bukan disisipkan sebagai fitur radius**.

---

# 12. Capability

Capability represents the skills/competencies required to perform a service.

Example:

```text
Service:
Perbaikan AC

Required Capability:
- AC Repair
- Refrigeration
- Electrical Basic
```

## 12.1 Capability Master

A global Capability Master should exist.

Operational governance belongs to Admin Operations.

Provider selects approved capabilities.

Provider should not create arbitrary global capability names for matching.

## 12.2 Service Requirement

Service Offering can define capabilities required for execution.

```text
Service Offering
      ↓
Required Capability
├── AC Repair
└── Refrigeration
```

## 12.3 Worker Capability

Worker capability is distinct from Worker Identity.

Phase 01 answers:

> Who is the Worker?

Phase 04/operational service domain answers:

> What capability is relevant to service execution?

Modul 05B answers:

> Which Worker is actually assigned?

## 12.4 Matching Boundary

Phase 04 defines required capability.

Modul 05B consumes it for eligibility/matching/assignment.

Phase 04 must not directly assign Worker IDs to bookings.

---

# 13. Service Requirements

Provider can define customer-facing requirements.

Examples:

- Customer must provide access to the AC unit.
- Electrical access must be available.
- Parking access may be needed.
- Customer must secure pets before technician arrival.

Requirements are configuration/information data and do not replace booking validation in Modul 05B.

---

# 14. Service Media

Unlike Product, Service does not have Variant Media.

```text
SERVICE OFFERING
    ↓
SERVICE MEDIA
```

Media can show:

- service activity
- work result
- equipment
- tools
- service environment
- illustrative service image

Recommended attributes:

```text
media_id
service_offering_id
file_url
media_type
sort_order
is_primary
status
```

Rules:

- At least one primary image is recommended/required for ACTIVE catalog visibility.
- Media must belong to the same Service Offering.
- Provider cannot attach media to another Provider's offering.
- Delete/reorder requires ownership validation.
- No variant_id is required.
- Identity/profile photos are not owned by Service domain.

---

# 15. Service Status

Canonical Service Definition:

```text
DRAFT
ACTIVE
INACTIVE
```

Provider Service Offering:

```text
DRAFT
ACTIVE
INACTIVE
```

DRAFT: editable, not publicly available for new transactions.

ACTIVE: visible in customer/guest catalog **langsung setelah Provider berhasil mengaktifkan**, tanpa menunggu persetujuan Admin, selama Provider/canonical/taksonomi valid dan lokasi user dilayani. Eligible untuk transaksi baru di Modul 05B, tunduk pada validasi order Modul 05B.

INACTIVE: unavailable for new transactions; historical references remain valid.

---

# 16. Activation Requirements

A Provider Service Offering can become ACTIVE only if required information is valid.

Minimum validation:

- valid Provider
- valid canonical Service Definition
- valid active Service Category/Subcategory
- valid display name
- valid service information
- valid media/primary image
- valid pricing model
- valid survey configuration
- valid **daftar kota coverage** (tanpa konfigurasi radius/km)
- valid capability configuration where required

Optional fields should not become accidental blockers. Survey is not mandatory for every service.

---

# 17. Business Flow — Admin: Master Jasa dan Monitoring Offering

Admin memiliki **dua tanggung jawab yang berbeda**, bukan satu alur approval seluruh jasa Provider.

**A. Tata kelola canonical service (milik Admin):**

```text
Admin Login → Service Definition Management
→ Pilih kategori dan subkategori pada branch JASA (Modul 02)
→ Create/Edit canonical Service Definition
→ Validate → DRAFT/ACTIVE/INACTIVE → tersedia sebagai referensi Provider
```

Admin berwenang membuat/mengubah/mengaktifkan/menonaktifkan Service Definition, mereview permintaan canonical service yang belum tersedia, serta mengelola Capability Master. Hal ini **bukan persetujuan publikasi Offering Provider**.

**B. Monitoring katalog jasa Provider (read-only untuk offering):**

```text
Admin Login → Sidebar 'Operasional Servis'
→ Tab/Subview 'Katalog Jasa'
→ Daftar offering seluruh Provider yang memang tersimpan
→ Cari, filter Provider / kategori / subkategori / status / kota layanan
→ Lihat nama, media, harga, survey, status, Provider, cakupan kota
→ Buka Detail Jasa / profil Provider / audit yang diizinkan
```

- Katalog Offering Admin dapat menampilkan `DRAFT`, `ACTIVE`, `INACTIVE` untuk pengawasan berizin; publik hanya melihat yang eligible `ACTIVE`.
- **Tidak ada tombol `Approve`, `Reject`, atau `Pending Approval` untuk menawarkan jasa.** Admin tidak boleh diam-diam mengubah harga, biaya survei, atau status offering milik Provider, kecuali kelak ada keputusan dan kontrak governance yang disetujui.
- Screenshot `/admin/services` saat ini menampilkan *Monitoring Operasional Layanan Jasa*: ID order, pelanggan, teknisi, jadwal, escrow, siklus pengerjaan, dan aksi intervensi. Data itu **tetap dipertahankan** sebagai subview **'Operasional Pesanan' milik Modul 05B/06 sesuai domain**, bukan dipindahkan menjadi tabel katalog Modul 04.
- Boleh menggunakan dua tab atau submenu dalam sidebar yang sama: `Katalog Jasa` dan `Operasional Pesanan`. Bentuk rute/tabs akhir ditentukan setelah audit source frontend, jangan menganggap desain screenshot sudah otomatis terintegrasi.
- CEO dapat oversight read-only sesuai permission Identity; bukan operator CRUD harian offering Provider.

---

# 18. Business Flow — Provider

```text
Provider Login
    ↓
My Services
    ↓
Add Service
    ↓
Select Canonical Service
    ↓
Configure Display Name
    ↓
Configure Description
    ↓
Upload Media
    ↓
Configure Pricing
    ↓
Configure Survey
    ↓
Configure Duration
    ↓
Configure Coverage
    ↓
Configure Capability
    ↓
Configure Requirements
    ↓
Preview
    ↓
Validation
    ↓
Save Draft
    ↓
Activate
    ↓
Published in Service Catalog **langsung tanpa approval Admin**
```

Setiap perubahan `DRAFT/INACTIVE → ACTIVE` wajib diperiksa backend terhadap canonical service aktif, kategori/subkategori efektif aktif, organisasi Provider yang eligible, harga/survei, media utama, informasi jasa, dan daftar kota layanan. Setelah lolos, publikasi berlaku langsung; tidak ada workflow antrian persetujuan offering.

---

# 19. Business Flow — Customer

```text
Customer
    ↓
Service Catalog
    ↓
Search / Browse / Filter
    ↓
Service Card
    ↓
Service Detail
    ↓
View Provider
    ↓
Review Price / Survey / Coverage / Duration
    ↓
Continue
    ↓
PHASE 05B — Order Jasa + Booking
```

Phase 04 stops before order/booking creation. Hanya penawaran eligible di kota aktif Customer/Guest yang ditampilkan; pemesanan sesungguhnya tetap Modul 05B.

---

# 20. Provider UI — Manajemen dan Form Tambah Layanan

## 20.1 My Services / Katalog Provider

Tampilkan seluruh offering **milik Provider aktif** (termasuk `DRAFT`, `ACTIVE`, `INACTIVE`) dengan primary image, display name, canonical service, kategori/subkategori, pricing label, survey, daftar kota layanan, status, serta aksi lihat detail, edit, aktifkan/nonaktifkan. Provider tidak melihat/mengubah offering organisasi lain.

## 20.2 Form Tambah Layanan — Penyelarasan dengan Screenshot

Urutan field yang terlihat pada screenshot adalah **dasar UI existing**. Komponen berikut wajib diselaraskan dengan aturan Planning 04; langkah lain yang tidak terlihat dalam screenshot harus diverifikasi pada kode frontend sebelum dinyatakan hilang.

| Langkah UI | Data/aturan bisnis | Sumber/pemilik |
|---|---|---|
| 1. **Pilih Kategori Layanan** | Hanya kategori `JASA` yang `effective_active = true`. Loading/empty/error bukan data placeholder permanen. | Category Service 02 |
| 2. **Pilih Subkategori** | Subkategori wajib milik kategori yang dipilih dan efektif aktif. | Category Service 02 |
| 2A. **Pilih Jenis Jasa Resmi** | Pilih Service Definition `ACTIVE` yang sesuai kategori/subkategori; **field ini perlu disejajarkan dengan UI existing**. | Service Service 04 — master dibuat Admin |
| Tautan **Ajukan Subkategori** | Membuka alur pengajuan resmi Category 02; tidak auto-create category. | Category Service 02 |
| 3. **Nama Layanan Service** | Display name penawaran yang dikelola Provider; bukan menambah canonical baru. | Service Service 04 |
| 4. **Deskripsi Layanan** | Penjelasan pekerjaan, batasan, kebutuhan; boleh dilengkapi included/excluded items. | Service Service 04 |
| 5. **Konfigurasi Penawaran Mitra** | Memilih model `FREE`, `RANGE`, atau `AFTER_SURVEY`; harga min/max hanya ketika `RANGE`. | Service Service 04 |
| **Biaya Survei / Diagnosa di Tempat** | Perlu status survei `NOT_AVAILABLE` atau `AVAILABLE`, `OPTIONAL`/`REQUIRED`, serta `FREE`/`PAID` berikut fee yang valid. | Service Service 04 |
| Media/Galeri Jasa | Upload, primary photo, urutan galeri; bukan variant media seperti Product. | Service Service 04 |
| Estimasi Durasi | Perkiraan waktu minimal/maksimal, bukan booking slot. | Service Service 04 |
| **Kota Cakupan Layanan** | Pilih satu atau beberapa kota/kabupaten; **tanpa input radius/km**. | Service Service 04 |
| Capability & Persyaratan | Pilih skill resmi yang relevan dan informasi yang perlu dipenuhi Customer. | Service Service 04 |
| Preview/Save Draft/Activate | Preview; simpan draft; saat Activate tervalidasi langsung publikasi tanpa persetujuan Admin. | Service Service 04 |

## 20.3 Conditional Pricing UI

```text
MODEL HARGA : [GRATIS | RENTANG HARGA | SETELAH SURVEI]
GRATIS      : Label 'Gratis'; kolom min/max tidak dipakai
RENTANG     : Harga Minimum Rp___, Harga Maksimum Rp___
SETELAH SURVEI : Label 'Harga ditentukan setelah survei'; bukan Rp0
```

## 20.4 Conditional Survey UI

```text
SURVEI TERSEDIA? [Tidak | Ya]
Jika Ya → [Opsional | Wajib] dan [Gratis | Berbayar]
Jika Berbayar → Biaya Survei Rp___ (harus > 0)
Jika harga SETELAH SURVEI → survei wajib dan tersedia
```

Harga jasa dan biaya survei harus tetap dipisahkan saat form, preview, detail publik, dan transaksi. Bila layanan tidak memakai survei, jangan menampilkan input fee secara salah.

## 20.5 Perilaku UI

- Tombol `Aktifkan` hanya berhasil jika seluruh activation requirements terpenuhi. Hasil `ACTIVE` langsung mencerminkan perubahan pada publik (tidak perlu `Pending Approval`).
- Tampilkan state `loading`, `empty`, `validation error`, `permission denied`, `save failed`, `success`, dan refresh tanpa reload browser yang tidak perlu.
- Lokasi yang diinput adalah **kota cakupan jasa**, bukan radius dan bukan lokasi GPS Worker.

---

# 21. Customer & Guest UI — Public Service Discovery

## 21.1 Katalog Layanan (`/services` — rute actual perlu diverifikasi)

Customer **dan Guest** dapat membaca katalog jasa publik dan melakukan:

- Memilih kota layanan aktif melalui location chip `📍 Layanan di: [Kota] [Ubah]`. Tidak wajib GPS atau login Guest.
- Search nama jasa, Provider, dan konten yang memang publik.
- Multi-select kategori dan subkategori `JASA` efektif aktif sesuai aturan Category 02; kombinasi filter ditampilkan pada URL agar dapat dibagikan.
- Filter harga (jika model `RANGE`), model `FREE/RANGE/AFTER_SURVEY`, kebutuhan survei, dan Provider jika sesuai UI.
- Filter katalog berdasarkan **kota yang tercantum pada cakupan offering**, bukan alamat kantor Provider dan bukan radius km.
- Melihat **hanya offering yang `ACTIVE`, eligible, serta melayani kota terpilih**. `DRAFT`, `INACTIVE`, canonical/category inactive, Provider ineligible tidak bocor sebagai kartu publik.
- Menampilkan empty state ketika kota belum dipilih (pemilihan kota) atau ketika kota dipilih tetapi tidak memiliki jasa tersedia (ubah kota/reset filter).

**Tidak ada** proximity badge `2,4 km`, filter radius, slider jarak, 'maksimal km', automatic GPS worker matching, slot availability, maupun rating palsu. Brand filter dari Product bukan otomatis atribut filter Service.

## 21.2 Kartu Jasa Publik

Kartu minimal berisi:

1. Primary image jasa.
2. Nama layanan dari offering Provider.
3. Harga yang benar (`Gratis`, `Rp minimum–maksimum`, atau `Harga setelah survei`).
4. Nama Provider dan informasi publik yang aman dari Identity 01.
5. Kota cakupan relevan (misalnya `Melayani Kota Bandung`), bukan jarak km.
6. Informasi survei singkat bila diperlukan.
7. Aksi `Lihat Detail` / `Kunjungi Provider`.

Rating bintang hanya dapat ditampilkan bila sumber Modul 07 nyata tersedia; tidak membuat rating dummy.

## 21.3 Detail Layanan Jasa

Urutan konten yang disarankan:

1. Galeri foto layanan.
2. Nama offering, canonical/Category/Subcategory untuk konteks.
3. Harga dan model harga; harga survei ditampilkan **terpisah**.
4. Identitas Provider publik (nama usaha, logo bila ada, lokasi kantor sebagai informasi, tanpa PII internal).
5. Deskripsi, apa yang termasuk dan dikecualikan.
6. Apakah survei tersedia/wajib/opsional, berbayar/gratis.
7. Estimasi durasi.
8. **Kota/kabupaten yang dilayani (tanpa radius km).**
9. Persyaratan Customer.
10. **Kunjungi Toko/Profil Provider** menuju storefront publik.
11. Jasa serupa serta jasa lain dari Provider yang sama, dibatasi public eligibility dan kota aktif.
12. CTA `Lanjutkan ke Pemesanan` (Modul 05B), hanya aktif jika offering melayani kota Customer dan syarat katalog valid.

Detail boleh terbaca dari direct link saat user berada di luar cakupan, tetapi harus memperlihatkan pesan **'Layanan ini belum tersedia untuk kota yang dipilih'** dan menonaktifkan CTA pesanan baru. Keputusan final booking tetap milik Modul 05B.

## 21.4 Isolasi Guest/Customer/Admin

- Guest: baca katalog dan storefront publik tanpa login; transaksi mengarah ke alur autentikasi/checkout Modul 05B/Identity.
- Customer: baca katalog dan gunakan kota alamat layanan yang aktif; alamat Customer tetap dimiliki Modul 01.
- Admin: membaca seluruh offering yang memiliki izin governance termasuk nonpublik, **melalui view admin berizin**; jangan membuka detail draft lewat public endpoint.

## 21.5 Pola respons UI

Sediakan loading skeleton, keadaan empty, retry untuk kegagalan layanan, perubahan filter tanpa full browser reload, paginasi stabil, dan pesan lokasi belum dipilih. Tidak boleh mengganti data API nyata dengan dummy tanpa penanda jelas.

---

# 22. Provider Storefront / Kunjungi Toko

**Kunjungi Toko** pada konteks jasa bermakna mengunjungi **profil usaha Service Provider**, bukan Merchant Store baru atau Service Provider Identity baru.

Storefront menggabungkan:

- Nama/logo/foto profil usaha dan alamat/kota kantor **yang diizinkan untuk publik** dari Modul 01.
- Informasi ringkas usaha Provider yang layak diumumkan (tanpa dokumen legal mentah/PII).
- Daftar **jasa `ACTIVE` milik Provider** yang memenuhi eligibility publik dan cakupan kota aktif viewer dari Modul 04.
- Pencarian dan filter kategori/subkategori di dalam storefront, pembukaan Service Detail, dan empty state.
- Konteks `Provider berkantor di [kota kantor]` boleh ditampilkan, tetapi **eligibility penawaran tetap berdasarkan coverage city masing-masing jasa**.

Storefront yang kosong tetap dapat dibuka jika kebijakan public-profile Identity mengizinkan, dengan pesan bahwa belum ada jasa tersedia untuk kota dipilih. Jika Provider dinonaktifkan/suspended, katalog penawarannya tidak boleh tampil seolah dapat dipesan. Phase 04 tidak membuat ulang akun Provider, organisasi, alamat legal, atau verifikasi usaha.

---

# 23. Related Services

## 23.1 Similar Services

Rules:

1. active offerings only
2. same canonical Service Definition first where relevant
3. same Subcategory next
4. same Category next
5. exclude current offering
6. same-city coverage/public eligibility tetap diterapkan pada semua hasil
7. no AI required

## 23.2 Other Services from Same Provider

Rules:

1. same Provider
2. active offerings
3. exclude current offering
4. sesuai kota terpilih dan public eligibility, bukan seluruh offering tanpa filter

---

# 24. Business Rules — Ownership

1. Provider can create Service Offerings only for its own Provider context.
2. Provider cannot mutate another Provider's offering.
3. Provider cannot change canonical category structure.
4. Provider cannot change canonical Service Definition.
5. Provider cannot create global Capability Master entries without Admin governance.
6. Service Offering has exactly one owning Provider.
7. A Service Definition can be offered by many Providers.
8. A Provider can offer many Service Definitions.
9. A Provider may have multiple offerings for different services.
10. Duplicate active offerings for the same Provider/canonical service should be prevented unless differentiated packages are explicitly supported.

---

# 25. Business Rules — Category

1. Service Offering must reference SERVICE branch of Phase 02.
2. Product categories cannot be used for Service Offering.
3. Inactive Category/Subcategory cannot be selected for new offerings.
4. Existing offerings are not automatically deleted when a category becomes inactive.
5. Server-side validation must re-check category state.
6. Category creation remains Phase 02.

---

# 26. Business Rules — Pricing

1. FREE does not use price range.
2. RANGE requires min and max.
3. min must be >= 0.
4. max must be >= min.
5. AFTER_SURVEY does not use zero to represent unknown price.
6. AFTER_SURVEY requires survey availability.
7. AFTER_SURVEY requires survey = REQUIRED.
8. Survey fee is independent from service price.
9. Survey fee cannot be negative.
10. Paid survey requires fee > 0.
11. Free survey requires fee = 0/null according to canonical data contract.
12. Pricing changes apply to new catalog transactions according to Modul 05B snapshot rules.
13. Historical order pricing must not silently change.

---

# 27. Business Rules — Survey

1. Survey may be unavailable.
2. Survey may be optional.
3. Survey may be required.
4. Survey may be free.
5. Survey may be paid.
6. Required paid survey must display its fee before transaction.
7. Required survey must be communicated before Customer commits to the relevant transaction.
8. Survey fee must not be mistaken for service fee.
9. Survey configuration must be internally consistent.
10. A service with AFTER_SURVEY pricing cannot have survey unavailable.

---

# 28. Business Rules — Duration

1. Duration is an estimate.
2. Minimum duration cannot exceed maximum duration.
3. Duration cannot be negative or zero where duration is required.
4. Duration does not create a booking slot.
5. Booking schedule belongs to Modul 05B.

---

# 29. Business Rules — Coverage & Discovery Kota (DEC04-02/03)

1. Coverage adalah daftar **kota/kabupaten yang dilayani** tiap Provider Service Offering.
2. Offering `ACTIVE` wajib memiliki minimal satu kode kota cakupan yang valid; struktur referensi kota mengikuti standar yang disepakati pada tahap teknis.
3. Tidak ada konfigurasi radius/km, jarak geografis maksimum, GPS Worker, *distance badge*, atau *radius-based fee*.
4. Kota kantor Provider (Identity 01) tidak otomatis menjadi kota cakupan layanan.
5. Customer dan Guest menentukan kota aktif; katalog menampilkan penawaran eligible yang cakupannya memuat kota itu.
6. Ketika kota belum dipilih, UI meminta pilihan lokasi, bukan mengklaim hasil 'sekota' berdasarkan dugaan lokasi.
7. Perubahan kota cakupan memengaruhi discovery dan transaksi baru; transaksi historis tidak terhapus/berubah.
8. Menonaktifkan offering tidak menghapus coverage maupun histori.
9. Coverage tidak mewakili posisi Worker, tidak menjadwalkan/menugaskan Worker, dan tidak memutuskan availability order; itu milik Modul 05B.
10. Direct link detail jasa di luar cakupan tidak boleh memungkinkan pembuatan order baru.
11. Provider tidak boleh mengosongkan seluruh cakupan pada offering yang masih `ACTIVE` tanpa lebih dahulu menonaktifkannya.

---

# 30. Business Rules — Capability

1. Capability is standardized.
2. Admin governs the global Capability Master.
3. Provider selects approved capabilities.
4. Service Offering can require one or more capabilities.
5. Capability requirement is not Worker assignment.
6. Modul 05B consumes capability requirements for eligibility/assignment.
7. A Worker leaving a Provider does not automatically delete the Service Offering.
8. Lack of eligible Worker is an operational availability problem, not automatic deletion of the Service Offering.

---

# 31. Business Rules — Media

1. Provider owns its offering media.
2. Primary media should exist before public ACTIVE visibility.
3. Media must reference the correct Service Offering.
4. Media cannot reference another Provider's offering.
5. Media order must be deterministic.
6. Deleting all media of an active offering should be blocked or require the offering to become non-public.
7. Media deletion does not delete the Service Offering.

---

# 32. Business Rules — Status

1. DRAFT is not customer-bookable.
2. ACTIVE is publicly discoverable.
3. INACTIVE is unavailable for new transactions.
4. Existing historical transactions remain.
5. Deactivating a service does not delete historical data.
6. Re-activation requires valid current configuration.
7. Provider account suspension may prevent new transactions for its offerings according to Identity/Operations policy.
8. **Langsung publikasi**: transisi offering ke `ACTIVE` oleh Provider yang sah dan lolos validasi tidak memerlukan persetujuan Admin.
9. Tidak ada status `PENDING_ADMIN_APPROVAL`/`UNDER_REVIEW` untuk offering; status canonical Service Definition dan pemeriksaan dokumen legal organisasi adalah proses terpisah.
10. Admin boleh mengatur canonical Service Definition serta Capability Master, tetapi tampilan monitoring offering Provider adalah **read-only** sampai ada keputusan tata kelola baru.
11. Visibility publik tidak semata `status=ACTIVE`; tetap membutuhkan eligibility Provider, canonical, taxonomy, media, pricing/survey, dan kota yang dilayani.

---

# 33. Edge Cases — Canonical Service

### E01 — Provider wants a service that does not exist
Provider submits request/suggestion. Admin reviews and creates canonical service if approved. No automatic creation.

### E02 — Same service name in multiple categories
Admin must resolve canonical placement and prevent ambiguous duplicate structures where policy prohibits them.

### E03 — Canonical Service becomes inactive
Existing Provider Offerings are not hard-deleted. New offerings cannot reference it. Historical references remain.

---

# 34. Edge Cases — Offering

### E04 — Provider creates duplicate offering
Backend should prevent duplicate active offering combinations unless differentiated packages are explicitly supported.

### E05 — Provider deactivates service with existing orders
Offering becomes unavailable for new transactions. Existing orders remain managed by Modul 05B.

### E06 — Provider account becomes inactive
New transaction eligibility may be blocked according to Identity/Operations policy. Historical data remains.

---

# 35. Edge Cases — Pricing

### E07 — min > max
Reject.

### E08 — negative price
Reject.

### E09 — FREE with price values
Normalize/reject according to contract. Canonical state must not contain contradictory values.

### E10 — AFTER_SURVEY without survey
Reject.

### E11 — AFTER_SURVEY + optional survey
Reject.

### E12 — paid survey with zero fee
Reject.

### E13 — free survey with negative fee
Reject.

### E14 — price changed while Customer is viewing
Customer receives current catalog data. Once transaction is created, Modul 05B/06 snapshot rules protect transaction integrity.

---

# 36. Edge Cases — Coverage

### E15 — No coverage
Cannot activate if coverage is mandatory for that service type.

### E16 — Coverage removed after historical order
Historical order is not deleted.

### E17 — Worker is unavailable but service is active
Service Offering remains active. Modul 05B determines operational availability.

### E18 — Customer outside coverage
Offering tidak muncul dalam katalog sekota lokasi tersebut; jika detail dibuka dari tautan langsung, beri informasi tidak tersedia dan nonaktifkan CTA order. Final booking validation belongs to Modul 05B.

### E18A — Guest belum memilih kota
UI meminta user memilih kota terlebih dahulu; tidak menggunakan inferensi lokasi palsu atau fallback radius.

### E18B — Provider kantor beda kota tetapi melayani kota Customer
Jika kode kota Customer termasuk daftar kota coverage offering, penawaran eligible muncul meskipun alamat kantor Provider di kota lain.

### E18C — Provider meminta radius km
Field radius tidak ada pada model/form. Tidak ada kalkulasi maupun filter jarak; admin tidak perlu konfigurasi radius.

---

# 37. Edge Cases — Capability

### E19 — Provider selects a non-existent capability
Reject.

### E20 — Capability master becomes inactive
Existing historical references remain; new configuration should not select inactive capability.

### E21 — No Worker matches capability
Do not delete/deactivate Service Offering automatically. Modul 05B handles assignment/availability.

### E22 — Provider tries to assign a Worker in Phase 04
Not allowed. Worker assignment belongs to Modul 05B.

---

# 38. Edge Cases — Media

### E23 — No primary image
Offering may remain DRAFT but cannot be publicly ACTIVE if primary image is mandatory.

### E24 — Provider uploads media to another Provider
Authorization failure.

### E25 — Provider deletes primary image
System must prevent an ACTIVE offering from becoming publicly invalid, either by requiring replacement or changing status.

---

# 39. Edge Cases — Survey

### E26 — Required paid survey not displayed
Backend/API contract must prevent transaction continuation if the customer has not been informed of the required survey fee.

### E27 — Survey changes from free to paid
New transactions use new configuration; historical transactions retain their transaction snapshot.

### E28 — Survey changes from required to optional
New transactions use the new rule. Existing transaction state is not silently rewritten.

### E29 — Survey removed while related transaction exists
Do not alter existing transaction history. New catalog behavior follows current configuration.

### E30 — Provider langsung mengaktifkan Offering valid
Simpan `ACTIVE`, terapkan public eligibility, dan tampilkan penawaran di katalog sekota tanpa antrian approval Admin. Log audit aktivasi tetap disimpan.

### E31 — Admin membuka daftar Offering
Admin dapat membaca seluruh offering sesuai governance permission, termasuk status draft/inactive, tetapi tidak memperoleh hak edit harga/aktifkan offering milik Provider hanya karena dapat melihatnya.

### E32 — Admin masih memiliki halaman operasional order lama
Tampilan order yang sudah ada tetap berada pada subview terpisah dan memakai backend Modul 05B/06; jangan menyalin order/escrow ke DB Service 04.

### E33 — Canonical, category, atau organisasi menjadi tidak eligible
Offering tersimpan dan histori tetap ada, tetapi tidak tampil sebagai offering yang dapat dipesan publik. Pemulihan visibility mensyaratkan validasi eligibility aktual, bukan approval Admin offering.


---

# 40. Security Boundary

Laravel is the security boundary.

```text
Authentication
    ↓
Account Status
    ↓
Role / Permission
    ↓
Provider Context
    ↓
Ownership
    ↓
Validation
    ↓
Mutation
```

Frontend is never the final authorization layer.

Provider ownership must be checked server-side.

---

# 41. Data Ownership

## Phase 04 owns

- Service Definition management where authorized
- Service Offering
- Provider-specific service information
- Provider-specific pricing
- Survey configuration
- Duration
- Coverage
- Service capability requirements
- Service media
- Service status
- Daftar kota administratif cakupan tiap Service Offering, tanpa radius
- Katalog public discovery/read models dan view pengawasan offering Admin (tanpa data order)

## Phase 04 references

- User/Provider identity
- Provider organization
- Category/Subcategory
- Capability Master
- Worker capability context when required for matching
- Kota aktif Customer / Guest: pilihan kota sesi UI atau referensi alamat layanan dari Identity 01 bila tersedia
- Profil publik Provider dan kota alamat kantor dari Identity 01, tanpa duplikasi source of truth

## Phase 04 does not own

- User account
- Provider authentication
- Worker account
- Product
- Order
- Booking
- Payment
- Refund
- Rating
- Notification
- Radius layanan, GPS dan distance computation
- Approval/penolakan admin untuk publikasi offering
- Order/operational service console yang berisi order/teknisi/escrow

---

# 42. Conceptual Data Contract

## Service Definition

```text
service_definition
- id
- name
- master_category_id
- category_id
- subcategory_id
- canonical_description
- status
- created_at
- updated_at
```

## Service Offering

```text
service_offering
- id
- provider_id
- service_definition_id
- display_name
- description
- included_items
- excluded_items
- requirements
- price_model
- min_price
- max_price
- currency
- survey_availability
- survey_requirement
- survey_fee_model
- survey_fee
- duration_min
- duration_max
- duration_unit
- coverage_cities (daftar ID/kode kota administratif; **tanpa radius**)
- capability_requirements
- status
- created_at
- updated_at
```

## Service Media

```text
service_media
- id
- service_offering_id
- file_url
- media_type
- sort_order
- is_primary
- status
- created_at
```

Ini adalah **kontrak data konseptual** untuk perencanaan, bukan physical schema MySQL final. Rancangan tabel dan migration Laravel untuk database `servio_service_db` akan disusun setelah ACC planning pada tahap 10 komponen Technical Specification. Tidak ada foreign key ke database service lain.

---

# 43. API Responsibility Principle

Do not create one API for every tiny feature.

Use reusable domain resources.

Conceptual examples:

```text
/api/v1/services
/api/v1/services/{id}
/api/v1/provider/services
/api/v1/provider/services/{id}
/api/v1/service-definitions
/api/v1/capabilities
```

Exact endpoint design is postponed until all domains are locked. API untuk public list/detail/storefront, Provider CRUD, Admin governance/read, serta Canonical/Capability tetap domain Service 04 dan digunakan ulang untuk beberapa layar. **Tidak boleh menambah endpoint approval offering** atau endpoint radius. Jika `/admin/services` mempunyai tab order, endpoint order tetap milik Modul 05B bukan Service 04. Akses profil Provider dan kategori memakai API resmi dari Identity/Category, tanpa cross-service SQL/FK.

---

# 44. Customer Discovery Flow

```text
Category
   ↓
Service Catalog
   ↓
Search
   ↓
Filter
   ↓
Service Offering
   ↓
Service Detail
   ↓
Provider Storefront
   ↓
Other Services
   ↓
Continue to Order
```

---

# 45. Provider Management Flow

```text
Provider
   ↓
My Services
   ↓
Create Offering
   ↓
Select Canonical Service
   ↓
Configure
   ├── Information
   ├── Media
   ├── Pricing
   ├── Survey
   ├── Duration
   ├── Coverage Cities (tanpa radius)
   ├── Capability
   └── Requirements
   ↓
Preview
   ↓
Validation
   ↓
Activate
   ↓
Customer Catalog
```

---

# 46. Complete End-to-End Boundary

```text
PHASE 01
Identity
    ↓
PHASE 02
Category
    ↓
PHASE 04
Service Definition
    ↓
Provider Service Offering
    ├── Information
    ├── Media
    ├── Pricing
    ├── Survey
    ├── Duration
    ├── Coverage Cities (tanpa radius)
    ├── Capability
    └── Requirements
    ↓
Service Catalog
    ↓
Customer
    ↓
PHASE 05B
Order Jasa
    ↓
Booking
    ↓
Worker Eligibility
    ↓
Assignment
    ↓
Execution
```

---

# 47. Acceptance Criteria

## Service Definition
- [ ] Admin can create canonical Service Definition.
- [ ] Service Definition belongs to SERVICE category branch.
- [ ] Provider cannot create canonical Service Definition directly.
- [ ] Provider can select canonical Service Definition.

## Service Offering
- [ ] Provider can create own Service Offering.
- [ ] Provider cannot edit another Provider's offering.
- [ ] Offering references exactly one Provider.
- [ ] Offering references valid Service Definition.

## Pricing
- [ ] FREE works correctly.
- [ ] RANGE works correctly.
- [ ] AFTER_SURVEY works correctly.
- [ ] Invalid min/max is rejected.
- [ ] Negative prices are rejected.
- [ ] Unknown price is not represented as zero.

## Survey
- [ ] Survey can be unavailable.
- [ ] Survey can be optional.
- [ ] Survey can be required.
- [ ] Survey can be free.
- [ ] Survey can be paid.
- [ ] AFTER_SURVEY requires required survey.
- [ ] Survey fee is distinct from service price.

## Duration
- [ ] Duration can be represented as a range.
- [ ] Invalid duration range is rejected.
- [ ] Duration does not create booking schedule.

## Coverage & Discovery Kota
- [ ] Provider dapat memilih satu atau lebih kota/kabupaten administratif untuk setiap offering.
- [ ] Tidak ada radius layanan dalam km/meter pada UI, API, database conceptual contract, atau filter publik.
- [ ] Customer/Guest dapat memilih/mengganti kota untuk menemukan jasa sekota.
- [ ] Offering Provider yang berkantor di luar kota pengguna tetap muncul bila secara eksplisit melayani kota tersebut.
- [ ] Guest tanpa kota terpilih mendapat location selector, bukan klaim lokasi otomatis.
- [ ] Kartu/detail tidak menampilkan distance badge jasa.
- [ ] Coverage tidak meng-assign Worker; order historis aman.

## Capability
- [ ] Capability is governed.
- [ ] Provider selects approved capability.
- [ ] Offering can specify required capabilities.
- [ ] Phase 04 does not assign Worker.

## Media
- [ ] Provider can upload service media.
- [ ] Primary media is supported.
- [ ] Ownership is enforced.
- [ ] Invalid cross-provider media mutation is rejected.

## Catalog/UI — Provider, Customer/Guest, Admin
- [ ] Provider mempunyai katalog sendiri (`DRAFT/ACTIVE/INACTIVE`) dan mampu mengelola offering miliknya saja.
- [ ] Form tambah jasa: kategori/subkategori JASA aktif, **pilih canonical service**, nama/description offering, harga, survey, media, durasi, capability/requirements, dan kota cakupan.
- [ ] Provider valid yang mengaktifkan offering langsung mempublikasikannya; **tanpa Admin approval** dan tanpa status `PENDING_APPROVAL` offering.
- [ ] Guest tanpa login dan Customer dapat browse/search/multi-filter kategori/subkategori jasa dan mengganti kota.
- [ ] Kartu jasa menampilkan primary image, nama, harga sesuai model, Provider, dan kota layanan; tidak ada badge km.
- [ ] Service Detail menampilkan gallery, rincian harga vs survey fee, deskripsi, durasi, kota cakupan, persyaratan, jasa serupa, dan CTA yang menghormati kelayakan kota.
- [ ] `Kunjungi Toko/Provider` membuka storefront publik dari identitas Provider + jasa aktif yang eligible.
- [ ] Admin dapat memantau seluruh offering dengan filter Provider, status, kategori, subkategori, kota, dan membuka detail; admin **tidak** approve/reject offering.
- [ ] Area sidebar Admin tetap menjaga halaman monitoring order yang sudah ada sebagai subview Modul 05B, tidak mencampur data order ke Service 04.
- [ ] Customer dapat lanjut ke Modul 05B hanya jika offering eligible; Modul 04 tidak membuat order.
- [ ] Semua view mendukung loading/empty/error/refetch yang benar dan tidak memakai dummy seolah data live.

## Boundary
- [ ] No Booking logic exists in Phase 04.
- [ ] No Order creation logic exists in Phase 04.
- [ ] No Payment logic exists in Phase 04.
- [ ] No Worker assignment logic exists in Phase 04.
- [ ] No Rating/Review ownership exists in Phase 04.

---

# 48. Final Business Definition

> **Phase 04 — Service / Jasa mengelola Service Definition resmi, Provider Service Offering, media, harga (`FREE/RANGE/AFTER_SURVEY`), survei, estimasi durasi, capability, persyaratan, serta daftar kota administratif yang dilayani tanpa radius layanan. Offering valid yang diaktifkan Provider langsung eligible tampil pada katalog Customer/Guest, dapat dipantau Admin, dan ditampilkan pada detail jasa serta storefront Provider tanpa persetujuan publikasi Admin. Lokasi discovery mengacu kota yang dipilih user dan kota cakupan offering, bukan jarak kantor/Worker. Phase 04 tidak membuat order, booking, assignment, eksekusi, pembayaran, atau escrow; seluruh proses transaksional jasa menjadi tanggung jawab Modul 05B (Finance tetap Modul 06).**

---

# 49. Final Boundary Lock

```text
PHASE 04 OWNS
Service Definition
Service Offering
Service Information
Service Media
Pricing
Survey
Duration
Coverage Cities (tanpa radius)
Capability Requirement
Service Requirements
Service Catalog (Customer/Guest + Provider + Admin governance view)
Service Detail & Provider Service Storefront
Direct Publication (tanpa admin approval)
Service Lifecycle
```

```text
PHASE 04 DOES NOT OWN
Order
Booking
Schedule
Worker Assignment
Execution
Diagnosis
AI Execution
Payment
Refund
Warranty
Return
Rating
Review
Notification
Analytics
Service Radius / Proximity Distance
Offering Approval oleh Admin
```

**Status: REVISED DRAFT V1.1 — MENUNGGU REVIEW DAN ACC PENGGUNA. BELUM `PLANNING_LOCKED`.**

**Catatan sinkronisasi sebelum spesifikasi teknis:**

- Konfirmasi tampilan UI aktual untuk opsi memilih *Service Definition* setelah Category/Subcategory (form screenshot belum menampakkan field ini).
- Tentukan format referensi kota administratif yang konsisten lintas Modul 01/04 tanpa cross-DB foreign key; detail implementasinya diputuskan di spesifikasi, bukan diasumsikan tersedia.
- Audit apakah tab/submenu `Katalog Jasa` dan `Operasional Pesanan` sudah ada pada kode Next.js; screenshot saja belum membuktikan.
- Periksa izin governance Admin/CEO dan kesiapan kontrak public Provider profile dari Identity sebelum mengklaim integrasi aktif.
- Keputusan **publikasi langsung tanpa approval Admin** dan **tanpa radius layanan** adalah keputusan bisnis yang telah dinyatakan pengguna dan tidak boleh diabaikan pada revisi berikutnya.
