# SERVIO — PRICING, QUOTATION & COMMUNICATION JASA
## Master Feature, Business Flow, Business Rules, Status, Data, Matrix, dan Integrasi

> **Status:** Final Concept / Master Specification  
> **Scope:** Pricing, Quotation, Negotiation, Survey/Inspection Fee, Communication, Chat, Call, Attachment, Notification, dan integrasinya dengan Discovery → Booking → Order.  
> **Related master:** `servio-booking-order-jasa-final.md`

---

# 1. TUJUAN DOKUMEN

Dokumen ini menjadi spesifikasi lanjutan untuk sistem jasa Servio setelah Discovery, Booking, dan Order Jasa.

Fokusnya adalah:

- menentukan model harga yang dapat digunakan provider;
- mengatur quotation dan proposal;
- mengatur negotiation;
- mengatur survey/inspection fee;
- menjaga transparansi harga kepada customer;
- mengatur perubahan harga/additional cost;
- membedakan komunikasi biasa dan data transaksi resmi;
- mengatur chat, call, attachment, system message, dan notification;
- mendefinisikan data dan status;
- menghubungkan Pricing + Quotation + Communication ke Booking dan Order;
- menyediakan business rules dan edge cases untuk implementasi.

---

# 2. POSISI DALAM EKOSISTEM SERVIO

```text
DISCOVERY
    ↓
SERVICE / PROVIDER SERVICE
    ↓
SERVICE OFFERING CONFIGURATION
    ↓
BOOKING
    ↓
PRICING / SURVEY / QUOTATION
    ↓
COMMUNICATION / NEGOTIATION
    ↓
AGREEMENT
    ↓
ORDER
    ↓
PAYMENT
    ↓
EXECUTION
    ↓
TRACKING
    ↓
PROOF
    ↓
COMPLETION
```

Tidak semua service melewati quotation.

Contoh fixed price:

```text
Booking
↓
Fixed Price
↓
Agreement
↓
Order
```

Contoh inspection:

```text
Booking
↓
Survey / Inspection
↓
Quotation
↓
Communication / Negotiation
↓
Customer Accept
↓
Order
```

Contoh project:

```text
Booking
↓
Survey
↓
Scope
↓
Proposal
↓
Quotation
↓
Negotiation
↓
Agreement
↓
Order
```

---

# 3. PRINSIP FUNDAMENTAL

## 3.1 Pricing ≠ Quotation

**Pricing** adalah model dan komponen penentuan harga service.

**Quotation** adalah penawaran harga formal terhadap kebutuhan customer.

---

## 3.2 Chat ≠ Quotation

Chat digunakan untuk berdiskusi.

Quotation digunakan sebagai sumber resmi harga/scope yang disepakati.

Contoh:

```text
Chat:
"Kayaknya bisa Rp450.000."

Quotation:
Total = Rp450.000
Status = SENT
```

Harga resmi mengikuti quotation.

---

## 3.3 Chat ≠ Payment

Chat dapat membahas payment, tetapi status payment tetap berasal dari payment record.

---

## 3.4 Chat ≠ Order Status

Chat dapat memberitahukan status, tetapi status resmi berasal dari order/status history.

---

# 4. PROVIDER SERVICE OFFERING

Pricing dan communication configuration melekat pada `provider_service` / `service offering`.

Contoh:

```text
Service:
AC Repair

Provider:
Provider A

Booking:
✓ Instant
✓ Scheduled
✓ Emergency
✓ Inspection

Service Mode:
✓ Home Service

Pricing:
✓ Estimated
✓ Quotation

Survey:
✓ Paid
Rp50.000

Communication:
✓ Chat
✓ Call
✓ Attachment
```

Provider B dapat memiliki konfigurasi berbeda untuk service yang sama.

---

# 5. PRICING MODEL

Master capability yang dapat tersedia di Servio:

1. Fixed Price
2. Estimated Price
3. Price Range
4. Quotation
5. Negotiation
6. Duration Based
7. Material Based
8. Visit Fee
9. Inspection / Survey Fee
10. Emergency Fee
11. Milestone Payment
12. Material + Labor Pricing

Provider memilih capability yang didukung oleh service offering mereka, sesuai aturan Servio.

---

# 6. FIXED PRICE

Harga sudah ditentukan sebelum booking.

Contoh:

```text
AC Cleaning
Rp150.000
```

Flow:

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
```

Harga tidak boleh berubah sepihak.

Jika ada perubahan:

```text
Additional Requirement
↓
Adjustment
↓
Customer Approval
```

---

# 7. ESTIMATED PRICE

Harga berupa estimasi.

Contoh:

```text
Estimated:
Rp250.000 – Rp400.000
```

Customer harus mengetahui bahwa harga belum final.

Label:

> Estimasi harga. Harga final dapat berubah berdasarkan hasil pemeriksaan atau perubahan kebutuhan.

---

# 8. PRICE RANGE

Range dapat digunakan untuk memberikan gambaran awal tanpa mengklaim harga final.

Contoh:

```text
Starting from:
Rp200.000

