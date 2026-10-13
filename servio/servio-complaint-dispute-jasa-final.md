# SERVIO — FEATURE #12 COMPLAINT / DISPUTE
## Final Specification — LOCKED

> **Feature #12:** Complaint / Dispute  
> **Status:** FINAL / LOCKED  
> **Roadmap Position:** Service / Jasa — #12 dari 19  
> **Fokus Utama:** menyediakan jalur resmi untuk melaporkan masalah, mengumpulkan evidence, melakukan klarifikasi, investigasi, negosiasi, menentukan resolution, mengelola appeal, dan menutup case dengan audit trail yang jelas.

---

# 1. Definisi Utama

**Complaint / Dispute** adalah sistem penyelesaian masalah yang menangani konflik atau laporan masalah yang muncul selama maupun setelah service.

Dua konsep utama:

### Complaint

Laporan bahwa customer atau provider mengalami masalah.

Contoh:

> “AC masih tidak dingin.”

### Dispute

Perselisihan yang membutuhkan proses formal karena para pihak belum sepakat atau issue memiliki dampak material.

Contoh:

> Customer meminta refund karena service dianggap gagal, sedangkan provider menyatakan pekerjaan sudah sesuai scope.

Prinsip:

```text
Complaint = Problem Report
Dispute   = Formal Resolution Case
```

---

# 2. Tujuan Feature #12

Sistem harus dapat:

1. menerima laporan masalah
2. mengklasifikasikan masalah
3. mengumpulkan evidence
4. meminta klarifikasi
5. memberi kesempatan response kepada pihak lain
6. membantu negosiasi
7. menahan financial settlement bila diperlukan
8. menentukan resolution
9. mencatat keputusan
10. menyediakan appeal
11. menjaga audit trail
12. memastikan issue tidak hilang tanpa penyelesaian

---

# 3. Complaint Tidak Otomatis Menjadi Dispute

Flow:

```text
Complaint
↓
Triage
↓
Can be resolved simply?
├── YES → Resolve
└── NO → Dispute
```

Tujuannya agar issue sederhana tidak selalu masuk jalur formal yang berat.

---

# 4. Kapan Complaint Bisa Dibuat?

Complaint dapat dibuat dari:

- Booking
- Order
- Service Execution
- Proof
- Completion
- Rating
- Service History
- Warranty shortcut
- Help / Support

Konteks complaint harus tetap jelas.

---

# 5. Kapan Dispute Dibuat?

Dispute dapat dibuat ketika:

- customer dan provider tidak sepakat
- issue memiliki dampak material
- membutuhkan keputusan platform
- terdapat financial disagreement
- scope pekerjaan diperdebatkan
- quality hasil diperdebatkan

---

# 6. Complaint Actor

Aktor yang dapat terlibat:

```text
CUSTOMER
PROVIDER
AUTHORIZED_RECIPIENT
ADMIN
SYSTEM
```

Untuk MVP:

```text
Customer ↔ Provider
Admin = Resolver
```

---

# 7. Complaint Category

Category dikontrol oleh platform.

Contoh:

```text
SERVICE_QUALITY
INCOMPLETE_SERVICE
WRONG_SERVICE
SCOPE_MISMATCH
LATE_SERVICE
NO_SHOW
DAMAGE
MISSING_ITEM
PROOF_ISSUE
PAYMENT_ISSUE
ADDITIONAL_CHARGE
COMMUNICATION
SAFETY
OTHER
```

---

# 8. Service Quality Complaint

Contoh:

> Hasil service tidak sesuai harapan.

Evidence dapat berasal dari:

- Proof
- Before/After
- Testing
- Service Report
- Customer statement

---

# 9. Incomplete Service

Contoh:

```text
Order:
Clean 3 AC

Executed:
2 AC
```

Sistem dapat membandingkan ordered scope dan executed scope.

---

# 10. Wrong Service

Contoh:

```text
Ordered:
AC Repair

Executed:
AC Cleaning
```

Case menggunakan transaction records sebagai source of truth.

---

# 11. Scope Mismatch

Sistem dapat membandingkan:

```text
Ordered Scope
Quoted Scope
Accepted Scope
Executed Scope
```

Chat bukan sumber utama ketika terdapat accepted transaction record.

---

# 12. Late Service

Customer dapat melaporkan keterlambatan.

Evidence dapat berupa:

- appointment
- tracking
- arrival event
- communication

---

# 13. No-show

Dibedakan:

### Provider No-show

Provider tidak datang.

### Customer No-show

Customer tidak tersedia ketika provider datang.

Kedua kondisi membutuhkan treatment berbeda.

---

# 14. Damage Complaint

Contoh:

> Setelah service dilakukan, bagian lain dari perangkat mengalami kerusakan.

Evidence dapat berasal dari:

- before condition
- after condition
- Proof
- Execution notes
- Communication

---

# 15. Missing Item

Untuk pickup/return:

```text
Item Received
↓
Service
↓
Return
↓
Missing Component
```

Case menggunakan asset/item evidence.

---

