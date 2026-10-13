# SERVIO — PAYMENT & PROTECTION JASA
## Master Feature, Business Flow, Business Rules, Status, Data, Financial Flow, dan Integrasi

> **Status:** Final Concept / Master Specification  
> **Roadmap:** Feature #6 — Payment & Protection Jasa  
> **Related documents:**  
> - `servio-discovery-feature-business-flow-final.md`
> - `servio-booking-order-jasa-final.md`
> - `servio-pricing-quotation-communication-jasa-final.md`
>
> **Scope:** Payment Flow, Payment Timing, Payment Methods, Payment Status, Invoice, Receipt, Platform/Application Fee, Payment History, Escrow, Payout, Payment Authorization, Milestone Payment, Additional Payment, Survey Fee Collection, Refund, Cancellation Financial Impact, No-Show Financial Handling, Payment Dispute, Consumer/Provider Protection, Transaction Audit, dan Payment Notification.
>
> **Final financial rule:** **Tax tidak digunakan dalam scope model finansial Servio saat ini.**

---

# 1. TUJUAN DOKUMEN

Dokumen ini mendefinisikan domain **Payment & Protection Jasa** secara lengkap dan terintegrasi dengan:

```text
Discovery
↓
Booking
↓
Pricing & Quotation
↓
Communication
↓
Agreement
↓
Order
↓
Payment & Protection
↓
Service Execution
↓
Tracking
↓
Proof
↓
Completion
↓
Review / Dispute / Warranty / Service History
```

Tujuan utamanya:

- memastikan customer memahami apa yang harus dibayar;
- memastikan pembayaran memiliki lifecycle yang jelas;
- mengatur kapan payment dilakukan;
- memisahkan invoice, payment, receipt, escrow, dan payout;
- mengatur platform/application fee secara fleksibel;
- melindungi customer dan provider;
- menangani cancellation, no-show, refund, adjustment, dan dispute;
- memastikan provider tidak menerima payout sebelum kondisi yang dipersyaratkan terpenuhi;
- menjaga seluruh aktivitas finansial memiliki audit trail.

---

# 2. KONSEP FUNDAMENTAL

## 2.1 Payment

**Payment = transaksi ketika customer membayar kewajiban finansial yang terkait dengan booking/order.**

---

## 2.2 Invoice

**Invoice = tagihan atau permintaan pembayaran.**

```text
Invoice
= "Customer harus membayar"
```

---

## 2.3 Payment Record

**Payment Record = catatan transaksi pembayaran yang dilakukan customer.**

```text
Payment
= "Customer telah/ sedang melakukan pembayaran"
```

---

## 2.4 Receipt

**Receipt = bukti bahwa pembayaran telah berhasil.**

```text
Receipt
= "Customer sudah membayar"
```

---

## 2.5 Escrow / Protected Funds

**Escrow = mekanisme penahanan dana sebelum dana dapat dilepas kepada provider berdasarkan kondisi tertentu.**

```text
Customer
↓
Payment
↓
Escrow / Protected Funds
↓
Service
↓
Completion
↓
Release
↓
Provider
```

Tidak semua service harus menggunakan escrow.

---

## 2.6 Payout

**Payout = dana yang diteruskan kepada provider setelah syarat payout terpenuhi.**

```text
Customer Payment
↓
Protection / Settlement
↓
Payout Eligible
↓
Provider Payout
```

---

# 3. PRINSIP UTAMA PAYMENT & PROTECTION

## Rule 1 — Transparansi

Customer harus mengetahui:

- harga service;
- additional fee yang relevan;
- platform/application fee;
- discount;
- total payment;
- survey fee rule bila berlaku;
- payment deadline;
- cancellation financial implication sesuai policy.

---

## Rule 2 — Tidak Ada Perubahan Harga Sepihak

Harga yang sudah disepakati tidak boleh berubah tanpa:

```text
Adjustment
↓
Reason
↓
Customer Approval
```

---

## Rule 3 — Payment dan Payout Dipisahkan

```text
Customer Paid
≠
Provider Paid
```

Customer bisa sudah membayar sementara dana masih:

```text
HELD
```

atau:

```text
PAYOUT_PENDING
```

---

## Rule 4 — Financial Event Harus Memiliki Record

Setiap movement harus memiliki:

- amount;
- actor;
- event;
- reference;
- timestamp;
- status.

---

## Rule 5 — Tax Tidak Digunakan

Tax **dihapus dari scope financial model Servio saat ini**.

Breakdown transaksi tidak memasukkan komponen tax.

---

# 4. PAYMENT OWNER DAN ACTOR

Aktor utama:

```text
CUSTOMER
PROVIDER
SERVIO
PAYMENT PROCESSOR / GATEWAY
ADMIN / OPERATIONS
```

Hubungan konseptual:

```text
Customer
↓
Payment Infrastructure
↓
Servio Financial Record
↓
Protection / Settlement
↓
Provider Payout
```

---

# 5. PAYMENT FLOW UTAMA

```text
ORDER CREATED
↓
PAYMENT REQUIRED?
↓
CREATE PAYMENT REQUEST
↓
INVOICE / PAYMENT SUMMARY
↓
SELECT PAYMENT METHOD
↓
PAYMENT INTENT
↓
PROCESSING
↓
PAYMENT CONFIRMED
↓
RECEIPT
↓
ORDER READY FOR EXECUTION
```

Failure branch:

```text
PROCESSING
↓
FAILED
↓
RETRY / CHANGE PAYMENT METHOD
```

Expiration:

```text
PAYMENT REQUIRED
↓
DEADLINE
↓
EXPIRED
```

---

# 6. PAYMENT TIMING

Payment timing adalah kapan customer diwajibkan melakukan pembayaran.

Master capability:

```text
UPFRONT
DEPOSIT
AFTER_SERVICE
MILESTONE
FULL_AFTER_COMPLETION
AUTHORIZATION
```

Konfigurasi aktual tergantung service/payment policy.

---

# 7. UPFRONT PAYMENT

```text
Order
↓
Invoice
↓
Payment
↓
Confirmed
↓
Execution
```

Cocok untuk service fixed-price tertentu.

---

# 8. DEPOSIT

```text
Order
↓
Deposit
↓
Execution
↓
Remaining Amount
↓
Final Payment
```

