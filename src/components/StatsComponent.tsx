"use client";

import { useMemo } from 'react';
import { Award, BarChart2, Loader2, MapPin, Stamp as StampIcon } from 'lucide-react';
import { useStamps } from '../lib/useStamps';
import { GOSHUIN_PLACE_TOTALS, PREFECTURE_TOTALS, STAMP_BY_ID, STAMP_COUNT, TYPE_TOTALS } from '../lib/stamps';

type PrefStats = {
  prefecture: string;
  total: number;
  collected: number;
};

type TypeStats = {
  type: 'scenic' | 'station' | 'goshuin';
  label: string;
  total: number;
  collected: number;
  color: string;
  bg: string;
};

type GoshuinPlaceStats = {
  key: 'shrine' | 'temple' | 'other';
  label: string;
  total: number;
  collected: number;
  color: string;
  bg: string;
};

const TYPE_BASE: Omit<TypeStats, 'total' | 'collected'>[] = [
  { type: 'scenic', label: '风景印', color: 'bg-red-500', bg: 'bg-red-50' },
  { type: 'station', label: '车站印', color: 'bg-emerald-500', bg: 'bg-emerald-50' },
  { type: 'goshuin', label: '御朱印', color: 'bg-purple-500', bg: 'bg-purple-50' },
];

const GOSHUIN_PLACE_BASE: Omit<GoshuinPlaceStats, 'total' | 'collected'>[] = [
  { key: 'shrine', label: '神社', color: 'bg-fuchsia-500', bg: 'bg-fuchsia-50' },
  { key: 'temple', label: '寺庙', color: 'bg-amber-500', bg: 'bg-amber-50' },
  { key: 'other', label: '未分类', color: 'bg-slate-500', bg: 'bg-slate-50' },
];

