import type { OrgReportingRelationship, OrgReportingRelation, OrgReportingStatus, PersonId } from "./types";

export interface OrgReportsOptions {
  id?: string;
  relation?: OrgReportingRelation;
  status?: OrgReportingStatus;
  order?: number;
}

export interface OrgRelationshipHelpers {
  reports(
    managerId: PersonId,
    reportIds: PersonId | PersonId[],
    options?: OrgReportsOptions,
  ): OrgReportingRelationship;
}

const arrayOf = (value: PersonId | PersonId[]): PersonId[] => (Array.isArray(value) ? value : [value]);

export const org: OrgRelationshipHelpers = {
  reports(
    managerId: PersonId,
    reportIds: PersonId | PersonId[],
    options: OrgReportsOptions = {},
  ): OrgReportingRelationship {
    return {
      type: "reporting",
      managerId,
      reportIds: arrayOf(reportIds),
      relation: options.relation ?? "manager",
      status: options.status ?? "current",
      ...(options.id !== undefined ? { id: options.id } : {}),
      ...(options.order !== undefined ? { order: options.order } : {}),
    };
  },
};