Estimated:
Rp200.000 – Rp350.000
```

System harus membedakan:

- starting price;
- estimated range;
- confirmed price.

---

# 9. QUOTATION

Quotation digunakan ketika harga belum dapat ditentukan secara pasti pada awal booking.

Contoh service:

- AC repair;
- vehicle repair;
- renovation;
- construction;
- custom service;
- project.

---

# 10. QUOTATION FLOW

```text
Booking
↓
Provider Review
↓
Inspection / Requirement Review
↓
Quotation Draft
↓
Quotation Sent
↓
Customer Review
↓
Accept
atau
Revision
atau
Negotiation
↓
Final Quotation
↓
Customer Approval
↓
Price Locked
↓
Order
```

---

# 11. QUOTATION DATA

Minimal:

```text
quotation_id
quotation_number
booking_id
order_id
provider_id
customer_id
title
description
scope_of_work
subtotal
discount
tax
additional_fee
total_amount
valid_until
terms
warranty
status
version
created_at
updated_at
sent_at
accepted_at
rejected_at
expired_at
```

`order_id` dapat kosong ketika quotation masih berada pada fase booking.

---

# 12. QUOTATION ITEM

Quotation sebaiknya dipecah menjadi item.

Contoh:

```text
Labor
Rp150.000

Cleaning Chemical
Rp100.000

Capacitor
Rp120.000

Visit
Rp50.000
```

Entity:

```text
quotation_items
```

Field konseptual:

```text
id
quotation_id
item_type
name
description
quantity
unit
unit_price
subtotal
created_at
```

---

# 13. ITEM TYPE

Contoh:

```text
SERVICE
LABOR
MATERIAL
VISIT
INSPECTION
EMERGENCY
ADD_ON
OTHER
```

---

# 14. SCOPE OF WORK

Quotation harus mampu menjelaskan apa yang termasuk dan tidak termasuk.

### Included

```text
✓ Cleaning indoor
✓ Cleaning outdoor
✓ Testing
```

### Not Included

```text
✗ Major component replacement
✗ Electrical rewiring
```

Tujuannya:

- mengurangi salah persepsi;
- mempermudah approval;
- membantu dispute resolution;
- membuat quotation lebih profesional.

---

# 15. QUOTATION VERSIONING

Quotation tidak boleh di-overwrite tanpa history.

Contoh:

```text
Quotation v1
Rp500.000

↓ Revision

Quotation v2
Rp475.000

↓ Revision

Quotation v3
Rp450.000
```

Data:

```text
quotation_id
version
previous_version_id
```

---

# 16. QUOTATION STATUS

Master status:

```text
DRAFT
SENT
VIEWED
NEGOTIATING
REVISED
ACCEPTED
REJECTED
EXPIRED
CANCELLED
```

Flow normal:

```text
DRAFT
↓
SENT
↓
VIEWED
↓
ACCEPTED
```

Flow negotiation:

```text
SENT
↓
VIEWED
↓
NEGOTIATING
↓
REVISED
↓
ACCEPTED
```

---

# 17. QUOTATION EXPIRATION

Quotation dapat memiliki:

```text
valid_until
```

Contoh:

> Valid until 25 September 2026.

Setelah lewat:

```text
EXPIRED
```

Customer tidak dapat menerima quotation yang sudah expired.

---

# 18. CUSTOMER QUOTATION ACTION

Customer dapat:

```text
ACCEPT
REJECT
REQUEST_REVISION
ASK_QUESTION
```

---

# 19. PROVIDER QUOTATION ACTION

Provider dapat:

```text
CREATE
SEND
REVISE
WITHDRAW
EXTEND_VALIDITY
CANCEL
```

---

# 20. NEGOTIATION

Negotiation adalah proses diskusi harga/scope antara customer dan provider.

Contoh:

```text
Provider:
Rp500.000

Customer:
Bisa Rp450.000?

Provider:
Rp475.000 termasuk material.

Customer:
Setuju.
```

Namun angka final tetap harus dituangkan pada quotation/revision.

---

# 21. NEGOTIATION PRINCIPLE

```text
Chat
↓
Discussion
↓
Agreement Proposal
↓
Quotation Revision
↓
Customer Approval
↓
Price Locked
```

Jangan menjadikan chat semata sebagai sumber harga resmi.

---

# 22. MULTIPLE PROVIDER QUOTATION

Untuk custom/project, customer dapat menerima beberapa quotation.

```text
Requirement
↓
Provider A → Quotation
Provider B → Quotation
Provider C → Quotation
↓
Compare
↓
Customer Select
↓
Agreement
```

Customer dapat melihat:

- provider;
- total;
- scope;
- duration;
- warranty;
- availability;
- rating/review.

System menyajikan informasi tanpa mengambil keputusan final customer.

---

# 23. QUOTATION COMPARISON

Contoh:

| Atribut | Provider A | Provider B | Provider C |
|---|---:|---:|---:|
| Total | Rp500K | Rp450K | Rp550K |
| Durasi | 1 hari | 2 hari | 1 hari |
| Warranty | 30 hari | 14 hari | 60 hari |
| Scope | Full | Partial | Full |

---

# 24. PRICING BREAKDOWN

Customer harus dapat melihat breakdown harga.

Contoh:

```text
Service
Rp250.000

Labor
Rp100.000

Material
Rp50.000

Emergency Fee
Rp25.000

Discount
-Rp25.000

