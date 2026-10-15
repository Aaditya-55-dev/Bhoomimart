import * as cheerio from 'cheerio';
import { LandParcel } from '../../types';
import { parsePriceFromText, parseAreaFromText, computePricePerUnit } from '../utils/units';

export interface ExtractedMetadata {
  title?: string;
  description?: string;
  price?: number;
  priceDisplay?: string;
  area?: number;
  areaUnit?: LandParcel['areaUnit'];
  areaSqft?: number;
  locality?: string;
  canonicalUrl?: string;
  imageUrl?: string;
}

/**
 * Extracts factual, non-copyrightable semantic metadata (Schema.org JSON-LD, OpenGraph, microdata).
 * Strictly guards against PII: Never parses personal phone numbers or private individual names.
 */
export function extractSemanticMetadata(html: string, fallbackUrl: string): ExtractedMetadata {
  const result: ExtractedMetadata = {};
  if (!html) return result;

  const $ = cheerio.load(html);

  // 1. Inspect Schema.org JSON-LD scripts
  $('script[type="application/ld+json"]').each((_, elem) => {
    try {
      const raw = $(elem).html();
      if (!raw) return;
      const data = JSON.parse(raw);

      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (!item || typeof item !== 'object') continue;

        // Check for RealEstateListing, Product, Place, Offer, SingleFamilyResidence
        if (item.name && typeof item.name === 'string' && !result.title) {
          result.title = item.name.trim();
        }
        if (item.description && typeof item.description === 'string' && !result.description) {
          result.description = item.description.trim();
        }

        // Offers / Price
        const offer = item.offers || item.offer;
        if (offer) {
          const rawPrice = offer.price || offer.highPrice || offer.lowPrice;
          if (rawPrice) {
            const numPrice = typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice).replace(/[^\d.]/g, ''));
            if (!isNaN(numPrice) && numPrice > 0) {
              result.price = numPrice;
            }
          }
        }

        if (item.image) {
          const img = Array.isArray(item.image) ? item.image[0] : item.image;
          if (typeof img === 'string' && img.startsWith('http')) {
            result.imageUrl = img;
          } else if (img && typeof img === 'object' && img.url) {
            result.imageUrl = img.url;
          }
        }
      }
    } catch {}
  });

  // 2. OpenGraph Meta Tags
  if (!result.title) {
    result.title = $('meta[property="og:title"]').attr('content') || $('title').text().trim();
  }
  if (!result.description) {
    result.description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content');
  }
  if (!result.imageUrl) {
    result.imageUrl = $('meta[property="og:image"]').attr('content');
  }
  const ogUrl = $('meta[property="og:url"]').attr('content') || $('link[rel="canonical"]').attr('href');
  result.canonicalUrl = ogUrl || fallbackUrl;

  // 3. Parse textual price and area if not structured
  const combinedText = `${result.title || ''} ${result.description || ''}`;
  if (!result.price) {
    const parsedPrice = parsePriceFromText(combinedText);
    result.price = parsedPrice.price;
    result.priceDisplay = parsedPrice.priceDisplay;
  } else {
    result.priceDisplay = result.price >= 10000000 
      ? `₹${(result.price / 10000000).toFixed(2)} Cr` 
      : `₹${Math.round(result.price / 100000)} Lakh`;
  }

  const parsedArea = parseAreaFromText(combinedText);
  result.area = parsedArea.area;
  result.areaUnit = parsedArea.areaUnit;
  result.areaSqft = parsedArea.areaSqft;

  return result;
}
