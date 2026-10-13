# SERVIO — FEATURE #8 TRACKING DETAIL
## Final Specification — LOCKED

> **Feature #8:** Tracking Detail  
> **Status:** FINAL / LOCKED  
> **Roadmap Position:** Service / Jasa — #8 dari 19  
> **Fokus Utama:** memberikan visibilitas kepada customer mengenai perjalanan provider, posisi/ETA jika relevan, status kedatangan, serta perkembangan pelaksanaan service.

---

# 1. Definisi Fitur

**Tracking Detail** adalah fitur yang memungkinkan customer melihat kondisi dan perkembangan order secara lebih jelas, mulai dari provider bersiap, perjalanan menuju lokasi, kedatangan, sampai perkembangan service ketika sedang dikerjakan.

Tracking bukan hanya fitur peta atau GPS.

Tracking merupakan **visibility layer** yang menampilkan kondisi order berdasarkan event dari proses execution, perjalanan, asset, session, dan status service.

### Prinsip Utama

1. Customer dapat mengetahui apa yang sedang terjadi pada order.
2. Customer dapat mengetahui posisi provider apabila perjalanan memang perlu dilacak.
3. Customer dapat melihat ETA apabila data memungkinkan.
4. Customer dapat melihat status kedatangan provider.
5. Customer dapat melihat perkembangan service secara sederhana dan mudah dipahami.
6. Tracking harus menampilkan waktu update terakhir.
7. Tracking tidak boleh menampilkan data GPS mentah secara langsung kepada customer.
8. Tracking harus menyesuaikan jenis service.
9. Tidak semua service membutuhkan GPS.
10. Tracking bukan pengganti Service Execution.
11. Tracking bukan bukti pekerjaan.
12. Tracking bukan final completion.
13. Tracking tidak menentukan harga.
14. Tracking tidak mengubah pembayaran.
15. Tracking tidak menentukan hasil dispute.
16. Tracking dapat menjadi sumber informasi pendukung untuk customer support.
17. Tracking harus memperhatikan privasi customer dan provider.

---

# 2. Tujuan Tracking Detail

### Tujuan untuk Customer

1. Mengetahui apakah provider sudah mulai menuju lokasi.
2. Mengetahui posisi provider saat perjalanan.
3. Mengetahui perkiraan waktu kedatangan.
4. Mengetahui jarak/perjalanan yang tersisa.
5. Mengetahui apakah provider sudah tiba.
6. Mengetahui apakah service sudah dimulai.
7. Mengetahui perkembangan service.
8. Mengetahui apabila terdapat keterlambatan.
9. Mengetahui apabila tracking mengalami kendala.
10. Mendapatkan informasi tanpa harus terus bertanya melalui chat.

### Tujuan untuk Provider

11. Menyediakan status perjalanan kepada customer.
12. Menampilkan tujuan service.
13. Membantu provider menjalankan flow perjalanan secara terstruktur.
14. Memberikan aksi `Start Trip`.
15. Memberikan aksi `Arrived`.
16. Mendukung pencatatan kejadian perjalanan.
17. Mendukung fallback manual ketika GPS atau koneksi bermasalah.

### Tujuan untuk Admin

18. Melihat service yang sedang berjalan.
19. Mengetahui status perjalanan.
20. Mengetahui order yang mengalami keterlambatan.
21. Mengetahui tracking yang offline.
22. Membantu customer support melakukan pengecekan berdasarkan event tracking.

---

# 3. Tracking Bukan Hanya GPS

Tracking Detail terdiri dari beberapa bentuk visibility.

### A. Travel Tracking

Digunakan untuk melihat perjalanan provider menuju customer atau menuju titik service.

Data dapat meliputi:

- posisi provider
- waktu update
- ETA
- jarak
- status perjalanan
- status kedatangan

### B. Service Progress Tracking

Digunakan untuk melihat perkembangan pekerjaan setelah provider tiba.

Contoh:

```text
Provider tiba
↓
Check-in
↓
Service dimulai
↓
Sedang dikerjakan
↓
Testing
↓
Menunggu penyelesaian
```

### C. Asset / Item Tracking

Digunakan ketika objek yang diperbaiki atau dipindahkan harus dilacak.

Contoh:

```text
Vehicle Received
↓
Inspection
↓
Diagnosis
↓
Repair
↓
Testing
↓
Ready for Pickup
```

### D. Session Tracking

Dipakai untuk service yang berlangsung dalam beberapa session.

Contoh:

- emergency
- remote service
- pickup & return
- multi-visit service

---

# 4. Aturan Aktivasi Tracking

