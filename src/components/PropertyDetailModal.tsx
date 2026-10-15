import React, { useState, useEffect } from 'react';
import { 
  X, MapPin, CheckCircle, ShieldCheck, Compass, Droplet, 
  Sun, Activity, Phone, FileText, Share2, 
  Navigation, Ruler, ExternalLink, Globe2, AlertCircle
} from 'lucide-react';
import { LandParcel } from '../types';

interface PropertyDetailModalProps {
  parcel: LandParcel | null;
  onClose: () => void;
  onOpenConverter: (area: number, unit: any) => void;
  onSaveInquiry?: (parcel: LandParcel) => void;
}

const TOPOLOGICAL_LAND_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23f0fdf4"/><stop offset="100%" stop-color="%23dcfce7"/></linearGradient></defs><rect width="600" height="340" fill="url(%23g)"/><path d="M0 220 Q 150 170, 300 210 T 600 190 L 600 340 L 0 340 Z" fill="%23bbf7d0" opacity="0.7"/><path d="M0 260 Q 200 220, 400 270 T 600 240 L 600 340 L 0 340 Z" fill="%2386efac" opacity="0.6"/><circle cx="300" cy="120" r="28" fill="%23059669" opacity="0.12"/><path d="M288 126 L300 106 L312 126 Z" fill="%23059669"/><text x="300" y="165" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="%23047857" text-anchor="middle">Demarcated Land Parcel</text></svg>`;

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  parcel,
  onClose,
  onOpenConverter,
  onSaveInquiry
}) => {
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryPhone, setInquiryPhone] = useState('');

  useEffect(() => {
    setActiveImageIdx(0);
    setContactSubmitted(false);
    setInquiryName('');
    setInquiryPhone('');
  }, [parcel?.id]);

  useEffect(() => {
    if (!parcel) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [parcel, onClose]);

  if (!parcel) return null;

  const currentImg = parcel.images?.[activeImageIdx] || parcel.images?.[0] || TOPOLOGICAL_LAND_SVG;
  const priceVal = parcel.priceNumericINR !== undefined ? parcel.priceNumericINR : parcel.price;
  const ratePerSqft = parcel.areaSqft && parcel.areaSqft > 0 ? Math.round(priceVal / parcel.areaSqft) : 0;

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSubmitted(true);
    if (onSaveInquiry && parcel) {
      onSaveInquiry(parcel);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="property-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/30 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white/95 backdrop-blur-2xl border border-white/80 rounded-3xl shadow-[0_20px_60px_-15px_rgba(15,23,42,0.15)] text-slate-800 overflow-hidden">
        
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {parcel.propertyType}
            </span>
            <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
              {parcel.surveyNumber}
            </span>
            <span className="hidden sm:flex items-center gap-1 text-xs text-emerald-700 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Public Cadastral Record
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenConverter(parcel.area, parcel.areaUnit)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 border border-slate-200 transition-colors cursor-pointer"
            >
              <Ruler className="w-3.5 h-3.5 text-emerald-600" />
              Convert Area Units
            </button>
            <button
              onClick={onClose}
              aria-label="Close property details"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            <div className="lg:col-span-7 space-y-4">
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xs">
                <img
                  src={currentImg}
                  alt={parcel.title}
                  onError={(e) => { (e.target as HTMLImageElement).src = TOPOLOGICAL_LAND_SVG; }}
                  className="w-full h-full object-cover transition-all duration-300"
                />
                <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl bg-white/90 backdrop-blur-md border border-white/80 text-slate-700 font-mono text-xs shadow-xs">
                  GPS: {parcel.coordinates[0].toFixed(4)}°N, {parcel.coordinates[1].toFixed(4)}°E
                </div>
                {parcel.isVerified && (
                  <div className="absolute top-3 right-3 px-3 py-1 rounded-xl bg-emerald-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Verified Title
                  </div>
                )}
              </div>

              {parcel.images.length > 1 && (
                <div className="flex gap-2">
                  {parcel.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIdx(idx)}
                      className={`relative w-20 h-14 rounded-xl overflow-hidden border-2 transition-all ${
                        activeImageIdx === idx ? 'border-emerald-600 scale-105 shadow-sm' : 'border-slate-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              <div className="pt-2">
                <h2 id="property-modal-title" className="text-xl sm:text-2xl font-bold text-slate-900 font-heading">
                  {parcel.title}
                </h2>
                <div className="flex items-center gap-2 mt-2 text-slate-500 text-sm">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>{parcel.locality || parcel.city}, {parcel.country}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500">Cadastral ID: {parcel.surveyNumber}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">Description & Title Status</span>
                <p className="text-sm text-slate-700 leading-relaxed font-normal">
                  {parcel.description}
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">Key Features</span>
                <div className="flex flex-wrap gap-2">
                  {parcel.features.map((feat, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 shadow-2xs">
                      {feat}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Legal Compliance & Registry Disclaimer
                </div>
                <p className="text-amber-800/90 leading-relaxed">
                  {parcel.legalCompliance.disclaimer}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-amber-700 pt-1">
                  <span>Source: {parcel.sourceHost}</span>
                  <span>•</span>
                  <span>Crawled: {parcel.legalCompliance.verifiedAt.split('T')[0]}</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              
              <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-3">
                <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">Pricing & Land Valuation</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900 font-heading">{parcel.priceDisplay}</span>
                  <span className="text-sm font-semibold text-emerald-700">{parcel.pricePerUnit}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200/60 text-xs">
                  <div>
                    <span className="text-slate-500 block">Total Area</span>
                    <span className="font-bold text-slate-800">
                      {parcel.areaGunta !== undefined && parcel.areaUnit !== 'Gunta'
                        ? `${parcel.area} ${parcel.areaUnit} (${parcel.areaGunta} Gunta)`
                        : `${parcel.area} ${parcel.areaUnit}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Rate / Sq.ft.</span>
                    <span className="font-bold text-slate-800">₹{ratePerSqft.toLocaleString('en-IN')} / sqft</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">Cadastral & Physical Metrics</span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[11px]">Contour Slope</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">{parcel.metrics.slope}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[11px]">Flood Risk</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">{parcel.metrics.floodRisk}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[11px]">Solar Potential</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">{parcel.metrics.solarYield}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[11px]">Groundwater Table</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">{parcel.metrics.groundwaterDepth}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[11px]">Road Frontage</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">{parcel.metrics.roadWidthFt} Feet Wide</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[11px]">Soil Classification</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block truncate">{parcel.metrics.soilType}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-normal">Registrar / Contact</span>
                    <span className="text-sm font-semibold text-slate-900">{parcel.sellerName}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {parcel.sellerType}
                  </span>
                </div>

                {!contactSubmitted ? (
                  <form onSubmit={handleInquirySubmit} className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-xs text-slate-500 font-normal block">Direct Inquiry & Official Cadastral Report</span>
                    <input
                      type="text"
                      placeholder="Your Full Name"
                      required
                      value={inquiryName}
                      onChange={(e) => setInquiryName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="tel"
                      placeholder="Your Contact Phone / Mobile"
                      required
                      value={inquiryPhone}
                      onChange={(e) => setInquiryPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Request Direct Inquiry & Cadastral Records
                    </button>
                  </form>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-emerald-900">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      Inquiry Dispatched Successfully!
                    </div>
                    <p>Official registry contact: <span className="font-mono text-slate-900">{parcel.sellerContact}</span></p>
                    <p className="text-[11px] text-emerald-700">Official cadastral title documentation will be dispatched to your phone.</p>
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
