# SERVIO — FEATURE #24 INVENTORY
## Final Business Flow & Domain Specification

**Status:** FINAL / LOCKED  
**Roadmap:** #24 of #27  
**Domain:** PRODUCT / BARANG  
**Previous Features:** #20 Product Discovery, #21 Cart, #22 Booking / Order Barang, #23 Payment Barang  
**Next Features:** #25 Fulfillment, #26 Shipping & Tracking, #27 Return / Refund

> **Catatan arsitektur:** Feature #24 adalah **stock authority** Servio. Inventory menjadi source of truth untuk stock state dan stock movement pada product/variant berdasarkan owner dan location. Inventory dipisahkan dari Product Catalog, Cart, Order, Booking, Payment, Fulfillment, Shipping, dan Return/Refund.

---

# 1. Definisi

**Inventory** adalah sistem yang menjadi **source of truth untuk stock state dan stock movement** dari product/variant pada seller/location tertentu.

Contoh:

```text
Capacitor 35+5 uF
Seller A
Warehouse Bandung

On Hand:
20

Reserved:
5

Available:
15
```

Inventory menjawab:

> **"Barang ini sebenarnya punya berapa stok, ada di mana, berapa yang tersedia, berapa yang sudah di-reserve, berapa yang dialokasikan, dan apakah masih bisa digunakan untuk transaksi?"**

---

# 2. Tujuan Feature #24

Inventory bertugas untuk:

1. Menyimpan quantity stock.
2. Menentukan stock availability.
3. Menangani reservation.
4. Menangani release reservation.
5. Menangani allocation.
6. Menangani consumption.
7. Mencatat stock movement.
8. Mengelola stock per location.
9. Mencegah overselling.
10. Menangani stock adjustment.
11. Menangani damaged/quarantine stock.
12. Menangani stock reconciliation.
13. Menyediakan availability signal ke #20.
14. Menerima reservation/order signal dari #22/#22B.
15. Menyediakan inventory state untuk #25 Fulfillment.
16. Menangani return-to-inventory flow dari #27.
17. Menjaga audit trail seluruh perubahan inventory.

---

# 3. Prinsip Utama

```text
#20 Product Discovery
=
Menemukan produk
```

```text
#21 Cart
=
Menyimpan pilihan
```

```text
#22 Order / Booking
=
Membuat transaksi / reservasi
```

```text
#23 Payment
=
Pembayaran
```

```text
🔥 #24 Inventory
=
Mengetahui & mengontrol stock
```

```text
#25 Fulfillment
=
Memproses dan memenuhi barang
```

---

# 4. Boundary dengan #20 Product Discovery

#20 hanya menampilkan availability signal.

```text
#20 Product Discovery
       ↓
Availability Signal
       ↓
#24 Inventory
```

Contoh:

```text
AVAILABLE
LIMITED
OUT_OF_STOCK
```

Namun:

> **#20 bukan source of truth stock.**

---

# 5. Boundary dengan #21 Cart

Cart menjawab:

> "Customer ingin membeli berapa?"

Inventory menjawab:

> "Berapa yang tersedia sekarang?"

```text
Cart Quantity
≠
Inventory Reserved Quantity
```

**Add to Cart tidak otomatis mengurangi stock.**

---

# 6. Boundary dengan #22A Order

Order:

> "Customer resmi memesan barang."

Inventory:

> "Apakah jumlah tersebut bisa dialokasikan?"

Flow:

```text
#22A Order
   ↓
Inventory Reservation Request
   ↓
#24 Inventory
   ↓
RESERVED / PARTIALLY_RESERVED / FAILED
```

---

# 7. Boundary dengan #22B Booking

Booking dapat meminta reservation:

```text
#22B Booking
   ↓
Reservation Request
   ↓
#24 Inventory
```

Booking tidak boleh menyatakan reservation successful sebelum inventory mengonfirmasi.

---

# 8. Boundary dengan #23 Payment

Payment dan inventory adalah domain berbeda.

```text
Payment
=
Customer sudah membayar
```

```text
Inventory
=
Stock sudah tersedia / dialokasikan
```

Possible state:

```text
Payment = PAID
Inventory = RESERVATION_FAILED
```

atau kondisi lain yang memerlukan reconciliation.

---

# 9. Boundary dengan #25 Fulfillment

Inventory menyediakan stock untuk fulfillment.

```text
#24 Inventory
      ↓
Allocated / Pickable Stock
      ↓
#25 Fulfillment
```

Fulfillment menjalankan:

```text
Pick
Pack
Handover
```

Inventory mencatat stock consequence.

---

# 10. Boundary dengan #26 Shipping

Inventory tidak menjalankan shipment.

```text
#24 Inventory
↓
Fulfillment Context
↓
#26 Shipping
```

---

# 11. Boundary dengan #27 Return / Refund

Return yang diterima dapat masuk kembali ke inventory melalui proses inspection/disposition.

```text
#27 Return
↓
Returned Product Received
↓
#24 Inventory
↓
RESTOCK / QUARANTINE / DAMAGED
```

---

# 12. Product Catalog vs Inventory

```text
Product Catalog
=
"Produk ini ada sebagai product."
```

```text
Inventory
=
"Seller A memiliki 20 unit produk ini di Warehouse Bandung."
```

Jadi:

```text
Product ≠ Inventory
```

---

# 13. Product Offer vs Inventory

Offer:

```text
Seller A
Rp85.000
```

Inventory:

```text
Seller A
Warehouse Bandung
20 units
```

Secara konseptual:

```text
Product
 ↓
Variant
 ↓
Offer
 ↓
Inventory Source / Location
```

---

# 14. Inventory Owner

Inventory owner dapat berupa:

```text
MERCHANT
SUPPLIER
SERVICE_PROVIDER
SERVIO
```

Contoh:

```text
Merchant A Stock
Supplier B Stock
Provider C Material Stock
Servio-owned Stock
```

