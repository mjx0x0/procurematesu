import { SYSTEM_NAME } from "@/lib/system-branding";

interface LoadingScreenProps {
  label?: string;
  className?: string;
}

export default function LoadingScreen({
  label = "Loading...",
  className = "",
}: LoadingScreenProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Loading ${SYSTEM_NAME}`}
      className={`flex min-h-[100svh] w-full items-center justify-center bg-[#FAF8F5] px-4 ${className}`}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <span
          aria-hidden="true"
          className="h-9 w-9 animate-spin rounded-full border-[3px] border-stone-200 border-t-[#7B0046] motion-reduce:animate-none"
        />
        <span className="text-sm font-medium text-stone-600">{label}</span>
        <span className="sr-only">{SYSTEM_NAME}</span>
      </div>
    </div>
  );
}