----------------
Total
Rp400.000
```

---

# 25. PRICE COMPONENTS

Entity/field konseptual:

```text
base_price
labor_cost
material_cost
visit_fee
inspection_fee
emergency_fee
transport_fee
additional_fee
discount
voucher
tax
total_amount
```

Komponen tidak wajib selalu ada.

---

# 26. PRICE LOCK

Setelah customer menyetujui quotation:

```text
FINAL QUOTATION
↓
CUSTOMER ACCEPT
↓
PRICE LOCKED
```

Perubahan setelah itu membutuhkan adjustment baru.

---

# 27. ADDITIONAL COST

Tambahan biaya dapat terjadi saat pengerjaan.

Contoh:

```text
Original:
Rp250.000

Additional Material:
Rp100.000

New Total:
Rp350.000
```

Flow:

```text
Issue Found
↓
Provider Explanation
↓
Adjustment Proposal
↓
Customer Review
↓
Accept / Reject
```

---

# 28. ADJUSTMENT ENTITY

Disarankan:

```text
order_adjustments
```

Data:

```text
adjustment_id
order_id
reason
description
items
amount
status
created_by
customer_approved_at
created_at
updated_at
```

Status:

```text
PENDING
APPROVED
REJECTED
CANCELLED
```

---

# 29. ADDITIONAL COST RULE

Provider tidak boleh:

```text
Work
↓
Add Cost
↓
Auto Charge
```

Yang benar:

```text
Problem
↓
Additional Cost
↓
Customer Approval
↓
Continue
```

---

# 30. INSPECTION / SURVEY

Survey digunakan saat provider perlu melihat kondisi aktual sebelum menentukan main service.

Contoh:

- AC Repair;
- electrical repair;
- plumbing;
- vehicle repair;
- renovation;
- construction.

---

# 31. SURVEY CONFIGURATION

Provider menentukan apakah service membutuhkan survey.

```text
Survey Required?
├── No
├── Yes - Free
└── Yes - Paid
    └── Fee Amount
```

---

# 32. FINAL SURVEY FEE RULE

Keputusan final:

> **Biaya survey/inspection hanya menjadi biaya yang ditagihkan ketika survey telah dilakukan tetapi customer membatalkan/menolak main service dan tidak melanjutkan ke Order utama.**

Provider dapat memilih:

```text
FREE
```

atau:

```text
PAID
```

Jika Paid, provider mengisi nominal.

Contoh:

```text
Survey Fee:
Rp50.000
```

---

# 33. JIKA CUSTOMER MELANJUTKAN ORDER

Flow:

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

Survey tidak ditambahkan sebagai biaya terpisah pada transaksi utama.

```text
Survey Fee = Rp0 pada final main order
```

---

# 34. JIKA CUSTOMER MENOLAK / MEMBATALKAN SETELAH SURVEY

Jika provider memilih Paid:

```text
Booking
↓
Survey
↓
Quotation
↓
Customer Reject
↓
Main Service Closed
↓
Survey Fee
↓
Close
```

Contoh:

```text
Survey Fee
Rp50.000
```

Customer membayar biaya survey karena provider sudah melakukan pekerjaan survey.

---

# 35. JIKA PROVIDER MEMILIH FREE

```text
Survey
↓
Quotation
↓
Customer Reject
↓
Close
↓
No Survey Charge
```

---

# 36. JIKA BOOKING DIBATALKAN SEBELUM SURVEY

Survey belum dilakukan.

Biaya mengikuti cancellation policy yang berlaku.

Tidak boleh dianggap otomatis sebagai completed survey fee.

---

# 37. SURVEY FEE VISIBILITY

Customer harus mengetahui rule sebelum melakukan booking.

Minimal tampil di:

### Service Detail

```text
Inspection Required

Survey Fee:
Rp50.000 if main service is rejected/cancelled after inspection
```

### Booking Summary

```text
Inspection:
Required

Potential Survey Fee:
Rp50.000
```

### Confirmation

Customer harus mendapat informasi yang jelas bahwa nominal tersebut dapat ditagihkan bila kondisi fee terpenuhi.

---

# 38. SURVEY FEE DATA

Konseptual:

```text
survey_required
survey_fee_type
survey_fee_amount
survey_completed_at
survey_fee_applied
survey_fee_status
```

Value:

```text
survey_fee_type:
FREE / PAID
```

`survey_fee_applied` baru menjadi true ketika rule penagihan terpenuhi.

---

# 39. SMART PRICING

Smart dapat membantu memberikan estimasi.

Input:

```text
Problem
+
Service
+
Scope
+
Location
+
Material
+
Duration
```

Output:

```text
Estimated Range
Rp250.000 – Rp400.000
```

Smart tidak menjadi harga final.

---

# 40. SMART QUOTATION ASSISTANCE

Untuk provider:

Smart dapat membantu:

- menyusun item;
- mengelompokkan labor/material;
- menghitung subtotal;
- memperkirakan durasi;
- menemukan item yang mungkin terlupa;
- menyusun draft deskripsi;
- membuat draft scope.

Provider tetap menjadi pihak yang menyetujui dan mengirim quotation.

---

# 41. COMMUNICATION — KONSEP

Communication adalah layer interaksi antara:

```text
Customer
Provider
Admin / Support
System
```

Fungsinya mendukung:

- discovery/pre-booking;
- booking;
- quotation;
- negotiation;
- order;
- execution;
- completion;
- dispute;
- warranty.

---

# 42. CONVERSATION CONTEXT

Conversation harus memiliki konteks entity.

Konseptual:

```text
conversation_id
customer_id
provider_id
admin_id
booking_id
order_id
type
status
created_at
updated_at
closed_at
```

Type:

```text
PRE_BOOKING
BOOKING
QUOTATION
ORDER
SUPPORT
DISPUTE
WARRANTY
```

---

# 43. PRE-BOOKING CHAT

Customer dapat bertanya sebelum membuat booking bila provider mengaktifkan kemampuan tersebut dan platform policy mengizinkannya.

Contoh:

```text
Customer:
"Daerah saya bisa?"

