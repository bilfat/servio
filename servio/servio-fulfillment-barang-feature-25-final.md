# SERVIO — FEATURE #25 FULFILLMENT BARANG
## Final Business Flow & Domain Specification

**Status:** FINAL / LOCKED  
**Roadmap:** #25 of #27  
**Domain:** PRODUCT / BARANG  
**Previous Features:** #20 Product Discovery, #21 Cart, #22 Booking / Order Barang, #23 Payment Barang, #24 Inventory  
**Next Features:** #26 Shipping & Tracking, #27 Return / Refund

> **Catatan arsitektur:** Feature #25 fokus pada **fulfillment barang/product**: mengambil barang dari inventory yang sudah dialokasikan, memverifikasi, mengemas, melakukan quality check, dan menyiapkan/menyelesaikan handover. Inventory tetap menjadi source of truth stock, sedangkan Shipping menjadi source of truth delivery/shipment.

---

# 1. Definisi

**Fulfillment Barang** adalah proses operasional untuk memenuhi Product Order dengan cara mengambil barang dari inventory, melakukan verifikasi, menyiapkan, mengemas, melakukan quality check bila diperlukan, lalu menyerahkan barang ke customer, courier, provider/worker, atau proses operasional berikutnya.

```text
#22 Order
      ↓
#23 Payment
      ↓
#24 Inventory
      ↓
🔥 #25 Fulfillment
      ↓
READY FOR SHIPPING / PICKUP / HANDOVER
      ↓
#26 Shipping & Tracking
```

Prinsip:

> **#24 memastikan barangnya ada dan terkontrol.**
>
> **#25 memastikan barang tersebut benar-benar diproses dan siap diserahkan.**

---

# 2. Tujuan Feature #25

Fulfillment bertugas untuk:

1. Menerima fulfillment request dari Order.
2. Memastikan fulfillment memiliki precondition yang valid.
3. Menggunakan allocated inventory.
4. Menentukan dan menjalankan picking.
5. Memverifikasi product, variant, dan quantity.
6. Menyiapkan packaging.
7. Menjalankan quality/completeness check.
8. Membuat package record.
9. Menangani multiple package.
10. Mendukung pickup, shipping, direct handover, dan service handover.
11. Mendukung split dan partial fulfillment.
12. Menangani fulfillment exception.
13. Menangani hold, re-pick, dan re-pack.
14. Menjaga fulfillment SLA.
15. Menghasilkan handover record.
16. Menjadi source of truth fulfillment execution.
17. Menyediakan output yang dapat diteruskan ke Shipping atau handover lain.

---

# 3. Prinsip Utama

```text
#22 ORDER
=
Apa yang harus dipenuhi?
```

```text
#24 INVENTORY
=
Barangnya ada berapa dan di mana?
```

```text
#25 FULFILLMENT
=
Bagaimana barang diproses sampai siap diserahkan?
```

```text
#26 SHIPPING
=
Bagaimana barang dikirim dan dilacak?
```

---

# 4. Boundary dengan #24 Inventory

### Inventory

Menjawab:

> "Stoknya ada berapa?"

### Fulfillment

Menjawab:

> "Stok yang sudah dialokasikan itu bagaimana diproses untuk order ini?"

Contoh:

```text
#24 Inventory

On Hand = 20
Reserved = 5
Allocated = 3
Available = 12
```

Kemudian:

```text
#25 Fulfillment

Order #001
↓
Pick 3
↓
Verify 3
↓
Pack 3
↓
Ready
```

Fulfillment tidak menjadi source of truth stock balance.

---

# 5. Boundary dengan #22 Order

Order menjawab:

> "Apa yang harus dipenuhi?"

Fulfillment menjawab:

> "Bagaimana fulfillment tersebut dijalankan?"

Contoh:

```text
Order:
2 Capacitor
1 Electrical Tape
```

Fulfillment:

```text
Pick 2 Capacitor
Pick 1 Electrical Tape
↓
Verify
↓
Pack
↓
Ready
```

---

# 6. Boundary dengan #23 Payment

Fulfillment harus mengikuti payment condition yang berlaku.

Default marketplace purchase:

```text
Payment = PAID
```

Namun untuk model lain:

```text
COD
DEPOSIT
AFTER_FULFILLMENT
MILESTONE
AUTHORIZATION
```

precondition berbeda.

Karena itu jangan hardcode:

```text
EVERY ORDER → MUST BE PAID FIRST
```

Gunakan:

```text
Fulfillment Eligibility
=
Order Condition
+
Payment Condition
+
Inventory Condition
+
Booking Condition jika applicable
```

---

# 7. Boundary dengan #26 Shipping

### Fulfillment

```text
Pick
Verify
Pack
Quality Check
Ready
Handover
```

### Shipping

```text
Shipment
Courier
Tracking
In Transit
Delivered
```

Flow:

