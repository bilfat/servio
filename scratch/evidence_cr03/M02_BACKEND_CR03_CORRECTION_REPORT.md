# SERVIO — MODUL 02 CATEGORY MANAGEMENT
## LAPORAN KOREKSI BACKEND FINAL & AUDIT KEAMANAN KONTRAK (PROMPT 04)
### Targeted Correction, Idempotency Lease Fencing, M2M Consumer Authorization & Full Regression Test

**Tanggal:** 17 Oktober 2026  
**Layanan Target:** `category-service` (`backend/services/category-service`)  
**Status Evaluasi:** **PASS DENGAN PENDING DEPENDENCY (CR-04 WAITING USER ACC & GATEWAY INTEGRATION NOT VERIFIED)**  
**Target Basis Data:** MySQL localhost (`servio_category_db`, `servio_category_test_db`)  
**Hasil Pengujian:** **70 Tests PASS, 190 Assertions, 0 Failures** (Durasi: 6.76s)  

---

## 1. RINGKASAN EKSEKUTIF & VERDICT STATUS

Berdasarkan instruksi **PROMPT 04 — FINAL TARGETED CORRECTION**, telah dilakukan perbaikan mendalam terhadap temuan ulasan independen (`SERVIO_M02_CR02_INDEPENDENT_REVIEW.md`) pada 6 area fungsional:

| Area Evaluasi | Status Evaluasi | Penjelasan / Justifikasi |
|:---|:---:|:---|
| **TASK 01: Proposal CR-04 (V2)** | **WAITING_USER_ACC** | Disempurnakan dengan *Snapshot Tracking Strategy* (`cr04_installed_snapshots`), tanpa mutasi PK `id`, tanpa pengambilalihan `owner_service`, dan rollback aman tanpa menghapus permission pra-eksisting. Nol mutasi kode dilakukan pada `identity-service`. |
| **TASK 02: Consumer Authorization (M2M)** | **PASS** | Validasi M2M mengikat `consumer_service` dari header `X-Consumer-Service` yang diautentikasi. Penolakan terhadap upaya penyamaran (*impersonation attack*) terbukti dengan HTTP 403 `CATEGORY_CONSUMER_IMPERSONATION_DENIED`. |
| **TASK 03: Atomicity Reference Fence (I06)** | **PASS** | `prepareReferenceCheck` dibungkus dalam transaksi atomik dengan row-level lock (`lockForUpdate()`) dan penanganan `QueryException` race condition awal. Nilai `fence_generation` terbukti bertambah secara monotonik tanpa lost update. Parameter `CATEGORY_REFERENCE_FENCE_ENABLED` tetap `false`. |
| **TASK 04: Idempotency Lease Fencing** | **PASS** | `HandleIdempotency.php` tidak pernah menghapus record `IN_PROGRESS` (status 0) hanya karena waktu kedaluwarsa habis, mencegah mutasi ganda (*double mutation*) akibat *late completion*. Dilengkapi ownership fencing pada saat update response. |
| **TASK 05: Session, Gateway & CSRF** | **PARTIAL / NOT VERIFIED** | **Backend Category Service: PASS** — Sanctum SPA stateful session didukung, browser bearer fallback ditiadakan, penolakan header spoofing fail-closed (403).<br>**Frontend/Gateway E2E: NOT VERIFIED** — Integrasi live Reverse Proxy Next.js dan gateway penyerahan context berada di luar runtime service ini. |
| **TASK 06: Security & Test Cleanup** | **PASS** | Default shared secret dipisahkan dari runtime credential; tidak ada secret yang ditampilkan di log/evidence; 70 tests (190 assertions) sukses 100%. |

---

## 2. DETAIL AKAR MASALAH, FILE YANG DIPERBAIKI, DAN KODE DIFF

### 2.1. TASK 01: Revisi Proposal CR-04 (Snapshot Tracking & Non-Takeover)

