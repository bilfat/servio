import { z } from "zod";

/**
 * Service Booking Wizard Step Schemas (Layer 7 Form Validation)
 */
export const bookingStep1Schema = z.object({
  serviceMode: z.string().min(1, "Mode layanan wajib dipilih"),
  assetId: z.string().optional(),
  customFields: z.record(z.string(), z.any()).optional(),
});

export const bookingStep2Schema = z.object({
  date: z.string().min(1, "Tanggal layanan wajib dipilih"),
  timeSlot: z.string().min(1, "Sesi waktu wajib dipilih"),
});

export const bookingStep3Schema = z.object({
  street: z.string().min(5, "Alamat lengkap minimal 5 karakter"),
  district: z.string().min(3, "Kecamatan / Kota wajib diisi"),
  notes: z.string().optional(),
  contactPhone: z
    .string()
    .min(10, "Nomor telepon minimal 10 digit")
    .regex(/^[0-9+-\s]+$/, "Format nomor telepon tidak valid"),
});

export const bookingStep4Schema = z.object({
  notes: z.string().optional(),
  agreedToTerms: z.boolean().refine((val) => val === true, {
    message: "Anda wajib menyetujui syarat & ketentuan layanan",
  }),
});

export const completeBookingSchema = bookingStep1Schema
  .merge(bookingStep2Schema)
  .merge(bookingStep3Schema)
  .merge(bookingStep4Schema);

export type BookingWizardFormValues = z.infer<typeof completeBookingSchema>;

/**
 * Digital Warranty Claim Schema
 */
export const warrantyClaimSchema = z.object({
  warrantyId: z.string().min(1, "ID garansi tidak valid"),
  issueDescription: z.string().min(15, "Deskripsi kendala minimal 15 karakter"),
  preferredDate: z.string().min(1, "Tanggal kunjungan teknisi wajib dipilih"),
  contactPhone: z
    .string()
    .min(10, "Nomor telepon minimal 10 digit")
    .regex(/^[0-9+-\s]+$/, "Format nomor telepon tidak valid"),
  agreeToPolicy: z.boolean().refine((val) => val === true, {
    message: "Anda wajib menyetujui kebijakan klaim garansi resmi",
  }),
});

export type WarrantyClaimFormValues = z.infer<typeof warrantyClaimSchema>;

/**
 * Product Return / Refund Request Schema
 */
export const returnFormSchema = z.object({
  orderId: z.string().min(1, "ID pesanan produk wajib diisi"),
  reason: z.string().min(10, "Alasan pengajuan retur minimal 10 karakter"),
  resolutionType: z.enum(["EXCHANGE", "REFUND"], {
    error: "Pilihan solusi wajib ditentukan",
  }),
  description: z.string().min(20, "Penjelasan detail kendala fisik minimal 20 karakter"),
  hasUnboxingVideo: z.boolean().refine((val) => val === true, {
    message: "Wajib menyertakan bukti video unboxing tanpa jeda",
  }),
});

export type ReturnFormValues = z.infer<typeof returnFormSchema>;

/**
 * =========================================================
 * OPERATIONAL SCHEMAS (M5–M8 / ROOT-04)
 * =========================================================
 */

// TAXONOMY V1: Provider Service Offering Configuration (LOCKED DECISION)
export const providerServiceOfferingSchema = z
  .object({
    categoryId: z.string().min(1, "Kategori wajib dipilih"),
    subcategoryId: z.string().min(1, "Subkategori wajib dipilih"),
    name: z.string().min(3, "Nama master service minimal 3 karakter"),
    description: z.string().min(10, "Deskripsi layanan minimal 10 karakter"),
    priceMin: z.number().min(0, "Harga minimum tidak boleh negatif"),
    priceMax: z.number().min(0, "Harga maksimum tidak boleh negatif"),
    surveyFee: z.number().min(0, "Biaya survei tidak boleh negatif"),
    serviceMethods: z
      .array(
        z.enum([
          "HOME_SERVICE",
          "WORKSHOP",
          "ON_SITE",
          "REMOTE_ONLINE",
          "PICKUP_RETURN",
          "MOBILE_SERVICE",
        ])
      )
      .min(1, "Pilih minimal 1 metode layanan"),
  })
  .refine((data) => data.priceMax >= data.priceMin, {
    message: "Harga maksimum harus lebih besar atau sama dengan harga minimum",
    path: ["priceMax"],
  });
