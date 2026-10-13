// SERVIO Canonical Role & Access Architecture Types

export type UserRole =
  | "CUSTOMER"
  | "SERVICE_PROVIDER"
  | "WORKER_TECHNICIAN"
  | "CUSTOMER_SUPPORT"
  | "FINANCE_PAYMENT_OPS"
  | "MERCHANT"
  | "SUPPLIER"
  | "ADMIN_OPERATIONS"
  | "CEO_PRODUCT_OWNER";

export type PermissionScope =
  | "OWN"
  | "ASSIGNED"
  | "RELATED"
  | "ORGANIZATION"
  | "PLATFORM"
  | "GLOBAL"
  | "AGGREGATE";

export interface RoleAssignment {
  assignmentId: string;
  code: UserRole;
  name?: string;
  scopeType: PermissionScope | string;
  scopeId?: string | null;
  status: "ACTIVE" | "PENDING" | "SUSPENDED" | "EXPIRED" | "REVOKED";
  startsAt?: string;
  endsAt?: string | null;
}

export interface ActiveRoleContext {
  assignmentId: string;
  code: UserRole;
  scopeType: PermissionScope | string;
  scopeId?: string | null;
  status?: string;
}

export type PermissionAction =
  | "VIEW"
  | "CREATE"
  | "UPDATE"
  | "SUBMIT"
  | "APPROVE"
  | "REJECT"
  | "EXECUTE"
  | "CANCEL"
  | "MANAGE"
  | "CONFIGURE"
  | "ANALYZE";

export type BusinessResource =
  | "DISCOVERY"
  | "BOOKING_JASA"
  | "ORDER_JASA"
  | "QUOTATION"
  | "CHAT"
  | "PAYMENT"
  | "EXECUTION"
  | "TRACKING"
  | "PROOF"
  | "COMPLETION"
  | "REVIEW"
  | "DISPUTE"
  | "WARRANTY"
  | "SERVICE_HISTORY"
  | "MAINTENANCE"
  | "LOYALTY"
  | "SMART_RECOMMENDATION"
  | "PRODUCT"
  | "CART"
  | "PRODUCT_ORDER"
  | "INVENTORY"
  | "FULFILLMENT"
  | "SHIPPING"
  | "RETURN_REFUND"
  | "USER_MANAGEMENT"
  | "TAXONOMY"
  | "FINANCE_OPS"
  | "EXECUTIVE_GOVERNANCE";

export interface UserContext {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status?: string;
  activeRole: UserRole;
  availableRoles: UserRole[];
  roleAssignments?: RoleAssignment[];
  activeAssignmentId?: string;
  activeScope?: PermissionScope | string;
  permissions?: string[];
  employeeId?: string;
  department?: string;
  organizationId?: string;
  organizationName?: string;
  avatarUrl?: string;
  avatar?: string;
  emergencyContact?: {
    name?: string;
    phone?: string;
  } | null;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  createdAt?: string;
  nik?: string;
  ktpFilePath?: string;
  providerId?: string;
  workerProfile?: {
    workerCode?: string;
    employeeId?: string;
    providerId?: string;
    providerName?: string;
    position?: string;
    skills?: string[];
    specialization?: string[];
    serviceDomain?: string;
    experienceYears?: number;
    availability?: {
      workingDays?: string[];
      workingHours?: string;
    };
    status?: string;
    isOnline?: boolean;
    rating?: number;
    completedJobs?: number;
    vehicleNumber?: string;
    capabilities?: string[];
  };
  businessProfile?: {
    id?: string;
    registrationNumber?: string;
    status?: string;
    applicantType?: string;
    picData?: {
      fullName?: string;
      nik?: string;
      position?: string;
      phone?: string;
      email?: string;
    };
    businessData?: {
      legalName?: string;
      brandName?: string;
      businessType?: string;
      nib?: string;
      npwp?: string;
      email?: string;
      phone?: string;
      address?: string;
      province?: string;
      city?: string;
      district?: string;
      postalCode?: string;
    };
    specializedData?: Record<string, unknown>;
  };
  documents?: Array<{
    id: string;
    documentType: string;
    fileName: string;
    filePath: string;
    fileSize?: number;
    status: string;
    version: number;
  }>;
  personalProfile?: {
    id?: string;
    userId?: string;
    displayName?: string;
    fullName?: string;
    avatar?: string | null;
    bio?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    preferences?: Record<string, unknown>;
  };
  activeOrganization?: {
    id: string;
    organizationCode: string;
    name: string;
    type: string;
    status: string;
    profile?: {
      legalName?: string;
      brandName?: string;
      description?: string;
      businessType?: string;
      registrationNumber?: string;
      taxInformation?: Record<string, unknown>;
      website?: string;
      logo?: string;
    } | null;
  } | null;
  activeMembership?: {
    id: string;
    organizationId?: string;
    membershipType: string;
    status: string;
    joinedAt?: string | null;
  } | null;
}

export type ResourceRecord = Record<string, unknown>;

export interface AccessEvaluation {
  allowed: boolean;
  status: "ALLOWED" | "DENIED_NO_PERMISSION" | "DENIED_SCOPE" | "DISABLED_BUSINESS_CONDITION";
  reason?: string;
}

export interface PermissionRule {
  role: UserRole;
  action: PermissionAction;
  resource: BusinessResource;
  allowedScopes: PermissionScope[];
  condition?: (context: UserContext, resourceData?: ResourceRecord) => boolean;
}
