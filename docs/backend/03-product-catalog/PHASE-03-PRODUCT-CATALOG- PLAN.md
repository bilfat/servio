# SERVIO — PHASE 03
# PRODUCT / CATALOG
## SOURCE OF TRUTH — MERCHANT PRODUCT CATALOG

**Status:** DRAFT FOR REVIEW / LOCK  
**Phase:** 03 — Product / Catalog  
**Primary Scope:** Barang yang dijual Merchant, Product, Variant, Price, Stock, Product Media, Customer Catalog, Product Card, Product Detail, dan Merchant Storefront.  
**Architecture:** Next.js → Laravel REST API → MongoDB Local

---

# 1. PURPOSE

Phase 03 mengelola katalog barang milik Merchant dan bagaimana barang tersebut ditemukan serta ditampilkan kepada Customer.

```text
MERCHANT
   ↓
PRODUCT
   ├── GENERAL PRODUCT MEDIA
   └── VARIANTS
        ├── PRICE
        ├── STOCK
        └── VARIANT MEDIA
```

Customer-facing:

```text
CUSTOMER
   ↓
PRODUCT CATALOG
   ├── Product Card
   ├── Product Detail
   ├── Variant Selection
   ├── Product Gallery
   ├── Merchant Storefront
   └── Related Products
```


# 2. FINAL SCOPE BOUNDARY

Phase 03 hanya membahas:

1. Merchant Product.
2. Product information.
3. Product Category/Subcategory reference.
4. Product media.
5. Product Variant.
6. Variant attributes.
7. Variant price.
8. Variant stock.
9. Product status.
10. Variant status.
11. Merchant storefront/catalog.
12. Customer product catalog.
13. Product card.
14. Product detail.
15. Product image gallery.
16. Variant-specific gallery.
17. Related products.
18. Products from the same Merchant.
19. Product ownership dan access control.
20. Validation, business rules, dan edge cases.

## 2.1 OUT OF SCOPE

Phase 03 **TIDAK** memiliki dan tidak membahas detail implementasi:

- Supplier Product.
- B2B.
- Supplier Catalog/procurement.
- Product compatibility.
- Service/Jasa.
- Service Offering.
- Booking.
- Technician Assignment.
- Diagnosis.
- Work Evidence.
- Cart.
- Checkout.
- Order.
- Payment Gateway.
- Escrow.
- Refund.
- Warranty.
- Affiliate.
- Commission.
- Notification.
- AI Recommendation Engine.
- Personalized Recommendation.
- Analytics/CEO Analytics.

Jika sebuah proses membutuhkan domain di atas, Phase 03 berhenti pada boundary Product/Catalog.


# 3. DEPENDENCY DENGAN PHASE SEBELUMNYA

## 3.1 Phase 01 — Identity & Access

Phase 01 sudah memiliki:

- User
- Account
- Role
- Organization
- Merchant identity
- Merchant membership
- Authentication
- Authorization
- Business identity
- Basic business profile & verified physical location (City, Province, District, Postal Code, Street Address)
- Customer identity & Customer Work Address Book (`user_addresses` khusus role `CUSTOMER`)

Phase 03 **tidak membuat ulang**:

```text
Merchant Account
Merchant Login
Merchant Role
Merchant Identity
PIC
NIB
NPWP
Business Registration
Authentication
Authorization Engine
Customer Address Book Management (Milik Modul 01)
```

Phase 03 menggunakan Merchant ID / Organization ID serta mengonsumsi data profil publik & lokasi fisik toko via M2M internal endpoint `GET /internal/v1/organizations/{id}/public-profile`:

```text
PHASE 01 (Identity & Access)
├── Merchant Identity & Location (M2M: city, province, address)
└── Customer Address Book (MySQL: user_addresses)
      │
      ▼
PHASE 03 (Product / Catalog)
├── Product Ownership (Merchant ID)
└── Location-Aware Delivery Verification (Same-City vs Out-of-City)
```

## 3.2 Phase 02 — Category

Phase 02 memiliki:

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

Product hanya boleh menggunakan branch:

```text
PRODUK
```

Phase 03 tidak membuat Category/Subcategory sendiri. Product hanya menyimpan reference ke Category/Subcategory yang dikelola Phase 02.


# 4. DOMAIN MODEL

## 4.1 Merchant

Merchant berasal dari Phase 01 dan menjadi owner Product.

```text
MERCHANT
   │
   └── PRODUCT
```

Satu Merchant dapat memiliki banyak Product.

## 4.2 Product

Product adalah barang yang dijual oleh Merchant.

Informasi umum:
- Product name
- Description
- Brand jika tersedia
- Category reference
- Subcategory reference
- General media
- Variant list
- Product status

Product tidak menggunakan stock global sebagai source of truth jika memiliki Variant. Stock berada pada Variant.

## 4.3 Variant

Variant adalah pilihan/konfigurasi spesifik Product dengan atribut, harga, dan stok sendiri.

```text
Product
├── Variant A
├── Variant B
└── Variant C
```

Setiap Variant memiliki:

```text
Variant
├── Attributes
├── Price
├── Stock
├── Status
└── Variant Media
```

## 4.4 No SKU Concept

Phase 03 tidak menggunakan SKU sebagai konsep bisnis utama.

```text
Merchant
   ↓
Product
   ↓
Variant
   ├── Price
   └── Stock
```

Tidak membuat layer Merchant SKU/SKU sebagai konsep tambahan.


# 5. BUSINESS FLOW — MERCHANT

