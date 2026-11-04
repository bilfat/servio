import { mapBackendOrderToServiceOrder } from "../src/features/order-jasa/adapters/orderJasaMapper";

const sampleBackendOrder = {
  id: "01M685VWDP4T4NY01W6MV09P9X",
  order_no: "SO-20261031-S0N5VW",
  customer_id: "692f03fd-2362-485a-9a23-a672bbb4533f",
  provider_org_id: "0740d857-b665-4191-aaf5-d7dd3611dc1d",
  service_offering_id: "6129bf1a-ee2b-4c63-92c0-d32f9df2bfcd",
  service_snapshot: {
    id: "6129bf1a-ee2b-4c63-92c0-d32f9df2bfcd",
    title: "Cuci dan Servis AC Split Bergaransi Mandiri Teknik"
  },
  recipient_snapshot: { name: "Ahmad Fauzi", phone: "+628163344556" },
  address_snapshot: { city: "KOTA JAKARTA PUSAT" },
  status: "COMPLETED",
  diagnosis_fee_idr: 50000,
  diagnosis: {
    id: "01M6FQMDB9QT4Y7C5KXN60EF5W",
    version_no: 1,
    findings_summary: "Unit indoor berdebu tebal dan drainase air tersumbat lendir",
    work_subtotal_idr: 175000,
    provider_part_subtotal_idr: 25000,
    grand_total_idr: 200000,
    status: "SUBMITTED",
    work_items: [
      { id: "01M6FQMDBYM338EBMXZKYTTK3T", title: "Jasa Perbaikan", qty: 1, unit_price: 100000, subtotal: 100000 },
      { id: "01M6FQMDCBM1NAXS7A2JBTSDEV", title: "Jasa Perbaikan", qty: 1, unit_price: 75000, subtotal: 75000 }
    ],
    spareparts: [
      { id: "01M6FQMDCE9KPWXQRKK9F58F58", name: "Pipa Pembuangan Air Fleksibel", source: "PROVIDER_SUPPLIED", qty: 1, unit_price: 25000, subtotal: 25000 }
    ]
  },
  payment_obligations: [
    { purpose: "DIAGNOSIS", principal_idr: 50000, state: "PAID" },
    { purpose: "SERVICE_EXECUTION", principal_idr: 200000, state: "PAID" }
  ]
};

const mapped = mapBackendOrderToServiceOrder(sampleBackendOrder as any, sampleBackendOrder.payment_obligations as any);
console.log("MAPPED PAYMENT SUMMARY:", JSON.stringify(mapped.paymentSummary, null, 2));

