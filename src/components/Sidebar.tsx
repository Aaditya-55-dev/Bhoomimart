import React, { useState } from 'react';
import { 
  ChevronLeft, ChevronRight, SlidersHorizontal, RefreshCw, 
  MapPin, Search, Sparkles, Building2, PlusCircle, Check, 
  Trash2, Edit3, Compass, CheckCircle2, AlertCircle, Eye, ArrowRight, X
} from 'lucide-react';
import { LandParcel, FilterState, AppUser, SellerPropertyInput } from '../types';
import { PropertyCard } from './PropertyCard';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  parcels: LandParcel[];
  selectedParcel: LandParcel | null;
  onSelectParcel: (parcel: LandParcel) => void;
  onOpenDetails: (parcel: LandParcel) => void;
  isLoading: boolean;
  isScraping: boolean;
  hasSearched: boolean;
  onTriggerScrape: (location: string, overrideCoords?: [number, number]) => void;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  currentLocationName: string;
  mode?: 'buyer' | 'seller';
  user?: AppUser | null;
  userListings?: LandParcel[];
  currentCenter?: [number, number];
  onAddListing?: (input: SellerPropertyInput) => Promise<void>;
  onDeleteListing?: (id: string) => Promise<void>;
  onEditListing?: (parcel: LandParcel) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  parcels,
  selectedParcel,
  onSelectParcel,
  onOpenDetails,
  isLoading,
  isScraping,
  hasSearched,
  onTriggerScrape,
  filters,
  onFilterChange,
  currentLocationName,
  mode = 'buyer',
  user = null,
  userListings = [],
  currentCenter = [19.1383, 77.3210],
  onAddListing,
  onDeleteListing,
  onEditListing
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'area-desc'>('price-asc');
  
  const [sellerTab, setSellerTab] = useState<'create' | 'manage'>('create');
  const [sellerCategory, setSellerCategory] = useState<'Plot' | 'Land' | 'Farm' | 'Home' | 'Commercial'>('Plot');
  const [sellerTitle, setSellerTitle] = useState('');
  const [sellerPrice, setSellerPrice] = useState<number | ''>('');
  const [sellerArea, setSellerArea] = useState<number | ''>('');
  const [sellerAreaUnit, setSellerAreaUnit] = useState<'Gunta' | 'Acre' | 'Sqft' | 'Hectare'>('Gunta');
  const [sellerLocality, setSellerLocality] = useState('');
  const [sellerSurvey, setSellerSurvey] = useState('');
  const [sellerContact, setSellerContact] = useState(user?.email || '');
  const [sellerDescription, setSellerDescription] = useState('');
  const [sellerLat, setSellerLat] = useState<number>(currentCenter[0]);
  const [sellerLng, setSellerLng] = useState<number>(currentCenter[1]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const propertyTypes = [
    'all',
    'Residential Land',
    'Agricultural Parcel',
    'Commercial Plot',
    'Industrial Estate'
  ];

  const sortedParcels = [...parcels].sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    if (sortBy === 'area-desc') return b.areaSqft - a.areaSqft;
    return 0;
  });

  const handleUseMapCenter = () => {
    setSellerLat(Number(currentCenter[0].toFixed(5)));
    setSellerLng(Number(currentCenter[1].toFixed(5)));
  };

  const handleSellerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddListing) return;
    if (!sellerTitle || sellerPrice === '' || sellerArea === '' || !sellerLocality) return;

    setIsSubmitting(true);
    setSubmitSuccess(false);

    try {
      await onAddListing({
        title: sellerTitle,
        category: sellerCategory,
        price: Number(sellerPrice),
        area: Number(sellerArea),
        areaUnit: sellerAreaUnit,
        locality: sellerLocality,
        coordinates: [Number(sellerLat), Number(sellerLng)],
        description: sellerDescription,
        surveyNumber: sellerSurvey,
        sellerContact: sellerContact || user?.email || '+91 98000 00000',
        uid: user?.uid || user?.id,
        sellerId: user?.uid || user?.id,
        email: user?.email
      });
      setSubmitSuccess(true);
      setSellerTitle('');
      setSellerPrice('');
      setSellerArea('');
      setSellerLocality('');
      setSellerSurvey('');
      setSellerDescription('');
      setTimeout(() => setSubmitSuccess(false), 4000);
    } catch {} finally {
      setIsSubmitting(false);
    }
  };

  const numPrice = typeof sellerPrice === 'number' ? sellerPrice : 0;
  const formattedPricePreview = numPrice > 0
    ? (numPrice >= 10000000 
        ? `₹${(numPrice / 10000000).toFixed(2)} Cr` 
        : `₹${(numPrice / 100000).toFixed(1)} Lakh`)
    : 'Enter price';

  return (
    <>
      <aside
        aria-label="Property Directory and Controls"
        className={`fixed z-40 transition-all duration-300 flex flex-col bottom-4 left-0 right-0 w-full sm:top-20 sm:bottom-4 sm:left-4 sm:right-auto sm:w-[420px] sm:max-w-[420px] ${
          isOpen
            ? 'translate-y-0 sm:translate-x-0'
            : 'translate-y-[calc(100%+2rem)] sm:translate-y-0 sm:-translate-x-[calc(100%+2rem)] pointer-events-none'
        }`}
      >
        <div className="relative flex flex-col max-h-[85vh] sm:max-h-none sm:h-full bg-white/80 backdrop-blur-2xl border-t sm:border border-white/70 rounded-t-3xl sm:rounded-3xl shadow-[0_-8px_32px_0_rgba(31,38,135,0.08)] sm:shadow-[0_8px_32px_0_rgba(31,38,135,0.08)] overflow-hidden pointer-events-auto">
          <div className="sm:hidden flex justify-center pt-2.5 pb-1">
            <button
              type="button"
              onClick={onToggle}
              aria-label="Hide property panel"
              className="w-12 h-1.5 rounded-full bg-slate-300 hover:bg-slate-400 transition-colors cursor-pointer"
            />
          </div>
          
          {mode === 'seller' ? (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-slate-100 bg-white/70 backdrop-blur-md space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h2 className="text-sm font-bold text-slate-900 tracking-tight font-heading">
                      Seller Dashboard
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
                      Direct Owner
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={onToggle}
                    className="sm:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                    title="Close Panel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex p-1 bg-slate-100/90 rounded-xl border border-slate-200/70">
                  <button
                    type="button"
                    onClick={() => setSellerTab('create')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      sellerTab === 'create'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>List New Property</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSellerTab('manage')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      sellerTab === 'manage'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>My Listings ({userListings.length})</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {sellerTab === 'create' ? (
                  <form onSubmit={handleSellerSubmit} className="space-y-3.5 text-xs">
                    {submitSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2 animate-in fade-in duration-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Property listing published successfully to cadastral registry.</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                        Land Classification
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['Plot', 'Land', 'Farm', 'Home', 'Commercial'] as const).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setSellerCategory(cat)}
                            className={`py-1.5 px-2 rounded-xl text-center font-medium border transition-all cursor-pointer ${
                              sellerCategory === cat
                                ? 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                        Listing Title
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 5 Guntha Residential NA Plot near Main Road"
                        value={sellerTitle}
                        onChange={(e) => setSellerTitle(e.target.value)}
                        className="w-full px-3 py-2 bg-white/90 border border-slate-200/80 rounded-xl focus:border-emerald-500 focus:outline-none text-[16px] sm:text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                          Price (INR)
                        </label>
                        <input
                          type="number"
                          required
                          min="10000"
                          placeholder="e.g. 3500000"
                          value={sellerPrice}
                          onChange={(e) => setSellerPrice(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white/90 border border-slate-200/80 rounded-xl focus:border-emerald-500 focus:outline-none text-[16px] sm:text-xs"
                        />
                        <span className="text-[10px] text-emerald-700 font-medium mt-0.5 block truncate">
                          {formattedPricePreview}
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                          Area & Unit
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="number"
                            required
                            step="0.01"
                            min="0.01"
                            placeholder="Qty"
                            value={sellerArea}
                            onChange={(e) => setSellerArea(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-1/2 px-2.5 py-2 bg-white/90 border border-slate-200/80 rounded-xl focus:border-emerald-500 focus:outline-none text-[16px] sm:text-xs"
                          />
                          <select
                            value={sellerAreaUnit}
                            onChange={(e) => setSellerAreaUnit(e.target.value as any)}
                            className="w-1/2 px-2 py-2 bg-white/90 border border-slate-200/80 rounded-xl focus:border-emerald-500 focus:outline-none text-[16px] sm:text-[11px]"
                          >
                            <option value="Gunta">Gunta</option>
                            <option value="Acre">Acre</option>
                            <option value="Sqft">Sqft</option>
                            <option value="Hectare">Hectare</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                          Locality / City
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Taroda Khurd, Nanded"
                          value={sellerLocality}
                          onChange={(e) => setSellerLocality(e.target.value)}
                          className="w-full px-3 py-2 bg-white/90 border border-slate-200/80 rounded-xl focus:border-emerald-500 focus:outline-none text-[16px] sm:text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                          Survey / Gat No.
                        </label>
                        <input
                          type="text"
                          placeholder="Sy. No. 84/A"
                          value={sellerSurvey}
                          onChange={(e) => setSellerSurvey(e.target.value)}
                          className="w-full px-3 py-2 bg-white/90 border border-slate-200/80 rounded-xl focus:border-emerald-500 focus:outline-none text-[16px] sm:text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                          Coordinates
                        </label>
                        <button
                          type="button"
                          onClick={handleUseMapCenter}
                          className="text-[10px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Compass className="w-3 h-3" />
                          <span>Pin Current Map Center</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          step="0.0001"
                          placeholder="Latitude"
                          value={sellerLat}
                          onChange={(e) => setSellerLat(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-[16px] sm:text-xs"
                        />
                        <input
                          type="number"
                          step="0.0001"
                          placeholder="Longitude"
                          value={sellerLng}
                          onChange={(e) => setSellerLng(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-[16px] sm:text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                        Owner Contact Phone / Email
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="+91 98000 00000 or email"
                        value={sellerContact}
                        onChange={(e) => setSellerContact(e.target.value)}
                        className="w-full px-3 py-2 bg-white/90 border border-slate-200/80 rounded-xl focus:border-emerald-500 focus:outline-none text-[16px] sm:text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                        Description & Title Highlights
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Provide details about 7/12 title, road touch, boundary demarcations..."
                        value={sellerDescription}
                        onChange={(e) => setSellerDescription(e.target.value)}
                        className="w-full px-3 py-2 bg-white/90 border border-slate-200/80 rounded-xl focus:border-emerald-500 focus:outline-none resize-none text-[16px] sm:text-xs"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-700/15 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>{isSubmitting ? 'Publishing Cadastral Parcel...' : 'Publish Land Parcel'}</span>
                    </button>
                  </form>
                ) : (
                  <div className="space-y-3">
                    {userListings.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <Building2 className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-semibold text-slate-800">No Real Estate Listed Yet</h4>
                        <p className="text-xs text-slate-500 max-w-xs font-normal">
                          Switch to the "List New Property" tab above to publish your first land parcel.
                        </p>
                      </div>
                    ) : (
                      userListings.map((parcel) => (
                        <div
                          key={parcel.id}
                          className="p-3.5 bg-white/90 border border-slate-200/80 rounded-2xl shadow-xs space-y-2 hover:border-emerald-400 transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {parcel.propertyType}
                              </span>
                              <h5 className="text-xs font-bold text-slate-900 mt-1 line-clamp-1">{parcel.title}</h5>
                              <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                <span>{parcel.locality || parcel.city}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-sm font-extrabold text-slate-900 font-heading block">{parcel.priceDisplay}</span>
                              <span className="text-[10px] text-slate-500">{parcel.area} {parcel.areaUnit}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectParcel(parcel);
                                onOpenDetails(parcel);
                              }}
                              className="font-medium text-emerald-700 hover:text-emerald-800 text-[11px] cursor-pointer"
                            >
                              Inspect Details
                            </button>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => onSelectParcel(parcel)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                                title="Locate on Map"
                              >
                                <Compass className="w-3.5 h-3.5" />
                              </button>
                              {onEditListing && (
                                <button
                                  type="button"
                                  onClick={() => onEditListing(parcel)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                                  title="Edit Listing"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {onDeleteListing && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteListing(parcel.id)}
                                  className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                                  title="Delete Listing"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-slate-100 bg-white/60 backdrop-blur-md space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${hasSearched ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                    <h2 className="text-sm font-semibold text-slate-900 tracking-tight font-heading">
                      Land Parcel Directory
                    </h2>
                    {hasSearched && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {parcels.length} Listings
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {hasSearched && (
                      <>
                        <button
                          onClick={() => setShowFilters(!showFilters)}
                          className={`p-1.5 rounded-xl border text-xs transition-colors cursor-pointer ${
                            showFilters
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200'
                          }`}
                          title="Toggle Advanced Filters"
                        >
                          <SlidersHorizontal className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onTriggerScrape(currentLocationName, currentCenter)}
                          disabled={isScraping}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                          title="Scan current region"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isScraping ? 'animate-spin' : ''}`} />
                          <span>{isScraping ? 'Scanning...' : 'Scan Region'}</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={onToggle}
                      className="sm:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                      title="Close Directory"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {hasSearched && showFilters && (
                  <div className="p-3.5 rounded-2xl bg-white/90 border border-slate-200/80 shadow-xs space-y-3 animate-in fade-in duration-150">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                        Land Classification
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {propertyTypes.map((type) => (
                          <button
                            key={type}
                            onClick={() => onFilterChange({ ...filters, propertyType: type })}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium truncate text-left border transition-all cursor-pointer ${
                              filters.propertyType === type
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold'
                                : 'bg-slate-50 text-slate-600 hover:text-slate-900 border-slate-100'
                            }`}
                          >
                            {type === 'all' ? 'All Land Types' : type}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Max Budget</label>
                        <select
                          value={filters.maxPrice}
                          onChange={(e) => onFilterChange({ ...filters, maxPrice: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[16px] sm:text-xs font-normal text-slate-800 focus:outline-none focus:border-emerald-500"
                        >
                          <option value={1000000000}>Any Budget</option>
                          <option value={5000000}>Up to ₹50 Lakh</option>
                          <option value={10000000}>Up to ₹1 Crore</option>
                          <option value={20000000}>Up to ₹2 Crore</option>
                          <option value={50000000}>Up to ₹5 Crore</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Sort Listings</label>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[16px] sm:text-xs font-normal text-slate-800 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="price-asc">Price: Low to High</option>
                          <option value="price-desc">Price: High to Low</option>
                          <option value="area-desc">Largest Land Area</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.verifiedOnly}
                          onChange={(e) => onFilterChange({ ...filters, verifiedOnly: e.target.checked })}
                          className="rounded accent-emerald-600"
                        />
                        <span>Verified 7/12 Survey Only</span>
                      </label>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1 font-normal truncate">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Focus: <strong className="font-semibold text-slate-800">{hasSearched ? currentLocationName : 'None'}</strong></span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                    Verified Registry
                  </span>
                </div>
              </div>

              <div className="flex-1 flex overflow-x-auto snap-x snap-mandatory gap-4 px-4 pb-4 sm:flex-col sm:overflow-y-auto sm:px-0 sm:p-3 sm:space-y-3 custom-scrollbar">
                {!hasSearched ? (
                  <div className="w-full shrink-0 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50/80 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-4 shadow-xs">
                      <Search className="w-6 h-6 stroke-[1.75]" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 font-heading">
                      No Area Selected
                    </h3>
                    <p className="text-xs text-slate-500 max-w-xs mt-1.5 leading-relaxed font-normal">
                      Search for a city, locality, or landmark above to discover and inspect land parcels.
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                      {['Pune', 'Nashik', 'Nagpur', 'Chhatrapati Sambhajinagar', 'Nanded, India'].map((chip) => (
                        <button
                          key={chip}
                          onClick={() => onTriggerScrape(chip)}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium shadow-xs transition-colors cursor-pointer"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : isLoading || isScraping ? (
                  <div className="flex gap-4 sm:flex-col sm:space-y-3 shrink-0">
                    <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-100 text-xs text-emerald-800 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600 animate-spin" />
                      <span>Aggregating live property parcels across registry databases...</span>
                    </div>
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className="w-[85vw] shrink-0 sm:w-full p-3.5 rounded-2xl bg-white/80 border border-slate-200/60 shadow-xs animate-shimmer space-y-3"
                      >
                        <div className="w-full aspect-video rounded-xl bg-slate-200" />
                        <div className="space-y-2 py-1">
                          <div className="h-3 bg-slate-200 rounded w-1/3" />
                          <div className="h-4 bg-slate-200 rounded w-4/5" />
                          <div className="h-5 bg-slate-200 rounded w-2/5" />
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 pt-1">
                          <div className="h-5 bg-slate-100 rounded-lg" />
                          <div className="h-5 bg-slate-100 rounded-lg" />
                          <div className="h-5 bg-slate-100 rounded-lg" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : sortedParcels.length === 0 ? (
                  <div className="w-full shrink-0 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      No properties found for this region
                    </h3>
                    <p className="text-xs text-slate-500 max-w-xs mt-1.5 font-normal leading-relaxed">
                      Try searching a neighboring locality or district headquarters.
                    </p>
                    <button
                      onClick={() => onTriggerScrape(currentLocationName, currentCenter)}
                      className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                    >
                      Retry Search
                    </button>
                  </div>
                ) : (
                  sortedParcels.map((parcel) => (
                    <PropertyCard
                      key={parcel.id}
                      parcel={parcel}
                      isSelected={selectedParcel?.id === parcel.id}
                      onSelect={onSelectParcel}
                      onOpenDetails={onOpenDetails}
                    />
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      </aside>

      <button
        onClick={onToggle}
        aria-label={isOpen ? 'Collapse Panel' : 'Expand Property Listings'}
        className={`hidden sm:flex fixed top-24 z-40 p-2.5 rounded-r-2xl bg-white/90 hover:bg-white border border-l-0 border-slate-200 text-slate-700 shadow-md transition-all duration-300 backdrop-blur-md cursor-pointer ${
          isOpen ? 'sm:left-[436px]' : 'sm:left-0'
        }`}
        title={isOpen ? 'Collapse Panel' : 'Expand Property Listings'}
      >
        {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      <button
        type="button"
        onClick={onToggle}
        aria-label={isOpen ? 'Hide Property Carousel' : 'Show Property Carousel'}
        className={`sm:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full bg-white/95 backdrop-blur-xl border border-white/80 text-slate-800 shadow-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all duration-300 ${
          isOpen ? 'opacity-0 pointer-events-none translate-y-8' : 'opacity-100 translate-y-0'
        }`}
      >
        <Building2 className="w-4 h-4 text-emerald-600" />
        <span>{mode === 'seller' ? 'Seller Panel' : `Properties (${parcels.length})`}</span>
      </button>
    </>
  );
};
