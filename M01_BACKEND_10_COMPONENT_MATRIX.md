# SERVIO — MODUL 01: IDENTITY & ACCESS SERVICE
## BACKEND COMPLIANCE: 10 KOMPONEN AUDIT MATRIX

> **Dokumen Acuan:** `01-identity-access.md` (CR-02 FINAL LOCKED, Section 01–10)  
> **Status Audit:** COMPLETE — IMPLEMENTASI AKTUAL TERVERIFIKASI  
> **Tanggal Audit:** 15 Oktober 2026

---

### RINGKASAN EVALUASI 10 KOMPONEN ARSITEKTUR

```text
┌────────────────────────────────────────────────────────────────────────┐
│ KOMPONEN SPECIFICATION (CR-02 FINAL LOCKED)            │ STATUS AUDIT  │
├────────────────────────────────────────────────────────┼───────────────┤
│ 01. Service Architecture & Boundary                    │ CONFORMANT    │
│ 02. Entity Relationship Diagram (ERD) & Model          │ CONFORMANT    │
│ 03. Database Schema & MySQL Migrations                 │ CONFORMANT    │
│ 04. 84 API Operations & Standard JSON Contract         │ CONFORMANT    │
│ 05. RBAC 9 Roles & Granular Authorization              │ CONFORMANT    │
│ 06. Internal Feature Integration (OTP, Brevo, NIK)     │ CONFORMANT    │
│ 07. Inter-Microservice API (I01–I04) & Event Outbox    │ CONFORMANT    │
│ 08. Frontend–Backend API Mapping & 38 UI Matrix        │ CONFORMANT    │
│ 09. Error Handling, 25 BR & 24 Edge Cases Testing      │ CONFORMANT    │
│ 10. Final Technical Audit & Scope Boundary Lock        │ CONFORMANT    │
└────────────────────────────────────────────────────────────────────────┘
```

---

### AUDIT RINCI PER KOMPONEN

---

### 01. SERVICE ARCHITECTURE & BOUNDARY

#### Deskripsi Spesifikasi
Identity Service beroperasi sebagai microservice independen dengan database terisolasi (`servio_identity_db`), berjalan pada port `8001`. Service bertanggung jawab eksklusif atas autentikasi pengguna, manajemen identitas, RBAC 9 roles, verifikasi KYC/NIK, dan entitas tenant/organisasi. Dilarang keras melakukan penulisan database silang (*cross-service database writes*) atau foreign keys langsung ke tabel microservice lain (Order, Catalog, Payment, Review).

#### Bukti Implementasi Aktual
1. **Service Isolation & Runtime:**
   - Direktori Service: `backend/services/identity-service`
   - Port Server: `http://127.0.0.1:8001` (Terverifikasi aktif via background task).
   - Framework: Laravel 11.x standalone microservice.
2. **Stateful SPA Authentication & Session Validation (Critical Verification 1):**
   - Middleware Pipeline: `Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful` aktif pada pipeline web dan API (`backend/services/identity-service/bootstrap/app.php`).
   - Domain Stateful: Variabel `SANCTUM_STATEFUL_DOMAINS` dikonfigurasi mencakup frontend Next.js (`localhost:3000`, `127.0.0.1:3000`).
   - Mekanisme Cookie & Token:
     - `servio_session`: Cookie sesi HttpOnly terenkripsi yang membawa sesi autentikasi pengguna.
     - `XSRF-TOKEN`: Cookie CSRF token yang diterbitkan via endpoint `GET /sanctum/csrf-cookie` dan dikirimkan kembali oleh frontend pada header `X-XSRF-TOKEN`.
     - `servio_token`: Token autentikasi berbasis database (`personal_access_tokens`) untuk client non-browser / API consumer.
   - Larangan Fallback Browser Bearer Token: Frontend Next.js (`src/lib/servioApi.ts`) menggunakan konfigurasi ketat `credentials: 'include'` dengan header proteksi `X-XSRF-TOKEN`. Dilarang keras menyimpan token bearer di `localStorage` atau `sessionStorage` publik browser demi kepatuhan mitigasi serangan XSS dan CSRF hijacking.
3. **Database Boundary (Critical Verification 11):**
   - Koneksi MySQL terisolasi pada database `servio_identity_db` (MySQL port 3306).
   - Seluruh migration (`backend/services/identity-service/database/migrations/`) tidak memiliki foreign key ke tabel eksternal.
   - Domain Order, Kategori Jasa, Catalog, dan Finance murni dihubungkan melalui API REST Internal dan Event Outbox.

