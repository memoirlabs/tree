import { expect, test } from "bun:test";

import {
  buildFamilyTreeLayout,
  collectFamilyNeighborhood,
  createFamilyIndex,
  getFamilyChildBearingGroupIds,
  getFamilyChildPlacementGroupIds,
  getFamilyPartnershipGroupIds,
  graphToFamilyRelationships,
  rel,
} from "../src/index";
import type { FamilyGraph } from "../src/index";

const people = {
  alex: { name: "Alex" },
  blair: { name: "Blair" },
  casey: { name: "Casey" },
  drew: { name: "Drew" },
  ellis: { name: "Ellis" },
  finn: { name: "Finn" },
  gray: { name: "Gray" },
  harper: { name: "Harper" },
  indigo: { name: "Indigo" },
};

test("graph mode renders a simple two-parent family", () => {
  const graph: FamilyGraph = {
    people,
    subject: "casey",
    partnershipGroups: [{ id: "alex-blair", partners: ["alex", "blair"], relation: "spouse" }],
    parentChildLinks: [
      { id: "alex-casey", groupId: "alex-blair", parentId: "alex", childId: "casey" },
      { id: "blair-casey", groupId: "alex-blair", parentId: "blair", childId: "casey" },
    ],
  };

  const layout = buildFamilyTreeLayout({ graph, subject: graph.subject, people: graph.people });
  const childEdges = layout.edges.filter((edge) => edge.targetId === "casey");

  expect(layout.cards.map((card) => card.personId)).toEqual(["alex", "blair", "casey"]);
  expect(layout.edges.map((edge) => edge.id)).toEqual(expect.arrayContaining(["alex-blair"]));
  expect(childEdges).toHaveLength(1);
  expect(childEdges[0]?.id).toContain("parentage-alex-blair-biological");
  expect(layout.cards.find((card) => card.personId === "casey")?.placement).toMatchObject({
    partnershipGroupIds: ["alex-blair"],
    parentChildLinkIds: ["alex-casey", "blair-casey"],
  });
});

test("graph mode routes siblings through a shared top bus", () => {
  const layout = buildFamilyTreeLayout({
    graph: {
      people,
      subject: "casey",
      partnershipGroups: [{ id: "alex-blair", partners: ["alex", "blair"] }],
      parentChildLinks: [
        { id: "alex-casey", groupId: "alex-blair", parentId: "alex", childId: "casey" },
        { id: "blair-casey", groupId: "alex-blair", parentId: "blair", childId: "casey" },
        { id: "alex-finn", groupId: "alex-blair", parentId: "alex", childId: "finn" },
        { id: "blair-finn", groupId: "alex-blair", parentId: "blair", childId: "finn" },
      ],
    },
    subject: "casey",
    people,
  });

  const parentageEdge = layout.edges.find((edge) => edge.id.includes("parentage-alex-blair"));

  expect(parentageEdge?.path).toContain(" M ");
  expect(parentageEdge?.targetId).toBe("casey");
  expect(layout.edges.filter((edge) => edge.targetId === "casey")).toHaveLength(1);
});

test("graph mode renders a single-parent family", () => {
  const layout = buildFamilyTreeLayout({
    graph: {
      people,
      subject: "casey",
      partnershipGroups: [],
      parentChildLinks: [{ id: "alex-casey", parentId: "alex", childId: "casey" }],
    },
    subject: "casey",
    people,
  });

  expect(layout.cards.map((card) => card.personId)).toEqual(["alex", "casey"]);
  expect(layout.edges).toHaveLength(1);
});

