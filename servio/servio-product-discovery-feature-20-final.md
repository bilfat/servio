# SERVIO — FEATURE #20 PRODUCT DISCOVERY
## Final Business Flow & Domain Specification

**Status:** FINAL / LOCKED  
**Roadmap:** #20 of #27  
**Domain:** PRODUCT / BARANG  
**Previous Feature:** #19 Service + Product Integration  
**Next Feature:** #21 Cart

---

# 1. Feature Overview

**Product Discovery** adalah fitur Servio untuk membantu pengguna menemukan produk, barang, spare part, material, komponen, dan kebutuhan pendukung service yang relevan berdasarkan kebutuhan, kategori, keyword, spesifikasi, compatibility, lokasi, harga, availability, seller, dan konteks penggunaan.

Feature ini bukan sekadar halaman katalog produk. Product Discovery merupakan **discovery layer** yang mempertemukan:

```text
Customer / Provider / Worker
          ↓
Product Need / Search Intent
          ↓
Product Catalog
          ↓
Product Variants
          ↓
Product Offers
          ↓
Compatibility
          ↓
Availability Signal
          ↓
Search / Filter / Ranking
          ↓
Product Detail
          ↓
Select / Add to Cart
          ↓
#21 Cart
```

Product Discovery juga menjadi penghubung antara service ecosystem Servio dengan product ecosystem.

---

# 2. Tujuan

Product Discovery harus mampu menjawab:

> "Saya membutuhkan barang apa, produk mana yang sesuai, siapa yang menjualnya, apakah tersedia, berapa harganya, apakah kompatibel, dan bagaimana saya melanjutkan proses pembeliannya?"

Tujuan utama:

1. Menemukan produk berdasarkan intent pengguna.
2. Menemukan produk berdasarkan kebutuhan dari service.
3. Menemukan produk yang kompatibel dengan asset.
4. Menampilkan product offer dari seller.
5. Menyediakan search, filter, sort, dan ranking.
6. Menampilkan informasi produk secara jelas.
7. Menangani alternative product dan zero-result search.
8. Menjadi pintu masuk menuju Cart.
9. Menghasilkan discovery event untuk analytics dan AI/ML.
10. Menjaga boundary dengan #19 dan #21–#27.

---

# 3. Prinsip Utama

## 3.1 Product Discovery bukan Ecommerce Checkout

#20 hanya bertanggung jawab terhadap proses menemukan dan memilih produk.

```text
#20 Product Discovery
        ↓
Find
        ↓
Understand
        ↓
Compare
        ↓
Select
        ↓
#21 Cart
```

#20 tidak menjadi tempat:

- checkout,
- pembayaran,
- inventory management,
- fulfillment execution,
- shipping execution,
- return/refund processing.

---

# 4. Boundary dengan Feature #19

## #19 Service + Product Integration

Menjawab:

> "Produk apa yang dibutuhkan oleh service?"

Contoh:

```text
AC Repair
   ↓
Inspection
   ↓
Capacitor rusak
   ↓
Product Requirement
   ↓
Capacitor 35+5 uF
```

## #20 Product Discovery

Menjawab:

> "Produk yang memenuhi requirement tersebut dapat ditemukan di mana?"

```text
Product Requirement
        ↓
#20 Product Discovery
        ↓
Search
        ↓
Compatibility
        ↓
Product Options
        ↓
Seller / Offer
        ↓
Select
        ↓
#21 Cart
```

### Prinsip

```text
#19 = WHY / WHAT IS NEEDED
#20 = FIND / DISCOVER
#21 = COLLECT
#22 = ORDER
#23 = PAY
#24 = STOCK
#25 = FULFILL
#26 = SHIP
#27 = RETURN / REFUND
```

---

# 5. Product Master vs Product Offer

Ini merupakan prinsip domain yang dikunci.

## Product

**Product** adalah identitas barang secara katalog.

Contoh:

```text
Product:
Capacitor AC 35+5 uF
Brand:
ABC
Type:
AC Capacitor
```

## Product Offer

**Product Offer** adalah penawaran produk dari seller tertentu.

Contoh:

```text
Product
   ↓
Product Offer
   ├── Seller A
   │   ├── Price: Rp85.000
   │   └── Availability: Available
   │
   ├── Seller B
   │   ├── Price: Rp78.000
   │   └── Availability: Available
   │
   └── Seller C
       ├── Price: Rp92.000
       └── Availability: Limited
```

### Rule

```text
Product ≠ Product Offer
```

Product menyimpan identitas dan karakteristik barang.

Product Offer menyimpan konteks penjualan oleh seller.

Konsep ini harus dipertahankan untuk mendukung #24 Inventory, #25 Fulfillment, dan #26 Shipping.

---

# 6. Product Taxonomy

Product taxonomy dikontrol oleh platform.

Merchant/Supplier tidak membuat taxonomy secara bebas.

Struktur konseptual:

```text
Product Domain
    ↓
Category
    ↓
Subcategory
    ↓
Product Type
    ↓
Product
    ↓
Variant
```

