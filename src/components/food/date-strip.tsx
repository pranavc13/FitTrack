"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, formatDateLabel } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function DateStrip({ date, today, onChange }: { date: string; today: string; onChange: (d: string) => void }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(date, i - 3));
  return (
    <div className="flex items-center gap-1">
      <button className="grid h-10 w-9 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface-2" onClick={() => onChange(addDays(date, -1))} aria-label="Previous day">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div className="no-scrollbar flex flex-1 justify-between gap-1 overflow-x-auto">
        {days.map((d) => {
          const dt = new Date(d + "T00:00:00Z");
          const future = d > today;
          return (
            <button
              key={d}
              disabled={future}
              onClick={() => onChange(d)}
              aria-current={d === date ? "date" : undefined}
              aria-label={formatDateLabel(d, today)}
              className={cn(
                "flex min-w-11 flex-col items-center rounded-2xl py-1.5 transition",
                d === date ? "bg-lime text-lime-ink" : "text-muted hover:bg-surface-2",
                future && "opacity-30",
                d === today && d !== date && "text-lime",
              )}
            >
              <span className="text-[10px] font-semibold uppercase">{dt.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" })}</span>
              <span className="font-display text-base font-bold tabular">{dt.getUTCDate()}</span>
            </button>
          );
        })}
      </div>
      <button className="grid h-10 w-9 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface-2 disabled:opacity-30" disabled={date >= today} onClick={() => onChange(addDays(date, 1))} aria-label="Next day">
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
