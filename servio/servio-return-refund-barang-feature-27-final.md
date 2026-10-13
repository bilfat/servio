# SERVIO — FEATURE #27
# Return / Refund Barang

**Status:** 🔒 LOCKED / FINAL  
**Roadmap:** #27 dari 27  
**Domain:** Product / Barang  
**Depends On:** #12 Complaint / Dispute, #22 Order Barang, #23 Payment Barang, #24 Inventory, #25 Fulfillment, #26 Shipping & Tracking  
**Related:** #13 Warranty, #15 Asset, #19 Service + Product Integration  
**Position:** Penutup Product / Barang Lifecycle

---

# 1. Definisi Feature

**Return / Refund (#27)** adalah domain yang menangani proses setelah transaksi ketika customer atau pihak terkait membutuhkan:

- pembatalan pasca-order,
- pengembalian barang,
- penggantian barang,
- pertukaran barang,
- pengembalian dana sebagian,
- pengembalian dana penuh,
- credit,
- return-to-seller,
- return-to-sender,
- pemeriksaan barang yang dikembalikan,
- penyelesaian masalah pasca-delivery.

### Prinsip paling penting

```text
RETURN
= proses barang kembali

REFUND
= proses uang dikembalikan
```

Return dan refund dapat terjadi bersama, tetapi **tidak selalu harus bersamaan**.

Contoh:

```text
Return + Refund
```

atau:

```text
Return + Replacement
```

atau:

```text
No Return + Refund
```

atau:

```text
Return + No Refund
```

---

# 2. Posisi #27 dalam Product Lifecycle

Lifecycle utama:

```text
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
#26 Shipping & Tracking
        ↓
DELIVERED
        ↓
🔥 #27 RETURN / REFUND
```

Namun #27 dapat dipicu sebelum delivery.

Contoh:

```text
Order
↓
Payment PAID
↓
Customer Cancel
↓
Refund
```

Jadi #27 bukan hanya feature setelah `DELIVERED`.

---

# 3. Tujuan Feature

Feature #27 bertujuan memastikan bahwa proses reverse transaction Servio:

1. memiliki policy yang jelas,
2. dapat menentukan eligibility,
3. dapat mengelola return request,
4. dapat menangani partial return,
5. dapat menangani return shipment,
6. dapat mencatat barang diterima kembali,
7. dapat melakukan inspection,
8. dapat menentukan resolution,
9. dapat mengelola replacement,
10. dapat mengelola refund,
11. dapat mengelola partial refund,
12. dapat mengubah disposition inventory melalui #24,
13. memiliki audit trail,
14. dapat diteruskan ke dispute apabila terjadi sengketa.

---

# 4. Scope #27

## 4.1 Source of Truth #27

#27 menjadi source of truth untuk:

- Return Request
- Return Number
- Return Item Context
- Return Eligibility
- Return Reason
- Return Policy Snapshot
- Return Window
- Return Method
- Return Shipment Reference
- Return Receipt
- Return Inspection
- Return Resolution
- Replacement Context
- Refund Request Context
- Refund Allocation Context
- Return Disposition Context
- Return SLA
- Return Events
- Return Audit Trail

## 4.2 Bukan Source of Truth #27

| Domain | Source of Truth |
|---|---|
| Product | #20 |
| Cart | #21 |
| Order | #22 |
| Booking | #22B |
| Payment | #23 |
| Inventory | #24 |
| Fulfillment | #25 |
| Forward Shipping | #26 |
| Complaint / Dispute | #12 |
| Warranty | #13 |
| Asset | #15 |

---

# 5. Boundary #27 dengan Feature Lain

## #27 vs #23 Payment

```text
#27
→ menentukan refund business context

#23
→ mengeksekusi payment / refund transaction
```

Jadi:

```text
Return Approved
      ↓
Refund Requested
      ↓
#23 Payment
      ↓
Refund Executed
```

---

## #27 vs #24 Inventory

```text
#27
→ menentukan bahwa barang telah returned
dan hasil inspection/disposition

#24
→ menerapkan inventory movement / stock disposition
```

Contoh:

```text
Return Received
↓
Inspection PASSED
↓
RESTOCK
↓
#24 Inventory
```

---

## #27 vs #25 Fulfillment

Replacement menggunakan fulfillment infrastructure.

```text
Return Approved
↓
Replacement
↓
#25 Fulfillment
```

---

## #27 vs #26 Shipping

Return shipment menggunakan shipping infrastructure.

```text
Return
↓
Return Shipment
↓
#26 Shipping Infrastructure
```

#26 menangani pergerakan shipment; #27 tetap menjadi domain return.

---

## #27 vs #12 Complaint / Dispute

Complaint/dispute menangani sengketa.

Contoh:

```text
Return Rejected
↓
Customer Disagrees
↓
#12 Complaint / Dispute
```

#27 tidak menjadi dispute engine.

---

# 6. Return ≠ Refund

Ini merupakan business rule yang **LOCKED**.

### Return

Barang bergerak kembali.

```text
Customer
    ↓
Seller / Merchant / Provider
```

### Refund

Dana bergerak kembali.

```text
Payment System
    ↓
Customer
```

---

# 7. Return + Refund Matrix

| Return | Refund | Valid |
|---|---|---|
| ❌ | ✅ | Ya |
| ✅ | ❌ | Ya |
| ✅ | ✅ | Ya |
| ✅ | ✅ Partial | Ya |
| ✅ | Replacement | Ya |
| ✅ | Credit | Ya |

Contoh:

```text
Cancel before shipment
→ Refund
→ No Return
```

Contoh:

```text
Defective product
→ Return
→ Replacement
→ No Refund
```

---

# 8. Trigger Return / Refund

Return / Refund dapat dipicu oleh:

### Customer

- wrong item,
- wrong variant,
- damaged product,
- defective product,
- missing item,
- incomplete package,
- not as described,
- wrong quantity,
- does not work,
- customer changed mind apabila policy mengizinkan,
- duplicate order.

### Seller / Merchant

- seller cancellation,
- stock unavailable,
- wrong fulfillment,
- seller operational problem.

### Platform

- payment issue,
- system issue,
- policy enforcement,
- duplicate transaction.

### Shipping

```text
#26 Shipping
↓
DAMAGED
↓
#27 Return
```

### Complaint / Dispute

```text
#12 Complaint / Dispute
↓
Resolution requires return/refund
↓
#27
```

---

# 9. Return Reason

Standardized return reason:

```text
WRONG_ITEM
WRONG_VARIANT
DAMAGED
DEFECTIVE
MISSING_ITEM
INCOMPLETE_PACKAGE
NOT_AS_DESCRIBED
WRONG_QUANTITY
DOES_NOT_WORK
CUSTOMER_CHANGED_MIND
DUPLICATE_ORDER
SELLER_CANCELLATION
SHIPMENT_PROBLEM
OTHER
```

Reason digunakan untuk:

- eligibility,
- policy,
- analytics,
- seller quality,
- dispute,
- fraud/risk signals,
- operational workflow.

---

# 10. Return Policy

Return policy dapat mengatur:

- return window,
- eligible reasons,
- eligible products,
- item condition,
- packaging requirement,
- evidence requirement,
- excluded products,
- inspection requirement,
- return shipping responsibility,
- refund timing,
- replacement availability,
- exchange availability.

Policy harus configurable.

---

# 11. Policy Hierarchy

Policy dapat mengikuti hierarchy:

```text
Global Default
      ↓
Product Category
      ↓
Product Subcategory
      ↓
Product
      ↓
Offer / Seller Policy
```

Policy paling spesifik yang aktif menjadi effective policy.

---

# 12. Policy Versioning

Policy harus memiliki version.

Contoh:

```text
Policy V1
Return Window = 7 days
```

Kemudian:

```text
Policy V2
Return Window = 14 days
```

Order lama tetap menggunakan policy snapshot yang berlaku ketika transaksi dilakukan.

### Locked Rule

```text
Current Policy
≠
Historical Transaction Policy
```

---

# 13. Return Window

Return policy memiliki:

```text
return_eligible_from
return_eligible_until
```

Contoh:

```text
Delivered:
20 Sep 2026

Eligible Until:
27 Sep 2026
```

Angka seperti 7, 14, atau 30 hari bukan hardcoded business rule global; harus configurable melalui policy.

---

# 14. Return Eligibility

Sebelum request dibuat, backend memeriksa:

```text
Order eligible?
        ↓
Payment eligible?
        ↓
Item eligible?
        ↓
Within return window?
        ↓
Reason eligible?
        ↓
Quantity eligible?
        ↓
Already returned?
        ↓
Already refunded?
        ↓
Policy condition?
```

Result:

```text
ELIGIBLE
PARTIALLY_ELIGIBLE
NOT_ELIGIBLE
REQUIRES_REVIEW
```

---

# 15. Partial Return

Partial return wajib didukung.

Contoh:

```text
Order
├── Product A
├── Product B
├── Product C
└── Product D
```

Customer hanya mengembalikan:

```text
Product B
```

Maka return hanya mencakup item B.

---

# 16. Partial Quantity Return

Bukan hanya item-level.

Contoh:

```text
Order:
10 unit

Requested Return:
3 unit
```

Maka:

```text
Requested Quantity = 3
```

Sistem tidak boleh mengizinkan:

```text
Return Quantity > Eligible Quantity
```

---

# 17. Return Request Flow

Flow utama:

```text
Customer
   ↓
Select Order
   ↓
Select Item
   ↓
Select Quantity
   ↓
Select Reason
   ↓
Upload Evidence
   ↓
Eligibility Check
   ↓
Submit Return Request
   ↓
Review
```

---

# 18. Return Status

Status utama:

```text
DRAFT
REQUESTED
UNDER_REVIEW
APPROVED
REJECTED
RETURN_IN_PROGRESS
RETURN_SHIPPED
RETURN_RECEIVED
INSPECTION_PENDING
INSPECTION_IN_PROGRESS
INSPECTION_PASSED
INSPECTION_FAILED
RESOLUTION_PENDING
REPLACEMENT_IN_PROGRESS
REFUND_PENDING
COMPLETED
CANCELLED
EXPIRED
```

---

# 19. Return State Machine

Normal flow:

```text
REQUESTED
    ↓
UNDER_REVIEW
    ↓
APPROVED
    ↓
RETURN_IN_PROGRESS
    ↓
RETURN_SHIPPED
    ↓
RETURN_RECEIVED
    ↓
INSPECTION
    ↓
RESOLUTION
```

Possible resolution:

```text
REFUND
REPLACEMENT
EXCHANGE
CREDIT
NO_ACTION
```

---

# 20. Return Approval

Return dapat menggunakan:

### Auto Approval

Misalnya:

```text
Valid return window
+
Eligible product
+
Eligible reason
+
Low risk
```

### Manual Review

Untuk:

```text
High value
Damage
Policy exception
Suspicious activity
Inspection ambiguity
Repeated return
```

---

# 21. Return Decision

Decision:

```text
APPROVED
PARTIALLY_APPROVED
REJECTED
REQUIRES_INFORMATION
```

Jika rejected:

```text
Reason
+
Decision
+
Actor
+
Timestamp
```

harus dicatat.

---

# 22. Return Method

MVP:

```text
DROP_OFF
PICKUP
DIRECT_HANDOVER
```

Scale-up:

```text
LOCKER
PARTNER_LOCATION
SCHEDULED_PICKUP
```

---

# 23. Return Shipment

Jika barang perlu dikirim kembali:

```text
Customer
   ↓
Return Shipment
   ↓
Seller / Merchant / Provider
```

Return shipment dapat menggunakan infrastructure #26.

### Important

```text
Return Shipment
≠
Forward Shipment
```

---

# 24. Return Tracking

Return shipment dapat memiliki:

- carrier,
- tracking number,
- shipment status,
- tracking timeline,
- ETA,
- delivery attempt,
- delivery proof.

Infrastructure tracking tetap dapat menggunakan #26.

---

# 25. Return Shipment Data Relation

Conceptual:

```text
Return
   ↓
Return Shipment
   ↓
#26 Shipment
```

Contoh:

```text
return_id
shipment_id
carrier_id
tracking_number
```

---

# 26. Return Shipping Responsibility

Return shipping responsibility harus configurable.

### Seller Fault

Contoh:

```text
WRONG_ITEM
DAMAGED
DEFECTIVE
WRONG_QUANTITY
```

Dapat menjadi:

```text
SELLER
atau
PLATFORM
```

### Customer Preference

Contoh:

```text
CUSTOMER_CHANGED_MIND
```

Customer dapat menanggung return shipping jika policy menetapkan demikian.

Tidak boleh hardcode:

```text
Customer always pays
```

atau:

```text
Seller always pays
```

---

# 27. Return Pickup

Return dapat menggunakan:

### Drop-Off

```text
Customer
↓
Drop-Off Point
↓
Seller
```

### Pickup

```text
Customer
↓
Courier
↓
Seller
```

### Direct Handover

```text
Customer
↓
Provider / Technician
```

Untuk service-related product.

---

# 28. Return Address

Return address harus menggunakan snapshot.

Conceptual:

```text
return_address_snapshot
recipient_name
phone
address
location_context
captured_at
```

Address profile customer yang berubah setelah request tidak boleh mengubah historical return destination.

---

# 29. Return Inspection

Return received tidak otomatis berarti refund.

Flow:

```text
RETURN_RECEIVED
        ↓
INSPECTION
        ↓
RESULT
```

Inspection dapat mengecek:

- product identity,
- variant,
- quantity,
- serial number,
- condition,
- damage,
- missing component,
- packaging,
- misuse,
- completeness.

---

# 30. Inspection Result

```text
PASSED
PARTIALLY_PASSED
FAILED
REQUIRES_REVIEW
```

Contoh:

```text
Returned:
3 units

Inspection:
2 valid
1 invalid
```

Result:

```text
PARTIALLY_PASSED
```

---

# 31. Inspection Per Item

Inspection harus dapat dilakukan per item dan quantity.

Contoh:

```text
Return:
5 units

Inspection:
4 ACCEPTED
1 REJECTED
```

Ini diperlukan untuk partial refund atau partial resolution.

---

# 32. Item Condition

Kondisi dapat dicatat sebagai:

```text
UNOPENED
OPENED_UNUSED
USED_GOOD
USED_DAMAGED
DEFECTIVE
MISSING_PARTS
WRONG_ITEM
UNSELLABLE
```

---

# 33. Inventory Disposition

Setelah inspection:

```text
#27
Return Inspection
      ↓
Disposition
      ↓
#24 Inventory
```

Possible disposition:

```text
RESTOCK
QUARANTINE
DAMAGED
WRITE_OFF
RETURN_TO_SUPPLIER
```

---

# 34. Return ≠ Inventory Adjustment

#27 menjawab:

> "Barang ini sudah kembali sebagai return dan apa hasil pemeriksaannya?"

#24 menjawab:

> "Bagaimana kondisi stok setelah barang kembali?"

Flow:

```text
RETURN_RECEIVED
↓
INSPECTION
↓
DISPOSITION
↓
#24 INVENTORY
```

---

# 35. Refund

Refund adalah proses pengembalian dana.

Types:

```text
FULL_REFUND
PARTIAL_REFUND
ITEM_REFUND
SHIPPING_REFUND
FEE_REFUND
CREDIT
```

Tidak semua jenis harus tersedia untuk semua policy.

---

# 36. Refund Without Return

Valid.

Contoh:

```text
Payment PAID
↓
Order cancelled before shipment
↓
No physical return
↓
Refund
```

Jadi:

```text
Return = FALSE
Refund = TRUE
```

merupakan valid state.

---

# 37. Return Without Refund

Juga valid.

Contoh:

```text
Return
↓
Replacement
```

Tidak ada refund uang.

---

# 38. Partial Refund

Wajib.

Contoh:

```text
Order Total = Rp500.000

Refund = Rp150.000
```

Payment state dapat menjadi:

```text
PARTIALLY_REFUNDED
```

---

# 39. Refund Calculation

Refund calculation harus menggunakan:

```text
Official Order
+
Order Item Snapshot
+
Payment Allocation
+
Return Decision
+
Policy
```

Bukan:

```text
Current Cart
```

Cart bukan source of truth refund.

---

# 40. Refund Allocation

Refund harus bisa ditelusuri ke item/payment.

Contoh:

```text
Order
├── Item A
├── Item B
└── Item C

Return:
Item B

Refund
↓
Item B
↓
Payment Allocation
```

Ini penting untuk:

- partial refund,
- accounting,
- audit,
- reconciliation.

---

# 41. Refund Status

Business refund request:

```text
REQUESTED
PENDING
APPROVED
PROCESSING
COMPLETED
FAILED
CANCELLED
PARTIALLY_REFUNDED
```

Payment layer #23 tetap dapat memakai:

```text
REFUND_PENDING
PARTIALLY_REFUNDED
REFUNDED
```

Separation ini harus dipertahankan.

---

# 42. Refund Execution

Flow:

```text
#27
Refund Approved
     ↓
Refund Request
     ↓
#23 Payment
     ↓
Payment Refund Execution
     ↓
Refund Result
     ↓
#27 Update State
```

---

# 43. Refund Destination

Refund mengikuti mekanisme payment yang didukung.

Contoh:

```text
Card
→ supported original payment refund

E-wallet
→ supported wallet refund

Payment Gateway
→ gateway refund mechanism

Other
→ configured refund mechanism
```

#27 tidak membuat sistem payment baru.

---

# 44. Refund Timing

Refund dapat membutuhkan waktu.

Flow:

```text
Return Approved
      ↓
Refund Requested
      ↓
Processing
      ↓
Completed
```

Customer harus melihat current status.

---

# 45. Refund Failure

Jika refund gagal:

```text
REFUND_PROCESSING
       ↓
FAILED
       ↓
Retry / Payment Operations
```

Tidak boleh otomatis menganggap:

```text
Refund Completed
```

---

# 46. Replacement

Replacement adalah penyelesaian selain refund.

Contoh:

```text
Defective Product
↓
Return
↓
Inspection
↓
Replacement
```

Replacement dapat berupa:

- same product,
- same variant,
- approved alternative,
- exchange variant sesuai policy.

---

# 47. Replacement Flow

```text
Return Request
      ↓
Approved
      ↓
Return
      ↓
Inspection
      ↓
Replacement Decision
      ↓
#25 Fulfillment
      ↓
#26 Shipping
      ↓
Delivered
```

---

# 48. Replacement ≠ New Purchase

Replacement bukan pembelian baru customer.

```text
Original Order
      ↓
Return Case
      ↓
Replacement
```

Reference terhadap original transaction harus dipertahankan.

---

# 49. Exchange

Exchange dapat direpresentasikan sebagai:

```text
Return Original Item
+
Replacement Item
```

Contoh:

```text
Size M
↓
Return

Size L
↓
Replacement
```

Jika terdapat price difference:

```text
Price Difference
↓
Customer Approval
↓
#23 Payment
```

sesuai policy.

---

# 50. Resolution Types

MVP:

```text
NO_ACTION
REFUND
PARTIAL_REFUND
REPLACEMENT
EXCHANGE
CREDIT
```

Scale-up:

```text
STORE_CREDIT
ADDITIONAL_SERVICE
REPAIR
PRICE_ADJUSTMENT
```

---

# 51. Return-to-Sender Integration

Dari #26:

```text
#26 Shipping
↓
RETURN_TO_SENDER
↓
#27 Return
↓
RETURN_RECEIVED
↓
INSPECTION
↓
REFUND / REPLACEMENT / DISPOSITION
```

Jangan dibuat sebagai dua sistem return berbeda.

---

# 52. Cancellation Before Shipment

Contoh:

```text
Order
↓
Payment PAID
↓
Customer CANCEL
↓
Shipment Not Created
↓
Refund
```

Tidak membutuhkan return shipment.

---

# 53. Cancellation After Shipment

Contoh:

```text
Order
↓
Shipment Created
↓
Customer Cancel
```

Possible outcomes:

```text
Intercept
OR
Continue Delivery
OR
Return To Sender
```

bergantung capability carrier dan policy.

---

# 54. Cancellation vs Return

Cancellation terjadi untuk menghentikan transaksi.

Return terjadi untuk mengembalikan barang.

Contoh:

```text
Cancel before shipping
→ Cancellation + Refund
```

vs:

```text
Delivered
→ Return + Refund
```

---

# 55. Complaint / Dispute Integration

Jika ada disagreement:

```text
Return Rejected
        ↓
Customer Disagrees
        ↓
#12 Complaint / Dispute
```

atau:

```text
Inspection Rejected
        ↓
Customer Disputes
        ↓
#12
```

Official dispute decision tetap dikelola #12.

---

# 56. Evidence

Return evidence dapat berupa:

- photo,
- video,
- receipt,
- package photo,
- serial number photo,
- label,
- delivery proof,
- description,
- document.

Evidence harus memiliki:

```text
owner
source
timestamp
return reference
item reference
access scope
```

---

# 57. Return Evidence vs Other Proof

Harus dibedakan:

```text
#9 Proof of Service
→ bukti pekerjaan jasa

#26 Proof of Delivery
→ bukti delivery

#27 Return Evidence
→ bukti kondisi / alasan return
```

Jangan menyatukan ketiganya menjadi satu domain.

---

# 58. Return Deadline

Backend harus menyimpan:

```text
return_eligible_from
return_eligible_until
```

Hal ini mencegah ketergantungan pada perhitungan waktu real-time yang mengabaikan historical policy.

---

# 59. Return Expired

Jika deadline lewat:

```text
REQUESTED
↓
EXPIRED
```

Admin dapat melakukan controlled override jika policy mengizinkan.

Override harus diaudit.

---

# 60. Return Exceptions

Possible exceptions:

```text
RETURN_LABEL_FAILED
PICKUP_FAILED
RETURN_SHIPMENT_DELAYED
RETURN_SHIPMENT_LOST
RETURN_SHIPMENT_DAMAGED
RETURN_NOT_RECEIVED
WRONG_ITEM_RETURNED
QUANTITY_MISMATCH
INSPECTION_CONFLICT
REFUND_FAILED
REPLACEMENT_UNAVAILABLE
SYSTEM_ERROR
```

---

# 61. Exception Handling

Exception tidak selalu berarti return cancelled.

Contoh:

```text
RETURN_SHIPMENT_DELAYED
↓
Continue Tracking
```

atau:

```text
REFUND_FAILED
↓
Payment Operations Retry
```

---

# 62. Return SLA

Return dapat mempunyai SLA:

```text
Seller Review
Inspection
Refund Processing
Replacement Processing
```

Contoh:

```text
Review Target
Inspection Target
Refund Target
Replacement Target
```

Angka SLA harus configurable.

---

# 63. Fraud / Abuse Signals

Return system dapat menghasilkan risk signal dari:

- repeated return,
- repeated damaged claims,
- repeated missing item,
- serial mismatch,
- abnormal frequency,
- duplicate refund attempt,
- suspicious timing,
- inconsistent evidence.

Namun:

```text
Risk Signal ≠ Final Fraud Decision
```

Decision tetap membutuhkan policy / review.

---

# 64. AI Support

AI dapat membantu:

- return reason classification,
- evidence summarization,
- missing evidence detection,
- return risk signals,
- anomaly detection,
- inspection assistance,
- resolution recommendation,
- customer explanation,
- seller explanation.

AI tidak boleh:

```text
❌ silent refund
❌ silent return creation
❌ invent evidence
❌ invent product condition
❌ declare customer fraud without review
❌ alter inventory directly without authorization
❌ mark refund completed without payment confirmation
```

---

# 65. Customer Journey

```text
My Orders
    ↓
Order Detail
    ↓
Return / Refund
    ↓
Select Item
    ↓
Select Quantity
    ↓
Select Reason
    ↓
Upload Evidence
    ↓
Eligibility Check
    ↓
Choose Resolution
    ↓
Submit Request
    ↓
Track Return
    ↓
Inspection
    ↓
Refund / Replacement
```

---

# 66. Customer Return Detail

Customer dapat melihat:

### Return Information

- return number,
- order number,
- item,
- quantity,
- reason,
- status.

### Logistics

- return method,
- return tracking,
- carrier,
- destination,
- shipment status.

### Inspection

- inspection status,
- result,
- accepted/rejected quantity.

### Financial

- refund amount,
- refund status.

### Resolution

- refund,
- replacement,
- exchange,
- credit.

---

# 67. Customer Actions

Customer dapat:

```text
VIEW RETURN
CANCEL RETURN
UPLOAD EVIDENCE
VIEW RETURN TRACKING
VIEW INSPECTION STATUS
VIEW REFUND STATUS
VIEW REPLACEMENT STATUS
REPORT ISSUE
```

Action tertentu hanya tersedia jika policy/state mengizinkan.

---

# 68. Merchant / Seller View

Merchant dapat:

```text
VIEW RETURN REQUEST
REVIEW EVIDENCE
APPROVE
REJECT
REQUEST INFORMATION
PROVIDE RETURN INSTRUCTIONS
RECEIVE RETURN
INSPECT
SUBMIT INSPECTION
APPROVE RESOLUTION
MANAGE REPLACEMENT
```

Refund execution tetap dilakukan payment system #23.

---

# 69. Provider View

Provider dapat terlibat ketika:

- product berkaitan dengan service,
- product berasal dari provider inventory,
- replacement part digunakan untuk service,
- maintenance material dikembalikan.

Provider hanya melihat return yang authorized dan related.

---

# 70. Admin / Operations View

Admin dapat:

```text
VIEW RETURN
REVIEW EXCEPTION
MANAGE SLA
INVESTIGATE
CONTROLLED OVERRIDE
COORDINATE REFUND ISSUE
HANDLE ESCALATION
```

Admin tidak boleh menghapus historical transaction tanpa governance.

---

# 71. CEO / Product Owner View

CEO / Product Owner fokus pada analytics:

```text
RETURN RATE
REFUND RATE
REPLACEMENT RATE
RETURN BY CATEGORY
RETURN BY PRODUCT
RETURN BY SELLER
RETURN REASON
DAMAGED RATE
REFUND AMOUNT
AVERAGE RESOLUTION TIME
RETURN SHIPPING COST
RETURN TO SENDER RATE
```

---

# 72. Return Analytics

MVP:

- total return requests,
- approved return,
- rejected return,
- return rate,
- partial return rate,
- refund amount,
- partial refund amount,
- replacement rate,
- average resolution time,
- return reasons,
- return by seller,
- return by product category.

---

# 73. Return Events

Minimum:

```text
RETURN_REQUESTED
RETURN_APPROVED
RETURN_REJECTED
RETURN_LABEL_CREATED
RETURN_PICKUP_REQUESTED
RETURN_SHIPPED
RETURN_RECEIVED
RETURN_INSPECTION_STARTED
RETURN_INSPECTION_COMPLETED
RETURN_RESOLUTION_SELECTED
REPLACEMENT_CREATED
REFUND_REQUESTED
REFUND_APPROVED
REFUND_COMPLETED
RETURN_CANCELLED
RETURN_EXPIRED
```

---

# 74. Audit

Critical action harus mencatat:

```text
actor
role
action
resource
timestamp
result
reason
source
```

Contoh:

```text
Admin
→ Override Return Eligibility
→ Approved
→ Reason: Verified exceptional case
```

---

# 75. Idempotency

Critical operations harus idempotent:

- create return,
- approve return,
- create return shipment,
- create refund request,
- submit replacement,
- complete refund.

Contoh:

```text
Refund Request
+
Same Idempotency Key
=
One logical refund request
```

---

# 76. Data Model

Core entities:

```text
return_requests
return_items
return_reasons
return_policies
return_shipments
return_addresses
return_inspections
return_inspection_items
return_evidence
return_resolutions
replacement_orders
refund_requests
refund_items
refund_allocations
return_dispositions
return_sla
return_events
return_audit_logs
```

---

# 77. `return_requests`

Conceptual:

```text
id
return_number
order_id
customer_id
seller_id
status
reason
return_method
policy_version
eligible_from
eligible_until
created_at
updated_at
```

Purpose:

Main entity return case.

---

# 78. `return_items`

Conceptual:

```text
id
return_id
order_item_id
product_id
variant_id
requested_quantity
approved_quantity
received_quantity
accepted_quantity
rejected_quantity
created_at
updated_at
```

Mendukung partial return.

---

# 79. `return_shipments`

Conceptual:

```text
id
return_id
shipment_id
carrier_id
tracking_number
status
origin
destination
created_at
updated_at
```

`shipment_id` dapat mengacu pada shipping infrastructure #26.

---

# 80. `return_addresses`

```text
id
return_id
address_type
recipient_name
phone
address_snapshot
location_context
captured_at
```

---

# 81. `return_inspections`

```text
id
return_id
status
inspected_by
inspected_at
result
notes
created_at
updated_at
```

---

# 82. `return_inspection_items`

```text
id
inspection_id
return_item_id
condition
quantity_received
quantity_accepted
quantity_rejected
reason
created_at
```

---

# 83. `return_evidence`

```text
id
return_id
return_item_id
evidence_type
file_reference
source
captured_at
created_by
created_at
```

---

# 84. `return_resolutions`

```text
id
return_id
resolution_type
refund_amount
replacement_reference
credit_amount
approved_by
approved_at
status
created_at
updated_at
```

Resolution:

```text
NO_ACTION
REFUND
PARTIAL_REFUND
REPLACEMENT
EXCHANGE
CREDIT
```

---

# 85. `replacement_orders`

Replacement perlu memiliki reference ke return.

Conceptual:

```text
id
return_id
original_order_id
replacement_order_id
status
created_at
updated_at
```

---

# 86. `refund_requests`

```text
id
return_id
payment_id
status
requested_amount
approved_amount
completed_amount
currency
reason
created_at
updated_at
```

---

# 87. `refund_items`

```text
id
refund_id
order_item_id
return_item_id
quantity
amount
created_at
```

---

# 88. `refund_allocations`

```text
id
refund_id
payment_transaction_id
payment_allocation_id
amount
created_at
```

Digunakan untuk financial traceability.

---

# 89. `return_dispositions`

```text
id
return_id
return_item_id
disposition
inventory_reference
quantity
created_at
```

Disposition:

```text
RESTOCK
QUARANTINE
DAMAGED
WRITE_OFF
RETURN_TO_SUPPLIER
```

---

# 90. `return_sla`

```text
id
return_id
review_target_at
inspection_target_at
resolution_target_at
refund_target_at
status
policy_version
created_at
updated_at
```

---

# 91. Main Business Flow

```text
CUSTOMER
    ↓
SELECT ORDER
    ↓
SELECT ITEM
    ↓
ELIGIBILITY CHECK
    ↓
RETURN REQUEST
    ↓
REVIEW
    ↓
APPROVED
    ↓
RETURN SHIPMENT
    ↓
RETURN RECEIVED
    ↓
INSPECTION
    ↓
RESOLUTION
    ├───────────────┬───────────────┐
    ↓               ↓               ↓
  REFUND       REPLACEMENT       CREDIT
    ↓               ↓
   #23             #25
 PAYMENT       FULFILLMENT
                    ↓
                   #26
                SHIPPING
```

---

# 92. Full Reverse Transaction

```text
DELIVERED
    ↓
RETURN REQUEST
    ↓
ELIGIBILITY
    ↓
APPROVAL
    ↓
RETURN MOVEMENT
    ↓
RETURN RECEIVED
    ↓
INSPECTION
    ↓
INVENTORY DISPOSITION
    ↓
RESOLUTION
    ├── REFUND
    ├── PARTIAL REFUND
    ├── REPLACEMENT
    ├── EXCHANGE
    └── CREDIT
```

---

# 93. Full Cross-Domain Flow

```text
#20 Product Discovery
        ↓
#21 Cart
        ↓
#22 Order
        ↓
#23 Payment
        ↓
#24 Inventory
        ↓
#25 Fulfillment
        ↓
#26 Shipping
        ↓
DELIVERED
        ↓
🔥 #27 Return / Refund
        │
        ├── #23 Payment → Refund
        ├── #24 Inventory → Disposition
        ├── #25 Fulfillment → Replacement
        ├── #26 Shipping → Return Shipment
        └── #12 Dispute → Escalation
```

---

# 94. Service + Product Return

Untuk product yang terhubung ke service:

```text
Service
↓
#19 Product Requirement
↓
Product
↓
Order
↓
Delivery
↓
Problem
↓
Return
```

Replacement part dapat:

```text
RETURN
↓
REPLACEMENT
↓
SHIP TO PROVIDER
↓
SERVICE EXECUTION
```

Return tidak otomatis membatalkan service order kecuali business rule memang mengharuskannya.

---

# 95. Asset Context

Jika barang dipasang pada asset:

```text
Product
↓
Installation
↓
Asset Component
```

Jika product kemudian di-return:

```text
Return
↓
Component Removal / Reversal Context
```

Namun asset identity tetap dikelola #15.

---

# 96. Warranty Context

Return dan warranty berbeda.

```text
Return
→ transaction-related protection

Warranty
→ post-service / product warranty protection
```

Jika return window sudah selesai tetapi product mengalami defect:

```text
Warranty Claim
↓
#13 Warranty
```

bukan otomatis #27.

Namun warranty resolution tertentu dapat memerlukan replacement/refund melalui integration yang sesuai.

---

# 97. Return vs Warranty

| Return | Warranty |
|---|---|
| Transaction / purchase issue | Product/service protection |
| Biasanya short window | Dapat lebih panjang |
| Reason terkait purchase/delivery | Defect / covered failure |
| Return policy | Warranty policy |
| Refund / replacement | Repair / replacement / other resolution |

Keduanya dapat terhubung, tetapi domainnya tetap berbeda.

---

# 98. Return vs Complaint

| Return | Complaint / Dispute |
|---|---|
| Proses pengembalian | Proses penyelesaian masalah/sengketa |
| Return request | Complaint case |
| Inspection | Investigation |
| Refund / replacement | Resolution / decision |
| #27 | #12 |

---

# 99. Role & Access Matrix

| Role | Access #27 |
|---|---|
| Customer | Create/view/cancel own return, upload evidence, view resolution/refund/replacement |
| Service Provider | View/manage authorized service-related return |
| Worker | View assigned return context bila diperlukan |
| Merchant | Review/approve/reject, receive, inspect, resolve own returns |
| Supplier | Manage authorized supply return |
| Admin / Operations | Operational review, investigation, exception, controlled override |
| CEO / Product Owner | Policy governance, analytics, monitoring |

---

# 100. Permission Model

Mengikuti arsitektur Servio:

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
CREATE
+
Return
+
OWN
=
ALLOW
```

Contoh:

```text
Customer
+
MANAGE
+
All Returns
+
PLATFORM
=
DENY
```

---

# 101. Security & Privacy

Return dapat memuat data sensitif transaksi.

Backend harus memastikan:

- ownership,
- seller relation,
- role authorization,
- evidence access,
- refund visibility,
- inspection access,
- audit access.

Jangan mengandalkan frontend visibility saja.

---

# 102. Notification

Customer dapat menerima notification ketika:

```text
RETURN_REQUESTED
RETURN_APPROVED
RETURN_REJECTED
RETURN_SHIPPED
RETURN_RECEIVED
INSPECTION_STARTED
INSPECTION_COMPLETED
REFUND_REQUESTED
REFUND_COMPLETED
REPLACEMENT_CREATED
REPLACEMENT_SHIPPED
EXCEPTION_OCCURRED
```

Notification tidak menjadi source of truth.

---

# 103. Customer Communication

Customer harus mendapatkan informasi yang jelas tentang:

- return eligibility,
- deadline,
- reason,
- approved/rejected status,
- return method,
- return shipping,
- inspection status,
- refund amount,
- refund status,
- replacement status.

Tidak boleh ada silent state change yang berdampak pada transaksi.

---

# 104. Example Case — Damaged Product

```text
Customer Receives
        ↓
Product Damaged
        ↓
Return Request
        ↓
Evidence
        ↓
Approved
        ↓
Return Shipment
        ↓
Return Received
        ↓
Inspection
        ↓
Damaged Confirmed
        ↓
Replacement
        ↓
#25 Fulfillment
        ↓
#26 Shipping
        ↓
Delivered
```

---

# 105. Example Case — Full Refund

```text
Customer Receives
        ↓
Not As Described
        ↓
Return
        ↓
Inspection
        ↓
Accepted
        ↓
Full Refund
        ↓
#23 Payment
```

---

# 106. Example Case — Partial Refund

```text
Order:
10 items

Return:
3 items

Inspection:
3 accepted

Resolution:
Partial Refund
```

---

# 107. Example Case — Refund Without Return

```text
Payment PAID
        ↓
Order Cancelled
        ↓
Shipment Not Created
        ↓
Refund
        ↓
#23 Payment
```

---

# 108. Example Case — Return Rejected

```text
Customer
↓
Return Request
↓
Outside Eligible Window
↓
REJECTED
↓
Customer Disagrees
↓
#12 Complaint / Dispute
```

---

# 109. Example Case — Return-to-Sender

```text
#26 Shipping
↓
DELIVERY_FAILED
↓
RETURN_TO_SENDER
↓
#27
↓
RETURN_RECEIVED
↓
INSPECTION
↓
REFUND / REPLACEMENT / RESTOCK
```

---

# 110. Example Case — Exchange

```text
Product Variant A
↓
Return
↓
Inspection
↓
Accepted
↓
Exchange
↓
Replacement Variant B
↓
#25 Fulfillment
↓
#26 Shipping
```

---

# 111. Important Business Rules

Berikut business rules yang **LOCKED**:

1. Return ≠ Refund.
2. Return menangani barang kembali.
3. Refund menangani uang kembali.
4. Return dan refund dapat terjadi terpisah.
5. Refund tanpa return diperbolehkan.
6. Return tanpa refund diperbolehkan.
7. Replacement diperbolehkan.
8. Exchange dapat direpresentasikan sebagai return + replacement.
9. Partial return wajib didukung.
10. Partial quantity return wajib didukung.
11. Partial refund wajib didukung.
12. #27 bukan source of truth payment.
13. #23 mengeksekusi refund.
14. #27 bukan source of truth inventory.
15. #24 menangani inventory disposition.
16. #27 bukan source of truth fulfillment.
17. #25 menangani replacement fulfillment.
18. #27 dapat menggunakan infrastructure #26 untuk return shipment.
19. Return shipment ≠ forward shipment.
20. Return-to-sender dari #26 dapat masuk #27.
21. Cancellation before shipment dapat menghasilkan refund tanpa return.
22. Cancellation after shipment tidak otomatis menghasilkan immediate refund.
23. Return policy harus versioned.
24. Historical transaction harus mempertahankan policy snapshot.
25. Return window harus dapat direpresentasikan secara eksplisit.
26. Eligibility harus divalidasi backend.
27. Return quantity tidak boleh melebihi eligible quantity.
28. Return item harus dapat ditelusuri ke order item.
29. Inspection dapat dilakukan per item dan quantity.
30. Partial inspection wajib didukung.
31. Return received ≠ refund completed.
32. Inspection passed ≠ refund otomatis jika resolution berbeda.
33. Inventory disposition dilakukan melalui #24.
34. Refund calculation menggunakan official transaction/payment context.
35. Cart bukan source refund calculation.
36. Refund execution harus idempotent.
37. Critical return actions harus diaudit.
38. Rejection harus memiliki reason.
39. Policy override harus diaudit.
40. Complaint/dispute tetap menggunakan #12.
41. Warranty tetap menggunakan #13.
42. Asset tetap menggunakan #15.
43. AI hanya assistive.
44. AI tidak boleh melakukan refund secara silent.
45. AI tidak boleh membuat evidence.
46. AI tidak boleh mengarang product condition.
47. AI tidak boleh menetapkan final fraud decision tanpa review.
48. AI tidak boleh menandai refund completed tanpa confirmation dari payment system.
49. Historical return/refund record tidak boleh dihapus sembarangan.
50. Backend authorization wajib ditegakkan.

---

# 112. MVP Scope

Feature #27 MVP mencakup:

```text
✅ Return Request
✅ Return Eligibility
✅ Return Reason
✅ Return Window
✅ Partial Return
✅ Partial Quantity Return
✅ Approval / Rejection
✅ Return Method
✅ Return Shipment
✅ Return Tracking
✅ Return Received
✅ Return Inspection
✅ Item Condition
✅ Partial Inspection
✅ Refund
✅ Partial Refund
✅ Replacement
✅ Exchange Context
✅ Return-to-Sender
✅ Refund Status
✅ Inventory Disposition
✅ Evidence
✅ Return SLA
✅ Complaint / Dispute Handoff
✅ Audit Trail
✅ Role & Access
✅ Notifications
✅ Return Analytics
```

---

# 113. Scale-Up

Scale-up:

```text
AI Return Risk Detection
Automatic Return Approval
Instant Refund
Refund Before Return
Automated Exchange
Smart Return Routing
Drop-Off Network
Locker Return
Advanced Fraud Detection
Automated Inspection
Computer Vision Inspection
Dynamic Return Policy
Seller Quality Scoring
Return Cost Optimization
Reverse Logistics Optimization
Cross-Border Return
Manufacturer RMA Integration
Warranty + Return Automation
```

---

# 114. Recommended Customer Screens

```text
My Orders
    ↓
Order Detail
    ↓
Return / Refund
    ↓
Select Items
    ↓
Reason
    ↓
Evidence
    ↓
Resolution
    ↓
Return Tracking
    ↓
Inspection
    ↓
Refund / Replacement
```

---

# 115. Recommended Admin Screens

```text
Return Dashboard
    ↓
Return Requests
    ↓
Return Detail
    ↓
Eligibility
    ↓
Evidence
    ↓
Inspection
    ↓
Resolution
    ↓
Refund Monitoring
    ↓
Exceptions
    ↓
Analytics
```

---

# 116. Recommended Merchant Screens

```text
My Returns
    ↓
Return Detail
    ↓
Evidence
    ↓
Review
    ↓
Approve / Reject
    ↓
Receive
    ↓
Inspect
    ↓
Resolve
```

---

# 117. Recommended API Domain

Conceptual routes:

```text
/api/returns
/api/returns/:id
/api/returns/:id/items
/api/returns/:id/eligibility
/api/returns/:id/evidence
/api/returns/:id/approve
/api/returns/:id/reject
/api/returns/:id/cancel
/api/returns/:id/shipment
/api/returns/:id/inspection
/api/returns/:id/resolution
/api/returns/:id/refund
/api/returns/:id/replacement
/api/returns/:id/events
```

Payment handoff:

```text
/api/refunds
/api/refunds/:id
```

tetap harus mengikuti payment architecture #23.

---

# 118. Final Architecture

```text
                         #22 ORDER
                              │
                              ▼
                         #23 PAYMENT
                              │
                              ▼
                      #24 INVENTORY
                              │
                              ▼
                     #25 FULFILLMENT
                              │
                              ▼
                     #26 SHIPPING
                              │
                              ▼
                          DELIVERED
                              │
                              ▼
                  🔥 #27 RETURN REQUEST
                              │
                              ▼
                       ELIGIBILITY
                              │
                 ┌────────────┴────────────┐
                 ▼                         ▼
              REJECTED                  APPROVED
                 │                         │
                 ▼                         ▼
              #12                      RETURN
             DISPUTE                      │
                                           ▼
                                   RETURN RECEIVED
                                           │
                                           ▼
                                       INSPECTION
                                           │
                                           ▼
                                      RESOLUTION
                              ┌────────────┼────────────┐
                              ▼            ▼            ▼
                           REFUND      REPLACEMENT    CREDIT
                              │            │
                              ▼            ▼
                             #23          #25
                           PAYMENT     FULFILLMENT
                                           │
                                           ▼
                                          #26
                                       SHIPPING
```

---

# 119. Final Product Lifecycle

Dengan #27 selesai, keseluruhan Product / Barang lifecycle Servio menjadi:

```text
#20 PRODUCT DISCOVERY
        ↓
#21 CART
        ↓
#22 ORDER / BOOKING
        ↓
#23 PAYMENT
        ↓
#24 INVENTORY
        ↓
#25 FULFILLMENT
        ↓
#26 SHIPPING & TRACKING
        ↓
DELIVERY
        ↓
#27 RETURN / REFUND
```

Reverse lifecycle:

```text
RETURN
↓
INSPECTION
↓
RESOLUTION
├── REFUND
├── PARTIAL REFUND
├── REPLACEMENT
├── EXCHANGE
└── CREDIT
```

---

# 120. Feature Relationship Matrix

| Feature | Handoff ke #27 |
|---|---|
| #12 Complaint / Dispute | Resolution requiring return/refund |
| #13 Warranty | Warranty-related replacement/refund context |
| #15 Asset | Asset/product relation context |
| #19 Service + Product | Service-related product return |
| #20 Product Discovery | Product identity/reference |
| #22 Order | Original transaction |
| #23 Payment | Refund execution |
| #24 Inventory | Returned stock disposition |
| #25 Fulfillment | Replacement fulfillment |
| #26 Shipping | Return shipment / RTS |
| #27 Return / Refund | Reverse transaction orchestration |

---

# 121. Final Boundary Statement

> **Feature #27 Return / Refund bertanggung jawab atas reverse transaction barang, mulai dari return request, eligibility, approval, return shipment, return receipt, inspection, resolution, replacement, hingga refund context. Eksekusi refund tetap berada pada payment domain #23, sedangkan inventory disposition tetap berada pada #24, replacement fulfillment pada #25, dan return shipment menggunakan shipping infrastructure #26.**

---

# 122. LOCK Status

# 🔒 FEATURE #27 — LOCKED / FINAL

**Nama:** Return / Refund Barang  
**Roadmap:** #27 / 27  
**Domain:** Product / Barang  
**Status:** FINAL

### Core Concepts

```text
Return ≠ Refund
Return ≠ Inventory
Refund ≠ Payment Domain
Replacement ≠ New Purchase
Return Shipment ≠ Forward Shipment
Inspection ≠ Resolution
Return ≠ Dispute
Return ≠ Warranty
```

### Source of Truth

```text
#27
→ Return / Reverse Transaction Context

#23
→ Payment / Refund Execution

#24
→ Inventory / Stock Disposition

#25
→ Replacement Fulfillment

#26
→ Shipping / Tracking

#12
→ Complaint / Dispute
```

### Product Roadmap Complete

```text
#20 Product Discovery            ✅
#21 Cart                         ✅
#22 Order / Booking Barang       ✅
#23 Payment Barang               ✅
#24 Inventory                    ✅
#25 Fulfillment Barang           ✅
#26 Shipping & Tracking          ✅
#27 Return / Refund              ✅ 🔒
```

**END OF PRODUCT / BARANG ROADMAP**