Cocok untuk order yang membutuhkan komitmen awal.

---

# 9. AFTER SERVICE PAYMENT

```text
Order
↓
Execution
↓
Final Amount
↓
Payment
```

Lebih cocok untuk service yang final amount-nya baru diketahui setelah execution, dengan protection/payment rule yang sesuai.

---

# 10. MILESTONE PAYMENT

Untuk project:

```text
Order
↓
Initial Payment
↓
Milestone 1
↓
Approval
↓
Payment
↓
Milestone 2
↓
Approval
↓
Payment
↓
Final
```

Setiap milestone dapat memiliki financial condition sendiri.

---

# 11. PAYMENT AUTHORIZATION

Payment authorization digunakan ketika platform perlu memastikan metode pembayaran tersedia untuk transaksi yang mungkin terjadi kemudian.

Contoh:

### Survey Fee Deferred

```text
Booking
↓
Customer confirms payment method
↓
Authorization
↓
Survey
↓
Customer continues
→ No survey charge

Customer rejects
→ Charge Survey Fee
```

Authorization bukan berarti customer sudah membayar seluruh nominal.

---

# 12. PAYMENT METHODS

Master payment methods yang secara konseptual dapat tersedia:

```text
Bank Transfer
QR Payment
E-Wallet
Card
Other Supported Payment Method
```

Metode aktual akan mengikuti payment infrastructure yang dipilih saat implementasi.

---

# 13. PAYMENT INTENT

Sebelum transaksi diproses:

```text
payment_intent_id
```

menghubungkan:

```text
Order
+
Amount
+
Customer
+
Payment Method
+
Expiration
```

Contoh:

```text
Payment Intent
PI-000123

Order
ORD-000124

Amount
Rp450.000

Expires
20 Sep 2026 11:00
```

---

# 14. PAYMENT STATUS

Master:

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

Normal:

```text
UNPAID
↓
REQUIRES_PAYMENT
↓
PROCESSING
↓
PAID
```

---

# 15. REQUIRES ACTION

Berbeda dari failed.

Customer mungkin harus:

- menyelesaikan autentikasi;
- menyelesaikan instruksi payment;
- melakukan action pada payment processor.

Status:

```text
REQUIRES_ACTION
```

---

# 16. PAYMENT FAILURE

Jika payment gagal:

```text
PROCESSING
↓
FAILED
↓
REQUIRES_PAYMENT
```

Customer dapat:

```text
Retry
Change Payment Method
Cancel
```

sesuai policy.

---

# 17. PAYMENT EXPIRATION

Setiap payment request dapat memiliki:

```text
expires_at
```

Jika deadline terlewati:

```text
PAYMENT EXPIRED
```

Order selanjutnya mengikuti policy:

```text
Keep Pending
atau
Cancel Order
```

---

# 18. DUPLICATE PAYMENT PROTECTION

System harus mencegah pembayaran ganda untuk satu order.

Deteksi dapat menggunakan:

```text
order_id
payment_intent_id
transaction_reference
amount
idempotency_key
```

Jika customer membayar dua kali:

```text
Payment A
→ Valid

Payment B
→ Duplicate Detection
```

Payment kedua harus masuk ke proses reconciliation/refund yang sesuai dan tidak otomatis dianggap sebagai pembayaran order baru.

---

# 19. INVOICE

Invoice adalah dokumen tagihan.

Contoh:

```text
INVOICE
INV-20260920-00123

Service:
AC Repair

Subtotal:
Rp400.000

Platform/Application Fee:
Rp20.000

Discount:
-Rp25.000

Total:
Rp395.000

Due:
20 Sep 2026
```

---

# 20. INVOICE STATUS

```text
DRAFT
ISSUED
DUE
PARTIALLY_PAID
PAID
OVERDUE
VOID
CANCELLED
```

Tidak semua status digunakan pada setiap service.

---

# 21. RECEIPT

Receipt dibuat setelah payment berhasil.

```text
Invoice
↓
Customer Pay
↓
Payment Confirmed
↓
Receipt Generated
```

Receipt memberikan bukti:

- amount;
- payment method;
- transaction reference;
- payment date;
- order reference.

---

# 22. RECEIPT DATA

```text
receipt_id
receipt_number
payment_id
order_id
customer_id
amount
payment_method
transaction_reference
paid_at
created_at
```

---

# 23. INVOICE ≠ RECEIPT

```text
Invoice
= Tagihan

Payment
= Transaksi pembayaran

Receipt
= Bukti pembayaran berhasil
```

---

# 24. FINAL CUSTOMER PRICE BREAKDOWN

Customer dapat melihat:

```text
Service Price
Rp400.000

Additional Fee
Rp50.000

Platform/Application Fee
Rp20.000

Discount
-Rp25.000

────────────────
TOTAL
Rp445.000
```

**Tax tidak ditampilkan.**

---

# 25. PLATFORM / APPLICATION FEE

Platform/Application Fee adalah biaya yang dikenakan Servio berdasarkan configuration bisnis.

Fee dibuat fleksibel karena karakteristik kategori jasa dan barang dapat berbeda.

---

# 26. PLATFORM FEE HIERARCHY

Master configuration:

```text
GLOBAL DEFAULT
↓
CATEGORY OVERRIDE
↓
SUBCATEGORY OVERRIDE
↓
SERVICE / PRODUCT OVERRIDE
```

Contoh:

```text
Global
5%

Repair & Technical
5%

Cleaning
7%

Deep Cleaning
8%

AC Cleaning
6%
```

---

# 27. EFFECTIVE FEE RULE

Jika beberapa level tersedia:

> **Konfigurasi paling spesifik menjadi fee efektif.**

Urutan:

```text
Service / Product Override
        ↓ jika tidak ada
Subcategory Override
        ↓ jika tidak ada
Category Override
        ↓ jika tidak ada
Global Default
```

---

# 28. PLATFORM FEE TYPE

Master:

```text
PERCENTAGE
FIXED_AMOUNT
```

Optional future capability:

```text
PERCENTAGE_PLUS_FIXED
```

MVP yang direkomendasikan:

```text
Percentage
Fixed Amount
```

---

# 29. PERCENTAGE FEE

Contoh:

