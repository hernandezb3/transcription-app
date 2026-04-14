"use client";

import { useCallback, useEffect, useState, type DragEvent, type FormEvent } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type Group = { id: number; name: string; code: string; description: string | null; group_type: string; parent_group_id: number | null; status: string; created_at: string; updated_at: string };
type User = { id: number; unique_id: string | null; user_email: string | null; user_name: string | null; first_name: string | null; last_name: string | null; display_name: string | null; active: number; created: string; modified: string };
type UserGroup = { id: number; user_id: number; group_id: number; membership_status: string; membership_type: string; joined_at: string };
type Role = { id: number; code: string; name: string; description: string | null; assignment_level: string; status: string };
type GroupRole = { id: number; group_id: number; role_id: number; assigned_by_user_id: number | null; assignment_reason: string | null; assigned_at: string; expires_at: string | null; status: string };
type Paginated<T> = { items: T[]; page: number; limit: number; total: number; total_pages: number };

/* ------------------------------------------------------------------ */
/*  Tiny inline icons                                                  */
/* ------------------------------------------------------------------ */
const PlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>);
const XIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>);
const GripIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 shrink-0 text-current opacity-40" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>);

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */
export default function GroupsPage() {
  const [error, setError] = useState<string | null>(null);

  /* Groups */
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  /* Group form */
  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [groupEditing, setGroupEditing] = useState<Group | null>(null);
  const [groupSaving, setGroupSaving] = useState(false);
  const [gfName, setGfName] = useState("");
  const [gfCode, setGfCode] = useState("");
  const [gfDesc, setGfDesc] = useState("");
  const [gfType, setGfType] = useState("standard");
  const [gfParent, setGfParent] = useState<number | "">("");
  const [gfStatus, setGfStatus] = useState("active");

  /* Group delete */
  const [groupDeleteTarget, setGroupDeleteTarget] = useState<Group | null>(null);
  const [groupDeleting, setGroupDeleting] = useState(false);

  /* Members */
  const [members, setMembers] = useState<(UserGroup & { user?: User })[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  /* All users (for adding members) */
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [memberSearch, setMemberSearch] = useState("");

  /* Add member modal */
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [amSearch, setAmSearch] = useState("");

  /* Roles (for role assignment) */
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [groupRoles, setGroupRoles] = useState<GroupRole[]>([]);
  const [grLoading, setGrLoading] = useState(false);
  const [draggingRoleId, setDraggingRoleId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<"assigned" | "available" | null>(null);

  /* Active detail tab */
  const [detailTab, setDetailTab] = useState<"members" | "roles">("members");

  /* ================================================================ */
  /*  Data loaders                                                     */
  /* ================================================================ */
  const loadGroups = useCallback(async () => {
    setGroupsLoading(true);
    try {
      const res = await fetch("/api/groups?page=1&limit=200");
      if (!res.ok) throw new Error();
      const data: Paginated<Group> = await res.json();
      setGroups(data.items ?? []);
    } catch { setError("Could not load groups."); }
    finally { setGroupsLoading(false); }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/users?page=1&limit=500");
      if (!res.ok) throw new Error();
      const data: Paginated<User> = await res.json();
      setAllUsers(data.items ?? []);
    } catch { setError("Could not load users."); }
    finally { setUsersLoading(false); }
  }, []);

  const loadRoles = useCallback(async () => {
    setRolesLoading(true);
    try {
      const res = await fetch("/api/roles?page=1&limit=200");
      if (!res.ok) throw new Error();
      const data: Paginated<Role> = await res.json();
      setAllRoles(data.items ?? []);
    } catch { setError("Could not load roles."); }
    finally { setRolesLoading(false); }
  }, []);

  const loadMembers = useCallback(async (groupId: number) => {
    setMembersLoading(true);
    try {
      const res = await fetch(`/api/user-groups/by-group/${groupId}?limit=500`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMembers(data.items ?? []);
    } catch { setError("Could not load members."); }
    finally { setMembersLoading(false); }
  }, []);

  const loadGroupRoles = useCallback(async (groupId: number) => {
    setGrLoading(true);
    try {
      const res = await fetch(`/api/group-roles/by-group/${groupId}?limit=200`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setGroupRoles(data.items ?? []);
    } catch { setError("Could not load group roles."); }
    finally { setGrLoading(false); }
  }, []);

  useEffect(() => { loadGroups(); loadUsers(); loadRoles(); }, [loadGroups, loadUsers, loadRoles]);

  useEffect(() => {
    if (selectedGroup) {
      loadMembers(selectedGroup.id);
      loadGroupRoles(selectedGroup.id);
    } else {
      setMembers([]);
      setGroupRoles([]);
    }
  }, [selectedGroup, loadMembers, loadGroupRoles]);

  /* Auto-select first group */
  useEffect(() => {
    if (!groupsLoading && groups.length > 0 && !selectedGroup) setSelectedGroup(groups[0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupsLoading, groups]);

  /* ================================================================ */
  /*  Derived data                                                     */
  /* ================================================================ */
  const memberUserIds = new Set(members.map((m) => m.user_id));
  const userLookup = new Map(allUsers.map((u) => [u.id, u]));
  const assignedRoleIds = new Set(groupRoles.map((gr) => gr.role_id));
  const filteredMembers = members.filter((m) => {
    if (!memberSearch) return true;
    const u = userLookup.get(m.user_id);
    if (!u) return false;
    const q = memberSearch.toLowerCase();
    return (u.user_name ?? "").toLowerCase().includes(q) || (u.user_email ?? "").toLowerCase().includes(q) || (u.display_name ?? "").toLowerCase().includes(q);
  });
  const nonMemberUsers = allUsers.filter((u) => u.active === 1 && !memberUserIds.has(u.id));
  const filteredNonMembers = nonMemberUsers.filter((u) => {
    if (!amSearch) return true;
    const q = amSearch.toLowerCase();
    return (u.user_name ?? "").toLowerCase().includes(q) || (u.user_email ?? "").toLowerCase().includes(q) || (u.display_name ?? "").toLowerCase().includes(q);
  });
  const assignedRoles = allRoles.filter((r) => assignedRoleIds.has(r.id));
  const availableRoles = allRoles.filter((r) => !assignedRoleIds.has(r.id) && r.status === "active");

  /* ================================================================ */
  /*  Group CRUD                                                       */
  /* ================================================================ */
  const openAddGroup = () => { setGroupEditing(null); setGfName(""); setGfCode(""); setGfDesc(""); setGfType("standard"); setGfParent(""); setGfStatus("active"); setGroupFormOpen(true); };
  const openEditGroup = (g: Group) => { setGroupEditing(g); setGfName(g.name); setGfCode(g.code); setGfDesc(g.description ?? ""); setGfType(g.group_type); setGfParent(g.parent_group_id ?? ""); setGfStatus(g.status); setGroupFormOpen(true); };

  const handleSaveGroup = async (e: FormEvent) => {
    e.preventDefault(); setGroupSaving(true); setError(null);
    const body = { name: gfName.trim(), code: gfCode.trim(), description: gfDesc.trim() || null, group_type: gfType, parent_group_id: gfParent || null, status: gfStatus };
    try {
      const url = groupEditing ? `/api/groups/${groupEditing.id}` : "/api/groups";
      const method = groupEditing ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error("Save failed");
      setGroupFormOpen(false);
      await loadGroups();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Save failed"); }
    finally { setGroupSaving(false); }
  };

  const handleDeleteGroup = async () => {
    if (!groupDeleteTarget) return;
    setGroupDeleting(true); setError(null);
    try {
      const res = await fetch(`/api/groups/${groupDeleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete group.");
      if (selectedGroup?.id === groupDeleteTarget.id) setSelectedGroup(null);
      setGroupDeleteTarget(null);
      await loadGroups();
    } catch (err) { setError(err instanceof Error ? err.message : "Delete failed"); }
    finally { setGroupDeleting(false); }
  };

  /* ================================================================ */
  /*  Member management                                                */
  /* ================================================================ */
  const addMember = async (userId: number) => {
    if (!selectedGroup) return;
    try {
      const res = await fetch("/api/user-groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: userId, group_id: selectedGroup.id, membership_status: "active", membership_type: "standard" }) });
      if (!res.ok) throw new Error("Failed to add member.");
      await loadMembers(selectedGroup.id);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to add member."); }
  };

  const removeMember = async (membershipId: number) => {
    if (!selectedGroup) return;
    try {
      const res = await fetch(`/api/user-groups/${membershipId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove member.");
      await loadMembers(selectedGroup.id);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to remove member."); }
  };

  /* ================================================================ */
  /*  Group-Role assignment (drag-and-drop)                            */
  /* ================================================================ */
  const assignRole = async (roleId: number) => {
    if (!selectedGroup) return;
    const tempId = -(Date.now() + Math.round(Math.random() * 1000));
    setGroupRoles((prev) => [...prev, { id: tempId, group_id: selectedGroup.id, role_id: roleId, assigned_by_user_id: null, assignment_reason: null, assigned_at: new Date().toISOString(), expires_at: null, status: "active" }]);
    try {
      const res = await fetch("/api/group-roles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ group_id: selectedGroup.id, role_id: roleId, status: "active" }) });
      if (!res.ok) throw new Error("Failed to assign role.");
      await loadGroupRoles(selectedGroup.id);
    } catch (err) {
      setGroupRoles((prev) => prev.filter((gr) => gr.id !== tempId));
      setError(err instanceof Error ? err.message : "Failed to assign role.");
    }
  };

  const unassignRole = async (roleId: number) => {
    if (!selectedGroup) return;
    const link = groupRoles.find((gr) => gr.role_id === roleId);
    if (!link) return;
    setGroupRoles((prev) => prev.filter((gr) => gr.id !== link.id));
    if (link.id < 0) return;
    try {
      const res = await fetch(`/api/group-roles/${link.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove role.");
    } catch (err) {
      setGroupRoles((prev) => [...prev, link]);
      setError(err instanceof Error ? err.message : "Failed to remove role.");
    }
  };

  /* Drag handlers */
  const onDragStart = (e: DragEvent, id: number) => { e.dataTransfer.setData("text/plain", String(id)); e.dataTransfer.effectAllowed = "move"; setDraggingRoleId(id); };
  const onDragEnd = () => { setDraggingRoleId(null); setDropTarget(null); };
  const onDragOverAssigned = (e: DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDropTarget("assigned"); };
  const onDragOverAvailable = (e: DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDropTarget("available"); };
  const onDragLeave = () => setDropTarget(null);
  const onDropAssigned = async (e: DragEvent) => { e.preventDefault(); setDropTarget(null); const id = Number(e.dataTransfer.getData("text/plain")); if (!assignedRoleIds.has(id)) await assignRole(id); setDraggingRoleId(null); };
  const onDropAvailable = async (e: DragEvent) => { e.preventDefault(); setDropTarget(null); const id = Number(e.dataTransfer.getData("text/plain")); if (assignedRoleIds.has(id)) await unassignRole(id); setDraggingRoleId(null); };

  const RoleChip = ({ role, variant, onAction }: { role: Role; variant: "assigned" | "available"; onAction: () => void }) => (
    <div draggable onDragStart={(e) => onDragStart(e, role.id)} onDragEnd={onDragEnd}
      className={`group/chip flex cursor-grab items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all active:cursor-grabbing ${draggingRoleId === role.id ? "opacity-50" : ""} ${
        variant === "assigned" ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300" : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
      }`}>
      <GripIcon /><span>{role.name}</span>
      <button type="button" onClick={(e) => { e.stopPropagation(); onAction(); }}
        className={`cursor-pointer rounded p-0.5 opacity-0 transition-opacity group-hover/chip:opacity-100 ${variant === "assigned" ? "hover:text-rose-500" : "hover:text-sky-500"}`}
        title={variant === "assigned" ? "Remove" : "Assign"}>
        {variant === "assigned" ? <XIcon /> : <PlusIcon />}
      </button>
    </div>
  );

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */
  return (
    <section className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      {error && <p className="shrink-0 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex min-h-0 flex-1 gap-4">
        {/* LEFT – Groups list */}
        <div className="flex w-72 shrink-0 flex-col rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h3 className="text-sm font-semibold">Groups</h3>
          </div>

          {groupsLoading ? (
            <div className="animate-pulse space-y-2 p-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 rounded-md bg-zinc-100 dark:bg-zinc-800" />)}</div>
          ) : groups.length === 0 ? (
            <p className="p-4 text-center text-sm text-zinc-400">No groups yet.</p>
          ) : (
            <div className="flex-1 overflow-y-auto p-2 [scrollbar-width:thin]">
              {groups.map((group) => {
                const isActive = selectedGroup?.id === group.id;
                return (
                  <div key={group.id} onClick={() => setSelectedGroup(isActive ? null : group)}
                    className={`group/item mb-1 flex cursor-pointer items-center justify-between rounded-md px-3 py-2.5 text-sm transition-colors ${
                      isActive ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/30" : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800/60"
                    }`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{group.name}</span>
                        <span className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-medium capitalize leading-none ${group.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"}`}>{group.status}</span>
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-zinc-400">{group.code} · {group.group_type}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/item:opacity-100">
                      <button type="button" onClick={(e) => { e.stopPropagation(); openEditGroup(group); }} className="cursor-pointer rounded p-1 text-zinc-300 hover:text-sky-500 dark:text-zinc-600 dark:hover:text-sky-400">✏️</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setGroupDeleteTarget(group); }} className="cursor-pointer rounded p-1 text-zinc-300 hover:text-rose-500 dark:text-zinc-600 dark:hover:text-rose-400">🗑️</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!groupsLoading && (
            <div className="px-2 pb-1">
              <button type="button" onClick={openAddGroup}
                className="flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-zinc-300 px-3 py-3 text-zinc-400 transition-all hover:border-sky-400 hover:bg-sky-50/50 hover:text-sky-600 dark:border-zinc-700 dark:text-zinc-500 dark:hover:border-sky-500 dark:hover:bg-sky-500/5 dark:hover:text-sky-400">
                <PlusIcon /><span className="text-xs font-medium">New Group</span>
              </button>
            </div>
          )}
          <div className="border-t border-zinc-200 dark:border-zinc-800" />
        </div>

        {/* RIGHT – Detail pane */}
        {!selectedGroup ? (
          <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Select a group to manage</p>
              <p className="mt-1 text-xs text-zinc-400">Click a group on the left to view members and assigned roles</p>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            {/* Detail tabs */}
            <div className="mb-3 flex items-center gap-6 border-b border-zinc-200 dark:border-zinc-800">
              {(["members", "roles"] as const).map((tab) => (
                <button key={tab} type="button" onClick={() => setDetailTab(tab)}
                  className={`cursor-pointer border-b-2 px-1 pb-2 text-sm font-medium capitalize transition-colors ${detailTab === tab ? "border-sky-500 text-sky-700 dark:text-sky-300" : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"}`}>
                  {tab === "members" ? `Members (${members.length})` : `Roles (${assignedRoles.length})`}
                </button>
              ))}
            </div>

            {/* MEMBERS tab */}
            {detailTab === "members" && (
              <div className="flex min-h-0 flex-1 flex-col rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
                  <input type="search" placeholder="Search members…" value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)}
                    className="flex-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs placeholder:text-zinc-400 focus:border-sky-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
                  <button type="button" onClick={() => { setAmSearch(""); setAddMemberOpen(true); }}
                    className="flex cursor-pointer items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700">
                    <PlusIcon /> Add Member
                  </button>
                </div>

                {membersLoading || usersLoading ? (
                  <div className="flex flex-1 items-center justify-center"><div className="animate-pulse text-sm text-zinc-400">Loading…</div></div>
                ) : filteredMembers.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center"><p className="text-sm text-zinc-400">{memberSearch ? "No matching members." : "No members in this group."}</p></div>
                ) : (
                  <div className="flex-1 overflow-y-auto [scrollbar-width:thin]">
                    <table className="min-w-full text-sm">
                      <thead className="sticky top-0 z-10 bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500 dark:bg-zinc-800/80 dark:text-zinc-400">
                        <tr>
                          <th className="px-4 py-2 font-medium">User</th>
                          <th className="px-4 py-2 font-medium">Email</th>
                          <th className="px-4 py-2 font-medium">Type</th>
                          <th className="px-4 py-2 font-medium">Status</th>
                          <th className="w-16 px-4 py-2" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                        {filteredMembers.map((m) => {
                          const u = userLookup.get(m.user_id);
                          return (
                            <tr key={m.id} className="group/row hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                              <td className="px-4 py-2 font-medium text-zinc-800 dark:text-zinc-200">{u?.display_name || u?.user_name || `User #${m.user_id}`}</td>
                              <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">{u?.user_email ?? "—"}</td>
                              <td className="px-4 py-2 capitalize text-zinc-500">{m.membership_type}</td>
                              <td className="px-4 py-2"><span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${m.membership_status === "active" ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400" : "bg-zinc-100 text-zinc-500"}`}>{m.membership_status}</span></td>
                              <td className="px-4 py-2 text-right">
                                <button type="button" onClick={() => removeMember(m.id)} title="Remove"
                                  className="cursor-pointer rounded p-1 text-zinc-300 opacity-0 transition-all hover:text-rose-500 group-hover/row:opacity-100 dark:text-zinc-600 dark:hover:text-rose-400">🗑️</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ROLES tab */}
            {detailTab === "roles" && (
              <div className="flex min-h-0 flex-1 gap-3">
                {grLoading || rolesLoading ? (
                  <div className="flex flex-1 items-center justify-center"><div className="animate-pulse text-sm text-zinc-400">Loading…</div></div>
                ) : (
                  <>
                    {/* Assigned roles */}
                    <div className={`flex min-h-0 flex-1 flex-col rounded-md border-2 transition-colors ${dropTarget === "assigned" ? "border-sky-400 bg-sky-50/50 dark:border-sky-500 dark:bg-sky-500/5" : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"}`}
                      onDragOver={onDragOverAssigned} onDragLeave={onDragLeave} onDrop={onDropAssigned}>
                      <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
                        <div className="h-2 w-2 rounded-full bg-sky-500" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Assigned Roles</span>
                        <span className="text-[11px] text-zinc-400">{assignedRoles.length}</span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-3 [scrollbar-width:thin]">
                        {assignedRoles.length === 0 ? (
                          <div className="flex h-full items-center justify-center"><p className="text-center text-sm text-zinc-400">Drag roles here to assign</p></div>
                        ) : (
                          <div className="flex flex-wrap gap-2">{assignedRoles.map((r) => <RoleChip key={r.id} role={r} variant="assigned" onAction={() => unassignRole(r.id)} />)}</div>
                        )}
                      </div>
                    </div>

                    {/* Available roles */}
                    <div className={`flex min-h-0 flex-1 flex-col rounded-md border-2 transition-colors ${dropTarget === "available" ? "border-amber-400 bg-amber-50/50 dark:border-amber-500 dark:bg-amber-500/5" : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"}`}
                      onDragOver={onDragOverAvailable} onDragLeave={onDragLeave} onDrop={onDropAvailable}>
                      <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
                        <div className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Available Roles</span>
                        <span className="text-[11px] text-zinc-400">{availableRoles.length}</span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-3 [scrollbar-width:thin]">
                        {availableRoles.length === 0 ? (
                          <div className="flex h-full items-center justify-center"><p className="text-center text-sm text-zinc-400">All roles assigned</p></div>
                        ) : (
                          <div className="flex flex-wrap gap-2">{availableRoles.map((r) => <RoleChip key={r.id} role={r} variant="available" onAction={() => assignRole(r.id)} />)}</div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Group form modal ── */}
      {groupFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-xl dark:bg-zinc-900">
            <div className="relative bg-gradient-to-r from-sky-600 to-cyan-600 px-5 py-3">
              <h3 className="text-center text-lg font-semibold text-white">{groupEditing ? "Edit Group" : "New Group"}</h3>
              <button type="button" onClick={() => setGroupFormOpen(false)} className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/35 bg-white/15 text-sm text-white/95 hover:bg-white/25">✕</button>
            </div>
            <form onSubmit={handleSaveGroup} className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">Name *</span><input required type="text" value={gfName} onChange={(e) => setGfName(e.target.value)} className="w-full rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200" /></label>
                <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">Code *</span><input required type="text" value={gfCode} onChange={(e) => setGfCode(e.target.value)} className="w-full rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200" /></label>
              </div>
              <label className="block space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">Description</span><input type="text" value={gfDesc} onChange={(e) => setGfDesc(e.target.value)} className="w-full rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200" /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">Type</span><select value={gfType} onChange={(e) => setGfType(e.target.value)} className="w-full cursor-pointer rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"><option value="standard">Standard</option><option value="department">Department</option><option value="team">Team</option><option value="project">Project</option></select></label>
                <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">Parent Group</span>
                  <select value={gfParent} onChange={(e) => setGfParent(e.target.value === "" ? "" : Number(e.target.value))} className="w-full cursor-pointer rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                    <option value="">— None —</option>
                    {groups.filter((g) => g.id !== groupEditing?.id).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </label>
              </div>
              <label className="block space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">Status</span><select value={gfStatus} onChange={(e) => setGfStatus(e.target.value)} className="w-full cursor-pointer rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setGroupFormOpen(false)} className="cursor-pointer rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">Cancel</button>
                <button type="submit" disabled={groupSaving} className="cursor-pointer rounded bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60">{groupSaving ? "Saving…" : groupEditing ? "Update" : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Group delete confirm ── */}
      {groupDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl dark:bg-zinc-900">
            <div className="bg-gradient-to-r from-rose-600 to-pink-600 px-5 py-3"><h3 className="text-center text-lg font-semibold text-white">Delete Group?</h3></div>
            <div className="p-5 text-center">
              <p className="text-sm text-zinc-600 dark:text-zinc-300">This will permanently remove <strong className="text-zinc-800 dark:text-zinc-200">{groupDeleteTarget.name}</strong> and all its membership / role data.</p>
              <div className="mt-5 flex justify-center gap-2">
                <button type="button" onClick={() => setGroupDeleteTarget(null)} className="cursor-pointer rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">Cancel</button>
                <button type="button" onClick={handleDeleteGroup} disabled={groupDeleting} className="cursor-pointer rounded bg-rose-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-60">{groupDeleting ? "Deleting…" : "Delete"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add member modal ── */}
      {addMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-zinc-900" style={{ maxHeight: "70vh" }}>
            <div className="relative bg-gradient-to-r from-sky-600 to-cyan-600 px-5 py-3">
              <h3 className="text-center text-lg font-semibold text-white">Add Members to {selectedGroup?.name}</h3>
              <button type="button" onClick={() => setAddMemberOpen(false)} className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/35 bg-white/15 text-sm text-white/95 hover:bg-white/25">✕</button>
            </div>
            <div className="border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
              <input type="search" autoFocus placeholder="Search users…" value={amSearch} onChange={(e) => setAmSearch(e.target.value)}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-sky-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
            </div>
            <div className="flex-1 overflow-y-auto [scrollbar-width:thin]">
              {filteredNonMembers.length === 0 ? (
                <p className="p-6 text-center text-sm text-zinc-400">{amSearch ? "No matching users." : "All active users are already members."}</p>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredNonMembers.map((u) => (
                    <div key={u.id} className="flex items-center justify-between px-5 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                      <div>
                        <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{u.display_name || u.user_name}</div>
                        <div className="text-xs text-zinc-400">{u.user_email}</div>
                      </div>
                      <button type="button" onClick={() => addMember(u.id)}
                        className="flex cursor-pointer items-center gap-1 rounded-md bg-sky-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-sky-700">
                        <PlusIcon /> Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
