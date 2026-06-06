import { expect, test } from "bun:test";

import { resolveTreeInitialViewport } from "../src/tree/core/TreeSurface";

function container(overrides: Partial<HTMLDivElement> = {}) {
  return {
    clientHeight: 300,
    clientWidth: 400,
    scrollHeight: 900,
    scrollWidth: 1200,
    ...overrides,
  } as HTMLDivElement;
}

test("defaults uncontrolled tree viewport to the anchor card", () => {
  const viewport = resolveTreeInitialViewport({
    cards: [
      {
        personId: "root",
        person: {},
        x: 700,
        y: 300,
        width: 100,
        height: 80,
      },
    ],
    container: container(),
    defaultViewport: undefined,
    initialViewport: undefined,
    subject: "root",
  });

  expect(viewport).toEqual({ x: 550, y: 190 });
});

test("uses defaultViewport before anchor centering", () => {
  const viewport = resolveTreeInitialViewport({
    cards: [
      {
        personId: "root",
        person: {},
        x: 700,
        y: 300,
        width: 100,
        height: 80,
      },
    ],
    container: container(),
    defaultViewport: { x: 80, y: 40 },
    initialViewport: undefined,
    subject: "root",
  });

  expect(viewport).toEqual({ x: 80, y: 40 });
});

test("reset viewport resolver uses the same default anchor centering", () => {
  const viewport = resolveTreeInitialViewport({
    cards: [
      {
        personId: "subject",
        person: {},
        x: 600,
        y: 450,
        width: 160,
        height: 90,
      },
    ],
    container: container({ clientWidth: 500, clientHeight: 320 }),
    defaultViewport: undefined,
    initialViewport: undefined,
    subject: "subject",
  });

  expect(viewport).toEqual({ x: 430, y: 335 });
});
