# SERVIO — FEATURE #13 WARRANTY
## Final Specification — LOCKED

> **Feature #13:** Warranty  
> **Status:** FINAL / LOCKED  
> **Roadmap Position:** Service / Jasa — #13 dari 19  
> **Fokus Utama:** menyediakan sistem perlindungan pasca-service yang mengelola periode warranty, coverage, exclusions, claim, eligibility, inspection, resolution, fulfillment, appeal, dan history secara terstruktur.

---

# 1. Definisi Utama

**Warranty** adalah perlindungan setelah service selesai yang memberikan hak tertentu kepada customer apabila masalah yang memenuhi **periode, coverage, dan syarat warranty** terjadi.

Contoh:

```text
AC Repair
↓
Completed
↓
Warranty 30 Days
↓
15 Days Later
AC kembali bermasalah
↓
Warranty Claim
```

Warranty bukan sekadar tombol `Claim Warranty`.

---

# 2. Tujuan Warranty

### Untuk Customer

1. Mendapatkan perlindungan atas hasil service.
2. Mengetahui masa berlaku.
3. Mengetahui coverage.
4. Mengetahui exclusions.
5. Mengajukan claim.
6. Melihat progress claim.
7. Mengetahui resolution.

### Untuk Provider

8. Menentukan scope tanggung jawab.
9. Mengelola warranty claim.
10. Melakukan inspection/rework.
11. Menjaga quality service.

### Untuk Servio

12. Mengelola warranty policy.
13. Mencatat claim.
14. Memonitor warranty performance.
15. Menjadi escalation layer jika diperlukan.
16. Menganalisis quality service.

---

# 3. Warranty Bukan Janji “Tidak Akan Rusak”

Prinsip:

```text
Warranty
≠
Guarantee bahwa asset tidak akan rusak lagi
```

Warranty hanya berlaku pada kondisi yang memenuhi:

- coverage
- period
- terms
- exclusions
- eligibility criteria

---

# 4. Service Warranty vs Product Warranty

Warranty harus dibedakan menjadi:

### Service Warranty

Perlindungan terhadap service/workmanship dari provider.

Contoh:

```text
AC Repair
→ Workmanship Warranty
```

### Product / Manufacturer Warranty

Perlindungan terhadap product/part dari merchant/manufacturer.

Contoh:

```text
Replacement Capacitor
→ Manufacturer Warranty
```

Jadi:

```text
Service Warranty
≠
Product Warranty
```

---

# 5. Warranty Ownership

Pihak yang bertanggung jawab mengikuti sumber warranty.

```text
SERVICE_WARRANTY
→ Provider

PRODUCT_WARRANTY
→ Merchant / Manufacturer
```

Servio mengelola workflow dan data terkait, tetapi tidak otomatis menjadi penanggung semua warranty.

---

# 6. Warranty Source

Warranty dapat berasal dari:

```text
PLATFORM
PROVIDER
PRODUCT_MANUFACTURER
MERCHANT
CONTRACT
```

Core MVP:

```text
Provider Service Warranty
```

---

# 7. Platform Warranty Policy

Hierarki konfigurasi:

```text
Servio
↓
Category
↓
Subcategory
↓
Service
↓
Provider Offering
↓
Warranty Policy
```

Jika platform menetapkan minimum warranty requirement, provider tidak dapat menghilangkannya.

---

# 8. Provider Warranty Configuration

Provider dapat mengatur parameter yang diizinkan.

Contoh:

```text
Warranty:
30 Days
```

atau:

```text
Warranty:
7 Days
```

Semua tetap mengikuti minimum platform policy jika ada.

---

# 9. Warranty Length

Warranty dapat berbentuk:

- hari
- minggu
- bulan
- service cycle
- mileage
- usage

Contoh:

```text
30 Days
```

atau:

```text
5,000 km
```

---

# 10. Time-based Warranty

Contoh:

```text
Completed:
19 Sept 2026

Warranty:
30 Days

Expires:
19 Oct 2026
```

---

# 11. Usage-based Warranty

Untuk automotive:

```text
30 days OR 1,000 km
```

Warranty berakhir ketika kondisi pertama terpenuhi sesuai policy.

---

# 12. Hybrid Warranty

Contoh:

```text
90 days OR 5,000 km
```

Hybrid sangat relevan untuk automotive.

---

# 13. Warranty Start

Default:

```text
ORDER COMPLETED
↓
WARRANTY START
```

Completion #10 menjadi anchor awal warranty.

---

# 14. Warranty End

Sistem menyimpan:

```text
warranty_end_at
```

dan jika usage-based:

```text
usage_limit
usage_current
```

---

# 15. Warranty Active

Warranty berada pada:

```text
ACTIVE
```

selama:

- period masih berlaku
- coverage aktif
- policy memenuhi
- warranty belum expired

---

# 16. Warranty Status

Status utama:

```text
NOT_STARTED
ACTIVE
CLAIM_SUBMITTED
UNDER_REVIEW
INSPECTION_REQUIRED
ELIGIBLE
REPAIR_IN_PROGRESS
REPLACEMENT_IN_PROGRESS
RESOLUTION_PENDING
APPROVED
REJECTED
EXPIRED
FULFILLED
CLOSED
```

---

# 17. Status Meaning

### `NOT_STARTED`

Warranty belum dimulai.

### `ACTIVE`

Perlindungan aktif.

### `CLAIM_SUBMITTED`

Customer telah mengajukan claim.

### `UNDER_REVIEW`

Eligibility sedang diperiksa.

### `INSPECTION_REQUIRED`

Inspection diperlukan.

### `ELIGIBLE`

Claim memenuhi eligibility.

### `REPAIR_IN_PROGRESS`

Warranty repair sedang berlangsung.

### `REPLACEMENT_IN_PROGRESS`

Replacement sedang diproses.

### `RESOLUTION_PENDING`

Resolution masih menunggu.

### `APPROVED`

Claim telah disetujui.

### `REJECTED`

Claim tidak memenuhi policy/evidence.

### `EXPIRED`

Warranty telah berakhir.

### `FULFILLED`

Kewajiban warranty telah dipenuhi.

### `CLOSED`

Claim/warranty case telah ditutup.

---

# 18. Warranty Claim

Customer dapat membuat:

```text
Warranty
↓
Claim
```

Claim harus terhubung dengan:

- original order
- service
- completion
- warranty policy
- problem
- evidence

---

# 19. Warranty Claim ≠ Complaint Biasa

Warranty claim berarti:

> customer menggunakan perlindungan berdasarkan warranty yang masih berlaku/eligible.

Complaint berarti:

> customer melaporkan masalah.

Jika warranty claim ditolak dan customer tidak setuju:

```text
Warranty
↓
Complaint / Dispute #12
```

---

# 20. Warranty Eligibility

Eligibility dapat menggunakan:

```text
Order Completed
AND
Warranty Active
AND
Service Covered
AND
Issue Covered
AND
Required Conditions Met
```

---

# 21. Coverage

Coverage menjawab:

> Apa yang sebenarnya ditanggung?

Contoh:

```text
AC Repair
Coverage:
- repaired component
- workmanship
```

Coverage tidak otomatis mencakup seluruh asset.

---

# 22. Coverage Scope

Coverage dapat berbentuk:

```text
SERVICE_SCOPE
COMPONENT
PART
WORKMANSHIP
RESULT
```

---

# 23. Workmanship Warranty

Contoh:

```text
Electrical Repair
↓
Workmanship Warranty
```

Warranty berkaitan dengan pekerjaan yang dilakukan provider.

---

# 24. Part Warranty

Part yang diganti dapat memiliki:

```text
Provider Warranty
OR
Manufacturer Warranty
```

Jika manufacturer warranty tersedia, customer dapat diarahkan ke warranty product/part sesuai policy.

---

# 25. Combined Warranty

Satu service dapat mempunyai:

```text
Service Warranty
+
Part Warranty
```

Contoh:

```text
Repair Work:
30 days

Replacement Part:
1 year manufacturer warranty
```

Keduanya harus ditampilkan terpisah.

---

# 26. Exclusions

Warranty harus menjelaskan kondisi yang tidak ditanggung.

Contoh:

- unrelated damage
- misuse
- unauthorized modification
- external damage
- issue outside original scope
- parts outside provider coverage

Daftar final mengikuti policy service/provider.

---

# 27. Warranty Disclosure

Customer harus dapat mengetahui:

```text
Warranty Period
Coverage
Exclusions
Responsible Party
Claim Method
```

Informasi tidak boleh disembunyikan.

---

# 28. Warranty Certificate

Servio dapat menyediakan:

```text
Warranty Certificate
```

yang memuat:

- warranty ID
- order number
- service
- provider
- start date
- expiry date
- coverage
- exclusions
- claim instructions

---

# 29. Warranty Detail Screen

Contoh:

```text
WARRANTY

AC Repair

Status:
Active

Covered Until:
19 Oct 2026

Coverage:
Repair Workmanship

Provider:
ABC Service

[CLAIM WARRANTY]
```

---

# 30. Customer Claim Flow

```text
Warranty Active
↓
Customer detects issue
↓
Open Warranty
↓
Claim Warranty
↓
Describe Issue
↓
Upload Evidence
↓
Submit
↓
Review
```

---

# 31. Customer Claim Information

Customer dapat memberikan:

- problem
- when problem appeared
- what changed
- photo
- video
- description
- current condition

---

# 32. Claim Evidence

Evidence dapat berasal dari:

- customer photo
- customer video
- original proof
- original test result
- service history
- communication
- tracking jika relevan

---

# 33. Existing Evidence Reuse

Customer tidak harus upload ulang proof lama.

Contoh:

```text
Original Proof
↓
Warranty Claim Evidence
```

---

# 34. Warranty Timeline

Customer dapat melihat:

```text
19 Sept
Service completed

19 Sept
Warranty started

05 Oct
Problem reported

05 Oct
Claim submitted

06 Oct
Inspection scheduled
```

