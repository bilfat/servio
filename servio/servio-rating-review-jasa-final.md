# SERVIO — FEATURE #11 RATING & REVIEW
## Final Specification — LOCKED

> **Feature #11:** Rating & Review  
> **Status:** FINAL / LOCKED  
> **Roadmap Position:** Service / Jasa — #11 dari 19  
> **Fokus Utama:** menyediakan sistem feedback dan reputation yang terhubung dengan transaksi service nyata, sehingga customer dapat memberikan penilaian terhadap pengalaman service setelah order selesai.

---

# 1. Definisi Utama

**Rating & Review** adalah sistem feedback yang memungkinkan customer memberikan penilaian terstruktur dan ulasan terhadap service/provider setelah order dinyatakan `COMPLETED`.

Rating & Review bukan sekadar pemberian bintang, tetapi merupakan:

```text
Customer Feedback
+
Service Quality Feedback
+
Provider Reputation
+
Operational Insight
```

Flow utama:

```text
ORDER COMPLETED
↓
RATING AVAILABLE
↓
CUSTOMER RATES
↓
OPTIONAL REVIEW
↓
VALIDATION / MODERATION
↓
PUBLISHED
↓
PROVIDER NOTIFIED
↓
REPUTATION / ANALYTICS UPDATED
```

---

# 2. Tujuan Rating & Review

### Untuk Customer

1. Memberikan pengalaman feedback.
2. Membantu customer lain memahami pengalaman service.
3. Membantu customer mengevaluasi provider.
4. Memberikan informasi yang lebih nyata sebelum memilih service.

### Untuk Provider

5. Mengetahui pengalaman customer.
6. Mengetahui bagian yang perlu diperbaiki.
7. Membangun reputasi.
8. Melihat performa berdasarkan service.

### Untuk Servio

9. Mengukur kualitas service.
10. Mengidentifikasi pola masalah.
11. Mendukung provider analytics.
12. Mendukung Discovery.
13. Mendukung Smart Recommendation.
14. Mendukung service improvement.

---

# 3. Rating vs Review

## Rating

Rating adalah feedback terstruktur.

```text
★★★★★
4.8
```

## Review

Review adalah feedback berbentuk teks/media.

Contoh:

> Teknisi datang tepat waktu dan menjelaskan masalah dengan cukup jelas.

Prinsip:

```text
Rating = Structured Feedback
Review = Qualitative Feedback
```

---

# 4. Siapa yang Memberikan Rating?

Untuk MVP:

```text
Customer → Provider / Service
```

Customer menjadi primary reviewer.

Two-sided rating:

```text
Customer → Provider
Provider → Customer
```

tidak menjadi core MVP dan ditahan untuk tahap pengembangan berikutnya.

---

# 5. Rating Hanya Setelah Completed

Customer hanya dapat memberikan rating ketika order memenuhi eligibility.

Core rule:

```text
ORDER COMPLETED
↓
RATING AVAILABLE
```

Customer tidak dapat membuat official service rating hanya karena:

- membuka profile provider
- melihat service
- melakukan booking
- membatalkan booking

---

# 6. One Order = One Primary Rating

Untuk satu customer dan satu order:

```text
1 Order
↓
1 Primary Rating
```

Tujuannya mencegah duplicate rating.

Database dapat menggunakan constraint:

```text
UNIQUE(order_id, reviewer_id)
```

---

# 7. Overall Rating

Rating utama menggunakan skala:

```text
1 ★
2 ★
3 ★
4 ★
5 ★
```

Overall rating menjadi public headline.

Contoh:

```text
★★★★★ 4.8
182 reviews
```

---

# 8. Makna Skala

Secara internal:

```text
1 = Very Poor
2 = Poor
3 = Fair
4 = Good
5 = Excellent
```

Customer-facing UX cukup menggunakan skala bintang dan penjelasan sederhana jika diperlukan.

---

# 9. Multi-Dimensional Rating

Selain overall rating, sistem dapat meminta aspek tertentu.

Contoh:

```text
Overall          ★★★★★
Quality          ★★★★★
Punctuality      ★★★★☆
Professionalism  ★★★★★
Communication    ★★★★★
Value            ★★★★☆
```

Namun jumlah dimension harus tetap sederhana dan relevan terhadap service.

---

# 10. Rating Dimension Berdasarkan Service

Dimension dapat berbeda.

### Cleaning

```text
Quality
Thoroughness
Punctuality
Professionalism
```

### Repair

```text
Quality
Problem Resolution
Technical Skill
Punctuality
Communication
```

### Automotive

```text
Service Quality
Diagnosis
Result
Transparency
Punctuality
```

### Pickup & Return

