"use client";

import { useCallback, useEffect, useState } from "react";

import type { ApiResponse } from "@/types";

type TelegramStatus = "connected" | "not_connected" | "pending";

type TelegramAttempt = {
  id: string;
  code: string;
  botUsername?: string;
  deepLink?: string;
  instruction: string;
  expiresAt: string;
};

type TelegramConnection = {
  id: string;
  telegramUserId: string | null;
  telegramUsername: string | null;
  username: string | null;
  connectedAt: string;
};

type TelegramStatusResponse = {
  status: TelegramStatus;
  connection: TelegramConnection | null;
  attempt: TelegramAttempt | null;
};

type TelegramTestAlertResponse = {
  sent: boolean;
  connection: TelegramConnection;
};

type TelegramConnectionCardProps = {
  compact?: boolean;
};

const telegramBotUsername = "Leofinderzz_Bot";

function getTelegramDeepLink(code: string) {
  return `https://t.me/${telegramBotUsername}?start=${encodeURIComponent(code)}`;
}

function getAttemptDeepLink(attempt: TelegramAttempt) {
  return attempt.deepLink ?? getTelegramDeepLink(attempt.code);
}

function getQrCodeUrl(value: string) {
  const size = 180;

  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    value,
  )}`;
}

function getStatusLabel(status: TelegramStatus) {
  if (status === "connected") {
    return "Connected \u2705";
  }

  if (status === "pending") {
    return "Waiting for Telegram";
  }

  return "Not connected";
}

function formatConnectedDate(value: string | null | undefined) {
  if (!value) {
    return "Unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unavailable";
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
    month: "long",
    year: "numeric",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((result, part) => {
      result[part.type] = part.value;
      return result;
    }, {});

  return `${parts.month} ${parts.day}, ${parts.year}, ${parts.hour}:${parts.minute} ${parts.dayPeriod}`;
}

async function requestTelegram(
  endpoint: "/api/v1/telegram/connect" | "/api/v1/telegram/disconnect",
) {
  const response = await fetch(endpoint, {
    method: "POST",
  });
  const body = (await response.json()) as ApiResponse<TelegramStatusResponse>;

  if (!response.ok || !body.success) {
    throw new Error(body.message || "Telegram connection could not be updated.");
  }

  return body.data;
}

async function sendTestTelegramAlert() {
  const response = await fetch("/api/v1/telegram/test-alert", {
    method: "POST",
  });
  const body = (await response.json()) as ApiResponse<TelegramTestAlertResponse>;

  if (!response.ok || !body.success) {
    throw new Error(body.message || "Telegram test alert could not be sent.");
  }

  return body.data;
}

async function fetchTelegramStatus() {
  const response = await fetch("/api/v1/telegram/status", {
    cache: "no-store",
  });
  const body = (await response.json()) as ApiResponse<TelegramStatusResponse>;

  if (!response.ok || !body.success) {
    throw new Error(body.message || "Telegram status could not be loaded.");
  }

  if (!body.data) {
    throw new Error("Telegram status response was empty.");
  }

  return body.data;
}

export function TelegramConnectionCard({
  compact = false,
}: TelegramConnectionCardProps) {
  const [status, setStatus] = useState<TelegramStatus>("not_connected");
  const [connection, setConnection] = useState<TelegramConnection | null>(null);
  const [attempt, setAttempt] = useState<TelegramAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const applyStatusData = useCallback((data: TelegramStatusResponse) => {
    setStatus(data.status);
    setConnection(data.connection);
    setAttempt(data.attempt);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadStatus() {
      try {
        const data = await fetchTelegramStatus();

        if (isMounted) {
          applyStatusData(data);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Telegram status could not be loaded.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadStatus();

    return () => {
      isMounted = false;
    };
  }, [applyStatusData]);

  useEffect(() => {
    if (status !== "pending") {
      return;
    }

    const intervalId = window.setInterval(async () => {
      try {
        const data = await fetchTelegramStatus();
        applyStatusData(data);
      } catch {
        // Keep the current pending state; the visible error area is reserved for user actions.
      }
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [applyStatusData, status]);

  async function handleConnect() {
    setIsSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const data = await requestTelegram("/api/v1/telegram/connect");

      if (data) {
        applyStatusData(data);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Telegram connection could not be started.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDisconnect() {
    setIsSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const data = await requestTelegram("/api/v1/telegram/disconnect");

      if (data) {
        applyStatusData(data);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Telegram connection could not be disconnected.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSendTestAlert() {
    setIsTesting(true);
    setError(null);
    setNotice(null);

    try {
      const data = await sendTestTelegramAlert();

      if (data?.connection) {
        setConnection(data.connection);
      }

      setNotice("Test alert sent to Telegram.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Telegram test alert could not be sent.",
      );
    } finally {
      setIsTesting(false);
    }
  }

  const statusLabel = isLoading ? "Checking..." : getStatusLabel(status);
  const telegramUsername =
    connection?.telegramUsername ?? connection?.username ?? null;
  const connectedDateLabel = formatConnectedDate(connection?.connectedAt);

  return (
    <section
      className={`rounded-lg border border-slate-200 bg-white ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#10B981]">
            Telegram
          </p>
          <h3 className="mt-1 text-xl font-semibold text-[#0F172A]">
            Telegram connection
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Status: <span className="font-semibold">{statusLabel}</span>
          </p>
          {status !== "connected" ? (
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Click Connect Telegram and press Start in the bot to receive
              opportunity alerts.
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={handleConnect}
            disabled={
              isLoading || isSubmitting || isTesting || status === "connected"
            }
            className="h-10 rounded-md bg-[#10B981] px-4 text-sm font-semibold text-white transition hover:bg-[#059669] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Connect Telegram
          </button>
          <button
            type="button"
            onClick={handleSendTestAlert}
            disabled={
              isLoading || isSubmitting || isTesting || status !== "connected"
            }
            className="h-10 rounded-md border border-[#10B981]/40 bg-[#ECFDF5] px-4 text-sm font-semibold text-[#047857] transition hover:border-[#10B981] hover:bg-[#D1FAE5] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
          >
            {isTesting ? "Sending..." : "Send Test Alert"}
          </button>
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={
              isLoading ||
              isSubmitting ||
              isTesting ||
              status === "not_connected"
            }
            className="h-10 rounded-md border border-slate-200 px-4 text-sm font-semibold text-[#0F172A] transition hover:border-[#10B981]/50 hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:text-slate-400"
          >
            Disconnect
          </button>
        </div>
      </div>

      {status === "connected" ? (
        <div className="mt-5 rounded-lg border border-[#10B981]/25 bg-[#F0FDF4] p-5 shadow-sm shadow-[#10B981]/10 sm:p-6">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#10B981] text-white shadow-sm shadow-[#10B981]/30"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                className="h-5 w-5"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-base font-semibold text-[#064E3B]">
                Telegram Connected Successfully
              </p>
            </div>
          </div>

          <dl className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="min-w-0 rounded-md border border-[#BBF7D0] bg-white px-4 py-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Telegram Username
              </dt>
              <dd className="mt-2 max-w-full overflow-x-auto whitespace-nowrap text-base font-semibold text-[#0F172A]">
                {telegramUsername ? `@${telegramUsername}` : "Unavailable"}
              </dd>
            </div>
            <div className="min-w-0 rounded-md border border-[#BBF7D0] bg-white px-4 py-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Connected On
              </dt>
              <dd className="mt-2 max-w-full overflow-x-auto whitespace-nowrap text-base font-semibold text-[#0F172A]">
                {connectedDateLabel}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}

      {status !== "connected" && attempt ? (
        <div className="mt-4 rounded-md border border-[#10B981]/20 bg-[#10B981]/5 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#0F172A]">
                {attempt.instruction}
              </p>
              <p className="mt-3 text-sm text-slate-600">
                Fallback code
              </p>
              <p className="mt-1 break-all rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-sm font-semibold text-[#0F172A]">
                {attempt.code}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Code expires at {new Date(attempt.expiresAt).toLocaleString()}.
              </p>
              <a
                href={getAttemptDeepLink(attempt)}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex h-10 items-center rounded-md bg-[#10B981] px-4 text-sm font-semibold text-white transition hover:bg-[#059669]"
              >
                Open Telegram Bot
              </a>
            </div>

            <details className="shrink-0">
              <summary className="cursor-pointer text-sm font-semibold text-[#047857]">
                Show QR code
              </summary>
              <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
                {/* QR image is generated by an external QR endpoint from this one-time link. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getQrCodeUrl(getAttemptDeepLink(attempt))}
                  alt="Telegram bot connection QR code"
                  width={180}
                  height={180}
                  className="h-[180px] w-[180px]"
                />
              </div>
            </details>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {notice ? (
        <p className="mt-4 rounded-md border border-[#10B981]/20 bg-[#ECFDF5] px-3 py-2 text-sm font-medium text-[#047857]">
          {notice}
        </p>
      ) : null}
    </section>
  );
}
