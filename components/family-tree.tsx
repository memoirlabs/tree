"use client";

import type { JSX, ReactNode } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { FamilyNodeCard } from "./node-card";
import { AddMemberDialog } from "./add-member-dialog";
import type {
  AddMemberPayload,
  FamilyMember,
  FamilyMemberStatus,
  FamilyTreeConnectorConfig,
  FamilyTreePresetName,
  FamilyTreeRenderNodeOptions,
  ProfileSearchResult,
  RelationType,
} from "../types";
import { getFamilyTreeConfig } from "../design-presets";
import { cn } from "../utils";

interface FamilyTreeProps {
  rootMember: FamilyMember;
  title?: string;
  showTitle?: boolean;
  className?: string;
  containerClassName?: string;
  titleClassName?: string;
  canEdit?: boolean;
  onAddMember?: (payload: AddMemberPayload) => Promise<void> | void;
  onNavigateProfile?: (member: FamilyMember, target: string) => void;
  searchProfiles?: (query: string) => Promise<ProfileSearchResult[]>;
  resolveAvatarUrl?: (url?: string | null) => string;
  designPreset?: FamilyTreePresetName;
  designOverrides?: Partial<FamilyTreeConnectorConfig>;
  relationOptions?: RelationType[] | ((member: FamilyMember, isRoot: boolean) => RelationType[]);
  renderNode?: (member: FamilyMember, options: FamilyTreeRenderNodeOptions) => ReactNode;
}

type RelativeRect = {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
};

type LineSegment = {
  id: string;
  d: string;
  stroke: string;
  strokeWidth: number;
};

const colorCache = new Map<string, string>();

const resolveColorFromClass = (className: string): string => {
  const token = className
    .split(" ")
    .find((value) => value.startsWith("bg-") || value.startsWith("text-") || value.startsWith("stroke-"));
  if (!token) return "currentColor";
  const cached = colorCache.get(token);
  if (cached) return cached;
  if (typeof window === "undefined") return "currentColor";
  const probe = document.createElement("div");
  probe.className = token;
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe);
  const color = token.startsWith("text-")
    ? computed.color
    : token.startsWith("stroke-")
      ? computed.stroke || computed.color
      : computed.backgroundColor;
  document.body.removeChild(probe);
  colorCache.set(token, color);
  return color;
};

const parseThicknessPx = (value: string): number => {
  const tokens = value.split(" ");
  for (const token of tokens) {
    if (token === "h-px" || token === "w-px") return 1;
    const bracketMatch = token.match(/(?:h|w)-\[(\d+(?:\.\d+)?)px\]/);
    if (bracketMatch) return Number(bracketMatch[1]);
    const numericMatch = token.match(/(?:h|w)-(\d+(?:\.\d+)?)/);
    if (numericMatch) return Number(numericMatch[1]);
  }
  return 1;
};

/**
 * Render a relationship-aware family tree with editable actions.
 */
