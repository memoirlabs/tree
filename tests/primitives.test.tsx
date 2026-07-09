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
import type { FamilyActionContext, FamilyCardProps, FamilyGraph } from "../src/index";

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

  test("renders a family tree with the primary public props", () => {
    const markup = renderToStaticMarkup(
      <FamilyTree
        ariaLabel="Henry family map"
        people={people}
        relationships={relationships}
        card={FamilyCard}
        subject="henry"
        initialViewport="subject"
        onPersonClick={() => undefined}
      />,
    );

    expect(markup).toContain("Henry");
    expect(markup).toContain("aria-label=\"Henry family map\"");
    expect(markup).toContain("aria-label=\"Henry, subject\"");
    expect(markup).toContain("data-focused");
    expect(markup).not.toContain("data-selected");
    expect(markup).toContain("data-tree-subject=\"henry\"");
    expect(markup).toContain("role=\"button\"");
    expect(markup).toContain("tabindex=\"0\"");
  });

  test("renders a pan-only tree surface", () => {
    const markup = renderToStaticMarkup(
      <FamilyTree
        card={FamilyCard}
        people={people}
        relationships={relationships}
        subject="henry"
        viewport={{ x: 12, y: 24 }}
      />,
    );

    expect(markup).toContain("data-tree-surface");
    expect(markup).not.toContain("scale(");
  });

  test("renders hybrid pan with page scroll surface behavior", () => {
    const markup = renderToStaticMarkup(
      <FamilyTree
        card={FamilyCard}
        interactionMode="pan-page-scroll"
        people={people}
        relationships={relationships}
        subject="henry"
      />,
    );

    expect(markup).toContain("data-tree-interaction=\"pan-page-scroll\"");
    expect(markup).toContain("overflow:hidden");
    expect(markup).toContain("touch-action:pan-y");
    expect(markup).toContain("touch-action:inherit");
    expect(markup).toContain("overscroll-behavior:auto");
    expect(markup).not.toContain("overflow:auto");
  });

  test("passes custom card root aria and data props with hybrid pan behavior", () => {
    const markup = renderToStaticMarkup(
      <FamilyTree
        card={FamilyCard}
        interactionMode="pan-page-scroll"
        onPersonClick={() => undefined}
        people={people}
        relationships={relationships}
        selected="henry"
        subject="henry"
      />,
    );

    expect(markup).toContain("data-tree-interaction=\"pan-page-scroll\"");
    expect(markup).toContain("aria-label=\"Henry, subject\"");
    expect(markup).toContain("aria-selected=\"true\"");
    expect(markup).toContain("data-family-card");
    expect(markup).toContain("data-tree-card");
    expect(markup).toContain("data-focused");
    expect(markup).toContain("data-selected");
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

  test("renders all family cards by default", () => {
    const markup = renderToStaticMarkup(
      <FamilyTree card={FamilyCard} people={people} relationships={relationships} subject="henry" />,
    );

    expect(markup).toContain("Henry");
    expect(markup).toContain("Carol");
    expect(markup).toContain("James");
    expect(markup).toContain("Emma");
    expect(markup).toContain("Ava");
  });

  test("always renders the subject even when the render predicate returns false", () => {
    const markup = renderToStaticMarkup(
      <FamilyTree
        card={FamilyCard}
        people={people}
        relationships={relationships}
        shouldRenderPersonCard={() => false}
        subject="henry"
      />,
    );

    expect(markup).toContain("Henry");
    expect(markup).not.toContain("Carol");
    expect(markup).not.toContain("James");
    expect(markup).not.toContain("Emma");
    expect(markup).not.toContain("Ava");
  });

  test("does not render connector-only placeholder parent cards", () => {
    const renderedIds: string[] = [];
    function TrackingFamilyCard(props: FamilyCardProps<Person>) {
      renderedIds.push(props.personId);
      return <FamilyCard {...props} />;
    }

    const markup = renderToStaticMarkup(
      <FamilyTree
        card={TrackingFamilyCard}
        people={{
          ...people,
          unknownParent: { id: "unknownParent", name: "Unknown parent", isPlaceholder: true },
        }}
        relationships={[
          rel.partner("henry", "unknownParent", { relation: "unknown", status: "unknown" }),
          rel.children(["henry", "unknownParent"], ["ava"], {
            relation: "unknown",
            status: "unknown",
          }),
        ]}
        shouldRenderPersonCard={(_person, personId) => personId !== "unknownParent"}
        subject="henry"
      />,
    );

    expect(markup).toContain("Henry");
    expect(markup).toContain("Ava");
    expect(markup).not.toContain("Unknown parent");
    expect(markup).not.toContain("data-family-measure-id=\"unknownParent\"");
    expect(markup).toContain("data-family-edge");
    expect(renderedIds).not.toContain("unknownParent");
  });

  test("passes graph person metadata to layout cards and rendered card props", () => {
    let capturedProps: FamilyCardProps<Person> | undefined;
    function TrackingFamilyCard(props: FamilyCardProps<Person>) {
      if (props.personId === "unknownParent") {
        capturedProps = props;
      }
      return <FamilyCard {...props} />;
    }

    const graph: FamilyGraph<Person> = {
      subject: "henry",
      people: {
        henry: { id: "henry", name: "Henry" },
        unknownParent: { id: "unknownParent", name: "Unknown parent" },
        ava: { id: "ava", name: "Ava" },
      },
      partnershipGroups: [
        {
          id: "henry-unknown",
          partners: ["henry", "unknownParent"],
          relation: "unknown",
          status: "unknown",
        },
      ],
      parentChildLinks: [
        {
          id: "henry-ava",
          groupId: "henry-unknown",
          parentId: "henry",
          childId: "ava",
        },
        {
          id: "unknown-ava",
          groupId: "henry-unknown",
          parentId: "unknownParent",
          childId: "ava",
          relation: "unknown",
        },
      ],
      personMetadata: {
        unknownParent: {
          kind: "unknown-slot",
          slotRole: "partner",
          groupId: "henry-unknown",
          linkIds: ["unknown-ava"],
        },
      },
    };

    const layout = buildFamilyTreeLayout({ graph });
    const unknownCard = layout.cards.find((card) => card.personId === "unknownParent");
    const markup = renderToStaticMarkup(<FamilyTree card={TrackingFamilyCard} graph={graph} />);

    expect(unknownCard?.metadata).toEqual({
      kind: "unknown-slot",
      slotRole: "partner",
      groupId: "henry-unknown",
      linkIds: ["unknown-ava"],
    });
    expect(capturedProps?.metadata).toEqual(unknownCard?.metadata);
    expect(markup).toContain("data-node-kind=\"unknown-slot\"");
    expect(markup).toContain("data-slot-role=\"partner\"");
    expect(markup).toContain("data-placement-group-id=\"henry-unknown\"");
  });

  test("passes structural context through family action callbacks", () => {
    let capturedProps: FamilyCardProps<Person> | undefined;
    let clickedContext: FamilyActionContext<Person> | undefined;
    let addContext: FamilyActionContext<Person> | undefined;
    function TrackingFamilyCard(props: FamilyCardProps<Person>) {
      if (props.personId === "unknownParent") {
        capturedProps = props;
      }
      return <FamilyCard {...props} />;
    }

    const graph: FamilyGraph<Person> = {
      subject: "henry",
      people: {
        henry: { id: "henry", name: "Henry" },
        unknownParent: { id: "unknownParent", name: "Unknown parent" },
        ava: { id: "ava", name: "Ava" },
      },
      partnershipGroups: [
        {
          id: "henry-unknown",
          partners: ["henry", "unknownParent"],
          relation: "unknown",
          status: "unknown",
        },
      ],
      parentChildLinks: [
        {
          id: "henry-ava",
          groupId: "henry-unknown",
          parentId: "henry",
          childId: "ava",
        },
      ],
      personMetadata: {
        unknownParent: {
          kind: "unknown-slot",
          slotRole: "partner",
          groupId: "henry-unknown",
        },
      },
    };

    renderToStaticMarkup(
      <FamilyTree
        card={TrackingFamilyCard}
        graph={graph}
        onAddRelationship={(_person, _personId, context) => {
          addContext = context;
        }}
        onPersonClick={(_person, _personId, context) => {
          clickedContext = context;
        }}
      />,
    );

    capturedProps?.onClick?.({} as never);
    capturedProps?.onAddRelationship?.();

    expect(clickedContext).toMatchObject({
      personId: "unknownParent",
      subject: "henry",
      metadata: {
        kind: "unknown-slot",
        slotRole: "partner",
        groupId: "henry-unknown",
      },
      placement: {
        partnershipGroupIds: ["henry-unknown"],
      },
    });
    expect(addContext).toMatchObject({
      personId: "unknownParent",
      subject: "henry",
      metadata: {
        kind: "unknown-slot",
        slotRole: "partner",
        groupId: "henry-unknown",
      },
    });
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
    expect(markup).toContain("self");
    expect(markup).not.toContain("selected</span>");
    expect(markup).toContain("border-radius:16px");
    expect(markup).toContain("box-shadow:var(--tree-card-shadow, 4px 4px 0 #030201)");
  });
});