# 16. Proof Issue

Contoh:

- proof kurang
- foto blur
- testing tidak tersedia
- evidence tidak sesuai
- evidence dianggap tidak merepresentasikan pekerjaan

---

# 17. Payment Issue

Contoh:

- nominal berbeda
- duplicate payment
- payment failed
- refund belum diterima
- unexpected charge

Financial resolution tetap terintegrasi dengan Feature #6.

---

# 18. Additional Charge Complaint

Contoh:

> “Saya tidak pernah menyetujui biaya tambahan ini.”

Evidence:

```text
Quotation
↓
Adjustment
↓
Approval
↓
Payment
↓
Communication
```

---

# 19. Communication Complaint

Contoh:

- provider sulit dihubungi
- response terlalu lama
- komunikasi tidak jelas
- inappropriate communication

Communication history menjadi supporting evidence.

---

# 20. Safety Complaint

Contoh:

- pekerjaan dilakukan dengan cara yang dianggap berbahaya
- kondisi service tidak aman
- tindakan provider menimbulkan safety concern

Safety issue dapat menjadi critical case.

---

# 21. Other

Tetap sediakan:

```text
OTHER
```

dengan deskripsi wajib.

---

# 22. Priority

Complaint dapat memiliki:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

### CRITICAL

Misalnya:

- safety
- severe damage
- substantial financial risk
- security/privacy concern

---

# 23. Priority vs Severity

Bedakan:

```text
PRIORITY = urgency
SEVERITY = impact
```

Jadi priority tinggi tidak berarti customer otomatis benar.

---

# 24. Complaint Status

Candidate final status:

```text
DRAFT
SUBMITTED
TRIAGING
INFO_REQUIRED
PROVIDER_RESPONSE_REQUIRED
CUSTOMER_RESPONSE_REQUIRED
INVESTIGATING
NEGOTIATING
RESOLUTION_PROPOSED
ACCEPTED
REJECTED
ESCALATED
RESOLVED
CLOSED
CANCELLED
```

---

# 25. Status Meaning

### `DRAFT`

Case belum dikirim.

### `SUBMITTED`

Complaint berhasil dibuat.

### `TRIAGING`

Platform menentukan category, priority, severity, dan workflow.

### `INFO_REQUIRED`

Evidence/informasi masih kurang.

### `PROVIDER_RESPONSE_REQUIRED`

Provider harus memberikan response.

### `CUSTOMER_RESPONSE_REQUIRED`

Customer diminta memberikan klarifikasi.

### `INVESTIGATING`

Admin/operations sedang memeriksa.

### `NEGOTIATING`

Para pihak mencoba mencapai penyelesaian.

### `RESOLUTION_PROPOSED`

Solusi telah diajukan.

### `ACCEPTED`

Resolution diterima sesuai workflow.

### `REJECTED`

Proposal ditolak.

### `ESCALATED`

Case dinaikkan ke level yang lebih tinggi.

### `RESOLVED`

Penyelesaian telah dilakukan.

### `CLOSED`

Case sudah ditutup.

---

# 26. Complaint Lifecycle

```text
SUBMITTED
↓
TRIAGING
↓
COLLECT EVIDENCE
↓
OTHER PARTY RESPONSE
↓
INVESTIGATION
↓
RESOLUTION
↓
RESOLVED
↓
CLOSED
```

---

# 27. Dispute Lifecycle

```text
COMPLAINT
↓
DISPUTE CREATED
↓
EVIDENCE COLLECTION
↓
CUSTOMER STATEMENT
↓
PROVIDER STATEMENT
↓
INVESTIGATION
↓
NEGOTIATION
↓
RESOLUTION PROPOSAL
↓
ACCEPTED / ESCALATED
↓
RESOLVED
↓
CLOSED
```

---

# 28. Evidence sebagai Fondasi

Dispute harus dapat menggunakan evidence dari:

- Booking
- Order
- Quotation
- Payment
- Execution
- Tracking
- Proof
- Communication
- Customer upload
- Provider upload
- Service History

---

# 29. Evidence Snapshot

Saat dispute dibuat, sistem sebaiknya menyimpan/reference snapshot terhadap data penting:

```text
Order State
Quotation Version
Proof Version
Payment Status
Tracking Events
```

Tujuannya menjaga konteks historis ketika data utama berubah setelah case dibuat.

---

# 30. Evidence Tidak Otomatis Public

Tidak semua evidence dapat dilihat semua pihak.

Contoh:

```text
CUSTOMER_VISIBLE
PROVIDER_VISIBLE
ADMIN_ONLY
SYSTEM_ONLY
```

---

# 31. Customer Statement

Customer dapat memberikan:

- issue description
- expected resolution
- evidence
- timeline

Contoh:

```text
Problem:
AC masih tidak dingin.

Expected:
Recheck service / repair.
```

---

# 32. Provider Statement

Provider dapat memberikan:

- explanation
- work performed
- scope
- evidence
- response
- proposed resolution

---

# 33. Admin Triage

Admin menentukan:

```text
Category
Priority
Severity
Required Evidence
Required Respondent
SLA
```

---

# 34. Smart Triage

Smart system dapat membantu:

- classify category
- suggest priority
- summarize issue
- detect missing evidence
- surface related records

Namun admin/policy tetap menjadi decision layer.

---

# 35. AI Tidak Menentukan Siapa yang Salah

AI tidak boleh otomatis memutus:

> “Provider salah.”

AI hanya dapat membantu:

- klasifikasi
- summary
- evidence retrieval
- missing evidence detection
- next-action suggestion

---

# 36. Evidence Collection

Case dapat meminta:

```text
Upload Photo
Upload Video
Upload Document
Add Note
Reference Existing Evidence
```

---

# 37. Evidence Deadline

Case dapat memiliki:

```text
customer_response_deadline
provider_response_deadline
evidence_deadline
```

---

# 38. SLA

Case dapat memiliki:

```text
first_response_sla
resolution_sla
```

Nilai waktunya configurable.

---

# 39. Reminder

Jika pihak belum merespons:

```text
Reminder
↓
Escalation
```

Reminder dapat berlaku untuk customer maupun provider.

---

# 40. Escalation

Contoh:

```text
Level 1
Operations

↓ unresolved

Level 2
Senior Operations

↓ unresolved

Level 3
Management / Authorized Decision Maker
```

Role detail mengikuti struktur organisasi Servio.

---

# 41. Financial Hold

Jika dispute memiliki financial risk:

```text
Dispute Open
↓
Payout Hold
```

Payment module dapat menahan payout bila policy mengizinkan.

---

# 42. Escrow Hold

Jika transaksi menggunakan escrow:

```text
DISPUTE
↓
ESCROW ON_HOLD
```

Release/refund mengikuti resolution dan payment policy.

---

# 43. Dispute Tidak Mengubah Payment Sendiri

Feature #12 menentukan:

```text
What resolution should happen
```

Feature #6 menentukan:

```text
How money moves
```

Feature #12 tidak langsung:

- refund
- payout
- payment adjustment
- escrow release

tanpa melalui financial workflow.

---

# 44. Resolution Type

Resolution dapat berupa:

```text
NO_ACTION
EXPLANATION_ACCEPTED
REWORK
PARTIAL_REWORK
ADDITIONAL_SERVICE
PARTIAL_REFUND
FULL_REFUND
CREDIT
PRICE_ADJUSTMENT
PAYOUT_ADJUSTMENT
CASE_CLOSED
ESCALATE
```

---

# 45. Rework

Jika masalah bisa diperbaiki:

```text
Dispute
↓
Resolution = REWORK
↓
New / Rework Execution
↓
Proof
↓
Completion
```

---

# 46. Partial Refund

Jika hanya sebagian scope bermasalah:

```text
Original:
Rp500.000

Affected Scope:
Rp100.000

Resolution:
Partial Refund
```

Nominal dijalankan oleh Payment module.

---

# 47. Full Refund

Untuk case tertentu:

```text
Service Failed
↓
Resolution
↓
Full Refund
```

Eligibility mengikuti policy dan evidence.

---

# 48. Credit

Servio dapat memberikan:

```text
Service Credit
```

sebagai salah satu resolution.

Credit harus dibedakan dari cash refund.

---

# 49. Compensation

Platform dapat memiliki compensation policy seperti:

- fee waiver
- voucher
- credit

Tanggung jawab finansial provider/customer tetap mengikuti policy yang berlaku.

---

# 50. No Action

Case dapat selesai tanpa financial adjustment jika evidence menunjukkan issue tidak memenuhi resolution criteria atau service berjalan sesuai agreement.

---

# 51. Resolution Proposal

Resolution proposal dapat berisi:

```text
outcome
amount
financial_action
reason
required_action
deadline
responsible_party
```

---

# 52. Customer Accept / Reject

Untuk resolution yang membutuhkan agreement:

```text
Resolution Proposed
↓
Customer
├── Accept
└── Reject
```

---

# 53. Provider Accept / Reject

Jika membutuhkan agreement provider:

```text
Provider
├── Accept
└── Reject / Appeal
```

---

# 54. Negotiation

Negotiation dapat terjadi melalui:

```text
Customer
↔
Provider
```

Tetapi final resolution harus disimpan sebagai official case record.

---

# 55. Chat vs Resolution

Chat dapat digunakan untuk komunikasi.

Namun:

```text
Chat ≠ Official Resolution
```

Official resolution harus masuk ke case.

---

# 56. Case Communication

Case dapat mempunyai conversation khusus:

```text
DISPUTE
```

yang terpisah secara konteks dari normal order chat.

---

# 57. Case Attachments

Case dapat menerima:

- photo
- video
- document
- screenshot
- invoice
- report

---

# 58. Case Evidence Linking

Tidak selalu perlu upload ulang.

Case dapat reference:

```text
Proof #123
Tracking Event #456
Quotation v3
Payment Record #789
```

---

# 59. Evidence Chain

Servio harus dapat menelusuri:

```text
Booking
↓
Quotation
↓
Order
↓
Execution
↓
Tracking
↓
Proof
↓
Completion
↓
Complaint
↓
Dispute
```

---

# 60. Order Status During Dispute

Jika dispute critical, order dapat memiliki:

```text
DISPUTED
```

Tetapi:

- payment
- execution
- completion

tetap mempunyai state/domain masing-masing.

Satu status tidak boleh menggantikan seluruh state machine.

---

# 61. Completion Block

Jika dispute terjadi sebelum completion:

```text
Proof Submitted
↓
Blocking Complaint/Dispute
↓
Completion Blocked
```

Setelah case resolved, completion dapat dilanjutkan jika masih eligible.

---

# 62. Dispute After Completion

Jika dispute dibuat setelah order:

```text
COMPLETED
```

historical completion tidak dihapus.

```text
COMPLETED
↓
DISPUTE
```

---

# 63. Complaint dari Rating

Customer dapat masuk ke complaint dari:

```text
1 Star
↓
Having an issue?
↓
Complaint
```

Tetapi:

```text
1 Star ≠ Automatic Dispute
```

---

# 64. Complaint During Execution

Customer dapat melaporkan issue sebelum service selesai.

Contoh:

```text
Service Active
↓
Customer reports wrong service
↓
Complaint
↓
Execution may pause/escalate if policy requires
```

Execution tetap mengelola service state.

---

# 65. Safety Critical Case

Flow:

```text
Complaint
↓
Critical Safety Issue
↓
Execution Safety Stop
↓
Admin Escalation
```

Feature #7 tetap mengelola safety execution state.

---

# 66. Provider Damage Claim

Provider juga dapat membuat case terhadap customer.

Contoh:

> Customer menyebabkan kerusakan equipment provider.

Evidence:

- before condition
- after condition
- communication
- tracking
- service report

---

# 67. Customer No-show Claim

Provider dapat melaporkan:

```text
Provider Arrived
↓
Customer Unavailable
↓
No-show Complaint
```

Tracking dan check-in menjadi supporting evidence.

---

# 68. Cancellation Dispute

Contoh:

```text
Customer Cancelled
↓
Provider claims cancellation fee
↓
Customer disagrees
↓
Dispute
```

Cancellation policy menjadi basis resolution.

---

# 69. Survey Fee Dispute

Contoh:

```text
Survey Completed
↓
Customer Rejects Main Service
↓
Survey Fee Billed
↓
Customer Disagrees
↓
Complaint / Dispute
```

Case memeriksa:

- survey configuration
- fee disclosure
- survey completion
- provider configuration
- payment record

---

# 70. Quotation Dispute

Contoh:

```text
Quotation v1
↓
Quotation v2
↓
Customer accepted v2
↓
Provider claims v1
```

Accepted quotation version menjadi evidence utama.

---

# 71. Scope Evidence Priority

Jika scope diperdebatkan, referensi utama dapat menggunakan:

```text
Accepted Order / Agreement
↓
Accepted Quotation
↓
Service Offering
↓
Execution Record
↓
Proof
↓
Communication
```

---

# 72. Payment Evidence Priority

Untuk financial dispute:

```text
Invoice
↓
Payment Record
↓
Receipt
↓
Ledger
↓
Communication
```

Payment module menjadi source of truth financial.

---

# 73. Completion Evidence Priority

```text
Execution
↓
Proof
↓
Customer Confirmation
↓
Completion Record
```

---

# 74. Admin Decision

Jika resolution tidak tercapai, authorized resolver dapat mengeluarkan decision.

Concept:

```text
decision_id
case_id
decision_type
reason
decided_by
decided_at
```

---

# 75. Decision Transparency

Customer dan provider dapat melihat:

- decision/result
- alasan ringkas
- financial impact jika ada
- action required
- deadline
- appeal availability

Internal investigation notes tetap private.

---

# 76. Appeal

Pihak yang tidak setuju dapat mengajukan appeal jika policy mengizinkan.

Flow:

```text
Decision
↓
Appeal
↓
Higher-level Review
↓
Final Decision
```

---

# 77. Appeal Data

Concept:

```text
appeal_count
appeal_deadline
appeal_status
```

Angka dan batas waktu mengikuti policy.

---

# 78. Final Decision

Setelah appeal final:

```text
FINAL_DECISION
```

Tidak dapat diubah sembarangan kecuali melalui exceptional administrative workflow.

---

# 79. Case Closure

Setelah resolution selesai:

```text
Resolution Completed
↓
Case Resolved
↓
Close
```

Case tidak boleh ditutup sebelum required action selesai.

---

# 80. Resolution Completion Check

Contoh:

```text
Resolution = REWORK

Required:
✓ Rework completed
✓ Proof submitted
✓ Customer confirmed
```

Baru:

```text
RESOLVED
```

---

# 81. Refund Resolution

Jika outcome:

```text
PARTIAL_REFUND
```

case dapat menunggu:

```text
Refund Completed
```

