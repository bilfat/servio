# SERVIO PLATFORM — PHASE 07
# AFTER-SALES & FEEDBACK — FRONTEND PLANNING V2.2

> **STATUS: 🔒 FINAL LOCKED V2.2 — FRONTEND BUSINESS FLOW & UI/UX BASELINE**  
> **Tanggal baseline V2.1: 20 Oktober 2026; amendemen keputusan V2.2: 3 November 2026**  
> **Amendemen V2.2:** Pada pengajuan klaim garansi Barang, klaim garansi Jasa, dan retur Barang, Customer memilih solusi yang diinginkan sejak awal (Barang: Penggantian/Refund; Jasa: Perbaikan Ulang/Refund). Pilihan ini bukan persetujuan otomatis; pelaku usaha meninjau dan solusi alternatif memerlukan persetujuan Customer. Seluruh keputusan V2.1 lain tetap berlaku.  
> **Amendemen V2.1:** Navigasi Customer `Garansi & Pengajuan` sebagai pusat garansi, klaim, retur, tindak lanjut penggantian/perbaikan, dan status refund pada kasus asal. Dokumen V2 dipertahankan sebagai arsip.  
> **Jenis dokumen: Frontend Planning Only**  
> **Fokus: Customer, Merchant, Service Provider, Admin Operations, Customer Support, dan tampilan kontekstual role lain**  
> **Ruang lingkup: Rating & Ulasan; Garansi & Klaim; Retur Produk; Refund Tracking.**
>
> **BATAS DOKUMEN:** Dokumen ini menjelaskan pengalaman pengguna, keputusan bisnis yang tampak di layar, navigasi, formulir, status, dan alur antartampilan. **Tidak berisi spesifikasi server, basis data, endpoint, kontrak teknis, skema penyimpanan, atau instruksi pengerjaan layanan di luar frontend.**

---

### Catatan amendemen V2 → V2.1 → V2.2 (frontend only)

1. Nama menu Customer diubah menjadi **Garansi & Pengajuan**; hanya dua area utama Customer: Pesanan Saya dan Garansi & Pengajuan.
2. Tab Customer sekarang **Garansi Aktif / Pengajuan / Berakhir**; Pengajuan menyatukan klaim garansi Barang/Jasa, retur Barang, riwayat kasus dan refund sebagai hasil.
3. **Detail Pengajuan** menjadi tempat tunggal memantau pekerjaan garansi jasa, penggantian barang, dan status refund. Pesanan asli tetap ada pada Pesanan Saya; tidak membuat Order Customer baru.
4. Keputusan bisnis lain pada V2 tidak berubah. Dokumen sumber V2 tetap tersimpan sebagai arsip.
5. **Amendemen V2.2 — ACC/LOCKED 3 November 2026:** semua form awal pengajuan masalah yang relevan meminta pilihan solusi Customer: **Barang (klaim garansi/retur): Penggantian Barang atau Refund**; **Jasa (klaim garansi): Perbaikan/Pengerjaan Ulang atau Refund**. Ini adalah preferensi resmi Customer, bukan hak otomatis mendapat refund.
6. Merchant/Provider boleh menyetujui, menolak dengan alasan yang sah, atau menawarkan alternatif; **alternatif memerlukan persetujuan Customer** dan ketidaksepakatan tetap dapat dilaporkan ke Modul 09. Perbaikan Barang dapat ditawarkan Merchant sebagai alternatif klaim yang sesuai cakupan; bukan pilihan awal wajib.
7. Revisi hanya spesifikasi pengalaman frontend; **tidak mengubah arsitektur layanan, data, API, maupun implementasi modul apa pun**.

---

## 01. Ringkasan Eksekutif

Phase 07 adalah pengalaman purnajual SERVIO setelah atau berkaitan dengan transaksi Barang dan Jasa. Fokusnya **sederhana, jelas, dan tidak memaksa Customer berpindah melalui banyak formulir atau halaman**. Pengguna melihat pengajuan, keputusan, tindak lanjut, serta rating dari konteks pesanan yang benar.

**Empat area pengalaman frontend:**

1. **Rating & Ulasan** — menilai barang/jasa serta pelaku usaha, termasuk balasan pelaku usaha.
2. **Garansi & Klaim** — menampilkan hak garansi usaha dan penanganan masalah selama masa garansi.
3. **Retur Barang** — mengajukan pengembalian untuk barang bermasalah, dengan pilihan solusi Customer.
4. **Refund Tracking** — menampilkan hasil keputusan refund dan perjalanannya hingga dana tersedia pada S-Pay.

**Prinsip tunggal:** satu persoalan = satu pengajuan utama; pengguna tidak diminta membuat pengajuan kedua hanya untuk memproses konsekuensi dari pengajuan pertama.

**Di luar cakupan:** aset/equipment lifecycle, garansi manufaktur terintegrasi, asuransi kompleks, pembayaran baru di dalam Phase 07, sistem kurir baru, atau penilaian individual Worker.

### 1.1 Keputusan yang sudah mendapat ACC pemilik proyek

- Pesanan Customer terbagi menjadi **Barang** dan **Jasa** pada menu **Pesanan Saya**.
- Pusat Customer bernama **Garansi & Pengajuan**: tab Garansi Aktif / Pengajuan / Berakhir; pengajuan menyatukan klaim garansi Barang/Jasa dan retur Barang, termasuk penyelesaian/refund. Tidak menambah pesanan komersial baru.
- Rating baru diberikan setelah transaksi terkait berstatus **Selesai / COMPLETED**.
- Order Barang: rating **Produk** dan **Merchant**; Order Jasa: rating **Jasa** dan **Service Provider**.
- **Tidak ada Worker Rating**.
- Satu pengalaman formulir review, dua rating utama dan satu ulasan tertulis opsional; tag/aspek pengalaman opsional.
- Merchant dan Provider **dapat membalas ulasan Customer**, satu balasan resmi per ulasan.
- Ulasan katalog ditampilkan pada Detail Produk/Jasa yang benar, sementara reputasi pelaku usaha ditampilkan terpisah.
- Dashboard pelaku usaha menampilkan **inbox ulasan lintas pesanan**, bukan pengelompokan wajib per katalog.
- Merchant/Provider membuat **beberapa pilihan garansi usaha** dengan durasi hari yang diinput sendiri; bukan daftar durasi yang dipatok SERVIO.
- Saat tambah/edit katalog: pilih **Ada Garansi?**; jika Ya, pilih salah satu garansi aktif milik usaha dari dropdown.
- Garansi dan Klaim dipresentasikan sebagai **satu pengalaman fitur** meski memiliki tahap pengaturan, hak berlaku, dan pengajuan.
- Garansi produk ditangani Merchant; Garansi jasa ditangani Provider.
- Klaim jasa yang disetujui untuk pengerjaan ulang diarahkan menjadi **Pekerjaan Garansi — [Nama Jasa]** di pengalaman pekerjaan Modul 05B; **bukan order komersial baru**.
- Retur hanya untuk **barang bermasalah**, bukan fasilitas standar karena berubah pikiran, tanpa menghilangkan hak konsumen yang diwajibkan hukum.
- **ACC V2.2:** Customer **wajib memilih solusi awal** pada semua pengajuan terkait: Klaim Garansi Barang dan Retur Barang = **Penggantian Barang / Refund**; Klaim Garansi Jasa = **Perbaikan Ulang / Refund**. Merchant/Provider meninjau; pilihan Customer tidak otomatis disetujui. Jika solusi berbeda, wajib ada persetujuan Customer.
- Retur parsial, lima status utama retur, aturan tanggung jawab ongkir, dan refund penuh/sebagian disetujui.
- Refund dapat terjadi untuk **Barang dan Jasa**; keputusan tampil di kasus terkait, pergerakan dana terlihat di Finance/S-Pay.
- Batas respons **3 × 24 jam / 72 jam** untuk Merchant/Provider pada pengajuan garansi dan Merchant pada retur.
- **Garansi & Pengajuan** menjadi satu tujuan pemantauan Customer: klaim jasa yang memerlukan pekerjaan garansi, retur dengan penggantian, dan refund dapat dilacak dalam Detail Pengajuan yang sama; pesanan asal tidak berubah menjadi order baru.
- Jika tak ditanggapi, tampil **TIDAK DITANGGAPI**, **bukan DITOLAK**, dan tombol **Laporkan Masalah** ke pengalaman Support & Dispute Modul 09.

### 1.2 Aturan yang belum diberi angka spesifik

- Batas hari periode pengajuan retur barang **tidak ditetapkan angkanya pada dokumen ini**. UI hanya menampilkan tenggat jika periode operasional yang sah sudah ditentukan; aturan itu tidak boleh menghapus hak konsumen yang berlaku.
- Jumlah hari garansi **bukan angka global**: sepenuhnya tergantung pilihan durasi yang dibuat masing-masing usaha.
- Tarif ongkir, nominal refund, nilai komponen yang dapat direfund, dan tenggat aktual pelaksanaan solusi **tidak diciptakan sebagai konstanta UI**.

---

## 02. Prinsip Desain Pengalaman

1. **Order sebagai titik awal tindakan:** rating dan retur berawal dari Detail Pesanan; garansi juga tersedia melalui Detail Pesanan.
2. **Garansi dan Pengajuan sebagai pusat after-sales:** tab Garansi Aktif/Berakhir menyatukan hak garansi Barang/Jasa, sedangkan tab Pengajuan menampilkan kasus garansi **dan** retur Barang, termasuk retur tanpa garansi tambahan usaha.
3. **Bahasa manusia:** gunakan Diajukan, Ditinjau, Diproses, Selesai, Ditolak, Tidak Ditanggapi; jangan memaparkan puluhan status pekerjaan teknisi sebagai status klaim.
4. **Aksi kontekstual:** tombol hanya ditampilkan bila tindakan layak tersedia bagi pesanan/pengajuan tersebut. Form awal klaim/retur selalu meminta Customer memilih solusi yang diharapkan sesuai jenis transaksi (ACC V2.2).
5. **Perbedaan tampilan bukan duplikasi proses:** satu komponen dapat digunakan ulang untuk Barang/Jasa dengan label dan informasi berbeda.
6. **Transparansi:** tanggal, tenggat, alasan penolakan, langkah berikutnya, nominal refund, serta status keputusan terlihat jelas.
7. **Hak Customer:** tidak ada pernyataan yang menghapus hak konsumen hanya karena garansi tambahan usaha dinonaktifkan atau masa pelaporan operasional tertentu terlewati.
8. **Pemisahan keuangan:** persetujuan refund tidak sama dengan uang sudah masuk; S-Pay hanya menunjukkan saldo refund yang benar-benar tersedia.
9. **Jejak tampilan:** detail pengajuan menyajikan riwayat aktivitas kronologis agar Customer tidak perlu menghubungi pelaku usaha untuk menanyakan perubahan status.
10. **Prioritaskan fitur existing:** bila menu/halaman sudah ada, rapikan dan integrasikan alur, bukan membuat duplikat atau menghapus fungsi di luar scope.

---

## 03. Peta Navigasi Final

### 3.1 Sidebar Customer — dua area utama

```text
CUSTOMER
├── Beranda
│   ├── Ringkasan pesanan/pengajuan aktif [shortcut bila relevan]
│   └── S-Pay [saldo refund & riwayat, konteks Finance]
│
├── Pesanan Saya
│   ├── Tab Barang
│   │   └── Detail Pesanan Barang
│   │       ├── Beri / Lihat Rating & Ulasan
│   │       ├── Ajukan / Lacak Retur [jika layak]
│   │       ├── Lihat Garansi / Ajukan Klaim [jika tersedia]
│   │       └── Lihat Status Refund [jika ada]
│   └── Tab Jasa
│       └── Detail Pesanan Jasa
│           ├── Beri / Lihat Rating & Ulasan
│           ├── Lihat Garansi / Ajukan Klaim [jika tersedia]
│           ├── Pantau Pekerjaan Garansi [jika ada]
│           └── Lihat Status Refund [jika ada]
│
└── Garansi & Pengajuan
    ├── Tab Garansi Aktif
    │   └── Filter jenis: Semua / Barang / Jasa
    │       └── Detail Garansi [syarat, masa berlaku, Ajukan Klaim]
    ├── Tab Pengajuan
    │   ├── Filter jenis: Semua / Klaim Barang / Klaim Jasa / Retur Barang
    │   ├── Filter status: Semua / Berjalan / Selesai / Ditolak / Tidak Ditanggapi
    │   └── Detail Pengajuan (satu lokasi tracking)
    │       ├── Timeline status pengajuan + batas respons 3 × 24 jam
    │       ├── Instruksi/konfirmasi Customer jika diperlukan
    │       ├── Pekerjaan Garansi Jasa [jika ada; referensi Modul 05B]
    │       ├── Pengembalian/Penggantian Barang [jika ada; referensi pemenuhan 05A]
    │       ├── Status Refund [jika keputusan refund; referensi S-Pay]
    │       └── Laporkan Masalah [NO_RESPONSE atau sengketa yang memenuhi syarat]
    └── Tab Berakhir
        └── Filter jenis: Semua / Barang / Jasa
            └── Detail Garansi + riwayat pengajuan terkait
```

