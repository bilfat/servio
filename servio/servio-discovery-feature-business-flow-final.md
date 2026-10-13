# SERVIO — DISCOVERY FEATURE & BUSINESS FLOW

**Document Status:** Final Baseline  
**Scope:** Customer Discovery  
**AI Engine:** Google Gemini API untuk Smart Discovery  
**Primary Goal:** Membantu customer menemukan service dan provider yang paling relevan sebelum masuk ke Booking.

---

# 1. OVERVIEW

Discovery di Servio bukan hanya fitur pencarian. Discovery adalah keseluruhan proses ketika customer:

```text
Memiliki kebutuhan
    ↓
Mencari / menjelaskan kebutuhan
    ↓
Menemukan service
    ↓
Menemukan provider
    ↓
Membandingkan / menyaring pilihan
    ↓
Memilih service/provider
    ↓
Masuk ke Booking
```

Discovery harus mendukung dua kondisi utama:

### Customer tahu service yang dibutuhkan

```text
Search / Category
    ↓
Service
    ↓
Provider
    ↓
Booking
```

### Customer tidak tahu service yang dibutuhkan

```text
Describe Problem
    ↓
Smart Discovery
    ↓
Possible Service
    ↓
Provider Matching
    ↓
Booking
```

---

# 2. DISCOVERY FEATURE STRUCTURE

Discovery Servio terdiri dari 12 bagian utama:

```text
DISCOVERY
│
├── 1. Search
├── 2. Category & Subcategory
├── 3. Smart Discovery
├── 4. Location Discovery
├── 5. Service Listing
├── 6. Filter
├── 7. Sort
├── 8. Provider Discovery
├── 9. Service Detail
├── 10. Provider Profile
├── 11. Favorite & Recently Viewed
└── 12. Personalized Recommendation
```

---

# 3. DISCOVERY PRINCIPLES

## 3.1 Customer tidak harus tahu istilah teknis

Customer dapat mencari berdasarkan:

- nama service;
- masalah;
- keyword;
- provider;
- lokasi.

Contoh:

```text
"AC saya tidak dingin"
```

tidak mengharuskan customer mengetahui bahwa service yang dibutuhkan adalah `AC Diagnosis & Repair`.

## 3.2 Service dan Provider adalah dua objek berbeda

Customer dapat menemukan:

```text
Service
```

atau:

```text
Provider
```

Contoh:

```text
AC Repair
    ↓
Daftar provider yang menyediakan AC Repair
```

## 3.3 Category bukan Service Mode

Category menjawab jenis kebutuhan, Service menjawab pekerjaan, sedangkan Service Mode menjawab bagaimana pekerjaan dilakukan.

Contoh:

```text
Repair & Technical
└── AC & Cooling
    └── AC Repair
        ├── Home Service
        ├── Scheduled
        ├── Emergency
        └── Quotation
```

---

# 4. SEARCH

Search mendukung:

1. Service Search
2. Problem Search
3. Provider Search
4. Keyword Search
5. Location-aware Search

## 4.1 Service Search

Contoh:

```text
Servis AC
Cleaning Sofa
Service Motor
Perbaikan Listrik
Cat Rumah
```

Search mencocokkan:

- Service Name
- Subcategory
- Category
- Service Description
- Service Tags
- Provider Services

## 4.2 Problem Search

Contoh:

```text
"AC saya tidak dingin"
```

Flow:

```text
Problem Input
    ↓
Problem Understanding
    ↓
Category Detection
    ↓
Subcategory Detection
    ↓
Possible Service
    ↓
Provider Discovery
```

Hasil adalah kemungkinan layanan, bukan diagnosis teknis pasti.

## 4.3 Provider Search

Pencarian dapat menggunakan:

- nama provider;
- nama bisnis;
- nama teknisi;
- skill;
- service;
- category;
- subcategory;
- lokasi.

## 4.4 Keyword Search

Keyword umum dapat menemukan service, provider, dan category yang relevan.