---

# 15. Provider Inventory

Inventory #24 tidak hanya untuk ecommerce seller.

Provider dapat mempunyai material stock sendiri.

Contoh:

```text
Provider:
AC Service

Material:
Capacitor 35+5 uF

Stock:
10 units
```

Provider dapat menggunakan stock tersebut untuk service.

---

# 16. Inventory Scope

Inventory record minimal terikat pada:

```text
Owner
+
Product / Variant
+
Location
```

Contoh:

```text
Merchant A
+
Capacitor 35+5 uF
+
Warehouse Bandung
```

---

# 17. Inventory Location

Location dapat berupa:

```text
Warehouse
Store
Service Center
Workshop
Provider Storage
Distribution Center
Pickup Point
```

---

# 18. Multiple Locations

Satu owner dapat mempunyai banyak lokasi.

Contoh:

```text
Seller A

Warehouse Bandung
20

Store Cimahi
5

Warehouse Jakarta
50
```

Total physical stock:

```text
75
```

Namun availability customer dapat berbeda berdasarkan location.

---

# 19. Location Availability

Contoh:

```text
Bandung
AVAILABLE

Jakarta
AVAILABLE

Cimahi
OUT_OF_STOCK
```

Location-aware discovery di #20 dapat menggunakan information tersebut.

---

# 20. Warehouse Hierarchy

Arsitektur dapat mendukung:

```text
Organization
   ↓
Location
   ↓
Warehouse
   ↓
Zone
   ↓
Bin
```

MVP tidak harus sampai bin-level.

Namun data model sebaiknya tidak menghambat scale-up.

---

# 21. Stock Quantity Model

Jangan hanya:

```text
stock = 20
```

Minimal pisahkan:

```text
ON_HAND
RESERVED
ALLOCATED
UNAVAILABLE
AVAILABLE
```

---

# 22. On Hand

**On Hand** adalah physical stock yang tercatat berada di location.

```text
On Hand = 20
```

---

# 23. Reserved

**Reserved** adalah stock yang sudah disisihkan untuk order/booking/reservation tetapi belum benar-benar diproses fulfillment.

```text
Reserved = 5
```

---

# 24. Allocated

**Allocated** adalah stock yang sudah ditetapkan untuk fulfillment tertentu dan tidak lagi bebas digunakan transaksi lain.

```text
Allocated = 3
```

---

# 25. Unavailable

Physical stock yang ada tetapi tidak dapat dijual/digunakan:

```text
DAMAGED
QUARANTINE
QUALITY_HOLD
EXPIRED
BLOCKED
```

Contoh:

```text
On Hand = 20
Unavailable = 2
```

---

# 26. Available

Model dasar:

```text
AVAILABLE
=
ON_HAND
-
RESERVED
-
ALLOCATED
-
UNAVAILABLE
```

Contoh:

```text
On Hand = 20
Reserved = 5
Allocated = 3
Unavailable = 2

Available = 10
```

---

# 27. Safety Stock

Seller dapat mempunyai safety stock.

Contoh:

```text
On Hand:
20

Safety Stock:
5
```

Sellable availability:

```text
15
```

Secara konseptual:

```text
Available
-
Safety Stock
=
Sellable Available
```

---

# 28. Safety Stock Governance

Safety stock dapat diatur berdasarkan:

```text
Global Policy
Category
Product
Warehouse
Seller
```

Jika platform memiliki minimum reserve rule, seller tidak boleh melanggarnya.

---

# 29. Stock Availability Status

Customer-facing status:

```text
AVAILABLE
LIMITED
OUT_OF_STOCK
PRE_ORDER
UNKNOWN
```

Contoh:

```text
Available = 10
→ AVAILABLE
```

```text
Available = 2
→ LIMITED
```

```text
Available = 0
→ OUT_OF_STOCK
```

Threshold LIMITED configurable.

---

# 30. Inventory Status

Inventory item/location dapat memiliki:

```text
ACTIVE
INACTIVE
BLOCKED
QUARANTINED
ARCHIVED
```

Lifecycle status dipisahkan dari quantity state.

---

# 31. Stock Reservation

Reservation adalah fungsi utama #24.

Contoh:

```text
Available:
10

Request:
3
```

Inventory:

```text
Reserve 3
```

menjadi:

```text
On Hand:
10

Reserved:
3

Available:
7
```

---

# 32. Reservation Ownership

Setiap reservation harus mengetahui:

```text
Who
What
How Many
For Which Transaction
At Which Location
Until When
Status
```

Minimal:

```text
Reservation ID
Order ID / Booking ID
Product
Variant
Quantity
Location
Created At
Expires At
Status
```

---

# 33. Reservation Status

Core:

```text
PENDING
RESERVED
ALLOCATED
CONSUMED
RELEASE_REQUESTED
RELEASED
EXPIRED
FAILED
CANCELLED
```

---

# 34. Reservation Lifecycle

Normal:

```text
REQUEST
 ↓
PENDING
 ↓
RESERVED
 ↓
ALLOCATED
 ↓
CONSUMED
```

Release:

```text
RESERVED
 ↓
RELEASED
```

Expiry:

```text
RESERVED
 ↓
EXPIRED
 ↓
RELEASED
```

---

# 35. Reservation ≠ Allocation

### Reserved

Stock disisihkan.

### Allocated

Stock sudah ditetapkan untuk fulfillment/picking.

```text
RESERVED
↓
ALLOCATED
```

---

# 36. Reservation ≠ Consumption

Stock belum benar-benar consumed hanya karena reserve.

Consumption terjadi ketika barang digunakan/fulfillment selesai sesuai inventory rule.

```text
Reservation
≠
Consumption
```

---

# 37. Reservation Expiry

Reservation memiliki:

```text
expires_at
```

Contoh:

```text
Reserved:
10:00

Expires:
10:30
```

Jika tidak diproses:

```text
EXPIRED
↓
RELEASE
```

