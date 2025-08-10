import type { AppRouteHandler } from '@/lib/types';

import { desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { PG_DECIMAL_TO_FLOAT } from '@/lib/variables';
import { createApi } from '@/utils/api';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetEmployeeAttendanceReportRoute, GetEmployeeLeaveInformationDetailsRoute, GetEmployeeSummaryDetailsByEmployeeUuidRoute, GetManualEntryByEmployeeRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { department, designation, employee, employment_type, leave_policy, shift_group, sub_department, users, workplace } from '../schema';

const createdByUser = alias(users, 'created_by_user');
const lineManagerUser = alias(users, 'line_manager_user');
const hrManagerUser = alias(users, 'hr_manager_user');
const firstLeaveApprover = alias(users, 'first_leave_approver');
const secondLeaveApprover = alias(users, 'second_leave_approver');
const firstLateApprover = alias(users, 'first_late_approver');
const secondLateApprover = alias(users, 'second_late_approver');
const firstManualEntryApprover = alias(users, 'first_manual_entry_approver');
const secondManualEntryApprover = alias(users, 'second_manual_entry_approver');

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

  const [data] = await db.delete(employee)
    .where(eq(employee.uuid, uuid))
    .returning({
      name: employee.id,
    });

  if (!data)
    return DataNotFound(c);

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
      // employee_name: employee.name,
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
      shift_group_uuid: employee.shift_group_uuid,
      shift_group_name: shift_group.name,
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
      // name: employee.name,
      // pass: employee.pass,
      designation_uuid: employee.designation_uuid,
      designation_name: designation.designation,
      department_uuid: employee.department_uuid,
      department_name: department.department,
      leave_policy_uuid: employee.leave_policy_uuid,
      leave_policy_name: leave_policy.name,
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
    })
    .from(employee)
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(workplace, eq(employee.workplace_uuid, workplace.uuid))
    .leftJoin(
      sub_department,
      eq(employee.sub_department_uuid, sub_department.uuid),
    )
    .leftJoin(createdByUser, eq(employee.created_by, createdByUser.uuid))
    .leftJoin(shift_group, eq(employee.shift_group_uuid, shift_group.uuid))
    .leftJoin(designation, eq(employee.designation_uuid, designation.uuid))
    .leftJoin(department, eq(employee.department_uuid, department.uuid))
    .leftJoin(
      leave_policy,
      eq(employee.leave_policy_uuid, leave_policy.uuid),
    )
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
      // employee_name: employee.name,
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
      shift_group_uuid: employee.shift_group_uuid,
      shift_group_name: shift_group.name,
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
      // name: employee.name,
      // pass: employee.pass,
      designation_uuid: employee.designation_uuid,
      designation_name: designation.designation,
      department_uuid: employee.department_uuid,
      department_name: department.department,
      leave_policy_uuid: employee.leave_policy_uuid,
      leave_policy_name: leave_policy.name,
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
    .leftJoin(shift_group, eq(employee.shift_group_uuid, shift_group.uuid))
    .leftJoin(designation, eq(employee.designation_uuid, designation.uuid))
    .leftJoin(department, eq(employee.department_uuid, department.uuid))
    .leftJoin(
      leave_policy,
      eq(employee.leave_policy_uuid, leave_policy.uuid),
    )
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
    .where(eq(employee.uuid, uuid));

  const [data] = await employeePromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};

