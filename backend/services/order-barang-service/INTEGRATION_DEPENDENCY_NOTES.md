# SERVIO — MODUL 05A: INTEGRATION DEPENDENCY NOTES
## STATUS KONTRAK & MATRIKS INTEGRASI ANTARSERVICE (PROMPT 05 FINAL SECURITY FREEZE)

Dokumen ini merangkum status dependensi antarservice antara **Order Barang Service (05A)** dengan modul-modul lain di ekosistem SERVIO (Identity 01, Product 03, Finance 06, Governance 09, Aftersales/Support 07).

---

## 1. Matriks Ketergantungan Eksternal

| Modul | Fitur/Kontrak yang Dibutuhkan | Status Kontrak | Perilaku 05A Saat Runtime |
|---|---|---|---|
| **Identity 01** | Saved Customer Address Contract (`/internal/v1/identity/customers/{id}/addresses/{addrId}`) | **VERIFIED** | Mengambil snapshot resmi nama, nomor telepon, alamat, administrative code, koordinat lat/long. Menolak IDOR dengan 403 Forbidden. Tanpa fallback data palsu. |
| **Identity 01** | Merchant Verified Origin (`/internal/v1/identity/merchants/{orgId}/origin`) | **VERIFIED** | Mengambil titik koordinat toko resmi untuk kalkulasi Haversine ongkir. Jika toko tidak valid, checkout gagal aman. |
| **Identity 01** | Merchant Operating Schedule Contract (`/internal/v1/identity/merchants/{orgId}/operating-schedule`) | **PENDING_CONTRACT** | Saat ini belum menyediakan endpoint operasional toko resmi. 05A menetapkan `PENDING_MERCHANT_OPERATING_HOURS_CONTRACT` dan `response_deadline_at = null` agar tidak terjadi auto-reject timeout prematur palsu. |
| **Product 03** | Product & Variant Authoritative Snapshot (`/internal/v1/product/variants/{varId}`) | **VERIFIED** | Memverifikasi produk aktif, varian aktif, kepemilikan toko, dan harga resmi snapshot. Menolak input harga dari browser. |
| **Product 03** | Atomic Stock Reservation (FIX 25) (`POST /internal/v1/product/inventory/reserve`) | **PENDING_PRODUCT_CONTRACT** | Product 03 saat ini baru menyediakan read snapshot katalog. Kontrak reservasi stok atomik anti-oversell belum tersedia. 05A menghapus seluruh runtime mock bypass dan mengunci operasi pembayaran dengan `PENDING_PRODUCT_CONTRACT` (409) demi mencegah overselling. |
| **Finance 06** | Checkout Quotes & Allocation Breakdown (`POST /internal/v1/finance/checkout-quotes`) | **VERIFIED** | Menghitung alokasi biaya aplikasi, pajak pelanggan, dan total tagihan gabungan. |
| **Finance 06** | Payment Intent Creation (`POST /internal/v1/finance/payment-intents`) | **VERIFIED** | Mengembalikan payment_id, exact amount_idr, dan 6 jam expires_at resmi. Tanpa payment id atau kode QR dummy. |
| **Finance 06** | Payment Status Response Parsing (FIX 15) (`GET /internal/v1/finance/payments/{id}`) | **VERIFIED** | Membaca status ternormalisasi (`data.status` dan `status`). Jika berstatus `PAID`, pembatalan unpaid ditolak. Jika timeout/malformed, fail-closed tanpa pembatalan sepihak. |
| **Finance 06** | Payment Event Ingest & Replay Integrity (FIX 17, 23 & 27) (`POST /internal/v1/order-barang/finance-events`) | **VERIFIED** | Mewajibkan `event_id` non-kosong dari Finance tanpa fallback UUID (422 `MISSING_EVENT_ID`). Melakukan canonicalisasi deterministik payload hash. Event replay identik direspons idempotent (200 `ALREADY_PROCESSED`); event ID sama dengan payload/tipe berbeda ditolak 409 `IDEMPOTENCY_CONFLICT`. Perlindungan anti-downgrade mutlak: status `PAID` tidak dapat ditimpa oleh `FAILED` atau `EXPIRED`. |
| **Finance 06** | Active Payment Intent Void Contract (`POST /internal/v1/finance/payments/{id}/void`) | **PENDING_CONTRACT** | Finance 06 belum membuka endpoint pembatalan/void payment intent aktif. 05A menahan pembatalan unpaid dengan `PENDING_FINANCE_VOID_CONTRACT` (409) jika checkout masih memiliki instruksi pembayaran aktif yang belum kedaluwarsa. |
| **Finance 06** | Cancellation Refund Delegation (FIX 16) (`POST /internal/v1/finance/refunds/order-cancellations`) | **VERIFIED** | Delegasi refund 100% per toko yang sah dibatalkan via Transactional Outbox Pattern. HTTP network call strictly dieksekusi setelah DB transaction commit. |
| **Finance 06** | Order Completed Escrow Hold Trigger (`finance.order_completed.v1`) | **VERIFIED** | Dikirim setelah order COMPLETED (baik manual oleh customer atau auto-completion 72 jam post DELIVERED), memicu 120 jam penahanan dana escrow di Finance 06. |
| **Governance / Dispute 09 & Aftersales 07** | Strict Order Hold & Unhold Sequencing (FIX 18, 22 & 26) (`POST /internal/v1/order-barang/holds/order-events`) | **VERIFIED** | Mewajibkan `event_sequence` integer positif untuk SEMUA event HOLD dan UNHOLD (`PENDING_HOLD_SEQUENCE_CONTRACT`, 422). Menghapus seluruh fallback event_id dan source_service. Memverifikasi header `X-Source-Service` terhadap body. Menolak stale event dengan 409. Duplicate event dengan payload berbeda ditolak 409 `IDEMPOTENCY_CONFLICT`. Pencatatan ganda audit mutasi ke `OrderStatusHistory` dan `OrderAuditLog`. |
| **Governance / Dispute 09 & Aftersales 07** | Dispute Authority Verification for Manual & Auto-Completion (FIX 19 & FIX 24) (`GET /internal/v1/governance/orders/{orderId}/dispute-clearance`) | **PENDING_DISPUTE_AUTHORITY** | Baik konfirmasi manual Customer maupun auto-completion 72 jam wajib memvalidasi ketiadaan dispute/komplain aktif ke modul pemilik. Jika kontrak belum terpasang atau authority belum tersedia, completion fail-closed dengan audit status `PENDING_DISPUTE_AUTHORITY` (409). |
| **Internal 05A** | Concurrent Outbox Dispatcher Safety (FIX 20) (`order:dispatch-outbox`) | **VERIFIED** | Worker leasing dengan atomic `lockForUpdate` di MySQL. Tidak menahan lock DB selama HTTP external. Crash recovery via lease expiration timeout. Bebas double claims di multi-worker paralel. |

