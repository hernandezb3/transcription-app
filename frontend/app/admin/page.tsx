"use client";

import { useState } from "react";
import RolesPermissionsPage from "./roles-permissions";
import GroupsPage from "./groups";
import RequirePermission from "@/app/components/require-permission";

type TabId = "users-groups" | "roles-permissions";

const tabs: { id: TabId; label: string }[] = [
  { id: "users-groups", label: "Users & Groups" },
  { id: "roles-permissions", label: "Roles & Permissions" },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabId>("users-groups");

  return (
    <RequirePermission permission="roles.read">
      <div className="mb-4 flex shrink-0 gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`cursor-pointer px-5 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-sky-500 text-sky-600 dark:text-sky-400"
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {activeTab === "users-groups" && <GroupsPage />}
        {activeTab === "roles-permissions" && <RolesPermissionsPage />}
      </div>
    </RequirePermission>
  );
}
