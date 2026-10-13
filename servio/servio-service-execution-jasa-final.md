# SERVIO — SERVICE EXECUTION JASA
## Master Feature, Business Flow, Business Rules, Status, Data, Execution Matrix, dan Integrasi

> **Status:** Final Concept / Master Specification  
> **Roadmap:** Feature #7 — Service Execution Jasa  
> **Scope:** Pelaksanaan layanan setelah Order dan payment condition terpenuhi sampai provider menyatakan pekerjaan selesai dan menyerahkan proses ke Proof of Service dan Completion.  
> **Boundary:** Feature #7 menjawab **“Provider melakukan apa?”**. Detail live GPS/ETA berada pada Feature #8, bukti formal pekerjaan pada Feature #9, dan final confirmation Order pada Feature #10.

---

# 1. TUJUAN DOKUMEN

Dokumen ini mendefinisikan Service Execution Jasa Servio secara detail sebagai acuan konseptual untuk PRD, database, API, backend, frontend, dashboard provider, dan operasi.

Tujuan utama:
- menentukan kapan execution boleh dimulai;
- mengatur preparation dan worker assignment;
- mengatur task, checklist, material, equipment, issue, pause/resume;
- mengatur arrival, check-in, initial condition, service start, progress, testing, quality check;
- mengatur partial completion, failure, safety stop, rework;
- menentukan completion gate;
- memisahkan Service Completed dari Order Completed;
- mendefinisikan status, event, data, audit trail, matrix, dan integration boundary.

---

# 2. DEFINISI

## 2.1 Service Execution
Seluruh proses ketika provider atau worker benar-benar menjalankan pekerjaan pada Order.

```text
Payment Condition Met
↓
Preparation
↓
Ready
↓
Start Service
↓
In Progress
↓
Task / Checklist
↓
Testing / Quality Check
↓
Service Completed
↓
Completion Submitted
```

## 2.2 Execution vs Tracking

```text
Service Execution = Provider melakukan apa?
Tracking = Customer melihat apa dan di mana?
```

## 2.3 Execution vs Proof

```text
Execution = pekerjaan dilakukan
Proof = bukti pekerjaan
```

## 2.4 Execution vs Completion

```text
Service Completed = pekerjaan operasional selesai
Order Completed = transaksi selesai secara resmi
```

---

# 3. POSISI DALAM EKOSISTEM

```text
DISCOVERY
↓
BOOKING
↓
PRICING / QUOTATION
↓
COMMUNICATION
↓
AGREEMENT
↓
ORDER
↓
PAYMENT / PROTECTION
↓
SERVICE EXECUTION
↓
TRACKING
↓
PROOF OF SERVICE
↓
COMPLETION & CUSTOMER CONFIRMATION
↓
RATING / DISPUTE / WARRANTY / HISTORY
```

---

# 4. EXECUTION PRECONDITION

Execution tidak otomatis dimulai hanya karena Order dibuat.

System memeriksa sesuai kebutuhan service:

```text
Order Valid?
Payment Condition Met?
Provider Ready?
Schedule Valid?
Required Worker Ready?
Required Material Ready?
Required Equipment Ready?
Blocking Issue?
```

Jika seluruh prerequisite yang wajib terpenuhi:

```text
Execution Allowed
```

---

# 5. PREPARATION

Status:

```text
PREPARING
```

Provider dapat:
- membaca customer requirement;
- melihat approved scope dan quotation;
- melihat foto/video;
- menyiapkan alat dan material;
- memilih worker;
- mengecek alamat dan jadwal;
- melakukan pre-check;
- menyiapkan dokumen.

---

# 6. PROVIDER & WORKER MODEL

Servio mendukung:

### Individual Provider
```text
Provider = Worker
```

### Business Provider
```text
Provider
↓
Team / Worker
↓
Assigned Worker
```

Customer tetap melihat provider/business profile sesuai model layanan.

---

# 7. EXECUTION ASSIGNMENT

```text
Order
↓
Execution
↓
Assignment
↓
Worker
```

Status internal:

```text
UNASSIGNED
ASSIGNED
REASSIGN_REQUIRED
```

---

# 8. WORKER ASSIGNMENT HISTORY

Perubahan worker tidak boleh overwrite record lama.

Contoh:

```text
Worker A
10:00–10:45

Worker B
11:00–12:00
```

Simpan assignment history lengkap beserta alasan perubahan.

---

# 9. PREPARATION CHECKLIST

Contoh AC Repair:

```text
☐ Tool kit
☐ Pressure gauge
☐ Cleaning equipment
☐ Spare part
☐ Safety equipment
☐ Requirement reviewed
☐ Address confirmed
```

Checklist dapat berasal dari Service Execution Template.

---

# 10. SERVICE EXECUTION TEMPLATE

```text
Service
↓
Execution Template
├── Tasks
├── Checklist
├── Testing
├── Required Proof
├── Estimated Duration
└── Completion Requirements
```

Template menjadi baseline execution per service.

---

# 11. SERVIO TEMPLATE VS PROVIDER CONFIGURATION

```text
Servio Template / Rules
↓
Provider Service Configuration
↓
Execution Instance
```

Provider dapat menyesuaikan bagian yang memang diizinkan, tetapi mandatory platform requirements tidak boleh dihilangkan.

---

# 12. READY

Setelah preparation selesai:

```text
PREPARING
↓
READY
```

`READY` menandakan provider/worker siap masuk ke tahap perjalanan atau service.

---

# 13. START TRIP / PRE-SERVICE

Untuk Home/Mobile Service:

```text
READY
↓
START TRIP
↓
ON_THE_WAY
```

GPS, ETA, route, dan live location dibahas detail di Feature #8.

---

# 14. ARRIVAL

```text
ON_THE_WAY
↓
ARRIVED
```

Arrival adalah execution event. Detail posisi dan tracking tetap berada di Tracking Domain.

---

# 15. CHECK-IN

```text
ARRIVED
↓
CHECK-IN
```

Data konseptual:

```text
check_in_at
check_in_by
check_in_method
check_in_location
```

Method dapat:

```text
GPS
QR
CUSTOMER_CONFIRMATION
MANUAL
```

sesuai kebutuhan service.

---

# 16. INITIAL INSPECTION

Setelah check-in provider memeriksa kondisi aktual:
- kondisi;
- issue;
- scope;
- measurement;
- existing damage;
- environment;
- requirement.

