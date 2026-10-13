# SERVIO — BOOKING & ORDER JASA
## Master Feature, Business Flow, Business Rules, Status, Data, Tracking, dan Matrix

> **Status dokumen:** Final Concept / Master Specification  
> **Scope:** Booking & Order untuk layanan/jasa Servio  
> **Cakupan:** Discovery → Booking → Agreement → Order → Payment → Execution → Tracking → Proof → Completion → Review/Warranty/History  
> **Catatan:** Dokumen ini menjadi acuan konseptual untuk PRD, database, API, frontend, backend, dan business rules.

---

# 1. TUJUAN DOKUMEN

Dokumen ini mendefinisikan sistem **Booking dan Order Jasa Servio** secara menyeluruh.

Fokus utamanya adalah memastikan:

- Booking dan Order merupakan dua objek bisnis yang berbeda.
- Provider memiliki kontrol terhadap cara sebuah service offering dapat dibooking.
- Servio tetap mengontrol master jenis booking dan aturan kompatibilitasnya.
- Customer memperoleh form booking yang dinamis sesuai konfigurasi service provider.
- Smart system membantu customer dan provider tanpa mengambil alih keputusan final.
- Order menjadi pusat transaksi dan pelaksanaan layanan.
- Tracking tidak hanya berarti GPS, tetapi juga visibility terhadap progres layanan.
- Survey/Inspection dapat gratis atau berbayar sesuai konfigurasi provider.
- Semua perubahan penting memiliki history/audit trail.
- Setiap tipe jasa/order dapat menggunakan flow yang berbeda sesuai karakter layanannya.

---

# 2. KONSEP FUNDAMENTAL

## 2.1 Discovery

**Discovery** adalah proses customer menemukan service, provider, atau solusi terhadap masalah yang dimiliki.

Discovery dapat berasal dari:

- Search
- Category
- Subcategory
- Service Detail
- Provider Profile
- Smart Discovery
- Favorite
- Rebooking
- Recommendation

Output Discovery:

> Customer menemukan service offering yang ingin digunakan.

---

## 2.2 Booking

**Booking = permintaan atau reservasi layanan dari customer kepada provider/Servio untuk mendapatkan layanan pada kondisi tertentu.**

Booking dapat berisi:

- service
- provider
- booking type
- location
- schedule
- requirement
- photo/video
- customer preference
- pricing information
- kebutuhan survey/inspection

Booking **belum selalu menjadi transaksi final**.

---

## 2.3 Order

**Order = transaksi layanan yang sudah memiliki kesepakatan komersial dan operasional yang cukup untuk dijalankan.**

Order menangani:

- payment
- schedule
- provider
- service execution
- tracking
- progress
- proof
- completion
- cancellation
- reschedule
- dispute
- refund
- warranty
- service history

---

## 2.4 Execution

**Execution = tahap ketika provider benar-benar menjalankan layanan.**

Contohnya:

- provider preparing
- provider on the way
- arrival
- check-in
- service started
- service in progress
- pause/resume
- additional requirement
- completion submission

---

## 2.5 Completion

**Completion = tahap ketika provider menyatakan layanan selesai, bukti pekerjaan tersedia, dan customer melakukan konfirmasi sesuai policy.**

---

# 3. RELASI UTAMA

```text
DISCOVERY
    ↓
SERVICE / PROVIDER SERVICE
    ↓
SERVICE OFFERING CONFIGURATION
    ↓
BOOKING
    ↓
PROVIDER PROCESSING / AGREEMENT
    ↓
ORDER
    ↓
PAYMENT
    ↓
EXECUTION
    ↓
TRACKING
    ↓
PROOF OF SERVICE
    ↓
COMPLETION
    ↓
CUSTOMER CONFIRMATION
    ↓
REVIEW / WARRANTY / SERVICE HISTORY
```

Konsep ringkas:

```text
Discovery = mencari
Booking = meminta / reservasi
Order = transaksi
Execution = menjalankan
Completion = menyelesaikan
```

---

# 4. PRINSIP BOOKING ≠ ORDER

## Booking

Pertanyaan utamanya:

> "Saya ingin menggunakan jasa ini."

## Order

Pertanyaan utamanya:

> "Jasa ini sudah disepakati dan akan dijalankan."

Contoh:

```text
Customer:
"Saya ingin AC saya diperbaiki besok."

        ↓

BOOKING

        ↓

Provider melakukan review/acceptance

        ↓

Jika perlu:
Inspection → Quotation → Agreement

        ↓

ORDER

        ↓

Payment → Execution
```

---

# 5. ATURAN PEMBENTUKAN ORDER

Order tidak selalu dibuat tepat pada saat booking submitted.

## 5.1 Fixed Price / Direct Service

```text
Booking
↓
Provider Accepted
↓
Order Created
```

## 5.2 Quotation

```text
Booking
↓
Provider Accepted
↓
Inspection
↓
Quotation
↓
Customer Accept
↓
Order Created
```

## 5.3 Project

```text
Booking / Project Request
↓
Survey
↓
Scope
↓
Proposal
↓
Quotation / Negotiation
↓
Agreement
↓
Order Created
```

## 5.4 Emergency

```text
Emergency Request
↓
Provider Matched
↓
Provider Accept
↓
Order Created
↓
Payment / Payment Authorization
↓
Execution
```

---

# 6. GOVERNANCE BOOKING TYPE

## 6.1 Master Booking Type Dikontrol Servio

Servio memiliki master:

1. Instant
2. Scheduled
3. Emergency
4. Recurring
5. Inspection
6. Project
7. Custom Request

Provider **tidak membuat jenis booking baru secara bebas**.

---

## 6.2 Provider Memilih Booking Type yang Didukung

Provider memilih dari master yang telah disediakan Servio.

Contoh:

```text
Service: AC Repair
Provider A

Booking Type:
✓ Instant
✓ Scheduled
✓ Emergency
✓ Inspection
```

Provider B:

```text
Service: AC Repair
Provider B

Booking Type:
✓ Scheduled
✓ Inspection
```

Customer hanya melihat opsi yang tersedia dari service offering provider tersebut.

---

## 6.3 Compatibility Rule

Servio tetap mengatur apakah sebuah service boleh menggunakan booking type tertentu.

Contoh:

```text
AC Repair:
✓ Instant
✓ Scheduled
✓ Emergency
✓ Inspection
✗ Project
```

Provider hanya dapat memilih dari opsi yang valid.

---

# 7. SERVICE OFFERING

Service offering adalah penawaran service milik provider yang memiliki konfigurasi bisnis sendiri.

Struktur:

```text
Category
    ↓
Subcategory
    ↓
Service
    ↓
Provider
    ↓
Provider Service Offering
```

Contoh:

```text
Repair & Technical
    ↓
AC & Cooling
    ↓
AC Repair
    ↓
Provider A
    ↓
AC Repair - Provider A
```

Konfigurasi provider:

```text
Booking:
Instant
Scheduled
Emergency
Inspection

Service Mode:
Home Service

Pricing:
Estimated
Quotation

Survey:
Paid
Rp50.000
```

---

# 8. BOOKING FORM DINAMIS

Form Booking tidak sama untuk semua service.

Form dibangun dari:

```text
Service Offering
+
Booking Type
+
Provider Configuration
```

Contoh AC Repair:

- Problem Description
- Photo
- Video
- Address
- Schedule
- AC Type
- Brand
- Additional Notes

Contoh Cleaning Sofa:

- Number of Sofa
- Material
- Cleaning Type
- Add-on
- Address
- Schedule

Contoh Renovation:

- Project Description
- Photo
- Reference
- Budget
- Location
- Target Date

---

# 9. 40 POIN BOOKING JASA — FINAL

## B1. Booking dapat berasal dari Discovery

Customer dapat memulai booking dari Search, Category, Service Detail, Provider Profile, Smart Discovery, Favorite, Rebooking, atau Recommendation.

## B2. Booking menyimpan sumber booking

`booking_source` mencatat asal booking.

Contoh:

- SEARCH
- CATEGORY
- SERVICE_DETAIL
- PROVIDER_PROFILE
- SMART_DISCOVERY
- FAVORITE
- REBOOKING
- RECOMMENDATION

## B3. Customer memilih service

Booking mengacu pada service yang dipilih customer.

## B4. Customer dapat memilih provider

Customer dapat memilih provider ketika model bisnis service mendukung pemilihan manual.

## B5. Sistem dapat melakukan provider matching

Servio dapat menentukan provider yang sesuai berdasarkan capability dan availability.

## B6. Provider memiliki service offering

Service yang sama dapat ditawarkan oleh beberapa provider dengan konfigurasi berbeda.

## B7. Jenis booking dipilih provider

Provider menentukan jenis booking yang tersedia pada setiap service offering.

## B8. Servio menyediakan master booking type

Provider memilih dari jenis yang telah ditentukan Servio.

