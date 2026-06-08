import type {
  FamilyGraph,
  FamilyGuardianshipRelationship,
  FamilyParentageRelationship,
  FamilyPartnershipRelationship,
  FamilyRelationship,
  PeopleById,
  PersonId,
} from "./types";

export interface NormalizedFamilyInput<Person> {
  subject: PersonId;
  people: PeopleById<Person>;
  relationships: FamilyRelationship[];
}

const parentChildLinkId = (parentId: PersonId, childId: PersonId, index: number) =>
  `parent-child-${parentId}-${childId}-${index}`;

const guardianshipLinkId = (guardianId: PersonId, childId: PersonId, index: number) =>
  `guardian-${guardianId}-${childId}-${index}`;

const groupedParentageId = (
  groupId: string,
  relation: string,
  status: string | undefined,
  order: number | undefined,
) => `parentage-${groupId}-${relation}-${status ?? "none"}-${order ?? "none"}`;

export function graphToFamilyRelationships<Person>(graph: FamilyGraph<Person>): FamilyRelationship[] {
  const partnerships: FamilyPartnershipRelationship[] = graph.partnershipGroups.map((group) => ({
    id: group.id,
    type: "partnership",
    partners: group.partners,
    groupId: group.id,
    relation: group.relation ?? "partner",
    status: group.status ?? "current",
    order: group.order,
  }));

  const parentageGroups = new Map<string, FamilyParentageRelationship>();
  const parentage: FamilyParentageRelationship[] = [];

  graph.parentChildLinks.forEach((link, index) => {
    const id = link.id ?? parentChildLinkId(link.parentId, link.childId, index);
    const relation = link.relation ?? "biological";
    const key = link.groupId
      ? `${link.groupId}:${relation}:${link.status ?? ""}:${link.order ?? ""}`
      : id;
    const existing = parentageGroups.get(key);
    if (existing) {
      if (!existing.parents.includes(link.parentId)) existing.parents.push(link.parentId);
      if (!existing.children.includes(link.childId)) existing.children.push(link.childId);
      existing.parentChildLinkIds = [...(existing.parentChildLinkIds ?? []), id];
      return;
    }
    const relationship = {
      id,
      type: "parentage",
      parents: [link.parentId],
      children: [link.childId],
      groupId: link.groupId,
      parentChildLinkIds: [id],
      relation,
      status: link.status,
      order: link.order,
    } satisfies FamilyParentageRelationship;
    if (link.groupId) {
      relationship.id = groupedParentageId(link.groupId, relation, link.status, link.order);
    }
    parentageGroups.set(key, relationship);
    parentage.push(relationship);
  });

  const guardianship: FamilyGuardianshipRelationship[] = (graph.guardianshipLinks ?? []).map((link, index) => {
    const id = link.id ?? guardianshipLinkId(link.guardianId, link.childId, index);
    return {
      id,
      type: "guardianship",
      guardians: [link.guardianId],
      children: [link.childId],
      groupId: link.groupId,
      guardianshipLinkIds: [id],
      relation: link.relation ?? "guardian",
      status: link.status,
      order: link.order,
    };
  });

  return [...partnerships, ...parentage, ...guardianship];
}

export function normalizeFamilyInput<Person>({
  graph,
  people,
  relationships,
  subject,
}: {
  graph?: FamilyGraph<Person>;
  people?: PeopleById<Person>;
  relationships?: FamilyRelationship[];
  subject?: PersonId;
}): NormalizedFamilyInput<Person> {
  if (graph) {
    return {
      subject: graph.subject,
      people: graph.people,
      relationships: graphToFamilyRelationships(graph),
    };
  }

  if (!subject || !people) {
    throw new Error("FamilyTree requires either graph or subject and people.");
  }

  return {
    subject,
    people,
    relationships: relationships ?? [],
  };
}