**Keputusan UX:** hanya dua area utama Customer untuk urusan ini, **Pesanan Saya** dan **Garansi & Pengajuan**. Tidak membuat sidebar Customer mandiri bernama *Rating*, *Retur*, atau *Refund*. Detail Pesanan menjadi titik awal tindakan; seluruh klaim dan retur dipantau dari tab **Pengajuan**, sedangkan saldo refund tetap pada S-Pay.

### 3.2 Sidebar Merchant

```text
MERCHANT DASHBOARD
├── Ringkasan
├── Produk
│   └── Tambah / Edit Produk
│       └── Garansi: Tidak / Ya → Pilih opsi garansi usaha
├── Pesanan Barang
└── After-Sales
    ├── Pengaturan Garansi Toko
    ├── Klaim Garansi
    ├── Retur Barang
    └── Rating & Ulasan
```

Boleh berupa satu menu induk **After-Sales** dengan tab/submenu sesuai pola dashboard yang sudah ada. Tidak wajib menambah empat menu pada sidebar tingkat pertama.

### 3.3 Sidebar Service Provider

```text
SERVICE PROVIDER DASHBOARD
├── Ringkasan
├── Katalog Jasa
│   └── Tambah / Edit Jasa
│       └── Garansi: Tidak / Ya → Pilih opsi garansi usaha
├── Order/Pekerjaan Jasa
│   └── Pekerjaan Garansi — [Nama Jasa] [badge GARANSI]
└── After-Sales
    ├── Pengaturan Garansi Layanan
    ├── Klaim Garansi Jasa
    └── Rating & Ulasan
```

**Service Provider tidak memiliki halaman Retur Barang.**

### 3.4 Admin dan Support

- **Admin Operations:** tampilan pemantauan kasus dan moderasi ulasan/balasan yang dilaporkan; tindakan terbatas pada kewenangannya yang sudah ada.
- **Customer Support:** daftar laporan Customer, terutama klaim/retur **TIDAK DITANGGAPI** atau sengketa keputusan; berlanjut di pengalaman Modul 09.
- **CEO:** cukup tampilan ringkasan tata kelola apabila memang tersedia di dashboard existing; **tidak dibuatkan pusat klaim operasional baru**.
- **Finance:** konsekuensi refund ditampilkan pada pengalaman Finance yang sudah disepakati, bukan dibuatkan dashboard keuangan kedua di Phase 07.
- **Worker:** pekerjaan garansi jasa tetap terlihat sebagai pekerjaan terjadwal/ditugaskan dalam area pekerjaannya; **tidak perlu sidebar After-Sales khusus Worker**.

---

## 04. Matriks Fitur dan Titik Masuk Customer

| Kebutuhan | Titik masuk utama | Titik masuk tambahan | Catatan |
|---|---|---|---|
| Memberi rating Barang | Detail Pesanan Barang yang selesai | CTA setelah selesai | Menilai Produk dan Merchant |
| Memberi rating Jasa | Detail Pesanan Jasa yang selesai | CTA setelah selesai | Menilai Jasa dan Provider |
| Membaca rating katalog | Detail Produk/Jasa publik | Dari ulasan terkait di pesanan | Rating katalog ≠ reputasi usaha |
| Membaca rating usaha | Profil Merchant/Provider | Identitas pelaku usaha di katalog | Rating usaha dari transaksi terverifikasi |
| Melihat garansi | Garansi & Pengajuan → Garansi Aktif/Berakhir | Detail Pesanan; Detail Katalog sebelum pesan | Barang dan jasa pada satu daftar |
| Ajukan klaim | Detail Garansi | Detail Pesanan selesai | Form memuat pilihan solusi Customer sesuai Barang/Jasa; batas respons 72 jam |
| Lacak klaim | Garansi & Pengajuan → Pengajuan | Detail Pesanan; Beranda shortcut | Klaim Barang/Jasa, termasuk NO_RESPONSE |
| Ajukan retur | Detail Pesanan Barang | Shortcut bila pengajuan aktif | Hanya item bermasalah |
| Lacak retur | Garansi & Pengajuan → Pengajuan → Detail Retur | Detail Pesanan; Beranda shortcut | Termasuk retur tanpa garansi usaha; solusi yang disepakati |
| Lihat refund | Garansi & Pengajuan → Pengajuan → Detail kasus asal | Detail Pesanan; riwayat S-Pay | Refund tidak menjadi pengajuan/menunya sendiri; Disetujui ≠ dana tersedia |
| Laporkan masalah | Klaim/Retur berstatus NO_RESPONSE | Detail pengajuan ditolak/disengketakan | Buka alur Modul 09 |

---

## 05. Customer — Halaman Pesanan Saya

### 5.1 Layout

- Judul: **Pesanan Saya**.
- Tab tingkat pertama: **Barang | Jasa**.
- Filter transaksi mengikuti pola existing (mis. Semua, Berlangsung, Selesai, Dibatalkan), tanpa membuat dua menu sidebar lagi.
- Kartu pesanan menampilkan: gambar, nama produk/jasa, nama Merchant/Provider, nomor pesanan ringkas, tanggal, nominal, dan status order.
- Pada pesanan yang selesai, berikan penanda halus bila **Belum Diulas**, **Garansi Aktif**, atau **Ada Pengajuan Berjalan**.
- Jangan menampilkan semua tombol sekaligus jika hanya sebagian yang memenuhi syarat.

### 5.2 Detail Pesanan Barang

**Bagian tampilan:**

1. Header pesanan dan status.
2. Daftar item dengan kuantitas, foto, Merchant pemilik item, dan harga.
3. Ringkasan pengiriman/penerimaan yang sudah ada.
4. **Tindakan setelah selesai:** `Beri Ulasan` atau `Lihat Ulasan`.
5. **Garansi Toko:** badge, masa berlaku, tautan `Detail Garansi` / `Ajukan Klaim` jika layak; klaim yang dibuat kemudian dipantau di **Garansi & Pengajuan → Pengajuan**.
6. **Retur Barang:** `Ajukan Retur` pada item yang memenuhi syarat; jika sudah diajukan, tampil `Lihat Retur` yang menuju **Garansi & Pengajuan → Pengajuan → Detail Retur** (juga tanpa garansi toko).
7. **Refund:** card status bila terdapat keputusan refund terkait pesanan.
8. Riwayat aktivitas pengajuan dan tautan bantuan.

### 5.3 Detail Pesanan Jasa

**Bagian tampilan:**

1. Header pesanan, identitas Provider, jenis pekerjaan, dan status selesai.
2. Ringkasan pelaksanaan jasa yang tersedia pada pengalaman order.
3. `Beri Ulasan` / `Lihat Ulasan`.
4. **Garansi Layanan:** pilihan garansi yang berlaku, durasi, tanggal akhir, ketentuan dan `Ajukan Klaim`.
5. **Pekerjaan Garansi:** jika ada, card `Klaim Garansi — [Nama Jasa]` bertanda `GARANSI`, status pekerjaan, dan tautan ke **Detail Pengajuan** yang memuat ringkasan progres pekerjaan; bukan Order Jasa baru.
6. **Refund:** status jika ada penyelesaian pengembalian dana.
7. Tidak ada tombol Retur Barang.

### 5.4 Perilaku tombol berdasarkan kondisi

| Kondisi | CTA utama |
|---|---|
| Order belum selesai | Lihat Detail Pesanan |
| Selesai, review belum ada | Beri Ulasan |
| Selesai, review sudah ada | Lihat Ulasan |
| Garansi usaha aktif, belum ada klaim serupa yang berjalan | Ajukan Klaim |
| Ada klaim berjalan | Lihat Klaim |
| Item Barang memenuhi syarat retur | Ajukan Retur |
| Ada retur berjalan | Lihat Retur |
| Ada refund | Lihat Status Refund |
| Tidak ada garansi tambahan | Informasi perlindungan konsumen tetap ditampilkan seperlunya, tanpa mengklaim semua hak telah berakhir |

---

## 06. Rating & Ulasan — Keputusan Bisnis dan Flow

### 6.1 Kapan bisa memberi rating?

- Setelah transaksi terkait **Selesai / COMPLETED**.
- Tidak tersedia pada transaksi batal atau transaksi yang belum memenuhi syarat.
- Hanya pengalaman pembelian/pemesanan nyata yang boleh menghasilkan review terverifikasi.
- Saat review sudah terkirim untuk target terkait, tombol **Beri Ulasan** berubah menjadi **Lihat Ulasan**, bukan membuat review berulang.

### 6.2 Sasaran penilaian

| Jenis order | Rating utama #1 | Rating utama #2 | Tidak termasuk |
|---|---|---|---|
| Barang | **Produk** | **Merchant** | Rating pekerja, kurir sebagai rating SERVIO baru |
| Jasa | **Jasa** | **Service Provider** | **Worker Rating individual** |

**Aspek yang dijelaskan kepada Customer:**

**Produk:** kualitas barang; kondisi saat diterima; kesesuaian foto/deskripsi; fungsi/performa; kemasan bila relevan.

**Merchant:** komunikasi, keramahan/respons, ketepatan pemrosesan, penanganan masalah, pengalaman belanja.

**Jasa:** hasil pekerjaan, masalah teratasi atau tidak, kualitas pengerjaan, kesesuaian pekerjaan dengan kesepakatan.

**Service Provider:** profesionalisme pelayanan, komunikasi, ketepatan jadwal, kejelasan informasi dan penanganan keluhan.

Aspek tersebut ditampilkan sebagai **tag pengalaman opsional**, bukan sederet formulir bintang tambahan yang melelahkan.

### 6.3 Flow Customer

```text
ORDER SELESAI
    ↓
Customer klik Beri Ulasan
    ↓
Form tunggal sesuai jenis transaksi
    ├── Bintang Produk/Jasa (1–5)
    ├── Bintang Merchant/Provider (1–5)
    ├── Pilihan aspek pengalaman (opsional)
    ├── Teks ulasan (opsional)
    └── Foto pengalaman (opsional, bila tersedia)
    ↓
Konfirmasi → Ulasan terkirim
    ↓
Ulasan tampil pada objek katalog terkait
    + penilaian pelaku usaha tampil pada profil usaha
    ↓
Merchant/Provider dapat membalas
```

**Satu formulir, dua rating numerik utama, satu konten ulasan.** Bila Customer tidak menulis komentar, nilai bintang tetap bisa disampaikan dengan syarat minimum rating valid.

### 6.4 Batas satu review pada satu konteks transaksi

- **Barang:** satu review **Produk A** untuk item/varian yang layak diulas pada satu transaksi; kuantitas lebih dari satu pada item yang sama tidak menghasilkan review berulang.
- **Beberapa produk berbeda:** produk berbeda dapat memperoleh rating masing-masing.
- **Penilaian Merchant:** satu penilaian Merchant untuk satu subpesanan Merchant yang selesai, **tidak diulang per produk** milik Merchant yang sama di subpesanan itu.
- **Jasa:** satu penilaian untuk layanan yang diselesaikan dan satu penilaian untuk Provider terkait pada order jasa tersebut.
- Jika satu checkout memuat beberapa Merchant, setiap Merchant hanya menerima rating dari bagian transaksi miliknya.
- Dalam UX multi-item, Customer dapat menilai item satu per satu dalam **satu rangkaian formulir**; rating Merchant ditanyakan satu kali untuk subpesanan Merchant.
- UI harus menghindari dua tombol/lembar yang menyiratkan Customer wajib menilai Merchant yang sama berkali-kali untuk satu subpesanan.

### 6.5 Setelah review dikirim

- Pada **Detail Produk A**, tampil ulasan pembeli yang terkait Produk A; penilaian bintang produk tidak tercampur dengan nilai Merchant.
- Pada **Detail Jasa A**, tampil ulasan yang terkait Jasa A; penilaian bintang jasa tidak tercampur dengan nilai Provider.
- Pada **profil Merchant/Provider**, tampil reputasi pelayanan usaha sebagai nilai yang terpisah.
- Jika konten teks ulasan yang sama tampil pada halaman katalog dan profil usaha, tampilkan konteks sumbernya dengan jelas (mis. "Ulasan dari pembelian Produk A") agar pembaca memahami rating mana yang sedang ditunjukkan.
- Refund, retur, atau klaim setelah review **tidak otomatis menghapus ulasan yang sah**; moderasi hanya jika ada alasan kebijakan.

---

## 07. Rating & Ulasan — Rancangan Halaman

### 7.1 Form review Customer

**Header:** `Beri Rating & Ulasan` → identitas order/item dan usaha.