---

# 17. BEFORE CONDITION

```text
CHECK-IN
↓
INITIAL INSPECTION
↓
BEFORE CONDITION
```

Catatan kondisi awal dapat meliputi description, measurement, note, checklist, photo/video requirement.

Media formal dibahas di Proof of Service.

---

# 18. SCOPE VERIFICATION

```text
Booking / Order Scope
↓
Actual Condition
```

Hasil:

```text
MATCH
SCOPE_DIFFERENCE
```

Jika berbeda, provider tidak boleh langsung menambah biaya atau mengubah scope.

```text
SCOPE_DIFFERENCE
↓
Additional Requirement
↓
Pricing / Adjustment
↓
Customer Approval
```

---

# 19. SERVICE STARTED

```text
CHECK-IN
↓
INITIAL INSPECTION
↓
START SERVICE
↓
STARTED
```

Event:

```text
SERVICE_STARTED
```

---

# 20. IN PROGRESS

```text
STARTED
↓
IN_PROGRESS
```

Provider menjalankan task, checklist, progress update, material handling, issue resolution, dan pekerjaan sesuai approved scope.

---

# 21. TASK-BASED EXECUTION

Satu status `IN_PROGRESS` tidak cukup untuk mengetahui pekerjaan.

Contoh AC Repair:

```text
Inspection
Disassembly
Repair
Component Replacement
Reassembly
Testing
```

---

# 22. TASK STATUS

```text
PENDING
IN_PROGRESS
COMPLETED
SKIPPED
BLOCKED
```

Task mandatory tidak boleh di-skip tanpa aturan yang membolehkannya.

---

# 23. TASK SEQUENCE

Task dapat memiliki `sequence` untuk mengatur urutan.

Contoh:

```text
1 Inspection
2 Disassembly
3 Repair
4 Testing
```

Prerequisite dapat membatasi task berikutnya.

---

# 24. SERVICE CHECKLIST

Contoh AC Cleaning:

```text
☐ Power Off
☐ Protect Area
☐ Clean Indoor
☐ Clean Filter
☐ Clean Outdoor
☐ Check Drainage
☐ Reassemble
☐ Test Cooling
```

---

# 25. CHECKLIST STATUS

```text
PENDING
COMPLETED
NOT_APPLICABLE
BLOCKED
```

Mandatory checklist harus selesai sebelum completion gate jika dipersyaratkan.

---

# 26. PROGRESS PERCENTAGE

Untuk service sederhana progress % tidak wajib.

Project/multi-task dapat menggunakan:

```text
0%
25%
50%
75%
100%
```

Progress percentage adalah indikator, bukan pengganti execution status.

---

# 27. PROGRESS UPDATE

Provider dapat membuat:
- progress note;
- task update;
- progress photo;
- checklist update;
- material update.

Contoh:

> Pembersihan indoor selesai, lanjut outdoor.

---

# 28. EXECUTION EVENTS

Event penting:

```text
PREPARING_STARTED
WORKER_ASSIGNED
READY
TRIP_STARTED
ARRIVED
CHECKED_IN
INITIAL_INSPECTION_COMPLETED
SERVICE_STARTED
TASK_STARTED
TASK_COMPLETED
PAUSED
RESUMED
ADDITIONAL_REQUIREMENT_CREATED
CUSTOMER_APPROVAL_RECEIVED
MATERIAL_RECEIVED
TESTING_STARTED
TESTING_COMPLETED
QUALITY_CHECK_COMPLETED
SERVICE_COMPLETED
COMPLETION_SUBMITTED
```

---

# 29. EXECUTION LOG

Entity:

```text
service_execution_events
```

Data:

```text
event_id
execution_id
order_id
event_type
actor_type
actor_id
description
metadata
created_at
```

Execution log menjadi audit trail pekerjaan.

---

# 30. PAUSE

```text
IN_PROGRESS
↓
PAUSED
```

Reason:

```text
WAITING_MATERIAL
WAITING_CUSTOMER
WAITING_APPROVAL
TECHNICAL_ISSUE
SAFETY_ISSUE
WEATHER
PROVIDER_ISSUE
OTHER
```

---

# 31. RESUME

```text
PAUSED
↓
RESUMED
↓
IN_PROGRESS
```

Simpan:

```text
paused_at
pause_reason
resumed_at
resumed_by
```

---

# 32. BLOCKED

`BLOCKED` berarti execution belum dapat dilanjutkan karena dependency tertentu.

Contoh:

```text
Material Wajib Belum Ada
↓
BLOCKED
↓
Material Ready
↓
IN_PROGRESS
```

Jika tidak terselesaikan:

```text
BLOCKED
↓
FAILED
```

---

# 33. SAFETY STOP

Untuk kondisi berbahaya:

```text
IN_PROGRESS
↓
SAFETY_STOP
↓
Resolution
```

Safety stop harus dicatat lebih serius daripada pause biasa.

---

# 34. SAFETY STOP DATA

```text
safety_stop_reason
severity
reported_by
reported_at
resolution
resolved_at
```

Customer dapat diberi informasi melalui Communication layer sesuai kebutuhan.

---

# 35. ADDITIONAL REQUIREMENT

```text
Actual Condition
↓
Additional Requirement
↓
Pricing / Quotation / Adjustment
↓
Customer Approval
↓
Continue
```

---

# 36. ADDITIONAL COST BOUNDARY

Contoh:

```text
Execution:
"Capacitor rusak."

Pricing:
"Penggantian Rp100.000."

Communication:
"Capacitor perlu diganti karena rusak."

Payment:
"Additional Payment Rp100.000."
```

Setiap domain tetap memiliki tanggung jawab sendiri.

---

# 37. CUSTOMER APPROVAL

Execution dapat berhenti pada:

```text
ACTION_REQUIRED
```

Contoh:

```text
Additional Work
↓
Customer Approval Required
↓
Approved
↓
Resume Execution
```

---

# 38. MATERIAL DEPENDENCY

```text
Execution
↓
Material Required
```

### Available
```text
Material Available
↓
Continue
```

### Unavailable
```text
Material Unavailable
↓
PAUSED / BLOCKED
↓
Procurement
↓
Material Ready
↓
Resume
```

Product integration akan dibahas pada Feature #19.

---

