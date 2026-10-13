# SERVIO — WARRANTY V1
# FINAL LOCKED BUSINESS FLOW + UI SPEC + PHASED IMPLEMENTATION PROMPT

> **Status:** LOCKED  
> **Scope:** Provider + Worker + Customer  
> **Purpose:** Menjadi satu sumber instruksi untuk coding agent agar Warranty V1 diimplementasikan end-to-end, termasuk business flow, state, card, timeline, role action, shared fixture/state, dan verification.
>
> **Penting:** Dokumen ini menggantikan struktur UI Warranty/Pengajuan Garansi lama yang membingungkan. Jangan menjalankan dua struktur UI yang berbeda secara paralel.

---

# 1. RINGKASAN KEPUTUSAN FINAL

Warranty V1 dibagi menjadi dua area utama:

```text
PROVIDER
GARANSI
├── Garansi
└── Pengajuan Garansi

WORKER
GARANSI
└── Garansi

CUSTOMER
Pesanan
├── Pesanan
└── Garansi
```

Konsep utama:

```text
GARANSI
≠
PENGAJUAN GARANSI
```

**Garansi** adalah konfigurasi dan aset warranty milik Provider:
- status Warranty Store;
- pilihan durasi;
- layanan yang menggunakan warranty;
- warranty yang sudah/ belum diaktifkan.

**Pengajuan Garansi** adalah pusat operasi penanganan claim:
- review claim;
- assign Worker;
- schedule;
- monitoring kedatangan;
- pemeriksaan;
- diagnosis;
- keputusan Provider;
- repair / paid work;
- completion;
- resolution.

---

# 2. PENJELASAN BUSINESS FLOW FINAL

## 2.1 Prinsip keputusan final

Pada tahap **Hasil Diagnosis**, Provider hanya memiliki **3 keputusan utama**:

```text
1. ✓ Setujui Perbaikan Garansi
2. Rp Ajukan Pekerjaan Berbayar
3. ↻ Minta Informasi Tambahan
```

**Jangan menambahkan tombol ke-4 seperti:**
- Tidak termasuk garansi
- Tidak dikerjakan
- Tutup tanpa pengerjaan

Alasannya: status “di luar garansi” ditangani melalui cabang **Pekerjaan Berbayar**, kemudian **Customer** menjadi pihak yang memutuskan apakah pekerjaan tersebut dilanjutkan.

Flow:

```text
HASIL DIAGNOSIS
        ↓
KEPUTUSAN PROVIDER
        │
        ├── ✓ SETUJUI PERBAIKAN GARANSI
        │       ↓
        │   PENGERJAAN
        │       ↓
        │   SELESAI
        │
        ├── Rp AJUKAN PEKERJAAN BERBAYAR
        │       ↓
        │   PROPOSAL KE CUSTOMER
        │       ↓
        │   CUSTOMER MEMILIH
        │       │
        │       ├── ✓ SETUJUI & LANJUTKAN
        │       │       ↓
        │       │     BAYAR
        │       │       ↓
        │       │   PENGERJAAN
        │       │       ↓
        │       │   SELESAI
        │       │
        │       └── ✕ TOLAK
        │               ↓
        │       PEKERJAAN TIDAK DILANJUTKAN
        │
        └── ↻ MINTA INFORMASI TAMBAHAN
                ↓
             WORKER UPDATE
                ↓
         PROVIDER REVIEW LAGI
```

### Aturan penting

- Provider menentukan **cakupan warranty / proposal pekerjaan**.
- Worker hanya menghasilkan temuan teknis, diagnosis, bukti, dan rekomendasi teknis.
- Worker tidak menentukan coverage final.
- Worker tidak menentukan harga final.
- Customer adalah pihak yang mengotorisasi paid work.
- Jika Customer menolak paid work, Worker tidak boleh mengerjakan paid work tersebut.
- Penolakan paid work tidak boleh dianggap sebagai Provider menolak claim garansi.
- Original completed order tidak dibuka kembali.
- Paid Work menggunakan order/transaksi baru yang terhubung ke Warranty Claim dan original Service Order.

---

# 3. FLOW OPERASIONAL END-TO-END

## 3.1 Alur utama

```text
Customer Ajukan Garansi
        ↓
Provider Review
        ↓
Provider Terima untuk Pemeriksaan
        ↓
Provider Assign Worker
        ↓
Provider Atur Jadwal
        ↓
Worker menunggu jadwal
        ↓
Waktu sudah masuk
        ↓
Worker Mulai Penanganan
        ↓
Worker OTW
        ↓
Worker Check-in
        ↓
Pemeriksaan
        ↓
Worker Diagnosis
        ↓
Worker Submit Diagnosis
        ↓
Provider menerima hasil
        ↓
HASIL DIAGNOSIS
        ↓
Provider memilih 3 keputusan
```

Cabang:

```text
COVERED
↓
Repair Scheduling
↓
Worker Repair
↓
Completion Proof
↓
Provider Review
↓
RESOLVED
```

atau:

```text
NOT COVERED
↓
Commercial Proposal
↓
Customer Approve / Reject
├── Reject → stop paid work
└── Approve → Payment → New Paid Work Order → Worker Execute → Complete
```

atau:

```text
MORE INFO
↓
Worker menerima permintaan
↓
Worker update diagnosis/evidence
↓
Submit ulang
↓
Provider review kembali
```

---

# 4. GARANSI VS CLAIM VS ORDER

Jangan mencampurkan entitas berikut:

```text
Warranty
    = hak/masa perlindungan

Warranty Claim
    = pengajuan penanganan atas Warranty

Original Service Order
    = transaksi awal

Warranty Assignment / Job
    = pekerjaan Worker untuk menangani Claim

Paid Work Order
    = transaksi baru ketika pekerjaan di luar warranty disetujui Customer
```

### Original Order

Tidak boleh dibuka kembali atau dimutasi setelah `COMPLETED`.

Jangan mengubah:
- final price historis;
- invoice historis;
- payment historis;
- completion timestamp;
- Worker history;
- data completion awal.

### Paid Work

Harus menjadi konteks transaksi baru yang terhubung dengan:
- `parentWarrantyClaimId`;
- `originalServiceOrderId`;
- `customerId`;
- `providerId`;
- `workerId`.

---

# 5. ROLE & HAK AKSI

## 5.1 Provider

Provider adalah pemilik operasi Warranty.

### Provider boleh:

- mengaktifkan/nonaktifkan Warranty Store;
- membuat pilihan durasi;
- mengarsipkan pilihan durasi;
- mengatur warranty pada Master Service;
- melihat order selesai yang eligible untuk activation;
- memberikan/aktifkan warranty;
- menerima atau menolak claim awal;
- wajib memasukkan alasan ketika menolak claim;
- memilih Worker;
- membuat jadwal inspeksi;
- mengubah jadwal;
- melihat timeline Warranty;
- melihat diagnosis Worker;
- memutuskan:
  - Covered Repair;
  - Paid Work;
  - Request More Information;
- membuat commercial paid-work proposal;
- mengirim proposal ke Customer;
- menjadwalkan Repair Warranty;
- mereview completion proof;
- menyelesaikan Claim.

### Provider tidak boleh:

- mengubah original completed order;
- mengubah invoice historis;
- mengubah payment historis;
- mengubah final price original order;
- menjadikan Worker sebagai pengambil keputusan coverage;
- membypass persetujuan Customer untuk paid work;
- membuat Worker mengerjakan paid work yang belum authorized.

---

## 5.2 Worker

Worker adalah eksekutor lapangan dan sumber diagnosis teknis.

### Worker boleh:

- melihat Warranty jobs yang memang ditugaskan kepadanya;
- melihat jadwal;
- melihat customer/service/location yang dibutuhkan untuk pekerjaan;
- mulai penanganan;
- OTW;
- check-in;
- melakukan pemeriksaan;
- mengisi diagnosis;
- upload foto/video/bukti;
- mengirim diagnosis;
- menanggapi request informasi tambahan;
- memberikan rekomendasi teknis pekerjaan;
- mengerjakan Warranty Repair yang sudah di-approve;
- upload bukti perbaikan;
- mengerjakan Paid Work hanya setelah Customer authorized dan order/pembayaran sesuai flow sudah tersedia.

