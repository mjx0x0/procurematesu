import { Suspense } from "react";
import PRPrintContent from "./PRPrintContent";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <PRPrintContent />
    </Suspense>
  );
}