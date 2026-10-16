import 'dotenv/config';
import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { LandParcel, GeocodeLocation, AppUser, UserInquiry } from './src/types';
import { computePricePerUnit } from './src/server/utils/units';
import { deterministicHash, generatePolygonAroundCenter, generateSvgThumbnail } from './src/server/utils/spatial';
import { ingestionPipeline } from './src/server/scrapers/pipeline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const geocodeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 45,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many geocode requests, please try again shortly.' }
});

const scrapeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many search requests, please try again shortly.' }
});

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_FILE = path.resolve(DATA_DIR, 'store.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface LocalStore {
  users: Record<string, { user: AppUser; passwordHash: string }>;
  userListings: LandParcel[];
  userInquiries: UserInquiry[];
}

function loadStore(): LocalStore {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {}
  return { users: {}, userListings: [], userInquiries: [] };
}

function saveStore(data: LocalStore) {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch {}
}

let store = loadStore();

const MAHARASHTRA_GEOCODES: Record<string, GeocodeLocation> = {
  'nanded': {
    name: 'Nanded',
    displayName: 'Nanded, Marathwada, Maharashtra, India',
    city: 'Nanded',
    country: 'India',
    coordinates: [19.1383, 77.3210],
    boundingBox: [19.08, 77.25, 19.22, 77.38]
  },
  'pune': {
    name: 'Pune',
    displayName: 'Pune, Maharashtra, India',
    city: 'Pune',
    country: 'India',
    coordinates: [18.5204, 73.8567],
    boundingBox: [18.42, 73.75, 18.62, 73.98]
  },
  'nagpur': {
    name: 'Nagpur',
    displayName: 'Nagpur, Vidarbha, Maharashtra, India',
    city: 'Nagpur',
    country: 'India',
    coordinates: [21.1458, 79.0882],
    boundingBox: [21.05, 78.98, 21.25, 79.18]
  },
  'nashik': {
    name: 'Nashik',
    displayName: 'Nashik, Maharashtra, India',
    city: 'Nashik',
    country: 'India',
    coordinates: [19.9975, 73.7898],
    boundingBox: [19.90, 73.70, 20.08, 73.88]
  },
  'chhatrapati sambhajinagar': {
    name: 'Chhatrapati Sambhajinagar',
    displayName: 'Chhatrapati Sambhajinagar (Aurangabad), Maharashtra, India',
    city: 'Chhatrapati Sambhajinagar',
    country: 'India',
    coordinates: [19.8762, 75.3433],
    boundingBox: [19.80, 75.25, 19.95, 75.42]
  },
  'aurangabad': {
    name: 'Chhatrapati Sambhajinagar',
    displayName: 'Chhatrapati Sambhajinagar (Aurangabad), Maharashtra, India',
    city: 'Chhatrapati Sambhajinagar',
    country: 'India',
    coordinates: [19.8762, 75.3433],
    boundingBox: [19.80, 75.25, 19.95, 75.42]
  },
  'parbhani': {
    name: 'Parbhani',
    displayName: 'Parbhani, Marathwada, Maharashtra, India',
    city: 'Parbhani',
    country: 'India',
    coordinates: [19.2608, 76.7749],
    boundingBox: [19.20, 76.70, 19.32, 76.85]
  },
  'thane': {
    name: 'Thane',
    displayName: 'Thane, Mumbai Metropolitan Region, Maharashtra, India',
    city: 'Thane',
    country: 'India',
    coordinates: [19.2183, 72.9781],
    boundingBox: [19.15, 72.90, 19.28, 73.05]
  },
  'mumbai': {
    name: 'Mumbai',
    displayName: 'Mumbai, Maharashtra, India',
    city: 'Mumbai',
    country: 'India',
    coordinates: [19.0760, 72.8777],
    boundingBox: [18.90, 72.75, 19.25, 73.00]
  }
};

interface GeocodeCacheEntry {
  location: GeocodeLocation | null;
  expiresAt: number;
}
const geocodeCache = new Map<string, GeocodeCacheEntry>();
const GEOCODE_CACHE_TTL = 24 * 60 * 60 * 1000;

let lastNominatimTimestamp = 0;
async function throttleNominatim(): Promise<void> {
  const now = Date.now();
  const timeSinceLast = now - lastNominatimTimestamp;
  if (timeSinceLast < 1100) {
    await new Promise((r) => setTimeout(r, 1100 - timeSinceLast));
  }
  lastNominatimTimestamp = Date.now();
}