# 39. MATERIAL SOURCE

```text
PROVIDER
CUSTOMER
SERVIO
OTHER
```

---

# 40. CUSTOMER-PROVIDED MATERIAL

Jika customer menyediakan material:

```text
source_type = CUSTOMER
```

Material tetap dicatat karena relevan untuk execution, quality, dan warranty context.

---

# 41. PROVIDER-PROVIDED MATERIAL

```text
source_type = PROVIDER
```

Material dapat dikaitkan dengan order item atau execution material.

---

# 42. SERVIO PRODUCT MATERIAL

Jika material berasal dari marketplace Servio:

```text
Execution
↓
Material Need
↓
Product Discovery
↓
Product Order
↓
Delivery
↓
Material Received
↓
Resume Execution
```

Detail integrasi berada di Feature #19.

---

# 43. EQUIPMENT / TOOL DEPENDENCY

Execution dapat membutuhkan:

```text
Required Equipment
Equipment Ready
Equipment Missing
```

Jika equipment missing:

```text
PAUSED
BLOCKED
atau
REASSIGN
```

sesuai kondisi.

---

# 44. WORKER ISSUE

Contoh worker sakit:

```text
IN_PROGRESS
↓
Worker Issue
↓
Provider Decision
├── Continue
├── Reassign Worker
├── Reschedule
└── Escalate
```

---

# 45. WORKER REASSIGNMENT

```text
Worker A
↓
Cannot Continue
↓
Worker B Assigned
↓
Execution Continues
```

History wajib disimpan.

---

# 46. SERVICE HANDOFF

Handoff tidak otomatis membuat Order baru.

```text
Execution
↓
Worker A
↓
Worker B
↓
Same Order
```

---

# 47. INTERNAL NOTE VS CUSTOMER NOTE

### Internal
- worker note;
- internal operational note;
- tool issue;
- internal cost.

### Customer-facing
- progress;
- public update;
- customer instruction;
- customer-facing issue.

---

# 48. PROGRESS VISIBILITY

Customer tidak harus melihat seluruh data internal.

Customer dapat melihat:

```text
Current Service Status
Current Task
Progress
Public Update
Estimated Completion
```

---

# 49. TESTING

Untuk service yang membutuhkan verifikasi:

```text
Work Done
↓
TESTING
```

Contoh:
- AC: power, airflow, cooling, drainage;
- Electrical: voltage, connection, safety;
- Vehicle: engine, brake, electrical, road test.

---

# 50. TEST RESULT

Entity:

```text
execution_tests
```

Data:

```text
test_id
execution_id
name
result
notes
tested_by
tested_at
```

Result:

```text
PASS
FAIL
PARTIAL
N/A
```

---

# 51. TESTING FAILURE

```text
TESTING
↓
FAIL
↓
IN_PROGRESS
↓
Repair / Fix
↓
Testing Again
```

Mandatory testing yang gagal mencegah completion sesuai gate.

---

# 52. QUALITY CHECK

Checklist:

```text
☐ Scope Completed
☐ Required Tasks Complete
☐ Required Checklist Complete
☐ Required Testing Passed
☐ Area Ready
☐ Customer Requirement Met
```

---

# 53. QUALITY CHECK RESULT

```text
PASSED
FAILED
PARTIAL
```

Jika failed:

```text
FAILED
↓
REWORK
↓
TESTING
↓
QUALITY CHECK
```

---

# 54. REWORK

Rework sebelum completion final masih menjadi bagian execution order yang sama.

```text
Quality Issue
↓
REWORK
↓
Fix
↓
Testing
↓
Quality Check
```

---

# 55. REWORK VS WARRANTY

### Rework
Masih pada completion pertama.

### Warranty
Order telah selesai lalu muncul masalah pada periode warranty.

```text
Completed
↓
Later Issue
↓
Warranty Claim
```

Detail warranty berada di Feature #13.

---

# 56. PARTIAL COMPLETION

Contoh:

> 5 unit dipesan, baru 3 selesai.

```text
PARTIALLY_COMPLETED
```

Data:

```text
completed_quantity = 3
remaining_quantity = 2
```

---

# 57. PARTIAL COMPLETION FLOW

```text
PARTIALLY_COMPLETED
├── Continue
├── Reschedule
└── Adjustment / Resolution
```

---

# 58. PARTIAL COMPLETION FINANCIAL INTEGRATION

Jika ada financial impact:

```text
Partial Completion
↓
Pricing Adjustment
↓
Payment / Refund
```

Detail finansial tetap di Payment & Protection.

---

# 59. EXECUTION FAILURE

```text
IN_PROGRESS
↓
FAILED
```

Data minimal:

```text
failure_reason
failure_description
recommendation
financial_impact
next_action
```

Failure tidak otomatis berarti Order selesai.

---

# 60. BLOCKED VS FAILED

**Blocked:** belum bisa lanjut karena dependency.

**Failed:** pekerjaan gagal/tidak dapat diselesaikan dalam kondisi tersebut.

```text
Material belum tersedia → BLOCKED
Pekerjaan tidak dapat dilakukan → FAILED
```

---

# 61. EXECUTION DEADLINE

Data:

```text
planned_start_at
planned_end_at
```

Project dapat memiliki:

```text
milestone_deadline
```

Classification:

```text
ON_TIME
AT_RISK
DELAYED
```

---

# 62. ACTUAL DURATION

Simpan:

```text
planned_duration
actual_duration
```

Digunakan untuk analytics, provider performance, scheduling, dan future estimation.

---

# 63. EXECUTION DELAY

Bandingkan:

```text
Expected Completion
vs
Actual Progress
```

Output internal:

```text
AT_RISK
DELAYED
```

Customer notification dibahas pada Tracking/Communication.

---

# 64. COMPLETION GATE

Sebelum `COMPLETION_SUBMITTED`, system dapat memeriksa:

```text
Required Tasks Complete?
Required Checklist Complete?
Required Testing Complete?
Quality Check Passed?
Blocking Issue?
Safety Issue?
Additional Cost Resolved?
Required Proof Ready?
```

Jika memenuhi:

```text
SERVICE_COMPLETED
↓
COMPLETION_SUBMITTED
```

---

# 65. SERVICE COMPLETED ≠ ORDER COMPLETED

