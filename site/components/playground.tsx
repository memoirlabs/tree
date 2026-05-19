"use client";

import { useMemo, useState } from "react";
import { FamilyTree, OrgChart, rel } from "../../src/index";
import type { FamilyCardProps, OrgChartCardProps, OrgChartNode, TreeInteractionMode } from "../../src/index";
import type { KeyboardEvent, MouseEventHandler } from "react";

type Person = {
  id: string;
  name: string;
  note?: string;
};

const basePeople: Record<string, Person> = {
  ruth: { id: "ruth", name: "Ruth", note: "grandparent" },
  morgan: { id: "morgan", name: "Morgan", note: "parent" },
  casey: { id: "casey", name: "Casey", note: "parent" },
  alex: { id: "alex", name: "Alex", note: "subject" },
  sam: { id: "sam", name: "Sam", note: "sibling" },
  taylor: { id: "taylor", name: "Taylor", note: "half-sibling" },
  jordan: { id: "jordan", name: "Jordan", note: "partner" },
  riley: { id: "riley", name: "Riley", note: "child" },
  quinn: { id: "quinn", name: "Quinn", note: "child" },
  river: { id: "river", name: "River", note: "grandchild" },
};

const baseOrgNodes: OrgChartNode<Person>[] = [
  { id: "ceo", person: { id: "ceo", name: "Avery", note: "CEO" } },
  { id: "eng", person: { id: "eng", name: "Morgan", note: "Engineering" }, parentId: "ceo" },
  { id: "design", person: { id: "design", name: "Riley", note: "Design" }, parentId: "ceo" },
  { id: "web", person: { id: "web", name: "Casey", note: "Web" }, parentId: "eng" },
  { id: "data", person: { id: "data", name: "Quinn", note: "Data" }, parentId: "eng" },
];

function activateCardWithKeyboard(
  event: KeyboardEvent<HTMLElement>,
  onClick: MouseEventHandler<HTMLElement> | undefined,
) {
  if (!onClick || (event.key !== "Enter" && event.key !== " ")) return;

  event.preventDefault();
  onClick(event as unknown as Parameters<MouseEventHandler<HTMLElement>>[0]);
}

function PersonCard({
  person,
  relation,
  selected,
  personId: _personId,
  focused: _focused,
  collapsed: _collapsed,
  ...props
}: FamilyCardProps<Person>) {
  return (
    <article
      {...props}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        activateCardWithKeyboard(event, props.onClick);
        props.onKeyDown?.(event);
      }}
    >
      <strong>{person.name}</strong>
      <small>{person.note ?? relation.label}</small>
      {selected ? <span>selected</span> : null}
    </article>
  );
}

function OrgPersonCard({
  person,
  depth: _depth,
  selected,
  personId: _personId,
  focused: _focused,
  collapsed: _collapsed,
  directReports: _directReports,
  managerId: _managerId,
  ...props
}: OrgChartCardProps<Person>) {
  return (
    <article
      {...props}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        activateCardWithKeyboard(event, props.onClick);
        props.onKeyDown?.(event);
      }}
    >
      <strong>{person.name}</strong>
      <small>{person.note}</small>
      {selected ? <span>selected</span> : null}
    </article>
  );
}

