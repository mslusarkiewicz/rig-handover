import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLine } from './readNight.js';
import type { RunStatus } from './types.js';

export type NightCounts = Record<RunStatus, number>;

// Run records per status in runs/<night>.jsonl, same parse rules as readNight (bad lines are
// skipped). null = file unreadable.
export function countNight(runsDir: string, night: string): NightCounts | null {
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch {
    return null;
  }
  const counts: NightCounts = { ok: 0, retry: 0, fail: 0 };
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === '') continue;
    const rec = parseLine(line);
    if (rec) counts[rec.status]++;
  }
  return counts;
}