```text
Handling
Condition
Punctuality
Communication
```

Konfigurasi berasal dari:

```text
Service Offering
↓
Rating Criteria
```

---

# 11. Review Optional

Customer tidak wajib membuat review teks.

Flow:

```text
Rating
↓
Write Review (Optional)
↓
Submit
```

Rating tetap valid walaupun review kosong.

---

# 12. Review Content

Review harus relevan dengan pengalaman service.

Contoh valid:

> Teknisi datang tepat waktu dan pekerjaannya rapi.

Review tidak boleh digunakan untuk:

- spam
- promosi tidak relevan
- membocorkan data pribadi
- menyerang pihak lain
- manipulasi rating

---

# 13. Review Character Limit

Review dapat memiliki:

```text
min_length
max_length
```

Angka dapat dikonfigurasi sesuai kebutuhan produk.

Tujuannya:

- mencegah spam
- menjaga kualitas
- menjaga UX

---

# 14. Review Editing

Customer dapat mengedit review sesuai policy.

Flow:

```text
Review Submitted
↓
Edit Window
↓
Update
↓
New Version
```

Edit tidak boleh menghapus audit history.

---

# 15. Review Versioning

Jika review diedit:

```text
Version 1
↓
Version 2
```

Setiap versi dapat mencatat:

- version number
- actor
- timestamp
- reason bila diperlukan

---

# 16. Review Deletion

Customer dapat meminta deletion sesuai privacy/content policy.

Namun:

```text
Delete ≠ Silent Audit Erasure
```

Audit event tetap dapat dicatat sesuai retention policy.

---

# 17. Provider Response

Provider dapat memberikan satu official response.

Contoh:

> Terima kasih atas feedback-nya, Kak.

Flow:

```text
Review Published
↓
Provider Response
```

---

# 18. Provider Tidak Dapat Mengubah Review Customer

Provider dapat:

- membaca review
- memberikan response
- melaporkan review
- melakukan appeal jika tersedia

Provider tidak dapat:

- mengedit isi review
- menghapus review customer
- memaksa customer mengubah review

---

# 19. Provider Response Limit

Untuk MVP:

```text
1 Review
↓
1 Official Provider Response
```

Tidak perlu membuat thread diskusi panjang.

---

# 20. Provider Response Editing

Response dapat diedit sesuai policy.

History perubahan tetap dapat dicatat.

---

# 21. Verified Review

Review yang berasal dari order eligible dapat diberi badge:

```text
✓ Verified Service
```

Rule:

```text
Reviewer = Customer of Order
AND
Order = COMPLETED
```

Ini menjadi sumber trust utama review Servio.

---

# 22. Review Integrity

Review harus dapat ditelusuri:

```text
Review
↓
Rating
↓
Order
↓
Customer
↓
Provider
↓
Service
↓
Completion
```

Dengan demikian review tidak dapat dibuat bebas tanpa transaksi.

---

# 23. Review Status

Status:

```text
DRAFT
SUBMITTED
PUBLISHED
FLAGGED
UNDER_REVIEW
HIDDEN
REMOVED
```

### `DRAFT`

Belum dikirim.

### `SUBMITTED`

Customer telah mengirim.

### `PUBLISHED`

Tampil sesuai visibility policy.

### `FLAGGED`

Ditandai untuk pemeriksaan.

### `UNDER_REVIEW`

Sedang diperiksa.

### `HIDDEN`

Tidak ditampilkan sementara.

### `REMOVED`

Tidak lagi ditampilkan sesuai moderation decision.

---

# 24. Moderation

Review dapat dimoderasi untuk:

- spam
- harassment
- inappropriate content
- personal data
- advertisement
- irrelevant content
- manipulation

Moderation mengikuti content policy Servio.

---

# 25. Smart Moderation

AI dapat membantu mendeteksi:

- abusive language
- spam
- duplicate wording
- PII
- suspicious patterns
- off-topic content

AI menghasilkan signal/flag.

AI bukan pengambil keputusan final.

---

# 26. Privacy Review

Review tidak boleh menjadi tempat membocorkan:

- alamat pribadi
- nomor telepon
- identitas
- data sensitif
- informasi pribadi worker/customer

Customer dan provider dapat menggunakan display identity sesuai policy.

---

# 27. Customer Display Identity

Contoh:

```text
Muhammad N.
```

atau:

```text
Verified Customer
```

Tidak harus selalu menampilkan identitas lengkap.

---

# 28. Review Media

Customer dapat menambahkan:

- photo
- optional video

Media review berbeda dari Proof of Service.

```text
Proof = Evidence of Work
Review Media = Customer Feedback
```

---

