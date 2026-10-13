# SERVIO — FEATURE #17
# REBOOKING / FAVORITE / LOYALTY
## FINAL BUSINESS FLOW & FUNCTIONAL SPECIFICATION — LOCKED

> **Status: LOCKED**
>
> Feature #17 merupakan bagian dari roadmap utama Service/Jasa Servio.
>
> Fokus utama: meningkatkan repeat usage melalui shortcut booking ulang, penyimpanan provider/service favorit, serta loyalty reward yang memiliki aturan bisnis, ledger, redemption, dan audit yang jelas.

---

# 1. Posisi Feature

Feature #17 berada setelah:

- #14 Service History
- #15 Asset
- #16 Maintenance & Reminder

dan sebelum:

- #18 Smart Recommendation
- #19 Service + Product Integration

Feature #17 merupakan domain **customer retention**.

---

# 2. Definisi Tiga Komponen

```text
REBOOKING
= "Saya mau pesan jasa yang sama lagi."

FAVORITE
= "Saya mau menyimpan provider/service yang saya suka."

LOYALTY
= "Saya mendapat benefit/reward karena melakukan aktivitas eligible di Servio."
```

Ketiganya saling terhubung tetapi merupakan domain yang berbeda.

---

# 3. Tujuan Utama

Feature #17 bertujuan agar customer:

1. tidak perlu mengulang discovery dari awal
2. dapat booking ulang secara cepat
3. dapat menyimpan provider/service yang disukai
4. memiliki riwayat preference
5. mendapatkan loyalty benefit yang transparan
6. terdorong melakukan repeat transaction tanpa manipulasi
7. dapat menggunakan konteks maintenance dan history untuk repeat booking

---

# 4. Core Retention Loop

```text
Completed Order
      ↓
History
      ↓
Favorite / Rebooking
      ↓
Repeat Booking
      ↓
Completed Order
      ↓
Loyalty
      ↓
Next Repeat
```

---

# 5. Rebooking

Rebooking adalah shortcut untuk melakukan service kembali berdasarkan historical transaction/service.

Contoh:

```text
AC Cleaning
Provider A
Last booked:
3 months ago

[BOOK AGAIN]
```

---

# 6. Rebooking ≠ Booking

```text
BOOKING
= membuat appointment baru

REBOOKING
= shortcut menuju appointment baru
  menggunakan historical context
```

Rebooking pada akhirnya tetap menghasilkan booking baru.

---

# 7. Rebooking ≠ Repeat Search

Repeat Search:

```text
Search Service
↓
Search Result
↓
Select Provider
```

Rebooking:

```text
Past Order
↓
Book Again
↓
Validate Current Conditions
↓
Booking
```

---

# 8. Rebooking ≠ Maintenance

```text
MAINTENANCE
= menentukan kapan asset perlu dirawat

REBOOKING
= mempermudah pemesanan ulang
```

Maintenance #16 dapat menghasilkan shortcut rebooking, tetapi engine keduanya tetap berbeda.

---

# 9. Rebooking Source

Rebooking dapat berasal dari:

- completed orders
- service history
- maintenance due
- favorite provider
- favorite service
- repeat service context

---

# 10. Primary Rebooking Eligibility

Untuk MVP, sumber utama:

```text
COMPLETED ORDER
```

Order yang belum selesai bukan successful service history.

---

# 11. Book Again CTA

Setelah order selesai:

```text
Order Completed
↓
[BOOK AGAIN]
```

CTA dapat muncul pada:

- order detail
- service history
- customer dashboard
- maintenance detail
- favorites

---

# 12. One-Tap Rebooking

System harus meminimalkan input ulang dengan memprefill data yang relevan.

Contoh:

```text
Past Service
AC Cleaning

Provider:
ABC Service

Asset:
AC Home

Location:
Home A

[BOOK AGAIN]
```

---

# 13. Blind Clone Tidak Diperbolehkan

Rebooking tidak boleh 100% clone order lama.

System harus memvalidasi ulang:

- service availability
- provider availability
- current pricing
- scope
- booking type
- service mode
- location
- asset
- policy

---

# 14. Current Price

Harga rebooking menggunakan:

```text
CURRENT VALID PRICE
```

bukan historical price.

Historical price hanya tetap berada di order/history lama.

---

# 15. Price Change

Contoh:

```text
Previous:
Rp100.000

Current:
Rp125.000
```

Customer harus melihat current price sebelum final confirmation.

---

# 16. Provider Availability

Provider lama harus dicek ulang.

Jika unavailable:

```text
Provider unavailable
↓
Choose another time
atau
Choose another provider
```

---

# 17. Service Availability

Jika service lama sudah tidak tersedia:

```text
Service unavailable
```

System dapat memberikan:

- alternative service
- alternative provider
- kembali ke discovery

---

# 18. Location Revalidation

Location lama tidak otomatis dianggap current.

System harus mengizinkan:

```text
Previous Location
Current Location
```

untuk divalidasi/diganti.

---

# 19. Asset Revalidation

Jika service berbasis asset, system harus mengecek status asset.

Contoh:

```text
ACTIVE
INACTIVE
TRANSFERRED
RETIRED
```

Identity tetap mengikuti Feature #15 Asset.

---

