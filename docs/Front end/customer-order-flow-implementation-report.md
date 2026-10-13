# SERVIO — CUSTOMER ORDER FLOW REVISION
## LOCKED IMPLEMENTATION & VERIFICATION REPORT
### Customer Service Order + Pricing + Sparepart + Product Order + Affiliate + Payment + Tracking + Completion

---

## 1. EXECUTIVE SUMMARY

Laporan ini mendokumentasikan implementasi dan verifikasi menyeluruh untuk revisi **Customer Order Flow** pada ekosistem platform Servio. Revisi ini mengunci arsitektur kanonikal di mana **Service Order** bertindak sebagai lifecycle utama transaksi jasa, dengan Customer sebagai **Final Approval Owner**, **Purchase/Payment Owner**, dan **Completion Confirmation Owner**.

Seluruh 15 skenario alur ujung-ke-ujung (FLOW 01 hingga FLOW 15), 28 skenario deterministik (SC-C01 hingga SC-C28), integrasi single source of truth repositori domain, pemisahan komersial afiliasi toko mitra tanpa markup pelanggan (*Zero Customer Surcharge*), sistem pencatatan kuitansi inkremental tanpa mutasi riwayat (*no silent mutation*), proteksi sengketa (*escrow freeze*), penerbitan sertifikat garansi Servio Shield otomatis, serta isolasi RBAC telah diuji dan diverifikasi secara komprehensif.

Status akhir: **READY FOR FINAL END-TO-END (100% GREEN, ZERO REGRESSIONS)**.

---

## 2. IMPLEMENTATION SCOPE

Implementasi mencakup pembaruan dan pembuatan komponen-komponen utama berikut:

1. **Domain Types & Contract Extension** (`src/types/domain.ts`):
   - `ServicePaymentRecord`: model penerimaan pembayaran multi-tahap (uang muka, selisih tambahan, pelunasan suku cadang).
   - `CustomerDisputeSubmission`: penyerahan komplain resmi dengan pembekuan escrow otomatis.
   - Perluasan atribut harga (`initialEstimateRange`, `isMandatoryScope`, `alternativeProductId`, dll.).
2. **Central In-Memory Domain Repository** (`src/lib/repository/domainRepository.ts`):
   - Implementasi 11 method kanonikal Customer: `customerApprovePriceAdjustment`, `customerRejectPriceAdjustment`, `customerAcceptRecommendation`, `customerChooseAlternativeProduct`, `customerOptSelfPurchase`, `customerPayOrder`, `customerFailPayment`, `customerConfirmCompletion`, `customerReportDispute`, `customerSubmitReview`, `customerRebookOrder`.
   - Sinkronisasi lookup pesanan dengan alias mapping (mendukung lookup berbasis ID kanonikal dan alias skenario `SC-C01` s/d `SC-C28`).
3. **Deterministic Scenario Fixtures** (`src/mocks/customerScenarios.ts`):
   - 28 data fixture lengkap (SC-C01 hingga SC-C28) yang mencakup 6 kategori operasional utama.
4. **Dev / Demo Scenario Selector Component** (`src/components/navigation/CustomerDemoScenarioSelector.tsx`):
   - Komponen selector interaktif yang dikelompokkan berdasarkan kategori, dengan indikator status dan deskripsi skenario, terpasang pada layar daftar pesanan dan detail pesanan.
5. **Customer Orders Master Dashboard** (`src/app/(customer)/orders/page.tsx`):
   - Desain ulang lengkap dengan 7 tab filter: `Semua`, `Jasa`, `Produk`, `Menunggu Tindakan`, `Aktif`, `Selesai`, `Dibatalkan`.
   - Card pesanan responsif dengan badge tindakan pelanggan, ringkasan suku cadang, dan rincian kurir instan rekanan.
6. **Customer Service Order Detail Screen** (`src/app/(customer)/orders/[orderId]/page.tsx`):
   - Layar detail terpadu dengan banner *Next Best Action*, *Stepper Timeline*, *Diagnosis Findings Card*, *Price Adjustment Review & Modal*, *Spareparts Section* (Provider-owned, Partner Store, Self-purchase), *Payment History & Gateway Simulation*, *Proof of Service*, *Completion Modal*, *Dispute Form Modal*, *Rating & Review Form*, *Servio Shield Warranty Certificate Card*, dan *Mobile Sticky Action Bar*.
7. **Feature Hook Layer** (`src/features/orders/useServiceOrder.ts`):
   - Wrapper hook reaktif yang menghubungkan UI Customer dengan repositori domain kanonikal.
8. **Automated Test Suite** (`tests/customer-order-flow.test.ts`):
   - 17 pengujian otomatis yang memvalidasi FLOW 01 hingga FLOW 15, integritas 28 skenario, dan batasan batas otoritas RBAC.