sebelum case benar-benar ditutup bila policy mensyaratkannya.

---

# 82. Payout Adjustment

Jika payout provider ditahan:

```text
Dispute Open
↓
Payout ON_HOLD
↓
Decision
↓
Payment Module
↓
Payout Updated
```

---

# 83. No Double Resolution

Satu case tidak boleh memiliki resolution financial ganda yang saling bertentangan tanpa controlled adjustment.

Contoh yang harus dicegah:

```text
Full Refund
+
Partial Refund
+
Full Credit
```

tanpa workflow resmi.

Final resolution memiliki identifier unik.

---

# 84. Double Claim

Customer/provider tidak boleh menerima compensation berulang dari case yang sama tanpa policy.

Sistem harus mengecek:

```text
Existing Resolution
```

---

# 85. Related Cases

Satu order bisa mempunyai beberapa complaint.

Contoh:

```text
Complaint #1
Late Arrival

Complaint #2
Service Quality
```

Case dapat saling direlasikan.

---

# 86. Case Merge

Admin dapat menggabungkan case yang ternyata merupakan issue yang sama.

History original case tetap dicatat.

---

# 87. Case Split

Jika satu complaint ternyata memiliki masalah berbeda:

```text
Quality Issue
+
Payment Issue
```

dapat menjadi:

```text
Case A → Quality
Case B → Payment
```

dengan relation yang jelas.

---

# 88. SLA Monitoring

Admin dashboard:

```text
Open Cases
High Priority
SLA At Risk
Overdue
Awaiting Provider
Awaiting Customer
```

---

# 89. Case Aging

Sistem dapat menampilkan umur case:

```text
Opened 3 days ago
```

agar case tidak terlupakan.

---

# 90. Escalation Trigger

Case dapat dieskalasikan ketika:

- critical severity
- SLA breach
- repeated failed resolution
- high financial impact
- safety issue
- security/privacy concern
- repeated conflict

---

# 91. Smart Case Summary

AI dapat merangkum case dari records.

Contoh:

> Customer reports incomplete AC service. Provider states all agreed units were serviced. Order and Proof indicate 2 of 3 units were documented.

Summary harus berbasis data yang tersedia.

---

# 92. Evidence Recommendation

AI dapat membantu menunjukkan evidence yang kemungkinan diperlukan:

```text
Missing:
Accepted Quotation
Final Proof
Testing Result
```

---

# 93. Smart Resolution Suggestion

AI dapat menyarankan:

```text
Possible resolution:
Provider rework
```

Namun:

```text
AI Suggestion ≠ Final Resolution
```

---

# 94. Fraud Signal

System dapat mendeteksi signal:

- repeated disputes
- unusual refund patterns
- repeated suspicious claims
- duplicate evidence
- abnormal case behavior

Signal hanya digunakan untuk investigation.

---

# 95. Provider Quality Analytics

Dispute dapat menjadi internal quality signal:

```text
Provider
↓
Completed Orders
↓
Complaint Rate
↓
Dispute Rate
↓
Resolution Rate
```

Tidak otomatis menjadi public accusation.

---

# 96. Customer Quality Analytics

Provider juga dapat memiliki internal signal tentang:

- no-show
- repeated cancellations
- repeated disputes
- suspicious claims

Harus tetap mengikuti policy dan evidence.

---

# 97. Case Privacy

Case dapat mengandung:

- private photos
- invoices
- addresses
- personal communication
- private business data

Access harus dibatasi.

---

# 98. Internal Notes

Admin dapat membuat:

```text
INTERNAL_NOTE
```

yang tidak terlihat customer/provider.

---

# 99. Case Audit Trail

Action utama:

```text
CASE_CREATED
CASE_SUBMITTED
CASE_TRIAGED
EVIDENCE_ADDED
RESPONSE_REQUESTED
RESPONSE_SUBMITTED
INVESTIGATION_STARTED
NEGOTIATION_STARTED
RESOLUTION_PROPOSED
RESOLUTION_ACCEPTED
RESOLUTION_REJECTED
ESCALATED
DECISION_MADE
APPEAL_CREATED
RESOLVED
CLOSED
```

---

# 100. Complaint Data Model

Entitas utama:

```text
complaint_cases
case_parties
case_categories
case_evidence
case_messages
case_actions
case_resolutions
case_decisions
case_appeals
case_events
case_sla
```

---

# 101. `complaint_cases`

Concept:

```text
case_id
case_number
order_id
customer_id
provider_id
type
category
priority
severity
status
opened_at
resolved_at
closed_at
```

---

# 102. `case_parties`

Concept:

```text
case_party_id
case_id
user_id
role
joined_at
left_at
```

---

# 103. `case_evidence`

Concept:

```text
evidence_id
case_id
source_type
source_id
uploaded_by
visibility
created_at
```

Source type dapat:

```text
PROOF
TRACKING
COMMUNICATION
PAYMENT
QUOTATION
ORDER
CUSTOM_UPLOAD
```

---

# 104. `case_messages`

Concept:

```text
message_id
case_id
sender_id
message_type
content
created_at
```