```text
READY_FOR_SHIPPING
       ↓
#26 Shipping
```

---

# 8. Boundary dengan #22B Booking

Untuk pickup:

```text
#22B Booking
=
Kapan customer datang
```

```text
#25 Fulfillment
=
Apakah barang sudah siap
```

Contoh:

```text
Booking:
14:00–15:00

Fulfillment:
READY_FOR_PICKUP
```

Keduanya tetap terpisah.

---

# 9. Fulfillment Mode

Core:

```text
DELIVERY
PICKUP
DIRECT_HANDOVER
SERVICE_HANDOVER
TRANSFER
```

### DELIVERY
Barang dipersiapkan untuk shipping.

### PICKUP
Barang dipersiapkan agar customer mengambil sendiri.

### DIRECT_HANDOVER
Barang diserahkan langsung tanpa courier.

### SERVICE_HANDOVER
Barang diberikan kepada provider/worker untuk kebutuhan service.

### TRANSFER
Barang dipindahkan untuk kebutuhan operasional/lokasi lain.

---

# 10. Fulfillment Context

Supported:

```text
DIRECT_PURCHASE
SERVICE_RELATED
MAINTENANCE_RELATED
ASSET_RELATED
REORDER
PROCUREMENT
```

---

# 11. Direct Product Fulfillment

```text
Customer
↓
Order
↓
Payment
↓
Inventory
↓
Fulfillment
↓
Pick
↓
Pack
↓
Shipping
```

---

# 12. Service-Related Fulfillment

Servio harus mendukung product fulfillment untuk kebutuhan service.

Contoh:

```text
AC Repair
↓
Capacitor Requirement
↓
Product Order
↓
Payment
↓
Inventory
↓
Fulfillment
↓
Barang diberikan ke teknisi
↓
Service Execution
```

Fulfillment dapat menggunakan:

```text
SERVICE_HANDOVER
```

---

# 13. Provider-Owned Inventory Fulfillment

Provider dapat mempunyai material inventory sendiri.

Contoh:

```text
Provider
Capacitor:
10
```

Service membutuhkan:

```text
1
```

Flow:

```text
Inventory Allocation
↓
Pick 1
↓
Verify
↓
Handover to Worker
```

Penggunaan material aktual tetap dicatat pada inventory/service context.

---

# 14. Fulfillment ≠ Service Execution

```text
Product Fulfillment
=
Menyiapkan / menyerahkan barang
```

```text
Service Execution
=
Mengerjakan jasa
```

Contoh:

```text
Capacitor
↓
Fulfillment
↓
Diterima teknisi
↓
Service Execution
↓
Capacitor dipasang
```

---

# 15. Fulfillment Record

Satu order dapat memiliki:

```text
One Fulfillment
```

atau:

```text
Multiple Fulfillments
```

Contoh:

```text
Order
├── Fulfillment A
└── Fulfillment B
```

Digunakan untuk:

```text
Multi-location
Split fulfillment
Partial fulfillment
Different shipment
```

---

# 16. Multi-Seller Fulfillment

```text
Order Group
├── Seller A
│   └── Fulfillment A
└── Seller B
    └── Fulfillment B
```

Setiap seller dapat menjalankan fulfillment sendiri.

---

# 17. Split Fulfillment

Contoh:

```text
Order:
Product A
Product B
Product C
```

Stock:

```text
Warehouse Bandung:
A

Warehouse Jakarta:
B

Store Cimahi:
C
```

Fulfillment:

```text
Fulfillment A → Bandung
Fulfillment B → Jakarta
Fulfillment C → Cimahi
```

---

# 18. Partial Fulfillment

Contoh:

```text
Order:
10 units
```

Inventory:

```text
Available:
6
```

Jika policy mendukung:

```text
Fulfilled:
6

Remaining:
4
```

Order dapat:

```text
PARTIALLY_FULFILLED
```

Remaining quantity dapat menunggu stock/backorder sesuai policy.

---

# 19. Partial Fulfillment ≠ Partial Reservation

### Partial Reservation

Sebagian quantity berhasil di-reserve.

### Partial Fulfillment

Sebagian quantity sudah benar-benar diproses/fulfilled.

Contoh:

```text
Reserved 6
↓
Allocated 6
↓
Fulfilled 6
```

berbeda dari:

```text
Reserved 10
↓
Fulfilled 6
```

---

# 20. Fulfillment Status

Core:

```text
PENDING
READY_TO_PICK
PICKING
PICKED
VERIFYING
PACKING
PACKED
QUALITY_CHECK
READY_FOR_PICKUP
READY_FOR_SHIPPING
HANDED_OVER
PARTIALLY_FULFILLED
FULFILLED
FAILED
ON_HOLD
CANCELLED
```

---

# 21. Status Meaning

### PENDING
Fulfillment belum dimulai.

### READY_TO_PICK
Allocated stock siap di-pick.

### PICKING
Operator sedang mengambil barang.

