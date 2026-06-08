import type { OrgReportingRelationship, PeopleById, PersonId } from "./types";

export interface OrgChartIndex<Person> {
  people: PeopleById<Person>;
  relationships: OrgReportingRelationship[];
  reportsByManager: Map<PersonId, PersonId[]>;
  managerByReport: Map<PersonId, PersonId>;
  relationshipByReport: Map<PersonId, OrgReportingRelationship>;
  relationshipOrderByPerson: Map<PersonId, number>;
  reportingLinkIdByReport: Map<PersonId, string>;
}

export interface OrgChartRelative<Person> {
  personId: PersonId;
  person: Person;
  depth: number;
  parentId?: PersonId;
  order: number;
}

const hasPerson = <Person>(people: PeopleById<Person>, personId: PersonId): personId is keyof PeopleById<Person> =>
  Object.prototype.hasOwnProperty.call(people, personId);

const getPerson = <Person>(people: PeopleById<Person>, personId: PersonId): Person | undefined =>
  hasPerson(people, personId) ? people[personId] : undefined;

const compactIds = (ids: Iterable<PersonId>): PersonId[] => {
  const seen = new Set<PersonId>();
  const compacted: PersonId[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    compacted.push(id);
  }
  return compacted;
};

export function createOrgChartIndex<Person>(
  people: PeopleById<Person>,
  relationships: OrgReportingRelationship[],
): OrgChartIndex<Person> {
  const reportsByManager = new Map<PersonId, PersonId[]>();
  const managerByReport = new Map<PersonId, PersonId>();
  const relationshipByReport = new Map<PersonId, OrgReportingRelationship>();
  const relationshipOrderByPerson = new Map<PersonId, number>();
  const reportingLinkIdByReport = new Map<PersonId, string>();

  const setLowestOrder = (personId: PersonId, order: number | undefined) => {
    if (order === undefined) return;
    const existing = relationshipOrderByPerson.get(personId);
    if (existing === undefined || order < existing) relationshipOrderByPerson.set(personId, order);
  };

  for (const relationship of relationships) {
    const existingReports = reportsByManager.get(relationship.managerId) ?? [];
    reportsByManager.set(relationship.managerId, compactIds([...existingReports, ...relationship.reportIds]));
    setLowestOrder(relationship.managerId, relationship.order);

    relationship.reportIds.forEach((reportId, index) => {
      const existingManager = managerByReport.get(reportId);
      if (existingManager && existingManager !== relationship.managerId) {
        throw new Error(`OrgChart report "${reportId}" cannot have multiple managers.`);
      }
      managerByReport.set(reportId, relationship.managerId);
      relationshipByReport.set(reportId, relationship);
      setLowestOrder(reportId, relationship.order);

      const reportingLinkId = relationship.reportingLinkIds?.[index];
      if (reportingLinkId) reportingLinkIdByReport.set(reportId, reportingLinkId);
    });
  }

  return {
    people,
    relationships,
    reportsByManager,
    managerByReport,
    relationshipByReport,
    relationshipOrderByPerson,
    reportingLinkIdByReport,
  };
}

const relationshipOrderForReport = <Person>(index: OrgChartIndex<Person>, personId: PersonId) => {
  return index.relationshipOrderByPerson.get(personId) ?? Number.POSITIVE_INFINITY;
};

export function collectOrgChartSubtree<Person>(
  index: OrgChartIndex<Person>,
  root: PersonId,
  options: {
    collapsed?: PersonId[];
    maxDepth?: number | null;
  } = {},
): OrgChartRelative<Person>[] {
  const collapsedIds = new Set(options.collapsed ?? []);
  const maxDepth = options.maxDepth ?? null;
  const relatives: OrgChartRelative<Person>[] = [];
  const visiting = new Set<PersonId>();
  const visited = new Set<PersonId>();

  const visit = (personId: PersonId, depth: number, parentId?: PersonId) => {
    if (maxDepth !== null && depth > maxDepth) return;
    if (visiting.has(personId)) {
      throw new Error(`OrgChart contains a reporting cycle at "${personId}".`);
    }
    if (visited.has(personId)) return;

    const person = getPerson(index.people, personId);
    if (!person) return;

    visiting.add(personId);
    visited.add(personId);
    relatives.push({
      personId,
      person,
      depth,
      parentId,
      order: relationshipOrderForReport(index, personId),
    });

    if (!collapsedIds.has(personId)) {
      const reportIds = (index.reportsByManager.get(personId) ?? []).toSorted((a, b) => {
        const orderA = relationshipOrderForReport(index, a);
        const orderB = relationshipOrderForReport(index, b);
        return orderA - orderB || a.localeCompare(b);
      });
      for (const reportId of reportIds) {
        visit(reportId, depth + 1, personId);
      }
    }

    visiting.delete(personId);
  };

  visit(root, 0);
  return relatives;
}
