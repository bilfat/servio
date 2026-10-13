# SERVIO — FEATURE #22 BOOKING / ORDER BARANG
## Final Business Flow & Domain Specification

**Status:** FINAL / LOCKED  
**Roadmap:** #22 of #27  
**Domain:** PRODUCT / BARANG  
**Previous Feature:** #21 Cart  
**Next Features:** #23 Payment Barang, #24 Inventory, #25 Fulfillment, #26 Shipping & Tracking, #27 Return / Refund

> **Catatan arsitektur:** Roadmap #22 tetap satu feature, tetapi domainnya secara internal dibagi menjadi:
>
> - **#22A — Order Barang**
> - **#22B — Booking Barang**
>
> Keduanya memiliki fungsi berbeda dan tidak boleh dianggap sebagai hal yang sama.

---

# PART A — #22A ORDER BARANG

# 1. Definisi Order Barang

**Order Barang** adalah proses mengubah selected items dari Cart menjadi **transaksi pembelian resmi** antara customer dan seller.

```text
#21 Cart
   ↓
Order Creation
   ↓
Order Preview
   ↓
Customer Confirmation
   ↓
Official Product Order
```

Order menjawab:

> **"Barang apa yang resmi saya pesan, dari seller mana, berapa jumlahnya, dan berapa nilai transaksinya?"**

---

# 2. Tujuan Order Barang

Order Barang bertujuan untuk:

1. Mengubah selected cart items menjadi transaksi resmi.
2. Menetapkan seller dan order items.
3. Menyimpan transaction snapshot.
4. Menetapkan quantity dan commercial amount.
5. Menyediakan unique order number.
6. Menangani seller acceptance.
7. Menangani cancellation.
8. Menjadi sumber historical transaction.
9. Menjadi dasar handoff ke Payment, Inventory, Fulfillment, Shipping, dan Return/Refund.
10. Menjaga auditability dan historical integrity.

---

# 3. Boundary dengan #21 Cart

### Cart

```text
"Barang ini ingin saya beli."
```

### Order

```text
"Barang ini resmi saya pesan."
```

Contoh:

```text
Cart
Capacitor
Qty 1
Rp85.000
```

setelah customer melakukan confirmation:

```text
Order
ORD-20260920-000123
Capacitor
Qty 1
Rp85.000
Seller A
```

---

# 4. Boundary dengan #23 Payment

Order dan payment dipisahkan.

```text
#22 Order
=
What is being purchased?
```

```text
#23 Payment
=
How is it paid?
```

Contoh:

```text
Order:
CONFIRMED

Payment:
PENDING
```

atau:

```text
Order:
PENDING_PAYMENT

Payment:
UNPAID
```

Payment status tidak boleh menjadi duplicate dari order status.

---

# 5. Boundary dengan #24 Inventory

Order membutuhkan informasi dan/atau reservation stock, tetapi inventory tetap source of truth.

```text
#22 Order
      ↓
Reservation Request
      ↓
#24 Inventory
```

Order tidak menyimpan stock quantity sebagai source of truth.

---

# 6. Boundary dengan #25 Fulfillment

Order menjawab:

> Apa yang harus dipenuhi?

Fulfillment menjawab:

> Bagaimana barang dipersiapkan dan dipenuhi?

```text
#22 Order
   ↓
#25 Fulfillment
```

---

# 7. Boundary dengan #26 Shipping

Order menyediakan delivery/destination context.

Shipping menangani:

```text
Courier
Shipment
Delivery
Tracking
```

Jadi:

```text
#22 = Order
#26 = Shipping Execution
```

---

# 8. Boundary dengan #27 Return / Refund

Order menjadi historical transaction basis.

Return/refund kemudian menggunakan:

```text
Order
+
Order Item
```

sebagai basis.

Order lama tidak dihapus hanya karena terjadi return/refund.

---

# 9. Order Creation Flow

```text
#21 Cart
   ↓
Selected Items
   ↓
Validate Cart
   ↓
Create Order Preview
   ↓
Customer Review
   ↓
Confirm Order
   ↓
Create Official Order
   ↓
#23 Payment
```

---

# 10. Order Preview

Sebelum official order dibuat, customer melihat:

```text
Products
Variants
Quantity
Seller
Unit Price
Subtotal
Discount
Applicable Charges
Delivery Context
Service Context jika ada
Total
```

Order Preview belum menjadi transaksi final.

---

# 11. Order Intent

Untuk kebutuhan draft/preparation, dapat ada:

```text
Order Intent / Draft
```

Flow:

```text
Cart
↓
Order Intent
↓
Customer Confirm
↓
Official Order
```

**Order Intent ≠ Official Order**

---

# 12. Customer Explicit Confirmation

Customer harus melakukan explicit action:

```text
Confirm Order
```

Membuka halaman order preview saja tidak berarti order sudah dibuat.

---

# 13. Order Number

Official order memiliki unique order number.

Contoh:

```text
ORD-20260920-000123
```

Internal Order ID dapat berbeda dengan visible order number.

---

# 14. Multi-Seller Order

Satu cart dapat berisi beberapa seller.

```text
Cart
├── Seller A
│   ├── Product A
│   └── Product B
└── Seller B
    └── Product C
```

Ketika dibuat menjadi order:

```text
Order Group
├── Order A — Seller A
└── Order B — Seller B
```

Satu checkout dapat menghasilkan beberapa seller order.

---

# 15. Order Group

Disarankan ada:

```text
Order Group
```

yang merepresentasikan satu checkout/customer transaction context.

Contoh:

```text
ORDER GROUP #OG-001
     │
     ├── ORDER #001 — Seller A
     └── ORDER #002 — Seller B
```

---

# 16. Order Item

Satu order dapat memiliki banyak item.

```text
Order
 ├── Order Item A
 ├── Order Item B
 └── Order Item C
```

Setiap item minimal menyimpan:

```text
Product
Variant
Offer
Seller
Quantity
Unit Price
Subtotal
Context
```

---

# 17. Product ≠ Order Item

```text
Product
=
Catalog Entity
```

```text
Order Item
=
Historical Commercial Selection
```

