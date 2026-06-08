import { expect, test } from "bun:test";

import { layoutFamilyTree } from "../src/index";
import type { FamilyLayoutResult } from "../src/index";
import {
  buildFamilyLayoutGraph,
  normalizeFamilyLayoutInput,
  resolveFamilyLayoutOptions,
} from "../src/layout/family";
import { buildFamilyLayoutPlan } from "../src/layout";

type Person = { name: string };

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

function rectanglesOverlap(
  a: { height: number; width: number; x: number; y: number },
  b: { height: number; width: number; x: number; y: number },
) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function expectNoOverlaps(result: FamilyLayoutResult<Person>) {
  for (let aIndex = 0; aIndex < result.nodes.length; aIndex += 1) {
    for (let bIndex = aIndex + 1; bIndex < result.nodes.length; bIndex += 1) {
      const a = result.nodes[aIndex];
      const b = result.nodes[bIndex];
      expect(a && b ? rectanglesOverlap(a, b) : false).toBe(false);
    }
  }
}

function expectLayoutInvariants(result: FamilyLayoutResult<Person>) {
  const ids = new Set(result.nodes.map((node) => node.id));
  for (const node of result.nodes) {
    expect(node.x).toBeGreaterThanOrEqual(result.bounds.minX);
    expect(node.y).toBeGreaterThanOrEqual(result.bounds.minY);
    expect(node.x + node.width).toBeLessThanOrEqual(result.bounds.maxX);
    expect(node.y + node.height).toBeLessThanOrEqual(result.bounds.maxY);
  }
  for (const edge of result.edges) {
    expect(ids.has(edge.from)).toBe(true);
    expect(ids.has(edge.to)).toBe(true);
    expect(edge.path.startsWith("M ")).toBe(true);
    for (const point of edge.points) {
      expect(point.x).toBeGreaterThanOrEqual(result.bounds.minX);
      expect(point.x).toBeLessThanOrEqual(result.bounds.maxX);
      expect(point.y).toBeGreaterThanOrEqual(result.bounds.minY);
      expect(point.y).toBeLessThanOrEqual(result.bounds.maxY);
    }
  }
  expectNoOverlaps(result);
}

function structuralSignature(result: FamilyLayoutResult<Person>) {
  return {
    edges: result.edges.map((edge) => [edge.kind, edge.from, edge.to, edge.relation ?? ""]),
    nodes: result.nodes.map((node) => [node.kind, node.id, node.rank, node.order]),
  };
}

test("lays out a center person with two unions and children through real union nodes", () => {
  const result = layoutFamilyTree<Person>({
    people: {
      alex: { name: "Alex" },
      jordan: { name: "Jordan" },
      morgan: { name: "Morgan" },
      riley: { name: "Riley" },
      casey: { name: "Casey" },
    },
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
  });

  const alex = person(result, "alex");
  const jordan = person(result, "jordan");
  const morgan = person(result, "morgan");
  const riley = person(result, "riley");
  const casey = person(result, "casey");
  const alexJordan = union(result, "u_alex_jordan");
  const alexMorgan = union(result, "u_alex_morgan");

  expect(result.warnings).toEqual([]);
  expect(alex.rank).toBe(0);
  expect(jordan.rank).toBe(0);
  expect(morgan.rank).toBe(0);
  expect(alexJordan.rank).toBe(1);
  expect(alexMorgan.rank).toBe(1);
  expect(riley.rank).toBe(2);
  expect(casey.rank).toBe(2);
  expect(alexJordan.y).toBeGreaterThan(alex.y);
  expect(alexMorgan.y).toBeGreaterThan(alex.y);
  expect(riley.y).toBeGreaterThan(alexJordan.y);
  expect(casey.y).toBeGreaterThan(alexMorgan.y);
  expect(centerX(alexJordan)).toBeLessThan(centerX(alexMorgan));
  expect(centerX(riley)).toBeLessThan(centerX(casey));
  expect(centerX(alexJordan)).toBeGreaterThanOrEqual(Math.min(centerX(alex), centerX(jordan)));
  expect(Math.abs(centerX(alexJordan) - centerX(riley))).toBeLessThan(riley.width / 2);
  expect(centerX(alexMorgan)).toBeGreaterThanOrEqual((centerX(alex) + centerX(morgan)) / 2);
  expect(Math.abs(centerX(alexMorgan) - centerX(casey))).toBeLessThan(casey.width / 2);
  expect(result.edges.map((edge) => edge.kind)).toEqual([
    "partner-union",
    "partner-union",
    "union-child",
    "partner-union",
    "partner-union",
    "union-child",
  ]);
  expectLayoutInvariants(result);
});