# 29. Review Media Moderation

Review media mengikuti:

- file validation
- privacy control
- content moderation
- storage policy
- size limit

---

# 30. Rating Manipulation

Potential manipulation:

```text
Provider
↓
Fake orders
↓
Fake 5-star reviews
```

Sistem perlu mendeteksi pola tidak wajar.

Signal dapat mencakup:

- order linkage
- account patterns
- device/session signals
- review burst
- duplicate wording
- suspicious behavior

Signal bukan otomatis vonis fraud.

---

# 31. Incentivized Review

Servio dapat memberikan reward untuk review jika loyalty system diterapkan.

Prinsip:

```text
Reward for honest review
≠
Reward for positive rating
```

Jangan memberikan reward khusus karena customer memberi 5 bintang.

---

# 32. Rating Weighting

Internal analytics dapat mempertimbangkan:

- verified order
- recency
- volume
- suspicious pattern

Tetapi public rating harus tetap merepresentasikan data secara transparan.

---

# 33. Average Rating

Provider dapat memiliki:

```text
4.8 ★
182 reviews
```

Aggregate diperbarui ketika rating eligible berubah status.

---

# 34. Rating Distribution

Customer dapat melihat distribusi:

```text
5★  █████████████ 82%
4★  █████ 12%
3★  ██ 4%
2★  1%
1★  1%
```

Distribution membantu customer memahami penyebaran pengalaman, bukan hanya average.

---

# 35. New Provider

Provider tanpa review:

```text
No Rating Yet
```

bukan:

```text
0.0 ★
```

Agar tidak memberikan kesan negatif karena belum memiliki data.

---

# 36. Rating per Service

Provider dapat memiliki rating berbeda berdasarkan service.

Contoh:

```text
ABC Service

AC Cleaning
4.9

AC Repair
4.6

Electrical
4.7
```

Ini membantu customer melihat performa spesifik.

---

# 37. Rating Provider vs Service Offering

Rating dapat dikaitkan pada:

```text
Provider
+
Service
+
Provider Service Offering
```

Overall provider reputation tetap tersedia, tetapi service-specific rating memberikan konteks lebih baik.

---

# 38. Worker Rating

Worker rating tidak menjadi public metric utama pada MVP.

Worker dapat memiliki internal performance signal dari:

- punctuality
- quality
- communication
- customer feedback

Public reputation tetap berfokus pada provider/service.

---

# 39. Alasan Worker Rating Internal

Tujuannya mengurangi:

- privacy concern
- individual pressure
- rating retaliation
- over-focus pada satu worker

Worker tetap dapat dievaluasi secara operational internal.

---

# 40. Rating Questions

Contoh:

```text
How was your service?
★★★★★
```

Kemudian:

```text
What did you like?
```

atau:

```text
What could be improved?
```

Pertanyaan disesuaikan dengan rating/service.

---

# 41. Conditional Questions

Rating rendah dapat memunculkan pertanyaan tambahan.

Contoh:

```text
1–2 Stars
↓
What happened?
```

Option:

```text
Quality
Late
Communication
Price
Incomplete
Other
```

Hal ini memberikan insight lebih berguna.

---

# 42. Low Rating Flow

```text
1–2 Stars
↓
Select Issue Tag
↓
Optional Explanation
↓
Optional Evidence
↓
Submit
```

Kemudian customer dapat diarahkan ke support/dispute bila relevan.

---

# 43. High Rating Flow

Untuk rating tinggi:

```text
5 Stars
↓
What did you like?
```

Contoh tag:

- Fast
- Friendly
- Professional
- On Time
- Good Quality
- Good Value

---

# 44. Neutral Rating

Untuk 3 stars:

```text
What could be improved?
```

Tujuannya mendapatkan feedback konstruktif.

---

# 45. Review Tags

Customer dapat memilih tags.

Positive:

```text
Fast
Friendly
Professional
On Time
Good Quality
Good Value
```

Negative:

```text
Late
Poor Communication
Incomplete
Price Issue
Quality Issue
```

---

# 46. Review Tag Configuration

Tag dikontrol platform.

Provider/customer tidak bebas membuat taxonomy tag public.

Tag dapat berbeda berdasarkan Service Offering.

---

# 47. Review Search

Customer dapat mencari review berdasarkan keyword.

Contoh:

```text
"cepat"
"ramah"
"AC"
```

Ini dapat menjadi fitur scale-up.

---

# 48. Review Filter

Customer dapat filter:

```text
All
5★
4★
3★
2★
1★
```

dan jika tersedia:

```text
Service Type
```

---

# 49. Review Sort

Pilihan:

```text
Most Relevant
Newest
Highest
Lowest
Most Helpful
```