export const getManualEntryDetailsByEmployee: AppRouteHandler<GetManualEntryByEmployeeRoute> = async (c: any) => {
  const { employee_uuid } = c.req.valid('param');

  const api = createApi(c);

  const fetchData = async (endpoint: string) =>
    await api
      .get(`${endpoint}/${employee_uuid}`)
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
      // employee_name: employee.name,
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
      shift_group_uuid: employee.shift_group_uuid,
      shift_group_name: shift_group.name,
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
      // name: employee.name,
      // email: employee.email,
      // pass: employee.pass,
      designation_uuid: employee.designation_uuid,
      designation_name: designation.designation,
      department_uuid: employee.department_uuid,
      department_name: department.department,
      employee_id: employee.employee_id,
      leave_policy_uuid: employee.leave_policy_uuid,
      leave_policy_name: leave_policy.name,
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
      remaining_leave_information: sql`
                  (
                    SELECT jsonb_agg(
                      jsonb_build_object(
                        'uuid', leave_category.uuid,
                        'name', leave_category.name,
                        'maximum_number_of_allowed_leaves', configuration_entry.maximum_number_of_allowed_leaves,
                        'used_leave_days', COALESCE(leave_summary.total_leave_days, 0),
                        'remaining_leave_days',
                          COALESCE(
                            configuration_entry.maximum_number_of_allowed_leaves - COALESCE(leave_summary.total_leave_days, 0),
                            configuration_entry.maximum_number_of_allowed_leaves
                          )
                      )
                    )
                    FROM hr.employee
                    LEFT JOIN hr.leave_policy ON employee.leave_policy_uuid = leave_policy.uuid
                    LEFT JOIN hr.configuration
                      ON leave_policy.uuid = configuration.leave_policy_uuid
                    LEFT JOIN hr.configuration_entry
                      ON configuration_entry.configuration_uuid = configuration.uuid
                    LEFT JOIN hr.leave_category
                      ON leave_category.uuid = configuration_entry.leave_category_uuid
                    LEFT JOIN (
                      SELECT
                        apply_leave.employee_uuid,
                        apply_leave.leave_category_uuid,
                        SUM(apply_leave.to_date::date - apply_leave.from_date::date + 1) AS total_leave_days
                      FROM hr.apply_leave
                      WHERE apply_leave.approval = 'approved' AND apply_leave.employee_uuid = ${employee_uuid}
                      GROUP BY apply_leave.employee_uuid, apply_leave.leave_category_uuid
                    ) AS leave_summary
                      ON leave_summary.employee_uuid = employee.uuid
                      AND leave_summary.leave_category_uuid = leave_category.uuid
                    WHERE leave_policy.uuid = ${employee.leave_policy_uuid}
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
                        'created_by_name', createdByUser.name
                      ), '{}'::jsonb
                    )
                    FROM hr.apply_leave
                    LEFT JOIN hr.leave_category ON apply_leave.leave_category_uuid = leave_category.uuid
                    LEFT JOIN hr.employee ON apply_leave.employee_uuid = employee.uuid
                    LEFT JOIN hr.users AS employeeUser ON employee.user_uuid = employeeUser.uuid
                    LEFT JOIN hr.users AS createdByUser ON apply_leave.created_by = createdByUser.uuid
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
    })
    .from(employee)
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(workplace, eq(employee.workplace_uuid, workplace.uuid))
    .leftJoin(
      sub_department,
      eq(employee.sub_department_uuid, sub_department.uuid),
    )
    .leftJoin(createdByUser, eq(employee.created_by, createdByUser.uuid))
    .leftJoin(shift_group, eq(employee.shift_group_uuid, shift_group.uuid))
    .leftJoin(designation, eq(employee.designation_uuid, designation.uuid))
    .leftJoin(department, eq(employee.department_uuid, department.uuid))
    .leftJoin(
      leave_policy,
      eq(employee.leave_policy_uuid, leave_policy.uuid),
    )
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
                  ud.user_uuid,
                  ud.employee_name,
                  DATE(ud.punch_date) AS punch_date,
                  MIN(pl.punch_time) AS entry_time,
                  MAX(pl.punch_time) AS exit_time,
                  (EXTRACT(EPOCH FROM MAX(pl.punch_time) - MIN(pl.punch_time)) / 3600)::float8 AS hours_worked,
                  (EXTRACT(EPOCH FROM MAX(s.end_time) - MIN(s.start_time)) / 3600)::float8 AS expected_hours
                FROM hr.employee e
                LEFT JOIN user_dates ud ON e.user_uuid = ud.user_uuid
                LEFT JOIN hr.punch_log pl ON pl.employee_uuid = e.uuid AND DATE(pl.punch_time) = DATE(ud.punch_date)
                LEFT JOIN hr.shift_group sg ON e.shift_group_uuid = sg.uuid
                LEFT JOIN hr.shifts s ON sg.shifts_uuid = s.uuid
                WHERE 
                  e.uuid = ${employee_uuid}
                GROUP BY ud.user_uuid, ud.employee_name, ud.punch_date
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
                        LEFT JOIN hr.shift_group ON e.shift_group_uuid = shift_group.uuid
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
                        ON employee.shift_group_uuid = off_days_summary.shift_group_uuid
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
