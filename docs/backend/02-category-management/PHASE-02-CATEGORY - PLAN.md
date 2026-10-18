# SERVIO — PHASE 02
# CATEGORY MANAGEMENT
## SOURCE OF TRUTH — LOCKED SCOPE & RECONCILED ENHANCEMENTS

**Status:** RECONCILED & LOCKED (Post-Implementation Enhancements)  
**Phase:** 02 — Category Management  
**Domain:** Category & Subcategory Taxonomy Governance & Discovery  
**Architecture:** Next.js 16 (App Router / RoleContext) → Laravel REST API (category-service) → MySQL Localhost (`servio_category_db`)

---

## 1. TUJUAN

Phase 02 bertanggung jawab atas struktur taksonomi resmi SERVIO serta penyediaan kontrak data klasifikasi untuk seluruh platform:

```text
MASTER KATEGORI
├── PRODUK
│   └── CATEGORY
│       └── SUBCATEGORY
│
└── JASA
    └── CATEGORY
        └── SUBCATEGORY
```

Scope:
- Master Category (Root PRODUK & JASA — Immutable)
- Category & Subcategory CRUD, Concurrency Locking (`lock_version`), dan Sanitasi
- Hierarchy & Effective Active Status Integrity (`effective_active`)
- Status Lifecycle: ACTIVE, INACTIVE (Preserved), dan Guarded Hard Delete
- Segmented Status Filter (Semua, Aktif, Nonaktif) pada Admin & CEO Governance
- Reaktivasi Instan item nonaktif via Toggle Switch
- Form Validasi Guarded Hard Delete (Reason min. 5 karakter & konfirmasi ketik nama)
- In-App Asynchronous Data Refresh (tanpa reload browser)
- Category Request/Suggestion Lifecycle (Mitra Provider, Merchant, Supplier)
- Integrasi Filter Penemuan Publik (Public Discovery Filter) untuk Tamu (Guest) & Pelanggan (Customer):
  - Multi-select Kategori & Subkategori
  - Filter Independen Berdasarkan Merek / Brand (Cross-Category)
  - Sinkronisasi URL Query String
- Role & Permission Enforcement (Admin, CEO, Provider, Merchant, Supplier, Customer, Guest)
- Audit Logging & Outbox Event Emission

---

## 2. BOUNDARY WAJIB

Phase 02 **TIDAK** membahas atau memiliki kepemilikan langsung atas entitas transaksional:

- Product Catalog
- Merchant Product
- Product Variant
- Product Price
- Product Stock
- Supplier Product
- Product Compatibility
- Canonical Service
- Provider Service Offering
- Service Pricing
- Service Availability
- Booking
- Technician Assignment
- Diagnosis
- Work Evidence
- Order
- Checkout
- Payment
- Escrow
- Refund
- Warranty
- Affiliate
- Support/Dispute
- Notification
- Analytics

Jika pembahasan membutuhkan domain tersebut, pembahasan berhenti pada boundary Category dan dilanjutkan pada phase masing-masing.

---

# 3. STRUKTUR CATEGORY

## 3.1 Master Category

Master Category adalah root hierarchy dan hanya memiliki dua nilai tetap:

```text
PRODUK
JASA
```

Master Category bukan CRUD bebas.

## 3.2 Category

Category adalah child langsung dari Master Category.

```text
PRODUK
├── Elektronik
├── Otomotif
└── Rumah Tangga

JASA
├── Rumah Tangga
├── Otomotif
└── Elektronik
```

Setiap Category wajib memiliki tepat satu Master Category.

## 3.3 Subcategory

Subcategory adalah child langsung dari Category.

```text
PRODUK
└── Elektronik
    ├── Peralatan Pendingin
    └── Aksesoris

JASA
└── Rumah Tangga
    ├── Perawatan AC
    └── Kebersihan
```

Setiap Subcategory wajib memiliki tepat satu Category.

---

# 4. OWNERSHIP

**ADMIN_OPERATIONS** adalah operational owner Category.

Admin bertanggung jawab atas:
- Membuat Category
- Membuat Subcategory
- Edit
- Activate
- Deactivate
- Menjaga hierarchy
- Mencegah duplicate
- Meninjau request/suggestion
- Membuat struktur resmi secara manual
- Audit aktivitas Category

**CEO_PRODUCT_OWNER** berperan sebagai oversight/governance, bukan operator CRUD harian.

Role lain hanya membaca, memilih, atau mengirim suggestion sesuai kewenangannya.

---

# 5. ROLE DAN AKSES

