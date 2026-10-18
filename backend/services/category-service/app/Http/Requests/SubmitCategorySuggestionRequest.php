<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SubmitCategorySuggestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'request_type' => ['required', 'string', 'in:CATEGORY,SUBCATEGORY'],
            'master_code' => ['required', 'string', 'in:PRODUK,JASA'],
            'proposed_parent_category_id' => [
                'nullable',
                'string',
                'uuid',
                'required_if:request_type,SUBCATEGORY',
                'prohibited_if:request_type,CATEGORY',
                'exists:categories,id',
            ],
            'suggested_name' => ['required', 'string', 'max:160'],
            'reason' => ['required', 'string', 'max:2000'],
            'additional_information' => ['nullable', 'string', 'max:4000'],
        ];
    }

    public function messages(): array
    {
        return [
            'request_type.required' => 'Jenis pengajuan wajib dipilih (CATEGORY atau SUBCATEGORY).',
            'request_type.in' => 'Jenis pengajuan tidak valid.',
            'master_code.required' => 'Cabang Master (PRODUK / JASA) wajib dipilih.',
            'master_code.in' => 'Cabang Master harus PRODUK atau JASA.',
            'proposed_parent_category_id.required_if' => 'Parent Category wajib dipilih untuk pengajuan SUBCATEGORY.',
            'proposed_parent_category_id.prohibited_if' => 'Parent Category tidak boleh diisi untuk pengajuan CATEGORY.',
            'proposed_parent_category_id.exists' => 'Parent Category yang dipilih tidak ditemukan.',
            'suggested_name.required' => 'Usulan nama kategori wajib diisi.',
            'reason.required' => 'Alasan pengajuan wajib diisi.',
        ];
    }
}
