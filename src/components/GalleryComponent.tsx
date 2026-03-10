"use client";

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, CheckCircle2, Loader2, MapPin, Navigation, Search, X } from 'lucide-react';
import { Stamp } from '../lib/data';
import { useStamps } from '../lib/useStamps';

import { ALL_GOSHUIN_SECTS, ALL_PREFECTURES, ALL_STAMPS } from '../lib/stamps';

type FilterTab = 'type' | 'prefecture' | 'goshuin';

interface Props {
  isActive?: boolean;
  onStampClick?: (stamp: Stamp) => void;
  onMapFocus?: (stamp: Stamp) => void;
}

const TYPE_OPTIONS = [
  { id: 'all', label: '全部' },
  { id: 'station', label: '车站印' },
  { id: 'scenic', label: '风景印' },
  { id: 'goshuin', label: '御朱印' },
] as const;

const GOSHUIN_PLACE_OPTIONS = [
  { id: 'all', label: '全部御朱印' },
  { id: 'shrine', label: '神社' },
  { id: 'temple', label: '寺庙' },
  { id: 'other', label: '未分类' },
] as const;

const GRID_GAP = 24;
const CARD_TEXT_HEIGHT = 124;
const OVERSCAN_ROWS = 3;
const GALLERY_SCROLL_KEY = 'stamptracker-gallery-scroll-top';

function getColumnCount(width: number) {
  if (width >= 1024) return 4;
  if (width >= 768) return 3;
  return 2;
}

function getGoshuinPlaceLabel(stamp: Stamp) {
  if (stamp.goshuinPlaceType === 'shrine') return '神社';
  if (stamp.goshuinPlaceType === 'temple') return '寺庙';
  if (stamp.goshuinPlaceType === 'other') return '未分类';
  return null;
}

