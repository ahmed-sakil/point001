import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Lock,
  Unlock,
  CheckSquare,
  Calendar as CalendarIcon,
  Plus,
  X,
  Clock,
  MapPin,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import AnimatedSlideView from "../components/ui/AnimatedSlideView";
import CheckboxTick from "../components/ui/CheckboxTick";

interface CalendarTask {
  id: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  dueTime?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
}

interface CalendarEventItem {
  id: string;
  title: string;
  description?: string;
  time?: string;
  isAllDay?: boolean;
  color?: string;
  eventType?: string;
  location?: string;
  recurrenceEndDate?: string;
}

interface CalendarDay {
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isLocked: boolean;
  tasks: CalendarTask[];
  events: CalendarEventItem[];
}

interface MonthCalendarResponse {
  year: number;
  month: number;
  days: CalendarDay[];
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const COLOR_PRESETS = [
  { label: "Light", value: "#f4f4f6" },
  { label: "Muted", value: "#73737c" },
  { label: "Slate", value: "#94a3b8" },
  { label: "Zinc", value: "#a1a1aa" },
  { label: "Charcoal", value: "#52525b" },
  { label: "Silver", value: "#d4d4d8" },
];

export const CalendarPage: React.FC = () => {
  const now = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState<number>(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(now.getMonth() + 1); // 1-indexed

  const [isLoading, setIsLoading] = useState(true);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");
  const [animKey, setAnimKey] = useState<number>(0);

  // Selected Day Modal State
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [targetDate, setTargetDate] = useState<string>("");

  // Sub-modal for creating Task / Event
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskTime, setTaskTime] = useState("");
  const [taskPriority, setTaskPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");

  const [showEventModal, setShowEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventType, setEventType] = useState<"STANDARD" | "BIRTHDAY" | "ANNIVERSARY" | "WEEKLY" | "MONTHLY" | "YEARLY">("STANDARD");
  const [eventTime, setEventTime] = useState("");
  const [eventRecurrenceEndDate, setEventRecurrenceEndDate] = useState("");
  const [eventColor, setEventColor] = useState("#f4f4f6");
  const [eventLocation, setEventLocation] = useState("");

  // Fetch month calendar
  const fetchCalendar = useCallback(async (year: number, month: number, keepDateToReopen?: string) => {
    setIsLoading(true);
    try {
      const data = await api.get<MonthCalendarResponse>(`/calendar/month?year=${year}&month=${month}`);
      setCalendarDays(data.days);

      if (keepDateToReopen) {
        const found = data.days.find((d) => d.dateStr === keepDateToReopen);
        if (found) setSelectedDay(found);
      } else {
        setSelectedDay((prev) => {
          if (!prev) return null;
          const updated = data.days.find((d) => d.dateStr === prev.dateStr);
          return updated || prev;
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load calendar");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendar(currentYear, currentMonth);
  }, [currentYear, currentMonth, fetchCalendar]);

  // Month Navigation with Smooth Slide Direction
  const handlePrevMonth = () => {
    setSlideDirection("left");
    setAnimKey((prev) => prev + 1);
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    setSlideDirection("right");
    setAnimKey((prev) => prev + 1);
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToToday = () => {
    const today = new Date();
    setSlideDirection(
      today.getFullYear() > currentYear ||
      (today.getFullYear() === currentYear && today.getMonth() + 1 > currentMonth)
        ? "right"
        : "left"
    );
    setAnimKey((prev) => prev + 1);
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);
  };

  // Toggle Day Lock
  const handleToggleDayLock = async () => {
    if (!selectedDay) return;
    const nextLocked = !selectedDay.isLocked;

    try {
      const res = await api.post<{ success: boolean; date: string; isLocked: boolean; tasks?: CalendarTask[]; events?: CalendarEventItem[] }>(
        "/calendar/lock-day",
        {
          date: selectedDay.dateStr,
          isLocked: nextLocked,
        }
      );

      if (res.success) {
        toast.success(nextLocked ? "Day locked (snapshot saved)" : "Day unlocked");
        fetchCalendar(currentYear, currentMonth, selectedDay.dateStr);
      }
    } catch {
      toast.error("Failed to update day lock status");
    }
  };

  // Toggle Task Completion inside Day Modal
  const handleToggleTask = async (taskId: string) => {
    if (!selectedDay || selectedDay.isLocked) {
      toast.error("Cannot modify tasks on a locked day");
      return;
    }

    try {
      await api.post(`/tasks-events/tasks/${taskId}/toggle`);
      fetchCalendar(currentYear, currentMonth, selectedDay.dateStr);
    } catch (err: any) {
      toast.error(err?.message || "Failed to toggle task");
    }
  };

  // Open Create Task: Closes day modal so add modal is accessible & visible
  const handleOpenAddTask = () => {
    if (!selectedDay || selectedDay.isLocked) return;
    setTargetDate(selectedDay.dateStr);
    setSelectedDay(null); // Close day modal so new modal is front, center and accessible
    setTaskTitle("");
    setTaskDescription("");
    setTaskTime("");
    setTaskPriority("MEDIUM");
    setShowTaskModal(true);
  };

  // Open Create Event: Closes day modal so add modal is accessible & visible
  const handleOpenAddEvent = () => {
    if (!selectedDay || selectedDay.isLocked) return;
    setTargetDate(selectedDay.dateStr);
    setSelectedDay(null); // Close day modal so new modal is front, center and accessible
    setEventTitle("");
    setEventDescription("");
    setEventType("STANDARD");
    setEventTime("");
    setEventRecurrenceEndDate("");
    setEventColor("#f4f4f6");
    setEventLocation("");
    setShowEventModal(true);
  };

  // Cancel Task Modal: Return back to the day modal
  const handleCancelTaskModal = () => {
    setShowTaskModal(false);
    if (targetDate) {
      const day = calendarDays.find((d) => d.dateStr === targetDate);
      if (day) setSelectedDay(day);
    }
  };

  // Cancel Event Modal: Return back to the day modal
  const handleCancelEventModal = () => {
    setShowEventModal(false);
    if (targetDate) {
      const day = calendarDays.find((d) => d.dateStr === targetDate);
      if (day) setSelectedDay(day);
    }
  };

  // Submit New Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDate || !taskTitle.trim()) return;

    try {
      await api.post("/tasks-events/tasks", {
        title: taskTitle.trim(),
        description: taskDescription.trim() || undefined,
        dueDate: targetDate,
        dueTime: taskTime || undefined,
        priority: taskPriority,
      });
      toast.success("Task added");
      setShowTaskModal(false);
      // Refetch and reopen the day modal with newly added task
      fetchCalendar(currentYear, currentMonth, targetDate);
    } catch (err: any) {
      toast.error(err?.message || "Failed to add task");
    }
  };

  // Submit New Event
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDate || !eventTitle.trim()) return;

    try {
      const hasTime = Boolean(eventTime.trim());
      const startDateTime = hasTime
        ? `${targetDate}T${eventTime.trim()}:00`
        : `${targetDate}T00:00:00`;

      await api.post("/tasks-events/events", {
        title: eventTitle.trim(),
        description: eventDescription.trim() || undefined,
        startDate: startDateTime,
        isAllDay: !hasTime,
        eventType,
        recurrenceEndDate: eventRecurrenceEndDate || undefined,
        color: eventColor,
        location: eventLocation.trim() || undefined,
      });
      toast.success("Event scheduled");
      setShowEventModal(false);
      // Refetch and reopen the day modal with newly added event
      fetchCalendar(currentYear, currentMonth, targetDate);
    } catch (err: any) {
      toast.error(err?.message || "Failed to add event");
    }
  };

  // Format header title for selected day modal
  const formattedSelectedDayLabel = useMemo(() => {
    if (!selectedDay) return "";
    const [y, m, d] = selectedDay.dateStr.split("-").map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    return dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }, [selectedDay]);

  return (
    <div className="space-y-6 flex flex-col min-h-[calc(100vh-6rem)]">
      {/* ======================================================== */}
      {/* STANDARD PAGE HEADER WITH HORIZONTAL LINE */}
      {/* ======================================================== */}
      <div className="pb-4 border-b border-border flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-text">
            Calendar
          </h1>
          <p className="text-xs text-text-muted font-mono mt-1">
            {MONTH_NAMES[currentMonth - 1]} {currentYear} • Schedule & Day Locks
          </p>
        </div>

        {/* Month Navigation & Today Jump */}
        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
          <button
            onClick={handlePrevMonth}
            title="Previous Month"
            className="interactive-tap p-2 bg-surface hover:bg-bg border border-border rounded-md text-text-muted hover:text-text transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={handleGoToToday}
            title="Jump to Today"
            className="interactive-tap px-3 py-2 bg-surface hover:bg-bg border border-border rounded-md text-xs font-mono text-text hover:border-text transition-colors flex items-center gap-1.5"
            aria-label="Go to today"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Today</span>
          </button>

          <button
            onClick={handleNextMonth}
            title="Next Month"
            className="interactive-tap p-2 bg-surface hover:bg-bg border border-border rounded-md text-text-muted hover:text-text transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ONLY THE CALENDAR CONTAINER IS CENTERED VERTICALLY */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col justify-center py-2 max-w-6xl mx-auto w-full">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center">
            <Loader2 className="w-5 h-5 text-text animate-spin mb-2" />
            <span className="text-xs font-mono text-text-muted">Loading calendar...</span>
          </div>
        ) : (
          <AnimatedSlideView slideKey={animKey} direction={slideDirection} className="border border-border rounded-md bg-surface overflow-hidden shadow-xs">
            {/* Weekday Header Row */}
            <div className="grid grid-cols-7 border-b border-border bg-bg/70">
              {WEEKDAY_NAMES.map((w) => (
                <div
                  key={w}
                  className="text-[11px] font-mono font-semibold text-text-muted text-center py-2 border-r last:border-r-0 border-border"
                >
                  {w}
                </div>
              ))}
            </div>

            {/* Days Grid: 1px dividers, hover brightens cell, content scrollable if full */}
            <div className="grid grid-cols-7 bg-border gap-[1px]">
              {calendarDays.map((day) => {
                if (!day.isCurrentMonth) {
                  return (
                    <div
                      key={day.dateStr}
                      className="p-1.5 md:p-2 bg-bg opacity-20 select-none h-24 md:h-28 overflow-hidden pointer-events-none"
                    />
                  );
                }

                return (
                  <div
                    key={day.dateStr}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedDay(day)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedDay(day);
                      }
                    }}
                    className={`group relative p-1.5 md:p-2 flex flex-col justify-between text-left h-24 md:h-28 overflow-hidden transition-colors cursor-pointer select-none bg-surface hover:bg-surface-hover text-text ${
                      day.isToday ? "bg-text/5" : ""
                    }`}
                  >
                    {/* Cell Header: Day Number + Status Badge */}
                    <div className="flex items-center justify-between w-full shrink-0">
                      <span
                        className={`text-xs font-mono font-medium leading-none ${
                          day.isToday
                            ? "w-5 h-5 rounded-xs bg-text text-bg flex items-center justify-center font-bold"
                            : ""
                        }`}
                      >
                        {day.dayNumber}
                      </span>

                      {day.isLocked && (
                        <Lock className="w-3 h-3 text-text-muted shrink-0" />
                      )}
                    </div>

                    {/* Cell Items: Scrollable if many tasks/events */}
                    <div className="flex-1 mt-1 overflow-y-auto space-y-1 pr-0.5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
                      {/* Events */}
                      {day.events.map((e) => (
                        <div
                          key={e.id}
                          className="flex items-center gap-1 text-[10px] font-mono truncate px-1 py-0.5 rounded-xs bg-bg/90 border border-border/80 shadow-2xs"
                          title={e.title}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: e.color || "#f4f4f6" }}
                          />
                          <span className="truncate">{e.title}</span>
                        </div>
                      ))}

                      {/* Tasks */}
                      {day.tasks.map((t) => (
                        <div
                          key={t.id}
                          className={`flex items-center gap-1 text-[10px] font-mono truncate px-1 py-0.5 rounded-xs bg-bg/90 border border-border/80 shadow-2xs ${
                            t.isCompleted
                              ? "line-through text-text-muted opacity-50"
                              : "text-text"
                          }`}
                          title={t.title}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-xs shrink-0 ${
                              t.isCompleted ? "bg-text-muted opacity-50" : "bg-text"
                            }`}
                          />
                          <span className="truncate">{t.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </AnimatedSlideView>
        )}
      </div>

      {/* ======================================================== */}
      {/* FLOATING MODAL: SELECTED DAY DETAILS */}
      {/* ======================================================== */}
      {selectedDay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedDay(null);
          }}
        >
          <div className="bg-surface border border-border rounded-md shadow-2xl max-w-lg w-full p-5 space-y-4 animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <div>
                <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-text">
                  {formattedSelectedDayLabel}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-xs border ${
                      selectedDay.isLocked
                        ? "bg-text/10 text-text border-text/30"
                        : "bg-surface text-text-muted border-border"
                    }`}
                  >
                    {selectedDay.isLocked ? (
                      <>
                        <Lock className="w-3 h-3" />
                        <span>Locked</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3 h-3" />
                        <span>Unlocked</span>
                      </>
                    )}
                  </span>
                  <span className="text-[10px] font-mono text-text-muted">
                    {selectedDay.tasks.length} tasks • {selectedDay.events.length} events
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                {/* Lock / Unlock Toggle Button */}
                <button
                  type="button"
                  onClick={handleToggleDayLock}
                  title={selectedDay.isLocked ? "Unlock Day" : "Lock Day (Freeze Snapshot)"}
                  className={`interactive-tap p-1.5 border rounded-md transition-colors ${
                    selectedDay.isLocked
                      ? "bg-text text-bg border-text"
                      : "bg-surface hover:bg-bg text-text-muted hover:text-text border-border"
                  }`}
                  aria-label="Toggle day lock"
                >
                  {selectedDay.isLocked ? (
                    <Unlock className="w-3.5 h-3.5" />
                  ) : (
                    <Lock className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* Add Task / Event (only when day is NOT locked) */}
                {!selectedDay.isLocked && (
                  <>
                    <button
                      type="button"
                      onClick={handleOpenAddTask}
                      title="Add Task for this Day"
                      className="interactive-tap p-1.5 bg-surface hover:bg-bg border border-border hover:border-text rounded-md text-text transition-colors relative"
                      aria-label="Add task"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <Plus className="w-2 h-2 absolute -top-1 -right-1 text-text bg-surface rounded-full border border-border" />
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenAddEvent}
                      title="Add Event for this Day"
                      className="interactive-tap p-1.5 bg-surface hover:bg-bg border border-border hover:border-text rounded-md text-text transition-colors relative"
                      aria-label="Add event"
                    >
                      <CalendarIcon className="w-3.5 h-3.5" />
                      <Plus className="w-2 h-2 absolute -top-1 -right-1 text-text bg-surface rounded-full border border-border" />
                    </button>
                  </>
                )}

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="interactive-tap p-1.5 text-text-muted hover:text-text rounded-md"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Locked Notice */}
            {selectedDay.isLocked && (
              <div className="p-2.5 bg-bg border border-border rounded-md flex items-center gap-2 text-xs font-mono text-text-muted">
                <Lock className="w-3.5 h-3.5 text-text shrink-0" />
                <span>
                  This day is locked and immutable. Tasks cannot be altered and new items cannot be scheduled.
                </span>
              </div>
            )}

            {/* Scrollable Content: Events & Tasks */}
            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Events Section */}
              <div className="space-y-2">
                <h3 className="text-[10px] font-mono uppercase text-text-muted font-semibold tracking-wider">
                  Events ({selectedDay.events.length})
                </h3>

                {selectedDay.events.length === 0 ? (
                  <p className="text-xs font-mono text-text-muted/60 pl-1">
                    No events scheduled.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedDay.events.map((e) => (
                      <div
                        key={e.id}
                        className="p-3 bg-bg border border-border rounded-md flex items-start justify-between gap-3"
                      >
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <span
                            className="w-2 h-2 rounded-xs shrink-0 mt-1"
                            style={{ backgroundColor: e.color || "#f4f4f6" }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-text truncate">
                              {e.title}
                            </p>
                            {e.description && (
                              <p className="text-[11px] font-mono text-text-muted mt-0.5 line-clamp-2">
                                {e.description}
                              </p>
                            )}
                            <div className="flex items-center flex-wrap gap-2 mt-1 text-[10px] font-mono text-text-muted">
                              {e.time && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{e.time}</span>
                                </span>
                              )}
                              {e.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  <span>{e.location}</span>
                                </span>
                              )}
                              {e.eventType && e.eventType !== "STANDARD" && (
                                <span className="capitalize px-1.5 py-0.2 bg-surface border border-border rounded-xs text-[9px]">
                                  {e.eventType.toLowerCase()}
                                </span>
                              )}
                              {e.recurrenceEndDate && (
                                <span>• Ends: {e.recurrenceEndDate}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tasks Section */}
              <div className="space-y-2">
                <h3 className="text-[10px] font-mono uppercase text-text-muted font-semibold tracking-wider">
                  Tasks ({selectedDay.tasks.length})
                </h3>

                {selectedDay.tasks.length === 0 ? (
                  <p className="text-xs font-mono text-text-muted/60 pl-1">
                    No tasks scheduled.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedDay.tasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-3 bg-bg border border-border rounded-md flex items-start justify-between gap-3"
                      >
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <CheckboxTick
                            size="sm"
                            shape="square"
                            checked={t.isCompleted}
                            isLocked={selectedDay.isLocked}
                            onChange={() => handleToggleTask(t.id)}
                            title={selectedDay.isLocked ? "Day is locked from Calendar" : "Toggle task"}
                            aria-label="Toggle task"
                            className="mt-0.5"
                          />

                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-xs font-medium truncate ${
                                t.isCompleted ? "line-through text-text-muted" : "text-text"
                              }`}
                            >
                              {t.title}
                            </p>
                            {t.description && (
                              <p className="text-[11px] font-mono text-text-muted mt-0.5 line-clamp-2">
                                {t.description}
                              </p>
                            )}
                            {t.dueTime && (
                              <div className="flex items-center gap-1 mt-1 text-[10px] font-mono text-text-muted">
                                <Clock className="w-3 h-3" />
                                <span>{t.dueTime}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* FLOATING SUB-MODAL: ADD TASK FOR THIS DAY */}
      {/* ======================================================== */}
      {showTaskModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCancelTaskModal();
          }}
        >
          <div className="bg-surface border border-border rounded-md shadow-2xl max-w-md w-full p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-text" />
                <h3 className="text-xs uppercase font-mono font-semibold tracking-wider text-text">
                  New Task • {targetDate}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCancelTaskModal}
                className="interactive-tap p-1 text-text-muted hover:text-text rounded-md"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Task title..."
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
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Notes, sub-points..."
                  rows={2}
                  className="w-full bg-bg border border-border rounded-md px-3 py-2 text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-text font-mono resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={taskTime}
                    onChange={(e) => setTaskTime(e.target.value)}
                    className="w-full bg-bg border border-border rounded-md px-2.5 py-1.5 text-xs text-text focus:outline-none focus:border-text font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full bg-bg border border-border rounded-md px-2.5 py-1.5 text-xs text-text focus:outline-none focus:border-text font-mono"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={handleCancelTaskModal}
                  className="interactive-tap px-3 py-1.5 text-xs font-mono text-text-muted hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="interactive-tap px-4 py-1.5 bg-text text-bg rounded-md text-xs font-semibold"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* FLOATING SUB-MODAL: ADD EVENT FOR THIS DAY */}
      {/* ======================================================== */}
      {showEventModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCancelEventModal();
          }}
        >
          <div className="bg-surface border border-border rounded-md shadow-2xl max-w-md w-full p-5 space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-text" />
                <h3 className="text-xs uppercase font-mono font-semibold tracking-wider text-text">
                  New Event • {targetDate}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCancelEventModal}
                className="interactive-tap p-1 text-text-muted hover:text-text rounded-md"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">
                  Event Title
                </label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g. Birthday, Standup..."
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
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  placeholder="Notes, agenda..."
                  rows={2}
                  className="w-full bg-bg border border-border rounded-md px-3 py-2 text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-text font-mono resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">
                    Event Type
                  </label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as any)}
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
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    placeholder="Room, Link, Place..."
                    className="w-full bg-bg border border-border rounded-md px-2.5 py-1.5 text-xs text-text focus:outline-none focus:border-text font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    placeholder="All day if empty"
                    className="w-full bg-bg border border-border rounded-md px-2.5 py-1.5 text-xs text-text focus:outline-none focus:border-text font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={eventRecurrenceEndDate}
                    onChange={(e) => setEventRecurrenceEndDate(e.target.value)}
                    placeholder="e.g. 2030-12-12"
                    className="w-full bg-bg border border-border rounded-md px-2.5 py-1.5 text-xs text-text focus:outline-none focus:border-text font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-text-muted block mb-1.5">
                  Color
                </label>
                <div className="flex items-center gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setEventColor(c.value)}
                      title={c.label}
                      className={`w-6 h-6 rounded-xs transition-transform ${
                        eventColor.toLowerCase() === c.value.toLowerCase()
                          ? "ring-2 ring-text scale-110"
                          : "opacity-80 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                  <input
                    type="color"
                    value={eventColor}
                    onChange={(e) => setEventColor(e.target.value)}
                    className="w-6 h-6 rounded-xs border-0 bg-transparent cursor-pointer"
                    title="Custom Color"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={handleCancelEventModal}
                  className="interactive-tap px-3 py-1.5 text-xs font-mono text-text-muted hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="interactive-tap px-4 py-1.5 bg-text text-bg rounded-md text-xs font-semibold"
                >
                  Schedule Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
