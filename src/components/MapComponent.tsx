"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { CheckCircle, Filter } from 'lucide-react';
import { Stamp, StampType } from '../lib/data';
import { useStamps } from '../lib/useStamps';
import { formatDistance, getDistanceKm } from '../lib/geo';
import { ALL_PREFECTURES, ALL_STAMPS } from '../lib/stamps';

const BASE_COLORS: Record<StampType, string> = {
  scenic: '#e60012',
  station: '#00897b',
  goshuin: '#7e57c2',
};

const markerIconCache = new Map<string, L.DivIcon>();
const clusterIconCache = new Map<string, L.DivIcon>();

type ClusterLike = { getChildCount: () => number };
type TypeFilter = 'all' | 'station' | 'scenic' | 'goshuin-shrine' | 'goshuin-temple';

const TYPE_GLYPH: Record<StampType, string> = {
  station:
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="14" rx="2"></rect><path d="M8 21h8"></path><path d="M8 17v4"></path><path d="M16 17v4"></path><path d="M7 7h10"></path><path d="M7 11h3"></path><path d="M14 11h3"></path></svg>',
  scenic:
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h16v9H4z"></path><path d="M8 10V6h8v4"></path><path d="M10 14h4"></path></svg>',
  goshuin:
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h16"></path><path d="M7 8v3"></path><path d="M17 8v3"></path><path d="M6 14h12"></path><path d="M8 14v6"></path><path d="M16 14v6"></path></svg>',
};

const GOSHUIN_TEMPLE_GLYPH =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.05" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10h18"></path><path d="M5 10l7-5 7 5"></path><path d="M6 10v8"></path><path d="M10 10v8"></path><path d="M14 10v8"></path><path d="M18 10v8"></path><path d="M4 18h16"></path></svg>';

function getMarkerGlyph(stamp: Stamp) {
  if (stamp.type === 'goshuin' && stamp.goshuinPlaceType === 'temple') {
    return GOSHUIN_TEMPLE_GLYPH;
  }
  return TYPE_GLYPH[stamp.type];
}

function createCustomIcon(stamp: Stamp, color: string, isCollected = false) {
  const glyph = getMarkerGlyph(stamp);

  return L.divIcon({
    className: 'stamp-marker-icon',
    html: `
      <div style="
        position: relative;
        width: 32px; height: 32px;
        display: flex; align-items: center; justify-content: center; color: ${isCollected ? '#e60012' : color};
        filter: drop-shadow(0 6px 12px rgba(15,23,42,0.22));
      ">
        ${glyph}
        ${isCollected ? '<span style="position:absolute; right:1px; bottom:1px; width:10px; height:10px; border-radius:9999px; background:#e60012; border:2px solid #fff;"></span>' : ''}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

function getMarkerIcon(stamp: Stamp, isCollected: boolean): L.DivIcon {
  const glyphKey = stamp.type === 'goshuin' ? stamp.goshuinPlaceType ?? 'other' : 'base';
  const key = `${stamp.type}:${glyphKey}:${isCollected ? '1' : '0'}`;
  const cached = markerIconCache.get(key);
  if (cached) return cached;

  const icon = createCustomIcon(stamp, BASE_COLORS[stamp.type], isCollected);
  markerIconCache.set(key, icon);
  return icon;
}

function getSingleScenicClusterIcon(): L.DivIcon {
  const key = 'single-scenic';
  const cached = clusterIconCache.get(key);
  if (cached) return cached;

  const icon = L.divIcon({
    className: 'stamp-cluster-icon scenic-single',
    html: `
      <div style="
        width:32px;
        height:32px;
        border-radius:9999px;
        background:#fff;
        color:#e60012;
        border:2px solid #111827;
        display:flex;
        align-items:center;
        justify-content:center;
        box-shadow:0 10px 24px rgba(15,23,42,.12);
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <circle cx="12" cy="12" r="6"></circle>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  clusterIconCache.set(key, icon);
  return icon;
}

function getClusterNumberIcon(count: number): L.DivIcon {
  const bucket = count >= 1000 ? '1000+' : count >= 100 ? '100+' : count >= 10 ? '10+' : '2-9';
  const key = `${bucket}:${count}`;
  const cached = clusterIconCache.get(key);
  if (cached) return cached;

  const size = count >= 1000 ? 52 : count >= 100 ? 46 : count >= 10 ? 40 : 34;
  const fontSize = count >= 1000 ? 12 : count >= 100 ? 13 : 12;

  const icon = L.divIcon({
    className: 'stamp-cluster-icon',
    html: `
      <div style="
        width:${size}px;
        height:${size}px;
        border-radius:9999px;
        background:#fff;
        color:#111827;
        border:2px solid #111827;
        display:flex;
        align-items:center;
        justify-content:center;
        font-weight:700;
        font-size:${fontSize}px;
        box-shadow:0 10px 24px rgba(15,23,42,.1);
      ">${count}</div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

  clusterIconCache.set(key, icon);
  return icon;
}

function createClusterIcon(cluster: ClusterLike): L.DivIcon {
  const count = cluster.getChildCount();
  if (count <= 1) return getSingleScenicClusterIcon();
  return getClusterNumberIcon(count);
}

const userIcon = L.divIcon({
  className: 'user-location-icon',
  html: `
    <div style="position:relative; width:24px; height:24px;">
      <div style="
        position:absolute; inset:0;
        background: #111827; border-radius:50%;
        border: 3px solid white;
        box-shadow: 0 0 0 4px rgba(17,24,39,0.12);
        animation: pulse-ring 2s infinite;
      "></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function getGoshuinPlaceLabel(stamp: Stamp) {
  if (stamp.goshuinPlaceType === 'shrine') return '神社';
  if (stamp.goshuinPlaceType === 'temple') return '寺庙';
  if (stamp.goshuinPlaceType === 'other') return '未分类';
  return null;
}

function matchesTypeFilter(stamp: Stamp, filter: TypeFilter) {
  if (filter === 'all') return true;
  if (filter === 'station' || filter === 'scenic') return stamp.type === filter;
  if (filter === 'goshuin-shrine') return stamp.type === 'goshuin' && stamp.goshuinPlaceType === 'shrine';
  if (filter === 'goshuin-temple') return stamp.type === 'goshuin' && stamp.goshuinPlaceType === 'temple';
  return false;
}

function MapController({ focusedStamp, onFocusConsumed, userLocation }: {
  focusedStamp: Stamp | null;
  onFocusConsumed: () => void;
  userLocation: [number, number] | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!focusedStamp) return;
    map.flyTo([focusedStamp.lat, focusedStamp.lng], 15, { duration: 1.2 });
    onFocusConsumed();
  }, [focusedStamp, map, onFocusConsumed]);

  useEffect(() => {
    if (!userLocation) return;
    map.flyTo(userLocation, 13, { duration: 1.5 });
  }, [userLocation, map]);

  return null;
}

function NearMeButton({ onLocate }: { onLocate: (pos: [number, number]) => void }) {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    if (!navigator.geolocation) return;

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocate([pos.coords.latitude, pos.coords.longitude]);
        setLoading(false);
      },
      () => {
        alert('无法获取当前位置。');
        setLoading(false);
      },
    );
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title="从当前位置搜索"
      style={{
        position: 'absolute',
        bottom: '100px',
        right: '12px',
        zIndex: 1000,
        background: 'rgba(255,255,255,0.96)',
        border: '1px solid rgba(15,23,42,0.08)',
        borderRadius: '50%',
        width: '44px',
        height: '44px',
        boxShadow: '0 10px 24px rgba(15,23,42,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: loading ? 'wait' : 'pointer',
        color: loading ? '#9ca3af' : '#111827',
        transition: 'all 0.2s',
      }}
    >
      {loading ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
          <path d="M12 2a10 10 0 1 0 10 10" />
        </svg>
      )}
    </button>
  );
}