**Field:**

1. Pertanyaan berbasis jenis: **Bagaimana kualitas produk/hasil jasa ini?** → bintang 1–5.
2. **Bagaimana pelayanan Merchant/Provider?** → bintang 1–5.
3. Tag pengalaman yang relevan, boleh pilih beberapa.
4. Teks ulasan opsional.
5. Unggah foto pendukung opsional bila sudah tersedia pada desain aplikasi; tidak mewajibkan video.
6. Tombol `Kirim Ulasan` dan konfirmasi sukses.

**Validasi UX:** kedua rating wajib dipilih; ulasan teks opsional; tombol kirim tidak boleh dapat ditekan berulang saat proses berlangsung; input tidak hilang tanpa peringatan ketika pengguna keluar.

### 7.2 Katalog publik — Detail Produk/Jasa

- Rata-rata rating **objek katalog tersebut**, jumlah penilaian dan daftar ulasan terkait.
- Filter bintang 1–5 (opsional untuk MVP jika data banyak), urutan terbaru.
- Nama pembeli yang menjaga privasi, badge pembelian terverifikasi, tanggal, nilai bintang, isi ulasan, foto bila ada.
- Balasan resmi Merchant/Provider tampil persis di bawah ulasan yang dibalas.
- Nilai reputasi Merchant/Provider dipisahkan pada blok identitas usaha; **bukan rata-rata yang dicampur dengan rating produk/jasa**.
- Jika belum ada review: `Belum ada ulasan dari pembeli yang telah menyelesaikan pesanan.`

### 7.3 Merchant — Inbox Rating & Ulasan

- Header: `Rating & Ulasan`.
- KPI: **Rating Produk**, **Rating Merchant**, **Total Ulasan**, **Belum Dibalas**.
- Satu daftar berdasarkan **review terbaru dari seluruh order** dalam lingkup usaha aktif.
- Tiap kartu: nama produk, Order ID ringkas, identitas Customer yang pantas, tanggal, bintang Produk/Merchant, isi review, status balasan.
- Filter praktis: semua, belum dibalas, bintang, nama produk/Order ID.
- Tombol `Balas Ulasan`, `Lihat Balasan`, dan `Edit Balasan` bila sudah ada.
- **Tidak ada keharusan membuka katalog satu per satu** untuk mengelola ulasan.

### 7.4 Provider — Inbox Rating & Ulasan

Sama seperti Merchant, tetapi KPI menjadi **Rating Jasa**, **Rating Service Provider**, **Total Ulasan**, **Belum Dibalas**. Kartu menunjukkan layanan dan order jasa sumber ulasan, **tanpa rating Worker individual**.

### 7.5 Balas Ulasan

1. Hanya **Merchant/Provider pemilik konteks transaksi** yang dapat memberi balasan resmi.
2. **Satu balasan publik per ulasan Customer.** Balasan dapat disunting dengan penanda waktu/perubahan yang wajar; tidak berubah menjadi chat dua arah tak terbatas.
3. Balasan terlihat di bawah ulasan Customer pada tampilan katalog/profil yang sesuai.
4. Pelaku usaha tidak dapat mengubah bintang, isi, kepemilikan, atau tanggal ulasan Customer.
5. Admin Operations dapat menangani pelaporan dan menyembunyikan konten yang melanggar kebijakan melalui tampilan moderasi; bukan mengedit opini asli pengguna.
6. Balasan bersifat profesional; tersedia petunjuk singkat sebelum dikirim.
7. Customer dapat melihat bahwa ulasannya dibalas; notifikasi muncul melalui pengalaman notifikasi SERVIO yang sudah ada.

**Tidak dibuat:** threaded conversation publik multi-level, like/dislike kompleks, rating Worker.

---

## 08. Garansi & Klaim — Konsep UI yang Disepakati

**Satu payung fitur:** `Garansi & Klaim`.

- Untuk Barang, bahasa publik: **Garansi Toko** (yang menyediakan dan bertanggung jawab: Merchant).
- Untuk Jasa, bahasa publik: **Garansi Layanan / Garansi Penyedia Jasa** (penanggung jawab: Service Provider).
- Garansi adalah **perlindungan usaha yang ditawarkan sebelum pemesanan**. Klaim adalah **pengajuan Customer ketika ada masalah**.
- Garansi **tidak otomatis berlaku untuk seluruh katalog**. Pilihan garansi ditentukan saat menambah/edit setiap katalog.
- Tidak ada pemilihan atau penambahan garansi secara sepihak setelah order selesai; Customer harus dapat melihat informasi yang ditawarkan sebelum memutuskan bertransaksi.
- Katalog yang tidak menawarkan garansi tambahan tetap tidak boleh diposisikan sebagai menghapus hak perlindungan konsumen.

---

## 09. Pengaturan Garansi Usaha — Merchant/Provider

### 9.1 Satu halaman pengelolaan pilihan garansi

Tampilan `Pengaturan Garansi Toko` pada Merchant dan `Pengaturan Garansi Layanan` pada Provider.

**Fitur:**

- Daftar pilihan garansi yang dibuat usaha tersebut.
- `Tambah Pilihan Garansi`.
- `Edit` dan `Nonaktifkan` pilihan untuk penggunaan baru.
- Penanda pilihan **Aktif / Tidak Aktif**.
- Daftar berisi: nama garansi, durasi **dalam hari**, cakupan ringkas, status, jumlah katalog yang menggunakan (jika tersedia sebagai informasi tampilan).
- Empty state jika usaha belum membuat pilihan garansi; CTA `Buat Garansi Pertama`.

### 9.2 Form Tambah/Edit Pilihan Garansi

| Field | Ketentuan UX |
|---|---|
| Nama pilihan garansi | Contoh `Garansi Service AC` / `Garansi Barang Toko`, dapat dibuat sesuai usaha |
| Durasi | **Input angka hari positif**; mis. 10, 20, 30, 45, 365; tidak dipatok SERVIO |
| Cakupan | Penjelasan singkat apa yang ditanggung garansi |
| Pengecualian/syarat | Penjelasan wajar, tidak menghilangkan hak konsumen yang berlaku |
| Status | Aktif / Tidak Aktif |

- Satu usaha **boleh memiliki banyak pilihan**; tidak hanya satu default.
- Tidak ada keharusan membuat garansi 10/20/30 hari: angka itu **contoh**, bukan preset global.
- Saat pilihan dinonaktifkan, tidak muncul untuk pilihan katalog baru.
- Katalog dan transaksi lama yang sudah menggunakan garansi tetap menunjukkan **ketentuan yang dijanjikan saat Customer bertransaksi**.
- Saat mengedit garansi yang sudah dipakai transaksi, tampilkan pengingat `Perubahan ini tidak mengubah garansi yang sudah dimiliki pelanggan sebelumnya.`
- Tidak perlu fitur aturan garansi yang kompleks, kalkulator biaya pemeriksaan, maupun persetujuan berlapis pada tahap tampilan ini.

---

## 10. Integrasi Visual Garansi pada Form Katalog

### 10.1 Tambah/Edit Produk (pengalaman Modul 03)

Di bagian informasi tambahan produk, tambahkan satu section:

```text
GARANSI TOKO
Apakah produk ini memiliki garansi toko?
( ) Tidak
(•) Ya

[Jika Ya]
Pilih pilihan garansi: [Dropdown opsi aktif milik Merchant]
                         Garansi 10 Hari
                         Garansi 20 Hari
                         Garansi 30 Hari

[Ringkasan cakupan, syarat & lama garansi terpilih]
[Lihat / Atur Pilihan Garansi]   (jika diperlukan)
```

### 10.2 Tambah/Edit Jasa (pengalaman Modul 04)

Identik dalam interaksi, gunakan label **Garansi Layanan**, dropdown yang hanya memuat pilihan garansi aktif milik Provider terkait.

### 10.3 Aturan interaksi

1. Pilihan **Tidak** → dropdown disembunyikan; katalog tampil tanpa janji garansi tambahan usaha.
2. Pilihan **Ya** → dropdown wajib dipilih; nilainya berasal dari daftar pilihan garansi aktif usaha yang bersangkutan.
3. Belum punya pilihan → empty state dan shortcut `Buat Pilihan Garansi`.
4. Tidak boleh menampilkan garansi milik Merchant/Provider lain.
5. Katalog memilih **satu pilihan garansi usaha yang aktif**; bila perlu mengganti, berlaku untuk penawaran/transaksi berikutnya.
6. Ringkasan garansi ditampilkan pada **card katalog, detail katalog, checkout, dan Detail Pesanan** bila katalog menawarkan garansi.
7. Pada detail katalog, tanggal akhir belum bisa dihitung sebelum pesanan selesai; tampilkan **durasi dan kondisi mulai berlaku**, bukan tanggal yang direkayasa.
8. Tampilan existing Modul 03 dan 04 hanya **ditambah section dan shortcut**; jangan merombak seluruh form katalog.

---

## 11. Garansi & Pengajuan — Pusat After-Sales Customer

### 11.1 Tujuan dan batas lingkup

Halaman **Garansi & Pengajuan** adalah **satu pusat pemantauan after-sales**, bukan pusat untuk membuat order baru. Halaman ini melayani:

- **Garansi Aktif** — hak garansi Barang dan Jasa yang masih berjalan.
- **Pengajuan** — daftar kasus klaim garansi Barang/Jasa dan retur Barang, termasuk yang **tidak memiliki garansi usaha**; semua status dan hasil penyelesaian dipantau dari satu detail kasus.
- **Berakhir** — hak garansi yang melewati masa berlaku; histori dan klaim yang diajukan tepat waktu tetap dapat dibuka.

**Pesanan Saya** tetap berisi Order Barang/Jasa asli, dengan tombol untuk membuka pengajuan relevan. Tidak ada order komersial Customer tambahan akibat penggantian barang atau pekerjaan garansi jasa.

### 11.2 Layout dan pembagian tab

```text
Garansi & Pengajuan
[ Garansi Aktif ] [ Pengajuan ] [ Berakhir ]

TAB GARANSI AKTIF / BERAKHIR
  Filter jenis: [ Semua | Barang | Jasa ]
  [Kartu Garansi]
    Barang/Jasa • Pelaku usaha • Nama garansi • Durasi
    Masa berlaku • Status garansi • [Detail Garansi]

TAB PENGAJUAN
  Jenis:  [Semua | Klaim Barang | Klaim Jasa | Retur Barang]
  Status: [Semua | Berjalan | Selesai | Ditolak | Tidak Ditanggapi]
  [Kartu Pengajuan]
    Jenis pengajuan • Nama barang/jasa • Pelaku usaha
    ID pengajuan + order asal • Waktu pengajuan
    Status kasus • Hasil yang diminta/disepakati (bila sudah ada)
    [Lihat Detail Pengajuan]
```

**Tab Pengajuan** berisi pengajuan dalam proses **dan riwayat pengajuan yang telah selesai/ditolak**. Filter `Berjalan` berarti kasus yang belum terminal; `Tidak Ditanggapi` adalah kondisi pelanggaran batas respons yang tidak boleh disamakan dengan `Ditolak`. Jangan hanya menampilkan klaim berjalan. Jenis **Retur Barang** harus muncul di tab ini bahkan ketika produk **tidak mempunyai garansi toko**.

**Filter jenis garansi** pada tab Aktif/Berakhir: `Semua | Barang | Jasa`. **Filter kasus** pada tab Pengajuan: `Semua | Klaim Barang | Klaim Jasa | Retur Barang`. Tidak membuat submenu sidebar untuk masing-masing jenis.

### 11.3 Detail Garansi (hak perlindungan)

- Nama Produk/Jasa, usaha penanggung jawab, referensi pesanan.
- Nama opsi garansi, durasi hari, tanggal mulai/akhir, status.
- Cakupan dan pengecualian sesuai ketentuan saat transaksi.
- CTA `Ajukan Klaim` jika layak; `Lihat Pengajuan` jika sudah ada kasus relevan.
- Riwayat pengajuan klaim yang pernah dibuat; satu garansi dapat memiliki riwayat beberapa penanganan sah tanpa mengubah tanggal berlaku.
- Jika masa garansi telah lewat, tampil `Garansi usaha berakhir`; hak konsumen yang diwajibkan hukum tidak dihapus.
- Kembali ke `Detail Pesanan` tanpa membuat order tambahan.

### 11.4 Detail Pengajuan (satu tempat status dan tindak lanjut)

Dipakai ulang untuk **klaim garansi Barang**, **klaim garansi Jasa**, dan **retur Barang**. Perbedaannya hanya konten yang relevan dengan jenis kasus.

**Susunan tampilan:**

