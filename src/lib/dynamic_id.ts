import { and, desc, sql } from 'drizzle-orm';

import db from '@/db';

export async function generateDynamicId(table: any, idColumn: any, createdAtColumn: any): Promise<number | null> {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  // Query the last inserted ID for the current year and month
  const lastRecord = await db
    .select({
      id: idColumn,
    })
    .from(table)
    .where(and(
      sql`EXTRACT(YEAR FROM ${createdAtColumn}) = ${currentYear}`,
      sql`EXTRACT(MONTH FROM ${createdAtColumn}) = ${currentMonth}`,
    ))
    .orderBy(desc(idColumn))
    .limit(1);

  // Return the last ID or null if no record exists
  return lastRecord.length > 0 ? lastRecord[0].id + 1 : 1;
}
