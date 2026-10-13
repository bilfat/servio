# SERVIO — FEATURE #9 PROOF OF SERVICE
## Final Specification — LOCKED

> **Feature #9:** Proof of Service  
> **Status:** FINAL / LOCKED  
> **Roadmap Position:** Service / Jasa — #9 dari 19  
> **Fokus Utama:** mengumpulkan, memvalidasi, menyimpan, dan menyajikan bukti bahwa service benar-benar dikerjakan beserta kondisi, proses, dan hasilnya.

---

# 1. Definisi Utama

**Proof of Service** adalah sistem evidence yang mencatat bukti pelaksanaan pekerjaan dari suatu order/service execution.

Proof bukan hanya foto.

Proof dapat terdiri dari:

- foto
- video
- checklist
- measurement
- test result
- service report
- material record
- signature
- OTP confirmation
- system-generated event
- timestamp
- location context
- condition record
- dokumen pendukung

Konsep utama:

```text
Service Execution
      ↓
Evidence Capture
      ↓
Proof Package
      ↓
Validation
      ↓
Customer Review
      ↓
Completion & Customer Confirmation
```

---

# 2. Tujuan Proof of Service

Proof harus dapat membantu menjawab:

1. Service apa yang dilakukan?
2. Siapa yang mengerjakan?
3. Kapan pekerjaan dilakukan?
4. Apa kondisi sebelum service?
5. Apa yang dikerjakan?
6. Apa material yang digunakan?
7. Apa hasil testing?
8. Bagaimana kondisi setelah service?
9. Apa pekerjaan yang selesai?
10. Apa pekerjaan yang belum selesai?
11. Apa kendala selama pengerjaan?
12. Bukti apa yang telah dikumpulkan?
13. Siapa yang membuat bukti?
14. Kapan bukti dibuat?
15. Apakah bukti sudah lengkap?
16. Apakah customer sudah melihat bukti?
17. Apakah customer meminta revisi atau melaporkan masalah?

---

# 3. Prinsip Dasar

1. Proof adalah evidence, bukan status order.
2. Proof bukan hanya media.
3. Proof harus terikat dengan order dan service execution.
4. Proof harus dapat ditelusuri ke provider/worker.
5. Proof harus memiliki timestamp.
6. Proof harus memiliki metadata.
7. Proof requirement dapat berbeda berdasarkan service.
8. Required proof ditentukan oleh konfigurasi platform.
9. Provider tidak boleh menghilangkan mandatory proof.
10. Proof yang sudah final tidak boleh diubah secara sembarangan.
11. Revisi menggunakan versioning.
12. Original evidence harus dipertahankan sesuai retention policy.
13. Customer-facing proof harus mudah dipahami.
14. Internal evidence dapat memiliki visibility berbeda.
15. Proof dapat digunakan sebagai supporting evidence untuk dispute.
16. Proof tidak menentukan harga.
17. Proof tidak memproses payment.
18. Proof tidak melakukan tracking GPS.
19. Proof tidak menentukan order selesai.
20. Proof tidak menggantikan completion.

---

# 4. Lima Pilar Utama Proof

Feature #9 dikunci pada lima area inti:

```text
1. Proof Types
2. Proof Requirements
3. Proof Lifecycle & Status
4. Customer Review & Revision
5. Proof Package + Audit Trail
```

Kelima bagian ini menjadi dasar implementasi Feature #9.

---

# 5. Proof Types

Jenis evidence utama:

| Proof Type | Contoh |
|---|---|
| PHOTO | foto kondisi |
| VIDEO | video pekerjaan |
| DOCUMENT | dokumen/service report |
| CHECKLIST | checklist SOP |
| MEASUREMENT | hasil pengukuran |
| TEST_RESULT | hasil pengujian |
| MATERIAL | material yang digunakan |
| CONDITION | kondisi asset |
| SIGNATURE | tanda tangan |
| OTP | konfirmasi OTP |
| NOTE | catatan pekerjaan |
| SYSTEM_EVENT | event sistem |
| TIMESTAMP | waktu pencatatan |
| LOCATION_CONTEXT | konteks lokasi jika relevan |

---

# 6. Proof Berdasarkan Tahapan

Evidence dapat dikelompokkan berdasarkan tahap:

```text
BEFORE
↓
DURING
↓
AFTER
↓
TESTING
↓
FINAL
```

### BEFORE

Merekam kondisi awal.

### DURING

Merekam pekerjaan/proses.

### AFTER

Merekam kondisi setelah pekerjaan.

### TESTING

Merekam hasil pengujian.

### FINAL

Merekam ringkasan hasil dan bukti akhir.

Tidak semua service membutuhkan seluruh tahap.

---

# 7. Before Proof

Contoh:

- kondisi AC sebelum service
- kondisi sofa sebelum cleaning
- kondisi kendaraan sebelum repair
- kondisi dinding sebelum painting
- kondisi barang sebelum pickup

Before proof berguna untuk membandingkan kondisi awal dan akhir.

---

# 8. During Proof

Contoh:

- proses cleaning
- proses repair
- proses installation
- proses replacement
- progress construction

During proof tidak selalu wajib.

---

# 9. After Proof

Merekam kondisi setelah service.

Contoh:

```text
Before
AC tidak dingin

After
AC kembali dingin
```

atau:

```text
Before
Sofa kotor

After
Sofa sudah dibersihkan
```

---

# 10. Testing Proof

Untuk service yang memerlukan validasi hasil, testing menjadi evidence penting.