---

# 38. Payment Countdown + Inventory Reservation

Feature #23 memiliki payment countdown.

Contoh:

```text
Payment Deadline:
10:30

Inventory Reservation:
Expires 10:30
```

Flow:

```text
Order
↓
Reserve Stock
↓
Payment Countdown
```

Jika payment expired:

```text
Payment EXPIRED
↓
Order Resolution
↓
Inventory Reservation RELEASED
```

---

# 39. Booking + Inventory Reservation

Contoh:

```text
Booking:
Pickup 14:00

Reservation:
Product reserved
Until 14:30
```

Jika booking expired:

```text
Booking EXPIRED
↓
Inventory RELEASE
```

---

# 40. Multiple Deadlines

Transaction dapat mempunyai:

```text
Payment Deadline
Booking Expiry
Inventory Reservation Expiry
```

Jangan membuat satu timestamp universal.

Masing-masing domain menyimpan deadline-nya sendiri.

Namun semuanya harus direkonsiliasi.

---

# 41. Effective Reservation Window

Secara konseptual:

```text
Reservation Validity
=
min(
Payment Constraint,
Booking Constraint,
Inventory Policy Constraint,
Order Constraint
)
```

Actual domain tetap menyimpan deadline masing-masing.

Tujuan:

```text
Payment valid
≠
Stock reservation guaranteed
```

---

# 42. Race Condition Payment vs Reservation

Contoh:

```text
Payment Deadline:
10:30

Inventory Reservation:
10:30

Customer paid:
10:29:59

Provider callback:
10:30:04
```

Inventory tidak boleh release hanya karena callback terlambat.

Harus direkonsiliasi berdasarkan:

```text
Payment Transaction Time
Provider Confirmation
Reservation State
Order State
```

---

# 43. Overselling Prevention

Contoh:

```text
Available:
5
```

Customer A:

```text
Request:
4
```

Customer B:

```text
Request:
3
```

System tidak boleh menghasilkan:

```text
A = 4 reserved
B = 3 reserved
```

karena total 7 > 5.

---

# 44. Atomic Reservation

Conceptual:

```text
Check Available
↓
Reserve
↓
Commit
```

harus dilakukan secara transaction-safe/atomic.

Tidak boleh bergantung hanya pada client-side check.

---

# 45. Concurrent Order

Contoh:

```text
Available = 1

Customer A → Reserve
Customer B → Reserve
```

Hanya satu reservation yang dapat berhasil untuk unit tersebut.

Concurrency protection wajib.

---

# 46. Stock Movement Ledger

Current balance saja tidak cukup.

Harus ada:

```text
Stock Movement Ledger
```

Contoh:

```text
+20 RECEIVED
-3 CONSUMED
+3 RELEASED
-2 DAMAGED
+5 ADJUSTMENT
```

---

# 47. Stock Movement Types

Core:

```text
RECEIPT
RESERVATION
RELEASE
ALLOCATION
PICK
CONSUMPTION
TRANSFER_OUT
TRANSFER_IN
ADJUSTMENT_IN
ADJUSTMENT_OUT
DAMAGE
QUARANTINE
UNQUARANTINE
RETURN_IN
WRITE_OFF
```

---

# 48. Immutable Movement Ledger

Movement event tidak boleh dihapus/edit diam-diam.

Jika salah:

```text
Wrong Movement
```

gunakan:

```text
Correction Movement
```

bukan menghapus historical event.

---

# 49. Stock Transfer

Stock dapat berpindah location:

```text
Warehouse Bandung
↓
Warehouse Jakarta
```

Flow:

```text
TRANSFER_OUT
↓
IN_TRANSIT
↓
TRANSFER_IN
```

---

# 50. In-Transit Stock

Stock yang sedang dipindahkan:

```text
IN_TRANSIT
```

tidak boleh dihitung sebagai available stock source/destination secara salah.

---

# 51. Transfer Failure

Transfer gagal harus masuk:

```text
EXCEPTION
↓
RECONCILIATION
```

Tidak boleh langsung menambah stock destination tanpa valid source effect.

---

# 52. Receiving

Supplier/merchant menerima stock:

```text
Shipment
↓
Receive
↓
Inventory Receipt
```

Movement:

```text
RECEIPT
```

---

# 53. Putaway

Scale-up:

```text
Receive
↓
Quality Check
↓
Putaway
↓
Bin
```

MVP tidak harus mendukung warehouse management sedetail ini.

---

# 54. Damaged Stock

Stock rusak:

```text
AVAILABLE
↓
DAMAGED
```

Physical quantity tetap ada, tetapi tidak sellable.

---

# 55. Quarantine

Stock yang membutuhkan pemeriksaan:

```text
AVAILABLE
↓
QUARANTINE
```

Tidak dapat dijual sampai released.

---

# 56. Expired Product

Untuk product tertentu:

```text
AVAILABLE
↓
EXPIRED
```

kemudian:

```text
UNAVAILABLE
```

atau write-off sesuai policy.

---

# 57. Lot / Batch

Product tertentu dapat mendukung:

```text
LOT
BATCH
```

Contoh:

```text
Chemical Cleaner

Batch B001
Batch B002
```

---

# 58. Serial Number

Product unit-specific dapat menggunakan:

```text
Serial Number
```

Contoh:

```text
Electronic Device
Specific Equipment
```

---

# 59. Batch vs Serial

```text
Batch
=
Group Identity
```

```text
Serial
=
Unit Identity
```

MVP dapat menggunakan quantity-based stock untuk kategori tertentu dan scale ke serial tracking bila diperlukan.

---

# 60. FIFO / FEFO

Kategori tertentu dapat membutuhkan:

```text
FIFO
FEFO
```

Inventory menyimpan batch metadata yang diperlukan.

Detail picking berada di #25 Fulfillment.

---

# 61. Inventory Adjustment

Authorized actor dapat melakukan adjustment.

