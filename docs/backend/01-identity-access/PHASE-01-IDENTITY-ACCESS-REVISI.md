# SERVIO — PHASE 01: IDENTITY & ACCESS

**Status:** LOCKED  
**Document Type:** Business & Functional Specification / Source of Truth  
**Phase:** 01  
**Domain:** Identity & Access  
**Version:** 1.0  
**Last Updated:** 2026-10-05

---

# 1. PURPOSE

Phase 01 — Identity & Access merupakan fondasi identitas dan akses seluruh platform SERVIO.

Domain ini bertanggung jawab memastikan:

1. siapa pengguna SERVIO;
2. bagaimana akun dibuat;
3. bagaimana identitas diverifikasi;
4. role apa yang dimiliki pengguna;
5. pengguna berada pada organisasi/business mana;
6. permission apa yang dimiliki;
7. status akun dan membership;
8. bagaimana profile pengguna dikelola;
9. bagaimana authentication dan session dikelola;
10. bagaimana akses dibatasi dan dicabut;
11. bagaimana aktivitas sensitif diaudit.

Identity & Access menjadi **security boundary utama** sebelum pengguna dapat mengakses domain/service lain.

Prinsip utama:

```text
USER
  ↓
ACCOUNT STATUS
  ↓
ROLE / MEMBERSHIP
  ↓
ORGANIZATION CONTEXT
  ↓
PERMISSION
  ↓
RESOURCE OWNERSHIP
  ↓
ALLOW / DENY
```

---

# 2. SCOPE

## 2.1 Included

Phase 01 mencakup:

- Authentication
- Email/password login
- Google OAuth login
- OTP verification
- Brevo OTP delivery
- Customer registration
- Business registration/application
- Provider approval
- Merchant approval
- Supplier approval
- Worker invitation
- Existing account invitation handling
- Internal staff creation
- Internal staff onboarding
- CEO seeded master account
- User account
- Account status
- Role
- Permission
- Organization
- Membership
- Profile management
- Password reset
- Session management
- Logout / logout all sessions
- Account suspension
- Role/membership revocation
- Google account linking
- Audit trail

## 2.2 Out of Scope

Identity & Access tidak menjadi owner untuk:

- Product
- Category
- Service/Jasa
- Order
- Payment
- Escrow
- Commission
- Tax
- Payout
- Return
- Refund
- Warranty
- Support
- Dispute
- Notification business logic
- Analytics

Domain lain hanya menggunakan identity, role, organization, permission, dan status yang disediakan Identity & Access.

---

# 3. CORE PRINCIPLES

## 3.1 Role bukan service

Role tidak dibuat menjadi microservice tersendiri.

Role merupakan bagian dari authorization.

## 3.2 Role bukan permission

Role adalah kumpulan permission yang diberikan berdasarkan fungsi pengguna.

Contoh:

```text
SERVICE_PROVIDER
    ↓
permissions
    ├── manage_workers
    ├── manage_business_profile
    └── view_provider_resources
```

## 3.3 User berbeda dengan Organization

User adalah individu.

Organization adalah entitas bisnis/organisasi tempat user menjalankan aktivitas.

Contoh:

```text
USER
  ↓
WORKER MEMBERSHIP
  ↓
PROVIDER ORGANIZATION
```

## 3.4 Authentication berbeda dengan Identity Verification

Login Google membuktikan akses terhadap Google Account, tetapi bukan bukti NIK/e-KTP.

Karena itu:

> Google OAuth tidak menggantikan KYC/identity verification SERVIO.

## 3.5 Brevo bukan source of truth identity

Brevo hanya digunakan sebagai pihak ketiga untuk mengirim OTP.

Source of truth OTP verification tetap berada pada Identity & Access SERVIO.

## 3.6 Data tidak dihapus sembarangan

Deactivation/suspension tidak berarti physical deletion.

Data historis tetap dipertahankan untuk audit dan referensi transaksi.

---

# 4. ROLE DEFINITIONS

SERVIO memiliki 9 role utama.

## 4.1 CUSTOMER

Pengguna akhir yang menggunakan SERVIO untuk:

- mencari jasa;
- booking jasa;
- membeli produk/sparepart;
- melacak layanan/order;
- menyetujui biaya;
- melakukan pembayaran;
- menerima pekerjaan;
- mengelola warranty;
- memberikan rating/review.

Identity & Access hanya menangani identitas, akun, profile, authentication, dan authorization-nya.

---

## 4.2 SERVICE_PROVIDER

Business partner yang menyediakan jasa.

Dapat:

- mengelola business profile;
- mengelola teknisi;
- mengundang worker;
- mengakses resource organisasi sendiri;
- menggunakan fitur provider pada domain Service/Order/Finance sesuai permission.

