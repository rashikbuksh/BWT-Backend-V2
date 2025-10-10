import env from '@/env';

export const commandSyntax = String(env.ICLOCK_COMMAND).toUpperCase();

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

  return umap;
}

export function getNextAvailablePin(sn: string, startPin = 1, usersByDevice: Map<string, Map<string, any>>) {
  // Use ensureUserMap to get existing map (already fetched by calling function)
  const umap = ensureUserMap(sn, usersByDevice) ?? new Map();
  let pin = Number(startPin) || 1;

  // Find the highest existing PIN to start from
  const existingPins = Array.from(umap.keys())
    .map(p => Number(p))
    .filter(p => !Number.isNaN(p));
  if (existingPins.length > 0) {
    const maxPin = Math.max(...existingPins);
    pin = Math.max(pin, maxPin + 1);
  }

  // Find next available PIN
  while (umap.has(String(pin))) {
    pin++;
  }

  return pin;
}
