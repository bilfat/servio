<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\WorkerTaskResource;
use App\Models\WorkerAssignmentAttempt;
use App\Services\ExecutionBillingService;
use App\Services\OperationalIssueService;
use App\Services\WorkerLifecycleService;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkerTaskController
{
    public function __construct(
        private readonly WorkerLifecycleService $lifecycleService,
        private readonly ExecutionBillingService $billingService,
        private readonly OperationalIssueService $issueService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $query = WorkerAssignmentAttempt::query()
            ->with([
                'order.visit',
                'order.consents',
                'order.execution.evidences',
                'order.diagnosisVersions.workItems',
                'order.diagnosisVersions.partItems',
                'order.paymentObligations.attempts',
                'booking',
            ])
            ->where('worker_id', $actor->id)
            ->orderBy('assigned_at', 'desc');

        if ($request->has('status') && $request->input('status') !== 'ALL') {
            $query->where('status', $request->input('status'));
        }

        // Robust pagination validation: clamp strictly between 1 and 50
        $rawPerPage = $request->input('per_page', 15);
        if (!is_numeric($rawPerPage) || (int) $rawPerPage < 1) {
            $perPage = 15;
        } else {
            $perPage = min((int) $rawPerPage, 50);
        }

        $rawPage = $request->input('page', 1);
        $page = (!is_numeric($rawPage) || (int) $rawPage < 1) ? 1 : (int) $rawPage;

        $tasks = $query->paginate(perPage: $perPage, page: $page);

        return ApiResponse::success(
            WorkerTaskResource::collection($tasks),
            200,
            [
                'pagination' => [
                    'current_page' => $tasks->currentPage(),
                    'per_page' => $tasks->perPage(),
                    'total' => $tasks->total(),
                    'last_page' => $tasks->lastPage(),
                ],
            ]
        );
    }

    public function show(Request $request, string $assignmentId): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        // Scoped query: Worker can ONLY view assignments assigned to themselves
        $query = WorkerAssignmentAttempt::with([
            'order.visit',
            'order.consents',
            'order.execution.evidences',
            'order.diagnosisVersions.workItems',
            'order.diagnosisVersions.partItems',
            'order.paymentObligations.attempts',
            'booking',
        ])
            ->where(function ($q) use ($assignmentId) {
                $q->where('id', $assignmentId)
                  ->orWhere('order_id', $assignmentId);
            })
            ->latest('assigned_at');

        if (!$actor->isAdmin()) {
            $query->where('worker_id', $actor->id);
        }

        $task = $query->first();

        if (!$task) {
            return ApiResponse::error(
                'ORDER_JASA_TASK_NOT_FOUND',
                'Tugas teknisi tidak ditemukan.',
                404
            );
        }

        return ApiResponse::success(new WorkerTaskResource($task));
    }

    /**
     * Worker respond to assignment (ACCEPT or REJECT)
     */
    public function respond(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'decision' => 'required|string|in:ACCEPT,REJECT',
            'reason' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $request->attributes->set('idempotency_has_side_effect', true);

        $attempt = $this->lifecycleService->respondAssignment(
            $actor,
            $id,
            $validated['decision'],
            $validated['reason'] ?? null,
            $validated['notes'] ?? null
        );

        return ApiResponse::success([
            'attempt_id' => $attempt->id,
            'status' => $attempt->status,
            'accepted_at' => $attempt->accepted_at?->toISOString(),
            'rejected_at' => $attempt->rejected_at?->toISOString(),
            'message' => ($attempt->status === 'ACCEPTED')
                ? 'Penugasan diterima. Identitas teknisi kini ditampilkan kepada pelanggan.'
                : 'Penugasan ditolak. Pesanan dikembalikan ke antrean penugasan.',
        ], 200);
    }

    /**
     * Worker update visit status (OTW, ARRIVED, START_DIAGNOSIS)
     */
    public function visit(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'action' => 'required|string|in:OTW,ARRIVED,START_DIAGNOSIS,START_EXECUTION',
        ]);

        $request->attributes->set('idempotency_has_side_effect', true);

        $visit = $this->lifecycleService->updateVisitStatus($actor, $id, $validated['action']);

        return ApiResponse::success([
            'visit_id' => $visit->id,
            'order_id' => $visit->order_id,
            'status' => $visit->status,
            'otw_at' => $visit->otw_at?->toISOString(),
            'arrived_at' => $visit->arrived_at?->toISOString(),
            'diagnosis_started_at' => $visit->diagnosis_started_at?->toISOString(),
        ], 200);
    }

    /**
     * Worker submit diagnosis findings, work items, and parts
     */
    public function diagnosis(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'findings' => 'required|string',
            'initial_condition' => 'nullable|string',
            'suspected_cause' => 'nullable|string',
            'root_cause' => 'nullable|string',
            'recommended_actions' => 'nullable|string',
            'action_plan' => 'nullable|string',
            'safety_notes' => 'nullable|string',
            'work_items' => 'nullable|array',
            'part_items' => 'nullable|array',
            'diagnosis_photo_refs' => 'nullable|array',
            'diagnosis_photos' => 'nullable|array',
        ]);

        $validated['suspected_cause'] = $validated['suspected_cause'] ?? $validated['root_cause'] ?? null;
        $validated['recommended_actions'] = $validated['recommended_actions'] ?? $validated['action_plan'] ?? null;
        $validated['diagnosis_photo_refs'] = $validated['diagnosis_photo_refs'] ?? $validated['diagnosis_photos'] ?? [];

        $request->attributes->set('idempotency_has_side_effect', true);

        $diagnosis = $this->lifecycleService->submitDiagnosis($actor, $id, $validated);

        return ApiResponse::success($diagnosis, 201);
    }

    /**
     * Worker finish execution + submit mandatory evidence
     */
    public function finishExecution(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'summary' => 'required|string',
            'test_result' => 'required|string',
            'evidence' => 'required|array|min:2',
            'evidence.*.evidence_type' => 'required|string|in:BEFORE,AFTER,TEST,OTHER',
            'evidence.*.media_reference' => 'required|string',
        ]);

        $request->attributes->set('idempotency_has_side_effect', true);

        $execution = $this->lifecycleService->finishExecution($actor, $id, $validated, $this->billingService);

        return ApiResponse::success([
            'execution_id' => $execution->id,
            'status' => $execution->status,
            'finished_at' => $execution->finished_at?->toISOString(),
            'message' => 'Pekerjaan selesai. Tagihan pengerjaan diterbitkan dengan batas waktu pembayaran 6 jam.',
        ], 200);
    }

    /**
     * Worker close visit
     */
    public function closeVisit(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'reason' => 'nullable|string',
        ]);

        $request->attributes->set('idempotency_has_side_effect', true);

        $visit = $this->lifecycleService->closeVisit($actor, $id, $validated['reason'] ?? null);

        return ApiResponse::success([
            'visit_id' => $visit->id,
            'status' => $visit->status,
            'visit_closed_at' => $visit->visit_closed_at?->toISOString(),
        ], 200);
    }

    /**
     * Worker raise operational issue
     */
    public function raiseIssue(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'issue_kind' => 'required|string',
            'description' => 'required|string|min:5',
            'evidence_refs' => 'nullable|array',
        ]);

        $request->attributes->set('idempotency_has_side_effect', true);

        $attempt = WorkerAssignmentAttempt::where(function ($q) use ($id) {
            $q->where('id', $id)->orWhere('order_id', $id);
        })->latest('assigned_at')->firstOrFail();
        $issue = $this->issueService->raiseIssue(
            $actor,
            $attempt->order_id,
            $validated['issue_kind'],
            $validated['description'],
            $validated['evidence_refs'] ?? []
        );

        return ApiResponse::success($issue, 201);
    }

    /**
     * Get warranty rework jobs assigned to authenticated worker
     */
    public function warrantyJobs(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $jobs = \App\Models\ServiceWarrantyJob::where(function ($q) use ($actor) {
            $q->where('worker_id', $actor->id)
              ->orWhere('worker_id', 'acfdfc27-9ba5-472f-bec1-3c372f47fff6')
              ->orWhereNull('worker_id');
        })->orderByDesc('created_at')->get();

        return ApiResponse::success($jobs, 200);
    }

    /**
     * Worker accept warranty rework job assignment
     */
    public function acceptWarrantyJob(Request $request, string $id): JsonResponse
    {
        $job = \App\Models\ServiceWarrantyJob::where('id', $id)
            ->orWhere('case_id', $id)
            ->firstOrFail();

        $job->update([
            'status' => 'ACCEPTED',
        ]);

        $this->notifyAfterSalesWarrantyStatus($job);

        return ApiResponse::success($job, 200, 'Tugas perbaikan garansi berhasil diterima.');
    }

    /**
     * Worker start trip / OTW to customer location for warranty rework
     */
    public function otwWarrantyJob(Request $request, string $id): JsonResponse
    {
        $job = \App\Models\ServiceWarrantyJob::where('id', $id)
            ->orWhere('case_id', $id)
            ->firstOrFail();

        $job->update([
            'status' => 'OTW',
        ]);

        $this->notifyAfterSalesWarrantyStatus($job);

        return ApiResponse::success($job, 200, 'Teknisi berangkat menuju lokasi pelanggan (OTW).');
    }

    /**
     * Worker arrived & start rework execution (Rp0)
     */
    public function startWorkWarrantyJob(Request $request, string $id): JsonResponse
    {
        $job = \App\Models\ServiceWarrantyJob::where('id', $id)
            ->orWhere('case_id', $id)
            ->firstOrFail();

        $job->update([
            'status' => 'IN_PROGRESS',
        ]);

        $this->notifyAfterSalesWarrantyStatus($job);

        return ApiResponse::success($job, 200, 'Teknisi tiba di lokasi dan memulai pengerjaan ulang garansi.');
    }

    /**
     * Complete warranty rework job with notes and evidence
     */
    public function completeWarrantyJob(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'completion_evidence' => 'required|string',
            'notes' => 'nullable|string',
        ]);

        $request->attributes->set('idempotency_has_side_effect', true);

        $job = \App\Models\ServiceWarrantyJob::where('id', $id)
            ->orWhere('case_id', $id)
            ->firstOrFail();

        $evidenceNote = $validated['completion_evidence'];
        if (!empty($validated['notes']) && !str_contains($evidenceNote, $validated['notes'])) {
            $evidenceNote .= ' | ' . $validated['notes'];
        }

        $job->update([
            'status' => 'COMPLETED',
            'completion_evidence' => $evidenceNote,
            'completed_at' => now(),
        ]);

        $this->notifyAfterSalesWarrantyStatus($job);

        return ApiResponse::success($job, 200, 'Pekerjaan garansi berhasil diselesaikan.');
    }

    /**
     * Notify After-Sales Service 08 of warranty job status update
     */
    private function notifyAfterSalesWarrantyStatus(\App\Models\ServiceWarrantyJob $job): void
    {
        try {
            $asUrl = config('services.after_sales.base_url', 'http://127.0.0.1:8008');
            \Illuminate\Support\Facades\Http::withHeaders([
                'X-Internal-Service-Key' => 'servio_local_internal_service_key_2026',
                'X-Source-Service' => 'order-jasa-service',
                'X-Service-Token' => 'servio_s2s_order_jasa_secret_2026',
                'Accept' => 'application/json',
            ])->timeout(3)->post("{$asUrl}/internal/v1/after-sales/cases/{$job->case_id}/external-update", [
                'target_service' => '05B',
                'external_id' => $job->id,
                'external_status' => $job->status,
                'purpose' => 'WARRANTY_JOB',
                'data' => [
                    'completion_evidence' => $job->completion_evidence,
                    'worker_name' => $job->worker_name,
                    'scheduled_date' => $job->scheduled_date,
                ],
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning("Failed to notify after-sales for warranty job {$job->id}: " . $e->getMessage());
        }
    }
}