## 4.5 Location-aware Search

Contoh:

```text
"servis AC Bandung"
```

diproses menjadi:

```text
Service: AC Repair
Location: Bandung
```

---

# 5. SEARCH BAR & AUTOCOMPLETE

Placeholder:

> Cari jasa, provider, atau ceritakan masalahmu...

Contoh suggestion ketika mengetik `AC`:

```text
Services
────────────
AC Repair
AC Cleaning
AC Installation
AC Maintenance

Providers
────────────
AC Jaya
Sejuk Teknik

Problems
────────────
AC tidak dingin
AC bocor
AC berisik
```

---

# 6. SEARCH HISTORY & POPULAR SEARCH

## Search History

Customer dapat:

- memilih pencarian sebelumnya;
- menghapus item;
- menghapus seluruh history.

Contoh:

```text
Recent Searches

AC Repair
Cleaning Sofa
Service Motor
```

## Popular Search

Dapat menggunakan data aktual:

- search volume;
- booking volume;
- lokasi;
- periode tertentu.

---

# 7. SEARCH QUALITY

Search mendukung:

### Typo Tolerance

```text
servis ac
service ac
servis acc
```

### Semantic Search

```text
"AC rumah panas"
```

dapat dikaitkan dengan:

```text
AC tidak dingin
→ AC Repair / Diagnosis
```

### Context-aware Search

Search mempertimbangkan category yang sedang dibuka customer.

### Personalized Search

Provider/service yang pernah digunakan dapat diberi konteks tambahan tanpa menghilangkan pilihan lain.

---

# 8. SEARCH RESULT

Hasil dapat dibagi menjadi:

```text
Services
Providers
Problems / Related
```

Contoh:

```text
Search: AC

Services
────────
AC Repair
AC Cleaning
AC Maintenance

Providers
────────
AC Jaya
Sejuk Teknik

Related Problems
────────
AC tidak dingin
AC bocor
```

---

# 9. SEARCH RESULT RANKING

Ranking mempertimbangkan:

```text
Search Relevance
+
Service Compatibility
+
Location Availability
+
Provider Availability
+
Provider Skill
+
Rating
+
Past Interaction
```

Default sort:

```text
Most Relevant
```

Provider terdekat tidak otomatis menjadi provider paling relevan.

---

# 10. SEARCH EMPTY STATE

Jika tidak ada hasil:

```text
No exact results found.

Try:
• Check your spelling
• Use a broader keyword
• Search by category
• Describe your problem

[Describe My Problem]
[Browse Categories]
```

---

# 11. CATEGORY & SUBCATEGORY

## 11.1 Main Categories

```text
1. Repair & Technical
2. Home & Building
3. Cleaning
4. Maintenance
5. Environment
6. Automotive
```

Taxonomy digunakan pada:

- Discovery;
- Search;
- Filter;
- Provider;
- Service;
- Recommendation;
- Analytics;
- Admin.

Provider tidak dapat membuat category sendiri secara langsung.

---

# 12. TAXONOMY HIERARCHY

```text
CATEGORY
    ↓
SUBCATEGORY
    ↓
SERVICE
    ↓
SERVICE PACKAGE / VARIANT
```

Contoh:

```text
Cleaning
└── Object Cleaning
    └── Sofa Cleaning
        ├── Sofa 2 Seater
        ├── Sofa 3 Seater
        └── Sofa L-Shape
```

---

# 13. SERVICE TAXONOMY

## Repair & Technical

```text
Repair & Technical
├── AC & Cooling
├── Electrical
├── Plumbing
├── Home Appliance
├── Electronics
├── Mechanical
└── Handyman
```

## Home & Building

```text
Home & Building
├── Renovation
├── Construction
├── Painting
├── Roofing
├── Floor & Wall
├── Door & Window
├── Furniture & Interior
└── Architecture & Design
```

## Cleaning

