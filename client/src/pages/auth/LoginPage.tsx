import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import PointLogo from "../../components/icons/PointLogo";

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in both email and password");
      return;
    }

    try {
      setIsSubmitting(true);
      await login(email, password);
      toast.success("Welcome back");
      navigate("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sign in");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-bg text-text flex flex-col items-center justify-center p-4">
      {/* Box-styled Auth Card */}
      <div className="w-full max-w-sm bg-surface border border-border rounded-md p-6 shadow-2xl space-y-6">
        {/* Brand Header: Logo on left, title on right top, tagline below */}
        <div className="flex items-center gap-3 pb-2 border-b border-border/60">
          <div className="p-2.5 bg-bg border border-border rounded-md shrink-0">
            <PointLogo size={24} className="text-text" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-text leading-tight">point001</h1>
            <p className="text-[11px] text-text-muted font-mono uppercase tracking-wider mt-0.5">
              one point for everything.
            </p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-text-muted block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@point001.local"
              autoComplete="email"
              required
              className="w-full bg-bg border border-border rounded-md px-3 py-2 text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-text transition-colors font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-text-muted block">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="w-full bg-bg border border-border rounded-md pl-3 pr-9 py-2 text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-text transition-colors font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="interactive-tap absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="interactive-tap w-full bg-text text-bg hover:bg-text/90 border border-text font-semibold text-xs py-2 rounded-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2"
          >
            <span>{isSubmitting ? "Authenticating..." : "Sign In"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Footer: Register and Reset Password Links */}
        <div className="pt-4 border-t border-border space-y-2 text-center text-xs font-mono">
          <p className="text-text-muted">
            Don't have an account?{" "}
            <Link to="/register" className="text-text hover:underline font-semibold ml-1">
              Register
            </Link>
          </p>
          <p className="text-text-muted">
            Forgot password?{" "}
            <Link to="/forgot-password" className="text-text hover:underline font-semibold ml-1">
              Reset Password
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