Contoh:

- temperature test
- voltage test
- pressure test
- engine test
- electrical test
- water pressure test

Hasil testing dapat berupa:

```text
PASS
FAIL
NOT_APPLICABLE
```

---

# 11. Proof Requirement

Setiap **Service Offering** dapat memiliki proof requirement.

Contoh:

### AC Cleaning

```text
Before Photo       REQUIRED
After Photo        REQUIRED
Checklist          REQUIRED
Testing            REQUIRED
Video              OPTIONAL
Signature          OPTIONAL
```

### General Cleaning

```text
Before Photo       RECOMMENDED
After Photo        REQUIRED
Checklist          OPTIONAL
Testing            NOT_APPLICABLE
```

### Automotive Repair

```text
Condition Photo    REQUIRED
Inspection         REQUIRED
Parts Used         REQUIRED
Testing            REQUIRED
After Photo        RECOMMENDED
```

---

# 12. Platform-Controlled Requirement

Hierarki:

```text
Servio
↓
Category
↓
Subcategory
↓
Service
↓
Service Offering
↓
Proof Requirement
```

Servio menentukan mandatory requirement.

Provider hanya dapat mengatur bagian yang memang diperbolehkan oleh platform.

---

# 13. Required vs Recommended

Setiap requirement dapat memiliki:

```text
REQUIRED
RECOMMENDED
OPTIONAL
NOT_APPLICABLE
```

### REQUIRED

Harus dipenuhi sebelum final proof submission.

### RECOMMENDED

Disarankan tetapi tidak memblokir.

### OPTIONAL

Boleh ditambahkan.

### NOT_APPLICABLE

Tidak berlaku untuk service tersebut.

---

# 14. Dynamic Proof Form

Form proof mengikuti:

```text
Service Offering
+
Execution Type
+
Proof Configuration
```

Contoh:

```text
AC Repair
→ Before Photo
→ Diagnosis
→ Measurement
→ After Photo
→ Testing
→ Notes
```

Contoh:

```text
House Cleaning
→ Before Photo
→ Cleaning Checklist
→ After Photo
→ Customer Note
```

---

# 15. Provider Proof Configuration

Provider dapat mengatur fitur yang memang diizinkan platform.

Contoh:

```text
Video Evidence
Supported: YES
```

atau:

```text
Customer Signature
Required by Provider: YES
```

Namun provider tidak dapat mematikan:

```text
After Photo = REQUIRED
```

jika platform telah menetapkannya sebagai mandatory.

---

# 16. Siapa yang Membuat Proof?

### Human-generated

Dibuat oleh:

- provider
- worker
- authorized staff

Contoh:

- photo
- video
- checklist
- measurement
- note
- service report

### System-generated

Dibuat otomatis oleh platform.

Contoh:

- order ID
- execution ID
- worker ID
- provider ID
- server timestamp
- tracking event
- arrival event
- service start event
- proof submission event

---

# 17. Proof Metadata

Minimal setiap proof item memiliki:

```text
proof_id
proof_package_id
order_id
execution_id
provider_id
worker_id
proof_type
stage
status
created_by
created_at
visibility
```

Untuk media:

```text
file_id
mime_type
file_size
storage_location
uploaded_at
```

---

# 18. Timestamp

Setiap evidence memiliki waktu.

Sistem idealnya menyimpan:

- client timestamp
- server timestamp

Untuk audit, **server timestamp menjadi timestamp resmi sistem**.

---

# 19. Location Context

Location dapat dikaitkan jika memang relevan.

Contoh:

- pickup
- delivery
- emergency
- mobile service
- on-site service

Location tidak harus ditampilkan kepada customer sebagai koordinat.

---

# 20. Privacy

Proof dapat mengandung data sensitif seperti:

- interior rumah
- wajah
- dokumen
- nomor kendaraan
- barang pribadi
- nomor telepon

Karena itu:

1. Provider hanya mengambil gambar yang diperlukan.
2. Provider tidak boleh mengambil data pribadi yang tidak relevan.
3. Customer-facing proof harus melalui access control.
4. Media harus disimpan secara aman.
5. Provider harus dapat melakukan crop/retake bila diperlukan.

---

# 21. Sensitive Media Warning

Sistem dapat memberi warning sebelum submission.

Contoh:

```text
This photo may contain sensitive information.
Please review before submitting.
```

Smart vision dapat membantu mendeteksi kemungkinan:

- dokumen
- wajah
- nomor identitas
- data pribadi

Smart system hanya memberi peringatan; provider tetap menjadi pengambil tindakan.

---

# 22. Media Upload

Media proof perlu melewati proses:

```text
Select / Capture
↓
Upload
↓
Storage
↓
Processing
↓
Validation
↓
Available
```

Sistem harus menangani:

- invalid format
- size limit
- corrupt file
- upload failure
- retry
- processing failure

---

# 23. Proof Draft

Provider dapat menyusun proof sebelum dikirim.

Contoh:

```text
Required
✓ Before Photo
✓ After Photo
✓ Checklist
○ Test Result

Optional
✓ Work Photo
```

Provider belum dapat mengirim final sebelum mandatory requirement lengkap.

---

# 24. Proof Completeness

Sistem dapat menghitung kelengkapan:

```text
3 / 4 Required
75%
```

Contoh:

```text
Before Photo ✓
After Photo ✓
Checklist ✓
Test Result ✕
```

UI:

```text
Proof incomplete.
Missing: Test Result
```

---

# 25. Final Submission Gate

Ketika provider menekan:

```text
SUBMIT PROOF
```

system melakukan validation.

```text
Required Proof Complete?
        ↓
      YES
        ↓
Submit Proof
```

Jika tidak:

```text
Required Proof Complete?
        ↓
       NO
        ↓
Block submission
        ↓
Show missing requirement
```

---

# 26. Proof Lifecycle

Lifecycle utama:

```text
DRAFT
↓
UPLOADING
↓
VALIDATING
↓
SUBMITTED
↓
REVIEW
↓
ACCEPTED
↓
LOCKED
```

Jika perlu perbaikan:

```text
SUBMITTED
↓
REVISION_REQUIRED
↓
DRAFT / REVISION
↓
VALIDATING
↓
RESUBMITTED
```

---

# 27. Proof Status

### `DRAFT`

Proof masih disusun.

### `UPLOADING`

Media sedang diupload.

### `VALIDATING`

Sistem memeriksa requirement dan file.

### `SUBMITTED`

Provider telah mengirim proof package.

### `REVIEW`

Proof sedang ditinjau.

### `REVISION_REQUIRED`

Bukti perlu dilengkapi/diperbaiki.

### `ACCEPTED`

Proof package memenuhi requirement yang berlaku.

### `LOCKED`

Proof final telah menjadi bagian transaction record dan tidak dapat diedit biasa.

---

# 28. Proof Item Status

Setiap item juga dapat memiliki status:

```text
PENDING
UPLOADING
AVAILABLE
INVALID
REPLACED
ACCEPTED
```

Item yang diganti tetap disimpan dalam history.

---

# 29. Proof Package

Satu service execution dapat mempunyai satu final Proof Package.

Contoh:

```text
Order #SV-001
│
└── Proof Package
    ├── Before Photo
    ├── Work Photo
    ├── After Photo
    ├── Checklist
    ├── Test Result
    ├── Material Used
    └── Provider Note
```

---

# 30. Multiple Proof Packages

Jika service memiliki beberapa visit atau milestone:

```text
Order
├── Proof Package — Visit 1
├── Proof Package — Visit 2
└── Proof Package — Final
```

Untuk project:

```text
Order
├── Milestone 1 Proof
├── Milestone 2 Proof
├── Milestone 3 Proof
└── Final Proof
```

---

# 31. Proof Versioning

Proof tidak boleh overwrite secara diam-diam.

Contoh:

```text
Version 1
↓
Revision Requested
↓
Version 2
```

Setiap versi menyimpan:

- version number
- actor
- timestamp
- reason

Original evidence tetap dapat dilacak sesuai policy retention.

---

# 32. Revision

Customer dapat meminta perbaikan evidence jika:

- bukti kurang
- foto tidak jelas
- test result tidak tersedia
- hasil belum dapat dipastikan
- evidence tidak sesuai service

Flow:

```text
Customer Review
↓
Issue / Revision Request
↓
Provider
↓
Additional / Revised Evidence
↓
Resubmit
```

---

# 33. Customer Review Bukan Completion

Customer melihat Proof bukan berarti order otomatis selesai.

```text
Proof Submitted
↓
Customer Reviews
↓
Customer may:
  ├── Confirm result → #10 Completion
  └── Report Issue → #12 Complaint / Dispute
```

Jadi:

```text
Viewed ≠ Confirmed
Confirmed ≠ Proof Edited
```

---

# 34. Customer Tidak Menyetujui Satu File Satu-Satu

UX utama:

```text
Proof Package
↓
Review Service Result
```

Bukan:

```text
Approve Photo #1
Approve Photo #2
Approve Photo #3
```

Customer meninjau keseluruhan hasil service.

---

# 35. Customer Report Issue

Customer dapat melaporkan:

- hasil tidak sesuai
- pekerjaan belum selesai
- bukti kurang
- kerusakan tambahan
- hasil testing bermasalah

Flow:

```text
Proof Package
↓
Report Issue
↓
Complaint / Dispute
```

Feature #9 menyimpan context/evidence; resolution berada di Feature #12.

---

# 36. Provider Cannot Delete Final Proof

Setelah:

```text
LOCKED
```

provider tidak dapat melakukan delete biasa.

Jika ada kesalahan:

```text
Revision
↓
New Version
```

bukan delete tanpa jejak.

---

# 37. Audit Trail

Setiap tindakan penting dicatat.

Contoh event:

```text
PROOF_CREATED
PROOF_UPLOADING
PROOF_UPLOADED
PROOF_VALIDATED
PROOF_SUBMITTED
PROOF_VIEWED
PROOF_REVISION_REQUESTED
PROOF_RESUBMITTED
PROOF_ACCEPTED
PROOF_LOCKED
PROOF_REPLACED
```

Audit menyimpan:

- actor
- timestamp
- action
- object
- reason jika diperlukan

---

# 38. Proof Viewed

Sistem dapat mencatat:

```text
Customer viewed proof
```

Namun:

```text
Viewed ≠ Accepted
Viewed ≠ Completion
```

Informasi ini berguna untuk notification dan support.

---

# 39. Proof Acceptance

`ACCEPTED` pada Proof berarti:

> Proof package memenuhi requirement yang berlaku dan diterima sebagai evidence record.

Ini **bukan** berarti:

> Customer menyatakan service selesai.

Customer confirmation terhadap hasil service berada pada Feature #10.

---