```text
Service
Rp500.000

Platform Fee
5%

Fee
Rp25.000
```

---

# 30. FIXED FEE

Contoh:

```text
Platform Fee
Rp10.000
```

Fee tidak bergantung langsung pada persentase nilai service.

---

# 31. FEE SCOPE

CEO dapat menentukan fee pada:

```text
Global
Service Category
Service Subcategory
Service
Product Category
Product Subcategory
Product
```

Artinya satu mekanisme fee dapat digunakan untuk Jasa maupun Barang.

---

# 32. CEO FEE CONFIGURATION

Konseptual:

```text
Platform Fee Configuration

Scope:
○ Global
○ Category
○ Subcategory
○ Service / Product

Fee Type:
○ Percentage
○ Fixed Amount

Value:
[........]

Status:
Active / Inactive

Effective From:
[........]

Effective Until:
[optional]
```

---

# 33. FEE VERSIONING

Fee sebaiknya memiliki history:

```text
5% effective Jan
↓
6% effective Apr
```

Transaksi lama menggunakan fee yang berlaku ketika transaksi dibuat/price locked sesuai financial policy.

Jangan mengubah transaksi lama hanya karena konfigurasi fee baru dibuat.

---

# 34. WHO PAYS PLATFORM FEE?

Model fee harus memiliki configuration:

```text
CUSTOMER
PROVIDER
SHARED
```

Namun default business policy belum perlu dikunci per kategori.

System harus mampu menghitung dampaknya.

---

# 35. CUSTOMER-BORNE FEE

```text
Service
Rp500.000

Platform Fee
Rp25.000

Customer Total
Rp525.000
```

---

# 36. PROVIDER-BORNE FEE

```text
Customer Payment
Rp500.000

Platform Fee
-Rp25.000

Provider Gross Settlement
Rp475.000
```

---

# 37. SHARED FEE

```text
Platform Fee
Rp25.000

Customer Portion
Rp10.000

Provider Portion
Rp15.000
```

Konfigurasi ini disiapkan jika business model membutuhkannya.

---

# 38. NO TAX RULE

Untuk scope financial model saat ini:

```text
Tax = Not Used
```

Tidak dimasukkan dalam:

- customer total;
- provider payout calculation;
- invoice breakdown;
- payment breakdown.

Jika kebutuhan bisnis berubah di masa depan, tax dapat menjadi domain/policy baru.

---

# 39. PAYMENT HISTORY CUSTOMER

Customer dapat melihat:

```text
My Payments
────────────────────
20 Sep
AC Repair
Paid Rp445K
QR Payment

18 Sep
Cleaning Sofa
Paid Rp150K

10 Sep
Survey Fee
Paid Rp50K
```

---

# 40. PROVIDER FINANCIAL HISTORY

Provider dapat melihat:

```text
Gross Service
Platform Fee
Refund
Adjustment
Payout
Net Amount
```

Contoh:

```text
Gross
Rp10.000.000

Platform Fee
-Rp500.000

Refund
-Rp300.000

Net
Rp9.200.000
```

---

# 41. ESCROW / PROTECTED FUNDS

Escrow merupakan mekanisme protection.

```text
Customer
↓
Payment
↓
Funds Held
↓
Service
↓
Completion
↓
Customer Confirmation / Protection Condition
↓
Release
↓
Provider
```

Escrow tidak wajib untuk semua order.

---

# 42. KAPAN ESCROW RELEVAN?

Lebih cocok untuk:

- project;
- milestone;
- transaction value tinggi;
- quotation service tertentu;
- custom request;
- service dengan dispute risk tinggi.

Jasa sederhana dapat menggunakan payment/settlement model yang lebih ringan.

---

# 43. ESCROW STATUS

```text
NOT_APPLICABLE
FUNDED
HELD
RELEASE_PENDING
RELEASED
ON_HOLD
DISPUTED
REFUND_PENDING
REFUNDED
```

---

# 44. ESCROW RELEASE

Contoh:

```text
Payment Confirmed
↓
Funds Held
↓
Execution
↓
Completion
↓
Customer Confirm
↓
Protection Window / Policy Condition
↓
Release
↓
Payout
```

---

# 45. PAYOUT

Payout adalah settlement kepada provider.

Contoh:

```text
Customer Payment
Rp500.000

Platform Fee
-Rp25.000

Refund Deduction
Rp0

Adjustment
Rp0

Provider Payout
Rp475.000
```

---

# 46. PAYOUT STATUS

```text
PENDING
ELIGIBLE
ON_HOLD
PROCESSING
PAID
FAILED
REVERSED
```

---

# 47. PAYOUT ELIGIBILITY

Provider menjadi eligible ketika kondisi terpenuhi.

Contoh:

```text
Payment Confirmed
+
Service Completed
+
No Active Dispute
+
Protection Condition Met
=
Payout Eligible
```

Tidak semua service harus menunggu customer confirmation jika policy service mengizinkan mekanisme completion lain.

---

# 48. PAYOUT HOLD

Payout dapat ditahan jika:

- dispute aktif;
- refund sedang diproses;
- payment issue;
- adjustment belum selesai;
- fraud/abuse review;
- protection policy mengharuskan hold.

```text
Payout
↓
ON_HOLD
```

---

# 49. REFUND

Refund adalah pengembalian dana customer.

Master:

```text
FULL REFUND
PARTIAL REFUND
NO REFUND
```

---

# 50. REFUND STATUS

```text
REQUESTED
PENDING
PROCESSING
COMPLETED
FAILED
CANCELLED
```

---

# 51. FULL REFUND

```text
Customer Paid
Rp500.000

Order Cancelled
↓
Full Refund
Rp500.000
```

Komponen refundable tetap mengikuti financial policy.

---

# 52. PARTIAL REFUND

```text
Paid
Rp500.000

Applicable Charge
Rp100.000

Refund
Rp400.000
```

Customer harus dapat melihat breakdown refund.

---

# 53. REFUND DATA

```text
refund_id
order_id
payment_id
amount
refund_type
reason
requested_by
status
requested_at
processed_at
```

---

# 54. CANCELLATION FINANCIAL IMPACT

Cancellation tidak selalu berarti full refund.

System memeriksa:

```text
Order Status
Payment Status
Execution Status
Time Before Service
Actor
Service Type
Provider Policy
Platform Policy
Survey Status
```

---

# 55. CANCELLATION BEFORE PAYMENT

```text
Order
↓
Cancel
↓
No Main Payment
↓
Close
```

Jika terdapat survey completed dan survey fee menjadi applicable:

```text
Survey Fee
↓
Separate Financial Handling
```

---

# 56. CANCELLATION AFTER PAYMENT

```text
Cancel Request
↓
Policy Check
↓
Refund Calculation
↓
Refund / No Refund / Partial Refund
↓
Order Cancelled
```

---

# 57. CUSTOMER CANCEL BEFORE PROVIDER TRAVEL

System dapat memproses berdasarkan cancellation policy.

Potential outcome:

```text
Full Refund
Partial Refund
No Refund
```

---

# 58. CUSTOMER CANCEL AFTER PROVIDER TRAVEL

Jika provider sudah on the way:

```text
Provider Travel Evidence
↓
Cancellation
↓
Policy Check
↓
Potential Visit / Cancellation Charge
↓
Refund Calculation
```

Detail fee/persentase adalah business policy.

---

# 59. CUSTOMER CANCEL AFTER PROVIDER ARRIVAL

```text
Provider Arrived
↓
Customer Cancel
↓
Financial Review
↓
Visit / Waiting / Cancellation Cost
↓
Refund / Charge
```

---

# 60. CUSTOMER CANCEL AFTER SERVICE STARTED

Ini bukan cancellation sederhana.

```text
Service Started
↓
Stop Request
↓
Determine Completed Portion
↓
Adjustment
↓
Refund / Charge
```

---

# 61. PROVIDER CANCEL

```text
Provider Cancel
↓
Check Alternative Provider
├── Replace
├── Reschedule
└── Cancel + Refund
```

Financial impact harus tercatat.

---

# 62. NO-SHOW FINANCIAL HANDLING

## Provider No-Show

Potential:

- refund;
- reschedule;
- alternative provider;
- provider penalty/chargeback sesuai policy.

## Customer No-Show

Potential:

- waiting fee;
- visit fee;
- partial charge;
- reschedule;
- cancellation.

Tidak semua service menggunakan rule yang sama.

---

# 63. PROVIDER LATE

Keterlambatan harus mempertimbangkan:

```text
Scheduled Time
Actual ETA
Actual Arrival
Delay Duration
Service Policy
Customer Choice
```

Customer dapat memperoleh:

```text
Continue
Reschedule
Cancel
```

Financial outcome mengikuti policy.

---

# 64. SURVEY / INSPECTION FEE

Final rule:

```text
Provider Service
↓
Survey Required?
├── No
├── Free
└── Paid
    └── Amount
```

---

# 65. SURVEY FEE — CUSTOMER LANJUT

```text
Booking
↓
Survey
↓
Quotation
↓
Customer Accept
↓
Main Order
```

Jika customer melanjutkan:

> **Survey tidak menjadi biaya terpisah dalam main transaction.**

---

# 66. SURVEY FEE — CUSTOMER REJECT

```text
Booking
↓
Survey
↓
Quotation
↓
Customer Reject / Cancel
↓
Main Service Close
↓
Survey Fee Applied
```

Jika provider memilih:

```text
PAID
```

maka customer membayar nominal survey.

Jika:

```text
FREE
```

maka tidak ada survey charge.

---

# 67. SURVEY FEE — PRE-SURVEY CANCELLATION

Jika survey belum dilakukan:

```text
Booking
↓
Customer Cancel
↓
No Completed Survey
```

Survey fee tidak otomatis dianggap terutang sebagai completed survey fee.

---

# 68. SURVEY FEE VISIBILITY

Customer harus mengetahui rule sebelum proses survey menjadi mengikat.

Contoh:

```text
Inspection Required

Survey Fee:
Rp50.000 if the main service is rejected/cancelled after inspection.
```

Atau:

```text
Inspection Required

Survey:
Free
```

---

# 69. SURVEY FEE COLLECTION OPTIONS

Implementation dapat menggunakan:

### A. Authorization

```text
Before Survey
↓
Payment Method Authorization
↓
Survey
↓
Continue
→ Release Authorization / No Charge

Reject
→ Charge Survey Fee
```

### B. Deferred Invoice

```text
Survey
↓
Customer Reject
↓
Survey Fee Invoice
↓
Payment
```

Authorization memberikan protection yang lebih kuat, sedangkan deferred invoice lebih sederhana namun memiliki collection risk.

---

# 70. ADDITIONAL PAYMENT

Saat customer menyetujui adjustment:

```text
Original Total
Rp300.000

Additional Cost
Rp100.000

New Total
Rp400.000
```

System dapat membuat:

```text
Additional Payment Request
Rp100.000
```

---

# 71. ADDITIONAL PAYMENT FLOW

```text
Provider Finds Issue
↓
Adjustment Proposal
↓
Customer Approval
↓
Additional Payment
↓
Payment Confirmed
↓
Service Continues
```

Jika gagal:

```text
Payment Failed
↓
Service Paused / Policy Action
```

---

# 72. PAYMENT DISPUTE

Payment dispute adalah sengketa finansial, contohnya:

> "Saya ditagih dua kali."

atau:

> "Nominal payment berbeda."

Payment dispute berbeda dari service dispute.

---

# 73. SERVICE DISPUTE VS PAYMENT DISPUTE

### Service Dispute

> Hasil pekerjaan tidak sesuai.

### Payment Dispute

> Transaksi pembayaran bermasalah.

Keduanya dapat terhubung melalui `order_id`, tetapi memiliki context yang berbeda.

---

# 74. DISPUTE PAYMENT FLOW

```text
Customer Report
↓
Payment Dispute
↓
Financial Evidence
↓
Payout Hold jika relevan
↓
Investigation
↓
Resolution
↓
Refund / Adjustment / Payout
```

---

# 75. TRANSACTION AUDIT

Semua financial event disimpan.

Minimal:

```text
transaction_id
order_id
payment_id
actor_type
actor_id
event_type
amount
currency
old_status
new_status
reference
created_at
```

Contoh:

```text
Payment Created
Payment Processing
Payment Success
Funds Held
Payout Eligible
Payout Paid
```