---

# 50. Helpful Review

Customer lain dapat memberikan:

```text
Helpful
```

Contoh:

```text
👍 24 people found this helpful
```

Data ini membantu sorting dan discovery.

---

# 51. Review Report

Customer atau provider dapat melaporkan review.

Flow:

```text
Report Review
↓
Select Reason
↓
Moderation
```

---

# 52. Provider Appeal

Provider yang merasa review bermasalah dapat:

```text
Report / Appeal
↓
Moderation
```

Provider tidak dapat menghapus review secara sepihak.

---

# 53. Moderation Outcome

Kemungkinan outcome:

```text
KEEP_PUBLISHED
HIDE
REMOVE
REQUEST_EDIT
ESCALATE
```

Moderator wajib menyimpan alasan.

---

# 54. Negative Review

Negative review tidak otomatis dianggap fake.

Review tetap dinilai berdasarkan:

- eligibility
- content policy
- relevance
- moderation rules
- evidence jika diperlukan

---

# 55. Positive Review

Positive review juga mengikuti integrity requirement yang sama.

Review positif tidak otomatis dianggap valid hanya karena bernilai tinggi.

---

# 56. Rating Update

Jika review/rating berubah status sesuai moderation:

```text
Review Removed
↓
Rating Aggregate Recalculated
```

Semua perubahan aggregate dapat dicatat secara audit.

---

# 57. Rating Snapshot

Untuk performa analytics:

```text
rating_average
rating_count
five_star_count
four_star_count
three_star_count
two_star_count
one_star_count
updated_at
```

Snapshot dapat disimpan atau dihitung ulang berdasarkan kebutuhan arsitektur.

---

# 58. Rating History

Provider dapat melihat:

```text
Last 30 Days
Last 90 Days
Last 12 Months
```

untuk mengetahui perubahan performa.

---

# 59. Rating Trend

Contoh:

```text
Jan 4.7
Feb 4.8
Mar 4.6
Apr 4.9
```

Trend bersifat analytics.

---

# 60. Rating by Service

Dashboard:

```text
AC Repair
4.8

Cleaning
4.9

Electrical
4.5
```

---

# 61. Public Reputation

Public profile:

```text
4.8 ★
182 reviews
✓ Verified Service
```

Jangan tampilkan internal quality score sebagai public rating.

---

# 62. Public Rating ≠ Internal Quality Score

Public:

```text
Customer Rating
4.8 ★
```

Internal:

```text
Quality Score
```

Internal score dapat mempertimbangkan banyak operational signals.

---

# 63. Rating Tidak Menentukan Kebenaran Absolut

Contoh:

```text
Provider A = 4.9
Provider B = 4.6
```

Ini adalah data rating yang berbeda, bukan klaim bahwa satu provider selalu lebih baik dalam semua kondisi.

Rating adalah agregasi pengalaman customer.

---

# 64. Rating dan Discovery

Discovery dapat menampilkan:

```text
Provider
★★★★★ 4.8
182 reviews
```

Rating menjadi salah satu informasi yang dapat digunakan customer.

---

# 65. Rating dan Recommendation

Smart Recommendation dapat menggunakan:

```text
rating
review_count
service-specific rating
review tags
quality signals
distance
price
availability
```

Rating bukan satu-satunya faktor.

---

# 66. Rating dan Provider Ranking

Internal ranking/ordering dapat mempertimbangkan:

- rating
- review count
- completed orders
- cancellation
- repeat customer
- dispute
- response performance

Tidak harus ditampilkan sebagai public score.

---

# 67. Review Summary

Smart system dapat meringkas review.

Contoh:

> “Banyak customer memuji ketepatan waktu dan keramahan provider, sementara beberapa review menyebut komunikasi perlu ditingkatkan.”

Summary harus:

- berbasis review nyata
- memiliki konteks periode
- tidak mengarang
- tidak menyembunyikan feedback penting secara menyesatkan

---

# 68. Sentiment Analysis

AI dapat mengklasifikasikan:

```text
Positive
Neutral
Negative
```

dan topic:

```text
Quality
Price
Punctuality
Communication
Professionalism
```

untuk analytics.

---

# 69. AI Moderation Boundary

AI boleh memberi flag:

```text
REVIEW_REQUIRED
```

tetapi tidak menjadi hakim mutlak.

Final moderation mengikuti policy dan mekanisme review yang berlaku.

---

# 70. Anomaly Detection

Sistem dapat memberi signal jika:

```text
20 new 5-star reviews
dalam 5 menit
```

atau pola lain yang tidak biasa.

Signal masuk ke review/operations monitoring.

---