Order Item harus memiliki snapshot yang diperlukan untuk menjaga historical integrity.

---

# 18. Transaction Snapshot

Order tidak boleh hanya reference current catalog.

Contoh saat order dibuat:

```text
Product:
Capacitor 35+5 uF

Price:
Rp85.000
```

Jika catalog kemudian berubah menjadi Rp95.000, historical order tetap:

```text
Rp85.000
```

---

# 19. Snapshot Data

Minimal:

```text
Product Name
Product SKU / Part Number
Variant
Brand
Seller
Offer
Unit Price
Quantity
Item Subtotal
Relevant Specification
```

---

# 20. Price Lock

Setelah official order dibuat:

> **Historical transaction price menjadi bagian dari order snapshot.**

```text
Catalog Price
≠
Historical Order Price
```

---

# 21. Quantity Snapshot

Quantity pada official order menjadi transaction snapshot.

Perubahan stock setelah order tidak otomatis mengubah:

```text
Ordered Quantity
```

Perubahan harus melalui authorized modification/cancellation flow.

---

# 22. Order Context

Supported contexts:

```text
DIRECT_PURCHASE
SERVICE_RELATED
MAINTENANCE_RELATED
ASSET_RELATED
REPLACEMENT
REORDER
PROCUREMENT
```

---

# 23. Service-Related Product Order

Flow:

```text
Service
↓
#19 Product Requirement
↓
#20 Product Discovery
↓
#21 Cart
↓
#22A Order
```

Relasi harus traceable:

```text
Service
 ↓
Product Requirement
 ↓
Cart Item
 ↓
Order Item
```

---

# 24. Maintenance-Related Order

```text
Maintenance
↓
Product Need
↓
#20 Discovery
↓
#21 Cart
↓
#22A Order
```

Order dapat menyimpan maintenance context.

---

# 25. Asset-Related Order

```text
Asset
↓
Compatible Product
↓
Cart
↓
Order
```

Order Item dapat memiliki:

```text
Asset ID
```

sebagai purchase context.

---

# 26. Reorder

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
#20 Revalidation
↓
#21 Cart
↓
#22A Order
```

Harga, seller, offer, dan availability tetap divalidasi kembali.

---

# 27. Order Type

Recommended:

```text
DIRECT_PURCHASE
SERVICE_RELATED
MAINTENANCE_RELATED
REPLACEMENT
REORDER
PROCUREMENT
```

Booking bukan order type utama; booking merupakan capability/layer yang dapat terkait dengan order.

---

# 28. Order Lifecycle

Core order status:

```text
PENDING_CONFIRMATION
CONFIRMED
PROCESSING
READY_FOR_FULFILLMENT
PARTIALLY_FULFILLED
FULFILLED
COMPLETED
CANCEL_REQUESTED
CANCELLED
FAILED
```

---

# 29. Status Meaning

### PENDING_CONFIRMATION
Belum menjadi official confirmed order.

### CONFIRMED
Order resmi dibuat.

### PROCESSING
Order sedang diproses.

### READY_FOR_FULFILLMENT
Siap diproses fulfillment.

### PARTIALLY_FULFILLED
Sebagian item telah dipenuhi.

### FULFILLED
Semua item terpenuhi.

### COMPLETED
Lifecycle order selesai sesuai policy.

### CANCEL_REQUESTED
Ada cancellation request.

### CANCELLED
Order dibatalkan.

### FAILED
Order gagal dibuat/diproses sesuai reason.

---

# 30. Pisahkan Domain Status

Jangan membuat satu status super besar.

Gunakan state terpisah:

```text
ORDER STATUS
PAYMENT STATUS
FULFILLMENT STATUS
SHIPMENT STATUS
RETURN STATUS
```

Contoh:

```text
Order:
CONFIRMED

Payment:
PAID

Fulfillment:
PROCESSING

Shipment:
NOT_STARTED

