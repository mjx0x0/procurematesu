import React from "react";

interface MsuLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export function MsuLogo({ className = "", size = 120, showText = false }: MsuLogoProps) {
  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 240 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-md select-none transition-transform duration-300 hover:scale-105"
        role="img"
        aria-label="Mindanao State University - General Santos Official Seal"
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F5D77F" />
            <stop offset="50%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#AA820A" />
          </linearGradient>

          <linearGradient id="maroonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B1518" />
            <stop offset="60%" stopColor="#7A1315" />
            <stop offset="100%" stopColor="#4D0C0D" />
          </linearGradient>

          <linearGradient id="greenFieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#136F46" />
            <stop offset="100%" stopColor="#0B422A" />
          </linearGradient>

          <linearGradient id="torchFlame" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#DC2626" />
            <stop offset="40%" stopColor="#F59E0B" />
            <stop offset="85%" stopColor="#FDE047" />
            <stop offset="100%" stopColor="#FFFFFF" />
          </linearGradient>

          {/* Curved Text Paths */}
          {/* Top arc for "MINDANAO STATE UNIVERSITY" */}
          <path
            id="textPathTop"
            d="M 32,120 A 88,88 0 1,1 208,120"
            fill="none"
          />
          {/* Bottom arc for "GENERAL SANTOS CITY" */}
          <path
            id="textPathBottom"
            d="M 208,120 A 88,88 0 0,1 32,120"
            fill="none"
          />
        </defs>

        {/* Outer Gold Rope / Scalloped Ring */}
        <circle cx="120" cy="120" r="116" fill="url(#goldGradient)" />
        <circle cx="120" cy="120" r="113" fill="#4D0C0D" />

        {/* Outer Maroon Ring with University Name */}
        <circle cx="120" cy="120" r="109" fill="url(#maroonGradient)" stroke="url(#goldGradient)" strokeWidth="2.5" />

        {/* Outer Circular Typography */}
        <text fill="#FDF4DC" fontSize="13.2" fontWeight="800" letterSpacing="2.8" fontFamily="sans-serif">
          <textPath href="#textPathTop" startOffset="50%" textAnchor="middle">
            MINDANAO STATE UNIVERSITY
          </textPath>
        </text>

        {/* Decorative Golden Stars */}
        <g fill="url(#goldGradient)">
          {/* Left Star */}
          <polygon points="26,120 28.5,125 34,125 29.5,128.5 31.5,134 26,130.5 20.5,134 22.5,128.5 18,125 23.5,125" transform="translate(1, -7)" />
          {/* Right Star */}
          <polygon points="214,120 216.5,125 222,125 217.5,128.5 219.5,134 214,130.5 208.5,134 210.5,128.5 206,125 211.5,125" transform="translate(-1, -7)" />
        </g>

        {/* Bottom Circular Typography */}
        <text fill="#FDF4DC" fontSize="11.5" fontWeight="700" letterSpacing="3.2" fontFamily="sans-serif">
          <textPath href="#textPathBottom" startOffset="50%" textAnchor="middle">
            GENERAL SANTOS CITY
          </textPath>
        </text>

        {/* Inner Gold Beaded Border */}
        <circle cx="120" cy="120" r="69" fill="none" stroke="url(#goldGradient)" strokeWidth="2.5" strokeDasharray="3 2" />
        <circle cx="120" cy="120" r="66" fill="none" stroke="url(#goldGradient)" strokeWidth="1.5" />

        {/* Inner Shield / Center Background */}
        <circle cx="120" cy="120" r="64" fill="url(#greenFieldGradient)" />

        {/* Golden Sun Rays Emerging from Center */}
        <g stroke="url(#goldGradient)" strokeWidth="1" opacity="0.35">
          <line x1="120" y1="58" x2="120" y2="72" />
          <line x1="140" y1="62" x2="134" y2="75" />
          <line x1="158" y1="74" x2="148" y2="84" />
          <line x1="172" y1="92" x2="159" y2="98" />
          <line x1="178" y1="112" x2="164" y2="114" />
          <line x1="100" y1="62" x2="106" y2="75" />
          <line x1="82" y1="74" x2="92" y2="84" />
          <line x1="68" y1="92" x2="81" y2="98" />
          <line x1="62" y1="112" x2="76" y2="114" />
        </g>

