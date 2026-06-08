import type { OrgReportingRelationship, OrgReportingRelation, OrgReportingStatus, PersonId } from "./types";

export interface OrgReportsOptions {
  id?: string;
  relation?: OrgReportingRelation;
  status?: OrgReportingStatus;
  order?: number;
}

export interface OrgRelationshipHelpers {
  manager(
    managerId: PersonId,
    reportIds: PersonId | PersonId[],
    options?: OrgReportsOptions,
  ): OrgReportingRelationship;
  report(
    managerId: PersonId,
    reportId: PersonId,
    options?: OrgReportsOptions,
  ): OrgReportingRelationship;
  reports(
    managerId: PersonId,
    reportIds: PersonId | PersonId[],
    options?: OrgReportsOptions,
  ): OrgReportingRelationship;
}

const arrayOf = (value: PersonId | PersonId[]): PersonId[] => (Array.isArray(value) ? value : [value]);

const createReportingRelationship = (
  managerId: PersonId,
  reportIds: PersonId | PersonId[],
  options: OrgReportsOptions = {},
): OrgReportingRelationship => ({
  type: "reporting",
  managerId,
  reportIds: arrayOf(reportIds),
  relation: options.relation ?? "manager",
  status: options.status ?? "current",
  ...(options.id !== undefined ? { id: options.id } : {}),
  ...(options.order !== undefined ? { order: options.order } : {}),
});

export const org: OrgRelationshipHelpers = {
  manager: createReportingRelationship,
  report: createReportingRelationship,
  reports: createReportingRelationship,
};
