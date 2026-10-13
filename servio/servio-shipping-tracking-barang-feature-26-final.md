# SERVIO — FEATURE #26
# Shipping & Tracking Barang

**Status:** 🔒 LOCKED / FINAL  
**Roadmap:** #26 dari 27  
**Domain:** Product / Barang  
**Depends On:** #22 Order Barang, #23 Payment Barang, #24 Inventory, #25 Fulfillment Barang  
**Next:** #27 Return / Refund

---

## 1. Definisi Feature

**Shipping & Tracking (#26)** adalah domain yang menangani perpindahan barang secara fisik dari lokasi asal menuju lokasi tujuan setelah proses fulfillment siap dilakukan.

Feature ini mencakup:

- pembuatan shipment,
- pemilihan dan penugasan carrier,
- pickup / handover,
- perpindahan barang,
- tracking timeline,
- ETA,
- delivery attempt,
- delivery confirmation,
- shipping exception,
- proof of delivery (POD),
- shipping hold,
- shipping SLA,
- integrasi carrier API / webhook,
- tracking sharing,
- shipping analytics.

### Definisi sederhana

```text
#24 Inventory
"Barangnya ada."

#25 Fulfillment
"Barang sudah dipick, dicek, dikemas, siap diserahkan."

#26 Shipping & Tracking
"Barang sudah dikirim, sekarang ada di mana, dan kapan sampai?"

#27 Return / Refund
"Kalau ada masalah setelah transaksi, bagaimana pengembaliannya?"
```

---

# 2. Tujuan Feature

Feature #26 bertujuan memastikan bahwa setelah barang siap dikirim:

1. shipment dapat dibuat dengan benar,
2. carrier dapat ditentukan,
3. barang dapat diserahkan ke carrier,
4. status pengiriman dapat dilacak,
5. customer dapat melihat progres,
6. ETA dapat diperbarui,
7. delivery attempt dapat direkam,
8. exception dapat ditangani,
9. delivery dapat dibuktikan,
10. seluruh aktivitas shipping memiliki audit trail.

---

# 3. Batasan Feature

## 3.1 Yang Menjadi Scope #26

#26 menjadi source of truth untuk:

- Shipment
- Shipment Number
- Carrier Assignment
- Tracking Number
- Shipping Method
- Tracking Timeline
- Shipment Status
- Current Shipment State
- ETA Context
- Delivery Attempt
- Delivery Failure
- Proof of Delivery
- Shipping Exception
- Shipping Hold
- Shipping SLA
- Shipment Events
- Tracking Sharing

## 3.2 Yang Bukan Source of Truth #26

| Domain | Source of Truth |
|---|---|
| Product | #20 Product Discovery |
| Cart | #21 Cart |
| Order | #22 Order Barang |
| Booking | #22B Booking Barang |
| Payment | #23 Payment Barang |
| Inventory | #24 Inventory |
| Fulfillment | #25 Fulfillment |
| Return / Refund | #27 Return / Refund |
| Service Execution | #7 Service Execution |
| Proof of Service | #9 Proof of Service |
| Asset | #15 Asset |
| Service History | #14 Service History |

---

# 4. Batasan Antar Feature

## #25 Fulfillment vs #26 Shipping

### #25 Fulfillment

Fokus:

> **PREPARE**

Menjawab:

> "Apakah barang sudah diproses dan siap diserahkan?"

Meliputi:

- picking,
- verification,
- packing,
- quality check,
- package creation,
- handover preparation.

### #26 Shipping

Fokus:

> **MOVE & TRACK**

Menjawab:

> "Barang sudah dikirim atau belum, sekarang di mana, dan bagaimana status pengirimannya?"

Meliputi:

- carrier,
- pickup,
- transit,
- tracking,
- ETA,
- delivery attempt,
- delivery,
- POD,
- shipping exception.

---

# 5. Entity Distinction

Konsep berikut harus dipisahkan.

```text
Product
    ↓
Order
    ↓
Fulfillment
    ↓
Package
    ↓
Shipment
    ↓
Tracking Events
    ↓
Delivery
```

## Product

Barang yang dijual / tersedia dalam catalog.

## Order

Transaksi komersial customer.

## Fulfillment

Aktivitas memproses dan menyiapkan barang.

## Package

Objek fisik hasil packing.

## Shipment

Transaksi perpindahan package menuju tujuan.

## Tracking Event

Peristiwa yang terjadi selama shipment.

## Shipment Status

Kondisi shipment saat ini.

## Tracking Number

Nomor pelacakan yang berasal dari carrier atau sistem shipping.

### Important

```text
Shipment ID ≠ Tracking Number
```

Servio memiliki ID shipment sendiri, sedangkan tracking number merupakan identifier tracking yang digunakan dalam jaringan pengiriman.

---

# 6. Relationship Shipment dengan Order

Satu order:

```text
1 Order
   ↓
1 Shipment
```

bisa terjadi, tetapi bukan satu-satunya kemungkinan.

Sistem harus mendukung:

```text
1 Order
   ↓
Multiple Shipments
```

Contoh:

```text
Order #ORD-1001
├── Shipment #SHP-001
│   └── Package A
│
└── Shipment #SHP-002
    └── Package B
```

Ini diperlukan untuk:

- split fulfillment,
- multi-seller,
- multi-location,
- stok berasal dari lokasi berbeda,
- partial fulfillment,
- package dengan waktu pengiriman berbeda.

---

# 7. Relationship Package dengan Shipment

Satu shipment dapat memiliki:

```text
1 Shipment
   ↓
1 Package
```

atau:

```text
1 Shipment
   ↓
Multiple Packages
```

Contoh:

```text
Shipment #SHP-001

Package A
Package B
Package C
```

Package tetap berasal dari proses fulfillment #25.

---

# 8. Shipping Method

Servio dapat menggunakan beberapa level layanan pengiriman.

### MVP

- STANDARD
- EXPRESS
- SAME_DAY
- SCHEDULED
- ECONOMY

### Catatan

Daftar final dapat dikontrol oleh platform agar konsisten secara global.

Shipping method tidak otomatis berarti carrier tertentu.

Contoh:

```text
STANDARD
→ JNE

STANDARD
→ J&T

STANDARD
→ SiCepat
```

Carrier yang digunakan ditentukan melalui proses carrier selection / assignment.

---

# 9. Delivery Method

Delivery method menjelaskan siapa yang melakukan pengiriman.

MVP:

- COURIER
- LOGISTICS_PARTNER
- SELLER_DELIVERY
- SERVIO_DELIVERY

Contoh:

```text
Shipping Method:
EXPRESS

Delivery Method:
LOGISTICS_PARTNER

Carrier:
Carrier X
```

---

# 10. Carrier

Carrier adalah pihak yang melakukan perpindahan shipment.

Carrier dapat berasal dari:

- logistics partner,
- courier,
- seller,
- Servio delivery operation,
- partner fulfillment.

## Faktor Carrier Assignment

Pemilihan carrier dapat mempertimbangkan:

- destination,
- service level,
- package weight,
- package dimensions,
- seller capability,
- carrier coverage,
- cost,
- ETA,
- availability,
- service area.

### AI

AI dapat memberikan rekomendasi carrier.

Namun:

```text
AI Recommendation
        ↓
Business Rules
        ↓
Carrier Validation
        ↓
Final Assignment
```

AI bukan source of truth.

AI tidak boleh:

- mengarang carrier,
- mengarang tracking number,
- mengarang availability,
- mengarang ETA,
- menandai delivered tanpa evidence.

---

# 11. Shipping Fee

Shipping charge dapat dipengaruhi oleh:

- carrier rate,
- shipping method,
- distance,
- origin,
- destination,
- weight,
- dimensions,
- package count,
- service level,
- seller shipping rule,
- platform shipping rule.

Customer sebaiknya mengetahui delivery charge sebelum order dikonfirmasi.

### Boundary

```text
#22 Order
→ menyimpan konteks komersial charge pada transaksi

#26 Shipping
→ mengeksekusi shipment berdasarkan shipping method/carrier/rate
```

Tidak ada tax calculation dalam scope feature ini.

---

# 12. Shipment Creation Flow

Flow utama:

```text
#25 Fulfillment
       ↓
READY_FOR_SHIPPING
       ↓
Create Shipment
       ↓
Select Shipping Method
       ↓
Assign Carrier
       ↓
Generate Tracking
       ↓
Pickup
       ↓
Transit
       ↓
Delivery
```

---

# 13. Shipment Creation Preconditions

Shipment hanya dapat dibuat apabila requirement yang diperlukan sudah terpenuhi.

Contoh:

- fulfillment sudah siap,
- package sudah tersedia,
- shipping destination tersedia,
- seller / origin valid,
- shipment method tersedia,
- carrier tersedia apabila diwajibkan,
- payment requirement terpenuhi sesuai policy,
- booking slot terpenuhi bila menggunakan scheduled shipping.

### Important

```text
PAID != SHIPPED
```

Payment berhasil tidak otomatis berarti shipment sudah dikirim.

Untuk COD:

```text
ORDER CONFIRMED
↓
FULFILLMENT
↓
SHIPMENT
↓
DELIVERY
↓
PAYMENT COLLECTION
```

sesuai policy dan integrasi pembayaran yang digunakan.

---

# 14. Shipment Status

## Core Status

```text
CREATED
READY_FOR_PICKUP
PICKUP_REQUESTED
PICKED_UP
IN_TRANSIT
AT_SORTING_CENTER
ARRIVED_AT_DESTINATION
OUT_FOR_DELIVERY
DELIVERY_ATTEMPTED
DELIVERED
FAILED
ON_HOLD
CANCELLED
LOST
DAMAGED
RETURN_TO_SENDER
```

## Normal Flow

```text
CREATED
   ↓
READY_FOR_PICKUP
   ↓
PICKED_UP
   ↓
IN_TRANSIT
   ↓
ARRIVED_AT_DESTINATION
   ↓
OUT_FOR_DELIVERY
   ↓
DELIVERED
```

Tidak semua carrier akan mengirim semua status.

Servio harus melakukan normalization:

```text
Carrier Status
      ↓
Mapping Layer
      ↓
Servio Shipment Status
```

---

# 15. Shipment Status vs Tracking Event

Keduanya harus dipisahkan.

## Shipment Status

Menunjukkan current state.

Contoh:

```text
IN_TRANSIT
```

## Tracking Event

Menunjukkan event historis.

Contoh:

```text
ARRIVED_AT_HUB
DEPARTED_HUB
OUT_FOR_DELIVERY
```

Dengan demikian:

```text
Current State
    =
Shipment Status

History
    =
Tracking Events
```

---

# 16. Tracking Events

## Minimum Tracking Events

```text
SHIPMENT_CREATED
CARRIER_ASSIGNED
PICKUP_REQUESTED
PICKED_UP
DEPARTED_ORIGIN
IN_TRANSIT
ARRIVED_AT_HUB
DEPARTED_HUB
ARRIVED_DESTINATION
OUT_FOR_DELIVERY
DELIVERY_ATTEMPTED
DELIVERED
```

## Exception Events

```text
DELAYED
LOST
DAMAGED
RETURN_TO_SENDER
SHIPMENT_CANCELLED
```

## Event Metadata

Tracking event idealnya menyimpan:

- event type,
- carrier status,
- location,
- event time,
- received time,
- source,
- carrier reference,
- raw carrier status,
- shipment id.

### Important

```text
event_time != received_at
```

Karena event carrier dapat diterima Servio terlambat.

---

# 17. Event Source

Tracking event dapat datang dari:

- carrier API,
- carrier webhook,
- Servio system,
- manual admin,
- seller,
- courier integration.

Source harus disimpan untuk traceability.

Contoh:

```text
source = CARRIER_WEBHOOK
```

atau:

```text
source = ADMIN_MANUAL
```

---

# 18. Idempotency

Critical shipping events harus idempotent.

Contoh carrier mengirim webhook yang sama dua kali:

```text
DELIVERED
DELIVERED
```

Servio tidak boleh membuat dua delivery state yang berbeda.

Sistem harus mendeteksi duplicate event menggunakan:

- event ID,
- carrier reference,
- event fingerprint,
- idempotency key,
- atau kombinasi identifier lain.

---

# 19. Out-of-Order Events

Carrier dapat mengirim event tidak berurutan.

Contoh:

```text
IN_TRANSIT
↓
OUT_FOR_DELIVERY
↓
ARRIVED_AT_HUB
```

Servio tidak boleh secara sembarangan mengembalikan current status ke state lama.

Historical event tetap boleh disimpan sebagai history, tetapi current state harus divalidasi dengan transition rule.

---

# 20. ETA

ETA = Estimated Time of Arrival.

ETA dapat berupa:

- estimated date,
- estimated timestamp,
- delivery window.

Contoh:

```text
Estimated:
20 September 2026
10:00–14:00
```

### ETA adalah estimate

```text
ETA ≠ guaranteed delivery
```

Kecuali terdapat policy tertentu yang memang memberikan guaranteed delivery.

---

# 21. ETA Source

ETA dapat berasal dari:

- carrier API,
- carrier tracking,
- routing system,
- historical transit,
- service level,
- destination,
- delivery area,
- traffic data,
- shipping operation model.

AI dapat digunakan untuk memperbaiki estimasi, tetapi ETA yang ditampilkan customer harus tetap berasal dari sistem yang tervalidasi.

---

# 22. ETA Update

ETA dapat berubah.

Contoh:

```text
Initial ETA:
20 September

Updated ETA:
21 September
```

Jika perubahan signifikan terjadi, customer dapat diberikan notifikasi.

---

# 23. ETA Confidence

Opsional tetapi disarankan:

```text
HIGH
MEDIUM
LOW
```

Contoh:

```text
ETA:
20 September

Confidence:
MEDIUM
```

Confidence tidak berarti probabilitas yang harus ditampilkan sebagai angka jika sistem belum memiliki model yang valid.

---

# 24. Shipping Delay State

Delay state dipisahkan dari shipment status.

```text
ON_TIME
AT_RISK
DELAYED
```

Contoh:

```text
Shipment Status:
IN_TRANSIT

Delay Status:
AT_RISK
```

atau:

```text
Shipment Status:
IN_TRANSIT

Delay Status:
DELAYED
```

### Important

```text
DELAYED ≠ automatic carrier fault
```

Alasan delay harus dicatat bila tersedia.

---

# 25. Delivery Attempt

Shipment dapat mengalami delivery attempt sebelum berhasil delivered.

Status:

```text
DELIVERY_ATTEMPTED
```

## Delivery Attempt Reasons

```text
CUSTOMER_UNAVAILABLE
ADDRESS_NOT_FOUND
ADDRESS_ACCESS_ISSUE
RECIPIENT_REJECTED
OTHER
```

## Possible Resolution

- retry,
- reschedule,
- contact customer,
- update delivery instructions,
- return to origin.

### Important

```text
Delivery Attempted ≠ Order Failed
```

---

# 26. Delivery Failure

Delivery failure adalah kondisi ketika shipment gagal mencapai tujuan.

Contoh:

```text
ADDRESS_NOT_FOUND
CUSTOMER_UNAVAILABLE
CARRIER_REJECTED
DELIVERY_AREA_ISSUE
```

Delivery failure tidak selalu berarti order harus dibatalkan.

Possible outcomes:

```text
Retry
Reschedule
Change Carrier
Update Address
Return to Sender
```

---

# 27. Reschedule

Reschedule dapat digunakan untuk:

- scheduled shipping,
- failed delivery,
- customer unavailable,
- operational delay.

Reschedule harus menyimpan:

- old schedule,
- new schedule,
- reason,
- requester,
- timestamp,
- policy reference.

History tidak boleh di-overwrite.

---

# 28. Shipping Exceptions

Exception adalah masalah atau kondisi abnormal dalam shipment.

## Supported Exceptions

```text
PICKUP_FAILED
CARRIER_REJECTED
ADDRESS_ISSUE
DELAY
LOST
DAMAGED
DELIVERY_FAILED
CUSTOMER_UNAVAILABLE
RETURN_TO_SENDER
SYSTEM_ERROR
```

Exception memiliki:

- severity,
- status,
- reason,
- source,
- created_at,
- resolved_at,
- actor.

---

# 29. Shipping Hold

Shipment dapat ditahan sementara.

Contoh alasan:

- address issue,
- payment issue sesuai policy,
- carrier issue,
- damaged package,
- security review,
- operational issue.

Status:

```text
ON_HOLD
```

Hold tidak otomatis berarti shipment cancelled.

---

# 30. Lost Shipment

Jika shipment hilang:

```text
Shipment
↓
Exception
↓
Investigation
↓
Possible Resolution
```

Possible resolution:

- carrier investigation,
- replacement shipment,
- re-ship,
- claim,
- refund workflow,
- alternative resolution.

### Important

```text
LOST ≠ automatic immediate refund
```

Refund mengikuti #27 dan policy yang berlaku.

---

# 31. Damaged Shipment

Jika shipment rusak:

```text
DAMAGED
↓
Evidence
↓
Investigation
↓
Complaint / Return / Refund / Replacement
```

Evidence dapat menggunakan:

- package photo,
- delivery photo,
- POD,
- customer report,
- carrier report,
- timestamp,
- shipping event.

---

# 32. Return to Sender

Jika shipment gagal dikirim dan harus kembali:

```text
OUT_FOR_DELIVERY
↓
DELIVERY_FAILED
↓
RETURN_TO_SENDER
```

Return-to-sender dapat diteruskan ke:

```text
#27 Return / Refund
```

dan untuk kondisi tertentu:

```text
#24 Inventory
```

untuk disposition stok setelah barang kembali.

---

# 33. Proof of Delivery (POD)

POD adalah bukti bahwa shipment telah diterima / delivery telah dilakukan.

POD dapat berupa:

- recipient name,
- signature,
- OTP,
- photo,
- timestamp,
- location context,
- carrier delivery event.

## POD ≠ Proof of Service

```text
POD (#26)
→ bukti barang berhasil dikirim / diterima

Proof of Service (#9)
→ bukti pekerjaan jasa dilakukan
```

Keduanya tidak boleh digabung sebagai satu domain.

---

# 34. Delivered vs Order Completed

Status:

```text
DELIVERED
```

tidak otomatis berarti:

```text
ORDER COMPLETED
```

Contoh:

```text
Shipment
↓
DELIVERED
↓
Customer Review / Confirmation
↓
Order Completion
```

Customer masih dapat memiliki:

- delivery complaint,
- damage report,
- return,
- refund,
- dispute.

---

# 35. Real-Time Tracking

Tidak semua carrier menyediakan posisi GPS real-time.

Servio mendukung:

```text
LIVE
PERIODIC
EVENT_BASED
NO_LIVE_LOCATION
```

## LIVE

Posisi dapat diperbarui secara berkala dan relatif real-time.

## PERIODIC

Lokasi diperbarui pada interval tertentu.

## EVENT_BASED

Tracking berubah ketika ada event carrier.

## NO_LIVE_LOCATION

Carrier tidak menyediakan live location.

### Important

Sistem tidak boleh mengarang lokasi.

```text
NO DATA
≠
FAKE GPS
```

Jika data stale:

> Menampilkan last known update lebih baik daripada membuat posisi fiktif.

---

# 36. Tracking Data Freshness

Tracking UI sebaiknya menunjukkan:

- last updated,
- last known location,
- source,
- tracking availability.

Contoh:

```text
Last updated:
10:42 WIB

Current:
In Transit
```

---

# 37. Carrier API / Webhook Integration

Flow:

```text
Servio
   ↓
Carrier API
   ↓
Shipment Events
   ↓
Webhook / Polling
   ↓
Servio Mapping
   ↓
Persist Event
   ↓
Update Shipment State
   ↓
Notify Customer
```

---

# 38. Webhook Handling

Webhook processing:

```text
Receive
↓
Validate
↓
Identify Shipment
↓
Map Carrier Status
↓
Persist Event
↓
Update Current State
↓
Emit Domain Event
```

Harus mendukung:

- signature verification jika tersedia,
- authentication,
- idempotency,
- duplicate detection,
- retry,
- dead-letter handling,
- audit logging.

---

# 39. API Failure

Jika carrier API / webhook mengalami masalah:

```text
Tracking API Down
```

tidak boleh otomatis menghasilkan:

```text
Shipment FAILED
```

System dapat:

- retry,
- polling,
- queue ulang,
- gunakan last known state,
- tampilkan tracking stale,
- tampilkan unavailable.

---

# 40. Shipping Tracking Timeline

Customer harus dapat melihat timeline.

Contoh:

```text
20 Sep 08:00
Shipment picked up

20 Sep 11:30
Arrived at sorting center

20 Sep 15:00
Departed sorting center

21 Sep 08:00
Out for delivery

21 Sep 11:20
Delivered
```

Timeline harus mempertahankan histori event.

---

# 41. Tracking Page — Customer

Customer dapat melihat:

### Shipment Identity

- shipment number,
- order reference,
- tracking number,
- carrier,
- shipping method.

### Current State

- current status,
- current location jika tersedia,
- last updated.

### ETA

- estimated date,
- estimated time window,
- confidence bila tersedia,
- delay state.

### Timeline

- semua tracking events yang customer berhak lihat.

### Delivery

- delivery attempt,
- delivery result,
- POD bila tersedia.

### Actions

- view tracking,
- share tracking,
- report delivery issue,
- contact support.

---

# 42. Provider View

Provider dapat melihat shipment yang terkait dengan:

- service-related product,
- maintenance requirement,
- provider inventory,
- provider-owned material.

Provider dapat melihat:

- shipment status,
- ETA,
- tracking number,
- destination,
- package status,
- delivery confirmation.

Akses dibatasi berdasarkan relation / authorization.

---

# 43. Worker View

Worker / technician dapat melihat shipment yang memang ditugaskan atau berkaitan dengan pekerjaan.

Contoh:

```text
AC Repair
↓
Replacement Part
↓
Shipment
↓
Worker receives item
```

Worker dapat melihat:

- shipment status,
- package,
- destination,
- ETA,
- handover status.

Tidak semua worker memiliki akses seluruh shipment platform.

---

# 44. Merchant / Supplier View

Merchant / Supplier dapat:

- melihat shipment miliknya,
- mengelola shipment sesuai permission,
- melihat tracking,
- mengelola shipping exception,
- melakukan operational action yang diizinkan.

---

# 45. Admin / Operations View

Admin / Operations memiliki operational visibility lebih luas.

Dapat:

- melihat shipment,
- mencari shipment,
- investigate exception,
- inspect tracking timeline,
- manage hold,
- handle failed delivery,
- controlled override,
- monitor SLA.

Manual override wajib diaudit.

---

# 46. CEO / Product Owner View

CEO / Product Owner tidak menjalankan shipment harian.

Fokus:

- shipping analytics,
- carrier performance,
- delay metrics,
- SLA,
- shipping cost trends,
- failed delivery,
- exception trends,
- shipment volume,
- geographic distribution.

CEO dapat mengatur policy pada level platform sesuai governance.

---

# 47. Tracking Sharing

Customer dapat membagikan status shipment menggunakan share token.

Minimal:

- view-only,
- expiration,
- revoke,
- scope.

Tracking share tidak boleh membuka:

- customer profile,
- order history,
- payment details,
- asset data,
- service history,
- private conversation.

Contoh:

```text
Tracking Share Token
↓
Public / Restricted Tracking View
↓
Expires
```

---

# 48. Privacy

Shipment data harus menggunakan least privilege.

Contoh:

Customer A:

```text
Own Shipment → VIEW
```

Customer B:

```text
Same Shipment → DENY
```

kecuali diberikan access melalui tracking share.

---

# 49. Address Snapshot

Shipping address harus disimpan sebagai snapshot pada shipment.

Mengapa?

Karena customer dapat mengubah profile address setelah order dibuat.

Contoh:

```text
Order time:
Jl. A No. 10

Customer profile later:
Jl. B No. 20
```

Shipment history tetap menggunakan:

```text
Jl. A No. 10
```

Snapshot bersifat historis.

---

# 50. Destination Types

Shipment dapat dikirim ke:

```text
CUSTOMER_ADDRESS
PROVIDER_LOCATION
WORKER_LOCATION
WORKSHOP
PICKUP_POINT
PARTNER_LOCATION
```

Hal ini penting untuk service-related product.

---

# 51. Service-Related Product Shipping

Contoh:

```text
Customer
↓
AC Repair
↓
Technician identifies replacement part
↓
#19 Service + Product Integration
↓
#20 Product Discovery
↓
#21 Cart
↓
#22 Order
↓
#23 Payment
↓
#24 Inventory
↓
#25 Fulfillment
↓
#26 Shipping
↓
Provider / Worker receives product
↓
Service Execution
```

Dengan demikian, shipping tidak hanya untuk pembelian langsung customer.

---

# 52. Shipping dan Service Execution

Dalam service-related product:

```text
Product shipment
        ↓
Product received
        ↓
Service Execution
```

Shipping tidak mengerjakan jasa.

Shipping hanya memastikan barang bergerak menuju destination.

---

# 53. Shipping dan Asset

Shipment dapat menyimpan reference ke asset context.

Contoh:

```text
Shipment
→ Replacement Part
→ Asset ID: AC-001
```

Namun:

```text
#26 ≠ Asset Source of Truth
```

Identity dan lifecycle asset tetap di #15.

---

# 54. Shipping dan Maintenance

Maintenance-related purchase dapat membawa reference:

```text
maintenance_schedule_id
asset_id
maintenance_plan_id
```

tetapi shipping tetap hanya menangani movement barang.

---

# 55. Shipping dan Reorder

Reorder menggunakan data transaksi sebelumnya sebagai shortcut.

Namun shipment baru tetap harus dibuat berdasarkan:

- order baru,
- package baru,
- carrier baru,
- tracking baru.

Data shipment lama tidak boleh dianggap sebagai shipment aktif baru.

---

# 56. Multi-Seller Shipment

Sistem mendukung multi-seller.

Contoh:

```text
Order Group
├── Seller A
│   └── Shipment A
│
└── Seller B
    └── Shipment B
```

Customer dapat memiliki satu checkout tetapi menerima beberapa shipment.

---

# 57. Split Shipment

Satu seller juga dapat membuat beberapa shipment.

Contoh:

```text
Order
├── Product A → Shipment 1
└── Product B → Shipment 2
```

Possible reasons:

- beda warehouse,
- beda availability,
- partial fulfillment,
- produk oversized,
- shipping method berbeda.

---

# 58. Multi-Package Shipment

Satu shipment dapat mempunyai banyak package.

Contoh:

```text
Shipment #SHP-100
├── Package #PKG-A
├── Package #PKG-B
└── Package #PKG-C
```

Tracking dapat berasal dari satu tracking number atau beberapa identifier berdasarkan carrier capability.

---

# 59. Pickup Tidak Selalu Sama dengan Shipment

Pickup merupakan tindakan perpindahan custody dari origin ke carrier / pihak lain.

Tidak semua pickup berarti customer shipment langsung.

Contoh:

```text
Pickup
→ Internal transfer
```

atau:

```text
Pickup
→ Customer scheduled collection
```

Karena itu:

```text
Pickup ≠ always Shipment
```

---

# 60. Handover

Shipping dapat dimulai setelah handover yang sesuai.

Handover dapat berasal dari:

```text
Seller
→ Carrier

Provider
→ Carrier

Servio Fulfillment Location
→ Carrier
```

Handover dapat dicatat sebagai event.

---

# 61. Shipment Cancellation

Shipment dapat dibatalkan tanpa selalu membatalkan order.

Contoh:

```text
Shipment cancelled
↓
Create replacement shipment
```

atau:

```text
Shipment cancelled
↓
Fulfillment hold
```

### Important

```text
Shipment CANCELLED ≠ Order CANCELLED
```

Order cancellation mengikuti #22 dan policy lintas domain.

---

# 62. Shipping SLA

Shipment dapat memiliki SLA.

Contoh:

```text
Pickup Target:
20 Sep 2026 10:00

Delivery Target:
21 Sep 2026 18:00
```

Status SLA:

```text
ON_TIME
AT_RISK
DELAYED
```

SLA policy harus disimpan sebagai snapshot/version.

---

# 63. Shipping Analytics

MVP analytics meliputi:

- total shipments,
- delivered shipments,
- failed delivery,
- delivery attempt rate,
- delay rate,
- average delivery duration,
- carrier performance,
- SLA compliance,
- lost shipment,
- damaged shipment,
- return-to-sender rate,
- shipment volume by region,
- shipment volume by method,
- shipment volume by seller.

---

# 64. Shipping Events & Audit

Event penting harus dicatat.

Contoh:

```text
SHIPMENT_CREATED
CARRIER_ASSIGNED
PICKUP_REQUESTED
PICKED_UP
TRACKING_UPDATED
ETA_UPDATED
DELIVERY_ATTEMPTED
DELIVERED
SHIPMENT_HOLD
SHIPMENT_RELEASED
SHIPMENT_CANCELLED
MANUAL_OVERRIDE
```

Audit mencatat:

- actor,
- action,
- target,
- timestamp,
- result,
- reason,
- source.

---

# 65. Manual Override

Admin dapat melakukan controlled override bila diperlukan.

Contoh:

```text
Carrier API problem
↓
Admin validates external evidence
↓
Manual status correction
```

Manual override wajib:

- memiliki reason,
- mencatat actor,
- memiliki timestamp,
- memiliki audit event,
- tidak menghapus historical event.

---

# 66. AI Support

AI dapat membantu:

- carrier recommendation,
- ETA prediction,
- delay risk,
- exception classification,
- shipment summarization,
- customer explanation,
- anomaly detection.

AI tidak boleh:

- membuat tracking number,
- membuat shipment palsu,
- mengarang location,
- mengarang carrier status,
- mengubah shipment tanpa authorization,
- menandai delivered tanpa evidence.

---

# 67. Shipping State vs AI Prediction

Contoh:

```text
Current Shipment Status:
IN_TRANSIT

AI Prediction:
HIGH RISK OF DELAY
```

Prediction bukan state.

Jadi:

```text
Prediction ≠ Source of Truth
```

---

# 68. Notification

Customer dapat menerima notification untuk event penting.

Contoh:

- shipment created,
- picked up,
- in transit,
- ETA updated,
- out for delivery,
- delivery attempted,
- delivered,
- delayed,
- lost,
- damaged,
- return to sender.

Notification tidak mengubah source of truth.

---

# 69. Customer Actions

Customer dapat:

```text
VIEW TRACKING
VIEW ETA
VIEW TIMELINE
SHARE TRACKING
VIEW POD
REPORT DELIVERY ISSUE
```

Untuk issue lebih lanjut:

```text
REPORT DELIVERY ISSUE
↓
Complaint / Dispute #12
```

atau:

```text
Return / Refund #27
```

sesuai kondisi.

---

# 70. Shipping Issue Handoff

Jika masalah shipping membutuhkan domain lain:

```text
DAMAGED
    ↓
#12 Complaint / Dispute
    ↓
#27 Return / Refund
```

atau:

```text
RETURN_TO_SENDER
    ↓
#27 Return / Refund
    ↓
#24 Inventory Disposition
```

---

# 71. Cross-Domain Business Flow

## Direct Purchase

```text
#20 Product Discovery
        ↓
#21 Cart
        ↓
#22 Order
        ↓
#23 Payment
        ↓
#24 Inventory
        ↓
#25 Fulfillment
        ↓
🔥 #26 Shipping
        ↓
DELIVERED
        ↓
#27 Return / Refund if necessary
```

---

# 72. Service + Product Flow

```text
#19 Service + Product Integration
        ↓
#20 Product Discovery
        ↓
#21 Cart
        ↓
#22 Order
        ↓
#23 Payment
        ↓
#24 Inventory
        ↓
#25 Fulfillment
        ↓
🔥 #26 Shipping
        ↓
Provider / Worker
        ↓
Service Execution
```

---

# 73. Shipping State Machine

```text
CREATED
   ↓
READY_FOR_PICKUP
   ↓
PICKUP_REQUESTED
   ↓
PICKED_UP
   ↓
IN_TRANSIT
   ↓
AT_SORTING_CENTER
   ↓
ARRIVED_AT_DESTINATION
   ↓
OUT_FOR_DELIVERY
   ↓
DELIVERED
```

Exception paths:

```text
PICKUP_FAILED
      ↓
ON_HOLD / RETRY

DELIVERY_ATTEMPTED
      ↓
RESCHEDULE
      ↓
OUT_FOR_DELIVERY

LOST
      ↓
INVESTIGATION

DAMAGED
      ↓
COMPLAINT / RETURN / REFUND

DELIVERY_FAILED
      ↓
RETRY / RESCHEDULE / RETURN_TO_SENDER

RETURN_TO_SENDER
      ↓
#27 Return / Refund
```

---

# 74. Source of Truth Matrix

| Data | Source of Truth |
|---|---|
| Product | #20 |
| Cart | #21 |
| Order | #22 |
| Booking | #22B |
| Payment | #23 |
| Inventory | #24 |
| Fulfillment | #25 |
| Shipment | #26 |
| Tracking Number | #26 |
| Tracking Timeline | #26 |
| ETA Context | #26 |
| Delivery Attempt | #26 |
| Proof of Delivery | #26 |
| Shipping Exception | #26 |
| Return | #27 |
| Refund | #27 |

---

# 75. Data Model

## Core Entities

```text
shipments
shipment_items
shipment_packages
shipment_carriers
shipment_tracking_events
shipment_tracking_state
shipment_eta
shipment_delivery_attempts
shipment_delivery_proofs
shipment_exceptions
shipment_holds
shipment_sla
shipment_addresses
shipment_events
```

---

# 76. shipments

Conceptual fields:

```text
id
shipment_number
order_id
fulfillment_id
carrier_id
shipping_method
delivery_method
status
origin_location
destination_location
tracking_number
created_at
updated_at
```

### Purpose

Menjadi main entity shipment.

---

# 77. shipment_items

Conceptual fields:

```text
id
shipment_id
order_item_id
package_id
quantity
created_at
```

### Purpose

Menghubungkan item order dengan shipment.

---

# 78. shipment_packages

Conceptual fields:

```text
id
shipment_id
fulfillment_package_id
weight
length
width
height
package_status
created_at
updated_at
```

### Purpose

Menyimpan package fisik yang dikirim.

---

# 79. shipment_carriers

Conceptual fields:

```text
id
carrier_id
carrier_name
service_level
coverage
integration_type
active
created_at
updated_at
```

Jika carrier master dikelola terpisah, table ini dapat menjadi relation/configuration layer.

---

# 80. shipment_tracking_events

Conceptual fields:

```text
id
shipment_id
event_type
carrier_status
location
event_time
received_at
source
raw_reference
idempotency_key
created_at
```

### Purpose

Menyimpan event tracking historis.

---

# 81. shipment_tracking_state

Conceptual fields:

```text
shipment_id
current_status
current_location
last_event_at
last_source
eta
delay_status
last_updated_at
```

### Purpose

Fast current-state representation.

Historical source tetap berasal dari tracking events.

---

# 82. shipment_eta

Conceptual fields:

```text
shipment_id
estimated_at
window_start
window_end
confidence
source
updated_at
```

---

# 83. shipment_delivery_attempts

Conceptual fields:

```text
id
shipment_id
attempt_number
attempted_at
result
reason
carrier_reference
created_at
```

---

# 84. shipment_delivery_proofs

Conceptual fields:

```text
id
shipment_id
proof_type
recipient
signature_reference
otp_verified
photo_reference
location_context
captured_at
source
created_at
```

---

# 85. shipment_exceptions

Conceptual fields:

```text
id
shipment_id
exception_type
severity
status
reason
reported_by
created_at
resolved_at
```

---

# 86. shipment_holds

Conceptual fields:

```text
id
shipment_id
hold_type
reason
status
created_by
created_at
released_at
```

---

# 87. shipment_sla

Conceptual fields:

```text
id
shipment_id
pickup_target_at
delivery_target_at
status
policy_version
created_at
updated_at
```

---

# 88. shipment_addresses

Conceptual fields:

```text
id
shipment_id
address_type
recipient_name
phone
address_snapshot
location_context
captured_at
```

### Important

Address adalah historical snapshot.

---

# 89. shipment_events

Digunakan untuk normalized shipment lifecycle event dan cross-domain integration.

Contoh:

```text
SHIPMENT_CREATED
CARRIER_ASSIGNED
PICKED_UP
TRACKING_UPDATED
DELIVERED
SHIPMENT_CANCELLED
```

---

# 90. Role & Access Matrix

| Role | Access #26 |
|---|---|
| Customer | View own shipment, tracking, ETA, POD, share tracking, report issue |
| Service Provider | View authorized service-related shipment |
| Worker / Technician | View assigned shipment / destination / handover |
| Merchant | Manage own shipment, view tracking, shipping operations |
| Supplier | Manage authorized supply shipment |
| Admin / Operations | Platform operational view, investigation, exception handling, controlled override |
| CEO / Product Owner | Analytics, governance, SLA monitoring |

---

# 91. Permission Principles

Permission mengikuti:

```text
ROLE
+
PERMISSION
+
RESOURCE
+
SCOPE
=
ACCESS
```

Contoh:

```text
Customer
+
VIEW
+
Shipment
+
OWN
=
ALLOW
```

Contoh:

```text
Customer
+
MANAGE
+
Shipment
+
PLATFORM
=
DENY
```

---

# 92. Access Scope

Supported scope:

```text
OWN
ASSIGNED
RELATED
ORGANIZATION
PLATFORM
AGGREGATE
```

---

# 93. Security

Backend harus menerapkan authorization.

Tidak cukup hanya menyembunyikan button pada frontend.

Contoh:

```text
GET /api/shipments/:id
```

tetap harus memeriksa apakah user memiliki akses terhadap shipment tersebut.

---

# 94. Important Business Rules

Berikut business rules yang **LOCKED**:

1. #26 adalah shipping & tracking domain.
2. #25 Fulfillment ≠ #26 Shipping.
3. Package ≠ Shipment.
4. Shipment ≠ Order.
5. Shipment ID ≠ Tracking Number.
6. Tracking Event ≠ Shipment Status.
7. Pickup tidak selalu berarti shipment.
8. #26 menggunakan package dari #25.
9. #24 tetap menjadi source of truth inventory.
10. #23 tetap menjadi source of truth payment.
11. #22 tetap menjadi source of truth order.
12. #26 menjadi source of truth shipping execution.
13. ETA bersifat estimated kecuali ada guarantee policy.
14. ETA dapat berubah.
15. Delay tidak otomatis berarti carrier fault.
16. Delivery attempt tidak otomatis berarti order failure.
17. Shipment cancellation tidak otomatis berarti order cancellation.
18. Sistem mendukung split shipment.
19. Sistem mendukung multi-package.
20. Sistem mendukung multi-seller shipment.
21. POD ≠ Proof of Service #9.
22. Carrier tracking dapat berasal dari API, webhook, manual, atau system.
23. Raw carrier status dan source disimpan untuk traceability.
24. Tracking events harus idempotent.
25. Out-of-order events harus ditangani tanpa state regression yang salah.
26. event_time dan received_at harus dibedakan.
27. Tidak adanya live location tidak boleh menghasilkan fake GPS.
28. Lost shipment menjadi exception/investigation terlebih dahulu.
29. Damaged shipment dapat masuk complaint/return/refund flow.
30. Return-to-sender dapat masuk #27 dan/atau #24.
31. AI hanya assistive.
32. AI tidak boleh mengarang tracking number.
33. AI tidak boleh mengarang status atau location.
34. AI tidak boleh menandai delivered tanpa evidence.
35. Customer hanya dapat melihat shipment yang diizinkan.
36. Tracking sharing menggunakan token yang dapat expire dan revoke.
37. Manual override harus diaudit.
38. Critical shipping action harus idempotent.
39. Backend authorization wajib ditegakkan.
40. Shipment completion ≠ Order completion.
41. Historical shipment record harus dipertahankan.
42. Address pada shipment menggunakan snapshot historis.

---

# 95. MVP Scope

Feature #26 MVP mencakup:

```text
✅ Shipment Creation
✅ Shipment ID
✅ Carrier
✅ Tracking Number
✅ Shipping Method
✅ Package Link
✅ Delivery Address Snapshot
✅ Shipment Status
✅ Tracking Timeline
✅ ETA
✅ Delay State
✅ Delivery Attempt
✅ Delivery Failure
✅ Reschedule Context
✅ Proof of Delivery
✅ Split Shipment
✅ Multi-Package
✅ Multi-Seller Shipment
✅ Lost / Damaged Exception
✅ Return-to-Sender
✅ Carrier API / Webhook Integration
✅ Idempotency
✅ Audit
✅ Role & Access
✅ Customer Tracking
✅ Shipping Analytics
```

---

# 96. Scale-Up

Fitur scale-up:

```text
Multi-Carrier Optimization
Dynamic Carrier Selection
Real-Time Courier Location
Advanced Route Optimization
AI ETA Prediction
Delivery Risk Prediction
Last-Mile Optimization
3PL Integration
Fleet Management
Driver App
POD Computer Vision
Dynamic Shipping Pricing
Cross-Region Logistics
International Shipping
Customs Integration
```

---

# 97. Recommended Frontend Screens

## Customer

```text
Shipping / Order Detail
        ↓
Shipment Card
        ↓
Current Status
        ↓
ETA
        ↓
Tracking Timeline
        ↓
Package Details
        ↓
Delivery Address
        ↓
POD
        ↓
Report Issue
```

## Admin

```text
Shipping Dashboard
        ↓
Shipment List
        ↓
Shipment Detail
        ↓
Tracking Timeline
        ↓
Exception Center
        ↓
Carrier Information
        ↓
SLA Monitoring
        ↓
Manual Intervention
```

## Merchant / Provider

```text
My Shipments
        ↓
Shipment Detail
        ↓
Fulfillment Reference
        ↓
Carrier
        ↓
Tracking
        ↓
Delivery Status
```

---

# 98. Recommended API Domain Structure

Conceptual routes:

```text
/api/shipments
/api/shipments/:id
/api/shipments/:id/tracking
/api/shipments/:id/events
/api/shipments/:id/eta
/api/shipments/:id/attempts
/api/shipments/:id/proof-of-delivery
/api/shipments/:id/exceptions
/api/shipments/:id/holds
/api/shipments/:id/share
/api/shipments/:id/reschedule
```

Carrier integration:

```text
/api/shipping/carriers
/api/shipping/carriers/:id/rates
/api/shipping/carriers/:id/assign
/api/shipping/webhooks/:carrier
```

---

# 99. Example Customer Journey

```text
Customer membeli produk
        ↓
Order confirmed
        ↓
Payment completed
        ↓
Inventory allocated
        ↓
Fulfillment prepared
        ↓
Package ready
        ↓
Shipment created
        ↓
Carrier assigned
        ↓
Picked up
        ↓
In transit
        ↓
Arrived destination
        ↓
Out for delivery
        ↓
Delivered
        ↓
POD
        ↓
Customer can report issue
```

---

# 100. Final Architecture

```text
                         #22 ORDER
                              │
                              ▼
                       #23 PAYMENT
                              │
                              ▼
                     #24 INVENTORY
                              │
                              ▼
                     #25 FULFILLMENT
                              │
                       READY_FOR_SHIPPING
                              │
                              ▼
                   🔥 #26 SHIPPING
                              │
                 ┌────────────┴────────────┐
                 ▼                         ▼
         CREATE SHIPMENT             ASSIGN CARRIER
                 │                         │
                 └────────────┬────────────┘
                              ▼
                       PICKUP REQUESTED
                              │
                              ▼
                          PICKED UP
                              │
                              ▼
                         IN TRANSIT
                              │
                              ▼
                   ARRIVED DESTINATION
                              │
                              ▼
                     OUT FOR DELIVERY
                              │
                              ▼
                         DELIVERED
                              │
                              ▼
                           POD
                              │
                              ▼
                    ORDER COMPLETION
                       (separate #22)

Exception paths:
──────────────────────────────────────────────

DELAYED
   ├── ETA UPDATE
   └── Notification

DELIVERY_ATTEMPTED
   ├── Reschedule
   ├── Retry
   └── Return to Sender

LOST
   └── Investigation

DAMAGED
   ├── Complaint
   ├── Return
   └── Refund / Replacement

RETURN_TO_SENDER
   └── #27 Return / Refund
```

---

# 101. Final Boundary Statement

> **Feature #26 Shipping & Tracking bertanggung jawab atas perpindahan barang setelah fulfillment siap, mulai dari shipment creation, carrier assignment, pickup, transit, tracking, ETA, delivery attempt, delivery confirmation, hingga proof of delivery dan shipping exception.**

Feature ini **tidak** mengambil alih:

- order,
- payment,
- inventory,
- fulfillment,
- return,
- refund,
- service execution.

Sehingga arsitektur Servio tetap terpisah secara jelas:

```text
DISCOVER
   ↓
CART
   ↓
ORDER
   ↓
PAYMENT
   ↓
INVENTORY
   ↓
FULFILLMENT
   ↓
SHIPPING
   ↓
DELIVERY
   ↓
RETURN / REFUND
```

---

# 102. LOCK Status

## 🔒 FEATURE #26 — LOCKED

**Nama:** Shipping & Tracking Barang  
**Roadmap:** #26 / 27  
**Status:** FINAL

### Core Source of Truth

```text
Shipment
Shipment Status
Carrier
Tracking Number
Tracking Timeline
ETA Context
Delivery Attempt
Proof of Delivery
Shipping Exception
Shipping Hold
Shipping SLA
Shipment Events
Tracking Share
```

### Next Feature

```text
#27 RETURN / REFUND
```