Contoh:

```text
Repair & Technical
└── Electrical
    └── Capacitor
        └── AC Capacitor
```

Contoh automotive:

```text
Automotive
└── Motorcycle
    └── Engine
        ├── Oil
        ├── Spark Plug
        ├── Filter
        └── Belt
```

---

# 7. Product Taxonomy Governance

```text
CEO / Product Owner
        ↓
Menentukan taxonomy & policy
        ↓
Admin / Operations
        ↓
Mengelola taxonomy
        ↓
Merchant / Supplier
        ↓
Memilih taxonomy saat listing
        ↓
Review
        ↓
Publish
```

Merchant/Supplier tidak boleh mengubah struktur taxonomy platform secara langsung.

---

# 8. Discovery Input

Product Discovery dapat menerima banyak jenis input.

## 8.1 Keyword

```text
kapasitor AC
cat tembok
oli motor
baterai mobil
filter AC
lampu LED
```

## 8.2 Brand

```text
Panasonic
Daikin
Samsung
Bosch
Philips
```

## 8.3 Model

```text
AC Daikin FTKC
Honda Vario 160
Toyota Avanza
```

## 8.4 SKU / Part Number

```text
SKU-00123
ABC-35UF
```

## 8.5 Specification

```text
1 PK
35+5 uF
220V
10W
12 inch
```

## 8.6 Service Requirement

```text
Service Requirement:
Capacitor 35+5 uF
```

## 8.7 Asset Context

```text
Asset:
Daikin AC 1 PK
```

## 8.8 Maintenance Context

```text
Maintenance:
Replace Air Filter
```

## 8.9 Natural Language Intent

Contoh:

> "Cari baterai yang cocok untuk mobil saya."

Sistem dapat menggabungkan:

```text
User Intent
+
Asset Context
+
Compatibility
+
Catalog
+
Offer
```

---

# 9. Search

Search harus mendukung:

- keyword,
- product name,
- brand,
- model,
- SKU,
- part number,
- specification,
- category,
- service-related requirement.

Search dapat menggunakan text normalization, typo tolerance, synonym, stemming, dan ranking, tetapi implementasi teknis dapat ditentukan pada tahap engineering.

---

# 10. Search Result

Setiap result sebaiknya memberikan informasi minimum:

```text
Product Image
Product Name
Brand
Variant
Relevant Specification
Compatibility Signal
Starting Price / Current Offer Price
Availability Signal
Seller
Distance / Location jika relevan
```

Contoh:

```text
Capacitor AC 35+5 uF
ABC
35+5 uF
Compatible
Mulai Rp78.000
Available
Seller B
```

---

# 11. Search Result dari Service Context

Saat Product Discovery dibuka dari #19:

```text
Service
   ↓
Product Requirement
   ↓
Open Product Discovery
```

Context requirement harus dibawa ke discovery.

Contoh:

```text
Required:
Capacitor
Specification:
35+5 uF
Asset:
Daikin AC 1 PK
```

Hasil discovery kemudian difokuskan pada produk yang memenuhi requirement.

---

# 12. Search Ranking

Ranking produk dapat mempertimbangkan:

```text
Query Relevance
+
Compatibility
+
Availability
+
Location
+
Price
+
Seller Quality Signals
+
Historical Interaction
```

Konseptual pipeline:

```text
Query
   ↓
Candidate Generation
   ↓
Hard Filter
   ↓
Compatibility
   ↓
Availability
   ↓
Feature Enrichment
   ↓
Ranking
   ↓
Result
```

---

# 13. Hard Constraint vs Recommendation

Hard constraint harus dipenuhi sebelum recommendation/ranking digunakan.

Contoh hard constraint:

```text
Product Status
Seller Status
Compatibility Requirement
Availability Requirement
Policy
```

Setelah lolos:

```text
ML / AI Ranking
```

dapat membantu menentukan urutan.

### Rule penting

Produk yang hanya **similar** tidak boleh otomatis dianggap **compatible**.

---

# 14. Search Ranking dan Feature #18

Feature #18 Smart Recommendation & AI Agent dapat membantu ranking.

Pembagian:

```text
Business Rules
      ↓
Hard Constraints
      ↓
Servio Data
      ↓
Recommendation / ML
      ↓
Ranking
```

AI tidak boleh menggantikan hard business rules.

AI juga tidak boleh mengarang:

- SKU,
- harga,
- stok,
- seller,
- compatibility,
- warranty.

Semua fakta tersebut harus berasal dari data/tool/domain service Servio.

---

# 15. Filter

Filter bersifat dynamic berdasarkan category dan product attributes.

Filter umum:

```text
Category
Subcategory
Brand
Price Range
Location
Availability
Condition
Compatibility
Seller
```

Filter spesifik kategori dapat mencakup:

```text
Model
Variant
Specification
Capacity
Material
Size
Voltage
Vehicle Model
Year
Part Type
```

---

# 16. Dynamic Filter Architecture

Konsep:

```text
Category
   ↓
Attribute Definition
   ↓
Available Product Attributes
   ↓
Dynamic Filter
```