```text
SERVICE_COMPLETED
↓
PROOF
↓
COMPLETION REVIEW
↓
CUSTOMER CONFIRM
↓
ORDER COMPLETED
```

Provider tidak langsung menutup Order hanya dengan satu tombol tanpa completion process jika service policy memerlukan review.

---

# 66. COMPLETION SUBMISSION

Provider menyerahkan:

```text
work_summary
execution_result
used_materials
final_notes
warranty_information
proof_reference
```

Detail Proof dan Completion menjadi feature terpisah.

---

# 67. EXECUTION STATUS MASTER

```text
NOT_STARTED
PREPARING
READY
STARTED
IN_PROGRESS
PAUSED
BLOCKED
SAFETY_STOP
TESTING
PARTIALLY_COMPLETED
COMPLETION_SUBMITTED
COMPLETED
FAILED
```

Tidak semua service menggunakan semua status.

---

# 68. STATUS TRANSITION UTAMA

```text
NOT_STARTED
→ PREPARING
→ READY
→ STARTED
→ IN_PROGRESS
→ TESTING
→ COMPLETION_SUBMITTED
→ COMPLETED
```

Branch:

```text
IN_PROGRESS
├── PAUSED → IN_PROGRESS
├── BLOCKED → IN_PROGRESS / FAILED
├── SAFETY_STOP → RESOLUTION
├── PARTIALLY_COMPLETED → CONTINUE / COMPLETE
└── FAILED
```

Testing:

```text
TESTING → FAIL → IN_PROGRESS
TESTING → PASS → COMPLETION_SUBMITTED
```

---

# 69. EXECUTION STATE VS ORDER STATE

Contoh:

```text
Execution = IN_PROGRESS
Order = ACTIVE
```

Setelah provider selesai:

```text
Execution = COMPLETION_SUBMITTED
Order = COMPLETION_REVIEW
```

Setelah customer confirm:

```text
Execution = COMPLETED
Order = COMPLETED
```

---

# 70. CUSTOMER JOURNEY

```text
Order Ready
↓
Provider Preparing
↓
On The Way
↓
Provider Arrived
↓
Service Started
↓
Service In Progress
↓
Progress Update
↓
Service Completed
↓
Proof
↓
Completion Review
```

---

# 71. PROVIDER JOURNEY

```text
My Jobs
↓
Order Detail
↓
Review Requirement
↓
Prepare
↓
Assign Worker
↓
Ready
↓
Start Trip
↓
Arrive
↓
Check-in
↓
Initial Inspection
↓
Before Condition
↓
Start Service
↓
Tasks
↓
Checklist
↓
Progress
↓
Testing
↓
Quality Check
↓
Service Completed
↓
Completion Submission
```

---

# 72. ADMIN / OPERATIONS JOURNEY

```text
Active Execution Dashboard
↓
Preparing
↓
On The Way
↓
Arrived
↓
In Progress
↓
Paused / Blocked
↓
Delayed
↓
Failed / Safety Stop
↓
Escalation if needed
```

Admin fokus pada exception dan intervensi yang diizinkan.

---

# 73. EXCEPTION DASHBOARD

Contoh:

```text
Execution Exceptions
⚠ 5 Paused
⚠ 2 Blocked
⚠ 3 Safety Stop
⚠ 4 Delayed
⚠ 1 Failed
```

---

# 74. SERVICE TEMPLATE EXAMPLE — AC CLEANING

```text
Preparation
↓
Check Equipment
↓
Check-in
↓
Before Documentation
↓
Protect Area
↓
Clean Indoor
↓
Clean Filter
↓
Clean Outdoor
↓
Check Drainage
↓
Reassemble
↓
Testing
↓
Quality Check
↓
After Documentation
↓
Service Completed
```

---

# 75. SERVICE TEMPLATE EXAMPLE — AC REPAIR

```text
Preparation
↓
Check-in
↓
Initial Inspection
↓
Diagnosis
↓
Repair Task
↓
Component Replacement if needed
↓
Testing
↓
Quality Check
↓
Service Completed
```

Additional cost:

```text
Diagnosis
↓
Additional Requirement
↓
Customer Approval
↓
Additional Payment
↓
Continue Repair
```

---

# 76. SERVICE TEMPLATE EXAMPLE — CLEANING SOFA

```text
Preparation
↓
Arrival
↓
Check-in
↓
Before Condition
↓
Area Protection
↓
Cleaning
↓
Drying
↓
Quality Check
↓
After Condition
↓
Service Completed
```

---

# 77. SERVICE TEMPLATE EXAMPLE — WORKSHOP

```text
Vehicle Received
↓
Check-in
↓
Initial Inspection
↓
Diagnosis
↓
Quotation Approval
↓
Repair
↓
Parts Replacement
↓
Testing
↓
Road Test
↓
Quality Check
↓
Ready for Pickup
↓
Service Completed
```

---

# 78. SERVICE TEMPLATE EXAMPLE — RENOVATION

```text
Preparation
↓
Site Preparation
↓
Measurement
↓
Material Verification
↓
Milestone Work
↓
Progress
↓
Inspection
↓
Correction / Rework
↓
Milestone Completion
```

---

# 79. EMERGENCY EXECUTION

Emergency dapat menggunakan fast-track:

```text
Emergency Order
↓
Provider Assignment
↓
READY
↓
ON_THE_WAY
↓
ARRIVED
↓
CHECK-IN
↓
Emergency Assessment
↓
Immediate Assistance / Repair
↓
Testing if possible
↓
Service Completed
↓
Completion Submitted
```

---

# 80. INSPECTION EXECUTION

Inspection dapat menjadi execution tersendiri sebelum main service:

```text
Inspection Order
↓
Provider Prepare
↓
On The Way
↓
Arrived
↓
Check-in
↓
Inspect
↓
Measure
↓
Condition Report
↓
Inspection Completed
↓
Quotation
```

---

# 81. RECURRING EXECUTION

