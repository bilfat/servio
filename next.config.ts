import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
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