## B9. Jenis booking tidak dibuat bebas oleh provider

Provider tidak membuat nama/type baru secara bebas.

## B10. Availability booking type mengikuti provider configuration

Customer hanya melihat booking type yang tersedia pada service offering tersebut.

## B11. Booking type berbeda dari service mode

Booking type dan cara layanan dilakukan merupakan konsep terpisah.

## B12. Booking type berbeda dari pricing model

Cara booking tidak menentukan satu model harga tertentu secara otomatis.

## B13. Booking dapat menggunakan Normal Flow

Customer yang sudah mengetahui jasa dapat langsung melakukan normal booking.

## B14. Booking dapat menggunakan Smart Flow

Customer yang belum mengetahui jasa dapat menggunakan Smart Booking.

## B15. Smart Booking menerima deskripsi masalah

Customer dapat menjelaskan kondisi atau kerusakan dengan bahasa natural.

## B16. Smart Booking menerima media

Customer dapat mengunggah foto/video untuk membantu pemahaman masalah.

## B17. Smart Booking dapat memberikan pertanyaan lanjutan

Sistem dapat memberikan pertanyaan dinamis berdasarkan masalah.

## B18. Smart Booking memberikan rekomendasi service

Sistem mengklasifikasikan masalah dan merekomendasikan service yang sesuai.

## B19. Smart tidak menjadi diagnosis final

Hasil smart merupakan rekomendasi/classification, bukan diagnosis profesional final.

## B20. Customer tetap memilih

Customer dapat menerima rekomendasi atau mengganti service.

## B21. Location merupakan bagian booking

Untuk service yang membutuhkan lokasi, booking menyimpan alamat dan lokasi.

## B22. Service area divalidasi

Lokasi customer harus berada di area pelayanan provider/service.

## B23. Schedule merupakan bagian booking

Booking dapat menyimpan tanggal, waktu mulai, waktu selesai, dan estimasi durasi sesuai jenis layanan.

## B24. Booking mendukung availability check

Sistem melakukan pengecekan availability provider/service/schedule.

## B25. Booking mendukung provider matching

Matching dapat mempertimbangkan service, skill, location, availability, service mode, schedule, experience, rating, dan capability.

## B26. Booking mendukung customer preference

Customer dapat menyampaikan preferensi yang relevan dengan service.

## B27. Booking mendukung attachment

Customer dapat mengirim photo, video, atau dokumen yang relevan.

## B28. Booking mendukung price information

Booking dapat menampilkan fixed price, estimated price, inspection fee, atau informasi bahwa quotation diperlukan.

## B29. Booking mendukung survey/inspection

Beberapa service dapat membutuhkan survey sebelum harga atau pekerjaan ditentukan.

## B30. Survey/inspection dapat gratis

Provider dapat menetapkan survey sebagai Free.

## B31. Survey/inspection dapat berbayar

Provider dapat menetapkan survey sebagai Paid dan menentukan nominal.

## B32. Survey fee ditampilkan kepada customer

Nominal survey fee harus diketahui customer sebelum booking dikonfirmasi.

## B33. Survey fee terpisah dari harga jasa utama

Survey fee bukan otomatis bagian dari main service price.

## B34. Booking dapat diproses provider

Provider menerima informasi kebutuhan, schedule, lokasi, dan detail customer.

## B35. Provider dapat Accept

Provider dapat menerima booking.

## B36. Provider dapat Reject

Provider dapat menolak booking dengan alasan yang sesuai.

## B37. Provider dapat Request Revision

Provider dapat meminta perubahan pada jadwal, scope, atau data booking.

## B38. Booking memiliki expiration

Booking yang menunggu response dapat berakhir apabila melewati batas waktu.

## B39. Booking memiliki status history

Perubahan status booking harus dicatat.

## B40. Booking dapat dikonversi menjadi Order

Booking menjadi `CONVERTED` setelah proses booking/agreement selesai dan transaksi siap dijalankan.

---

# 10. ENTRY POINT BOOKING

```text
Search
    ↓
Service Detail
    ↓
Book

Category
    ↓
Service
    ↓
Book

Provider Profile
    ↓
Provider Service
    ↓
Book

Smart Discovery
    ↓
Recommended Service
    ↓
Book

Favorite
    ↓
Book Again

Rebooking
    ↓
Previous Service
    ↓
Book Again

Recommendation
    ↓
Service
    ↓
Book
```

---

# 11. BOOKING FLOW NORMAL

```text
Discovery
↓
Select Service
↓
Select Provider / Matching
↓
Select Supported Booking Type
↓
Dynamic Booking Form
↓
Requirement
↓
Location
↓
Schedule
↓
Customer Preference
↓
Availability Check
↓
Price / Quotation Information
↓
Booking Summary
↓
Submit Booking
↓
Validation
↓
Provider Processing
```

---

# 12. BOOKING FLOW SMART

```text
Problem
↓
Problem Description
↓
Photo / Video
↓
Smart Questions
↓
Problem Classification
↓
Recommended Service
↓
Provider Service Availability
↓
Recommended Provider
↓
Recommended Booking Type
↓
Dynamic Booking Form
↓
Booking Summary
↓
Submit Booking
```

Smart flow harus mengurangi friction, bukan menambah langkah tanpa kebutuhan.

---

# 13. BOOKING STATUS

## 13.1 Status Core

```text
DRAFT
SUBMITTED
VALIDATING
PENDING_PROVIDER
REVISION_REQUIRED
RESCHEDULE_REQUESTED
ACCEPTED
REJECTED
EXPIRED
CANCELLED
CONVERTED
CLOSED
```

## 13.2 Master Flow

```text
DRAFT
 ↓
SUBMITTED
 ↓
VALIDATING
 ↓
PENDING_PROVIDER
 ↓
ACCEPTED
 ↓
CONVERTED
```

## 13.3 Branch

```text
PENDING_PROVIDER
├── ACCEPTED
├── REVISION_REQUIRED
├── REJECTED
├── EXPIRED
└── CANCELLED
```

---

# 14. BOOKING DATA

## 14.1 Core

```text
booking_id
booking_number
customer_id
provider_id
provider_service_id
service_id
booking_type
booking_source
booking_status
```

## 14.2 Service

```text
category_id
subcategory_id
service_mode
service_variant_id
```

## 14.3 Requirement

```text
problem_description
customer_notes
additional_request
customer_preference
```

## 14.4 Media

```text
photo_urls
video_urls
attachment_urls
```

## 14.5 Location

```text
address_id
latitude
longitude
location_note
```

## 14.6 Schedule

```text
requested_date
requested_start_time
requested_end_time
estimated_duration
timezone
```

## 14.7 Pricing

```text
pricing_type
estimated_min_price
estimated_max_price
inspection_required
inspection_fee_type
inspection_fee_amount
```

## 14.8 Provider Response

```text
provider_response
provider_note
provider_proposed_date
provider_proposed_start_time
provider_proposed_end_time
provider_response_at
```

## 14.9 Expiration

```text
expires_at
expired_at
```

## 14.10 Cancellation

```text
cancelled_by
cancellation_reason
cancelled_at
```

## 14.11 Audit

```text
created_at
updated_at
submitted_at
accepted_at
converted_at
```

---

# 15. BOOKING HISTORY

Entity:

```text
booking_status_history
```

Data minimal:

```text
id
booking_id
status
actor_type
actor_id
note
created_at
```

Contoh:

```text
09:00  Draft
09:05  Submitted
09:05  Validating
09:06  Pending Provider
09:12  Accepted
09:12  Converted
```

---

# 16. ORDER JASA

Order menjadi objek transaksi setelah agreement tercapai.

```text
Booking
↓
Agreement
↓
Order
```

---

# 17. 54 POIN ORDER JASA — FINAL

## O1. Order memiliki identitas sendiri

Order memiliki `order_id` dan `order_number`.

## O2. Order menyimpan hubungan ke Booking

`booking_id` menjadi referensi asal transaksi.

## O3. Booking dan Order bukan objek yang sama

Keduanya memiliki lifecycle berbeda.

## O4. Order dibuat setelah agreement yang sesuai

Tidak semua booking langsung menghasilkan order.

## O5. Fixed-price dapat langsung membuat Order setelah acceptance

Booking Accepted → Order Created.

## O6. Quotation service membuat Order setelah quotation diterima

Booking → Inspection → Quotation → Accept → Order.

## O7. Project dapat membuat Order setelah scope/agreement selesai

Booking → Survey → Scope → Proposal → Agreement → Order.

## O8. Emergency dapat membuat Order lebih cepat

Provider matching → accept → order.

## O9. Order menjadi pusat transaksi

Order menjadi referensi utama transaksi layanan.

## O10. Order memiliki payment lifecycle

Payment memiliki status tersendiri.

## O11. Payment dapat dilakukan sebelum execution

Tergantung pricing dan business policy.

