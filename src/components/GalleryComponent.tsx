"use client";

import { useState, useEffect } from 'react';
import { INITIAL_STAMPS, Stamp } from '../lib/data';
import { CheckCircle2, MapPin } from 'lucide-react';

export default function GalleryComponent() {
  // Temporary state for collected stamps (will eventually come from DB/LocalStorage)
  const [collectedIds, setCollectedIds] = useState<Set<string>>(new Set(['tokyo-station']));

  const types = [
    { id: 'all', label: '全部' },
    { id: 'station', label: '车站印' },
    { id: 'scenic', label: '风景印' },
    { id: 'goshuin', label: '御朱印' }
  ];

  const [activeFilter, setActiveFilter] = useState('all');

  const filteredStamps = INITIAL_STAMPS.filter(stamp => 
    activeFilter === 'all' ? true : stamp.type === activeFilter
  );

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">我的收集册</h2>
          <p className="text-sm text-slate-500 mt-1">
            已收集 {collectedIds.size} / {INITIAL_STAMPS.length} 个印章
          </p>
        </div>
        
        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
          {types.map(type => (
            <button
              key={type.id}
              onClick={() => setActiveFilter(type.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeFilter === type.id
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {filteredStamps.map((stamp) => {
          const isCollected = collectedIds.has(stamp.id);
          
          return (
            <div 
              key={stamp.id} 
              className={`group bg-white rounded-xl overflow-hidden transition-all duration-300 ${
                isCollected 
                  ? 'border border-blue-100 shadow-md hover:shadow-lg' 
                  : 'border border-slate-100 shadow-sm opacity-70 grayscale hover:grayscale-[50%]'
              }`}
            >
              {/* Image Header */}
              <div className="relative aspect-square overflow-hidden bg-slate-100">
                <img 
                  src={stamp.imageUrl} 
                  alt={stamp.name}
                  className={`w-full h-full object-cover transition-transform duration-500 ${
                    isCollected ? 'group-hover:scale-105' : ''
                  }`}
                />
                
                {/* Visual Status Badges */}
                {isCollected && (
                  <div className="absolute top-2 right-2 bg-blue-500 text-white p-1.5 rounded-full shadow-sm">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
                
                {/* Type Badge */}
                <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-slate-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm">
                  {stamp.type === 'station' ? '车站印' : stamp.type === 'scenic' ? '风景印' : '御朱印'}
                </div>
              </div>
              
              {/* Content Body */}
              <div className="p-3 sm:p-4">
                <h3 className={`font-bold text-sm sm:text-base line-clamp-1 ${
                  isCollected ? 'text-slate-800' : 'text-slate-600'
                }`}>
                  {stamp.name}
                </h3>
                
                <div className="flex items-start gap-1 mt-2 text-slate-500">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <p className="text-xs line-clamp-2 leading-relaxed">
                    {stamp.address}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
