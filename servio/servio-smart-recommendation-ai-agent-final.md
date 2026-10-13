# SERVIO — FEATURE #18
# SMART RECOMMENDATION & AI AGENT
## FINAL BUSINESS FLOW & FUNCTIONAL SPECIFICATION — LOCKED

> **Status: LOCKED**
>
> Feature #18 adalah domain intelligence Servio untuk menghasilkan rekomendasi service, provider, maintenance action, rebooking, alternative, dan related product berdasarkan context pengguna serta data operasional Servio.
>
> **Keputusan penting:** automated learning/training pipeline disiapkan **sejak awal sistem dibangun**. Artinya, Servio tidak harus menunggu sistem besar baru memiliki infrastructure ML. Pada fase awal, model dapat sederhana, tetapi data collection, feature pipeline, training pipeline, evaluation gate, model registry, deployment, monitoring, dan rollback sudah dipersiapkan sejak awal.
>
> Gemini/LLM dapat digunakan sebagai **AI/LLM layer dan Agent layer**, tetapi bukan source of truth untuk data, eligibility, harga, availability, payment, warranty, safety, atau status transaksi.

---

# 1. Posisi Feature

Feature #18 berada setelah:

- #14 Service History
- #15 Asset
- #16 Maintenance & Reminder
- #17 Rebooking / Favorite / Loyalty

dan sebelum:

- #19 Service + Product Integration

Feature #18 menggunakan context dari feature sebelumnya untuk membantu customer memilih tindakan atau service yang relevan.

---

# 2. Definisi

**Smart Recommendation** adalah sistem yang menentukan dan menyajikan opsi yang relevan berdasarkan data dan context.

**AI Agent** adalah interface/orchestrator yang memahami kebutuhan pengguna, mengambil data yang relevan, memanggil tool/service internal, menjalankan reasoning terbatas, lalu menyajikan rekomendasi atau membantu melanjutkan action.

```text
RECOMMENDATION
= WHAT SHOULD BE SUGGESTED?

AI AGENT
= HOW DOES THE SYSTEM UNDERSTAND AND ASSIST THE USER?
```

---

# 3. Recommendation ≠ AI Agent

Keduanya terhubung tetapi berbeda.

```text
Recommendation Engine
= menentukan candidate + ranking

AI Agent
= memahami user + mengorkestrasi tools + menjelaskan + membantu action
```

---

# 4. Recommendation ≠ Search

Search:

```text
Customer gives query
↓
System returns matching result
```

Recommendation:

```text
System understands context
↓
System proposes relevant option
```

---

# 5. Recommendation ≠ Discovery

Discovery #1:

> customer menemukan service/provider.

Recommendation #18:

> system menentukan opsi yang paling relevan untuk ditawarkan.

#18 dapat menggunakan Discovery catalog dan infrastructure.

---

# 6. Recommendation ≠ AI Chat

AI Chat bukan otomatis recommendation engine.

AI Agent dapat menggunakan Recommendation Engine sebagai tool.

```text
User
↓
AI Agent
↓
Recommendation Engine
↓
Candidate / Ranking
↓
AI Agent
↓
User
```

---

# 7. Core Objective

Feature #18 harus mampu:

1. memahami intent customer
2. menggunakan customer context
3. menghasilkan candidate
4. menyaring candidate yang tidak valid
5. melakukan ranking
6. menjelaskan alasan recommendation
7. menghasilkan recommendation yang actionable
8. membantu customer menuju booking
9. mendukung provider recommendation
10. mendukung maintenance recommendation
11. mendukung rebooking recommendation
12. mendukung alternative recommendation
13. mendukung product recommendation
14. belajar dari interaction data
15. menjalankan retraining otomatis melalui pipeline
16. mengevaluasi model baru sebelum production
17. memonitor kualitas model
18. melakukan rollback bila model bermasalah

---

# 8. Core Data Sources

Recommendation dapat menggunakan data dari feature #1–#17.

```text
#1 Discovery
#2 Booking
#3 Order
#4 Pricing & Quotation
#5 Communication
#6 Payment & Protection
#7 Service Execution
#8 Tracking
#9 Proof of Service
#10 Completion
#11 Rating & Review
#12 Complaint / Dispute
#13 Warranty
#14 Service History
#15 Asset
#16 Maintenance & Reminder
#17 Rebooking / Favorite / Loyalty
```

Tidak semua data harus digunakan untuk setiap recommendation.

---

# 9. Data Flow

```text
Servio Data #1–#17
        ↓
Data Collection
        ↓
Data Pipeline
        ↓
Feature Generation
        ↓
Recommendation Engine
        ↓
AI / ML / Rules
        ↓
Recommendation
        ↓
User Action
        ↓
Interaction Data
        ↓
Training Dataset
        ↓
Automated Training
        ↓
Evaluation
        ↓
Model Registry
        ↓
Production
```

---

# 10. Big Architectural Decision

**Automated learning infrastructure dibuat sejak awal.**

Bukan:

```text
Build product first
↓
Wait years
↓
Think about ML later
```

Tetapi:

```text
Build product
+
Build data instrumentation
+
Build ML pipeline
from day one
```

Model awal boleh sederhana.

Infrastructure dibuat scalable.

---

# 11. Model Maturity

Servio tidak harus langsung menggunakan deep learning.

Initial model dapat berupa:

```text
Rule-based ranking
+
simple statistical model
+
basic ML ranking
+
Gemini/LLM
```

Seiring data bertambah:

```text
Rule
→ Classical ML
→ Learning-to-Rank
→ Advanced ML
→ Hybrid Recommendation
```

---

# 12. Day-One Architecture

Sejak awal:

```text
Application
↓
Event Tracking
↓
Data Store
↓
Feature Pipeline
↓
Training Dataset
↓
Training Job
↓
Evaluation
↓
Model Registry
↓
Inference Service
```

Walaupun training pertama mungkin menghasilkan model sederhana.

---

# 13. Initial Model

Untuk MVP:

```text
Recommendation Model v0/v1
```

dapat menggunakan:

- rules
- heuristic scoring
- statistical popularity
- simple ranking model
- compatibility logic

Tujuannya bukan langsung menjadi "AI super pintar".

Tujuannya:

> architecture sudah siap untuk berkembang tanpa rebuild total.

---

# 14. Automated Retraining

Sistem dapat menjalankan training otomatis berdasarkan trigger seperti:

- data volume threshold
- schedule
- model performance deterioration
- feature drift
- behavior shift

---

# 15. Retraining Trigger

Contoh:

```text
Every week
OR
50.000 new interactions
OR
model performance drops
```

Exact threshold adalah configurable policy.

---

# 16. Automated Training Flow

```text
New Data
↓
Data Quality Check
↓
Dataset Version
↓
Feature Generation
↓
Train
↓
Evaluate
↓
Compare with Production Model
↓
Pass?
```

---

# 17. Evaluation Gate

Model baru tidak boleh otomatis production hanya karena berhasil train.

Harus ada:

```text
MODEL CANDIDATE
↓
EVALUATION
↓
QUALITY GATE
```

---

# 18. Model Promotion

```text
Candidate Model
↓
Pass Gate
↓
Register
↓
Deploy
```

Jika fail:

```text
Candidate Model
↓
Reject
↓
Current Production Model remains
```

---

# 19. No Blind Auto-Deployment

Automated deployment tetap harus memiliki guardrail.

```text
TRAINING AUTOMATED
+
EVALUATION AUTOMATED
+
PROMOTION RULE AUTOMATED
```

dengan policy yang telah ditentukan.

---

# 20. Model Registry

Servio harus memiliki model/version registry.

Contoh:

```text
Recommendation Model
v1
v2
v3
v4
```

Setiap model dapat memiliki:

- version
- training dataset version
- feature version
- metric
- status
- deployment time
- rollback reference

---

# 21. Production Model

Status:

```text
CANDIDATE
STAGING
CANARY
PRODUCTION
RETIRED
REJECTED
```

---

# 22. Model Rollback

Jika production model bermasalah:

```text
Production v4
↓
Issue detected
↓
Rollback
↓
Production v3
```

Rollback harus cepat dan terukur.

---

# 23. Canary Deployment

Scale-up:

```text
v4
↓
5% traffic
↓
monitor
↓
25%
↓
50%
↓
100%
```

Jika metric turun:

```text
STOP
+
ROLLBACK
```

---

# 24. A/B Testing

Recommendation dapat diuji dengan:

```text
Model A
vs
Model B
```

Metrik dapat meliputi:

- click-through
- booking conversion
- completion
- relevant feedback
- downstream value

---

