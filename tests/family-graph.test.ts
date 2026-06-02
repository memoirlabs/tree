import { expect, test } from "bun:test";

import { buildFamilyTreeLayout, collectFamilyNeighborhood, createFamilyIndex, graphToFamilyRelationships, rel } from "../src/index";
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
  expect(childEdges[0]?.id).toContain("parentage-alex-blair-children-biological");
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
