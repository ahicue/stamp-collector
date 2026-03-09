import { writeFileSync } from 'fs';

const BASE = 'https://www.post.japanpost.jp/kitte_hagaki/stamp/fuke';
const PREF_IDS = Array.from({ length: 47 }, (_, i) => i + 1);
const RETRIES = 2;
const CONCURRENCY = 6;

const OUTPUT_CSV = './fuke_recollect_all.csv';
const OUTPUT_TXT = './fuke_by_prefecture.txt';
const OUTPUT_JSON = './fuke_by_prefecture.json';

function stripHtml(text) {
  return text
    .replace(/<br\s*\/?>(\s*)/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;?/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function toCsvCell(value) {
  const s = String(value ?? '').replace(/\r?\n|\r/g, ' ').trim();
  return `"${s.replace(/"/g, '""')}"`;
}

async function fetchWithRetry(url) {
  let lastError = null;
  for (let i = 0; i <= RETRIES; i += 1) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StampCollectorBot/1.0)' },
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastError;
}

function parsePosts(html) {
  const posts = [];
  const rePost = /<div class="post">([\s\S]*?)<\/div><!-- \/\.post -->/g;
  let m = rePost.exec(html);

  while (m) {
    const block = m[1];
    const id = block.match(/detail\.php\?id=(\d+)/)?.[1] ?? '';
    const name = stripHtml(block.match(/<dd class="title">([\s\S]*?)<\/dd>/)?.[1] ?? '');
    const prefecture = stripHtml(block.match(/<li class="pre">([\s\S]*?)<\/li>/)?.[1] ?? '');
    const startDate = stripHtml(block.match(/<span class="date">([\s\S]*?)<\/span>/)?.[1] ?? '').replace(/\u00a0/g, '').trim();
    const statusText = stripHtml(block.match(/<dd class="(?:obsolescent|abolition)">([\s\S]*?)<\/dd>/)?.[1] ?? '');

    if (id && name && prefecture) {
      posts.push({
        detail_id: id,
        name,
        prefecture,
        start_date: startDate,
        status_text: statusText,
        detail_url: `${BASE}/detail.php?id=${id}`,
      });
    }

    m = rePost.exec(html);
  }

  return posts;
}

async function crawlPref(prefId) {
  const all = [];

  for (let page = 1; page <= 999; page += 1) {
    const url = `${BASE}/item.php?pref_id=${prefId}&page=${page}`;
    const html = await fetchWithRetry(url);
    const posts = parsePosts(html);
    if (posts.length === 0) break;

    all.push(...posts);
  }

  return all;
}

async function run() {
  const tasks = [...PREF_IDS];
  const collected = [];

  let cursor = 0;
  async function worker() {
    while (true) {
      const idx = cursor;
      cursor += 1;
      if (idx >= tasks.length) return;

      const prefId = tasks[idx];
      const rows = await crawlPref(prefId);
      collected.push(...rows);
      console.log(`pref_id=${prefId} rows=${rows.length}`);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const unique = new Map();
  for (const row of collected) {
    if (!unique.has(row.detail_id)) unique.set(row.detail_id, row);
  }
  const rows = Array.from(unique.values()).sort((a, b) => Number(a.detail_id) - Number(b.detail_id));

  const headers = ['detail_id', 'name', 'prefecture', 'start_date', 'status_text', 'detail_url'];
  const csvLines = [headers.map(toCsvCell).join(',')];
  for (const row of rows) {
    csvLines.push(headers.map((h) => toCsvCell(row[h])).join(','));
  }
  writeFileSync(OUTPUT_CSV, `\uFEFF${csvLines.join('\n')}\n`, 'utf8');

  const byPref = new Map();
  for (const row of rows) {
    if (!byPref.has(row.prefecture)) byPref.set(row.prefecture, []);
    byPref.get(row.prefecture).push(row);
  }

  const prefNames = Array.from(byPref.keys()).sort((a, b) => a.localeCompare(b, 'ja'));

  const txtLines = [];
  txtLines.push(`全量重爬时间: ${new Date().toISOString()}`);
  txtLines.push(`总记录数: ${rows.length}`);
  txtLines.push('');

  for (const pref of prefNames) {
    const list = byPref.get(pref);
    txtLines.push(`## ${pref} (${list.length})`);
    for (const r of list) {
      txtLines.push(`- [${r.detail_id}] ${r.name} | 开始:${r.start_date || '-'} | 状态:${r.status_text || '-'} | ${r.detail_url}`);
    }
    txtLines.push('');
  }

  writeFileSync(OUTPUT_TXT, `\uFEFF${txtLines.join('\n')}\n`, 'utf8');
  writeFileSync(
    OUTPUT_JSON,
    `\uFEFF${JSON.stringify(Object.fromEntries(prefNames.map((p) => [p, byPref.get(p)])), null, 2)}`,
    'utf8',
  );

  console.log(`done total=${rows.length} prefectures=${prefNames.length}`);
  console.log(`written ${OUTPUT_CSV}`);
  console.log(`written ${OUTPUT_TXT}`);
  console.log(`written ${OUTPUT_JSON}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