test("graph mode keeps two spouses and two child groups distinct", () => {
  const graph: FamilyGraph = {
    people,
    subject: "alex",
    partnershipGroups: [
      { id: "alex-blair", partners: ["alex", "blair"], order: 1 },
      { id: "alex-drew", partners: ["alex", "drew"], order: 2 },
    ],
    parentChildLinks: [
      { id: "alex-casey", groupId: "alex-blair", parentId: "alex", childId: "casey", order: 1 },
      { id: "blair-casey", groupId: "alex-blair", parentId: "blair", childId: "casey", order: 1 },
      { id: "alex-ellis", groupId: "alex-drew", parentId: "alex", childId: "ellis", order: 2 },
      { id: "drew-ellis", groupId: "alex-drew", parentId: "drew", childId: "ellis", order: 2 },
    ],
  };

  const layout = buildFamilyTreeLayout({ graph, subject: graph.subject, people: graph.people });
  const edgeIds = layout.edges.map((edge) => edge.id);

  expect(edgeIds).toContain("alex-blair");
  expect(edgeIds).toContain("alex-drew");
  expect(layout.cards.find((card) => card.personId === "casey")?.placement?.partnershipGroupIds).toEqual(["alex-blair"]);
  expect(layout.cards.find((card) => card.personId === "ellis")?.placement?.partnershipGroupIds).toEqual(["alex-drew"]);
});

test("graph helpers expose child-bearing union ids without guessing", () => {
  const graph: FamilyGraph = {
    people,
    subject: "alex",
    partnershipGroups: [
      { id: "alex-blair", partners: ["alex", "blair"], status: "divorced", order: 2 },
      { id: "alex-drew", partners: ["alex", "drew"], status: "current", order: 1 },
      { id: "gray-harper", partners: ["gray", "harper"], status: "current", order: 3 },
    ],
    parentChildLinks: [
      { id: "alex-casey", groupId: "alex-blair", parentId: "alex", childId: "casey", order: 2 },
      { id: "blair-casey", groupId: "alex-blair", parentId: "blair", childId: "casey", order: 2 },
      { id: "alex-ellis", groupId: "alex-drew", parentId: "alex", childId: "ellis", order: 1 },
      { id: "drew-ellis", groupId: "alex-drew", parentId: "drew", childId: "ellis", order: 1 },
      { id: "alex-finn", parentId: "alex", childId: "finn", order: 3 },
    ],
    guardianshipLinks: [{ id: "alex-indigo", groupId: "alex-drew", guardianId: "alex", childId: "indigo" }],
  };

  expect(getFamilyPartnershipGroupIds(graph, "alex")).toEqual(["alex-drew", "alex-blair"]);
  expect(getFamilyChildBearingGroupIds(graph, "alex")).toEqual(["alex-drew", "alex-blair"]);
  expect(getFamilyChildBearingGroupIds(graph, "finn")).toEqual([]);
});

test("graph helpers expose child placement unions before they have children", () => {
  const graph: FamilyGraph = {
    people,
    subject: "alex",
    partnershipGroups: [
      { id: "alex-blair", partners: ["alex", "blair"], status: "divorced", order: 2 },
      { id: "alex-drew", partners: ["alex", "drew"], status: "current", order: 1 },
      { id: "gray-harper", partners: ["gray", "harper"], status: "current", order: 3 },
    ],
    parentChildLinks: [
      { id: "alex-casey", groupId: "alex-blair", parentId: "alex", childId: "casey", order: 2 },
      { id: "blair-casey", groupId: "alex-blair", parentId: "blair", childId: "casey", order: 2 },
    ],
  };

  expect(getFamilyChildBearingGroupIds(graph, "alex")).toEqual(["alex-blair"]);
  expect(getFamilyChildPlacementGroupIds(graph, "alex")).toEqual(["alex-drew", "alex-blair"]);
  expect(getFamilyChildPlacementGroupIds(graph, "gray")).toEqual(["gray-harper"]);
  expect(getFamilyChildPlacementGroupIds(graph, "casey")).toEqual([]);
});

