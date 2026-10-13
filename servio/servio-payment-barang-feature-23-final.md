# SERVIO — FEATURE #23 PAYMENT BARANG
## Final Business Flow & Domain Specification

**Status:** FINAL / LOCKED  
**Roadmap:** #23 of #27  
**Domain:** PRODUCT / BARANG  
**Previous Feature:** #22 Booking / Order Barang  
**Next Features:** #24 Inventory, #25 Fulfillment, #26 Shipping & Tracking, #27 Return / Refund

> **Catatan arsitektur:** Feature #23 adalah domain pembayaran untuk Product Order. Payment dipisahkan dari Order, Booking, Inventory, Fulfillment, Shipping, dan Return/Refund. Countdown batas pembayaran merupakan **core business capability**, bukan sekadar elemen UI.

---

# 1. Definisi

**Payment Barang** adalah proses pembayaran atas Product Order yang sudah dibuat pada #22.

```text
#22 Order Barang
        ↓
Payment Required
        ↓
#23 Payment Barang
        ↓
Payment Success
        ↓
#24 Inventory
        ↓
#25 Fulfillment
```

Payment menjawab:

> **"Berapa yang harus dibayar, kapan batas pembayarannya, bagaimana cara membayar, dan apakah pembayaran berhasil?"**

---

# 2. Tujuan Feature #23

Payment Barang bertujuan untuk:

1. Membuat payment intent untuk order.
2. Menentukan amount dan currency.
3. Menentukan payment timing.
4. Menentukan payment deadline.
5. Menampilkan countdown batas pembayaran.
6. Menyediakan payment method dan instruction.
7. Menangani payment attempt.
8. Mendukung retry selama payment masih valid.
9. Menerima dan memvalidasi hasil payment provider.
10. Menangani payment expiration.
11. Menangani reconciliation dan exception.
12. Menghasilkan receipt/payment history.
13. Menjadi sumber kebenaran payment state.
14. Menjadi handoff yang jelas ke Inventory/Fulfillment setelah payment memenuhi precondition.

---

# 3. Prinsip Utama

```text
ORDER
=
Apa yang dibeli
```

```text
PAYMENT
=
Bagaimana dan kapan dibayar
```

```text
INVENTORY
=
Apakah barang tersedia
```

```text
FULFILLMENT
=
Bagaimana barang diproses dan dipenuhi
```

Sehingga:

```text
Order ≠ Payment
```

---

# 4. Default Payment Barang

Default untuk pembelian barang biasa:

```text
PAYMENT_TIMING
=
UPFRONT
```

Flow:

```text
Order Created
↓
Payment Required
↓
Countdown Started
↓
Customer Pays
↓
Payment Confirmed
↓
Fulfillment / Inventory Flow
```

Payment timing lain dapat didukung berdasarkan policy:

```text
UPFRONT
DEPOSIT
AFTER_FULFILLMENT
COD
MILESTONE
AUTHORIZATION
```

Namun **UPFRONT menjadi default** untuk marketplace purchase kecuali policy menentukan lain.

---

# 5. 🔥 Payment Countdown

Countdown batas pembayaran merupakan core behavior.

Saat payment membutuhkan pembayaran:

```text
PAYMENT REQUIRED
       ↓
payment_due_at
       ↓
COUNTDOWN
```

Contoh UI:

```text
Bayar sebelum:

00:14:37
```

atau:

```text
Sisa waktu pembayaran:
14 menit 37 detik
```

---

# 6. Countdown sebagai Business Rule

Countdown bukan hanya timer visual.

Source of truth:

```text
payment_due_at
+
server_time
```

Bukan:

```text
browser_local_clock
```

UI hanya merepresentasikan remaining time berdasarkan authoritative deadline.

---

# 7. Payment Deadline

Field utama:

```text
payment_due_at
```

Contoh:

```text
Order Created:
10:00:00

Payment Deadline:
10:30:00
```

Remaining:

```text
payment_due_at
-
current_server_time
```

---

# 8. Countdown UI State

Countdown dapat memiliki visual state:

```text
NORMAL
WARNING
EXPIRING_SOON
EXPIRED
```

Contoh:

```text
> 30 min
NORMAL
```

```text
10–30 min
WARNING
```

```text
< 10 min
EXPIRING SOON
```

```text
00:00
EXPIRED
```

Visual state bukan pengganti payment financial state.

---

# 9. Payment Reminder

Contoh policy:

```text
Payment Deadline:
15:00

13:00
Reminder

14:30
Final Reminder

14:59
Expiring Soon

15:00
Expired
```

Reminder frequency harus configurable dan mengikuti anti-spam policy.

---

# 10. Payment Deadline Policy

CEO / Product Owner mengontrol policy.

Contoh:

```text
Default:
30 minutes
```

Override dapat berdasarkan:

```text
Category
Subcategory
Product
Order Type
Payment Method
Booking Context
```

Seller tidak boleh secara bebas mengubah countdown customer di luar platform policy.

---

# 11. Payment Deadline Hierarchy

Effective policy dapat mengikuti:

```text
Global Default
      ↓
Category Override
      ↓
Subcategory Override
      ↓
Product / Order Type Override
      ↓
Specific Payment Policy
```

Konfigurasi paling spesifik yang aktif menjadi effective policy sesuai governance.

---

# 12. Payment Policy Snapshot

Payment intent menyimpan policy version.

Contoh:

```text
Policy Version:
PAY-2026-04

Deadline:
30 minutes
```

Jika policy berubah kemudian, payment existing tidak otomatis berubah.

---

# 13. Payment Intent

Payment intent merepresentasikan pembayaran yang sedang/akan diproses.

Contoh:

```text
Order:
ORD-001

Payment Intent:
PAY-001

Amount:
Rp150.000

Due:
10:30
```

---

# 14. Payment Intent vs Payment Attempt

```text
Payment Intent
 ├── Attempt 1 → Failed
 ├── Attempt 2 → Failed
 └── Attempt 3 → Success
```

Sehingga:

```text
Payment Intent ≠ Payment Attempt
```

Satu payment intent dapat memiliki multiple attempts sesuai policy.

---

# 15. Payment Status

Status mengikuti architecture Payment & Protection:

```text
UNPAID
REQUIRES_PAYMENT
REQUIRES_ACTION
PROCESSING
PAID
FAILED
EXPIRED
CANCELLED
REFUND_PENDING
PARTIALLY_REFUNDED
REFUNDED
```

Flow normal:

```text
REQUIRES_PAYMENT
↓
PROCESSING
↓
PAID
```

Expiry:

```text
REQUIRES_PAYMENT
↓
EXPIRED
```

---

# 16. Payment Deadline vs Payment Status

Keduanya berbeda.

Contoh:

```text
Payment Status:
REQUIRES_PAYMENT

Deadline:
10:30
```

Setelah deadline:

```text
Payment Status:
EXPIRED
```

Countdown adalah representation dari deadline; payment status adalah financial state.

---

# 17. Countdown Expired

Ketika:

```text
00:00
```

system mencapai:

```text
PAYMENT DEADLINE REACHED
```

kemudian:

```text
Payment Intent
↓
EXPIRED
```

Customer tidak boleh melanjutkan payment instruction lama sebagai normal valid payment.

---

# 18. Order Setelah Payment Expired

Default policy:

```text
Payment Deadline Expired
        ↓
Payment Intent EXPIRED
        ↓
Order Cancellation / Resolution
```

Order dapat menjadi:

```text
CANCELLED
```

dengan reason:

```text
PAYMENT_DEADLINE_EXPIRED
```

Grace period hanya berlaku jika policy mengizinkan.

---

# 19. Grace Period

Optional:

```text
Payment Deadline:
30 min

Grace Period:
5 min
```

Conceptually:

```text
00:00
↓
Deadline Reached

00:00–05:00
↓
Grace / Reconciliation Window
```

Grace period bukan hak otomatis customer.

Untuk MVP, grace period dapat dinonaktifkan.

---

# 20. Retry Payment

Customer dapat retry jika:

```text
Payment Status:
REQUIRES_PAYMENT
atau
REQUIRES_ACTION
```

dan deadline masih berlaku.

Flow:

```text
Attempt 1
↓
FAILED
↓
Retry
↓
Attempt 2
↓
SUCCESS
```

---

# 21. Retry Setelah Expired

Jika:

```text
Payment = EXPIRED
```

customer tidak menggunakan payment attempt lama untuk retry normal.

Possible next flow:

```text
New Payment Intent
```

atau:

```text
Re-Order
```

sesuai order status/policy.

---

# 22. Payment Method

Supported methods dapat mencakup:

```text
Bank Transfer
Virtual Account
QR Payment
E-Wallet
Card
Other Supported Method
```

Availability dapat berbeda berdasarkan:

```text
Region
Currency
Seller
Order Type
Payment Provider
Platform Policy
```

---

# 23. Payment Instruction

Setelah method dipilih:

```text
Payment Method
↓
Payment Instruction
```

Contoh:

```text
Virtual Account
VA Number
Rp150.000
Expires at 10:30
```

Countdown tetap menggunakan server-side payment deadline.

---

# 24. Bank Transfer

Flow:

```text
Order
↓
Payment Instruction
↓
Transfer
↓
Provider Callback / Reconciliation
↓
PAID
```

Screenshot transfer hanya supporting evidence untuk exception handling jika diperlukan; bukan source of truth ketika provider/API confirmation tersedia.

---

# 25. Payment Confirmation

Payment dapat menjadi PAID berdasarkan:

```text
Payment Provider Confirmation
+
Transaction Validation
```

Bukan hanya user claim:

```text
"I have paid."
```

---

# 26. Callback / Webhook

Provider dapat mengirim:

```text
SUCCESS
FAILED
PENDING
EXPIRED
```

Webhook harus diproses idempotent.

Duplicate callback tidak boleh menghasilkan duplicate financial transaction.

---

# 27. Race Condition — Countdown vs Payment

Contoh:

```text
Deadline:
10:30:00

Customer completes payment:
10:29:59

Provider callback arrives:
10:30:04
```

Jangan otomatis menganggap expired hanya karena callback datang terlambat.

System harus merekonsiliasi:

```text
Payment Transaction Time
Provider Confirmation
Provider Reference
Payment Reconciliation
```

sesuai kemampuan payment provider.

---

# 28. Successful Payment Near Deadline

Jika provider membuktikan payment sukses sebelum deadline:

```text
Payment = PAID
```

meskipun callback diterima beberapa detik setelah deadline.

---

# 29. Late Payment

Jika payment memang dilakukan setelah deadline:

```text
Deadline:
10:30

Payment:
10:31
```

possible outcome berdasarkan policy/provider capability:

```text
REJECT
REFUND
MANUAL_REVIEW
ACCEPT_UNDER_POLICY
```

Refund execution tetap berada pada #27.

---

# 30. Payment Amount

Payment amount harus berasal dari official Order:

```text
#22 Order
↓
Final Order Total
↓
#23 Payment
```

Bukan langsung dari stale Cart.

---

# 31. Payment Amount Snapshot

Payment menyimpan:

```text
Amount Due
Currency
Order Reference
Payment Policy
```

Contoh:

```text
Order Total:
Rp185.000

Payment Due:
Rp185.000
```

---

# 32. Partial Payment

Untuk model tertentu:

```text
DEPOSIT
MILESTONE
```

payment dapat memiliki partial payment state.

Namun default purchase barang biasa:

```text
FULL_PAYMENT
```

---

# 33. COD

COD dapat didukung bila policy/seller/fulfillment mengizinkan.

Flow:

```text
Order
↓
Payment Timing = COD
↓
Fulfillment
↓
Delivery
↓
Payment Collection
```

Online payment countdown tidak berlaku dengan cara yang sama untuk COD.

---

# 34. Booking + Payment Countdown

Booking dapat memiliki expiry yang berbeda.

Contoh:

```text
Booking Reservation:
Expires 14:00

Payment Deadline:
14:10
```