1. **Header:** nomor pengajuan, label jenis, produk/jasa, usaha, referensi order asal, tanggal pengajuan dan status utama Customer.
2. **Ringkasan masalah:** alasan, deskripsi, bukti, **pilihan solusi awal Customer** (Barang: Penggantian/Refund; Jasa: Perbaikan Ulang/Refund), **solusi akhir yang disepakati** dan perbedaan di antaranya jika ada.
3. **Status & timeline:** timestamp pengajuan, batas respons **3 × 24 jam**, jawaban/permintaan informasi, penilaian, penyelesaian, dan waktu selesai/ditolak; bila lewat tenggat tanpa respons → `TIDAK DITANGGAPI`, **bukan otomatis ditolak**.
4. **Langkah Customer berikutnya:** balas permintaan informasi, terima/tolak solusi alternatif, unggah resi retur, lihat pekerjaan garansi, atau laporkan masalah—hanya muncul bila relevan.
5. **Area penyelesaian adaptif:**
   - **Garansi Barang:** hasil perbaikan/penggantian/refund, kondisi barang dan instruksi bila perlu dikirim.
   - **Garansi Jasa:** kartu **Pekerjaan Garansi — [Nama Jasa]** (bukan order baru), ringkasan jadwal dan progres dari pengalaman pekerjaan jasa yang sudah tersedia.
   - **Retur Barang:** kuantitas item, pengiriman balik jika diperlukan, penerimaan/pemeriksaan, dan status pengiriman penggantian bila solusi penggantian.
   - **Refund** untuk semua kasus yang memutuskan refund: nominal/komponen, `Disetujui → Diproses → Berhasil / Terkendala`, dan shortcut riwayat S-Pay hanya bila sudah terdanai.
6. **Referensi dan bantuan:** `Lihat Order Asal`, `Lihat Garansi` jika ada, `Laporkan Masalah` pada kondisi berhak, riwayat keputusan yang terbaca.

**Prinsip:** kartu pekerjaan 05B maupun pemenuhan penggantian barang bukan transaksi Customer baru dan tidak masuk sebagai pembelian baru pada tab Pesanan Saya. Pelanggan dapat menelusuri perkembangan melalui **Detail Pengajuan yang sama**, tanpa memaksa keluar ke halaman pekerjaan. Jika pengguna memilih `Lihat Detail Pekerjaan`, arahkan ke layar pekerjaan yang memang sudah tersedia, lalu tetap beri navigasi kembali ke Detail Pengajuan.

### 11.5 Matriks konten per jenis pengajuan

| Konten/tindakan | Klaim Garansi Barang | Klaim Garansi Jasa | Retur Barang |
|---|:---:|:---:|:---:|
| Masalah, bukti, order asal | Ya | Ya | Ya |
| Batas respons 72 jam & NO_RESPONSE | Ya | Ya | Ya |
| Pengembalian fisik barang bila relevan | Jika disyaratkan hasil klaim | Tidak | Ya, bila diperlukan |
| Ringkasan pekerjaan garansi 05B | Tidak | Ya, jika disetujui untuk pengerjaan | Tidak |
| Ringkasan penggantian barang | Ya, bila solusi penggantian | Tidak | Ya, bila solusi penggantian |
| Status refund dalam detail | Bila refund diputuskan | Bila refund diputuskan | Bila refund diputuskan |
| Link riwayat S-Pay | Setelah refund berhasil didanai | Setelah refund berhasil didanai | Setelah refund berhasil didanai |
| Link laporan / eskalasi | Jika layak | Jika layak | Jika layak |

### 11.6 Status yang tidak boleh dicampur

- **Status garansi:** Aktif / Berakhir / Dibatalkan (menjelaskan hak perlindungan, bukan penanganan).
- **Status klaim:** Diajukan / Ditinjau / Dalam Penyelesaian / Selesai / Ditolak, ditambah kondisi `Tidak Ditanggapi`, `Menunggu Informasi`, dan sebagainya apabila berlaku.
- **Status retur:** Diajukan / Ditinjau / Menunggu Pengembalian / Dalam Penyelesaian / Selesai; Ditolak / Dibatalkan / Tidak Ditanggapi sebagai kondisi hasil/exception.
- **Status pekerjaan garansi:** ringkasan progres operasional dari pekerjaan jasa; tidak mengubah klaim menjadi Order Jasa Customer baru.
- **Status pengiriman pengganti:** subinformasi fulfillment barang, bukan Order Pembelian baru.
- **Status refund:** Disetujui / Diproses / Berhasil / Terkendala; tidak disamakan dengan status garansi/retur/pekerjaan maupun otomatis menambah saldo S-Pay sebelum berhasil terdanai.

### 11.7 Empty state dan navigasi langsung

- Tab Pengajuan kosong: `Belum ada pengajuan. Ajukan masalah melalui detail pesanan atau garansi yang aktif.` Tombol `Lihat Pesanan Saya`.
- Tab Garansi Aktif kosong: `Belum ada garansi usaha aktif.` Tidak boleh menyimpulkan Customer tidak memiliki hak perlindungan lain.
- Tab Berakhir kosong: `Belum ada garansi berakhir.`
- Tombol `Lihat Klaim`, `Lihat Retur`, `Lihat Status Refund` dari Detail Pesanan **semua membuka detail kasus yang sesuai**. Jika refund merupakan hasil kasus, tampilkan seksi refund pada detail itu, bukan memaksa formulir refund baru.
- Detail kasus selesai tetap dapat diakses dalam tab Pengajuan dengan filter `Selesai`.

---

## 12. Klaim Garansi — Form Tunggal Customer

### 12.1 Field minimum

- Identitas produk/jasa dan order asal terisi dari konteks pemilihan.
- **Jenis/masalah** (pilihan sederhana sesuai Barang/Jasa).
- **Deskripsi masalah** (wajib).
- **Pilihan solusi Customer (wajib, ACC V2.2):**
  - **Klaim Garansi Barang:** `Penggantian Barang` atau `Refund`.
  - **Klaim Garansi Jasa:** `Perbaikan/Pengerjaan Ulang` atau `Refund`.
  - Pilihan ini berarti **solusi yang diharapkan**, bukan persetujuan otomatis. Jika Merchant mengusulkan perbaikan Barang sebagai solusi alternatif yang relevan, Customer harus menyetujuinya.
- **Foto/video bukti** jika relevan; tampilkan petunjuk sederhana agar bukti membantu pemeriksaan.
- Ringkasan cakupan garansi dan tanggal masa berlaku.
- Tombol `Kirim Klaim`.

**Contoh kategori masalah Barang:** tidak berfungsi, kerusakan/cacat, komponen bermasalah, masalah lain yang terkait cakupan garansi.

**Contoh kategori masalah Jasa:** hasil tidak sesuai, masalah sama muncul kembali, kerusakan terkait pekerjaan sebelumnya, dan lainnya.

Tidak meminta ulang data identitas dan detail order yang sudah tersedia dalam konteks pesanan. Tombol `Kirim Klaim` tidak aktif bila pilihan solusi wajib belum dibuat. Jika solusi alternatif ditawarkan setelah peninjauan, tampilkan nama solusi, alasan, dan tombol `Setujui Solusi` / `Tidak Setuju` atau `Minta Peninjauan` yang sesuai; jangan menganggap diam sebagai persetujuan.

### 12.2 Customer melihat setelah submit

- Nomor/referensi klaim yang mudah dibaca.
- **Solusi awal yang dipilih Customer** ditampilkan dalam detail kasus dan tidak berubah diam-diam.
- Label `Diajukan` / `Menunggu Respons Usaha`.
- Waktu kirim, **batas respons 3 × 24 jam**, dan keterangan siapa yang sedang meninjau.
- Timeline sederhana dan catatan komunikasi keputusan.
- Tempat melihat permintaan bukti tambahan bila diperlukan.
- Setelah dikirim, pengajuan muncul pada **Garansi & Pengajuan → Pengajuan** dan dapat dibuka lagi dari Detail Pesanan asal.
- Tautan `Kembali ke Detail Pesanan`.

---

## 13. Flow Klaim Garansi Barang — Sederhana

```text
Customer selesai menerima/membeli barang
    ↓
Garansi Toko aktif sesuai pilihan saat transaksi
    ↓
Customer → Garansi & Pengajuan → Garansi Aktif / Detail Pesanan → Ajukan Klaim
    ↓
Pilih: PENGGANTIAN BARANG atau REFUND + isi masalah/bukti
    ↓
Merchant meninjau dalam 3 × 24 jam
    ├── Menyetujui pilihan Customer → Jalankan penggantian/refund sesuai cakupan
    │                                   ↓
    │                               Tindak lanjut → Selesai
    ├── Menawarkan solusi lain (mis. perbaikan barang)
    │       → wajib persetujuan Customer sebelum dijalankan
    ├── Menolak → WAJIB alasan yang terlihat Customer
    │               Customer dapat Laporkan Masalah bila tidak setuju
    └── Tidak menanggapi 72 jam → TIDAK DITANGGAPI
                                      ↓
                              Customer dapat Laporkan Masalah
```

- Merchant bertanggung jawab atas peninjauan garansi toko.
- Tidak mengasumsikan semua kerusakan otomatis ditanggung garansi.
- Jika hasil keputusan adalah **penggantian barang**, Customer melihat status pemenuhan penggantian dari pengalaman pengiriman barang yang relevan.
- Jika hasilnya **refund**, Customer melihat status refund, **bukan formulir refund baru**.
- Jika harus ada pemeriksaan fisik, tampilkan satu langkah instruksi yang jelas tanpa menciptakan rangkaian status kasus panjang.

---

## 14. Flow Klaim Garansi Jasa — Sederhana

```text
Order Jasa SELESAI
    ↓
Garansi Layanan mulai berlaku
    ↓
Customer Ajukan Klaim + bukti
    ↓
Pilih: PERBAIKAN/PEKERJAAN ULANG atau REFUND
    ↓
Provider meninjau dalam 3 × 24 jam
    ├── Klaim disetujui untuk pengerjaan garansi
    │       ↓
    │   Muncul Pekerjaan Garansi — [Nama Jasa]
    │   [badge GARANSI | referensi order asal]
    │       ↓
    │   Penugasan/pelaksanaan terlihat di pengalaman Modul 05B
    │       ↓
    │   Hasil pekerjaan diperlihatkan kembali di Detail Klaim
    │       ↓
    │   Klaim SELESAI
    │
    ├── Refund disetujui → Lihat Status Refund → penyelesaian sesuai dana
    ├── Provider mengusulkan solusi berbeda → wajib persetujuan Customer
    │
    ├── Ditolak dengan alasan → Customer dapat Laporkan Masalah
    │
    └── Tak ditanggapi 72 jam → TIDAK DITANGGAPI
                                     ↓
                              Customer dapat Laporkan Masalah
```

### 14.1 Identitas pekerjaan garansi

Kartu/list pekerjaan bertajuk **`Klaim Garansi — [Nama Jasa]`**, badge `GARANSI`, memuat sumber `Order Asal`, referensi klaim, lokasi/jadwal bila relevan, serta keterangan **Rp0 untuk pekerjaan yang memang ditanggung garansi**.

- **Bukan order pembelian jasa baru**.
- **Order asal tetap berstatus Selesai**.
- Jika perlu Worker, tampilan penugasan, menuju lokasi, diagnosis, dan pengerjaan mengikuti UI pekerjaan jasa yang sudah ada; **jangan membuat ulang langkah Worker di modul garansi**.
- Di **Detail Pengajuan** cukup status utama `Dalam Penyelesaian`, ringkasan progres pekerjaan, dan tautan opsional `Lihat Detail Pekerjaan Garansi` ke pengalaman 05B yang sudah tersedia. Pekerjaan itu **tidak ditambahkan sebagai Order baru pada Pesanan Saya**.
- **Persetujuan pemeriksaan** tidak sama dengan persetujuan perbaikan gratis. Jika masih menunggu pemeriksaan, tuliskan secara eksplisit.
- Jika masalah ternyata di luar garansi dan memerlukan pekerjaan berbayar, tampilkan **penawaran dan persetujuan Customer** melalui pengalaman Order Jasa yang relevan; tidak boleh tampil sebagai tagihan otomatis dari klaim.
- Bila pekerjaan membutuhkan bahan tambahan atau jadwal ulang, pengguna melihat progres operasional pada halaman pekerjaan, bukan tambahan sepuluh status di halaman klaim.

---

## 15. Status Klaim yang Tampak pada UI

### 15.1 Lima status utama

| Status Customer | Makna | Tampilan aksi |
|---|---|---|
| **Diajukan** | Klaim diterima dan menunggu proses awal | Lihat detail, bukti, batas respons |
| **Ditinjau** | Merchant/Provider menilai pengajuan | Lihat perkembangan, penuhi bukti jika diminta |
| **Dalam Penyelesaian** | Solusi disetujui dan sedang dijalankan | Pantau pekerjaan/penggantian/refund |
| **Selesai** | Solusi yang disepakati benar-benar terlaksana | Lihat hasil & riwayat |
| **Ditolak** | Ada keputusan penolakan dengan alasan | Lihat alasan; Laporkan Masalah jika tidak setuju |

