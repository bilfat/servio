# SERVIO — FEATURE #16
# MAINTENANCE & REMINDER
## FINAL BUSINESS FLOW & FUNCTIONAL SPECIFICATION — LOCKED

> **Status: LOCKED**
>
> Feature #16 merupakan bagian dari roadmap utama Service/Jasa Servio.
>
> Fokus utama: mengelola kebutuhan maintenance aset secara terencana, berulang, berbasis waktu/penggunaan/kondisi, memberikan reminder, menyediakan alur booking maintenance, mencatat hasil maintenance, dan menghasilkan jadwal maintenance berikutnya.

---

# 1. Posisi Feature

Feature #16 berada setelah:

- #14 Service History
- #15 Asset

dan sebelum:

- #17 Rebooking / Favorite / Loyalty
- #18 Smart Recommendation
- #19 Service + Product Integration

Feature #16 bukan sekadar sistem notifikasi.

Feature ini adalah **maintenance lifecycle management** untuk aset yang memiliki kebutuhan perawatan di masa depan.

---

# 2. Definisi Maintenance

**Maintenance** adalah aktivitas terencana untuk menjaga kondisi, performa, keamanan, atau kelayakan suatu asset agar tetap berfungsi sesuai kebutuhan.

Maintenance dapat dilakukan secara:

- berkala berdasarkan waktu
- berdasarkan penggunaan
- berdasarkan event
- berdasarkan kondisi
- kombinasi beberapa trigger
- manual

Contoh:

- AC dibersihkan setiap 3 bulan
- Mobil diservis setiap 5.000 km
- Motor diperiksa setiap 6 bulan
- Gedung menjalani inspeksi berkala
- Filter perangkat diganti berdasarkan jumlah penggunaan
- Area taman dirawat setiap bulan

---

# 3. Tiga Konsep Inti

```text
ASSET
= apa yang dirawat

MAINTENANCE PLAN
= aturan kapan dan apa yang harus dirawat

REMINDER
= kapan customer diingatkan
```

Ketiganya tidak boleh diperlakukan sebagai satu entitas yang sama.

---

# 4. Maintenance ≠ Repair

```text
MAINTENANCE
= menjaga / mencegah / mempertahankan kondisi

REPAIR
= memperbaiki masalah atau kerusakan yang sudah terjadi
```

Contoh:

- Cuci AC rutin = Maintenance
- Ganti kapasitor AC rusak = Repair
- Servis rutin motor = Maintenance
- Memperbaiki mesin motor mogok = Repair

Satu maintenance dapat menemukan kebutuhan repair, tetapi keduanya tetap berbeda secara bisnis.

---

# 5. Maintenance ≠ Reminder

Reminder hanya merupakan **notification layer**.

```text
Maintenance Plan
        ↓
Maintenance Schedule
        ↓
Reminder
        ↓
Customer menerima pengingat
```

Reminder tidak menentukan sendiri kapan asset harus dirawat.

---

# 6. Tujuan Feature

Feature #16 harus mampu:

1. membuat maintenance plan
2. menentukan trigger maintenance
3. menentukan jadwal
4. menghitung due date
5. menghitung due usage bila diperlukan
6. membuat maintenance occurrence
7. mengirim reminder
8. mengelola maintenance yang due
9. mengelola maintenance yang overdue
10. melakukan booking maintenance
11. menghubungkan maintenance ke order
12. mencatat hasil maintenance
13. memperbarui service history
14. membuat jadwal maintenance berikutnya
15. mendukung maintenance berulang
16. membantu customer menjaga asset
17. mendukung provider continuity tanpa memaksa provider tertentu
18. menghubungkan maintenance dengan warranty dan product secara terkontrol

---

# 7. Scope Utama

Feature mencakup:

- Maintenance Plan
- Maintenance Schedule
- Maintenance Occurrence
- Maintenance Record
- Maintenance Reminder
- Recurring Maintenance
- Maintenance Calendar
- Maintenance Dashboard
- Maintenance Booking
- Maintenance Compliance
- Maintenance Contract
- Maintenance Package
- Maintenance Preference
- Maintenance Event
- Maintenance-to-Service integration

---

# 8. Struktur Utama

```text
Asset
  ↓
Maintenance Plan
  ↓
Maintenance Schedule
  ↓
Maintenance Occurrence
  ↓
Reminder
  ↓
Due
  ↓
Booking
  ↓
Order
  ↓
Execution
  ↓
Proof
  ↓
Completion
  ↓
Service History
  ↓
Next Maintenance Schedule
```

---

# 9. Maintenance Plan

Maintenance Plan adalah aturan maintenance.

Plan menjelaskan:

- asset yang dirawat
- jenis maintenance
- service yang digunakan
- sumber aturan
- trigger
- interval
- kondisi
- status plan
- aturan recurrence

Contoh:

```text
Asset:
AC Daikin 1 PK

Maintenance Plan:
AC Cleaning

Trigger:
TIME

Interval:
3 bulan

Service:
AC Cleaning

Status:
ACTIVE
```

---

# 10. Maintenance Schedule

Maintenance Schedule adalah jadwal maintenance yang dihasilkan berdasarkan plan.

Plan:

```text
Setiap 3 bulan
```

Schedule:

```text
15 Januari
15 April
15 Juli
15 Oktober
```

Dengan demikian:

```text
PLAN ≠ SCHEDULE
```

---

# 11. Maintenance Occurrence

Maintenance Occurrence adalah satu kejadian maintenance dalam siklus recurring.

Contoh:

```text
Plan:
AC Cleaning setiap 3 bulan

Occurrence #1
15 Januari

Occurrence #2
15 April

Occurrence #3
15 Juli
```

Setiap occurrence dapat memiliki:

- due date
- due usage
- status
- order
- execution result
- proof
- completion
- service history reference

---

# 12. Maintenance Record

Maintenance Record merupakan catatan aktual bahwa maintenance telah dilakukan.

Contoh:

```text
Asset: AC Daikin 1 PK
Maintenance: AC Cleaning
Completed At: 15 April 2026
Provider: Provider A
Order: ORD-xxxxx
Result: COMPLETED
```

Maintenance Record tidak sama dengan Maintenance Plan.

---

# 13. Sumber Maintenance Rule

Maintenance rule dapat berasal dari:

| Source | Penjelasan |
|---|---|
| PLATFORM | aturan umum Servio |
| PROVIDER | rekomendasi provider |
| MANUFACTURER | rekomendasi produsen |
| WARRANTY | persyaratan warranty |
| SERVICE_HISTORY | berdasarkan riwayat |
| CUSTOMER | dibuat customer |
| ASSET_RULE | aturan spesifik tipe asset |

Sumber harus selalu dapat diidentifikasi.

---

# 14. Platform Maintenance Template

Servio dapat menyediakan maintenance template untuk jenis asset/service tertentu.

Contoh:

```text
Asset Type:
Air Conditioner

Template:
AC Preventive Maintenance

Recommended:
- Cleaning
- Inspection
- Performance Check
```

Template platform dapat menjadi dasar plan tetapi tidak menghilangkan konfigurasi bisnis provider.

---

# 15. Provider Maintenance Recommendation

Provider dapat memberikan rekomendasi maintenance.

Contoh:

```text
Teknisi:
"AC sebaiknya dibersihkan setiap 3 bulan."
```

Rekomendasi tersebut dapat menjadi:

- maintenance suggestion
- maintenance plan
- recurring recommendation

tetap mengikuti aturan dan kontrol platform.

---

# 16. Customer Custom Maintenance

Customer dapat membuat maintenance pribadi.

Contoh:

```text
Asset:
Motor

Custom reminder:
Cek tekanan ban
Setiap 2 minggu
```

Custom reminder tidak otomatis menjadi official maintenance rule Servio.

---

# 17. Trigger Maintenance

Maintenance mendukung:

1. TIME
2. USAGE
3. EVENT
4. CONDITION
5. HYBRID
6. MANUAL

---

# 18. Time-Based Maintenance

Contoh:

```text
Setiap 30 hari
Setiap 3 bulan
Setiap 6 bulan
Setiap 1 tahun
```

Digunakan untuk asset yang memiliki interval waktu.

---

# 19. Usage-Based Maintenance

Maintenance dapat dipicu oleh penggunaan.

Contoh:

```text
Mobil:
5000 km

Motor:
3000 km

Mesin:
100 jam penggunaan
```

Usage threshold harus memiliki unit yang jelas.

Contoh:

```text
5000 KM
100 HOURS
100 CYCLES
```

---

# 20. Event-Based Maintenance

Maintenance dapat dipicu setelah event tertentu.

Contoh:

```text
Setelah 10 service cycles
Setelah installation
Setelah component replacement
Setelah project completion
```

---

# 21. Condition-Based Maintenance

Maintenance dapat dipicu berdasarkan kondisi.

Contoh:

```text
Repeated AC issue
↓
Servio merekomendasikan inspection
```

Condition-based maintenance dapat menggunakan:

- service history
- condition record
- inspection result
- issue frequency
- asset health data

---

# 22. Hybrid Trigger

Hybrid menggabungkan lebih dari satu trigger.