---

# 76. LEDGER CONCEPT

Untuk financial architecture yang matang, system sebaiknya mempunyai ledger.

Contoh:

```text
Customer Payment
+500K

Platform Fee
-25K

Refund
-100K

Provider Payout
+375K
```

Ledger digunakan untuk reconciliation dan audit, bukan sekadar tampilan UI.

---

# 77. PAYMENT NOTIFICATION

Payment event dapat memicu notification:

```text
PAYMENT_REQUIRED
PAYMENT_CONFIRMED
PAYMENT_FAILED
PAYMENT_EXPIRED
ADDITIONAL_PAYMENT_REQUIRED
REFUND_REQUESTED
REFUND_COMPLETED
PAYOUT_COMPLETED
PAYOUT_FAILED
ESCROW_FUNDED
ESCROW_RELEASED
```

Notification tetap merupakan layer Communication.

---

# 78. PAYMENT NOTIFICATION FLOW

```text
Payment Event
↓
Financial Record Updated
↓
Event Generated
↓
Communication Notification
↓
Customer / Provider
```

---

# 79. CUSTOMER PAYMENT HISTORY

Fitur:

```text
My Payments
```

Detail:

```text
Payment Number
Order
Amount
Payment Method
Status
Paid At
Receipt
```

---

# 80. PROVIDER PAYOUT DASHBOARD

Provider dapat melihat:

```text
Gross Revenue
Platform Fee
Refund Deduction
Adjustment
Pending Payout
Available Payout
Paid Out
```

---

# 81. PROVIDER PAYOUT DETAIL

Contoh:

```text
Order
ORD-00123

Gross
Rp500.000

Platform Fee
-Rp25.000

Refund
Rp0

Adjustment
Rp0

Net Payout
Rp475.000
```

---

# 82. INVOICE / RECEIPT ACCESS

Customer dapat mengakses:

```text
Order Detail
↓
Payment
↓
Invoice
↓
Receipt
```

Provider dapat mengakses financial documents yang menjadi hak mereka.

---

# 83. FINANCIAL TIMELINE

Contoh:

```text
10:00 Invoice Created
10:03 Payment Started
10:04 Payment Confirmed
10:04 Receipt Generated
10:05 Funds Held
10:30 Service Started
11:30 Service Completed
11:35 Customer Confirmed
11:36 Payout Eligible
11:40 Payout Processed
```

Ini dapat menjadi bagian dari payment history dan terhubung dengan service timeline.

---

# 84. PAYMENT HISTORY ≠ ORDER HISTORY

```text
Order History
= perjalanan layanan

Payment History
= perjalanan uang
```

Keduanya terhubung:

```text
order_id
```

tetapi tidak digabung menjadi satu entity.

---

# 85. PROTECTION UNTUK CUSTOMER

Customer protection mencakup:

- price transparency;
- approval additional cost;
- payment receipt;
- payment status;
- refund status;
- escrow/protected funds untuk transaksi yang relevan;
- dispute mechanism;
- payout hold ketika dispute aktif;
- survey fee transparency;
- transaction audit.

---

# 86. PROTECTION UNTUK PROVIDER

Provider protection mencakup:

- survey fee;
- payment authorization;
- no-show financial handling;
- approved additional cost;
- proof of service;
- location/check-in evidence;
- cancellation records;
- payout eligibility;
- dispute payout hold yang terstruktur.

---

# 87. CUSTOMER-PROVIDER BALANCE

Protection tidak boleh hanya berpihak pada customer atau provider.

Prinsip:

```text
Customer
→ mendapat transparansi + dispute/refund protection

Provider
→ mendapat protection atas waktu, tenaga, survey, dan pekerjaan yang sudah disepakati
```

---

# 88. MATRIX PAYMENT TIMING

| Scenario | Payment Timing | Protection |
|---|---|---|
| Fixed Price | Upfront / sesuai policy | Optional |
| Scheduled | Upfront / Deposit / Policy | Optional |
| Emergency | Authorization / Upfront / Policy | Optional |
| Recurring | Per Occurrence | Optional |
| Inspection | Survey fee bila kondisi terpenuhi | Optional |
| Project | Initial + Milestone + Final | Escrow capability |
| Custom Request | Setelah Agreement | Optional |

---

# 89. MATRIX PAYMENT & PROTECTION

| Kondisi | Customer | Provider | Servio |
|---|---|---|---|
| Order Created | Menunggu payment | Menunggu | Create payment request |
| Payment Success | Paid | Payout belum tentu | Record |
| Funds Held | Protected | Belum paid out | Hold |
| Service Active | Protected | Execute | Monitor |
| Completion | Review | Submit completion | Check condition |
| Customer Confirm | Complete | Eligible | Release/payout |
| Dispute | Protected | Payout hold | Resolution |
| Refund | Receive | Deduction sesuai hasil | Process |
| Payout | — | Receive | Settle |

---

# 90. MATRIX ESCROW

| Service Scenario | Escrow |
|---|---|
| Simple Fixed Service | Optional / Usually unnecessary |
| Emergency | Optional |
| Inspection | Optional |
| Custom | Optional |
| Project | Strongly relevant capability |
| Milestone Project | Strongly relevant capability |
| High-value Service | Relevant capability |

Escrow tetap mengikuti business policy dan payment infrastructure.

---

# 91. MATRIX FEE

| Level | Bisa Override? | Contoh |
|---|---:|---|
| Global | Default | 5% |
| Category | ✅ | Cleaning 7% |
| Subcategory | ✅ | Deep Cleaning 8% |
| Service | ✅ | AC Cleaning 6% |
| Product Category | ✅ | Tools 4% |
| Product Subcategory | ✅ | Power Tools 5% |
| Product | ✅ | Specific Product 6% |

Aturan:

> Fee paling spesifik yang aktif menjadi effective fee.

---

# 92. MATRIX FINANCIAL OUTCOME

| Event | Possible Outcome |
|---|---|
| Payment Failed | Retry |
| Payment Expired | Retry / Cancel |
| Customer Cancel | Refund / Partial / No Refund |
| Provider Cancel | Replace / Reschedule / Refund |
| No-Show Customer | Charge / Reschedule / Policy |
| No-Show Provider | Refund / Reschedule / Alternative |
| Service Partial | Adjustment / Refund / Continue |
| Additional Cost | Additional Payment |
| Service Dispute | Payout Hold |
| Payment Dispute | Investigation |
| Warranty Claim | Potential Re-service / Adjustment |

