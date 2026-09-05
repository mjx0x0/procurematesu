import { Suspense } from "react";
import SecurePRPrintContent from "./SecurePRPrintContent";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SecurePRPrintContent />
    </Suspense>
  );
}