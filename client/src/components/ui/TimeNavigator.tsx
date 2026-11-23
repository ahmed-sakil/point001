import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface TimeNavigatorProps {
  label: React.ReactNode;
  onPrev: () => void;
  onNext: () => void;
  onToday?: () => void;
  showToday?: boolean;
  prevTitle?: string;
  nextTitle?: string;
  todayLabel?: string;
  className?: string;
  rightContent?: React.ReactNode;
}

export const TimeNavigator: React.FC<TimeNavigatorProps> = ({
  label,
  onPrev,
  onNext,
  onToday,
  showToday = false,
  prevTitle = "Previous",
  nextTitle = "Next",
  todayLabel = "Today",
  className = "",
  rightContent,
}) => {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="text-xs font-mono font-semibold text-text truncate">
        {label}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {showToday && onToday && (
          <button
            type="button"
            onClick={onToday}
            className="interactive-tap px-2.5 py-1 rounded-md border border-border bg-surface text-text text-xs font-mono hover:border-text transition-colors"
          >
            {todayLabel}
          </button>
        )}

        <button
          type="button"
          onClick={onPrev}
          title={prevTitle}
          aria-label={prevTitle}
          className="interactive-tap p-1.5 rounded-md border border-border bg-surface text-text-muted hover:text-text hover:border-text transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onNext}
          title={nextTitle}
          aria-label={nextTitle}
          className="interactive-tap p-1.5 rounded-md border border-border bg-surface text-text-muted hover:text-text hover:border-text transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {rightContent}
      </div>
    </div>
  );
};

export default TimeNavigator;
