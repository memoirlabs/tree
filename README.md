# Memoir Tree

[![JSR](https://jsr.io/badges/@memoir/tree)](https://jsr.io/@memoir/tree)
[![JSR Score](https://jsr.io/badges/@memoir/tree/score)](https://jsr.io/@memoir/tree)
[![JSR Weekly Downloads](https://jsr.io/badges/@memoir/tree/weekly-downloads)](https://jsr.io/@memoir/tree)

Official React components for rendering interactive family trees with relationship-aware connectors. Data fetching and persistence are intentionally left to the host app.

## Install (Bun + JSR)

```bash
bunx jsr add @memoir/tree
```

## Requirements

- React 18 or 19.
- Tailwind classes are used for styling. Define the design tokens referenced by the library (examples below).

## Quick Start

```tsx
import { FamilyTree } from "@memoir/tree";
import type { FamilyMember, AddMemberPayload } from "@memoir/tree";

const rootMember: FamilyMember = {
  id: "root",
  name: "Alex Johnson",
  status: "linked",
  parents: [],
  siblings: [],
  children: [],
};

export function FamilyTreePage() {
  const handleAddMember = async (payload: AddMemberPayload) => {
    // Persist to your backend, then update your `rootMember` tree.
    console.log("Add member", payload);
  };

  return (
    <FamilyTree
      rootMember={rootMember}
      canEdit
      onAddMember={handleAddMember}
      searchProfiles={async (query) => {
        // Return your own search results
        return [];
      }}
      onNavigateProfile={(member, target) => {
        // Route using your app router
        console.log("Navigate", member, target);
      }}
      resolveAvatarUrl={(url) => url || ""}
      designPreset="contrast"
    />
  );
}
```

## Data Model

The tree is derived from nested arrays on `FamilyMember`:

- `parents`: Direct parents for the member.
- `siblings`: Direct siblings for the member.
- `children`: Direct children for the member.
- `spouse`: The member’s partner. The layout supports a single spouse per node.

The `relation` field is used for labels only. Layout is driven by the relationship arrays above.

## Relationship Layout Rules

Connector placement is deterministic and consistent across presets:

- `spouse`: Partner line connects at **mid‑height** on each card’s **inner edge** (left/right), inset by `anchors.coupleInsetPx`.
- `parent → child` (couple): A junction is placed at the midpoint of the couple line. A vertical **trunk** drops to a horizontal **sibling bus** above the children, and each child connects **from the top center** down to that bus.
- `parent → child` (single parent): The junction is the **bottom center** of the parent card; trunk + bus + child drops apply.
- `siblings`: Siblings connect through the shared sibling bus above them; each sibling drops from its **top center** to the bus.

Ordering is based on the array order you provide. Siblings are split left and right around the root member based on list order.

## Editing And Add‑Member Workflow

When `canEdit` is true, the UI emits an `AddMemberPayload` via `onAddMember`:

- `type: "existing"`: user selected from `searchProfiles` results.
- `type: "manual"`: manual entry (name, optional birthday).
- `type: "invite"`: invite by email.

You are responsible for persistence and updating the `rootMember` tree once the add completes.

### Restrict Which Relations Can Be Added

Use `relationOptions` to control which relationship types appear in the add menu:

```tsx
<FamilyTree
  rootMember={rootMember}
  canEdit
  onAddMember={handleAddMember}
  relationOptions={(member, isRoot) =>
    isRoot ? ["parent", "sibling", "spouse", "child"] : ["child"]
  }
/>
```

## Customization

### Presets And Overrides

Connector styling is controlled by presets or overrides:

- `designPreset`: `default`, `compact`, `contrast`.
- `designOverrides`: partial override of `FamilyTreeConnectorConfig`.

Example override:

```tsx
import { getFamilyTreeConfig } from "@memoir/tree";

const config = getFamilyTreeConfig("compact", {
  statusColors: {
    linked: "bg-emerald-500",
  },
  anchors: {
    verticalGapPx: 32,
  },
});
```

### Custom Card Rendering

If you want to render your own card UI while keeping layout and connectors, provide `renderNode`:

```tsx
import type { FamilyMember, FamilyTreeRenderNodeOptions } from "@memoir/tree";

const renderNode = (member: FamilyMember, options: FamilyTreeRenderNodeOptions) => (
  <div className="custom-card">
    <div>{member.name}</div>
    {options.canEdit ? (
      <button onClick={() => options.onAddMember("child", member.id)}>
        Add child
      </button>
    ) : null}
  </div>
);

<FamilyTree rootMember={rootMember} renderNode={renderNode} />;
```

### Layout And Title Styling

Use these props to integrate with your page layout:

- `className`: applied to the outermost wrapper.
- `containerClassName`: applied to the padded inner container.
- `titleClassName`: applied to the title.
- `showTitle`: set `false` to hide the header.

## Styling Tokens

The UI uses Tailwind class tokens you must define in your design system:

- `bg-canvas-base`, `bg-canvas-muted`, `bg-bg`
- `text-copy-primary`, `text-copy-secondary`, `text-copy-muted`, `text-copy-disabled`
- `border-stroke-default`, `border-stroke-muted`
- `bg-stroke-default`
- `type-display-lg`, `type-heading-md`, `type-caption`

If you don’t use these names, map them to your own tokens or replace classes at build time.

## API Reference

### `FamilyTree` Props

- `rootMember` (required): Root of the tree.
- `title`: Title text. Defaults to `Family Tree`.
- `showTitle`: Hide or show the title header.
- `className`: Outer wrapper class.
- `containerClassName`: Inner container class.
- `titleClassName`: Title class.
- `canEdit`: Enables add‑member UI.
- `onAddMember`: Called with `AddMemberPayload` when a member is added.
- `searchProfiles`: Async search provider for the dialog.
- `onNavigateProfile`: Called when a card with a profile ID or slug is clicked.
- `resolveAvatarUrl`: Optional URL resolver for avatar images.
- `designPreset`: Connector preset (`default`, `compact`, `contrast`).
- `designOverrides`: Override connector sizing and colors.
- `relationOptions`: Restrict add‑member relation choices.
- `renderNode`: Render your own card UI.

### `FamilyMember`

- `id`: Unique string identifier.
- `name`: Display name.
- `birthday`: Optional display string.
- `avatarUrl`: Optional avatar URL.
- `relation`: Optional label for the card.
- `status`: `linked`, `manual`, or `invite_pending` (affects connector color).
- `profileId` / `profileSlug`: Used for navigation targets.
- `parents`, `siblings`, `children`, `spouse`: Relationship arrays driving layout.

### `AddMemberPayload`

- `type: "existing"`: `{ relation, parentId, name, profileId, avatarUrl }`
- `type: "manual"`: `{ relation, parentId, name, birthday? }`
- `type: "invite"`: `{ relation, parentId, firstName, lastName?, email }`

## License

MIT
