import { settings } from "@/lib/settings";

type SettingRow = {
  section: string;
  key: string;
  value: string;
};

function toRows(): SettingRow[] {
  return Object.entries(settings).flatMap(([section, sectionValue]) => {
    if (sectionValue && typeof sectionValue === "object" && !Array.isArray(sectionValue)) {
      return Object.entries(sectionValue as Record<string, unknown>).map(([key, value]) => ({
        section,
        key,
        value: typeof value === "string" ? value : JSON.stringify(value),
      }));
    }

    return [
      {
        section,
        key: "value",
        value: typeof sectionValue === "string" ? sectionValue : JSON.stringify(sectionValue),
      },
    ];
  });
}

export default function SettingsPage() {
  const rows = toRows();

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Settings</h2>

      <div className="overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-100 dark:bg-zinc-800/70">
            <tr>
              <th className="px-4 py-2 font-medium">Section</th>
              <th className="px-4 py-2 font-medium">Key</th>
              <th className="px-4 py-2 font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.section}-${row.key}`} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-4 py-2">{row.section}</td>
                <td className="px-4 py-2">{row.key}</td>
                <td className="px-4 py-2">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
