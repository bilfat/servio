# SERVIO — PHASE 05B ORDER JASA
## PLANNING V2 — BUSINESS FLOW, UI/UX, STATUS, FINANCE, OPERASIONAL & ACCEPTANCE CRITERIA

**Status:** **BUSINESS BASELINE V2 — LOCKED untuk keputusan yang telah di-ACC dalam brainstorming 28 Oktober 2026**. **Bukan** klaim bahwa backend/Finance 05B sudah diimplementasikan atau semua kontrak lintas service telah tersedia. Pengecualian yang belum ditetapkan pengguna diberi label **OPERASIONAL DEFAULT / PERLU VALIDASI**.

**Domain:** Phase 05 — Order; Subdomain 05B — Order Jasa  
**Basis revisi:** `PHASE-05B-ORDER-JASA- PLAN.md` (baseline awal; sebelumnya mencantumkan `FINAL LOCK`, provider review wajib, pembayaran sebelum execution, dan MongoDB Local).  
**Integrasi:** Phase 01 Identity/Buku Alamat; Phase 04 Service Offering; Phase 06 Pembayaran & Dana Pesanan / S-Pay; Phase 07 After-Sales; Phase 03/05A untuk sparepart SERVIO; Notification dan penanganan masalah menurut pembagian domain.  
**Tahap berikutnya:** Technical Specification dan kontrak lintas-service → backend 05B + perluasan backend Finance 06 → frontend 05B & Finance 06 → end-to-end acceptance.  
**Arsitektur:** domain-oriented microservices; implementasi aktual 05A/06 menggunakan Laravel, MySQL, dan Next.js. Pilihan persistence 05B harus diverifikasi terhadap repository sebelum technical spec (baseline awal menulis MongoDB; **jangan diam-diam menyamakan dokumen lama dengan kode terbaru**).

> **Pernyataan scope lock:** Dokumen ini mengunci **alur bisnis/UI yang disepakati**, bukan endpoint, skema SQL, role code final, atau ketersediaan fitur pada source. Dalam fase technical spec, kekurangan kontrak Finance/Identity/Phase 04 adalah dependency implementasi yang wajib diselesaikan, bukan boleh di-bypass dengan data palsu.

---

# 00. RINGKASAN EKSEKUTIF DAN REKONSILIASI KEPUTUSAN

## 00.1 Keputusan inti yang menggantikan planning lama

1. **Semua pemesanan jasa menjalani pemeriksaan/diagnosis Worker terlebih dahulu** pada layanan yang dipesan; **biaya diagnosis dapat Rp0** sesuai konfigurasi resmi Phase 04.
2. Jika diagnosis berbayar, Customer membayar **biaya diagnosis murni pada booking**, **tanpa biaya kebijakan platform CEO** pada tagihan diagnosis. Kewajiban pajak yang diwajibkan hukum tetap harus ditangani Finance secara sah, bukan ditentukan bebas oleh 05B.
3. **Dua kesempatan pembayaran untuk Order Jasa yang dilanjutkan:** (a) diagnosis saat booking, (b) pengerjaan **SETELAH Worker selesai mengerjakan**. Tidak pernah menagih diagnosis yang sama dua kali. Satu Order Jasa dapat memiliki dua transaksi pembayaran yang berbeda tujuan.
4. Setelah diagnosis, layar Customer bernama **Hasil Pemeriksaan & Rincian Biaya**, bukan 'Proposal' sebagai istilah UI utama. Worker mencatat foto/temuan, tindakan, sparepart, harga jasa, dan rincian yang akan disetujui.
5. **Customer berada di lokasi:** Worker boleh **mencatat persetujuan lisan Customer** dari aplikasi Worker. Ini **catatan persetujuan oleh Worker**, bukan login/aksi Customer. Customer tetap diberi akses melihat versi rincian dan tombol melaporkan ketidaksesuaian/persetujuan yang tidak pernah diberikan. **Customer tidak di lokasi:** Customer memberi persetujuan/penolakan dari akun sendiri, dengan batas respons **30 menit** sejak hasil valid disediakan kepada Customer. Tidak ada auto-approval.
6. **Customer setuju → Worker langsung boleh mengerjakan**, tanpa menunggu pembayaran pengerjaan terlebih dahulu. Harga final tidak boleh diganti sepihak setelah persetujuan.
7. **Provider tidak memiliki langkah ACC harga per Order**. Koordinasi Worker–Provider bisa dilakukan lewat WhatsApp; nilai final, versi rincian, actor, dan bukti persetujuan **wajib tercatat dalam SERVIO**. Provider memantau di detail Order; WhatsApp bukan sumber nilai tagihan.
8. Worker wajib unggah **foto sebelum** (boleh reuse foto diagnosis), **foto sesudah**, ringkasan, hasil pekerjaan/pengujian, dan waktu selesai.
9. Setelah Worker FINISHED, **Finance 06 membuat tagihan pengerjaan QRIS/VA mock dengan batas 6 jam**. Status tetap `PENDING` sampai diverifikasi `PAID`, termasuk melalui **tombol simulasi existing Finance Ops** di lingkungan demo. Istilah UI: **Tagihan**, **Belum Dibayar**, **Sudah Dibayar**; istilah internal Finance/Payment Intent tetap sah pada technical spec dan **tidak dihapus dari backend existing**.
10. **Normalnya Worker tetap berada di lokasi sampai pembayaran pengerjaan PAID terverifikasi** lalu menekan **Akhiri Kunjungan**. Ini prosedur operasional, **bukan jaminan** bahwa Customer pasti membayar; tetap ada tombol tunggal **Laporkan Kendala Pembayaran** jika koneksi, pembayaran, keselamatan, atau masalah lain menghalangi. Worker tidak boleh dipaksa menunggu tanpa batas atau menahan Customer/barang.
11. Jika 6 jam berlalu tanpa PAID setelah pekerjaan telah dilakukan, **Order tidak otomatis BATAL atau COMPLETED**. Status penagihan **Pembayaran Terlambat**, provider/admin dapat menindaklanjuti; tagihan pengganti untuk kewajiban yang sama tidak boleh menggandakan utang atau komponen biaya. Jalur ini **pengecualian**, bukan alur normal.
12. Setelah `WORK_FINISHED` **dan** payment `PAID`, Customer dapat konfirmasi `COMPLETED`, atau **auto-completion 72 jam** setelah kedua syarat sah terpenuhi jika tidak ada laporan masalah aktif.
13. Setelah Order `COMPLETED`, hak bersih Provider masuk periode **HELD 120 jam**, lalu eligible `S-Pay Tersedia` jika tidak ada hold/masalah lain. Pencairan manual min Rp20.000, biaya transfer dipotong dari nominal, mengikuti Finance 06.
14. Jika Customer membatalkan setelah diagnosis yang sah sudah diberikan, **Order BATAL**; biaya diagnosis **tidak di-refund**. Hak diagnosis Provider eligible mengikuti **HELD 120 jam sejak penutupan BATAL sah** walaupun Order tidak pernah `COMPLETED`.
15. Jika Customer batal sebelum Worker OTW dan diagnosis sudah PAID, **refund penuh** pembayaran diagnosis ke Customer melalui Finance → `S-Pay Customer` setelah refund `SUCCEEDED`.
16. Saat Worker **OTW / ARRIVED**, tombol pembatalan normal disembunyikan. Tetap ada **Laporkan Kendala** sebagai jalur kejadian khusus (Worker no-show, diagnosis tidak dilakukan, masalah keselamatan atau ketidaksesuaian). Tidak menghilangkan hak penyelesaian masalah.
17. **Customer menolak perbaikan** atau **sparepart tidak tersedia sehingga perbaikan tidak bisa dilakukan pada kunjungan itu** → Order awal **BATAL**, bukan SELESAI, dengan reason code terpisah. Bukti diagnosis tetap tersimpan.
18. **Tidak ada Multiple Visit canonical**. Untuk sparepart tidak tersedia, sistem membuat/menyediakan **draft Order lanjutan** dengan referensi diagnosis, keluhan, foto, alamat, Provider lama, tanpa booking aktif atau penugasan otomatis; **tidak menagih ulang diagnosis yang sama** jika follow-up eligible.
19. Sparepart: (a) stok Provider/Worker, diinput nama+QTY+harga satuan+subtotal; (b) produk Merchant SERVIO melalui 03/05A, pembayaran barang terpisah; (c) milik Customer/beli eksternal, tanpa penagihan harga barang di 05B. **Affiliate belum scope.** Katalog/checkout 05A saat ini dibatasi satu kota; pengiriman lintas-kota same-day **belum diaktifkan oleh dokumen 05B ini**.
20. **Lima tab per role** disepakati: Customer [Belum Bayar, Menunggu Jadwal, Berlangsung, Selesai, Batal]; Worker [Tugas Masuk, Terjadwal, Berlangsung, Selesai, Riwayat]; Provider [Booking Masuk, Penugasan, Berlangsung, Selesai, Batal].
21. **Worker assignment response 30 menit operasional**. Identitas Worker baru tampil pada Customer setelah assignment `ACCEPTED`.
22. Semua **nama, basis, besar, cakupan Customer/Provider/Merchant dan kombinasi** biaya pengerjaan mengikuti versi kebijakan CEO yang efektif. Jangan hardcode 'biaya aplikasi', tarif pajak, atau komisi tertentu. **Diagnosis dikecualikan dari biaya kebijakan platform** sesuai keputusan bisnis ini, membutuhkan kontrak pengecualian resmi di Finance/CEO.

## 00.2 Perubahan yang secara eksplisit mengesampingkan baseline 05B lama

| Baseline lama | V2 bisnis yang disepakati |
|---|---|
| Worker draft → Provider wajib ACC → Customer | Worker finalisasi hasil; **Provider tidak wajib ACC dalam sistem**, koordinasi via WA boleh; Customer menanggapi |
| Customer approve → payment → execution | Customer approve → **execution** → Worker FINISHED → **payment** |
| Proposal sebagai layar terpisah | **Hasil Pemeriksaan & Rincian Biaya** dalam satu pengalaman form, riwayat/versi tetap terpisah di data |
| WAITING_SPAREPART / PAUSED dapat menahan satu Order lama | Tidak membangun multiple-visit; sparepart tidak tersedia saat kunjungan → **BATAL**, draft Order lanjutan |
| Worker tidak mencatat persetujuan Customer | Worker boleh **mencatat persetujuan lisan di lokasi** (dengan audit dan jalur komplain) |
| Proposal approved dan payment diperlakukan prerequisite mulai execution | Hanya **persetujuan rincian yang sah** menjadi prerequisite execution; payment sesudah Worker FINISHED |
| No definition for survey revenue if Order CANCELLED | Dana diagnosis sah pada BATAL memiliki pelepasan 120 jam dari penutupan sah |

---

# 01. TUJUAN, RUANG LINGKUP DAN DOMAIN BOUNDARY

## 01.1 Tujuan

Menyediakan pengalaman Order Jasa yang singkat bagi Customer, operasional sederhana bagi Provider/Worker, serta integrasi dana terpusat dan dapat diaudit di Finance 06, dari halaman detail katalog jasa sampai penyelesaian pekerjaan/penutupan batal dan pencairan.

## 01.2 In scope 05B

Order Jasa, Booking/jadwal, snapshot alamat/keluhan, penugasan Worker dan acceptance, OTW/ARRIVED, diagnosis dan bukti, rincian kerja/sparepart, pencatatan persetujuan, pengerjaan, penyelesaian dengan foto sebelum/sesudah, pembatalan operasional, jadwal ulang, no-show, histori, status lintas-role, event ke Finance/Notification, draft Order lanjutan.

## 01.3 Tetap milik service lain

