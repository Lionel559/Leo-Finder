import { redirect } from "next/navigation";

import { AuthError, getUserProfile, requireAuth } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Onboarding | Leo Finder",
};

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  let user;

  try {
    user = await requireAuth(supabase);
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login");
    }

    throw error;
  }

  const profile = await getUserProfile(user.id, supabase);

  if (profile?.onboarding_completed) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-base font-semibold tracking-normal text-[#0F172A]">
              Leo Finder
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Complete your opportunity profile
            </p>
          </div>
          <span className="rounded-md bg-[#10B981]/10 px-3 py-1 text-sm font-semibold text-[#10B981]">
            Onboarding
          </span>
        </header>

        <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="max-w-xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#10B981]">
              Profile setup
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-[#0F172A] sm:text-5xl">
              Personalize Leo Finder for your next opportunity.
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Add your roles, skills, resume, and opportunity preferences so the
              agent can start from useful context.
            </p>
            <div className="mt-8 rounded-lg border border-[#10B981]/20 border-l-4 border-l-[#10B981] bg-white p-5 shadow-sm shadow-slate-200/70">
              <p className="text-sm font-semibold text-[#0F172A]">
                What gets saved
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Your profile, user skills, preferences, and resume metadata are
                stored in Supabase when you complete onboarding.
              </p>
            </div>
          </div>

          <OnboardingForm
            initialName={profile?.full_name ?? user.email ?? "there"}
          />
        </section>
      </div>
    </main>
  );
}
