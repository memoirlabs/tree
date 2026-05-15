"use client";

import type { JSX, ReactNode } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { FamilyNodeCard } from "./node-card";
import { AddMemberDialog } from "./add-member-dialog";
import { buildFamilyMemberFromRelationshipRows } from "../adapters";
import type {
  AddMemberPayload,
  FamilyTreeCardConfig,
  FamilyMember,
  FamilyMemberStatus,
  FamilyTreeConnectorConfig,
  FamilyTreeConnectorOverrides,
  FamilyTreePresetName,
  FamilyTreeRenderNodeOptions,
  ProfileSearchResult,
  RelationType,
} from "../types";
import type { RelationshipTableRow } from "../adapters";
import type { FamilyTreeSchema } from "../schema";
import { parseFamilyTreeYaml, resolveFamilyTreeSchema } from "../schema";
import { buildFamilyTreeLayout } from "../layout";

export interface FamilyTreeProps {
  rootMember?: FamilyMember;
  relationshipRows?: RelationshipTableRow[];
  rootId?: string;
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
  designOverrides?: FamilyTreeConnectorOverrides;
  schema?: FamilyTreeSchema;
  schemaYaml?: string;
  cardConfig?: FamilyTreeCardConfig;
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

const defaultRootRelationOptions: RelationType[] = ["parent", "sibling", "spouse", "child"];
const defaultMemberRelationOptions: RelationType[] = ["child"];

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
  const resolvedColor = !color || color === "rgba(0, 0, 0, 0)" || color === "transparent" ? "currentColor" : color;
  colorCache.set(token, resolvedColor);
  return resolvedColor;
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
  relationshipRows,
  rootId,
  title,
  showTitle,
  className,
  containerClassName,
  titleClassName,
  canEdit,
  onAddMember,
  onNavigateProfile,
  searchProfiles,
  resolveAvatarUrl,
  designPreset,
  designOverrides,
  schema,
  schemaYaml,
  cardConfig,
  relationOptions,
  renderNode,
}: FamilyTreeProps): JSX.Element {
  const resolvedRootMember = useMemo(
    () => rootMember ?? (relationshipRows ? buildFamilyMemberFromRelationshipRows(relationshipRows, rootId) : null),
    [relationshipRows, rootId, rootMember],
  );
  if (!resolvedRootMember) {
    throw new Error("FamilyTree requires either rootMember or relationshipRows with a resolvable root.");
  }

  const parsedSchema = useMemo(
    () => (schemaYaml !== undefined ? parseFamilyTreeYaml(schemaYaml) : schema),
    [schema, schemaYaml],
  );
  const resolvedSchema = useMemo(
    () =>
      resolveFamilyTreeSchema(parsedSchema, {
        title,
        showTitle,
        canEdit,
        designPreset,
        designOverrides,
        cardConfig,
      }),
    [cardConfig, canEdit, designOverrides, designPreset, parsedSchema, showTitle, title],
  );
  const connectorConfig = resolvedSchema.connectorConfig;
  const layoutModel = useMemo(
    () => buildFamilyTreeLayout(resolvedRootMember, resolvedSchema.layout),
    [resolvedRootMember, resolvedSchema.layout.density, resolvedSchema.layout.strategy],
  );
  const horizontalGap = resolvedSchema.layout.density === "compact" ? 24 : 32;
  const verticalGap = resolvedSchema.layout.density === "compact" ? 32 : 48;

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

    const parents = resolvedRootMember.parents ?? [];
    if (parents.length > 0) {
      const parentChildren = [...(resolvedRootMember.siblings ?? []), resolvedRootMember];
      drawParentUnit("parents", parents, parentChildren);
    }

    const spouse = resolvedRootMember.spouse;
    const rootUnitParents = spouse ? [resolvedRootMember, spouse] : [resolvedRootMember];
    const children = resolvedRootMember.children ?? [];

    if (spouse) {
      drawParentUnit("root-couple", rootUnitParents, children);
    } else if (children.length > 0) {
      drawParentUnit("root-single", rootUnitParents, children);
    }

    setLineSegments(segments);
  }, [connectorConfig, resolveLineStroke, resolveLineWidth, resolvedRootMember]);

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
    parentId: resolvedRootMember.id,
  });

  useEffect(() => {
    setDialogState((prev: { isOpen: boolean; relation: RelationType; parentId: string }) =>
      prev.isOpen ? prev : { ...prev, parentId: resolvedRootMember.id },
    );
  }, [resolvedRootMember.id]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddMember = (relation: RelationType, parentId: string) => {
    if (!resolvedSchema.canEdit || !onAddMember) return;
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
        return resolved.length > 0 ? resolved : isRoot ? defaultRootRelationOptions : defaultMemberRelationOptions;
      }
      if (Array.isArray(relationOptions) && relationOptions.length > 0) {
        return relationOptions;
      }
      if (isRoot && resolvedSchema.rootRelations && resolvedSchema.rootRelations.length > 0) {
        return resolvedSchema.rootRelations;
      }
      if (!isRoot && resolvedSchema.memberRelations && resolvedSchema.memberRelations.length > 0) {
        return resolvedSchema.memberRelations;
      }
      return isRoot ? defaultRootRelationOptions : defaultMemberRelationOptions;
    },
    [relationOptions, resolvedSchema.memberRelations, resolvedSchema.rootRelations],
  );

  const renderMemberNode = useCallback(
    (member: FamilyMember, isRoot: boolean) => {
      const options: FamilyTreeRenderNodeOptions = {
        isRoot,
        canEdit: resolvedSchema.canEdit,
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
          canEdit={resolvedSchema.canEdit}
          isRoot={isRoot}
          relationOptions={options.relationOptions}
          cardConfig={resolvedSchema.cardConfig}
        />
      );
    },
    [
      handleAddMember,
      onNavigateProfile,
      renderNode,
      resolvedSchema.canEdit,
      resolvedSchema.cardConfig,
      resolveAvatarUrl,
      resolveRelationOptions,
    ],
  );

  return (
    <div className={className} data-family-tree>
      <div className={containerClassName}>
        {/* Header */}
        {resolvedSchema.showTitle ? (
          <div style={{ marginBottom: verticalGap, textAlign: "center" }}>
            <h1 className={titleClassName}>{resolvedSchema.title}</h1>
          </div>
        ) : null}

        {/* Tree Visualization */}
        <div ref={containerRef} style={{ position: "relative", width: "100%", overflow: "auto" }}>
          <svg
            aria-hidden="true"
            width={canvasSize.width}
            height={canvasSize.height}
            viewBox={canvasSize.width && canvasSize.height ? `0 0 ${canvasSize.width} ${canvasSize.height}` : "0 0 0 0"}
            fill="none"
            style={{
              pointerEvents: "none",
              position: "absolute",
              left: 0,
              top: 0,
              overflow: "visible",
            }}
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

          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: verticalGap,
            }}
          >
            {layoutModel.rows.map((row) => {
              const rowContent = row.items.map((item) => (
                <div
                  key={item.member.id}
                  data-family-node-id={item.member.id}
                  data-family-role={item.role}
                  className={item.className}
                >
                  {renderMemberNode(item.member, item.isRoot)}
                </div>
              ));
              return (
                <div
                  key={row.id}
                  className={row.className}
                  style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: horizontalGap }}
                >
                  {row.innerClassName ? (
                    <div
                      className={row.innerClassName}
                      style={{ display: "inline-flex", alignItems: "center", gap: horizontalGap }}
                    >
                      {rowContent}
                    </div>
                  ) : (
                    rowContent
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Add Member Dialog */}
        {resolvedSchema.canEdit && onAddMember ? (
          <AddMemberDialog
            isOpen={dialogState.isOpen}
            onClose={() => setDialogState({ ...dialogState, isOpen: false })}
            onAdd={handleAddConfirm}
            relation={dialogState.relation}
            parentId={dialogState.parentId}
            searchProfiles={searchProfiles}
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