### Worker tidak boleh:

- mengaktifkan Warranty;
- memberi keputusan coverage final;
- memutuskan claim accepted/rejected atas nama Provider;
- menetapkan harga final;
- membuat commercial proposal final atas nama Provider;
- menyatakan paid work authorized tanpa approval Customer;
- mengubah original completed order;
- mengubah invoice original;
- mengubah payment original;
- mengerjakan paid work yang belum authorized.

---

## 5.3 Customer

Customer adalah pemilik Warranty dan pihak yang melakukan claim.

### Customer boleh:

- melihat Warranty miliknya;
- melihat periode Warranty;
- melihat status claim;
- mengajukan claim jika eligible;
- melihat timeline customer-safe;
- melihat jadwal;
- melihat status Worker pada level yang aman;
- melihat hasil pemeriksaan yang aman untuk Customer;
- melihat paid-work proposal;
- memilih:
  - `Setujui & Lanjutkan`;
  - `Tolak`;
- melihat hasil akhir.

### Customer tidak boleh:

- grant Warranty;
- menentukan coverage;
- assign Worker;
- set harga final;
- mengubah invoice;
- mengubah payment;
- memutasi original completed order;
- menginstruksikan Worker menjalankan paid work tanpa authorization.

---

# 6. TIMELINE FINAL

## 6.1 Timeline operasional utama

Gunakan flow berikut sebagai bahasa UI:

```text
Pengajuan
↓
Review Provider
↓
Teknisi Ditugaskan
↓
Jadwal
↓
Teknisi Datang
↓
Pemeriksaan
↓
Diagnosis
↓
Keputusan Provider
↓
Perbaikan
↓
Selesai
```

Di level Worker, proses lapangan dibuat lebih jelas:

```text
Ditugaskan
↓
Terjadwal
↓
Mendatang
↓
Mulai Penanganan
↓
OTW
↓
Check-in
↓
Pemeriksaan
↓
Diagnosis
↓
Menunggu Provider
↓
Repair
↓
Selesai
```

**Catatan:** “Check-in” bukan tab terpisah. Check-in adalah aksi Worker di dalam tahap kedatangan/pemeriksaan.

---

# 7. STRUKTUR TAB PROVIDER FINAL

Gunakan `/provider/warranty/requests`.

Jangan menggunakan struktur lama yang memiliki terlalu banyak status teknis sebagai tab.

Gunakan:

```text
PENGAJUAN GARANSI

[Perlu Tindakan]
[Sudah Ditindak]
[Sedang Berjalan]
[Hasil]
[Pengerjaan]
[Menunggu Pembayaran]
[Selesai]
```

Tab tersebut adalah **UI grouping**, bukan pengganti domain status.

## 7.1 Perlu Tindakan

Berisi case yang membutuhkan action Provider sekarang.

Contoh:
- claim baru menunggu review;
- completion proof menunggu review;
- diagnosis selesai dan keputusan Provider dibutuhkan;
- proposal/approval yang membutuhkan action Provider.

### Card wajib

```text
Badge
Warranty ID
Service
Customer
Worker
Original Order
Tanggal/jam relevan
Status
Ringkasan masalah
Last update
Primary CTA
Secondary CTA bila ada
```

Contoh visual:

```text
┌──────────────────────────────────────────────┐
│ WARRANTY                         PERLU TINDAKAN│
│ WRN-2026-000101                              │
│                                              │
│ AC Repair                                    │
│ Budi Santoso                                 │
│ Worker: Belum Ditugaskan                     │
│ Order: #ORD-W-1001                           │
│                                              │
│ Masalah: AC tidak dingin                     │
│ Diajukan: 24 Sep 2026 • 09:42               │
│                                              │
│ [Lihat Pengajuan] [Terima & Tugaskan]        │
└──────────────────────────────────────────────┘
```

---

# 8. TAB PROVIDER — SUDAH DITINDAK

Ini khusus case yang sudah ditangani di sisi administratif Provider tetapi **pekerjaan lapangan belum dimulai karena waktunya belum masuk**.

Contoh:
- Worker sudah dipilih;
- schedule sudah dibuat;
- Worker belum mulai;
- jadwal masih future.

Card:

```text
┌──────────────────────────────────────────────┐
│ WARRANTY                         TERJADWAL    │
│ WRN-2026-000102                              │
│                                              │
│ AC Cleaning                                  │
│ Budi Santoso                                 │
│ Worker: Andi Pratama                         │
│                                              │
│ 26 Sep 2026 • 10:00 WIB                      │
│ Jl. Contoh No. 10, Bandung                   │
│                                              │
│ ✓ Worker ditugaskan                           │
│ ✓ Jadwal dibuat                               │
│ ○ Belum dimulai                               │
│                                              │
│ [Lihat Penanganan] [Ubah Jadwal]             │
└──────────────────────────────────────────────┘
```

Definisi:

```text
SUDAH DITINDAK
=
Provider sudah melakukan action
akan tetapi pekerjaan lapangan belum dimulai.
```

---

# 9. TAB PROVIDER — SEDANG BERJALAN

Berisi case yang sudah masuk proses lapangan:

```text
Mulai Penanganan
→ OTW
→ Check-in
→ Pemeriksaan
→ Diagnosis
```

Card:

```text
┌──────────────────────────────────────────────┐
│ WARRANTY                         SEDANG BERJALAN│
│ WRN-2026-000104                              │
│                                              │
│ AC Repair                                    │
│ Budi Santoso                                 │
│ Worker: Andi Pratama                         │
│                                              │
│ Hari ini • 10:00 WIB                         │
│ Lokasi: Bandung                              │
│                                              │
│ ● OTW                                        │
│ ✓ Worker sudah mulai penanganan              │
│                                              │
│ Last update: 10:18 WIB                       │
│                                              │
│ [Lihat Penanganan]                            │
└──────────────────────────────────────────────┘
```

---

# 10. TAB PROVIDER — HASIL

Case masuk ke sini ketika Worker sudah mengirim diagnosis.

Card wajib menampilkan hasil teknis ringkas.

```text
┌──────────────────────────────────────────────┐
│ WARRANTY                             HASIL    │
│ WRN-2026-000103                              │
│                                              │
│ AC Repair                                    │
│ Budi Santoso                                 │
│ Worker: Andi Pratama                         │
│                                              │
│ Temuan                                        │
│ Kompresor tidak bekerja normal               │
│                                              │
│ Diagnosis                                     │
│ Kompresor mengalami kerusakan                │
│                                              │
│ Rekomendasi                                   │
│ Penggantian kompresor                        │
│                                              │
│ 3 Foto bukti                                 │
│                                              │
│ [Lihat Diagnosis & Bukti]                    │
└──────────────────────────────────────────────┘
```

Pada detail, tampilkan keputusan:

```text
┌──────────────────────────────────────────────┐
│ KEPUTUSAN PROVIDER                           │
│                                              │
│ [✓ Setujui Perbaikan Garansi]                │
│ [Rp Ajukan Pekerjaan Berbayar]               │
│ [↻ Minta Informasi Tambahan]                 │
└──────────────────────────────────────────────┘
```

**Tiga tombol ini adalah final. Jangan menambah tombol “Tidak Dikerjakan”.**

---

# 11. TAB PROVIDER — PENGERJAAN

Berisi:
- Warranty Repair yang sudah diapprove;
- Paid Work yang sudah authorized Customer dan siap/ sedang dikerjakan.

Card Warranty Repair:

```text
┌──────────────────────────────────────────────┐
│ WARRANTY                         PENGERJAAN   │
│ WRN-2026-000107                              │
│                                              │
│ AC Repair                                    │
│ Budi Santoso                                 │
│ Worker: Andi Pratama                         │
│                                              │
│ Perbaikan: Penggantian Kompresor             │
│ Jadwal: 27 Sep 2026 • 14:00 WIB              │
│                                              │
│ ● Worker sedang mengerjakan                  │
│                                              │
│ [Lihat Progres]                               │
└──────────────────────────────────────────────┘
```

Card Paid Work:

```text
┌──────────────────────────────────────────────┐
│ PAID WORK                          PENGERJAAN │
│ WRN-2026-000107                              │
│                                              │
│ AC Repair                                    │
│ Budi Santoso                                 │
│ Worker: Andi Pratama                         │
│                                              │
│ Total: Rp505.000                             │
│ ✓ Customer menyetujui                       │
│ ✓ Order Paid Work dibuat                    │
│                                              │
│ [Lihat Pengerjaan]                            │
└──────────────────────────────────────────────┘
```

---

# 12. TAB PROVIDER — MENUNGGU PEMBAYARAN

Berisi paid-work proposal yang masih menunggu Customer.

Card:

```text
┌──────────────────────────────────────────────┐
│ PAID WORK                   MENUNGGU CUSTOMER│
│ WRN-2026-000106                              │
│                                              │
│ AC Repair                                    │
│ Budi Santoso                                 │
│ Worker: Andi Pratama                         │
│                                              │
│ Alasan                                        │
│ Kerusakan di luar cakupan garansi            │
│                                              │
│ Jasa: Rp350.000                              │
│ Material: Rp155.000                          │
│ Total: Rp505.000                             │
│                                              │
│ Status: Menunggu persetujuan Customer        │
│                                              │
│ [Lihat Proposal]                              │
└──────────────────────────────────────────────┘
```

Jangan membuat status seolah Worker boleh mulai.

---

# 13. TAB PROVIDER — SELESAI

Berisi claim/repair yang sudah selesai secara operasional.

Card:

```text
┌──────────────────────────────────────────────┐
│ WARRANTY                             SELESAI │
│ WRN-2026-000100                              │
│                                              │
│ AC Cleaning                                  │
│ Budi Santoso                                 │
│ Worker: Andi Pratama                         │
│                                              │
│ Selesai: 24 Sep 2026 • 15:20                 │
│                                              │
│ Hasil: Perbaikan Warranty selesai            │
│                                              │
│ Warranty: AKTIF                              │
│ Berlaku s/d 07 Nov 2026                      │
│                                              │
│ [Lihat Riwayat Penanganan]                   │
└──────────────────────────────────────────────┘
```

**Claim RESOLVED tidak berarti Warranty otomatis EXPIRED.**

---

# 14. DETAIL PROVIDER

Saat `[Lihat Penanganan]`, tampilkan:

```text
HEADER
↓
Warranty Information
↓
Customer Information
↓
Original Order
↓
Original Worker
↓
Current Warranty Worker
↓
Schedule
↓
Visual Timeline
↓
Diagnosis & Evidence
↓
Provider Decision
↓
Repair / Paid Work
↓
Completion Proof
↓
History / Audit
```

Header minimal:

```text
Warranty ID
Service
Customer
Provider
Original Order ID
Original Worker
Current Warranty Worker
Warranty Period
Current Claim
Current Stage
Current Status
```

**Original Worker harus tetap ditampilkan sebagai historis. Jangan di-overwrite ketika Worker warranty berbeda.**

---

# 15. PROVIDER: GARANSI STORE

Route:

```text
/provider/warranty
```

Halaman ini bukan pusat claim operation.

Tampilkan:

## Warranty Store

```text
● Aktif
[Nonaktifkan Garansi Toko]
```

atau:

```text
○ Belum Aktif
[Aktifkan Garansi Toko]
```

## Durasi Garansi

Contoh dummy:

```text
30 Hari
45 Hari
60 Hari
```

Aksi:

```text
[+ Tambah Durasi]
[Arsipkan]
```

Jangan hardcode durasi di source component jika model existing sudah memiliki sumber konfigurasi.

## Layanan yang Menggunakan Warranty

```text
AC Cleaning       → 30 Hari
AC Repair         → 45 Hari
AC Installation   → 60 Hari
Electrical Repair → 30 Hari
```

Setiap service dapat mengatur durasi dari pilihan Provider.

## Pending Activation

Tampilkan order yang:
- sudah Completed;
- eligible untuk Warranty;
- belum diaktifkan.

CTA:

```text
[Aktifkan Garansi]
```

## Operation Center

Banner:

```text
Punya pengajuan pelanggan yang perlu ditangani?

[Buka Pengajuan Garansi]
```

---

# 16. SERVICE CARD

Pada semua Master Service dengan `warrantyEnabled = true`:

```text
✓ Garansi Tersedia
```

Pada primary Service Card **jangan memaksa durasi** tampil.

Durasi dapat ditampilkan pada:
- Service detail;
- Tambah Layanan;
- Edit Layanan;
- Warranty detail;
- checkout/order context jika memang sudah tersedia.

---

# 17. TAMBAH / EDIT LAYANAN

Pada:

```text
/provider/services
```

Modal `Tambah Layanan` dan `Edit Layanan` wajib memiliki:

```text
Garansi Layanan
[30 Hari ▼]
```

Sumber pilihan harus berasal dari:

```text
ProviderWarrantyDuration
```

yang aktif.

Jangan:

```text
[30]
[45]
[60]
```

hardcoded hanya di component.

Jika Warranty Store OFF:

```text
Toko Garansi Belum Aktif
Aktifkan Warranty Store untuk mengatur Garansi Layanan.
```

---

# 18. WORKER UI FINAL

Route:

```text
/worker/warranty
```

Top navigation:

```text
[Tugas Garansi] [Riwayat Garansi]
```

Pada `Tugas Garansi`:

```text
[Mendatang]
[Hari Ini]
[Sedang Berjalan]
[Menunggu Provider]
[Selesai]
```

Gunakan badge yang selalu jelas:

```text
WARRANTY
```

atau:

```text
PAID WORK
```

---

# 19. WORKER CARD — MENDATANG

Definisi:

- Worker sudah ditugaskan;
- schedule sudah dibuat;
- waktu belum masuk.

Card:

```text
┌──────────────────────────────────────────────┐
│ WARRANTY                         MENDATANG    │
│ WRN-2026-000102                              │
│                                              │
│ AC Cleaning                                  │
│ Customer: Budi Santoso                      │
│ Provider: PT Servio Mandiri Teknik           │
│                                              │
│ 26 Sep 2026 • 10:00 WIB                      │
│ Jl. Contoh No. 10, Bandung                   │
│                                              │
│ Status: TERJADWAL                            │
│                                              │
│ [Lihat Detail]                               │
└──────────────────────────────────────────────┘
```

Worker belum boleh start sebelum waktunya masuk.

---

# 20. WORKER CARD — HARI INI

Ketika jadwal sudah dapat dimulai:

```text
┌──────────────────────────────────────────────┐
│ WARRANTY                         HARI INI     │
│ WRN-2026-000103                              │
│                                              │
│ AC Repair                                    │
│ Customer: Budi Santoso                      │
│                                              │
│ 24 Sep 2026 • 10:00 WIB                      │
│ Lokasi: Bandung                              │
│                                              │
│ Status: SIAP DIMULAI                         │
│                                              │
│ [▶ Mulai Penanganan]                         │
└──────────────────────────────────────────────┘
```

Saat klik:

```text
Mulai Penanganan
↓
OTW
```

---

# 21. WORKER CARD — SEDANG BERJALAN

Tampilkan timeline ringkas di card:

```text
┌──────────────────────────────────────────────┐
│ WARRANTY                         ● OTW        │
│ WRN-2026-000104                              │
│                                              │
│ AC Repair                                    │
│ Budi Santoso                                 │
│                                              │
│ ✓ Ditugaskan                                 │
│ ✓ Terjadwal                                  │
│ ✓ Mulai Penanganan                           │
│ ● OTW                                        │
│ ○ Check-in                                   │
│ ○ Pemeriksaan                                │
│ ○ Diagnosis                                  │
│ ○ Hasil                                      │
│ ○ Pengerjaan                                 │
│ ○ Selesai                                    │
│                                              │
│ [Check-in di Lokasi]                         │
└──────────────────────────────────────────────┘
```

---

# 22. WORKER DETAIL — PEMERIKSAAN

Setelah check-in:

```text
Status: PEMERIKSAAN
```

Tampilkan:

```text
Customer
Service
Alamat
Warranty
Warranty Period
Current Claim
Original Order
Schedule
Check-in time
Worker
```