Return:
NONE
```

---

# 31. Seller Acceptance

Seller dapat memiliki state sendiri:

```text
PENDING
ACCEPTED
REJECTED
EXPIRED
```

Contoh:

```text
Order = CONFIRMED
Seller Acceptance = PENDING
```

---

# 32. Seller Rejection

Jika seller reject:

```text
Seller
↓
REJECT
```

system dapat mengikuti policy:

```text
Alternative Seller
Cancel Item
Cancel Order
Resolution
```

Financial impact mengikuti #23/#27.

---

# 33. Partial Acceptance

Multi-seller atau multi-item mendukung kondisi:

```text
Seller A → ACCEPTED
Seller B → REJECTED
```

Order Group tidak otomatis dianggap seluruhnya gagal.

---

# 34. Backorder / Pre-Order Context

Availability dapat berupa:

```text
READY
BACKORDER
PRE_ORDER
```

Source availability tetap #24.

Pre-order scheduling/reservation dibahas di #22B Booking Barang.

---

# 35. Order Notes

Customer dapat memberikan note:

```text
"Mohon dikemas dengan aman."
```

Tetapi note bukan pengganti:

```text
Product Requirement
Technical Specification
Service Instruction
```

---

# 36. Delivery Address

Jika membutuhkan delivery, order memiliki delivery context.

Address source berasal dari shared address capability.

Order menyimpan snapshot/reference yang menjaga historical integrity.

---

# 37. Address Snapshot

Contoh:

```text
Recipient Name
Phone
Address
City
Postal Code
Location Context
```

Snapshot berlaku untuk transaksi tersebut meskipun profile customer berubah setelahnya.

---

# 38. Pickup Context

Order dapat memiliki:

```text
FULFILLMENT_METHOD
=
DELIVERY
PICKUP
```

Jika pickup membutuhkan slot:

```text
#22B Booking Barang
```

---

# 39. Shipping Context

Order dapat membawa:

```text
Shipping Required
Delivery Address
Delivery Preference
```

Detail courier/shipment berada di #26.

---

# 40. Order Total

Minimal:

```text
Item Subtotal
+
Discount
+
Applicable Platform Fee
+
Applicable Delivery Charge
+
Other Allowed Charge
=
Total
```

Tax tetap **tidak masuk scope** sesuai keputusan sebelumnya.

---

# 41. Discount Snapshot

Jika promo digunakan, transaction snapshot harus menyimpan:

```text
Discount Rule
Discount Amount
Applied At
```

Historical order tidak berubah karena promo current catalog berubah.

---

# 42. Platform Fee

Platform fee mengikuti governance Feature #6.

Order dapat menyimpan:

```text
Fee Type
Fee Basis
Fee Amount
Fee Policy Version
```

untuk audit dan historical integrity.

---

# 43. No Silent Additional Charges

Order total tidak boleh bertambah tanpa basis policy yang sah.

Additional cost yang membutuhkan customer approval harus melalui approval/confirmation flow.

---

# 44. Order Modification

Official order tidak boleh diedit bebas.

Perubahan:

```text
Quantity
Product
Offer
Address
Seller
```

dapat membutuhkan:

```text
Modification Request
```

atau:

```text
Cancel + New Order
```

sesuai status/policy.

---

# 45. Product Substitution

Seller tidak boleh diam-diam mengganti:

```text
Product A
```

menjadi:

```text
Product B
```

karena stock issue.

Replacement harus mengikuti authorized policy/approval.

---

# 46. Cancellation

Cancellation record minimal:

```text
Actor
Reason
Timestamp
Status
Financial Impact
```

Reason contoh:

```text
CUSTOMER_REQUEST
SELLER_REJECTED
PAYMENT_FAILED
OUT_OF_STOCK
POLICY
SYSTEM_ERROR
```

---

# 47. Cancellation Boundary

```text
#22 = Order cancellation record
#23 = Payment financial impact
#24 = Inventory effect
#25 = Fulfillment stop/effect
#26 = Shipment cancellation/effect
#27 = Refund
```

---

# 48. Order Completion

Order Completed bukan sekadar Payment Paid.

Contoh:

```text
Payment = PAID
Shipment = DELIVERED
Order = COMPLETED
```

Exact completion criteria dapat bergantung pada fulfillment/return policy.

---

# 49. Order History

Customer dapat melihat:

```text
Order Number
Seller
Products
Quantity
Price
Status
Date
Delivery Context
Payment Status
```

Order History berbeda dari Service History #14.

---

# 50. Notification Events

Order dapat menghasilkan:

```text
Order Created
Payment Required
Seller Accepted
Seller Rejected
Order Processing
Ready
Shipped
Delivered
Cancelled
```

Delivery notification ditangani notification infrastructure.

---

# 51. Customer Flow

```text
#21 Cart
   ↓
Review Order
   ↓
Address / Delivery Context
   ↓
Review Items
   ↓
Review Seller
   ↓
Review Total
   ↓
Confirm Order
   ↓
Official Order
   ↓
#23 Payment
```

---

# 52. Provider Flow

Provider dapat melihat/manajemen order yang terkait service sesuai authorization:

```text
Service Context
↓
Product Requirement
↓
Product Selection
↓
Cart
↓
Order
```

---

# 53. Worker Flow

Default:

```text
Worker ≠ Automatically Purchaser
```

Worker dapat search/request/select product sesuai permission.

Purchase/order action hanya boleh dilakukan bila permission tersebut memang diberikan.

---

# 54. Merchant Flow

Merchant menerima authorized seller order:

```text
New Order
↓
Review
↓
Accept
↓
Process
↓
Fulfill
```

Merchant hanya menerima data customer yang diperlukan untuk transaksi.

---

# 55. Supplier Flow

```text
Authorized Procurement Order
↓
Review
↓
Accept
↓
Supply
```

---

# 56. Admin Flow

Admin dapat:

```text
View Order
Investigate
Handle Exception
Controlled Cancellation
Manage Escalation
```

Intervention harus dapat diaudit.

---

# 57. CEO / Product Owner

CEO/PO berfokus pada:

```text
Analyze
Govern Order Policy
Commercial Policy
Cancellation Policy
Marketplace Metrics
```

Bukan mengedit order customer sehari-hari.

---

# 58. Role × Order

| Role | Access |
|---|---|
| Customer | Create / View / Confirm / Cancel Own Order |
| Provider | View / Manage Authorized Service-Related Order |
| Worker | View / Execute Assigned Product Context |
| Merchant | View / Accept / Process Own Seller Order |
| Supplier | View / Process Authorized Supply Order |
| Admin/Ops | View / Manage Exceptions / Controlled Intervention |
| CEO/PO | Analyze / Configure Governance |

---

# 59. Security

Backend harus mengecek:

```text
Actor
Role
Permission
Order
Scope
Current Status
Requested Action
```

UI hiding bukan security boundary.

---

# 60. Idempotency

Create Order harus aman dari duplicate submission.

```text
Confirm Order
↓
Request sent 2x
```

harus tetap menghasilkan satu transaction result melalui idempotency mechanism.

---

# 61. Audit Trail

Order creation minimal dapat ditelusuri:

```text
Cart ID
Customer
Selected Items
Price Snapshot
Confirmation
Order Creation
```

Critical actions mencatat:

```text
Actor
Action
Target
Timestamp
Reason
Result
```

---

# 62. Order Event Log

Minimum:

```text
ORDER_CREATED
ORDER_CONFIRMED
SELLER_ACCEPTED
SELLER_REJECTED
ORDER_PROCESSING
ORDER_READY_FOR_FULFILLMENT
ORDER_PARTIALLY_FULFILLED
ORDER_FULFILLED
ORDER_COMPLETED
CANCELLATION_REQUESTED
ORDER_CANCELLED
```

---

# 63. Order Data Model

Core:

```text
product_order_groups
product_orders
product_order_items
product_order_contexts
product_order_price_snapshots
product_order_address_snapshots
product_order_status_history
product_order_events
product_order_seller_acceptance
product_order_cancellation_requests
```

---

# 64. product_order_groups

Conceptual:

```text
id
customer_id
status
currency
total_amount
created_at
updated_at
```

---

# 65. product_orders

Conceptual:

```text
id
order_group_id
customer_id
seller_id
order_type
status
currency
subtotal
discount
platform_fee
delivery_charge
total_amount
created_at
updated_at
```

---

# 66. product_order_items

Conceptual:

```text
id
order_id
product_id
variant_id
offer_id
product_name_snapshot
variant_snapshot
sku_snapshot
seller_snapshot
unit_price
quantity
subtotal
status
```

---

# 67. product_order_contexts

Conceptual:

```text
order_id
service_order_id
product_requirement_id
asset_id
maintenance_plan_id
source_type
source_id
```

Tidak semua field harus selalu terisi.

---

# 68. product_order_price_snapshots

Conceptual:

```text
order_id
item_id
price
discount
fee
total
policy_version
captured_at
```

---

# 69. product_order_address_snapshots

Conceptual:

```text
order_id
recipient_name
phone
address_line
district
city
postal_code
location_context
captured_at
```

---

# 70. product_order_seller_acceptance

Conceptual:

```text
order_id
seller_id
status
responded_at
reason
```

---

# 71. product_order_cancellation_requests

Conceptual:

```text
order_id
requested_by
reason
status
financial_impact
requested_at
resolved_at
```

---

# 72. Order Source of Truth

#22A menjadi source of truth untuk:

```text
Official Product Order
Order Number
Order Items
Transaction Snapshot
Seller Relationship
Order Lifecycle
Cancellation Record
Order Context
```

Bukan source of truth untuk:

```text
Product Catalog → #20
Cart → #21
Payment → #23
Inventory → #24
Fulfillment → #25
Shipping → #26
Return / Refund → #27
```

---

# 73. Order → Payment Handoff

```text
#22A Order
   ↓