System tidak boleh membiarkan payment mempertahankan reservation yang sudah hilang.

---

# 35. Deadline Reconciliation

Untuk reservation-linked transaction:

```text
Payment Deadline
+
Inventory Reservation Expiry
+
Booking Expiry
```

harus direkonsiliasi.

Contoh:

```text
Booking Expiry:
14:00

Payment Deadline:
14:10
```

effective commercial availability tidak boleh melebihi reservation validity.

---

# 36. Payment + Inventory

Inventory reservation dapat memiliki expiry sendiri.

Payment dan inventory harus tetap merupakan domain berbeda.

Contoh:

```text
Payment Deadline:
10:30

Inventory Reservation Expiry:
10:25
```

system harus menghormati constraint yang lebih ketat untuk menjaga transaction integrity.

---

# 37. Multi-Seller Payment

Contoh:

```text
Order Group
├── Order A — Rp120.000
└── Order B — Rp80.000
```

Customer dapat merasakan:

```text
One Checkout Payment
Rp200.000
```

sementara backend melakukan:

```text
Payment Allocation
├── Order A → Rp120.000
└── Order B → Rp80.000
```

---

# 38. Payment Allocation

Entity allocation dapat mencatat:

```text
Payment Intent
Order
Seller
Amount
Currency
Allocation Status
```

Ini penting untuk marketplace reconciliation.

---

# 39. Seller Payout

Payment customer:

```text
PAID
```

tidak otomatis berarti:

```text
Seller Payout = PAID
```

Payout mengikuti payment protection/completion policy #6.

---

# 40. Escrow

Jika protection policy menggunakan escrow:

```text
Customer Payment
↓
Funds Held
↓
Fulfillment / Eligibility
↓
Release
↓
Seller Payout
```

---

# 41. Failed Payment

Possible causes:

```text
Insufficient Funds
Expired Payment Method
Provider Failure
Bank Failure
User Cancelled
Technical Error
```

Status:

```text
FAILED
```

Retry hanya jika payment intent masih valid.

---

# 42. Payment Expiration Effect

```text
Payment Intent
↓
EXPIRED
```

dapat memicu:

```text
Order Cancellation / Resolution
Inventory Reservation Release
Booking Release / Expiry
```

masing-masing ditangani oleh domain owner.

---

# 43. Countdown UI

Conceptual UI:

```text
┌───────────────────────────┐
│ Complete Your Payment     │
│                           │
│ Rp185.000                 │
│                           │
│ Pay within                │
│                           │
│       14:37               │
│                           │
│ [Choose Payment Method]   │
│                           │
└───────────────────────────┘
```

---

# 44. Countdown Visual States

### Normal

```text
Payment expires in
14:37
```

### Warning

```text
Hurry! Payment expires in
04:52
```

### Critical

```text
Payment expires in
00:43
```

### Expired

```text
Payment deadline has expired.

[View Order]
```

---

# 45. Countdown Wording

Jangan menampilkan:

```text
Order expires in 14:00
```

jika yang expired sebenarnya payment intent.

Lebih jelas:

> **"Batas pembayaran berakhir dalam 14:00."**

Karena:

```text
Order Lifecycle
≠
Payment Lifecycle
```

---

# 46. Payment Receipt

Setelah payment success:

```text
Payment
↓
PAID
↓
Receipt
```

Receipt berbeda dari:

```text
Invoice
Order
Payment Record
```

---

# 47. Payment History

Customer dapat melihat:

```text
Payment Date
Amount
Method
Status
Order
Provider Reference
```

---

# 48. Refund Boundary

Payment berhasil lalu transaksi membutuhkan refund:

```text
Payment
PAID
↓
Refund Required
↓
#27 Return / Refund
```

#23 menyimpan payment/refund relation, tetapi refund execution berada pada #27.

---

# 49. Cancellation Before Payment

```text
Order
PENDING_PAYMENT
↓
Customer Cancels
```

Payment:

```text
UNPAID
```

Tidak ada refund atas payment yang belum berhasil.

---

