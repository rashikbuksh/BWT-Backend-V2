import type { AppRouteHandler } from '@/lib/types';

import { eq, inArray } from 'drizzle-orm';
import { Buffer } from 'node:buffer';

import env from '@/env';
import { parseLine } from '@/utils/attendence/iclock_parser';

import type { AddBulkUsersRoute, AddTemporaryUserRoute, CancelTemporaryAccessRoute, ClearCommandQueueRoute, ConnectionTestRoute, CustomCommandRoute, DeleteUserRoute, DeviceCmdRoute, DeviceHealthRoute, EmployeeBiometricSyncFromBackendToDeviceRoute, EmployeeBiometricSyncFromDeviceToBackendRoute, GetQueueStatusRoute, GetRequestLegacyRoute, GetRequestRoute, GetTemporaryUsersRoute, IclockRootRoute, PostRoute, RefreshUsersRoute, SyncAttendanceLogsRoute, SyncEmployeesRoute } from './routes';

import { commandSyntax, deleteUserFromDevice, ensureQueue, ensureUserMap, ensureUsersFetched, getNextAvailablePin, insertBiometricData, insertRealTimeLogToBackend, markDelivered, markStaleCommands, recordCDataEvent, recordPoll, recordSentCommand } from './functions';

// In-memory stores (replace with DB in prod)
const pushedLogs: any[] = []; // raw + enriched entries -- attendance real time logs
const informationLogs = []; // raw INFO lines -- user info, user details
const deviceState = new Map(); // sn -> { lastStamp, lastSeenAt, lastUserSyncAt }
const commandQueue = new Map(); // sn -> [ '...' ]
const usersByDevice = new Map(); // sn -> Map(pin -> user)
const devicePinKey = new Map(); // sn -> preferred PIN field key (PIN, Badgenumber, EnrollNumber, etc.)
const sentCommands = new Map(); // sn -> [{ id, cmd, queuedAt, sentAt(deprecated), deliveredAt, bytesSent, respondedAt, staleAt, postSeenAfterDelivery, remote }]
const cdataEvents = new Map(); // sn -> [{ at, lineCount, firstLine, hasUserInfo, hasAttlog, hasOptionLike }]
const rawCDataStore = new Map(); // sn -> [{ at, raw, bytes }]
const initialUserFetchDone = new Map<string, boolean>(); // Track if initial user fetch has been done for each device

// Export shared state for use in other modules
export { commandQueue, usersByDevice };

export function getNextAvailablePinFromHandler(sn: string) {
  return getNextAvailablePin(sn, '2', usersByDevice);
}

export const post: AppRouteHandler<PostRoute> = async (c: any) => {
  const sn = c.req.valid('query').SN || c.req.valid('query').sn || '';
  // const table = c.req.valid('query').table || c.req.valid('query').options || '';

  // Get raw text body for ZKTeco device data
  const raw = await c.req.text();

  console.warn(`*** /ICLOCK/CDATA POST ENDPOINT CALLED *** SN=${sn}`);
  console.warn(`POST data received: ${raw ? raw.length : 0} bytes`);

  // Debug summary of payload
  const rawLines = String(raw || '').replace(/\r/g, '\n').split('\n').filter(Boolean);

  recordCDataEvent(sn, {
    at: new Date().toISOString(),
    lineCount: rawLines.length,
    firstLine: rawLines[0] || '',
  }, cdataEvents, sentCommands);

  const truncated = rawLines.slice(0, 200).join('\n');
  if (!rawCDataStore.has(sn))
    rawCDataStore.set(sn, []);
  const rawArr = rawCDataStore.get(sn);
  rawArr.push({ at: new Date().toISOString(), raw: truncated, bytes: Buffer.byteLength(raw || '') });
  if (rawArr.length > 100)
    rawArr.splice(0, rawArr.length - 100);
  markStaleCommands(sn, sentCommands);

  // Process each line individually to handle multiple USER entries
  const allParsedItems = [];
  for (const line of rawLines) {
    if (line.trim()) {
      const items = parseLine(line);
      if (items) {
        allParsedItems.push(items);
      }
    }
  }

  // Process all parsed items
  let userCount = 0;
  let duplicateCount = 0;
  const currentSessionLogs = []; // Collect real-time logs for this session
  const biometricItems = []; // Collect all biometric items for batch processing

  for (const items of allParsedItems) {
    if (items.type === 'REAL_TIME_LOG') {
      pushedLogs.push({ ...items, sn });
      currentSessionLogs.push({ ...items, sn });
      insertRealTimeLogToBackend(currentSessionLogs).then((insertedCount) => {
        console.warn(`[real-time-logs] SN=${sn} successfully inserted ${insertedCount} attendance records`);
      });
    }

    else if (items.type === 'BIOPHOTO' || items.type === 'BIODATA' || items.type === 'USERPIC') {
      // Collect biometric data for batch processing
      biometricItems.push(items);
    }

    else if (items.type === 'USER') {
      biometricItems.push(items);
      // Auto-detect PIN key from the first USER with PIN-like fields
      const pinKeys = ['PIN', 'Badgenumber', 'EnrollNumber', 'CardNo', 'Card'];
      let userPin = null;
      let detectedKey = null;

      // Find which PIN field is present
      for (const key of pinKeys) {
        if ((items as Record<string, any>)[key]) {
          userPin = String((items as Record<string, any>)[key]);
          detectedKey = key;
          break;
        }
      }

      if (userPin && detectedKey) {
        // Auto-detect and cache the PIN key for this device
        if (!devicePinKey.has(sn)) {
          devicePinKey.set(sn, detectedKey);
        }

        const umap = ensureUserMap(sn, usersByDevice);

        // Avoid overwriting existing users with same PIN
        if (umap && !umap.has(userPin)) {
          umap.set(userPin, { ...items, pin: userPin });
          userCount++;
        }
        else if (umap) {
          duplicateCount++;
        }
      }
    }
    else if (items.type === 'ATT_LOG') {
      // Process attendance logs
      currentSessionLogs.push({ ...items, sn });
      insertRealTimeLogToBackend(currentSessionLogs).then((insertedCount) => {
        console.warn(`[real-time-logs] SN=${sn} successfully inserted ${insertedCount} attendance records`);
      });
    }
    else {
      informationLogs.push(items);
      // eslint-disable-next-line no-console
      console.log(`[information-log] SN=${sn} received info line:`, items);
    }
  }

  // Process biometric items in batch if any were collected
  console.warn(`[biometric-data] SN=${sn} processing ${biometricItems.length} biometric items in batch`);
  if (biometricItems.length > 0) {
    insertBiometricData(biometricItems).then((result) => {
      console.warn(`[biometric-data] SN=${sn} batch processed ${biometricItems.length} items: ${result.inserted} inserted, ${result.updated} updated, ${result.skipped} skipped, ${result.errors} errors`);
    }).catch((error) => {
      console.warn(`[biometric-data] SN=${sn} error in batch processing:`, error);
    });
  }

  // Summary logging for user operations
  if (userCount > 0 || duplicateCount > 0) {
    const userMap = ensureUserMap(sn, usersByDevice);
    const totalUsers = userMap ? userMap.size : 0;
    console.warn(
      `[user-summary] SN=${sn} added=${userCount} duplicates_skipped=${duplicateCount} total_users=${totalUsers}`,
    );
  }

  const st = deviceState.get(sn) || {};
  st.lastSeenAt = new Date().toISOString();
  deviceState.set(sn, st);

  console.warn(`cdata SN=${sn} parsed_items=${allParsedItems.length} raw_lines=${rawLines.length}`);
  return c.json('OK', 200);
};

