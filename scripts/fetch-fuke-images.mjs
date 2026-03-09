import { copyFileSync, readFileSync, writeFileSync } from 'fs';

const INPUT_CSV = './fuke_current.csv';
const BACKUP_CSV = './fuke_current.before-image-fetch.backup.csv';
const OUTPUT_CSV = './fuke_current.csv';
const CONCURRENCY = 24;
const RETRIES = 2;
const TIMEOUT_MS = 12000;

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

async function fetchWithRetry(url) {
  let lastError = null;
  for (let i = 0; i <= RETRIES; i += 1) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
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
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw lastError;
}

function extractImageUrl(html) {
  const m = html.match(/<img[^>]+src="([^"]*\/stamp\/preview\/img\/fuke\/[^"]+)"[^>]*>/i);
  if (!m || !m[1]) return '';

  let src = m[1].trim();
  if (src.startsWith('//')) src = `https:${src}`;
  else if (src.startsWith('/')) src = `https://www.post.japanpost.jp${src}`;
  else if (!/^https?:\/\//i.test(src)) src = `https://www.post.japanpost.jp/kitte_hagaki/stamp/fuke/${src.replace(/^\.\//, '')}`;

  return src;
}

async function run() {
  const raw = readFileSync(INPUT_CSV, 'utf8').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length <= 1) throw new Error(`input seems empty: ${INPUT_CSV}`);

  const headers = parseCsvLine(lines[0]).map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < headers.length) continue;
    rows.push(Object.fromEntries(headers.map((h, idx) => [h, String(cols[idx] ?? '').trim()])));
  }

  try {
    copyFileSync(INPUT_CSV, BACKUP_CSV);
  } catch {
    // ignore
  }

  let cursor = 0;
  let scanned = 0;
  let withImage = 0;
  let failed = 0;

  async function worker() {
    while (true) {
      const idx = cursor;
      cursor += 1;
      if (idx >= rows.length) return;

      const row = rows[idx];
      const url = (row.detail_url || '').replace('/fuke//detail.php', '/fuke/detail.php');
      if (!url) {
        scanned += 1;
        failed += 1;
        continue;
      }

      try {
        const html = await fetchWithRetry(url);
        const imageUrl = extractImageUrl(html);
        row.image_url = imageUrl;
        scanned += 1;
        if (imageUrl) withImage += 1;

        if (scanned % 200 === 0) {
          console.log(`progress scanned=${scanned}/${rows.length} withImage=${withImage} failed=${failed}`);
        }
      } catch {
        scanned += 1;
        failed += 1;
        row.image_url = row.image_url || '';
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const outputHeaders = headers.includes('image_url') ? headers : [...headers, 'image_url'];
  const outLines = [outputHeaders.map(toCsvCell).join(',')];
  for (const row of rows) {
    outLines.push(outputHeaders.map((h) => toCsvCell(row[h] ?? '')).join(','));
  }

  writeFileSync(OUTPUT_CSV, `\uFEFF${outLines.join('\n')}\n`, 'utf8');

  console.log(`done scanned=${scanned} withImage=${withImage} failed=${failed}`);
  console.log(`backup=${BACKUP_CSV}`);
  console.log(`written=${OUTPUT_CSV}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
