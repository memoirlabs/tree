import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import {
  FamilyTree,
  StyledFamilyCard,
  TreeCanvas,
  TreeEdges,
  TreeNodeLayer,
  TreeProvider,
  buildFamilyTreeLayout,
  rel,
  useTreeLayout,
} from "../src/index";
import type { FamilyCardProps } from "../src/index";

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

function LayoutProbe() {
  const context = useTreeLayout<Person>();
  return <output data-cards={context.layout.cards.length} data-edges={context.layout.edges.length} />;
}

interface AppCardProps {
  actionLabel: string;
  tone: "memoir" | "quiet";
}

function AppCard({
  actionLabel,
  collapsed: _collapsed,
  focused: _focused,
  onAddRelationship: _onAddRelationship,
  person,
  personId: _personId,
  readOnly: _readOnly,
  relation,
  selected: _selected,
  tone,
  ...props
}: FamilyCardProps<Person> & AppCardProps) {
  return (
    <article {...props} data-tone={tone}>
      <strong>{person.name}</strong>
      <small>{relation.label}</small>
      <button type="button">{actionLabel}</button>
    </article>
  );
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
    expect(markup).toContain("stroke-width:var(--tree-edge-width, 2)");
  });

  test("renders a family tree through Memoir-shaped aliases", () => {
    const markup = renderToStaticMarkup(
      <FamilyTree
        ariaLabel="Henry family map"
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
    expect(markup).toContain("aria-label=\"Henry family map\"");
    expect(markup).toContain("aria-label=\"Henry, root node\"");
    expect(markup).toContain("data-focused");
    expect(markup).not.toContain("data-selected");
    expect(markup).toContain("data-tree-subject=\"henry\"");
    expect(markup).toContain("role=\"button\"");
    expect(markup).toContain("tabindex=\"0\"");
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

  test("accepts a controlled viewport", () => {
    const markup = renderToStaticMarkup(
      <FamilyTree
        card={FamilyCard}
        people={people}
        relationships={relationships}
        subject="henry"
        viewport={{ x: 12, y: 24, zoom: 1.75 }}
      />,
    );

    expect(markup).toContain("scale(1.75)");
  });

  test("passes app-owned props through to custom cards", () => {
    const markup = renderToStaticMarkup(
      <FamilyTree<Person, AppCardProps>
        card={AppCard}
        cardProps={(person) => ({
          actionLabel: person.role === "admin" ? "Manage" : "View",
          tone: person.id === "henry" ? "memoir" : "quiet",
        })}
        people={{
          ...people,
          henry: { id: "henry", name: "Henry", role: "admin" },
        }}
        relationships={relationships}
        subject="henry"
      />,
    );

    expect(markup).toContain("data-tone=\"memoir\"");
    expect(markup).toContain(">Manage</button>");
  });

  test("renders configurable styled cards without custom card boilerplate", () => {
    const markup = renderToStaticMarkup(
      <FamilyTree<Person, { radius: "round"; shadow: "flat" }>
        card={StyledFamilyCard}
        cardProps={{
          radius: "round",
          shadow: "flat",
        }}
        people={{
          ...people,
          henry: { id: "henry", name: "Henry", role: "Founder" },
        }}
        relationships={relationships}
        subject="henry"
      />,
    );

    expect(markup).toContain("Henry");
    expect(markup).toContain("root node");
    expect(markup).not.toContain("selected</span>");
    expect(markup).toContain("border-radius:16px");
    expect(markup).toContain("box-shadow:var(--tree-card-shadow, 4px 4px 0 #030201)");
  });
});