Contoh:

```text
System:
100

Physical:
97
```

Adjustment:

```text
-3
```

Wajib ada:

```text
Reason
Actor
Timestamp
Evidence / Note jika diperlukan
```

---

# 62. Stock Opname

Inventory harus mendukung reconciliation antara:

```text
System Stock
vs
Physical Stock
```

Contoh:

```text
System:
100

Physical:
98

Variance:
-2
```

---

# 63. Reconciliation Lifecycle

```text
OPEN
↓
COUNTING
↓
VARIANCE_FOUND
↓
UNDER_REVIEW
↓
ADJUSTED
↓
CLOSED
```

---

# 64. Adjustment Authorization

Customer tidak dapat melakukan inventory adjustment.

Worker juga tidak otomatis memiliki permission.

Authority:

```text
Merchant / Supplier
→ Own Inventory

Provider
→ Own Material Inventory

Admin / Operations
→ Authorized Adjustment / Reconciliation

CEO / Product Owner
→ Governance / Analytics
```

---

# 65. Provider Inventory Adjustment

Provider dapat mengelola material stock miliknya.

Worker dapat report usage:

```text
"Used 1"
```

tetapi inventory transaction harus dilakukan melalui authorized inventory operation.

---

# 66. Consumption untuk Service

Contoh:

```text
Provider Inventory
Capacitor:
10
```

Teknisi menggunakan:

```text
1
```

Inventory:

```text
SERVICE_CONSUMPTION
-1
```

Consumption dapat dikaitkan dengan:

```text
Service Order
Execution
Product Requirement
Asset
```

---

# 67. Service Consumption ≠ Product Sale

Provider memakai material sendiri:

```text
Provider Inventory
↓
Service Execution
↓
Consume Material
```

belum tentu berarti customer membeli product secara terpisah.

Pisahkan:

```text
SERVICE_CONSUMPTION
```

dari:

```text
CUSTOMER_SALE
```

---

# 68. Customer-Owned Product

Jika customer membawa product sendiri:

```text
Customer-Owned Product
≠
Servio Inventory
```

Product tersebut dapat menjadi service/product context, tetapi tidak otomatis masuk inventory seller.

---

# 69. Inventory vs Asset

```text
Inventory
=
Stock of Products
```

```text
Asset
=
Specific owned/serviceable object
```

Contoh:

```text
10 Capacitors in warehouse
=
Inventory
```

sedangkan:

```text
Capacitor yang sudah dipasang pada AC customer
=
Asset Component / Service Context
```

---

# 70. Installation Transition

Contoh:

```text
Inventory:
Capacitor

↓ SERVICE CONSUMPTION

Product Installed
↓
#19 Service + Product Integration
↓
#15 Asset Component
↓
#14 Service History
```

Inventory berkurang.

Asset/Service History mendapatkan context baru.

---

# 71. Inventory + Product Warranty

Product yang keluar dari inventory dapat memiliki product warranty.

Warranty information tetap mengikuti #13.

Inventory bertanggung jawab terhadap physical stock/traceability.

---

# 72. Return into Inventory

Return flow:

```text
#27 Return
↓
Product Received
↓
#24 Inventory Inspection
```

Result:

```text
RESTOCK
QUARANTINE
DAMAGED
WRITE_OFF
```

---

# 73. Returned Product Tidak Otomatis Available

Returned item:

```text
RETURN_RECEIVED
```

bukan otomatis:

```text
AVAILABLE
```

Harus melewati disposition/inspection sesuai policy.

---

# 74. Restock

Jika inspection lolos:

```text
RETURNED
↓
INSPECTION PASSED
↓
RESTOCK
↓
AVAILABLE
```

---

# 75. Failed Restock

Jika kondisi buruk:

```text
RETURNED
↓
INSPECTION FAILED
↓
QUARANTINE / DAMAGED
```

---

# 76. Reservation Release

Release dapat terjadi karena:

```text
Payment Expired
Order Cancelled
Booking Expired
Reservation Expired
Seller Reject
System Exception
```

---

# 77. Reservation Release Rule

Release harus:

```text
Idempotent
Auditable
Traceable
```

Contoh:

```text
Reservation R001
Qty 3
```

dua release request tidak boleh menghasilkan:

```text
+6
```

---

# 78. Partial Release

Contoh:

```text
Reservation:
10
```

customer membatalkan 4:

```text
Release:
4

Remaining Reserved:
6
```

Partial release harus didukung.

---

# 79. Partial Reservation

Request:

```text
Qty 10
```

Available:

```text
6
```

Jika policy mendukung:

```text
PARTIALLY_RESERVED
```

contoh:

```text
Reserved:
6

Unfulfilled:
4
```

Customer/order harus mengetahui kondisi tersebut.

---

# 80. Backorder

Jika partial reservation tidak diizinkan:

```text
Stock = 6
Order = 10
```

system dapat menghasilkan:

```text
BACKORDER
```

atau:

```text
FAILED
```

sesuai product/seller policy.

---

# 81. Pre-Order Inventory

Pre-order bukan ready stock.

```text
Expected Future Supply
≠
Available Now
```

Pre-order dapat menggunakan:

```text
Expected Supply
Pre-Order Capacity
```

yang berbeda dari ready inventory.

---

# 82. Inbound Stock

Inventory dapat mencatat:

```text
Expected Inbound
```

contoh:

```text
Current:
0

Inbound:
100

Expected:
15 October
```

UI customer harus membedakan:

```text
Available Now
vs
Coming Soon
```

---

# 83. Inventory Forecast

Scale-up:

```text
On Hand
+
Inbound
-
Reserved
-
Expected Demand
```

dapat digunakan untuk forecasting.

Forecast bukan current stock.

---

# 84. Inventory Visibility

### Customer

```text
Available
Limited
Out of Stock
```

### Merchant

```text
On Hand
Reserved
Allocated
Damaged
```

### Provider

