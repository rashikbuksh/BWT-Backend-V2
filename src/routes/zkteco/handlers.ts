import type { AppRouteHandler } from '@/lib/types';

import { Buffer } from 'node:buffer';

import env from '@/env';
import { parseLine } from '@/utils/attendence/iclock_parser';

import type { AddBulkUsersRoute, ClearCommandQueueRoute, ConnectionTestRoute, CustomCommandRoute, DeviceCmdRoute, DeviceHealthRoute, GetQueueStatusRoute, GetRequestLegacyRoute, GetRequestRoute, IclockRootRoute, PostRoute, RefreshUsersRoute } from './routes';

import { commandSyntax, ensureQueue, ensureUserMap, ensureUsersFetched, getNextAvailablePin, insertBiometricData, insertRealTimeLogToBackend, markDelivered, markStaleCommands, recordCDataEvent, recordPoll, recordSentCommand } from './functions';

// In-memory stores (replace with DB in prod)
const pushedLogs: any[] = []; // raw + enriched entries -- attendance real time logs
const informationLogs = []; // raw INFO lines -- user info, user details
const deviceState = new Map(); // sn -> { lastStamp, lastSeenAt, lastUserSyncAt }
const commandQueue = new Map(); // sn -> [ '...' ]
const usersByDevice = new Map(); // sn -> Map(pin -> user)
const devicePinKey = new Map(); // sn -> preferred PIN field key (PIN, Badgenumber, EnrollNumber, etc.)
// const sseClients = new Set(); // SSE clients for real-time
const sentCommands = new Map(); // sn -> [{ id, cmd, queuedAt, sentAt(deprecated), deliveredAt, bytesSent, respondedAt, staleAt, postSeenAfterDelivery, remote }]
const cdataEvents = new Map(); // sn -> [{ at, lineCount, firstLine, hasUserInfo, hasAttlog, hasOptionLike }]
const rawCDataStore = new Map(); // sn -> [{ at, raw, bytes }]
// const pollHistory = new Map(); // sn -> [{ at, queueBefore, deliveredCount, remote }]

