import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Calendar as CalendarIcon,
  CheckSquare,
  Edit3,
  History as HistoryIcon,
  Plus,
  Search,
  Check,
  Trash2,
  Edit2,
  X,
  Clock,
  MapPin,
  Loader2,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import ActionDrawer from "../components/ui/ActionDrawer";

interface TaskEventItem {
  id: string;
  type: "TASK" | "EVENT";
  title: string;
  description?: string;
  time?: string;
  dueDate?: string;
  startDate?: string;
  endDate?: string;
  isAllDay?: boolean;
  recurrenceEndDate?: string;
  eventType?: "STANDARD" | "BIRTHDAY" | "ANNIVERSARY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  recurrenceType?: "NONE" | "WEEKLY" | "MONTHLY" | "YEARLY" | "CUSTOM";
  color?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  isCompleted?: boolean;
  location?: string;
  isRemoving?: boolean;
}

interface DateGroup {
  dateStr: string;
  isToday: boolean;
  isTomorrow: boolean;
  formattedLabel: string;
  items: TaskEventItem[];
}

interface HistoryItem {
  id: string;
  type: "TASK" | "EVENT";
  title: string;
  description?: string;
  date?: string;
  time?: string;
  recurrenceEndDate?: string;
  eventType?: string;
  color?: string;
  priority?: string;
  isCompleted?: boolean;
  completedAt?: string;
  location?: string;
}

interface TasksEventsResponse {
  upcoming: DateGroup[];
  history: HistoryItem[];
  counts: {
    upcomingTasksCount: number;
    upcomingEventsCount: number;
    historyCount: number;
  };
}

const COLOR_PRESETS = [
  { label: "Light", value: "#f4f4f6" },
  { label: "Muted", value: "#73737c" },
  { label: "Slate", value: "#94a3b8" },
  { label: "Zinc", value: "#a1a1aa" },
  { label: "Charcoal", value: "#52525b" },
  { label: "Silver", value: "#d4d4d8" },
];

