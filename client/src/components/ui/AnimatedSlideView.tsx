import React from "react";

export interface AnimatedSlideViewProps {
  slideKey: string | number;
  direction?: "left" | "right";
  children: React.ReactNode;
  className?: string;
}

export const AnimatedSlideView: React.FC<AnimatedSlideViewProps> = ({
  slideKey,
  direction = "right",
  children,
  className = "",
}) => {
  const animClass = direction === "left" ? "animate-slide-left" : "animate-slide-right";

  return (
    <div key={slideKey} className={`${animClass} ${className}`}>
      {children}
    </div>
  );
};

export default AnimatedSlideView;
