import React from "react";
import { Check, Lock } from "lucide-react";

export interface CheckboxTickProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  isLocked?: boolean;
  title?: string;
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
}

export const CheckboxTick: React.FC<CheckboxTickProps> = ({
  checked,
  onChange,
  disabled = false,
  isLocked = false,
  title,
  size = "md",
  className = "",
  "aria-label": ariaLabel,
}) => {
  const isActionDisabled = disabled || isLocked;

  const sizeClass = size === "sm" ? "w-4 h-4 rounded-xs" : "w-6 h-6 rounded-md";
  const iconSizeClass = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (!isActionDisabled) onChange();
      }}
      disabled={isActionDisabled}
      title={title || (isLocked ? "Locked" : checked ? "Mark incomplete" : "Mark complete")}
      aria-label={ariaLabel || title || "Checkbox"}
      aria-checked={checked}
      className={`interactive-tap border flex items-center justify-center shrink-0 transition-all ${sizeClass} ${
        isLocked
          ? "opacity-35 cursor-not-allowed border-border bg-bg"
          : checked
          ? "border-text bg-surface text-text shadow-xs"
          : "border-border/80 hover:border-text bg-bg text-transparent"
      } ${className}`}
    >
      {isLocked ? (
        <Lock className={iconSizeClass + " text-text-muted"} />
      ) : checked ? (
        <span className="w-full h-full rounded-[inherit] bg-text text-bg flex items-center justify-center animate-check-pop">
          <Check className={iconSizeClass + " stroke-[3]"} />
        </span>
      ) : (
        <span className="w-3 h-3 rounded-[inherit] border border-transparent hover:border-border transition-colors" />
      )}
    </button>
  );
};

export default CheckboxTick;
