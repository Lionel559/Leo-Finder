"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { PasswordInput } from "@/components/auth/password-input";
import type { ApiResponse } from "@/types";

type LoginResponse = {
  user: {
    id: string;
    email?: string;
  };
  profile?: {
    onboarding_completed?: boolean;
  } | null;
};

async function login(payload: { email: string; password: string }) {
  const response = await fetch("/api/v1/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = (await response.json()) as ApiResponse<LoginResponse>;

  if (!response.ok || !body.success) {
    throw new Error(body.message || "Login failed.");
  }

  return body.data;
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const data = await login({ email, password });
      router.replace(data?.profile?.onboarding_completed ? "/dashboard" : "/onboarding");
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Login failed.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <label
            htmlFor="password"
            className="text-sm font-medium text-[#0F172A]"
          >
            Password
          </label>
          <button
            type="button"
            disabled
            className="cursor-not-allowed text-sm font-medium text-slate-400"
          >
            Forgot password? Coming soon
          </button>
        </div>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          value={password}
          isVisible={isPasswordVisible}
          onChange={(event) => setPassword(event.target.value)}
          onToggle={() => setIsPasswordVisible((visible) => !visible)}
        />
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
        {isLoading ? "Logging in..." : "Login"}
      </button>

      <p className="text-center text-sm text-slate-600">
        New to Leo Finder?{" "}
        <Link href="/register" className="font-medium text-[#10B981] transition hover:text-[#059669] hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
