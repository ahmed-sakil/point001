import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Menu,
  Compass,
  CheckSquare,
  Calendar as CalendarIcon,
  Flame,
  Wallet,
  Inbox as InboxIcon,
} from "lucide-react";
import Sidebar from "./Sidebar";
import PointLogo from "../icons/PointLogo";

const bottomNavItems = [
  { name: "Command", path: "/", icon: Compass },
  { name: "Tasks", path: "/tasks", icon: CheckSquare },
  { name: "Calendar", path: "/calendar", icon: CalendarIcon },
  { name: "Habits", path: "/habits", icon: Flame },
  { name: "Finance", path: "/finance", icon: Wallet },
  { name: "Inbox", path: "/inbox", icon: InboxIcon },
];

export const MobileNav: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* Mobile Top Status / Burger Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-b border-border px-4 py-2.5 flex items-center justify-between h-12">
        <div className="flex items-center gap-2">
          <PointLogo size={18} className="text-text" />
          <span className="font-bold text-sm tracking-tight text-text">point001</span>
        </div>

        <button
          onClick={() => setDrawerOpen(true)}
          className="interactive-tap p-1.5 border border-border bg-bg text-text/80 hover:text-text rounded-md transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>

      {/* Slide-out Drawer Overlay (Opens from Right) */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          <div className="relative w-72 max-w-[85vw] bg-surface h-full shadow-2xl flex flex-col z-10 border-l border-border animate-in slide-in-from-right duration-200">
            <div className="flex-1 overflow-y-auto">
              <Sidebar
                onNavigate={() => setDrawerOpen(false)}
                onClose={() => setDrawerOpen(false)}
                className="w-full border-r-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (ONLY Icons, No Titles) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border px-4 py-2.5 flex items-center justify-around shadow-2xl">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              aria-label={item.name}
              className={({ isActive }) =>
                `interactive-tap relative flex items-center justify-center p-2 rounded-md transition-all ${
                  isActive
                    ? "text-text bg-bg border border-border shadow-xs"
                    : "text-text-muted hover:text-text"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? "scale-105" : ""}`} />
                  {isActive && (
                    <span className="absolute -bottom-1 w-1 h-1 bg-text rounded-xs" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </>
  );
};

export default MobileNav;
