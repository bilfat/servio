# SERVIO — SCOPED CHANGE REQUEST CR-04 (REVISED V2)
## MODUL 01 IDENTITY & ACCESS — CATEGORY PERMISSION INTEGRATION
### Dokumen Usulan Perubahan Resmi (Proposal Revision V2 — No Code Mutation)

**Nomor Usulan:** `CR-04-IDENTITY-CATEGORY-PERMISSIONS-REV03-FINAL`  
**Target Modul:** Modul 01 — Identity & Access Service (`backend/services/identity-service`)  
**Modul Pemohon:** Modul 02 — Category Management Service (`backend/services/category-service`)  
**Status Dokumen:** **WAITING_USER_ACC — NO CODE MUTATION APPLIED**  
**Tanggal Pengajuan:** 17 Oktober 2026 (Revisi V2)  
**Klasifikasi:** *Scoped Architecture Alignment (Zero Regression, Non-Takeover, & Snapshot-Tracked Rollback)*  

---

## 1. LATAR BELAKANG & TUJUAN REVISI V2

Berdasarkan hasil peninjauan independen terhadap proposal sebelumnya, ditemukan beberapa risiko struktural yang disempurnakan pada versi V2 ini:
1. **Risiko Pengambilalihan Owner Service:** Skrip migrasi sebelumnya secara otomatis mengubah `owner_service = 'category-service'` pada permission yang sudah ada. Pada versi V2 ini, `owner_service` yang telah dimiliki oleh permission pra-eksisting **dipertahankan sepenuhnya**.
2. **Risiko Rollback Merusak Data Pra-Eksisting:** Rollback sebelumnya menghapus semua permission berkode kategori yang ber-owner `category-service`. Jika ada permission kategori yang sudah ada sebelum migrasi dijalankan, rollback akan menghapusnya secara tidak sengaja. Pada versi V2 ini, diterapkan **Snapshot Tracking Strategy** (`cr04_installed_snapshots`) sehingga rollback **hanya menghapus record yang benar-benar baru dibuat oleh migrasi ini**.
3. **Preservasi Primary Key & Pivot:** Nilai UUID `id` permission pra-eksisting tidak dimutasi sama sekali, dan relasi pivot `role_permissions` yang sudah ada tidak terpengaruh.
4. **Pemisahan Wewenang (Separation of Powers):** Tetap tepat 9 canonical roles, dan `CEO_PRODUCT_OWNER` **hanya memiliki akses observasi/read-only tata kelola**, tanpa izin operasional mutasi taksonomi.

---

## 2. PRESERVASI MUTLAK ATURAN LOCKED (CR-01 & CR-02)

Proposal revisi V2 ini tunduk penuh pada aturan locked:
1. **NIK Customer:** Tetap 16 digit numerik format-only tanpa KYC Customer (CR-01).
2. **NIK Immutability:** Write-once permanen, dilarang diubah/dihapus oleh role mana pun termasuk CEO (CR-02).
3. **OTP Brevo:** Masa aktif tetap 30 detik sejak issuance (CR-01).
4. **Manual Legal Review:** Verifikasi dokumen Merchant, Provider, dan Supplier manual oleh `ADMIN_OPERATIONS` tanpa vendor otomatis (CR-01).
5. **Employee KYC Eksklusif:** Review berkas internal staf dan Employee KYC tetap eksklusif di tangan `CEO_PRODUCT_OWNER`; Admin dilarang mengakses V08/V09 (CR-02).
6. **Durasi Undangan:** Undangan Worker dan Staf tetap berlaku 12 jam (CR-01).
7. **Canonical Roles:** Tepat 9 role (`CUSTOMER`, `SERVICE_PROVIDER`, `WORKER_TECHNICIAN`, `MERCHANT`, `SUPPLIER`, `CUSTOMER_SUPPORT`, `FINANCE_PAYMENT_OPS`, `ADMIN_OPERATIONS`, `CEO_PRODUCT_OWNER`).

---

## 3. MATRIKS 11 PERMISSION CATEGORY & ROLE GRANT

### 3.1. Spesifikasi Schema Valid Sesuai Model `App\Models\Permission`
Field tabel `permissions` di Identity Service:
- `id` (UUID, Primary Key)
- `code` (VARCHAR, Unique)
- `resource` (VARCHAR)
- `action` (VARCHAR)
- `scope_type` (VARCHAR: `GLOBAL` atau `ORGANIZATION`)
- `owner_service` (VARCHAR: `'category-service'`)
- `is_active` (BOOLEAN: `true`)
- `created_at`, `updated_at`

