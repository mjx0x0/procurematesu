"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function PageTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);

  // When pathname changes, finish the navigation indicator
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

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

      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;

        // Don't trigger transition if clicking on the current exact page
        if (url.pathname === window.location.pathname && url.search === window.location.search) return;

        // Visual navigation indicator feedback without interrupting Next.js router
        setIsNavigating(true);

        // Safety timeout in case navigation is aborted or instantaneous
        window.setTimeout(() => {
          setIsNavigating(false);
        }, 4000);
      } catch {
        // Invalid URL, ignore
      }
    };

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  if (!isNavigating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] overflow-hidden pointer-events-none">
      <div className="h-full bg-gradient-to-r from-[#7B0046] via-[#F5AB26] to-[#7B0046] animate-progress-indeterminate shadow-[0_0_8px_rgba(245,171,38,0.7)]" />
    </div>
  );
}

