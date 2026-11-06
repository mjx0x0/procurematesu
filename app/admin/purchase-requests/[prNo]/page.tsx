"use client";

import { useParams } from "next/navigation";
import AdminPurchaseRequestsPage from "../page";

export default function AdminPurchaseRequestDetailsRoute() {
  const params = useParams<{ prNo: string }>();
  return <AdminPurchaseRequestsPage initialPRNo={params.prNo} />;
}