export const connectionTest: AppRouteHandler<ConnectionTestRoute> = async (c: any) => {
  const sn = c.req.valid('query').SN || c.req.valid('query').sn || '';

  console.warn(`*** CONNECTION TEST *** SN=${sn} device testing connectivity`);

  const state = deviceState.get(sn) || {};
  state.lastSeenAt = new Date().toISOString();
  state.connectionTestAt = new Date().toISOString();
  deviceState.set(sn, state);

  const response = {
    ok: true,
    state,
  };

  // Return a simple response that ZKTeco devices expect
  return c.json(response);
};

export const iclockRoot: AppRouteHandler<IclockRootRoute> = async (c: any) => {
  const sn = c.req.valid('query').SN || c.req.valid('query').sn || '';

  console.warn(`*** ICLOCK ROOT *** SN=${sn} device checking root endpoint`);

  const state = deviceState.get(sn) || {};
  state.lastSeenAt = new Date().toISOString();
  deviceState.set(sn, state);

  // Return response indicating server is ready
  return c.text('OK');
};

export const deviceHealth: AppRouteHandler<DeviceHealthRoute> = async (c: any) => {
  // Process users with proper async handling
  const { sn } = c.req.valid('query');

  const deviceIdentifier = sn;
  // const deviceEntries = Array.from(deviceState.entries());

  // Check if specific device identifier exists when provided
  if (deviceIdentifier && !deviceState.has(deviceIdentifier)) {
    return c.json({
      ok: false,
      error: `Device with SN '${deviceIdentifier}' not found`,
      availableDevices: Array.from(deviceState.keys()),
    }, 404);
  }

  // Debug: Log current usersByDevice state
  console.warn('[health] Current usersByDevice map:');
  for (const [sn, umap] of usersByDevice.entries()) {
    console.warn(`  SN=${sn} users=${umap.size} pins=[${Array.from(umap.keys()).join(', ')}]`);
  }

  const devices = deviceIdentifier
    ? (() => {
        const deviceEntry = Array.from(deviceState.entries()).find(([sn]) => sn === deviceIdentifier);
        return deviceEntry
          ? {
              sn: deviceEntry[0],
              lastStamp: deviceEntry[1].lastStamp,
              lastSeenAt: deviceEntry[1].lastSeenAt,
              lastUserSyncAt: deviceEntry[1].lastUserSyncAt,
            }
          : null;
      })()
    : Array.from(deviceState.entries()).map(([sn, s]) => ({
        sn,
        lastStamp: s.lastStamp,
        lastSeenAt: s.lastSeenAt,
        lastUserSyncAt: s.lastUserSyncAt,
      }));

  //   deviceIdentifier
  // ? (Array.from(deviceState.entries()).map(([sn, s]) => ({
  //     sn,
  //     lastStamp: s.lastStamp,
  //     lastSeenAt: s.lastSeenAt,
  //     lastUserSyncAt: s.lastUserSyncAt,
  //   })).filter(d => d.sn === deviceIdentifier))
  // : (Array.from(deviceState.entries()).map(([sn, s]) => ({
  //     sn,
  //     lastStamp: s.lastStamp,
  //     lastSeenAt: s.lastSeenAt,
  //     lastUserSyncAt: s.lastUserSyncAt,
  //   }))
  //   );

  const response = {
    ok: true,
    devices,
    pullMode: env.PULL_MODE,
    commandSyntax,
  };

  return c.json(response);
};