# 20. Rebooking Asset

Contoh:

```text
Toyota Avanza 2022
Periodic Service

[BOOK AGAIN]
```

Asset yang sama menjadi context booking baru bila masih valid.

---

# 21. Historical Snapshot vs Current Config

Historical data:

- service name saat order lama
- provider saat order lama
- price saat order lama
- scope saat order lama

Current transaction:

- current service offering
- current provider configuration
- current price
- current availability
- current policy

---

# 22. Provider Retired

Jika provider sudah tidak aktif:

```text
Historical Provider
= tetap muncul di history

Rebooking
= tidak dapat langsung dibuat ke provider inactive
```

Alternative dapat ditawarkan.

---

# 23. Provider Continuity

System dapat memprioritaskan provider sebelumnya.

Namun:

```text
Previous Provider
≠
Mandatory Provider
```

Customer tetap dapat memilih provider lain.

---

# 24. Alternative Provider

Alternatif dapat berdasarkan:

- compatibility
- area
- availability
- service support
- provider status

Recommendation ranking berada di #18 Smart Recommendation.

---

# 25. Rebooking from Maintenance

Contoh:

```text
Maintenance Due
↓
Previous Service
↓
Previous Provider
↓
[BOOK AGAIN]
```

Ini menghubungkan #16 dan #17.

---

# 26. Rebooking with Fixed Price

Jika service saat ini fixed price:

```text
Current Fixed Price
```

ditampilkan sebelum confirmation.

---

# 27. Rebooking with Estimated Price

Estimated price harus dihitung ulang berdasarkan kondisi saat ini.

Historical estimate tidak otomatis berlaku.

---

# 28. Rebooking with Quotation

Quotation lama:

```text
EXPIRED / ACCEPTED / REJECTED
```

tidak otomatis menjadi quotation aktif untuk order baru.

Order baru memerlukan quotation baru bila service menggunakan quotation.

---

# 29. Rebooking with Negotiation

Harga hasil negosiasi lama tidak otomatis dibawa ke order baru.

Rebooking dapat membuka negotiation baru sesuai service offering.

---

# 30. Rebooking Current Scope

Jika scope service berubah:

```text
OLD SCOPE
≠
CURRENT SCOPE
```

Customer harus melihat current scope sebelum booking baru.

---

# 31. Final Rebooking Confirmation

Sebelum transaction dibuat, tampilkan minimal:

- service
- provider
- asset
- location
- schedule
- current pricing/quotation
- relevant additional context

---

# 32. Rebooking Data Prefill

Data yang dapat diprefill:

- service
- provider
- asset
- location
- service mode
- preferred booking type
- previous notes
- maintenance context

Semua harus melewati validation ulang.

---

# 33. Rebooking Intent

Rebooking dapat memiliki intent sementara sebelum booking selesai.

Status:

```text
CREATED
VALIDATING
READY
BOOKING
COMPLETED
FAILED
EXPIRED
CANCELLED
```

---

# 34. Stale Rebooking Intent

Intent yang terlalu lama tidak boleh dianggap valid tanpa validation ulang.

Availability dan price harus dicek kembali.

---

# 35. Rebooking Idempotency

Double click/retry tidak boleh menghasilkan multiple booking.

System membutuhkan idempotency mechanism.

---

# 36. Cancelled Order

Cancelled order tidak menjadi successful repeat-service history.

Namun dapat menyediakan shortcut:

```text
TRY AGAIN
```

atau membuka service lama.

---

# 37. Failed Order

Failed order dapat menyediakan shortcut baru jika business rule mengizinkan.

Status history tetap:

```text
FAILED
```

---

# 38. Favorite Concept

Favorite adalah hubungan antara customer dan entity yang ingin disimpan.

Target MVP:

```text
PROVIDER
SERVICE
SERVICE_OFFERING
```

---

# 39. Favorite Provider

Contoh:

```text
ABC Service
♡
```

Setelah disimpan:

```text
ABC Service
♥
```

---

# 40. Favorite Service

Contoh:

```text
AC Cleaning
♥
```

Customer dapat menyimpan service tanpa mengunci provider tertentu.

---

# 41. Favorite Provider ≠ Preferred Provider

Favorite berarti:

> customer menyimpan entity tersebut.

Preferred berarti:

> entity menjadi pilihan/default preference.

Favorite tidak otomatis membuat provider preferred.

---

# 42. Favorite ≠ Rebooking

Favorite:

```text
save for later
```

Rebooking:

```text
repeat a previous service
```

Favorite service dapat belum pernah dipakai.

---

# 43. Favorite List

Contoh:

```text
My Favorites

Providers
- ABC Service
- CleanPro

Services
- AC Cleaning
- Deep Cleaning
- Car Detailing
```

---

# 44. Favorite Filter

MVP:

```text
ALL
PROVIDERS
SERVICES
```

Scale-up dapat menyediakan collection.

---

# 45. Favorite Collection

Scale-up:

```text
My Home
- AC Service
- Plumbing
- Cleaning

My Car
- Service
- Detailing
- Tire
```

---

# 46. Favorite Privacy

Favorite adalah data customer.

Provider tidak dapat melihat daftar favorite customer secara bebas.

---

# 47. Favorite Notification

