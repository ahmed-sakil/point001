import React, { useState, useEffect } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  Compass,
  CheckSquare,
  Calendar as CalendarIcon,
  Users,
  Flame,
  Wallet,
  Inbox as InboxIcon,
  Settings as SettingsIcon,
  LogOut,
} from "lucide-react";
import PointLogo from "../icons/PointLogo";

export interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

export const navItems: NavItem[] = [
  {
    name: "Command center",
    path: "/",
    icon: Compass,
  },
  {
    name: "Tasks and events",
    path: "/tasks",
    icon: CheckSquare,
  },
  {
    name: "Calendar",
    path: "/calendar",
    icon: CalendarIcon,
  },
  {
    name: "Contacts",
    path: "/contacts",
    icon: Users,
  },
  {
    name: "Habits",
    path: "/habits",
    icon: Flame,
  },
  {
    name: "Personal finance",
    path: "/finance",
    icon: Wallet,
  },
  {
    name: "Inbox",
    path: "/inbox",
    icon: InboxIcon,
    badge: 3,
  },
  {
    name: "Settings",
    path: "/settings",
    icon: SettingsIcon,
  },
];

interface SidebarProps {
  onNavigate?: () => void;
  className?: string;
}

import { useAuth } from "../../context/AuthContext";

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate, className = "" }) => {
  const { user, logout } = useAuth();
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatarUrl]);

  const displayName = user?.name || user?.email?.split("@")[0] || "User";
  const displayEmail = user?.email || "";
  const initials = (displayName.slice(0, 2) || "U").toUpperCase();

  const handleLogout = () => {
    logout();
  };

  return (
    <aside
      className={`w-64 bg-surface border-r border-border flex flex-col justify-between h-full select-none ${className}`}
    >
      {/* Top Header Section */}
      <div>
        <div className="px-5 py-6 border-b border-border">
          <div className="flex items-center gap-2.5">
            <PointLogo size={22} className="text-text" />
            <span className="text-lg font-bold tracking-tight text-text">point001</span>
          </div>
          <p className="text-[11px] uppercase tracking-wider text-text-muted font-mono mt-1.5 pl-0.5">
            one point for everything.
          </p>
        </div>

        {/* Navigation Items with Left Partial Border & Non-shifting Scale Hover */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onNavigate}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `group interactive-tap relative flex items-center justify-between px-3 py-2 text-xs font-medium border rounded-md transition-colors ${
                    isActive
                      ? "bg-bg text-text border-border font-medium shadow-xs"
                      : "text-text-muted border-transparent hover:text-text hover:bg-surface-hover/80 hover:border-border/60"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Left side active indicator border */}
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] bg-text rounded-xs" />
                    )}

                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? "text-text" : "text-text-muted group-hover:text-text"
                        }`}
                      />
                      <span className="truncate">
                        {item.name}
                      </span>
                    </div>

                    {/* Badge */}
                    {!isActive && item.badge && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-bg border border-border text-text-muted rounded-xs">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User Profile & Logout Section */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center justify-between p-2 bg-bg border border-border rounded-md hover:border-border/80 transition-colors">
          <Link
            to="/settings/profile"
            onClick={onNavigate}
            title="Open Profile Settings"
            className="flex items-center gap-2.5 min-w-0 flex-1 group/user cursor-pointer mr-2"
          >
            {user?.avatarUrl && !avatarError ? (
              <img
                src={user.avatarUrl}
                alt={displayName}
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
                className="w-8 h-8 rounded-md object-cover border border-border shrink-0 group-hover/user:border-text/60 transition-colors"
              />
            ) : (
              <div className="w-8 h-8 bg-surface border border-border rounded-md flex items-center justify-center text-xs font-bold font-mono text-text shrink-0 group-hover/user:border-text/60 transition-colors">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-text truncate group-hover/user:text-text">
                {displayName}
              </p>
              <p className="text-[10px] text-text-muted font-mono truncate">
                {displayEmail}
              </p>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            title="Logout"
            className="group interactive-tap p-1.5 text-text-muted hover:text-text hover:bg-surface border border-transparent hover:border-border rounded-md transition-colors shrink-0"
          >
            <LogOut className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