export default function StatsComponent() {
  const { collectedIds, count, isInitialized } = useStamps();

  const prefStats = useMemo<PrefStats[]>(() => {
    const collectedByPref = new Map<string, number>();

    for (const stampId of collectedIds) {
      const stamp = STAMP_BY_ID.get(stampId);
      if (!stamp) continue;
      const pref = stamp.prefecture || '未知';
      collectedByPref.set(pref, (collectedByPref.get(pref) ?? 0) + 1);
    }

    return Array.from(PREFECTURE_TOTALS.entries())
      .map(([prefecture, total]) => ({
        prefecture,
        total,
        collected: collectedByPref.get(prefecture) ?? 0,
      }))
      .sort((a, b) => b.collected - a.collected || a.prefecture.localeCompare(b.prefecture));
  }, [collectedIds]);

  const typeStats = useMemo<TypeStats[]>(() => {
    const collectedByType: Record<'scenic' | 'station' | 'goshuin', number> = {
      scenic: 0,
      station: 0,
      goshuin: 0,
    };

    for (const stampId of collectedIds) {
      const stamp = STAMP_BY_ID.get(stampId);
      if (!stamp) continue;
      collectedByType[stamp.type] += 1;
    }

    return TYPE_BASE.map((item) => ({
      ...item,
      total: TYPE_TOTALS[item.type],
      collected: collectedByType[item.type],
    }));
  }, [collectedIds]);

  const goshuinPlaceStats = useMemo<GoshuinPlaceStats[]>(() => {
    const collectedByPlace: Record<'shrine' | 'temple' | 'other', number> = {
      shrine: 0,
      temple: 0,
      other: 0,
    };

    for (const stampId of collectedIds) {
      const stamp = STAMP_BY_ID.get(stampId);
      if (!stamp || stamp.type !== 'goshuin') continue;
      const place = stamp.goshuinPlaceType ?? 'other';
      collectedByPlace[place] += 1;
    }

    return GOSHUIN_PLACE_BASE.map((item) => ({
      ...item,
      total: GOSHUIN_PLACE_TOTALS[item.key],
      collected: collectedByPlace[item.key],
    }));
  }, [collectedIds]);

  const overallPct = STAMP_COUNT > 0 ? (count / STAMP_COUNT) * 100 : 0;

  if (!isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>正在读取统计数据...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-24 space-y-6">
      <div className="flex items-center gap-3">
        <BarChart2 className="w-7 h-7 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-slate-800">收藏统计</h2>
          <p className="text-sm text-slate-500">你的印章收集进度</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-200">
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-blue-200 text-sm font-medium mb-1">总进度</p>
            <p className="text-5xl font-black">{count}</p>
            <p className="text-blue-200 text-sm mt-1">/ {STAMP_COUNT} 个</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-black">{overallPct.toFixed(1)}%</p>
            <p className="text-blue-200 text-sm mt-1">完成率</p>
          </div>
        </div>

        <div className="w-full bg-white/20 rounded-full h-3">
          <div
            className="h-3 rounded-full bg-white transition-all duration-700"
            style={{ width: `${Math.max(overallPct, count > 0 ? 2 : 0)}%` }}
          />
        </div>
      </div>

      <div>
        <h3 className="text-base font-bold text-slate-700 mb-3 flex items-center gap-2">
          <StampIcon className="w-4 h-4" /> 分类
        </h3>

        <div className="grid grid-cols-3 gap-3">
          {typeStats.map((t) => {
            const pct = t.total > 0 ? (t.collected / t.total) * 100 : 0;
            return (
              <div key={t.type} className={`${t.bg} rounded-xl p-4 text-center`}>
                <p className="text-2xl font-black text-slate-800">{t.collected}</p>
                <p className="text-xs text-slate-500 mt-0.5">/ {t.total}</p>
                <p className="text-xs font-semibold text-slate-600 mt-2">{t.label}</p>
                <div className="w-full bg-white/60 rounded-full h-1.5 mt-2">
                  <div
                    className={`h-1.5 rounded-full ${t.color} transition-all duration-700`}
                    style={{ width: `${Math.max(pct, t.collected > 0 ? 5 : 0)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-base font-bold text-slate-700 mb-3 flex items-center gap-2">
          <StampIcon className="w-4 h-4 text-purple-600" /> 御朱印拆分
        </h3>

        <div className="grid grid-cols-3 gap-3">
          {goshuinPlaceStats.map((t) => {
            const pct = t.total > 0 ? (t.collected / t.total) * 100 : 0;
            return (
              <div key={t.key} className={`${t.bg} rounded-xl p-4 text-center`}>
                <p className="text-2xl font-black text-slate-800">{t.collected}</p>
                <p className="text-xs text-slate-500 mt-0.5">/ {t.total}</p>
                <p className="text-xs font-semibold text-slate-600 mt-2">{t.label}</p>
                <div className="w-full bg-white/60 rounded-full h-1.5 mt-2">
                  <div
                    className={`h-1.5 rounded-full ${t.color} transition-all duration-700`}
                    style={{ width: `${Math.max(pct, t.collected > 0 ? 5 : 0)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {count > 0 && (
        <div>
          <h3 className="text-base font-bold text-slate-700 mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" /> TOP 都道府县
          </h3>
          <div className="space-y-2">
            {prefStats.filter((p) => p.collected > 0).slice(0, 3).map((p, i) => {
              const medals = ['🥇', '🥈', '🥉'];
              return (
                <div key={p.prefecture} className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm border border-slate-100">
                  <span className="text-xl">{medals[i]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{p.prefecture}</p>
                    <p className="text-xs text-slate-400">{p.collected} / {p.total}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-blue-600">{((p.collected / p.total) * 100).toFixed(0)}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-base font-bold text-slate-700 mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4" /> 都道府县进度
        </h3>

        <div className="space-y-2">
          {prefStats.map((p) => {
            const pct = p.total > 0 ? (p.collected / p.total) * 100 : 0;
            return (
              <div key={p.prefecture} className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-sm font-semibold ${p.collected > 0 ? 'text-slate-800' : 'text-slate-400'}`}>
                    {p.prefecture}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {p.collected} / {p.total}
                  </span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${Math.max(pct, p.collected > 0 ? 3 : 0)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {count === 0 && (
        <div className="text-center py-12 text-slate-400">
          <StampIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">还没有收集任何印章</p>
          <p className="text-sm mt-1">去地图页先打卡一个吧。</p>
        </div>
      )}
    </div>
  );
}