1. Booking tidak otomatis mengaktifkan GPS.
2. Tracking travel dimulai ketika provider memulai perjalanan.
3. Provider melakukan aksi `Start Trip`.
4. Sistem membuat `Tracking Session`.
5. Setelah session aktif, sistem mulai menerima data lokasi.
6. Tracking berakhir ketika perjalanan selesai.
7. Setelah provider tiba, service progress dapat dilanjutkan.
8. Travel tracking dan service progress tracking adalah dua hal berbeda.
9. Satu order dapat mempunyai lebih dari satu tracking session.
10. Emergency dapat mempunyai beberapa tracking session.
11. Pickup & Return dapat mempunyai tracking session pickup dan return.
12. Project dapat menggunakan progress tracking tanpa GPS terus-menerus.

---

# 5. Flow Tracking Normal

```text
ORDER CONFIRMED
      ↓
PROVIDER READY
      ↓
START TRIP
      ↓
CREATE TRACKING SESSION
      ↓
LOCATION UPDATES
      ↓
ETA CALCULATION
      ↓
ON THE WAY
      ↓
ARRIVED
      ↓
END TRAVEL TRACKING
      ↓
SERVICE CHECK-IN
      ↓
SERVICE ACTIVE
      ↓
SERVICE PROGRESS
      ↓
COMPLETION PENDING
      ↓
TRACKING ENDED
```

### Prinsip penting

`Arrived` tidak selalu berarti service sudah dimulai.

Contoh:

```text
Provider Arrived
↓
Customer membuka akses
↓
Check-in
↓
Initial inspection
↓
Service started
```

---

# 6. Tracking Status

Status utama yang digunakan:

```text
NOT_STARTED
STARTING
ON_THE_WAY
ARRIVED
SERVICE_ACTIVE
PAUSED
OFFLINE
COMPLETION_PENDING
ENDED
```

### Penjelasan

| Status | Arti |
|---|---|
| `NOT_STARTED` | tracking belum dimulai |
| `STARTING` | provider baru memulai tracking |
| `ON_THE_WAY` | provider sedang menuju lokasi |
| `ARRIVED` | provider telah tiba |
| `SERVICE_ACTIVE` | service sedang berlangsung |
| `PAUSED` | tracking/service sedang dijeda |
| `OFFLINE` | tracking tidak menerima update realtime |
| `COMPLETION_PENDING` | service menuju proses penyelesaian |
| `ENDED` | tracking session selesai |

---

# 7. Specialized Tracking Status

Beberapa jenis service membutuhkan status tambahan.

### Workshop

```text
DISPATCHED
↓
VEHICLE_RECEIVED
↓
INSPECTION
↓
DIAGNOSIS
↓
REPAIR
↓
TESTING
↓
READY_FOR_PICKUP
```

### Emergency

```text
REQUESTED
↓
PROVIDER_ASSIGNED
↓
ON_THE_WAY
↓
ARRIVED
↓
ASSISTANCE_ACTIVE
↓
COMPLETED
```

### Pickup & Return

```text
PICKUP_ASSIGNED
↓
ON_THE_WAY
↓
PICKED_UP
↓
IN_SERVICE
↓
READY_TO_RETURN
↓
RETURN_ON_THE_WAY
↓
DELIVERED
```

### Remote / Online

```text
SESSION_SCHEDULED
↓
PROVIDER_READY
↓
SESSION_STARTED
↓
IN_PROGRESS
↓
SESSION_COMPLETED
```

### Project

Tracking lebih berorientasi pada:

- milestone
- percentage progress
- completed task
- current phase
- upcoming milestone

GPS hanya digunakan bila memang relevan.

---

# 8. Live Location

Ketika travel tracking aktif, sistem dapat menerima:

- latitude
- longitude
- timestamp
- accuracy
- speed
- heading

Tidak semua data harus ditampilkan kepada customer.

### Customer-facing data

Customer cukup melihat:

- lokasi provider pada peta
- posisi relatif
- ETA
- jarak
- status perjalanan
- waktu update terakhir

### Data mentah

Latitude, longitude, accuracy, speed, dan heading disimpan sebagai data teknis sistem dan tidak perlu ditampilkan sebagai angka mentah kepada customer.

---

# 9. Location Accuracy

1. GPS tidak selalu akurat.
2. Sistem harus menyimpan `accuracy`.
3. UI tidak boleh memberikan kesan presisi palsu.
4. Jika akurasi rendah, sistem dapat menampilkan indikasi bahwa posisi bersifat perkiraan.
5. Customer harus melihat `Last Updated`.
6. Posisi lama tidak boleh dipresentasikan sebagai posisi realtime.
7. Sistem tidak boleh mengarang posisi ketika GPS tidak tersedia.

---

# 10. Adaptive Location Update

Frekuensi update lokasi menyesuaikan kondisi.

### Emergency

Update lebih sering karena kebutuhan waktu tinggi.

### Home Service / Mobile Service

Update normal selama provider bergerak.

### Provider Stationary

Update dapat dikurangi untuk menghemat baterai.

### Workshop

GPS umumnya tidak diperlukan.

### Project

GPS tidak perlu berjalan sepanjang waktu.

Tujuan utama:

- menghemat baterai
- mengurangi penggunaan data
- mengurangi beban backend
- menjaga privasi
- tetap menyediakan visibility yang cukup

---

# 11. Realtime dan Fallback

Tracking idealnya menggunakan realtime update.

Namun jika koneksi realtime gagal:

```text
Realtime Active
↓
Realtime Connection Failed
↓
Polling / Manual Refresh Fallback
```

Sistem dapat menggunakan fallback berupa:

- polling
- refresh
- last known location
- status terakhir

### Aturan

1. Jangan menampilkan `LIVE` apabila data sudah tidak realtime.
2. Tampilkan `Last Updated`.
3. Bedakan network offline dengan GPS unavailable.
4. Tracking failure tidak otomatis berarti service failure.
5. Customer tetap dapat melihat status terakhir yang valid.

---

# 12. Offline Tracking

Ada dua kondisi yang harus dibedakan.

### Network Offline

Provider memiliki GPS tetapi tidak memiliki koneksi internet.

### GPS Unavailable

Provider memiliki koneksi internet tetapi lokasi tidak dapat ditentukan.

UI sebaiknya menjelaskan kondisi secara jelas.

Contoh:

```text
Provider sedang offline.
Lokasi terakhir diperbarui 3 menit lalu.
```

Bukan:

```text
Provider masih berada di lokasi X.
```

jika data tersebut sudah terlalu lama.

---

# 13. Manual Fallback

Jika GPS atau koneksi bermasalah, provider tetap dapat melakukan aksi manual.

Contoh:

```text
Start Trip
Arrived
Service Started
Service Paused
Service Resumed
```

Setiap aksi manual harus dicatat dengan:

- waktu
- actor
- source/method
- event

Contoh:

```text
arrival_method = MANUAL
```

Hal ini mencegah sistem bergantung sepenuhnya pada GPS.

---

# 14. ETA

Tracking dapat menampilkan ETA ketika data mencukupi.

ETA dapat dipengaruhi oleh:

- posisi provider
- tujuan
- kondisi perjalanan
- kecepatan perjalanan
- route estimation
- traffic data jika tersedia

Namun ETA tetap merupakan **estimasi**, bukan janji.

### UI

```text
Perkiraan tiba
± 15 menit
```

atau:

```text
ETA 14:35
```

Ketika data tidak cukup:

```text
ETA belum tersedia
```

---

# 15. Distance

Sistem dapat memberikan informasi:

- jarak tersisa
- jarak perjalanan
- jarak menuju lokasi

Contoh:

```text
2.4 km lagi
```

Jarak harus mengikuti data tracking terbaru.

---

# 16. Delay Detection

Tracking dapat mengenali kondisi:

```text
ON_TIME
AT_RISK
DELAYED
```

### ON_TIME

Provider diperkirakan tiba sesuai estimasi.

### AT_RISK

Ada indikasi keterlambatan.

### DELAYED

Estimasi kedatangan telah melewati batas yang ditentukan.

Smart system boleh membantu mendeteksi kondisi tersebut.

Namun sistem tidak boleh otomatis:

- menuduh provider
- menyalahkan customer
- memberikan penalti
- membatalkan order

tanpa business rule dan proses yang jelas.

---

# 17. Customer Tracking Screen

Halaman Tracking Detail minimal memiliki:

### Header

- Order number
- nama service
- status utama

### Provider Card

- nama provider
- foto/profile
- rating
- nama worker jika tersedia
- tombol chat
- tombol call

### Map Section

Untuk service yang membutuhkan travel tracking:

- peta
- marker provider
- marker tujuan
- route jika tersedia
- ETA
- distance

### Status Section

Contoh:

```text
Provider sedang menuju lokasi
Perkiraan tiba 14:35
```

### Timeline

```text
✓ Order confirmed
✓ Provider assigned
✓ Provider on the way
● Arrived
○ Service started
○ Service completed
```

### Additional Actions

- Chat
- Call
- Share Tracking
- Help / Support

---

# 18. Customer Tidak Melihat Raw GPS

Customer tidak perlu melihat:

```text
Lat: -6.123456
Lng: 106.123456
Accuracy: 4.2m
```

Customer melihat:

```text
Provider sedang menuju lokasi
2.4 km lagi
Update terakhir 30 detik lalu
```

Tujuan utama Tracking adalah **understandable visibility**, bukan technical telemetry.

---

# 19. Provider Tracking Screen

Provider membutuhkan tampilan yang lebih operasional.

Minimal:

- order
- customer
- tujuan
- route
- Start Trip
- Arrived
- Start Service
- Pause
- Resume
- issue/report
- End Trip

Provider juga dapat melihat:

- GPS status
- network status
- tracking status
- ETA
- service requirement

---

# 20. Admin Tracking

Admin dapat melihat:

- order aktif
- provider aktif
- status perjalanan
- active tracking sessions
- delayed orders
- offline tracking
- last update
- issue