# 50. Cancellation After Payment

```text
Order
CONFIRMED

Payment
PAID
```

Jika cancellation memenuhi refund rules:

```text
Refund Eligibility
↓
#27
```

---

# 51. Payment Security

Servio sebaiknya tidak menyimpan raw card credentials.

Disimpan seperlunya:

```text
Provider Reference
Payment Method Type
Masked Identifier jika diperlukan
Status
Amount
Timestamp
```

Sensitive payment data mengikuti payment provider/security architecture.

---

# 52. Payment Idempotency

Critical operations:

```text
Create Payment Intent
Create Payment Attempt
Confirm Payment
Process Callback
```

harus idempotent.

---

# 53. Payment Reconciliation

System membandingkan:

```text
Servio Payment Record
vs
Payment Provider Record
```

untuk mendeteksi:

```text
Missing Payment
Duplicate Callback
Unknown Transaction
Late Callback
Amount Mismatch
Status Mismatch
```

---

# 54. Amount Mismatch

Contoh:

```text
Order:
Rp150.000

Provider:
Rp140.000
```

Jangan otomatis:

```text
PAID
```

Status exception:

```text
AMOUNT_MISMATCH
```

dan masuk reconciliation/operations handling.

---

# 55. Currency

Payment wajib memiliki:

```text
Amount
Currency
```

Currency menjadi transaction snapshot.

---

# 56. Platform Fee

Payment dapat mencatat:

```text
Item Amount
Platform Fee
Delivery Charge
Other Allowed Charge
Total Paid
```

Tax tidak masuk scope.

---

# 57. Payment Permission

## Customer

```text
CREATE PAYMENT
SELECT PAYMENT METHOD
PAY
VIEW OWN PAYMENT
RETRY
```

## Provider

```text
VIEW AUTHORIZED PAYMENT STATUS
```

## Merchant

```text
VIEW AUTHORIZED PAYMENT / ORDER STATUS
```

## Admin / Finance Ops

```text
VIEW
RECONCILE
HANDLE EXCEPTION
CONTROLLED ADJUSTMENT
```

## CEO / Product Owner

```text
ANALYZE
GOVERN POLICY
```

---

# 58. Payment Countdown Authority

Policy authority:

```text
CEO / Product Owner
```

Operational enforcement:

```text
Payment / Finance Operations
```

Seller tidak boleh bebas mengubah payment deadline customer.

---

# 59. Data Model

Core entities:

```text
product_payment_intents
product_payment_attempts
product_payment_transactions
product_payment_methods
product_payment_allocations
product_payment_deadlines
product_payment_events
product_payment_reconciliation
product_payment_receipts
```

---

# 60. product_payment_intents

Conceptual:

```text
id
order_group_id
customer_id
amount
currency
status
payment_timing
payment_due_at
policy_version
created_at
updated_at
```

---

# 61. product_payment_attempts

Conceptual:

```text
id
payment_intent_id
payment_method_id
provider
provider_reference
amount
status
attempted_at
expires_at
```

---

# 62. product_payment_deadlines

Conceptual:

```text
id
payment_intent_id
due_at
grace_until
policy_version
status
created_at
```

---

# 63. product_payment_transactions

Conceptual:

```text
id
payment_intent_id
order_id
provider_reference
amount
currency
status
captured_at
created_at
```

---

# 64. product_payment_allocations

Conceptual:

```text
id
payment_intent_id
order_id
seller_id
amount
currency
allocation_status
```

---

# 65. product_payment_events

Minimum:

```text
PAYMENT_INTENT_CREATED
PAYMENT_METHOD_SELECTED
PAYMENT_ATTEMPT_CREATED
PAYMENT_PROCESSING
PAYMENT_SUCCEEDED
PAYMENT_FAILED
PAYMENT_EXPIRED
PAYMENT_CANCELLED
PAYMENT_REQUIRES_ACTION
PAYMENT_RECONCILIATION_REQUIRED
```

---

# 66. Payment Lifecycle

Normal:

```text
REQUIRES_PAYMENT
      ↓
PROCESSING
      ↓
PAID
```