export const addBulkUsers: AppRouteHandler<AddBulkUsersRoute> = async (c: any) => {
  const sn = c.req.query('sn') || c.req.query('SN');
  if (!sn)
    return c.json({ error: 'sn is required' });

  // Ensure users are fetched before bulk operations
  await ensureUsersFetched(sn, usersByDevice, commandQueue);

  const body = await c.req.json();
  const {
    users, // array of user objects: [{ pin?: '123', name: 'Anik2', card?: '123', privilege?: 0, department?: '', password?: '', group?: '' }]
    startPin, // optional: starting PIN number (default: auto-detect next available)
    pinKey, // override PIN field label (e.g. Badgenumber, EnrollNumber)
    style, // 'spaces' to use spaces instead of tabs
    optimistic = true, // whether to apply optimistic caching
  } = body || {};

  if (!Array.isArray(users) || users.length === 0) {
    return c.json({ error: 'users array is required and must not be empty' });
  }

  const clean = (v: any) =>
    String(v ?? '')
      .replace(/[\r\n]/g, ' ')
      .trim();

  function join(parts: string[]) {
    return style === 'spaces' ? parts.join(' ') : parts.join('\t');
  }

  const autoKey = devicePinKey.get(sn);
  const pinLabel = (pinKey || autoKey || 'PIN').trim();
  const q = ensureQueue(sn, commandQueue);
  const umap = ensureUserMap(sn, usersByDevice);
  const nowIso = new Date().toISOString();

  let currentPin = await getNextAvailablePin(sn, startPin, usersByDevice);
  const commands = [];
  const processedUsers = [];
  const errors = [];

  console.warn(
    `[bulk-add-users] SN=${sn} starting bulk insert of ${users.length} users, starting from PIN ${currentPin}`,
  );

  for (let i = 0; i < users.length; i++) {
    const user = users[i];

    try {
      // Validate required fields
      if (!user.name || !clean(user.name)) {
        errors.push({ index: i, error: 'name is required', user });
        continue;
      }

      // Use provided PIN or auto-generate
      const pinVal = user.pin ? clean(user.pin) : String(currentPin);

      // Check if PIN already exists
      if (umap && umap.has(pinVal)) {
        errors.push({ index: i, error: `PIN ${pinVal} already exists`, user });
        continue;
      }

      const nameVal = clean(user.name);
      const cardVal = clean(user.card || '');
      const priVal = Number(user.privilege ?? 0);
      const deptVal = clean(user.department || '');
      const pwdVal = clean(user.password || '');
      const grpVal = clean(user.group || '');

      // Build command parts
      const baseParts = [`${pinLabel}=${pinVal}`];
      if (nameVal)
        baseParts.push(`Name=${nameVal}`);
      baseParts.push(`Privilege=${priVal}`);
      if (cardVal)
        baseParts.push(`Card=${cardVal}`);
      if (deptVal)
        baseParts.push(`Dept=${deptVal}`);
      if (pwdVal)
        baseParts.push(`Passwd=${pwdVal}`);
      if (grpVal)
        baseParts.push(`Grp=${grpVal}`);

      const command = `C:${i + 1}:DATA UPDATE USERINFO ${join(baseParts)}`;
      commands.push(command);

      console.warn(`[bulk-add-users] SN=${sn} queued command for user index ${i}: ${command}`);

      // Optimistic cache update
      if (optimistic && umap) {
        umap.set(pinVal, {
          pin: pinVal,
          name: nameVal,
          card: cardVal,
          privilege: String(priVal),
          department: deptVal,
          password: pwdVal ? '****' : undefined,
          group: grpVal || undefined,
          updatedLocallyAt: nowIso,
          createdAt: nowIso,
          optimistic: true,
        });
      }

      processedUsers.push({
        index: i,
        pin: pinVal,
        name: nameVal,
        command,
      });

      // Increment PIN for next user (if auto-generating)
      if (!user.pin) {
        currentPin++;
      }
    }
    catch (error) {
      const errorMsg = typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: string }).message)
        : String(error);
      errors.push({ index: i, error: errorMsg, user });
    }
  }

  // Queue all commands
  if (q) {
    commands.forEach(cmd => q.push(cmd));
  }

  // Deduplicate queue
  const seen = new Set();
  const queueArray = [...(q ?? [])];
  if (q) {
    q.length = 0; // Clear queue

    for (const cmd of queueArray) {
      if (!seen.has(cmd)) {
        seen.add(cmd);
        q.push(cmd);
      }
    }
  }

  console.warn(
    `[bulk-add-users] SN=${sn} queued ${commands.length} commands for ${processedUsers.length} users`,
  );

  // Clear the usersByDevice cache to force refresh from device
  usersByDevice.delete(sn);

  await ensureUsersFetched(sn, usersByDevice, commandQueue);

  return c.json({
    ok: true,
    sn,
    processed: processedUsers.length,
    errorCount: errors.length,
    totalRequested: users.length,
    commands: commands.length,
    queueSize: q?.length ?? 0,
    processedUsers,
    errors,
    nextAvailablePin: currentPin,
    pinLabelUsed: pinLabel,
    optimisticApplied: optimistic,
    note: 'Users will be created with auto-generated PINs starting from the next available PIN number. Check /api/users to verify creation.',
  });
};

export const customCommand: AppRouteHandler<CustomCommandRoute> = async (c: any) => {
  const sn = c.req.query('sn') || c.req.query('SN');
  if (!sn)
    return c.json({ error: 'sn is required' }, 400);

  const body = await c.req.json();
  const { command } = body || {};
  if (!command)
    return c.json({ error: 'command is required' }, 400);

  let cmd = String(command).trim();
  if (!cmd.startsWith('C:'))
    cmd = `${cmd}`;
  const q = ensureQueue(sn, commandQueue);
  if (q) {
    q.push(cmd);
    console.warn(`[custom-command] SN=${sn} queued:\n  > ${cmd}`);
    return c.json({ ok: true, enqueued: [cmd], queueSize: q.length });
  }
  else {
    console.warn(`[custom-command] SN=${sn} failed to queue command: queue not found`);
    return c.json({ error: 'Failed to enqueue command: queue not found' }, 500);
  }
};