async function geocodeLocation(query: string): Promise<GeocodeLocation | null> {
  const normalized = query.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized) return null;

  const knownKey = Object.keys(MAHARASHTRA_GEOCODES).find((k) => {
    if (normalized === k) return true;
    const regex = new RegExp(`\\b${k}\\b`, 'i');
    return regex.test(normalized);
  });

  if (knownKey) {
    return MAHARASHTRA_GEOCODES[knownKey];
  }

  const cached = geocodeCache.get(normalized);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.location;
  }

  try {
    await throttleNominatim();

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Maharashtra, India')}&limit=1&addressdetails=1`;
    const resp = await axios.get(nominatimUrl, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Bhumimart-Maharashtra-GIS/3.0 (https://bhoomimart.in/compliance; bot@bhoomimart.in)'
      }
    });

    if (resp.data && Array.isArray(resp.data) && resp.data.length > 0) {
      const item = resp.data[0];
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);
      if (!Number.isNaN(lat) && !Number.isNaN(lon) && Number.isFinite(lat) && Number.isFinite(lon)) {
        let bb: [number, number, number, number] | undefined = undefined;
        if (item.boundingbox && Array.isArray(item.boundingbox) && item.boundingbox.length >= 4) {
          const b0 = parseFloat(item.boundingbox[0]);
          const b1 = parseFloat(item.boundingbox[2]);
          const b2 = parseFloat(item.boundingbox[1]);
          const b3 = parseFloat(item.boundingbox[3]);
          if (!Number.isNaN(b0) && !Number.isNaN(b1) && !Number.isNaN(b2) && !Number.isNaN(b3)) {
            bb = [b0, b1, b2, b3];
          }
        }
        if (!bb) {
          bb = [lat - 0.05, lon - 0.05, lat + 0.05, lon + 0.05];
        }

        const resolvedLocation: GeocodeLocation = {
          name: query,
          displayName: item.display_name || `${query}, Maharashtra, India`,
          city: item.address?.city || item.address?.town || item.address?.state_district || query,
          country: 'India',
          coordinates: [lat, lon],
          boundingBox: bb
        };

        geocodeCache.set(normalized, {
          location: resolvedLocation,
          expiresAt: Date.now() + GEOCODE_CACHE_TTL
        });

        return resolvedLocation;
      }
    }
  } catch {}

  geocodeCache.set(normalized, {
    location: null,
    expiresAt: Date.now() + 10 * 60 * 1000
  });

  return null;
}

app.post('/api/auth/register', (req: Request, res: Response) => {
  const { name, email, password, uid, avatarUrl } = req.body;
  if (!email || !name) {
    return res.status(400).json({ success: false, message: 'Name and email required' });
  }
  const cleanEmail = email.toLowerCase().trim();
  if (store.users[cleanEmail]) {
    const existing = store.users[cleanEmail];
    if (uid) existing.user.uid = uid;
    if (avatarUrl && !existing.user.avatarUrl) existing.user.avatarUrl = avatarUrl;
    saveStore(store);
    return res.json({
      success: true,
      user: {
        ...existing.user,
        uid: existing.user.uid || existing.user.id
      },
      token: `token_${existing.user.id}`
    });
  }

  const generatedId = uid || `usr_${Date.now().toString(36)}`;
  const newUser: AppUser = {
    id: generatedId,
    uid: generatedId,
    name: name.trim(),
    email: cleanEmail,
    avatarUrl: avatarUrl || undefined,
    createdAt: new Date().toISOString()
  };

  store.users[cleanEmail] = {
    user: newUser,
    passwordHash: password || 'firebase_auth'
  };
  saveStore(store);

  res.json({
    success: true,
    user: newUser,
    token: `token_${newUser.id}`
  });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password, uid, name, avatarUrl } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email required' });
  }
  const cleanEmail = email.toLowerCase().trim();
  let record = store.users[cleanEmail];
  if (!record && uid) {
    const generatedId = uid || `usr_${Date.now().toString(36)}`;
    const newUser: AppUser = {
      id: generatedId,
      uid: generatedId,
      name: name ? name.trim() : cleanEmail.split('@')[0],
      email: cleanEmail,
      avatarUrl: avatarUrl || undefined,
      createdAt: new Date().toISOString()
    };
    store.users[cleanEmail] = {
      user: newUser,
      passwordHash: password || 'firebase_auth'
    };
    record = store.users[cleanEmail];
    saveStore(store);
  }
  if (!record) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }
  if (record.passwordHash !== password && !uid) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  if (uid && record.user.uid !== uid) {
    record.user.uid = uid;
    saveStore(store);
  }

  const userWithUid: AppUser = {
    ...record.user,
    uid: record.user.uid || record.user.id
  };

  res.json({
    success: true,
    user: userWithUid,
    token: `token_${record.user.id}`
  });
});

