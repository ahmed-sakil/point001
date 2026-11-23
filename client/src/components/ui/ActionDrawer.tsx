import React, { useState, useRef, useEffect } from "react";
import { SlidersHorizontal } from "lucide-react";

export interface ActionDrawerProps {
  children: React.ReactNode;
  triggerIcon?: React.ComponentType<{ className?: string }>;
  triggerTitle?: string;
  className?: string;
}

export const ActionDrawer: React.FC<ActionDrawerProps> = ({
  children,
  triggerIcon: TriggerIcon = SlidersHorizontal,
  triggerTitle = "Settings & Actions",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Desktop hover with 280ms debounce
  const handleMouseEnter = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
    hoverTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 280);
  };

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  return (
    <div
      className={`relative flex items-center shrink-0 ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Mobile Backdrop to close on tap outside */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Desktop Sliding Container (Slides left smoothly) */}
      <div
        className={`hidden md:flex items-center gap-1.5 overflow-hidden transition-all duration-250 ease-out ${
          isOpen
            ? "max-w-[420px] opacity-100 mr-1.5 pointer-events-auto"
            : "max-w-0 opacity-0 pointer-events-none"
        }`}
      >
        {children}
      </div>

      {/* Mobile Popover Dropdown (Positioned below trigger) */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="md:hidden absolute right-0 top-full mt-2 z-40 bg-surface border border-border rounded-md shadow-2xl p-1.5 flex flex-col gap-1 min-w-[170px] animate-in fade-in zoom-in-95 duration-150"
        >
          {children}
        </div>
      )}

      {/* Trigger Button (Tap toggles on mobile, hover opens on desktop) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title={triggerTitle}
        aria-label={triggerTitle}
        aria-expanded={isOpen}
        className={`interactive-tap p-1.5 md:p-2 rounded-md border transition-colors cursor-pointer shrink-0 ${
          isOpen
            ? "bg-text text-bg border-text shadow-xs"
            : "bg-surface border-border text-text hover:border-text"
        }`}
      >
        <TriggerIcon className={`w-4 h-4 transition-transform duration-250 ${isOpen ? "rotate-90" : ""}`} />
      </button>
    </div>
  );
};

export default ActionDrawer;
