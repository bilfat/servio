import { mapBackendOrderToServiceOrder } from '../src/features/order-jasa/adapters/orderJasaMapper';
import { getSubStatusBadgeInfo } from '../src/features/order-jasa/constants/index';

const backendOrder = {
  id: "01M660BD8B3Y407BY628GKJ35P",
  order_no: "SO-20261030-LTLRIY",
  customer_id: "692f03fd-2362-485a-9a23-a672bbb4533f",
  provider_org_id: "0740d857-b665-4191-aaf5-d7dd3611dc1d",
  service_offering_id: "6129bf1a-ee2b-4c63-92c0-d32f9df2bfcd",
  service_snapshot: {
    id: "6129bf1a-ee2b-4c63-92c0-d32f9df2bfcd",
    version: 4,
    title: "Service Offering 6129bf1a-ee2b-4c63-92c0-d32f9df2bfcd",
    diagnosis_fee_idr: 50000,
    is_active: true,
    provider_org_id: "0740d857-b665-4191-aaf5-d7dd3611dc1d",
    pricing_snapshot: { model: "RANGE", min_price_idr: 150000, max_price_idr: 300000, currency: "IDR" },
    survey_snapshot: { availability: "AVAILABLE", requirement: "OPTIONAL", fee_model: "PAID", fee_idr: 50000 }
  },
  recipient_snapshot: { name: "Ahmad Fauzi", phone: "+628163344556" },
  address_snapshot: {
    id: "01a155aa-cdf3-71fe-b02c-ebdc787daf4a",
    address_id: "01a155aa-cdf3-71fe-b02c-ebdc787daf4a",
    customer_id: "692f03fd-2362-485a-9a23-a672bbb4533f",
    user_id: "692f03fd-2362-485a-9a23-a672bbb4533f",
    recipient_name: "Ahmad Fauzi",
    recipient_phone: "+628163344556",
    phone: "+628163344556",
    label: "Rumah Utama",
    address_line: "blok ka",
    street_address: "blok ka",
    province: "DKI JAKARTA",
    city: "KOTA JAKARTA PUSAT",
    city_name: "KOTA JAKARTA PUSAT",
    region_code: "KOTA_JAKARTA_PUSAT",
    district: "TANAH ABANG",
    subdistrict: "GELORA",
    village: "GELORA",
    postal_code: "1334",
    latitude: -6.2297,
    longitude: 106.8075,
    is_default: false
  },
  complaint_text: "AC tidak dingin dan ada tetesan air",
  symptoms: ["Bocor", "Kurang dingin"],
  diagnosis_fee_idr: 50000,
  diagnosis_fee_exemption_type: null,
  status: "WORKER_ACCEPTED",
  phase: "VISIT_PENDING",
  cancel_reason_code: null,
  original_order_id: null,
  version: 4,
  schedule: {
    start_at: "2026-10-31T09:00:00+00:00",
    end_at: "2026-10-31T11:00:00+00:00",
    timezone: "Asia/Jakarta",
    status: "CONFIRMED"
  },
  assigned_worker: {
    worker_id: "acfdfc27-9ba5-472f-bec1-3c372f47fff6",
    status: "ACCEPTED",
    accepted_at: "2026-10-30T08:57:19+00:00",
    membership_snapshot: { worker_id: "acfdfc27-9ba5-472f-bec1-3c372f47fff6", user_status: "ACTIVE" }
  },
  visit: { status: "NOT_STARTED", worker_id: "acfdfc27-9ba5-472f-bec1-3c372f47fff6", otw_at: null, arrived_at: null },
  diagnosis: null,
  execution: null,
  completed_at: null,
  cancelled_at: null,
  created_at: "2026-10-30T08:55:46+00:00",
  updated_at: "2026-10-30T08:55:46+00:00"
};

const serviceOrder = mapBackendOrderToServiceOrder(backendOrder as any);
console.log('SUCCESSFULLY MAPPED:', serviceOrder.id, serviceOrder.subStatus);
console.log('Badge:', getSubStatusBadgeInfo(serviceOrder.subStatus));