---

# 35. Claim Timing Policy

Warranty policy harus menjelaskan apakah eligibility membutuhkan:

- issue terjadi sebelum expiry
- claim dibuat sebelum expiry
- issue dan claim keduanya sebelum expiry
- grace period tertentu

Jangan mengandalkan asumsi.

---

# 36. Post-expiry Claim

Jika claim dibuat setelah expiry:

```text
Warranty Expired
↓
Claim
↓
Check Issue Date
↓
Check Claim Date
↓
Check Grace Period
↓
Eligibility Decision
```

Tidak otomatis diterima atau ditolak tanpa policy.

---

# 37. Grace Period

Platform/provider dapat menyediakan grace period:

```text
Warranty Expired
+
Grace Period
```

Contoh:

```text
Warranty ends:
19 Oct

Claim Grace:
3 days
```

Nilai configurable.

---

# 38. Warranty Inspection

Beberapa claim membutuhkan pemeriksaan.

```text
Claim
↓
Inspection Required
```

---

# 39. Inspection Modes

Inspection dapat:

- remote
- photo/video
- provider visit
- workshop
- third-party inspection

---

# 40. Remote Inspection

Customer dapat memberikan:

- photo
- video
- live video assistance
- diagnostic information

---

# 41. On-site Inspection

Flow:

```text
Warranty Claim
↓
Inspection Booking
↓
Provider Visit
↓
Inspection
↓
Eligibility Decision
```

---

# 42. Workshop Inspection

Untuk automotive:

```text
Warranty Claim
↓
Vehicle Brought In
↓
Inspection
↓
Diagnosis
```

---

# 43. Warranty Inspection Fee

Inspection pada warranty claim berbeda dari survey fee sebelumnya.

Policy dapat menentukan:

```text
FREE
PAID
CONDITIONAL
```

Bila claim valid, policy dapat menetapkan pihak yang menanggung inspection.

Aturan biaya ini harus dijelaskan kepada customer bila applicable.

---

# 44. Warranty Diagnosis

Provider dapat mencatat:

```text
Problem
Diagnosis
Condition
Possible Cause
```

Contoh:

```text
Customer:
AC kembali tidak dingin.

Diagnosis:
Leak ditemukan pada area yang berkaitan dengan repair sebelumnya.
```

---

# 45. Coverage Check

Diagnosis dibandingkan:

```text
Issue
↓
Original Service
↓
Warranty Coverage
↓
Eligibility
```

---

# 46. Same Issue Rule

Warranty biasanya relevan apabila masalah berkaitan dengan:

- pekerjaan sebelumnya
- component yang diperbaiki
- result yang dijamin

Bukan seluruh kerusakan baru.

---

# 47. Related Issue

Masalah baru dapat dinilai related jika berdasarkan evidence dan policy:

```text
Issue
↓
Related to Original Service
```

---

# 48. Unrelated Issue

Jika tidak related:

```text
Warranty Claim
↓
Not Covered
```

Customer dapat memesan normal service baru jika diperlukan.

---

# 49. Existing Damage

Kondisi sebelum service menjadi baseline.

```text
Before Condition
```

Evidence dari #9 dapat digunakan.

---

# 50. New Damage

Perbandingan:

```text
Before Condition
vs
After Condition
```

dapat digunakan untuk investigation.

Final responsibility tetap mengikuti evidence dan policy.

---

# 51. Misuse

Contoh:

```text
Service Completed
↓
Customer modifies equipment
↓
Issue occurs
```

Misuse dapat menjadi exclusion jika tercantum dalam policy.

---

# 52. Unauthorized Repair

Jika customer melakukan repair pihak lain setelah service:

```text
Original Service
↓
Third-party Repair
↓
Issue
```

Warranty eligibility dapat berubah sesuai policy.

---

# 53. Third-party Intervention

Customer perlu mengetahui bahwa intervensi pihak ketiga dapat memengaruhi coverage jika policy menetapkannya.

---

# 54. Environmental Cause

Contoh:

- banjir
- listrik tidak stabil
- kecelakaan
- benturan
- cuaca ekstrem

Dapat menjadi exclusion atau memerlukan case-specific assessment.

---

# 55. Wear & Tear

Warranty harus dapat membedakan:

```text
Service Failure
vs
Normal Wear & Tear
```

Sangat penting untuk automotive.

---

# 56. Consumable

Untuk consumable seperti:

- filter
- brake pad
- cleaning chemical
- battery consumable

coverage harus dijelaskan secara spesifik.

---

# 57. Warranty Decision

Possible outcome:

```text
ELIGIBLE
PARTIALLY_ELIGIBLE
NOT_ELIGIBLE
PENDING_INFORMATION
```

---

# 58. Partial Eligibility

Contoh:

```text
Repair Workmanship
= Covered

Unrelated New Part
= Not Covered
```

Customer harus menerima breakdown yang jelas.

---

# 59. Warranty Responsibility

Jika claim eligible:

```text
Provider
↓
Warranty Fulfillment
```

Possible action:

