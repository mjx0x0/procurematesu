"use client";

import { useEffect } from "react";

export default function PageTransition() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const link = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!link) return;
      if (link.target === "_blank" || link.hasAttribute("download")) return;

      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;

      const startViewTransition = (document as Document & {
        startViewTransition?: (callback: () => void) => { ready: Promise<void>; finished: Promise<void> };
      }).startViewTransition;

      if (!startViewTransition) return;
      event.preventDefault();

      startViewTransition(() => {
        window.history.pushState({}, "", url.href);
        window.dispatchEvent(new PopStateEvent("popstate"));
      });
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