        {/* Laurel Wreath on Sides */}
        <g stroke="url(#goldGradient)" fill="url(#goldGradient)" strokeWidth="0.5">
          {/* Left Laurel Leaves */}
          <path d="M 80,140 Q 72,118 84,98" fill="none" strokeWidth="1.5" />
          <path d="M 78,135 Q 70,132 74,126 Q 80,130 78,135 Z" />
          <path d="M 75,123 Q 66,120 70,114 Q 77,118 75,123 Z" />
          <path d="M 74,110 Q 66,106 72,100 Q 78,106 74,110 Z" />
          <path d="M 78,98 Q 72,92 80,88 Q 84,94 78,98 Z" />

          {/* Right Laurel Leaves */}
          <path d="M 160,140 Q 168,118 156,98" fill="none" strokeWidth="1.5" />
          <path d="M 162,135 Q 170,132 166,126 Q 160,130 162,135 Z" />
          <path d="M 165,123 Q 174,120 170,114 Q 163,118 165,123 Z" />
          <path d="M 166,110 Q 174,106 168,100 Q 162,106 166,110 Z" />
          <path d="M 162,98 Q 168,92 160,88 Q 156,94 162,98 Z" />
        </g>

        {/* Open Book of Knowledge */}
        <g>
          {/* Book Base / Back Cover */}
          <path
            d="M 96,145 Q 120,138 120,146 Q 120,138 144,145 L 142,154 Q 120,148 120,154 Q 120,148 98,154 Z"
            fill="url(#goldGradient)"
          />
          {/* Book Pages */}
          <path
            d="M 98,143 Q 118,137 120,143 L 120,152 Q 118,146 99,152 Z"
            fill="#FFFFFF"
            stroke="#D4AF37"
            strokeWidth="0.75"
          />
          <path
            d="M 142,143 Q 122,137 120,143 L 120,152 Q 122,146 141,152 Z"
            fill="#FFFFFF"
            stroke="#D4AF37"
            strokeWidth="0.75"
          />
          {/* Text lines on pages */}
          <line x1="102" y1="145" x2="116" y2="143" stroke="#7A1315" strokeWidth="0.8" />
          <line x1="103" y1="148" x2="115" y2="146" stroke="#7A1315" strokeWidth="0.8" />
          <line x1="124" y1="143" x2="138" y2="145" stroke="#7A1315" strokeWidth="0.8" />
          <line x1="125" y1="146" x2="137" y2="148" stroke="#7A1315" strokeWidth="0.8" />
        </g>

        {/* Flaming Torch of Wisdom */}
        <g>
          {/* Torch Handle */}
          <path
            d="M 117,118 L 123,118 L 121,138 L 119,138 Z"
            fill="url(#goldGradient)"
            stroke="#630E10"
            strokeWidth="0.5"
          />
          {/* Torch Bowl / Burner */}
          <path
            d="M 113,112 Q 120,114 127,112 L 124,119 L 116,119 Z"
            fill="url(#goldGradient)"
            stroke="#7A1315"
            strokeWidth="0.75"
          />
          <ellipse cx="120" cy="112" rx="7" ry="2.2" fill="#F5D77F" />

          {/* Vibrant Torch Flames */}
          {/* Outer Flame */}
          <path
            d="M 120,78 Q 126,88 127,96 Q 130,105 125,111 Q 120,113 115,111 Q 110,105 113,96 Q 114,88 120,78 Z"
            fill="url(#torchFlame)"
          />
          {/* Inner Core Flame */}
          <path
            d="M 120,86 Q 123,94 123,99 Q 124,106 121,110 Q 119,110 117,106 Q 116,99 120,86 Z"
            fill="#FFFBEB"
          />
        </g>

        {/* Founding Year or Academic Tag */}
        <rect x="104" y="160" width="32" height="11" rx="2" fill="url(#maroonGradient)" stroke="url(#goldGradient)" strokeWidth="0.8" />
        <text x="120" y="168" fill="#FDF4DC" fontSize="7" fontWeight="800" letterSpacing="1" textAnchor="middle" fontFamily="sans-serif">
          1961
        </text>
      </svg>

      {showText && (
        <div className="mt-3 text-center">
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#4D0C0D] leading-tight">
            Mindanao State University
          </h2>
          <p className="text-xs font-semibold text-[#B88E13] tracking-widest uppercase mt-0.5">
            General Santos City
          </p>
        </div>
      )}
    </div>
  );
}
