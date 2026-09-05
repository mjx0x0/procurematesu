import { Suspense } from "react";
import FixedApproverPRForm from "./FixedApproverPRForm";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading form...</div>}>
      <FixedApproverPRForm />
    </Suspense>
  );
}