Tidak dapat:

- mengakses organization provider lain;
- mengubah role sendiri;
- approve application sendiri;
- mengakses fungsi internal tanpa permission.

---

## 4.3 WORKER_TECHNICIAN

Teknisi yang bekerja di bawah Provider.

Worker:

- tidak memiliki public registration;
- dibuat melalui invitation Provider;
- memiliki membership terhadap Provider;
- hanya dapat aktif pada satu Provider pada satu waktu untuk versi awal SERVIO.

Dapat:

- mengelola profile sendiri;
- mengakses pekerjaan yang ditugaskan;
- menjalankan fungsi technician pada Service domain.

---

## 4.4 MERCHANT

Business partner yang menjual produk.

Dapat:

- mengelola business profile;
- mengelola produk melalui Product/Catalog Service;
- memproses order melalui Order Service;
- menjalankan return/after-sales sesuai domain.

Tidak dapat:

- mengakses data merchant lain;
- approve application sendiri;
- mengakses fungsi internal tanpa permission.

---

## 4.5 SUPPLIER

Business partner untuk kebutuhan supplier/B2B.

Dapat:

- mengelola business profile;
- menjalankan supplier functionality;
- menjalankan B2B functionality setelah domain B2B dibahas/diaktifkan.

B2B bukan bagian inti Phase 01.

---

## 4.6 CUSTOMER_SUPPORT

Internal staff yang menangani:

- ticket;
- complaint;
- live chat;
- dispute;
- mediation.

Akun hanya dibuat oleh CEO.

---

## 4.7 FINANCE_PAYMENT_OPS

Internal staff yang menangani operasi:

- payment;
- escrow;
- settlement;
- payout;
- refund execution;
- financial operations.

Akun hanya dibuat oleh CEO.

---

## 4.8 ADMIN_OPERATIONS

Internal operational administrator yang menangani antara lain:

- business application review;
- approval/rejection/revision;
- operational administration;
- category/catalog moderation sesuai domain.

Admin tidak otomatis menjadi superuser.

Admin tidak boleh mengubah role/permission dirinya sendiri atau mengelola CEO tanpa authority yang sesuai.

---

## 4.9 CEO_PRODUCT_OWNER

Master operational role.

CEO dapat:

- membuat internal staff;
- menentukan role/access internal;
- mengaktifkan/menonaktifkan staff;
- mengawasi konfigurasi dan operasi platform sesuai domain.

CEO adalah seeded master account dan tidak melalui public registration.

---

# 5. AUTHENTICATION

SERVIO menyediakan dua metode utama authentication:

```text
AUTHENTICATION
├── Email + Password
└── Google OAuth
```

Kedua metode menghasilkan authenticated SERVIO session.

Setelah authentication, sistem tetap melakukan pengecekan:

```text
Account
  ↓
Status
  ↓
Role
  ↓
Organization/Membership
  ↓
Permission
```

---

# 6. EMAIL + PASSWORD

Flow:

```text
User
 ↓
Input email/phone + password
 ↓
Identity Service
 ↓
Validate credential
 ↓
Check account status
 ↓
Load role/membership
 ↓
Create authenticated session
 ↓
Access granted
```

Jika credential salah:

```text
FAILED LOGIN
 ↓
Attempt policy
 ↓
Temporary protection if threshold exceeded
```

Credential tidak boleh disimpan dalam bentuk plaintext.

---

# 7. GOOGLE OAUTH

Google OAuth merupakan metode authentication tambahan.

Flow pengguna baru:

```text
Google Login
 ↓
Google OAuth
 ↓
SERVIO menerima verified identity
 ↓
Account belum ada?
 ↓
Create SERVIO account
 ↓
Customer onboarding
 ↓
NIK + e-KTP
 ↓
OTP verification via Brevo
 ↓
Identity verification
 ↓
CUSTOMER ACTIVE
```

Untuk existing account:

```text
Google Login
 ↓
Match/link Google identity
 ↓
Existing SERVIO account
 ↓
Check account status
 ↓
Login
```

## 7.1 Google tidak boleh bypass KYC

Untuk Customer baru:

```text
Google OAuth
 ≠
KYC
```

Google tidak menggantikan:

- NIK;
- e-KTP;
- OTP verification.

## 7.2 Google Account Linking

Jika user sudah memiliki account email/password dan login dengan Google menggunakan identity yang sesuai, sistem harus memiliki mekanisme linking yang aman.

Tujuan:

```text
1 User
+
1 SERVIO Account
+
Multiple Authentication Methods
```

Bukan membuat duplicate account.