// Legacy iClock protocol handlers
export const getRequest_legacy: AppRouteHandler<GetRequestLegacyRoute> = async (c: any) => {
  const sn = c.req.valid('query').SN || c.req.valid('query').sn || '';
  const state = deviceState.get(sn) || {};
  state.lastSeenAt = new Date().toISOString();

  deviceState.set(sn, state);

  console.warn(`[getrequest-legacy] SN=${sn} device polling for commands`);

  const userMap = ensureUserMap(sn, usersByDevice);

  // Fetch users at least once on first poll, or whenever user count is 0
  const hasInitialFetch = initialUserFetchDone.get(sn);
  if (!hasInitialFetch || (userMap && userMap.size < 1)) {
    await ensureUsersFetched(sn, usersByDevice, commandQueue);
    initialUserFetchDone.set(sn, true);
    console.warn(`[getrequest-legacy] SN=${sn} triggered user fetch (initial=${!hasInitialFetch}, count=${userMap?.size})`);
  }

  console.warn(`[getrequest-legacy] SN=${sn} current users: ${userMap?.size}`);

  const queue = ensureQueue(sn, commandQueue);

  if (queue?.length) {
    const sep = env.USE_CRLF === '1' ? '\r\n' : '\n';
    const cmds = [...queue]; // Create a copy of the commands
    queue.length = 0; // Clear the queue immediately after copying

    // Ensure all commands are strings
    const stringCmds = cmds.map((c) => {
      if (typeof c === 'string')
        return c;
      console.warn(`[getrequest-legacy] SN=${sn} converting non-string command:`, { type: typeof c, value: c });
      return String(c);
    });

    const body = stringCmds.join(sep) + sep;
    console.warn(`[getrequest-legacy] SN=${sn} sending ${stringCmds.length} cmd(s), queue cleared: ${body.trim()}`);

    // Record commands
    const remote = (c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip') || 'unknown');
    const justIds: string[] = [];
    const ensureSentList = (sn: string) => {
      if (!sentCommands.has(sn))
        sentCommands.set(sn, []);
      return sentCommands.get(sn) ?? [];
    };

    stringCmds.forEach((c: string) => {
      recordSentCommand(sn, c, remote, sentCommands, ensureSentList);
      const list = sentCommands.get(sn);
      if (list)
        justIds.push(list[list.length - 1].id);
    });

    const bytes = Buffer.byteLength(body, 'utf8');
    markDelivered(sn, justIds, bytes, sentCommands);
    recordPoll(sn, remote, queue.length + stringCmds.length, stringCmds.length, new Map());
    markStaleCommands(sn, sentCommands);
    return c.text(body);
  }

  if (env.PULL_MODE === '1' || env.PULL_MODE === 'true') {
    // const cmd = buildFetchCommand(sn, 24, commandSyntax, deviceState);
    // const sep = env.USE_CRLF === '1' ? '\r\n' : '\n';
    // console.warn(`[getrequest-legacy] SN=${sn} auto cmd: ${cmd}`);
    // recordPoll(sn, (c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip') || 'unknown'), (queue?.length ?? 0), 0, new Map());
    return c.text('ok');
  }

  // Always send a command to request data from device even if PULL_MODE is off
  // const cmd = buildFetchCommand(sn, 24, commandSyntax, deviceState);
  // const sep = env.USE_CRLF === '1' ? '\r\n' : '\n';
  // console.warn(`[getrequest-legacy] SN=${sn} sending auto cmd: ${cmd}`);
  // recordPoll(sn, (c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip') || 'unknown'), (queue?.length ?? 0), 0, new Map());
  return c.text('ok');
};

export const deviceCmd: AppRouteHandler<DeviceCmdRoute> = async (c: any) => {
  const query = c.req.valid('query') || {};
  const sn = query.SN || query.sn || '';
  const info = query.INFO || query.info || '';
  const cmds = query.cmds || ''; // Command IDs that were executed
  const body = await c.req.text();

  console.warn(`[devicecmd] SN=${sn} INFO=${info} cmds=${cmds}`);
  if (body) {
    console.warn(`[devicecmd] SN=${sn} body: ${body}`);
  }

  // Handle executed command confirmations
  if (cmds) {
    const cmdIds = cmds.split(',').map((id: string) => id.trim()).filter(Boolean);

    if (cmdIds.length > 0) {
      const sentCmds = sentCommands.get(sn) || [];
      let executedCount = 0;

      cmdIds.forEach((cmdId: string) => {
        const cmd = sentCmds.find((c: any) => c.id === cmdId);
        if (cmd && !cmd.executedAt) {
          cmd.executedAt = new Date().toISOString();
          cmd.status = 'executed';
          executedCount++;
        }
      });

      console.warn(`[devicecmd] SN=${sn} marked ${executedCount}/${cmdIds.length} commands as executed`);

      // Clean up old executed commands (keep only last 50 executed commands per device)
      const executedCommands = sentCmds.filter((c: any) => c.executedAt);
      if (executedCommands.length > 50) {
        executedCommands.sort((a: any, b: any) =>
          new Date(a.executedAt).getTime() - new Date(b.executedAt).getTime(),
        );

        const toRemove = executedCommands.slice(0, executedCommands.length - 50);
        toRemove.forEach((oldCmd: any) => {
          const index = sentCmds.findIndex((c: any) => c.id === oldCmd.id);
          if (index >= 0) {
            sentCmds.splice(index, 1);
          }
        });

        console.warn(`[devicecmd] SN=${sn} cleaned up ${toRemove.length} old executed commands`);
      }
    }
  }

  // Handle status reports like "1"
  if (info.match(/^\d+$/)) {
    console.warn(`[devicecmd] SN=${sn} status report: ${info}`);
    return c.text('OK');
  }

  // Handle heartbeat/ping commands
  const state = deviceState.get(sn) || {};
  state.lastSeenAt = new Date().toISOString();

  // Parse INFO data and update device state
  if (info.includes('~')) {
    const [stamp, users, fp, logs, oplog, photoCount] = info.split('~');
    state.stamp = stamp;
    state.users = users;
    state.fingerprints = fp;
    state.logs = logs;
    state.oplog = oplog;
    state.photoCount = photoCount;
    console.warn(`[devicecmd] SN=${sn} updated state:`, state);
  }

  deviceState.set(sn, state);

  const queue = ensureQueue(sn, commandQueue);

  if (queue?.length) {
    const sep = env.USE_CRLF === '1' ? '\r\n' : '\n';
    const cmds = [...queue]; // Create a copy of the commands
    queue.length = 0; // Clear the queue immediately after copying

    // Ensure all commands are strings
    const stringCmds = cmds.map((c) => {
      if (typeof c === 'string')
        return c;
      console.warn(`[devicecmd] SN=${sn} converting non-string command:`, { type: typeof c, value: c });
      return String(c);
    });

    const body = stringCmds.join(sep) + sep;
    console.warn(`[devicecmd] SN=${sn} sending ${stringCmds.length} cmd(s), queue cleared: ${body.trim()}`);

    // Record commands
    const remote = (c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip') || 'unknown');
    const justIds: string[] = [];
    const ensureSentList = (sn: string) => {
      if (!sentCommands.has(sn))
        sentCommands.set(sn, []);
      return sentCommands.get(sn) ?? [];
    };

    stringCmds.forEach((c: string) => {
      recordSentCommand(sn, c, remote, sentCommands, ensureSentList);
      const list = sentCommands.get(sn);
      if (list)
        justIds.push(list[list.length - 1].id);
    });

    const bytes = Buffer.byteLength(body, 'utf8');
    markDelivered(sn, justIds, bytes, sentCommands);
    recordPoll(sn, remote, queue.length + stringCmds.length, stringCmds.length, new Map());
    markStaleCommands(sn, sentCommands);
    return c.text(body);
  }

  console.warn(`[devicecmd] SN=${sn} idle (no commands, pullMode=${env.PULL_MODE})`);
  recordPoll(sn, (c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip') || 'unknown'), (queue?.length ?? 0), 0, new Map());
  return c.text('OK');
};

// Route handler to clear command queue for a device
export const clearCommandQueue: AppRouteHandler<ClearCommandQueueRoute> = async (c: any) => {
  const sn = c.req.query('sn') || c.req.query('SN');

  if (!sn) {
    return c.json({ error: 'sn is required' }, 400);
  }

  const queue = commandQueue.get(sn);
  const queueLength = queue ? queue.length : 0;

  if (queue) {
    queue.length = 0; // Clear the queue
  }

  // Also clear sent commands for this device
  const sentCmds = sentCommands.get(sn);
  const sentCount = sentCmds ? sentCmds.length : 0;

  if (sentCmds) {
    sentCmds.length = 0; // Clear sent commands tracking
  }

  console.warn(`[clear-queue] SN=${sn} cleared ${queueLength} queued commands and ${sentCount} sent commands`);

  return c.json({
    ok: true,
    sn,
    clearedQueuedCommands: queueLength,
    clearedSentCommands: sentCount,
    message: `Cleared ${queueLength} queued commands and ${sentCount} sent commands for device ${sn}`,
  });
};

// Route handler to refresh users from device
export const refreshUsers: AppRouteHandler<RefreshUsersRoute> = async (c: any) => {
  const sn = c.req.query('sn') || c.req.query('SN');

  if (!sn) {
    return c.json({ error: 'sn is required' }, 400);
  }

  // Clear user cache to force fresh fetch
  usersByDevice.delete(sn);

  // Ensure users are fetched from device
  await ensureUsersFetched(sn, usersByDevice, commandQueue);

  const umap = ensureUserMap(sn, usersByDevice);
  const userCount = umap?.size ?? 0;

  console.warn(`[refresh-users] SN=${sn} initiated user refresh, queued fetch command. Current cached users: ${userCount}`);

  return c.json({
    ok: true,
    sn,
    message: `User refresh initiated for device ${sn}`,
    currentCachedUsers: userCount,
    note: 'QUERY USERINFO command has been queued. Users will be refreshed when device next polls for commands.',
  });
};

// Handler to get queue status
export const getQueueStatus: AppRouteHandler<GetQueueStatusRoute> = async (c: any) => {
  const sn = c.req.query('sn') || c.req.query('SN');

  if (sn) {
    // Get status for specific device
    const queue = ensureQueue(sn, commandQueue);
    const sentList = sentCommands.get(sn) || [];

    return c.json({
      ok: true,
      sn,
      queueLength: queue?.length ?? 0,
      pendingCommands: queue || [],
      sentCommands: sentList.slice(-10), // Last 10 sent commands
      lastSeen: deviceState.get(sn)?.lastSeenAt || null,
    });
  }
  else {
    // Get status for all devices
    const allQueues = Array.from(commandQueue.entries()).map(([deviceSn, queue]) => ({
      sn: deviceSn,
      queueLength: queue.length,
      pendingCommands: queue.slice(0, 5), // First 5 commands
      lastSeen: deviceState.get(deviceSn)?.lastSeenAt || null,
    }));

    return c.json({
      ok: true,
      devices: allQueues,
      totalDevices: allQueues.length,
      totalQueuedCommands: allQueues.reduce((sum, d) => sum + d.queueLength, 0),
    });
  }
};

// Handler to delete a user from ZKTeco device(s)
export const deleteUser: AppRouteHandler<DeleteUserRoute> = async (c: any) => {
  const sn = c.req.query('sn') || c.req.query('SN');
  const pin = c.req.query('pin') || c.req.query('PIN');

  if (!pin) {
    return c.json({ error: 'PIN is required' }, 400);
  }

  try {
    const result = await deleteUserFromDevice(pin, commandQueue, usersByDevice, sn);

    if (result.success) {
      return c.json({
        ok: true,
        message: `User with PIN ${pin} deletion command queued successfully`,
        ...result,
      });
    }
    else {
      return c.json({
        ok: false,
        error: result.error,
        ...result,
      }, 400);
    }
  }
  catch (error) {
    console.error('[delete-user-handler] Error:', error);
    return c.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }, 500);
  }
};

export const syncAttendanceLogs: AppRouteHandler<SyncAttendanceLogsRoute> = async (c: any) => {
  const sn = c.req.query('sn') || c.req.query('SN');

  if (!sn) {
    return c.json({ error: 'sn is required' }, 400);
  }

  // Queue command to fetch attendance logs
  const q = ensureQueue(sn, commandQueue);
  const fetchCmd = 'C:1:DATA QUERY ATTLOG';
  q?.push(fetchCmd);

  console.warn(`[sync-attendance-logs] SN=${sn} queued command to fetch attendance logs`);

  return c.json({
    ok: true,
    sn,
    message: `Attendance log sync command queued for device ${sn}`,
    queuedCommand: fetchCmd,
    note: 'Attendance logs will be fetched when device next polls for commands.',
  });
};

export const syncEmployees: AppRouteHandler<SyncEmployeesRoute> = async (c: any) => {
  const { sn } = c.req.valid('query');
  const { dryRun = false, employee_uuids } = c.req.valid('json');

  try {
    // Import the database and schemas here to avoid circular dependencies
    const db = (await import('@/db')).default;
    const { employee, users } = await import('@/routes/hr/schema');
    const { addUserToDevice } = await import('./functions');

    // Get all active employees from HR database
    const employeesQuery = db
      .select({
        uuid: employee.uuid,
        name: users.name,
        email: users.email,
        id: employee.id,
      })
      .from(employee)
      .leftJoin(
        users,
        eq(employee.user_uuid, users.uuid),
      );

    // Filter by specific employee UUIDs if provided
    let employees;
    if (Array.isArray(employee_uuids) && employee_uuids.length > 0) {
      employees = await employeesQuery.where(inArray(employee.uuid, employee_uuids));
    }
    else {
      employees = await employeesQuery;
    }

    if (employees.length === 0) {
      return c.json({
        ok: false,
        message: 'No employees found in HR database',
        syncResults: {
          totalEmployees: 0,
          devicesProcessed: 0,
          usersAdded: 0,
          usersSkipped: 0,
          errors: 0,
          details: [],
        },
      });
    }

    const targetDevices = sn ? [sn] : Array.from(commandQueue.keys());

    if (targetDevices.length === 0) {
      return c.json({
        ok: false,
        message: 'No ZKTeco devices found or connected',
        syncResults: {
          totalEmployees: employees.length,
          devicesProcessed: 0,
          usersAdded: 0,
          usersSkipped: 0,
          errors: 0,
          details: [],
        },
      }, 400);
    }

    const syncDetails = [];
    let totalAdded = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    // Get the starting PIN from the function
    let currentPin = await getNextAvailablePin(sn || targetDevices[0], String(usersByDevice.size), usersByDevice);

    for (const employeeInd of employees) {
      // Use getNextAvailablePin function instead of employee.pin
      const pin = String(currentPin);
      const name = employeeInd.name;

      if (!pin || !name) {
        syncDetails.push({
          employee: { pin, name, email: employeeInd.email },
          action: 'error',
          devices: [],
          success: false,
          error: 'Missing PIN or name',
        });
        totalErrors++;
        continue;
      }

      try {
        // Check if user already exists on any device with the same name
        let userExistsWithSameName = false;
        const devicesWithUser = [];

        for (const deviceSn of targetDevices) {
          const umap = ensureUserMap(deviceSn, usersByDevice);

          // Check if user with same name already exists (regardless of PIN)
          const existingUserWithSameName = Array.from(umap?.values() || []).find(user => user.name === name);

          if (existingUserWithSameName) {
            userExistsWithSameName = true;
            devicesWithUser.push(deviceSn);
          }
        }

        if (userExistsWithSameName) {
          syncDetails.push({
            employee: { pin, name, email: employeeInd.email },
            action: 'skipped',
            devices: devicesWithUser,
            success: true,
            error: 'user with same name already exists',
          });
          totalSkipped++;
          // Don't increment PIN for skipped users
          continue;
        }

        // Add user to devices (if not dry run)
        if (!dryRun) {
          const result = await addUserToDevice(pin, name, commandQueue, usersByDevice, sn);

          if (result.success) {
            // Update employee's pin field in database with the assigned device PIN
            try {
              await db
                .update(employee)
                .set({ pin })
                .where(eq(employee.uuid, employeeInd.uuid)); // Use original employee.id as the ID to find the record

              console.warn(`[sync-employees] Updated employee ID ${employeeInd.id} with device PIN ${pin}`);
            }
            catch (dbError) {
              console.error(`[sync-employees] Failed to update employee PIN in database:`, dbError);
              // Don't fail the sync operation for database update errors
            }

            syncDetails.push({
              employee: { pin, name, email: employeeInd.email },
              action: 'added',
              devices: targetDevices,
              success: true,
              error: undefined,
            });
            totalAdded++;
            // Increment PIN for next user
            currentPin++;
          }
          else {
            syncDetails.push({
              employee: { pin, name, email: employeeInd.email },
              action: 'error',
              devices: targetDevices,
              success: false,
              error: result.error,
            });
            totalErrors++;
            // Don't increment PIN for failed users
          }
        }
        else {
          // Dry run - just mark as would be added
          syncDetails.push({
            employee: { pin, name, email: employeeInd.email },
            action: 'would_add',
            devices: targetDevices,
            success: true,
            error: undefined,
          });
          totalAdded++;
          // Increment PIN for next user even in dry run
          currentPin++;
        }
      }
      catch (error) {
        syncDetails.push({
          employee: { pin, name, email: employeeInd.email },
          action: 'error',
          devices: [],
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        totalErrors++;
        // Don't increment PIN for error cases
      }
    }

    const message = dryRun
      ? `Dry run completed: ${totalAdded} employees would be added, ${totalSkipped} skipped, ${totalErrors} errors`
      : `Employee sync completed: ${totalAdded} employees added, ${totalSkipped} skipped, ${totalErrors} errors`;

    console.warn(`[sync-employees] ${message} across ${targetDevices.length} devices`);

    return c.json({
      ok: true,
      message,
      syncResults: {
        totalEmployees: employees.length,
        devicesProcessed: targetDevices.length,
        usersAdded: totalAdded,
        usersSkipped: totalSkipped,
        errors: totalErrors,
        details: syncDetails,
      },
    });
  }
  catch (error) {
    console.error('[sync-employees] Error:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to sync employees',
    }, 500);
  }
};

export const addTemporaryUserHandler: AppRouteHandler<AddTemporaryUserRoute> = async (c: any) => {
  const { sn } = c.req.valid('query');
  const { pin, name, start_date, end_date, privilege = '0', password = '', cardno = '', timeZone = '1' } = c.req.valid('json');

  try {
    // Validate and convert date strings to Date objects
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    // Check if dates are valid
    if (Number.isNaN(startDate.getTime())) {
      return c.json({
        success: false,
        error: 'Invalid start_date format. Expected ISO 8601 format (e.g., 2024-01-01T10:00:00Z)',
      }, 400);
    }

    if (Number.isNaN(endDate.getTime())) {
      return c.json({
        success: false,
        error: 'Invalid end_date format. Expected ISO 8601 format (e.g., 2024-01-01T18:00:00Z)',
      }, 400);
    }

    if (endDate <= startDate) {
      return c.json({
        success: false,
        error: 'End date must be greater than start date',
      }, 400);
    }

    const { addTemporaryUserToDevice } = await import('./functions');

    const result = await addTemporaryUserToDevice(
      pin || '', // Pass empty string if pin is undefined, function will handle it
      name,
      commandQueue,
      usersByDevice,
      startDate,
      endDate,
      sn,
      privilege,
      password,
      cardno,
      timeZone,
    );

    if (result.success) {
      return c.json(result, 200);
    }
    else {
      return c.json(result, 400);
    }
  }
  catch (error) {
    console.error('[add-temp-user-handler] Error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add temporary user',
    }, 500);
  }
};

export const cancelTemporaryAccessHandler: AppRouteHandler<CancelTemporaryAccessRoute> = async (c: any) => {
  const { sn, pin } = c.req.valid('query');

  try {
    const { cancelTemporaryAccess } = await import('./functions');

    const result = await cancelTemporaryAccess(pin, commandQueue, usersByDevice, sn);

    if (result.success) {
      return c.json(result);
    }
    else {
      return c.json(result, 400);
    }
  }
  catch (error) {
    console.error('[cancel-temp-access-handler] Error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel temporary access',
    }, 500);
  }
};

export const getTemporaryUsersHandler: AppRouteHandler<GetTemporaryUsersRoute> = async (c: any) => {
  try {
    const { getTemporaryUsers } = await import('./functions');

    const temporaryUsers = getTemporaryUsers();

    return c.json({
      success: true,
      temporaryUsers,
      totalCount: temporaryUsers.length,
    });
  }
  catch (error) {
    console.error('[get-temp-users-handler] Error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get temporary users',
      temporaryUsers: [],
      totalCount: 0,
    }, 500);
  }
};