| Role | Akses | Tanggung Jawab |
|---|---|---|
| ADMIN_OPERATIONS | Full operational | CRUD Category/Subcategory, status toggle (Active/Inactive), tab filter status (Semua/Aktif/Nonaktif), guarded hard delete form, review suggestion, in-app data refresh |
| CEO_PRODUCT_OWNER | Oversight & Governance | Melihat dan mengawasi struktur (aktif & nonaktif via tab status), monitoring metrik utilisasi taksonomi, audit review, in-app data refresh (tanpa CRUD operasional) |
| MERCHANT | Read/Select + Suggestion | Melihat kategori PRODUK/JASA aktif, memilih kategori penawaran, mengajukan usulan taksonomi PRODUK |
| SERVICE_PROVIDER | Read/Select + Suggestion | Melihat kategori JASA aktif, memilih subkategori keahlian, mengajukan usulan taksonomi JASA (`/provider/taxonomy-request`) |
| SUPPLIER | Read/Select + Suggestion | Melihat kategori PRODUK aktif, memilih kategori supply, mengajukan usulan taksonomi PRODUK |
| CUSTOMER | Read / Multi-Filter / Discovery | Mengakses katalog publik (`/products`, `/services`), multi-select kategori & subkategori aktif, filter independen berdasarkan merek (brand), sinkronisasi URL |
| GUEST (Tamu Publik) | Read / Multi-Filter / Discovery | Eksplorasi katalog publik tanpa login, multi-select filter kategori, subkategori, dan merek aktif; proteksi ketat isolasi node nonaktif |
| WORKER_TECHNICIAN | Read-only | Membaca referensi taksonomi keahlian bila dibutuhkan |
| CUSTOMER_SUPPORT | Read-only | Membaca taksonomi untuk penanganan tiket dan verifikasi layanan |
| FINANCE_PAYMENT_OPS | Read-only | Membaca referensi pengelompokan komisi/pembayaran bila dibutuhkan |

Role dan permission tetap berasal dari Phase 01 Identity & Access.

---

# 6. DETAIL ROLE

## ADMIN_OPERATIONS

Boleh:
- View tree & flat list taksonomi (PRODUK & JASA).
- Filter Segmented Controls: **Semua**, **Aktif**, dan **Nonaktif** (sehingga data nonaktif tidak hilang dari pengawasan).
- Create Category & Subcategory resmi.
- Edit Nama dan Ikon taksonomi dengan concurrency optimistic locking (`lock_version`).
- Toggle Status: Menonaktifkan (Deactivate) dan Mengaktifkan Kembali (Reactivate) kapan saja via toggle switch.
- Guarded Hard Delete: Menghapus permanen dengan validasi form wajib (alasan min. 5 karakter dan pengetikan konfirmasi nama node).
- In-App Data Refresh: Memperbarui data instan via tombol PageHeader & toolbar tanpa reload browser Chrome.
- Review suggestion mitra: Transisi status `NEW` -> `PROCESSING` -> `APPROVED` / `REJECTED` / `FULFILLED`.
- Membuat struktur resmi secara manual untuk pemenuhan request (`FULFILLED`).
- Melihat audit trail lengkap aktivitas taksonomi.

Tidak boleh:
- Membuat Master Category baru melalui CRUD biasa.
- Membuat Category otomatis dari request mitra.
- Membuat duplicate kategori pada parent yang sama.
- Melakukan bypass hard delete tanpa verifikasi dependensi referensi downstream.

## CEO_PRODUCT_OWNER

Boleh:
- Oversight Mode: Melihat seluruh struktur taksonomi aktif maupun nonaktif melalui segmented controls.
- Memantau Executive KPI Metrics: Total Kategori, Kategori Aktif, Total Subkategori, Subkategori Aktif, dan Tingkat Utilisasi Aktif (%).
- Memantau antrean pengajuan usulan taksonomi mitra platform.
- In-App Data Refresh: Memperbarui data pengawasan kapan saja tanpa reload browser.
- Audit review tata kelola platform.

Tidak boleh:
- Menjadi operator CRUD harian (tidak ada tombol Create, Edit, Toggle, atau Delete pada halaman CEO).

## MERCHANT

Boleh:
- View Category aktif (PRODUK dan JASA).
- Select Category untuk katalog barang dagangan.
- Submit suggestion usulan taksonomi cabang PRODUK.

Tidak boleh CRUD mandiri.

## SERVICE_PROVIDER

Boleh:
- View Category JASA aktif.
- Select subkategori spesialisasi layanan.
- Submit suggestion usulan taksonomi cabang JASA melalui portal pengajuan mandiri (`/provider/taxonomy-request`).
- In-App Data Refresh pada form usulan mitra.

Tidak boleh membuat kategori resmi langsung.

## SUPPLIER

Boleh:
- View Category PRODUK aktif.
- Select kategori suplai barang/material.
- Submit suggestion usulan taksonomi cabang PRODUK.

Tidak boleh membuat kategori resmi langsung.

## CUSTOMER & GUEST (Tamu & Pelanggan Publik)

