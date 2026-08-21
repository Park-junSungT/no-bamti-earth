"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "solid" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "text-[#04231b] bg-[linear-gradient(120deg,#22e0a1_0%,#25c9e8_100%)] shadow-[0_10px_28px_-8px_rgba(18,185,129,0.75)] hover:shadow-[0_14px_34px_-8px_rgba(18,185,129,0.9)]",
  solid:
    "text-white bg-[#08161f] shadow-[0_8px_22px_-10px_rgba(8,22,31,0.9)] hover:bg-[#12242f]",
  ghost:
    "text-[#08161f] bg-white/85 border-2 border-[#d5e2e8] hover:border-[#25c9e8] hover:bg-white",
  danger: "text-white bg-[#ff5470] hover:bg-[#ff3f60]",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-4 text-[11px]",
  md: "h-11 px-6 text-[13px]",
  lg: "h-14 px-9 text-[15px] sm:h-16 sm:px-12 sm:text-[17px]",
};

export function Btn({
  variant = "ghost",
  size = "md",
  className = "",
  children,
  ...rest
}: {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`si-btn ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Panel({
  children,
  className = "",
  wide = false,
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`si-pop pointer-events-auto w-full ${
        wide ? "max-w-2xl" : "max-w-md"
      } max-h-full overflow-y-auto rounded-[28px] border border-white/70 bg-white/88 p-6 shadow-[0_30px_80px_-30px_rgba(8,22,31,0.55)] backdrop-blur-xl sm:p-8 ${className}`}
    >
      {children}
    </div>
  );
}

export function Stat({
  value,
  label,
  accent = "#08161f",
  big = false,
}: {
  value: string;
  label: string;
  accent?: string;
  big?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#e2ecf0] bg-white/70 px-4 py-3 text-center">
      <div
        className={`si-mono font-extrabold leading-none ${
          big ? "text-4xl sm:text-5xl" : "text-2xl"
        }`}
        style={{ color: accent }}
      >
        {value}
      </div>
      <div className="mt-1.5 text-[10px] font-bold tracking-[0.16em] text-[#8aa1ad]">
        {label}
      </div>
    </div>
  );
}

export function Overlay({
  children,
  dim = true,
}: {
  children: ReactNode;
  dim?: boolean;
}) {
  return (
    <div
      className={`si-fade pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-4 ${
        dim ? "bg-[#06131b]/45 backdrop-blur-[2px]" : ""
      }`}
    >
      {children}
    </div>
  );
}
