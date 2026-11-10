<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MediaUploadController extends Controller
{
    /**
     * Upload chat media (photos from gallery or camera).
     */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|image|mimes:jpeg,png,jpg,webp,gif|max:10240',
        ]);

        $file = $request->file('file');
        if (!$file || !$file->isValid()) {
            return ApiResponse::error('INVALID_FILE', 'File gambar tidak valid.', 400);
        }

        $extension = $file->getClientOriginalExtension() ?: 'jpg';
        $filename = 'chat_' . date('Ymd_His') . '_' . Str::random(10) . '.' . $extension;

        // Store to public disk
        $path = $file->storeAs('chat-media', $filename, 'public');

        // Build publicly accessible URL
        $url = asset('storage/' . $path);

        return ApiResponse::success([
            'url' => $url,
            'path' => $path,
            'filename' => $filename,
            'size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
        ], 201, [], 'Foto berhasil diunggah.');
    }
}