Boleh:
- Akses halaman katalog produk & layanan publik (`/products`, `/services`).
- **Multi-select Filter Kategori**: Memilih satu atau beberapa kategori sekaligus (OR/IN filtering) untuk membandingkan ragam opsi.
- **Multi-select Filter Subkategori**: Memilih beberapa subkategori sekaligus di bawah kategori yang dipilih.
- **Filter Berdasarkan Merek (Brand) Independen**: Memilih merek (misal: Daikin, Panasonic, Inaba Denko, Motul, Brembo) secara independen tanpa terkunci oleh hierarki kategori tertentu.
- Sinkronisasi URL query parameter untuk kemudahan bookmark dan membagikan tautan pencarian.
- Menggunakan modal pop-up filter responsif (mobile/tablet) dan sidebar filter (desktop).

Tidak boleh:
- Mengakses atau melihat data kategori/subkategori yang berstatus `INACTIVE` (`effective_active = false`).
- Melakukan mutasi atau mengubah struktur taksonomi platform.

## WORKER_TECHNICIAN

Read-only jika diperlukan oleh UI/domain lain.

## CUSTOMER_SUPPORT

Read-only.

## FINANCE_PAYMENT_OPS

Read-only bila dibutuhkan.

---

# 7. BUSINESS FLOW UTAMA

```text
ADMIN_OPERATIONS
      ↓
Category Management
      ↓
Pilih Master Category
      ↓
PRODUK / JASA
      ↓
Create Category
      ↓
Validasi
      ↓
Create Subcategory
      ↓
Validasi
      ↓
ACTIVE
```

---

# 8. FLOW CREATE CATEGORY

```text
ADMIN
  ↓
Category Management
  ↓
Select PRODUK / JASA
  ↓
Create Category
  ↓
Input Name + Description
  ↓
Server Validation
  ↓
Check Parent
  ↓
Check Duplicate
  ↓
Create
  ↓
ACTIVE
  ↓
Audit Log
```

# 9. FLOW CREATE SUBCATEGORY

```text
ADMIN
  ↓
Select Master Category
  ↓
Select Category
  ↓
Create Subcategory
  ↓
Input Name + Description
  ↓
Server Validation
  ↓
Check Parent
  ↓
Check Duplicate
  ↓
Create
  ↓
ACTIVE
  ↓
Audit Log
```

# 10. FLOW EDIT

```text
ADMIN
 ↓
Open Category/Subcategory
 ↓
Edit
 ↓
Server Validation
 ↓
Duplicate Check
 ↓
Save
 ↓
Audit Log
```

Edit tidak boleh menghasilkan hierarchy invalid.

# 11. FLOW ACTIVATE & REAKTIVASI

```text
ADMIN
 ↓
Pilih Tab "Nonaktif" pada Layanan Jasa atau Produk & Barang
 ↓
Klik Switch Toggle (Hijau: "Aktifkan Kembali")
 ↓
Modal Konfirmasi Reaktivasi
 ↓
Validasi Server: Parent Harus ACTIVE
 ↓
Update status -> ACTIVE (effective_active = true)
 ↓
Audit Log & Outbox Event
 ↓
Counter "Nonaktif" Berkurang, Item Kembali ke Tab "Aktif"
```

# 12. FLOW DEACTIVATE

```text
ADMIN
 ↓
Pilih item pada Tab "Aktif"
 ↓
Klik Switch Toggle (Amber: "Nonaktifkan")
 ↓
Modal Konfirmasi Penonaktifan
 ↓
Server Validation & Concurrency Check (If-Match)
 ↓
Update status -> INACTIVE (effective_active = false)
 ↓
Audit Log & Outbox Event
 ↓
Item Masuk ke Tab "Nonaktif" (Tidak Hilang dari Admin / CEO)
Item Otomatis Hilang dari Filter Publik Guest & Customer
```

Deactivation bukan physical deletion.

# 12.1 FLOW GUARDED HARD DELETE (HAPUS PERMANEN)

Sesuai DEC-05, penghapusan permanen hanya boleh dilakukan jika item belum pernah berelasi dengan katalog penawaran atau transaksi:

```text
ADMIN
 ↓
Klik Tombol Hapus (Tempat Sampah)
 ↓
Modal Form Konfirmasi Hard Delete Terbuka
 ↓
Admin Wajib Mengisi Form Validasi:
 - Alasan Penghapusan (textarea, minimal 5 karakter untuk audit)
 - Konfirmasi Pengetikan Nama Node (wajib persis sama)
 ↓
Submit Form
 ↓
Server Guard Validation:
 1. Cek Hierarchy: Node tidak boleh memiliki child subkategori
 2. Cek Referensi: Verifikasi barrier (CATEGORY_REFERENCE_FENCE_ENABLED)
    Memastikan tidak ada product/service offering aktif atau historis
 3. Concurrency Lock: If-Match header wajib cocok
 ↓
Jika Lolos -> Physical Delete Node
Jika Ada Referensi / Fence Blokir -> 409 Conflict / 503 Service Unavailable (Fail-Closed)
 ↓
Audit Log Tersimpan Permanen untuk Bukti Tata Kelola
```

