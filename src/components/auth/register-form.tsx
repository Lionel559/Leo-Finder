"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { PasswordInput } from "@/components/auth/password-input";
import type { ApiResponse } from "@/types";

type RegisterPayload = {
  fullName: string;
  email: string;
  password: string;
};

type RegisterResponse = {
  user: {
    id: string;
    email?: string;
  };
};

type PasswordStrength = "Weak" | "Medium" | "Strong";

const strengthStyles: Record<
  PasswordStrength,
  {
    bar: string;
    filledSegments: number;
    label: string;
  }
> = {
  Weak: {
    bar: "bg-red-400",
    filledSegments: 1,
    label: "text-red-600",
  },
  Medium: {
    bar: "bg-amber-400",
    filledSegments: 2,
    label: "text-amber-600",
  },
  Strong: {
    bar: "bg-[#10B981]",
    filledSegments: 3,
    label: "text-[#059669]",
  },
};

function getPasswordStrength(password: string): PasswordStrength {
  const checks = [
    password.length >= 8,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
    password.length >= 12,
  ];
  const score = checks.filter(Boolean).length;

  if (score >= 5) {
    return "Strong";
  }

  if (score >= 3) {
    return "Medium";
  }

  return "Weak";
}

function PasswordStrengthIndicator({
  strength,
}: {
  strength: PasswordStrength;
}) {
  const styles = strengthStyles[strength];

  return (
    <div className="space-y-2" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-xs font-medium">
        <span className="text-slate-500">Password strength</span>
        <span className={styles.label}>{strength}</span>
      </div>
      <div className="grid h-1.5 grid-cols-3 gap-1">
        {[0, 1, 2].map((segment) => (
          <span
            key={segment}
            className={`rounded-full ${
              segment < styles.filledSegments ? styles.bar : "bg-slate-200"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

async function register(payload: RegisterPayload) {
  const response = await fetch("/api/v1/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = (await response.json()) as ApiResponse<RegisterResponse>;

  if (!response.ok || !body.success) {
    throw new Error(body.message || "Registration failed.");
  }

  return body.data;
}

export function RegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const passwordStrength = getPasswordStrength(password);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      await register({
        fullName,
        email,
        password,
      });
      router.replace("/onboarding");
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Registration failed.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="fullName" className="text-sm font-medium text-[#0F172A]">
          Full name
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-[#0F172A] outline-none transition focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-[#0F172A]">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-[#0F172A] outline-none transition focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="password"
            className="text-sm font-medium text-[#0F172A]"
          >
            Password
          </label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            isVisible={isPasswordVisible}
            onChange={(event) => setPassword(event.target.value)}
            onToggle={() => setIsPasswordVisible((visible) => !visible)}
          />
          <PasswordStrengthIndicator strength={passwordStrength} />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="confirmPassword"
            className="text-sm font-medium text-[#0F172A]"
          >
            Confirm password
          </label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            minLength={8}
            value={confirmPassword}
            isVisible={isConfirmPasswordVisible}
            onChange={(event) => setConfirmPassword(event.target.value)}
            onToggle={() =>
              setIsConfirmPasswordVisible((visible) => !visible)
            }
          />
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className="h-11 w-full rounded-md bg-[#10B981] px-4 text-sm font-semibold text-white transition duration-150 hover:-translate-y-0.5 hover:bg-[#059669] hover:shadow-md hover:shadow-[#10B981]/20 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-[#10B981]/40 disabled:shadow-none"
      >
        {isLoading ? "Creating account..." : "Create Account"}
      </button>

      <button
        type="button"
        onClick={() => setError("Google sign-in is coming soon.")}
        className="h-11 w-full rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-[#0F172A] transition duration-150 hover:-translate-y-0.5 hover:border-[#10B981]/50 hover:bg-[#F8FAFC] hover:shadow-sm active:translate-y-0"
      >
        Continue with Google
      </button>

      <p className="text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-[#10B981] transition hover:text-[#059669] hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
