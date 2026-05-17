import type { OrgChartNode, PersonId } from "./types";

export interface OrgChartBranch<Person> {
  id: PersonId;
  person: Person;
  reports?: OrgChartBranch<Person>[];
  order?: number;
}

export interface OrgChartGeneration {
  generation: number;
  personIds: PersonId[];
  count: number;
}

export interface OrgChartReportLine {
  managerId: PersonId;
  reportId: PersonId;
}

export interface OrgChartDefinition<Person> {
  rootId: PersonId;
  nodes: OrgChartNode<Person>[];
  generations: OrgChartGeneration[];
  maxGeneration: number;
  reportLines: OrgChartReportLine[];
}

export function createOrgChart<Person>(root: OrgChartBranch<Person>): OrgChartDefinition<Person> {
  const nodes: OrgChartNode<Person>[] = [];
  const ids = new Set<PersonId>();
  const generationsByDepth = new Map<number, PersonId[]>();
  const reportLines: OrgChartReportLine[] = [];

  const visit = (branch: OrgChartBranch<Person>, parentId: PersonId | null, generation: number, order: number) => {
    if (ids.has(branch.id)) {
      throw new Error(`Duplicate org chart person id "${branch.id}".`);
    }

    ids.add(branch.id);
    nodes.push({
      id: branch.id,
      person: branch.person,
      parentId,
      order: branch.order ?? order,
    });

    const generationIds = generationsByDepth.get(generation) ?? [];
    generationIds.push(branch.id);
    generationsByDepth.set(generation, generationIds);

    branch.reports?.forEach((report, index) => {
      reportLines.push({ managerId: branch.id, reportId: report.id });
      visit(report, branch.id, generation + 1, index);
    });
  };

  visit(root, null, 0, 0);

  const generations = Array.from(generationsByDepth.entries()).map(([generation, personIds]) => ({
    generation,
    personIds,
    count: personIds.length,
  }));

  return {
    rootId: root.id,
    nodes,
    generations,
    maxGeneration: generations.at(-1)?.generation ?? 0,
    reportLines,
  };
}
