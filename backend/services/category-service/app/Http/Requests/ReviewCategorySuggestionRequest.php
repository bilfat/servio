<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReviewCategorySuggestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'to_status' => ['required', 'string', 'in:PROCESSING,REJECTED,FULFILLED,APPROVED'],
            'review_reason' => ['nullable', 'string', 'max:2000', 'required_if:to_status,REJECTED', 'required_if:to_status,APPROVED'],
            'duplicate_of_request_id' => ['nullable', 'string', 'uuid', 'exists:category_requests,id'],
            'fulfilled_node' => ['nullable', 'array', 'required_if:to_status,FULFILLED'],
            'fulfilled_node.node_type' => ['required_with:fulfilled_node', 'string', 'in:CATEGORY,SUBCATEGORY'],
            'fulfilled_node.node_id' => ['required_with:fulfilled_node', 'string', 'uuid'],
        ];
    }

    public function messages(): array
    {
        return [
            'to_status.required' => 'Status keputusan review wajib dipilih (PROCESSING, REJECTED, atau FULFILLED).',
            'to_status.in' => 'Status keputusan review tidak valid.',
            'review_reason.required_if' => 'Alasan penolakan (review_reason) wajib dicantumkan jika status REJECTED.',
            'fulfilled_node.required_if' => 'Target node resmi (fulfilled_node) wajib dicantumkan jika status FULFILLED.',
            'duplicate_of_request_id.exists' => 'Referensi request duplikat tidak ditemukan.',
        ];
    }
}
