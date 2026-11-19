"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ---------------- Button ---------------- */

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        primary: "bg-lime text-lime-ink hover:bg-lime-deep",
        secondary: "bg-surface-2 text-ink hover:bg-surface-3 border border-line",
        ghost: "text-muted hover:text-ink hover:bg-surface-2",
        danger: "bg-red/15 text-red hover:bg-red/25 border border-red/30",
        outline: "border border-line text-ink hover:bg-surface-2",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-4 text-[15px]",
        lg: "h-13 px-6 text-base",
        icon: "h-11 w-11",
        iconSm: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild, loading, children, disabled, ...props }, ref) => {
  if (asChild) {
    // Slot requires exactly one child element (e.g. a <Link>), so no spinner wrapper here.
    return (
      <Slot ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props}>
        {children}
      </Slot>
    );
  }
  return (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} {...props}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
});
Button.displayName = "Button";

/* ---------------- Card ---------------- */

export function Card({ className, glow, ...props }: ComponentProps<"div"> & { glow?: boolean }) {
  return <div className={cn("rounded-[var(--radius-card)] border border-line/70 bg-surface p-4", glow && "glow-lime", className)} {...props} />;
}

export function CardHeader({ title, subtitle, action, icon }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon ? <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-lime">{icon}</div> : null}
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold">{title}</h2>
          {subtitle ? <p className="truncate text-xs text-muted">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ---------------- Form controls ---------------- */

export const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn("h-12 w-full rounded-2xl border border-line bg-surface-2 px-4 text-ink placeholder:text-faint focus:border-lime/60 focus:outline-none disabled:opacity-60", className)}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea">>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn("min-h-24 w-full rounded-2xl border border-line bg-surface-2 p-4 text-ink placeholder:text-faint focus:border-lime/60 focus:outline-none", className)} {...props} />
));
Textarea.displayName = "Textarea";

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn("h-12 w-full appearance-none rounded-2xl border border-line bg-surface-2 px-4 text-ink focus:border-lime/60 focus:outline-none", className)} {...props}>
      {children}
    </select>
  );
}

export function Field({ label, hint, error, children, className }: { label: ReactNode; hint?: ReactNode; error?: string | null; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-sm font-medium text-muted">{label}</span>
      {children}
      {error ? <span className="block text-xs text-red">{error}</span> : hint ? <span className="block text-xs text-faint">{hint}</span> : null}
    </label>
  );
}

/** Numeric input that opens the decimal keypad on phones. */
export const NumberInput = forwardRef<HTMLInputElement, Omit<ComponentProps<"input">, "type"> & { suffix?: string }>(({ suffix, className, ...props }, ref) => (
  <div className="relative">
    <Input ref={ref} type="number" inputMode="decimal" step="any" className={cn("tabular pr-14", className)} {...props} />
    {suffix ? <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-faint">{suffix}</span> : null}
  </div>
));
NumberInput.displayName = "NumberInput";

/* ---------------- Segmented control / chips ---------------- */

export function Segmented<T extends string>({ value, onChange, options, className, size = "md" }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; className?: string; size?: "sm" | "md" }) {
  return (
    <div role="tablist" className={cn("flex gap-1 rounded-2xl bg-surface-2 p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("flex-1 rounded-xl font-semibold transition", size === "sm" ? "h-8 text-xs" : "h-10 text-sm", value === o.value ? "bg-lime text-lime-ink" : "text-muted hover:text-ink")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({ active, className, ...props }: ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn("h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium transition", active ? "border-lime bg-lime/15 text-lime" : "border-line bg-surface-2 text-muted hover:text-ink", className)}
      {...props}
    />
  );
}

export function Badge({ className, tone = "default", ...props }: ComponentProps<"span"> & { tone?: "default" | "lime" | "orange" | "blue" | "red" | "purple" | "cyan" }) {
  const tones = {
    default: "bg-surface-3 text-muted",
    lime: "bg-lime/15 text-lime",
    orange: "bg-orange/15 text-orange",
    blue: "bg-blue/15 text-blue",
    red: "bg-red/15 text-red",
    purple: "bg-purple/15 text-purple",
    cyan: "bg-cyan/15 text-cyan",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", tones[tone], className)} {...props} />;
}

/* ---------------- Progress ---------------- */

export function ProgressRing({ value, size = 140, stroke = 12, color = "var(--color-lime)", track = "var(--color-surface-3)", children }: { value: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} style={{ transition: "stroke-dashoffset 600ms ease" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function Bar({ value, color = "bg-lime", className }: { value: number; color?: string; className?: string }) {
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-3", className)}>
      <div className={cn("h-full rounded-full transition-[width] duration-500", color)} style={{ width: `${v * 100}%` }} />
    </div>
  );
}

export function MacroStat({ label, value, target, unit = "g", color }: { label: string; value: number; target?: number | null; unit?: string; color: string }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <div className="flex items-baseline justify-between gap-1">
        <span className="truncate text-xs text-muted">{label}</span>
        <span className="tabular text-xs text-faint">{target ? `${Math.round(value)}/${target}${unit}` : `${Math.round(value)}${unit}`}</span>
      </div>
      <Bar value={target ? value / target : 0} color={color} />
    </div>
  );
}

/* ---------------- States ---------------- */

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-muted", className)} aria-label="Loading" />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-surface-2", className)} />;
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-line px-6 py-8 text-center">
      {icon ? <div className="mb-1 grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-lime">{icon}</div> : null}
      <p className="font-semibold">{title}</p>
      {body ? <p className="max-w-sm text-sm text-muted">{body}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  return (
    <div role="alert" className="flex items-start gap-3 rounded-[var(--radius-card)] border border-red/30 bg-red/10 p-4">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{message}</p>
        {onRetry ? (
          <button onClick={onRetry} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-lime">
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between px-1">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-faint">{children}</h2>
      {action}
    </div>
  );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" }) {
  return <p className={cn("rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed", tone === "warn" ? "bg-orange/10 text-orange" : "bg-surface-2 text-muted")}>{children}</p>;
}