export const employeeBiometricSyncFromDeviceToBackend: AppRouteHandler<EmployeeBiometricSyncFromDeviceToBackendRoute> = async (c: any) => {
  const { sn } = c.req.valid('query');

  try {
    const targetDevices = sn ? [sn] : Array.from(commandQueue.keys());

    if (targetDevices.length === 0) {
      return c.json({
        ok: false,
        message: 'No ZKTeco devices found or connected',
        syncResults: {
          totalDevices: 0,
          devicesProcessed: 0,
          biometricsReceived: 0,
          biometricsSaved: 0,
          errors: 0,
          details: [],
        },
      }, 400);
    }

    const syncDetails = [];
    let totalErrors = 0;

    for (const deviceSn of targetDevices) {
      try {
        // Queue commands to fetch biometric data from device
        const q = ensureQueue(deviceSn, commandQueue);

        // Command to fetch fingerprint templates
        const fetchBioCmd = 'C:1:DATA QUERY BIODATA';
        q?.push(fetchBioCmd);

        console.warn(`[device-biometric-sync] SN=${deviceSn} queued command to fetch biometric data: ${fetchBioCmd}`);

        // Get existing users for this device to match biometrics
        const umap = ensureUserMap(deviceSn, usersByDevice);
        const deviceUsers = Array.from(umap?.values() || []);

        syncDetails.push({
          device: deviceSn,
          action: 'fetch_queued',
          success: true,
          message: `Biometric fetch command queued for device ${deviceSn}`,
          usersOnDevice: deviceUsers.length,
          error: undefined,
        });

        // Note: The actual biometric data will be received when the device responds
        // and will be processed by the insertBiometricData function in the post route
      }
      catch (deviceError) {
        syncDetails.push({
          device: deviceSn,
          action: 'error',
          success: false,
          message: `Failed to queue biometric fetch for device ${deviceSn}`,
          error: deviceError instanceof Error ? deviceError.message : 'Unknown device error',
        });
        totalErrors++;
      }
    }

    // For immediate response, we can only report that fetch commands were queued
    // The actual biometric data will be processed asynchronously when devices respond
    const message = `Biometric fetch commands queued for ${targetDevices.length - totalErrors} devices. Biometric data will be automatically saved to backend when devices respond.`;

    console.warn(`[device-biometric-sync] ${message}`);

    return c.json({
      ok: true,
      message,
      syncResults: {
        totalDevices: targetDevices.length,
        devicesProcessed: targetDevices.length - totalErrors,
        commandsQueued: targetDevices.length - totalErrors,
        errors: totalErrors,
        details: syncDetails,
      },
      note: 'Biometric data will be automatically processed and saved when devices respond to the fetch commands. Monitor the post endpoint logs for actual biometric data processing.',
    });
  }
  catch (error) {
    console.error('[device-biometric-sync] Error:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to queue biometric fetch commands',
    }, 500);
  }
};

