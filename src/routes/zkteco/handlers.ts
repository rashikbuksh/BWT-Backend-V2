import type { AppRouteHandler } from '@/lib/types';

import { Buffer } from 'node:buffer';

import env from '@/env';
import { parseLine } from '@/utils/attendence/iclock_parser';

import type { AddBulkUsersRoute, DeviceHealthRoute, PostRoute } from './routes';

import { commandSyntax, ensureQueue, ensureUserMap, ensureUsersFetched, getNextAvailablePin, markStaleCommands, recordCDataEvent } from './functions';

// In-memory stores (replace with DB in prod)
const pushedLogs = []; // raw + enriched entries -- attendance real time logs
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

export const post: AppRouteHandler<PostRoute> = async (c: any) => {
  const sn = c.req.valid('query').SN || c.req.valid('query').sn || '';
  const raw = c.req.valid('body') || '';

  // Debug summary of payload
  const rawLines = String(raw).replace(/\r/g, '\n').split('\n').filter(Boolean);
  // console.warn(
  //   `[cdata] SN=${sn} table=${table} lines=${rawLines.length} bytes=${Buffer.byteLength(
  //     String(raw)
  //   )} firstLine=${rawLines[0] ? JSON.stringify(rawLines[0]) : '<empty>'}`
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
  rawArr.push({ at: new Date().toISOString(), raw: truncated, bytes: Buffer.byteLength(raw) });
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

  for (const items of allParsedItems) {
    if (items.type === 'REAL_TIME_LOG') {
      pushedLogs.push(items);
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

export const deviceHealth: AppRouteHandler<DeviceHealthRoute> = async (c: any) => {
  // Process users with proper async handling
  const deviceEntries = Array.from(deviceState.entries());

  // Debug: Log current usersByDevice state
  console.warn('[health] Current usersByDevice map:');
  for (const [sn, umap] of usersByDevice.entries()) {
    console.warn(`  SN=${sn} users=${umap.size} pins=[${Array.from(umap.keys()).join(', ')}]`);
  }

  const usersSummary = await Promise.all(
    deviceEntries.map(async ([sn, _]) => {
      console.warn(`[health] Processing device SN=${sn}`);
      await ensureUsersFetched(sn, usersByDevice, commandQueue);
      const umap = usersByDevice.get(sn);
      const count = umap ? umap.size : 0;
      console.warn(`[health] SN=${sn} final count=${count}`);
      return {
        sn,
        count,
      };
    }),
  );

  return c.json({
    ok: true,
    devices: Array.from(deviceState.entries()).map(([sn, s]) => ({
      sn,
      lastStamp: s.lastStamp,
      lastSeenAt: s.lastSeenAt,
      lastUserSyncAt: s.lastUserSyncAt,
    })),
    users: usersSummary,
    pullMode: env.PULL_MODE,
    commandSyntax,
  });
};

export const addBulkUsers: AppRouteHandler<AddBulkUsersRoute> = async (c: any) => {
  const sn = c.req('query').sn || c.req('query').SN;
  if (!sn)
    return c.json({ error: 'sn is required' });

  // Ensure users are fetched before bulk operations
  await ensureUsersFetched(sn, usersByDevice, commandQueue);

  const {
    users, // array of user objects: [{ name: 'Anik2', card?: '123', privilege?: 0, department?: '', password?: '', pin2?: '', group?: '' }]
    startPin, // optional: starting PIN number (default: auto-detect next available)
    pinKey, // override PIN field label (e.g. Badgenumber, EnrollNumber)
    style, // 'spaces' to use spaces instead of tabs
    optimistic = true, // whether to apply optimistic caching
    fullQuery = true, // whether to query full user list after bulk insert
  } = c.req('body') || {};

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

  let currentPin = getNextAvailablePin(sn, startPin, usersByDevice);
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
      const pin2Val = clean(user.pin2 || '');
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
      if (pin2Val)
        baseParts.push(`PIN2=${pin2Val}`);
      if (grpVal)
        baseParts.push(`Grp=${grpVal}`);

      const command = `C:${i + 1}:DATA UPDATE USERINFO ${join(baseParts)}`;
      commands.push(command);

      // Optimistic cache update
      if (optimistic && umap) {
        umap.set(pinVal, {
          pin: pinVal,
          name: nameVal,
          card: cardVal,
          privilege: String(priVal),
          department: deptVal,
          password: pwdVal ? '****' : undefined,
          pin2: pin2Val || undefined,
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

  // Add query commands for verification
  if (fullQuery) {
    commands.push(`C:${commands.length + 1}:DATA QUERY USERINFO`);
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

  c.json({
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