---

# 105. `case_actions`

Concept:

```text
action_id
case_id
actor_id
action_type
reason
created_at
```

---

# 106. `case_resolutions`

Concept:

```text
resolution_id
case_id
resolution_type
financial_action
amount
currency
description
status
created_at
completed_at
```

---

# 107. `case_decisions`

Concept:

```text
decision_id
case_id
decision_type
reason
decided_by
decided_at
```

---

# 108. `case_appeals`

Concept:

```text
appeal_id
case_id
submitted_by
reason
status
submitted_at
decided_at
```

---

# 109. `case_events`

Concept:

```text
CASE_CREATED
CASE_SUBMITTED
CASE_TRIAGED
EVIDENCE_ADDED
RESPONSE_REQUESTED
RESPONSE_SUBMITTED
INVESTIGATION_STARTED
RESOLUTION_PROPOSED
RESOLUTION_ACCEPTED
RESOLUTION_REJECTED
DECISION_MADE
APPEAL_SUBMITTED
CASE_RESOLVED
CASE_CLOSED
```

---

# 110. `case_sla`

Concept:

```text
case_id
first_response_due_at
resolution_due_at
status
breached_at
```

---

# 111. Customer UI

```text
REPORT A PROBLEM

Order:
AC Repair

Issue:
[Service Quality]

Describe your problem:
[................]

Expected resolution:
[Recheck / Rework / Refund / Other]

Add Evidence:
[Photo] [Video] [Document]

[SUBMIT CASE]
```

---

# 112. Customer Case Detail

```text
CASE #DSP-001

Status:
Under Investigation

Issue:
Incomplete Service

Timeline:
✓ Case submitted
✓ Provider responded
● Investigation
○ Resolution
```

---

# 113. Provider UI

```text
CASE #DSP-001

Customer Complaint
Incomplete Service

Customer Statement
...

Order Scope
...

Your Response
[................]

Evidence
[Add Evidence]

[SUBMIT RESPONSE]
```

---

# 114. Admin UI

```text
CASE #DSP-001

Priority: HIGH
Severity: MEDIUM

Customer
Provider
Order
Category
SLA

Evidence
Communication
Proof
Quotation
Payment

[REQUEST INFO]
[PROPOSE RESOLUTION]
[ESCALATE]
[DECIDE]
```

---

# 115. Resolution UI

Admin:

```text
Resolution

○ No Action
○ Rework
○ Partial Refund
○ Full Refund
○ Credit
○ Price Adjustment
○ Other

Reason:
[................]

Financial Impact:
Rp...

[PROPOSE]
```

---

# 116. Customer Decision UI

```text
Proposed Resolution

Provider will perform:
Rework

No additional charge.

[ACCEPT]
[REJECT]
```

---

# 117. Appeal UI

```text
Decision:
Partial Refund

Reason:
...

Do you want to appeal?

[SUBMIT APPEAL]
```

---

# 118. Complaint vs Warranty

### Complaint / Dispute

Menangani:

- disagreement
- service issue
- transaction issue
- scope conflict
- provider/customer conflict

### Warranty

Menangani:

> defect/problem yang masuk ke ketentuan warranty setelah service.

Jadi:

```text
Every Warranty Claim can involve a Complaint,
but not every Complaint is a Warranty Claim.
```

---

# 119. Complaint vs Rating

```text
Rating
=
Feedback / Reputation
```

```text
Complaint
=
Problem Resolution
```

Maka:

```text
1 Star ≠ Automatic Dispute
```

---

# 120. Complaint vs Payment

```text
Complaint
↓
Resolution
↓
Payment Action
```

Bukan:

```text
Complaint
↓
Automatic Refund
```

---

# 121. Complaint vs Proof

```text
Proof → Evidence
Complaint → Resolution Case
```

---

# 122. Complaint vs Completion

### Sebelum completion

```text
Complaint
↓
May Block Completion
```

### Setelah completion

```text
Complaint
↓
Historical Completion Remains
```

---

# 123. Complaint vs Communication

Chat dapat menjadi evidence.

Namun:

```text
Chat ≠ Official Case Resolution
```

---

# 124. Complaint vs Service Execution

Jika resolution adalah rework:

```text
Complaint
↓
Resolution = Rework
↓
Service Execution
```

Execution tetap mengelola pekerjaan.

---

# 125. Complaint vs Service History

Setelah resolution:

```text
Complaint
↓
Resolution
↓
Service History Context
```

Private case information tidak otomatis masuk history.

---

# 126. Complaint vs Asset

Jika dispute menyangkut asset:

```text
Asset
↓
Original Condition
↓
Service
↓
Damage Claim
```

Evidence dapat dikaitkan ke asset.

---

# 127. Financial Resolution Boundary

Feature #12 menentukan:

```text
What should happen
```

Feature #6 menentukan:

```text
How money moves
```

---

# 128. Example — AC Repair Dispute

```text
Customer orders AC Repair
↓
Provider services
↓
Proof submitted
↓
Customer confirms
↓
2 days later problem returns
↓
Complaint
↓
Warranty Eligibility
```