- **01 Identity/Buku Alamat:** user/role/membership Provider/Worker, izin akses, alamat tersimpan, data rekening bila diatur Identity.
- **04 Service Offering:** master jasa, Provider offering, kondisi ACTIVE, kategori, area layanan, tarif diagnosis, aturan jadwal, kemampuan Worker.
- **03 Produk dan 05A Order Barang:** katalog/stock/order/pembayaran/kurir barang SERVIO yang dibeli Customer untuk sparepart.
- **06 Finance:** invoice/payment/mock QRIS-VA, simulasi resmi, `PENDING/PAID/EXPIRED`, fee policy CEO, ledger, refund, held funds, S-Pay, penarikan, payout.
- **07 After-Sales dan domain laporan masalah terkait:** klaim/penanganan keluhan pasca-order sesuai arsitektur, bukan dibangun sebagai mesin arbitrase baru di 05B.
- **Notification:** penyampaian notifikasi; 05B hanya menghasilkan event/perintah tepercaya.

**Larangan:** 05B tidak menulis langsung tabel Finance, tidak mengesahkan PAID dari browser/Worker, tidak menghitung saldo tersedia, tidak membuat QRIS palsu, tidak memberi affiliate commission, tidak membuat GPS realtime atau multiple-visit engine.

---

# 02. ROLE, KEWENANGAN, DAN RINGKASAN NAVIGASI

| Role | Tanggung jawab | Tidak boleh |
|---|---|---|
| CUSTOMER | Booking, pilih alamat/jadwal, bayar diagnosis, lihat Worker accepted, setuju/tolak diagnosis, pilih sumber part, bayar pengerjaan, konfirmasi/komplain, cancel eligible, lihat refund/S-Pay | Menetapkan nilai pembayaran, memalsukan PAID, membuka Order lain |
| PROVIDER | Melihat booking PAID, memilih/mengganti Worker, usulkan reschedule, monitor diagnosis/harga/penyelesaian, lihat hak dana/S-Pay | Menandai Customer approved/PAID sepihak, mengubah rincian approved tanpa history |
| WORKER | Accept/reject, OTW/ARRIVED, diagnosis, catat persetujuan lisan di lokasi, input harga, execute, foto before/after, finish, laporkan kendala pembayaran | Menandai PAID, mengakses tugas yang tidak diassign, menentukan Customer approved digital remote, mengubah approved price diam-diam |
| FINANCE_PAYMENT_OPS | Pantau diagnosis/execution invoice, simulasi resmi di demo, refund, held funds, payout monitor | Mengubah status kerja/diagnosis, tarif CEO, memproses payment tanpa otorisasi |
| ADMIN_OPERATIONS | Lihat Service Orders global & kendala, assignment/no-show/pembayaran tertunda; tindak lanjut terbatas izin | Memalsukan PAID, mengubah saldo, membatalkan tanpa policy |
| CEO_PRODUCT_OWNER | Menentukan kebijakan biaya/target/versi sesuai Finance 06 | Mengubah histori dana secara sepihak |

---

# 03. ALUR KANONIK RINGKAS NORMAL

```text
CUSTOMER — Katalog Phase 04 → Detail Layanan → [Pesan Jasa]
  → Form Keluhan + Foto Opsional + Pilih Alamat Buku Alamat + Slot Jadwal
  → Ringkasan Booking + Ketentuan Diagnosis
  → Jika fee diagnosis > 0: Finance Tagihan Diagnosis QRIS/VA PENDING (6 jam)
       → Finance Ops simulasi SUCCESS (demo) → PAID sah → Booking siap Provider
    Jika fee diagnosis = 0: langsung booking eligible tanpa payment dummy
  → PROVIDER Booking Masuk → pilih Worker → ASSIGNED
  → WORKER Tugas Masuk → ACCEPTED (maks. 30 menit operasional)
  → CUSTOMER baru boleh melihat profil Worker yang accepted
  → WORKER OTW → ARRIVED → Diagnosis
  → WORKER isi Hasil Pemeriksaan & Rincian Biaya (+ foto dan sparepart)
  → Jika Customer di lokasi: Worker catat persetujuan lisan
    Jika Customer tidak di lokasi: Customer approve/reject dari akun (30 menit)
  → Customer menyetujui scope/harga yang final
  → WORKER mulai pengerjaan tanpa menunggu pembayaran pengerjaan
  → WORKER FINISHED: foto sebelum+sesudah, ringkasan, hasil test
  → FINANCE buat tagihan pengerjaan setelah work finish, QRIS/VA PENDING 6 jam
  → CUSTOMER bayar; FINANCE Ops simulasi SUCCESS demo → Finance PAID → 05B terkonfirmasi
  → WORKER Akhiri Kunjungan saat PAID (normal)
  → CUSTOMER Konfirmasi Selesai / auto-completion 72 jam setelah FINISHED+PAID
  → Order COMPLETED → hak bersih Provider HELD 120 jam
  → Finance AVAILABLE S-Pay Provider → pencairan manual min Rp20.000
```

**Pengecualian ringkas:** batal sebelum OTW → refund penuh diagnosis berbayar; reject/tidak lanjut setelah diagnosis → BATAL + diagnosis sah tidak refund; part unavailable → BATAL + draft lanjutan; payment issue setelah work finish → masalah pembayaran, **bukan auto BATAL/COMPLETED**.

---

# 04. UI LAYAR 01 — KATALOG JASA → DETAIL SERVICE OFFERING

**Path konseptual:** Katalog Jasa → Detail Jasa → `Pesan Jasa`.

**Informasi tampil:** foto/media, nama jasa, kategori/subkategori, Provider/organisasi, deskripsi, benefit/scope, cakupan kota/area, model harga Phase 04 (`FREE`, `RANGE`, `AFTER_SURVEY`), **biaya diagnosis yang jelas (`Rp0` bila gratis)**, estimasi durasi bila ada, syarat lokasi/akses, catatan bahwa total pengerjaan hanya final setelah diagnosis, dan aturan diagnosis dapat tidak di-refund jika layanan telah diberikan.

**Tombol:** `Pesan Jasa` (primary); `Lihat Provider` bila ada; navigasi kembali. Login diperlukan; redirect ke halaman pemesanan setelah login. Tombol disabled jika offering tak ACTIVE / Provider tak eligible / layanan tak meliputi area Customer; tampil alasan.

**Server validation:** jangan mengandalkan label foto/tarif dari frontend. Saat pesan dan checkout, validasi offering aktif, provider benar, model harga, diagnosis fee dan coverage. Harga/policy disnapshot saat booking.

---

# 05. UI LAYAR 02 — FORM BUAT PESANAN DAN BOOKING (SATU HALAMAN)

**Bagian A — Informasi Layanan dan Keluhan:** service name + provider read-only; teks keluhan wajib; gejala/catatan opsional; lampiran foto opsional; informasi khusus yang diwajibkan offering (jika ada).

**Bagian B — Lokasi Kunjungan:** pilih alamat dari Phase 01 Buku Alamat; nama penerima, HP, alamat lengkap, kota, titik lokasi bila tersedia; ganti/tambah alamat melalui UI Buku Alamat; catatan patokan rumah; **snapshot** alamat/nomor penerima disimpan pada Order. Jangan bergantung pada alamat terkini untuk histori.

**Bagian C — Jadwal:** date-picker dan slot waktu yang benar-benar tersedia di Provider; validasi coverage, jam operasional, konflik ketersediaan, hari libur, slot expired. Booking dibuat tanpa memaksa Worker sudah terpilih.

**Tombol:** `Lanjut ke Ringkasan`, `Kembali`.

**Validasi dan loading:** field wajib, file type/size, izin media, timezone lokal; tampilkan pesan gagal jadwal/alamat dan jangan membuat Order ganda karena double click.

---

# 06. UI LAYAR 03 — RINGKASAN BOOKING

Tampilkan **jasa/Provider, keluhan ringkas, tanggal & slot, penerima/alamat, biaya diagnosis dari Phase 04, total pembayaran awal, metode pembayaran yang tersedia, pernyataan biaya pengerjaan ditentukan setelah diagnosis, ketentuan refund**.

- **Diagnosis berbayar:** total awal **pure diagnosis fee**, tidak menambah nama biaya/komisi platform dari kebijakan CEO pada transaksi diagnosis.
- **Diagnosis gratis (`Rp0`):** tidak membuat QRIS/VA atau simulasi pembayaran Rp0. Booking dapat menjadi eligible langsung berdasarkan event/kondisi `DIAGNOSIS_NO_PAYMENT_REQUIRED` yang tepercaya.
- **Ketentuan biaya kebijakan:** exemption diagnosis harus diterapkan di Finance sebagai type/eligibility rule, bukan UI menyembunyikan biaya sambil ledger tetap memotong.
- **Tombol:** `Konfirmasi Booking & Bayar Diagnosis` (berbayar), `Konfirmasi Booking` (gratis), `Ubah Data`.

Dari klik konfirmasi: idempotent create Order+Booking+snapshot; bila berbayar request invoice Finance; baru redirect pembayaran. Tanggal booking harus dijaga dari race/double booking.

---

# 07. UI LAYAR 04 — PEMBAYARAN DIAGNOSIS

**Customer → Pesanan Jasa → Belum Bayar → Diagnosis**.

Tampilkan `order_no`, payment reference, jenis **DIAGNOSIS**, nominal, metode QRIS/VA, instruksi Finance mock, **batas 6 jam dari tagihan dibuat**, timer berdasarkan expiry server, status PENDING/PAID/EXPIRED/CANCELLED, `Cek Status`, `Lihat Pesanan`, `Batalkan` bila eligible.

**Tidak boleh ada tombol `Sudah Bayar` yang langsung menjadikan PAID di Customer.** Tombol simulasi existing berada pada **Finance Ops → Escrow & Bayar** untuk role authorized di nonproduction.

- Finance `PENDING` → Customer **Belum Bayar**; Provider belum boleh assign; Worker tidak melihat tugas.
- Finance demo simulated `PAID` → event terpercaya ke 05B → Customer **Menunggu Jadwal**, Provider **Booking Masuk**.
- `EXPIRED` (6 jam) → Order awal ditutup BATAL dengan reason `DIAGNOSIS_PAYMENT_EXPIRED`, tanpa refund karena belum PAID.
- Retry jaringan tidak menghasilkan invoice/order duplikat. Tidak ada kebijakan biaya platform yang diterapkan pada diagnosis.

---

# 08. UI LAYAR 05 — PROVIDER BOOKING MASUK

**Isi card Provider:** Order ID, nama jasa, Customer, ringkasan keluhan, jadwal/timeslot, area lokasi, fee diagnosis, badge `PAID` atau gratis-eligible, Worker `Belum Ditugaskan`, created time, tombol `Lihat Detail` dan `Pilih Worker`.

**Detail Provider:** profil/jasa, Customer/contact (sesuai izin), alamat snapshot, keluhan/foto, jadwal, rincian diagnosis yang relevan, riwayat, status Finance. Tombol `Cari/Tugaskan Worker`, `Usulkan Reschedule`, `Laporkan Kendala`.

**Provider belum boleh** menugaskan Worker untuk diagnosis PENDING; jangan tampilkan PENDING sebagai Booking Masuk aktif tanpa status khusus. Tidak ada ACC harga per Order.

---

# 09. UI LAYAR 06 — PENUGASAN WORKER

Provider memilih Worker **eligible**: akun aktif, membership Provider aktif, capability jasa, coverage, availability, tak suspended, tidak konflik assignment.

- Assignment `ASSIGNED` → Worker **Tugas Masuk**, Provider **Penugasan**, Customer tetap **Menunggu Jadwal** tanpa profil Worker.
- Worker `ACCEPTED` → Worker **Terjadwal**, Provider **Berlangsung**, Customer **Menunggu Jadwal** dan baru menampilkan identitas Worker yang memang diizinkan.
- Worker `REJECTED` + reason → Worker **Riwayat**, Provider **Penugasan** untuk reassign, Customer tidak melihat identitas Worker yang menolak.
- **Timeout 30 menit operasional** (sesuai jam kerja authoritative) → assignment `EXPIRED`; Provider dapat menugaskan pengganti. Satu assignment aktif untuk Booking; attempt lama tersimpan.
- Provider bisa mengusulkan reschedule; **Customer harus menerima** sebelum jadwal berlaku.

