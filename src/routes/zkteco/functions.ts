import { eq } from 'drizzle-orm';

import db from '@/db';
import env from '@/env';
import nanoid from '@/lib/nanoid';
import { fmtYmdHms } from '@/utils/attendence/utils';

import { device_list, employee, punch_log } from '../hr/schema';

export const commandSyntax = String(env.ICLOCK_COMMAND).toUpperCase();

let globalCommandId = 1;

export function recordSentCommand(sn: string, cmd: string, remote: string | null, sentCommands: Map<string, any[]>, ensureSentList: (sn: string) => any[]) {
  const list = ensureSentList(sn);
  list.push({
    id: globalCommandId++,
    cmd,
    queuedAt: new Date().toISOString(), // new canonical field
    sentAt: new Date().toISOString(), // legacy name retained for compatibility
    deliveredAt: null,
    bytesSent: null,
    respondedAt: null,
    staleAt: null,
    remote: remote || null,
  });
  // Cap list length to avoid unbounded growth
  if (list.length > 500)
    list.splice(0, list.length - 500);
}

export function recordPoll(sn: string, remote: string | null, queueBefore: number, deliveredCount: number, pollHistory: Map<string, any[]>) {
  if (!pollHistory.has(sn))
    pollHistory.set(sn, []);
  const arr = pollHistory.get(sn);
  if (arr) {
    arr.push({ at: new Date().toISOString(), remote, queueBefore, deliveredCount });
    if (arr.length > 200)
      arr.splice(0, arr.length - 200);
  }
}

export function markDelivered(sn: string, ids: string[], bytes: number, sentCommands: Map<string, any[]>) {
  const list = sentCommands.get(sn);
  if (!list)
    return;
  const ts = new Date().toISOString();
  for (const rec of list) {
    if (ids.includes(rec.id)) {
      rec.deliveredAt = ts;
      rec.bytesSent = bytes;
    }
  }
}

export function buildFetchCommand(sn: string, defaultLookbackHours = 24, commandSyntax: string = 'ATT_LOG', deviceState: Map<string, any>) {
  const st = deviceState.get(sn);
  const now = new Date();
  const end = fmtYmdHms(now);
  let start;

  if (st?.lastStamp) {
    // st.lastStamp is stored as a Y-m-d H:M:S string (not a Date). toISO() returns a string,
    // so calling getTime() on it caused: TypeError: last?.getTime is not a function.
    // Parse safely into a Date and fall back to now if invalid.
    const raw = String(st.lastStamp).trim();
    let parsed = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'));
    if (Number.isNaN(parsed.getTime())) {
      // Attempt secondary parse via Date components (YYYY-MM-DD HH:mm:ss)
      const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
      if (m) {
        const [_, Y, M, D, h, i, s] = m;
        parsed = new Date(Number(Y), Number(M) - 1, Number(D), Number(h), Number(i), Number(s));
      }
    }
    if (Number.isNaN(parsed.getTime()))
      parsed = now;
    // Subtract 1s to avoid missing the next edge record (device returns > start)
    const s = new Date(parsed.getTime() - 1000);
    start = fmtYmdHms(s);
  }
  else {
    const s = new Date(now.getTime() - defaultLookbackHours * 3600 * 1000);
    start = fmtYmdHms(s);
  }

  switch (commandSyntax) {
    case 'DATA_QUERY':
      return `C:1:DATA QUERY ATTLOG StartTime=${start} EndTime=${end}`;
    case 'GET_ATTLOG':
      return `C:1:GET ATTLOG StartTime=${start} EndTime=${end}`;
    case 'ATTLOG':
      return `C:1:ATTLOG`;
    default:
      return `C:1:DATA QUERY ATTLOG StartTime=${start} EndTime=${end}`;
  }
}

export function recordCDataEvent(sn: string, summary: any, cdataEvents: Map<string, any[]>, sentCommands: Map<string, any[]>) {
  if (!cdataEvents.has(sn))
    cdataEvents.set(sn, []);
  const arr = cdataEvents.get(sn);
  if (arr) {
    arr.push(summary);
    if (arr.length > 300)
      arr.splice(0, arr.length - 300);
  }
  // Update linkage: any command delivered before this event but not yet responded gets postSeenAfterDelivery
  const cmds = sentCommands.get(sn);
  if (cmds) {
    for (const c of cmds) {
      if (c.deliveredAt && !c.respondedAt) {
        if (!c.postSeenAfterDelivery && c.deliveredAt <= summary.at) {
          c.postSeenAfterDelivery = true;
        }
      }
    }
  }
}

