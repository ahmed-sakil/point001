import React, { useState, useEffect, useCallback } from "react";
import {
  Check,
  Plus,
  Edit3,
  Trash2,
  History,
  RotateCw,
  Lock,
  Clock,
  X,
  ArrowLeft,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import ActionDrawer from "../components/ui/ActionDrawer";
import TimeNavigator from "../components/ui/TimeNavigator";
import AnimatedSlideView from "../components/ui/AnimatedSlideView";

interface PrayerTimes {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  city?: string;
  country?: string;
}

interface PrayerLogDay {
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
}

interface HabitItem {
  id: string;
  name: string;
  description?: string | null;
  time?: string | null;
  type: "FOREVER" | "CHALLENGE";
  targetDays?: number;
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string | null;
  logs: Record<string, boolean>;
  completedTotal: number;
}

interface ChallengeHistoryItem {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  time?: string | null;
  targetDays: number;
  completedDays: number;
  completionRate: number;
  isCompleted: boolean;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
}

interface HabitsApiResponse {
  todayDate: string;
  prayerTimes: PrayerTimes;
  prayerLogs: Record<string, PrayerLogDay>;
  lockedDates: string[];
  foreverHabits: HabitItem[];
  challengeHabits: HabitItem[];
}

const PRAYERS_LIST = [
  { key: "fajr" as const, name: "Fajr" },
  { key: "dhuhr" as const, name: "Dhuhr" },
  { key: "asr" as const, name: "Asr" },
  { key: "maghrib" as const, name: "Maghrib" },
  { key: "isha" as const, name: "Isha" },
];

const normalizeDateKey = (dStr?: string | null): string => {
  if (!dStr) return "";
  return dStr.split("T")[0];
};

export const HabitsPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncingPrayers, setIsSyncingPrayers] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // 7-Day Window Offset (0 = Current Week, -7 = Previous 7 days, +7 = Next 7 days)
  const [windowOffset, setWindowOffset] = useState<number>(0);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");
  const [animKey, setAnimKey] = useState<number>(0);

  // Exactly 7 days list
  const [datesWindow, setDatesWindow] = useState<{ dateStr: string; label: string; dayName: string; isToday: boolean }[]>([]);

  // Data states
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes>({
    fajr: "04:58 AM",
    dhuhr: "11:47 AM",
    asr: "03:36 PM",
    maghrib: "05:12 PM",
    isha: "06:31 PM",
    city: "Dhaka",
  });
  const [prayerLogs, setPrayerLogs] = useState<Record<string, PrayerLogDay>>({});
  const [lockedDates, setLockedDates] = useState<string[]>([]);
  const [foreverHabits, setForeverHabits] = useState<HabitItem[]>([]);
  const [challengeHabits, setChallengeHabits] = useState<HabitItem[]>([]);
  const [historyItems, setHistoryItems] = useState<ChallengeHistoryItem[]>([]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitItem | null>(null);

  // Form states for Add Habit
  const [addType, setAddType] = useState<"FOREVER" | "CHALLENGE">("FOREVER");
  const [addName, setAddName] = useState("");
  const [addTime, setAddTime] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addChallengeDays, setAddChallengeDays] = useState<number>(30);
  const [isCustomDays, setIsCustomDays] = useState(false);
  const [customDaysVal, setCustomDaysVal] = useState("45");
  const [isSaving, setIsSaving] = useState(false);

  // Generate exactly 7 days: [-3, -2, -1, 0, +1, +2, +3] relative to center
  const generateDatesWindow = useCallback((offsetDays: number) => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const centerTime = now.getTime() + offsetDays * 24 * 60 * 60 * 1000;
    const center = new Date(centerTime);

    const dates: { dateStr: string; label: string; dayName: string; isToday: boolean }[] = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(center.getTime() + i * 24 * 60 * 60 * 1000);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${day}`;

      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      const monthName = d.toLocaleDateString("en-US", { month: "short" });
      const label = `${monthName} ${day}`;

      dates.push({
        dateStr,
        label,
        dayName,
        isToday: dateStr === todayStr,
      });
    }

    setDatesWindow(dates);
    return dates;
  }, []);

  // Fetch Habits data for current 7 days range
  const fetchHabitsData = useCallback(async () => {
    try {
      const dates = generateDatesWindow(windowOffset);
      const startDate = dates[0]?.dateStr;
      const endDate = dates[dates.length - 1]?.dateStr;

      const data = await api.get<HabitsApiResponse>(`/habits?startDate=${startDate}&endDate=${endDate}`);
      setPrayerTimes(data.prayerTimes);
      setPrayerLogs(data.prayerLogs || {});
      setLockedDates(data.lockedDates || []);
      setForeverHabits(data.foreverHabits || []);
      setChallengeHabits(data.challengeHabits || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load habits data");
    } finally {
      setIsLoading(false);
    }
  }, [windowOffset, generateDatesWindow]);

  // Fetch History data
  const fetchHistory = useCallback(async () => {
    try {
      const data = await api.get<{ history: ChallengeHistoryItem[] }>("/habits/history");
      setHistoryItems(data.history || []);
    } catch (error) {
      toast.error("Failed to load habits history");
    }
  }, []);

  useEffect(() => {
    fetchHabitsData();
  }, [fetchHabitsData]);

  // Navigation handlers with smooth transition
  const goToPrevWeek = () => {
    setSlideDirection("left");
    setAnimKey((prev) => prev + 1);
    setWindowOffset((prev) => prev - 7);
  };

  const goToNextWeek = () => {
    setSlideDirection("right");
    setAnimKey((prev) => prev + 1);
    setWindowOffset((prev) => prev + 7);
  };

  const goToToday = () => {
    setSlideDirection(windowOffset < 0 ? "right" : "left");
    setAnimKey((prev) => prev + 1);
    setWindowOffset(0);
  };

  // Toggle Waqt Prayer for a date
  const handleTogglePrayer = async (dateStr: string, waqt: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha") => {
    if (lockedDates.includes(dateStr)) {
      toast.error(`Date ${dateStr} is locked from Calendar. Unlock the day to modify.`);
      return;
    }

    // Optimistic update
    setPrayerLogs((prev) => {
      const dayLog = prev[dateStr] || { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false };
      return {
        ...prev,
        [dateStr]: {
          ...dayLog,
          [waqt]: !dayLog[waqt],
        },
      };
    });

    try {
      await api.post("/habits/prayer/toggle", { date: dateStr, waqt });
    } catch (error: any) {
      setPrayerLogs((prev) => {
        const dayLog = prev[dateStr] || { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false };
        return {
          ...prev,
          [dateStr]: {
            ...dayLog,
            [waqt]: !dayLog[waqt],
          },
        };
      });
      toast.error(error?.response?.data?.error || error?.message || "Failed to toggle prayer");
    }
  };

  // Toggle Habit for a date
  const handleToggleHabit = async (habitId: string, dateStr: string, isChallenge: boolean) => {
    if (lockedDates.includes(dateStr)) {
      toast.error(`Date ${dateStr} is locked from Calendar. Unlock the day to modify.`);
      return;
    }

    const updater = (habitsList: HabitItem[]) =>
      habitsList.map((h) => {
        if (h.id !== habitId) return h;
        const currentStatus = Boolean(h.logs[dateStr]);
        const nextStatus = !currentStatus;
        return {
          ...h,
          logs: { ...h.logs, [dateStr]: nextStatus },
          completedTotal: nextStatus ? h.completedTotal + 1 : Math.max(0, h.completedTotal - 1),
        };
      });

    if (isChallenge) {
      setChallengeHabits(updater);
    } else {
      setForeverHabits(updater);
    }

    try {
      await api.post(`/habits/${habitId}/toggle`, { date: dateStr });
    } catch (error: any) {
      const reverter = (habitsList: HabitItem[]) =>
        habitsList.map((h) => {
          if (h.id !== habitId) return h;
          const currentStatus = Boolean(h.logs[dateStr]);
          const nextStatus = !currentStatus;
          return {
            ...h,
            logs: { ...h.logs, [dateStr]: nextStatus },
            completedTotal: nextStatus ? h.completedTotal + 1 : Math.max(0, h.completedTotal - 1),
          };
        });
      if (isChallenge) {
        setChallengeHabits(reverter);
      } else {
        setForeverHabits(reverter);
      }
      toast.error(error?.response?.data?.error || error?.message || "Failed to toggle habit");
    }
  };

  // Sync Prayer Times
  const handleSyncPrayers = async () => {
    setIsSyncingPrayers(true);
    try {
      let lat: number | undefined;
      let lon: number | undefined;

      if ("geolocation" in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
          });
          lat = pos.coords.latitude;
          lon = pos.coords.longitude;
        } catch {
          // Geolocation not granted; fallback to city
        }
      }

      const res = await api.post<{ prayerTimes: PrayerTimes; message: string }>("/habits/sync-prayers", {
        latitude: lat,
        longitude: lon,
        city: prayerTimes.city || "Dhaka",
      });

      setPrayerTimes(res.prayerTimes);
      toast.success(res.message || "Prayer times synced successfully");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || "Failed to sync prayer times");
    } finally {
      setIsSyncingPrayers(false);
    }
  };

  // Create Habit
  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) {
      toast.error("Please enter a habit name");
      return;
    }

    setIsSaving(true);
    try {
      const targetDays = addType === "CHALLENGE" ? (isCustomDays ? parseInt(customDaysVal, 10) || 30 : addChallengeDays) : undefined;

      const res = await api.post<{ habit: any }>("/habits", {
        name: addName.trim(),
        type: addType,
        time: addTime.trim() || undefined,
        description: addDescription.trim() || undefined,
        targetDays,
      });

      const todayStr = new Date().toISOString().split("T")[0];
      const newHabit: HabitItem = {
        id: res.habit.id,
        name: res.habit.name,
        description: res.habit.description,
        time: res.habit.time,
        type: res.habit.type,
        targetDays: res.habit.targetDays,
        startDate: normalizeDateKey(res.habit.startDate) || todayStr,
        endDate: normalizeDateKey(res.habit.endDate),
        createdAt: todayStr,
        logs: {},
        completedTotal: 0,
      };

      if (addType === "CHALLENGE") {
        setChallengeHabits((prev) => [...prev, newHabit]);
      } else {
        setForeverHabits((prev) => [...prev, newHabit]);
      }

      toast.success(addType === "CHALLENGE" ? "Challenge created" : "Forever habit created");
      setIsAddModalOpen(false);
      setAddName("");
      setAddTime("");
      setAddDescription("");
      setAddChallengeDays(30);
      setIsCustomDays(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || "Failed to create habit");
    } finally {
      setIsSaving(false);
    }
  };

  // Update Habit
  const handleUpdateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHabit) return;

    setIsSaving(true);
    try {
      const res = await api.put<{ habit: any }>(`/habits/${editingHabit.id}`, {
        name: editingHabit.name,
        time: editingHabit.time || null,
        description: editingHabit.description || null,
        targetDays: editingHabit.targetDays,
      });

      const updater = (habitsList: HabitItem[]) =>
        habitsList.map((h) => (h.id === editingHabit.id ? { ...h, ...res.habit } : h));

      if (editingHabit.type === "CHALLENGE") {
        setChallengeHabits(updater);
      } else {
        setForeverHabits(updater);
      }

      toast.success("Habit updated");
      setEditingHabit(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || "Failed to update habit");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Habit
  const handleDeleteHabit = async (id: string, isChallenge: boolean) => {
    if (!confirm("Are you sure you want to delete this habit? All check-in history will be removed.")) return;

    try {
      await api.delete(`/habits/${id}`);
      if (isChallenge) {
        setChallengeHabits((prev) => prev.filter((h) => h.id !== id));
      } else {
        setForeverHabits((prev) => prev.filter((h) => h.id !== id));
      }
      toast.success("Habit deleted");
      setEditingHabit(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || "Failed to delete habit");
    }
  };

  // Finish Challenge early
  const handleFinishChallengeEarly = async (id: string) => {
    if (!confirm("Mark this target challenge as finished early? It will be moved to History.")) return;

    try {
      await api.post(`/habits/${id}/finish`);
      setChallengeHabits((prev) => prev.filter((h) => h.id !== id));
      toast.success("Challenge marked as finished and moved to history");
      setEditingHabit(null);
      fetchHistory();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || "Failed to finish challenge");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="w-6 h-6 text-text animate-spin" />
        <p className="text-xs font-mono text-text-muted">Loading habits & routines...</p>
      </div>
    );
  }

  const animClass = slideDirection === "left" ? "animate-slide-left" : "animate-slide-right";

  return (
    <div className="space-y-6 pb-12">
      {/* ======================================================== */}
      {/* 1. TOP HEADER & SETTINGS DRAWER (OPENS ON HOVER)        */}
      {/* ======================================================== */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-border">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg md:text-2xl font-bold tracking-tight text-text truncate">
            {showHistory ? "Challenge History" : "Habits & Discipline"}
          </h1>
          <p className="text-[11px] md:text-xs text-text-muted font-mono mt-0.5 truncate">
            {showHistory
              ? "Completed & archived target challenges"
              : "5 Waqt Namaj • Daily Routines • Target Challenges"}
          </p>
        </div>

        {/* Setting Drawer on Right - Opens on Hover */}
        {showHistory ? (
          <button
            onClick={() => setShowHistory(false)}
            className="interactive-tap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-surface text-text text-xs font-mono hover:border-text transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Active</span>
          </button>
        ) : (
          <ActionDrawer triggerTitle="Habits & Routines Settings">
            {/* 1. Pen Icon (Edit Mode) */}
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`interactive-tap p-2 rounded-md border text-xs font-mono transition-colors flex items-center gap-2 ${
                isEditMode
                  ? "bg-text text-bg border-text shadow-xs"
                  : "bg-surface border-border text-text hover:border-text"
              }`}
              title={isEditMode ? "Exit Edit Mode" : "Edit Habits"}
              aria-label="Edit Habits"
            >
              <Edit3 className="w-4 h-4" />
              <span className="md:hidden text-xs font-mono">Edit Habits</span>
            </button>

            {/* 2. Sync Icon (Fetch Prayer Times) */}
            <button
              onClick={handleSyncPrayers}
              disabled={isSyncingPrayers}
              className="interactive-tap p-2 rounded-md border border-border bg-surface text-text hover:border-text text-xs font-mono transition-colors disabled:opacity-50 flex items-center gap-2"
              title="Sync Prayer Times"
              aria-label="Sync Prayer Times"
            >
              <RotateCw className={`w-4 h-4 ${isSyncingPrayers ? "animate-spin text-text" : ""}`} />
              <span className="md:hidden text-xs font-mono">Sync Prayers</span>
            </button>

            {/* 3. History Icon */}
            <button
              onClick={() => {
                setShowHistory(true);
                fetchHistory();
              }}
              className="interactive-tap p-2 rounded-md border border-border bg-surface text-text hover:border-text text-xs font-mono transition-colors flex items-center gap-2"
              title="Challenge History"
              aria-label="Challenge History"
            >
              <History className="w-4 h-4" />
              <span className="md:hidden text-xs font-mono">History</span>
            </button>

            {/* 4. Plus Icon (Add Habit) */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="interactive-tap p-2 rounded-md border border-border bg-surface text-text hover:border-text text-xs font-mono transition-colors flex items-center gap-2"
              title="Add New Habit"
              aria-label="Add New Habit"
            >
              <Plus className="w-4 h-4" />
              <span className="md:hidden text-xs font-mono">Add Habit</span>
            </button>
          </ActionDrawer>
        )}
      </div>

      {/* Edit Mode Active Banner */}
      {isEditMode && !showHistory && (
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-md bg-surface border border-border text-xs font-mono text-text">
          <div className="flex items-center gap-2">
            <Edit3 className="w-3.5 h-3.5 text-text" />
            <span>Edit mode active. Click the pen icon beside any habit to modify, delete, or finish.</span>
          </div>
          <button
            onClick={() => setIsEditMode(false)}
            className="text-[11px] underline hover:text-text-muted"
          >
            Done
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. MAIN HABITS TABLE VIEW (EXACTLY 7 DAYS)              */}
      {/* ======================================================== */}
      {!showHistory ? (
        <div className="space-y-3">
          <TimeNavigator
            label={`${datesWindow[0]?.label || ""} – ${datesWindow[6]?.label || ""}`}
            onPrev={goToPrevWeek}
            onNext={goToNextWeek}
            onToday={goToToday}
            showToday={windowOffset !== 0}
            prevTitle="Previous 7 Days"
            nextTitle="Next 7 Days"
            className="px-1"
          />

          {/* Table Container - Exactly 7 Days with Independent Horizontal Scroll on Mobile */}
          <AnimatedSlideView
            slideKey={animKey}
            direction={slideDirection}
            className="border border-border rounded-md bg-surface overflow-x-auto select-none touch-pan-x overscroll-x-contain"
          >
            <table className="min-w-[504px] w-full border-collapse text-left table-fixed sm:min-w-full">
              <thead>
                <tr className="border-b border-border bg-bg">
                  {/* Sticky First Column Header (Solid Opaque, z-40) */}
                  <th className="sticky left-0 z-40 bg-bg px-3 sm:px-4 py-3 w-[140px] min-w-[140px] max-w-[140px] sm:w-[220px] sm:min-w-[200px] sm:max-w-none border-r border-border shadow-[4px_0_10px_-3px_rgba(0,0,0,0.35)] sm:shadow-none text-xs font-mono font-medium text-text uppercase tracking-wider">
                    Habit / Routine
                  </th>

                  {/* Exactly 7 Day Columns (Proper min-width on mobile, auto on desktop) */}
                  {datesWindow.map((d) => {
                    const isLocked = lockedDates.includes(d.dateStr);
                    return (
                      <th
                        key={d.dateStr}
                        className={`w-[52px] min-w-[52px] sm:w-auto sm:min-w-0 px-1 sm:px-2 py-3 text-center transition-colors ${
                          d.isToday
                            ? "bg-text/10 text-text font-bold"
                            : "text-text-muted font-normal"
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <span className={`text-[10px] font-mono uppercase ${d.isToday ? "text-text font-bold" : "text-text-muted"}`}>
                            {d.dayName}
                          </span>
                          <span className={`text-xs font-mono mt-0.5 ${d.isToday ? "text-text font-bold underline underline-offset-4" : "text-text"}`}>
                            {d.label.split(" ")[1]}
                          </span>
                          {isLocked && (
                            <span title="Locked Day" className="mt-0.5">
                              <Lock className="w-3 h-3 text-text-muted/60" />
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-border/80">
                {/* -------------------------------------------------- */}
                {/* SECTION 1: FOREVER HABITS                          */}
                {/* -------------------------------------------------- */}
                <tr className="bg-bg">
                  <td className="sticky left-0 z-30 bg-bg px-3 sm:px-4 py-2.5 w-[140px] min-w-[140px] max-w-[140px] sm:w-[220px] sm:min-w-[200px] sm:max-w-none text-[11px] font-mono tracking-wider text-text uppercase font-semibold border-r border-border shadow-[4px_0_10px_-3px_rgba(0,0,0,0.35)] sm:shadow-none">
                    Forever habits
                  </td>
                  <td colSpan={7} className="bg-bg"></td>
                </tr>

                {/* 5 Waqt Namaj (Tighter Heights, Circle Outline to Filled Tick Marker) */}
                {PRAYERS_LIST.map((prayer) => {
                  const pTime = prayerTimes[prayer.key] || "";
                  return (
                    <tr key={prayer.key} className="hover:bg-bg/40 transition-colors group">
                      {/* Fixed First Column: Namaj Name + Namaj Time Below */}
                      <td className="sticky left-0 z-30 bg-surface group-hover:bg-surface-hover px-3 sm:px-4 py-2 w-[140px] min-w-[140px] max-w-[140px] sm:w-[220px] sm:min-w-[200px] sm:max-w-none border-r border-border shadow-[4px_0_10px_-3px_rgba(0,0,0,0.35)] sm:shadow-none">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-medium text-text leading-tight">{prayer.name}</div>
                            <div className="text-[10px] font-mono text-text-muted flex items-center gap-1 mt-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{pTime}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Day Cells for Prayer */}
                      {datesWindow.map((d) => {
                        const dayLog = prayerLogs[d.dateStr];
                        const isDone = Boolean(dayLog && dayLog[prayer.key]);
                        const isLocked = lockedDates.includes(d.dateStr);

                        return (
                          <td
                            key={d.dateStr}
                            className={`w-[52px] min-w-[52px] sm:w-auto sm:min-w-0 p-1.5 sm:p-2 text-center ${d.isToday ? "bg-text/5" : ""}`}
                          >
                            <div key={`${d.dateStr}-${animKey}`} className={animClass}>
                              <button
                                onClick={() => handleTogglePrayer(d.dateStr, prayer.key)}
                                disabled={isLocked}
                                className={`w-8 h-8 mx-auto rounded-md border flex items-center justify-center transition-all duration-150 active:scale-90 ${
                                  isLocked
                                    ? "opacity-30 cursor-not-allowed border-border bg-bg"
                                    : isDone
                                    ? "border-border bg-surface hover:border-text group"
                                    : "border-border/80 hover:border-text bg-bg group"
                                }`}
                                title={isLocked ? "Day is locked from Calendar" : `${prayer.name} on ${d.dateStr}`}
                              >
                                {isLocked ? (
                                  <Lock className="w-3.5 h-3.5 text-text-muted" />
                                ) : isDone ? (
                                  <span className="w-4 h-4 rounded-[2px] bg-text text-bg flex items-center justify-center animate-check-pop">
                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  </span>
                                ) : (
                                  <span className="w-3.5 h-3.5 rounded-[1.5px] border border-transparent group-hover:border-border/80 transition-colors" />
                                )}
                              </button>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Custom Forever Habits */}
                {foreverHabits.length > 0 &&
                  foreverHabits.map((habit) => {
                    const habitStart = normalizeDateKey(habit.startDate) || normalizeDateKey(habit.createdAt);

                    return (
                      <tr key={habit.id} className="hover:bg-bg/40 transition-colors group">
                        {/* Fixed First Column: Habit Name + Optional Time (No Icon) */}
                        <td className="sticky left-0 z-30 bg-surface group-hover:bg-surface-hover px-3 sm:px-4 py-2.5 w-[140px] min-w-[140px] max-w-[140px] sm:w-[220px] sm:min-w-[200px] sm:max-w-none border-r border-border shadow-[4px_0_10px_-3px_rgba(0,0,0,0.35)] sm:shadow-none">
                          <div className="flex items-center justify-between">
                            <div className="min-w-0 pr-1">
                              <div className="text-xs font-medium text-text truncate" title={habit.name}>
                                {habit.name}
                              </div>
                              {habit.time && (
                                <div className="text-[10px] font-mono text-text-muted flex items-center gap-1 mt-0.5">
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>{habit.time}</span>
                                </div>
                              )}
                            </div>

                            {/* Edit Pen in Edit Mode */}
                            {isEditMode && (
                              <button
                                onClick={() => setEditingHabit(habit)}
                                className="interactive-tap p-1 rounded-sm border border-border bg-bg text-text hover:border-text shrink-0"
                                title="Edit habit"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Day Cells for Custom Forever Habit */}
                        {datesWindow.map((d) => {
                          const isCreated = !habitStart || d.dateStr >= habitStart;
                          const isDone = Boolean(habit.logs[d.dateStr]);
                          const isLocked = lockedDates.includes(d.dateStr);

                          return (
                            <td
                              key={d.dateStr}
                              className={`w-[52px] min-w-[52px] sm:w-auto sm:min-w-0 p-1.5 sm:p-2 text-center ${d.isToday ? "bg-text/5" : ""}`}
                            >
                              <div key={`${d.dateStr}-${animKey}`} className={animClass}>
                                {!isCreated ? (
                                  <div className="w-8 h-8 mx-auto flex items-center justify-center text-text-muted/40 font-mono text-sm font-medium select-none">
                                    -
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleToggleHabit(habit.id, d.dateStr, false)}
                                    disabled={isLocked}
                                    className={`w-8 h-8 mx-auto rounded-md border flex items-center justify-center transition-all duration-150 active:scale-90 ${
                                      isLocked
                                        ? "opacity-30 cursor-not-allowed border-border bg-bg"
                                        : isDone
                                        ? "border-border bg-surface hover:border-text group"
                                        : "border-border/80 hover:border-text bg-bg group"
                                    }`}
                                    title={isLocked ? "Day is locked from Calendar" : `${habit.name} on ${d.dateStr}`}
                                  >
                                    {isLocked ? (
                                      <Lock className="w-3.5 h-3.5 text-text-muted" />
                                    ) : isDone ? (
                                      <span className="w-4 h-4 rounded-[2px] bg-text text-bg flex items-center justify-center animate-check-pop">
                                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                                      </span>
                                    ) : (
                                      <span className="w-3.5 h-3.5 rounded-[1.5px] border border-transparent group-hover:border-border/80 transition-colors" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                {/* -------------------------------------------------- */}
                {/* SECTION 2: TARGET CHALLENGES                       */}
                {/* -------------------------------------------------- */}
                <tr className="bg-bg">
                  <td className="sticky left-0 z-30 bg-bg px-3 sm:px-4 py-2.5 w-[140px] min-w-[140px] max-w-[140px] sm:w-[220px] sm:min-w-[200px] sm:max-w-none text-[11px] font-mono tracking-wider text-text uppercase font-semibold border-r border-border shadow-[4px_0_10px_-3px_rgba(0,0,0,0.35)] sm:shadow-none">
                    Target challenges
                  </td>
                  <td colSpan={7} className="bg-bg"></td>
                </tr>

                {challengeHabits.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-6 text-center text-xs font-mono text-text-muted"
                    >
                      No active target challenges. Start a 21, 30, or 60 days challenge using the + button.
                    </td>
                  </tr>
                ) : (
                  challengeHabits.map((challenge) => {
                    const challengeStart = normalizeDateKey(challenge.startDate) || normalizeDateKey(challenge.createdAt);
                    const challengeEnd = normalizeDateKey(challenge.endDate);

                    const target = challenge.targetDays || 30;
                    const completed = challenge.completedTotal || 0;
                    const pct = Math.min(100, Math.round((completed / target) * 100));

                    return (
                      <tr key={challenge.id} className="hover:bg-bg/40 transition-colors group">
                        {/* Fixed First Column: Challenge Name (NO ICON) + Progress + Optional Time */}
                        <td className="sticky left-0 z-30 bg-surface group-hover:bg-surface-hover px-3 sm:px-4 py-2.5 w-[140px] min-w-[140px] max-w-[140px] sm:w-[220px] sm:min-w-[200px] sm:max-w-none border-r border-border shadow-[4px_0_10px_-3px_rgba(0,0,0,0.35)] sm:shadow-none">
                          <div className="flex items-center justify-between">
                            <div className="min-w-0 pr-1 flex-1">
                              {/* Habit Name without icon */}
                              <div className="text-xs font-medium text-text truncate" title={challenge.name}>
                                {challenge.name}
                              </div>

                              <div className="flex items-center gap-2 mt-1.5">
                                <div className="flex-1 h-1.5 bg-bg rounded-xs overflow-hidden border border-border">
                                  <div
                                    className="h-full bg-text transition-all duration-300"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-mono text-text-muted shrink-0">
                                  {completed}/{target}d
                                </span>
                              </div>

                              {challenge.time && (
                                <div className="text-[10px] font-mono text-text-muted flex items-center gap-1 mt-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>{challenge.time}</span>
                                </div>
                              )}
                            </div>

                            {/* Edit Pen in Edit Mode */}
                            {isEditMode && (
                              <button
                                onClick={() => setEditingHabit(challenge)}
                                className="interactive-tap p-1 rounded-sm border border-border bg-bg text-text hover:border-text shrink-0"
                                title="Edit challenge or finish early"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Day Cells for Challenge */}
                        {datesWindow.map((d) => {
                          const isCreated = !challengeStart || d.dateStr >= challengeStart;
                          const isPastEnd = challengeEnd ? d.dateStr > challengeEnd : false;
                          const isDone = Boolean(challenge.logs[d.dateStr]);
                          const isLocked = lockedDates.includes(d.dateStr);

                          return (
                            <td
                              key={d.dateStr}
                              className={`w-[52px] min-w-[52px] sm:w-auto sm:min-w-0 p-1.5 sm:p-2 text-center ${d.isToday ? "bg-text/5" : ""}`}
                            >
                              <div key={`${d.dateStr}-${animKey}`} className={animClass}>
                                {!isCreated || isPastEnd ? (
                                  <div className="w-8 h-8 mx-auto flex items-center justify-center text-text-muted/40 font-mono text-sm font-medium select-none">
                                    -
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleToggleHabit(challenge.id, d.dateStr, true)}
                                    disabled={isLocked}
                                    className={`w-8 h-8 mx-auto rounded-md border flex items-center justify-center transition-all duration-150 active:scale-90 ${
                                      isLocked
                                        ? "opacity-30 cursor-not-allowed border-border bg-bg"
                                        : isDone
                                        ? "border-border bg-surface hover:border-text group"
                                        : "border-border/80 hover:border-text bg-bg group"
                                    }`}
                                    title={isLocked ? "Day is locked from Calendar" : `${challenge.name} on ${d.dateStr}`}
                                  >
                                    {isLocked ? (
                                      <Lock className="w-3.5 h-3.5 text-text-muted" />
                                    ) : isDone ? (
                                      <span className="w-4 h-4 rounded-[2px] bg-text text-bg flex items-center justify-center animate-check-pop">
                                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                                      </span>
                                    ) : (
                                      <span className="w-3.5 h-3.5 rounded-[1.5px] border border-transparent group-hover:border-border/80 transition-colors" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </AnimatedSlideView>
        </div>
      ) : (
        /* ======================================================== */
        /* 3. CHALLENGE HISTORY VIEW                                */
        /* ======================================================== */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono text-text-muted">
              Record of archived and completed challenges
            </p>
          </div>

          {historyItems.length === 0 ? (
            <div className="bg-surface border border-border rounded-md p-12 text-center">
              <CheckCircle2 className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-text">No challenge history yet</p>
              <p className="text-xs font-mono text-text-muted mt-1">
                When target challenges are completed or finished early, they will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {historyItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-surface border border-border rounded-md p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-text">{item.name}</h3>
                      {item.description && (
                        <p className="text-xs text-text-muted mt-0.5">{item.description}</p>
                      )}
                    </div>
                    <span className="px-2 py-0.5 rounded-xs bg-bg border border-border text-[10px] font-mono text-text">
                      {item.isCompleted ? "Completed" : "Archived"}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-text-muted">Progress Rate</span>
                      <span className="text-text font-bold">{item.completionRate}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-bg rounded-xs overflow-hidden border border-border">
                      <div
                        className="h-full bg-text"
                        style={{ width: `${item.completionRate}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border text-[11px] font-mono text-text-muted">
                    <div>
                      <span className="block text-[10px]">Target Days</span>
                      <span className="text-text font-medium">{item.targetDays} Days</span>
                    </div>
                    <div>
                      <span className="block text-[10px]">Days Logged</span>
                      <span className="text-text font-medium">{item.completedDays} Days</span>
                    </div>
                    {item.startDate && (
                      <div>
                        <span className="block text-[10px]">Started</span>
                        <span className="text-text">{item.startDate}</span>
                      </div>
                    )}
                    {item.endDate && (
                      <div>
                        <span className="block text-[10px]">Finished</span>
                        <span className="text-text">{item.endDate}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. ADD HABIT MODAL                                       */}
      {/* ======================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-bg/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-surface border border-border rounded-md p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-semibold text-text">Create Habit or Routine</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="interactive-tap p-1 rounded-sm text-text-muted hover:text-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateHabit} className="space-y-4">
              {/* Type Selector: Forever Habit vs Target Challenge */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-bg border border-border rounded-md">
                <button
                  type="button"
                  onClick={() => setAddType("FOREVER")}
                  className={`py-1.5 text-xs font-mono rounded-xs transition-colors ${
                    addType === "FOREVER"
                      ? "bg-text text-bg font-semibold"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  Forever Habit
                </button>
                <button
                  type="button"
                  onClick={() => setAddType("CHALLENGE")}
                  className={`py-1.5 text-xs font-mono rounded-xs transition-colors ${
                    addType === "CHALLENGE"
                      ? "bg-text text-bg font-semibold"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  Target Challenge
                </button>
              </div>

              {/* Habit Name */}
              <div>
                <label className="block text-xs font-mono text-text-muted mb-1">
                  Habit Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder={addType === "CHALLENGE" ? "e.g. 30 Days Cold Shower" : "e.g. Morning Quran Recitation"}
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full bg-bg border border-border rounded-md px-3 py-2 text-xs text-text placeholder:text-text-muted focus:outline-hidden focus:border-text"
                />
              </div>

              {/* Challenge Duration Selector */}
              {addType === "CHALLENGE" && (
                <div>
                  <label className="block text-xs font-mono text-text-muted mb-1.5">
                    Challenge Target Duration
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[21, 30, 60].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => {
                          setAddChallengeDays(days);
                          setIsCustomDays(false);
                        }}
                        className={`py-1.5 text-xs font-mono rounded-md border transition-colors ${
                          !isCustomDays && addChallengeDays === days
                            ? "bg-text text-bg border-text font-bold"
                            : "bg-bg border-border text-text hover:border-text"
                        }`}
                      >
                        {days} Days
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setIsCustomDays(true)}
                      className={`py-1.5 text-xs font-mono rounded-md border transition-colors ${
                        isCustomDays
                          ? "bg-text text-bg border-text font-bold"
                          : "bg-bg border-border text-text hover:border-text"
                      }`}
                    >
                      Custom
                    </button>
                  </div>

                  {isCustomDays && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="365"
                        placeholder="e.g. 45"
                        value={customDaysVal}
                        onChange={(e) => setCustomDaysVal(e.target.value)}
                        className="w-24 bg-bg border border-border rounded-md px-3 py-1.5 text-xs text-text focus:outline-hidden focus:border-text font-mono"
                      />
                      <span className="text-xs font-mono text-text-muted">Target Days</span>
                    </div>
                  )}
                </div>
              )}

              {/* Optional Time */}
              <div>
                <label className="block text-xs font-mono text-text-muted mb-1">
                  Routine Time (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 06:30 AM or 10:00 PM"
                  value={addTime}
                  onChange={(e) => setAddTime(e.target.value)}
                  className="w-full bg-bg border border-border rounded-md px-3 py-2 text-xs text-text placeholder:text-text-muted focus:outline-hidden focus:border-text font-mono"
                />
              </div>

              {/* Optional Description */}
              <div>
                <label className="block text-xs font-mono text-text-muted mb-1">
                  Description / Motivation (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Short note or commitment reason"
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  className="w-full bg-bg border border-border rounded-md px-3 py-2 text-xs text-text placeholder:text-text-muted focus:outline-hidden focus:border-text resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="interactive-tap px-3 py-1.5 rounded-md border border-border text-xs font-mono text-text hover:border-text transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="interactive-tap px-4 py-1.5 rounded-md bg-text text-bg text-xs font-mono font-semibold hover:bg-text/90 transition-colors disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Create Routine"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. EDIT HABIT MODAL (WITH DELETE & FINISH BUTTONS)       */}
      {/* ======================================================== */}
      {editingHabit && (
        <div className="fixed inset-0 bg-bg/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-surface border border-border rounded-md p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-semibold text-text">
                Edit {editingHabit.type === "CHALLENGE" ? "Challenge" : "Habit"}
              </h2>
              <button
                onClick={() => setEditingHabit(null)}
                className="interactive-tap p-1 rounded-sm text-text-muted hover:text-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateHabit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-text-muted mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={editingHabit.name}
                  onChange={(e) => setEditingHabit({ ...editingHabit, name: e.target.value })}
                  className="w-full bg-bg border border-border rounded-md px-3 py-2 text-xs text-text focus:outline-hidden focus:border-text"
                />
              </div>

              {editingHabit.type === "CHALLENGE" && (
                <div>
                  <label className="block text-xs font-mono text-text-muted mb-1">
                    Target Days
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={editingHabit.targetDays || 30}
                    onChange={(e) =>
                      setEditingHabit({
                        ...editingHabit,
                        targetDays: parseInt(e.target.value, 10) || 30,
                      })
                    }
                    className="w-full bg-bg border border-border rounded-md px-3 py-2 text-xs text-text focus:outline-hidden focus:border-text font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-mono text-text-muted mb-1">
                  Routine Time (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 07:00 AM"
                  value={editingHabit.time || ""}
                  onChange={(e) => setEditingHabit({ ...editingHabit, time: e.target.value })}
                  className="w-full bg-bg border border-border rounded-md px-3 py-2 text-xs text-text placeholder:text-text-muted focus:outline-hidden focus:border-text font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-text-muted mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editingHabit.description || ""}
                  onChange={(e) => setEditingHabit({ ...editingHabit, description: e.target.value })}
                  className="w-full bg-bg border border-border rounded-md px-3 py-2 text-xs text-text placeholder:text-text-muted focus:outline-hidden focus:border-text resize-none"
                />
              </div>

              {/* Special Action: Finish Challenge Early */}
              {editingHabit.type === "CHALLENGE" && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleFinishChallengeEarly(editingHabit.id)}
                    className="w-full interactive-tap py-2 rounded-md border border-border bg-bg hover:border-text text-text text-xs font-mono flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Finish Challenge Early (Move to History)</span>
                  </button>
                </div>
              )}

              {/* Bottom Actions: Delete Button and Save */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => handleDeleteHabit(editingHabit.id, editingHabit.type === "CHALLENGE")}
                  className="interactive-tap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-mono text-text hover:border-text transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingHabit(null)}
                    className="interactive-tap px-3 py-1.5 rounded-md border border-border text-xs font-mono text-text hover:border-text transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="interactive-tap px-4 py-1.5 rounded-md bg-text text-bg text-xs font-mono font-semibold hover:bg-text/90 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HabitsPage;