---

## 3. LOCKED CONTRACTS FOLLOWED

Implementasi tunduk sepenuhnya pada kontrak terkunci berikut:

1. `SERVIO_SERVICE_ORDER_PRICING_FLOW_REVISION_LOCKED`:
   - Estimasi awal adalah rentang (*range*), bukan angka mati.
   - Hasil diagnosis teknisi di lokasi wajib transparan ke pelanggan.
   - Penyesuaian harga memerlukan persetujuan eksplisit pelanggan.
   - Otoritas pelanggan membedakan perbaikan wajib (*mandatory*) vs pekerjaan tambahan pilihan (*optional*).
2. `SERVIO_PROVIDER_ORDER_OPERATIONAL_FLOW_LOCKED`:
   - Service Order adalah transaksi inti (*anchor order*).
   - Pengadaan material provider, toko rekanan, maupun mandiri terdokumentasi terpadu pada Service Order.
3. `PRE_CUSTOMER_FULL_AUDIT_REPORT`:
   - Single source of truth repositori domain dipertahankan (tanpa duplikasi engine).
   - Penegakan batasan multi-tenant (Merchant A tidak dapat menyetujui kemitraan Merchant B; Worker tidak dapat mencairkan dana sendiri).
4. `IMPLEMENTASI_AFFILIATE_COMMERCIAL_MERCHANT_ENROLLMENT_FINALIZATION`:
   - Biaya komisi afiliasi 5% dipotong murni dari payout merchant (*net settlement*).
   - Biaya yang dibayar pelanggan untuk suku cadang rekanan adalah persis harga katalog toko + ongkir standar (*Zero Customer Surcharge*).

---

## 4. SERVICE ORDER LIFECYCLE IMPLEMENTATION

Platform mengonsolidasikan seluruh perjalanan transaksi layanan di bawah Service Order:

```
[Customer Booking / Request] 
         │
         ▼
[Provider Confirmation & Worker Assignment] (SC-C01, SC-C02)
         │
         ▼
[Transit / En Route] (SC-C03) ── GPS Live Tracking
         │
         ▼
[Arrival & On-Site Diagnosis] (SC-C04, SC-C05)
         │
    ┌────┴────────────────────────┐
    ▼                             ▼
[No Finding / Standard]    [Price Adjustment / Sparepart Proposed] (SC-C06 - SC-C17)
    │                             │
    │                             ├─ Customer Approves ──► Pay Difference (SC-C20)
    │                             ├─ Customer Rejects Mandatory ──► Execution Blocked (SC-C09)
    │                             └─ Customer Rejects Optional ──► Standard Scope Resumes (SC-C08)
    │                             │
    └──────────────┬──────────────┘
                   ▼
         [Execution In Progress] (SC-C21) ── SOP Checklist Verification
                   │
                   ▼
         [Proof Uploaded by Worker] (SC-C22) ── Before/After Photos & Test Metrics
                   │
                   ▼
         [Customer Completion Confirmation] (SC-C23)
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
    [CONFIRMED]         [DISPUTED] (SC-C25)
         │                   │
         ├─ Escrow Released  └─ Escrow Frozen
         ├─ Warranty Active     Mediation by Support
         ▼
    [COMPLETED & REVIEW] (SC-C24, SC-C26, SC-C27, SC-C28)
```

---

## 5. ORDER STATUS MAP & TRANSITION MATRIX

Berikut adalah matriks transisi status kanonikal pesanan jasa:

| Status Kanonikal | Label Tampilan Customer | Deskripsi & Trigger | Tindakan Customer yang Tersedia |
|---|---|---|---|
| `DRAFT` | Menunggu Konfirmasi Mitra | Booking baru dibuat oleh customer | Batalkan Booking |
| `PENDING_WORKER` | Teknisi Ditugaskan | Mitra provider menugaskan teknisi | Lihat Profil Teknisi |
| `TECHNICIAN_DISPATCHED` | Teknisi Sedang Menuju Lokasi | Teknisi berangkat menuju alamat | Lacak Posisi Teknisi (Live Map) |
| `DIAGNOSING` | Teknisi Tiba / Diagnosis | Teknisi tiba & memeriksa unit | Pantau Catatan Pemeriksaan |
| `WAITING_APPROVAL` | Menunggu Persetujuan Anda | Ada penyesuaian biaya atau rekomendasi part | Setujui / Tolak Proposal |
| `PAYMENT_PENDING` | Menunggu Pembayaran | Uang muka atau selisih biaya disetujui | Bayar via Gateway (VA, QRIS, dll) |
| `WAITING_SPAREPART` | Menunggu Suku Cadang | Suku cadang toko rekanan dipesan / beli mandiri | Lacak Kurir / Konfirmasi Part Tiba |
| `IN_PROGRESS` | Pekerjaan Sedang Berlangsung | Teknisi mengerjakan unit sesuai SOP | Pantau Progres Pengerjaan |
| `AWAITING_PROOF_REVIEW` | Menunggu Konfirmasi Anda | Bukti kerja diunggah oleh teknisi | Konfirmasi Selesai / Ajukan Komplain |
| `COMPLETED` | Pesanan Selesai | Customer menyetujui hasil kerja | Unduh Kuitansi, Beri Ulasan, Klaim Garansi |
| `DISPUTED` | Sengketa Aktif (Mediasi CS) | Customer mengajukan komplain hasil kerja | Pantau Mediasi Customer Support |
| `CANCELLED` | Pesanan Dibatalkan | Pesanan dibatalkan sebelum pelaksanaan | Pesan Ulang Layanan |