Contoh AC:

```text
Brand
Capacity
Voltage
Type
Compatibility
Price
Condition
Location
Availability
Seller
```

Contoh automotive:

```text
Vehicle Type
Vehicle Brand
Vehicle Model
Year
Part Type
Specification
Brand
Price
Location
Availability
```

---

# 17. Sort

Customer dapat melakukan sorting:

```text
Relevance
Price: Low → High
Price: High → Low
Nearest
Availability
Recommended
```

"Recommended" dapat menggunakan recommendation/ranking system Servio.

---

# 18. Product Detail

Product Detail dianggap sebagai bagian dari Product Discovery, bukan roadmap feature terpisah.

Flow:

```text
Search
   ↓
Product Card
   ↓
Product Detail
```

Isi minimum:

```text
Product Name
Brand
Variant
Description
Specification
Compatibility
Media
Offer
Price
Seller
Availability
Warranty Information
Location
```

---

# 19. Product Variant

Produk yang mempunyai beberapa varian harus mendukung variant selection.

Contoh:

```text
Paint
 ├── White
 ├── Cream
 └── Grey
```

atau:

```text
Capacitor
 ├── 25+5 uF
 ├── 30+5 uF
 └── 35+5 uF
```

Variant harus tetap terhubung pada Product Master yang sama jika secara domain merupakan satu product family.

---

# 20. Product Attributes

Product attributes digunakan untuk:

- specification,
- filter,
- search,
- compatibility,
- display.

Contoh:

```text
Capacity = 1 PK
Voltage = 220V
Type = Inverter
Brand = Daikin
```

Attribute tidak boleh semuanya hardcoded di UI.

Platform harus dapat mendefinisikan attribute berdasarkan taxonomy/category.

---

# 21. Compatibility

Compatibility merupakan komponen penting terutama untuk spare part dan technical products.

Compatibility dapat berdasarkan:

```text
Asset Type
Asset Brand
Asset Model
Asset Variant
Component
Service
Specification
Manufacturer Data
Platform Rule
Verified Relationship
```

Contoh:

```text
Asset:
Daikin FTKC 1 PK

Product:
Capacitor 35+5 uF

Compatibility:
Compatible
```

---

# 22. Compatibility Result

Compatibility dapat mempunyai status:

```text
EXACT_MATCH
COMPATIBLE
ALTERNATIVE
SIMILAR
NOT_VERIFIED
NOT_COMPATIBLE
```

Arti:

### EXACT_MATCH

Produk sesuai dengan requirement secara langsung.

### COMPATIBLE

Produk kompatibel berdasarkan data/rules.

### ALTERNATIVE

Bukan product exact, tetapi tersedia sebagai alternatif yang kompatibel menurut aturan yang berlaku.

### SIMILAR

Memiliki karakteristik mirip, tetapi belum berarti kompatibel.

### NOT_VERIFIED

Informasi belum cukup untuk memastikan compatibility.

### NOT_COMPATIBLE

Tidak memenuhi compatibility requirements.

---

# 23. Compatibility Source

Sumber compatibility harus dapat ditelusuri.

Contoh:

```text
Compatibility Source:
Manufacturer
Platform Rule
Provider
Verified Technical Data
Service Requirement
Asset Data
```

AI recommendation tidak menjadi source of truth untuk compatibility.

AI hanya boleh memberikan assistive signal.

---

# 24. Compatibility Confidence

UI dapat menunjukkan context secara sederhana.

Contoh:

```text
✓ Compatible
Based on:
Daikin FTKC 1 PK
```

atau:

```text
⚠ Compatibility Needs Verification
```

atau:

```text
✕ Not Compatible
```

Sistem tidak boleh menampilkan kepastian palsu ketika data tidak cukup.

---

# 25. Asset-Based Discovery

Product Discovery dapat menerima context dari Feature #15 Asset.

Contoh:

```text
Asset:
AC Daikin 1 PK
       ↓
Find Compatible Products
       ↓
Product Discovery
```

Asset dapat digunakan sebagai context untuk filter dan compatibility.

---

# 26. Maintenance-Based Discovery

Feature #16 Maintenance dapat membuka Product Discovery.

Contoh:

```text
Maintenance Due:
Replace Filter
       ↓
Recommended Product
       ↓
Product Discovery
```

Maintenance tetap menjadi source of maintenance need.

#20 menjadi discovery layer.

---

# 27. Service History-Based Discovery

Feature #14 Service History dapat menjadi context.

Contoh:

```text
Previous Product:
Filter X
       ↓
Replacement Search
       ↓
Product Discovery
```

Historical data tidak otomatis berarti produk yang sama harus dibeli kembali.

Current compatibility, availability, dan price tetap harus divalidasi.

---

# 28. Rebooking / Loyalty Context

Feature #17 dapat memberikan discovery signal.

Contoh:

```text
Previous Purchase
      ↓
Related Product
      ↓
Discover / Buy Again
```

Namun #20 tidak mengambil alih business logic Loyalty.

---