## O12. Payment dapat mendukung escrow

Untuk layanan yang memerlukan perlindungan pembayaran.

## O13. Payout dapat dilakukan setelah completion

Untuk model yang menggunakan escrow/payout release.

## O14. Order memiliki order status

Status utama order tidak dicampur dengan semua status detail lainnya.

## O15. Payment status dipisahkan

Payment status memiliki lifecycle sendiri.

## O16. Execution status dipisahkan

Progress pengerjaan memiliki lifecycle sendiri.

## O17. Tracking status dipisahkan

Tracking perjalanan/status memiliki lifecycle sendiri.

## O18. Action Required dipisahkan

Customer/provider dapat diminta melakukan tindakan tertentu tanpa membuat status order yang tidak perlu.

## O19. Order dapat masuk Preparing

Provider mempersiapkan pengerjaan.

## O20. Order dapat masuk On The Way

Untuk service yang membutuhkan perjalanan.

## O21. Order dapat menggunakan live tracking

Untuk home/mobile/emergency service yang relevan.

## O22. Order memiliki ETA

Customer dapat melihat estimasi kedatangan bila tracking tersedia.

## O23. Tracking mencatat location

Location tracking dapat menyimpan koordinat dan timestamp sesuai kebutuhan.

## O24. Tracking tidak selalu berarti GPS

Workshop, remote, dan project menggunakan progress/status tracking yang sesuai.

## O25. Order memiliki Arrival event

Provider menandai telah sampai.

## O26. Order mendukung Check-in

Untuk service yang relevan.

## O27. Check-in dapat menyimpan lokasi

Check-in dapat mencatat waktu dan lokasi aktual.

## O28. Order mendukung Before Documentation

Provider dapat mengunggah kondisi awal.

## O29. Order memiliki Service Started event

Provider menandai pengerjaan dimulai.

## O30. Order memiliki In Progress

Status menunjukkan service sedang berjalan.

## O31. Order mendukung Pause

Pengerjaan dapat dihentikan sementara.

## O32. Order mendukung Resume

Pengerjaan dapat dilanjutkan setelah pause.

## O33. Pause memiliki reason

Contoh:

- waiting material
- waiting customer
- waiting approval
- technical issue
- weather
- other

## O34. Order mendukung Additional Requirement

Provider dapat mengajukan perubahan kebutuhan setelah inspeksi/pengerjaan.

## O35. Additional Cost membutuhkan customer approval

Provider tidak boleh mengubah biaya secara sepihak.

## O36. Material dapat menjadi bagian order

Material dapat dicatat sebagai item/material yang digunakan.

## O37. Order mendukung Completion Submission

Provider mengirimkan hasil pekerjaan.

## O38. Completion memiliki Proof of Service

Proof dapat berupa photo, video, checklist, report, dan dokumen.

## O39. Provider dapat membuat Service Report

Ringkasan pekerjaan dapat disimpan.

## O40. Customer melakukan Completion Review

Customer memeriksa hasil pekerjaan.

## O41. Customer dapat Confirm Completion

Customer menyetujui penyelesaian.

## O42. Customer dapat Report Issue

Customer dapat menolak completion dan membuat issue/dispute.

## O43. Order dapat menjadi Disputed

Dispute memiliki lifecycle terpisah.

## O44. Order mendukung Cancellation

Customer/provider/system/admin dapat membatalkan sesuai policy.

## O45. Cancellation menggunakan policy

Biaya/refund ditentukan berdasarkan kondisi order dan policy.

## O46. Order mendukung Reschedule

Customer/provider dapat meminta perubahan jadwal.

## O47. Order mendukung No-Show

Provider dan customer sama-sama dapat memiliki no-show scenario.

## O48. Provider dapat Cancel

System dapat mencari alternatif provider jika bisnis mendukung.

## O49. Order mendukung Refund

Refund dapat full, partial, atau no refund sesuai policy.

## O50. Order dapat memiliki Warranty

Service yang memiliki garansi dapat membuat warranty record.

## O51. Warranty dapat memiliki Claim

Customer dapat mengajukan claim dalam periode warranty.

## O52. Order menghasilkan Service History

Order yang selesai menjadi histori service customer.

## O53. Recurring menggunakan Order per occurrence

Recurring Booking tidak menjadi satu order tanpa batas.

## O54. Order dapat terhubung ke Asset/Maintenance

Service yang relevan dapat memperbarui asset history dan jadwal maintenance.

---

# 18. ORDER STATUS

## 18.1 Order Status

```text
CREATED
PENDING_PAYMENT
CONFIRMED
ACTIVE
COMPLETION_REVIEW
COMPLETED
CANCELLED
DISPUTED
FAILED
EXPIRED
```

## 18.2 Payment Status

```text
PENDING
PROCESSING
PAID
FAILED
EXPIRED
REFUND_PENDING
PARTIALLY_REFUNDED
REFUNDED
```

## 18.3 Execution Status

```text
NOT_STARTED
PREPARING
STARTED
IN_PROGRESS
PAUSED
COMPLETION_SUBMITTED
COMPLETED
```

## 18.4 Tracking Status

```text
NOT_STARTED
ON_THE_WAY
ARRIVED
ENDED
```

## 18.5 Action Status

```text
NONE
ACTION_REQUIRED
```

---

# 19. ORDER MASTER FLOW

```text
ORDER CREATED
      ↓
PAYMENT PENDING
      ↓
PAYMENT CONFIRMED
      ↓
ORDER CONFIRMED
      ↓
PREPARING
      ↓
ON THE WAY
      ↓
ARRIVED
      ↓
CHECK-IN
      ↓
SERVICE STARTED
      ↓
SERVICE IN PROGRESS
      ↓
COMPLETION SUBMITTED
      ↓
CUSTOMER REVIEW
      ↓
CUSTOMER CONFIRMED
      ↓
COMPLETED
```

---

# 20. ORDER BRANCH FLOW

## 20.1 Additional Requirement

```text
IN_PROGRESS
↓
Additional Requirement
↓
Customer Approval
├── ACCEPT
│    ↓
│  Continue
│
└── REJECT
     ↓
  Stop / Original Scope / Resolution
```

## 20.2 Pause

```text
IN_PROGRESS
↓
PAUSED
↓
RESUMED
↓
IN_PROGRESS
```

## 20.3 Dispute

```text
COMPLETION_SUBMITTED
↓
Customer Report Issue
↓
DISPUTED
↓
Resolution
```

## 20.4 Cancellation

```text
ACTIVE
↓
Cancel Request
↓
Policy Check
↓
Refund Decision
↓
CANCELLED
```

---

# 21. PAYMENT FLOW

## Fixed Price

```text
Order Created
↓
Payment Pending
↓
Customer Pay
↓
Payment Confirmed
```

## Quotation

```text
Inspection
↓
Quotation
↓
Customer Accept
↓
Order
↓
Payment
```

## Project

```text
Order
↓
Initial Payment
↓
Milestone 1
↓
Milestone Payment
↓
Milestone 2
↓
...
↓
Final Payment
```

## Emergency

Payment dapat mengikuti policy service/provider, misalnya:

```text
Provider Accept
↓
Payment / Authorization
↓
Execution
```

atau model pembayaran lain yang ditentukan platform/provider.

---

# 22. ESCROW / PAYOUT

Untuk transaksi tertentu:

```text
Customer
↓
Payment
↓
Servio / Escrow
↓
Service Execution
↓
Completion
↓
Customer Confirmation
↓
Payout Provider
```

Model payout harus mengikuti jenis layanan dan payment policy.

---

# 23. TRACKING ORDER

Tracking dibagi menjadi dua fase.

## Fase 1 — Trip Tracking

```text
Preparing
↓
On The Way
↓
Live Location
↓
ETA
↓
Arrived
```

## Fase 2 — Service Progress

```text
Arrived
↓
Check-in
↓
Service Started
↓
In Progress
↓
Completion
```

Dengan demikian tracking tidak berhenti pada GPS.

---

# 24. CUSTOMER TRACKING SCREEN

Contoh struktur:

```text
SERVICE TRACKING

AC Repair

Provider
- Name
- Profile Photo
- Rating
- Verification

Current Status
On The Way

ETA
12 minutes

Distance
2.3 km

Map
- Customer location
- Provider location

Timeline
- Order Confirmed
- Preparing
- On The Way
- Arrived
- Service Started
- Completed

Actions
- Chat
- Call
- Share Tracking
- Help / Report Issue
```

---

# 25. SHARE TRACKING

Customer dapat membagikan tracking secara aman.

Data konseptual:

```text
tracking_token
expiration
access_scope
```

Link share tidak boleh memberikan seluruh data customer.

---

# 26. TRACKING DATA

Untuk perjalanan:

```text
tracking_session_id
order_id
provider_id
latitude
longitude
timestamp
speed
heading
eta
distance
```

Untuk status:

```text
tracking_status
status_changed_at
actor_id
```

Lokasi detail dapat menggunakan retention policy sesuai kebutuhan sistem.

---

# 27. ARRIVAL & CHECK-IN

Provider:

```text
ON_THE_WAY
↓
ARRIVED
↓
CHECK-IN
```

Data:

```text
arrived_at
arrival_latitude
arrival_longitude
check_in_time
check_in_latitude
check_in_longitude
check_in_method
```

Metode check-in dapat berupa:

- GPS
- QR
- customer confirmation
- manual

sesuai kebutuhan service.

---

# 28. BEFORE SERVICE

Sebelum pengerjaan:

```text
Initial Condition
Inspection
Before Photo
Before Video
Checklist
```

Tujuannya:

- mendokumentasikan kondisi awal
- mengurangi dispute
- membandingkan kondisi sebelum dan sesudah
- menjadi bagian proof of service

---

# 29. SERVICE EXECUTION

```text
Arrived
↓
Check-in
↓
Before Documentation
↓
Start Service
↓
In Progress
↓
Progress Update
↓
Additional Requirement jika ada
↓
Complete
```

---

# 30. PROGRESS UPDATE

Provider dapat memberikan:

- status
- catatan
- foto
- checklist
- material yang dipakai
- progress percentage untuk project
- milestone completion

Untuk project:

```text
Milestone 1
↓
Progress
↓
Inspection
↓
Approval
↓
Milestone 2
```

---

# 31. ADDITIONAL COST

Jika terjadi kebutuhan baru:

```text
Problem Found
↓
Additional Requirement
↓
Provider Create Adjustment
↓
Customer Review
├── Accept
└── Reject
```

Adjustment dapat berisi:

```text
description
quantity
material
labor
additional_fee
new_total
reason
```

Customer harus diberi kesempatan menyetujui sebelum biaya tambahan menjadi transaksi yang disepakati.

---

# 32. PROOF OF SERVICE

Bentuk proof:

```text
Before Photo
During Photo
After Photo
Video
Checklist
Inspection Report
Service Report
Material Used
Document / Attachment
```

Proof dapat disesuaikan dengan kebutuhan service.

---

# 33. SERVICE COMPLETION

Provider:

```text
IN_PROGRESS
↓
COMPLETION_SUBMITTED
```

Payload completion dapat berisi:

```text
work_summary
after_photos
after_videos
used_materials
final_cost
warranty_information
service_report
provider_notes
```

---

# 34. CUSTOMER COMPLETION REVIEW

Customer melihat:

```text
Service
Provider
Before
After
Work Summary
Materials
Final Price
Warranty
```

Customer:

```text
Confirm Completion
```

atau:

```text
Report Issue
```

---

# 35. AUTO COMPLETION

Secara konseptual sistem dapat memiliki:

```text
Completion Submitted
↓
Customer Review Window
↓
No Response
↓
Auto Completion
```

Namun auto-completion harus menjadi business policy dan tidak harus berlaku untuk semua service.

Layanan tertentu dapat membutuhkan konfirmasi manual.

---

# 36. CANCELLATION

Cancellation memiliki actor:

```text
CUSTOMER
PROVIDER
SYSTEM
ADMIN
```

Data:

```text
cancelled_by_type
cancelled_by_id
cancellation_reason
cancelled_at
```

Cancellation result dapat berupa:

```text
Full Refund
Partial Refund
No Refund
No Payment Required
```

sesuai policy.

---

# 37. CANCELLATION POLICY

Policy mempertimbangkan:

```text
order_status
payment_status
execution_status
time_before_service
actor
service_type
provider_policy
platform_policy
```

Contoh:

```text
Sebelum provider mulai perjalanan:
→ policy A

Saat provider sudah on the way:
→ policy B

Saat provider sudah tiba:
→ policy C

Saat service sudah berjalan:
→ policy D
```

Detail nominal/persentase refund merupakan business policy tersendiri.

---

# 38. RESCHEDULE

```text
Order
↓
Reschedule Request
↓
New Date
↓
New Time
↓
Availability Check
↓
Provider Accept
↓
Schedule Updated
```

Data history:

```text
old_date
old_time
new_date
new_time
requested_by
reason
approved_by
approved_at
created_at
```

---

# 39. NO-SHOW

## Provider No-Show

```text
Scheduled
↓
Provider Tidak Datang
↓
Customer Report
↓
Verification
↓
Resolution
```

## Customer No-Show

```text
Provider Arrived
↓
Waiting Period
↓
Customer No-Show
↓
Policy
```

Policy dapat menghasilkan:

- reschedule
- cancellation
- waiting fee
- partial charge
- refund

sesuai ketentuan service/platform.

---

# 40. PROVIDER CANCEL

```text
Provider Cancel
↓
System Check
↓
Alternative Provider?
├── Replace Provider
├── Reschedule
└── Cancel + Refund
```

Semua perubahan dicatat di history.

---

# 41. DISPUTE

Jika customer tidak menerima hasil:

```text
Completion Submitted
↓
Report Issue
↓
Disputed
↓
Provider Response
↓
Admin / Resolution
```

Issue category dapat berupa:

```text
WORK_NOT_COMPLETED
RESULT_NOT_AS_EXPECTED
DAMAGE
WRONG_SERVICE
ADDITIONAL_CHARGE_DISPUTE
PROVIDER_ISSUE
OTHER
```

---

# 42. DISPUTE EVIDENCE

System dapat menyediakan:

```text
Customer Evidence
Provider Evidence
Before Photos
After Photos
Service Report
Status History
Tracking History
Payment Record
Quotation
Adjustment
Chat / Notes sesuai policy
```

---

# 43. REFUND

Refund record:

```text
refund_id
order_id
payment_id
amount
refund_type
reason
status
processed_at
```

Refund type:

```text
FULL
PARTIAL
NONE
```

---

# 44. WARRANTY

Service yang mendukung warranty:

```text
Order Completed
↓
Warranty Created
```

Data:

```text
warranty_id
order_id
warranty_start
warranty_end
coverage
terms
status
```

---

# 45. WARRANTY CLAIM

```text
Warranty Active
↓
Customer Claim
↓
Provider Review
↓
Resolution
├── Re-Service
├── Repair
└── Other Resolution
```

---

# 46. SERVICE HISTORY

Order completed menghasilkan histori service.

Contoh:

```text
AC Repair
20 September 2026

Provider:
Budi Teknik

Problem:
AC tidak dingin

Work:
Repair cooling system

Cost:
Rp350.000

Warranty:
30 days
```

---

# 47. ASSET INTEGRATION

Untuk service yang berkaitan dengan asset:

```text
Order Completed
↓
Asset Updated
↓
Service History Updated
↓
Warranty Updated
↓
Maintenance Schedule
```

Asset dapat berupa:

- AC
- refrigerator
- washing machine
- vehicle
- equipment
- property component

---

# 48. RECURRING ORDER

Recurring menggunakan pola:

```text
Recurring Booking
↓
Occurrence
↓
Order
```

Contoh:

```text
Recurring Cleaning
├── 01 Sep → Order A
├── 08 Sep → Order B
├── 15 Sep → Order C
└── 22 Sep → Order D
```

Setiap occurrence memiliki tracking, payment, completion, dan history sendiri.

---

# 49. PROJECT ORDER

Project menggunakan:

```text
Project Order
├── Milestone 1
├── Milestone 2
├── Milestone 3
└── Final Completion
```

Setiap milestone dapat memiliki:

- scope
- progress
- proof
- inspection
- approval
- payment

---

# 50. CUSTOM REQUEST ORDER

