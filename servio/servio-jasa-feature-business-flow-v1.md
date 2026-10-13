# SERVIO — JASA FEATURE & BUSINESS FLOW
## Master Blueprint — Brainstorming Jasa v1

> Baseline fitur jasa Servio untuk dibedah dan disempurnakan satu per satu.

---

# 1. Enam Domain Jasa Utama

1. **Repair & Technical**
2. **Home & Building**
3. **Cleaning**
4. **Maintenance**
5. **Environment**
6. **Automotive**

Kategori dan subkategori merupakan **controlled taxonomy** yang dikelola internal Servio. Provider memilih kategori yang tersedia dan tidak membuat kategori utama secara bebas.

---

# 2. Struktur Kategori & Subkategori

## 2.1 Repair & Technical
Fokus: perbaikan dan masalah teknis.

### Subkategori
- AC & Cooling
- Electrical
- Plumbing
- Home Appliance
- Electronics
- Mechanical
- Handyman

## 2.2 Home & Building
Fokus: rumah, bangunan, renovasi, konstruksi, dan desain.

### Subkategori
- Renovation
- Construction
- Painting
- Roofing
- Floor & Wall
- Door & Window
- Furniture & Interior
- Architecture & Design

## 2.3 Cleaning
Fokus: kebersihan rumah, objek, area, dan properti komersial.

### Subkategori
- General Cleaning
- Deep Cleaning
- Object Cleaning
- Area Cleaning
- Special Cleaning
- Commercial Cleaning

## 2.4 Maintenance
Fokus: perawatan rutin dan preventif aset.

### Subkategori
- AC Maintenance
- Electrical Maintenance
- Plumbing Maintenance
- Appliance Maintenance
- Building Maintenance
- Furniture Maintenance
- Garden Maintenance
- Vehicle Maintenance

Konsep:
`Asset → Service History → Maintenance Schedule → Reminder → Service → History Update → Next Maintenance`

## 2.5 Environment
Fokus: pengelolaan sampah, lingkungan, area hijau, dan pengendalian lingkungan.

### Subkategori
- Waste
- E-Waste
- Recycling
- Garden & Green Area
- Pest Control
- Environmental Cleaning

## 2.6 Automotive
Fokus: perbaikan dan perawatan kendaraan.

### Subkategori
- Motorcycle
- Car
- Engine
- Electrical
- AC
- Tire
- Battery
- Body
- Detailing
- Inspection
- Towing
- Emergency

---

# 3. Service Mode

Service mode bukan kategori jasa. Service mode menentukan bagaimana jasa dipesan/dijalankan.

Baseline:
- Instant
- Scheduled
- Home Service
- Workshop
- Emergency
- Recurring
- Project
- Fixed Price
- Estimated Price
- Quotation
- Negotiation

Contoh:
`AC Repair → Home Service + Scheduled + Emergency + Quotation`

---

# 4. Role & Hak Akses

## 4.1 Customer
Dapat:
- Melihat kategori/subkategori
- Search dan filter jasa/provider
- Melihat profil, rating, review, harga, keahlian, availability
- Menentukan lokasi dan jadwal
- Menjelaskan kebutuhan
- Upload foto/video
- Meminta rekomendasi jasa
- Mendapat smart service recommendation dan provider matching
- Meminta/menerima quotation
- Membandingkan proposal/provider
- Negosiasi jika tersedia
- Booking dan payment
- Chat/call provider
- Tracking provider dan status pengerjaan
- Melihat proof of service
- Konfirmasi penyelesaian
- Rating/review
- Komplain
- Menggunakan warranty bila tersedia
- Melihat service history
- Favorite dan rebooking
- Mengelola asset/vehicle
- Mendapat maintenance reminder

## 4.2 Service Provider
Dapat:
- Mengelola profil profesional
- Menentukan skill/keahlian
- Memilih kategori/subkategori yang tersedia
- Menambahkan service/package
- Menentukan area layanan
- Mengatur availability
- Menerima/menolak order
- Menerima request quotation
- Membuat/revisi quotation
- Negosiasi jika tersedia
- Melihat detail kebutuhan customer
- Melakukan inspection/diagnosis
- Mengirim estimasi
- Mengubah status order
- Mengirim lokasi saat menuju customer
- Check-in/arrival
- Memulai dan memperbarui progress
- Upload foto before/during/after
- Menyelesaikan pekerjaan
- Membuat service report
- Memberikan rekomendasi maintenance
- Merekomendasikan material/product
- Mengajukan kebutuhan material
- Melihat riwayat pekerjaan dan earnings

