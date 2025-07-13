import type { AppRouteHandler } from '@/lib/types';

import { eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { nanoid } from '@/lib/nanoid';
import * as storeSchema from '@/routes/store/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, PatchRoute, RemoveRoute } from './routes';

import { order } from '../schema';

// const user = alias(hrSchema.users, 'user');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const {
    model_uuid,
    brand_uuid,
    created_by,
    created_at,
  } = value;

  let finalModelUuid = model_uuid;

  if (model_uuid) {
    const model = await db
      .select()
      .from(storeSchema.model)
      .where(eq(storeSchema.model.uuid, model_uuid))
      .limit(1);

    if (model.length === 0) {
      const [newModel] = await db
        .insert(storeSchema.model)
        .values({
          uuid: nanoid(),
          brand_uuid,
          name: model_uuid,
          created_by,
          created_at,
        })
        .returning({
          uuid: storeSchema.model.uuid,
        });

      finalModelUuid = newModel.uuid;
    }
  }

  const [data] = await db.insert(order).values({ ...value, model_uuid: finalModelUuid }).returning({
    name: order.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const {
    model_uuid,
    brand_uuid,
    created_by,
    updated_at,
  } = updates;

  let finalModelUuid = model_uuid;
  if (model_uuid) {
    const model = await db
      .select()
      .from(storeSchema.model)
      .where(eq(storeSchema.model.uuid, model_uuid))
      .limit(1);

    if (model.length === 0) {
      const [newModel] = await db
        .insert(storeSchema.model)
        .values({
          uuid: nanoid(),
          brand_uuid,
          name: model_uuid,
          created_by,
          created_at: updated_at,
        })
        .returning({
          uuid: storeSchema.model.uuid,
        });
      finalModelUuid = newModel.uuid;
    }
  }
  const [data] = await db.update(order)
    .set({ ...updates, model_uuid: finalModelUuid })
    .where(eq(order.uuid, uuid))
    .returning({
      name: order.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(order)
    .where(eq(order.uuid, uuid))
    .returning({
      name: order.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

// export const list: AppRouteHandler<ListRoute> = async (c: any) => {
//   const { qc, is_delivered, work_in_hand, customer_uuid, is_repair } = c.req.valid('query');

//   const orderPromise = db
//     .select({
//       id: order.id,
//       order_id: sql`CONCAT('WO', TO_CHAR(${order.created_at}, 'YY'), '-', TO_CHAR(${order.id}, 'FM0000'))`,
//       uuid: order.uuid,
//       info_uuid: order.info_uuid,
//       user_uuid: info.user_uuid,
//       user_id: sql`CONCAT('HU', TO_CHAR(${user.created_at}::timestamp, 'YY'), '-', TO_CHAR(${user.id}::integer, 'FM0000'))`,
//       user_name: user.name,
//       user_phone: user.phone,
//       model_uuid: order.model_uuid,
//       model_name: storeSchema.model.name,
//       brand_uuid: order.brand_uuid,
//       brand_name: storeSchema.brand.name,
//       serial_no: order.serial_no,
//       problems_uuid: order.problems_uuid,
//       problem_statement: order.problem_statement,
//       accessories: order.accessories,
//       is_product_received: info.is_product_received,
//       received_date: info.received_date,
//       warehouse_uuid: order.warehouse_uuid,
//       warehouse_name: storeSchema.warehouse.name,
//       rack_uuid: order.rack_uuid,
//       rack_name: storeSchema.rack.name,
//       floor_uuid: order.floor_uuid,
//       floor_name: storeSchema.floor.name,
//       box_uuid: order.box_uuid,
//       box_name: storeSchema.box.name,
//       created_by: order.created_by,
//       created_by_name: hrSchema.users.name,
//       created_at: order.created_at,
//       updated_at: order.updated_at,
//       remarks: order.remarks,
//       is_diagnosis_need: order.is_diagnosis_need,
//       quantity: order.quantity,
//       info_id: sql`CONCAT('WI', TO_CHAR(${info.created_at}::timestamp, 'YY'), '-', TO_CHAR(${info.id}, 'FM0000'))`,
//       is_transferred_for_qc: order.is_transferred_for_qc,
//       is_ready_for_delivery: order.is_ready_for_delivery,
//       is_proceed_to_repair: order.is_proceed_to_repair,
//       branch_uuid: storeSchema.warehouse.branch_uuid,
//       branch_name: storeSchema.branch.name,
//       repairing_problems_uuid: order.repairing_problems_uuid,
//       qc_problems_uuid: order.qc_problems_uuid,
//       delivery_problems_uuid: order.delivery_problems_uuid,
//       repairing_problem_statement: order.repairing_problem_statement,
//       qc_problem_statement: order.qc_problem_statement,
//       delivery_problem_statement: order.delivery_problem_statement,
//       ready_for_delivery_date: order.ready_for_delivery_date,
//       diagnosis_problems_uuid: diagnosis.problems_uuid,
//       diagnosis_problem_statement: diagnosis.problem_statement,
//       bill_amount: PG_DECIMAL_TO_FLOAT(order.bill_amount),
//       is_home_repair: order.is_home_repair,
//       proposed_cost: v(order.proposed_cost),
//       is_challan_needed: order.is_challan_needed,
//     })
//     .from(order)
//     .leftJoin(hrSchema.users, eq(order.created_by, hrSchema.users.uuid))
//     .leftJoin(
//       storeSchema.model,
//       eq(order.model_uuid, storeSchema.model.uuid),
//     )
//     .leftJoin(
//       storeSchema.brand,
//       eq(order.brand_uuid, storeSchema.brand.uuid),
//     )
//     .leftJoin(
//       storeSchema.warehouse,
//       eq(order.warehouse_uuid, storeSchema.warehouse.uuid),
//     )
//     .leftJoin(storeSchema.rack, eq(order.rack_uuid, storeSchema.rack.uuid))
//     .leftJoin(
//       storeSchema.floor,
//       eq(order.floor_uuid, storeSchema.floor.uuid),
//     )
//     .leftJoin(storeSchema.box, eq(order.box_uuid, storeSchema.box.uuid))
//     .leftJoin(info, eq(order.info_uuid, info.uuid))
//     .leftJoin(user, eq(info.user_uuid, user.uuid))
//     .leftJoin(
//       storeSchema.branch,
//       eq(storeSchema.warehouse.branch_uuid, storeSchema.branch.uuid),
//     )
//     .leftJoin(diagnosis, eq(order.uuid, diagnosis.order_uuid))
//     .orderBy(desc(order.created_at));

//   const filters = [];

//   if (qc === 'true') {
//     filters.push(
//       and(
//         eq(order.is_transferred_for_qc, true),
//         eq(order.is_ready_for_delivery, false),
//       ),
//     );
//   }

//   if (is_delivered === 'true') {
//     filters.push(eq(order.is_ready_for_delivery, true));
//   }

//   if (work_in_hand === 'true') {
//     filters.push(
//       and(
//         eq(order.is_transferred_for_qc, false),
//         eq(order.is_ready_for_delivery, false),
//       ),
//     );
//   }

//   if (customer_uuid) {
//     filters.push(
//       and(
//         eq(info.user_uuid, customer_uuid),
//         or(
//           eq(order.is_ready_for_delivery, true),
//           eq(order.is_challan_needed, true),
//         ),
//         not(
//           exists(
//             db
//               .select()
//               .from(deliverySchema.challan_entry)
//               .where(
//                 eq(
//                   deliverySchema.challan_entry.order_uuid,
//                   order.uuid,
//                 ),
//               ),
//           ),
//         ),
//       ),
//     );
//   }
//   if (is_repair === 'true') {
//     filters.push(
//       and(
//         eq(order.is_proceed_to_repair, true),
//         eq(order.is_transferred_for_qc, false),
//         eq(order.is_ready_for_delivery, false),
//       ),
//     );
//   }

//   if (filters.length > 0) {
//     orderPromise.where(and(...filters));
//   }

//   const data = await orderPromise;

//   const orderProblemsUUIDs = data
//     .map(order => order.problems_uuid)
//     .flat();
//   const diagnosisProblemsUUIDs = data
//     .map(order => order.diagnosis_problems_uuid)
//     .flat();
//   const repairingProblemsUUIDs = data
//     .map(order => order.repairing_problems_uuid)
//     .flat();
//   const qcProblemsUUIDs = data
//     .map(order => order.qc_problems_uuid)
//     .flat();
//   const deliveryProblemsUUIDs = data
//     .map(order => order.delivery_problems_uuid)
//     .flat();

//   const allProblemsUUIDs = Array.from(
//     new Set([
//       ...orderProblemsUUIDs,
//       ...diagnosisProblemsUUIDs,
//       ...repairingProblemsUUIDs,
//       ...qcProblemsUUIDs,
//       ...deliveryProblemsUUIDs,
//     ]),
//   );

//   const problems = await db
//     .select({
//       name: problem.name,
//       uuid: problem.uuid,
//     })
//     .from(problem)
//     .where(inArray(problem.uuid, allProblemsUUIDs));

//   const problemsMap: Record<string, string> = problems.reduce((acc, problem) => {
//     if (problem.uuid && problem.name) {
//       acc[problem.uuid] = problem.name;
//     }
//     return acc;
//   }, {} as Record<string, string>);

//   const accessories_uuid = data.map(order => order.accessories).flat();

//   const accessories = await db
//     .select({
//       name: accessory.name,
//       uuid: accessory.uuid,
//     })
//     .from(accessory)
//     .where(inArray(accessory.uuid, accessories_uuid));

//   const accessoriesMap = accessories.reduce((acc, accessory) => {
//     acc[accessory.uuid] = accessory.name;
//     return acc;
//   }, {});

//   data.forEach((order) => {
//     order.order_problems_name = (order.problems_uuid || []).map(
//       uuid => problemsMap[uuid],
//     );
//     order.diagnosis_problems_name = (
//       order.diagnosis_problems_uuid || []
//     ).map(uuid => problemsMap[uuid]);
//     order.repairing_problems_name = (
//       order.repairing_problems_uuid || []
//     ).map(uuid => problemsMap[uuid]);
//     order.qc_problems_name = (order.qc_problems_uuid || []).map(
//       uuid => problemsMap[uuid],
//     );
//     order.delivery_problems_name = (
//       order.delivery_problems_uuid || []
//     ).map(uuid => problemsMap[uuid]);
//     order.accessories_name = (order.accessories || []).map(
//       uuid => accessoriesMap[uuid],
//     );
//   });

//   if (is_repair === 'true') {
//     const api = await createApi(req);

//     const fetchData = async endpoint =>
//       await api
//         .get(`${endpoint}`)
//         .then(response => response.data)
//         .catch((error) => {
//           console.error(
//             `Error fetching data from ${endpoint}:`,
//             error.message,
//           );
//           throw error;
//         });

//     // Fetch product transfer data for each order
//     for (const order of data) {
//       const productTransfer = await fetchData(
//         `/store/product-transfer/by/${order.uuid}`,
//       );
//       order.product_transfer = productTransfer?.data || [];
//     }
//   }

//   return c.json(data || [], HSCode.OK);
// };

// export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
//   const { uuid } = c.req.valid('param');

//   const infoPromise = db
//     .select({
//       id: info.id,
//       info_id: sql`CONCAT('WI', TO_CHAR(${info.created_at}::timestamp, 'YY'), '-', TO_CHAR(${info.id}, 'FM0000'))`,
//       uuid: info.uuid,
//       user_uuid: info.user_uuid,
//       user_id: sql`CONCAT('HU', TO_CHAR(${user.created_at}::timestamp, 'YY'), '-', TO_CHAR(${user.id}, 'FM0000'))`,
//       user_name: user.name,
//       user_phone: user.phone,
//       received_date: info.received_date,
//       is_product_received: info.is_product_received,
//       created_by: info.created_by,
//       created_by_name: hrSchema.users.name,
//       created_at: info.created_at,
//       updated_at: info.updated_at,
//       remarks: info.remarks,
//       location: info.location,
//       zone_uuid: info.zone_uuid,
//       zone_name: zone.name,
//       submitted_by: info.submitted_by,
//     })
//     .from(info)
//     .leftJoin(user, eq(info.user_uuid, user.uuid))
//     .leftJoin(hrSchema.users, eq(info.created_by, hrSchema.users.uuid))
//     .leftJoin(zone, eq(info.zone_uuid, zone.uuid))
//     .where(eq(info.uuid, uuid));

//   const data = await infoPromise;

//   if (!data)
//     return DataNotFound(c);

//   return c.json(data || {}, HSCode.OK);
// };