---

# 93. DATABASE — PAYMENTS

## `payments`

```text
payment_id
payment_number
order_id
customer_id
amount
currency
payment_method_id
payment_status
payment_intent_id
transaction_reference
paid_at
expires_at
created_at
updated_at
```

---

# 94. `payment_items`

```text
payment_item_id
payment_id
type
reference_id
description
amount
created_at
```

Type:

```text
SERVICE
SURVEY_FEE
ADDITIONAL_COST
VISIT_FEE
EMERGENCY_FEE
PLATFORM_FEE
DISCOUNT
OTHER
```

Tax tidak termasuk.

---

# 95. `payment_methods`

```text
payment_method_id
customer_id
method_type
provider
masked_identifier
status
created_at
```

Data payment sensitif sebaiknya tidak disimpan mentah bila sebenarnya dikelola oleh payment processor.

---

# 96. DATABASE — INVOICE

## `invoices`

```text
invoice_id
invoice_number
order_id
customer_id
subtotal
discount
fee
total
status
issued_at
due_at
paid_at
voided_at
```

---

# 97. DATABASE — RECEIPT

## `receipts`

```text
receipt_id
receipt_number
payment_id
order_id
amount
payment_method
transaction_reference
issued_at
```

---

# 98. DATABASE — ESCROW

## `escrow_transactions`

```text
escrow_id
order_id
payment_id
amount
status
held_at
release_at
refund_at
```

---

# 99. DATABASE — PAYOUT

## `payouts`

```text
payout_id
order_id
provider_id
gross_amount
platform_fee
refund_deduction
adjustment
net_amount
status
eligible_at
processed_at
```

Tax tidak termasuk.

---

# 100. DATABASE — REFUND

## `refunds`

```text
refund_id
payment_id
order_id
amount
refund_type
reason
status
requested_by
requested_at
processed_at
```

---

# 101. DATABASE — FINANCIAL ADJUSTMENT

## `financial_adjustments`

```text
adjustment_id
order_id
type
reason
amount
old_total
new_total
created_by
approved_by
status
created_at
```

---

# 102. DATABASE — MILESTONE

## `payment_milestones`

```text
milestone_id
order_id
name
description
amount
due_date
status
completion_condition
payment_id
created_at
updated_at
```

---

# 103. DATABASE — PLATFORM FEE

## `platform_fee_configurations`

```text
fee_configuration_id
scope_type
scope_id
fee_type
fee_value
payer_type
status
effective_from
effective_until
created_at
updated_at
```

Scope type:

```text
GLOBAL
CATEGORY
SUBCATEGORY
SERVICE
PRODUCT_CATEGORY
PRODUCT_SUBCATEGORY
PRODUCT
```

Fee type:

```text
PERCENTAGE
FIXED_AMOUNT
```

Payer:

```text
CUSTOMER
PROVIDER
SHARED
```

---

# 104. DATABASE — PLATFORM FEE HISTORY

## `platform_fee_configuration_history`

```text
id
fee_configuration_id
old_value
new_value
changed_by
reason
created_at
```

---

# 105. DATABASE — SURVEY FEE

Survey configuration berasal dari provider service:

```text
survey_required
survey_fee_type
survey_fee_amount
```

Record financial:

```text
survey_fee_applied
survey_fee_status
payment_id
applied_at
reason
```

Value:

```text
FREE
PAID
```

---

# 106. DATABASE — FINANCIAL LEDGER

## `financial_ledger_entries`

```text
ledger_entry_id
order_id
payment_id
account_type
entry_type
debit
credit
currency
reference_type
reference_id
created_at
```

Ledger menjadi dasar reconciliation.

---

# 107. DATABASE — TRANSACTION AUDIT

## `financial_transaction_audit`

```text
audit_id
order_id
payment_id
event_type
actor_type
actor_id
amount
old_status
new_status
reference
metadata
created_at
```

---

# 108. ORDER → PAYMENT RELATIONSHIP

```text
Booking
↓
Pricing / Quotation
↓
Agreement
↓
Order
↓
Invoice
↓
Payment
↓
Escrow / Settlement
↓
Execution
↓
Completion
↓
Payout
```

---

# 109. PAYMENT → COMMUNICATION RELATIONSHIP

```text
Payment Event
↓
Financial Record
↓
Event
↓
Notification
↓
Customer / Provider
```

Contoh:

```text
PAYMENT_CONFIRMED
↓
Notification
"Payment confirmed."
```

---

# 110. PAYMENT → COMPLETION RELATIONSHIP

```text
Payment Confirmed
↓
Protected Funds
↓
Execution
↓
Completion
↓
Customer Confirmation
↓
Payout
```

Payout tidak harus langsung terjadi pada saat payment berhasil.

---

# 111. PAYMENT → DISPUTE RELATIONSHIP

```text
Dispute Open
↓
Payout Hold
↓
Financial Investigation
↓
Resolution
↓
Refund / Payout / Partial Settlement
```

---

# 112. PAYMENT → WARRANTY RELATIONSHIP

Warranty detail dibahas di Feature #13.

Pada payment domain:

```text
Warranty Claim
↓
Potential Financial Adjustment
```

Detail coverage dan service warranty tetap berada pada domain Warranty.

---

# 113. PAYMENT → SERVICE HISTORY

Payment history dan service history terpisah:

```text
Service History
= layanan apa yang diberikan

Payment History
= transaksi uang
```

Relasi:

```text
order_id
```

---

# 114. CUSTOMER PAYMENT FLOW

```text
Order Created
↓
Payment Required
↓
Invoice
↓
Choose Payment Method
↓
Payment Intent
↓
Processing
↓
Success
↓
Receipt
↓
Protected Funds / Settlement
```

---

# 115. PROVIDER PAYOUT FLOW

```text
Order Completed
↓
Customer Confirm / Completion Condition
↓
Payout Eligibility Check
↓
Dispute?
├── No → Eligible
└── Yes → Hold
↓
Payout Processing
↓
Provider Paid
```

---

