export const revalidate = false;

export function GET() {
  return new Response(`# @memoir/tree

> Lightweight React 19 package for relationship-aware family trees and org charts.

@memoir/tree is a renderer, not a graph editor or data store. Apps own people, persistence, permissions, routing, editing flows, validation, and custom card markup. The package owns measured layout, relationship-aware edges, pan/scroll viewport state, accessibility props, and a small opt-in stylesheet.

## Install

\`\`\`bash
bun add @memoir/tree
\`\`\`

\`\`\`tsx
import { FamilyTree, OrgChart, rel, org } from "@memoir/tree";
import "@memoir/tree/styles.css";
\`\`\`

React is a peer dependency and must satisfy \`>=19.0.0 <20.0.0\`. The stylesheet is never auto-imported.

## FamilyTree

Use \`FamilyTree\` for a subject-centered family neighborhood. Recommended production input is \`graph\`:

- \`people\`: records keyed by person ID.
- \`subject\`: person ID at the center of the neighborhood.
- \`partnershipGroups\`: spouse, partner, coparent, or unknown groups.
- \`parentChildLinks\`: per-parent lineage links with biological, adoptive, step, foster, or unknown relation.
- \`guardianshipLinks\`: optional guardian/foster links separate from parentage.

Simple examples can use \`people\`, \`subject\`, and \`relationships\` with \`rel.parents()\`, \`rel.children()\`, \`rel.partner()\`, and \`rel.guardians()\`.

Family layout renders a bounded neighborhood: ancestor generations, subject row with siblings/half-siblings/partners, and descendant generations. Default limits are 2 ancestor generations, 2 descendant generations, no lateral family expansion, 4 grandparents, 4 parents, 8 siblings, 8 half-siblings, 3 partners, 8 children, and 8 grandchildren. A limit of \`null\` disables that cap.

Default family spacing is \`{ row: 80, column: 24, padding: 24 }\`.

Graph normalization groups \`parentChildLinks\` by \`groupId\`, \`relation\`, \`status\`, and \`order\`. Mixed lineage such as biological plus step/adoptive in one partnership group remains distinct so edge kinds stay accurate. If two parent links should render as one two-parent edge, use the same \`groupId\`, \`relation\`, \`status\`, and \`order\`.

Two-parent child groups join at the visible midpoint between parent cards. Multi-child groups split through a horizontal bus centered in the clear vertical gap between the parent cards and child row.

Unknown partner placeholders are display/layout facts, not real spouse bars. A partnership with \`relation: "unknown"\` or \`status: "unknown"\` renders the visible placeholder card without drawing a horizontal partnership edge. If that placeholder is also an actual co-parent, include it in the child \`parentChildLinks\` or \`rel.children([...parents], children)\` parent list so the parentage edge connects from both parents.

## OrgChart

Use \`OrgChart\` for rooted manager/report hierarchies. Recommended production input is \`graph\` with \`people\`, \`root\`, and \`reportingLinks\`. Simple examples can use \`people\`, \`root\`, and \`relationships\` with \`org.manager(managerId, reportIds, options?)\`, \`org.report(managerId, reportId, options?)\`, or \`org.reports(managerId, reportIds, options?)\`.

Org graph normalization groups \`reportingLinks\` by \`managerId\`, \`relation\`, \`status\`, and \`order\`. Links that share those values become one reporting relationship, while each rendered edge keeps its app-owned link \`id\`.

Org chart options include \`collapsed\`, \`maxDepth\`, \`selected\`, \`onPersonClick\`, custom \`card\`, \`renderCard\`, \`cardProps\`, viewport props, \`spacing\`, \`lineShape\`, and styling props.

Default org chart spacing is \`{ row: 80, column: 24, padding: 24 }\`.

## Custom Cards

Custom cards are regular React components. They must spread the provided props onto the card root so ARIA attributes, keyboard handlers, click handlers, data attributes, and selection/focus state reach the DOM. Use \`cardProps\` for app-owned typed props.

Avoid wrapping custom cards in native buttons if the card can contain nested buttons. Use the supplied root props instead.

## Viewport

Default \`interactionMode\` is \`"pan"\`: users can drag the canvas and non-interactive card surfaces with mouse, touch, or pen. Buttons, links, inputs, selects, textareas, contenteditable elements, and \`[data-tree-drag-ignore]\` do not start pan drags.

Other modes are \`"pan-page-scroll"\` for mouse/horizontal-touch tree dragging while vertical touch gestures scroll the page, \`"scroll"\` for normal browser scrollbars, and \`"none"\` for no viewport interaction.

Trees center the subject or org root by default after card measurement. Use \`defaultViewport\` for a custom uncontrolled starting position or \`initialViewport\` for explicit viewport modes. \`treeApiRef\` exposes only \`centerPerson(personId)\`, \`fitToSubject()\`, and \`resetViewport()\`.

## Styling

Use \`import "@memoir/tree/styles.css"\` for the default Memoir skin. Customize with CSS variables, \`theme\`, \`className\`, \`cardClassName\`, \`edgeClassName\`, stable data attributes, or fully custom React cards. Do not assume global resets or font imports.

Key selectors include \`[data-tree-surface]\`, \`[data-tree-canvas]\`, \`[data-tree-card]\`, \`[data-tree-edge]\`, \`[data-family-card]\`, \`[data-family-edge]\`, \`[data-org-card]\`, and \`[data-org-edge]\`.

## Public Helpers

Exports include \`FamilyTree\`, \`OrgChart\`, \`DefaultFamilyCard\`, \`StyledFamilyCard\`, \`DefaultOrgCard\`, \`TreeProvider\`, \`TreeCanvas\`, \`TreeEdges\`, \`TreeNodeLayer\`, \`TreeSurface\`, \`useTreeLayout\`, \`rel\`, \`org\` with \`org.manager\`, \`org.report\`, and \`org.reports\`, \`graphToFamilyRelationships\`, \`graphToOrgReportingRelationships\`, \`getFamilyPartnershipGroupIds\`, \`getFamilyChildBearingGroupIds\`, \`buildFamilyTreeLayout\`, \`buildOrgChartLayout\`, \`buildLayeredTreeLayout\`, \`createFamilyIndex\`, \`collectFamilyNeighborhood\`, \`defaultFamilyNeighborhoodLimits\`, \`createFamilyLayoutService\`, \`layoutFamilyTree\`, \`createUnionParentLinks\`, \`defaultFamilyLayoutOptions\`, \`resolveFamilyLayoutOptions\`, \`createOrgChartIndex\`, \`collectOrgChartSubtree\`, \`treeStylePresets\`, and \`getTreeStyleName\`.

## Docs

- /docs
- /docs/family-tree
- /docs/org-chart
- /docs/design
- /docs/api
- /docs/development
- /docs/project-structure
- /llms-full.txt
`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
