"use client";

import { Database, Loader2, MessageSquarePlus, Send, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge, Button, Card, Notice } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { useAppState } from "@/components/providers";
import { api, useApi } from "@/lib/client/api";
import { cn } from "@/lib/utils";

interface Message { id: number; role: "user" | "assistant"; content: string; toolCalls: { name: string; input: unknown }[]; createdAt: string }

const SUGGESTIONS = [
  "How much protein did I eat today?",
  "What should I eat for dinner?",
  "How much fibre am I missing?",
  "Should I walk another 2 km?",
  "Am I maintaining a calorie deficit this week?",
  "Why has my weight plateaued?",
  "Suggest a high-protein vegetarian Indian meal",
  "Compare my last two weeks",
  "What should I train tomorrow?",
  "How am I progressing toward visible abs?",
];

const TOOL_LABEL: Record<string, string> = {
  get_profile_and_targets: "profile & targets",
  get_day_log: "food & activity log",
  get_daily_summaries: "daily summaries",
  get_weight_and_body_trends: "weight trend",
  get_nutrition_insights: "nutrition insights",
  search_foods: "food database",
  find_recipes: "recipe library",
  get_training: "workouts",
};

/** Minimal, safe markdown: paragraphs, bullets and **bold** (no HTML injection). */
function Rich({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  const inline = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith("**") && part.endsWith("**") ? <b key={i}>{part.slice(2, -2)}</b> : <span key={i}>{part}</span>));
  return (
    <div className="space-y-2">
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (lines.every((l) => /^\s*([-*•]|\d+\.)\s/.test(l))) {
          return <ul key={i} className="list-disc space-y-1 pl-5">{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*([-*•]|\d+\.)\s/, ""))}</li>)}</ul>;
        }
        return <p key={i} className="whitespace-pre-wrap">{inline(b.replace(/^#+\s*/gm, ""))}</p>;
      })}
    </div>
  );
}

export default function CoachPage() {
  const toast = useToast();
  const { online } = useAppState();
  const list = useApi<{ conversations: { id: number; title: string; updatedAt: string }[]; enabled: boolean }>("/coach");
  const [convId, setConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, sending]);

  async function open(id: number) {
    const r = await api.get<{ messages: Message[] }>(`/coach/${id}`);
    setConvId(id);
    setMessages(r.messages);
    setHistoryOpen(false);
  }

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || sending) return;
    setInput("");
    setMessages((m) => [...m, { id: -Date.now(), role: "user", content: msg, toolCalls: [], createdAt: new Date().toISOString() }]);
    setSending(true);
    try {
      const r = await api.post<{ conversationId: number; message: Message }>("/coach", { conversationId: convId, message: msg });
      setConvId(r.conversationId);
      setMessages((m) => [...m, r.message]);
      list.mutate();
    } catch (e) {
      toast((e as Error).message, "error");
      setMessages((m) => m.slice(0, -1));
      setInput(msg);
    } finally {
      setSending(false);
    }
  }

  const enabled = list.data?.enabled !== false;
  return (
    <div className="flex min-h-[calc(100dvh-12rem)] flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-lime/30 to-cyan/20 text-lime"><Sparkles className="h-5 w-5" /></div>
          <div>
            <h1 className="font-display text-xl font-bold">AI Coach</h1>
            <p className="text-xs text-muted">Answers from your real logs · not medical advice</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <Button size="iconSm" variant="secondary" onClick={() => setHistoryOpen(true)} aria-label="Conversation history"><Database className="h-4 w-4" /></Button>
          <Button size="iconSm" variant="secondary" onClick={() => { setConvId(null); setMessages([]); }} aria-label="New conversation"><MessageSquarePlus className="h-4 w-4" /></Button>
        </div>
      </div>

      {!enabled ? <Notice tone="warn">The AI coach isn&apos;t configured on this server (no ANTHROPIC_API_KEY). Everything else in the app works without it.</Notice> : null}
      {!online ? <Notice tone="warn">The coach needs an internet connection.</Notice> : null}

      <div className="flex-1 space-y-3 pb-4">
        {!messages.length ? (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted">Ask anything about your nutrition, training or progress. I&apos;ll look at your actual data first.</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} disabled={!enabled || !online} className="rounded-2xl border border-line bg-surface px-3.5 py-2 text-left text-sm hover:border-lime/40 disabled:opacity-50">{s}</button>
              ))}
            </div>
          </div>
        ) : null}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[88%] rounded-3xl px-4 py-3 text-[15px] leading-relaxed", m.role === "user" ? "rounded-br-lg bg-lime text-lime-ink" : "rounded-bl-lg border border-line bg-surface")}>
              {m.role === "assistant" ? <Rich text={m.content} /> : m.content}
              {m.role === "assistant" && m.toolCalls.length ? (
                <div className="mt-2 flex flex-wrap gap-1 border-t border-line pt-2">
                  <span className="text-[11px] text-faint">Data used:</span>
                  {[...new Set(m.toolCalls.map((t) => t.name))].map((t) => <Badge key={t}>{TOOL_LABEL[t] ?? t}</Badge>)}
                </div>
              ) : null}
            </div>
          </div>
        ))}
        {sending ? (
          <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Checking your data…</div>
        ) : null}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="sticky bottom-24 z-10 flex items-end gap-2 rounded-3xl border border-line bg-surface/95 p-2 backdrop-blur lg:bottom-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          rows={1}
          maxLength={2000}
          placeholder="Ask your coach…"
          aria-label="Message"
          className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 focus:outline-none"
          disabled={!enabled}
        />
        <Button type="submit" size="icon" disabled={!input.trim() || sending || !enabled || !online} aria-label="Send"><Send className="h-5 w-5" /></Button>
      </form>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen} title="Conversations">
        <ul className="space-y-1.5">
          {(list.data?.conversations ?? []).map((c) => (
            <li key={c.id} className="flex items-center gap-2">
              <button onClick={() => open(c.id)} className="flex-1 truncate rounded-2xl bg-surface-2 px-3.5 py-3 text-left text-sm hover:bg-surface-3">{c.title}</button>
              <button onClick={async () => { await api.del(`/coach/${c.id}`); list.mutate(); if (convId === c.id) { setConvId(null); setMessages([]); } }} className="grid h-10 w-10 place-items-center rounded-xl text-faint hover:text-red" aria-label="Delete conversation"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
          {!list.data?.conversations.length ? <Card className="text-sm text-muted">No conversations yet.</Card> : null}
        </ul>
      </Sheet>
    </div>
  );
}
