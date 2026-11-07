import { Suspense } from "react";
import ProcurementRequestForm from "./ProcurementRequestForm";
import LoadingScreen from "@/components/LoadingScreen";

export default function Page() {
  return (
    <Suspense fallback={<LoadingScreen label="Loading requisition form..." />}>
      <ProcurementRequestForm />
    </Suspense>
  );
}