export function Playground() {
  const [people, setPeople] = useState(basePeople);
  const [subject, setSubject] = useState("alex");
  const [selectedPerson, setSelectedPerson] = useState("alex");
  const [newChildName, setNewChildName] = useState("Nova");
  const [extraChildren, setExtraChildren] = useState<string[]>([]);
  const [familyMode, setFamilyMode] = useState<TreeInteractionMode>("pan");
  const [orgNodes, setOrgNodes] = useState(baseOrgNodes);
  const [orgRoot, setOrgRoot] = useState("ceo");
  const [selectedOrgPerson, setSelectedOrgPerson] = useState("ceo");
  const [newReportName, setNewReportName] = useState("Indigo");

  const familyRelationships = useMemo(
    () => [
      rel.parents("morgan", ["ruth"]),
      rel.parents("alex", ["morgan", "casey"]),
      rel.parents("sam", ["morgan", "casey"]),
      rel.parents("taylor", ["morgan"]),
      rel.partner("alex", "jordan", { relation: "spouse" }),
      rel.children(["alex", "jordan"], ["riley", "quinn", ...extraChildren]),
      rel.children(["riley"], ["river"]),
    ],
    [extraChildren],
  );

  function updatePersonName(personId: string, name: string) {
    setPeople((current) => ({
      ...current,
      [personId]: {
        ...current[personId],
        name,
      },
    }));
  }

  function addChild() {
    const trimmedName = newChildName.trim();
    if (!trimmedName) return;

    const id = `child-${extraChildren.length + 1}`;
    setPeople((current) => ({
      ...current,
      [id]: { id, name: trimmedName, note: "new child" },
    }));
    setExtraChildren((current) => [...current, id]);
    setSelectedPerson(id);
    setNewChildName(`Nova ${extraChildren.length + 2}`);
  }

  function updateOrgPerson(personId: string, field: "name" | "note", value: string) {
    setOrgNodes((current) =>
      current.map((node) =>
        node.id === personId
          ? {
              ...node,
              person: {
                ...node.person,
                [field]: value,
              },
            }
          : node,
      ),
    );
  }

  function addReport() {
    const trimmedName = newReportName.trim();
    if (!trimmedName) return;

    const id = `report-${orgNodes.length + 1}`;
    setOrgNodes((current) => [
      ...current,
      {
        id,
        person: { id, name: trimmedName, note: "New report" },
        parentId: selectedOrgPerson,
      },
    ]);
    setSelectedOrgPerson(id);
    setNewReportName(`Indigo ${orgNodes.length + 2}`);
  }

  return (
    <div className="tree-frame">
      <div className="playground-panel">
        <div className="playground-copy">
          <p className="tree-example-label">FamilyTree playground</p>
          <h3>Type a name, click a card, or add a child.</h3>
          <p>
            This is live app-owned data. The tree re-renders as names, subject focus, and relationship facts change.
          </p>
        </div>

        <div className="playground-controls" aria-label="Family tree controls">
          <label>
            Subject
            <select
              value={subject}
              onChange={(event) => {
                setSubject(event.target.value);
                setSelectedPerson(event.target.value);
              }}
            >
              {Object.values(people).map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Alex's name
            <input value={people.alex.name} onChange={(event) => updatePersonName("alex", event.target.value)} />
          </label>

          <label>
            Partner name
            <input value={people.jordan.name} onChange={(event) => updatePersonName("jordan", event.target.value)} />
          </label>

          <label>
            New child
            <span className="playground-inline">
              <input value={newChildName} onChange={(event) => setNewChildName(event.target.value)} />
              <button type="button" onClick={addChild}>
                Add
              </button>
            </span>
          </label>

          <div className="playground-toggle" aria-label="Family interaction mode">
            {(["pan", "scroll"] satisfies TreeInteractionMode[]).map((mode) => (
              <button
                aria-pressed={familyMode === mode}
                key={mode}
                type="button"
                onClick={() => setFamilyMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <p className="playground-status">
          Selected: <strong>{people[selectedPerson]?.name ?? selectedPerson}</strong>
        </p>

        <FamilyTree
          subject={subject}
          people={people}
          relationships={familyRelationships}
          card={PersonCard}
          cardClassName="name-node"
          className="landing-tree-surface"
          edgeClassName="family-edge"
          interactionMode={familyMode}
          selected={selectedPerson}
          onPersonClick={(_person, personId) => setSelectedPerson(personId)}
          style={{ height: 820 }}
        />
      </div>

      <div className="playground-panel">
        <div className="playground-copy">
          <p className="tree-example-label">OrgChart playground</p>
          <h3>Edit roles and grow the reporting tree.</h3>
          <p>Click a card to choose the manager for the next report, then type a name and add them.</p>
        </div>

        <div className="playground-controls" aria-label="Org chart controls">
          <label>
            Root
            <select
              value={orgRoot}
              onChange={(event) => {
                setOrgRoot(event.target.value);
                setSelectedOrgPerson(event.target.value);
              }}
            >
              {orgNodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.person.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Selected name
            <input
              value={orgNodes.find((node) => node.id === selectedOrgPerson)?.person.name ?? ""}
              onChange={(event) => updateOrgPerson(selectedOrgPerson, "name", event.target.value)}
            />
          </label>

          <label>
            Selected role
            <input
              value={orgNodes.find((node) => node.id === selectedOrgPerson)?.person.note ?? ""}
              onChange={(event) => updateOrgPerson(selectedOrgPerson, "note", event.target.value)}
            />
          </label>

          <label>
            New report
            <span className="playground-inline">
              <input value={newReportName} onChange={(event) => setNewReportName(event.target.value)} />
              <button type="button" onClick={addReport}>
                Add
              </button>
            </span>
          </label>
        </div>

        <p className="playground-status">
          Manager target: <strong>{orgNodes.find((node) => node.id === selectedOrgPerson)?.person.name}</strong>
        </p>

        <OrgChart
          nodes={orgNodes}
          rootId={orgRoot}
          card={OrgPersonCard}
          cardClassName="name-node"
          className="landing-tree-surface"
          edgeClassName="family-edge"
          interactionMode="pan"
          selected={selectedOrgPerson}
          onPersonClick={(_person, personId) => setSelectedOrgPerson(personId)}
          style={{ height: 540 }}
        />
      </div>
    </div>
  );
}