# 25. Model Monitoring

Monitor:

- latency
- errors
- recommendation distribution
- CTR
- conversion
- relevance feedback
- data drift
- feature drift
- model drift

---

# 26. Data Drift

Data drift terjadi ketika pola input berubah.

Contoh:

```text
Traffic sebelumnya:
70% AC service

Sekarang:
45% AC
25% automotive
```

System dapat mendeteksi perubahan distribusi.

---

# 27. Concept Drift

User behavior dapat berubah.

Contoh:

```text
Customer behavior 2026
≠
Customer behavior 2027
```

Retraining harus dapat beradaptasi.

---

# 28. Model Performance Decay

Model lama dapat semakin tidak relevan.

System dapat memiliki threshold untuk memicu retraining.

---

# 29. Feedback Loop

Core:

```text
Recommendation
↓
Viewed?
↓
Clicked?
↓
Booked?
↓
Completed?
↓
Rated?
↓
Rebooked?
↓
Future Recommendation
```

---

# 30. Negative Feedback

Customer dapat memberikan signal:

```text
NOT_RELEVANT
NOT_INTERESTED
DISMISSED
HIDDEN
```

Signal ini dapat menjadi learning signal.

---

# 31. Recommendation Feedback ≠ Rating

Recommendation feedback tidak mengubah public rating.

---

# 32. Recommendation Feedback ≠ Complaint

"Not relevant" bukan complaint.

---

# 33. Recommendation Types

Core recommendation types:

```text
SERVICE
PROVIDER
MAINTENANCE
REBOOK
PRODUCT
ALTERNATIVE
```

---

# 34. Service Recommendation

Contoh:

```text
Your AC may need inspection.

Recommended:
AC Inspection
```

---

# 35. Provider Recommendation

Contoh:

```text
Recommended providers for AC Repair:
Provider A
Provider B
Provider C
```

---

# 36. Maintenance Recommendation

Contoh:

```text
Car maintenance is due.
Recommended:
Periodic Service
```

Maintenance state tetap berasal dari #16.

---

# 37. Rebooking Recommendation

Contoh:

```text
You used ABC Service before.
Book again?
```

History/rebooking context berasal dari #14/#17.

---

# 38. Product Recommendation

Contoh:

```text
Filter replacement may be relevant.
Recommended compatible filter.
```

Commerce tetap mengikuti #19.

---

# 39. Alternative Recommendation

Jika pilihan utama unavailable:

```text
Provider A unavailable
↓
Provider B
Provider C
```

---

# 40. Candidate Generation

Candidate source:

```text
Service Catalog
Provider Catalog
History
Maintenance
Favorites
Product Catalog
Nearby Options
Campaign
```

---

# 41. Hard Filter

Sebelum ranking, system menghapus candidate yang tidak valid.

Hard constraints:

- inactive service
- inactive provider
- incompatible asset
- unsupported service mode
- outside coverage
- unavailable
- safety restriction
- required certification absent
- policy restriction

---

# 42. Soft Ranking

Candidate valid dapat diranking berdasarkan:

- compatibility
- availability
- customer preference
- history
- favorite
- location
- price fit
- rating/review
- provider quality signals
- business rules
- campaign context
- model signal

---

# 43. Business Rule > Model

AI/ML tidak boleh mengalahkan hard business constraints.

```text
Model:
Provider A is highly relevant

Rule:
Provider A does not serve this area

Result:
Provider A cannot be actionable recommendation
```

---

# 44. Compatibility

Untuk asset-based service:

```text
Asset Type
↓
Compatible Service
↓
Compatible Provider
```

Compatibility adalah salah satu constraint penting.

---

# 45. Service Mode Fit

Jika customer butuh:

```text
Home Service
```

Provider workshop-only bukan candidate actionable.

---

# 46. Booking Type Fit

Recommendation dapat memperhatikan:

```text
Instant
Scheduled
Emergency
Inspection
Project
Custom Request
```

yang tersedia pada service/provider.

---

# 47. Pricing Model Fit

Recommendation dapat menampilkan:

```text
Fixed Price
Estimated
Request Quote
Negotiation
```

sesuai current offering.

---

# 48. No Fake Price

Untuk quotation/negotiation service:

```text
REQUEST QUOTE
```

lebih benar daripada menampilkan fake exact price.

---

# 49. Location Context

Location dapat berasal dari:

- current location
- saved location
- service address
- asset location

Untuk home service, service address/asset location dapat lebih relevan daripada current location.

---

# 50. Location ≠ Automatic Best

Provider terdekat tidak otomatis menjadi recommendation terbaik.

---

# 51. Availability Context

Provider availability harus dipertimbangkan untuk actionable recommendations.

---

# 52. Availability ≠ Guarantee

```text
Recommended
≠
Guaranteed Available
```

kecuali actual booking/reservation sudah terjadi.

---

# 53. Real-Time Validation

Saat customer melakukan action:

```text
Recommendation
↓
Click
↓
Current validation
↓
Booking
```

Recommendation bukan bypass validation.

---

# 54. Stale Recommendation

Recommendation dapat menjadi stale karena:

- availability berubah
- price berubah
- provider inactive
- service archived
- policy changed
- context changed

---

# 55. Refresh Trigger

Refresh dapat terjadi ketika:

- location berubah
- asset berubah
- intent berubah
- maintenance status berubah
- provider availability berubah
- price changes
- service changes

---

# 56. Recommendation Expiration

Recommendation tertentu dapat memiliki:

```text
expires_at
```

terutama time-sensitive recommendation.

---

# 57. Recommendation Session

Setiap recommendation request dapat memiliki:

```text
recommendation_request_id
```

untuk traceability.

---

# 58. Recommendation Reason

Recommendation sebaiknya memiliki structured reason.

Contoh:

```text
MAINTENANCE_DUE
PREVIOUSLY_USED
FAVORITED
NEARBY
AVAILABLE
COMPATIBLE
PRICE_FIT
POPULAR
MATCHED_INTENT
```

---

# 59. Multiple Reasons

Satu recommendation dapat memiliki lebih dari satu reason.

```text
MAINTENANCE_DUE
+
PREVIOUSLY_USED
+
AVAILABLE
```

---

# 60. Primary Reason

UI dapat memilih satu atau dua reason utama agar tetap sederhana.

---

# 61. Customer-Facing Explanation

Contoh:

```text
Recommended because:
✓ Your maintenance is due
✓ You used this provider before
✓ Available tomorrow
```

---

# 62. Explainability

Reason harus berasal dari data/rules/model signal yang valid.

Jangan membuat alasan fiktif.

---

# 63. Confidence

Model dapat memiliki internal confidence.

Customer tidak harus melihat angka.

---

# 64. Confidence ≠ Truth

Confidence model tidak berarti service pasti dibutuhkan.

---

# 65. AI Intent Understanding

Gemini/LLM dapat digunakan untuk memahami natural language.

Contoh:

```text
"AC saya nyala tapi nggak dingin dan berisik."
```

LLM dapat menghasilkan structured intent:

```text
domain:
AC & Cooling

possible_need:
inspection / repair

urgency:
unknown
```

---

# 66. LLM Structured Output

LLM sebaiknya menghasilkan structured data yang divalidasi backend.

Contoh konsep:

```json
{
  "category": "AC_COOLING",
  "possible_services": [
    "AC_INSPECTION",
    "AC_REPAIR"
  ]
}
```

Actual IDs dan eligibility tetap diverifikasi oleh Servio backend.

---

# 67. LLM ≠ Database Query Authority

Gemini tidak boleh menentukan:

```text
price
availability
payment status
warranty status
order status
```

dari memorinya.

Tool/database harus menjadi source.

---

# 68. AI Agent Tools

AI Agent dapat memiliki tools seperti:

```text
search_services
get_asset
get_service_history
get_maintenance_status
get_favorites
get_available_providers
get_current_pricing
get_eligible_rewards
create_booking_intent
```

Tool names adalah implementation concept dan dapat berubah.

---

# 69. Agent Read vs Write

Read tools:

```text
get_asset
get_history
get_maintenance
search_services
```

Write/action tools:

```text
create_booking_intent
favorite_service
redeem_reward
```

Write tools harus mempunyai validation/authorization.

---

# 70. Agent Confirmation

Action yang berdampak nyata sebaiknya meminta confirmation sesuai policy.

Contoh:

```text
Agent:
"I found Provider A at 10:00, Rp150.000.
Book it?"

User:
"Yes."
```

---

# 71. No Silent Transaction

Agent tidak boleh membuat order/payment hanya karena user bertanya.

---

# 72. Payment Confirmation

