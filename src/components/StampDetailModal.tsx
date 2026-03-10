"use client";

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { CalendarDays, CheckCircle2, ExternalLink, Landmark, MapPin, Stamp, Tag, X } from 'lucide-react';
import type { Stamp as StampType } from '../lib/data';
import { useStamps } from '../lib/useStamps';

interface Props {
  stamp: StampType | null;
  onClose: () => void;
}

const TYPE_CONFIG = {
  station: { label: '车站印', textColor: 'text-emerald-700', bg: 'bg-emerald-50' },
  scenic: { label: '风景印', textColor: 'text-red-700', bg: 'bg-red-50' },
  goshuin: { label: '御朱印', textColor: 'text-purple-700', bg: 'bg-purple-50' },
};

function getGoshuinPlaceLabel(stamp: StampType) {
  if (stamp.goshuinPlaceType === 'shrine') return '神社';
  if (stamp.goshuinPlaceType === 'temple') return '寺庙';
  if (stamp.goshuinPlaceType === 'other') return '未分类';
  return null;
}

export default function StampDetailModal({ stamp, onClose }: Props) {
  const { isCollected, checkInStamp } = useStamps();
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = stamp ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [stamp]);

  if (!stamp) return null;

  const collected = isCollected(stamp.id);
  const typeConf = TYPE_CONFIG[stamp.type];
  const goshuinPlaceLabel = stamp.type === 'goshuin' ? getGoshuinPlaceLabel(stamp) : null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
        <div className="relative h-52 sm:h-60 bg-slate-100">
          <Image
            src={stamp.imageUrl}
            alt={stamp.name}
            fill
            sizes="(max-width: 640px) 100vw, 448px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-white/20 backdrop-blur-md text-white p-2 rounded-full hover:bg-white/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {collected && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
              <CheckCircle2 className="w-3.5 h-3.5" />
              已收集
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h2 className="text-white font-bold text-xl leading-tight drop-shadow-lg">{stamp.name}</h2>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${typeConf.bg} ${typeConf.textColor}`}>
              {typeConf.label}
            </span>
            {stamp.prefecture && (
              <span className="text-xs font-medium px-3 py-1 rounded-full bg-slate-100 text-slate-600">
                {stamp.prefecture}
              </span>
            )}
            {goshuinPlaceLabel && (
              <span className="text-xs font-medium px-3 py-1 rounded-full bg-purple-100 text-purple-700">
                {goshuinPlaceLabel}
              </span>
            )}
            {stamp.goshuinSect && (
              <span className="text-xs font-medium px-3 py-1 rounded-full bg-amber-50 text-amber-700">
                {stamp.goshuinSect}
              </span>
            )}
            {stamp.type === 'goshuin' && stamp.isLimited !== undefined && (
              <span className={`text-xs font-medium px-3 py-1 rounded-full ${stamp.isLimited ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                {stamp.isLimited ? '限定御朱印' : '非限定'}
              </span>
            )}
          </div>

          <div className="flex items-start gap-2 text-slate-500">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" />
            <p className="text-sm leading-relaxed">{stamp.address}</p>
          </div>

          {stamp.type === 'goshuin' && (goshuinPlaceLabel || stamp.goshuinSect || stamp.isLimited !== undefined || stamp.sourceUpdatedAt) && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
              {goshuinPlaceLabel && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Landmark className="w-4 h-4 text-slate-400" />
                  <span>{goshuinPlaceLabel}</span>
                </div>
              )}
              {stamp.goshuinSect && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Tag className="w-4 h-4 text-slate-400" />
                  <span>宗派 {stamp.goshuinSect}</span>
                </div>
              )}
              {stamp.isLimited !== undefined && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Tag className="w-4 h-4 text-slate-400" />
                  <span>{stamp.isLimited ? '限定御朱印あり' : '限定信息なし'}</span>
                </div>
              )}
              {stamp.sourceUpdatedAt && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CalendarDays className="w-4 h-4 text-slate-400" />
                  <span>来源更新时间 {stamp.sourceUpdatedAt}</span>
                </div>
              )}
            </div>
          )}

          <p className="text-sm text-slate-600 leading-relaxed">{stamp.description}</p>

          <div className="flex flex-col gap-3 pt-1">
            <button
              disabled={collected}
              onClick={() => checkInStamp(stamp.id)}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                collected
                  ? 'bg-slate-100 text-slate-400 cursor-default'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-md shadow-blue-200'
              }`}
            >
              <Stamp className="w-4 h-4" />
              {collected ? '已收集' : '打卡盖章（收集）'}
            </button>

            {stamp.detailUrl && (
              <a
                href={stamp.detailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                打开来源详情
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