## 4.3 Admin / Operations
Dapat:
- Mengelola customer dan provider
- Verifikasi provider
- Mengelola kategori, subkategori, service, dan service mode
- Aktif/nonaktifkan taxonomy/service
- Memantau order dan tracking
- Menangani komplain/dispute/refund sesuai kebijakan
- Menangani masalah provider
- Monitoring fraud/abuse
- Mengelola warranty/protection
- Melihat service report dan operational analytics

## 4.4 CEO / Product Owner
Dapat:
- Menentukan kategori dan subkategori
- Menyetujui perubahan taxonomy
- Melihat order/revenue/customer/provider per kategori
- Melihat performa subkategori dan service
- Melihat growth/demand trend
- Melihat demand vs supply
- Melihat rating/cancellation
- Mengambil keputusan bisnis berdasarkan analytics

### Category Governance
`CEO/Product Owner → Taxonomy → Admin/Operations → Provider memilih taxonomy`

Request kategori baru:
`Provider → Request New Category → Admin Review → CEO/Product Approval → Published`

---

# 5. Discovery Flow

## Customer sudah tahu kebutuhannya
`Home → Search → Category → Subcategory → Service → Provider → Service Detail`

## Customer belum tahu jasa yang dibutuhkan
`Home → Ceritakan Masalah → Deskripsi → Foto/Video → Pertanyaan → Smart Problem Identification → Service Recommendation → Provider Matching`

---

# 6. Normal Service Flow

`Select Service → Location → Schedule → Price → Provider/Matching → Review Order → Booking → Payment → Provider Confirmed → On The Way → Arrived → Service Started → In Progress → Completed → Proof of Service → Customer Confirmation → Review → Service History`

---

# 7. Smart Service Flow

`Problem → Describe Problem → Photo/Video → Additional Questions → Problem Classification → Recommended Service → Recommended Provider → Estimated Cost/Quotation → Booking → Inspection/Diagnosis → Approval → Service → Proof → Completion`

Smart system membantu pengambilan keputusan; diagnosis profesional tetap diperlukan ketika pemeriksaan langsung dibutuhkan.

---

# 8. Quotation & Project Flow

## Quotation
`Request → Requirement → Provider Review/Inspection → Quotation → Customer Review → Accept / Revision / Negotiate → Agreement → Payment → Service`

## Project
`Requirement → Survey → Measurement → Material Estimation → Scope → Proposal → Compare → Provider Selection → Agreement → Initial Payment → Milestone → Execution → Progress Report → Inspection → Completion → Final Payment → Warranty`

---

# 9. Service Tracking

Tracking digunakan untuk jasa yang membutuhkan provider datang ke lokasi.

## Perjalanan
`Provider Confirmed → Preparing → On The Way → Arrived`

Customer dapat melihat:
- Posisi provider
- ETA
- Jarak
- Status perjalanan
- Profil provider
- Chat/call
- Share tracking jika tersedia
- Help/report problem

## Progress setelah tiba
`Arrived → Check-in → Before Photo → Service Started → In Progress → Progress Update → Completed → After Photo → Customer Approval`

---

# 10. Proof of Service

`BEFORE → DURING → AFTER → CUSTOMER APPROVAL`

Bukti dapat berupa:
- Foto
- Video
- Checklist
- Service report
- Inspection result
- Dokumen pekerjaan

---

# 11. Post-Service

`Completed → Customer Confirmation → Payment Finalization → Rating → Review → Service Report → Warranty → Service History → Maintenance Reminder → Rebooking`

Tidak semua langkah berlaku untuk semua service.

---

# 12. Flow Khusus per Domain

## Repair & Technical
### Simple Repair
`Service → Problem Detail → Photo/Video → Location → Schedule → Matching → Price → Booking → Payment → On The Way → Arrived → Diagnosis → Repair → Testing → Proof → Complete → Review`

### Unknown Problem
`Problem → Smart Intake → Photo/Video → Questions → Recommendation → Matching → Inspection → Diagnosis → Quotation → Approval → Repair → Testing → Report → Payment → Warranty`

### Material Required
`Diagnosis → Material Required → Stock Check → Available? → Yes: Continue Repair / No: Product-Store Search → Procurement → Material Received → Continue Repair`