Provider tidak otomatis mendapat notifikasi bahwa customer memfavoritkan mereka kecuali policy platform secara eksplisit mengizinkan.

---

# 48. Favorite Availability

Favorite tetap boleh tersimpan ketika provider:

```text
TEMPORARILY UNAVAILABLE
```

UI dapat memberi label unavailable.

---

# 49. Favorite Service Archived

Jika service diarchive:

```text
Historical Favorite
= tetap dapat tercatat

Future Booking
= tidak tersedia
```

---

# 50. Unfavorite

Customer dapat remove favorite kapan saja.

Unfavorite:

- tidak menghapus order
- tidak menghapus history
- tidak mengubah rating
- tidak mengubah provider reputation

---

# 51. Favorite Uniqueness

Duplicate favorite tidak diperbolehkan.

Constraint konseptual:

```text
(customer_id, target_type, target_id)
```

unik.

---

# 52. Favorite Events

Event:

```text
FAVORITE_ADDED
FAVORITE_REMOVED
```

dapat disimpan untuk analytics/audit.

---

# 53. Loyalty Concept

Loyalty adalah sistem benefit/reward berdasarkan aktivitas customer yang eligible.

Core:

```text
POINTS
REWARDS
REDEMPTION
HISTORY
```

---

# 54. Loyalty ≠ Promotion

Promotion:

```text
kampanye harga
```

Loyalty:

```text
benefit berdasarkan loyalty activity
```

Keduanya dapat digunakan bersama.

---

# 55. Loyalty ≠ Coupon

Coupon:

```text
voucher/code
```

Loyalty:

```text
points
ledger
reward
redemption
```

---

# 56. Point Ledger

Source of truth harus berupa ledger.

Bukan hanya:

```text
points_balance = 500
```

Melainkan:

```text
+100 EARN
+50 EARN
-200 REDEEM
-100 REVERSE

Balance =  - derived/cached -
```

---

# 57. Loyalty Account

Customer dapat memiliki satu loyalty account dalam identity model Servio.

Status:

```text
ACTIVE
SUSPENDED
CLOSED
```

---

# 58. Earning Event

Point diberikan hanya jika event memenuhi loyalty rule.

Contoh:

```text
ORDER_COMPLETED
```

atau kombinasi:

```text
ORDER_COMPLETED
+
PAYMENT_SETTLED
```

sesuai policy.

---

# 59. Completion Eligibility

Completed order tidak selalu berarti point langsung tersedia bila ada eligibility condition tambahan.

Contoh:

```text
Completed
+
Payment Settled
+
No Relevant Hold
=
Eligible
```

---

# 60. Dispute Hold

Transaksi dalam dispute dapat membuat loyalty earning:

```text
PENDING
```

sampai eligibility final bila policy mengharuskan.

---

# 61. Refund Reversal

Jika point sudah diberikan lalu transaksi direfund:

```text
Original Earn
↓
Refund
↓
Reverse Ledger Entry
```

sesuai rule.

---

# 62. Cancellation

Cancellation sebelum earning eligibility tidak memberikan point.

---

# 63. No Silent Point Removal

Semua perubahan point harus memiliki transaction:

```text
EARN
REDEEM
EXPIRE
REVERSE
ADJUST
```

---

# 64. Ledger Immutability

Loyalty ledger transaction tidak diedit.

Koreksi dilakukan menggunakan compensating transaction.

---

# 65. Admin Adjustment

Admin dapat melakukan adjustment dengan:

- reason
- actor
- timestamp
- reference

---

# 66. Reward Types

MVP dapat mendukung:

- service voucher
- discount reward
- fee discount
- reward credit
- selected service benefit

---

# 67. Reward ≠ Money Balance

```text
500 POINTS
≠
Rp500
```

kecuali ada conversion rule resmi.

---

# 68. Reward Eligibility

Reward dapat memiliki:

- minimum point
- service scope
- category scope
- provider scope
- minimum order
- validity
- usage limit

---

# 69. Reward Source

Reward source:

```text
PLATFORM
PROVIDER
CAMPAIGN
PARTNER
```

---

# 70. Redemption Flow

```text
Select Reward
↓
Check Eligibility
↓
Redeem
↓
Points Deducted / Reserved
↓
Reward Issued
↓
Apply to Eligible Order
```

---

# 71. Redemption Idempotency

One redemption request hanya menghasilkan satu redemption valid.

Retry tidak boleh mengurangi point dua kali.

---

# 72. Failed Redemption

Jika redemption gagal:

```text
Reward not issued
+
Points not lost
```

transaksi harus atomic/compensatable.

---

# 73. Reward Status

```text
AVAILABLE
RESERVED
APPLIED
USED
EXPIRED
CANCELLED
REVOKED
```

---

# 74. Reward Expiry

Reward yang sudah expired:

```text
EXPIRED
```

tidak dapat digunakan.

---

# 75. Points Expiry

Bila platform mengaktifkan expiry:

```text
Point Expiration
```

harus memiliki ledger entry.

---

# 76. Loyalty Campaign

Campaign dapat mendefinisikan:

- name
- start
- end
- eligibility
- earning rule
- reward
- scope
- max reward

---

# 77. Category Bonus

