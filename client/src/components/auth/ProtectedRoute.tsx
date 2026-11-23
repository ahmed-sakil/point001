import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import PointLogo from "../icons/PointLogo";

export const ProtectedRoute: React.FC = () => {
  const { user, token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-screen bg-bg text-text flex flex-col items-center justify-center">
        <PointLogo size={28} className="text-text animate-pulse mb-3" />
        <span className="text-xs uppercase font-mono tracking-widest text-text-muted">
          point001
        </span>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
