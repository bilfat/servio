# SERVIO — MODUL 05A: ORDER BARANG MICROSERVICE
## FINAL CLOSING FIX & INTEGRATION HARDENING (PROMPT 03 ACC READINESS)

Microservice resmi untuk penanganan keranjang, kalkulasi ongkir lokal (Haversine), orkestrasi checkout multi-merchant, manajemen siklus hidup pesanan (state machine), pemenuhan pengiriman (fulfillment), pembatalan dengan SLA 12 jam operasional, auto-completion 72 jam, Transactional Outbox Pattern, dan integrasi keuangan dengan Modul 06 Finance.

---

## 1. Identitas Layanan & Lingkungan

- **Nama Microservice:** `order-barang-service`
- **Direktori:** `backend/services/order-barang-service/`
- **Framework:** Laravel 12 (PHP 8.2+)
- **Port:** `8005`
- **Database:**
  - Operasional: `servio_order_barang_db`
  - Pengujian Otomatis: `servio_order_barang_test_db`

---

## 2. Aturan Bisnis Kunci yang Dikunci (Locked Rules)

| Area | Keputusan Final | Implementasi di 05A |
|---|---|---|
| **Checkout Multi-Merchant** | 1 CheckoutGroup $\rightarrow$ N Merchant Order | 1 tagihan gabungan, 1 payment intent Finance |
| **Batas Kedaluwarsa Pembayaran** | 6 Jam waktu server Finance | Sinkronisasi `finance_expires_at` |
| **Ongkir Merchant** | Dihitung server dengan rumus Haversine | Berbasis tier jarak resmi tanpa gap/overlap |
| **Kurir Toko & GoSend** | Pemilihan kurir saat `PACKED` | GoSend dipesan di luar platform; tanpa GPS live |
| **Pembatalan saat PROCESSING** | SLA **12 Jam Operasional** | Menyeberang jam tutup/libur toko |
| **Timeout Pembatalan** | Otomatis `REJECTED` (`TIMEOUT_NO_RESPONSE`) | Order tetap `PROCESSING`, packing dibuka, tanpa refund |
| **Auto-Completion** | Tepat **72 Jam post DELIVERED** valid | Verifikasi POD, hold-free, & dispute authority clearance |
| **Finance Escrow Hold** | **120 Jam post COMPLETED** | Dikelola mandiri oleh Modul 06 Finance |
| **Refund Alokasi** | 100% alokasi pesanan toko yang sah dibatalkan | Delegasi via Transactional Outbox post-commit |

---

## 3. Status Final Closing Fixes (Prompt 03 & 04)

### Prompt 03: Fixes 15–21
1. **FIX 15 — Finance Payment Status Response Mismatch (CRITICAL):** Normalisasi pembacaan status Finance (`data.status` dan `status`).
2. **FIX 16 — Refund Transactional Outbox Pattern (CRITICAL):** HTTP refund strictly dieksekusi setelah DB transaction commit.
3. **FIX 17 — Strict PAID Event Verification (CRITICAL):** Verifikasi identitas payment, nominal, currency, dan exact child orders.
4. **FIX 18 — Hold/Unhold Sequencing & Replay Protection (HIGH):** Penambahan kolom `hold_sequence` dan authorized caller filtering.
5. **FIX 19 — Auto-Completion Dispute Authority Verification (HIGH):** Auto-completion memeriksa ketiadaan sengketa ke Dispute Authority Client.
6. **FIX 20 — Concurrent Outbox Dispatcher Safety (HIGH):** Atomic event claiming via MySQL `lockForUpdate` dengan lease recovery.
7. **FIX 21 — Clean Packaging & Zero Secret Distribution (HIGH):** Pembuatan arsip `order-barang-service.zip` source-only (~140 KB).

### Prompt 04: Final Security Closing (Fixes 22–25)
1. **FIX 22 — Strict Hold/Unhold Sequence Validation (CRITICAL):**
   - UNHOLD tanpa `event_sequence` bernilai integer positif ditolak fail-closed (`PENDING_HOLD_SEQUENCE_CONTRACT`, 422).
   - Unhold dengan sequence stale (`<= hold_sequence`) ditolak dengan HTTP 409 Conflict.
   - Deteksi payload conflict pada sequence/event ID yang sama (409).
2. **FIX 23 — Payment Failed/Expired Identity Verification (CRITICAL):**
   - Penyatuan lapisan verifikasi identitas pembayaran untuk `CONFIRMED`, `FAILED`, dan `EXPIRED`.
   - Event `FAILED`/`EXPIRED` dengan Payment ID asing, tanpa PaymentProjection, atau mismatch ditolak dengan 409/422.
   - Perlindungan anti-downgrade mutlak: status `PAID` tidak dapat ditimpa oleh event `FAILED` atau `EXPIRED`.
