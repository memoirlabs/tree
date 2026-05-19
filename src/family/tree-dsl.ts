import type {
  FamilyRelationship,
  FamilyRelationshipStatus,
  GuardianshipRelation,
  OrgChartNode,
  ParentageRelation,
  PartnershipRelation,
  PeopleById,
  PersonId,
} from "./types";

export type TreeDslAttributeValue = string | number | boolean;

export interface TreeDslNode {
  id: PersonId;
  name: string;
  label: string;
  profile: {
    display: string;
    avatar?: string;
    image?: string;
    photo?: string;
  };
  [key: string]: unknown;
}

export interface TreeDslNodeInput {
  id: PersonId;
  label?: string;
  attributes: Record<string, TreeDslAttributeValue>;
}

export interface CreateFamilyTreeOptions<Person = TreeDslNode> {
  subject?: PersonId;
  person?: (node: TreeDslNode) => Person;
}

export interface CreateOrgTreeOptions<Person = TreeDslNode> {
  rootId?: PersonId;
  person?: (node: TreeDslNode) => Person;
}

export interface FamilyTreeDefinition<Person = TreeDslNode> {
  subject: PersonId;
  people: PeopleById<Person>;
  relationships: FamilyRelationship[];
}

export interface OrgTreeDefinition<Person = TreeDslNode> {
  rootId: PersonId;
  nodes: OrgChartNode<Person>[];
}

export class TreeDslError extends Error {
  readonly line?: number;

  constructor(message: string, line?: number) {
    super(line === undefined ? message : `Line ${line}: ${message}`);
    this.name = "TreeDslError";
    this.line = line;
  }
}

type DirectiveKind = "subject" | "root";

interface DirectiveStatement {
  type: "directive";
  kind: DirectiveKind;
  id: PersonId;
  line: number;
}

interface NodeStatement {
  type: "node";
  node: TreeDslNodeInput;
  line: number;
}

interface EdgeStatement {
  type: "edge";
  sources: TreeDslNodeInput[];
  targets: TreeDslNodeInput[];
  metadata: RelationshipMetadata;
  line: number;
}

interface PartnerStatement {
  type: "partner";
  partners: TreeDslNodeInput[];
  metadata: RelationshipMetadata;
  line: number;
}

type TreeDslStatement = DirectiveStatement | NodeStatement | EdgeStatement | PartnerStatement;

interface ParsedTreeDsl {
  nodes: Map<PersonId, TreeDslNodeInput>;
  statements: TreeDslStatement[];
}

interface RelationshipMetadata {
  parentageRelation?: ParentageRelation;
  partnershipRelation?: PartnershipRelation;
  guardianshipRelation?: GuardianshipRelation;
  status?: FamilyRelationshipStatus;
  order?: number;
  isGuardianship?: boolean;
}

const idPattern = /^[A-Za-z_][A-Za-z0-9_-]*/;

const parentageRelations = new Set<ParentageRelation>(["biological", "adoptive", "step", "foster", "unknown"]);
const partnershipRelations = new Set<PartnershipRelation>(["spouse", "partner", "coparent", "unknown"]);
const guardianshipRelations = new Set<GuardianshipRelation>(["guardian", "foster", "unknown"]);
const relationshipStatuses = new Set<FamilyRelationshipStatus>([
  "current",
  "former",
  "divorced",
  "separated",
  "unknown",
]);

function stripComment(line: string): string {
  let inQuote = false;
  let escaped = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (char === "#" && !inQuote) return line.slice(0, index);
  }

  return line;
}

function splitTopLevel(value: string, separator: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let inQuote = false;
  let escaped = false;
  let bracketDepth = 0;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (!inQuote && char === "[") bracketDepth += 1;
    if (!inQuote && char === "]") bracketDepth -= 1;
    if (!inQuote && bracketDepth === 0 && value.startsWith(separator, index)) {
      parts.push(value.slice(start, index).trim());
      start = index + separator.length;
      index += separator.length - 1;
    }
  }

  parts.push(value.slice(start).trim());
  return parts.filter(Boolean);
}

