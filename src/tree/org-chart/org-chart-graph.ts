import type { OrgChartGraph, OrgReportingRelationship, PeopleById, PersonId } from "./types";

export interface NormalizedOrgChartInput<Person> {
  root: PersonId;
  people: PeopleById<Person>;
  relationships: OrgReportingRelationship[];
}

const reportingRelationshipId = (managerId: PersonId, index: number) => `reporting-${managerId}-${index}`;

export function graphToOrgReportingRelationships<Person>(graph: OrgChartGraph<Person>): OrgReportingRelationship[] {
  const grouped = new Map<string, OrgReportingRelationship>();
  const relationships: OrgReportingRelationship[] = [];

  graph.reportingLinks.forEach((link, index) => {
    const relation = link.relation ?? "manager";
    const status = link.status ?? "current";
    const key = `${link.managerId}:${relation}:${status}:${link.order ?? ""}`;
    const existing = grouped.get(key);
    if (existing) {
      if (!existing.reportIds.includes(link.reportId)) existing.reportIds.push(link.reportId);
      return;
    }

    const relationship: OrgReportingRelationship = {
      id: link.id ?? reportingRelationshipId(link.managerId, index),
      type: "reporting",
      managerId: link.managerId,
      reportIds: [link.reportId],
      relation,
      status,
      order: link.order,
    };
    grouped.set(key, relationship);
    relationships.push(relationship);
  });

  return relationships;
}

export function normalizeOrgChartInput<Person>({
  graph,
  people,
  relationships,
  root,
}: {
  graph?: OrgChartGraph<Person>;
  people?: PeopleById<Person>;
  relationships?: OrgReportingRelationship[];
  root?: PersonId;
}): NormalizedOrgChartInput<Person> {
  if (graph) {
    return {
      root: graph.root,
      people: graph.people,
      relationships: graphToOrgReportingRelationships(graph),
    };
  }

  if (!root || !people) {
    throw new Error("OrgChart requires either graph or root and people.");
  }

  return {
    root,
    people,
    relationships: relationships ?? [],
  };
}