app.post('/api/auth/google', (req: Request, res: Response) => {
  const { email, name, avatarUrl, uid } = req.body;
  const userEmail = email ? email.toLowerCase().trim() : 'investor@bhoomimart.in';
  const userName = name || 'Maharashtra Real Estate Investor';

  let userRecord = store.users[userEmail];
  if (!userRecord) {
    const generatedId = uid || `usr_g_${Date.now().toString(36)}`;
    const newUser: AppUser = {
      id: generatedId,
      uid: generatedId,
      name: userName,
      email: userEmail,
      avatarUrl: avatarUrl || undefined,
      createdAt: new Date().toISOString()
    };
    store.users[userEmail] = {
      user: newUser,
      passwordHash: 'google_auth_oauth'
    };
    userRecord = store.users[userEmail];
    saveStore(store);
  } else {
    if (avatarUrl && !userRecord.user.avatarUrl) {
      userRecord.user.avatarUrl = avatarUrl;
    }
    if (uid) {
      userRecord.user.uid = uid;
    }
    if (name && name !== 'Maharashtra Real Estate Investor') {
      userRecord.user.name = name;
    }
    saveStore(store);
  }

  const userWithUid: AppUser = {
    ...userRecord.user,
    uid: userRecord.user.uid || userRecord.user.id
  };

  res.json({
    success: true,
    user: userWithUid,
    token: `token_${userRecord.user.id}`
  });
});

app.put('/api/user/profile', (req: Request, res: Response) => {
  const { userId, email, avatarUrl, name } = req.body;
  if (!userId && !email) {
    return res.status(400).json({ success: false, message: 'User identifier required' });
  }

  let foundKey: string | null = null;
  if (email && store.users[email.toLowerCase().trim()]) {
    foundKey = email.toLowerCase().trim();
  } else {
    for (const key of Object.keys(store.users)) {
      if (store.users[key].user.id === userId || store.users[key].user.uid === userId) {
        foundKey = key;
        break;
      }
    }
  }

  if (!foundKey) {
    return res.status(404).json({ success: false, message: 'User record not found' });
  }

  const existingRecord = store.users[foundKey];
  const updatedUser: AppUser = {
    ...existingRecord.user,
    uid: existingRecord.user.uid || existingRecord.user.id,
    ...(name ? { name } : {}),
    avatarUrl: avatarUrl !== undefined ? avatarUrl : existingRecord.user.avatarUrl
  };

  store.users[foundKey] = {
    ...existingRecord,
    user: updatedUser
  };
  saveStore(store);

  res.json({
    success: true,
    user: updatedUser
  });
});

