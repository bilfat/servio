1. UI existing tidak boleh dihapus hanya karena backend/database untuk UI tersebut belum dibuat.
2. ak front end menggunakan next.js, untuk backend API ak ingin menggunakan LARAVEL
4. UNTUK DATABASE MENGGUNAKAN mysql
7. ui yang udah ada ak minta tolong untuk di sambungkan dengan backend jangan sampai ada bentuk dummy
8. semua ui bentuk dummy dan tidak akan di pakai, ak mau DITEGASKAN UNTUK DI HAPUS
### 9. ATURAN WAJIB ARSITEKTUR MICROSERVICES DAN PEMISAHAN BACKEND ANTARMODUL SERVIO

SERVIO menggunakan arsitektur **microservices berbasis domain bisnis (Domain-Based Microservices)**. Setiap modul memiliki batas tanggung jawab yang jelas dan backend service tersendiri sesuai domainnya.

**ATURAN MUTLAK: SATU DOMAIN/MODUL = SATU PEMILIK BACKEND. DILARANG MENCAMPUR FITUR, API, DATABASE, CONTROLLER, ATAU BUSINESS LOGIC ANTARMODUL.**

#### 9.1. Pemisahan Backend Wajib

1. Setiap modul dikembangkan di direktori microservice yang sesuai dengan domainnya, bukan dicampurkan ke backend modul lain hanya karena backend tersebut sudah berjalan.
2. Fitur Modul 01 — Identity & Access wajib tetap berada pada Identity Service.
3. Fitur Modul 02 — Category Management wajib berada pada Category Service, bukan pada Identity Service.
4. Aturan yang sama berlaku untuk Modul 03–11 sesuai pembagian domain dalam planning masing-masing.
5. AI dilarang meletakkan fitur modul baru dalam folder, controller, route, service, atau model milik modul sebelumnya.
6. Setiap microservice wajib memiliki batas domain yang jelas dan dapat dikembangkan, diuji, serta dijalankan secara independen.

#### 9.2. Kepemilikan API (API Ownership)

1. Setiap API endpoint harus dimiliki oleh microservice yang bertanggung jawab atas domain bisnisnya.
2. Dilarang menambahkan API kategori, katalog, order, pembayaran, atau domain lain ke Identity Service.
3. Dilarang memindahkan endpoint dari service pemiliknya ke service lain tanpa persetujuan eksplisit.
4. Jika suatu fitur membutuhkan data dari modul lain, gunakan API internal atau event integration melalui kontrak yang telah ditentukan.
5. Dilarang membuat endpoint duplikat dengan business logic yang sama pada dua microservice berbeda.
6. Jika kontrak API yang dibutuhkan belum tersedia, AI wajib mengidentifikasi dependensi dan mengajukan usulan integrasi terlebih dahulu. Jangan membuat API baru secara diam-diam pada service lain.
7. AI dilarang mengubah API contract FINAL LOCKED tanpa Change Request yang disetujui.

#### 9.3. Isolasi Database MySQL

1. Seluruh microservice menggunakan MySQL lokal (`localhost`) pada environment development, sesuai aturan global SERVIO.
2. Setiap microservice wajib menggunakan database atau schema miliknya sendiri.
3. Dilarang membuat tabel domain modul lain di database microservice yang sedang dikerjakan.
4. Dilarang melakukan direct database read/write lintas microservice.
5. Dilarang membuat foreign key antar-database microservice.
6. Data yang dibutuhkan lintas modul wajib diperoleh melalui internal API atau event contract.
7. Migration, seeder, repository, dan model database harus berada dalam service pemilik domain.
8. Dilarang mengubah struktur database service lain tanpa Change Request.

#### 9.4. Pembatasan Scope Implementasi

Sebelum membuat atau mengubah kode, AI wajib memeriksa:

- Modul aktif yang sedang dikerjakan.
- Planning FINAL modul aktif.
- Technical Specification backend modul aktif.
- Daftar fitur yang termasuk dan tidak termasuk scope modul.
- API contract serta database ownership.
- Dependensi terhadap service lain.

AI hanya boleh mengimplementasikan fitur yang secara eksplisit termasuk dalam scope modul aktif.

Jika menemukan kebutuhan di luar scope, AI WAJIB berhenti pada bagian tersebut, melaporkan dampak dan dependensinya, kemudian meminta persetujuan pengguna sebelum melakukan perubahan.

Dilarang membuat fitur, route, controller, service, atau tabel di luar scope atas inisiatif sendiri.

#### 9.5. Integrasi Antarmodul

Microservices boleh berkomunikasi menggunakan REST internal API, event, atau mekanisme integrasi resmi yang telah ditentukan.

Contoh:

- Category Service memerlukan informasi identitas dan role pengguna → menggunakan kontrak API internal Identity Service.
- Category Service menangani pengajuan dan persetujuan kategori → seluruh business logic dan database tetap dimiliki Category Service.
- Identity Service hanya mengelola autentikasi, identitas, role, dan otorisasi sesuai domainnya.

Dilarang menggabungkan dua service menjadi satu hanya untuk mempermudah implementasi.

#### 9.6. Frontend Terintegrasi, Backend Tetap Terpisah

Frontend SERVIO boleh berada dalam satu aplikasi Next.js yang terintegrasi untuk seluruh role.

Namun:
- Integrasi frontend TIDAK berarti backend boleh digabungkan.
- Setiap frontend API adapter wajib mengarah ke service pemilik endpoint atau melalui API Gateway/proxy yang benar.
- API Gateway/proxy hanya meneruskan request dan menangani kebutuhan lintas layanan yang telah ditetapkan; bukan tempat menyimpan business logic domain.
- UI dan dashboard boleh berbagi komponen, tetapi data dan proses bisnis backend tetap mengikuti service ownership.