Contoh:

```text
90 hari OR 5000 km
```

Maintenance menjadi due ketika salah satu kondisi terpenuhi.

Contoh lain:

```text
6 bulan OR 10.000 km
```

---

# 23. Manual Maintenance

Customer atau provider dapat memulai maintenance secara manual.

Contoh:

```text
User:
"Servis AC sekarang."
```

Maintenance tetap dapat dibuat tanpa menunggu due date.

---

# 24. Preventive Maintenance sebagai MVP

MVP berfokus pada:

- preventive maintenance
- time-based
- usage-based dasar
- hybrid
- reminder
- recurring maintenance
- basic condition-based recommendation

---

# 25. Predictive Maintenance

Predictive maintenance merupakan pengembangan skala lanjut.

Dapat menggunakan:

```text
Usage
+
Service History
+
Asset Condition
+
Sensor / IoT
+
Pattern Detection
```

untuk memperkirakan kapan asset membutuhkan maintenance.

Predictive maintenance **bukan syarat MVP**.

---

# 26. Maintenance Interval

Interval dapat berupa:

- hari
- minggu
- bulan
- tahun
- kilometer
- jam penggunaan
- cycle

Format interval harus terstruktur.

Jangan menyimpan semua interval sebagai free text.

---

# 27. Recurring Maintenance

Recurring maintenance adalah bagian inti Feature #16.

Contoh:

```text
AC Cleaning
Every 3 months
```

Flow:

```text
Plan
↓
Occurrence #1
↓
Completed
↓
Occurrence #2 generated
↓
Completed
↓
Occurrence #3 generated
```

---

# 28. Auto Generate Next Schedule

Setelah maintenance selesai:

```text
Completed
↓
System calculates next due
↓
Next occurrence generated
↓
Reminder scheduled
```

Pembuatan occurrence berikutnya dapat mengikuti konfigurasi plan dan hasil aktual maintenance.

---

# 29. Maintenance Status

Status maintenance yang digunakan:

```text
NOT_SCHEDULED
SCHEDULED
UPCOMING
DUE
OVERDUE
BOOKING_IN_PROGRESS
IN_SERVICE
COMPLETED
SKIPPED
CANCELLED
RESCHEDULED
NOT_APPLICABLE
```

---

# 30. Arti Status

### NOT_SCHEDULED
Belum memiliki jadwal aktif.

### SCHEDULED
Sudah memiliki tanggal/jadwal.

### UPCOMING
Maintenance belum due.

### DUE
Maintenance sudah mencapai waktu/usage trigger.

### OVERDUE
Maintenance sudah melewati due point.

### BOOKING_IN_PROGRESS
Customer sedang melakukan proses booking.

### IN_SERVICE
Maintenance sedang dikerjakan.

### COMPLETED
Maintenance telah selesai.

### SKIPPED
Maintenance sengaja dilewati dan harus memiliki alasan bila diperlukan.

### CANCELLED
Jadwal dibatalkan.

### RESCHEDULED
Jadwal dipindahkan.

### NOT_APPLICABLE
Maintenance tidak lagi relevan.

---

# 31. Overdue ≠ Broken

Sangat penting:

```text
OVERDUE
≠
ASSET BROKEN
```

Overdue hanya berarti maintenance belum dilakukan setelah due point.

Servio tidak boleh menyatakan asset rusak hanya karena maintenance terlambat.

---

# 32. Skipped Maintenance

Customer dapat memilih:

```text
Skip
```

Sistem dapat meminta alasan.

Contoh alasan:

- belum diperlukan
- budget
- asset tidak digunakan
- sudah dilakukan di luar Servio
- pindah provider
- alasan lainnya

---

# 33. Maintenance Reschedule

Customer dapat reschedule maintenance.

Contoh:

```text
Original:
15 September

New:
22 September
```

Perubahan jadwal harus tercatat.

---

# 34. Snooze Reminder ≠ Reschedule

Snooze hanya mengubah waktu reminder.

Contoh:

```text
Due:
15 September

Reminder:
8 September

Snooze:
+2 hari
```

Due date tetap:

```text
15 September
```

---

# 35. Maintenance Calendar

Customer dapat melihat maintenance dalam calendar.

Contoh:

```text
September

10
AC Cleaning

15
Car Service

22
Garden Maintenance
```

Calendar dapat menampilkan:

- upcoming
- due
- overdue
- scheduled
- completed

---

# 36. Maintenance Dashboard — Customer

Dashboard dapat berisi:

```text
Upcoming Maintenance
Due Maintenance
Overdue Maintenance
Recently Completed
```

Contoh:

```text
My Maintenance

Upcoming
• AC Cleaning — 24 Sep

Due
• Car Service — Today

Overdue
• Garden Maintenance — 8 days
```

---

# 37. Maintenance Detail — Customer

Detail dapat menampilkan:

- asset
- maintenance type
- due date
- due usage
- last completed
- recommended service
- previous provider
- maintenance status
- history
- reminder status
- Book Maintenance
- Reschedule
- Skip

---

# 38. One-Click Maintenance Booking

Saat maintenance sudah due:

```text
BOOK MAINTENANCE
```

Sistem dapat memprefill:

- asset
- maintenance type
- relevant history
- location
- preferred provider
- previous provider

Customer tetap dapat mengubah pilihan provider.

---

# 39. Provider Continuity

Servio dapat merekomendasikan provider sebelumnya.

Contoh:

```text
Last Provider:
Provider A
```

Pilihan:

```text
Book Again
```

tetapi customer tidak wajib menggunakan provider tersebut.

---

# 40. Maintenance Provider Recommendation

Sistem dapat merekomendasikan:

- previous provider
- nearby provider
- compatible provider
- provider dengan availability
- provider sesuai service type

Recommendation berada di Feature #18.

Feature #16 menyediakan konteks maintenance yang dibutuhkan.

---

# 41. Booking Integration

Maintenance tidak menggantikan Booking.

Ketika customer memilih maintenance:

```text
Maintenance
↓
Booking
↓
Order
```

Booking menggunakan mekanisme Feature #2.

---

# 42. Order Integration

Maintenance yang benar-benar dikerjakan melalui Servio dapat menghasilkan order.

```text
Maintenance Occurrence
        ↓
Booking
        ↓
Order
```

Order menjadi sumber transaksi komersial.

Maintenance hanya menyimpan reference ke order.

---

# 43. Pricing Integration

Maintenance dapat menggunakan pricing model yang telah tersedia di Feature #4:

- Fixed Price
- Estimated Price
- Quotation
- Negotiation
- Package
- Visit Fee
- Inspection Fee
- Material-based
- Duration-based

Feature #16 tidak membuat sistem pricing baru.

---

# 44. Payment Integration

Pembayaran mengikuti Feature #6.

Maintenance dapat memiliki:

- upfront payment
- deposit
- after service
- milestone
- authorization
- model lain yang tersedia untuk service tersebut

Feature #16 tidak mengelola money movement secara mandiri.

---

# 45. Maintenance Package

Servio dapat mendukung maintenance package.

Contoh:

```text
AC Maintenance Package
4x / Year
```

Data:

```text
Total:
4

Used:
2

Remaining:
2
```

---

# 46. Package Status

Package dapat memiliki:

```text
ACTIVE
PARTIALLY_USED
COMPLETED
EXPIRED
CANCELLED
```

---

# 47. Subscription / Contract

Subscription atau maintenance contract dapat menjadi pengembangan lanjutan.

Contoh:

```text
Annual Building Maintenance
```

Memiliki:

- asset
- provider
- start date
- end date
- frequency
- terms
- status

---

# 48. Maintenance Contract

Maintenance contract entity dapat mencakup:

```text
maintenance_contract_id
asset_id
provider_id
start_at
end_at
frequency
terms
status
```

Contract dapat membuat maintenance occurrence berulang.

---

# 49. Maintenance Reminder

Reminder merupakan sistem pengingat untuk maintenance schedule.

Contoh:

```text
Due:
30 September

Reminder:
30 days before
7 days before
1 day before
Due day
```

Jumlah dan timing reminder dapat dikonfigurasi.

---

# 50. Reminder Channel

Channel yang dapat digunakan:

- in-app
- push notification
- email
- WhatsApp
- SMS

Ketersediaan channel mengikuti integration capability Servio.

---

# 51. Reminder Preference

Customer dapat mengatur:

- enabled/disabled
- preferred channel
- reminder frequency
- quiet hours

---

# 52. Quiet Hours

Reminder tidak seharusnya mengganggu customer pada jam yang tidak diinginkan.

Quiet hour mengikuti timezone dan preference customer.

Untuk kondisi penting/critical, platform policy dapat menentukan pengecualian.

---

# 53. Reminder Anti-Spam

Servio harus memiliki:

- cooldown
- deduplication
- maximum reminder
- quiet period
- suppression untuk reminder yang sudah tidak relevan

Reminder tidak boleh terus dikirim hanya karena schedule belum berubah.

---

# 54. Reminder Status

```text
NOT_STARTED
SCHEDULED
SENT
DELIVERED
READ
SNOOZED
DISMISSED
FAILED
```