- inspection
- rework
- repair
- replacement
- adjustment

---

# 60. Rework

Resolution umum:

```text
Warranty Claim
↓
Eligible
↓
Rework
```

Warranty rework tidak otomatis menjadi commercial order baru.

---

# 61. Replacement

Jika repair/rework tidak memungkinkan:

```text
Warranty Claim
↓
Replacement
```

---

# 62. Replacement Part

Jika part rusak:

```text
Defective Part
↓
Replacement
```

Coverage dapat mengikuti provider warranty atau manufacturer warranty.

---

# 63. Refund

Refund bukan default.

Kemungkinan resolution:

```text
Rework
OR
Replacement
OR
Refund
```

sesuai policy dan eligibility.

---

# 64. Partial Refund

Dapat digunakan bila sebagian service/coverage bermasalah:

```text
Original:
Rp500.000

Affected Scope:
Rp100.000

Resolution:
Partial Refund
```

Financial action dieksekusi Feature #6.

---

# 65. Full Refund

Possible bila:

```text
Service failed
+
Warranty resolution cannot restore agreed result
```

Tetap mengikuti policy/evidence.

---

# 66. Warranty Rejection

Jika tidak eligible:

```text
Claim Rejected
```

Customer harus mendapatkan reason yang jelas.

Contoh:

```text
Not covered because:
The issue is outside the original service scope.
```

---

# 67. Customer Disagrees with Rejection

Flow:

```text
Warranty Rejected
↓
Customer Disagrees
↓
Complaint / Dispute #12
```

---

# 68. Warranty Appeal

Jika policy menyediakan appeal:

```text
Warranty Rejected
↓
Appeal
↓
Review
↓
Final Decision
```

---

# 69. Warranty Appeal vs Dispute

Appeal adalah review lanjutan dari keputusan warranty.

Jika kemudian terjadi formal disagreement:

```text
Warranty
↓
Complaint / Dispute
```

---

# 70. Warranty Execution

Jika claim valid dan membutuhkan pekerjaan:

```text
Warranty Claim
↓
Warranty Execution
↓
Tracking
↓
Proof
↓
Customer Confirmation
↓
Warranty Fulfilled
```

Infrastructure utama tetap menggunakan feature existing.

---

# 71. Warranty Rework ≠ New Commercial Order

Warranty fulfillment merupakan kewajiban warranty jika eligible.

Tidak otomatis membuat customer membayar order baru.

---

# 72. Warranty Tracking

Jika provider datang:

```text
Warranty Execution
↓
Tracking #8
```

Tracking session baru dapat dibuat.

---

# 73. Warranty Proof

Warranty rework membutuhkan evidence:

```text
Warranty Execution
↓
Proof #9
```

---

# 74. Warranty Completion

Jika warranty action selesai:

```text
Warranty Execution
↓
Proof
↓
Customer Confirmation
↓
Warranty Fulfilled
```

Completion infrastructure #10 dapat digunakan kembali bila workflow membutuhkannya.

---

# 75. Warranty Claim Status vs Warranty Status

Satu warranty dapat tetap:

```text
Warranty = ACTIVE
```

sementara:

```text
Claim = UNDER_REVIEW
```

Jadi warranty contract dan claim state harus dipisahkan.

---

# 76. Multiple Warranty Claims

Satu warranty dapat mempunyai beberapa claim selama policy mengizinkan.

```text
Warranty
├── Claim #1
└── Claim #2
```

---

# 77. Repeat Claim

Contoh:

```text
Claim #1
↓
Rework
↓
Issue returns
↓
Claim #2
```

Claim sebelumnya harus tetap tercatat.

---

# 78. Repeat Claim Escalation

Jika issue berulang:

```text
Claim #1
↓
Claim #2
↓
Claim #3
↓
Operations Escalation
```

Dapat memicu root-cause investigation.

---

# 79. Root Cause

Warranty diagnosis dapat memiliki:

```text
ROOT_CAUSE
```

Contoh:

```text
INCORRECT_INSTALLATION
PART_FAILURE
EXTERNAL_DAMAGE
USER_MISUSE
UNKNOWN
```

---

# 80. Unknown Root Cause

Jika root cause belum diketahui:

```text
UNKNOWN
```

lebih baik daripada memaksakan penyebab.

---

# 81. Warranty Provider Response

Provider dapat:

- menerima claim
- meminta inspection
- memberikan diagnosis
- mengajukan coverage assessment
- menyelesaikan rework/replacement

---

# 82. Servio Review

Admin dapat meninjau claim jika:

- customer/provider tidak sepakat
- claim high-risk
- financial impact tinggi
- repeat claim
- safety issue
- suspicious pattern

---

# 83. Warranty Escalation

Flow:

```text
Claim
↓
Provider Review
↓
No Agreement
↓
Servio Review
```

Jika masih diperselisihkan:

```text
Warranty Decision
↓
Complaint / Dispute #12
```

---

# 84. Warranty Communication

Warranty dapat memiliki conversation:

```text
WARRANTY
```

