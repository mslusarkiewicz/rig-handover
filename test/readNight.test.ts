import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/readNight.js';
import { ownerLabel } from '../src/digest/types.js';

function tempRuns(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body);
  return dir;
}

describe('readNight on runs/2026-10-28.jsonl', () => {
  const night = readNight('runs', '2026-10-28');
  if (!night.found) throw new Error('fixture missing');

  it('has 5 jobs sorted by job and 1 bad line', () => {
    expect(night.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    expect(night.badLines).toBe(1);
  });

  it('aggregates runs, retries, last status and times', () => {
    const fx = night.rows.find((r) => r.job === 'fixtures/refresh')!;
    expect(fx).toMatchObject({
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: null,
      owner: 'rook',
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
    expect(night.rows.find((r) => r.job === 'lane/sync')).toMatchObject({ runs: 8, retries: 1, lastStatus: 'ok' });
    expect(night.rows.find((r) => r.job === 'notes/backup')).toMatchObject({
      runs: 1,
      lastStatus: 'fail',
      lastError: 'quota exceeded',
    });
  });

  it('keeps a null owner and labels it —', () => {
    const row = night.rows.find((r) => r.job === 'digest/render')!;
    expect(row.owner).toBeNull();
    expect(ownerLabel(row.owner)).toBe('—');
  });
});

describe('readNight edge cases', () => {
  it('tells no file from an empty file', () => {
    const dir = tempRuns({ '2026-01-02.jsonl': '' });
    expect(readNight(dir, '2026-01-01')).toEqual({ found: false, night: '2026-01-01' });
    expect(readNight(dir, '2026-01-02')).toEqual({ found: true, night: '2026-01-02', rows: [], badLines: 0 });
  });

  it('counts invalid records as bad lines and never throws', () => {
    const dir = tempRuns({
      'n.jsonl': [
        '{"at":"2026-01-01T00:00:00Z","job":"a","status":"ok","owner":null}',
        'not json',
        '42',
        '{"at":"2026-01-01T00:00:00Z","job":"a","status":"weird","owner":null}',
        '{"job":"a","status":"ok","owner":null}',
        '',
      ].join('\r\n'),
    });
    const n = readNight(dir, 'n');
    if (!n.found) throw new Error('expected file');
    expect(n.badLines).toBe(4);
    expect(n.rows).toHaveLength(1);
  });
});