```text
MERCHANT
   ↓
Product Management
   ↓
Create Product
   ↓
Basic Information
   ↓
Select Category
   ↓
Select Subcategory
   ↓
Upload General Media
   ↓
Create Variant
   ↓
Set Variant Attributes
   ↓
Set Price
   ↓
Set Stock
   ↓
Optional Variant Media
   ↓
Server Validation
   ↓
Save Draft / Activate
   ↓
Customer Catalog
```

## 5.1 Create Product

```text
Product Management
→ Add Product
→ Basic Information
→ Category/Subcategory
→ General Photos
→ Variants
→ Price
→ Stock
→ Variant Photos (optional)
→ Validation
→ Draft / Active
```

## 5.2 Edit Product

```text
Merchant
→ Product Management
→ Select own Product
→ Edit
→ Server Validation
→ Save
→ Audit/logging as defined by implementation
```

Merchant hanya dapat mengedit Product miliknya sendiri.

## 5.3 Activate Product

Product hanya dapat ACTIVE jika memenuhi activation requirements.

## 5.4 Deactivate Product

```text
ACTIVE → INACTIVE
```

Data tetap tersimpan dan Product tidak tampil di public active catalog.


# 6. BUSINESS FLOW — CUSTOMER

```text
CUSTOMER
   ↓
Product Catalog
   ↓
Search / Browse / Filter
   ↓
Product Card
   ↓
Product Detail
   ↓
View Gallery
   ↓
Select Variant
   ↓
Exact Price
   ↓
Variant Stock
   ↓
View Merchant Store
   ↓
Merchant Storefront
   ↓
Related Products
   ↓
Same Store Products
```

Phase 03 berhenti sebelum:

```text
Cart
Checkout
Order
Payment
```


# 7. ROLE YANG TERLIBAT

| Role | Product | Variant | Price | Stock | Media | Storefront |
|---|---|---|---|---|---|---|
| MERCHANT | CRUD own | CRUD own | Manage own | Manage own | Manage own | Own catalog |
| CUSTOMER | Read | Read | Read | Read | Read | Read |
| ADMIN_OPERATIONS | Governance/read/operational access sesuai permission | Oversight | Read | Read | Read | Read |
| CEO_PRODUCT_OWNER | Oversight | Read | Read | Read | Read | Read |
| SERVICE_PROVIDER | No ownership | — | — | — | — | Read bila relevan |
| WORKER_TECHNICIAN | Read bila dibutuhkan | Read | Read | Read | Read | Read |
| CUSTOMER_SUPPORT | Read | Read | Read | Read | Read | Read |
| FINANCE_PAYMENT_OPS | Read bila dibutuhkan | Read | Read | Read | Read | Read |
| SUPPLIER | OUT OF SCOPE | OUT OF SCOPE | OUT OF SCOPE | OUT OF SCOPE | OUT OF SCOPE | OUT OF SCOPE |

### Merchant
Owner utama Product, Variant, Price, Stock, dan Media miliknya.

### Customer
Read/discovery/catalog.

### Admin Operations
Governance/operational oversight sesuai permission yang dikunci pada implementasi.

### CEO Product Owner
Oversight, bukan owner data Product Merchant.

### Supplier
Belum masuk Phase 03.


# 8. UI — MERCHANT PRODUCT MANAGEMENT

```text
PRODUCT MANAGEMENT

[ + Add Product ]

Search Product
Filter Status
Filter Category

---------------------------------------------
Image | Product | Variants | Status | Action
---------------------------------------------
      | AC 1 PK | 3        | ACTIVE | ...
      | Filter  | 2        | ACTIVE | ...
      | Remote  | 1        | DRAFT  | ...
---------------------------------------------
```

## 8.1 Basic Product Form

```text
Product Name *
[____________________________]

Brand
[____________________________]

Category *
[ Elektronik ▼ ]

Subcategory *
[ Peralatan Pendingin ▼ ]

Description
[____________________________]
```

Category/Subcategory berasal dari Phase 02. Merchant tidak dapat membuat Category dari form ini.

## 8.2 Product Media

```text
GENERAL PRODUCT PHOTOS

[ Upload ]

[Photo 1] [Photo 2] [Photo 3]
```

Merchant dapat upload, delete, dan reorder.

## 8.3 Variant Form

```text
VARIANT: BLACK / M

Price
[ Rp150.000 ]

Stock
[ 10 ]

Variant Photos
[Photo] [Photo]

[ + Tambah Foto Variant ]
```

Variant media bersifat optional.

## 8.4 Add Variant

```text
Add Variant
→ Define attributes
→ Validate combination
→ Set Price
→ Set Stock
→ Optional Variant Media
→ Save
```


# 9. UI — CUSTOMER CATALOG

```text
PRODUCT CATALOG

Search...

Category
Subcategory
Price Range

--------------------------------

[Product Card]
[Product Card]
[Product Card]
[Product Card]
```

Catalog menampilkan Product yang memenuhi public visibility requirements.


# 10. PRODUCT CARD & CATALOG PROXIMITY

Recommended card:

```text
┌──────────────────────────┐
│ [⚡ Sekota]              │
│       PRODUCT IMAGE      │
│                          │
├──────────────────────────┤
│ AC Portable 1 PK         │
│ Rp2.500.000–3.000.000    │
│ ACME Elektronik          │
│ 📍 Kota Surabaya         │
└──────────────────────────┘
```

## Required

1. Product image.
2. Product name.
3. Displayed price / price range.
4. Merchant/store name.
5. Merchant city location (e.g., `Kota Surabaya`).
6. Proximity delivery badge:
   - `⚡ Sekota` (Badge Hijau jika toko berada di kota yang sama dengan titik pengiriman aktif pembeli).
   - `⚠️ Luar Kota` (Badge Abu-abu/Amber jika toko berada di luar jangkauan kota pembeli).