function findTopLevel(value: string, token: string): number {
  let inQuote = false;
  let escaped = false;
  let bracketDepth = 0;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (!inQuote && char === "[") bracketDepth += 1;
    if (!inQuote && char === "]") bracketDepth -= 1;
    if (!inQuote && bracketDepth === 0 && value.startsWith(token, index)) return index;
  }

  return -1;
}

function unquote(value: string, line: number): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith('"') || !trimmed.endsWith('"')) {
    throw new TreeDslError(`Expected quoted string, got "${trimmed}".`, line);
  }
  return trimmed.slice(1, -1).replaceAll('\\"', '"').replaceAll("\\\\", "\\");
}

function parseAttributeValue(value: string, line: number): TreeDslAttributeValue {
  const trimmed = value.trim();
  if (trimmed.startsWith('"')) return unquote(trimmed, line);
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;

  const numberValue = Number(trimmed);
  if (trimmed !== "" && Number.isFinite(numberValue)) return numberValue;
  if (/^[A-Za-z0-9_-]+$/.test(trimmed)) return trimmed;

  throw new TreeDslError(`Invalid attribute value "${trimmed}".`, line);
}

function parseNodeRef(value: string, line: number): TreeDslNodeInput {
  const trimmed = value.trim();
  const idMatch = idPattern.exec(trimmed);
  if (!idMatch) throw new TreeDslError(`Expected node id, got "${trimmed}".`, line);

  const id = idMatch[0];
  const rest = trimmed.slice(id.length).trim();
  const attributes: Record<string, TreeDslAttributeValue> = {};
  let label: string | undefined;

  if (rest === "") return { id, label, attributes };
  if (!rest.startsWith("[") || !rest.endsWith("]")) {
    throw new TreeDslError(`Unexpected node syntax after "${id}".`, line);
  }

  const content = rest.slice(1, -1).trim();
  if (content === "") return { id, label, attributes };

  for (const part of splitTopLevel(content, ",")) {
    const equalsIndex = findTopLevel(part, "=");
    if (equalsIndex === -1) {
      if (label !== undefined) throw new TreeDslError(`Node "${id}" has more than one label.`, line);
      label = unquote(part, line);
      continue;
    }

    const key = part.slice(0, equalsIndex).trim();
    const rawValue = part.slice(equalsIndex + 1).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(key)) {
      throw new TreeDslError(`Invalid attribute key "${key}".`, line);
    }
    attributes[key] = parseAttributeValue(rawValue, line);
  }

  return { id, label, attributes };
}

function parseNodeList(value: string, line: number): TreeDslNodeInput[] {
  const nodes = splitTopLevel(value, "+").map((part) => parseNodeRef(part, line));
  if (nodes.length === 0) throw new TreeDslError("Expected at least one node.", line);
  return nodes;
}

function mergeNode(existing: TreeDslNodeInput | undefined, incoming: TreeDslNodeInput, line: number): TreeDslNodeInput {
  if (!existing) return incoming;
  if (incoming.label !== undefined && existing.label !== undefined && incoming.label !== existing.label) {
    throw new TreeDslError(`Node "${incoming.id}" has conflicting labels.`, line);
  }

  const attributes = { ...existing.attributes };
  for (const [key, value] of Object.entries(incoming.attributes)) {
    if (attributes[key] !== undefined && attributes[key] !== value) {
      throw new TreeDslError(`Node "${incoming.id}" has conflicting "${key}" values.`, line);
    }
    attributes[key] = value;
  }

  return {
    id: existing.id,
    label: existing.label ?? incoming.label,
    attributes,
  };
}

function registerNodes(nodes: Map<PersonId, TreeDslNodeInput>, refs: TreeDslNodeInput[], line: number) {
  for (const ref of refs) {
    nodes.set(ref.id, mergeNode(nodes.get(ref.id), ref, line));
  }
}