---

# 55. Reminder Tidak Mengubah Maintenance

Reminder:

```text
SNOOZED
```

tidak otomatis berarti:

```text
Maintenance RESCHEDULED
```

Demikian pula:

```text
DISMISSED
```

tidak mengubah:

```text
DUE / OVERDUE
```

---

# 56. Reminder Lifecycle

```text
SCHEDULE
↓
REMINDER CREATED
↓
SENT
↓
DELIVERED
↓
READ
```

Alternatif:

```text
SENT
↓
SNOOZED
↓
NEW REMINDER
```

---

# 57. Maintenance Compliance

Maintenance tertentu dapat bersifat compliance/safety.

Contoh:

- electrical inspection
- fire safety equipment
- building safety inspection
- safety equipment maintenance

Status:

```text
COMPLIANT
DUE
OVERDUE
NON_COMPLIANT
```

---

# 58. Compliance Rule

Tidak semua overdue maintenance berarti NON_COMPLIANT.

Status compliance harus ditentukan berdasarkan policy maintenance terkait.

---

# 59. Warranty Integration

Maintenance dapat terhubung dengan warranty.

Contoh:

```text
Warranty Policy:
maintenance must be performed every 6 months
```

Servio dapat mencatat maintenance compliance.

Namun:

```text
OVERDUE
≠
AUTOMATIC WARRANTY VOID
```

Keputusan warranty mengikuti Feature #13 dan policy warranty yang berlaku.

---

# 60. Maintenance Compliance & Warranty

Servio dapat memberi konteks:

```text
Maintenance:
Overdue

Warranty:
Active

Policy:
Maintenance compliance required
```

Sistem tidak boleh langsung menyatakan warranty tidak berlaku tanpa proses/policy yang sesuai.

---

# 61. Service History Integration

Maintenance yang completed dan dilakukan melalui Servio masuk ke Feature #14 Service History.

Flow:

```text
Maintenance Completed
↓
Service History
```

History menyimpan konteks seperti:

- asset
- maintenance
- provider
- order
- date
- result
- proof reference
- relevant materials

---

# 62. Maintenance sebagai Input History

Service History dapat menjadi sumber rekomendasi maintenance.

Contoh:

```text
Last AC Cleaning:
5 months ago
```

System dapat menentukan:

```text
Maintenance due
```

berdasarkan Maintenance Plan.

---

# 63. Maintenance → Repair

Saat maintenance dilakukan, provider dapat menemukan masalah tambahan.

Contoh:

```text
AC Cleaning
↓
Inspection
↓
Capacitor weak
↓
Repair recommended
```

Repair tidak boleh otomatis ditambahkan sebagai pekerjaan berbayar tanpa approval customer bila ada perubahan scope/cost.

---

# 64. Additional Work Approval

Jika maintenance menemukan pekerjaan tambahan:

```text
Finding
↓
Recommendation
↓
Scope / Price
↓
Customer Approval
↓
Additional Work
```

Pricing mengikuti Feature #4.

---

# 65. Maintenance → Product

Maintenance dapat menghasilkan kebutuhan product/material.

Contoh:

```text
Filter AC perlu diganti
```

Servio dapat:

- merekomendasikan product
- menampilkan compatible product
- menyimpan product reference
- mengarahkan ke Product flow

Eksekusi product mengikuti Feature #19 dan roadmap Product.

---

# 66. Maintenance Material

Maintenance record dapat mencatat material:

- filter
- lubricant
- cleaning chemical
- spare part
- component

Material dapat berasal dari:

```text
PROVIDER
CUSTOMER
SERVIO
OTHER
```

Aturan material mengikuti modul service execution/product.

---

# 67. Maintenance Proof

Maintenance menggunakan Proof of Service Feature #9.

Contoh proof:

- before photo
- after photo
- checklist
- measurement
- test result
- service report
- material used
- signature

Feature #16 tidak membuat proof engine sendiri.

---

# 68. Maintenance Completion

Maintenance menggunakan Completion & Customer Confirmation Feature #10.

Flow:

```text
Execution
↓
Proof
↓
Customer Review
↓
Confirmation
↓
Completed
```

---

# 69. Maintenance Execution

Maintenance menggunakan Service Execution Feature #7.

Contoh:

```text
Scheduled Maintenance
↓
Worker Assigned
↓
Service Started
↓
Checklist
↓
Inspection
↓
Maintenance Work
↓
Testing
↓
Completion
```

---

# 70. Maintenance Tracking

Bila maintenance menggunakan home/mobile/on-site service, Tracking Feature #8 dapat digunakan.

GPS tracking hanya aktif jika service mode membutuhkan tracking.

Workshop maintenance dapat menggunakan status asset/service tanpa live travel GPS.

---

# 71. Maintenance Asset

Feature #16 selalu berpusat pada asset ketika maintenance merupakan asset-based maintenance.

Contoh:

```text
Asset:
Toyota Avanza 2022

Maintenance:
Periodic Service
```

Asset menjadi identitas objek yang dirawat.

---

# 72. Asset Tidak Selalu Harus Ada di MVP

Untuk customer yang belum memiliki asset record formal, Servio dapat mengizinkan temporary service object saat booking.

Object tersebut dapat dipromosikan menjadi Asset melalui Feature #15.

---

# 73. Maintenance per Multiple Asset

Satu order dapat berisi maintenance untuk beberapa asset.

Contoh:

```text
Building Maintenance
- AC 1
- AC 2
- AC 3
- AC 4
```

Relasi maintenance harus tetap jelas per asset.

---

# 74. Asset Transfer

Saat asset berpindah pemilik, maintenance schedule dapat ditangani berdasarkan policy.

Technical maintenance plan yang melekat pada asset dapat dipertahankan.

Personal reminder milik user sebelumnya tidak otomatis ikut berpindah.

---

# 75. Asset Retired

Jika asset:

```text
RETIRED
```

maintenance plan aktif dapat dibuat:

```text
NOT_APPLICABLE
```

atau dinonaktifkan sesuai policy.

Reminder maintenance yang tidak lagi relevan harus dihentikan.

---

# 76. Asset Inactive

Asset inactive tidak otomatis berarti seluruh maintenance history dihapus.

History tetap dipertahankan.

Schedule aktif dapat dipause/nonaktif sesuai konteks.

---

# 77. Asset Lost

Jika asset lost:

- maintenance dapat dihentikan sementara
- reminder dapat disuppress
- history tetap ada

Status mengikuti Feature #15 Asset.

---

# 78. Pause Maintenance

Recurring maintenance dapat dipause.

Contoh:

```text
Mobil tidak dipakai selama 4 bulan
```

Customer dapat mengubah status plan menjadi paused bila policy mengizinkan.

---

# 79. Resume Maintenance

Ketika maintenance plan aktif kembali:

```text
PAUSED
↓
RESUMED
↓
System recalculates schedule
```

Perhitungan mengikuti aturan plan.

---

# 80. Maintenance Frequency

MVP dapat mendukung:

- weekly
- monthly
- quarterly
- semiannual
- yearly
- custom interval

Untuk usage-based:

- kilometers
- hours
- cycles

---

# 81. Usage Data

Usage data dapat berasal dari:

- customer input
- provider input
- service execution
- imported asset data
- integrated system
- IoT pada scale-up

Sumber usage harus tercatat.

---

# 82. Usage Validation

Servio dapat mendeteksi input usage yang tidak wajar.

Contoh:

```text
Previous:
20.000 km

New:
8.000 km
```

System dapat menandai:

```text
USAGE_ANOMALY
```

tetapi tidak otomatis menghapus atau mengoreksi data tanpa dasar yang cukup.

---

# 83. Condition Data

Condition dapat berasal dari:

- inspection
- checklist
- provider report
- customer report
- sensor
- service history

Condition insight harus dibedakan dari diagnosis profesional.

---

# 84. AI di Maintenance

AI dapat digunakan untuk:

- menjelaskan kenapa maintenance due
- merangkum maintenance history
- mendeteksi pola
- merekomendasikan maintenance
- menyarankan timing reminder
- membantu mengklasifikasikan maintenance
- membantu menemukan kemungkinan related service

AI bersifat:

```text
ASSISTIVE
```

bukan pengambil keputusan final.

---

# 85. AI Tidak Menetapkan Keputusan Final

AI tidak boleh secara mandiri:

- menyatakan asset rusak
- membatalkan warranty
- menetapkan fault
- memutuskan customer wajib membayar
- menyetujui additional work
- menyatakan maintenance berhasil tanpa evidence yang diperlukan

---

# 86. Maintenance Recommendation

Recommendation dapat mempertimbangkan:

- asset type
- asset age
- usage
- history
- prior maintenance
- provider recommendation
- manufacturer recommendation
- warranty
- condition

Output tetap harus diberi konteks sumber.

---

# 87. Customer Maintenance Timeline

Customer dapat melihat timeline:

```text
10 Jan
Plan Created

15 Jan
Maintenance Completed

15 Apr
Due

8 Apr
Reminder Sent

15 Apr
Booked

16 Apr
Maintenance Completed

16 Jul
Next Schedule
```

