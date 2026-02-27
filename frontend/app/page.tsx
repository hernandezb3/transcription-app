import Link from "next/link";

type ModuleItem = {
  title: string;
  description: string;
  href: string;
  cta: string;
};

const modules: ModuleItem[] = [
  {
    title: "Users",
    description: "View and manage team members, usernames, and account status.",
    href: "/users",
    cta: "Open Users",
  },
  {
    title: "Settings",
    description: "Review environment settings and API configuration values.",
    href: "/settings",
    cta: "Open Settings",
  },
];

export default function Home() {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
          Landing Dashboard
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">Welcome back</h2>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-300">
          Select a module below to continue. Each module is a quick entry point
          into the section you want to work in.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {modules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-orange-500/50"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {module.title}
              </h3>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                Module
              </span>
            </div>

            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{module.description}</p>

            <div className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-orange-700 dark:text-orange-300">
              {module.cta}
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