## Home & Building
`Project Requirement → Photo/Reference → Budget → Location → Classification → Survey → Measurement → Material Estimation → Scope → Proposal → Compare → Provider → Agreement → Initial Payment → Execution → Milestone → Progress Report → Inspection → Completion → Final Payment → Warranty`

## Cleaning
`Service → Property/Area → Size/Room Count → Package → Duration → Add-ons → Preference → Schedule → Matching → Price → Booking → Payment → Helper Assigned → On The Way → Arrived → Check-in → Cleaning → Checklist → Complete → Before/After Proof → Confirmation → Review → Rebooking/Recurring`

## Maintenance
`Asset → History → Schedule → Reminder → Recommended Service → Matching → Booking → Inspection → Maintenance → Material Replacement? → Testing → Report → Update History → Next Maintenance`

## Environment
`Environmental Service → Waste/Area/Problem Identification → Photo → Quantity/Volume → Location → Schedule → Matching → Price → Booking → Provider Arrives → Pickup/Service → Proof → Processing/Disposal → Complete → Environmental Record → Reward if applicable`

## Automotive
### Normal
`Vehicle → Problem → Smart Triage → Recommended Service → Workshop/Home Service → Matching → Booking → Inspection → Diagnosis → Quotation → Approval → Repair → Testing → Report → Payment → Warranty → Maintenance Reminder`

### Emergency
`Vehicle Problem → Emergency → Location → Problem Type → Mobile Technician/Towing → Matching → ETA → Arrived → Assistance → Towing if Required → Workshop → Inspection → Quotation → Approval → Repair → Completion`

---

# 13. Pricing Model

Tergantung karakter service:
- Fixed Price
- Flat Rate
- Estimated Price
- Duration-based
- Material-based
- Visit/Inspection Fee
- Quotation
- Negotiation
- Emergency Fee
- Milestone Payment

Contoh:
- Cleaning → Fixed/Duration
- AC Repair → Inspection + Quotation
- Renovation → Quotation + Milestone
- Emergency → Emergency Fee + Service Cost

---

# 14. Provider Matching

Matching dapat mempertimbangkan:
- Service
- Category
- Subcategory
- Skill
- Certification
- Location
- Availability
- Schedule
- Service Mode
- Experience
- Rating

Tujuan: menemukan provider yang sesuai dengan kebutuhan pekerjaan, bukan hanya yang paling dekat.

---

# 15. Asset & Service History

Untuk service yang relevan:

`My Asset → Asset Detail → Service History → Maintenance History → Warranty → Maintenance Schedule → Reminder`

Contoh asset:
- AC
- Refrigerator
- Washing Machine
- Vehicle

---

# 16. CEO Category Analytics

Kategori/subkategori menjadi dasar analytics bisnis.

CEO dapat melihat:
- Orders by Category
- Orders by Subcategory
- Service Performance
- Revenue by Category/Subcategory/Service
- Customer by Category/Service
- Provider by Category/Service
- Demand Trend
- Demand vs Supply
- Rating
- Cancellation

Drill-down:
`Repair & Technical → AC & Cooling → AC Repair → Orders / Revenue / Customers / Providers`

---

# 17. Cross-Domain Core

Walaupun flow tiap domain berbeda, platform memiliki core:

`Discovery → Smart Matching → Booking → Pricing → Payment → Provider Assignment → Tracking → Service Execution → Proof → Customer Approval → Review → Warranty → Service History`

Di atas core tersebut terdapat domain-specific logic.

---

# 18. Service Lifecycle

`DISCOVER → UNDERSTAND NEED → MATCH → BOOK → PAY → PROVIDER CONFIRMED → TRACK → ARRIVE → EXECUTE → PROOF → APPROVAL → COMPLETE → REVIEW → WARRANTY/HISTORY → REBOOK/MAINTENANCE`

---

# 19. Baseline yang Di-KEEP

- 6 service domains
- Controlled category & subcategory
- Role Customer
- Role Service Provider
- Role Admin/Operations
- Role CEO/Product Owner
- Customer & provider flow
- Smart Service Matching
- Service Tracking
- Service Progress
- Proof of Service
- Quotation & Negotiation
- Pricing model
- Service History
- Asset/Vehicle
- Maintenance Reminder
- CEO Category Analytics

> **Catatan:** Ini adalah baseline brainstorming. Setiap bagian akan kita bahas satu per satu dan dapat disempurnakan sebelum masuk tahap PRD, database, backend, dan frontend.
