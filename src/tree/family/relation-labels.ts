import type {
  ComputedRelationLabel,
  FamilyActionContext,
  FamilyPersonMetadata,
} from "./types";

const FAMILY_RELATION_LABELS: Record<ComputedRelationLabel, string> = {
  self: "self",
  parent: "parent",
  grandparent: "grandparent",
  ancestor: "ancestor",
  "aunt-uncle": "aunt or uncle",
  child: "child",
  grandchild: "grandchild",
  descendant: "descendant",
  sibling: "sibling",
  "half-sibling": "half sibling",
  cousin: "cousin",
  "niece-nephew": "niece or nephew",
  partner: "partner",
  coparent: "co-parent",
  guardian: "guardian",
  relative: "relative",
  unknown: "unknown",
};

export function formatFamilyRelationLabel(
  label: ComputedRelationLabel,
  metadata?: FamilyPersonMetadata,
): string {
  if (metadata?.kind === "unknown-slot") {
    if (metadata.slotRole === "parent") return "parent";
    if (metadata.slotRole === "child") return "child";
    if (metadata.slotRole === "partner") return "partner";
  }

  return FAMILY_RELATION_LABELS[label];
}

export function getDefaultFamilyRelationLabel<Person>(
  context: FamilyActionContext<Person>,
): string {
  if (context.personId === context.subject) {
    return "subject";
  }

  return formatFamilyRelationLabel(
    context.relation.label,
    context.metadata,
  );
}