**Modal Provider Pilih Worker:** daftar Worker eligible, kemampuan, ketersediaan/jadwal, status, tombol `Tugaskan`.  
**Modal Worker Tolak:** pilihan alasan + catatan wajib, tombol `Konfirmasi Tolak`.  
**Worker card Tugas Masuk:** order, jasa, Provider, keluhan ringkas, alamat area & detail sesuai izin, slot, timer, `Terima`, `Tolak`, `Lihat Detail`.

---

# 10. UI LAYAR 07 — OTW DAN ARRIVED

**Worker Terjadwal → `Mulai Perjalanan`**: assignment harus ACCEPTED, slot eligible; simpan `otw_at` actor; Worker pindah **Berlangsung**, Customer **Berlangsung** (`Teknisi Menuju Lokasi`), Provider **Berlangsung** (`OTW`).

**Worker Berlangsung → `Saya Sudah Tiba`**: hanya setelah OTW, simpan `arrived_at`; status pada ketiganya `Teknisi Tiba`; action `Mulai Pemeriksaan` terbuka. Tidak ada live GPS wajib; optional bukti arrival jika policy.

**Pembatalan:** Customer tombol normal `Batalkan` hanya tersedia sebelum Worker OTW. Sejak OTW/ARRIVED, Customer hanya `Laporkan Kendala` untuk kejadian khusus; Worker/Provider dapat menindaklanjuti via workflow operational resolution, bukan otomatis menentukan biaya Customer.

**No-show:** Worker gagal hadir → Provider reassign/reschedule atau batalkan atas kegagalan layanan; jika diagnosis belum benar-benar diberikan, jangan mengakui biaya diagnosis sebagai penghasilan Provider. Customer no-show → log bukti + penanganan operasional, tidak otomatis selesai.

---

# 11. UI LAYAR 08 — FORM HASIL PEMERIKSAAN & RINCIAN BIAYA

**Satu layar/form Worker**, tetapi data tetap terstruktur dan versioned untuk audit. Form Worker tidak harus menjadi dua halaman Diagnosis dan Proposal yang berbeda.

## 11.1 Bagian pemeriksaan

- Order/service/Customer/keluhan dari booking (read-only).
- Hasil diagnosis: kondisi awal, temuan, gejala terkonfirmasi, penyebab jika diketahui, pekerjaan yang disarankan, keterbatasan/risiko keamanan, catatan teknis.
- **Foto sebelum / foto kerusakan wajib** untuk layanan fisik yang mendukung bukti foto; bila bukti tidak dapat diambil, gunakan alasan/exception yang diizinkan Admin sesuai kategori layanan. Jangan unggah foto pelanggan tanpa kebutuhan/izin.
- Timestamp, Worker ID, lokasi/jadwal, versi diagnosis, audit, validasi attachment.

## 11.2 Bagian rincian pekerjaan

- Nama/tindakan pekerjaan, deskripsi scope, harga jasa, qty bila ada beberapa item pekerjaan yang sah.
- Provider boleh dihubungi via WhatsApp untuk membahas harga; **tidak ada tombol ACC Provider**.
- Worker mengisi harga final yang akan ditawarkan; backend menjaga batas angka nonnegatif, snapshot dan perubahan versi. Provider bisa melihat hasil tanpa harus mengotorisasi klik.

## 11.3 Bagian sparepart

Pilih `Tidak perlu sparepart` atau sumber `PROVIDER_SUPPLIED`, `SERVIO_MERCHANT`, `CUSTOMER_SUPPLIED` per item. Perbedaan sumber harus dapat ditampilkan dengan jelas jika ada lebih dari satu item.

**Provider-supplied:** nama barang, spesifikasi jika diperlukan, QTY, harga satuan, subtotal dihitung otomatis dan diverifikasi server-side; item dapat ditambah/hapus sebelum final; wajib masuk rincian biaya jasa.

**SERVIO Merchant:** catat nama/spec yang dibutuhkan; Customer membeli sendiri di Product 03→Order Barang 05A; link Product Order terkait bila sudah ada; barang **tidak** ditagih ulang pada 05B. Tidak ada affiliate, kickback, atau komisi Worker.

**Customer-supplied:** milik Customer atau dibeli di luar SERVIO; harga yang dibayar di luar SERVIO **tidak** dicatat sebagai penagihan 05B; Worker menguji kompatibilitas/keamanan, bisa menolak barang unsafe atau incompatible.

## 11.4 Tindakan Worker

`Simpan Draft` → `Lihat Pratinjau` → `Kirim Hasil Pemeriksaan`.

Setelah dikirim, versi final menjadi immutable; revisi sah membuat versi baru dan menarik kembali versi lama dari persetujuan aktif. Jangan menghitung tagihan jasa dari draft yang belum disetujui Customer.

---

# 12. UI LAYAR 09 — CUSTOMER MELIHAT HASIL PEMERIKSAAN

**Customer tab Berlangsung → Detail Order → panel `Hasil Pemeriksaan & Rincian Biaya`.**

**Menampilkan:** foto kerusakan, ringkasan temuan yang mudah dipahami, tindakan yang akan dilakukan, estimasi hasil, daftar item jasa, daftar sparepart per sumber/QTY/harga, subtotal, **total dasar pengerjaan**, biaya kebijakan CEO yang applicable pada Customer/Provider (masing-masing sesuai izin), versi rincian, waktu dikirim.

**Customer tombol:** `Setujui & Lanjutkan Pengerjaan`, `Ubah Sumber Sparepart`, `Tidak Setuju & Batalkan`, `Laporkan Ketidaksesuaian`.

**A. Customer di lokasi:** Worker menjelaskan hasil diagnosis; Worker klik `Catat Persetujuan di Lokasi` → modal pernyataan persetujuan lisan dengan `rincian_version`, `worker_id`, `recorded_at`, catatan dan pilihan `Customer hadir`. Ini **bukan** impersonasi Customer; 05B mencatat sumber persetujuan `WORKER_RECORDED_IN_PERSON`. Customer menerima notifikasi/ringkasan dan bisa melapor bila tak pernah menyetujui.

**B. Customer tidak di lokasi:** Customer login ke SERVIO dan memilih sendiri `Setujui` / `Tolak`; batas **30 menit dari hasil final yang tersedia/terpublikasi dan tercatat**, dengan timer backend. Tidak ada Worker approve atas nama Customer remote. Bila timeout sah → `CANCELLED` reason `CUSTOMER_REMOTE_NO_RESPONSE` dan diagnosis sah tidak di-refund. Jika hasil belum dapat diakses/diberitahukan karena error sistem, eskalasi penanganan, jangan menganggap timeout normal secara diam-diam.

**C. Customer menolak sumber sparepart Provider:** pilih barang sendiri/produk SERVIO; Worker cek kompatibilitas; versi rincian dibuat ulang, harga sparepart Provider dikeluarkan dari kewajiban pengerjaan, dan perlu persetujuan baru. Pembelian 05A terpisah. Jika part tidak tersedia pada kunjungan itu, jalur BATAL + draft Order lanjutan.

**D. Menolak perbaikan:** `CANCELLED` reason `CUSTOMER_DECLINED_REPAIR`; diagnosis sah tetap dibayar, tidak membuat tagihan pengerjaan.

**Kunci:** persetujuan hasil pemeriksaan **tidak** menjadikan Finance PAID dan **tidak** membuat tagihan pengerjaan pada saat itu. Harga final **dibekukan** untuk proses pengerjaan yang disepakati.

---

# 13. UI LAYAR 10 — PENGERJAAN SETELAH PERSETUJUAN

Setelah sumber persetujuan sah (`CUSTOMER_REMOTE` atau `WORKER_RECORDED_IN_PERSON`) dan scope/harga final siap, Worker mendapat tombol **`Mulai Pekerjaan`**.

**Tidak perlu menunggu pembayaran pengerjaan sebelum bekerja.** Diagnosis fee sudah berstatus paid atau gratis-eligible pada booking.

Worker melihat: pekerjaan final, sparepart yang diizinkan, harga disetujui (untuk referensi), checklist/notes, waktu mulai. Status `EXECUTION_IN_PROGRESS` dicatat terpisah dari status Order/Payment.

**Aturan perubahan:** Worker tidak boleh menambah item/harga tanpa versi rincian baru dan persetujuan Customer yang sah. Untuk V2 sederhana, jika tambahan kerja tidak mungkin diselesaikan dalam satu kunjungan atau part tidak tersedia, berhenti dengan penanganan yang sah; **jangan membuat tagihan tambahan diam-diam**.

**Keselamatan:** jika kondisi berbahaya, tidak ada kewajiban memaksakan pengerjaan; `Laporkan Kendala` → Provider/Admin. Bukti/riwayat tetap ada.

---

# 14. UI LAYAR 11 — FINISH WORKER, FOTO BEFORE/AFTER DAN TAGIHAN

## 14.1 Form Worker `Selesaikan Pekerjaan`

Wajib:
- Foto **sebelum** (boleh menggunakan foto diagnosis tervalidasi).
- Foto **sesudah** (unggahan baru).
- Ringkasan pekerjaan yang benar-benar dilakukan.
- Sparepart aktual yang digunakan (sesuai versi disetujui).
- Hasil uji/checklist kualitas, jika relevan.
- Waktu selesai dan actor Worker.
- Catatan/pengecualian jika dibutuhkan.

Tombol: `Simpan Draft Hasil` dan `Pekerjaan Selesai`. Tidak boleh Worker mengonfirmasi Customer selesai.

## 14.2 Saat `Pekerjaan Selesai` berhasil

- Execution menjadi `WORKER_FINISHED`; Order **belum `COMPLETED`**.
- Worker pindah tab **Selesai**, substatus `Pekerjaan Selesai — Menunggu Pembayaran`.
- Customer pindah tab **Belum Bayar**, substatus `Bayar Pengerjaan`.
- Provider tetap **Berlangsung**, substatus `Menunggu Pembayaran Pengerjaan`.
- 05B meminta Finance membuat **satu tagihan pengerjaan** untuk versi rincian yang telah disetujui; **6 jam** sejak tagihan Finance dibuat. Nilai meliputi item jasa + sparepart Provider + biaya kebijakan CEO applicable; **tidak termasuk diagnosis yang sudah dibayar dan tidak termasuk sparepart 05A/customer-owned**.
- Tidak boleh membuat tagihan pengerjaan karena Worker menyimpan draft; trigger hanya `WORKER_FINISHED` sah, idempotent.

---

# 15. UI LAYAR 12 — PEMBAYARAN PENGERJAAN SETELAH FINISH

**Customer:** Order ID, versi rincian disetujui, item jasa, sparepart Provider, subtotal, **daftar biaya kebijakan CEO yang benar-benar applicable berdasarkan target dan versi**, grand total Finance, tanggal tagihan, QRIS/VA dari Finance, batas **6 jam**, status pembayaran, tombol `Cek Status` dan `Laporkan Masalah`.

- Tulisan jelas: **`Diagnosis sudah dibayar dan tidak ditagih kembali`**.
- Tampilan Customer tidak menampilkan komisi Provider sebagai tambahan kepada Customer, kecuali fee target Customer memang diberlakukan oleh CEO.
- Finance mock/demo: transaksi mulai `PENDING`; **tombol `Simulasi Pembayaran` hanya Finance Ops nonproduction**, bukan Customer/Worker/Provider.
- Sampai Finance `PAID` sah, UI Customer **Belum Bayar**, Worker **Selesai — Menunggu Bayar**, Provider **Berlangsung — Menunggu Bayar**.
- Setelah Finance `PAID` dan event terverifikasi: Customer **Berlangsung — Menunggu Konfirmasi Selesai**, Worker **Selesai — Pembayaran Berhasil**, Provider **Berlangsung — Menunggu Konfirmasi Customer**. Worker dapat klik **Akhiri Kunjungan**.

## 15.1 SOP pembayaran di lokasi

**Normal:** Worker menyelesaikan pekerjaan → Customer bayar di lokasi → Finance verifikasi PAID → Worker melihat badge `Sudah Dibayar` dan menekan `Akhiri Kunjungan`.

