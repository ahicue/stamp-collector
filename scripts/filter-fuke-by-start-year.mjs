import { readFileSync, writeFileSync } from 'fs';

const YEAR_THRESHOLD = 2006;
const SOURCE_WITH_COORDS = './fuke_current_full_backup.csv';
const SOURCE_ALL = './fuke_recollect_all.csv';
const OUTPUT = './fuke_current.csv';

function parseCsvLine(line) {
  const cols = [];
  let inQuote = false;
  let cur = '';

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === ',' && !inQuote) {
      cols.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }

  cols.push(cur);
  return cols;
}

function toCsvCell(value) {
  const s = String(value ?? '').replace(/\r?\n|\r/g, ' ').trim();
  return `"${s.replace(/"/g, '""')}"`;
}

function readCsv(path) {
  const raw = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const headers = parseCsvLine(lines[0]).map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    const row = Object.fromEntries(headers.map((h, idx) => [h, String(cols[idx] ?? '').trim()]));
    rows.push(row);
  }

  return { headers, rows };
}

function extractYear(startDate) {
  const m = String(startDate ?? '').match(/(\d{4})/);
  return m ? Number(m[1]) : NaN;
}

function run() {
  const { rows: allRows } = readCsv(SOURCE_ALL);
  const { headers: coordHeaders, rows: coordRows } = readCsv(SOURCE_WITH_COORDS);

  const validIds = new Map();
  for (const row of allRows) {
    const year = extractYear(row.start_date);
    if (!Number.isNaN(year) && year >= YEAR_THRESHOLD) {
      validIds.set(row.detail_id, {
        start_date: row.start_date,
        status_text: row.status_text,
      });
    }
  }

  const merged = [];
  let missingCoords = 0;
  for (const row of coordRows) {
    const id = row.detail_id;
    const selected = validIds.get(id);
    if (!selected) continue;

    const lat = parseFloat(row.latitude);
    const lng = parseFloat(row.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      missingCoords += 1;
      continue;
    }

    merged.push({
      ...row,
      start_date: selected.start_date || row.start_date || '',
      status_text: selected.status_text || row.status_text || '',
    });
  }

  const unique = new Map();
  for (const row of merged) {
    if (!unique.has(row.detail_id)) {
      unique.set(row.detail_id, row);
    }
  }

  const outputRows = Array.from(unique.values()).sort((a, b) => Number(a.detail_id) - Number(b.detail_id));

  const outputLines = [coordHeaders.map(toCsvCell).join(',')];
  for (const row of outputRows) {
    outputLines.push(coordHeaders.map((h) => toCsvCell(row[h] ?? '')).join(','));
  }

  writeFileSync(OUTPUT, `\uFEFF${outputLines.join('\n')}\n`, 'utf8');

  console.log(`year_threshold=${YEAR_THRESHOLD}`);
  console.log(`source_total=${allRows.length}`);
  console.log(`selected_by_year=${validIds.size}`);
  console.log(`merged_with_coords=${merged.length}`);
  console.log(`missing_coords=${missingCoords}`);
  console.log(`written_rows=${outputRows.length}`);
  console.log(`output=${OUTPUT}`);
}

run();