Agent tidak boleh menjalankan payment final tanpa explicit user action/confirmation yang sesuai payment policy.

---

# 73. Booking Confirmation

Agent dapat memulai booking flow tetapi final booking harus mengikuti Booking #2.

---

# 74. Agent Cannot Override Rules

Agent tidak dapat:

- bypass safety
- bypass payment
- force unavailable provider
- bypass warranty policy
- alter order state
- change official history

---

# 75. AI Agent Failure

Jika AI gagal memahami:

```text
I'm not fully sure what service you need.
```

Kemudian fallback ke:

```text
manual category selection
```

atau discovery.

---

# 76. Hallucination Prevention

Agent harus:

```text
Retrieve
Validate
Then answer
```

bukan mengarang provider/price/availability.

---

# 77. Grounding

AI response untuk Servio harus digrounding ke:

- current database
- approved service catalog
- provider data
- maintenance data
- order/history context
- recommendation engine result

---

# 78. Retrieval

AI Agent dapat mengambil structured context terlebih dahulu.

---

# 79. Agent Context Limit

Tidak semua #1–#17 harus dikirim ke LLM.

Hanya context relevan.

---

# 80. Data Minimization

AI hanya menerima data yang dibutuhkan untuk task.

---

# 81. Privacy

History, asset, location, loyalty, communication merupakan data customer.

Agent access harus mengikuti permissions.

---

# 82. Sensitive Inference

AI tidak boleh membuat sensitive personal inferences yang tidak diperlukan.

---

# 83. Recommendation Transparency

Customer dapat mengetahui bahwa recommendation bisa berasal dari:

```text
Your History
Your Asset
Maintenance
Availability
Location
Popular Services
```

tanpa membuka internal model secrets.

---

# 84. Organic vs Sponsored

Recommendation source dapat dibedakan:

```text
ORGANIC
SPONSORED
CAMPAIGN
SYSTEM
```

---

# 85. Sponsored Transparency

Paid placement harus diberi label.

---

# 86. Sponsored ≠ Organic Ranking

Sponsored placement tidak boleh diam-diam disamakan dengan purely personalized ranking.

---

# 87. Diversity

Recommendation dapat menerapkan diversity:

- provider diversity
- service diversity
- price diversity
- option diversity

---

# 88. Exploration

Provider/service baru dapat diberikan controlled exposure.

---

# 89. New Provider Cold Start

Provider baru dapat memiliki candidate signals:

- verification
- service compatibility
- coverage
- availability
- price
- service configuration

tanpa fake reviews.

---

# 90. New Customer Cold Start

Customer baru:

```text
Current Intent
+
Location
+
Availability
+
Popular/Verified Options
```

---

# 91. Avoid Fake Personalization

Jangan bilang:

```text
"Recommended especially for you"
```

jika recommendation sebenarnya hanya:

```text
Popular Nearby
```

---

# 92. Factual Labels

Label dapat:

```text
Recommended for You
Based on Your History
Near You
Available Today
Previously Used
Maintenance Due
Popular Nearby
```

---

# 93. Popularity

Popularity dapat menjadi signal jika berasal dari real data.

---

# 94. Popular ≠ Best

"Popular" tidak boleh diterjemahkan menjadi "best" secara otomatis.

---

# 95. Quality Signals

Model dapat menggunakan:

- completion
- rating
- complaint signals
- warranty signals
- response
- cancellation
- repeat usage

Bobot ditentukan melalui model/policy.

---

# 96. Rating Boundary

Public rating tetap berasal dari #11.

Recommendation model hanya menggunakan rating sebagai signal bila sesuai policy.

---

# 97. Complaint Boundary

Complaint signal tidak otomatis berarti provider harus excluded.

Exclusion/restriction membutuhkan policy.

---

# 98. Warranty Boundary

Warranty context dapat menjadi compatibility signal.

Warranty decision tetap #13.

---

# 99. Maintenance Boundary

Maintenance due/status tetap #16.

Recommendation hanya menggunakan context tersebut.

---

# 100. Rebooking Boundary

Rebooking context berasal #17.

Recommendation dapat menyarankan Book Again.

---

# 101. Favorite Boundary

Favorite relation berasal #17.

Recommendation dapat mempertimbangkan favorite preference.

---

# 102. Loyalty Boundary

Reward eligibility berasal #17.

Recommendation dapat menampilkan reward-compatible option.

---

# 103. Product Boundary

#18 dapat merekomendasikan product.

Commerce flow tetap #19.

---

# 104. Recommendation and Booking

Action:

```text
Recommendation
↓
Booking #2
```

Recommendation tidak membuat booking engine baru.

---

# 105. Recommendation and Order

New transaction:

```text
Recommendation
↓
Booking
↓
Order #3
```

---

# 106. Recommendation and Pricing

Current pricing:

```text
Recommendation
↓
Pricing #4
```

---

# 107. Recommendation and Payment

Payment:

```text
Booking/Order
↓
Payment #6
```

---

# 108. Recommendation and Execution

Recommendation hanya memulai service flow.

Execution tetap #7.

---

# 109. Recommendation and Proof

Proof tetap #9.

---

# 110. Recommendation and Completion

Completion tetap #10.

---

# 111. Recommendation and History

Completed service kembali menjadi History #14 dan menjadi data future recommendation.

---

# 112. Data Flywheel

```text
Recommendation
↓
User Action
↓
Transaction
↓
Outcome
↓
Feedback
↓
Training Data
↓
New Model
↓
Better Recommendation
```

Ini adalah core learning loop Servio.

---

# 113. Training Data

Training dataset dapat menggunakan:

- impressions
- clicks
- service views
- provider views
- bookings
- completed orders
- cancellations
- favorites
- rebooking
- ratings
- maintenance actions
- product interactions
- recommendation feedback

---

# 114. Label / Target

Tergantung model, target dapat berupa:

```text
CLICK
BOOK
COMPLETE
REBOOK
SATISFYING_OUTCOME
```

Exact target dapat berbeda menurut use case.

---

# 115. Multiple Model Tasks

Jangan memaksa satu model untuk semua problem.

Dapat memiliki:

```text
Intent Model
Provider Ranking Model
Service Ranking Model
Rebooking Model
Maintenance Recommendation Model
Product Recommendation Model
```

---

# 116. Model Registry Separation

Setiap model dapat memiliki:

- model type
- version
- dataset
- metrics
- feature version
- deployment state

---

# 117. Feature Store

Structured features dapat mencakup:

```text
customer_service_frequency
provider_distance
provider_availability
asset_service_compatibility
days_since_last_service
maintenance_due_days
favorite_provider
price_fit
```

Actual feature schema dikunci saat implementation.

---

# 118. Feature Versioning

Feature definition harus dapat di-version.

Contoh:

```text
feature_set_v1
feature_set_v2
```

---

# 119. Dataset Versioning

Training dataset harus versioned.

Contoh:

```text
dataset_2026_09_v1
dataset_2026_10_v1
```

---

# 120. Reproducibility

Model training harus dapat direproduksi dari:

```text
code version
+
dataset version
+
feature version
+
configuration
+
model version
```

---

# 121. Training Environment

Training dapat dijalankan melalui managed compute/container/job infrastructure.

Exact vendor tidak dikunci dalam feature business spec.

---

# 122. Scheduled Training

Automated training dapat dijalankan:

```text
DAILY
WEEKLY
MONTHLY
```

sesuai model.

Tidak semua model perlu dilatih setiap hari.

---

# 123. Event-Triggered Training

Selain schedule, dapat trigger ketika:

```text
new data threshold
drift threshold
performance threshold
```

terpenuhi.

---

# 124. Training Data Quality

Before training:

```text
Schema Validation
Missing Data Check
Duplicate Check
Leakage Check
Outlier Check
Label Quality
```

---

# 125. Training Data Leakage

Data masa depan tidak boleh masuk sebagai feature untuk memprediksi masa lalu.

Contoh:

```text
Future rating
```

tidak boleh digunakan untuk ranking sebelum transaction terjadi.

---

# 126. Temporal Split

Recommendation datasets sebaiknya memperhatikan temporal split.

Tujuannya mengurangi unrealistic evaluation.

---

# 127. Offline Evaluation

Candidate model harus diuji offline sebelum deployment.

Metric dapat mencakup:

- Precision@K
- Recall@K
- NDCG@K
- MAP@K
- CTR prediction metrics

metric dipilih sesuai task.

---

# 128. Online Evaluation

Production dapat dievaluasi melalui:

- CTR
- booking conversion
- completion
- downstream satisfaction
- dismissal
- not relevant

