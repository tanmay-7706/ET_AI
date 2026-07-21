import React from "react";
import Link from "next/link";
import { GlassPanel } from "@/components/ui/GlassPanel";

export default function AccessRestrictedPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

      <GlassPanel className="max-w-md w-full text-center py-12 px-8">
        {/* Shield icon */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/50">
          <svg
            className="w-8 h-8 text-amber-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold tracking-tight mb-2">Access Restricted</h1>
        <p className="text-sm opacity-60 mb-6 leading-relaxed">
          The Command Center is reserved for authorized law enforcement officers.
          If you believe you should have access, please contact your department administrator.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/shield"
            className="inline-block px-6 py-2.5 bg-accent-safe/20 text-accent-safe border border-accent-safe/50 rounded-lg hover:bg-accent-safe/30 transition text-sm font-medium"
          >
            Go to Citizen Fraud Shield →
          </Link>
          <Link
            href="/"
            className="inline-block text-xs opacity-40 hover:opacity-70 transition"
          >
            Back to Home
          </Link>
        </div>
      </GlassPanel>
    </div>
  );
}
