import Link from "next/link";

const features = [
  {
    eyebrow: "Match",
    title: "AI Opportunity Matching",
    description:
      "Rank roles, grants, scholarships, and programs by fit instead of scrolling through generic listings.",
  },
  {
    eyebrow: "Resume",
    title: "Resume Analyzer",
    description:
      "Compare your resume against each opportunity and spot the gaps before you apply.",
  },
  {
    eyebrow: "Draft",
    title: "Cover Letter Generator",
    description:
      "Turn your profile, skills, and opportunity details into focused application drafts.",
  },
  {
    eyebrow: "Alerts",
    title: "Telegram Alerts",
    description:
      "Get timely matches and reminders where you already check messages.",
  },
  {
    eyebrow: "Track",
    title: "Application Tracker",
    description:
      "Follow every saved opportunity from discovered to submitted without losing context.",
  },
  {
    eyebrow: "Build",
    title: "API Access",
    description:
      "Build opportunity search, ranking, and alerting into your own products and workflows.",
  },
];

const opportunityPreviews = [
  {
    title: "Frontend Developer Internship",
    type: "Internship",
    fit: "94%",
    detail: "React, TypeScript, product UI",
  },
  {
    title: "AI Hackathon",
    type: "Hackathon",
    fit: "91%",
    detail: "Agents, data tools, rapid prototyping",
  },
  {
    title: "Startup Grant",
    type: "Grant",
    fit: "87%",
    detail: "Early-stage founders and builders",
  },
  {
    title: "Open Source Bounty",
    type: "Bounty",
    fit: "84%",
    detail: "Issues, maintainer briefs, funded tasks",
  },
];

const heroOpportunities = opportunityPreviews.slice(0, 3);

const steps = [
  {
    title: "Create profile",
    description: "Tell Leo Finder what you are building toward.",
    icon: "profile",
  },
  {
    title: "Add skills/resume",
    description: "Give the agent enough context to understand fit.",
    icon: "resume",
  },
  {
    title: "Get matched",
    description: "See ranked opportunities with clear match signals.",
    icon: "target",
  },
  {
    title: "Apply faster",
    description: "Track progress and prepare better applications.",
    icon: "apply",
  },
];

function StepIcon({ icon }: { icon: string }) {
  const shared = {
    className: "h-6 w-6",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
    viewBox: "0 0 24 24",
  };

  if (icon === "resume") {
    return (
      <svg aria-hidden="true" {...shared}>
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v5h5" />
        <path d="M10 13h6" />
        <path d="M10 17h4" />
      </svg>
    );
  }

  if (icon === "target") {
    return (
      <svg aria-hidden="true" {...shared}>
        <path d="M12 21a9 9 0 1 0-9-9" />
        <path d="M12 17a5 5 0 1 0-5-5" />
        <path d="M12 13a1 1 0 1 0-1-1" />
        <path d="m3 21 6-6" />
      </svg>
    );
  }

  if (icon === "apply") {
    return (
      <svg aria-hidden="true" {...shared}>
        <path d="M5 12h12" />
        <path d="m13 6 6 6-6 6" />
        <path d="M5 5v14" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" {...shared}>
      <path d="M16 19v-2a4 4 0 0 0-8 0v2" />
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
      <path d="M4 21h16" />
    </svg>
  );
}

function FeatureMark({ label }: { label: string }) {
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ECFDF5] text-sm font-black text-[#047857] ring-1 ring-[#10B981]/20">
      {label}
    </div>
  );
}