---

# 129. Business Metric

Model tidak hanya dinilai dari click.

Relevant downstream metric lebih penting untuk service marketplace.

---

# 130. Long-Term Metric

Contoh:

```text
Recommendation
→ Completed Service
→ Repeat Booking
```

dapat menjadi long-term success signal.

---

# 131. Reward Hacking Prevention

Model tidak boleh dioptimalkan hanya untuk klik jika klik menghasilkan:

```text
low-quality booking
high cancellation
low satisfaction
```

---

# 132. Objective Balance

Recommendation objective dapat menyeimbangkan:

```text
Relevance
+
Conversion
+
Quality
+
Customer satisfaction
+
Business constraints
```

---

# 133. Model Objective ≠ Business Rule

Model objective membantu ranking.

Business rules tetap deterministic.

---

# 134. Safety Gate

Sebelum recommendation ditampilkan:

```text
Safety / Eligibility Filter
```

harus dijalankan.

---

# 135. Eligibility Gate

Provider/service harus eligible.

---

# 136. Availability Gate

Actionable recommendation harus current-valid.

---

# 137. Price Gate

Current price/quotation context harus valid.

---

# 138. Policy Gate

Platform policy harus tetap berlaku.

---

# 139. Model Failover

Jika model service down:

```text
ML unavailable
↓
Rule-based fallback
```

Servio tetap dapat menghasilkan recommendation dasar.

---

# 140. AI Provider Failover

Jika Gemini/LLM unavailable:

```text
AI Agent unavailable
↓
Normal app flow
+
rule/model recommendation
```

Core marketplace tidak boleh mati hanya karena LLM unavailable.

---

# 141. Recommendation Service

Recommendation dapat di-deploy sebagai dedicated service/API agar:

```text
Frontend
Backend
AI Agent
```

dapat mengakses recommendation engine.

---

# 142. Inference API

Konsep:

```text
POST /recommendations
```

Input:

- customer context
- intent
- location
- asset
- task type

Output:

- recommendation items
- reasons
- expiry
- model/rule reference

Exact endpoint adalah implementation decision.

---

# 143. Agent Tool API

Agent dapat memanggil internal recommendation API.

---

# 144. API Security

Internal recommendation API harus:

- authenticated
- authorized
- rate limited
- auditable

---

# 145. Recommendation Latency

Recommendation untuk interactive UI harus memiliki latency budget yang sesuai UX.

Exact target ditentukan engineering.

---

# 146. Async Recommendation

Recommendation yang tidak time-sensitive dapat dibuat asynchronous.

---

# 147. Batch Recommendation

Homepage/personalized content dapat diprecompute/batch.

---

# 148. Real-Time Recommendation

Situasi seperti:

- emergency
- availability
- current location
- current pricing

membutuhkan real-time context/validation.

---

# 149. Hybrid Serving

Arsitektur dapat menggunakan:

```text
Precomputed Candidates
+
Real-Time Filters
+
Real-Time Ranking
```

---

# 150. Recommendation Cache

Cache dapat digunakan untuk performance.

Tetapi transaction action tetap melakukan current validation.

---

# 151. Context Refresh

Context dapat diperbarui jika:

- user logs in
- location changes
- asset selected
- maintenance state changes
- order changes

---

# 152. Agent Session

AI Agent dapat memiliki session context.

Namun session context tidak menggantikan database source of truth.

---

# 153. Agent Memory

Long-term memory tidak boleh menyimpan arbitrary sensitive data.

Use structured customer preference/profile sesuai permission.

---

# 154. Agent Personalization

Agent dapat menggunakan:

- favorite
- history
- maintenance
- asset
- loyalty

sesuai permission.

---

# 155. Agent Explainability

Agent harus dapat menjelaskan:

```text
Why this service?
Why this provider?
Why now?
```

berdasarkan available context.

---

# 156. Agent Conversation Example

```text
User:
"Motor saya sudah lama nggak diservis."

Agent:
"Servis terakhir tercatat 5 bulan lalu.
Maintenance plan Anda menunjukkan servis berikutnya sudah due.
Saya menemukan 3 provider yang sesuai."

[Provider A]
[Provider B]
[Provider C]
```

---

# 157. Agent Action Example

```text
User:
"Yang A aja besok pagi."

Agent:
"Provider A tersedia besok pukul 09:00.
Estimasi saat ini Rp150.000.
Lanjut booking?"
```

Final action tetap Booking #2.

---

# 158. Agent Confirmation

Untuk transaction-impacting action:

```text
User confirmation
↓
Tool execution
↓
Backend validation
```

---

# 159. No Hallucinated Confirmation

Agent tidak boleh mengatakan:

```text
"Sudah dibooking."
```

jika backend belum berhasil.

---

# 160. Tool Result Grounding

Agent harus menggunakan actual tool result sebelum menyatakan:

- booked
- paid
- available
- completed
- eligible

---

# 161. Agent Error Recovery

Jika tool error:

```text
"Booking belum berhasil dibuat."
```

bukan success claim.

---

# 162. Agent Natural Language

Gemini dapat mengubah structured result menjadi bahasa yang mudah dipahami.

---

# 163. LLM Provider

Gemini API dapat digunakan sebagai LLM provider pada tahap awal.

Architecture sebaiknya tetap provider-agnostic sehingga bisa diganti jika diperlukan.

---

# 164. LLM ≠ Servio Model

```text
Gemini
= general language intelligence

Servio Recommendation Model
= learns Servio-specific interaction patterns
```

---

# 165. Servio Model Training

Model recommendation Servio dilatih menggunakan data Servio yang dikumpulkan melalui pipeline.

---

# 166. Automated From Day One

Mulai sejak MVP:

```text
Data Instrumentation
✅
Event Collection
✅
Feature Pipeline
✅
Dataset Versioning
✅
Training Job
✅
Evaluation Job
✅
Model Registry
✅
Inference API
✅
Monitoring
✅
Fallback
```

Model awal dapat sederhana, tetapi infrastructure sudah ada.

---

# 167. First Production Model

Contoh:

```text
Model v1
```

dapat menggunakan feature yang tersedia awal.

Ketika dataset berkembang:

```text
v2
v3
v4
...
```

dapat menggantikan model lama setelah lolos gate.

---

# 168. Automatic Retraining Rule

Concept:

```text
if
new_data >= threshold
OR
schedule == due
OR
drift_detected
OR
performance_declined
then
train_candidate()
```

---

# 169. Automatic Evaluation

```text
candidate_model
vs
production_model
```

dengan:

- offline metrics
- policy checks
- data quality
- latency
- business metrics jika tersedia

---

# 170. Automatic Promotion

Jika candidate memenuhi policy:

```text
candidate
→ staging
→ canary
→ production
```

Jika tidak:

```text
candidate
→ rejected
```

---

# 171. Human Override

Admin/ML engineer dapat memiliki emergency override untuk:

- disable model
- rollback
- freeze training
- block promotion

---

# 172. Model Freeze

Saat incident:

```text
AUTO TRAINING
→ PAUSED
```

Production model tetap digunakan.

---

# 173. Model Rollback

Rollback dapat dilakukan ke model valid sebelumnya.

---

# 174. Model Registry Metadata

Minimal:

```text
model_id
version
model_type
dataset_version
feature_version
training_run_id
metrics
status
created_at
deployed_at
```

---

# 175. Training Run

```text
training_run_id
status
started_at
completed_at
dataset_version
feature_version
parameters
metrics
artifact_reference
```

---

# 176. Model Artifact

Model artifact disimpan pada model storage/registry.

---

# 177. Training Logs

Training run harus memiliki logs untuk troubleshooting.

---

# 178. Data Lineage

System harus mampu menjawab:

```text
Model v7
↓
Dataset X
↓
Feature Set Y
↓
Training Run Z
```

---

# 179. Model Reproducibility

Agar v7 dapat direbuild bila diperlukan.

---

# 180. Privacy in Training

Training dataset tidak boleh memasukkan data personal yang tidak diperlukan.

---

# 181. PII Handling

Personal identifiers dapat:

- tokenize
- pseudonymize
- exclude

sesuai data architecture.

---

# 182. Location Privacy

Location features dapat diagregasi atau diproses dengan minimization bila precision tidak dibutuhkan.

---

# 183. Communication Data

Communication content tidak otomatis menjadi training data.

Penggunaan harus memiliki basis/privacy rule.

---

# 184. Proof/Photo Data

Raw proof media tidak otomatis masuk model training.

Structured metadata lebih cocok.

---

# 185. Payment Data

Payment sensitive data tidak boleh digunakan sembarangan.

