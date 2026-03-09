import { copyFileSync, readFileSync, writeFileSync } from 'fs';

const INPUT_CSV = './fuke_current.csv';
const OUTPUT_CSV = './fuke_current.filtered.csv';
const BACKUP_CSV = './fuke_current_full_backup.csv';
const CONCURRENCY = 36;
const RETRIES = 1;
const REQUEST_TIMEOUT_MS = 8000;

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

function toCsvCell(v) {
  const s = String(v ?? '').replace(/\r?\n|\r/g, ' ').trim();
  return `"${s.replace(/"/g, '""')}"`;
}

function stripHtml(s) {
  return s
    .replace(/<br\s*\/?>(\s*)/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMailingAddress(html) {
  const markerPatterns = [
    /【\s*郵頼送付先等\s*】([\s\S]*?)(?:<\/dd>|$)/i,
    /【\s*郵頼送付先\s*】([\s\S]*?)(?:<\/dd>|$)/i,
    /<th[^>]*>\s*郵頼送付先\s*<\/th>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
    /<dt[^>]*>\s*郵頼送付先\s*<\/dt>[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i,
  ];

  for (const re of markerPatterns) {
    const m = html.match(re);
    if (!m || !m[1]) continue;

    const text = stripHtml(m[1])
      .replace(/^郵頼送付先等?[：:\s]*/i, '')
      .trim();

    if (
      text
      && !/^(なし|掲載なし|未掲載|未設定|--|-|―|－|準備中)$/i.test(text)
    ) {
      return text;
    }
  }

  return '';
}

async function fetchWithRetry(url) {
  let lastError = null;
  for (let i = 0; i <= RETRIES; i += 1) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; StampCollectorBot/1.0)'
        }
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      lastError = e;
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastError;
}
async function run() {
  const raw = readFileSync(INPUT_CSV, 'utf8');
  const lines = raw.split('\n').filter((line) => line.trim().length > 0);
  if (lines.length <= 1) {
    throw new Error(`input seems empty: ${INPUT_CSV}`);
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.trim().replace(/^"|"$/g, ''));

  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < headers.length) continue;

    const row = Object.fromEntries(headers.map((h, idx) => [h, String(cols[idx] ?? '').replace(/\r/g, '').trim()]));
    const lat = parseFloat(row.latitude);
    const lng = parseFloat(row.longitude);

    if (!row.detail_id || !row.name || !row.prefecture) continue;
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue;

    rows.push(row);
  }

  try {
    copyFileSync(INPUT_CSV, BACKUP_CSV);
  } catch {
    // ignore backup failure
  }

  const result = [];
  let cursor = 0;
  let scanned = 0;
  let kept = 0;
  let failed = 0;

  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= rows.length) return;

      const row = rows[index];
      const detailUrl = (row.detail_url || '').replace('/fuke//detail.php', '/fuke/detail.php');
      if (!detailUrl) {
        scanned += 1;
        failed += 1;
        continue;
      }

      try {
        const html = await fetchWithRetry(detailUrl);
        const mailing = extractMailingAddress(html);
        scanned += 1;

        if (mailing) {
          row.mailing_address = mailing;
          result.push(row);
          kept += 1;
        }

        if (scanned % 200 === 0) {
          console.log(`progress scanned=${scanned}/${rows.length} kept=${kept} failed=${failed}`);
        }
      } catch {
        scanned += 1;
        failed += 1;
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const outputHeaders = [...headers, 'mailing_address'];
  const outLines = [outputHeaders.map(toCsvCell).join(',')];

  for (const row of result) {
    const cols = outputHeaders.map((h) => toCsvCell(row[h] ?? ''));
    outLines.push(cols.join(','));
  }

  writeFileSync(OUTPUT_CSV, `${outLines.join('\n')}\n`, 'utf8');
  copyFileSync(OUTPUT_CSV, INPUT_CSV);
  console.log(`done scanned=${scanned} kept=${kept} removed=${scanned - kept} failed=${failed}`);
  console.log(`written_filtered=${OUTPUT_CSV}`);
  console.log(`synced_input=${INPUT_CSV}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});