### 15.2 Kondisi khusus, bukan tahap utama baru

- **TIDAK DITANGGAPI** — batas 72 jam terlewati tanpa respons yang bermakna; **bukan penolakan**.
- **Menunggu Informasi Customer** — Merchant/Provider meminta bukti tambahan secara relevan; ada catatan permintaan yang jelas.
- **Dibatalkan** — pengajuan dibatalkan secara sah dan jelas riwayatnya.
- **Menunggu Persetujuan Customer** — solusi berbeda dari pilihan awal Customer dan harus diputuskan Customer. Penolakan alternatif tidak otomatis membatalkan hak klaim atau menyetujui refund.

Jangan menunjukkan status perjalanan Worker (OTW, arrived, diagnosing, dsb.) sebagai status utama klaim; berikan tautan ke pekerjaan jasa bila Customer ingin detail.

---

## 16. Aturan Respons 3 × 24 Jam — Seluruh UX

### 16.1 Berlaku untuk

- **Merchant:** respons awal klaim Garansi Barang dan permintaan Retur Barang.
- **Service Provider:** respons awal klaim Garansi Jasa.

### 16.2 Perilaku tampilan

1. Saat submit sukses, tampil waktu pengajuan, batas 72 jam kalender, dan label **Menunggu Respons**.
2. Detail pengajuan boleh menampilkan hitung mundur informatif; tampilkan **tanggal/jam batas respons** sebagai informasi utama agar tidak membingungkan.
3. Respons bermakna mencakup: menerima untuk penanganan, menolak dengan alasan yang jelas, menawarkan solusi, atau meminta informasi tambahan yang memang diperlukan.
4. Permintaan bukti tambahan tidak boleh menjadi cara untuk mengulur waktu tanpa batas; riwayat permintaan tetap terlihat.
5. Jika 72 jam terlewati tanpa respons yang layak, tampil **`TIDAK DITANGGAPI`** + pesan yang menyatakan pengajuan **belum otomatis ditolak**.
6. Tampilkan CTA **`Laporkan Masalah`** menuju alur pelaporan SERVIO (Modul 09).
7. **Tidak** otomatis menerima klaim, **tidak** otomatis menolak, dan **tidak** otomatis menyetujui refund karena tenggat terlewati.
8. Jika pelaku usaha merespons setelah batas, Customer tetap dapat melihat waktu respons aktual dan riwayat bahwa batas pernah terlewati; laporan yang sudah dikirim tidak otomatis hilang.
9. Notifikasi perubahan status dan pengingat menggunakan pengalaman notifikasi SERVIO yang sudah ada.

### 16.3 Pesan yang ditampilkan

- Menunggu: `Pelaku usaha memiliki waktu 3 × 24 jam sejak pengajuan diterima untuk memberikan tanggapan.`
- Setelah terlewati: `Pengajuan belum ditanggapi dalam batas waktu. Pengajuan Anda belum dinyatakan ditolak. Anda dapat melaporkannya kepada SERVIO.`
- Ditolak: `Pengajuan ditolak oleh pelaku usaha. Lihat alasan dan langkah yang tersedia.`

---

## 17. Retur Barang — Cakupan dan Flow

### 17.1 Ruang lingkup

**Hanya Barang**. Retur berfokus pada barang bermasalah, seperti:

- Barang rusak/cacat.
- Barang salah dikirim.
- Barang tidak sesuai informasi/visual/deskripsi.
- Barang atau komponen kurang.
- Barang tidak berfungsi sebagaimana mestinya.

**Tidak ada fasilitas retur standar karena sekadar berubah pikiran.** Hak konsumen yang dijamin hukum tetap dihormati.

Retur **tidak memerlukan garansi toko aktif** bila keluhan merupakan persoalan pemenuhan transaksi/hak konsumen yang sah.

### 17.2 Model A — Customer memilih solusi di awal

```text
Detail Pesanan Barang
    ↓
Pilih produk/item dan jumlah bermasalah
    ↓
Pilih alasan + keterangan + bukti
    ↓
Pilih solusi yang diinginkan (WAJIB):
    ( ) Refund
    ( ) Penggantian Barang
    ↓
Ajukan Retur
    ↓
Merchant tinjau (3 × 24 jam)
    ├── Setuju → Petunjuk pengiriman balik jika perlu
    │             ↓
    │          Pemeriksaan bila relevan
    │             ↓
    │          Refund / Penggantian → Selesai
    ├── Usul solusi lain → Customer wajib menyetujui perubahan
    ├── Tolak beralasan → Customer dapat melapor bila sengketa
    └── Tak merespons → TIDAK DITANGGAPI → Laporkan Masalah
```

Solusi **Penukaran** dapat dijelaskan melalui pengalaman Penggantian Barang agar opsi Customer tetap sederhana. Bila varian pengganti berbeda, mintakan persetujuan Customer.

### 17.3 Retur parsial

- Customer dapat memilih **item** serta **jumlah unit** yang bermasalah.
- Contoh: membeli 2 unit Sparepart AC dan 1 Kapasitor AC, tetapi hanya 1 Sparepart AC rusak → hanya 1 unit yang diajukan.
- Item lain tidak otomatis dibatalkan.
- Jika pesanan melibatkan beberapa Merchant, tiap pengajuan diproses pada Merchant pemilik itemnya.
- UI harus mencegah pilihan kuantitas melebihi jumlah yang layak diajukan, termasuk item yang sudah pernah diselesaikan lewat retur/refund/penggantian.
- Bila barang tidak pernah diterima atau komponen hilang, tidak perlu instruksi mengirim barang yang tidak dimiliki Customer.

### 17.4 Informasi batas pengajuan

Tampilkan masa pengajuan yang berlaku jika sudah ditetapkan dalam kebijakan SERVIO yang sah, tetapi **jangan menanam angka hari khusus di rencana frontend ini**. Bila ada hak konsumen yang tetap berlaku, jangan menampilkan pesan mutlak yang menyatakan seluruh hak hilang karena jendela operasional telah berakhir.

---

## 18. Retur Barang — Form dan Halaman Detail

### 18.1 Form Ajukan Retur

- Informasi Merchant dan nomor pesanan.
- Checkbox/pilihan item barang dan kuantitas retur (min. 1; tidak lebih dari kuantitas eligible).
- Alasan retur (rusak, salah barang, tidak sesuai, bagian kurang, tidak berfungsi, lainnya yang relevan).
- Deskripsi masalah (wajib).
- Foto/video bukti jika relevan.
- **Pilihan Customer WAJIB (ACC V2.2): `Refund` atau `Penggantian Barang`**.
- Ringkasan item/jumlah dan solusi pilihan.
- Tombol `Ajukan Retur`.

### 18.2 Detail Retur Customer — dari tab Pengajuan

- Informasi barang dan kuantitas yang diajukan.
- Alasan, foto bukti, solusi yang diminta.
- Respons Merchant beserta alasan atau tawaran alternatif.
- Jika solusi berbeda: CTA `Setujui Solusi` / `Minta Peninjauan` atau `Laporkan Masalah` sesuai konteks.
- Instruksi pengembalian hanya bila perlu; alamat/tata cara sesuai informasi yang sah.
- Kolom resi pengembalian dan bukti ongkir jika diperlukan.
- Status pengiriman, pemeriksaan ringkas, serta hasil akhir.
- Jika refund dipilih/diputuskan: komponen **Lihat Status Refund**.
- Jika penggantian: komponen **Lacak Penggantian Barang**.

### 18.3 Merchant — Halaman Retur Masuk

- Daftar permintaan terbaru, filter `Menunggu Respons`, `Diproses`, `Selesai`, `Tidak Ditanggapi`.
- Tampilkan hitung sisa waktu respons 72 jam dengan penekanan pada kasus mendekati tenggat.
- Detail berisi item, kuantitas, bukti, alasan, pilihan solusi Customer dan riwayat.
- Aksi: `Setujui`, `Tolak dengan Alasan`, `Tawarkan Solusi Lain`, dan `Minta Informasi Tambahan` secara relevan.
- Jika perlu barang kembali: instruksi pengembalian; setelah diterima, satu formulir pemeriksaan ringkas (kondisi, foto opsional, catatan, keputusan).
- Tidak perlu formulir peninjauan berlapis atau kalender workflow kompleks.

---

## 19. Status Retur — Lima Status Utama

| Status Customer | Arti | Tindak lanjut |
|---|---|---|
| **Diajukan** | Retur berhasil dikirim | Merchant harus merespons |
| **Ditinjau** | Merchant mengecek alasan/bukti | Menunggu keputusan/tambahan informasi |
| **Menunggu Pengembalian** | Barang harus dikirim balik | Customer lihat instruksi dan kirim bukti/resi |
| **Dalam Penyelesaian** | Pemeriksaan/hasil solusi sedang dilaksanakan | Pantau refund atau penggantian |
| **Selesai** | Solusi disepakati benar-benar tuntas | Lihat hasil akhir |

**Cabang khusus:** Ditolak (wajib alasan), Dibatalkan, Menunggu Persetujuan Customer, dan **TIDAK DITANGGAPI** (72 jam terlewati). Tidak semua kasus harus melewati tahap pengiriman kembali.

**Aturan penting:** Persetujuan permintaan retur **bukan** bukti refund berhasil; status refund terlihat terpisah dan harus akurat. Penyelesaian retur baru dianggap tuntas apabila hasil yang dijanjikan benar-benar selesai.

---

## 20. Ongkos Kirim Retur — Informasi di UI

Bedakan tiga istilah:

1. **Ongkir pembelian awal.**
2. **Ongkir pengembalian barang.**
3. **Ongkir pengiriman barang pengganti.**

| Penyebab | Penanggung biaya yang ditampilkan | Catatan |
|---|---|---|
| Salah barang dari Merchant | Merchant | Termasuk pengganti jika diwajibkan |
| Barang cacat/rusak karena tanggung jawab Merchant | Merchant | Sesuai hasil pemeriksaan dan hak Customer |
| Tidak sesuai deskripsi | Merchant | Ongkir balik/pengganti jika diperlukan |
| Komponen tidak lengkap | Merchant untuk pengiriman pemenuhan kekurangan | Jangan mewajibkan retur barang yang tidak ada |
| Masalah kurir/pengiriman | Tanggung jawab ditetapkan berdasarkan hasil pemeriksaan | Jangan langsung menyalahkan Customer |

**Prinsip UX:** Customer harus melihat siapa penanggung ongkir dan langkah penggantian ongkir bila berlaku, bukan hanya kalimat `ongkir ditanggung penjual` tanpa petunjuk.

- Tidak membuat pengalaman pemesanan kurir baru dalam Phase 07.
- Bila Customer sudah membayar ongkir yang menjadi tanggung jawab Merchant, tampilkan bukti biaya dan kompensasinya sebagai komponen terpisah.
- Jangan otomatis menjanjikan seluruh ongkir pembelian awal direfund saat retur parsial; tampilkan rincian yang sudah disetujui.
- Bila tak perlu pengiriman balik, jangan memunculkan form resi wajib.

---

## 21. Refund Produk & Jasa — Konsep Tampilan

**Refund adalah hasil keuangan dari peristiwa yang sah, bukan form kedua yang harus dibuat Customer.**

### 21.1 Sumber refund

| Sumber | Barang | Jasa |
|---|:---:|:---:|
| Retur yang disetujui | Ya | Tidak |
| Klaim garansi yang diselesaikan dengan refund | Ya | Ya |
| Pembatalan yang memenuhi syarat | Ya | Ya |
| Penyelesaian sengketa | Ya | Ya |

### 21.2 Alur pengalaman Customer — tetap dalam Detail Pengajuan

```text
Kasus Retur/Klaim/Pembatalan/Sengketa mendapat keputusan REFUND
    ↓
Customer melihat rincian keputusan dan jumlah yang disetujui
    ↓
Refund: Disetujui
    ↓
Refund: Diproses
    ↓
Refund: Berhasil hanya setelah dana benar-benar tersedia
    ↓
Customer melihat saldo refund S-Pay dan riwayatnya
    ↓
Customer dapat memilih Tarik Dana melalui pengalaman S-Pay
```

Bila terdapat kendala, tampilkan status **Terkendala** dengan penjelasan yang bisa dimengerti dan jalur bantuan.

### 21.3 Status refund yang terlihat

| Status | Pesan untuk Customer |
|---|---|
| **Disetujui** | Refund telah disetujui, dana belum tentu tersedia |
| **Diproses** | Proses penyediaan/pengembalian dana sedang berjalan |
| **Berhasil** | Dana refund benar-benar telah masuk ke saldo S-Pay yang tersedia |
| **Terkendala** | Pengembalian dana belum berhasil; lihat informasi tindak lanjut |

