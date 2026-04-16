import type {
  AgentType,
  ChatListApiItem,
  ChatSession,
  CitationType,
  DocumentListApiItem,
  FileStatus,
  UploadedFile,
  UploadedFileType,
  AskApiResponse, AskRequest
} from "./types";

export function getFileTypeFromName(name: string): UploadedFileType {
  const lower = name.toLowerCase();

  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".csv")) return "csv";
  return "xlsx";
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export const API_ENDPOINTS = {
  ask: `${API_BASE_URL}/ask`,
  upload: `${API_BASE_URL}/upload`,
  chats: `${API_BASE_URL}/chat-sessions`,
  documents: `${API_BASE_URL}/documents`,
} as const;

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getRelativeSize(value: number | string | undefined): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") {
    const mb = Math.max(1, Math.round(value / 1024 / 1024));
    return `${mb} MB`;
  }
  return "—";
}

export function safeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function formatRelativeTime(value?: string) {
  if (!value) return "Just now";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString();
}

export function normalizeAgent(agent: string | undefined): AgentType {
  const lower = (agent ?? "").toLowerCase();

  if (lower.includes("data")) return "Data Analysis Agent";
  if (lower.includes("router")) return "Router Agent";
  return "Document Q&A Agent";
}

export function normalizeCitationType(type: string | undefined, source: string | undefined): CitationType {
  const value = (type ?? source ?? "").toLowerCase();

  if (value.includes("sheet") || value.includes("csv") || value.includes("xls")) {
    return "spreadsheet";
  }

  return "document";
}

export function normalizeCitationLocation(
  item: { location?: string; page?: number | string; section?: string; row?: number | string } | undefined
): string {
  if (!item) return "Unknown location";
  if (item.location) return item.location;
  if (item.page !== undefined) return `Page ${item.page}`;
  if (item.section) return `Section: ${item.section}`;
  if (item.row !== undefined) return `Row ${item.row}`;
  return "Unknown location";
}

export function mapChatFromApi(item: any) {
  return {
    id: item.id ?? item.session_id,
    title: item.title ?? "Untitled chat",
    createdAt: item.created_at ?? item.createdAt ?? "",
    updatedAt: item.last_updated ?? item.updatedAt ?? item.created_at ?? "",
    messageCount: item.message_count ?? item.messageCount ?? 0,
  };
}

export function mapDocumentFromApi(item: DocumentListApiItem): UploadedFile {
  const fileName = item.filename ?? item.name ?? "Untitled document";
  const rawStatus = (item.status ?? "Ready").toLowerCase();

  const status: FileStatus = rawStatus.includes("process")
    ? "Processing"
    : rawStatus.includes("index")
      ? "Indexed"
      : rawStatus.includes("upload")
        ? "Uploaded"
        : "Ready";

  return {
    id: String(item.id ?? safeId()),
    name: fileName,
    type: getFileTypeFromName(fileName),
    size: getRelativeSize(item.size),
    status,
    chunksAdded: item.chunks_added ?? item.chunksAdded,
  };
}

export function getDocumentChunksEndpoint(filename: string) {
  const encoded = encodeURIComponent(filename);
  return `${API_BASE_URL}/documents/${encoded}/chunks`;
}

export type DocumentChunkApiResponse = {
  filename: string;
  total_chunks: number;
  chunks: Array<{
    chunk_index: number;
    page: number | null;
    row: number | null;
    preview: string;
  }>;
};

export async function getDocumentChunks(filename: string): Promise<DocumentChunkApiResponse> {
  return fetchJson<DocumentChunkApiResponse>(getDocumentChunksEndpoint(filename), {
    cache: "no-store",
  });
}


export async function askQuestion(payload: AskRequest): Promise<AskApiResponse> {
  return fetchJson<AskApiResponse>(API_ENDPOINTS.ask, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}