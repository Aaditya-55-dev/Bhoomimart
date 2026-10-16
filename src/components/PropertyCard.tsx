import React, { useState } from 'react';
import { Compass, Droplet, Sun, ExternalLink, Globe2, CheckCircle2 } from 'lucide-react';
import { LandParcel } from '../types';

interface PropertyCardProps {
  parcel: LandParcel;
  isSelected: boolean;
  onSelect: (parcel: LandParcel) => void;
  onOpenDetails: (parcel: LandParcel) => void;
}

function getGenerativeLandSvg(title: string, locality: string, id: string): string {
  const hash = Math.abs((title + id).split('').reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0));
  const palettes = [
    { bg1: '#ecfdf5', bg2: '#d1fae5', stroke: '#10b981', hill1: '#a7f3d0', hill2: '#6ee7b7', label: 'River Alluvial Soil' },
    { bg1: '#fffbeb', bg2: '#fef3c7', stroke: '#f59e0b', hill1: '#fde68a', hill2: '#fcd34d', label: 'NA 44 Sanctioned' },
    { bg1: '#f0fdf4', bg2: '#dcfce7', stroke: '#059669', hill1: '#bbf7d0', hill2: '#86efac', label: 'Agricultural Holding' },
    { bg1: '#f0f9ff', bg2: '#e0f2fe', stroke: '#0284c7', hill1: '#bae6fd', hill2: '#7dd3fc', label: 'Commercial Frontage' },
    { bg1: '#fdf2f8', bg2: '#fce7f3', stroke: '#db2777', hill1: '#fbcfe8', hill2: '#f9a8d4', label: 'Urban Development Plot' }
  ];
  const pal = palettes[hash % palettes.length];
  const elevation = 170 + (hash % 50);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340">
    <defs>
      <linearGradient id="bg-${hash}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${pal.bg1}"/>
        <stop offset="100%" stop-color="${pal.bg2}"/>
      </linearGradient>
      <pattern id="grid-${hash}" width="25" height="25" patternUnits="userSpaceOnUse">
        <path d="M 25 0 L 0 0 0 25" fill="none" stroke="${pal.stroke}" stroke-width="0.5" opacity="0.2"/>
      </pattern>
    </defs>
    <rect width="600" height="340" fill="url(#bg-${hash})"/>
    <rect width="600" height="340" fill="url(#grid-${hash})"/>
    <path d="M0 ${elevation} Q 150 ${elevation - 40}, 300 ${elevation} T 600 ${elevation - 15} L 600 340 L 0 340 Z" fill="${pal.hill1}" opacity="0.7"/>
    <path d="M0 ${elevation + 30} Q 200 ${elevation - 10}, 400 ${elevation + 35} T 600 ${elevation + 10} L 600 340 L 0 340 Z" fill="${pal.hill2}" opacity="0.6"/>
    <circle cx="300" cy="110" r="28" fill="${pal.stroke}" opacity="0.12"/>
    <path d="M288 116 L300 96 L312 116 Z" fill="${pal.stroke}"/>
    <circle cx="300" cy="106" r="3" fill="#ffffff"/>
    <text x="300" y="152" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" fill="${pal.stroke}" text-anchor="middle">
      ${pal.label}
    </text>
    <text x="300" y="170" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="500" fill="#64748b" text-anchor="middle">
      ${locality} Cadastral Demarcation
    </text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  parcel,
  isSelected,
  onSelect,
  onOpenDetails
}) => {
  const fallbackImg = getGenerativeLandSvg(parcel.title, parcel.locality || parcel.city, parcel.id);
  const [imgSrc, setImgSrc] = useState(parcel.images?.[0] || fallbackImg);

  const priceVal = parcel.priceNumericINR !== undefined ? parcel.priceNumericINR : parcel.price;
  const pricePerUnitDisplay = parcel.pricePerUnit || (parcel.area > 0
    ? `₹${Math.round(priceVal / parcel.area).toLocaleString('en-IN')} / ${parcel.areaUnit}`
    : '');

  const ratePerSqft = parcel.areaSqft && parcel.areaSqft > 0
    ? `₹${Math.round(priceVal / parcel.areaSqft).toLocaleString('en-IN')}/sqft`
    : null;

  const areaBadgeText = parcel.areaGunta !== undefined && parcel.areaUnit !== 'Gunta'
    ? `${parcel.area} ${parcel.areaUnit} (${parcel.areaGunta} Gunta)`
    : `${parcel.area} ${parcel.areaUnit}`;

  return (
    <div
      onClick={() => onSelect(parcel)}
      className={`group relative rounded-2xl p-3.5 transition-all duration-200 cursor-pointer border w-[85vw] shrink-0 snap-center sm:w-full ${
        isSelected
          ? 'bg-white/95 border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg shadow-emerald-900/5'
          : 'bg-white/70 hover:bg-white/90 border-slate-200/70 hover:border-slate-300 shadow-[0_4px_20px_0_rgba(15,23,42,0.03)]'
      }`}
    >
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200/60 mb-3">
        <img
          src={imgSrc}
          alt={parcel.title}
          onError={() => setImgSrc(fallbackImg)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none">
          <span className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-white/95 backdrop-blur-md text-slate-800 border border-white/80 shadow-xs">
            {areaBadgeText}
          </span>
        </div>
        <div className="absolute top-2.5 right-2.5 z-10 pointer-events-none flex items-center gap-1">
          {parcel.isVerified && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-600 text-white shadow-xs">
              <CheckCircle2 className="w-3 h-3" />
              <span>Verified Title</span>
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-white/95 backdrop-blur-md text-emerald-800 border border-white/80 shadow-xs">
            {parcel.sellerType}
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[11px] font-semibold text-emerald-700 tracking-wide uppercase truncate">
            {parcel.locality || parcel.city}
          </span>
          <span className="text-[10px] font-mono text-slate-500 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/60">
            {parcel.surveyNumber}
          </span>
        </div>

        <h3 className="text-xs font-semibold text-slate-900 line-clamp-2 group-hover:text-emerald-700 transition-colors">
          {parcel.title}
        </h3>

        <div className="flex items-baseline justify-between pt-0.5">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-semibold text-slate-900 tracking-tight font-heading">
              {parcel.priceDisplay}
            </span>
            <span className="text-xs font-normal text-slate-500">
              {pricePerUnitDisplay}
            </span>
          </div>
          {ratePerSqft && (
            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
              {ratePerSqft}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[10px] font-normal text-slate-500 pt-1 border-t border-slate-100">
          <span>{parcel.areaSqft.toLocaleString('en-IN')} Sqft</span>
          <span>•</span>
          <span className="truncate">{parcel.propertyType}</span>
          <span>•</span>
          <span className="truncate">{parcel.city || parcel.locality || parcel.country}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 mt-2.5 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50/80 text-[10px] font-normal text-slate-600 border border-slate-100">
          <Compass className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="truncate">{parcel.metrics.slope}</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50/80 text-[10px] font-normal text-slate-600 border border-slate-100">
          <Droplet className="w-3 h-3 text-sky-500 shrink-0" />
          <span className="truncate">Flood: {parcel.metrics.floodRisk}</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50/80 text-[10px] font-normal text-slate-600 border border-slate-100">
          <Sun className="w-3 h-3 text-amber-500 shrink-0" />
          <span className="truncate">{parcel.metrics.solarYield}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-500">
          <Globe2 className="w-3 h-3 text-slate-400" />
          <span className="text-[10px]">Source:</span>
          <a
            href={parcel.sourceUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-0.5"
            title={`View listing on ${parcel.sourceHost || parcel.source}`}
          >
            <span>{parcel.sourceHost || parcel.source}</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetails(parcel);
          }}
          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] transition-colors cursor-pointer"
        >
          View Details
        </button>
      </div>
    </div>
  );
};