# 71. Duplicate Review Detection

Jika teks review sangat mirip:

```text
Potential Duplicate
```

Sistem dapat menandainya untuk pemeriksaan.

Tidak otomatis menghapus tanpa policy.

---

# 72. Review Burst Detection

Potential signal:

- banyak review dalam waktu singkat
- account cluster
- wording sama
- pattern order tidak biasa

Digunakan sebagai internal anomaly signal.

---

# 73. Review Date

Customer dapat melihat:

```text
2 days ago
```

atau tanggal:

```text
19 Sept 2026
```

---

# 74. Edited Review Indicator

Jika review diedit:

```text
Edited
```

atau:

```text
Updated 18 Sept 2026
```

Tujuannya menjaga transparency chronology.

---

# 75. Review Ownership

Customer hanya dapat:

- membuat review untuk eligible order miliknya
- mengedit review sendiri sesuai policy
- menghapus/request deletion sesuai policy

Provider tidak dapat mengubah isi customer review.

---

# 76. Rating Database Integrity

Core relation:

```text
Rating
↓
Order
↓
Customer
↓
Provider
↓
Service
```

Database harus mencegah duplicate primary rating.

---

# 77. Multiple Providers

Jika satu customer memiliki:

```text
Order A → Provider A
Order B → Provider B
```

masing-masing menghasilkan rating sendiri.

Rating tidak dicampur sebagai satu transaction review.

---

# 78. One Order dengan Add-on

Jika:

```text
Order
├── Main Service
├── Add-on
└── Material
```

tetap satu primary rating untuk order kecuali future policy menentukan feedback item-level.

---

# 79. Review Window

Rating dapat memiliki:

```text
rating_available_at
rating_deadline
```

Setelah deadline:

```text
Rating Closed
```

Durasi merupakan configurable business policy.

---

# 80. Late Rating

Customer yang terlambat memberikan rating:

```text
Order Completed
↓
Rating Window
↓
Deadline
↓
Rating Closed
```

Customer tetap memiliki hak complaint/warranty sesuai policy meskipun rating window ditutup.

---

# 81. Customer Reminder

Setelah completion:

```text
Rating Available
↓
Reminder
```

Reminder tidak boleh berlebihan.

---

# 82. Provider Tidak Boleh Memaksa Rating

Provider tidak boleh meminta:

> “Kasih saya 5 bintang.”

atau menekan customer untuk mengubah rating.

Platform menjaga independensi feedback.

---

# 83. Off-platform Review Manipulation

Provider tidak boleh mengarahkan customer untuk menghindari official Servio review hanya untuk mengontrol reputation data.

---

# 84. Review Integrity

Official review selalu memiliki hubungan:

```text
Review
↓
Completed Order
↓
Actual Customer
```

Ini menjadi fondasi trust.

---

# 85. Rating dan Loyalty

Jika loyalty sudah tersedia:

```text
Completed
↓
Submit Review
↓
Reward
```

Reward tidak tergantung pada positif/negatifnya rating.

---

# 86. Review dan Proof

```text
Proof
=
Evidence of Work
```

sedangkan:

```text
Review
=
Customer Experience Feedback
```

Review tidak menggantikan Proof.

---

# 87. Review dan Communication

Provider dapat membaca feedback.

Namun Communication tidak boleh digunakan untuk meminta customer mengubah review melalui tekanan/manipulasi.

---

# 88. Review dan Complaint

```text
1 Star
≠
Automatic Dispute
```

Customer dapat memilih:

```text
Get Help
```

untuk masuk ke complaint/dispute bila memang ada masalah.

---

# 89. Review dan Warranty

```text
Low Rating
≠
Automatic Warranty Claim
```

Warranty tetap mengikuti eligibility.

---

# 90. Review dan Service History

Review dapat menjadi insight tambahan pada service history.

Service record tetap menyimpan informasi transaksi/service secara terpisah.

---

# 91. Review dan Product/Material

Jika service menggunakan produk/material:

Review tetap menilai service/provider pada order tersebut.

Review produk merupakan domain berbeda jika product review nantinya dibutuhkan.

---

# 92. Review Analytics

Admin dapat melihat:

- average rating
- rating distribution
- review volume
- low-rating rate
- service-specific rating
- provider-specific rating
- rating trend
- frequent feedback tags

---

# 93. Low Rating Analytics

Contoh:

```text
AC Repair
4.5 average

Frequent Issues:
Communication
Delay
Incomplete
```

Ini dapat menjadi input operational improvement.

---

# 94. Complaint Correlation

Analytics dapat menghubungkan:

```text
Low Rating
+
Complaint
+
Refund
```

sebagai quality signal.

