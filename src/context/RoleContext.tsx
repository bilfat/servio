"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  UserRole,
  UserContext,
  PermissionAction,
  BusinessResource,
  PermissionScope,
  ResourceRecord,
  RoleAssignment,
  ActiveRoleContext,
} from "@/types/auth";
import { hasPermission as evaluatePermission } from "@/lib/permissions/hasPermission";
import { authApi } from "@/lib/servioApi";

const GUEST_USER_CONTEXT: UserContext = {
  id: "guest",
  name: "Tamu Publik",
  email: "",
  activeRole: "CUSTOMER",
  availableRoles: [],
  roleAssignments: [],
  permissions: [],
  avatarUrl: "/brand/logo.png",
};

export interface RoleContextValue {
  user: UserContext;
  roleAssignments: RoleAssignment[];
  activeRole: UserRole;
  activeScope: PermissionScope | string;
  permissions: string[];
  isPublicGuest: boolean;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  setIsPublicGuest: (isGuest: boolean) => void;
  switchRole: (roleOrAssignmentId: UserRole | string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  checkPermission: (
    action: PermissionAction,
    resource: BusinessResource,
    options?: {
      scope?: PermissionScope;
      resourceData?: ResourceRecord;
      condition?: (ctx: UserContext, data?: ResourceRecord) => boolean;
    }
  ) => boolean;
  hasCanonicalPermission: (permissionCode: string) => boolean;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function RoleProvider({
  children,
  initialRole = "CUSTOMER",
}: {
  children: React.ReactNode;
  initialRole?: UserRole;
}) {
  const [activeRole, setActiveRole] = useState<UserRole>(initialRole);
  const [activeScope, setActiveScope] = useState<PermissionScope | string>("OWN");
  const [roleAssignments, setRoleAssignments] = useState<RoleAssignment[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isPublicGuest, setIsPublicGuest] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [user, setUser] = useState<UserContext>(GUEST_USER_CONTEXT);

  // Load real authenticated user & authorization context from Laravel /auth/me
  const refreshUser = async () => {
    setIsLoadingAuth(true);
    try {
      const res = await authApi.me();
      if (res.data) {
        const u = res.data;
        
        // Parse roles and active role from backend Level 02 payload
        const rawRoles = (u.roles || []) as Array<{
          assignmentId: string;
          code: string;
          name?: string;
          scopeType: string;
          scopeId?: string | null;
          status: string;
        }>;

        const parsedAssignments: RoleAssignment[] = rawRoles.map((r) => ({
          assignmentId: r.assignmentId,
          code: (r.code as UserRole) || "CUSTOMER",
          name: r.name,
          scopeType: (r.scopeType as PermissionScope) || "OWN",
          scopeId: r.scopeId,
          status: (r.status as RoleAssignment["status"]) || "ACTIVE",
        }));

        setRoleAssignments(parsedAssignments);

        const activeCode = (u.activeRole?.code as UserRole) || "CUSTOMER";
        const activeScopeResolved = (u.activeRole?.scopeType as PermissionScope) || "OWN";
        const resolvedPermissions = (u.permissions as string[]) || [];

        setActiveRole(activeCode);
        setActiveScope(activeScopeResolved);
        setPermissions(resolvedPermissions);

        const availableRolesList: UserRole[] = parsedAssignments.length > 0
          ? Array.from(new Set(parsedAssignments.map((a) => a.code)))
          : [activeCode, "CUSTOMER"];

        const realProfile: UserContext = {
          id: u.id,
          name: u.fullName,
          email: u.email,
          phone: u.phone,
          status: u.status,
          activeRole: activeCode,
          availableRoles: availableRolesList,
          roleAssignments: parsedAssignments,
          activeAssignmentId: u.activeRole?.assignmentId,
          activeScope: activeScopeResolved,
          permissions: resolvedPermissions,
          employeeId: u.employeeId,
          department: u.department,
          organizationId:
            (u.activeOrganization?.id as string | undefined) ||
            (u.providerId as string | undefined),
          organizationName:
            (u.activeOrganization?.name as string | undefined) ||
            (u.workerProfile?.providerName as string | undefined) ||
            u.businessProfile?.businessData?.legalName ||
            u.department ||
            undefined,
          avatar: (u.profile?.avatar as string | undefined) || (u.personalProfile?.avatar as string | undefined) || undefined,
          avatarUrl: (u.profile?.avatar as string | undefined) || (u.personalProfile?.avatar as string | undefined) || "/brand/logo.png",
          emergencyContact: ((u as unknown as Record<string, unknown>).emergencyContact as { name?: string; phone?: string } | undefined) ?? null,
          emailVerified: u.emailVerified,
          phoneVerified: u.phoneVerified,
          createdAt: u.createdAt,
          nik: u.nik,
          ktpFilePath: u.ktpFilePath,
          providerId: (u.providerId as string | undefined) || (u.workerProfile?.providerId as string | undefined),
          workerProfile: u.workerProfile as UserContext["workerProfile"],
          businessProfile: u.businessProfile,
          documents: u.documents,
          personalProfile: (u.profile || u.personalProfile) as UserContext["personalProfile"],
          activeOrganization: (u.activeOrganization as UserContext["activeOrganization"]) ?? null,
          activeMembership: (u.activeMembership as UserContext["activeMembership"]) ?? null,
        };

        setUser(realProfile);
        setIsAuthenticated(true);
        setIsPublicGuest(false);

        if (typeof window !== "undefined") {
          try {
            document.cookie = `servio_active_role=${activeCode}; path=/; max-age=604800; SameSite=Lax`;
            document.cookie = "servio_guest=0; path=/; max-age=604800; SameSite=Lax";
          } catch {
            // ignore
          }
        }
      } else {
        setIsAuthenticated(false);
        setIsPublicGuest(true);
        setUser(GUEST_USER_CONTEXT);
        setActiveRole("CUSTOMER");
        setRoleAssignments([]);
        setPermissions([]);
      }
    } catch {
      // If temporary network fail but cookies exist, retain session state
      const token = getCookie("servio_token") || getCookie("servio_session");
      const cookieRole = getCookie("servio_active_role") as UserRole | undefined;
      if (token && cookieRole) {
        setActiveRole(cookieRole);
        setIsAuthenticated(true);
        setIsPublicGuest(false);
      } else {
        setIsAuthenticated(false);
        setIsPublicGuest(true);
        setUser(GUEST_USER_CONTEXT);
        setActiveRole("CUSTOMER");
        setRoleAssignments([]);
        setPermissions([]);
      }
    } finally {
      setIsLoadingAuth(false);
    }
  };

  useEffect(() => {
    // Eagerly restore session from cookies upon mount to prevent flash of guest navbar
    if (typeof window !== "undefined") {
      const cookieRole = getCookie("servio_active_role") as UserRole | undefined;
      const guestVal = getCookie("servio_guest");
      const token = getCookie("servio_token") || getCookie("servio_session");

      if (cookieRole && (token || guestVal === "0")) {
        setActiveRole(cookieRole);
        setIsPublicGuest(false);
        setIsAuthenticated(true);
      }
    }
    refreshUser();
  }, []);

  const handleSetIsPublicGuest = (isGuest: boolean) => {
    setIsPublicGuest(isGuest);
    if (typeof window !== "undefined") {
      try {
        document.cookie = `servio_guest=${isGuest ? "1" : "0"}; path=/; max-age=31536000; SameSite=Lax`;
      } catch {
        // Safe fallback
      }
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // safe fallback
    } finally {
      setIsAuthenticated(false);
      setIsPublicGuest(true);
      setUser(GUEST_USER_CONTEXT);
      setActiveRole("CUSTOMER");
      setActiveScope("OWN");
      setRoleAssignments([]);
      setPermissions([]);
      if (typeof window !== "undefined") {
        try {
          document.cookie = "servio_guest=1; path=/; max-age=31536000; SameSite=Lax";
          document.cookie = "servio_active_role=; path=/; max-age=0; SameSite=Lax";
          document.cookie = "servio_token=; path=/; max-age=0; SameSite=Lax";
          document.cookie = "servio_session=; path=/; max-age=0; SameSite=Lax";
        } catch {
          // ignore
        }
        window.location.href = "/";
      }
    }
  };

  // Switch role context with backend synchronization (Section 32)
  const switchRole = async (roleOrAssignmentId: UserRole | string) => {
    // Match either by assignmentId or by role code
    const targetAssignment = roleAssignments.find(
      (a) => a.assignmentId === roleOrAssignmentId || a.code === roleOrAssignmentId
    );

    const targetRoleCode: UserRole = targetAssignment ? targetAssignment.code : (roleOrAssignmentId as UserRole);

    try {
      if (targetAssignment?.assignmentId && isAuthenticated) {
        const res = await authApi.switchContext(targetAssignment.assignmentId);
        if (res.data?.permissions) {
          setPermissions(res.data.permissions);
        }
        if (res.data?.activeRole?.scopeType) {
          setActiveScope(res.data.activeRole.scopeType as PermissionScope);
        }
      }
    } catch {
      // Safe fallback for UI responsiveness
    }

    setActiveRole(targetRoleCode);
    setUser((prev) => ({
      ...prev,
      activeRole: targetRoleCode,
      activeAssignmentId: targetAssignment?.assignmentId,
    }));

    if (typeof window !== "undefined") {
      try {
        document.cookie = `servio_active_role=${targetRoleCode}; path=/; max-age=31536000; SameSite=Lax`;
      } catch {
        // Safe fallback
      }
    }
  };

  // Direct check for backend canonical permission code (e.g. 'service.booking.create')
  const hasCanonicalPermission = (permissionCode: string): boolean => {
    if (isPublicGuest) {
      return permissionCode === "service.discovery.read";
    }
    return permissions.includes(permissionCode);
  };

  // High-level permission evaluator combining frontend rules + backend context
  const checkPermission = (
    action: PermissionAction,
    resource: BusinessResource,
    options?: {
      scope?: PermissionScope;
      resourceData?: ResourceRecord;
      condition?: (ctx: UserContext, data?: ResourceRecord) => boolean;
    }
  ) => {
    if (isPublicGuest) {
      return resource === "DISCOVERY" && action === "VIEW";
    }
    return evaluatePermission(user, action, resource, options);
  };

  return (
    <RoleContext.Provider
      value={{
        user,
        roleAssignments,
        activeRole,
        activeScope,
        permissions,
        isPublicGuest,
        isAuthenticated,
        isLoadingAuth,
        setIsPublicGuest: handleSetIsPublicGuest,
        switchRole,
        logout: handleLogout,
        refreshUser,
        checkPermission,
        hasCanonicalPermission,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useActiveRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useActiveRole must be used within a RoleProvider");
  }
  return context;
}

export function usePermission(
  action: PermissionAction,
  resource: BusinessResource,
  options?: {
    scope?: PermissionScope;
    resourceData?: ResourceRecord;
    condition?: (ctx: UserContext, data?: ResourceRecord) => boolean;
  }
) {
  const { checkPermission } = useActiveRole();
  return checkPermission(action, resource, options);
}
