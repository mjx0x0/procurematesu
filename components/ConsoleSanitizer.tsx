"use client";

import { useEffect } from "react";

function sanitizeForJson(value: unknown, seen = new WeakSet()): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (typeof Element !== "undefined" && value instanceof Element) {
    const id = value.id ? `#${value.id}` : "";
    const classes = value.className && typeof value.className === "string" 
      ? `.${value.className.trim().split(/\s+/).slice(0, 3).join(".")}` 
      : "";
    return `<${value.tagName.toLowerCase()}${id}${classes}>`;
  }
  if (typeof Node !== "undefined" && value instanceof Node) {
    return `[Node: ${value.nodeName}]`;
  }
  if (typeof Window !== "undefined" && value instanceof Window) {
    return "[Window]";
  }
  if (typeof Document !== "undefined" && value instanceof Document) {
    return "[Document]";
  }
  if (seen.has(value)) {
    return "[Circular]";
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map(item => sanitizeForJson(item, seen));
  }

  const result: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    if (key.startsWith("__reactFiber") || key.startsWith("__reactInternalInstance") || key.startsWith("_reactListening")) {
      continue;
    }
    try {
      result[key] = sanitizeForJson((value as Record<string, unknown>)[key], seen);
    } catch {
      result[key] = "[Unserializable]";
    }
  }
  return result;
}

function installConsoleProtection() {
  if (typeof window === "undefined") return;
  const w = window as unknown as { __consoleSanitizerInstalled?: boolean };
  if (w.__consoleSanitizerInstalled) return;
  w.__consoleSanitizerInstalled = true;

  const methods: Array<"warn" | "error" | "log" | "info" | "debug"> = ["warn", "error", "log", "info", "debug"];

  methods.forEach(method => {
    const original = console[method];
    if (!original) return;

    console[method] = function (...args: unknown[]) {
      try {
        const safeArgs = args.map(arg => {
          if (typeof arg === "object" && arg !== null) {
            return sanitizeForJson(arg);
          }
          return arg;
        });
        return original.apply(this, safeArgs);
      } catch {
        return original.apply(this, args.map(a => String(a)));
      }
    };
  });
}

// Run immediately on client script load
installConsoleProtection();

export default function ConsoleSanitizer() {
  useEffect(() => {
    installConsoleProtection();
  }, []);

  return null;
}
