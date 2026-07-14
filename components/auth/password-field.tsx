"use client";

import React, { useState, useId } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordFieldProps = {
  id?: string;
  name?: string;
  value?: string;
  label: string;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
  error?: string;
  onChange?: (value: string) => void;
  className?: string;
};

export function PasswordField({
  id,
  name,
  value,
  label,
  required = false,
  autoComplete,
  minLength,
  error,
  onChange,
  className = "",
}: PasswordFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;
  const [visible, setVisible] = useState(false);

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm font-medium text-[var(--muted-strong)]" htmlFor={fieldId}>
        {label}
      </label>
      <div className="relative">
        <input
          id={fieldId}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          required={required}
          autoComplete={autoComplete}
          minLength={minLength}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={!!error}
          className="h-12 w-full rounded-lg border border-[var(--border)] bg-black px-4 pr-12 text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--film)]"
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          aria-label={visible ? "隐藏密码" : "显示密码"}
          className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] transition hover:bg-white/[0.08] hover:text-[var(--text)]"
        >
          {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      </div>
      {error ? (
        <p id={errorId} className="text-xs text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