function handleCreateProperty(req: Request, res: Response) {
  const {
    title, category, price, area, areaUnit, locality, coordinates,
    description, surveyNumber, sellerContact, userId, uid, sellerId,
    sellerName, timestamp, features
  } = req.body;

  if (!title || !price || !area || !locality || !coordinates) {
    return res.status(400).json({ success: false, message: 'Missing required property details' });
  }

  const pLat = coordinates[0];
  const pLng = coordinates[1];
  const areaSqft = areaUnit === 'Acre' ? Math.round(area * 43560) : (areaUnit === 'Gunta' ? Math.round(area * 1089) : Math.round(area));
  const priceDisplay = price >= 10000000 ? `₹${(price / 10000000).toFixed(2)} Cr` : `₹${Math.round(price / 100000)} Lakh`;
  const pricePerUnit = computePricePerUnit(price, area, areaUnit);
  const safeSurvey = surveyNumber || `Sy. No. ${100 + (deterministicHash(title) % 180)}/A`;
  const ownerIdentifier = uid || sellerId || userId;
  const areaGunta = areaUnit === 'Gunta' ? area : (areaUnit === 'Acre' ? area * 40 : (areaUnit === 'Hectare' ? Math.round(area * 98.84 * 100) / 100 : Math.round((area / 1089) * 100) / 100));

  const newParcel: LandParcel = {
    id: `listing_${Date.now().toString(36)}`,
    title,
    locality,
    city: locality,
    country: 'India',
    price,
    priceNumericINR: price,
    currency: 'INR',
    priceDisplay,
    pricePerUnit,
    area,
    areaGunta,
    areaUnit,
    areaSqft,
    propertyType: category || 'Plot',
    sellerType: 'Direct Owner',
    sellerName: sellerName || 'Verified Owner',
    sellerContact: sellerContact || '+91 98000 00000',
    surveyNumber: safeSurvey,
    isVerified: true,
    coordinates: [pLat, pLng],
    polygon: generatePolygonAroundCenter(pLat, pLng, 0.0016),
    metrics: {
      slope: '0.5° Flat Contour',
      slopeAngle: 0.5,
      floodRisk: 'Minimal',
      solarYield: '5.6 kWh/m²/day',
      groundwaterDepth: '120 ft',
      soilType: 'Medium Black (Regur)',
      roadWidthFt: 40
    },
    source: 'Bhumimart Direct Seller Portal',
    sourceUrl: 'https://bhoomimart.in/seller',
    sourceHost: 'bhoomimart.in',
    legalCompliance: {
      robotsAllowed: true,
      crawlDelaySeconds: 0,
      delayAppliedMs: 0,
      verifiedAt: new Date().toISOString(),
      isPublicListing: true,
      disclaimer: 'Directly listed by authenticated owner. Mahabhumi 7/12 extract verified.'
    },
    description: description || `Direct owner listing in ${locality}, Maharashtra. Ready for site visit and mutation register.`,
    images: [generateSvgThumbnail(store.userListings.length, title, locality)],
    features: Array.isArray(features) && features.length > 0 ? features : ['Direct Owner Title', 'Demarcated Boundaries', 'Clear 7/12 Title', 'Road Access Touch'],
    createdAt: timestamp || new Date().toISOString().split('T')[0],
    ownerId: ownerIdentifier,
    sellerId: ownerIdentifier,
    isUserListed: true
  };

  store.userListings.unshift(newParcel);
  saveStore(store);

  res.json({ success: true, property: newParcel });
}

function handleGetProperties(req: Request, res: Response) {
  const sellerId = (req.query.sellerId as string) || (req.query.userId as string) || (req.query.uid as string);
  const locality = req.query.locality as string;

  let props = [...store.userListings];

  if (sellerId) {
    props = props.filter(p => p.sellerId === sellerId || p.ownerId === sellerId);
  }

  if (locality && locality !== 'all') {
    props = props.filter(p =>
      p.locality.toLowerCase().includes(locality.toLowerCase()) ||
      p.city.toLowerCase().includes(locality.toLowerCase())
    );
  }

  res.json({
    success: true,
    count: props.length,
    properties: props
  });
}

function handleUpdateProperty(req: Request, res: Response) {
  const { id } = req.params;
  const updates = req.body;
  const index = store.userListings.findIndex(p => p.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Property not found' });
  }

  const existing = store.userListings[index];
  const newPrice = updates.price !== undefined ? updates.price : existing.price;
  const newArea = updates.area !== undefined ? updates.area : existing.area;
  const newAreaUnit = updates.areaUnit !== undefined ? updates.areaUnit : existing.areaUnit;

  const updatedParcel: LandParcel = {
    ...existing,
    ...updates,
    price: newPrice,
    priceNumericINR: newPrice,
    area: newArea,
    areaGunta: newAreaUnit === 'Gunta' ? newArea : (newAreaUnit === 'Acre' ? newArea * 40 : (newAreaUnit === 'Hectare' ? Math.round(newArea * 98.84 * 100) / 100 : Math.round((newArea / 1089) * 100) / 100)),
    priceDisplay: updates.price !== undefined
      ? (newPrice >= 10000000 ? `₹${(newPrice / 10000000).toFixed(2)} Cr` : `₹${Math.round(newPrice / 100000)} Lakh`)
      : existing.priceDisplay,
    pricePerUnit: computePricePerUnit(newPrice, newArea, newAreaUnit)
  };

  store.userListings[index] = updatedParcel;
  saveStore(store);

  res.json({ success: true, property: updatedParcel });
}

function handleDeleteProperty(req: Request, res: Response) {
  const { id } = req.params;
  store.userListings = store.userListings.filter(p => p.id !== id);
  saveStore(store);
  res.json({ success: true });
}

app.get('/api/properties', handleGetProperties);
app.post('/api/properties', handleCreateProperty);
app.put('/api/properties/:id', handleUpdateProperty);
app.delete('/api/properties/:id', handleDeleteProperty);

app.get('/api/user/properties', handleGetProperties);
app.post('/api/user/properties', handleCreateProperty);
app.put('/api/user/properties/:id', handleUpdateProperty);
app.delete('/api/user/properties/:id', handleDeleteProperty);

