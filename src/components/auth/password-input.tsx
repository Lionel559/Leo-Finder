import type { ChangeEvent } from "react";

type PasswordInputProps = {
  autoComplete: string;
  id: string;
  isVisible: boolean;
  minLength?: number;
  name: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onToggle: () => void;
  required?: boolean;
  value: string;
};

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      <path d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      <path d="m3 3 18 18" />
      <path d="M10.58 10.58a2 2 0 0 0 2.84 2.84" />
      <path d="M6.1 6.1C3.72 7.69 2.25 12 2.25 12s3.75 6.75 9.75 6.75c1.68 0 3.18-.46 4.49-1.14" />
      <path d="M19.28 15.28c1.57-1.58 2.47-3.28 2.47-3.28S18 5.25 12 5.25c-.83 0-1.62.13-2.36.36" />
    </svg>
  );
}

export function PasswordInput({
  autoComplete,
  id,
  isVisible,
  minLength,
  name,
  onChange,
  onToggle,
  required = true,
  value,
}: PasswordInputProps) {
  const toggleLabel = isVisible ? "Hide password" : "Show password";

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={isVisible ? "text" : "password"}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        value={value}
        onChange={onChange}
        className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 pr-12 text-sm text-[#0F172A] outline-none transition focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
      />
      <button
        type="button"
        aria-label={toggleLabel}
        aria-pressed={isVisible}
        onClick={onToggle}
        className="absolute inset-y-0 right-0 flex h-11 w-11 items-center justify-center rounded-r-md text-slate-500 transition hover:text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#10B981]/30"
      >
        {isVisible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}