Campaign dapat memberikan multiplier pada category/service tertentu.

Contoh:

```text
Repair & Technical
2x Points
```

harus memiliki periode dan rule jelas.

---

# 78. Provider Campaign

Provider dapat berpartisipasi dalam campaign loyalty melalui framework Servio.

---

# 79. Campaign Stacking

Jika beberapa campaign berlaku bersamaan, system harus memiliki stacking policy:

```text
STACKABLE
NON_STACKABLE
HIGHEST_ONLY
```

---

# 80. No Unlimited Stacking

Reward/campaign tidak otomatis dapat ditumpuk tanpa rule.

---

# 81. Loyalty Tier

Scale-up:

```text
BRONZE
SILVER
GOLD
```

berdasarkan rule objektif.

Tier bukan rating kualitas customer.

---

# 82. Tier Benefits

Dapat berupa:

- bonus points
- selected discounts
- service benefit
- priority support
- campaign access

---

# 83. Tier Period

Tier dapat dihitung menggunakan:

- fixed period
- rolling period

aturan harus ditentukan secara eksplisit oleh platform.

---

# 84. Loyalty History

Customer dapat melihat:

```text
+100
AC Service

-200
Reward Redemption

+50
Maintenance

Balance: 450
```

---

# 85. Loyalty Transparency

Customer harus dapat memahami:

```text
Kenapa saya mendapat point?
Kenapa point berkurang?
Kenapa reward tidak tersedia?
Kapan point/reward expired?
```

---

# 86. Loyalty and Rating

Reward tidak boleh mensyaratkan rating positif.

Tidak diperbolehkan:

```text
"5 stars = 100 points"
```

---

# 87. Review Reward

Bila reward untuk review digunakan:

```text
Eligible Review Activity
→ Reward
```

tanpa mensyaratkan nilai rating positif.

---

# 88. Loyalty Abuse Prevention

System harus dapat mendeteksi:

- fake transactions
- duplicate orders
- refund farming
- reward farming
- account farming
- suspicious repeated patterns

---

# 89. Suspicious Loyalty Status

Konsep status:

```text
NORMAL
REVIEW_REQUIRED
ON_HOLD
REVERSED
BLOCKED
```

---

# 90. Risk Decision Boundary

AI/risk signal tidak menjadi keputusan final secara otomatis.

Enforcement mengikuti risk/fraud policy.

---

# 91. Self Transaction

Transaksi self/related-account dapat ditandai untuk review.

---

# 92. Provider-Customer Collusion

System dapat mendeteksi pola transaksi tidak wajar sebagai signal.

---

# 93. Multiple Account Abuse

Loyalty abuse melalui banyak akun dapat dikenakan controls berdasarkan identity/risk policy.

---

# 94. Loyalty and Promotion

Promotion engine tetap terpisah.

Loyalty dapat menyediakan reward/discount eligibility ke checkout.

---

# 95. Checkout Integration

Saat checkout:

```text
Eligible Rewards
```

dapat ditampilkan.

Pricing tetap menghitung nilai transaksi.

Payment tetap memproses pembayaran.

---

# 96. Domain Boundary

```text
LOYALTY
= benefit eligibility

PRICING
= price calculation

PAYMENT
= money movement
```

---

# 97. Platform Fee Interaction

Loyalty discount dapat memengaruhi transaction calculation sesuai pricing/payment policy.

Feature #17 tidak menjadi source of truth platform fee.

---

# 98. Rebooking + Loyalty

Flow:

```text
Past Order
↓
Book Again
↓
New Order Complete
↓
Loyalty Eligibility
↓
Earn Points
```

Klik Book Again sendiri bukan earning event.

---

# 99. Favorite + Loyalty

Favorite tidak otomatis menghasilkan point.

---

# 100. Rebooking Bonus

Campaign dapat memberikan bonus karena repeat transaction bila rule mengizinkan.

Contoh:

```text
3rd completed service
→ bonus points
```

---

# 101. Maintenance + Rebooking

```text
Maintenance Due
↓
Previous Service
↓
Book Again
```

---

# 102. Maintenance + Favorite

Jika provider maintenance sebelumnya difavoritkan:

```text
Maintenance Due
↓
Favorite Provider
↓
Book Again
```

---

# 103. Maintenance + Loyalty

Completed maintenance dapat menjadi eligible earning event jika memenuhi loyalty rules.

---

# 104. Smart Recommendation Integration

Feature #18 dapat menggunakan:

- rebooking history
- favorite
- previous orders
- maintenance due
- service availability
- loyalty context

#17 tetap source of truth untuk actual favorite/loyalty states.

---

# 105. AI Rebooking Suggestion

AI boleh menyarankan:

```text
You booked AC Cleaning 3 months ago.
Would you like to book again?
```

Jika maintenance due berasal dari #16, label due tetap berasal dari maintenance state.

---

# 106. AI Favorite Suggestion

AI dapat menyarankan provider/service yang sering dipakai.

AI tidak boleh menambah favorite tanpa customer action.

---

# 107. AI Reward Suggestion

AI dapat merekomendasikan reward yang mungkin cocok.

Eligibility final tetap dari loyalty rule engine.

---

# 108. Favorite Analytics

Admin dapat menganalisis:

- most favorited providers
- most favorited services
- favorite-to-book conversion

---

# 109. Rebooking Analytics

Metrik:

- rebooking attempts
- successful rebooking
- failure
- conversion
- repeat rate
- provider continuity

---

# 110. Loyalty Analytics

Metrik:

- points issued
- points redeemed
- points expired
- reward usage
- campaign conversion
- loyalty cost
- repeat order impact

---

# 111. Retention Funnel

```text
First Order
↓
Completed
↓
Favorite / Rebooking
↓
Second Order
↓
Loyalty
↓
Third Order
↓
Repeat Customer
```

---

# 112. Customer Dashboard

MVP dapat menampilkan:

```text
Book Again
My Favorites
My Points
Available Rewards
Maintenance Due
```

---

# 113. Book Again Widget

Contoh:

```text
Book Again

AC Cleaning
Last: 3 months ago
ABC Service

[BOOK AGAIN]
```

---

# 114. Favorite Widget

Contoh:

```text
Your Favorites

ABC Service
AC Cleaning

[VIEW ALL]
```

---

# 115. Loyalty Widget

Contoh:

```text
450 Points

50 points until next reward

[VIEW REWARDS]
```

---

# 116. Homepage Personalization

Homepage dapat memiliki:

```text
Book Again
Your Favorites
Maintenance Due
Loyalty Rewards
```

Urutan dapat dinamis berdasarkan relevance.

---

# 117. Favorite CTA

Service/provider card:

```text
♡
```

harus menjadi action ringan.

---

# 118. Rebooking CTA

Ketika eligible:

```text
BOOK AGAIN
```

menjadi shortcut utama.

---

# 119. Current Availability Check

Rebooking/favorite booking harus selalu mengecek current availability.

---

# 120. Stale Price Check

Harga current harus divalidasi lagi saat transaction.

---

# 121. Stale Scope Check

Perubahan scope service harus terlihat kepada customer.

---

# 122. Stale Provider Check

Provider status harus diverifikasi ulang.

---

# 123. Rebooking Failure UX

Contoh:

```text
This provider is unavailable for your selected time.

[CHOOSE ANOTHER TIME]
[CHOOSE ANOTHER PROVIDER]
```

---

# 124. Loyalty Failure UX

Contoh:

```text
Reward could not be redeemed.
Your points were not charged.
```

---

# 125. Favorite Failure UX

Contoh:

```text
Could not save favorite.
Please try again.
```

---

# 126. Support

Customer Support/Admin dapat melihat:

- loyalty history
- redemptions
- point adjustments
- favorite status
- rebooking records/context

---

# 127. Provider View

Provider dapat memiliki aggregate view seperti:

- repeat customer count
- repeat booking
- loyalty-funded transaction
- campaign performance

Tetap sesuai privacy policy.

---

# 128. Customer Repeat Signal

Provider dapat melihat limited signal:

```text
Repeat Customer
```

tanpa melihat private customer data yang tidak diperlukan.

---

# 129. CEO/Product Owner

CEO/Product Owner dapat mengatur:

- loyalty rules
- campaign
- reward
- expiry policy
- earning rate
- redemption rules
- governance

---

# 130. Admin

Admin dapat:

- manage rewards
- manage campaigns
- perform controlled adjustments
- review suspicious activity
- inspect analytics
- resolve reward issue

---

# 131. Loyalty Data Model

Core entities:

```text
loyalty_accounts
loyalty_ledgers
loyalty_rules
loyalty_rewards
loyalty_redemptions
loyalty_campaigns
loyalty_adjustments
```

---

# 132. Favorite Data Model

Core:

```text
favorites
favorite_events
```

---

# 133. Rebooking Data Model

Rebooking dapat memanfaatkan existing transaction/history entities.

Optional:

```text
rebooking_records
rebooking_preferences
```

Tidak boleh menduplikasi historical transaction tanpa alasan.

---

# 134. Favorites Fields

```text
favorite_id
customer_id
target_type
target_id
created_at
updated_at
```

---

# 135. Loyalty Account Fields

```text
loyalty_account_id
customer_id
status
current_balance
tier_id
created_at
updated_at
```

`current_balance` dapat berupa cached/derived representation.

---

# 136. Loyalty Ledger Fields

```text
ledger_id
loyalty_account_id
transaction_type
points
reference_type
reference_id
reason
expires_at
created_at
```

---

# 137. Loyalty Rule Fields

```text
rule_id
name
scope
earning_type
earning_value
eligibility
start_at
end_at
status
configuration
```

---

# 138. Loyalty Reward Fields

```text
reward_id
name
reward_type
points_cost
scope
valid_from
valid_until
usage_limit
status
configuration
```

---

# 139. Redemption Fields

```text
redemption_id
loyalty_account_id
reward_id
points_spent
status
order_id
issued_at
used_at
expired_at
```

---

# 140. Campaign Fields

```text
campaign_id
name
start_at
end_at
eligibility
reward_rule
scope
status
configuration
```

---

# 141. Adjustment Fields

```text
adjustment_id
loyalty_account_id
points
reason
actor_id
reference_id
created_at
```

---

# 142. Point Transaction Types

```text
EARN
REDEEM
EXPIRE
REVERSE
ADJUST
```

