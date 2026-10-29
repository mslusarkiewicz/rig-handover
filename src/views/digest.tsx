import { ownerLabel, type DigestRow } from '../digest/types.js';

const RETRY_LIMIT = 3;

function marks(row: DigestRow): string[] {
  const m: string[] = [];
  if (row.retries >= RETRY_LIMIT) m.push('RETRIES');
  if (row.lastStatus === 'fail') m.push('FAIL');
  return m;
}

export function DigestPage(props: { night: string; rows: DigestRow[]; badLines: number }) {
  return (
    <>
      <h1>digest · {props.night}</h1>
      {props.badLines > 0 ? <p class="warn">{props.badLines} bad line(s) skipped</p> : null}
      {props.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
              <th>mark</th>
            </tr>
          </thead>
          <tbody>
            {props.rows.map((r) => {
              const m = marks(r);
              return (
                <tr class={m.length > 0 ? 'flag' : undefined}>
                  <td>{r.job}</td>
                  <td>{ownerLabel(r.owner)}</td>
                  <td>{r.runs}</td>
                  <td>{r.retries}</td>
                  <td>{r.lastStatus}</td>
                  <td>{r.lastError ?? '—'}</td>
                  <td>{r.firstAt}</td>
                  <td>{r.lastAt}</td>
                  <td>{m.length > 0 ? `⚠ ${m.join(' ')}` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