function parseMetadata(raw: string, line: number): RelationshipMetadata {
  const metadata: RelationshipMetadata = {};
  const trimmed = raw.trim();
  if (trimmed === "") return metadata;

  const tokens = splitTopLevel(trimmed, ",").flatMap((part) => part.split(/\s+/).filter(Boolean));
  for (const token of tokens) {
    const equalsIndex = token.indexOf("=");
    const key = equalsIndex === -1 ? "relation" : token.slice(0, equalsIndex);
    const value = equalsIndex === -1 ? token : token.slice(equalsIndex + 1);

    if (key === "order") {
      const order = Number(value);
      if (!Number.isInteger(order)) throw new TreeDslError(`Invalid order "${value}".`, line);
      metadata.order = order;
      continue;
    }

    if (key === "status") {
      if (!relationshipStatuses.has(value as FamilyRelationshipStatus)) {
        throw new TreeDslError(`Unknown relationship status "${value}".`, line);
      }
      metadata.status = value as FamilyRelationshipStatus;
      continue;
    }

    if (key !== "relation" && key !== "kind") {
      throw new TreeDslError(`Unknown relationship metadata "${key}".`, line);
    }

    if (value === "guardian") metadata.isGuardianship = true;
    if (parentageRelations.has(value as ParentageRelation)) metadata.parentageRelation = value as ParentageRelation;
    if (partnershipRelations.has(value as PartnershipRelation)) {
      metadata.partnershipRelation = value as PartnershipRelation;
    }
    if (guardianshipRelations.has(value as GuardianshipRelation)) {
      metadata.guardianshipRelation = value as GuardianshipRelation;
    }
    if (relationshipStatuses.has(value as FamilyRelationshipStatus)) {
      metadata.status = value as FamilyRelationshipStatus;
    }

    if (
      !parentageRelations.has(value as ParentageRelation) &&
      !partnershipRelations.has(value as PartnershipRelation) &&
      !guardianshipRelations.has(value as GuardianshipRelation) &&
      !relationshipStatuses.has(value as FamilyRelationshipStatus)
    ) {
      throw new TreeDslError(`Unknown relationship metadata "${value}".`, line);
    }
  }

  return metadata;
}

function parseTreeDsl(input: string): ParsedTreeDsl {
  const nodes = new Map<PersonId, TreeDslNodeInput>();
  const statements: TreeDslStatement[] = [];
  const lines = input.split(/\r?\n/);

  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const line = stripComment(rawLine).trim();
    if (line === "") return;

    const directive = /^(subject|root)\s+([A-Za-z_][A-Za-z0-9_-]*)$/.exec(line);
    if (directive) {
      statements.push({ type: "directive", kind: directive[1] as DirectiveKind, id: directive[2] as PersonId, line: lineNumber });
      return;
    }

    const colonIndex = findTopLevel(line, ":");
    const body = colonIndex === -1 ? line : line.slice(0, colonIndex).trim();
    const metadata = colonIndex === -1 ? {} : parseMetadata(line.slice(colonIndex + 1), lineNumber);
    const arrowIndex = findTopLevel(body, "->");

    if (arrowIndex !== -1) {
      const sources = parseNodeList(body.slice(0, arrowIndex), lineNumber);
      const targets = parseNodeList(body.slice(arrowIndex + 2), lineNumber);
      registerNodes(nodes, sources, lineNumber);
      registerNodes(nodes, targets, lineNumber);
      statements.push({ type: "edge", sources, targets, metadata, line: lineNumber });
      return;
    }

    if (findTopLevel(body, "+") !== -1) {
      const partners = parseNodeList(body, lineNumber);
      registerNodes(nodes, partners, lineNumber);
      statements.push({ type: "partner", partners, metadata, line: lineNumber });
      return;
    }

    const node = parseNodeRef(body, lineNumber);
    registerNodes(nodes, [node], lineNumber);
    statements.push({ type: "node", node, line: lineNumber });
  });

  return { nodes, statements };
}

