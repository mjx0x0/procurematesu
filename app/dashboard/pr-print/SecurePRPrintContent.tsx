"use client";

import { useEffect, useState } from "react";
import PRPrintContent from "./PRPrintContent";

const CHANCELLOR_NAME = "Atty. Shidik T. Abantas, MDM, LLM";
const CHANCELLOR_TITLE = "Chancellor";

export default function SecurePRPrintContent() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const encoded = params.get("data");

      if (!encoded) {
        setReady(true);
        return;
      }

      const parsed = JSON.parse(atob(decodeURIComponent(encoded)));
      const sanitized = {
        ...parsed,
        approved_by: CHANCELLOR_NAME,
        approved_by_designation: CHANCELLOR_TITLE,
      };

      const safeEncoded = encodeURIComponent(btoa(JSON.stringify(sanitized)));
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}?data=${safeEncoded}`
      );
    } catch (error) {
      console.error("Failed to sanitize PR print data:", error);
    } finally {
      setReady(true);
    }
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="text-stone-500 font-medium">Preparing Official Purchase Request...</div>
      </div>
    );
  }

  return <PRPrintContent />;
}
