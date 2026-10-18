# SERVIO — SCOPED CHANGE REQUEST CR-04 (REVISED)
## MODUL 01 IDENTITY & ACCESS — CATEGORY PERMISSION INTEGRATION
### Dokumen Usulan Perubahan Resmi (Proposal Revision — No Code Mutation)

**Nomor Usulan:** `CR-04-IDENTITY-CATEGORY-PERMISSIONS-REV02`  
**Target Modul:** Modul 01 — Identity & Access Service (`backend/services/identity-service`)  
**Modul Pemohon:** Modul 02 — Category Management Service (`backend/services/category-service`)  
**Status Dokumen:** **WAITING_USER_ACC — NO CODE MUTATION APPLIED**  
**Tanggal Pengajuan:** 16 Oktober 2026 (Revisi 02)  
**Klasifikasi:** *Scoped Architecture Alignment (Zero Business Rule Regression & Idempotent Migration)*  

---

## 1. LATAR BELAKANG DAN MASALAH TEKNIS

1. **Modul 01 (`identity-service`)** memegang otoritas tunggal atas *User Identity, Canonical Roles, Permissions Registry, Role-Permission Mapping, Organization Memberships,* dan *Internal Authorization Evaluation*.
2. **Modul 02 (`category-service`)** mengimplementasikan otorisasi 2 lapis (*Two-Layer Defense*):
   - **Lapisan 1 (Category Domain Layer):** Memvalidasi role kanonis, organisasi aktif (DEC-09), pembatasan cabang produk/jasa (DEC-11), dan pemisahan wewenang governance vs operator (DEC-07).
   - **Lapisan 2 (Identity Evaluation Layer):** Mengevaluasi otorisasi terpusat via `POST /internal/v1/authorization/evaluate` pada Identity Service.
3. Selama pengujian integrasi live M2M (`LiveIdentityIntegrationTest`), endpoint Identity mengembalikan penolakan terproteksi:
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
4. **Akar Masalah:** Modul 01 belum memiliki entri untuk 11 kode permission taksonomi `category.*` pada tabel `permissions` dan tabel pivot `role_permissions`.
5. Sebagai penerapan *Fail-Closed Security*, Category Service secara otomatis menolak seluruh mutasi ketika Identity Service belum memberikan `allow: true`. Diperlukan Change Request resmi (CR-04) yang disetujui pengguna sebelum registrasi permission dapat diterapkan ke Modul 01.

---

## 2. PRESERVASI MUTLAK ATURAN LOCKED (CR-01, CR-02, & FINAL CONTRACT)

Proposal revisi ini menjaga kepatuhan 100% terhadap:

1. **Zero Business Rule Regression:**
   - **NIK Customer:** Tetap 16 digit numerik format-only tanpa KYC Customer (CR-01).
   - **NIK Immutability:** Write-once permanen, dilarang diubah/dihapus oleh role mana pun termasuk CEO (CR-02).
   - **OTP Brevo:** Masa aktif tetap 30 detik sejak issuance (CR-01).
   - **Manual Legal Review:** Verifikasi dokumen Merchant, Provider, dan Supplier manual oleh `ADMIN_OPERATIONS` tanpa vendor otomatis (CR-01).
   - **Employee KYC Eksklusif:** Review berkas internal staf dan Employee KYC tetap eksklusif di tangan `CEO_PRODUCT_OWNER`; Admin dilarang mengakses V08/V09 (CR-02).
   - **Durasi Undangan:** Undangan Worker dan Staf tetap berlaku 12 jam (CR-01).
2. **Tepat 9 Canonical Roles (Tanpa Role Tambahan):**
   - Tidak ada role baru (`SUPER_ADMIN`, dsb.). Role tetap 9 kanonis: `CUSTOMER`, `SERVICE_PROVIDER`, `WORKER_TECHNICIAN`, `MERCHANT`, `SUPPLIER`, `CUSTOMER_SUPPORT`, `FINANCE_PAYMENT_OPS`, `ADMIN_OPERATIONS`, `CEO_PRODUCT_OWNER`.
3. **Pemisahan Wewenang (Separation of Powers - DEC-07):**
   - `CEO_PRODUCT_OWNER` **HANYA** mendapatkan hak baca tata kelola (`category.taxonomy.read_active`, `category.taxonomy.read_inactive`, `category.request.read_all`, `category.audit.read`).
   - `CEO_PRODUCT_OWNER` **DILARANG KERAS** diberikan permission operasional (`create`, `update`, `change_status`, `hard_delete`, `review`).
   - `ADMIN_OPERATIONS` bertindak sebagai operator tunggal untuk mutasi dan peninjauan saran.
4. **Isolasi Database Microservice:**
   - Database `servio_identity_db` tidak menyimpan tabel taksonomi/kategori/klaim apa pun. Perubahan hanya berupa baris data pada tabel `permissions` dan relasi pivot `role_permissions`.

---