Admin tidak harus melihat seluruh raw location history secara bebas.

Akses harus mengikuti:

- role
- kebutuhan operasional
- privacy rule
- security policy

---

# 21. Geofence

Geofence dapat membantu mendeteksi kemungkinan provider sudah mendekati lokasi.

Namun geofence **tidak otomatis berarti check-in**.

Contoh:

```text
Provider masuk radius 100 m
↓
System detects nearby
↓
Provider confirms Arrived
↓
ARRIVED
```

Alasannya:

- provider bisa hanya melewati area
- lokasi customer bisa berupa gedung/kompleks
- GPS memiliki error
- provider tetap harus mengonfirmasi kedatangan

---

# 22. Tracking Event

Event utama:

```text
TRACKING_STARTED
LOCATION_UPDATED
TRACKING_OFFLINE
TRACKING_RECOVERED
ETA_UPDATED
ARRIVED
TRACKING_ENDED
SHARE_STARTED
SHARE_REVOKED
```

Event ini digunakan sebagai history dan sumber audit.

---

# 23. Tracking Timeline

Customer dapat melihat timeline event yang mudah dipahami.

Contoh:

```text
14:02
Provider mulai perjalanan

14:10
Provider sedang menuju lokasi

14:24
Provider tiba di area tujuan

14:27
Provider tiba

14:30
Service dimulai
```

Timeline customer tidak harus menampilkan seluruh technical event.

---

# 24. Tracking Session

Satu order dapat memiliki lebih dari satu session.

Contoh:

```text
Order
 ├── Tracking Session #1
 │   └── Provider menuju lokasi
 │
 ├── Tracking Session #2
 │   └── Pickup
 │
 └── Tracking Session #3
     └── Return
```

Hal ini penting untuk:

- emergency
- pickup & return
- multi-visit
- recurring
- project tertentu

---

# 25. Tracking Share

Customer dapat membagikan tracking kepada orang lain.

Contoh:

- keluarga
- pemilik rumah
- rekan kantor
- security
- penerima service

Tracking share harus menggunakan token akses terbatas.

### Share harus memiliki

- token
- expiration
- access scope
- created_at
- revoked_at
- creator

Customer dapat mencabut akses kapan saja.

---

# 26. Privacy Provider

Tracking provider hanya aktif saat diperlukan.

Prinsip:

```text
No Trip
→ No Live Location
```

Provider tidak boleh dilacak sepanjang hari hanya karena sedang login ke aplikasi.

Location tracking harus:

- purpose-limited
- time-limited
- service-related
- auditable

---

# 27. Privacy Customer

Data lokasi customer juga tidak boleh ditampilkan secara berlebihan.

Provider hanya mendapat lokasi yang relevan untuk service.

Informasi seperti:

- exact home location
- access details
- private notes

harus mengikuti kebutuhan service dan permission.

---

# 28. Tracking Failure

Tracking dapat gagal karena:

- GPS error
- network loss
- phone battery
- permission revoked
- application closed
- device issue
- server/realtime issue

Tracking failure harus ditangani sebagai masalah visibility, bukan otomatis sebagai kegagalan pekerjaan.

---

# 29. Service Execution Integration

Feature #8 bergantung pada event dari Feature #7.

Contoh:

```text
Service Execution
→ Provider Ready
→ Start Trip
→ Arrival
→ Service Started
→ In Progress
```

Tracking menampilkan event tersebut dalam bentuk yang mudah dipahami customer.

Tracking tidak menggantikan execution logic.

---

# 30. Tracking Source of Truth

Pembagian source of truth:

| Data | Source |
|---|---|
| Current movement | Tracking |
| Location | Tracking |
| ETA | Tracking |
| Arrival visibility | Tracking + Execution event |
| Service activity | Service Execution |
| Proof | Proof of Service |
| Completion | Completion |
| Price | Pricing / Quotation |
| Payment | Payment |
| Communication | Communication |
| Dispute | Complaint / Dispute |

---

# 31. Tracking Tidak Mengubah Harga

Tracking tidak boleh:

- menambah harga
- mengurangi harga
- membuat biaya perjalanan baru
- mengubah quotation
- membuat surcharge otomatis

Perubahan harga harus melalui Feature #4 dan approval yang sesuai.

---

# 32. Tracking Tidak Mengubah Payment

Tracking juga tidak boleh:

- charge customer
- release payment
- refund payment
- menentukan payout

Payment tetap ditangani oleh Feature #6.

---

# 33. Tracking dan Communication

Ketika terjadi event penting, Communication/Notification dapat mengirim informasi.

Contoh:

```text
Tracking Event
↓
ETA berubah signifikan
↓
Notification
↓
Customer mendapat notifikasi
```

Namun source event tetap berasal dari Tracking.

---

# 34. Notification Tracking

Notifikasi dapat digunakan untuk:

- provider started trip
- provider arriving soon
- provider arrived
- delay detected
- tracking offline
- tracking recovered
- service started

Notifikasi harus memiliki aturan agar tidak terlalu sering.

---

# 35. Tracking untuk Home Service

Home Service biasanya memiliki:

- GPS ✅
- Map ✅
- ETA ✅
- Distance ✅
- Travel Status ✅
- Service Progress ✅

Flow:

```text
Provider Ready
↓
Start Trip
↓
On The Way
↓
Arrived
↓
Service Active
↓
Progress
```

---

# 36. Tracking untuk Mobile Service

Mobile Service juga biasanya memiliki:

- GPS ✅
- ETA ✅
- map ✅
- progress ✅

Cocok untuk:

- mobile mechanic
- mobile AC service
- mobile cleaning
- technician

---

# 37. Tracking untuk Emergency

Emergency membutuhkan tracking yang lebih responsif.

Data yang penting:

- provider assigned
- current location
- ETA
- arrival
- active assistance

Emergency dapat memiliki beberapa session.

Contoh:

```text
Technician Session
+
Towing Session
```

---

# 38. Tracking untuk Workshop

Workshop tidak harus menggunakan GPS provider.

Lebih penting menampilkan:

```text
Vehicle Received
↓
Inspection
↓
Diagnosis
↓
Repair
↓
Testing
↓
Ready for Pickup
```

GPS hanya optional jika kendaraan dipindahkan.

---

# 39. Tracking untuk Remote Service

Remote service tidak menggunakan GPS.

Tracking menampilkan:

- session schedule
- provider ready
- session started
- in progress
- session ended

Contoh:

```text
Remote Session
14:00 scheduled
↓
Provider Ready
↓
Session Started
↓
In Progress
↓
Completed
```

---

# 40. Tracking untuk Pickup & Return

Pickup & Return membutuhkan tracking perjalanan dan status barang/asset.

Contoh:

```text
Pickup Assignment
↓
On The Way
↓
Picked Up
↓
In Service
↓
Ready to Return
↓
Return On The Way
↓
Delivered
```

---

# 41. Tracking untuk Project

Project tidak cocok menggunakan GPS terus-menerus.

Visibility lebih fokus pada:

- current milestone
- completed milestone
- percentage progress
- blocked task
- next milestone
- estimated schedule

Contoh:

```text
Survey ✓
Design ✓
Preparation ✓
Construction ●
Finishing ○
Handover ○
```

---

# 42. Tracking untuk Recurring Service

Recurring service dapat memiliki:

```text
Recurring Booking
↓
Occurrence #1
↓
Order #1
↓
Tracking Session
↓
Completed

Occurrence #2
↓
Order #2
↓
Tracking Session
```

Tracking harus dapat membedakan setiap occurrence.

---

# 43. Tracking pada Multi-visit Service

Satu order dapat memiliki beberapa kunjungan.

Contoh:

```text
Visit #1
Inspection

Visit #2
Repair

Visit #3
Testing
```

Setiap visit dapat memiliki session tracking sendiri.

---

# 44. Last Known Location

Ketika tracking kehilangan koneksi:

sistem dapat menyimpan:

- last latitude
- last longitude
- last timestamp
- last accuracy
- last known status

Customer harus diberi informasi waktu.

Contoh:

```text
Lokasi terakhir diperbarui 5 menit lalu.
```

---

# 45. Location History

Raw location points tidak harus disimpan selamanya.

Kebijakan retention perlu mempertimbangkan:

- privacy
- storage
- audit
- dispute
- operational needs

Current location dapat bersifat short-lived.

Ringkasan event dapat disimpan lebih lama daripada raw GPS.

---

# 46. Tracking Accuracy pada Support

Tracking data dapat membantu customer support memahami kondisi order.

Contoh:

- provider benar-benar bergerak
- provider sudah tiba
- tracking offline
- ada jeda lama
- ETA berubah

Namun support tidak boleh mengambil kesimpulan hanya dari satu titik GPS.

---

# 47. Tracking Dispute Evidence

Tracking dapat menjadi **supporting evidence**.

Contoh:

- timestamp provider arrive
- tracking start
- travel duration
- last update

Tracking bukan satu-satunya sumber kebenaran dalam dispute.

Bukti lain dapat berasal dari:

- Proof of Service
- Communication
- Service Execution
- payment history

---

# 48. Tracking Security

Endpoint tracking harus dilindungi.

Minimal:

- authentication
- authorization
- signed access/token
- expiration
- rate limiting
- audit log

Customer hanya boleh melihat tracking order miliknya.

Provider hanya boleh mengelola tracking order yang menjadi tanggung jawabnya.

---

# 49. Tracking Visibility Rule

Visibility dapat dibedakan berdasarkan role.

