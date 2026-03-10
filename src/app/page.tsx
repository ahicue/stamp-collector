"use client";

import { useState } from "react";
import { Grid, BookOpen, Compass, BarChart2 } from "lucide-react";
import dynamic from 'next/dynamic';
import GalleryComponent from "../components/GalleryComponent";
import StatsComponent from "../components/StatsComponent";
import StampDetailModal from "../components/StampDetailModal";
import { Stamp } from "../lib/data";

const DynamicMap = dynamic(() => import('../components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-200">
      <p className="text-slate-500 font-medium flex items-center gap-2">
        <Compass className="w-5 h-5 animate-pulse" />
        姝ｅ湪鍔犺浇鍦板浘...
      </p>
    </div>
  )
});

type Tab = "map" | "gallery" | "stats";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("map");
  const [focusedStamp, setFocusedStamp] = useState<Stamp | null>(null);
  const [selectedStamp, setSelectedStamp] = useState<Stamp | null>(null);

  const handleStampClick = (stamp: Stamp) => {
    setSelectedStamp(stamp);
  };

  const handleMapFocus = (stamp: Stamp) => {
    setFocusedStamp(stamp);
    setActiveTab("map");
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-3 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-600" />
          <h1 className="font-bold text-lg text-slate-800 tracking-tight">
            stamptracker
          </h1>
        </div>
        
        {/* View Toggles (Desktop/Tablet) */}
        <div className="hidden sm:flex bg-slate-100 p-1 rounded-lg gap-0.5">
          <button
            onClick={() => setActiveTab("map")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "map"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Compass className="w-4 h-4" />
            鎺㈢储鍦板洺
          </button>
          <button
            onClick={() => setActiveTab("gallery")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "gallery"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Grid className="w-4 h-4" />
            鍗扮珷鍥抽憫
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "stats"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            绲辫▓
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden">
        {/* Map - always mounted, hidden when not active */}
        <div className={`absolute inset-0 bg-slate-200 ${activeTab === 'map' ? '' : 'invisible pointer-events-none'}`}>
          <DynamicMap
            focusedStamp={focusedStamp}
            onFocusConsumed={() => setFocusedStamp(null)}
            onStampSelect={setSelectedStamp}
          />
        </div>

        {activeTab === 'gallery' && (
          <div className="absolute inset-0 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50">
            <GalleryComponent
              onStampClick={handleStampClick}
              onMapFocus={handleMapFocus}
            />
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="absolute inset-0 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50">
            <StatsComponent />
          </div>
        )}
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="sm:hidden bg-white border-t border-slate-200 flex justify-around pb-safe z-20">
        <button
          onClick={() => setActiveTab("map")}
          className={`flex-1 py-3 flex flex-col items-center gap-1 ${
            activeTab === "map" ? "text-blue-600" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Compass className="w-6 h-6" />
          <span className="text-[10px] font-medium">鎺㈢储</span>
        </button>
        <button
          onClick={() => setActiveTab("gallery")}
          className={`flex-1 py-3 flex flex-col items-center gap-1 ${
            activeTab === "gallery" ? "text-blue-600" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Grid className="w-6 h-6" />
          <span className="text-[10px] font-medium">鍥抽憫</span>
        </button>
        <button
          onClick={() => setActiveTab("stats")}
          className={`flex-1 py-3 flex flex-col items-center gap-1 ${
            activeTab === "stats" ? "text-blue-600" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <BarChart2 className="w-6 h-6" />
          <span className="text-[10px] font-medium">绲辫▓</span>
        </button>
      </nav>

      {/* Stamp Detail Modal */}
      <StampDetailModal stamp={selectedStamp} onClose={() => setSelectedStamp(null)} />
    </div>
  );
}

