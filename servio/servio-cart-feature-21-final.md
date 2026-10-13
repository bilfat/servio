# SERVIO — FEATURE #21 CART
## Final Business Flow & Domain Specification

**Status:** FINAL / LOCKED  
**Roadmap:** #21 of #27  
**Domain:** PRODUCT / BARANG  
**Previous Feature:** #20 Product Discovery  
**Next Feature:** #22 Booking / Order Barang

---

# 1. Feature Overview

**Cart** adalah transaction preparation layer Servio yang menyimpan selected product, variant, offer, seller, quantity, dan context pembelian, kemudian melakukan validasi sebelum item diteruskan menuju Product Order (#22).

Cart bukan sekadar keranjang belanja biasa karena Servio memiliki dua alur utama:

```text
DIRECT PRODUCT PURCHASE
Customer
   ↓
#20 Product Discovery
   ↓
#21 Cart
   ↓
#22 Product Order
```

dan:

```text
SERVICE-DRIVEN PRODUCT
Service membutuhkan material / spare part
   ↓
#19 Service + Product Integration
   ↓
#20 Product Discovery
   ↓
#21 Cart
   ↓
#22 Product Order
```

Cart adalah layer yang menjembatani pilihan produk dengan transaksi order.

---

# 2. Tujuan Feature #21

Cart harus menjawab:

> "Barang apa yang ingin saya beli, dari seller mana, varian apa, berapa jumlahnya, untuk kebutuhan apa, dan apakah semuanya masih valid untuk dilanjutkan menjadi order?"

Tujuan utama:

1. Menyimpan product selection.
2. Menyimpan variant dan offer yang dipilih.
3. Mengatur quantity.
4. Mengelompokkan item berdasarkan seller/order context.
5. Menghubungkan product dengan service requirement.
6. Menampilkan price snapshot.
7. Memvalidasi availability.
8. Memvalidasi compatibility.
9. Menangani perubahan harga/stok.
10. Menghitung subtotal dan total sementara.
11. Menangani item invalid.
12. Menentukan item yang dipilih untuk order.
13. Menjadi handoff yang bersih menuju #22.

---

# 3. Prinsip Utama

```text
#20 Product Discovery
        ↓
DISCOVER
        ↓
SELECT
        ↓
#21 CART
        ↓
COLLECT
        ↓
VALIDATE
        ↓
PREPARE
        ↓
#22 PRODUCT ORDER
```

**Cart ≠ Order**

Cart adalah draft / preparation layer.

Order adalah transaksi resmi.

---

# 4. Boundary dengan #20

## #20 Product Discovery

Bertanggung jawab terhadap:

```text
Search
Filter
Sort
Product Detail
Compatibility Discovery
Offer Discovery
Selection
```

## #21 Cart

Bertanggung jawab terhadap:

```text
Selected Item Persistence
Quantity
Variant
Offer
Grouping
Validation
Temporary Price Context
Cart Total
Selection for Order
```

Prinsip:

```text
#20 = FIND
#21 = COLLECT & VALIDATE
#22 = COMMIT AS ORDER
```

---

# 5. Boundary dengan #22

## Cart

```text
"Ini barang yang saya pilih."
```

## Order

```text
"Ini transaksi yang saya lakukan."
```

Contoh:

```text
Cart
Capacitor
Qty 1
Rp85.000
```

belum berarti:

```text
Order #ORD-123
```

Order baru dibuat setelah customer / actor yang berwenang melewati order confirmation sesuai Feature #22.

---

# 6. Cart Ownership

MVP utama:

```text
CUSTOMER_CART
```

Namun arsitektur harus dapat mendukung context procurement provider.

Contoh:

```text
Customer
   ↓
Customer Cart
```

atau:

```text
Provider
   ↓
Service Procurement Context
   ↓
Product Cart / Procurement Context
```

Worker dapat membantu discovery atau membuat request/draft sesuai permission, tetapi tidak otomatis menjadi pemilik transaksi.

---

# 7. Cart Context

Cart dapat memiliki context:

```text
DIRECT_PURCHASE
SERVICE_RELATED
MAINTENANCE_RELATED
ASSET_RELATED
REPLACEMENT
REORDER
```

Contoh:

```text
DIRECT_PURCHASE
"1 galon cat"
```

atau:

```text
SERVICE_RELATED
AC Repair
↓
Capacitor
```

---

# 8. Cart Item

Entity utama:

```text
Cart
   ↓
Cart Items
```

Setiap cart item minimal mengetahui:

```text
Product
Variant
Offer
Seller
Quantity
Price Snapshot
Context
```

Contoh:

```text
Cart
 ├── Capacitor 35+5 uF
 │    Variant: 35+5 uF
 │    Offer: Seller A
 │    Qty: 1
 │
 └── Electrical Tape
      Variant: 20m
      Offer: Seller B
      Qty: 2
```

---

# 9. Product ≠ Cart Item

**Product** adalah katalog.

**Cart Item** adalah pilihan customer terhadap product tertentu.

Satu Product dapat masuk ke banyak cart.

```text
Product
   ↓
Catalog Entity
```

vs.

```text
Cart Item
   ↓
Customer Selection
```

---

# 10. Product Offer ≠ Cart Item

Contoh:

```text
Product:
Capacitor 35+5 uF
```

Offers:

```text
Seller A — Rp85.000
Seller B — Rp78.000
```

Jika customer memilih Seller A, cart menyimpan:

```text
Product ID
+
Variant ID
+
Offer ID
```

bukan hanya Product ID.

Karena seller/offer menentukan konteks:

```text
Price
Availability
Condition
Location
Fulfillment Capability
```

---

# 11. Multi-Seller Cart

Servio mendukung multi-seller cart secara UX, tetapi tidak berarti semua item otomatis menjadi satu order.

Contoh:

```text
CART
│
├── Seller A
│    ├── Product A
│    └── Product B
│
└── Seller B
     └── Product C
```

Saat masuk #22:

```text
Cart
 ↓
Order Grouping
 ↓
Order A — Seller A
Order B — Seller B
```

Seller berbeda memiliki konteks berbeda untuk:

```text
Price
Inventory
Fulfillment
Shipping
Return Policy
```

---

# 12. Cart Group

Secara arsitektur dapat digunakan:

```text
Cart
   ↓
Cart Groups
      ↓
Seller / Fulfillment Context
          ↓
Cart Items
```

Contoh:

```text
CART-001

Group A
Seller A
 ├── Item 1
 └── Item 2

Group B
Seller B
 └── Item 3
```

---

# 13. Same Product, Different Seller

Contoh:

```text
Product A
Seller A
```

dan:

```text
Product A
Seller B
```

keduanya tidak boleh otomatis menjadi satu cart line.

```text
Cart Item 1
Product A
Offer A

Cart Item 2
Product A
Offer B
```

Karena seller/offer berbeda.

---

# 14. Same Product, Same Offer

Jika item memiliki:

```text
Product A
Variant X
Offer A
```

dan ditambahkan dua kali dengan context yang tidak konflik:

```text
Qty 1
+
Qty 1
=
Qty 2
```

Cart dapat menggabungkan quantity.

---

# 15. Variant Selection

Variant harus jelas jika product memiliki variant wajib.

Contoh:

```text
Paint
```

harus memilih:

```text
Color = White
Size = 5L
```

Cart menyimpan variant yang spesifik.

---

# 16. Quantity

Cart mendukung:

```text
Increase
Decrease
Manual Input
Remove
```

Quantity mengikuti rules:

```text
Minimum Quantity
Maximum Quantity
Pack Size
Inventory Limit
Seller Limit
```

Contoh:

```text
Minimum Order = 2
Pack Size = 2
```

maka quantity valid:

```text
2
4
6
8
```

---

# 17. Quantity Validation

Quantity harus divalidasi di backend.

Contoh:

```text
Requested Qty = 5
Available Qty = 2
```

hasil:

```text
INVALID / ACTION REQUIRED
```

Customer dapat:

```text
Reduce to 2
Remove
Continue Later
```

---

# 18. Inventory Boundary

#21 **bukan source of truth inventory**.

```text
#21 Cart
   ↓
Availability Validation
   ↓
#24 Inventory
```

Cart hanya menyimpan hasil validation/snapshot yang dibutuhkan.

---

# 19. Add to Cart ≠ Reserve Stock

Rule MVP:

> Menambahkan produk ke Cart tidak otomatis mengunci stok.

Contoh:

```text
Inventory = 10

Customer A:
Add 5 to Cart

Customer B:
Add 7 to Cart
```

tidak berarti:

```text
Inventory = 10 - 5
```

Cart belum menjadi transaksi final.

Stock reservation hanya dilakukan jika flow #22–#24 memang menetapkan mekanisme reservation.

---

# 20. Price Snapshot

Saat product masuk cart, system dapat menyimpan:

```text
Price at Add Time
```

sebagai historical/context.

Tetapi:

```text
Cart Price
≠ Final Guaranteed Price
```

---

# 21. Price Change

Contoh:

```text
Add to Cart:
Rp85.000
```

Kemudian seller mengubah:

```text
Rp90.000
```

Saat revalidation:

```text
PRICE_CHANGED
```

Customer melihat informasi transparan:

```text
Harga berubah dari Rp85.000 menjadi Rp90.000.
```

Jangan diam-diam mengganti harga.

---

# 22. Availability Change

Contoh:

```text
Cart:
Available
```

kemudian Inventory berubah:

```text
Out of Stock
```

Cart item menjadi:

```text
OUT_OF_STOCK
```

dan tidak boleh diteruskan sebagai valid order item sampai masalah diselesaikan.

---

# 23. Compatibility Validation

Compatibility sangat penting untuk service-linked cart.

Contoh:

```text
Requirement:
Capacitor 35+5 uF
```

Customer memilih:

```text
Capacitor 25+5 uF
```

Cart harus mendeteksi:

```text
Compatibility Conflict
```

bukan:

```text
Ready to Order
```

secara otomatis.

---

# 24. Mandatory Product Requirement

Jika item berasal dari #19 dan:

```text
Requirement Type:
MANDATORY
```

maka cart mempertahankan:

```text
Cart Item
   ↓
Product Requirement
   ↓
Service Context
```

Contoh:

```text
Service:
AC Repair

Requirement:
Capacitor 35+5 uF

Selected:
Product A
```

---

# 25. Recommended Product

Jika #19 menetapkan:

```text
RECOMMENDED
```

customer tetap boleh tidak memasukkannya.

```text
RECOMMENDED ≠ MANDATORY
```

---

# 26. Alternative Product

Jika customer memilih alternative:

```text
Original Requirement
        ↓
Alternative Product
```

Cart menyimpan relation:

```text
Selected Product
↔
Requirement
```

dan bila diperlukan dapat meminta confirmation/approval sesuai business rule.

---

# 27. No Silent Substitution

Produk yang dipilih:

```text
Product A
```

tidak boleh diam-diam berubah menjadi:

```text
Product B
```

karena Product A out of stock.

System harus:

```text
Notify
Explain
Request Selection
```

---

# 28. Service + Cart Integration

Contoh:

```text
Customer
   ↓
AC Repair
```

Provider melakukan inspection:

```text
Capacitor rusak
```

#19:

```text
Product Requirement
```

#20:

```text
Product Discovery
```

#21:

```text
Cart
```

Cart item:

```text
Capacitor 35+5 uF
Qty 1
Seller A
Rp85.000

Linked:
Service Context
Product Requirement
```

---

# 29. Customer Approval Context

Jika product menghasilkan additional cost:

```text
Service:
Rp250.000

Additional Product:
Rp85.000
```

Customer harus mengetahui:

```text
Why Needed
Product
Seller
Price
Quantity
Additional Cost
```

dan approval harus mengikuti Feature #19.

Cart hanya membawa approval context.

---

# 30. Cart Tidak Mengambil Alih Approval #19

Cart dapat menerima:

```text
Requirement = MANDATORY
Approval = APPROVED
```

tetapi keputusan kebutuhan product dan approval tidak menjadi tanggung jawab utama #21.

---

# 31. Direct Purchase Cart

Customer dapat membeli tanpa service:

```text
#20 Product Discovery
      ↓
Add to Cart
      ↓
#21 Cart
      ↓
Select Items
      ↓
#22 Product Order
```

Tidak harus ada Service Requirement.

---

# 32. Cart Selection

Customer dapat memilih item tertentu saja:

```text
Cart

☑ Product A
☐ Product B
☑ Product C
```

yang diteruskan:

```text
Product A
Product C
```

Konsep selection harus tersedia pada cart item.

---

# 33. Cart Group Selection

Untuk multi-seller:

```text
Seller A
☑ All

Seller B
☐ Product C
☑ Product D
```

Customer dapat memilih item/group secara fleksibel.

---

# 34. Cart Total

Minimal:

```text
Item Subtotal
+
Known Applicable Charges
=
Estimated Cart Total
```

Tax tetap di luar scope Servio sesuai keputusan sebelumnya.

Final transaction calculation mengikuti #22/#23.

---

# 35. Subtotal

Formula:

```text
Subtotal =
Σ (Unit Price × Quantity)
```

Contoh:

```text
Product A
Rp50.000 × 2
= Rp100.000

Product B
Rp25.000 × 1
= Rp25.000

Subtotal
= Rp125.000
```

---

# 36. Platform Fee Boundary

Platform/application fee dapat berasal dari policy Feature #6.

Cart dapat menampilkan known/estimated fee jika tersedia.

Namun final calculation tetap divalidasi di transaction/payment flow.

---

# 37. Shipping Boundary

Cart dapat menyimpan selected delivery context/preferences jika dibutuhkan:

```text
Delivery
Pickup
Service Context
```

Tetapi:

```text
Shipping Execution
Courier
Tracking
Delivery Lifecycle
```

tetap berada pada #26.

---

# 38. Address Boundary

Cart menggunakan selected address/context.

Canonical address management tetap berada pada shared profile/address capability.

Cart menyimpan reference/snapshot yang dibutuhkan untuk proses selanjutnya.

---

# 39. Fulfillment Boundary

Cart tidak mengeksekusi fulfillment.

Contoh context:

```text
Pickup
Delivery
```

dapat dibawa ke #22/#25, tetapi fulfillment execution tetap milik #25.

---

# 40. Seller Grouping

UI sebaiknya mengelompokkan:

```text
Seller A
----------------
Product A
Product B

Seller B
----------------
Product C
```

Tujuannya agar customer memahami bahwa transaction/fulfillment dapat terpisah.

---

# 41. Product Information di Cart

Minimal:

```text
Product Image
Product Name
Variant
Seller
Unit Price
Quantity
Subtotal
Availability
Compatibility Status jika relevan
Remove
```

Untuk service-linked item:

```text
Service Context
Requirement
Approval State
```

juga dapat ditampilkan.

---

# 42. Cart Item Status

Disarankan:

```text
VALID
PRICE_CHANGED
OUT_OF_STOCK
LIMITED_STOCK
SELLER_UNAVAILABLE
PRODUCT_UNPUBLISHED
OFFER_INACTIVE
VARIANT_UNAVAILABLE
COMPATIBILITY_CONFLICT
REQUIRES_APPROVAL
APPROVAL_EXPIRED
REMOVED
```

---

# 43. Cart Lifecycle

Cart-level status:

```text
ACTIVE
CHECKOUT_PENDING
LOCKED
CONVERTED
ABANDONED
EXPIRED
CANCELLED
```

## ACTIVE
Cart dapat diedit.

## CHECKOUT_PENDING
Sedang dipersiapkan untuk order creation.

## LOCKED
Edit tertentu dibatasi ketika transaction preparation berlangsung.

## CONVERTED
Sudah berhasil menjadi order.

## ABANDONED
Tidak dilanjutkan.

## EXPIRED
Expired berdasarkan policy.

## CANCELLED
Dibatalkan berdasarkan action/policy.

---

# 44. Cart Item Lifecycle

```text
ADDED
VALID
INVALID
SELECTED
DESELECTED
READY_FOR_ORDER
CONVERTED
REMOVED
```

Invalid reason dapat berupa:

```text
PRICE_CHANGED
OUT_OF_STOCK
COMPATIBILITY
SELLER
POLICY
APPROVAL
```

---

# 45. Cart Persistence

Cart harus persistent untuk authenticated customer.

Contoh:

```text
Add Product
↓
Open Service
↓
Open Profile
↓
Back to Cart
```

Cart tetap tersedia sesuai lifecycle/policy.

---

# 46. Multiple Device

Authenticated cart dapat disinkronkan:

```text
Desktop
↓
Add Product

Mobile
↓
Open Cart
```

Perubahan harus diproses secara deterministic.

---

# 47. Cart Conflict

Contoh:

```text
Desktop:
Qty = 2

Mobile:
Qty = 4
```

System perlu memiliki conflict reconciliation yang deterministic berdasarkan implementation policy.

Tujuan:

```text
No Quantity Corruption
```

---

# 48. Guest Cart

MVP dapat memprioritaskan authenticated cart.

Scale-up dapat mendukung:

```text
Guest Cart ID
```

yang kemudian dapat di-merge setelah login.

---

# 49. Cart Merge

Contoh:

```text
Guest Cart:
Product A

Login

Account Cart:
Product B
```

System:

```text
Guest Cart
+
Account Cart
↓
Merge
```

dengan revalidation:

```text
Price
Availability
Compatibility
Offer
```

---

# 50. Duplicate Prevention

Identity cart item secara konseptual:

```text
Cart
+
Product
+
Variant
+
Offer
+
Context
```

Jika sama → dapat merge quantity.

Jika seller/offer berbeda → separate item.

---

# 51. Cart ≠ Favorite

```text
Favorite
=
"I like/save this."
```

```text
Cart
=
"I am preparing to buy this."
```

Favorite tetap berada di Feature #17.

---

# 52. Cart Expiration

Cart dapat disimpan untuk convenience.

Namun transaction-critical data harus selalu divalidasi ulang.

Cart yang dibuat beberapa hari lalu tidak berarti:

```text
Price Locked
Stock Reserved
Offer Guaranteed
```

---

# 53. Cart Revalidation

Revalidation minimal dipicu pada:

```text
Add to Cart
Update Quantity
Open Cart
Select for Order
Proceed to Order
```

Timing/frequency teknis dapat disesuaikan.

Prinsip utama:

> Snapshot lama tidak boleh dianggap sebagai fakta final.

---

# 54. Validation Sequence

Konseptual:

```text
Cart Item
   ↓
Product Exists?
   ↓
Product Published?
   ↓
Variant Valid?
   ↓
Offer Active?
   ↓
Seller Eligible?
   ↓
Compatibility Valid?
   ↓
Availability Valid?
   ↓
Quantity Valid?
   ↓
Price Current?
   ↓
Approval Valid?
   ↓
READY
```

---

# 55. Validation Result

Contoh:

```text
Product A

✓ Product Active
✓ Offer Active
✓ Compatible
✓ Available
✓ Qty Valid
✓ Approval Valid

READY FOR ORDER
```

atau:

```text
Product B

✓ Product Active
✓ Offer Active
⚠ Price Changed
✓ Available

ACTION REQUIRED
```

---

# 56. Error & Edge Cases

Cart harus menangani:

```text
Product Removed
Offer Expired
Seller Suspended
Out of Stock
Insufficient Stock
Price Changed
Variant Changed
Compatibility Changed
Approval Expired
Service Context Closed
Network Failure
```

---

# 57. Product Unpublished

Jika product menjadi unpublished:

```text
Cart Item:
PRODUCT_UNPUBLISHED
```

Customer dapat:

```text
Remove Item
```

atau diarahkan ke alternative discovery jika tersedia.

Historical order tidak berubah hanya karena current cart berubah.

---

# 58. Seller Suspended

Jika seller suspended:

```text
Offer
↓
Unavailable
```

Customer tidak boleh membuat order dari offer tersebut.

---

# 59. Service Context Closed

Jika:

```text
Service Order
CANCELLED
```

sedangkan service-linked product masih ada di cart:

```text
Service Context No Longer Valid
```

Customer dapat mengikuti policy:

```text
Remove Link
Continue as Direct Purchase
Remove Item
```

---

# 60. Approval Expiration

Jika requirement membutuhkan approval dan approval expired:

```text
Approval
↓
Expired
```

Cart item:

```text
REQUIRES_APPROVAL
```

Tidak boleh diproses sebagai approved service product.

---

# 61. Recommendation di Cart

Cart dapat menampilkan supporting recommendation:

```text
You may also need:
- Sealant
- Insulation Tape
- Cable Tie
```

Namun recommendation tidak otomatis masuk cart.

```text
Recommendation ≠ Added Item
```

---

# 62. Cross-Sell Boundary

Cross-sell dapat menjadi supporting capability.

Contoh:

```text
Capacitor
+
Recommended:
Electrical Tape
```

Cross-sell hanya membantu customer memilih item tambahan.

---

# 63. AI pada Cart

AI Agent dapat membantu:

```text
Explain Cart
Summarize Cart
Detect Validation Issue
Suggest Compatible Alternative
Explain Price Change
Explain Why Item Cannot Be Ordered
```

AI harus menggunakan actual system result sebagai source of truth.

---

# 64. AI Tidak Boleh Mengubah Cart Diam-Diam

AI dapat menyarankan:

```text
"Seller B memiliki alternatif."
```

tetapi perubahan:

```text
Remove A
Add B
```

harus tetap mengikuti action/authorization yang sesuai.

---

# 65. Cart + Service Requirement

Data linkage:

```text
Cart
   ↓
Cart Item
   ↓
Product Requirement ID
   ↓
Service Context
```

Hal ini memungkinkan Servio mengetahui:

> "Barang ini dibeli untuk service apa?"

---

# 66. Cart + Asset

Contoh:

```text
Asset:
Daikin AC 1 PK
```

cart item:

```text
Capacitor 35+5 uF
```

context:

```text
Asset ID
```

sehingga relationship dapat ditelusuri:

```text
Asset
 ↓
Service
 ↓
Product Requirement
 ↓
Cart Item
```

---

# 67. Cart + Maintenance

Contoh:

```text
Maintenance Plan
↓
Replace Filter
↓
Product Discovery
↓
Cart
```

Cart item dapat membawa:

```text
Maintenance Context
```

Maintenance schedule tetap dikelola Feature #16.

---

# 68. Cart + Service History

Historical context dapat membantu re-order.

Contoh:

```text
Previous Product
↓
Replacement Discovery
↓
Cart
```

Historical item tidak otomatis dipaksa menjadi current purchase.

---

# 69. Reorder / Buy Again

Feature #17 dapat menyediakan:

```text
Buy Again
```

Flow:

```text
History
↓
Buy Again
↓
#20 Product Discovery / Revalidation
↓
#21 Cart
```

Price, seller, offer, availability tetap divalidasi.

---

# 70. Cart Notes

Customer dapat menyimpan note sederhana:

```text
"Untuk AC kamar lantai 2"
```

Namun note tidak menggantikan:

```text
Technical Specification
Product Requirement
Official Instruction
```

Service-critical information tetap menggunakan domain #19/#15.

---

# 71. Cart Metadata

Untuk item tertentu dapat ada:

```text
Source
Service Context
Maintenance Context
Asset Context
Requirement ID
Recommendation Source
```

Contoh:

```text
source = SERVICE_REQUIREMENT
```

atau:

```text
source = DIRECT_DISCOVERY
```

---

# 72. Cart Source

Recommended values:

```text
DIRECT_DISCOVERY
SERVICE_REQUIREMENT
MAINTENANCE
ASSET
REORDER
RECOMMENDATION
PROVIDER_REQUEST
```

---

# 73. Analytics Events

Minimum:

```text
cart_created
cart_item_added
cart_item_removed
cart_item_quantity_updated
cart_item_selected
cart_item_deselected
cart_viewed
cart_revalidated
cart_price_changed
cart_stock_changed
cart_item_invalid
cart_checkout_started
cart_converted
cart_abandoned
```

---

# 74. AI / ML Signals

Cart event dapat menjadi input Feature #18.

Contoh:

```text
Product View
↓
Add Cart
↓
Remove Cart
```

berbeda dengan:

```text
Product View
↓
Add Cart
↓
Order
```

Prinsip:

```text
Add to Cart ≠ Purchase
```

Cart abandonment tidak otomatis dianggap negative label tanpa label definition yang tepat.

Delayed feedback dan data leakage harus diperhatikan pada training.

---

# 75. Abandoned Cart

Jika tidak ada aktivitas:

```text
Cart
↓
No Activity
↓
ABANDONED
```

Item dapat dipertahankan sesuai policy.

Potential reminder:

```text
You still have items in your cart.
```

Notification tetap mengikuti anti-spam policy.

---

# 76. Cart Recovery

Customer membuka kembali abandoned cart:

```text
Abandoned Cart
↓
Revalidation
↓
Price
Availability
Offer
Compatibility
↓
Continue
```

---

# 77. Role Access — Customer

Customer dapat:

```text
CREATE CART
VIEW OWN CART
ADD ITEM
UPDATE ITEM
REMOVE ITEM
SELECT ITEM
DESELECT ITEM
PROCEED TO ORDER
```

---

# 78. Role Access — Provider

Provider dapat sesuai authorized procurement context:

```text
VIEW AUTHORIZED PROCUREMENT CONTEXT
ADD / SELECT PRODUCTS
VIEW PRODUCT COST
CREATE REQUEST
```

Provider tidak otomatis dapat melakukan payment sebagai customer.

---

# 79. Role Access — Worker

Worker dapat:

```text
VIEW ASSIGNED CONTEXT
SEARCH / SELECT PRODUCT
RECOMMEND
REQUEST PRODUCT
```

Jika worker memiliki purchasing permission, action harus mengikuti provider authorization dan policy.

---

# 80. Role Access — Admin

Admin dapat:

```text
VIEW CART FOR SUPPORT
INVESTIGATE
MANAGE EXCEPTIONS
```

Perubahan cart customer harus melalui authorized action dan audit.

---

# 81. Role Access — CEO / Product Owner

CEO tidak mengedit cart customer sehari-hari.

CEO dapat:

```text
ANALYZE
GOVERN CART POLICY
DEFINE COMMERCIAL POLICY
```

---

# 82. Merchant / Supplier Access

Merchant/Supplier tidak melihat customer cart secara bebas.

Information diteruskan setelah masuk authorized transaction flow:

```text
Cart
↓
#22 Order
↓
Merchant Order Context
```

---

# 83. Permission Principle

Tetap menggunakan:

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

Contoh:

```text
Customer
+
cart.update
+
own_cart
+
OWN
=
ALLOW
```

---

# 84. Data Model — Core

Core entities:

```text
carts
cart_groups
cart_items
cart_item_contexts
cart_item_price_snapshots
cart_item_validations
cart_events
cart_selections
cart_expirations
```

---

# 85. carts

Conceptual:

```text
id
owner_id
owner_type
cart_type
status
currency
context_type
context_id
created_at
updated_at
expires_at
```

---

# 86. cart_groups

Conceptual:

```text
id
cart_id
seller_id
group_type
fulfillment_context
status
```

Group dipakai untuk memisahkan seller/fulfillment context.

---

# 87. cart_items

Conceptual:

```text
id
cart_id
cart_group_id
product_id
variant_id
offer_id
quantity
selected
status
source_type
source_id
created_at
updated_at
```

---

# 88. cart_item_contexts

Untuk service integration:

```text
cart_item_id
service_context_id
service_order_id
product_requirement_id
asset_id
maintenance_plan_id
context_type
```

Tidak semua field selalu diisi.

---

# 89. cart_item_price_snapshots

Conceptual:

```text
cart_item_id
unit_price
currency
captured_at
source
```

Snapshot hanya sebagai context/history.

Final price tetap divalidasi.

---

# 90. cart_item_validations

Conceptual:

```text
cart_item_id
validation_type
validation_status
validated_at
source
reason
metadata
```

Validation types:

```text
PRODUCT
VARIANT
OFFER
SELLER
PRICE
INVENTORY
COMPATIBILITY
APPROVAL
POLICY
```

---

# 91. Cart Events

Contoh:

```text
CART_ITEM_ADDED
CART_ITEM_REMOVED
QUANTITY_UPDATED
PRICE_CHANGED
STOCK_CHANGED
COMPATIBILITY_FAILED
APPROVAL_REQUIRED
ITEM_SELECTED
ITEM_DESELECTED
CHECKOUT_STARTED
CONVERTED
```

Event penting dapat diaudit.

---

# 92. Source of Truth

#21 menjadi source of truth untuk:

```text
Cart State
Cart Items
Selected Items
Quantity Intent
Cart Grouping
Cart Context
Cart Validation State
```

Bukan source of truth untuk:

```text
Product Catalog → #20
Inventory → #24
Order → #22
Payment → #23
Fulfillment → #25
Shipping → #26
Return / Refund → #27
```

---

# 93. Cart → Order Handoff

Ketika customer menekan:

```text
Proceed to Order
```

flow:

```text
Cart
 ↓
Validate
 ↓
Group
 ↓
Prepare Order Context
 ↓
#22 Product Order
```

Handoff minimal:

```text
Cart ID
Selected Cart Items
Product ID
Variant ID
Offer ID
Quantity
Seller
Context
Price Snapshot
Required Approval State
Destination Context
```

#22 kemudian mengambil alih order creation.

---

# 94. Cart Tidak Membuat Payment

Flow roadmap:

```text
#21 Cart
 ↓
#22 Product Order
 ↓
#23 Payment Barang
```

Cart tidak memulai payment sebagai final transaction.

---

# 95. Cart Tidak Memutasi Inventory secara Langsung

Default MVP tidak:

```text
Add to Cart
↓
Decrease Inventory
```

Inventory mutation mengikuti order/inventory flow.

---

# 96. Cart Tidak Menangani Refund

Refund berada pada:

```text
#27 Return / Refund
```

Cart hanya dapat dipakai sebagai historical/analytics context jika diperlukan.

---

# 97. End-to-End — Direct Purchase

```text
Customer
   ↓
#20 Product Discovery
   ↓
Product Detail
   ↓
Select Variant
   ↓
Select Offer
   ↓
Add to Cart
   ↓
#21 CART
   ↓
Quantity
   ↓
Validation
   ↓
Select Item
   ↓
Proceed to Order
   ↓
#22 Product Order
```

---

# 98. End-to-End — Service Product

```text
Service
   ↓
#19 Product Requirement
   ↓
#20 Product Discovery
   ↓
Product Selection
   ↓
#21 Cart
   ↓
Check Requirement
   ↓
Check Approval
   ↓
Check Compatibility
   ↓
Check Availability
   ↓
Proceed
   ↓
#22 Product Order
```

---

# 99. End-to-End — Multi-Seller

```text
#20 Discovery
      ↓
#21 Cart

Seller A
 ├── Product A
 └── Product B

Seller B
 └── Product C

      ↓
Select Items
      ↓
Order Grouping
      ↓
#22
 ├── Order A
 └── Order B
```

---

# 100. End-to-End — Price Changed

```text
Add Product
Rp85.000
   ↓
Cart
   ↓
Seller price changed
Rp90.000
   ↓
Revalidation
   ↓
PRICE_CHANGED
   ↓
Customer informed
   ↓
Accept / Remove / Re-select
```

---

# 101. End-to-End — Out of Stock

```text
Add Product
   ↓
Cart
   ↓
Inventory changes
   ↓
Out of Stock
   ↓
Cart validation
   ↓
INVALID
   ↓
Customer action
   ├── Remove
   ├── Find Alternative
   └── Continue Later
```

---

# 102. End-to-End — Compatibility Conflict

```text
Service Requirement
35+5 uF
   ↓
Product Discovery
   ↓
Customer selects 25+5 uF
   ↓
Cart
   ↓
Compatibility validation
   ↓
CONFLICT
   ↓
Cannot proceed normally
```

No silent substitution.

---

# 103. Important Business Rules

1. Cart ≠ Order.
2. Cart adalah preparation layer.
3. #20 menemukan produk.
4. #21 menyimpan dan memvalidasi pilihan.
5. #22 membuat transaksi order.
6. Product dan Product Offer adalah entity berbeda.
7. Cart Item harus mengacu pada selected offer.
8. Variant harus spesifik jika diperlukan.
9. Quantity harus divalidasi backend.
10. Add to Cart tidak otomatis reserve stock pada MVP.
11. Inventory source of truth tetap #24.
12. Cart price bukan final guaranteed transaction price.
13. Price change harus transparan.
14. Availability change harus ditampilkan.
15. Compatibility conflict tidak boleh dilewati diam-diam.
16. Alternative product harus diberi label jelas.
17. Mandatory product requirement tetap mengikuti #19.
18. Recommended product tidak wajib dibeli.
19. Additional cost tidak boleh muncul secara diam-diam.
20. Multi-seller cart boleh secara UX.
21. Seller berbeda dapat menghasilkan order berbeda di #22.
22. Same offer dapat merge quantity.
23. Different offer tidak otomatis digabung.
24. Cart dapat digunakan untuk direct purchase maupun service-related purchase.
25. Cart dapat memiliki asset/service/maintenance context.
26. Worker tidak otomatis mempunyai purchase authority.
27. AI tidak boleh mengubah cart tanpa authorization.
28. AI bukan source of truth untuk price/stock/compatibility.
29. Cart revalidation wajib dilakukan pada titik kritis.
30. Cart conversion harus dapat diaudit.
31. Cart tidak menangani payment.
32. Cart tidak menangani fulfillment.
33. Cart tidak menangani shipping.
34. Cart tidak menangani refund.
35. Cart bukan source of truth inventory.
36. Cart item invalid tidak boleh diam-diam diproses.
37. Historical completed order tidak berubah karena current cart.
38. Cart event dapat digunakan untuk analytics dan AI/ML.
39. Cart abandonment tidak otomatis dianggap negative ML label.
40. Backend authorization wajib ditegakkan.

---

# 104. Final Architecture

```text
                    PRODUCT DISCOVERY
                           #20
                            │
                            ↓
                    SELECT PRODUCT
                            │
                            ↓
                     ┌─────────────┐
                     │   #21 CART  │
                     └─────────────┘
                            │
              ┌─────────────┼─────────────┐
              ↓             ↓             ↓
          Cart Items     Cart Groups    Context
              │             │             │
              ↓             ↓             ↓
          Quantity       Seller        Service
          Variant        Grouping      Asset
          Offer          Fulfillment   Maintenance
              │             │           Requirement
              └─────────────┼─────────────┘
                            ↓
                       VALIDATION
                            │
      ┌─────────────┬───────┼────────┬─────────────┐
      ↓             ↓       ↓        ↓             ↓
    Product       Offer   Inventory  Compatibility Approval
      │             │       │        │             │
      └─────────────┴───────┼────────┴─────────────┘
                            ↓
                         READY
                            │
                            ↓
                   SELECT FOR ORDER
                            │
                            ↓
                     #22 PRODUCT ORDER
```

---

# 105. Hubungan #21 dengan Seluruh Ecosystem

```text
                    SERVICE SIDE

#14 Service History ──────┐
#15 Asset ────────────────┤
#16 Maintenance ──────────┤
#17 Rebooking ────────────┤
#18 AI / Recommendation ──┤
#19 Service + Product ────┤
                          ↓
                   #20 PRODUCT DISCOVERY
                          ↓
                       #21 CART
                          ↓
                    #22 PRODUCT ORDER
                          ↓
                    #23 PAYMENT
                          ↓
                    #24 INVENTORY
                          ↓
                   #25 FULFILLMENT
                          ↓
                 #26 SHIPPING & TRACKING
                          ↓
                    #27 RETURN / REFUND
```

---

# 106. MVP Scope

```text
✅ Create Cart
✅ Persistent Cart
✅ Add Item
✅ Remove Item
✅ Update Quantity
✅ Variant
✅ Product Offer
✅ Seller Grouping
✅ Multi-Seller Cart
✅ Item Selection
✅ Price Snapshot
✅ Availability Validation
✅ Compatibility Validation
✅ Service Requirement Context
✅ Approval Context
✅ Cart Summary
✅ Invalid Item State
✅ Price Change State
✅ Out-of-Stock State
✅ Proceed to Order
✅ Cart Events
```

---

# 107. Scale-Up

Potential scale-up:

```text
Guest Cart
Cart Merge
Advanced Bundles
Subscription Cart
Scheduled Replenishment
Smart Cart Optimization
AI Cart Assistant
Bulk Purchase
Enterprise Procurement
Budget Approval
Cost Center
Purchase Limit
Shared Organizational Cart
```

Scale-up tidak boleh mengubah core business flow #21.

---

# 108. Final Scope Statement

> **Feature #21 Cart adalah transaction preparation layer Servio yang menyimpan selected product, variant, offer, seller, quantity, dan context pembelian, kemudian melakukan validasi terhadap product, offer, availability, compatibility, pricing context, dan approval sebelum item diteruskan menuju Product Order (#22). Cart dapat digunakan untuk direct purchase maupun kebutuhan service/maintenance dan dapat menampung produk dari multiple seller, tetapi tidak menjadi source of truth untuk inventory, order, payment, fulfillment, shipping, atau return/refund.**

---

# 109. LOCKED STATUS

## Feature #21 — Cart

```text
✅ Cart Purpose
✅ Cart Ownership
✅ Cart Context
✅ Cart Item
✅ Product / Variant / Offer Relationship
✅ Multi-Seller Cart
✅ Seller Group
✅ Quantity
✅ Quantity Validation
✅ Add to Cart ≠ Stock Reservation
✅ Price Snapshot
✅ Price Revalidation
✅ Availability Revalidation
✅ Compatibility Validation
✅ Mandatory Requirement
✅ Recommended Requirement
✅ Alternative Product
✅ No Silent Substitution
✅ Service Integration
✅ Asset Context
✅ Maintenance Context
✅ Reorder Context
✅ Cart Selection
✅ Cart Total
✅ Seller Grouping
✅ Cart Item Status
✅ Cart Lifecycle
✅ Persistent Cart
✅ Cart Merge Concept
✅ Guest Cart Concept
✅ Error & Edge Cases
✅ AI Boundary
✅ Analytics Events
✅ Role & Access
✅ Data Model
✅ Source of Truth
✅ Cross-Feature Dependencies
✅ Handoff to #22
✅ MVP Scope
✅ Scale-Up Scope
✅ Business Rules
✅ Final Architecture
```

---

# 110. Roadmap Position

```text
SERVICE / JASA
#1  Discovery ✅
#2  Booking Jasa ✅
#3  Order Jasa ✅
#4  Pricing & Quotation ✅
#5  Communication ✅
#6  Payment & Protection ✅
#7  Service Execution ✅
#8  Tracking Detail ✅
#9  Proof of Service ✅
#10 Completion & Customer Confirmation ✅
#11 Rating & Review ✅
#12 Complaint / Dispute ✅
#13 Warranty ✅
#14 Service History ✅
#15 Asset ✅
#16 Maintenance & Reminder ✅
#17 Rebooking / Favorite / Loyalty ✅
#18 Smart Recommendation & AI Agent ✅
#19 Service + Product Integration ✅

PRODUCT / BARANG
#20 Product Discovery ✅
#21 Cart ✅
#22 Booking / Order Barang
#23 Payment Barang
#24 Inventory
#25 Fulfillment
#26 Shipping & Tracking
#27 Return / Refund
```