---

# 143. Loyalty Reward State

```text
AVAILABLE
RESERVED
APPLIED
USED
EXPIRED
CANCELLED
REVOKED
```

---

# 144. Ledger Integrity

Ledger transaction harus immutable secara bisnis.

Correction = new compensating entry.

---

# 145. Rule Hierarchy

Konseptual hierarchy:

```text
Global
↓
Category
↓
Subcategory
↓
Service
↓
Provider
↓
Campaign
```

Effective rule harus deterministic.

---

# 146. Most Specific Rule

Rule paling spesifik yang aktif dapat menjadi effective rule sesuai platform configuration.

Tidak boleh ada conflict resolution random.

---

# 147. Campaign Scope

Campaign dapat berlaku pada:

- all services
- category
- subcategory
- service
- provider
- selected customer segment
- selected time period

Scope harus terdefinisi.

---

# 148. Loyalty Period

Loyalty dapat memiliki:

```text
CURRENT PERIOD
HISTORICAL PERIOD
```

Perubahan periode harus predictable.

---

# 149. Balance Reconciliation

Balance harus dapat direkonsiliasi dengan ledger.

---

# 150. Reward Reservation

Scale-up dapat menggunakan:

```text
RESERVED
```

sebelum reward benar-benar applied.

---

# 151. Reward Reversal

Jika transaksi yang memakai reward gagal/cancel/refund:

```text
Reward
→ CANCELLED / REVOKED / restored
```

berdasarkan policy.

---

# 152. Negative Balance

Default:

```text
Balance >= 0
```

Bila reversal melebihi available points, negative balance hanya boleh terjadi bila business policy memang secara eksplisit mengizinkan.

---

# 153. Loyalty Cost

Platform dapat menghitung:

```text
Reward Cost
+
Discount Cost
+
Campaign Cost
```

untuk analytics/accounting.

---

# 154. Reward Expiration Notification

System dapat mengingatkan customer sebelum reward expired.

---

# 155. Point Expiration Notification

Jika point expiry aktif, notification dapat dikirim sebelum expiry.

---

# 156. Notification Anti-Spam

Loyalty notification harus memiliki:

- deduplication
- cooldown
- quiet hours
- suppression

sesuai notification policy.

---

# 157. Notification ≠ Source of Truth

Notification hanya menyampaikan state.

Source:

```text
Loyalty Ledger
Reward
Redemption
Favorite
Rebooking Intent
```

---

# 158. Event Model

Event contoh:

```text
ORDER_COMPLETED
SERVICE_COMPLETED
PAYMENT_SETTLED
ORDER_REFUNDED
REWARD_REDEEMED
REWARD_EXPIRED
FAVORITE_ADDED
FAVORITE_REMOVED
REBOOKING_STARTED
REBOOKING_COMPLETED
```

---

# 159. Event Idempotency

Event seperti:

```text
ORDER_COMPLETED
```

harus diproses sekali untuk earning rule yang sama.

Contoh key:

```text
reference_type
reference_id
rule_id
```

atau mekanisme setara.

---

# 160. Rebooking Event Idempotency

Repeated request terhadap booking flow tidak boleh menghasilkan duplicate transaction.

---

# 161. Auditability

Perubahan penting harus audit-able:

- favorite added/removed
- rebooking intent
- points earned
- points redeemed
- points reversed
- points expired
- manual adjustment
- reward revoked

---

# 162. Privacy

Rebooking history/favorites/loyalty data mengandung behavioral information customer.

Access harus dibatasi sesuai role/permission.

---

# 163. Customer Data Control

Customer dapat:

- manage favorite
- view loyalty history
- redeem reward
- remove favorite
- use rebooking
- see reward eligibility

---

# 164. Provider Data Control

Provider tidak otomatis melihat:

- customer favorite list
- full loyalty balance
- unrelated historical behavior

---

# 165. Enterprise

Scale-up:

```text
Organization
↓
Multiple Users
↓
Multiple Assets
↓
Shared Loyalty Policy
```

Tetap membutuhkan account/permission model yang jelas.

---

# 166. Family / Shared Customer

Scale-up dapat mendukung shared asset/service relationship.

Loyalty ownership harus tetap mengikuti identity/account policy.

---

# 167. Rebooking From Shared Asset

Jika asset shared:

```text
Customer A
↓
Past Service
↓
Book Again
```

harus tetap memiliki permission terhadap asset.

---

# 168. Favorite Shared Service

Favorite service dapat tetap bersifat personal kecuali organisasi menyediakan shared favorites.

---

# 169. Loyalty Ownership

Point dimiliki loyalty account sesuai identity, bukan otomatis berdasarkan asset.

---

# 170. Retention Analytics

Feature #17 dapat menjadi sumber data untuk:

- repeat behavior
- customer retention
- provider continuity
- campaign performance
- favorite conversion

---

# 171. Repeat Booking Rate

Konsep:

```text
repeat eligible customers
/
customers with prior completed service
```

Actual analytic definition harus konsisten saat implementation.

---

# 172. Favorite Conversion

Concept:

```text
favorite
→ booking
```

dapat dianalisis.

---

# 173. Loyalty Conversion

Concept:

```text
eligible customer
→ loyalty enrollment
→ redemption
→ repeat booking
```

---

# 174. No Automatic Political / Behavioral Judgment

Loyalty/rebooking metrics adalah operational analytics, bukan penilaian personal customer.

---

# 175. Customer Lifetime Context

Repeat usage dapat menjadi business metric, bukan customer quality score.

---

# 176. Recommendation Inputs

#18 dapat menggunakan:

- order frequency
- repeat services
- favorites
- maintenance
- loyalty activity

Tetap tunduk pada privacy/business rules.

---

# 177. Product Integration

Saat repeat service membutuhkan product/material:

```text
Rebooking
↓
Service
↓
Material Need
↓
#19 Product Integration
```

---

# 178. Service + Product Bundling

Scale-up dapat menawarkan:

```text
Book Maintenance
+
Recommended Filter
```

Namun purchase flow tetap menggunakan product module.

---

# 179. No Duplicate Engines

Feature #17 tidak membuat:

```text
RebookingBookingEngine
LoyaltyPaymentEngine
FavoriteNotificationEngine
```

yang menduplikasi core infrastructure.

---

# 180. Existing Engine Reuse

Gunakan:

```text
Booking #2
Order #3
Pricing #4
Communication #5
Payment #6
Execution #7
Proof #9
Completion #10
History #14
Asset #15
Maintenance #16
Recommendation #18
Product #19
```

---

# 181. Final Rebooking Flow

```text
Past Completed Order
        ↓
Book Again
        ↓
Validate Provider
        ↓
Validate Service
        ↓
Validate Location
        ↓
Validate Asset
        ↓
Current Price / Quotation
        ↓
Current Availability
        ↓
Booking
        ↓
Order
        ↓
Execution
        ↓
Completion
        ↓
Loyalty Eligibility
```

---

# 182. Final Favorite Flow

```text
Provider / Service
        ↓
Favorite
        ↓
Saved Relation
        ↓
My Favorites
        ↓
Current Availability
        ↓
Book
```

---

# 183. Final Loyalty Flow

```text
Eligible Event
       ↓
Eligibility Validation
       ↓
Loyalty Ledger
       ↓
Points Balance
       ↓
Reward Eligibility
       ↓
Redeem
       ↓
Reward
       ↓
Apply to Eligible Order
```

---

# 184. Final Maintenance Integration

```text
MAINTENANCE DUE
       ↓
Previous Service
       ↓
Previous Provider / Favorite
       ↓
REBOOKING
       ↓
BOOKING
       ↓
ORDER
       ↓
COMPLETION
       ↓
LOYALTY
       ↓
NEXT MAINTENANCE
```

---

# 185. Final Retention Architecture

```text
                    COMPLETED ORDER
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
        REBOOKING       FAVORITE       LOYALTY
            │              │              │
            ▼              ▼              ▼
        QUICK BOOK      SAVED          POINT LEDGER
            │           RELATION           │
            ▼              │               ▼
         BOOKING            │            REWARDS
            │              │               │
            ▼              │               ▼
          ORDER             │          REDEMPTION
            │              │               │
            └──────────────┴───────────────┘
                           │
                           ▼
                      REPEAT USAGE
```

---

# 186. Boundary Architecture

```text
#14 SERVICE HISTORY
= apa yang pernah terjadi

#16 MAINTENANCE
= apa yang perlu dilakukan berikutnya

#17 REBOOKING
= shortcut untuk mengulang service

#17 FAVORITE
= preference yang disimpan customer

#17 LOYALTY
= benefit/reward berdasarkan eligible activity

#18 SMART RECOMMENDATION
= apa yang direkomendasikan system
```

---

# 187. Non-Goals

Feature #17 bukan:

- payment engine
- booking engine
- pricing engine
- order engine
- maintenance engine
- reward cash wallet
- rating engine
- recommendation engine
- fraud decision engine

---

# 188. MUST-LOCK DECISIONS

## Rebooking

1. Rebooking adalah shortcut repeat service.
2. Rebooking memiliki historical context.
3. Rebooking tidak clone order lama secara blind.
4. Harga harus divalidasi ulang.
5. Provider availability harus divalidasi ulang.
6. Service availability harus divalidasi ulang.
7. Location harus divalidasi ulang.
8. Asset harus divalidasi ulang bila applicable.
9. Quotation lama tidak otomatis berlaku.
10. Negotiated price lama tidak otomatis berlaku.
11. Completed order menjadi sumber utama rebooking.
12. Cancelled order bukan successful rebooking history.
13. Alternative provider dapat ditawarkan.
14. Provider lama tidak wajib dipertahankan.
15. Rebooking menggunakan Booking #2.
16. Rebooking menggunakan Order #3.
17. Rebooking tidak membuat pricing engine baru.
18. Rebooking tidak membuat payment engine baru.
19. Rebooking harus idempotent.
20. Historical data tetap dipertahankan.

## Favorite