export type ProviderServiceOfferingFormValues = z.infer<typeof providerServiceOfferingSchema>;

// TAXONOMY V1: CEO Category Governance Schema
export const categoryGovernanceSchema = z.object({
  name: z.string().min(3, "Nama kategori minimal 3 karakter"),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});
export type CategoryGovernanceFormValues = z.infer<typeof categoryGovernanceSchema>;

// TAXONOMY V1: Admin Subcategory Operations Schema
export const subcategoryOperationsSchema = z.object({
  categoryId: z.string().min(1, "Kategori induk wajib dipilih"),
  name: z.string().min(3, "Nama subkategori minimal 3 karakter"),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});
export type SubcategoryOperationsFormValues = z.infer<typeof subcategoryOperationsSchema>;

// TAXONOMY V1: Provider Subcategory Request Schema
export const subcategoryRequestSchema = z.object({
  categoryId: z.string().min(1, "Kategori wajib dipilih"),
  requestedSubcategoryName: z.string().min(3, "Nama subkategori minimal 3 karakter"),
  reason: z.string().min(10, "Alasan pengajuan minimal 10 karakter"),
  notes: z.string().optional(),
});
export type SubcategoryRequestFormValues = z.infer<typeof subcategoryRequestSchema>;

// M5: Booking Reject / Reschedule
export const bookingActionSchema = z.object({
  action: z.enum(["REJECT", "RESCHEDULE"]),
  reason: z.string().min(5, "Alasan keputusan minimal 5 karakter"),
  alternativeDate: z.string().optional(),
  alternativeTimeSlot: z.string().optional(),
});
export type BookingActionFormValues = z.infer<typeof bookingActionSchema>;

// M5: Quotation Generation
export const quotationItemSchema = z.object({
  id: z.string(),
  name: z.string().min(2, "Nama item biaya minimal 2 karakter"),
  type: z.enum(["LABOR", "MATERIAL", "SURVEY"]),
  quantity: z.number().min(1, "Kuantitas minimal 1"),
  unitPrice: z.number().min(1000, "Harga satuan minimal Rp 1.000"),
});

export const quotationFormSchema = z.object({
  items: z.array(quotationItemSchema).min(1, "Minimal masukkan 1 rincian item penawaran"),
  surveySummary: z.string().min(10, "Ringkasan hasil survei minimal 10 karakter"),
  validDays: z.number().min(1, "Masa berlaku minimal 1 hari").max(30, "Masa berlaku maksimal 30 hari"),
  surveyFeeDeduction: z.number().min(0, "Potongan survei tidak boleh negatif"),
});
export type QuotationFormValues = z.infer<typeof quotationFormSchema>;

// M5: Technician Registration
export const technicianRegistrationSchema = z.object({
  name: z.string().min(3, "Nama lengkap teknisi minimal 3 karakter"),
  phone: z
    .string()
    .min(10, "Nomor WhatsApp teknisi minimal 10 digit")
    .regex(/^[0-9+-\s]+$/, "Format nomor telepon tidak valid"),
  email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
  specialization: z.string().optional(),
  certificate: z.string().optional(),
  vehicle: z.string().optional(),
  vehicleNumber: z.string().min(4, "Nomor pelat kendaraan operasional wajib diisi"),
  status: z.enum(["ONLINE", "OFFLINE"]).default("ONLINE"),
});
export type TechnicianRegistrationFormValues = z.infer<typeof technicianRegistrationSchema>;

// M5: Dispute Provider Response
export const disputeResponseSchema = z.object({
  providerStatement: z.string().min(15, "Tanggapan resmi mitra minimal 15 karakter"),
  proposedSolution: z.enum(["FREE_REWORK", "PARTIAL_REFUND", "REJECT_EXPLAIN"], {
    error: "Pilih solusi yang ditawarkan mitra",
  }),
  revisitDate: z.string().optional(),
});
export type DisputeResponseFormValues = z.infer<typeof disputeResponseSchema>;

