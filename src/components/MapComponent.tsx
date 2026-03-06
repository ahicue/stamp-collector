"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { INITIAL_STAMPS, Stamp, StampType } from '../lib/data';
import L from 'leaflet';
import { BookOpen, Train, Mountain } from 'lucide-react';

// Custom icons for different stamp types using Leaflet's divIcon
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'stamp-marker-icon',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <circle cx="12" cy="12" r="6"></circle>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

const ICONS = {
  scenic: createCustomIcon('#ef4444'),    // Red
  station: createCustomIcon('#22c55e'),   // Green
  goshuin: createCustomIcon('#a855f7'),   // Purple
};

export default function MapComponent() {
  const [isMounted, setIsMounted] = useState(false);
  const tokyoCenter: [number, number] = [35.6895, 139.6917];

  useEffect(() => {
    setIsMounted(true);
    // Fix Leaflet's default icon path issues in React
    delete (L.Icon.Default.prototype as any)._getIconUrl;
  }, []);

  if (!isMounted) {
    return null; // Prevent SSR mismatch
  }

  return (
    <MapContainer 
      center={tokyoCenter} 
      zoom={12} 
      style={{ height: '100%', width: '100%', zIndex: 0 }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {INITIAL_STAMPS.map((stamp) => (
        <Marker 
          key={stamp.id} 
          position={[stamp.lat, stamp.lng]}
          icon={ICONS[stamp.type]}
        >
          <Popup className="stamp-popup">
            <div className="flex flex-col gap-2 p-1">
              <div 
                className="h-24 w-full rounded-t-lg bg-cover bg-center"
                style={{ backgroundImage: `url(${stamp.imageUrl})` }}
              />
              <div className="px-2 pb-2">
                <h3 className="font-bold text-slate-800 text-sm mt-1">{stamp.name}</h3>
                <p className="text-xs text-slate-500 mt-1 mb-2 leading-relaxed line-clamp-2">
                  {stamp.description}
                </p>
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 rounded-md transition-colors">
                  打卡盖印
                </button>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
