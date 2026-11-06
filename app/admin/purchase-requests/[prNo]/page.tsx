"use client";

import { useParams } from "next/navigation";
import { AdminPurchaseRequestsWorkspace } from "../page";

export default function AdminPurchaseRequestDetailsRoute() {
  const params = useParams<{ prNo: string }>();
  return <AdminPurchaseRequestsWorkspace initialPRNo={params.prNo} />;
}