// M5: Inventory Adjustment
export const inventoryAdjustmentSchema = z.object({
  stockAvailable: z.number().min(0, "Stok tidak boleh bernilai negatif"),
  reason: z.string().min(5, "Alasan penyesuaian stok minimal 5 karakter"),
});
export type InventoryAdjustmentFormValues = z.infer<typeof inventoryAdjustmentSchema>;

// M6: Worker Proof & Technical Readings
export const workerProofReadingsSchema = z.object({
  voltage: z.string().min(1, "Nilai voltase (V) wajib dicatat"),
  currentAmpere: z.string().min(1, "Nilai arus (Ampere) wajib dicatat"),
  freonPsi: z.string().min(1, "Tekanan freon (PSI) wajib dicatat"),
  outputTemp: z.string().min(1, "Suhu hembusan (°C) wajib dicatat"),
  technicianNotes: z.string().min(10, "Catatan teknis hasil pengerjaan minimal 10 karakter"),
  confirmedAllChecks: z.boolean().refine((v) => v === true, {
    message: "Wajib mengonfirmasi bahwa seluruh parameter SOP telah diuji",
  }),
});
export type WorkerProofReadingsFormValues = z.infer<typeof workerProofReadingsSchema>;

// M6: Worker Material Usage
export const workerMaterialUsageSchema = z.object({
  name: z.string().min(2, "Nama sparepart / material minimal 2 karakter"),
  quantity: z.number().min(1, "Jumlah minimal 1"),
  status: z.enum(["USED", "RETURNED_TO_SHOP"]),
  barcodeNew: z.string().optional(),
  serialOld: z.string().optional(),
});
export type WorkerMaterialUsageFormValues = z.infer<typeof workerMaterialUsageSchema>;

// M7: Customer Support Mediation Verdict
export const supportMediationVerdictSchema = z.object({
  decisionType: z.enum([
    "FREE_REWORK",
    "PRICE_ADJUSTMENT",
    "FULL_REFUND",
    "PARTIAL_REFUND",
    "REJECT_CLAIM_RELEASE_ESCROW",
  ], {
    error: "Pilihan putusan mediasi wajib ditentukan",
  }),
  notes: z.string().min(15, "Pertimbangan dan dasar putusan mediator minimal 15 karakter"),
  refundAmount: z.number().min(0, "Jumlah refund tidak valid").optional(),
  confirmEscrowResolution: z.boolean().refine((v) => v === true, {
    message: "Wajib menyetujui eksekusi pelepasan/pengembalian dana escrow",
  }),
});
export type SupportMediationVerdictFormValues = z.infer<typeof supportMediationVerdictSchema>;

// M8: Emergency Payment Verification
export const paymentVerificationSchema = z.object({
  gatewayRef: z.string().min(4, "Nomor referensi bank/gateway minimal 4 karakter"),
  notes: z.string().min(5, "Catatan verifikasi manual minimal 5 karakter"),
  confirmSettled: z.boolean().refine((v) => v === true, {
    message: "Wajib memverifikasi bahwa mutasi rekening benar-benar telah masuk",
  }),
});
export type PaymentVerificationFormValues = z.infer<typeof paymentVerificationSchema>;

// M8: Refund Audit & Approval
export const refundAuditSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  auditNotes: z.string().min(10, "Catatan audit disbursement minimal 10 karakter"),
  confirmDisbursement: z.boolean().refine((v) => v === true, {
    message: "Wajib mengonfirmasi transfer dana ke rekening nasabah",
  }),
});
export type RefundAuditFormValues = z.infer<typeof refundAuditSchema>;

// M8: Payout Hold / Fraud Check
export const payoutHoldSchema = z.object({
  holdReason: z.string().min(10, "Alasan penahanan pencairan dana minimal 10 karakter"),
  riskScore: z.enum(["LOW", "MEDIUM", "HIGH"]),
  confirmHold: z.boolean().refine((v) => v === true, {
    message: "Wajib mengonfirmasi status penahanan payout mitra",
  }),
});
export type PayoutHoldFormValues = z.infer<typeof payoutHoldSchema>;