test("graph mode sources grouped child edges from the partnership group", () => {
  const graph: FamilyGraph = {
    people,
    subject: "alex",
    partnershipGroups: [
      { id: "alex-blair", partners: ["alex", "blair"], order: 1 },
      { id: "alex-drew", partners: ["alex", "drew"], order: 2 },
    ],
    parentChildLinks: [
      { id: "alex-casey", groupId: "alex-blair", parentId: "alex", childId: "casey", order: 1 },
      { id: "blair-casey", groupId: "alex-blair", parentId: "blair", childId: "casey", order: 1 },
      { id: "alex-ellis", groupId: "alex-drew", parentId: "alex", childId: "ellis", order: 2 },
      { id: "drew-ellis", groupId: "alex-drew", parentId: "drew", childId: "ellis", order: 2 },
    ],
  };

  const childEdges = buildFamilyTreeLayout({ graph }).edges.filter((edge) => edge.kind === "biological");

  expect(childEdges.map((edge) => [edge.sourceId, edge.targetId]).toSorted()).toEqual([
    ["alex-blair", "casey"],
    ["alex-drew", "ellis"],
  ]);
  expect(childEdges.some((edge) => edge.sourceId === "alex")).toBe(false);
});

test("graph mode keeps rendered relationship ids stable when parent links are reordered", () => {
  const graph: FamilyGraph = {
    people,
    subject: "alex",
    partnershipGroups: [
      { id: "alex-blair", partners: ["alex", "blair"], order: 1 },
      { id: "alex-drew", partners: ["alex", "drew"], order: 2 },
    ],
    parentChildLinks: [
      { id: "alex-casey", groupId: "alex-blair", parentId: "alex", childId: "casey", order: 1 },
      { id: "blair-casey", groupId: "alex-blair", parentId: "blair", childId: "casey", order: 1 },
      { id: "alex-ellis", groupId: "alex-drew", parentId: "alex", childId: "ellis", order: 2 },
      { id: "drew-ellis", groupId: "alex-drew", parentId: "drew", childId: "ellis", order: 2 },
    ],
  };
  const reorderedGraph: FamilyGraph = {
    ...graph,
    parentChildLinks: [
      graph.parentChildLinks[2]!,
      graph.parentChildLinks[3]!,
      graph.parentChildLinks[0]!,
      graph.parentChildLinks[1]!,
    ],
  };

  const edgeIds = buildFamilyTreeLayout({ graph }).edges.map((edge) => edge.id).toSorted();
  const reorderedEdgeIds = buildFamilyTreeLayout({ graph: reorderedGraph }).edges.map((edge) => edge.id).toSorted();

  expect(reorderedEdgeIds).toEqual(edgeIds);
});

test("graph mode places multiple partners around the subject to avoid crossing cards", () => {
  const layout = buildFamilyTreeLayout({
    graph: {
      people,
      subject: "alex",
      partnershipGroups: [
        { id: "alex-blair", partners: ["alex", "blair"], order: 1 },
        { id: "alex-drew", partners: ["alex", "drew"], order: 2 },
      ],
      parentChildLinks: [
        { id: "alex-casey", groupId: "alex-blair", parentId: "alex", childId: "casey", order: 1 },
        { id: "blair-casey", groupId: "alex-blair", parentId: "blair", childId: "casey", order: 1 },
        { id: "alex-ellis", groupId: "alex-drew", parentId: "alex", childId: "ellis", order: 2 },
        { id: "drew-ellis", groupId: "alex-drew", parentId: "drew", childId: "ellis", order: 2 },
      ],
    },
    subject: "alex",
    people,
  });

  const alex = layout.cards.find((card) => card.personId === "alex");
  const blair = layout.cards.find((card) => card.personId === "blair");
  const drew = layout.cards.find((card) => card.personId === "drew");

  expect(blair?.x).toBeLessThan(alex?.x ?? 0);
  expect(drew?.x).toBeGreaterThan(alex?.x ?? 0);
});

