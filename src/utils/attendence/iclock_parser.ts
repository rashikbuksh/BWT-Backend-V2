import { kvPairs, verifyCodeToMethod } from './utils';

export function parseATTLOG(fields: string[], type: string) {
  // Tagged format: "ATTLOG PIN TIMESTAMP STATUS VERIFY WORKCODE ..."
  if (type === 'tagged') {
    return {
      type: 'REAL_TIME_LOG',
      pin: String(fields[1] ?? ''),
      timestamp: fields[2] ?? '',
      status: Number(fields[3] ?? '0'),
      verify: verifyCodeToMethod(Number(fields[4] ?? '0')),
      workcode: String(fields[5] ?? ''),
      raw: fields.join('\t'),
    };
  }

  // Plain format (Android): "PIN TIMESTAMP STATUS VERIFY WORKCODE r1 r2 r3 r4 r5 rid"
  if (type === 'plain') {
    return {
      type: 'REAL_TIME_LOG',
      pin: String(fields[0] ?? ''),
      timestamp: fields[1] ?? '',
      status: Number(fields[2] ?? '0'),
      verify: verifyCodeToMethod(Number(fields[3] ?? '0')),
      workcode: String(fields[4] ?? ''),
      raw: fields.join('\t'),
    };
  }

  // OPLOG format: "OPLOG PIN TIMESTAMP STATUS VERIFY WORKCODE r1 r2 r3 r4 r5 rid"
  if (type === 'oplog')
    return { type: 'OPLOG', raw: fields.join('\t') };

  console.warn('Unknown ATTLOG format', fields);
  return {};
}

export function splitLines(raw: string): string[] {
  return String(raw)
    .replace(/\r/g, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
}

export function parseLine(line: string) {
  // Trim CR/LF
  const raw = line.trim();
  if (!raw)
    return null;

  // console.warn('Parsing line:', raw);

  // Identify by first token
  const firstToken = raw.split('\t', 1)[0];

  // Also by first space-separated token
  const firstSpace = raw.split(' ', 1)[0];

  switch (true) {
    // USER profile
    case firstSpace === 'USER': {
      const kv = kvPairs(raw.substring(5));
      return { type: 'USER', ...kv };
    }

    // BIODATA (finger/face/palm templates)
    case firstSpace === 'BIODATA': {
      const kv = kvPairs(raw.substring(8));
      return { type: 'BIODATA', ...kv };
    }

    // USERPIC meta
    case firstSpace === 'USERPIC': {
      const kv = kvPairs(raw.substring(8));
      return { type: 'USERPIC', ...kv };
    }

    // BIOPHOTO full image
    case firstSpace === 'BIOPHOTO': {
      const kv = kvPairs(raw.substring(9));
      return { type: 'BIOPHOTO', ...kv };
    }

    // OPLOG operation log (tab separated)
    case firstSpace === 'OPLOG': {
      const parts = raw.split('\t');
      const head = parts[0].split(' ');
      const opCode = head[1];
      return {
        type: 'OPLOG',
        opCode,
        operatorPin: parts[1],
        dateTime: parts[2],
        status: parts[3],
        p1: parts[4],
        p2: parts[5],
        p3: parts[6],
        raw,
      };
    }

    // Attendance (plain) if first token is an integer PIN
    case /^\d+$/.test(firstToken): {
      const lines = splitLines(raw);
      if (lines.length > 1) {
        console.warn('Multiple lines in single ATTLOG entry, using first line only', raw);
      }

      const log = [];

      for (const l of lines) {
        const fields = l.split('\t');
        log.push(parseATTLOG(fields, 'plain'));
      }

      return { log, type: 'REAL_TIME_LOG' };
    }

    default:
      return { type: 'UNKNOWN', raw };
  }
}