Recommendation dapat menggunakan derived eligibility/context seperti payment state bila diperlukan.

---

# 186. Complaint Data

Complaint signals dapat menjadi model feature dengan careful policy.

---

# 187. Rating Data

Rating dapat menjadi quality signal.

---

# 188. Loyalty Data

Loyalty dapat menjadi preference/context signal.

Jangan menggunakan points sebagai proxy kualitas customer/provider tanpa rationale.

---

# 189. Favorite Data

Favorite menjadi explicit preference signal.

---

# 190. Rebooking Data

Rebooking menjadi strong repeat intent signal.

---

# 191. Maintenance Data

Maintenance due menjadi strong need/context signal.

---

# 192. Asset Data

Asset type/model/compatibility menjadi service eligibility/context signal.

---

# 193. History Data

History menjadi behavioral/technical context.

---

# 194. Feedback Loop Quality

Training data harus membedakan:

```text
No click
```

dengan:

```text
Explicit Not Relevant
```

karena keduanya tidak selalu berarti sama.

---

# 195. Missing Feedback

No feedback bukan automatic negative label.

---

# 196. Implicit Negative

Signals seperti:

```text
impression
→ no click
```

dapat menjadi weak signal, bukan definitive negative.

---

# 197. Positive Signal

Signals seperti:

```text
recommendation
→ click
→ booking
→ completion
```

lebih kuat daripada click saja.

---

# 198. Downstream Signal

Completion, rebooking, rating, dan satisfaction dapat menjadi stronger labels sesuai model objective.

---

# 199. Training Label Delay

Beberapa outcome baru diketahui setelah beberapa hari/minggu.

Training pipeline harus menangani delayed labels.

---

# 200. Training Window

Dataset harus menggunakan window waktu yang jelas.

---

# 201. Evaluation Window

Evaluation sebaiknya menggunakan data yang sesuai dan tidak bocor ke training.

---

# 202. Model Freshness

Model memiliki concept:

```text
trained_at
data_cutoff
```

---

# 203. Data Freshness

Real-time recommendation tidak harus menunggu model retrain.

Current availability/price tetap dari real-time data.

---

# 204. Model + Rules Hybrid

Final recommendation:

```text
ML / Ranking
+
Business Rules
+
Real-Time Validation
```

---

# 205. Recommendation Output

Conceptual output:

```json
{
  "type": "SERVICE",
  "target_id": "service_id",
  "rank": 1,
  "reason_codes": [
    "MAINTENANCE_DUE",
    "PREVIOUSLY_USED",
    "AVAILABLE"
  ],
  "expires_at": "..."
}
```

Actual schema ditentukan implementation.

---

# 206. Recommendation Request

Conceptual:

```json
{
  "customer_id": "...",
  "intent": "...",
  "asset_id": "...",
  "location": "...",
  "context": "homepage"
}
```

Only necessary data should be sent.

---

# 207. Recommendation Event

Events:

```text
RECOMMENDATION_GENERATED
RECOMMENDATION_DISPLAYED
RECOMMENDATION_VIEWED
RECOMMENDATION_CLICKED
RECOMMENDATION_DISMISSED
RECOMMENDATION_BOOKED
RECOMMENDATION_CONVERTED
```

---

# 208. Recommendation Feedback

Types:

```text
NOT_RELEVANT
NOT_INTERESTED
HIDDEN
DISMISSED
```

---

# 209. Attribution

System can connect:

```text
Recommendation
↓
Click
↓
Booking
↓
Order
↓
Completion
```

for analytics and training.

---

# 210. Attribution ≠ Causality

A recommendation being followed does not by itself prove causal impact.

---

# 211. Recommendation Analytics

Metrics:

- impression
- view
- click-through
- booking conversion
- completion conversion
- repeat conversion
- dismissal
- not relevant
- average latency

---

# 212. Model Analytics

Metrics:

- offline ranking metrics
- online conversion
- relevance
- latency
- stability
- drift
- failure rate

---

# 213. Recommendation Diversity Metric

Monitor whether a small set of providers/services dominate all recommendations.

---

# 214. Provider Exposure

New/smaller providers should receive fair opportunity subject to actual eligibility and quality rules.

---

# 215. No Guaranteed Exposure

Fair exposure does not mean every provider receives equal ranking.

---

# 216. Recommendation Quality

"Better model" should not be defined by one metric only.

---

# 217. Multi-Objective Evaluation

Candidate model should satisfy:

```text
Technical
+
Relevance
+
Business
+
Safety
+
Latency
```

---

# 218. Business Metric Guardrails

Example:

```text
CTR improves
BUT
cancellation rate increases sharply
```

Candidate may fail guardrail.

---

# 219. Customer Experience Guardrail

Not relevant rate should not increase beyond configured limit.

---

# 220. Safety Guardrail

Model must never bypass hard safety eligibility.

---

# 221. Latency Guardrail

Model must remain within interactive latency target.

---

# 222. Availability Guardrail

Recommendation service failure should fallback safely.

---

# 223. LLM Cost Guardrail

AI Agent usage should have token/cost monitoring and fallback.

---

# 224. LLM Rate Limit

System should handle API quota/rate limits without taking down the marketplace.

---

# 225. LLM Fallback

If Gemini fails:

```text
Rule / ML recommendation
+
normal UI
```

remains available.

---

# 226. LLM Response Validation

Structured LLM output must be validated by backend schema.

---

# 227. Prompt Versioning

Prompts used by AI Agent should be versioned.

---

# 228. Agent Policy

Agent should have explicit system/business policy:

```text
Can:
- explain
- search
- recommend
- assist

Cannot:
- invent
- bypass
- silently transact
```

---

# 229. Tool Authorization

Agent tools must respect customer permissions.

---

# 230. Write Tool Safety

Write tools require:

- authentication
- authorization
- validation
- idempotency
- confirmation where needed

---

# 231. Agent Audit

Record important agent actions:

```text
tool_called
tool_result
action_requested
action_confirmed
action_completed
```

Avoid storing unnecessary sensitive content.

---

# 232. Agent ≠ Human Replacement

Agent is assistive.

Customer remains able to use normal UI.

---

# 233. Manual Flow Always Exists

Customer can bypass Agent:

```text
Homepage
↓
Search
↓
Book
```

---

# 234. Recommendation Opt-Out

Platform dapat menyediakan personalized recommendation preference.

---

# 235. Privacy Preference

Customer dapat memiliki settings sesuai privacy architecture.

---

# 236. No Dark Pattern

Recommendation tidak boleh memaksa customer melakukan action hanya karena recommendation muncul.

---

# 237. Sponsored Transparency

Paid recommendation harus jelas.

---

# 238. Customer Agency

Customer memilih.

System merekomendasikan.

Backend memvalidasi.

---

# 239. Security

Recommendation service:

- authenticated
- authorized
- rate-limited
- monitored
- audited

---

# 240. Final Core Architecture

```text
                         SERVIO DATA
                           #1–#17
                              │
                              ▼
                     EVENT / DATA PIPELINE
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
              FEATURE STORE       TRAINING DATA
                    │                   │
                    │                   ▼
                    │             AUTO TRAINING
                    │                   │
                    │                   ▼
                    │             EVALUATION
                    │                   │
                    │             ┌─────┴─────┐
                    │             ▼           ▼
                    │           PASS        FAIL
                    │             │           │
                    │             ▼           ▼
                    │          REGISTRY     REJECT
                    │             │
                    │             ▼
                    │          CANARY
                    │             │
                    │             ▼
                    │        PRODUCTION MODEL
                    │
                    └───────────┬────────────
                                ▼
                       RECOMMENDATION ENGINE
                                │
                  ┌─────────────┼─────────────┐
                  ▼             ▼             ▼
               RULES          ML            LLM
                  │             │             │
                  └─────────────┼─────────────┘
                                ▼
                        FINAL RECOMMENDATION
                                │
                                ▼
                            AI AGENT
                                │
                                ▼
                              USER
                                │
                                ▼
                         EXISTING SERVIO FLOW
```

---

# 241. AI Agent Architecture

```text
USER
 ↓
AI AGENT
 ↓
Intent Understanding
 ↓
Context Retrieval
 ↓
Tool Selection
 ↓
Recommendation Engine
 ↓
Current Validation
 ↓
Explanation
 ↓
User Confirmation
 ↓
Servio Action
```

---

# 242. Recommendation Engine Architecture

```text
Context
↓
Candidate Generation
↓
Hard Filter
↓
Feature Enrichment
↓
Ranking
↓
Diversity
↓
Business Policy
↓
Explanation
↓
Recommendation
```

