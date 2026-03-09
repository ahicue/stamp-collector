import { readFileSync, writeFileSync } from 'fs';

const raw = readFileSync('./fuke_current.csv', 'utf-8').replace(/^\uFEFF/, '');
const lines = raw.split(/\r?\n/);
const headers = lines[0].replace(/"/g, '').split(',').map((h) => h.trim());

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

function parseStartYear(startDate) {
  const m = String(startDate ?? '').match(/(\d{4})/);
  if (!m) return null;
  const y = Number(m[1]);
  return Number.isNaN(y) ? null : y;
}

const records = [];
for (let i = 1; i < lines.length; i += 1) {
  const line = lines[i].trim();
  if (!line) continue;

  const cols = parseCsvLine(line);
  const obj = {};
  headers.forEach((h, idx) => {
    obj[h] = String(cols[idx] || '').trim();
  });

  const detailId = obj.detail_id;
  const lat = parseFloat(obj.latitude);
  const lng = parseFloat(obj.longitude);

  if (!detailId || !obj.name || !obj.prefecture) continue;
  if (Number.isNaN(lat) || Number.isNaN(lng)) continue;

  const startYear = parseStartYear(obj.start_date);
  records.push({ ...obj, detailId, lat, lng, startYear });
}

const uniqueById = new Map();
for (const r of records) {
  if (!uniqueById.has(r.detailId)) {
    uniqueById.set(r.detailId, r);
  }
}

const selected = Array.from(uniqueById.values()).sort((a, b) => Number(a.detailId) - Number(b.detailId));

console.log(`records_with_coordinates=${records.length}`);
console.log(`records_unique_detail_id=${selected.length}`);

const colors = ['b6e3f4', 'ffdfbf', 'd1e7dd', 'f8d7da', 'fcebc0'];

const entries = selected.map((r) => {
  const id = `fuke-${r.detailId}`;
  const seed = encodeURIComponent((r.name || '').substring(0, 16));
  const n = Number.parseInt(r.detailId, 10);
  const color = colors[Number.isNaN(n) ? 0 : n % colors.length];
  const escapedName = r.name.replace(/'/g, "\\'");
  const escapedPref = r.prefecture.replace(/'/g, "\\'");
  const escapedAddress = (r.address || '')
    .replace(/^〒\d{3}-\d{4}\s*/, '')
    .replace(/'/g, "\\'");
  const detailUrl = (r.detail_url || '').replace('/fuke//detail.php', '/fuke/detail.php').replace(/'/g, "\\'");
  const imageUrl = (r.image_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${seed}&backgroundColor=${color}`).replace(/'/g, "\\'");

  return `  {
    id: '${id}',
    name: '${escapedName}',
    type: 'scenic' as const,
    prefecture: '${escapedPref}',
    description: '${escapedPref}的风景印',
    lat: ${r.lat},
    lng: ${r.lng},
    imageUrl: '${imageUrl}',
    address: '${escapedAddress}',
    detailUrl: '${detailUrl}',
    startYear: ${r.startYear ?? 'undefined'}
  }`;
});

const tsContent = `// Auto-generated from fuke_current.csv
// Do not edit manually

import { Stamp } from './data';

export const FUKE_STAMPS: Stamp[] = [
${entries.join(',\n')}
];
`;

writeFileSync('./src/lib/fukeData.ts', tsContent, 'utf-8');
console.log('written=src/lib/fukeData.ts');
