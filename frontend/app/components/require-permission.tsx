"use client";

import { useAuth } from "@/lib/auth-context";

type Props = {
  /** The permission code required to view the page (e.g. "roles.read"). */
  permission: string;
  children: React.ReactNode;
};

/**
 * Wraps a page's content and only renders it if the current user
 * holds the required permission. Shows an access-denied message otherwise.
 */
export default function RequirePermission({ permission, children }: Props) {
  const { hasPermission, isLoading, permissions } = useAuth();

  // While loading or permissions haven't arrived yet, show nothing
  if (isLoading || (permissions.length === 0)) {
    return null;
  }

  if (!hasPermission(permission)) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-12 w-12 text-zinc-300 dark:text-zinc-600"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
          />
        </svg>
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
          Access Denied
        </h2>
        <p className="max-w-md text-sm text-zinc-500 dark:text-zinc-400">
          You don&apos;t have permission to view this page. Contact an
          administrator if you believe this is a mistake.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