# 116. PROJECT FINANCIAL FLOW

```text
Project Order
↓
Initial Invoice
↓
Initial Payment
↓
Escrow
↓
Milestone 1
↓
Approval
↓
Milestone Payment
↓
Milestone 2
↓
Approval
↓
Final
↓
Customer Confirm
↓
Escrow Release
↓
Provider Payout
```

---

# 117. INSPECTION FINANCIAL FLOW

```text
Booking
↓
Inspection Required
↓
Survey
↓
Quotation
↓
Customer Decision
```

### Continue

```text
Accept
↓
Main Order
↓
Main Payment
↓
Execution
```

Survey tidak menjadi biaya terpisah pada main transaction.

### Reject

```text
Reject
↓
Main Service Closed
↓
If Survey = Paid
   → Survey Fee Payment
If Survey = Free
   → No Survey Fee
```

---

# 118. FIXED PRICE FINANCIAL FLOW

```text
Service
↓
Fixed Price
↓
Booking
↓
Provider Accept
↓
Order
↓
Invoice
↓
Payment
↓
Receipt
↓
Execution
↓
Completion
↓
Payout
```

---

# 119. EMERGENCY FINANCIAL FLOW

```text
Emergency
↓
Provider Match
↓
Accept
↓
Order
↓
Payment / Authorization
↓
Execution
↓
Final Cost if required
↓
Adjustment / Quotation
↓
Customer Approval
↓
Final Payment
↓
Completion
↓
Payout
```

---

# 120. RECURRING FINANCIAL FLOW

```text
Recurring Booking
↓
Occurrence
↓
Order
↓
Payment
↓
Execution
↓
Completion
↓
Payout
↓
Next Occurrence
```

Setiap occurrence memiliki financial record sendiri.

---

# 121. CUSTOM REQUEST FINANCIAL FLOW

```text
Custom Request
↓
Provider Response
↓
Quotation
↓
Negotiation
↓
Agreement
↓
Order
↓
Invoice
↓
Payment
↓
Execution
↓
Completion
↓
Payout
```

---

# 122. WORKSHOP FINANCIAL FLOW

```text
Vehicle Received
↓
Inspection
↓
Quotation
↓
Customer Accept
↓
Deposit / Payment
↓
Repair
↓
Additional Cost if needed
↓
Final Payment
↓
Ready for Pickup
↓
Completion
↓
Payout
```

---

# 123. EDGE CASES

Financial system minimal harus menangani:

1. Payment Failed
2. Payment Expired
3. Duplicate Payment
4. Wrong Amount
5. Partial Payment
6. Overpayment
7. Refund Failed
8. Refund Pending
9. Provider Cancel
10. Customer Cancel
11. Provider No-Show
12. Customer No-Show
13. Provider Late
14. Service Partial
15. Service Cannot Complete
16. Additional Cost
17. Additional Payment Failed
18. Survey Free
19. Survey Paid
20. Customer Reject After Survey
21. Customer Continue After Survey
22. Quotation Changed Before Payment
23. Dispute
24. Payout Hold
25. Payout Failed
26. Escrow Release Delayed
27. Invoice Void
28. Payment Reversal
29. Financial Adjustment
30. Multiple Payment Attempts

---

# 124. SECURITY & CONTROL

Payment domain harus memiliki:

- authentication;
- authorization;
- idempotency;
- secure payment references;
- audit trail;
- role-based access;
- transaction reconciliation;
- duplicate transaction protection;
- refund authorization;
- payout authorization;
- escrow release authorization.

Provider tidak boleh mengubah financial records secara sepihak.

---

# 125. ADMIN / OPERATIONS

Admin dapat menangani:

- payment issue;
- refund;
- payout hold;
- transaction review;
- dispute financial review;
- invoice void;
- reconciliation issue;
- failed payout;
- suspicious transaction.

Setiap manual action wajib memiliki:

```text
actor
reason
timestamp
reference
audit trail
```

---

# 126. ANALYTICS PAYMENT

CEO/Finance/Operations dapat melihat:

- total transaction value;
- total payment;
- successful payment rate;
- failed payment rate;
- expired payment rate;
- refund rate;
- total refund;
- average order value;
- platform fee revenue;
- provider payout;
- payout failure;
- payout hold;
- escrow balance;
- survey fee occurrence;
- cancellation financial impact.

---

# 127. ANALYTICS PLATFORM FEE

Karena fee bersifat fleksibel, CEO dapat membandingkan:

```text
Category
Subcategory
Service
```

Contoh:

```text
Cleaning
7%

Deep Cleaning
8%

AC Cleaning
6%
```

Metrik:

- gross transaction;
- platform fee;
- effective fee;
- fee contribution;
- transaction volume.

---

# 128. ANALYTICS PROVIDER PAYOUT

Provider:

```text
Gross
Platform Fee
Refund
Adjustment
Net Payout
```

CEO:

```text
Payout Volume
Payout Pending
Payout Hold
Payout Failed
```

---

# 129. ANALYTICS REFUND

```text
Refund Count
Refund Amount
Full Refund
Partial Refund
Refund Reason
Refund Processing Time
```

---

# 130. FINAL PAYMENT & PROTECTION ARCHITECTURE

```text
                           ORDER
                              │
                     ┌────────┴────────┐
                     ↓                 ↓
                 INVOICE           PAYMENT REQUEST
                                       │
                                       ↓
                                PAYMENT METHOD
                                       │
                                       ↓
                                  PROCESSING
                                  /         \
                               FAILED       SUCCESS
                                 │             │
                               RETRY       PAYMENT PAID
                                               │
                                    ┌──────────┴──────────┐
                                    ↓                     ↓
                               DIRECT SETTLEMENT       ESCROW
                                    │                     │
                                    │                  FUNDED
                                    │                     ↓
                                    │                   HELD
                                    └──────────┬──────────┘
                                               ↓
                                          EXECUTION
                                               ↓
                                          COMPLETION
                                               ↓
                                      CUSTOMER CONFIRM
                                         /         \
                                        /           \
                                    CONFIRM        DISPUTE
                                       ↓              ↓
                              PAYOUT ELIGIBLE    PAYOUT HOLD
                                       ↓              ↓
                                    PAYOUT        RESOLUTION
                                       ↓          /    |    \
                                   PROVIDER    REFUND  SPLIT PAYOUT
```