# 29. Product Discovery untuk Customer

Customer dapat:

```text
Search
View
Filter
Sort
Compare basic options
View Compatibility
View Offer
View Seller
Select Variant
Select Offer
Add to Cart
```

Customer tidak dapat melewati permission atau melakukan tindakan transaksi yang bukan wewenangnya.

---

# 30. Product Discovery untuk Provider

Provider dapat menggunakan Product Discovery untuk:

```text
Search Material
Search Spare Part
Search Component
Check Compatibility
Check Price
Check Availability
Find Alternative
```

Provider dapat melakukan discovery untuk kebutuhan service, tetapi purchase/ordering tetap mengikuti authorization dan flow #21–#23.

---

# 31. Product Discovery untuk Worker / Technician

Worker dapat:

```text
View Assigned Job Context
Search Product
Search Requirement
Check Compatibility
View Available Options
```

Worker tidak otomatis mempunyai hak membeli.

Purchase action harus mengikuti:

```text
Worker Permission
+
Provider Policy
+
Customer Approval
```

jika diperlukan.

---

# 32. Merchant / Supplier

Merchant/Supplier menggunakan product ecosystem untuk membuat produk/offer agar dapat ditemukan.

Flow:

```text
Merchant / Supplier
      ↓
Create Product / Offer
      ↓
Select Taxonomy
      ↓
Add Attributes
      ↓
Add Compatibility
      ↓
Add Media
      ↓
Submit
      ↓
Admin Review
      ↓
Publish
      ↓
Product Discovery
```

---

# 33. Product Listing Governance

Product listing dapat ditolak atau dikembalikan apabila:

- taxonomy salah,
- product duplicate,
- specification tidak valid,
- media menyesatkan,
- compatibility tidak berdasar,
- seller tidak eligible,
- product melanggar policy.

---

# 34. Seller / Merchant Discovery

Satu product dapat mempunyai banyak seller/offer.

Customer dapat melihat:

```text
Product
   ↓
Available Offers
   ├── Seller A
   ├── Seller B
   └── Seller C
```

Offer dapat berbeda pada:

```text
Price
Availability
Condition
Location
Warranty
Fulfillment Capability
```

#20 menampilkan informasi yang dibutuhkan untuk discovery.

Pengelolaan seller dan fulfillment detail tetap berada pada domain masing-masing.

---

# 35. Location-Aware Discovery

Product Discovery dapat menggunakan location context.

Contoh:

```text
Customer:
Bandung

Search:
Sealant AC
```

Result dapat mempertimbangkan:

```text
Seller Location
Fulfillment Area
Distance
Availability
```

Location dapat menjadi ranking/filter, tetapi shipping dan fulfillment tetap bukan tanggung jawab #20.

---

# 36. Availability Signal

#20 menampilkan availability signal, tetapi **inventory bukan source of truth di #20**.

Status tampilan dapat berupa:

```text
AVAILABLE
LIMITED
OUT_OF_STOCK
PRE_ORDER
UNKNOWN
```

Source:

```text
#20
   ↓
consume signal
   ↓
#24 Inventory
```

#20 tidak mengelola stock quantity.

---

# 37. Product Condition

Product offer dapat mempunyai condition:

```text
NEW
USED
REFURBISHED
RECONDITIONED
```

Tidak semua kategori mengizinkan semua condition.

Platform dapat menetapkan category-level rules.

---

# 38. Product Warranty Information

Product Discovery dapat menampilkan warranty information yang tersedia pada product/offer.

Contoh:

```text
Warranty:
12 Months Seller Warranty
```

atau:

```text
Manufacturer Warranty
```

Tetapi proses claim tetap mengikuti:

- Feature #13 Warranty,
- product warranty rules,
- merchant/manufacturer policy.

#20 hanya discovery/display context.

---

# 39. Zero Result Search

Zero-result search harus diperlakukan sebagai meaningful state.

Contoh:

```text
Search:
Compressor ABC123

Result:
0 Product
```

Jangan hanya menampilkan:

> Produk tidak ditemukan.

Sistem dapat memberikan:

```text
Try Related Model
Try Alternative
Check Compatible Product
Request Sourcing
Ask Provider
Adjust Filter
```

---

# 40. Zero Result Analytics

Zero-result search perlu dicatat.

Contoh event:

```text
product_search_no_result
```

Data dapat digunakan oleh:

```text
Product Team
Admin
CEO / Product Owner
Recommendation System
Demand Analytics
```

untuk mengetahui kebutuhan pasar yang belum terpenuhi.

---

# 41. Alternative Product

Jika product exact tidak tersedia:

```text
Exact Product
      ↓
Unavailable
      ↓
Compatible Alternative
```

Alternative harus diberi label jelas.

Tidak boleh:

```text
Similar = Compatible
```

---

# 42. Product Comparison

Discovery dapat membantu customer memahami beberapa offer/product option.

Minimal perbandingan dapat mencakup:

```text
Price
Brand
Variant
Specification
Compatibility
Availability
Seller
Location
Warranty Information
```