// M9: Merchant Toko Suku Cadang Schemas
export const merchantProductSchema = z.object({
  title: z.string().min(3, "Nama produk minimal 3 karakter"),
  sku: z.string().min(3, "SKU produk minimal 3 karakter"),
  category: z.string().min(2, "Kategori produk wajib dipilih"),
  price: z.number().min(1000, "Harga jual minimal Rp 1.000"),
  costPrice: z.number().min(500, "Harga modal minimal Rp 500"),
  stock: z.number().min(0, "Stok tidak boleh negatif"),
  minStockAlert: z.number().min(1, "Ambang batas stok minimal 1"),
  warrantyMonths: z.number().min(0, "Garansi minimal 0 bulan"),
  isOriginal: z.boolean(),
  compatibilityTags: z.string().optional(),
  description: z.string().min(10, "Deskripsi produk minimal 10 karakter"),
});
export type MerchantProductFormValues = z.infer<typeof merchantProductSchema>;

export const merchantInventoryAdjustmentSchema = z.object({
  productId: z.string().min(1, "Produk wajib dipilih"),
  warehouseId: z.string().min(1, "Gudang wajib dipilih"),
  adjustmentType: z.enum(["RESTOCK", "DAMAGE", "AUDIT_CORRECTION", "TRANSFER"]),
  quantity: z.number().min(1, "Jumlah minimal 1 unit"),
  reason: z.string().min(5, "Alasan penyesuaian minimal 5 karakter"),
});
export type MerchantInventoryAdjustmentFormValues = z.infer<typeof merchantInventoryAdjustmentSchema>;

export const merchantFulfillmentPackSchema = z.object({
  orderId: z.string().min(1, "Order ID tidak valid"),
  lengthCm: z.number().min(1, "Panjang minimal 1 cm"),
  widthCm: z.number().min(1, "Lebar minimal 1 cm"),
  heightCm: z.number().min(1, "Tinggi minimal 1 cm"),
  weightKg: z.number().min(0.01, "Berat minimal 0.01 kg"),
  packerNotes: z.string().optional(),
  confirmPacked: z.boolean().refine((v) => v === true, {
    message: "Wajib konfirmasi verifikasi isi paket dan segel pengaman",
  }),
});
export type MerchantFulfillmentPackFormValues = z.infer<typeof merchantFulfillmentPackSchema>;

export const merchantShipmentDispatchSchema = z.object({
  orderId: z.string().min(1, "Order ID tidak valid"),
  courier: z.string().min(2, "Kurir wajib dipilih"),
  serviceType: z.string().min(2, "Layanan kurir wajib dipilih"),
  awbNumber: z.string().min(5, "Nomor resi (AWB) minimal 5 karakter"),
  dispatchNotes: z.string().optional(),
});
export type MerchantShipmentDispatchFormValues = z.infer<typeof merchantShipmentDispatchSchema>;

export const merchantReturnInspectionSchema = z.object({
  returnId: z.string().min(1, "ID Retur tidak valid"),
  condition: z.enum(["GOOD", "DAMAGED", "WRONG_ITEM", "DEFECTIVE"], {
    error: "Kondisi fisik wajib dipilih",
  }),
  disposition: z.enum(["ACCEPT_RESTOCK", "ACCEPT_REFURBISH", "ACCEPT_DISPOSE", "REJECT"], {
    error: "Disposisi akhir wajib ditentukan",
  }),
  acceptedQty: z.number().min(0, "Jumlah diterima minimal 0"),
  rejectedQty: z.number().min(0, "Jumlah ditolak minimal 0"),
  inspectionNotes: z.string().min(10, "Catatan hasil inspeksi teknis minimal 10 karakter"),
  refundAmount: z.number().min(0, "Nominal refund tidak valid"),
  confirmVerdict: z.boolean().refine((v) => v === true, {
    message: "Wajib memverifikasi keputusan hasil inspeksi klaim retur",
  }),
});
export type MerchantReturnInspectionFormValues = z.infer<typeof merchantReturnInspectionSchema>;