export function markStaleCommands(sn: string, sentCommands: Map<string, any[]>) {
  const list = sentCommands.get(sn);
  if (!list)
    return;
  const now = Date.now();
  for (const c of list) {
    if (c.deliveredAt && !c.respondedAt && !c.staleAt) {
      const age = now - new Date(c.deliveredAt).getTime();
      if (age > 90 * 1000) {
        c.staleAt = new Date().toISOString();
      }
    }
  }
}

export function ensureQueue(sn: string, commandQueue: Map<string, string[]>) {
  if (!commandQueue.has(sn))
    commandQueue.set(sn, []);
  return commandQueue.get(sn);
}

export function ensureUserMap(sn: string, usersByDevice: Map<string, Map<string, any>>) {
  if (!usersByDevice.has(sn))
    usersByDevice.set(sn, new Map());
  return usersByDevice.get(sn);
}

// Ensure users are fetched from device if usersByDevice is empty
export async function ensureUsersFetched(sn: string, usersByDevice: Map<string, Map<string, any>>, commandQueue: Map<string, string[]>) {
  const umap = ensureUserMap(sn, usersByDevice);

  // If we have users, return immediately
  if ((umap?.size ?? 0) > 0) {
    return umap;
  }

  // If no users cached, queue a fetch command
  console.warn(`[ensure-users] SN=${sn} no cached users, queuing fetch command`);
  const q = ensureQueue(sn, commandQueue);

  // Only queue if not already queued
  const hasUserQuery = q && q.some((cmd: string) => cmd.includes('C:1:DATA QUERY USERINFO'));

  if (q && !hasUserQuery) {
    q.push('C:1:DATA QUERY USERINFO');
    console.warn(`[ensure-users] SN=${sn} queued user fetch command`);
  }
  else {
    console.warn(`[ensure-users] SN=${sn} user fetch already queued`);
  }

  console.warn(`[ensure-users] SN=${sn} returning empty user map for now`);

  return umap;
}

export async function getNextAvailablePin(sn: string, startPin: string, usersByDevice: Map<string, Map<string, any>>) {
  // Use ensureUserMap to get existing map (already fetched by calling function)
  const umap = await ensureUsersFetched(sn, usersByDevice, new Map());
  let pin = Number(startPin) || 1;

  // Find the highest existing PIN to start from
  const existingPins = Array.from((umap ?? new Map()).keys())
    .map(p => Number(p))
    .filter(p => !Number.isNaN(p));
  if (existingPins.length > 0) {
    const maxPin = Math.max(...existingPins);
    pin = Math.max(pin, maxPin + 1);
  }

  // Find next available PIN
  const userMap = umap ?? new Map();
  while (userMap.has(String(pin))) {
    pin++;
  }

  return pin;
};

export async function insertRealTimeLogToBackend(pushedLogs: any[]) {
  // TODO: Implement the logic to insert real-time logs into the backend

  const logEntries = pushedLogs[0].log;
  const sn = pushedLogs[0].sn || 'unknown';

  // get device uuid from sn
  const device = await db.select().from(device_list).where(eq(device_list.identifier, sn)).limit(1);
  const device_uuid = device.length > 0 ? device[0].uuid : null;

  const value: any[] = [];

  console.warn('log: ', logEntries);

  // Use Promise.all to wait for all async operations
  const processedEntries = await Promise.all(
    logEntries.map(async (l: any) => {
      const employeeInfomation = await db.select().from(employee).where(eq(employee.pin, l.pin)).limit(1);
      const employee_uuid = employeeInfomation.length > 0 ? employeeInfomation[0].uuid : null;

      const punchType: 'fingerprint' | 'password' | 'rfid' | 'face' | 'other'
        = l.verify === 'fingerprint'
          ? 'fingerprint'
          : l.verify === 'password'
            ? 'password'
            : l.verify === 'card'
              ? 'rfid'
              : l.verify === 'face'
                ? 'face'
                : 'other';

      return {
        uuid: nanoid(15),
        device_list_uuid: device_uuid,
        employee_uuid,
        punch_type: punchType,
        punch_time: l.timestamp,
      };
    }),
  );

  // Add all processed entries to value array
  value.push(...processedEntries);

  console.warn('Inserting punch log: ', value);

  if (value.length === 0) {
    console.warn('No punch logs to insert');
    return 0;
  }

  const punchLogInsert = await db.insert(punch_log)
    .values(value)
    .returning({ name: punch_log.uuid });

  console.warn('Inserted punch log: ', punchLogInsert.length);

  return punchLogInsert.length;
}