function createDefaultNode(input: TreeDslNodeInput): TreeDslNode {
  const display = input.label ?? input.id;
  const node: TreeDslNode = {
    id: input.id,
    name: display,
    label: display,
    profile: { display },
    ...input.attributes,
  };

  if (typeof input.attributes.avatar === "string") node.profile.avatar = input.attributes.avatar;
  if (typeof input.attributes.image === "string") node.profile.image = input.attributes.image;
  if (typeof input.attributes.photo === "string") node.profile.photo = input.attributes.photo;

  return node;
}

function createPeople<Person>(
  nodes: Map<PersonId, TreeDslNodeInput>,
  mapPerson: ((node: TreeDslNode) => Person) | undefined,
): PeopleById<Person> {
  const people: PeopleById<Person> = {};
  for (const node of nodes.values()) {
    const defaultNode = createDefaultNode(node);
    people[node.id] = mapPerson ? mapPerson(defaultNode) : (defaultNode as Person);
  }
  return people;
}

function metadataToParentage(metadata: RelationshipMetadata): Pick<FamilyRelationship, "status" | "order"> & {
  relation: ParentageRelation;
} {
  return {
    relation: metadata.parentageRelation ?? "biological",
    ...(metadata.status !== undefined ? { status: metadata.status } : {}),
    ...(metadata.order !== undefined ? { order: metadata.order } : {}),
  };
}

function metadataToPartnership(metadata: RelationshipMetadata): {
  relation: PartnershipRelation;
  status: FamilyRelationshipStatus;
  order?: number;
} {
  return {
    relation: metadata.partnershipRelation ?? "partner",
    status: metadata.status ?? "current",
    ...(metadata.order !== undefined ? { order: metadata.order } : {}),
  };
}

function metadataToGuardianship(metadata: RelationshipMetadata): Pick<FamilyRelationship, "status" | "order"> & {
  relation: GuardianshipRelation;
} {
  return {
    relation: metadata.guardianshipRelation ?? "guardian",
    ...(metadata.status !== undefined ? { status: metadata.status } : {}),
    ...(metadata.order !== undefined ? { order: metadata.order } : {}),
  };
}

export function createFamilyTree(input: string): FamilyTreeDefinition<TreeDslNode>;
export function createFamilyTree<Person>(
  input: string,
  options: CreateFamilyTreeOptions<Person>,
): FamilyTreeDefinition<Person>;
export function createFamilyTree<Person = TreeDslNode>(
  input: string,
  options: CreateFamilyTreeOptions<Person> = {},
): FamilyTreeDefinition<Person> {
  const parsed = parseTreeDsl(input);
  const subjectStatements = parsed.statements.filter(
    (statement): statement is DirectiveStatement => statement.type === "directive" && statement.kind === "subject",
  );
  const subject = options.subject ?? subjectStatements.at(-1)?.id;
  if (!subject) throw new TreeDslError('Family tree DSL requires `subject id` or the `{ subject }` option.');
  if (!parsed.nodes.has(subject)) throw new TreeDslError(`Subject "${subject}" is not declared in the family tree.`);

  const relationships: FamilyRelationship[] = [];
  const partnershipKeys = new Set<string>();

  const addPartnership = (partners: PersonId[], metadata: RelationshipMetadata, line: number) => {
    if (partners.length !== 2) throw new TreeDslError("Partnerships require exactly two people.", line);
    const key = partners.toSorted().join("|");
    if (partnershipKeys.has(key)) return;
    partnershipKeys.add(key);
    relationships.push({
      type: "partnership",
      partners,
      ...metadataToPartnership(metadata),
    });
  };

  for (const statement of parsed.statements) {
    if (statement.type === "partner") {
      addPartnership(
        statement.partners.map((partner) => partner.id),
        statement.metadata,
        statement.line,
      );
      continue;
    }

    if (statement.type !== "edge") continue;
    const sourceIds = statement.sources.map((source) => source.id);
    const targetIds = statement.targets.map((target) => target.id);

    if (sourceIds.some((sourceId) => targetIds.includes(sourceId))) {
      throw new TreeDslError("A person cannot be connected to themself.", statement.line);
    }

    if (statement.metadata.isGuardianship) {
      relationships.push({
        type: "guardianship",
        guardians: sourceIds,
        children: targetIds,
        ...metadataToGuardianship(statement.metadata),
      });
      continue;
    }

    if (statement.sources.length === 2 && statement.metadata.partnershipRelation !== undefined) {
      addPartnership(sourceIds, statement.metadata, statement.line);
    }

    relationships.push({
      type: "parentage",
      parents: sourceIds,
      children: targetIds,
      ...metadataToParentage(statement.metadata),
    });
  }

  return {
    subject,
    people: createPeople(parsed.nodes, options.person),
    relationships,
  };
}

