"use client";

import type { CSSProperties, JSX } from "react";

import { TreeCanvas, TreeEdges, TreeNodeLayer, TreeProvider } from "./TreePrimitives";
import type { FamilyCardProps, FamilyTreeProps, PersonId } from "./types";

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

const defaultSelectedCardStyle: CSSProperties = {
  background: "var(--tree-card-selected-bg, var(--tree-card-bg, Canvas))",
  borderColor: "var(--tree-card-selected-border, var(--tree-card-border, currentColor))",
  color: "var(--tree-card-selected-fg, var(--tree-card-fg, inherit))",
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

const defaultBadgeStyle: CSSProperties = {
  display: "block",
  padding: "2px 7px",
  border: "var(--tree-outline-width, 1px) solid currentColor",
  fontSize: "0.68rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  lineHeight: 1.2,
  textTransform: "uppercase",
};

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

export function DefaultFamilyCard<Person>({
  person,
  personId,
  relation,
  selected,
  focused: _focused,
  collapsed: _collapsed,
  readOnly: _readOnly,
  onAddRelationship: _onAddRelationship,
  ...props
}: FamilyCardProps<Person>): JSX.Element {
  const profileImage = getDefaultProfileImage(person);

  return (
    <article {...props} style={{ ...defaultCardStyle, ...(selected ? defaultSelectedCardStyle : {}), ...props.style }}>
      {profileImage ? <img alt="" src={profileImage} style={defaultAvatarStyle} /> : null}
      <strong style={defaultNameStyle}>{getDefaultPersonLabel(person, personId)}</strong>
      <small style={defaultRelationStyle}>{relation.label}</small>
      {selected ? <span style={defaultBadgeStyle}>selected</span> : null}
    </article>
  );
}

export function FamilyTree<Person, CardExtraProps extends object = Record<string, never>>({
  subject,
  rootProfileId,
  people,
  profiles,
  relationships,
  ariaLabel,
  card,
  cardProps,
  renderProfileCard,
  className,
  style,
  cardClassName,
  edgeClassName,
  interactionMode = "pan",
  lineShape = "orthogonal",
  zoom,
  defaultZoom,
  viewport,
  defaultViewport,
  onViewportChange,
  minZoom,
  maxZoom,
  onZoomChange,
  spacing,
  limits,
  theme,
  treeApiRef,
  getPersonLabel,
  selected,
  collapsed,
  readOnly = false,
  onPersonClick,
  onSelectProfile,
  onAddRelationship,
}: FamilyTreeProps<Person, CardExtraProps>): JSX.Element {
  const resolvedSubject = subject ?? rootProfileId;
  const resolvedPeople = people ?? profiles;

  if (!resolvedSubject) {
    throw new Error("FamilyTree requires `subject` or `rootProfileId`.");
  }
  if (!resolvedPeople) {
    throw new Error("FamilyTree requires `people` or `profiles`.");
  }

  const ResolvedCard = renderProfileCard
    ? (props: FamilyCardProps<Person> & CardExtraProps) => renderProfileCard(props.person, props)
    : (card ?? DefaultFamilyCard);
  const handlePersonClick = onPersonClick ?? onSelectProfile;
  const resolvePersonLabel = getPersonLabel ?? getDefaultPersonLabel;

  return (
    <TreeProvider
      type="family"
      collapsed={collapsed}
      getPersonLabel={resolvePersonLabel}
      limits={limits}
      lineShape={lineShape}
      onAddRelationship={onAddRelationship}
      onPersonClick={handlePersonClick}
      people={resolvedPeople}
      readOnly={readOnly}
      relationships={relationships}
      selected={selected}
      spacing={spacing}
      subject={resolvedSubject}
    >
      <TreeCanvas
        ariaLabel={ariaLabel}
        className={className}
        defaultViewport={defaultViewport}
        defaultZoom={defaultZoom}
        interactionMode={interactionMode}
        maxZoom={maxZoom}
        minZoom={minZoom}
        onViewportChange={onViewportChange}
        onZoomChange={onZoomChange}
        style={style}
        theme={theme}
        treeApiRef={treeApiRef}
        viewport={viewport}
        zoom={zoom}
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