#### 9.7. Validasi Wajib Sebelum Implementasi

AI wajib menampilkan ringkasan singkat:

1. Nama modul aktif.
2. Nama microservice target.
3. Direktori backend target.
4. Database MySQL target.
5. Daftar fitur yang akan dibuat/diubah.
6. Daftar endpoint API milik modul.
7. Dependensi internal API dari service lain.
8. Konfirmasi bahwa perubahan tidak melanggar service boundary.

Setelah implementasi, AI wajib memeriksa perubahan file (diff) dan membuktikan bahwa tidak ada fitur domain lain yang masuk ke microservice yang salah.

Jika ditemukan pelanggaran service boundary, pekerjaan dinyatakan BELUM SELESAI meskipun test berhasil.

#### 9.8. Larangan Perubahan Diam-Diam

AI DILARANG:
- Menambahkan fitur modul lain ke backend yang sedang dikerjakan.
- Membuat tabel atau migration lintas domain.
- Menggabungkan backend modul lain demi kecepatan.
- Menyalin business logic domain lain ke service aktif.
- Mengubah API FINAL tanpa persetujuan.
- Mengubah database service lain secara tidak sengaja.
- Membuat alias endpoint atau workaround lintas service untuk menutupi kesalahan arsitektur.
- Menyatakan implementasi selesai jika batas microservice dilanggar.

**PRINSIP FINAL SERVIO:**

"Satu domain bisnis memiliki satu pemilik microservice. Setiap modul mempunyai tanggung jawab backend dan database yang terisolasi. Komunikasi antarservice hanya melalui kontrak integrasi resmi. Frontend boleh terintegrasi, tetapi backend tidak boleh dicampur."

**Aturan ini berlaku global untuk seluruh pengembangan SERVIO Modul 01 sampai Modul 11 dan tidak boleh dilanggar tanpa Change Request serta persetujuan eksplisit dari Product Owner.**


UNTUK LOGIN "jangan membuat akun baru gunakan akun yang ada disiini lengkap semua role"
# 1. CEO & PRODUCT OWNER (EKSEKUTIF)
# ROLE: CEO_PRODUCT_OWNER
# USERNAME: Michael Surya
# GMAIL/EMAIL: ceo@servio.id
# PASSWORD: ServioCeo2026!
# NIP: CEO-001 | DEPT: Executive Office | STATUS: ACTIVE

# 2. ADMIN OPERATIONS (INTERNAL ADMIN)
# ROLE: ADMIN_OPERATIONS
# USERNAME: Siti Rahmawati
# GMAIL/EMAIL: admin@servio.id
# PASSWORD: 12345678
# NIP: ADM-001 | DEPT: Operations & Verification | STATUS: ACTIVE

# 3. CUSTOMER (PENGGUNA / KONSUMEN JASA)
# ROLE: CUSTOMER
# USERNAME: Ahmad Fauzi
# GMAIL/EMAIL: customer@servio.id
# PASSWORD: 12345678
# NIK: 3174051208880001 | STATUS: ACTIVE | KTP: Sudah Diunggah

# 4. SERVICE PROVIDER (MITRA BENGKEL / WORKSHOP)
# ROLE: SERVICE_PROVIDER
# USERNAME: Budi Santoso
# GMAIL/EMAIL: provider@servio.id
# PASSWORD: 12345678
# REG_NO: REG-2026-0001 | BADAN_USAHA: PT Servio Mandiri Teknik | NIB: 9120001234567 | STATUS: APPROVED

# 5. MERCHANT (TOKO SPAREPART / RETAIL)
# ROLE: MERCHANT
# USERNAME: Ko Hendra
# GMAIL/EMAIL: merchant@servio.id
# PASSWORD: 12345678
# REG_NO: REG-2026-0002 | TOKO: Sinar AC & Sparepart Glodok | NIB: 8120009922331 | STATUS: APPROVED

# 6. SUPPLIER (DISTRIBUTOR B2B / PRINCIPAL)
# ROLE: SUPPLIER
# USERNAME: Suryanto Wijaya
# GMAIL/EMAIL: supplier@servio.id
# PASSWORD: 12345678
# REG_NO: REG-2026-0003 | PRINCIPAL: PT Nusantara Parts Prima | NIB: 9120005544332 | STATUS: APPROVED

# 7. WORKER TECHNICIAN (TEKNISI LAPANGAN)
# ROLE: WORKER_TECHNICIAN
# USERNAME: Bambang Sudirman
# GMAIL/EMAIL: worker@servio.id
# PASSWORD: 12345678
# NIP: WRK-001 | NIK: 3175082104920004 | BENGKEL: PT Servio Mandiri Teknik | STATUS: ACTIVE

# 8. CUSTOMER SUPPORT (LAYANAN BANTUAN & MEDIASI)
# ROLE: CUSTOMER_SUPPORT
# USERNAME: Rina Oktaviani
# GMAIL/EMAIL: support@servio.id
# PASSWORD: 12345678
# NIP: CS-001 | DEPT: Customer Care & Mediation | STATUS: ACTIVE

# 9. FINANCE & ESCROW (OPERASIONAL KEUANGAN)
# ROLE: FINANCE_PAYMENT_OPS
# USERNAME: Hendrik Wijaya
# GMAIL/EMAIL: finance@servio.id
# PASSWORD: 12345678
# NIP: FIN-001 | DEPT: Finance & Escrow | STATUS: ACTIVE

