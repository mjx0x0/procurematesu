"use client";

import Link from 'next/link';
import { MsuLogo } from '@/components/msu-logo';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8F5] text-center px-4">
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#4D002C] via-[#F5AB26] to-[#7B0046]" />
      <div className="relative mb-5">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-2.5 shadow-sm border border-[#F5AB26]/30">
          <MsuLogo size={44} />
        </div>
      </div>
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-bold mb-3">
        <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
        System Notice
      </div>
      <h2 className="text-xl sm:text-2xl font-black text-[#4D002C] tracking-tight mb-2">
        Something went wrong
      </h2>
      <p className="text-xs sm:text-sm text-stone-600 max-w-md mb-6 leading-relaxed">
        {error?.message || "An unexpected error occurred while loading this page. Please try again or return to the main portal."}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#7B0046] to-[#4D002C] text-white rounded-xl hover:from-[#610037] hover:to-[#7B0046] text-xs font-bold shadow-xs transition-all"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Try Again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-stone-200 text-stone-700 rounded-xl hover:bg-stone-50 text-xs font-bold shadow-2xs transition-all"
        >
          <Home className="h-3.5 w-3.5" />
          Home
        </Link>
      </div>
    </div>
  );
}
