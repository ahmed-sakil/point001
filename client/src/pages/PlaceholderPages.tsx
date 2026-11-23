import React from "react";

interface PlaceholderProps {
  title: string;
  subtitle: string;
}

export const PlaceholderPage: React.FC<PlaceholderProps> = ({ title, subtitle }) => {
  return (
    <div className="space-y-4">
      <div className="pb-4 border-b border-border">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-text">{title}</h1>
        <p className="text-xs text-text/60 font-mono mt-1">{subtitle}</p>
      </div>

      <div className="bg-surface border border-border p-8 text-center max-w-lg mx-auto">
        <p className="text-sm font-semibold text-text">{title} Engine</p>
        <p className="text-xs text-text/50 font-mono mt-2">
          Interface ready for implementation discussion.
        </p>
      </div>
    </div>
  );
};

export const TasksPage = () => (
  <PlaceholderPage title="Tasks and Events" subtitle="Actionable items • Priorities • Subtasks" />
);

export const CalendarPage = () => (
  <PlaceholderPage title="Calendar" subtitle="Schedule • Day Locks • Events" />
);

export const ContactsPage = () => (
  <PlaceholderPage title="Contacts" subtitle="Directory • Google People Sync • Relations" />
);

export const HabitsPage = () => (
  <PlaceholderPage title="Habits & Prayers" subtitle="Discipline tracking • Streaks • Routines" />
);

export const FinancePage = () => (
  <PlaceholderPage title="Personal Finance" subtitle="Accounts • Debts • Commitments • Savings Goals" />
);

export const InboxPage = () => (
  <PlaceholderPage title="Unified Inbox" subtitle="Gmail API • IMAP • Email to Task Engine" />
);

export const SettingsPage = () => (
  <PlaceholderPage title="Settings" subtitle="System Profile • Gmail Keys • Theme Preferences" />
);
