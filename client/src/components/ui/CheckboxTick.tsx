import React from "react";
import { Check, Lock } from "lucide-react";

export interface CheckboxTickProps {
  checked: boolean;
  onChange?: () => void;
  disabled?: boolean;
  isLocked?: boolean;
  readOnly?: boolean;
  title?: string;
  size?: "sm" | "md" | "lg";
  shape?: "square" | "circle";
  className?: string;
  "aria-label"?: string;
}

export const CheckboxTick: React.FC<CheckboxTickProps> = ({
  checked,
  onChange,
  disabled = false,
  isLocked = false,
  readOnly = false,
  title,
  size = "md",
  shape = "square",
  className = "",
  "aria-label": ariaLabel,
}) => {
  const isActionDisabled = disabled || isLocked || readOnly;

  const roundedClass =
    shape === "circle"
      ? "rounded-full"
      : "rounded-[2px]";

  const sizeClass =
    shape === "circle"
      ? size === "sm"
        ? "w-4 h-4"
        : size === "lg"
        ? "w-5.5 h-5.5"
        : "w-4.5 h-4.5"
      : size === "lg"
      ? "w-5 h-5"
      : "w-4 h-4";

  const iconSizeClass = size === "lg" ? "w-3 h-3" : "w-2.5 h-2.5";

  if (readOnly) {
    return (
      <div
        className={`border flex items-center justify-center shrink-0 ${roundedClass} ${sizeClass} ${
          checked
            ? "border-text bg-text text-bg shadow-xs"
            : "border-border/80 bg-bg text-transparent"
        } ${className}`}
        title={title}
        aria-label={ariaLabel || title || "Status"}
      >
        {checked && (
          <Check className={`${iconSizeClass} stroke-[3]`} />
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (!isActionDisabled && onChange) onChange();
      }}
      disabled={isActionDisabled}
      title={title || (isLocked ? "Locked" : checked ? "Mark incomplete" : "Mark complete")}
      aria-label={ariaLabel || title || "Checkbox"}
      aria-checked={checked}
      className={`group cursor-pointer border flex items-center justify-center shrink-0 transition-all duration-150 active:scale-85 ${roundedClass} ${sizeClass} ${
        isLocked
          ? "opacity-35 cursor-not-allowed border-border bg-bg"
          : checked
          ? "border-text bg-text text-bg shadow-xs hover:border-text hover:brightness-105"
          : "border-border/80 hover:border-text bg-bg text-transparent hover:bg-surface-hover/50"
      } ${className}`}
    >
      {isLocked ? (
        <Lock className={`${iconSizeClass} text-text-muted`} />
      ) : checked ? (
        <span className="flex items-center justify-center animate-check-pop">
          <Check className={`${iconSizeClass} stroke-[3]`} />
        </span>
      ) : (
        <span className="w-2.5 h-2.5 rounded-[inherit] border border-transparent group-hover:border-border/70 transition-colors" />
      )}
    </button>
  );
};

export default CheckboxTick;