export const getRequest: AppRouteHandler<GetRequestRoute> = async (c: any) => {
  const sn = c.req.valid('query').SN || c.req.valid('query').sn || '';
  const options = c.req.valid('query').options || '';
  const language = c.req.valid('query').language || '';
  const pushver = c.req.valid('query').pushver || '';
  const deviceType = c.req.valid('query').DeviceType || '';
  const pushOptionsFlag = c.req.valid('query').PushOptionsFlag || '';

  console.warn(`*** /ICLOCK/CDATA GET ENDPOINT CALLED ***`);
  console.warn(`SN=${sn} options=${options} language=${language} pushver=${pushver}`);
  console.warn(`DeviceType=${deviceType} PushOptionsFlag=${pushOptionsFlag}`);

  const state = deviceState.get(sn) || {};
  state.lastSeenAt = new Date().toISOString();
  deviceState.set(sn, state);

  // Debug: log each poll (can be noisy; comment out if too verbose)
  const queueCheck = ensureQueue(sn, commandQueue);
  if (queueCheck && queueCheck.length > 0) {
    console.warn(
      `[cdata-GET] poll SN=${sn} pullMode=${env.PULL_MODE} queued=${queueCheck.length}`,
    );
  }

  const queue = ensureQueue(sn, commandQueue);

  // Add a test command only once per device session (when device state doesn't have testCommandSent flag)
  // if (queue && queue.length === 0 && !state.testCommandSent) {
  //   queue.push('C:1:DATA QUERY USERINFO');
  //   state.testCommandSent = true;
  //   deviceState.set(sn, state);
  //   console.warn(`[cdata-GET] SN=${sn} added one-time test USERINFO command to empty queue`);
  // }

  if (queue?.length) {
    const sep = env.USE_CRLF === '1' ? '\r\n' : '\n';
    const cmds = [...queue]; // Create a copy of the commands
    queue.length = 0; // Clear the queue immediately after copying

    const body = cmds.join(sep) + sep;
    console.warn(cmds);
    console.warn(`*[cdata-GET] SN=${sn} sending ${cmds.length} cmd(s), queue cleared`); // concise log
    console.warn(body);
    // Record commands (pre-write) for diagnostics
    const remote = (c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip') || 'unknown');

    const justIds: string[] = [];
    const ensureSentList = (sn: string) => {
      if (!sentCommands.has(sn))
        sentCommands.set(sn, []);
      return sentCommands.get(sn) ?? [];
    };
    cmds.forEach((c: string) => {
      recordSentCommand(sn, c, remote, sentCommands, ensureSentList);
      const list = sentCommands.get(sn);
      // console.warn(`list`, list);
      if (list)
        justIds.push(list[list.length - 1].id);
    });
    // console.warn(`body`, body);
    // Attempt send
    const bytes = Buffer.byteLength(body, 'utf8');
    markDelivered(sn, justIds, bytes, sentCommands);
    recordPoll(sn, remote, queue.length + cmds.length, cmds.length, new Map());
    markStaleCommands(sn, sentCommands);
    return c.text(body); // Return plain text response
  }
  // if (env.PULL_MODE === '1') {
  //   const cmd = buildFetchCommand(sn, 24, commandSyntax, deviceState);
  //   const sep = env.USE_CRLF === '1' ? '\r\n' : '\n';
  //   console.warn(`[cdata-GET] SN=${sn} auto cmd: ${cmd}`);
  //   recordPoll(sn, (c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip') || 'unknown'), (queue?.length ?? 0), 0, new Map());
  //   return c.text(cmd + sep);
  // }
  console.warn(`[cdata-GET] SN=${sn} idle (no commands, pullMode=${env.PULL_MODE})`);
  recordPoll(sn, (c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip') || 'unknown'), (queue?.length ?? 0), 0, new Map());
  return c.text('OK');
};

export const post: AppRouteHandler<PostRoute> = async (c: any) => {
  const sn = c.req.valid('query').SN || c.req.valid('query').sn || '';
  // const table = c.req.valid('query').table || c.req.valid('query').options || '';

  // Get raw text body for ZKTeco device data
  const raw = await c.req.text();

  console.warn(`*** /ICLOCK/CDATA POST ENDPOINT CALLED *** SN=${sn}`);
  console.warn(`POST data received: ${raw ? raw.length : 0} bytes`);

  // Debug summary of payload
  const rawLines = String(raw || '').replace(/\r/g, '\n').split('\n').filter(Boolean);
  // console.warn(
  //   `[cdata] SN=${sn} table=${table} lines=${rawLines.length} bytes=${Buffer.byteLength(
  //     String(raw || ''),
  //   )} firstLine=${rawLines[0] ? JSON.stringify(rawLines[0]) : '<empty>'}`,
  // );

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

    else {
      informationLogs.push(items);
      if (items.type === 'USER') {
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
            // console.warn(`[auto-detect] SN=${sn} detected PIN key: ${detectedKey}`);
          }

          const umap = ensureUserMap(sn, usersByDevice);

          // Avoid overwriting existing users with same PIN
          if (umap && !umap.has(userPin)) {
            umap.set(userPin, { ...items, pin: userPin });
            userCount++;
            // console.warn(`[user-added] SN=${sn} PIN=${userPin} Name=${items.Name || 'N/A'}`);
          }
          else if (umap) {
            duplicateCount++;
            // console.warn(
            //   `[user-exists] SN=${sn} PIN=${userPin} Name=${
            //     items.Name || 'N/A'
            //   } - skipping duplicate`
            // );
          }
        }
      }
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

  // Return a simple response that ZKTeco devices expect
  return c.text('OK');
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

  // // Get command queue status
  // const queueStatus = Array.from(commandQueue.entries()).map(([sn, queue]) => ({
  //   sn,
  //   queueLength: queue.length,
  //   commands: queue.slice(0, 5), // Show first 5 commands
  // }));

  // const usersSummary = await Promise.all(
  //   (deviceIdentifier ? [[deviceIdentifier, deviceState.get(deviceIdentifier)]] : deviceEntries)
  //     .map(async ([sn, _]) => {
  //       console.warn(`[health] Processing device SN=${sn}`);
  //       await ensureUsersFetched(sn, usersByDevice, commandQueue);
  //       const umap = usersByDevice.get(sn);
  //       const count = umap ? umap.size : 0;
  //       console.warn(`[health] SN=${sn} final count=${count}`);
  //       return {
  //         sn,
  //         count,
  //       };
  //     }),
  // );

  const response = {
    ok: true,
    devices: (deviceIdentifier
      ? deviceState.has(deviceIdentifier)
        ? [{ sn: deviceIdentifier, ...deviceState.get(deviceIdentifier) }]
        : []
      : Array.from(deviceState.entries()).map(([sn, s]) => ({
          sn,
          lastStamp: s.lastStamp,
          lastSeenAt: s.lastSeenAt,
          lastUserSyncAt: s.lastUserSyncAt,
        }))
    ),
    // users: usersSummary,
    // commandQueues: queueStatus,
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
    users, // array of user objects: [{ name: 'Anik2', card?: '123', privilege?: 0, department?: '', password?: '', group?: '' }]
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

  // Schedule a delayed user fetch to get updated user list after device processes the commands
  setTimeout(async () => {
    try {
      console.warn(`[bulk-add-users] SN=${sn} fetching updated user list after ${commands.length} user additions`);
      await ensureUsersFetched(sn, usersByDevice, commandQueue);
      const umap = ensureUserMap(sn, usersByDevice);
      console.warn(`[bulk-add-users] SN=${sn} user fetch completed, total users now: ${umap?.size ?? 0}`);
    }
    catch (error) {
      console.error(`[bulk-add-users] SN=${sn} failed to fetch users after bulk addition:`, error);
    }
  }, 5000); // Wait 5 seconds for device to process the user addition commands

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

  if (userMap && userMap.size < 1) {
    await ensureUsersFetched(sn, usersByDevice, commandQueue);
  }

  console.warn(`[getrequest-legacy] SN=${sn} fetched users, total now: ${userMap?.size}`);

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