## Catalog Discovery & Filter Lokasi

- **Location Chip Header**: Menampilkan titik pengiriman aktif pembeli (`📍 Lokasi Pengiriman: [Kota Pembeli] [Ubah]`).
- **Filter "Toko Sekota Saja"**: Memungkinkan pembeli menyaring katalog hanya menampilkan toko yang dapat melayani pengiriman langsung dalam kota.

## Optional

- Rating, jika rating source of truth sudah tersedia.
- Additional status.
- Category context jika diperlukan.

Jangan menampilkan metadata yang belum memiliki source of truth.

## Store Name & Location

Nama toko dan kota merchant wajib dicantumkan karena SERVIO adalah marketplace suku cadang teknis di mana radius pengiriman lokal sangat memengaruhi ketersediaan barang sampai ke tangan pembeli.


# 11. UI — PRODUCT DETAIL & DELIVERY ENFORCEMENT

```text
┌────────────────────────────────────────────────────────┐
│                 PRODUCT IMAGE GALLERY                  │
│                      < 1 / 5 >                         │
├────────────────────────────────────────────────────────┤
│ AC Portable 1 PK                                       │
│ Rp2.500.000 – Rp3.000.000                              │
│ ACME Elektronik • 📍 Kota Surabaya                     │
│ Elektronik > Peralatan Pendingin                       │
├────────────────────────────────────────────────────────┤
│ Variant                                                │
│ [1 PK] [1.5 PK] [2 PK]                                 │
│ Stock: Tersedia                                        │
├────────────────────────────────────────────────────────┤
│ PENGIRIMAN & JANGKAUAN LOKASI                          │
│                                                        │
│ [SKENARIO A - SEKOTA]:                                 │
│ ⚡ Tersedia Pengiriman Sekota                          │
│ Estimasi: Instan 2-3 Jam • Sameday • Ambil di Bengkel   │
│ Tombol: [+ Keranjang] [Beli Langsung] (AKTIF)          │
│                                                        │
│ [SKENARIO B - LUAR KOTA]:                              │
│ ⚠️ Pengiriman Tidak Tersedia ke Lokasi Anda            │
│ Toko ini berlokasi di Surabaya, hanya melayani dalam  │
│ kota. Lokasi Anda saat ini terdeteksi: Jakarta Selatan │
│ Tombol: [Di Luar Jangkauan Toko] (LOCKED / DISABLED)   │
│ Aksi:   [Ganti Titik Lokasi] (Buka Location Modal)     │
├────────────────────────────────────────────────────────┤
│ Description                                            │
│ ...                                                    │
├────────────────────────────────────────────────────────┤
│ STORE                                                  │
│ ACME Elektronik (Kota Surabaya)                  >     │
│ Lihat semua produk toko                                │
├────────────────────────────────────────────────────────┤
│ PRODUK SERUPA                                          │
│ [Card] [Card] [Card]                                   │
├────────────────────────────────────────────────────────┤
│ PRODUK LAIN DARI TOKO INI                              │
│ [Card] [Card] [Card]                                   │
└────────────────────────────────────────────────────────┘
```

Minimal data:
- Gallery (General + Variant)
- Product name
- Price/range
- Merchant/store name & store city location
- Category & Subcategory
- Variant selector
- Selected variant price & stock
- **Delivery availability evaluation & warning/success card**
- **Disabled action buttons when outside merchant delivery city**
- Description & Product attributes
- Store section
- Related products
- Same-store products


# 12. PRICE RULES

Price adalah milik Variant.

### Satu active Variant

```text
Rp150.000
```

### Multiple active Variants

```text
Variant A → Rp150.000
Variant B → Rp175.000
Variant C → Rp250.000

Card:
Rp150.000 – Rp250.000
```

Formula:

```text
MIN(active_variant_prices)
        -
MAX(active_variant_prices)
```

Setelah Customer memilih Variant:

```text
Product:
Rp150.000 – Rp250.000

Selected Variant:
Black / L

Exact Price:
Rp175.000
```

Hanya Variant ACTIVE yang digunakan untuk range.


# 13. STOCK RULES

Stock berada pada Variant.

```text
Kaos
├── Black / M → 10
├── Black / L → 4
├── White / M → 0
└── White / L → 12
```

Tidak menggunakan `product.stock` sebagai source of truth.

Phase 03 belum membahas:
- reservation,
- deduction akibat Order,
- restoration akibat Refund,
- transaction lifecycle.

Variant stock 0 dapat tetap tersimpan, tetapi tidak dianggap available.


# 14. MEDIA / FOTO — FINAL MODEL

Product memiliki dua scope media:

```text
PRODUCT
├── GENERAL PRODUCT MEDIA
│
└── VARIANTS
    ├── Variant A Media
    ├── Variant B Media
    └── Variant C Media
```

## 14.1 General Product Media

Foto keseluruhan Product yang berlaku untuk semua Variant.

```text
variant_id = null
```

Contoh:

```text
Front.jpg
Side.jpg
Full.jpg
```

## 14.2 Variant Media

Foto yang hanya berlaku untuk Variant tertentu.

```text
scope = VARIANT
variant_id = valid Variant ID
```

Contoh:

```text
Black / M
├── black-front.jpg
└── black-side.jpg

White / M
├── white-front.jpg
└── white-side.jpg
```

## 14.3 Variant Media Optional

General Product Image:
- minimal 1 direkomendasikan/menjadi requirement activation.

Variant Image:
- optional.

Jika Variant tidak mempunyai foto:

```text
Selected Variant
→ No Variant Media
→ Fallback to General Media
```


# 15. CUSTOMER IMAGE GALLERY — FINAL FLOW

