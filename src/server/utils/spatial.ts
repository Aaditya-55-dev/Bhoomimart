const LAND_PALETTES = [
  { bg1: '#ecfdf5', bg2: '#d1fae5', stroke: '#10b981', hill1: '#a7f3d0', hill2: '#6ee7b7', label: 'River Basin Fertile Parcel' },
  { bg1: '#fffbeb', bg2: '#fef3c7', stroke: '#f59e0b', hill1: '#fde68a', hill2: '#fcd34d', label: 'Plateau NA 44 Layout' },
  { bg1: '#f0fdf4', bg2: '#dcfce7', stroke: '#059669', hill1: '#bbf7d0', hill2: '#86efac', label: 'Agro Horticultural Holding' },
  { bg1: '#f0f9ff', bg2: '#e0f2fe', stroke: '#0284c7', hill1: '#bae6fd', hill2: '#7dd3fc', label: 'Highway Commercial Frontage' },
  { bg1: '#f5f3ff', bg2: '#ede9fe', stroke: '#7c3aed', hill1: '#ddd6fe', hill2: '#c4b5fd', label: 'Industrial Corridor Plot' }
];

/**
 * 32-bit FNV-1a deterministic hash implementation
 */
export function deterministicHash(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0);
}

/**
 * Generates stationary, reproducible spatial coordinates around a centroid.
 * Offsets are bound between ~1.2 km and 3.5 km (0.011 to 0.031 degrees)
 * so markers maintain steady positions across subsequent scans.
 */
export function getDeterministicCoordinates(
  seed: string,
  centerLat: number,
  centerLng: number,
  index: number = 0
): [number, number] {
  const hLat = deterministicHash(`${seed}-lat-${index}`);
  const hLng = deterministicHash(`${seed}-lng-${index}`);

  // Radial angle (0 to 2*pi)
  const angle = ((hLat % 3600) / 3600) * 2 * Math.PI;

  // Distance: 0.012 to 0.028 degrees (~1.3 km to 3.1 km)
  const minOffset = 0.012;
  const maxOffset = 0.028;
  const dist = minOffset + ((hLng % 1000) / 1000) * (maxOffset - minOffset);

  // Lat and Lng projection
  const latOffset = dist * Math.cos(angle);
  const lngOffset = (dist * Math.sin(angle)) / Math.cos((centerLat * Math.PI) / 180);

  const finalLat = Number((centerLat + latOffset).toFixed(5));
  const finalLng = Number((centerLng + lngOffset).toFixed(5));

  return [finalLat, finalLng];
}

/**
 * Generates a realistic cadastral boundary polygon around a center coordinate
 */
export function generatePolygonAroundCenter(lat: number, lng: number, delta: number = 0.0016): [number, number][] {
  return [
    [Number((lat + delta).toFixed(5)), Number((lng - delta).toFixed(5))],
    [Number((lat + delta * 1.1).toFixed(5)), Number((lng + delta * 1.1).toFixed(5))],
    [Number((lat - delta).toFixed(5)), Number((lng + delta * 1.2).toFixed(5))],
    [Number((lat - delta * 1.1).toFixed(5)), Number((lng - delta * 0.9).toFixed(5))]
  ];
}

/**
 * Creates clean, inline SVG cadastral thumbnail cards
 */
export function generateSvgThumbnail(index: number, title: string, locality: string): string {
  const pal = LAND_PALETTES[Math.abs(index) % LAND_PALETTES.length];
  const hash = deterministicHash(`${title}-${locality}-${index}`);
  const elevation = 180 + (hash % 60);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340">
    <defs>
      <linearGradient id="bg-${index}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${pal.bg1}"/>
        <stop offset="100%" stop-color="${pal.bg2}"/>
      </linearGradient>
      <pattern id="grid-${index}" width="30" height="30" patternUnits="userSpaceOnUse">
        <path d="M 30 0 L 0 0 0 30" fill="none" stroke="${pal.stroke}" stroke-width="0.5" opacity="0.2"/>
      </pattern>
    </defs>
    <rect width="600" height="340" fill="url(#bg-${index})"/>
    <rect width="600" height="340" fill="url(#grid-${index})"/>
    <path d="M0 ${elevation} Q 150 ${elevation - 45}, 300 ${elevation} T 600 ${elevation - 20} L 600 340 L 0 340 Z" fill="${pal.hill1}" opacity="0.7"/>
    <path d="M0 ${elevation + 35} Q 200 ${elevation}, 400 ${elevation + 40} T 600 ${elevation + 15} L 600 340 L 0 340 Z" fill="${pal.hill2}" opacity="0.6"/>
    <circle cx="300" cy="110" r="28" fill="${pal.stroke}" opacity="0.12"/>
    <path d="M288 116 L300 96 L312 116 Z" fill="${pal.stroke}"/>
    <circle cx="300" cy="106" r="3" fill="#ffffff"/>
    <text x="300" y="152" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" fill="${pal.stroke}" text-anchor="middle">
      ${pal.label}
    </text>
    <text x="300" y="170" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="500" fill="#64748b" text-anchor="middle">
      ${locality} Cadastral Demarcation
    </text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
