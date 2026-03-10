import { existsSync, readFileSync, writeFileSync } from 'fs';

const HOTOKAMI_BASE = 'https://hotokami.jp';
const LIST_ROOT = `${HOTOKAMI_BASE}/goshuin/`;
const GSI_ADDRESS_SEARCH = 'https://msearch.gsi.go.jp/address-search/AddressSearch';

const OUTPUT_CSV = './goshuin_current.csv';
const OUTPUT_TS = './src/lib/goshuinData.ts';
const GEOCODE_CACHE = './goshuin_geocode_cache.json';

const LIST_CONCURRENCY = 4;
const GEOCODE_CONCURRENCY = 8;
const RETRIES = 2;

const TEMPLE_SECT_PATTERNS = [
  '高野山真言宗',
  '真言宗智山派',
  '真言宗豊山派',
  '浄土真宗本願寺派',
  '浄土真宗大谷派',
  '浄土真宗',
  '浄土宗',
  '臨済宗妙心寺派',
  '臨済宗建仁寺派',
  '臨済宗南禅寺派',
  '臨済宗東福寺派',
  '臨済宗円覚寺派',
  '臨済宗',
  '曹洞宗',
  '日蓮宗',
  '法華宗',
  '華厳宗',
  '北法相宗',
  '法相宗',
  '黄檗宗',
  '融通念仏宗',
  '時宗',
  '天台宗',
  '真言宗',
  '聖観音宗',
  'チベット仏教',
  '単立',
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

function stripTags(value) {
  return decodeHtml(String(value ?? '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeTs(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function toCsvCell(value) {
  const normalized = String(value ?? '').replace(/\r?\n|\r/g, ' ').trim();
  return `"${normalized.replace(/"/g, '""')}"`;
}

function toSlugId(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function extractBestImageFromSrcset(srcset) {
  const candidates = String(srcset ?? '')
    .split(',')
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean);

  return candidates.at(-1) ?? candidates[0] ?? '';
}

function extractImageUrl(block) {
  const srcsetMatches = [...block.matchAll(/srcset="([^"]+)"/g)];
  for (const match of srcsetMatches) {
    const best = extractBestImageFromSrcset(match[1]);
    if (best) return decodeHtml(best);
  }

  const src = block.match(/<img[^>]+src="([^"]+)"/i)?.[1] ?? '';
  return decodeHtml(src);
}

function extractPageUpdatedAt(html) {
  const value = html.match(/<time datetime="([0-9]{4}-[0-9]{2}-[0-9]{2})">[^<]*<\/time>更新/)?.[1] ?? '';
  return value || undefined;
}

function classifyGoshuinPlace(name) {
  const normalized = String(name ?? '');

  if (/(寺|院|庵|坊|堂|仏教寺院|観音|不動|薬師|阿弥陀|地蔵)/.test(normalized)) {
    return 'temple';
  }

  if (/(神社|神宮|大社|八幡宮|八幡社|天満宮|天神社|稲荷社|稲荷神社|護國神社|護国神社|熊野社|住吉社|明神|宮|社)/.test(normalized)) {
    return 'shrine';
  }

  return 'other';
}

function extractGoshuinSect(name) {
  const normalized = String(name ?? '');
  for (const pattern of TEMPLE_SECT_PATTERNS) {
    if (normalized.includes(pattern)) {
      return pattern;
    }
  }

  if (normalized.includes('チベット仏教寺院')) return 'チベット仏教';
  return undefined;
}

async function fetchText(url) {
  let lastError = null;

  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; StampCollectorBot/1.0)',
        },
      });
      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      lastError = error;
      await sleep(500 * (attempt + 1));
    }
  }

  throw lastError;
}

async function fetchJson(url) {
  const text = await fetchText(url);
  return JSON.parse(text);
}

