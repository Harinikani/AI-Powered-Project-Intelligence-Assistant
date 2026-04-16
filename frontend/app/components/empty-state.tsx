"use client";

import { ChevronRight, Sparkles } from "lucide-react";

const suggestionPrompts = [
  "Summarize the latest project risks",
  "What is the current budget status?",
  "Compare the status report against the financial summary",
  "List major issues mentioned across uploaded documents",
];

export function EmptyState({ onPrompt }: { onPrompt: (value: string) => void }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 shadow-[0_0_40px_rgba(16,185,129,0.10)]">
        <Sparkles className="h-7 w-7" />
      </div>
      <h1 className="text-3xl font-semibold tracking-tight text-white">AI Project Intelligence Assistant</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
        Upload project PDFs, spreadsheets, and structured documents, then ask questions across them in a single conversation.
      </p>

      <div className="mt-8 grid w-full gap-3 md:grid-cols-2">
        {suggestionPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onPrompt(prompt)}
            className="rounded-2xl border border-white/10 bg-[#2a2a2a]/90 p-4 text-left transition-all hover:border-white/15 hover:bg-[#2f2f2f]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white">{prompt}</p>
                <p className="mt-1 text-xs text-zinc-400">Ask the assistant using indexed project knowledge.</p>
              </div>
              <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-zinc-500" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}