Rating tidak otomatis membuktikan kesalahan provider.

---

# 95. Warranty Correlation

Analytics dapat melihat:

```text
Low Rating
+
Warranty Claim
```

untuk mendeteksi kemungkinan service quality issue.

---

# 96. Repeat Booking Signal

Rating dapat dianalisis bersama:

```text
Rating
+
Repeat Booking
```

untuk memahami customer experience.

Repeat booking bukan satu-satunya indikator kualitas.

---

# 97. Provider Dashboard

Contoh:

```text
OVERALL RATING
4.8 ★

TOTAL REVIEWS
182

THIS MONTH
+24

MOST COMMON PRAISE
✓ Fast
✓ Friendly

MOST COMMON IMPROVEMENT
⚠ Communication
```

---

# 98. Admin Dashboard

Contoh:

```text
Platform Rating
4.72

Low Rating Rate
...

Top Negative Tag
...

Service Category
...

Anomaly Signals
...
```

---

# 99. Rating Trigger

Feature #10 menghasilkan:

```text
ORDER COMPLETED
```

Kemudian Feature #11:

```text
RATING AVAILABLE
```

Jadi:

```text
Completion → Rating
```

bukan:

```text
Rating → Completion
```

---

# 100. Rating Lifecycle

```text
ORDER COMPLETED
↓
RATING AVAILABLE
↓
CUSTOMER RATES
↓
OPTIONAL REVIEW
↓
VALIDATION / MODERATION
↓
PUBLISHED
↓
AGGREGATE UPDATED
↓
PROVIDER NOTIFIED
```

---

# 101. Low Rating Lifecycle

```text
ORDER COMPLETED
↓
Customer gives 1–2 stars
↓
Issue Tags
↓
Optional Explanation
↓
Submit
↓
Rating Published
↓
Optional Help / Complaint
```

---

# 102. Review Moderation Lifecycle

```text
Review Published
↓
Report / Flag
↓
UNDER_REVIEW
↓
Decision
├── Keep
├── Hide
└── Remove
```

---

# 103. Provider Response Lifecycle

```text
Review Published
↓
Provider Opens Review
↓
Write Response
↓
Submit
↓
Response Published
```

---

# 104. Rating Event

Event utama:

```text
RATING_STARTED
RATING_SUBMITTED
REVIEW_SUBMITTED
REVIEW_EDITED
REVIEW_PUBLISHED
REVIEW_FLAGGED
REVIEW_HIDDEN
REVIEW_REMOVED
PROVIDER_RESPONDED
```

---

# 105. Database Concept

Entitas utama:

```text
ratings
rating_dimensions
reviews
review_media
review_tags
review_responses
review_reports
review_events
rating_aggregates
```

---

# 106. `ratings`

Concept:

```text
rating_id
order_id
customer_id
provider_id
service_id
provider_service_id
overall_rating
submitted_at
status
```

---

# 107. `rating_dimensions`

Concept:

```text
rating_dimension_id
rating_id
dimension
score
```

Contoh:

```text
QUALITY = 5
PUNCTUALITY = 4
COMMUNICATION = 5
```

---

# 108. `reviews`

Concept:

```text
review_id
rating_id
customer_id
content
status
created_at
updated_at
published_at
```

---

# 109. `review_media`

Concept:

```text
review_media_id
review_id
file_id
media_type
created_at
```

---

# 110. `review_tags`

Concept:

```text
review_tag_id
review_id
tag_id
```

---

# 111. `review_responses`

Concept:

```text
response_id
review_id
provider_id
content
status
created_at
updated_at
```

---

# 112. `review_reports`

Concept:

```text
report_id
review_id
reporter_id
reason
status
created_at
resolved_at
```

---

# 113. `review_events`

Contoh:

```text
RATING_STARTED
RATING_SUBMITTED
REVIEW_SUBMITTED
REVIEW_EDITED
REVIEW_PUBLISHED
REVIEW_FLAGGED
REVIEW_HIDDEN
REVIEW_REMOVED
REVIEW_RESPONDED
```

---

# 114. `rating_aggregates`

Concept:

```text
provider_id
service_id
average_rating
rating_count
five_star_count
four_star_count
three_star_count
two_star_count
one_star_count
updated_at
```

---

# 115. Public Rating Card

Contoh:

```text
4.8 ★
182 reviews
✓ Verified Service
```

Public card tidak perlu memperlihatkan internal scoring formula.

---

# 116. Review Card

Contoh:

```text
★★★★★

Muhammad N.
✓ Verified Service

"Teknisi datang tepat waktu dan hasil
AC langsung terasa lebih dingin."

Service:
AC Cleaning

2 days ago

Helpful • 12
```