function extractPrefectureSlugs(html) {
  const matches = [...html.matchAll(/href="\/goshuin\/([^"/?#]+)\/"/g)];
  const blocked = new Set(['new', 'area', 'ranking', 'search', 'nearby', 'map']);
  const slugs = [];

  for (const match of matches) {
    const slug = match[1];
    if (!slug || blocked.has(slug)) continue;
    if (!slugs.includes(slug)) slugs.push(slug);
  }

  return slugs;
}

function extractPrefectureName(html, slug) {
  const title = stripTags(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '');
  const match = title.match(/^(.+?)の御朱印/);
  if (match) return match[1];
  return slug;
}

function normalizeAddress(prefecture, address) {
  const clean = stripTags(address).replace(/^〒?\d{3}-?\d{4}\s*/, '').trim();
  if (!clean) return prefecture;
  if (clean.startsWith(prefecture)) return clean;
  return `${prefecture}${clean}`;
}

function parseSpotCards(html, prefecture, sourceUpdatedAt) {
  const markers = [...html.matchAll(/id="spot(\d+)"/g)];
  const rows = [];

  for (let i = 0; i < markers.length; i += 1) {
    const start = markers[i].index ?? 0;
    const end = i + 1 < markers.length ? (markers[i + 1].index ?? html.length) : html.length;
    const block = html.slice(start, end);

    const detailId = markers[i][1];
    const addressRaw = decodeHtml(block.match(/data-address-value="([^"]*)"/)?.[1] ?? '');
    const detailPath = decodeHtml(block.match(/data-clickable-spot-url-value="([^"]+)"/)?.[1] ?? '');
    const name = stripTags(block.match(/data-name-value="([^"]+)"/)?.[1] ?? '');
    const imageUrl = extractImageUrl(block);
    const limitedText = stripTags(block.match(/限定御朱印:\s*<\/b>\s*([^<\s]+)/)?.[1] ?? '');

    if (!detailId || !name || !detailPath) continue;

    const address = normalizeAddress(prefecture, addressRaw);
    const detailUrl = detailPath.startsWith('http') ? detailPath : `${HOTOKAMI_BASE}${detailPath}`;
    const isLimited = limitedText === 'あり' ? true : limitedText === '-' || limitedText === 'なし' ? false : undefined;
    const goshuinPlaceType = classifyGoshuinPlace(name);
    const goshuinSect = goshuinPlaceType === 'temple' ? extractGoshuinSect(name) : undefined;

    rows.push({
      detail_id: detailId,
      name,
      prefecture,
      address,
      detail_url: detailUrl,
      image_url: imageUrl,
      is_limited: isLimited,
      source_updated_at: sourceUpdatedAt,
      goshuin_place_type: goshuinPlaceType,
      goshuin_sect: goshuinSect,
    });
  }

  return rows;
}

async function crawlPrefecture(slug) {
  const firstHtml = await fetchText(`${LIST_ROOT}${slug}/?page=1`);
  const prefecture = extractPrefectureName(firstHtml, slug);
  const sourceUpdatedAt = extractPageUpdatedAt(firstHtml);
  const rows = [];

  for (let page = 1; page <= 999; page += 1) {
    const html = page === 1 ? firstHtml : await fetchText(`${LIST_ROOT}${slug}/?page=${page}`);
    const pageRows = parseSpotCards(html, prefecture, sourceUpdatedAt);
    if (pageRows.length === 0) break;
    rows.push(...pageRows);
  }

  return rows;
}

function loadGeocodeCache() {
  if (!existsSync(GEOCODE_CACHE)) return {};

  try {
    return JSON.parse(readFileSync(GEOCODE_CACHE, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return {};
  }
}

async function geocodeAddress(address, cache) {
  if (hasOwn(cache, address)) return cache[address];

  const url = `${GSI_ADDRESS_SEARCH}?q=${encodeURIComponent(address)}`;

  try {
    const data = await fetchJson(url);
    const first = Array.isArray(data) ? data[0] : null;
    const coordinates = first?.geometry?.coordinates;

    if (Array.isArray(coordinates) && coordinates.length >= 2) {
      const result = {
        lng: Number(coordinates[0]),
        lat: Number(coordinates[1]),
      };

      if (Number.isFinite(result.lat) && Number.isFinite(result.lng)) {
        cache[address] = result;
        return result;
      }
    }
  } catch {}

  cache[address] = null;
  return null;
}

function buildDescription(row) {
  const placeLabel = row.goshuin_place_type === 'shrine'
    ? '神社'
    : row.goshuin_place_type === 'temple'
      ? '寺庙'
      : '未分类';
  const parts = [`${row.name}的御朱印`, placeLabel];
  if (row.goshuin_sect) parts.push(`宗派:${row.goshuin_sect}`);
  if (row.isLimited === true) parts.push('限定');
  if (row.sourceUpdatedAt) parts.push(`来源更新:${row.sourceUpdatedAt}`);
  return parts.join(' | ');
}

function buildTsContent(records) {
  const entries = records.map((record) => `  {
    id: '${escapeTs(record.id)}',
    name: '${escapeTs(record.name)}',
    type: 'goshuin' as const,
    prefecture: '${escapeTs(record.prefecture)}',
    description: '${escapeTs(record.description)}',
    lat: ${record.lat},
    lng: ${record.lng},
    imageUrl: '${escapeTs(record.imageUrl)}',
    address: '${escapeTs(record.address)}',
    detailUrl: '${escapeTs(record.detailUrl)}',
    isLimited: ${record.isLimited === undefined ? 'undefined' : record.isLimited ? 'true' : 'false'},
    sourceUpdatedAt: ${record.sourceUpdatedAt ? `'${escapeTs(record.sourceUpdatedAt)}'` : 'undefined'},
    goshuinPlaceType: '${escapeTs(record.goshuinPlaceType)}',
    goshuinSect: ${record.goshuinSect ? `'${escapeTs(record.goshuinSect)}'` : 'undefined'}
  }`);

  return `// Auto-generated from Hotokami goshuin pages
// Do not edit manually

import { Stamp } from './data';

export const GOSHUIN_STAMPS: Stamp[] = [
${entries.join(',\n')}
];
`;
}

async function runWorkers(items, concurrency, worker) {
  let cursor = 0;

  async function runOne() {
    while (true) {
      const index = cursor;
      cursor += 1;

      if (index >= items.length) return;
      await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => runOne()));
}

async function main() {
  const indexHtml = await fetchText(LIST_ROOT);
  const slugs = extractPrefectureSlugs(indexHtml);

  if (slugs.length === 0) {
    throw new Error('No prefecture slugs found on Hotokami goshuin index page');
  }

  const collected = [];

  await runWorkers(slugs, LIST_CONCURRENCY, async (slug) => {
    const rows = await crawlPrefecture(slug);
    collected.push(...rows);
    console.log(`pref=${slug} rows=${rows.length}`);
  });

  const uniqueByDetailId = new Map();
  for (const row of collected) {
    const current = uniqueByDetailId.get(row.detail_id);
    if (!current) {
      uniqueByDetailId.set(row.detail_id, row);
      continue;
    }

    uniqueByDetailId.set(row.detail_id, {
      ...current,
      image_url: current.image_url || row.image_url,
      is_limited: current.is_limited ?? row.is_limited,
      source_updated_at: current.source_updated_at || row.source_updated_at,
      goshuin_place_type: current.goshuin_place_type === 'other' ? row.goshuin_place_type : current.goshuin_place_type,
      goshuin_sect: current.goshuin_sect || row.goshuin_sect,
    });
  }

  const deduped = Array.from(uniqueByDetailId.values()).sort(
    (a, b) => a.prefecture.localeCompare(b.prefecture, 'ja') || a.name.localeCompare(b.name, 'ja'),
  );

  const geocodeCache = loadGeocodeCache();
  const geocoded = [];

  await runWorkers(deduped, GEOCODE_CONCURRENCY, async (row, index) => {
    const coords = await geocodeAddress(row.address, geocodeCache);
    if (coords) {
      geocoded.push({ ...row, ...coords });
    }

    if ((index + 1) % 200 === 0 || index + 1 === deduped.length) {
      console.log(`geocoded=${geocoded.length}/${index + 1}`);
    }
  });

  writeFileSync(GEOCODE_CACHE, `${JSON.stringify(geocodeCache, null, 2)}\n`, 'utf8');

  const records = geocoded
    .map((row) => ({
      id: `goshuin-${row.detail_id}-${toSlugId(row.name)}`,
      name: `${row.name} 御朱印`,
      prefecture: row.prefecture,
      description: buildDescription(row),
      lat: row.lat,
      lng: row.lng,
      imageUrl: row.image_url || 'https://images.unsplash.com/photo-1513407030348-c983a97b98d8?w=400&q=80',
      address: row.address,
      detailUrl: row.detail_url,
      isLimited: row.is_limited,
      sourceUpdatedAt: row.source_updated_at,
      goshuinPlaceType: row.goshuin_place_type,
      goshuinSect: row.goshuin_sect,
    }))
    .sort((a, b) => a.prefecture.localeCompare(b.prefecture, 'ja') || a.name.localeCompare(b.name, 'ja'));

  const csvHeader = [
    'id',
    'name',
    'prefecture',
    'description',
    'lat',
    'lng',
    'imageUrl',
    'address',
    'detailUrl',
    'isLimited',
    'sourceUpdatedAt',
    'goshuinPlaceType',
    'goshuinSect',
  ];
  const csvLines = [csvHeader.map(toCsvCell).join(',')];
  for (const record of records) {
    csvLines.push([
      record.id,
      record.name,
      record.prefecture,
      record.description,
      record.lat,
      record.lng,
      record.imageUrl,
      record.address,
      record.detailUrl,
      record.isLimited === undefined ? '' : record.isLimited,
      record.sourceUpdatedAt ?? '',
      record.goshuinPlaceType,
      record.goshuinSect ?? '',
    ].map(toCsvCell).join(','));
  }

  writeFileSync(OUTPUT_CSV, `${csvLines.join('\n')}\n`, 'utf8');
  writeFileSync(OUTPUT_TS, buildTsContent(records), 'utf8');

  const summary = records.reduce((acc, record) => {
    acc[record.goshuinPlaceType] = (acc[record.goshuinPlaceType] ?? 0) + 1;
    return acc;
  }, { shrine: 0, temple: 0, other: 0 });

  console.log(`records=${records.length} shrine=${summary.shrine} temple=${summary.temple} other=${summary.other}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
