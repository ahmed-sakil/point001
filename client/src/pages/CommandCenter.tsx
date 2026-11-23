import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar as CalendarIcon,
  Flame,
  ClipboardList,
  Wallet,
  Check,
  Plus,
  Trash2,
  Edit3,
  Copy,
  CheckCheck,
  X,
  Loader2,
  Lock,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import ActionDrawer from "../components/ui/ActionDrawer";
import CheckboxTick from "../components/ui/CheckboxTick";

// Types
interface ScheduleItem {
  id: string;
  type: "TASK" | "EVENT";
  title: string;
  time: string;
  isRemoving?: boolean;
}

interface PrayerItem {
  key: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
  name: string;
  time: string;
  isDone: boolean;
}

interface HabitItem {
  id: string;
  name: string;
  isDone: boolean;
}

interface ClipboardElement {
  id: string;
  text: string;
}

interface ClipboardNoteItem {
  id: string;
  title: string;
  elements: ClipboardElement[];
}

interface DuePayment {
  id: string;
  personName: string;
  type: "DENA" | "PAONA";
  amount: number;
  dueDate: string;
}

interface CommandCenterResponse {
  summary: {
    nextSevenDaysTasks: number;
    nextSevenDaysEvents: number;
  };
  isTodayLocked?: boolean;
  todayDate?: string;
  schedule: ScheduleItem[];
  prayers?: PrayerItem[];
  habits: HabitItem[];
  notes: ClipboardNoteItem[];
  finance: {
    hasData?: boolean;
    netAmount: number;
    totalDena: number;
    totalPaona: number;
    upcomingDenaList: DuePayment[];
  };
}

