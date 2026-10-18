# SERVIO — MODUL 01 IDENTITY & ACCESS
# CR-04 V5 IMPLEMENTATION & AUDIT VERIFICATION REPORT

**Dokumen Referensi:** `M01_CR04_IMPLEMENTATION_REPORT.md`  
**Target Modul:** Modul 01 — Identity & Access Service (`backend/services/identity-service`)  
**Modul Pemohon:** Modul 02 — Category Management Service (`backend/services/category-service`)  
**Status Eksekusi:** **SUCCESSFULLY IMPLEMENTED (USER ACC GRANTED)**  
**Tanggal Eksekusi:** 17 Oktober 2026  
**Hasil Pengujian:** **186 Tests, 837 Assertions, 0 Failures, 0 Errors — 100% PASS**  

---

## 1. STATUS MATRIX & RINGKASAN EKSEKUTIF

| Komponen / Sasaran | Status | Bukti Verifikasi | Keterangan |
|---|:---:|---|---|
| **Prapersyaratan: Backup Database Dev** | **PASS** | [`scratch/backup_identity_dev_pre_cr04.sql`](file:///d:/website%20latihan/servio_web_13/scratch/backup_identity_dev_pre_cr04.sql) (1.44 MB) | Full mysqldump database `servio_identity_db` berhasil dibuat sebelum migrasi. |
| **Eksekusi Migrasi CR-04 V5** | **PASS** | `2026_10_17_000001_seed_category_management_permissions_v5` | DDL snapshot table terisolasi di luar transaksi; mutasi data dibungkus dalam `DB::transaction(...)` atomik InnoDB. Idempotent & reversible. |
| **Registrasi 11 Permission Category** | **PASS** | `permissions` table (`owner_service = 'category-service'`) | 11 permission terdaftar rapi tanpa konflik atau duplikasi. |
| **Role-Permission Mapping 9 Canonical Roles** | **PASS** | `CategoryPermissionCR04Test::test_cr04_permissions_registry_and_canonical_role_grants` | Admin (9 grants), CEO (4 grants read-only), Merchant/Provider/Supplier (3 grants), Customer/Worker/CS/Finance (1 grant). Tidak ada role `SUPER_ADMIN`. |
| **Evaluasi Real Otorisasi Identity** | **PASS** | `CategoryPermissionCR04Test` (8 tests, 57 assertions) | Endpoint `POST /internal/v1/authorization/evaluate` mengevaluasi kebijakan permission, role assignment, status akun, dan scope organisasi secara akurat. |
| **Microservice Dependency Isolation** | **PASS** | `CategoryPermissionCR04Test::test_identity_core_operations_run_without_category_service_dependency` | Seluruh fungsi inti Identity (Login, Registrasi, Profile, Introspeksi) berjalan 100% normal tanpa ketergantungan pada Category Service. |
| **Integrasi Live Identity ↔ Category** | **PASS** | `LiveIdentityIntegrationTest` (6 tests, 19 assertions) | Alur E2E live antara Category Service dan Identity Service (port 8001) terbukti sukses: Admin create kategori sukses, CEO ditolak 403, Customer ditolak 403. |
| **Regresi Keseluruhan (Modul 01 & 02)** | **PASS** | [`M01_CR04_TEST_RESULTS.txt`](file:///d:/website%20latihan/servio_web_13/M01_CR04_TEST_RESULTS.txt) | Modul 01: 89/89 passed. Modul 02: 97/97 passed. Total 186/186 passed. |

---

## 2. FILE YANG DIUBAH & DITAMBAHKAN

### Modul 01 Identity Service
1. **[`backend/services/identity-service/database/migrations/2026_10_17_000001_seed_category_management_permissions_v5.php`](file:///d:/website%20latihan/servio_web_13/backend/services/identity-service/database/migrations/2026_10_17_000001_seed_category_management_permissions_v5.php)** *(Created)*:
   - File migrasi CR-04 V5 resmi untuk mendaftarkan 11 permissions, role grants, before-image tracking, dan rollback.
2. **[`backend/services/identity-service/tests/Feature/CategoryPermissionCR04Test.php`](file:///d:/website%20latihan/servio_web_13/backend/services/identity-service/tests/Feature/CategoryPermissionCR04Test.php)** *(Created)*:
   - Test suite komprehensif memvalidasi registry 11 permission, role mapping 9 canonical roles, evaluasi otorisasi M2M, dan isolasi microservice.

### Modul 02 Category Service
3. **[`backend/services/category-service/phpunit.xml`](file:///d:/website%20latihan/servio_web_13/backend/services/category-service/phpunit.xml)** *(Modified)*:
   - Menambahkan konfigurasi environment test `CATEGORY_INTERNAL_SERVICE_KEY = servio_local_internal_service_key_2026` untuk komunikasi live M2M ke Identity.
4. **[`backend/services/category-service/tests/Feature/LiveIdentityIntegrationTest.php`](file:///d:/website%20latihan/servio_web_13/backend/services/category-service/tests/Feature/LiveIdentityIntegrationTest.php)** *(Updated)*:
   - Menambahkan 3 test case live end-to-end: Admin login -> evaluate -> create kategori (positif), CEO login -> create kategori (negatif 403), Customer login -> create kategori (negatif 403).

---

## 3. HASIL PERMISSION REGISTRY & ROLE GRANTS

### 3.1. Registry 11 Permissions
| No | Permission Code | Resource | Action | Scope Type | Owner Service | Status |
|:---:|:---|:---|:---|:---:|:---:|:---:|
| 1 | `category.taxonomy.read_active` | `taxonomy` | `read_active` | `GLOBAL` | `category-service` | ACTIVE |
| 2 | `category.taxonomy.read_inactive` | `taxonomy` | `read_inactive` | `GLOBAL` | `category-service` | ACTIVE |
| 3 | `category.taxonomy.create` | `taxonomy` | `create` | `GLOBAL` | `category-service` | ACTIVE |
| 4 | `category.taxonomy.update` | `taxonomy` | `update` | `GLOBAL` | `category-service` | ACTIVE |
| 5 | `category.taxonomy.change_status` | `taxonomy` | `change_status` | `GLOBAL` | `category-service` | ACTIVE |
| 6 | `category.taxonomy.hard_delete` | `taxonomy` | `hard_delete` | `GLOBAL` | `category-service` | ACTIVE |
| 7 | `category.request.submit` | `category_request` | `submit` | `ORGANIZATION` | `category-service` | ACTIVE |
| 8 | `category.request.read_own` | `category_request` | `read_own` | `ORGANIZATION` | `category-service` | ACTIVE |
| 9 | `category.request.read_all` | `category_request` | `read_all` | `GLOBAL` | `category-service` | ACTIVE |
| 10 | `category.request.review` | `category_request` | `review` | `GLOBAL` | `category-service` | ACTIVE |
| 11 | `category.audit.read` | `category_audit` | `read` | `GLOBAL` | `category-service` | ACTIVE |

### 3.2. Role-Permission Matrix (9 Canonical Roles)
| Role Code | Total Grants | Granted Permissions (Category Domain) | Karakteristik Akses |
|:---|:---:|:---|:---|
| **`ADMIN_OPERATIONS`** | 9 | `category.taxonomy.read_active`, `category.taxonomy.read_inactive`, `category.taxonomy.create`, `category.taxonomy.update`, `category.taxonomy.change_status`, `category.taxonomy.hard_delete`, `category.request.read_all`, `category.request.review`, `category.audit.read` | **Operational Full CRUD & Review** |
| **`CEO_PRODUCT_OWNER`** | 4 | `category.taxonomy.read_active`, `category.taxonomy.read_inactive`, `category.request.read_all`, `category.audit.read` | **Strict Read-Only & Governance Oversight** (Zero Mutation) |
| **`SERVICE_PROVIDER`** | 3 | `category.taxonomy.read_active`, `category.request.submit`, `category.request.read_own` | **Business Taxonomy Suggestion & Own Read** |
| **`MERCHANT`** | 3 | `category.taxonomy.read_active`, `category.request.submit`, `category.request.read_own` | **Business Taxonomy Suggestion & Own Read** |
| **`SUPPLIER`** | 3 | `category.taxonomy.read_active`, `category.request.submit`, `category.request.read_own` | **Business Taxonomy Suggestion & Own Read** |
| **`CUSTOMER`** | 1 | `category.taxonomy.read_active` | **Catalog Browsing / Active Taxonomy Read** |
| **`WORKER_TECHNICIAN`**| 1 | `category.taxonomy.read_active` | **Catalog Browsing / Active Taxonomy Read** |
| **`CUSTOMER_SUPPORT`**  | 1 | `category.taxonomy.read_active` | **Catalog Browsing / Active Taxonomy Read** |
| **`FINANCE_PAYMENT_OPS`**| 1 | `category.taxonomy.read_active` | **Catalog Browsing / Active Taxonomy Read** |

---

## 4. HASIL EVALUASI REAL OTORISASI IDENTITY SERVICE

Diverifikasi melalui endpoint M2M: `POST /internal/v1/authorization/evaluate`
```json
{
  "actor_user_id": "{UUID}",
  "permission": "{CODE}",
  "active_role_assignment_id": "{UUID}",
  "organization_id": "{UUID}"
}
```

Hasil Uji Nyata:
1. **Admin Operations (`admin@servio.id`):**
   - Permission: `category.taxonomy.create`
   - Respon: `allow: true`, `reason_code: POLICY_ALLOW` **[PASS]**
2. **CEO Product Owner (`ceo@servio.id`):**
   - Permission: `category.audit.read` -> `allow: true`, `reason_code: POLICY_ALLOW` **[PASS]**
   - Permission: `category.taxonomy.create` -> `allow: false`, `reason_code: PERMISSION_NOT_GRANTED` **[PASS]**
3. **Merchant (`merchant@servio.id`):**
   - Permission: `category.request.submit` + matching org -> `allow: true`, `reason_code: POLICY_ALLOW` **[PASS]**
   - Permission: `category.request.submit` + mismatching org -> `allow: false`, `reason_code: ORGANIZATION_SCOPE_MISMATCH` **[PASS]**
4. **Customer (`customer@servio.id`):**
   - Permission: `category.taxonomy.read_active` -> `allow: true`, `reason_code: POLICY_ALLOW` **[PASS]**
   - Permission: `category.taxonomy.create` -> `allow: false`, `reason_code: PERMISSION_NOT_GRANTED` **[PASS]**
   - Mutation permissions (`update`, `change_status`, `hard_delete`, `review`) -> seluruhnya `allow: false` **[PASS]**
5. **Akun Suspended / Inactive:**
   - Respon: `allow: false`, `reason_code: ACCOUNT_INACTIVE_OR_SUSPENDED` **[PASS]**
6. **Permission Tidak Terdaftar / Unknown:**
   - Respon: `allow: false`, `reason_code: PERMISSION_NOT_GRANTED` **[PASS]**

---

## 5. BUKTI ISOLASI DEPENDENSI MICROSERVICE

Prinsip isolasi arsitektur microservices terbukti terjaga sempurna:
1. **Zero Outbound Calls:** Identity Service sama sekali tidak melakukan pemanggilan HTTP keluar ke Category Service.
2. **Zero Cross-DB Foreign Keys:** Tidak ada foreign key atau koneksi basis data silang antara `servio_identity_db` dan `servio_category_db`.
3. **Kemandirian Operasional:**
   - `POST /api/v1/auth/login` berfungsi normal tanpa Category Service.
   - `POST /api/v1/auth/register` berfungsi normal tanpa Category Service.
   - `GET /api/v1/auth/me` berfungsi normal tanpa Category Service.
   - `POST /internal/v1/auth/sessions/introspect` berfungsi normal tanpa Category Service.
   - Terbukti via test: `CategoryPermissionCR04Test::test_identity_core_operations_run_without_category_service_dependency` **[PASS]**.

---

## 6. HASIL INTEGRASI LIVE IDENTITY ↔ CATEGORY

Pengujian live end-to-end antarkedua service yang berjalan pada port `8001` (Identity) dan `8002` (Category Client) membuktikan:
1. **Positif E2E:** Admin login di Identity -> Token aktif diperoleh -> Category Service menerima header gateway -> Middleware mengevaluasi permission ke Identity live -> Identity memberikan `allow: true` -> Kategori resmi berhasil dibuat di Category Service (HTTP 201 Created).
2. **Negatif E2E (CEO):** CEO login di Identity -> Mencoba membuat kategori di Category Service -> Ditolak seketika dengan HTTP 403 `CATEGORY_PERMISSION_DENIED`.
3. **Negatif E2E (Customer):** Customer login di Identity -> Mencoba membuat kategori di Category Service -> Ditolak seketika dengan HTTP 403 `CATEGORY_PERMISSION_DENIED`.

---

## 7. PRESERVASI MUTLAK ATURAN LOCKED (CR-01 & CR-02)

Seluruh aturan locked Modul 01 terbukti 100% tidak terganggu:
- NIK Customer tetap 16 digit numerik format-only dan write-once permanen (CR-01 & CR-02).
- Masa aktif OTP Brevo tetap 30 detik cooldown (CR-01).
- Verifikasi berkas legal manual oleh `ADMIN_OPERATIONS` tanpa vendor otomatis (CR-01).
- Evaluasi KYC karyawan staf internal eksklusif di tangan `CEO_PRODUCT_OWNER` (CR-02).
- Tepat 9 canonical roles tanpa role `SUPER_ADMIN`.

---

## 8. KESIMPULAN & STATUS

Implementasi CR-04 V5 telah selesai dan terverifikasi 100% tanpa celah dan tanpa regresi.

**Status Akhir: PASS & FULLY OPERATIONAL.**