Customer tetap melihat **satu gallery/slider**, bukan dua gallery terpisah.

## 15.1 Belum memilih Variant

```text
General 1
→ General 2
→ General 3
```

Jangan mencampur foto seluruh Variant secara acak.

## 15.2 Memilih Variant

Misalnya:

```text
Black / M
```

memiliki:

```text
Black-1
Black-2
```

Gallery menjadi:

```text
Black-1
→ Black-2
→ General-1
→ General-2
→ General-3
```

Variant media menjadi media utama setelah selection, General Media menjadi media pendukung.

## 15.3 Mengganti Variant

Jika berpindah:

```text
Black / M
→ White / M
```

gallery mengikuti White/M.

Foto Black/M tidak boleh dianggap sebagai foto White/M.

## 15.4 Variant tanpa media

Fallback:

```text
Variant Media = none
→ General Product Media
```

## 15.5 Source identity

Setiap image harus dapat dibedakan:

```text
GENERAL
variant_id = null

VARIANT
variant_id = valid Variant ID
```

Hal ini menjaga foto tetap tertata dan tidak salah menampilkan variant.


# 16. MERCHANT STOREFRONT / PROFILE TOKO

## 16.1 Keputusan

**YES — Customer memiliki akses ke Merchant Storefront.**

Namun Storefront bukan identity baru.

```text
PHASE 01
Merchant Identity / Business Profile
        ↓
PHASE 03
Merchant Storefront / Product Catalog View
```

## 16.2 Storefront UI

```text
┌──────────────────────────────────────────┐
│          [ STORE LOGO / IMAGE ]          │
│          ACME Elektronik                 │
│          ✓ Merchant Terverifikasi        │
├──────────────────────────────────────────┤
│ Produk | Kategori | Tentang Toko         │
├──────────────────────────────────────────┤
│ Search products...                       │
│ [Semua] [Elektronik] [AC] [Aksesoris]   │
├──────────────────────────────────────────┤
│ [Card] [Card]                            │
│ [Card] [Card]                            │
└──────────────────────────────────────────┘
```

## 16.3 Storefront Purpose

Customer dapat:
- Melihat Merchant.
- Melihat informasi publik Merchant.
- Melihat seluruh Product ACTIVE Merchant.
- Search/filter katalog Merchant.
- Masuk ke Product Detail.

## 16.4 Storefront data

Storefront mengagregasikan:

```text
Merchant Identity
+
Public Store Information
+
Active Products
+
Category references
```

Tidak membuat ulang Merchant Account, Role, Legal Identity, atau Authentication.

## 16.5 Empty Storefront

Jika tidak ada Product ACTIVE:

```text
Belum ada produk yang tersedia.
```

Storefront tetap dapat dibuka.


# 17. RELATED PRODUCTS

Product Detail memiliki:

```text
Produk Serupa
```

Rule dasar:

1. Product ACTIVE.
2. Same Subcategory terlebih dahulu.
3. Jika hasil tidak mencukupi, Same Category.
4. Exclude current Product.

Related Products bukan AI recommendation.

## 17.1 Same Store Products

Section terpisah:

```text
Produk Lain dari Toko Ini
```

Rule:

```text
same merchant_id
+
ACTIVE
+
exclude current product
```

## 17.2 Perbedaan

Produk Serupa:
```text
Category/Subcategory relevance
```

Produk Lain dari Toko:
```text
Merchant ownership
```

## 17.3 AI

Phase 03 tidak membuat:
- AI Recommendation.
- Personalized Recommendation.
- Collaborative Filtering.
- Behavioral Recommendation.

Rule-based catalog query sudah cukup untuk Phase 03.


# 18. BUSINESS RULES

## Product

**BR-PRODUCT-001** Product wajib dimiliki satu Merchant.  
**BR-PRODUCT-002** Merchant hanya dapat mengelola Product miliknya.  
**BR-PRODUCT-003** Product hanya menggunakan Category branch PRODUK.  
**BR-PRODUCT-004** Category/Subcategory berasal dari Phase 02.  
**BR-PRODUCT-005** Product tidak boleh membuat Category/Subcategory.  
**BR-PRODUCT-006** Product minimal memiliki satu Variant.  
**BR-PRODUCT-007** Product ACTIVE wajib memiliki minimal satu Variant ACTIVE.  
**BR-PRODUCT-008** Product INACTIVE tidak tampil di public active catalog.  
**BR-PRODUCT-009** Product DRAFT tidak tampil di public catalog.

## Variant

**BR-VARIANT-001** Variant berada di bawah Product.  
**BR-VARIANT-002** Variant memiliki Price.  
**BR-VARIANT-003** Variant memiliki Stock.  
**BR-VARIANT-004** Variant memiliki Status.  
**BR-VARIANT-005** Variant ACTIVE dapat dipilih Customer.  
**BR-VARIANT-006** Variant INACTIVE tidak dapat dipilih.  
**BR-VARIANT-007** Kombinasi attribute yang sama tidak boleh duplicate dalam Product yang sama.

## Price

**BR-PRICE-001** Price tidak boleh negatif.  
**BR-PRICE-002** Price adalah milik Variant.  
**BR-PRICE-003** Hanya active Variant digunakan untuk range.  
**BR-PRICE-004** Satu active Variant → exact price.  
**BR-PRICE-005** Multiple active Variant → MIN–MAX.  
**BR-PRICE-006** Selected Variant → exact Variant price.

## Stock