---

## 6. CUSTOMER AUTHORITY MATRIX

Untuk menjamin kedaulatan pelanggan, otoritas operasional diatur secara ketat:

| Titik Keputusan | Otoritas Customer | Otoritas Teknisi (Worker) | Otoritas Bengkel (Provider) |
|---|---|---|---|
| **Estimasi Awal** | Menerima estimasi rentang (*read-only*) | Tidak dapat mengunci angka mati | Menentukan rentang biaya awal |
| **Hasil Diagnosis** | Membaca temuan foto & parameter uji | Mengunggah foto & kesimpulan teknis | Memantau kesimpulan teknis |
| **Penyesuaian Biaya** | **Pemberi Persetujuan Tunggal (Exclusive Owner)** | Mengajukan proposal justifikasi | Memberikan otorisasi internal |
| **Pilihan Suku Cadang** | **Bebas Memilih (Opsi A, B, atau C)** | Merekomendasikan produk rekanan | Menyediakan stok workshop |
| **Pembayaran** | **Pemilik Pembayaran Eksklusif** | Dilarang menerima pembayaran langsung tanpa sistem | Menerima payout setelah rilis escrow |
| **Penyelesaian Kerja** | **Konfirmator Tunggal Rilis Escrow** | Mengunggah bukti selesai | Menerima pencairan escrow paska konfirmasi |
| **Sengketa & Garansi** | **Pemilik Hak Klaim & Sengketa** | Menghadiri mediasi / visit ulang | Menindaklanjuti garansi Servio Shield |

---

## 7. DISCOVERY TO BOOKING ARCHITECTURE

1. Pelanggan memilih jenis layanan dari katalog servis berdasarkan domain (HVAC, Kelistrikan, Perpipaan, Elektronik).
2. Sistem menyajikan informasi rentang estimasi biaya awal (*initial estimate range*), misal Rp 150.000 - Rp 350.000, serta rincian biaya survei/transport transparan.
3. Booking awal berstatus `DRAFT` atau `PENDING_CONFIRMATION` tanpa langsung memotong dana penuh sampai ruang lingkup terkonfirmasi.

---

## 8. DIAGNOSIS & FINDINGS VISIBILITY

1. Begitu teknisi tiba dan melakukan inspeksi, hasil diagnosis ditampilkan langsung di UI Customer dalam format kartu temuan (*Diagnosis Findings Card*):
   - **Unit yang Diperiksa**: Tipe, merek, dan kapasitas unit.
   - **Temuan Visual & Bukti Foto**: Foto komponen rusak/aus di lokasi.
   - **Parameter Teknis Terukur**: Tekanan refrigerant (PSI), arus kompresor (Ampere), tegangan listrik (Volt).
   - **Tindakan yang Disarankan**: Rekomendasi teknisi beserta justifikasi keselamatan unit.

---

## 9. PRICE ADJUSTMENT MECHANISM (MANDATORY VS OPTIONAL)

Platform mengimplementasikan penanganan proposal perubahan biaya dengan pembedaan ruang lingkup yang tegas:

### A. Ruang Lingkup Wajib (*Mandatory Scope*)
- Contoh: Penggantian kapasitor meledak agar kompresor bisa hidup.
- **Jika Disetujui Customer**: Status pesanan beralih ke `PAYMENT_PENDING` untuk selisih biaya. Begitu dibayar, status menjadi `IN_PROGRESS`.
- **Jika Ditolak Customer**: Pesanan beralih ke `WAITING_APPROVAL` dengan bendera `sparepartBlockStatus.isBlocked = true`. Pengerjaan dihentikan dengan aman untuk melindungi unit pelanggan dan keselamatan teknisi. Dana escrow awal tetap aman tertahan di penampung.

