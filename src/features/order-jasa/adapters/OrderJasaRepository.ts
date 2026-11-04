import {
  ServiceOrder,
  BookingCreationInput,
  Diagnosis,
  FollowUpOrderDraft,
  TechnicianMonthlyRecapData,
} from "../types";

export interface OrderJasaRepository {
  // Queries
  listOrders(force?: boolean): Promise<ServiceOrder[]>;
  getOrderById(id: string): Promise<ServiceOrder | undefined>;
  getTechnicianRecap(month?: number, year?: number, search?: string): Promise<TechnicianMonthlyRecapData>;

  // Customer actions
  createBooking(input: BookingCreationInput): Promise<ServiceOrder>;
  cancelBooking(orderId: string, reason: string): Promise<boolean>;
  respondRemoteConsent(orderId: string, approve: boolean, notes?: string): Promise<boolean>;
  confirmCustomerCompleted(orderId: string): Promise<boolean>;
  createFollowUpOrder(
    draft: FollowUpOrderDraft,
    scheduledDate: string,
    scheduledTimeSlot: string
  ): Promise<ServiceOrder>;

  // Worker actions
  acceptAssignment(orderId: string): Promise<boolean>;
  rejectAssignment(orderId: string, reason: string): Promise<boolean>;
  startTrip(orderId: string): Promise<boolean>;
  arriveAtLocation(orderId: string): Promise<boolean>;
  submitDiagnosis(orderId: string, diagnosisInput: Partial<Diagnosis>): Promise<boolean>;
  recordInPersonConsent(orderId: string, notes?: string): Promise<boolean>;
  startExecution(orderId: string): Promise<boolean>;
  finishExecution(
    orderId: string,
    executionData: {
      beforePhotos: string[];
      afterPhotos: string[];
      workSummary: string;
      testResults: string;
      usedSpareparts?: string[];
      notes?: string;
    }
  ): Promise<boolean>;
  endVisit(orderId: string): Promise<boolean>;
  reportPaymentIssue(orderId: string, issue: string): Promise<boolean>;

  // Provider actions
  assignWorker(
    orderId: string,
    workerId: string,
    workerName: string,
    workerPhone: string
  ): Promise<boolean>;

  // Finance Ops actions
  simulateFinancePayment(
    invoiceNo: string,
    outcome?: "PAID" | "FAILED",
    orderIdHint?: string,
    amountHint?: number
  ): Promise<boolean>;
  simulateReleaseFunds120h(orderId: string): Promise<boolean>;

  // Utility
  resetFixtures(): Promise<void>;
}
