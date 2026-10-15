# SERVIO — PHASE 02
# CATEGORY MANAGEMENT
## SOURCE OF TRUTH — LOCKED SCOPE

**Status:** DRAFT FOR REVIEW  
**Phase:** 02 — Category  
**Domain:** Category Management  
**Architecture:** Next.js → Laravel REST API → MongoDB Local

---

## 1. TUJUAN

Phase 02 hanya bertanggung jawab atas struktur kategori resmi SERVIO:

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
- Master Category
- Category
- Subcategory
- Hierarchy
- Create / Edit / Activate / Deactivate
- Role & permission
- UI Category Management
- Category request/suggestion
- Validation
- Business rules
- Edge cases
- Audit

---

## 2. BOUNDARY WAJIB

Phase 02 **TIDAK** membahas atau memiliki:

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
| ADMIN_OPERATIONS | Full operational | CRUD Category/Subcategory, status, hierarchy, review request |
| CEO_PRODUCT_OWNER | Oversight | Melihat dan mengawasi struktur |
| MERCHANT | Read/Select + Suggestion | Melihat kategori dan memberi suggestion |
| SERVICE_PROVIDER | Read/Select + Suggestion | Melihat JASA dan memberi suggestion |
| SUPPLIER | Read/Select + Suggestion | Melihat PRODUK dan memberi suggestion |
| CUSTOMER | Read/Filter/Discover | Melihat kategori aktif |
| WORKER_TECHNICIAN | Read-only | Membaca bila dibutuhkan |
| CUSTOMER_SUPPORT | Read-only | Membaca untuk kebutuhan support |
| FINANCE_PAYMENT_OPS | Read-only | Membaca bila dibutuhkan |

Role dan permission tetap berasal dari Phase 01 Identity & Access.

---

# 6. DETAIL ROLE

## ADMIN_OPERATIONS

Boleh:
- View tree
- Create Category
- Create Subcategory
- Edit
- Activate
- Deactivate
- Review suggestion
- Membuat struktur resmi secara manual
- Melihat audit

Tidak boleh:
- Membuat Master Category baru melalui CRUD biasa
- Membuat Category otomatis dari request
- Membuat duplicate

## CEO_PRODUCT_OWNER

Boleh:
- View
- Governance
- Monitoring
- Audit review

Tidak menjadi operator CRUD harian.

## MERCHANT

Boleh:
- View Category aktif
- Select Category
- Submit suggestion

Tidak boleh CRUD.

## SERVICE_PROVIDER

Boleh:
- View Category JASA aktif
- Select
- Submit suggestion

Tidak boleh membuat kategori.

## SUPPLIER

Boleh:
- View Category PRODUK aktif
- Select
- Submit suggestion

Tidak boleh membuat kategori.

## CUSTOMER

Boleh:
- View
- Filter
- Discovery

Tidak boleh mengubah struktur.

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

# 11. FLOW ACTIVATE

```text
ADMIN
 ↓
Open inactive node
 ↓
Activate
 ↓
Validation
 ↓
ACTIVE
 ↓
Audit Log
```

# 12. FLOW DEACTIVATE

```text
ADMIN
 ↓
Open active node
 ↓
Deactivate
 ↓
Confirmation
 ↓
Validation
 ↓
INACTIVE
 ↓
Audit Log
```

Deactivation bukan physical deletion.

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

# 14. UI ADMIN

## 14.1 Category Management

```text
CATEGORY MANAGEMENT

[ PRODUK ] [ JASA ]

Search Category
Filter Status

-----------------------------------
Category              Status
-----------------------------------
Elektronik            ACTIVE
Otomotif              ACTIVE
Rumah Tangga          INACTIVE
-----------------------------------

[ + Create Category ]
```

## 14.2 Tree View

```text
PRODUK
├── Elektronik
│   ├── Peralatan Pendingin
│   └── Aksesoris
└── Otomotif
    └── Mesin

JASA
├── Rumah Tangga
│   ├── Kebersihan
│   └── Perawatan AC
└── Otomotif
    └── Servis Kendaraan
```

## 14.3 Create Category

```text
Master Category *
[ PRODUK ▼ ]

Category Name *
[________________]

Description
[________________]

[Cancel] [Create Category]
```

## 14.4 Create Subcategory

```text
Master Category
PRODUK

Category *
[ Elektronik ▼ ]

Subcategory Name *
[________________]

Description
[________________]

[Cancel] [Create Subcategory]
```

## 14.5 Read-only UI

Role non-admin hanya melihat tree dan status. Tidak ada tombol:
- Create
- Edit
- Activate
- Deactivate

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
