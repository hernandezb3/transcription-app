"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { settings } from "@/lib/settings";
import { useAuth } from "@/lib/auth-context";
import NotificationPanel from "@/app/components/notification-panel";

type AppShellProps = {
  children: React.ReactNode;
};

type NavLink = { label: string; href: string; requiredPermission?: string };
type NavGroup = { label: string; children: NavLink[] };
type NavEntry = NavLink | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

const navEntries: NavEntry[] = [
  {
    label: "Research",
    children: [
      { label: "Participants", href: "/participants", requiredPermission: "participants.read" },
    ],
  },
  {
    label: "Administration",
    children: [
      { label: "Lesson Subjects", href: "/metadata/lesson-subjects", requiredPermission: "settings.read" },
      { label: "Microphone Colors", href: "/metadata", requiredPermission: "settings.read" },
    ],
  },
  {
    label: "Security",
    children: [
      { label: "Roles & Permissions", href: "/admin", requiredPermission: "roles.read" },
    ],
  },
];

/* flat list used for breadcrumb / page-title resolution */
const allNavLinks: NavLink[] = navEntries.flatMap((e) =>
  isGroup(e) ? e.children : [e],
);

const appName = settings.app?.name ?? "Project Focus";
const defaultPageTitle = settings.app?.defaultPageTitle ?? "Landing Page";