Payment Context
   ↓
#23 Payment
```

Handoff:

```text
Order ID
Amount Due
Currency
Payment Context
```

---

# 74. Order → Inventory Handoff

```text
#22A Order
   ↓
Inventory Reservation Request
   ↓
#24 Inventory
```

Possible result:

```text
RESERVED
PARTIALLY_RESERVED
FAILED
```

---

# 75. Order → Fulfillment Handoff

Setelah precondition terpenuhi:

```text
#22A Order
   ↓
#25 Fulfillment
```

---

# 76. Order → Shipping Handoff

```text
#25 Fulfillment
   ↓
#26 Shipping
```

#22 tidak membuat shipment secara langsung.

---

# 77. Order → Return Handoff

```text
Order
   ↓
Return Eligibility
   ↓
#27 Return / Refund
```

---

# 78. Order Edge Cases

System harus menangani:

```text
Price Changed
Stock Changed
Seller Suspended
Payment Failed
Inventory Reservation Failed
Seller Rejected
Duplicate Submission
Order Cancellation
Partial Acceptance
Partial Fulfillment
Product Substitution Request
Address Issue
```

---

# 79. Final Order Architecture

```text
                    #21 CART
                       │
                       ↓
                 VALIDATE ITEMS
                       │
                       ↓
                 ORDER PREVIEW
                       │
                       ↓
              CUSTOMER CONFIRMATION
                       │
                       ↓
                #22A ORDER BARANG
                       │
          ┌────────────┼──────────────┐
          ↓            ↓              ↓
       #23 PAY      #24 STOCK      #22B BOOKING*
          │            │              │
          └────────────┼──────────────┘
                       ↓
                 #25 FULFILLMENT
                       ↓
                  #26 SHIPPING
                       ↓
                #27 RETURN/REFUND

* Booking hanya jika kebutuhan produk/transaksi memang membutuhkannya.
```

---

# PART B — #22B BOOKING BARANG

# 80. Definisi Booking Barang

**Booking Barang** adalah reservation/scheduling layer Servio yang digunakan ketika product membutuhkan:

```text
Reservation
Pickup Slot
Pre-Order
Collection Appointment
```

Booking tidak menggantikan Order.

```text
Booking ≠ Order
```

---

# 81. Tujuan Booking Barang

Booking bertujuan untuk:

1. Reservasi product/offer.
2. Menjadwalkan pickup/collection.
3. Menentukan slot waktu.
4. Mendukung pre-order.
5. Mengelola reservation duration.
6. Mencegah double booking.
7. Mengatur reschedule.
8. Menangani expiration dan no-show.
9. Menghubungkan booking dengan order.
10. Menjadi scheduling layer yang terpisah dari payment, inventory, fulfillment, shipping, dan return.

---

# 82. Kapan Booking Dibutuhkan?

Tidak semua pembelian membutuhkan booking.

### Barang biasa

```text
#20 Discovery
↓
#21 Cart
↓
#22A Order
↓
#23 Payment
```

### Pickup

```text
#22A Order
↓
#22B Pickup Booking
```

### Reservation

```text
#20 Discovery
↓
#22B Reservation
↓
#22A Order
```

### Pre-Order

```text
#20 Discovery
↓
#22B Pre-Order Booking
↓
#22A Order
```

---

# 83. Core Principle

```text
ORDER
=
Commercial Commitment

BOOKING
=
Reservation / Scheduling

INVENTORY
=
Stock Authority

FULFILLMENT
=
Preparation / Handover Execution
```

---

# 84. Boundary dengan #22A Order

### Order

```text
Product
Variant
Offer
Seller
Quantity
Commercial Amount
```

### Booking

```text
Reservation
Slot
Schedule
Booking Window
Pickup Window
Allocation Request
```

---

# 85. Boundary dengan #24 Inventory

Booking dapat request reservation:

```text
#22B Booking
      ↓
Reservation Request
      ↓
#24 Inventory
```

Booking tidak boleh menyatakan reserved sebelum #24 mengonfirmasi.

---

# 86. Booking Type

Master Booking Type dikontrol platform.

Core:

```text
RESERVATION
PICKUP_SLOT
PRE_ORDER
COLLECTION_APPOINTMENT
```

Scale-up:

```text
WAITLIST
TIME_WINDOW
LIMITED_RELEASE
ALLOCATION
```

---

# 87. Reservation

Reservation berarti customer meminta product dialokasikan untuk periode tertentu.

Contoh:

```text
Product:
Battery
Qty:
1