```text
Cleaning
├── General Cleaning
├── Deep Cleaning
├── Object Cleaning
├── Area Cleaning
├── Special Cleaning
└── Commercial Cleaning
```

## Maintenance

```text
Maintenance
├── AC Maintenance
├── Electrical Maintenance
├── Plumbing Maintenance
├── Appliance Maintenance
├── Building Maintenance
├── Furniture Maintenance
├── Garden Maintenance
└── Vehicle Maintenance
```

Maintenance lifecycle:

```text
Asset
↓
Service History
↓
Maintenance Schedule
↓
Reminder
↓
Service
↓
History Update
↓
Next Maintenance
```

## Environment

```text
Environment
├── Waste
├── E-Waste
├── Recycling
├── Garden & Green Area
├── Pest Control
└── Environmental Cleaning
```

## Automotive

```text
Automotive
├── Motorcycle
├── Car
├── Engine
├── Electrical
├── AC
├── Tire
├── Battery
├── Body
├── Detailing
├── Inspection
├── Towing
└── Emergency
```

---

# 14. CATEGORY PAGE

Contoh:

```text
Repair & Technical

What do you need help with?

AC & Cooling
Electrical
Plumbing
Home Appliance
Electronics
Mechanical
Handyman
```

Kemudian:

```text
AC & Cooling

AC Repair
AC Cleaning
AC Installation
AC Maintenance
```

---

# 15. CATEGORY INTEGRATION

```text
Category
    ↓
Subcategory
    ↓
Service
    ↓
Location
    ↓
Filter
    ↓
Provider Matching
    ↓
Service Detail
    ↓
Booking
```

Category juga menyediakan CTA:

```text
Not sure what you need?

[Describe Your Problem]
```

---

# 16. CATEGORY GOVERNANCE

```text
CEO / Product Owner
        ↓
Define Taxonomy
        ↓
Admin / Operations
        ↓
Manage Category
        ↓
Provider
        ↓
Select Category
```

Request kategori baru:

```text
Provider
↓
Request New Category
↓
Admin Review
↓
Product / CEO Approval
↓
Publish
```

Status:

```text
Draft
Active
Inactive
Archived
```

---

# 17. PRIMARY CATEGORY & TAGS

Satu service memiliki satu primary taxonomy.

Contoh:

```text
Primary Category:
Maintenance

Subcategory:
AC Maintenance

Tags:
AC
Cooling
Home Service
Preventive
```

Tags membantu Search dan Recommendation.

---

# 18. CATEGORY ANALYTICS

CEO/Product Owner dapat melihat:

```text
Repair & Technical

Orders
Revenue
Providers
Customers
Demand Trend
Demand vs Supply
Cancellation
Average Rating
```

Drill-down:

```text
Repair & Technical
↓
AC & Cooling
↓
AC Repair
↓
Provider Performance
```

---

# 19. SMART DISCOVERY

Smart Discovery menangani kondisi:

> Customer memiliki masalah atau kebutuhan tetapi tidak mengetahui nama service yang tepat.

Contoh:

```text
"AC kamar saya nyala tapi nggak dingin."
```

---

# 20. SMART DISCOVERY ENTRY POINT

Dapat diakses melalui:

```text
Home
├── Search
│   └── Problem Search
│
├── Category
│   └── Not sure what you need?
│
└── Smart Discovery CTA
```

CTA:

```text
Ceritakan masalahmu
```

---

# 21. SMART DISCOVERY INPUT

Input:

- Text
- Photo
- Video
- Structured Answers

Contoh:

```text
AC saya tidak dingin
+
Foto AC
```

---

# 22. SMART QUESTIONS

Contoh:

```text
Jenis AC?

○ Split
○ Portable
○ Central
○ Tidak tahu
```

Lalu:

```text
Apakah AC masih mengeluarkan udara?

○ Ya
○ Tidak
○ Tidak yakin
```

Kemudian:

```text
Apakah ada kebocoran air?

○ Ya
○ Tidak
○ Tidak tahu
```

---

# 23. DYNAMIC QUESTIONS

Pertanyaan bergantung pada:

```text
Category
+
Subcategory
+
Initial Problem
+
Previous Answer
```

Contoh:

```text
Motor mogok
↓
Motor bisa distarter?
↓
Tidak
↓
Dashboard menyala?
↓
Tidak
↓
Possible direction:
Battery / Electrical
```

---

# 24. INFORMATION SUFFICIENCY

Jika informasi belum cukup:

```text
More Questions
```

Jika sudah cukup:

```text
Classification
```

Tujuan:

> Mengumpulkan informasi minimum yang cukup untuk menemukan service yang relevan.

---

# 25. PROBLEM CLASSIFICATION

```text
User Input
↓
Problem Understanding
↓
Category
↓
Subcategory
↓
Possible Service
```

Contoh:

```text
Problem:
AC tidak dingin

Category:
Repair & Technical

Subcategory:
AC & Cooling

Possible Service:
AC Diagnosis & Repair
```

---

# 26. RECOMMENDATION TRANSPARENCY

Gunakan:

```text
Kemungkinan layanan yang sesuai
```

atau:

```text
Based on your answers
```

Jangan menyatakan diagnosis teknis sebagai kepastian.

Jika ada beberapa kemungkinan:

```text
Best Match
AC Diagnosis & Repair

Other Possible Services
AC Maintenance
AC Cleaning
```

---

# 27. GEMINI API INTEGRATION

Google Gemini API menjadi **AI Understanding Layer** untuk Smart Discovery.

Gemini dapat membantu:

- memahami deskripsi masalah;
- memahami konteks bahasa natural;
- menganalisis gambar;
- membantu input video pada tahap yang didukung;
- menghasilkan pertanyaan lanjutan;
- mengubah input menjadi structured information;
- memberikan rekomendasi kemungkinan service.

Gemini bukan source of truth untuk:

- service yang tersedia;
- provider;
- harga;
- availability;
- service area;
- status service;
- booking.

Data tersebut berasal dari backend/database Servio.

---

# 28. SMART DISCOVERY ARCHITECTURE

```text
Customer
    ↓
Smart Discovery UI
    ↓
Servio Backend
    ↓
Gemini API
    │
    ├── Understand Text
    ├── Analyze Image
    ├── Understand Video*
    ├── Generate Questions
    └── Recommend Possible Service
    ↓
Structured AI Output
    ↓
Servio Business Logic
    │
    ├── Validate Category
    ├── Validate Service
    ├── Check Location
    ├── Check Availability
    ├── Check Pricing
    └── Find Eligible Providers
    ↓
Provider Matching
    ↓
Recommended Service / Providers
```

`*` Video bukan requirement MVP pertama.

---

# 29. GEMINI STRUCTURED OUTPUT

Contoh:

```json
{
  "category": "Repair & Technical",
  "subcategory": "AC & Cooling",
  "possible_services": [
    {
      "service": "AC Diagnosis & Repair",
      "reason": "AC tidak dingin dan terdapat indikasi kebocoran"
    },
    {
      "service": "AC Maintenance",
      "reason": "Masalah dapat berkaitan dengan kondisi atau perawatan AC"
    }
  ],
  "needs_more_information": true,
  "questions": [
    "Apakah air keluar dari unit indoor?",
    "Kapan terakhir AC diservis?"
  ]
}
```

Backend memvalidasi output terhadap taxonomy dan database Servio.

---

# 30. GEMINI TIDAK MEMILIH PROVIDER LANGSUNG

Tidak menggunakan:

```text
Customer
↓
Gemini
↓
Semua Provider
↓
Gemini memilih
```

Gunakan:

```text
Customer
↓
Gemini
↓
Service Requirement
↓
Servio Backend
↓
Database Query
↓
Eligible Providers
↓
Provider Matching / Ranking
```

---

