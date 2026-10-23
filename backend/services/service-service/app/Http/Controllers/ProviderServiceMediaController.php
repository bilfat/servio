<?php

namespace App\Http\Controllers;

use App\Domain\Service\Actions\RecordServiceAudit;
use App\Infrastructure\Media\ServiceMediaService;
use App\Models\ServiceOffering;
use App\Models\ServiceOfferingMedia;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProviderServiceMediaController extends Controller
{
    public function __construct(
        protected ServiceMediaService $mediaService
    ) {}

    /**
     * M08: Upload media for offering
     */
    public function store(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $offering = ServiceOffering::where('provider_organization_id', $actor->organizationId)->find($id);
        if (! $offering) {
            return ApiResponse::error('SERVICE_NOT_FOUND', 'Penawaran jasa tidak ditemukan.', 404);
        }

        $request->validate([
            'file' => 'required|file|mimes:jpeg,png,webp|max:5120',
            'is_primary' => 'nullable|boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        $file = $request->file('file');
        $isPrimary = $request->boolean('is_primary', false);
        $sortOrder = (int) $request->input('sort_order', 0);

        try {
            $media = $this->mediaService->storeOfferingMedia($file, $offering->id, $isPrimary, $sortOrder);

            RecordServiceAudit::execute(
                entityType: 'SERVICE_OFFERING_MEDIA',
                entityId: $media->id,
                action: 'UPLOAD_MEDIA',
                before: null,
                after: ['media_id' => $media->id, 'is_primary' => $isPrimary],
                offeringId: $offering->id
            );

            return ApiResponse::success([
                'id' => $media->id,
                'offering_id' => $media->offering_id,
                'url' => "/api/v1/service-media/{$media->id}",
                'mime_type' => $media->mime_type,
                'bytes' => $media->bytes,
                'sort_order' => $media->sort_order,
                'is_primary' => (bool) $media->is_primary,
                'storage_state' => $media->storage_state,
            ], 'SERVICE_MEDIA_UPLOADED', 201);
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error('SERVICE_MEDIA_INVALID', $e->getMessage(), 422);
        }
    }

    /**
     * M09: Reorder media & set primary
     */
    public function reorder(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $offering = ServiceOffering::where('provider_organization_id', $actor->organizationId)->find($id);
        if (! $offering) {
            return ApiResponse::error('SERVICE_NOT_FOUND', 'Penawaran jasa tidak ditemukan.', 404);
        }

        $request->validate([
            'ordered_media_ids' => 'required|array',
            'ordered_media_ids.*' => 'uuid',
            'primary_media_id' => 'nullable|uuid',
        ]);

        $orderedIds = $request->input('ordered_media_ids');
        $primaryId = $request->input('primary_media_id');

        return DB::transaction(function () use ($offering, $orderedIds, $primaryId) {
            foreach ($orderedIds as $index => $mediaId) {
                ServiceOfferingMedia::where('id', $mediaId)
                    ->where('offering_id', $offering->id)
                    ->update(['sort_order' => $index]);
            }

            if ($primaryId) {
                ServiceOfferingMedia::where('offering_id', $offering->id)
                    ->update(['is_primary' => false]);

                ServiceOfferingMedia::where('id', $primaryId)
                    ->where('offering_id', $offering->id)
                    ->update(['is_primary' => true]);
            }

            $offering->lock_version += 1;
            $offering->save();

            $mediaList = ServiceOfferingMedia::where('offering_id', $offering->id)
                ->orderBy('sort_order')
                ->get()
                ->map(fn ($m) => [
                    'id' => $m->id,
                    'url' => "/api/v1/service-media/{$m->id}",
                    'is_primary' => (bool) $m->is_primary,
                    'sort_order' => $m->sort_order,
                ]);

            return ApiResponse::success([
                'offering_id' => $offering->id,
                'media' => $mediaList,
                'lock_version' => $offering->lock_version,
            ], 'SERVICE_MEDIA_REORDERED', 200);
        });
    }

    /**
     * M10: Delete media
     */
    public function destroy(Request $request, string $id, string $media_id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $offering = ServiceOffering::where('provider_organization_id', $actor->organizationId)->find($id);
        if (! $offering) {
            return ApiResponse::error('SERVICE_NOT_FOUND', 'Penawaran jasa tidak ditemukan.', 404);
        }

        $media = ServiceOfferingMedia::where('id', $media_id)->where('offering_id', $offering->id)->first();
        if (! $media) {
            return ApiResponse::error('SERVICE_NOT_FOUND', 'File gambar tidak ditemukan.', 404);
        }

        // If offering is ACTIVE and media is primary, deletion is rejected!
        if ($offering->isActive() && $media->is_primary) {
            return ApiResponse::error(
                'SERVICE_MEDIA_PRIMARY_REQUIRED',
                'Foto utama tidak dapat dihapus saat penawaran jasa sedang aktif. Ganti foto utama terlebih dahulu atau nonaktifkan jasa.',
                409
            );
        }

        $media->delete();

        RecordServiceAudit::execute(
            entityType: 'SERVICE_OFFERING_MEDIA',
            entityId: $media->id,
            action: 'DELETE_MEDIA',
            before: ['media_id' => $media->id],
            after: null,
            offeringId: $offering->id
        );

        return ApiResponse::success([
            'id' => $media->id,
            'deleted' => true,
        ], 'SERVICE_MEDIA_DELETED', 200);
    }
}