**Jangan asumsikan pembayaran selalu berhasil.** Worker tidak wajib menunggu enam jam; jika jaringan gagal, Customer tidak dapat membayar, ada perselisihan, bahaya, atau keadaan mendesak, tombol **`Laporkan Kendala Pembayaran`** menghasilkan case/status yang bisa dipantau Provider/Admin dan memperbolehkan Worker meninggalkan lokasi sesuai safety. **Tidak ada wewenang Worker memaksa pembayaran fisik atau menahan orang/barang.**

## 15.2 Terlambat 6 jam

Jika tagihan 6 jam kedaluwarsa tanpa PAID dan pekerjaan telah dilakukan:
- Tagihan lama `EXPIRED`, Order **bukan `CANCELLED` atau `COMPLETED`**.
- UI Customer **Belum Bayar**, label `Pembayaran Terlambat`, tombol `Bayar Sekarang` (ambil tagihan pengganti untuk kewajiban sama), `Lihat Rincian`, `Laporkan Masalah`.
- Worker **Selesai**, label `Pembayaran Belum Dikonfirmasi`; Provider **Berlangsung**, label `Pembayaran Terlambat`; Admin/Finance dapat melihat exception.
- Finance membuat **replacement invoice** yang hanya menggantikan instruksi pembayaran yang expired, tidak menciptakan kewajiban/fee baru; 1 kewajiban dapat memiliki beberapa invoice attempts tetapi **maksimal satu pembayaran teralokasi sah**. Jika pembayaran lama ternyata sudah masuk, lakukan reconciliation dan cegah charge kedua.
- **Tidak ada denda otomatis**. Penagihan lebih lanjut di luar alur UI dasar membutuhkan aturan kebijakan tersendiri.

## 15.3 Laporkan Masalah terkait persetujuan/harga/pekerjaan

Customer dapat melapor `Worker mencatat persetujuan tanpa izin`, `Nilai tidak sesuai`, `Pekerjaan tidak sesuai`, dll. Selama penanganan, Finance menandai hak terkait untuk tidak dilepas; penyesuaian tagihan/refund hanya melalui keputusan sah dari pemilik domain. **Jangan membatalkan otomatis pekerjaan yang telah dikerjakan hanya dengan satu klaim**, dan jangan menganggap Customer pasti salah; jaga bukti kedua pihak dan jejak audit.

---

# 16. UI LAYAR 13 — KONFIRMASI SELESAI DAN AUTO-COMPLETION

Customer dapat `Konfirmasi Selesai` **hanya jika** Worker `FINISHED`, bukti sebelum/sesudah dan ringkasan valid, **Finance pembayaran pengerjaan `PAID`**, dan tidak ada laporan masalah yang memblokir.

**Tombol:** `Konfirmasi Selesai`, `Laporkan Masalah`, `Lihat Foto/Laporan`, `Lihat Pembayaran`.

**Auto-completion:** setelah **72 jam** dari **yang lebih akhir antara `worker_finished_at` dan `finance_paid_at`**, selama seluruh kriteria terpenuhi dan tidak ada hold/masalah aktif. Timer dimulai dari waktu eligible, bukan saat Worker baru tiba, dan tidak menjadikan Order unpaid COMPLETED.

- Setelah manual/auto sah: Order `COMPLETED`; Customer **Selesai**, Provider **Selesai**, Worker tetap **Selesai**.
- 05B menerbitkan completion event and snapshot; Finance mulai **HELD 120 jam dari `completed_at` sah** bagi hak Provider (diagnosis+pengerjaan yang eligible, dengan alokasi ledger dan policy masing-masing).
- UI wajib menjelaskan `Pekerjaan selesai` berbeda dari `Saldo Provider tersedia`.
- Jika laporan masalah terbuka, auto-completion/settlement dihentikan menurut otoritas penanganan yang sah, tidak otomatis memutuskan hak salah satu pihak.

---

# 17. MODEL SPAREPART — TIGA SUMBER, TANPA AFFILIATE

| Sumber | Input/UX | Tagihan | Batasan |
|---|---|---|---|
| `PROVIDER_SUPPLIED` | Worker input nama, specs opsional, qty, unit price, subtotal; total otomatis | Termasuk tagihan pengerjaan 05B setelah Worker FINISHED | Harga harus termasuk versi rincian yang disetujui; jika tidak dipakai harus disesuaikan secara sah |
| `SERVIO_MERCHANT` | Worker beri rekomendasi spec, Customer mencari/membeli barang 03/05A; status/referensi Product Order bila ada | **Terpisah** dalam 05A; bukan penghasilan Provider 05B | Hanya barang yang dapat dibeli melalui kontrak 03/05A aktual (saat ini sekota). Tidak menjanjikan same-day atau lintas kota |
| `CUSTOMER_SUPPLIED` | Customer menyiapkan/beli di luar; Worker validasi cocok/aman | **Harga barang tidak masuk 05B** | Jika unsafe/incompatible tidak boleh dipaksakan |

**Perubahan pilihan:** jika Customer menolak barang Provider, buat versi rincian baru dan approval baru; jangan tetap menagih item yang tidak dipakai. Sistem tidak membuat affiliate link, tracking komisi rekomendasi, atau pembelian otomatis Worker.

**Tidak tersedia saat kunjungan:** Order awal **CANCELLED reason `SPAREPART_UNAVAILABLE`** dengan diagnosis sah tetap dibayar; buat draft Order lanjutan, bukan `WAITING_SPAREPART` multi-visit di satu Order. Order Barang 05A yang sudah dibeli **tidak otomatis dibatalkan** hanya karena Order Jasa BATAL; Customer melihat informasi bahwa lifecycle barang terpisah.

---

# 18. DRAFT ORDER LANJUTAN TANPA TAGIHAN DIAGNOSIS KEDUA

**Pemicu utama:** Order awal BATAL karena `SPAREPART_UNAVAILABLE` setelah diagnosis valid. Tidak ada booking kedua yang aktif otomatis.

**Draft tersimpan:** parent_order_id, diagnosis_id+version, jenis jasa, Provider, keluhan/symptoms, foto, temuan, spesifikasi sparepart, alamat snapshot, Customer ID, eligibility penggunaan diagnosis lama, waktu dibuat, status DRAFT.

**Customer tab Batal → tombol `Lanjutkan Perbaikan`:** membuka draft yang sudah terisi; Customer cukup konfirmasi kesesuaian masalah/alamat, ketersediaan sparepart, jadwal baru, serta rincian pengerjaan yang dapat diperbarui sebelum persetujuan. **Tidak mengisi keluhan lagi**.

**Keuangan:** untuk kelanjutan yang mengacu pada diagnosis yang sama, biaya diagnosis **Rp0 / already fulfilled** pada follow-up; bukan refund dan bukan membuat charge kedua. Hak diagnosis tetap pada Order awal yang telah dikerjakan, sehingga Finance tidak memindahkan/menambah pendapatan diagnosis lagi.

**Guard:** draft hanya bisa digunakan Customer owner, Provider/service eligible, relevan pada masalah yang sama; bila kondisi berubah signifikan/safety perlu pemeriksaan baru, tampilkan alasan dan **harus ada persetujuan eksplisit sebelum biaya baru**, bukan silent double-charge. Batasi entitlement agar tidak bisa dipakai berulang untuk banyak order tak terkait. Keputusan detail masa berlaku diagnosis **OPERASIONAL DEFAULT / PERLU VALIDASI** dalam technical spec; jangan asal hardcode waktu.

**Worker:** assignment baru setelah Customer mengaktifkan follow-up; jangan tampilkan Worker lama otomatis sebagai assigned.

---

# 19. RESCHEDULE, NO-SHOW, DAN EXCEPTION OPERASIONAL

- **Provider usulkan jadwal baru:** tanggal, slot, reason; Customer modal `Terima/Tolak`; setelah accept booking schedule diupdate, riwayat snapshot disimpan; assignment dievaluasi ulang. Tidak ada silent reschedule.
- **Customer meminta ganti jadwal:** hanya sebelum OTW dan sesuai ketersediaan Provider; Provider/Customer mengonfirmasi. Jika tidak ada slot, dapat membatalkan sebelum OTW dengan refund diagnosis penuh.
- **Worker reject/timeout:** assignment baru, bukan booking baru; old attempt immutable.
- **Worker no-show:** bukti/penanganan; opsi reassign/reschedule/batal; diagnosis belum dilakukan tidak otomatis menjadi pendapatan sah.
- **Customer no-show/akses ditolak:** log attempted arrival dan bukti, jangan otomatis mengklaim diagnosis completed; penyelesaian biaya melalui policy kasus khusus yang authorized.
- **Pembayaran bermasalah / lokasi tidak aman:** Worker `Laporkan Kendala Pembayaran`, Provider/Admin menangani, Worker aman meninggalkan lokasi; status kewajiban tetap dapat ditagih jika pekerjaan memang sudah diberikan dan sah.
- **Service Offering/Provider suspended:** Order historis tidak dihapus; tindakan berikutnya diblokir atau diarahkan ke penyelesaian, jangan bypass active guard.

---

# 20. CANCELLATION — KAPAN BATAL, UANG DIAGNOSIS DAN KETERANGAN

| Titik proses | Customer action | Order/role UI | Keuangan |
|---|---|---|---|
| Booking dibuat, diagnosis unpaid | Batalkan booking | **BATAL** | Invoice void/cancel jika eligible; belum ada refund |
| Diagnosis PAID, Worker belum OTW | **Batalkan** | **BATAL** | **Refund 100% pembayaran diagnosis**, Finance → Customer S-Pay saat refund SUCCEEDED |
| Worker sudah OTW/ARRIVED, belum diagnosis | Tidak ada tombol batal normal; `Laporkan Kendala` | Penanganan khusus | Jika layanan diagnosis tidak diberikan karena kegagalan Provider/Worker, refund sesuai hasil kasus; jangan otomatis mengakui fee diagnosis |
| Diagnosis selesai, Customer menolak harga/scope | `Tidak Setuju & Batalkan` | **BATAL** reason `CUSTOMER_DECLINED_REPAIR` | Diagnosis sah **tidak refund**; tidak buat tagihan pengerjaan |
| Diagnosis selesai, Customer tak menjawab remote 30m | Auto-close dengan alasan dan bukti delivery valid | **BATAL** reason `CUSTOMER_REMOTE_NO_RESPONSE` | Diagnosis sah tidak refund; tidak ada tagihan pengerjaan |
| Diagnosis selesai, sparepart tak tersedia saat kunjungan | Close reason | **BATAL** reason `SPAREPART_UNAVAILABLE` | Diagnosis sah tidak refund; draft lanjutan tanpa biaya diagnosis ulang |
| Pengerjaan disetujui, tetapi belum dimulai | Customer request batal sebelum execution dimulai | **BATAL** jika sah | Diagnosis sah tidak refund; tak ada tagihan pengerjaan; jika ada dana pengerjaan terlanjur diterima, refund penuh alokasi pengerjaan |
| Pekerjaan **sudah dimulai** | Tidak ada batal normal | `Laporkan Masalah` | Penanganan kasus sesuai bukti, bukan auto-refund |
| Pekerjaan sudah FINISHED, belum PAID | Tidak ada batal normal | **Belum Bayar** / pembayaran terlambat / masalah | Tagihan tetap tercatat; adjustment jika ada keputusan berwenang; tidak otomatis BATAL |
| Pekerjaan FINISHED, PAID | Konfirmasi atau lapor masalah | **Berlangsung** sampai COMPLETED | Dana masih ditahan |
| Order COMPLETED | Tidak ada cancel normal | **Selesai** | After-Sales/laporan masalah sesuai policy sah |

**Reason code minimum:** `CUSTOMER_CANCEL_PRE_OTW`, `DIAGNOSIS_PAYMENT_EXPIRED`, `CUSTOMER_DECLINED_REPAIR`, `SPAREPART_UNAVAILABLE`, `CUSTOMER_REMOTE_NO_RESPONSE`, `PROVIDER_UNABLE_TO_SERVE`, `WORKER_NO_SHOW`, `OPERATIONAL_EXCEPTION`, dll. Reason display bahasa manusia, backend code stabil.

**Refund ≠ Cancellation:** 05B menutup Order secara sah dan meminta refund; Finance yang menentukan/menjalankan transaksi refund. Order BATAL **bukan** bukti Customer sudah menerima uang.