```text
Recurring Booking
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

Setiap occurrence mempunyai execution dan history sendiri.

---

# 82. PROJECT EXECUTION

```text
Project Order
↓
Milestone
↓
Preparation
↓
Execution
↓
Progress
↓
Inspection
↓
Approval
↓
Milestone Completed
↓
Next Milestone
```

---

# 83. REMOTE EXECUTION

```text
Order
↓
Preparation
↓
Session Ready
↓
Session Started
↓
Consultation / Assistance
↓
Task / Notes
↓
Session Completed
↓
Report
↓
Completion Submitted
```

Tidak ada physical arrival.

---

# 84. PICKUP & RETURN EXECUTION

```text
Pickup
↓
Item Received
↓
Initial Condition
↓
Processing
↓
Cleaning / Repair
↓
Quality Check
↓
Ready for Return
↓
Return
↓
Delivered
↓
Completion
```

---

# 85. SMART EXECUTION

Smart dapat membantu:

- task suggestion;
- checklist suggestion;
- duration estimation;
- delay detection;
- material suggestion;
- next action suggestion;
- issue classification;
- execution summary.

---

# 86. SMART LIMITATIONS

Smart tidak boleh otomatis:

```text
Change Scope
Change Price
Approve Additional Cost
Mark Service Completed
Approve Warranty
Resolve Dispute
```

tanpa actor berwenang.

---

# 87. SMART OUTPUT PRINCIPLE

Output smart berupa:

```text
Recommendation
Suggestion
Classification
Summary
Estimate
```

Provider tetap dapat:

```text
Accept
Edit
Reject
```

---

# 88. EXECUTION + PRICING

```text
Actual Condition
↓
Additional Requirement
↓
Pricing / Adjustment
↓
Customer Approval
↓
Payment if Needed
↓
Execution Continues
```

---

# 89. EXECUTION + COMMUNICATION

Execution menghasilkan event:

```text
SERVICE_STARTED
PAUSED
RESUMED
ADDITIONAL_REQUIREMENT
COMPLETION_SUBMITTED
```

Communication mengubah event menjadi notification, system message, atau update sesuai policy.

---

# 90. EXECUTION + PAYMENT

```text
Additional Requirement
↓
Adjustment
↓
Customer Approval
↓
Additional Payment
↓
Payment Confirmed
↓
Execution Resumes
```

Jika payment belum terpenuhi, execution dapat `PAUSED` atau `ACTION_REQUIRED` sesuai policy.

---

# 91. EXECUTION + TRACKING

Execution mengeluarkan event:

```text
READY
TRIP_STARTED
ARRIVED
SERVICE_STARTED
IN_PROGRESS
PAUSED
SERVICE_COMPLETED
```

Tracking #8 menggunakan event tersebut untuk customer-facing tracking.

---

# 92. EXECUTION + PROOF

Execution dapat menentukan requirement:

```text
Before Photo Required
After Photo Required
Service Report Required
Testing Evidence Required
```

Proof storage/detail dibahas di #9.

---

# 93. EXECUTION + COMPLETION

```text
Required Execution Requirements
↓
Service Completed
↓
Proof Ready
↓
Completion Submitted
↓
Customer Review
```

Customer confirmation berada di #10.

---

# 94. EXECUTION + SERVICE HISTORY

Execution menyediakan summary:

```text
service date
duration
work performed
materials
result
```

Setelah Order Completed, data relevan masuk Service History.

---

# 95. EXECUTION + ASSET

Untuk asset-based service:

```text
Execution Completed
↓
Asset Update
↓
Service History Update
```

Asset detail berada di #15.

---

# 96. EXECUTION + MAINTENANCE

Execution dapat menghasilkan signal:

```text
Maintenance Recommendation
```

Maintenance detail berada di #16.

---

# 97. EXECUTION DATA MODEL — CORE

## `service_executions`

```text
execution_id
order_id
provider_id
assigned_worker_id
execution_status
planned_start_at
actual_start_at
planned_end_at
actual_end_at
actual_duration
started_by
completed_by
created_at
updated_at
```

---

# 98. EXECUTION ASSIGNMENTS

## `execution_assignments`

```text
assignment_id
execution_id
provider_id
worker_id
role
assigned_at
unassigned_at
reason
```

---

# 99. EXECUTION TASKS

## `execution_tasks`

```text
task_id
execution_id
name
description
sequence
status
required
assigned_worker_id
started_at
completed_at
note
```

---

# 100. EXECUTION CHECKLISTS

## `execution_checklists`

```text
checklist_id
execution_id
item
required
status
completed_by
completed_at
note
```

---

# 101. EXECUTION PAUSES

## `execution_pauses`

```text
pause_id
execution_id
reason
started_at
ended_at
created_by
note
```

---

# 102. EXECUTION ISSUES

## `execution_issues`

```text
issue_id
execution_id
type
description
severity
status
reported_by
resolved_at
resolution
```

---

# 103. EXECUTION MATERIALS

## `execution_materials`

```text
id
execution_id
material_id
material_name
quantity
unit
source_type
created_at
```

---

# 104. EXECUTION TESTS

## `execution_tests`

```text
test_id
execution_id
name
result
notes
tested_by
tested_at
```

---

# 105. SERVICE EXECUTION EVENTS

## `service_execution_events`

```text
event_id
execution_id
order_id
event_type
actor_type
actor_id
description
metadata
created_at
```

---

# 106. EXECUTION REQUIREMENTS

## `execution_requirements`

```text
requirement_id
execution_id
type
name
required
status
completed_at
completed_by
```

Type dapat:

```text
TASK
CHECKLIST
TEST
PROOF
APPROVAL
```

---

# 107. EXECUTION AUDIT TRAIL

Event penting menyimpan:

```text
actor
timestamp
event
previous_state
new_state
reference
metadata
```

Digunakan untuk audit, support, dispute, dan analytics.

---

# 108. INTERNAL VS PUBLIC DATA

### Internal
```text
Worker Note
Internal Cost
Equipment Problem
Internal Operations Note
Internal Assignment
```

### Public
```text
Current Progress
Public Note
Approved Scope
Customer-facing Issue
Estimated Completion
```

Semua dikendalikan oleh role/permission.

---

# 109. EXECUTION ANALYTICS

Metric:
- planned duration;
- actual duration;
- preparation duration;
- execution duration;
- pause duration;
- delay duration;
- task completion rate;
- rework frequency;
- failure rate;
- partial completion rate.

---

# 110. PROVIDER PERFORMANCE

Dapat dihitung:

```text
On-Time Rate
Average Execution Duration
Completion Rate
Rework Rate
Failure Rate
Pause Rate
Additional Requirement Rate
```

Metric tidak menjadi satu-satunya indikator quality.

---

# 111. EXECUTION EXCEPTION TYPES

```text
PAYMENT_BLOCKED
SCHEDULE_BLOCKED
MATERIAL_MISSING
EQUIPMENT_MISSING
WORKER_UNAVAILABLE
SAFETY_ISSUE
CUSTOMER_UNAVAILABLE
ACCESS_ISSUE
TECHNICAL_ISSUE
SCOPE_DIFFERENCE
ADDITIONAL_APPROVAL_REQUIRED
SERVICE_FAILURE
```

---

# 112. EXECUTION EXCEPTION FLOW

```text
Exception Detected
↓
Classify
↓
Pause / Block / Safety Stop / Continue
↓
Resolve
↓
Resume
atau
Escalate
atau
Fail
```

---

# 113. CUSTOMER WALKTHROUGH

Untuk service tertentu:

```text
Service Completed
↓
Customer Walkthrough
↓
Customer Notes
↓
Fix if needed
↓
Completion
```

---

# 114. CUSTOMER REQUESTED FIX

```text
Customer Request
↓
Provider Review
├── Valid Rework
└── New / Additional Scope
```

Valid rework tetap execution order yang sama. Scope baru masuk Pricing/Approval.

---

# 115. EXECUTION FAILURE WITH CUSTOMER IMPACT

```text
Execution Failed
↓
Customer Notification
↓
Resolution Options
```

Potential:

```text
Reschedule
Provider Replacement
Partial Completion
Refund
Alternative Service
```

Financial impact ditentukan Payment & Protection.

---

# 116. PROVIDER REASSIGNMENT

Reasons:
- worker unavailable;
- worker sick;
- equipment issue;
- skill mismatch;
- emergency internal.

Flow:

```text
Current Worker
↓
Reassign Required
↓
New Worker
↓
Check Readiness
↓
Continue
```

---

# 117. SKILL VALIDATION

```text
Service Requirement
+
Worker Skill
+
Certification if Required
↓
Assignment Valid / Invalid
```

Mandatory capability harus dipenuhi bila diwajibkan oleh service/platform.

---

# 118. EXECUTION ACCESS CONTROL

### Customer
Public execution progress.

### Worker
Assigned execution tasks.

### Provider
Full execution data untuk order miliknya.

### Admin
Operational oversight sesuai permission.

---

# 119. FINAL MASTER EXECUTION FLOW

```text
ORDER READY
    ↓
