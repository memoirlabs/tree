"use client";

import type { JSX, KeyboardEvent, MouseEvent, RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Mail, Plus, User } from "lucide-react";
import { cn, getInitials } from "../utils";
import type { FamilyMember, RelationType } from "../types";

interface FamilyNodeCardProps {
  member: FamilyMember;
  onAddMember: (relation: RelationType, parentId: string) => void;
  onNavigateProfile?: (member: FamilyMember, target: string) => void;
  resolveAvatarUrl?: (url?: string | null) => string;
  isRoot?: boolean;
  canEdit?: boolean;
  relationOptions?: RelationType[];
}

const relationLabels: Record<RelationType, string> = {
  parent: "Parent",
  child: "Child",
  sibling: "Sibling",
  spouse: "Spouse",
  grandparent: "Grandparent",
  grandchild: "Grandchild",
};

const avatarLg = {
  size: 56,
  className: "h-14 w-14",
};

/**
 * Display a single family member with relationship actions.
 */
export function FamilyNodeCard({
  member,
  onAddMember,
  onNavigateProfile,
  resolveAvatarUrl,
  isRoot,
  canEdit = true,
  relationOptions,
}: FamilyNodeCardProps): JSX.Element {
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  const resolvedRelationOptions: RelationType[] =
    relationOptions && relationOptions.length > 0
      ? relationOptions
      : isRoot
        ? ["parent", "sibling", "spouse", "child"]
        : ["child"];
  const showOverlay = canEdit && (isHovered || isMenuOpen);
  const profileTarget = (member.profileSlug?.trim() || member.profileId || "").toString().trim();
  const canNavigate = Boolean(profileTarget) && Boolean(onNavigateProfile);

  const avatarUrl = resolveAvatarUrl ? resolveAvatarUrl(member.avatarUrl ?? undefined) : member.avatarUrl || "";
  const hasAvatar = Boolean(avatarUrl);

  const handleSelectRelation = (relation: RelationType) => {
    onAddMember(relation, member.id);
    setIsMenuOpen(false);
  };

  const stopCardNavigation = (event: MouseEvent) => {
    event.stopPropagation();
  };

  const handleCardClick = (_event: MouseEvent<HTMLDivElement>) => {
    if (!canNavigate || !onNavigateProfile) return;
    onNavigateProfile(member, profileTarget);
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!canNavigate || !onNavigateProfile) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onNavigateProfile(member, profileTarget);
    }
  };

  const positionMenu = () => {
    const button = menuButtonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    setMenuCoords({
      top: rect.bottom + 8,
      left: rect.left + rect.width / 2,
    });
  };

  useEffect(() => {
    if (!isMenuOpen) return;
    positionMenu();
    const scrollListenerOptions: AddEventListenerOptions = { passive: true, capture: true };
    const handleResize = () => positionMenu();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, scrollListenerOptions);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, scrollListenerOptions);
    };
  }, [isMenuOpen]);

  return (
    <div
      data-family-card
      className={cn(
        "group relative flex flex-col transition-all duration-200",
        "w-[150px] h-[190px]",
        isRoot ? "border border-copy-primary" : "border border-stroke-default",
        "bg-bg rounded-2xl",
        isHovered && !isRoot ? "-translate-y-1 shadow-lg" : isRoot ? "shadow-md" : "shadow-sm",
        canNavigate ? "cursor-pointer" : "",
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsMenuOpen(false);
      }}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role={canNavigate ? "button" : undefined}
      tabIndex={canNavigate ? 0 : -1}
    >
      <div className="relative h-full w-full overflow-hidden rounded-2xl">
        <div className="p-3.5 flex-1 flex flex-col items-center justify-center text-center gap-3">
          {/* Avatar */}
          <div
            className={cn(
              "relative flex items-center justify-center overflow-hidden transition-colors duration-300",
              isRoot ? "bg-copy-primary text-bg" : "bg-canvas-base border border-stroke-muted",
              avatarLg.className,
              "rounded-full",
            )}
          >
            {hasAvatar ? (
              <img
                src={avatarUrl}
                alt={member.name}
                width={avatarLg.size}
                height={avatarLg.size}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-copy-primary">
                {getInitials(member.name) || <User className="h-7 w-7" />}
              </span>
            )}
          </div>

          {/* Name & Info */}
          <div className="w-full space-y-1">
            <p className="font-semibold text-base truncate text-copy-primary">{member.name}</p>
            {member.birthday ? (
              <p className="text-sm text-copy-muted">Born {member.birthday}</p>
            ) : null}
            {member.relation && !isRoot ? (
              <p className="type-caption text-copy-disabled uppercase tracking-wider">
                {relationLabels[member.relation] || member.relation}
              </p>
            ) : null}
            {isRoot ? (
              <p className="type-caption text-copy-disabled uppercase tracking-wider">You</p>
            ) : null}
            {member.status === "linked" ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-canvas-base rounded-full text-xs text-copy-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Linked
              </span>
            ) : null}
            {member.status === "invite_pending" ? (
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-50 border border-yellow-200 rounded-full text-xs font-medium text-yellow-800">
                <Mail className="w-3 h-3" />
                Invite sent
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Hover Actions Overlay */}
      {canEdit ? (
        <>
          <div
            className={cn(
              "pointer-events-none absolute inset-0 rounded-2xl overflow-hidden transition-opacity duration-200",
              showOverlay ? "opacity-100" : "opacity-0",
            )}
          >
            <div className="absolute inset-0 bg-bg/70 backdrop-blur-[2px]" />
          </div>
          {showOverlay ? (
            <RelationMenu
              isOpen={isMenuOpen}
              onToggle={(event) => {
                stopCardNavigation(event);
                setIsMenuOpen((prev) => !prev);
                if (!isMenuOpen) positionMenu();
              }}
              onSelect={(relation, event) => {
                stopCardNavigation(event);
                handleSelectRelation(relation);
              }}
              relationOptions={resolvedRelationOptions}
              menuCoords={menuCoords}
              menuButtonRef={menuButtonRef}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

interface RelationMenuProps {
  isOpen: boolean;
  onToggle: (event: MouseEvent<HTMLButtonElement>) => void;
  onSelect: (relation: RelationType, event: MouseEvent<HTMLButtonElement>) => void;
  relationOptions: RelationType[];
  menuCoords: { top: number; left: number } | null;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
}

function RelationMenu({
  isOpen,
  onToggle,
  onSelect,
  relationOptions,
  menuCoords,
  menuButtonRef,
}: RelationMenuProps) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
      <div className="relative">
        <button
          ref={menuButtonRef}
          type="button"
          onClick={onToggle}
          className="inline-flex items-center rounded-full border border-stroke-default bg-bg p-2.5 text-sm font-medium text-copy-primary shadow-sm hover:bg-canvas-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-copy-primary"
          aria-label="Add family member"
          title="Add family member"
          data-tour-id="family-add-trigger"
        >
          <Plus className="w-4 h-4" />
          <span className="sr-only">Add family member</span>
        </button>
        {isOpen && menuCoords ? createPortal(
            <div
              className="fixed w-44 -translate-x-1/2 overflow-hidden rounded-xl border border-stroke-default bg-bg shadow-lg z-(--z-popover)"
              style={{ top: menuCoords.top, left: menuCoords.left }}
            >
              {relationOptions.map((relation) => (
                <button
                  key={relation}
                  type="button"
                  onClick={(event) => onSelect(relation, event)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-copy-secondary hover:bg-canvas-muted"
                >
                  <Plus className="w-4 h-4" />
                  {relationLabels[relation]}
                </button>
              ))}
            </div>,
            document.body,
          ) : null}
      </div>
    </div>
  );
}