---

# 243. Automated Learning Architecture

```text
USER INTERACTION
      ↓
EVENT TRACKING
      ↓
RAW DATA
      ↓
DATA VALIDATION
      ↓
FEATURE ENGINEERING
      ↓
TRAINING DATASET
      ↓
AUTOMATED TRAINING
      ↓
OFFLINE EVALUATION
      ↓
MODEL REGISTRY
      ↓
CANARY / ONLINE EVALUATION
      ↓
PROMOTION
      ↓
PRODUCTION
      ↓
MONITORING
      ↓
RETRAIN / ROLLBACK
```

---

# 244. End-to-End Example — AC

```text
Customer:
"AC kamar saya nyala tapi nggak dingin."

↓
Gemini / Intent Layer

↓
AC & Cooling
Possible:
Inspection / Repair

↓
Asset #15
AC Daikin 1 PK

↓
History #14
Previous AC Cleaning

↓
Maintenance #16
Overdue

↓
Favorite #17
Provider A

↓
Current Availability
Provider A available tomorrow

↓
Recommendation Engine

↓
Recommendation:
"AC Inspection with Provider A"

↓
AI Agent explains why

↓
Customer:
"Book."

↓
Booking #2
↓
Order #3
```

---

# 245. End-to-End Example — Automated Learning

```text
10.000 recommendations
↓
7.000 viewed
↓
2.000 clicked
↓
800 booked
↓
650 completed
↓
400 rebooked
↓
Feedback collected
↓
Dataset grows
↓
Training threshold reached
↓
Automatic training
↓
Model v2
↓
Evaluation
↓
Pass
↓
Canary
↓
Production
```

---

# 246. End-to-End Example — Model Failure

```text
Production v3
↓
v4 trained
↓
Offline pass
↓
Canary 10%
↓
Cancellation rate rises
↓
Guardrail fails
↓
Stop rollout
↓
Rollback to v3
```

---

# 247. End-to-End Example — LLM Failure

```text
User asks recommendation
↓
Gemini unavailable
↓
AI Agent unavailable
↓
Rule/ML Recommendation still available
↓
Normal UI
```

Servio marketplace tetap berjalan.

---

# 248. End-to-End Example — Model Failure

```text
ML inference unavailable
↓
Rule-based fallback
↓
Recommendation available
```

---

# 249. Training From Day One

Final strategic decision:

```text
DAY ONE
✅ DATA INSTRUMENTATION
✅ EVENT TRACKING
✅ TRAINING PIPELINE
✅ MODEL REGISTRY
✅ AUTOMATED EVALUATION
✅ FALLBACK
✅ MONITORING

MODEL MATURITY
→ grows with data
```

Jadi tidak perlu menunggu data "sempurna" untuk mulai membangun infrastructure.

---

# 250. What Data #1–#17 Mean for #18

```text
#1 Discovery
→ search/view behavior

#2 Booking
→ booking intent

#3 Order
→ transaction outcome

#4 Pricing
→ price context

#5 Communication
→ interaction context, when permitted

#6 Payment
→ payment/eligibility state

#7 Execution
→ actual service execution outcome

#8 Tracking
→ operational context

#9 Proof
→ evidence/structured outcome

#10 Completion
→ service completion

#11 Rating
→ customer feedback

#12 Complaint
→ quality/risk signals

#13 Warranty
→ service protection context

#14 History
→ long-term service context

#15 Asset
→ what is being serviced

#16 Maintenance
→ what is due

#17 Rebooking/Favorite/Loyalty
→ explicit/implicit preference and retention behavior
```

---

# 251. Training Principle

Data #1–#17 adalah **source data**.

Feature #18 membangun:

```text
Feature Engineering
+
Model
+
Recommendation
+
Agent
```

---

# 252. Gemini Role

Gemini dapat menangani:

- natural language understanding
- intent extraction
- conversational explanation
- summarization
- tool orchestration
- conversational recommendation assistant

---

# 253. Servio ML Role

Servio-specific ML dapat menangani:

- ranking
- personalization
- candidate relevance
- repeat behavior prediction
- service/provider ranking
- recommendation optimization

---

# 254. Rule Engine Role

Rule engine menangani:

- eligibility
- availability constraints
- service compatibility
- safety
- policy
- business restrictions
- transaction validity

---

# 255. Database Role

Database/source systems menangani:

- actual asset
- actual service
- actual provider
- actual price
- actual booking
- actual order
- actual payment
- actual maintenance
- actual loyalty
- actual history

---

# 256. Final Intelligence Stack

```text
┌──────────────────────────────┐
│         AI AGENT             │
│ Gemini / LLM                 │
│ Understand + Orchestrate     │
└───────────────┬──────────────┘
                │
┌───────────────▼──────────────┐
│    RECOMMENDATION ENGINE     │
│ Candidate + Ranking + Reason │
└───────────────┬──────────────┘
                │
        ┌───────┼───────┐
        ▼       ▼       ▼
      RULES     ML      DATA
```

---

# 257. Final Boundary

```text
#18 SMART RECOMMENDATION
= apa yang paling relevan

#18 AI AGENT
= bagaimana user dibantu memahami + bertindak

#1–#17
= sumber context/data

#2/#3/#4/#6
= transaction engines

#19
= product integration
```

---

# 258. Non-Goals

Feature #18 bukan:

- database replacement
- booking engine
- order engine
- payment engine
- pricing engine
- maintenance engine
- warranty decision engine
- complaint decision engine
- rating engine
- product commerce engine
- autonomous transaction authority

---

# 259. MUST-LOCK DECISIONS

## Architecture

1. Feature #18 terdiri dari Recommendation Engine dan AI Agent.
2. Recommendation Engine berbeda dari AI Agent.
3. Recommendation berbeda dari Search.
4. Recommendation berbeda dari Discovery.
5. AI Agent bukan source of truth Servio.
6. Gemini dapat digunakan sebagai LLM provider.
7. Gemini bukan source of truth Servio.
8. Servio ML model dapat belajar dari data Servio.
9. Automated training pipeline dibangun sejak day one.
10. Model awal boleh sederhana.
11. Infrastructure ML tetap dibuat scalable sejak awal.
12. Training otomatis tidak berarti unrestricted self-learning.
13. Training berjalan berdasarkan pipeline dan policy.
14. Candidate model harus dievaluasi.
15. Model tidak boleh dipromosikan hanya karena training berhasil.
16. Model Registry digunakan.
17. Model versioning digunakan.
18. Dataset versioning digunakan.
19. Feature versioning digunakan.
20. Model rollback harus tersedia.

## Recommendation

21. Recommendation menggunakan context dari #1–#17.
22. Tidak semua context wajib dipakai setiap request.
23. Current user intent menjadi signal penting.
24. Asset menjadi signal kuat untuk asset-specific recommendation.
25. Maintenance due menjadi signal kuat.
26. History menjadi contextual signal.
27. Favorite menjadi explicit preference signal.
28. Rebooking menjadi repeat-intent signal.
29. Loyalty menjadi reward/benefit context.
30. Current availability harus divalidasi.
31. Current pricing harus divalidasi.
32. Current service configuration harus divalidasi.
33. Hard business constraints harus diterapkan sebelum ranking.
34. AI/ML tidak boleh bypass hard constraints.
35. Compatibility harus dipertimbangkan.
36. Service mode harus dipertimbangkan.
37. Booking type harus dipertimbangkan.
38. Provider coverage harus dipertimbangkan.
39. Safety requirement harus dipertimbangkan.
40. Recommendation bukan booking guarantee.
41. Recommendation bukan diagnosis.
42. Recommendation bukan warranty decision.
43. Recommendation bukan payment decision.
44. Recommendation bukan complaint decision.
45. Recommendation bukan completion decision.
46. Recommendation dapat menyediakan actionable CTA.
47. CTA tetap masuk ke existing Servio flow.
48. Recommendation dapat memiliki reason codes.
49. Reason codes harus factual/traceable.
50. Recommendation dapat memiliki expiration.
51. Recommendation dapat menggunakan diversity.
52. Popularity dapat menjadi signal.
53. Popular ≠ Best.
54. New provider dapat memperoleh controlled exposure.
55. New customer menggunakan cold-start strategy.
56. Fake personalization tidak diperbolehkan.
57. Sponsored recommendation harus transparent.
58. Customer dapat memberi recommendation feedback.
59. Feedback tidak sama dengan rating.
60. Feedback tidak sama dengan complaint.

## AI Agent

