"use client";

import { useState } from "react";
import { ServiceOffering, ServiceMode, BookingRequest } from "@/types/domain";
import { serviceOrderApi } from "@/lib/servioApi";

export interface BookingWizardState {
  step: number;
  service: ServiceOffering | null;
  serviceMode: ServiceMode;
  scheduledDate: string;
  scheduledTimeSlot: string;
  address: {
    street: string;
    city: string;
    notes?: string;
  };
  customFieldValues: Record<string, string | number | boolean>;
  customerNotes?: string;
}

export function useBookingWizard(initialService?: ServiceOffering) {
  const [state, setState] = useState<BookingWizardState>({
    step: 1,
    service: initialService || null,
    serviceMode: initialService?.serviceModes[0] || "HOME_SERVICE",
    scheduledDate: "",
    scheduledTimeSlot: "",
    address: {
      street: "",
      city: "Jakarta Selatan",
      notes: "",
    },
    customFieldValues: {},
    customerNotes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<BookingRequest | null>(null);

  const setService = (service: ServiceOffering) => {
    setState((prev) => ({
      ...prev,
      service,
      serviceMode: service.serviceModes[0] || "HOME_SERVICE",
    }));
  };

  const setSchedule = (date: string, timeSlot: string) => {
    setState((prev) => ({
      ...prev,
      scheduledDate: date,
      scheduledTimeSlot: timeSlot,
    }));
  };

  const setAddress = (address: { street: string; city: string; notes?: string }) => {
    setState((prev) => ({
      ...prev,
      address,
    }));
  };

  const setCustomFields = (values: Record<string, string | number | boolean>) => {
    setState((prev) => ({
      ...prev,
      customFieldValues: values,
    }));
  };

  const nextStep = () => {
    setState((prev) => ({ ...prev, step: Math.min(prev.step + 1, 4) }));
  };

  const prevStep = () => {
    setState((prev) => ({ ...prev, step: Math.max(prev.step - 1, 1) }));
  };

  const submitBooking = async (): Promise<BookingRequest> => {
    setIsSubmitting(true);
    try {
      const res = await serviceOrderApi.create({
        providerMasterServiceId: state.service?.id,
        serviceName: state.service?.title,
        serviceCategory: state.service?.subcategoryId,
        categoryId: (state.service as { categoryId?: string })?.categoryId,
        subcategoryId: state.service?.subcategoryId,
        providerId: state.service?.providerId,
        totalAmount: state.service?.basePrice || 50000,
        notes: state.customerNotes,
        address: state.address,
        scheduledDate: state.scheduledDate,
        scheduledTimeSlot: state.scheduledTimeSlot,
      });

      const serverOrder = (res.data as { data?: { _id?: string; id?: string; customerId?: string } })?.data;
      const orderId = serverOrder?._id || serverOrder?.id || `book-${Date.now().toString().slice(-4)}`;

      const newBooking: BookingRequest = {
        id: orderId,
        customerId: serverOrder?.customerId || "cust-sarah",
        customerName: "Sarah Annisa",
        customerPhone: "0812-9988-1122",
        serviceId: state.service?.id || "srv-canonical",
        serviceTitle: state.service?.title || "Layanan Servio",
        providerId: state.service?.providerId || "prov-canonical",
        providerName: state.service?.providerName || "Mitra Servio",
        serviceMode: state.serviceMode,
        scheduledDate: state.scheduledDate || "2026-09-22",
        scheduledTimeSlot: state.scheduledTimeSlot || "09:00 - 11:00",
        address: state.address,
        customFieldValues: state.customFieldValues,
        notes: state.customerNotes,
        status: "PENDING_CONFIRMATION",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600 * 24 * 1000).toISOString(),
      };

      setCreatedBooking(newBooking);
      setIsSubmitting(false);
      return newBooking;
    } catch (err) {
      console.warn("serviceOrderApi.create fallback for guest/offline:", err);
      const fallbackBooking: BookingRequest = {
        id: `book-${Date.now().toString().slice(-4)}`,
        customerId: "cust-sarah",
        customerName: "Sarah Annisa",
        customerPhone: "0812-9988-1122",
        serviceId: state.service?.id || "srv-canonical",
        serviceTitle: state.service?.title || "Layanan Servio",
        providerId: state.service?.providerId || "prov-canonical",
        providerName: state.service?.providerName || "Mitra Servio",
        serviceMode: state.serviceMode,
        scheduledDate: state.scheduledDate || "2026-09-22",
        scheduledTimeSlot: state.scheduledTimeSlot || "09:00 - 11:00",
        address: state.address,
        customFieldValues: state.customFieldValues,
        notes: state.customerNotes,
        status: "PENDING_CONFIRMATION",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600 * 24 * 1000).toISOString(),
      };
      setCreatedBooking(fallbackBooking);
      setIsSubmitting(false);
      return fallbackBooking;
    }
  };

  return {
    state,
    setService,
    setSchedule,
    setAddress,
    setCustomFields,
    nextStep,
    prevStep,
    submitBooking,
    isSubmitting,
    createdBooking,
  };
}
