<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserAddress;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class UserAddressController extends Controller
{
    /**
     * List customer work addresses
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return ApiResponse::error('IDENTITY_UNAUTHENTICATED', 'Pengguna belum terautentikasi.', 401);
        }

        $addresses = UserAddress::where('user_id', $user->id)
            ->where('status', 'ACTIVE')
            ->orderByDesc('is_default')
            ->orderByDesc('created_at')
            ->get();

        $list = $addresses->map(fn (UserAddress $addr) => $addr->toFrontendArray())->values()->all();

        return ApiResponse::success($list, 'IDENTITY_ADDRESSES_LOADED', 200);
    }

    /**
     * Add new work address
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return ApiResponse::error('IDENTITY_UNAUTHENTICATED', 'Pengguna belum terautentikasi.', 401);
        }

        $addressLine = $request->input('addressLine') ?? $request->input('address_line');
        $city = $request->input('city');

        if (empty($addressLine) || empty($city)) {
            return ApiResponse::error('IDENTITY_VALIDATION_FAILED', 'Alamat lengkap dan kota wajib diisi.', 422, [
                'address_line' => empty($addressLine) ? ['Alamat lengkap wajib diisi.'] : [],
                'city' => empty($city) ? ['Kota/Kabupaten wajib diisi.'] : [],
            ]);
        }

        $isDefault = filter_var($request->input('isDefault', $request->input('is_default', false)), FILTER_VALIDATE_BOOLEAN);

        // If user currently has no addresses, make this the default
        $count = UserAddress::where('user_id', $user->id)->count();
        if ($count === 0) {
            $isDefault = true;
        }

        if ($isDefault) {
            UserAddress::where('user_id', $user->id)->update(['is_default' => false]);
        }

        $addr = UserAddress::create([
            'id' => (string) Str::uuid(),
            'user_id' => $user->id,
            'label' => $request->input('label', 'Rumah'),
            'recipient_name' => $request->input('recipientName', $request->input('recipient_name', $user->profile?->display_name ?? 'Pelanggan')),
            'phone' => $request->input('phone', $user->phone_e164),
            'address_line' => $addressLine,
            'province' => $request->input('province', 'DKI Jakarta'),
            'city' => $city,
            'district' => $request->input('district'),
            'village' => $request->input('village'),
            'postal_code' => $request->input('postalCode', $request->input('postal_code')),
            'latitude' => $request->filled('latitude') ? (float) $request->input('latitude') : null,
            'longitude' => $request->filled('longitude') ? (float) $request->input('longitude') : null,
            'is_default' => $isDefault,
            'status' => 'ACTIVE',
        ]);

        return ApiResponse::success($addr->toFrontendArray(), 'IDENTITY_ADDRESS_CREATED', 201, [
            'message' => 'Alamat baru berhasil ditambahkan ke database!',
        ]);
    }

    /**
     * Update existing work address
     */
    public function update(Request $request, string $id)
    {
        $user = Auth::user();
        if (!$user) {
            return ApiResponse::error('IDENTITY_UNAUTHENTICATED', 'Pengguna belum terautentikasi.', 401);
        }

        $addr = UserAddress::where('id', $id)->where('user_id', $user->id)->first();
        if (!$addr) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Alamat tidak ditemukan atau bukan milik akun Anda.', 404);
        }

        if ($request->has('label')) {
            $addr->label = $request->input('label');
        }
        if ($request->has('recipientName') || $request->has('recipient_name')) {
            $addr->recipient_name = $request->input('recipientName', $request->input('recipient_name'));
        }
        if ($request->has('phone')) {
            $addr->phone = $request->input('phone');
        }
        if ($request->has('addressLine') || $request->has('address_line')) {
            $addr->address_line = $request->input('addressLine', $request->input('address_line'));
        }
        if ($request->has('city')) {
            $addr->city = $request->input('city');
        }
        if ($request->has('province')) {
            $addr->province = $request->input('province');
        }
        if ($request->has('district')) {
            $addr->district = $request->input('district');
        }
        if ($request->has('village')) {
            $addr->village = $request->input('village');
        }
        if ($request->has('postalCode') || $request->has('postal_code')) {
            $addr->postal_code = $request->input('postalCode', $request->input('postal_code'));
        }
        if ($request->has('latitude')) {
            $addr->latitude = $request->filled('latitude') ? (float) $request->input('latitude') : null;
        }
        if ($request->has('longitude')) {
            $addr->longitude = $request->filled('longitude') ? (float) $request->input('longitude') : null;
        }
        if ($request->has('isDefault') || $request->has('is_default')) {
            $newDefault = filter_var($request->input('isDefault', $request->input('is_default')), FILTER_VALIDATE_BOOLEAN);
            if ($newDefault) {
                UserAddress::where('user_id', $user->id)->where('id', '!=', $addr->id)->update(['is_default' => false]);
            }
            $addr->is_default = $newDefault;
        }

        $addr->save();

        return ApiResponse::success($addr->toFrontendArray(), 'IDENTITY_ADDRESS_UPDATED', 200, [
            'message' => 'Alamat berhasil diperbarui di database!',
        ]);
    }

    /**
     * Delete work address
     */
    public function destroy(Request $request, string $id)
    {
        $user = Auth::user();
        if (!$user) {
            return ApiResponse::error('IDENTITY_UNAUTHENTICATED', 'Pengguna belum terautentikasi.', 401);
        }

        $addr = UserAddress::where('id', $id)->where('user_id', $user->id)->first();
        if (!$addr) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Alamat tidak ditemukan atau bukan milik akun Anda.', 404);
        }

        $wasDefault = $addr->is_default;
        $addr->delete();

        if ($wasDefault) {
            // Promote next remaining address to default
            $next = UserAddress::where('user_id', $user->id)->orderByDesc('created_at')->first();
            if ($next) {
                $next->is_default = true;
                $next->save();
            }
        }

        return ApiResponse::success([
            'message' => 'Alamat berhasil dihapus dari database.',
        ], 'IDENTITY_ADDRESS_DELETED', 200);
    }
}