### PICKED
Barang sudah diambil.

### VERIFYING
Product/variant/quantity sedang diverifikasi.

### PACKING
Barang sedang dikemas.

### PACKED
Packing selesai.

### QUALITY_CHECK
Final quality/completeness check.

### READY_FOR_PICKUP
Siap diambil customer.

### READY_FOR_SHIPPING
Siap diberikan ke shipping.

### HANDED_OVER
Barang sudah diserahkan kepada actor/next process.

### PARTIALLY_FULFILLED
Sebagian item telah fulfilled.

### FULFILLED
Fulfillment selesai.

### FAILED
Fulfillment gagal.

### ON_HOLD
Fulfillment ditahan karena exception.

### CANCELLED
Fulfillment dibatalkan.

---

# 22. Fulfillment Lifecycle — Delivery

```text
PENDING
↓
READY_TO_PICK
↓
PICKING
↓
PICKED
↓
VERIFYING
↓
PACKING
↓
PACKED
↓
QUALITY_CHECK
↓
READY_FOR_SHIPPING
↓
HANDED_OVER
↓
FULFILLED
```

---

# 23. Fulfillment Lifecycle — Pickup

```text
PENDING
↓
READY_TO_PICK
↓
PICKING
↓
PICKED
↓
VERIFYING
↓
PACKING
↓
PACKED
↓
QUALITY_CHECK
↓
READY_FOR_PICKUP
↓
Customer Check-In
↓
HANDOVER
↓
FULFILLED
```

---

# 24. Picking

Picking berarti mengambil product dari inventory location.

Input:

```text
Order Item
+
Allocated Stock
+
Source Location
```

Output:

```text
Picked Quantity
```

---

# 25. Picking List

Operator dapat melihat:

```text
Order
Product
SKU
Variant
Quantity
Source Location
Special Handling
```

Contoh:

```text
ORDER #001

A-001
Capacitor 35+5 uF
Qty 2
Location:
Shelf A-03
```

---

# 26. Pick Confirmation

Setelah barang diambil:

```text
Pick
↓
Scan / Verify
↓
Confirm
```

Metode dapat:

```text
Barcode
QR
SKU
Manual
```

MVP tidak harus mewajibkan scanner untuk semua kategori.

---

# 27. Wrong Product Detection

Jika operator mengambil:

```text
Product B
```

padahal order meminta:

```text
Product A
```

system harus memberi warning/block sesuai policy.

---

# 28. Quantity Verification

Order:

```text
Qty = 5
```

Operator:

```text
Picked = 4
```

System:

```text
SHORT_PICK
```

kemudian fulfillment masuk resolution/exception flow.

---

# 29. Packing

Setelah picking:

```text
PICKED
↓
PACKING
```

Packing record dapat menyimpan:

```text
Package ID
Package Type
Dimensions
Weight
Contents
Packaging Material
```

---

# 30. Multiple Packages

Satu fulfillment/order dapat memiliki:

```text
Package A
Package B
```

Contoh:

```text
Order #001
├── Package A
└── Package B
```

---

# 31. Package ≠ Shipment

```text
Package
=
Physical Package
```

```text
Shipment
=
Delivery Transaction
```

Flow:

```text
Package
↓
#26 Shipping
```

---

# 32. Packaging Type

Contoh:

```text
BOX
ENVELOPE
BUBBLE_WRAP
CRATE
SPECIAL_PACKAGING
```

Special handling:

```text
FRAGILE
LIQUID
HEAVY
OVERSIZED
```

---

# 33. Packaging Requirement

Platform dapat menentukan mandatory packaging requirement.

Contoh:

```text
Fragile
→ Protective Packaging Required
```

Seller dapat menambahkan protection, tetapi tidak menghapus mandatory requirement.

---

# 34. Quality Check

Before handover:

```text
Product
Quantity
Condition
Packaging
Label
```

dicek sesuai policy.

---

# 35. Quality Check Status

```text
PASSED
FAILED
REQUIRES_REWORK
NOT_APPLICABLE
```

Jika failed:

```text
ON_HOLD
```

atau flow rework.

---

# 36. Fulfillment Exceptions

Core:

```text
MISSING_PRODUCT
WRONG_PRODUCT
DAMAGED_PRODUCT
SHORT_PICK
OVER_PICK
PACKAGING_FAILURE
INVENTORY_MISMATCH
SELLER_DELAY
LOCATION_CLOSED
SYSTEM_ERROR
```

---

# 37. Fulfillment Hold

Jika exception:

```text
FULFILLMENT
↓
ON_HOLD
```

Contoh:

```text
Inventory:
5

Physical:
3
```

Fulfillment berhenti sampai issue diselesaikan.

---

# 38. Re-Pick

Jika wrong/failed pick:

```text
PICK FAILED
↓
Inventory Re-check
↓
Re-Pick
```

---

# 39. Re-Pack

