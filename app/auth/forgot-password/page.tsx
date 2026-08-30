"use client";

// ✅ Force dynamic rendering
export const dynamic = 'force-dynamic';

import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { FileText } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50/50 px-4">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl -z-10" />
      
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-xl">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">ProcuremateSU</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Forgot Password</h2>
          <p className="text-gray-600 mt-2">Enter your email to reset your password</p>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}