# 31. PROVIDER MATCHING

Pertimbangan:

```text
Service
+
Category
+
Subcategory
+
Skill
+
Certification
+
Location
+
Service Area
+
Availability
+
Schedule
+
Service Mode
+
Experience
+
Rating
```

Tujuan:

> Menemukan provider yang sesuai dengan kebutuhan, bukan sekadar provider terdekat.

---

# 32. RECOMMENDED SERVICE CARD

```text
Recommended Service

AC Diagnosis & Repair

Suitable for:
• AC tidak dingin
• AC masih menyala
• Indikasi kebocoran

Estimated Price:
Rp100.000 – Rp300.000

Available Providers:
12

[View Providers]
```

Harga dan jumlah provider harus berasal dari backend.

---

# 33. PHOTO & VIDEO

## Photo

```text
Problem Description
+
Photo
+
Answers
```

Foto menjadi input tambahan untuk memahami konteks.

## Video

Cocok untuk:

- suara;
- gerakan;
- kondisi mesin;
- kebocoran;
- perilaku perangkat.

Prioritas MVP:

```text
Text
↓
Photo
↓
Smart Questions
↓
Service Recommendation
```

Video dapat dikembangkan kemudian.

---

# 34. INSUFFICIENT INFORMATION

Contoh:

```text
User:
"AC rusak"
```

Tampilkan:

```text
Kami butuh sedikit informasi tambahan.

Apa masalah yang kamu alami?

[AC tidak dingin]
[AC bocor]
[AC tidak menyala]
[AC berisik]
[Lainnya]
```

---

# 35. NO SERVICE FOUND

```text
We couldn't find an exact service.

You can:

[Browse Related Services]
[Request Custom Service]
[Contact Support]
```

---

# 36. CUSTOM SERVICE REQUEST

Customer dapat mengirim:

```text
Requirement
+
Photos
+
Video
+
Location
+
Preferred Schedule
+
Budget
```

Flow:

```text
Request
↓
Provider Matching
↓
Provider Offer / Quotation
```

---

# 37. SMART DISCOVERY FLOW

```text
SMART DISCOVERY
       ↓
Describe Problem
       │
 ┌─────┼─────┐
 ↓     ↓     ↓
Text  Photo  Video
 └─────┼─────┘
       ↓
Initial Understanding
       ↓
Smart Questions
       ↓
Information Enough?
   ↙           ↘
 No             Yes
 ↓               ↓
More Questions  Classification
                  ↓
             Category/Subcategory
                  ↓
             Possible Services
                  ↓
          Recommended Service
                  ↓
          Location + Schedule
                  ↓
          Provider Matching
                  ↓
       Recommended Providers
                  ↓
        Service / Provider Detail
                  ↓
                Booking
```

---

# 38. LOCATION DISCOVERY

Location digunakan untuk:

- provider service area;
- jarak;
- workshop;
- estimated arrival;
- availability.

Sources:

```text
Current Location
Choose Location
Search Location
Saved Address
```

---

# 39. CURRENT LOCATION

Customer dapat:

```text
Use Current Location
```

Jika tidak tersedia:

```text
Choose Location Manually
```

Servio tidak boleh menganggap lokasi tersedia tanpa izin customer.

---

# 40. SEARCH LOCATION

Contoh:

```text
Bandung
Dago
Antapani
Buahbatu
```

---

# 41. RADIUS

Pilihan:

```text
1 km
3 km
5 km
10 km
```

Radius bukan satu-satunya parameter. Service area provider tetap menjadi validasi utama.

---

# 42. SERVICE AREA & WORKSHOP

Provider dapat memiliki:

```text
Service Area
```

Sedangkan provider workshop memiliki:

```text
Workshop Location
```

Backend melakukan:

```text
Customer Location
        ↓
Provider Service Area
        ↓
Eligible / Not Eligible
```

---

# 43. SERVICE LISTING

Contoh:

```text
AC Repair

AC Jaya
⭐ 4.8
2.1 km
Home Service
✓ Verified

From Rp100.000

[View Service]
```

Informasi utama:

- Service name;
- Provider;
- Rating;
- Review count;
- Price / price range;
- Distance;
- Service mode;
- Availability;
- Verification;
- Estimated arrival jika tersedia.

---

# 44. FILTER

Filter umum:

```text
Location
Price
Rating
Availability
Service Mode
Pricing Model
Provider Verification
Certification
```

Filter tambahan mengikuti service/category.

Contoh AC:

```text
Price
Rating
Home Service
Workshop
Emergency
Available Today
Verified Provider
```

Contoh Cleaning:

```text
Price
Duration
Cleaning Type
Schedule
Recurring
Provider Preference
Rating
```

Contoh Automotive:

```text
Vehicle
Service Type
Workshop
Home Service
Emergency
Price
Rating
```

---

# 45. SORT

Pilihan:

```text
Most Relevant
Nearest
Highest Rated
Lowest Price
Available Soonest
Most Experienced
Most Completed Jobs
```

Default:

```text
Most Relevant
```

---

# 46. PROVIDER DISCOVERY

Provider dapat ditemukan langsung maupun melalui service.

Informasi:

- Nama;
- Foto/logo;
- Verification;
- Certification;
- Skills;
- Categories;
- Services;
- Rating;
- Reviews;
- Completed jobs;
- Experience;
- Service area;
- Distance;
- Availability;
- Price range;
- Service modes;
- Portfolio.

---

# 47. PROVIDER PROFILE

Contoh:

```text
Sejuk Teknik
✓ Verified Provider

⭐ 4.9
324 Reviews
1,200 Jobs

Specialization
AC Repair
AC Maintenance
AC Installation

Experience
8 years

Service Area
Bandung

Availability
09.00–21.00

Portfolio
[Photo] [Photo] [Photo]

Services
AC Repair
AC Maintenance
AC Cleaning
```

---

# 48. SERVICE DETAIL

Informasi:

```text
Service Name
Description
Problems Handled
Price / Price Range
Duration
Service Mode
Service Area
Included
Excluded
Add-ons
Warranty
FAQ
Available Providers
```

Contoh:

```text
AC Repair

Problems Handled:
• AC tidak dingin
• AC bocor
• AC berisik

Price:
Rp100.000 – Rp300.000

Duration:
± 1–2 hours

Included:
✓ Diagnosis
✓ Basic repair

Not Included:
✕ Replacement parts
```

---

# 49. FAVORITE & RECENTLY VIEWED

Customer dapat menyimpan:

```text
Favorite Provider
Favorite Service
```

Recently Viewed:

```text
AC Jaya
Sejuk Teknik
CleanPro
AC Repair
```

Tujuan utamanya adalah mempermudah customer kembali ke discovery sebelumnya.

---

# 50. PERSONALIZED RECOMMENDATION

Setelah customer memiliki histori:

```text
Recommended for You

Based on your previous services

AC Maintenance
```

atau:

```text
You usually use:
AC Jaya

Your AC maintenance may be due soon.
```

Fitur ini dapat terhubung dengan:

```text
Asset
Service History
Maintenance Schedule
Reminder
```

---

# 51. RECOMMENDATION ENGINE

Recommendation dapat mempertimbangkan:

```text
Customer Need
+
Category
+
Subcategory
+
Problem
+
Location
+
Service Mode
+
Availability
+
Provider Skill
+
Rating
+
Experience
+
Price
+
Past History
```

Output:

```text
Recommended Service
+
Recommended Providers
```

---

# 52. END-TO-END DISCOVERY FLOW

## Flow A — Customer tahu service

```text
Home
↓
Search "AC Repair"
↓
Search Result
↓
Filter
↓
Sort
↓
Service Detail
↓
Provider List
↓
Provider Profile
↓
Select Provider
↓
Booking
```