---

# 88. Provider Maintenance Dashboard

Provider dapat melihat:

```text
Upcoming Maintenance
Today's Maintenance
Overdue Maintenance
Recurring Customers
Maintenance Contracts
Maintenance Packages
```

Provider dapat melihat maintenance yang memang menjadi bagian dari provider's authorized service relationships.

---

# 89. Admin Maintenance Dashboard

Admin dapat melihat:

- maintenance due
- overdue
- skipped
- cancelled
- completion rate
- recurring rate
- maintenance demand
- provider capacity
- service performance
- compliance status

---

# 90. Maintenance Analytics

Contoh metrik:

```text
Maintenance Due
Maintenance Completed
Maintenance Overdue
Maintenance Skipped
On-time Completion Rate
Recurring Retention
Maintenance Booking Conversion
Average Days Overdue
Maintenance Revenue
```

---

# 91. Category Analytics

CEO/Admin dapat melihat maintenance berdasarkan:

- category
- subcategory
- service
- asset type
- provider
- region

Contoh:

```text
AC Maintenance
↓
Which city?
↓
Which provider?
↓
Which period?
↓
What is completion rate?
```

---

# 92. Maintenance Demand Insight

Data maintenance dapat menjadi input untuk:

- provider supply planning
- service catalog planning
- category planning
- inventory/product planning
- smart recommendation

---

# 93. Notification Events

Event yang dapat memicu notification:

```text
MAINTENANCE_SCHEDULED
MAINTENANCE_DUE
MAINTENANCE_OVERDUE
MAINTENANCE_BOOKED
MAINTENANCE_STARTED
MAINTENANCE_COMPLETED
MAINTENANCE_RESCHEDULED
MAINTENANCE_SKIPPED
```

---

# 94. Event Model

System event harus dapat mencatat:

- event type
- actor
- timestamp
- related asset
- related plan
- related schedule/occurrence
- related user
- metadata

---

# 95. Reminder Deduplication

Satu kondisi due tidak boleh menyebabkan notification duplicate tanpa alasan.

Contoh:

```text
Same schedule
Same reminder window
Same channel
```

harus memiliki deduplication mechanism.

---

# 96. Multi-Channel Reminder

Satu reminder dapat memiliki:

```text
Primary Channel
+
Fallback Channel
```

Contoh:

```text
Push failed
↓
Email
```

Aturan fallback mengikuti notification infrastructure.

---

# 97. Reminder Read State

Servio dapat membedakan:

```text
SENT
DELIVERED
READ
```

Tidak boleh menganggap SENT otomatis berarti customer sudah melihat.

---

# 98. Customer Reminder Control

Customer dapat:

- snooze
- dismiss
- reschedule maintenance
- book maintenance
- change notification preference

Customer tidak boleh menghapus official maintenance history hanya dengan menghapus reminder.

---

# 99. Official Maintenance vs Personal Reminder

Dua jenis data harus dipisahkan:

```text
Official Maintenance
```

dan:

```text
Personal Reminder
```

Official maintenance memiliki:

- plan
- schedule
- occurrence
- service relation

Personal reminder dapat hanya berisi:

- title
- asset
- date
- preference

---

# 100. Maintenance History

Maintenance history minimal menampilkan:

- maintenance type
- asset
- completion date
- provider
- order
- result
- proof reference
- materials
- warranty relationship bila relevan

---

# 101. Completed Maintenance

Maintenance hanya boleh berstatus completed setelah memenuhi flow completion yang berlaku.

```text
Maintenance
→ Execution
→ Proof
→ Completion
```

---

# 102. Completion Tidak Menghapus Schedule

Ketika occurrence selesai:

```text
Occurrence #1 = COMPLETED
```

bukan:

```text
Plan = DELETED
```

Plan tetap aktif dan menghasilkan schedule berikutnya.

---

# 103. Schedule Generation Rule

Next schedule menggunakan:

- interval plan
- completion date atau scheduled baseline sesuai policy plan
- usage threshold
- hybrid trigger
- pause/resume rule
- exception

Exact algorithm dapat menjadi implementation detail, tetapi hasil bisnis harus konsisten dengan plan.

---

# 104. Maintenance Exception

Exception dapat terjadi ketika:

- asset tidak tersedia
- provider tidak tersedia
- customer tidak dapat melakukan service
- usage data tidak tersedia
- condition berubah
- service discontinued

Exception harus tercatat, bukan mengubah history secara diam-diam.

---

# 105. Provider Service Discontinued

Jika service offering tidak lagi tersedia:

```text
Existing Maintenance Plan
↓
Service unavailable
↓
Needs alternative service/provider
```

System dapat meminta customer memilih replacement service yang compatible.

---

# 106. Provider Tidak Wajib Dipertahankan

Maintenance plan tidak harus selalu terikat permanen ke provider tertentu.

Plan dapat:

```text
Provider-specific
```

atau:

```text
Provider-flexible
```

sesuai konfigurasi.

---

# 107. Maintenance Booking Failure

Jika customer klik:

```text
BOOK MAINTENANCE
```

tetapi provider tidak tersedia:

```text
Booking Failed
↓
Recommend alternatives
```

Maintenance schedule tetap tidak otomatis dianggap completed.

---

# 108. Maintenance Cancellation

Cancellation maintenance booking mengikuti:

- Booking policy
- Order policy
- Payment policy
- Provider policy

Maintenance occurrence tidak boleh secara otomatis dianggap completed.

---

# 109. Payment Cancellation Context

Jika booking maintenance dibatalkan, dampak finansial mengikuti Feature #6.

Feature #16 hanya menyediakan konteks bahwa transaction tersebut berasal dari maintenance occurrence.

---

# 110. Maintenance Rescheduling Context

Reschedule dapat terjadi di:

- maintenance level
- booking level
- provider schedule level

Source perubahan harus dapat ditelusuri.

---

# 111. Maintenance vs Service Booking

```text
Maintenance = reason / planning context

Booking = appointment transaction

Order = commercial transaction
```

Ketiganya tidak boleh digabung menjadi satu entitas.

---

# 112. Maintenance vs Service History

```text
Service History
= apa yang sudah terjadi

Maintenance
= apa yang harus dilakukan selanjutnya
```

Namun completed maintenance menghasilkan history.

---

# 113. Maintenance vs Asset

```text
Asset
= objek

Maintenance
= aktivitas perawatan terhadap objek
```

---

# 114. Maintenance vs Warranty

```text
Maintenance
= scheduled care

Warranty
= protection / coverage
```

Maintenance compliance dapat menjadi condition warranty.

---

# 115. Maintenance vs Smart Recommendation

Feature #16 menentukan kebutuhan maintenance dan konteks waktunya.

Feature #18 dapat membantu:

- provider recommendation
- service recommendation
- timing recommendation
- alternative recommendation

---

# 116. Maintenance vs Product Integration

Feature #16 dapat menemukan kebutuhan material/product.

Feature #19 menangani product/service integration.

---

# 117. Maintenance State Machine

Main lifecycle:

```text
PLAN CREATED
    ↓
SCHEDULED
    ↓
UPCOMING
    ↓
DUE
    ↓
BOOKED
    ↓
IN SERVICE
    ↓
COMPLETED
    ↓
NEXT SCHEDULE GENERATED
```

Alternative:

```text
DUE
 ↓
SKIPPED
 ↓
OVERDUE
```

---

# 118. Reminder State Machine

```text
SCHEDULED
    ↓
SENT
    ↓
DELIVERED
    ↓
READ
```

Alternative:

```text
SENT
 ↓
SNOOZED
 ↓
RESCHEDULED REMINDER
```

---

# 119. Maintenance Booking State

Maintenance booking menggunakan status booking/order yang telah ditentukan modul #2/#3.

Feature #16 tidak membuat booking state paralel yang bertentangan.

---

# 120. Maintenance Completion State

Completion menggunakan state dari Feature #10.

Feature #16 hanya mengonsumsi hasil:

```text
COMPLETED
```

untuk memperbarui maintenance occurrence.

---

# 121. Maintenance Data Model

Entity utama:

```text
maintenance_plans
maintenance_schedules
maintenance_occurrences
maintenance_records
maintenance_reminders
maintenance_contracts
maintenance_packages
maintenance_preferences
maintenance_events
```

---

# 122. maintenance_plans

Contoh field:

```text
maintenance_plan_id
asset_id
service_id
source_type
source_reference_id
trigger_type
interval_value
interval_unit
usage_threshold
usage_unit
status
start_at
end_at
configuration
created_at
updated_at
```

---

# 123. maintenance_schedules

Contoh field:

```text
maintenance_schedule_id
maintenance_plan_id
due_at
due_usage
status
scheduled_at
completed_at
created_at
updated_at
```

---

# 124. maintenance_occurrences

Contoh field:

```text
occurrence_id
maintenance_plan_id
sequence_number
scheduled_at
due_at
due_usage
completed_at
order_id
status
skip_reason
created_at
updated_at
```

---

# 125. maintenance_records

Contoh field:

```text
maintenance_record_id
asset_id
maintenance_plan_id
occurrence_id
order_id
provider_id
completed_at
status
result
notes
history_reference_id
created_at
```

---

# 126. maintenance_reminders

Contoh field:

```text
reminder_id
maintenance_schedule_id
channel
scheduled_at
sent_at
delivered_at
read_at
status
snoozed_until
failure_reason
created_at
```

---

# 127. maintenance_contracts

Contoh field:

```text
maintenance_contract_id
asset_id
provider_id
start_at
end_at
frequency
terms
status
created_at
updated_at
```

---

# 128. maintenance_packages

Contoh field:

```text
maintenance_package_id
customer_id
provider_id
service_id
total_occurrences
used_occurrences
remaining_occurrences
start_at
end_at
status
```

---

# 129. maintenance_preferences

Contoh field:

```text
user_id
enabled
channel
quiet_hours
reminder_frequency
configuration
updated_at
```

---

# 130. maintenance_events

Contoh event:

```text
MAINTENANCE_PLAN_CREATED
MAINTENANCE_SCHEDULED
MAINTENANCE_DUE
MAINTENANCE_OVERDUE
MAINTENANCE_REMINDER_SENT
MAINTENANCE_REMINDER_READ
MAINTENANCE_SNOOZED
MAINTENANCE_RESCHEDULED
MAINTENANCE_SKIPPED
MAINTENANCE_BOOKED
MAINTENANCE_STARTED
MAINTENANCE_COMPLETED
MAINTENANCE_CANCELLED
```

---

# 131. Required Relationships

Minimal relationship:

```text
asset
  1 ─── N maintenance_plans

maintenance_plan
  1 ─── N maintenance_schedules

maintenance_plan
  1 ─── N maintenance_occurrences

maintenance_schedule
  1 ─── N maintenance_reminders

maintenance_occurrence
  0/1 ─── 1 order

maintenance_occurrence
  0/1 ─── 1 maintenance_record
```

Actual relational design dapat menggunakan junction tables bila domain implementation memerlukannya.

---

# 132. Auditability

Perubahan penting harus dapat dilacak:

- plan created
- interval changed
- schedule recalculated
- reminder sent
- snooze
- reschedule
- skip
- booking
- completion
- cancellation

No silent mutation.

---

# 133. Timezone

Maintenance date/time mengikuti timezone yang relevan terhadap customer/asset/service location.

Timezone harus disimpan atau dapat diturunkan secara konsisten.

---

# 134. Date vs Time

Jika maintenance hanya membutuhkan tanggal:

```text
DUE DATE
```

jangan membuat precision waktu seolah-olah sangat presisi.

Untuk appointment actual:

```text
DATE + TIME
```

mengikuti Booking.

---

# 135. Data Integrity

System harus mencegah:

- duplicate active plan yang identik tanpa alasan
- duplicate occurrence
- duplicate reminder
- next schedule yang terbuat dua kali
- completion occurrence tanpa execution/completion evidence yang diwajibkan

Aturan unik dan idempotency harus diterapkan pada implementation.

---

# 136. Idempotency

Event seperti:

```text
MAINTENANCE_COMPLETED
```

tidak boleh menghasilkan dua next schedules hanya karena event diproses ulang.

---

# 137. Concurrency

Jika customer dan provider melakukan perubahan bersamaan:

- sistem harus memiliki source of truth
- status transition harus tervalidasi
- perubahan conflicting harus tercatat

---

# 138. Notifications Tidak Boleh Menjadi Source of Truth

Reminder bukan sumber kebenaran maintenance.

Source of truth:

```text
Maintenance Plan
Maintenance Schedule
Maintenance Occurrence
```

Notification hanya menyampaikan informasi tersebut.

---

# 139. Maintenance Status Tidak Menggantikan Asset Status

Contoh:

```text
Maintenance = OVERDUE
Asset = ACTIVE
```

Kedua status tetap berbeda.

---

# 140. Maintenance Completion Tidak Sama dengan Order Completion

Contoh:

```text
Maintenance Occurrence
=
IN_SERVICE

Order
=
COMPLETED
```

Tidak boleh mengasumsikan keduanya selalu berubah pada waktu identik tanpa completion rules.

---

# 141. Maintenance Result

Result dapat mencatat:

- completed
- partial
- skipped component
- condition found
- additional recommendation
- failed

Hasil detail mengikuti Execution/Proof/Completion.

---

# 142. Partial Maintenance

Jika hanya sebagian checklist dilakukan:

```text
Partial completion
```

harus mengikuti completion rules.

Occurrence tidak boleh otomatis dianggap fully completed tanpa memenuhi requirement.

---

# 143. Maintenance Failure

Jika maintenance gagal:

```text
Maintenance
→ Execution Failed
```

System tidak otomatis menganggap maintenance completed.

Next schedule generation harus mengikuti hasil dan policy.

---

# 144. Rework

Jika customer meminta rework:

```text
Completion
↓
Issue
↓
Execution/Rework
↓
Proof
↓
Completion
```

Menggunakan infrastructure yang sudah ada.

---

# 145. Maintenance with Inspection

Inspection dapat menjadi bagian dari maintenance.

Contoh:

```text
Inspection
↓
Maintenance Needed
```

Inspection fee mengikuti pricing/payment rules yang berlaku, bukan dibuat khusus oleh #16.

---

# 146. Maintenance Survey

Survey/inspection sebelum maintenance dapat menggunakan mekanisme survey fee dari Feature #4 bila service membutuhkan.

Feature #16 tidak mengubah rule survey fee.

---

# 147. Maintenance Provider Capacity

Provider dashboard dapat membantu melihat beban:

```text
Upcoming Maintenance
```

untuk membantu capacity planning.

---

# 148. Admin Operational Control

Admin dapat:

- mengaktifkan/menonaktifkan maintenance template
- melihat overdue
- memonitor failure
- memonitor reminder
- menangani anomaly
- meninjau policy

Perubahan taxonomy dan master category tetap mengikuti governance category Servio.

---

# 149. CEO / Product Owner Control

CEO/Product Owner dapat menetapkan:

- platform maintenance policy
- mandatory maintenance template
- compliance rules
- reminder defaults
- recurring defaults
- category/service maintenance configuration

Admin menjalankan operasional berdasarkan policy.

---

# 150. Provider Control

Provider dapat mengatur bagian yang memang diperbolehkan, misalnya:

- maintenance service offering
- recommended interval
- service availability
- package
- maintenance contract
- supported asset types
- optional checklist/recommendation

Provider tidak boleh mengubah platform master rule secara sembarangan.

---

# 151. Customer Control

Customer dapat:

- membuat plan personal
- mengaktifkan reminder
- snooze reminder
- reschedule
- skip
- book maintenance
- memilih provider
- melihat history
- mengatur reminder preference

---

# 152. Privacy

Maintenance data dapat mengandung informasi:

- asset
- lokasi
- usage
- service history
- provider
- documents

Akses harus mengikuti Asset access control dan customer authorization.

---

# 153. Provider Access

Provider hanya boleh melihat maintenance/asset data yang memang diperlukan dan diizinkan.

Tidak otomatis mendapat seluruh history customer.

---

# 154. Shared Asset

Asset dapat dimiliki/digunakan beberapa user.

Maintenance visibility mengikuti role/access permission asset.

---

# 155. Enterprise / Multi-Asset

Untuk business/enterprise:

```text
Organization
↓
Multiple Locations
↓
Multiple Assets
↓
Maintenance Plans
↓
Recurring Occurrences
```

Dapat mendukung bulk maintenance management.

---

# 156. Bulk Maintenance

Scale-up dapat menyediakan:

- bulk scheduling
- bulk reminder
- bulk booking
- bulk reporting

Contoh:

```text
20 AC units
↓
Generate quarterly maintenance
```

---

# 157. Maintenance SLA

Untuk maintenance contract/enterprise, SLA dapat mengatur:

- response time
- due window
- resolution time

SLA execution mengikuti modul operasional yang relevan.

---

# 158. Compliance Documentation

Maintenance tertentu dapat menghasilkan:

- inspection certificate
- maintenance certificate
- service report

Dokumen tetap berada dalam Proof/Document infrastructure yang relevan.

---

# 159. External Maintenance

Customer dapat mencatat maintenance yang dilakukan di luar Servio.

Contoh:

```text
Last Service:
Dealer XYZ
```

Imported/external record harus diberi status yang jelas, misalnya:

```text
NOT VERIFIED BY SERVIO
```

Tidak boleh dianggap completed by Servio tanpa transaksi/evidence yang sesuai.

---

# 160. External Maintenance Import

Data external maintenance dapat berasal dari:

- manual entry
- document upload
- provider import
- future integration

Verification harus terpisah dari existence of record.

---

# 161. Maintenance Verification

Servio dapat memiliki status:

```text
VERIFIED
UNVERIFIED
```

untuk record yang berasal dari luar sistem atau sumber tertentu.

---

# 162. Recommendation Explainability

Jika system merekomendasikan maintenance:

```text
Why?
```

harus dapat dijelaskan secara sederhana.

Contoh:

```text
"Maintenance direkomendasikan karena
service terakhir 6 bulan lalu."
```

---

# 163. Reminder Explainability

Reminder due sebaiknya menjelaskan:

```text
AC Cleaning is due
Because:
Last maintenance was 3 months ago.
```

Sumber harus berasal dari plan/schedule.

---

# 164. No False Certainty

Servio tidak boleh menyatakan:

```text
"Asset pasti rusak"
```

hanya karena maintenance overdue.

Bahasa harus sesuai evidence.

---

# 165. Maintenance Localization

Maintenance service dapat mempertimbangkan:

- customer location
- asset location
- service area provider

Location digunakan untuk booking/recommendation, bukan mengubah maintenance identity.

---

# 166. Maintenance Reminder Local Time

Reminder dikirim berdasarkan timezone notification target.

---

# 167. Reminder Failure

Jika notification gagal:

```text
Reminder = FAILED
```

Maintenance tetap:

```text
DUE / OVERDUE
```

Reminder failure ≠ maintenance cancellation.

---

# 168. Reminder Recovery

Notification infrastructure dapat retry.

Retry tidak boleh menghasilkan duplicate reminder.

---

# 169. Due Calculation

Due dapat ditentukan oleh:

```text
DATE
OR
USAGE
OR
EVENT
OR
CONDITION
```

Hybrid menggunakan logic plan.

---

# 170. Completion-Based Next Due

Recurring maintenance biasanya membuat next schedule setelah maintenance selesai.

Contoh:

```text
Completed:
15 April

Interval:
3 months

Next:
15 July
```

Actual calculation mengikuti plan policy.

---

# 171. Usage-Based Next Due

Contoh:

```text
Current:
20.000 km

Interval:
5.000 km

Next:
25.000 km
```

Reminder dapat aktif saat usage mendekati threshold.

---

# 172. Hybrid Next Due

Contoh:

```text
90 days OR 5.000 km
```

yang pertama terpenuhi membuat maintenance due.

---

# 173. Maintenance Warning Window

Servio dapat memiliki reminder windows:

```text
30 days before
7 days before
1 day before
Due
Overdue
```

Exact default dapat dikonfigurasi.

---

# 174. Warning Window vs Due

Warning window hanya reminder state.

Contoh:

```text
7 days before
```

tidak berarti maintenance sudah DUE.

---

# 175. Maintenance Priority

Maintenance dapat memiliki priority:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

Priority dipisahkan dari status.

---

# 176. Safety-Critical Maintenance

Untuk safety-critical asset/service, policy dapat memberikan treatment khusus pada overdue/compliance.

Contoh:

```text
Electrical Safety Inspection
Fire Safety Equipment
```

Platform dapat memberi stronger warning berdasarkan policy.

---

# 177. Customer Experience Principle

Customer harus dapat memahami tiga pertanyaan:

```text
Apa yang harus dirawat?
Kapan harus dirawat?
Bagaimana cara booking?
```

---

# 178. Minimal Customer Flow

```text
My Assets
↓
Select Asset
↓
Maintenance
↓
Upcoming / Due / Overdue
↓
Select Maintenance
↓
View Detail
↓
Book Maintenance
↓
Booking
↓
Order
```

---

# 179. After Service Flow

```text
Order
↓
Execution
↓
Proof
↓
Customer Confirmation
↓
Completed
↓
Service History
↓
Next Maintenance
```

---

# 180. Reminder UX

Notification example:

```text
AC Maintenance Due Soon

Your AC is due for cleaning
in 7 days.

[Book Maintenance]
[Snooze]
```

---

# 181. Due UX

```text
AC Maintenance Due

Maintenance is due today.

Last maintenance:
3 months ago

[Book Now]
[Reschedule]
```

---

# 182. Overdue UX

```text
Maintenance Overdue

This maintenance is past its recommended schedule.

Overdue:
8 days

[Book Maintenance]
[Reschedule]
[View Details]
```

Tidak menggunakan wording yang menyatakan asset pasti rusak.

---

# 183. Maintenance Detail UX

Suggested information hierarchy:

```text
Asset
↓
Maintenance
↓
Why / Source
↓
Last Maintenance
↓
Due
↓
Recommended Service
↓
Provider
↓
Actions
```

---

# 184. Provider UX

Provider maintenance screen dapat menampilkan:

```text
Customer
Asset
Maintenance Type
Due / Scheduled Date
Service
Scope
Booking
History Context
Checklist
```

History visibility mengikuti authorization.

---

# 185. Admin UX

Admin maintenance screen:

```text
Overview
Due
Overdue
Bookings
Failures
Contracts
Packages
Compliance
Analytics
```

---

# 186. Operational Metrics

Contoh KPI:

- Maintenance Completion Rate
- On-Time Rate
- Overdue Rate
- Skip Rate
- Booking Conversion
- Reminder Read Rate
- Recurring Retention
- Maintenance Revenue
- Repeat Provider Rate
- Maintenance Failure Rate

---

# 187. Product Analytics

Data maintenance dapat membantu product decisions:

- service demand
- category demand
- recurring service demand
- high-overdue categories
- low-capacity providers
- frequently replaced materials

---

# 188. Event Analytics

Track:

```text
Plan Created
Reminder Sent
Reminder Read
Book Clicked
Booking Started
Booking Completed
Maintenance Completed
Next Schedule Generated
```

---

# 189. Funnel

Maintenance funnel:

```text
Plan
↓
Reminder
↓
Due
↓
Book
↓
Order
↓
Complete
↓
Next Cycle
```

Metrics dapat dihitung di tiap tahap.

---

# 190. Failure Funnel

Contoh:

```text
Due
↓
No Booking
↓
Overdue
```

atau:

```text
Book
↓
Cancel
↓
No Completion
```

Analytics dapat membantu menemukan friction.

---

# 191. Reminder Effectiveness

Servio dapat mengukur:

```text
Reminder → Booking
```

tanpa menyimpulkan causal effect secara otomatis.

---

# 192. Maintenance Quality

Kualitas service tetap dinilai melalui:

- proof
- completion
- rating
- complaint
- warranty

bukan melalui maintenance status saja.

---

# 193. Maintenance and Rating

Completed maintenance dapat membuka eligibility rating menurut rule Feature #11.

Feature #16 tidak membuat rating sendiri.

---

# 194. Maintenance and Complaint

Issue pada maintenance dapat masuk Complaint/Dispute Feature #12.

Contoh:

```text
Maintenance Completed
↓
Customer finds issue
↓
Complaint
```

---

# 195. Maintenance and Warranty Claim

Jika issue setelah maintenance terkait warranty:

```text
Maintenance History
↓
Warranty Claim
```

Feature #13 menjadi source of truth untuk warranty decision.

---

# 196. Maintenance and Loyalty

Recurring maintenance dapat menjadi input Feature #17:

- rebooking
- favorite provider
- loyalty
- repeat booking

Feature #16 hanya menyediakan recurring context.

---

# 197. Maintenance and Smart Recommendation

Feature #18 dapat menggunakan:

- due state
- asset type
- service history
- provider history
- location
- availability

untuk recommendation.

---

# 198. Maintenance and Product

Feature #19 dapat menggunakan:

- asset type
- component
- maintenance result
- material requirement

untuk product integration.

---

# 199. Maintenance Source of Truth

Source of truth per domain:

| Domain | Source |
|---|---|
| Asset identity | #15 Asset |
| Maintenance rule | #16 Maintenance Plan |
| Maintenance schedule | #16 Maintenance Schedule |
| Reminder | #16 Reminder |
| Booking | #2 Booking |
| Order | #3 Order |
| Price | #4 Pricing |
| Communication | #5 Communication |
| Payment | #6 Payment |
| Execution | #7 Execution |
| Tracking | #8 Tracking |
| Proof | #9 Proof |
| Completion | #10 Completion |
| Rating | #11 Rating |
| Complaint | #12 Dispute |
| Warranty | #13 Warranty |
| History | #14 Service History |
| Recommendation | #18 Smart Recommendation |
| Product | #19 Product Integration |

---

# 200. Boundary Architecture

```text
#15 ASSET
= WHAT

#14 SERVICE HISTORY
= WHAT HAPPENED

#16 MAINTENANCE
= WHAT SHOULD HAPPEN NEXT

#2 BOOKING
= WHEN APPOINTMENT HAPPENS

#3 ORDER
= WHAT IS PURCHASED

#4 PRICING
= HOW MUCH

#6 PAYMENT
= HOW MONEY MOVES

#7 EXECUTION
= HOW SERVICE IS PERFORMED

#9 PROOF
= WHAT EVIDENCE EXISTS

#10 COMPLETION
= WHEN SERVICE IS OFFICIALLY FINISHED
```

---

# 201. Non-Goals

Feature #16 tidak menjadi:

- payment engine
- booking engine
- order engine
- execution engine
- tracking engine
- proof engine
- warranty decision engine
- rating engine
- dispute engine
- product catalog engine
- AI decision maker

---

# 202. Integration Principle

Feature #16 harus **reuse infrastructure existing**.

Jangan membuat:

```text
MaintenanceBookingEngine
MaintenancePaymentEngine
MaintenanceTrackingEngine
```

