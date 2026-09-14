import { MsuLogo } from "@/components/msu-logo";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-[#FAF8F5] px-4 selection:bg-[#7A1315] selection:text-amber-200">
      {/* Top institutional gold/maroon accent ribbon */}
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#4D0C0D] via-[#D4AF37] to-[#7A1315]" />

      <div className="flex flex-col items-center text-center max-w-sm">
        {/* Pulsing University Seal with Gold Aura */}
        <div className="relative mb-5">
          <div className="absolute -inset-2 rounded-full bg-[#D4AF37]/20 blur-xl animate-pulse" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-white p-3 shadow-[0_16px_36px_rgba(77,12,13,0.12)] border border-[#D4AF37]/35">
            <MsuLogo size={54} />
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4D0C0D]/10 text-[#4D0C0D] text-[10px] font-black tracking-wider uppercase mb-2">
          Mindanao State University - General Santos
        </div>

        <h3 className="text-lg font-black text-[#4D0C0D] tracking-tight">
          Procurement Management System
        </h3>
        <p className="mt-1 text-xs text-stone-500 font-medium">
          Loading workspace resources...
        </p>

        {/* Shimmering Progress Bar */}
        <div className="mt-6 w-52 h-1.5 bg-stone-200/80 rounded-full overflow-hidden relative">
          <div className="h-full bg-gradient-to-r from-[#7A1315] via-[#D4AF37] to-[#7A1315] rounded-full animate-progress-indeterminate" />
        </div>
      </div>
    </div>
  );
}