61. AI Agent dapat memahami natural language.
62. AI Agent dapat menggunakan Gemini/LLM.
63. AI Agent dapat memanggil internal tools.
64. Tool result harus menjadi grounding.
65. Structured LLM output harus divalidasi.
66. AI tidak boleh mengarang availability.
67. AI tidak boleh mengarang price.
68. AI tidak boleh mengarang provider.
69. AI tidak boleh mengarang booking confirmation.
70. AI tidak boleh membuat payment confirmation tanpa backend result.
71. AI tidak boleh bypass booking policy.
72. AI tidak boleh bypass payment policy.
73. AI tidak boleh bypass safety.
74. AI tidak boleh bypass warranty policy.
75. AI tidak boleh mengubah historical transaction sembarangan.
76. AI tidak boleh silent transaction.
77. Transaction-impacting action dapat membutuhkan confirmation.
78. Write tools harus authenticated.
79. Write tools harus authorized.
80. Write tools harus idempotent.
81. Agent failure tidak boleh mematikan core marketplace.
82. Gemini outage harus memiliki fallback.
83. Agent session bukan database source of truth.
84. Agent memory tidak boleh menyimpan arbitrary sensitive data.
85. Agent access mengikuti privacy permissions.
86. AI explanation harus grounded.
87. AI confidence bukan truth.
88. AI recommendation bukan mandatory action.
89. Customer tetap dapat menggunakan normal UI.
90. Agent adalah assistive layer.

## Machine Learning

91. Training dataset berasal dari instrumented Servio data.
92. Data #1–#17 dapat menjadi source training features.
93. Tidak semua source harus digunakan dalam semua model.
94. Model dapat dibagi berdasarkan task.
95. Intent model dapat terpisah.
96. Provider ranking model dapat terpisah.
97. Service ranking model dapat terpisah.
98. Rebooking model dapat terpisah.
99. Product recommendation model dapat terpisah.
100. Maintenance recommendation model dapat terpisah.
101. Model objective tidak harus sama untuk semua model.
102. Model target/label harus ditentukan per use case.
103. No-click bukan automatic negative label.
104. Explicit not relevant adalah stronger negative signal.
105. Completion dapat menjadi stronger downstream signal.
106. Rebooking dapat menjadi strong repeat signal.
107. Delayed labels harus ditangani.
108. Temporal leakage harus dicegah.
109. Training/evaluation split harus valid.
110. Dataset harus versioned.
111. Feature set harus versioned.
112. Training code/configuration harus reproducible.
113. Model metadata harus disimpan.
114. Training run harus dapat ditelusuri.
115. Model lineage harus tersedia.
116. Offline evaluation harus dilakukan.
117. Online monitoring harus dilakukan.
118. Model performance harus dipantau.
119. Data drift harus dipantau.
120. Concept drift harus dipantau.
121. Model degradation dapat memicu retraining.
122. Training dapat dipicu oleh schedule.
123. Training dapat dipicu oleh data threshold.
124. Training dapat dipicu oleh drift.
125. Training dapat dipicu oleh performance threshold.
126. Retraining tidak harus dilakukan setiap saat.
127. Model candidate harus dibandingkan dengan production.
128. Candidate model dapat di-canary.
129. Candidate model dapat di-rejected.
130. Production model dapat di-rollback.

## Data / Privacy

131. Recommendation data harus menggunakan data minimization.
132. Training data harus menghindari unnecessary PII.
133. PII dapat dipseudonymize/tokenize sesuai architecture.
134. Location data harus diperlakukan dengan privacy control.
135. Communication content tidak otomatis menjadi training data.
136. Raw proof media tidak otomatis menjadi training data.
137. Sensitive payment data tidak digunakan sembarangan.
138. Loyalty data hanya digunakan bila relevant.
139. History data digunakan sesuai authorization.
140. Asset data digunakan sesuai permission.
141. Customer behavior data harus memiliki governance.
142. Recommendation logs harus menghindari unnecessary personal data.
143. AI Agent context harus dibatasi sesuai task.
144. Training data access harus controlled.
145. Model artifacts harus secured.
146. Internal recommendation APIs harus authenticated.
147. Internal recommendation APIs harus authorized.
148. AI/ML infrastructure harus monitored.
149. Critical model changes harus auditable.
150. Model deployment harus auditable.

## Integration

151. Recommendation action menggunakan Booking #2.
152. Recommendation action menghasilkan Order #3 bila applicable.
153. Pricing menggunakan #4.
154. Communication menggunakan #5.
155. Payment menggunakan #6.
156. Execution menggunakan #7.
157. Tracking menggunakan #8 bila applicable.
158. Proof menggunakan #9.
159. Completion menggunakan #10.
160. Rating menggunakan #11.
161. Complaint menggunakan #12.
162. Warranty menggunakan #13.
163. History menggunakan #14.
164. Asset menggunakan #15.
165. Maintenance menggunakan #16.
166. Rebooking/Favorite/Loyalty menggunakan #17.
167. Product integration menggunakan #19.
168. Feature #18 tidak membuat duplicate transaction engine.
169. Feature #18 tidak membuat duplicate service engine.
170. Feature #18 tidak membuat duplicate payment engine.

## Reliability

171. Recommendation service harus memiliki fallback.
172. ML inference failure harus fallback.
173. LLM failure harus fallback.
174. Recommendation latency harus dimonitor.
175. API error harus dimonitor.
176. Model deployment harus dapat dihentikan.
177. Auto training dapat di-pause.
178. Production model tetap aktif ketika candidate gagal.
179. Canary deployment dapat dihentikan.
180. Rollback harus tersedia.
181. Model promotion harus gate-based.
182. Model training harus idempotent/reproducible sesuai job architecture.
183. Recommendation events harus traceable.
184. Recommendation attribution harus traceable.
185. Duplicate recommendation event perlu dikendalikan.
186. Double action pada Agent harus dicegah.
187. Tool actions harus idempotent.
188. Current state harus divalidasi sebelum transaction.
189. Stale recommendations harus ditangani.
190. Archived targets harus tidak menghasilkan broken actionable links.

## Product Principles

191. Recommendation harus membantu customer.
192. Recommendation tidak boleh memaksa.
193. Customer tetap menjadi pengambil keputusan transaksi.
194. AI membantu, bukan menggantikan business authority.
195. Business rules mengontrol eligibility.
196. Database mengontrol actual state.
197. ML mengontrol relevance/ranking signal.
198. LLM mengontrol language/orchestration assistance.
199. Automated learning memperbaiki model melalui measured feedback.
200. **Feature #18 merupakan intelligent layer Servio yang dibangun sejak day one dan dirancang untuk berkembang dari rule-based recommendation menjadi automated ML recommendation + AI Agent tanpa mengganti core architecture.**

---

# 260. Final Business Flow — Recommendation

```text
USER CONTEXT
    ↓
INTENT / CONTEXT UNDERSTANDING
    ↓
CANDIDATE GENERATION
    ↓
HARD FILTER
    ↓
FEATURE ENRICHMENT
    ↓
ML / RANKING
    ↓
DIVERSITY
    ↓
BUSINESS POLICY
    ↓
EXPLANATION
    ↓
RECOMMENDATION
    ↓
USER ACTION
    ↓
REAL-TIME VALIDATION
    ↓
SERVIO EXISTING FLOW
```

---

# 261. Final Business Flow — AI Agent

```text
USER
 ↓
AI AGENT
 ↓
UNDERSTAND INTENT
 ↓
GET RELEVANT CONTEXT
 ↓
CALL INTERNAL TOOLS
 ↓
CALL RECOMMENDATION ENGINE
 ↓
CURRENT VALIDATION
 ↓
EXPLAIN OPTIONS
 ↓
CUSTOMER CONFIRMATION
 ↓
ACTION
 ↓
BACKEND RESULT
 ↓
AI RESPONSE
```

---

# 262. Final Business Flow — Automated Learning

```text
USER INTERACTION
       ↓
EVENT TRACKING
       ↓
DATA PIPELINE
       ↓
DATA QUALITY
       ↓
FEATURE ENGINEERING
       ↓
DATASET VERSION
       ↓
AUTOMATED TRAINING
       ↓
OFFLINE EVALUATION
       ↓
MODEL REGISTRY
       ↓
CANARY
       ↓
ONLINE MONITORING
       ↓
PROMOTE
       │
       ├── PASS → PRODUCTION
       │
       └── FAIL → REJECT / ROLLBACK
                         ↓
                   EXISTING MODEL
```

---

# 263. Final Servio Intelligence Loop

