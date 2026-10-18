<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateSubcategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category_id' => ['required', 'string', 'uuid', 'exists:categories,id'],
            'name' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        return [
            'category_id.required' => 'Parent Category wajib dipilih.',
            'category_id.exists' => 'Parent Category tidak ditemukan.',
            'name.required' => 'Nama subkategori wajib diisi.',
            'name.max' => 'Nama subkategori maksimal 160 karakter.',
        ];
    }
}
