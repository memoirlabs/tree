import type { FamilyGraph, FamilyPartnershipGroup, PersonId } from "./types";

const unique = (ids: Iterable<string>) => {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    values.push(id);
  }
  return values;
};

const byGroupOrder = (groups: Map<string, FamilyPartnershipGroup>) => (a: string, b: string) => {
  const groupA = groups.get(a);
  const groupB = groups.get(b);
  return (groupA?.order ?? Number.POSITIVE_INFINITY) - (groupB?.order ?? Number.POSITIVE_INFINITY) || a.localeCompare(b);
};

export function getFamilyPartnershipGroupIds<Person>(graph: FamilyGraph<Person>, personId: PersonId): string[] {
  return graph.partnershipGroups
    .filter((group) => group.partners.includes(personId))
    .map((group) => group.id)
    .toSorted(byGroupOrder(new Map(graph.partnershipGroups.map((group) => [group.id, group]))));
}

export function getFamilyChildBearingGroupIds<Person>(graph: FamilyGraph<Person>, personId: PersonId): string[] {
  const groups = new Map(graph.partnershipGroups.map((group) => [group.id, group]));
  return unique([
    ...graph.parentChildLinks
      .filter((link) => link.parentId === personId && link.groupId)
      .map((link) => link.groupId as string),
    ...(graph.guardianshipLinks ?? [])
      .filter((link) => link.guardianId === personId && link.groupId)
      .map((link) => link.groupId as string),
  ]).toSorted(byGroupOrder(groups));
}

export function getFamilyChildPlacementGroupIds<Person>(graph: FamilyGraph<Person>, personId: PersonId): string[] {
  const groups = new Map(graph.partnershipGroups.map((group) => [group.id, group]));
  return unique([
    ...getFamilyPartnershipGroupIds(graph, personId),
    ...getFamilyChildBearingGroupIds(graph, personId),
  ]).toSorted(byGroupOrder(groups));
}
