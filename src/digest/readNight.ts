import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, ReadNight, RunRecord } from './types.js';

const STATUSES = new Set(['ok', 'retry', 'fail']);

// A line is a record only if it parses and has the right shape; anything else is a bad line.
export function parseLine(line: string): RunRecord | null {
  let v: unknown;
  try {
    v = JSON.parse(line);
  } catch {
    return null;
  }
  if (typeof v !== 'object' || v === null) return null;
  const r = v as Record<string, unknown>;
  if (typeof r.at !== 'string' || Number.isNaN(Date.parse(r.at))) return null;
  if (typeof r.job !== 'string' || r.job === '') return null;
  if (typeof r.status !== 'string' || !STATUSES.has(r.status)) return null;
  if (r.owner !== null && typeof r.owner !== 'string') return null;
  if (r.error !== undefined && typeof r.error !== 'string') return null;
  return r as unknown as RunRecord;
}

export const readNight: ReadNight = (runsDir, night) => {
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch {
    return { found: false, night };
  }
  const byJob = new Map<string, DigestRow>();
  let badLines = 0;
  for (const raw of text.split(/\r?\n/)) {
    if (raw.trim() === '') continue;
    const rec = parseLine(raw);
    if (!rec) {
      badLines++;
      continue;
    }
    const row = byJob.get(rec.job);
    if (!row) {
      byJob.set(rec.job, {
        job: rec.job,
        owner: rec.owner,
        runs: 1,
        retries: rec.status === 'retry' ? 1 : 0,
        lastStatus: rec.status,
        lastError: rec.error ?? null,
        firstAt: rec.at,
        lastAt: rec.at,
      });
      continue;
    }
    const t = Date.parse(rec.at);
    row.runs++;
    if (rec.status === 'retry') row.retries++;
    if (t < Date.parse(row.firstAt)) row.firstAt = rec.at;
    if (t >= Date.parse(row.lastAt)) {
      row.lastAt = rec.at;
      row.lastStatus = rec.status;
      row.lastError = rec.error ?? null;
      row.owner = rec.owner;
    }
  }
  const rows = [...byJob.values()].sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));
  return { found: true, night, rows, badLines };
};
