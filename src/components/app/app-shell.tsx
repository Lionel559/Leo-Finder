import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";

type AppShellProps = {
  active: "dashboard" | "opportunities" | "saved" | "applications" | "settings";
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

const navItems = [
  { href: "/dashboard", label: "Dashboard", value: "dashboard" },
  { href: "/opportunities", label: "Opportunities", value: "opportunities" },
  { href: "/saved", label: "Saved", value: "saved" },
  { href: "/applications", label: "Applications", value: "applications" },
  { href: "/settings", label: "Settings", value: "settings" },
] as const;

export function AppShell({ active, title, subtitle, children }: AppShellProps) {
  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col lg:flex-row">
        <aside className="border-b border-slate-200 bg-white px-4 py-4 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <div className="flex items-center justify-between gap-4 lg:block">
            <Link href="/dashboard" className="block">
              <p className="text-base font-semibold text-[#0F172A]">
                Leo Finder
              </p>
              <p className="mt-1 hidden text-sm text-slate-500 lg:block">
                Opportunity Agent
              </p>
            </Link>
            <div className="lg:hidden">
              <LogoutButton />
            </div>
          </div>

          <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:mt-8 lg:flex-col lg:overflow-visible lg:pb-0">
            {navItems.map((item) => {
              const isActive = active === item.value;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex h-10 shrink-0 items-center rounded-md px-3 text-sm font-semibold transition ${
                    isActive
                      ? "bg-[#10B981]/10 text-[#047857]"
                      : "text-slate-600 hover:bg-slate-50 hover:text-[#0F172A]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 hidden lg:block">
            <LogoutButton />
          </div>
        </aside>

        <div className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <header className="mb-6 flex flex-col gap-2 border-b border-slate-200 pb-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#10B981]">
              {active}
            </p>
            <h1 className="text-3xl font-semibold tracking-normal text-[#0F172A]">
              {title}
            </h1>
            {subtitle ? (
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                {subtitle}
              </p>
            ) : null}
          </header>

          {children}
        </div>
      </div>
    </main>
  );
}