```text
Own Material Stock
```

### Worker

```text
Authorized Stock Context
```

### Admin

```text
Full Operational Inventory
```

### CEO

```text
Aggregate Analytics
```

---

# 85. Inventory Privacy

Customer tidak perlu mengetahui exact warehouse stock kecuali platform memilih untuk menampilkannya.

Contoh public:

```text
Only a few left
```

bukan wajib:

```text
Warehouse Bandung has exactly 3 units
```

---

# 86. Inventory Anti-Overselling

Core:

```text
Available
↓
Atomic Reservation
↓
Reserved
```

Concurrency protection wajib.

---

# 87. Event-Driven Inventory

Perubahan penting menghasilkan events:

```text
INVENTORY_RECEIVED
INVENTORY_RESERVED
INVENTORY_RELEASED
INVENTORY_ALLOCATED
INVENTORY_CONSUMED
INVENTORY_ADJUSTED
INVENTORY_TRANSFERRED
INVENTORY_QUARANTINED
INVENTORY_RESTOCKED
```

---

# 88. Event Consumers

Events dapat digunakan oleh:

```text
#20 Product Discovery
#22 Order
#22B Booking
#25 Fulfillment
#26 Shipping
#18 AI / Recommendation
Admin Dashboard
Analytics
```

---

# 89. Low Stock

System dapat menghasilkan:

```text
LOW_STOCK
```

contoh:

```text
Available = 2
Minimum = 5
```

dapat menghasilkan alert ke seller/provider/admin.

---

# 90. Stockout

Jika:

```text
Available = 0
```

customer-facing:

```text
OUT_OF_STOCK
```

Product tetap dapat:

```text
PUBLISHED
```

di catalog.

Product status dan inventory availability adalah hal berbeda.

---

# 91. Negative Stock

MVP:

> **Negative sellable stock tidak diperbolehkan.**

Negative stock bukan normal sales state.

Exception hanya dapat muncul sebagai controlled reconciliation scenario bila dibutuhkan.

---

# 92. Stock Correction

Jika ditemukan inconsistency:

```text
-1 stock
```

jangan:

```text
Overwrite Current Balance
```

gunakan:

```text
Inventory Reconciliation
+
Correction Movement
```

---

# 93. Inventory Lock / Concurrency

Inventory harus aman terhadap:

```text
Concurrent Orders
Concurrent Reservations
Concurrent Transfers
Concurrent Adjustments
```

Implementation dapat menggunakan database transaction, locking, atomic update, atau mechanism equivalent.

---

# 94. Idempotency

Critical inventory commands harus idempotent:

```text
Reserve
Release
Allocate
Consume
Transfer
Receive
Adjustment
```

Request duplicate tidak boleh menggandakan stock movement.

---

# 95. Inventory Audit

Critical movement mencatat:

```text
Actor
Action
Inventory
Product
Location
Quantity
Reference
Reason
Timestamp
Result
```

---

# 96. Inventory Analytics

Admin/CEO dapat melihat:

```text
Stock Level
Stockout Rate
Reservation Rate
Reservation Expiry
Inventory Turnover
Slow Moving Stock
Damaged Stock
Quarantine
Adjustment Variance
Demand by Location
Product Availability
```

---

# 97. AI Integration

Feature #18 dapat menggunakan inventory data untuk:

```text
Demand Forecast
Stockout Prediction
Alternative Seller Recommendation
Inventory Replenishment Suggestion
Slow-Moving Stock Detection
```

AI tidak boleh:

```text
❌ Mengubah stock langsung
❌ Membuat adjustment diam-diam
❌ Mengklaim stock tersedia tanpa actual inventory data
```

---

# 98. Discovery Integration

#20 menggunakan signal:

```text
Available
Limited
Out of Stock
```

yang berasal dari inventory.

---

# 99. Order Integration

#22 mengirim:

```text
Reservation Request
```

#24 mengembalikan:

```text
RESERVED
PARTIALLY_RESERVED
FAILED
```

---

# 100. Booking Integration

#22B mengirim:

```text
Reservation Request
```

#24 mengembalikan:

```text
RESERVED
FAILED
```

---

# 101. Payment Integration

#23 dapat menghasilkan:

```text
Payment Expired
```

dan inventory menerima:

```text
Release Reservation
```

Payment tidak mengubah inventory balance secara langsung.

---

# 102. Fulfillment Integration

#25 dapat meminta:

```text
Allocate Stock
```

#24 mengkonfirmasi:

```text
ALLOCATED
```

Setelah fulfillment memproses product:

```text
Pick
↓
Consume / Fulfillment Movement
```

---

# 103. Return Integration

#27 dapat mengirim:

```text
Returned Product Received
```

#24 menentukan disposition:

```text
RESTOCK
QUARANTINE
DAMAGED
WRITE_OFF
```

---

# 104. Stale Availability

Contoh:

```text
#20 Discovery:
Available
```

kemudian:

```text
#24 Inventory:
Out of Stock
```

Customer harus diberitahu saat critical transaction validation.

Discovery tidak menjamin stock.

---

# 105. Reservation Release Race

Jika:

```text
Release R001
Release R001
```

hasil:

```text
Released once
```

bukan double release.

---

# 106. Partial Allocation

Contoh:

```text
Reserved:
10
```

Fulfillment hanya allocate:

```text
7
```

maka:

```text
Allocated:
7

Remaining Reserved:
3
```

Resolution mengikuti policy.

---

# 107. Inventory Hold

Admin dapat memberi temporary hold:

```text
Quality Hold
Admin Hold
Investigation
Damage Review
Risk Review
```

Status:

```text
ACTIVE
RELEASED
EXPIRED
```

Hold mengurangi sellable availability sesuai policy.

---

# 108. Inventory Governance

## CEO / Product Owner

```text
Inventory Policy
Reservation Policy
Safety Stock Policy
Stock Governance
Marketplace Rules
```

## Admin / Operations

