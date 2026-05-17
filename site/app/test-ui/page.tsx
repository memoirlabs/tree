"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import {
  FamilyTree,
  OrgChart,
  buildFamilyTreeLayout,
  buildOrgChartLayout,
  rel,
} from "../../../src/index";
import type { FamilyCardProps, OrgChartCardProps, OrgChartNode, PersonId } from "../../../src/index";

type TestPerson = {
  id: string;
  name: string;
  note: string;
  detail?: string;
  tone?: "red" | "yellow" | "blue" | "neutral";
  size?: "compact" | "wide" | "tall";
};

type ScenarioStat = {
  label: string;
  value: string | number;
};

const classes = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(" ");

const baselinePeople: Record<PersonId, TestPerson> = {
  ruth: { id: "ruth", name: "Ruth", note: "grandparent", tone: "yellow" },
  morgan: { id: "morgan", name: "Morgan", note: "parent", tone: "blue" },
  casey: { id: "casey", name: "Casey", note: "parent", tone: "blue" },
  alex: { id: "alex", name: "Alex", note: "subject", tone: "red" },
  sam: { id: "sam", name: "Sam", note: "sibling" },
  jordan: { id: "jordan", name: "Jordan", note: "spouse" },
  riley: { id: "riley", name: "Riley", note: "child", tone: "yellow" },
  quinn: { id: "quinn", name: "Quinn", note: "child", tone: "yellow" },
};

const baselineRelationships = [
  rel.parents("morgan", ["ruth"]),
  rel.parents("alex", ["morgan", "casey"]),
  rel.parents("sam", ["morgan", "casey"]),
  rel.partner("alex", "jordan", { relation: "spouse" }),
  rel.children(["alex", "jordan"], ["riley", "quinn"]),
];

const complexPeople: Record<PersonId, TestPerson> = {
  iris: { id: "iris", name: "Iris", note: "maternal grandparent", tone: "yellow", size: "wide" },
  jo: { id: "jo", name: "Jo", note: "maternal grandparent", tone: "yellow" },
  noel: { id: "noel", name: "Noel", note: "paternal grandparent", tone: "blue" },
  blair: { id: "blair", name: "Blair", note: "paternal grandparent", tone: "blue" },
  morgan: { id: "morgan", name: "Morgan", note: "parent", detail: "biological", tone: "blue", size: "wide" },
  casey: { id: "casey", name: "Casey", note: "parent", detail: "biological", tone: "blue" },
  drew: { id: "drew", name: "Drew", note: "former partner", detail: "dashed edge check", size: "tall" },
  alex: { id: "alex", name: "Alex", note: "subject", detail: "selected by default", tone: "red", size: "wide" },
  sam: { id: "sam", name: "Sam", note: "full sibling" },
  taylor: { id: "taylor", name: "Taylor", note: "half-sibling", detail: "one shared parent", size: "wide" },
  jordan: { id: "jordan", name: "Jordan", note: "spouse", tone: "yellow" },
  robin: { id: "robin", name: "Robin", note: "guardian", detail: "guardian edge check", tone: "blue" },
  riley: { id: "riley", name: "Riley", note: "child", tone: "yellow" },
  quinn: { id: "quinn", name: "Quinn", note: "adoptive child", detail: "dashed edge check", tone: "yellow" },
  river: { id: "river", name: "River", note: "grandchild", tone: "neutral" },
};

const complexRelationships = [
  rel.parents("morgan", ["iris", "jo"]),
  rel.parents("casey", ["noel", "blair"]),
  rel.parents("alex", ["morgan", "casey"]),
  rel.parents("sam", ["morgan", "casey"]),
  rel.parents("taylor", ["morgan", "drew"], { status: "former" }),
  rel.partner("morgan", "drew", { relation: "coparent", status: "former" }),
  rel.partner("alex", "jordan", { relation: "spouse" }),
  rel.children(["alex", "jordan"], ["riley"]),
  rel.children(["alex", "jordan"], ["quinn"], { relation: "adoptive" }),
  rel.guardians("quinn", ["robin"]),
  rel.children(["riley"], ["river"]),
];