Comparison tidak harus menjadi feature roadmap baru; ia dapat menjadi supporting capability dalam #20.

---

# 43. Select Product

Setelah melihat product detail:

```text
Product Detail
      ↓
Select Variant
      ↓
Select Offer
```

Selection menghasilkan context untuk proses berikutnya.

```text
Selected Product
+
Variant
+
Offer
+
Quantity
+
Context
```

kemudian diteruskan ke #21 Cart.

---

# 44. Add to Cart Boundary

CTA:

```text
Add to Cart
```

merupakan handoff ke Feature #21.

#20 tidak mengelola:

- cart quantity lifecycle,
- cart persistence rules,
- cart pricing calculation,
- cart promotion,
- checkout.

#20 hanya mengirim selected product/offer context ke #21.

---

# 45. AI Agent Boundary

AI Agent boleh membantu:

```text
Understand user intent
Search products
Explain specification
Explain compatibility context
Suggest filters
Suggest alternatives
Summarize options
```

AI tidak boleh:

```text
Invent SKU
Invent price
Invent stock
Invent seller
Invent warranty
Claim unsupported compatibility
Purchase silently
Checkout silently
Bypass policy
```

Action yang berdampak transaksi harus tetap melalui user authorization dan normal Servio flow.

---

# 46. Example AI Flow

User:

> "Carikan kapasitor yang cocok buat AC Daikin 1 PK saya."

Flow:

```text
User Intent
      ↓
AI Agent
      ↓
Identify Asset Context
      ↓
Search Servio Product Catalog
      ↓
Check Compatibility
      ↓
Check Availability
      ↓
Rank Candidates
      ↓
Explain
      ↓
Show Results
      ↓
Customer Selects
      ↓
#21 Cart
```

---

# 47. Event Tracking

Product Discovery harus menghasilkan event.

Minimum:

```text
product_search
product_search_no_result
product_view
product_filter_used
product_sort_used
product_offer_view
product_compatibility_check
product_selected
product_add_to_cart
product_not_selected
```

Additional event dapat mencakup:

```text
product_category_view
product_variant_selected
product_alternative_viewed
product_share
product_favorite
```

---

# 48. AI / ML Data Boundary

Event #20 dapat menjadi input:

```text
Event Tracking
      ↓
Feature Pipeline
      ↓
Training Dataset
      ↓
Model Training
      ↓
Evaluation
      ↓
Model Registry
      ↓
Inference
```

Contoh signal:

```text
Search Query
Click
View
Filter
Compatibility Check
Offer View
Selection
Add to Cart
```

No-click tidak otomatis dianggap sebagai negative label tanpa definisi label yang tepat.

Delayed feedback dan leakage harus diperhatikan pada implementation.

---

# 49. Product Discovery Ranking Signals

Possible signals:

```text
Text Relevance
Compatibility
Availability
Distance
Price
Historical Engagement
Seller Quality Signal
Product Popularity
Context Relevance
```

Namun business rules/hard constraints harus tetap didahulukan.

---

# 50. Product Search Personalization

Recommendation dapat memanfaatkan context:

```text
Customer
Asset
Service
Maintenance
History
Location
Preferences
Previous Interaction
```

Personalization tidak boleh menghilangkan important alternatives secara tidak transparan terutama ketika compatibility atau safety relevan.

---

# 51. Privacy

Product Discovery harus menggunakan prinsip:

```text
Least Privilege
```

Asset, service history, dan personal context hanya digunakan apabila user mengizinkan/berwenang sesuai domain policy.

Contoh:

```text
Customer Asset
      ↓
Customer's own discovery
```

Provider hanya melihat context yang memang diperlukan untuk pekerjaan yang relevan.

---

# 52. Search Permission

## Customer

```text
VIEW
SEARCH
FILTER
SELECT
ADD_TO_CART
```

## Provider

```text
VIEW
SEARCH
FILTER
SELECT
SERVICE_CONTEXT_DISCOVERY
```

## Worker

```text
VIEW
SEARCH
FILTER
ASSIGNED_JOB_CONTEXT
```

## Admin

```text
VIEW
MODERATE
MANAGE
```

## CEO / Product Owner

```text
ANALYZE
CONFIGURE POLICY
GOVERN
```

## Merchant / Supplier

```text
CREATE
UPDATE
SUBMIT
MANAGE OWN LISTING
VIEW DISCOVERY
```

---

# 53. Role × Responsibility

| Role | Responsibility |
|---|---|
| Customer | Menemukan, memahami, memilih produk |
| Provider | Menemukan produk/material/spare part untuk service |
| Worker | Menemukan produk yang relevan dengan assigned job |
| Admin/Ops | Moderasi, taxonomy, quality, publishing |
| CEO/Product Owner | Governance, policy, analytics |
| Merchant | Product & offer listing |
| Supplier | Product & offer/supply listing |

---

# 54. Product Discovery Flow — Direct Customer