Provider:
"Bisa."

Customer:
"Kalau besok?"

Provider:
"Jam 10 bisa."
```

Kemudian:

```text
[Book Service]
```

---

# 44. BOOKING CHAT

Setelah booking dibuat:

```text
Booking
↓
Conversation
```

Customer dan provider dapat berkomunikasi mengenai:

- jadwal;
- kebutuhan;
- lokasi;
- detail service;
- attachment;
- perubahan yang diizinkan.

---

# 45. QUOTATION CHAT

Saat quotation dibuat:

```text
Quotation
↓
Communication
```

Customer dapat bertanya:

> "Apakah material sudah termasuk?"

Provider menjelaskan.

Setelah kesepakatan:

```text
Quotation Revision
↓
Customer Accept
```

---

# 46. NEGOTIATION CHAT

Negotiation berlangsung melalui communication.

Namun hasil resmi tetap:

```text
Quotation Revision
```

bukan pesan chat semata.

---

# 47. ORDER CHAT

Setelah order:

```text
Order
↓
Conversation
```

Digunakan untuk:

- koordinasi;
- schedule;
- lokasi;
- instruksi;
- progress;
- kondisi di lapangan.

---

# 48. EXECUTION COMMUNICATION

Contoh:

```text
Provider:
"Saya sedang perjalanan."

System:
"Provider is 10 minutes away."

Customer:
"Silakan lewat gerbang samping."
```

---

# 49. SYSTEM MESSAGE

System message dibuat otomatis berdasarkan event.

Contoh:

```text
Booking accepted.
Payment confirmed.
Provider is on the way.
Provider has arrived.
Service has started.
Additional cost requires approval.
Completion has been submitted.
Order has been completed.
```

---

# 50. EVENT → COMMUNICATION

Event penting:

```text
BOOKING_ACCEPTED
BOOKING_REJECTED
QUOTATION_SENT
QUOTATION_REVISED
QUOTATION_ACCEPTED
PAYMENT_CONFIRMED
PROVIDER_ON_THE_WAY
PROVIDER_ARRIVED
SERVICE_STARTED
ADDITIONAL_COST_CREATED
COMPLETION_SUBMITTED
ORDER_COMPLETED
DISPUTE_CREATED
WARRANTY_CREATED
```

Event dapat menghasilkan notification dan/atau system message.

---

# 51. CHAT ATTACHMENT

Chat dapat mendukung:

```text
IMAGE
VIDEO
DOCUMENT
```

Contoh:

Customer mengirim foto kerusakan.

Provider mengirim foto kondisi lapangan.

---

# 52. CHAT ATTACHMENT ≠ PROOF OF SERVICE

Attachment biasa:

```text
"Ini kondisi AC saya."
```

Proof:

```text
BEFORE
DURING
AFTER
SERVICE REPORT
```

Tidak semua attachment otomatis menjadi bukti resmi.

---

# 53. CALL

Customer dan provider dapat melakukan call jika service mendukung.

Use case:

- koordinasi lokasi;
- emergency;
- schedule;
- progress;
- penjelasan kebutuhan.

---

# 54. CALL DATA

```text
call_id
conversation_id
caller_id
receiver_id
call_type
status
started_at
ended_at
duration
```

Status:

```text
ANSWERED
MISSED
REJECTED
FAILED
```

---

# 55. MESSAGE STATUS

```text
SENDING
SENT
DELIVERED
READ
FAILED
```

Contoh:

```text
✓ Sent
✓✓ Delivered
✓✓ Read
```

---

# 56. CONVERSATION STATUS

```text
OPEN
PAUSED
CLOSED
ARCHIVED
```

Percakapan completed order tidak harus langsung hilang.

---

# 57. CHAT LIFECYCLE

```text
Pre-Booking
↓
Booking
↓
Quotation
↓
Order
↓
Execution
↓
Completion
↓
Post-Service
↓
Closed / Archived
```

Jika terdapat dispute/warranty:

```text
Closed
↓
Dispute / Warranty Thread
```

dapat dibuat/reopened sesuai policy.

---

# 58. CUSTOMER → ADMIN

Customer dapat membuka support:

```text
Order
↓
Help
↓
Contact Support
```

Admin dapat melihat konteks:

- booking;
- order;
- payment;
- quotation;
- tracking;
- proof;
- dispute.

Customer tidak perlu menjelaskan seluruh informasi dari awal.

---

# 59. PROVIDER → ADMIN

Provider dapat menghubungi support mengenai:

- customer issue;
- payment;
- schedule;
- additional cost;
- order issue;
- dispute;
- technical issue.

---

# 60. NOTIFICATION

Notification event dapat berupa:

```text
Booking Accepted
Quotation Received
Quotation Revised
Payment Confirmed
Provider On The Way
Provider Arrived
Additional Cost Request
Completion Submitted
Order Completed
Warranty Update
Dispute Update
```

---

# 61. NOTIFICATION CHANNEL

Konseptual:

```text
IN_APP
PUSH
EMAIL
WHATSAPP
```

Channel aktual tergantung implementasi dan kebijakan platform.

---

# 62. NOTIFICATION ≠ CHAT

Notification adalah pemberitahuan event.

Chat adalah percakapan.

Contoh:

```text
Notification:
"Provider is on the way."

