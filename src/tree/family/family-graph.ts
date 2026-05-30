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

  const parentage: FamilyParentageRelationship[] = graph.parentChildLinks.map((link, index) => {
    const id = link.id ?? parentChildLinkId(link.parentId, link.childId, index);
    return {
      id,
      type: "parentage",
      parents: [link.parentId],
      children: [link.childId],
      groupId: link.groupId,
      parentChildLinkIds: [id],
      relation: link.relation ?? "biological",
      status: link.status,
      order: link.order,
    };
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