agar komunikasi claim terpisah dari chat service biasa jika diperlukan.

---

# 85. Warranty Notifications

Customer/provider dapat menerima:

```text
Claim Submitted
Inspection Scheduled
Claim Approved
Claim Rejected
Rework Scheduled
Replacement Started
Replacement Completed
Warranty Fulfilled
Claim Closed
```

---

# 86. Warranty SLA

Claim dapat memiliki:

```text
first_response_due_at
inspection_due_at
resolution_due_at
```

Nilai configurable.

---

# 87. Warranty Reminder

Customer dapat melihat:

```text
Your warranty expires in 5 days.
```

Ini adalah informational reminder.

---

# 88. Warranty Expiry Notification

Contoh:

```text
Warranty expires in 7 days.
```

atau:

```text
Warranty expires tomorrow.
```

Notifikasi tidak boleh dipakai untuk memancing claim tanpa dasar.

---

# 89. Warranty Certificate Access

Customer:

```text
My Services
↓
Service History
↓
Warranty
```

---

# 90. Warranty History

Customer dapat melihat:

```text
Warranty
├── Claim #1
│   └── Fulfilled
└── Claim #2
    └── Closed
```

---

# 91. Provider Warranty Dashboard

Provider dapat melihat:

```text
Active Warranties
Open Claims
Inspection Required
Rework In Progress
Expired
Claim Rate
```

---

# 92. Admin Warranty Dashboard

Admin dapat melihat:

```text
Open Claims
High Risk
Repeated Claims
Expiring Soon
Rejected Claims
Appeals
```

---

# 93. Warranty Analytics

Metrics:

- warranty claim rate
- eligible claim rate
- rejected claim rate
- repeat claim rate
- average resolution time
- rework rate
- replacement rate
- refund rate
- warranty cost
- claims by service

---

# 94. Provider Quality Signal

Warranty dapat menjadi quality signal:

```text
Completed Orders
↓
Warranty Claims
↓
Warranty Rate
```

Namun warranty claim tidak otomatis berarti provider buruk.

Analisis harus mempertimbangkan:

- service type
- volume
- claim validity
- external factors
- repeat rate

---

# 95. Service-specific Warranty Analytics

Contoh:

```text
AC Repair
Warranty Claim Rate: ...

AC Cleaning
Warranty Claim Rate: ...

Electrical Repair
Warranty Claim Rate: ...
```

---

# 96. Product / Part Analytics

Jika claim berasal dari part:

```text
Product
↓
Part Replacement
↓
Warranty Claims
```

Servio dapat menganalisis produk/part yang sering terkait claim.

---

# 97. Smart Warranty Detection

Smart system dapat membantu:

> “Claim ini kemungkinan berkaitan dengan service sebelumnya.”

Berdasarkan:

- original service
- issue
- timing
- proof
- asset
- service history

---

# 98. Smart Eligibility Assistance

Contoh:

```text
Warranty Active ✓
Same Service ✓
Issue Related ?
Evidence Complete ✓
```

Output:

```text
Needs Human Review
```

bukan final decision.

---

# 99. AI Root Cause Assistance

AI dapat merangkum kemungkinan cause:

```text
Possible Causes:
1. Installation issue
2. Component failure
3. External factor
```

Hanya sebagai assistance.

---

# 100. AI Tidak Menentukan Warranty Final

AI tidak menjadi final authority untuk:

```text
ELIGIBLE
NOT_ELIGIBLE
REJECTED
```

kecuali suatu kebijakan implementasi secara eksplisit mengizinkan automated decision untuk kondisi tertentu.

Core system tetap memiliki human/policy decision layer untuk kasus yang memerlukan review.

---

# 101. Warranty Fraud Signal

Sistem dapat mendeteksi:

- repeated claims
- same issue berkali-kali
- suspicious evidence
- unusually frequent claims
- third-party intervention

Signal diarahkan untuk review.

---

# 102. Customer Claim Pattern Signal

Sistem dapat melihat pola claim customer untuk operational monitoring.

Tidak otomatis menganggap customer melakukan abuse.

---

# 103. Warranty Privacy

Claim dapat berisi:

- foto rumah
- nomor kendaraan
- serial number
- invoice
- private information

Access harus dibatasi.

---

# 104. Warranty Evidence Retention

Evidence disimpan sesuai kebutuhan:

- warranty duration
- claim period
- dispute period
- operational retention policy

---

# 105. Warranty Audit

Lifecycle harus dapat ditelusuri:

```text
Warranty Created
↓
Warranty Started
↓
Claim Submitted
↓
Evidence Added
↓
Inspection
↓
Decision
↓
Resolution
↓
Fulfilled
```

---

# 106. Warranty Data Model

Entitas utama:

```text
warranties
warranty_policies
warranty_coverages
warranty_exclusions
warranty_claims
warranty_claim_items
warranty_inspections
warranty_resolutions
warranty_appeals
warranty_events
```

---

# 107. `warranties`

Concept:

```text
warranty_id
order_id
provider_id
customer_id
service_id
provider_service_id
source_type
status
start_at
end_at
usage_limit
usage_current
created_at
```