---

# 131. FINAL CUSTOMER FINANCIAL FLOW

```text
Discover Service
↓
Booking
↓
See Price / Survey Rule
↓
Quotation if required
↓
Final Price
↓
Order
↓
Invoice / Payment Request
↓
Choose Payment Method
↓
Pay
↓
Payment Confirmed
↓
Receipt
↓
Protected Funds if applicable
↓
Service
↓
Completion
↓
Confirm
↓
Transaction Closed
```

---

# 132. FINAL PROVIDER FINANCIAL FLOW

```text
Configure Service
↓
Configure Pricing
↓
Configure Fee Capability
↓
Receive Booking
↓
Accept / Survey / Quote
↓
Agreement
↓
Order
↓
Service
↓
Completion
↓
Payout Eligibility
↓
Payout
↓
Financial History
```

---

# 133. FINAL BUSINESS RULES

1. Payment merupakan domain finansial setelah Order.
2. Invoice, Payment, Receipt, Escrow, dan Payout merupakan objek berbeda.
3. Customer dapat mengetahui total pembayaran sebelum melakukan payment.
4. Payment timing dapat berbeda berdasarkan service.
5. Payment method dapat berbeda berdasarkan payment infrastructure.
6. Payment memiliki lifecycle sendiri.
7. Payment failure dapat di-retry.
8. Payment expiration memiliki business handling.
9. Duplicate payment harus dicegah.
10. Invoice adalah tagihan.
11. Receipt adalah bukti pembayaran.
12. Payment history berbeda dari order history.
13. Provider payout berbeda dari customer payment.
14. Escrow digunakan pada transaksi yang relevan.
15. Payout dapat ditahan saat dispute.
16. Payout dapat bergantung pada completion condition.
17. Refund dapat full, partial, atau none sesuai policy.
18. Cancellation memiliki financial impact.
19. No-show memiliki financial impact.
20. Provider cancellation memiliki financial impact.
21. Additional Cost membutuhkan customer approval.
22. Additional Payment merupakan transaksi tambahan pada Order, bukan otomatis order baru.
23. Survey fee dapat Free atau Paid.
24. Survey fee nominal ditentukan provider.
25. Survey fee hanya ditagihkan ketika survey telah dilakukan dan customer tidak melanjutkan main service.
26. Jika customer melanjutkan main service, survey fee tidak menjadi biaya terpisah pada main transaction.
27. Jika survey Free, tidak ada survey charge.
28. Jika survey belum dilakukan, completed survey fee tidak otomatis muncul.
29. Survey fee rule harus ditampilkan kepada customer.
30. Platform/Application Fee dikelola oleh CEO/Product Owner.
31. Platform fee dapat berbeda per Global, Category, Subcategory, Service, Product Category, Product Subcategory, atau Product.
32. Effective fee menggunakan konfigurasi paling spesifik.
33. Platform fee mendukung Percentage.
34. Platform fee mendukung Fixed Amount.
35. Payer fee dapat dikonfigurasi Customer, Provider, atau Shared.
36. Fee configuration memiliki effective date/versioning.
37. Tax tidak digunakan dalam scope financial model saat ini.
38. Smart tidak boleh mengubah transaksi finansial tanpa persetujuan pihak yang berwenang.
39. Payment Notification dikirim melalui Communication layer.
40. Semua financial events memiliki audit trail.
41. Reconciliation harus dapat dilakukan menggunakan transaction/ledger records.
42. Admin manual action harus tercatat.
43. Customer protection dan provider protection sama-sama menjadi bagian dari Protection layer.
44. Payment domain terhubung dengan Booking, Pricing, Quotation, Communication, Order, Execution, Completion, dan Dispute.
45. Payment & Protection menjadi fondasi finansial untuk fase service dan product di masa berikutnya.

---

# 134. INTEGRATION ROADMAP

```text
BOOKING
↓
PRICING & QUOTATION
↓
COMMUNICATION
↓
ORDER
↓
PAYMENT & PROTECTION
↓
SERVICE EXECUTION
↓
TRACKING
↓
PROOF OF SERVICE
↓
COMPLETION
↓
RATING & REVIEW
↓
COMPLAINT / DISPUTE
↓
WARRANTY
↓
SERVICE HISTORY
↓
ASSET
↓
MAINTENANCE
↓
REBOOKING / LOYALTY
↓
SMART RECOMMENDATION
↓
SERVICE + PRODUCT INTEGRATION
```

---

# 135. FINAL LOCKED DECISIONS

### Platform/Application Fee

```text
Global
↓
Category
↓
Subcategory
↓
Service / Product
```

Fee dapat:

```text
Percentage
atau
Fixed Amount
```

Fee paling spesifik yang aktif menjadi effective fee.

Payer dapat:

```text
Customer
Provider
Shared
```

---

### Tax

```text
REMOVED
```

Tidak digunakan dalam scope financial model saat ini.

---

### Survey Fee

Provider menentukan:

```text
FREE
atau
PAID + NOMINAL
```

Namun:

```text
Survey
↓
Customer Continue
→ No separate survey charge

Survey
↓
Customer Reject / Cancel
→ Survey Fee applies if PAID
```

---

### Payout

```text
Customer Payment
↓
Protection / Settlement
↓
Completion Condition
↓
Payout Eligibility
↓
Provider Payout
```

---

### Dispute

```text
Dispute
↓
Payout Hold if applicable
↓
Financial Resolution
↓
Refund / Partial Settlement / Payout
```

---

# 136. HANDOFF KE FEATURE #7

Setelah Payment & Protection selesai, domain berikutnya adalah:

# SERVICE EXECUTION

Fokus Feature #7:

```text
Order Confirmed
↓
Provider Preparation
↓
Ready
↓
On The Way / Service Start
↓
Arrival
↓
Check-in
↓
Before Condition
↓
Service Started
↓
In Progress
↓
Pause / Resume
↓
Additional Requirement
↓
Service Completion Submission
```

Feature #7 akan mengonsumsi hasil:

```text
Booking
+
Pricing
+
Quotation
+
Communication
+
Order
+
Payment
```

Kemudian menghasilkan event untuk:

```text
Tracking
Proof
Completion
```