### B. Ruang Lingkup Pilihan / Tambahan (*Optional Scope*)
- Contoh: Cuci kimia sirip outdoor (*chemical cleaning*) untuk meningkatkan efisiensi pendinginan.
- **Jika Disetujui Customer**: Biaya tambahan ditambahkan ke tagihan.
- **Jika Ditolak Customer**: Pengerjaan **tidak terblokir**. Status pesanan tetap `IN_PROGRESS` dan teknisi melanjutkan pencucian standar yang sudah dibayar di awal.

---

## 10. PROVIDER SPAREPART FLOW (OPSI A)

- Material/suku cadang resmi yang dimiliki oleh bengkel mitra penyedia jasa (*Provider-Owned Inventory*).
- Informasi nomor part, nama material, dan harga part ditampilkan secara rinci.
- Nilai material dimasukkan ke dalam komponen `materialFee` pesanan jasa kanonikal tanpa perantara kurir, langsung digunakan dari stok bengkel.

---

## 11. PARTNER MERCHANT RECOMMENDATION FLOW (OPSI B)

1. Teknisi membuat rekomendasi suku cadang dari Toko Rekanan resmi yang terafiliasi (`ProductRecommendation`).
2. Rekomendasi muncul di aplikasi Customer dengan deskripsi spesifikasi, foto produk, reputasi toko, dan tautan produk.
3. Begitu Customer menekan **"Beli Produk Ini"**:
   - Sistem secara otomatis membuat `MerchantOrder` kanonikal pada toko mitra bersangkutan.
   - Atribusi afiliasi (`AffiliateAttribution`) dicatat, menautkan pesanan produk dengan teknisi dan provider perekomendasi.
   - Pesanan jasa diperbarui statusnya menjadi `WAITING_SPAREPART` dan menyimpan `relatedProductOrderIds`.

---

## 12. ZERO CUSTOMER SURCHARGE ENFORCEMENT

Sesuai kontrak komersial Servio:
- **Pelanggan tidak pernah dikenakan biaya komisi afiliasi tambahan**.
- Harga produk yang dibayar pelanggan adalah **persis sama** dengan harga katalog toko mitra (misal Rp 180.000) ditambah ongkos kirim standar kurir instan (Rp 15.000). Total tagihan pelanggan = Rp 195.000.
- Komisi afiliasi 5% (Rp 9.000) **sepenuhnya dipotong dari payout merchant** saat proses *settlement* toko.
- Catatan transparansi ditampilkan jelas pada kartu rekomendasi: *"Komisi Teknisi Ditanggung Mitra Toko (Affiliate Rekanan 0 Surcharge Pelanggan)"*.

---

## 13. ALTERNATIVE PRODUCT & MERCHANT CHOICE FLOW

1. Pelanggan memiliki kebebasan penuh untuk mencari dan memilih suku cadang dari toko rekanan lain dalam platform (misal toko dengan harga promo atau lokasi lebih dekat).
2. Sistem memfasilitasi pembuatan `MerchantOrder` untuk toko alternatif pilihan pelanggan.
3. Atribusi afiliasi teknisi awal **tidak dialihkan** ke pesanan toko alternatif ini (`isAffiliateOrder = false`), mencegah pencurian komisi dan menjaga integritas ekonomi platform.

---

## 14. SELF-PURCHASE FLOW & SAFETY DISCLAIMERS (OPSI C)

1. Pelanggan dapat memilih opsi **"Pengadaan Mandiri (Beli Sendiri)"**.
2. Sistem mengubah status kebutuhan part menjadi `sourceType: "CUSTOMER_SELF_PURCHASE"` dan `procurementStatus: "CUSTOMER_PENDING"`.
3. UI Customer menampilkan panduan spesifikasi teknis part (misal: "Kapasitor 35 mikrofarad 450V tipe soket ganda") dan catatan batasan garansi: *"Garansi suku cadang mandiri mengikuti garansi toko tempat Anda membeli; Servio Shield hanya menjamin kualitas pengerjaan dan jasa pemasangan teknisi"*.

---

## 15. PAYMENT ARCHITECTURE (ESCROW & INCREMENTAL RECEIPTS)

- Setiap transaksi pembayaran diproses melalui simulasi payment gateway kanonikal Servio (`GatewayTransaction`).
- Dana ditahan di rekening penampung aman (*Escrow Lock*) dan tidak langsung dicairkan ke teknisi maupun provider sampai pekerjaan selesai dan disetujui pelanggan.
- Jika pembayaran gagal atau kedaluwarsa (`customerFailPayment`), pesanan tetap `PAYMENT_PENDING`, escrow tidak terkunci, dan teknisi tidak dapat memulai pengerjaan.

---

## 16. MULTI-PAYMENT HISTORY & IMMUTABILITY