test("graph mode keeps biological and step lineage per parent", () => {
  const layout = buildFamilyTreeLayout({
    graph: {
      people,
      subject: "casey",
      partnershipGroups: [{ id: "alex-blair", partners: ["alex", "blair"] }],
      parentChildLinks: [
        { id: "alex-casey", groupId: "alex-blair", parentId: "alex", childId: "casey", relation: "biological" },
        { id: "blair-casey", groupId: "alex-blair", parentId: "blair", childId: "casey", relation: "step" },
      ],
    },
    subject: "casey",
    people,
  });

  expect(layout.edges.map((edge) => edge.kind)).toEqual(expect.arrayContaining(["biological", "step"]));
  expect(layout.edges.filter((edge) => edge.targetId === "casey").map((edge) => edge.sourceId)).toEqual([
    "alex-blair",
    "alex-blair",
  ]);
});

test("graph mode keeps biological and guardian links distinct", () => {
  const layout = buildFamilyTreeLayout({
    graph: {
      people,
      subject: "casey",
      partnershipGroups: [],
      parentChildLinks: [{ id: "alex-casey", parentId: "alex", childId: "casey", relation: "biological" }],
      guardianshipLinks: [{ id: "gray-casey", guardianId: "gray", childId: "casey", relation: "guardian" }],
    },
    subject: "casey",
    people,
  });

  expect(layout.edges.map((edge) => edge.kind)).toEqual(expect.arrayContaining(["biological", "guardian"]));
  expect(layout.cards.find((card) => card.personId === "casey")?.placement?.guardianshipLinkIds).toEqual(["gray-casey"]);
});

test("graph mode supports adopted child lineage", () => {
  const layout = buildFamilyTreeLayout({
    graph: {
      people,
      subject: "casey",
      partnershipGroups: [],
      parentChildLinks: [{ id: "alex-casey", parentId: "alex", childId: "casey", relation: "adoptive" }],
    },
    subject: "casey",
    people,
  });

  expect(layout.edges[0]?.kind).toBe("adoptive");
});

test("graph mode derives siblings from shared parent group and half-siblings from one shared parent", () => {
  const relationships = graphToFamilyRelationships({
    people,
    subject: "casey",
    partnershipGroups: [{ id: "alex-blair", partners: ["alex", "blair"] }],
    parentChildLinks: [
      { id: "alex-casey", groupId: "alex-blair", parentId: "alex", childId: "casey" },
      { id: "blair-casey", groupId: "alex-blair", parentId: "blair", childId: "casey" },
      { id: "alex-finn", groupId: "alex-blair", parentId: "alex", childId: "finn" },
      { id: "blair-finn", groupId: "alex-blair", parentId: "blair", childId: "finn" },
      { id: "alex-ellis", parentId: "alex", childId: "ellis" },
    ],
  });
  const neighborhood = collectFamilyNeighborhood(createFamilyIndex(people, relationships), "casey");

  expect(neighborhood?.siblings.map((relative) => relative.personId)).toEqual(["finn"]);
  expect(neighborhood?.halfSiblings.map((relative) => relative.personId)).toEqual(["ellis"]);
});

test("graph mode keeps a half-sibling's other parent in the parent row", () => {
  const layout = buildFamilyTreeLayout({
    graph: {
      people,
      subject: "casey",
      partnershipGroups: [{ id: "alex-drew", partners: ["alex", "drew"] }],
      parentChildLinks: [
        { id: "alex-casey", parentId: "alex", childId: "casey" },
        { id: "alex-finn", groupId: "alex-drew", parentId: "alex", childId: "finn" },
        { id: "drew-finn", groupId: "alex-drew", parentId: "drew", childId: "finn" },
      ],
    },
    subject: "casey",
    people,
    limits: { lateralFamilyGenerations: 2 },
  });
  const casey = layout.cards.find((card) => card.personId === "casey");
  const finn = layout.cards.find((card) => card.personId === "finn");
  const drew = layout.cards.find((card) => card.personId === "drew");

  expect(layout.cards.map((card) => card.personId)).toEqual(["alex", "drew", "casey", "finn"]);
  expect(drew?.relation).toMatchObject({ label: "parent", side: "other", generation: -1 });
  expect(finn?.relation.label).toBe("half-sibling");
  expect(drew?.y).toBeLessThan(finn?.y ?? 0);
  expect(Math.abs((drew?.x ?? 0) - (finn?.x ?? 0))).toBeLessThan(Math.abs((drew?.x ?? 0) - (casey?.x ?? 0)));
  expect(layout.edges.some((edge) => edge.id.includes("alex-drew") && edge.targetId === "finn")).toBe(true);
});