Sistem harus mencegah:

```text
Email/password
→ Account A

Google
→ Account B
```

untuk identitas yang seharusnya sama.

Account linking hanya dilakukan jika identity matching dan security verification memenuhi policy.

---

# 8. OTP & BREVO

OTP digunakan untuk verification dan proses security yang membutuhkan verifikasi.

Brevo digunakan sebagai pihak ketiga untuk delivery OTP.

Flow:

```text
User
 ↓
Request OTP
 ↓
Identity Service
 ↓
Generate OTP
 ↓
Store verification state
 ↓
Call Brevo API
 ↓
Brevo
 ↓
Email OTP
 ↓
User enters OTP
 ↓
Identity Service validates OTP
```

## 8.1 Environment Variables

Credential Brevo tidak boleh hardcode.

Contoh:

```env
BREVO_API_KEY=...
BREVO_SENDER_EMAIL=...
BREVO_SENDER_NAME=SERVIO
```

Nilai sebenarnya disimpan pada environment deployment/local environment.

## 8.2 Identity Service tetap menjadi source of truth

Brevo:

- mengirim email;
- tidak menentukan apakah OTP valid;
- tidak menentukan account active;
- tidak menentukan role.

SERVIO yang menentukan hasil verification.

## 8.3 OTP Rules

OTP harus memiliki:

- expiration;
- maximum verification attempts;
- resend policy;
- invalidation setelah berhasil digunakan;
- protection terhadap abuse;
- rate limiting.

OTP lama harus tidak valid setelah OTP baru diterbitkan jika policy menggunakan single-active-OTP.

## 8.4 OTP Failure

Jika OTP salah:

```text
INVALID OTP
 ↓
Attempt count
 ↓
Retry atau temporary lock
```

Jika expired:

```text
OTP EXPIRED
 ↓
Request new OTP
```

---

# 9. CUSTOMER REGISTRATION

Customer dapat membuat account sendiri.

Flow final:

```text
Customer
 ↓
Register
 ↓
Account Data
 ↓
NIK + e-KTP
 ↓
OTP via Brevo
 ↓
Verification
 ↓
Account ACTIVE
 ↓
Login
 ↓
Customer Dashboard
```

Google dapat digunakan pada authentication/onboarding, tetapi Customer tetap wajib menyelesaikan identity verification.

## 9.1 Customer Data

Data dasar dapat meliputi:

- nama;
- email;
- nomor HP;
- password jika menggunakan password;
- foto profile;
- NIK;
- e-KTP;
- verification status.

---

# 10. BUSINESS REGISTRATION

Role berikut menggunakan business application:

- SERVICE_PROVIDER
- MERCHANT
- SUPPLIER

Mereka tidak langsung active.

Flow:

```text
Applicant
 ↓
Owner Account
 ↓
PIC Data
 ↓
Business Data
 ↓
Legal Documents
 ↓
Business Specialization
 ↓
Supporting Documents
 ↓
Submit
 ↓
Application ID
 ↓
PENDING_REVIEW
 ↓
Admin Review
```

---

# 11. BUSINESS APPLICATION STATUS

Lifecycle:

```text
DRAFT
 ↓
PENDING_REVIEW
 ↓
┌──────────────┬─────────────────┐
↓              ↓                 ↓
APPROVED       REVISION_REQUIRED REJECTED
↓              ↓
ACTIVE         Applicant Edit
               ↓
               Submit Again
               ↓
               PENDING_REVIEW
```

## 11.1 Application ID

Setiap application memiliki Application ID.

Contoh:

```text
APP-2026-000123
```

Application ID tetap sama ketika applicant melakukan revision.

## 11.2 Request Revision

Admin memberikan:

- alasan;
- bagian yang perlu diperbaiki;
- reviewer;
- timestamp.

Applicant memperbaiki data dan submit kembali.

## 11.3 Reject

Reject harus memiliki:

- alasan;
- reviewer;
- timestamp;
- decision history.

Rejected application tidak otomatis menjadi ACTIVE.

---

# 12. BUSINESS APPLICATION REVIEW

Admin Operations dapat:

```text
APPROVE
REQUEST REVISION
REJECT
```

Admin dapat melihat:

- applicant;
- PIC;
- business data;
- legal documents;
- specialization;
- verification state;
- application history.

Concurrent review harus ditangani agar dua admin tidak menghasilkan dua keputusan berbeda secara bersamaan.

---

# 13. WORKER INVITATION

Worker tidak melakukan public registration.

Flow:

```text
SERVICE_PROVIDER
 ↓
Kelola Teknisi
 ↓
Invite Worker
 ↓
Invitation
```

Ada dua kondisi.

