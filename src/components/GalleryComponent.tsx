"use client";

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { CheckCircle2, Loader2, MapPin, Navigation, Search, X } from 'lucide-react';
import { Stamp } from '../lib/data';
import { useStamps } from '../lib/useStamps';

import { ALL_PREFECTURES, ALL_STAMPS } from '../lib/stamps';

type FilterTab = 'type' | 'prefecture';

interface Props {
  onStampClick?: (stamp: Stamp) => void;
  onMapFocus?: (stamp: Stamp) => void;
}

const TYPE_OPTIONS = [
  { id: 'all', label: '全部' },
  { id: 'station', label: '车站印' },
  { id: 'scenic', label: '风景印' },
  { id: 'goshuin', label: '御朱印' },
] as const;

export default function GalleryComponent({ onStampClick, onMapFocus }: Props) {
  const { collectedIds, count, isInitialized } = useStamps();
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>('all');
  const [activePrefFilter, setActivePrefFilter] = useState('all');
  const [filterTab, setFilterTab] = useState<FilterTab>('type');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStamps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return ALL_STAMPS.filter((stamp) => {
      const matchesType = activeTypeFilter === 'all' || stamp.type === activeTypeFilter;
      const matchesPref = activePrefFilter === 'all' || stamp.prefecture === activePrefFilter;
      const matchesSearch =
        q === '' ||
        stamp.name.toLowerCase().includes(q) ||
        stamp.description.toLowerCase().includes(q) ||
        stamp.address.toLowerCase().includes(q) ||
        (stamp.prefecture || '').toLowerCase().includes(q);

      return matchesType && matchesPref && matchesSearch;
    });
  }, [activePrefFilter, activeTypeFilter, searchQuery]);

  if (!isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>正在同步印章数据...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">我的收藏册</h2>
          <p className="text-sm text-slate-500 mt-1">
            已收集 {count} / {ALL_STAMPS.length} 个印章
          </p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索印章名称、地点或描述..."
          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setFilterTab('type')}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
            filterTab === 'type'
              ? 'bg-slate-800 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          按类别
        </button>
        <button
          onClick={() => setFilterTab('prefecture')}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
            filterTab === 'prefecture'
              ? 'bg-slate-800 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          按都道府县
        </button>
      </div>

      {filterTab === 'type' && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 hide-scrollbar">
          {TYPE_OPTIONS.map((type) => (
            <button
              key={type.id}
              onClick={() => setActiveTypeFilter(type.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeTypeFilter === type.id
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      )}

      {filterTab === 'prefecture' && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActivePrefFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activePrefFilter === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              全部
            </button>
            {ALL_PREFECTURES.map((pref) => (
              <button
                key={pref}
                onClick={() => setActivePrefFilter(pref)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  activePrefFilter === pref
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {pref}
              </button>
            ))}
          </div>
        </div>
      )}

      {(searchQuery || activePrefFilter !== 'all' || activeTypeFilter !== 'all') && (
        <p className="text-sm text-slate-500 mb-4">
          找到 <span className="font-semibold text-slate-700">{filteredStamps.length}</span> 个印章
        </p>
      )}

      {filteredStamps.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Search className="w-10 h-10 mb-3 opacity-40" />
          <p className="font-medium">没有找到相关印章</p>
          <p className="text-sm mt-1">试试其他关键词或筛选条件？</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {filteredStamps.map((stamp) => {
          const isCollected = collectedIds.has(stamp.id);

          return (
            <div
              key={stamp.id}
              onClick={() => onStampClick?.(stamp)}
              className={`group bg-white rounded-xl overflow-hidden transition-all duration-300 cursor-pointer ${
                isCollected
                  ? 'border border-blue-100 shadow-md hover:shadow-xl hover:-translate-y-0.5'
                  : 'border border-slate-100 shadow-sm opacity-70 grayscale hover:grayscale-[50%] hover:shadow-md'
              }`}
            >
              <div className="relative aspect-square overflow-hidden bg-slate-100">
                <Image
                  src={stamp.imageUrl}
                  alt={stamp.name}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  className={`object-cover transition-transform duration-500 ${isCollected ? 'group-hover:scale-105' : ''}`}
                />
                {isCollected && (
                  <div className="absolute top-2 right-2 bg-blue-500 text-white p-1.5 rounded-full shadow-sm">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
                <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-slate-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm">
                  {stamp.type === 'station' ? '车站印' : stamp.type === 'scenic' ? '风景印' : '御朱印'}
                </div>
                {stamp.prefecture && (
                  <div className="absolute bottom-2 right-2 bg-black/50 text-white px-1.5 py-0.5 rounded text-[9px] font-medium">
                    {stamp.prefecture}
                  </div>
                )}
              </div>

              <div className="absolute inset-0 flex items-end justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMapFocus?.(stamp);
                  }}
                  className="bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg hover:bg-blue-700"
                >
                  <Navigation className="w-3 h-3" />
                  地图查看
                </button>
              </div>

              <div className="p-3 sm:p-4">
                <h3 className={`font-bold text-sm sm:text-base line-clamp-1 ${isCollected ? 'text-slate-800' : 'text-slate-600'}`}>
                  {stamp.name}
                </h3>
                <div className="flex items-start gap-1 mt-2 text-slate-500">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <p className="text-xs line-clamp-2 leading-relaxed">{stamp.address}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

