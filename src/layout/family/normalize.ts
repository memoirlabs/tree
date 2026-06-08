import type {
  FamilyLayoutInput,
  FamilyLayoutOptions,
  FamilyLayoutWarning,
  FamilyParentLink,
  FamilyUnion,
  PersonId,
  UnionId,
} from "./types";

export interface NormalizedFamilyPerson<Person = unknown> {
  id: PersonId;
  data: Person;
  synthetic: boolean;
  hidden: boolean;
}

export interface NormalizedFamilyUnion {
  id: UnionId;
  partners: PersonId[];
  children: PersonId[];
  kind: FamilyUnion["kind"];
  status: FamilyUnion["status"];
  order: number;
  synthetic: boolean;
}

export interface NormalizedFamilyLayoutInput<Person = unknown> {
  people: Map<PersonId, NormalizedFamilyPerson<Person>>;
  unions: Map<UnionId, NormalizedFamilyUnion>;
  parentLinks: FamilyParentLink[];
  root?: string;
  center?: string;
  warnings: FamilyLayoutWarning[];
}

const unique = <Value>(values: Value[]) => Array.from(new Set(values));

const warning = (code: FamilyLayoutWarning["code"], message: string, ids?: string[]): FamilyLayoutWarning => ({
  code,
  message,
  ids,
});

const syntheticUnionId = (parents: PersonId[]) => `u:${parents.toSorted().join("+")}`;

function createSyntheticPerson<Person>(id: PersonId, options: FamilyLayoutOptions): NormalizedFamilyPerson<Person> {
  return {
    id,
    data: { label: options.unknownPerson.label } as Person,
    synthetic: true,
    hidden: !options.unknownPerson.enabled,
  };
}

function ensurePerson<Person>(
  people: Map<PersonId, NormalizedFamilyPerson<Person>>,
  id: PersonId,
  options: FamilyLayoutOptions,
  warnings: FamilyLayoutWarning[],
) {
  if (people.has(id)) return;
  people.set(id, createSyntheticPerson(id, options));
  warnings.push(warning("synthetic-person-created", `Created synthetic person for missing id ${id}.`, [id]));
}

function addUnionChild(union: NormalizedFamilyUnion, child: PersonId, warnings: FamilyLayoutWarning[]) {
  if (union.children.includes(child)) {
    warnings.push(warning("duplicate-child-in-union", `Duplicate child ${child} in union ${union.id}.`, [union.id, child]));
    return;
  }
  union.children.push(child);
}

export function normalizeFamilyLayoutInput<Person>(
  input: FamilyLayoutInput<Person>,
  options: FamilyLayoutOptions,
): NormalizedFamilyLayoutInput<Person> {
  if (!input.people || typeof input.people !== "object") {
    throw new Error("layoutFamilyTree requires a people object.");
  }

  const warnings: FamilyLayoutWarning[] = [];
  const people = new Map<PersonId, NormalizedFamilyPerson<Person>>();
  const unions = new Map<UnionId, NormalizedFamilyUnion>();
  const parentLinks: FamilyParentLink[] = [];

  for (const [id, data] of Object.entries(input.people) as Array<[PersonId, Person]>) {
    if (people.has(id)) {
      warnings.push(warning("duplicate-person", `Duplicate person id ignored: ${id}.`, [id]));
      continue;
    }
    people.set(id, { id, data, synthetic: false, hidden: false });
  }

  for (const union of input.unions ?? []) {
    if (unions.has(union.id)) {
      warnings.push(warning("duplicate-union", `Duplicate union id ignored: ${union.id}.`, [union.id]));
      continue;
    }

    const partners = unique(union.partners);
    const children = unique(union.children ?? []);
    for (const personId of [...partners, ...children]) {
      ensurePerson(people, personId, options, warnings);
    }

    unions.set(union.id, {
      id: union.id,
      partners,
      children,
      kind: union.kind,
      status: union.status,
      order: union.order ?? Number.POSITIVE_INFINITY,
      synthetic: false,
    });

    if ((union.children ?? []).length !== children.length) {
      warnings.push(warning("duplicate-child-in-union", `Duplicate children removed from union ${union.id}.`, [union.id]));
    }
  }

  const linksBySyntheticUnion = new Map<UnionId, FamilyParentLink[]>();
  for (const link of input.parentLinks ?? []) {
    ensurePerson(people, link.parent, options, warnings);
    ensurePerson(people, link.child, options, warnings);

    if (link.union) {
      parentLinks.push(link);
      continue;
    }

    const existing = linksBySyntheticUnion.get(link.child) ?? [];
    existing.push(link);
    linksBySyntheticUnion.set(link.child, existing);
  }

  const linksByParentSet = new Map<UnionId, FamilyParentLink[]>();
  for (const links of linksBySyntheticUnion.values()) {
    const unionId = syntheticUnionId(links.map((link) => link.parent));
    const existing = linksByParentSet.get(unionId) ?? [];
    existing.push(...links);
    linksByParentSet.set(unionId, existing);
  }

  for (const [unionId, links] of linksByParentSet) {
    const partners = unique(links.map((link) => link.parent));
    const children = unique(links.map((link) => link.child));
    let union = unions.get(unionId);
    if (!union) {
      union = {
        id: unionId,
        partners,
        children: [],
        kind: "unknown",
        status: "unknown",
        order: Number.POSITIVE_INFINITY,
        synthetic: true,
      };
      unions.set(unionId, union);
      warnings.push(warning("synthetic-union-created", `Created synthetic union ${unionId}.`, [unionId]));
    }
    for (const partner of partners) {
      if (!union.partners.includes(partner)) union.partners.push(partner);
    }
    for (const child of children) addUnionChild(union, child, warnings);
    for (const link of links) parentLinks.push({ ...link, union: unionId });
  }

  const seenParentLinks = new Set<string>();
  const dedupedParentLinks: FamilyParentLink[] = [];
  for (const link of parentLinks) {
    const union = link.union ? unions.get(link.union) : undefined;
    if (!union) {
      warnings.push(warning("missing-union", `Parent link references missing union ${link.union}.`, [link.union ?? ""]));
      continue;
    }
    if (!union.partners.includes(link.parent)) {
      union.partners.push(link.parent);
      warnings.push(warning("invalid-parent-link", `Added parent ${link.parent} to union ${union.id}.`, [union.id, link.parent]));
    }
    if (!union.children.includes(link.child)) union.children.push(link.child);

    const key = `${link.parent}->${link.child}@${union.id}:${link.kind ?? "unknown"}`;
    if (seenParentLinks.has(key)) {
      warnings.push(warning("duplicate-parent-link", `Duplicate parent link ignored: ${key}.`, [link.parent, link.child, union.id]));
      continue;
    }
    seenParentLinks.add(key);
    dedupedParentLinks.push({ ...link, union: union.id });
  }

  for (const union of unions.values()) {
    for (const child of union.children) {
      const hasLink = dedupedParentLinks.some((link) => link.union === union.id && link.child === child);
      if (hasLink) continue;
      for (const partner of union.partners) {
        dedupedParentLinks.push({
          parent: partner,
          child,
          union: union.id,
          kind: "unknown",
        });
      }
    }
  }

  return {
    people,
    unions,
    parentLinks: dedupedParentLinks,
    root: input.root,
    center: input.center,
    warnings,
  };
}
