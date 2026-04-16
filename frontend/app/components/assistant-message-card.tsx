"use client";

import { Bot } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CitationCard } from "./citation-card";
import type { Citation, Message } from "@/lib/types";

const agentClasses = {
  "Router Agent": "border-violet-500/20 bg-violet-500/10 text-violet-300",
  "Document Q&A Agent": "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  "Data Analysis Agent": "border-teal-500/20 bg-teal-500/10 text-teal-300",
} as const;

export function AssistantMessageCard({
  message,
  onSelectCitation,
  selectedCitationId,
}: {
  message: Message;
  onSelectCitation: (citation: Citation) => void;
  selectedCitationId?: string;
}) {
  return (
    <div className="flex justify-start">
      <Card className="w-full max-w-4xl rounded-2xl border-white/10 bg-[#2a2a2a]/90 shadow-none backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base text-white">Assistant Response</CardTitle>
              <p className="text-xs text-zinc-400">{message.createdAt}</p>
            </div>
          </div>

          {message.agentUsed && (
            <Badge className={`rounded-full border px-3 py-1 ${agentClasses[message.agentUsed]}`}>
              {message.agentUsed}
            </Badge>
          )}
        </CardHeader>

        <CardContent className="space-y-5 pt-5">
          <div className="rounded-2xl border border-white/10 bg-[#1f1f1f]/90 p-4">
            <p className="whitespace-pre-line text-sm leading-7 text-zinc-100">{message.content}</p>
          </div>

          {!!message.citations?.length && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Source Citations</h3>
                <span className="text-xs text-zinc-400">{message.citations.length} references</span>
              </div>

              <Accordion type="single" collapsible className="rounded-2xl border border-white/10 bg-[#1f1f1f]/70 px-4">
                <AccordionItem value="citations" className="border-none">
                  <AccordionTrigger className="py-4 text-sm text-zinc-200 hover:no-underline">
                    View supporting evidence
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {message.citations.map((citation) => (
                        <CitationCard
                          key={citation.id}
                          citation={citation}
                          active={selectedCitationId === citation.id}
                          onSelect={onSelectCitation}
                        />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}