---

# 13. REQUEST / SUGGESTION CATEGORY

Provider, Merchant, atau Supplier boleh mengirim kebutuhan kategori yang belum tersedia.

**Request tidak otomatis membuat Category/Subcategory.**

Flow yang benar:

```text
PROVIDER / MERCHANT / SUPPLIER
            ↓
Submit Request / Suggestion
            ↓
Request tersimpan
            ↓
ADMIN_OPERATIONS Review
            ↓
Admin menentukan struktur
            ↓
ADMIN INPUT MANUAL
            ↓
OFFICIAL CATEGORY
```

Contoh:

```text
Provider
↓
"Membutuhkan kategori layanan perawatan AC"
↓
Admin Review
↓
Admin menentukan:
JASA
└── Rumah Tangga
    └── Perawatan AC
↓
Admin membuat manual
```

Tidak pernah:

```text
Request → Auto Create Category
```

---

# 14. UI ADMIN & DISCOVERY

## 14.1 Admin Taxonomy Governance (`/admin/taxonomy`)

```text
MANAJEMEN KATEGORI DAN SUB KATEGORI              [ ↻ Perbarui Data ]
Kelola kategori & subkategori layanan jasa serta produk & barang resmi platform.

[ 🔧 Layanan Jasa (6) ] [ 📦 Produk & Barang (6) • 1 nonaktif ] [ ✈️ Pengajuan Mitra (2) ] [ 🏷️ Merek (8) ] [ 📋 Audit ]
--------------------------------------------------------------------------------------------------------------------------
[ Kategori Barang (6) | Sub Kategori Barang (12) ]  [ Semua (6) | ● Aktif (5) | ● Nonaktif (1) ]   [ 🔍 Cari nama... ] [ ↻ ] [ + Tambah ]

DAFTAR KATEGORI PRODUK & BARANG:
┌──────────────────────────────┬──────────────────┬──────────────┬──────────┬────────────────────────┐
│ Nama Kategori                │ Kode Taksonomi   │ Sub Terdaftar│ Status   │ Aksi                   │
├──────────────────────────────┼──────────────────┼──────────────┼──────────┼────────────────────────┤
│ 📦 Sparepart Otomotif        │ PROD-OTO-01      │ 4 Subkategori│ Aktif    │ [✏️ Edit] [🟡 Matikan] [🗑️ Hapus] │
│ 📦 Elektronik & Komponen     │ PROD-ELK-01      │ 6 Subkategori│ Aktif    │ [✏️ Edit] [🟡 Matikan] [🗑️ Hapus] │
│ 📦 Material Habis Pakai      │ PROD-MAT-01      │ 2 Subkategori│ Nonaktif │ [✏️ Edit] [🟢 Aktifkan][🗑️ Hapus] │
│    (Disembunyikan dr publik) │                  │              │ (Amber)  │                        │
└──────────────────────────────┴──────────────────┴──────────────┴──────────┴────────────────────────┘
```

Fitur Utama:
1. **Segmented Controls Status**: Tombol tab *Semua*, *Aktif*, dan *Nonaktif* dengan counter badge real-time. Data yang dinonaktifkan tidak hilang dari tampilan, melainkan tersaring rapi di tab Nonaktif.
2. **Reaktivasi Instan**: Tombol switch pada baris nonaktif berubah menjadi ikon hijau (*Aktifkan Kembali*) yang mengembalikan status ke ACTIVE hanya dengan 1 kali klik konfirmasi.
3. **In-App Data Refresh**: Tombol *Perbarui Data* di PageHeader dan ikon ↻ di toolbar tabel memanggil API secara asynchronous dengan spinning animation dan toast pemberitahuan tanpa reload halaman Chrome.

## 14.2 Guarded Hard Delete Modal Form

```text
┌─────────────────────────────────────────────────────────────┐
│ Form Konfirmasi Hapus Kategori                              │
├─────────────────────────────────────────────────────────────┤
│ ⚠️ Tindakan Permanen (Hard Delete)                          │
│ Menghapus permanen kategori: Material Habis Pakai           │
│ Pastikan tidak ada child subkategori atau transaksi terkait │
│                                                             │
│ Alasan Penghapusan *                                        │
│ [ Kategori dialihkan ke subkategori lain...               ] │
│ (Wajib diisi minimal 5 karakter untuk audit governance)     │
│                                                             │
│ Konfirmasi Pengetikan Nama Kategori *                       │
│ Ketik "Material Habis Pakai" untuk konfirmasi:              │
│ [ Material Habis Pakai___________________________________ ] │
│                                                             │
│                                    [ Batal ] [ Hapus Permanen ] │
└─────────────────────────────────────────────────────────────┘
```

## 14.3 Tree View & Subkategori Berbasis Kategori Induk