Failure:

```text
REQUIRES_PAYMENT
      ↓
FAILED
      ↓
RETRY
```

Expiry:

```text
REQUIRES_PAYMENT
      ↓
DEADLINE_REACHED
      ↓
EXPIRED
```

---

# 67. Payment Deadline Lifecycle

Deadline state:

```text
ACTIVE
↓
WARNING
↓
EXPIRING_SOON
↓
EXPIRED
```

Deadline state bukan financial state.

---

# 68. Payment Countdown Source of Truth

```text
payment_due_at
+
server time
```

Bukan:

```text
browser local time
```

---

# 69. Normal End-to-End Payment

```text
#22 Order
      ↓
Payment Required
      ↓
Create Payment Intent
      ↓
Set payment_due_at
      ↓
🔥 COUNTDOWN START
      ↓
Customer Selects Method
      ↓
Payment Attempt
      ↓
Provider
      ↓
Success
      ↓
PAID
      ↓
#24 Inventory
      ↓
#25 Fulfillment
```

---

# 70. End-to-End Countdown Expired

```text
Order
↓
Payment Required
↓
Countdown
↓
00:00
↓
Payment Intent EXPIRED
↓
Order Cancellation Policy
↓
Inventory Reservation Released
↓
Booking Released if applicable
```

---

# 71. End-to-End Failed Payment

```text
Payment Required
↓
Countdown
↓
Attempt
↓
FAILED
↓
Retry
↓
Attempt 2
↓
PAID
```

selama payment deadline masih berlaku.

---

# 72. End-to-End Multi-Seller Payment

```text
Cart
↓
Order Group
├── Order A
└── Order B
↓
One Checkout Payment
↓
Payment Intent
↓
PAID
↓
Allocation
├── Order A
└── Order B
```

---

# 73. End-to-End Pickup + Payment Countdown

```text
Order
↓
Pickup Booking
↓
Payment Required
↓
Countdown
↓
PAID
↓
Inventory Reservation
↓
Fulfillment
↓
READY FOR PICKUP
```

Jika payment expires:

```text
Payment Expired
↓
Booking Resolution
↓
Reservation Release
```

sesuai policy.

---

# 74. Role Flow

## Customer

```text
Order
↓
Payment Page
↓
View Amount
↓
View Countdown
↓
Select Method
↓
Pay
↓
Receive Result
```

## Merchant

```text
Authorized Order Context
↓
View Payment/Order Status
↓
Process when eligible
```

## Provider

Untuk service-related product order:

```text
Service Context
↓
Product Order
↓
View Authorized Payment Status
```

## Finance / Admin

```text
Monitor
↓
Reconcile
↓
Handle Exception
↓
Audit
```

## CEO / Product Owner

```text
Policy
↓
Payment Deadline
↓
Commercial Governance
↓
Aggregate Analytics
```

---

# 75. Important Business Rules

