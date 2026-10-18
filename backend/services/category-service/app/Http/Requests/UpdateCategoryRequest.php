<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:2000'],
            'icon_name' => ['nullable', 'string', 'max:64'],
            'master_id' => ['prohibited'],
            'parent_id' => ['prohibited'],
        ];
    }

    public function messages(): array
    {
        return [
            'master_id.prohibited' => 'Perubahan parent Category dilarang setelah pembuatan.',
            'parent_id.prohibited' => 'Perubahan parent Category dilarang setelah pembuatan.',
            'name.required' => 'Nama kategori tidak boleh kosong.',
            'name.max' => 'Nama kategori maksimal 160 karakter.',
        ];
    }
}