```text
Custom Request
↓
Provider Response
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

Custom Request dapat menghasilkan order setelah scope cukup jelas.

---

# 51. ONE ORDER RULE

Aturan fase awal:

```text
1 Order
=
1 Customer
+
1 Provider
+
1 Provider Service Offering
+
1 Service Execution
```

Jika customer menggunakan provider berbeda:

```text
Order A → Provider A
Order B → Provider B
```

Bukan satu order campuran.

---

# 52. ADD-ON

Jika provider sama:

```text
Order
├── Main Service
├── Add-on
├── Add-on
└── Material
```

Semua tetap dapat berada di dalam satu order.

Entity yang disarankan:

```text
order_items
```

---

# 53. ADMIN / OPERATIONS

Admin dapat:

- monitoring order
- monitoring booking
- melihat tracking
- menangani provider issue
- menangani customer issue
- menangani cancellation
- menangani refund
- menangani dispute
- menangani warranty
- melakukan intervensi sesuai permission

Setiap intervensi harus tercatat.

---

# 54. CUSTOMER FLOW

```text
My Orders
↓
Order Detail
↓
Payment
↓
Order Status
↓
Tracking
↓
Provider Arrives
↓
Service Progress
↓
Proof
↓
Completion
↓
Confirm
↓
Review
↓
Service History
```

---

# 55. PROVIDER FLOW

```text
My Jobs
↓
Order Detail
↓
Review Requirement
↓
Prepare
↓
Start Trip
↓
Tracking
↓
Arrive
↓
Check-in
↓
Before Proof
↓
Start Service
↓
Execute
↓
Progress Update
↓
Additional Approval if needed
↓
Complete
↓
After Proof
↓
Service Report
↓
Submit Completion
```

---

# 56. SMART SYSTEM DI BOOKING & ORDER

Smart system berfungsi sebagai assistant layer.

## Booking

- Problem Classification
- Service Recommendation
- Booking Type Recommendation
- Provider Matching
- Schedule Recommendation
- Price Estimation

## Order

- Delay Detection
- Material Recommendation
- Additional Requirement Assistance
- Maintenance Recommendation
- Next Service Recommendation

Smart tidak:

- membuat diagnosis profesional final
- mengubah harga secara sepihak
- menyetujui biaya tambahan atas nama customer
- menentukan hasil dispute secara otomatis
- mengambil alih keputusan final customer/provider

---

# 57. SMART BOOKING PRINCIPLE

```text
Customer tahu service
↓
Normal Booking
```

```text
Customer tidak tahu service
↓
Smart Discovery / Smart Booking
```

Tidak semua customer dipaksa menggunakan AI.

Smart harus mengurangi friction.

---

# 58. SMART PROVIDER MATCHING

Provider matching dapat mempertimbangkan:

```text
Service
+
Skill
+
Category
+
Subcategory
+
Certification
+
Location
+
Service Area
+
Availability
+
Schedule
+
Service Mode
+
Experience
+
Rating
```

Goal:

> menemukan provider yang cocok, bukan hanya provider yang paling dekat.

---

# 59. MATRIX MASTER BOOKING TYPE

| Booking Type | Tujuan | Survey | Quotation | Tracking | Execution |
|---|---|---:|---:|---:|---:|
| Instant | Layanan secepatnya | Optional | Optional | ✅ jika travel | ✅ |
| Scheduled | Layanan pada waktu tertentu | Optional | Optional | ✅ jika travel | ✅ |
| Emergency | Kondisi darurat | Often | Often | ✅ | ✅ |
| Recurring | Layanan berulang | Optional | Optional | ✅ | ✅ |
| Inspection | Survey sebelum main service | ✅ | ✅ | ✅ jika travel | ✅ |
| Project | Pekerjaan multi-stage | ✅ | ✅ | Progress | Milestone |
| Custom Request | Kebutuhan khusus | Often | ✅ | Depends | ✅ |

---

# 60. MATRIX SERVICE MODE

| Service Mode | GPS | Status Tracking | Proof | Contoh |
|---|---:|---:|---:|---|
| Home Service | ✅ | ✅ | ✅ | AC Repair |
| Mobile Service | ✅ | ✅ | ✅ | Emergency Technician |
| Workshop | Optional | ✅ | ✅ | Motor Repair |
| Remote / Online | ❌ | ✅ | ✅ | Technical Consultation |
| On-Site | ✅ jika travel | ✅ | ✅ | Building Inspection |
| Pickup & Return | ✅ | ✅ | ✅ | Object Cleaning |

---

# 61. MATRIX PRICING

| Pricing Model | Kegunaan |
|---|---|
| Fixed Price | Harga sudah ditentukan |
| Estimated Price | Harga perkiraan/range |
| Quotation | Harga dibuat setelah review/survey |
| Negotiation | Harga dapat dinegosiasikan |
| Inspection Fee | Biaya khusus survey/inspection |
| Milestone Payment | Pembayaran bertahap untuk project |
| Emergency Fee | Biaya tambahan untuk layanan darurat |
| Material-based | Harga dipengaruhi material |
| Duration-based | Harga berdasarkan durasi |
| Visit Fee | Biaya kunjungan bila berlaku |

---

# 62. MATRIX SURVEY / INSPECTION FEE

Provider menentukan:

```text
Survey Required?
├── No
├── Free
└── Paid
    └── Amount