**BR-STOCK-001** Stock berada pada Variant.  
**BR-STOCK-002** Stock tidak boleh negatif.  
**BR-STOCK-003** Stock 0 dapat tersimpan.  
**BR-STOCK-004** Stock 0 tidak dianggap available.  
**BR-STOCK-005** Semua Variant stock 0 dapat dipresentasikan sebagai Out of Stock.  
**BR-STOCK-006** Transactional stock deduction/restoration bukan scope Phase 03.

## Media

**BR-MEDIA-001** Product memiliki General Media.  
**BR-MEDIA-002** Variant dapat memiliki Variant Media.  
**BR-MEDIA-003** General Media tidak memiliki Variant ID.  
**BR-MEDIA-004** Variant Media wajib memiliki Variant ID.  
**BR-MEDIA-005** Variant Media hanya boleh berasal dari Variant Product yang sama.  
**BR-MEDIA-006** General Media berlaku umum.  
**BR-MEDIA-007** Variant Media berlaku spesifik.  
**BR-MEDIA-008** Customer melihat satu gallery UI.  
**BR-MEDIA-009** Gallery awal menggunakan General Media.  
**BR-MEDIA-010** Setelah selection, Variant Media menjadi media utama jika tersedia.  
**BR-MEDIA-011** Variant tanpa media fallback ke General Media.  
**BR-MEDIA-012** Merchant dapat reorder media.

## Storefront

**BR-STORE-001** Storefront bukan account baru.  
**BR-STORE-002** Merchant Identity tetap Phase 01.  
**BR-STORE-003** Storefront hanya menampilkan Product ACTIVE milik Merchant.  
**BR-STORE-004** Product Merchant lain tidak boleh muncul.  
**BR-STORE-005** Product INACTIVE tidak tampil public.  
**BR-STORE-006** Empty storefront tetap memiliki empty state.

## Discovery

**BR-DISCOVERY-001** Customer hanya melihat Product yang memenuhi visibility requirements.  
**BR-DISCOVERY-002** Card menampilkan image.  
**BR-DISCOVERY-003** Card menampilkan name.  
**BR-DISCOVERY-004** Card menampilkan price/range.  
**BR-DISCOVERY-005** Card menampilkan store name.  
**BR-DISCOVERY-006** Current Product tidak boleh muncul sebagai Related Product.

## Category Integration

**BR-CATEGORY-001** Product hanya branch PRODUK.  
**BR-CATEGORY-002** Category harus valid/aktif untuk operasi baru.  
**BR-CATEGORY-003** Subcategory harus valid/aktif.  
**BR-CATEGORY-004** Subcategory harus child dari Category yang dipilih.  
**BR-CATEGORY-005** Category tidak boleh di-copy menjadi master baru di Phase 03.  
**BR-CATEGORY-006** Category inactive tidak otomatis menghapus Product.

## Ownership

**BR-OWNERSHIP-001** Product memiliki merchant_id.  
**BR-OWNERSHIP-002** Merchant hanya dapat mengubah Product miliknya.  
**BR-OWNERSHIP-003** Merchant A tidak dapat mengubah Product Merchant B.  
**BR-OWNERSHIP-004** Variant hanya dapat dikelola owner Product.  
**BR-OWNERSHIP-005** Media hanya dapat dikelola owner/authorized Merchant.


# 19. SERVER-SIDE VALIDATION

Laravel adalah security boundary.

Setiap mutation minimal memvalidasi:

1. Authentication.
2. Account status.
3. Merchant role/context.
4. Merchant ownership.
5. Product existence.
6. Category existence.
7. Category branch.
8. Category status.
9. Subcategory existence.
10. Subcategory parent.
11. Subcategory status.
12. Variant ownership.
13. Variant attribute uniqueness.
14. Price.
15. Stock.
16. Media ownership.
17. Media scope.
18. Status transition.

Frontend validation bukan security boundary.

Mutation flow:

```text
Request
 ↓
Authentication
 ↓
Account Status
 ↓
Role/Permission
 ↓
Merchant Context
 ↓
Ownership
 ↓
Validation
 ↓
Mutation
```


# 20. PRODUCT VISIBILITY

Product dapat tampil sebagai ACTIVE catalog hanya jika:

```text
Merchant valid
AND
Product ACTIVE
AND
Category valid
AND
Subcategory valid
AND
≥ 1 Active Variant
AND
required Product Media valid
```

Jika tidak terpenuhi:

```text
Remain DRAFT / INACTIVE
```


# 21. EDGE CASES

## EC-001 — Product tanpa Merchant
`merchant_id = null` → REJECT.

## EC-002 — Merchant mengedit Product Merchant lain
→ `403 FORBIDDEN`.

## EC-003 — Product menggunakan Category JASA
→ REJECT.

## EC-004 — Subcategory tidak cocok dengan Category
→ REJECT.

## EC-005 — Category inactive
Membuat/mengubah Product ke Category inactive → REJECT untuk penggunaan baru.

## EC-006 — Subcategory inactive
→ REJECT.

## EC-007 — Product tanpa Variant
Tidak dapat ACTIVE.

## EC-008 — Duplicate Variant
`Black / M` dua kali dalam Product sama → REJECT.

## EC-009 — Negative Price
→ REJECT.

## EC-010 — Negative Stock
→ REJECT.

## EC-011 — Variant inactive
Tidak dapat dipilih dan tidak masuk price range.

## EC-012 — Product inactive
Tidak tampil public.

## EC-013 — Semua Variant inactive
Product tidak memenuhi Active Catalog requirement.

## EC-014 — Satu Variant
Card menggunakan exact price.

## EC-015 — Banyak Variant
Card menggunakan MIN–MAX.

## EC-016 — Semua Variant Stock 0
Dapat dipresentasikan sebagai OUT OF STOCK dan tidak dianggap available.

## EC-017 — Variant tanpa foto
Fallback ke General Product Media.

