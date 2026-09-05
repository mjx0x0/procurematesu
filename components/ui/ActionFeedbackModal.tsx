"use client";

import { CheckCircle2, AlertCircle, Info, XCircle, X } from "lucide-react";

export type FeedbackTone = "success" | "error" | "info" | "warning";

interface ActionFeedbackModalProps {
  open: boolean;
  tone?: FeedbackTone;
  title: string;
  message: string;
  onClose: () => void;
  actionLabel?: string;
}

const toneConfig = {
  success: { icon: CheckCircle2, iconWrap: "bg-emerald-50 text-emerald-600", accent: "bg-emerald-500", button: "bg-[#7C1D2E] hover:bg-[#5A1420]" },
  error: { icon: XCircle, iconWrap: "bg-red-50 text-red-600", accent: "bg-red-500", button: "bg-red-600 hover:bg-red-700" },
  warning: { icon: AlertCircle, iconWrap: "bg-amber-50 text-amber-600", accent: "bg-amber-500", button: "bg-[#7C1D2E] hover:bg-[#5A1420]" },
  info: { icon: Info, iconWrap: "bg-blue-50 text-blue-600", accent: "bg-blue-500", button: "bg-[#7C1D2E] hover:bg-[#5A1420]" },
};

export function ActionFeedbackModal({ open, tone = "success", title, message, onClose, actionLabel = "Continue" }: ActionFeedbackModalProps) {
  if (!open) return null;
  const config = toneConfig[tone];
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4" style={{ zIndex: 100 }} role="dialog" aria-modal="true" aria-labelledby="feedback-modal-title" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-[#160d19]/65 backdrop-blur-sm animate-in fade-in duration-200" />
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 slide-in-from-bottom-2 duration-200">
        <div className={`h-1.5 w-full ${config.accent}`} />
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded-full p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700">
          <X className="h-5 w-5" />
        </button>
        <div className="p-7 sm:p-8">
          <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ${config.iconWrap} shadow-sm`}>
            <Icon className="h-9 w-9" strokeWidth={2.2} />
          </div>
          <div className="text-center">
            <h2 id="feedback-modal-title" className="text-xl font-extrabold text-[#4D0C0D]">{title}</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-stone-600">{message}</p>
          </div>
          <button autoFocus onClick={onClose} className={`mt-7 w-full rounded-xl px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#7C1D2E]/30 ${config.button}`}>
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