yang terpisah dan menduplikasi modul utama.

Gunakan modul existing.

---

# 203. Service Lifecycle Integration

Final integration:

```text
ASSET
 ↓
MAINTENANCE PLAN
 ↓
SCHEDULE
 ↓
REMINDER
 ↓
DUE
 ↓
BOOKING
 ↓
ORDER
 ↓
PRICING / PAYMENT
 ↓
EXECUTION
 ↓
TRACKING
 ↓
PROOF
 ↓
COMPLETION
 ↓
SERVICE HISTORY
 ↓
NEXT MAINTENANCE
```

---

# 204. LOCKED PRINCIPLES

Berikut keputusan yang dianggap **LOCKED** untuk Feature #16.

## 1
Maintenance berbasis asset ketika maintenance berkaitan dengan object/serviceable asset.

## 2
Maintenance berbeda dari repair.

## 3
Reminder berbeda dari maintenance.

## 4
Maintenance Plan berbeda dari Maintenance Schedule.

## 5
Maintenance Occurrence berbeda dari Maintenance Plan.

## 6
Feature mendukung time-based maintenance.

## 7
Feature mendukung usage-based maintenance.

## 8
Feature mendukung hybrid trigger.

## 9
Feature dapat mendukung event-based trigger.

## 10
Feature dapat mendukung condition-based maintenance dasar.

## 11
Preventive maintenance menjadi fokus MVP.

## 12
Predictive maintenance merupakan pengembangan scale-up.

## 13
Recurring maintenance adalah fitur inti.

## 14
Occurrence individual dapat dihubungkan ke order.

## 15
Maintenance due dapat menyediakan one-click booking.

## 16
Booking maintenance menggunakan Booking Feature #2.

## 17
Order maintenance menggunakan Order Feature #3.

## 18
Pricing maintenance menggunakan Pricing Feature #4.

## 19
Payment maintenance menggunakan Payment Feature #6.

## 20
Execution maintenance menggunakan Execution Feature #7.

## 21
Tracking maintenance menggunakan Tracking Feature #8 bila service mode membutuhkan.

## 22
Proof maintenance menggunakan Proof Feature #9.

## 23
Completion maintenance menggunakan Completion Feature #10.

## 24
Completed maintenance masuk ke Service History #14.

## 25
Next maintenance schedule dapat dibuat setelah maintenance selesai.

## 26
Overdue maintenance tidak berarti asset rusak.

## 27
Snooze reminder tidak sama dengan reschedule maintenance.

## 28
Dismiss reminder tidak mengubah due/overdue maintenance.

## 29
Personal reminder dipisahkan dari official maintenance plan.

## 30
Provider sebelumnya dapat direkomendasikan tetapi tidak wajib dipilih.

## 31
Maintenance dapat mendukung multiple providers melalui booking/recommendation flow.

## 32
Maintenance dapat menggunakan package.

## 33
Maintenance contract didukung sebagai scale-up capability.

## 34
Maintenance dapat memiliki compliance/safety context.

## 35
Overdue maintenance tidak otomatis membatalkan warranty.

## 36
Warranty decision tetap mengikuti Feature #13.

## 37
Maintenance dapat menghasilkan recommendation untuk repair.

## 38
Additional repair tidak boleh otomatis menjadi pekerjaan berbayar tanpa approval yang sesuai.

## 39
Maintenance dapat menghasilkan product/material need.

## 40
Product transaction tetap mengikuti Product flow.

## 41
Reminder bukan source of truth maintenance.

## 42
Maintenance status tidak menggantikan Asset status.

## 43
Maintenance completion tidak otomatis identik dengan Order completion.

## 44
Maintenance history tidak sama dengan Service History, tetapi completed maintenance dapat menghasilkan history.

## 45
External maintenance dapat dicatat.

## 46
External maintenance harus dapat dibedakan dari maintenance yang dilakukan melalui Servio.

## 47
External maintenance dapat berstatus unverified.

## 48
Notification failure tidak membuat maintenance gagal.

## 49
Duplicate reminder harus dicegah.

## 50
Duplicate next schedule harus dicegah.

## 51
Maintenance event harus idempotent.

## 52
Critical state changes harus audit-able.

## 53
Plan/schedule mutation tidak boleh terjadi secara diam-diam.

## 54
Customer dapat memiliki maintenance personal.

## 55
Customer dapat snooze reminder.

## 56
Customer dapat reschedule maintenance bila policy mengizinkan.

## 57
Customer dapat skip maintenance bila policy mengizinkan.

## 58
Skip sebaiknya memiliki reason.

## 59
Asset retired dapat membuat maintenance menjadi not applicable.

## 60
Asset transfer tidak otomatis mentransfer personal reminder.

## 61
Maintenance plan dapat pause/resume.

## 62
Resume dapat memicu schedule recalculation berdasarkan policy.

## 63
Usage source harus dapat diidentifikasi.

## 64
Usage anomaly dapat ditandai tanpa silent correction.

## 65
AI bersifat assistive.

## 66
AI tidak menjadi source of truth untuk maintenance state.

## 67
AI tidak boleh memutuskan warranty, fault, payment obligation, atau completion secara mandiri.

## 68
Maintenance source harus dapat diketahui.

## 69
Reminder timing dapat dikonfigurasi.

## 70
Reminder channel dapat dikonfigurasi.

## 71
Quiet hours didukung pada notification preference.

## 72
Reminder anti-spam diperlukan.

## 73
Reminder SENT tidak sama dengan READ.

## 74
Maintenance dashboard harus memisahkan Upcoming, Due, dan Overdue.

## 75
Maintenance calendar dapat digunakan untuk visualisasi schedule.

## 76
Customer harus dapat memahami what, when, dan how to book.

## 77
Provider dapat melihat maintenance yang memang menjadi bagian dari relationship mereka.

## 78
Customer history/asset visibility mengikuti access control.

## 79
Shared asset mendukung role-based access.

## 80
Enterprise dapat memiliki multi-asset maintenance.

## 81
Bulk maintenance merupakan scale-up capability.

## 82
Maintenance contract dapat mengikat asset dan provider.

## 83
Maintenance package dapat memiliki total/used/remaining occurrence.

## 84
Maintenance analytics dapat digunakan untuk operational insight.

## 85
Category analytics dapat digunakan untuk demand analysis.

## 86
Maintenance quality tidak ditentukan hanya dari due/completed status.

## 87
Rating menggunakan Feature #11.

## 88
Complaint/Dispute menggunakan Feature #12.

## 89
Warranty claim menggunakan Feature #13.

## 90
Rebooking/Favorite/Loyalty menggunakan Feature #17.

## 91
Smart Recommendation menggunakan Feature #18.

## 92
Product Integration menggunakan Feature #19.

## 93
Maintenance tidak membuat engine pembayaran sendiri.

## 94
Maintenance tidak membuat booking engine sendiri.

## 95
Maintenance tidak membuat order engine sendiri.

## 96
Maintenance tidak membuat execution engine sendiri.

## 97
Maintenance tidak membuat tracking engine sendiri.

## 98
Maintenance tidak membuat proof engine sendiri.

## 99
Maintenance tidak membuat completion engine sendiri.

## 100
Maintenance tidak membuat warranty decision engine sendiri.

## 101
Maintenance plan menjadi source of truth untuk maintenance rule.

## 102
Maintenance schedule menjadi source of truth untuk jadwal due.

## 103
Maintenance occurrence menjadi source of truth untuk individual maintenance cycle.

## 104
Maintenance reminder menjadi notification record, bukan maintenance truth.

## 105
Official maintenance dan personal reminder harus dapat dibedakan.

## 106
Recurring cycle tidak boleh dihapus hanya karena satu occurrence selesai.

## 107
Occurrence completed tidak menghapus maintenance plan.

## 108
Next maintenance adalah hasil dari maintenance lifecycle, bukan reminder semata.

## 109
Maintenance dapat menggunakan multiple trigger types.

## 110
Hybrid trigger dapat menggunakan OR semantics bila didefinisikan pada plan.

## 111
Maintenance dapat memiliki priority.

## 112
Safety-critical maintenance dapat memiliki policy khusus.

## 113
Reminder harus mengikuti timezone yang relevan.

## 114
Date-only maintenance tidak boleh diberi precision waktu palsu.

## 115
Actual appointment timing mengikuti Booking.

## 116
Maintenance cancellation tidak sama dengan completion.

## 117
Maintenance failure tidak sama dengan completion.

## 118
Partial completion harus dapat direpresentasikan bila diperlukan.

## 119
Rework menggunakan execution/proof/completion lifecycle existing.

## 120
Inspection/Survey fee mengikuti Feature #4.

## 121
Maintenance additional cost mengikuti pricing/payment policy.

## 122
No silent financial change.

## 123
Material usage harus dapat dicatat.

## 124
Material source harus dapat diidentifikasi bila diperlukan.

## 125
Maintenance dapat memakai service checklist existing.

## 126
Maintenance proof dapat terdiri dari checklist, photo, measurement, test, report, signature, dan evidence lain yang sesuai.