## EC-018 — Product tanpa General Photo
Tidak memenuhi activation requirement normal.

## EC-019 — Duplicate Product Name antar Merchant
Diperbolehkan.

## EC-020 — Duplicate Product Name dalam Merchant
Tidak otomatis dianggap duplicate; jangan menggunakan Product Name sebagai global unique key.

## EC-021 — Duplicate Variant pada Product berbeda
Diperbolehkan.

## EC-022 — Variant Media milik Product lain
→ REJECT.

## EC-023 — General Media memiliki Variant ID
Jika scope GENERAL tetapi `variant_id` terisi → REJECT/normalize sesuai contract.

## EC-024 — Variant Media tanpa Variant ID
→ REJECT.

## EC-025 — Menghapus General Media terakhir
System harus mencegah Product ACTIVE kehilangan required media; dapat menolak deletion atau mengembalikan Product ke Draft/Inactive sesuai mutation policy.

## EC-026 — Menghapus/deactivate Variant terakhir
Product tidak boleh tetap ACTIVE tanpa minimal satu Active Variant.

## EC-027 — Storefront tanpa Product
Tampilkan empty state.

## EC-028 — Product inactive muncul di Storefront
Tidak boleh.

## EC-029 — Product inactive muncul di Related Products
Tidak boleh.

## EC-030 — Current Product muncul di Related Products
Tidak boleh.

## EC-031 — Customer belum memilih Variant
Gallery menggunakan General Media.

## EC-032 — Customer memilih Variant dengan media
Gallery menggunakan Variant Media sebagai media utama + General Media.

## EC-033 — Customer mengganti Variant
Gallery mengikuti Variant terbaru.

## EC-034 — Variant berbeda harga
Card menggunakan MIN–MAX; Detail setelah selection menggunakan exact price.

## EC-035 — Unauthorized direct API call
→ `403 FORBIDDEN`.


# 22. DATA OWNERSHIP

Phase 03 owns:

```text
Merchant Product
Product Variant
Variant Price
Variant Stock
Product General Media
Variant Media
Product Status
Variant Status
Catalog Presentation
Merchant Storefront Presentation
Related Product Query Rules
```

Phase 03 references:

```text
Merchant Identity → Phase 01
Category/Subcategory → Phase 02
```

Phase 03 tidak memiliki ownership terhadap:

```text
Order
Payment
Service
Booking
Supplier/B2B
Affiliate
Warranty
```

---

# 23. CONCEPTUAL DATA CONTRACTS

## Product Card

```text
Product Card
├── product_id
├── primary_image
├── product_name
├── display_price
├── merchant_id
└── merchant_name
```

Optional jika source of truth tersedia:

```text
rating
status_label
category_context
```

## Product Detail

```text
Product Detail
├── product_id
├── name
├── description
├── brand
├── gallery
├── category
├── subcategory
├── variants
│    ├── attributes
│    ├── price
│    ├── stock
│    └── media
├── merchant
├── related_products
└── same_store_products
```

## Storefront

```text
Storefront
├── merchant_id
├── public_store_information
├── merchant_identity_reference
├── active_product_count
├── active_categories
└── active_products
```

Storefront tidak membuat duplicate identity.


# 24. API RESPONSIBILITY

Phase 03 tidak menerapkan:

```text
one feature = one API
```

API berbasis resource/domain.

Contoh resource konseptual:

```text
/products
/products/{productId}

/products/{productId}/variants
/products/{productId}/media

/variants/{variantId}
/variants/{variantId}/media

/merchants/{merchantId}/storefront
/merchants/{merchantId}/products
```

Detail endpoint final dikunci pada tahap API Architecture setelah seluruh domain selesai.


# 25. ACCEPTANCE CRITERIA

## Product
- [ ] Merchant dapat membuat Product.
- [ ] Product memiliki Category/Subcategory reference.
- [ ] Product hanya branch PRODUK.
- [ ] Merchant hanya mengelola Product miliknya.
- [ ] Product ACTIVE memiliki minimal satu Active Variant.

## Variant
- [ ] Merchant dapat membuat Variant.
- [ ] Variant memiliki attributes.
- [ ] Variant memiliki Price.
- [ ] Variant memiliki Stock.
- [ ] Duplicate attribute combination ditolak.
- [ ] Variant dapat ACTIVE/INACTIVE.

## Price
- [ ] Single active Variant → exact price.
- [ ] Multiple active Variants → MIN–MAX.
- [ ] Selected Variant → exact price.

## Stock
- [ ] Stock berada di Variant.
- [ ] Negative stock ditolak.
- [ ] Zero stock tidak dianggap available.

## Media
- [ ] General Media tersedia.
- [ ] Variant dapat memiliki Variant Media.
- [ ] General Media tidak memiliki Variant ID.
- [ ] Variant Media memiliki Variant ID.
- [ ] Merchant dapat reorder.
- [ ] Initial gallery menggunakan General Media.
- [ ] Variant selection mengubah gallery.
- [ ] Variant tanpa media fallback ke General Media.

## Customer
- [ ] Card menampilkan image.
- [ ] Card menampilkan name.
- [ ] Card menampilkan price/range.
- [ ] Card menampilkan store name.
- [ ] Detail menampilkan gallery.
- [ ] Detail menampilkan variant.
- [ ] Detail menampilkan exact price setelah selection.
- [ ] Detail menampilkan stock.
- [ ] Detail menampilkan store.
- [ ] Related Products tersedia.
- [ ] Same Store Products tersedia.

## Storefront
- [ ] Customer dapat membuka Storefront.
- [ ] Storefront hanya menampilkan Product ACTIVE Merchant.
- [ ] Product Merchant lain tidak muncul.
- [ ] Empty state tersedia.

