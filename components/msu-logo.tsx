"use client";

import React, { useState } from "react";
import { Landmark } from "lucide-react";

interface MsuLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export function MsuLogo({ className = "", size = 120, showText = false }: MsuLogoProps) {
  const [loadFailed, setLoadFailed] = useState(false);
  const [currentSrcIndex, setCurrentSrcIndex] = useState(0);

  // Search candidate paths in /public that user can add in GitHub
  const candidates = ["/procuremate-logo.svg"];

  const handleImgError = () => {
    if (currentSrcIndex < candidates.length - 1) {
      setCurrentSrcIndex((prev) => prev + 1);
    } else {
      setLoadFailed(true);
    }
  };

  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      {!loadFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={candidates[currentSrcIndex]}
          alt="MSU GenSan Procurement Management System Logo"
          width={size}
          height={size}
          onError={handleImgError}
          className="object-contain drop-shadow-sm select-none transition-transform duration-300 hover:scale-105"
          style={{ width: size, height: size, maxHeight: size, maxWidth: size }}
        />
      ) : (
        /* Logo fallback */
        <div
          style={{ width: size, height: size }}
          className="rounded-full border-2 border-dashed border-[#7B0046]/40 bg-stone-50/90 flex flex-col items-center justify-center p-2 text-center text-[#7B0046] select-none shadow-inner group hover:border-[#7B0046] transition-colors"
          title="Procurement system logo"
        >
          <Landmark className="w-1/3 h-1/3 text-[#7B0046] stroke-[1.5] mb-1 opacity-80" />
          <span className="text-[10px] font-bold uppercase tracking-tight text-[#7B0046] leading-none">
            MSU Logo Space
          </span>
          <span className="text-[8px] text-stone-500 font-mono scale-90 leading-tight mt-1">
            public/msu-logo.png
          </span>
        </div>
      )}

      {showText && (
        <div className="mt-3 text-center">
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#4D002C] leading-tight">
            Mindanao State University
          </h2>
          <p className="text-xs font-semibold text-[#F5AB26] tracking-widest uppercase mt-0.5">
            General Santos City
          </p>
        </div>
      )}
    </div>
  );
}