Chat:
"Saya sudah berangkat ya."
```

---

# 63. COMMUNICATION PRIVACY

Customer/provider tidak harus diberikan akses ke nomor pribadi.

Konsep:

```text
Customer
     ↕
Servio Communication Layer
     ↕
Provider
```

Platform dapat menerapkan masked contact bila dibutuhkan.

---

# 64. OFF-PLATFORM TRANSACTION PROTECTION

Communication dapat memiliki rule untuk mendeteksi indikasi transaksi di luar Servio seperti:

- nomor rekening;
- link pembayaran eksternal;
- ajakan transaksi di luar platform;
- informasi kontak tertentu.

Flow konseptual:

```text
Message
↓
Detection
↓
Warning / Restriction
```

Semua implementasi harus memperhatikan privacy dan policy platform.

---

# 65. COMMUNICATION SOURCE OF TRUTH

| Informasi | Source of Truth |
|---|---|
| Harga | Pricing / Quotation |
| Payment | Payment Record |
| Status | Status History |
| Proof | Proof Record |
| Scope | Quotation / Order |
| Percakapan | Conversation |
| Notification | Notification Record |

---

# 66. COMMUNICATION DATA MODEL

## `conversations`

```text
conversation_id
customer_id
provider_id
admin_id
booking_id
order_id
type
status
created_at
updated_at
closed_at
```

## `messages`

```text
message_id
conversation_id
sender_id
sender_type
message_type
content
reply_to_message_id
created_at
updated_at
```

## `message_status`

```text
message_id
status
timestamp
```

## `attachments`

```text
attachment_id
message_id
file_type
file_name
file_url
file_size
uploaded_by
created_at
```

## `calls`

```text
call_id
conversation_id
caller_id
receiver_id
call_type
status
started_at
ended_at
duration
```

## `notifications`

```text
notification_id
user_id
type
title
body
reference_type
reference_id
is_read
created_at
```

---

# 67. COMMUNICATION MESSAGE TYPES

```text
TEXT
IMAGE
VIDEO
DOCUMENT
SYSTEM
QUOTATION_REFERENCE
ORDER_UPDATE
ACTION
```

`ACTION` dapat mewakili interaction seperti:

- accept quotation;
- approve additional cost;
- confirm completion;
- reschedule.

---

# 68. COMMUNICATION PRE-BOOKING FLOW

```text
Provider Profile
↓
Chat
↓
Customer Question
↓
Provider Response
↓
Customer
↓
Book Service
```

---

# 69. COMMUNICATION BOOKING FLOW

```text
Booking Created
↓
Conversation Created
↓
Provider Review
↓
Chat if needed
↓
Accept / Reject / Revision
```

---

# 70. COMMUNICATION QUOTATION FLOW

```text
Quotation Sent
↓
Notification
↓
Customer Review
↓
Question
↓
Chat
↓
Negotiation
↓
Quotation Revision
↓
Customer Accept
```

---

# 71. COMMUNICATION ORDER FLOW

```text
Order
↓
Conversation
↓
Preparation
↓
Schedule Discussion
↓
On The Way
↓
Arrival
↓
Execution
```

---

# 72. COMMUNICATION ADDITIONAL COST FLOW

```text
Problem Found
↓
Provider Explanation
↓
Additional Cost Proposal
↓
Customer Decision
├── Accept
└── Reject
```

---

# 73. COMMUNICATION COMPLETION FLOW

```text
Completion Submitted
↓
Notification
↓
Customer Review
↓
Question if needed
↓
Confirm / Report Issue
```

---

# 74. COMMUNICATION DISPUTE FLOW

```text
Customer Report Issue
↓
Dispute Thread
↓
Customer Evidence
↓
Provider Response
↓
Admin / Resolution
```

---

# 75. COMMUNICATION WARRANTY FLOW

```text
Warranty Claim
↓
Warranty Conversation
↓
Provider Review
↓
Re-Service Scheduling
↓
Execution
↓
Resolution
```

---

# 76. PRICING + COMMUNICATION MASTER FLOW

```text
BOOKING
   ↓
PRICE MODEL
   ↓
┌───────────────┬────────────────┬───────────────┐
│ Fixed Price   │ Estimated      │ Quotation     │
│               │                │               │
│ Customer      │ Customer sees  │ Inspection /  │
│ sees price    │ range          │ requirement   │
└───────┬───────┴───────┬────────┴───────┬───────┘
        │               │                │
        │               │           Quotation
        │               │                ↓
        │               │           Negotiation
        │               │                ↓
        │               │         Quotation Revision
        │               │                ↓
        └───────────────┴────────── Final Price
                                     ↓
                               Customer Approval
                                     ↓
                                Price Locked
                                     ↓
                                    ORDER
