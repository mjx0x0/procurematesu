import LoadingScreen from "@/components/LoadingScreen";
import { SYSTEM_NAME } from "@/lib/system-branding";

export default function Loading() {
  return (
    <>
      <LoadingScreen label="Loading workspace..." className="fixed inset-0 z-[999]" />
      <span className="sr-only">{SYSTEM_NAME}</span>
    </>
  );
}
