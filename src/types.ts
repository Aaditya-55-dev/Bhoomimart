export interface LandMetrics {
  slope: string;
  slopeAngle: number;
  floodRisk: 'Minimal' | 'Low (Zone C)' | 'Moderate' | 'High';
  solarYield: string;
  groundwaterDepth: string;
  soilType: string;
  roadWidthFt: number;
}

export interface LegalComplianceInfo {
  robotsAllowed: boolean;
  crawlDelaySeconds: number;
  delayAppliedMs: number;
  verifiedAt: string;
  isPublicListing: boolean;
  disclaimer: string;
}

export interface LandParcel {
  id: string;
  title: string;
  locality: string;
  city: string;
  country: string;
  price: number;
  priceNumericINR?: number;
  currency: string;
  priceDisplay: string;
  pricePerUnit: string;
  area: number;
  areaGunta?: number;
  areaUnit: 'Gunta' | 'Acre' | 'Sqft' | 'Hectare' | 'Sqm';
  areaSqft: number;
  propertyType: 'Residential Land' | 'Agricultural Parcel' | 'Commercial Plot' | 'Industrial Estate' | 'Home' | 'Plot' | 'Farm';
  sellerType: 'Direct Owner' | 'Verified Agent' | 'Institutional Registry';
  sellerName: string;
  sellerContact: string;
  surveyNumber: string;
  isVerified: boolean;
  coordinates: [number, number];
  polygon: [number, number][];
  metrics: LandMetrics;
  source: string;
  sourceUrl: string;
  sourceHost: string;
  legalCompliance: LegalComplianceInfo;
  description: string;
  images: string[];
  features: string[];
  createdAt: string;
  ownerId?: string;
  sellerId?: string;
  isUserListed?: boolean;
}

export interface GeocodeLocation {
  name: string;
  displayName: string;
  city: string;
  country: string;
  coordinates: [number, number];
  boundingBox?: [number, number, number, number];
}

export interface FilterState {
  locality: string;
  propertyType: string;
  minPrice: number;
  maxPrice: number;
  sellerType: string;
  verifiedOnly: boolean;
  searchQuery: string;
}

export interface MapLayerState {
  tileMode: 'light' | 'streets' | 'satellite';
  showSurveyNumbers: boolean;
  showPolygons: boolean;
  showFloodZones: boolean;
}

export interface AppUser {
  id: string;
  uid?: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface UserInquiry {
  id: string;
  userId: string;
  parcelId: string;
  parcelTitle: string;
  priceDisplay: string;
  locality: string;
  sourceHost: string;
  createdAt: string;
  status: 'Inquired' | 'Bookmarked' | 'Visited';
}

export interface SellerPropertyInput {
  title: string;
  category: 'Home' | 'Land' | 'Plot' | 'Farm' | 'Commercial';
  price: number;
  area: number;
  areaUnit: 'Gunta' | 'Acre' | 'Sqft' | 'Hectare';
  locality: string;
  coordinates: [number, number];
  description: string;
  surveyNumber: string;
  sellerContact: string;
  uid?: string;
  sellerId?: string;
  userId?: string;
  email?: string;
  timestamp?: string;
  sellerName?: string;
}