Penolakan refund tercatat sebagai **keputusan kasus** dengan alasan, bukan status gagal pembayaran.

### 21.4 Rincian nominal yang harus terlihat

- Nilai barang/jasa yang disetujui untuk dikembalikan.
- Refund penuh atau sebagian.
- Penyesuaian biaya aplikasi, pajak, dan ongkir bila berlaku sesuai keputusan yang sah.
- Jumlah final refund, tanggal keputusan, sumber kasus, serta identitas order.
- Riwayat refund terdahulu jika relevan, agar Customer tidak mengira jumlah yang sama dapat ditarik dua kali.

**Tidak ada persentase refund otomatis yang ditanam di UI.** Refund tidak boleh ditampilkan melebihi sisa nilai yang secara sah dapat dikembalikan.

### 21.5 Hubungan tampilan Refund dan S-Pay

- **Detail Kasus/Order** = menjelaskan *mengapa refund disetujui* dan nominal hasil keputusan.
- **S-Pay Customer** = memperlihatkan *dana refund yang benar-benar sudah tersedia*, riwayat, dan fitur tarik dana.
- **Jangan menampilkan approved refund sebagai saldo yang siap ditarik**.
- Tidak ada fitur Top Up atau Bayar dengan saldo S-Pay di sini.

---

## 22. Pengalaman Merchant — After-Sales Dashboard

### 22.1 Ringkasan halaman

Tampilkan kartu ringkasan ringan:

- Klaim Garansi menunggu respons.
- Retur menunggu respons.
- Klaim/Retur mendekati 72 jam.
- Pengajuan dalam penyelesaian.
- Ulasan belum dibalas.

**Semua angka hanya milik organisasi Merchant yang sedang aktif.**

### 22.2 Pengaturan Garansi

- Daftar opsi Garansi Toko yang dibuat sendiri; tambah/edit/nonaktifkan.
- Desain ringkas, tidak memerlukan tabel kebijakan per SKU yang kompleks.
- Katalog cukup mengacu pada dropdown pilihan.

### 22.3 Klaim Garansi

- Daftar klaim berdasarkan terbaru dan urgensi respons.
- Detail Customer, Barang, order asal, bukti, ketentuan garansi, riwayat.
- Aksi `Setujui Pilihan Customer`, `Tolak` dengan alasan, `Minta Bukti`, atau `Tawarkan Solusi Alternatif`; alternatif wajib mendapat persetujuan Customer sebelum dieksekusi.
- Setelah keputusan, tampil riwayat/tindak lanjut yang disepakati, bukan membuat kasus baru tanpa perlu.

### 22.4 Retur

- Daftar retur dengan nomor, item dan kuantitas, masalah, solusi Customer.
- Wajib mampu menangani **sebagian item/kuantitas**.
- Pemeriksaan barang cukup satu panel sederhana jika diperlukan.
- Jika Merchant mengusulkan solusi lain, tampil status menunggu persetujuan Customer; tidak boleh langsung menandai sukses.

### 22.5 Rating & Ulasan

- Semua ulasan terkait berbagai order dalam satu inbox; filter produk/Order ID opsional.
- Balas satu kali secara resmi; dapat menyunting balasan dengan informasi perubahan.
- Jangan memaksa pengelolaan ulasan melalui masing-masing halaman produk.

---

## 23. Pengalaman Service Provider — After-Sales Dashboard

### 23.1 Ringkasan

- Klaim Garansi Jasa menunggu respons.
- Klaim mendekati/melewati 72 jam.
- Pekerjaan Garansi sedang berlangsung.
- Ulasan belum dibalas.

### 23.2 Pengaturan Garansi Layanan

- Membuat beberapa opsi dengan input durasi hari sesuai kebutuhan usaha.
- Setiap jasa dapat mengaktifkan/menonaktifkan garansi serta memilih opsi yang berlaku.
- Tidak perlu konfigurasi penugasan Worker dari halaman ini.

### 23.3 Klaim Garansi Jasa

- Daftar masuk lintas order jasa; urutkan menurut terbaru dan tenggat respons.
- Lihat deskripsi, bukti, garansi berlaku, dan order asal.
- Tanggapi dalam 72 jam: tinjau **pilihan solusi Customer** (Pengerjaan Ulang/Refund), terima untuk pemeriksaan/penanganan, tolak beralasan, tawarkan alternatif yang butuh persetujuan, atau minta bukti relevan.
- Jika disetujui untuk pengerjaan ulang, beri CTA `Lihat/Buat Pekerjaan Garansi` pada pengalaman pekerjaan Modul 05B yang sudah ada.
- Tampilkan badge `GARANSI`, order asal, dan keterangan Rp0 hanya untuk bagian yang ditanggung.
- Jika perlu pekerjaan berbayar di luar cakupan, tunjukkan persetujuan Customer sebagai langkah tersendiri sebelum pekerjaan berbayar.
- Hasil pekerjaan kembali terlihat pada klaim yang sama.

### 23.4 Rating & Ulasan

- Satu inbox untuk semua ulasan layanan dan penilaian Provider.
- Tidak ada agregasi atau form Worker Rating.
- Balas ulasan seperti Merchant.

**Provider tidak memiliki fitur Retur Barang.**

---

## 24. Pengalaman Admin Operations dan Customer Support

### 24.1 Admin Operations — Pemantauan & Moderasi

- Pantau daftar kasus yang memerlukan perhatian operasional, tanpa harus membuat dashboard seluruh riwayat order baru.
- Ringkasan klaim/retur dan status yang sedang bermasalah; filter jenis kasus dan organisasi.
- Detail bukti, keputusan, tenggat respons dan riwayat aktivitas untuk kasus yang memang dapat diperiksa Admin.
- Moderasi **Ulasan** dan **Balasan Pelaku Usaha**: lihat laporan, alasan, konten, putuskan tampil/sembunyikan menurut kebijakan.
- Tidak dapat mengedit bintang Customer atau mengubah isi review menjadi opini Admin.
- Aksi operasional existing tetap mengikuti kewenangan yang sah; UI tidak otomatis memberi Admin hak melakukan refund atau transaksi keuangan.

### 24.2 Customer Support — Laporan Tidak Ditanggapi / Sengketa

**Customer menekan `Laporkan Masalah`** dari klaim atau retur, terutama ketika:

- Melewati tenggat 72 jam tanpa respons.
- Keputusan usaha dianggap tidak sesuai fakta/bukti.
- Solusi alternatif tidak mendapat kesepakatan.

**Tampilan laporan sebaiknya sudah membawa ringkasan konteks** (jenis kasus, pesanan, pelaku usaha, masalah, riwayat/keputusan, bukti), sehingga Customer tidak mengetik seluruh kronologi dari nol.

- Customer melihat konfirmasi laporan telah dibuat dan tautan menuju detail laporan.
- Laporan diproses melalui pengalaman **Support & Dispute Modul 09**.
- Garansi/retur tetap menampilkan status dan riwayatnya; jangan menghilangkan riwayat hanya karena laporan dibuka.
- Laporan bukan otomatis persetujuan klaim atau refund.

---

## 25. Tampilan Kontekstual Modul Lain — Hanya Perspektif Pengguna

| Area aplikasi | Informasi/tombol Phase 07 yang ditampilkan |
|---|---|
| Katalog Produk | Badge Garansi Toko + durasi/ketentuan jika ditawarkan; rating Produk dan reputasi Merchant terpisah |
| Katalog Jasa | Badge Garansi Layanan + durasi/ketentuan jika ditawarkan; rating Jasa dan reputasi Provider terpisah |
| Checkout Barang/Jasa | Informasi garansi yang dijanjikan ditampilkan sebelum konfirmasi |
| Order Barang | CTA Rating, Garansi, Retur dan status Refund sesuai syarat; Detail Retur/Refund membuka kasus pada `Garansi & Pengajuan → Pengajuan` |
| Order Jasa | CTA Rating, Garansi, Pekerjaan Garansi dan status Refund sesuai syarat; Detail Klaim/Refund membuka kasus pada `Garansi & Pengajuan → Pengajuan` |
| Pekerjaan Jasa | Badge `GARANSI` dan referensi klaim/order asal untuk tugas garansi; Customer mengawasi progres dari Detail Pengajuan, **bukan order komersial baru** |
| Beranda Customer | Shortcut pengajuan/garansi aktif bila relevan; S-Pay tetap pada lokasi yang sudah disepakati |
| S-Pay Customer | Saldo refund tersedia, riwayat refund dan tarik dana; bukan pusat mengajukan retur/klaim |
| Notifikasi | Pengajuan masuk, tanggapan, permintaan bukti, 72 jam, keputusan, selesai, ulasan dibalas |
| Support & Dispute | Laporan atas NO_RESPONSE atau ketidaksepakatan, dengan konteks kasus terkait |

Tabel ini menjelaskan **lokasi pengalaman dan perpindahan pengguna**, tidak mengubah ruang lingkup implementasi modul lain.

---

## 26. Contoh Wireframe Teks (Bukan Desain Final)

### 26.1 Customer — Detail Pesanan Barang

```text
┌────────────────────────────────────────────────────┐
│ Pesanan Barang                      [SELESAI]      │
│ ORD-BRG-001                                       │
├────────────────────────────────────────────────────┤
│ [Foto] Sparepart AC A     x2         Rp200.000    │
│        Merchant: Toko A                          │
│                                                    │
│ [Beri Ulasan] [Ajukan Retur]                       │
│                                                    │
│ Garansi Toko — 30 hari         [Lihat Garansi]     │
│ Berlaku s.d. [tanggal]                            │
│                                                    │
│ Refund: [Tampil hanya bila ada]                    │
│ [Lihat Status Refund]                              │
└────────────────────────────────────────────────────┘
```

### 26.2 Customer — Detail Pesanan Jasa

```text
┌────────────────────────────────────────────────────┐
│ Pesanan Jasa                        [SELESAI]      │
│ Service AC • Provider B                           │
├────────────────────────────────────────────────────┤
│ [Beri Ulasan]                                      │
│                                                    │
│ Garansi Layanan 20 hari       [Ajukan Klaim]       │
│                                                    │
│ Klaim Garansi — Service AC       [DIPROSES]        │
│ Pekerjaan Garansi Rp0   [Pantau Pekerjaan]         │
│                                                    │
│ Refund [tampil hanya bila ada]                     │
└────────────────────────────────────────────────────┘
```

### 26.3 Customer — Garansi & Pengajuan

```text
┌────────────────────────────────────────────────────┐
│ Garansi & Pengajuan                                │
│ [ Garansi Aktif ] [ Pengajuan ] [ Berakhir ]       │
│                                                    │
│ Saat TAB PENGAJUAN:                               │
│ Jenis: [ Semua / Klaim Barang / Klaim Jasa / Retur]│
│ Status: [ Semua / Berjalan / Selesai / Ditolak ]   │
├────────────────────────────────────────────────────┤
│ [Jasa] Klaim Garansi — Service AC      [DIPROSES] │
│        Provider B • Klaim CLM-001                 │
│        Pekerjaan Garansi → [Lihat Pengajuan]       │
├────────────────────────────────────────────────────┤
│ [Barang] Retur — Sparepart AC       [MENUNGGU]    │
│          Merchant A • Retur RET-001                │
│          Pilihan: Penggantian → [Lihat Pengajuan]  │
├────────────────────────────────────────────────────┤
│ [Barang] Klaim Garansi — Kapasitor    [NO_RESPONSE]│
│          Merchant A → [Lihat] [Laporkan Masalah]   │
└────────────────────────────────────────────────────┘

TAB GARANSI AKTIF & BERAKHIR: daftar hak garansi usaha
[Semua | Barang | Jasa] → Detail Garansi → Ajukan Klaim.
```

### 26.3A Customer — Detail Pengajuan Terpadu

```text
┌────────────────────────────────────────────────────┐
│ KLAIM GARANSI / RETUR • Referensi • Order asal     │
│ [DIAJUKAN / DITINJAU / DALAM PENYELESAIAN / ...]  │
├────────────────────────────────────────────────────┤
│ Produk/Jasa • Merchant/Provider                    │
│ Masalah • Foto • Solusi disepakati                 │
│ Diajukan [jam] → Batas respons [jam + 72 jam]     │
│ TIMELINE: Pengajuan → Review → Tindak Lanjut       │
├────────────────────────────────────────────────────┤
│ [KONTEKSTUAL]                                      │
│ Jika GARANSI JASA: Pekerjaan Garansi, status       │
│ Jika RETUR: kirim barang/inspeksi/penggantian      │
│ Jika REFUND: Disetujui → Diproses → Berhasil       │
│             Lihat riwayat S-Pay jika tersedia       │
├────────────────────────────────────────────────────┤
│ [Lihat Order Asal] [Laporkan Masalah jika layak]   │
└────────────────────────────────────────────────────┘
```

### 26.4 Merchant — Ulasan Masuk

