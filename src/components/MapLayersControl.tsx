import React, { useState } from 'react';
import { Layers, Map as MapIcon, Compass, Droplet } from 'lucide-react';
import { MapLayerState } from '../types';

interface MapLayersControlProps {
  layers: MapLayerState;
  onChangeLayers: (layers: MapLayerState) => void;
}

export const MapLayersControl: React.FC<MapLayersControlProps> = ({
  layers,
  onChangeLayers
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = (key: keyof Omit<MapLayerState, 'tileMode'>) => {
    onChangeLayers({
      ...layers,
      [key]: !layers[key]
    });
  };

  const setTileMode = (tileMode: MapLayerState['tileMode']) => {
    onChangeLayers({
      ...layers,
      tileMode
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end">
      {isOpen && (
        <div className="mb-2.5 w-64 p-4 bg-white/90 backdrop-blur-2xl border border-white/80 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.08)] text-slate-800 space-y-3.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
              Basemap Layer
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTileMode('streets')}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                  layers.tileMode !== 'satellite'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:text-slate-900 border-slate-200/80'
                }`}
              >
                OpenStreetMap
              </button>
              <button
                onClick={() => setTileMode('satellite')}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                  layers.tileMode === 'satellite'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:text-slate-900 border-slate-200/80'
                }`}
              >
                Satellite
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              GIS Layer Overlays
            </span>

            <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer text-xs transition-colors">
              <span className="flex items-center gap-2 text-slate-700 font-medium">
                <MapIcon className="w-3.5 h-3.5 text-emerald-600" />
                Cadastral Parcel Polygons
              </span>
              <input
                type="checkbox"
                checked={layers.showPolygons}
                onChange={() => toggle('showPolygons')}
                className="rounded accent-emerald-600"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer text-xs transition-colors">
              <span className="flex items-center gap-2 text-slate-700 font-medium">
                <Compass className="w-3.5 h-3.5 text-slate-500" />
                Survey Numbers / Plot IDs
              </span>
              <input
                type="checkbox"
                checked={layers.showSurveyNumbers}
                onChange={() => toggle('showSurveyNumbers')}
                className="rounded accent-emerald-600"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer text-xs transition-colors">
              <span className="flex items-center gap-2 text-slate-700 font-medium">
                <Droplet className="w-3.5 h-3.5 text-sky-500" />
                Floodplain Buffer Zones
              </span>
              <input
                type="checkbox"
                checked={layers.showFloodZones}
                onChange={() => toggle('showFloodZones')}
                className="rounded accent-emerald-600"
              />
            </label>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/85 hover:bg-white border border-white/80 text-slate-700 shadow-[0_8px_32px_0_rgba(31,38,135,0.08)] backdrop-blur-xl transition-all"
      >
        <Layers className="w-4 h-4 text-emerald-600" />
        <span className="text-xs font-semibold">GIS Map Layers</span>
      </button>
    </div>
  );
};