```

Communication berada di antara proses-proses yang membutuhkan interaksi, bukan menggantikan entity transaksi resmi.

---

# 77. MASTER SURVEY + PRICING FLOW

```text
BOOKING
↓
INSPECTION REQUIRED
↓
SURVEY
↓
QUOTATION
↓
CUSTOMER DECISION
```

### Customer Accept

```text
Customer Accept
↓
Main Order
↓
Survey Fee = 0 pada main transaction
```

### Customer Reject

```text
Customer Reject
↓
Main Service Closed
↓
IF Survey Fee = PAID
    → Charge Survey Fee
IF Survey Fee = FREE
    → No Survey Charge
```

---

# 78. MATRIX PRICING PER BOOKING TYPE

| Booking Type | Pricing Umum | Survey | Quotation | Negotiation |
|---|---|---:|---:|---:|
| Instant | Fixed / Estimated | Optional | Optional | Rare |
| Scheduled | Fixed / Estimated / Quotation | Optional | Optional | Optional |
| Emergency | Estimated / Quotation | Often | Often | Optional |
| Recurring | Fixed / Estimated | Optional | Optional | Optional |
| Inspection | Survey + Quotation | ✅ | ✅ | Optional |
| Project | Quotation / Negotiation / Milestone | ✅ | ✅ | ✅ |
| Custom Request | Quotation / Negotiation | Often | ✅ | ✅ |

Matrix ini menunjukkan capability yang relevan, bukan kewajiban universal.

---

# 79. MATRIX COMMUNICATION PER BOOKING TYPE

| Booking Type | Pre-Booking Chat | Booking Chat | Quotation Chat | Execution Chat | Call |
|---|---:|---:|---:|---:|---:|
| Instant | Optional | ✅ | Optional | ✅ | Optional |
| Scheduled | Optional | ✅ | Optional | ✅ | Optional |
| Emergency | ✅ | ✅ | Often | ✅ | ✅ |
| Recurring | Optional | ✅ | Optional | ✅ | Optional |
| Inspection | ✅ | ✅ | ✅ | ✅ | Optional |
| Project | ✅ | ✅ | ✅ | ✅ | ✅ |
| Custom Request | ✅ | ✅ | ✅ | ✅ | ✅ |

---

# 80. PRICING + COMMUNICATION MATRIX

| Scenario | Pricing | Communication | Output |
|---|---|---|---|
| Fixed Price | Fixed | Optional | Order |
| Estimated | Range | Optional | Order / Inspection |
| Inspection | Survey + Quotation | ✅ | Order / Close |
| Project | Quotation + Negotiation | ✅ | Order |
| Custom | Quotation + Negotiation | ✅ | Order |
| Emergency | Estimated / Quotation | ✅ | Execution / Order |
| Additional Cost | Adjustment | ✅ | Updated Order |

---

# 81. CUSTOMER FLOW

```text
Discover
↓
Service
↓
Provider
↓
Booking
↓
Price Information
↓
Survey / Quotation if needed
↓
Chat / Negotiation if needed
↓
Final Price
↓
Approval
↓
Order
↓
Payment
↓
Execution
↓
Completion
```

---

# 82. PROVIDER FLOW

```text
Configure Service
↓
Configure Pricing
↓
Configure Survey
↓
Configure Communication
↓
Receive Booking
↓
Review Need
↓
Survey if required
↓
Create Quotation
↓
Communicate / Negotiate
↓
Send Final Quotation
↓
Customer Accept
↓
Order
↓
Execute
```

---

# 83. ADMIN FLOW

```text
Monitor Pricing Issues
↓
Quotation Issues
↓
Communication Issues
↓
Customer Report
↓
Provider Report
↓
Dispute
↓
Resolution
```

Admin tidak boleh mengubah harga/order secara diam-diam tanpa audit trail.

---

# 84. SMART COMMUNICATION ASSISTANCE

Smart dapat membantu:

- merangkum conversation;
- merangkum kebutuhan customer;
- mengubah percakapan menjadi draft quotation;
- mendeteksi detail requirement yang belum jelas;
- menyarankan pertanyaan klarifikasi;
- menyusun system reminder;
- membantu customer memahami quotation.

Smart tetap bersifat assistance.

---

# 85. SMART NEGOTIATION ASSISTANCE

Smart dapat membantu provider/customer memahami:

```text
Original Price
Requested Price
Difference
Scope Difference
```

Tetapi smart tidak otomatis menerima negotiation atas nama user.

---

# 86. EDGE CASE PRICING

Minimal:

1. Price missing
2. Price expired
3. Quotation expired
4. Quotation rejected
5. Quotation revised
6. Multiple quotation
7. Customer requests lower price
8. Provider changes scope
9. Additional cost
10. Additional cost rejected
11. Material unavailable
12. Survey free
13. Survey paid
14. Survey cancelled before completion
15. Customer rejects after survey
16. Customer accepts after survey
17. Provider withdraws quotation
18. Provider cannot honor previous quotation
19. Emergency fee added
20. Milestone amount changed

---

# 87. EDGE CASE COMMUNICATION

Minimal:

1. Provider does not respond
2. Customer does not respond
3. Message failed
4. Attachment failed
5. Call failed
6. Provider offline
7. Customer offline
8. Duplicate message
9. Conversation closed
10. Dispute thread created
11. Warranty thread created
12. Unsupported file
13. Large attachment
14. Suspicious payment contact
15. External transaction attempt
16. Wrong recipient/context
17. Notification delivery failed
18. Notification unread
19. Admin intervention
20. Communication reopened by active dispute/warranty

---

# 88. SECURITY & PRIVACY PRINCIPLES

Communication dan pricing harus memperhatikan:

- authentication;
- authorization;
- conversation ownership;
- booking/order access control;
- attachment access;
- private customer address;
- contact privacy;
- audit trail;
- secure payment references;
- dispute evidence protection.

User hanya boleh melihat conversation dan quotation yang memang menjadi bagian dari transaksi/relasinya.

---

# 89. ANALYTICS PRICING

Metrik yang dapat dihasilkan:

- average price;
- average quotation;
- quotation acceptance rate;
- quotation rejection rate;
- negotiation frequency;
- quotation revision count;
- average discount;
- additional cost frequency;
- survey conversion rate;
- survey rejection rate;
- survey fee occurrence;
- price range vs final price.

---

# 90. ANALYTICS COMMUNICATION

Metrik:

- pre-booking chat rate;
- average response time;
- unread rate;
- response rate;
- call success rate;
- message failure rate;
- attachment usage;
- quotation discussion rate;
- negotiation rate;
- support escalation;
- dispute communication volume.

---

# 91. DATABASE — PRICING

Konsep entity:

```text
provider_service_pricing
pricing_models
pricing_components
```

Contoh:

```text
provider_service_pricing
- provider_service_id
- pricing_type
- base_price
- min_price
- max_price
- duration_unit
- status
```

---

# 92. DATABASE — QUOTATION

```text
quotations
quotation_items
quotation_versions
quotation_terms
quotation_attachments
```

---

# 93. DATABASE — SURVEY

```text
provider_service_survey
survey_records
survey_fee_records
```

Konseptual:

```text
provider_service_survey
- provider_service_id
- required
- fee_type
- fee_amount
```

---

# 94. DATABASE — ADJUSTMENT

```text
order_adjustments
order_adjustment_items
order_adjustment_history
```

---

# 95. DATABASE — COMMUNICATION

```text
conversations
messages
message_status
attachments
calls
notifications
```

---

# 96. RELATIONSHIP OVERVIEW

```text
provider_service
      │
      ├── pricing
      ├── survey configuration
      ├── booking type
      ├── service mode
      └── availability
              │
              ↓
           booking
              │
              ├── conversation
              ├── survey
              └── quotation
                       │
                       ↓
                    agreement
                       │
                       ↓
                     order
                       │
             ┌─────────┼─────────┐
             ↓         ↓         ↓
          payment   communication execution
                                  │
                                  ↓
                               tracking
                                  ↓
                                 proof
                                  ↓
                              completion
