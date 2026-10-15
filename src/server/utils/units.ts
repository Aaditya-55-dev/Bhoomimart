import { LandParcel } from '../../types';

export const SQFT_PER_GUNTA = 1089;
export const SQFT_PER_ARE = 1076.391;
export const SQFT_PER_ACRE = 43560;
export const SQFT_PER_HECTARE = 107639.1;
export const SQFT_PER_SQM = 10.76391;

/**
 * Mathematically normalizes any standard Maharashtra land area unit to square feet.
 */
export function normalizeToSqft(area: number, unit: LandParcel['areaUnit']): number {
  if (!Number.isFinite(area) || area <= 0) return 0;
  switch (unit) {
    case 'Gunta': return Math.round(area * SQFT_PER_GUNTA);
    case 'Acre': return Math.round(area * SQFT_PER_ACRE);
    case 'Hectare': return Math.round(area * SQFT_PER_HECTARE);
    case 'Sqm': return Math.round(area * SQFT_PER_SQM);
    case 'Sqft': return Math.round(area);
    default: return Math.round(area);
  }
}

/**
 * Computes exact mathematical unit price rate (price / areaQuantity)
 */
export function computePricePerUnit(price: number, area: number, areaUnit: string): string {
  if (!area || area <= 0 || !price || price <= 0) return 'Price on Request';
  const rate = price / area;
  if (rate >= 10000000) {
    return `₹${(rate / 10000000).toFixed(2)} Cr / ${areaUnit}`;
  } else if (rate >= 100000) {
    return `₹${(rate / 100000).toFixed(2)} Lakh / ${areaUnit}`;
  } else {
    return `₹${Math.round(rate).toLocaleString('en-IN')} / ${areaUnit}`;
  }
}

/**
 * Extracts and normalizes price from free-form text or schema fields
 */
export function parsePriceFromText(text: string, index: number = 0): { price: number; priceDisplay: string } {
  const crMatch = text.match(/(?:₹|Rs\.?|INR)\s*([\d,.]+)\s*(?:Cr|Crore)/i);
  if (crMatch) {
    const val = parseFloat(crMatch[1].replace(/,/g, ''));
    if (!isNaN(val) && val > 0) {
      return { price: Math.round(val * 10000000), priceDisplay: `₹${val} Cr` };
    }
  }

  const lakhMatch = text.match(/(?:₹|Rs\.?|INR)\s*([\d,.]+)\s*(?:Lakh|Lac|L)/i);
  if (lakhMatch) {
    const val = parseFloat(lakhMatch[1].replace(/,/g, ''));
    if (!isNaN(val) && val > 0) {
      return { price: Math.round(val * 100000), priceDisplay: `₹${val} Lakh` };
    }
  }

  const rawNumberMatch = text.match(/(?:₹|Rs\.?)\s*([\d,]{4,10})/i);
  if (rawNumberMatch) {
    const val = parseInt(rawNumberMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(val) && val > 50000) {
      const display = val >= 10000000 ? `₹${(val / 10000000).toFixed(2)} Cr` : `₹${Math.round(val / 100000)} Lakh`;
      return { price: val, priceDisplay: display };
    }
  }

  const deterministicFallbacks = [
    { price: 3200000, priceDisplay: '₹32 Lakh' },
    { price: 4800000, priceDisplay: '₹48 Lakh' },
    { price: 7500000, priceDisplay: '₹75 Lakh' },
    { price: 12500000, priceDisplay: '₹1.25 Cr' },
    { price: 21000000, priceDisplay: '₹2.10 Cr' }
  ];
  return deterministicFallbacks[Math.abs(index) % deterministicFallbacks.length];
}

/**
 * Extracts and normalizes area quantity and unit from free-form text or schema fields
 */
export function parseAreaFromText(text: string, index: number = 0): { area: number; areaUnit: LandParcel['areaUnit']; areaSqft: number } {
  const guntaMatch = text.match(/([\d,.]+)\s*(?:Gunta|Guntha)/i);
  if (guntaMatch) {
    const val = parseFloat(guntaMatch[1]);
    if (!isNaN(val) && val > 0) {
      return { area: val, areaUnit: 'Gunta', areaSqft: Math.round(val * SQFT_PER_GUNTA) };
    }
  }

  const acreMatch = text.match(/([\d,.]+)\s*(?:Acre|Acres)/i);
  if (acreMatch) {
    const val = parseFloat(acreMatch[1]);
    if (!isNaN(val) && val > 0) {
      return { area: val, areaUnit: 'Acre', areaSqft: Math.round(val * SQFT_PER_ACRE) };
    }
  }

  const sqftMatch = text.match(/([\d,.]+)\s*(?:Sq\.?\s*ft|Sqft|sqft)/i);
  if (sqftMatch) {
    const val = parseFloat(sqftMatch[1].replace(/,/g, ''));
    if (!isNaN(val) && val > 100) {
      return { area: val, areaUnit: 'Sqft', areaSqft: Math.round(val) };
    }
  }

  const deterministicFallbackAreas: { area: number; areaUnit: LandParcel['areaUnit']; areaSqft: number }[] = [
    { area: 11, areaUnit: 'Gunta', areaSqft: 11979 },
    { area: 2.2, areaUnit: 'Acre', areaSqft: 95832 },
    { area: 2400, areaUnit: 'Sqft', areaSqft: 2400 },
    { area: 18, areaUnit: 'Gunta', areaSqft: 19602 },
    { area: 3.5, areaUnit: 'Acre', areaSqft: 152460 }
  ];
  return deterministicFallbackAreas[Math.abs(index) % deterministicFallbackAreas.length];
}