```text
┌────────────────────────────────────────────────────┐
│ Rating & Ulasan                                    │
│ Rating Produk | Rating Merchant | Belum Dibalas    │
│ [Cari Order/Produk] [Filter Belum Dibalas]          │
├────────────────────────────────────────────────────┤
│ ORD-BRG-001  • Sparepart AC                        │
│ Produk ★★★★★  | Merchant ★★★★☆                    │
│ "Barang sesuai deskripsi, pengemasan bagus."       │
│ [Balas Ulasan]                                     │
├────────────────────────────────────────────────────┤
│ ORD-BRG-002  • Kapasitor AC                        │
│ Produk ★★★★☆  | Merchant ★★★★★                    │
│ "Produknya baik dan toko responsif."               │
│ Balasan resmi: "Terima kasih ..." [Edit]           │
└────────────────────────────────────────────────────┘
```

### 26.5 Klaim/Retur — Tidak Ditanggapi

```text
┌────────────────────────────────────────────────────┐
│ Pengajuan #CLM-001               [TIDAK DITANGGAPI]│
│ Service AC • Provider B                           │
│ Diajukan: [tanggal, jam]                          │
│ Batas respons: [tanggal + 72 jam]                  │
│                                                    │
│ Pelaku usaha belum menanggapi pengajuan Anda.     │
│ Pengajuan TIDAK otomatis ditolak.                 │
│                                                    │
│ [Laporkan Masalah]                                 │
└────────────────────────────────────────────────────┘
```

**Catatan:** wireframe menunjukkan hierarki konten dan lokasi tombol, bukan warna, tipografi, ukuran final, atau route implementasi.

---

## 27. Konsistensi Desain, Responsivitas, dan Aksesibilitas

- Ikuti dokumen **`design.md`** dan komponen desain resmi frontend SERVIO. Jangan menciptakan palet warna khusus Phase 07.
- Gunakan komponen dasar existing untuk tab, kartu, form, badge, dialog, modal/drawer, timeline dan toast.
- Responsif untuk web desktop/tablet dan layar mobile; pada mobile, aksi utama harus tetap mudah dijangkau.
- Tidak mengharuskan hover untuk membaca status atau membuka aksi penting.
- Bintang rating harus dapat dioperasikan dengan keyboard dan pembaca layar; tampilkan label numerik seperti `4 dari 5`.
- Pesan kesalahan form spesifik dan dekat dengan input.
- Saat bukti diunggah, tampilkan pratinjau/nama file, batas format/ukuran yang benar-benar didukung, serta kemampuan menghapus sebelum submit.
- Loading, kosong, gagal memuat, dan tidak memenuhi syarat memiliki state terpisah.
- Jangan gunakan warna sebagai satu-satunya penanda status; selalu sertakan teks.
- Tombol yang tidak dapat digunakan harus disertai penjelasan sebab, bukan hanya disabled tanpa konteks.
- Hindari animasi panjang untuk proses pengajuan; transisi ringan boleh selama tidak mengganggu aksesibilitas.
- Hindari memperlihatkan nomor telepon/alamat lengkap Customer secara publik pada bagian ulasan katalog.
- Jika navigasi yang sudah ada berbeda antara web dan mobile, gunakan padanan pengalaman yang sama tanpa memaksakan sidebar identik.

---

## 28. Empty State, Error State, dan Pesan Penting

| Layar/kondisi | Pesan yang disarankan | CTA |
|---|---|---|
| Belum ada garansi | `Belum ada garansi usaha yang aktif untuk pesanan Anda.` | `Lihat Pesanan` |
| Garansi baru tak dapat diajukan | `Masa garansi usaha sudah berakhir.` | `Lihat Ketentuan` / bantuan yang relevan |
| Belum ada pengajuan | `Belum ada pengajuan klaim atau retur.` | `Lihat Pesanan Saya` / `Lihat Garansi Aktif` |
| Usaha belum punya opsi garansi | `Belum ada pilihan garansi.` | `Buat Garansi` |
| Dropdown garansi kosong | `Buat pilihan garansi terlebih dahulu untuk produk/jasa ini.` | `Atur Garansi` |
| Review belum ada | `Belum ada ulasan terverifikasi.` | Tidak memaksa aksi |
| Review sudah diberikan | `Anda sudah memberikan ulasan untuk transaksi ini.` | `Lihat Ulasan` |
| Terlambat respons | `Pelaku usaha belum menanggapi dalam 3 × 24 jam. Ini bukan penolakan otomatis.` | `Laporkan Masalah` |
| Retur item tidak layak | `Item ini tidak tersedia untuk pengajuan retur melalui alur ini.` | `Lihat Ketentuan / Bantuan` |
| Jumlah retur terlalu besar | `Jumlah yang dipilih melebihi jumlah barang yang dapat diajukan.` | Koreksi jumlah |
| Refund belum tersedia | `Refund disetujui dan masih diproses. Saldo S-Pay belum bertambah.` | `Lihat Status` |
| Refund berhasil | `Dana refund sudah tersedia di S-Pay.` | `Buka S-Pay` |
| Refund terkendala | `Pengembalian dana belum berhasil. Lihat keterangan untuk tindak lanjut.` | `Lihat Detail / Bantuan` |
| Tidak ada retur Merchant | `Belum ada pengajuan retur yang masuk.` | Kembali ke daftar |
| Tidak ada ulasan belum dibalas | `Semua ulasan yang masuk sudah ditanggapi.` | `Lihat Semua Ulasan` |

---

## 29. Skenario Kritis yang Harus Terlihat Benar di UI

### Review

- Order belum selesai: tombol Beri Ulasan tidak muncul.
- Selesai: bisa memberi dua rating dan satu ulasan; Worker tidak ditampilkan sebagai target.
- Multi-item dalam satu checkout: Produk A dan B dapat diulas, Merchant yang sama tidak dinilai berulang.
- Jumlah beli dua unit item identik: satu review per item transaksi yang layak.
- Setelah submit: tidak ada tombol yang memicu review duplikat.
- Merchant/Provider membalas: balasan muncul di lokasi publik yang benar.
- Retur/refund kemudian terjadi: ulasan tidak otomatis hilang.

### Garansi dan Klaim

- Merchant/Provider memiliki banyak pilihan durasi custom.
- Katalog tanpa garansi tambahan tidak menampilkan janji garansi usaha yang tidak ada.
- Katalog dengan garansi menampilkan opsi yang dipilih sebelum pembelian.
- Garansi pilihan lama tetap terlihat sesuai janji pada riwayat pesanan lama saat pilihan usaha kemudian berubah.
- Klaim dibuat ketika garansi aktif; tenggat garansi habis saat proses berjalan: klaim tetap bisa dipantau di **Garansi & Pengajuan → Pengajuan**, bukan pindah atau hilang.
- Klaim Barang wajib mencatat pilihan awal Penggantian/Refund; klaim Jasa wajib mencatat pilihan awal Pengerjaan Ulang/Refund (ACC V2.2), tanpa otomatis mengesahkan solusi.
- Klaim disetujui untuk perbaikan jasa: Pekerjaan Garansi muncul di Detail Pengajuan, order asal tetap selesai dan tidak muncul pesanan komersial baru pada Pesanan Saya.
- Klaim inspeksi: tidak otomatis berlabel `Gratis` sebelum cakupan dipastikan.
- Jasa di luar garansi: penawaran tambahan memerlukan persetujuan Customer.
- Lewat 72 jam tanpa respons: **NO_RESPONSE**, tombol laporan, tanpa auto-reject/auto-refund.

### Retur dan Refund

- Retur hanya ditawarkan pada Order Barang; tidak ada di Order Jasa; pengajuan retur tetap muncul di tab **Pengajuan** walau barang tanpa garansi usaha.
- Tidak ada retur sekadar berubah pikiran sebagai fasilitas standar.
- Retur satu dari beberapa item tidak membatalkan semua item.
- Customer wajib memilih Penggantian/Refund pada retur; solusi Merchant berbeda meminta konfirmasi. Solusi awal yang sama juga wajib ditampilkan pada klaim garansi Barang (ACC V2.2).
- Barang tak diterima: tidak ada instruksi resi balik barang yang tidak dimiliki.
- Ongkir balik/penggantian ditampilkan terpisah bila berlaku.
- Retur disetujui ≠ refund sudah selesai.
- Refund disetujui tetapi dana belum ada: jangan menampilkan `Berhasil` atau saldo S-Pay bertambah.
- Refund sebagian dan beberapa pengembalian pada satu order memiliki riwayat jelas.
- Merchant/Provider tidak merespons: kasus dapat dilaporkan tanpa memaksa Customer membuat klaim dari awal.

---

## 30. Acceptance Criteria — Frontend Planning

### Customer — Navigasi dan Order

- [ ] Sidebar/menu Customer menampilkan **Pesanan Saya** dan **Garansi & Pengajuan** tanpa duplikasi Garansi Barang/Jasa atau menu Retur/Refund sendiri.
- [ ] Pesanan Saya memiliki tab **Barang** dan **Jasa**.
- [ ] Detail Pesanan Barang menempatkan Rating, Garansi, Retur, dan Refund secara kontekstual.
- [ ] Detail Pesanan Jasa menempatkan Rating, Garansi, Pekerjaan Garansi, dan Refund; tanpa Retur.
- [ ] Beranda menampilkan shortcut pengajuan bila dibutuhkan, tanpa duplikasi daftar lengkap.

### Rating & Ulasan

- [ ] Hanya transaksi Selesai yang boleh masuk flow rating.
- [ ] Produk dinilai terpisah dari Merchant; Jasa dinilai terpisah dari Provider.
- [ ] **Tidak ada Worker Rating**.
- [ ] Satu flow form memuat dua bintang dan satu konten ulasan opsional.
- [ ] Tag pengalaman relevan untuk jenis transaksi, tidak membebani dengan terlalu banyak bintang.
- [ ] Review per produk/jasa menuju detail katalog terkait.
- [ ] Reputasi usaha ditampilkan terpisah dari rating katalog.
- [ ] Multi-item/multi-Merchant tidak membuat rating Merchant berulang dalam satu suborder.
- [ ] Merchant/Provider mendapat satu inbox ulasan lintas order.
- [ ] Merchant/Provider dapat membuat satu balasan resmi dan melihat/menyuntingnya sesuai aturan.
- [ ] Balasan muncul publik; moderasi dapat menyembunyikan konten yang melanggar.

### Garansi & Klaim

- [ ] Merchant/Provider dapat mengelola beberapa pilihan garansi sendiri.
- [ ] Input durasi hari **bebas angka positif**, bukan 10/20/30 hari hardcoded.
- [ ] Tambah/Edit Katalog Produk/Jasa memiliki pilihan garansi Tidak/Ya dan dropdown saat Ya.
- [ ] Dropdown menampilkan pilihan garansi aktif milik usaha terkait saja.
- [ ] Garansi tampil pada card/detail katalog, checkout, pesanan dan Garansi & Pengajuan bila ditawarkan.
- [ ] Garansi & Pengajuan memiliki tab **Garansi Aktif / Pengajuan / Berakhir**; filter jenis garansi Semua/Barang/Jasa dan filter Pengajuan Semua/Klaim Barang/Klaim Jasa/Retur Barang + status.
- [ ] Detail Garansi menampilkan masa berlaku, cakupan dan pilihan ajukan klaim yang layak.
- [ ] Tab Pengajuan menampilkan seluruh klaim dan retur (termasuk selesai/ditolak), meskipun produk tidak punya garansi usaha.
- [ ] Semua hasil klaim/retur—pekerjaan garansi jasa, penggantian barang, refund—ditracking dalam **Detail Pengajuan yang sama**, dengan substatus relevan.
- [ ] Form klaim sederhana, data order tidak perlu diinput ulang; **wajib memilih solusi awal**: klaim Barang Penggantian/Refund, klaim Jasa Pengerjaan Ulang/Refund (ACC V2.2).
- [ ] Status klaim tidak menduplikasi semua tahap Worker.
- [ ] Klaim jasa yang disetujui untuk perbaikan tampil sebagai Pekerjaan Garansi, bukan order komersial baru.
- [ ] Tenggat respons **3 × 24 jam** terlihat untuk Merchant/Provider.
- [ ] Saat tidak direspons, status **TIDAK DITANGGAPI** muncul, tidak otomatis ditolak, dan CTA Laporkan Masalah tersedia.

### Retur