test("normalizes missing people and parent links into synthetic union graph facts", () => {
  const result = layoutFamilyTree<Person>({
    people: {
      alex: { name: "Alex" },
      riley: { name: "Riley" },
    },
    center: "alex",
    parentLinks: [
      {
        parent: "alex",
        child: "riley",
        kind: "biological",
      },
      {
        parent: "unknown_parent",
        child: "riley",
        kind: "unknown",
      },
    ],
  });

  const syntheticParent = person(result, "unknown_parent");
  const syntheticUnion = union(result, "u:alex+unknown_parent");
  const riley = person(result, "riley");

  expect(syntheticParent.synthetic).toBe(true);
  expect(syntheticUnion.synthetic).toBe(true);
  expect(syntheticUnion.partners).toEqual(["alex", "unknown_parent"]);
  expect(syntheticUnion.children).toEqual(["riley"]);
  expect(riley.parentUnions).toEqual(["u:alex+unknown_parent"]);
  expect(result.edges.some((edge) => edge.kind === "union-child" && edge.to === "riley")).toBe(true);
  expect(result.warnings.map((item) => item.code)).toEqual([
    "synthetic-person-created",
    "synthetic-union-created",
  ]);
  expectLayoutInvariants(result);
});

test("groups parent links with the same parent set into one synthetic union", () => {
  const result = layoutFamilyTree<Person>({
    people: {
      alex: { name: "Alex" },
      jordan: { name: "Jordan" },
      riley: { name: "Riley" },
      casey: { name: "Casey" },
    },
    center: "alex",
    parentLinks: [
      { parent: "alex", child: "riley", kind: "biological" },
      { parent: "jordan", child: "riley", kind: "biological" },
      { parent: "alex", child: "casey", kind: "biological" },
      { parent: "jordan", child: "casey", kind: "biological" },
    ],
  });

  const syntheticUnion = union(result, "u:alex+jordan");

  expect(result.unions).toHaveLength(1);
  expect(syntheticUnion.partners).toEqual(["alex", "jordan"]);
  expect(syntheticUnion.children).toEqual(["riley", "casey"]);
  expect(result.edges.filter((edge) => edge.kind === "union-child")).toHaveLength(2);
  expect(result.warnings.map((item) => item.code)).toEqual(["synthetic-union-created"]);
  expectLayoutInvariants(result);
});

test("warns and drops parent links that reference missing union ids", () => {
  const result = layoutFamilyTree<Person>({
    people: {
      alex: { name: "Alex" },
      riley: { name: "Riley" },
    },
    center: "alex",
    parentLinks: [{ parent: "alex", child: "riley", union: "missing_union", kind: "biological" }],
  });

  expect(result.unions).toEqual([]);
  expect(result.edges).toEqual([]);
  expect(result.warnings.map((item) => item.code)).toEqual([
    "missing-union",
    "disconnected-component",
  ]);
  expectLayoutInvariants(result);
});

