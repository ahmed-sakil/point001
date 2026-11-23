import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import PointLogo from "../../components/icons/PointLogo";

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please provide both email and password");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setIsSubmitting(true);
      await register(email, password, name || undefined);
      toast.success("Account created successfully");
      navigate("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to register account");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-bg text-text flex flex-col items-center justify-center p-4">
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

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-text-muted block">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sakil"
              autoComplete="name"
              className="w-full bg-bg border border-border rounded-md px-3 py-2 text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-text transition-colors font-mono"
            />
          </div>

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
                autoComplete="new-password"
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

          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-text-muted block">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                className="w-full bg-bg border border-border rounded-md pl-3 pr-9 py-2 text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-text transition-colors font-mono"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="interactive-tap absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="interactive-tap w-full bg-text text-bg hover:bg-text/90 border border-text font-semibold text-xs py-2 rounded-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-3"
          >
            <span>{isSubmitting ? "Creating Account..." : "Create Account"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Footer Link to Login */}
        <div className="pt-4 border-t border-border text-center">
          <p className="text-xs text-text-muted font-mono">
            Already have an account?{" "}
            <Link to="/login" className="text-text hover:underline font-semibold ml-1">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
