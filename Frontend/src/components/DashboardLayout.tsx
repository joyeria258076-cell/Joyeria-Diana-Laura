// Ruta: Joyeria-Diana-Laura/Frontend/src/components/DashboardLayout.tsx
// Layout simple para dashboards - SIN header, footer, ni sidebar

import React from "react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f12] to-[#1a1a1f]">
      {children}
    </div>
  );
}