function HeroPreview() {
  return (
    <div className="box-border w-full max-w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-3 shadow-[0_24px_80px_rgba(15,23,42,0.14)] sm:p-5">
      <div className="box-border max-w-full overflow-hidden rounded-[1.5rem] border border-slate-100 bg-[#F8FAFC] p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#059669]">
              Opportunity radar
            </p>
            <h2 className="mt-2 text-xl font-black text-[#0F172A]">
              Today&apos;s top matches
            </h2>
          </div>
          <div className="w-fit rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-[#047857]">
            Agent active
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {heroOpportunities.map((opportunity) => (
            <article
              key={opportunity.title}
              className="box-border max-w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#ECFDF5] px-2.5 py-1 text-[11px] font-bold text-[#047857]">
                      {opportunity.type}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {opportunity.detail}
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-black leading-6 text-[#0F172A]">
                    {opportunity.title}
                  </h3>
                </div>
                <div className="box-border flex h-11 w-full max-w-full shrink-0 items-center justify-between rounded-2xl bg-[#0F172A] px-3 text-white shadow-sm sm:h-14 sm:w-14 sm:flex-col sm:justify-center sm:px-0">
                  <span className="text-base font-black leading-none">
                    {opportunity.fit}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-200 sm:mt-1">
                    match
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-[#0F172A]">
                Profile signal
              </p>
              <span className="text-xs font-bold text-[#059669]">Strong</span>
            </div>
            <div className="mt-4 space-y-3">
              <div className="h-2.5 rounded-full bg-[#10B981]" />
              <div className="h-2.5 w-10/12 rounded-full bg-[#38BDF8]" />
              <div className="h-2.5 w-8/12 rounded-full bg-[#F59E0B]" />
            </div>
          </article>

          <article className="rounded-2xl bg-[#0F172A] p-4 text-white shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-200">
              Agent queue
            </p>
            <p className="mt-4 text-4xl font-black tracking-tight">128</p>
            <p className="mt-1 text-xs leading-5 text-slate-300">
              ranked opportunities this week
            </p>
          </article>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F8FAFC] text-[#0F172A]">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <nav className="box-border mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F172A] text-sm font-black text-white shadow-sm">
              LF
            </span>
            <span className="text-base font-black tracking-tight text-[#0F172A] max-[380px]:hidden">
              Leo Finder
            </span>
          </Link>

          <div className="hidden items-center gap-7 text-sm font-bold text-slate-600 md:flex">
            <Link href="/opportunities" className="hover:text-[#10B981]">
              Opportunities
            </Link>
            <a href="#api" className="hover:text-[#10B981]">
              API
            </a>
            <Link href="/login" className="hover:text-[#10B981]">
              Login
            </Link>
            <Link
              href="/register"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[#10B981] px-4 text-white shadow-sm transition hover:bg-[#059669]"
            >
              Get Started
            </Link>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 px-3 text-xs font-bold text-[#0F172A] sm:h-10 sm:text-sm"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="inline-flex h-9 items-center justify-center rounded-xl bg-[#10B981] px-3 text-xs font-bold text-white sm:h-10 sm:text-sm"
            >
              Get Started
            </Link>
          </div>
        </nav>
        <div className="border-t border-slate-200 bg-white md:hidden">
          <div className="box-border mx-auto flex h-11 w-full max-w-7xl items-center gap-5 px-4 text-sm font-bold text-slate-600">
            <Link href="/opportunities" className="hover:text-[#10B981]">
              Opportunities
            </Link>
            <a href="#api" className="hover:text-[#10B981]">
              API
            </a>
          </div>
        </div>
      </header>

      <section className="overflow-hidden border-b border-slate-200 bg-[#F8FAFC]">
        <div className="box-border mx-auto grid w-full max-w-7xl gap-10 px-5 py-14 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)] lg:items-center lg:gap-14 lg:px-8 lg:py-24 xl:py-28">
          <div className="min-w-0 max-w-2xl">
            <p className="mb-5 inline-flex max-w-full whitespace-normal break-words rounded-full border border-[#10B981]/30 bg-white px-4 py-2 text-sm font-black text-[#047857] shadow-sm">
              AI-powered Opportunity Discovery and Career Agent
            </p>
            <h1 className="max-w-full break-words text-3xl font-black leading-[1.08] tracking-tight text-[#0F172A] sm:text-5xl lg:text-6xl">
              Find Opportunities That Match Your Skills
            </h1>
            <p className="mt-6 max-w-xl break-words text-lg leading-8 text-slate-700">
              Discover jobs, internships, grants, scholarships, hackathons,
              bounties, and fellowships tailored to your profile.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-[#10B981] px-6 text-base font-black text-white shadow-lg shadow-emerald-900/10 transition hover:bg-[#059669]"
              >
                Get Started
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-base font-black text-[#0F172A] shadow-sm transition hover:border-[#10B981]/60 hover:bg-[#ECFDF5]"
              >
                Login
              </Link>
            </div>
          </div>

          <div className="min-w-0">
            <HeroPreview />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#059669]">
              Platform features
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#0F172A] sm:text-4xl">
              Discover, rank, track, and prepare from one place.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-slate-600">
            Built for people who want fewer tabs, cleaner decisions, and a
            clearer path from match to application.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:border-[#10B981]/30 hover:shadow-[0_18px_56px_rgba(15,23,42,0.1)]"
            >
              <div className="flex items-start justify-between gap-4">
                <FeatureMark label={feature.eyebrow.slice(0, 2)} />
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                  {feature.eyebrow}
                </span>
              </div>
              <h3 className="mt-6 text-xl font-black tracking-tight text-[#0F172A]">
                {feature.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="opportunities"
        className="border-y border-slate-200 bg-white py-16 lg:py-24"
      >
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#059669]">
                Sample matches
              </p>
              <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight text-[#0F172A] sm:text-4xl">
                Opportunity previews built for quick decisions.
              </h2>
            </div>
            <Link
              href="/opportunities"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-black text-[#0F172A] shadow-sm transition hover:border-[#10B981]/60 hover:bg-[#ECFDF5]"
            >
              View Opportunities
            </Link>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {opportunityPreviews.map((opportunity) => (
              <article
                key={opportunity.title}
                className="rounded-3xl border border-slate-200 bg-[#F8FAFC] p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
                    {opportunity.type}
                  </span>
                  <span className="text-sm font-black text-[#059669]">
                    {opportunity.fit} match
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-black leading-7 tracking-tight text-[#0F172A]">
                  {opportunity.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {opportunity.detail}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#059669]">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#0F172A] sm:text-4xl">
            From profile to stronger applications.
          </h2>
          <p className="mt-5 text-base leading-7 text-slate-600">
            Leo Finder turns your profile into a matching system, then keeps the
            opportunity pipeline organized as you move.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, index) => (
            <article
              key={step.title}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F172A] text-white">
                  <StepIcon icon={step.icon} />
                </span>
                <span className="text-sm font-black text-slate-300">
                  0{index + 1}
                </span>
              </div>
              <h3 className="mt-7 text-xl font-black tracking-tight text-[#0F172A]">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {step.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section id="api" className="bg-[#0F172A] py-16 text-white lg:py-24">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-6 lg:grid-cols-[1fr_0.8fr] lg:items-center lg:px-8">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-300">
              API-first platform
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">
              Opportunity intelligence for apps, agents, and alerts.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
              Leo Finder also powers a public API for opportunity discovery,
              ranking, and workflow automation, with future Telegram and mobile
              integrations built on the same platform.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20">
            <div className="rounded-2xl bg-[#020617] p-5 font-mono text-sm leading-7 text-emerald-200">
              <p>GET /api/v1/opportunities</p>
              <p>POST /api/v1/applications</p>
              <p>POST /api/v1/telegram/webhook</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p className="font-black text-[#0F172A]">Leo Finder</p>
          <div className="flex flex-wrap gap-5 font-semibold">
            <Link href="/opportunities" className="hover:text-[#10B981]">
              Opportunities
            </Link>
            <a href="#api" className="hover:text-[#10B981]">
              API
            </a>
            <Link href="/login" className="hover:text-[#10B981]">
              Login
            </Link>
            <Link href="/register" className="hover:text-[#10B981]">
              Get Started
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