## Security
- [ ] Merchant tidak dapat mengedit Product Merchant lain.
- [ ] Unauthorized API mutation ditolak.
- [ ] Server-side validation aktif.

## Boundary
- [ ] Supplier/B2B tidak masuk.
- [ ] Order tidak masuk.
- [ ] Cart tidak masuk.
- [ ] Checkout tidak masuk.
- [ ] Payment tidak masuk.
- [ ] Booking tidak masuk.
- [ ] Service tidak masuk.
- [ ] AI recommendation tidak masuk.


# 26. FINAL BUSINESS FLOW

```text
                    PHASE 03
                PRODUCT / CATALOG
                       │
                       ▼
                    MERCHANT
                       │
                       ▼
                    PRODUCT
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
    CATEGORY        GENERAL         VARIANTS
    REFERENCE        MEDIA              │
        │              │         ┌──────┼──────┐
        │              │         ▼      ▼      ▼
        │              │       Price  Stock  Media
        │              │
        └──────────────┴──────────────┘
                       │
                       ▼
                CUSTOMER CATALOG
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   PRODUCT CARD   PRODUCT DETAIL   STOREFRONT
                       │              │
                       ▼              ▼
                  VARIANT SELECT   ALL ACTIVE
                       │            PRODUCTS
                       ▼
                  EXACT PRICE
                  + STOCK
                       │
                       ▼
                 RELATED PRODUCTS
```


# 27. FINAL MEDIA FLOW

```text
                        PRODUCT
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
      GENERAL MEDIA                 VARIANTS
             │                           │
       ┌─────┼─────┐             ┌──────┼──────┐
       ▼     ▼     ▼             ▼      ▼      ▼
      G1    G2    G3            VA     VB     VC
                                  │      │      │
                                  ▼      ▼      ▼
                                 Media  Media  Media
```

Customer:

```text
Belum pilih Variant
        ↓
General Media

Pilih Variant A
        ↓
Variant A Media + General Media

Pilih Variant B
        ↓
Variant B Media + General Media

Variant tidak punya Media
        ↓
General Media
```


# 28. FINAL CUSTOMER EXPERIENCE

```text
CUSTOMER
   ↓
Browse Catalog
   ↓
Product Card
   ↓
Product Detail
   ↓
Gallery
   ↓
Variant Selection
   ↓
Exact Price
   ↓
Variant Stock
   ↓
Merchant Store
   ↓
Merchant Storefront
   ↓
All Active Products
   ↓
Related Products
```

Phase 03 berhenti pada Product/Catalog experience.

---

# 29. FINAL BOUNDARY LOCK

> **Phase 03 bertanggung jawab atas Product/Catalog barang Merchant, termasuk Product, Variant, Price, Stock, General Product Media, Variant Media, Customer Catalog, Product Card, Product Detail, Merchant Storefront, rule-based Related Products, serta Location-Aware Delivery Verification (Sekota vs Luar Kota).**

> **Merchant Identity & verified physical address tetap milik Phase 01. Customer Address Book (`user_addresses`) tetap milik Phase 01. Category/Subcategory tetap milik Phase 02. Phase 03 hanya mereferensikan upstream service tersebut via kontrak resmi dan tidak membuat ulang ownership.**

> **Supplier/B2B, Service/Jasa, Booking, Cart, Order, Checkout, Payment, Refund, Warranty, Affiliate, dan AI Recommendation tidak termasuk Phase 03.**

```text
PHASE 01 (IDENTITY & ACCESS)
├── Merchant Profile & Location (M2M)
└── Customer Address Book (MySQL)
        ↓
PHASE 02 (CATEGORY)
        ↓
PHASE 03 (PRODUCT / CATALOG)
        │
        ├── MERCHANT
        │     └── PRODUCT
        │          ├── GENERAL MEDIA
        │          └── VARIANT (Price, Stock, Variant Media)
        │
        └── CUSTOMER & GUEST
              ├── LOCATION-AWARE CATALOG (GPS / Saved Address)
              ├── PRODUCT CARD (Proximity Badges)
              ├── PRODUCT DETAIL (Delivery Guard & Out-of-City Lock)
              ├── STOREFRONT
              └── RELATED PRODUCTS
        │
        ▼
PHASE 04 (SERVICE / JASA)
```

# PHASE 03 = PRODUCT / CATALOG ONLY

**Merchant Product → Variant → Price + Stock + Media → Customer Catalog / Detail / Storefront (Location-Aware).**

**Supplier/B2B dan Order tidak termasuk Phase 03.**

---

# 30. LOCATION-AWARE CATALOG & LOCAL DELIVERY RULES (PROXIMITY RESTRICTION)

## 30.1 Latar Belakang & Filosofi Logistik SERVIO
Katalog suku cadang teknis, komponen AC, spare parts refrigerasi, dan peralatan servis pada SERVIO memiliki karakteristik logistik lokal yang spesifik:
1. **Kecepatan Penanganan Masalah Lapangan**: Teknisi atau pelanggan membutuhkan komponen tiba dalam hitungan jam (Instan / Sameday) atau dapat diambil langsung di bengkel/toko mitra.
2. **Keterbatasan Radius Logistik Lokal**: Merchant toko suku cadang beroperasi secara fisik di kota tertentu dan melayani pengiriman lokal (*intra-city*). Pengiriman antarpulau/luar kota untuk barang teknis rentan terkendala dimensi, keamanan barang, dan ketidakcocokan waktu pengerjaan.
3. **Pencegahan Transaksi di Luar Jangkauan**: Customer/Guest dilarang melakukan pembelian barang dari toko yang berada di luar jangkauan kota pengiriman aktifnya.