Reservation:
30 minutes
```

---

# 88. Reservation Lifecycle

```text
NOT_RESERVED
RESERVATION_PENDING
RESERVED
RELEASE_REQUESTED
RELEASED
EXPIRED
CONSUMED
```

Reservation state dipisahkan dari general booking status.

---

# 89. Pickup Slot

Pickup flow:

```text
Order
↓
Pickup Location
↓
Available Slot
↓
Booking
```

Contoh:

```text
20 September 2026
14:00–15:00
```

---

# 90. Pre-Order

Pre-order digunakan ketika product belum available for immediate fulfillment.

Harus menjelaskan:

```text
Expected Availability
Expected Fulfillment
Price Condition
Cancellation Rule
```

Pre-order tidak boleh ditampilkan seolah-olah ready stock.

---

# 91. Collection Appointment

Dapat digunakan untuk:

```text
Pickup
Warehouse Collection
Counter Collection
Special Handover
```

---

# 92. Booking Intent

Sebelum official booking:

```text
Booking Intent
↓
Slot Selection
↓
Booking Preview
↓
Confirm Booking
↓
Official Booking
```

Membuka slot page bukan berarti booking berhasil.

---

# 93. Booking Confirmation

Customer melihat:

```text
Product
Quantity
Seller
Location
Date
Time
Reservation Duration
Policy
Expiry
```

lalu:

```text
Confirm Booking
```

---

# 94. Booking ID

Contoh:

```text
BKG-20260920-000123
```

Booking ID berbeda dari Order ID.

---

# 95. Booking Relation

Booking dapat berhubungan dengan:

```text
Product
Variant
Offer
Order
Order Group
Seller
Location
Cart
Inventory Reservation
```

Tidak semua field wajib untuk semua booking type.

---

# 96. Booking Context

Supported:

```text
DIRECT_PRODUCT
ORDER_PICKUP
PRE_ORDER
SERVICE_RELATED
MAINTENANCE_RELATED
ASSET_RELATED
```

---

# 97. Seller Booking Configuration

Seller dapat mengaktifkan capability platform:

```text
Reservation
Pickup Slot
Pre-Order
Collection
```

Seller tidak membuat custom booking lifecycle sendiri.

---

# 98. Seller Availability

Booking hanya tersedia jika seller/offer/location mendukungnya.

Contoh:

```text
Pickup Available = Yes
```

atau:

```text
Pickup Available = No
```

---

# 99. Booking Location

Untuk pickup/collection:

```text
Seller Store
Warehouse
Collection Point
Partner Location
```

Location sebaiknya menjadi reference ke location entity.

---

# 100. Slot

Slot memiliki:

```text
Date
Start Time
End Time
Capacity
Status
```

Availability dipengaruhi:

```text
Operating Hours
Capacity
Holiday
Seller Availability
Location Capacity
Existing Bookings
Policy
```

---

# 101. Slot Capacity vs Product Stock

Keduanya berbeda.

```text
Slot Capacity
≠
Product Stock
```

Contoh:

```text
Stock = 100
Pickup Capacity = 5
```

Stock tersedia tetapi slot bisa penuh.

---

# 102. Reservation Duration

Reservation dapat mempunyai:

```text
Start
End
Duration
```

Setelah expiry:

```text
EXPIRED
```

atau release sesuai policy.

---

# 103. Reservation Extension

Jika diperbolehkan:

```text
Extend Reservation
```

tetap membutuhkan validation:

```text
Inventory
Seller Policy
Capacity
```

---

# 104. Booking Expiration

Booking dapat:

```text
EXPIRED
```

misalnya customer melewati reservation window.

---

# 105. No-Show

Pickup appointment dapat menjadi:

```text
NO_SHOW
```

Policy dapat menentukan:

```text
Reservation Release
Rebooking
Cancellation Effect
```

Financial effect tetap mengikuti #23/#27.

---

# 106. Booking Cancellation

Cancellation record:

```text
CUSTOMER_REQUEST
SELLER_REQUEST
SYSTEM
POLICY
```

disertai:

```text
Actor
Reason
Timestamp
Financial Impact
```

---

# 107. Booking Reschedule

Jika diperbolehkan:

```text
Current Slot
↓
Reschedule
↓
Find Available Slot
↓
Select New Slot
↓
Confirm
↓
Booking Updated
```

Audit trail wajib ada.

---

# 108. Reschedule ≠ New Order

Contoh:

```text
Order #001
Pickup:
10:00
```

reschedule:

```text
Pickup:
14:00
```

Order tetap:

```text
#001
```

Yang berubah hanya booking/scheduling context.

---

# 109. Double Booking Prevention

Backend harus mencegah:

```text
Same Slot
+
Same Capacity
+
Multiple Booking
```

secara tidak sengaja.

Atomic validation/locking dapat digunakan saat implementation.

---

# 110. Booking Status

Core:

```text
DRAFT
PENDING_CONFIRMATION
CONFIRMED
ACTIVE
RESCHEDULE_REQUESTED
EXPIRED
NO_SHOW
CANCEL_REQUESTED
CANCELLED
CONSUMED
FAILED
```

---

# 111. Status Meaning

### DRAFT
Belum dikonfirmasi.

### PENDING_CONFIRMATION
Menunggu explicit confirmation.

### CONFIRMED
Booking resmi.

### ACTIVE
Booking sedang berlaku.

### RESCHEDULE_REQUESTED
Ada proses perubahan schedule.

### EXPIRED
Melewati masa valid.

### NO_SHOW
Actor tidak hadir pada slot.

### CANCEL_REQUESTED
Cancellation diproses.

### CANCELLED
Booking dibatalkan.

### CONSUMED
Booking berhasil digunakan.

### FAILED
Booking gagal dibuat.

---

# 112. Booking Lifecycle vs Reservation Lifecycle

Contoh sukses:

```text
Booking:
CONFIRMED

Reservation:
RESERVED
```

setelah pickup selesai:

```text
Booking:
CONSUMED

Reservation:
CONSUMED
```

timeout:

```text
Booking:
EXPIRED

Reservation:
RELEASED
```

---

# 113. Inventory Reservation Handoff

```text
#22B Booking
      ↓
Reservation Request
      ↓
#24 Inventory
      ↓