## 13.1 Worker belum memiliki account

```text
Invitation
 ↓
Create/activate account
 ↓
Complete profile
 ↓
Worker Membership
 ↓
ACTIVE
```

## 13.2 Worker sudah memiliki account

```text
Invitation
 ↓
Existing Account
 ↓
Accept Invitation
 ↓
Create/activate Worker Membership
 ↓
ACTIVE
```

Sistem tidak membuat duplicate user account.

## 13.3 Worker Organization Rule

Untuk versi awal:

> Satu Worker hanya boleh memiliki satu Provider membership yang aktif pada satu waktu.

Membership dapat berstatus:

- INVITED;
- ACTIVE;
- DEACTIVATED;
- EXPIRED jika invitation tidak digunakan.

---

# 14. INTERNAL STAFF ONBOARDING

Internal roles:

- CUSTOMER_SUPPORT
- FINANCE_PAYMENT_OPS
- ADMIN_OPERATIONS

Tidak boleh melakukan public registration.

Flow:

```text
CEO
 ↓
Create Staff
 ↓
Invitation
 ↓
Staff Login
 ↓
Confirm Account
 ↓
Complete Profile
 ↓
Employee KYC
 ↓
NDA
 ↓
Access Rights Confirmation
 ↓
OPERATIONAL_READY
```

Staff tidak mendapatkan operational access sebelum onboarding requirement selesai.

---

# 15. CEO ACCOUNT

CEO menggunakan seeded master account.

```text
Initial System Setup
 ↓
CEO Account Seeded
 ↓
Login
 ↓
CEO Access
```

Tidak tersedia:

```text
Register as CEO
```

CEO dapat mengelola internal staff sesuai permission master.

---

# 16. ORGANIZATION & MEMBERSHIP

Identity & Access membedakan:

```text
USER
```

dengan:

```text
ORGANIZATION
```

dan:

```text
MEMBERSHIP
```

Contoh:

```text
User Budi
   ↓
Worker Membership
   ↓
Provider A
```

Organization dapat berupa:

- Provider organization;
- Merchant organization;
- Supplier organization;
- Internal organization/context.

Resource business harus menggunakan organization context.

Tujuannya mencegah:

```text
Provider A
X
Provider B data
```

---

# 17. PROFILE MANAGEMENT

Profile merupakan bagian resmi Phase 01.

Setiap role memiliki profile yang dapat dilihat dan dikelola sesuai permission.

## 17.1 Customer Profile

```text
Customer Profile
├── Foto
├── Nama
├── Email
├── Nomor HP
├── NIK
├── Data e-KTP
├── Verification Status
└── Account Status
```

## 17.2 Provider Profile

Dibagi menjadi:

```text
Personal Profile
+
Business Profile
```

Personal:

- nama;
- foto;
- email;
- nomor HP;
- identity data;
- account status.

Business:

- nama usaha;
- NIB;
- NPWP;
- alamat;
- kontak;
- specialization;
- legal documents;
- verification status;
- Application ID.

## 17.3 Merchant Profile

- PIC;
- nama toko/usaha;
- logo;
- NIB;
- NPWP;
- alamat;
- kontak;
- legal documents;
- verification status.

## 17.4 Supplier Profile

- PIC;
- nama perusahaan;
- logo;
- NIB;
- NPWP;
- alamat;
- kontak;
- legal documents;
- verification status.

## 17.5 Worker Profile

- foto;
- nama;
- email;
- nomor HP;
- identity;
- keahlian dasar;
- status;
- Provider;
- membership status.

Data teknis/skill lanjutan yang menjadi domain Service dapat dikelola oleh Service domain.

## 17.6 Internal Staff Profile

- foto;
- nama;
- email;
- nomor HP;
- Employee ID;
- department;
- role;
- account status;
- access status.

## 17.7 CEO Profile

- foto;
- nama;
- email;
- nomor HP;
- role;
- account status;
- security information.

---

# 18. PROFILE BOUNDARY

Identity & Access hanya menjadi owner untuk identity/profile dasar.

Contoh Provider:

Identity & Access:

```text
Nama
Kontak
Legal Identity
Business Identity
Verification
```

Service domain:

```text
Service Catalog
Service Pricing
Availability
Performance
Rating
```

Finance:

```text
Balance
Payout
Settlement
Banking
```

Dengan demikian tidak terjadi overlap ownership antar-service.

---

# 19. PROFILE EDIT RULES

User boleh melihat profile sendiri.

User hanya boleh mengubah field yang editable.

Data sensitif/verified tidak boleh bebas diubah.

Contoh:

```text
NIK verified
KTP verified
NIB verified
NPWP verified
```

Jika perlu perubahan:

```text
Request Change
 ↓
Verification/Review
 ↓
Approved
 ↓
Update
```

User tidak boleh mengubah:

- role sendiri;
- permission sendiri;
- organization ownership sendiri;
- membership privilege sendiri.

---

# 20. ACCOUNT STATUS

Status account harus mendukung lifecycle.

General:

```text
PENDING
VERIFICATION_REQUIRED
ACTIVE
SUSPENDED
DEACTIVATED
```

Business:

```text
DRAFT
PENDING_REVIEW
REVISION_REQUIRED
APPROVED
REJECTED
ACTIVE
```

Worker:

```text
INVITED
ACTIVATED
ACTIVE
DEACTIVATED
```

Staff:

```text
INVITED
ONBOARDING
OPERATIONAL_READY
SUSPENDED
DEACTIVATED
```

Status harus menjadi bagian dari authorization check.

---

# 21. AUTHORIZATION MODEL

Authorization harus memeriksa:

```text
1. Authentication
2. Account status
3. Role
4. Organization/membership
5. Permission
6. Resource ownership/context
```

Contoh:

```text
Request
 ↓
Authenticated?
 ↓
Account ACTIVE?
 ↓
Role valid?
 ↓
Membership ACTIVE?
 ↓
Permission tersedia?
 ↓
Resource milik organization?
 ↓
ALLOW
```

Jika salah satu gagal:

```text
DENY
```

---

# 22. ROLE & ACCESS MATRIX

| Aktivitas | Customer | Provider | Worker | Merchant | Supplier | CS | Finance | Admin | CEO |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Self Registration | ✓ | - | - | - | - | - | - | - | - |
| Google Login | ✓ | sesuai account | sesuai account | sesuai account | sesuai account | sesuai account | sesuai account | sesuai account | ✓ |
| Business Application | - | ✓ | - | ✓ | ✓ | - | - | review | - |
| Approve Business | - | - | - | - | - | - | - | ✓ | sesuai authority |
| Invite Worker | - | ✓ | - | - | - | - | - | - | sesuai authority |
| Create Staff | - | - | - | - | - | - | - | - | ✓ |
| Profile Own | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Change Own Role | - | - | - | - | - | - | - | - | - |
| Manage Own Membership | restricted | restricted | restricted | restricted | restricted | restricted | restricted | restricted | authority |
| Review Application | - | - | - | - | - | - | - | ✓ | oversight |
| Internal Operational Functions | - | - | - | - | - | domain | domain | domain | authority |
| Manage Internal Access | - | - | - | - | - | - | - | - | ✓ |

Catatan: matrix di atas menentukan **Identity & Access boundary**. Permission bisnis detail akan ditentukan oleh service masing-masing.

---

# 23. UI / SCREEN SPECIFICATION

## 23.1 Public Authentication

```text
/login
/register
/forgot-password
/reset-password
/verify-otp
```

Login menyediakan:

- email/password;
- Google Login;
- forgot password.

---

## 23.2 Customer

```text
/customer/profile
/customer/security
```

Profile:

- personal information;
- identity verification status;
- security.

---

## 23.3 Business Applicant

```text
/register/business
/application/:id
/application/:id/status
/application/:id/revision
```

Application status:

```text
Draft
Submitted
Under Review
Revision Required
Approved
Rejected
```

---

## 23.4 Admin

```text
/admin/applications
/admin/applications/:id
```

Detail application:

```text
Applicant
PIC
Business
Legal Documents
Specialization
Verification
Application History
Decision
```

Actions:

```text
Approve
Request Revision
Reject
```

---

## 23.5 Provider Worker Management

```text
/provider/workers
/provider/workers/invite
/provider/workers/:id
```

Actions:

```text
Invite Worker
View Worker
Deactivate Worker
```

---

## 23.6 Worker

```text
/worker/activate
/worker/profile
```

---

## 23.7 Internal Staff

```text
/ceo/staff
/ceo/staff/create
/ceo/staff/:id
```

CEO actions:

- Create staff;
- assign role;
- assign access;
- activate;
- suspend/deactivate sesuai authority.

---

## 23.8 Profile

Semua role memiliki entry point profile:

```text
/profile
```

UI menyesuaikan role dan organization context.

---

# 24. ACCOUNT SECURITY

## 24.1 Forgot Password

```text
Forgot Password
 ↓
Identity Verification
 ↓
OTP via Brevo
 ↓
Set New Password
 ↓
Invalidate Old Sessions
 ↓
Login Again
```

## 24.2 Logout

User dapat logout dari session aktif.

## 24.3 Logout All Sessions

User dapat mencabut seluruh session aktif jika diperlukan.

