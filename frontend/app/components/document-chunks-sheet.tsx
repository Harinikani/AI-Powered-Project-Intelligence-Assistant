"use client";

import * as React from "react";
import { Loader2, FileText, Database } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { DocumentChunkApiResponse } from "@/lib/types";

type DocumentChunksSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  fileName: string | null;
  data: DocumentChunkApiResponse | null;
};

export function DocumentChunksSheet({
  open,
  onOpenChange,
  isLoading,
  fileName,
  data,
}: DocumentChunksSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full border-white/10 bg-[#171717] text-white sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="text-white">Document Chunks</SheetTitle>
          <SheetDescription className="text-zinc-400">
            {fileName ? `Viewing chunks for ${fileName}` : "Select a document to inspect its chunks"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#1f1f1f] px-4 py-4 text-sm text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading chunks...
            </div>
          ) : data ? (
            <>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#1f1f1f] px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{data.filename}</p>
                  <p className="text-xs text-zinc-400">Chunk inspection view</p>
                </div>
                <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                  {data.total_chunks} chunks
                </Badge>
              </div>

              <ScrollArea className="h-[75vh] pr-2">
                <div className="space-y-3">
                  {data.chunks.map((chunk) => (
                    <div
                      key={`${data.filename}-${chunk.chunk_index}`}
                      className="rounded-2xl border border-white/10 bg-[#1f1f1f] p-4"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#2a2a2a] text-zinc-300">
                            {chunk.row !== null ? (
                              <Database className="h-4 w-4" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">
                              Chunk {chunk.chunk_index}
                            </p>
                            <p className="text-xs text-zinc-400">
                              {chunk.page !== null
                                ? `Page ${chunk.page}`
                                : chunk.row !== null
                                  ? `Row ${chunk.row}`
                                  : "No page/row metadata"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-[#151515] p-3">
                        <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-200">
                          {chunk.preview}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-[#1f1f1f]/70 px-4 py-6 text-sm text-zinc-400">
              No chunk data loaded yet.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}