Jika quality packing failed:

```text
PACKED
↓
QUALITY CHECK FAILED
↓
RE-PACK
↓
QUALITY CHECK
```

---

# 40. Fulfillment Failure

Contoh:

```text
Product unavailable
+
No Alternative
```

Fulfillment:

```text
FAILED
```

Kemudian order resolution mengikuti #22.

---

# 41. Fulfillment Cancellation

Fulfillment dapat cancelled karena:

```text
Order Cancelled
Seller Rejected
Payment Failed
Policy
```

Inventory effect tetap diproses #24.

---

# 42. Inventory Effect after Cancellation

Contoh:

```text
Allocated = 2
```

Order cancelled:

```text
Release Allocation
```

#24 menjadi authority untuk actual stock state.

---

# 43. Payment Expiration + Fulfillment

Jika:

```text
Payment = EXPIRED
```

dan fulfillment belum dimulai:

```text
Stop / Cancel Fulfillment
```

Jika fulfillment sudah berjalan:

```text
Controlled Exception
```

diperlukan.

Jangan menghapus historical fulfillment record.

---

# 44. Fulfillment Start Preconditions

Sebelum fulfillment:

```text
Order Valid
+
Payment Condition Valid
+
Inventory Available/Allocated
+
Booking Condition jika diperlukan
+
No Blocking Exception
```

sesuai policy.

---

# 45. Pre-Order Fulfillment

```text
Order Created
↓
Payment
↓
Waiting Future Supply
↓
Inventory Received
↓
Allocation
↓
Fulfillment
```

Pre-order tidak dianggap fulfilled sebelum product benar-benar tersedia dan diproses.

---

# 46. Backorder Fulfillment

Contoh:

```text
Order:
10

Available:
6
```

Fulfillment:

```text
6 fulfilled
4 pending
```

Remaining quantity mengikuti backorder policy.

---

# 47. Handover Types

```text
TO_CUSTOMER
TO_COURIER
TO_PROVIDER
TO_WORKER
TO_PARTNER
TO_ANOTHER_LOCATION
```

---

# 48. Handover to Courier

```text
READY_FOR_SHIPPING
↓
Courier Handover
↓
HANDED_OVER
↓
#26 Shipping
```

Handover evidence dapat berupa:

```text
Scan
QR
Signature
System Event
```

---

# 49. Handover to Customer

Pickup:

```text
READY_FOR_PICKUP
↓
Customer Arrives
↓
Verification
↓
Handover
↓
FULFILLED
```

---

# 50. Handover to Provider / Worker

Service-related:

```text
Product Ready
↓
Provider / Worker Handover
↓
Service Execution
```

Contoh:

```text
Capacitor
↓
Technician
↓
AC Repair
```

---

# 51. Handover Verification

Pickup/handover dapat menggunakan:

```text
Booking Code
Order Code
QR
OTP
Customer Verification
```

Verification mechanism bukan source of truth transaction.

---

# 52. Fulfillment Completion

Fulfillment selesai ketika:

```text
All Required Items
+
Correct Quantity
+
Required QA Passed
+
Required Handover Completed
```

sesuai fulfillment mode.

---

# 53. Fulfillment ≠ Order Completion

```text
Fulfillment = FULFILLED
```

tidak selalu berarti:

```text
Order = COMPLETED
```

Order tetap mengikuti lifecycle #22.

---

# 54. Split Shipment

Fulfillment dapat menghasilkan:

```text
Package A
↓
Shipment A

Package B
↓
Shipment B
```

Shipment/tracking dikelola #26.

---

# 55. Fulfillment Location Selection

Jika beberapa inventory locations tersedia:

```text
Bandung
Jakarta
Cimahi
```

fulfillment dapat memilih source berdasarkan:

```text
Stock Availability
Distance
Delivery Requirement
Seller Policy
Cost
Service Level
```

Actual stock availability tetap berasal dari #24.

---

# 56. Smart Fulfillment

Feature #18 dapat membantu:

```text
Choose Fulfillment Location
Suggest Split
Predict Delay
Optimize Pick Sequence
```

Tetapi:

```text
AI Recommendation
≠
Inventory Truth
```

---

# 57. Fulfillment SLA

SLA dapat meliputi:

```text
Processing SLA
Picking SLA
Packing SLA
Handover SLA
```

Contoh:

```text
Order Accepted
↓
Ready within 4 hours
```

---

# 58. Fulfillment Delay

Status signal:

```text
ON_TIME
AT_RISK
DELAYED
```

Delay tidak otomatis berarti seller fault.

Root cause harus dicatat jika diketahui.

---

# 59. Fulfillment Root Cause

Contoh:

```text
INVENTORY_MISMATCH
STAFF_SHORTAGE
LOCATION_CLOSED
EQUIPMENT_FAILURE
SYSTEM_ERROR
SELLER_DELAY
CUSTOMER_CHANGE
COURIER_DELAY
OTHER
```