---

# 108. `warranty_policies`

Concept:

```text
warranty_policy_id
service_id
provider_id
duration
duration_unit
usage_limit
usage_unit
coverage_type
terms
status
effective_at
expired_at
```

---

# 109. `warranty_coverages`

Concept:

```text
coverage_id
warranty_policy_id
coverage_type
description
limit
```

---

# 110. `warranty_exclusions`

Concept:

```text
exclusion_id
warranty_policy_id
exclusion_type
description
```

---

# 111. `warranty_claims`

Concept:

```text
claim_id
warranty_id
order_id
customer_id
status
issue_type
description
submitted_at
reviewed_at
resolved_at
```

---

# 112. `warranty_claim_items`

Concept:

```text
claim_item_id
claim_id
issue
coverage_reference
eligibility_status
resolution_status
```

---

# 113. `warranty_inspections`

Concept:

```text
inspection_id
claim_id
inspection_type
scheduled_at
performed_at
performed_by
result
notes
```

---

# 114. `warranty_resolutions`

Concept:

```text
resolution_id
claim_id
resolution_type
description
financial_action
amount
status
created_at
completed_at
```

---

# 115. `warranty_appeals`

Concept:

```text
appeal_id
claim_id
submitted_by
reason
status
submitted_at
decided_at
```

---

# 116. `warranty_events`

Contoh:

```text
WARRANTY_CREATED
WARRANTY_STARTED
CLAIM_SUBMITTED
CLAIM_VIEWED
EVIDENCE_ADDED
INSPECTION_REQUESTED
INSPECTION_COMPLETED
ELIGIBILITY_DETERMINED
CLAIM_APPROVED
CLAIM_REJECTED
REWORK_STARTED
REWORK_COMPLETED
REPLACEMENT_STARTED
REPLACEMENT_COMPLETED
REFUND_REQUESTED
WARRANTY_FULFILLED
CLAIM_CLOSED
WARRANTY_EXPIRED
APPEAL_SUBMITTED
```

---

# 117. Warranty Lifecycle

```text
ORDER COMPLETED
↓
WARRANTY CREATED
↓
WARRANTY ACTIVE
↓
ISSUE OCCURS
↓
CLAIM SUBMITTED
↓
REVIEW
↓
INSPECTION IF NEEDED
↓
ELIGIBILITY
├── NOT ELIGIBLE → CLOSE / APPEAL
└── ELIGIBLE
       ↓
    RESOLUTION
       ├── REWORK
       ├── REPLACEMENT
       └── REFUND
       ↓
    FULFILLED
       ↓
     CLOSED
```

---

# 118. Warranty + Complaint / Dispute

```text
Warranty Claim
↓
Eligibility Decision
↓
Rejected
↓
Customer Disagrees
↓
Complaint / Dispute #12
```

---

# 119. Warranty + Completion

Original service:

```text
Completion #10
↓
Warranty Starts
```

Warranty rework:

```text
Warranty Claim
↓
Execution
↓
Proof
↓
Customer Confirmation
↓
Warranty Fulfilled
```

---

# 120. Warranty + Proof

```text
Original Proof
+
Warranty Proof
```

Original proof menjadi baseline; warranty action menghasilkan evidence baru.

---

# 121. Warranty + Tracking

Jika warranty membutuhkan visit:

```text
Warranty Execution
↓
Tracking #8
```

Tracking session dapat dibuat baru.

---

# 122. Warranty + Service History

Warranty claim menjadi bagian dari context service history.

Contoh:

```text
AC Repair
19 Sept

Warranty Claim
05 Oct

Rework
06 Oct
```

---

# 123. Warranty + Asset

```text
Asset
↓
Service
↓
Warranty
```

Contoh:

```text
Vehicle ABC
↓
Brake Repair
↓
Warranty 30 Days
```

---

# 124. Warranty + Product

Jika part baru memiliki manufacturer warranty:

```text
Service
↓
Part Used
↓
Product Warranty
```

Detail product integration berada di Feature #19.

---

# 125. Warranty + Payment

Warranty claim valid tidak otomatis berarti refund.

Jika resolution memerlukan money movement:

```text
Warranty Resolution
↓
Payment #6
```

---

# 126. Warranty + Rating

Jika customer sudah memberikan rating sebelum warranty claim:

```text
Rating
↓
Warranty
```

Rating sebelumnya tidak otomatis diubah.

---

# 127. Warranty + Smart Recommendation

Warranty history dapat menjadi input recommendation:

```text
Warranty History
↓
Smart Recommendation
```

contoh rekomendasi recheck/maintenance yang relevan.

---

# 128. Customer Experience Principle

Customer harus selalu mengetahui:

```text
Current Status
Next Action
Responsible Party
Expected Timeline
```

---

# 129. No Silent Status

Jangan hanya tampilkan:

```text
UNDER_REVIEW
```

Lebih baik:

> Claim sedang diperiksa. Kami akan memberikan update setelah pemeriksaan selesai.