export const TasksPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [upcomingGroups, setUpcomingGroups] = useState<DateGroup[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [counts, setCounts] = useState({
    upcomingTasksCount: 0,
    upcomingEventsCount: 0,
    historyCount: 0,
  });

  // Filter & Mode States
  const [isEditMode, setIsEditMode] = useState(false);
  const [isHistoryView, setIsHistoryView] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "TASKS" | "EVENTS">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Number of months to show on initial list (this month + next month = 2)
  const [visibleMonthsCount, setVisibleMonthsCount] = useState(2);

  // Quick Add Task for Today State
  const [quickTaskTitle, setQuickTaskTitle] = useState("");

  // ==========================================================
  // FLOATING MODAL STATES (Task & Event)
  // ==========================================================
  // Task Modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskModalMode, setTaskModalMode] = useState<"create" | "edit">("create");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskFormTitle, setTaskFormTitle] = useState("");
  const [taskFormDescription, setTaskFormDescription] = useState("");
  const [taskFormDueDate, setTaskFormDueDate] = useState("");
  const [taskFormDueTime, setTaskFormDueTime] = useState("");
  const [taskFormPriority, setTaskFormPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");

  // Event Modal (time is optional, no default 10:00)
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventModalMode, setEventModalMode] = useState<"create" | "edit">("create");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventFormTitle, setEventFormTitle] = useState("");
  const [eventFormDescription, setEventFormDescription] = useState("");
  const [eventFormType, setEventFormType] = useState<"STANDARD" | "BIRTHDAY" | "ANNIVERSARY" | "WEEKLY" | "MONTHLY" | "YEARLY">("STANDARD");
  const [eventFormStartDate, setEventFormStartDate] = useState("");
  const [eventFormStartTime, setEventFormStartTime] = useState("");
  const [eventFormRecurrenceEndDate, setEventFormRecurrenceEndDate] = useState("");
  const [eventFormColor, setEventFormColor] = useState("#f4f4f6");
  const [eventFormLocation, setEventFormLocation] = useState("");

  // Today Date formatted for default pickers (YYYY-MM-DD)
  const todayDateStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  // Compute cutoff date for max months (current month + (visibleMonthsCount - 1) full months)
  const maxVisibleDateStr = useMemo(() => {
    const now = new Date();
    const targetYear = now.getFullYear();
    const targetMonth = now.getMonth() + visibleMonthsCount; // 0-indexed + count
    const endOfTargetMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);
    const y = endOfTargetMonth.getFullYear();
    const m = String(endOfTargetMonth.getMonth() + 1).padStart(2, "0");
    const d = String(endOfTargetMonth.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [visibleMonthsCount]);

  // Fetch Tasks and Events
  const fetchData = useCallback(async () => {
    try {
      const data = await api.get<TasksEventsResponse>("/tasks-events");
      setUpcomingGroups(data.upcoming);
      setHistoryItems(data.history);
      setCounts(data.counts);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load tasks and events");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Quick Add Task for Today (Enter or Ctrl+Enter)
  const handleQuickAddKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!quickTaskTitle.trim()) return;

      try {
        await api.post("/tasks-events/tasks", {
          title: quickTaskTitle.trim(),
        });
        setQuickTaskTitle("");
        toast.success("Task scheduled for today");
        fetchData();
      } catch {
        toast.error("Failed to add task");
      }
    }
  };

  // Complete / Remove Task with smooth 400ms transition
  const completeTask = async (id: string) => {
    setUpcomingGroups((prev) =>
      prev.map((g) => ({
        ...g,
        items: g.items.map((item) => (item.id === id ? { ...item, isRemoving: true } : item)),
      }))
    );

    try {
      await api.post(`/tasks-events/tasks/${id}/toggle`);
      setTimeout(() => {
        setUpcomingGroups((prev) =>
          prev
            .map((g) => ({
              ...g,
              items: g.items.filter((item) => item.id !== id),
            }))
            .filter((g) => g.items.length > 0)
        );
        fetchData();
        toast.success("Task marked completed");
      }, 400);
    } catch {
      setUpcomingGroups((prev) =>
        prev.map((g) => ({
          ...g,
          items: g.items.map((item) => (item.id === id ? { ...item, isRemoving: false } : item)),
        }))
      );
      toast.error("Failed to complete task");
    }
  };

  // Delete Task / Event
  const handleDeleteItem = async (id: string, type: "TASK" | "EVENT") => {
    try {
      if (type === "TASK") {
        await api.delete(`/tasks-events/tasks/${id}`);
      } else {
        await api.delete(`/tasks-events/events/${id}`);
      }
      toast.success(`${type === "TASK" ? "Task" : "Event"} deleted`);
      fetchData();
    } catch {
      toast.error("Failed to delete item");
    }
  };

  // ==========================================================
  // MODAL OPEN / CLOSE HANDLERS
  // ==========================================================
  const openNewTaskModal = () => {
    setShowEventModal(false);
    setTaskModalMode("create");
    setSelectedTaskId(null);
    setTaskFormTitle("");
    setTaskFormDescription("");
    setTaskFormDueDate(todayDateStr);
    setTaskFormDueTime("");
    setTaskFormPriority("MEDIUM");
    setShowTaskModal(true);
  };

  const openNewEventModal = () => {
    setShowTaskModal(false);
    setEventModalMode("create");
    setSelectedEventId(null);
    setEventFormTitle("");
    setEventFormDescription("");
    setEventFormType("STANDARD");
    setEventFormStartDate(todayDateStr);
    setEventFormStartTime("");
    setEventFormRecurrenceEndDate("");
    setEventFormColor("#f4f4f6");
    setEventFormLocation("");
    setShowEventModal(true);
  };

  const handleOpenEditModal = (item: TaskEventItem) => {
    if (item.type === "TASK") {
      setShowEventModal(false);
      setTaskModalMode("edit");
      setSelectedTaskId(item.id);
      setTaskFormTitle(item.title);
      setTaskFormDescription(item.description || "");
      setTaskFormDueDate(item.dueDate || todayDateStr);
      setTaskFormDueTime(item.time || "");
      setTaskFormPriority(item.priority || "MEDIUM");
      setShowTaskModal(true);
    } else {
      setShowTaskModal(false);
      setEventModalMode("edit");
      setSelectedEventId(item.id);
      setEventFormTitle(item.title);
      setEventFormDescription(item.description || "");
      setEventFormType(item.eventType || "STANDARD");
      setEventFormStartDate(
        item.startDate ? item.startDate.split("T")[0] : todayDateStr
      );
      setEventFormStartTime(item.time || "");
      setEventFormRecurrenceEndDate(item.recurrenceEndDate || "");
      setEventFormColor(item.color || "#f4f4f6");
      setEventFormLocation(item.location || "");
      setShowEventModal(true);
    }
  };

  // Save Task (Create or Edit)
  const handleSaveTaskModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskFormTitle.trim()) return;

    try {
      if (taskModalMode === "create") {
        await api.post("/tasks-events/tasks", {
          title: taskFormTitle.trim(),
          description: taskFormDescription.trim() || undefined,
          dueDate: taskFormDueDate || undefined,
          dueTime: taskFormDueTime || undefined,
          priority: taskFormPriority,
        });
        toast.success("Task created");
      } else if (selectedTaskId) {
        await api.put(`/tasks-events/tasks/${selectedTaskId}`, {
          title: taskFormTitle.trim(),
          description: taskFormDescription.trim() || undefined,
          dueDate: taskFormDueDate || undefined,
          dueTime: taskFormDueTime || undefined,
          priority: taskFormPriority,
        });
        toast.success("Task updated");
      }
      setShowTaskModal(false);
      fetchData();
    } catch {
      toast.error("Failed to save task");
    }
  };

  // Save Event (Create or Edit)
  const handleSaveEventModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventFormTitle.trim() || !eventFormStartDate) {
      toast.error("Title and start date are required");
      return;
    }

    try {
      const hasTime = Boolean(eventFormStartTime.trim());
      const startDateTime = hasTime
        ? `${eventFormStartDate}T${eventFormStartTime.trim()}:00`
        : `${eventFormStartDate}T00:00:00`;

      const payload = {
        title: eventFormTitle.trim(),
        description: eventFormDescription.trim() || undefined,
        startDate: startDateTime,
        isAllDay: !hasTime,
        eventType: eventFormType,
        recurrenceEndDate: eventFormRecurrenceEndDate || undefined,
        color: eventFormColor,
        location: eventFormLocation.trim() || undefined,
      };

      if (eventModalMode === "create") {
        await api.post("/tasks-events/events", payload);
        toast.success("Event scheduled");
      } else if (selectedEventId) {
        await api.put(`/tasks-events/events/${selectedEventId}`, payload);
        toast.success("Event updated");
      }
      setShowEventModal(false);
      fetchData();
    } catch {
      toast.error("Failed to save event");
    }
  };

  // Filter and Search logic with Month Limiter
  const filteredUpcoming = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return upcomingGroups
      .filter((group) => group.dateStr <= maxVisibleDateStr)
      .map((group) => {
        const filteredItems = group.items.filter((item) => {
          if (activeFilter === "TASKS" && item.type !== "TASK") return false;
          if (activeFilter === "EVENTS" && item.type !== "EVENT") return false;

          if (query) {
            const matchTitle = item.title.toLowerCase().includes(query);
            const matchDesc = item.description?.toLowerCase().includes(query);
            const matchLoc = item.location?.toLowerCase().includes(query);
            return matchTitle || matchDesc || matchLoc;
          }
          return true;
        });

        return { ...group, items: filteredItems };
      })
      .filter((group) => group.items.length > 0);
  }, [upcomingGroups, maxVisibleDateStr, activeFilter, searchQuery]);

  // Check if there are further months available
  const hasMoreMonths = useMemo(() => {
    return upcomingGroups.some((g) => g.dateStr > maxVisibleDateStr);
  }, [upcomingGroups, maxVisibleDateStr]);

  const filteredHistory = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return historyItems.filter((item) => {
      if (activeFilter === "TASKS" && item.type !== "TASK") return false;
      if (activeFilter === "EVENTS" && item.type !== "EVENT") return false;

      if (query) {
        const matchTitle = item.title.toLowerCase().includes(query);
        const matchDesc = item.description?.toLowerCase().includes(query);
        const matchLoc = item.location?.toLowerCase().includes(query);
        return matchTitle || matchDesc || matchLoc;
      }
      return true;
    });
  }, [historyItems, activeFilter, searchQuery]);

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center">
        <Loader2 className="w-5 h-5 text-text animate-spin mb-2" />
        <span className="text-xs font-mono text-text-muted">Loading tasks and events...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* PAGE HEADER & SETTING DRAWER */}
      {/* ======================================================== */}
      <div className="pb-4 border-b border-border flex items-start justify-between gap-3 relative">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-text truncate">
              {isHistoryView ? "Tasks and Events History" : "Tasks and Events"}
            </h1>
          </div>
          <p className="text-xs text-text-muted font-mono mt-1 truncate">
            {isHistoryView
              ? `${filteredHistory.length} archived and completed records`
              : `${counts.upcomingTasksCount} upcoming tasks • ${counts.upcomingEventsCount} scheduled events`}
          </p>
        </div>

        {/* Right Action Area: Edit Mode 2 Icons + Setting Drawer */}
        <div className="flex items-center gap-2 shrink-0">
          {/* WHEN EDIT MODE IS ACTIVE: ONLY TWO ICONS APPEAR (Add Task / Add Event) */}
          {isEditMode && !isHistoryView && (
            <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
              <button
                onClick={openNewTaskModal}
                title="Add New Task"
                className="interactive-tap relative p-2 bg-surface hover:bg-bg border border-border hover:border-text rounded-md text-text transition-colors"
                aria-label="Add new task"
              >
                <CheckSquare className="w-4 h-4" />
                <Plus className="w-2.5 h-2.5 absolute -top-1 -right-1 text-text bg-surface rounded-full border border-border" />
              </button>

              <button
                onClick={openNewEventModal}
                title="Add New Event"
                className="interactive-tap relative p-2 bg-surface hover:bg-bg border border-border hover:border-text rounded-md text-text transition-colors"
                aria-label="Add new event"
              >
                <CalendarIcon className="w-4 h-4" />
                <Plus className="w-2.5 h-2.5 absolute -top-1 -right-1 text-text bg-surface rounded-full border border-border" />
              </button>
            </div>
          )}

          <ActionDrawer triggerTitle="Tasks and Events Actions">
            {/* Icon 1: Edit Mode Toggle */}
            <button
              onClick={() => setIsEditMode((prev) => !prev)}
              title={isEditMode ? "Exit Edit Mode" : "Enter Edit Mode"}
              className={`interactive-tap p-2 border rounded-md transition-colors flex items-center gap-2 ${
                isEditMode
                  ? "bg-text text-bg border-text shadow-xs"
                  : "bg-surface text-text-muted border-border hover:text-text hover:border-text"
              }`}
              aria-label="Toggle edit mode"
            >
              <Edit3 className="w-4 h-4" />
              <span className="md:hidden text-xs font-mono">Edit Mode</span>
            </button>

            {/* Icon 2: History Toggle */}
            <button
              onClick={() => setIsHistoryView((prev) => !prev)}
              title={isHistoryView ? "Back to Upcoming" : "View History"}
              className={`interactive-tap p-2 border rounded-md transition-colors flex items-center gap-2 ${
                isHistoryView
                  ? "bg-text text-bg border-text shadow-xs"
                  : "bg-surface text-text-muted border-border hover:text-text hover:border-text"
              }`}
              aria-label="Toggle history view"
            >
              <HistoryIcon className="w-4 h-4" />
              <span className="md:hidden text-xs font-mono">History</span>
            </button>

            {/* Icon 3: Only Tasks Filter */}
            <button
              onClick={() =>
                setActiveFilter((prev) => (prev === "TASKS" ? "ALL" : "TASKS"))
              }
              title="Filter: Tasks Only"
              className={`interactive-tap p-2 border rounded-md transition-colors flex items-center gap-2 ${
                activeFilter === "TASKS"
                  ? "bg-text text-bg border-text shadow-xs"
                  : "bg-surface text-text-muted border-border hover:text-text hover:border-text"
              }`}
              aria-label="Filter tasks only"
            >
              <CheckSquare className="w-4 h-4" />
              <span className="md:hidden text-xs font-mono">Tasks Only</span>
            </button>

            {/* Icon 4: Only Events Filter */}
            <button
              onClick={() =>
                setActiveFilter((prev) => (prev === "EVENTS" ? "ALL" : "EVENTS"))
              }
              title="Filter: Events Only"
              className={`interactive-tap p-2 border rounded-md transition-colors flex items-center gap-2 ${
                activeFilter === "EVENTS"
                  ? "bg-text text-bg border-text shadow-xs"
                  : "bg-surface text-text-muted border-border hover:text-text hover:border-text"
              }`}
              aria-label="Filter events only"
            >
              <CalendarIcon className="w-4 h-4" />
              <span className="md:hidden text-xs font-mono">Events Only</span>
            </button>
          </ActionDrawer>
        </div>
      </div>

      {/* ======================================================== */}
      {/* QUICK ADD TODAY TASK + LIVE SEARCH BAR */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Quick Add Task for Today */}
        {!isHistoryView && (
          <div className="md:col-span-2">
            <input
              type="text"
              value={quickTaskTitle}
              onChange={(e) => setQuickTaskTitle(e.target.value)}
              onKeyDown={handleQuickAddKeyDown}
              placeholder="Quick add task for today..."
              className="w-full bg-surface border border-border rounded-md px-3 py-2.5 text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-text transition-colors font-mono"
            />
          </div>
        )}

        {/* Search Field */}
        <div className={isHistoryView ? "md:col-span-3" : "md:col-span-1"}>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks and events..."
              className="w-full bg-surface border border-border rounded-md pl-8 pr-3 py-2.5 text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-text transition-colors font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* UPCOMING DATE-GROUPED LIST */}
      {/* ======================================================== */}
      {!isHistoryView && (
        <div className="space-y-6">
          {filteredUpcoming.length === 0 ? (
            <div className="bg-surface border border-border rounded-md py-16 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-md border border-border bg-bg flex items-center justify-center mb-3">
                <Check className="w-5 h-5 text-text" />
              </div>
              <p className="text-xs font-mono text-text font-semibold">You're completely clear for this period.</p>
              <p className="text-[11px] font-mono text-text-muted mt-1">
                No upcoming tasks or events scheduled.
              </p>
            </div>
          ) : (
            filteredUpcoming.map((group) => (
              <div key={group.dateStr} className="space-y-2.5">
                {/* Date Separator Header */}
                <div className="flex items-center gap-2 px-1">
                  <span className="w-1.5 h-1.5 rounded-xs bg-text" />
                  <h3 className="text-xs font-mono font-bold tracking-wider text-text">
                    {group.isToday
                      ? `${group.formattedLabel} • TODAY`
                      : group.isTomorrow
                      ? `${group.formattedLabel} • TOMORROW`
                      : group.formattedLabel}
                  </h3>
                  <div className="h-px bg-border flex-1 ml-2" />
                </div>

                {/* Date Group Items List */}
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className={`group p-3 bg-surface border border-border rounded-md flex items-start justify-between gap-3 transition-all duration-400 ${
                        item.isRemoving
                          ? "opacity-0 -translate-x-4 max-h-0 py-0 my-0 overflow-hidden border-transparent"
                          : "opacity-100 translate-x-0 hover:border-border/80"
                      }`}
                    >
                      {/* Left: Indicator / Checkbox & Info */}
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {item.type === "TASK" ? (
                          <button
                            onClick={() => completeTask(item.id)}
                            className="interactive-tap w-4 h-4 rounded-xs border border-border bg-bg hover:border-text flex items-center justify-center shrink-0 mt-0.5 transition-colors"
                            aria-label="Mark task done"
                          >
                            {item.isRemoving && <Check className="w-3 h-3 text-text" />}
                          </button>
                        ) : (
                          <div className="w-4 h-4 rounded-xs flex items-center justify-center shrink-0 mt-0.5">
                            <span
                              className="w-2 h-2 rounded-xs"
                              style={{ backgroundColor: item.color || "#f4f4f6" }}
                            />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-xs font-medium truncate ${
                              item.isRemoving ? "line-through text-text-muted" : "text-text"
                            }`}
                          >
                            {item.title}
                          </p>

                          {/* Task or Event Description */}
                          {item.description && (
                            <p className="text-[11px] text-text-muted mt-0.5 line-clamp-2 font-mono">
                              {item.description}
                            </p>
                          )}

                          {/* Time & Location & Event info on below line */}
                          <div className="flex items-center flex-wrap gap-2 mt-1 text-[10px] font-mono text-text-muted">
                            {item.time && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{item.time}</span>
                              </span>
                            )}
                            {item.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span>{item.location}</span>
                              </span>
                            )}
                            {item.type === "EVENT" && item.eventType && item.eventType !== "STANDARD" && (
                              <span className="capitalize px-1.5 py-0.5 bg-bg border border-border rounded-xs text-[9px]">
                                {item.eventType.toLowerCase()}
                              </span>
                            )}
                            {item.type === "EVENT" && item.recurrenceEndDate && (
                              <span className="text-[9px] text-text-muted">
                                Ends: {item.recurrenceEndDate}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Edit Mode Actions */}
                      {isEditMode && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="interactive-tap p-1 text-text-muted hover:text-text rounded-xs"
                            aria-label="Edit item"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id, item.type)}
                            className="interactive-tap p-1 text-text-muted hover:text-text rounded-xs"
                            aria-label="Delete item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

          {/* Icon button at the bottom to add one more month */}
          {hasMoreMonths && (
            <div className="pt-2 flex justify-center">
              <button
                onClick={() => setVisibleMonthsCount((prev) => prev + 1)}
                title="Add one more month"
                className="interactive-tap p-2.5 bg-surface hover:bg-bg border border-border rounded-md text-text-muted hover:text-text hover:border-text transition-colors flex items-center gap-1.5 text-xs font-mono shadow-xs"
                aria-label="Add one more month"
              >
                <ChevronDown className="w-4 h-4" />
                <span>+1 Month</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* HISTORY VIEW (ALL PAST EVENTS AND TASKS) */}
      {/* TWO-COLUMN CONSTRAINED ON LARGE SCREENS */}
      {/* ======================================================== */}
      {isHistoryView && (
        <div className="w-full space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <HistoryIcon className="w-4 h-4 text-text" />
            <h2 className="text-xs uppercase font-mono font-semibold text-text">
              Past Tasks & Events
            </h2>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="bg-surface border border-border rounded-md py-16 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-md border border-border bg-bg flex items-center justify-center mb-3">
                <AlertCircle className="w-5 h-5 text-text-muted" />
              </div>
              <p className="text-xs font-mono text-text">No history records found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 bg-surface border border-border rounded-md flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-4 h-4 rounded-xs border border-border bg-bg flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-text" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-text truncate line-through opacity-75">
                        {item.title}
                      </p>
                      {item.description && (
                        <p className="text-[11px] text-text-muted line-clamp-1 mt-0.5 opacity-60 font-mono">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center flex-wrap gap-2 mt-1 text-[10px] font-mono text-text-muted">
                        {item.date && <span>{item.date}</span>}
                        {item.time && <span>• {item.time}</span>}
                        {item.location && <span>• {item.location}</span>}
                        {item.type === "EVENT" && item.eventType && (
                          <span className="capitalize px-1 py-0.2 bg-bg border border-border rounded-xs text-[9px]">
                            {item.eventType.toLowerCase()}
                          </span>
                        )}
                        {item.recurrenceEndDate && (
                          <span>• until {item.recurrenceEndDate}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {item.type === "EVENT" && item.color && (
                    <span
                      className="w-2 h-2 rounded-xs shrink-0 mt-1"
                      style={{ backgroundColor: item.color }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* FLOATING WINDOW: TASK MODAL (Create / Edit) */}
      {/* ======================================================== */}
      {showTaskModal &&
        createPortal(
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
                    {taskModalMode === "edit" ? "Edit Task" : "New Task"}
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
                    className="w-full bg-bg border border-border rounded-md px-3 py-2 text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-text font-mono"
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
                    className="w-full bg-bg border border-border rounded-md px-3 py-2 text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-text font-mono resize-none"
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
                      className="w-full bg-bg border border-border rounded-md px-2.5 py-1.5 text-xs text-text focus:outline-none focus:border-text font-mono"
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
                      className="w-full bg-bg border border-border rounded-md px-2.5 py-1.5 text-xs text-text focus:outline-none focus:border-text font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">
                      Priority
                    </label>
                    <select
                      value={taskFormPriority}
                      onChange={(e) => setTaskFormPriority(e.target.value as any)}
                      className="w-full bg-bg border border-border rounded-md px-2.5 py-1.5 text-xs text-text focus:outline-none focus:border-text font-mono"
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
                    className="interactive-tap px-4 py-1.5 bg-text text-bg rounded-md text-xs font-semibold"
                  >
                    {taskModalMode === "edit" ? "Update Task" : "Save Task"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ======================================================== */}
      {/* FLOATING WINDOW: EVENT MODAL (Create / Edit) */}
      {/* ======================================================== */}
      {showEventModal &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowEventModal(false);
            }}
          >
            <div className="bg-surface border border-border rounded-md shadow-2xl max-w-lg w-full p-5 space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto my-auto">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-text" />
                  <h2 className="text-xs uppercase font-mono font-semibold tracking-wider text-text">
                    {eventModalMode === "edit" ? "Edit Event" : "New Event"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="interactive-tap p-1 text-text-muted hover:text-text rounded-md"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEventModal} className="space-y-3.5">
                <div>
                  <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">
                    Event Title
                  </label>
                  <input
                    type="text"
                    value={eventFormTitle}
                    onChange={(e) => setEventFormTitle(e.target.value)}
                    placeholder="e.g. Birthday, Anniversary, Weekly Review..."
                    required
                    autoFocus
                    className="w-full bg-bg border border-border rounded-md px-3 py-2 text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-text font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">
                    Description
                  </label>
                  <textarea
                    value={eventFormDescription}
                    onChange={(e) => setEventFormDescription(e.target.value)}
                    placeholder="Add details, notes, or celebration agenda..."
                    rows={2}
                    className="w-full bg-bg border border-border rounded-md px-3 py-2 text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-text font-mono resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">
                      Event Type
                    </label>
                    <select
                      value={eventFormType}
                      onChange={(e) => setEventFormType(e.target.value as any)}
                      className="w-full bg-bg border border-border rounded-md px-2.5 py-1.5 text-xs text-text focus:outline-none focus:border-text font-mono"
                    >
                      <option value="STANDARD">Standard Event</option>
                      <option value="BIRTHDAY">Birthday</option>
                      <option value="ANNIVERSARY">Anniversary</option>
                      <option value="WEEKLY">Weekly Recurring</option>
                      <option value="MONTHLY">Monthly Recurring</option>
                      <option value="YEARLY">Yearly Recurring</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={eventFormLocation}
                      onChange={(e) => setEventFormLocation(e.target.value)}
                      placeholder="Room, Link, Place..."
                      className="w-full bg-bg border border-border rounded-md px-2.5 py-1.5 text-xs text-text focus:outline-none focus:border-text font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={eventFormStartDate}
                      onChange={(e) => setEventFormStartDate(e.target.value)}
                      required
                      className="w-full bg-bg border border-border rounded-md px-2.5 py-1.5 text-xs text-text focus:outline-none focus:border-text font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={eventFormStartTime}
                      onChange={(e) => setEventFormStartTime(e.target.value)}
                      placeholder="All day if empty"
                      className="w-full bg-bg border border-border rounded-md px-2.5 py-1.5 text-xs text-text focus:outline-none focus:border-text font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={eventFormRecurrenceEndDate}
                    onChange={(e) => setEventFormRecurrenceEndDate(e.target.value)}
                    placeholder="e.g. 2030-12-12"
                    className="w-full bg-bg border border-border rounded-md px-2.5 py-1.5 text-xs text-text focus:outline-none focus:border-text font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-text-muted block mb-1.5">
                    Color (for Calendar)
                  </label>
                  <div className="flex items-center gap-2">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setEventFormColor(c.value)}
                        title={c.label}
                        className={`w-6 h-6 rounded-xs transition-transform ${
                          eventFormColor.toLowerCase() === c.value.toLowerCase()
                            ? "ring-2 ring-text scale-110"
                            : "opacity-80 hover:opacity-100"
                        }`}
                        style={{ backgroundColor: c.value }}
                      />
                    ))}
                    <input
                      type="color"
                      value={eventFormColor}
                      onChange={(e) => setEventFormColor(e.target.value)}
                      className="w-6 h-6 rounded-xs border-0 bg-transparent cursor-pointer"
                      title="Custom Color"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowEventModal(false)}
                    className="interactive-tap px-3 py-1.5 text-xs font-mono text-text-muted hover:text-text"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="interactive-tap px-4 py-1.5 bg-text text-bg rounded-md text-xs font-semibold"
                  >
                    {eventModalMode === "edit" ? "Update Event" : "Schedule Event"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default TasksPage;