## 24.4 Suspension

Jika account menjadi SUSPENDED:

```text
Account Status
 ↓
SUSPENDED
 ↓
Existing Sessions Revoked/Rejected
 ↓
No Operational Access
```

## 24.5 Role Revocation

Role/membership dapat dicabut tanpa menghapus user.

Contoh:

```text
Worker
 ↓
Membership DEACTIVATED
```

Histori user tetap tersedia.

---

# 25. AUDIT TRAIL

Identity & Access wajib mencatat aktivitas sensitif.

Minimal:

```text
Login
Logout
Failed Login
OTP Request
OTP Verification
Password Change
Password Reset
Google Linking
Role Assignment
Role Revocation
Account Suspension
Account Activation
Account Deactivation
Business Application Submission
Application Approval
Application Revision
Application Rejection
Worker Invitation
Worker Activation
Staff Creation
Staff Onboarding
Permission/Access Change
```

Audit harus menyimpan konteks yang dibutuhkan untuk mengetahui:

- siapa;
- melakukan apa;
- terhadap resource apa;
- kapan;
- hasilnya;
- actor/context yang relevan.

---

# 26. BUSINESS RULES

## BR-01 — Unique Account

Email/identifier account tidak boleh menghasilkan duplicate account yang tidak sah.

## BR-02 — Role Cannot Be Self-Selected Arbitrarily

User tidak dapat memilih role sensitif seperti CEO/Admin/Finance pada public registration.

## BR-03 — Business Requires Approval

Provider/Merchant/Supplier harus melalui Admin review sebelum ACTIVE.

## BR-04 — Worker Has No Public Registration

Worker hanya dibuat melalui Provider invitation.

## BR-05 — Staff Has No Public Registration

CS/Finance/Admin hanya dibuat oleh CEO.

## BR-06 — CEO Is Seeded

CEO tidak melalui public registration.

## BR-07 — Google Does Not Bypass KYC

Google OAuth tidak menggantikan NIK/e-KTP/OTP verification.

## BR-08 — Brevo Is Delivery Provider

Brevo hanya mengirim OTP. Identity decision tetap berada di SERVIO.

## BR-09 — OTP Must Expire

OTP yang expired tidak boleh digunakan.

## BR-10 — OTP Attempt Limit

Verification attempt harus dibatasi.

## BR-11 — Existing Account Must Not Be Duplicated

Invitation atau Google linking tidak boleh membuat duplicate account yang seharusnya merupakan user yang sama.

## BR-12 — Application ID Persists Through Revision

Revision tidak membuat Application ID baru.

## BR-13 — Application Decision Is Audited

Approve/Revision/Reject harus memiliki actor, reason, timestamp, dan history.

## BR-14 — Profile Self Access

User dapat melihat profile sendiri.

## BR-15 — Sensitive Profile Data Is Protected

KYC/legal data yang telah verified tidak bebas diedit.

## BR-16 — User Cannot Change Own Role

Role tidak dapat diubah sendiri oleh user.

## BR-17 — User Cannot Change Own Authorization

User tidak dapat menaikkan permission sendiri.

## BR-18 — Organization Isolation

User hanya boleh mengakses resource sesuai organization/membership context.

## BR-19 — Worker Single Active Provider

Worker hanya memiliki satu Provider membership aktif pada satu waktu untuk versi awal.

## BR-20 — Deactivation Does Not Mean Deletion

Account/membership deactivated tetap memiliki histori.

## BR-21 — Suspended Account Has No Operational Access

Suspension harus mencegah akses operasional.

## BR-22 — Staff Must Reach Operational Ready

Internal staff tidak memperoleh operational access sebelum onboarding selesai.

## BR-23 — Admin Is Not Automatic Superuser

Admin Operations hanya memperoleh permission yang ditentukan.

## BR-24 — CEO Is Master Identity Authority

CEO memiliki authority untuk internal access management sesuai master policy.

## BR-25 — Domain Ownership Must Be Respected

Identity Service tidak mengambil alih data domain lain.

---

# 27. EDGE CASES

## EC-01 — OTP Expired

User harus request OTP baru.

## EC-02 — OTP Wrong Multiple Times

System menerapkan attempt limit dan temporary protection.

## EC-03 — Email Already Registered

Registration ditolak dan user diarahkan ke login/recovery flow yang sesuai.

## EC-04 — Browser Closed During Registration

Draft dapat dilanjutkan jika belum expired.

## EC-05 — Double Submit Application

Tidak membuat duplicate application.

## EC-06 — Admin Approve While Applicant Is Editing

Decision harus memeriksa state/version terbaru sebelum diproses.

## EC-07 — Two Admins Review Same Application

