"use client";

import type React from "react";
import { useEffect, useState } from "react";

import type { RelationType, ProfileSearchResult, AddMemberPayload } from "../types";

interface AddMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (payload: AddMemberPayload) => Promise<void> | void;
  relation: RelationType;
  parentId?: string;
  searchProfiles?: (query: string) => Promise<ProfileSearchResult[]>;
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

const relationLabels: Record<RelationType, string> = {
  parent: "Parent",
  child: "Child",
  sibling: "Sibling",
  spouse: "Spouse",
  former_spouse: "Former spouse",
  grandparent: "Grandparent",
  grandchild: "Grandchild",
  manager: "Manager",
  direct_report: "Direct report",
  peer: "Peer",
  ceo: "CEO",
  assistant: "Assistant",
};

/**
 * Modal dialog for adding or inviting a new family member.
 */
export function AddMemberDialog({
  isOpen,
  onClose,
  onAdd,
  relation,
  parentId,
  searchProfiles,
}: AddMemberDialogProps): React.JSX.Element | null {
  const searchEnabled = Boolean(searchProfiles);
  const [mode, setMode] = useState<"search" | "manual" | "invite">(searchEnabled ? "search" : "manual");
  const [searchQuery, setSearchQuery] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualBirthday, setManualBirthday] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<ProfileSearchResult | null>(null);
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ProfileSearchResult[]>([]);

  const debouncedQuery = useDebouncedValue(searchQuery.trim(), 200);

  useEffect(() => {
    if (!searchEnabled && mode === "search") {
      setMode("manual");
    }
  }, [searchEnabled, mode]);

  useEffect(() => {
    if (!searchProfiles || !debouncedQuery) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let active = true;
    setIsSearching(true);
    searchProfiles(debouncedQuery)
      .then((results) => {
        if (!active) return;
        setSearchResults(Array.isArray(results) ? results : []);
      })
      .catch(() => {
        if (!active) return;
        setSearchResults([]);
      })
      .finally(() => {
        if (!active) return;
        setIsSearching(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedQuery, searchProfiles]);

  const suggestions = searchResults;

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setMode(searchEnabled ? "search" : "manual");
      setSearchQuery("");
      setManualName("");
      setManualBirthday("");
      setSelectedProfile(null);
      setInviteFirstName("");
      setInviteLastName("");
      setInviteEmail("");
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [isOpen, searchEnabled]);

  const handleSelectProfile = (profile: ProfileSearchResult) => {
    setSelectedProfile(profile);
    setSearchQuery("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "search" && selectedProfile) {
        await onAdd({
          relation,
          parentId,
          type: "existing",
          name: selectedProfile.displayName,
          profileId: selectedProfile.profileId,
          avatarUrl: selectedProfile.avatarUrl ?? undefined,
        });
      } else if (mode === "manual" && manualName.trim()) {
        await onAdd({
          relation,
          parentId,
          type: "manual",
          name: manualName.trim(),
          birthday: manualBirthday.trim() || undefined,
        });
      } else if (mode === "invite" && inviteFirstName.trim() && inviteEmail.trim()) {
        await onAdd({
          relation,
          parentId,
          type: "invite",
          firstName: inviteFirstName.trim(),
          lastName: inviteLastName.trim() || undefined,
          email: inviteEmail.trim(),
        });
      }

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    (mode === "search" && Boolean(selectedProfile)) ||
    (mode === "manual" && Boolean(manualName.trim())) ||
    (mode === "invite" && Boolean(inviteFirstName.trim()) && Boolean(inviteEmail.trim()));

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-(--z-modal) flex items-center justify-center"
      data-add-member-overlay
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-fg/40 backdrop-blur-sm"
        data-add-member-backdrop
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className="relative w-full max-w-md mx-4 bg-bg rounded-3xl shadow-2xl border border-stroke-default overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        data-add-member-panel
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-stroke-muted">
            <h2 className="type-heading-md text-copy-primary">
              Add {relationLabels[relation]}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-canvas-muted transition-colors"
            >
              Close
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            {/* Mode Toggle */}
            <div className="flex gap-2 p-1 bg-canvas-base rounded-full">
              {searchEnabled ? (
                <button
                  type="button"
                  onClick={() => {
                    setMode("search");
                    setSelectedProfile(null);
                  }}
                  className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all ${
                    mode === "search"
                      ? "bg-bg text-copy-primary shadow-sm"
                      : "text-copy-muted hover:text-copy-secondary"
                  }`}
                >
                  Search Users
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setMode("manual");
                  setSelectedProfile(null);
                }}
                className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all ${
                  mode === "manual"
                    ? "bg-bg text-copy-primary shadow-sm"
                    : "text-copy-muted hover:text-copy-secondary"
                }`}
              >
                Add Manually
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("invite");
                  setSelectedProfile(null);
                }}
                className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all ${
                  mode === "invite"
                    ? "bg-bg text-copy-primary shadow-sm"
                    : "text-copy-muted hover:text-copy-secondary"
                }`}
              >
                Invite via Email
              </button>
            </div>

            {mode === "search" ? (
              <div className="space-y-4">
                {/* Selected Profile Display */}
                {selectedProfile ? (
                  <div className="flex items-center gap-3 p-4 bg-canvas-base rounded-2xl border border-stroke-muted">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-copy-primary truncate">
                        {selectedProfile.displayName}
                      </p>
                      <p className="text-sm text-copy-muted">
                        Will be added as {relationLabels[relation].toLowerCase()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedProfile(null)}
                      className="p-2 rounded-full hover:bg-canvas-muted transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Search Input */}
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search for a user..."
                        className="w-full px-4 py-3 rounded-full border border-stroke-default bg-bg text-copy-primary placeholder:text-copy-disabled focus:outline-none focus:border-copy-primary focus:ring-2 focus:ring-copy-primary/10 transition-all"
                        autoFocus
                      />
                    </div>

                    {/* Search Results */}
                    {searchQuery.trim() ? (
                      <div className="max-h-64 overflow-y-auto rounded-2xl border border-stroke-muted bg-bg divide-y divide-stroke-muted">
                        {isSearching ? (
                          <div className="p-4 text-center text-copy-muted">Searching...</div>
                        ) : suggestions.length === 0 ? (
                          <div className="p-4 text-center text-copy-muted">
                            {debouncedQuery
                              ? "No users found"
                              : "Start typing to search..."}
                          </div>
                        ) : (
                          suggestions.map((profile) => (
                            <button
                              key={profile.profileId}
                              type="button"
                              onClick={() => handleSelectProfile(profile)}
                              className="group flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-canvas-muted transition-colors"
                            >
                              <span className="flex-1 truncate font-medium text-copy-primary">
                                {profile.displayName}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    ) : null}

                    {/* Hint to switch to manual */}
                    <p className="text-center text-sm text-copy-muted">
                      Can&apos;t find them?{" "}
                      <button
                        type="button"
                        onClick={() => setMode("manual")}
                        className="text-copy-primary font-medium hover:underline"
                      >
                        Add manually
                      </button>
                    </p>
                  </>
                )}
              </div>
            ) : mode === "manual" ? (
              <div className="space-y-4">
                {/* Manual Name Input */}
                <div className="space-y-2">
                  <label
                    htmlFor="manual-name"
                    className="block text-sm font-medium text-copy-secondary"
                  >
                    Name
                  </label>
                  <input
                    id="manual-name"
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="Enter their name"
                    className="w-full px-4 py-3 rounded-xl border border-stroke-default bg-bg text-copy-primary placeholder:text-copy-disabled focus:outline-none focus:border-copy-primary focus:ring-2 focus:ring-copy-primary/10 transition-all"
                    autoFocus
                  />
                </div>

                {/* Manual Birthday Input */}
                <div className="space-y-2">
                  <label
                    htmlFor="manual-birthday"
                    className="block text-sm font-medium text-copy-secondary"
                  >
                    Birthday{" "}
                    <span className="text-copy-muted font-normal">(optional)</span>
                  </label>
                  <input
                    id="manual-birthday"
                    type="text"
                    value={manualBirthday}
                    onChange={(e) => setManualBirthday(e.target.value)}
                    placeholder="e.g., 1965 or 1965-03-12"
                    className="w-full px-4 py-3 rounded-xl border border-stroke-default bg-bg text-copy-primary placeholder:text-copy-disabled focus:outline-none focus:border-copy-primary focus:ring-2 focus:ring-copy-primary/10 transition-all"
                  />
                </div>

                <p className="text-sm text-copy-muted">
                  They can claim this profile later when they join your app.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-copy-secondary">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={inviteFirstName}
                    onChange={(e) => setInviteFirstName(e.target.value)}
                    placeholder="Enter first name"
                    className="w-full px-4 py-3 rounded-xl border border-stroke-default bg-bg text-copy-primary placeholder:text-copy-disabled focus:outline-none focus:border-copy-primary focus:ring-2 focus:ring-copy-primary/10 transition-all"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-copy-secondary">
                    Last Name <span className="text-copy-muted font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={inviteLastName}
                    onChange={(e) => setInviteLastName(e.target.value)}
                    placeholder="Enter last name"
                    className="w-full px-4 py-3 rounded-xl border border-stroke-default bg-bg text-copy-primary placeholder:text-copy-disabled focus:outline-none focus:border-copy-primary focus:ring-2 focus:ring-copy-primary/10 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-copy-secondary">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="example@email.com"
                      className="w-full px-4 py-3 rounded-full border border-stroke-default bg-bg text-copy-primary placeholder:text-copy-disabled focus:outline-none focus:border-copy-primary focus:ring-2 focus:ring-copy-primary/10 transition-all"
                    />
                  </div>
                </div>
                <p className="text-sm text-copy-muted">
                  We'll email them an invite so they can claim their spot on your tree.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 border-t border-stroke-muted bg-canvas-base">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-full border border-stroke-default bg-bg text-copy-secondary font-medium hover:bg-canvas-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="flex-1 py-3 px-4 rounded-full bg-copy-primary text-bg font-medium hover:bg-copy-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? "Adding..." : `Add ${relationLabels[relation]}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
