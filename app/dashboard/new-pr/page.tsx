import { Suspense } from "react";
import NewPRForm from "./NewPRForm";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading form...</div>}>
      <NewPRForm />
    </Suspense>
  );
}