RESERVED / REJECTED
```

Booking harus mencerminkan result aktual.

---

# 114. Booking Fee

Booking dapat memiliki:

```text
NO_FEE
FIXED_FEE
DEPOSIT
```

Tetapi payment processing tetap #23.

---

# 115. Payment Relationship

Booking dapat membutuhkan payment:

```text
Reservation Fee
Deposit
Full Payment
Authorization
```

Booking hanya mencatat requirement/context.

Payment execution tetap #23.

---

# 116. Cancellation Financial Impact

Jika booking dibatalkan:

```text
Booking
↓
CANCELLED
```

apakah uang dikembalikan mengikuti:

```text
#23 Payment
+
#27 Return / Refund
```

dan policy booking yang berlaku.

---

# 117. Pre-Order Price Context

Pre-order dapat memiliki:

```text
PRICE_LOCKED
PRICE_NOT_LOCKED
PRICE_LOCK_CONDITION
```

Jika harga belum guaranteed, UI harus menyatakannya dengan jelas.

---

# 118. Booking Policy

Policy dapat menentukan:

```text
Allowed Booking Type
Minimum Advance Time
Maximum Advance Time
Reservation Duration
Cancellation Window
Reschedule Window
No-Show Rule
Payment Requirement
Price Lock Rule
```

---

# 119. Customer Flow — Pickup

```text
#22A Order
↓
Select Pickup
↓
#22B Booking Pickup
↓
Select Location
↓
Select Slot
↓
Review
↓
Confirm Booking
↓
#23 Payment
↓
#24 Inventory
↓
#25 Fulfillment
↓
Ready for Pickup
↓
Check-In
↓
Handover
↓
Booking CONSUMED
```

---

# 120. Customer Flow — Reservation

```text
#20 Product Discovery
↓
Reserve Product
↓
#22B Booking
↓
#24 Inventory
↓
RESERVED
↓
Customer confirms next step
↓
#22A Order
↓
#23 Payment
```

---

# 121. Customer Flow — Pre-Order

```text
#20 Product Discovery
↓
Pre-Order Available
↓
#22B Booking
↓
Pre-Order Reservation
↓
Expected Availability
↓
Confirm
↓
#22A Order
↓
#23 Payment
↓
Future Fulfillment
```

---

# 122. Service Material Reservation

```text
Service
↓
#19 Product Requirement
↓
#20 Product Discovery
↓
Product Selection
↓
#22B Reservation
↓
#24 Inventory
↓
Reserved
↓
#22A Order
↓
#23 Payment
↓
#25 Fulfillment
```

---

# 123. Role — Customer

Customer dapat:

```text
Create Booking
View Own Booking
Confirm
Reschedule
Cancel
Check Status
View Booking History
```

---

# 124. Role — Provider

Provider dapat melakukan authorized:

```text
View Service-Related Booking
Create Reservation Request
Manage Procurement Booking
```

sesuai permission.

---

# 125. Role — Worker

Worker dapat:

```text
View Assigned Booking Context
View Pickup/Collection Task
```

Purchase/reservation creation bergantung pada permission.

---

# 126. Role — Merchant

Merchant dapat:

```text
View Own Booking
Accept / Manage Relevant Booking
Configure Supported Slot/Reservation Capability
```

sesuai policy.

---

# 127. Role — Supplier

Supplier dapat:

```text
View Authorized Supply Booking
Process Reservation
```

---

# 128. Role — Admin

Admin dapat:

```text
View Booking
Investigate
Handle Exception
Override Under Policy
Manage Slots
```

Manual override harus audit-able.

---

# 129. Role — CEO / Product Owner

CEO/PO:

```text
Configure Governance
Booking Policy
Booking Type
Cancellation Policy
Analyze Booking Metrics
```

---

# 130. Role × Booking

| Role | Access |
|---|---|
| Customer | Create / View / Confirm / Reschedule / Cancel Own Booking |
| Provider | View / Manage Authorized Service-Related Booking |
| Worker | View Assigned Booking Context |
| Merchant | Manage Own Booking Capability / Relevant Booking |
| Supplier | Process Authorized Supply Booking |
| Admin/Ops | Operations / Exception / Controlled Override |
| CEO/PO | Governance / Analytics |

---

# 131. AI pada Booking

AI dapat membantu:

```text
Find Available Slot
Suggest Slot
Explain Booking Policy
Explain Expiry
Suggest Alternative Slot
```

AI tidak boleh:

```text
Invent Slot
Invent Availability
Bypass Capacity
Create Booking Silently
Bypass Payment
```

Actual slot/availability harus berasal dari actual system data.

---

# 132. Smart Slot Recommendation

Feature #18 dapat menggunakan:

```text
Customer Preference
Historical Booking
Available Slots
Location
```

untuk menghasilkan:

```text
Recommended Slot
```

Tetapi:

```text
Recommendation ≠ Confirmed Booking
```

---

# 133. Notification

Booking event dapat menghasilkan:

```text
Booking Confirmed
Upcoming Booking
Reservation Expiring
Booking Expired
Booking Cancelled
Booking Rescheduled
No-Show
Pickup Ready
```

Notification delivery mengikuti notification infrastructure.

---

# 134. Booking History

Customer dapat melihat:

```text
Upcoming
Active
Past
Cancelled
Expired
```

Booking History berbeda dari Order History.

---

# 135. Booking Analytics Events

Minimum:

```text
booking_viewed
booking_started
booking_slot_selected
booking_created
booking_confirmed
booking_rescheduled
booking_cancelled
booking_expired
booking_no_show
booking_consumed
booking_failed
reservation_created
reservation_released
reservation_expired
```

---

# 136. Booking Data Model

Core:

```text
product_bookings
product_booking_items
product_booking_slots
product_booking_locations
product_booking_policies
product_booking_events
product_booking_reservations
product_booking_parties
product_booking_cancellations
product_booking_reschedules
```

---

# 137. product_bookings

Conceptual:

```text
id
booking_number
booking_type
booking_context
customer_id
seller_id
order_id
status
start_at
end_at
location_id
policy_version
created_at
updated_at
expires_at
```

Tidak semua field wajib pada semua booking type.

---

# 138. product_booking_items

Conceptual:

```text
id
booking_id
product_id
variant_id
offer_id
quantity
product_snapshot
```

---

# 139. product_booking_slots

Conceptual:

```text
id
seller_id
location_id
slot_date
start_at
end_at
capacity
reserved_capacity
status
```

---

# 140. product_booking_reservations

Conceptual:

```text
id
booking_id
product_id
variant_id
offer_id
quantity
reservation_status
reserved_at
expires_at
released_at
inventory_reference
```

Inventory authority tetap #24.

---

# 141. product_booking_policies

Conceptual:

```text
id
booking_type
minimum_advance
maximum_advance
reservation_duration
cancellation_policy
reschedule_policy
no_show_policy
payment_requirement
price_lock_rule
version
effective_at
```

---

# 142. Booking Cancellation Entity

Conceptual:

```text
id
booking_id
requested_by
reason
status
financial_impact_reference
requested_at
resolved_at
```

---

# 143. Booking Reschedule Entity

Conceptual:

```text
id
booking_id
old_slot
new_slot
requested_by
reason
status
created_at
```

---

# 144. Booking Source of Truth

#22B menjadi source of truth untuk:

```text
Booking State
Booking Number
Booking Type
Booking Slot
Booking Location
Booking Policy Snapshot
Booking Reservation Context
Booking Reschedule
Booking Cancellation
Booking Events
```

Bukan source of truth untuk:

```text
Product Catalog → #20
Cart → #21
Order → #22A
Payment → #23
Inventory → #24
Fulfillment → #25
Shipping → #26
Return / Refund → #27
```

---

# 145. Booking → Inventory

```text
Booking
↓
Reservation Request
↓
#24 Inventory
```

Result:

```text
RESERVED
PARTIALLY_RESERVED
FAILED
RELEASED
EXPIRED
```

---

# 146. Booking → Payment

```text
Booking
↓
Payment Requirement
↓
#23 Payment
```

---

# 147. Booking → Fulfillment

```text
Booking
↓
Pickup / Collection Context
↓
#25 Fulfillment
```

---

# 148. Booking → Shipping

Jika ada scheduling context:

```text
Booking Preference
↓
#25 Fulfillment
↓
#26 Shipping
```

Booking tidak menjadi shipping engine.

---

# 149. Booking → Return

Setelah product diterima:

```text
Booking = CONSUMED
```

dan jika terjadi return:

```text
#27 Return / Refund
```

Booking history tetap ada.

---

# 150. Booking Security

Backend harus memvalidasi:

```text
Actor
Role
Permission
Booking
Scope
Slot
Current Status
Requested Action
```

---

# 151. Booking Idempotency

Create booking harus aman dari duplicate submission.

```text
Confirm Booking
×2
```

tetap menghasilkan satu official booking result.

---

# 152. Booking Audit

Critical actions:

```text
Create
Confirm
Reschedule
Cancel
Manual Override
Reservation Release
No-Show
```

mencatat:

```text
Actor
Action
Target
Timestamp
Reason
Result
```

---

# 153. Booking Edge Cases

System harus menangani:

```text
Slot Full
Product Out of Stock
Seller Unavailable
Reservation Expired
Booking Expired
No-Show
Double Booking Attempt
Reschedule Conflict
Payment Failure
Reservation Failure
Order Cancelled
Location Closed
Unexpected Capacity Change
```

---

# 154. Final Booking Architecture

```text
                    #20 DISCOVERY
                          │
                          ↓
                       #21 CART
                          │
                ┌─────────┴─────────┐
                ↓                   ↓
           #22A ORDER          #22B BOOKING
                │                   │
                │        ┌──────────┼──────────┐
                │        ↓          ↓          ↓
                │   Reservation   Pickup     Pre-Order
                │        │          │          │
                └────────┼──────────┼──────────┘
                         ↓
                    #23 PAYMENT
                         │
                         ↓
                    #24 INVENTORY
                         │
                         ↓
                   #25 FULFILLMENT
                         │
                         ↓
                #26 SHIPPING & TRACKING
                         │
                         ↓
                   #27 RETURN/REFUND
