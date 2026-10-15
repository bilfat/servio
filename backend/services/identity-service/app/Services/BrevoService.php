<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BrevoService
{
    /**
     * Kirim email OTP menggunakan template resmi SERVIO via Brevo API
     */
    public static function sendOtpEmail(string $recipientEmail, string $otpCode, string $purpose): array
    {
        $apiKey = config('services.brevo.api_key', env('BREVO_API_KEY'));
        $senderEmail = config('services.brevo.sender_email', env('BREVO_SENDER_EMAIL', 'nabilalfatih34@gmail.com'));
        $senderName = config('services.brevo.sender_name', env('BREVO_SENDER_NAME', 'Servio Service'));

        // If no API key configured or running in automated test suite, simulate safely
        if (empty($apiKey) || (app()->environment('testing') && !config('services.brevo.test_force_http', false))) {
            Log::info("Brevo adapter [TESTING/SIMULATED]: OTP email queued for {$recipientEmail} purpose {$purpose}");
            return [
                'success' => true,
                'message_id' => 'simulated_' . uniqid(),
                'state' => 'SIMULATED_SENT',
            ];
        }

        // Tentukan Judul, Subjek, dan Pesan berdasarkan tujuan pengiriman OTP
        [$subject, $title, $description] = self::resolveEmailContent($purpose);
        $htmlContent = self::renderEmailTemplate($title, $description, $otpCode);

        try {
            $response = Http::withHeaders([
                'api-key' => $apiKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ])->timeout(8)->post('https://api.brevo.com/v3/smtp/email', [
                'sender' => [
                    'name' => $senderName,
                    'email' => $senderEmail,
                ],
                'to' => [
                    ['email' => $recipientEmail],
                ],
                'subject' => $subject,
                'htmlContent' => $htmlContent,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                Log::info("Brevo API delivery success: OTP sent to {$recipientEmail} [{$purpose}] messageId=" . ($data['messageId'] ?? 'unknown'));
                return [
                    'success' => true,
                    'message_id' => $data['messageId'] ?? ('brevo_' . uniqid()),
                    'state' => 'SENT',
                ];
            }

            Log::warning('Brevo API delivery failure: ' . $response->body());
            return [
                'success' => false,
                'message_id' => null,
                'state' => 'DELIVERY_FAILED',
                'error' => $response->body(),
            ];
        } catch (\Throwable $e) {
            Log::error('Brevo API exception: ' . $e->getMessage());
            return [
                'success' => false,
                'message_id' => null,
                'state' => 'DELIVERY_FAILED',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Kirim email undangan resmi staf internal via Brevo API (CR-03 Section B)
     */
    public static function sendStaffInvitationEmail(
        string $recipientEmail,
        string $recipientName,
        string $roleTitle,
        string $department,
        string $invitationUrl,
        string $employeeId = '-'
    ): array {
        $apiKey = config('services.brevo.api_key', env('BREVO_API_KEY'));
        $senderEmail = config('services.brevo.sender_email', env('BREVO_SENDER_EMAIL', 'nabilalfatih34@gmail.com'));
        $senderName = config('services.brevo.sender_name', env('BREVO_SENDER_NAME', 'SERVIO Indonesia'));

        // If no API key configured or running in testing environment, simulate safely
        if (empty($apiKey) || (app()->environment('testing') && !config('services.brevo.test_force_http', false))) {
            Log::info("Brevo adapter [TESTING/SIMULATED]: Staff invitation email queued for {$recipientEmail} [{$roleTitle}]");
            return [
                'success' => true,
                'message_id' => 'simulated_staff_' . uniqid(),
                'state' => 'SIMULATED_SENT',
            ];
        }

        $subject = "[SERVIO] Undangan Bergabung Tim Internal — {$roleTitle}";
        $htmlContent = self::renderStaffInvitationTemplate(
            $recipientName,
            $roleTitle,
            $department,
            $recipientEmail,
            $invitationUrl,
            $employeeId
        );

        $maxAttempts = 2;
        $attempt = 0;
        $lastError = null;

        while ($attempt < $maxAttempts) {
            $attempt++;
            try {
                $response = Http::withHeaders([
                    'api-key' => $apiKey,
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                ])->timeout(8)->post('https://api.brevo.com/v3/smtp/email', [
                    'sender' => [
                        'name' => $senderName,
                        'email' => $senderEmail,
                    ],
                    'to' => [
                        ['name' => $recipientName, 'email' => $recipientEmail],
                    ],
                    'subject' => $subject,
                    'htmlContent' => $htmlContent,
                ]);

                if ($response->successful()) {
                    $data = $response->json();
                    Log::info("Brevo API delivery success: Staff invite sent to {$recipientEmail} [{$roleTitle}] attempt={$attempt}");
                    return [
                        'success' => true,
                        'message_id' => $data['messageId'] ?? ('brevo_' . uniqid()),
                        'state' => 'SENT',
                        'attempts' => $attempt,
                    ];
                }

                $lastError = $response->body();
                Log::warning("Brevo API delivery attempt {$attempt} failed: " . $lastError);
            } catch (\Throwable $e) {
                $lastError = $e->getMessage();
                Log::warning("Brevo API exception attempt {$attempt}: " . $lastError);
            }
        }

        Log::error("Brevo API delivery permanently failed for {$recipientEmail} after {$maxAttempts} attempts: " . $lastError);
        return [
            'success' => false,
            'message_id' => null,
            'state' => 'DELIVERY_FAILED',
            'error' => $lastError,
            'attempts' => $attempt,
        ];
    }

    /**
     * Resolusi teks judul dan subjek email
     */
    private static function resolveEmailContent(string $purpose): array
    {
        switch ($purpose) {
            case 'PASSWORD_RESET':
                return [
                    '[SERVIO] Kode OTP Pemulihan Kata Sandi',
                    'Atur Ulang Kata Sandi Servio',
                    'Halo! Kami menerima permintaan untuk mengatur ulang kata sandi akun Servio Anda. Silakan gunakan kode verifikasi berikut untuk melanjutkan:'
                ];

            case 'WORKER_INVITATION':
                return [
                    '[SERVIO] Undangan Bergabung Mitra Teknisi',
                    'Aktivasi Akun Teknisi Servio',
                    'Halo! Anda telah diundang untuk bergabung sebagai teknisi resmi di platform Servio. Gunakan kode verifikasi berikut untuk aktivasi:'
                ];

            case 'ACCOUNT_VERIFICATION':
            default:
                return [
                    '[SERVIO] Kode Verifikasi Pendaftaran Akun',
                    'Verifikasi Akun Servio',
                    'Halo! Terima kasih telah memilih Servio. Silakan gunakan kode verifikasi berikut untuk menyelesaikan pendaftaran akunmu:'
                ];
        }
    }

    /**
     * Render template HTML email premium dark mode persis sesuai desain spesifikasi
     */
    public static function renderEmailTemplate(string $title, string $description, string $otpCode): string
    {
        // Format digit tanpa spasi ganda agar pas di satu baris di seluruh layar HP
        $cleanOtp = trim($otpCode);
        $formattedOtp = implode(' ', str_split($cleanOtp));

        return <<<HTML
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{$title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    table {
      border-collapse: collapse;
    }
    .otp-code {
      white-space: nowrap !important;
      word-break: keep-all !important;
      letter-spacing: 5px !important;
      font-size: 26px !important;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; color: #ffffff;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000; padding: 16px 8px; margin: 0 auto;">
    <tr>
      <td align="center" valign="middle">
        
        <!-- CARD CONTAINER (PURE BLACK THEME & COMPACT NO-SCROLL) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 440px; background-color: #080808; border: 1px solid #1f242e; border-radius: 18px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.9);">
          
          <!-- TOP GRADIENT ACCENT BAR -->
          <tr>
            <td style="padding: 14px 20px 0 20px;">
              <div style="height: 3px; width: 100%; background: linear-gradient(90deg, #ff4370 0%, #8b5cf6 50%, #38bdf8 100%); border-radius: 4px;"></div>
            </td>
          </tr>

          <!-- MAIN CONTENT BODY -->
          <tr>
            <td align="center" style="padding: 20px 18px 22px 18px; text-align: center;">
              
              <!-- LOGO SERVIO RESMI DI ATAS TULISAN SERVIO (CDN IMAGE COMPATIBLE SEMUA EMAIL CLIENT) -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 8px auto;">
                <tr>
                  <td align="center">
                    <img src="https://cdn.jsdelivr.net/gh/bilfat/servio@main/public/icon.png" width="56" height="56" alt="SERVIO Logo" style="display: block; width: 56px; height: 56px; border: 0; outline: none; text-decoration: none; margin: 0 auto;" />
                  </td>
                </tr>
              </table>

              <!-- BRAND NAME -->
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 3px 0; line-height: 1.2;">
                SERVIO
              </div>

              <!-- BRAND TAGLINE -->
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #94a3b8; font-weight: 500; margin: 0 0 16px 0; line-height: 1.2;">
                Solusi Layanan dalam Satu Platform
              </div>

              <!-- SECTION TITLE -->
              <h1 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 19px; font-weight: 700; color: #ffffff; margin: 0 0 10px 0; line-height: 1.3;">
                {$title}
              </h1>

              <!-- DESCRIPTION -->
              <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; line-height: 1.5; color: #cbd5e1; max-width: 370px; margin: 0 auto 16px auto;">
                {$description}
              </p>

              <!-- OFFICIAL VERIFICATION CODE BOX (DASHED BORDER, COMPACT, NEVER WRAP) -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 auto 16px auto; max-width: 320px;">
                <tr>
                  <td align="center" style="border: 1.5px dashed #38bdf8; border-radius: 12px; padding: 14px 16px; background-color: #0f1523; text-align: center;">
                    
                    <!-- BOX LABEL -->
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; font-weight: 700; color: #94a3b8; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px;">
                      KODE VERIFIKASI RESMI
                    </div>

                    <!-- DIGIT CODE: SATU BARIS TUNGGAL TIDAK AKAN PERNAH TURUN KE BARIS KEDUA -->
                    <div class="otp-code" style="font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; font-size: 26px; font-weight: 800; color: #93c5fd; letter-spacing: 5px; line-height: 1.1; text-align: center; white-space: nowrap !important; word-break: keep-all !important; display: inline-block;">
                      {$formattedOtp}
                    </div>

                  </td>
                </tr>
              </table>

              <!-- EXPIRY NOTE -->
              <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #64748b; line-height: 1.4; margin: 0 0 4px 0;">
                Kode ini berlaku selama <strong style="color: #94a3b8;">10 menit</strong>. Jangan bagikan kode ini kepada siapa pun demi keamanan akun Anda.
              </p>

              <!-- FOOTER COPYRIGHT -->
              <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; color: #475569; margin: 12px 0 0 0;">
                &copy; 2026 SERVIO. Hak Cipta Dilindungi.
              </p>

            </td>
          </tr>
        </table>
        <!-- END CARD CONTAINER -->

      </td>
    </tr>
  </table>
</body>
</html>
HTML;
    }

    /**
     * Render template HTML resmi undangan staf internal (CR-03 Section B)
     */
    public static function renderStaffInvitationTemplate(
        string $recipientName,
        string $roleTitle,
        string $department,
        string $recipientEmail,
        string $invitationUrl,
        string $employeeId
    ): string {
        $safeName = htmlspecialchars($recipientName, ENT_QUOTES, 'UTF-8');
        $safeRole = htmlspecialchars($roleTitle, ENT_QUOTES, 'UTF-8');
        $safeDept = htmlspecialchars($department, ENT_QUOTES, 'UTF-8');
        $safeEmail = htmlspecialchars($recipientEmail, ENT_QUOTES, 'UTF-8');
        $safeEmpId = htmlspecialchars($employeeId, ENT_QUOTES, 'UTF-8');
        $safeUrl = htmlspecialchars($invitationUrl, ENT_QUOTES, 'UTF-8');

        return <<<HTML
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Undangan Resmi Tim Internal SERVIO</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b0f19; padding: 24px 12px; margin: 0 auto;">
    <tr>
      <td align="center" valign="middle">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #111827; border: 1px solid #1f2937; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);">
          <!-- Top Accent Bar -->
          <tr>
            <td style="padding: 16px 24px 0 24px;">
              <div style="height: 4px; width: 100%; background: linear-gradient(90deg, #ff4370 0%, #8b5cf6 50%, #0284c7 100%); border-radius: 4px;"></div>
            </td>
          </tr>
          <!-- Main Content -->
          <tr>
            <td style="padding: 24px 28px 32px 28px; text-align: left;">
              <!-- Header Logo & Brand -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td align="center">
                    <img src="https://cdn.jsdelivr.net/gh/bilfat/servio@main/public/icon.png" width="56" height="56" alt="SERVIO Logo" style="display: block; width: 56px; height: 56px; border: 0; margin-bottom: 10px;" />
                    <div style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: 2px; text-transform: uppercase;">SERVIO</div>
                    <div style="font-size: 12px; color: #94a3b8; font-weight: 500; margin-top: 2px;">Platform Layanan Terpadu &amp; Tata Kelola Internal</div>
                  </td>
                </tr>
              </table>

              <!-- Greeting -->
              <h2 style="font-size: 18px; font-weight: 700; color: #ffffff; margin: 0 0 12px 0;">
                Halo, {$safeName}!
              </h2>
              <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin: 0 0 20px 0;">
                Selamat! Anda telah ditunjuk dan diundang oleh CEO untuk bergabung sebagai bagian dari <strong>Tim Internal Operasional SERVIO</strong>. Berikut adalah ringkasan data penugasan Anda:
              </p>

              <!-- Assignment Summary Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #1e293b; border: 1px solid #334155; border-radius: 14px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 6px 0; font-size: 12px; color: #94a3b8; width: 130px;">Employee ID (NIP)</td>
                        <td style="padding: 6px 0; font-size: 13px; font-weight: 700; color: #38bdf8; font-family: monospace;">{$safeEmpId}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 12px; color: #94a3b8;">Role / Otoritas</td>
                        <td style="padding: 6px 0; font-size: 13px; font-weight: 700; color: #ffffff;">{$safeRole}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 12px; color: #94a3b8;">Departemen</td>
                        <td style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #cbd5e1;">{$safeDept}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 12px; color: #94a3b8;">Email Kantor</td>
                        <td style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #cbd5e1;">{$safeEmail}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Call to Action Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="{$safeUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4); text-align: center;">
                      Buat Password Akun SERVIO &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link Fallback -->
              <p style="font-size: 12px; line-height: 1.5; color: #94a3b8; margin: 0 0 16px 0;">
                Jika tombol di atas tidak dapat diklik, salin dan buka tautan berikut di peramban Anda:<br/>
                <a href="{$safeUrl}" style="color: #38bdf8; word-break: break-all; font-size: 11px;">{$safeUrl}</a>
              </p>

              <!-- Security Warning Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #172554; border-left: 4px solid #38bdf8; border-radius: 8px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 12px 16px;">
                    <div style="font-size: 12px; font-weight: 700; color: #93c5fd; margin-bottom: 4px;">Pemberitahuan Keamanan Penting:</div>
                    <div style="font-size: 11px; line-height: 1.5; color: #bfdbfe;">
                      &bull; Tautan undangan ini hanya berlaku selama <strong>12 jam</strong> sejak dibuat.<br/>
                      &bull; Tautan ini unik dan bersifat sekali pakai (single-use).<br/>
                      &bull; <strong>Jangan bagikan tautan ini kepada siapa pun</strong> demi menjaga keamanan sistem dan data internal SERVIO.
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <div style="font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #1f2937; padding-top: 16px;">
                Email ini dikirim secara otomatis oleh Sistem Tata Kelola Akun SERVIO.<br/>
                &copy; 2026 PT SERVIO Solusi Digital. Hak cipta dilindungi undang-undang.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;
    }
}
