import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import {
  FamilyTree,
  TreeCanvas,
  TreeEdges,
  TreeNodeLayer,
  TreeProvider,
  buildFamilyTreeLayout,
  buildOrgChartLayout,
  createOrgChart,
  rel,
  useTreeLayout,
} from "../src/index";
import type { FamilyCardProps, OrgChartCardProps } from "../src/index";

type Person = {
  id?: string;
  name: string;
  role?: string;
};

const people: Record<string, Person> = {
  henry: { id: "henry", name: "Henry" },
  carol: { id: "carol", name: "Carol" },
  james: { id: "james", name: "James" },
  emma: { id: "emma", name: "Emma" },
  ava: { id: "ava", name: "Ava" },
};

const relationships = [
  rel.parents("henry", ["carol", "james"]),
  rel.partner("henry", "emma"),
  rel.children(["henry", "emma"], ["ava"]),
];

function FamilyCard({
  collapsed: _collapsed,
  focused: _focused,
  onAddRelationship: _onAddRelationship,
  person,
  personId: _personId,
  readOnly: _readOnly,
  relation,
  selected: _selected,
  ...props
}: FamilyCardProps<Person>) {
  return (
    <article {...props}>
      <strong>{person.name}</strong>
      <small>{relation.label}</small>
    </article>
  );
}

function OrgCard({
  collapsed: _collapsed,
  depth: _depth,
  directReports,
  focused: _focused,
  generation: _generation,
  managerId: _managerId,
  person,
  personId: _personId,
  selected: _selected,
  ...props
}: OrgChartCardProps<Person>) {
  return (
    <article {...props}>
      <strong>{person.name}</strong>
      <small>{directReports.length}</small>
    </article>
  );
}

function LayoutProbe() {
  const context = useTreeLayout<Person>();
  return <output data-cards={context.layout.cards.length} data-edges={context.layout.edges.length} />;
}

describe("tree primitives", () => {
  test("compose a family tree with the same layout data as the wrapper path", () => {
    const expected = buildFamilyTreeLayout({ subject: "henry", people, relationships });
    const markup = renderToStaticMarkup(
      <TreeProvider type="family" people={people} relationships={relationships} subject="henry">
        <TreeCanvas interactionMode="none">
          <TreeEdges />
          <TreeNodeLayer<Person> card={FamilyCard} />
          <LayoutProbe />
        </TreeCanvas>
      </TreeProvider>,
    );

    expect(markup).toContain(`data-cards="${expected.cards.length}"`);
    expect(markup).toContain(`data-edges="${expected.edges.length}"`);
    expect(markup).toContain("data-family-card");
    expect(markup).toContain("data-family-edge");
  });

  test("renders a family tree through Memoir-shaped aliases", () => {
    const markup = renderToStaticMarkup(
      <FamilyTree
        profiles={people}
        relationships={relationships}
        renderProfileCard={(
          profile,
          {
            collapsed: _collapsed,
            focused: _focused,
            onAddRelationship: _onAddRelationship,
            person: _person,
            personId: _personId,
            readOnly: _readOnly,
            relation: _relation,
            selected: _selected,
            ...props
          },
        ) => (
          <article {...props}>
            <strong>{profile.name}</strong>
          </article>
        )}
        rootProfileId="henry"
        onSelectProfile={() => undefined}
      />,
    );

    expect(markup).toContain("Henry");
    expect(markup).toContain("data-tree-subject=\"henry\"");
  });

  test("applies controlled zoom to the tree surface", () => {
    const markup = renderToStaticMarkup(
      <FamilyTree
        card={FamilyCard}
        people={people}
        relationships={relationships}
        subject="henry"
        zoom={1.5}
      />,
    );

    expect(markup).toContain("scale(1.5)");
  });

  test("compose an org chart with the same layout data as the wrapper path", () => {
    const chart = createOrgChart<Person>({
      id: "ceo",
      person: { name: "Avery", role: "CEO" },
      reports: [
        { id: "product", person: { name: "Morgan", role: "Product" } },
        { id: "eng", person: { name: "Casey", role: "Engineering" } },
      ],
    });
    const expected = buildOrgChartLayout(chart);
    const markup = renderToStaticMarkup(
      <TreeProvider type="org" nodes={chart.nodes} rootId={chart.rootId}>
        <TreeCanvas interactionMode="none">
          <TreeEdges />
          <TreeNodeLayer<Person> card={OrgCard} />
          <LayoutProbe />
        </TreeCanvas>
      </TreeProvider>,
    );

    expect(markup).toContain(`data-cards="${expected.cards.length}"`);
    expect(markup).toContain(`data-edges="${expected.edges.length}"`);
    expect(markup).toContain("data-org-card");
    expect(markup).toContain("data-org-edge");
  });
});