System harus mencegah conflicting decisions melalui concurrency protection.

## EC-08 — Worker Invitation Expired

Provider dapat mengirim invitation baru.

## EC-09 — Worker Already Invited

Tidak membuat active duplicate invitation tanpa policy yang jelas.

## EC-10 — Worker Already Has Account

Invitation menghubungkan existing account melalui membership; tidak membuat account baru.

## EC-11 — Google Email Matches Existing Account

System harus menggunakan secure account linking, bukan duplicate account creation.

## EC-12 — Google Identity Does Not Match

Tidak boleh otomatis menggabungkan dua account.

## EC-13 — Staff Does Not Finish Onboarding

Status tetap ONBOARDING dan operational access ditolak.

## EC-14 — Account Suspended While Logged In

Session lama harus dicabut atau ditolak pada authorization check.

## EC-15 — Worker Membership Revoked

Worker kehilangan operational access pada Provider tersebut, tetapi user account dan histori tetap ada.

## EC-16 — Organization Deactivated

Membership terkait tidak boleh memberikan operational access tanpa policy khusus.

## EC-17 — Sensitive Data Change

Perubahan NIK/legal identity memerlukan verification/review sesuai policy.

## EC-18 — Password Reset

Password reset harus invalidasi session lama sesuai security policy.

## EC-19 — Invitation Sent to Existing User

System menggunakan existing account dan membuat membership/invitation context.

## EC-20 — Application Rejected

Applicant tidak otomatis menjadi active business account.

## EC-21 — User Tries to Access Another Organization

Request ditolak walaupun user memiliki role yang sama.

## EC-22 — User Tries to Modify Own Permission

Request ditolak.

## EC-23 — Duplicate Google Link

Google identity yang sudah terhubung ke account lain tidak boleh di-link kembali tanpa recovery/verification policy.

## EC-24 — Brevo API Failure

OTP request harus menangani delivery failure. Verification state tidak boleh dianggap berhasil hanya karena request ke Brevo gagal/sukses.

---

# 28. COMPLETE BUSINESS FLOW

## 28.1 Customer

```text
Register / Google Login
 ↓
Create SERVIO Account
 ↓
NIK + e-KTP
 ↓
OTP via Brevo
 ↓
Verify
 ↓
ACTIVE
 ↓
Login
 ↓
Customer Profile / Customer Features
```

## 28.2 Provider / Merchant / Supplier

```text
Business Application
 ↓
Owner Account
 ↓
PIC
 ↓
Business Data
 ↓
Legal Documents
 ↓
Specialization
 ↓
Submit
 ↓
Application ID
 ↓
PENDING_REVIEW
 ↓
Admin Review
 ├── APPROVE → ACTIVE
 ├── REVISION → Edit → Submit Again
 └── REJECT → REJECTED
```

## 28.3 Worker

```text
Provider
 ↓
Invite
 ↓
Existing Account?
 ├── No → Activate/Create
 └── Yes → Link Existing Account
 ↓
Membership
 ↓
ACTIVE
```

## 28.4 Internal Staff

```text
CEO
 ↓
Create Staff
 ↓
Invitation
 ↓
Login
 ↓
Profile
 ↓
KYC
 ↓
NDA
 ↓
Access Confirmation
 ↓
OPERATIONAL_READY
```

## 28.5 CEO

```text
Seeded Account
 ↓
Authentication
 ↓
Master Access
```

---

# 29. AUTHORIZATION FLOW

Setiap request ke resource yang dilindungi harus secara konseptual melewati:

```text
REQUEST
   ↓
AUTHENTICATED?
   ↓
ACCOUNT ACTIVE?
   ↓
ROLE VALID?
   ↓
MEMBERSHIP ACTIVE?
   ↓
ORGANIZATION CONTEXT VALID?
   ↓
PERMISSION AVAILABLE?
   ↓
RESOURCE OWNERSHIP VALID?
   ↓
ALLOW
```

Jika gagal:

```text
DENY
```

---

# 30. SERVICE BOUNDARY

Identity & Access menyediakan fondasi yang digunakan service lain.

Service lain dapat membutuhkan:

- user identity;
- role;
- organization;
- membership;
- account status;
- permission;
- verification status.

Service lain tidak boleh memodifikasi identity secara langsung melalui database Identity Service.

Komunikasi harus melalui contract/API/event yang nantinya ditentukan pada architecture phase.

---

# 31. UI INFORMATION ARCHITECTURE

Baseline navigation:

```text
AUTH
├── Login
├── Register
├── Google Login
├── OTP Verification
├── Forgot Password
└── Reset Password

PROFILE
└── Profile

CUSTOMER
└── Customer Profile

BUSINESS
├── Application
├── Application Status
├── Revision
└── Business Profile

PROVIDER
└── Worker Management

WORKER
├── Activate
└── Worker Profile

ADMIN
└── Business Applications

CEO
└── Internal Staff Management
```

---

# 32. ACCEPTANCE CRITERIA

Phase 01 dinyatakan memenuhi requirement apabila:

- [ ] Customer dapat self-register.
- [ ] Customer dapat menggunakan Google Login.
- [ ] Google Login tidak bypass KYC.
- [ ] OTP dapat dikirim melalui Brevo API.
- [ ] Brevo credentials berada di environment variables.
- [ ] OTP memiliki expiration dan attempt policy.
- [ ] Customer menjadi ACTIVE setelah requirement verification selesai.
- [ ] Provider dapat mengajukan business application.
- [ ] Merchant dapat mengajukan business application.
- [ ] Supplier dapat mengajukan business application.
- [ ] Business application memiliki Application ID.
- [ ] Admin dapat Approve.
- [ ] Admin dapat Request Revision.
- [ ] Admin dapat Reject.
- [ ] Revision mempertahankan Application ID.
- [ ] Decision memiliki audit history.
- [ ] Worker tidak dapat public registration.
- [ ] Provider dapat invite Worker.
- [ ] Existing user dapat menerima Worker invitation tanpa duplicate account.
- [ ] Worker membership memiliki lifecycle.
- [ ] Worker hanya memiliki satu active Provider pada baseline.
- [ ] Internal Staff hanya dibuat CEO.
- [ ] Internal Staff harus menyelesaikan onboarding.
- [ ] Staff belum OPERATIONAL_READY tidak mendapat operational access.
- [ ] CEO menggunakan seeded master account.
- [ ] Role tidak dapat diubah sendiri.
- [ ] Permission tidak dapat dinaikkan sendiri.
- [ ] Organization isolation berjalan.
- [ ] Semua role memiliki profile.
- [ ] Sensitive profile data memiliki protection.
- [ ] Forgot Password tersedia.
- [ ] Session dapat dicabut.
- [ ] Suspended account tidak dapat beroperasi.
- [ ] Role/membership dapat direvoke tanpa menghapus user.
- [ ] Google account linking mencegah duplicate account.
- [ ] Audit trail mencatat aktivitas sensitif.
- [ ] Identity Service tidak mengambil alih domain bisnis lain.

---

# 33. FINAL LOCK DECISION

Phase 01 — Identity & Access telah mencakup:

```text
BUSINESS FLOW
       +
ROLE
       +
PERMISSION
       +
ORGANIZATION
       +
PROFILE
       +
UI
       +
BUSINESS RULES
       +
SECURITY
       +
EDGE CASES
       +
AUDIT
```

### Final Account Creation Paths

```text
1. CUSTOMER
   Self Registration / Google
   → KYC
   → OTP Brevo
   → ACTIVE

2. PROVIDER / MERCHANT / SUPPLIER
   Business Application
   → Admin Approval
   → ACTIVE

3. WORKER
   Provider Invitation
   → Account / Existing Account
   → Membership
   → ACTIVE

4. INTERNAL STAFF
   CEO Creation
   → Invitation
   → Onboarding
   → OPERATIONAL_READY

5. CEO
   Seeded Master Account
```

### Final Security Boundary

```text
USER
 ↓
ACCOUNT STATUS
 ↓
ROLE
 ↓
ORGANIZATION / MEMBERSHIP
 ↓
PERMISSION
 ↓
RESOURCE OWNERSHIP
 ↓
ALLOW / DENY
```

### LOCK

**PHASE 01 — IDENTITY & ACCESS = LOCKED**

Perubahan terhadap Phase 01 setelah LOCK tidak boleh dilakukan secara sepihak ketika mengerjakan Phase berikutnya.

Jika Phase berikutnya membutuhkan perubahan terhadap Identity & Access, perubahan harus:

1. diidentifikasi;
2. dijelaskan dampaknya;
3. dibahas ulang;
4. diperbarui pada specification;
5. direview;
6. kemudian dilakukan re-lock.

---

# 34. NEXT PHASE

Setelah Phase 01 LOCK, pembahasan berikutnya adalah:

**PHASE 02 — CATEGORY**

Fokus Phase 02:

```text
MASTER KATEGORI
├── PRODUK
│   └── CATEGORY
│       └── SUBCATEGORY
│
└── JASA
    └── CATEGORY
        └── SUBCATEGORY
```

Phase 02 tidak boleh mengubah fondasi Identity & Access yang sudah di-lock tanpa proses change/review resmi.

