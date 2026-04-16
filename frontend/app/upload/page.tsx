"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Search, Sparkles, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UploadedFileRow } from "../components/uploaded-file-row";
import {
  API_ENDPOINTS,
  fetchJson,
  getFileTypeFromName,
  getRelativeSize,
  mapDocumentFromApi,
  safeId,
  getDocumentChunks,
} from "@/lib/api";
import type {
  DocumentChunkApiResponse,
  DocumentListApiItem,
  UploadApiResponse,
  UploadedFile,
} from "@/lib/types";
import { DocumentChunksSheet } from "../components/document-chunks-sheet";

export default function UploadPage() {
  const [files, setFiles] = React.useState<UploadedFile[]>([]);
  const [searchValue, setSearchValue] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = React.useState<UploadedFile | null>(null);
  const [chunkViewerOpen, setChunkViewerOpen] = React.useState(false);
  const [chunksLoading, setChunksLoading] = React.useState(false);
  const [chunkData, setChunkData] = React.useState<DocumentChunkApiResponse | null>(null);

  const filteredFiles = React.useMemo(() => {
    if (!searchValue.trim()) return files;
    return files.filter((file) =>
      file.name.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [files, searchValue]);

  const loadDocuments = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchJson<
        DocumentListApiItem[] | { items?: DocumentListApiItem[]; documents?: DocumentListApiItem[] }
      >(API_ENDPOINTS.documents, { cache: "no-store" });

      const items = Array.isArray(response)
        ? response
        : response.items ?? response.documents ?? [];

      setFiles(items.map(mapDocumentFromApi));
    } catch (error) {
      console.error("Failed to load documents", error);
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleViewChunks = React.useCallback(async (file: UploadedFile) => {
    setSelectedFile(file);
    setChunkViewerOpen(true);
    setChunksLoading(true);
    setChunkData(null);

    try {
      const response = await getDocumentChunks(file.name);
      setChunkData(response);
    } catch (error) {
      console.error("Failed to load chunks", error);
      setChunkData({
        filename: file.name,
        total_chunks: 0,
        chunks: [],
      });
    } finally {
      setChunksLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const uploadDocuments = React.useCallback(
    async (incomingFiles: FileList | File[]) => {
      const filesToUpload = Array.from(incomingFiles);

      if (!filesToUpload.length) return;

      const optimisticFiles: UploadedFile[] = filesToUpload.map((file) => ({
        id: safeId(),
        name: file.name,
        type: getFileTypeFromName(file.name),
        size: getRelativeSize(file.size),
        status: "Uploaded",
      }));

      setFiles((prev) => [...optimisticFiles, ...prev]);

      try {
        const results: UploadApiResponse[] = [];

        for (const file of filesToUpload) {
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch(API_ENDPOINTS.upload, {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload failed for ${file.name}: ${response.status} ${errorText}`);
          }

          const result = (await response.json()) as UploadApiResponse;
          results.push(result);
        }

        setFiles((prev) =>
          prev.map((file) => {
            const matched = results.find((item) => (item.filename ?? "") === file.name);
            if (!matched) return file;

            return {
              ...file,
              status: "Ready",
              chunksAdded: matched.chunks_added ?? matched.chunksAdded,
            };
          })
        );

        setUploadOpen(false);
        await loadDocuments();
      } catch (error) {
        console.error("Upload failed", error);
        setFiles((prev) =>
          prev.filter(
            (file) => !optimisticFiles.some((optimistic) => optimistic.id === file.id)
          )
        );
      }
    },
    [loadDocuments]
  );

  return (
    <div className="min-h-screen bg-[#212121] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.05),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.02),transparent_22%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 md:px-6">
        <header className="mb-6 flex items-center justify-between rounded-2xl border border-white/10 bg-[#171717]/80 px-4 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight text-white">
                Document Manager
              </p>
              <p className="text-xs text-zinc-400">
                Manage uploaded knowledge sources
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-zinc-300 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to chat
            </Link>

            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-500">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Documents
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-2xl rounded-2xl border-white/10 bg-[#171717] text-white">
                <DialogHeader>
                  <DialogTitle className="text-xl text-white">
                    Upload project documents
                  </DialogTitle>
                  <DialogDescription className="text-zinc-400">
                    Add PDFs, CSVs, or spreadsheets to make them available for retrieval and analysis.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={(e) => {
                      e.preventDefault();
                      void uploadDocuments(e.dataTransfer.files);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    className="flex min-h-[180px] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/12 bg-[#1f1f1f] px-6 py-10 text-center transition-colors hover:border-white/20 hover:bg-[#242424]"
                  >
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[#2a2a2a] text-zinc-300">
                      <Upload className="h-6 w-6" />
                    </div>

                    <p className="text-sm font-medium text-white">
                      Drag and drop files here
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      Supports PDF, CSV, XLS, XLSX · Multiple files allowed
                    </p>

                    <Button
                      type="button"
                      variant="secondary"
                      className="mt-5 rounded-xl border border-white/10 bg-[#2a2a2a] text-zinc-100 hover:bg-[#2f2f2f]"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      Choose Files
                    </Button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.csv,.xls,.xlsx"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) void uploadDocuments(e.target.files);
                    }}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <section className="rounded-2xl border border-white/10 bg-[#171717]/80 p-4 backdrop-blur">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold text-white">Uploaded Documents</h1>
              <p className="text-sm text-zinc-400">
                Documents returned from the API are listed here.
              </p>
            </div>

            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search documents"
                className="h-10 rounded-xl border-white/10 bg-[#2a2a2a] pl-9 text-sm text-white placeholder:text-zinc-500"
              />
            </div>
          </div>

          <ScrollArea className="h-[70vh] pr-2">
            <div className="grid gap-3">
              {isLoading ? (
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#1f1f1f] px-3 py-4 text-sm text-zinc-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading uploaded documents...
                </div>
              ) : filteredFiles.length > 0 ? (
                filteredFiles.map((file) => (
                  <UploadedFileRow
                    key={file.id}
                    file={file}
                    onViewChunks={handleViewChunks}
                  />
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 bg-[#1f1f1f]/70 px-3 py-6 text-sm text-zinc-400">
                  No uploaded documents returned from the API yet.
                </div>
              )}
            </div>
          </ScrollArea>
        </section>

        <DocumentChunksSheet
          open={chunkViewerOpen}
          onOpenChange={setChunkViewerOpen}
          isLoading={chunksLoading}
          fileName={selectedFile?.name ?? null}
          data={chunkData}
        />
      </div>
    </div>
  );
}