export function FamilyTree({
  rootMember,
  title = "Family Tree",
  showTitle = true,
  className,
  containerClassName,
  titleClassName,
  canEdit = false,
  onAddMember,
  onNavigateProfile,
  searchProfiles,
  resolveAvatarUrl,
  designPreset = "default",
  designOverrides,
  relationOptions,
  renderNode,
}: FamilyTreeProps): JSX.Element {
  const connectorConfig = useMemo(
    () => getFamilyTreeConfig(designPreset, designOverrides),
    [designPreset, designOverrides],
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [lineSegments, setLineSegments] = useState<LineSegment[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const resolveLineStroke = useCallback(
    (lineStyle: FamilyTreeConnectorConfig["coupleLine"], status?: FamilyMemberStatus) => {
      const statusClass = status
        ? connectorConfig.statusColors[status] ?? connectorConfig.statusColors.default
        : connectorConfig.statusColors.default;
      const className = statusClass || lineStyle.colorClass;
      return resolveColorFromClass(className);
    },
    [connectorConfig.statusColors],
  );

  const resolveLineWidth = useCallback(
    (lineStyle: FamilyTreeConnectorConfig["coupleLine"]) => parseThicknessPx(lineStyle.thickness),
    [],
  );

  const computeLineSegments = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;
    const nodeElements = Array.from(container.querySelectorAll<HTMLElement>("[data-family-node-id]"));
    const rects = new Map<string, RelativeRect>();

    for (const element of nodeElements) {
      const nodeId = element.dataset.familyNodeId;
      if (!nodeId) continue;
      const rect = element.getBoundingClientRect();
      const left = rect.left - containerRect.left + scrollLeft;
      const top = rect.top - containerRect.top + scrollTop;
      rects.set(nodeId, {
        left,
        top,
        width: rect.width,
        height: rect.height,
        right: left + rect.width,
        bottom: top + rect.height,
      });
    }

    const nextCanvasSize = {
      width: container.scrollWidth,
      height: container.scrollHeight,
    };
    setCanvasSize((prev) =>
      prev.width === nextCanvasSize.width && prev.height === nextCanvasSize.height ? prev : nextCanvasSize,
    );

    const segments: LineSegment[] = [];
    const verticalGap = connectorConfig.anchors.verticalGapPx;
    const coupleInset = connectorConfig.anchors.coupleInsetPx;

    const topCenter = (rect: RelativeRect) => ({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });

    const sideInner = (rect: RelativeRect, side: "left" | "right") => ({
      x: side === "left" ? rect.left + coupleInset : rect.right - coupleInset,
      y: rect.top + rect.height / 2,
    });

    const unitStatus = (members: FamilyMember[]) => members.find((member) => member.status)?.status;

    const addLine = (
      id: string,
      d: string,
      lineStyle: FamilyTreeConnectorConfig["coupleLine"],
      status?: FamilyMemberStatus,
    ) => {
      segments.push({
        id,
        d,
        stroke: resolveLineStroke(lineStyle, status),
        strokeWidth: resolveLineWidth(lineStyle),
      });
    };

    const drawParentUnit = (
      unitId: string,
      parentMembers: FamilyMember[],
      childMembers: FamilyMember[],
    ) => {
      if (parentMembers.length === 0) return;
      const parentEntries = parentMembers
        .map((member) => {
          const rect = rects.get(member.id);
          return rect ? { member, rect } : null;
        })
        .filter(Boolean) as { member: FamilyMember; rect: RelativeRect }[];

      if (parentEntries.length === 0) return;

      const sortedParentEntries = [...parentEntries].sort((a, b) => a.rect.left - b.rect.left);

      let junction: { x: number; y: number } | null = null;

      if (sortedParentEntries.length > 1) {
        const leftParent = sortedParentEntries[0];
        const rightParent = sortedParentEntries[1];
        if (!leftParent || !rightParent) return;
        const leftAnchor = sideInner(leftParent.rect, "right");
        const rightAnchor = sideInner(rightParent.rect, "left");
        addLine(
          `${unitId}-couple`,
          `M ${leftAnchor.x} ${leftAnchor.y} L ${rightAnchor.x} ${rightAnchor.y}`,
          connectorConfig.coupleLine,
          unitStatus(parentMembers),
        );
        junction = {
          x: (leftAnchor.x + rightAnchor.x) / 2,
          y: leftAnchor.y,
        };
      } else {
        const parentEntry = sortedParentEntries[0];
        if (!parentEntry) return;
        const parentRect = parentEntry.rect;
        junction = {
          x: parentRect.left + parentRect.width / 2,
          y: parentRect.bottom,
        };
      }

      if (childMembers.length === 0 || !junction) return;

      const childEntries = childMembers
        .map((member) => {
          const rect = rects.get(member.id);
          return rect ? { member, rect, anchor: topCenter(rect) } : null;
        })
        .filter(Boolean) as { member: FamilyMember; rect: RelativeRect; anchor: { x: number; y: number } }[];

      if (childEntries.length === 0) return;

      const childXs = childEntries.map((entry) => entry.anchor.x);
      const childTopY = Math.min(...childEntries.map((entry) => entry.anchor.y));
      const barY = childTopY - verticalGap;
      const barLeft = Math.min(...childXs, junction.x);
      const barRight = Math.max(...childXs, junction.x);

      addLine(
        `${unitId}-trunk`,
        `M ${junction.x} ${junction.y} L ${junction.x} ${barY}`,
        connectorConfig.trunk,
        unitStatus(parentMembers),
      );
      addLine(
        `${unitId}-bar`,
        `M ${barLeft} ${barY} L ${barRight} ${barY}`,
        connectorConfig.siblingBus,
        unitStatus(parentMembers),
      );

      for (const entry of childEntries) {
        addLine(
          `${unitId}-drop-${entry.member.id}`,
          `M ${entry.anchor.x} ${barY} L ${entry.anchor.x} ${entry.anchor.y}`,
          connectorConfig.drop,
          entry.member.status,
        );
      }
    };

    const parents = rootMember.parents ?? [];
    if (parents.length > 0) {
      const parentChildren = [...(rootMember.siblings ?? []), rootMember];
      drawParentUnit("parents", parents, parentChildren);
    }

    const spouse = rootMember.spouse;
    const rootUnitParents = spouse ? [rootMember, spouse] : [rootMember];
    const children = rootMember.children ?? [];

    if (spouse) {
      drawParentUnit("root-couple", rootUnitParents, children);
    } else if (children.length > 0) {
      drawParentUnit("root-single", rootUnitParents, children);
    }

    setLineSegments(segments);
  }, [connectorConfig, resolveLineStroke, resolveLineWidth, rootMember]);

  useLayoutEffect(() => {
    computeLineSegments();
  }, [computeLineSegments]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    let frameId: number | null = null;
    const schedule = () => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        computeLineSegments();
      });
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(container);
    window.addEventListener("resize", schedule);
    container.addEventListener("scroll", schedule, { passive: true });
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      container.removeEventListener("scroll", schedule);
    };
  }, [computeLineSegments]);

  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    relation: RelationType;
    parentId: string;
  }>({
    isOpen: false,
    relation: "parent",
    parentId: rootMember.id,
  });

  useEffect(() => {
    setDialogState((prev: { isOpen: boolean; relation: RelationType; parentId: string }) =>
      prev.isOpen ? prev : { ...prev, parentId: rootMember.id },
    );
  }, [rootMember.id]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddMember = (relation: RelationType, parentId: string) => {
    if (!canEdit || !onAddMember) return;
    setDialogState({ isOpen: true, relation, parentId });
  };

  const handleAddConfirm = async (payload: AddMemberPayload) => {
    if (!onAddMember) return;
    setIsSubmitting(true);
    try {
      await onAddMember(payload);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resolveRelationOptions = useCallback(
    (member: FamilyMember, isRoot: boolean): RelationType[] => {
      if (typeof relationOptions === "function") {
        const resolved = relationOptions(member, isRoot);
        return resolved.length > 0 ? resolved : isRoot ? ["parent", "sibling", "spouse", "child"] : ["child"];
      }
      if (Array.isArray(relationOptions) && relationOptions.length > 0) {
        return relationOptions;
      }
      return isRoot ? ["parent", "sibling", "spouse", "child"] : ["child"];
    },
    [relationOptions],
  );

  const renderMemberNode = useCallback(
    (member: FamilyMember, isRoot: boolean) => {
      const options: FamilyTreeRenderNodeOptions = {
        isRoot,
        canEdit: Boolean(canEdit),
        onAddMember: handleAddMember,
        onNavigateProfile,
        resolveAvatarUrl,
        relationOptions: resolveRelationOptions(member, isRoot),
      };
      if (renderNode) {
        return renderNode(member, options);
      }
      return (
        <FamilyNodeCard
          member={member}
          onAddMember={handleAddMember}
          onNavigateProfile={onNavigateProfile}
          resolveAvatarUrl={resolveAvatarUrl}
          canEdit={canEdit}
          isRoot={isRoot}
          relationOptions={options.relationOptions}
        />
      );
    },
    [canEdit, handleAddMember, onNavigateProfile, renderNode, resolveAvatarUrl, resolveRelationOptions],
  );

  return (
    <div className={cn("min-h-screen bg-canvas-base", className)} data-family-tree>
      <div className={cn("surface-section--padded", containerClassName)}>
        {/* Header */}
        {showTitle ? (
          <div className="mb-12 text-center space-y-3">
            <h1 className={cn("type-display-lg text-copy-primary", titleClassName)}>{title}</h1>
          </div>
        ) : null}

        {/* Tree Visualization */}
        <div ref={containerRef} className="relative w-full">
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0"
            width={canvasSize.width}
            height={canvasSize.height}
            viewBox={canvasSize.width && canvasSize.height ? `0 0 ${canvasSize.width} ${canvasSize.height}` : "0 0 0 0"}
            fill="none"
          >
            {lineSegments.map((segment) => (
              <path
                key={segment.id}
                d={segment.d}
                stroke={segment.stroke}
                strokeWidth={segment.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </svg>

          <div className="relative flex flex-col items-center gap-12">
            {/* Parents Generation */}
            {rootMember.parents && rootMember.parents.length > 0 ? (
              <div className="flex gap-8 justify-center">
                {rootMember.parents.map((parent) => (
                  <div
                    key={parent.id}
                    data-family-node-id={parent.id}
                    data-family-role="parent"
                    className="relative animate-in fade-in slide-in-from-top-4 duration-500"
                  >
                    {renderMemberNode(parent, false)}
                  </div>
                ))}
              </div>
            ) : null}

            {/* Current Generation (Root + Siblings + Spouse) */}
            <div className="flex items-center justify-center gap-8">
              <div className="relative inline-flex items-center gap-8">
                {/* Left siblings */}
                {(() => {
                  const leftSiblings = rootMember.siblings?.slice(0, Math.ceil((rootMember.siblings?.length || 0) / 2)) || [];
                  return leftSiblings.map((sibling) => (
                    <div
                      key={sibling.id}
                      data-family-node-id={sibling.id}
                      data-family-role="sibling"
                  className="relative animate-in fade-in slide-in-from-left-4 duration-500"
                >
                      {renderMemberNode(sibling, false)}
                    </div>
                  ));
                })()}

                {/* Root Member */}
                <div
                  data-family-node-id={rootMember.id}
                  data-family-role="root"
                  className="relative animate-in fade-in zoom-in-95 duration-500"
                >
                  {renderMemberNode(rootMember, true)}
                </div>

                {/* Spouse */}
                {rootMember.spouse ? (
                  <div
                    data-family-node-id={rootMember.spouse.id}
                    data-family-role="spouse"
                    className="relative animate-in fade-in slide-in-from-right-4 duration-500"
                  >
                    {renderMemberNode(rootMember.spouse, false)}
                  </div>
                ) : null}

                {/* Right siblings */}
                {(() => {
                  const leftCount = Math.ceil((rootMember.siblings?.length || 0) / 2);
                  const rightSiblings = rootMember.siblings?.slice(leftCount) || [];
                  return rightSiblings.map((sibling) => (
                    <div
                      key={sibling.id}
                      data-family-node-id={sibling.id}
                    data-family-role="sibling"
                    className="relative animate-in fade-in slide-in-from-right-4 duration-500"
                  >
                      {renderMemberNode(sibling, false)}
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Children Generation */}
            {rootMember.children && rootMember.children.length > 0 ? (
              <div className="flex gap-8 justify-center">
                {rootMember.children.map((child) => (
                  <div
                    key={child.id}
                    data-family-node-id={child.id}
                    data-family-role="child"
                    className="relative animate-in fade-in slide-in-from-bottom-4 duration-500"
                  >
                    {renderMemberNode(child, false)}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Add Member Dialog */}
        {canEdit && onAddMember ? (
          <AddMemberDialog
            isOpen={dialogState.isOpen}
            onClose={() => setDialogState({ ...dialogState, isOpen: false })}
            onAdd={handleAddConfirm}
            relation={dialogState.relation}
            parentId={dialogState.parentId}
            searchProfiles={searchProfiles}
            resolveAvatarUrl={resolveAvatarUrl}
          />
        ) : null}

        {/* Loading overlay */}
        {isSubmitting ? (
          <div className="fixed inset-0 flex items-center justify-center bg-fg/20 backdrop-blur-sm">
            <div className="bg-bg rounded-2xl p-6 shadow-xl">
              <p className="text-copy-primary font-medium">Creating relationship...</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