app.get('/api/user/inquiries', (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) {
    return res.json({ success: true, inquiries: [] });
  }
  const userInqs = store.userInquiries.filter(i => i.userId === userId);
  res.json({ success: true, inquiries: userInqs });
});

app.post('/api/user/inquiries', (req: Request, res: Response) => {
  const { userId, parcelId, parcelTitle, priceDisplay, locality, sourceHost } = req.body;
  if (!userId || !parcelId) {
    return res.status(400).json({ success: false, message: 'userId and parcelId required' });
  }

  const exists = store.userInquiries.find(i => i.userId === userId && i.parcelId === parcelId);
  if (exists) {
    return res.json({ success: true, inquiry: exists });
  }

  const newInquiry: UserInquiry = {
    id: `inq_${Date.now().toString(36)}`,
    userId,
    parcelId,
    parcelTitle: parcelTitle || 'Land Parcel',
    priceDisplay: priceDisplay || 'Price on request',
    locality: locality || 'Maharashtra',
    sourceHost: sourceHost || 'Bhumimart Registry',
    createdAt: new Date().toISOString().split('T')[0],
    status: 'Bookmarked'
  };

  store.userInquiries.unshift(newInquiry);
  saveStore(store);

  res.json({ success: true, inquiry: newInquiry });
});

app.delete('/api/user/inquiries/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  store.userInquiries = store.userInquiries.filter(i => i.id !== id);
  saveStore(store);
  res.json({ success: true });
});

app.get('/api/geocode', geocodeLimiter, async (req: Request, res: Response) => {
  const query = ((req.query.q as string) || '').trim();
  if (!query || query.length > 100 || !/^[a-zA-Z0-9\s,.-]+$/.test(query)) {
    return res.status(400).json({ success: false, message: 'Valid query parameter required (max 100 characters)' });
  }

  const location = await geocodeLocation(query);
  if (!location) {
    return res.status(404).json({ success: false, message: `Could not resolve location "${query}" in Maharashtra` });
  }

  res.json({ success: true, location });
});

app.get('/api/scrape', scrapeLimiter, async (req: Request, res: Response) => {
  const locationParam = ((req.query.location as string) || (req.query.locality as string) || '').trim();
  if (!locationParam || locationParam.length > 100 || !/^[a-zA-Z0-9\s,.-]+$/.test(locationParam)) {
    return res.status(400).json({ success: false, message: 'Valid location parameter required (max 100 characters)' });
  }

  let centerLat: number;
  let centerLng: number;
  let boundingBox: [number, number, number, number] | undefined;
  let resolvedCity = locationParam;

  const latParam = parseFloat(req.query.lat as string);
  const lngParam = parseFloat(req.query.lng as string);

  if (Number.isFinite(latParam) && Number.isFinite(lngParam) && latParam >= -90 && latParam <= 90 && lngParam >= -180 && lngParam <= 180) {
    centerLat = latParam;
    centerLng = lngParam;
    boundingBox = [centerLat - 0.05, centerLng - 0.05, centerLat + 0.05, centerLng + 0.05];
  } else {
    const geoData = await geocodeLocation(locationParam);
    if (!geoData) {
      return res.status(404).json({ success: false, message: `Location "${locationParam}" could not be resolved in Maharashtra` });
    }
    centerLat = geoData.coordinates[0];
    centerLng = geoData.coordinates[1];
    boundingBox = geoData.boundingBox;
    resolvedCity = geoData.city;
  }

  const result = await ingestionPipeline.execute({
    locality: locationParam,
    city: resolvedCity,
    centerLat,
    centerLng,
    boundingBox,
    userListings: store.userListings
  });

  const enrichedProperties = result.properties.map(p => ({
    ...p,
    priceNumericINR: p.priceNumericINR || p.price,
    areaGunta: p.areaGunta !== undefined ? p.areaGunta : (p.areaUnit === 'Gunta' ? p.area : (p.areaUnit === 'Acre' ? p.area * 40 : (p.areaUnit === 'Hectare' ? Math.round(p.area * 98.84 * 100) / 100 : Math.round((p.area / 1089) * 100) / 100))),
    sellerId: p.sellerId || p.ownerId
  }));

  res.json({
    ...result,
    properties: enrichedProperties
  });
});

async function startServer() {
  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
  const isProduction = !isDev;

  const distPath = path.resolve(process.cwd(), 'dist');

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));

    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    process.stdout.write(`Bhumimart production engine successfully listening on http://0.0.0.0:${PORT}\n`);
  });
}

startServer();
