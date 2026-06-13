"use client";

import { type FormEvent, useEffect, useState } from "react";

import type { ApiResponse } from "@/types";

type ContactSupportCardProps = {
  email: string;
};

type ContactResponse = {
  emailAttempted: boolean;
  emailError: string | null;
  emailSent: boolean;
  messageId: string;
};

type ContactSubmitResult = {
  data: ContactResponse | undefined;
  message: string;
};

async function sendContactMessage(payload: {
  message: string;
  subject: string;
}): Promise<ContactSubmitResult> {
  const response = await fetch("/api/v1/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = (await response.json()) as ApiResponse<ContactResponse>;

  if (!response.ok || !body.success) {
    throw new Error(body.message || "Your message could not be sent.");
  }

  return {
    data: body.data,
    message: body.message,
  };
}

export function ContactSupportCard({ email }: ContactSupportCardProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setNotice(null);
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [notice]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      const result = await sendContactMessage({ message, subject });
      setSubject("");
      setMessage("");
      setNotice(result.message);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Your message could not be sent.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-[#10B981]">
          Support
        </p>
        <h3 className="mt-1 text-xl font-semibold text-[#0F172A]">
          Contact Support
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Send the Leo Finder team a message from your account email.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label
            htmlFor="contact-email"
            className="text-sm font-medium text-[#0F172A]"
          >
            Email
          </label>
          <input
            id="contact-email"
            type="email"
            value={email}
            readOnly
            className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-600 outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="contact-subject"
            className="text-sm font-medium text-[#0F172A]"
          >
            Subject
          </label>
          <input
            id="contact-subject"
            type="text"
            required
            maxLength={160}
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-slate-200 px-3 text-sm text-[#0F172A] outline-none transition focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
          />
        </div>

        <div>
          <label
            htmlFor="contact-message"
            className="text-sm font-medium text-[#0F172A]"
          >
            Message
          </label>
          <textarea
            id="contact-message"
            required
            minLength={10}
            maxLength={5000}
            rows={6}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="mt-2 w-full resize-y rounded-md border border-slate-200 px-3 py-3 text-sm leading-6 text-[#0F172A] outline-none transition focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
          />
        </div>

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 rounded-md bg-[#10B981] px-4 text-sm font-semibold text-white transition hover:bg-[#059669] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? "Sending..." : "Send Message"}
          </button>
        </div>
      </form>

      {notice ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm rounded-md border border-[#10B981]/25 bg-[#ECFDF5] px-4 py-3 text-sm font-medium text-[#047857] shadow-lg shadow-slate-900/10 sm:left-auto sm:right-5 sm:mx-0"
        >
          {notice}
        </div>
      ) : null}
    </section>
  );
}