# 40. Proof Lock

Setelah proof masuk tahap final:

```text
ACCEPTED
↓
LOCKED
```

Proof menjadi bagian dari record transaksi/service history.

Editing biasa tidak diperbolehkan.

---

# 41. Checklist

Checklist dapat mengikuti SOP service.

Contoh AC:

```text
✓ Filter cleaned
✓ Drain checked
✓ Evaporator cleaned
✓ Unit tested
```

Checklist dapat memiliki:

- item
- required
- completed
- note
- actor
- timestamp

---

# 42. Measurement

Beberapa service membutuhkan pengukuran.

Contoh:

```text
Voltage: 220 V
Temperature: 22°C
Pressure: ...
```

Measurement harus memiliki:

- value
- unit
- measurement type
- actor
- timestamp

---

# 43. Test Result

Testing memiliki struktur:

```text
Test Name
Result
Value
Unit
Status
Note
```

Contoh:

```text
Cooling Test
22°C
PASS
```

Testing yang gagal tetap harus dapat disimpan sebagai evidence.

```text
Cooling Test
28°C
FAIL
```

Proof tidak boleh memaksa provider membuat hasil `PASS`.

---

# 44. Material Used

Proof dapat mencatat material yang digunakan.

Contoh:

```text
Refrigerant
1 unit

Capacitor
1 unit
```

Data dapat dikaitkan dengan Product Integration #19.

Proof hanya merekam penggunaan; harga dan pembayaran mengikuti module pricing/payment.

---

# 45. Parts Replacement

Untuk spare part:

```text
Old Part
↓
Replacement
↓
New Part
```

Evidence dapat mencakup:

- old part photo
- new part photo
- product/part ID
- quantity
- serial number jika diperlukan

---

# 46. Service Report

Provider dapat mengisi ringkasan:

```text
Problem
Action Taken
Result
Recommendation
```

Contoh:

```text
Problem:
AC kurang dingin.

Action:
Cleaning indoor unit dan pemeriksaan drain.

Result:
Cooling test PASS.

Recommendation:
Maintenance berikutnya sesuai schedule.
```

---

# 47. Condition Record

Condition record digunakan terutama untuk:

- automotive
- appliance
- electronics
- workshop
- pickup & return
- asset-related service

Contoh:

```text
Condition Before
Condition After
Damage Existing
Damage Added
```

---

# 48. Signature

Signature digunakan apabila service membutuhkan acknowledgment tertentu.

Signature memiliki:

- signer
- purpose
- timestamp
- order
- execution

Purpose harus jelas.

Contoh:

```text
SERVICE_RECEIPT
DELIVERY_ACKNOWLEDGMENT
SERVICE_ACKNOWLEDGMENT
```

Signature bukan otomatis persetujuan finansial.

---

# 49. OTP

OTP dapat dipakai sebagai metode confirmation pada kebutuhan tertentu.

Contoh:

```text
Provider requests customer acknowledgment
↓
Customer receives OTP
↓
Customer enters OTP
↓
System records confirmation
```

Purpose tetap harus dicatat.

---

# 50. Proof of Arrival vs Proof of Service

### Proof of Arrival

Membuktikan provider datang.

Dapat berasal dari:

- tracking
- check-in
- timestamp

### Proof of Service

Membuktikan pekerjaan dilakukan.

Dapat berasal dari:

- photo
- checklist
- test
- measurement
- report
- material record

Jadi:

```text
Arrived ≠ Worked
Worked ≠ Completed
```

---

# 51. Proof of Work per Task

Evidence dapat dikaitkan dengan execution task.

Contoh:

```text
Task
Clean AC Filter

Proof
Photo #01
Checklist #01
```

Hal ini membantu audit pekerjaan granular.

---

# 52. Partial Completion

Proof harus mendukung pekerjaan yang hanya selesai sebagian.

Contoh:

```text
Task A ✓
Task B ✓
Task C ✕
```

Provider harus mencatat:

- completed work
- remaining work
- reason
- recommendation

---

# 53. Failed Service

Service yang gagal tetap harus mempunyai proof.

Contoh:

```text
Diagnosis completed
Repair attempted
Testing failed
```

Proof harus merekam kondisi sebenarnya.

Jangan memaksa:

```text
Service Successful
```

ketika hasil testing gagal.

---

# 54. Blocked Service

Contoh:

```text
Repair blocked
Reason:
Replacement part unavailable
```

Proof dapat mencatat:

- pekerjaan yang sudah dilakukan
- pekerjaan yang belum
- dependency
- material yang dibutuhkan

---

# 55. Cannot Capture Proof

Ada kondisi ketika evidence tertentu tidak dapat diambil:

- customer tidak mengizinkan foto
- kondisi terlalu gelap
- device error
- safety issue
- pekerjaan sensitif
- privacy concern

Provider dapat memilih:

```text
Unable to Capture
```

dan memberikan reason.

---

# 56. Proof Exception

Exception memiliki:

```text
exception_id
proof_requirement_id
reason
created_by
created_at
approval_status
```

Tidak semua exception otomatis disetujui.

Platform menentukan policy berdasarkan requirement.

---

# 57. Admin Override

Admin dapat memberikan override ketika diperlukan secara operasional.

Override wajib memiliki:

- actor
- reason
- timestamp
- original requirement
- action

Admin tidak boleh menghapus history requirement.

---

# 58. Emergency Proof

Emergency membutuhkan proof yang praktis.