```text
PRODUK & BARANG
├── Sparepart Otomotif (Kategori Aktif)
│   ├── Filter Oli Mesin (Subkategori Aktif)
│   └── Kampas Rem (Subkategori Aktif)
└── Material Habis Pakai (Kategori Nonaktif - Disembunyikan)
    └── Isolasi Pipa (Subkategori Nonaktif)

LAYANAN JASA
├── Perawatan AC & Pendingin (Kategori Aktif)
│   ├── Cuci AC Split (Subkategori Aktif)
│   └── Isi Freon R32/R410 (Subkategori Aktif)
└── Otomotif & Kendaraan (Kategori Aktif)
    └── Tune Up Mesin (Subkategori Aktif)
```

## 14.4 CEO Governance UI (`/ceo/taxonomy`)

Prinsip DEC-13 (Oversight Mode):
- Menampilkan Executive KPI Cards: Total Kategori, Kategori Aktif, Total Subkategori, Subkategori Aktif, Tingkat Utilisasi Aktif (%), dan Antrean Usulan Mitra.
- Memiliki Segmented Controls Tab Status (Semua, Aktif, Nonaktif) yang sinkron dengan Admin.
- Read-Only Enforcement: Tidak ada tombol tambah, edit, switch toggle, atau hapus permanen.
- Dilengkapi tombol *Perbarui Data* in-app.

## 14.5 Portal Usulan Kategori Mitra (`/provider/taxonomy-request`)

- Form mandiri untuk Mitra Jasa mengusulkan kategori/subkategori JASA baru jika ruang lingkup keahliannya belum terdaftar resmi.
- Disertai tabel riwayat usulan pribadi beserta status review (`NEW`, `PROCESSING`, `APPROVED`, `REJECTED`, `FULFILLED`).
- Dilengkapi tombol *Perbarui Data* mandiri.

## 14.6 UI Filter Katalog Tamu (Guest) & Pelanggan (Customer) (`/products`, `/services`)

```text
MODAL / SIDEBAR FILTER PRODUK & LAYANAN:

[ Reset Filter ]                                 [ Terapkan (3) ]
-----------------------------------------------------------------
KATEGORI (Multi-select):
 [✓] Elektronik & Komponen (14)
 [✓] Sparepart Otomotif (22)
 [ ] Bangunan & Konstruksi (8)

SUB KATEGORI TERKAIT (Multi-select):
 Di bawah Elektronik & Komponen:
   [✓] Kapasitor AC (6)
   [ ] Pipa Tembaga (8)
 Di bawah Sparepart Otomotif:
   [✓] Kampas Rem (12)
   [ ] Filter Oli (10)

FILTER BERDASARKAN MEREK (Independen - Multi-select):
 [ Daikin ✓ ]  [ Panasonic ✓ ]  [ Inaba Denko ]  [ Motul ✓ ]  [ Brembo ]

RENTANG HARGA:
 [ Rp 10.000       ]  s/d  [ Rp 1.500.000     ]

RATING ULASAN:
 [ ★ 4.5 ke atas ]
-----------------------------------------------------------------
URL Parameter: /products?categories=elk,oto&subcategories=kap,kmp&brands=daikin,panasonic,motul
```

Karakteristik Filter Publik:
1. **Multi-select Kategori & Subkategori**: Pengguna dapat mencentang lebih dari satu kategori dan beberapa subkategori sekaligus.
2. **Filter Merek Independen**: Merek dapat dipilih bebas lintas kategori tanpa terkunci oleh hierarki kategori tertentu.
3. **Isolasi Node Nonaktif**: Tamu dan pelanggan dijamin 100% tidak pernah melihat atau dapat memfilter node taksonomi berstatus `INACTIVE`.

---

# 15. UI REQUEST / SUGGESTION

```text
CATEGORY REQUEST

Request Type
[ New Category / New Subcategory ]

Branch
[ PRODUK / JASA ]

Suggested Name
[________________]

Reason
[________________]

Additional Information
[________________]

[Submit Request]
```

Request hanya menjadi input/referensi Admin.

---

# 16. STATUS

Minimal:

```text
ACTIVE
INACTIVE
```

ACTIVE:
- tampil
- dapat dipilih untuk penggunaan baru

INACTIVE:
- tidak dapat dipilih untuk penggunaan baru
- tetap tersimpan
- tidak otomatis dihapus

Perilaku terhadap entity downstream akibat inactive ditentukan oleh domain downstream, bukan Phase 02.

---

# 17. BUSINESS RULES — MASTER

**BR-MASTER-001** Master Category hanya PRODUK dan JASA.

**BR-MASTER-002** Admin tidak dapat membuat Master Category baru melalui CRUD.

**BR-MASTER-003** Master Category adalah root hierarchy.

**BR-MASTER-004** Tidak boleh ada Category tanpa Master Category.

---

# 18. BUSINESS RULES — CATEGORY

