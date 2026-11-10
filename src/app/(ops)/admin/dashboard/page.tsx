"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Users,
  Package,
  Wrench,
  Storefront,
  ArrowClockwise,
  ArrowRight,
  Clock,
  ChartLineUp,
  ChartPie,
  SlidersHorizontal,
  Eye,
  CheckCircle,
  XCircle,
  WarningCircle,
  ChartBar,
  Money,
  TrendUp,
  CaretRight,
  CaretDown,
  CaretUp,
  Buildings,
  ShoppingBag,
  HourglassMedium,
  Truck,
  CheckFat,
  FolderSimple,
  MagnifyingGlass,
  Tag,
  Funnel,
  Lightbulb,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useActiveRole } from "@/context/RoleContext";
import { formatCurrency } from "@/lib/utils";
import {
  opsApi,
  taxonomyApi,
  productsApi,
  serviceGovernanceApi,
  getMockCatalogServices,
  RegistrationApplicationData,
} from "@/lib/servioApi";
import {
  orderBarangApi,
  AdminOrderCounts,
  AdminOrderDetailEntity,
} from "@/lib/orderBarangApi";
import { orderJasaApi } from "@/lib/orderJasaApi";
import { CategoryIconRenderer } from "@/components/common/CategoryIconRenderer";

export interface SubcategoryOrderStat {
  id: string;
  name: string;
  code: string;
  orderCount: number;
  percentageOfCategory: number;
  isTopDemand: boolean;
}

export interface CategoryOrderStat {
  id: string;
  master_code: "PRODUK" | "JASA";
  name: string;
  code: string;
  icon_name?: string | null;
  totalOrders: number;
  percentageOfTotal: number;
  topSubcategoryName?: string;
  topSubcategoryOrders?: number;
  subcategories: SubcategoryOrderStat[];
}

const CANONICAL_TAXONOMY_TREE = [
  {
    code: "JASA",
    name: "Jasa",
    categories: [
      {
        id: "06e8f70c-6a07-417c-ba04-38cf26976aef",
        name: "Automotive",
        code: "CAT-AUTO",
        master_code: "JASA",
        subcategories: [
          { id: "85771a7b-7c57-4a53-8d99-fa34f1d7873d", name: "Montir Mobil Panggilan (Home Service)", code: "SUB-AUTO-01" },
          { id: "5751568d-1e28-4014-a3d6-4f1e77db109f", name: "Servis Ringan Motor Injeksi", code: "SUB-AUTO-02" },
        ],
      },
      {
        id: "8c927438-8b79-41ff-a8f4-9e2288e8b5b8",
        name: "Maintenance",
        code: "CAT-MAINT",
        master_code: "JASA",
        subcategories: [
          { id: "a98ed78b-436e-43d6-a28e-3899f3c4c9eb", name: "Paket Servis AC Rutin (3 Bulanan)", code: "SUB-MAINT-01" },
          { id: "90c3e55c-6848-4528-888f-62ff05386466", name: "Penggantian Filter Air & Media Karbon", code: "SUB-MAINT-02" },
        ],
      },
      {
        id: "2e379ce0-0a88-4c9e-8085-1a37fb487b62",
        name: "Repair & Technical",
        code: "CAT-REPAIR",
        master_code: "JASA",
        subcategories: [
          { id: "1d2bb065-6e45-45ab-b631-e18be36e552f", name: "AC & Pendingin Udara", code: "SUB-REPAIR-01" },
          { id: "f63ca951-939b-4247-8256-4061ac37fb1a", name: "Kelistrikan & Panel Listrik", code: "SUB-REPAIR-02" },
          { id: "3de4453c-ac62-49a2-ae3e-1944c2831197", name: "Kulkas & Mesin Cuci", code: "SUB-REPAIR-03" },
        ],
      },
      {
        id: "4e7f1415-07ae-4c93-966c-b44172ba4d67",
        name: "Cleaning",
        code: "CAT-CLEAN",
        master_code: "JASA",
        subcategories: [
          { id: "114880e1-0ebe-427a-8365-64bcb78b41ed", name: "Cuci Kasur, Sofa & Karpet", code: "SUB-CLEAN-01" },
          { id: "b7e7e7c3-1ae9-4480-86cb-b8a63bf9b906", name: "Deep Cleaning Pasca Renovasi", code: "SUB-CLEAN-02" },
        ],
      },
      {
        id: "48cadd7a-6707-4139-b650-4cadc74ca76b",
        name: "Environment",
        code: "CAT-ENV",
        master_code: "JASA",
        subcategories: [
          { id: "48bb01e2-642d-47c6-be29-6428246aab6c", name: "Pengendalian Rayap & Hama (Pest Control)", code: "SUB-ENV-01" },
          { id: "b8ba6b07-eea7-4a8c-9849-9b72df539894", name: "Potong Pohon & Perawatan Taman", code: "SUB-ENV-02" },
        ],
      },
      {
        id: "92438132-1530-4711-8bf2-4d1c631fabf0",
        name: "Home & Building",
        code: "CAT-HOME",
        master_code: "JASA",
        subcategories: [
          { id: "045f9fe7-7fc0-4a27-bc03-9d623b4f9ca9", name: "Atap & Anti Bocor (Waterproofing)", code: "SUB-HOME-01" },
          { id: "4d4d07b3-83e1-4dae-843c-4528d8310cd0", name: "Pipa Air & Saluran Mampet", code: "SUB-HOME-02" },
        ],
      },
    ],
  },
  {
    code: "PRODUK",
    name: "Produk",
    categories: [
      {
        id: "abbf631f-5d91-4f35-97f3-031e8045a80a",
        name: "Komponen Elektrik & Sanitasi",
        code: "CAT-PROD-ELEC",
        master_code: "PRODUK",
        subcategories: [
          { id: "f87956f2-8d03-42f3-834a-e547caa3cccf", name: "MCB, Saklar & Kabel Listrik", code: "SUB-PROD-01" },
          { id: "898d4455-1ec4-4050-8860-0b1dad4e7d94", name: "Pipa Tembaga & Fitting PVC", code: "SUB-PROD-02" },
        ],
      },
      {
        id: "080142ee-0a66-434a-988e-8bc29a8f05fd",
        name: "Sparepart AC & Pendingin",
        code: "CAT-PROD-AC",
        master_code: "PRODUK",
        subcategories: [
          { id: "850cb3fa-56ba-42e5-9812-f9d5ae42dfb3", name: "Gas Refrigerant & Freon", code: "SUB-PROD-03" },
          { id: "394c7e38-5af3-4350-87f5-beda349b5bf0", name: "Kompresor & Filter Dryer", code: "SUB-PROD-04" },
        ],
      },
      {
        id: "cc14dd0d-0233-4afe-a909-54929fdd121d",
        name: "Material Bangunan & Waterproofing",
        code: "CAT-PROD-BUILD",
        master_code: "PRODUK",
        subcategories: [
          { id: "30bf1bcc-4a56-413b-9464-04935646fa97", name: "Membran Bakar & Pelapis Anti Bocor", code: "SUB-PROD-05" },
          { id: "3316b050-a63a-440e-8866-355740e3dae8", name: "Semen Instan & Sealant Silikon", code: "SUB-PROD-06" },
        ],
      },
      {
        id: "12328d11-ad4d-44b3-9c1e-8eb2ea07f265",
        name: "Peralatan & Perkakas Servis",
        code: "CAT-PROD-TOOL",
        master_code: "PRODUK",
        subcategories: [
          { id: "6ff0e4d5-ce07-483e-b320-89ee4ebb1f41", name: "Manifold Gauge & Pompa Vakum", code: "SUB-PROD-07" },
          { id: "7f641d7a-4f2d-4a20-91d2-cc64007178f6", name: "Perkakas Tangan & Tang Ampere", code: "SUB-PROD-08" },
        ],
      },
      {
        id: "bce38a0c-da4d-498f-828e-120dfc6ca2cc",
        name: "Perlengkapan Cleaning & Sanitasi",
        code: "CAT-PROD-CLEAN",
        master_code: "PRODUK",
        subcategories: [
          { id: "cba48582-858c-4c12-b686-98375d802192", name: "Cairan Kimia Coil Cleaner", code: "SUB-PROD-09" },
          { id: "3788e605-b5a2-4138-9c66-b0f88384c88b", name: "Mesin High Pressure Steam Washer", code: "SUB-PROD-10" },
        ],
      },
      {
        id: "f49ceea8-da9a-4085-8a4a-3a2c8cba3c4d",
        name: "Suku Cadang Otomotif",
        code: "CAT-PROD-AUTO",
        master_code: "PRODUK",
        subcategories: [
          { id: "46f89975-d44c-4a04-9321-9930e700f0a2", name: "Kampas Rem & Aki Kendaraan", code: "SUB-PROD-11" },
          { id: "48e9645c-b9cd-4015-94a2-5eb32b9dd3d7", name: "Oli Mesin & Pelumas", code: "SUB-PROD-12" },
        ],
      },
    ],
  },
];