test("handles empty people as an empty layout and rejects invalid people input", () => {
  const empty = layoutFamilyTree<Person>({ people: {} });

  expect(empty.nodes).toEqual([]);
  expect(empty.edges).toEqual([]);
  expect(empty.bounds).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 });
  expect(empty.warnings).toEqual([]);
  expect(() => layoutFamilyTree({ people: null as unknown as Record<string, unknown> })).toThrow(
    "layoutFamilyTree requires a people object.",
  );
});

test("builds a geometry-free family plan before coordinate realization", () => {
  const options = resolveFamilyLayoutOptions({
    personSize: { width: 999, height: 333 },
    unionSize: { width: 77, height: 77 },
    spacing: { rank: 400, person: 200 },
  });
  const normalized = normalizeFamilyLayoutInput<Person>(
    {
      people: {
        alex: { name: "Alex" },
        jordan: { name: "Jordan" },
        riley: { name: "Riley" },
      },
      center: "alex",
      unions: [{ id: "u1", partners: ["alex", "jordan"], children: ["riley"] }],
    },
    options,
  );
  const graph = buildFamilyLayoutGraph(normalized);
  const plan = buildFamilyLayoutPlan(graph, "alex");

  expect(plan.layers).toEqual([
    { rank: 0, nodeIds: ["alex", "jordan"] },
    { rank: 1, nodeIds: ["u1"] },
    { rank: 2, nodeIds: ["riley"] },
  ]);
  expect(plan.edges.map((edge) => [edge.kind, edge.from, edge.to])).toEqual([
    ["partner-union", "alex", "u1"],
    ["partner-union", "jordan", "u1"],
    ["union-child", "u1", "riley"],
  ]);
  for (const node of plan.nodes) {
    expect("x" in node).toBe(false);
    expect("y" in node).toBe(false);
    expect("width" in node).toBe(false);
    expect("height" in node).toBe(false);
  }
});

test("keeps structural layout stable when card geometry changes", () => {
  const input = {
    people: {
      alex: { name: "Alex" },
      jordan: { name: "Jordan" },
      riley: { name: "Riley" },
    },
    center: "alex",
    unions: [{ id: "u1", partners: ["alex", "jordan"], children: ["riley"] }],
  };
  const compact = layoutFamilyTree<Person>({
    ...input,
    options: {
      personSize: { width: 120, height: 44 },
      unionSize: { width: 12, height: 12 },
      spacing: { person: 12, union: 12, rank: 60 },
    },
  });
  const roomy = layoutFamilyTree<Person>({
    ...input,
    options: {
      personSize: { width: 280, height: 120 },
      unionSize: { width: 40, height: 40 },
      spacing: { person: 80, union: 80, rank: 180 },
    },
  });

  expect(structuralSignature(compact)).toEqual(structuralSignature(roomy));
  expect(roomy.bounds.width).toBeGreaterThan(compact.bounds.width);
  expect(roomy.bounds.height).toBeGreaterThan(compact.bounds.height);
  expectLayoutInvariants(compact);
  expectLayoutInvariants(roomy);
});

test("supports single-parent unions without inventing a partner when none is needed", () => {
  const result = layoutFamilyTree<Person>({
    people: {
      morgan: { name: "Morgan" },
      drew: { name: "Drew" },
    },
    center: "morgan",
    unions: [{ id: "u_single_morgan", partners: ["morgan"], children: ["drew"] }],
  });

  const morgan = person(result, "morgan");
  const drew = person(result, "drew");
  const singleUnion = union(result, "u_single_morgan");

  expect(result.warnings).toEqual([]);
  expect(singleUnion.partners).toEqual(["morgan"]);
  expect(singleUnion.children).toEqual(["drew"]);
  expect(singleUnion.y).toBeGreaterThan(morgan.y);
  expect(drew.y).toBeGreaterThan(singleUnion.y);
  expect(result.edges.map((edge) => [edge.kind, edge.from, edge.to])).toEqual([
    ["partner-union", "morgan", "u_single_morgan"],
    ["union-child", "u_single_morgan", "drew"],
  ]);
  expectLayoutInvariants(result);
});

