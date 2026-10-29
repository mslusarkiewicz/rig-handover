export type RunStatus = 'ok' | 'retry' | 'fail';

// One line of runs/<night>.jsonl.
export type RunRecord = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

// One row per job. `owner` stays null in data; views show it with ownerLabel() ("—").
export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

// found: false = no file (404). found: true with rows [] = empty night ("nothing ran").
export type Night =
  | { found: false; night: string }
  | { found: true; night: string; rows: DigestRow[]; badLines: number };

// Rows sorted by job. Bad lines are counted, never thrown.
export type ReadNight = (runsDir: string, night: string) => Night;

export const NO_OWNER = '—';
export function ownerLabel(owner: string | null): string {
  return owner ?? NO_OWNER;
}
