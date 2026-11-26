import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Star,
  Search,
  Plus,
  Trash2,
  Edit2,
  Edit3,
  X,
  Phone,
  Mail,
  Calendar,
  Briefcase,
  Copy,
  Check,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import ActionDrawer from "../components/ui/ActionDrawer";
import CheckboxTick from "../components/ui/CheckboxTick";

interface PhoneNumberItem {
  value: string;
  label: string;
}

interface EmailItem {
  value: string;
  label: string;
}

interface ContactItem {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  phoneNumbers: PhoneNumberItem[];
  emails: EmailItem[];
  birthday?: string | null;
  notes?: string | null;
  tags: string[];
  isStarred: boolean;
  googleResourceName?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ContactsResponse {
  contacts: ContactItem[];
  counts: {
    totalCount: number;
    starredCount: number;
    unstarredCount: number;
  };
}

export const ContactsPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [counts, setCounts] = useState({
    totalCount: 0,
    starredCount: 0,
    unstarredCount: 0,
  });

  // Active Tab: "starred" (default) or "all"
  const [activeTab, setActiveTab] = useState<"starred" | "all">("starred");
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedContactDetail, setSelectedContactDetail] = useState<ContactItem | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Contact Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Modal Form State
  const [formDisplayName, setFormDisplayName] = useState("");
  const [formAvatarUrl, setFormAvatarUrl] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formJobTitle, setFormJobTitle] = useState("");
  const [formBirthday, setFormBirthday] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formIsStarred, setFormIsStarred] = useState(false);
  const [formPhoneNumbers, setFormPhoneNumbers] = useState<PhoneNumberItem[]>([
    { value: "", label: "Mobile" },
  ]);
  const [formEmails, setFormEmails] = useState<EmailItem[]>([
    { value: "", label: "Personal" },
  ]);

  // Fetch Contacts
  const fetchContacts = useCallback(async () => {
    try {
      // Query backend with current tab filter
      const endpoint = activeTab === "starred" ? "/contacts?starred=true" : "/contacts";
      const data = await api.get<ContactsResponse>(endpoint);
      setContacts(data.contacts);
      setCounts(data.counts);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load contacts");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Filter contacts by case-sensitive search query
  const filteredContacts = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return contacts;

    // Strict Case-Sensitive Search as requested: "Sakil" !== "sakil"
    return contacts.filter((c) => {
      const matchName = c.displayName.includes(q);
      const matchCompany = c.company ? c.company.includes(q) : false;
      const matchJob = c.jobTitle ? c.jobTitle.includes(q) : false;
      const matchEmail = c.email ? c.email.includes(q) : false;
      const matchPhone = c.phoneNumber ? c.phoneNumber.includes(q) : false;
      const matchNotes = c.notes ? c.notes.includes(q) : false;
      const matchPhones = c.phoneNumbers?.some((p) => p.value.includes(q));
      const matchEmails = c.emails?.some((e) => e.value.includes(q));

      return (
        matchName ||
        matchCompany ||
        matchJob ||
        matchEmail ||
        matchPhone ||
        matchNotes ||
        matchPhones ||
        matchEmails
      );
    });
  }, [contacts, searchQuery]);

  // Group contacts by initial character for "All Contacts" directory view
  const groupedContacts = useMemo(() => {
    if (activeTab === "starred") return null;

    const groups: { [key: string]: ContactItem[] } = {};
    for (const contact of filteredContacts) {
      const firstChar = contact.displayName.charAt(0) || "#";
      const key = firstChar.toUpperCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(contact);
    }

    return Object.keys(groups)
      .sort((a, b) => a.localeCompare(b))
      .map((letter) => ({
        letter,
        contacts: groups[letter],
      }));
  }, [activeTab, filteredContacts]);

  // Toggle Star Status (1-click)
  const handleToggleStar = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Optimistic UI update
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isStarred: !c.isStarred } : c))
    );
    setSelectedContactDetail((prev) =>
      prev && prev.id === id ? { ...prev, isStarred: !prev.isStarred } : prev
    );

    try {
      const res = await api.post<{ success: boolean; isStarred: boolean }>(
        `/contacts/${id}/star`
      );
      toast.success(res.isStarred ? "Marked as Starred" : "Removed from Starred");
      fetchContacts();
    } catch {
      toast.error("Failed to update star");
      fetchContacts();
    }
  };

  // Copy helper
  const handleCopy = (text: string, key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // Open Create Modal
  const openCreateModal = () => {
    setSelectedContactDetail(null);
    setModalMode("create");
    setEditingId(null);
    setFormDisplayName("");
    setFormAvatarUrl("");
    setFormCompany("");
    setFormJobTitle("");
    setFormBirthday("");
    setFormNotes("");
    setFormIsStarred(activeTab === "starred");
    setFormPhoneNumbers([{ value: "", label: "Mobile" }]);
    setFormEmails([{ value: "", label: "Personal" }]);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (contact: ContactItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalMode("edit");
    setEditingId(contact.id);
    setFormDisplayName(contact.displayName);
    setFormAvatarUrl(contact.avatarUrl || "");
    setFormCompany(contact.company || "");
    setFormJobTitle(contact.jobTitle || "");
    setFormBirthday(contact.birthday || "");
    setFormNotes(contact.notes || "");
    setFormIsStarred(contact.isStarred);
    setFormPhoneNumbers(
      contact.phoneNumbers && contact.phoneNumbers.length > 0
        ? contact.phoneNumbers
        : contact.phoneNumber
        ? [{ value: contact.phoneNumber, label: "Mobile" }]
        : [{ value: "", label: "Mobile" }]
    );
    setFormEmails(
      contact.emails && contact.emails.length > 0
        ? contact.emails
        : contact.email
        ? [{ value: contact.email, label: "Personal" }]
        : [{ value: "", label: "Personal" }]
    );
    setIsModalOpen(true);
  };

  // Delete Contact
  const handleDeleteContact = async (id: string, name: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Delete contact "${name}"?`)) return;

    try {
      await api.delete(`/contacts/${id}`);
      toast.success("Contact deleted");
      setSelectedContactDetail((prev) => (prev && prev.id === id ? null : prev));
      fetchContacts();
    } catch {
      toast.error("Failed to delete contact");
    }
  };

  // Sync with Google Contacts
  const handleSyncGoogle = async () => {
    setIsSyncing(true);
    try {
      const res = await api.post<{ success: boolean; message: string; syncedContactsCount: number }>(
        "/settings/google/sync"
      );
      toast.success(res.message || "Google sync completed");
      fetchContacts();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Google sync failed. Check your API key in Settings.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Save Modal Form
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDisplayName.trim()) {
      toast.error("Contact name is required");
      return;
    }

    const cleanedPhones = formPhoneNumbers.filter((p) => p.value.trim() !== "");
    const cleanedEmails = formEmails.filter((e) => e.value.trim() !== "");

    const payload = {
      displayName: formDisplayName.trim(), // Exact case preserved
      avatarUrl: formAvatarUrl.trim() || undefined,
      company: formCompany.trim() || undefined,
      jobTitle: formJobTitle.trim() || undefined,
      birthday: formBirthday.trim() || undefined,
      notes: formNotes.trim() || undefined,
      isStarred: formIsStarred,
      phoneNumbers: cleanedPhones,
      emails: cleanedEmails,
      phoneNumber: cleanedPhones[0]?.value || undefined,
      email: cleanedEmails[0]?.value || undefined,
    };

    try {
      if (modalMode === "create") {
        await api.post("/contacts", payload);
        toast.success("Contact created");
      } else if (editingId) {
        await api.put(`/contacts/${editingId}`, payload);
        toast.success("Contact updated");
      }
      setIsModalOpen(false);
      fetchContacts();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to save contact");
    }
  };

  // Dynamic field handlers
  const addPhoneNumberRow = () => {
    setFormPhoneNumbers((prev) => [...prev, { value: "", label: "Mobile" }]);
  };

  const removePhoneNumberRow = (index: number) => {
    setFormPhoneNumbers((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePhoneNumberRow = (index: number, field: "value" | "label", val: string) => {
    setFormPhoneNumbers((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item))
    );
  };

  const addEmailRow = () => {
    setFormEmails((prev) => [...prev, { value: "", label: "Personal" }]);
  };

  const removeEmailRow = (index: number) => {
    setFormEmails((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEmailRow = (index: number, field: "value" | "label", val: string) => {
    setFormEmails((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item))
    );
  };

  // Helper for Initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center">
        <Loader2 className="w-5 h-5 text-text animate-spin mb-2" />
        <span className="text-xs font-mono text-text-muted">Loading contacts...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* PAGE HEADER & SETTINGS DRAWER */}
      {/* ======================================================== */}
      <div className="pb-4 border-b border-border flex items-start justify-between gap-3 relative">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-text truncate">
              Contacts
            </h1>
          </div>
          <p className="text-xs text-text-muted font-mono mt-1 truncate">
            {counts.starredCount} starred • {counts.totalCount} total contacts
          </p>
        </div>

        {/* Right Action Area */}
        <div className="flex items-center gap-2 shrink-0">
          {/* WHEN EDIT MODE IS ACTIVE: Show Add Contact Icon */}
          {isEditMode && (
            <button
              onClick={openCreateModal}
              title="Add New Contact"
              className="interactive-tap relative p-2 bg-surface hover:bg-bg border border-border hover:border-text rounded-md text-text transition-colors animate-in fade-in duration-200"
              aria-label="Add new contact"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}

          {/* Setting Drawer */}
          <ActionDrawer triggerTitle="Contacts Actions">
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

            {/* Icon 2: Sync with Google */}
            <button
              onClick={handleSyncGoogle}
              disabled={isSyncing}
              title="Sync with Google Contacts"
              className="interactive-tap p-2 border rounded-md transition-colors bg-surface text-text-muted border-border hover:text-text hover:border-text disabled:opacity-50 flex items-center gap-2"
              aria-label="Sync with Google"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin text-text" : ""}`} />
              <span className="md:hidden text-xs font-mono">Sync Google</span>
            </button>

            {/* Icon 3: Add Contact Quick */}
            <button
              onClick={openCreateModal}
              title="Create New Contact"
              className="interactive-tap p-2 border rounded-md transition-colors bg-surface text-text-muted border-border hover:text-text hover:border-text flex items-center gap-2"
              aria-label="Create new contact"
            >
              <Plus className="w-4 h-4" />
              <span className="md:hidden text-xs font-mono">Add Contact</span>
            </button>
          </ActionDrawer>
        </div>
      </div>

      {/* ======================================================== */}
      {/* NAVIGATION TABS & SEARCH BAR */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Sub-tabs: Starred (Default) vs All Contacts */}
        <div className="inline-flex p-1 bg-surface border border-border rounded-lg shrink-0">
          <button
            onClick={() => setActiveTab("starred")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
              activeTab === "starred"
                ? "bg-text text-bg shadow-xs"
                : "text-text-muted hover:text-text"
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-current" />
            Starred ({counts.starredCount})
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
              activeTab === "all"
                ? "bg-text text-bg shadow-xs"
                : "text-text-muted hover:text-text"
            }`}
          >
            All Contacts ({counts.totalCount})
          </button>
        </div>

        {/* Case-Sensitive Live Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts (case-sensitive)..."
            className="w-full bg-surface border border-border focus:border-text rounded-md pl-9 pr-8 py-1.5 text-xs text-text placeholder:text-text-muted focus:outline-none transition-colors"
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

      {/* ======================================================== */}
      {/* CONTACTS LIST RENDERING */}
      {/* ======================================================== */}
      {filteredContacts.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border rounded-lg bg-surface/30">
          <p className="text-xs font-mono text-text-muted">
            {searchQuery
              ? `No contacts matching "${searchQuery}" (case-sensitive)`
              : activeTab === "starred"
              ? "No starred contacts yet. Switch to All Contacts to star key contacts."
              : "No contacts found. Click + to add your first contact."}
          </p>
          {!searchQuery && (
            <button
              onClick={openCreateModal}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-bg border border-border hover:border-text rounded-md text-xs font-mono text-text transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Contact
            </button>
          )}
        </div>
      ) : activeTab === "starred" ? (
        /* Starred Contacts View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredContacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              isEditMode={isEditMode}
              copiedKey={copiedKey}
              onSelect={() => setSelectedContactDetail(contact)}
              onToggleStar={handleToggleStar}
              onEdit={openEditModal}
              onDelete={handleDeleteContact}
              onCopy={handleCopy}
              getInitials={getInitials}
            />
          ))}
        </div>
      ) : (
        /* All Contacts A-Z Grouped Directory */
        <div className="space-y-6">
          {groupedContacts?.map((group) => (
            <div key={group.letter} className="space-y-2">
              <div className="sticky top-0 z-10 bg-bg/90 backdrop-blur-xs py-1 px-1 border-b border-border/50 flex items-center gap-2">
                <span className="text-xs font-bold font-mono text-text bg-surface px-2 py-0.5 rounded border border-border">
                  {group.letter}
                </span>
                <span className="text-[10px] font-mono text-text-muted">
                  {group.contacts.length} {group.contacts.length === 1 ? "contact" : "contacts"}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {group.contacts.map((contact) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    isEditMode={isEditMode}
                    copiedKey={copiedKey}
                    onSelect={() => setSelectedContactDetail(contact)}
                    onToggleStar={handleToggleStar}
                    onEdit={openEditModal}
                    onDelete={handleDeleteContact}
                    onCopy={handleCopy}
                    getInitials={getInitials}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ======================================================== */}
      {/* CREATE / EDIT CONTACT MODAL */}
      {/* ======================================================== */}
      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-border rounded-lg max-w-lg w-full p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
              <h3 className="text-sm font-bold text-text">
                {modalMode === "create" ? "Add Contact" : "Edit Contact"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-text-muted hover:text-text p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Display Name (Case-sensitive) */}
              <div>
                <label className="block text-[11px] font-mono text-text-muted mb-1">
                  Full Name <span className="text-red-400">*</span> (Case-Sensitive)
                </label>
                <input
                  type="text"
                  required
                  value={formDisplayName}
                  onChange={(e) => setFormDisplayName(e.target.value)}
                  placeholder="e.g. Sakil or sakil"
                  className="w-full bg-bg border border-border focus:border-text rounded-md px-3 py-1.5 text-xs text-text placeholder:text-text-muted focus:outline-none transition-colors"
                />
              </div>

              {/* Photo / Avatar URL */}
              <div>
                <label className="block text-[11px] font-mono text-text-muted mb-1">
                  Photo / Avatar URL (Optional)
                </label>
                <input
                  type="url"
                  value={formAvatarUrl}
                  onChange={(e) => setFormAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-bg border border-border focus:border-text rounded-md px-3 py-1.5 text-xs text-text placeholder:text-text-muted focus:outline-none transition-colors"
                />
              </div>

              {/* Company & Job Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-text-muted mb-1">
                    Company / Organization
                  </label>
                  <input
                    type="text"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full bg-bg border border-border focus:border-text rounded-md px-3 py-1.5 text-xs text-text placeholder:text-text-muted focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-text-muted mb-1">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={formJobTitle}
                    onChange={(e) => setFormJobTitle(e.target.value)}
                    placeholder="e.g. Software Engineer"
                    className="w-full bg-bg border border-border focus:border-text rounded-md px-3 py-1.5 text-xs text-text placeholder:text-text-muted focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Phone Numbers (Multiple with Labels) */}
              <div className="space-y-2 border-t border-border/50 pt-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono text-text-muted flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Phone Numbers
                  </label>
                  <button
                    type="button"
                    onClick={addPhoneNumberRow}
                    className="text-[11px] font-mono text-text hover:underline inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Number
                  </button>
                </div>
                {formPhoneNumbers.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={p.label}
                      onChange={(e) => updatePhoneNumberRow(idx, "label", e.target.value)}
                      className="bg-bg border border-border rounded-md px-2 py-1.5 text-xs text-text focus:outline-none w-28 shrink-0"
                    >
                      <option value="Mobile">Mobile</option>
                      <option value="Work">Work</option>
                      <option value="Home">Home</option>
                      <option value="Main">Main</option>
                      <option value="Other">Other</option>
                    </select>
                    <input
                      type="tel"
                      value={p.value}
                      onChange={(e) => updatePhoneNumberRow(idx, "value", e.target.value)}
                      placeholder="+880 1..."
                      className="flex-1 bg-bg border border-border focus:border-text rounded-md px-3 py-1.5 text-xs text-text placeholder:text-text-muted focus:outline-none transition-colors"
                    />
                    {formPhoneNumbers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePhoneNumberRow(idx)}
                        className="text-text-muted hover:text-red-400 p-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Email Addresses (Multiple with Labels) */}
              <div className="space-y-2 border-t border-border/50 pt-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono text-text-muted flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Email Addresses
                  </label>
                  <button
                    type="button"
                    onClick={addEmailRow}
                    className="text-[11px] font-mono text-text hover:underline inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Email
                  </button>
                </div>
                {formEmails.map((e, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={e.label}
                      onChange={(e) => updateEmailRow(idx, "label", e.target.value)}
                      className="bg-bg border border-border rounded-md px-2 py-1.5 text-xs text-text focus:outline-none w-28 shrink-0"
                    >
                      <option value="Personal">Personal</option>
                      <option value="Work">Work</option>
                      <option value="Other">Other</option>
                    </select>
                    <input
                      type="email"
                      value={e.value}
                      onChange={(e) => updateEmailRow(idx, "value", e.target.value)}
                      placeholder="name@example.com"
                      className="flex-1 bg-bg border border-border focus:border-text rounded-md px-3 py-1.5 text-xs text-text placeholder:text-text-muted focus:outline-none transition-colors"
                    />
                    {formEmails.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEmailRow(idx)}
                        className="text-text-muted hover:text-red-400 p-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Birthday */}
              <div className="border-t border-border/50 pt-3">
                <label className="block text-[11px] font-mono text-text-muted mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Birthday
                </label>
                <input
                  type="date"
                  value={formBirthday}
                  onChange={(e) => setFormBirthday(e.target.value)}
                  className="w-full bg-bg border border-border focus:border-text rounded-md px-3 py-1.5 text-xs text-text focus:outline-none transition-colors"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-mono text-text-muted mb-1">
                  Notes
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Additional context or notes..."
                  rows={2}
                  className="w-full bg-bg border border-border focus:border-text rounded-md px-3 py-1.5 text-xs text-text placeholder:text-text-muted focus:outline-none transition-colors resize-none"
                />
              </div>

              {/* Starred Checkbox */}
              <div
                className="flex items-center gap-2 pt-1 cursor-pointer select-none group"
                onClick={() => setFormIsStarred(!formIsStarred)}
              >
                <CheckboxTick
                  size="sm"
                  shape="square"
                  checked={formIsStarred}
                  onChange={() => setFormIsStarred(!formIsStarred)}
                  aria-label="Star this contact"
                />
                <span className="text-xs font-mono text-text cursor-pointer flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-text" /> Star this contact
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 border-t border-border pt-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 bg-bg hover:bg-surface border border-border rounded-md text-xs font-mono text-text transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-text text-bg hover:bg-text/90 rounded-md text-xs font-mono font-medium transition-colors"
                >
                  {modalMode === "create" ? "Save Contact" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ======================================================== */}
      {/* FLOATING CONTACT DETAILS MODAL */}
      {/* ======================================================== */}
      {selectedContactDetail &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => setSelectedContactDetail(null)}
        >
          <div
            className="bg-surface border border-border rounded-lg max-w-md w-full p-5 space-y-4 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Avatar + Display Name & Company + Star/Close */}
            <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <ContactAvatar
                  src={selectedContactDetail.avatarUrl}
                  name={selectedContactDetail.displayName}
                  size="lg"
                  getInitials={getInitials}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-text truncate">
                      {selectedContactDetail.displayName}
                    </h3>
                    {selectedContactDetail.company && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg border border-border text-text-muted truncate">
                        {selectedContactDetail.company}
                      </span>
                    )}
                  </div>
                  {selectedContactDetail.jobTitle && (
                    <p className="text-xs text-text-muted flex items-center gap-1.5 mt-0.5 truncate font-mono">
                      <Briefcase className="w-3.5 h-3.5 text-text-muted shrink-0" />
                      {selectedContactDetail.jobTitle}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleStar(selectedContactDetail.id)}
                  title={selectedContactDetail.isStarred ? "Remove from Starred" : "Star Contact"}
                  className={`p-1.5 rounded-md border border-border hover:border-text/50 bg-bg transition-colors ${
                    selectedContactDetail.isStarred
                      ? "text-text"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  <Star className={`w-4 h-4 ${selectedContactDetail.isStarred ? "fill-current" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedContactDetail(null)}
                  className="p-1.5 rounded-md border border-border hover:border-text/50 bg-bg text-text-muted hover:text-text transition-colors"
                  title="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Information Sections */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 text-xs">
              {/* Phone Numbers */}
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block mb-1.5">
                  Phone Numbers
                </span>
                {selectedContactDetail.phoneNumbers && selectedContactDetail.phoneNumbers.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedContactDetail.phoneNumbers.map((phone, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-md bg-bg border border-border"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Phone className="w-3.5 h-3.5 text-text-muted shrink-0" />
                          <span className="text-[10px] font-mono text-text-muted uppercase px-1 py-0.5 rounded bg-surface border border-border">
                            {phone.label || "Mobile"}
                          </span>
                          <a
                            href={`tel:${phone.value}`}
                            className="font-mono text-xs text-text hover:underline truncate"
                          >
                            {phone.value}
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleCopy(phone.value, `modal-phone-${idx}`, e)}
                          className="p-1 text-text-muted hover:text-text rounded transition-colors shrink-0"
                          title="Copy phone"
                        >
                          {copiedKey === `modal-phone-${idx}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : selectedContactDetail.phoneNumber ? (
                  <div className="flex items-center justify-between p-2 rounded-md bg-bg border border-border">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-text-muted" />
                      <a
                        href={`tel:${selectedContactDetail.phoneNumber}`}
                        className="font-mono text-xs text-text hover:underline"
                      >
                        {selectedContactDetail.phoneNumber}
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleCopy(selectedContactDetail.phoneNumber!, "modal-phone", e)}
                      className="p-1 text-text-muted hover:text-text rounded transition-colors"
                      title="Copy phone"
                    >
                      {copiedKey === "modal-phone" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ) : (
                  <p className="text-text-muted font-mono text-[11px] italic">No phone numbers listed</p>
                )}
              </div>

              {/* Email Addresses */}
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block mb-1.5">
                  Email Addresses
                </span>
                {selectedContactDetail.emails && selectedContactDetail.emails.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedContactDetail.emails.map((emailItem, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-md bg-bg border border-border"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Mail className="w-3.5 h-3.5 text-text-muted shrink-0" />
                          <span className="text-[10px] font-mono text-text-muted uppercase px-1 py-0.5 rounded bg-surface border border-border">
                            {emailItem.label || "Personal"}
                          </span>
                          <a
                            href={`mailto:${emailItem.value}`}
                            className="font-mono text-xs text-text hover:underline truncate"
                          >
                            {emailItem.value}
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleCopy(emailItem.value, `modal-email-${idx}`, e)}
                          className="p-1 text-text-muted hover:text-text rounded transition-colors shrink-0"
                          title="Copy email"
                        >
                          {copiedKey === `modal-email-${idx}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : selectedContactDetail.email ? (
                  <div className="flex items-center justify-between p-2 rounded-md bg-bg border border-border">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-text-muted" />
                      <a
                        href={`mailto:${selectedContactDetail.email}`}
                        className="font-mono text-xs text-text hover:underline"
                      >
                        {selectedContactDetail.email}
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleCopy(selectedContactDetail.email!, "modal-email", e)}
                      className="p-1 text-text-muted hover:text-text rounded transition-colors"
                      title="Copy email"
                    >
                      {copiedKey === "modal-email" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ) : (
                  <p className="text-text-muted font-mono text-[11px] italic">No email addresses listed</p>
                )}
              </div>

              {/* Birthday */}
              {selectedContactDetail.birthday && (
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block mb-1.5">
                    Birthday
                  </span>
                  <div className="flex items-center gap-2 p-2 rounded-md bg-bg border border-border font-mono text-xs text-text">
                    <Calendar className="w-3.5 h-3.5 text-text-muted" />
                    <span>{selectedContactDetail.birthday}</span>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedContactDetail.notes && (
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block mb-1.5">
                    Notes
                  </span>
                  <div className="p-2.5 rounded-md bg-bg border border-border text-xs text-text whitespace-pre-wrap font-sans leading-relaxed">
                    {selectedContactDetail.notes}
                  </div>
                </div>
              )}

              {/* Source & Metadata */}
              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono text-text-muted">
                <span>
                  {selectedContactDetail.googleResourceName
                    ? "Synced from Google Contacts"
                    : "Created in point001"}
                </span>
                {selectedContactDetail.updatedAt && (
                  <span>
                    Updated: {new Date(selectedContactDetail.updatedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between border-t border-border pt-4">
              <button
                type="button"
                onClick={(e) => {
                  handleDeleteContact(selectedContactDetail.id, selectedContactDetail.displayName, e);
                  setSelectedContactDetail(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border hover:border-red-500/50 hover:bg-red-950/20 text-xs font-mono text-text-muted hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedContactDetail(null)}
                  className="px-3 py-1.5 bg-bg hover:bg-surface-hover border border-border rounded-md text-xs font-mono text-text transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    const c = selectedContactDetail;
                    setSelectedContactDetail(null);
                    openEditModal(c, e);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-text text-bg hover:bg-text/90 rounded-md text-xs font-mono font-medium transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Contact
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// ============================================================================
// ContactAvatar Component (Robust Referrer-Policy and Error Monogram Fallback)
// ============================================================================
interface ContactAvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  getInitials: (name: string) => string;
}

const ContactAvatar: React.FC<ContactAvatarProps> = ({
  src,
  name,
  size = "md",
  getInitials,
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const sizeClasses = {
    sm: "w-8 h-8 text-[11px]",
    md: "w-10 h-10 text-xs",
    lg: "w-12 h-12 text-sm",
  }[size];

  if (src && !hasError) {
    return (
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className={`${sizeClasses} rounded-full object-cover border border-border shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses} rounded-full bg-bg border border-border flex items-center justify-center font-mono font-bold text-text shrink-0 select-none`}
    >
      {getInitials(name)}
    </div>
  );
};

// ============================================================================
// ContactCard Component
// ============================================================================
interface ContactCardProps {
  contact: ContactItem;
  isEditMode: boolean;
  copiedKey: string | null;
  onSelect: () => void;
  onToggleStar: (id: string, e?: React.MouseEvent) => void;
  onEdit: (contact: ContactItem, e: React.MouseEvent) => void;
  onDelete: (id: string, name: string, e: React.MouseEvent) => void;
  onCopy: (text: string, key: string, e: React.MouseEvent) => void;
  getInitials: (name: string) => string;
}

const ContactCard: React.FC<ContactCardProps> = ({
  contact,
  isEditMode,
  copiedKey,
  onSelect,
  onToggleStar,
  onEdit,
  onDelete,
  onCopy,
  getInitials,
}) => {
  const primaryPhone = contact.phoneNumber || contact.phoneNumbers?.[0]?.value || null;
  const primaryEmail = contact.email || contact.emails?.[0]?.value || null;
  const extraCount =
    (contact.phoneNumbers && contact.phoneNumbers.length > 1 ? contact.phoneNumbers.length - 1 : 0) +
    (contact.emails && contact.emails.length > 1 ? contact.emails.length - 1 : 0) +
    (contact.notes ? 1 : 0) +
    (contact.birthday ? 1 : 0);

  return (
    <div
      onClick={onSelect}
      className="p-3.5 bg-surface border border-border hover:border-text/40 hover:bg-surface-hover/20 rounded-lg transition-all cursor-pointer group flex flex-col justify-between select-none"
    >
      <div>
        {/* Top row: Avatar + Name & Company + Actions */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <ContactAvatar
              src={contact.avatarUrl}
              name={contact.displayName}
              size="md"
              getInitials={getInitials}
            />

            {/* Name, Company & Job */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-semibold text-text truncate">
                  {contact.displayName}
                </span>
                {contact.company && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg border border-border text-text-muted truncate">
                    {contact.company}
                  </span>
                )}
              </div>
              {contact.jobTitle && (
                <p className="text-xs text-text-muted truncate mt-0.5 flex items-center gap-1">
                  <Briefcase className="w-3 h-3 text-text-muted shrink-0" />
                  {contact.jobTitle}
                </p>
              )}
            </div>
          </div>

          {/* Right Action Icons: Star & Edit/Delete */}
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {isEditMode ? (
              <>
                <button
                  onClick={(e) => onEdit(contact, e)}
                  title="Edit Contact"
                  className="p-1.5 bg-bg hover:bg-surface border border-border rounded-md text-text-muted hover:text-text transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => onDelete(contact.id, contact.displayName, e)}
                  title="Delete Contact"
                  className="p-1.5 bg-bg hover:bg-surface border border-border rounded-md text-text-muted hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button
                onClick={(e) => onToggleStar(contact.id, e)}
                title={contact.isStarred ? "Starred Contact" : "Star Contact"}
                className={`p-1.5 rounded-md transition-colors ${
                  contact.isStarred
                    ? "text-text hover:text-text/80"
                    : "text-text-muted hover:text-text"
                }`}
              >
                <Star className={`w-4 h-4 ${contact.isStarred ? "fill-current" : ""}`} />
              </button>
            )}
          </div>
        </div>

        {/* Primary Contact Chips (Phone & Email) */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {primaryPhone && (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-bg border border-border text-xs text-text font-mono group/chip">
              <Phone className="w-3 h-3 text-text-muted" />
              <a
                href={`tel:${primaryPhone}`}
                onClick={(e) => e.stopPropagation()}
                className="hover:underline"
              >
                {primaryPhone}
              </a>
              <button
                onClick={(e) => onCopy(primaryPhone, `phone-${contact.id}`, e)}
                title="Copy phone"
                className="text-text-muted hover:text-text ml-1"
              >
                {copiedKey === `phone-${contact.id}` ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          )}

          {primaryEmail && (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-bg border border-border text-xs text-text font-mono group/chip">
              <Mail className="w-3 h-3 text-text-muted" />
              <a
                href={`mailto:${primaryEmail}`}
                onClick={(e) => e.stopPropagation()}
                className="hover:underline truncate max-w-[180px]"
              >
                {primaryEmail}
              </a>
              <button
                onClick={(e) => onCopy(primaryEmail, `email-${contact.id}`, e)}
                title="Copy email"
                className="text-text-muted hover:text-text ml-1"
              >
                {copiedKey === `email-${contact.id}` ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          )}

          {contact.birthday && (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-bg border border-border text-[11px] text-text-muted font-mono">
              <Calendar className="w-3 h-3 text-text-muted" />
              {contact.birthday}
            </div>
          )}

          {extraCount > 0 && (
            <span className="text-[10px] font-mono text-text-muted px-1.5 py-0.5 rounded bg-bg/60 border border-border/60">
              +{extraCount} more
            </span>
          )}
        </div>
      </div>



    </div>
  );
};

export default ContactsPage;