Jangan sampai proof requirement menghambat keselamatan atau tindakan darurat.

Flow:

```text
Emergency Assistance
↓
Minimal Mandatory Proof
↓
Service
↓
Additional Evidence
```

---

# 59. Cleaning Proof

Contoh:

```text
BEFORE
Photo

WORK
Checklist

AFTER
Photo

RESULT
Cleaning completed

NOTE
Area cleaned.
```

---

# 60. Repair Proof

Contoh:

```text
Problem
↓
Before
↓
Diagnosis
↓
Repair Evidence
↓
Parts Used
↓
Testing
↓
After
```

---

# 61. Construction / Renovation Proof

Proof dapat berbasis milestone:

```text
Survey
↓
Preparation
↓
Construction
↓
Finishing
↓
Handover
```

Setiap milestone dapat memiliki Proof Package sendiri.

---

# 62. Automotive Proof

Contoh:

```text
Vehicle Condition
↓
Inspection
↓
Diagnosis
↓
Parts
↓
Repair
↓
Testing
↓
Final Condition
```

---

# 63. Workshop Proof

Workshop lebih fokus pada asset.

```text
Vehicle Received
↓
Condition
↓
Inspection
↓
Repair
↓
Testing
↓
Ready
```

---

# 64. Remote Service Proof

Remote service tidak membutuhkan foto lokasi.

Evidence dapat berupa:

- session record
- diagnostic result
- screenshot
- work report
- file delivered
- result note

---

# 65. Pickup & Return Proof

### Pickup

```text
Item Condition
Photo
Timestamp
Receiver
```

### Return

```text
Item Condition
Photo
Timestamp
Recipient
```

Ini penting untuk melindungi kedua pihak dari dispute kondisi barang.

---

# 66. Proof Retention

Raw media tidak harus disimpan selamanya.

Retention perlu mempertimbangkan:

- privacy
- storage
- legal/operational needs
- dispute window
- warranty period

Final transaction summary dapat disimpan lebih lama daripada raw media jika policy mengizinkan.

---

# 67. Storage Security

Media proof sebaiknya disimpan dalam protected/private storage.

Akses menggunakan:

- authenticated access
- authorization
- signed URL
- expiration
- access logging

Public permanent URL sebaiknya dihindari untuk media sensitif.

---

# 68. Access Control

### Customer

Melihat proof milik order sendiri.

### Provider / Worker

Mengelola proof execution yang menjadi tanggung jawabnya.

### Admin

Mengakses sesuai role dan operational need.

### Internal

Evidence tertentu hanya untuk internal.

---

# 69. Proof Notification

Contoh:

```text
Provider submitted service proof.
Please review the service result.
```

Notifikasi dapat muncul ketika:

- proof submitted
- revision requested
- proof resubmitted
- required proof missing

---

# 70. Provider Reminder

Jika execution telah menuju selesai tetapi proof belum lengkap:

```text
Execution
↓
Required Proof Missing
↓
Provider Reminder
```

Jika melewati batas waktu:

```text
Reminder
↓
Escalation
↓
Operations/Admin
```

---

# 71. Customer Reminder

Jika proof sudah submitted tetapi customer belum melakukan review:

```text
Proof Submitted
↓
Customer Notification
↓
Reminder
```

Aturan reminder harus memiliki batas agar tidak spam.

---

# 72. Proof Fraud / Suspicious Evidence

Sistem dapat memberi flag jika menemukan pola mencurigakan:

- duplicate image
- reused evidence
- inconsistent metadata
- suspicious timestamp
- same media digunakan berulang

Label yang tepat:

```text
SUSPICIOUS / REVIEW_REQUIRED
```

bukan otomatis menyatakan fraud.

---

# 73. AI Proof Assistance

Smart system dapat membantu:

- blur detection
- duplicate detection
- evidence completeness
- before/after grouping
- checklist summary
- extracting measurement
- generating service summary
- detecting possible missing evidence

AI hanya memberikan assistance.

AI tidak menjadi pengambil keputusan final.

---

# 74. Offline Proof

Provider dapat bekerja di area dengan internet buruk.

Flow:

```text
Capture
↓
Local Pending
↓
Network Available
↓
Upload
↓
Validate
↓
Sync
```

UI harus menunjukkan:

```text
Pending Upload
```

bukan berpura-pura bahwa proof sudah tersimpan di server.

---

# 75. Sync

Setiap evidence memiliki unique identifier.

Tujuannya mencegah:

- duplicate upload
- duplicate proof
- conflict antar device

---

# 76. Proof Ownership / Record

Provider membuat evidence, tetapi setelah menjadi bagian dari order:

> Proof merupakan bagian dari transaction/service record Servio sesuai aturan penyimpanan, akses, retention, dan privacy platform.

---

# 77. Proof + Service Execution

Service Execution menjawab:

> Apa yang sedang dilakukan provider?

Proof menjawab:

> Apa evidence dari pekerjaan tersebut?

Contoh:

```text
Execution:
Filter cleaned

Proof:
Photo + checklist
```

---

# 78. Proof + Tracking

Tracking menjawab:

> Provider di mana/statusnya bagaimana?

Proof menjawab:

> Apa bukti pekerjaan?

Contoh:

```text
Tracking:
Provider arrived 14:25

Proof:
Before/After Photo
Testing Result
```

---

# 79. Proof + Completion

Urutan:

```text
Execution
↓
Proof Submitted
↓
Customer Review
↓
Customer Confirmation
↓
Completion
```