Platform menjamin integritas riwayat pembayaran tanpa mutasi diam-diam (*no silent mutation*):
- Pembayaran awal (*Initial Payment*): Dicatat dengan ID kuitansi permanen (misal `RCT-2026-8806`, Rp 350.000).
- Pembayaran selisih/tambahan (*Additional Payment*): Dicatat sebagai entri baru yang terpisah (misal `PAY-002`, Rp 215.000).
- Setiap kuitansi memiliki nomor bukti, metode pembayaran, stempel waktu, dan catatan peruntukan yang transparan dan dapat diunduh kapan saja oleh pelanggan.

---

## 17. EXECUTION TRACKING & LIVE MAP CONTEXT

- Saat teknisi berangkat (`TECHNICIAN_DISPATCHED`), UI menampilkan visual pelacakan lokasi (*Live Worker Tracking*).
- Informasi kendaraan (nomor polisi sepeda motor), foto teknisi, nomor telepon darurat, dan estimasi waktu tiba (ETA) ditampilkan secara *real-time*.
- Saat teknisi check-in di lokasi, sistem memperbarui status ke `DIAGNOSING` atau `ON_SITE`.

---

## 18. PROOF OF SERVICE VISIBILITY & CUSTOMER VERIFICATION

Sebelum pesanan dapat diselesaikan, teknisi wajib mengunggah bukti hasil kerja (`ProofOfService`):
1. **Foto Sebelum Pengerjaan (*Before*)**: Menampilkan kondisi awal unit yang kotor/rusak.
2. **Foto Sesudah Pengerjaan (*After*)**: Menampilkan hasil pembersihan/pemasangan komponen baru.
3. **Data Hasil Uji Parameter**: Menampilkan nilai pengukuran nyata (contoh: Suhu hembusan 16°C vs standar 16-18°C; Tekanan freon 140 PSI vs standar 135-150 PSI).
4. Pelanggan dapat meninjau seluruh foto dan data ini sebelum mengambil keputusan persetujuan.

---

## 19. CUSTOMER COMPLETION AUTHORITY & ESCROW RELEASE

1. Otoritas penyelesaian layanan berada **100% di tangan Pelanggan**.
2. Teknisi hanya dapat mengajukan status `AWAITING_PROOF_REVIEW`.
3. Hanya saat pelanggan menekan tombol **"Konfirmasi Pekerjaan Selesai"**:
   - Status pesanan berubah menjadi `COMPLETED`.
   - Bendera escrow dilepaskan (`isEscrowLocked = false`), mengizinkan Finance mendistribusikan payout ke mitra.
   - Sertifikat garansi resmi **Servio Shield** diterbitkan seketika.

---

## 20. CUSTOMER DISPUTE FILING & ESCROW FREEZE

Jika hasil kerja tidak memuaskan atau unit bermasalah:
1. Pelanggan dapat menekan tombol **"Ada Kendala? Ajukan Masalah / Sengketa"**.
2. Modal komplain menyediakan pilihan kategori (Unit Masih Bermasalah, Pengerjaan Tidak Sesuai SOP, Kerusakan Akibat Servis, Keluhan Perilaku Teknisi) dan kolom rincian keluhan.
3. Begitu dikirim (`customerReportDispute`):
   - Status pesanan seketika beralih menjadi `DISPUTED`.
   - Dana escrow **dibekukan seketika** (*Escrow Frozen*).
   - Kasus sengketa resmi (`DisputeCase`) dibuat dan ditugaskan ke Customer Support / Tim Mediasi untuk investigasi atau kunjungan ulang teknisi gratis (*Free Rework*).

---

## 21. SERVIO SHIELD WARRANTY ACTIVATION & TERMS

- Sertifikat garansi Servio Shield (`WarrantyCertificate`) aktif otomatis saat konfirmasi selesai dilakukan.
- Menjamin perlindungan 30 hari penuh paska pengerjaan:
  1. Garansi kebocoran freon dan sambungan pipa (30 hari).
  2. Garansi kelistrikan dan kapasitor (30 hari).
  3. Bebas biaya kunjungan teknisi ulang jika keluhan sama terulang.
- Tombol **"Klaim Garansi"** tersedia langsung pada kartu sertifikat garansi di aplikasi pelanggan.

---

## 22. SERVICE HISTORY & REPEAT BOOKING (REBOOK)

- Riwayat pesanan yang sudah selesai tersimpan secara permanen pada tab `Selesai`.
- Fitur **"Pesan Layanan Ini Lagi (Rebook)"**:
  - Mengambil preferensi unit, jenis layanan, dan alamat pelanggan dari pesanan lama.
  - Membuat permintaan booking baru yang mandiri (`DomainBooking`) dengan status `PENDING_CONFIRMATION`.
  - **Tidak mengubah atau menimpa data riwayat pesanan yang telah selesai**.

---

