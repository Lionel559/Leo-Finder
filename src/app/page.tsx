import Link from "next/link";

const features = [
  {
    title: "AI Opportunity Matching",
    description:
      "Rank roles, grants, scholarships, and programs by fit instead of scrolling through generic listings.",
  },
  {
    title: "Resume Analyzer",
    description:
      "Compare your resume against each opportunity and spot the gaps before you apply.",
  },
  {
    title: "Cover Letter Generator",
    description:
      "Turn your profile, skills, and opportunity details into focused application drafts.",
  },
  {
    title: "Telegram Alerts",
    description:
      "Get timely matches and reminders where you already check messages.",
  },
  {
    title: "Application Tracker",
    description:
      "Follow every saved opportunity from discovered to submitted without losing context.",
  },
  {
    title: "API Access",
    description:
      "Build opportunity search, ranking, and alerting into your own products and workflows.",
  },
];

const opportunityPreviews = [
  {
    title: "Frontend Developer Internship",
    type: "Internship",
    fit: "94% match",
    detail: "React, TypeScript, product UI",
  },
  {
    title: "AI Hackathon",
    type: "Hackathon",
    fit: "91% match",
    detail: "Agents, data tools, rapid prototyping",
  },
  {
    title: "Startup Grant",
    type: "Grant",
    fit: "87% match",
    detail: "Early-stage founders and builders",
  },
  {
    title: "Open Source Bounty",
    type: "Bounty",
    fit: "84% match",
    detail: "Issues, maintainer briefs, funded tasks",
  },
];