test("graph mode includes spouse parents without labeling them as direct parents", () => {
  const graph: FamilyGraph = {
    people,
    subject: "alex",
    partnershipGroups: [{ id: "alex-blair", partners: ["alex", "blair"], relation: "spouse" }],
    parentChildLinks: [{ id: "drew-blair", parentId: "drew", childId: "blair" }],
  };
  const neighborhood = collectFamilyNeighborhood(createFamilyIndex(people, graphToFamilyRelationships(graph)), "alex", {
    lateralFamilyGenerations: 1,
  });
  const layout = buildFamilyTreeLayout({ graph, limits: { lateralFamilyGenerations: 1 } });
  const drew = layout.cards.find((card) => card.personId === "drew");

  expect(neighborhood?.parents.find((relative) => relative.personId === "drew")?.relation).toMatchObject({
    label: "partner-parent",
    generation: -1,
    side: "other",
  });
  expect(drew?.relation).toMatchObject({ label: "partner-parent", generation: -1, side: "other" });
  expect(drew?.relation.label).not.toBe("parent");
  expect(layout.edges.some((edge) => edge.sourceId === "drew" && edge.targetId === "blair")).toBe(true);
});

test("graph mode lays out parent siblings and cousins once the family chain exists", () => {
  const layout = buildFamilyTreeLayout({
    graph: {
      people: {
        ...people,
        jordan: { name: "Jordan" },
      },
      subject: "casey",
      partnershipGroups: [],
      parentChildLinks: [
        { id: "alex-casey", parentId: "alex", childId: "casey" },
        { id: "gray-alex", parentId: "gray", childId: "alex" },
        { id: "gray-harper", parentId: "gray", childId: "harper" },
        { id: "harper-jordan", parentId: "harper", childId: "jordan" },
      ],
    },
    limits: { lateralFamilyGenerations: 1 },
  });

  expect(layout.cards.map((card) => card.personId)).toEqual(["gray", "alex", "harper", "jordan", "casey"]);
  expect(layout.cards.find((card) => card.personId === "harper")?.relation).toMatchObject({
    label: "aunt-uncle",
    generation: -1,
    side: "other",
  });
  expect(layout.cards.find((card) => card.personId === "jordan")?.relation).toMatchObject({
    label: "cousin",
    generation: 0,
    side: "other",
  });
});

test("child with two parent groups does not create layout cycles", () => {
  const layout = buildFamilyTreeLayout({
    graph: {
      people,
      subject: "casey",
      partnershipGroups: [
        { id: "alex-blair", partners: ["alex", "blair"] },
        { id: "drew-harper", partners: ["drew", "harper"] },
      ],
      parentChildLinks: [
        { id: "alex-casey", groupId: "alex-blair", parentId: "alex", childId: "casey" },
        { id: "blair-casey", groupId: "alex-blair", parentId: "blair", childId: "casey" },
        { id: "drew-casey", groupId: "drew-harper", parentId: "drew", childId: "casey", relation: "adoptive" },
        { id: "harper-casey", groupId: "drew-harper", parentId: "harper", childId: "casey", relation: "adoptive" },
      ],
    },
    subject: "casey",
    people,
  });

  expect(layout.cards.map((card) => card.personId)).toEqual(["alex", "blair", "drew", "harper", "casey"]);
});

test("old simple relationship API still renders", () => {
  const layout = buildFamilyTreeLayout({
    subject: "casey",
    people,
    relationships: [rel.parents("casey", ["alex", "blair"])],
  });

  expect(layout.cards.map((card) => card.personId)).toEqual(["alex", "blair", "casey"]);
});