## 3. MATRIKS 11 PERMISSION CATEGORY & ROLE GRANT

### 3.1. Spesifikasi Kolom Valid Sesuai Model `App\Models\Permission`
Field tabel `permissions` di Identity Service:
- `id` (UUID, Primary Key)
- `code` (VARCHAR, Unique)
- `resource` (VARCHAR)
- `action` (VARCHAR)
- `scope_type` (VARCHAR: `GLOBAL` atau `ORGANIZATION`)
- `owner_service` (VARCHAR: `'category-service'`)
- `is_active` (BOOLEAN: `true`)
- `created_at`, `updated_at`

### 3.2. Matriks Granular Hak Akses Role

| Permission Code | Resource | Action | Scope Type | CST | PRV | WRK | MRC | SUP | CS | FIN | ADM | CEO |
|:---|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `category.taxonomy.read_active` | `taxonomy` | `read_active` | `GLOBAL` | **✓** | **✓** | **✓** | **✓** | **✓** | **✓** | **✓** | **✓** | **✓** |
| `category.taxonomy.read_inactive` | `taxonomy` | `read_inactive` | `GLOBAL` | — | — | — | — | — | — | — | **✓** | **✓** |
| `category.taxonomy.create` | `taxonomy` | `create` | `GLOBAL` | — | — | — | — | — | — | — | **✓** | — |
| `category.taxonomy.update` | `taxonomy` | `update` | `GLOBAL` | — | — | — | — | — | — | — | **✓** | — |
| `category.taxonomy.change_status` | `taxonomy` | `change_status` | `GLOBAL` | — | — | — | — | — | — | — | **✓** | — |
| `category.taxonomy.hard_delete` | `taxonomy` | `hard_delete` | `GLOBAL` | — | — | — | — | — | — | — | **✓** | — |
| `category.request.submit` | `category_request` | `submit` | `ORGANIZATION` | — | **✓** | — | **✓** | **✓** | — | — | — | — |
| `category.request.read_own` | `category_request` | `read_own` | `ORGANIZATION` | — | **✓** | — | **✓** | **✓** | — | — | — | — |
| `category.request.read_all` | `category_request` | `read_all` | `GLOBAL` | — | — | — | — | — | — | — | **✓** | **✓** |
| `category.request.review` | `category_request` | `review` | `GLOBAL` | — | — | — | — | — | — | — | **✓** | — |
| `category.audit.read` | `category_audit` | `read` | `GLOBAL` | — | — | — | — | — | — | — | **✓** | **✓** |

---

## 4. PERBAIKAN RANCANGAN MIGRASI IDEMPOTENT (CRITICAL REVISION)

### 4.1. Masalah pada Usulan Awal vs Solusi Terverifikasi
- **Masalah Usulan Awal:** Penggunaan `Permission::updateOrCreate(['code' => ...], ['id' => Str::uuid(), ...])` menyebabkan mutasi nilai kolom primary key `id` pada record yang sudah ada, berpotensi memutus relasi foreign key pada tabel `role_permissions`.
- **Solusi Terverifikasi:**
  1. Periksa keberadaan permission berdasarkan `code`.
  2. Jika sudah ada, **pertahankan `id` primary key asli**, hanya perbarui metadata (`resource`, `action`, `scope_type`, `owner_service`, `is_active`).
  3. Jika belum ada, buat record baru dengan UUID baru (`Str::uuid()`).
  4. Penautan relasi role menggunakan `syncWithoutDetaching()` agar relasi pivot yang telah ada tidak terhapus.
  5. Rollback (`down()`) hanya menghapus permission milik `'category-service'` yang spesifik didaftarkan oleh migrasi ini, tanpa menyentuh permission bawaan Identity (`identity.*`).

### 4.2. Kode Usulan Migrasi Idempotent
Target Berkas (Setelah ACC Pengguna):  
`backend/services/identity-service/database/migrations/2026_10_17_000001_seed_category_management_permissions.php`

