import { CartStoreGroup } from "@/types/domain";

export const MOCK_CART_GROUPS: CartStoreGroup[] = [
  {
    merchantId: "merch-sentra-teknik",
    merchantName: "Sentra Teknik Sparepart (Official Store)",
    subtotal: 630000,
    items: [
      {
        productId: "prod-freon-r32-daikin",
        productTitle: "Freon R32 Daikin Original Refrigerant (Tabung 3 Kg)",
        merchantId: "merch-sentra-teknik",
        merchantName: "Sentra Teknik Sparepart",
        unitPrice: 245000,
        unitPriceSnapshot: 245000,
        quantity: 1,
        stock: 18,
        linkedServiceOrderId: "order-normal-progress",
      },
      {
        productId: "prod-pipa-tembaga-inaba",
        productTitle: "Pipa Tembaga Inaba Denko Roll 0.6mm (5 Meter)",
        merchantId: "merch-sentra-teknik",
        merchantName: "Sentra Teknik Sparepart",
        unitPrice: 385000,
        unitPriceSnapshot: 385000,
        quantity: 1,
        stock: 12,
      },
    ],
  },
  {
    merchantId: "merch-jaya-motor",
    merchantName: "Jaya Pendingin Glodok",
    subtotal: 68000,
    items: [
      {
        productId: "prod-kapasitor-daikin-25uf",
        productTitle: "Kapasitor Kompresor AC Daikin & Panasonic 25 uF",
        merchantId: "merch-jaya-motor",
        merchantName: "Jaya Pendingin Glodok",
        unitPrice: 68000,
        unitPriceSnapshot: 68000,
        quantity: 1,
        stock: 25,
      },
    ],
  },
];
