import type { Metadata } from "next";
import localFont from "next/font/local";
import { RoleProvider } from "@/context/RoleContext";
import { LocationProvider } from "@/context/LocationContext";
import { LocationPickerModal } from "@/components/features/location/LocationPickerModal";
import { PageLoadingProvider } from "@/components/feedback/PageLoadingProvider";
import { RoleSwitcher } from "@/components/navigation/RoleSwitcher";
import { SPayProvider } from "@/features/spay/spay.frontend-provider";
import "./globals.css";

const sora = localFont({
  src: [
    {
      path: "../fonts/Sora-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/Sora-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/Sora-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/Sora-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../fonts/Sora-ExtraBold.woff2",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-sora",
  display: "swap",
});

const plusJakartaSans = localFont({
  src: [
    {
      path: "../fonts/PlusJakartaSans-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/PlusJakartaSans-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/PlusJakartaSans-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/PlusJakartaSans-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const satisfy = localFont({
  src: [
    {
      path: "../fonts/Satisfy-Regular.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-satisfy",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SERVIO — More Than Service, A Better Everyday",
  description: "Platform marketplace hybrid terpadu untuk layanan jasa profesional, integrasi suku cadang, dan perawatan aset terpercaya.",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/brand/logo.png", type: "image/png" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${sora.variable} ${plusJakartaSans.variable} ${satisfy.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-neutral-dark selection:bg-sky selection:text-primary">
        <RoleProvider>
          <LocationProvider>
            <SPayProvider>
              <PageLoadingProvider>{children}</PageLoadingProvider>
              <LocationPickerModal />
              <RoleSwitcher />
            </SPayProvider>
          </LocationProvider>
        </RoleProvider>
      </body>
    </html>
  );
}
