"use client";

import { FileSpreadsheet, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Citation } from "@/lib/types";

function getFileIcon(type: Citation["type"]) {
  return type === "spreadsheet" ? <FileSpreadsheet className="h-4 w-4" /> : <FileText className="h-4 w-4" />;
}

export function CitationCard({
  citation,
  onSelect,
  active,
}: {
  citation: Citation;
  onSelect: (citation: Citation) => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(citation)}
      className={cn(
        "w-full rounded-xl border p-3 text-left transition-all",
        active
          ? "border-emerald-500/25 bg-emerald-500/10"
          : "border-white/10 bg-[#1f1f1f] hover:border-white/15 hover:bg-[#2a2a2a]"
      )}
    >
      <div className="mb-2 flex items-start gap-3">
        <div className="mt-0.5 text-zinc-400">{getFileIcon(citation.type)}</div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{citation.source}</p>
          <p className="text-xs text-zinc-400">{citation.location}</p>
        </div>
      </div>
      <p className="line-clamp-2 text-xs leading-5 text-zinc-300">{citation.snippet}</p>
    </button>
  );
}