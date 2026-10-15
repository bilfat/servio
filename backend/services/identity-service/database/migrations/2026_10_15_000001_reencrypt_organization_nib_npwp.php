<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $profiles = DB::table('organization_profiles')->get();

        foreach ($profiles as $profile) {
            $updates = [];

            // 1. Audit & migrate NIB ciphertext
            if (!empty($profile->nib_ciphertext)) {
                try {
                    Crypt::decryptString($profile->nib_ciphertext);
                } catch (\Throwable) {
                    $decoded = base64_decode($profile->nib_ciphertext, true);
                    $plaintextNib = ($decoded !== false && preg_match('/^[A-Za-z0-9\-]+$/', $decoded))
                        ? $decoded
                        : $profile->nib_ciphertext;

                    $updates['nib_ciphertext'] = Crypt::encryptString($plaintextNib);
                    $updates['nib_lookup_hash'] = hash('sha256', trim($plaintextNib));
                }
            }

            // 2. Audit & migrate NPWP ciphertext
            if (!empty($profile->npwp_ciphertext)) {
                try {
                    Crypt::decryptString($profile->npwp_ciphertext);
                } catch (\Throwable) {
                    $decoded = base64_decode($profile->npwp_ciphertext, true);
                    $plaintextNpwp = ($decoded !== false && strlen($decoded) > 5)
                        ? $decoded
                        : $profile->npwp_ciphertext;

                    $updates['npwp_ciphertext'] = Crypt::encryptString($plaintextNpwp);
                    $updates['npwp_lookup_hash'] = hash('sha256', trim($plaintextNpwp));
                }
            }

            if (!empty($updates)) {
                DB::table('organization_profiles')
                    ->where('organization_id', $profile->organization_id)
                    ->update($updates);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // One-way migration to enhance encryption security
    }
};