Feature #10 yang menentukan penyelesaian resmi.

---

# 80. Proof + Complaint / Dispute

Jika customer tidak setuju:

```text
Proof
↓
Report Issue
↓
Complaint / Dispute
```

Proof menjadi evidence pendukung.

Resolution dilakukan oleh Feature #12.

---

# 81. Proof + Warranty

Proof disimpan agar dapat digunakan ketika warranty muncul.

```text
Service
↓
Proof
↓
Completion
↓
Warranty
```

Warranty dapat merujuk pada original proof/service record.

---

# 82. Proof + Service History

Setelah service selesai:

```text
Proof
↓
Service History
```

Contoh:

```text
Asset:
AC Samsung

Service:
Cleaning

Date:
19 Sept 2026

Proof:
Photos
Checklist
Testing
```

---

# 83. Proof + Asset

Asset-related service:

```text
Asset
↓
Execution
↓
Proof
↓
History
```

Evidence tetap terikat pada asset yang relevan.

---

# 84. Proof + Product

Material/spare part yang digunakan dapat dihubungkan dengan Product.

```text
Product
↓
Material Used
↓
Proof
↓
Service Order
```

Implementasi detail berada di Feature #19 Service + Product Integration.

---

# 85. Proof + Communication

Provider dapat membagikan proof melalui chat.

Contoh:

```text
Provider shared Service Proof
```

Namun:

> Chat bukan source of truth untuk evidence.

Evidence resmi tetap tersimpan di Proof module.

---

# 86. Proof + Payment

Proof dapat menjadi prerequisite dalam flow tertentu.

Contoh:

```text
Service
↓
Proof
↓
Customer Confirmation
↓
Completion
↓
Payment Release / Payout
```

Namun Proof tidak boleh melakukan payment action sendiri.

---

# 87. Proof + Escrow

Jika menggunakan escrow:

```text
Proof Submitted
↓
Customer Confirmation
↓
Completion
↓
Escrow Release
```

Proof hanya menyediakan evidence.

Release tetap ditangani Payment & Protection.

---

# 88. Customer Proof Screen

Konsep UI:

```text
SERVICE PROOF

AC Cleaning

Service Date
19 Sept 2026

BEFORE
[ Photo ]

WORK PROCESS
[ Photo ]

AFTER
[ Photo ]

CHECKLIST
✓ Filter cleaned
✓ Drain checked
✓ Unit tested

TEST RESULT
22°C — PASS

MATERIAL USED
...

PROVIDER NOTE
...

[Review Service]
```

---

# 89. Provider Proof Screen

```text
SERVICE PROOF

Required
✓ Before Photo
✓ After Photo
✓ Checklist
✓ Test Result

Optional
✓ Work Photo
○ Video
○ Additional Note

Proof Completeness
100%

[SUBMIT PROOF]
```

---

# 90. Admin Proof Screen

Admin dapat melihat:

- Order
- Provider
- Worker
- Service
- Proof status
- Completeness
- Submitted at
- Viewed at
- Revision history
- Exceptions
- Audit event

---

# 91. Data Model

Entitas utama:

```text
proof_packages
proof_items
proof_media
proof_checklists
proof_measurements
proof_tests
proof_materials
proof_signatures
proof_versions
proof_events
proof_exceptions
```

---

# 92. `proof_packages`

Konsep field:

```text
proof_package_id
order_id
execution_id
status
version
submitted_at
reviewed_at
accepted_at
locked_at
created_at
```

---

# 93. `proof_items`

Konsep field:

```text
proof_item_id
proof_package_id
proof_type
stage
requirement_level
status
created_by
created_at
```

---

# 94. `proof_media`

Konsep field:

```text
proof_media_id
proof_item_id
file_id
mime_type
file_size
storage_key
checksum
uploaded_at
```

---

# 95. `proof_checklists`

Konsep field:

```text
checklist_id
proof_item_id
template_id
item
required
completed
note
completed_by
completed_at
```

---

# 96. `proof_measurements`

Konsep field:

```text
measurement_id
proof_item_id
measurement_type
value
unit
result
recorded_by
recorded_at
```

---

# 97. `proof_tests`

Konsep field:

```text
test_id
proof_item_id
test_type
value
unit
status
note
tested_by
tested_at
```

---

# 98. `proof_materials`

Konsep field:

```text
proof_material_id
proof_item_id
product_id
product_name
quantity
unit
source
recorded_by
recorded_at
```

---

# 99. `proof_signatures`

Konsep field:

```text
signature_id
proof_item_id
actor_id
purpose
signature_method
signed_at
```

---

# 100. `proof_versions`

Konsep field:

```text
proof_version_id
proof_package_id
version_number
created_by
reason
created_at
```

---

# 101. `proof_events`

Contoh:

```text
PROOF_CREATED
PROOF_UPLOADED
PROOF_VALIDATED
PROOF_SUBMITTED
PROOF_VIEWED
PROOF_REVISION_REQUESTED
PROOF_RESUBMITTED
PROOF_ACCEPTED
PROOF_LOCKED
```

---

# 102. `proof_exceptions`

Konsep field:

```text
exception_id
proof_requirement_id
reason
created_by
approval_status
approved_by
approved_at
created_at
```

---

# 103. Proof Lifecycle Final