const wideOrgNodes: Array<OrgChartNode<TestPerson>> = [
  { id: "ceo", person: { id: "ceo", name: "Avery", note: "CEO", tone: "red", size: "wide" } },
  { id: "product", person: { id: "product", name: "Morgan", note: "Product", tone: "blue" }, parentId: "ceo" },
  { id: "eng", person: { id: "eng", name: "Casey", note: "Engineering", tone: "blue" }, parentId: "ceo" },
  { id: "design", person: { id: "design", name: "Riley", note: "Design", tone: "yellow" }, parentId: "ceo" },
  { id: "sales", person: { id: "sales", name: "Sam", note: "Sales", tone: "yellow" }, parentId: "ceo" },
  { id: "ops", person: { id: "ops", name: "Taylor", note: "Operations" }, parentId: "ceo" },
];

const deepOrgNodes: Array<OrgChartNode<TestPerson>> = [
  { id: "founder", person: { id: "founder", name: "Alex", note: "Founder", tone: "red", size: "wide" } },
  { id: "vp-eng", person: { id: "vp-eng", name: "Jordan", note: "VP Engineering", tone: "blue" }, parentId: "founder" },
  { id: "vp-growth", person: { id: "vp-growth", name: "Quinn", note: "VP Growth", tone: "yellow" }, parentId: "founder" },
  { id: "platform", person: { id: "platform", name: "Noel", note: "Platform", size: "wide" }, parentId: "vp-eng" },
  { id: "web", person: { id: "web", name: "River", note: "Web", tone: "blue" }, parentId: "vp-eng" },
  { id: "data", person: { id: "data", name: "Blair", note: "Data", tone: "blue" }, parentId: "platform" },
  { id: "docs", person: { id: "docs", name: "Iris", note: "Docs", tone: "yellow" }, parentId: "web" },
  { id: "lifecycle", person: { id: "lifecycle", name: "Robin", note: "Lifecycle", size: "wide" }, parentId: "vp-growth" },
  { id: "launches", person: { id: "launches", name: "Drew", note: "Launches", tone: "yellow" }, parentId: "lifecycle" },
];

function TestFamilyCard({
  className,
  collapsed: _collapsed,
  focused: _focused,
  person,
  personId: _personId,
  relation,
  selected,
  ...props
}: FamilyCardProps<TestPerson>) {
  return (
    <article
      {...props}
      className={classes(
        className,
        "test-ui-card",
        `test-ui-card--${person.tone ?? "neutral"}`,
        person.size ? `test-ui-card--${person.size}` : undefined,
      )}
    >
      <strong>{person.name}</strong>
      <small>{person.note}</small>
      {person.detail ? <span>{person.detail}</span> : null}
      <em>{relation.label}</em>
      {selected ? <b>selected</b> : null}
    </article>
  );
}

function TestOrgCard({
  className,
  collapsed: _collapsed,
  depth,
  directReports,
  focused: _focused,
  managerId: _managerId,
  person,
  personId: _personId,
  selected,
  ...props
}: OrgChartCardProps<TestPerson>) {
  return (
    <article
      {...props}
      className={classes(
        className,
        "test-ui-card",
        "test-ui-card--org",
        `test-ui-card--${person.tone ?? "neutral"}`,
        person.size ? `test-ui-card--${person.size}` : undefined,
      )}
    >
      <strong>{person.name}</strong>
      <small>{person.note}</small>
      <span>
        depth {depth} / reports {directReports.length}
      </span>
      {selected ? <b>root</b> : null}
    </article>
  );
}

