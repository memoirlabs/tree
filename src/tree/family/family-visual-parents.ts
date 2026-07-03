import type {
  FamilyParentageRelationship,
  FamilyPartnershipRelationship,
  FamilyRelationship,
  PersonId,
} from "./types";

export const createPartnershipByGroupId = (relationships: FamilyRelationship[]) => {
  const partnershipByGroupId = new Map<string, FamilyPartnershipRelationship>();
  for (const relationship of relationships) {
    if (relationship.type !== "partnership") continue;
    const groupId = relationship.groupId ?? relationship.id;
    if (groupId) partnershipByGroupId.set(groupId, relationship);
  }
  return partnershipByGroupId;
};

export const getVisualParentIds = (
  relationship: FamilyParentageRelationship,
  partnershipByGroupId: Map<string, FamilyPartnershipRelationship>,
): PersonId[] => {
  const firstParent = relationship.parents[0];
  if (!relationship.groupId || !firstParent) return relationship.parents;

  const partnership = partnershipByGroupId.get(relationship.groupId);
  if (!partnership?.partners.includes(firstParent)) return relationship.parents;

  return partnership.partners;
};