PREPARING
    ↓
WORKER ASSIGN
    ↓
READY
    ↓
START TRIP / PRE-SERVICE
    ↓
ARRIVED
    ↓
CHECK-IN
    ↓
INITIAL INSPECTION
    ↓
BEFORE CONDITION
    ↓
SERVICE STARTED
    ↓
IN PROGRESS
    ↓
TASKS / CHECKLIST
    │
    ├── PAUSE → RESUME
    ├── BLOCKED → RESOLVE
    ├── SAFETY STOP → RESOLVE
    └── ADDITIONAL REQUIREMENT → APPROVAL → RESUME
    ↓
MATERIAL / EQUIPMENT READY
    ↓
TESTING
    ↓
QUALITY CHECK
    ↓
REWORK if needed
    ↓
SERVICE COMPLETED
    ↓
COMPLETION SUBMITTED
    ↓
PROOF / #9
    ↓
CUSTOMER CONFIRMATION / #10
```

---

# 120. FINAL STATUS SET

```text
NOT_STARTED
PREPARING
READY
STARTED
IN_PROGRESS
PAUSED
BLOCKED
SAFETY_STOP
TESTING
PARTIALLY_COMPLETED
COMPLETION_SUBMITTED
COMPLETED
FAILED
```

---

# 121. FINAL STATUS TRANSITION

```text
NOT_STARTED → PREPARING
PREPARING → READY / FAILED
READY → STARTED / FAILED
STARTED → IN_PROGRESS
IN_PROGRESS → PAUSED / BLOCKED / SAFETY_STOP / TESTING / PARTIALLY_COMPLETED / FAILED
PAUSED → IN_PROGRESS / BLOCKED / FAILED
BLOCKED → IN_PROGRESS / FAILED
SAFETY_STOP → IN_PROGRESS / BLOCKED / FAILED
TESTING → IN_PROGRESS / COMPLETION_SUBMITTED / FAILED
PARTIALLY_COMPLETED → IN_PROGRESS / COMPLETION_SUBMITTED
COMPLETION_SUBMITTED → COMPLETED
```

Actual transition mengikuti capability dan policy service.

---

# 122. EXECUTION VS TRACKING EXAMPLE

Provider mulai perjalanan:

Execution:

```text
TRIP_STARTED
```

Tracking:

```text
ON_THE_WAY
GPS
ETA
```

---

# 123. EXECUTION VS PROOF EXAMPLE

Provider mulai cleaning:

Execution:

```text
SERVICE_STARTED
```

Proof:

```text
BEFORE PHOTO
```

Provider selesai:

Execution:

```text
SERVICE_COMPLETED
```

Proof:

```text
AFTER PHOTO
SERVICE REPORT
```

---

# 124. EXECUTION VS COMPLETION EXAMPLE

```text
Provider → Service Completed
Execution → SERVICE_COMPLETED
↓
Completion Submission
↓
Customer Confirm
↓
Order → COMPLETED
```

---

# 125. EXECUTION VS PAYMENT EXAMPLE

```text
Order Rp300.000
↓
Material Issue
↓
Additional Cost Rp100.000
↓
Execution = ACTION_REQUIRED
↓
Adjustment
↓
Customer Approval
↓
Additional Payment
↓
Execution Resume
```

---

# 126. EXECUTION VS COMMUNICATION EXAMPLE

```text
Execution:
PAUSED
Reason: WAITING_APPROVAL

Communication:
"Provider needs your approval to continue."

Customer:
Approve

Execution:
RESUMED
```

---

# 127. EXECUTION VS SERVICE HISTORY

Execution menyimpan detail pekerjaan; setelah Order Completed, summary yang relevan masuk Service History.

---

# 128. EXECUTION VS WARRANTY

```text
Execution / Rework
= perbaikan sebelum final completion