## 23. RESPONSIVE LAYOUT & MOBILE USABILITY (STICKY ACTION BAR)

- Layar dirancang mobile-first dan responsif penuh dari layar smartphone (375px) hingga desktop (1440px).
- Pada perangkat mobile, tombol tindakan utama (*Next Best Action*) menempel di bagian bawah layar (*sticky bottom action bar*) dengan z-index tinggi, memastikan pelanggan dapat mengambil keputusan cepat tanpa harus melakukan scroll panjang.
- Badge kontras tinggi, typography modern Outfit + Plus Jakarta Sans, dan visual cards memberikan pengalaman pelanggan yang mewah dan elegan.

---

## 24. DEV / DEMO FIXTURE SUITE (28 SCENARIOS SC-C01 TO SC-C28)

Semua 28 skenario deterministik telah diimplementasikan dalam `src/mocks/customerScenarios.ts`:

| Kode | ID Pesanan | Kategori | Ringkasan Skenario |
|---|---|---|---|
| **SC-C01** | `SRV-C01-BOOK-WAITING` | Booking & Assignment | Booking baru dibuat, menunggu konfirmasi mitra |
| **SC-C02** | `SRV-C02-CONFIRMED-ASSIGNED` | Booking & Assignment | Booking dikonfirmasi, teknisi ditugaskan |
| **SC-C03** | `SRV-C03-WORKER-ON-WAY` | Booking & Assignment | Teknisi dalam perjalanan menuju lokasi (Live Map) |
| **SC-C04** | `SRV-C04-WORKER-ARRIVED-DIAG` | Diagnosis & Pricing | Teknisi tiba di lokasi dan sedang melakukan diagnosis unit |
| **SC-C05** | `SRV-C05-NO-ADJ-READY` | Diagnosis & Pricing | Diagnosis bersih tanpa kerusakan tambahan, biaya tetap awal |
| **SC-C06** | `SRV-C06-ADJ-PRESENT` | Diagnosis & Pricing | Penyesuaian biaya, customer berada di lokasi unit |
| **SC-C07** | `SRV-C07-ADJ-ABSENT` | Diagnosis & Pricing | Penyesuaian biaya jarak jauh, customer menerima alert remote |
| **SC-C08** | `SRV-C08-ADJ-REJ-CONTINUE` | Diagnosis & Pricing | Pekerjaan opsional ditolak, pekerjaan pokok tetap berlanjut |
| **SC-C09** | `SRV-C09-ADJ-REJ-BLOCKED` | Diagnosis & Pricing | Suku cadang wajib ditolak, pekerjaan terblokir aman |
| **SC-C10** | `SRV-C10-PROVIDER-PART` | Sparepart & Store | Suku cadang workshop resmi milik provider mitra |
| **SC-C11** | `SRV-C11-PARTNER-DIRECT` | Sparepart & Store | Pembelian langsung suku cadang di toko rekanan |
| **SC-C12** | `SRV-C12-PARTNER-REC-PENDING` | Sparepart & Store | Rekomendasi suku cadang toko rekanan menunggu persetujuan |
| **SC-C13** | `SRV-C13-PARTNER-REC-ACCEPTED` | Sparepart & Store | Rekomendasi disetujui, pesanan produk toko otomatis terbuat |
| **SC-C14** | `SRV-C14-ALT-MERCHANT` | Sparepart & Store | Customer memilih toko/produk rekanan alternatif |
| **SC-C15** | `SRV-C15-SELF-PURCHASE` | Sparepart & Store | Customer memilih membeli suku cadang sendiri (mandiri) |
| **SC-C16** | `SRV-C16-SHIPMENT-TRANSIT` | Sparepart & Store | Kurir instan mengantar suku cadang dari toko rekanan |
| **SC-C17** | `SRV-C17-SHIPMENT-DELAYED` | Sparepart & Store | Pengiriman kurir terlambat akibat cuaca ekstrem |
| **SC-C18** | `SRV-C18-PAYMENT-PENDING` | Payment | Menunggu pembayaran escrow awal sebelum pekerjaan dimulai |
| **SC-C19** | `SRV-C19-PAYMENT-FAILED` | Payment | Pembayaran kedaluwarsa/gagal, opsi coba lagi tersedia |
| **SC-C20** | `SRV-C20-ADDITIONAL-PAYMENT` | Payment | Pembayaran selisih biaya penyesuaian (kuitansi inkremental) |
| **SC-C21** | `SRV-C21-IN-PROGRESS` | Execution & Proof | Teknisi sedang melakukan pengerjaan aktif di unit |
| **SC-C22** | `SRV-C22-PROOF-SUBMITTED` | Execution & Proof | Teknisi mengunggah foto sebelum/sesudah dan data uji |
| **SC-C23** | `SRV-C23-COMPLETION-AWAITING` | Completion & Post-Service | Pengerjaan tuntas, menunggu persetujuan konfirmasi customer |
| **SC-C24** | `SRV-C24-COMPLETED` | Completion & Post-Service | Konfirmasi disetujui, dana escrow dicairkan ke penyedia |
| **SC-C25** | `SRV-C25-DISPUTED` | Completion & Post-Service | Sengketa aktif dilaporkan customer, mediasi CS berjalan |
| **SC-C26** | `SRV-C26-WARRANTY-ELIGIBLE` | Completion & Post-Service | Pesanan selesai dalam masa perlindungan garansi 30 hari |
| **SC-C27** | `SRV-C27-SERVICE-HISTORY` | Completion & Post-Service | Arsip riwayat pesanan selesai untuk pemantauan aset |
| **SC-C28** | `SRV-C28-REBOOKING` | Completion & Post-Service | Pemesanan berkala ulang dari riwayat servis sebelumnya |

