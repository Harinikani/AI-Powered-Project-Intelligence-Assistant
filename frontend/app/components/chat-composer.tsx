"use client";

import { SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isSending?: boolean;
};

export function ChatComposer({ value, onChange, onSend, isSending }: ChatComposerProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#2a2a2a] p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ask about project risks, budgets, milestones, blockers, or compare uploaded documents..."
        className="min-h-[88px] resize-none border-0 bg-transparent px-2 py-2 text-sm leading-6 text-white placeholder:text-zinc-500 focus-visible:ring-0"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
      />

      <div className="mt-2 flex justify-end px-2 pb-1">
        <Button
          onClick={onSend}
          disabled={!value.trim() || isSending}
          className="h-10 rounded-xl bg-emerald-600 px-4 text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          <SendHorizonal className="mr-2 h-4 w-4" />
          Send
        </Button>
      </div>
    </div>
  );
}