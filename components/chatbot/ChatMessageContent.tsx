"use client";

import React from "react";
import Link from "next/link";
import { ExternalLink, FileText, Printer, ArrowRight } from "lucide-react";

interface Props {
  content: string;
  isUser?: boolean;
}

export function ChatMessageContent({ content, isUser = false }: Props) {
  if (isUser) {
    return <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>;
  }

  // Parse lines
  const lines = content.split("\n");

  return (
    <div className="space-y-2 text-sm leading-relaxed text-gray-800">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={lineIdx} className="h-2" />;
        }

        // Check if line contains a markdown link: [Label](url)
        const markdownLinkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (markdownLinkMatch) {
          const [fullMatch, linkText, linkUrl] = markdownLinkMatch;
          const [before, after] = line.split(fullMatch);

          const isNewPR = linkUrl.includes("new-pr");
          const isPrintPR = linkUrl.includes("pr-print");

          return (
            <div key={lineIdx} className="my-2.5">
              {before && renderFormattedInline(before)}
              <div className="mt-1.5 inline-block">
                <Link
                  href={linkUrl}
                  target={isPrintPR ? "_blank" : "_self"}
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 ${
                    isNewPR
                      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 hover:scale-[1.02]"
                      : isPrintPR
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 hover:scale-[1.02]"
                      : "bg-gray-800 hover:bg-gray-900 text-white"
                  }`}
                >
                  {isNewPR && <FileText className="w-4 h-4" />}
                  {isPrintPR && <Printer className="w-4 h-4" />}
                  {!isNewPR && !isPrintPR && <ExternalLink className="w-3.5 h-3.5" />}
                  <span>{linkText}</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-70" />
                </Link>
              </div>
              {after && renderFormattedInline(after)}
            </div>
          );
        }

        // Check for raw urls (/dashboard/... or http...)
        const rawUrlMatch = line.match(/(https?:\/\/[^\s]+|\/dashboard\/[^\s]+)/);
        if (rawUrlMatch) {
          const url = rawUrlMatch[0];
          const [before, after] = line.split(url);
          const isNewPR = url.includes("new-pr");
          const isPrintPR = url.includes("pr-print");

          return (
            <div key={lineIdx} className="my-2.5">
              {before && renderFormattedInline(before)}
              <div className="mt-1.5 inline-block">
                <Link
                  href={url}
                  target={isPrintPR ? "_blank" : "_self"}
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 ${
                    isNewPR
                      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 hover:scale-[1.02]"
                      : isPrintPR
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 hover:scale-[1.02]"
                      : "bg-gray-800 hover:bg-gray-900 text-white"
                  }`}
                >
                  {isNewPR ? <FileText className="w-4 h-4" /> : <Printer className="w-4 h-4" />}
                  <span>{isNewPR ? "Open in New PR Form" : isPrintPR ? "Open Printable PR Form" : "Open Link"}</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-70" />
                </Link>
              </div>
              {after && renderFormattedInline(after)}
            </div>
          );
        }

        // Check if bullet point or numbered item
        const isBullet = trimmed.startsWith("•") || trimmed.startsWith("-");
        const isNumber = /^\d+\.\s/.test(trimmed);

        if (isBullet) {
          const bulletText = trimmed.replace(/^[•\-]\s*/, "");
          return (
            <div key={lineIdx} className="flex items-start gap-2 pl-2">
              <span className="text-blue-500 mt-1 font-bold text-xs">•</span>
              <div className="flex-1">{renderFormattedInline(bulletText)}</div>
            </div>
          );
        }

        if (isNumber) {
          const numberMatch = trimmed.match(/^(\d+\.)\s*(.*)$/);
          if (numberMatch) {
            return (
              <div key={lineIdx} className="flex items-start gap-2 pl-2">
                <span className="text-blue-600 font-semibold text-xs min-w-[1.25rem] mt-0.5">{numberMatch[1]}</span>
                <div className="flex-1">{renderFormattedInline(numberMatch[2])}</div>
              </div>
            );
          }
        }

        return <div key={lineIdx}>{renderFormattedInline(line)}</div>;
      })}
    </div>
  );
}

function renderFormattedInline(text: string): React.ReactNode {
  // Regex to match **bold**
  const boldRegex = /\*\*(.*?)\*\*/g;
  if (!boldRegex.test(text)) {
    return text;
  }

  const parts = text.split(boldRegex);
  return (
    <span>
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          return (
            <strong key={i} className="font-semibold text-gray-900">
              {part}
            </strong>
          );
        }
        return part;
      })}
    </span>
  );
}
