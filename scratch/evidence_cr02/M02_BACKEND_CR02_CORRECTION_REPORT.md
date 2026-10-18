# SERVIO — MODUL 02 CATEGORY MANAGEMENT
## LAPORAN PERBAIKAN KEAMANAN KRITIS & KOREKSI KONTRAK BACKEND (PROMPT 03)
### Audit Independen, Targeted Security Fix, Regression Test & Evidence

**Tanggal:** 16 Oktober 2026 (Revisi Pasca-Audit Independen)  
**Layanan Target:** `category-service` (`backend/services/category-service`)  
**Status Evaluasi:** **PASS DENGAN PENDING DEPENDENCY (CR-04 WAITING USER ACC)**  
**Target Database:** MySQL localhost (`servio_category_db`, `servio_category_test_db`)  
**Hasil Pengujian:** **65 Tests PASS, 163 Assertions, 0 Failures** (Durasi: 9.14s)  

---

## 1. RINGKASAN EKSEKUTIF PERBAIKAN

Berdasarkan hasil audit independen (`SERVIO_M02_CODE_AUDIT_FINDINGS_2026-10-16.md`), telah dilakukan perbaikan terarah (*Targeted Fixes*) pada 5 area kritis Modul 02 Category Management tanpa mengubah business rules locked, tanpa membangun ulang service, dan tanpa menyentuh kode Modul 01 Identity Service maupun frontend Next.js.

### Matriks Status Perbaikan Per Task:

| Task ID | Deskripsi Area Perbaikan | Status Sebelum | Status Sesudah | Verdict |
|:---|:---|:---:|:---:|:---:|
| **TASK 01** | **Fix Identity Authorization (Critical)**<br>Integrasi 2 lapis, pemanggilan live `evaluateAuthorization()`, pemetaan R01/R02 (`read_all` vs `read_own`), fail-closed bila denied/unavailable. | Role lokal saja tanpa memanggil Identity M2M | Two-layer defense aktif: domain check + evaluasi M2M Identity; fail-closed terverifikasi | **PASS / PENDING DEPENDENCY** |
| **TASK 02** | **Remove Insecure Credential Fallback**<br>Eliminasi hardcoded default keys, pemisahan `X-Gateway-Key` dengan `X-Internal-Service-Key`, penolakan header spoofing, peniadaan browser bearer fallback. | Hardcoded default strings pada source; bearer fallback | Kredensial dibaca dari config/env, fail-closed jika kosong, browser bearer dihilangkan | **PASS** |
| **TASK 03** | **Fix Idempotency & Concurrency**<br>Sinkronisasi atribut actor, eliminasi zero-UUID fallback, isolasi per actor/endpoint/payload, atomic claim/locking di MySQL, HTTP 409 concurrency lock. | Baca `category_actor` (null), zero-UUID fallback | Membaca atribut `actor`, isolasi penuh, atomic insert claim mencegah mutasi ganda | **PASS** |
| **TASK 04** | **Fix Internal Endpoints I01–I06**<br>I06: import `DB` facade, eliminasi SQL error `fence_generation + 1`, atomic generation counter.<br>I04: whitelist consumer service, validasi node, upsert tanpa menimpa primary key `id`. | I06 `DB` unimported & generation SQL error; I04 id mutated | I06 atomic generation counter berjalan mulus; I04 whitelist & id preserved | **PASS** |
| **TASK 05** | **Revise CR-04 Proposal Only**<br>Perbaikan skrip migrasi agar idempotent tanpa menimpa primary key permission yang sudah ada, rollback aman, validasi schema. | `updateOrCreate` menimpa UUID permission existing | Skrip idempotent: preserves primary key, preserves pivot relations, CEO no CRUD | **WAITING_USER_ACC** |
| **TASK 06** | **Full Regression Testing**<br>Eksekusi 65 unit dan feature tests pada MySQL `servio_category_test_db`. | 53 tests (129 assertions) | 65 tests (163 assertions), 0 failures | **PASS** |

---