function StatList({ stats }: { stats: ScenarioStat[] }) {
  return (
    <dl className="test-ui-stats">
      {stats.map((stat) => (
        <div key={stat.label}>
          <dt>{stat.label}</dt>
          <dd>{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Scenario({
  children,
  description,
  stats,
  title,
}: {
  children: ReactNode;
  description: string;
  stats: ScenarioStat[];
  title: string;
}) {
  return (
    <section className="test-ui-scenario">
      <div className="test-ui-scenario-header">
        <div>
          <p className="test-ui-eyebrow">Manual check</p>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <StatList stats={stats} />
      </div>
      {children}
    </section>
  );
}

export default function TestUiPage() {
  const [selected, setSelected] = useState<PersonId>("alex");
  const baselineLayout = useMemo(
    () => buildFamilyTreeLayout({ people: baselinePeople, relationships: baselineRelationships, subject: "alex" }),
    [],
  );
  const complexLayout = useMemo(
    () => buildFamilyTreeLayout({ people: complexPeople, relationships: complexRelationships, subject: "alex" }),
    [],
  );
  const wideOrgLayout = useMemo(() => buildOrgChartLayout({ nodes: wideOrgNodes, rootId: "ceo" }), []);
  const deepOrgLayout = useMemo(() => buildOrgChartLayout({ nodes: deepOrgNodes, rootId: "founder" }), []);

  return (
    <main className="test-ui-page">
      <header className="test-ui-hero">
        <p className="test-ui-eyebrow">Internal release route</p>
        <h1>Tree layout test UI</h1>
        <p>
          Direct-link page for checking measured card layout, routed edges, panning, scroll overflow, and relationship
          labeling before release.
        </p>
      </header>

      <Scenario
        title="Baseline family tree"
        description="Normal subject-centered neighborhood with grandparents, parents, sibling, spouse, and children."
        stats={[
          { label: "expected cards", value: baselineLayout.cards.length },
          { label: "expected edges", value: baselineLayout.edges.length },
          { label: "interaction", value: "pan" },
        ]}
      >
        <FamilyTree
          card={TestFamilyCard}
          edgeClassName="test-ui-edge"
          onPersonClick={(_, personId) => setSelected(personId)}
          people={baselinePeople}
          relationships={baselineRelationships}
          selected={selected}
          subject="alex"
        />
      </Scenario>

      <Scenario
        title="Complex family graph"
        description="Stress case for variable card sizes, half-siblings, former partner edges, adoptive edges, guardian edges, and grandchildren."
        stats={[
          { label: "expected cards", value: complexLayout.cards.length },
          { label: "expected edges", value: complexLayout.edges.length },
          { label: "interaction", value: "scroll" },
        ]}
      >
        <FamilyTree
          card={TestFamilyCard}
          edgeClassName="test-ui-edge"
          interactionMode="scroll"
          onPersonClick={(_, personId) => setSelected(personId)}
          people={complexPeople}
          relationships={complexRelationships}
          selected={selected}
          subject="alex"
        />
      </Scenario>

      <Scenario
        title="Wide org chart"
        description="Single-root chart with many direct reports to check horizontal spacing and centered parent placement."
        stats={[
          { label: "expected cards", value: wideOrgLayout.cards.length },
          { label: "expected edges", value: wideOrgLayout.edges.length },
          { label: "interaction", value: "pan" },
        ]}
      >
        <OrgChart card={TestOrgCard} edgeClassName="test-ui-edge" nodes={wideOrgNodes} rootId="ceo" />
      </Scenario>

      <Scenario
        title="Deep org chart"
        description="Nested chart that checks multi-level edge routing, uneven branches, and card measurement across depths."
        stats={[
          { label: "expected cards", value: deepOrgLayout.cards.length },
          { label: "expected edges", value: deepOrgLayout.edges.length },
          { label: "interaction", value: "scroll" },
        ]}
      >
        <OrgChart
          card={TestOrgCard}
          edgeClassName="test-ui-edge"
          interactionMode="scroll"
          nodes={deepOrgNodes}
          rootId="founder"
        />
      </Scenario>
    </main>
  );
}