---

# 60. Customer View

Customer melihat high-level:

```text
Order Confirmed
Preparing
Packed
Ready for Pickup
Handed to Courier
```

Detail shipment/tracking ada di #26.

---

# 61. Worker View

Worker melihat:

```text
Picking List
Product
SKU
Quantity
Location
Packaging Requirement
Special Handling
```

---

# 62. Merchant View

Merchant melihat:

```text
New Fulfillment
Picking
Packing
QA
Ready
Handover
Exceptions
SLA
```

---

# 63. Provider View

Provider melihat:

```text
Required Product
Source
Quantity
Ready
Handover
```

untuk authorized service context.

---

# 64. Admin View

Admin dapat:

```text
Monitor Fulfillment
Resolve Exception
Override under Policy
Investigate Delay
Manage Operational Issue
```

---

# 65. CEO View

CEO/PO melihat aggregate:

```text
Fulfillment Volume
Fulfillment SLA
Delay Rate
Failure Rate
Partial Fulfillment
By Seller
By Category
By Location
```

---

# 66. Role × Fulfillment

| Role | Access |
|---|---|
| Customer | View status, confirm handover/pickup bila diperlukan |
| Merchant | Manage own fulfillment |
| Supplier | Manage authorized supply fulfillment |
| Provider | Manage authorized service-related fulfillment |
| Worker | Execute assigned fulfillment tasks |
| Admin/Ops | Monitor, investigate, controlled intervention |
| CEO/PO | Governance & analytics |

---

# 67. Security

Backend harus memvalidasi:

```text
Actor
Role
Permission
Fulfillment
Order
Location
Current Status
Requested Action
```

UI hiding bukan security boundary.

---

# 68. Audit

Critical actions:

```text
Pick
Verify
Pack
QA
Hold
Release Hold
Handover
Cancel
Override
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

# 69. Idempotency

Critical commands:

```text
Create Fulfillment
Pick
Confirm Pick
Pack
Confirm Pack
Handover
Cancel
Release
```

harus idempotent.

Duplicate request tidak boleh menggandakan fulfillment action.

---

# 70. Data Model

Core entities:

```text
fulfillments
fulfillment_groups
fulfillment_items
fulfillment_tasks
fulfillment_packages
fulfillment_package_items
fulfillment_picks
fulfillment_verifications
fulfillment_quality_checks
fulfillment_handoffs
fulfillment_exceptions
fulfillment_holds
fulfillment_sla
fulfillment_events
```

---

# 71. fulfillments

Conceptual:

```text
id
order_id
seller_id
fulfillment_type
fulfillment_mode
location_id
status
priority
sla_deadline
created_at
updated_at
```

---

# 72. fulfillment_groups

Conceptual:

```text
id
order_group_id
seller_id
status
```

---

# 73. fulfillment_items

Conceptual:

```text
id
fulfillment_id
order_item_id
product_id
variant_id
quantity_required
quantity_allocated
quantity_picked
quantity_fulfilled
status
```

---

# 74. fulfillment_tasks

Conceptual:

```text
id
fulfillment_id
task_type
assigned_to
status
started_at
completed_at
```

Task types:

```text
PICK
VERIFY
PACK
QUALITY_CHECK
HANDOVER
```

---

# 75. fulfillment_packages

Conceptual:

```text
id
fulfillment_id
package_code
package_type
weight
length
width
height
status
```

---

# 76. fulfillment_package_items

Conceptual:

```text
package_id
fulfillment_item_id
quantity
```

---

# 77. fulfillment_picks

Conceptual:

```text
id
fulfillment_item_id
inventory_location_id
quantity
picked_by
picked_at
verification_status
```

---

# 78. fulfillment_verifications

Conceptual:

```text
id
fulfillment_id
verification_type
status
actor_id
result
created_at
```

---

# 79. fulfillment_quality_checks

Conceptual:

```text
id
fulfillment_id
check_type
status
result
actor_id
created_at
```

---

# 80. fulfillment_handoffs

Conceptual:

```text
id
fulfillment_id
handoff_type
from_actor
to_actor
verification_method
status
handoff_at
evidence_reference
```

---

# 81. fulfillment_exceptions

Conceptual:

```text
id
fulfillment_id
exception_type
severity
status
reason
reported_by
created_at
resolved_at
```

---

# 82. fulfillment_holds

Conceptual:

```text
id
fulfillment_id
reason
status
created_by
created_at
released_at
```

---

# 83. fulfillment_sla

Conceptual:

```text
id
fulfillment_id
target_at
warning_at
status
policy_version
```

---

# 84. fulfillment_events

Minimum:

```text
FULFILLMENT_CREATED
FULFILLMENT_READY_TO_PICK
PICK_STARTED
PICK_COMPLETED
VERIFICATION_STARTED
VERIFICATION_FAILED
PACKING_STARTED
PACKING_COMPLETED
QUALITY_CHECK_STARTED
QUALITY_CHECK_FAILED
READY_FOR_PICKUP
READY_FOR_SHIPPING
HANDOVER_STARTED
HANDOVER_COMPLETED
FULFILLMENT_ON_HOLD
FULFILLMENT_RELEASED
FULFILLMENT_PARTIALLY_COMPLETED
FULFILLMENT_COMPLETED
FULFILLMENT_FAILED
FULFILLMENT_CANCELLED
```

---

# 85. Fulfillment Source of Truth

#25 menjadi source of truth untuk:

```text
Fulfillment State
Fulfillment Task
Picking Record
Packing Record
Package
Quality Check
Handover
Fulfillment Exception
Fulfillment SLA
Fulfillment Events
```

Bukan source of truth untuk:

```text
Product → #20
Cart → #21
Order → #22
Booking → #22B
Payment → #23
Inventory → #24
Shipping → #26
Return → #27
```

---

# 86. Inventory Source of Truth Tetap #24

Walaupun #25 melakukan:

```text
Pick 2
```

actual inventory balance/movement tetap dicatat oleh #24.

Fulfillment menyimpan:

```text
What was picked
When
By whom
For which order
```

---

# 87. Fulfillment + Inventory Movement

Contoh:

```text
#24 Inventory:
Allocated = 2