**Status Evaluasi:** **CONFORMANT**

---

### 02. ENTITY RELATIONSHIP DIAGRAM (ERD) & RELATIONSHIPS

#### Deskripsi Spesifikasi
ERD Modul 01 mencakup 15 tabel inti: `users`, `roles`, `user_roles`, `permissions`, `role_permissions`, `user_identities`, `user_nik_records`, `user_profiles`, `business_applications`, `business_application_revisions`, `organizations`, `organization_memberships`, `worker_invitations`, `staff_invitations`, `staff_onboardings`, `audit_logs`, `otp_challenges`, dan `outbox_events`.

#### Bukti Implementasi Aktual
1. **Model & Relationship Mapping:**
   - `User.php` (`backend/.../Models/User.php`):
     - `hasOne(UserNikRecord::class)` — NIK Customer 1-to-1 immutable.
     - `hasOne(UserProfile::class)` — Profil detail pengguna.
     - `hasMany(UserIdentity::class)` — OAuth federation (Google, etc.).
     - `belongsToMany(Role::class, 'user_roles')` / `roleAssignments()` — RBAC multi-role mapping.
     - `hasMany(OrganizationMembership::class)` / `memberships()` — Multi-tenant memberships.
     - `hasOne(StaffOnboarding::class)` — Siklus onboarding staf internal.
   - `BusinessApplication.php` (`backend/.../Models/BusinessApplication.php`):
     - `belongsTo(User::class, 'user_id')`
     - `hasMany(BusinessApplicationRevision::class, 'application_id')` — Riwayat revisi dengan preserving Application ID.
   - `Organization.php` (`backend/.../Models/Organization.php`):
     - `belongsTo(User::class, 'owner_user_id')`
     - `hasMany(OrganizationMembership::class)`
     - `hasMany(WorkerInvitation::class)`
   - `OtpChallenge.php` (`backend/.../Models/OtpChallenge.php`):
     - Model challenge OTP dengan hashing bcrypt pada `otp_code_hash`.

**Status Evaluasi:** **CONFORMANT**

---

### 03. DATABASE SCHEMA & MYSQL MIGRATIONS

#### Deskripsi Spesifikasi
Migration Laravel harus menerapkan constraint integritas data ketat: tipe data baku, unique indexes, enum values yang locked, soft-delete atau status lifecycle, audit timestamps, dan enkripsi data sensitif NIB/NPWP.

#### Bukti Implementasi Aktual
10 file migrasi aktual pada `backend/services/identity-service/database/migrations/`:
1. `0001_01_01_000001_create_cache_table.php`: Framework cache registry.
2. `0001_01_01_000002_create_jobs_table.php`: Async queue jobs & failed jobs worker.
3. `2026_10_12_000001_create_identity_base_tables.php`: Skema RBAC dasar (`roles`, `permissions`, `role_permissions`, `users`, `user_roles`).
4. `2026_10_12_000002_create_identity_profiles_and_memberships_tables.php`: Tabel profil dan multi-tenant (`user_profiles`, `user_identities`, `organizations`, `organization_profiles`, `organization_memberships`).
5. `2026_10_12_000003_create_identity_kyc_and_business_applications_tables.php`: Tabel review bisnis dan verifikasi (`kyc_verifications`, `business_applications`, `business_application_revisions`).
6. `2026_10_12_000004_create_identity_invitations_and_auth_sessions_tables.php`: Tabel undangan dan alur staf (`worker_invitations`, `staff_invitations`, `staff_onboardings`, `staff_onboarding_steps`, `otp_challenges`, `password_reset_grants`).
7. `2026_10_12_000005_create_identity_audit_and_reliable_messaging_tables.php`: Audit trail terstruktur (`audit_logs`) dan transactional outbox (`outbox_events`).
8. `2026_10_12_153446_create_personal_access_tokens_table.php`: Sanctum personal access tokens.
9. `2026_10_13_000001_create_user_nik_records_table.php`: NIK Customer 16-digit immutable write-once (`user_nik_records`).
10. `2026_10_15_000001_reencrypt_organization_nib_npwp.php`: Migrasi re-enkripsi data sensitif NIB & NPWP organisasi menggunakan enkripsi AES-256-CBC (`Crypt::encryptString`).

