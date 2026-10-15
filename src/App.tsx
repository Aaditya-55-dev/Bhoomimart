import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { LandParcel, FilterState, MapLayerState, GeocodeLocation, AppUser, UserInquiry, SellerPropertyInput } from './types';
import { MapView } from './components/MapView';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { PropertyDetailModal } from './components/PropertyDetailModal';
import { MapLayersControl } from './components/MapLayersControl';
import { UnitConverterModal } from './components/UnitConverterModal';
import { AuthModal } from './components/AuthModal';
import { ProfileDrawer } from './components/ProfileDrawer';
import { ShieldCheck } from 'lucide-react';

const INITIAL_FILTERS: FilterState = {
  locality: 'all',
  propertyType: 'all',
  minPrice: 0,
  maxPrice: 1000000000,
  sellerType: 'all',
  verifiedOnly: false,
  searchQuery: ''
};

const INITIAL_LAYERS: MapLayerState = {
  tileMode: 'streets',
  showSurveyNumbers: true,
  showPolygons: true,
  showFloodZones: false
};

const DEFAULT_CENTER: [number, number] = [19.1383, 77.3210];

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [mode, setMode] = useState<'buyer' | 'seller'>('buyer');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);

  const [parcels, setParcels] = useState<LandParcel[]>([]);
  const [userListings, setUserListings] = useState<LandParcel[]>([]);
  const [savedInquiries, setSavedInquiries] = useState<UserInquiry[]>([]);

  const [selectedParcel, setSelectedParcel] = useState<LandParcel | null>(null);
  const [modalParcel, setModalParcel] = useState<LandParcel | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [layers, setLayers] = useState<MapLayerState>(INITIAL_LAYERS);
  
  const [currentLocationName, setCurrentLocationName] = useState('Nanded, India');
  const [currentCenter, setCurrentCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [targetBoundingBox, setTargetBoundingBox] = useState<[number, number, number, number] | undefined>(undefined);
  
  const [notification, setNotification] = useState<{ message: string; submessage?: string } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [converterState, setConverterState] = useState<{
    isOpen: boolean;
    initialValue: number;
    initialUnit: 'Gunta' | 'Acre' | 'Sqft' | 'Hectare' | 'Sqm' | 'Are';
  }>({
    isOpen: false,
    initialValue: 1,
    initialUnit: 'Acre'
  });

  const showToast = useCallback((message: string, submessage?: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setNotification({ message, submessage });
    toastTimerRef.current = setTimeout(() => {
      setNotification(null);
      toastTimerRef.current = null;
    }, 5000);
  }, []);

  const handleExecuteSearch = useCallback(async (query: string, overrideCoords?: [number, number]) => {
    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setHasSearched(true);
    setIsLoading(true);
    setIsScraping(true);
    setParcels([]);
    setSelectedParcel(null);

    let lat = overrideCoords ? overrideCoords[0] : currentCenter[0];
    let lng = overrideCoords ? overrideCoords[1] : currentCenter[1];
    let resolvedName = cleanQuery;

    if (!overrideCoords) {
      try {
        const geoRes = await axios.get(`/api/geocode?q=${encodeURIComponent(cleanQuery)}`, {
          signal: controller.signal
        });
        if (geoRes.data.success && geoRes.data.location) {
          const loc: GeocodeLocation = geoRes.data.location;
          lat = loc.coordinates[0];
          lng = loc.coordinates[1];
          resolvedName = loc.displayName || loc.name;
          setCurrentLocationName(resolvedName);
          setCurrentCenter(loc.coordinates);
          setTargetBoundingBox(loc.boundingBox);
        }
      } catch (err: any) {
        if (axios.isCancel(err) || err.name === 'CanceledError') return;
      }
    }

    try {
      const scrapeUrl = `/api/scrape?location=${encodeURIComponent(cleanQuery)}&lat=${lat}&lng=${lng}`;
      const scrapeRes = await axios.get(scrapeUrl, {
        signal: controller.signal
      });

      if (scrapeRes.data.success) {
        const scrapedItems: LandParcel[] = scrapeRes.data.properties || [];
        setParcels(scrapedItems);
        if (scrapedItems.length > 0) {
          setSelectedParcel(scrapedItems[0]);
          showToast(
            `Found ${scrapedItems.length} verified listings in ${cleanQuery}`,
            `Synced with cadastral registry • Live data active`
          );
        } else {
          showToast(
            `No properties found for "${cleanQuery}"`,
            'Try searching a neighboring locality or district'
          );
        }
      }
    } catch (err: any) {
      if (axios.isCancel(err) || err.name === 'CanceledError') return;
      setParcels([]);
      const errMsg = err?.response?.data?.message || 'Could not retrieve listings for this region';
      showToast(`Search error for ${cleanQuery}`, errMsg);
    } finally {
      if (abortControllerRef.current === controller) {
        setIsLoading(false);
        setIsScraping(false);
      }
    }
  }, [currentCenter, showToast]);

  const fetchUserProperties = useCallback(async (userUid?: string) => {
    try {
      const url = userUid ? `/api/properties?sellerId=${encodeURIComponent(userUid)}` : '/api/properties';
      const res = await axios.get(url);
      if (res.data.success) {
        setUserListings(res.data.properties || []);
      }
    } catch {}
  }, []);

  const fetchUserInquiries = useCallback(async (userId: string) => {
    try {
      const res = await axios.get(`/api/user/inquiries?userId=${userId}`);
      if (res.data.success) {
        setSavedInquiries(res.data.inquiries || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('bhumimart_user') || localStorage.getItem('bhoomimart_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        const resolvedUser: AppUser = {
          ...parsed,
          uid: parsed.uid || parsed.id
        };
        setUser(resolvedUser);
      }
    } catch {}

    handleExecuteSearch('Nanded, India', DEFAULT_CENTER);

    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    const activeUid = user?.uid || user?.id;
    fetchUserProperties(activeUid);
    if (activeUid) {
      fetchUserInquiries(activeUid);
    }
  }, [user, fetchUserProperties, fetchUserInquiries]);

  const handleMapPanEnd = useCallback((lat: number, lng: number) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const dist = Math.sqrt(Math.pow(lat - currentCenter[0], 2) + Math.pow(lng - currentCenter[1], 2));
    if (dist > 0.25) {
      setCurrentCenter([lat, lng]);
    }
  }, [currentCenter]);

  const handleToggleMode = (newMode: 'buyer' | 'seller') => {
    if (newMode === 'seller' && !user) {
      setIsAuthModalOpen(true);
      return;
    }
    setMode(newMode);
    if (!isSidebarOpen) {
      setIsSidebarOpen(true);
    }
  };

  const handleAddSellerListing = async (input: SellerPropertyInput) => {
    const activeUid = user?.uid || user?.id;
    const payload = {
      ...input,
      userId: activeUid,
      uid: activeUid,
      sellerId: activeUid,
      email: user?.email,
      timestamp: new Date().toISOString(),
      sellerName: user?.name || 'Verified Owner'
    };

    try {
      const res = await axios.post('/api/properties', payload);
      if (res.data.success && res.data.property) {
        const newProperty: LandParcel = res.data.property;
        setUserListings((prev) => [newProperty, ...prev]);
        setParcels((prev) => [newProperty, ...prev]);
        setSelectedParcel(newProperty);
        setCurrentCenter(newProperty.coordinates);
        showToast(
          `Listed: ${newProperty.title}`,
          `Published in Cadastral Registry • Boundaries active`
        );
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Please verify form inputs and try again';
      showToast('Error publishing listing', msg);
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    const activeUid = user?.uid || user?.id;
    setUserListings((prev) => prev.filter((p) => p.id !== listingId));
    setParcels((prev) => prev.filter((p) => p.id !== listingId));
    if (selectedParcel?.id === listingId) {
      setSelectedParcel(null);
    }

    try {
      await axios.delete(`/api/properties/${listingId}`);
      showToast('Listing Removed', 'Property removed from active registry');
    } catch {
      fetchUserProperties(activeUid);
      showToast('Failed to delete listing', 'Please try again later');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('bhumimart_user');
    localStorage.removeItem('bhumimart_token');
    localStorage.removeItem('bhoomimart_user');
    localStorage.removeItem('bhoomimart_token');
    setUser(null);
    setMode('buyer');
    showToast('Signed Out', 'Switched back to public guest explorer');
  };

  const handleUpdateAvatar = async (newAvatarUrl: string | undefined) => {
    if (!user) return;
    const activeUid = user.uid || user.id;
    const updatedUser: AppUser = {
      ...user,
      avatarUrl: newAvatarUrl
    };

    try {
      await axios.put('/api/user/profile', {
        userId: activeUid,
        email: user.email,
        avatarUrl: newAvatarUrl || null
      });
    } catch {}

    setUser(updatedUser);
    try {
      localStorage.setItem('bhumimart_user', JSON.stringify(updatedUser));
    } catch {}
    showToast(newAvatarUrl ? 'Profile photo updated' : 'Profile photo removed', 'Synced across profile & navigation');
  };

  const handleRemoveInquiry = async (inquiryId: string) => {
    try {
      await axios.delete(`/api/user/inquiries/${inquiryId}`);
      setSavedInquiries((prev) => prev.filter((i) => i.id !== inquiryId));
    } catch {}
  };

  const handleSaveInquiry = async (parcel: LandParcel) => {
    if (!user) return;
    const activeUid = user.uid || user.id;
    try {
      const res = await axios.post('/api/user/inquiries', {
        userId: activeUid,
        parcelId: parcel.id,
        parcelTitle: parcel.title,
        priceDisplay: parcel.priceDisplay,
        locality: parcel.locality,
        sourceHost: parcel.sourceHost
      });
      if (res.data.success && res.data.inquiry) {
        setSavedInquiries((prev) => [res.data.inquiry, ...prev.filter((i) => i.id !== res.data.inquiry.id)]);
        showToast('Inquiry Bookmarked', `Saved to your verified investor portfolio`);
      }
    } catch {}
  };

  const displayedParcels = [...userListings, ...parcels].reduce<LandParcel[]>((acc, current) => {
    if (!acc.some((item) => item.id === current.id)) {
      acc.push(current);
    }
    return acc;
  }, []);

  const filteredParcels = displayedParcels.filter((p) => {
    if (filters.locality !== 'all' && !p.locality.toLowerCase().includes(filters.locality.toLowerCase()) && !p.city.toLowerCase().includes(filters.locality.toLowerCase())) {
      return false;
    }
    if (filters.propertyType !== 'all' && p.propertyType !== filters.propertyType) {
      return false;
    }
    if (filters.sellerType !== 'all' && p.sellerType !== filters.sellerType) {
      return false;
    }
    if (filters.verifiedOnly && !p.isVerified) {
      return false;
    }
    if (typeof filters.minPrice === 'number' && p.price < filters.minPrice) {
      return false;
    }
    if (typeof filters.maxPrice === 'number' && filters.maxPrice > 0 && p.price > filters.maxPrice) {
      return false;
    }
    if (filters.searchQuery.trim().length > 0) {
      const q = filters.searchQuery.toLowerCase();
      const match =
        p.title.toLowerCase().includes(q) ||
        p.locality.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q) ||
        p.surveyNumber.toLowerCase().includes(q) ||
        p.sellerName.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-50 text-slate-900">
      
      <MapView
        parcels={filteredParcels}
        selectedParcel={selectedParcel}
        onSelectParcel={(parcel) => {
          setSelectedParcel(parcel);
          if (!isSidebarOpen) setIsSidebarOpen(true);
        }}
        onOpenDetails={(parcel) => setModalParcel(parcel)}
        layers={layers}
        centerCoordinates={currentCenter}
        targetBoundingBox={targetBoundingBox}
        onMapPanEnd={handleMapPanEnd}
      />

      <Navbar
        filters={filters}
        onFilterChange={setFilters}
        onUniversalSearch={(query) => handleExecuteSearch(query)}
        onOpenConverter={() =>
          setConverterState({
            isOpen: true,
            initialValue: selectedParcel ? selectedParcel.area : 1,
            initialUnit: selectedParcel ? (selectedParcel.areaUnit as any) : 'Acre'
          })
        }
        isScraping={isScraping}
        currentLocationName={currentLocationName}
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenProfile={() => setIsProfileDrawerOpen(true)}
        mode={mode}
        onToggleMode={handleToggleMode}
      />

      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        parcels={filteredParcels}
        selectedParcel={selectedParcel}
        onSelectParcel={setSelectedParcel}
        onOpenDetails={(parcel) => setModalParcel(parcel)}
        isLoading={isLoading}
        isScraping={isScraping}
        hasSearched={hasSearched}
        onTriggerScrape={(loc, coords) => handleExecuteSearch(loc, coords)}
        filters={filters}
        onFilterChange={setFilters}
        currentLocationName={currentLocationName}
        mode={mode}
        user={user}
        userListings={userListings}
        currentCenter={currentCenter}
        onAddListing={handleAddSellerListing}
        onDeleteListing={handleDeleteListing}
        onEditListing={(parcel) => {
          setSelectedParcel(parcel);
          setModalParcel(parcel);
        }}
      />

      <MapLayersControl
        layers={layers}
        onChangeLayers={setLayers}
      />

      <PropertyDetailModal
        key={modalParcel?.id || 'property-detail-modal'}
        parcel={modalParcel}
        onClose={() => setModalParcel(null)}
        onOpenConverter={(val, unit) =>
          setConverterState({
            isOpen: true,
            initialValue: val,
            initialUnit: unit
          })
        }
        onSaveInquiry={handleSaveInquiry}
      />

      <UnitConverterModal
        isOpen={converterState.isOpen}
        onClose={() => setConverterState((prev) => ({ ...prev, isOpen: false }))}
        initialValue={converterState.initialValue}
        initialUnit={converterState.initialUnit}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(loggedUser) => {
          setUser(loggedUser);
          showToast(`Welcome, ${loggedUser.name}!`, 'Authenticated with Land Registry');
        }}
      />

      <ProfileDrawer
        isOpen={isProfileDrawerOpen}
        onClose={() => setIsProfileDrawerOpen(false)}
        user={user}
        onLogout={handleLogout}
        onSelectParcel={(parcel) => {
          setSelectedParcel(parcel);
          setCurrentCenter(parcel.coordinates);
        }}
        onSwitchToSellerMode={() => setMode('seller')}
        onDeleteListing={handleDeleteListing}
        onEditListing={(parcel) => {
          setSelectedParcel(parcel);
          setModalParcel(parcel);
        }}
        userListings={userListings}
        savedInquiries={savedInquiries}
        onRemoveInquiry={handleRemoveInquiry}
        onUpdateAvatar={handleUpdateAvatar}
      />

      {notification && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-start gap-3 px-4 py-3 rounded-2xl bg-white/95 border border-emerald-200/90 text-slate-900 shadow-[0_12px_40px_0_rgba(15,23,42,0.12)] backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-3 duration-200 max-w-md">
          <div className="p-1 rounded-lg bg-emerald-50 text-emerald-600 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-900">{notification.message}</p>
            {notification.submessage && (
              <p className="text-[11px] text-slate-500 font-normal mt-0.5">{notification.submessage}</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