- [ ] Retur hanya di Order Barang dan berfokus pada barang bermasalah.
- [ ] Form retur bisa memilih item dan kuantitas yang layak serta **wajib memilih** Penggantian/Refund.
- [ ] Customer memilih Refund/Penggantian sebelum Merchant menilai.
- [ ] Tawaran solusi berbeda meminta persetujuan Customer; **jangan menganggap diam sebagai persetujuan** dan jangan melakukan auto-refund karena 72 jam lewat.
- [ ] Lima status utama retur terbaca dengan jelas.
- [ ] Pengajuan retur dapat dibuka lewat Detail Pesanan asal dan tab Pengajuan, tanpa membuat pesanan Barang baru.
- [ ] Tanpa barang fisik untuk dikirim, UI tidak memaksa upload resi balik.
- [ ] Penanggung ongkir dan rincian penggantian ongkir dapat dibaca.
- [ ] Retur melewati tenggat respons menampilkan NO_RESPONSE dan akses laporan.

### Refund

- [ ] Refund menjadi hasil kasus, bukan form permohonan kedua atau tab sidebar sendiri; status refund tampil dalam detail pengajuan asal.
- [ ] Produk dan Jasa sama-sama dapat memiliki refund penuh/sebagian.
- [ ] Status Disetujui/Diproses/Berhasil/Terkendala punya penjelasan yang tepat.
- [ ] Refund hanya tampil sebagai saldo S-Pay tersedia ketika benar-benar berhasil terdanai.
- [ ] Detail refund menampilkan nominal dan komponen penyesuaian bila relevan.
- [ ] Halaman refund tidak menambahkan top-up, pembayaran saldo, atau pengaturan saldo baru.

### Global UI

- [ ] Tidak menghapus fitur halaman existing yang di luar cakupan.
- [ ] Menerapkan `design.md`, termasuk pada mobile.
- [ ] Tidak membuat dashboard/route duplikat untuk fungsi yang sudah ada.
- [ ] Loading, kosong, gagal, tidak layak, dan sukses dibedakan.
- [ ] Keyboard dan screen reader dapat memakai rating serta tindakan utama.
- [ ] Data akun/organisasi tidak tampil silang pada dashboard pelaku usaha.
- [ ] **Dokumen dan cakupan implementasi tetap frontend saja.**

---

## 31. Pemetaan Simplifikasi dari Planning Sebelumnya

| Bagian lama yang kompleks | Keputusan V2 untuk UI |
|---|---|
| Garansi Produk dan Garansi Jasa dalam menu Customer terpisah | **Gabung Garansi & Pengajuan**, gunakan tab garansi dan filter jenis |
| Pengaturan garansi satu per katalog yang berulang | **Pilihan garansi usaha**: buat sekali, pilih di katalog |
| Garansi default menyeluruh tanpa pilihan | **Tidak wajib berlaku untuk semua katalog**, toggle per katalog |
| Warranty dan Claim sebagai banyak layar/tahap | **Satu pengalaman Garansi & Klaim** bagi pengguna |
| Status klaim jasa mengikuti semua tahap teknisi | **Lima status utama klaim**, detail Worker berada di pekerjaan 05B |
| Pekerjaan garansi membuat Customer merasa memesan ulang | **Pekerjaan Garansi** bertipe khusus yang tetap terhubung dengan order asal |
| Worker Rating pada Jasa | Diganti **Rating Service Provider** |
| Dashboard review dikelola dari tiap katalog | **Satu inbox ulasan lintas order** dengan filter |
| Bisnis tidak dapat membalas review | **Balas Ulasan** resmi dan publik |
| Retur punya terlalu banyak tahapan | **Lima status utama**, cabang khusus seperlunya |
| Merchant menentukan solusi sepihak | **Customer pilih dahulu**, Merchant review; alternatif perlu persetujuan |
| Refund sebagai proses/form terpisah di Customer | **Status refund muncul dari Detail Pengajuan kasus asal**, hasil uang dipantau di S-Pay |
| Retur dan klaim sebelumnya dipantau dari layar berbeda | **Satu tab Pengajuan untuk seluruh klaim garansi Barang/Jasa dan retur Barang**, termasuk yang selesai/ditolak dan retur tanpa garansi usaha |
| Pekerjaan garansi jasa / penggantian berpotensi tampak seperti order baru | **Hanya subproses penyelesaian pada Detail Pengajuan**, tidak menambah order komersial ke Pesanan Saya |
| Tidak ada aturan tampilan respons awal konsisten | **3 × 24 jam; NO_RESPONSE; Laporkan Masalah** |

---

## 32. Aturan Penting Saat Membuat Tampilan dari Planning Ini

1. Prioritaskan menjaga fitur dan navigasi frontend SERVIO yang sudah tersedia; lakukan konsolidasi menu hanya pada cakupan yang disetujui.
2. Penamaan menu boleh mengikuti konvensi bahasa di repository, tetapi makna, hak tindakan, dan susunan fitur tidak berubah.
3. Semua filter dan status harus memiliki label Customer yang jelas; status teknis tidak perlu diekspos mentah kepada pengguna.
4. Garansi dari usaha wajib ditampilkan sesuai janji saat transaksi, tidak berdasarkan perubahan kebijakan saat ini yang merugikan riwayat Customer.
5. **Refund decision** dan **dana tersedia** adalah dua keadaan berbeda.
6. Hak Customer tidak otomatis hilang karena pelaku usaha memilih **Tanpa Garansi Tambahan**.
7. Merchant/Provider yang diam **tidak otomatis menang**; NO_RESPONSE membuka jalur laporan.
8. Tidak membuat ulang proses checkout/order, pekerjaan Worker, pembayaran, S-Pay, atau penanganan sengketa di halaman Phase 07.
9. Implementasi dan integrasi modul lain boleh direncanakan kemudian, namun **dokumen ini tidak memberikan spesifikasi teknis di luar frontend**.

---

## 33. Final Decision Register & Lock Statement

| Area | Keputusan yang terkunci pada Frontend Planning V2 |
|---|---|
| Customer navigation | Pesanan Saya (Barang/Jasa) + **Garansi & Pengajuan** (Garansi Aktif/Pengajuan/Berakhir; filter garansi dan jenis/status kasus) |
| Rating/Review | Produk+Merchant atau Jasa+Provider; setelah Order Selesai; no Worker Rating |
| Review presentation | Katalog terkait + reputasi usaha terpisah; inbox usaha lintas order |
| Reply | Merchant/Provider boleh membalas satu kali per review, publik, dapat dimoderasi |
| Garansi usaha | Banyak pilihan dengan durasi hari input sendiri |
| Garansi katalog | Toggle Ya/Tidak; dropdown pilihan aktif usaha |
| Klaim garansi | Form sederhana, lima status utama; **solusi awal Barang = Penggantian/Refund, Jasa = Pengerjaan Ulang/Refund**, pilihan tidak otomatis ACC; riwayat & tindak lanjut tetap di Detail Pengajuan |
| Klaim jasa | Pekerjaan Garansi di 05B; order asal tetap Selesai; Customer memantau lewat Detail Pengajuan; tidak ada order komersial baru |
| Preferensi solusi klaim & retur (ACC V2.2) | **Wajib dipilih saat pengajuan awal:** Barang (klaim/retur) Penggantian atau Refund; Jasa (klaim) Pengerjaan Ulang atau Refund; alternatif hanya dengan persetujuan Customer, tidak ada auto-approval |
| Respons awal | **72 jam**; jika diam → **TIDAK DITANGGAPI**, bukan ditolak; laporan ke 09 |
| Retur | Hanya barang bermasalah; Customer **wajib pilih Refund/Penggantian** terlebih dahulu; seluruh pengajuan termasuk tanpa garansi berada di tab Pengajuan |
| Retur parsial | Pilih item/kuantitas, tidak memengaruhi item lainnya |
| Status retur | Lima status utama, dengan cabang khusus beralasan |
| Ongkir | Berdasarkan tanggung jawab masalah; ditampilkan terpisah |
| Refund | Berlaku Barang/Jasa; penuh/sebagian; status dalam Detail Pengajuan kasus asal; saldo S-Pay hanya setelah tersedia |
| Periode retur | **Belum ada angka hari final**; tidak di-hardcode |
| Arsitektur implementasi | **Tidak dibahas**; dokumen ini terbatas pada frontend bisnis dan UI/UX |

**🔒 PHASE 07 — AFTER-SALES & FEEDBACK — FRONTEND PLANNING V2.2: FINAL LOCKED.**

**Amendemen V2.2 (ACC 3 November 2026):** Semua pengajuan klaim garansi Barang dan Jasa kini **WAJIB memiliki pilihan solusi awal Customer** sebagaimana retur Barang: **Barang = Penggantian atau Refund; Jasa = Perbaikan/Pengerjaan Ulang atau Refund**. Merchant/Provider memverifikasi kelayakan dan boleh menyetujui, menolak beralasan, atau menawarkan alternatif yang **wajib disetujui Customer**. Tidak ada auto-approval atau auto-refund. Keputusan V2.1 lainnya dipertahankan.

**Amendemen V2.1:** ACC perubahan Customer dari `Garansi Saya` menjadi `Garansi & Pengajuan`, tab `Klaim` menjadi `Pengajuan`, penyatuan tracking klaim/retur/pekerjaan garansi/penggantian/refund ke **Detail Pengajuan** tanpa order komersial Customer baru.

**Makna lock:** keputusan business flow yang tampak di antarmuka, struktur navigasi, layar, hak interaksi pengguna, dan rancangan UI/UX dalam dokumen ini disetujui sebagai acuan frontend. Lock ini **tidak menyatakan implementasi telah dilakukan** dan **tidak mengunci keputusan teknis atau nominal operasional yang sengaja belum ditetapkan**.


---

## 34. Addendum V2.2 — Matriks Solusi Customer (ACC/LOCKED 3 November 2026)

| Jenis pengajuan | Pilihan pada form Customer (wajib pilih satu) | Pihak yang menilai | Hasil jika disetujui |
|---|---|---|---|
| Klaim Garansi Barang | **Penggantian Barang / Refund** | Merchant | Penggantian terkait order asal / permintaan refund ke Finance |
| Retur Barang bermasalah | **Penggantian Barang / Refund** | Merchant | Penggantian terkait order asal / permintaan refund ke Finance |
| Klaim Garansi Jasa | **Perbaikan/Pengerjaan Ulang / Refund** | Provider | Pekerjaan garansi melalui pengalaman 05B / permintaan refund ke Finance |

**Rangkaian yang terkunci di tampilan:**

1. Customer mengirim alasan + bukti + **pilihan solusi awal** sesuai jenis; sistem memvalidasi bahwa pilihan diisi.
2. Merchant/Provider meninjau dalam **3 × 24 jam kalender**. Pilihan Customer tidak otomatis menciptakan kewajiban refund yang telah disetujui; pemeriksaan dilakukan menurut fakta, garansi/hak konsumen dan kewajiban yang sah.
3. Pelaku usaha bisa menyetujui solusi, menolak dengan **alasan jelas**, meminta bukti relevan, atau **menawarkan alternatif** dengan alasan. Misalnya Merchant menawarkan perbaikan Barang sebagai alternatif jika memang sesuai cakupan dan disepakati Customer.
4. Jika alternatif diajukan, tampilkan **Menunggu Persetujuan Customer**; berikan aksi `Setujui Solusi` / `Tidak Setuju` atau `Minta Peninjauan`. **Diam tidak dihitung sebagai setuju**. Ketidaksepakatan dapat dilaporkan melalui Modul 09; tidak menciptakan status terminal palsu.
5. Jika tak ada respons bermakna sampai 72 jam, tampilkan **TIDAK DITANGGAPI**, bukan auto-terima/auto-tolak/auto-refund. Laporan ke Modul 09 tetap terhubung pada kasus yang sama.
6. Jika solusi yang disepakati adalah **Refund**, tampilkan keputusan, nominal sah dan status dari Finance 06 di **Detail Pengajuan** asal; `Berhasil` hanya setelah saldo Customer benar-benar tersedia.
7. Jika solusi **Penggantian Barang**, tampilkan progres pemenuhan pengganti di **Detail Pengajuan** yang sama; **bukan Order pembelian komersial baru**. Badge khusus penggantian dapat digunakan agar tidak dikira pesanan baru; nama badge persis tidak dikunci oleh amendemen ini. Ongkir mengikuti tanggung jawab masalah/keputusan yang sah, bukan diasumsikan selalu Rp0.
8. Jika solusi **Pengerjaan Ulang Jasa**, tampilkan `Pekerjaan Garansi` bertanda `GARANSI` melalui pengalaman 05B; bagian yang memang ditanggung memiliki tagihan Customer **Rp0**. Tidak membuat Order Jasa komersial baru.
9. Status pengajuan `Selesai` hanya bila solusi yang disepakati sudah benar-benar dilaksanakan, tidak cukup karena respons Merchant/Provider sudah dikirim.

**Scope:** Addendum ini adalah **revisi business flow dan UX saja**. Nama endpoint, tabel, event, otoritas refund teknis, SLA pelaksanaan solusi, periode retur numerik dan kontrak antarmicroservice tetap dibahas dalam Technical Specification terpisah; jangan mengira sudah implementasi.

**Akhir dokumen V2.2.**