Jika memenuhi warranty:

```text
Complaint
↓
Warranty #13
```

---

# 129. Example — Incomplete Cleaning

```text
Order:
3 AC

Proof:
2 AC

Customer Complaint
↓
Investigation
↓
Scope mismatch confirmed
↓
Resolution:
Rework
↓
Execution
↓
Proof
↓
Completion
```

---

# 130. Example — Extra Charge

```text
Additional Cost
↓
Provider claims Rp150.000
↓
Customer says never approved
↓
Complaint
↓
Check Quotation
↓
Check Approval
↓
Resolution
```

---

# 131. Example — Customer No-show

```text
Provider On The Way
↓
Arrived
↓
Customer unavailable
↓
Provider Complaint
↓
Tracking + Check-in Evidence
↓
Policy Applied
```

---

# 132. Example — Damage Claim

```text
Before Condition
↓
Service
↓
After Condition
↓
Customer claims damage
↓
Complaint
↓
Evidence Investigation
↓
Resolution
```

---

# 133. Example — Pickup Damage

```text
Pickup Proof
↓
Service
↓
Return Proof
↓
Customer reports new damage
↓
Complaint
↓
Compare condition evidence
```

---

# 134. Example — Payment Dispute

```text
Payment
↓
Customer sees unexpected amount
↓
Complaint
↓
Check Invoice
↓
Check Payment
↓
Check Approval
↓
Resolution
↓
Payment Adjustment
```

---

# 135. Example — Provider Appeal

```text
Admin Decision
↓
Provider Disagrees
↓
Appeal
↓
Higher Review
↓
Final Decision
```

---

# 136. Final Case State Machine

```text
SUBMITTED
    ↓
TRIAGING
    ↓
INFO_REQUIRED ───────────┐
    ↓                    │
RESPONSE_REQUIRED        │
    ↓                    │
INVESTIGATING            │
    ↓                    │
NEGOTIATING              │
    ↓                    │
RESOLUTION_PROPOSED      │
    ├── ACCEPTED ────────┘
    ├── REJECTED → ESCALATED
    └── DECISION
             ↓
          APPEAL
             ↓
       FINAL DECISION
             ↓
         RESOLVED
             ↓
          CLOSED
```

---

# 137. FINAL LOCKED PRINCIPLES

