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

test("graph mode keeps child-bearing partnership partners visible with descendants", () => {
  const graph: FamilyGraph = {
    subject: "henry",
    people: {
      henry: { name: "Henry" },
      alyssa: { name: "Alyssa" },
      "mini-h3": { name: "mini H3" },
      "unknown-parent": { name: "Unknown" },
      "extra-junior-h3": { name: "extra junior H3" },
    },
    partnershipGroups: [
      { id: "henry-alyssa", partners: ["henry", "alyssa"], relation: "spouse", order: 1 },
      {
        id: "child-family",
        partners: ["mini-h3", "unknown-parent"],
        relation: "unknown",
        status: "unknown",
        order: 3,
      },
    ],
    parentChildLinks: [
      { id: "henry-mini", groupId: "henry-alyssa", parentId: "henry", childId: "mini-h3", order: 2 },
      { id: "alyssa-mini", groupId: "henry-alyssa", parentId: "alyssa", childId: "mini-h3", order: 2 },
      {
        id: "mini-extra",
        groupId: "child-family",
        parentId: "mini-h3",
        childId: "extra-junior-h3",
        order: 4,
      },
    ],
  };

  const layout = buildFamilyTreeLayout({
    graph,
    estimatedCardSize: { width: 88, height: 64 },
    measurements: {
      alyssa: { width: 88, height: 64 },
      henry: { width: 88, height: 64 },
      "extra-junior-h3": { width: 88, height: 64 },
      "mini-h3": { width: 88, height: 64 },
      "unknown-parent": { width: 88, height: 64 },
    },
    spacing: {
      column: 20,
      padding: 32,
      row: 40,
    },
  });
  const mini = layout.cards.find((card) => card.personId === "mini-h3");
  const unknown = layout.cards.find((card) => card.personId === "unknown-parent");
  const extra = layout.cards.find((card) => card.personId === "extra-junior-h3");
  const henry = layout.cards.find((card) => card.personId === "henry");
  const childFamilyEdge = layout.edges.find((edge) => edge.sourceId === "child-family" && edge.targetId === "extra-junior-h3");
  const henryMiniEdge = layout.edges.find((edge) => edge.sourceId === "henry-alyssa" && edge.targetId === "mini-h3");
  const henryUnknownEdge = layout.edges.find(
    (edge) =>
      (edge.sourceId === "henry" && edge.targetId === "unknown-parent") ||
      (edge.sourceId === "unknown-parent" && edge.targetId === "henry"),
  );

  expect(mini).toBeDefined();
  expect(unknown).toBeDefined();
  expect(extra).toBeDefined();
  expect(henry).toBeDefined();
  expect(unknown?.relation.label).toBe("coparent");
  expect(unknown?.y).toBe(mini?.y);
  expect(extra?.y).toBeGreaterThan(unknown?.y ?? 0);
  expect(mini!.x + mini!.width / 2).toBe((henry!.x + henry!.width + (layout.cards.find((card) => card.personId === "alyssa")!.x)) / 2);
  expect((mini!.x + mini!.width + unknown!.x) / 2).toBeGreaterThan(mini!.x + mini!.width / 2);
  expect(extra!.x + extra!.width / 2).toBe((mini!.x + mini!.width + unknown!.x) / 2);
  expect(henryMiniEdge?.path).toContain(`L ${mini!.x + mini!.width / 2} ${mini!.y}`);
  expect(childFamilyEdge?.path).toContain(
    `M ${mini!.x + mini!.width} ${mini!.y + mini!.height / 2} L ${unknown!.x} ${unknown!.y + unknown!.height / 2}`,
  );
  expect(childFamilyEdge?.path).toContain(`M ${(mini!.x + mini!.width + unknown!.x) / 2}`);
  expect(henryUnknownEdge).toBeUndefined();
});