```text
Customer
   ↓
Product Discovery
   ↓
Search / Category
   ↓
Filter / Sort
   ↓
Product Result
   ↓
Product Detail
   ↓
Select Variant
   ↓
Select Offer
   ↓
Add to Cart
   ↓
#21 Cart
```

---

# 55. Product Discovery Flow — Service Driven

```text
Service
   ↓
#19 Product Requirement
   ↓
Open Product Discovery
   ↓
Carry Requirement Context
   ↓
Search
   ↓
Compatibility
   ↓
Offer Discovery
   ↓
Customer / Authorized Actor Selects
   ↓
#21 Cart
```

---

# 56. Product Discovery Flow — Provider

```text
Provider
   ↓
Assigned / Active Service
   ↓
Need Material / Spare Part
   ↓
Product Discovery
   ↓
Search
   ↓
Compatibility
   ↓
Availability
   ↓
Select Product
   ↓
#19 / #21
```

---

# 57. Product Discovery Flow — Worker

```text
Worker
   ↓
Assigned Job
   ↓
Product Requirement
   ↓
Product Discovery
   ↓
Search / Compatibility
   ↓
View Options
   ↓
Request / Recommend
   ↓
Provider / Customer Authorization
   ↓
#19 / #21
```

---

# 58. Product Discovery Flow — Merchant/Supplier

```text
Merchant / Supplier
   ↓
Create Product
   ↓
Add Variant
   ↓
Add Specification
   ↓
Add Compatibility
   ↓
Create Offer
   ↓
Submit
   ↓
Admin Review
   ↓
Publish
   ↓
Discoverable
```

---

# 59. Product Master Status

Product Master:

```text
DRAFT
PENDING_REVIEW
PUBLISHED
SUSPENDED
UNPUBLISHED
ARCHIVED
```

## Meaning

### DRAFT

Data belum diajukan.

### PENDING_REVIEW

Menunggu review.

### PUBLISHED

Dapat ditemukan di discovery.

### SUSPENDED

Dihentikan sementara.

### UNPUBLISHED

Tidak tampil secara publik.

### ARCHIVED

Tidak aktif dan dipertahankan untuk historical integrity.

---

# 60. Product Offer Status

Offer:

```text
DRAFT
PENDING_REVIEW
ACTIVE
INACTIVE
SUSPENDED
ARCHIVED
```

Offer hanya dapat ditampilkan sebagai active offer jika memenuhi eligibility dan policy.

---

# 61. Discovery vs Inventory Status

Discovery status:

```text
AVAILABLE
LIMITED
OUT_OF_STOCK
PRE_ORDER
UNKNOWN
```

merupakan display signal.

Source of truth inventory tetap berada pada:

```text
#24 Inventory
```

---

# 62. Product Data Model

Core entities:

```text
products
product_categories
product_subcategories
product_types
product_variants
product_attributes
product_attribute_values
product_media
product_offers
product_offer_prices
product_compatibility
product_seller_relations
product_search_queries
product_search_filters
product_discovery_events
product_recommendation_context
```

---

# 63. products

Conceptual fields:

```text
id
category_id
subcategory_id
product_type_id
name
description
brand
model
part_number
status
created_at
updated_at
```

---

# 64. product_variants

Conceptual fields:

```text
id
product_id
variant_name
sku
specification_snapshot
status
```

Actual commercial SKU may have additional relationship to seller/offer depending on implementation.

---

# 65. product_attributes

Conceptual:

```text
attribute_definition
attribute_value
category_mapping
display_label
filterable
searchable
```

---

# 66. product_offers

Conceptual fields:

```text
id
product_id
variant_id
seller_id
condition
price_reference
availability_reference
location_reference
status
created_at
updated_at
```

Price and inventory source of truth remain in their respective domains.

---

# 67. product_compatibility

Conceptual fields:

```text
id
product_id
variant_id
target_type
target_brand
target_model
target_variant
target_specification
compatibility_status
source
verification_status
```

---

# 68. product_discovery_events

Conceptual:

```text
id
actor_id
session_id
event_type
query
product_id
variant_id
offer_id
context_type
context_id
metadata
created_at
```

---

# 69. Product Discovery Source of Truth

#20 menjadi source of truth untuk:

```text
Discovery Experience
Search Query Context
Discovery Filters
Ranking Request
Product Display Context
Discovery Events
```

#20 bukan source of truth untuk:

```text
Inventory
Payment
Order
Shipping
Return
Refund
Service Execution
Warranty Decision
```

---

# 70. Cross-Feature Dependencies

## #14 Service History

Memberikan historical context.

## #15 Asset

Memberikan identity & compatibility context.

## #16 Maintenance

Memberikan maintenance need.

## #17 Rebooking/Favorite/Loyalty

Memberikan behavioral/repeat context.

## #18 Smart Recommendation & AI Agent

Memberikan ranking/recommendation/intent assistance.

## #19 Service + Product Integration

Memberikan product requirement.

## #21 Cart

Menerima selected product/offer.

## #24 Inventory

Memberikan availability signal.

---

# 71. Handoff ke Feature #21

Output dari #20 ke #21 minimal:

```text
Product ID
Variant ID
Offer ID
Quantity
Context
Compatibility Context jika relevan
```

Contoh:

```text
product_id = P123
variant_id = V456
offer_id = O789
quantity = 1
context = SERVICE_REQUIREMENT
```

#21 kemudian mengambil alih cart lifecycle.

---

# 72. Error & Edge Cases

Product Discovery harus menangani:

```text
No Result
Product Unpublished
Offer Inactive
Out of Stock
Price Changed
Availability Changed
Compatibility Unknown
Compatibility Conflict
Seller Suspended
Duplicate Product
Invalid Query
Network Failure
Recommendation Service Unavailable
```

---

# 73. Price Change

Price dapat berubah setelah discovery.

Karena itu:

```text
Discovery Price
≠ Guaranteed Final Transaction Price
```

Harga final harus divalidasi pada transaction/cart flow sesuai rules #21–#23.

---

# 74. Availability Change

Availability juga dapat berubah setelah discovery.

Contoh:

```text
Discovery:
Available

↓ beberapa saat kemudian

Cart:
Out of Stock
```

#20 tidak menjamin inventory tetap tersedia.

#21 harus melakukan validation ulang ketika diperlukan.

---

# 75. Seller Suspension

Jika seller suspended:

```text
Offer
   ↓
Inactive / Hidden
```

Customer tidak boleh diproses ke transaction flow dari offer yang tidak eligible.

---

# 76. Duplicate Product

Jika terdapat duplicate product:

```text
Duplicate Detection
      ↓
Admin Review
      ↓
Merge / Reject / Archive
```

Silent duplication tidak dianjurkan.

---

# 77. Search Quality

Admin dapat memonitor:

```text
Zero Result Rate
Popular Queries
Search Conversion
Filter Usage
Result Click Rate
Selection Rate
Product Availability
Search Abandonment
Compatibility Search
```

CEO dapat melihat aggregate analytics untuk strategy.

---

# 78. Governance

## CEO / Product Owner

Mengatur:

```text
Product Taxonomy
Discovery Policy
Recommendation Governance
Compatibility Governance
Commercial Policy
Seller Policy
Analytics
```

## Admin / Operations

Mengoperasikan:

```text
Moderation
Product Review
Taxonomy Maintenance
Seller Eligibility
Quality Control
Duplicate Handling
Suspension
```

## Merchant / Supplier

Mengelola:

```text
Own Product Listing
Own Variant
Own Offer
Own Product Data
```

sesuai policy platform.

---

# 79. Notification Boundary

Product Discovery bukan notification engine utama.

Namun dapat menghasilkan event untuk:

```text
Price Change Signal
Availability Change
Recommendation
Saved Context
```

Notification delivery ditangani notification infrastructure/domain yang sesuai.

---

# 80. Security

Backend harus tetap memvalidasi:

```text
Actor
Role
Permission
Resource
Scope
Context
```

Formula:

```text
ROLE
+
PERMISSION
+
RESOURCE
+
SCOPE
=
ACCESS
```

UI hiding bukan security boundary.

---

# 81. Audit

Critical administrative actions harus memiliki audit trail.

Contoh:

```text
Product Published
Product Suspended
Compatibility Changed
Taxonomy Changed
Offer Suspended
Manual Correction
```

Audit mencatat:

```text
Actor
Action
Target
Timestamp
Result
Reason
```

---

# 82. Privacy & Data Minimization

Discovery context tidak boleh menggunakan data yang tidak diperlukan.

Contoh:

```text
Asset Context
Service History
Location
```

harus digunakan berdasarkan authorization dan relevance.

Tidak semua personal data harus dikirim ke recommendation/AI layer.

---

# 83. Accessibility & UX Principles

Product Discovery UI harus mempertimbangkan:

```text
Clear Search
Clear Filter
Readable Specification
Visible Price
Clear Compatibility
Clear Availability
Clear Seller
Clear CTA
Loading State
Empty State
Error State
```

Compatibility dan availability tidak boleh disembunyikan di informasi sekunder ketika informasi tersebut menentukan keputusan pembelian.

---

# 84. Loading / Empty / Error State

## Loading

```text
Searching products...
```

## Empty

```text
No products found
```

disertai alternative action.

## Error

```text
Product search unavailable
Try again
```

Discovery failure tidak boleh dianggap sebagai order failure.

---

# 85. Important Business Rules

1. Product dan Product Offer adalah entity berbeda.
2. Product taxonomy dikontrol platform.
3. Product Discovery adalah discovery layer.
4. Product Discovery bukan Cart.
5. Product Discovery bukan Order.
6. Product Discovery bukan Payment.
7. Product Discovery bukan Inventory.
8. Product Discovery bukan Fulfillment.
9. Product Discovery bukan Shipping.
10. Product Discovery bukan Return/Refund.
11. Availability hanya menjadi signal pada #20.
12. Inventory source of truth ada di #24.
13. Product price pada discovery bukan jaminan final transaction price.
14. Compatibility harus dibedakan dari similarity.
15. AI tidak menjadi source of truth.
16. AI tidak boleh membeli secara diam-diam.
17. Product alternative harus diberi label jelas.
18. Zero-result search merupakan data penting.
19. Customer approval tetap diperlukan jika product menimbulkan additional cost atau perubahan service scope.
20. Worker tidak otomatis mempunyai hak purchase.
21. Provider product sourcing tetap mengikuti authorization.
22. Product listing dapat melalui review.
23. Suspended product/offer tidak boleh dipakai untuk normal purchase flow.
24. Discovery event menjadi input analytics dan recommendation system.
25. #20 menghandoff selected product/offer ke #21.

