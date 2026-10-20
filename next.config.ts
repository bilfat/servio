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