1. Payment Barang adalah domain terpisah dari Order.
2. Default payment timing barang adalah UPFRONT.
3. Payment countdown adalah core capability.
4. Countdown berbasis server-side deadline.
5. UI timer bukan source of truth.
6. `payment_due_at` adalah authoritative payment deadline.
7. Payment deadline memiliki policy.
8. Payment policy mendukung hierarchy dan versioning.
9. Customer harus dapat melihat batas pembayaran dengan jelas.
10. Payment deadline ≠ Order expiry.
11. Payment deadline ≠ Booking expiry.
12. Inventory reservation expiry tetap merupakan domain #24.
13. Booking expiry tetap merupakan domain #22B.
14. Payment deadline expired menyebabkan Payment Intent menjadi EXPIRED.
15. Order effect mengikuti cancellation/resolution policy.
16. Payment intent expired tidak menggunakan payment attempt lama untuk normal retry.
17. Retry hanya selama payment intent masih valid.
18. Official Order Amount menjadi basis payment.
19. Cart bukan source final payment amount.
20. Payment success harus berasal dari validated provider/system result.
21. Payment provider callback harus idempotent.
22. Payment Attempt ≠ Payment Intent.
23. Satu Payment Intent dapat memiliki multiple Attempts.
24. Multi-seller checkout dapat memakai satu customer-facing payment.
25. Payment allocation dapat dilakukan secara internal.
26. PAID customer payment ≠ seller payout paid.
27. Escrow/payout mengikuti Payment Protection policy.
28. COD tidak menggunakan online payment countdown dengan cara yang sama.
29. Additional payment mengikuti authorized flow.
30. Amount mismatch masuk reconciliation.
31. Late callback harus direkonsiliasi.
32. Payment sukses sebelum deadline tetap dapat dianggap PAID meskipun callback datang sedikit terlambat, bila provider proof mendukung.
33. Payment yang benar-benar dilakukan setelah deadline mengikuti policy.
34. Refund execution berada di #27.
35. Payment Receipt berbeda dari Order/Invoice/Payment Transaction.
36. Sensitive payment credentials tidak disimpan sebagai raw data oleh Servio jika provider menangani credential tersebut.
37. Critical payment operations harus idempotent.
38. Payment reconciliation wajib tersedia.
39. Existing payment policy tidak berubah diam-diam.
40. Seller tidak bebas mengubah customer payment deadline.
41. Countdown harus konsisten antar device/session.
42. Payment, Inventory, dan Booking deadlines harus direkonsiliasi ketika saling terkait.
43. Slot/Reservation expiry tidak boleh diabaikan demi mempertahankan payment.
44. No silent additional payment.
45. Backend authorization wajib ditegakkan.

---

# 76. Countdown Decision — LOCKED

```text
ORDER CREATED
      ↓
PAYMENT REQUIRED
      ↓
CREATE PAYMENT INTENT
      ↓
SET payment_due_at
      ↓
🔥 COUNTDOWN START
```

Selama countdown:

```text
Customer
├── Select Method
├── Pay
├── Retry
└── View Instruction
```

Saat:

```text
payment_due_at reached
```

maka:

```text
PAYMENT INTENT
      ↓
EXPIRED
```

kemudian:

```text
ORDER
      ↓
Cancellation / Resolution Policy
```

dan:

```text
INVENTORY
      ↓
Release Reservation if applicable

BOOKING
      ↓
Release / Expire if applicable
```

---

# 77. Final Architecture

```text
                     #22 ORDER BARANG
                            │
                            ↓
                     PAYMENT REQUIRED
                            │
                            ↓
                  CREATE PAYMENT INTENT
                            │
                            ↓
                     SET DEADLINE
                            │
                            ↓
                  🔥 COUNTDOWN ACTIVE
                            │
            ┌───────────────┼──────────────┐
            ↓               ↓              ↓
       Select Method      Pay            Retry
            │               │              │
            └───────────────┼──────────────┘
                            ↓
                       PROCESSING
                            │
                 ┌──────────┴──────────┐
                 ↓                     ↓
              SUCCESS                FAILURE
                 ↓                     ↓
                PAID                  RETRY
                 │
                 ↓
             #24 INVENTORY
                 ↓
            #25 FULFILLMENT


COUNTDOWN EXPIRES
        ↓
PAYMENT INTENT = EXPIRED
        ↓
ORDER CANCELLATION POLICY
        ↓
RELEASE INVENTORY / BOOKING
```

---

# 78. Cross-Feature Relationship

```text
#20 Product Discovery
        ↓
#21 Cart
        ↓
#22 Order / Booking
        ↓
🔥 #23 Payment Barang
        ↓
#24 Inventory
        ↓
#25 Fulfillment
        ↓
#26 Shipping & Tracking
        ↓
#27 Return / Refund
```

Service-related product flow:

```text
#19 Service + Product Integration
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
```

---

# 79. Source of Truth

#23 menjadi source of truth untuk:

```text
Payment Intent
Payment Attempt
Payment Transaction
Payment Status
Payment Deadline
Payment Method Context
Payment Allocation
Payment Reconciliation
Payment Receipt
Payment Events
```

Bukan source of truth untuk:

```text
Product Catalog → #20
Cart → #21
Order → #22A
Booking → #22B
Inventory → #24
Fulfillment → #25
Shipping → #26
Return / Refund → #27
```

---

# 80. MVP Scope

```text
✅ Payment Intent
✅ UPFRONT Payment
✅ Payment Deadline
✅ Countdown
✅ Server-Side Deadline
✅ Payment Method
✅ Payment Instruction
✅ Payment Attempt
✅ Retry
✅ Payment Success
✅ Payment Failure
✅ Payment Expiration
✅ Payment Receipt
✅ Payment History
✅ Payment Provider Callback
✅ Idempotency
✅ Reconciliation
✅ Amount Validation
✅ Multi-Seller Payment Allocation
✅ Booking/Inventory Deadline Reconciliation
✅ Role & Access
✅ Audit
✅ Security
✅ Data Model
```

---

# 81. Scale-Up

Potential scale-up:

```text
Advanced Installments
More Payment Providers
Dynamic Payment Routing
Smart Payment Method Recommendation
Advanced Fraud Detection
Risk Scoring
Payment Recovery
Grace Period Optimization
Automatic Reconciliation
Enterprise Billing
Wallet / Stored Balance
Advanced Escrow
Cross-Border Payment
Multi-Currency
```

Scale-up tidak boleh mengubah core boundary #23.

---

# 🔒 82. LOCKED STATUS — FEATURE #23

```text
✅ Payment Definition
✅ Payment Purpose
✅ Order Boundary
✅ Inventory Boundary
✅ Fulfillment Boundary
✅ Shipping Boundary
✅ Return Boundary
✅ UPFRONT Default
✅ Payment Timing
✅ Payment Countdown
✅ Server-Side Deadline
✅ payment_due_at
✅ Countdown Visual State
✅ Payment Reminder
✅ Deadline Policy
✅ Policy Hierarchy
✅ Policy Versioning
✅ Payment Intent
✅ Payment Attempt
✅ Payment Status
✅ Deadline vs Status Separation
✅ Expiration
✅ Grace Period Concept
✅ Retry
✅ Payment Methods
✅ Payment Instruction
✅ Bank Transfer
✅ Provider Confirmation
✅ Callback / Webhook
✅ Race Condition Handling
✅ Late Callback Reconciliation
✅ Late Payment Policy
✅ Payment Amount
✅ Amount Snapshot
✅ Partial Payment Concept
✅ COD
✅ Booking + Payment Deadline Reconciliation
✅ Inventory + Payment Deadline Reconciliation
✅ Multi-Seller Payment
✅ Payment Allocation
✅ Seller Payout Boundary
✅ Escrow Boundary
✅ Failed Payment
✅ Receipt
✅ Payment History
✅ Refund Boundary
✅ Security
✅ Idempotency
✅ Reconciliation
✅ Amount Mismatch Handling
✅ Currency
✅ Platform Fee
✅ Permission
✅ Countdown Authority
✅ Data Model
✅ Lifecycle
✅ Event Model
✅ Role Flow
✅ End-to-End Flow
✅ Business Rules
✅ MVP
✅ Scale-Up
✅ Final Architecture
```

---

# 83. Roadmap Position

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
#24 Inventory
#25 Fulfillment
#26 Shipping & Tracking
#27 Return / Refund
```

---

# 84. Final Scope Statement

> **Feature #23 Payment Barang adalah payment domain Servio yang menangani payment intent, payment method, payment attempt, payment transaction, payment confirmation, deadline, countdown, expiration, retry, reconciliation, dan receipt untuk Product Order. Payment Barang menggunakan `payment_due_at` sebagai authoritative deadline yang dihitung berdasarkan server time dan ditampilkan kepada customer sebagai countdown. Countdown merupakan business rule yang memicu payment expiration ketika batas tercapai. Order, Booking, Inventory, Fulfillment, Shipping, dan Return/Refund tetap memiliki domain masing-masing; ketika payment deadline berakhir, efek terhadap domain lain dilakukan melalui handoff dan policy masing-masing.**