**BR-CAT-001** Setiap Category wajib memiliki tepat satu Master Category.

**BR-CAT-002** Category hanya boleh berada di bawah PRODUK atau JASA.

**BR-CAT-003** Name wajib diisi.

**BR-CAT-004** Validasi wajib dilakukan server-side.

**BR-CAT-005** Duplicate Category pada parent yang sama dilarang.

Contoh tidak valid:

```text
PRODUK
├── Elektronik
└── Elektronik
```

**BR-CAT-006** Nama sama pada branch berbeda boleh jika memang diperlukan:

```text
PRODUK → Elektronik
JASA   → Elektronik
```

Keduanya berbeda karena parent berbeda.

---

# 19. BUSINESS RULES — SUBCATEGORY

**BR-SUB-001** Setiap Subcategory wajib memiliki tepat satu Category.

**BR-SUB-002** Subcategory tidak boleh langsung berada di bawah Master Category.

Salah:

```text
PRODUK
└── Peralatan Pendingin
```

Benar:

```text
PRODUK
└── Elektronik
    └── Peralatan Pendingin
```

**BR-SUB-003** Name wajib diisi.

**BR-SUB-004** Server-side validation wajib.

**BR-SUB-005** Duplicate Subcategory pada Category yang sama dilarang.

---

# 20. BUSINESS RULES — STATUS

**BR-STATUS-001** Category baru default ACTIVE.

**BR-STATUS-002** Category INACTIVE tidak dapat dipilih untuk penggunaan baru.

**BR-STATUS-003** Subcategory INACTIVE tidak dapat dipilih untuk penggunaan baru.

**BR-STATUS-004** Deactivate tidak menghapus data.

**BR-STATUS-005** Menonaktifkan Category tidak otomatis menghapus child.

**BR-STATUS-006** Domain downstream bertanggung jawab atas perilaku entity miliknya ketika referensi Category menjadi inactive.

**BR-STATUS-007** Panel Admin & CEO wajib menyediakan Segmented Controls Tab Status (`Semua`, `Aktif`, `Nonaktif`) agar data nonaktif tetap dapat dipantau dan tidak hilang dari antarmuka tata kelola platform.

**BR-STATUS-008** Item nonaktif wajib dapat diaktifkan kembali (`Reactivated`) ke status `ACTIVE` oleh Admin secara langsung melalui toggle switch selama parent node-nya berstatus `ACTIVE`.

**BR-STATUS-009** Form Hard Delete wajib memvalidasi input alasan penghapusan (minimal 5 karakter) dan input konfirmasi pengetikan nama node yang persis sama sebelum request penghapusan permanen dikirim ke backend.

---

# 20.1 BUSINESS RULES — DISCOVERY FILTER (GUEST & CUSTOMER)

**BR-DISC-001** Katalog penemuan publik (`/products`, `/services`) untuk Tamu (Guest) dan Pelanggan (Customer) wajib mendukung Multi-select Kategori dan Multi-select Subkategori secara fleksibel (logika pencarian OR/IN).

**BR-DISC-002** Filter Berdasarkan Merek (Brand) bersifat independen (cross-category) dan multi-select, tidak boleh terkunci atau disembunyikan oleh hierarki kategori tertentu.

**BR-DISC-003** Node taksonomi berstatus `INACTIVE` dilarang keras bocor, ditampilkan, atau dapat dipilih oleh Guest maupun Customer di katalog penemuan publik (`effective_active = false`).

**BR-DISC-004** Filter discovery wajib mendukung sinkronisasi URL query string (deep-linking, bookmarking, dan sharing parameter pencarian).

---

# 20.2 BUSINESS RULES — ASYNCHRONOUS UI REFRESH

**BR-UI-001** Seluruh portal taksonomi (Admin `/admin/taxonomy`, CEO `/ceo/taxonomy`, dan Provider `/provider/taxonomy-request`) wajib menyediakan tombol Refresh Data asynchronous untuk memanggil ulang API live tanpa me-reload seluruh halaman browser.

---

# 21. BUSINESS RULES — PERMISSION

**BR-PERM-001** Hanya ADMIN_OPERATIONS yang memiliki operational CRUD.

**BR-PERM-002** CEO_PRODUCT_OWNER memiliki oversight.

**BR-PERM-003** Role lain tidak dapat CRUD.

**BR-PERM-004** Permission divalidasi server-side.

**BR-PERM-005** Frontend bukan security boundary.

---

# 22. BUSINESS RULES — REQUEST

**BR-REQ-001** Request bukan Category.

**BR-REQ-002** Request bukan Subcategory.

**BR-REQ-003** Request tidak otomatis membuat Category.

**BR-REQ-004** Request tidak otomatis membuat Subcategory.

**BR-REQ-005** Admin wajib melakukan review.

**BR-REQ-006** Admin menentukan struktur resmi.

**BR-REQ-007** Category resmi hanya dibuat oleh Admin.