Aksi:

```text
[Mulai Pemeriksaan]
```

---

# 23. WORKER DIAGNOSIS FORM

Wajib ada:

```text
Temuan
Diagnosis
Kondisi
Tindakan yang Disarankan
Material
Foto / Video
Catatan Teknis
```

Contoh:

```text
Temuan:
________________________

Diagnosis:
________________________

Kondisi:
________________________

Tindakan yang Disarankan:
________________________

Material:
________________________

Foto / Video:
[+ Tambah Bukti]

Catatan Teknis:
________________________

[Kirim Hasil Diagnosis]
```

Worker tidak mendapat field:

```text
Coverage Final
Harga Final
Approve Paid Work
```

---

# 24. WORKER — MENUNGGU PROVIDER

Setelah diagnosis dikirim:

```text
┌──────────────────────────────────────────────┐
│ WARRANTY                    MENUNGGU PROVIDER│
│ WRN-2026-000103                              │
│                                              │
│ ✓ Pemeriksaan selesai                        │
│ ✓ Diagnosis dikirim                          │
│ ✓ Bukti dikirim                              │
│                                              │
│ Menunggu keputusan Provider                  │
│                                              │
│ [Lihat Hasil Diagnosis]                      │
└──────────────────────────────────────────────┘
```

Jika Provider meminta info:

```text
┌──────────────────────────────────────────────┐
│ ⚠ INFORMASI TAMBAHAN                        │
│                                              │
│ Provider meminta:                            │
│ "Tambahkan foto bagian indoor unit            │
│ dan jelaskan kondisi kipas."                 │
│                                              │
│ [Update Diagnosis]                           │
└──────────────────────────────────────────────┘
```

---

# 25. WORKER — WARRANTY REPAIR

Jika Provider memilih:

```text
✓ Setujui Perbaikan Garansi
```

Worker menerima job:

```text
WARRANTY
REPAIR
```

Card:

```text
┌──────────────────────────────────────────────┐
│ WARRANTY                         REPAIR       │
│ WRN-2026-000107                              │
│                                              │
│ AC Repair                                    │
│ Budi Santoso                                 │
│                                              │
│ Provider: PT Servio Mandiri Teknik           │
│ Jadwal: 27 Sep 2026 • 14:00 WIB              │
│                                              │
│ ✓ Provider menyetujui Warranty Repair        │
│                                              │
│ [Mulai Perbaikan]                            │
└──────────────────────────────────────────────┘
```

Saat selesai:

```text
[Upload Bukti Perbaikan]
```

Field:

```text
Summary
Notes
Foto Sebelum
Foto Sesudah
```

---

# 26. WORKER — PAID WORK

Paid Work hanya muncul setelah:

```text
Provider mengajukan proposal
↓
Customer menyetujui
↓
Order Paid Work tersedia
```

Card:

```text
┌──────────────────────────────────────────────┐
│ PAID WORK                         SIAP KERJA  │
│ WRN-2026-000107                              │
│                                              │
│ AC Repair                                    │
│ Budi Santoso                                 │
│                                              │
│ Total: Rp505.000                             │
│ ✓ Customer menyetujui                       │
│ ✓ Paid Work Order tersedia                  │
│                                              │
│ [Mulai Pengerjaan]                           │
└──────────────────────────────────────────────┘
```

Worker tidak boleh melihat status “siap kerja” jika Customer belum authorize.

---

# 27. CUSTOMER UI FINAL

Customer area:

```text
/orders
/warranties
/warranties/[warrantyId]
```

Customer menggunakan bahasa yang lebih sederhana daripada internal Worker/Provider.

Timeline Customer:

```text
Klaim Diajukan
↓
Sedang Ditinjau
↓
Teknisi Ditugaskan
↓
Jadwal Pemeriksaan
↓
Teknisi Datang
↓
Pemeriksaan
↓
Hasil Pemeriksaan
↓
Menunggu Tindak Lanjut
↓
Perbaikan
↓
Selesai
```

Jangan tampilkan:
- internal technical notes;
- private telemetry;
- private worker notes;
- internal commercial calculations yang bukan bagian proposal Customer.

---

# 28. CUSTOMER CARD — PENDING ACTIVATION

```text
┌──────────────────────────────────────────────┐
│ AC Cleaning                         GARANSI  │
│                                              │
│ MENUNGGU AKTIVASI                            │
│                                              │
│ Garansi menunggu diaktifkan oleh Provider.   │
│                                              │
│ [Ajukan Klaim Garansi] DISABLED              │
└──────────────────────────────────────────────┘
```

---

# 29. CUSTOMER CARD — ACTIVE WARRANTY

```text
┌──────────────────────────────────────────────┐
│ AC Repair                              AKTIF │
│                                              │
│ Warranty: WAR-2026-1001                      │
│ Berlaku: 24 Sep – 07 Nov 2026                │
│                                              │
│ Claim aktif: Tidak ada                       │
│                                              │
│ [Ajukan Klaim Garansi]                       │
└──────────────────────────────────────────────┘
```

CTA aktif hanya jika:
- Warranty `ACTIVE`;
- belum expired;
- tidak ada active claim.

---

# 30. CUSTOMER CARD — CLAIM BERJALAN

```text
┌──────────────────────────────────────────────┐
│ AC Repair                        KLAIM AKTIF  │
│                                              │
│ Warranty: WAR-2026-1001                      │
│ Claim: WRN-2026-000103                       │
│                                              │
│ Status: Pemeriksaan                          │
│ Worker sudah dijadwalkan.                    │
│                                              │
│ [Lihat Penanganan]                           │
└──────────────────────────────────────────────┘
```

---

# 31. CUSTOMER — PAID WORK PROPOSAL

Tampilkan dengan sangat jelas bahwa ini **bukan warranty repair gratis**.

```text
┌──────────────────────────────────────────────┐
│ PEKERJAAN BERBAYAR                           │
│                                              │
│ AC Repair                                    │
│                                              │
│ Alasan                                       │
│ Kerusakan di luar cakupan garansi            │
│                                              │
│ Pekerjaan                                    │
│ Penggantian kompresor                        │
│                                              │
│ Jasa                  Rp350.000              │
│ Material              Rp155.000              │
│ ──────────────────────────────────────────── │
│ TOTAL                 Rp505.000              │
│                                              │
│ [Tolak]          [Setujui & Lanjutkan]       │
└──────────────────────────────────────────────┘
```

Customer adalah satu-satunya pihak yang menentukan authorization paid work.

---

# 32. CUSTOMER — PAID WORK DITOLAK

Setelah Customer memilih:

```text
[Tolak]
```

tampilkan:

```text
Pekerjaan berbayar tidak dilanjutkan.
```

Jangan:
- membuat Worker job;
- membuat paid order baru;
- membuat Worker melakukan pekerjaan;
- mengubah original completed order.

Status paid-work outcome harus dipisahkan dari Provider claim rejection.

---

# 33. CUSTOMER — PAID WORK APPROVED

Setelah:

```text
[Setujui & Lanjutkan]
```

flow:

```text
Customer Approve
↓
Paid Work Order dibuat
↓
Payment process sesuai engine existing
↓
Worker menerima PAID WORK
↓
Pengerjaan
↓
Selesai
```

---

# 34. CARD DATA CONTRACT — PROVIDER

Setiap Provider Warranty Case Card minimal memiliki:

```text
badgeType
warrantyId
claimId
serviceName
customerName
workerName
originalOrderId
scheduleDate
scheduleTime
location
currentStage
displayStatus
problemSummary
lastUpdatedAt
primaryAction
secondaryAction
```

Detail page memiliki tambahan:

```text
providerName
originalWorkerName
currentWarrantyWorkerName
warrantyStart
warrantyEnd
claimHistory
diagnosis
evidence
decision
paidWorkProposal
completionProof
auditHistory
```

---

# 35. CARD DATA CONTRACT — WORKER

Minimal:

```text
badgeType
claimId / warrantyId
serviceName
customerName
providerName
address
scheduleDate
scheduleTime
distanceOrTravelInfo (jika engine tracking existing menyediakan)
currentStage
displayStatus
problemSummary
nextAction
```

Detail:

```text
warranty
claim
originalOrder
schedule
checkIn
diagnosis
evidence
providerRequest
repairInstruction
completionProof
paidWork
```

---

# 36. CARD DATA CONTRACT — CUSTOMER

Minimal:

```text
warrantyId
serviceName
warrantyPeriod
warrantyStatus
claimStatus
claimSummary
schedule
displayStage
nextCustomerAction
```

Paid Work Proposal:

```text
proposalId
claimId
serviceName
reason
scope
lineItems
subtotal
fees
total
proposalStatus
customerAction
```

---

# 37. STATE & UI GROUPING

UI tab adalah grouping. Jangan mengganti domain state hanya karena nama tab berubah.

Gunakan mapping konseptual:

## Provider — Perlu Tindakan

```text
SUBMITTED
diagnosis submitted / waiting provider decision
completion proof waiting review
other provider-action-required states
```

## Provider — Sudah Ditindak

```text
accepted + worker assigned
scheduled future
```

## Provider — Sedang Berjalan

```text
inspection in progress
OTW/check-in
inspection
diagnosis in progress
```

## Provider — Hasil

```text
diagnosis submitted
WAITING_PROVIDER_DECISION
```

## Provider — Pengerjaan

```text
REPAIR_APPROVED
REPAIR_SCHEDULED
REPAIR_IN_PROGRESS
paid work authorized and executing
```

## Provider — Menunggu Pembayaran / Customer

```text
proposal sent
awaiting customer authorization
```

## Provider — Selesai

```text
RESOLVED
REJECTED
DISPUTED
paid-work rejected outcome
```

**Jangan menghapus canonical domain status hanya untuk membuat UI lebih sederhana.**

---

# 38. WARRANT STATUS

Pertahankan:

```text
PENDING_ACTIVATION
ACTIVE
EXPIRED
```

Rules:

### PENDING_ACTIVATION

- belum boleh claim;
- Customer melihat `MENUNGGU AKTIVASI`;
- Provider dapat mengaktifkan jika eligible.

### ACTIVE

- Customer dapat claim bila:
  - belum expired;
  - tidak ada active claim.

### EXPIRED

- tidak dapat membuat claim baru.

### Boundary

Claim yang valid dan dibuat sebelum expiry boleh tetap diproses sampai selesai sesuai domain rule. Jangan membatalkan claim valid hanya karena Warranty kemudian masuk expiry.

---

# 39. CLAIM RULE

Pertahankan rule:

```text
Satu Warranty
→ dapat memiliki beberapa claim sequential
→ hanya satu active claim pada satu waktu
```

Resolving satu claim:

```text
Claim = RESOLVED
Warranty = tetap ACTIVE
```

Warranty hanya menjadi EXPIRED berdasarkan periodenya.

---

# 40. ASSIGNMENT RULE

Bedakan:

```text
Assignment Type = INSPECTION
```

dan:

```text
Assignment Type = REPAIR
```

Jangan memakai assignment yang sama untuk mengaburkan pekerjaan.

Inspection:

```text
Provider assign
→ Worker inspect
→ Diagnosis
```

Repair:

```text
Provider approve
→ Repair schedule
→ Worker repair
→ Completion proof
```

---

# 41. SCHEDULE RULE

Provider, Worker, dan Customer harus melihat schedule yang sama.

Contoh fixture:

```text
26 Sep 2026
10:00 WIB
```

Jika reschedule:

```text
Old:
26 Sep 2026 • 10:00

New:
27 Sep 2026 • 14:00
```

dan simpan:

```text
rescheduledFromId
```

Jangan membuat schedule berbeda di setiap role.

---

# 42. TRACKING RULE

Gunakan Worker Tracking/Radar existing bila tersedia.

Tracking bukan Warranty Status.

Tracking bukan Order Status.

Tracking juga bukan Worker Capability.

Stopping tracking tidak boleh otomatis:
- cancel Warranty;
- cancel Claim;
- cancel Order;
- revoke assignment;
- mengubah paid-work authorization.

---

# 43. NOTIFICATION

Gunakan notification engine existing.

Minimal event yang perlu memicu notification sesuai engine yang ada:

```text
Customer submit claim
Provider menerima claim
Provider assign Worker
Schedule dibuat
Schedule diubah
Worker mulai penanganan
Worker check-in
Diagnosis submitted
Provider request more info
Provider approve Warranty Repair
Paid Work proposal sent
Customer approve paid work
Customer reject paid work
Repair completion submitted
Claim resolved
Claim rejected
```

Jangan membuat notification engine baru bila existing engine dapat digunakan.

---

# 44. DISPUTE

Jika Customer tidak setuju dengan keputusan Provider yang memang merupakan claim rejection sesuai domain, gunakan Dispute/Escalation engine yang sudah ada.

Jangan membuat duplicate dispute engine.

Jangan mengubah paid-work rejection menjadi claim rejection.

---

# 45. FINANCE

Finance hanya menangani konsekuensi finansial melalui engine existing:
- refund;
- compensation;
- adjustment;
- paid-work settlement.

Jangan membuat `WarrantyFinanceEngine` baru jika engine existing sudah tersedia.

---

# 46. UNIFIED DUMMY FIXTURE GRAPH

Semua dummy harus berasal dari satu linked graph.

Jangan membuat array UI yang berdiri sendiri untuk setiap card.

Contoh aktor:

```text
Provider:
PT Servio Mandiri Teknik

Customer:
Budi Santoso

Worker:
Andi Pratama
```

Services:

```text
AC Cleaning       → 30 hari
AC Repair         → 45 hari
AC Installation   → 60 hari
Electrical Repair → 30 hari
```

Warranty Store:

```text
ACTIVE
```

Duration options:

```text
30 / 45 / 60
```

---

# 47. DUMMY FIXTURE — REQUIRED CASES

Fixture harus mencakup minimal:

### Pending Activation

```text
#ORD-W-1001
Customer: Budi Santoso
Worker: Andi Pratama
Service: AC Repair
Completed: 24 Sep 2026
Warranty snapshot: 45 hari
State: BELUM DIBERI GARANSI
Action: [Berikan/Aktifkan Garansi]
```

### Active Warranty

```text
WAR-2026-1001
24 Sep – 07 Nov 2026
Claim count: 1
```

### Expired History

```text
WAR-2026-0990
01 Aug – 30 Aug 2026
```

### Claim A

```text
WRN-2026-000101
SUBMITTED
3 photos
```

### Claim B

```text
WRN-2026-000102
INSPECTION_SCHEDULED
26 Sep 2026 • 10:00 WIB
```

### Claim C

```text
WRN-2026-000103
WAITING_PROVIDER_DECISION
Diagnosis submitted
```

### Claim D

```text
WRN-2026-000104
REPAIR_IN_PROGRESS
```

### Claim E

```text
WRN-2026-000100
RESOLVED
Warranty remains ACTIVE
```

### Menunggu Provider

```text
WRN-2026-000105
Diagnosis submitted
Waiting Provider
```

### Paid Work Proposal

```text
WRN-2026-000106
NOT COVERED
Worker recommendation
Provider proposal
Total ≈ Rp505.000
PROPOSAL_SENT
```

### Paid Work Approved

```text
WRN-2026-000107
CUSTOMER_APPROVED
Linked order: #ORD-PW-2001
Original order: #ORD-W-1007
Original order immutable
Worker job: PAID WORK
```

### Paid Work Rejected

```text
WRN-2026-000108
CUSTOMER_REJECTED
No Worker execution
```

### Sequential Claims

```text
WAR-2026-1010
Claim #1 = RESOLVED
Claim #2 = SUBMITTED
```

### Reschedule

```text
old: 26 Sep 2026 • 10:00
new: 27 Sep 2026 • 14:00
rescheduledFromId present
```

---

# 48. DIAGNOSIS DUMMY DATA

Diagnosis fixture minimal:

```text
Findings
Diagnosis
Condition
Recommended Action
Material
Photo 1
Photo 2
Technical Notes
```

Buat satu linked case yang benar-benar dapat dibuka dari:

```text
Provider
→ Hasil
→ Detail
→ Diagnosis
```

dan:

```text
Worker
→ Menunggu Provider
→ Detail
→ Diagnosis
```

---

# 49. MANDATORY SHARED STATE BEHAVIOR

Semua role wajib membaca/memutasi shared domain repository/fixture.

Jangan:

```text
Provider page → local state A
Worker page   → local state B
Customer page → local state C
```

yang menyebabkan state tidak sinkron.

Harus:

```text
Shared Warranty Domain
        ↓
Provider UI
Worker UI
Customer UI
```

Contoh:

```text
Provider Assign Worker
↓
Shared state updated
↓
Worker page otomatis melihat task
```

Contoh:

```text
Worker Submit Diagnosis
↓
Shared state updated
↓
Provider tab "Hasil" menampilkan case
```

Contoh:

```text
Provider Paid Work Proposal
↓
Shared state updated
↓
Customer melihat proposal
```

Contoh:

```text
Customer Approve
↓
Shared state updated
↓
Paid Work Order tersedia
↓
Worker melihat PAID WORK
```

---

# 50. IMPLEMENTATION STRATEGY

Implementasi harus dilakukan **bertahap**, jangan mengerjakan seluruh Warranty V1 dalam satu giant change.

Urutan:

```text
PHASE 0 — Audit Existing Code
        ↓
PHASE 1 — Domain / Shared Model / Fixtures
        ↓
PHASE 2 — Provider Warranty Store
        ↓
PHASE 3 — Provider Pengajuan + Cards + Detail + Decision
        ↓
PHASE 4 — Worker Workflow
        ↓
PHASE 5 — Customer Workflow
        ↓
PHASE 6 — Cross-role Integration
        ↓
PHASE 7 — Test & Browser Verification
        ↓
PHASE 8 — Final Audit / Lock
```

Setiap phase:
1. inspect existing code terlebih dahulu;
2. implement hanya scope phase tersebut;
3. jalankan test/typecheck yang relevan;
4. jangan merusak fitur existing;
5. laporkan file yang diubah;
6. laporkan command yang dijalankan;
7. laporkan pass/fail;
8. jangan menyatakan final sebelum Phase 7–8 selesai.

---

# 51. PHASE 0 — AUDIT EXISTING CODE

## Prompt untuk coding agent

```text
PHASE 0 — WARRANTY V1 EXISTING CODE AUDIT

Tujuan:
Pahami implementasi existing sebelum mengubah kode.

Jangan langsung melakukan rewrite.

Audit:
1. navigation.ts
2. Provider Warranty page
3. Provider services page
4. ServiceCard.tsx
5. Provider warranty requests jika sudah ada
6. Worker warranty page
7. Customer warranties pages
8. domainRepository.ts
9. mocks/warranties.ts
10. warranty types/models/state machine
11. existing tests
12. notification/dispute/payment/order engine terkait

Cari:
- existing routes;
- existing components;
- existing repository methods;
- existing domain statuses;
- existing fixtures;
- existing test names;
- duplicate implementations;
- legacy UI tabs;
- hardcoded warranty durations;
- isolated dummy arrays;
- existing paid-work/order relation;
- existing schedule/tracking integration.

Output sebelum coding:
- file yang sudah ada;
- file yang akan MODIFY;
- file yang perlu NEW;
- file yang tidak boleh disentuh;
- potensi conflict;
- test suite yang relevan.

Jangan mengubah CEO/Admin/Operations.

Setelah audit, implement hanya jika struktur existing sudah dipahami.
```

### Gate Phase 0

Tidak boleh lanjut jika:
- route existing belum ditemukan;
- model/repository existing belum dipahami;
- ada dua state machine berbeda yang belum direkonsiliasi;
- test existing belum ditemukan.

---

# 52. PHASE 1 — SHARED DOMAIN + FIXTURE

## Prompt untuk coding agent

```text
PHASE 1 — WARRANTY V1 SHARED DOMAIN AND UNIFIED FIXTURE

Implement shared Warranty V1 data layer terlebih dahulu.

Pertahankan canonical domain dan business invariant.

Wajib:
1. One Active Claim Rule.
2. Expiry Boundary.
3. Original Order Immutability.
4. Exclusive Provider Commercial Ownership.
5. Customer sole paid-work authorization.
6. Idempotent operations.
7. Separate inspection vs repair assignment.
8. Separate original order vs paid-work order.
9. Shared schedule.
10. Worker ID alias support bila memang dibutuhkan oleh existing test/fixture.

Perbaiki/extend:
- domainRepository.ts
- mocks/warranties.ts
- existing warranty types/models

Build one unified fixture graph.

Semua required fixture cases harus saling terhubung.

Jangan membuat UI baru di phase ini kecuali type/interface yang diperlukan.

Tambahkan/repair mutation methods:
- providerReviewWarrantyClaim()
- providerAssignWarrantyWorker()
- providerScheduleWarrantyInspection()
- workerStartWarrantyHandling()
- workerCheckInWarranty()
- workerSubmitWarrantyDiagnosis()
- providerApproveWarrantyRepair()
- providerRequestMoreWarrantyInfo()
- providerCreatePaidWorkProposal()
- customerApprovePaidWork()
- customerRejectPaidWork()
- workerSubmitWarrantyCompletion()
- providerResolveWarrantyClaim()

Gunakan existing repository naming/pattern jika method equivalent sudah tersedia.
Jangan membuat duplicate method hanya karena nama berbeda.

Paid work:
- approval membuat linked paid work order/context;
- original completed order tetap immutable.

Request More Info:
- simpan request note;
- tandai infoRequested;
- Worker dapat update diagnosis;
- Provider dapat review kembali.

Jalankan:
npx tsc --noEmit
npx tsx --test tests/warranty-v1.test.ts

Jangan lanjut jika typecheck atau warranty tests gagal.
```

---

# 53. PHASE 2 — PROVIDER WARRANTY STORE

## Prompt untuk coding agent

```text
PHASE 2 — PROVIDER WARRANTY STORE UI

Implement route:
 /provider/warranty

Fokus:
Store status + duration configuration + service configuration + pending activation.

Wajib tampil:
1. Warranty Store status.
2. Activate/deactivate action.
3. Active duration list.
4. Add duration.
5. Archive duration.
6. Service warranty configuration.
7. Pending activation list.
8. Operation Center banner.

Service:
AC Cleaning → 30
AC Repair → 45
AC Installation → 60
Electrical Repair → 30

Durasi harus berasal dari ProviderWarrantyDuration.
Jangan hardcode dropdown choices di ServiceCard/page.

Tambahkan:
- ServiceCard badge `✓ Garansi Tersedia`;
- Tambah Layanan warranty selector;
- Edit Layanan warranty selector.

Jika Store OFF:
- tampilkan disabled/informative state;
- jangan membuat service configuration seolah aktif.

Pending activation:
- tampilkan order eligible;
- action mengaktifkan Warranty;
- setelah activated, Customer harus melihat ACTIVE warranty dari shared data.

Jangan mengerjakan claim operation center pada phase ini.

Jalankan:
npx tsc --noEmit
npx tsx --test tests/warranty-v1.test.ts

Report:
- file changed;
- UI behavior;
- commands;
- exit codes;
- blockers.
```

---

# 54. PHASE 3 — PROVIDER PENGAJUAN + CARD FLOW

## Prompt untuk coding agent