```text
SERVICE EXECUTION
      ↓
CAPTURE EVIDENCE
      ↓
BUILD PROOF PACKAGE
      ↓
VALIDATE REQUIREMENT
      ↓
SUBMIT PROOF
      ↓
CUSTOMER REVIEW
      │
      ├───────────────┐
      ↓               ↓
NO ISSUE         REVISION REQUIRED
      ↓               ↓
#10 COMPLETION    PROVIDER REVISE
                      ↓
                   RESUBMIT
```

---

# 104. Customer Flow

```text
Order Active
↓
Provider Works
↓
Proof Submitted
↓
Customer receives notification
↓
Open Proof
↓
Review result
↓
 ├── Confirm → Feature #10
 └── Report Issue → Feature #12
```

---

# 105. Provider Flow

```text
Service Execution
↓
Capture Evidence
↓
Complete Required Proof
↓
Validation
↓
Submit
↓
Customer Review
↓
 ├── No Revision
 └── Revision Required
      ↓
   Update Evidence
      ↓
   Resubmit
```

---

# 106. Admin Flow

```text
Monitor Proof
↓
Review Exceptions
↓
Handle Missing/Suspicious Evidence
↓
Override if policy permits
↓
Audit
```

---

# 107. Proof Matrix

| Service | Before | During | After | Checklist | Measurement | Testing | Signature |
|---|---:|---:|---:|---:|---:|---:|---:|
| AC Repair | ✅ | Optional | ✅ | ✅ | Optional/✅ | ✅ | Optional |
| Cleaning | Recommended | Optional | ✅ | Optional/✅ | ❌ | ❌ | Optional |
| Electrical | ✅ | Optional | ✅ | ✅ | ✅ | ✅ | Optional |
| Plumbing | ✅ | Optional | ✅ | ✅ | Optional | ✅/Optional | Optional |
| Automotive | ✅ | Optional | ✅ | ✅ | ✅ | ✅ | Optional |
| Renovation | ✅ | ✅ | ✅ | ✅ | ✅ | Optional/✅ | Optional |
| Pickup & Return | ✅ | Optional | ✅ | Optional | Optional | Optional | ✅/Optional |
| Remote | Optional | ✅ | ✅ | ✅/Optional | Optional | ✅/Optional | Optional |

> Matrix ini merupakan konfigurasi awal. Requirement final per Service Offering dikontrol melalui taxonomy/service configuration Servio.

---

# 108. Edge Case — Customer Menolak Foto

Flow:

```text
Required Photo
↓
Customer refuses
↓
Provider selects Exception
↓
Reason recorded
↓
Alternative evidence if possible
↓
Platform policy decides
```

Tidak boleh memaksa provider membuat foto palsu.

---

# 109. Edge Case — Foto Tidak Jelas

```text
Upload
↓
Quality Validation
↓
Blur / Insufficient Quality
↓
Warning
↓
Retake / Replace
```

Original submission tetap tercatat bila sudah menjadi event audit.

---

# 110. Edge Case — Testing Failed

```text
Testing
↓
FAIL
```

Provider tidak boleh mengubah hasil menjadi `PASS`.

Proof harus merekam:

- actual result
- failure
- note
- next action jika tersedia

---

# 111. Edge Case — Service Sebagian Selesai

```text
Task A ✓
Task B ✓
Task C ✕
```

Proof harus menunjukkan status partial completion.

Completion policy berada di Feature #10.

---

# 112. Edge Case — Proof Tidak Lengkap

```text
Execution Finished
↓
Required Proof Missing
↓
Provider Reminder
↓
Additional Proof
```

Tidak otomatis berarti service gagal.

---

# 113. Edge Case — Upload Offline

```text
Captured Offline
↓
Pending Upload
↓
Network Available
↓
Sync
↓
Server Validation
```

Customer tidak boleh menerima file sebagai final sebelum server menyimpan evidence dengan benar.

---

# 114. Edge Case — Duplicate Evidence

Sistem dapat mendeteksi duplicate/similar file dan memberi warning.

Namun duplicate detection tidak otomatis menyatakan provider melakukan pelanggaran.

---

# 115. Edge Case — Suspicious Timestamp

Jika timestamp media berbeda jauh dengan execution event:

```text
Flag
↓
Review
```

Jangan otomatis menuduh manipulasi.

---

# 116. Edge Case — Worker Reassigned

Jika worker berubah:

```text
Worker A
↓
Reassigned
↓
Worker B
```

Proof harus tetap menunjukkan siapa yang membuat masing-masing evidence.

---

# 117. Edge Case — Multiple Visit

```text
Visit 1
↓
Proof Package 1

Visit 2
↓
Proof Package 2

Final
↓
Final Proof Package
```

---

# 118. Edge Case — Emergency

Mandatory proof dapat dibuat lebih minimal agar tidak menghambat respon.

Evidence tambahan dapat dilengkapi setelah kondisi stabil.

---

# 119. Edge Case — Privacy Concern

Jika foto mengandung data yang tidak diperlukan:

```text
Detect / Warning
↓
Crop / Blur / Retake
↓
Submit
```

---

# 120. FINAL LOCKED PRINCIPLES