**BR-REQ-008** Request dapat ditolak tanpa membuat Category.

---

# 23. SERVER-SIDE VALIDATION

Laravel wajib memvalidasi ulang:

1. Authentication.
2. Account status.
3. Role/permission.
4. Master Category.
5. Parent Category.
6. Parent status.
7. Name.
8. Duplicate.
9. Status transition.
10. Audit log.

---

# 24. DUPLICATE PREVENTION

Category:

```text
unique(parent_master_category_id, normalized_name)
```

Subcategory:

```text
unique(parent_category_id, normalized_name)
```

Normalisasi minimal:
- trim whitespace
- case normalization
- penanganan spasi ganda

Sehingga:

```text
Elektronik
elektronik
 Elektronik
```

tidak menjadi tiga data berbeda pada parent yang sama.

---

# 25. EDGE CASES

## EC-001 — Category tanpa parent

```text
parent = null
→ REJECT
```

## EC-002 — Subcategory tanpa Category

```text
category_id = null
→ REJECT
```

## EC-003 — Duplicate Category

```text
PRODUK → Elektronik
```

jika sudah ada → REJECT.

## EC-004 — Duplicate Subcategory

Jika `Aksesoris` sudah ada di `PRODUK → Elektronik` → REJECT.

## EC-005 — Parent inactive

Membuat child pada parent INACTIVE → REJECT.

## EC-006 — Non-admin create

Provider membuat Category → `403 FORBIDDEN`.

## EC-007 — Non-admin status change

Customer deactivate Category → `403 FORBIDDEN`.

## EC-008 — Request auto-create

Request `"Tambah kategori AC"` tidak boleh otomatis membuat Category.

## EC-009 — Duplicate request

Request yang sama berulang tidak boleh menghasilkan duplicate Category. Sistem dapat menandai request duplicate.

## EC-010 — Inactive parent memiliki child

Default:
- tidak boleh menambah child baru;
- child existing tidak otomatis dihapus;
- penggunaan baru mengikuti validasi active parent.

## EC-011 — Rename menjadi duplicate

Rename menjadi nama yang sudah ada pada parent sama → REJECT.

## EC-012 — Case variation

`elektronik` vs `Elektronik` pada parent sama → REJECT.

## EC-013 — Direct API abuse

User tanpa permission memanggil API langsung → `403 FORBIDDEN`.

## EC-014 — Deactivated Node "Hilang" dari Tampilan

Kategori/subkategori yang dinonaktifkan tidak boleh menghilang dari pengawasan admin. Backend menyediakan `include_inactive=1` dan UI menyediakan Tab **Nonaktif** dengan counter badge.

## EC-015 — Hard Delete Tanpa Alasan / Salah Ketik Nama

Form validasi modal menolak submit jika alasan < 5 karakter atau konfirmasi nama tidak cocok persis dengan nama node target.

## EC-016 — Inactive Node Bocor ke Tamu / Pelanggan Publik

Tamu atau Pelanggan yang mengakses `/products` atau `/services` dilarang melihat node berstatus INACTIVE. Backend query otomatis menyaring `effective_active = true`.

## EC-017 — Stale Data Akibat Concurrency

Jika data taksonomi diperbarui oleh pihak lain, pengguna dapat mengklik tombol "Perbarui Data" in-app tanpa me-reload browser Chrome, dan mutasi yang bentrok dilindungi oleh `If-Match: lock_version` (409 conflict).

---

# 26. AUDIT LOG

Event minimal:

```text
CATEGORY_CREATED
CATEGORY_UPDATED
CATEGORY_ACTIVATED
CATEGORY_DEACTIVATED

SUBCATEGORY_CREATED
SUBCATEGORY_UPDATED
SUBCATEGORY_ACTIVATED
SUBCATEGORY_DEACTIVATED

CATEGORY_REQUEST_CREATED
CATEGORY_REQUEST_REVIEWED
CATEGORY_REQUEST_REJECTED
```

Audit minimal:
- actor
- role
- action
- entity
- entity_id
- old value jika relevan
- new value jika relevan
- timestamp
- reason jika diperlukan

---

# 27. DATA OWNERSHIP

Category domain memiliki ownership terhadap:

```text
Master Category
Category
Subcategory
Category Request / Suggestion
Category Audit
```

Category domain **tidak** memiliki:

```text
Product
Product Variant
Product Price
Product Stock
Service
Provider Offering
Booking
Order
Payment
```

Domain lain hanya mengonsumsi Category sebagai reference/master data.

---

# 28. INTEGRATION PRINCIPLE

Domain lain boleh meminta informasi seperti:

```text
"Apakah Category X masih ACTIVE?"
```

Category domain hanya menjawab status/struktur Category.

Category domain tidak mengambil alih business logic Product, Service, Order, atau domain lain.

---

# 29. API RESPONSIBILITY

Phase 02 tidak menerapkan:

```text
one feature = one API
```

API berbasis resource/domain.

Contoh resource:

```text
/categories
/categories/{id}

/subcategories
/subcategories/{id}

/category-requests
/category-requests/{id}
```

Detail endpoint final dikunci pada phase API Architecture setelah domain-domain bisnis selesai.

---

# 30. MATRIX AKSES

| Role | View | Create | Edit | Activate/Deactivate | Suggestion |
|---|---:|---:|---:|---:|---:|
| ADMIN_OPERATIONS | ✓ | ✓ | ✓ | ✓ | Review |
| CEO_PRODUCT_OWNER | ✓ | ✗ | ✗ | ✗ | Oversight |
| MERCHANT | ✓ | ✗ | ✗ | ✗ | ✓ |
| SERVICE_PROVIDER | ✓ | ✗ | ✗ | ✗ | ✓ |
| SUPPLIER | ✓ | ✗ | ✗ | ✗ | ✓ |
| CUSTOMER | ✓ | ✗ | ✗ | ✗ | ✗ |
| WORKER_TECHNICIAN | ✓ | ✗ | ✗ | ✗ | ✗ |
| CUSTOMER_SUPPORT | ✓ | ✗ | ✗ | ✗ | ✗ |
| FINANCE_PAYMENT_OPS | ✓ | ✗ | ✗ | ✗ | ✗ |

---

# 31. ACCEPTANCE CRITERIA

## Structure
- [ ] Master Category hanya PRODUK dan JASA.
- [ ] Category hanya berada di bawah Master Category.
- [ ] Subcategory hanya berada di bawah Category.
- [ ] Tidak ada hierarchy lain.

## Admin
- [ ] Admin dapat melihat tree.
- [ ] Admin dapat create Category.
- [ ] Admin dapat create Subcategory.
- [ ] Admin dapat edit.
- [ ] Admin dapat activate/deactivate.
- [ ] Admin dapat review suggestion.
- [ ] Admin membuat Category resmi secara manual.

## Non-admin
- [ ] Non-admin tidak dapat CRUD.
- [ ] Customer dapat read.
- [ ] Merchant dapat read.
- [ ] Provider dapat read JASA.
- [ ] Supplier dapat read PRODUK.
- [ ] Role lainnya read sesuai kebutuhan.

## Validation
- [ ] Parent valid.
- [ ] Duplicate ditolak.
- [ ] Parent inactive tidak menerima child baru.
- [ ] Server-side validation aktif.
- [ ] Unauthorized API ditolak.

## Request
- [ ] Provider/Merchant/Supplier dapat mengirim suggestion.
- [ ] Suggestion tidak auto-create.
- [ ] Admin melakukan review.
- [ ] Admin menentukan struktur.
- [ ] Admin input manual.

## Audit
- [ ] Create tercatat.
- [ ] Update tercatat.
- [ ] Activate tercatat.
- [ ] Deactivate tercatat.
- [ ] Request tercatat.
- [ ] Actor dan timestamp tercatat.

---

# 32. FINAL BUSINESS FLOW

```text
                     SERVIO CATEGORY
                           │
                           ▼
                  MASTER KATEGORI
                    /                              /                               ▼               ▼
              PRODUK             JASA
                │                 │
                ▼                 ▼
             CATEGORY          CATEGORY
                │                 │
                ▼                 ▼
          SUBCATEGORY        SUBCATEGORY
```

Ownership:

```text
                    ADMIN_OPERATIONS
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
           PRODUK                      JASA
              │                         │
          CATEGORY                  CATEGORY
              │                         │
        SUBCATEGORY              SUBCATEGORY
```

Suggestion:

```text
Provider / Merchant / Supplier
            │
            ▼
     REQUEST / SUGGESTION
            │
            ▼
     ADMIN_OPERATIONS
            │
            ▼
   ADMIN MENENTUKAN STRUKTUR
            │
            ▼
      ADMIN INPUT MANUAL
            │
            ▼
    OFFICIAL CATEGORY DATA
```

---

# 33. FINAL BOUNDARY LOCK

> **Phase 02 menentukan bagaimana SERVIO mengklasifikasikan PRODUK dan JASA melalui Master Category → Category → Subcategory. Phase 02 tidak menentukan apa yang dijual, apa layanan yang diberikan, bagaimana produk ditawarkan, bagaimana jasa dipesan, bagaimana order diproses, maupun bagaimana transaksi dibayar.**

Urutan phase:

```text
PHASE 01 — Identity & Access
        ↓
PHASE 02 — Category
        ↓
PHASE 03 — Product / Catalog
        ↓
PHASE 04 — Service / Jasa
        ↓
PHASE 05 — Order
        ↓
PHASE 06 — Finance & Payment
        ↓
...
```

## PHASE 02 = CATEGORY ONLY

**Tidak ada Product Catalog, Booking, atau Order di dalam Phase 02.**