Warranty
= masalah setelah Order Completed dalam warranty period
```

---

# 129. EXECUTION VS PRODUCT INTEGRATION

```text
Material Need
↓
Product Discovery
↓
Product Order
↓
Delivery
↓
Material Received
↓
Resume Execution
```

Feature #19 menangani integrasi lintas domain.

---

# 130. EXECUTION MATRIX

| Tipe | Preparation | Worker | Check-in | Task | Testing | Quality | Completion |
|---|---:|---:|---:|---:|---:|---:|---:|
| Instant | ✅ | Optional | ✅ jika on-site | ✅ | Optional | ✅/Optional | ✅ |
| Scheduled | ✅ | Optional | ✅ jika on-site | ✅ | Optional | ✅/Optional | ✅ |
| Emergency | ✅ Fast-track | Optional | ✅ | ✅ | Often | ✅ | ✅ |
| Recurring | ✅ | Optional | Depends | Template | Optional | Optional | Per occurrence |
| Inspection | ✅ | Optional | ✅ | Inspection tasks | Often | Report check | Inspection complete |
| Project | ✅ | ✅ | ✅ | Milestone tasks | ✅ | ✅ | Milestone |
| Custom Request | ✅ | Optional/✅ | Depends | Custom | Depends | Depends | ✅ |
| Remote | ✅ | Optional | ❌ | Session tasks | Optional | ✅/Optional | ✅ |
| Workshop | ✅ | ✅ | ✅ | Repair tasks | ✅ | ✅ | Ready / Complete |
| Pickup & Return | ✅ | Optional/✅ | ✅ | Processing tasks | Optional | ✅ | Delivered |

---

# 131. SERVICE MODE EXECUTION MATRIX

| Service Mode | Execution Focus |
|---|---|
| Home Service | Provider travel → arrival → on-site work |
| Mobile Service | Mobile technician/unit → assistance/service |
| Workshop | Asset received → inspect → repair → test |
| Remote / Online | Session preparation → session → result |
| On-Site | Arrival → site work → inspection |
| Pickup & Return | Pickup → process → return |

---

# 132. EXECUTION DATA RELATIONSHIP

```text
order
  ↓
service_execution
  ├── assignments
  ├── tasks
  ├── checklists
  ├── pauses
  ├── issues
  ├── materials
  ├── tests
  ├── events
  └── requirements
