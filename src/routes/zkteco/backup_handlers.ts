import type { AppRouteHandler } from '@/lib/types';

import type { FullBackupRoute } from './backup_routes';

import { ensureQueue } from './functions';
import { commandQueue } from './handlers';

export const fullBackup: AppRouteHandler<FullBackupRoute> = async (c: any) => {
  const sn = c.req.query('sn') || c.req.query('SN');
  const body = c.req.valid('json');

  if (!sn) {
    return c.json({ error: 'Device serial number (sn) is required' }, 400);
  }

  const {
    includeAttlogs = true,
    includeUsers = true,
    includeBiometric = true,
    includeFaceTemplates = false,
    includeConfig = true,
    startDate,
    endDate,
  } = body;

  const queue = ensureQueue(sn, commandQueue);
  const queuedCommands: string[] = [];

  try {
    // 1. Device Information
    queue?.push('C:1:GET INFO');
    queuedCommands.push('GET INFO');

    // 2. User Information
    if (includeUsers) {
      queue?.push('C:1:DATA QUERY USERINFO');
      queuedCommands.push('DATA QUERY USERINFO');

      // Also get user roles/privileges
      queue?.push('C:1:DATA QUERY ROLE');
      queuedCommands.push('DATA QUERY ROLE');

      // Get department information
      queue?.push('C:1:DATA QUERY DEPT');
      queuedCommands.push('DATA QUERY DEPT');
    }

    // 3. Attendance Logs
    if (includeAttlogs) {
      let attlogCommand = 'C:1:DATA QUERY ATTLOG';

      // Add date range if specified
      if (startDate && endDate) {
        attlogCommand += ` StartTime=${startDate} EndTime=${endDate}`;
      }
      else if (startDate) {
        // If only start date, get from start date to now
        const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
        attlogCommand += ` StartTime=${startDate} EndTime=${now}`;
      }

      queue?.push(attlogCommand);
      const attlogDescription = startDate || endDate
        ? 'DATA QUERY ATTLOG (with date range)'
        : 'DATA QUERY ATTLOG';
      queuedCommands.push(attlogDescription);
    }

    // 4. Biometric Data (Fingerprints)
    if (includeBiometric) {
      queue?.push('C:1:DATA QUERY BIODATA');
      queuedCommands.push('DATA QUERY BIODATA');
    }

    // 5. Face Templates (if requested)
    if (includeFaceTemplates) {
      queue?.push('C:1:DATA QUERY BIOPHOTO');
      queuedCommands.push('DATA QUERY BIOPHOTO');
    }

    // 6. Device Configuration
    if (includeConfig) {
      queue?.push('C:1:DATA QUERY OPTION');
      queuedCommands.push('DATA QUERY OPTION');
    }

    // Calculate estimated time (rough estimate: 30 seconds per command)
    const estimatedMinutes = Math.ceil((queuedCommands.length * 30) / 60);
    const estimatedTime = estimatedMinutes === 1
      ? '1 minute'
      : `${estimatedMinutes} minutes`;

    console.warn(`[full-backup] SN=${sn} queued ${queuedCommands.length} backup commands`);
    console.warn(`[full-backup] Commands: ${queuedCommands.join(', ')}`);

    return c.json({
      ok: true,
      sn,
      message: `Full backup initiated for device ${sn}`,
      queuedCommands,
      estimatedTime,
      note: 'Backup commands have been queued. Data will be retrieved when device next polls for commands.',
    });
  }
  catch (error) {
    console.error(`[full-backup] Error for SN=${sn}:`, error);
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to initiate backup',
    }, 500);
  }
};