---

# 21. FINANCE 06 — DUA TAGIHAN, KEWAJIBAN, KEBIJAKAN CEO

## 21.1 Tagihan diagnosis

Jenis konseptual `DIAGNOSIS`: berbayar ketika booking, nominal dasar diagnosis Phase 04, **tanpa biaya kebijakan platform**. Jika gratis, tidak ada payment dummy. QRIS/VA mock dari Finance untuk invoice berbayar; batas 6 jam; `PENDING` sampai `PAID` sah.

## 21.2 Tagihan pengerjaan

Jenis konseptual `SERVICE_EXECUTION`: diterbitkan **sesudah Worker FINISHED** untuk **versi rincian yang sudah disetujui**. Berisi biaya jasa, sparepart Provider, kebijakan biaya CEO yang applicable dan kewajiban pajak sah jika ada. Nominal, target pihak, dasar, dan versi kebijakan dihitung/dikunci Finance. Diagnosis tidak ditagih kembali. Batas 6 jam.

## 21.3 Kebijakan CEO

CEO dapat membuat **nama biaya apa pun** dengan aturan penerapan terhadap satu, dua, atau tiga target: Customer, Merchant Barang, Provider Jasa. Dapat berupa rupiah atau persentase, versi efektif, dan jenis transaksi. **Jangan hardcode nama `biaya aplikasi`, `komisi 10%`, `pajak 11%`**. Customer tidak menanggung fee target Provider kecuali kebijakan Customer sah berlaku. Diagnosis dikecualikan dari biaya kebijakan platform **secara eksplisit**, bukan berdasarkan label UI. Pajak yang diwajibkan hukum tetap dikaji/dikelola Finance sesuai regulasi, bukan 'dimatikan' hanya oleh pengecualian biaya platform.

## 21.4 Event pembayaran

- Finance `PENDING` muncul di sidebar `Escrow & Bayar`, tetapi **belum dianggap uang diterima/escrow terdanai**.
- Finance Ops simulator existing untuk 05A diperluas agar menerima transaksi 05B yang eligible, tetap **nonproduction role-only**, menggunakan kontrak backend sah (bukan frontend local setState).
- Demo success → Finance `PAID` → event outbox tepercaya → inbox 05B idempotent → UI semua role refetch; **tidak membuat Order COMPLETED/AVAILABLE otomatis**.
- Finance payment failure/expired → status yang sesuai; retry/replacement invoice tidak boleh double charge.
- Nilai nominal hanya datang dari Finance backend / ledger, bukan kalkulasi final browser.

---

# 22. DANA DITAHAN, REFUND, S-PAY PROVIDER DAN CUSTOMER

## 22.1 Definisi

- `PENDING`: belum dibayar; tidak boleh diakui sebagai uang diterima.
- `PAID`: pembayaran sukses terverifikasi dan dana dicatat Finance; **belum** dapat dicairkan Provider.
- `HELD`: hak bersih Provider eligible secara layanan, tetapi masih ditahan 120 jam; bisa diblokir lebih lama bila ada laporan masalah/hold.
- `AVAILABLE`: hak bersih Provider masuk `S-Pay Tersedia` dan boleh diajukan pencairan.
- `REFUND_PENDING/SUCCEEDED/FAILED`: status refund milik Finance; S-Pay Customer hanya bertambah saat refund `SUCCEEDED` dan tercatat funded.

## 22.2 Skenario hak dana

| Skenario | Hak Provider | Trigger tahan 120 jam |
|---|---|---|
| Diagnosis PAID → dibatalkan **sebelum OTW**, belum diberikan | Rp0; pembayaran diagnosis refund penuh | Tidak ada hold pendapatan |
| Diagnosis sah → Customer menolak perbaikan → BATAL | Hak diagnosis saja (pure diagnosis sebelum penyesuaian wajib hukum) | `cancelled_at` sah dengan `diagnosis_fulfilled` tervalidasi |
| Diagnosis sah → sparepart tidak ada → BATAL | Hak diagnosis saja | `cancelled_at` sah dengan bukti diagnosis |
| Diagnosis sah → remote no-response → BATAL | Hak diagnosis saja | Penutupan BATAL sah dan hasil diagnosis tersedia |
| Diagnosis+perbaikan dilakukan, tagihan pengerjaan masih PENDING | Hak pengerjaan **belum eligible AVAILABLE** | Tidak dimulai sampai Finance PAID dan Order COMPLETED |
| FINISHED + pengerjaan PAID + Order COMPLETED | Hak diagnosis+komponen pengerjaan Provider sesuai alokasi ledger | `completed_at` sah |
| Customer mendapatkan refund sah | Tidak mengurangi/menambah saldo Provider tanpa event Finance yang sah | Refund Customer saat SUCCEEDED, bukan customer klik cancel |
| Kasus pembayaran/laporan masalah aktif | Dana terkait tertahan | Dilanjutkan setelah clearance sah |

**Pencegahan release ganda:** pembayaran diagnosis awal yang sudah diakui sebagai hak pada Order BATAL **tidak boleh dikreditkan ulang** jika Customer membuat Order lanjutan tanpa diagnosis kedua. Untuk Order yang dilanjutkan sampai COMPLETED, gabungkan alokasi dana diagnosis dan pengerjaan pada trigger completion Order, tidak membiarkan diagnosis masuk AVAILABLE sebelum kondisi agreed.

## 22.3 Pencairan manual

- Provider S-Pay tersedia: **minimum nominal penarikan Rp20.000**, parsial diperbolehkan, frekuensi bebas selama eligible, rekening terverifikasi/step-up sesuai Finance.
- Biaya transfer bank **dipotong dari nominal penarikan** melalui quote Finance; jumlah masuk rekening = nominal ditarik - biaya transfer, apabila berhasil.
- Transfer gagal terkonfirmasi → nominal terkunci dikembalikan ke saldo tersedia; retry idempotent.
- Customer S-Pay **hanya refund**, bukan dompet top-up/pembayaran. Refund di bawah Rp20.000 tetap tercatat dan menunggu saldo kumulatif cukup untuk penarikan.
- Worker **tidak** mendapat S-Pay otomatis dari Order Jasa; pembagian upah Worker kepada Provider berada di luar 05B yang disepakati.

## 22.4 Tiga contoh arus uang

**A — Batal sebelum OTW:** diagnosis Rp50.000 PAID → cancel sah → Finance refund Rp50.000 → Customer S-Pay +Rp50.000 setelah SUCCEEDED; hak Provider Rp0.

**B — Menolak setelah diagnosis:** diagnosis Rp50.000 PAID + diagnosis sah → Order BATAL → refund Rp0 → Finance HELD Rp50.000 sejak cancel sah → 120 jam → S-Pay Provider AVAILABLE Rp50.000 (jika tanpa penyesuaian wajib hukum/hold).

**C — Pengerjaan selesai:** diagnosis Rp50.000 PAID di booking; jasa Rp200.000 + sparepart Provider Rp75.000 disetujui → Worker FINISHED → invoice pengerjaan + biaya CEO applicable → Finance PAID → Order COMPLETED → hak bersih Provider HELD 120 jam → AVAILABLE; **tidak ada diagnosis charge ulang**.

Nominal hanya contoh untuk menjelaskan lifecycle, bukan tarif produksi.

---

# 23. TAB CUSTOMER — PETA ISI, STATUS, CARD, DETAIL, TOMBOL

Tab Customer **tepat lima**: `Belum Bayar`, `Menunggu Jadwal`, `Berlangsung`, `Selesai`, `Batal`.

## 23.1 Belum Bayar

**Substatus:** `Bayar Diagnosis` (baru booking), `Bayar Pengerjaan` (Worker FINISHED), `Pembayaran Terlambat` (6 jam berlalu setelah FINISHED), `Menunggu Finance`.

**Card wajib:** badge substatus, nomor Order, nama jasa/foto, Provider, tanggal booking/pekerjaan, jenis tagihan DIAGNOSIS/PENGERJAAN, total Finance, status Finance, expiry/countdown, informasi diagnosis sudah dibayar jika pengerjaan.

**Tombol:** `Bayar Diagnosis` atau `Bayar Pengerjaan`, `Cek Status`, `Lihat Detail`, `Batalkan Booking` (hanya pre-OTW), `Bayar Sekarang` (untuk pembayaran overdue), `Laporkan Masalah` (post-work jika ada kendala).

**Detail:** kolom kiri ringkasan jasa/keluhan/alamat/jadwal/diagnosis/foto/laporan; kolom kanan Finance QRIS/VA/total/expiry/status, timeline dan aksi. Tidak menampilkan QR palsu.

## 23.2 Menunggu Jadwal

**Substatus:** `Menunggu Provider`, `Menunggu Penugasan`, `Worker Belum Menerima`, `Worker Siap Berangkat`, `Perubahan Jadwal Menunggu Jawaban`.

**Card:** jasa/Provider/Order, slot, alamat ringkas, biaya diagnosis `PAID`/gratis sah, status penugasan; **profil Worker hanya setelah `ACCEPTED`**.

**Tombol:** `Lihat Detail`, `Batalkan Booking` jika sebelum OTW, `Terima Jadwal Baru`, `Tolak Jadwal Baru` bila ada reschedule.

**Detail:** data booking, penerima, keluhan/foto awal, timeline, status Worker yang aman, pembayaran diagnosis.

## 23.3 Berlangsung

**Substatus:** `Worker Menuju Lokasi`, `Worker Tiba`, `Sedang Diperiksa`, `Menunggu Keputusan Customer`, `Perbaikan Disetujui`, `Sedang Dikerjakan`, `Menunggu Konfirmasi Selesai` (setelah FINISHED **dan PAID**).

**Card:** nama jasa/Provider, Worker accepted, status aktual, hasil diagnosis ringkas setelah ada, foto thumbnail, ringkasan biaya final bila tersedia, pembaruan terbaru.

**Tombol dinamis:** `Lihat Worker`, `Lihat Hasil Pemeriksaan`, `Setujui & Lanjutkan Pengerjaan` (remote), `Ubah Sumber Sparepart`, `Tidak Setuju & Batalkan`, `Lihat Progres`, `Konfirmasi Selesai`, `Laporkan Masalah`.

**Tidak ada `Batalkan Booking` normal setelah OTW.** Jika Worker FINISHED tetapi tagihan belum PAID, card **pindah Belum Bayar** meski pengerjaan fisik selesai.

## 23.4 Selesai

**Hanya Order `COMPLETED`**; diagnosis saja tidak membuat Order Selesai. Card menunjukkan tanggal selesai, foto sesudah, Worker, nilai pembayaran diagnosis+pengerjaan (komponen jelas), dan badge Selesai.

**Tombol:** `Lihat Detail`, `Lihat Bukti Sebelum/Sesudah`, `Lihat Pembayaran`, akses After-Sales bila tersedia. Historis read-only.

## 23.5 Batal

**Semua Order `CANCELLED`:** fee diagnosis unpaid expired, cancel pre-OTW, Customer reject perbaikan, sparepart tidak tersedia, remote no-response, kegagalan Provider/Worker yang dibenarkan.

**Card:** badge BATAL, **label alasan manusiawi**, Order+Provider, timestamp cancel, diagnosis valid/tidak, nilai bayar diagnosis, status refund bila ada, flag draft lanjutan bila eligible.

**Tombol:** `Lihat Detail Pembatalan`, `Lihat Hasil Diagnosis` (jika ada), `Lihat Refund/S-Pay`, `Lanjutkan Perbaikan` (jika draft tersedia). Detail wajib membedakan alasan reject vs sparepart unavailable.

---

# 24. TAB WORKER — PETA ISI, STATUS, CARD, DETAIL, TOMBOL

Tab Worker **tepat lima**: `Tugas Masuk`, `Terjadwal`, `Berlangsung`, `Selesai`, `Riwayat`.

## 24.1 Tugas Masuk

Card: nomor assignment/Order, nama jasa, Provider, ringkasan keluhan, tanggal/slot, area, batas respons 30 menit operasional, status `ASSIGNED`. Tombol `Terima`, `Tolak` (reason wajib), `Lihat Detail`.

