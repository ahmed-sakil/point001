import React from "react";

interface PointLogoProps {
  className?: string;
  size?: number;
}

export const PointLogo: React.FC<PointLogoProps> = ({ className = "", size = 20 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="point001 logo"
    >
      {/* Outer box border with subtle engineered radius */}
      <rect x="2.5" y="2.5" width="19" height="19" rx="3.5" stroke="currentColor" strokeWidth="1.5" />
      
      {/* Precision reticle crosshair ticks */}
      <line x1="12" y1="2.5" x2="12" y2="6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="17.5" x2="12" y2="21.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2.5" y1="12" x2="6.5" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="17.5" y1="12" x2="21.5" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />

      {/* The One Focal Point - Pure High Contrast */}
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
    </svg>
  );
};

export default PointLogo;
