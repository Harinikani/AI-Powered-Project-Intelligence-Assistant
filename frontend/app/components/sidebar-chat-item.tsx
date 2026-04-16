import * as React from "react";
import type { ChatSession } from "@/lib/types";

type SidebarChatItemProps = {
  chat: ChatSession;
  isActive?: boolean;
  onClick?: () => void;
};

export function SidebarChatItem({
  chat,
  isActive = false,
  onClick,
}: SidebarChatItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-xl border px-3 py-3 text-left transition",
        isActive
          ? "border-emerald-500/30 bg-emerald-500/10"
          : "border-white/10 bg-[#1f1f1f] hover:bg-[#262626]",
      ].join(" ")}
    >
      <div className="line-clamp-2 text-sm font-medium text-white">
        {chat.title}
      </div>
      <div className="mt-1 text-xs text-zinc-500">
        {chat.messageCount} message{chat.messageCount === 1 ? "" : "s"}
      </div>
    </button>
  );
}