```text
              SERVIO TRANSACTIONS
                     │
                     ▼
                USER BEHAVIOR
                     │
                     ▼
              RECOMMENDATION
                     │
                     ▼
                 USER ACTION
                     │
                     ▼
                 OUTCOME
                     │
                     ▼
              FEEDBACK / LABEL
                     │
                     ▼
              TRAINING DATA
                     │
                     ▼
              AUTOMATED TRAINING
                     │
                     ▼
              MODEL EVALUATION
                     │
                     ▼
              BETTER MODEL
                     │
                     └───────────────┐
                                     ▼
                              NEXT RECOMMENDATION
```

---

# 264. Final Technology Concept

Conceptual stack:

```text
Frontend
↓
Servio Backend
↓
Recommendation API
↓
Rule Engine
↓
ML Inference
↓
AI Agent / Gemini
↓
Servio Data
```

ML platform:

```text
Event Tracking
↓
Data Pipeline
↓
Feature Store / Feature Layer
↓
Training Jobs
↓
Evaluation
↓
Model Registry
↓
Deployment
↓
Monitoring
```

Exact cloud/vendor/ML framework adalah implementation decision dan tidak dikunci oleh business specification ini.

---

# 265. Final Model Lifecycle

```text
DATA COLLECTION
      ↓
TRAIN
      ↓
VALIDATE
      ↓
REGISTER
      ↓
STAGE
      ↓
CANARY
      ↓
PRODUCTION
      ↓
MONITOR
      ↓
RETRAIN
      ↓
NEW VERSION
```

---

# 266. Final Recommendation Lifecycle

```text
GENERATED
↓
DISPLAYED
↓
VIEWED
↓
CLICKED
↓
ACTION_STARTED
↓
CONVERTED
```

Alternative:

```text
DISPLAYED
↓
DISMISSED
```

Possible state:

```text
EXPIRED
SUPPRESSED
```

---

# 267. Final Model Lifecycle Status

```text
CANDIDATE
STAGING
CANARY
PRODUCTION
RETIRED
REJECTED
```

---

# 268. Final Recommendation Status

```text
ACTIVE
EXPIRED
DISMISSED
CONVERTED
SUPPRESSED
```

---

# 269. Final Data Entities

Conceptual entities:

```text
recommendation_requests
recommendations
recommendation_items
recommendation_events
recommendation_feedback
recommendation_rules
recommendation_models
model_versions
training_runs
training_datasets
feature_definitions
```

Supporting infrastructure entities may differ during implementation.

---

# 270. recommendation_requests

```text
recommendation_request_id
customer_id
context_type
context_reference_id
intent_context
location_context
created_at
```

---

# 271. recommendations

```text
recommendation_id
request_id
recommendation_type
target_type
target_id
rank
reason_codes
status
expires_at
model_version
rule_version
created_at
```

---

# 272. recommendation_events

```text
event_id
recommendation_id
event_type
actor_id
created_at
metadata
```

---

# 273. recommendation_feedback

```text
feedback_id
recommendation_id
customer_id
feedback_type
reason
created_at
```

---

# 274. recommendation_rules

```text
rule_id
name
priority
scope
conditions
actions
version
status
```

---

# 275. recommendation_models

```text
model_id
name
model_type
version
dataset_version
feature_version
status
metrics
created_at
deployed_at
```

---

# 276. training_runs

```text
training_run_id
model_id
dataset_version
feature_version
status
started_at
completed_at
configuration
metrics
artifact_reference
```

---

# 277. training_datasets

```text
dataset_id
version
data_cutoff
schema_version
feature_version
quality_status
created_at
```

---

# 278. feature_definitions

```text
feature_id
name
version
source
definition
data_type
status
```

---

# 279. Model Lineage

Minimal lineage:

```text
Model
↓
Training Run
↓
Dataset Version
↓
Feature Version
↓
Source Data
```

---

# 280. Final Fallback Architecture

```text
            RECOMMENDATION REQUEST
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
       ML Model          Rule Engine
          │                   │
          └─────────┬─────────┘
                    ▼
             Recommendation
```

Jika ML gagal:

```text
ML FAILURE
↓
RULE FALLBACK
```

Jika Gemini gagal:

```text
GEMINI FAILURE
↓
NORMAL UI + RULE/ML RECOMMENDATION
```

---

# 281. Final MVP

Walaupun automated ML pipeline sudah tersedia sejak awal, MVP harus tetap realistis.

```text
✅ Recommendation API
✅ Rule Engine
✅ Basic Ranking
✅ Event Tracking
✅ Training Dataset Pipeline
✅ Automated Training Job
✅ Evaluation Job
✅ Model Registry
✅ Model Versioning
✅ Fallback
✅ Monitoring
✅ Gemini AI Agent
✅ Intent Understanding
✅ Basic Tool Calling
✅ Recommendation from Asset
✅ Recommendation from Maintenance
✅ Recommendation from History
✅ Recommendation from Favorite/Rebooking
```

---

# 282. Scale-Up

```text
🚀 Learning-to-Rank
🚀 Multiple Specialized Models
🚀 Advanced Personalization
🚀 Real-Time Ranking
🚀 Contextual Ranking
🚀 Deep Semantic Matching
🚀 Advanced AI Agent
🚀 Voice Interaction
🚀 Predictive Maintenance Recommendation
🚀 Product Recommendation
🚀 Advanced Fraud/Risk Signals
🚀 Canary Auto-Deployment
🚀 Advanced Drift Detection
🚀 Multi-Objective Optimization
```

---

# 283. Final Strategic Decision

Servio **tidak menunggu data banyak untuk baru memikirkan AI/ML infrastructure**.

Yang dilakukan:

```text
DAY ONE
↓
Instrumentation
↓
Data Collection
↓
Training Pipeline
↓
Simple Model
↓
Evaluation
↓
Production

DATA GROWS
↓
Retraining
↓
Model Improves
↓
Production Updates
```

---

# 284. Final Terminology

Terminology yang digunakan untuk roadmap:

> **#18 Smart Recommendation & AI Agent**

Subdomain:

```text
1. Context Engine
2. Candidate Generation
3. Rule Engine
4. Ranking / ML
5. Recommendation API
6. Explanation Layer
7. AI Agent
8. Tool Calling
9. Training Pipeline
10. Model Registry
11. Model Evaluation
12. Monitoring & Rollback
13. Feedback Loop
```

---

# 285. FINAL LOCK STATUS

```text
FEATURE #18
SMART RECOMMENDATION & AI AGENT

STATUS:
████████████████████ LOCKED

ARCHITECTURE:
✅ Rule Engine
✅ Recommendation Engine
✅ ML Ranking Layer
✅ AI / LLM Layer
✅ AI Agent
✅ Data Pipeline
✅ Automated Training
✅ Automated Evaluation
✅ Model Registry
✅ Canary / Deployment
✅ Monitoring
✅ Rollback
✅ Feedback Loop

LLM:
Gemini API dapat digunakan sebagai
LLM / Agent provider.

ML:
Servio memiliki pipeline sendiri untuk
training model recommendation
berdasarkan data Servio.
```

---

# 286. FINAL ARCHITECTURE STATEMENT

> **Feature #18 merupakan intelligent layer Servio yang menggabungkan structured business rules, Servio-specific machine learning, dan AI/LLM assistance. Sejak hari pertama, sistem sudah mengumpulkan data yang diperlukan dan memiliki automated training/evaluation pipeline sehingga model dapat berkembang seiring bertambahnya data. Gemini digunakan sebagai LLM/Agent layer bila diperlukan, sementara database dan business rules Servio tetap menjadi source of truth.**

---

# 287. FINAL SERVIO INTELLIGENCE

```text
                    SERVIO #1–#17
                          │
                          ▼
                   DATA FOUNDATION
                          │
                          ▼
                   LEARNING SYSTEM
                          │
               ┌──────────┴──────────┐
               ▼                     ▼
          SERVIO ML              GEMINI / LLM
               │                     │
               ▼                     ▼
        RECOMMENDATION           AI AGENT
               │                     │
               └──────────┬──────────┘
                          ▼
                     SERVIO USER
                          │
                          ▼
                     NEW ACTION
                          │
                          ▼
                    NEW DATA
                          │
                          └──────────────►
```

> **Feature #18 resmi menjadi pusat intelligence Servio: data dari #1–#17 menjadi foundation, Recommendation Engine menjadi decision-support layer, ML menjadi learning layer, dan AI Agent/Gemini menjadi conversational/orchestration layer. Automated training dan evaluation disiapkan sejak awal agar Servio dapat berkembang secara data-driven tanpa harus membangun ulang arsitektur AI ketika jumlah pengguna dan transaksi sudah besar.**
