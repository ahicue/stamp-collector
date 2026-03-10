import { INITIAL_STAMPS, type GoshuinPlaceType, type Stamp, type StampType } from './data';
import { FUKE_STAMPS } from './fukeData';
import { GOSHUIN_STAMPS } from './goshuinData';
import { STATION_STAMPS } from './stationData';

const BASE_STAMPS = INITIAL_STAMPS.filter((stamp) => stamp.type !== 'station' && stamp.type !== 'goshuin');

export const ALL_STAMPS: Stamp[] = [...BASE_STAMPS, ...FUKE_STAMPS, ...GOSHUIN_STAMPS, ...STATION_STAMPS];
export const STAMP_COUNT = ALL_STAMPS.length;

export const STAMP_BY_ID = new Map<string, Stamp>(
  ALL_STAMPS.map((stamp) => [stamp.id, stamp]),
);

export const ALL_PREFECTURES: string[] = Array.from(
  new Set(ALL_STAMPS.map((stamp) => stamp.prefecture).filter((pref): pref is string => Boolean(pref))),
).sort();

export const ALL_GOSHUIN_SECTS: string[] = Array.from(
  new Set(
    ALL_STAMPS
      .filter((stamp) => stamp.type === 'goshuin' && stamp.goshuinSect)
      .map((stamp) => stamp.goshuinSect as string),
  ),
).sort((a, b) => a.localeCompare(b, 'ja'));

export const TYPE_TOTALS: Record<StampType, number> = {
  scenic: 0,
  station: 0,
  goshuin: 0,
};

export const GOSHUIN_PLACE_TOTALS: Record<GoshuinPlaceType, number> = {
  shrine: 0,
  temple: 0,
  other: 0,
};

export const PREFECTURE_TOTALS = new Map<string, number>();

for (const stamp of ALL_STAMPS) {
  TYPE_TOTALS[stamp.type] += 1;

  if (stamp.type === 'goshuin') {
    GOSHUIN_PLACE_TOTALS[stamp.goshuinPlaceType ?? 'other'] += 1;
  }

  const prefecture = stamp.prefecture || '未知';
  PREFECTURE_TOTALS.set(prefecture, (PREFECTURE_TOTALS.get(prefecture) ?? 0) + 1);
}
