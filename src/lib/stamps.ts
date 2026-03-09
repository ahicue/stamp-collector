import { INITIAL_STAMPS, type Stamp, type StampType } from './data';
import { FUKE_STAMPS } from './fukeData';

export const ALL_STAMPS: Stamp[] = [...INITIAL_STAMPS, ...FUKE_STAMPS];
export const STAMP_COUNT = ALL_STAMPS.length;

export const STAMP_BY_ID = new Map<string, Stamp>(
  ALL_STAMPS.map((stamp) => [stamp.id, stamp]),
);

export const ALL_PREFECTURES: string[] = Array.from(
  new Set(ALL_STAMPS.map((stamp) => stamp.prefecture).filter((pref): pref is string => Boolean(pref))),
).sort();

export const TYPE_TOTALS: Record<StampType, number> = {
  scenic: 0,
  station: 0,
  goshuin: 0,
};

export const PREFECTURE_TOTALS = new Map<string, number>();

for (const stamp of ALL_STAMPS) {
  TYPE_TOTALS[stamp.type] += 1;

  const prefecture = stamp.prefecture || '未知';
  PREFECTURE_TOTALS.set(prefecture, (PREFECTURE_TOTALS.get(prefecture) ?? 0) + 1);
}