---

# 130. Warranty Case Communication

Timeline dapat menunjukkan:

```text
Claim Submitted
↓
Provider Response
↓
Inspection
↓
Decision
↓
Resolution
```

Customer dapat mengikuti tahapnya.

---

# 131. FINAL LOCKED PRINCIPLES

1. Warranty adalah post-service protection system.
2. Warranty bukan jaminan asset tidak akan rusak lagi.
3. Warranty berbasis coverage, period, terms, dan exclusions.
4. Service Warranty dan Product Warranty harus dipisahkan.
5. Service Warranty umumnya menjadi tanggung jawab provider.
6. Product/Manufacturer Warranty mengikuti merchant/manufacturer/product party.
7. Servio mengelola workflow dan data, bukan otomatis menjadi penanggung semua warranty.
8. Warranty dapat berasal dari platform, provider, merchant, manufacturer, atau contract.
9. Platform dapat menetapkan minimum warranty requirement.
10. Provider tidak dapat menghilangkan mandatory minimum policy.
11. Warranty length dapat time-based.
12. Warranty length dapat usage-based.
13. Warranty dapat menggunakan kombinasi time dan usage.
14. Warranty dimulai setelah original order completed sesuai default policy.
15. Warranty mempunyai end condition.
16. Warranty memiliki status sendiri.
17. Warranty dan Warranty Claim harus dipisahkan state-nya.
18. Satu warranty dapat memiliki beberapa claim sesuai policy.
19. Customer dapat mengajukan warranty claim.
20. Claim harus terhubung dengan original order/service.
21. Claim harus mempunyai problem description.
22. Claim dapat mempunyai evidence.
23. Existing proof dapat digunakan kembali.
24. Claim timing policy harus eksplisit.
25. Post-expiry claim membutuhkan eligibility check.
26. Grace period dapat digunakan.
27. Warranty coverage harus dijelaskan.
28. Coverage tidak otomatis mencakup seluruh asset.
29. Exclusions harus dijelaskan.
30. Warranty disclosure harus tersedia bagi customer.
31. Warranty certificate dapat disediakan.
32. Warranty dapat mencakup workmanship.
33. Warranty dapat mencakup component.
34. Warranty dapat mencakup part.
35. Service dan part warranty dapat berjalan bersamaan.
36. Warranty claim dapat membutuhkan inspection.
37. Inspection dapat remote.
38. Inspection dapat on-site.
39. Inspection dapat workshop.
40. Inspection dapat menggunakan third-party jika policy memungkinkan.
41. Inspection fee adalah policy terpisah.
42. Inspection fee berbeda dari survey fee.
43. Warranty diagnosis harus dapat dicatat.
44. Eligibility membandingkan issue dengan original service.
45. Same issue/relevant issue dapat menjadi coverage requirement.
46. Unrelated issue tidak otomatis covered.
47. Existing damage menjadi baseline evidence.
48. New damage dapat dibandingkan dengan before/after evidence.
49. Misuse dapat menjadi exclusion.
50. Unauthorized repair dapat memengaruhi eligibility.
51. Third-party intervention dapat memengaruhi coverage.
52. Environmental cause dapat menjadi exclusion atau assessment case.
53. Wear and tear harus dapat dibedakan.
54. Consumable coverage harus jelas.
55. Warranty decision dapat berupa eligible.
56. Warranty decision dapat berupa partially eligible.
57. Warranty decision dapat berupa not eligible.
58. Warranty decision dapat membutuhkan information tambahan.
59. Eligible warranty dapat menghasilkan rework.
60. Eligible warranty dapat menghasilkan repair.
61. Eligible warranty dapat menghasilkan replacement.
62. Refund bukan default warranty resolution.
63. Partial refund dapat digunakan jika policy memungkinkan.
64. Full refund dapat digunakan jika policy memungkinkan.
65. Financial execution tetap berada di Payment #6.
66. Warranty rejection harus mempunyai reason.
67. Customer dapat appeal jika policy menyediakan.
68. Disagreement terhadap warranty dapat masuk Complaint/Dispute #12.
69. Warranty rework bukan otomatis commercial order baru.
70. Warranty rework dapat menggunakan Service Execution #7.
71. Warranty rework dapat menggunakan Tracking #8.
72. Warranty rework dapat menggunakan Proof #9.
73. Warranty rework dapat menggunakan Completion #10.
74. Warranty claim dapat memiliki status independent dari warranty status.
75. Repeat claim harus dapat ditelusuri.
76. Repeated claims dapat memicu escalation.
77. Root cause dapat dicatat.
78. Unknown root cause diperbolehkan.
79. Provider dapat merespons warranty claim.
80. Servio/Admin dapat melakukan review pada case tertentu.
81. Warranty SLA dapat diterapkan.
82. Warranty reminder dapat digunakan.
83. Warranty expiry notification dapat digunakan.
84. Customer dapat melihat warranty detail.
85. Customer dapat melihat warranty history.
86. Provider dapat melihat warranty dashboard.
87. Admin dapat melihat warranty dashboard.
88. Warranty analytics dapat digunakan.
89. Warranty claim rate dapat dianalisis.
90. Warranty resolution time dapat dianalisis.
91. Warranty rework rate dapat dianalisis.
92. Warranty replacement rate dapat dianalisis.
93. Warranty refund rate dapat dianalisis.
94. Warranty cost dapat dianalisis.
95. Warranty quality signal tidak otomatis berarti provider buruk.
96. Product/part warranty dapat dianalisis terpisah.
97. AI dapat membantu warranty detection.
98. AI dapat membantu eligibility assistance.
99. AI dapat membantu root-cause summary.
100. AI dapat membantu anomaly detection.
101. AI tidak menjadi final decision maker untuk eligibility tanpa explicit policy.
102. AI tidak boleh mengarang evidence.
103. Fraud signal membutuhkan review.
104. Customer claim pattern tidak otomatis berarti abuse.
105. Warranty case harus memperhatikan privacy.
106. Warranty evidence memiliki retention policy.
107. Warranty lifecycle harus dapat diaudit.
108. Warranty claim events harus dicatat.
109. Warranty resolution harus dapat ditelusuri.
110. Warranty dapat terhubung dengan asset.
111. Warranty dapat terhubung dengan service history.
112. Warranty dapat terhubung dengan product/part.
113. Warranty dapat terhubung dengan rating.
114. Warranty dapat terhubung dengan smart recommendation.
115. Warranty tidak menggantikan complaint/dispute.
116. Warranty tidak menggantikan proof.
117. Warranty tidak menggantikan tracking.
118. Warranty tidak menggantikan execution.
119. Warranty tidak menggantikan payment.
120. Warranty harus memberikan current status kepada customer.
121. Warranty harus memberikan next action bila diperlukan.
122. Warranty harus menjelaskan responsible party.
123. Warranty harus dapat memberikan expected timeline bila tersedia.
124. Warranty status tidak boleh silent tanpa contextual explanation.
125. **Warranty adalah perlindungan berbasis service/product coverage setelah completion, bukan jaminan bahwa seluruh kerusakan pada asset akan ditanggung.**
126. **Warranty claim memiliki lifecycle sendiri dan menggunakan infrastructure Servio yang sudah ada untuk execution, tracking, proof, dan completion.**
127. **Jika warranty decision diperselisihkan, Complaint/Dispute menjadi escalation path.**
128. **Financial outcomes dari warranty tetap dieksekusi melalui Payment & Protection #6.**
129. **Service Warranty dan Product Warranty harus transparan mengenai pihak yang bertanggung jawab dan batas coverage.**
130. **Feature #13 menjadi lapisan perlindungan pasca-service antara Completion dan Service History, sekaligus menjadi sumber data quality feedback untuk lifecycle service Servio.**