---

## 2. Kebijakan Fail-Closed Runtime

1. **Anti-Dummy Policy & Zero Mock Runtime:**
   Runtime microservice 05A TIDAK PERNAH menggunakan data dummy, nilai contoh, fake payment ID, atau mock reservation bypass jika service eksternal belum siap atau mengalami gangguan.
2. **Karantina Transaksi Berisiko:**
   Jika Product Service 03 belum memiliki kontrak reservasi stok atomik, CheckoutGroup dapat dibuat dalam status `CREATED`, tetapi instruksi pembayaran akan ditolak dengan `409 PENDING_PRODUCT_CONTRACT`.
3. **Integritas Dana Escrow & Outbox Dispatching:**
   Setiap instruksi finansial (refund atau completion) disimpan dalam tabel `integration_outbox_events` di dalam transaksi DB lokal, dan pengiriman HTTP hanya berjalan setelah commit. Kegagalan jaringan atau timeout Finance dijaga dengan persistent retry dan lease recovery tanpa double refund.
4. **Dispute & Hold Guarding:**
   Auto-completion dan manual Customer completion tidak pernah mengeksekusi penyelesaian order secara spekulatif hanya karena `is_hold_active = false`. Jika status dispute belum dapat divalidasi dari authority resmi, penyelesaian ditunda (`PENDING_DISPUTE_AUTHORITY`).
5. **Strict Hold Sequence Protection:**
   Event `UNHOLD` tanpa nomor urut positif otoritatif ditolak dengan `422 PENDING_HOLD_SEQUENCE_CONTRACT` untuk mencegah pembatalan hold aktif oleh event yang terlambat atau tidak sah.