```

---

# PART C — CROSS-DOMAIN RULES

# 155. Order vs Booking

| Aspect | Order | Booking |
|---|---|---|
| Fungsi | Commercial transaction | Reservation / scheduling |
| Product | ✅ | ✅ bila relevan |
| Seller | ✅ | ✅ |
| Quantity | ✅ | ✅ bila reservation/slot terkait |
| Price | ✅ Transaction snapshot | Hanya context/policy bila relevan |
| Payment | Handoff #23 | Handoff #23 |
| Inventory | Handoff #24 | Reservation request ke #24 |
| Fulfillment | Handoff #25 | Context ke #25 |
| Shipping | Handoff #26 | Scheduling context bila relevan |
| Return | Handoff #27 | Tidak menangani return |
| Wajib? | Untuk pembelian | Hanya bila dibutuhkan |

---

# 156. Core Relationship

```text
PRODUCT
   ↓
DISCOVERY
   ↓
CART
   ↓
ORDER
   ↓
[BOOKING if needed]
   ↓
PAYMENT
   ↓
INVENTORY
   ↓
FULFILLMENT
   ↓
SHIPPING
   ↓
RETURN / REFUND
```

Untuk reservation/pre-order yang memang mendahului commercial transaction:

```text
PRODUCT
   ↓
DISCOVERY
   ↓
BOOKING
   ↓
ORDER
   ↓