```

---

# 97. STATE RELATIONSHIP

Pricing/quotation state tidak harus sama dengan order state.

Contoh:

```text
Quotation:
ACCEPTED

Order:
PENDING_PAYMENT

Payment:
PENDING
```

Contoh lain:

```text
Quotation:
ACCEPTED

Order:
ACTIVE

Payment:
PAID

Execution:
IN_PROGRESS
```

Ini menunjukkan kenapa status harus dipisahkan.

---

# 98. FINAL BUSINESS RULES

## Rule 1
Provider dapat mengonfigurasi pricing capability pada service offering.

## Rule 2
Servio mengontrol master pricing capabilities dan compatibility rules.

## Rule 3
Fixed price harus transparan kepada customer.

## Rule 4
Estimated price harus diberi label sebagai estimasi.

## Rule 5
Quotation menjadi sumber harga resmi ketika quotation-based.

## Rule 6
Quotation memiliki versioning.

## Rule 7
Quotation dapat expired.

## Rule 8
Negotiation dapat dilakukan melalui communication.

## Rule 9
Hasil negotiation harus dituangkan ke quotation/revision.

## Rule 10
Harga final menjadi locked setelah customer approval.

## Rule 11
Additional cost membutuhkan customer approval.

## Rule 12
Survey dapat Free atau Paid sesuai provider.

## Rule 13
Survey Fee hanya ditagihkan apabila survey telah dilakukan dan customer tidak melanjutkan main service, sesuai rule yang ditetapkan.

## Rule 14
Jika customer melanjutkan main Order, survey tidak menjadi biaya terpisah pada main transaction.

## Rule 15
Survey fee nominal ditentukan provider jika mode Paid.

## Rule 16
Customer diberi informasi survey fee sebelum booking/inspection flow menjadi mengikat sesuai policy.

## Rule 17
Chat bukan source of truth harga.

## Rule 18
Chat bukan source of truth payment.

## Rule 19
Chat bukan source of truth status.

## Rule 20
Proof of Service bukan sekadar attachment chat.

## Rule 21
Communication memiliki context booking/order.

## Rule 22
Notification berbeda dari chat.

## Rule 23
Conversation dapat tetap diakses setelah completion sesuai retention policy.

## Rule 24
Dispute/warranty dapat membuat communication thread tersendiri.

## Rule 25
Admin intervention harus memiliki audit trail.

---

# 99. FINAL END-TO-END FLOW

```text
                         DISCOVERY
                             ↓
                    SERVICE OFFERING
                             ↓
                    PROVIDER CONFIG
                             ↓
                       BOOKING
                             ↓
                    PRICING CHECK
                             ↓
              ┌──────────────┼──────────────┐
              │              │              │
           FIXED         ESTIMATED      INSPECTION
              │              │              │
              │              │           SURVEY
              │              │              ↓
              │              │          QUOTATION
              │              │              ↓
              │              └────── NEGOTIATION
              │                             ↓
              └──────────────────── FINAL PRICE
                                            ↓
                                   CUSTOMER APPROVAL
                                            ↓
                                       PRICE LOCK
                                            ↓
                                          ORDER
                                            ↓
                                         PAYMENT
                                            ↓
                                       EXECUTION
                                            ↓
                                       TRACKING
                                            ↓
                                         PROOF
                                            ↓
                                      COMPLETION
                                            ↓
                              REVIEW / DISPUTE / WARRANTY