Provider response:

> Terima kasih atas feedback-nya!

---

# 117. Customer Rating UI

Konsep:

```text
How was your service?

★★★★★

What did you like?
[Fast]
[Professional]
[On Time]

Write a review (optional)

[Submit]
```

---

# 118. Low Rating UI

Konsep:

```text
How was your service?

★★☆☆☆

What happened?
☐ Quality
☐ Late
☐ Communication
☐ Price
☐ Incomplete
☐ Other

Additional note
[........................]

[Submit]
```

---

# 119. Provider Review UI

Provider melihat:

```text
Rating
Review
Service
Date
Verified Service
Customer Display Name

[Respond]
[Report]
```

---

# 120. Boundary dengan #10

Feature #10:

```text
Order Completed
```

Feature #11:

```text
Rating Available
```

Rating tidak menentukan completion.

---

# 121. Boundary dengan #9

Feature #9:

```text
Proof of Service
```

Feature #11:

```text
Customer Feedback
```

Jadi:

```text
Proof ≠ Review
```

---

# 122. Boundary dengan #12

Feature #11:

```text
Feedback / Reputation
```

Feature #12:

```text
Formal Complaint / Dispute
```

Jadi:

```text
1 Star ≠ Automatic Dispute
```

---

# 123. Boundary dengan #13

Feature #13 menangani:

```text
Warranty
```

Rating hanya menjadi signal.

```text
Low Rating ≠ Automatic Warranty Claim
```

---

# 124. Boundary dengan #14

Feature #14 menyimpan:

```text
Service History
```

Rating dapat menjadi feedback context.

Rating bukan pengganti service history.

---

# 125. Boundary dengan #18

Feature #18 Smart Recommendation dapat menggunakan:

```text
Rating
Review Count
Service-specific Rating
Review Tags
Quality Signals
```

Rating bukan satu-satunya recommendation factor.

---

# 126. Boundary dengan #6

Rating tidak:

- process payment
- refund
- payout
- escrow release

Payment tetap Feature #6.

---

# 127. Final MVP Flow

```text
ORDER COMPLETED
↓
Rating Prompt
↓
Overall Rating 1–5 ★
↓
Optional Dimensions
↓
Optional Tags
↓
Optional Review
↓
Optional Review Media
↓
Submit
↓
Verified Review
↓
Provider Notification
↓
Provider Response
```

---

# 128. FINAL LOCKED PRINCIPLES

