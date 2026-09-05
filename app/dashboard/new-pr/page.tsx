import { Suspense } from "react";
import ProcurementRequestForm from "./ProcurementRequestForm";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading form...</div>}>
      <ProcurementRequestForm />
    </Suspense>
  );
}
