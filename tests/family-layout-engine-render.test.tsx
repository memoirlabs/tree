import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "bun:test";

import { layoutFamilyTree } from "../src/index";
import type { FamilyLayoutResult } from "../src/index";

type Person = {
  name: string;
};

function DirectEngineRender({ result }: { result: FamilyLayoutResult<Person> }) {
  const width = result.bounds.maxX + 32;
  const height = result.bounds.maxY + 32;

  return (
    <section data-engine-panel>
      <pre data-engine-stats>
        {JSON.stringify({
          people: result.people.length,
          unions: result.unions.length,
          edges: result.edges.length,
          warnings: result.warnings.map((warning) => warning.code),
        })}
      </pre>
      <div data-engine-stage style={{ height, position: "relative", width }}>
        <svg height={height} viewBox={`0 0 ${width} ${height}`} width={width}>
          {result.edges.map((edge) => (
            <path
              d={edge.path}
              data-engine-edge
              data-from={edge.from}
              data-kind={edge.kind}
              data-to={edge.to}
              key={edge.id}
            />
          ))}
        </svg>
        {result.unions.map((node) => (
          <div
            data-engine-union
            data-node-id={node.id}
            key={node.id}
            style={{
              height: node.height,
              transform: `translate(${node.x}px, ${node.y}px)`,
              width: node.width,
            }}
          />
        ))}
        {result.people.map((node) => (
          <article
            data-engine-person
            data-node-id={node.id}
            key={node.id}
            style={{
              height: node.height,
              transform: `translate(${node.x}px, ${node.y}px)`,
              width: node.width,
            }}
          >
            <strong>{node.data.name}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function countOccurrences(value: string, pattern: string) {
  return value.split(pattern).length - 1;
}

test("renders the exported family layout result into a direct React UI surface", () => {
  const result = layoutFamilyTree<Person>({
    people: {
      alex: { name: "Alex" },
      blair: { name: "Blair" },
      casey: { name: "Casey" },
      drew: { name: "Drew" },
      jordan: { name: "Jordan" },
      morgan: { name: "Morgan" },
      riley: { name: "Riley" },
    },
    center: "alex",
    options: {
      personSize: { height: 72, width: 132 },
      spacing: { padding: 32, person: 28, rank: 64, union: 28 },
    },
    unions: [
      { children: ["casey", "riley"], id: "u_alex_jordan", order: 1, partners: ["alex", "jordan"] },
      { children: ["drew"], id: "u_alex_morgan", order: 2, partners: ["alex", "morgan"] },
      { id: "u_multi", order: 3, partners: ["alex", "blair"] },
    ],
  });

  const html = renderToStaticMarkup(<DirectEngineRender result={result} />);

  expect(result.warnings).toEqual([]);
  expect(countOccurrences(html, "data-engine-person")).toBe(result.people.length);
  expect(countOccurrences(html, "data-engine-union")).toBe(result.unions.length);
  expect(countOccurrences(html, "data-engine-edge")).toBe(result.edges.length);
  expect(html).toContain('data-engine-stage="true"');
  expect(html).toContain('data-node-id="alex"');
  expect(html).toContain('data-node-id="u_alex_jordan"');
  expect(html).toContain('data-kind="partner-union"');
  expect(html).toContain('data-kind="union-child"');
  expect(html).toContain("&quot;people&quot;:7");
  expect(html).toContain("&quot;unions&quot;:3");
  expect(html).toContain("&quot;edges&quot;:9");
  expect(html).toContain("<strong>Alex</strong>");
  expect(html).toContain(result.edges[0]?.path ?? "missing-edge-path");
});