test("graph mode keeps siblings outside a child's coparent group", () => {
  const graph: FamilyGraph = {
    subject: "henry",
    people: {
      henry: { name: "Henry" },
      alyssa: { name: "Alyssa" },
      mini: { name: "mini H3" },
      micro: { name: "micro Alyssa" },
      unknown: { name: "Unknown" },
      extra: { name: "extra junior H3" },
    },
    partnershipGroups: [
      { id: "henry-alyssa", partners: ["henry", "alyssa"], relation: "spouse", order: 1 },
      {
        id: "mini-unknown",
        partners: ["mini", "unknown"],
        relation: "unknown",
        status: "unknown",
        order: 3,
      },
    ],
    parentChildLinks: [
      { id: "henry-mini", groupId: "henry-alyssa", parentId: "henry", childId: "mini", order: 2 },
      { id: "alyssa-mini", groupId: "henry-alyssa", parentId: "alyssa", childId: "mini", order: 2 },
      { id: "henry-micro", groupId: "henry-alyssa", parentId: "henry", childId: "micro", order: 2 },
      { id: "alyssa-micro", groupId: "henry-alyssa", parentId: "alyssa", childId: "micro", order: 2 },
      { id: "mini-extra", groupId: "mini-unknown", parentId: "mini", childId: "extra", order: 4 },
    ],
  };

  const layout = buildFamilyTreeLayout({
    graph,
    estimatedCardSize: { width: 88, height: 64 },
    measurements: {
      alyssa: { width: 88, height: 64 },
      extra: { width: 88, height: 64 },
      henry: { width: 88, height: 64 },
      micro: { width: 88, height: 64 },
      mini: { width: 88, height: 64 },
      unknown: { width: 88, height: 64 },
    },
    spacing: {
      column: 20,
      padding: 32,
      row: 40,
    },
  });
  const micro = layout.cards.find((card) => card.personId === "micro");
  const mini = layout.cards.find((card) => card.personId === "mini");
  const unknown = layout.cards.find((card) => card.personId === "unknown");
  const extra = layout.cards.find((card) => card.personId === "extra");

  expect(micro).toBeDefined();
  expect(mini).toBeDefined();
  expect(unknown).toBeDefined();
  expect(extra).toBeDefined();
  expect(micro!.x).toBeLessThan(mini!.x);
  expect(mini!.x).toBeLessThan(unknown!.x);
  expect(extra!.x + extra!.width / 2).toBe((mini!.x + mini!.width + unknown!.x) / 2);
});

test("graph mode renders a direct parent only as parent, not sibling", () => {
  const graph: FamilyGraph = {
    subject: "child",
    people: {
      child: { name: "Child" },
      parentA: { name: "Parent A" },
      parentB: { name: "Parent B" },
    },
    partnershipGroups: [],
    parentChildLinks: [
      { groupId: "parents", parentId: "parentA", childId: "child" },
      { groupId: "parents", parentId: "parentB", childId: "child" },
      { groupId: "grandparent-line", parentId: "parentB", childId: "parentA" },
    ],
  };

  const layout = buildFamilyTreeLayout({ graph });
  const parentCards = layout.cards.filter((card) => card.personId === "parentA");

  expect(parentCards).toHaveLength(1);
  expect(parentCards[0]?.relation.label).toBe("parent");
});

test("graph mode renders a partner only as partner when inferred parentage also makes them sibling", () => {
  const graph: FamilyGraph = {
    subject: "root",
    people: {
      root: { name: "Root" },
      partner: { name: "Partner" },
      inferredParent: { name: "Parent" },
    },
    partnershipGroups: [{ id: "couple", partners: ["root", "partner"], relation: "spouse" }],
    parentChildLinks: [
      { groupId: "shared-parent", parentId: "inferredParent", childId: "root" },
      { groupId: "shared-parent", parentId: "inferredParent", childId: "partner" },
    ],
  };

  const layout = buildFamilyTreeLayout({ graph });
  const partnerCards = layout.cards.filter((card) => card.personId === "partner");

  expect(partnerCards).toHaveLength(1);
  expect(partnerCards[0]?.relation.label).toBe("partner");
});

test("graph mode renders an explicit partner once when lateral parentage also reaches them", () => {
  const graph: FamilyGraph = {
    subject: "root",
    people: {
      root: { name: "Root" },
      parent: { name: "Parent" },
      partner: { name: "Partner" },
      halfSibling: { name: "Half Sibling" },
      child: { name: "Child" },
    },
    partnershipGroups: [{ id: "root-partner", partners: ["root", "partner"], relation: "partner" }],
    parentChildLinks: [
      { groupId: "root-parentage", parentId: "parent", childId: "root" },
      { groupId: "half-sibling-parentage", parentId: "parent", childId: "halfSibling" },
      { groupId: "half-sibling-parentage", parentId: "partner", childId: "halfSibling" },
      { groupId: "root-partner", parentId: "root", childId: "child" },
      { groupId: "root-partner", parentId: "partner", childId: "child" },
    ],
  };

  const layout = buildFamilyTreeLayout({
    graph,
    limits: { lateralFamilyGenerations: 1 },
  });
  const personIds = layout.cards.map((card) => card.personId);
  const partnerCards = layout.cards.filter((card) => card.personId === "partner");

  expect(new Set(personIds).size).toBe(personIds.length);
  expect(partnerCards).toHaveLength(1);
  expect(partnerCards[0]?.relation.label).toBe("partner");
  expect(layout.cards.find((card) => card.personId === "halfSibling")?.relation.label).toBe("half-sibling");
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