function StampCard({
  stamp,
  isCollected,
  onStampClick,
  onMapFocus,
}: {
  stamp: Stamp;
  isCollected: boolean;
  onStampClick?: (stamp: Stamp) => void;
  onMapFocus?: (stamp: Stamp) => void;
}) {
  const goshuinPlaceLabel = stamp.type === 'goshuin' ? getGoshuinPlaceLabel(stamp) : null;

  return (
    <div
      onClick={() => onStampClick?.(stamp)}
      className={`group relative bg-white rounded-xl overflow-hidden transition-all duration-300 cursor-pointer ${
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
        <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
          <div className="bg-white/90 backdrop-blur-sm text-slate-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm">
            {stamp.type === 'station' ? '车站印' : stamp.type === 'scenic' ? '风景印' : '御朱印'}
          </div>
          {goshuinPlaceLabel && (
            <div className="bg-black/55 text-white px-2 py-1 rounded-md text-[10px] font-semibold shadow-sm">
              {goshuinPlaceLabel}
            </div>
          )}
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
        {stamp.type === 'goshuin' && (goshuinPlaceLabel || stamp.goshuinSect) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {goshuinPlaceLabel && (
              <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                {goshuinPlaceLabel}
              </span>
            )}
            {stamp.goshuinSect && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                {stamp.goshuinSect}
              </span>
            )}
          </div>
        )}
        <div className="flex items-start gap-1 mt-2 text-slate-500">
          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <p className="text-xs line-clamp-2 leading-relaxed">{stamp.address}</p>
        </div>
      </div>
    </div>
  );
}

export default function GalleryComponent({ isActive = true, onStampClick, onMapFocus }: Props) {
  const { collectedIds, count, isInitialized } = useStamps();
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>('all');
  const [activePrefFilter, setActivePrefFilter] = useState('all');
  const [activeGoshuinPlaceFilter, setActiveGoshuinPlaceFilter] = useState<string>('all');
  const [activeGoshuinSectFilter, setActiveGoshuinSectFilter] = useState('all');
  const [filterTab, setFilterTab] = useState<FilterTab>('type');
  const [searchQuery, setSearchQuery] = useState('');
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(720);
  const [gridWidth, setGridWidth] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const hasRestoredRef = useRef(false);

  const filteredStamps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return ALL_STAMPS.filter((stamp) => {
      const matchesType = activeTypeFilter === 'all' || stamp.type === activeTypeFilter;
      const matchesPref = activePrefFilter === 'all' || stamp.prefecture === activePrefFilter;
      const matchesGoshuinPlace =
        activeGoshuinPlaceFilter === 'all'
          ? true
          : stamp.type === 'goshuin' && (stamp.goshuinPlaceType ?? 'other') === activeGoshuinPlaceFilter;
      const matchesGoshuinSect =
        activeGoshuinSectFilter === 'all'
          ? true
          : stamp.type === 'goshuin' && (stamp.goshuinSect ?? '') === activeGoshuinSectFilter;
      const matchesSearch =
        q === '' ||
        stamp.name.toLowerCase().includes(q) ||
        stamp.description.toLowerCase().includes(q) ||
        stamp.address.toLowerCase().includes(q) ||
        (stamp.prefecture || '').toLowerCase().includes(q) ||
        (stamp.goshuinSect || '').toLowerCase().includes(q) ||
        (stamp.goshuinPlaceType || '').toLowerCase().includes(q);

      return matchesType && matchesPref && matchesGoshuinPlace && matchesGoshuinSect && matchesSearch;
    });
  }, [activeGoshuinPlaceFilter, activeGoshuinSectFilter, activePrefFilter, activeTypeFilter, searchQuery]);

  useEffect(() => {
    const updateMetrics = () => {
      if (scrollRef.current) {
        setViewportHeight(scrollRef.current.clientHeight);
      }
      if (gridRef.current) {
        setGridWidth(gridRef.current.clientWidth);
      }
    };

    updateMetrics();

    const observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => updateMetrics());

    if (scrollRef.current) observer?.observe(scrollRef.current);
    if (gridRef.current) observer?.observe(gridRef.current);

    window.addEventListener('resize', updateMetrics);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateMetrics);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || hasRestoredRef.current) return;

    const saved = Number(window.sessionStorage.getItem(GALLERY_SCROLL_KEY) ?? '0');
    if (Number.isFinite(saved) && saved > 0) {
      scrollRef.current?.scrollTo({ top: saved, behavior: 'auto' });
      setScrollTop(saved);
    }

    hasRestoredRef.current = true;
  }, []);

  useEffect(() => {
    if (!isActive || typeof window === 'undefined') return;

    const saved = Number(window.sessionStorage.getItem(GALLERY_SCROLL_KEY) ?? '0');
    if (Number.isFinite(saved) && scrollRef.current && Math.abs(scrollRef.current.scrollTop - saved) > 8) {
      scrollRef.current.scrollTo({ top: saved, behavior: 'auto' });
      setScrollTop(saved);
    }
  }, [isActive]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(GALLERY_SCROLL_KEY, String(scrollTop));
  }, [scrollTop]);

  useEffect(() => {
    setScrollTop(0);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(GALLERY_SCROLL_KEY, '0');
    }
  }, [activeGoshuinPlaceFilter, activeGoshuinSectFilter, activePrefFilter, activeTypeFilter, searchQuery, filterTab]);

  if (!isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>正在同步印章数据...</p>
      </div>
    );
  }

  const columnCount = getColumnCount(gridWidth || 1024);
  const columnGap = gridWidth >= 640 ? GRID_GAP : 16;
  const safeWidth = gridWidth || 1024;
  const cardWidth = Math.max(140, (safeWidth - columnGap * (columnCount - 1)) / columnCount);
  const rowHeight = cardWidth + CARD_TEXT_HEIGHT;
  const totalRows = Math.ceil(filteredStamps.length / columnCount);
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN_ROWS);
  const endRow = Math.min(totalRows, Math.ceil((scrollTop + viewportHeight) / rowHeight) + OVERSCAN_ROWS);
  const visibleStamps = filteredStamps.slice(startRow * columnCount, endRow * columnCount);
  const paddingTop = startRow * rowHeight;
  const totalHeight = totalRows * rowHeight;
  const showScrollTopButton = scrollTop > 1200;

  return (
    <div className="max-w-6xl mx-auto h-full min-h-0 flex flex-col relative">
      <div className="flex-none pb-6">
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
            placeholder="搜索印章名称、地点、描述、宗派..."
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

        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
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
          <button
            onClick={() => setFilterTab('goshuin')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              filterTab === 'goshuin'
                ? 'bg-slate-800 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            神社 / 寺庙 / 宗派
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

        {filterTab === 'goshuin' && (
          <div className="mb-4 space-y-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {GOSHUIN_PLACE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    setActiveGoshuinPlaceFilter(option.id);
                    if (activeTypeFilter === 'all') {
                      setActiveTypeFilter('goshuin');
                    }
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    activeGoshuinPlaceFilter === option.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <label className="text-xs font-medium text-slate-500 sm:min-w-16">宗派</label>
              <select
                value={activeGoshuinSectFilter}
                onChange={(e) => {
                  setActiveGoshuinSectFilter(e.target.value);
                  if (activeTypeFilter === 'all') {
                    setActiveTypeFilter('goshuin');
                  }
                }}
                className="w-full sm:max-w-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
              >
                <option value="all">全部宗派</option>
                {ALL_GOSHUIN_SECTS.map((sect) => (
                  <option key={sect} value={sect}>{sect}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        className="min-h-0 flex-1 overflow-y-auto pr-1"
      >
        <div ref={gridRef} className="relative" style={{ height: totalHeight || undefined }}>
          <div
            className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
            style={{
              gap: columnGap,
              paddingTop,
            }}
          >
            {visibleStamps.map((stamp) => (
              <StampCard
                key={stamp.id}
                stamp={stamp}
                isCollected={collectedIds.has(stamp.id)}
                onStampClick={onStampClick}
                onMapFocus={onMapFocus}
              />
            ))}
          </div>
          {filteredStamps.length === 0 && (
            <div className="absolute inset-x-0 top-0 py-16 text-center text-slate-400">
              没有匹配的印章。
            </div>
          )}
        </div>
      </div>

      {showScrollTopButton && (
        <button
          onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          className="absolute bottom-4 right-4 rounded-full bg-slate-900 text-white p-3 shadow-lg hover:bg-slate-700 transition-colors"
          aria-label="回到顶部"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
