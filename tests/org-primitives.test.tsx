import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { OrgChart, buildOrgChartLayout, org } from "../src/index";
import type { OrgCardProps } from "../src/index";

type Person = {
  id: string;
  name: string;
  title?: string;
};

const people: Record<string, Person> = {
  ceo: { id: "ceo", name: "Casey", title: "CEO" },
  eng: { id: "eng", name: "Morgan", title: "VP Engineering" },
  design: { id: "design", name: "Riley", title: "Design Lead" },
};

const relationships = [
  org.reports("ceo", ["eng", "design"]),
];

function OrgCard({
  collapsed: _collapsed,
  depth,
  focused: _focused,
  parentId: _parentId,
  person,
  personId: _personId,
  readOnly: _readOnly,
  selected: _selected,
  ...props
}: OrgCardProps<Person>) {
  return (
    <article {...props}>
      <strong>{person.name}</strong>
      <small>{person.title ?? depth}</small>
    </article>
  );
}

interface AppCardProps {
  actionLabel: string;
  tone: "memoir" | "quiet";
}

function AppOrgCard({
  actionLabel,
  collapsed: _collapsed,
  depth,
  focused: _focused,
  parentId: _parentId,
  person,
  personId: _personId,
  readOnly: _readOnly,
  selected: _selected,
  tone,
  ...props
}: OrgCardProps<Person> & AppCardProps) {
  return (
    <article {...props} data-tone={tone}>
      <strong>{person.name}</strong>
      <small>{person.title ?? depth}</small>
      <button type="button">{actionLabel}</button>
    </article>
  );
}

describe("org chart", () => {
  test("renders org chart cards and edges", () => {
    const expected = buildOrgChartLayout({ root: "ceo", people, relationships });
    const markup = renderToStaticMarkup(
      <OrgChart
        card={OrgCard}
        people={people}
        relationships={relationships}
        root="ceo"
      />,
    );

    expect(markup).toContain(`data-tree-type="org-chart"`);
    expect(markup).toContain(`data-org-chart="true"`);
    expect(markup).toContain(`data-depth="0"`);
    expect(markup).toContain(`data-org-edge`);
    expect(markup).toContain(`Casey`);
    expect(expected.edges).toHaveLength(2);
  });

  test("passes accessibility and selection props", () => {
    const markup = renderToStaticMarkup(
      <OrgChart
        card={OrgCard}
        people={people}
        relationships={relationships}
        root="ceo"
        selected="eng"
        onPersonClick={() => undefined}
      />,
    );

    expect(markup).toContain(`aria-label="Morgan, level 1"`);
    expect(markup).toContain(`aria-selected="true"`);
    expect(markup).toContain(`role="button"`);
    expect(markup).toContain(`tabindex="0"`);
  });

  test("supports simple renderCard syntax", () => {
    const markup = renderToStaticMarkup(
      <OrgChart
        people={people}
        relationships={relationships}
        root="ceo"
        renderCard={({ person, rootProps }) => <article {...rootProps}>{person.name}</article>}
      />,
    );

    expect(markup).toContain(`data-org-card`);
    expect(markup).toContain(`Casey`);
  });

  test("passes app-owned props through to custom org cards", () => {
    const markup = renderToStaticMarkup(
      <OrgChart<Person, AppCardProps>
        card={AppOrgCard}
        cardProps={(person) => ({
          actionLabel: person.id === "ceo" ? "Lead" : "Open",
          tone: person.id === "ceo" ? "memoir" : "quiet",
        })}
        people={people}
        relationships={relationships}
        root="ceo"
      />,
    );

    expect(markup).toContain(`data-tone="memoir"`);
    expect(markup).toContain(`>Lead</button>`);
  });

  test("renders from explicit org graph mode", () => {
    const markup = renderToStaticMarkup(
      <OrgChart
        graph={{
          people,
          root: "ceo",
          reportingLinks: [
            { managerId: "ceo", reportId: "eng", order: 1 },
            { managerId: "ceo", reportId: "design", order: 2 },
          ],
        }}
        card={OrgCard}
      />,
    );

    expect(markup).toContain(`data-org-root="ceo"`);
    expect(markup).toContain(`Morgan`);
    expect(markup).toContain(`Riley`);
    expect(markup).toContain(`data-org-edge`);
  });
});