## Flow B — Customer menggunakan Category

```text
Home
↓
Repair & Technical
↓
AC & Cooling
↓
AC Repair
↓
Service Listing
↓
Filter
↓
Provider
↓
Service Detail
↓
Booking
```

## Flow C — Customer tidak tahu service

```text
Home
↓
Describe Problem
↓
Problem Description
↓
Photo / Video
↓
Smart Questions
↓
Problem Classification
↓
Recommended Service
↓
Recommended Provider
↓
Provider Profile
↓
Quotation / Booking
```

## Flow D — Customer mencari provider

```text
Home
↓
Search Provider
↓
Provider Results
↓
Provider Profile
↓
Services
↓
Select Service
↓
Booking
```

## Flow E — Customer berdasarkan lokasi

```text
Home
↓
Near Me
↓
Set Location
↓
Available Services
↓
Filter
↓
Providers
↓
Service Detail
↓
Booking
```

---

# 53. DISCOVERY → BOOKING HANDOFF

Discovery meneruskan context ke Booking.

Contoh:

```text
Problem:
AC tidak dingin

Photos:
3 images

Location:
Jl. ABC

Preferred Time:
Tomorrow 10:00

Recommended Service:
AC Diagnosis & Repair
```

Saat masuk Booking, data yang sudah ada tetap tersedia:

```text
Service
Problem
Photos
Location
Schedule
Provider
```

Customer tidak perlu mengisi ulang data yang sudah tersedia.

---

# 54. MASTER DISCOVERY FLOW

```text
                         DISCOVERY
                             │
       ┌─────────────────────┼─────────────────────┐
       ↓                     ↓                     ↓
    SEARCH               CATEGORY             SMART DISCOVERY
       │                     │                     │
       │                     ↓                     ↓
       │                SUBCATEGORY           PROBLEM / NEED
       │                     │                     │
       └─────────────────────┼─────────────────────┘
                             ↓
                      SERVICE DISCOVERY
                             ↓
                    LOCATION DISCOVERY
                             ↓
                    FILTER + SORT
                             ↓
                    PROVIDER DISCOVERY
                             ↓
              ┌──────────────┴──────────────┐
              ↓                             ↓
       SERVICE DETAIL                 PROVIDER PROFILE
              │                             │
              └──────────────┬──────────────┘
                             ↓
                  FAVORITE / PERSONALIZATION
                             ↓
                          BOOKING
```

---

# 55. DISCOVERY FEATURE CHECKLIST

## Search

- [x] Service Search
- [x] Problem Search
- [x] Provider Search
- [x] Keyword Search
- [x] Location-aware Search
- [x] Autocomplete
- [x] Search Suggestion
- [x] Search History
- [x] Popular Search
- [x] Typo Tolerance
- [x] Semantic Search
- [x] Context-aware Search
- [x] Personalized Search
- [x] Search Ranking
- [x] Empty State

## Category

- [x] 6 Main Categories
- [x] Subcategory
- [x] Service
- [x] Service Package / Variant
- [x] Category Search
- [x] Category Context
- [x] Category → Smart Discovery
- [x] Category → Provider Matching
- [x] Centralized Taxonomy
- [x] Category Request
- [x] Category Status
- [x] Category Analytics

## Smart Discovery

- [x] Describe Problem
- [x] Text Input
- [x] Photo Input
- [x] Video Input
- [x] Smart Questions
- [x] Dynamic Questions
- [x] Information Sufficiency
- [x] Problem Classification
- [x] Category Detection
- [x] Subcategory Detection
- [x] Service Recommendation
- [x] Multiple Possible Services
- [x] Recommendation Transparency
- [x] Custom Service Request
- [x] No-result Fallback
- [x] Gemini API Integration

## Location

- [x] Current Location
- [x] Manual Location
- [x] Search Location
- [x] Saved Address
- [x] Radius
- [x] Service Area
- [x] Workshop Location

## Listing

