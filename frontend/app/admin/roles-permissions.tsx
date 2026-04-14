"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type Role = { id: number; code: string; name: string; description: string | null; assignment_level: string; status: string; created_at: string; updated_at: string };
type Permission = { id: number; code: string; resource: string; action: string; description: string | null; status: string; created_at: string; updated_at: string };
type RolePermission = { id: number; role_id: number; permission_id: number };
type Paginated<T> = { items: T[]; page: number; limit: number; total: number; total_pages: number };

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function RolesPermissionsPage() {
  const [error, setError] = useState<string | null>(null);

  /* Roles */
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  /* Role form */
  const [roleFormOpen, setRoleFormOpen] = useState(false);
  const [roleEditing, setRoleEditing] = useState<Role | null>(null);
  const [roleSaving, setRoleSaving] = useState(false);
  const [rfCode, setRfCode] = useState("");
  const [rfName, setRfName] = useState("");
  const [rfDesc, setRfDesc] = useState("");
  const [rfLevel, setRfLevel] = useState("both");
  const [rfStatus, setRfStatus] = useState("active");

  /* Role delete */
  const [roleDeleteTarget, setRoleDeleteTarget] = useState<Role | null>(null);
  const [roleDeleting, setRoleDeleting] = useState(false);

  /* Permissions */
  const [allPerms, setAllPerms] = useState<Permission[]>([]);
  const [permsLoading, setPermsLoading] = useState(true);

  /* Permission form */
  const [permFormOpen, setPermFormOpen] = useState(false);
  const [permEditing, setPermEditing] = useState<Permission | null>(null);
  const [permSaving, setPermSaving] = useState(false);
  const [pfCode, setPfCode] = useState("");
  const [pfResource, setPfResource] = useState("");
  const [pfAction, setPfAction] = useState("");
  const [pfDesc, setPfDesc] = useState("");
  const [pfStatus, setPfStatus] = useState("active");

  /* Permission delete */
  const [permDeleteTarget, setPermDeleteTarget] = useState<Permission | null>(null);
  const [permDeleting, setPermDeleting] = useState(false);

  /* Role-Permission links */
  const [rolePerms, setRolePerms] = useState<RolePermission[]>([]);
  const [rpLoading, setRpLoading] = useState(false);

  /* Drag state */
  const [draggingPermId, setDraggingPermId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<"assigned" | "available" | null>(null);

  /* Search */
  const [permSearch, setPermSearch] = useState("");

  /* ================================================================ */
  /*  Data loaders                                                     */
  /* ================================================================ */
  const loadRoles = useCallback(async () => {
    setRolesLoading(true);
    try {
      const res = await fetch("/api/roles?page=1&limit=200");
      if (!res.ok) throw new Error();
      const data: Paginated<Role> = await res.json();
      setRoles(data.items ?? []);
    } catch { setError("Could not load roles."); }
    finally { setRolesLoading(false); }
  }, []);

  const loadPerms = useCallback(async () => {
    setPermsLoading(true);
    try {
      const res = await fetch("/api/permissions?page=1&limit=500");
      if (!res.ok) throw new Error();
      const data: Paginated<Permission> = await res.json();
      setAllPerms(data.items ?? []);
    } catch { setError("Could not load permissions."); }
    finally { setPermsLoading(false); }
  }, []);

  const loadRolePerms = useCallback(async (roleId: number) => {
    setRpLoading(true);
    try {
      const res = await fetch(`/api/role-permissions/by-role/${roleId}?limit=500`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRolePerms(data.items ?? []);
    } catch { setError("Could not load role permissions."); }
    finally { setRpLoading(false); }
  }, []);

  useEffect(() => { loadRoles(); loadPerms(); }, [loadRoles, loadPerms]);
  useEffect(() => { if (selectedRole) loadRolePerms(selectedRole.id); else setRolePerms([]); }, [selectedRole, loadRolePerms]);

  const autoSelected = useRef(false);
  useEffect(() => {
    if (!rolesLoading && roles.length > 0 && !selectedRole && !autoSelected.current) {
      autoSelected.current = true;
      setSelectedRole(roles[0]);
    }
  }, [rolesLoading, roles, selectedRole]);

  /* ================================================================ */
  /*  Derived data                                                     */
  /* ================================================================ */
  const assignedPermIds = new Set(rolePerms.map((rp) => rp.permission_id));
  const activePerms = allPerms.filter((p) => p.status === "active");
  const matchesSearch = (p: Permission) => {
    if (!permSearch) return true;
    const q = permSearch.toLowerCase();
    return p.code.toLowerCase().includes(q) || p.resource.toLowerCase().includes(q) || p.action.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q);
  };
  const assignedPerms = activePerms.filter((p) => assignedPermIds.has(p.id) && matchesSearch(p));
  const availablePerms = activePerms.filter((p) => !assignedPermIds.has(p.id) && matchesSearch(p));
  const assignedByResource = assignedPerms.reduce<Record<string, Permission[]>>((acc, p) => { (acc[p.resource] ??= []).push(p); return acc; }, {});
  const availableByResource = availablePerms.reduce<Record<string, Permission[]>>((acc, p) => { (acc[p.resource] ??= []).push(p); return acc; }, {});

  /* ================================================================ */
  /*  Assign / Unassign                                                */
  /* ================================================================ */
  const assignPerm = async (permId: number) => {
    if (!selectedRole) return;
    const tempId = -(Date.now() + Math.round(Math.random() * 1000));
    setRolePerms((prev) => [...prev, { id: tempId, role_id: selectedRole.id, permission_id: permId }]);
    try {
      const res = await fetch("/api/role-permissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role_id: selectedRole.id, permission_id: permId }) });
      if (!res.ok) throw new Error("Failed to assign permission.");
      const json = await res.json();
      const created: RolePermission = (Array.isArray(json?.data) ? json.data[0] : json) ?? {};
      setRolePerms((prev) => prev.map((rp) => rp.id === tempId ? { id: created.id ?? tempId, role_id: created.role_id ?? selectedRole.id, permission_id: created.permission_id ?? permId } : rp));
    } catch (err) {
      setRolePerms((prev) => prev.filter((rp) => rp.id !== tempId));
      setError(err instanceof Error ? err.message : "Failed to assign permission.");
    }
  };

  const unassignPerm = async (permId: number) => {
    if (!selectedRole) return;
    const link = rolePerms.find((rp) => rp.permission_id === permId);
    if (!link) return;
    setRolePerms((prev) => prev.filter((rp) => rp.id !== link.id));
    if (link.id < 0) return;
    try {
      const res = await fetch(`/api/role-permissions/${link.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove permission.");
    } catch (err) {
      setRolePerms((prev) => [...prev, link]);
      setError(err instanceof Error ? err.message : "Failed to remove permission.");
    }
  };

  /* ================================================================ */
  /*  Drag & Drop                                                      */
  /* ================================================================ */
  const onDragStart = (e: DragEvent, permId: number) => { e.dataTransfer.setData("text/plain", String(permId)); e.dataTransfer.effectAllowed = "move"; setDraggingPermId(permId); };
  const onDragEnd = () => { setDraggingPermId(null); setDropTarget(null); };
  const onDragOverAssigned = (e: DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDropTarget("assigned"); };
  const onDragOverAvailable = (e: DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDropTarget("available"); };
  const onDragLeave = () => setDropTarget(null);
  const onDropAssigned = async (e: DragEvent) => { e.preventDefault(); setDropTarget(null); const permId = Number(e.dataTransfer.getData("text/plain")); if (!assignedPermIds.has(permId)) await assignPerm(permId); setDraggingPermId(null); };
  const onDropAvailable = async (e: DragEvent) => { e.preventDefault(); setDropTarget(null); const permId = Number(e.dataTransfer.getData("text/plain")); if (assignedPermIds.has(permId)) await unassignPerm(permId); setDraggingPermId(null); };

  /* ================================================================ */
  /*  Role CRUD                                                        */
  /* ================================================================ */
  const openAddRole = () => { setRoleEditing(null); setRfCode(""); setRfName(""); setRfDesc(""); setRfLevel("both"); setRfStatus("active"); setRoleFormOpen(true); };
  const openEditRole = (r: Role) => { setRoleEditing(r); setRfCode(r.code); setRfName(r.name); setRfDesc(r.description ?? ""); setRfLevel(r.assignment_level); setRfStatus(r.status); setRoleFormOpen(true); };

  const handleSaveRole = async (e: FormEvent) => {
    e.preventDefault(); setRoleSaving(true); setError(null);
    const body = { code: rfCode.trim(), name: rfName.trim(), description: rfDesc.trim() || null, assignment_level: rfLevel, status: rfStatus };
    try {
      const url = roleEditing ? `/api/roles/${roleEditing.id}` : "/api/roles";
      const method = roleEditing ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error("Save failed");
      setRoleFormOpen(false);
      await loadRoles();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Save failed"); }
    finally { setRoleSaving(false); }
  };

  const handleDeleteRole = async () => {
    if (!roleDeleteTarget) return;
    setRoleDeleting(true); setError(null);
    try {
      const res = await fetch(`/api/roles/${roleDeleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete role.");
      if (selectedRole?.id === roleDeleteTarget.id) setSelectedRole(null);
      setRoleDeleteTarget(null);
      await loadRoles();
    } catch (err) { setError(err instanceof Error ? err.message : "Delete failed"); }
    finally { setRoleDeleting(false); }
  };

  /* ================================================================ */
  /*  Permission CRUD                                                  */
  /* ================================================================ */
  const openAddPerm = () => { setPermEditing(null); setPfCode(""); setPfResource(""); setPfAction(""); setPfDesc(""); setPfStatus("active"); setPermFormOpen(true); };
  const openEditPerm = (p: Permission) => { setPermEditing(p); setPfCode(p.code); setPfResource(p.resource); setPfAction(p.action); setPfDesc(p.description ?? ""); setPfStatus(p.status); setPermFormOpen(true); };

  const handleSavePerm = async (e: FormEvent) => {
    e.preventDefault(); setPermSaving(true); setError(null);
    const body = { code: pfCode.trim(), resource: pfResource.trim(), action: pfAction.trim(), description: pfDesc.trim() || null, status: pfStatus };
    try {
      const url = permEditing ? `/api/permissions/${permEditing.id}` : "/api/permissions";
      const method = permEditing ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error("Save failed");
      setPermFormOpen(false);
      await loadPerms();
      if (selectedRole) await loadRolePerms(selectedRole.id);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Save failed"); }
    finally { setPermSaving(false); }
  };

  const handleDeletePerm = async () => {
    if (!permDeleteTarget) return;
    setPermDeleting(true); setError(null);
    try {
      const res = await fetch(`/api/permissions/${permDeleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete permission.");
      setPermDeleteTarget(null);
      await loadPerms();
      if (selectedRole) await loadRolePerms(selectedRole.id);
    } catch (err) { setError(err instanceof Error ? err.message : "Delete failed"); }
    finally { setPermDeleting(false); }
  };

  /* ================================================================ */
  /*  Render helpers                                                   */
  /* ================================================================ */
  const GripIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 shrink-0 text-current opacity-40" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>);
  const XIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>);
  const PlusSmIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>);

  const PermChip = ({ perm, variant, onRemove, onAssign }: { perm: Permission; variant: "assigned" | "available"; onRemove?: () => void; onAssign?: () => void }) => (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, perm.id)}
      onDragEnd={onDragEnd}
      className={`group/chip flex cursor-grab items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all active:cursor-grabbing ${
        draggingPermId === perm.id ? "opacity-50" : ""
      } ${variant === "assigned"
        ? "border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 hover:shadow-sm dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300"
        : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
      }`}
    >
      <GripIcon /><span>{perm.code}</span>
      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover/chip:opacity-100">
        {onAssign && <button type="button" onClick={(e) => { e.stopPropagation(); onAssign(); }} className="cursor-pointer rounded p-0.5 hover:text-sky-500" title="Assign"><PlusSmIcon /></button>}
        {variant === "available" && <button type="button" onClick={(e) => { e.stopPropagation(); openEditPerm(perm); }} className="cursor-pointer rounded p-0.5 hover:text-sky-500" title="Edit">✏️</button>}
        {variant === "available" && <button type="button" onClick={(e) => { e.stopPropagation(); setPermDeleteTarget(perm); }} className="cursor-pointer rounded p-0.5 hover:text-rose-500" title="Delete">🗑️</button>}
        {onRemove && <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} className="cursor-pointer rounded p-0.5 hover:text-rose-500" title="Remove"><XIcon /></button>}
      </div>
    </div>
  );

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */
  return (
    <section className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      {error && <p className="shrink-0 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex min-h-0 flex-1 gap-4">
        {/* LEFT – Roles list */}
        <div className="flex w-72 shrink-0 flex-col rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h3 className="text-sm font-semibold">Roles</h3>
          </div>

          {rolesLoading ? (
            <div className="animate-pulse space-y-2 p-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 rounded-md bg-zinc-100 dark:bg-zinc-800" />)}</div>
          ) : roles.length === 0 ? (
            <p className="p-4 text-center text-sm text-zinc-400">No roles yet.</p>
          ) : (
            <div className="flex-1 overflow-y-auto p-2 [scrollbar-width:thin]">
              {roles.map((role) => {
                const isActive = selectedRole?.id === role.id;
                return (
                  <div key={role.id} onClick={() => setSelectedRole(isActive ? null : role)}
                    className={`group/role mb-1 flex cursor-pointer items-center justify-between rounded-md px-3 py-2.5 text-sm transition-colors ${
                      isActive ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/30" : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800/60"
                    }`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{role.name}</span>
                        <span className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-medium capitalize leading-none ${role.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"}`}>{role.status}</span>
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-zinc-400">{role.code}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/role:opacity-100">
                      <button type="button" onClick={(e) => { e.stopPropagation(); openEditRole(role); }} className="cursor-pointer rounded p-1 text-zinc-300 hover:text-sky-500 dark:text-zinc-600 dark:hover:text-sky-400">✏️</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setRoleDeleteTarget(role); }} className="cursor-pointer rounded p-1 text-zinc-300 hover:text-rose-500 dark:text-zinc-600 dark:hover:text-rose-400">🗑️</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!rolesLoading && (
            <div className="px-2 pb-1">
              <button type="button" onClick={openAddRole}
                className="flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-zinc-300 px-3 py-3 text-zinc-400 transition-all hover:border-sky-400 hover:bg-sky-50/50 hover:text-sky-600 dark:border-zinc-700 dark:text-zinc-500 dark:hover:border-sky-500 dark:hover:bg-sky-500/5 dark:hover:text-sky-400">
                <PlusSmIcon /><span className="text-xs font-medium">New Role</span>
              </button>
            </div>
          )}
          <div className="border-t border-zinc-200 dark:border-zinc-800" />
        </div>

        {/* RIGHT – Permission manager */}
        {!selectedRole ? (
          <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Select a role to manage permissions</p>
              <p className="mt-1 text-xs text-zinc-400">Click a role on the left, then drag permissions to assign them</p>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            {rpLoading || permsLoading ? (
              <div className="flex flex-1 items-center justify-center"><div className="animate-pulse text-sm text-zinc-400">Loading permissions…</div></div>
            ) : (
              <div className="flex min-h-0 flex-1 gap-3">
                {/* ASSIGNED */}
                <div className={`flex min-h-0 flex-1 flex-col rounded-md border-2 transition-colors ${dropTarget === "assigned" ? "border-sky-400 bg-sky-50/50 dark:border-sky-500 dark:bg-sky-500/5" : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"}`}
                  onDragOver={onDragOverAssigned} onDragLeave={onDragLeave} onDrop={onDropAssigned}>
                  <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
                    <div className="h-2 w-2 rounded-full bg-sky-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Assigned</span>
                    <span className="text-[11px] text-zinc-400">{assignedPerms.length}</span>
                    <div className="flex-1" />
                    <input type="search" placeholder="Filter…" value={permSearch} onChange={(e) => setPermSearch(e.target.value)}
                      className="w-36 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs placeholder:text-zinc-400 focus:border-sky-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 [scrollbar-width:thin]">
                    {assignedPerms.length === 0 ? (
                      <div className="flex h-full items-center justify-center"><p className="text-center text-sm text-zinc-400">{permSearch ? "No matches" : "Drag permissions here to assign"}</p></div>
                    ) : Object.entries(assignedByResource).sort(([a], [b]) => a.localeCompare(b)).map(([resource, perms]) => (
                      <div key={resource} className="mb-3">
                        <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{resource}</div>
                        <div className="flex flex-wrap gap-1.5 px-1">{perms.map((perm) => <PermChip key={perm.id} perm={perm} variant="assigned" onRemove={() => unassignPerm(perm.id)} />)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AVAILABLE */}
                <div className={`flex min-h-0 flex-1 flex-col rounded-md border-2 transition-colors ${dropTarget === "available" ? "border-amber-400 bg-amber-50/50 dark:border-amber-500 dark:bg-amber-500/5" : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"}`}
                  onDragOver={onDragOverAvailable} onDragLeave={onDragLeave} onDrop={onDropAvailable}>
                  <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
                    <div className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Available</span>
                    <span className="text-[11px] text-zinc-400">{availablePerms.length}</span>
                    <div className="flex-1" />
                    <button type="button" onClick={openAddPerm}
                      className="flex cursor-pointer items-center gap-1.5 rounded-md border-2 border-dashed border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-400 transition-all hover:border-sky-400 hover:bg-sky-50/50 hover:text-sky-600 dark:border-zinc-700 dark:text-zinc-500 dark:hover:border-sky-500 dark:hover:bg-sky-500/5 dark:hover:text-sky-400">
                      <PlusSmIcon /> New Permission
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 [scrollbar-width:thin]">
                    {availablePerms.length === 0 ? (
                      <div className="flex h-full items-center justify-center"><p className="text-center text-sm text-zinc-400">{permSearch ? "No matches" : "All permissions are assigned"}</p></div>
                    ) : Object.entries(availableByResource).sort(([a], [b]) => a.localeCompare(b)).map(([resource, perms]) => (
                      <div key={resource} className="mb-3">
                        <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{resource}</div>
                        <div className="flex flex-wrap gap-1.5 px-1">{perms.map((perm) => <PermChip key={perm.id} perm={perm} variant="available" onAssign={() => assignPerm(perm.id)} />)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Role form modal ── */}
      {roleFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-xl dark:bg-zinc-900">
            <div className="relative bg-gradient-to-r from-sky-600 to-cyan-600 px-5 py-3">
              <h3 className="text-center text-lg font-semibold text-white">{roleEditing ? "Edit Role" : "New Role"}</h3>
              <button type="button" onClick={() => setRoleFormOpen(false)} className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/35 bg-white/15 text-sm text-white/95 hover:bg-white/25">✕</button>
            </div>
            <form onSubmit={handleSaveRole} className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">Name *</span><input required type="text" value={rfName} onChange={(e) => setRfName(e.target.value)} className="w-full rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200" /></label>
                <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">Code *</span><input required type="text" value={rfCode} onChange={(e) => setRfCode(e.target.value)} className="w-full rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200" /></label>
              </div>
              <label className="block space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">Description</span><input type="text" value={rfDesc} onChange={(e) => setRfDesc(e.target.value)} className="w-full rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200" /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">Assignment Level</span><select value={rfLevel} onChange={(e) => setRfLevel(e.target.value)} className="w-full cursor-pointer rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"><option value="both">Both</option><option value="system">System</option><option value="group">Group</option></select></label>
                <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">Status</span><select value={rfStatus} onChange={(e) => setRfStatus(e.target.value)} className="w-full cursor-pointer rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setRoleFormOpen(false)} className="cursor-pointer rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">Cancel</button>
                <button type="submit" disabled={roleSaving} className="cursor-pointer rounded bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60">{roleSaving ? "Saving…" : roleEditing ? "Update" : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Role delete confirm ── */}
      {roleDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl dark:bg-zinc-900">
            <div className="bg-gradient-to-r from-rose-600 to-pink-600 px-5 py-3"><h3 className="text-center text-lg font-semibold text-white">Delete Role?</h3></div>
            <div className="p-5 text-center">
              <p className="text-sm text-zinc-600 dark:text-zinc-300">This will permanently remove <strong className="text-zinc-800 dark:text-zinc-200">{roleDeleteTarget.name}</strong> and all its permission assignments.</p>
              <div className="mt-5 flex justify-center gap-2">
                <button type="button" onClick={() => setRoleDeleteTarget(null)} className="cursor-pointer rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">Cancel</button>
                <button type="button" onClick={handleDeleteRole} disabled={roleDeleting} className="cursor-pointer rounded bg-rose-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-60">{roleDeleting ? "Deleting…" : "Delete"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Permission form modal ── */}
      {permFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-xl dark:bg-zinc-900">
            <div className="relative bg-gradient-to-r from-sky-600 to-cyan-600 px-5 py-3">
              <h3 className="text-center text-lg font-semibold text-white">{permEditing ? "Edit Permission" : "New Permission"}</h3>
              <button type="button" onClick={() => setPermFormOpen(false)} className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/35 bg-white/15 text-sm text-white/95 hover:bg-white/25">✕</button>
            </div>
            <form onSubmit={handleSavePerm} className="space-y-4 p-5">
              <label className="block space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">Code *</span><input required type="text" value={pfCode} onChange={(e) => setPfCode(e.target.value)} placeholder="users.read" className="w-full rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200" /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">Resource *</span><input required type="text" value={pfResource} onChange={(e) => setPfResource(e.target.value)} placeholder="users" className="w-full rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200" /></label>
                <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">Action *</span><input required type="text" value={pfAction} onChange={(e) => setPfAction(e.target.value)} placeholder="read" className="w-full rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200" /></label>
              </div>
              <label className="block space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">Description</span><input type="text" value={pfDesc} onChange={(e) => setPfDesc(e.target.value)} className="w-full rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200" /></label>
              <label className="block space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">Status</span><select value={pfStatus} onChange={(e) => setPfStatus(e.target.value)} className="w-full cursor-pointer rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setPermFormOpen(false)} className="cursor-pointer rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">Cancel</button>
                <button type="submit" disabled={permSaving} className="cursor-pointer rounded bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60">{permSaving ? "Saving…" : permEditing ? "Update" : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Permission delete confirm ── */}
      {permDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl dark:bg-zinc-900">
            <div className="bg-gradient-to-r from-rose-600 to-pink-600 px-5 py-3"><h3 className="text-center text-lg font-semibold text-white">Delete Permission?</h3></div>
            <div className="p-5 text-center">
              <p className="text-sm text-zinc-600 dark:text-zinc-300">This will permanently remove <strong className="text-zinc-800 dark:text-zinc-200">{permDeleteTarget.code}</strong>.</p>
              <div className="mt-5 flex justify-center gap-2">
                <button type="button" onClick={() => setPermDeleteTarget(null)} className="cursor-pointer rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">Cancel</button>
                <button type="button" onClick={handleDeletePerm} disabled={permDeleting} className="cursor-pointer rounded bg-rose-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-60">{permDeleting ? "Deleting…" : "Delete"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