```

## Free

```text
Booking
↓
Survey
↓
Quotation
↓
Customer Reject
↓
No Survey Fee
↓
Close
```

## Paid

```text
Booking
↓
Survey Fee Information
↓
Survey
↓
Quotation
↓
Customer Reject
↓
Main Service Cancelled / Closed
↓
Survey Fee tetap menjadi biaya survey
```

## Customer-facing

Customer harus melihat:

```text
Survey Fee
Rp50.000
```

sebelum booking dikonfirmasi/masuk tahap yang mengikat sesuai policy.

---

# 63. SURVEY FEE — BUSINESS RULE

Aturan final:

1. Provider menentukan apakah survey diperlukan.
2. Provider menentukan survey gratis atau berbayar.
3. Jika berbayar, provider menentukan nominal.
4. Nominal ditampilkan kepada customer.
5. Survey fee dipisahkan dari main service price.
6. Jika survey berbayar telah dilakukan dan customer menolak main service, survey fee tetap dapat ditagihkan sesuai policy.
7. Jika survey gratis, tidak ada biaya survey.
8. Jika survey dibatalkan sebelum survey dilakukan, outcome biaya mengikuti cancellation policy.
9. Apakah survey fee yang telah dibayar kemudian dikreditkan ke main service **belum dikunci dan menjadi business policy pricing/payment terpisah**.

---

# 64. MATRIX INSTANT

```text
Select Service
↓
Select Instant
↓
Location
↓
Requirement
↓
Availability
↓
Provider Matching
↓
Price
↓
Booking
↓
Provider Accept
↓
Order
↓
Payment
↓
Preparing
↓
On The Way
↓
Arrived
↓
Service
↓
Proof
↓
Completion
```

---

# 65. MATRIX SCHEDULED

```text
Select Service
↓
Scheduled
↓
Date
↓
Time
↓
Location
↓
Requirement
↓
Availability
↓
Provider
↓
Price
↓
Booking
↓
Accept
↓
Order
↓
Payment
↓
Preparing
↓
On The Way
↓
Arrived
↓
Service
↓
Completion
```

---

# 66. MATRIX EMERGENCY

```text
Emergency
↓
Location
↓
Problem
↓
Photo / Video
↓
Smart Triage Optional
↓
Provider Matching
↓
Provider Accept
↓
Order
↓
Payment / Authorization
↓
On The Way
↓
ETA / GPS
↓
Arrived
↓
Emergency Assistance
↓
Inspection / Diagnosis
↓
Repair / Next Action
↓
Proof
↓
Completion
```

---

# 67. MATRIX RECURRING

```text
Recurring Booking
↓
Frequency
↓
Start Date
↓
End Date / Duration
↓
Schedule Rule
↓
Provider
↓
Price
↓
Recurring Booking Created
↓
Occurrence
↓
Order
↓
Execution
↓
Completion
↓
Next Occurrence
```

---

# 68. MATRIX INSPECTION

```text
Inspection Booking
↓
Provider Accept
↓
Inspection Order / Inspection Process
↓
Survey Fee
↓
Provider Visit
↓
Inspection
↓
Inspection Report
↓
Quotation
↓
Customer Decision
```

Branch:

```text
Accept
↓
Main Order
```

atau:

```text
Reject
↓
Close
↓
Survey Fee handled according to provider/policy
```

---

# 69. MATRIX PROJECT

```text
Project Booking
↓
Provider Review
↓
Survey
↓
Measurement
↓
Scope
↓
Material Estimation
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
↓
Initial Payment
↓
Milestone
↓
Execution
↓
Progress
↓
Inspection
↓
Approval
↓
Next Milestone
↓
Final Completion
↓
Final Payment
↓
Warranty
```

---

# 70. MATRIX CUSTOM REQUEST

```text
Custom Request
↓
Requirement
↓
Photo / Video / Attachment
↓
Location
↓
Schedule
↓
Provider Discovery
↓
Provider Response
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
↓
Payment
↓
Execution
↓
Completion
```

---

# 71. WORKSHOP FLOW

Untuk workshop, tracking bukan GPS teknisi melainkan lifecycle asset/vehicle.

```text
Booking
↓
Vehicle / Asset Received
↓
Inspection
↓
Diagnosis
↓
Quotation
↓
Customer Approval
↓
Repair
↓
Testing
↓
Ready for Pickup
↓
Customer Pickup
↓
Completion
```

Status tracking:

```text
RECEIVED
INSPECTION
REPAIR
TESTING
READY_FOR_PICKUP
PICKED_UP
```

---

# 72. REMOTE / ONLINE FLOW

```text
Booking
↓
Payment
↓
Provider Confirm
↓
Session Starting
↓
Service Started
↓
Session
↓
Report
↓
Completion
```

Tidak membutuhkan live GPS.

---

# 73. PICKUP & RETURN FLOW

```text
Booking
↓
Pickup Scheduled
↓
Provider On The Way
↓
Item Picked Up
↓
Processing
↓
Cleaning / Repair
↓
Completed
↓
Return Trip
↓
Delivered
↓
Completion
```

Tracking berpusat pada perjalanan item/asset.

---

# 74. MATRIX COMPLETION

| Service Type | Completion Mechanism |
|---|---|
| Simple Home Service | Proof → Customer Confirmation |
| Emergency | Assistance/Repair → Proof → Confirmation |
| Workshop | Repair → Testing → Ready/Pickup |
| Remote | Session Complete → Report → Confirmation |
| Recurring | Occurrence Complete |
| Inspection | Inspection Report → Customer Decision |
| Project | Milestone Approval → Final Completion |
| Custom Request | Scope Complete → Proof → Confirmation |

---

# 75. MATRIX PAYMENT

| Scenario | Payment Point |
|---|---|
| Fixed Price | Sebelum / sesuai payment policy |
| Estimated | Setelah agreement/payment policy |
| Quotation | Setelah quotation accepted |
| Inspection | Survey fee + main service bila lanjut |
| Emergency | Upfront / authorization / sesuai policy |
| Project | Initial + milestone + final |
| Recurring | Per occurrence |
| Custom Request | Setelah agreement |

---

# 76. DATABASE CONCEPT — SERVICE OFFERING

## `services`

```text
service_id
subcategory_id
name
description
status
```

## `provider_services`

```text
provider_service_id
provider_id
service_id
description
status
```

## `booking_types`

```text
booking_type_id
name
description
status
```

## `provider_service_booking_types`

```text
id
provider_service_id
booking_type_id
is_active
```

## `service_modes`

```text
service_mode_id
name
description
status
```

## `provider_service_modes`

```text
id
provider_service_id
service_mode_id
is_active
```

---

# 77. DATABASE CONCEPT — PROVIDER CONFIGURATION

Konseptual entity:

```text
provider_service_pricing
provider_service_requirements
provider_service_availability
provider_service_survey
provider_service_capabilities
provider_service_area
```

Survey configuration:

```text
survey_required
survey_fee_type
survey_fee_amount
```

Value:

```text
NOT_REQUIRED
FREE
PAID
```

---

# 78. DATABASE CONCEPT — BOOKING

## `bookings`

```text
booking_id
booking_number
customer_id
provider_id
provider_service_id
service_id
booking_type_id
booking_source
status
problem_description
customer_notes
additional_request
address_id
latitude
longitude
requested_date
requested_start_time
requested_end_time
estimated_duration
pricing_type
estimated_min_price
estimated_max_price
survey_fee_type
survey_fee_amount
expires_at
created_at
updated_at
submitted_at
accepted_at
converted_at
cancelled_at
```

## `booking_status_history`

```text
id
booking_id
status
actor_type
actor_id
note
created_at
```

## `booking_attachments`

```text
id
booking_id
type
url
uploaded_by
created_at
```

## `booking_schedule`

```text
id
booking_id
requested_date
start_time
end_time
timezone
status
created_at
```

## `booking_location`

```text
id
booking_id
address_id
latitude
longitude
location_note
created_at
```

---

# 79. DATABASE CONCEPT — ORDER

## `orders`

```text
order_id
order_number
booking_id
customer_id
provider_id
provider_service_id
service_id
order_status
payment_status
execution_status
tracking_status
action_status
pricing_type
scheduled_date
scheduled_start_time
scheduled_end_time
estimated_duration
service_address_id
latitude
longitude
problem_description
customer_notes
provider_notes
subtotal
discount
tax
additional_fee
material_cost
total_amount
created_at
updated_at
confirmed_at
started_at
completed_at
cancelled_at
```

---

# 80. DATABASE CONCEPT — ORDER SUPPORTING ENTITIES

Recommended conceptual entities:

```text
order_items
order_status_history
order_schedule
order_locations
order_tracking_sessions
order_tracking_points
order_execution
order_proofs
order_service_reports
order_payments
order_adjustments
order_cancellations
order_reschedules
order_disputes
order_refunds
order_warranties
order_materials
```

---

# 81. ORDER STATUS HISTORY

## `order_status_history`

```text
id
order_id
status_type
status
actor_type
actor_id
note
created_at
```

`status_type`:

```text
ORDER
PAYMENT
EXECUTION
TRACKING
ACTION
```

Contoh:

```text
09:00 ORDER CREATED
09:02 PAYMENT CONFIRMED
09:03 ORDER CONFIRMED
09:30 EXECUTION PREPARING
09:45 TRACKING ON_THE_WAY
10:00 TRACKING ARRIVED
10:05 EXECUTION STARTED
10:50 EXECUTION COMPLETION_SUBMITTED
11:00 ORDER COMPLETION_REVIEW
11:05 ORDER COMPLETED
```

---

# 82. END-TO-END MASTER BUSINESS FLOW

```text
                          DISCOVERY
                              ↓
                    SERVICE / PROVIDER
                              ↓
                  SERVICE OFFERING CONFIG
                              ↓
                  SUPPORTED BOOKING TYPES
                              ↓
                       CUSTOMER BOOKING
                              ↓
                 ┌────────────┴────────────┐
                 │                         │
            NORMAL FLOW                SMART FLOW
                 │                         │
                 │                   Problem
                 │                         ↓
                 │                   Smart Questions
                 │                         ↓
                 │                   Recommended Service
                 │                         ↓
                 │                   Provider Matching
                 │                         │
                 └────────────┬────────────┘
                              ↓
                       BOOKING FORM
                              ↓
                    LOCATION + SCHEDULE
                              ↓
                    AVAILABILITY CHECK
                              ↓
                    PRICE INFORMATION
                              ↓
                       BOOKING SUBMIT
                              ↓
                         VALIDATION
                              ↓
                    PROVIDER PROCESSING
                              ↓
               ┌──────────────┼──────────────┐
               │              │              │
             ACCEPT        REVISION        REJECT
               │              │              │
               │         Customer Reply      │
               │              │              │
               └──────────────┴──────────────┘
                              ↓
                  INSPECTION / QUOTATION
                    jika diperlukan
                              ↓
                   COMMERCIAL AGREEMENT
                              ↓
                         ORDER CREATED
                              ↓
                       PAYMENT PROCESS
                              ↓
                      ORDER CONFIRMED
                              ↓
                          PREPARING
                              ↓
                         ON THE WAY
                              ↓
                           ARRIVED
                              ↓
                          CHECK-IN
                              ↓
                       SERVICE STARTED
                              ↓
                      SERVICE IN PROGRESS
                         │            │
                         │            └── Additional Requirement
                         │
                         └── Pause / Resume
                              ↓
                     SERVICE COMPLETED
                              ↓
                      PROOF OF SERVICE
                              ↓
                  COMPLETION SUBMITTED
                              ↓
                     CUSTOMER REVIEW
                      /           \\
                  CONFIRM         ISSUE
                     ↓              ↓
                 COMPLETED       DISPUTED
                     ↓              ↓
              SERVICE HISTORY   RESOLUTION
                     ↓
                REVIEW / RATING
                     ↓
              WARRANTY / CLAIM
                     ↓
             MAINTENANCE / REMINDER
