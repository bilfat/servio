import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/provider/proof/:orderId",
        destination: "/provider/orders/:orderId",
        permanent: false,
      },
      {
        source: "/provider/proof",
        destination: "/provider/orders?status=AWAITING_PROOF_REVIEW",
        permanent: false,
      },
      {
        source: "/provider/completion/:orderId",
        destination: "/provider/orders/:orderId",
        permanent: false,
      },
      {
        source: "/provider/completion",
        destination: "/provider/orders?status=COMPLETED",
        permanent: false,
      },
      {
        source: "/provider/execution/:orderId",
        destination: "/provider/orders/:orderId",
        permanent: false,
      },
      {
        source: "/provider/execution",
        destination: "/provider/orders?status=IN_PROGRESS",
        permanent: false,
      },
      {
        source: "/provider/quotations/:orderId",
        destination: "/provider/orders/:orderId",
        permanent: false,
      },
      {
        source: "/provider/quotations",
        destination: "/provider/orders?status=WAITING_APPROVAL",
        permanent: false,
      },
      {
        source: "/provider/inventory",
        destination: "/provider/partnerships",
        permanent: false,
      },
      {
        source: "/provider/fulfillment",
        destination: "/provider/orders",
        permanent: false,
      },
      {
        source: "/provider/shipping",
        destination: "/provider/orders",
        permanent: false,
      },
      {
        source: "/provider/returns",
        destination: "/provider/orders",
        permanent: false,
      },
      {
        source: "/provider/service-product",
        destination: "/provider/partnerships",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/sanctum/:path*",
        destination: "http://127.0.0.1:8001/sanctum/:path*",
      },
      {
        source: "/storage/:path*",
        destination: "http://127.0.0.1:8001/storage/:path*",
      },
      // Finance Service (Modul 06 - Port 8006)
      {
        source: "/api/v1/finance/:path*",
        destination: "http://127.0.0.1:8006/api/v1/finance/:path*",
      },
      // Category Service (Modul 02 - Port 8002)
      {
        source: "/api/v1/category-masters/:path*",
        destination: "http://127.0.0.1:8002/api/v1/category-masters/:path*",
      },
      {
        source: "/api/v1/category-masters",
        destination: "http://127.0.0.1:8002/api/v1/category-masters",
      },
      {
        source: "/api/v1/categories/:path*",
        destination: "http://127.0.0.1:8002/api/v1/categories/:path*",
      },
      {
        source: "/api/v1/categories",
        destination: "http://127.0.0.1:8002/api/v1/categories",
      },
      {
        source: "/api/v1/subcategories/:path*",
        destination: "http://127.0.0.1:8002/api/v1/subcategories/:path*",
      },
      {
        source: "/api/v1/subcategories",
        destination: "http://127.0.0.1:8002/api/v1/subcategories",
      },
      {
        source: "/api/v1/category-requests/:path*",
        destination: "http://127.0.0.1:8002/api/v1/category-requests/:path*",
      },
      {
        source: "/api/v1/category-requests",
        destination: "http://127.0.0.1:8002/api/v1/category-requests",
      },
      {
        source: "/api/v1/category-audit/:path*",
        destination: "http://127.0.0.1:8002/api/v1/category-audit/:path*",
      },
      {
        source: "/api/v1/category-audit",
        destination: "http://127.0.0.1:8002/api/v1/category-audit",
      },
      // Product Service (Modul 03 - Port 8003)
      {
        source: "/api/v1/merchant/products/:path*",
        destination: "http://127.0.0.1:8003/api/v1/merchant/products/:path*",
      },
      {
        source: "/api/v1/merchant/products",
        destination: "http://127.0.0.1:8003/api/v1/merchant/products",
      },
      {
        source: "/api/v1/governance/products/:path*",
        destination: "http://127.0.0.1:8003/api/v1/governance/products/:path*",
      },
      {
        source: "/api/v1/governance/products",
        destination: "http://127.0.0.1:8003/api/v1/governance/products",
      },
      {
        source: "/api/v1/product-audit/:path*",
        destination: "http://127.0.0.1:8003/api/v1/product-audit/:path*",
      },
      {
        source: "/api/v1/product-audit",
        destination: "http://127.0.0.1:8003/api/v1/product-audit",
      },
      {
        source: "/api/v1/product-media/:path*",
        destination: "http://127.0.0.1:8003/api/v1/product-media/:path*",
      },
      {
        source: "/api/v1/merchants/:path*",
        destination: "http://127.0.0.1:8003/api/v1/merchants/:path*",
      },
      {
        source: "/api/v1/products/:path*",
        destination: "http://127.0.0.1:8003/api/v1/products/:path*",
      },
      {
        source: "/api/v1/products",
        destination: "http://127.0.0.1:8003/api/v1/products",
      },
      // Service Offering Service (Modul 04 - Port 8004)
      {
        source: "/api/v1/provider/services/:path*",
        destination: "http://127.0.0.1:8004/api/v1/provider/services/:path*",
      },
      {
        source: "/api/v1/provider/services",
        destination: "http://127.0.0.1:8004/api/v1/provider/services",
      },
      {
        source: "/api/v1/provider/service-definition-requests/:path*",
        destination: "http://127.0.0.1:8004/api/v1/provider/service-definition-requests/:path*",
      },
      {
        source: "/api/v1/provider/service-definition-requests",
        destination: "http://127.0.0.1:8004/api/v1/provider/service-definition-requests",
      },
      {
        source: "/api/v1/provider/worker-capabilities/:path*",
        destination: "http://127.0.0.1:8004/api/v1/provider/worker-capabilities/:path*",
      },
      {
        source: "/api/v1/provider/worker-capabilities",
        destination: "http://127.0.0.1:8004/api/v1/provider/worker-capabilities",
      },
      {
        source: "/api/v1/governance/service-offerings/:path*",
        destination: "http://127.0.0.1:8004/api/v1/governance/service-offerings/:path*",
      },
      {
        source: "/api/v1/governance/service-offerings",
        destination: "http://127.0.0.1:8004/api/v1/governance/service-offerings",
      },
      {
        source: "/api/v1/admin/service-definitions/:path*",
        destination: "http://127.0.0.1:8004/api/v1/admin/service-definitions/:path*",
      },
      {
        source: "/api/v1/admin/service-definitions",
        destination: "http://127.0.0.1:8004/api/v1/admin/service-definitions",
      },
      {
        source: "/api/v1/admin/service-definition-requests/:path*",
        destination: "http://127.0.0.1:8004/api/v1/admin/service-definition-requests/:path*",
      },
      {
        source: "/api/v1/admin/service-definition-requests",
        destination: "http://127.0.0.1:8004/api/v1/admin/service-definition-requests",
      },
      {
        source: "/api/v1/admin/capabilities/:path*",
        destination: "http://127.0.0.1:8004/api/v1/admin/capabilities/:path*",
      },
      {
        source: "/api/v1/admin/capabilities",
        destination: "http://127.0.0.1:8004/api/v1/admin/capabilities",
      },
      {
        source: "/api/v1/service-definitions/:path*",
        destination: "http://127.0.0.1:8004/api/v1/service-definitions/:path*",
      },
      {
        source: "/api/v1/service-definitions",
        destination: "http://127.0.0.1:8004/api/v1/service-definitions",
      },
      {
        source: "/api/v1/capabilities/:path*",
        destination: "http://127.0.0.1:8004/api/v1/capabilities/:path*",
      },
      {
        source: "/api/v1/capabilities",
        destination: "http://127.0.0.1:8004/api/v1/capabilities",
      },
      {
        source: "/api/v1/service-media/:path*",
        destination: "http://127.0.0.1:8004/api/v1/service-media/:path*",
      },
      {
        source: "/api/v1/service-audit/:path*",
        destination: "http://127.0.0.1:8004/api/v1/service-audit/:path*",
      },
      {
        source: "/api/v1/service-audit",
        destination: "http://127.0.0.1:8004/api/v1/service-audit",
      },
      {
        source: "/api/v1/providers/:path*",
        destination: "http://127.0.0.1:8004/api/v1/providers/:path*",
      },
      {
        source: "/api/v1/services/:path*",
        destination: "http://127.0.0.1:8004/api/v1/services/:path*",
      },
      {
        source: "/api/v1/services",
        destination: "http://127.0.0.1:8004/api/v1/services",
      },
      // Finance & Payment Service (Modul 06 - Port 8006)
      {
        source: "/api/v1/finance/:path*",
        destination: "http://127.0.0.1:8006/api/v1/finance/:path*",
      },
      {
        source: "/api/v1/finance",
        destination: "http://127.0.0.1:8006/api/v1/finance",
      },
      // Sanctum CSRF (Identity Service - Port 8001)
      {
        source: "/sanctum/:path*",
        destination: "http://127.0.0.1:8001/sanctum/:path*",
      },
      // Identity Service (Modul 01 - Port 8001)
      {
        source: "/api/v1/:path*",
        destination: "http://127.0.0.1:8001/api/v1/:path*",
      },
      {
        source: "/ops/:path*",
        destination: "/:path*",
      },
    ];
  },
};

export default nextConfig;
