import React, { useState, useEffect, useRef, useCallback } from "react";

interface WatchPosition {
  x: number;
  y: number;
}

export const FloatingWatch: React.FC = () => {
  const [time, setTime] = useState<Date>(new Date());
  const [position, setPosition] = useState<WatchPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPinned, setIsPinned] = useState<boolean>(() => {
    try {
      return localStorage.getItem("point001_watch_pinned_bottom_right") === "true";
    } catch {
      return false;
    }
  });
  const watchRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);

  // Sync isPinned state on custom event and cross-tab storage event
  useEffect(() => {
    const handlePinChange = () => {
      try {
        setIsPinned(localStorage.getItem("point001_watch_pinned_bottom_right") === "true");
      } catch {
        // ignore
      }
    };

    window.addEventListener("watch-pin-change", handlePinChange);
    window.addEventListener("storage", handlePinChange);
    return () => {
      window.removeEventListener("watch-pin-change", handlePinChange);
      window.removeEventListener("storage", handlePinChange);
    };
  }, []);

  // Live 1-second interval
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Clamping function to guarantee it stays inside viewport
  const clampPosition = useCallback((x: number, y: number): WatchPosition => {
    const width = watchRef.current?.offsetWidth || 180;
    const height = watchRef.current?.offsetHeight || 56;
    const margin = 12;

    const clampedX = Math.max(margin, Math.min(window.innerWidth - width - margin, x));
    const clampedY = Math.max(margin, Math.min(window.innerHeight - height - margin, y));
    return { x: clampedX, y: clampedY };
  }, []);

  // Initialize position from localStorage or default
  useEffect(() => {
    try {
      const saved = localStorage.getItem("point001_watch_pos");
      if (saved) {
        const parsed: WatchPosition = JSON.parse(saved);
        setPosition(clampPosition(parsed.x, parsed.y));
        return;
      }
    } catch {
      // fallback
    }
    // Default initial top-right
    const defaultX = Math.max(16, window.innerWidth - 210);
    const defaultY = 16;
    setPosition({ x: defaultX, y: defaultY });
  }, [clampPosition]);

  // Window resize handler: auto-clamp so it NEVER gets pushed outside the screen
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return null;
        const clamped = clampPosition(prev.x, prev.y);
        try {
          localStorage.setItem("point001_watch_pos", JSON.stringify(clamped));
        } catch {
          // ignore
        }
        return clamped;
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampPosition]);

  // Mouse Drag Handler
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // only left click
    e.preventDefault();

    const currentX = position ? position.x : (watchRef.current?.getBoundingClientRect().left ?? 16);
    const currentY = position ? position.y : (watchRef.current?.getBoundingClientRect().top ?? 16);

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: currentX,
      initY: currentY,
    };
    setIsDragging(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStartRef.current) return;
      const deltaX = moveEvent.clientX - dragStartRef.current.startX;
      const deltaY = moveEvent.clientY - dragStartRef.current.startY;

      const nextPos = clampPosition(dragStartRef.current.initX + deltaX, dragStartRef.current.initY + deltaY);
      setPosition(nextPos);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      setPosition((latest) => {
        if (latest) {
          try {
            localStorage.setItem("point001_watch_pos", JSON.stringify(latest));
          } catch {
            // ignore
          }
        }
        return latest;
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Touch Drag Handler for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const currentX = position ? position.x : (watchRef.current?.getBoundingClientRect().left ?? 16);
    const currentY = position ? position.y : (watchRef.current?.getBoundingClientRect().top ?? 16);

    dragStartRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      initX: currentX,
      initY: currentY,
    };
    setIsDragging(true);

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (!dragStartRef.current || moveEvent.touches.length !== 1) return;
      const moveTouch = moveEvent.touches[0];
      const deltaX = moveTouch.clientX - dragStartRef.current.startX;
      const deltaY = moveTouch.clientY - dragStartRef.current.startY;

      const nextPos = clampPosition(dragStartRef.current.initX + deltaX, dragStartRef.current.initY + deltaY);
      setPosition(nextPos);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);

      setPosition((latest) => {
        if (latest) {
          try {
            localStorage.setItem("point001_watch_pos", JSON.stringify(latest));
          } catch {
            // ignore
          }
        }
        return latest;
      });
    };

    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
  };

  // 12-Hour format with AM/PM
  const dayStr = time.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const dateStr = time.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
  
  let hours = time.getHours();
  const minutes = time.getMinutes().toString().padStart(2, "0");
  const seconds = time.getSeconds().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHours = hours.toString().padStart(2, "0");
  const timeStr = `${formattedHours}:${minutes}:${seconds} ${ampm}`;

  const style: React.CSSProperties = isPinned
    ? {
        position: "fixed",
        right: "24px",
        bottom: "24px",
        left: "auto",
        top: "auto",
        zIndex: 50,
        minWidth: "190px",
      }
    : {
        position: "fixed",
        left: position ? `${position.x}px` : "auto",
        right: position ? "auto" : "20px",
        top: position ? `${position.y}px` : "16px",
        zIndex: 50,
        minWidth: "190px",
      };

  return (
    <div
      ref={watchRef}
      style={style}
      onMouseDown={isPinned ? undefined : handleMouseDown}
      onTouchStart={isPinned ? undefined : handleTouchStart}
      className={`select-none transition-shadow ${
        isPinned
          ? "cursor-default"
          : isDragging
          ? "cursor-grabbing shadow-2xl scale-[1.02]"
          : "cursor-grab"
      } hidden md:flex bg-surface/90 backdrop-blur-md border border-border px-3.5 py-2 rounded-md flex-col items-center gap-0.5 text-xs font-mono shadow-md`}
    >
      {/* Top Row: Day and Date */}
      <div className="flex items-center gap-1.5 text-[10px] text-text-muted tracking-wider">
        <span className="w-1.5 h-1.5 rounded-xs bg-text animate-pulse" />
        <span className="font-semibold text-text">{dayStr}</span>
        <span>•</span>
        <span>{dateStr}</span>
      </div>

      {/* Bottom Row: 12-Hour Clock */}
      <div className="text-sm font-bold tracking-widest text-text">
        {timeStr}
      </div>
    </div>
  );
};

export default FloatingWatch;