const steps = [
  "Create profile",
  "Add skills/resume",
  "Get matched",
  "Apply faster",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95">
        <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#0F172A] text-sm font-bold text-white">
              LF
            </span>
            <span className="text-base font-bold text-[#0F172A]">
              Leo Finder
            </span>
          </Link>

          <div className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex">
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
              className="inline-flex h-10 items-center justify-center rounded-md bg-[#10B981] px-4 text-white transition hover:bg-[#059669]"
            >
              Get Started
            </Link>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <Link
              href="/login"
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 px-3 text-sm font-semibold text-[#0F172A]"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="inline-flex h-10 items-center justify-center rounded-md bg-[#10B981] px-3 text-sm font-semibold text-white"
            >
              Get Started
            </Link>
          </div>
        </nav>
        <div className="border-t border-slate-200 bg-white md:hidden">
          <div className="mx-auto flex h-11 w-full max-w-7xl items-center gap-5 px-5 text-sm font-semibold text-slate-600">
            <Link href="/opportunities" className="hover:text-[#10B981]">
              Opportunities
            </Link>
            <a href="#api" className="hover:text-[#10B981]">
              API
            </a>
          </div>
        </div>
      </header>

      <section className="relative isolate overflow-hidden border-b border-slate-200 bg-[#F8FAFC]">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-x-0 top-0 h-full bg-[#F8FAFC]" />
          <div className="absolute left-[6%] top-20 hidden w-[88%] max-w-6xl lg:block">
            <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr_0.8fr]">
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <div className="mb-4 h-2 w-24 rounded-full bg-[#10B981]" />
                <div className="space-y-3">
                  {opportunityPreviews.slice(0, 3).map((opportunity) => (
                    <div
                      key={opportunity.title}
                      className="flex items-center justify-between rounded-md border border-slate-100 bg-[#F8FAFC] px-3 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#0F172A]">
                          {opportunity.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {opportunity.detail}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-[#059669]">
                        {opportunity.fit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Profile signal
                </p>
                <div className="mt-5 space-y-4">
                  <div className="h-3 rounded-full bg-[#10B981]" />
                  <div className="h-3 w-10/12 rounded-full bg-[#38BDF8]" />
                  <div className="h-3 w-8/12 rounded-full bg-[#F59E0B]" />
                  <div className="h-3 w-9/12 rounded-full bg-slate-300" />
                </div>
              </div>
              <div className="rounded-md border border-slate-200 bg-[#0F172A] p-4 text-white">
                <p className="text-xs font-bold uppercase text-emerald-200">
                  Agent queue
                </p>
                <p className="mt-8 text-4xl font-bold">128</p>
                <p className="mt-2 text-sm text-slate-300">
                  ranked opportunities this week
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto flex min-h-[calc(100svh-7rem)] w-full max-w-7xl flex-col justify-end px-5 pb-16 pt-20 sm:px-6 lg:min-h-[calc(100svh-8rem)] lg:px-8 lg:pb-20">
          <div className="max-w-3xl">
            <p className="mb-5 inline-flex rounded-md border border-[#10B981]/30 bg-white px-3 py-2 text-sm font-bold text-[#047857]">
              AI-powered Opportunity Discovery and Career Agent
            </p>
            <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] text-[#0F172A] sm:text-6xl lg:text-7xl">
              Find Opportunities That Match Your Skills
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700 sm:text-xl">
              Discover jobs, internships, grants, scholarships, hackathons,
              bounties, and fellowships tailored to your profile.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center rounded-md bg-[#10B981] px-6 text-base font-bold text-white transition hover:bg-[#059669]"
              >
                Get Started
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-md border border-slate-300 bg-white px-6 text-base font-bold text-[#0F172A] transition hover:border-[#10B981]/60 hover:bg-[#ECFDF5]"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase text-[#059669]">
            What Leo Finder does
          </p>
          <h2 className="mt-3 text-3xl font-bold text-[#0F172A] sm:text-4xl">
            Discover, rank, track, and prepare from one place.
          </h2>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-5 h-10 w-10 rounded-md bg-[#ECFDF5] text-center text-lg font-bold leading-10 text-[#047857]">
                {feature.title
                  .split(" ")
                  .map((word) => word[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <h3 className="text-lg font-bold text-[#0F172A]">
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
        className="border-y border-slate-200 bg-white py-16 lg:py-20"
      >
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase text-[#059669]">
                Sample matches
              </p>
              <h2 className="mt-3 text-3xl font-bold text-[#0F172A] sm:text-4xl">
                Opportunity previews built for quick decisions.
              </h2>
            </div>
            <Link
              href="/opportunities"
              className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-bold text-[#0F172A] transition hover:border-[#10B981]/60 hover:bg-[#ECFDF5]"
            >
              View Opportunities
            </Link>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {opportunityPreviews.map((opportunity) => (
              <article
                key={opportunity.title}
                className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-md bg-white px-2.5 py-1 text-xs font-bold text-slate-600">
                    {opportunity.type}
                  </span>
                  <span className="text-sm font-bold text-[#059669]">
                    {opportunity.fit}
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-bold leading-7 text-[#0F172A]">
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

      <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase text-[#059669]">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-bold text-[#0F172A] sm:text-4xl">
              From profile to stronger applications.
            </h2>
            <p className="mt-5 text-base leading-7 text-slate-600">
              Leo Finder turns your profile into a matching system, then keeps
              the opportunity pipeline organized as you move.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {steps.map((step, index) => (
              <article
                key={step}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#0F172A] text-sm font-bold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-5 text-lg font-bold text-[#0F172A]">
                  {step}
                </h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="api" className="bg-[#0F172A] py-16 text-white lg:py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-6 lg:grid-cols-[1fr_0.8fr] lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase text-emerald-300">
              API-first platform
            </p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Opportunity intelligence for apps, agents, and alerts.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
              Leo Finder also powers a public API for opportunity discovery,
              ranking, and workflow automation, with future Telegram and mobile
              integrations built on the same platform.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-5">
            <div className="font-mono text-sm leading-7 text-emerald-200">
              <p>GET /api/v1/opportunities</p>
              <p>POST /api/v1/applications</p>
              <p>POST /api/v1/telegram/webhook</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p className="font-semibold text-[#0F172A]">Leo Finder</p>
          <div className="flex flex-wrap gap-5">
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
