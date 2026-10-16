import React, { useState } from 'react';
import { Search, Calculator, RefreshCw, X, Navigation, User, ShoppingBag, PlusCircle } from 'lucide-react';
import { FilterState, AppUser } from '../types';

interface NavbarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onUniversalSearch: (query: string) => void;
  onOpenConverter: () => void;
  isScraping: boolean;
  currentLocationName: string;
  user: AppUser | null;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
  mode: 'buyer' | 'seller';
  onToggleMode: (mode: 'buyer' | 'seller') => void;
}

const MAHARASHTRA_LOCATIONS = [
  'Nanded, India',
  'Pune',
  'Nagpur',
  'Nashik',
  'Chhatrapati Sambhajinagar',
  'Thane'
];

export const Navbar: React.FC<NavbarProps> = ({
  filters,
  onFilterChange,
  onUniversalSearch,
  onOpenConverter,
  isScraping,
  currentLocationName,
  user,
  onOpenAuth,
  onOpenProfile,
  mode,
  onToggleMode
}) => {
  const [searchInput, setSearchInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onUniversalSearch(searchInput.trim());
    }
  };

  const handleChipClick = (loc: string) => {
    setSearchInput(loc);
    onUniversalSearch(loc);
  };

  return (
    <header className="fixed top-4 left-4 right-4 z-30 flex flex-col items-center pointer-events-none">
      <div className="w-full max-w-6xl flex items-center justify-between gap-3 p-2 sm:p-2.5 rounded-2xl bg-white/75 backdrop-blur-2xl border border-white/70 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] pointer-events-auto">
        
        <div className="flex items-center gap-2.5 pl-2 shrink-0">
          <img
            src="/placeholder-logo.png"
            alt="Bhumimart Logo"
            className="w-8 h-8 rounded-lg object-contain bg-slate-100 border border-slate-200 shrink-0"
          />
          <div>
            <div className="flex items-center">
              <span className="font-black text-lg tracking-tight text-slate-900 font-heading">
                Bhumimart<span className="text-emerald-600">.</span>
              </span>
            </div>
            <span className="hidden sm:block text-[11px] text-slate-400 font-medium tracking-tight">
              Land Parcel Intelligence Platform
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 min-w-0 max-w-md mx-1 sm:mx-2">
          <div className="relative flex items-center min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Maharashtra city, taluka, or area..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full min-w-0 pl-10 pr-9 py-2 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200/80 focus:border-emerald-500 rounded-xl text-[16px] sm:text-xs font-normal text-slate-800 placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-3 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </form>

        <div className="flex items-center gap-2 pr-1 shrink-0">
          <button
            onClick={onOpenConverter}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-all shadow-xs"
            title="Convert Land Measurement Units"
          >
            <Calculator className="w-3.5 h-3.5 text-emerald-600" />
            <span>Gunta Calculator</span>
          </button>

          <button
            onClick={() => onUniversalSearch(searchInput.trim() || currentLocationName || 'Nanded, India')}
            disabled={isScraping}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-60"
            title="Search land parcels in this area"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScraping ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isScraping ? 'Searching...' : 'Discover'}</span>
          </button>

          {user ? (
            <div className="flex items-center gap-2 pl-1 border-l border-slate-200/80">
              <div className="flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/70">
                <button
                  type="button"
                  onClick={() => onToggleMode('buyer')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                    mode === 'buyer'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Buyer Mode: Search & Explore Land Parcels"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Buyer</span>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleMode('seller')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                    mode === 'seller'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Seller Mode: List & Manage Your Land Parcels"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Seller</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onOpenProfile}
                className="relative group p-0.5 rounded-full transition-all focus:outline-none"
                title={`Profile & Dashboard: ${user.name}`}
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-xs group-hover:ring-2 group-hover:ring-emerald-400 transition-all"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 overflow-hidden shadow-xs group-hover:ring-2 group-hover:ring-emerald-400 transition-all">
                    {user.name ? (
                      <span className="text-xs font-bold text-slate-700">{user.name.charAt(0).toUpperCase()}</span>
                    ) : (
                      <User className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                )}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all ml-1"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In / Join</span>
            </button>
          )}

        </div>

      </div>

      <div className="w-full max-w-6xl overflow-x-auto custom-scrollbar py-2 px-1 flex items-center gap-1.5 pointer-events-auto">
        <span className="text-[11px] font-medium text-slate-500 px-1 shrink-0 flex items-center gap-1">
          <Navigation className="w-3 h-3 text-slate-400" /> Quick Maharashtra Search:
        </span>
        {MAHARASHTRA_LOCATIONS.map((loc) => {
          const isSelected = currentLocationName.toLowerCase().includes(loc.split(',')[0].toLowerCase());
          return (
            <button
              key={loc}
              onClick={() => handleChipClick(loc)}
              className={`shrink-0 px-3 py-2 rounded-full text-xs font-medium transition-all backdrop-blur-md border ${
                isSelected
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                  : 'bg-white/80 hover:bg-white text-slate-600 border-slate-200/80 shadow-xs'
              }`}
            >
              {loc}
            </button>
          );
        })}
      </div>
    </header>
  );
};
