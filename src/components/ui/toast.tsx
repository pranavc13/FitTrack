"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, CloudOff, Info, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Tone = "success" | "error" | "info" | "queued";
interface Toast {
  id: number;
  tone: Tone;
  text: string;
}

const Ctx = createContext<(text: string, tone?: Tone) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Tone = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 5000 : 2800);
  }, []);
  const icon = { success: <CheckCircle2 className="h-5 w-5 text-lime" />, error: <XCircle className="h-5 w-5 text-red" />, info: <Info className="h-5 w-5 text-blue" />, queued: <CloudOff className="h-5 w-5 text-orange" /> };
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-4 pt-[calc(env(safe-area-inset-top)+12px)]" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="pointer-events-auto flex max-w-md items-center gap-2.5 rounded-2xl border border-line bg-surface-2/95 px-4 py-3 text-sm shadow-xl backdrop-blur">
              {icon[t.tone]}
              <span>{t.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
