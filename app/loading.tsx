import { MsuLogo } from "@/components/msu-logo";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-[#FAF8F5] px-4 selection:bg-[#7B0046] selection:text-amber-200">
      {/* Top institutional gold/plum accent ribbon */}
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#4D002C] via-[#F5AB26] to-[#7B0046]" />

      <div className="flex flex-col items-center text-center max-w-sm">
        {/* Pulsing University Seal with Gold Aura */}
        <div className="relative mb-5">
          <div className="absolute -inset-2 rounded-full bg-[#F5AB26]/20 blur-xl animate-pulse" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-white p-3 shadow-[0_16px_36px_rgba(77,0,44,0.12)] border border-[#F5AB26]/35">
            <MsuLogo size={54} />
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4D002C]/10 text-[#4D002C] text-[10px] font-black tracking-wider uppercase mb-2">
          Mindanao State University - General Santos
        </div>

        <h3 className="text-lg font-black text-[#4D002C] tracking-tight">
          Procurement Management System
        </h3>
        <p className="mt-1 text-xs text-stone-500 font-medium">
          Loading workspace resources...
        </p>

        {/* Shimmering Progress Bar */}
        <div className="mt-6 w-52 h-1.5 bg-stone-200/80 rounded-full overflow-hidden relative">
          <div className="h-full bg-gradient-to-r from-[#7B0046] via-[#F5AB26] to-[#7B0046] rounded-full animate-progress-indeterminate" />
        </div>
      </div>
    </div>
  );
}