**Status Evaluasi:** **CONFORMANT**

---

### 04. 84 API OPERATIONS & STANDARD JSON CONTRACT

#### Deskripsi Spesifikasi
Section 04 `01-identity-access.md` mensyaratkan 84 operasi API lengkap (A01–A18, V01–V11, B01–B13, P01–P13, W01–W08, S01–S16, U01, I01–I04) dengan response envelope standar:
```json
{
  "success": true,
  "data": { ... },
  "message": "...",
  "meta": { "timestamp": "...", "request_id": "..." }
}
```

#### Bukti Implementasi Aktual (Critical Verification 2)
1. **Registrasi Rute & JSON Envelope:**
   - Seluruh 84 operasi terdaftar aktif di `backend/services/identity-service/routes/api.php` dan `routes/internal.php` serta telah diekspor ke `routes_list.json`.
   - Distribusi 84 Operasi Kanonis dan Controller Pemetaan:
     - **Auth & Session (A01–A18, 18 Operasi):** `AuthController`, `SocialAuthController`, `PersonalAccessTokenController` — Login, registrasi, refresh, context switch, logout, single & bulk session revocation.
     - **Verification & OTP (V01–V11, 11 Operasi):** `OtpController`, `KycVerificationController`, `CustomerRegistrationController` — Dispatch OTP via Brevo, verify 30s window, employee KYC queue & approval.
     - **Business Application (B01–B13, 13 Operasi):** `BusinessApplicationController`, `AdminBusinessApplicationController` — Draft, upload legal docs, submit, status tracker, revision resubmission, admin queue, approve, request revision, reject.
     - **Profile & Identity (P01–P13, 13 Operasi):** `UserProfileController`, `OrganizationProfileController`, `SensitiveLegalChangeController` — Read profile, edit personal fields, request NIB/NPWP change, avatar upload, admin review legal changes.
     - **Worker Management (W01–W08, 8 Operasi):** `ProviderWorkerController`, `WorkerInvitationController` — List teknisi, invite worker TTL 12h, worker profile, preview & accept invitation, single active provider invariant.
     - **Staff & Governance (S01–S16, 16 Operasi):** `CeoStaffController`, `StaffOnboardingController`, `AdminUserGovernanceController` — CEO create staff, staff list & filter, grant/revoke access, 4-step onboarding wizard, admin platform user governance.
     - **Utility (U01, 1 Operasi):** `HealthController` — Service healthcheck, database connection probe.
     - **Inter-service M2M (I01–I04, 4 Operasi):** `InternalIdentityController` — Protected via `X-Internal-Key` (`EnsureInternalTokenValid`), get user context, token verify, get org data, bulk check.
   - Backward compatibility aliases disediakan untuk integrasi frontend:
     - `/auth/password/forgot` ↔ `/auth/forgot-password`
     - `/auth/password/reset` ↔ `/auth/reset-password`
     - `/auth/roles/switch` ↔ `/auth/switch-role`
     - `/registration-applications*` ↔ `/business-applications*`
2. **Matriks Terpisah:** Rincian method, URI, controller action, middleware, request/response schema dimuat lengkap pada `M01_API_84_OPERATIONS_MATRIX.csv`.

**Status Evaluasi:** **CONFORMANT**

---

### 05. RBAC 9 ROLES & AUTHORIZATION

#### Deskripsi Spesifikasi
Sistem mengisolasi wewenang untuk 9 peran kanonis secara deterministik tanpa keberadaan peran non-standar (`superadmin` ditiadakan):
1. `CUSTOMER` — Pelanggan / Pengguna Jasa
2. `SERVICE_PROVIDER` — Service Provider / Mitra Bengkel Jasa
3. `MERCHANT` — Toko Sparepart Retail
4. `SUPPLIER` — Distributor & Principal Bahan/Alat B2B
5. `WORKER_TECHNICIAN` — Teknisi Lapangan
6. `CUSTOMER_SUPPORT` — Staf Layanan Bantuan & Mediasi Platform
7. `FINANCE_PAYMENT_OPS` — Operasional Keuangan & Escrow
8. `ADMIN_OPERATIONS` — Verifikasi Dokumen & Tata Kelola Operasional
9. `CEO_PRODUCT_OWNER` — Eksekutif Tertinggi & Pemilik Produk Platform