```text
PHASE 3 — PROVIDER WARRANTY REQUEST OPERATION CENTER

Route:
 /provider/warranty/requests

Replace legacy confusing request tab structure with:

[Perlu Tindakan]
[Sudah Ditindak]
[Sedang Berjalan]
[Hasil]
[Pengerjaan]
[Menunggu Pembayaran]
[Selesai]

Important:
These are UI groupings only.
Do not delete canonical domain statuses.

Implement:
1. case cards;
2. case filtering;
3. case detail;
4. 10-step visual timeline/stepper;
5. initial review;
6. assignment;
7. scheduling;
8. diagnosis view;
9. 3-button provider decision;
10. warranty repair flow;
11. paid work proposal flow;
12. request-more-info flow;
13. completion proof review;
14. resolved history.

Every fixture state must have a visible card.

No disconnected fake cards.

Card must read shared fixture/domain state.

Card fields:
- badge;
- warranty ID;
- service;
- customer;
- worker;
- original order;
- schedule;
- status/stage;
- summary;
- last updated;
- CTA.

Detail structure:
Header → Warranty → Customer → Order → Worker → Schedule → Stepper → Timeline → Diagnosis → Decision → Repair/Paid Work → Completion → History.

3-button decision:
[✓ Setujui Perbaikan Garansi]
[Rp Ajukan Pekerjaan Berbayar]
[↻ Minta Informasi Tambahan]

DO NOT add:
[ Tidak Dikerjakan ]
[ Tidak Termasuk Garansi ]
[ Tutup Karena Tidak Garansi ]

Paid Work:
Provider fills commercial proposal:
- title;
- scope;
- line items;
- materials;
- services;
- fees;
- total;
- reason outside warranty.

Send to Customer.

Covered:
- set COVERED;
- create REPAIR assignment;
- schedule;
- Worker executes;
- Worker completion;
- Provider reviews;
- Claim RESOLVED;
- Warranty remains ACTIVE until expiry.

More Info:
- Provider enters request;
- Worker updates;
- submit again;
- Provider sees updated result.

Initial review:
[Terima untuk Pemeriksaan]
[Tolak Klaim]
Rejection requires reason.

Test all 11 fixture states visually and behaviorally.
```

---

# 55. PHASE 4 — WORKER

## Prompt untuk coding agent

```text
PHASE 4 — WORKER WARRANTY EXECUTION UI

Route:
 /worker/warranty

Top tabs:
[Tugas Garansi]
[Riwayat Garansi]

Filters:
[Mendatang]
[Hari Ini]
[Sedang Berjalan]
[Menunggu Provider]
[Selesai]

Every card:
- WARRANTY or PAID WORK badge;
- Warranty/Claim ID;
- Service;
- Customer;
- Provider;
- schedule;
- location;
- stage;
- next action.

Workflow:
Ditugaskan
→ Terjadwal
→ Mendatang
→ Mulai Penanganan
→ OTW
→ Check-in
→ Pemeriksaan
→ Diagnosis
→ Menunggu Provider
→ Repair
→ Selesai

Rules:
- future scheduled job cannot be started prematurely;
- Start Handling creates OTW;
- Check-in moves into inspection;
- Worker diagnosis cannot decide final coverage;
- Worker diagnosis cannot set final price;
- Worker cannot create commercial paid-work approval.

Diagnosis:
- Findings;
- Diagnosis;
- Condition;
- Recommended Action;
- Material;
- Photo/Video;
- Technical Notes.

More Info:
show Provider request note;
allow diagnosis update;
submit updated diagnosis.

Warranty Repair:
only after Provider approves.
Worker receives REPAIR assignment.
Upload before/after evidence.

Paid Work:
only after Customer approval and linked paid order exists.
Show prominent PAID WORK badge.
Do not expose as executable job before authorization.

Use shared repository state.
Do not isolate Worker state in page-local fake arrays.

Run:
npx tsc --noEmit
npx tsx --test tests/warranty-v1.test.ts
```

---

# 56. PHASE 5 — CUSTOMER

## Prompt untuk coding agent

```text
PHASE 5 — CUSTOMER WARRANTY EXPERIENCE

Routes:
 /orders
 /warranties
 /warranties/[warrantyId]

Implement:
1. Pending Activation card.
2. Active Warranty card.
3. Claim CTA eligibility.
4. Claim-in-progress card.
5. Customer-safe timeline.
6. Paid Work proposal card/detail.
7. Approve Paid Work.
8. Reject Paid Work.
9. Completed/expired history.

Pending:
show MENUNGGU AKTIVASI.
Disable claim CTA.

Active:
show warranty period.
Claim CTA only if:
- status ACTIVE;
- not expired;
- no active claim.

Customer timeline:
Klaim Diajukan
→ Sedang Ditinjau
→ Teknisi Ditugaskan
→ Jadwal Pemeriksaan
→ Teknisi Datang
→ Pemeriksaan
→ Hasil Pemeriksaan
→ Menunggu Tindak Lanjut
→ Perbaikan
→ Selesai

Never expose:
- private technical notes;
- raw Worker telemetry;
- internal Provider notes;
- hidden audit information not intended for Customer.

Paid Work:
show:
- reason;
- scope;
- line items;
- materials;
- service fees;
- total;
- approval status.

Buttons:
[Tolak]
[Setujui & Lanjutkan]

Reject:
- no paid worker execution;
- no paid order;
- do not mutate original order.

Approve:
- create linked paid work order;
- use existing order/payment engine;
- Worker receives PAID WORK;
- Customer sees next execution stage.

Run:
npx tsc --noEmit
npx tsx --test tests/warranty-v1.test.ts
```

---

# 57. PHASE 6 — CROSS-ROLE INTEGRATION

## Prompt untuk coding agent

```text
PHASE 6 — CROSS ROLE STATE SYNCHRONIZATION

Now verify real cross-role flow using shared domain.

Test these sequences:

A. Grant Warranty
Provider:
Pending Activation → Aktifkan Warranty
↓
Customer:
Warranty becomes ACTIVE

B. Assign Worker
Provider:
Claim → Assign Worker → Schedule
↓
Worker:
Task appears in Mendatang

C. Start
Worker:
Mulai Penanganan → OTW → Check-in
↓
Provider:
case moves to Sedang Berjalan

D. Diagnosis
Worker:
Submit Diagnosis
↓
Provider:
case moves to Hasil / decision area
3 buttons appear

E. Covered Repair
Provider:
Approve Warranty Repair
↓
Worker:
REPAIR assignment appears
↓
Worker:
completion proof
↓
Provider:
review completion
↓
Claim:
RESOLVED
Warranty:
remains ACTIVE

F. Paid Work
Provider:
Paid Work Proposal
↓
Customer:
Proposal visible
↓
Customer:
Approve
↓
Shared domain:
Paid Work Order created
↓
Worker:
PAID WORK appears
↓
Worker:
execute
↓
completion

G. Paid Work Rejected
Customer:
Reject
↓
Worker:
must NOT receive executable PAID WORK
↓
Original Order:
unchanged

H. More Info
Provider:
Request More Info
↓
Worker:
sees request
↓
Worker:
updates diagnosis
↓
Provider:
can review again

I. Reschedule
Provider:
26 Sep 10:00 → 27 Sep 14:00
↓
Worker + Customer:
see 27 Sep 14:00
```

---

# 58. PHASE 7 — TEST + BROWSER VERIFICATION

## Mandatory execution

Coding agent **WAJIB menjalankan command**, bukan hanya menyatakan command sebagai rencana.

```powershell
npx tsc --noEmit

npx tsx --test tests/warranty-v1.test.ts

npx tsx --test tests/*.test.ts
```

Jika project memiliki correction test terpisah:

```powershell
npx tsx --test tests/warranty-v1-correction.test.ts
```

Jika correction tests sudah digabung ke `warranty-v1.test.ts`, jangan menjalankan path yang tidak ada.

## Wajib dilaporkan

Untuk setiap command:

```text
COMMAND:
EXIT CODE:
PASS/FAIL:
SUMMARY:
```

Jangan pernah menyatakan `PASS` tanpa command benar-benar dijalankan.

---

# 59. BROWSER VERIFICATION

## Provider

### `/provider/services`

Cek:
- `✓ Garansi Tersedia`;
- Tambah Layanan;
- Edit Layanan;
- Warranty duration dropdown;
- duration berasal dari configuration.

### `/provider/warranty`

Cek:
- Warranty Store toggle;
- durations;
- service configurations;
- pending activation;
- activation action;
- Operation Center link.

### `/provider/warranty/requests`

Cek semua:

```text
Perlu Tindakan
Sudah Ditindak
Sedang Berjalan
Hasil
Pengerjaan
Menunggu Pembayaran
Selesai
```

Cek:
- cards;
- card data;
- filters;
- detail;
- stepper;
- timeline;
- initial review;
- assign Worker;
- schedule;
- diagnosis;
- 3 decision buttons;
- request more info;
- paid proposal;
- repair;
- completion;
- resolved.

---

# 60. BROWSER VERIFICATION — WORKER