3. **FIX 24 — Manual Completion Must Check Dispute Authority (HIGH):**
   - Menyatukan komponen verifikasi kelayakan penyelesaian order (`verifyCompletionEligibility`) antara Customer manual confirmation dan scheduler auto-completion.
   - Konfirmasi manual Customer memblokir order jika dispute authority belum siap (`PENDING_DISPUTE_AUTHORITY`, 409) atau sengketa aktif.
4. **FIX 25 — Remove Runtime Stock Reservation Mock Bypass (HIGH):**
   - Menghapus total seluruh bypass runtime mock reservation (`order.features.mock_product_reservation_enabled`).
   - Runtime ProductClient strictly fail-closed dengan `PENDING_PRODUCT_CONTRACT` (409) jika Product Service 03 belum membuka endpoint reservasi resmi.

### Prompt 05: Final Backend Security Patch & Freeze (Fixes 26–27)
1. **FIX 26 — Strict Hold Event Sequencing & Zero Identity Fallback (CRITICAL):**
   - Mewajibkan integer sequence positif (`event_sequence > 0`) untuk SEMUA event `HOLD` dan `UNHOLD` fail-closed (`PENDING_HOLD_SEQUENCE_CONTRACT`, 422).
   - Menghapus total seluruh fallback event ID (`Str::ulid()`) dan fallback source service (`AFTERSALES_07`).
   - Memvalidasi identitas pengirim header (`X-Source-Service`) terhadap body (`source_service`), menolak pemalsuan dengan HTTP 403 `SOURCE_IDENTITY_MISMATCH`.
   - Menolak event hold/unhold stale (`<= hold_sequence`) dengan HTTP 409 Conflict.
   - Deteksi payload conflict pada sequence/event ID yang sama (409 `IDEMPOTENCY_CONFLICT`).
   - Pencatatan ganda audit mutasi ke `OrderStatusHistory` dan `OrderAuditLog`.
2. **FIX 27 — Payment Event ID & Replay Integrity (CRITICAL):**
   - Mewajibkan `event_id` non-kosong dari Finance untuk semua payment events (`CONFIRMED`, `FAILED`, `EXPIRED`) tanpa fallback UUID (422 `MISSING_EVENT_ID`).
   - Melakukan canonicalisasi deterministik payload dan kalkulasi hash (`payload_hash`).
   - Melakukan rekonsiliasi replay integritas: event identik direspons idempotent (200 `ALREADY_PROCESSED`) tanpa mutasi ulang; event ID sama dengan payload/tipe berbeda ditolak fail-closed (409 `IDEMPOTENCY_CONFLICT`).
   - Penanganan konkurensi database aman terhadap unique constraint `(source_service, source_event_id)` via `QueryException` race handler.

---

## 4. Struktur Database (22 Migrations)

1. `2026_10_23_000001_create_carts_table.php`
2. `2026_10_23_000002_create_cart_items_table.php`
3. `2026_10_23_000003_create_merchant_delivery_settings_table.php`
4. `2026_10_23_000004_create_merchant_delivery_tiers_table.php`
5. `2026_10_23_000005_create_checkout_groups_table.php`
6. `2026_10_23_000006_create_orders_table.php`
7. `2026_10_23_000007_create_order_items_table.php`
8. `2026_10_23_000008_create_order_status_histories_table.php`
9. `2026_10_23_000009_create_order_stock_reservations_table.php`
10. `2026_10_23_000010_create_deliveries_table.php`
11. `2026_10_23_000011_create_delivery_attempts_table.php`
12. `2026_10_23_000012_create_delivery_events_table.php`
13. `2026_10_23_000013_create_cancellation_requests_table.php`
14. `2026_10_23_000014_add_active_cancellation_request_reference_to_orders_table.php`
15. `2026_10_23_000015_create_payment_projections_table.php`
16. `2026_10_23_000016_create_order_audit_logs_table.php`
17. `2026_10_23_000017_create_integration_inbox_events_table.php`
18. `2026_10_23_000018_create_integration_outbox_events_table.php`
19. `2026_10_23_000019_create_idempotency_records_table.php`
20. `2026_10_23_000020_add_hold_and_cart_columns_to_orders_and_checkouts.php`
21. `2026_10_23_000021_make_cancellation_request_deadline_nullable.php`
22. `2026_10_23_000022_add_outbox_leases_and_order_hold_sequence.php`

---

## 5. Cara Menjalankan Layanan

```bash
# 1. Masuk ke direktori
cd backend/services/order-barang-service

# 2. Salin environment
cp .env.example .env

# 3. Generate key & migrasi database
php artisan key:generate
php artisan migrate --force

# 4. Jalankan pengujian otomatis (100% PASS, 110 Tests, 341 Assertions)
php artisan test

# 5. Jalankan pengujian konkurensi multi-proses nyata
php tests/Concurrency/two_process_outbox_race.php

# 6. Jalankan server lokal (Port 8005)
php artisan serve --port=8005
```
