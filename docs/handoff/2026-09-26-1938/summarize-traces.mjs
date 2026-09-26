import fs from 'node:fs';
const files = ['trace-a.json','trace-b.json','trace-c.json'];
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(new URL('traces/' + f, import.meta.url), 'utf8'));
  const rows = j.rows;
  const modes = new Set(rows.map(r => r.mode));
  console.log(`\n== ${f}: rows=${rows.length} dropped=${j.dropped} modes=${[...modes]}`);
  let lastPage = {};
  for (const r of rows) {
    const k = r.pane;
    if (r.type !== 'wheel') {
      const back = lastPage[k] != null && r.page < lastPage[k];
      if (r.type !== 'queue-restore' || back)
        console.log(`${r.t.toFixed(0).padStart(7)} ${k.slice(0, 8)} ${r.type} p${r.page} ${r.reason || ''} ${r.result || ''} ${r.to ? r.from + '->' + r.to : ''} ${r.delta != null ? 'd=' + r.delta : ''}${back ? '  <<< BACKWARD' : ''}`);
    }
    lastPage[k] = r.page;
  }
  // backward-dy wheel counts
  const neg = rows.filter(r => r.type === 'wheel' && r.dy < 0).length;
  console.log('negative-dy wheels:', neg);
}