## 24.2 Terjadwal

Card: Order+Customer/penerima sesuai izin, foto jasa, alamat operasional, jadwal, `ACCEPTED`, waktu penugasan. Tombol `Mulai Perjalanan`, `Lihat Detail`, `Buka Alamat` (tanpa GPS tracking 05B), `Laporkan Kendala`.

## 24.3 Berlangsung

Tabel aksi menurut tahap:

| Tahap | Isi utama | Tombol |
|---|---|---|
| OTW | Alamat/kontak/schedule | `Saya Sudah Tiba` |
| ARRIVED | Keluhan, data layanan | `Mulai Pemeriksaan` |
| Diagnosis draft | Form hasil, foto sebelum, tindakan, sparepart/harga | `Simpan Draft`, `Kirim Hasil` |
| Hasil final | Versi rincian final | `Catat Persetujuan di Lokasi` (Customer hadir), `Pantau Respons` |
| Remote belum approve | Respon Customer, timer 30 menit | `Lihat Status` (bukan approve untuk Customer) |
| Customer menyetujui | Scope dan harga final | `Mulai Pekerjaan` |
| Pengerjaan aktif | Tindakan, barang dipakai, checklist | `Selesaikan Pekerjaan`, `Laporkan Kendala` |

**Detail Worker:** keluhan/alamat, hasil diagnosis, spesifikasi barang, detail pekerjaan, foto, approval source/actor, bukan Finance settlement detail.

## 24.4 Selesai

Mulai saat Worker `WORKER_FINISHED`, **meskipun Order belum COMPLETED**. Card: Order, pekerjaan selesai, foto before/after, ringkasan, tanggal finish, **status Finance `Menunggu Bayar`/`PAID`/`Pembayaran Terlambat`**, status kunjungan dan konfirmasi Customer.

Tombol `Lihat Laporan`, `Cek Status Pembayaran`, `Akhiri Kunjungan` hanya ketika PAID sah, `Laporkan Kendala Pembayaran` jika mengalami exception. Worker tidak boleh menandai PAID/COMPLETED.

## 24.5 Riwayat

Assignment `REJECTED`, `EXPIRED`, `REASSIGNED`, no-show, atau Order BATAL setelah diagnosis. Card: assignment/Order, status akhir assignment, sebab, tanggal, apakah diagnosis sudah dikerjakan; read-only `Lihat Riwayat`.

---

# 25. TAB PROVIDER — PETA ISI, STATUS, CARD, DETAIL, TOMBOL

Tab Provider **tepat lima**: `Booking Masuk`, `Penugasan`, `Berlangsung`, `Selesai`, `Batal`.

## 25.1 Booking Masuk

Hanya booking **siap ditangani** (diagnosis PAID atau gratis eligible) dan belum assigned. Card: Order, jasa, Customer, keluhan, tanggal/slot, area, fee diagnosis+status, belum ada Worker. Tombol `Lihat Detail`, `Pilih Worker`, `Usulkan Jadwal Baru`.

## 25.2 Penugasan

Booking dengan assignment pending/rejected/expired atau menunggu pengganti. Card: Order, Worker pilihan, `ASSIGNED/REJECTED/EXPIRED`, waktu attempt/30 menit operasional, alasan. Tombol `Lihat Detail`, `Tugaskan Ulang`, `Usulkan Reschedule`.

## 25.3 Berlangsung

Sejak Worker ACCEPTED sampai Order benar-benar COMPLETED atau BATAL. Substatus: `Siap Berangkat`, `OTW`, `ARRIVED`, `Diagnosis`, `Menunggu Keputusan Customer`, `Sedang Dikerjakan`, `Menunggu Pembayaran`, `Pembayaran Terlambat`, `Menunggu Konfirmasi Selesai`.

Card: Order+jasa+Customer, accepted Worker, jadwal, substatus aktual, info diagnosis/biaya, status pembayaran diagnosis/pengerjaan, flag kendala. Tombol `Lihat Detail`, `Lihat Rincian`, `Lihat Bukti`, `Hubungi Worker` (opsional WhatsApp), `Tindak Lanjut Kendala`.

**Tidak ada Provider ACC harga**, namun nominal final masuk sistem; Provider tidak boleh mengedit history billing tanpa revisi sah.

## 25.4 Selesai

Order `COMPLETED` saja. Card: Order, Customer, Worker, selesai saat, ringkasan pekerjaan, total nilai dasar, tombol `Lihat Hasil`, `Lihat Status Dana`, `Buka S-Pay`. Detail Finance: hak Provider eligible, HELD, release eligibility, AVAILABLE, riwayat withdrawal via Finance sesuai izin.

## 25.5 Batal

Order `CANCELLED`, termasuk reject dan sparepart unavailable. Card: sebab, waktu, hasil diagnosis sah/tidak, refund Customer bila ada, hak diagnosis Provider dan jadwal eligible 120 jam. Tombol `Lihat Detail`, `Lihat Diagnosis`, `Lihat Refund/Dana`, `Lihat Draft Lanjutan` (jika eligible).

---

# 26. MAPPING SATU KEJADIAN → TIGA TAB + FINANCE

| Kejadian / source status | Customer | Worker | Provider | Finance |
|---|---|---|---|---|
| Booking dibuat, diagnosis berbayar PENDING | Belum Bayar — Diagnosis | Belum muncul | Belum dapat assign | DIAGNOSIS PENDING |
| Diagnosis PAID | Menunggu Jadwal | Belum muncul | Booking Masuk | DIAGNOSIS PAID |
| Diagnosis gratis sah | Menunggu Jadwal | Belum muncul | Booking Masuk | Tidak buat payment Rp0 |
| Provider assign | Menunggu Jadwal (tanpa identitas Worker) | Tugas Masuk | Penugasan | Tidak berubah |
| Worker ACCEPTED | Menunggu Jadwal (Worker tampil) | Terjadwal | Berlangsung | Tidak berubah |
| Worker OTW | Berlangsung — Menuju Lokasi | Berlangsung | Berlangsung | Tidak berubah |
| Worker ARRIVED | Berlangsung — Tiba | Berlangsung | Berlangsung | Tidak berubah |
| Diagnosis berlangsung | Berlangsung — Diperiksa | Berlangsung | Berlangsung | DIAGNOSIS tetap PAID |
| Diagnosis dikirim, remote menunggu | Berlangsung — Menunggu Keputusan | Berlangsung | Berlangsung | Belum ada tagihan pengerjaan |
| Customer/Worker record setuju | Berlangsung — Disetujui | Berlangsung — Boleh Mulai | Berlangsung | Belum ada tagihan pengerjaan |
| Worker mengerjakan | Berlangsung — Sedang Dikerjakan | Berlangsung | Berlangsung | Belum ada tagihan pengerjaan |
| Worker FINISHED | **Belum Bayar — Pengerjaan** | **Selesai — Menunggu Pembayaran** | **Berlangsung — Menunggu Bayar** | SERVICE_EXECUTION PENDING 6h |
| Finance demo success & verified | Berlangsung — Konfirmasi Selesai | Selesai — PAID; boleh Akhiri Kunjungan | Berlangsung — Menunggu Konfirmasi | SERVICE_EXECUTION PAID |
| 6h expired setelah work | Belum Bayar — Terlambat | Selesai — Kendala Bayar | Berlangsung — Terlambat | EXPIRED/replacement |
| Customer manual confirm / auto 72h eligible | Selesai | Selesai | Selesai | HELD 120h starts from COMPLETED |
| Customer cancel sebelum OTW | Batal | Riwayat jika assigned | Batal | Refund diagnosis kalau PAID |
| Customer decline setelah diagnosis | Batal | Riwayat | Batal | HELD diagnosis from valid cancel |
| Sparepart unavailable | Batal + draft lanjutan | Riwayat | Batal | HELD diagnosis from valid cancel |
| Remote no response 30m | Batal | Riwayat | Batal | HELD diagnosis if fulfilled |
| Laporan masalah aktif | Tampilkan laporan/penanganan | Status tugas + catatan | Flag penanganan | Block settlement yang terdampak |

**Kunci prioritas tab:** `CANCELLED → Batal`, `COMPLETED → Selesai`, `WORKER_FINISHED && service-payment not PAID → Belum Bayar`, `diagnosis-payment pending → Belum Bayar`, pre-OTW setelah diagnosis eligible → Menunggu Jadwal, sisanya → Berlangsung. Untuk Worker/Provider gunakan assignment/operation contexts masing-masing, **bukan salin tab Customer**.

---

# 27. DESAIN CARD — STANDAR DATA DAN PERBEDAAN AKSI

**Header umum:** gambar jasa dari snapshot, Order ID, nama jasa, badge status/substatus jelas, jadwal, Provider/Customer yang relevan, last updated. Jangan menggunakan status stale hardcoded.

**Card Customer:** service+Provider, jadwal, ringkasan keluhan, worker hanya jika ACCEPTED, label `Diagnosis PAID`, nominal tagihan/current price, tombol aksi status (Bayar/Setujui/Konfirmasi/Lihat/Batal jika eligible), **reason pembatalan** dan refund bila Batal.

**Card Worker:** service+Provider, Customer/area sesuai izin, slot, assignment/OTW/ARRIVED stage, timer 30m hanya Tugas Masuk, tombol action operasional; jika FINISHED tunjukkan status Finance tanpa angka S-Pay.

**Card Provider:** service+Customer, Worker assignment, slot, status payment, ringkasan harga dan dana yang relevant, tombol assign/reassign/monitor; bukan tombol PAID.

**Card Finance Ops:** payment reference, Order Jasa ID, `DIAGNOSIS`/`SERVICE_EXECUTION`, Customer, Provider, nominal Finance, PENDING/PAID/EXPIRED, QRIS/VA, expiry, tombol simulator **hanya role FINANCE_PAYMENT_OPS + nonproduction**.

**Empty/loading/error:** tabel kosong jujur, skeleton, server pagination/filter, retry read-only, `401/403` role denied, failed fetch, event processing delay, no duplicated card, updates on focus/polling reasonable.

---

# 28. DETAIL ORDER — LAYOUT 2 KOLOM, PANE STATUS ADAPTIF

**Desktop target:** grid dua kolom (misalnya 60/40) untuk mengurangi scroll; **mobile** satu kolom. Scroll tetap boleh untuk long diagnosis/riwayat; jangan memotong data penting.

**Header:** Order ID, service, status utama, substatus, tanggal dibuat.  
**Kolom kiri:** Identitas layanan+snapshot → Customer/penerima & alamat (sesuai role) → keluhan/foto awal → jadwal & worker → hasil diagnosis+foto → rincian tindakan/sparepart & version → bukti before/after+hasil test → notes/history.  
**Kolom kanan:** status & satu CTA utama sesuai stage → timeline timestamp → Finance diagnosis/execution (Customer QRIS/VA saat eligible) → cancellation/refund state → dana Provider/S-Pay (Provider only) → laporkan kendala.  
**Per role:** Worker form editable hanya pada tahap sah; Provider monitor/assignment; Customer approval/payment/confirmation. Jangan render tombol finansial Provider di UI Worker.

**Timeline:** hanya kejadian yang benar-benar terjadi (`BOOKED`, `DIAGNOSIS_PAID`, `ASSIGNED`, `ACCEPTED`, `OTW`, `ARRIVED`, `DIAGNOSIS_SUBMITTED`, `IN_PERSON_RECORDED/CUSTOMER_APPROVED`, `EXECUTION_STARTED`, `WORKER_FINISHED`, `SERVICE_PAYMENT_PAID`, `COMPLETED/CANCELLED`) dengan actor dan waktu. **Jangan infer timeline lengkap dari status terakhir**.

---

# 29. DAFTAR MODAL/DRAWER/FORM DAN VALIDASI