// M9: Supplier B2B Grosir Schemas
export const supplierProductSchema = z.object({
  title: z.string().min(3, "Nama produk grosir minimal 3 karakter"),
  sku: z.string().min(3, "SKU produk minimal 3 karakter"),
  category: z.string().min(2, "Kategori wajib dipilih"),
  moq: z.number().min(1, "Minimum Order Quantity (MOQ) minimal 1"),
  unit: z.string().min(1, "Satuan grosir (Pcs/Box/Karton) wajib diisi"),
  stock: z.number().min(0, "Stok gudang tidak boleh negatif"),
  leadTimeDays: z.number().min(1, "Lead time pengiriman minimal 1 hari"),
  tier1Min: z.number().min(1, "Minimal kuantitas tier 1 harus >= 1"),
  tier1Price: z.number().min(500, "Harga tier 1 minimal Rp 500"),
  tier2Min: z.number().min(2, "Minimal kuantitas tier 2 harus lebih tinggi"),
  tier2Price: z.number().min(500, "Harga tier 2 minimal Rp 500"),
  tier3Min: z.number().min(3, "Minimal kuantitas tier 3 harus lebih tinggi"),
  tier3Price: z.number().min(500, "Harga tier 3 minimal Rp 500"),
  description: z.string().min(10, "Deskripsi produk grosir minimal 10 karakter"),
});
export type SupplierProductFormValues = z.infer<typeof supplierProductSchema>;

export const supplierKargoManifestSchema = z.object({
  poNumber: z.string().min(3, "Nomor PO wajib valid"),
  kargoCarrier: z.string().min(2, "Ekspedisi kargo logistik wajib dipilih"),
  truckType: z.string().min(2, "Jenis armada / truk wajib dipilih"),
  driverName: z.string().min(3, "Nama pengemudi / sopir minimal 3 karakter"),
  driverPhone: z.string().min(10, "Nomor telepon pengemudi minimal 10 digit"),
  plateNumber: z.string().min(4, "Nomor plat kendaraan minimal 4 karakter"),
  palletCount: z.number().min(1, "Jumlah palet minimal 1"),
  totalWeightKg: z.number().min(1, "Total tonase/berat minimal 1 kg"),
  manifestNotes: z.string().optional(),
  confirmLoading: z.boolean().refine((v) => v === true, {
    message: "Wajib konfirmasi bahwa muatan telah dimuat ke armada dan diikat aman",
  }),
});
export type SupplierKargoManifestFormValues = z.infer<typeof supplierKargoManifestSchema>;

export const supplierReturnInspectionSchema = z.object({
  returnId: z.string().min(1, "ID Retur tidak valid"),
  condition: z.enum(["PRISTINE_RESTOCK", "DAMAGED_SCRAP", "DEFECTIVE_FACTORY"], {
    error: "Kondisi fisik barang B2B wajib dipilih",
  }),
  creditAmount: z.number().min(0, "Nilai nota kredit (Credit Note) minimal Rp 0"),
  inspectorNotes: z.string().min(10, "Catatan QC & penimbangan barang minimal 10 karakter"),
  confirmCreditNote: z.boolean().refine((v) => v === true, {
    message: "Wajib menyetujui penerbitan Nota Kredit (Credit Note) resmi",
  }),
});
export type SupplierReturnInspectionFormValues = z.infer<typeof supplierReturnInspectionSchema>;

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().min(1, "Supplier wajib dipilih"),
  offerId: z.string().min(1, "Penawaran produk B2B wajib dipilih"),
  quantity: z.number().min(1, "Kuantitas pesanan minimal 1"),
  warehouseId: z.string().min(1, "Gudang penerima wajib dipilih"),
  deliveryAddress: z.string().min(5, "Alamat gudang tujuan minimal 5 karakter"),
  paymentTerms: z.enum(["PREPAID", "NET_14", "NET_30", "NET_60", "COD"], {
    error: "Ketentuan pembayaran wajib dipilih",
  }),
  requestedDeliveryDate: z.string().min(4, "Estimasi tanggal penerimaan wajib ditentukan"),
  merchantNotes: z.string().optional(),
  confirmPO: z.boolean().refine((v) => v === true, {
    message: "Wajib konfirmasi penerbitan Purchase Order B2B resmi",
  }),
});
export type CreatePurchaseOrderFormValues = z.infer<typeof createPurchaseOrderSchema>;

