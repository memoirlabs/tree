"use client";

import type { CSSProperties, JSX } from "react";

import { TreeCanvas, TreeEdges, TreeNodeLayer, TreeProvider } from "./FamilyTreePrimitives";
import type { FamilyCardProps, FamilyTreeProps, PersonId } from "./types";

export type StyledFamilyCardRadius = CSSProperties["borderRadius"] | "square" | "soft" | "round" | "pill";
export type StyledFamilyCardShadow = CSSProperties["boxShadow"] | "none" | "flat" | "soft";
export type StyledFamilyCardAvatar = "auto" | "hidden" | "square" | "soft" | "round";

export interface StyledFamilyCardProps<Person> extends FamilyCardProps<Person> {
  avatar?: StyledFamilyCardAvatar;
  outlined?: boolean;
  radius?: StyledFamilyCardRadius;
  shadow?: StyledFamilyCardShadow;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const defaultCardStyle: CSSProperties = {
  display: "grid",
  gap: "var(--tree-card-gap, 6px)",
  justifyItems: "center",
  minWidth: 124,
  padding: "var(--tree-card-padding, 10px 12px)",
  border: "var(--tree-outline-width, 1px) solid var(--tree-card-border, currentColor)",
  borderRadius: "var(--tree-card-radius, 0)",
  background: "var(--tree-card-bg, Canvas)",
  boxShadow: "var(--tree-card-shadow, none)",
  color: "var(--tree-card-fg, inherit)",
  textAlign: "center",
};

const defaultAvatarStyle: CSSProperties = {
  width: 36,
  height: 36,
  border: "var(--tree-outline-width, 1px) solid var(--tree-card-border, currentColor)",
  borderRadius: "var(--tree-profile-radius, 0)",
  background: "var(--tree-profile-bg, transparent)",
  objectFit: "cover",
};

const defaultNameStyle: CSSProperties = {
  display: "block",
  fontSize: "0.98rem",
  lineHeight: 1.1,
};

const defaultRelationStyle: CSSProperties = {
  display: "block",
  color: "var(--tree-muted-fg, currentColor)",
  fontSize: "0.8rem",
  lineHeight: 1.2,
};

function resolveCardRadius(radius: StyledFamilyCardRadius | undefined): CSSProperties["borderRadius"] | undefined {
  if (radius === "square") return 0;
  if (radius === "soft") return 8;
  if (radius === "round") return 16;
  if (radius === "pill") return 999;
  return radius;
}

function resolveCardShadow(shadow: StyledFamilyCardShadow | undefined): CSSProperties["boxShadow"] | undefined {
  if (shadow === "none") return "none";
  if (shadow === "flat") return "var(--tree-card-shadow, 4px 4px 0 #030201)";
  if (shadow === "soft") return "0 12px 32px color-mix(in srgb, var(--tree-card-border, #030201) 16%, transparent)";
  return shadow;
}

function resolveAvatarRadius(avatar: StyledFamilyCardAvatar | undefined): CSSProperties["borderRadius"] | undefined {
  if (avatar === "square") return 0;
  if (avatar === "soft") return 8;
  if (avatar === "round" || avatar === "auto") return 999;
  return undefined;
}

function getDefaultPersonLabel<Person>(person: Person, personId: PersonId): string {
  if (!isRecord(person)) return personId;
  if (typeof person.name === "string") return person.name;
  if (typeof person.label === "string") return person.label;

  const profile = person.profile;
  if (isRecord(profile) && typeof profile.display === "string") return profile.display;

  return personId;
}

function getDefaultProfileImage<Person>(person: Person): string | undefined {
  if (!isRecord(person)) return undefined;
  if (typeof person.avatar === "string") return person.avatar;
  if (typeof person.image === "string") return person.image;

  const profile = person.profile;
  if (!isRecord(profile)) return undefined;
  if (typeof profile.avatar === "string") return profile.avatar;
  if (typeof profile.image === "string") return profile.image;
  if (typeof profile.photo === "string") return profile.photo;

  return undefined;
}

export function StyledFamilyCard<Person>({
  avatar = "auto",
  outlined = true,
  person,
  personId,
  radius,
  relation,
  selected: _selected,
  shadow,
  focused: _focused,
  collapsed: _collapsed,
  readOnly: _readOnly,
  onAddRelationship: _onAddRelationship,
  ...props
}: StyledFamilyCardProps<Person>): JSX.Element {
  const profileImage = getDefaultProfileImage(person);
  const resolvedRadius = resolveCardRadius(radius);
  const resolvedShadow = resolveCardShadow(shadow);
  const avatarRadius = resolveAvatarRadius(avatar);

  return (
    <article
      {...props}
      style={{
        ...defaultCardStyle,
        borderWidth: outlined ? "var(--tree-outline-width, 1px)" : 0,
        borderRadius: resolvedRadius ?? defaultCardStyle.borderRadius,
        boxShadow: resolvedShadow ?? defaultCardStyle.boxShadow,
        ...props.style,
      }}
    >
      {avatar !== "hidden" && profileImage ? (
        <img
          alt=""
          src={profileImage}
          style={{
            ...defaultAvatarStyle,
            borderWidth: outlined ? "var(--tree-outline-width, 1px)" : 0,
            borderRadius: avatarRadius ?? defaultAvatarStyle.borderRadius,
          }}
        />
      ) : null}
      <strong style={defaultNameStyle}>{getDefaultPersonLabel(person, personId)}</strong>
      <small style={defaultRelationStyle}>{relation.label}</small>
    </article>
  );
}

export function DefaultFamilyCard<Person>(props: FamilyCardProps<Person>): JSX.Element {
  return <StyledFamilyCard {...props} />;
}

export function FamilyTree<Person, CardExtraProps extends object = Record<string, never>>({
  subject,
  people,
  relationships,
  graph,
  ariaLabel,
  card,
  cardProps,
  className,
  style,
  cardClassName,
  edgeClassName,
  interactionMode = "pan",
  lineShape = "orthogonal",
  viewport,
  defaultViewport,
  initialViewport,
  onViewportChange,
  spacing,
  estimatedCardSize,
  layoutMode,
  boundsMode,
  shouldRenderPersonCard,
  limits,
  theme,
  treeApiRef,
  getPersonLabel,
  selected,
  collapsed,
  readOnly = false,
  onPersonClick,
  onAddRelationship,
}: FamilyTreeProps<Person, CardExtraProps>): JSX.Element {
  const ResolvedCard = card ?? DefaultFamilyCard;
  const resolvePersonLabel = getPersonLabel ?? getDefaultPersonLabel;

  return (
    <TreeProvider
      type="family"
      collapsed={collapsed}
      getPersonLabel={resolvePersonLabel}
      limits={limits}
      lineShape={lineShape}
      onAddRelationship={onAddRelationship}
      onPersonClick={onPersonClick}
      people={people}
      readOnly={readOnly}
      relationships={relationships}
      graph={graph}
      selected={selected}
      spacing={spacing}
      estimatedCardSize={estimatedCardSize}
      layoutMode={layoutMode}
      boundsMode={boundsMode}
      shouldRenderPersonCard={shouldRenderPersonCard}
      subject={subject}
    >
      <TreeCanvas
        ariaLabel={ariaLabel}
        className={className}
        defaultViewport={defaultViewport}
        initialViewport={initialViewport}
        interactionMode={interactionMode}
        onViewportChange={onViewportChange}
        style={style}
        theme={theme}
        treeApiRef={treeApiRef}
        viewport={viewport}
      >
        <TreeEdges edgeClassName={edgeClassName} />
        <TreeNodeLayer<Person, CardExtraProps>
          card={ResolvedCard}
          cardClassName={cardClassName}
          cardProps={cardProps}
        />
      </TreeCanvas>
    </TreeProvider>
  );
}
