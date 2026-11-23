import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Mail,
  RefreshCw,
  Search,
  Star,
  MailCheck,
  ChevronDown,
  Loader2,
  Inbox as InboxIcon,
  Clock,
  Calendar,
  X,
  Filter,
  ArrowDownToLine,
  CheckSquare,
} from "lucide-react";
import { toast } from "sonner";
import DOMPurify from "dompurify";
import { api } from "../lib/api";
import ActionDrawer from "../components/ui/ActionDrawer";

interface EmailAccount {
  id: string;
  email: string;
  label: string;
  color: string;
}

interface EmailMessage {
  id: string;
  accountId: string;
  messageId: string;
  threadId: string | null;
  senderName: string;
  senderEmail: string;
  senderAvatarUrl?: string | null;
  subject: string;
  snippet: string;
  bodyHtml: string | null;
  date: string;
  isUnread: boolean;
  isStarred: boolean;
  account?: EmailAccount;
}

interface MessagesResponse {
  messages: EmailMessage[];
  counts: {
    total: number;
    unread: number;
    today: number;
    yesterday: number;
  };
  hasMore: boolean;
}

export const InboxPage: React.FC = () => {
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [counts, setCounts] = useState({ total: 0, unread: 0, today: 0, yesterday: 0 });
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [showEarlier, setShowEarlier] = useState(false);
  const [pageOffset, setPageOffset] = useState(0);

  // Fetch Accounts
  const fetchAccounts = useCallback(async () => {
    try {
      const data = await api.get<EmailAccount[]>("/emails/accounts");
      setAccounts(data);
    } catch {
      // ignore
    }
  }, []);

  // Fetch Messages
  const fetchMessages = useCallback(
    async (reset = false) => {
      if (reset) {
        setIsLoading(true);
        setPageOffset(0);
      }
      try {
        const offset = reset ? 0 : pageOffset;
        const params = new URLSearchParams({
          limit: "50",
          offset: String(offset),
        });

        if (selectedAccountId !== "all") {
          params.append("accountId", selectedAccountId);
        }
        if (filterUnreadOnly) {
          params.append("isUnread", "true");
        }
        if (searchQuery.trim()) {
          params.append("search", searchQuery.trim());
        }

        const data = await api.get<MessagesResponse>(`/emails/messages?${params.toString()}`);

        if (reset) {
          setMessages(data.messages);
        } else {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newOnes = data.messages.filter((m) => !existingIds.has(m.id));
            return [...prev, ...newOnes];
          });
        }
        setCounts(data.counts);
        setHasMore(data.hasMore);
      } catch (error) {
        toast.error("Failed to load emails");
      } finally {
        setIsLoading(false);
      }
    },
    [selectedAccountId, filterUnreadOnly, searchQuery, pageOffset]
  );

  // Initial Load
  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    fetchMessages(true);
  }, [selectedAccountId, filterUnreadOnly, fetchMessages]);

  // Handle Search submit / enter
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMessages(true);
  };

  // Sync Emails On-Demand
  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      const res = await api.post<{ message: string; syncedCount: number }>("/emails/accounts/all/sync");
      toast.success(`Sync complete: ${res.syncedCount} new messages fetched`);
      await fetchMessages(true);
      await fetchAccounts();
      window.dispatchEvent(new Event("emails:updated"));
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to sync emails");
    } finally {
      setIsSyncing(false);
    }
  };

  // Load More Older Emails from Server (Icon option in drawer)
  const handleLoadMoreFromServer = () => {
    if (!hasMore) {
      toast.info("No more older emails available on server");
      return;
    }
    setPageOffset((prev) => prev + 50);
    fetchMessages(false);
    toast.info("Loading older emails from server...");
  };

  // Mark message as read / unread
  const handleToggleRead = async (message: EmailMessage, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newUnreadStatus = !message.isUnread;

    // Optimistic update
    setMessages((prev) =>
      prev.map((m) => (m.id === message.id ? { ...m, isUnread: newUnreadStatus } : m))
    );
    if (selectedMessage?.id === message.id) {
      setSelectedMessage((prev) => (prev ? { ...prev, isUnread: newUnreadStatus } : null));
    }
    setCounts((prev) => ({
      ...prev,
      unread: Math.max(0, prev.unread + (newUnreadStatus ? 1 : -1)),
    }));

    try {
      await api.patch(`/emails/messages/${message.id}/read`, {
        isUnread: newUnreadStatus,
      });
      window.dispatchEvent(new Event("emails:updated"));
    } catch (err) {
      // revert on error
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, isUnread: message.isUnread } : m))
      );
      toast.error("Failed to update read status");
    }
  };

  // Select message & auto-mark read if unread
  const handleSelectMessage = (msg: EmailMessage) => {
    setSelectedMessage(msg);
    if (msg.isUnread) {
      handleToggleRead(msg);
    }
  };

  // Toggle Starred
  const handleToggleStar = async (message: EmailMessage, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newStarred = !message.isStarred;

    // Optimistic update
    setMessages((prev) =>
      prev.map((m) => (m.id === message.id ? { ...m, isStarred: newStarred } : m))
    );
    if (selectedMessage?.id === message.id) {
      setSelectedMessage((prev) => (prev ? { ...prev, isStarred: newStarred } : null));
    }

    try {
      await api.patch(`/emails/messages/${message.id}/star`);
    } catch {
      toast.error("Failed to update star");
    }
  };

  // Task Creation Modal from Email State
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskFormTitle, setTaskFormTitle] = useState("");
  const [taskFormDescription, setTaskFormDescription] = useState("");
  const [taskFormDueDate, setTaskFormDueDate] = useState("");
  const [taskFormDueTime, setTaskFormDueTime] = useState("");
  const [taskFormPriority, setTaskFormPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [isSavingTask, setIsSavingTask] = useState(false);

  // Open Task Modal prefilled with email details
  const handleOpenCreateTaskModal = (msg?: EmailMessage, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const target = msg || selectedMessage;
    if (!target) return;
    setTaskFormTitle(target.subject || "Email Task");
    const snippetText = target.snippet ? `\n\n${target.snippet}` : "";
    setTaskFormDescription(`From: ${target.senderName || ""} (${target.senderEmail || ""})${snippetText}`);
    const todayStr = new Date().toISOString().split("T")[0];
    setTaskFormDueDate(todayStr);
    setTaskFormDueTime("");
    setTaskFormPriority("MEDIUM");
    setShowTaskModal(true);
  };

  const handleSaveTaskModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskFormTitle.trim()) {
      toast.error("Task title is required");
      return;
    }
    setIsSavingTask(true);
    try {
      await api.post("/tasks-events/tasks", {
        title: taskFormTitle.trim(),
        description: taskFormDescription.trim() || undefined,
        dueDate: taskFormDueDate || undefined,
        dueTime: taskFormDueTime || undefined,
        priority: taskFormPriority,
      });
      toast.success("Task created in Tasks & Events!");
      setShowTaskModal(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to create task");
    } finally {
      setIsSavingTask(false);
    }
  };

  // Partition messages into Today, Yesterday, and Earlier
  const { todayMessages, yesterdayMessages, earlierMessages } = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

    const today: EmailMessage[] = [];
    const yesterday: EmailMessage[] = [];
    const earlier: EmailMessage[] = [];

    messages.forEach((msg) => {
      const msgTime = new Date(msg.date).getTime();
      if (msgTime >= startOfToday) {
        today.push(msg);
      } else if (msgTime >= startOfYesterday) {
        yesterday.push(msg);
      } else {
        earlier.push(msg);
      }
    });

    return {
      todayMessages: today,
      yesterdayMessages: yesterday,
      earlierMessages: earlier,
    };
  }, [messages]);

  // Format Time Helper
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    if (isToday) {
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // Sanitize email HTML content with DOMPurify to prevent Stored XSS
  const sanitizedBodyHtml = useMemo(() => {
    if (!selectedMessage?.bodyHtml) return "";
    return DOMPurify.sanitize(selectedMessage.bodyHtml, {
      USE_PROFILES: { html: true },
      ADD_ATTR: ["target"],
      FORBID_TAGS: ["script", "iframe", "object", "embed", "base", "form"],
    });
  }, [selectedMessage?.bodyHtml]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* ======================================================== */}
      {/* HEADER SECTION (Command Center Standard) */}
      {/* ======================================================== */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-border">
        {/* Title and Unread Counter Subtitle */}
        <div className="min-w-0 flex-1">
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-text truncate">Unified Inbox</h1>
          <p className="text-[11px] md:text-xs font-mono text-text-muted mt-0.5 truncate">
            {counts.unread > 0 ? (
              <span>
                <strong className="text-text">{counts.unread} unread</strong>{" "}
                {counts.unread === 1 ? "message" : "messages"}
              </span>
            ) : (
              <span>0 unread messages</span>
            )}
          </p>
        </div>

        {/* Action Controls & Settings Drawer */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Account Filter Dropdown (if multiple accounts) */}
          {accounts.length > 1 && (
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="bg-surface border border-border rounded-md px-2.5 py-1.5 text-xs font-mono text-text focus:outline-hidden focus:border-text cursor-pointer max-w-[120px] sm:max-w-none truncate"
            >
              <option value="all">All Inboxes ({accounts.length})</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.label || acc.email}
                </option>
              ))}
            </select>
          )}

          <ActionDrawer triggerTitle="Inbox Actions">
            {/* Option 1: Sync Mail */}
            <button
              onClick={handleSyncAll}
              disabled={isSyncing}
              title="Sync Mail"
              aria-label="Sync Mail"
              className="interactive-tap p-2 border border-border bg-surface text-text-muted hover:text-text hover:border-text rounded-md transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin text-text" : ""}`} />
              <span className="md:hidden text-xs font-mono">Sync Mail</span>
            </button>

            {/* Option 2: Unread Only Filter */}
            <button
              onClick={() => setFilterUnreadOnly((prev) => !prev)}
              title={filterUnreadOnly ? "Show All Emails" : "Filter Unread Only"}
              aria-label="Filter unread only"
              className={`interactive-tap p-2 border rounded-md transition-colors cursor-pointer flex items-center gap-2 ${
                filterUnreadOnly
                  ? "bg-text text-bg border-text shadow-xs"
                  : "bg-surface text-text-muted border-border hover:text-text hover:border-text"
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="md:hidden text-xs font-mono">Unread Only</span>
            </button>

            {/* Option 3: Load More From Server */}
            <button
              onClick={handleLoadMoreFromServer}
              disabled={!hasMore || isLoading}
              title={hasMore ? "Load More from Server" : "No More Emails on Server"}
              aria-label="Load more from server"
              className={`interactive-tap p-2 border rounded-md transition-colors flex items-center gap-2 ${
                hasMore
                  ? "bg-surface text-text-muted border-border hover:text-text hover:border-text cursor-pointer"
                  : "bg-surface/50 text-text-muted/40 border-border/50 cursor-not-allowed"
              }`}
            >
              <ArrowDownToLine className="w-4 h-4" />
              <span className="md:hidden text-xs font-mono">Load More</span>
            </button>
          </ActionDrawer>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SEARCH BAR (Top Part Stays Intact) */}
      {/* ======================================================== */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by sender, subject, or message content..."
          className="w-full bg-surface border border-border rounded-md pl-9 pr-24 py-2 text-xs text-text placeholder:text-text-muted/60 focus:outline-hidden focus:border-text font-mono"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              fetchMessages(true);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text text-[11px] font-mono cursor-pointer"
          >
            Clear
          </button>
        )}
      </form>

      {/* ======================================================== */}
      {/* CONTENT AREA: FULL-WIDTH LIST OR SLIDE-IN EMAIL VIEWER */}
      {/* ======================================================== */}
      {selectedMessage ? (
        /* DETAIL PAGE VIEW: Smooth slide-in animation from right */
        <div className="w-full bg-surface border border-border rounded-md p-5 space-y-4 shadow-sm animate-slide-in-right">
          {/* Top Detail Action Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-border">
            {/* Sender summary on left */}
            <div className="flex items-center gap-2.5 min-w-0">
              <EmailAvatar
                name={selectedMessage.senderName}
                email={selectedMessage.senderEmail}
                avatarUrl={selectedMessage.senderAvatarUrl}
                sizeClass="w-8 h-8"
                textSizeClass="text-[11px]"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-text truncate">
                  {selectedMessage.senderName || selectedMessage.senderEmail}
                </p>
                <p className="text-[10px] font-mono text-text-muted truncate">
                  {selectedMessage.senderEmail}
                </p>
              </div>
            </div>

            {/* Action Buttons: Add Task, Star, Mark Read/Unread (Icon-Only), Close (X with bg) */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* 1. Add Task Icon */}
              <button
                onClick={(e) => handleOpenCreateTaskModal(selectedMessage, e)}
                title="Create task from this email"
                aria-label="Create task from email"
                className="interactive-tap p-1.5 bg-bg hover:bg-surface-hover border border-border rounded-md text-text-muted hover:text-text transition-colors cursor-pointer"
              >
                <CheckSquare className="w-3.5 h-3.5" />
              </button>

              {/* 2. Star Icon */}
              <button
                onClick={(e) => handleToggleStar(selectedMessage, e)}
                title={selectedMessage.isStarred ? "Starred" : "Star message"}
                aria-label="Star email"
                className="interactive-tap p-1.5 bg-bg hover:bg-surface-hover border border-border rounded-md text-text transition-colors cursor-pointer"
              >
                <Star
                  className={`w-3.5 h-3.5 ${
                    selectedMessage.isStarred ? "fill-text text-text" : "text-text-muted"
                  }`}
                />
              </button>

              {/* 3. Mark Read / Unread Icon (Icon-Only, No Text) */}
              <button
                onClick={(e) => handleToggleRead(selectedMessage, e)}
                title={selectedMessage.isUnread ? "Mark as Read" : "Mark as Unread"}
                aria-label={selectedMessage.isUnread ? "Mark as Read" : "Mark as Unread"}
                className="interactive-tap p-1.5 bg-bg hover:bg-surface-hover border border-border rounded-md text-text transition-colors cursor-pointer"
              >
                {selectedMessage.isUnread ? (
                  <MailCheck className="w-3.5 h-3.5" />
                ) : (
                  <Mail className="w-3.5 h-3.5 text-text-muted hover:text-text" />
                )}
              </button>

              {/* 4. Close Cross Button (with background) */}
              <button
                onClick={() => setSelectedMessage(null)}
                title="Close email"
                aria-label="Close email"
                className="interactive-tap p-1.5 bg-bg hover:bg-surface-hover border border-border rounded-md text-text-muted hover:text-text transition-colors cursor-pointer ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Email Subject & Metadata */}
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-text leading-snug break-words">
              {selectedMessage.subject || "(No Subject)"}
            </h2>

            <div className="flex items-center justify-between text-xs font-mono text-text-muted pt-1">
              <span>
                {new Date(selectedMessage.date).toLocaleString([], {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
              {selectedMessage.account && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-border bg-bg text-text-muted">
                  {selectedMessage.account.label || selectedMessage.account.email}
                </span>
              )}
            </div>
          </div>

          {/* Email Body: Clean Noise-Free Viewer */}
          <div className="pt-2">
            {selectedMessage.bodyHtml ? (
              <div className="rounded-md border border-border bg-bg p-5 overflow-x-auto text-xs text-text leading-relaxed font-sans shadow-inner">
                <div
                  dangerouslySetInnerHTML={{ __html: sanitizedBodyHtml }}
                  className="email-body-content [&_*]:!max-w-full [&_img]:!max-w-full [&_a]:text-text [&_a]:underline [&_table]:!max-w-full"
                />
              </div>
            ) : (
              <div className="rounded-md border border-border bg-bg p-5 whitespace-pre-wrap font-mono text-xs text-text leading-relaxed">
                {selectedMessage.snippet || "No message content available."}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* FULL-WIDTH EMAIL LIST VIEW */
        <div className="w-full space-y-4">
          {isLoading && messages.length === 0 ? (
            <div className="p-12 bg-surface border border-border rounded-md flex flex-col items-center justify-center text-center">
              <Loader2 className="w-6 h-6 animate-spin text-text mb-2.5" />
              <p className="text-xs font-mono text-text-muted">Connecting to mailbox & fetching emails...</p>
            </div>
          ) : accounts.length === 0 ? (
            <div className="p-12 bg-surface border border-border rounded-md flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-md border border-border bg-bg flex items-center justify-center mb-3">
                <Mail className="w-5 h-5 text-text-muted" />
              </div>
              <h3 className="text-sm font-semibold text-text mb-1">No Mail Accounts Connected</h3>
              <p className="text-xs font-mono text-text-muted max-w-sm mb-4">
                Connect your Gmail using your 16-digit App Password in Settings to enable the Unified Inbox.
              </p>
              <a
                href="/settings/mail"
                className="interactive-tap inline-flex items-center gap-2 px-3.5 py-2 bg-text text-bg rounded-md text-xs font-mono font-medium hover:bg-text/90 transition-colors"
              >
                Configure Mail in Settings
              </a>
            </div>
          ) : messages.length === 0 ? (
            <div className="p-12 bg-surface border border-border rounded-md flex flex-col items-center justify-center text-center">
              <div className="w-9 h-9 rounded-md border border-border bg-bg flex items-center justify-center mb-2.5">
                <InboxIcon className="w-5 h-5 text-text" />
              </div>
              <p className="text-xs font-mono text-text">Your inbox is completely clear.</p>
              <p className="text-[11px] font-mono text-text-muted mt-1">
                {searchQuery ? "No emails matching your search query." : "Zero new messages."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* ======================================================== */}
              {/* GROUP 1: TODAY'S MAIL */}
              {/* ======================================================== */}
              {todayMessages.length > 0 && (
                <section className="bg-surface border border-border rounded-md p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-text" />
                      <h2 className="text-xs uppercase font-mono tracking-wider font-semibold text-text">
                        Today
                      </h2>
                    </div>
                    <span className="text-[10px] font-mono text-text-muted">
                      {todayMessages.length} {todayMessages.length === 1 ? "mail" : "mails"}
                    </span>
                  </div>

                    <div className="space-y-1.5">
                    {todayMessages.map((msg) => (
                      <EmailItemRow
                        key={msg.id}
                        msg={msg}
                        onSelect={() => handleSelectMessage(msg)}
                        onToggleRead={(e) => handleToggleRead(msg, e)}
                        onToggleStar={(e) => handleToggleStar(msg, e)}
                        onAddTask={(e) => handleOpenCreateTaskModal(msg, e)}
                        formatTime={formatTime}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* ======================================================== */}
              {/* GROUP 2: YESTERDAY'S MAIL */}
              {/* ======================================================== */}
              {yesterdayMessages.length > 0 && (
                <section className="bg-surface border border-border rounded-md p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-text" />
                      <h2 className="text-xs uppercase font-mono tracking-wider font-semibold text-text">
                        Yesterday
                      </h2>
                    </div>
                    <span className="text-[10px] font-mono text-text-muted">
                      {yesterdayMessages.length} {yesterdayMessages.length === 1 ? "mail" : "mails"}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {yesterdayMessages.map((msg) => (
                      <EmailItemRow
                        key={msg.id}
                        msg={msg}
                        onSelect={() => handleSelectMessage(msg)}
                        onToggleRead={(e) => handleToggleRead(msg, e)}
                        onToggleStar={(e) => handleToggleStar(msg, e)}
                        onAddTask={(e) => handleOpenCreateTaskModal(msg, e)}
                        formatTime={formatTime}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Zero today and yesterday fallback indicator */}
              {todayMessages.length === 0 && yesterdayMessages.length === 0 && (
                <div className="p-4 bg-surface border border-border rounded-md text-center">
                  <p className="text-xs font-mono text-text-muted">
                    No emails received Today or Yesterday. Check earlier emails below.
                  </p>
                </div>
              )}

              {/* ======================================================== */}
              {/* GROUP 3: EARLIER EMAILS (TOGGLEABLE / SEE MORE) */}
              {/* ======================================================== */}
              {earlierMessages.length > 0 && (
                <div className="space-y-2.5">
                  {!showEarlier ? (
                    <button
                      onClick={() => setShowEarlier(true)}
                      className="w-full interactive-tap p-3 bg-surface hover:bg-surface-hover border border-border rounded-md text-xs font-mono text-text flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <span>See earlier emails ({earlierMessages.length})</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <section className="bg-surface border border-border rounded-md p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between pb-2 border-b border-border">
                        <div className="flex items-center gap-2">
                          <InboxIcon className="w-3.5 h-3.5 text-text" />
                          <h2 className="text-xs uppercase font-mono tracking-wider font-semibold text-text">
                            Earlier Emails
                          </h2>
                        </div>
                        <button
                          onClick={() => setShowEarlier(false)}
                          className="text-[10px] font-mono text-text-muted hover:text-text cursor-pointer"
                        >
                          Hide
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {earlierMessages.map((msg) => (
                          <EmailItemRow
                            key={msg.id}
                            msg={msg}
                            onSelect={() => handleSelectMessage(msg)}
                            onToggleRead={(e) => handleToggleRead(msg, e)}
                            onToggleStar={(e) => handleToggleStar(msg, e)}
                            onAddTask={(e) => handleOpenCreateTaskModal(msg, e)}
                            formatTime={formatTime}
                          />
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* FLOATING WINDOW: TASK MODAL (Create Task from Email)     */}
      {/* ======================================================== */}
      {showTaskModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowTaskModal(false);
          }}
        >
          <div className="bg-surface border border-border rounded-md shadow-2xl max-w-lg w-full p-5 space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-text" />
                <h2 className="text-xs uppercase font-mono font-semibold tracking-wider text-text">
                  New Task from Email
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowTaskModal(false)}
                className="interactive-tap p-1 text-text-muted hover:text-text rounded-md"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTaskModal} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={taskFormTitle}
                  onChange={(e) => setTaskFormTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  required
                  autoFocus
                  className="w-full bg-bg border border-border rounded-md px-3 py-2 text-xs text-text placeholder:text-text-muted focus:outline-hidden focus:border-text font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">
                  Description
                </label>
                <textarea
                  value={taskFormDescription}
                  onChange={(e) => setTaskFormDescription(e.target.value)}
                  placeholder="Add details, notes, or sub-points..."
                  rows={3}
                  className="w-full bg-bg border border-border rounded-md px-3 py-2 text-xs text-text placeholder:text-text-muted focus:outline-hidden focus:border-text font-mono resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={taskFormDueDate}
                    onChange={(e) => setTaskFormDueDate(e.target.value)}
                    className="w-full bg-bg border border-border rounded-md px-2.5 py-1.5 text-xs text-text focus:outline-hidden focus:border-text font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={taskFormDueTime}
                    onChange={(e) => setTaskFormDueTime(e.target.value)}
                    className="w-full bg-bg border border-border rounded-md px-2.5 py-1.5 text-xs text-text focus:outline-hidden focus:border-text font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">
                    Priority
                  </label>
                  <select
                    value={taskFormPriority}
                    onChange={(e) => setTaskFormPriority(e.target.value as any)}
                    className="w-full bg-bg border border-border rounded-md px-2.5 py-1.5 text-xs text-text focus:outline-hidden focus:border-text font-mono"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="interactive-tap px-3 py-1.5 text-xs font-mono text-text-muted hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingTask}
                  className="interactive-tap px-4 py-1.5 bg-text text-bg rounded-md text-xs font-semibold disabled:opacity-50"
                >
                  {isSavingTask ? "Saving..." : "Save Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ========================================================
// SUB-COMPONENT: Reusable Email Avatar (URL or Monogram)
// ========================================================
interface EmailAvatarProps {
  name: string;
  email: string;
  avatarUrl?: string | null;
  sizeClass?: string;
  textSizeClass?: string;
}

const EmailAvatar: React.FC<EmailAvatarProps> = ({
  name,
  email,
  avatarUrl,
  sizeClass = "w-7 h-7",
  textSizeClass = "text-[10px]",
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  const initials = useMemo(() => {
    const target = (name && name !== "Unknown" ? name : email).trim();
    return target.slice(0, 2).toUpperCase();
  }, [name, email]);

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={name || email}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`${sizeClass} rounded-full object-cover border border-border shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-surface border border-border flex items-center justify-center font-mono font-bold ${textSizeClass} text-text shrink-0`}
    >
      {initials}
    </div>
  );
};

// ========================================================
// SUB-COMPONENT: Individual Email Item Row
// ========================================================
interface EmailRowProps {
  msg: EmailMessage;
  onSelect: () => void;
  onToggleRead: (e: React.MouseEvent) => void;
  onToggleStar: (e: React.MouseEvent) => void;
  onAddTask?: (e: React.MouseEvent) => void;
  formatTime: (d: string) => string;
}

const EmailItemRow: React.FC<EmailRowProps> = ({
  msg,
  onSelect,
  onToggleRead,
  onToggleStar,
  onAddTask,
  formatTime,
}) => {
  return (
    <div
      onClick={onSelect}
      className={`interactive-tap group p-2.5 border rounded-md cursor-pointer transition-all flex items-start gap-3 ${
        msg.isUnread
          ? "bg-bg border-border text-text hover:border-border/80"
          : "bg-surface/50 border-border/50 text-text/75 hover:bg-surface-hover hover:border-border"
      }`}
    >
      {/* Unread Indicator Dot */}
      <div className="pt-1.5 shrink-0">
        {msg.isUnread ? (
          <span className="block w-2 h-2 rounded-full bg-text shadow-xs" title="Unread" />
        ) : (
          <span className="block w-2 h-2 rounded-full bg-transparent" />
        )}
      </div>

      {/* Avatar (URL with fallback) */}
      <div className="shrink-0 mt-0.5">
        <EmailAvatar
          name={msg.senderName}
          email={msg.senderEmail}
          avatarUrl={msg.senderAvatarUrl}
          sizeClass="w-7 h-7"
          textSizeClass="text-[10px]"
        />
      </div>

      {/* Main Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p
            className={`text-xs truncate ${
              msg.isUnread ? "font-bold text-text" : "font-medium text-text/85"
            }`}
          >
            {msg.senderName || msg.senderEmail}
          </p>
          <span className="text-[10px] font-mono text-text-muted shrink-0">
            {formatTime(msg.date)}
          </span>
        </div>

        <p
          className={`text-xs truncate mt-0.5 ${
            msg.isUnread ? "font-semibold text-text" : "font-normal text-text-muted"
          }`}
        >
          {msg.subject || "(No Subject)"}
        </p>

        <p className="text-[11px] text-text-muted/70 font-mono line-clamp-1 mt-0.5">
          {msg.snippet}
        </p>
      </div>

      {/* Row Hover Actions */}
      <div className="flex items-center gap-1 shrink-0 pt-1">
        {onAddTask && (
          <button
            onClick={onAddTask}
            className="p-1 text-text-muted hover:text-text rounded transition-colors cursor-pointer"
            title="Create task from this email"
            aria-label="Create task from email"
          >
            <CheckSquare className="w-3 h-3 opacity-40 group-hover:opacity-100" />
          </button>
        )}

        <button
          onClick={onToggleStar}
          className="p-1 text-text-muted hover:text-text rounded transition-colors cursor-pointer"
          title={msg.isStarred ? "Starred" : "Star"}
        >
          <Star
            className={`w-3 h-3 ${msg.isStarred ? "fill-text text-text" : "opacity-40 group-hover:opacity-100"}`}
          />
        </button>

        <button
          onClick={onToggleRead}
          className="p-1 text-text-muted hover:text-text rounded transition-colors cursor-pointer"
          title={msg.isUnread ? "Mark as Read" : "Mark as Unread"}
        >
          {msg.isUnread ? (
            <MailCheck className="w-3 h-3" />
          ) : (
            <Mail className="w-3 h-3 opacity-40 group-hover:opacity-100" />
          )}
        </button>
      </div>
    </div>
  );
};

export default InboxPage;