```

---

# 83. CUSTOMER JOURNEY

```text
1. Discover
2. Select service
3. Select provider / receive recommendation
4. Select available booking type
5. Fill dynamic form
6. Add location
7. Select schedule
8. Review price/survey fee
9. Submit booking
10. Wait for provider/agreement
11. Review quotation if required
12. Approve
13. Order created
14. Pay
15. Track provider
16. Provider arrives
17. Service starts
18. Follow progress
19. Review proof
20. Confirm completion
21. Rate/review
22. View service history
23. Claim warranty / rebook / maintain asset
```

---

# 84. PROVIDER JOURNEY

```text
1. Create provider profile
2. Select service
3. Configure service offering
4. Select supported booking types
5. Select service modes
6. Configure pricing
7. Configure survey fee
8. Configure required customer information
9. Configure availability
10. Receive booking
11. Review requirement
12. Accept / Reject / Revision / Inspection
13. Conduct survey if required
14. Create quotation if needed
15. Obtain agreement
16. Receive/create order
17. Prepare
18. Travel
19. Check-in
20. Document before condition
21. Start service
22. Execute
23. Request approval for additional cost if needed
24. Upload progress
25. Complete
26. Upload proof
27. Submit service report
28. Receive customer confirmation
29. Receive payout
30. Continue warranty/re-service when applicable
```

---

# 85. ADMIN / OPERATIONS JOURNEY

```text
Monitor Bookings
↓
Monitor Orders
↓
Monitor Active Execution
↓
Monitor Delays
↓
Monitor Provider Issues
↓
Monitor Customer Issues
↓
Handle Cancellation
↓
Handle Refund
↓
Handle Dispute
↓
Handle Warranty
↓
Audit Status History
↓
Analytics
```

---

# 86. BUSINESS RULES YANG WAJIB DIJAGA

## Rule 1 — Taxonomy

Category dan Subcategory dikontrol Servio.

## Rule 2 — Booking Type

Master Booking Type dikontrol Servio.

## Rule 3 — Provider

Provider memilih Booking Type yang tersedia pada service offering mereka.

## Rule 4 — Customer

Customer hanya memilih opsi yang tersedia.

## Rule 5 — Compatibility

Provider hanya boleh memilih konfigurasi yang valid untuk service tersebut.

## Rule 6 — Dynamic Form

Form mengikuti konfigurasi service offering + booking type.

## Rule 7 — Smart

Smart bersifat assistive.

## Rule 8 — Pricing

Harga tidak dapat diubah sepihak melalui flow tambahan.

## Rule 9 — Survey Fee

Provider dapat menetapkan Free atau Paid + nominal.

## Rule 10 — Survey Fee Visibility

Customer melihat survey fee sebelum masuk proses yang mengikat sesuai policy.

## Rule 11 — Additional Cost

Tambahan biaya membutuhkan persetujuan customer.

## Rule 12 — History

Status dan perubahan penting harus memiliki audit trail.

## Rule 13 — Tracking

GPS aktif hanya pada service yang relevan.

## Rule 14 — Completion

Provider submit completion, customer melakukan review.

## Rule 15 — Dispute

Customer dapat melaporkan issue terhadap hasil service.

## Rule 16 — Payout

Payout mengikuti payment model dan completion policy.

---

# 87. EDGE CASE MASTER

Sistem harus mempertimbangkan setidaknya:

1. Payment Failed
2. Payment Expired
3. Provider Reject
4. Provider Cancel
5. Customer Cancel
6. Booking Expired
7. Booking Revision
8. Reschedule
9. Provider Late
10. Customer No-Show
11. Provider No-Show
12. Tracking Offline
13. Provider GPS tidak tersedia
14. Service Area mismatch
15. Schedule unavailable
16. Provider tidak memiliki availability
17. Survey cancelled
18. Survey Free
19. Survey Paid
20. Customer reject quotation
21. Customer accept quotation
22. Additional Cost
23. Additional Cost Rejected
24. Material Unavailable
25. Service Paused
26. Service Resumed
27. Partial Service
28. Service Cannot Be Completed
29. Completion Rejected
30. Customer Dispute
31. Full Refund
32. Partial Refund
33. Warranty Claim
34. Provider substitution
35. Customer meminta reschedule setelah provider travel
36. Provider tiba tetapi customer tidak ada
37. Customer meminta perubahan scope
38. Provider menemukan kondisi yang berbeda dari booking
39. Recurring occurrence cancelled
40. Project milestone delayed

---

# 88. CONTOH: AC REPAIR

Provider configuration:

```text
Service:
AC Repair

Booking:
✓ Instant
✓ Scheduled
✓ Emergency
✓ Inspection

Mode:
✓ Home Service

Pricing:
✓ Estimated
✓ Quotation

Survey:
Paid
Rp50.000
```

Flow:

```text
Customer:
"AC tidak dingin."

↓ Smart Triage

Recommended:
AC Repair / Inspection

↓ Provider Matching

↓ Emergency

↓ Provider Accept

↓ Order

↓ Survey Fee Rp50.000

↓ On The Way

↓ Arrived

↓ Inspection

↓ Diagnosis

↓ Quotation

↓ Customer Reject

↓ Main Service Close

↓ Survey Fee remains payable
```

---

# 89. CONTOH: CLEANING SOFA

Provider configuration:

```text
Service:
Cleaning Sofa

Booking:
✓ Scheduled

Mode:
✓ Home Service

Pricing:
✓ Fixed Price

Survey:
Free
```

Flow:

```text
Scheduled Booking
↓
Provider Accept
↓
Order
↓
Payment
↓
Preparing
↓
On The Way
↓
Arrived
↓
Before Photo
↓
Cleaning
↓
After Photo
↓
Completion
↓
Customer Confirm
↓
Completed
```

---

# 90. CONTOH: RENOVASI RUMAH

Provider configuration:

```text
Service:
Renovation

Booking:
✓ Inspection
✓ Project
✓ Custom Request

Mode:
✓ On-Site

Pricing:
✓ Quotation
✓ Negotiation

Survey:
Paid
Rp100.000
```

Flow:

```text
Project Booking
↓
Provider Review
↓
Survey Fee Rp100.000
↓
Survey
↓
Measurement
↓
Scope
↓
Proposal
↓
Quotation
↓
Customer Negotiate
↓
Agreement
↓
Order
↓
Initial Payment
↓
Milestone
↓
Progress
↓
Inspection
↓
Approval
↓
Final Completion
↓
Final Payment
↓
Warranty
```

---

# 91. CONTOH: WORKSHOP MOTOR

```text
Booking
↓
Vehicle Received
↓
Inspection
↓
Diagnosis
↓
Quotation
↓
Customer Approval
↓
Order
↓
Repair
↓
Testing
↓
Ready for Pickup
↓
Customer Pickup
↓
Completion
↓
Warranty / History
```

Tracking utama:

```text
Vehicle Status
```

bukan lokasi teknisi.

---

# 92. CONTOH: RECURRING CLEANING

```text
Recurring Booking
↓
Every Monday
↓
Provider Selected
↓
Occurrence Generated
↓
Order #001
↓
Execution
↓
Completion
↓
Order #002
↓
Execution
↓
Completion
```

---

# 93. CONTOH: EMERGENCY TOWING

```text
Emergency
↓
Current Location
↓
Vehicle Information
↓
Problem
↓
Smart Triage Optional
↓
Towing Provider Matching
↓
Provider Accept
↓
Order
↓
Payment / Authorization
↓
On The Way
↓
Live Tracking
↓
Arrived
↓
Vehicle Pickup
↓
Tow
↓
Destination
↓
Completion
```

---

# 94. STATUS TRANSITION — BOOKING

```text
DRAFT
→ SUBMITTED

SUBMITTED
→ VALIDATING

VALIDATING
→ PENDING_PROVIDER
→ CLOSED

PENDING_PROVIDER
→ ACCEPTED
→ REVISION_REQUIRED
→ REJECTED
→ EXPIRED
→ CANCELLED

REVISION_REQUIRED
→ SUBMITTED
→ RESCHEDULE_REQUESTED
→ CANCELLED

ACCEPTED
→ CONVERTED
→ CLOSED

CONVERTED
→ CLOSED

REJECTED
→ CLOSED

EXPIRED
→ CLOSED

CANCELLED
→ CLOSED
```

---

# 95. STATUS TRANSITION — ORDER

```text
CREATED
→ PENDING_PAYMENT
→ CONFIRMED
→ CANCELLED
→ FAILED
→ EXPIRED

PENDING_PAYMENT
→ CONFIRMED
→ CANCELLED
→ EXPIRED

CONFIRMED
→ ACTIVE
→ CANCELLED

ACTIVE
→ COMPLETION_REVIEW
→ CANCELLED
→ DISPUTED
→ FAILED

COMPLETION_REVIEW
→ COMPLETED
→ DISPUTED

DISPUTED
→ COMPLETED
→ CANCELLED
→ RESOLUTION_CLOSED

COMPLETED
→ WARRANTY
→ SERVICE_HISTORY
```

Catatan: status aktual harus mengikuti capability dan flow service masing-masing.

---

# 96. PEMISAHAN STATUS UNTUK BACKEND

Disarankan tidak menggunakan satu enum besar.

Gunakan konsep:

```text
order_status
payment_status
execution_status
tracking_status
action_status
```

Contoh:

```text
order_status = ACTIVE
payment_status = PAID
execution_status = IN_PROGRESS
tracking_status = ENDED
action_status = NONE
```

Ini lebih fleksibel daripada membuat satu enum gabungan.

---

# 97. SERVICE TIMELINE

Customer sebaiknya melihat timeline yang menggabungkan event penting.

Contoh:

```text
09:00 Booking Submitted
09:03 Provider Accepted
09:04 Order Created
09:10 Payment Confirmed
09:30 Provider Preparing
09:45 Provider On The Way
10:00 Provider Arrived
10:05 Service Started
10:40 Additional Work Requested
10:45 Customer Approved
11:20 Service Completed
11:25 Proof Submitted
11:30 Customer Confirmed
11:31 Order Completed
```

Timeline berasal dari event/history, bukan hardcoded.

---

# 98. HUBUNGAN DENGAN FITUR LAIN

Booking + Order menjadi penghubung ke:

```text
Discovery
↓
Booking
↓
Order
↓
Payment
↓
Communication
↓
Tracking
↓
Proof
↓
Completion
↓
Review
↓
Complaint
↓
Warranty
↓
Service History
↓
Asset
↓
Maintenance
↓
Reminder
↓
Rebooking
```

---

# 99. HUBUNGAN DENGAN KOMUNIKASI

Dalam Order customer/provider dapat menggunakan:

- Chat
- Direct Chat
- Call
- Support
- Additional request discussion
- Quotation discussion
- Schedule discussion

Komunikasi harus tetap berkaitan dengan entity:

```text
booking_id
order_id
```

sesuai fase proses.

---

# 100. HUBUNGAN DENGAN PRICING & QUOTATION

Booking dapat membawa:

```text
estimated_price
inspection_fee
```

Order dapat membawa:

```text
subtotal
discount
tax
material_cost
additional_fee
total_amount
```

Quotation merupakan proses agreement ketika harga belum fixed.

---

# 101. HUBUNGAN DENGAN MATERIAL

Jika saat pengerjaan dibutuhkan material:

```text
Problem / Diagnosis
↓
Material Required
↓
Stock Check
├── Available
│    ↓
│  Continue
│
└── Unavailable
     ↓
  Product Discovery
