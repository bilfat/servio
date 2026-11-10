import React from "react";
import type { Metadata } from "next";
import { DevShell } from "@/components/dev/DevShell";

export const metadata: Metadata = {
  title: "SERVIO Dev Observability Console",
  description: "Panel pemantauan sistem, error telemetry, dan audit lintas microservice SERVIO.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DevPortalLayout({ children }: { children: React.ReactNode }) {
  return <DevShell>{children}</DevShell>;
}

