import { LandParcel } from '../../types';
import { scrapePermittedSearchIndex } from './searchIndexScraper';
import { getDeterministicLocalizedFallback } from './fallbackRepository';

export interface IngestionPipelineOptions {
  locality: string;
  city: string;
  centerLat: number;
  centerLng: number;
  boundingBox?: [number, number, number, number];
  userListings: LandParcel[];
}

export interface IngestionPipelineResult {
  success: boolean;
  location: string;
  center: [number, number];
  boundingBox?: [number, number, number, number];
  count: number;
  tier1Count: number;
  externalCount: number;
  fallbackCount: number;
  properties: LandParcel[];
  cached?: boolean;
}

interface CacheItem {
  result: IngestionPipelineResult;
  expiresAt: number;
}

export class IngestionPipeline {
  private cache: Map<string, CacheItem> = new Map();
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1-Hour in-memory cache

  private normalizeKey(locality: string): string {
    return locality.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Executes the 4-tier compliant ingestion pipeline
   */
  public async execute(options: IngestionPipelineOptions): Promise<IngestionPipelineResult> {
    const { locality, city, centerLat, centerLng, boundingBox, userListings } = options;
    const cacheKey = this.normalizeKey(locality);

    // 0. Check 1-Hour in-memory TTL cache to eliminate redundant external requests
    const cached = this.cache.get(cacheKey);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      // Re-merge current user direct listings with cached external properties
      const currentMatchingUser = userListings.filter(p =>
        p.locality.toLowerCase().includes(locality.toLowerCase()) ||
        locality.toLowerCase().includes(p.locality.toLowerCase()) ||
        p.city.toLowerCase().includes(locality.toLowerCase())
      );

      const nonUserListings = cached.result.properties.filter(p => !p.isUserListed);
      const combined = [...currentMatchingUser, ...nonUserListings];

      return {
        ...cached.result,
        cached: true,
        count: combined.length,
        tier1Count: currentMatchingUser.length,
        properties: combined
      };
    }

    // Tier 1: Internal & Direct Registry Listings (First Priority)
    const matchingUserListings = userListings.filter(p =>
      p.locality.toLowerCase().includes(locality.toLowerCase()) ||
      locality.toLowerCase().includes(p.locality.toLowerCase()) ||
      p.city.toLowerCase().includes(locality.toLowerCase())
    );

    // Tier 2 & 3: Permitted Search Indexes & Metadata Extraction
    let externalListings: LandParcel[] = [];
    try {
      externalListings = await scrapePermittedSearchIndex(locality, city, centerLat, centerLng);
    } catch {
      externalListings = [];
    }

    // Tier 4: Deterministic Localized Fallback Repository
    // Invoked when external engines are disallowed by robots.txt or blocked by zero-evasion rules
    let fallbackListings: LandParcel[] = [];
    if (externalListings.length === 0) {
      fallbackListings = getDeterministicLocalizedFallback(locality, centerLat, centerLng);
    }

    const aggregated = [...matchingUserListings, ...externalListings, ...fallbackListings];

    const pipelineResult: IngestionPipelineResult = {
      success: true,
      location: locality,
      center: [centerLat, centerLng],
      boundingBox,
      count: aggregated.length,
      tier1Count: matchingUserListings.length,
      externalCount: externalListings.length,
      fallbackCount: fallbackListings.length,
      properties: aggregated,
      cached: false
    };

    // Store in 1-Hour TTL cache
    this.cache.set(cacheKey, {
      result: pipelineResult,
      expiresAt: now + this.CACHE_TTL_MS
    });

    return pipelineResult;
  }
}

export const ingestionPipeline = new IngestionPipeline();
