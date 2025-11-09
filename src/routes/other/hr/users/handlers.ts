import type { AppRouteHandler } from '@/lib/types';

import { and, eq, or, sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import * as deliverySchema from '@/routes/delivery/schema';
import * as hrSchema from '@/routes/hr/schema';
import * as workSchema from '@/routes/work/schema';

import type { UserAccessRoute, ValueLabelRoute } from './routes';

// export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
//   const { type, designation, department, is_ready_for_delivery, is_delivery_complete, challan_uuid, filteredUser, user_uuid, is_challan_needed } = c.req.valid('query');

//   const userPromise = db
//     .select({
//       value: hrSchema.users.uuid,
//       label: type === 'customer' ? sql`CONCAT(${hrSchema.users.name}, '-', ${hrSchema.users.phone})` : hrSchema.users.name,
//       ...(type === 'customer' && {
//         zone_uuid: sql`MAX(${workSchema.info.zone_uuid})`,
//         zone_name: sql`MAX(${workSchema.zone.name})`,
//         location: sql`MAX(${workSchema.info.location})`,
//       }),
//     })
//     .from(hrSchema.users)
//     .leftJoin(
//       hrSchema.designation,
//       eq(hrSchema.users.designation_uuid, hrSchema.designation.uuid),
//     )
//     .leftJoin(
//       hrSchema.department,
//       eq(hrSchema.users.department_uuid, hrSchema.department.uuid),
//     )
//     .leftJoin(
//       workSchema.info,
//       eq(hrSchema.users.uuid, workSchema.info.user_uuid),
//     )
//     .leftJoin(
//       workSchema.order,
//       eq(workSchema.info.uuid, workSchema.order.info_uuid),
//     )
//     .leftJoin(
//       workSchema.zone,
//       eq(workSchema.info.zone_uuid, workSchema.zone.uuid),
//     )
//     .leftJoin(
//       deliverySchema.challan,
//       eq(hrSchema.users.uuid, deliverySchema.challan.customer_uuid),
//     )
//     .leftJoin(
//       hrSchema.employee,
//       eq(hrSchema.users.uuid, hrSchema.employee.user_uuid),
//     )
//     .where(
//       filteredUser === 'true'
//         ? and(
//             eq(
//               sql`LOWER(CAST(${hrSchema.users.user_type} AS TEXT))`,
//               'employee',
//             ),
//             sql`${hrSchema.employee.user_uuid} IS NULL`,
//           )
//         : sql`true`,
//     )
//     .groupBy(
//       hrSchema.users.uuid,
//       hrSchema.users.name,
//       hrSchema.users.phone,
//     );

//   const filters = [];
//   if (type) {
//     filters.push(
//       eq(
//         sql`LOWER(CAST(${hrSchema.users.user_type} AS TEXT))`,
//         type.toLowerCase(),
//       ),
//     );
//   }
//   if (department) {
//     filters.push(
//       eq(
//         sql`LOWER(${hrSchema.department.department})`,
//         department.toLowerCase(),
//       ),
//     );
//   }
//   if (designation) {
//     filters.push(
//       eq(
//         sql`LOWER(${hrSchema.designation.designation})`,
//         designation.toLowerCase(),
//       ),
//     );
//   }
//   if (is_ready_for_delivery && is_delivery_complete) {
//     filters.push(
//       or(
//         eq(
//           workSchema.order.is_ready_for_delivery,
//           is_ready_for_delivery,
//         ),
//         eq(
//           deliverySchema.challan.is_delivery_complete,
//           is_delivery_complete,
//         ),
//       ),
//     );
//   }
//   if (is_challan_needed === 'true') {
//     filters.push(
//       and(
//         or(
//           eq(workSchema.order.is_ready_for_delivery, true),
//           eq(workSchema.order.is_challan_needed, true),
//         ),
//         or(
//           eq(deliverySchema.challan.is_delivery_complete, false),
//           sql`${deliverySchema.challan.customer_uuid} IS NULL`,
//         ),
//       ),
//     );
//   }
//   if (challan_uuid) {
//     filters.push(eq(deliverySchema.challan.uuid, challan_uuid));
//   }
//   if (user_uuid) {
//     filters.push(eq(hrSchema.users.uuid, user_uuid));
//   }

//   if (filters.length > 0) {
//     userPromise.where(and(...filters));
//   }

//   const data = await userPromise;

//   return c.json(data, HSCode.OK);
// };

const receivedTrue = sql`CASE WHEN 
      ${workSchema.info.is_product_received} = TRUE
      AND ${workSchema.order.is_diagnosis_need} = FALSE
      AND ${workSchema.order.is_proceed_to_repair} = FALSE
      AND ${workSchema.order.is_transferred_for_qc} = FALSE
      AND ${workSchema.order.is_ready_for_delivery} = FALSE
      AND ${workSchema.order.is_delivery_without_challan} = FALSE
      AND ${deliverySchema.challan.uuid} IS NULL
      AND ${workSchema.order.is_return} = FALSE 
      THEN ${workSchema.order.uuid} END`;
const diagnosisTrue = sql`CASE WHEN 
      ${workSchema.info.is_product_received} = TRUE 
      AND ${workSchema.order.is_diagnosis_need} = TRUE 
      AND ${workSchema.order.is_proceed_to_repair} = FALSE
      AND ${workSchema.order.is_transferred_for_qc} = FALSE
      AND ${workSchema.order.is_ready_for_delivery} = FALSE
      AND ${workSchema.order.is_delivery_without_challan} = FALSE
      AND ${deliverySchema.challan.uuid} IS NULL
      AND ${workSchema.order.is_return} = FALSE 
      THEN ${workSchema.order.uuid} END`;
const repairTrue = sql`CASE WHEN 
      ${workSchema.info.is_product_received} = TRUE 
      AND ${workSchema.order.is_diagnosis_need} = TRUE 
      AND ${workSchema.order.is_proceed_to_repair} = TRUE 
      AND ${workSchema.order.is_transferred_for_qc} = FALSE 
      AND ${workSchema.order.is_ready_for_delivery} = FALSE
      AND ${workSchema.order.is_delivery_without_challan} = FALSE
      AND ${deliverySchema.challan.uuid} IS NULL
      AND ${workSchema.order.is_return} = FALSE 
      THEN ${workSchema.order.uuid} END`;

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const {
    type,
    designation,
    department,
    is_ready_for_delivery,
    is_delivery_complete,
    challan_uuid,
    filteredUser,
    user_uuid,
    is_challan_needed,
  } = c.req.valid('query');

  const filters = [];

  if (filteredUser === 'true') {
    filters.push(
      and(
        eq(sql`LOWER(CAST(${hrSchema.users.user_type} AS TEXT))`, 'employee'),
        sql`${hrSchema.employee.user_uuid} IS NULL`,
      ),
    );
  }

  if (type === 'customer' || type === 'web') {
    filters.push(sql`LOWER(CAST(${hrSchema.users.user_type} AS TEXT)) IN ('customer', 'web')`);
  }
  else if (type) {
    filters.push(eq(sql`LOWER(CAST(${hrSchema.users.user_type} AS TEXT))`, type.toLowerCase()));
  }

  if (department) {
    filters.push(eq(sql`LOWER(${hrSchema.department.department})`, department.toLowerCase()));
  }

  if (designation) {
    filters.push(eq(sql`LOWER(${hrSchema.designation.designation})`, designation.toLowerCase()));
  }

  if (is_ready_for_delivery && is_delivery_complete) {
    filters.push(
      or(
        eq(workSchema.order.is_ready_for_delivery, is_ready_for_delivery),
        eq(deliverySchema.challan.is_delivery_complete, is_delivery_complete),
      ),
    );
  }

  if (is_challan_needed === 'true') {
    filters.push(
      and(
        or(
          eq(workSchema.order.is_ready_for_delivery, true),
          eq(workSchema.order.is_challan_needed, true),
        ),
        or(
          eq(deliverySchema.challan.is_delivery_complete, false),
          sql`${deliverySchema.challan.customer_uuid} IS NULL`,
        ),
      ),
    );
  }

  if (challan_uuid) {
    filters.push(eq(deliverySchema.challan.uuid, challan_uuid));
  }

  if (user_uuid) {
    filters.push(eq(hrSchema.users.uuid, user_uuid));
  }

  const query = db
    .select({
      value: hrSchema.users.uuid,
      label:
        type === 'customer' || type === 'web'
          ? sql`CONCAT(${hrSchema.users.name}, ' - ', ${hrSchema.users.phone})`
          : department === 'engineer'
            ? sql`CONCAT(${hrSchema.users.name}, ' - ', ${hrSchema.users.phone}, 
            ' (', 'Work In Hand: ', (COUNT(${receivedTrue})::float8 + COUNT(${diagnosisTrue})::float8 + COUNT(${repairTrue})::float8), ')')`
            : hrSchema.users.name,
      ...((type === 'customer' || type === 'web') && {
        zone_uuid: sql`MAX(${workSchema.info.zone_uuid})`,
        zone_name: sql`MAX(${workSchema.zone.name})`,
        location: sql`MAX(${workSchema.info.location})`,
        user_type: sql`MAX(${hrSchema.users.user_type})`,
      }),
      received_count: sql`COUNT(${receivedTrue})::float8`,
      diagnosis_count: sql`COUNT(${diagnosisTrue})::float8`,
      repair_count: sql`COUNT(${repairTrue})::float8`,
    })
    .from(hrSchema.users)
    .leftJoin(hrSchema.designation, eq(hrSchema.users.designation_uuid, hrSchema.designation.uuid))
    .leftJoin(hrSchema.department, eq(hrSchema.users.department_uuid, hrSchema.department.uuid))
    .leftJoin(workSchema.info, eq(hrSchema.users.uuid, workSchema.info.user_uuid))
    .leftJoin(workSchema.order, eq(workSchema.info.uuid, workSchema.order.info_uuid))
    .leftJoin(workSchema.zone, eq(workSchema.info.zone_uuid, workSchema.zone.uuid))
    .leftJoin(deliverySchema.challan, eq(hrSchema.users.uuid, deliverySchema.challan.customer_uuid))
    .leftJoin(hrSchema.employee, eq(hrSchema.users.uuid, hrSchema.employee.user_uuid))
    .where(filters.length > 0 ? and(...filters) : undefined)
    .groupBy(
      hrSchema.users.uuid,
      hrSchema.users.name,
      hrSchema.users.phone,
    );

  const data = await query;

  return c.json(data, HSCode.OK);
};

export const userAccess: AppRouteHandler<UserAccessRoute> = async (c: any) => {
  const userPromise = db
    .select({
      value: hrSchema.users.uuid,
      label: hrSchema.users.name,
      can_access: hrSchema.users.can_access,
    })
    .from(hrSchema.users);

  const data = await userPromise;

  return c.json(data, HSCode.OK);
};
