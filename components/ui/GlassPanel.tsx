import React from "react";

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function GlassPanel({ children, className = "", ...props }: GlassPanelProps) {
  return (
    <div
      className={`glass-panel rounded-xl p-4 sm:p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