export const CommandCenter: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isTodayLocked, setIsTodayLocked] = useState(false);

  // Real Database States (Zero hardcoded demo data in code!)
  const [summary, setSummary] = useState({ nextSevenDaysTasks: 0, nextSevenDaysEvents: 0 });
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [prayers, setPrayers] = useState<PrayerItem[]>([]);
  const [habits, setHabits] = useState<HabitItem[]>([]);
  const [notes, setNotes] = useState<ClipboardNoteItem[]>([]);
  const [finance, setFinance] = useState({
    hasData: false,
    netAmount: 0,
    totalDena: 0,
    totalPaona: 0,
    upcomingDenaList: [] as DuePayment[],
  });

  // Fetch Live Data from Database
  const fetchDashboardData = useCallback(async () => {
    try {
      const data = await api.get<CommandCenterResponse>("/command-center");
      setSummary(data.summary);
      setIsTodayLocked(Boolean(data.isTodayLocked));
      setSchedule(data.schedule);
      setPrayers(data.prayers || []);
      setHabits(data.habits);
      setNotes(data.notes);
      setFinance({
        hasData: Boolean(data.finance?.hasData),
        netAmount: data.finance?.netAmount || 0,
        totalDena: data.finance?.totalDena || 0,
        totalPaona: data.finance?.totalPaona || 0,
        upcomingDenaList: data.finance?.upcomingDenaList || [],
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load command center");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ========================================================
  // 1. TODAY'S SCHEDULE ACTIONS
  // ========================================================
  const completeTask = async (id: string) => {
    if (isTodayLocked) {
      toast.error("Today is locked from Calendar. Unlock the day to modify tasks.");
      return;
    }

    setSchedule((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRemoving: true } : item))
    );

    try {
      await api.post(`/command-center/tasks/${id}/complete`);
      setTimeout(() => {
        setSchedule((prev) => prev.filter((item) => item.id !== id));
        toast.success("Task completed");
      }, 400);
    } catch (error: any) {
      setSchedule((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isRemoving: false } : item))
      );
      toast.error(error?.response?.data?.error || error?.message || "Failed to complete task");
    }
  };

  // ========================================================
  // 2. 5 WAQT NAMAJ ACTIONS
  // ========================================================
  const togglePrayer = async (waqt: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha") => {
    if (isTodayLocked) {
      toast.error("Today is locked from Calendar. Unlock the day to modify prayers.");
      return;
    }

    // Optimistic update
    setPrayers((prev) =>
      prev.map((p) => (p.key === waqt ? { ...p, isDone: !p.isDone } : p))
    );

    try {
      const res = await api.post<{ isDone: boolean; waqt: string }>("/command-center/prayers/toggle", { waqt });
      setPrayers((prev) =>
        prev.map((p) => (p.key === waqt ? { ...p, isDone: res.isDone } : p))
      );
    } catch (error: any) {
      // Revert on error
      setPrayers((prev) =>
        prev.map((p) => (p.key === waqt ? { ...p, isDone: !p.isDone } : p))
      );
      toast.error(error?.response?.data?.error || error?.message || "Failed to update prayer");
    }
  };

  // ========================================================
  // 3. DAILY HABITS ACTIONS
  // ========================================================
  const toggleHabit = async (id: string) => {
    if (isTodayLocked) {
      toast.error("Today is locked from Calendar. Unlock the day to modify habits.");
      return;
    }

    // Optimistic update
    setHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, isDone: !h.isDone } : h))
    );

    try {
      const res = await api.post<{ isDone: boolean }>(`/command-center/habits/${id}/toggle`);
      setHabits((prev) =>
        prev.map((h) => (h.id === id ? { ...h, isDone: res.isDone } : h))
      );
    } catch (error: any) {
      // Revert on error
      setHabits((prev) =>
        prev.map((h) => (h.id === id ? { ...h, isDone: !h.isDone } : h))
      );
      toast.error(error?.response?.data?.error || error?.message || "Failed to update habit");
    }
  };

  // ========================================================
  // 3. CLIPBOARD NOTES ACTIONS
  // ========================================================

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isAddingNewItem, setIsAddingNewItem] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [elementDrafts, setElementDrafts] = useState<Record<string, string>>({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemTitle, setEditingItemTitle] = useState("");
  const [copiedElemId, setCopiedElemId] = useState<string | null>(null);

  // Ctrl+Enter to save new item
  const handleNewItemKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (!newItemTitle.trim()) return;

      try {
        const res = await api.post<{ note: ClipboardNoteItem }>("/command-center/notes", {
          title: newItemTitle.trim(),
        });
        setNotes((prev) => [res.note, ...prev]);
        setNewItemTitle("");
        setIsAddingNewItem(false);
        toast.success("Item added");
      } catch {
        toast.error("Failed to add note item");
      }
    } else if (e.key === "Escape") {
      setIsAddingNewItem(false);
      setNewItemTitle("");
    }
  };

  const deleteNoteItem = async (id: string) => {
    try {
      await api.delete(`/command-center/notes/${id}`);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      toast.success("Item deleted");
    } catch {
      toast.error("Failed to delete note");
    }
  };

  const saveEditedItemTitle = async (id: string) => {
    if (!editingItemTitle.trim()) return;
    try {
      await api.put(`/command-center/notes/${id}`, { title: editingItemTitle.trim() });
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, title: editingItemTitle.trim() } : n))
      );
      setEditingItemId(null);
    } catch {
      toast.error("Failed to update note title");
    }
  };

  // Add multiline element: Enter = newline, Ctrl+Enter = save
  const handleElementKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>, noteId: string) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const draft = elementDrafts[noteId] || "";
      if (!draft.trim()) return;

      try {
        const res = await api.post<{ element: ClipboardElement }>(
          `/command-center/notes/${noteId}/elements`,
          { text: draft.trim() }
        );

        setNotes((prev) =>
          prev.map((note) => {
            if (note.id === noteId) {
              return {
                ...note,
                elements: [...note.elements, res.element],
              };
            }
            return note;
          })
        );

        setElementDrafts((prev) => ({ ...prev, [noteId]: "" }));
      } catch {
        toast.error("Failed to add element");
      }
    }
  };

  const deleteElement = async (noteId: string, elemId: string) => {
    try {
      await api.delete(`/command-center/notes/${noteId}/elements/${elemId}`);
      setNotes((prev) =>
        prev.map((note) => {
          if (note.id === noteId) {
            return {
              ...note,
              elements: note.elements.filter((e) => e.id !== elemId),
            };
          }
          return note;
        })
      );
    } catch {
      toast.error("Failed to delete element");
    }
  };

  const copyToClipboard = (elem: ClipboardElement, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(elem.text).then(() => {
      setCopiedElemId(elem.id);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedElemId(null), 1500);
    });
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center">
        <Loader2 className="w-5 h-5 text-text animate-spin mb-2" />
        <span className="text-xs font-mono text-text-muted">Loading command center...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Subtitle with Horizontal Line */}
      <div className="pb-4 border-b border-border">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-text">Command Center</h1>
        <p className="text-xs text-text-muted font-mono mt-1">
          You have {summary.nextSevenDaysTasks} tasks and {summary.nextSevenDaysEvents} events in the next seven days
        </p>
      </div>

      {/* The 4 Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* ======================================================== */}
        {/* CARD 1: TODAY'S SCHEDULE */}
        {/* ======================================================== */}
        <section className="bg-surface border border-border rounded-md p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-text" />
                <h2 className="text-xs uppercase font-mono tracking-wider font-semibold text-text">
                  Today's Schedule
                </h2>
              </div>
              {isTodayLocked && (
                <div
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-bg border border-border text-[10px] font-mono text-text-muted"
                  title="Today is locked from Calendar"
                >
                  <Lock className="w-3 h-3 text-text-muted" />
                  <span>Day Locked</span>
                </div>
              )}
            </div>

            {schedule.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-9 h-9 rounded-md border border-border bg-bg flex items-center justify-center mb-2.5">
                  <Check className="w-5 h-5 text-text" />
                </div>
                <p className="text-xs font-mono text-text">You're completely clear for today.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {schedule.map((item) => (
                  <div
                    key={item.id}
                    className={`group p-2.5 bg-bg border border-border rounded-md flex items-start gap-2.5 transition-all duration-400 ${
                      item.isRemoving
                        ? "opacity-0 -translate-x-4 max-h-0 py-0 my-0 overflow-hidden border-transparent"
                        : "opacity-100 translate-x-0 max-h-24 hover:border-border/80"
                    }`}
                  >
                    {item.type === "TASK" ? (
                      <CheckboxTick
                        size="sm"
                        checked={item.isRemoving || false}
                        isLocked={isTodayLocked}
                        disabled={isTodayLocked}
                        onChange={() => completeTask(item.id)}
                        title={isTodayLocked ? "Today is locked from Calendar" : "Mark task done"}
                        aria-label="Mark task done"
                        className="mt-0.5"
                      />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-xs bg-text shrink-0 mt-1.5" />
                    )}

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-medium truncate ${
                          item.isRemoving ? "line-through text-text-muted" : "text-text"
                        }`}
                      >
                        {item.title}
                      </p>
                      <span className="text-[10px] font-mono text-text-muted block mt-0.5">
                        {item.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ======================================================== */}
        {/* CARD 2: 5 WAQT NAMAJ */}
        {/* ======================================================== */}
        <section className="bg-surface border border-border rounded-md p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-text" />
                <h2 className="text-xs uppercase font-mono tracking-wider font-semibold text-text">
                  5 Waqt Namaj
                </h2>
              </div>
              <span className="text-[10px] font-mono text-text-muted">Today</span>
            </div>

            {prayers.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-9 h-9 rounded-md border border-border bg-bg flex items-center justify-center mb-2.5">
                  <Clock className="w-4 h-4 text-text-muted" />
                </div>
                <p className="text-xs font-mono text-text-muted">No prayer settings found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {prayers.map((prayer) => (
                  <div
                    key={prayer.key}
                    onClick={() => togglePrayer(prayer.key)}
                    className={`interactive-tap cursor-pointer p-3 border rounded-md transition-all flex items-center justify-between gap-3 ${
                      prayer.isDone
                        ? "bg-bg border-border text-text"
                        : "bg-surface-hover/50 border-border/60 text-text/70 hover:border-border hover:text-text"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-medium truncate ${prayer.isDone ? "text-text" : "text-text/70"}`}>
                        {prayer.name}
                      </p>
                      <span className="text-[10px] font-mono text-text-muted block mt-0.5">
                        {prayer.time}
                      </span>
                    </div>

                    <CheckboxTick
                      checked={prayer.isDone}
                      isLocked={isTodayLocked}
                      onChange={() => togglePrayer(prayer.key)}
                      title={isTodayLocked ? "Locked from Calendar" : prayer.name}
                      aria-label={prayer.name}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ======================================================== */}
        {/* CARD 3: DAILY HABITS */}
        {/* ======================================================== */}
        <section className="bg-surface border border-border rounded-md p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-text" />
                <h2 className="text-xs uppercase font-mono tracking-wider font-semibold text-text">
                  Daily Habits
                </h2>
              </div>
              <span className="text-[10px] font-mono text-text-muted">Today</span>
            </div>

            {habits.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-9 h-9 rounded-md border border-border bg-bg flex items-center justify-center mb-2.5">
                  <Flame className="w-4 h-4 text-text-muted" />
                </div>
                <p className="text-xs font-mono text-text-muted">No daily habits set up yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {habits.map((habit) => (
                  <div
                    key={habit.id}
                    onClick={() => toggleHabit(habit.id)}
                    className={`interactive-tap cursor-pointer p-3 border rounded-md transition-all flex items-center justify-between gap-3 ${
                      habit.isDone
                        ? "bg-bg border-border text-text"
                        : "bg-surface-hover/50 border-border/60 text-text/70 hover:border-border hover:text-text"
                    }`}
                  >
                    <p className={`text-xs font-medium truncate flex-1 ${habit.isDone ? "text-text" : "text-text/70"}`}>
                      {habit.name}
                    </p>

                    <CheckboxTick
                      checked={habit.isDone}
                      isLocked={isTodayLocked}
                      onChange={() => toggleHabit(habit.id)}
                      title={isTodayLocked ? "Locked from Calendar" : habit.name}
                      aria-label={habit.name}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ======================================================== */}
        {/* CARD 4: CLIPBOARD NOTES */}
        {/* ======================================================== */}
        <section className="bg-surface border border-border rounded-md p-4 flex flex-col justify-between relative">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-text" />
                <h2 className="text-xs uppercase font-mono tracking-wider font-semibold text-text">
                  Clipboard Notes
                </h2>
              </div>

              <ActionDrawer triggerTitle="Clipboard Notes Settings">
                <button
                  onClick={() => setIsEditingNotes((prev) => !prev)}
                  title="Toggle Editing Mode"
                  className={`interactive-tap p-1.5 border rounded-md transition-colors flex items-center gap-1.5 ${
                    isEditingNotes
                      ? "bg-text text-bg border-text shadow-xs"
                      : "bg-surface text-text-muted border-border hover:text-text hover:border-text"
                  }`}
                  aria-label="Toggle editing mode"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span className="md:hidden text-xs font-mono">Edit Mode</span>
                </button>

                <button
                  onClick={() => setIsAddingNewItem(true)}
                  title="Add New Item"
                  className="interactive-tap p-1.5 bg-surface border border-border text-text-muted hover:text-text hover:border-text rounded-md transition-colors flex items-center gap-1.5"
                  aria-label="Add new item"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="md:hidden text-xs font-mono">Add Item</span>
                </button>
              </ActionDrawer>
            </div>

            {/* Add New Item Input: Only Cancel Button, Ctrl+Enter is Save */}
            {isAddingNewItem && (
              <div className="mb-3 p-2 bg-bg border border-border rounded-md space-y-1.5">
                <input
                  type="text"
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  onKeyDown={handleNewItemKeyDown}
                  placeholder="Item title (Ctrl+Enter to save)..."
                  autoFocus
                  className="w-full bg-surface border border-border rounded-xs px-2.5 py-1.5 text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-text font-mono"
                />
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setIsAddingNewItem(false);
                      setNewItemTitle("");
                    }}
                    className="interactive-tap flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono text-text-muted hover:text-text"
                  >
                    <X className="w-3 h-3" />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            )}

            {/* Notes List or Empty State */}
            {notes.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-9 h-9 rounded-md border border-border bg-bg flex items-center justify-center mb-2.5">
                  <ClipboardList className="w-4 h-4 text-text-muted" />
                </div>
                <p className="text-xs font-mono text-text-muted">No clipboard notes created yet.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {notes.map((note) => (
                  <div key={note.id} className="p-3 bg-bg border border-border rounded-md space-y-2">
                    <div className="flex items-center justify-between">
                      {editingItemId === note.id ? (
                        <div className="flex items-center gap-1.5 flex-1 pr-2">
                          <input
                            type="text"
                            value={editingItemTitle}
                            onChange={(e) => setEditingItemTitle(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && saveEditedItemTitle(note.id)}
                            className="w-full bg-surface border border-border rounded-xs px-2 py-1 text-xs text-text font-medium focus:outline-none focus:border-text"
                            autoFocus
                          />
                          <button
                            onClick={() => saveEditedItemTitle(note.id)}
                            className="interactive-tap p-1 text-text hover:bg-surface rounded-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <h3 className="text-xs font-semibold text-text tracking-tight">{note.title}</h3>
                      )}

                      {isEditingNotes && editingItemId !== note.id && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingItemId(note.id);
                              setEditingItemTitle(note.title);
                            }}
                            className="interactive-tap p-1 text-text-muted hover:text-text"
                            aria-label="Edit title"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteNoteItem(note.id)}
                            className="interactive-tap p-1 text-text-muted hover:text-text"
                            aria-label="Delete item"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {note.elements.length > 0 && (
                      <div className="space-y-1.5">
                        {note.elements.map((elem) => (
                          <div
                            key={elem.id}
                            onClick={(e) => !isEditingNotes && copyToClipboard(elem, e)}
                            title={isEditingNotes ? "" : "Click to copy"}
                            className={`group p-2 bg-surface border border-border/70 rounded-xs flex items-start justify-between gap-2 transition-all ${
                              isEditingNotes
                                ? "cursor-default"
                                : "interactive-tap cursor-pointer hover:border-text-muted hover:bg-surface-hover/80"
                            }`}
                          >
                            <p className="text-xs font-mono text-text/90 whitespace-pre-wrap leading-relaxed min-w-0 flex-1">
                              {elem.text}
                            </p>

                            {isEditingNotes ? (
                              <button
                                onClick={() => deleteElement(note.id, elem.id)}
                                className="interactive-tap p-1 text-text-muted hover:text-text shrink-0"
                                aria-label="Delete element"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            ) : (
                              <div className="shrink-0 pt-0.5 text-text-muted group-hover:text-text transition-all">
                                {copiedElemId === elem.id ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-text" />
                                ) : (
                                  <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {isEditingNotes && (
                      <div className="pt-1.5">
                        <textarea
                          rows={2}
                          value={elementDrafts[note.id] || ""}
                          onChange={(e) =>
                            setElementDrafts((prev) => ({ ...prev, [note.id]: e.target.value }))
                          }
                          onKeyDown={(e) => handleElementKeyDown(e, note.id)}
                          placeholder="Add element (Ctrl+Enter to save)..."
                          className="w-full bg-surface border border-border rounded-xs p-2 text-xs font-mono text-text placeholder:text-text-muted focus:outline-none focus:border-text resize-none"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ======================================================== */}
        {/* CARD 5: FINANCIAL SNAPSHOT */}
        {/* ======================================================== */}
        <section className="bg-surface border border-border rounded-md p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-border mb-3">
              <Wallet className="w-4 h-4 text-text" />
              <h2 className="text-xs uppercase font-mono tracking-wider font-semibold text-text">
                Financial Snapshot
              </h2>
            </div>

            {!finance.hasData ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-9 h-9 rounded-md border border-border bg-bg flex items-center justify-center mb-2.5">
                  <Wallet className="w-4 h-4 text-text-muted" />
                </div>
                <p className="text-xs font-mono text-text-muted">No financial records found.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="p-2.5 bg-bg border border-border rounded-md">
                    <span className="text-[9px] uppercase font-mono text-text-muted block">Net Amount</span>
                    <p className="text-sm sm:text-base font-bold font-mono text-text mt-0.5 truncate">
                      ৳ {finance.netAmount.toLocaleString()}
                    </p>
                  </div>

                  <div className="p-2.5 bg-bg border border-border rounded-md">
                    <span className="text-[9px] uppercase font-mono text-text-muted block">Total Dena</span>
                    <p className="text-sm sm:text-base font-bold font-mono text-text mt-0.5 truncate">
                      ৳ {finance.totalDena.toLocaleString()}
                    </p>
                  </div>

                  <div className="p-2.5 bg-bg border border-border rounded-md">
                    <span className="text-[9px] uppercase font-mono text-text-muted block">Total Paona</span>
                    <p className="text-sm sm:text-base font-bold font-mono text-text mt-0.5 truncate">
                      ৳ {finance.totalPaona.toLocaleString()}
                    </p>
                  </div>
                </div>

                {finance.upcomingDenaList.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {finance.upcomingDenaList.map((item) => (
                      <div
                        key={item.id}
                        className="p-2 bg-bg border border-border rounded-md flex items-center justify-between text-xs font-mono"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-medium text-text truncate">{item.personName}</p>
                          <span className="text-[10px] text-text-muted">{item.dueDate}</span>
                        </div>
                        <span className="font-semibold text-text shrink-0">
                          ৳ {item.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default CommandCenter;