| UI | Role | Fields/Tindakan | Guard |
|---|---|---|---|
| Booking Confirmation | Customer | ringkasan keluhan/jadwal/alamat/fee diagnosis, setuju terms | Service ACTIVE, slot & coverage valid, idempotent |
| Batalkan Booking | Customer | alasan dan ringkasan refund | Hanya sebelum OTW untuk normal cancel |
| Reschedule Response | Customer | jadwal lama/baru, alasan, Terima/Tolak | Proposal valid, tidak silent |
| Worker Assignment | Provider | eligible worker & slot, Tugaskan | Membership+capability+availability, one-active |
| Reject Task | Worker | alasan wajib | ASSIGNED dalam window valid |
| Diagnosis Form | Worker | temuan, foto, tindakan, items, harga | ARRIVED, assigned accepted, valid snapshot |
| Catat Persetujuan di Lokasi | Worker | pernyataan lisan, rincian version, waktu | Customer benar di lokasi menurut catatan Worker; jelas recorded by Worker, auditable |
| Remote Approval | Customer | versi rincian, setuju/tolak/sumber part | Owner auth, response 30m, no auto |
| Pilih Sumber Sparepart | Customer+Worker sesuai izin | Provider/05A/customer, qty/compatibility | Reprice+reapprove, no double-bill |
| Tolak Perbaikan | Customer | alasan, konfirmasi diagnosis nonrefund | Diagnosis fulfilled; Order belum executing |
| Worker Finish | Worker | before/after, hasil, ringkasan, real parts | In progress, no duplicate finish |
| Tagihan Pengerjaan | Customer | Finance invoice, QRIS/VA, 6h, check status | Finance authoritative; no Customer simulate |
| Laporkan Kendala Pembayaran | Worker | alasan, kronologi, bukti opsional | Worker owner, cannot mark paid; releases requirement to stay onsite only via issue workflow |
| Laporkan Masalah | Customer | kategori, kronologi, foto opsional | Owner, valid stage, audit; block affected settlement |
| Konfirmasi Selesai | Customer | hasil+foto, agree completion | PAID + FINISHED + evidence + no blocking issue |
| Lanjutkan Perbaikan | Customer | draft prefilled, check parts & choose schedule | Eligible diagnosis, no repeat charge, no auto active |
| Tarik Saldo S-Pay | Customer/Provider | nominal, rekening, quote fee, verify | AVAILABLE, min Rp20k, permission/step-up |

---

# 30. STATUS BACKEND — DIPISAHKAN AGAR UI TIDAK MELEDAK

**Jangan menambahkan satu Order status baru untuk setiap label UI.** Konsep data yang perlu terpisah:

- **ServiceOrder** lifecycle ringkas: `CREATED`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` (nama/shape final ditetapkan dalam technical spec; ini contoh canonical, bukan route existing).
- **Booking**: `REQUESTED/READY/RESCHEDULE_PROPOSED/CANCELLED`, plus current slot & history.
- **AssignmentAttempt**: `ASSIGNED/ACCEPTED/REJECTED/EXPIRED/CANCELLED` dengan max one active.
- **Visit/Execution**: `NOT_STARTED/OTW/ARRIVED/DIAGNOSING/DIAGNOSIS_SUBMITTED/APPROVAL_PENDING/APPROVED/EXECUTING/WORKER_FINISHED` dengan timestamp dan versi diagnosis.
- **Consent**: `WORKER_RECORDED_IN_PERSON` vs `CUSTOMER_REMOTE_APPROVED/REJECTED`, actor, version, time, objections.
- **Payment** di Finance: `DIAGNOSIS` dan `SERVICE_EXECUTION`, `PENDING/PAID/EXPIRED/REFUND_*`; 05B menyimpan read model/reference, bukan ledger.
- **OperationalIssue:** `OPEN/RESOLVED/REQUIRES_REVIEW`, reason + affected funds/action. Tidak perlu mengiklankan istilah 'sengketa' pada UI.
- **FollowUpDraft:** `DRAFT/ACTIVATED/EXPIRED/INELIGIBLE` konseptual; bukan multiple visit pada Order awal.

**Perpindahan inti:** Customer booked → diagnosis eligibility → Worker accepted → OTW/arrived → diagnosis snapshot & consent → execution → WORKER_FINISHED → Finance PAID → COMPLETED. **CANCELLED** hanya pada cabang yang benar-benar eligible; overdue setelah kerja **bukan CANCELLED**.

---

# 31. DURASI DAN SCHEDULER

| Clock | Nilai | Mulai dari | Setelah habis |
|---|---|---|---|
| Bayar diagnosis | **6 jam** | Tagihan diagnosis dibuat sah di Finance | EXPIRED; Order BATAL jika belum PAID |
| Worker respons assignment | **30 menit operasional** | ASSIGNED pada jam kerja Provider/Worker valid | EXPIRED, Provider reassign |
| Customer remote respond diagnosis | **30 menit** | Rincian final tersedia pada akun Customer dan notifikasi/availability valid | Tidak auto-approve; Order awal BATAL `CUSTOMER_REMOTE_NO_RESPONSE` jika diagnosis valid |
| Persetujuan Customer **di lokasi** | **Tanpa timer 30 menit** | Koordinasi langsung | Worker catat consent; bila tidak ada persetujuan jangan mulai |
| Bayar pengerjaan | **6 jam** | Invoice pengerjaan dibuat setelah Worker FINISHED | `Pembayaran Terlambat`; **bukan** Order BATAL/COMPLETED |
| Auto completion | **72 jam** | `max(worker_finished_at, finance_paid_at)` dengan bukti/guard valid | COMPLETED jika eligible |
| Hold Provider setelah COMPLETED | **120 jam** | `completed_at` | Eligible AVAILABLE jika tidak blocked |
| Hold diagnosis pada Order BATAL setelah diagnosis | **120 jam** | `cancelled_at` sah + diagnosis fulfilled | Eligible AVAILABLE jika tidak blocked |

**Timer harus berbasis backend authoritative, timezone tersimpan jelas, scheduler idempotent, transaksi rechecked saat job berjalan.** UI hanya menampilkan countdown. Worker yang mengalami kendala pembayaran tidak diwajibkan menunggu hingga 6 jam.

**Catatan teknis:** '30 menit operasional' memerlukan jadwal kerja authoritative dari domain yang berwenang. Jika belum tersedia, backend tidak boleh mengarang 08:00–17:00 dan mengklaim timeout siap produksi.

---

# 32. FINANCE OPS, ADMIN OPERATIONS DAN S-PAY — UI PENDUKUNG

## 32.1 Finance Ops → Escrow & Bayar

Tabel invoice Barang 05A dan Jasa 05B terpisah filter jenis: Barang, Diagnosis Jasa, Pengerjaan Jasa. Tampilkan payment ref, Order ID, Customer, Merchant/Provider, created/expiry, metode QRIS/VA, nominal ledger Finance, PENDING/PAID/EXPIRED. Tombol **Simulasi Pembayaran** menggunakan mekanisme existing, hanya demo + authorized. `PENDING` **bukan** dana diterima dalam escrow.

## 32.2 Finance Ops → Refund

Daftar refund diagnosis pre-OTW, refund komponen pengerjaan jika refund eligible, success/failure reason, link ke Order, audit, S-Pay Customer funded movement. Refund tidak otomatis selesai pada saat Order BATAL.

## 32.3 Finance Ops → Dana Ditahan & S-Pay

Tampilkan hold diagnosis pada Order BATAL, hold pengerjaan setelah COMPLETED, waktu eligible release, block reason karena laporan, ledger adjustments, AVAILABLE, withdrawal/payout. Tidak ada release manual oleh Worker/Provider.

## 32.4 Admin → Service Orders Global

Pantau seluruh Service Orders 05B: id, Customer, Provider, Worker accepted, jadwal, current stage, diagnosis/payment status, service payment status, overdue, cancelled reason, last event. Detail read-only lengkap sesuai permission; tindak lanjut assignment/no-show/kendala diizin-kan, **bukan** tombol mark PAID/refund ledger langsung.

## 32.5 Provider/Customer S-Pay

**Provider:** Held dan Available serta riwayat hak diagnosis, pengerjaan, potongan CEO applicable, release_at, withdrawal.  
**Customer:** refund AVAILABLE, movement dan penarikan; tidak bisa top-up untuk membayar.  
**Bank:** min tarik Rp20.000, parsial, fee transfer dari quote dipotong nominal, gagal kembali saldo, step-up rekening sah.

---

# 33. INTEGRASI MIKROSERVIS DAN KONTRAK YANG HARUS DIBUAT

**Dokumen ini bukan Technical Spec; nama endpoint berikut merupakan kebutuhan capability, bukan klaim bahwa API sudah ada.**

- 01: authenticated owner, Provider organization membership, Worker eligibility, Buku Alamat snapshot, operating hours authoritative, verifikasi rekening/payout.
- 04: service offering active snapshot, diagnosis fee policy, coverage, slot, category requirements.
- 05B: create/list/detail Order, booking scheduling, assignment accept/reject, OTW/ARRIVED, diagnosis draft/submit, consent in-person/remote, item sourcing, finish, cancel eligible, follow-up draft/activate, customer confirmation, evidence/audit, Admin read-only.
- 06: create/read invoice `DIAGNOSIS` dan `SERVICE_EXECUTION`, stable idempotent billing, expiry 6h, Finance Ops simulate PAID **existing**, durable payment event to 05B, refund from valid 05B decision, held entitlement for `COMPLETED` and `CANCELLED_WITH_DIAGNOSIS_FULFILLED`, conditional hold clearance, payout/withdrawal, credit Customer S-Pay on successful funded refund.
- 03/05A: optional `related_product_order` reference for customer-purchased sparepart; stock/shipping actual without assuming same-day or cross-city.
- Notification/issue domain: consent ready, assignment, OTW, worker arrived, payment pending/PAID, overtime payment, completion, refund, follow-up and reports.

**Security:** service-to-service actor identity cryptographically authenticated and tied to authorization; `X-Source-Service` browser-supplied alone insufficient. Every request scoped to owner/organization/assignment. Avoid direct DB access across services.

---

# 34. AUDIT, SNAPSHOT, IDEMPOTENCY, DAN PRIVASI

**Historical snapshot:** service name/offering/provider, fee diagnosis, customer recipient/address/slot, worker assignment attempts, diagnosis version, before/after evidence, approved work and part line-items, price version and consent source, payment links, reasons/timestamps, Finance fee policy version.

**Audit important:** order created, diagnosis invoice, PAID event, assign/reassign/reject/expire, OTW/arrive, diagnosis submitted, consent recorded, remote approve/reject/timeout, source part change, execution started, worker finish, service invoice created/expired/replaced, Finance PAID, close visit, customer confirm/auto, cancellation reason, refund requested/succeeded, hold/release/withdrawal, issue opened/resolved, draft activated.

**Idempotency:** create Order, booking, assignment, diagnosis final, consent, finish, invoice, callback/event, cancel, refund, hold release, cashout. Repeat requests/retry/scheduler/duplicate mock simulate **must not** double-charge or double-credit.

**Privasi:** Customer only own Order, Provider only own org, Worker only assigned jobs, Finance only permitted ledger views, Admin only permitted global views; mask contacts in lists, show full only when operationally needed; evidence file access signed/authorized; no fake Worker profile before ACCEPTED.

---

# 35. EDGE CASE MASTER / ATURAN PENGAMAN

| Kasus | Penanganan bisnis ringkas |
|---|---|
| Customer double-click booking | Satu Order/Booking/invoice per idempotency key |
| Booking saat service/Provider baru nonaktif | Server reject sebelum charge; existing history preserved |
| Slot hilang saat submit | Tolak/suggest slot ulang, jangan double booking |
| Diagnosis fee gratis | Booking eligible tanpa payment Rp0 palsu |
| Diagnosis PENDING tapi Provider assign | Block |
| Finance mock success dobel | PAID sekali; no double ledger/event |
| Finance event terlambat | Read authoritative status + replay idempotent, no blind rollback |
| Assignment Worker timeout 30m | EXPIRED, reassign; Customer tidak melihat Worker pending |
| Worker reject | Reason wajib, attempts historical |
| Worker no-show | Provider reassign/reschedule; no survey revenue if not delivered |
| Customer no-show | Bukti + operational review, no false diagnosis fulfillment |
| Worker OTW, Customer ingin batal | Normal cancel disabled; Laporkan Kendala |
| Diagnosis remote tak direspons 30m | Tidak auto-approve, BATAL if valid final + delivery availability |
| Worker catat consent tanpa izin | Customer laporkan, audit; tidak otomatis menagih/menutup laporan diam-diam |
| Harga berubah setelah consent | Revisions + new consent; approved version immutable |
| Customer menolak part Provider | Ganti source, recalc valid, consent ulang |
| Part SERVIO dibeli 05A tapi belum datang | Jika tak bisa digunakan kunjungan ini → BATAL 05B + draft follow-up; 05A tetap independen |
| Part dari Customer tidak aman | Worker boleh menolak; BATAL jika tidak ada alternatif aman |
| Part Provider terpakai tak sesuai versi | Tidak boleh charge berbeda tanpa version+consent sah |
| Worker finish tanpa foto sesudah | Block finish atau controlled evidence exception sesuai kategori |
| Pekerjaan selesai, Finance belum PAID | Customer Belum Bayar, Worker Selesai, Provider Berlangsung; no completion |
| Payment simulator belum diklik | Tetap PENDING, tidak tiba-tiba PAID |
| Worker tidak bisa menunggu payment | Laporkan Kendala Pembayaran, dapat meninggalkan lokasi aman; debt/issue tetap tercatat |
| Payment 6h expired setelah work | Overdue, replacement invoice untuk **satu kewajiban**, no auto BATAL/COMPLETED |
| Payment lama PAID terlambat setelah replacement dibuat | Reconcile; jangan double charge/credit |
| Customer lapor pekerjaan bermasalah | Audit + hold affected funds and customer resolution |
| Customer belum konfirmasi 72h, payment belum PAID | **Tidak** auto-COMPLETED |
| Customer belum konfirmasi 72h, ada laporan aktif | **Tidak** auto-COMPLETED sampai eligible |
| BATAL dengan diagnosis sah | Diagnosis hold 120h lalu available jika eligible, **bukan COMPLETED palsu** |
| BATAL sebelum OTW dengan diagnosis PAID | Refund penuh diagnosis after Finance SUCCEEDED |
| Refund PENDING, Customer lihat BATAL | Tampilkan refund PENDING; S-Pay belum dikredit |
| Transfer ke bank gagal | S-Pay locked funds kembali tersedia setelah confirmed failed |
| Order lanjutan dari part unavailable | Prefill diagnosis/keluhan; no second diagnosis fee; no auto booking/assignment |
| Follow-up disalahgunakan untuk masalah lain | Reject entitlement, require explicit new workflow, never silent duplicate fee |
| Kondisi berbahaya | Worker hentikan pekerjaan, Provider/Admin tindak lanjut; keselamatan utama |
| Provider suspended sesudah diagnosis | Freeze pending mutation yang melanggar guard; preserve history |
| Customer mencoba buka Order orang lain | 403/404 scoped authorization, tanpa PII leak |
| Worker buka tugas bukan miliknya | Access denied, audit |

---

# 36. ACCEPTANCE TEST — FRONTEND, BACKEND, DAN END-TO-END

## 36.1 Booking dan diagnosis

- [ ] Customer dari detail katalog → Pesan Jasa → form keluhan/alamat/jadwal → ringkasan.
- [ ] Booking berbayar menciptakan tagihan diagnosis **tanpa biaya platform**, PENDING 6 jam, Provider belum dapat assign.
- [ ] Finance Ops simulator existing untuk invoice diagnosis → PAID → booking muncul Provider.
- [ ] Booking diagnosis gratis tidak membuat fake PAID/invoice Rp0.
- [ ] Cancel sebelum OTW → Customer Batal + refund penuh paid diagnosis → Customer S-Pay hanya sesudah SUCCEEDED.

## 36.2 Assignment dan operasional

- [ ] Provider pilih Worker eligible; Worker Tugas Masuk, Customer belum lihat identitas.
- [ ] Worker Accept → Customer baru lihat Worker, Worker Terjadwal, Provider Berlangsung.
- [ ] Worker Reject/30m operational timeout → reassign, attempts tersimpan.
- [ ] OTW/ARRIVED hanya valid setelah tahap sebelumnya; Customer cancel normal disembunyikan sejak OTW.
- [ ] Reschedule oleh Provider butuh Customer acceptance.

## 36.3 Diagnosis, consent, sparepart

- [ ] Worker isi satu form diagnosis+harga+foto, draft dan final version aman.
- [ ] Customer di lokasi: Worker record consent lisan dengan actor Worker, Customer dapat melaporkan ketidaksesuaian.
- [ ] Customer remote: approve/reject via akun sendiri, 30 menit tanpa auto approve.
- [ ] Ganti sparepart Provider → Customer/05A source membuat recalculation, approved version baru.
- [ ] Part 05A terpisah dan tidak duplicate-billed pada 05B.
- [ ] Customer decline/sparepart unavailable → BATAL, diagnosis fulfilled nonrefund, draft follow-up khusus part unavailable.

## 36.4 Execution dan payment AFTER finish

- [ ] Consent valid → Worker bisa Mulai Pekerjaan walau **belum** ada invoice pengerjaan.
- [ ] Worker FINISHED wajib before+after foto, ringkasan, test; invoice pengerjaan baru dibuat setelah finish.
- [ ] Customer Belum Bayar, Worker Selesai, Provider Berlangsung saat invoice pengerjaan PENDING.
- [ ] Finance Ops belum klik simulate → PENDING. Setelah simulate SUCCESS → PAID and UI role sync.
- [ ] Worker `Akhiri Kunjungan` normal hanya saat PAID; exception `Laporkan Kendala Pembayaran` berjalan jika gagal.
- [ ] 6 jam overdue **tidak** auto CANCELLED/COMPLETED; retry/replacement invoice tidak double-charge.
- [ ] Customer konfirmasi manual / auto setelah 72h dari FINISHED+PAID eligible, no issue aktif.

## 36.5 Finance dana/Refund/S-Pay

- [ ] Provider right amount HELD 120h setelah COMPLETED, kemudian AVAILABLE sekali.
- [ ] Order BATAL setelah diagnosis valid melepaskan hanya diagnosis 120h setelah cancel sah, sekali.
- [ ] Diagnosis yang direferensikan follow-up tidak membuat tagihan diagnosis ganda/hak Provider ganda.
- [ ] CEO fee names/targets/version applied pada pengerjaan; diagnosis exempt platform fees, tanpa hardcode.
- [ ] Customer refund SUCCEEDED → S-Pay, min withdraw Rp20k, partial/transfer fee/failure rules.
- [ ] Finance PENDING tidak dihitung sebagai dana diterima, PAID tidak otomatis AVAILABLE.
- [ ] Tidak ada browser credential leak / tenant cross-read / counterfeit financial event.

## 36.6 UI dan status

- [ ] Lima tab Customer/Worker/Provider sesuai mapping, counter/filter akurat, satu Order tampil pada tab yang tepat.
- [ ] Card menampilkan nomor Order, status/substatus, tanggal, pihak, payment status, satu CTA benar.
- [ ] Detail dua kolom desktop dan responsif mobile, histories, fotos, Finance info per-role.
- [ ] Semua modal memvalidasi hak akses, actor, reason dan status, not only frontend disabled.
- [ ] Admin global dapat memantau Service Orders secara read-only sesuai izin.
- [ ] Error/network retry/refresh tidak menggandakan Order, assignment, invoice, credit.

---

# 37. URUTAN IMPLEMENTASI YANG DI-ACC

1. Kunci dan review **planning 05B V2** ini sebagai acuan bisnis. Jangan implementasi berdasarkan baseline lama yang bertentangan.
2. Turunkan **Technical Specification**: actual migrations/database, state machines, API contracts, RBAC, optimistic locks, service events, idempotency, scheduler, Finance balance/refund and reconciliation.
3. Implementasi **backend 05B** dan **perluasan backend 06** khusus diagnosis/service execution/provider entitlements; Finance existing Order Barang **tidak boleh rusak**. Verifikasi 01/04/05A dependencies, tidak fake bypass.
4. Setelah backend teruji, implementasi **frontend Customer–Worker–Provider 05B** serta **Finance Ops 06 untuk Order Jasa** (reuse simulasi PAID existing); tambahkan Admin Global Service Orders read-only.
5. E2E multi-role: booking diagnosis → Finance simulate paid → assign/accept → OTW/arrive → diagnosis → consent → execute → finish → invoice pengerjaan → Finance simulate paid → complete → HELD 120h → AVAILABLE → withdraw; tes semua cabang batal/refund/overdue/follow-up.

---

# 38. TIDAK BOLEH DIKLAIM SELESAI SEBELUM VERIFIKASI KONTRAK

**Dependency implementasi wajib (BUKAN perubahan keputusan bisnis):**

1. Finance 06 existing telah disetujui user bekerja untuk Order Barang 05A, tetapi **pembayaran 05B belum diimplementasikan**. Perlu actual contract untuk dua jenis invoice, provider ledger/S-Pay, release BATAL with diagnosis, refund jasa, event outbox/inbox, overdue/replacement bill dan reconciliation.
2. Jam operasional Worker/Provider authoritative untuk 30 menit operasional assignment, serta sumber availability notifikasi Customer remote.
3. Dokumen 05B awal menyebut MongoDB, sedangkan services 05A/06 current disebut MySQL; **pastikan stack repo sebelum menulis technical spec**.
4. Ketentuan detail pembuktian persetujuan di lokasi, pembatalan setelah pekerjaan telah dimulai, dan prosedur ketika Customer mempersoalkan tagihan perlu dicocokkan dengan modul penanganan masalah resmi. **Jangan menganggap Worker record = bukti tidak terbantahkan**.
5. Fee diagnosis exception dan tax compliance harus dievaluasi Finance/CEO dari kebijakan aktual; tidak menyalin formula barang ke jasa.
6. Follow-up diagnosis eligibility untuk kondisi berubah dan batas penggunaan harus dibuat defensible. Jangan membuat survei gratis tak terbatas atau otomatis double-charge.
7. Finance settlement hold hanya boleh release setelah clearance yang sah. **Tidak ada claim semua kasus pasti selesai otomatis**, terutama pembayaran overdue dan laporan masalah.

**Status penutupan:** **BUSINESS FLOW & UI BASELINE LOCKED. IMPLEMENTATION NOT YET VERIFIED / TECHNICAL CONTRACT PENDING.** Tidak ada alasan menunda draft planning karena ini adalah hal yang harus diturunkan secara eksplisit dalam technical spec. Namun belum boleh menyatakan 'nol gap implementasi' atau 'sudah siap produksi'.

---

# 39. CHECKLIST REVIEW PLANNING V2 SEBELUM TECHNICAL SPEC

- [x] Jalur normal Order Jasa dari tombol Pesan Jasa sampai S-Pay tersusun.
- [x] Tiga sumber sparepart dan larangan affiliate/double bill jelas.
- [x] Persetujuan di lokasi vs remote (30 menit) jelas secara UX dan audit.
- [x] Pengerjaan sebelum pembayaran final, pembayaran 6 jam sesudah selesai, Finance demo PAID jelas.
- [x] Penanganan bayar tertunda dibuat jalur pengecualian kecil, bukan alur utama.
- [x] Semua lima tab Customer/Worker/Provider, status, card, detail, tombol/modal dan mapping tersusun.
- [x] Pembatalan sebelum OTW, setelah diagnosis, part unavailable, refund, draft follow-up, diagnosis no double charge ditentukan.
- [x] Dana Provider 120h setelah COMPLETED atau diagnosis BATAL sah, Customer refund & S-Pay ditentukan.
- [x] Skenario E2E dan matriks pengecualian tersedia.
- [ ] Implementasi kontrak Finance 05B dan security service-to-service terverifikasi (**Tahap technical/backend**).
- [ ] Actual service 01/04 timing/operating hours dan persistence 05B terverifikasi (**Tahap technical/backend**).
- [ ] Validasi use case khusus hasil kerja dipermasalahkan/customer menolak membayar sesuai mekanisme penanganan masalah resmi (**Tahap technical/backend**).

**END — SERVIO PHASE 05B ORDER JASA PLANNING V2 / BUSINESS BASELINE.**