---

# 86. End-to-End Example

## Example: AC Service

Customer memiliki:

```text
Asset:
Daikin AC 1 PK
```

Customer booking:

```text
AC Repair
```

Provider melakukan inspection.

Hasil:

```text
Capacitor perlu diganti
```

#19 membuat:

```text
Product Requirement
Type:
MANDATORY

Specification:
35+5 uF
```

Kemudian:

```text
#19
 ↓
#20 Product Discovery
```

Search:

```text
Capacitor 35+5 uF
```

System:

```text
Hard Filter
↓
Compatibility
↓
Availability
↓
Ranking
```

Result:

```text
Product A
Compatible
Rp85.000
Seller A
Available

Product B
Compatible Alternative
Rp78.000
Seller B
Available
```

Customer memilih Product A.

```text
Select
 ↓
Add to Cart
 ↓
#21 Cart
```

#20 selesai pada titik handoff tersebut.

---

# 87. Final Architecture

```text
                   SERVIO PRODUCT ECOSYSTEM

Customer / Provider / Worker
             │
             ↓
        Product Intent
             │
             ├───────────────┐
             ↓               ↓
        Direct Search    Service Context
             │               │
             └───────┬───────┘
                     ↓
              #20 PRODUCT DISCOVERY
                     │
       ┌─────────────┼──────────────┐
       ↓             ↓              ↓
    Search         Filter        Ranking
       │             │              │
       └─────────────┼──────────────┘
                     ↓
              Compatibility
                     │
                     ↓
               Product Result
                     │
                     ↓
                Product Detail
                     │
            ┌────────┴────────┐
            ↓                 ↓
      Select Product      Alternative
            │
            ↓
       Select Offer
            │
            ↓
        #21 CART
```

---

# 88. Final Scope Statement

> **Feature #20 Product Discovery adalah discovery layer Servio yang memungkinkan customer, provider, dan worker menemukan produk yang relevan berdasarkan search intent, taxonomy, specification, compatibility, availability, location, offer, dan recommendation context. Feature ini menerima context dari Asset, Maintenance, Service History, Smart Recommendation, dan terutama Service + Product Integration (#19), kemudian mengarahkan selected product/offer menuju Cart (#21). Product Discovery tidak menangani cart, order, payment, inventory, fulfillment, shipping, maupun return/refund.**

---

# 89. LOCKED STATUS

### Feature #20 — Product Discovery

**STATUS: ✅ LOCKED**

Yang sudah dikunci:

```text
✅ Product Discovery Scope
✅ Product vs Product Offer
✅ Product Taxonomy
✅ Search
✅ Filter
✅ Sort
✅ Dynamic Attributes
✅ Product Detail
✅ Product Variant
✅ Product Compatibility
✅ Compatibility Status
✅ Compatibility Source
✅ Asset-Based Discovery
✅ Maintenance-Based Discovery
✅ Service History Context
✅ Service Requirement Context
✅ Provider Discovery
✅ Worker Discovery
✅ Merchant/Supplier Listing Flow
✅ Availability Signal
✅ Location-Aware Discovery
✅ Alternative Product
✅ Zero Result
✅ Search Ranking
✅ AI / Recommendation Boundary
✅ Discovery Events
✅ Analytics
✅ Permission
✅ Privacy
✅ Audit
✅ Product Status
✅ Product Offer Status
✅ Data Model
✅ Cross-Feature Dependencies
✅ Cart Handoff
✅ Edge Cases
✅ Business Rules
✅ End-to-End Flow
✅ Final Architecture
```

---

# 90. Roadmap Position

```text
SERVICE / JASA
#1  Discovery
#2  Booking Jasa
#3  Order Jasa
#4  Pricing & Quotation
#5  Communication
#6  Payment & Protection
#7  Service Execution
#8  Tracking Detail
#9  Proof of Service
#10 Completion & Customer Confirmation
#11 Rating & Review
#12 Complaint / Dispute
#13 Warranty
#14 Service History
#15 Asset
#16 Maintenance & Reminder
#17 Rebooking / Favorite / Loyalty
#18 Smart Recommendation & AI Agent
#19 Service + Product Integration

PRODUCT / BARANG
#20 Product Discovery ✅
#21 Cart
#22 Booking / Order Barang
#23 Payment Barang
#24 Inventory
#25 Fulfillment
#26 Shipping & Tracking
#27 Return / Refund
```

**Next:** Feature #21 — Cart.
