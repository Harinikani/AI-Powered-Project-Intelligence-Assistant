"use client";

import * as React from "react";
import { Search, Sparkles } from "lucide-react";

import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ChatComposer } from "./components/chat-composer";
import { AssistantMessageCard } from "./components/assistant-message-card";
import { UserMessageBubble } from "./components/user-message-bubble";
import { EmptyState } from "./components/empty-state";
import { SidebarChatItem } from "./components/sidebar-chat-item";

import {
  API_ENDPOINTS,
  fetchJson,
  formatRelativeTime,
  mapChatFromApi,
  normalizeAgent,
  normalizeCitationLocation,
  normalizeCitationType,
  safeId,
  askQuestion,
} from "@/lib/api";

import type {
  ChatListApiItem,
  ChatSession,
  Citation,
  Message,
} from "@/lib/types";

const initialMessages: Message[] = [];

export default function HomePage() {
  const [sessionId, setSessionId] = React.useState<string>(() => safeId());
  const [chats, setChats] = React.useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = React.useState<string | null>(null);
  const [searchValue, setSearchValue] = React.useState("");
  const [messages, setMessages] = React.useState<Message[]>(initialMessages);
  const [prompt, setPrompt] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [selectedCitation, setSelectedCitation] = React.useState<Citation | null>(null);
  const [isChatsLoading, setIsChatsLoading] = React.useState(true);
  const [historyError, setHistoryError] = React.useState<string | null>(null);

  const filteredChats = React.useMemo(() => {
    if (!searchValue.trim()) return chats;
    return chats.filter((chat) =>
      chat.title.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [chats, searchValue]);

  const selectedChat = chats.find((chat) => chat.id === activeChatId) ?? null;
  const hasMessages = messages.length > 0;

  const loadChats = React.useCallback(async () => {
    setIsChatsLoading(true);

    try {
      const response = await fetchJson<
        ChatListApiItem[] | {
          items?: ChatListApiItem[];
          chats?: ChatListApiItem[];
          sessions?: ChatListApiItem[];
        }
      >(API_ENDPOINTS.chats, { cache: "no-store" });

      const items = Array.isArray(response)
        ? response
        : response.items ?? response.chats ?? response.sessions ?? [];

      const mapped = items.map(mapChatFromApi);

      setChats(mapped);
      setHistoryError(null);
    } catch (error) {
      console.error("Failed to load chats", error);
      setChats([]);
      setHistoryError("Could not load recent chats.");
    } finally {
      setIsChatsLoading(false);
    }
  }, []);

  const loadSessionMessages = React.useCallback(async (chatId: string) => {
    try {
      const response = await fetchJson<{ session_id: string; messages: any[] }>(
        `${API_ENDPOINTS.chats}/${chatId}`,
        { cache: "no-store" }
      );

      const formattedMessages: Message[] = (response.messages ?? []).flatMap((item: any) => [
        {
          id: `${item.id}-user`,
          role: "user",
          content: item.question,
          createdAt: formatRelativeTime(item.timestamp),
        },
        {
          id: `${item.id}-assistant`,
          role: "assistant",
          content: item.answer,
          createdAt: formatRelativeTime(item.timestamp),
          agentUsed: normalizeAgent(item.agent),
          citations: [],
        },
      ]);

      setMessages(formattedMessages);
      setSessionId(chatId);
      setActiveChatId(chatId);
      setSelectedCitation(null);
    } catch (error) {
      console.error("Failed to load session messages", error);
    }
  }, []);

  React.useEffect(() => {
    void loadChats();
  }, [loadChats]);

  const handleSend = async (value?: string) => {
    const nextPrompt = (value ?? prompt).trim();
    if (!nextPrompt || isSending) return;

    const userMessage: Message = {
      id: safeId(),
      role: "user",
      content: nextPrompt,
      createdAt: formatRelativeTime(new Date().toISOString()),
    };

    setMessages((prev) => [...prev, userMessage]);
    setPrompt("");
    setIsSending(true);

    try {
      const response = await askQuestion({
        question: nextPrompt,
        session_id: sessionId,
      });

      const assistantMessage: Message = {
        id: safeId(),
        role: "assistant",
        content: response.answer,
        createdAt: formatRelativeTime(new Date().toISOString()),
        agentUsed: normalizeAgent(response.agent_used),
        citations: (response.citations ?? []).map((citation) => ({
          id: citation.id ?? safeId(),
          source: citation.source ?? "Unknown source",
          location: normalizeCitationLocation(citation),
          snippet: citation.snippet ?? "No snippet available.",
          type: normalizeCitationType(citation.type, citation.source),
        })),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // keep this conversation tied to the same session
      setActiveChatId(sessionId);

      await loadChats();
    } catch (error) {
      console.error("Ask failed", error);
      setMessages((prev) => [
        ...prev,
        {
          id: safeId(),
          role: "assistant",
          content: "Something went wrong while fetching the answer. Please try again.",
          createdAt: formatRelativeTime(new Date().toISOString()),
          agentUsed: "Router Agent",
          citations: [],
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleNewChat = () => {
    const newSessionId = safeId();
    setSessionId(newSessionId);
    setActiveChatId(null);
    setMessages([]);
    setSelectedCitation(null);
    setPrompt("");
  };

  return (
    <div className="min-h-screen bg-[#212121] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.05),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.02),transparent_22%)]" />

      <div className="relative flex h-screen overflow-hidden">
        <aside className="hidden h-full w-[300px] flex-col border-r border-white/10 bg-[#171717]/95 md:flex">
          <div className="border-b border-white/10 p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-tight text-white">Project Intelligence</p>
                <p className="text-xs text-zinc-400">AI-powered assistant</p>
              </div>
            </div>

            <div className="space-y-2">
              <a
                href="/upload"
                className="flex h-11 w-full items-center justify-start gap-2 rounded-xl bg-emerald-600 px-4 text-sm text-white transition hover:bg-emerald-500"
              >
                Upload Document
              </a>

              <button
                type="button"
                onClick={handleNewChat}
                className="flex h-11 w-full items-center justify-start gap-2 rounded-xl border border-white/10 bg-[#2a2a2a] px-4 text-sm text-zinc-100 transition hover:bg-[#2f2f2f]"
              >
                New Chat
              </button>
            </div>
          </div>

          <div className="p-4 pb-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search chats"
                className="h-10 rounded-xl border-white/10 bg-[#2a2a2a] pl-9 text-sm text-white placeholder:text-zinc-500"
              />
            </div>
          </div>

          <Separator className="bg-white/10" />

          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Recent Chats</p>
            <Badge className="rounded-full border border-white/10 bg-[#2a2a2a] text-zinc-300">
              {isChatsLoading ? "..." : filteredChats.length}
            </Badge>
          </div>

          <ScrollArea className="flex-1 px-3 pb-3">
            <div className="space-y-1.5">
              {isChatsLoading ? (
                <div className="rounded-xl border border-white/10 bg-[#1f1f1f] px-3 py-4 text-sm text-zinc-400">
                  Loading recent chats...
                </div>
              ) : filteredChats.length > 0 ? (
                filteredChats.map((chat) => (
                  <SidebarChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={activeChatId === chat.id}
                    onClick={() => void loadSessionMessages(chat.id)}
                  />
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 bg-[#1f1f1f]/70 px-3 py-4 text-sm text-zinc-400">
                  {historyError ?? "No recent chats."}
                </div>
              )}
            </div>
          </ScrollArea>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col bg-[#212121]">
          <header className="flex h-16 items-center border-b border-white/10 bg-[#171717]/70 px-4 backdrop-blur md:px-6">
            <div>
              <h2 className="text-sm font-semibold text-white">
                {selectedChat?.title ?? "Project Intelligence Assistant"}
              </h2>
              <p className="text-xs text-zinc-400">Ask questions across uploaded project documents</p>
            </div>
          </header>

          <div className="flex min-h-0 flex-1">
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex-1 min-h-0 overflow-hidden">
                <ScrollArea className="h-full px-4 py-6 md:px-6 lg:px-8">
                  {!hasMessages ? (
                    <EmptyState onPrompt={(value) => void handleSend(value)} />
                  ) : (
                    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
                      {messages.map((message) =>
                        message.role === "assistant" ? (
                          <AssistantMessageCard
                            key={message.id}
                            message={message}
                            selectedCitationId={selectedCitation?.id}
                            onSelectCitation={setSelectedCitation}
                          />
                        ) : (
                          <UserMessageBubble key={message.id} message={message} />
                        )
                      )}

                      {isSending && (
                        <div className="flex justify-start">
                          <div className="rounded-2xl border border-white/10 bg-[#2a2a2a]/90 px-4 py-3 text-sm text-zinc-300">
                            Thinking through uploaded sources...
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </div>

              <div className="border-t border-white/10 bg-[#171717]/90 px-4 py-4 backdrop-blur md:px-6">
                <div className="mx-auto max-w-5xl">
                  <ChatComposer
                    value={prompt}
                    onChange={setPrompt}
                    onSend={() => void handleSend()}
                    isSending={isSending}
                  />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}