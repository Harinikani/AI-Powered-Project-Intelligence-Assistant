import type { Message } from "@/lib/types";

export function UserMessageBubble({ message }: { message: Message }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-2xl rounded-2xl border border-white/10 bg-[#2f2f2f]/95 px-4 py-3 text-sm text-zinc-100 shadow-none">
        {message.content}
      </div>
    </div>
  );
}