test("supports multi-partner unions as one structural family unit", () => {
  const result = layoutFamilyTree<Person>({
    people: {
      alex: { name: "Alex" },
      blair: { name: "Blair" },
      casey: { name: "Casey" },
      drew: { name: "Drew" },
    },
    center: "alex",
    unions: [{ id: "u_multi", partners: ["alex", "blair", "casey"], children: ["drew"] }],
  });

  const multiUnion = union(result, "u_multi");
  const drew = person(result, "drew");

  expect(result.warnings).toEqual([]);
  expect(multiUnion.partners).toEqual(["alex", "blair", "casey"]);
  expect(multiUnion.children).toEqual(["drew"]);
  expect(drew.rank).toBe(2);
  expect(result.edges.map((edge) => [edge.kind, edge.from, edge.to])).toEqual([
    ["partner-union", "alex", "u_multi"],
    ["partner-union", "blair", "u_multi"],
    ["partner-union", "casey", "u_multi"],
    ["union-child", "u_multi", "drew"],
  ]);
  expectLayoutInvariants(result);
});

test("can keep synthetic unknown people hidden when configured", () => {
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
    options: {
      unknownPerson: {
        enabled: false,
      },
    },
  });

  const unknown = person(result, "unknown_parent");

  expect(unknown.synthetic).toBe(true);
  expect(unknown.hidden).toBe(true);
  expect(unknown.width).toBe(0);
  expect(unknown.height).toBe(0);
  expect(result.warnings.map((item) => item.code)).toEqual([
    "synthetic-person-created",
    "synthetic-union-created",
  ]);
  expectLayoutInvariants(result);
});

test("supports centering the structural plan on a union node", () => {
  const result = layoutFamilyTree<Person>({
    people: {
      alex: { name: "Alex" },
      jordan: { name: "Jordan" },
      riley: { name: "Riley" },
    },
    center: "u1",
    unions: [{ id: "u1", partners: ["alex", "jordan"], children: ["riley"] }],
  });

  const alex = person(result, "alex");
  const jordan = person(result, "jordan");
  const riley = person(result, "riley");
  const centeredUnion = union(result, "u1");

  expect(centeredUnion.rank).toBe(0);
  expect(alex.rank).toBe(-1);
  expect(jordan.rank).toBe(-1);
  expect(riley.rank).toBe(1);
  expect(centeredUnion.y).toBeGreaterThan(alex.y);
  expect(riley.y).toBeGreaterThan(centeredUnion.y);
  expectLayoutInvariants(result);
});

test("repairs parent links that reference existing unions with incomplete partner and child lists", () => {
  const result = layoutFamilyTree<Person>({
    people: {
      alex: { name: "Alex" },
      jordan: { name: "Jordan" },
      riley: { name: "Riley" },
    },
    center: "alex",
    unions: [{ id: "u1", partners: ["alex"], children: [] }],
    parentLinks: [
      { parent: "alex", child: "riley", union: "u1", kind: "biological" },
      { parent: "jordan", child: "riley", union: "u1", kind: "step" },
    ],
  });

  const repairedUnion = union(result, "u1");
  const riley = person(result, "riley");

  expect(repairedUnion.partners).toEqual(["alex", "jordan"]);
  expect(repairedUnion.children).toEqual(["riley"]);
  expect(riley.parentUnions).toEqual(["u1"]);
  expect(result.edges.find((edge) => edge.kind === "union-child" && edge.to === "riley")?.relation).toBe("mixed");
  expect(result.warnings.map((item) => item.code)).toEqual(["invalid-parent-link"]);
  expectLayoutInvariants(result);
});

