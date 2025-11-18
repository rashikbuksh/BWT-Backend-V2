import { and, eq } from 'drizzle-orm';
import crypto from 'node:crypto';

import db from '@/db';
import env from '@/env';
import nanoid from '@/lib/nanoid';
import { fmtYmdHms } from '@/utils/attendence/utils';

import { device_list, employee, employee_biometric, punch_log } from '../hr/schema';

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

// Safe queue push function that ensures only strings are added
export function safeQueuePush(queue: string[] | undefined, command: any): boolean {
  if (!queue) {
    console.warn('[safe-queue-push] Queue is undefined, cannot push command');
    return false;
  }

  if (typeof command !== 'string') {
    console.warn('[safe-queue-push] Command is not a string, converting:', { type: typeof command, value: command });
    const stringCmd = String(command);
    if (stringCmd === '[object Object]') {
      console.error('[safe-queue-push] Command cannot be safely converted to string, skipping:', command);
      return false;
    }
    queue.push(stringCmd);
    return true;
  }

  queue.push(command);
  return true;
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

  // Use Promise.all to wait for all async operations
  const processedEntries = await Promise.all(
    logEntries.map(async (l: any) => {
      const employeeInfomation = await db.select().from(employee).where(eq(employee.id, l.pin)).limit(1);
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

// Function to insert biometric data (BIOPHOTO, BIODATA, etc.)
export async function insertBiometricData(biometricItems: any[]) {
  if (!biometricItems || biometricItems.length === 0) {
    console.warn('[insert-biometric] No biometric data to insert');
    return { inserted: 0, updated: 0, skipped: 0, errors: 0, total: 0 };
  }

  // console.warn(biometricItems);

  const insertPromises = biometricItems.map(async (item) => {
    try {
      // Determine employee by PIN
      const employeeRecord = await db
        .select()
        .from(employee)
        .where(eq(employee.id, item.PIN || item.pin || item.Pin || ''))
        .limit(1);

      if (employeeRecord.length === 0) {
        console.warn(`[insert-biometric] Employee not found for PIN: ${item.PIN || item.pin || item.Pin} - Type: ${item.type} - Skipping this record`);
        return { action: 'employee_not_found', uuid: null, error: `Employee not found for PIN: ${item.PIN || item.pin || item.Pin}`, pin: item.PIN || item.pin || item.Pin, type: item.type };
      }

      console.warn(`[insert-biometric] item: `, item);

      // Determine biometric type based on the data type
      let biometricType = 'fingerprint'; // default
      let fingerIndex = 0;

      if (item.type === 'USERPIC') {
        return { action: 'skipped', uuid: null, pin: item.PIN || item.pin || item.Pin, type: item.type };
      }

      if (item.type === 'BIOPHOTO') {
        biometricType = 'face';
      }
      // else
      // if (item.type === 'USERPIC') {
      //   biometricType = 'face'; // User picture is typically a face photo
      // }
      else if (item.type === 'BIODATA') {
        // Check if it's fingerprint data
        if (item.Type && (item.Type === '1')) {
          biometricType = 'fingerprint';
          fingerIndex = Number(item.No || 0);
        }
        else if (item.Type === '8' || item.Type === '9') {
          biometricType = 'face';
        }
        else if (item.Type === '3') {
          biometricType = 'rfid';
        }
      }

      else if (item.type === 'USER') {
        // USER type may contain RFID card data
        if (item.CardNo || item.Card) {
          biometricType = 'rfid';
        }
      }

      const templateData = biometricType === 'rfid' ? item.Card : item.Template || item.template || item.Content || item.Tmp || item.Card || '';

      // Skip if template data is null, undefined, or empty
      if (!templateData || templateData.trim() === '') {
        console.warn(`[insert-biometric] Template data is null/empty for employee PIN: ${item.PIN || item.pin || item.Pin} (${biometricType}) - skipping`);
        return { action: 'skipped_empty_template', uuid: null, pin: item.PIN || item.pin || item.Pin, type: item.type, reason: 'Template data is null or empty' };
      }

      // Create a hash of the template data for efficient comparison
      const templateHash = crypto.createHash('sha256').update(templateData).digest('hex');

      // Prepare biometric data for insertion
      const biometricData = {
        uuid: nanoid(),
        employee_uuid: employeeRecord[0].uuid,
        template: templateData, // The actual biometric data
        biometric_type: biometricType as 'fingerprint' | 'face' | 'rfid',
        finger_index: fingerIndex,
        created_at: new Date().toISOString(),
        remarks: JSON.stringify({
          source: 'zkteco_device',
          original_data: item,
          pin: item.PIN || item.pin || item.Pin,
          tmp_type: item.TmpType || item.Type,
          tmp_index: item.TmpIndex || item.No,
          finger_id: item.FingerID,
          card_no: item.CardNo || item.Card,
          size: item.Size,
          valid: item.Valid,
          duress: item.Duress,
          // USERPIC specific fields
          pic_size: item.PicSize,
          content: item.Content ? 'present' : 'none', // Don't store full content in remarks for space
          template_hash: templateHash, // Store hash for future comparison
        }),
      };

      // Efficient duplicate checking: Check for existing biometric data with same employee, type, and finger index
      const existingBiometric = await db
        .select({
          uuid: employee_biometric.uuid,
          template: employee_biometric.template,
          remarks: employee_biometric.remarks,
          created_at: employee_biometric.created_at,
        })
        .from(employee_biometric)
        .where(
          and(
            eq(employee_biometric.employee_uuid, employeeRecord[0].uuid),
            eq(employee_biometric.biometric_type, biometricType as 'fingerprint' | 'face' | 'rfid'),
            eq(employee_biometric.finger_index, fingerIndex),
          ),
        )
        .limit(1);

      if (existingBiometric.length > 0) {
        // Check if the template data is different
        const existingTemplateHash = crypto.createHash('sha256').update(existingBiometric[0].template || '').digest('hex');

        if (existingTemplateHash === templateHash) {
          console.warn(`[insert-biometric] Duplicate ${biometricType} data for employee PIN: ${item.PIN || item.pin} (finger: ${fingerIndex}) - skipping`);
          return { action: 'skipped', uuid: existingBiometric[0].uuid, pin: item.PIN || item.pin, type: item.type };
        }
        else {
          // Template data is different, update the existing record
          const updateResult = await db
            .update(employee_biometric)
            .set({
              template: templateData,
              updated_at: new Date().toISOString(),
              remarks: biometricData.remarks,
            })
            .where(eq(employee_biometric.uuid, existingBiometric[0].uuid))
            .returning({ uuid: employee_biometric.uuid });

          console.warn(`[insert-biometric] Updated ${biometricType} data for employee PIN: ${item.PIN || item.pin} (finger: ${fingerIndex}) - template changed`);
          return { action: 'updated', uuid: updateResult[0].uuid, pin: item.PIN || item.pin, type: item.type };
        }
      }

      // No existing record found, insert new one
      const insertResult = await db
        .insert(employee_biometric)
        .values(biometricData)
        .returning({ uuid: employee_biometric.uuid });

      console.warn(`[insert-biometric] Inserted new ${biometricType} data for employee PIN: ${item.PIN || item.pin} (finger: ${fingerIndex})`);
      return { action: 'inserted', uuid: insertResult[0].uuid, pin: item.PIN || item.pin, type: item.type };
    }
    catch (error) {
      console.error(`[insert-biometric] Error processing biometric data for PIN: ${item.PIN || item.pin}:`, error);
      console.error(`[insert-biometric] Item data:`, item);
      return { action: 'error', uuid: null, error: (error as Error).message, pin: item.PIN || item.pin, type: item.type };
    }
  });

  const results = await Promise.all(insertPromises);
  const successfulResults = results.filter(result => result !== null && 'action' in result);

  // Count different action types
  const inserted = successfulResults.filter(result => result.action === 'inserted').length;
  const updated = successfulResults.filter(result => result.action === 'updated').length;
  const skipped = successfulResults.filter(result => result.action === 'skipped' || result.action === 'skipped_empty_template').length;
  const errors = successfulResults.filter(result => result.action === 'error' || result.action === 'employee_not_found').length;

  // Log details about failed records
  const failedRecords = successfulResults.filter(result => result.action === 'error' || result.action === 'employee_not_found');
  const skippedRecords = successfulResults.filter(result => result.action === 'skipped_empty_template');

  if (failedRecords.length > 0) {
    console.warn(`[insert-biometric] Failed records details:`);
    failedRecords.forEach((record) => {
      console.warn(`  - PIN: ${record.pin}, Type: ${record.type}, Reason: ${record.action}, Error: ${record.error}`);
    });
  }

  if (skippedRecords.length > 0) {
    console.warn(`[insert-biometric] Skipped records due to empty template:`);
    skippedRecords.forEach((record) => {
      console.warn(`  - PIN: ${record.pin}, Type: ${record.type}, Reason: ${record.reason}`);
    });
  }

  // Log successful records summary
  const successfulRecords = successfulResults.filter(result =>
    result.action === 'inserted'
    || result.action === 'updated'
    || result.action === 'skipped'
    || result.action === 'skipped_empty_template',
  );
  if (successfulRecords.length > 0) {
    const pinsByAction = {
      inserted: successfulRecords.filter(r => r.action === 'inserted').map(r => r.pin),
      updated: successfulRecords.filter(r => r.action === 'updated').map(r => r.pin),
      skipped: successfulRecords.filter(r => r.action === 'skipped' || r.action === 'skipped_empty_template').map(r => r.pin),
    };
    console.warn(`[insert-biometric] Successful records: Inserted PINs=[${pinsByAction.inserted.join(',')}], Updated PINs=[${pinsByAction.updated.join(',')}], Skipped PINs=[${pinsByAction.skipped.join(',')}]`);
  }

  console.warn(`[insert-biometric] Results: ${inserted} inserted, ${updated} updated, ${skipped} skipped, ${errors} errors (${successfulResults.length} total processed)`);
  return { inserted, updated, skipped, errors, total: successfulResults.length };
}

// Function to delete a user from ZKTeco device using PIN
export async function deleteUserFromDevice(
  pin: string,
  commandQueue: Map<string, string[]>,
  usersByDevice: Map<string, Map<string, any>>,
  sn?: string,
) {
  try {
    if (!pin) {
      console.error('[delete-user] PIN is required');
      return { success: false, error: 'PIN is required' };
    }

    // If no specific device serial number provided, send to all devices
    const devicesToUpdate = sn ? [sn] : Array.from(commandQueue.keys());

    if (devicesToUpdate.length === 0) {
      console.warn('[delete-user] No devices found to delete user from');
      return { success: false, error: 'No devices found' };
    }

    const results = [];

    for (const deviceSn of devicesToUpdate) {
      try {
        // Ensure queue exists for this device
        const queue = ensureQueue(deviceSn, commandQueue);

        // Remove user from device cache
        const umap = ensureUserMap(deviceSn, usersByDevice);
        if (umap && umap.has(pin)) {
          umap.delete(pin);
          console.warn(`[delete-user] Removed PIN ${pin} from device ${deviceSn} cache`);
        }

        // Create delete user command for ZKTeco device
        // The command format is: C:ID:DATA DELETE USERINFO PIN=<pin>
        const deleteCommand = `C:1:DATA DELETE USERINFO PIN=${pin}`;

        // Add command to queue
        if (queue) {
          // Check if delete command already exists in queue to avoid duplicates
          const existingDeleteCmd = queue.find(cmd => cmd === deleteCommand);
          if (!existingDeleteCmd) {
            queue.push(deleteCommand);
            console.warn(`[delete-user] Queued delete command for PIN ${pin} on device ${deviceSn}: ${deleteCommand}`);
            results.push({ device: deviceSn, success: true, command: deleteCommand });
          }
          else {
            console.warn(`[delete-user] Delete command for PIN ${pin} already queued for device ${deviceSn}`);
            results.push({ device: deviceSn, success: true, command: deleteCommand, note: 'Already queued' });
          }
        }
        else {
          console.error(`[delete-user] Failed to get command queue for device ${deviceSn}`);
          results.push({ device: deviceSn, success: false, error: 'Failed to get command queue' });
        }
      }
      catch (error) {
        console.error(`[delete-user] Error processing device ${deviceSn}:`, error);
        results.push({ device: deviceSn, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    console.warn(`[delete-user] Delete user PIN ${pin} completed: ${successCount} success, ${failureCount} failures`);

    return {
      success: successCount > 0,
      pin,
      devicesProcessed: devicesToUpdate.length,
      successCount,
      failureCount,
      results,
    };
  }
  catch (error) {
    console.error('[delete-user] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unexpected error occurred',
    };
  }
}

// Function to add a user to ZKTeco device
export async function addUserToDevice(
  pin: string,
  name: string,
  commandQueue: Map<string, string[]>,
  usersByDevice: Map<string, Map<string, any>>,
  sn?: string,
  privilege = '0', // 0 = user, 1 = admin
  password = '',
  cardno = '',
) {
  try {
    if (!name) {
      console.error('[add-user] Name is required');
      return { success: false, error: 'Name is required' };
    }

    // If no specific device serial number provided, send to all devices
    const devicesToUpdate = sn ? [sn] : Array.from(commandQueue.keys());

    if (devicesToUpdate.length === 0) {
      console.warn('[add-user] No devices found to add user to');
      return { success: false, error: 'No devices found' };
    }

    const results = [];

    for (const deviceSn of devicesToUpdate) {
      try {
        // Always get next available PIN to avoid conflicts, unless pin is explicitly provided and valid
        if (!pin || pin.trim() === '' || pin === null) {
          console.error(`[add-user] No PIN provided, assigned next available PIN ${pin} for device ${deviceSn}`);
          results.push({ device: deviceSn, success: false, note: 'No Pin Provided' });
        }

        // Ensure queue exists for this device
        const queue = ensureQueue(deviceSn, commandQueue);

        // Check if user already exists on device
        const umap = ensureUserMap(deviceSn, usersByDevice);
        const existingUser = umap?.get(pin);

        if (existingUser && existingUser.name === name && existingUser.pin === pin) {
          console.warn(`[add-user] User PIN ${pin} with name "${name}" already exists on device ${deviceSn}`);
          results.push({ device: deviceSn, success: true, note: 'User already exists with same name' });
          continue;
        }

        // Add user to device cache
        if (umap) {
          umap.set(pin, { pin, name, privilege, password, cardno });
          console.warn(`[add-user] Added PIN ${pin} to device ${deviceSn} cache`);
        }

        // Create add user command for ZKTeco device
        // The command format is: C:ID:DATA UPDATE USERINFO PIN=<pin>\tName=<name>\tPri=<privilege>\tPasswd=<password>\tCard=<cardno>
        const addCommand = `C:1:DATA UPDATE USERINFO PIN=${pin}\tName=${name}\tPri=${privilege}\tPasswd=${password}\tCard=${cardno}`;

        // Add command to queue
        if (queue) {
          // Check if add command already exists in queue to avoid duplicates
          const existingAddCmd = queue.find(cmd => cmd.includes(`PIN=${pin}`) && cmd.includes('DATA UPDATE USERINFO'));
          if (!existingAddCmd) {
            queue.push(addCommand);
            console.warn(`[add-user] Queued add command for PIN ${pin} on device ${deviceSn}: ${addCommand}`);
            results.push({ device: deviceSn, success: true, command: addCommand });
          }
          else {
            console.warn(`[add-user] Add command for PIN ${pin} already queued for device ${deviceSn}`);
            results.push({ device: deviceSn, success: true, command: addCommand, note: 'Already queued' });
          }
        }
        else {
          console.error(`[add-user] Failed to get command queue for device ${deviceSn}`);
          results.push({ device: deviceSn, success: false, error: 'Failed to get command queue' });
        }
      }
      catch (error) {
        console.error(`[add-user] Error processing device ${deviceSn}:`, error);
        results.push({ device: deviceSn, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    console.warn(`[add-user] Add user PIN ${pin} completed: ${successCount} success, ${failureCount} failures`);

    return {
      success: successCount > 0,
      pin,
      name,
      devicesProcessed: devicesToUpdate.length,
      successCount,
      failureCount,
      results,
    };
  }
  catch (error) {
    console.error('[add-user] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unexpected error occurred',
    };
  }
}

// Store for temporary users with their expiry times
const temporaryUsers = new Map<string, { pin: string; deviceSn: string; expiryTime: Date; timeoutId: NodeJS.Timeout }>();

// Function to add multiple users to ZKTeco device with temporary access
export async function addTemporaryUserToDevice(
  users: Array<{ pin: string; name: string; start_date: Date; end_date: Date; privilege?: string; password?: string; cardno?: string; timeZone?: string }>,
  commandQueue: Map<string, string[]>,
  usersByDevice: Map<string, Map<string, any>>,
  sn: string,
) {
  try {
    // Validate input
    if (!users || users.length === 0) {
      console.error('[add-temp-user] No users provided');
      return { success: false, error: 'No users provided' };
    }

    // If no specific device serial number provided, send to all devices
    const devicesToUpdate = sn ? [sn] : Array.from(commandQueue.keys());

    if (devicesToUpdate.length === 0) {
      console.warn('[add-temp-user] No devices found to add users to');
      return { success: false, error: 'No devices found' };
    }

    const allResults: any[] = [];
    let totalSuccessCount = 0;
    let totalFailureCount = 0;

    // Process each user
    for (const user of users) {
      const { pin, name, start_date, end_date, privilege = '0', password = '', cardno = '', timeZone } = user;

      // Validate individual user data
      if (!pin) {
        console.error(`[add-temp-user] PIN is required for user: ${name || 'Unknown'}`);
        allResults.push({ pin, name, success: false, error: 'PIN is required' });
        totalFailureCount++;
        continue;
      }

      if (!name) {
        console.error(`[add-temp-user] Name is required for PIN: ${pin}`);
        allResults.push({ pin, name, success: false, error: 'Name is required' });
        totalFailureCount++;
        continue;
      }

      if (end_date <= start_date) {
        console.error(`[add-temp-user] End date must be greater than start date for PIN ${pin}`);
        allResults.push({ pin, name, success: false, error: 'End date must be greater than start date' });
        totalFailureCount++;
        continue;
      }

      const userResults = [];
      const expiryTime = end_date;

      // Process this user for each device
      for (const deviceSn of devicesToUpdate) {
        try {
          // Ensure queue exists for this device
          const queue = ensureQueue(deviceSn, commandQueue);

          // Check if user already exists on device
          const umap = ensureUserMap(deviceSn, usersByDevice);
          const existingUser = umap?.get(pin);

          if (existingUser && existingUser.name === name && existingUser.pin === pin) {
            console.warn(`[add-temp-user] User PIN ${pin} with name "${name}" already exists on device ${deviceSn}`);
            userResults.push({ device: deviceSn, success: true, note: 'User or Pin already exists with same name or Pin' });
            continue;
          }

          // Add user to device cache
          if (umap) {
            umap.set(pin, { pin, name, privilege, password, cardno, timeZone, temporary: true, expiryTime });
            console.warn(`[add-temp-user] Added PIN ${pin} to device ${deviceSn} cache with expiry ${expiryTime}`);
          }

          // Create time zone first (if not exists)
          const tzId = timeZone || pin;
          const timeZoneCommand = `C:1:DATA UPDATE TIMEZONE TZId=${tzId}\tAlias=TempAccess${tzId}\tStartTime=${start_date.toISOString()}\tEndTime=${expiryTime.toISOString()}`;

          // Create add user command with time zone restriction
          const addCommand = `C:1:DATA UPDATE USERINFO PIN=${pin}\tName=${name}\tPri=${privilege}\tPasswd=${password}\tCard=${cardno}\tTZ=${tzId}`;

          // Add commands to queue
          if (queue) {
            // Check if commands already exist in queue to avoid duplicates
            const existingTzCmd = queue.find(cmd => cmd.includes(`TZId=${tzId}`) && cmd.includes('DATA UPDATE TIMEZONE'));
            const existingAddCmd = queue.find(cmd => cmd.includes(`PIN=${pin}`) && cmd.includes('DATA UPDATE USERINFO'));

            if (!existingTzCmd) {
              queue.push(timeZoneCommand);
              console.warn(`[add-temp-user] Queued timezone command for device ${deviceSn}: ${timeZoneCommand}`);
            }

            if (!existingAddCmd) {
              queue.push(addCommand);
              console.warn(`[add-temp-user] Queued add command for PIN ${pin} on device ${deviceSn}: ${addCommand}`);
            }

            userResults.push({
              device: deviceSn,
              success: true,
              commands: [timeZoneCommand, addCommand],
              expiryTime: expiryTime.toISOString(),
            });
          }
          else {
            console.error(`[add-temp-user] Failed to get command queue for device ${deviceSn}`);
            userResults.push({ device: deviceSn, success: false, error: 'Failed to get command queue' });
          }

          // Schedule automatic deletion
          const timeUntilExpiry = expiryTime.getTime() - Date.now();

          // Only set timeout if expiry is in the future
          if (timeUntilExpiry > 0) {
            const timeoutId = setTimeout(async () => {
              console.warn(`[add-temp-user] Auto-deleting expired user PIN ${pin} from device ${deviceSn}`);

              try {
                await deleteUserFromDevice(pin, commandQueue, usersByDevice, deviceSn);

                // Clean up temporary user record
                const tempKey = `${pin}-${deviceSn}`;
                temporaryUsers.delete(tempKey);
                console.warn(`[add-temp-user] Successfully auto-deleted expired user PIN ${pin} from device ${deviceSn}`);
              }
              catch (error) {
                console.error(`[add-temp-user] Failed to auto-delete expired user PIN ${pin} from device ${deviceSn}:`, error);
              }
            }, timeUntilExpiry);

            // Store temporary user info for tracking
            const tempKey = `${pin}-${deviceSn}`;
            temporaryUsers.set(tempKey, {
              pin,
              deviceSn,
              expiryTime,
              timeoutId,
            });
          }
          else {
            console.warn(`[add-temp-user] Expiry time is in the past for PIN ${pin} on device ${deviceSn}, not scheduling deletion`);
          }
        }
        catch (error) {
          console.error(`[add-temp-user] Error processing device ${deviceSn} for user PIN ${pin}:`, error);
          userResults.push({ device: deviceSn, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }

      // Aggregate results for this user
      const userSuccessCount = userResults.filter(r => r.success).length;
      const userFailureCount = userResults.length - userSuccessCount;

      totalSuccessCount += userSuccessCount;
      totalFailureCount += userFailureCount;

      allResults.push({
        pin,
        name,
        start_date: start_date.toISOString(),
        end_date: expiryTime.toISOString(),
        success: userSuccessCount > 0,
        devicesProcessed: devicesToUpdate.length,
        successCount: userSuccessCount,
        failureCount: userFailureCount,
        deviceResults: userResults,
      });

      console.warn(`[add-temp-user] Add temporary user PIN ${pin} completed: ${userSuccessCount} success, ${userFailureCount} failures`);
    }

    return {
      success: totalSuccessCount > 0,
      totalUsers: users.length,
      totalDevices: devicesToUpdate.length,
      totalSuccessCount,
      totalFailureCount,
      results: allResults,
    };
  }
  catch (error) {
    console.error('[add-temp-user] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unexpected error occurred',
    };
  }
}

// Function to cancel temporary access before expiry
export async function cancelTemporaryAccess(
  pin: string,
  commandQueue: Map<string, string[]>,
  usersByDevice: Map<string, Map<string, any>>,
  sn?: string,
) {
  try {
    const devicesToUpdate = sn ? [sn] : Array.from(commandQueue.keys());
    const results = [];

    for (const deviceSn of devicesToUpdate) {
      const tempKey = `${pin}-${deviceSn}`;
      const tempUser = temporaryUsers.get(tempKey);

      if (tempUser) {
        // Clear the scheduled deletion
        clearTimeout(tempUser.timeoutId);
        temporaryUsers.delete(tempKey);

        // Delete user from device
        const deleteResult = await deleteUserFromDevice(pin, commandQueue, usersByDevice, deviceSn);
        results.push({
          device: deviceSn,
          success: deleteResult.success,
          note: 'Temporary access cancelled before expiry',
        });

        console.log(`[cancel-temp-access] Cancelled temporary access for PIN ${pin} on device ${deviceSn}`); // eslint-disable-line no-console
      }
      else {
        results.push({
          device: deviceSn,
          success: false,
          error: 'No temporary access found for this PIN',
        });
      }
    }

    return {
      success: results.some(r => r.success),
      pin,
      results,
    };
  }
  catch (error) {
    console.error('[cancel-temp-access] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unexpected error occurred',
    };
  }
}

// Function to get list of active temporary users
export function getTemporaryUsers() {
  const activeUsers = [];
  const now = new Date();

  for (const [key, tempUser] of temporaryUsers.entries()) {
    if (tempUser.expiryTime > now) {
      activeUsers.push({
        key,
        pin: tempUser.pin,
        deviceSn: tempUser.deviceSn,
        expiryTime: tempUser.expiryTime.toISOString(),
        timeRemainingMinutes: Math.ceil((tempUser.expiryTime.getTime() - now.getTime()) / (60 * 1000)),
      });
    }
  }

  return activeUsers;
}