1. Complaint adalah problem report.
2. Dispute adalah formal resolution case.
3. Complaint tidak otomatis menjadi dispute.
4. Complaint tidak otomatis menghasilkan refund.
5. Customer dan provider sama-sama dapat membuat case sesuai konteks.
6. Admin/authorized resolver menjadi decision layer.
7. AI hanya membantu, bukan menjadi decision maker.
8. Evidence adalah fondasi dispute.
9. Evidence dapat berasal dari order, quotation, payment, execution, tracking, proof, communication, dan upload baru.
10. Evidence dapat direference tanpa upload ulang.
11. Evidence snapshot menjaga konteks historis.
12. Evidence memiliki visibility level.
13. Customer statement harus terdokumentasi.
14. Provider statement harus terdokumentasi.
15. Complaint category dikontrol platform.
16. Priority menunjukkan urgency.
17. Severity menunjukkan impact.
18. Priority tinggi tidak berarti pihak tertentu otomatis benar.
19. Case memiliki lifecycle/status.
20. Case dapat memiliki SLA.
21. Response deadline dapat diterapkan.
22. Reminder dapat digunakan.
23. Escalation dapat digunakan.
24. Critical safety issue dapat memicu execution safety stop.
25. Financial dispute dapat menyebabkan payout hold sesuai policy.
26. Escrow dapat ditahan sesuai policy.
27. Feature #12 tidak menjalankan payment action secara langsung.
28. Feature #6 tetap menjadi source of truth financial.
29. Resolution dapat berupa rework.
30. Resolution dapat berupa additional service.
31. Resolution dapat berupa partial refund.
32. Resolution dapat berupa full refund.
33. Resolution dapat berupa credit.
34. Resolution dapat berupa price adjustment.
35. Resolution dapat berupa payout adjustment.
36. Resolution dapat berupa no action.
37. Resolution harus mempunyai record resmi.
38. Negotiation boleh dilakukan melalui communication.
39. Chat bukan resolution record.
40. Customer dapat menerima atau menolak resolution bila workflow membutuhkan agreement.
41. Provider dapat menerima, menolak, atau appeal bila workflow membutuhkan.
42. Admin dapat mengeluarkan decision.
43. Decision harus memiliki reason.
44. Decision harus memiliki actor.
45. Decision harus memiliki timestamp.
46. Appeal dapat disediakan.
47. Final decision harus dilindungi dari perubahan sembarangan.
48. Case tidak boleh ditutup sebelum required resolution action selesai.
49. Refund resolution dapat menunggu refund completion.
50. Payout adjustment diproses melalui Payment module.
51. One case tidak boleh memiliki conflicting financial resolutions tanpa controlled workflow.
52. Double compensation harus dicegah.
53. Related cases dapat digunakan.
54. Cases dapat di-merge.
55. Cases dapat di-split.
56. Case aging dapat dipantau.
57. SLA breach dapat memicu escalation.
58. AI dapat membuat case summary.
59. AI dapat merekomendasikan evidence yang kurang.
60. AI dapat menyarankan possible resolution.
61. AI tidak menentukan pihak yang salah.
62. AI tidak menentukan resolution final.
63. Suspicious pattern menjadi signal untuk review.
64. Provider quality analytics dapat menggunakan complaint/dispute data.
65. Customer quality analytics dapat menggunakan relevant case data.
66. Private case information harus dilindungi.
67. Internal notes hanya untuk authorized staff.
68. Case audit trail wajib tersedia.
69. Rating rendah tidak otomatis menjadi dispute.
70. Warranty claim tidak sama dengan complaint biasa.
71. Payment dispute tidak otomatis berarti refund.
72. Proof menjadi evidence, bukan resolution.
73. Completion sebelum dispute dapat diblokir bila case bersifat blocking.
74. Completion setelah dispute tetap menjadi historical record.
75. Rework dapat kembali ke Service Execution.
76. Resolution yang memengaruhi service tetap terhubung ke execution/proof.
77. Resolution yang memengaruhi warranty tetap terhubung ke Warranty.
78. Resolution yang memengaruhi financial tetap terhubung ke Payment.
79. Complaint dapat muncul setelah completion.
80. Historical completion tidak boleh dihapus hanya karena dispute.
81. Case dapat terkait dengan asset.
82. Case dapat terkait dengan service history.
83. Case dapat terkait dengan warranty.
84. Case dapat terkait dengan rating.
85. Customer no-show dan provider no-show harus dibedakan.
86. Cancellation dispute menggunakan cancellation policy.
87. Survey fee dispute menggunakan survey configuration dan payment evidence.
88. Quotation dispute menggunakan accepted quotation version.
89. Scope dispute menggunakan accepted transaction records.
90. Evidence priority harus mengikuti source of truth masing-masing domain.
91. Customer dapat memberikan evidence tambahan.
92. Provider dapat memberikan evidence tambahan.
93. Admin dapat meminta evidence tambahan.
94. Evidence deadlines dapat berbeda antar pihak.
95. Resolution proposal dapat memiliki deadline.
96. Appeal dapat memiliki deadline.
97. Case status harus dapat diaudit.
98. Case actor harus dapat diaudit.
99. Financial result harus dapat ditelusuri ke payment record.
100. Case resolution harus dapat ditelusuri ke official decision/proposal.
101. Case closure harus dapat ditelusuri ke resolution completion.
102. **Complaint / Dispute adalah formal problem-resolution layer Servio yang menggunakan evidence dan policy untuk mencapai resolution tanpa mengambil alih fungsi execution, tracking, proof, completion, rating, warranty, maupun payment.**

---

# 138. Ringkasan Arsitektur

```text
SERVICE / ORDER
       ↓
     ISSUE
       ↓
#12 COMPLAINT
       ↓
    TRIAGE
       ↓
 ┌───────────────┐
 │ Resolved      │
 │ Directly      │
 └───────┬───────┘
         │
         └──────────────→ CLOSED

atau

       ↓
#12 DISPUTE
       ↓
Evidence Collection
       ↓
Customer Statement
       ↓
Provider Statement
       ↓
Investigation
       ↓
Negotiation
       ↓
Resolution
       ↓
Decision / Appeal
       ↓
Resolved
       ↓
Closed
```

Integrasi:

```text
                 #9 PROOF
                     ↓
#8 TRACKING → #12 COMPLAINT / DISPUTE ← #5 COMMUNICATION
                     ↓
                RESOLUTION
               ↙     ↓      ↘
          #7 EXECUTION #6 PAYMENT #13 WARRANTY
                     ↓
                #10 COMPLETION
```

---

# 139. Konsep Final Singkat

> **Complaint / Dispute adalah sistem penyelesaian masalah yang memungkinkan customer maupun provider melaporkan issue, mengumpulkan evidence, memberikan klarifikasi, melakukan investigasi dan negosiasi, menerima resolution, mengajukan appeal, serta menyelesaikan case secara terstruktur dengan audit trail yang jelas. Complaint tidak otomatis menjadi dispute atau refund, AI hanya membantu proses, dan tindakan execution, financial, warranty, proof, tracking, serta completion tetap dikelola oleh feature masing-masing.**

---

## STATUS FINAL

**FEATURE #12 — COMPLAINT / DISPUTE ✅ LOCKED**

Dokumen ini menjadi baseline untuk:

- UI/UX
- PRD
- Database
- API
- Customer Flow
- Provider Flow
- Admin Flow
- Complaint Workflow
- Dispute State Machine
- Evidence Collection
- Resolution Management
- Appeal Workflow
- Payment Hold / Refund Integration
- Rework Integration
- Warranty Integration
- Audit & Operations Analytics
