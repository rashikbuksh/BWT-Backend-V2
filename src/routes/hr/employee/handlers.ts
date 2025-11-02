import type { AppRouteHandler } from '@/lib/types';

import { desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { handleImagePatch, PG_DECIMAL_TO_FLOAT } from '@/lib/variables';
import { createApi } from '@/utils/api';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type {
  CreateRoute,
  GetBulkShiftForEmployeeRoute,
  GetEmployeeAttendanceReportRoute,
  GetEmployeeLeaveInformationDetailsRoute,
  GetEmployeeSalaryByFiscalYearRoute,
  GetEmployeeSummaryDetailsByEmployeeUuidRoute,
  GetManualEntryByEmployeeRoute,
  GetOneRoute,
  ListRoute,
  PatchRoute,
  PostBulkEmployeeInformationRoute,
  RemoveRoute,
  UpdateProfilePictureRoute,
} from './routes';

import {
  department,
  designation,
  employee,
  employee_log,
  employment_type,
  fiscal_year,
  leave_policy,
  sub_department,
  users,
  workplace,
} from '../schema';

const createdByUser = alias(users, 'created_by_user');
const lineManagerUser = alias(users, 'line_manager_user');
const hrManagerUser = alias(users, 'hr_manager_user');
const firstLeaveApprover = alias(users, 'first_leave_approver');
const secondLeaveApprover = alias(users, 'second_leave_approver');
const firstLateApprover = alias(users, 'first_late_approver');
const secondLateApprover = alias(users, 'second_late_approver');
const firstManualEntryApprover = alias(users, 'first_manual_entry_approver');
const secondManualEntryApprover = alias(users, 'second_manual_entry_approver');
const updatedByUser = alias(users, 'updated_by_user');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(employee).values(value).returning({
    name: employee.id,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(employee)
    .set(updates)
    .where(eq(employee.uuid, uuid))
    .returning({
      name: employee.id,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const deleteFromEmployeeLog = db.delete(employee_log)
    .where(eq(employee_log.employee_uuid, uuid))
    .returning({
      id: employee_log.id,
    });

  await deleteFromEmployeeLog;

  // Now delete the employee from the database
  const [data] = await db.delete(employee)
    .where(eq(employee.uuid, uuid))
    .returning({
      name: employee.id,
    });

  if (!data) {
    return DataNotFound(c);
  }

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  // const data = await db.query.department.findMany();

  const employeePromise = db
    .select({
      uuid: employee.uuid,
      id: employee.id,
      employee_id: employee.employee_id,
      gender: employee.gender,
      user_uuid: employee.user_uuid,
      employee_name: users.name,
      email: users.email,
      start_date: employee.start_date,
      workplace_uuid: employee.workplace_uuid,
      workplace_name: workplace.name,
      rfid: employee.rfid,
      sub_department_uuid: employee.sub_department_uuid,
      sub_department_name: sub_department.name,
      primary_display_text: employee.primary_display_text,
      secondary_display_text: employee.secondary_display_text,
      configuration_uuid: employee.configuration_uuid,
      employment_type_uuid: employee.employment_type_uuid,
      employment_type_name: employment_type.name,
      end_date: employee.end_date,
      line_manager_uuid: employee.line_manager_uuid,
      hr_manager_uuid: employee.hr_manager_uuid,
      is_admin: employee.is_admin,
      is_hr: employee.is_hr,
      is_line_manager: employee.is_line_manager,
      allow_over_time: employee.allow_over_time,
      exclude_from_attendance: employee.exclude_from_attendance,
      status: employee.status,
      created_by: employee.created_by,
      created_by_name: createdByUser.name,
      created_at: employee.created_at,
      updated_at: employee.updated_at,
      remarks: employee.remarks,
      designation_uuid: users.designation_uuid,
      designation_name: designation.designation,
      department_uuid: users.department_uuid,
      department_name: department.department,
      report_position: employee.report_position,
      first_leave_approver_uuid: employee.first_leave_approver_uuid,
      first_leave_approver_name: firstLeaveApprover.name,
      second_leave_approver_uuid: employee.second_leave_approver_uuid,
      second_leave_approver_name: secondLeaveApprover.name,
      first_late_approver_uuid: employee.first_late_approver_uuid,
      first_late_approver_name: firstLateApprover.name,
      second_late_approver_uuid: employee.second_late_approver_uuid,
      second_late_approver_name: secondLateApprover.name,
      first_manual_entry_approver_uuid: employee.first_manual_entry_approver_uuid,
      first_manual_entry_approver_name: firstManualEntryApprover.name,
      second_manual_entry_approver_uuid: employee.second_manual_entry_approver_uuid,
      second_manual_entry_approver_name: secondManualEntryApprover.name,
      father_name: employee.father_name,
      mother_name: employee.mother_name,
      blood_group: employee.blood_group,
      dob: employee.dob,
      national_id: employee.national_id,
      office_phone: employee.office_phone,
      home_phone: employee.home_phone,
      personal_phone: employee.personal_phone,
      joining_amount: PG_DECIMAL_TO_FLOAT(employee.joining_amount),
      is_resign: employee.is_resign,
      late_day_unit: employee.late_day_unit,
      profile_picture: employee.profile_picture,
      leave_policy_uuid: employee.leave_policy_uuid,
      leave_policy_name: leave_policy.name,
      updated_by: employee.updated_by,
      updated_by_name: updatedByUser.name,
      tax_amount: PG_DECIMAL_TO_FLOAT(employee.tax_amount),
      shift_group_uuid: sql`
          (
            SELECT el.type_uuid
            FROM hr.employee_log el
            WHERE el.type = 'shift_group' AND el.employee_uuid = ${employee.uuid} AND el.effective_date::date <= CURRENT_DATE
            ORDER BY el.effective_date DESC
            LIMIT 1
          )`,
      shift_group_name: sql`
          (
            SELECT sg.name
            FROM hr.employee_log el
            LEFT JOIN hr.shift_group sg ON el.type_uuid = sg.uuid
            WHERE el.type = 'shift_group' AND el.employee_uuid = ${employee.uuid} AND el.effective_date::date <= CURRENT_DATE
            ORDER BY el.effective_date DESC
            LIMIT 1
          )`,
      shift_group_start_time: sql`
          (
            SELECT s.start_time
            FROM hr.shifts s
            WHERE s.uuid = (
              SELECT r.shifts_uuid
              FROM hr.roster r
              WHERE r.shift_group_uuid = (
                SELECT el.type_uuid
                FROM hr.employee_log el
                WHERE el.type = 'shift_group' AND el.employee_uuid = ${employee.uuid} AND el.effective_date::date <= CURRENT_DATE
                ORDER BY el.effective_date DESC
                LIMIT 1
              )
              AND r.effective_date <= CURRENT_DATE
              ORDER BY r.effective_date DESC
              LIMIT 1
            )
          )`,
      shift_group_end_time: sql`
          (
            SELECT s.end_time
            FROM hr.shifts s
            WHERE s.uuid = (
              SELECT r.shifts_uuid
              FROM hr.roster r
              WHERE r.shift_group_uuid = (
                SELECT el.type_uuid
                FROM hr.employee_log el
                WHERE el.type = 'shift_group' AND el.employee_uuid = ${employee.uuid} AND el.effective_date::date <= CURRENT_DATE
                ORDER BY el.effective_date DESC
                LIMIT 1
              )
              AND r.effective_date <= CURRENT_DATE
              ORDER BY r.effective_date DESC
              LIMIT 1
            )
          )`,
      shift_name: sql`
          (
            SELECT s.name
            FROM hr.shifts s
            WHERE s.uuid = (
              SELECT r.shifts_uuid
              FROM hr.roster r
              WHERE r.shift_group_uuid = (
                SELECT el.type_uuid
                FROM hr.employee_log el
                WHERE el.type = 'shift_group' AND el.employee_uuid = ${employee.uuid} AND el.effective_date::date <= CURRENT_DATE
                ORDER BY el.effective_date DESC
                LIMIT 1
              )
              AND r.effective_date::date <= CURRENT_DATE
              ORDER BY r.effective_date DESC
              LIMIT 1
            )
          )`,
      off_days: sql`
         COALESCE(
            (
              SELECT (r.off_days)::jsonb
              FROM hr.roster r
              WHERE r.shift_group_uuid = (
                SELECT el.type_uuid
                FROM hr.employee_log el
                WHERE el.type = 'shift_group'
                  AND el.employee_uuid = ${employee.uuid}
                  AND el.effective_date::date <= CURRENT_DATE
                ORDER BY el.effective_date DESC
                LIMIT 1
              )
              AND r.effective_date::date <= CURRENT_DATE
              ORDER BY r.effective_date DESC
              LIMIT 1
            ),
            '[]'::jsonb
          )`,
    })
    .from(employee)
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(workplace, eq(employee.workplace_uuid, workplace.uuid))
    .leftJoin(
      sub_department,
      eq(employee.sub_department_uuid, sub_department.uuid),
    )
    .leftJoin(createdByUser, eq(employee.created_by, createdByUser.uuid))
    .leftJoin(designation, eq(users.designation_uuid, designation.uuid))
    .leftJoin(department, eq(users.department_uuid, department.uuid))
    .leftJoin(
      employment_type,
      eq(employee.employment_type_uuid, employment_type.uuid),
    )
    .leftJoin(
      lineManagerUser,
      eq(employee.line_manager_uuid, lineManagerUser.uuid),
    )
    .leftJoin(
      hrManagerUser,
      eq(employee.hr_manager_uuid, hrManagerUser.uuid),
    )
    .leftJoin(
      firstLeaveApprover,
      eq(employee.first_leave_approver_uuid, firstLeaveApprover.uuid),
    )
    .leftJoin(
      secondLeaveApprover,
      eq(employee.second_leave_approver_uuid, secondLeaveApprover.uuid),
    )
    .leftJoin(
      firstLateApprover,
      eq(employee.first_late_approver_uuid, firstLateApprover.uuid),
    )
    .leftJoin(
      secondLateApprover,
      eq(employee.second_late_approver_uuid, secondLateApprover.uuid),
    )
    .leftJoin(
      firstManualEntryApprover,
      eq(
        employee.first_manual_entry_approver_uuid,
        firstManualEntryApprover.uuid,
      ),
    )
    .leftJoin(
      secondManualEntryApprover,
      eq(
        employee.second_manual_entry_approver_uuid,
        secondManualEntryApprover.uuid,
      ),
    )
    .leftJoin(
      leave_policy,
      eq(employee.leave_policy_uuid, leave_policy.uuid),
    )
    .leftJoin(
      updatedByUser,
      eq(employee.updated_by, updatedByUser.uuid),
    )
    .orderBy(desc(employee.created_at));

  const data = await employeePromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const employeePromise = db
    .select({
      uuid: employee.uuid,
      id: employee.id,
      employee_id: employee.employee_id,
      gender: employee.gender,
      user_uuid: employee.user_uuid,
      employee_name: users.name,
      email: users.email,
      start_date: employee.start_date,
      workplace_uuid: employee.workplace_uuid,
      workplace_name: workplace.name,
      rfid: employee.rfid,
      sub_department_uuid: employee.sub_department_uuid,
      sub_department_name: sub_department.name,
      primary_display_text: employee.primary_display_text,
      secondary_display_text: employee.secondary_display_text,
      configuration_uuid: employee.configuration_uuid,
      employment_type_uuid: employee.employment_type_uuid,
      employment_type_name: employment_type.name,
      end_date: employee.end_date,
      line_manager_uuid: employee.line_manager_uuid,
      hr_manager_uuid: employee.hr_manager_uuid,
      is_admin: employee.is_admin,
      is_hr: employee.is_hr,
      is_line_manager: employee.is_line_manager,
      allow_over_time: employee.allow_over_time,
      exclude_from_attendance: employee.exclude_from_attendance,
      status: employee.status,
      created_by: employee.created_by,
      created_by_name: createdByUser.name,
      created_at: employee.created_at,
      updated_at: employee.updated_at,
      remarks: employee.remarks,
      designation_uuid: users.designation_uuid,
      designation_name: designation.designation,
      department_uuid: users.department_uuid,
      department_name: department.department,
      report_position: employee.report_position,
      first_leave_approver_uuid: employee.first_leave_approver_uuid,
      first_leave_approver_name: firstLeaveApprover.name,
      second_leave_approver_uuid: employee.second_leave_approver_uuid,
      second_leave_approver_name: secondLeaveApprover.name,
      first_late_approver_uuid: employee.first_late_approver_uuid,
      first_late_approver_name: firstLateApprover.name,
      second_late_approver_uuid: employee.second_late_approver_uuid,
      second_late_approver_name: secondLateApprover.name,
      first_manual_entry_approver_uuid: employee.first_manual_entry_approver_uuid,
      first_manual_entry_approver_name: firstManualEntryApprover.name,
      second_manual_entry_approver_uuid: employee.second_manual_entry_approver_uuid,
      second_manual_entry_approver_name: secondManualEntryApprover.name,
      father_name: employee.father_name,
      mother_name: employee.mother_name,
      blood_group: employee.blood_group,
      dob: employee.dob,
      national_id: employee.national_id,
      office_phone: employee.office_phone,
      home_phone: employee.home_phone,
      personal_phone: employee.personal_phone,
      joining_amount: PG_DECIMAL_TO_FLOAT(employee.joining_amount),
      is_resign: employee.is_resign,
      late_day_unit: employee.late_day_unit,
      profile_picture: employee.profile_picture,
      leave_policy_uuid: employee.leave_policy_uuid,
      leave_policy_name: leave_policy.name,
      updated_by: employee.updated_by,
      updated_by_name: updatedByUser.name,
      tax_amount: PG_DECIMAL_TO_FLOAT(employee.tax_amount),
      shift_group_uuid: sql`
          (
            SELECT el.type_uuid
            FROM hr.employee_log el
            WHERE el.type = 'shift_group' AND el.employee_uuid = ${employee.uuid} AND el.effective_date::date <= CURRENT_DATE
            ORDER BY el.effective_date DESC
            LIMIT 1
          )`,
      shift_group_name: sql`
          (
            SELECT sg.name
            FROM hr.employee_log el
            LEFT JOIN hr.shift_group sg ON el.type_uuid = sg.uuid
            WHERE el.type = 'shift_group' AND el.employee_uuid = ${employee.uuid} AND el.effective_date::date <= CURRENT_DATE
            ORDER BY el.effective_date DESC
            LIMIT 1
          )`,
      shift_group_start_time: sql`
          (
            SELECT s.start_time
            FROM hr.shifts s
            WHERE s.uuid = (
              SELECT r.shifts_uuid
              FROM hr.roster r
              WHERE r.shift_group_uuid = (
                SELECT el.type_uuid
                FROM hr.employee_log el
                WHERE el.type = 'shift_group' AND el.employee_uuid = ${employee.uuid} AND el.effective_date::date <= CURRENT_DATE
                ORDER BY el.effective_date DESC
                LIMIT 1
              )
              AND r.effective_date <= CURRENT_DATE
              ORDER BY r.effective_date DESC
              LIMIT 1
            )
          )`,
      shift_group_end_time: sql`
          (
            SELECT s.end_time
            FROM hr.shifts s
            WHERE s.uuid = (
              SELECT r.shifts_uuid
              FROM hr.roster r
              WHERE r.shift_group_uuid = (
                SELECT el.type_uuid
                FROM hr.employee_log el
                WHERE el.type = 'shift_group' AND el.employee_uuid = ${employee.uuid} AND el.effective_date::date <= CURRENT_DATE
                ORDER BY el.effective_date DESC
                LIMIT 1
              )
              AND r.effective_date <= CURRENT_DATE
              ORDER BY r.effective_date DESC
              LIMIT 1
            )
          )`,
      shift_name: sql`
          (
            SELECT s.name
            FROM hr.shifts s
            WHERE s.uuid = (
              SELECT r.shifts_uuid
              FROM hr.roster r
              WHERE r.shift_group_uuid = (
                SELECT el.type_uuid
                FROM hr.employee_log el
                WHERE el.type = 'shift_group' AND el.employee_uuid = ${employee.uuid} AND el.effective_date::date <= CURRENT_DATE
                ORDER BY el.effective_date DESC
                LIMIT 1
              )
              AND r.effective_date::date <= CURRENT_DATE
              ORDER BY r.effective_date DESC
              LIMIT 1
            )
          )`,
      off_days: sql`
         COALESCE(
            (
              SELECT (r.off_days)::jsonb
              FROM hr.roster r
              WHERE r.shift_group_uuid = (
                SELECT el.type_uuid
                FROM hr.employee_log el
                WHERE el.type = 'shift_group'
                  AND el.employee_uuid = ${employee.uuid}
                  AND el.effective_date::date <= CURRENT_DATE
                ORDER BY el.effective_date DESC
                LIMIT 1
              )
              AND r.effective_date::date <= CURRENT_DATE
              ORDER BY r.effective_date DESC
              LIMIT 1
            ),
            '[]'::jsonb
          )`,
      employee_address: sql`
          COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'uuid', employee_address.uuid,
                'index', employee_address.index,
                'address_type', employee_address.address_type,
                'employee_uuid', employee_address.employee_uuid,
                'address', employee_address.address,
                'thana', employee_address.thana,
                'district', employee_address.district,
                'created_by', employee_address.created_by,
                'created_by_name', createdByUser.name,
                'created_at', employee_address.created_at,
                'updated_at', employee_address.updated_at,
                'remarks', employee_address.remarks
              )
            )
            FROM hr.employee_address
            LEFT JOIN hr.users createdByUser ON createdByUser.uuid = employee_address.created_by
            WHERE employee_address.employee_uuid = ${employee.uuid}
          ), '[]'::jsonb)
        `,
      employee_document: sql`
          COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'uuid', employee_document.uuid,
                'index', employee_document.index,
                'employee_uuid', employee_document.employee_uuid,
                'document_type', employee_document.document_type,
                'description', employee_document.description,
                'file', employee_document.file,
                'created_by', employee_document.created_by,
                'created_by_name', createdByUser.name,
                'created_at', employee_document.created_at,
                'updated_at', employee_document.updated_at,
                'remarks', employee_document.remarks
              )
            )
            FROM hr.employee_document
            LEFT JOIN hr.users createdByUser ON createdByUser.uuid = employee_document.created_by
            WHERE employee_document.employee_uuid = ${employee.uuid}
          ), '[]'::jsonb)
        `,
      employee_education: sql`
          COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'uuid', employee_education.uuid,
                'index', employee_education.index,
                'employee_uuid', employee_education.employee_uuid,
                'degree_name', employee_education.degree_name,
                'institute', employee_education.institute,
                'board', employee_education.board,
                'year_of_passing', employee_education.year_of_passing,
                'grade', employee_education.grade,
                'created_by', employee_education.created_by,
                'created_by_name', createdByUser.name,
                'created_at', employee_education.created_at,
                'updated_at', employee_education.updated_at,
                'remarks', employee_education.remarks
              )
            )
            FROM hr.employee_education
            LEFT JOIN hr.users createdByUser ON createdByUser.uuid = employee_education.created_by
            WHERE employee_education.employee_uuid = ${employee.uuid}
          ), '[]'::jsonb)
        `,
      employee_history: sql`
          COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'uuid', employee_history.uuid,
                'index', employee_history.index,
                'employee_uuid', employee_history.employee_uuid,
                'company_name', employee_history.company_name,
                'company_business', employee_history.company_business,
                'start_date', employee_history.start_date,
                'end_date', employee_history.end_date,
                'department', employee_history.department,
                'designation', employee_history.designation,
                'location', employee_history.location,
                'responsibilities', employee_history.responsibilities,
                'created_by', employee_history.created_by,
                'created_by_name', createdByUser.name,
                'created_at', employee_history.created_at,
                'updated_at', employee_history.updated_at,
                'remarks', employee_history.remarks
              )
            )
            FROM hr.employee_history
            LEFT JOIN hr.users createdByUser ON createdByUser.uuid = employee_history.created_by
            WHERE employee_history.employee_uuid = ${employee.uuid}
        ), '[]'::jsonb)
      `,
    })
    .from(employee)
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(workplace, eq(employee.workplace_uuid, workplace.uuid))
    .leftJoin(
      sub_department,
      eq(employee.sub_department_uuid, sub_department.uuid),
    )
    .leftJoin(createdByUser, eq(employee.created_by, createdByUser.uuid))
    .leftJoin(designation, eq(users.designation_uuid, designation.uuid))
    .leftJoin(department, eq(users.department_uuid, department.uuid))
    .leftJoin(
      employment_type,
      eq(employee.employment_type_uuid, employment_type.uuid),
    )
    .leftJoin(
      lineManagerUser,
      eq(employee.line_manager_uuid, lineManagerUser.uuid),
    )
    .leftJoin(
      hrManagerUser,
      eq(employee.hr_manager_uuid, hrManagerUser.uuid),
    )
    .leftJoin(
      firstLeaveApprover,
      eq(employee.first_leave_approver_uuid, firstLeaveApprover.uuid),
    )
    .leftJoin(
      secondLeaveApprover,
      eq(employee.second_leave_approver_uuid, secondLeaveApprover.uuid),
    )
    .leftJoin(
      firstLateApprover,
      eq(employee.first_late_approver_uuid, firstLateApprover.uuid),
    )
    .leftJoin(
      secondLateApprover,
      eq(employee.second_late_approver_uuid, secondLateApprover.uuid),
    )
    .leftJoin(
      firstManualEntryApprover,
      eq(
        employee.first_manual_entry_approver_uuid,
        firstManualEntryApprover.uuid,
      ),
    )
    .leftJoin(
      secondManualEntryApprover,
      eq(
        employee.second_manual_entry_approver_uuid,
        secondManualEntryApprover.uuid,
      ),
    )
    .leftJoin(
      leave_policy,
      eq(employee.leave_policy_uuid, leave_policy.uuid),
    )
    .leftJoin(
      updatedByUser,
      eq(employee.updated_by, updatedByUser.uuid),
    )
    .where(eq(employee.uuid, uuid));

  const [data] = await employeePromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};

export const getManualEntryDetailsByEmployee: AppRouteHandler<GetManualEntryByEmployeeRoute> = async (c: any) => {
  const { employee_uuid } = c.req.valid('param');
  const { field_visit_uuid } = c.req.valid('query');

  const api = createApi(c);

  const fetchData = async (endpoint: string) =>
    await api
      .get(`${endpoint}/${employee_uuid}?field_visit_uuid=${field_visit_uuid || ''}`)
      .then(response => response.data)
      .catch((error) => {
        console.error(
          `Error fetching data from ${endpoint}:`,
          error.message,
        );
        throw error;
      });

  const [employee, manual_entry] = await Promise.all([
    fetchData('/v1/hr/employee'),
    fetchData('/v1/hr/manual-entry/employee'),
  ]);

  const response = {
    ...employee,
    field_visit: manual_entry || [],
  };

  return c.json(response, HSCode.OK);
};

export const getEmployeeLeaveInformationDetails: AppRouteHandler<GetEmployeeLeaveInformationDetailsRoute> = async (c: any) => {
  const { employee_uuid } = c.req.valid('param');

  const { apply_leave_uuid } = c.req.valid('query');

  const employeeLeaveInformationPromise = db
    .select({
      uuid: employee.uuid,
      id: employee.id,
      gender: employee.gender,
      user_uuid: employee.user_uuid,
      employee_name: users.name,
      start_date: employee.start_date,
      workplace_uuid: employee.workplace_uuid,
      workplace_name: workplace.name,
      rfid: employee.rfid,
      sub_department_uuid: employee.sub_department_uuid,
      sub_department_name: sub_department.name,
      primary_display_text: employee.primary_display_text,
      secondary_display_text: employee.secondary_display_text,
      configuration_uuid: employee.configuration_uuid,
      employment_type_uuid: employee.employment_type_uuid,
      employment_type_name: employment_type.name,
      end_date: employee.end_date,
      line_manager_uuid: employee.line_manager_uuid,
      hr_manager_uuid: employee.hr_manager_uuid,
      is_admin: employee.is_admin,
      is_hr: employee.is_hr,
      is_line_manager: employee.is_line_manager,
      allow_over_time: employee.allow_over_time,
      exclude_from_attendance: employee.exclude_from_attendance,
      status: employee.status,
      created_by: employee.created_by,
      created_by_name: createdByUser.name,
      created_at: employee.created_at,
      updated_at: employee.updated_at,
      remarks: employee.remarks,
      designation_uuid: users.designation_uuid,
      designation_name: designation.designation,
      department_uuid: users.department_uuid,
      department_name: department.department,
      employee_id: employee.employee_id,
      report_position: employee.report_position,
      first_leave_approver_uuid: employee.first_leave_approver_uuid,
      first_leave_approver_name: firstLeaveApprover.name,
      second_leave_approver_uuid: employee.second_leave_approver_uuid,
      second_leave_approver_name: secondLeaveApprover.name,
      first_late_approver_uuid: employee.first_late_approver_uuid,
      first_late_approver_name: firstLateApprover.name,
      second_late_approver_uuid: employee.second_late_approver_uuid,
      second_late_approver_name: secondLateApprover.name,
      first_manual_entry_approver_uuid: employee.first_manual_entry_approver_uuid,
      first_manual_entry_approver_name: firstManualEntryApprover.name,
      second_manual_entry_approver_uuid: employee.second_manual_entry_approver_uuid,
      second_manual_entry_approver_name: secondManualEntryApprover.name,
      father_name: employee.father_name,
      mother_name: employee.mother_name,
      blood_group: employee.blood_group,
      dob: employee.dob,
      national_id: employee.national_id,
      joining_amount: PG_DECIMAL_TO_FLOAT(employee.joining_amount),
      is_resign: employee.is_resign,
      personal_phone: employee.personal_phone,
      late_day_unit: employee.late_day_unit,
      profile_picture: employee.profile_picture,
      leave_policy_uuid: employee.leave_policy_uuid,
      leave_policy_name: leave_policy.name,
      updated_by: employee.updated_by,
      updated_by_name: updatedByUser.name,
      tax_amount: PG_DECIMAL_TO_FLOAT(employee.tax_amount),
      shift_group_uuid: sql`
          (
            SELECT el.type_uuid
            FROM hr.employee_log el
            WHERE el.type = 'shift_group' AND el.employee_uuid = ${employee.uuid} AND el.effective_date::date <= CURRENT_DATE
            ORDER BY el.effective_date DESC
            LIMIT 1
          )`,
      shift_group_name: sql`
          (
            SELECT sg.name
            FROM hr.employee_log el
            LEFT JOIN hr.shift_group sg ON el.type_uuid = sg.uuid
            WHERE el.type = 'shift_group' AND el.employee_uuid = ${employee.uuid} AND el.effective_date::date <= CURRENT_DATE
            ORDER BY el.effective_date DESC
            LIMIT 1
          )`,
      shift_group_start_time: sql`
          (
            SELECT s.start_time
            FROM hr.shifts s
            WHERE s.uuid = (
              SELECT r.shifts_uuid
              FROM hr.roster r
              WHERE r.shift_group_uuid = (
                SELECT el.type_uuid
                FROM hr.employee_log el
                WHERE el.type = 'shift_group' AND el.employee_uuid = ${employee.uuid} AND el.effective_date::date <= CURRENT_DATE
                ORDER BY el.effective_date DESC
                LIMIT 1
              )
              AND r.effective_date <= CURRENT_DATE
              ORDER BY r.effective_date DESC
              LIMIT 1
            )
          )`,
      shift_group_end_time: sql`
          (
            SELECT s.end_time
            FROM hr.shifts s
            WHERE s.uuid = (
              SELECT r.shifts_uuid
              FROM hr.roster r
              WHERE r.shift_group_uuid = (
                SELECT el.type_uuid
                FROM hr.employee_log el
                WHERE el.type = 'shift_group' AND el.employee_uuid = ${employee.uuid} AND el.effective_date::date <= CURRENT_DATE
                ORDER BY el.effective_date DESC
                LIMIT 1
              )
              AND r.effective_date <= CURRENT_DATE
              ORDER BY r.effective_date DESC
              LIMIT 1
            )
          )`,
      shift_name: sql`
          (
            SELECT s.name
            FROM hr.shifts s
            WHERE s.uuid = (
              SELECT r.shifts_uuid
              FROM hr.roster r
              WHERE r.shift_group_uuid = (
                SELECT el.type_uuid
                FROM hr.employee_log el
                WHERE el.type = 'shift_group' AND el.employee_uuid = ${employee.uuid} AND el.effective_date::date <= CURRENT_DATE
                ORDER BY el.effective_date DESC
                LIMIT 1
              )
              AND r.effective_date::date <= CURRENT_DATE
              ORDER BY r.effective_date DESC
              LIMIT 1
            )
          )`,
      off_days: sql`
         COALESCE(
            (
              SELECT (r.off_days)::jsonb
              FROM hr.roster r
              WHERE r.shift_group_uuid = (
                SELECT el.type_uuid
                FROM hr.employee_log el
                WHERE el.type = 'shift_group'
                  AND el.employee_uuid = ${employee.uuid}
                  AND el.effective_date::date <= CURRENT_DATE
                ORDER BY el.effective_date DESC
                LIMIT 1
              )
              AND r.effective_date::date <= CURRENT_DATE
              ORDER BY r.effective_date DESC
              LIMIT 1
            ),
            '[]'::jsonb
          )`,
      remaining_leave_information: sql`
                  (
                    SELECT jsonb_agg(
                      jsonb_build_object(
                        'uuid', lc.uuid,
                        'name', lc.name,
                        'maximum_number_of_allowed_leaves', ce.maximum_number_of_allowed_leaves::float8 + CASE WHEN lc.name = 'Sick Leave' THEN COALESCE(leave_summary.sick_added, 0)
                                                                                                         WHEN lc.name = 'Casual Leave' THEN COALESCE(leave_summary.casual_added, 0)
                                                                                                         WHEN lc.name = 'Maternity Leave' THEN COALESCE(leave_summary.maternity_added, 0)
                                                                                                         ELSE 0 END,
                        'used_leave_days', CASE WHEN lc.name = 'Sick Leave' THEN COALESCE(leave_summary.sick_used, 0)
                                              WHEN lc.name = 'Casual Leave' THEN COALESCE(leave_summary.casual_used, 0)
                                              WHEN lc.name = 'Maternity Leave' THEN COALESCE(leave_summary.maternity_used, 0)
                                              ELSE 0 END,
                        'remaining_leave_days',
                          CASE WHEN lc.name = 'Sick Leave' THEN (ce.maximum_number_of_allowed_leaves::float8 + COALESCE(leave_summary.sick_added, 0)) - COALESCE(leave_summary.sick_used, 0)
                               WHEN lc.name = 'Casual Leave' THEN (ce.maximum_number_of_allowed_leaves::float8 + COALESCE(leave_summary.casual_added, 0)) - COALESCE(leave_summary.casual_used, 0)
                               WHEN lc.name = 'Maternity Leave' THEN (ce.maximum_number_of_allowed_leaves::float8 + COALESCE(leave_summary.maternity_added, 0)) - COALESCE(leave_summary.maternity_used, 0)
                               ELSE 0 END
                      )
                    )
                    FROM hr.configuration cfg
                    LEFT JOIN hr.configuration_entry ce
                      ON ce.configuration_uuid = cfg.uuid
                    LEFT JOIN hr.leave_category lc
                      ON lc.uuid = ce.leave_category_uuid
                    LEFT JOIN (
                              SELECT
                                pll.employee_uuid,
                                pll.sick_used::float8,
                                pll.casual_used::float8,
                                pll.maternity_used::float8,
                                pll.sick_added::float8,
                                pll.casual_added::float8,
                                pll.maternity_added::float8
                              FROM hr.leave_policy_log pll
                              WHERE pll.year = EXTRACT(YEAR FROM CURRENT_DATE)
                                AND pll.employee_uuid = ${employee_uuid}
                            ) AS leave_summary
                      ON leave_summary.employee_uuid = ${employee_uuid}
                    WHERE cfg.leave_policy_uuid = ${employee.leave_policy_uuid}
                  )`,
      leave_application_information: sql`
                  (
                    SELECT COALESCE(
                      jsonb_build_object(
                        'uuid', apply_leave.uuid,
                        'leave_category_uuid', apply_leave.leave_category_uuid,
                        'leave_category_name', leave_category.name,
                        'employee_uuid', apply_leave.employee_uuid,
                        'employee_name', employeeUser.name,
                        'type', apply_leave.type,
                        'from_date', apply_leave.from_date,
                        'to_date', apply_leave.to_date,
                        'reason', apply_leave.reason,
                        'file', apply_leave.file,
                        'approval', apply_leave.approval,
                        'created_at', apply_leave.created_at,
                        'updated_at', apply_leave.updated_at,
                        'remarks', apply_leave.remarks,
                        'created_by', apply_leave.created_by,
                        'created_by_name', createdByUser.name,
                        'created_by_department_uuid', createdByUser.department_uuid,
                        'created_by_department_name', department.department,
                        'created_by_designation_uuid', createdByUser.designation_uuid,
                        'created_by_designation_name', designation.designation,
                        'created_by_employee_uuid', createdByEmployee.uuid,
                        'created_by_start_date', createdByEmployee.start_date,
                        'created_by_profile_picture', createdByEmployee.profile_picture
                      ), '{}'::jsonb
                    )
                    FROM hr.apply_leave
                    LEFT JOIN hr.leave_category ON apply_leave.leave_category_uuid = leave_category.uuid
                    LEFT JOIN hr.employee ON apply_leave.employee_uuid = employee.uuid
                    LEFT JOIN hr.users AS employeeUser ON employee.user_uuid = employeeUser.uuid
                    LEFT JOIN hr.users AS createdByUser ON apply_leave.created_by = createdByUser.uuid
                    LEFT JOIN hr.department ON createdByUser.department_uuid = department.uuid
                    LEFT JOIN hr.designation ON createdByUser.designation_uuid = designation.uuid
                    LEFT JOIN hr.employee createdByEmployee ON createdByUser.uuid = createdByEmployee.user_uuid
                    WHERE apply_leave.employee_uuid = ${employee_uuid} AND apply_leave.uuid = ${apply_leave_uuid})`,
      last_five_leave_applications: sql`
                        (
                          SELECT COALESCE(
                            jsonb_agg(
                              jsonb_build_object(
                                'uuid', t.uuid,
                                'leave_category_uuid', t.leave_category_uuid,
                                'leave_category_name', t.leave_category_name,
                                'employee_uuid', t.employee_uuid,
                                'employee_name', t.employee_name,
                                'type', t.type,
                                'from_date', t.from_date,
                                'to_date', t.to_date,
                                'reason', t.reason,
                                'file', t.file,
                                'approval', t.approval,
                                'created_at', t.created_at,
                                'updated_at', t.updated_at,
                                'remarks', t.remarks,
                                'created_by', t.created_by,
                                'created_by_name', t.created_by_name
                              )
                            ), '[]'::jsonb
                          )
                          FROM (
                            SELECT
                              apply_leave.uuid,
                              apply_leave.leave_category_uuid,
                              leave_category.name AS leave_category_name,
                              apply_leave.employee_uuid,
                              employeeUser.name AS employee_name,
                              apply_leave.type,
                              apply_leave.from_date,
                              apply_leave.to_date,
                              apply_leave.reason,
                              apply_leave.file,
                              apply_leave.approval,
                              apply_leave.created_at,
                              apply_leave.updated_at,
                              apply_leave.remarks,
                              apply_leave.created_by,
                              created_by_user.name AS created_by_name
                            FROM hr.apply_leave
                            LEFT JOIN hr.leave_category
                              ON apply_leave.leave_category_uuid = leave_category.uuid
                            LEFT JOIN hr.employee
                              ON apply_leave.employee_uuid = employee.uuid
                            LEFT JOIN hr.users AS employeeUser
                              ON employee.user_uuid = employeeUser.uuid
                            LEFT JOIN hr.users AS created_by_user
                              ON apply_leave.created_by = created_by_user.uuid
                            WHERE apply_leave.employee_uuid = ${employee_uuid}
                            ORDER BY apply_leave.created_at DESC
                            LIMIT 5
                          ) t
                        )`,
      leave_application_dates: sql`
                  (
                    SELECT COALESCE(
                      jsonb_agg( 
                        jsonb_build_object(
                          'uuid', al.uuid,
                          'from_date', al.from_date,
                          'to_date', al.to_date,
                          'approval', al.approval
                        )
                      ), '[]'::jsonb
                    )
                    FROM hr.apply_leave al
                    WHERE al.employee_uuid = ${employee_uuid}
                          AND al.approval != 'rejected' AND EXTRACT(YEAR FROM al.from_date) = EXTRACT(YEAR FROM CURRENT_DATE)
                  )`,
    })
    .from(employee)
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(workplace, eq(employee.workplace_uuid, workplace.uuid))
    .leftJoin(
      sub_department,
      eq(employee.sub_department_uuid, sub_department.uuid),
    )
    .leftJoin(createdByUser, eq(employee.created_by, createdByUser.uuid))
    .leftJoin(designation, eq(users.designation_uuid, designation.uuid))
    .leftJoin(department, eq(users.department_uuid, department.uuid))
    .leftJoin(
      employment_type,
      eq(employee.employment_type_uuid, employment_type.uuid),
    )
    .leftJoin(
      lineManagerUser,
      eq(employee.line_manager_uuid, lineManagerUser.uuid),
    )
    .leftJoin(
      hrManagerUser,
      eq(employee.hr_manager_uuid, hrManagerUser.uuid),
    )
    .leftJoin(
      firstLeaveApprover,
      eq(employee.first_leave_approver_uuid, firstLeaveApprover.uuid),
    )
    .leftJoin(
      secondLeaveApprover,
      eq(employee.second_leave_approver_uuid, secondLeaveApprover.uuid),
    )
    .leftJoin(
      firstLateApprover,
      eq(employee.first_late_approver_uuid, firstLateApprover.uuid),
    )
    .leftJoin(
      secondLateApprover,
      eq(employee.second_late_approver_uuid, secondLateApprover.uuid),
    )
    .leftJoin(
      firstManualEntryApprover,
      eq(
        employee.first_manual_entry_approver_uuid,
        firstManualEntryApprover.uuid,
      ),
    )
    .leftJoin(
      secondManualEntryApprover,
      eq(
        employee.second_manual_entry_approver_uuid,
        secondManualEntryApprover.uuid,
      ),
    )
    .leftJoin(
      leave_policy,
      eq(employee.leave_policy_uuid, leave_policy.uuid),
    )
    .leftJoin(
      updatedByUser,
      eq(employee.updated_by, updatedByUser.uuid),
    )
    .where(eq(employee.uuid, employee_uuid));

  const [data] = await employeeLeaveInformationPromise;

  return c.json(data || {}, HSCode.OK);
};

export const getEmployeeAttendanceReport: AppRouteHandler<GetEmployeeAttendanceReportRoute> = async (c: any) => {
  const { employee_uuid } = c.req.valid('param');

  const { from_date, to_date } = c.req.valid('query');

  const query = sql`
                WITH date_series AS (
                  SELECT generate_series(${from_date}::date, ${to_date}::date, INTERVAL '1 day')::date AS punch_date
                ),
                user_dates AS (
                  SELECT u.uuid AS user_uuid, u.name AS employee_name, d.punch_date
                  FROM hr.users u
                  CROSS JOIN date_series d
                )
                SELECT
                  e.uuid,
                  ud.user_uuid,
                  ud.employee_name,
                  DATE(ud.punch_date) AS punch_date,
                  MIN(pl.punch_time) AS entry_time,
                  MAX(pl.punch_time) AS exit_time,
                  (EXTRACT(EPOCH FROM MAX(pl.punch_time)::time - MIN(pl.punch_time)::time) / 3600)::float8 AS hours_worked,
                  CASE
                    WHEN hr.is_employee_off_day(e.uuid, ud.punch_date)
                      OR (SELECT is_general_holiday FROM hr.is_general_holiday(ud.punch_date))
                      OR (SELECT is_special_holiday FROM hr.is_special_holiday(ud.punch_date))
                    THEN 0
                    ELSE (EXTRACT(EPOCH FROM MAX(s.end_time)::time - MIN(s.start_time)::time) / 3600)::float8
                  END AS expected_hours,
                  s.start_time AS shift_start_time,
                  s.end_time AS shift_end_time,
                  sg.name AS shift_group_name
                FROM hr.employee e
                LEFT JOIN user_dates ud ON e.user_uuid = ud.user_uuid
                LEFT JOIN hr.punch_log pl ON pl.employee_uuid = e.uuid AND DATE(pl.punch_time) = DATE(ud.punch_date)
                LEFT JOIN LATERAL (
                                        SELECT r.shifts_uuid AS shifts_uuid,
                                              r.shift_group_uuid AS shift_group_uuid
                                        FROM hr.roster r
                                        WHERE r.shift_group_uuid = (
                                          SELECT el.type_uuid
                                          FROM hr.employee_log el
                                          WHERE el.employee_uuid = e.uuid
                                            AND el.type = 'shift_group'
                                            AND el.effective_date::date <= ud.punch_date::date
                                          ORDER BY el.effective_date DESC
                                          LIMIT 1
                                        )
                                        AND r.effective_date <= ud.punch_date::date
                                        ORDER BY r.effective_date DESC
                                        LIMIT 1
                                      ) sg_sel ON TRUE
                LEFT JOIN hr.shifts s ON sg_sel.shifts_uuid = s.uuid
                LEFT JOIN hr.shift_group sg ON sg_sel.shift_group_uuid = sg.uuid
                WHERE 
                  e.uuid = ${employee_uuid}
                GROUP BY ud.user_uuid, ud.employee_name, ud.punch_date, e.uuid, s.start_time, s.end_time, sg.name
                ORDER BY ud.user_uuid, ud.punch_date;
              `;

  const employeeAttendanceReportPromise = db.execute(query);

  const data = await employeeAttendanceReportPromise;

  // const formattedData = data.rows.map((row: any) => ({
  //   user_uuid: row.user_uuid,
  //   employee_name: row.employee_name,
  //   punch_date: row.punch_date,
  //   entry_time: row.entry_time,
  //   exit_time: row.exit_time,
  //   hours_worked: Number.parseFloat(row.hours_worked),
  //   expected_hours: Number.parseFloat(row.expected_hours),
  // }));

  return c.json(data.rows || [], HSCode.OK);
};

export const getEmployeeSummaryDetailsByEmployeeUuid: AppRouteHandler<GetEmployeeSummaryDetailsByEmployeeUuidRoute> = async (c: any) => {
  const { employee_uuid } = c.req.valid('param');

  const { from_date, to_date } = c.req.valid('query');

  const SpecialHolidaysQuery = sql`
                            SELECT
                                SUM(sh.to_date::date - sh.from_date::date + 1) -
                                SUM(CASE WHEN sh.to_date::date > ${from_date}::date THEN sh.to_date::date - ${from_date}::date + 1 ELSE 0 END + CASE WHEN sh.from_date::date < ${to_date}::date THEN ${to_date}::date - sh.from_date::date ELSE 0 END) AS total_special_holidays
                            FROM hr.special_holidays sh
                            WHERE (sh.to_date > ${from_date}::date OR sh.from_date < ${to_date}::date) AND ( sh.from_date < ${to_date}::date OR sh.to_date > ${from_date}::date)`;

  const generalHolidayQuery = sql`
                    SELECT
                        COUNT(*) AS total_off_days
                    FROM 
                        hr.general_holidays gh
                    WHERE
                        gh.date >= ${from_date}::date AND gh.date < ${to_date}::date`;

  const specialHolidaysPromise = db.execute(SpecialHolidaysQuery);
  const generalHolidaysPromise = db.execute(generalHolidayQuery);

  const [specialHolidaysResult, generalHolidaysResult] = await Promise.all([
    specialHolidaysPromise,
    generalHolidaysPromise,
  ]);

  const total_special_holidays
    = specialHolidaysResult.rows[0]?.total_special_holidays || 0;
  const total_general_holidays
    = generalHolidaysResult.rows[0]?.total_off_days || 0;

  const query = sql`
                    SELECT 
                            employee.uuid as employee_uuid,
                            employeeUser.uuid as employee_user_uuid,
                            employeeUser.name as employee_name,
                            employee.start_date as joining_date,
                            employee.created_at,
                            employee.updated_at,
                            employee.remarks,
                            employee.profile_picture,
                            COALESCE(attendance_summary.present_days, 0)::float8 AS present_days,
                            COALESCE(attendance_summary.late_days, 0)::float8 AS late_days,
                            COALESCE(leave_summary.total_leave_days, 0)::float8 AS total_leave_days,
                            COALESCE(off_days_summary.total_off_days, 0)::float8 AS week_days,
                            COALESCE(${total_general_holidays}, 0)::float8 AS total_general_holidays,
                            COALESCE(${total_special_holidays}, 0)::float8 AS total_special_holidays,
                            COALESCE(off_days_summary.total_off_days + ${total_general_holidays} + ${total_special_holidays},0)::float8 AS total_off_days_including_holidays,
                            COALESCE(attendance_summary.present_days + attendance_summary.late_days + leave_summary.total_leave_days,0)::float8 AS total_present_days,
                            COALESCE((${to_date}::date - ${from_date}::date+ 1), 0) - (COALESCE(attendance_summary.present_days, 0) + COALESCE(attendance_summary.late_days, 0) + COALESCE(leave_summary.total_leave_days, 0) + COALESCE(${total_general_holidays}::int, 0) + COALESCE(${total_special_holidays}::int, 0))::float8 AS absent_days,
                            COALESCE(COALESCE(attendance_summary.present_days, 0) + COALESCE(attendance_summary.late_days, 0) + COALESCE(leave_summary.total_leave_days, 0) + COALESCE(off_days_summary.total_off_days, 0) + COALESCE(${total_general_holidays}, 0) + COALESCE(${total_special_holidays}, 0) + COALESCE((${to_date}::date - ${from_date}::date + 1), 0) - (COALESCE(attendance_summary.present_days, 0) + COALESCE(attendance_summary.late_days, 0) + COALESCE(leave_summary.total_leave_days, 0) + COALESCE(${total_general_holidays}::int, 0) + COALESCE(${total_special_holidays}::int, 0)), 0)::float8 AS total_days
                    FROM  hr.employee
                    LEFT JOIN hr.users employeeUser
                        ON employee.user_uuid = employeeUser.uuid
                    LEFT JOIN hr.users createdByUser
                        ON employee.created_by = createdByUser.uuid
                    LEFT JOIN (
                        SELECT 
                            pl.employee_uuid,
                            COUNT(CASE WHEN pl.punch_time IS NOT NULL AND TO_CHAR(pl.punch_time, 'HH24:MI') < TO_CHAR(shifts.late_time, 'HH24:MI') THEN 1 END) AS present_days,
                            COUNT(CASE WHEN pl.punch_time IS NULL AND TO_CHAR(pl.punch_time, 'HH24:MI') >= TO_CHAR(shifts.late_time, 'HH24:MI') THEN 1 END) AS late_days
                        FROM hr.punch_log pl
                        LEFT JOIN hr.employee e ON pl.employee_uuid = e.uuid
                        LEFT JOIN hr.shift_group ON (SELECT el.type_uuid
                                                        FROM hr.employee_log el
                                                        WHERE el.type = 'shift_group' AND el.employee_uuid = e.uuid AND el.effective_date::date <= pl.punch_time::date
                                                        ORDER BY el.effective_date DESC
                                                        LIMIT 1) = shift_group.uuid
                        LEFT JOIN hr.shifts ON shift_group.shifts_uuid = shifts.uuid
                        WHERE pl.punch_time IS NOT NULL
                            AND pl.punch_time >= ${from_date}::date
                            AND pl.punch_time <= ${to_date}::date
                        GROUP BY pl.employee_uuid
                        ) AS attendance_summary
                        ON employee.uuid = attendance_summary.employee_uuid
                    LEFT JOIN (
                        SELECT
                                al.employee_uuid,
                                SUM(al.to_date::date - al.from_date::date + 1) -
                                SUM(
                                    CASE
                                        WHEN al.to_date::date > ${to_date}::date
                                            THEN al.to_date::date - ${to_date}::date
                                        ELSE 0
                                    END
                                    +
                                    CASE
                                        WHEN al.from_date::date < ${from_date}::date
                                            THEN ${from_date}::date - al.from_date::date
                                        ELSE 0
                                    END
                                ) AS total_leave_days
                            FROM hr.apply_leave al
                            WHERE al.approval = 'approved'
                            AND 
                                al.to_date >= ${from_date}::date
                                AND al.from_date <= ${to_date}::date
                            GROUP BY al.employee_uuid
                    ) AS leave_summary
                        ON employee.uuid = leave_summary.employee_uuid
                    LEFT JOIN (
                        WITH params AS (
                            SELECT 
                                EXTRACT(year FROM ${from_date}::date) AS y, 
                                EXTRACT(month FROM ${from_date}::date) AS m,
                                make_date(EXTRACT(year FROM ${from_date}::date)::int, EXTRACT(month FROM ${from_date}::date)::int, 1) AS month_start,
                                make_date(EXTRACT(year FROM ${to_date}::date)::int, EXTRACT(month FROM ${to_date}::date)::int, 1) AS month_end
                        ),
                        roster_periods AS (
                            SELECT
                                shift_group_uuid,
                                effective_date,
                                off_days::jsonb,
                                LEAD(effective_date) OVER (PARTITION BY shift_group_uuid ORDER BY effective_date) AS next_effective_date
                            FROM hr.roster
                            WHERE EXTRACT(YEAR FROM effective_date) = (SELECT y FROM params)
                            AND EXTRACT(MONTH FROM effective_date) = (SELECT m FROM params)
                        ),
                        date_ranges AS (
                            SELECT
                                shift_group_uuid,
                                GREATEST(effective_date, (SELECT month_start FROM params)) AS period_start,
                                LEAST(
                                    COALESCE(next_effective_date - INTERVAL '1 day', (SELECT month_end FROM params)),
                                    (SELECT month_end FROM params)
                                ) AS period_end,
                                off_days
                            FROM roster_periods
                        ),
                        all_days AS (
                            SELECT
                                dr.shift_group_uuid,
                                d::date AS day,
                                dr.off_days
                            FROM date_ranges dr
                            CROSS JOIN LATERAL generate_series(dr.period_start, dr.period_end, INTERVAL '1 day') AS d
                        )
                        SELECT
                            shift_group_uuid,
                            COUNT(*) AS total_off_days
                        FROM all_days
                        WHERE lower(to_char(day, 'Dy')) = ANY (
                            SELECT jsonb_array_elements_text(off_days)
                        )
                        GROUP BY shift_group_uuid
                    ) AS off_days_summary
                        ON (SELECT el.type_uuid
                            FROM hr.employee_log el
                            WHERE el.type = 'shift_group' AND el.employee_uuid = employee.uuid AND el.effective_date::date <= ${to_date}::date
                            ORDER BY el.effective_date DESC
                            LIMIT 1) = off_days_summary.shift_group_uuid
                    WHERE employee.status = true 
                    AND employee.uuid = ${employee_uuid}
                    ORDER BY employee.created_at DESC
        `;

  const resultPromise = db.execute(query);

  const data = await resultPromise;

  if (employee_uuid)
    return c.json(data.rows[0] || {}, HSCode.OK);
  else
    return c.json(data.rows || [], HSCode.OK);
};

export const updateProfilePicture: AppRouteHandler<UpdateProfilePictureRoute> = async (c: any) => {
  const { employee_uuid } = c.req.valid('param');
  const formData = await c.req.parseBody();

  // existing employee profile picture
  const employeeProfilePromise = db
    .select({ profile_picture: employee.profile_picture })
    .from(employee)
    .where(eq(employee.uuid, employee_uuid));

  const [employeeData] = await employeeProfilePromise;

  const file = formData.profile_picture;
  let filePath = null;

  if (file)
    filePath = file ? await handleImagePatch(file, employeeData?.profile_picture ?? undefined, 'hr/employee') : null;

  const query = sql`
    UPDATE hr.employee
    SET profile_picture = ${filePath}
    WHERE uuid = ${employee_uuid}
  `;

  await db.execute(query);

  return c.json({ message: 'Profile picture updated successfully' }, HSCode.OK);
};

export const getBulkShiftForEmployee: AppRouteHandler<GetBulkShiftForEmployeeRoute> = async (c: any) => {
  const query = sql`
                    SELECT
                      e.uuid AS employee_uuid,
                      employeeUser.name AS employee_name,
                      e.start_date::date,
                      e.profile_picture,
                      dept.department AS department_name,
                      des.designation AS designation_name,
                      COALESCE(current_shift_info.current_shift, '[]'::jsonb) AS current_shift,
                      COALESCE(next_shift_info.next_shifts, '[]'::jsonb) AS next_shifts
                    FROM hr.employee e
                    LEFT JOIN hr.users employeeUser ON e.user_uuid = employeeUser.uuid
                    LEFT JOIN hr.department dept ON employeeUser.department_uuid = dept.uuid
                    LEFT JOIN hr.designation des ON employeeUser.designation_uuid = des.uuid
                    LEFT JOIN (  
                                WITH LatestEmployeeLog AS (
                                    SELECT
                                        el.employee_uuid,
                                        el.type_uuid,
                                        el.effective_date,
                                        ROW_NUMBER() OVER(PARTITION BY el.employee_uuid ORDER BY el.effective_date DESC) as rn
                                    FROM
                                        hr.employee_log el
                                    WHERE
                                        el.type = 'shift_group'
                                        AND el.effective_date::date <= CURRENT_DATE
                                ),
                                LatestRoster AS (
                                    SELECT
                                        r.shift_group_uuid,
                                        r.shifts_uuid,
                                        r.effective_date,
                                        r.off_days,
                                        ROW_NUMBER() OVER(PARTITION BY r.shift_group_uuid ORDER BY r.effective_date DESC) as rn
                                    FROM
                                        hr.roster r
                                    WHERE
                                        r.effective_date::date <= CURRENT_DATE
                                )
                                SELECT
                                    lel.employee_uuid,
                                    JSONB_BUILD_OBJECT(
                                        'shift_name', s.name,
                                        'start_time', s.start_time,
                                        'end_time', s.end_time,
                                        'late_time', s.late_time,
                                        'effective_date', lr.effective_date,
                                        'shift_group_name', sg.name,
                                        'off_days', lr.off_days
                                    ) AS current_shift
                                FROM
                                    LatestEmployeeLog lel
                                LEFT JOIN hr.shift_group sg ON lel.type_uuid = sg.uuid
                                LEFT JOIN LatestRoster lr ON lel.type_uuid = lr.shift_group_uuid AND lr.rn = 1
                                LEFT JOIN hr.shifts s ON lr.shifts_uuid = s.uuid
                                WHERE
                                    lel.rn = 1
                             ) AS current_shift_info
                    ON e.uuid = current_shift_info.employee_uuid
                    LEFT JOIN (
                                WITH NextEmployeeLog AS (
                                  SELECT
                                    el.employee_uuid,
                                    el.type_uuid AS shift_group_uuid,
                                    el.effective_date
                                  FROM hr.employee_log el
                                  WHERE el.type = 'shift_group'
                                    AND el.effective_date::date > CURRENT_DATE
                                  ORDER BY el.effective_date ASC
                                ),
                                NextRoster AS (
                                  SELECT DISTINCT ON (nel.employee_uuid, nel.shift_group_uuid, nel.effective_date)
                                    r.shift_group_uuid,
                                    r.shifts_uuid,
                                    r.effective_date,
                                    r.off_days,
                                    nel.employee_uuid,
                                    nel.effective_date AS nel_effective_date
                                  FROM NextEmployeeLog nel
                                  LEFT JOIN hr.roster r
                                    ON r.shift_group_uuid = nel.shift_group_uuid
                                    AND (
                                      r.effective_date = nel.effective_date
                                      OR r.effective_date = (
                                        SELECT r2.effective_date
                                        FROM hr.roster r2
                                        WHERE r2.shift_group_uuid = nel.shift_group_uuid
                                          AND r2.effective_date < nel.effective_date
                                        ORDER BY r2.effective_date DESC
                                        LIMIT 1
                                      )
                                    )
                                  ORDER BY nel.employee_uuid, nel.shift_group_uuid, nel.effective_date
                                )
                                SELECT
                                  nel.employee_uuid,
                                  COALESCE(
                                    JSONB_AGG(
                                      JSONB_BUILD_OBJECT(
                                        'shift_name', s.name,
                                        'start_time', s.start_time,
                                        'end_time', s.end_time,
                                        'late_time', s.late_time,
                                        'roster_effective_date', nr.effective_date,
                                        'effective_date', nel.effective_date,
                                        'shift_group_name', sg.name,
                                        'off_days', nr.off_days
                                      ) ORDER BY nel.effective_date ASC
                                    ),
                                    '[]'::jsonb
                                  ) AS next_shifts
                                FROM NextEmployeeLog nel
                                LEFT JOIN hr.shift_group sg ON nel.shift_group_uuid = sg.uuid
                                LEFT JOIN NextRoster nr ON nel.employee_uuid = nr.employee_uuid AND nel.shift_group_uuid = nr.shift_group_uuid AND nel.effective_date = nr.nel_effective_date
                                LEFT JOIN hr.shifts s ON nr.shifts_uuid = s.uuid
                                GROUP BY nel.employee_uuid
                                ORDER BY nel.employee_uuid ASC
                              ) AS next_shift_info
                              ON e.uuid = next_shift_info.employee_uuid
                 ORDER BY employeeUser.name ASC                
  `;
  const resultPromise = db.execute(query);

  const data = await resultPromise;
  return c.json({ entry: data.rows ?? {} }, HSCode.OK);
};

export const getEmployeeSalaryByFiscalYear: AppRouteHandler<GetEmployeeSalaryByFiscalYearRoute> = async (c: any) => {
  const { fiscal_year_uuid } = c.req.valid('param');

  const fiscalYearPromise = db
    .select({
      uuid: fiscal_year.uuid,
      year: fiscal_year.year,
      from_month: fiscal_year.from_month,
      to_month: fiscal_year.to_month,
      challan_info: fiscal_year.challan_info,
    })
    .from(fiscal_year)
    .where(eq(fiscal_year.uuid, fiscal_year_uuid));

  const [data] = await fiscalYearPromise;

  const employeeSalaryPromise = db
    .select({
      employee_uuid: employee.uuid,
      employee_name: users.name,
      designation: designation.designation,
      department: department.department,
      start_date: employee.start_date,
      profile_picture: employee.profile_picture,
      actual_salary: sql`
        (
          COALESCE(${employee.joining_amount}::float8, 0)
          +
          COALESCE(
            (
              SELECT SUM(si.amount)::float8
              FROM hr.salary_increment si
              WHERE si.effective_date::date <= ${data.to_month}::date
                AND si.employee_uuid = ${employee.uuid}
            ),
            0
          )
        )::float8
      `,
      basic_salary: sql`
        (
          (
            COALESCE(${employee.joining_amount}::float8, 0)
            +
            COALESCE(
              (
                SELECT SUM(si.amount)::float8
                FROM hr.salary_increment si
                WHERE si.effective_date::date <= ${data.to_month}::date
                  AND si.employee_uuid = ${employee.uuid}
              ),
              0
            )
          ) * 0.50
        )::float8
      `,
    })
    .from(employee)
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(department, eq(users.department_uuid, department.uuid))
    .leftJoin(designation, eq(users.designation_uuid, designation.uuid));

  const employeeSalaryData = await employeeSalaryPromise;

  return c.json(employeeSalaryData || [], HSCode.OK);
};

export const postBulkEmployeeInformation: AppRouteHandler<PostBulkEmployeeInformationRoute> = async (c: any) => {
  const payload = c.req.valid('json');

  // console.log('Bulk Employee Payload:', payload);

  if (!Array.isArray(payload) || payload.length === 0)
    return c.json({ message: 'Invalid payload, expected an array' }, HSCode.BAD_REQUEST);

  const inserted: any[] = [];
  const skipped: any[] = [];

  try {
    await db.transaction(async (tx) => {
      for (const row of payload) {
        const email = row.email;

        console.log('Processing row for employee_id:', row.employee_id, 'email:', email);

        const existingUser = email
          ? await tx.select({ uuid: users.uuid }).from(users).where(eq(users.email, email))
          : [];

        console.log('Existing user check for email', email, ':', existingUser);

        if ((existingUser && existingUser.length > 0)) {
          skipped.push({
            email: email || null,
            reason: 'employee_id or email already exists',
          });
          continue;
        }
      } // end for
    }); // end transaction
  }
  catch (err: any) {
    // on transaction error return failure
    return c.json({ message: 'Bulk insert failed', error: err?.message ?? String(err) }, HSCode.INTERNAL_SERVER_ERROR);
  }

  return c.json({ inserted_count: inserted.length, skipped_count: skipped.length, inserted, skipped }, HSCode.OK);
};