#### Akar Masalah:
Rancangan migrasi sebelumnya secara otomatis mengubah `owner_service = 'category-service'` pada permission yang sudah ada dan berpotensi menghapus permission kategori yang sudah ada sebelumnya saat rollback (`down()`).
#### Tindakan Koreksi:
1. Menyusun dokumen usulan baru: [`M01_CR04_CATEGORY_PERMISSION_PROPOSAL_REVISED_V2.md`](file:///d:/website%20latihan/servio_web_13/M01_CR04_CATEGORY_PERMISSION_PROPOSAL_REVISED_V2.md).
2. Menerapkan strategi pencatatan snapshot tabel `cr04_installed_snapshots` yang merekam permission dan role grants baru.
3. Memastikan `down()` hanya menghapus entri yang terdata di snapshot, melindungi 100% data pra-eksisting.
4. Nilai `owner_service` pra-eksisting tidak ditimpa: `$existing->owner_service ?: 'category-service'`.
5. Menegaskan status: `WAITING_USER_ACC`. Tidak ada kode `identity-service` yang diubah.

---

### 2.2. TASK 02: Bind Consumer Service Identity pada M2M Internal (I04)

#### Akar Masalah:
Sebelumnya, endpoint `POST /internal/v1/taxonomy/reference-claims` (I04) menerima `consumer_service` dari request body dan hanya memvalidasinya terhadap in-array whitelist. Klien internal dengan key valid dapat mendaftarkan klaim atas nama service lain (misal: `order-service` mengaku sebagai `product-service`).
#### File yang Diperbaiki:
- [`config/services.php`](file:///d:/website%20latihan/servio_web_13/backend/services/category-service/config/services.php#L48-L60)
- [`app/Http/Middleware/RequireInternalServiceKey.php`](file:///d:/website%20latihan/servio_web_13/backend/services/category-service/app/Http/Middleware/RequireInternalServiceKey.php)
- [`app/Http/Controllers/Internal/InternalTaxonomyController.php`](file:///d:/website%20latihan/servio_web_13/backend/services/category-service/app/Http/Controllers/Internal/InternalTaxonomyController.php#L77-L115)
- [`tests/Feature/InternalTaxonomyM2MFeatureTest.php`](file:///d:/website%20latihan/servio_web_13/backend/services/category-service/tests/Feature/InternalTaxonomyM2MFeatureTest.php)

#### Kode Diff:
```diff
--- a/app/Http/Middleware/RequireInternalServiceKey.php
+++ b/app/Http/Middleware/RequireInternalServiceKey.php
@@ -24,6 +24,24 @@ class RequireInternalServiceKey
         if (empty($providedKey) || ! hash_equals((string) $expectedKey, (string) $providedKey)) {
             return ApiResponse::error('CATEGORY_INTERNAL_AUTH_FAILED', 'Akses M2M antarlayanan ditolak.', 403);
         }
+
+        // Validate and bind caller consumer service identity
+        $consumerService = $request->header('X-Consumer-Service');
+        $allowedConsumers = config('services.internal.allowed_consumers', [...]);
+
+        if (! empty($consumerService)) {
+            if (! in_array($consumerService, $allowedConsumers, true)) {
+                return ApiResponse::error('CATEGORY_INTERNAL_CALLER_UNAUTHORIZED', 'Consumer tidak terdaftar.', 403);
+            }
+            $request->attributes->set('internal_consumer_service', $consumerService);
+        }
 
--- a/app/Http/Controllers/Internal/InternalTaxonomyController.php
+++ b/app/Http/Controllers/Internal/InternalTaxonomyController.php
@@ -87,6 +87,17 @@ class InternalTaxonomyController extends Controller
+        // Verify caller identity bound from authenticated M2M header
+        $authenticatedConsumer = $request->attributes->get('internal_consumer_service');
+        if (empty($authenticatedConsumer)) {
+            return ApiResponse::error('CATEGORY_INTERNAL_CALLER_REQUIRED', 'Header X-Consumer-Service wajib disertakan.', 403);
+        }
+
+        // Anti-impersonation: Tolak service yang mengaku sebagai service lain
+        if ($validated['consumer_service'] !== $authenticatedConsumer) {
+            return ApiResponse::error('CATEGORY_CONSUMER_IMPERSONATION_DENIED', "Layanan '{$authenticatedConsumer}' tidak diizinkan mendaftarkan klaim atas nama '{$validated['consumer_service']}'.", 403);
+        }
```

---

### 2.3. TASK 03: Atomicity Reference Fence I06

#### Akar Masalah:
Pemanggilan `prepareReferenceCheck` sebelumnya melakukan query `first()` lalu `save()`, yang rentan terhadap race condition:
1. Jika dua request awal tiba bersamaan saat data belum ada, keduanya mencoba `create()`, memicu `QueryException`.
2. Jika dua request tiba bersamaan saat data sudah ada, keduanya membaca `fence_generation` yang sama dan menghasilkan nilai yang sama (*lost update*).
#### File yang Diperbaiki:
- [`app/Http/Controllers/Internal/InternalTaxonomyController.php`](file:///d:/website%20latihan/servio_web_13/backend/services/category-service/app/Http/Controllers/Internal/InternalTaxonomyController.php#L208-L270)
- [`tests/Feature/InternalTaxonomyM2MFeatureTest.php`](file:///d:/website%20latihan/servio_web_13/backend/services/category-service/tests/Feature/InternalTaxonomyM2MFeatureTest.php#L383-L418)

#### Kode Diff:
```diff
--- a/app/Http/Controllers/Internal/InternalTaxonomyController.php
+++ b/app/Http/Controllers/Internal/InternalTaxonomyController.php
@@ -232,25 +232,38 @@ class InternalTaxonomyController extends Controller
-        $guard = CategoryDeleteGuard::where('node_type', $nodeType)->where('node_id', $nodeId)->first();
-        if ($guard) {
-            $guard->fence_generation = (int) $guard->fence_generation + 1;
-            $guard->save();
-        } else {
-            $guard = CategoryDeleteGuard::create([...]);
-        }
+        // Atomic row-level locked transaction to prevent lost updates & handle concurrent initial inserts
+        $guard = DB::transaction(function () use ($nodeType, $nodeId) {
+            $existing = CategoryDeleteGuard::where('node_type', $nodeType)
+                ->where('node_id', $nodeId)
+                ->lockForUpdate()
+                ->first();
+
+            if ($existing) {
+                $existing->fence_generation = (int) $existing->fence_generation + 1;
+                $existing->fenced_at = now();
+                $existing->released_at = null;
+                $existing->save();
+                return $existing;
+            }
+
+            try {
+                return CategoryDeleteGuard::create([
+                    'id' => (string) Str::uuid(),
+                    'node_type' => $nodeType,
+                    'node_id' => $nodeId,
+                    'fence_generation' => 1,
+                    'fenced_at' => now(),
+                    'released_at' => null,
+                ]);
+            } catch (QueryException $e) {
+                $existingAfterRace = CategoryDeleteGuard::where('node_type', $nodeType)
+                    ->where('node_id', $nodeId)
+                    ->lockForUpdate()
+                    ->firstOrFail();
+
+                $existingAfterRace->fence_generation = (int) $existingAfterRace->fence_generation + 1;
+                $existingAfterRace->fenced_at = now();
+                $existingAfterRace->released_at = null;
+                $existingAfterRace->save();
+                return $existingAfterRace;
+            }
+        }, 3);
```

---

### 2.4. TASK 04: Perbaikan Idempotency Lease & Fencing

#### Akar Masalah:
Pada implementasi sebelumnya, jika sebuah request mutasi memerlukan waktu lebih lama dari batas waktu sewa awal (misal 5 menit) dan statusnya masih `IN_PROGRESS` (status 0), blok `if ($existing->expires_at->isPast()) { $existing->delete(); }` akan menghapus catatan in-progress tersebut. Jika request konkuran atau retry tiba saat mutasi pertama masih berjalan, request kedua diizinkan mengeksekusi mutasi bisnis lagi, menyebabkan **double mutation**!
#### File yang Diperbaiki:
- [`app/Http/Middleware/HandleIdempotency.php`](file:///d:/website%20latihan/servio_web_13/backend/services/category-service/app/Http/Middleware/HandleIdempotency.php)
- [`tests/Feature/IdempotencyAndReplayTest.php`](file:///d:/website%20latihan/servio_web_13/backend/services/category-service/tests/Feature/IdempotencyAndReplayTest.php)

#### Kode Diff:
```diff
--- a/app/Http/Middleware/HandleIdempotency.php
+++ b/app/Http/Middleware/HandleIdempotency.php
@@ -46,12 +46,15 @@ class HandleIdempotency
         if ($existing) {
-            if ($existing->expires_at && $existing->expires_at->isPast()) {
-                $existing->delete();
-            } else {
-                if ((int) $existing->response_status === 0) {
-                    return ApiResponse::error('CATEGORY_CONCURRENT_REQUEST', 'Sedang diproses.', 409);
-                }
+            // 1. IN_PROGRESS claim: DILARANG menghapus meski expired, demi mencegah double mutation
+            if ((int) $existing->response_status === 0) {
+                return ApiResponse::error(
+                    'CATEGORY_CONCURRENT_REQUEST',
+                    'Permintaan mutasi dengan idempotency key yang sama sedang diproses.',
+                    409
+                );
+            }
+
+            // 2. Completed record past its retention expiry (24h)
+            if ($existing->expires_at && $existing->expires_at->isPast()) {
+                $existing->delete();
+            } else {
                 if ($existing->request_hash === $requestHash) {
                     return response()->json($existing->response_body, $existing->response_status)
                         ->header('X-Idempotent-Replayed', 'true');
@@ -124,10 +127,12 @@ class HandleIdempotency
         if ($response->getStatusCode() < 500) {
             $responseBody = json_decode($response->getContent(), true);
             if (is_array($responseBody)) {
-                $record->update([...]);
+                // Fencing: Hanya update jika status masih 0 dan ID klaim cocok
+                CategoryIdempotencyRecord::where('id', $claimId)
+                    ->where('response_status', 0)
+                    ->update([...]);
```

---

## 3. BUKTI PENGUJIAN REGRESI (70 TESTS PASS)

Semua 70 pengujian unit dan feature dijalankan pada basis data terisolasi `servio_category_test_db`:

```text
   PASS  Tests\Unit\CategoryNormalizerTest (3 tests)
  ✓ normalizer trims and collapses whitespace
  ✓ normalizer converts to lowercase utf8
  ✓ normalizer handles null

   PASS  Tests\Feature\AdvancedDuplicateLinkValidationTest (5 tests)
  ✓ business roles without organization cannot submit suggestion
  ✓ suggestion cannot be duplicate of itself
  ✓ circular duplicate linkage is rejected
  ✓ cross branch duplicate linkage is rejected
  ✓ cross type duplicate linkage is rejected

   PASS  Tests\Feature\CategoryAuthorizationAndSecurityFeatureTest (9 tests)
  ✓ unauthenticated request to protected endpoint returns 401
  ✓ actor headers without valid gateway key rejected as spoofing
  ✓ customer cannot create or edit category
  ✓ ceo has oversight read but cannot perform crud
  ✓ merchant cannot access other users private requests idor
  ✓ public can read active categories anonymously
  ✓ identity service denial returns 403 fail closed
  ✓ identity service unavailable returns 503 fail closed
  ✓ r01 distinguishes read all for admin and read own for merchant

   PASS  Tests\Feature\CategoryCrudFeatureTest (8 tests)
  ✓ admin can create category
  ✓ cannot create category without master
  ✓ cannot create duplicate category under same master
  ✓ same category name allowed under different master
  ✓ admin can update category name and description
  ✓ reparent attempt is rejected on update
  ✓ missing if match header returns 428
  ✓ stale lock version returns 409 version conflict

   PASS  Tests\Feature\CategoryHardDeleteGuardsFeatureTest (3 tests)
  ✓ cannot hard delete category with children
  ✓ cannot hard delete when verification protocol is unavailable fail closed
  ✓ non admin cannot hard delete

   PASS  Tests\Feature\CategoryMasterFeatureTest (3 tests)
  ✓ exactly two master roots exist
  ✓ get category masters endpoint returns success
  ✓ admin cannot create master category via crud

   PASS  Tests\Feature\CategoryStatusAndEligibilityFeatureTest (3 tests)
  ✓ deactivate parent preserves stored child status but effective active becomes false
  ✓ cannot activate subcategory if parent is inactive
  ✓ non governance cannot view inactive nodes

   PASS  Tests\Feature\CategorySuggestionFeatureTest (5 tests)
  ✓ merchant can submit produk suggestion but not jasa
  ✓ provider can submit jasa suggestion but not produk
  ✓ suggestion submission does not create official category
  ✓ admin can review and move request to processing then reject
  ✓ admin can fulfill request linking manual official node

   PASS  Tests\Feature\IdempotencyAndReplayTest (6 tests)
  ✓ mutation with idempotency key replays identical response
  ✓ reusing idempotency key with different payload returns conflict
  ✓ cross user idempotency isolation
  ✓ concurrent request with same key returns conflict and does not mutate twice
  ✓ expired in progress claim still rejects duplicate mutation
  ✓ unauthenticated request with idempotency key returns 401

   PASS  Tests\Feature\InternalTaxonomyM2MFeatureTest (12 tests)
  ✓ internal endpoint without key returns 403
  ✓ internal endpoint with invalid key returns 403
  ✓ internal eligibility check returns valid contract
  ✓ i02 get masters returns canonical masters
  ✓ i03 get tree returns hierarchy
  ✓ internal reference claim registration and retrieval
  ✓ i04 missing consumer service header returns 403
  ✓ i04 consumer impersonation returns 403
  ✓ i04 unauthorized consumer service header returns 403
  ✓ i06 prepare reference check creates and increments generation
  ✓ i06 prepare reference check fails on non existent node
  ✓ i06 fence generation monotonically increments without lost updates

   PASS  Tests\Feature\LiveIdentityIntegrationTest (3 tests)
  ✓ live identity service introspect session
  ✓ live identity permission check fail closed for category permissions
  ✓ live identity m2m rejects unauthorized service key

   PASS  Tests\Feature\MySQLIntegrityAndTriggerTest (5 tests)
  ✓ mysql trigger prevents updating category masters
  ✓ mysql trigger prevents deleting category masters
  ✓ mysql trigger prevents updating parent category
  ✓ mysql trigger prevents updating parent subcategory
  ✓ database enforces unique normalized name per parent

   PASS  Tests\Feature\SubcategoryCrudFeatureTest (5 tests)
  ✓ admin can create subcategory under active category
  ✓ cannot create subcategory without category
  ✓ cannot create subcategory under inactive category
  ✓ cannot create duplicate subcategory under same category
  ✓ reparent attempt is rejected on subcategory update

  TOTAL: 70 passed (190 assertions) | Duration: 6.76s | Failures: 0
```

---

## 4. BUKTI KONTROL KEAMANAN DAN PERBANDINGAN SEBELUM/SESUDAH

| Dimensi Keamanan | Sebelum Perbaikan (Prompt 03) | Sesudah Perbaikan (Prompt 04) | Bukti Pengujian |
|:---|:---|:---|:---|
| **M2M Impersonation** | Service memvalidasi string body `consumer_service` terhadap array umum; service A bisa mengaku sebagai service B. | Wajib menyertakan `X-Consumer-Service` yang terotentikasi; penyamaran ditolak 403 `CATEGORY_CONSUMER_IMPERSONATION_DENIED`. | `test_i04_consumer_impersonation_returns_403`, `test_i04_missing_consumer_service_header_returns_403` |
| **Fence Race Condition (I06)** | Select lalu Update/Create biasa tanpa lock; berisiko crash duplikasi dan lost update pada generation counter. | Dibungkus `DB::transaction(..., 3)` dengan `lockForUpdate()`, penanganan `QueryException` race condition awal, UUID stabil. | `test_i06_fence_generation_monotonically_increments_without_lost_updates` (1 $\rightarrow$ 5 terverifikasi) |
| **Idempotency Lease Expiry** | Record in-progress dihapus jika `expires_at->isPast()`, membuka celah eksekusi mutasi ganda saat late completion. | In-progress claim tidak pernah dihapus oleh request baru; late completion dilindungi ownership fencing. | `test_expired_in_progress_claim_still_rejects_duplicate_mutation` |
| **Anon Idempotency** | Pembacaan actor attribute bisa null $\rightarrow$ potensi zero UUID. | Null actor pada rute mutasi idempotency ditolak langsung dengan 401 `CATEGORY_UNAUTHENTICATED`. | `test_unauthenticated_request_with_idempotency_key_returns_401` |
| **Proposal CR-04 Rollback** | Menghapus semua permission ber-owner kategori saat `down()`, berisiko menghapus data pra-eksisting. | Snapshot tracking (`cr04_installed_snapshots`): hanya menghapus ID baru yang dibuat oleh migrasi tersebut. | Dokumen proposal V2 |

---

## 5. ITEM YANG MEMERLUKAN PERSETUJUAN (ACC) DAN STATUS INTEGRASI

1. **Change Request CR-04 Modul 01 Identity Service:**  
   - Status: **`WAITING_USER_ACC`** / **`PENDING_DEPENDENCY`**
   - Dokumen rancangan V2: [`M01_CR04_CATEGORY_PERMISSION_PROPOSAL_REVISED_V2.md`](file:///d:/website%20latihan/servio_web_13/M01_CR04_CATEGORY_PERMISSION_PROPOSAL_REVISED_V2.md).
   - Catatan: Menunggu persetujuan pengguna sebelum file migrasi disalin dan dieksekusi di `identity-service`.
2. **Kesiapan Downstream Reference Claims (Modul 03 & 04):**  
   - Status: **`PENDING_DEPENDENCY`**
   - Parameter `CATEGORY_REFERENCE_FENCE_ENABLED` tetap `false` untuk mengunci jalur Hard Delete fisik sampai Modul 03 (Product) dan Modul 04 (Service) siap mendaftarkan klaim referensi.
3. **Frontend Gateway Session & CSRF Boundary:**  
   - Status: **`NOT VERIFIED` (memerlukan runtime gateway Next.js aktif)**
   - Kebutuhan Integrasi Gateway:
     - Gateway Next.js harus menghapus header `X-Actor-*` yang datang dari browser klien publik.
     - Gateway menerbitkan header `X-Gateway-Key` dan menyuntikkan `X-Actor-User-Id`, `X-Actor-Role`, `X-Actor-Org-Id`, `X-Actor-Role-Assignment-Id`, `X-Actor-Authz-Version` tervalidasi.
     - Melindungi CSRF pada level Reverse Proxy / Gateway untuk mutasi browser berbasis cookie `servio_session`.
