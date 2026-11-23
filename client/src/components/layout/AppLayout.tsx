import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import FloatingWatch from "./FloatingWatch";

export const AppLayout: React.FC = () => {
  const location = useLocation();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg text-text">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:flex shrink-0 h-full">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Floating Watch - Live, Repositionable via drag */}
        <FloatingWatch />

        {/* Mobile Header / Burger */}
        <MobileNav />

        {/* Scrollable Page Body with Smooth Route Transition */}
        <main className="flex-1 overflow-y-auto px-4 py-5 md:px-8 md:py-7 pb-24 md:pb-8">
          <div key={location.pathname} className="max-w-6xl mx-auto animate-page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