1. Rating & Review adalah feedback dan reputation system.
2. Rating dan review adalah dua data yang berbeda.
3. Customer menjadi primary reviewer pada MVP.
4. Two-sided rating tidak menjadi core MVP.
5. Rating hanya tersedia setelah eligible order completed.
6. Satu order menghasilkan satu primary rating per reviewer.
7. Overall rating menggunakan skala 1–5.
8. Review teks bersifat optional.
9. Rating dimensions dapat digunakan.
10. Rating dimensions harus relevan dengan service.
11. Service Offering dapat menjadi sumber konfigurasi rating criteria.
12. Review memiliki content policy.
13. Review memiliki character limit.
14. Review dapat diedit sesuai policy.
15. Edit review menggunakan versioning.
16. Review deletion tidak menghilangkan audit event.
17. Provider dapat memberikan satu official response.
18. Provider tidak dapat mengubah isi review customer.
19. Provider tidak dapat menghapus review customer secara sepihak.
20. Review eligible dapat memiliki badge Verified Service.
21. Review harus dapat ditelusuri ke order.
22. Review harus terhubung dengan customer.
23. Review harus terhubung dengan provider/service.
24. Review memiliki lifecycle/status.
25. Review dapat dimoderasi.
26. AI dapat membantu moderation.
27. AI tidak menjadi moderator final secara mutlak.
28. Privacy review harus dijaga.
29. Customer dapat menggunakan display identity.
30. Review dapat memiliki photo/video.
31. Review media berbeda dari Proof of Service.
32. Rating manipulation harus dapat dideteksi.
33. Suspicious signal bukan otomatis vonis fraud.
34. Reward review tidak boleh bergantung pada rating positif.
35. Public rating harus transparan.
36. Internal weighting dapat digunakan untuk analytics.
37. Public rating tidak sama dengan internal quality score.
38. Provider tanpa rating ditampilkan sebagai No Rating Yet.
39. Rating dapat dihitung per provider.
40. Rating dapat dianalisis per service.
41. Rating dapat dianalisis per Service Offering.
42. Worker rating bukan public metric utama MVP.
43. Worker performance dapat menjadi internal signal.
44. Rating rendah dapat memunculkan conditional feedback question.
45. Rating tinggi dapat meminta positive feedback tag.
46. Rating netral dapat meminta improvement feedback.
47. Review tags dikontrol platform.
48. Review dapat dicari berdasarkan keyword.
49. Review dapat difilter berdasarkan rating.
50. Review dapat diurutkan.
51. Customer dapat memberi helpful feedback.
52. Review dapat dilaporkan.
53. Provider dapat melakukan appeal.
54. Moderation decision harus mempunyai reason.
55. Negative review tidak otomatis fake.
56. Positive review mengikuti integrity requirement yang sama.
57. Removed review dapat memicu aggregate recalculation.
58. Rating aggregate dapat disimpan dalam optimized structure.
59. Rating history dapat digunakan untuk analytics.
60. Rating trend dapat ditampilkan pada provider/admin.
61. Rating dapat digunakan di Discovery.
62. Rating dapat digunakan di Smart Recommendation.
63. Rating bukan satu-satunya recommendation factor.
64. Rating bukan kebenaran absolut mengenai kualitas provider.
65. Rating tidak menentukan completion.
66. Completion menjadi trigger rating.
67. Complaint/dispute tidak otomatis muncul hanya karena rating rendah.
68. Warranty tidak otomatis muncul hanya karena rating rendah.
69. Review dapat menjadi insight service history.
70. Rating dapat dipakai untuk quality analytics.
71. Low rating dapat dikorelasikan dengan complaint.
72. Low rating dapat dikorelasikan dengan warranty claim.
73. Rating dapat dianalisis bersama repeat booking.
74. Customer dapat menerima rating reminder.
75. Rating window dapat memiliki deadline.
76. Rating deadline merupakan configurable business policy.
77. Provider tidak boleh memaksa customer memberikan rating positif.
78. Review resmi Servio harus tetap terhubung dengan completed transaction.
79. Rating event harus tersedia.
80. Review event harus tersedia.
81. Database harus mencegah duplicate primary rating.
82. Rating provider dan service-specific rating dapat dibedakan.
83. Public reputation tidak perlu menampilkan internal score.
84. Review summary AI harus berbasis review nyata.
85. AI summary tidak boleh mengarang.
86. AI summary harus memiliki konteks waktu.
87. AI sentiment dapat digunakan untuk analytics.
88. AI topic classification dapat digunakan untuk analytics.
89. Anomaly detection dapat memberi signal.
90. Duplicate review detection dapat memberi signal.
91. Review burst detection dapat memberi signal.
92. Suspicious activity membutuhkan policy review.
93. Review response mengikuti content policy.
94. Communication tidak boleh digunakan untuk manipulasi review.
95. Rating tidak menggantikan Proof of Service.
96. Rating tidak menggantikan Complaint/Dispute.
97. Rating tidak menggantikan Warranty.
98. Rating tidak menggantikan Service History.
99. Rating tidak menangani Payment.
100. Rating merupakan feedback layer setelah service completion.
101. **Feature #11 menjadi sistem resmi untuk mengubah pengalaman customer setelah service menjadi data rating, review, reputation, dan quality insight.**

---

# 129. Ringkasan Arsitektur

```text
#10 COMPLETION
        ↓
ORDER COMPLETED
        ↓
#11 RATING & REVIEW
        ↓
Customer Feedback
        ↓
┌─────────────────────────────┐
│ Overall Rating              │
│ Dimension Rating            │
│ Review                      │
│ Review Tags                 │
│ Review Media                │
│ Provider Response           │
│ Moderation                  │
│ Rating Aggregate            │
└─────────────────────────────┘
        ↓
┌──────────────┬───────────────┬──────────────────┐
│ Discovery    │ Recommendation│ Quality Analytics│
└──────────────┴───────────────┴──────────────────┘
```

---

# 130. Konsep Final Singkat

> **Rating & Review adalah sistem feedback dan reputation setelah order selesai yang memungkinkan customer memberikan penilaian terstruktur dan ulasan berdasarkan transaksi service nyata, dilengkapi verification, moderation, provider response, analytics, dan anti-manipulation sehingga feedback dapat menjadi sumber informasi bagi customer sekaligus insight kualitas bagi provider dan Servio tanpa mengambil alih fungsi completion, proof, dispute, warranty, maupun payment.**

---

## STATUS FINAL

**FEATURE #11 — RATING & REVIEW ✅ LOCKED**

Dokumen ini menjadi baseline untuk:

- UI/UX
- PRD
- Database
- API
- Customer Flow
- Provider Flow
- Admin Flow
- Rating System
- Review Moderation
- Provider Reputation
- Discovery Integration
- Smart Recommendation Integration
- Quality Analytics