export default function AppShell({ children }: AppShellProps) {
  const { user, logout, isLoading, hasPermission } = useAuth();

  /* ---- filter nav entries by the user's permissions ---- */
  const filteredNavEntries = navEntries
    .map((entry) => {
      if (isGroup(entry)) {
        const visibleChildren = entry.children.filter(
          (child) => !child.requiredPermission || hasPermission(child.requiredPermission),
        );
        return visibleChildren.length > 0 ? { ...entry, children: visibleChildren } : null;
      }
      return !entry.requiredPermission || hasPermission(entry.requiredPermission) ? entry : null;
    })
    .filter(Boolean) as NavEntry[];
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  /* ---- public routes that skip the shell ---- */
  const isPublicRoute = pathname === "/login" || pathname === "/register";

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const entry of filteredNavEntries) {
      if (isGroup(entry)) {
        initial[entry.label] =
          entry.label === "Research" ||
          entry.children.some((c) => pathname.startsWith(c.href));
      }
    }
    return initial;
  });
  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  useEffect(() => {
    if (!isLoading && !user && !isPublicRoute) {
      router.replace("/login");
    }
  }, [isLoading, user, isPublicRoute, router]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!profileMenuRef.current) {
        return;
      }

      if (!profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  // For /login and /register, render children without the shell
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // While restoring session, show a loading indicator
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  // Not logged in → don't render anything (redirect will kick in)
  if (!user) {
    return null;
  }

  /* ---- breadcrumb segments ---- */
  const breadcrumbs: { label: string; href?: string }[] = (() => {
    const direct = allNavLinks.find((item) => item.href === pathname);
    if (direct) return [{ label: direct.label }];

    if (pathname.startsWith("/transcriptions/")) {
      const segments = pathname.split("/").filter(Boolean);
      // segments: ["transcriptions", "<id>", "editor"?]
      const transcriptId = segments[1];

      if (segments.length >= 3 && segments[2] === "editor") {
        return [
          { label: "Participants", href: "/participants" },
          { label: `Transcript #${transcriptId}`, href: `/transcriptions/${transcriptId}` },
          { label: "Editor" },
        ];
      }

      return [
        { label: "Participants", href: "/participants" },
        { label: `Transcript #${transcriptId}` },
      ];
    }

    return [{ label: defaultPageTitle }];
  })();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="sticky top-0 z-30 h-16 bg-white dark:bg-zinc-900">
        <div className="flex h-full items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="cursor-pointer rounded-md p-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              aria-label={isSidebarOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={isSidebarOpen}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <Link href="/" aria-label="Go to dashboard home" className="inline-flex items-center">
              <Image
                src="/logo.png"
                alt="Project Focus logo"
                width={140}
                height={77}
                className="h-6 w-auto"
                priority
              />
            </Link>
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.label} className="flex items-center gap-2">
                <div className="text-sm text-zinc-400">&gt;</div>
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="text-base font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <h1 className="text-base font-semibold">{crumb.label}</h1>
                )}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <NotificationPanel />

            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                className="cursor-pointer rounded-full p-1 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                aria-label="Profile"
                aria-expanded={isProfileOpen}
                onClick={() => setIsProfileOpen((prev) => !prev)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-6 w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
                  />
                </svg>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-md border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                    {user.display_name || user.user_name}
                  </p>
                  {user.user_email && (
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {user.user_email}
                    </p>
                  )}
                  <hr className="my-2 border-zinc-200 dark:border-zinc-700" />
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      router.replace("/login");
                    }}
                    className="w-full cursor-pointer rounded-md px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <div className="sticky top-16 z-30 h-px bg-zinc-200/90 dark:bg-zinc-800/90" />

        <div className="relative flex min-h-0 flex-1">
        <div
          aria-hidden="true"
          className={`fixed inset-0 z-50 bg-black/35 backdrop-blur-[1px] transition-opacity duration-300 ease-out ${
            isSidebarOpen
              ? "pointer-events-auto cursor-pointer opacity-100"
              : "pointer-events-none opacity-0"
          }`}
          onClick={() => setIsSidebarOpen(false)}
        />

        <aside
          className={`fixed left-0 top-0 z-[60] h-screen w-72 border-r border-zinc-200 bg-white p-4 shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform dark:border-zinc-800 dark:bg-zinc-900 ${
            isSidebarOpen
              ? "translate-x-0 opacity-100"
              : "-translate-x-[102%] opacity-95"
          }`}
        >
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/" aria-label="Go to dashboard home" className="inline-flex items-center">
                <Image
                  src="/logo.png"
                  alt="Project Focus logo"
                  width={180}
                  height={99}
                  className="h-8 w-auto"
                  priority
                />
              </Link>
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                {appName}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="cursor-pointer rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              aria-label="Close navigation"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <nav className="space-y-1 text-sm">
            <Link
              href="/"
              className={`block cursor-pointer rounded-md px-3 py-2 transition-colors ${
                pathname === "/"
                  ? "bg-orange-50 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-400/30"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
              }`}
              onClick={() => setIsSidebarOpen(false)}
            >
              Home
            </Link>

            {filteredNavEntries.map((entry) => {
              if (isGroup(entry)) {
                const isOpen = !!openGroups[entry.label];
                const toggle = () => toggleGroup(entry.label);
                return (
                  <div key={entry.label}>
                    <button
                      type="button"
                      onClick={toggle}
                      className="flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                      <span className="text-xs font-semibold uppercase tracking-wider">
                        {entry.label}
                      </span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.17 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>

                    {isOpen && (
                      <div className="ml-3 space-y-0.5 border-l border-zinc-200 pl-3 dark:border-zinc-700">
                        {entry.children.map((child) => {
                          const isActive =
                            pathname === child.href ||
                            pathname.startsWith(child.href + "/");
                          return (
                            <Link
                              key={child.label}
                              href={child.href}
                              className={`block cursor-pointer rounded-md px-3 py-1.5 transition-colors ${
                                isActive
                                  ? "bg-orange-50 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-400/30"
                                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                              }`}
                              onClick={() => setIsSidebarOpen(false)}
                            >
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              /* standalone link */
              const isActive =
                pathname === entry.href ||
                pathname.startsWith(entry.href + "/");
              return (
                <Link
                  key={entry.label}
                  href={entry.href}
                  className={`block cursor-pointer rounded-md px-3 py-2 transition-colors ${
                    isActive
                      ? "bg-orange-50 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-400/30"
                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  }`}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  {entry.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