## 30.2 Resolusi Titik Lokasi (Resolution Hierarchy)

### A. Lokasi Toko / Merchant (Origin)
* **Source of Truth**: Modul 01 (Identity & Access) — `organizations` & `user_profiles`.
* **M2M Inter-Service Contract**: Diperoleh secara otomatis melalui endpoint internal:
  `GET /internal/v1/organizations/{organizationId}/public-profile`
* **Field yang Disematkan pada Domain Catalog**:
  - `city` (Kabupaten / Kota toko)
  - `province` (Provinsi)
  - `district` (Kecamatan)
  - `postal_code` (Kode Pos)
  - `street_address` (Alamat Fisik Toko)

### B. Lokasi Pembeli / Guest (Destination)
Sistem menentukan titik lokasi aktif pembeli secara hierarkis:
1. **Pelanggan Terdaftar (Role: CUSTOMER)**:
   - Diambil dari **Buku Alamat Pengerjaan** (`user_addresses` di MySQL `servio_identity_db`).
   - Alamat yang ditandai `is_default = 1` otomatis menjadi acuan utama saat login.
   - Pelanggan dapat mengganti alamat kerja aktif atau memilih alamat tersimpan lainnya via `LocationPickerModal`.
   - *Catatan Tata Kelola*: Fitur Buku Alamat Pengerjaan **eksklusif** hanya ada untuk akun `CUSTOMER`. Semua akun bisnis (Merchant, Provider, Supplier) dan internal admin tidak memiliki buku alamat pengerjaan.
2. **Tamu Publik / Guest (Belum Login / Tanpa Alamat Tersimpan)**:
   - Terdeteksi otomatis melalui **Browser Geolocation (GPS)** saat mengakses Beranda SERVIO.
   - Hasil koordinat (*latitude* & *longitude*) di-*reverse geocoding* menjadi nama kota dan disimpan di `localStorage: servio_user_location`.
   - Jika GPS dinonaktifkan oleh pengguna, sistem menyediakan modal pemilihan lokasi manual (`LocationPickerModal`) dengan daftar kota populer (Surabaya, Sidoarjo, Jakarta, Bandung, Medan, Semarang, dll).

## 30.3 Evaluasi Kelayakan Pengiriman (Delivery Availability Check)
Fungsi evaluasi `checkDeliveryAvailability(merchantCity)` membandingkan nama kota pembeli yang ternormalisasi (`normalizeCityName`) dengan nama kota toko merchant:
* Prefix administratif seperti "Kota", "Kabupaten", "Kab.", "Kota Adm." diabaikan untuk perbandingan semantik (contoh: "Kota Surabaya" == "Surabaya", "Kab. Sidoarjo" == "Sidoarjo").

### Skenario 1: Luar Kota (Beda Kota) — BLOCKED / DITOLAK
Bila `isSameCity === false`:
1. **Banner Peringatan Resmi (Product Detail)**:
   Menampilkan alert card visual warna Amber/Merah yang kontras dan jelas:
   > **⚠️ Pengiriman Tidak Tersedia ke Lokasi Anda**  
   > Toko ini berlokasi di **[Kota Toko]** dan saat ini hanya melayani pengiriman dalam kota. Lokasi Anda saat ini terdeteksi di: **[Kota Pembeli]**.
2. **Tombol Transaksi Dikunci (*Disabled*)**:
   - Tombol **`+ Keranjang Belanja`** → `DISABLED` (Label: *Di Luar Jangkauan Toko*).
   - Tombol **`Beli Langsung`** → `DISABLED` (Label: *Tidak Bisa Dikirim ke [Kota Pembeli]*).
   - Penguncian berlaku konsisten pada:
     - Tampilan Desktop (Sidebar ringkasan transaksi).
     - Tampilan Mobile Bottom Floating Bar.
     - Tampilan Mobile Variant Bottom Sheet Drawer.
3. **Penyelamatan UX (*Recovery Action*)**:
   - Disediakan tombol aksi **"Ganti Titik Lokasi"** tepat di samping banner peringatan.
   - Menekan tombol ini langsung membuka `LocationPickerModal` untuk memilih alamat pengerjaan lain atau mengganti kota.

### Skenario 2: Sekota (Dalam Kota) — ALLOWED / DIIZINKAN
Bila `isSameCity === true`:
1. **Badge Status Pengiriman Hijau**:
   Menampilkan badge: `⚡ Tersedia Pengiriman Sekota` dengan estimasi opsi kurir lokal:
   - **Instan (2-3 Jam)**: Pengiriman langsung kurir motor lokal.
   - **Sameday**: Pengiriman hari yang sama.
   - **Ambil di Toko / Bengkel**: Bebas biaya pengiriman, pengambilan mandiri di alamat toko merchant.
2. **Tombol Transaksi Aktif**:
   - Tombol **`+ Keranjang Belanja`** dan **`Beli Langsung`** aktif normal.

## 30.4 Fitur Lokasi di Katalog Publik (`/products`)
1. **Location Header Chip**:
   Menampilkan info lokasi tujuan saat ini: `📍 Lokasi Pengiriman: [Kota Pembeli] [Ubah]`.
2. **Toggle Filter "Toko Sekota Saja"**:
   Customer dapat mengaktifkan filter untuk secara otomatis hanya menampilkan produk-produk dari toko yang sekota dengan pembeli.
3. **Proximity Badge pada Product Card**:
   - Kartu produk toko sekota: `⚡ Sekota` (Badge Hijau).
   - Kartu produk toko luar kota: `⚠️ Luar Kota` (Badge Abu-abu/Amber).