```php
<?php

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations idempotently without mutating existing primary keys.
     */
    public function up(): void
    {
        $permissionsData = [
            ['code' => 'category.taxonomy.read_active', 'resource' => 'taxonomy', 'action' => 'read_active', 'scope_type' => 'GLOBAL'],
            ['code' => 'category.taxonomy.read_inactive', 'resource' => 'taxonomy', 'action' => 'read_inactive', 'scope_type' => 'GLOBAL'],
            ['code' => 'category.taxonomy.create', 'resource' => 'taxonomy', 'action' => 'create', 'scope_type' => 'GLOBAL'],
            ['code' => 'category.taxonomy.update', 'resource' => 'taxonomy', 'action' => 'update', 'scope_type' => 'GLOBAL'],
            ['code' => 'category.taxonomy.change_status', 'resource' => 'taxonomy', 'action' => 'change_status', 'scope_type' => 'GLOBAL'],
            ['code' => 'category.taxonomy.hard_delete', 'resource' => 'taxonomy', 'action' => 'hard_delete', 'scope_type' => 'GLOBAL'],
            ['code' => 'category.request.submit', 'resource' => 'category_request', 'action' => 'submit', 'scope_type' => 'ORGANIZATION'],
            ['code' => 'category.request.read_own', 'resource' => 'category_request', 'action' => 'read_own', 'scope_type' => 'ORGANIZATION'],
            ['code' => 'category.request.read_all', 'resource' => 'category_request', 'action' => 'read_all', 'scope_type' => 'GLOBAL'],
            ['code' => 'category.request.review', 'resource' => 'category_request', 'action' => 'review', 'scope_type' => 'GLOBAL'],
            ['code' => 'category.audit.read', 'resource' => 'category_audit', 'action' => 'read', 'scope_type' => 'GLOBAL'],
        ];

        foreach ($permissionsData as $p) {
            $existing = Permission::where('code', $p['code'])->first();

            if ($existing) {
                // Update metadata only; NEVER mutate primary key 'id'
                $existing->update([
                    'resource' => $p['resource'],
                    'action' => $p['action'],
                    'scope_type' => $p['scope_type'],
                    'owner_service' => 'category-service',
                    'is_active' => true,
                ]);
            } else {
                // Insert new record with fresh UUID
                Permission::create([
                    'id' => (string) Str::uuid(),
                    'code' => $p['code'],
                    'resource' => $p['resource'],
                    'action' => $p['action'],
                    'scope_type' => $p['scope_type'],
                    'owner_service' => 'category-service',
                    'is_active' => true,
                ]);
            }
        }

        $roleGrants = [
            'ADMIN_OPERATIONS' => [
                'category.taxonomy.read_active',
                'category.taxonomy.read_inactive',
                'category.taxonomy.create',
                'category.taxonomy.update',
                'category.taxonomy.change_status',
                'category.taxonomy.hard_delete',
                'category.request.read_all',
                'category.request.review',
                'category.audit.read',
            ],
            'CEO_PRODUCT_OWNER' => [
                'category.taxonomy.read_active',
                'category.taxonomy.read_inactive',
                'category.request.read_all',
                'category.audit.read',
            ],
            'SERVICE_PROVIDER' => [
                'category.taxonomy.read_active',
                'category.request.submit',
                'category.request.read_own',
            ],
            'MERCHANT' => [
                'category.taxonomy.read_active',
                'category.request.submit',
                'category.request.read_own',
            ],
            'SUPPLIER' => [
                'category.taxonomy.read_active',
                'category.request.submit',
                'category.request.read_own',
            ],
            'CUSTOMER' => [
                'category.taxonomy.read_active',
            ],
            'WORKER_TECHNICIAN' => [
                'category.taxonomy.read_active',
            ],
            'CUSTOMER_SUPPORT' => [
                'category.taxonomy.read_active',
            ],
            'FINANCE_PAYMENT_OPS' => [
                'category.taxonomy.read_active',
            ],
        ];

        foreach ($roleGrants as $roleCode => $codes) {
            $role = Role::where('code', $roleCode)->first();
            if ($role) {
                $permIds = Permission::whereIn('code', $codes)->pluck('id')->toArray();
                // Preserves existing grants and avoids duplicate keys in pivot
                $role->permissions()->syncWithoutDetaching($permIds);
            }
        }
    }

    /**
     * Reverse the migrations cleanly without removing pre-existing permissions.
     */
    public function down(): void
    {
        $codes = [
            'category.taxonomy.read_active',
            'category.taxonomy.read_inactive',
            'category.taxonomy.create',
            'category.taxonomy.update',
            'category.taxonomy.change_status',
            'category.taxonomy.hard_delete',
            'category.request.submit',
            'category.request.read_own',
            'category.request.read_all',
            'category.request.review',
            'category.audit.read',
        ];

        $categoryPermIds = Permission::whereIn('code', $codes)
            ->where('owner_service', 'category-service')
            ->pluck('id')
            ->toArray();

        if (! empty($categoryPermIds)) {
            DB::table('role_permissions')->whereIn('permission_id', $categoryPermIds)->delete();
            Permission::whereIn('id', $categoryPermIds)->delete();
        }
    }
};
```

---

## 5. REKOMENDASI DAN LANGKAH PERSETUJUAN (ACC)

1. Dokumen ini disiapkan sebagai dasar persetujuan pengguna (*User Approval*).
2. **Tidak ada migrasi atau perubahan kode yang telah dijalankan pada `identity-service`**.
3. Status ketergantungan ini diklasifikasikan sebagai `PENDING_DEPENDENCY`.
4. Setelah pengguna menyetujui (`USER ACC: APPROVED`), migrasi di atas dapat ditempatkan di `backend/services/identity-service/database/migrations/` dan dieksekusi via `php artisan migrate`.

**STATUS:** **WAITING_USER_ACC**