#### Bukti Implementasi Aktual (Critical Verification 6 & 9)
1. **Permission Middleware:**
   - `CheckPermission.php` (`identity.perm:{permission}`) mengecek izin granular pada role aktif.
   - `CeoAuthorization.php` (`identity.ceo`): Memproteksi rute CEO secara eksklusif. Peran `superadmin` telah dihapus total; seluruh fungsi eksekutif tertinggi diampu oleh `CEO_PRODUCT_OWNER`.
2. **Review KYC Karyawan Eksklusif CEO (Critical Verification 6):**
   - Endpoint `GET /api/v1/ceo/identity/verifications` dan `POST /api/v1/ceo/identity/verifications/{id}/approve` diproteksi middleware `identity.perm:identity.kyc.review`. Role Admin Operations atau lainnya ditolak 403. Terbukti pada test `IdentityAuthorizationPolicyTest` dan `ReviewDecisionAuditFeatureTest`.
3. **Staff Onboarding Gatekeeper (Critical Verification 9):**
   - Middleware `EnsureStaffOperationalReady` (`identity.staff.ready`) mencegat request ke seluruh modul operasional jika status pengguna belum `OPERATIONAL_READY`.
4. **Role Immutability & Anti-Self Elevation:**
   - Endpoint `POST /api/v1/auth/switch-role` memvalidasi kepemilikan role pada `user_roles`. Dilarang switch ke role di luar penugasan. Terbukti pada test `IdentityAuthorizationPolicyTest::test_user_cannot_switch_to_unassigned_role`.

**Status Evaluasi:** **CONFORMANT**

---

### 06. INTERNAL FEATURE INTEGRATION (OTP, BREVO, NIK)

#### Deskripsi Spesifikasi
1. Integrasi OTP email menggunakan Brevo Transactional Email API v3 dengan masa kedaluwarsa tepat 30 detik.
2. Perekaman NIK Customer format-only 16 digit numerik tanpa proses upload/review KYC dokumen; NIK bersifat permanen (immutable) sejak penulisan pertama.

#### Bukti Implementasi Aktual (Critical Verification 4 & 5)
1. **Brevo API & OTP 30 Detik (Critical Verification 4):**
   - Service: `backend/services/identity-service/app/Services/BrevoService.php`.
   - Menggunakan template HTML Servio resmi (Dark theme, logo Servio, kode 6 digit proporsional, countdown peringatan 30 detik).
   - Method `OtpService::generate()` menetapkan `expires_at = now()->addSeconds(30)`.
   - Kebijakan Percobaan: Tidak ada penguncian permanen total kesalahan challenge sebelum 30s (counter dicatat di `attempts_count`), namun request endpoint dibatasi oleh throttle per IP/target untuk mitigasi DoS/brute force.
2. **NIK Customer 16 Digit Immutable (Critical Verification 5):**
   - Request Validator: `SetupNikRequest.php` memvalidasi format string 16 angka numerik: `'nik' => ['required', 'string', 'regex:/^[0-9]{16}$/']`.
   - Immutability First-Write: Controller `AuthController::setupNik()` memeriksa keberadaan record di `user_nik_records`. Jika sudah pernah tersimpan, penulisan kedua ditolak dengan HTTP 409 Conflict (`IDENTITY_NIK_PERMANENTLY_LOCKED`). Terbukti pada test `CustomerRegistrationFeatureTest::test_nik_is_permanently_immutable_after_first_write`.

**Status Evaluasi:** **CONFORMANT**

---

### 07. INTER-MICROSERVICE API & EVENT CONTRACT

#### Deskripsi Spesifikasi
Menyediakan 4 endpoint internal (I01–I04) untuk konsumsi M2M oleh service lain, diproteksi authentication key internal, didukung mekanisme outbox event publisher untuk konsistensi data asinkron.

#### Bukti Implementasi Aktual (Critical Verification 10)
1. **Endpoint I01–I04 (`routes/internal.php`):**
   - `GET /api/v1/internal/users/{id}` (I01) — Verifikasi profil & status akun untuk Order/Payment service.
   - `POST /api/v1/internal/auth/verify-token` (I02) — Validasi token M2M / API gateway.
   - `GET /api/v1/internal/organizations/{id}` (I03) — Ambil data tenant untuk Catalog service.
   - `POST /api/v1/internal/users/bulk-check` (I04) — Validasi massal user ID.