1. Proof of Service adalah evidence system.
2. Proof bukan hanya foto.
3. Proof dapat berupa media, checklist, measurement, testing, material, report, signature, OTP, dan system event.
4. Proof terikat pada order dan execution.
5. Setiap proof memiliki metadata.
6. Server timestamp menjadi timestamp resmi sistem.
7. Proof requirement dikontrol oleh platform.
8. Service Offering menjadi sumber konfigurasi proof requirement.
9. Provider tidak boleh menghilangkan mandatory platform requirement.
10. Requirement dapat berstatus Required, Recommended, Optional, atau Not Applicable.
11. Proof memiliki stage Before, During, After, Testing, dan Final.
12. Tidak semua service membutuhkan semua stage.
13. Proof dapat dibuat oleh provider/worker.
14. Sistem juga dapat menghasilkan system evidence.
15. Proof memiliki Proof Package.
16. Satu execution dapat menghasilkan satu final package.
17. Multi-visit dapat memiliki beberapa package.
18. Project dapat memiliki package per milestone.
19. Proof mendukung versioning.
20. Original evidence tidak boleh hilang hanya karena revisi.
21. Final proof tidak boleh dihapus sembarangan.
22. Revisi harus mempunyai reason.
23. Audit trail wajib tersedia.
24. Proof lifecycle memiliki status yang jelas.
25. Upload tidak otomatis berarti proof valid.
26. Validation dilakukan sebelum final submission.
27. Required proof yang belum lengkap dapat memblokir final submission.
28. Customer melihat package, bukan menyetujui setiap file satu-satu.
29. Customer dapat meminta revision.
30. Customer viewed tidak sama dengan customer confirmed.
31. Proof accepted tidak sama dengan order completed.
32. Customer confirmation berada di Feature #10.
33. Report issue dapat diarahkan ke Feature #12.
34. Proof menjadi supporting evidence untuk dispute.
35. Proof dapat mendukung warranty.
36. Proof dapat menjadi bagian service history.
37. Proof dapat dikaitkan dengan asset.
38. Proof dapat menghubungkan material dengan Product Integration.
39. Proof tidak menentukan harga.
40. Proof tidak memproses payment.
41. Proof tidak melakukan tracking.
42. Proof tidak menentukan completion.
43. Arrival proof berbeda dengan service proof.
44. Testing result harus merekam hasil sebenarnya.
45. Failed test tetap harus dapat dicatat.
46. Partial completion tetap dapat memiliki proof.
47. Blocked service tetap dapat memiliki proof.
48. Emergency dapat menggunakan minimal proof.
49. Privacy menjadi requirement utama.
50. Provider harus menghindari pengambilan data pribadi yang tidak diperlukan.
51. Media sebaiknya disimpan dalam protected/private storage.
52. Akses media harus menggunakan authorization.
53. Tracking/location context tidak wajib ditampilkan sebagai koordinat.
54. Customer hanya melihat proof yang berhak dilihat.
55. Provider hanya mengelola proof execution yang menjadi tanggung jawabnya.
56. Admin memiliki access sesuai role.
57. AI dapat membantu validation dan completeness.
58. AI tidak menjadi pengambil keputusan final.
59. Suspicious evidence hanya menjadi flag/review trigger.
60. Duplicate detection tidak otomatis berarti fraud.
61. Offline upload harus didukung.
62. Pending upload harus terlihat.
63. Sync harus mencegah duplicate evidence.
64. Worker identity harus tercatat.
65. Reassignment harus tetap dapat diaudit.
66. Signature memiliki purpose.
67. Signature tidak otomatis berarti persetujuan finansial.
68. OTP memiliki purpose/context.
69. Proof package dapat menjadi bagian transaction record.
70. Raw media retention harus mengikuti privacy dan retention policy.
71. Notification dapat dipicu oleh proof event.
72. Provider dapat menerima reminder ketika proof belum lengkap.
73. Customer dapat menerima notification ketika proof tersedia.
74. Admin dapat menangani exception dan audit.
75. Proof tetap menjaga boundary yang jelas dengan feature lain.
76. **Proof of Service adalah evidence bahwa pekerjaan dan hasil service terdokumentasi secara terstruktur, bukan pengganti proses completion.**

---

# 121. Boundary Final Antar-Feature

```text
#7 SERVICE EXECUTION
"Provider melakukan apa?"
        ↓
#8 TRACKING DETAIL
"Customer melihat perjalanan/status apa?"
        ↓
#9 PROOF OF SERVICE
"Apa bukti pekerjaan tersebut?"
        ↓
#10 COMPLETION
"Kapan order resmi selesai?"
        ↓
#11 RATING & REVIEW
"Bagaimana pengalaman customer?"
        ↓
#12 COMPLAINT / DISPUTE
"Apa yang dilakukan jika ada masalah?"
        ↓
#13 WARRANTY
"Apa yang terjadi jika masalah muncul dalam periode warranty?"
        ↓
#14 SERVICE HISTORY
"Apa riwayat service yang tersimpan?"
```

---

# 122. Konsep Final Singkat

> **Proof of Service adalah sistem evidence terstruktur yang mengumpulkan, memvalidasi, menyimpan, dan menyajikan bukti pelaksanaan service—mulai dari kondisi sebelum pekerjaan, proses, hasil, testing, material, hingga acknowledgment—agar setiap service memiliki rekam bukti yang jelas, dapat diaudit, dan dapat digunakan pada proses completion, dispute, warranty, serta service history tanpa mengambil alih fungsi feature-feature tersebut.**

---

## STATUS FINAL

**FEATURE #9 — PROOF OF SERVICE ✅ LOCKED**

Dokumen ini menjadi baseline untuk:

- UI/UX
- PRD
- Database
- API
- Provider Flow
- Customer Flow
- Admin Flow
- Service Execution Integration
- Completion Integration
- Dispute Evidence
- Warranty Evidence
- Service History
