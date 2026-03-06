"use client";

import { useState } from "react";
import { Map, Grid, BookOpen, Compass } from "lucide-react";
import dynamic from 'next/dynamic';
import GalleryComponent from "../components/GalleryComponent";

const DynamicMap = dynamic(() => import('../components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-200">
      <p className="text-slate-500 font-medium flex items-center gap-2">
        <Compass className="w-5 h-5 animate-pulse" />
        正在加载地图...
      </p>
    </div>
  )
});

export default function Home() {
  const [activeTab, setActiveTab] = useState<"map" | "gallery">("map");

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-3 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-600" />
          <h1 className="font-bold text-lg text-slate-800 tracking-tight">
            Stamp Collector
          </h1>
        </div>
        
        {/* View Toggles (Desktop/Tablet) */}
        <div className="hidden sm:flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("map")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "map"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Compass className="w-4 h-4" />
            探索地图
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
            印章图鉴
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden">
        {activeTab === "map" ? (
          <div className="absolute inset-0 bg-slate-200">
            <DynamicMap />
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
            <GalleryComponent />
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
          <span className="text-[10px] font-medium">探索</span>
        </button>
        <button
          onClick={() => setActiveTab("gallery")}
          className={`flex-1 py-3 flex flex-col items-center gap-1 ${
            activeTab === "gallery" ? "text-blue-600" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Grid className="w-6 h-6" />
          <span className="text-[10px] font-medium">图鉴</span>
        </button>
      </nav>
    </div>
  );
}
