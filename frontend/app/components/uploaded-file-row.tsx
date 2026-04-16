import { FileSpreadsheet, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UploadedFile } from "@/lib/types";

const statusClasses = {
  Uploaded: "border-white/10 bg-[#2a2a2a] text-zinc-300",
  Processing: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  Indexed: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  Ready: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
} as const;

type UploadedFileRowProps = {
  file: UploadedFile;
  onViewChunks?: (file: UploadedFile) => void;
};

export function UploadedFileRow({ file, onViewChunks }: UploadedFileRowProps) {
  const icon =
    file.type === "pdf" ? <FileText className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" />;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#1f1f1f] px-3 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#2a2a2a] text-zinc-300">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{file.name}</p>
        <p className="text-xs text-zinc-400">{file.size}</p>
      </div>

      <div className="flex items-center gap-2">
        <Badge className={cn("rounded-full border", statusClasses[file.status])}>
          {file.status}
        </Badge>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onViewChunks?.(file)}
          className="border-white/10 bg-[#2a2a2a] text-zinc-200 hover:bg-[#313131]"
        >
          View Chunks
        </Button>
      </div>
    </div>
  );
}