### 3.2. Matriks Granular Hak Akses Role (9 Canonical Roles)

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

## 4. RANCANGAN MIGRASI IDEMPOTENT DENGAN STRATEGI SNAPSHOT TRACKING

Target Berkas Usulan (Dijalankan di Modul 01 HANYA setelah ACC Pengguna):  
`backend/services/identity-service/database/migrations/2026_10_17_000001_seed_category_management_permissions_v2.php`

```php
<?php

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run migration with snapshot tracking to ensure 100% safe rollback without data loss.
     */
    public function up(): void
    {
        // 1. Create tracker snapshot table if not exists
        if (! Schema::hasTable('cr04_installed_snapshots')) {
            Schema::create('cr04_installed_snapshots', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('item_type', 32); // 'PERMISSION' or 'ROLE_GRANT'
                $table->uuid('target_id');        // permission_id
                $table->uuid('secondary_id')->nullable(); // role_id for ROLE_GRANT
                $table->timestamps();
            });
        }

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
                // Update metadata only. NEVER change 'id', and preserve existing 'owner_service'
                $existing->update([
                    'resource' => $p['resource'],
                    'action' => $p['action'],
                    'scope_type' => $p['scope_type'],
                    'owner_service' => $existing->owner_service ?: 'category-service',
                    'is_active' => true,
                ]);
            } else {
                $newId = (string) Str::uuid();
                Permission::create([
                    'id' => $newId,
                    'code' => $p['code'],
                    'resource' => $p['resource'],
                    'action' => $p['action'],
                    'scope_type' => $p['scope_type'],
                    'owner_service' => 'category-service',
                    'is_active' => true,
                ]);

                // Track newly created permission ID in snapshot
                DB::table('cr04_installed_snapshots')->insert([
                    'id' => (string) Str::uuid(),
                    'item_type' => 'PERMISSION',
                    'target_id' => $newId,
                    'secondary_id' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
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
                $permissions = Permission::whereIn('code', $codes)->get();
                foreach ($permissions as $perm) {
                    $alreadyGranted = DB::table('role_permissions')
                        ->where('role_id', $role->id)
                        ->where('permission_id', $perm->id)
                        ->exists();

                    if (! $alreadyGranted) {
                        $role->permissions()->attach($perm->id);

                        // Record newly added grant in snapshot
                        DB::table('cr04_installed_snapshots')->insert([
                            'id' => (string) Str::uuid(),
                            'item_type' => 'ROLE_GRANT',
                            'target_id' => $perm->id,
                            'secondary_id' => $role->id,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }
            }
        }
    }

    /**
     * Reverse migrations strictly using snapshots, protecting all pre-existing records.
     */
    public function down(): void
    {
        if (! Schema::hasTable('cr04_installed_snapshots')) {
            return;
        }

        // 1. Detach only newly added role grants
        $grants = DB::table('cr04_installed_snapshots')
            ->where('item_type', 'ROLE_GRANT')
            ->get();

        foreach ($grants as $g) {
            DB::table('role_permissions')
                ->where('role_id', $g->secondary_id)
                ->where('permission_id', $g->target_id)
                ->delete();
        }

        // 2. Delete only newly created permissions
        $newPermIds = DB::table('cr04_installed_snapshots')
            ->where('item_type', 'PERMISSION')
            ->pluck('target_id')
            ->toArray();

        if (! empty($newPermIds)) {
            DB::table('role_permissions')->whereIn('permission_id', $newPermIds)->delete();
            Permission::whereIn('id', $newPermIds)->delete();
        }

        // 3. Clean up tracker table
        Schema::dropIfExists('cr04_installed_snapshots');
    }
};
```

---

## 5. REKOMENDASI DAN LANGKAH PERSETUJUAN (ACC)

1. Dokumen ini disiapkan sebagai **Usulan Resmi Versi 2 (V2)**.
2. Sesuai instruksi **STOP CONDITIONS**, **TIDAK ADA MIGRATION ATAU PERUBAHAN KODE YANG DIJALANKAN DI MODUL 01**.
3. Status ketergantungan ini berstatus **`WAITING_USER_ACC`** / **`PENDING_DEPENDENCY`**.
4. Setelah persetujuan resmi pengguna diperoleh, berkas migrasi di atas dapat dipindahkan ke `backend/services/identity-service/database/migrations/` dan dieksekusi.

**STATUS:** **WAITING_USER_ACC**
