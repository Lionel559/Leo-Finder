import Link from "next/link";

import { RegisterForm } from "@/components/auth/register-form";

export const metadata = {
  title: "Create Account | Leo Finder",
};

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-6">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-base font-semibold tracking-normal text-[#0F172A]">
            Leo Finder
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#0F172A] transition duration-150 hover:-translate-y-0.5 hover:border-[#10B981]/50 hover:bg-white hover:shadow-sm active:translate-y-0"
          >
            Login
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1fr_440px]">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#10B981]">
              API-first opportunity agent
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-[#0F172A] sm:text-5xl">
              Find Opportunities That Match Your Skills
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
              Discover jobs, internships, grants, scholarships, and hackathons
              that fit your profile, skills, and career goals.
            </p>
            <div className="mt-8 grid gap-3 text-sm text-[#0F172A] sm:grid-cols-2">
              <div className="rounded-lg border border-[#10B981]/20 border-l-4 border-l-[#10B981] bg-white p-4 shadow-sm">
                🎯 AI Opportunity Matching
              </div>
              <div className="rounded-lg border border-[#0F172A]/10 border-l-4 border-l-[#0F172A] bg-white p-4 shadow-sm">
                📄 Resume Analysis
              </div>
              <div className="rounded-lg border border-[#10B981]/20 border-l-4 border-l-[#10B981] bg-[#10B981]/5 p-4 shadow-sm">
                🚀 Application Tracking
              </div>
              <div className="rounded-lg border border-[#0F172A]/10 border-l-4 border-l-[#0F172A] bg-white p-4 shadow-sm">
                🔔 Telegram Opportunity Alerts
              </div>
            </div>
            <div className="mt-5 max-w-sm rounded-lg border border-[#10B981]/20 bg-white p-4 shadow-sm shadow-slate-200/70">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Featured opportunity
              </p>
              <div className="mt-3 flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-[#0F172A]">
                    Frontend Developer
                  </p>
                  <p className="mt-1 text-sm text-slate-600">Remote</p>
                </div>
                <span className="rounded-md bg-[#10B981]/10 px-2.5 py-1 text-sm font-semibold match-score">
                  92% Match
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-[#0F172A]">
                Create your account
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Your profile, preferences, and free subscription are created
                during registration.
              </p>
            </div>
            <RegisterForm />
          </div>
        </section>
      </div>
    </main>
  );
}