Route:

```text
/worker/warranty
```

Cek:

```text
Tugas Garansi
Riwayat Garansi

Mendatang
Hari Ini
Sedang Berjalan
Menunggu Provider
Selesai
```

Cek:

- Warranty badge;
- Paid Work badge;
- schedule;
- Mulai Penanganan;
- OTW;
- Check-in;
- diagnosis;
- evidence;
- request more info;
- Warranty Repair;
- Paid Work;
- completion proof.

---

# 61. BROWSER VERIFICATION — CUSTOMER

Routes:

```text
/orders
/warranties
/warranties/[warrantyId]
```

Cek:

- Pending Activation;
- Active;
- expired history;
- claim eligibility;
- claim submission;
- timeline;
- schedule;
- diagnosis/result customer-safe;
- paid-work proposal;
- approve;
- reject.

---

# 62. CROSS ROLE PROOF

Jangan hanya membuka halaman secara terpisah.

Buktikan flow berikut:

```text
Provider Grant
→ Customer Active

Provider Assign Worker
→ Worker Mendatang

Provider Schedule
→ Worker + Customer same date/time

Worker Start
→ Provider case changes

Worker Check-in
→ Provider sees current stage

Worker Diagnosis
→ Provider gets diagnosis + 3 decision buttons

Provider Approve Warranty Repair
→ Worker gets REPAIR task

Provider Paid Work Proposal
→ Customer gets proposal

Customer Approve
→ Paid Work Order exists
→ Worker gets PAID WORK

Customer Reject
→ no Worker paid-work execution
```

---

# 63. FINAL TEST MATRIX

Minimal manual verification:

| Scenario | Provider | Worker | Customer | Expected |
|---|---|---|---|---|
| Pending Activation | sees eligible order | - | sees pending | claim disabled |
| Warranty Activated | activation success | - | becomes ACTIVE | period shown |
| New Claim | sees Perlu Tindakan | - | claim submitted | linked case |
| Assign Worker | assign success | Mendatang | worker assigned status | same worker |
| Schedule | schedule shown | schedule shown | schedule shown | same datetime |
| Start | case updates | OTW | safe timeline updates | synced |
| Check-in | current stage updates | inspection | Teknisi Datang/Pemeriksaan | synced |
| Diagnosis | result appears | submitted | customer-safe result | synced |
| Covered | approve repair | REPAIR job | repair stage | no payment |
| Paid Proposal | proposal sent | waiting | proposal appears | no execution yet |
| Paid Approved | paid work authorized | PAID WORK | payment/status | new order |
| Paid Rejected | proposal closed | no execution | rejected | no paid order |
| More Info | request | update diagnosis | safe waiting state | resubmission |
| Completion | provider review | proof uploaded | completed timeline | resolved |
| Expired | history | - | expired | no new claim |

---

# 64. FINAL SECURITY / RBAC CHECK

Authorization harus ditegakkan server-side / repository-side.

Jangan mengandalkan frontend hide/show saja.

Wajib diuji:

```text
Customer cannot mutate Provider actions
Worker cannot decide coverage
Worker cannot set final price
Worker cannot authorize paid work
Provider cannot mutate another tenant
Customer cannot mutate original order
Paid work cannot execute before Customer authorization
```

---

# 65. FINAL REGRESSION

Sebelum status final:

```powershell
npx tsc --noEmit
npx tsx --test tests/warranty-v1.test.ts
npx tsx --test tests/*.test.ts
```

Jika correction test terpisah dan memang ada:

```powershell
npx tsx --test tests/warranty-v1-correction.test.ts
```

Expected:
- type errors = 0;
- Warranty test = PASS;
- full regression = PASS;
- no unrelated regression.

Jika browser verification gagal, status:

```text
NOT READY — WARRANTY V1 BLOCKED
```

Bukan:

```text
READY FOR WARRANTY V1 FINAL LOCK
```

---

# 66. FINAL AUDIT CHECKLIST

## Business

- [ ] Warranty Store terpisah dari Pengajuan Garansi
- [ ] Provider, Worker, Customer boundaries benar
- [ ] 3 decision Provider tepat
- [ ] Tidak ada tombol “Tidak Dikerjakan” Provider
- [ ] Customer menjadi authorization paid work
- [ ] Paid Work adalah order baru
- [ ] Original completed order immutable
- [ ] Sequential claims didukung
- [ ] One Active Claim Rule terjaga
- [ ] Expiry boundary terjaga

## Provider

- [ ] Garansi page
- [ ] Warranty Store
- [ ] duration
- [ ] service configuration
- [ ] pending activation
- [ ] Pengajuan Garansi
- [ ] 7 UI groupings
- [ ] case cards
- [ ] detail
- [ ] stepper
- [ ] diagnosis
- [ ] 3 decision buttons
- [ ] repair
- [ ] paid proposal
- [ ] completion
- [ ] resolved

## Worker

- [ ] Tugas Garansi
- [ ] Riwayat Garansi
- [ ] Mendatang
- [ ] Hari Ini
- [ ] Sedang Berjalan
- [ ] Menunggu Provider
- [ ] Selesai
- [ ] WARRANTY badge
- [ ] PAID WORK badge
- [ ] Start Handling
- [ ] OTW
- [ ] Check-in
- [ ] Inspection
- [ ] Diagnosis
- [ ] More Info
- [ ] Repair
- [ ] Completion

## Customer

- [ ] Pending Activation
- [ ] Active
- [ ] Expired/history
- [ ] Claim CTA eligibility
- [ ] Customer-safe timeline
- [ ] Schedule
- [ ] Paid Work Proposal
- [ ] Approve
- [ ] Reject
- [ ] No raw internal telemetry

## Shared

- [ ] Shared repository
- [ ] Shared fixtures
- [ ] Shared schedule
- [ ] Cross-role state transition
- [ ] Paid work linkage
- [ ] Original order immutability
- [ ] Idempotency
- [ ] RBAC
- [ ] tenant isolation

## Verification

- [ ] `npx tsc --noEmit`
- [ ] Warranty test
- [ ] Full regression
- [ ] Browser Provider
- [ ] Browser Worker
- [ ] Browser Customer
- [ ] Cross-role flow
- [ ] Fixture visual proof
- [ ] No unverified PASS claim

---

# 67. FINAL DEFINITION OF DONE

Warranty V1 hanya boleh dianggap selesai ketika seluruh kondisi berikut terpenuhi:

```text
Provider
  ↓
Customer Claim
  ↓
Provider Review
  ↓
Worker Assignment
  ↓
Schedule
  ↓
Worker Start
  ↓
OTW
  ↓
Check-in
  ↓
Inspection
  ↓
Diagnosis
  ↓
Provider Decision
  ├── Warranty Repair
  │     ↓
  │   Completion
  │     ↓
  │   Resolved
  │
  ├── Paid Work
  │     ↓
  │   Customer Approve / Reject
  │     ├── Reject → stop
  │     └── Approve → Pay → Paid Work → Complete
  │
  └── More Info
        ↓
      Worker Update
        ↓
      Provider Review
```

Dan secara UI:

```text
PROVIDER
Garansi
Pengajuan Garansi
  ├─ Perlu Tindakan
  ├─ Sudah Ditindak
  ├─ Sedang Berjalan
  ├─ Hasil
  ├─ Pengerjaan
  ├─ Menunggu Pembayaran
  └─ Selesai

WORKER
Garansi
  ├─ Mendatang
  ├─ Hari Ini
  ├─ Sedang Berjalan
  ├─ Menunggu Provider
  └─ Selesai

CUSTOMER
Pesanan
Garansi
  ├─ Pending Activation
  ├─ Active
  ├─ Claim
  ├─ Paid Work Proposal
  ├─ Completed
  └─ Expired History
```

### Final status

Gunakan hanya salah satu:

```text
READY FOR WARRANTY V1 FINAL LOCK
```

atau:

```text
NOT READY — WARRANTY V1 BLOCKED
```

**Jangan pernah menggunakan `READY FOR FINAL LOCK` hanya berdasarkan passing test. Browser verification dan cross-role verification wajib ada.**

---

# END OF LOCKED WARRANTY V1 SPEC
