"use client";
import React from "react";
import Link from "next/link";
import { ExternalLink, FileText, Printer, ArrowRight } from "lucide-react";
import { normalizeAssistantResponse, normalizeInlineMarkdown } from "@/lib/chat-response-format";

export function ChatMessageContent({ content, isUser = false }: { content: string; isUser?: boolean }) {
  if (isUser) {
    return <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>;
  }

  const safeContent = normalizeAssistantResponse(content);
  const contactAnswer = /(contact details|contact information|official contact|office location|contact number|procurement management office \(pmo\))/i.test(safeContent.slice(0, 600));
  const sourceNormalizedLines = safeContent.split(/\r?\n/).flatMap((line) => {
    const citation = line.match(/^(.*?)(?:\s+\[([^\]]*(?:official|directory|circular|resolution|manual|irr|gppb|procurement management office)[^\]]*)\])\s*\.?$/i);
    if (!citation) return [line];
    return [citation[1].trim(), "Source: " + citation[2].trim() + "."].filter(Boolean);
  });

  const clean = sourceNormalizedLines.filter((line) => {
    const value = line.trim();
    if (/^#{1,6}\s*$/.test(value)) return false;
    if (contactAnswer) return true;
    return !/(procurement@msugensan\.edu\.ph|\+?63\s*908\s*810\s*5634|office hours|head of (the )?procurement|sttc,?\s*mindanao state|coordinate (directly )?with (the )?(msu[- ]gensan )?procurement|using the contact details|official contact details)/i.test(value);
  });

  return (
    <div className="chat-message-content min-w-0 w-full max-w-full break-words [overflow-wrap:anywhere] space-y-2 text-sm leading-relaxed text-gray-800">
      {clean.map((line, index) => {
        const value = line.trim();
        if (!value) return <div key={index} className="h-1" />;

        const heading = value.match(/^#{1,6}\s+(.+)$/);
        if (heading) {
          return <div key={index} className="pt-1 text-[13px] font-bold text-[#4D002C]">{renderInline(heading[1], index)}</div>;
        }

        const bullet = /^[•\-]\s+(.+)$/.exec(value);
        if (bullet) {
          return (
            <div key={index} className="flex min-w-0 items-start gap-2 pl-1">
              <span className="mt-1 shrink-0 text-[#C27803]">•</span>
              <div className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{renderInline(bullet[1], index)}</div>
            </div>
          );
        }

        const numbered = /^(\d+\.)\s+(.+)$/.exec(value);
        if (numbered) {
          return (
            <div key={index} className="flex min-w-0 items-start gap-2 pl-1">
              <span className="min-w-5 shrink-0 text-xs font-semibold text-[#7B0046]">{numbered[1]}</span>
              <div className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{renderInline(numbered[2], index)}</div>
            </div>
          );
        }

        return <div key={index}>{renderInline(line, index)}</div>;
      })}
    </div>
  );
}

function renderInline(value: string, keyPrefix: number): React.ReactNode {
  const normalized = normalizeInlineMarkdown(value);
  const linkPattern = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let segmentIndex = 0;

  while ((match = linkPattern.exec(normalized)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(renderPlainText(normalized.slice(lastIndex, match.index), keyPrefix + "-text-" + segmentIndex));
      segmentIndex += 1;
    }

    const href = match[2];
    if (/^(https?:\/\/|\/)/i.test(href)) {
      const isPrint = href.includes("pr-print");
      const isNew = href.includes("new-pr");
      const isExternal = /^https?:\/\//i.test(href);
      nodes.push(
        <Link
          key={keyPrefix + "-link-" + segmentIndex}
          href={href}
          target={isExternal || isPrint ? "_blank" : "_self"}
          rel="noopener noreferrer"
          className={isExternal ? "text-[#7B0046] underline" : "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white shadow-sm " + (isNew ? "bg-[#7B0046] hover:bg-[#610037]" : isPrint ? "bg-[#087449] hover:bg-[#06633e]" : "bg-gray-800 hover:bg-gray-900")}
        >
          {isNew ? <FileText className="h-4 w-4" /> : isPrint ? <Printer className="h-4 w-4" /> : isExternal ? <ExternalLink className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
          <span>{match[1]}</span>
        </Link>
      );
    } else {
      nodes.push(renderPlainText(match[1], keyPrefix + "-label-" + segmentIndex));
    }

    segmentIndex += 1;
    lastIndex = linkPattern.lastIndex;
  }

  if (lastIndex < normalized.length) {
    nodes.push(renderPlainText(normalized.slice(lastIndex), keyPrefix + "-text-" + segmentIndex));
  }

  return nodes.length ? <>{nodes}</> : normalized;
}

function renderPlainText(value: string, key: string): React.ReactNode {
  const label = value.match(/^(\s*)\*\*([^*\n]{1,70}:)\*\*(.*)$/s);
  if (!label) return <React.Fragment key={key}>{value}</React.Fragment>;

  return (
    <React.Fragment key={key}>
      {label[1]}
      <strong className="font-semibold text-gray-900">{label[2]}</strong>
      {label[3]}
    </React.Fragment>
  );
}