| Data | Customer | Provider | Admin |
|---|---:|---:|---:|
| Status | ✅ | ✅ | ✅ |
| ETA | ✅ | ✅ | ✅ |
| Map | ✅ | ✅ | ✅ |
| Current location | ✅ Limited | ✅ | ✅ Controlled |
| Raw GPS | ❌ | Limited | Controlled |
| Route | ✅ | ✅ | ✅ |
| Timeline | ✅ | ✅ | ✅ |
| Internal notes | ❌ | ✅ | ✅ |
| Tracking events | Simplified | ✅ | ✅ |

---

# 50. Tracking State vs Event

Sistem harus membedakan:

### Current State

Contoh:

```text
status = ON_THE_WAY
eta = 14:35
last_updated = 14:22
```

### Event

Contoh:

```text
14:22 LOCATION_UPDATED
14:20 ETA_UPDATED
14:05 TRACKING_STARTED
```

Current state digunakan untuk UI realtime.

Event digunakan untuk history dan audit.

---

# 51. Data Model Concept

Entitas utama:

```text
tracking_sessions
tracking_points
tracking_current_state
tracking_events
tracking_shares
tracking_visibility_rules
```

### tracking_sessions

Menyimpan session perjalanan/service.

Contoh field:

- tracking_session_id
- order_id
- session_type
- started_at
- ended_at
- status
- created_by

### tracking_points

Menyimpan titik lokasi.

Contoh:

- tracking_point_id
- tracking_session_id
- latitude
- longitude
- accuracy
- speed
- heading
- recorded_at

### tracking_current_state

Menyimpan state terbaru.

Contoh:

- tracking_session_id
- status
- current_latitude
- current_longitude
- last_updated_at
- accuracy
- eta
- estimated_arrival_at
- remaining_distance

---

# 52. tracking_events

Contoh field:

- tracking_event_id
- tracking_session_id
- event_type
- actor_id
- event_source
- metadata
- created_at

`event_source` dapat membedakan:

```text
GPS
SYSTEM
PROVIDER
ADMIN
```

---

# 53. tracking_shares

Contoh field:

- share_id
- tracking_session_id
- token
- access_scope
- expires_at
- created_by
- revoked_at
- created_at

---

# 54. Visibility Rules

Sistem dapat mengatur data apa yang boleh terlihat.

Contoh:

```text
CUSTOMER
→ current status
→ ETA
→ map
→ provider identity

PROVIDER
→ destination
→ route
→ customer location
→ service requirement

ADMIN
→ operational tracking
→ delayed orders
→ issue
```

---

# 55. Event Flow

Contoh:

```text
Provider taps START TRIP
        ↓
Execution Event
        ↓
Tracking Session Created
        ↓
Tracking Status = STARTING
        ↓
GPS updates received
        ↓
Tracking Status = ON_THE_WAY
        ↓
ETA calculated
        ↓
Customer UI updated
```

---

# 56. Arrival Flow

```text
Provider near destination
        ↓
Geofence / proximity signal
        ↓
Provider confirms ARRIVED
        ↓
Tracking Event ARRIVED
        ↓
Tracking Status ARRIVED
        ↓
Customer receives notification
        ↓
Execution proceeds to check-in
```

---

# 57. Service Progress Flow

```text
Execution Service Started
        ↓
Tracking Status SERVICE_ACTIVE
        ↓
Execution Progress Event
        ↓
Customer sees simplified progress
        ↓
Testing / Completion Pending
```

Tracking hanya mempresentasikan progress yang memang berasal dari execution.

---

# 58. Pause

Service dapat mengalami pause.

Contoh:

- menunggu material
- customer unavailable
- power issue
- weather
- safety issue
- provider break

Tracking dapat menampilkan:

```text
Service Paused
Reason: Menunggu material
```

Reason yang sensitif/internal tidak harus ditampilkan.

---

# 59. Blocked

Jika execution terblokir:

```text
SERVICE_ACTIVE
↓
BLOCKED
```

Customer harus mendapat informasi yang relevan.

Contoh:

```text
Service tertunda sementara karena membutuhkan material tambahan.
```

Detail teknis internal tetap berada di execution/provider side.

---

# 60. Safety Stop

Jika ada safety stop:

```text
IN_PROGRESS
↓
SAFETY_STOP
```

Tracking dapat menunjukkan:

```text
Service dihentikan sementara karena kondisi keselamatan.
```

Detail internal ditangani melalui execution dan support workflow.

---

# 61. Delayed Provider

Ketika provider terlambat:

```text
ETA Updated
↓
Delay Threshold Reached
↓
Status DELAYED
↓
Notification
```

Customer melihat:

- status
- estimasi terbaru
- waktu update

Tidak boleh ada informasi yang menuduh tanpa dasar.

---

# 62. Tracking Recovery

Ketika koneksi kembali:

```text
TRACKING_OFFLINE
↓
Network Recovered
↓
TRACKING_RECOVERED
↓
Location Update
↓
Live Tracking Active
```