PAYMENT
```

---

# 157. Source of Truth Matrix

| Domain | Source of Truth |
|---|---|
| Product | #20 |
| Cart | #21 |
| Order | #22A |
| Booking | #22B |
| Payment | #23 |
| Inventory | #24 |
| Fulfillment | #25 |
| Shipping | #26 |
| Return / Refund | #27 |

---

# 158. Important Global Rules

1. Order ≠ Cart.
2. Booking ≠ Order.
3. Payment ≠ Order.
4. Cart bukan inventory reservation.
5. Booking bukan inventory source of truth.
6. Inventory source of truth berada di #24.
7. Order menjadi official commercial transaction.
8. Booking menjadi reservation/scheduling layer.
9. Tidak semua product membutuhkan booking.
10. Pickup booking biasanya terkait order.
11. Reservation/pre-order dapat terjadi sebelum order.
12. Seller berbeda dapat menghasilkan order berbeda.
13. One checkout dapat menghasilkan multiple seller orders.
14. Product Offer harus tetap dapat ditelusuri dari Order Item.
15. Official Order memiliki historical snapshots.
16. Official Booking memiliki policy/context snapshot.
17. Price pada order adalah historical transaction price.
18. Price pada cart bukan final guaranteed price.
19. Reservation tidak boleh dianggap berhasil sebelum inventory mengonfirmasi.
20. Slot capacity berbeda dari product stock.
21. Slot tidak boleh double-booked.
22. Booking reschedule tidak membuat order baru.
23. Seller tidak boleh melakukan silent substitution.
24. Additional charges harus memiliki basis policy dan approval bila diperlukan.
25. Cancellation harus audit-able.
26. Payment impact ditangani #23.
27. Refund ditangani #27.
28. Fulfillment effect ditangani #25.
29. Shipping effect ditangani #26.
30. Worker tidak otomatis menjadi purchaser.
31. AI tidak boleh invent availability, price, seller, stock, atau slot.
32. AI tidak boleh membuat order/booking secara diam-diam.
33. Backend authorization wajib ditegakkan.
34. Critical transaction action harus idempotent.
35. Historical Order dan Booking tidak boleh dirusak oleh perubahan catalog/current availability.
36. Domain state dipisahkan berdasarkan responsibility.
37. Analytics event dapat digunakan oleh Feature #18.
38. No-show tidak otomatis menjadi negative ML label.
39. Booking history ≠ order history.
40. Semua cross-feature handoff harus mempertahankan traceability.

---

# 159. Final Role Architecture

```text
CUSTOMER
   ↓
Discovery
Cart
Order
Booking jika dibutuhkan
Payment
View Fulfillment/Shipping
Return

PROVIDER
   ↓
Service Context
Product Requirement
Product Discovery
Procurement / Product Order
Booking jika diperlukan

WORKER
   ↓
Assigned Job
Product Requirement
Discovery
Request / Authorized Action
Booking Context

MERCHANT / SUPPLIER
   ↓
Product
Offer
Order
Booking Capability
Fulfillment

ADMIN / OPS
   ↓
Moderation
Operations
Exception
Support
Controlled Override
Audit

CEO / PRODUCT OWNER
   ↓
Governance
Policy
Taxonomy
Commercial Rules
Analytics
```

---

# 160. Final Roadmap Position

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
    ├── #22A Order Barang ✅ LOCKED
    └── #22B Booking Barang ✅ LOCKED

#23 Payment Barang
#24 Inventory
#25 Fulfillment
#26 Shipping & Tracking
#27 Return / Refund
```

---

# 161. LOCKED STATUS

## #22A Order Barang

```text
✅ Order Definition
✅ Cart Boundary
✅ Payment Boundary
✅ Inventory Boundary
✅ Fulfillment Boundary
✅ Shipping Boundary
✅ Return Boundary
✅ Order Preview
✅ Order Intent
✅ Explicit Confirmation
✅ Order Number
✅ Multi-Seller
✅ Order Group
✅ Order Item
✅ Transaction Snapshot
✅ Price Lock
✅ Quantity Snapshot
✅ Service Context
✅ Maintenance Context
✅ Asset Context
✅ Reorder Context
✅ Order Type
✅ Order Lifecycle
✅ Domain Status Separation
✅ Seller Acceptance
✅ Partial Acceptance
✅ Backorder / Pre-Order Context
✅ Address Snapshot
✅ Pricing
✅ Discount Snapshot
✅ Platform Fee
✅ Cancellation
✅ Modification
✅ Substitution Rule
✅ Order History
✅ Role Access
✅ Security
✅ Idempotency
✅ Audit
✅ Event Log
✅ Data Model
✅ Source of Truth
✅ Cross-Feature Handoff
✅ Edge Cases
```

## #22B Booking Barang

```text
✅ Booking Definition
✅ Order Boundary
✅ Inventory Boundary
✅ Booking Purpose
✅ Booking Types
✅ Reservation
✅ Pickup Slot
✅ Pre-Order
✅ Collection Appointment
✅ Booking Intent
✅ Booking Confirmation
✅ Booking Number
✅ Booking Relation
✅ Booking Context
✅ Seller Capability
✅ Seller Availability
✅ Booking Location
✅ Slot
✅ Slot Capacity
✅ Reservation Duration
✅ Reservation Extension
✅ Expiration
✅ No-Show
✅ Cancellation
✅ Reschedule
✅ Double Booking Prevention
✅ Booking Lifecycle
✅ Reservation Lifecycle
✅ Inventory Reservation Handoff
✅ Payment Boundary
✅ Fulfillment Boundary
✅ Shipping Boundary
✅ Return Boundary
✅ Booking Fee Context
✅ Price Lock Context
✅ Booking Policy
✅ Role Access
✅ AI Boundary
✅ Notifications
✅ Booking History
✅ Analytics Events
✅ Security
✅ Idempotency
✅ Audit
✅ Data Model
✅ Source of Truth
✅ Cross-Feature Handoff
✅ Edge Cases
```

---

# 162. Final Scope Statement

> **Feature #22 Booking / Order Barang mencakup dua domain yang saling berhubungan namun berbeda: #22A Order Barang sebagai official commercial transaction dan #22B Booking Barang sebagai optional reservation/scheduling layer. Order mengubah selected cart items menjadi transaksi resmi dan menjadi basis bagi Payment, Inventory, Fulfillment, Shipping, serta Return/Refund. Booking digunakan hanya ketika transaksi atau product membutuhkan reservation, pickup slot, pre-order, atau collection scheduling. Booking bukan Order, bukan Payment, dan bukan Inventory source of truth. Kedua domain harus mempertahankan traceability, explicit confirmation, authorization, idempotency, auditability, dan boundary yang jelas dengan Feature #20–#27.**
