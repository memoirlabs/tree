/**
 * Supported relationship kinds between family members.
 */
export type RelationType =
  | "parent"
  | "sibling"
  | "child"
  | "spouse"
  | "former_spouse"
  | "grandparent"
  | "grandchild"
  | "manager"
  | "direct_report"
  | "peer"
  | "ceo"
  | "assistant";

/**
 * Status for how a family member was added or linked.
 */
export type FamilyMemberStatus = "linked" | "manual" | "invite_pending";

/**
 * Core data model for a member displayed in the family tree.
 */
export interface FamilyMember {
  id: string;
  name: string;
  birthday?: string;
  avatarUrl?: string | null;
  relation?: RelationType;
  isUser?: boolean;
  status?: FamilyMemberStatus;
  inviteEmail?: string;
  pendingInviteId?: string;
  // Link to actual profile if connected
  profileId?: string;
  // Prefer slug for navigation when available
  profileSlug?: string | null;
  // Nested relationships for tree rendering
  parents?: FamilyMember[];
  siblings?: FamilyMember[];
  children?: FamilyMember[];
  spouse?: FamilyMember;
}

/**
 * Input data used for manual member creation.
 */
export interface AddMemberData {
  name: string;
  birthday?: string;
  relation: RelationType;
  parentId?: string;
  profileId?: string;
  avatarUrl?: string | null;
}

/**
 * Result shape returned by the profile search callback.
 */
export interface ProfileSearchResult {
  profileId: string;
  ownerUserId?: string;
  displayName: string;
  slug?: string | null;
  avatarUrl?: string | null;
  visibility?: string | null;
}

/**
 * Payload emitted when a user adds a member to the tree.
 */
export type AddMemberPayload =
  | {
      relation: RelationType;
      parentId?: string;
      type: "existing";
      name: string;
      profileId: string;
      avatarUrl?: string | null;
    }
  | {
      relation: RelationType;
      parentId?: string;
      type: "manual";
      name: string;
      birthday?: string;
    }
  | {
      relation: RelationType;
      parentId?: string;
      type: "invite";
      firstName: string;
      lastName?: string;
      email: string;
    };

/**
 * Alias of `RelationType` retained for compatibility.
 */
export type FamilyRelationshipType = RelationType;

/**
 * Coerce a `RelationType` into a `FamilyRelationshipType`.
 */
export function mapToFamilyRelationType(relation: RelationType): FamilyRelationshipType {
  return relation;
}

// Connector design config for lines/anchors.
/**
 * Built-in connector style presets.
 */
export type FamilyTreePresetName = "default" | "compact" | "contrast";

/**
 * Status-to-color class mapping used by connectors.
 */
export interface FamilyTreeStatusColors {
  linked: string;
  invite_pending: string;
  manual: string;
  default: string;
}

/**
 * Style tokens describing a connector line.
 */
export interface FamilyTreeLineStyle {
  thickness: string;
  colorClass: string;
}

/**
 * Full configuration for connector rendering.
 */
export interface FamilyTreeConnectorConfig {
  statusColors: FamilyTreeStatusColors;
  coupleLine: FamilyTreeLineStyle;
  trunk: FamilyTreeLineStyle;
  siblingBus: FamilyTreeLineStyle;
  drop: FamilyTreeLineStyle;
  anchors: {
    coupleInsetPx: number;
    verticalGapPx: number;
  };
}

/**
 * Deep partial shape accepted when overriding connector styling.
 */
export interface FamilyTreeConnectorOverrides {
  statusColors?: Partial<FamilyTreeStatusColors>;
  coupleLine?: Partial<FamilyTreeLineStyle>;
  trunk?: Partial<FamilyTreeLineStyle>;
  siblingBus?: Partial<FamilyTreeLineStyle>;
  drop?: Partial<FamilyTreeLineStyle>;
  anchors?: Partial<FamilyTreeConnectorConfig["anchors"]>;
}

/**
 * Built-in layout strategies used to place tree generations.
 */
export type FamilyTreeLayoutStrategy = "auto" | "generation";

/**
 * Density tokens for built-in tree spacing.
 */
export type FamilyTreeLayoutDensity = "comfortable" | "compact";

/**
 * Fields that can be shown by the default member card.
 */
export type FamilyTreeCardField = "name" | "birthday" | "relation" | "status";

/**
 * Declarative display options for the default member card.
 */
export interface FamilyTreeCardConfig {
  fields?: FamilyTreeCardField[];
  showRootLabel?: boolean;
  rootLabel?: string;
  widthClassName?: string;
  heightClassName?: string;
  className?: string;
  statusLabels?: Partial<Record<FamilyMemberStatus, string>>;
}

/**
 * Render options provided to a custom node renderer.
 */
export interface FamilyTreeRenderNodeOptions {
  isRoot: boolean;
  canEdit: boolean;
  onAddMember: (relation: RelationType, parentId: string) => void;
  onNavigateProfile?: (member: FamilyMember, target: string) => void;
  resolveAvatarUrl?: (url?: string | null) => string;
  relationOptions: RelationType[];
}
