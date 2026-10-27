<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Domain\Cart\CartService;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function __construct(
        protected CartService $cartService
    ) {}

    public function index(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');
        $cart = $this->cartService->getCartGrouped($actor->id);

        return ApiResponse::success($cart, 'CART_LOADED');
    }

    public function addItem(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'product_id' => 'required|string',
            'variant_id' => 'required|string',
            'quantity' => 'required|integer|min:1',
            'merchant_org_id' => 'nullable|string',
        ]);

        $item = $this->cartService->addItem(
            customerId: $actor->id,
            productId: $validated['product_id'],
            variantId: $validated['variant_id'],
            quantity: (int) $validated['quantity'],
            merchantOrgId: $validated['merchant_org_id'] ?? null
        );

        return ApiResponse::success($item, 'CART_ITEM_ADDED', 201);
    }

    public function updateItem(Request $request, string $itemId): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'quantity' => 'required|integer|min:0',
        ]);

        $item = $this->cartService->updateQuantity(
            customerId: $actor->id,
            itemId: $itemId,
            quantity: (int) $validated['quantity']
        );

        return ApiResponse::success($item, 'CART_ITEM_UPDATED');
    }

    public function removeItem(Request $request, string $itemId): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $this->cartService->removeItem($actor->id, $itemId);

        return ApiResponse::success(['removed_item_id' => $itemId], 'CART_ITEM_REMOVED');
    }
}
