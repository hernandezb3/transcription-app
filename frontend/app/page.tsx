import Link from "next/link";

type ModuleCard = {
  title: string;
  description: string;
  href: string;
  cta: string;
};

type ModuleGroup = {
  heading: string;
  cards: ModuleCard[];
};

const sections: ModuleGroup[] = [
  {
    heading: "Research",
    cards: [
      {
        title: "Participants",
        description:
          "Browse participants, view their transcripts, and upload new recordings.",
        href: "/participants",
        cta: "Open Participants",
      },
    ],
  },
  {
    heading: "Administration",
    cards: [
      {
        title: "Lesson Subjects",
        description:
          "Create and manage lesson subjects available for transcript uploads.",
        href: "/metadata/lesson-subjects",
        cta: "Open Lesson Subjects",
      },
      {
        title: "Microphone Colors",
        description:
          "Create and manage the microphone color palette used across transcripts.",
        href: "/metadata",
        cta: "Open Microphone Colors",
      },
      {
        title: "Users",
        description:
          "View and manage team members, usernames, and account status.",
        href: "/users",
        cta: "Open Users",
      },
    ],
  },
];

export default function Home() {
  return (
    <section className="space-y-8">
      {/* hero */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-3xl font-semibold tracking-tight">Welcome back</h2>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-300">
          Pick a module below to get started.
        </p>
      </div>

      {/* module groups */}
      {sections.map((section) => (
        <div key={section.heading} className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            {section.heading}
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            {section.cards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-orange-500/50"
              >
                <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {card.title}
                </h4>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                  {card.description}
                </p>
                <div className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-orange-700 dark:text-orange-300">
                  {card.cta}
                  <span className="transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