↓ Fulfillment Pick

#25:
PICKED = 2

↓ Inventory consequence

#24:
Stock Movement
```

Satu source of truth harus dipertahankan.

---

# 88. Fulfillment + Return

Return flow:

```text
#26 / Delivery
↓
Delivered
↓
#27 Return
↓
#24 Inventory
```

Fulfillment record tetap menjadi historical record.

---

# 89. Analytics Events

Fulfillment menghasilkan data:

```text
Processing Time
Pick Duration
Packing Duration
QA Duration
Handover Time
SLA
Failure
Delay
Partial Fulfillment
```

---

# 90. AI Fulfillment Use Cases

Feature #18 dapat membantu:

```text
Predict Fulfillment Delay
Optimize Source Location
Suggest Pick Sequence
Detect Picking Anomaly
Suggest Packaging
Predict Partial Fulfillment
```

AI hanya assistive.

---

# 91. Edge Case — Order Cancelled During Picking

```text
Order
↓
PICKING
↓
Cancellation
```

Flow:

```text
Stop Task
↓
Reconcile Picked Item
↓
Return / Hold
↓
#24 Inventory
```

---

# 92. Edge Case — Order Cancelled After Packing

```text
PACKED
↓
Cancellation
```

Jangan:

```text
DELETE PACKAGE
```

Harus ada:

```text
Unpack / Reconcile
↓
Inventory Disposition
```

---

# 93. Edge Case — Product Damaged During Fulfillment

```text
Picked
↓
Damaged
```

Fulfillment:

```text
ON_HOLD
```

Inventory:

```text
DAMAGED
```

Order resolution:

```text
Alternative
Cancel
Re-Fulfill
```

sesuai policy.

---

# 94. Edge Case — Wrong Quantity

```text
Required = 5
Picked = 4
```

System:

```text
SHORT_PICK
```

---

# 95. Edge Case — Wrong Product

```text
Required:
Product A

Picked:
Product B
```

System:

```text
VERIFICATION_FAILED
```

---

# 96. Edge Case — Package Lost Before Shipping

Jika package hilang sebelum handover:

```text
Package
↓
Lost
```

Fulfillment:

```text
EXCEPTION / ON_HOLD
```

Order/inventory resolution mengikuti policy.

---

# 97. Edge Case — Courier Rejects Package

```text
READY_FOR_SHIPPING
↓
Courier Reject
```

Fulfillment:

```text
ON_HOLD
```

possible action:

```text
Repack
Rebook Courier
Alternative Courier
```

Shipment consequence ditangani #26.

---

# 98. Edge Case — Pickup No-Show

```text
READY_FOR_PICKUP
↓
Customer No-Show
```

Fulfillment dapat tetap:

```text
READY / ON_HOLD
```

Booking menjadi:

```text
NO_SHOW
```

Inventory reservation mengikuti #24.

---

# 99. Edge Case — Service Handover Delay

```text
READY_FOR_SERVICE
```

tetapi teknisi belum mengambil:

```text
WAITING_FOR_HANDOVER
```

Jangan otomatis dianggap failed tanpa policy.

---

# 100. Final Business Flow

```text
#22 ORDER
       ↓
#23 PAYMENT
       ↓
#24 INVENTORY
       ↓
ALLOCATED
       ↓
🔥 #25 FULFILLMENT
       │
       ├── PICK
       │
       ├── VERIFY
       │
       ├── PACK
       │
       ├── QUALITY CHECK
       │
       └── HANDOVER
              │
       ┌──────┴────────┐
       ↓               ↓
