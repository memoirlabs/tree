import { expect, test } from "bun:test";

import { createFamilyLayoutService, createUnionParentLinks, layoutFamilyTree } from "../src/index";
import type { FamilyLayoutResult } from "../src/index";

type Person = { name: string };
type UnionData = { householdId: string; role: "current" | "former" };

const people = {
  alex: { name: "Alex" },
  jordan: { name: "Jordan" },
  morgan: { name: "Morgan" },
  riley: { name: "Riley" },
  casey: { name: "Casey" },
};

function person(result: FamilyLayoutResult<Person>, id: string) {
  const node = result.people.find((candidate) => candidate.id === id);
  expect(node).toBeDefined();
  return node!;
}

function union(result: FamilyLayoutResult<Person>, id: string) {
  const node = result.unions.find((candidate) => candidate.id === id);
  expect(node).toBeDefined();
  return node!;
}

function centerX(node: { x: number; width: number }) {
  return node.x + node.width / 2;
}

test("layoutFamilyTree keeps old-style unions and parent links available as lower-level nodes", () => {
  const result = layoutFamilyTree<Person>({
    people,
    center: "alex",
    unions: [
      {
        id: "u_alex_jordan",
        partners: ["alex", "jordan"],
        children: ["riley"],
        order: 1,
      },
      {
        id: "u_alex_morgan",
        partners: ["alex", "morgan"],
        children: ["casey"],
        order: 2,
      },
    ],
    options: {
      personSize: { width: 120, height: 56 },
      spacing: { rank: 92, person: 28, padding: 40 },
    },
  });

  const alex = person(result, "alex");
  const jordan = person(result, "jordan");
  const riley = person(result, "riley");
  const alexJordan = union(result, "u_alex_jordan");

  expect(result.warnings).toEqual([]);
  expect(result.graph.partnershipGroups.map((group) => group.id)).toEqual(["u_alex_jordan", "u_alex_morgan"]);
  expect(alex.rank).toBe(0);
  expect(jordan.rank).toBe(0);
  expect(riley.rank).toBe(1);
  expect(alexJordan.children).toEqual(["riley"]);
  expect(centerX(alexJordan)).toBeGreaterThanOrEqual(Math.min(centerX(alex), centerX(jordan)));
  expect(result.edges.map((edge) => edge.kind)).toEqual(
    expect.arrayContaining(["partner-union", "union-child"]),
  );
  expect(result.edges.some((edge) => edge.from === "u_alex_jordan" && edge.to === "riley")).toBe(true);
});

test("layoutFamilyTree creates synthetic people and unions for ungrouped parent links", () => {
  const result = layoutFamilyTree<Person>({
    people: {
      alex: { name: "Alex" },
      riley: { name: "Riley" },
    },
    center: "alex",
    parentLinks: [
      { parent: "alex", child: "riley", kind: "biological" },
      { parent: "unknown_parent", child: "riley", kind: "unknown" },
    ],
  });

  expect(person(result, "unknown_parent").synthetic).toBe(true);
  expect(union(result, "u:alex+unknown_parent").synthetic).toBe(true);
  expect(result.warnings.map((item) => item.code)).toEqual([
    "synthetic-person-created",
    "synthetic-union-created",
  ]);
  expect(result.graph.parentChildLinks.map((link) => [link.parentId, link.childId, link.groupId])).toEqual([
    ["alex", "riley", "u:alex+unknown_parent"],
    ["unknown_parent", "riley", "u:alex+unknown_parent"],
  ]);
});

test("createFamilyLayoutService exposes graph conversion without rendering React", () => {
  const service = createFamilyLayoutService({
    personSize: { width: 144, height: 64 },
  });
  const graph = service.toGraph<Person>({
    people,
    center: "alex",
    unions: [{ id: "u1", partners: ["alex", "jordan"], children: ["riley"], kind: "marriage" }],
  });
  const result = service.layout<Person>({
    people,
    center: "alex",
    unions: [{ id: "u1", partners: ["alex", "jordan"], children: ["riley"], kind: "marriage" }],
  });

  expect(graph.subject).toBe("alex");
  expect(graph.partnershipGroups[0]).toMatchObject({ id: "u1", relation: "spouse" });
  expect(result.people.find((node) => node.id === "alex")?.width).toBe(144);
  expect(result.edges.find((edge) => edge.id === "partner-union:alex:u1")?.path.startsWith("M ")).toBe(true);
});

