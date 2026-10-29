import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

// Written against the contract in plan 2a/2b. Routes arrive with #2 (page) and #3 (JSON);
// until they are merged, these fail with 404.

const line = (job: string, status: string, owner: string | null, at: string) =>
  JSON.stringify({ at, job, status, owner });

let dir: string;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
  writeFileSync(
    join(dir, '2026-01-01.jsonl'),
    [
      line('zeta-sync', 'ok', 'ann', '2026-01-01T01:00:00Z'),
      line('alpha-backup', 'retry', null, '2026-01-01T02:00:00Z'),
      line('alpha-backup', 'ok', null, '2026-01-01T02:05:00Z'),
      line('mid-report', 'fail', 'bob', '2026-01-01T03:00:00Z'),
    ].join('\n') + '\n',
  );
  writeFileSync(join(dir, '2026-01-02.jsonl'), '');
  writeFileSync(
    join(dir, '2026-01-03.jsonl'),
    [
      line('good-a', 'ok', 'ann', '2026-01-03T01:00:00Z'),
      'not json at all',
      line('good-b', 'ok', 'bob', '2026-01-03T02:00:00Z'),
    ].join('\n') + '\n',
  );
  app = createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: dir });
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('digest page /digest/:night', () => {
  it('200 for a normal night, with every job and the owner dash', async () => {
    const res = await app.request('/digest/2026-01-01');
    const html = await res.text();
    expect(res.status).toBe(200);
    for (const job of ['alpha-backup', 'mid-report', 'zeta-sync']) expect(html).toContain(job);
    expect(html).toContain('—');
  });

  it('404 for a night with no file', async () => {
    expect((await app.request('/digest/2026-01-09')).status).toBe(404);
  });

  it('empty night says nothing ran', async () => {
    const res = await app.request('/digest/2026-01-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('bad line: 200 and the good rows stay', async () => {
    const res = await app.request('/digest/2026-01-03');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('good-a');
    expect(html).toContain('good-b');
  });
});

describe('digest JSON /api/digest/:night', () => {
  it('200 for a normal night, jobs in job order, badLines 0', async () => {
    const res = await app.request('/api/digest/2026-01-01');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { night: string; rows: { job: string }[]; badLines: number };
    expect(body.night).toBe('2026-01-01');
    expect(body.rows.map((r) => r.job)).toEqual(['alpha-backup', 'mid-report', 'zeta-sync']);
    expect(body.badLines).toBe(0);
  });

  it('404 for a night with no file', async () => {
    expect((await app.request('/api/digest/2026-01-09')).status).toBe(404);
  });

  it('empty night: 200 with rows []', async () => {
    const res = await app.request('/api/digest/2026-01-02');
    expect(res.status).toBe(200);
    expect(((await res.json()) as { rows: unknown[] }).rows).toEqual([]);
  });

  it('bad line: 200, good rows stay, badLines 1', async () => {
    const res = await app.request('/api/digest/2026-01-03');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { rows: { job: string }[]; badLines: number };
    expect(body.rows.map((r) => r.job)).toEqual(['good-a', 'good-b']);
    expect(body.badLines).toBe(1);
  });
});