2. **M2M Authentication & Security:**
   - Middleware: `EnsureInternalTokenValid.php` (`identity.internal`) memvalidasi header `X-Internal-Key` terhadap secret `INTERNAL_SERVICE_KEY`.
3. **Idempotency & Concurrency:**
   - Pemanfaatan header `X-Idempotency-Key` dan database locking `lockForUpdate()` pada mutasi status aplikasi bisnis dan onboarding.
4. **Transactional Outbox Pattern:**
   - Model `OutboxEvent` dan migrasi `outbox_events` mencatat event domain saat transaksi database commit (`UserRegistered`, `BusinessApplicationApproved`, dll.).

**Status Evaluasi:** **CONFORMANT**

---

### 08. FRONTEND–BACKEND API MAPPING

#### Deskripsi Spesifikasi
Seluruh 38 interaksi antarmuka pengguna (Section 08.2) harus terpetakan ke endpoint Laravel nyata dan dapat dieksekusi secara otomatis melalui browser nyata.

#### Bukti Implementasi Aktual (Critical Verification 12)
1. **Audit Automasi Playwright (`tests/e2e/identity-matrix-acceptance.mjs`):**
   - Menjalankan 38 baris interaksi antarmuka pengguna pada browser Chromium headless secara nyata.
   - Menguji aksi tombol, pengisian form, observasi HTTP request/response Laravel, dan transisi DOM.
   - Hasil Eksekusi:
     - **35 BROWSER_E2E_PASS**
     - **3 PENDING_EXTERNAL_CONFIG** (Tombol login Google OAuth pada Row 02, Row 05, dan Row 08 yang memerlukan live Google Console credentials).
     - **0 FAILED** (Zero errors).
2. **Kepatuhan Data Testing (Critical Verification 13):**
   - Tidak ada pengubahan kredensial demo (9 role tetap password `12345678`).
   - Aksi pengujian menggunakan isolated random fixtures.

**Status Evaluasi:** **CONFORMANT**

---

### 09. ERROR HANDLING, EDGE CASES & TESTING SCENARIOS

#### Deskripsi Spesifikasi
Sistem harus menangani 25 Business Rules dan 24 Edge Cases teknis, dengan suite testing terotomatisasi yang membuktikan ketahanan sistem terhadap kondisi anomali.

#### Bukti Implementasi Aktual (Critical Verification 3)
1. **Unit & Feature Test Suite Execution:**
   - Test Runner: `php artisan test` pada `backend/services/identity-service`.
   - Hasil: **70 tests passed, 321 assertions** tanpa kegagalan (0 failed, 100% PASS).
   - Report XML: `backend/services/identity-service/phpunit-report.xml` terverifikasi.
2. **Traceability:**
   - Seluruh 25 Business Rules dan 24 Edge Cases telah dipetakan secara detail ke test file dan baris assertions pada `M01_BR25_EC24_TEST_TRACEABILITY.md` (termasuk 8 test suite feature baru untuk concurrency, multi-tenant isolation, Google security, Outbox messaging, Brevo resilience, audit sensitive data, dan staff/worker lifecycle).

**Status Evaluasi:** **CONFORMANT**

---

### 10. FINAL TECHNICAL AUDIT & SCOPE BOUNDARY LOCK

#### Deskripsi Spesifikasi
Memastikan kepatuhan total terhadap Section 10 `01-identity-access.md`:
- Checklist 10.1: Kelengkapan 10 komponen.
- Checklist 10.2: Traceability acceptance criteria.
- Checklist 10.3: Larangan scope creep (tidak mencampur logika Modul 02 Jasa/Kategori atau Modul 03 Order).
- Checklist 10.5: Source coverage penuh.

#### Bukti Implementasi Aktual
- Istilah user-facing telah distandarisasi ("Kategori Jasa" menggantikan istilah internal taksonomi).
- Tidak ada tabel atau rute Modul 02/03 di dalam Identity Service.
- Seluruh spesifikasi CR-02 FINAL LOCKED telah terverifikasi secara solid.

**Status Evaluasi:** **CONFORMANT**

---

### KESIMPULAN SECTION B: BACKEND COMPLIANCE
Implementasi Laravel Identity Service telah memenuhi seluruh 10 komponen spesifikasi arsitektur teknis CR-02 FINAL LOCKED secara utuh dan terbukti melalui eksekusi test nyata.
