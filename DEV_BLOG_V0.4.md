# Memoir Tree 0.4: Families Are Not Flat

Today we are releasing `@memoir/tree@0.4.0`, a new version of our lightweight family-tree renderer with graph mode: a better model for real family structure, multiple parents, guardianship, blended families, and the relationships that surround memory. At Memoir Labs, we are building the family memory layer: a place where stories, people, relationships, and context can live together over time.

That means the family tree cannot be a decorative chart on the side. It has to carry real meaning. When someone adds a memory about their childhood, their grandmother, their stepdad, their adoptive parent, or the person who raised them, the shape around that memory matters. The tree is part of how the memory becomes legible.

The early versions of `@memoir/tree` were intentionally small. You could pass people, parents, partners, children, and guardians, and the renderer would produce a readable neighborhood. That was enough for simple examples. It was not enough for the kind of families we actually want Memoir to support.

Real families are not flat.

A child might have a biological mother and an adoptive father. A parent might have children across multiple partnerships. Someone may want to include the other parent because that person is part of the story, even if they are no longer a partner. A guardian might be central to a life without being represented as a biological parent. A step parent can be deeply important without the software pretending the lineage is something it is not.

If our goal is to help families preserve memory, the model has to make room for those truths.

## Why Add the Other Parent?

One of the simplest product questions exposed the deeper modeling problem: what happens when someone wants to add the other parent?

That sounds small. It is not.

Adding the other parent is not just adding another node. It can mean adding a co-parenting relationship, a former partnership, a current spouse, a step parent, or an unknown relationship that the family still wants represented. It can also mean adding context for a child without forcing the app to invent a fake union or flatten everyone into the same row.

For Memoir, this matters because memories are relational. A photo from a birthday, a story about a move, a note about who raised someone, or a remembrance of a parent all depend on the surrounding family context. The tree should help that context become visible without making narrow assumptions about what a family is supposed to look like.

## Graph Mode

`@memoir/tree@0.4.0` adds graph mode:

```tsx
<FamilyTree graph={familyGraph} />
```

The new model separates the pieces that used to get blended together:

- `partnershipGroups` for spouse, partner, and co-parent clusters
- `parentChildLinks` for each individual parent-to-child lineage
- `guardianshipLinks` for guardianship relationships that should not be treated as parentage

That gives the renderer enough information to keep family structure honest. Multiple unions stay distinct. Biological, adoptive, step, foster, and unknown lineage can be represented per parent. Guardianship can appear as guardianship. Children in the same household can still have different relationships to each adult.

This is a more inclusive model because it does not assume every family is one couple plus shared biological children. It gives apps room to represent blended families, chosen caregivers, adoptive families, foster relationships, co-parenting, separation, and ambiguity.

## Simple Mode Still Exists

The lightweight helpers are still here:

```ts
rel.parents("riley", ["alex", "jordan"]);
rel.children(["alex", "morgan"], ["casey"]);
```

They are still useful for sketches, examples, and straightforward trees. But for real family-memory products, graph mode is the path forward.

## Still Lightweight

Tree 0.4 does not try to become Memoir’s database, editor, permissions layer, invite system, or source of truth. It renders and lays out the family graph. Apps still own persistence, privacy, editing, validation, and the product decisions around who can see or change what.

That boundary is important. We want `@memoir/tree` to stay lightweight and hackable, while giving Memoir Labs and other builders a better foundation for relationship-aware family experiences.

Families are complex. The software should be careful with that complexity.

Tree 0.4 is a step toward a family memory layer that can hold more kinds of families with more respect.