function assertNoOrgCycle(parentByChild: Map<PersonId, PersonId>, lineByChild: Map<PersonId, number>) {
  for (const childId of parentByChild.keys()) {
    const seen = new Set<PersonId>();
    let current: PersonId | undefined = childId;

    while (current !== undefined) {
      if (seen.has(current)) {
        throw new TreeDslError(`Org chart contains a cycle involving "${current}".`, lineByChild.get(childId));
      }
      seen.add(current);
      current = parentByChild.get(current);
    }
  }
}

export function createOrgTree(input: string): OrgTreeDefinition<TreeDslNode>;
export function createOrgTree<Person>(input: string, options: CreateOrgTreeOptions<Person>): OrgTreeDefinition<Person>;
export function createOrgTree<Person = TreeDslNode>(
  input: string,
  options: CreateOrgTreeOptions<Person> = {},
): OrgTreeDefinition<Person> {
  const parsed = parseTreeDsl(input);
  const parentByChild = new Map<PersonId, PersonId>();
  const lineByChild = new Map<PersonId, number>();
  const orderByChild = new Map<PersonId, number>();
  const childCountsByParent = new Map<PersonId, number>();

  for (const statement of parsed.statements) {
    if (statement.type !== "edge") continue;
    if (statement.sources.length !== 1) {
      throw new TreeDslError("Org chart edges require exactly one manager.", statement.line);
    }

    const managerId = statement.sources[0]?.id;
    if (!managerId) throw new TreeDslError("Org chart edge is missing a manager.", statement.line);

    for (const target of statement.targets) {
      if (target.id === managerId) throw new TreeDslError("A manager cannot report to themself.", statement.line);
      const existingParent = parentByChild.get(target.id);
      if (existingParent !== undefined && existingParent !== managerId) {
        throw new TreeDslError(`Org chart node "${target.id}" has more than one manager.`, statement.line);
      }
      const order = childCountsByParent.get(managerId) ?? 0;
      childCountsByParent.set(managerId, order + 1);
      parentByChild.set(target.id, managerId);
      lineByChild.set(target.id, statement.line);
      orderByChild.set(target.id, order);
    }
  }

  assertNoOrgCycle(parentByChild, lineByChild);

  const rootStatements = parsed.statements.filter(
    (statement): statement is DirectiveStatement => statement.type === "directive" && statement.kind === "root",
  );
  const roots = Array.from(parsed.nodes.keys()).filter((id) => !parentByChild.has(id));
  const rootId = options.rootId ?? rootStatements.at(-1)?.id ?? roots[0];
  if (!rootId) throw new TreeDslError("Org tree DSL needs at least one node.");
  if (!parsed.nodes.has(rootId)) throw new TreeDslError(`Root "${rootId}" is not declared in the org tree.`);
  if (options.rootId === undefined && rootStatements.length === 0 && roots.length > 1) {
    throw new TreeDslError(`Org tree has multiple roots: ${roots.join(", ")}. Add \`root ${roots[0]}\`.`);
  }

  const people = createPeople(parsed.nodes, options.person);
  const nodes: OrgChartNode<Person>[] = Array.from(parsed.nodes.keys()).map((id) => ({
    id,
    person: people[id] as Person,
    parentId: id === rootId ? null : parentByChild.get(id) ?? null,
    order: orderByChild.get(id) ?? 0,
  }));

  return { rootId, nodes };
}
