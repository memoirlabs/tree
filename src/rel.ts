import type {
  FamilyGuardianshipRelationship,
  FamilyParentageRelationship,
  FamilyPartnershipRelationship,
  GuardianshipRelation,
  ParentageRelation,
  PartnershipRelation,
  FamilyRelationshipStatus,
  PersonId,
} from "./types";

export interface ParentageOptions {
  id?: string;
  relation?: ParentageRelation;
  status?: FamilyRelationshipStatus;
  order?: number;
}

export interface PartnershipOptions {
  id?: string;
  relation?: PartnershipRelation;
  status?: FamilyRelationshipStatus;
  order?: number;
}

export interface GuardianshipOptions {
  id?: string;
  relation?: GuardianshipRelation;
  status?: FamilyRelationshipStatus;
  order?: number;
}

const arrayOf = (value: PersonId | PersonId[]): PersonId[] => (Array.isArray(value) ? value : [value]);

const optionalFields = <T extends { id?: string; status?: FamilyRelationshipStatus; order?: number }>(options: T) => ({
  ...(options.id !== undefined ? { id: options.id } : {}),
  ...(options.status !== undefined ? { status: options.status } : {}),
  ...(options.order !== undefined ? { order: options.order } : {}),
});

export const rel = {
  parents(child: PersonId, parents: PersonId[], options: ParentageOptions = {}): FamilyParentageRelationship {
    return {
      type: "parentage",
      parents,
      children: [child],
      relation: options.relation ?? "biological",
      ...optionalFields({ ...options, status: options.status }),
    };
  },

  children(
    parents: PersonId | PersonId[],
    children: PersonId | PersonId[],
    options: ParentageOptions = {},
  ): FamilyParentageRelationship {
    return {
      type: "parentage",
      parents: arrayOf(parents),
      children: arrayOf(children),
      relation: options.relation ?? "biological",
      ...optionalFields({ ...options, status: options.status }),
    };
  },

  partner(a: PersonId, b: PersonId, options: PartnershipOptions = {}): FamilyPartnershipRelationship {
    return {
      type: "partnership",
      partners: [a, b],
      relation: options.relation ?? "partner",
      status: options.status ?? "current",
      ...optionalFields(options),
    };
  },

  guardians(
    child: PersonId,
    guardians: PersonId[],
    options: GuardianshipOptions = {},
  ): FamilyGuardianshipRelationship {
    return {
      type: "guardianship",
      guardians,
      children: [child],
      relation: options.relation ?? "guardian",
      ...optionalFields({ ...options, status: options.status }),
    };
  },
};