```

Tahap Product Marketplace akan dibahas dalam scope terpisah.

---

# 102. HUBUNGAN DENGAN MAINTENANCE

Setelah order selesai:

```text
Order Completed
↓
Asset Updated
↓
Service History
↓
Maintenance Schedule
↓
Reminder
```

Contoh:

> AC telah diservis.

System dapat membuat:

> Maintenance berikutnya direkomendasikan pada periode tertentu.

---

# 103. HUBUNGAN DENGAN REBOOKING

Setelah completed:

```text
Order History
↓
Service Detail
↓
Book Again
↓
New Booking
```

Booking baru tetap menjadi object baru.

Order lama tidak diubah.

---

# 104. ANALYTICS YANG DAPAT DIHASILKAN

Dari Booking:

- booking volume
- booking source
- acceptance rate
- rejection rate
- expiration rate
- booking conversion rate
- popular booking type
- popular service
- provider response time

Dari Order:

- order volume
- revenue
- cancellation rate
- completion rate
- dispute rate
- average execution time
- average travel time
- average additional cost
- provider performance
- service performance
- warranty claim rate

---

# 105. RASIO PENTING

Contoh:

```text
Booking Conversion Rate
= Converted Bookings / Submitted Bookings
```

```text
Provider Acceptance Rate
= Accepted Bookings / Provider Requests
```

```text
Completion Rate
= Completed Orders / Created Orders
```

```text
Cancellation Rate
= Cancelled Orders / Created Orders
```

Analytics ini dapat digunakan untuk monitoring operasional dan product decisions.

---

# 106. PRINCIPLE UNTUK IMPLEMENTASI FRONTEND

Frontend harus membaca configuration dari backend.

Jangan hardcode semua service form.

Konsep:

```text
GET Service Offering
↓
Supported Booking Types
↓
Service Modes
↓
Pricing Model
↓
Survey Configuration
↓
Required Fields
↓
Availability
↓
Render Booking Flow
```

Komponen konseptual:

```text
BookingEntry
BookingTypeSelector
DynamicBookingForm
RequirementFields
LocationSelector
ScheduleSelector
ProviderSelector
AvailabilityChecker
PriceSummary
SurveyFeeNotice
BookingSummary
BookingStatus
```

---

# 107. PRINCIPLE UNTUK BACKEND

Backend menjadi source of truth untuk:

- provider capability
- booking type availability
- service compatibility
- availability
- price
- survey fee
- booking status
- order status
- payment state
- execution state
- tracking
- completion
- cancellation policy

Frontend hanya menampilkan dan mengirim request.

---

# 108. PRINCIPLE UNTUK DATABASE

Hindari menyimpan semua informasi ke satu tabel besar.

Pisahkan:

```text
Booking Domain
Order Domain
Payment Domain
Tracking Domain
Execution Domain
Proof Domain
Dispute Domain
Warranty Domain
Service History Domain
```

Relasi tetap menggunakan ID yang jelas.

---

# 109. FINAL ARCHITECTURE

```text
                         SERVIO
                           │
                       DISCOVERY
                           │
                     SERVICE OFFERING
                           │
               PROVIDER CONFIGURATION
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
   BOOKING TYPES      SERVICE MODES      PRICING
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
                         BOOKING
                           │
                 SMART / NORMAL FLOW
                           │
                  PROVIDER PROCESSING
                           │
                     AGREEMENT
                           │
                          ORDER
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
      PAYMENT          TRACKING         EXECUTION
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
                       PROOF
                           │
                      COMPLETION
                           │
                   CUSTOMER CONFIRM
                           │
          ┌────────────────┼────────────────┐
          │                │                │
        REVIEW          WARRANTY        HISTORY
                           │
                       MAINTENANCE
```

---

# 110. FINAL DECISIONS / LOCKED

Konsep berikut dinyatakan **FINAL / KEEP** untuk scope Booking & Order Jasa:

1. Booking dan Order dipisahkan.
2. Booking adalah reservation/request.
3. Order adalah agreed transaction.
4. Provider menentukan booking type yang tersedia pada setiap service offering mereka.
5. Provider tidak bebas membuat booking type baru.
6. Servio mengontrol master booking type.
7. Servio mengontrol compatibility rules.
8. Service offering menjadi layer konfigurasi provider.
9. Booking form bersifat dinamis.
10. Customer dapat menggunakan normal booking.
11. Customer dapat menggunakan smart booking.
12. Smart hanya membantu, bukan mengambil keputusan final.
13. Provider matching mempertimbangkan capability, bukan hanya jarak.
14. Availability diverifikasi sebelum booking diteruskan.
15. Booking memiliki lifecycle sendiri.
16. Order memiliki lifecycle sendiri.
17. Order status dipisahkan dari payment/execution/tracking status.
18. Tracking dapat berupa GPS maupun progress/status tracking.
19. Home/Mobile/Emergency dapat menggunakan live tracking.
20. Workshop menggunakan asset/service status.
21. Project menggunakan milestone/progress.
22. Remote menggunakan session status.
23. Recurring menghasilkan order per occurrence.
24. Project menggunakan milestone.
25. Custom Request dapat melalui quotation/negotiation.
26. Inspection dapat menghasilkan quotation.
27. Survey fee ditentukan provider.
28. Survey fee dapat Free atau Paid.
29. Jika Paid, nominal ditentukan provider.
30. Survey fee ditampilkan ke customer.
31. Survey fee terpisah dari main service price.
32. Additional cost membutuhkan customer approval.
33. Proof of Service menjadi bagian completion.
34. Customer memiliki hak confirm atau report issue.
35. Dispute memiliki lifecycle sendiri.
36. Cancellation mengikuti policy.
37. Reschedule memiliki history.
38. No-show ditangani sebagai scenario tersendiri.
39. Refund dapat full/partial/none.
40. Warranty dapat dibuat setelah completion.
41. Service history dibuat dari completed order.
42. Asset dan maintenance dapat diperbarui setelah service.
43. One Order Rule digunakan untuk satu customer + satu provider + satu service execution.
44. Add-on/material dapat menjadi order item.
45. Booking dan Order memiliki status history.
46. Service Timeline dibangun dari event/history.
47. Backend menjadi source of truth.
48. Frontend menggunakan dynamic configuration.
49. Survey fee credit ke main order **belum diputuskan** dan menjadi policy pricing/payment terpisah.
50. Product marketplace dan integration material akan dibahas dalam scope Barang yang terpisah.

---

# 111. MASTER SUMMARY

Servio menggunakan arsitektur:

```text
DISCOVERY
↓
BOOKING
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
↓
CONFIRMATION
↓
REVIEW
↓
WARRANTY / HISTORY / MAINTENANCE
```

Dengan prinsip utama:

> **Servio mengontrol standardisasi platform, provider mengontrol konfigurasi service offering mereka, dan customer memilih dari opsi yang tersedia serta tetap memegang keputusan akhir.**

Booking merupakan pintu masuk permintaan layanan.

Order merupakan objek transaksi.

Execution merupakan pekerjaan aktual.

Tracking memberikan visibility.

Proof membuktikan pekerjaan.

Completion menutup pekerjaan.

Service History, Warranty, Maintenance, dan Rebooking menjadi lifecycle setelah transaksi.

---

# 112. SCOPE NEXT

Setelah Booking + Order Jasa final, fitur yang secara natural dapat dibahas berikutnya adalah:

```text
Pricing & Quotation
↓
Communication
↓
Payment & Protection
↓
Service Execution
↓
Tracking Detail
↓
Proof of Service
↓
Completion
↓
Rating & Review
↓
Complaint / Dispute
↓
Warranty
↓
Service History
↓
Asset
↓
Maintenance
↓
Rebooking / Loyalty
↓
Product Marketplace
```

Namun semua fitur tersebut sudah memiliki titik integrasi yang jelas dengan Booking dan Order pada dokumen ini.