test("deduplicates repeated children and parent links without duplicating edges", () => {
  const result = layoutFamilyTree<Person>({
    people: {
      alex: { name: "Alex" },
      jordan: { name: "Jordan" },
      riley: { name: "Riley" },
    },
    center: "alex",
    unions: [{ id: "u1", partners: ["alex", "jordan"], children: ["riley", "riley"] }],
    parentLinks: [
      { parent: "alex", child: "riley", union: "u1", kind: "biological" },
      { parent: "alex", child: "riley", union: "u1", kind: "biological" },
    ],
  });

  expect(union(result, "u1").children).toEqual(["riley"]);
  expect(result.edges.filter((edge) => edge.kind === "union-child" && edge.to === "riley")).toHaveLength(1);
  expect(result.warnings.map((item) => item.code)).toEqual([
    "duplicate-child-in-union",
    "duplicate-parent-link",
  ]);
  expectLayoutInvariants(result);
});

test("places disconnected components with warnings instead of failing", () => {
  const result = layoutFamilyTree<Person>({
    people: {
      alex: { name: "Alex" },
      jordan: { name: "Jordan" },
      riley: { name: "Riley" },
      morgan: { name: "Morgan" },
      casey: { name: "Casey" },
      drew: { name: "Drew" },
    },
    center: "alex",
    unions: [
      { id: "u1", partners: ["alex", "jordan"], children: ["riley"] },
      { id: "u2", partners: ["morgan", "casey"], children: ["drew"] },
    ],
  });

  expect(result.warnings.map((item) => item.code)).toEqual([
    "disconnected-component",
    "disconnected-component",
    "disconnected-component",
    "disconnected-component",
  ]);
  expect(result.people.map((node) => node.id).toSorted()).toEqual([
    "alex",
    "casey",
    "drew",
    "jordan",
    "morgan",
    "riley",
  ]);
  expect(result.unions.map((node) => node.id).toSorted()).toEqual(["u1", "u2"]);
  expectLayoutInvariants(result);
});

test("detects directed family cycles and still returns a bounded layout", () => {
  const result = layoutFamilyTree<Person>({
    people: {
      alex: { name: "Alex" },
      riley: { name: "Riley" },
    },
    center: "alex",
    unions: [
      { id: "u1", partners: ["alex"], children: ["riley"] },
      { id: "u2", partners: ["riley"], children: ["alex"] },
    ],
  });

  expect(result.warnings.map((item) => item.code)).toContain("cycle-detected");
  expect(result.warnings.map((item) => item.code)).toContain("rank-conflict");
  expect(result.nodes).toHaveLength(4);
  expect(result.edges).toHaveLength(4);
  expectLayoutInvariants(result);
});

test("keeps generated multi-generation families deterministic and bounded", () => {
  const people: Record<string, Person> = {
    root: { name: "Root" },
  };
  const unions: Array<{ id: string; partners: string[]; children: string[]; order?: number }> = [];
  const frontier = ["root"];
  let nextId = 0;

  for (let generation = 0; generation < 3; generation += 1) {
    const current = [...frontier];
    frontier.length = 0;
    current.forEach((parentId, parentIndex) => {
      const partnerId = `partner_${generation}_${parentIndex}`;
      const childA = `child_${nextId++}`;
      const childB = `child_${nextId++}`;
      people[partnerId] = { name: partnerId };
      people[childA] = { name: childA };
      people[childB] = { name: childB };
      unions.push({
        id: `u_${generation}_${parentIndex}`,
        partners: [parentId, partnerId],
        children: [childA, childB],
        order: unions.length,
      });
      frontier.push(childA, childB);
    });
  }

  const first = layoutFamilyTree<Person>({ people, center: "root", unions });
  const second = layoutFamilyTree<Person>({ people, center: "root", unions });

  expect(first.warnings).toEqual([]);
  expect(structuralSignature(first)).toEqual(structuralSignature(second));
  expect(first.people).toHaveLength(Object.keys(people).length);
  expect(first.unions).toHaveLength(unions.length);
  expect(first.edges).toHaveLength(unions.reduce((count, item) => count + item.partners.length + item.children.length, 0));
  expectLayoutInvariants(first);
  expectLayoutInvariants(second);
});
