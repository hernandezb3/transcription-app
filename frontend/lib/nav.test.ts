import { describe, it, expect } from "vitest";

import {
  navEntries,
  isGroup,
  filterNavEntries,
  type NavGroup,
} from "./nav";

/** Grant only the listed permission codes. */
const granting =
  (...codes: string[]) =>
  (permission: string) =>
    codes.includes(permission);

const findGroup = (entries: ReturnType<typeof filterNavEntries>, label: string) =>
  entries.find((e): e is NavGroup => isGroup(e) && e.label === label);

describe("navEntries — Users under Security (#3320)", () => {
  it("has a Security group containing a Users link to /users", () => {
    const security = findGroup(navEntries, "Security");
    expect(security).toBeDefined();
    const users = security?.children.find((c) => c.href === "/users");
    expect(users).toBeDefined();
    expect(users?.label).toBe("Users");
  });

  it("gates the Users link on users.read", () => {
    const security = findGroup(navEntries, "Security");
    const users = security?.children.find((c) => c.href === "/users");
    expect(users?.requiredPermission).toBe("users.read");
  });
});

describe("filterNavEntries — permission gating", () => {
  it("shows Users under Security when the user holds users.read", () => {
    const filtered = filterNavEntries(navEntries, granting("users.read"));
    const security = findGroup(filtered, "Security");
    expect(security).toBeDefined();
    expect(security?.children.some((c) => c.href === "/users")).toBe(true);
  });

  it("hides the Users link when the user lacks users.read", () => {
    const filtered = filterNavEntries(navEntries, granting("roles.read"));
    const security = findGroup(filtered, "Security");
    // roles.read still surfaces Roles & Permissions, but Users must be gone.
    expect(security?.children.some((c) => c.href === "/users")).toBe(false);
    expect(security?.children.some((c) => c.href === "/admin")).toBe(true);
  });

  it("drops the whole Security group when no child permission is held", () => {
    const filtered = filterNavEntries(navEntries, granting());
    expect(findGroup(filtered, "Security")).toBeUndefined();
  });

  it("does not mutate the source navEntries", () => {
    const before = JSON.stringify(navEntries);
    filterNavEntries(navEntries, granting("users.read"));
    expect(JSON.stringify(navEntries)).toBe(before);
  });
});