```text
Adjustment
Reconciliation
Exception
Operations
```

## Merchant / Supplier / Provider

```text
Own Inventory
```

---

# 109. Customer-Side Flow

```text
#20 Product Discovery
        ↓
Product Available
        ↓
#21 Cart
        ↓
#22 Order
        ↓
#23 Payment
        ↓
#24 Inventory Reservation
        ↓
#25 Fulfillment
```

---

# 110. Service-Side Flow

```text
Service
   ↓
#19 Product Requirement
   ↓
#20 Product Discovery
   ↓
#21 Cart / Sourcing
   ↓
#22 Order / Booking
   ↓
#23 Payment
   ↓
#24 Inventory
   ↓
Provider / Merchant Stock
   ↓
#25 Fulfillment / Service Execution
   ↓
Product Consumption
   ↓
#19 / #15 / #14
```

---

# 111. Return Flow

```text
#27 Return / Refund
        ↓
Returned Product Received
        ↓
#24 Inventory Inspection
        ↓
┌───────────────┬───────────────┬──────────────┐
↓               ↓               ↓              ↓
RESTOCK      QUARANTINE      DAMAGED       WRITE_OFF
↓               ↓               ↓
AVAILABLE    HOLD           UNAVAILABLE
```

---

# 112. Final Inventory Architecture

```text
                    PRODUCT CATALOG
                         #20
                          │
                          ↓
                    PRODUCT / VARIANT
                          │
                          ↓
                    🔥 #24 INVENTORY
                          │
             ┌────────────┼────────────┐
             ↓            ↓            ↓
          ON_HAND      RESERVED     UNAVAILABLE
             │            │            │
             └────────────┼────────────┘
                          ↓
                    CALCULATE AVAILABLE
                          │
           ┌──────────────┼──────────────┐
           ↓              ↓              ↓
       AVAILABLE       LIMITED       OUT_OF_STOCK
           │
           ↓
       RESERVATION
           │
      ┌────┴────┐
      ↓         ↓
   RELEASE    ALLOCATE
      │         │
      ↓         ↓
 AVAILABLE   FULFILLMENT
                #25
                  │
                  ↓
               CONSUME
```

---

# 113. Full Product Transaction Flow

```text
#20 Product Discovery
       ↓
#21 Cart
       ↓
#22A Order
       ↓
#22B Booking jika diperlukan
       ↓
#23 Payment
       ↓
🔥 #24 Inventory
       ↓
Reservation / Allocation
       ↓
#25 Fulfillment
       ↓
#26 Shipping
       ↓
#27 Return / Refund
       ↓
#24 Inventory
       ↓
Restock / Quarantine / Damage
```

---

# 114. Source of Truth Matrix

| Domain | Source of Truth |
|---|---|
| Product | #20 |
| Cart | #21 |
| Order | #22A |
| Booking | #22B |
| Payment | #23 |
| **Inventory** | **#24** |
| Fulfillment | #25 |
| Shipping | #26 |
| Return / Refund | #27 |
| Asset | #15 |
| Service Requirement | #19 |

---

# 115. Source of Truth Rule

#24 menjadi source of truth untuk:

```text
On Hand
Available
Reserved
Allocated
Unavailable
Inventory Location
Stock Movement
Reservation
Inventory Allocation
Inventory Adjustment
Inventory Transfer
Inventory Reconciliation
Inventory Hold
```

Bukan source of truth untuk:

```text
Product Catalog → #20
Cart → #21
Order → #22A
Booking → #22B
Payment → #23
Fulfillment → #25
Shipping → #26
Return Decision → #27
```

---

# 116. Important Business Rules

1. **#24 Inventory adalah source of truth stock.**
2. Product Catalog ≠ Inventory.
3. Product Offer ≠ Inventory.
4. Cart ≠ Inventory.
5. Add to Cart tidak reserve stock pada MVP.
6. Order dapat memicu inventory reservation.
7. Booking dapat memicu inventory reservation.
8. Reservation harus dikonfirmasi oleh inventory.
9. Payment tidak otomatis berarti stock allocated.
10. Inventory tidak otomatis berarti payment paid.
11. Inventory tidak menangani payment.
12. Inventory tidak menangani order lifecycle.
13. Inventory tidak menangani fulfillment execution.
14. Inventory tidak menangani shipping.
15. Inventory tidak memutuskan return.
16. Inventory harus mencegah overselling.
17. Reservation harus concurrency-safe.
18. Reservation harus idempotent.
19. Release harus idempotent.
20. Allocation berbeda dari reservation.
21. Consumption berbeda dari reservation.
22. On Hand berbeda dari Available.
23. Reserved berbeda dari Allocated.
24. Unavailable stock tidak boleh sellable.
25. Safety stock dapat membatasi sellable availability.
26. Multi-location harus didukung.
27. Stock transfer harus dicatat.
28. In-transit stock tidak boleh dihitung sebagai available secara salah.
29. Adjustment harus audit-able.
30. Inventory movement harus immutable secara prinsip.
31. Reconciliation digunakan untuk discrepancy correction.
32. Negative sellable stock tidak diperbolehkan sebagai normal state.
33. Provider dapat mempunyai inventory material sendiri.
34. Service consumption berbeda dari direct product sale.
35. Customer-owned product bukan seller inventory.
36. Installed product dapat keluar dari inventory dan masuk asset/service-history context.
37. Return product tidak otomatis menjadi available.
38. Returned product harus melalui disposition/inspection.
39. Pre-order bukan ready stock.
40. Inbound stock bukan current available stock.
41. Discovery availability adalah signal, bukan guarantee.
42. Critical transaction harus revalidate inventory.
43. Payment, booking, dan inventory deadline harus direkonsiliasi.
44. AI tidak boleh mengarang stock.
45. AI tidak boleh mengubah inventory tanpa authorized action.
46. Backend authorization wajib ditegakkan.
47. Semua critical inventory mutation harus memiliki audit.
48. Semua critical inventory command harus idempotent.
49. Stock visibility mengikuti role dan least privilege.
50. Inventory data dapat menjadi input analytics/recommendation.

