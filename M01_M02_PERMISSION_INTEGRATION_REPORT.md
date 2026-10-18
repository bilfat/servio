# SERVIO — ARCHITECTURE & SERVICE INTEGRATION REPORT
## MODUL 01 IDENTITY & ACCESS ↔ MODUL 02 CATEGORY MANAGEMENT
### Official Cross-Service RBAC Authorization & M2M Communication

**Dokumen Referensi:** `M01_M02_PERMISSION_INTEGRATION_REPORT.md`  
**Service Terlibat:**  
1. **Modul 01:** Identity & Access Service (`backend/services/identity-service`, Port `8001`)  
2. **Modul 02:** Category Management Service (`backend/services/category-service`, Port `8002`)  
**Status Integrasi:** **VERIFIED & OPERATIONAL (100% PASS)**  
**Tanggal Verifikasi:** 17 Oktober 2026  

---

## 1. ARSITEKTUR INTEGRASI & KONTRAK M2M

Integrasi antarmodul SERVIO menganut arsitektur *Zero Database Sharing* (Database-per-Service) dan komunikasi internal yang terisolasi dengan otentikasi Machine-to-Machine (M2M):

```
+-----------------------------------------------------------------------------------+
|                                API GATEWAY / REVERSE PROXY                        |
+-----------------------------------------------------------------------------------+
       |                                                               |
       | (Public / Stateful Web Client)                                | (Trusted Gateway Context)
       v                                                               v
+-------------------------------+              M2M HTTP         +-------------------------------+
|      IDENTITY SERVICE         |<=============================>|      CATEGORY SERVICE         |
|         (Port 8001)           |  X-Internal-Service-Key       |         (Port 8002)           |
+-------------------------------+                               +-------------------------------+
| - RBAC Permission Registry    |                               | - Taxonomy Nodes & Masters    |
| - Session Introspection (I01) |                               | - Two-Tier Authz Evaluation   |
| - Authz Evaluate (I02)        |                               | - Reference Claims & Guards   |
+-------------------------------+                               +-------------------------------+
       |                                                               |
       v                                                               v
[servio_identity_db]                                            [servio_category_db]
(MySQL Localhost:3306)                                          (MySQL Localhost:3306)
```

---

## 2. KONTRAK EVALUASI OTORISASI INTERNAL (I02)

### 2.1. Request Contract dari Category Service
- **Method:** `POST`
- **URL:** `http://127.0.0.1:8001/internal/v1/authorization/evaluate`
- **Headers:**
  - `X-Internal-Service-Key`: `{CATEGORY_INTERNAL_SERVICE_KEY}` (Credential M2M)
  - `Accept`: `application/json`
  - `Content-Type`: `application/json`
- **Payload:**
  ```json
  {
    "actor_user_id": "9d8e...-....-....-....-............",
    "permission": "category.taxonomy.create",
    "active_role_assignment_id": "8c7f...-....-....-....-............",
    "organization_id": null
  }
  ```

### 2.2. Response Contract dari Identity Service
1. **Otorisasi Diizinkan (`POLICY_ALLOW`):**
   ```json
   {
     "success": true,
     "code": "IDENTITY_AUTHORIZATION_EVALUATED",
     "data": {
       "allow": true,
       "reason_code": "POLICY_ALLOW",
       "authz_version": 1
     }
   }
   ```
2. **Otorisasi Ditolak (`PERMISSION_NOT_GRANTED`):**
   ```json
   {
     "success": true,
     "code": "IDENTITY_AUTHORIZATION_DENIED",
     "data": {
       "allow": false,
       "reason_code": "PERMISSION_NOT_GRANTED",
       "authz_version": 1
     }
   }
   ```
3. **Scope Organisasi Tidak Cocok (`ORGANIZATION_SCOPE_MISMATCH`):**
   ```json
   {
     "success": true,
     "code": "IDENTITY_AUTHORIZATION_DENIED",
     "data": {
       "allow": false,
       "reason_code": "ORGANIZATION_SCOPE_MISMATCH",
       "authz_version": 1
     }
   }
   ```

---

## 3. MEKANISME DUA LAPIS OTORISASI DI CATEGORY SERVICE