READY FOR          READY FOR
SHIPPING           PICKUP
       ↓               ↓
#26 SHIPPING      #22B BOOKING
       ↓               ↓
DELIVERED         CUSTOMER HANDOVER
```

---

# 101. Full Product Flow

```text
#20 Product Discovery
       ↓
#21 Cart
       ↓
#22A Order
       ↓
#22B Booking jika perlu
       ↓
#23 Payment
       ↓
#24 Inventory
       ↓
🔥 #25 Fulfillment
       ↓
#26 Shipping & Tracking
       ↓
#27 Return / Refund
       ↓
#24 Inventory
```

---

# 102. Service Product Flow

```text
Service
   ↓
#19 Product Requirement
   ↓
#20 Product Discovery
   ↓
#21 Cart
   ↓
#22 Order / Booking
   ↓
#23 Payment
   ↓
#24 Inventory
   ↓
#25 Fulfillment
   ↓
Provider / Worker Handover
   ↓
Service Execution
```

---

# 103. Important Business Rules

1. **#25 Fulfillment fokus pada fulfillment barang/product.**
2. Fulfillment ≠ Order.
3. Fulfillment ≠ Payment.
4. Fulfillment ≠ Inventory.
5. Fulfillment ≠ Shipping.
6. Fulfillment ≠ Return.
7. Inventory adalah source of truth stock.
8. Fulfillment adalah source of truth fulfillment execution.
9. Order menentukan apa yang harus dipenuhi.
10. Fulfillment menentukan bagaimana barang dipenuhi.
11. Add to Cart tidak memulai fulfillment.
12. Fulfillment harus menggunakan valid order context.
13. Fulfillment membutuhkan inventory condition yang sesuai.
14. Payment condition harus memenuhi policy.
15. Booking condition harus dipenuhi bila applicable.
16. Fulfillment dapat memiliki multiple fulfillment per order.
17. Multi-seller dapat menghasilkan fulfillment berbeda.
18. Split fulfillment harus didukung.
19. Partial fulfillment harus didukung.
20. Picking harus memiliki traceability.
21. Wrong product harus dapat terdeteksi.
22. Wrong quantity harus dapat terdeteksi.
23. Packing harus dapat memiliki package identity.
24. Package ≠ Shipment.
25. Quality check dapat menjadi mandatory.
26. Mandatory packaging requirement tidak boleh dihapus sembarangan.
27. Fulfillment exception dapat menyebabkan ON_HOLD.
28. Re-pick harus didukung.
29. Re-pack harus didukung.
30. Fulfillment cancellation harus memicu inventory reconciliation.
31. Fulfillment completion ≠ Order completion.
32. Handover type harus jelas.
33. Courier handover mengarah ke #26.
34. Customer pickup handover berkaitan dengan #22B.
35. Service handover dapat mengarah ke Service Execution.
36. Payment expiration dapat menghentikan fulfillment sesuai state/policy.
37. Inventory consequence tetap diproses oleh #24.
38. Return inventory effect tetap diproses #24 setelah #27.
39. Fulfillment SLA dapat dimonitor.
40. Fulfillment delay tidak otomatis berarti fault tanpa root-cause evidence.
41. AI hanya assistive.
42. AI tidak boleh mengubah fulfillment diam-diam.
43. Backend authorization wajib ditegakkan.
44. Critical fulfillment action harus idempotent.
45. Critical fulfillment action harus audit-able.
46. Fulfillment status harus terpisah dari payment/inventory/shipping status.
47. Fulfillment historical record tidak boleh dihapus setelah transaksi relevan.
48. Product fulfillment dapat digunakan untuk direct purchase.
49. Product fulfillment dapat digunakan untuk service-related material.
50. Provider dapat mempunyai fulfillment untuk material sendiri.
51. Worker dapat menjalankan assigned fulfillment task.
52. Customer hanya melihat fulfillment information yang relevan.
53. Seller hanya mengakses fulfillment yang menjadi tanggung jawabnya.
54. Admin dapat melakukan controlled operational intervention.
55. CEO berfokus pada policy dan analytics.

---

# 104. MVP Scope

```text
✅ Fulfillment Request
✅ Fulfillment Status
✅ Fulfillment Item
✅ Inventory Allocation Context
✅ Picking
✅ Pick Verification
✅ Quantity Verification
✅ Packing
✅ Package
✅ Basic Quality Check
✅ Ready for Pickup
✅ Ready for Shipping
✅ Handover
✅ Partial Fulfillment
✅ Split Fulfillment
✅ Multi-Seller Fulfillment
✅ Fulfillment Exception
✅ Fulfillment Hold
✅ Re-Pick
✅ Re-Pack
✅ Fulfillment SLA
✅ Basic Analytics
✅ Role & Access
✅ Audit
✅ Idempotency
✅ Data Model
✅ #24 Integration
✅ #26 Integration
✅ #27 Integration
```

---

# 105. Scale-Up

Potential future capabilities:

```text
Advanced Warehouse Management
Zone Picking
Batch Picking
Wave Picking
Smart Routing
Automatic Pick Assignment
Advanced Packaging Optimization
Dimension / Weight Automation
Multi-Warehouse Optimization
Fulfillment Orchestration
Robotic Warehouse
Computer Vision QA
Smart Delay Prediction
AI Fulfillment Optimization
Enterprise Fulfillment
3PL Integration
```

---

# 106. Source of Truth Matrix

| Domain | Source of Truth |
|---|---|
| Product | #20 |
| Cart | #21 |
| Order | #22A |
| Booking | #22B |
| Payment | #23 |
| Inventory | #24 |
| **Fulfillment** | **#25** |
| Shipping | #26 |
| Return / Refund | #27 |
| Service Requirement | #19 |
| Asset | #15 |

---

# 107. Final Architecture

```text
                         #22 ORDER
                              │
                              ↓
                         #23 PAYMENT
                              │
                              ↓
                        #24 INVENTORY
                              │
                         ALLOCATED
                              │
                              ↓
                     🔥 #25 FULFILLMENT
                              │
             ┌────────────────┼────────────────┐
             ↓                ↓                ↓
           PICK            VERIFY            PACK
             │                │                │
             └────────────────┼────────────────┘
                              ↓
                        QUALITY CHECK
                              │
                    ┌─────────┴─────────┐
                    ↓                   ↓
             READY FOR SHIPPING   READY FOR PICKUP
                    │                   │
                    ↓                   ↓
                 #26 SHIPPING        #22B BOOKING
                    │                   │
                    ↓                   ↓
                DELIVERED           HANDOVER
