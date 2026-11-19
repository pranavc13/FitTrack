"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/primitives";
import { useApi } from "@/lib/client/api";
import { fmt } from "@/lib/utils";
import type { FoodHit } from "./add-food-sheet";

/** Search-and-pick a catalogue food (used to replace/add items in scans and recipes). */
export function FoodPicker({ open, onOpenChange, onPick, title = "Choose food", initialQuery = "" }: { open: boolean; onOpenChange: (o: boolean) => void; onPick: (f: FoodHit) => void; title?: string; initialQuery?: string }) {
  const [q, setQ] = useState(initialQuery);
  const [dq, setDq] = useState(initialQuery);
  useEffect(() => setQ(initialQuery), [initialQuery, open]);
  useEffect(() => {
    const t = setTimeout(() => setDq(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  const res = useApi<{ results: FoodHit[] }>(open && dq.length >= 2 ? `/foods/search?q=${encodeURIComponent(dq)}` : null);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title} size="lg">
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-faint" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search foods" aria-label="Search foods" className="h-12 w-full rounded-2xl border border-line bg-surface-2 pl-12 pr-4 focus:border-lime/60 focus:outline-none" />
      </div>
      {res.isLoading ? (
        <div className="grid place-items-center py-8"><Spinner /></div>
      ) : (
        <ul className="space-y-1.5">
          {(res.data?.results ?? []).map((f) => (
            <li key={f.id}>
              <button onClick={() => { onPick(f); onOpenChange(false); }} className="w-full rounded-2xl bg-surface-2 px-3.5 py-3 text-left hover:bg-surface-3">
                <p className="truncate font-medium">{f.name}</p>
                <p className="text-xs text-muted">{fmt.int(f.kcal)} kcal · {fmt.dec(f.proteinG)} g protein per 100 g</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
