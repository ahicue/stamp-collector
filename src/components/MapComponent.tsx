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
  scenic: '#ef4444',
  station: '#22c55e',
  goshuin: '#a855f7',
};

const markerIconCache = new Map<string, L.DivIcon>();
const clusterIconCache = new Map<string, L.DivIcon>();

type ClusterLike = { getChildCount: () => number };

function createCustomIcon(color: string, isCollected = false) {
  return L.divIcon({
    className: 'stamp-marker-icon',
    html: `
      <div style="
        background-color: ${isCollected ? '#3b82f6' : color};
        width: 30px; height: 30px; border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.25);
        display: flex; align-items: center; justify-content: center; color: white;
      ">
        ${isCollected
          ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
          : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle></svg>'
        }
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
}

function getMarkerIcon(type: StampType, isCollected: boolean): L.DivIcon {
  const key = `${type}:${isCollected ? '1' : '0'}`;
  const cached = markerIconCache.get(key);
  if (cached) return cached;

  const icon = createCustomIcon(BASE_COLORS[type], isCollected);
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
        background:linear-gradient(135deg,#ef4444,#dc2626);
        color:#fff;
        border:3px solid #fff;
        display:flex;
        align-items:center;
        justify-content:center;
        box-shadow:0 3px 10px rgba(0,0,0,.28);
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
        background:linear-gradient(135deg,#2563eb,#1d4ed8);
        color:#fff;
        border:3px solid #fff;
        display:flex;
        align-items:center;
        justify-content:center;
        font-weight:700;
        font-size:${fontSize}px;
        box-shadow:0 4px 12px rgba(0,0,0,.25);
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
        background: #3b82f6; border-radius:50%;
        border: 3px solid white;
        box-shadow: 0 0 0 4px rgba(59,130,246,0.3);
        animation: pulse-ring 2s infinite;
      "></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

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
        background: 'white',
        border: 'none',
        borderRadius: '50%',
        width: '44px',
        height: '44px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: loading ? 'wait' : 'pointer',
        color: loading ? '#93c5fd' : '#2563eb',
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
  const [activeTypeFilter, setActiveTypeFilter] = useState<'all' | StampType>('all');
  const [activePrefFilter, setActivePrefFilter] = useState('all');
  const { collectedIds, checkInStamp } = useStamps();

  const filteredStamps = useMemo(() => {
    return ALL_STAMPS.filter((stamp) => {
      const matchesType = activeTypeFilter === 'all' || stamp.type === activeTypeFilter;
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
        icon: getMarkerIcon(stamp.type, collected),
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
      `}</style>

      <MapContainer center={[35.6895, 139.6917]} zoom={5} style={{ height: '100%', width: '100%', zIndex: 0 }} zoomControl={false}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

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
              pathOptions={{ color: '#3b82f6', fillColor: '#93c5fd', fillOpacity: 0.15, weight: 1.5 }}
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
          disableClusteringAtZoom={13}
          maxClusterRadius={(zoom: number) => {
            if (zoom <= 6) return 170;
            if (zoom <= 8) return 140;
            if (zoom <= 10) return 100;
            return 70;
          }}
        >
          {markerItems.map(({ stamp, collected, icon }) => {
            const distText = userLocation
              ? formatDistance(getDistanceKm(userLocation[0], userLocation[1], stamp.lat, stamp.lng))
              : null;

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
                        {collected && <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" />}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5">
                        {stamp.prefecture && (
                          <p className="text-[10px] text-blue-500 font-medium">{stamp.prefecture}</p>
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
                              ? 'bg-slate-300 cursor-default'
                              : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-sm'
                          }`}
                        >
                          {collected ? '已收集' : '打卡盖章'}
                        </button>

                        {onStampSelect && (
                          <button
                            onClick={() => onStampSelect(stamp)}
                            className="px-2 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
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

      <div className="absolute top-3 right-3 z-[1100] w-60 max-w-[calc(100%-24px)] rounded-xl border border-slate-200 bg-white/95 backdrop-blur p-3 shadow-lg">
        <div className="flex items-center gap-2 text-slate-700 mb-2">
          <Filter className="w-4 h-4" />
          <h3 className="text-sm font-semibold">地图筛选</h3>
        </div>

        <div className="space-y-2">
          <div>
            <label className="text-xs text-slate-500">收集种类</label>
            <select
              value={activeTypeFilter}
              onChange={(e) => setActiveTypeFilter(e.target.value as 'all' | StampType)}
              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-700"
            >
              <option value="all">全部</option>
              <option value="scenic">风景印</option>
              <option value="station">车站印</option>
              <option value="goshuin">御朱印</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-500">地区</label>
            <select
              value={activePrefFilter}
              onChange={(e) => setActivePrefFilter(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-700"
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
          <p className="text-xs text-slate-500">显示 {filteredStamps.length} / {ALL_STAMPS.length}</p>
          <button
            onClick={() => {
              setActiveTypeFilter('all');
              setActivePrefFilter('all');
            }}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            重置
          </button>
        </div>
      </div>

      <NearMeButton onLocate={handleLocate} />
    </div>
  );
}