```

Communication menjadi layer transversal:

```text
Pre-Booking
    ↕
Booking
    ↕
Survey
    ↕
Quotation
    ↕
Negotiation
    ↕
Order
    ↕
Execution
    ↕
Completion
    ↕
Dispute / Warranty
```

---

# 100. FINAL LOCKED DECISIONS

1. Pricing dan Quotation merupakan domain terpisah tetapi saling terhubung.
2. Provider mengatur pricing capability pada service offering.
3. Servio mengontrol master pricing capability dan compatibility.
4. Fixed Price tersedia untuk service yang memang mendukung.
5. Estimated Price digunakan ketika harga belum pasti.
6. Quotation digunakan untuk harga yang harus ditentukan setelah review/survey/scope.
7. Negotiation dapat dilakukan melalui chat.
8. Hasil negotiation dituangkan ke quotation revision.
9. Quotation memiliki versioning.
10. Quotation memiliki expiration.
11. Customer dapat accept/reject/request revision.
12. Provider dapat create/send/revise/withdraw/extend/cancel quotation.
13. Multiple provider quotation dapat digunakan untuk custom/project.
14. Customer dapat membandingkan proposal berdasarkan data.
15. Customer tetap menjadi pengambil keputusan.
16. Price Lock terjadi setelah final quotation diterima.
17. Additional Cost membutuhkan approval customer.
18. Survey dapat Not Required.
19. Survey dapat Free.
20. Survey dapat Paid.
21. Jika Paid, nominal ditentukan provider.
22. Survey fee diberitahukan kepada customer.
23. Survey fee bukan biaya main service.
24. Survey fee hanya ditagihkan setelah survey dilakukan dan customer tidak melanjutkan main service.
25. Jika customer melanjutkan Order utama, survey tidak menjadi biaya terpisah pada main transaction.
26. Jika customer reject/cancel setelah survey dan fee = Paid, survey fee tetap menjadi biaya survey.
27. Jika customer reject/cancel setelah survey dan fee = Free, tidak ada biaya survey.
28. Jika survey belum dilakukan, tidak boleh dianggap sebagai completed survey fee.
29. Chat bukan source of truth transaksi.
30. Communication terhubung ke booking/order.
31. Pre-booking chat dapat tersedia sesuai provider/platform policy.
32. Booking chat tersedia selama booking aktif sesuai policy.
33. Quotation chat mendukung clarification dan negotiation.
34. Order chat mendukung coordination.
35. Call dapat tersedia untuk service yang relevan.
36. Attachment dapat berupa image/video/document.
37. Attachment chat berbeda dari Proof of Service.
38. System message berasal dari event.
39. Notification berbeda dari chat.
40. Conversation memiliki lifecycle.
41. Dispute memiliki communication context.
42. Warranty memiliki communication context.
43. Admin dapat melakukan support/intervention sesuai permission.
44. Communication memiliki access control.
45. Pricing memiliki analytics.
46. Communication memiliki analytics.
47. Smart dapat membantu pricing/quotation.
48. Smart dapat membantu communication summarization.
49. Smart tidak mengambil keputusan final customer/provider.
50. Payment & Protection menjadi domain berikutnya yang mengonsumsi hasil pricing, quotation, dan order.

---

# 101. HANDOFF KE FITUR BERIKUTNYA

Setelah Pricing, Quotation, dan Communication selesai, alur berikutnya adalah:

```text
FINAL PRICE
    ↓
AGREEMENT
    ↓
ORDER
    ↓
PAYMENT & PROTECTION
    ↓
PAYMENT PROCESS
    ↓
ESCROW / PAYOUT
    ↓
REFUND
    ↓
CANCELLATION FINANCIAL IMPACT
    ↓
CONSUMER PROTECTION
    ↓
WARRANTY / SERVICE PROTECTION
```

Domain Payment & Protection harus menggunakan data yang telah dibentuk oleh:

```text
Booking
+
Pricing
+
Quotation
+
Order
+
Communication
```

sebagai dasar transaksi.
