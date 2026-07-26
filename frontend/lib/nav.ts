/**
 * Sidebar navigation model.
 *
 * The nav entries and the permission-based filter live here (rather than inline
 * in <AppShell>) so the gating logic is a pure function we can unit-test — this
 * repo's vitest runs in a plain Node env with no DOM harness.
 */

export type NavLink = { label: string; href: string; requiredPermission?: string };
export type NavGroup = { label: string; children: NavLink[] };
export type NavEntry = NavLink | NavGroup;

export function isGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

export const navEntries: NavEntry[] = [
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
      { label: "Users", href: "/users", requiredPermission: "users.read" },
      { label: "Roles & Permissions", href: "/admin", requiredPermission: "roles.read" },
    ],
  },
];

/* flat list used for breadcrumb / page-title resolution */
export const allNavLinks: NavLink[] = navEntries.flatMap((e) =>
  isGroup(e) ? e.children : [e],
);

/**
 * Filter nav entries down to what the current user may see.
 * A link is kept when it has no required permission or the user holds it;
 * a group is kept only if at least one of its children survives.
 */
export function filterNavEntries(
  entries: NavEntry[],
  hasPermission: (permission: string) => boolean,
): NavEntry[] {
  return entries
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
}
