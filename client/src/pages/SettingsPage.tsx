import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  User as UserIcon,
  Loader2,
  Lock,
  Mail,
  Camera,
  ChevronRight,
  ShieldCheck,
  Globe,
  Save,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  ExternalLink,
  Key,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

interface EmailAccountItem {
  id: string;
  email: string;
  label: string;
  color: string;
  provider: string;
  authType: string;
  isActive: boolean;
  lastSyncedAt: string | null;
  syncStatus: string;
  errorMessage: string | null;
  createdAt: string;
  _count?: { messages: number };
}

interface SettingsData {
  profile: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    createdAt: string;
  };
  google: {
    hasApiKey: boolean;
    googleApiKey: string;
    googleClientId: string;
    lastSyncAt: string | null;
  };
}

export const SettingsPage: React.FC = () => {
  const { subpage } = useParams<{ subpage?: string }>();
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Email Accounts State
  const [emailAccounts, setEmailAccounts] = useState<EmailAccountItem[]>([]);
  const [isConnectingEmail, setIsConnectingEmail] = useState(false);
  const [syncingEmailId, setSyncingEmailId] = useState<string | null>(null);
  const [newEmailAddress, setNewEmailAddress] = useState("");
  const [newAppPassword, setNewAppPassword] = useState("");
  const [newAccountLabel, setNewAccountLabel] = useState("");
  const [showAppPassword, setShowAppPassword] = useState(false);

  // Profile Form State
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Google Integration Form State
  const [googleClientId, setGoogleClientId] = useState("");
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  // Fetch Email Accounts
  const fetchEmailAccounts = async () => {
    try {
      const data = await api.get<EmailAccountItem[]>("/emails/accounts");
      setEmailAccounts(data);
    } catch {
      // ignore
    }
  };

  // Fetch Settings Data
  const fetchSettings = async () => {
    try {
      const data = await api.get<SettingsData>("/settings");
      setName(data.profile.name || "");
      setAvatarUrl(data.profile.avatarUrl || "");
      setAvatarLoadError(false);
      setEmail(data.profile.email);
      setGoogleClientId(
        data.google.googleClientId ||
          (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) ||
          ""
      );
      setLastSyncAt(data.google.lastSyncAt);
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchEmailAccounts();
  }, []);

  // Update Profile Submit
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword) {
      if (newPassword.length < 6) {
        toast.error("New password must be at least 6 characters");
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error("New passwords do not match");
        return;
      }
      if (!currentPassword) {
        toast.error("Current password is required to change password");
        return;
      }
    }

    setIsSavingProfile(true);
    try {
      const res = await api.put<{ message: string; user: any }>("/settings/profile", {
        name,
        avatarUrl,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });

      updateUser({
        name: res.user.name,
        avatarUrl: res.user.avatarUrl,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Google OAuth Sync
  const handleConnectWithGoogle = () => {
    if (!googleClientId) {
      toast.error("Please configure your Google Client ID first");
      return;
    }

    const redirectUri = window.location.origin;
    const scopes = [
      "openid",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/contacts.readonly",
      "https://www.googleapis.com/auth/contacts.other.readonly",
    ].join(" ");

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      googleClientId
    )}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=token&scope=${encodeURIComponent(
      scopes
    )}&prompt=consent&include_granted_scopes=true`;

    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      authUrl,
      "google_oauth",
      `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
    );

    if (!popup) {
      toast.error("Please allow popups to connect with Google");
      return;
    }

    setIsSyncing(true);

    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === "GOOGLE_OAUTH_ERROR") {
        window.removeEventListener("message", handleMessage);
        setIsSyncing(false);
        toast.error("Google authentication was canceled or denied");
        return;
      }

      if (event.data?.type === "GOOGLE_OAUTH_TOKEN") {
        window.removeEventListener("message", handleMessage);
        const { accessToken } = event.data;

        try {
          const syncRes = await api.post<{
            message: string;
            user: { name: string; avatarUrl: string; email: string };
            contactsSynced: number;
          }>("/settings/google/sync", {
            accessToken,
            clientId: googleClientId,
          });

          updateUser({
            name: syncRes.user.name,
            avatarUrl: syncRes.user.avatarUrl,
          });

          setName(syncRes.user.name || "");
          setAvatarUrl(syncRes.user.avatarUrl || "");
          setLastSyncAt(new Date().toISOString());

          toast.success(
            `Connected! Synced profile and ${syncRes.contactsSynced} Google Contacts.`
          );
        } catch (err: any) {
          toast.error(err?.response?.data?.error || "Google synchronization failed");
        } finally {
          setIsSyncing(false);
        }
      }
    };

    window.addEventListener("message", handleMessage);

    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        window.removeEventListener("message", handleMessage);
        setIsSyncing(false);
      }
    }, 1000);
  };

  // Connect Email Account
  const handleConnectEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmailAddress.trim() || !newEmailAddress.includes("@")) {
      toast.error("Please provide a valid Gmail address");
      return;
    }
    const cleanPass = newAppPassword.replace(/\s+/g, "");
    if (cleanPass.length < 16) {
      toast.error("Google App Password must be 16 characters");
      return;
    }

    setIsConnectingEmail(true);
    try {
      await api.post("/emails/accounts", {
        email: newEmailAddress.trim(),
        appPassword: cleanPass,
        label: newAccountLabel.trim() || undefined,
      });
      toast.success("Gmail connected! Initial background sync started.");
      setNewEmailAddress("");
      setNewAppPassword("");
      setNewAccountLabel("");
      await fetchEmailAccounts();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to connect Gmail");
    } finally {
      setIsConnectingEmail(false);
    }
  };

  // Disconnect Email Account
  const handleDisconnectEmail = async (id: string, accEmail: string) => {
    if (!window.confirm(`Disconnect ${accEmail}? All synced messages will be removed.`)) {
      return;
    }
    try {
      await api.delete(`/emails/accounts/${id}`);
      toast.success("Account disconnected");
      setEmailAccounts((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to disconnect account");
    }
  };

  // Sync Email Account
  const handleSyncEmail = async (id: string) => {
    setSyncingEmailId(id);
    try {
      const res = await api.post<{ message: string; syncedCount: number }>(`/emails/accounts/${id}/sync`);
      toast.success(`Synced ${res.syncedCount} messages`);
      await fetchEmailAccounts();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Sync failed");
    } finally {
      setSyncingEmailId(null);
    }
  };

  const getInitials = (str: string) => {
    const trimmed = (str || "User").trim();
    return trimmed.slice(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-text" />
        <span className="text-xs font-mono text-text-muted">Loading settings...</span>
      </div>
    );
  }

  // =========================================================================
  // NESTED SUBPAGES VIEW
  // =========================================================================
  if (subpage) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/settings")}
              className="interactive-tap inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-hover border border-border rounded-md text-xs font-mono text-text transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Settings</span>
            </button>
            <span className="text-xs font-mono text-text-muted">/</span>
            <span className="text-xs font-mono text-text font-semibold capitalize">
              {subpage === "profile"
                ? "Profile Information"
                : subpage === "google"
                ? "Google Integration"
                : subpage === "mail"
                ? "Mail Accounts (Unified Inbox)"
                : subpage}
            </span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* SUBPAGE 1: PROFILE INFORMATION */}
        {/* ================================================================= */}
        {subpage === "profile" && (
          <div className="bg-surface border border-border rounded-md p-6 max-w-2xl mx-auto space-y-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <UserIcon className="w-4 h-4 text-text" />
                <h2 className="text-sm font-bold text-text">Profile Information</h2>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg border border-border text-text-muted">
                Personal
              </span>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {/* Avatar Preview & URL */}
              <div className="flex items-center gap-4 p-4 bg-bg rounded-md border border-border">
                {avatarUrl && !avatarLoadError ? (
                  <img
                    src={avatarUrl}
                    alt={name || "User Avatar"}
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarLoadError(true)}
                    className="w-14 h-14 rounded-full object-cover border border-border shrink-0 shadow-xs"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-surface border border-border flex items-center justify-center font-mono font-bold text-sm text-text shrink-0">
                    {getInitials(name || email)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold text-text block truncate">
                    {name || "User"}
                  </span>
                  <span className="text-[10px] text-text-muted font-mono block truncate mt-0.5">
                    {email}
                  </span>
                  <p className="text-[10px] text-text-muted font-mono mt-1">
                    Image loads from URL or synced Google Account.
                  </p>
                </div>
              </div>

              {/* Display Name Input */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-text block">
                  Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full bg-bg border border-border rounded-md px-3 py-2 text-xs text-text placeholder:text-text-muted/60 focus:outline-hidden focus:border-text font-mono"
                />
              </div>

              {/* Avatar URL Input */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-text block">
                  Avatar Image URL
                </label>
                <div className="relative">
                  <Camera className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => {
                      setAvatarUrl(e.target.value);
                      setAvatarLoadError(false);
                    }}
                    placeholder="https://example.com/photo.jpg"
                    className="w-full bg-bg border border-border rounded-md pl-9 pr-3 py-2 text-xs text-text placeholder:text-text-muted/60 focus:outline-hidden focus:border-text font-mono"
                  />
                </div>
              </div>

              {/* Registered Email (Disabled) */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-text-muted block">
                  Email Address (Primary Account)
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full bg-bg/50 border border-border/60 rounded-md px-3 py-2 text-xs text-text-muted font-mono cursor-not-allowed"
                />
              </div>

              {/* Password Change Section */}
              <div className="pt-4 border-t border-border space-y-3">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-text-muted" />
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-text">
                    Change Password
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-text-muted block">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full bg-bg border border-border rounded-md px-3 py-2 text-xs text-text placeholder:text-text-muted/60 focus:outline-hidden focus:border-text font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-mono text-text-muted block">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full bg-bg border border-border rounded-md px-3 py-2 text-xs text-text placeholder:text-text-muted/60 focus:outline-hidden focus:border-text font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-mono text-text-muted block">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full bg-bg border border-border rounded-md px-3 py-2 text-xs text-text placeholder:text-text-muted/60 focus:outline-hidden focus:border-text font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t border-border flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="interactive-tap inline-flex items-center gap-2 px-4 py-2 bg-text text-bg hover:bg-text/90 rounded-md text-xs font-mono font-medium transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Profile
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================================================================= */}
        {/* SUBPAGE 2: GOOGLE INTEGRATION */}
        {/* ================================================================= */}
        {subpage === "google" && (
          <div className="bg-surface border border-border rounded-md p-6 max-w-2xl mx-auto space-y-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-text" />
                <h2 className="text-sm font-bold text-text">Google Integration</h2>
              </div>
              {lastSyncAt ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-hover border border-border text-text">
                  Connected
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg border border-border text-text-muted">
                  Not Connected
                </span>
              )}
            </div>

            <div className="space-y-4">
              {/* Google Client ID Configuration */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-text block">
                    Google OAuth Client ID
                  </label>
                  <span className="text-[10px] font-mono text-text-muted">
                    Loaded from configuration
                  </span>
                </div>
                <input
                  type="text"
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                  placeholder="1027551093737-...apps.googleusercontent.com"
                  className="w-full bg-bg border border-border rounded-md px-3 py-2 text-xs text-text placeholder:text-text-muted/60 focus:outline-hidden focus:border-text font-mono"
                />
              </div>

              {/* Integration Status Card */}
              <div className="p-4 bg-bg border border-border rounded-md space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-text-muted">Account:</span>
                  <span className="text-text font-medium">{email}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-text-muted">Scope Access:</span>
                  <span className="text-text">Profile info & Google Contacts</span>
                </div>
                {lastSyncAt && (
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-text-muted">Last Synced:</span>
                    <span className="text-text">
                      {new Date(lastSyncAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Security Notice */}
              <div className="p-3 bg-bg border border-border rounded-md flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-text shrink-0 mt-0.5" />
                <p className="text-[11px] text-text-muted leading-relaxed font-mono">
                  Synchronization is securely linked to <strong className="text-text">{email}</strong>. Connecting automatically synchronizes your Google profile picture, display name, and all contacts.
                </p>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleConnectWithGoogle}
                  disabled={isSyncing}
                  className="w-full interactive-tap inline-flex items-center justify-center gap-2.5 px-4 py-2.5 bg-text text-bg hover:bg-text/90 rounded-md text-xs font-mono font-medium transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting & Syncing with Google...
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4" />
                      {lastSyncAt ? "Re-sync with Google" : "Connect with Google"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* SUBPAGE 3: MAIL ACCOUNTS (UNIFIED INBOX) */}
        {/* ================================================================= */}
        {subpage === "mail" && (
          <div className="bg-surface border border-border rounded-md p-6 max-w-2xl mx-auto space-y-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-text" />
                <h2 className="text-sm font-bold text-text">Mail Accounts (Unified Inbox)</h2>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg border border-border text-text-muted">
                {emailAccounts.length} Connected
              </span>
            </div>

            {/* List of Connected Accounts */}
            {emailAccounts.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted block">
                  Connected Accounts
                </span>
                <div className="space-y-2">
                  {emailAccounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="p-3.5 bg-bg border border-border rounded-md flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: acc.color || "#f4f4f6" }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-text truncate">
                            {acc.label || acc.email}
                          </p>
                          <p className="text-[11px] font-mono text-text-muted truncate">
                            {acc.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {acc.syncStatus === "SYNCING" || syncingEmailId === acc.id ? (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-border text-text inline-flex items-center gap-1">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" /> Syncing
                          </span>
                        ) : acc.syncStatus === "ERROR" ? (
                          <span
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted"
                            title={acc.errorMessage || "Sync error"}
                          >
                            Error
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-hover border border-border text-text">
                            Active
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSyncEmail(acc.id)}
                          disabled={syncingEmailId === acc.id}
                          className="p-1.5 bg-surface hover:bg-surface-hover border border-border rounded text-text-muted hover:text-text transition-colors disabled:opacity-50 cursor-pointer"
                          title="Sync emails now"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncingEmailId === acc.id ? "animate-spin" : ""}`} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDisconnectEmail(acc.id, acc.email)}
                          className="p-1.5 bg-surface hover:bg-surface-hover border border-border hover:border-text-muted rounded text-text-muted hover:text-text transition-colors cursor-pointer"
                          title="Disconnect account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Form to Connect New Account */}
            <form onSubmit={handleConnectEmail} className="space-y-4 pt-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted block border-t border-border pt-4">
                Connect New Gmail Account
              </span>

              {/* Email Address Input */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-text block">
                  Gmail Address
                </label>
                <input
                  type="email"
                  value={newEmailAddress}
                  onChange={(e) => setNewEmailAddress(e.target.value)}
                  placeholder="name@gmail.com"
                  required
                  className="w-full bg-bg border border-border rounded-md px-3 py-2 text-xs text-text placeholder:text-text-muted/60 focus:outline-hidden focus:border-text font-mono"
                />
              </div>

              {/* 16-Digit App Password */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-text block">
                  16-Digit Google App Password
                </label>
                <div className="relative">
                  <input
                    type={showAppPassword ? "text" : "password"}
                    value={newAppPassword}
                    onChange={(e) => setNewAppPassword(e.target.value)}
                    placeholder="xxxx xxxx xxxx xxxx"
                    required
                    className="w-full bg-bg border border-border rounded-md px-3 py-2 text-xs text-text placeholder:text-text-muted/60 focus:outline-hidden focus:border-text font-mono tracking-wider pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAppPassword(!showAppPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text cursor-pointer"
                  >
                    {showAppPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Optional Label */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-text block">
                  Account Label (Optional)
                </label>
                <input
                  type="text"
                  value={newAccountLabel}
                  onChange={(e) => setNewAccountLabel(e.target.value)}
                  placeholder="Primary Gmail, Work, Personal, etc."
                  className="w-full bg-bg border border-border rounded-md px-3 py-2 text-xs text-text placeholder:text-text-muted/60 focus:outline-hidden focus:border-text font-mono"
                />
              </div>

              {/* Setup Helper / Instructions */}
              <div className="p-4 bg-bg border border-border rounded-md space-y-2">
                <div className="flex items-center gap-2">
                  <Key className="w-3.5 h-3.5 text-text-muted" />
                  <span className="text-[11px] font-mono font-medium text-text">
                    How to generate a 16-Digit App Password:
                  </span>
                </div>
                <ol className="text-[11px] text-text-muted list-decimal list-inside space-y-1 leading-relaxed font-mono">
                  <li>Ensure <strong>2-Step Verification</strong> is enabled in your Google Account.</li>
                  <li>Visit the Google App Passwords settings page.</li>
                  <li>Name the app <strong>point001</strong> and generate the 16-character code.</li>
                </ol>
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-mono text-text underline hover:text-text/80 transition-colors pt-1"
                >
                  Open Google App Passwords <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isConnectingEmail}
                className="w-full interactive-tap inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-text text-bg hover:bg-text/90 rounded-md text-xs font-mono font-medium transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isConnectingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Testing IMAP Connection...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Test & Connect Mail Account
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // MAIN SETTINGS HUB (Command Center Standard)
  // =========================================================================
  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-text">Settings</h1>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-surface border border-border text-text-muted">
              Preferences & Integrations
            </span>
          </div>
          <p className="text-xs font-mono text-text-muted mt-1">
            Profile management • Google Contact Sync • Mail Accounts
          </p>
        </div>
      </div>

      {/* Grid of Settings Cards (Command Center Standard Style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* CARD 1: PROFILE INFORMATION */}
        <section
          onClick={() => navigate("/settings/profile")}
          className="interactive-tap group p-4 bg-surface border border-border rounded-md hover:border-border/80 flex flex-col justify-between cursor-pointer transition-all duration-200"
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-text" />
                <h2 className="text-xs uppercase font-mono tracking-wider font-semibold text-text">
                  Profile Information
                </h2>
              </div>
              <span className="text-[10px] font-mono text-text-muted">Personal</span>
            </div>

            <div className="flex items-center gap-3 p-3 bg-bg border border-border rounded-md mb-3">
              {avatarUrl && !avatarLoadError ? (
                <img
                  src={avatarUrl}
                  alt={name || "User Avatar"}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarLoadError(true)}
                  className="w-10 h-10 rounded-full object-cover border border-border shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center font-mono font-bold text-xs text-text shrink-0">
                  {getInitials(name || email)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-text truncate">
                  {name || "User"}
                </p>
                <p className="text-[10px] font-mono text-text-muted truncate mt-0.5">
                  {email}
                </p>
              </div>
            </div>

            <p className="text-xs text-text-muted font-mono leading-relaxed">
              Manage your display name, profile avatar photo URL, and account security password.
            </p>
          </div>

          <div className="pt-3 border-t border-border mt-4 flex items-center justify-between text-xs font-mono text-text-muted group-hover:text-text transition-colors">
            <span>Manage Profile</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </section>

        {/* CARD 2: GOOGLE INTEGRATION */}
        <section
          onClick={() => navigate("/settings/google")}
          className="interactive-tap group p-4 bg-surface border border-border rounded-md hover:border-border/80 flex flex-col justify-between cursor-pointer transition-all duration-200"
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-text" />
                <h2 className="text-xs uppercase font-mono tracking-wider font-semibold text-text">
                  Google Integration
                </h2>
              </div>
              {lastSyncAt ? (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-hover border border-border text-text">
                  Connected
                </span>
              ) : (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg border border-border text-text-muted">
                  Not Connected
                </span>
              )}
            </div>

            <p className="text-xs text-text-muted font-mono leading-relaxed mb-3">
              Connect your Google account via OAuth to synchronize your profile picture, display name, and Google Contacts.
            </p>

            <div className="p-3 bg-bg border border-border rounded-md text-[11px] font-mono space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Sync Status:</span>
                <span className="text-text">{lastSyncAt ? "Active" : "Idle"}</span>
              </div>
              {lastSyncAt && (
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Last Synced:</span>
                  <span className="text-text">{new Date(lastSyncAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-border mt-4 flex items-center justify-between text-xs font-mono text-text-muted group-hover:text-text transition-colors">
            <span>Configure Integration</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </section>

        {/* CARD 3: MAIL ACCOUNTS (UNIFIED INBOX) */}
        <section
          onClick={() => navigate("/settings/mail")}
          className="interactive-tap group p-4 bg-surface border border-border rounded-md hover:border-border/80 flex flex-col justify-between cursor-pointer transition-all duration-200"
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-text" />
                <h2 className="text-xs uppercase font-mono tracking-wider font-semibold text-text">
                  Mail Accounts
                </h2>
              </div>
              {emailAccounts.length > 0 ? (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-hover border border-border text-text">
                  {emailAccounts.length} Connected
                </span>
              ) : (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg border border-border text-text-muted">
                  Not Configured
                </span>
              )}
            </div>

            <p className="text-xs text-text-muted font-mono leading-relaxed mb-3">
              Connect Gmail via 16-digit App Password for background sync, message notifications, and instant read status.
            </p>

            <div className="p-3 bg-bg border border-border rounded-md text-[11px] font-mono space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Connected Inboxes:</span>
                <span className="text-text">{emailAccounts.length}</span>
              </div>
              {emailAccounts.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Primary:</span>
                  <span className="text-text truncate max-w-[140px]">{emailAccounts[0].email}</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-border mt-4 flex items-center justify-between text-xs font-mono text-text-muted group-hover:text-text transition-colors">
            <span>Manage Accounts</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;
