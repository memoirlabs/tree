import type { FamilyLayoutWarning, FamilyNodeId, PersonId, UnionId } from "./types";
import type { InternalFamilyGraph } from "./graph";

export interface FamilyRankResult {
  ranks: Map<FamilyNodeId, number>;
  warnings: FamilyLayoutWarning[];
}

const warning = (code: FamilyLayoutWarning["code"], message: string, ids?: string[]): FamilyLayoutWarning => ({
  code,
  message,
  ids,
});

const isUnionId = <Person>(graph: InternalFamilyGraph<Person>, id: FamilyNodeId): id is UnionId => graph.unions.has(id);
const isPersonId = <Person>(graph: InternalFamilyGraph<Person>, id: FamilyNodeId): id is PersonId => graph.people.has(id);

function defaultCenter<Person>(graph: InternalFamilyGraph<Person>): FamilyNodeId | undefined {
  return graph.people.keys().next().value ?? graph.unions.keys().next().value;
}

export function assignFamilyRanks<Person>(
  graph: InternalFamilyGraph<Person>,
  requestedCenter?: FamilyNodeId,
): FamilyRankResult {
  const warnings: FamilyLayoutWarning[] = [];
  const center = requestedCenter && (isPersonId(graph, requestedCenter) || isUnionId(graph, requestedCenter))
    ? requestedCenter
    : defaultCenter(graph);
  const ranks = new Map<FamilyNodeId, number>();
  if (!center) return { ranks, warnings };

  const queue: Array<{ id: FamilyNodeId; rank: number; distance: number }> = [];
  const distances = new Map<FamilyNodeId, number>();

  const setRank = (id: FamilyNodeId, rank: number, distance: number) => {
    const existingRank = ranks.get(id);
    const existingDistance = distances.get(id);
    if (existingRank === undefined || existingDistance === undefined || distance < existingDistance) {
      ranks.set(id, rank);
      distances.set(id, distance);
      queue.push({ id, rank, distance });
      return;
    }
    if (existingRank !== rank && distance === existingDistance) {
      warnings.push(warning("rank-conflict", `Rank conflict for ${id}; kept ${existingRank}, rejected ${rank}.`, [id]));
    }
  };

  setRank(center, 0, 0);

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) continue;
    if (item.distance !== distances.get(item.id) || item.rank !== ranks.get(item.id)) continue;

    if (isPersonId(graph, item.id)) {
      for (const parentUnion of graph.unionsByChild.get(item.id) ?? []) {
        setRank(parentUnion, item.rank - 1, item.distance + 1);
        for (const parent of graph.partnersByUnion.get(parentUnion) ?? []) {
          setRank(parent, item.rank - 2, item.distance + 2);
        }
      }
      for (const childUnion of graph.unionsByPartner.get(item.id) ?? []) {
        setRank(childUnion, item.rank + 1, item.distance + 1);
        for (const child of graph.childrenByUnion.get(childUnion) ?? []) {
          setRank(child, item.rank + 2, item.distance + 2);
        }
        for (const partner of graph.partnersByUnion.get(childUnion) ?? []) {
          if (partner !== item.id) setRank(partner, item.rank, item.distance + 1);
        }
      }
      continue;
    }

    const union = graph.unions.get(item.id);
    if (!union) continue;
    for (const partner of union.partners) setRank(partner, item.rank - 1, item.distance + 1);
    for (const child of union.children) setRank(child, item.rank + 1, item.distance + 1);
  }

  for (const personId of graph.people.keys()) {
    if (!ranks.has(personId)) {
      ranks.set(personId, 0);
      warnings.push(warning("disconnected-component", `Disconnected person placed separately: ${personId}.`, [personId]));
    }
  }
  for (const unionId of graph.unions.keys()) {
    if (!ranks.has(unionId)) {
      ranks.set(unionId, 1);
      warnings.push(warning("disconnected-component", `Disconnected union placed separately: ${unionId}.`, [unionId]));
    }
  }

  return { ranks, warnings };
}