---

## 25. AUTOMATED TEST SUITE (FLOW 01 TO FLOW 15)

File pengujian: `tests/customer-order-flow.test.ts`.
Hasil eksekusi: **17 passed, 0 failed (100% Green)**.

```
▶ SERVIO Customer Order Flow Revision: Master End-to-End Suite
  ✔ FLOW 01: Standard Happy Path (Discovery -> Prepayment -> Proof -> Customer Confirm -> Warranty)
  ✔ FLOW 02: Mandatory Price Adjustment -> Customer Approves -> Immediate Diff Payment -> Resume Execution
  ✔ FLOW 03: Mandatory Price Adjustment -> Customer Rejects -> Safe Service Block & Escrow Protection
  ✔ FLOW 04: Optional Scope Add-On Proposal -> Customer Rejects -> Service Continues Original Scope Unblocked
  ✔ FLOW 05: Provider Sparepart Approval -> Material Deducted -> Service Continues
  ✔ FLOW 06: Partner Merchant Recommendation -> Customer Approves -> Zero Surcharge -> Merchant Order & Affiliate Created
  ✔ FLOW 07: Partner Merchant Recommendation -> Customer Chooses Alternative Merchant Product -> No Affiliate Theft
  ✔ FLOW 08: Customer Opts for Self-Purchase of Sparepart -> Clear Guidance & Status
  ✔ FLOW 09: Payment Failure Simulation -> Order Unpaid, Execution Remains Blocked -> Retry Succeeds
  ✔ FLOW 10: Multi-Payment History Integrity -> Incremental Receipts Recorded Without Mutating Previous
  ✔ FLOW 11: Real-Time Worker Tracking & Arrival Context -> Status Updates Accurately
  ✔ FLOW 12: Customer Completion Confirmation -> Exclusive Release of Escrow & Instant Servio Shield Warranty
  ✔ FLOW 13: Customer Dispute Filing -> Instant Escrow Freeze & Customer Support Mediation Case Assignment
  ✔ FLOW 14: Customer Post-Service Rating & Review Submission Recorded Reliably
  ✔ FLOW 15: Repeat Service Rebooking -> Clones Service Details into New Order Without Mutating History
  ✔ DETERMINISTIC FIXTURES INTEGRITY: All 28 scenarios (SC-C01 to SC-C28) exist and resolve
  ✔ RBAC & AUTHORITY ISOLATION: Customer authority cannot be bypassed or forged
✔ SERVIO Customer Order Flow Revision: Master End-to-End Suite (17 tests, 0 failures)
```

---

## 26. CROSS-ROLE REGRESSION SUITE RESULTS

Seluruh rangkaian pengujian regresi dari tahap sebelumnya dijalankan bersamaan:
1. `tests/customer-order-flow.test.ts` (17 tests) — **PASS**
2. `tests/pre-customer-audit.test.ts` (11 tests) — **PASS**
3. `tests/affiliate-finalization.test.ts` (8 tests) — **PASS**
4. `tests/partnership-inbox.test.ts` (8 tests) — **PASS**
5. `tests/phase-e.test.ts` (22 tests) — **PASS**

**Total Platform Test Suite: 66 tests passing, 0 failed (100% Green).**

---

## 27. VISUAL BROWSER SUBAGENT VERIFICATION SUMMARY

