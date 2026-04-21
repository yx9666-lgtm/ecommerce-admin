"use client";

import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/permissions";

export function usePermissions() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "";
  const permissions = (session?.user as any)?.permissions || {};

  const can = (key: string): boolean => hasPermission(role, permissions, key);

  return { can, role, permissions };
}