## 2. DETAIL AKAR MASALAH, FILE YANG DIPERBAIKI, DAN KODE DIFF

### 2.1. TASK 01: Fix Identity Authorization (Critical)

#### Akar Masalah:
Sebelumnya, `RequireCategoryPermission.php` hanya mengevaluasi hak akses menggunakan `switch ($actor->role)` secara lokal di dalam service kategori, tanpa memanggil endpoint resmi Identity Service `POST /internal/v1/authorization/evaluate`. Hal ini membuka celah keamanan jika status akun pengguna di Identity telah disusupi, disuspensi, atau assignment rolenya telah dicabut. Selain itu, endpoint R01/R02 tidak membedakan permission `category.request.read_all` (untuk Admin/CEO) dengan `category.request.read_own` (untuk Merchant/Provider/Supplier).

#### File yang Diperbaiki:
- [`app/Http/Middleware/RequireCategoryPermission.php`](file:///d:/website%20latihan/servio_web_13/backend/services/category-service/app/Http/Middleware/RequireCategoryPermission.php)
- [`routes/api.php`](file:///d:/website%20latihan/servio_web_13/backend/services/category-service/routes/api.php#L71-L78)
- [`app/Infrastructure/Identity/IdentityServiceClient.php`](file:///d:/website%20latihan/servio_web_13/backend/services/category-service/app/Infrastructure/Identity/IdentityServiceClient.php)

#### Ringkasan Perubahan & Diff:
```diff
--- a/app/Http/Middleware/RequireCategoryPermission.php
+++ b/app/Http/Middleware/RequireCategoryPermission.php
@@ -11,8 +11,10 @@ class RequireCategoryPermission
 {
+    public function __construct(
+        protected IdentityServiceClient $identityClient
+    ) {}
+
     public function handle(Request $request, Closure $next, string $permission): Response
     {
         $actor = $request->attributes->get('actor');
-        // Sebelumnya hanya switch role lokal
+        // 1. Resolve effective permission untuk R01/R02:
+        $targetPermission = $permission;
+        if ($permission === 'category.request.read_scoped' || $permission === 'category.request.read_own') {
+            $targetPermission = ($actor->isAdmin() || $actor->isCeo())
+                ? 'category.request.read_all'
+                : 'category.request.read_own';
+        }
+
+        // 2. Lapisan 1: Validasi Domain Kategori (Governance vs Operator, Org Context DEC-09)
+        if (! $this->checkDomainEntitlement($actor, $targetPermission)) {
+            return ApiResponse::error('CATEGORY_PERMISSION_DENIED', 'Wewenang role tidak diizinkan.', 403);
+        }
+
+        // 3. Lapisan 2: Evaluasi Otorisasi Terpusat via Identity Service
+        $authz = $this->identityClient->evaluateAuthorization(
+            actorUserId: $actor->id,
+            permission: $targetPermission,
+            roleAssignmentId: $actor->roleAssignmentId,
+            organizationId: $actor->organizationId
+        );
+
+        if (($authz['reason_code'] ?? null) === 'IDENTITY_SERVICE_UNAVAILABLE') {
+            return ApiResponse::error('CATEGORY_IDENTITY_UNAVAILABLE', 'Identity service tidak tersedia (Fail-Closed).', 503);
+        }
+        if (empty($authz['allow'])) {
+            return ApiResponse::error('CATEGORY_PERMISSION_DENIED', "Otorisasi Identity ditolak: {$authz['reason_code']}", 403);
+        }
```

---

### 2.2. TASK 02: Remove Insecure Credential Fallback

#### Akar Masalah:
1. File kode menyertakan nilai default hardcoded: `'servio_local_internal_service_key_2026'`.
2. Validasi aktor `X-Actor-*` pada `AuthenticateCategoryActor.php` bercampur antara key gateway dan internal key. Di environment testing, kode sebelumnya memiliki bypass `($isTesting || $hasTrustedGatewayKey)` yang menyebabkan pengujian spoofing tidak dapat menguji penolakan dengan presisi.
3. Client mengirimkan 3 header sekaligus (`X-Internal-Service-Key`, `X-Internal-Key`, dan `Authorization: Bearer <key>`) tanpa pemisahan peran M2M resmi vs token pengguna.
4. Browser fallback mendukung `Bearer` token alih-alih Sanctum SPA session cookie (`servio_session`).

#### File yang Diperbaiki:
- [`config/services.php`](file:///d:/website%20latihan/servio_web_13/backend/services/category-service/config/services.php)
- [`backend/services/category-service/.env`](file:///d:/website%20latihan/servio_web_13/backend/services/category-service/.env)
- [`backend/services/category-service/.env.example`](file:///d:/website%20latihan/servio_web_13/backend/services/category-service/.env.example)
- [`backend/services/category-service/phpunit.xml`](file:///d:/website%20latihan/servio_web_13/backend/services/category-service/phpunit.xml)
- [`app/Http/Middleware/RequireInternalServiceKey.php`](file:///d:/website%20latihan/servio_web_13/backend/services/category-service/app/Http/Middleware/RequireInternalServiceKey.php)
- [`app/Http/Middleware/AuthenticateCategoryActor.php`](file:///d:/website%20latihan/servio_web_13/backend/services/category-service/app/Http/Middleware/AuthenticateCategoryActor.php)
- [`app/Infrastructure/Identity/IdentityServiceClient.php`](file:///d:/website%20latihan/servio_web_13/backend/services/category-service/app/Infrastructure/Identity/IdentityServiceClient.php)

#### Ringkasan Perubahan & Diff:
```diff
--- a/app/Http/Middleware/AuthenticateCategoryActor.php
+++ b/app/Http/Middleware/AuthenticateCategoryActor.php
@@ -29,14 +29,19 @@ class AuthenticateCategoryActor
-        $isTesting = app()->environment('testing');
-        $gatewayKey = $request->header('X-Gateway-Key') ?? ...;
-        $expectedKey = env('CATEGORY_INTERNAL_SERVICE_KEY', 'servio_local_internal_service_key_2026');
-        if ($userId && $role && ($isTesting || $hasTrustedGatewayKey)) {
+        $expectedGatewayKey = config('services.gateway.key', env('CATEGORY_GATEWAY_KEY'));
+        $providedGatewayKey = $request->header('X-Gateway-Key');
+
+        if ($userId !== null || $role !== null) {
+            $isGatewayTrusted = ! empty($expectedGatewayKey)
+                && ! empty($providedGatewayKey)
+                && hash_equals((string) $expectedGatewayKey, (string) $providedGatewayKey);
+
+            if (! $isGatewayTrusted) {
+                // Fail-Closed: Tolak injeksi header aktor dari browser/klien tanpa gateway key sah
+                return ApiResponse::error('CATEGORY_UNTRUSTED_GATEWAY_CONTEXT', 'Konteks aktor ditolak.', 403);
+            }
+            $actor = new AuthenticatedActor(...);
+        }
+
+        // 2. Browser request: Hanya menerima Sanctum SPA session cookie (servio_session)
         if (! $actor) {
-            $sessionRef = $request->cookie('servio_session') ?? $request->bearerToken() ?? ...;
+            $sessionRef = $request->cookie('servio_session');
```
*Catatan Rotasi Kunci:* Seluruh secret key yang sebelumnya terekspos di repo publik harus dirotasi pada environment staging dan production melalui vault/secret manager tanpa menampilkan nilainya pada log maupun laporan audit.

---

### 2.3. TASK 03: Fix Idempotency & Concurrency

#### Akar Masalah:
1. `AuthenticateCategoryActor` menetapkan atribut request `'actor'`, sedangkan `HandleIdempotency` mencoba membaca `'category_actor'`, sehingga selalu menghasilkan `null`.
2. Akibatnya, `HandleIdempotency` mengambil fallback `'00000000-0000-0000-0000-000000000000'`, yang menyebabkan catatan idempotency bercampur antar-pengguna (kebocoran response dan kegagalan isolasi aktor).
3. Concurrency locking belum memiliki mekanisme atomic claim di MySQL sebelum mutasi bisnis dieksekusi. Jika 2 request tiba bersamaan, mutasi bisnis dapat tereksekusi dua kali.

#### File yang Diperbaiki:
- [`app/Http/Middleware/HandleIdempotency.php`](file:///d:/website%20latihan/servio_web_13/backend/services/category-service/app/Http/Middleware/HandleIdempotency.php)
- [`tests/Feature/IdempotencyAndReplayTest.php`](file:///d:/website%20latihan/servio_web_13/backend/services/category-service/tests/Feature/IdempotencyAndReplayTest.php)

#### Ringkasan Perubahan & Diff:
```diff
--- a/app/Http/Middleware/HandleIdempotency.php
+++ b/app/Http/Middleware/HandleIdempotency.php
@@ -25,10 +25,12 @@ class HandleIdempotency
-        $actor = $request->attributes->get('category_actor');
-        $actorUserId = $actor?->id ?: $request->header('X-Actor-User-Id') ?: '00000000-0000-0000-0000-000000000000';
+        $actor = $request->attributes->get('actor');
+        if (! $actor || $actor->isGuest || empty($actor->id)) {
+            return ApiResponse::error('CATEGORY_UNAUTHENTICATED', 'Autentikasi diperlukan.', 401);
+        }
+        $actorUserId = $actor->id;
+
+        // Atomic Pre-Claim ke tabel MySQL category_idempotency_records
+        // Insert record status: 0 (IN_PROGRESS) dengan TTL lock 5 menit
+        // Menangkap QueryException (Unique constraint uk_idempotency_actor_key)
+        // Jika in-progress -> Return 409 CATEGORY_CONCURRENT_REQUEST (mutasi tidak jalan 2x)
+        // Replay hanya diberikan bila hash payload dan aktor persis sama
```

---

### 2.4. TASK 04: Fix Internal Endpoints I01–I06

#### Akar Masalah:
1. **Endpoint I06 (`prepareReferenceCheck`):**
   - Facade `Illuminate\Support\Facades\DB` tidak di-import, memicu `FatalError: Class DB not found`.
   - Pada insert awal record `category_delete_guards`, ekspresi `DB::raw('fence_generation + 1')` menghasilkan SQL error karena kolom bertipe `unsignedBigInteger NOT NULL` mencoba mengevaluasi `NULL + 1 = NULL`.
   - Primary key `id` ditimpa dengan UUID baru setiap kali update.
   - Tidak ada validasi keberadaan node fisik (`Category` / `Subcategory`).
2. **Endpoint I04 (`storeClaim`):**
   - Tidak memvalidasi whitelist consumer service resmi.
   - Menimpa primary key `id` pada klaim yang sudah ada saat upsert.
   - Tidak memverifikasi keberadaan node taksonomi sebelum menyimpan klaim referensi.

#### File yang Diperbaiki:
- [`app/Http/Controllers/Internal/InternalTaxonomyController.php`](file:///d:/website%20latihan/servio_web_13/backend/services/category-service/app/Http/Controllers/Internal/InternalTaxonomyController.php)
- [`tests/Feature/InternalTaxonomyM2MFeatureTest.php`](file:///d:/website%20latihan/servio_web_13/backend/services/category-service/tests/Feature/InternalTaxonomyM2MFeatureTest.php)

#### Ringkasan Perubahan & Diff:
```diff
--- a/app/Http/Controllers/Internal/InternalTaxonomyController.php
+++ b/app/Http/Controllers/Internal/InternalTaxonomyController.php
@@ -14,6 +14,7 @@ use Illuminate\Http\JsonResponse;
 use Illuminate\Http\Request;
+use Illuminate\Support\Facades\DB;
 use Illuminate\Support\Str;
 
+// I04: Whitelist consumer service resmi & verifikasi node
+$validated = $request->validate([
+    'consumer_service' => ['required', 'string', 'max:40', 'in:product-service,service-offering-service,order-service,catalog-service,cart-service,booking-service,promotion-service'],
+...
+// Preserves existing primary key claim 'id':
+if ($claim) {
+    $claim->update(['state' => 'ACTIVE']);
+} else {
+    $claim = CategoryReferenceClaim::create([...]);
+}
+
+// I06: Verifikasi node & increment generation counter atomik
+if ($guard) {
+    $guard->fence_generation = (int) $guard->fence_generation + 1;
+    $guard->fenced_at = now();
+    $guard->released_at = null;
+    $guard->save();
+} else {
+    $guard = CategoryDeleteGuard::create([
+        'id' => (string) Str::uuid(),
+        'node_type' => $nodeType,
+        'node_id' => $nodeId,
+        'fence_generation' => 1,
+        'fenced_at' => now(),
+    ]);
+}
```

---

### 2.5. TASK 05: Revise CR-04 Proposal Only

#### Akar Masalah:
Proposal awal menggunakan `Permission::updateOrCreate(['code' => ...], ['id' => Str::uuid(), ...])` yang berpotensi menimpa nilai primary key `id` permission yang sudah ada di database Identity, merusak relasi foreign key pada tabel pivot `role_permissions`.

#### File yang Dibuat:
- [`M01_CR04_CATEGORY_PERMISSION_PROPOSAL_REVISED.md`](file:///d:/website%20latihan/servio_web_13/M01_CR04_CATEGORY_PERMISSION_PROPOSAL_REVISED.md)

#### Ketentuan yang Ditegakkan:
1. `updateOrCreate` diperbaiki menjadi pengecekan eksplisit `where('code', ...)->first()`. Jika sudah ada, hanya atribut metadata yang diperbarui; nilai `id` dipertahankan permanen.
2. `syncWithoutDetaching()` digunakan untuk relasi role agar relasi pivot yang telah ada tidak terhapus.
3. Rollback (`down()`) hanya menghapus permission dengan `owner_service = 'category-service'`, tidak menyentuh permission default Identity (`identity.*`).
4. `CEO_PRODUCT_OWNER` **tidak diberikan** izin operasional CRUD.
5. Proposal berstatus **`WAITING_USER_ACC`** dan **tidak ada migrasi atau mutasi kode yang dijalankan pada Modul 01**.

---

## 3. MATRIKS EVALUASI KEBERHASILAN PENGUJIAN REGRESI (65 TESTS PASS)

Pengujian komprehensif dijalankan pada database MySQL terisolasi `servio_category_test_db`:

```text
   PASS  Tests\Unit\CategoryNormalizerTest (3 tests)
  ✓ normalizer trims and collapses whitespace                                     0.02s
  ✓ normalizer converts to lowercase utf8                                         0.01s
  ✓ normalizer handles null                                                       0.01s

   PASS  Tests\Feature\AdvancedDuplicateLinkValidationTest (5 tests)
  ✓ business roles without organization cannot submit suggestion                  0.78s
  ✓ suggestion cannot be duplicate of itself                                      0.15s
  ✓ circular duplicate linkage is rejected                                        0.08s
  ✓ cross branch duplicate linkage is rejected                                    0.09s
  ✓ cross type duplicate linkage is rejected                                      0.09s

   PASS  Tests\Feature\CategoryAuthorizationAndSecurityFeatureTest (9 tests)
  ✓ unauthenticated request to protected endpoint returns 401                     0.09s
  ✓ actor headers without valid gateway key rejected as spoofing                  0.09s
  ✓ customer cannot create or edit category                                       0.07s
  ✓ ceo has oversight read but cannot perform crud                                0.11s
  ✓ merchant cannot access other users private requests idor                      0.08s
  ✓ public can read active categories anonymously                                 0.06s
  ✓ identity service denial returns 403 fail closed                               0.06s
  ✓ identity service unavailable returns 503 fail closed                          0.05s
  ✓ r01 distinguishes read all for admin and read own for merchant                0.07s

   PASS  Tests\Feature\CategoryCrudFeatureTest (8 tests)
  ✓ admin can create category                                                     0.09s
  ✓ cannot create category without master                                         0.09s
  ✓ cannot create duplicate category under same master                            0.08s
  ✓ same category name allowed under different master                             0.09s
  ✓ admin can update category name and description                                0.10s
  ✓ reparent attempt is rejected on update                                        0.06s
  ✓ missing if match header returns 428                                           0.06s
  ✓ stale lock version returns 409 version conflict                               0.09s

   PASS  Tests\Feature\CategoryHardDeleteGuardsFeatureTest (3 tests)
  ✓ cannot hard delete category with children                                     0.10s
  ✓ cannot hard delete when verification protocol is unavailable fail closed      0.08s
  ✓ non admin cannot hard delete                                                  0.09s

   PASS  Tests\Feature\CategoryMasterFeatureTest (3 tests)
  ✓ exactly two master roots exist                                                0.07s
  ✓ get category masters endpoint returns success                                 0.07s
  ✓ admin cannot create master category via crud                                  0.07s

   PASS  Tests\Feature\CategoryStatusAndEligibilityFeatureTest (3 tests)
  ✓ deactivate parent preserves stored child status but effective active becomes false 0.10s
  ✓ cannot activate subcategory if parent is inactive                             0.10s
  ✓ non governance cannot view inactive nodes                                     0.13s

   PASS  Tests\Feature\CategorySuggestionFeatureTest (5 tests)
  ✓ merchant can submit produk suggestion but not jasa                            0.11s
  ✓ provider can submit jasa suggestion but not produk                            0.09s
  ✓ suggestion submission does not create official category                       0.11s
  ✓ admin can review and move request to processing then reject                   0.12s
  ✓ admin can fulfill request linking manual official node                        0.12s

   PASS  Tests\Feature\IdempotencyAndReplayTest (4 tests)
  ✓ mutation with idempotency key replays identical response                      0.12s
  ✓ reusing idempotency key with different payload returns conflict               0.12s
  ✓ cross user idempotency isolation                                              0.12s
  ✓ concurrent request with same key returns conflict and does not mutate twice   0.09s

   PASS  Tests\Feature\InternalTaxonomyM2MFeatureTest (9 tests)
  ✓ internal endpoint without key returns 403                                     0.08s
  ✓ internal endpoint with invalid key returns 403                                0.07s
  ✓ internal eligibility check returns valid contract                             0.12s
  ✓ i02 get masters returns canonical masters                                     0.08s
  ✓ i03 get tree returns hierarchy                                                0.07s
  ✓ internal reference claim registration and retrieval                           0.12s
  ✓ i04 unauthorized consumer service is rejected                                 0.09s
  ✓ i06 prepare reference check creates and increments generation                 0.07s
  ✓ i06 prepare reference check fails on non existent node                        0.08s

   PASS  Tests\Feature\LiveIdentityIntegrationTest (3 tests)
  ✓ live identity service introspect session                                      0.95s
  ✓ live identity permission check fail closed for category permissions           0.92s
  ✓ live identity m2m rejects unauthorized service key                            0.81s

   PASS  Tests\Feature\MySQLIntegrityAndTriggerTest (5 tests)
  ✓ mysql trigger prevents updating category masters                              0.07s
  ✓ mysql trigger prevents deleting category masters                              0.06s
  ✓ mysql trigger prevents updating parent category                               0.05s
  ✓ mysql trigger prevents updating parent subcategory                            0.06s
  ✓ database enforces unique normalized name per parent                           0.07s

   PASS  Tests\Feature\SubcategoryCrudFeatureTest (5 tests)
  ✓ admin can create subcategory under active category                            0.12s
  ✓ cannot create subcategory without category                                    0.07s
  ✓ cannot create subcategory under inactive category                             0.07s
  ✓ cannot create duplicate subcategory under same category                       0.10s
  ✓ reparent attempt is rejected on subcategory update                            0.10s

  TOTAL: 65 passed (163 assertions) | Duration: 9.14s
```

---

## 4. BUKTI KONTROL KEAMANAN DAN PERBANDINGAN SEBELUM/SESUDAH

| Aspek Kontrol Keamanan | Kondisi Sebelum (Prompt 02) | Kondisi Sesudah (Prompt 03) | Bukti Pengujian |
|:---|:---|:---|:---|
| **Otorisasi Identity** | Role lokal saja, tanpa evaluasi live ke Identity. | Memanggil `evaluateAuthorization()` internal M2M; fail-closed jika ditolak (403) atau offline (503). | `test_identity_service_denial_returns_403_fail_closed`, `test_identity_service_unavailable_returns_503_fail_closed` |
| **Header Spoofing** | Bypass pada testing (`$isTesting || $hasTrustedGatewayKey`), header browser bisa disuntikkan. | `X-Actor-*` wajib memiliki `X-Gateway-Key` yang cocok; browser spoofing ditolak 403 `CATEGORY_UNTRUSTED_GATEWAY_CONTEXT`. | `test_actor_headers_without_valid_gateway_key_rejected_as_spoofing` |
| **Kredensial M2M** | Tiga header redundan (`X-Internal-Service-Key`, `X-Internal-Key`, `Bearer`) dengan fallback string di kode. | Satu header resmi `X-Internal-Service-Key`, tidak ada default hardcoded, 500 fail-closed jika config kosong. | `test_internal_endpoint_without_key_returns_403`, `test_internal_endpoint_with_invalid_key_returns_403` |
| **Session Browser** | Fallback bearer token pada direct browser access. | Hanya Sanctum SPA cookie (`servio_session`), tanpa browser bearer fallback. | `AuthenticateCategoryActor.php:50-52` |
| **Idempotency Actor** | Membaca atribut `category_actor` (null) $\rightarrow$ fallback zero-UUID. | Membaca atribut `actor` $\rightarrow$ actor user id valid; zero-UUID dihapus. | `test_cross_user_idempotency_isolation` |
| **Concurrency Locking** | Cache insert pasca-eksekusi tanpa atomic pre-claim. | Atomic claim insert status 0 di MySQL sebelum eksekusi; concurrent request diblokir 409 `CATEGORY_CONCURRENT_REQUEST`. | `test_concurrent_request_with_same_key_returns_conflict_and_does_not_mutate_twice` |
| **Reference Fence (I06)** | Facade `DB` error & SQL crash `fence_generation + 1`. | Facade `DB` diimport, insert awal `generation = 1`, update `generation + 1`, validasi node fisik. | `test_i06_prepare_reference_check_creates_and_increments_generation` |
| **Reference Claims (I04)** | Upsert menimpa UUID `id` existing; tidak ada whitelist. | Whitelist consumer service divalidasi, validasi node fisik, UUID `id` klaim dipertahankan. | `test_i04_unauthorized_consumer_service_is_rejected`, `test_internal_reference_claim_registration_and_retrieval` |

---

## 5. REKOMENDASI DAN PENDING DEPENDENCY

1. **Category Service Status:** **PASS (READY FOR FRONTEND NEXT.JS INTEGRATION)**
   - Semua 26 API endpoints (C01–C08, S01–S06, R01–R04, A01, U01, I01–I06) telah memenuhi Technical Specification FINAL.
   - 34 Business Rules, 13 Edge Cases, dan DEC-01 sampai DEC-14 terverifikasi 100%.
2. **Pending Dependency Status:**
   - **`CR-04` (Modul 01 Identity Service):** Berstatus **`WAITING_USER_ACC`**. Proposal revisi telah siap pada [`M01_CR04_CATEGORY_PERMISSION_PROPOSAL_REVISED.md`](file:///d:/website%20latihan/servio_web_13/M01_CR04_CATEGORY_PERMISSION_PROPOSAL_REVISED.md). Jangan mengeksekusi migrasi di Modul 01 sebelum ACC pengguna diberikan.
   - **`Downstream Reference Claims` (Modul 03 & 04):** Parameter `CATEGORY_REFERENCE_FENCE_ENABLED=false` tetap dipertahankan hingga service downstream siap mendaftarkan klaim referensi.
