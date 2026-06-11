import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Login | Leo Finder",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-6">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-base font-semibold tracking-normal text-[#0F172A]">
            Leo Finder
          </Link>
          <Link
            href="/register"
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#0F172A] transition duration-150 hover:-translate-y-0.5 hover:border-[#10B981]/50 hover:bg-white hover:shadow-sm active:translate-y-0"
          >
            Create account
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1fr_420px]">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#10B981]">
              Welcome back
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-[#0F172A] sm:text-5xl">
              Welcome Back to Leo Finder
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
              Continue discovering opportunities, tracking applications, and
              improving your career profile.
            </p>
            <div className="mt-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
              <p className="text-sm font-semibold text-[#0F172A]">
                Dashboard preview
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="h-20 rounded-md border border-[#10B981]/20 border-l-4 border-l-[#10B981] bg-[#10B981]/5 p-3 text-xs font-medium text-[#0F172A]">
                  <span className="mb-2 flex h-7 w-7 items-center justify-center rounded-md bg-[#10B981]/10 text-[#10B981]">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M10 6h4" />
                      <path d="M10 18h4" />
                      <path d="M6 10v4" />
                      <path d="M18 10v4" />
                      <rect width="16" height="16" x="4" y="4" rx="3" />
                    </svg>
                  </span>
                  <span>Opportunities</span>
                </div>
                <div className="h-20 rounded-md border border-[#0F172A]/10 border-l-4 border-l-[#0F172A] bg-[#F8FAFC] p-3 text-xs font-medium text-[#0F172A]">
                  <span className="mb-2 flex h-7 w-7 items-center justify-center rounded-md bg-[#0F172A]/5 text-[#0F172A]">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M8 6h10" />
                      <path d="M8 12h10" />
                      <path d="M8 18h6" />
                      <path d="M4 6h.01" />
                      <path d="M4 12h.01" />
                      <path d="M4 18h.01" />
                    </svg>
                  </span>
                  <span>Applications</span>
                </div>
                <div className="h-20 rounded-md border border-[#10B981]/20 border-l-4 border-l-[#10B981] bg-white p-3 text-xs font-medium text-[#0F172A]">
                  <span className="mb-2 flex h-7 w-7 items-center justify-center rounded-md bg-[#10B981]/10 text-[#10B981]">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 20a8 8 0 1 0-8-8" />
                      <path d="m12 12 4-4" />
                      <path d="M8 16h8" />
                    </svg>
                  </span>
                  <span>Resume Score</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-[#0F172A]">
                Login
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Access your opportunities, applications, resume insights, and
                AI recommendations.
              </p>
            </div>
            <LoginForm />
          </div>
        </section>
      </div>
    </main>
  );
}