UI dapat kembali ke status realtime setelah data baru diterima.

---

# 63. Tracking End

Tracking travel dapat berakhir ketika:

```text
Provider Arrived
```

Kemudian execution mengambil alih.

Tracking session dapat berakhir:

```text
TRACKING_ENDED
```

Tidak berarti order selesai.

---

# 64. Multiple Tracking Sessions

Contoh emergency:

```text
Order #SV-001

Session 1
Technician → Customer

Session 2
Tow Truck → Workshop

Session 3
Workshop → Customer
```

Semua session tetap terhubung ke order yang sama.

---

# 65. Tracking dan Assignment

Jika business provider memiliki beberapa worker:

```text
Provider
↓
Assign Worker
↓
Worker
↓
Start Trip
↓
Tracking Session
```

Tracking harus mengikuti worker/provider yang menjalankan execution.

Jika worker diganti sebelum atau selama execution, assignment event perlu dicatat.

---

# 66. Worker Reassignment

Contoh:

```text
Worker A assigned
↓
Worker A issue
↓
Admin/Provider reassign
↓
Worker B assigned
↓
New tracking session / updated assignment
```

History assignment tetap dipertahankan.

---

# 67. Tracking dan Cancellation

Tracking tidak melakukan cancellation secara otomatis.

Jika order dibatalkan:

```text
Order CANCELLED
↓
Active Tracking Session
↓
Tracking Ended
```

Alasan cancellation ditentukan oleh Order/Cancellation Policy.

---

# 68. Tracking dan Reschedule

Jika jadwal berubah:

```text
Schedule Changed
↓
Tracking Not Started
```

Tracking baru aktif ketika provider benar-benar mulai perjalanan pada jadwal baru.

---

# 69. Tracking dan No-show

Jika customer atau provider no-show:

Tracking dapat memberikan bukti pendukung:

- arrive timestamp
- location proximity
- check-in event

Namun final status no-show tetap mengikuti policy dan execution/order workflow.

---

# 70. Customer UX Principle

Tracking Detail harus:

- sederhana
- mudah dipahami
- tidak terlalu teknis
- fokus pada hal penting
- transparan mengenai waktu update
- jelas ketika data tidak realtime

Customer tidak perlu memahami istilah seperti:

- latitude
- longitude
- websocket
- polling
- heading

Customer cukup melihat:

```text
Provider sedang menuju lokasi
ETA 14:35
2.4 km lagi
Update terakhir 30 detik lalu
```

---

# 71. Tracking Matrix

| Service Mode | GPS | ETA | Map | Progress |
|---|---:|---:|---:|---:|
| Home Service | ✅ | ✅ | ✅ | ✅ |
| Mobile Service | ✅ | ✅ | ✅ | ✅ |
| Emergency | ✅ | ✅ | ✅ | ✅ |
| Workshop | ❌ / Optional | Optional | Optional | ✅ |
| Remote / Online | ❌ | ❌ | ❌ | ✅ |
| On-site | ✅ jika travel | ✅ | ✅ | ✅ |
| Pickup & Return | ✅ | ✅ | ✅ | ✅ |
| Project | Optional | Optional | Optional | ✅ |

---

# 72. Boundary dengan Feature #7 — Service Execution

### Service Execution menjawab:

> "Provider sedang melakukan apa?"

Contoh:

```text
Inspection
Repair
Testing
Pause
Blocked
```

### Tracking menjawab:

> "Customer bisa melihat apa yang sedang terjadi?"

Contoh:

```text
On The Way
Arrived
Service Active
Progress 60%
ETA
```

Tracking mengambil event dari execution lalu membuatnya customer-friendly.

---

# 73. Boundary dengan Feature #9 — Proof of Service

Tracking menjawab:

> "Di mana / statusnya bagaimana?"

Proof menjawab:

> "Apa bukti pekerjaannya?"

Contoh:

```text
Tracking
Provider arrived 14:25

Proof
Foto sebelum/sesudah
Checklist
Signature
Video
```

Tracking tidak menggantikan proof.

---

# 74. Boundary dengan Feature #10 — Completion

Tracking:

```text
SERVICE ACTIVE
↓
COMPLETION_PENDING
```

Proof:

```text
Proof Submitted
```

Completion:

```text
Customer Confirmation
↓
Order Completed
```

Artinya:

```text
Tracking ≠ Proof
Tracking ≠ Completion
```

---

# 75. FINAL LOCKED PRINCIPLES

Feature #8 Tracking Detail secara final mengikuti prinsip berikut:

1. Tracking adalah visibility layer.
2. Tracking bukan sekadar GPS.
3. Tracking membaca event dari execution.
4. GPS hanya aktif ketika memang diperlukan.
5. Booking tidak mengaktifkan GPS.
6. Travel tracking dimulai ketika provider memulai perjalanan.
7. Satu order dapat memiliki beberapa tracking session.
8. Live location bersifat time-limited dan service-related.
9. Customer melihat informasi yang sederhana, bukan raw telemetry.
10. ETA adalah estimasi.
11. Last Updated wajib ditampilkan ketika realtime tidak tersedia.
12. Offline harus dibedakan dari GPS unavailable.
13. Tracking failure bukan otomatis service failure.
14. Manual fallback diperbolehkan.
15. Geofence membantu, tetapi tidak otomatis sama dengan check-in.
16. Tracking memiliki status dan event yang berbeda.
17. Current state untuk UI realtime.
18. Event untuk history/audit.
19. Admin memiliki visibility operasional terkontrol.
20. Provider memiliki kontrol Start Trip/Arrived dan status relevan.
21. Customer dapat melihat progress service yang relevan.
22. Workshop lebih fokus pada asset/service lifecycle.
23. Remote lebih fokus pada session lifecycle.
24. Project lebih fokus pada milestone.
25. Pickup & Return membutuhkan pickup dan return tracking.
26. Emergency dapat memiliki beberapa session.
27. Recurring membedakan tracking per occurrence.
28. Multi-visit dapat memiliki beberapa tracking session.
29. Provider/worker assignment harus tercatat.
30. Worker reassignment harus tercatat.
31. Location accuracy harus diperhatikan.
32. Sistem tidak boleh membuat false precision.
33. Notification dapat dipicu oleh tracking event.
34. Chat tetap berada di Communication.
35. Pricing tetap berada di Pricing & Quotation.
36. Payment tetap berada di Payment & Protection.
37. Dispute dapat menggunakan tracking sebagai supporting evidence.
38. Proof of Service tetap menjadi sumber bukti pekerjaan.
39. Completion tetap menentukan penyelesaian resmi order.
40. Tracking tidak boleh membuat keputusan penalti sendiri.
41. Tracking tidak boleh membatalkan order sendiri.
42. Tracking tidak boleh mengubah harga sendiri.
43. Tracking tidak boleh memproses payment sendiri.
44. Privacy customer harus dijaga.
45. Privacy provider harus dijaga.
46. Raw GPS retention harus dibatasi.
47. Access tracking share harus memiliki expiration.
48. Tracking share dapat direvoke.
49. Endpoint tracking harus diautentikasi.
50. Authorization wajib berdasarkan role/order.
51. Tracking harus tahan terhadap network issue.
52. Realtime dapat memiliki polling fallback.
53. Data terakhir harus tetap konsisten.
54. Status customer-facing harus human-readable.
55. Technical event tidak harus seluruhnya ditampilkan.
56. Delay detection adalah bantuan visibility.
57. Smart system hanya membantu mendeteksi dan memberi insight.
58. Smart system tidak menjadi pengambil keputusan akhir.
59. Tracking harus mengikuti Service Mode.
60. Tidak semua service membutuhkan map.
61. Tidak semua service membutuhkan ETA.
62. Tidak semua service membutuhkan live location.
63. Tracking dapat digunakan sebagai operational monitoring.
64. Support dapat menggunakan tracking untuk investigasi.
65. Tracking session memiliki lifecycle sendiri.
66. Tracking session dapat berakhir tanpa order selesai.
67. Arrival tidak otomatis berarti service started.
68. Service started tidak otomatis berarti order completed.
69. Completion pending menandakan handoff menuju Proof/Completion.
70. Event dan state harus dapat diaudit.
71. UI harus memberi konteks waktu yang jelas.
72. Customer tidak boleh melihat lokasi provider di luar kebutuhan service.
73. Provider hanya menerima lokasi customer sesuai kebutuhan operasional.
74. Tracking harus terintegrasi tetapi tetap memiliki boundary yang jelas.
75. **Tracking Detail menjadi lapisan visibility antara Service Execution dan Customer, bukan pengganti execution, proof, maupun completion.**

---

# 76. Ringkasan Arsitektur

```text
BOOKING
   ↓
ORDER
   ↓
PAYMENT / CONFIRMATION
   ↓
SERVICE EXECUTION
   ↓
┌─────────────────────────────┐
│      TRACKING DETAIL #8     │
│                             │
│ Travel Tracking             │
│ Current Location            │
│ ETA / Distance              │
│ Arrival                     │
│ Service Progress Visibility │
│ Tracking Session            │
│ Timeline / Events           │
│ Share Tracking              │
└─────────────────────────────┘
   ↓
PROOF OF SERVICE #9
   ↓
COMPLETION #10
   ↓
RATING / REVIEW #11
```

---

# 77. Konsep Final Singkat

> **Tracking Detail adalah fitur visibility yang membuat customer dapat memahami perjalanan dan perkembangan service secara realtime atau near-realtime ketika data tersedia, dengan tetap menjaga privasi dan membedakan fungsi tracking dari execution, proof, completion, pricing, dan payment.**

**STATUS: LOCKED ✅**