21. Favorite provider dan favorite service dibedakan.
22. Favorite bukan rebooking.
23. Favorite bukan preferred provider secara otomatis.
24. Favorite bersifat private customer preference secara default.
25. Favorite dapat digunakan sebagai shortcut booking.
26. Favorite tidak mengubah history.
27. Favorite tidak hilang hanya karena provider temporary unavailable.
28. Provider deactivated tidak menghapus historical favorite relation secara diam-diam.
29. Duplicate favorite harus dicegah.
30. Unfavorite tidak menghapus order/history.
31. Favorite event dapat diaudit.
32. Provider tidak otomatis diberi tahu customer favorite.
33. Favorite recommendation tidak boleh otomatis menambah favorite.

## Loyalty

34. Loyalty adalah reward domain, bukan payment wallet.
35. Points menggunakan ledger sebagai source of truth.
36. Balance dapat menjadi cached/derived value.
37. Point earning harus berdasarkan eligible event.
38. Completed order dapat menjadi earning event.
39. Refunded order dapat memicu point reversal sesuai rule.
40. Cancelled order sebelum eligibility tidak menghasilkan point.
41. Disputed transaction dapat menahan reward bila policy mengharuskan.
42. Point transaction tidak boleh silently diubah.
43. Correction menggunakan compensating ledger entry.
44. Reward dan point dibedakan.
45. Redemption harus idempotent.
46. Failed redemption tidak boleh menyebabkan point loss.
47. Reward memiliki lifecycle status.
48. Reward expiry harus tercatat.
49. Point expiry, bila diaktifkan, harus tercatat.
50. Admin adjustment harus memiliki reason dan audit.
51. Loyalty rule dikontrol platform.
52. Campaign dikontrol platform.
53. Provider campaign mengikuti loyalty framework.
54. Loyalty tidak sama dengan promotion.
55. Loyalty tidak sama dengan coupon.
56. Loyalty tidak otomatis sama dengan cash.
57. Positive rating tidak boleh menjadi syarat reward.
58. Review reward, bila digunakan, harus reward for eligible review activity dan bukan positive-rating incentive.
59. Loyalty abuse harus dapat dimonitor.
60. AI tidak menjadi source of truth loyalty.
61. AI tidak dapat memberikan reward di luar eligibility.
62. Loyalty analytics bukan source of truth transactional.
63. Loyalty balance harus dapat direkonsiliasi dengan ledger.
64. Reward eligibility harus transparan.
65. Point changes harus explainable.
66. Loyalty account memiliki lifecycle.
67. Multiple loyalty accounts untuk identity yang sama harus dicegah sesuai identity model.
68. Campaign memiliki start/end.
69. Reward memiliki validity.
70. Campaign stacking memiliki rule.
71. Reward usage memiliki eligibility.
72. Rebooking dapat memperoleh loyalty reward bila campaign/rule mengizinkan.
73. Favorite tidak otomatis menghasilkan point.
74. Rebooking tidak otomatis menghasilkan point hanya karena klik; earning mengikuti eligible transaction event.
75. Loyalty tidak menggantikan payment ledger.

## Integration

76. Maintenance due dapat menyediakan shortcut rebooking.
77. Maintenance tetap source of truth untuk maintenance due.
78. Service History dapat menyediakan rebooking context.
79. Asset tetap source of truth untuk asset identity.
80. Smart Recommendation #18 dapat mempersonalisasi rebooking/favorite/reward.
81. Product Integration #19 tetap menangani product flow.
82. Rebooking menggunakan current valid service offering.
83. Loyalty discount/benefit menjadi input pricing/checkout sesuai rule.
84. Payment tetap ditangani #6.
85. Order tetap ditangani #3.
86. Booking tetap ditangani #2.
87. Historical transaction tidak berubah karena rebooking.
88. New rebooking menghasilkan transaction context baru.
89. System tidak boleh membuat duplicate order karena retry.
90. Customer harus mendapatkan final confirmation atas current price/scope sebelum booking baru.

---

# 189. FINAL LOCKED PRINCIPLES — STATUS

```text
FEATURE #17
REBOOKING / FAVORITE / LOYALTY

STATUS:
████████████████████ LOCKED
```

### MVP

```text
✅ Rebooking / Book Again
✅ Book Again from History
✅ Rebooking from Maintenance
✅ Favorite Provider
✅ Favorite Service
✅ Loyalty Points
✅ Point Ledger
✅ Reward Redemption
✅ Basic Campaign
✅ Loyalty History
✅ Repeat Usage Tracking
```

### SCALE-UP

```text
🚀 Loyalty Tier
🚀 Advanced Campaign
🚀 Favorite Collections
🚀 Loyalty Streak
🚀 Personalized Rewards
🚀 Enterprise Loyalty
🚀 Advanced Fraud Detection
🚀 Predictive Retention
```

---

# 190. FINAL SERVIO RETENTION LOOP

```text
SERVICE DISCOVERY
       ↓
BOOKING
       ↓
ORDER
       ↓
EXECUTION
       ↓
PROOF
       ↓
COMPLETION
       ↓
SERVICE HISTORY
       ↓
MAINTENANCE
       ↓
REBOOKING
       ↓
LOYALTY
       ↓
REPEAT USAGE
       ↓
NEXT SERVICE
```

> **Feature #17 resmi menjadi domain retention Servio: mempercepat repeat booking, menyimpan customer preference, dan memberikan loyalty benefit yang terukur tanpa mengambil alih fungsi booking, pricing, payment, recommendation, atau service lifecycle lainnya.**
