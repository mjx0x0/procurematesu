"use client";

import { useEffect } from "react";
import { SYSTEM_NAME } from "@/lib/system-branding";

/** Keeps legacy UI labels consistent with the current institutional system name. */
export default function SystemBranding() {
  useEffect(() => {
    const replacements: Record<string, string> = {
      "ProcuremateSU": SYSTEM_NAME,
      "Procuremate SU": SYSTEM_NAME,
      "MSU Gensan Procurement System": SYSTEM_NAME,
      "MSU GenSan Procurement System": SYSTEM_NAME,
      "MSU GenSan Procurement Management System": SYSTEM_NAME,
      "MSU GenSan Procurement Management": SYSTEM_NAME,
      "MSU Gensan Procurement Management System": SYSTEM_NAME,
      "AI Assistant": "Gab AI",
      "Ask AI": "Ask Gab AI",
    };

    const replaceText = (root: Node) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      let node: Node | null;
      while ((node = walker.nextNode())) nodes.push(node as Text);
      nodes.forEach((text) => {
        let value = text.nodeValue || "";
        for (const [from, to] of Object.entries(replacements)) {
          value = value.split(from).join(to);
        }
        if (value !== text.nodeValue) text.nodeValue = value;
      });
    };

    replaceText(document.body);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node as Text;
            let value = text.nodeValue || "";
            for (const [from, to] of Object.entries(replacements)) value = value.split(from).join(to);
            if (value !== text.nodeValue) text.nodeValue = value;
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            replaceText(node);
          }
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
