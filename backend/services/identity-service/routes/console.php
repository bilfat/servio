<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/**
 * Pembersihan otomatis pengguna pendaftar yang tidak memasukkan OTP dalam 1 jam
 */
Artisan::command('identity:cleanup-unverified {--hours=1 : Batas jam kedaluwarsa}', function () {
    $hours = (int) $this->option('hours');
    $count = \App\Models\User::cleanupUnverifiedExpiredUsers($hours);
    $this->info("Pembersihan selesai: {$count} akun pendaftar yang tidak memasukkan kode dalam {$hours} jam telah dihapus.");
})->purpose('Hapus akun pendaftar yang belum memverifikasi OTP lebih dari 1 jam');

// Jadwalkan pembersihan otomatis berkala setiap 10 menit
\Illuminate\Support\Facades\Schedule::command('identity:cleanup-unverified --hours=1')->everyTenMinutes();