---

# 117. Role & Access

## Customer

```text
VIEW_AVAILABILITY
VIEW_LOCATION_AVAILABILITY jika diizinkan
```

Tidak dapat:

```text
EDIT_STOCK
ADJUST_STOCK
MANAGE_RESERVATION_ARBITRARILY
```

## Merchant

```text
VIEW_OWN_INVENTORY
RECEIVE_STOCK
ADJUST_OWN_STOCK
TRANSFER_OWN_STOCK
MANAGE_OWN_LOCATIONS
```

## Supplier

```text
VIEW_OWN_INVENTORY
RECEIVE
ADJUST
SUPPLY_AUTHORIZED_DEMAND
```

## Provider

```text
VIEW_OWN_MATERIAL_INVENTORY
RECEIVE
CONSUME
ADJUST
TRANSFER
```

## Worker

```text
VIEW_AUTHORIZED_STOCK
REPORT_USAGE
REQUEST_MATERIAL
```

Jika diberi permission:

```text
RECORD_CONSUMPTION
```

## Admin / Operations

```text
VIEW_PLATFORM_INVENTORY
INVESTIGATE
ADJUST_UNDER_POLICY
RECONCILE
MANAGE_EXCEPTIONS
```

## CEO / Product Owner

```text
ANALYZE
GOVERN_INVENTORY_POLICY
SET_MARKETPLACE_RULES
MONITOR_STOCK_HEALTH
```

---

# 118. Permission Principle

Tetap:

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

Backend wajib menegakkan authorization.

---

# 119. Data Model

Core entities:

```text
inventory_items
inventory_locations
inventory_balances
inventory_reservations
inventory_allocations
inventory_movements
inventory_transfers
inventory_adjustments
inventory_reconciliations
inventory_lots
inventory_serials
inventory_holds
inventory_events
```

---

# 120. inventory_items

Conceptual:

```text
id
owner_id
owner_type
product_id
variant_id
inventory_type
status
created_at
updated_at
```

---

# 121. inventory_locations

Conceptual:

```text
id
owner_id
location_type
name
address_reference
status
```

---

# 122. inventory_balances

Conceptual:

```text
id
inventory_item_id
location_id
on_hand
reserved
allocated
unavailable
safety_stock
available
updated_at
```

`available` idealnya merupakan derived/calculated value yang konsisten dengan inventory formula/policy.

---

# 123. inventory_reservations

Conceptual:

```text
id
inventory_item_id
location_id
order_id
booking_id
product_id
variant_id
quantity
status
reserved_at
expires_at
released_at
```

Tidak semua reference selalu terisi.

---

# 124. inventory_allocations

Conceptual:

```text
id
reservation_id
order_id
fulfillment_id
location_id
quantity
status
allocated_at
released_at
```

---

# 125. inventory_movements

Conceptual:

```text
id
inventory_item_id
location_id
movement_type
quantity
reference_type
reference_id
reason
actor_id
created_at
```

Movement ledger harus immutable secara prinsip.

---

# 126. inventory_transfers

Conceptual:

```text
id
inventory_item_id
from_location_id
to_location_id
quantity
status
initiated_at
received_at
```

---

# 127. inventory_adjustments

Conceptual:

```text
id
inventory_item_id
location_id
quantity_delta
reason
evidence_reference
requested_by
approved_by
created_at
```

---

# 128. inventory_reconciliations

Conceptual:

```text
id
inventory_item_id
location_id
system_quantity
counted_quantity
variance
status
created_at
closed_at
```

---

# 129. inventory_lots

Conceptual:

```text
id
inventory_item_id
lot_number
batch_number
received_at
expiry_at
status
```

---

# 130. inventory_serials

Conceptual:

```text
id
inventory_item_id
serial_number
status
location_id
```

---

# 131. inventory_holds

Conceptual:

```text
id
inventory_item_id
location_id
quantity
hold_type
status
reason
created_at
released_at
```

---

# 132. inventory_events

Minimum:

```text
INVENTORY_RECEIVED
INVENTORY_RESERVED
INVENTORY_RELEASED
INVENTORY_ALLOCATED
INVENTORY_CONSUMED
INVENTORY_ADJUSTED
INVENTORY_TRANSFER_OUT
INVENTORY_TRANSFER_IN
INVENTORY_QUARANTINED
INVENTORY_RESTOCKED
INVENTORY_RECONCILIATION_STARTED
INVENTORY_RECONCILIATION_CLOSED
```

---

# 133. Inventory Lifecycle

High-level:

```text
RECEIVED
↓
AVAILABLE
↓
RESERVED
↓
ALLOCATED
↓
CONSUMED
```

Alternative:

```text
AVAILABLE
↓
QUARANTINED
↓
AVAILABLE
```

or:

```text
RESERVED
↓
RELEASED
↓
AVAILABLE
```

---

# 134. Reservation Lifecycle

```text
PENDING
↓
RESERVED
↓
ALLOCATED
↓
CONSUMED
```

or:

```text
RESERVED
↓
RELEASED
```

atau:

```text
RESERVED
↓
EXPIRED
↓
RELEASED
```

---

# 135. Transfer Lifecycle

```text
REQUESTED
↓
APPROVED
↓
IN_TRANSIT
↓
RECEIVED
```

Exception:

```text
IN_TRANSIT
↓
EXCEPTION
↓
RECONCILIATION
```

---

# 136. Reconciliation Lifecycle

```text
OPEN
↓
COUNTING
↓
VARIANCE_FOUND
↓
UNDER_REVIEW
↓
ADJUSTED
↓
CLOSED
```

---

# 137. End-to-End — Customer Purchase