## 127
Maintenance completion harus mempertahankan audit trail.

## 128
Maintenance record harus dapat ditelusuri ke asset.

## 129
Maintenance record harus dapat ditelusuri ke occurrence bila berasal dari recurring plan.

## 130
Maintenance record dapat direferensikan oleh Service History.

## 131
Maintenance dapat berhubungan dengan warranty policy tanpa mengubah warranty ownership.

## 132
Maintenance dapat memengaruhi warranty eligibility context tetapi bukan keputusan otomatis.

## 133
Provider recommendation tidak bersifat mandatory.

## 134
Service recommendation harus mempertimbangkan compatibility asset.

## 135
Maintenance tidak boleh merekomendasikan service yang tidak compatible hanya karena tersedia.

## 136
Category/subcategory/service tetap mengikuti taxonomy governance Servio.

## 137
Provider tidak membuat arbitrary platform category melalui maintenance.

## 138
Maintenance template platform dapat menjadi source rule.

## 139
Provider recommendation harus dapat dibedakan dari platform/manufacturer recommendation.

## 140
Customer custom maintenance harus diberi label sebagai personal/custom bila bukan official platform rule.

## 141
Imported maintenance harus dapat diberi verification state.

## 142
Servio tidak boleh menyatakan external maintenance sebagai performed by Servio tanpa transaction/evidence.

## 143
Maintenance data harus memiliki privacy controls.

## 144
Location-related maintenance data harus mengikuti access/privacy rules.

## 145
Raw notification logs bukan pengganti maintenance records.

## 146
Event-driven implementation harus mendukung idempotency.

## 147
Concurrent state changes harus divalidasi.

## 148
Maintenance system harus mencegah duplicate occurrence generation.

## 149
Maintenance system harus mencegah duplicate active reminder secara tidak semestinya.

## 150
Maintenance system harus mempertahankan historical records.

## 151
Hard delete terhadap maintenance record yang telah terkait transaction/history tidak diperbolehkan.

## 152
Historical correction menggunakan revision/audit approach.

## 153
Maintenance plan dapat memiliki start/end lifecycle.

## 154
Inactive/expired plan tidak menghasilkan active reminder baru.

## 155
Maintenance package memiliki expiry bila dikonfigurasi.

## 156
Maintenance contract memiliki start/end lifecycle.

## 157
Maintenance contract tidak otomatis menjadi payment subscription kecuali flow subscription memang digunakan.

## 158
Compliance maintenance dapat menggunakan dedicated policy.

## 159
Non-compliance harus memiliki basis rule/evidence.

## 160
Maintenance recommendation harus dapat menjelaskan sumber/alasan bila berasal dari system intelligence.

## 161
No false certainty untuk condition/predictive insight.

## 162
Predictive/IoT bukan MVP dependency.

## 163
MVP tetap usable tanpa IoT.

## 164
Maintenance dapat bekerja tanpa live GPS.

## 165
GPS hanya digunakan bila service mode memerlukan.

## 166
Workshop maintenance menggunakan operational status bila travel tracking tidak relevan.

## 167
Remote maintenance menggunakan session/status yang relevan.

## 168
Mobile/home maintenance dapat menggunakan tracking Feature #8.

## 169
Maintenance booking harus membawa asset context bila applicable.

## 170
Maintenance execution harus membawa maintenance context.

## 171
Maintenance proof harus membawa maintenance context.

## 172
Completion harus meng-update occurrence sesuai result.

## 173
Completed occurrence dapat menghasilkan next schedule.

## 174
Next schedule generation harus mengikuti plan lifecycle.

## 175
Pause/resume tidak boleh menghasilkan duplicate active schedules.

## 176
Reminder schedule harus berhenti ketika maintenance tidak lagi applicable.

## 177
Reminder schedule harus berhenti/adjust ketika plan dibatalkan.

## 178
Customer harus tetap dapat melihat historical maintenance setelah plan dibatalkan.

## 179
Maintenance history tidak boleh dihapus hanya karena plan inactive.

## 180
Maintenance status dan notification status adalah dua state domain berbeda.

## 181
Maintenance schedule dan booking appointment adalah dua domain berbeda.

## 182
Maintenance occurrence dan order adalah dua domain berbeda.

## 183
Maintenance package dan order bukan entity yang sama.

## 184
Maintenance contract dan recurring occurrence bukan entity yang sama.

## 185
Maintenance recommendation dan maintenance plan bukan entity yang sama.

## 186
Maintenance due tidak otomatis berarti customer wajib booking.

## 187
Reminder harus memfasilitasi action, bukan memaksa customer.

## 188
Customer harus memiliki kontrol atas reminder preference.

## 189
Platform dapat menetapkan mandatory notifications untuk kasus tertentu berdasarkan policy.

## 190
Maintenance dapat mendukung external service history references.

## 191
Maintenance analytics tidak boleh menjadi source of truth untuk operational state.

## 192
Analytics dapat berubah/di-recompute tanpa mengubah historical maintenance records.

## 193
Audit event harus memiliki timestamp server.

## 194
Official maintenance completion timestamp berasal dari system record, bukan dari text chat.

## 195
Chat bukan source of truth maintenance state.

## 196
Customer-provider communication dapat membahas maintenance, tetapi official change harus tercatat di domain event/state.

## 197
Additional scope harus melalui approval flow yang sesuai.

## 198
Maintenance package remaining count harus konsisten dengan actual completed occurrence.

## 199
Maintenance contract occurrence count harus dapat diaudit.

## 200
Feature #16 ditetapkan sebagai domain maintenance lifecycle, bukan reminder feature sederhana.

---

# 205. Final Business Flow

## A. Create Maintenance

```text
Asset
↓
Create Maintenance Plan
↓
Define Trigger
↓
Define Interval / Threshold
↓
Define Service
↓
Activate Plan
↓
Generate Schedule
```

---

## B. Upcoming Maintenance

```text
Maintenance Schedule
↓
Upcoming
↓
Reminder
↓
Customer Review
```

---

## C. Maintenance Due

```text
Due
↓
Customer receives reminder
↓
View maintenance detail
↓
Book Maintenance
```

---

## D. Maintenance Booking

```text
Book Maintenance
↓
Select Provider
↓
Select Availability / Schedule
↓
Booking
↓
Order
↓
Pricing
↓
Payment
```

---

## E. Maintenance Execution

```text
Order
↓
Execution
↓
Worker Assignment
↓
Arrival / Service Start
↓
Checklist
↓
Maintenance Work
↓
Testing
↓
Proof
```

---

## F. Customer Confirmation

```text
Proof
↓
Customer Review
↓
Confirm Completion
↓
Maintenance Completed
```

---

## G. Recurrence

```text
Maintenance Completed
↓
Service History Updated
↓
Calculate Next Due
↓
Create Next Occurrence
↓
Schedule Reminder
```

---

# 206. Final Architecture

```text
                    ┌────────────────────┐
                    │       ASSET        │
                    │      #15 Asset     │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ MAINTENANCE PLAN   │
                    │    WHAT & WHEN     │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │     SCHEDULE       │
                    │    WHEN DUE        │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │     REMINDER       │
                    │  NOTIFICATION      │
                    └─────────┬──────────┘
                              │
                              ▼
                           DUE
                              │
                              ▼
                    ┌────────────────────┐
                    │      BOOKING       │
                    │       #2           │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │       ORDER       │
                    │       #3          │
                    └─────────┬──────────┘
                              │
                    ┌─────────┴──────────┐
                    ▼                    ▼
                 PRICING              PAYMENT
                   #4                    #6
                    │                    │
                    └─────────┬──────────┘
                              ▼
                    ┌────────────────────┐
                    │     EXECUTION      │
                    │       #7           │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │      TRACKING      │
                    │       #8           │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │       PROOF        │
                    │       #9           │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │     COMPLETION     │
                    │       #10          │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │  SERVICE HISTORY   │
                    │       #14          │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ NEXT MAINTENANCE   │
                    │     OCCURRENCE     │
                    └────────────────────┘
```

---

# 207. Final Boundary Statement

Feature #16 adalah:

> **sistem perencanaan, penjadwalan, recurring lifecycle, reminder, dan monitoring maintenance terhadap asset sampai menghasilkan maintenance berikutnya.**

Feature #16 bukan:

> booking engine, order engine, payment engine, execution engine, proof engine, completion engine, warranty engine, rating engine, dispute engine, atau product engine.

Semua domain tersebut tetap menggunakan feature yang telah dikunci sebelumnya.

---

# 208. FINAL LOCK STATUS

```text
FEATURE #16
MAINTENANCE & REMINDER

STATUS:
████████████████████ LOCKED

MVP:
Preventive Maintenance
Time-Based
Usage-Based
Hybrid
Recurring
Reminder
Due / Overdue
Maintenance Booking
History Integration

SCALE-UP:
Condition-Based
Predictive Maintenance
IoT Integration
Maintenance Contract
Maintenance Package
Enterprise Bulk Maintenance
Advanced Analytics
```

**Feature #16 resmi menjadi bagian dari Servio Service Lifecycle Roadmap.**