```

---

# 133. EXECUTION EVENT → FEATURE INTEGRATION

```text
READY → Tracking
TRIP_STARTED → Tracking + Communication
ARRIVED → Tracking + Communication
SERVICE_STARTED → Tracking + Communication
IN_PROGRESS → Tracking + Communication
PAUSED → Tracking + Communication
ADDITIONAL_REQUIREMENT → Pricing + Communication + Payment
MATERIAL_RECEIVED → Execution + Communication
SERVICE_COMPLETED → Proof + Completion
COMPLETION_SUBMITTED → Proof + Completion + Payment
```

---

# 134. END-TO-END EXAMPLE — AC REPAIR

```text
Order Confirmed
↓
Preparing
↓
Assign Budi
↓
Ready
↓
Start Trip
↓
Arrived
↓
Check-in
↓
Before Condition
↓
Initial Inspection
↓
Service Started
↓
Diagnosis
↓
Capacitor Issue Found
↓
Additional Requirement
↓
Customer Approval
↓
Additional Payment
↓
Material Ready
↓
Resume
↓
Replace Capacitor
↓
Testing
↓
PASS
↓
Quality Check
↓
Service Completed
↓
Completion Submitted
```

Lanjut ke Proof dan Customer Confirmation.

---

# 135. END-TO-END EXAMPLE — CLEANING SOFA

```text
Order Confirmed
↓
Preparing
↓
Start Trip
↓
Arrived
↓
Check-in
↓
Before Condition
↓
Protect Area
↓
Cleaning
↓
Checklist
↓
Drying
↓
Quality Check
↓
After Condition
↓
Service Completed
↓
Completion Submitted
```

---

# 136. END-TO-END EXAMPLE — WORKSHOP MOTOR

```text
Vehicle Received
↓
Check-in
↓
Initial Inspection
↓
Diagnosis
↓
Quotation Approval
↓
Repair
↓
Parts Replacement
↓
Testing
↓
Road Test
↓
Quality Check
↓
Ready for Pickup
↓
Completion Submitted
```

---

# 137. END-TO-END EXAMPLE — EMERGENCY

```text
Emergency Order
↓
Provider Assignment
↓
Ready
↓
On The Way
↓
Arrived
↓
Check-in
↓
Emergency Assessment
↓
Immediate Action
↓
Repair / Assistance
↓
Testing
↓
Service Completed
↓
Completion Submitted
```

---

# 138. END-TO-END EXAMPLE — PROJECT

```text
Project Order
↓
Initial Payment
↓
Milestone 1
↓
Preparation
↓
Execution
↓
Progress
↓
Inspection
↓
Rework if needed
↓
Quality Check
↓
Milestone Completion
↓
Customer Approval
↓
Next Milestone
↓
Final Execution
↓
Final Quality Check
↓
Service Completed
```

---

# 139. END-TO-END EXAMPLE — RECURRING

```text
Recurring Booking
↓
Occurrence
↓
Order
↓
Preparation
↓
Execution
↓
Completion
↓
Next Occurrence
```

---

# 140. END-TO-END EXAMPLE — REMOTE

```text
Order
↓
Preparation
↓
Session Ready
↓
Session Started
↓
Consultation
↓
Task / Notes
↓
Session Completed
↓
Report
↓
Completion Submitted
```

---

# 141. END-TO-END EXAMPLE — PICKUP & RETURN

```text
Order
↓
Pickup Preparation
↓
Pickup
↓
Item Received
↓
Initial Condition
↓
Processing
↓
Cleaning / Repair
↓
Quality Check
↓
Return
↓
Delivered
↓
Completion Submitted
```

---

# 142. FINAL FEATURE BOUNDARY

```text
#7 SERVICE EXECUTION
Provider melakukan apa?
→ Preparation
→ Worker
→ Task
→ Checklist
→ Material
→ Testing
→ Quality
→ Issue
→ Progress
```

```text
#8 TRACKING DETAIL
Customer melihat apa?
→ GPS
→ ETA
→ Distance
→ Map
→ Travel Status
→ Tracking Session
```

```text
#9 PROOF OF SERVICE
Bukti apa?
→ Before
→ During
→ After
→ Photo
→ Video
→ Checklist
→ Report
```

```text
#10 COMPLETION
Kapan resmi selesai?
→ Completion Submitted
→ Customer Review
→ Confirm
→ Order Completed
```

---

# 143. FINAL BUSINESS RULES — SERVICE EXECUTION

1. Execution hanya dimulai setelah precondition terpenuhi.
2. Provider dapat melakukan preparation.
3. Provider dapat berupa individual atau business.
4. Business provider dapat assign worker.
5. Assignment memiliki history.
6. Service dapat memiliki execution template.
7. Template dapat menentukan required tasks.
8. Template dapat menentukan required checklist.
9. Template dapat menentukan required testing.
10. Template dapat menentukan completion requirements.
11. Mandatory platform requirement tidak boleh dihapus provider.
12. Execution memiliki status sendiri.
13. Execution memiliki event history.
14. Execution memiliki task lifecycle.
15. Execution memiliki checklist lifecycle.
16. Execution dapat paused.
17. Pause memiliki reason.
18. Execution dapat resumed.
19. Execution dapat blocked.
20. Safety Stop tersedia untuk kondisi relevan.
21. Safety Stop wajib dicatat.
22. Actual condition dapat dibandingkan dengan approved scope.
23. Scope difference tidak boleh otomatis menjadi extra charge.
24. Additional requirement masuk Pricing/Approval.
25. Additional cost membutuhkan customer approval.
26. Execution dapat menggunakan material.
27. Material dapat berasal dari provider.
28. Material dapat berasal dari customer.
29. Material dapat berasal dari Servio.
30. Material unavailable dapat menyebabkan pause/block.
31. Execution dapat membutuhkan equipment.
32. Equipment unavailable dapat menyebabkan pause/block/reassignment.
33. Worker dapat diganti.
34. Reassignment memiliki history.
35. Worker harus memenuhi mandatory capability bila diwajibkan.
36. Internal notes tidak otomatis public.
37. Customer-facing progress terpisah dari internal notes.
38. Execution mendukung tasks.
39. Execution mendukung checklist.
40. Execution mendukung progress update.
41. Execution mendukung testing.
42. Testing memiliki result.
43. Testing fail dapat mengembalikan execution ke In Progress.
44. Quality Check dapat menjadi completion gate.
45. Rework dapat dilakukan sebelum completion final.
46. Rework bukan otomatis order baru.
47. Partial completion didukung.
48. Execution failure didukung.
49. Blocked berbeda dari Failed.
50. Execution dapat memiliki deadline.
51. Actual duration dicatat.
52. Delay dapat diklasifikasikan.
53. Customer walkthrough dapat digunakan untuk service tertentu.
54. Service Completed tidak sama dengan Order Completed.
55. Completion Submission menjadi handoff ke Proof/Completion.
56. Proof requirement dapat berasal dari execution template.
57. Tracking menggunakan execution events sebagai input.
58. Communication menggunakan execution events sebagai trigger.
59. Payment menggunakan adjustment/additional requirement sebagai input.
60. Smart membantu execution tetapi bukan decision maker.
61. Semua perubahan penting memiliki audit trail.
62. Execution memiliki role-based access.
63. Individual provider dapat sekaligus menjadi worker.
64. Recurring mempunyai execution per occurrence.
65. Project mempunyai execution per milestone.
66. Workshop menggunakan execution berbasis asset/vehicle state.
67. Remote tidak memakai physical arrival.
68. Pickup & Return memiliki execution berbasis item flow.
69. Emergency dapat memakai fast-track execution.
70. Inspection dapat menjadi execution tersendiri.
71. Customer dapat meminta fix sebelum final completion sesuai policy.
72. Customer-requested fix dapat menjadi rework atau additional scope.
73. Financial impact partial/failure/cancellation berada di Payment & Protection.
74. Warranty setelah Order Completed berada di Warranty.
75. Service History menggunakan hasil execution setelah Order Completed.

---

# 144. FINAL LOCKED DECISION & HANDOFF

**Service Execution Jasa resmi menggunakan konsep:**

```text
Order Ready
↓
Preparation
↓
Assignment
↓
Ready
↓
Arrival / Start
↓
Check-in
↓
Initial Condition
↓
Service Started
↓
In Progress
↓
Tasks / Checklist
↓
Pause / Block / Safety Stop bila diperlukan
↓
Additional Requirement bila diperlukan
↓
Material / Equipment
↓
Testing
↓
Quality Check
↓
Service Completed
↓
Completion Submitted
```

Batas feature:

- **#7 Service Execution:** tindakan/proses pekerjaan provider.
- **#8 Tracking Detail:** posisi/perjalanan/status yang dilihat customer.
- **#9 Proof of Service:** bukti formal pekerjaan.
- **#10 Completion & Customer Confirmation:** proses penyelesaian resmi Order.

Handoff ke #8:

```text
READY
TRIP_STARTED
ARRIVED
SERVICE_STARTED
IN_PROGRESS
PAUSED
RESUMED
SERVICE_COMPLETED
```

Event tersebut menjadi input bagi Tracking dan Communication. `SERVICE_COMPLETED` serta `COMPLETION_SUBMITTED` menjadi handoff ke Proof dan Completion.

---

# 145. ROADMAP CONTEXT

```text
1. Discovery                         ✅
2. Booking Jasa                     ✅
3. Order Jasa                       ✅
4. Pricing & Quotation              ✅
5. Communication                    ✅
6. Payment & Protection             ✅
7. Service Execution                ✅
8. Tracking Detail                  ← NEXT
9. Proof of Service
10. Completion & Customer Confirmation
11. Rating & Review
12. Complaint / Dispute
13. Warranty
14. Service History
15. Asset
16. Maintenance & Reminder
17. Rebooking / Favorite / Loyalty
18. Smart Recommendation
19. Service + Product Integration

20–27 Product / Barang
```

---

# 146. NEXT FEATURE — TRACKING DETAIL

Feature #8 akan membahas secara khusus:

- live GPS;
- ETA;
- distance;
- route/map;
- tracking session;
- location update frequency;
- offline GPS;
- tracking start/stop;
- share tracking;
- privacy;
- customer-facing timeline;
- Home Service tracking;
- Emergency tracking;
- Workshop status tracking;
- Pickup & Return tracking;
- Project progress tracking;
- tracking data model;
- tracking status;
- tracking edge cases.
