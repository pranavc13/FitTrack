"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, Card, Field, NumberInput, ProgressRing, Segmented } from "@/components/ui/primitives";

type Phase = "work" | "rest" | "done" | "idle";

/** Interval / Tabata / rest timer — no music, with vibration cues and screen wake lock while running. */
export default function TimerPage() {
  const [preset, setPreset] = useState<"tabata" | "emom" | "custom">("tabata");
  const [work, setWork] = useState("20");
  const [rest, setRest] = useState("10");
  const [rounds, setRounds] = useState("8");
  const [phase, setPhase] = useState<Phase>("idle");
  const [round, setRound] = useState(1);
  const [left, setLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const wakeRef = useRef<{ release: () => Promise<void> } | null>(null);

  useEffect(() => {
    if (preset === "tabata") { setWork("20"); setRest("10"); setRounds("8"); }
    if (preset === "emom") { setWork("40"); setRest("20"); setRounds("10"); }
  }, [preset]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setLeft((l) => {
        if (l > 1) {
          if (l <= 4) navigator.vibrate?.(40);
          return l - 1;
        }
        navigator.vibrate?.([150, 80, 150]);
        if (phase === "work") {
          if (round >= Number(rounds)) {
            setPhase("done");
            setRunning(false);
            return 0;
          }
          setPhase("rest");
          return Number(rest);
        }
        setPhase("work");
        setRound((r) => r + 1);
        return Number(work);
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, phase, round, rounds, rest, work]);

  useEffect(() => {
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    if (running && nav.wakeLock) nav.wakeLock.request("screen").then((l) => (wakeRef.current = l)).catch(() => {});
    if (!running) wakeRef.current?.release().catch(() => {});
  }, [running]);

  function start() {
    if (phase === "idle" || phase === "done") {
      setPhase("work");
      setRound(1);
      setLeft(Number(work));
    }
    setRunning(true);
  }
  function reset() {
    setRunning(false);
    setPhase("idle");
    setRound(1);
    setLeft(0);
  }

  const total = phase === "work" ? Number(work) : Number(rest);
  const totalTime = Number(rounds) * (Number(work) + Number(rest)) - Number(rest);
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Interval timer</h1>
      <Card className="grid place-items-center py-8">
        <ProgressRing value={phase === "idle" || phase === "done" ? 0 : left / total} size={240} stroke={16} color={phase === "rest" ? "var(--color-cyan)" : "var(--color-lime)"}>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted">{phase === "idle" ? "Ready" : phase === "done" ? "Done! 🎉" : phase === "work" ? "Work" : "Rest"}</p>
            <p className="font-display text-6xl font-bold tabular">{phase === "idle" ? work : left}</p>
            <p className="text-sm text-muted">Round {Math.min(round, Number(rounds))} / {rounds}</p>
          </div>
        </ProgressRing>
        <div className="mt-6 flex gap-3">
          <Button variant="secondary" size="icon" onClick={reset} aria-label="Reset"><RotateCcw className="h-5 w-5" /></Button>
          <Button size="lg" className="w-40" onClick={() => (running ? setRunning(false) : start())}>{running ? <><Pause className="h-5 w-5" /> Pause</> : <><Play className="h-5 w-5" /> {phase === "idle" || phase === "done" ? "Start" : "Resume"}</>}</Button>
        </div>
      </Card>
      <Card className="space-y-3">
        <Segmented value={preset} onChange={setPreset} size="sm" options={[{ value: "tabata", label: "Tabata" }, { value: "emom", label: "40/20" }, { value: "custom", label: "Custom" }]} />
        <div className="grid grid-cols-3 gap-3">
          <Field label="Work"><NumberInput suffix="s" value={work} onChange={(e) => { setPreset("custom"); setWork(e.target.value); }} disabled={running} /></Field>
          <Field label="Rest"><NumberInput suffix="s" value={rest} onChange={(e) => { setPreset("custom"); setRest(e.target.value); }} disabled={running} /></Field>
          <Field label="Rounds"><NumberInput value={rounds} onChange={(e) => { setPreset("custom"); setRounds(e.target.value); }} disabled={running} /></Field>
        </div>
        <p className="text-xs text-muted">Total {Math.floor(totalTime / 60)}:{String(totalTime % 60).padStart(2, "0")} min. The screen stays awake while the timer runs (where supported). Log the session afterwards under Activity → High intensity.</p>
      </Card>
    </div>
  );
}