interface MapComponentProps {
  focusedStamp?: Stamp | null;
  onFocusConsumed?: () => void;
  onStampSelect?: (stamp: Stamp) => void;
}

export default function MapComponent({ focusedStamp, onFocusConsumed, onStampSelect }: MapComponentProps) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [activeTypeFilter, setActiveTypeFilter] = useState<TypeFilter>('all');
  const [activePrefFilter, setActivePrefFilter] = useState('all');
  const { collectedIds, checkInStamp } = useStamps();

  const filteredStamps = useMemo(() => {
    return ALL_STAMPS.filter((stamp) => {
      const matchesType = matchesTypeFilter(stamp, activeTypeFilter);
      const matchesPref = activePrefFilter === 'all' || stamp.prefecture === activePrefFilter;
      return matchesType && matchesPref;
    });
  }, [activePrefFilter, activeTypeFilter]);

  const markerItems = useMemo(() => {
    return filteredStamps.map((stamp) => {
      const collected = collectedIds.has(stamp.id);
      return {
        stamp,
        collected,
        icon: getMarkerIcon(stamp, collected),
      };
    });
  }, [collectedIds, filteredStamps]);

  const handleLocate = useCallback((pos: [number, number]) => {
    setUserLocation(pos);
  }, []);

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <style>{`
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(59,130,246,0.5); }
          70% { box-shadow: 0 0 0 10px rgba(59,130,246,0); }
          100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .leaflet-popup-content-wrapper {
          border-radius: 20px;
          box-shadow: 0 18px 40px rgba(15,23,42,0.18);
          border: 1px solid rgba(15,23,42,0.06);
        }
        .leaflet-popup-tip {
          background: #fff;
        }
      `}</style>

      <MapContainer center={[35.6895, 139.6917]} zoom={5} style={{ height: '100%', width: '100%', zIndex: 0 }} zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains={['a', 'b', 'c', 'd']}
        />

        <MapController
          focusedStamp={focusedStamp ?? null}
          onFocusConsumed={onFocusConsumed ?? (() => {})}
          userLocation={userLocation}
        />

        {userLocation && (
          <>
            <Marker position={userLocation} icon={userIcon}>
              <Popup>
                <div className="text-xs font-semibold text-slate-700 py-1">当前位置</div>
              </Popup>
            </Marker>
            <Circle
              center={userLocation}
              radius={500}
              pathOptions={{ color: '#111827', fillColor: '#e5e7eb', fillOpacity: 0.1, weight: 1.2 }}
            />
          </>
        )}

        <MarkerClusterGroup
          chunkedLoading
          animate
          showCoverageOnHover={false}
          removeOutsideVisibleBounds
          zoomToBoundsOnClick
          spiderfyOnMaxZoom={false}
          iconCreateFunction={createClusterIcon}
          disableClusteringAtZoom={15}
          maxClusterRadius={(zoom: number) => {
            if (zoom <= 5) return 240;
            if (zoom <= 7) return 200;
            if (zoom <= 9) return 160;
            if (zoom <= 11) return 120;
            if (zoom <= 13) return 90;
            return 70;
          }}
        >
          {markerItems.map(({ stamp, collected, icon }) => {
            const distText = userLocation
              ? formatDistance(getDistanceKm(userLocation[0], userLocation[1], stamp.lat, stamp.lng))
              : null;
            const goshuinPlaceLabel = stamp.type === 'goshuin' ? getGoshuinPlaceLabel(stamp) : null;

            return (
              <Marker key={stamp.id} position={[stamp.lat, stamp.lng]} icon={icon}>
                <Popup className="stamp-popup">
                  <div className="flex flex-col gap-2 p-1">
                    <div
                      className="relative h-20 w-full rounded-t-lg bg-cover bg-center"
                      style={{ backgroundImage: `url(${stamp.imageUrl})` }}
                    >
                      {stamp.startYear && (
                        <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {stamp.startYear}
                        </span>
                      )}
                    </div>
                    <div className="px-2 pb-2">
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <h3 className="font-bold text-slate-800 text-sm leading-tight">{stamp.name}</h3>
                        {collected && <CheckCircle className="w-4 h-4 text-[#e60012] shrink-0" />}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        {stamp.prefecture && (
                          <p className="text-[10px] text-slate-500 font-medium">{stamp.prefecture}</p>
                        )}
                        {goshuinPlaceLabel && (
                          <p className="text-[10px] text-slate-700 font-medium">{goshuinPlaceLabel}</p>
                        )}
                        {distText && (
                          <p className="text-[10px] text-slate-400 font-medium">{distText}</p>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 mt-1 mb-2 leading-relaxed line-clamp-2">
                        {stamp.description}
                      </p>

                      <div className="flex gap-1.5">
                        <button
                          disabled={collected}
                          onClick={() => checkInStamp(stamp.id)}
                          className={`flex-1 text-white text-xs font-semibold py-2 rounded-md transition-all ${
                            collected
                              ? 'bg-slate-200 text-slate-500 cursor-default'
                              : 'bg-[#111111] hover:bg-[#000000] active:scale-95 shadow-sm'
                          }`}
                        >
                          {collected ? '已收集' : '打卡盖章'}
                        </button>

                        {onStampSelect && (
                          <button
                            onClick={() => onStampSelect(stamp)}
                            className="px-2 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                            title="查看详情"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="11" cy="11" r="8" />
                              <path d="m21 21-4.3-4.3" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>

      <div className="absolute top-3 right-3 z-[1100] w-56 max-w-[calc(100%-24px)] rounded-[22px] border border-black/8 bg-white/88 backdrop-blur-2xl p-3 shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
        <div className="flex items-center gap-2 text-slate-700 mb-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold tracking-tight">地图筛选</h3>
        </div>

        <div className="space-y-2">
          <div>
            <label className="text-[11px] text-slate-400">收集种类</label>
            <select
              value={activeTypeFilter}
              onChange={(e) => setActiveTypeFilter(e.target.value as TypeFilter)}
              className="mt-1 w-full rounded-xl border border-black/8 bg-white px-3 py-2 text-sm text-slate-700 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
            >
              <option value="all">全部</option>
              <option value="scenic">风景印</option>
              <option value="station">车站印</option>
              <option value="goshuin-shrine">御朱印</option>
              <option value="goshuin-temple">寺院</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-400">地区</label>
            <select
              value={activePrefFilter}
              onChange={(e) => setActivePrefFilter(e.target.value)}
              className="mt-1 w-full rounded-xl border border-black/8 bg-white px-3 py-2 text-sm text-slate-700 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
            >
              <option value="all">全部地区</option>
              {ALL_PREFECTURES.map((pref) => (
                <option key={pref} value={pref}>
                  {pref}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">显示 {filteredStamps.length} / {ALL_STAMPS.length}</p>
          <button
            onClick={() => {
              setActiveTypeFilter('all');
              setActivePrefFilter('all');
            }}
            className="text-[11px] text-[#a11a1a] hover:text-[#7d0d0d] font-medium transition-colors"
          >
            重置
          </button>
        </div>
      </div>

      <NearMeButton onLocate={handleLocate} />
    </div>
  );
}