export const employeeBiometricSyncFromBackendToDevice: AppRouteHandler<EmployeeBiometricSyncFromBackendToDeviceRoute> = async (c: any) => {
  const { sn } = c.req.valid('query');

  try {
    // Import the database and schemas to avoid circular dependencies
    const db = (await import('@/db')).default;
    const { employee, employee_biometric } = await import('@/routes/hr/schema');

    const targetDevices = sn ? [sn] : Array.from(commandQueue.keys());

    if (targetDevices.length === 0) {
      return c.json({
        ok: false,
        message: 'No ZKTeco devices found or connected',
        syncResults: {
          totalDevices: 0,
          devicesProcessed: 0,
          biometricsSent: 0,
          biometricsSkipped: 0,
          errors: 0,
          details: [],
        },
      }, 400);
    }

    // Get all employee biometric data from backend
    const biometricData = await db
      .select({
        employeeId: employee.id,
        employeePin: employee.pin,
        biometricType: employee_biometric.biometric_type,
        fingerIndex: employee_biometric.finger_index,
        template: employee_biometric.template,
        createdAt: employee_biometric.created_at,
      })
      .from(employee_biometric)
      .leftJoin(employee, eq(employee_biometric.employee_uuid, employee.uuid));

    if (biometricData.length === 0) {
      return c.json({
        ok: false,
        message: 'No biometric data found in backend database',
        syncResults: {
          totalDevices: targetDevices.length,
          devicesProcessed: 0,
          biometricsSent: 0,
          biometricsSkipped: 0,
          errors: 0,
          details: [],
        },
      });
    }

    console.warn(`[backend-biometric-sync] Found ${biometricData.length} biometric records to sync`);

    const syncDetails = [];
    let totalSent = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const deviceSn of targetDevices) {
      try {
        const q = ensureQueue(deviceSn, commandQueue);
        const umap = ensureUserMap(deviceSn, usersByDevice);

        if (!q) {
          syncDetails.push({
            device: deviceSn,
            action: 'error',
            success: false,
            message: `No command queue found for device ${deviceSn}`,
            biometricsSent: 0,
            biometricsSkipped: 0,
            error: 'Queue not initialized',
          });
          totalErrors++;
          continue;
        }

        let deviceSent = 0;
        let deviceSkipped = 0;
        let deviceErrors = 0;

        // Process biometric data for this device
        for (const bioRecord of biometricData) {
          try {
            // Check if employee exists on this device by PIN
            const deviceUser = Array.from(umap?.values() || []).find(user =>
              user.pin === bioRecord.employeePin || user.pin === String(bioRecord.employeePin),
            );

            if (!deviceUser) {
              console.warn(`[backend-biometric-sync] Employee PIN ${bioRecord.employeePin} not found on device ${deviceSn}, skipping biometric`);
              deviceSkipped++;
              continue;
            }

            // Validate required data
            if (!bioRecord.template || !bioRecord.biometricType) {
              console.warn(`[backend-biometric-sync] Missing template data or biometric type for employee ${bioRecord.employeePin}, skipping`);
              deviceSkipped++;
              continue;
            }

            // Build biometric upload command based on type
            let uploadCmd = '';

            if (bioRecord.biometricType === 'fingerprint') {
              // Command format for fingerprint template: C:ID:DATA UPDATE BIOPHOTO PIN=1 FID=1 Size=XXX Valid=1 TMP=<base64_template>
              const fingerIndex = bioRecord.fingerIndex || 1;
              const templateSize = bioRecord.template.length;

              uploadCmd = `C:${deviceSent + 1}:DATA UPDATE BIOPHOTO PIN=${deviceUser.pin} FID=${fingerIndex} Size=${templateSize} Valid=1 TMP=${bioRecord.template}`;
            }
            else if (bioRecord.biometricType === 'face') {
              // Command format for face template: C:ID:DATA UPDATE USERPIC PIN=1 Content=<base64_image>
              uploadCmd = `C:${deviceSent + 1}:DATA UPDATE USERPIC PIN=${deviceUser.pin} Content=${bioRecord.template}`;
            }
            else {
              console.warn(`[backend-biometric-sync] Unsupported biometric type: ${bioRecord.biometricType}, skipping`);
              deviceSkipped++;
              continue;
            }

            // Queue the command
            q.push(uploadCmd);
            deviceSent++;

            console.warn(`[backend-biometric-sync] SN=${deviceSn} queued biometric upload for employee PIN ${deviceUser.pin}, type: ${bioRecord.biometricType}, finger: ${bioRecord.fingerIndex}`);
          }
          catch (bioError) {
            console.error(`[backend-biometric-sync] Error processing biometric for employee ${bioRecord.employeePin}:`, bioError);
            deviceErrors++;
          }
        }

        syncDetails.push({
          device: deviceSn,
          action: 'commands_queued',
          success: true,
          message: `Biometric upload commands queued for device ${deviceSn}`,
          biometricsSent: deviceSent,
          biometricsSkipped: deviceSkipped,
          biometricErrors: deviceErrors,
          error: undefined,
        });

        totalSent += deviceSent;
        totalSkipped += deviceSkipped;
        totalErrors += deviceErrors;
      }
      catch (deviceError) {
        syncDetails.push({
          device: deviceSn,
          action: 'error',
          success: false,
          message: `Failed to process biometric sync for device ${deviceSn}`,
          biometricsSent: 0,
          biometricsSkipped: 0,
          error: deviceError instanceof Error ? deviceError.message : 'Unknown device error',
        });
        totalErrors++;
      }
    }

    const message = `Biometric upload commands queued: ${totalSent} biometrics sent, ${totalSkipped} skipped, ${totalErrors} errors across ${targetDevices.length} devices`;

    console.warn(`[backend-biometric-sync] ${message}`);

    return c.json({
      ok: true,
      message,
      syncResults: {
        totalDevices: targetDevices.length,
        devicesProcessed: targetDevices.length,
        totalBiometricsInBackend: biometricData.length,
        biometricsSent: totalSent,
        biometricsSkipped: totalSkipped,
        errors: totalErrors,
        details: syncDetails,
      },
      note: 'Biometric upload commands have been queued. Templates will be uploaded to devices when they next poll for commands.',
    });
  }
  catch (error) {
    console.error('[backend-biometric-sync] Error:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to sync biometrics from backend to device',
    }, 500);
  }
};

export const getRequest: AppRouteHandler<GetRequestRoute> = async (c: any) => {
  console.log('[getrequest] Handler not yet implemented'); // eslint-disable-line no-console
  return c.text('OK');
};