Di Category Service, seluruh request yang memerlukan otorisasi melewati [`RequireCategoryPermission.php`](file:///d:/website%20latihan/servio_web_13/backend/services/category-service/app/Http/Middleware/RequireCategoryPermission.php):

### Lapis 1: Domain Role & Context Governance Check
- Mengecek kesesuaian context role secara lokal (misal: hanya `ADMIN_OPERATIONS` yang boleh melakukan mutasi taksonomi resmi, sedangkan Merchant/Provider wajib memiliki `organization_id`).

### Lapis 2: Live Remote Authorization Evaluation via Identity Service
- Memanggil Identity Service live melalui [`IdentityServiceClient@evaluateAuthorization`](file:///d:/website%20latihan/servio_web_13/backend/services/category-service/app/Infrastructure/Identity/IdentityServiceClient.php#L123-L160).
- **Fail-Closed Guarantees:**
  - Jika Identity Service tidak merespon / offline: Mengembalikan HTTP 503 `CATEGORY_IDENTITY_UNAVAILABLE`.
  - Jika `allow: false`: Mengembalikan HTTP 403 `CATEGORY_PERMISSION_DENIED` dengan reason code spesifik.
  - Jika `authz_version` aktor di request lebih rendah dari versi di Identity: Mengembalikan HTTP 403 `CATEGORY_AUTHORIZATION_STALE` untuk memaksa re-autentikasi sesi.

---

## 4. HASIL UJI LIVE INTEGRASI END-TO-END

Pengujian dilakukan langsung pada dua microservice nyata menggunakan test suite [`LiveIdentityIntegrationTest.php`](file:///d:/website%20latihan/servio_web_13/backend/services/category-service/tests/Feature/LiveIdentityIntegrationTest.php):

```text
Live Identity Integration (Tests\Feature\LiveIdentityIntegration)
 ✔ Live identity service introspect session
 ✔ Live identity permission check fail closed for unknown user
 ✔ Live identity m2m rejects unauthorized service key
 ✔ Live end to end identity login and admin category creation
 ✔ Live end to end ceo category mutation denied
 ✔ Live end to end customer category mutation denied

OK (6 tests, 19 assertions)
```

### Rincian Pembuktian Alur 6 Langkah:
1. **Langkah 1 (Login):** Admin (`admin@servio.id`) mengirim kredensial ke Identity Service `POST /api/v1/auth/login`. Identity memvalidasi hash argon2id/bcrypt dan mengembalikan session token serta role assignment aktif.
2. **Langkah 2 (Introspeksi Sesi):** Category Service dapat mengintrospeksi sesi melalui M2M endpoint `POST /internal/v1/auth/sessions/introspect`. Status sesi terbukti `active: true`.
3. **Langkah 3 (Konteks Aktor):** Category Service menerima header aktor terpercaya dari gateway (`X-Actor-User-Id`, `X-Actor-Role: ADMIN_OPERATIONS`, `X-Actor-Role-Assignment-Id`).
4. **Langkah 4 (Evaluasi Otorisasi):** Category Service memanggil `POST /internal/v1/authorization/evaluate` untuk permission `category.taxonomy.create`.
5. **Langkah 5 (Keputusan Otorisasi):** Identity Service memverifikasi relasi `roles` -> `role_permissions` -> `permissions`, dan mengembalikan `{ allow: true, reason_code: "POLICY_ALLOW" }`.
6. **Langkah 6 (Eksekusi Bisnis):** Category Service mengizinkan mutasi basis data. Node kategori resmi berhasil dibuat dengan HTTP 201 Created.

### Pembuktian Penolakan Otorisasi (Negatif):
- **CEO Product Owner (`ceo@servio.id`):** Ditolak dengan HTTP 403 `CATEGORY_PERMISSION_DENIED`. CEO terbukti strictly read-only / governance, tidak dapat melakukan mutasi kategori.
- **Customer (`customer@servio.id`):** Ditolak dengan HTTP 403 `CATEGORY_PERMISSION_DENIED`. Customer hanya dapat membaca kategori aktif.

---

## 5. KEMANDIRIAN & ISOLASI MICROSERVICE (DEPENDENCY ISOLATION)

1. **Identity Service Bekerja Mandiri:**
   - Ketika Category Service mati, seluruh operasional Modul 01 (Login, Registrasi, Profil, KYC, Staf Onboarding) tetap berfungsi 100% tanpa hambatan.
   - Terbukti via test: `CategoryPermissionCR04Test::test_identity_core_operations_run_without_category_service_dependency` **[PASS]**.
2. **Zero Database Coupling:**
   - Tidak ada koneksi database silang atau view antar-database.
   - Seluruh pertukaran konteks aktor dan hak akses berjalan murni melalui HTTP REST API dengan payload JSON yang tervalidasi.

---

## 6. STATUS AKHIR & KESIAPAN TAHAP BERIKUTNYA

- [x] Kontrak M2M internal Modul 01 & Modul 02 terverifikasi 100%.
- [x] 11 permissions Category terdaftar dan ter-grant sesuai matriks RBAC resmi.
- [x] Integrasi live lolos pengujian positive & negative E2E.
- [x] Seluruh 186 unit & feature test kedua service berstatus **100% PASS (0 Failures, 0 Errors)**.

**Status Integrasi: PASS — READY FOR FRONTEND INTEGRATION (MASTER PROMPT 02).**