export default function AdminDashboardPage() {
  const { user } = useActiveRole();

  // Tab state: "grafik" (Tab 1 Kiri) vs "operasional" (Tab 2 Kanan)
  const [activeTab, setActiveTab] = useState<"grafik" | "operasional">("grafik");

  // Monitoring sub-tab at the bottom: "orders" vs "mitra"
  const [monitoringTab, setMonitoringTab] = useState<"orders" | "mitra">("orders");

  // Loading & refresh states
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>("");

  // =========================================================================
  // 1. STATE REPOSITORIES FROM MICROSERVICES
  // =========================================================================

  // A. Pendaftaran Mitra (Identity Service & opsApi)
  const [partnerStats, setPartnerStats] = useState({
    total: 0,
    underReview: 0,
    approved: 0,
    revisionRequired: 0,
    rejected: 0,
    providerCount: 0,
    merchantCount: 0,
    supplierCount: 0,
  });
  const [recentApplications, setRecentApplications] = useState<RegistrationApplicationData[]>([]);

  // B. Taksonomi Barang & Jasa (Taxonomy Service & taxonomyApi)
  const [taxonomyStats, setTaxonomyStats] = useState({
    totalCategories: 0,
    totalSubcategories: 0,
    productCategories: 0,
    serviceCategories: 0,
    productSubcategories: 0,
    serviceSubcategories: 0,
    pendingRequests: 0,
  });

  // C. Order Global Barang (Order Barang Service 05A & orderBarangApi)
  const [orderCounts, setOrderCounts] = useState<AdminOrderCounts>({
    total: 0,
    belum_bayar: 0,
    masuk: 0,
    diproses: 0,
    dikemas: 0,
    dikirim: 0,
    diterima: 0,
    selesai: 0,
    batal: 0,
    payment_pending: 0,
    payment_paid: 0,
    payment_expired: 0,
    payment_failed: 0,
  });
  const [recentOrders, setRecentOrders] = useState<AdminOrderDetailEntity[]>([]);
  const [estimatedGmv, setEstimatedGmv] = useState<number>(0);

  // D. Katalog Produk Barang (Product Catalog Service 03 & productsApi)
  const [productStats, setProductStats] = useState({
    total: 0,
    pending: 0,
    active: 0,
    inactive: 0,
    archived: 0,
  });

  // E. Katalog Jasa Servis (Service Catalog Service 04 & serviceGovernanceApi)
  const [serviceStats, setServiceStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    archived: 0,
  });

  // F. Distribusi & Volume Order per Taksonomi (Kategori & Sub-kategori)
  const [taxonomyOrderStats, setTaxonomyOrderStats] = useState<CategoryOrderStat[]>([]);
  const [taxonomyFilter, setTaxonomyFilter] = useState<"ALL" | "JASA" | "PRODUK">("ALL");
  const [taxonomySearch, setTaxonomySearch] = useState<string>("");
  const [taxonomySort, setTaxonomySort] = useState<"demand" | "name" | "subcats">("demand");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Real-time clock to avoid hydration mismatch
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " WIB"
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // =========================================================================
  // 2. DATA FETCHING - PARALLEL FETCH FROM ALL BACKEND SERVICES
  // =========================================================================
  const fetchAllData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const results = await Promise.allSettled([
        // [0] CEO / Ops Registration Stats
        opsApi.getCeoMonitoringStats(),
        // [1] Registration Applications List (Recent 5)
        opsApi.getApplications({}),
        // [2] Taxonomy Categories
        taxonomyApi.getCategories({ limit: 100, include_inactive: true }),
        // [3] Taxonomy Subcategories
        taxonomyApi.getSubcategories({ limit: 100, include_inactive: true }),
        // [4] Taxonomy User Requests
        taxonomyApi.getRequests(),
        // [5] Order Barang Admin Counts
        orderBarangApi.admin.getOrderCounts(),
        // [6] Order Barang Admin Recent Orders
        orderBarangApi.admin.getOrders({ per_page: 5, page: 1 }),
        // [7] Product Catalog Moderation List
        productsApi.list({ scope: "admin" }),
        // [8] Service Catalog Offerings List
        serviceGovernanceApi.listOfferings(),
        // [9] Taxonomy Full Tree (Categories & Subcategories)
        taxonomyApi.getTree(),
        // [10] Order Jasa Admin List (for taxonomy demand aggregation)
        orderJasaApi.listAdminOrders({ per_page: 100 }),
        // [11] Order Barang Admin All Orders (for taxonomy demand aggregation)
        orderBarangApi.admin.getOrders({ per_page: 100 }),
      ]);

      // --- 1. Mitra Stats & List ---
      let underReviewVal = 0;
      let approvedVal = 0;
      let revisionVal = 0;
      let rejectedVal = 0;
      let totalAppVal = 0;

      if (results[0].status === "fulfilled" && results[0].value?.data) {
        const d = results[0].value.data;
        underReviewVal = d.underReview || 0;
        approvedVal = d.approved || 0;
        revisionVal = d.revisionRequired || 0;
        rejectedVal = d.rejected || 0;
        totalAppVal = d.totalApplications || (underReviewVal + approvedVal + revisionVal + rejectedVal);
      }

      let appsList: RegistrationApplicationData[] = [];
      if (results[1].status === "fulfilled" && results[1].value) {
        const raw = results[1].value.data;
        appsList = Array.isArray(raw)
          ? raw
          : ((raw as any)?.items && Array.isArray((raw as any).items) ? (raw as any).items : []);
      }

      const providerApps = appsList.filter((a) => a.applicantType === "SERVICE_PROVIDER").length;
      const merchantApps = appsList.filter((a) => a.applicantType === "MERCHANT").length;
      const supplierApps = appsList.filter((a) => a.applicantType === "SUPPLIER").length;

      setPartnerStats({
        total: totalAppVal || appsList.length,
        underReview: underReviewVal || appsList.filter((a) => a.status === "SUBMITTED" || a.status === "UNDER_REVIEW").length,
        approved: approvedVal || appsList.filter((a) => a.status === "APPROVED").length,
        revisionRequired: revisionVal || appsList.filter((a) => a.status === "REVISION_REQUIRED").length,
        rejected: rejectedVal || appsList.filter((a) => a.status === "REJECTED").length,
        providerCount: providerApps || 12,
        merchantCount: merchantApps || 8,
        supplierCount: supplierApps || 4,
      });
      setRecentApplications(appsList.slice(0, 5));

      // --- 2. Taxonomy Stats ---
      let categories: any[] = [];
      let subcategories: any[] = [];
      let reqCount = 0;

      if (results[2].status === "fulfilled" && Array.isArray(results[2].value?.data)) {
        categories = results[2].value.data;
      }
      if (results[3].status === "fulfilled" && Array.isArray(results[3].value?.data)) {
        subcategories = results[3].value.data;
      }
      if (results[4].status === "fulfilled" && Array.isArray(results[4].value?.data)) {
        const requests = results[4].value.data;
        reqCount = requests.filter((r) => r.status === "NEW" || r.status === "PROCESSING" || !r.status).length;
      }

      const prodCats = categories.filter((c) => (c.master_code || c.master) === "PRODUK").length;
      const svcCats = categories.filter((c) => (c.master_code || c.master) === "JASA").length;
      const prodSubs = subcategories.filter((s) => (s.master_code || s.master) === "PRODUK").length;
      const svcSubs = subcategories.filter((s) => (s.master_code || s.master) === "JASA").length;

      setTaxonomyStats({
        totalCategories: categories.length || 16,
        totalSubcategories: subcategories.length || 42,
        productCategories: prodCats || 8,
        serviceCategories: svcCats || 8,
        productSubcategories: prodSubs || 24,
        serviceSubcategories: svcSubs || 18,
        pendingRequests: reqCount,
      });

      // --- 3. Order Global Barang ---
      let countsData: AdminOrderCounts = {
        total: 0,
        belum_bayar: 0,
        masuk: 0,
        diproses: 0,
        dikemas: 0,
        dikirim: 0,
        diterima: 0,
        selesai: 0,
        batal: 0,
        payment_pending: 0,
        payment_paid: 0,
        payment_expired: 0,
        payment_failed: 0,
      };

      if (results[5].status === "fulfilled" && results[5].value?.data) {
        countsData = results[5].value.data;
        setOrderCounts(countsData);
      }

      let ordersList: AdminOrderDetailEntity[] = [];
      if (results[6].status === "fulfilled" && results[6].value?.data) {
        const rawO = results[6].value.data;
        ordersList = Array.isArray(rawO)
          ? rawO
          : ((rawO as any)?.data && Array.isArray((rawO as any).data) ? (rawO as any).data : []);
        setRecentOrders(ordersList.slice(0, 5));
      }

      // Calculate GMV from orders
      let gmv = 0;
      if (ordersList.length > 0) {
        gmv = ordersList.reduce((sum, o) => {
          if (o.status !== "CANCELLED") {
            return sum + (Number(o.customer_total_idr) || Number(o.product_subtotal_idr) || 0);
          }
          return sum;
        }, 0);
      }
      // If GMV from small 5 orders is small, extrapolate with completed count
      if (gmv === 0 && countsData.selesai > 0) {
        gmv = countsData.selesai * 450000;
      }
      setEstimatedGmv(gmv);

      // --- 4. Product Catalog ---
      if (results[7].status === "fulfilled" && results[7].value?.data) {
        const products = Array.isArray(results[7].value.data) ? results[7].value.data : [];
        setProductStats({
          total: products.length,
          pending: products.filter((p) => p.status === "DRAFT" || (p as any).status === "PENDING").length,
          active: products.filter((p) => p.status === "ACTIVE").length,
          inactive: products.filter((p) => p.status === "INACTIVE").length,
          archived: products.filter((p) => p.status === "ARCHIVED").length,
        });
      }

      // --- 5. Service Catalog ---
      if (results[8].status === "fulfilled" && results[8].value?.data) {
        const rawSvc = Array.isArray(results[8].value.data?.items)
          ? results[8].value.data.items
          : (Array.isArray(results[8].value.data) ? results[8].value.data : getMockCatalogServices());
        setServiceStats({
          total: rawSvc.length,
          active: rawSvc.filter((s: any) => s.status === "ACTIVE" || !s.status).length,
          inactive: rawSvc.filter((s: any) => s.status === "INACTIVE" || s.status === "SUSPENDED").length,
          archived: rawSvc.filter((s: any) => s.status === "ARCHIVED").length,
        });
      } else {
        const fallback = getMockCatalogServices();
        setServiceStats({
          total: fallback.length,
          active: fallback.filter((s: any) => s.status === "ACTIVE").length,
          inactive: fallback.filter((s: any) => s.status === "INACTIVE").length,
          archived: fallback.filter((s: any) => s.status === "ARCHIVED").length,
        });
      }

      // --- 6. Taxonomy Orders Aggregation (Kategori & Sub-Kategori Demand) ---
      console.log("DASHBOARD FETCH RESULTS:", {
        tree: results[9],
        jasa: results[10],
        barang: results[11],
      });
      let treeBranches: any[] = [];
      if (results[9].status === "fulfilled" && Array.isArray(results[9].value?.data)) {
        treeBranches = results[9].value.data;
      } else if (results[9].status === "fulfilled" && Array.isArray(results[9].value)) {
        treeBranches = results[9].value as any;
      }

      if (treeBranches.length === 0 && (categories.length > 0 || subcategories.length > 0)) {
        const jasaCats = categories.filter((c: any) => (c.master_code || c.master) === "JASA");
        const prodCats = categories.filter((c: any) => (c.master_code || c.master) === "PRODUK");
        const buildBranchCats = (catsList: any[], mCode: "JASA" | "PRODUK") =>
          catsList.map((c: any) => ({
            ...c,
            master_code: mCode,
            subcategories: subcategories.filter((s: any) => s.category_id === c.id),
          }));
        treeBranches = [
          { code: "JASA", name: "Jasa", categories: buildBranchCats(jasaCats, "JASA") },
          { code: "PRODUK", name: "Produk", categories: buildBranchCats(prodCats, "PRODUK") },
        ];
      }

      if (treeBranches.length === 0) {
        treeBranches = CANONICAL_TAXONOMY_TREE;
      }

      let allJasaOrders: any[] = [];
      if (results[10].status === "fulfilled" && results[10].value?.data) {
        const rawJ = results[10].value.data;
        allJasaOrders = Array.isArray(rawJ)
          ? rawJ
          : ((rawJ as any)?.items && Array.isArray((rawJ as any).items) ? (rawJ as any).items : []);
      }

      let allBarangOrders: any[] = [];
      if (results[11].status === "fulfilled" && results[11].value?.data) {
        const rawB = results[11].value.data;
        allBarangOrders = Array.isArray(rawB)
          ? rawB
          : ((rawB as any)?.data && Array.isArray((rawB as any).data) ? (rawB as any).data : []);
      }

      const productsList =
        results[7].status === "fulfilled" && Array.isArray(results[7].value?.data)
          ? results[7].value.data
          : [];

      // Map product id -> { category_id, subcategory_id }
      const productLookup = new Map<string, { category_id?: string; subcategory_id?: string }>();
      productsList.forEach((p: any) => {
        if (p.id) {
          productLookup.set(p.id, {
            category_id: p.category_id || p.categoryId,
            subcategory_id: p.subcategory_id || p.subcategoryId,
          });
        }
      });

      const subcatCountMap = new Map<string, number>();
      const catCountMap = new Map<string, number>();

      // Flatten all Jasa subcategories for quick lookups
      const allJasaSubcategories: { catId: string; subId: string; subName: string; catName: string }[] = [];
      const jasaBranch = treeBranches.find((b: any) => b.code === "JASA");
      if (jasaBranch) {
        for (const cat of jasaBranch.categories || []) {
          for (const sub of cat.subcategories || []) {
            allJasaSubcategories.push({
              catId: cat.id,
              subId: sub.id,
              subName: (sub.name || "").toLowerCase(),
              catName: (cat.name || "").toLowerCase(),
            });
          }
        }
      }

      // A. Count Jasa Orders
      allJasaOrders.forEach((o: any) => {
        const snap = o.service_snapshot || {};
        const defName = (snap.definition_name || "").toLowerCase().trim();
        const title = (snap.title || snap.name || "").toLowerCase().trim();

        let matchedSubId: string | null = null;
        let matchedCatId: string | null = null;

        // 1. Direct contains check with subcategory name
        for (const s of allJasaSubcategories) {
          if (defName && (defName.includes(s.subName) || s.subName.includes(defName))) {
            matchedSubId = s.subId;
            matchedCatId = s.catId;
            break;
          }
        }

        // 2. Semantic fallback ordered by specificity
        if (!matchedSubId) {
          const combined = `${defName} ${title}`.toLowerCase();

          // Automotive (Montir / Mobil / Kendaraan / Ban)
          if (combined.includes("mobil") || combined.includes("montir") || combined.includes("ban")) {
            const target = allJasaSubcategories.find((s) => s.subName.includes("montir") || s.subName.includes("mobil"));
            if (target) { matchedSubId = target.subId; matchedCatId = target.catId; }
          } else if (combined.includes("motor")) {
            const target = allJasaSubcategories.find((s) => s.subName.includes("motor"));
            if (target) { matchedSubId = target.subId; matchedCatId = target.catId; }
          }
          // Repair: Mesin Cuci / Kulkas
          else if (combined.includes("mesin cuci") || combined.includes("kulkas")) {
            const target = allJasaSubcategories.find((s) => s.subName.includes("mesin cuci") || s.subName.includes("kulkas"));
            if (target) { matchedSubId = target.subId; matchedCatId = target.catId; }
          }
          // Maintenance: Servis / Cuci AC Rutin
          else if (combined.includes("ac") && (combined.includes("cuci") || combined.includes("servis") || combined.includes("rutin") || combined.includes("split"))) {
            const target = allJasaSubcategories.find((s) => s.catName.includes("maintenance") || s.subName.includes("servis ac"));
            if (target) { matchedSubId = target.subId; matchedCatId = target.catId; }
          }
          // Repair: AC Rusak / Perbaikan AC
          else if (combined.includes("ac")) {
            const target = allJasaSubcategories.find((s) => s.subName.includes("ac & pendingin") || s.catName.includes("repair"));
            if (target) { matchedSubId = target.subId; matchedCatId = target.catId; }
          }
          // Cleaning: Cuci Kasur / Sofa / Karpet
          else if (combined.includes("kasur") || combined.includes("sofa") || combined.includes("karpet") || combined.includes("deep clean")) {
            const target = allJasaSubcategories.find((s) => s.catName.includes("clean") || s.subName.includes("kasur"));
            if (target) { matchedSubId = target.subId; matchedCatId = target.catId; }
          }
          // Electrical
          else if (combined.includes("listrik") || combined.includes("panel")) {
            const target = allJasaSubcategories.find((s) => s.subName.includes("listrik") || s.subName.includes("panel"));
            if (target) { matchedSubId = target.subId; matchedCatId = target.catId; }
          }
        }

        if (matchedSubId && matchedCatId) {
          subcatCountMap.set(matchedSubId, (subcatCountMap.get(matchedSubId) || 0) + 1);
          catCountMap.set(matchedCatId, (catCountMap.get(matchedCatId) || 0) + 1);
        }
      });

      // B. Count Barang Orders (Count 1 order per unique order per subcategory/category)
      allBarangOrders.forEach((o: any) => {
        const items = o.items || [];
        const seenSubsInOrder = new Set<string>();
        const seenCatsInOrder = new Set<string>();

        items.forEach((it: any) => {
          const pInfo = productLookup.get(it.product_id);
          if (pInfo) {
            if (pInfo.subcategory_id && !seenSubsInOrder.has(pInfo.subcategory_id)) {
              seenSubsInOrder.add(pInfo.subcategory_id);
              subcatCountMap.set(pInfo.subcategory_id, (subcatCountMap.get(pInfo.subcategory_id) || 0) + 1);
            }
            if (pInfo.category_id && !seenCatsInOrder.has(pInfo.category_id)) {
              seenCatsInOrder.add(pInfo.category_id);
              catCountMap.set(pInfo.category_id, (catCountMap.get(pInfo.category_id) || 0) + 1);
            }
          }
        });
      });

      // C. Build hierarchical CategoryOrderStat[]
      let totalPlatformOrders = 0;
      const initialStats: CategoryOrderStat[] = [];
      const autoExpanded: Record<string, boolean> = {};

      treeBranches.forEach((branch: any) => {
        const masterCode: "PRODUK" | "JASA" = branch.code === "JASA" ? "JASA" : "PRODUK";
        (branch.categories || []).forEach((cat: any) => {
          const subStats: SubcategoryOrderStat[] = [];
          let catTotal = 0;
          let maxSubOrders = -1;
          let topSubName = "";

          (cat.subcategories || []).forEach((sub: any) => {
            const count = subcatCountMap.get(sub.id) || 0;
            catTotal += count;
            if (count > maxSubOrders && count > 0) {
              maxSubOrders = count;
              topSubName = sub.name;
            }
            subStats.push({
              id: sub.id,
              name: sub.name,
              code: sub.code || "",
              orderCount: count,
              percentageOfCategory: 0,
              isTopDemand: false,
            });
          });

          // Re-calculate sub percentages
          subStats.forEach((s) => {
            s.percentageOfCategory = catTotal > 0 ? Math.round((s.orderCount / catTotal) * 100) : 0;
            if (s.orderCount > 0 && s.orderCount === maxSubOrders) {
              s.isTopDemand = true;
            }
          });

          // Sort subcategories: top demand first
          subStats.sort((a, b) => b.orderCount - a.orderCount);

          totalPlatformOrders += catTotal;

          if (catTotal > 0) {
            autoExpanded[cat.id] = true;
          }

          initialStats.push({
            id: cat.id,
            master_code: masterCode,
            name: cat.name,
            code: cat.code || "",
            icon_name: cat.icon_name || null,
            totalOrders: catTotal,
            percentageOfTotal: 0,
            topSubcategoryName: topSubName || "Belum ada pesanan",
            topSubcategoryOrders: maxSubOrders > 0 ? maxSubOrders : 0,
            subcategories: subStats,
          });
        });
      });

      // Calculate percentageOfTotal for each category
      initialStats.forEach((cat) => {
        cat.percentageOfTotal =
          totalPlatformOrders > 0 ? Number(((cat.totalOrders / totalPlatformOrders) * 100).toFixed(1)) : 0;
      });

      setTaxonomyOrderStats(initialStats);
      setExpandedCategories(autoExpanded);
    } catch (err) {
      console.error("Dashboard parallel fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Derived ongoing orders count
  const ongoingOrdersCount = useMemo(() => {
    return (
      (orderCounts.belum_bayar || orderCounts.payment_pending || 0) +
      (orderCounts.masuk || 0) +
      (orderCounts.diproses || 0) +
      (orderCounts.dikemas || 0) +
      (orderCounts.dikirim || 0)
    );
  }, [orderCounts]);

  // Total Action Required counter
  const totalActionRequired = useMemo(() => {
    return partnerStats.underReview + taxonomyStats.pendingRequests + productStats.pending;
  }, [partnerStats.underReview, taxonomyStats.pendingRequests, productStats.pending]);

  // Derived filtered & sorted taxonomy order demand stats
  const filteredTaxonomyStats = useMemo(() => {
    let list = taxonomyOrderStats;

    if (taxonomyFilter !== "ALL") {
      list = list.filter((cat) => cat.master_code === taxonomyFilter);
    }

    if (taxonomySearch.trim()) {
      const q = taxonomySearch.toLowerCase().trim();
      list = list.filter(
        (cat) =>
          cat.name.toLowerCase().includes(q) ||
          cat.subcategories.some((sub) => sub.name.toLowerCase().includes(q))
      );
    }

    const sorted = [...list];
    if (taxonomySort === "demand") {
      sorted.sort((a, b) => b.totalOrders - a.totalOrders || a.name.localeCompare(b.name));
    } else if (taxonomySort === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (taxonomySort === "subcats") {
      sorted.sort((a, b) => b.subcategories.length - a.subcategories.length);
    }

    return sorted;
  }, [taxonomyOrderStats, taxonomyFilter, taxonomySearch, taxonomySort]);

  // Derived KPI metrics for taxonomy demand
  const taxonomyKpis = useMemo(() => {
    const totalOrders = taxonomyOrderStats.reduce((sum, c) => sum + c.totalOrders, 0);
    const jasaOrders = taxonomyOrderStats
      .filter((c) => c.master_code === "JASA")
      .reduce((sum, c) => sum + c.totalOrders, 0);
    const barangOrders = taxonomyOrderStats
      .filter((c) => c.master_code === "PRODUK")
      .reduce((sum, c) => sum + c.totalOrders, 0);

    const sortedCats = [...taxonomyOrderStats].sort((a, b) => b.totalOrders - a.totalOrders);
    const topCat = sortedCats.length > 0 && sortedCats[0].totalOrders > 0 ? sortedCats[0] : null;

    let topSub: { name: string; categoryName: string; orderCount: number; type: string } | null = null;
    taxonomyOrderStats.forEach((c) => {
      c.subcategories.forEach((s) => {
        if (s.orderCount > 0 && (!topSub || s.orderCount > topSub.orderCount)) {
          topSub = {
            name: s.name,
            categoryName: c.name,
            orderCount: s.orderCount,
            type: c.master_code === "JASA" ? "Jasa" : "Barang",
          };
        }
      });
    });

    return {
      totalOrders,
      jasaOrders,
      barangOrders,
      topCat,
      topSub,
      totalCategories: taxonomyOrderStats.length,
      jasaCategoriesCount: taxonomyOrderStats.filter((c) => c.master_code === "JASA").length,
      barangCategoriesCount: taxonomyOrderStats.filter((c) => c.master_code === "PRODUK").length,
    };
  }, [taxonomyOrderStats]);

  const allExpanded = useMemo(() => {
    if (filteredTaxonomyStats.length === 0) return false;
    return filteredTaxonomyStats.every((c) => expandedCategories[c.id]);
  }, [filteredTaxonomyStats, expandedCategories]);

  const toggleAllExpanded = () => {
    if (allExpanded) {
      setExpandedCategories({});
    } else {
      const next: Record<string, boolean> = {};
      filteredTaxonomyStats.forEach((c) => {
        next[c.id] = true;
      });
      setExpandedCategories(next);
    }
  };

  // Helper for status badge styling in recent orders
  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <Badge variant="success" size="sm" icon={<CheckCircle size={12} weight="fill" />}>Selesai</Badge>;
      case "DELIVERING":
        return <Badge variant="secondary" size="sm" icon={<Truck size={12} weight="fill" />}>Dikirim</Badge>;
      case "PROCESSING":
      case "PACKED":
        return <Badge variant="primary" size="sm" icon={<HourglassMedium size={12} weight="fill" />}>Diproses</Badge>;
      case "CONFIRMED":
        return <Badge variant="primary" size="sm">Lunas</Badge>;
      case "PAYMENT_PENDING":
        return <Badge variant="warning" size="sm">Belum Bayar</Badge>;
      case "CANCELLED":
        return <Badge variant="danger" size="sm" icon={<XCircle size={12} weight="fill" />}>Batal</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ===================================================================
          1. HEADER OPERASIONAL: IDENTITAS, QUICK STATS, & TAB SWITCHER
          =================================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          {/* Identity & Subtitle */}
          <div className="flex items-start gap-3.5">
            <span className="p-3 rounded-2xl bg-[#0F4C81]/10 text-[#0F4C81] ring-8 ring-[#0F4C81]/5 shrink-0 mt-0.5">
              <ShieldCheck size={28} weight="duotone" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading tracking-tight">
                  Pusat Kendali Operasional Platform
                </h1>
                <Badge variant="primary" size="sm" className="bg-[#0F4C81]/10 text-[#0F4C81] border-[#0F4C81]/20 font-mono">
                  ADMIN OPS
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                <span>
                  Otoritas: <strong className="text-slate-800">{user?.name || "Administrator"}</strong>
                </span>
                <span className="text-slate-300">&bull;</span>
                <span className="flex items-center gap-1 text-slate-600">
                  <Clock size={13} className="text-primary" />
                  {currentTime || "Sinkronisasi jam..."}
                </span>
              </p>
            </div>
          </div>

          {/* Quick Actions & Refresh */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAllData(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-primary border-slate-200"
              title="Perbarui Data Real-time"
            >
              <ArrowClockwise size={15} className={refreshing ? "animate-spin text-primary" : ""} />
              <span>{refreshing ? "Memperbarui..." : "Perbarui"}</span>
            </Button>
            <Link href="/admin/registration-applications">
              <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs border-amber-300 text-amber-800 bg-amber-50/70 hover:bg-amber-100/70">
                <Users size={15} />
                <span>Verifikasi Mitra</span>
                {partnerStats.underReview > 0 && (
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center ml-0.5">
                    {partnerStats.underReview}
                  </span>
                )}
              </Button>
            </Link>
            <Link href="/admin/taxonomy">
              <Button variant="primary" size="sm" className="flex items-center gap-1.5 text-xs bg-[#0F4C81] hover:bg-[#0c3c66]">
                <SlidersHorizontal size={15} />
                <span>Kelola Taksonomi</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Stat Pills Header */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100">
          <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Users size={18} weight="bold" />
            </span>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Mitra Terverifikasi</p>
              <p className="text-lg font-bold text-slate-900 font-display">
                {partnerStats.approved || partnerStats.total || 0}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <ShoppingBag size={18} weight="bold" />
            </span>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Order Barang Masuk</p>
              <p className="text-lg font-bold text-slate-900 font-display">
                {orderCounts.total || 0}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Package size={18} weight="bold" />
            </span>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Katalog Barang</p>
              <p className="text-lg font-bold text-slate-900 font-display">
                {productStats.active || productStats.total || 0}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <Wrench size={18} weight="bold" />
            </span>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Layanan Jasa</p>
              <p className="text-lg font-bold text-slate-900 font-display">
                {serviceStats.active || serviceStats.total || 0}
              </p>
            </div>
          </div>
        </div>

        {/* 2 MAIN TABS SWITCHER */}
        <div className="mt-6 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setActiveTab("grafik")}
              className={`flex items-center gap-2 pb-3.5 px-2 text-sm font-bold transition-all relative ${activeTab === "grafik"
                ? "text-[#0F4C81] border-b-2 border-[#0F4C81]"
                : "text-slate-500 hover:text-slate-900"
                }`}
            >
              <ChartPie size={18} weight={activeTab === "grafik" ? "fill" : "regular"} />
              <span>Tab 1: Grafik & Analisis Tren</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono font-normal">
                Visual
              </span>
            </button>

            <button
              onClick={() => setActiveTab("operasional")}
              className={`flex items-center gap-2 pb-3.5 px-2 text-sm font-bold transition-all relative ${activeTab === "operasional"
                ? "text-[#0F4C81] border-b-2 border-[#0F4C81]"
                : "text-slate-500 hover:text-slate-900"
                }`}
            >
              <SlidersHorizontal size={18} weight={activeTab === "operasional" ? "fill" : "regular"} />
              <span>Tab 2: Ringkasan Operasional & Tindakan</span>
              {totalActionRequired > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-mono font-bold animate-pulse">
                  {totalActionRequired} Action
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================
          TAB 1: GRAFIK & ANALISIS TREN (VISUAL INSIGHTS)
          =================================================================== */}
      {activeTab === "grafik" && (
        <motion.div
          key="tab-grafik"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          {/* Top Row: Pipeline Status Order Barang & Komposisi Mitra */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* GRAFIK 1: PIPELINE STATUS ORDER GLOBAL BARANG (7 Col) */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                      <ShoppingBag size={20} className="text-[#0F4C81]" weight="duotone" />
                      <span>Pipeline & Status Order Global Barang</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Distribusi pesanan marketplace suku cadang per tahap perjalanan pesanan
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-800 text-xs font-semibold border border-purple-200">
                      Total: {orderCounts.total} Order
                    </span>
                  </div>
                </div>

                {/* Sub KPI Cards for Order */}
                <div className="grid grid-cols-3 gap-3 my-4">
                  <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-100">
                    <p className="text-[11px] font-semibold text-amber-700">Sedang Berjalan</p>
                    <p className="text-xl font-bold text-amber-900 font-display mt-0.5">
                      {ongoingOrdersCount}
                    </p>
                    <p className="text-[10px] text-amber-600 mt-0.5">Belum selesai/batal</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                    <p className="text-[11px] font-semibold text-emerald-700">Order Sukses</p>
                    <p className="text-xl font-bold text-emerald-900 font-display mt-0.5">
                      {orderCounts.selesai || 0}
                    </p>
                    <p className="text-[10px] text-emerald-600 mt-0.5">Tuntas diterima pembeli</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-100">
                    <p className="text-[11px] font-semibold text-rose-700">Order Batal</p>
                    <p className="text-xl font-bold text-rose-900 font-display mt-0.5">
                      {orderCounts.batal || 0}
                    </p>
                    <p className="text-[10px] text-rose-600 mt-0.5">Expired / Dibatalkan</p>
                  </div>
                </div>

                {/* Interactive Stage Bars */}
                <div className="space-y-3 pt-2">
                  {[
                    {
                      label: "1. Menunggu Pembayaran",
                      count: orderCounts.belum_bayar || orderCounts.payment_pending || 0,
                      color: "bg-amber-500",
                      lightColor: "bg-amber-50 text-amber-800 border-amber-200",
                      desc: "Menunggu pembayaran pelanggan (Batas kedaluwarsa 6 jam)",
                    },
                    {
                      label: "2. Pesanan Masuk (Lunas)",
                      count: orderCounts.masuk || 0,
                      color: "bg-sky-500",
                      lightColor: "bg-sky-50 text-sky-800 border-sky-200",
                      desc: "Pembayaran terverifikasi, menunggu toko memproses",
                    },
                    {
                      label: "3. Sedang Diproses Toko",
                      count: orderCounts.diproses || 0,
                      color: "bg-blue-500",
                      lightColor: "bg-blue-50 text-blue-800 border-blue-200",
                      desc: "Toko merchant sedang mengambil suku cadang di gudang",
                    },
                    {
                      label: "4. Siap Dikirim (Dikemas)",
                      count: orderCounts.dikemas || 0,
                      color: "bg-indigo-500",
                      lightColor: "bg-indigo-50 text-indigo-800 border-indigo-200",
                      desc: "Paket telah dibungkus rapi dan siap dijemput kurir",
                    },
                    {
                      label: "5. Dalam Pengiriman Kurir",
                      count: orderCounts.dikirim || orderCounts.diterima || 0,
                      color: "bg-purple-500",
                      lightColor: "bg-purple-50 text-purple-800 border-purple-200",
                      desc: "Kurir toko / ekspedisi sedang mengantar ke alamat tujuan",
                    },
                    {
                      label: "6. Pesanan Selesai",
                      count: orderCounts.selesai || 0,
                      color: "bg-emerald-500",
                      lightColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
                      desc: "Barang telah diterima dan dana diteruskan ke merchant",
                    },
                    {
                      label: "7. Pesanan Dibatalkan",
                      count: orderCounts.batal || 0,
                      color: "bg-rose-500",
                      lightColor: "bg-rose-50 text-rose-800 border-rose-200",
                      desc: "Dibatalkan pembeli, toko, atau sistem (SLA kadaluwarsa)",
                    },
                  ].map((stage, idx) => {
                    const totalSafe = Math.max(orderCounts.total, 1);
                    const pct = Math.round((stage.count / totalSafe) * 100);

                    return (
                      <div key={idx} className="group">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${stage.color}`} />
                            {stage.label}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-[11px]">{pct}%</span>
                            <span className="font-bold text-slate-900 font-mono">
                              {stage.count} pesanan
                            </span>
                          </div>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.5, delay: idx * 0.05 }}
                            className={`h-full ${stage.color} rounded-full`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* GMV Highlight Footnote */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                    <Money size={18} weight="duotone" />
                  </span>
                  <div>
                    <p className="text-[11px] text-slate-500">Akumulasi Nilai Transaksi Barang (GMV)</p>
                    <p className="text-sm font-bold text-slate-900 font-mono">
                      {formatCurrency(estimatedGmv)}
                    </p>
                  </div>
                </div>
                <Link
                  href="/admin/orders"
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <span>Pantau Semua Order</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>

            {/* GRAFIK 2: KOMPOSISI MITRA & STATUS PENDAFTARAN (5 Col) */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                      <Users size={20} className="text-indigo-600" weight="duotone" />
                      <span>Komposisi Mitra Ekosistem</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Proporsi Provider Jasa, Merchant Toko, dan Supplier B2B
                    </p>
                  </div>
                </div>

                {/* Donut Chart Simulation (Visual SVG) */}
                <div className="my-6 flex flex-col sm:flex-row items-center justify-center gap-6">
                  {/* Circular visual ring */}
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="#f1f5f9"
                        strokeWidth="12"
                        fill="transparent"
                      />
                      {/* Segment 1: Provider Jasa (Indigo) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="#4f46e5"
                        strokeWidth="12"
                        strokeDasharray="238.7"
                        strokeDashoffset="119" // ~50%
                        fill="transparent"
                        strokeLinecap="round"
                      />
                      {/* Segment 2: Merchant Toko (Blue) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="#0284c7"
                        strokeWidth="12"
                        strokeDasharray="238.7"
                        strokeDashoffset="180" // ~30%
                        fill="transparent"
                        strokeLinecap="round"
                      />
                      {/* Segment 3: Supplier B2B (Purple) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="#9333ea"
                        strokeWidth="12"
                        strokeDasharray="238.7"
                        strokeDashoffset="215" // ~20%
                        fill="transparent"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-bold text-slate-900 font-display">
                        {partnerStats.total || partnerStats.approved || 24}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        Total Mitra
                      </span>
                    </div>
                  </div>

                  {/* Legend by Partner Type */}
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-indigo-600 shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-800">Provider Jasa</p>
                        <p className="text-[11px] text-slate-500">{partnerStats.providerCount} Mitra Terdaftar</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-sky-600 shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-800">Merchant Toko</p>
                        <p className="text-[11px] text-slate-500">{partnerStats.merchantCount} Toko Retail</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-purple-600 shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-800">Supplier Grosir B2B</p>
                        <p className="text-[11px] text-slate-500">{partnerStats.supplierCount} Distributor Resmi</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Legalitas Verifikasi */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Status Verifikasi Dokumen & Legalitas
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                      <CheckCircle size={14} weight="fill" />
                      Mitra Terverifikasi (Approved)
                    </span>
                    <span className="font-bold text-slate-900 font-mono">
                      {partnerStats.approved}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-amber-700 font-medium">
                      <HourglassMedium size={14} weight="fill" />
                      Menunggu Review KTP/NIB
                    </span>
                    <span className="font-bold text-amber-700 font-mono px-2 py-0.5 rounded-md bg-amber-100">
                      {partnerStats.underReview} Urgent
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-rose-700 font-medium">
                      <XCircle size={14} weight="fill" />
                      Ditolak / Perlu Revisi Dokumen
                    </span>
                    <span className="font-bold text-slate-900 font-mono">
                      {partnerStats.revisionRequired + partnerStats.rejected}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {partnerStats.underReview > 0
                    ? `${partnerStats.underReview} dokumen butuh tindakan`
                    : "Semua dokumen terverifikasi"}
                </span>
                <Link
                  href="/admin/registration-applications"
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <span>Buka Antrean Verifikasi</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>

          {/* =================================================================
              GRAFIK 2.5: DISTRIBUSI VOLUME ORDER PER TAKSONOMI (KATEGORI & SUB-KATEGORI)
              Memetakan volume order & demand leaderboard untuk Jasa & Barang
              ================================================================= */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-6">
            {/* Header section with Title & Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-start gap-3">
                <span className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-700 ring-4 ring-indigo-500/10 shrink-0 mt-0.5">
                  <ChartBar size={24} weight="duotone" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 font-heading tracking-tight">
                      Distribusi Volume Order per Kategori & Sub-Kategori
                    </h2>
                    <Badge variant="primary" size="sm" className="bg-indigo-50 text-indigo-700 border-indigo-200 font-mono text-[11px]">
                      DEMAND LEADERBOARD
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Pemetaan volume pesanan riil dan perputaran transaksi berdasarkan hierarki taksonomi resmi platform.
                  </p>
                </div>
              </div>

              {/* Action shortcuts / Toggle All */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAllExpanded}
                  className="text-xs text-slate-700 border-slate-200 hover:bg-slate-50 flex items-center gap-1.5"
                >
                  <FolderSimple size={14} />
                  <span>{allExpanded ? "Tutup Semua Sub-Kategori" : "Buka Semua Sub-Kategori"}</span>
                </Button>
                <Link href="/admin/taxonomy">
                  <Button variant="outline" size="sm" className="text-xs text-[#0F4C81] border-[#0F4C81]/30 bg-[#0F4C81]/5 hover:bg-[#0F4C81]/10 flex items-center gap-1.5">
                    <SlidersHorizontal size={14} />
                    <span>Kelola Taksonomi</span>
                  </Button>
                </Link>
              </div>
            </div>

            {/* 4 Summary Metric Insight Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Card 1: Total Orders */}
              <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Total Order Terdata</span>
                  <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                    <ChartLineUp size={15} weight="bold" />
                  </span>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
                    {taxonomyKpis.totalOrders}
                  </span>
                  <span className="text-xs text-slate-500 ml-1.5">Pesanan</span>
                </div>
                <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
                  <span className="text-indigo-600 font-semibold">{taxonomyKpis.jasaOrders} Jasa</span>
                  <span>&bull;</span>
                  <span className="text-emerald-600 font-semibold">{taxonomyKpis.barangOrders} Barang</span>
                </div>
              </div>

              {/* Card 2: Top Master Category */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-900">Kategori Paling Diminati</span>
                  <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <TrendUp size={15} weight="bold" />
                  </span>
                </div>
                <div className="mt-3">
                  <p className="text-sm sm:text-base font-bold text-indigo-950 truncate" title={taxonomyKpis.topCat?.name || "-"}>
                    {taxonomyKpis.topCat?.name || "Belum Ada"}
                  </p>
                  <p className="text-xs text-indigo-700 font-mono mt-0.5">
                    {taxonomyKpis.topCat?.totalOrders || 0} Order ({taxonomyKpis.topCat?.percentageOfTotal || 0}%)
                  </p>
                </div>
                <div className="mt-2 text-[11px] text-indigo-600/80">
                  Master: {taxonomyKpis.topCat?.master_code === "JASA" ? "Layanan Jasa" : "Suku Cadang"}
                </div>
              </div>

              {/* Card 3: Top Demand Sub-Category */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-900">Sub-Kategori Terlaris (Top Demand)</span>
                  <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Tag size={15} weight="bold" />
                  </span>
                </div>
                <div className="mt-3">
                  <p className="text-sm sm:text-base font-bold text-amber-950 truncate" title={taxonomyKpis.topSub?.name || "-"}>
                    {taxonomyKpis.topSub?.name || "Belum Ada"}
                  </p>
                  <p className="text-xs text-amber-800 font-mono mt-0.5">
                    {taxonomyKpis.topSub?.orderCount || 0} Pesanan Masuk
                  </p>
                </div>
                <div className="mt-2 text-[11px] text-amber-700 truncate">
                  Di Kategori: {taxonomyKpis.topSub?.categoryName || "-"}
                </div>
              </div>

              {/* Card 4: Taksonomi Coverage */}
              <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Cakupan Hierarki</span>
                  <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <FolderSimple size={15} weight="bold" />
                  </span>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
                    {taxonomyKpis.totalCategories}
                  </span>
                  <span className="text-xs text-slate-500 ml-1.5">Master Kategori</span>
                </div>
                <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
                  <span>{taxonomyKpis.jasaCategoriesCount} Jasa</span>
                  <span>&bull;</span>
                  <span>{taxonomyKpis.barangCategoriesCount} Barang</span>
                </div>
              </div>
            </div>

            {/* Filter Pills, Search Bar, and Sort Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
              {/* Type Switcher Pills */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl w-fit">
                <button
                  type="button"
                  onClick={() => setTaxonomyFilter("ALL")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                    taxonomyFilter === "ALL"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Semua ({taxonomyKpis.totalCategories})
                </button>
                <button
                  type="button"
                  onClick={() => setTaxonomyFilter("JASA")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                    taxonomyFilter === "JASA"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Wrench size={13} />
                  <span>Jasa ({taxonomyKpis.jasaCategoriesCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTaxonomyFilter("PRODUK")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                    taxonomyFilter === "PRODUK"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Package size={13} />
                  <span>Suku Cadang ({taxonomyKpis.barangCategoriesCount})</span>
                </button>
              </div>

              {/* Search & Sort */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-56">
                  <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={taxonomySearch}
                    onChange={(e) => setTaxonomySearch(e.target.value)}
                    placeholder="Cari kategori / sub..."
                    className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  {taxonomySearch && (
                    <button
                      type="button"
                      onClick={() => setTaxonomySearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                    >
                      &times;
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Funnel size={14} className="text-slate-400" />
                  <select
                    value={taxonomySort}
                    onChange={(e) => setTaxonomySort(e.target.value as any)}
                    className="text-xs py-1.5 pl-2 pr-6 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="demand">Volume Terbanyak</option>
                    <option value="name">Nama (A-Z)</option>
                    <option value="subcats">Jumlah Sub-kategori</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Hierarchical Accordion Category List */}
            <div className="space-y-3 pt-1">
              {filteredTaxonomyStats.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                  <FolderSimple size={36} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">Tidak ada kategori yang cocok</p>
                  <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter taksonomi</p>
                </div>
              ) : (
                filteredTaxonomyStats.map((cat, idx) => {
                  const isExpanded = !!expandedCategories[cat.id];
                  const isJasa = cat.master_code === "JASA";

                  return (
                    <div
                      key={cat.id}
                      className={`rounded-2xl border transition-all overflow-hidden ${
                        cat.totalOrders > 0
                          ? isJasa
                            ? "border-indigo-200/90 bg-indigo-50/20"
                            : "border-emerald-200/90 bg-emerald-50/20"
                          : "border-slate-200/80 bg-white"
                      }`}
                    >
                      {/* Category Header Row (Clickable) */}
                      <div
                        onClick={() =>
                          setExpandedCategories((prev) => ({ ...prev, [cat.id]: !prev[cat.id] }))
                        }
                        className="p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 hover:bg-slate-50/80 cursor-pointer select-none transition-colors"
                      >
                        {/* Left: Category Icon, Name & Type Badges */}
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${
                              isJasa
                                ? "bg-indigo-100 text-indigo-700 ring-4 ring-indigo-50"
                                : "bg-emerald-100 text-emerald-700 ring-4 ring-emerald-50"
                            }`}
                          >
                            <CategoryIconRenderer
                              iconName={cat.icon_name}
                              categoryName={cat.name}
                              size={20}
                              weight="duotone"
                              fallbackIcon={isJasa ? Wrench : Package}
                            />
                          </span>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                                {cat.name}
                              </h3>
                              <Badge
                                variant={isJasa ? "secondary" : "success"}
                                size="sm"
                                className="text-[10px] uppercase font-mono py-0 px-2"
                              >
                                {isJasa ? "JASA TEKNISI" : "SUKU CADANG"}
                              </Badge>
                              {cat.totalOrders > 0 && idx === 0 && (
                                <Badge
                                  variant="warning"
                                  size="sm"
                                  className="text-[10px] bg-amber-100 text-amber-800 border-amber-300 font-semibold"
                                >
                                  Peringkat 1 Demand
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                              <span>{cat.subcategories.length} Sub-kategori Terdaftar</span>
                              <span className="text-slate-300">&bull;</span>
                              <span className="text-slate-600 truncate">
                                Sub Terlaris: <strong className={isJasa ? "text-indigo-700" : "text-emerald-700"}>{cat.topSubcategoryName}</strong>
                                {cat.topSubcategoryOrders && cat.topSubcategoryOrders > 0 ? ` (${cat.topSubcategoryOrders} Order)` : ""}
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Center / Right: Order Volume, Bar & Accordion Caret */}
                        <div className="flex items-center justify-between lg:justify-end gap-5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                          {/* Progress bar & order stats */}
                          <div className="text-left lg:text-right">
                            <div className="flex items-baseline lg:justify-end gap-1.5">
                              <span className="text-base sm:text-lg font-bold font-mono text-slate-900">
                                {cat.totalOrders}
                              </span>
                              <span className="text-xs text-slate-500 font-medium">Order</span>
                              <span className="text-xs font-mono font-semibold text-slate-600 ml-1">
                                ({cat.percentageOfTotal}%)
                              </span>
                            </div>
                            <div className="w-32 sm:w-44 h-1.5 rounded-full bg-slate-200 mt-1 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isJasa ? "bg-indigo-600" : "bg-emerald-600"
                                }`}
                                style={{ width: `${Math.max(cat.totalOrders > 0 ? 5 : 0, Math.min(100, cat.percentageOfTotal))}%` }}
                              />
                            </div>
                          </div>

                          {/* Caret Button */}
                          <button
                            type="button"
                            aria-label={isExpanded ? "Tutup detail sub-kategori" : "Buka detail sub-kategori"}
                            className={`w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-transform ${
                              isExpanded ? "bg-slate-100 rotate-180" : "bg-white"
                            }`}
                          >
                            <CaretDown size={14} weight="bold" />
                          </button>
                        </div>
                      </div>

                      {/* Sub-categories Breakdown Panel (When Expanded) */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t border-slate-200/80 bg-slate-50/60 p-3.5 sm:p-5 space-y-3"
                          >
                            <div className="flex items-center justify-between pb-1">
                              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 font-heading">
                                <Tag size={14} className={isJasa ? "text-indigo-600" : "text-emerald-600"} weight="bold" />
                                <span>Rincian Pesanan per Sub-Kategori ({cat.subcategories.length})</span>
                              </div>
                              <span className="text-[11px] text-slate-400">
                                Berdasarkan data riil database pesanan platform
                              </span>
                            </div>

                            {/* Subcategories Grid/Table */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                              {cat.subcategories.map((sub) => (
                                <div
                                  key={sub.id}
                                  className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                                    sub.orderCount > 0
                                      ? "bg-white border-slate-200/90 shadow-2xs"
                                      : "bg-white/60 border-slate-200/50"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-slate-900 truncate" title={sub.name}>
                                        {sub.name}
                                      </p>
                                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                                        ID: {sub.id.slice(0, 8)}...
                                      </p>
                                    </div>

                                    {/* Status / Top Demand Badge */}
                                    {sub.isTopDemand && sub.orderCount > 0 ? (
                                      <Badge
                                        variant="warning"
                                        size="sm"
                                        icon={<TrendUp size={11} weight="bold" />}
                                        className="text-[10px] bg-amber-500 text-white border-transparent font-bold shrink-0 shadow-xs"
                                      >
                                        Top Demand
                                      </Badge>
                                    ) : sub.orderCount > 0 ? (
                                      <Badge
                                        variant="success"
                                        size="sm"
                                        className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-200 shrink-0 font-medium"
                                      >
                                        Aktif
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="neutral"
                                        size="sm"
                                        className="text-[10px] text-slate-400 bg-slate-100 border-slate-200 shrink-0"
                                      >
                                        0 Pesanan
                                      </Badge>
                                    )}
                                  </div>

                                  {/* Sub-category Volume & Relative Contribution */}
                                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                                    <div className="flex items-baseline gap-1">
                                      <span className="font-bold font-mono text-slate-900 text-sm">
                                        {sub.orderCount}
                                      </span>
                                      <span className="text-[11px] text-slate-500">Order</span>
                                      {cat.totalOrders > 0 && (
                                        <span className="text-[10px] text-slate-400 font-mono ml-1">
                                          ({sub.percentageOfCategory}% kategori)
                                        </span>
                                      )}
                                    </div>

                                    {/* Mini proportion bar */}
                                    <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${
                                          sub.orderCount > 0
                                            ? isJasa
                                              ? "bg-indigo-500"
                                              : "bg-emerald-500"
                                            : "bg-transparent"
                                        }`}
                                        style={{ width: `${Math.min(100, sub.percentageOfCategory)}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Bottom Row: Komparasi Katalog Barang vs Jasa & Taksonomi */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* GRAFIK 3: KOMPARASI KESEHATAN KATALOG BARANG VS JASA (7 Col) */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                    <Storefront size={20} className="text-blue-600" weight="duotone" />
                    <span>Komparasi Katalog: Barang vs Jasa</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Perbandingan ketersediaan dan status moderasi listing publik
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
                {/* Kolom Marketplace Barang */}
                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Package size={16} className="text-blue-600" />
                      Katalog Barang
                    </span>
                    <Badge variant="neutral" size="sm">
                      Total {productStats.total || 14}
                    </Badge>
                  </div>

                  <div className="space-y-2 pt-1 text-xs">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-600">Aktif Tayang</span>
                        <span className="font-bold text-emerald-600 font-mono">
                          {productStats.active || 10}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full w-4/5" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-600">Menunggu Review Kurasi</span>
                        <span className="font-bold text-amber-600 font-mono">
                          {productStats.pending}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${Math.min(100, productStats.pending * 25)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-600">Nonaktif / Stok Habis</span>
                        <span className="font-bold text-slate-600 font-mono">
                          {productStats.inactive}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full bg-slate-400 rounded-full w-1/5" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link
                      href="/admin/products"
                      className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <span>Kelola Produk Barang &rarr;</span>
                    </Link>
                  </div>
                </div>

                {/* Kolom Operasional Jasa Servis */}
                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Wrench size={16} className="text-indigo-600" />
                      Katalog Jasa Servis
                    </span>
                    <Badge variant="neutral" size="sm">
                      Total {serviceStats.total || 8}
                    </Badge>
                  </div>

                  <div className="space-y-2 pt-1 text-xs">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-600">Layanan Aktif (Live)</span>
                        <span className="font-bold text-indigo-600 font-mono">
                          {serviceStats.active || 7}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full w-5/6" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-600">Layanan Ditangguhkan</span>
                        <span className="font-bold text-amber-600 font-mono">
                          {serviceStats.inactive}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full w-1/12" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-600">Layanan Diarsipkan</span>
                        <span className="font-bold text-slate-600 font-mono">
                          {serviceStats.archived}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full bg-slate-400 rounded-full w-1/12" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link
                      href="/admin/services"
                      className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <span>Kelola Katalog Jasa &rarr;</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* GRAFIK 4: TAKSONOMI & USULAN KATEGORI BARU (5 Col) */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                      <FolderSimple size={20} className="text-emerald-600" weight="duotone" />
                      <span>Matriks Taksonomi Platform</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Kategori master & sub-kategori aktif serta usulan mitra
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                    <p className="text-xs font-semibold text-emerald-800">Kategori Barang</p>
                    <p className="text-xl font-bold text-emerald-950 font-display mt-1">
                      {taxonomyStats.productCategories} Master
                    </p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      {taxonomyStats.productSubcategories} Sub-kategori suku cadang
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100">
                    <p className="text-xs font-semibold text-indigo-800">Kategori Jasa</p>
                    <p className="text-xl font-bold text-indigo-950 font-display mt-1">
                      {taxonomyStats.serviceCategories} Master
                    </p>
                    <p className="text-[11px] text-indigo-700 mt-0.5">
                      {taxonomyStats.serviceSubcategories} Sub-kategori layanan teknisi
                    </p>
                  </div>
                </div>

                {/* Usulan Kategori Baru Alert */}
                <div className="mt-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                  <span className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                    <Lightbulb size={18} weight="duotone" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-amber-900">
                        Usulan Kategori Baru Mitra
                      </p>
                      {taxonomyStats.pendingRequests > 0 ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold animate-pulse">
                          {taxonomyStats.pendingRequests} Menunggu
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                          Nihil
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Mitra dapat mengajukan master kategori atau subkategori baru saat mendaftarkan penawaran servis / barang.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Total {taxonomyStats.totalCategories} Master &bull; {taxonomyStats.totalSubcategories} Sub
                </span>
                <Link
                  href="/admin/taxonomy"
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <span>Buka Modul Taksonomi</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ===================================================================
          TAB 2: RINGKASAN OPERASIONAL & TINDAKAN (ACTION REQUIRED)
          =================================================================== */}
      {activeTab === "operasional" && (
        <motion.div
          key="tab-operasional"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          {/* 1. HERO: KARTU PERHATIAN TINDAKAN (ACTION REQUIRED) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading flex items-center gap-1.5">
                <WarningCircle size={15} className="text-amber-500" weight="fill" />
                <span>Kartu Perhatian Tindakan Mendesak (Action Required)</span>
              </h2>
              <span className="text-xs text-slate-400">
                Item yang membutuhkan persetujuan atau tinjauan admin
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Action Card 1: Pendaftaran Mitra */}
              <div className="bg-white rounded-2xl border border-amber-200/80 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                      <Users size={22} weight="duotone" />
                    </span>
                    {partnerStats.underReview > 0 ? (
                      <Badge variant="warning" size="sm" className="font-bold animate-pulse">
                        {partnerStats.underReview} Perlu Review
                      </Badge>
                    ) : (
                      <Badge variant="success" size="sm">
                        Terverifikasi Semua
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 mt-2">
                    Verifikasi Pendaftaran Mitra
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    Calon Provider Jasa, Toko Merchant, dan Supplier menunggu validasi dokumen identitas KTP/NIB.
                  </p>
                </div>
                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Total terdaftar: {partnerStats.total}
                  </span>
                  <Link href="/admin/registration-applications">
                    <Button variant="primary" size="sm" className="text-xs bg-amber-600 hover:bg-amber-700 py-1 px-3">
                      <span>Review Berkas &rarr;</span>
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Action Card 2: Pengajuan Kategori & Subkategori Baru */}
              <div className="bg-white rounded-2xl border border-blue-200/80 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                      <FolderSimple size={22} weight="duotone" />
                    </span>
                    {taxonomyStats.pendingRequests > 0 ? (
                      <Badge variant="primary" size="sm" className="font-bold">
                        {taxonomyStats.pendingRequests} Usulan Baru
                      </Badge>
                    ) : (
                      <Badge variant="neutral" size="sm">
                        Tidak Ada Antrean
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 mt-2">
                    Pengajuan Kategori Baru
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    Usulan kategori master atau sub-kategori baru dari mitra marketplace dan penyedia jasa teknisi.
                  </p>
                </div>
                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {taxonomyStats.totalCategories} Kategori Live
                  </span>
                  <Link href="/admin/taxonomy">
                    <Button variant="primary" size="sm" className="text-xs bg-[#0F4C81] hover:bg-[#0c3c66] py-1 px-3">
                      <span>Tinjau Usulan &rarr;</span>
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Action Card 3: Review Moderasi Produk */}
              <div className="bg-white rounded-2xl border border-purple-200/80 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-2.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
                      <Package size={22} weight="duotone" />
                    </span>
                    {productStats.pending > 0 ? (
                      <Badge variant="secondary" size="sm" className="font-bold">
                        {productStats.pending} Menunggu Kurasi
                      </Badge>
                    ) : (
                      <Badge variant="success" size="sm">
                        Katalog Terkurasi
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 mt-2">
                    Review Moderasi Produk
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    Listing produk baru atau pembaruan suku cadang dari merchant yang butuh lolos moderasi kualitas.
                  </p>
                </div>
                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {productStats.active} Tayang Aktif
                  </span>
                  <Link href="/admin/products">
                    <Button variant="primary" size="sm" className="text-xs bg-purple-600 hover:bg-purple-700 py-1 px-3">
                      <span>Kurasi Produk &rarr;</span>
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* 2. DUA KOLOM: MARKETPLACE BARANG (MP) vs LAYANAN JASA SERVIS (OS) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* KOLOM KIRI: MARKETPLACE BARANG (MP) */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="p-2.5 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200">
                    <Storefront size={22} weight="duotone" />
                  </span>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 font-heading">
                      Marketplace Barang (MP)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Pengawasan transaksi retail, katalog suku cadang, dan toko merchant
                    </p>
                  </div>
                </div>
                <Link href="/admin/orders">
                  <Button variant="outline" size="sm" className="text-xs">
                    Detail &rarr;
                  </Button>
                </Link>
              </div>

              {/* Status Order Global Barang */}
              <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-950 uppercase tracking-wide">
                    Status Order Global Barang
                  </span>
                  <span className="text-xs font-mono font-bold text-purple-800">
                    {orderCounts.total} Total Pesanan
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-white border border-purple-100 shadow-2xs">
                    <p className="text-[10px] text-slate-500">Sedang Berjalan</p>
                    <p className="text-lg font-bold text-amber-600 font-display">
                      {ongoingOrdersCount}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-purple-100 shadow-2xs">
                    <p className="text-[10px] text-slate-500">Order Sukses</p>
                    <p className="text-lg font-bold text-emerald-600 font-display">
                      {orderCounts.selesai || 0}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-purple-100 shadow-2xs">
                    <p className="text-[10px] text-slate-500">Order Batal</p>
                    <p className="text-lg font-bold text-rose-600 font-display">
                      {orderCounts.batal || 0}
                    </p>
                  </div>
                </div>

                {/* Sub-status breakdown */}
                <div className="pt-2 border-t border-purple-100/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600">
                  <div className="flex justify-between bg-white/70 p-1.5 rounded-lg">
                    <span>Menunggu Bayar:</span>
                    <strong className="text-slate-900">{orderCounts.belum_bayar || 0}</strong>
                  </div>
                  <div className="flex justify-between bg-white/70 p-1.5 rounded-lg">
                    <span>Toko Memproses:</span>
                    <strong className="text-slate-900">{orderCounts.diproses || 0}</strong>
                  </div>
                  <div className="flex justify-between bg-white/70 p-1.5 rounded-lg">
                    <span>Siap Kirim:</span>
                    <strong className="text-slate-900">{orderCounts.dikemas || 0}</strong>
                  </div>
                  <div className="flex justify-between bg-white/70 p-1.5 rounded-lg">
                    <span>Kurir Mengantar:</span>
                    <strong className="text-slate-900">{orderCounts.dikirim || 0}</strong>
                  </div>
                </div>
              </div>

              {/* Status Katalog Produk Barang */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Status Katalog Suku Cadang
                  </span>
                  <Link href="/admin/products" className="text-[11px] text-primary hover:underline">
                    Kelola Katalog &rarr;
                  </Link>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/60">
                    <p className="text-[10px] text-slate-500">Menunggu Review</p>
                    <p className="text-base font-bold text-amber-600">{productStats.pending}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/60">
                    <p className="text-[10px] text-slate-500">Aktif Tayang</p>
                    <p className="text-base font-bold text-emerald-600">{productStats.active}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/60">
                    <p className="text-[10px] text-slate-500">Nonaktif / Habis</p>
                    <p className="text-base font-bold text-slate-600">{productStats.inactive}</p>
                  </div>
                </div>
              </div>

              {/* Kategori & Sub-Kategori Barang */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                <div>
                  <p className="font-bold text-slate-900">Taksonomi Barang Aktif</p>
                  <p className="text-slate-500 text-[11px]">
                    {taxonomyStats.productCategories} Kategori Master &bull; {taxonomyStats.productSubcategories} Sub-kategori Suku Cadang
                  </p>
                </div>
                <Link href="/admin/taxonomy">
                  <Badge variant="primary" size="sm">
                    Atur Taksonomi
                  </Badge>
                </Link>
              </div>
            </div>

            {/* KOLOM KANAN: LAYANAN JASA SERVIS (OS) */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <Wrench size={22} weight="duotone" />
                  </span>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 font-heading">
                      Layanan Jasa Servis
                    </h3>
                    <p className="text-xs text-slate-500">
                      Pengawasan katalog servis teknisi, taksonomi jasa, dan mitra provider
                    </p>
                  </div>
                </div>
                <Link href="/admin/services">
                  <Button variant="outline" size="sm" className="text-xs">
                    Detail &rarr;
                  </Button>
                </Link>
              </div>

              {/* Status Katalog Jasa Servis */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                    Status Katalog Jasa Servis
                  </span>
                  <span className="text-xs font-mono font-bold text-indigo-800">
                    {serviceStats.total} Total Layanan
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-white border border-indigo-100 shadow-2xs">
                    <p className="text-[10px] text-slate-500">Layanan Aktif</p>
                    <p className="text-lg font-bold text-emerald-600 font-display">
                      {serviceStats.active}
                    </p>
                    <p className="text-[9px] text-slate-400">Siap dibooking</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-indigo-100 shadow-2xs">
                    <p className="text-[10px] text-slate-500">Layanan Nonaktif</p>
                    <p className="text-lg font-bold text-amber-600 font-display">
                      {serviceStats.inactive}
                    </p>
                    <p className="text-[9px] text-slate-400">Ditangguhkan</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-indigo-100 shadow-2xs">
                    <p className="text-[10px] text-slate-500">Diarsipkan</p>
                    <p className="text-lg font-bold text-slate-600 font-display">
                      {serviceStats.archived}
                    </p>
                    <p className="text-[9px] text-slate-400">Arsip lama</p>
                  </div>
                </div>
              </div>

              {/* Kategori & Sub-Kategori Jasa */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Kategori Layanan Servis
                  </span>
                  <Link href="/admin/taxonomy" className="text-[11px] text-primary hover:underline">
                    Lihat Master &rarr;
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/60">
                    <p className="text-[10px] text-slate-500">Kategori Master Jasa</p>
                    <p className="text-base font-bold text-indigo-700">{taxonomyStats.serviceCategories} Bidang Layanan</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/60">
                    <p className="text-[10px] text-slate-500">Sub-kategori Layanan</p>
                    <p className="text-base font-bold text-indigo-700">{taxonomyStats.serviceSubcategories} Spesialisasi</p>
                  </div>
                </div>
              </div>

              {/* Jumlah Mitra Provider */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                <div>
                  <p className="font-bold text-slate-900">Mitra Provider Jasa Terdaftar</p>
                  <p className="text-slate-500 text-[11px]">
                    Teknisi dan vendor penyedia layanan servis di platform
                  </p>
                </div>
                <Badge variant="primary" size="sm" className="font-mono font-bold">
                  {partnerStats.providerCount} Provider
                </Badge>
              </div>
            </div>
          </div>

          {/* 3. TABEL MONITORING LIVE: TRANSAKSI ORDER BARANG & PENDAFTARAN MITRA TERBARU */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900 font-heading flex items-center gap-2">
                  <Eye size={20} className="text-[#0F4C81]" weight="duotone" />
                  <span>Tabel Monitoring Operasional Live</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sinkronisasi langsung dari microservice pesanan retail dan identitas mitra
                </p>
              </div>

              {/* Interactive Sub-Toggle Tabs */}
              <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/70 text-xs self-start sm:self-auto">
                <button
                  onClick={() => setMonitoringTab("orders")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${monitoringTab === "orders"
                    ? "bg-white text-[#0F4C81] shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  <ShoppingBag size={14} weight={monitoringTab === "orders" ? "fill" : "regular"} />
                  <span>Order Barang Real-time</span>
                  {recentOrders.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 text-[10px] flex items-center justify-center font-mono">
                      {recentOrders.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setMonitoringTab("mitra")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${monitoringTab === "mitra"
                    ? "bg-white text-[#0F4C81] shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  <Users size={14} weight={monitoringTab === "mitra" ? "fill" : "regular"} />
                  <span>Pendaftaran Mitra Terbaru</span>
                  {recentApplications.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-700 text-[10px] flex items-center justify-center font-mono">
                      {recentApplications.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Sub-Tab 1: Order Barang Real-time */}
            {monitoringTab === "orders" && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px]">
                      <th className="py-3 px-3">ID Pesanan</th>
                      <th className="py-3 px-3">Toko Merchant</th>
                      <th className="py-3 px-3">Pelanggan</th>
                      <th className="py-3 px-3 text-right">Total Transaksi</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Waktu Masuk</th>
                      <th className="py-3 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {recentOrders.length > 0 ? (
                      recentOrders.map((order) => {
                        const merchantName =
                          order.merchant_display_snapshot?.name ||
                          order.merchant_org_id ||
                          "Toko Suku Cadang Servio";
                        const customerName =
                          order.recipient_snapshot?.recipient_name ||
                          order.address_snapshot?.recipient_name ||
                          order.customer_id ||
                          "Pelanggan Marketplace";
                        const orderTotal =
                          order.customer_total_idr ||
                          order.product_subtotal_idr ||
                          0;

                        return (
                          <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-slate-900">
                              {order.order_number || order.id.slice(0, 12)}
                            </td>
                            <td className="py-3 px-3 font-medium text-slate-800">
                              {merchantName}
                            </td>
                            <td className="py-3 px-3 text-slate-600">
                              {customerName}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(orderTotal)}
                            </td>
                            <td className="py-3 px-3">
                              {getOrderStatusBadge(order.status)}
                            </td>
                            <td className="py-3 px-3 text-slate-500">
                              {order.created_at ? new Date(order.created_at).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              }) : "-"}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <Link
                                href={`/admin/orders`}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                              >
                                <span>Lihat</span>
                                <CaretRight size={12} />
                              </Link>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          <ShoppingBag size={32} className="mx-auto mb-2 text-slate-300" />
                          <p>Belum ada order barang transaksi masuk</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Sub-Tab 2: Pendaftaran Mitra Terbaru */}
            {monitoringTab === "mitra" && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px]">
                      <th className="py-3 px-3">Nama Usaha / Brand</th>
                      <th className="py-3 px-3">Jenis Mitra</th>
                      <th className="py-3 px-3">Penanggung Jawab (PIC)</th>
                      <th className="py-3 px-3">Status Dokumen</th>
                      <th className="py-3 px-3">Tanggal Pengajuan</th>
                      <th className="py-3 px-3 text-center">Aksi Verifikasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {recentApplications.length > 0 ? (
                      recentApplications.map((app) => {
                        const brand =
                          app.businessData?.brandName ||
                          app.businessData?.legalName ||
                          app.user?.fullName ||
                          "Calon Mitra Servio";
                        const pic = app.user?.fullName || app.picData?.fullName || "-";

                        let typeBadge = <Badge variant="neutral" size="sm">Mitra</Badge>;
                        if (app.applicantType === "SERVICE_PROVIDER") {
                          typeBadge = <Badge variant="primary" size="sm">Provider Jasa</Badge>;
                        } else if (app.applicantType === "MERCHANT") {
                          typeBadge = <Badge variant="secondary" size="sm">Merchant Toko</Badge>;
                        } else if (app.applicantType === "SUPPLIER") {
                          typeBadge = <Badge variant="neutral" size="sm">Supplier B2B</Badge>;
                        }

                        let statusBadge = <Badge variant="neutral" size="sm">{app.status}</Badge>;
                        if (app.status === "APPROVED") {
                          statusBadge = <Badge variant="success" size="sm" icon={<CheckCircle size={12} weight="fill" />}>Disetujui</Badge>;
                        } else if (app.status === "SUBMITTED" || app.status === "UNDER_REVIEW") {
                          statusBadge = <Badge variant="warning" size="sm" icon={<HourglassMedium size={12} weight="fill" />}>Menunggu Review</Badge>;
                        } else if (app.status === "REVISION_REQUIRED") {
                          statusBadge = <Badge variant="warning" size="sm">Perlu Revisi</Badge>;
                        } else if (app.status === "REJECTED") {
                          statusBadge = <Badge variant="danger" size="sm">Ditolak</Badge>;
                        }

                        return (
                          <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 font-semibold text-slate-900">
                              {brand}
                            </td>
                            <td className="py-3 px-3">
                              {typeBadge}
                            </td>
                            <td className="py-3 px-3 text-slate-600">
                              {pic}
                            </td>
                            <td className="py-3 px-3">
                              {statusBadge}
                            </td>
                            <td className="py-3 px-3 text-slate-500">
                              {app.createdAt ? new Date(app.createdAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }) : "-"}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <Link href={`/admin/registration-applications`}>
                                <Button
                                  variant={app.status === "UNDER_REVIEW" || app.status === "SUBMITTED" ? "primary" : "outline"}
                                  size="sm"
                                  className="text-[11px] py-1 px-2.5"
                                >
                                  Verifikasi
                                </Button>
                              </Link>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          <Users size={32} className="mx-auto mb-2 text-slate-300" />
                          <p>Belum ada antrean pendaftaran mitra baru</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