test("union-owned children render from the union entity, not either parent card", () => {
  const result = layoutFamilyTree<Person, UnionData>({
    people,
    center: "alex",
    unions: [
      {
        id: "u_primary",
        partners: ["alex", "jordan"],
        children: ["riley"],
        data: { householdId: "home-1", role: "current" },
      },
    ],
  });

  expect(union(result, "u_primary").data).toEqual({ householdId: "home-1", role: "current" });
  expect(result.graph.partnershipGroups[0]?.data).toEqual({ householdId: "home-1", role: "current" });
  expect(result.graph.parentChildLinks.map((link) => [link.parentId, link.childId, link.groupId])).toEqual([
    ["alex", "riley", "u_primary"],
    ["jordan", "riley", "u_primary"],
  ]);
  expect(result.edges.find((edge) => edge.id === "union-child:u_primary:riley")).toMatchObject({
    from: "u_primary",
    to: "riley",
    kind: "union-child",
    relation: "unknown",
  });
  expect(result.edges.some((edge) => edge.kind === "parent-child" && edge.to === "riley")).toBe(false);
});

test("parent links that reference a union repair that union and route the child from it", () => {
  const result = layoutFamilyTree<Person>({
    people,
    center: "alex",
    unions: [{ id: "u_alex_jordan", partners: ["alex", "jordan"], order: 1 }],
    parentLinks: [
      { parent: "alex", child: "riley", union: "u_alex_jordan", kind: "biological" },
      { parent: "jordan", child: "riley", union: "u_alex_jordan", kind: "adoptive" },
    ],
  });

  expect(union(result, "u_alex_jordan").children).toEqual(["riley"]);
  expect(result.graph.parentChildLinks.map((link) => [link.parentId, link.childId, link.groupId, link.relation])).toEqual([
    ["alex", "riley", "u_alex_jordan", "biological"],
    ["jordan", "riley", "u_alex_jordan", "adoptive"],
  ]);
  expect(result.edges.find((edge) => edge.id === "union-child:u_alex_jordan:riley")).toMatchObject({
    from: "u_alex_jordan",
    to: "riley",
    relation: "mixed",
  });
});

test("multiple unions for one parent stay separate when adding children", () => {
  const result = layoutFamilyTree<Person>({
    people,
    center: "alex",
    unions: [
      { id: "u_alex_jordan", partners: ["alex", "jordan"], order: 1 },
      { id: "u_alex_morgan", partners: ["alex", "morgan"], order: 2 },
    ],
    parentLinks: [
      { parent: "alex", child: "riley", union: "u_alex_jordan", kind: "biological" },
      { parent: "jordan", child: "riley", union: "u_alex_jordan", kind: "biological" },
      { parent: "alex", child: "casey", union: "u_alex_morgan", kind: "biological" },
      { parent: "morgan", child: "casey", union: "u_alex_morgan", kind: "biological" },
    ],
  });

  expect(union(result, "u_alex_jordan").children).toEqual(["riley"]);
  expect(union(result, "u_alex_morgan").children).toEqual(["casey"]);
  expect(result.edges.find((edge) => edge.id === "union-child:u_alex_jordan:riley")).toBeDefined();
  expect(result.edges.find((edge) => edge.id === "union-child:u_alex_morgan:casey")).toBeDefined();
  expect(result.edges.find((edge) => edge.id === "union-child:u_alex_jordan:casey")).toBeUndefined();
  expect(result.edges.find((edge) => edge.id === "union-child:u_alex_morgan:riley")).toBeUndefined();
});

test("createUnionParentLinks supports add-child flows from a selected union context", () => {
  const alexJordan = { id: "u_alex_jordan", partners: ["alex", "jordan"] };
  const result = layoutFamilyTree<Person>({
    people,
    center: "alex",
    unions: [alexJordan],
    parentLinks: createUnionParentLinks(alexJordan, "riley", {
      kind: {
        alex: "biological",
        jordan: "step",
      },
    }),
  });

  expect(result.graph.parentChildLinks.map((link) => [link.parentId, link.childId, link.groupId, link.relation])).toEqual([
    ["alex", "riley", "u_alex_jordan", "biological"],
    ["jordan", "riley", "u_alex_jordan", "step"],
  ]);
  expect(result.edges.find((edge) => edge.id === "union-child:u_alex_jordan:riley")).toMatchObject({
    from: "u_alex_jordan",
    relation: "mixed",
  });
});

test("ungrouped parent links do not guess among a parent's existing unions", () => {
  const result = layoutFamilyTree<Person>({
    people,
    center: "alex",
    unions: [
      { id: "u_alex_jordan", partners: ["alex", "jordan"] },
      { id: "u_alex_morgan", partners: ["alex", "morgan"] },
    ],
    parentLinks: [{ parent: "alex", child: "riley", kind: "biological" }],
  });

  expect(result.graph.parentChildLinks).toEqual([
    expect.objectContaining({ parentId: "alex", childId: "riley", groupId: "u:alex" }),
  ]);
  expect(union(result, "u:alex").synthetic).toBe(true);
  expect(result.edges.find((edge) => edge.id === "union-child:u:alex:riley")).toBeDefined();
  expect(result.edges.find((edge) => edge.id === "union-child:u_alex_jordan:riley")).toBeUndefined();
  expect(result.edges.find((edge) => edge.id === "union-child:u_alex_morgan:riley")).toBeUndefined();
});
