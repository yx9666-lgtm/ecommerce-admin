"use client";

import { usePermissions } from "@/hooks/use-permissions";

export function PermissionGuard({
  permission,
  children,
  fallback,
}: {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { can } = usePermissions();
  if (!can(permission)) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
          <p>Access Denied / 无权访问</p>
        </div>
      )
    );
  }
  return <>{children}</>;
}