---

# 132. Ringkasan Arsitektur Final

```text
#10 COMPLETION
      ↓
WARRANTY CREATED
      ↓
WARRANTY ACTIVE
      ↓
     ISSUE
      ↓
WARRANTY CLAIM
      ↓
REVIEW / INSPECTION
      ↓
ELIGIBILITY
   ┌──┴──────────────┐
   ↓                 ↓
ELIGIBLE         NOT ELIGIBLE
   ↓                 ↓
RESOLUTION       CLOSE / APPEAL
   │                 │
   ├── REWORK       └── #12 DISPUTE
   ├── REPAIR
   ├── REPLACEMENT
   └── REFUND
          ↓
   #7 EXECUTION
          ↓
      #9 PROOF
          ↓
 #10 CONFIRMATION
          ↓
   WARRANTY FULFILLED
          ↓
       CLOSED
```

Post-service relationship:

```text
#10 COMPLETION
      ↓
#11 RATING & REVIEW
      ↓
#12 COMPLAINT / DISPUTE
      ↓
#13 WARRANTY
      ↓
#14 SERVICE HISTORY
```

---

# 133. Konsep Final Singkat

> **Warranty adalah sistem perlindungan pasca-service yang mengatur periode, coverage, exclusions, claim, eligibility, inspection, resolution, fulfillment, dan appeal ketika masalah yang relevan muncul setelah service selesai. Warranty tidak berarti semua kerusakan ditanggung dan tidak otomatis menghasilkan refund. Warranty Service dan Product Warranty dipisahkan berdasarkan pihak yang bertanggung jawab, sementara pelaksanaan rework, tracking, proof, completion, dan financial action tetap menggunakan infrastructure feature Servio yang sudah ada.**

---

## STATUS FINAL

**FEATURE #13 — WARRANTY ✅ LOCKED**

Dokumen ini menjadi baseline untuk:

- UI/UX
- PRD
- Database
- API
- Customer Flow
- Provider Flow
- Admin Flow
- Warranty Policy
- Warranty Claim Workflow
- Inspection Workflow
- Rework / Replacement Workflow
- Payment / Refund Integration
- Complaint / Dispute Escalation
- Asset Integration
- Service History Integration
- Product / Part Warranty Integration
- Warranty Analytics
