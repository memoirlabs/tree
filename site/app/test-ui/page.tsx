"use client";

import { useState } from "react";
import type { ReactNode } from "react";

import {
  FamilyTree,
  OrgChart,
  TreeCanvas,
  TreeEdges,
  TreeNodeLayer,
  TreeProvider,
  createFamilyTree,
  createOrgTree,
  rel,
} from "../../../src/index";
import type { FamilyCardProps, FamilyRelationship, OrgChartCardProps, OrgChartNode, PersonId } from "../../../src/index";

type TestPerson = {
  id: string;
  name: string;
  note: string;
  detail?: string;
  tone?: "red" | "yellow" | "blue" | "neutral";
  size?: "compact" | "wide" | "tall";
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

const outOfBoxPeople = {
  henry: { id: "henry", profile: { display: "Henry" } },
  carol: { id: "carol", profile: { display: "Carol" } },
  james: { id: "james", profile: { display: "James" } },
  emma: { id: "emma", profile: { display: "Emma" } },
  ava: { id: "ava", profile: { display: "Ava" } },
};

const outOfBoxRelationships = [
  rel.parents("henry", ["carol", "james"]),
  rel.partner("henry", "emma", { relation: "spouse" }),
  rel.children(["henry", "emma"], ["ava"]),
];

const familyDslSource = `subject henry
carol["Carol"] + james["James"] -> henry["Henry"]
henry + emma["Emma"] -> ava["Ava"]`;

const familyFromDsl = createFamilyTree(familyDslSource);

const familyDslCode = `const family = createFamilyTree(\`
${familyDslSource}
\`);

<FamilyTree {...family} />`;

const outOfBoxCode = `const people = {
  henry: { id: "henry", profile: { display: "Henry" } },
  carol: { id: "carol", profile: { display: "Carol" } },
  james: { id: "james", profile: { display: "James" } },
  emma: { id: "emma", profile: { display: "Emma" } },
  ava: { id: "ava", profile: { display: "Ava" } },
};

const relationships = [
  rel.parents("henry", ["carol", "james"]),
  rel.partner("henry", "emma", { relation: "spouse" }),
  rel.children(["henry", "emma"], ["ava"]),
];

<FamilyTree people={people} relationships={relationships} subject="henry" />`;

const childrenHelperPeople: Record<PersonId, TestPerson> = {
  parentA: { id: "parentA", name: "Alex", note: "parent", tone: "red" },
  parentB: { id: "parentB", name: "Jordan", note: "partner", tone: "yellow" },
  childA: { id: "childA", name: "Riley", note: "child", tone: "blue" },
  childB: { id: "childB", name: "Quinn", note: "child", tone: "blue" },
};

const childrenHelperRelationships = [
  rel.partner("parentA", "parentB", { relation: "spouse" }),
  rel.children(["parentA", "parentB"], ["childA", "childB"]),
];

const childrenHelperCode = `const relationships = [
  rel.partner("parentA", "parentB", { relation: "spouse" }),
  rel.children(["parentA", "parentB"], ["childA", "childB"]),
];

<FamilyTree
  card={TestFamilyCard}
  people={childrenHelperPeople}
  relationships={relationships}
  subject="parentA"
/>`;

const rawRelationshipPeople: Record<PersonId, TestPerson> = {
  grandparent: { id: "grandparent", name: "Ruth", note: "raw parentage row", tone: "yellow" },
  parent: { id: "parent", name: "Morgan", note: "raw parent", tone: "blue" },
  subject: { id: "subject", name: "Alex", note: "subject", tone: "red" },
  partner: { id: "partner", name: "Jordan", note: "raw partner row", tone: "yellow" },
  child: { id: "child", name: "Riley", note: "raw child row", tone: "blue" },
};

const rawRelationshipRows: FamilyRelationship[] = [
  {
    type: "parentage",
    parents: ["grandparent"],
    children: ["parent"],
    relation: "biological",
  },
  {
    type: "parentage",
    parents: ["parent"],
    children: ["subject"],
    relation: "biological",
  },
  {
    type: "partnership",
    partners: ["subject", "partner"],
    relation: "spouse",
    status: "current",
  },
  {
    type: "parentage",
    parents: ["subject", "partner"],
    children: ["child"],
    relation: "biological",
  },
];

const rawRelationshipCode = `const relationships: FamilyRelationship[] = [
  {
    type: "parentage",
    parents: ["grandparent"],
    children: ["parent"],
    relation: "biological",
  },
  {
    type: "partnership",
    partners: ["subject", "partner"],
    relation: "spouse",
    status: "current",
  },
  {
    type: "parentage",
    parents: ["subject", "partner"],
    children: ["child"],
    relation: "biological",
  },
];

<FamilyTree
  card={TestFamilyCard}
  people={rawRelationshipPeople}
  relationships={relationships}
  subject="subject"
/>`;

const guardianshipPeople: Record<PersonId, TestPerson> = {
  parent: { id: "parent", name: "Alex", note: "parent", tone: "red" },
  guardian: { id: "guardian", name: "Robin", note: "guardian", tone: "blue" },
  child: { id: "child", name: "Quinn", note: "adoptive child", tone: "yellow" },
};

const guardianshipRelationships = [
  rel.children("parent", "child", { relation: "adoptive" }),
  rel.guardians("child", ["guardian"]),
];

const guardianshipCode = `const relationships = [
  rel.children("parent", "child", { relation: "adoptive" }),
  rel.guardians("child", ["guardian"]),
];

<FamilyTree
  card={TestFamilyCard}
  people={guardianshipPeople}
  relationships={relationships}
  subject="child"
/>`;

const styledMemoirPeople: Record<PersonId, TestPerson> = {
  iris: { id: "iris", name: "Iris", note: "grandparent", tone: "yellow" },
  morgan: { id: "morgan", name: "Morgan", note: "parent", tone: "blue" },
  alex: { id: "alex", name: "Alex", note: "subject", tone: "red", size: "wide" },
  jordan: { id: "jordan", name: "Jordan", note: "partner", tone: "yellow" },
  river: { id: "river", name: "River", note: "child", tone: "blue" },
};

const styledMemoirRelationships = [
  rel.parents("morgan", ["iris"]),
  rel.parents("alex", ["morgan"]),
  rel.partner("alex", "jordan"),
  rel.children(["alex", "jordan"], ["river"]),
];

const customThemeCode = `<FamilyTree
  card={TestFamilyCard}
  lineShape="curved"
  people={styledMemoirPeople}
  relationships={styledMemoirRelationships}
  spacing={{ column: 56, padding: 40, row: 140 }}
  subject="alex"
  theme={{ accent: "#EC5A44", cardRadius: 0, edgeWidth: 3, profileRadius: 0 }}
/>`;

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

const baselineCode = `<FamilyTree
  card={TestFamilyCard}
  onPersonClick={(_, personId) => setSelected(personId)}
  people={baselinePeople}
  relationships={baselineRelationships}
  selected={selected}
  subject="alex"
/>`;

const primitiveFamilyCode = `<TreeProvider
  type="family"
  people={baselinePeople}
  relationships={baselineRelationships}
  selected={selected}
  subject="alex"
>
  <TreeCanvas>
    <TreeEdges edgeClassName="test-ui-edge" />
    <TreeNodeLayer card={TestFamilyCard} />
  </TreeCanvas>
</TreeProvider>`;

const complexCode = `<FamilyTree
  card={TestFamilyCard}
  interactionMode="scroll"
  onPersonClick={(_, personId) => setSelected(personId)}
  people={complexPeople}
  relationships={complexRelationships}
  selected={selected}
  subject="alex"
/>`;

const wideOrgNodes: Array<OrgChartNode<TestPerson>> = [
  { id: "ceo", person: { id: "ceo", name: "Avery", note: "CEO", tone: "red", size: "wide" } },
  { id: "product", person: { id: "product", name: "Morgan", note: "Product", tone: "blue" }, parentId: "ceo" },
  { id: "eng", person: { id: "eng", name: "Casey", note: "Engineering", tone: "blue" }, parentId: "ceo" },
  { id: "design", person: { id: "design", name: "Riley", note: "Design", tone: "yellow" }, parentId: "ceo" },
  { id: "sales", person: { id: "sales", name: "Sam", note: "Sales", tone: "yellow" }, parentId: "ceo" },
  { id: "ops", person: { id: "ops", name: "Taylor", note: "Operations" }, parentId: "ceo" },
];

const wideOrgCode = `<OrgChart
  card={TestOrgCard}
  nodes={wideOrgNodes}
  rootId="ceo"
/>`;

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

const orgDslSource = `root founder
founder["Alex", role="Founder"] -> vpEng["Jordan", role="VP Engineering"] + vpGrowth["Quinn", role="VP Growth"]
vpEng -> platform["Noel", role="Platform"] + web["River", role="Web"]
platform -> data["Blair", role="Data"]`;

const orgFromDsl = createOrgTree(orgDslSource);

const orgDslCode = `const org = createOrgTree(\`
${orgDslSource}
\`);

<OrgChart {...org} />`;

const deepOrgCode = `<OrgChart
  card={TestOrgCard}
  interactionMode="scroll"
  nodes={deepOrgNodes}
  rootId="founder"
/>`;

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
  generation: _generation,
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

function Example({
  children,
  code,
  title,
}: {
  children: ReactNode;
  code: string;
  title: string;
}) {
  return (
    <section className="test-ui-example">
      <h2>{title}</h2>
      <div className="test-ui-example-grid">
        <pre>
          <code>{code}</code>
        </pre>
        <div className="test-ui-render">{children}</div>
      </div>
    </section>
  );
}

export default function TestUiPage() {
  const [selected, setSelected] = useState<PersonId>("alex");

  return (
    <main className="test-ui-page">
      <header>
        <h1>Tree layout test UI</h1>
        <p>Package test page: code example on the left, rendered component on the right.</p>
      </header>

      <Example title="DSL FamilyTree" code={familyDslCode}>
        <FamilyTree {...familyFromDsl} />
      </Example>

      <Example title="Out-of-box FamilyTree" code={outOfBoxCode}>
        <FamilyTree people={outOfBoxPeople} relationships={outOfBoxRelationships} subject="henry" />
      </Example>

      <Example title="rel.children(parents, children)" code={childrenHelperCode}>
        <FamilyTree
          card={TestFamilyCard}
          edgeClassName="test-ui-edge"
          people={childrenHelperPeople}
          relationships={childrenHelperRelationships}
          subject="parentA"
        />
      </Example>

      <Example title="Raw FamilyRelationship rows" code={rawRelationshipCode}>
        <FamilyTree
          card={TestFamilyCard}
          edgeClassName="test-ui-edge"
          people={rawRelationshipPeople}
          relationships={rawRelationshipRows}
          subject="subject"
        />
      </Example>

      <Example title="rel.guardians + adoptive children" code={guardianshipCode}>
        <FamilyTree
          card={TestFamilyCard}
          edgeClassName="test-ui-edge"
          people={guardianshipPeople}
          relationships={guardianshipRelationships}
          subject="child"
        />
      </Example>

      <Example title="Theme, spacing, and curved lines" code={customThemeCode}>
        <FamilyTree
          card={TestFamilyCard}
          edgeClassName="test-ui-edge"
          lineShape="curved"
          people={styledMemoirPeople}
          relationships={styledMemoirRelationships}
          spacing={{ column: 56, padding: 40, row: 140 }}
          subject="alex"
          theme={{ accent: "#EC5A44", cardRadius: 0, edgeWidth: 3, profileRadius: 0 }}
        />
      </Example>

      <Example title="FamilyTree pan + click selection" code={baselineCode}>
        <FamilyTree
          card={TestFamilyCard}
          edgeClassName="test-ui-edge"
          onPersonClick={(_, personId) => setSelected(personId)}
          people={baselinePeople}
          relationships={baselineRelationships}
          selected={selected}
          subject="alex"
        />
      </Example>

      <Example title="Primitive FamilyTree composition" code={primitiveFamilyCode}>
        <TreeProvider
          type="family"
          people={baselinePeople}
          relationships={baselineRelationships}
          selected={selected}
          subject="alex"
        >
          <TreeCanvas>
            <TreeEdges edgeClassName="test-ui-edge" />
            <TreeNodeLayer<TestPerson> card={TestFamilyCard} />
          </TreeCanvas>
        </TreeProvider>
      </Example>

      <Example title="FamilyTree scroll mode + complex graph" code={complexCode}>
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
      </Example>

      <Example title="OrgChart wide team" code={wideOrgCode}>
        <OrgChart card={TestOrgCard} edgeClassName="test-ui-edge" nodes={wideOrgNodes} rootId="ceo" />
      </Example>

      <Example title="DSL OrgChart" code={orgDslCode}>
        <OrgChart {...orgFromDsl} />
      </Example>

      <Example title="OrgChart scroll mode + deep tree" code={deepOrgCode}>
        <OrgChart
          card={TestOrgCard}
          edgeClassName="test-ui-edge"
          interactionMode="scroll"
          nodes={deepOrgNodes}
          rootId="founder"
        />
      </Example>
    </main>
  );
}
