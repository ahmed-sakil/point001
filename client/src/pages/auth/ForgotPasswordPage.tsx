import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import PointLogo from "../../components/icons/PointLogo";

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your account email");
      return;
    }

    setIsSubmitted(true);
    toast.success("Recovery instructions simulated for your account");
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

        {isSubmitted ? (
          <div className="p-4 bg-bg border border-border rounded-md space-y-2.5 text-center">
            <p className="text-xs text-text font-medium">Recovery Link Dispatched</p>
            <p className="text-[11px] text-text-muted font-mono leading-relaxed">
              If an account with <span className="text-text font-semibold">{email}</span> exists, you will
              receive reset instructions shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-text-muted block">
                Account Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@point001.local"
                required
                className="w-full bg-bg border border-border rounded-md px-3 py-2 text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-text transition-colors font-mono"
              />
            </div>

            <button
              type="submit"
              className="interactive-tap w-full bg-text text-bg hover:bg-text/90 border border-text font-semibold text-xs py-2 rounded-md flex items-center justify-center gap-2 transition-all mt-2"
            >
              <span>Send Recovery Link</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* Footer Link to Login */}
        <div className="pt-4 border-t border-border text-center">
          <Link
            to="/login"
            className="interactive-tap inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text font-mono"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to sign in</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