Subagent browser otomatis telah memverifikasi antarmuka visual live di `http://localhost:3000`:
- **Orders List (`/orders`)**: Dropdown pemilih skenario 28 fixture berfungsi mulus; filter tab `Semua`, `Jasa`, `Produk`, `Menunggu Tindakan`, `Selesai` merender kartu pesanan secara akurat.
- **Detail Pesanan `SC-C06` (`/orders/SRV-C06-ADJ-PRESENT`)**: Menampilkan banner *Next Best Action*, *Stepper*, *Diagnosis Card*, dan box persetujuan penyesuaian biaya.
- **Interaksi Approval**: Menekan tombol *"Setujui Biaya Rp 565.000"* memperbarui status menjadi *"Biaya Disetujui — Menunggu Pembayaran Selisih Rp215.000"* dan banner langsung memunculkan tombol bayar selisih.
- **Rekomendasi Toko Rekanan `SC-C12`**: Menampilkan box suku cadang toko rekanan dengan catatan komisi afiliasi ditanggung merchant (*0 Surcharge Pelanggan*).
- **Konfirmasi Penyelesaian `SC-C23`**: Bukti kerja foto sebelum/sesudah dan pembacaan parameter terverifikasi; penekanan konfirmasi selesai mengaktifkan sertifikat garansi Servio Shield 30 hari seketika.
- **Responsive Mobile**: Tampilan 375px memposisikan tombol tindakan pada *sticky bottom bar* yang ergonomis.

---

## 28. ANTI-REGRESSION & RBAC TENANT GUARD CONFIRMATION

- Pengujian memverifikasi bahwa hak akses antar tenant tetap terisolasi kuat:
  - Teknisi tidak dapat menandai pesanan `COMPLETED` atas nama pelanggan.
  - Percakapan chat tidak dapat mengubah tagihan finansial tanpa klik persetujuan tombol eksplisit.
  - Merchant A tidak dapat menyetujui kemitraan Merchant B.
  - Riwayat kuitansi pembayaran masa lalu bersifat *append-only* dan tidak dapat termutasi secara diam-diam.

---

## 29. ZERO-DUPLICATE ENGINE AUDIT CONFIRMATION

Platform tidak membuat mesin (*engine*) duplikat:
- Seluruh mutasi domain diarahkan ke `CentralDomainStore` di `src/lib/repository/domainRepository.ts`.
- Pesanan produk suku cadang menggunakan tipe `MerchantOrder` kanonikal yang sama dengan transaksi e-commerce toko.
- Atribusi komisi menggunakan `AffiliateAttribution` kanonikal yang sama dengan audit Phase E.
- Pembayaran dicatat menggunakan `GatewayTransaction` kanonikal yang sama dengan modul Finance.

---

## 30. FILES MODIFIED & CREATED MATRIX

| File | Status | Kategori | Perubahan Utama |
|---|---|---|---|
| `src/types/domain.ts` | **MODIFIED** | Type Definitions | Penambahan `ServicePaymentRecord`, `CustomerDisputeSubmission`, alias kompatibilitas backward |
| `src/mocks/customerScenarios.ts` | **CREATED** | Test Fixtures | 28 skenario deterministik lengkap (`SC-C01` s/d `SC-C28`) |
| `src/components/navigation/CustomerDemoScenarioSelector.tsx` | **CREATED** | UI Component | Dropdown selector skenario per kategori untuk dev/demo |
| `src/app/(customer)/orders/page.tsx` | **MODIFIED** | Page UI | Revamp daftar pesanan customer dengan 7 tab filter & selector |
| `src/app/(customer)/orders/[orderId]/page.tsx` | **MODIFIED** | Page UI | Revamp layar detail pesanan master dengan seluruh modal flow |
| `src/features/orders/useServiceOrder.ts` | **MODIFIED** | Feature Hook | Penambahan delegasi method customer & scenario metadata |
| `src/lib/repository/domainRepository.ts` | **MODIFIED** | Repository Store | Penambahan 11 method customer flow & sinkronisasi alias lookup |
| `tests/customer-order-flow.test.ts` | **CREATED** | Automated Tests | 17 pengujian komprehensif untuk FLOW 01 s/d 15 & RBAC |
| `docs/customer-order-flow-implementation-report.md` | **CREATED** | Documentation | Laporan implementasi resmi 31 bagian |

---

## 31. FINAL SIGN-OFF: READY FOR FINAL END-TO-END

Seluruh spesifikasi teknis dan operasional dalam dokumen kontrak `SERVIO — CUSTOMER ORDER FLOW REVISION` telah diimplementasikan, diverifikasi melalui subagent browser, dan divalidasi oleh 66 automated test (100% passing).

Status Verifikasi:
- **TypeScript Typecheck**: PASSED (0 errors via `npx tsc --noEmit`)
- **Automated Flow Tests (FLOW 01 to 15)**: PASSED (17/17 tests green)
- **Non-Customer Audit & Phase E Regressions**: PASSED (49/49 tests green)
- **Platform Total Tests**: PASSED (66/66 tests green)
- **UI & Browser Subagent**: PASSED (Visual interactions, scenario switching, sticky bar verified)

**VERDICT: READY FOR FINAL END-TO-END SIGN-OFF.**