export const merchantReceivingSchema = z
  .object({
    poId: z.string().min(1, "ID Purchase Order tidak valid"),
    warehouseId: z.string().min(1, "Gudang penerima tidak valid"),
    shippedQty: z.number().min(1, "Kuantitas dikirim kargo minimal 1 unit"),
    receivedQty: z.number().min(0, "Kuantitas fisik diterima tidak boleh negatif"),
    acceptedQty: z.number().min(0, "Kuantitas diterima baik minimal 0"),
    damagedQty: z.number().min(0, "Kuantitas rusak minimal 0"),
    missingQty: z.number().min(0, "Kuantitas kurang/hilang minimal 0"),
    condition: z.enum(["PRISTINE", "PARTIAL_DAMAGE", "WRONG_PACKAGING", "DEFECTIVE"], {
      error: "Kondisi fisik kargo wajib dipilih",
    }),
    receivingNotes: z.string().min(5, "Catatan inspeksi fisik penerimaan minimal 5 karakter"),
    operatorName: z.string().min(2, "Nama petugas pemeriksa gudang minimal 2 karakter"),
    confirmStockIn: z.boolean().refine((v) => v === true, {
      message: "Wajib menyetujui mutasi penambahan stok gudang (Stock In)",
    }),
  })
  .refine((data) => data.receivedQty === data.acceptedQty + data.damagedQty, {
    message: "Kuantitas fisik diterima (receivedQty) harus sama dengan unit baik (acceptedQty) + unit rusak (damagedQty)",
    path: ["receivedQty"],
  })
  .refine((data) => data.acceptedQty + data.damagedQty + data.missingQty === data.shippedQty, {
    message: "Total rekonsiliasi (unit fisik diterima + selisih kurang) harus tepat sama dengan kuantitas dikirim kargo (shippedQty)",
    path: ["missingQty"],
  });
export type MerchantReceivingFormValues = z.infer<typeof merchantReceivingSchema>;

export const merchantWarehouseSchema = z.object({
  name: z.string().min(3, "Nama fasilitas gudang minimal 3 karakter"),
  code: z.string().min(3, "Kode referensi gudang minimal 3 karakter"),
  address: z.string().min(5, "Alamat gudang minimal 5 karakter"),
  city: z.string().min(2, "Kota lokasi gudang wajib diisi"),
  picName: z.string().min(3, "Nama PIC / Penanggung jawab gudang minimal 3 karakter"),
  picPhone: z.string().min(10, "Nomor kontak PIC minimal 10 digit"),
  operatingHours: z.string().min(5, "Jam operasional gudang wajib ditentukan"),
  isMain: z.boolean(),
  notes: z.string().optional(),
});
export type MerchantWarehouseFormValues = z.infer<typeof merchantWarehouseSchema>;

export const supplierWarehouseSchema = z.object({
  name: z.string().min(3, "Nama fasilitas gudang supplier minimal 3 karakter"),
  code: z.string().min(3, "Kode referensi gudang supplier minimal 3 karakter"),
  address: z.string().min(5, "Alamat fasilitas gudang minimal 5 karakter"),
  city: z.string().min(2, "Kota lokasi gudang wajib diisi"),
  capacityM2: z.number().min(50, "Kapasitas luas gudang minimal 50 m²"),
  picName: z.string().min(3, "Nama PIC / Kepala Gudang minimal 3 karakter"),
  picPhone: z.string().min(10, "Nomor telepon PIC minimal 10 digit"),
  operatingHours: z.string().min(5, "Jam operasional gudang wajib ditentukan"),
  isMain: z.boolean(),
  notes: z.string().optional(),
});
export type SupplierWarehouseFormValues = z.infer<typeof supplierWarehouseSchema>;