```text
#20 Product Discovery
↓
Product Available
↓
#21 Cart
↓
#22A Order
↓
#23 Payment
↓
#24 Inventory Reservation
↓
Reserved
↓
#25 Fulfillment
↓
Allocation
↓
Pick / Pack
↓
Inventory Consumption
↓
#26 Shipping
```

---

# 138. End-to-End — Payment Expired

```text
#22A Order
↓
#23 Payment
↓
COUNTDOWN
↓
EXPIRED
↓
Order Resolution
↓
#24 Release Inventory Reservation
↓
Available Stock Restored
```

---

# 139. End-to-End — Booking Expired

```text
#22B Booking
↓
Reservation
↓
#24 Inventory
↓
RESERVED
↓
Booking EXPIRED
↓
Reservation RELEASED
↓
Stock Available Again
```

---

# 140. End-to-End — Provider Material

```text
Provider Inventory
↓
Capacitor = 10
↓
Service Execution
↓
Consume = 1
↓
Inventory = 9
↓
#19 Product Usage
↓
#15 Asset / #14 Service History
```

---

# 141. End-to-End — Return

```text
#27 Return
↓
Product Received
↓
#24 Inventory Inspection
↓
PASSED
↓
RESTOCK
↓
AVAILABLE
```

Jika gagal:

```text
FAILED
↓
QUARANTINE / DAMAGED
```

---

# 142. MVP Scope

```text
✅ Inventory Item
✅ Product / Variant Link
✅ Owner
✅ Location
✅ On Hand
✅ Reserved
✅ Allocated
✅ Unavailable
✅ Available
✅ Reservation
✅ Reservation Expiry
✅ Reservation Release
✅ Allocation
✅ Consumption
✅ Stock Movement
✅ Receive Stock
✅ Adjustment
✅ Low Stock
✅ Out of Stock
✅ Multi-Location
✅ Basic Transfer
✅ Basic Reconciliation
✅ Seller / Provider Inventory
✅ Order Integration
✅ Booking Integration
✅ Payment Expiry Integration
✅ Fulfillment Integration
✅ Return / Restock Integration
✅ Audit
✅ Idempotency
✅ Role & Access
✅ Analytics Events
```

---

# 143. Scale-Up

Potential future capabilities:

```text
Warehouse Management
Bin-Level Inventory
Batch / Lot
Serial Number
FIFO / FEFO
Advanced Transfer
Cycle Counting
Demand Forecast
Auto Replenishment
Purchase Planning
Supplier Lead Time
Inventory Optimization
Multi-Warehouse Routing
Smart Allocation
AI Stock Forecasting
IoT / Smart Warehouse
```

---

# 144. Final Scope Statement

> **Feature #24 Inventory adalah stock authority Servio yang mengelola quantity, location, reservation, allocation, consumption, stock movement, adjustment, transfer, reconciliation, hold, dan inventory availability untuk product/variant milik merchant, supplier, provider, atau Servio. Inventory menjadi source of truth untuk stock state dan memastikan transaksi tidak menghasilkan overselling. Feature #24 menerima request dari Order/Booking, memberikan availability/reservation result ke domain terkait, serta menyediakan stock state kepada Fulfillment. Inventory tidak mengambil alih fungsi Product Discovery, Cart, Order, Booking, Payment, Fulfillment, Shipping, atau Return Decision.**

---

# 🔒 145. LOCKED STATUS — FEATURE #24

```text
✅ Inventory Definition
✅ Stock Authority
✅ Product vs Inventory
✅ Offer vs Inventory
✅ Inventory Owner
✅ Merchant Inventory
✅ Supplier Inventory
✅ Provider Material Inventory
✅ Multi-Location
✅ Warehouse Context
✅ On Hand
✅ Reserved
✅ Allocated
✅ Unavailable
✅ Available
✅ Safety Stock
✅ Availability Status
✅ Reservation
✅ Reservation Ownership
✅ Reservation Lifecycle
✅ Reservation Expiry
✅ Reservation Release
✅ Partial Reservation
✅ Partial Release
✅ Allocation
✅ Consumption
✅ Overselling Prevention
✅ Atomic Reservation
✅ Concurrency Safety
✅ Stock Movement Ledger
✅ Movement Types
✅ Immutable Movement Principle
✅ Receiving
✅ Transfer
✅ In Transit
✅ Adjustment
✅ Stock Opname
✅ Reconciliation
✅ Damaged
✅ Quarantine
✅ Expired
✅ Lot / Batch Concept
✅ Serial Concept
✅ FIFO / FEFO Scale-Up
✅ Service Consumption
✅ Customer-Owned Product Boundary
✅ Asset Boundary
✅ Product Installation Handoff
✅ Return → Inventory
✅ Restock
✅ Low Stock
✅ Stockout
✅ Negative Stock Rule
✅ Inventory Holds
✅ Payment Deadline Integration
✅ Booking Deadline Integration
✅ Order Integration
✅ Fulfillment Integration
✅ Shipping Boundary
✅ Return Boundary
✅ AI Boundary
✅ Analytics
✅ Role & Access
✅ Security
✅ Idempotency
✅ Audit
✅ Data Model
✅ Source of Truth
✅ Cross-Feature Dependency
✅ Edge Cases
✅ MVP
✅ Scale-Up
✅ Final Architecture
```

---

# 146. Roadmap Position

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
#22 Booking / Order Barang ✅
#23 Payment Barang ✅
#24 Inventory ✅
#25 Fulfillment
#26 Shipping & Tracking
#27 Return / Refund
```

---

# 147. Final Locked Principle

> **#24 Inventory adalah "single source of truth" untuk stock. #20 menemukan produk, #21 mengumpulkan pilihan, #22 membuat order/booking, #23 memproses payment, #24 memastikan stock benar-benar tersedia dan terkontrol, #25 memenuhi barang, #26 mengirim, dan #27 menangani return/refund yang kemudian dapat menghasilkan restock/quarantine/damage pada inventory.**
