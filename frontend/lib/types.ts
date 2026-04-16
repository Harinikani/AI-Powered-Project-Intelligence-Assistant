export type AgentType = "Router Agent" | "Document Q&A Agent" | "Data Analysis Agent";
export type FileStatus = "Uploaded" | "Processing" | "Indexed" | "Ready";
export type UploadedFileType = "pdf" | "csv" | "xlsx";
export type CitationType = "document" | "spreadsheet";

export type UploadedFile = {
  id: string;
  name: string;
  type: UploadedFileType;
  size: string;
  status: FileStatus;
  chunksAdded?: number;
};

export type Citation = {
  id: string;
  source: string;
  location: string;
  snippet: string;
  type: CitationType;
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  agentUsed?: AgentType;
  citations?: Citation[];
  createdAt: string;
};

export type ChatSession = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
};

export type AskApiResponse = {
  question: string;
  answer: string;
  agent_used: string;
  session_id?: string;
  citations?: Array<{
    id?: string;
    source?: string;
    location?: string;
    snippet?: string;
    type?: string;
    page?: number | string;
    section?: string;
    row?: number | string;
  }>;
};

export type UploadApiResponse = {
  message?: string;
  filename?: string;
  chunks_added?: number;
  chunksAdded?: number;
  status?: string;
};

export type ChatListApiItem = {
  id?: string;
  session_id?: string;
  title?: string;
  created_at?: string;
  createdAt?: string;
  last_updated?: string;
  updatedAt?: string;
  message_count?: number;
  messageCount?: number;
};

export type DocumentListApiItem = {
  id?: string | number;
  filename?: string;
  name?: string;
  status?: string;
  chunks_added?: number;
  chunksAdded?: number;
  size?: number | string;
};

export type DocumentChunk = {
  chunk_index: number;
  page: number | null;
  row: number | null;
  preview: string;
};

export type DocumentChunkApiResponse = {
  filename: string;
  total_chunks: number;
  chunks: DocumentChunk[];
};

export type AskRequest = {
  question: string;
  session_id: string;
};

