"use client";

import type { JSX, KeyboardEvent } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../utils";
import type { FamilyMember, FamilyTreeCardConfig, FamilyTreeCardField, RelationType } from "../types";

export interface FamilyNodeCardProps {
  member: FamilyMember;
  onAddMember: (relation: RelationType, parentId: string) => void;
  onNavigateProfile?: (member: FamilyMember, target: string) => void;
  isRoot?: boolean;
  canEdit?: boolean;
  relationOptions?: RelationType[];
  cardConfig?: FamilyTreeCardConfig;
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

const defaultCardFields: FamilyTreeCardField[] = ["name"];

/**
 * Display a single family member with relationship actions.
 */
export function FamilyNodeCard({
  member,
  onAddMember,
  onNavigateProfile,
  isRoot,
  canEdit = true,
  relationOptions,
  cardConfig,
}: FamilyNodeCardProps): JSX.Element {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ left: number; top: number } | null>(null);

  const resolvedRelationOptions: RelationType[] =
    relationOptions && relationOptions.length > 0
      ? relationOptions
      : isRoot
        ? ["parent", "sibling", "spouse", "child"]
        : ["child"];
  const profileTarget = (member.profileSlug?.trim() || member.profileId || "").toString().trim();
  const canNavigate = Boolean(profileTarget) && Boolean(onNavigateProfile);
  const fields = cardConfig?.fields && cardConfig.fields.length > 0 ? cardConfig.fields : defaultCardFields;
  const showRootLabel = cardConfig?.showRootLabel ?? true;
  const rootLabel = cardConfig?.rootLabel ?? "You";
  const statusLabels = {
    linked: "Linked",
    invite_pending: "Invite sent",
    manual: "Manual",
    ...cardConfig?.statusLabels,
  };
  const showField = (field: FamilyTreeCardField) => fields.includes(field);

  useLayoutEffect(() => {
    if (!isMenuOpen) {
      setMenuPosition(null);
      return undefined;
    }

    const updateMenuPosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuPosition({
        left: rect.left + rect.width / 2,
        top: rect.bottom + 6,
      });
    };

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isMenuOpen]);

  const handleSelectRelation = (relation: RelationType) => {
    onAddMember(relation, member.id);
    setIsMenuOpen(false);
  };

  const handleCardClick = () => {
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

  return (
    <div
      data-family-card
      className={cn(
        "relative box-border min-w-32 p-2",
        canNavigate ? "cursor-pointer" : undefined,
        cardConfig?.className,
        cardConfig?.widthClassName,
        cardConfig?.heightClassName,
      )}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role={canNavigate ? "button" : undefined}
      style={{ position: "relative" }}
      tabIndex={canNavigate ? 0 : -1}
    >
      <div>
        {showField("name") ? <div>{member.name}</div> : null}
        {showField("birthday") && member.birthday ? <div>{member.birthday}</div> : null}
        {showField("relation") && member.relation && !isRoot ? <div>{relationLabels[member.relation]}</div> : null}
        {showField("relation") && isRoot && showRootLabel ? <div>{rootLabel}</div> : null}
        {showField("status") && member.status ? <div>{statusLabels[member.status]}</div> : null}
      </div>

      {canEdit ? (
        <div data-family-card-actions>
          <button
            ref={triggerRef}
            type="button"
            aria-expanded={isMenuOpen}
            onClick={(event) => {
              event.stopPropagation();
              setIsMenuOpen((prev) => !prev);
            }}
          >
            Add
          </button>
          {isMenuOpen && menuPosition && typeof document !== "undefined"
            ? createPortal(
                <div
                  data-family-action-menu
                  style={{
                    position: "fixed",
                    top: menuPosition.top,
                    left: menuPosition.left,
                    display: "grid",
                    gap: 4,
                    minWidth: 160,
                    padding: 6,
                    background: "#fff",
                    border: "1px solid currentColor",
                    boxShadow: "4px 4px 0 currentColor",
                    transform: "translateX(-50%)",
                    zIndex: 1000,
                  }}
                >
                  {resolvedRelationOptions.map((relation) => (
                    <button
                      key={relation}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleSelectRelation(relation);
                      }}
                    >
                      {relationLabels[relation]}
                    </button>
                  ))}
                </div>,
              document.body,
            )
            : null}
        </div>
      ) : null}
    </div>
  );
}
