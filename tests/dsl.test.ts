import { describe, expect, test } from "bun:test";

import { buildFamilyTreeLayout, buildOrgChartLayout, createFamilyTree, createOrgTree } from "../src/index";

describe("createFamilyTree", () => {
  test("compiles visual family syntax into people and relationships", () => {
    const family = createFamilyTree(`
      subject henry
      carol["Carol"] + james["James"] -> henry["Henry"]
      henry + emma["Emma"] -> ava["Ava"]
    `);

    expect(family.subject).toBe("henry");
    expect(family.people.henry?.name).toBe("Henry");
    expect(family.people.emma?.profile.display).toBe("Emma");
    expect(family.relationships).toEqual([
      {
        type: "parentage",
        parents: ["carol", "james"],
        children: ["henry"],
        relation: "biological",
      },
      {
        type: "parentage",
        parents: ["henry", "emma"],
        children: ["ava"],
        relation: "biological",
      },
    ]);

    const layout = buildFamilyTreeLayout(family);
    expect(layout.cards.map((card) => card.personId)).toEqual(["carol", "james", "henry", "emma", "ava"]);
    expect(layout.edges).toHaveLength(4);
  });

  test("supports partnership, guardian, metadata, and custom person mapping", () => {
    const family = createFamilyTree(
      `
        subject quinn
        alex["Alex"] + jordan["Jordan"] : spouse
        alex + jordan -> quinn["Quinn"] : adoptive
        robin["Robin"] -> quinn : guardian
      `,
      {
        person: (node) => ({
          id: node.id,
          displayName: node.name,
        }),
      },
    );

    expect(family.people.quinn?.displayName).toBe("Quinn");
    expect(family.relationships).toEqual([
      {
        type: "partnership",
        partners: ["alex", "jordan"],
        relation: "spouse",
        status: "current",
      },
      {
        type: "parentage",
        parents: ["alex", "jordan"],
        children: ["quinn"],
        relation: "adoptive",
      },
      {
        type: "guardianship",
        guardians: ["robin"],
        children: ["quinn"],
        relation: "guardian",
      },
    ]);
  });

  test("throws clear validation errors", () => {
    expect(() =>
      createFamilyTree(`
        subject henry
        henry["Henry"]
        henry["Other Henry"]
      `),
    ).toThrow('Line 4: Node "henry" has conflicting labels.');

    expect(() => createFamilyTree(`henry["Henry"]`)).toThrow(
      "Family tree DSL requires `subject id` or the `{ subject }` option.",
    );
  });
});

describe("createOrgTree", () => {
  test("compiles reporting syntax into org chart nodes", () => {
    const org = createOrgTree(`
      root avery
      avery["Avery", role="CEO"] -> morgan["Morgan", role="Product"] + casey["Casey", role="Engineering"]
      casey -> river["River", role="Web"]
    `);

    expect(org.rootId).toBe("avery");
    expect(org.nodes).toEqual([
      { id: "avery", person: expect.objectContaining({ name: "Avery", role: "CEO" }), parentId: null, order: 0 },
      { id: "morgan", person: expect.objectContaining({ name: "Morgan", role: "Product" }), parentId: "avery", order: 0 },
      { id: "casey", person: expect.objectContaining({ name: "Casey", role: "Engineering" }), parentId: "avery", order: 1 },
      { id: "river", person: expect.objectContaining({ name: "River", role: "Web" }), parentId: "casey", order: 0 },
    ]);

    const layout = buildOrgChartLayout(org);
    expect(layout.edges.map((edge) => edge.id).toSorted()).toEqual(["avery->casey", "avery->morgan", "casey->river"]);
  });

  test("rejects ambiguous roots and cycles", () => {
    expect(() =>
      createOrgTree(`
        avery["Avery"] -> morgan["Morgan"]
        casey["Casey"]
      `),
    ).toThrow("Org tree has multiple roots: avery, casey. Add `root avery`.");

    expect(() =>
      createOrgTree(`
        root avery
        avery["Avery"] -> morgan["Morgan"]
        morgan -> avery
      `),
    ).toThrow("Org chart contains a cycle involving");
  });
});