```

---

# 🔒 108. LOCKED STATUS — FEATURE #25

```text
✅ Fulfillment Definition
✅ Product-Focused Fulfillment
✅ Order Boundary
✅ Payment Boundary
✅ Inventory Boundary
✅ Shipping Boundary
✅ Return Boundary
✅ Fulfillment Mode
✅ Direct Purchase
✅ Service-Related Product
✅ Provider Inventory Fulfillment
✅ Fulfillment Group
✅ Multi-Seller Fulfillment
✅ Multiple Fulfillment per Order
✅ Split Fulfillment
✅ Partial Fulfillment
✅ Picking
✅ Pick List
✅ Pick Verification
✅ Wrong Product Detection
✅ Quantity Verification
✅ Packing
✅ Multiple Packages
✅ Package vs Shipment
✅ Packaging Requirement
✅ Quality Check
✅ Fulfillment Exception
✅ Fulfillment Hold
✅ Re-Pick
✅ Re-Pack
✅ Fulfillment Failure
✅ Fulfillment Cancellation
✅ Payment Expiry Integration
✅ Pre-Order Fulfillment
✅ Backorder Fulfillment
✅ Handover
✅ Courier Handover
✅ Customer Handover
✅ Provider Handover
✅ Worker Handover
✅ Handover Verification
✅ Fulfillment Completion
✅ Fulfillment ≠ Order Completion
✅ Fulfillment SLA
✅ Delay
✅ Root Cause
✅ Customer View
✅ Merchant View
✅ Provider View
✅ Worker View
✅ Admin View
✅ CEO View
✅ Role & Access
✅ Security
✅ Audit
✅ Idempotency
✅ Data Model
✅ Event Model
✅ Source of Truth
✅ Cross-Feature Integration
✅ Edge Cases
✅ MVP
✅ Scale-Up
✅ Final Architecture
```

---

# 109. Final Scope Statement

> **Feature #25 Fulfillment Barang adalah operational execution layer Servio untuk memenuhi Product Order melalui allocation context dari Inventory, picking, verification, packing, quality check, packaging, handover, dan fulfillment exception handling. Feature ini mendukung direct purchase maupun service-related product/material, multi-seller, split fulfillment, partial fulfillment, pickup, delivery preparation, dan handover ke provider/worker. Inventory tetap menjadi source of truth stock, Shipping menjadi source of truth shipment/delivery, dan Fulfillment menjadi source of truth untuk execution record dari proses persiapan sampai handover.**

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
#22 Booking / Order Barang ✅
#23 Payment Barang ✅
#24 Inventory ✅
#25 Fulfillment ✅
#26 Shipping & Tracking
#27 Return / Refund
```

---

# 111. Final Locked Principle

> **#24 = barangnya tersedia dan terkontrol. #25 = barangnya dipick, diverifikasi, dikemas, dicek, dan diserahkan sampai titik handover fulfillment. #26 = barangnya dikirim dan dilacak. Dengan boundary ini, Fulfillment tidak mengambil alih Inventory atau Shipping, tetapi menjadi jembatan operasional antara stock yang sudah dialokasikan dan delivery/handover.**
