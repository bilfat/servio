<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSubcategoryRequest extends FormRequest
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
            'category_id' => ['prohibited'],
            'parent_id' => ['prohibited'],
            'master_id' => ['prohibited'],
        ];
    }

    public function messages(): array
    {
        return [
            'category_id.prohibited' => 'Perubahan parent Subcategory dilarang setelah pembuatan.',
            'parent_id.prohibited' => 'Perubahan parent Subcategory dilarang setelah pembuatan.',
            'master_id.prohibited' => 'Perubahan parent Subcategory dilarang setelah pembuatan.',
            'name.required' => 'Nama subkategori tidak boleh kosong.',
            'name.max' => 'Nama subkategori maksimal 160 karakter.',
        ];
    }
}
