import React, { useState, useRef, useEffect } from 'react';
import { 
  X, User, Calendar, PlusCircle, Trash2, Edit3, 
  Bookmark, Building2, MapPin, ExternalLink, LogOut, ShieldCheck, CheckCircle,
  Camera, Upload, AlertCircle, RefreshCw
} from 'lucide-react';
import { AppUser, LandParcel, UserInquiry } from '../types';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: AppUser | null;
  onLogout: () => void;
  onSelectParcel: (parcel: LandParcel) => void;
  onSwitchToSellerMode: () => void;
  onDeleteListing: (listingId: string) => void;
  onEditListing: (parcel: LandParcel) => void;
  userListings: LandParcel[];
  savedInquiries: UserInquiry[];
  onRemoveInquiry: (inquiryId: string) => void;
  onUpdateAvatar?: (newAvatarUrl: string | undefined) => Promise<void> | void;
}

export const ProfileDrawer: React.FC<ProfileDrawerProps> = ({
  isOpen,
  onClose,
  user,
  onLogout,
  onSelectParcel,
  onSwitchToSellerMode,
  onDeleteListing,
  onEditListing,
  userListings,
  savedInquiries,
  onRemoveInquiry,
  onUpdateAvatar
}) => {
  const [activeTab, setActiveTab] = useState<'listings' | 'inquiries'>('listings');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const joinDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }) : new Date().toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const currentUserUid = user.uid || user.id;
  const myListings = userListings.filter(p => p.sellerId === currentUserUid || p.ownerId === currentUserUid || p.ownerId === user.id);

  const handleTriggerFileInput = () => {
    setUploadError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WEBP).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size exceeds 5MB limit. Please choose a smaller file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        try {
          if (onUpdateAvatar) {
            await onUpdateAvatar(dataUrl);
          }
        } catch {
          setUploadError('Failed to update avatar. Please try again.');
        } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.onerror = () => {
        setUploadError('Failed to read image file.');
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadError('Failed to process image.');
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    setUploadError(null);
    setIsUploading(true);
    try {
      if (onUpdateAvatar) {
        await onUpdateAvatar(undefined);
      }
    } catch {
      setUploadError('Failed to reset photo.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="User Profile and Listings"
      className="fixed inset-0 z-50 overflow-hidden pointer-events-auto"
    >
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/25 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white/90 backdrop-blur-2xl border-l border-white/60 shadow-[-20px_0_60px_-15px_rgba(15,23,42,0.15)] flex flex-col text-slate-800">
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="p-5 border-b border-slate-100 bg-white/70">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="relative group shrink-0">
                  <button
                    type="button"
                    onClick={handleTriggerFileInput}
                    disabled={isUploading}
                    className="relative block w-14 h-14 rounded-full overflow-hidden border-2 border-slate-200/90 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all group-hover:border-emerald-500"
                    title="Click to change profile picture"
                  >
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 overflow-hidden">
                        {user.name ? (
                          <span className="font-extrabold text-lg text-slate-700">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        ) : (
                          <User className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {isUploading ? (
                        <RefreshCw className="w-5 h-5 text-white animate-spin" />
                      ) : (
                        <Camera className="w-5 h-5 text-white" />
                      )}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleTriggerFileInput}
                    disabled={isUploading}
                    className="absolute -bottom-1 -right-1 p-1 rounded-full bg-emerald-600 text-white shadow-md hover:bg-emerald-700 transition-colors border-2 border-white"
                    title="Change Photo"
                  >
                    <Camera className="w-3 h-3" />
                  </button>
                </div>

                <div className="min-w-0">
                  <h3 className="font-bold text-base text-slate-900 font-heading leading-tight truncate">
                    {user.name}
                  </h3>
                  <p className="text-xs text-slate-500 truncate max-w-[200px]">{user.email}</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                    <Calendar className="w-3 h-3" />
                    <span>Member since {joinDate}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleTriggerFileInput}
                disabled={isUploading}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 transition-colors"
              >
                <Upload className="w-3 h-3" />
                <span>{user.avatarUrl ? 'Change Photo' : 'Upload Photo'}</span>
              </button>
              {user.avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={isUploading}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 border border-rose-200/80 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove Photo</span>
                </button>
              )}
            </div>

            {uploadError && (
              <div className="mt-2.5 p-2 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-1.5 text-xs text-rose-700 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-50/80 border-b border-slate-100">
            <div className="flex p-1 bg-slate-200/60 rounded-xl">
              <button
                onClick={() => setActiveTab('listings')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'listings'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>My Listings ({myListings.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('inquiries')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'inquiries'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Saved Inquiries ({savedInquiries.length})</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {activeTab === 'listings' ? (
              myListings.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800">No Real Estate Listed Yet</h4>
                  <p className="text-xs text-slate-500 max-w-xs font-normal">
                    You have not listed any plots, land, or homes yet. Switch to Seller Mode to publish your property.
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      onSwitchToSellerMode();
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5 mt-2"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Create New Listing</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Active Seller Portfolio
                    </span>
                    <button
                      onClick={() => {
                        onClose();
                        onSwitchToSellerMode();
                      }}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Add Listing</span>
                    </button>
                  </div>

                  {myListings.map((parcel) => (
                    <div
                      key={parcel.id}
                      className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
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
                          onClick={() => {
                            onClose();
                            onSelectParcel(parcel);
                          }}
                          className="font-medium text-emerald-700 hover:text-emerald-800 hover:underline text-[11px]"
                        >
                          View on Map
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              onClose();
                              onEditListing(parcel);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            title="Edit Listing"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteListing(parcel.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                            title="Delete Listing"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              savedInquiries.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                    <Bookmark className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800">No Saved Inquiries</h4>
                  <p className="text-xs text-slate-500 max-w-xs font-normal">
                    Properties you bookmark or submit inquiries for while in Buyer Mode will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {savedInquiries.map((inq) => (
                    <div
                      key={inq.id}
                      className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {inq.status}
                            </span>
                            <span className="text-[10px] text-slate-400">{inq.createdAt}</span>
                          </div>
                          <h5 className="text-xs font-bold text-slate-900 mt-1 line-clamp-1">{inq.parcelTitle}</h5>
                          <span className="text-[11px] text-slate-500">{inq.locality}</span>
                        </div>
                        <span className="text-sm font-extrabold text-slate-900 font-heading">{inq.priceDisplay}</span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <span className="text-[10px] text-slate-400">Via {inq.sourceHost}</span>
                        <button
                          onClick={() => onRemoveInquiry(inq.id)}
                          className="text-[11px] font-medium text-rose-600 hover:text-rose-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          <div className="p-4 border-t border-slate-100 bg-white/80 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Verified Account</span>
            </div>

            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
