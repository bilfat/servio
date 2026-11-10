"use client";

import { useEffect } from "react";
import { reportClientTelemetry } from "@/lib/devMonitor/clientReporter";

export function ClientErrorTelemetryHost() {
  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      const msg = event.message || event.error?.message || "Uncaught JavaScript error";
      // Ignore noisy benign browser ResizeObserver loop alerts
      if (/ResizeObserver loop/i.test(msg)) return;

      reportClientTelemetry({
        kind: "REACT_RUNTIME",
        message: msg,
        stack: event.error?.stack || `${event.filename || "unknown"}:${event.lineno}:${event.colno}`,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      // If it already came from apiFetch with HTTP status, apiFetch already reported it
      if (reason && typeof reason === "object" && "status" in reason && "requestId" in reason) {
        return;
      }

      const msg =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "Unhandled Promise Rejection";
      const stack = reason instanceof Error ? reason.stack : null;

      reportClientTelemetry({
        kind: "UNHANDLED_REJECTION",
        message: msg,
        stack,
        requestId:
          reason && typeof reason === "object" && "requestId" in reason
            ? String((reason as { requestId?: unknown }).requestId || "") || null
            : null,
      });
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}