- [x] Service Listing
- [x] Provider Listing
- [x] Service Card
- [x] Provider Card
- [x] Availability
- [x] Price
- [x] Rating
- [x] Distance
- [x] Verification

## Filter & Sort

- [x] Location
- [x] Price
- [x] Rating
- [x] Availability
- [x] Service Mode
- [x] Pricing Model
- [x] Provider Verification
- [x] Certification
- [x] Context-aware Filter
- [x] Relevance Sort
- [x] Distance Sort
- [x] Rating Sort
- [x] Price Sort
- [x] Availability Sort
- [x] Experience Sort

## Detail

- [x] Service Detail
- [x] Provider Profile
- [x] Problems Handled
- [x] Included
- [x] Excluded
- [x] Add-ons
- [x] Portfolio
- [x] Reviews
- [x] Service Area
- [x] Availability
- [x] Warranty Information

## Personalization

- [x] Favorite Provider
- [x] Favorite Service
- [x] Recently Viewed
- [x] Previous Provider
- [x] Personalized Recommendation
- [x] Service History Integration
- [x] Maintenance Integration

## Handoff

- [x] Discovery → Booking
- [x] Context Preservation
- [x] Problem Data Preservation
- [x] Photo/Video Preservation
- [x] Location Preservation
- [x] Schedule Preservation
- [x] Provider Preservation

---

# 56. CORE PRINCIPLE

Discovery Servio harus membuat customer dapat melakukan dua hal:

### Jika customer tahu kebutuhannya

```text
Search / Category
→ Service
→ Provider
→ Booking
```

### Jika customer tidak tahu kebutuhannya

```text
Problem
→ Smart Discovery
→ Possible Service
→ Provider Matching
→ Booking
```

Inti Discovery Servio:

> **Find the right service, for the right need, from the right provider.**

---

# 57. AI ARCHITECTURE PRINCIPLE

Gemini digunakan sebagai:

```text
AI Understanding Layer
```

Servio Backend digunakan sebagai:

```text
Business Logic + Source of Truth
```

Sehingga:

```text
Gemini
→ memahami kebutuhan

Servio Backend
→ memastikan service valid

Database
→ menyimpan data nyata

Matching Engine
→ menentukan provider yang eligible
```

AI tidak menjadi sumber utama untuk harga, provider, availability, service status, atau data transaksi.

---

# 58. DISCOVERY MVP PRIORITY

## MVP

```text
Search
Category
Location
Service Listing
Filter
Sort
Provider Discovery
Service Detail
Provider Profile
Favorite
Discovery → Booking
```

## Smart Discovery MVP

```text
Text Problem
↓
Smart Questions
↓
Service Recommendation
```

## Next Phase

```text
Photo Analysis
↓
Multimodal Recommendation
```

## Advanced Phase

```text
Video
Advanced Personalization
Advanced Recommendation
```

---

# 59. FINAL DISCOVERY CONCEPT

```text
                         SERVIO DISCOVERY
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ↓                       ↓                       ↓
     SEARCH                 CATEGORY              SMART DISCOVERY
        │                       │                       │
 Service / Provider       Category / Service       Problem / Need
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                ↓
                         SERVICE DISCOVERY
                                ↓
                        LOCATION DISCOVERY
                                ↓
                         FILTER + SORT
                                ↓
                       PROVIDER DISCOVERY
                                ↓
                ┌───────────────┴───────────────┐
                ↓                               ↓
         SERVICE DETAIL                  PROVIDER PROFILE
                │                               │
                └───────────────┬───────────────┘
                                ↓
                   FAVORITE / PERSONALIZATION
                                ↓
                             BOOKING
```

---

**Status: FINAL BASELINE — DISCOVERY**

Dokumen ini menjadi baseline untuk pengembangan fitur Discovery. Detail teknis seperti database schema, algoritma ranking, prompt Gemini, model AI, dan implementasi API dapat diturunkan dari specification ini pada tahap engineering.
