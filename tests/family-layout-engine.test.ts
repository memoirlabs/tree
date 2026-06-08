import { expect, test } from "bun:test";

import { layoutFamilyTree } from "../src/index";
import type { FamilyLayoutResult } from "../src/index";

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
  expectNoOverlaps(result);
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
  expectNoOverlaps(result);
});
