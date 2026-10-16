import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { LandParcel, MapLayerState } from '../types';

interface MapViewProps {
  parcels: LandParcel[];
  selectedParcel: LandParcel | null;
  onSelectParcel: (parcel: LandParcel) => void;
  onOpenDetails: (parcel: LandParcel) => void;
  layers: MapLayerState;
  centerCoordinates: [number, number];
  targetBoundingBox?: [number, number, number, number];
  onMapPanEnd: (lat: number, lng: number) => void;
}

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const SATELLITE_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const DEFAULT_MAP_CENTER: [number, number] = [19.1383, 77.3210];

const TYPE_COLORS: Record<string, string> = {
  'Residential Land': '#059669',
  'Agricultural Parcel': '#d97706',
  'Commercial Plot': '#4f46e5',
  'Industrial Estate': '#7c3aed',
  'Plot': '#059669',
  'Land': '#059669',
  'Farm': '#d97706',
  'Home': '#2563eb',
  'Commercial': '#4f46e5'
};

function escapeHtml(str: any): string {
  if (typeof str !== 'string') return String(str ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isValidCoordinate(coord: any): coord is [number, number] {
  return (
    Array.isArray(coord) &&
    coord.length === 2 &&
    typeof coord[0] === 'number' &&
    typeof coord[1] === 'number' &&
    Number.isFinite(coord[0]) &&
    Number.isFinite(coord[1]) &&
    !Number.isNaN(coord[0]) &&
    !Number.isNaN(coord[1]) &&
    coord[0] >= -90 &&
    coord[0] <= 90 &&
    coord[1] >= -180 &&
    coord[1] <= 180
  );
}

function isValidBoundingBox(b: any): b is [number, number, number, number] {
  return (
    Array.isArray(b) &&
    b.length === 4 &&
    b.every((n: any) => typeof n === 'number' && Number.isFinite(n) && !Number.isNaN(n)) &&
    Math.abs(b[2] - b[0]) > 0.0001 &&
    Math.abs(b[3] - b[1]) > 0.0001
  );
}

if (typeof window !== 'undefined' && L && L.Map && L.Map.prototype) {
  const originalFlyTo = L.Map.prototype.flyTo;
  L.Map.prototype.flyTo = function (targetCenter: any, targetZoom?: any, options?: any) {
    try {
      if (!targetCenter) return this;
      let lat = NaN;
      let lng = NaN;
      if (Array.isArray(targetCenter)) {
        lat = Number(targetCenter[0]);
        lng = Number(targetCenter[1]);
      } else if (typeof targetCenter === 'object' && targetCenter !== null) {
        lat = Number((targetCenter as any).lat);
        lng = Number((targetCenter as any).lng);
      }
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Number.isNaN(lat) || Number.isNaN(lng)) {
        return this;
      }
      const currentZoom = this.getZoom();
      const zoom = typeof targetZoom === 'number' && Number.isFinite(targetZoom) && !Number.isNaN(targetZoom)
        ? targetZoom
        : (Number.isFinite(currentZoom) ? currentZoom : 13);
      const size = this.getSize();
      if (!size || size.x <= 40 || size.y <= 40) {
        return this.setView([lat, lng], zoom);
      }
      return originalFlyTo.call(this, [lat, lng], zoom, options);
    } catch {
      try {
        let lat = NaN;
        let lng = NaN;
        if (Array.isArray(targetCenter)) {
          lat = Number(targetCenter[0]);
          lng = Number(targetCenter[1]);
        } else if (typeof targetCenter === 'object' && targetCenter !== null) {
          lat = Number((targetCenter as any).lat);
          lng = Number((targetCenter as any).lng);
        }
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          return this.setView([lat, lng], typeof targetZoom === 'number' && Number.isFinite(targetZoom) ? targetZoom : 13);
        }
      } catch {}
      return this;
    }
  };

  L.Map.prototype.flyToBounds = function (bounds: any, options?: any) {
    try {
      if (!bounds) return this;
      return this.fitBounds(bounds, {
        animate: true,
        padding: [30, 30],
        maxZoom: 14,
        ...options
      });
    } catch {
      return this;
    }
  };
}

function createMarkerIcon(parcel: LandParcel, isSelected: boolean): L.DivIcon {
  const baseColor = TYPE_COLORS[parcel.propertyType] || '#059669';
  const safePriceDisplay = escapeHtml(parcel.priceDisplay || '');
  const safeArea = Number.isFinite(parcel.area) ? parcel.area : '';
  const safeUnit = escapeHtml((parcel.areaUnit || 'Acre').slice(0, 1));

  const iconHtml = `
    <div class="custom-parcel-marker" style="transform: translate(-50%, -50%);">
      <div style="
        background: ${isSelected ? '#059669' : 'rgba(255, 255, 255, 0.95)'};
        color: ${isSelected ? '#ffffff' : '#0f172a'};
        border: 1px solid ${isSelected ? '#047857' : 'rgba(226, 232, 240, 0.9)'};
        border-radius: 9999px;
        padding: 4px 10px;
        box-shadow: 0 6px 20px rgba(15, 23, 42, 0.1);
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 11px;
        font-weight: 600;
        white-space: nowrap;
      ">
        <span style="
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: ${isSelected ? '#ffffff' : baseColor};
        "></span>
        <span>${safePriceDisplay}</span>
        <span style="
          font-size: 10px;
          opacity: 0.75;
          font-weight: 400;
        ">(${safeArea} ${safeUnit})</span>
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-leaflet-div-icon',
    html: iconHtml,
    iconSize: [0, 0]
  });
}

function createSafePopup(parcel: LandParcel, onOpenDetails: (p: LandParcel) => void): HTMLElement {
  const baseColor = TYPE_COLORS[parcel.propertyType] || '#059669';
  const safeArea = Number.isFinite(parcel.area) ? parcel.area : '';

  const container = document.createElement('div');
  container.className = 'p-1 text-slate-800';
  container.style.minWidth = '220px';

  const topRow = document.createElement('div');
  topRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;';

  const locSpan = document.createElement('span');
  locSpan.style.cssText = `font-size: 10px; font-weight: 700; color: ${baseColor}; text-transform: uppercase;`;
  locSpan.textContent = parcel.locality || parcel.city || 'Cadastral Parcel';
  topRow.appendChild(locSpan);

  const surveySpan = document.createElement('span');
  surveySpan.style.cssText = 'font-size: 9px; background: #f1f5f9; padding: 2px 6px; border-radius: 6px; color: #475569; font-weight: 500;';
  surveySpan.textContent = parcel.surveyNumber || 'Sy. No.';
  topRow.appendChild(surveySpan);
  container.appendChild(topRow);

  const titleElem = document.createElement('h4');
  titleElem.style.cssText = 'font-size: 13px; font-weight: 600; margin: 0 0 4px 0; color: #0f172a; line-height: 1.3; cursor: pointer;';
  titleElem.textContent = parcel.title || '';
  titleElem.onclick = (e) => {
    e.stopPropagation();
    onOpenDetails(parcel);
  };
  container.appendChild(titleElem);

  const priceRow = document.createElement('div');
  priceRow.style.cssText = 'display: flex; justify-content: space-between; align-items: baseline; margin: 6px 0;';

  const priceSpan = document.createElement('span');
  priceSpan.style.cssText = 'font-size: 15px; font-weight: 800; color: #0f172a;';
  priceSpan.textContent = parcel.priceDisplay || '';
  priceRow.appendChild(priceSpan);

  const areaSpan = document.createElement('span');
  areaSpan.style.cssText = 'font-size: 11px; color: #64748b; font-weight: 500;';
  areaSpan.textContent = `${safeArea} ${parcel.areaUnit || ''}`;
  priceRow.appendChild(areaSpan);
  container.appendChild(priceRow);

  const btn = document.createElement('button');
  btn.style.cssText = 'width: 100%; margin-top: 6px; padding: 6px 10px; background: #059669; color: #ffffff; border-radius: 8px; font-size: 11px; font-weight: 600; border: none; cursor: pointer; transition: background 0.15s;';
  btn.textContent = 'Inspect Property Details';
  btn.onmouseover = () => { btn.style.background = '#047857'; };
  btn.onmouseout = () => { btn.style.background = '#059669'; };
  btn.onclick = (e) => {
    e.stopPropagation();
    onOpenDetails(parcel);
  };
  container.appendChild(btn);

  return container;
}

export const MapView: React.FC<MapViewProps> = ({
  parcels,
  selectedParcel,
  onSelectParcel,
  onOpenDetails,
  layers,
  centerCoordinates,
  targetBoundingBox,
  onMapPanEnd
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);

  const polygonsGroupRef = useRef<L.FeatureGroup | null>(null);
  const surveyLabelsGroupRef = useRef<L.FeatureGroup | null>(null);
  const markersGroupRef = useRef<L.FeatureGroup | null>(null);
  const floodGroupRef = useRef<L.FeatureGroup | null>(null);

  const markersMapRef = useRef<Map<string, { marker: L.Marker; parcel: LandParcel }>>(new Map());
  const polygonsMapRef = useRef<Map<string, { polygon: L.Polygon; parcel: LandParcel }>>(new Map());

  const onMapPanEndRef = useRef(onMapPanEnd);
  onMapPanEndRef.current = onMapPanEnd;

  const onSelectParcelRef = useRef(onSelectParcel);
  onSelectParcelRef.current = onSelectParcel;

  const onOpenDetailsRef = useRef(onOpenDetails);
  onOpenDetailsRef.current = onOpenDetails;

  const isInitialMountRef = useRef(true);
  const isProgrammaticMoveRef = useRef(false);
  const prevCenterRef = useRef<[number, number]>(
    isValidCoordinate(centerCoordinates) ? centerCoordinates : DEFAULT_MAP_CENTER
  );
  const prevBoundingBoxRef = useRef<[number, number, number, number] | undefined>(targetBoundingBox);

  const initialCenter = isValidCoordinate(centerCoordinates) ? centerCoordinates : DEFAULT_MAP_CENTER;

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 13,
      zoomControl: false,
      attributionControl: true
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    const resizeObserver = new ResizeObserver(() => {
      mapInstanceRef.current?.invalidateSize();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    const baseTile = L.tileLayer(OSM_TILE_URL, {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
    }).addTo(map);
    baseTileLayerRef.current = baseTile;

    polygonsGroupRef.current = L.featureGroup().addTo(map);
    surveyLabelsGroupRef.current = L.featureGroup().addTo(map);
    markersGroupRef.current = L.featureGroup().addTo(map);
    floodGroupRef.current = L.featureGroup().addTo(map);

    map.on('movestart', (e: any) => {
      if (e?.originalEvent) {
        isProgrammaticMoveRef.current = false;
      }
    });

    map.on('moveend', () => {
      try {
        if (isProgrammaticMoveRef.current) {
          isProgrammaticMoveRef.current = false;
          return;
        }
        const c = map.getCenter();
        if (c && Number.isFinite(c.lat) && Number.isFinite(c.lng) && !Number.isNaN(c.lat) && !Number.isNaN(c.lng)) {
          onMapPanEndRef.current(c.lat, c.lng);
        }
      } catch {}
    });

    mapInstanceRef.current = map;

    return () => {
      resizeObserver.disconnect();
      try {
        map.stop();
        map.remove();
      } catch {}
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (baseTileLayerRef.current) map.removeLayer(baseTileLayerRef.current);

    if (layers.tileMode === 'satellite') {
      baseTileLayerRef.current = L.tileLayer(SATELLITE_TILE_URL, {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      }).addTo(map);
    } else {
      baseTileLayerRef.current = L.tileLayer(OSM_TILE_URL, {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
      }).addTo(map);
    }
  }, [layers.tileMode]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    const safeCenter = isValidCoordinate(centerCoordinates) ? centerCoordinates : DEFAULT_MAP_CENTER;

    const centerShifted =
      Math.abs(safeCenter[0] - prevCenterRef.current[0]) > 0.0005 ||
      Math.abs(safeCenter[1] - prevCenterRef.current[1]) > 0.0005;

    const bboxShifted = targetBoundingBox !== prevBoundingBoxRef.current;

    if (!centerShifted && !bboxShifted) return;

    prevCenterRef.current = safeCenter;
    prevBoundingBoxRef.current = targetBoundingBox;

    try {
      map.stop();
      isProgrammaticMoveRef.current = true;
      const mapSize = map.getSize();
      if (!mapSize || mapSize.x <= 0 || mapSize.y <= 0) {
        map.invalidateSize();
        map.setView(safeCenter, 13);
        return;
      }

      if (targetBoundingBox && isValidBoundingBox(targetBoundingBox)) {
        const bounds: L.LatLngBoundsExpression = [
          [Math.min(targetBoundingBox[0], targetBoundingBox[2]), Math.min(targetBoundingBox[1], targetBoundingBox[3])],
          [Math.max(targetBoundingBox[0], targetBoundingBox[2]), Math.max(targetBoundingBox[1], targetBoundingBox[3])]
        ];
        map.fitBounds(bounds, {
          animate: true,
          padding: [30, 30],
          maxZoom: 14
        });
      } else {
        map.setView(safeCenter, 13, {
          animate: true
        });
      }
    } catch {
      try {
        map.setView(safeCenter, 13);
      } catch {}
    }
  }, [centerCoordinates, targetBoundingBox]);

  useEffect(() => {
    const group = floodGroupRef.current;
    if (!group) return;

    group.clearLayers();

    if (!layers.showFloodZones) return;

    const floodProneParcels = parcels.filter(p => p.metrics && p.metrics.floodRisk && p.metrics.floodRisk !== 'Minimal');
    
    if (floodProneParcels.length > 0) {
      floodProneParcels.forEach((parcel) => {
        if (!parcel.polygon || parcel.polygon.length < 3) return;
        const validPoints = parcel.polygon.filter(p => isValidCoordinate(p));
        if (validPoints.length < 3) return;

        const floodPoly = L.polygon(validPoints, {
          color: '#0284c7',
          fillColor: '#38bdf8',
          fillOpacity: 0.35,
          weight: 2,
          dashArray: '4, 4'
        });
        floodPoly.bindTooltip(`<strong>${escapeHtml(parcel.title)}</strong><br/>Hydrological Floodplain: ${escapeHtml(parcel.metrics.floodRisk)}`, {
          sticky: true
        });
        group.addLayer(floodPoly);
      });
    }
  }, [layers.showFloodZones, parcels]);

  useEffect(() => {
    const polyGroup = polygonsGroupRef.current;
    if (!polyGroup) return;

    polyGroup.clearLayers();
    polygonsMapRef.current.clear();

    if (!layers.showPolygons) return;

    parcels.forEach((parcel) => {
      if (!parcel || !parcel.polygon || !Array.isArray(parcel.polygon) || parcel.polygon.length < 3) return;
      const validPoints = parcel.polygon.filter((p) => isValidCoordinate(p));
      if (validPoints.length < 3) return;

      const isSelected = selectedParcel?.id === parcel.id;
      const baseColor = TYPE_COLORS[parcel.propertyType] || '#059669';

      const polygon = L.polygon(validPoints, {
        color: isSelected ? '#0f172a' : baseColor,
        fillColor: baseColor,
        fillOpacity: isSelected ? 0.45 : 0.2,
        weight: isSelected ? 2.5 : 1.5,
        dashArray: isSelected ? undefined : '3, 3'
      });

      polygon.on('click', () => {
        onSelectParcelRef.current(parcel);
      });

      polyGroup.addLayer(polygon);
      polygonsMapRef.current.set(parcel.id, { polygon, parcel });
    });
  }, [parcels, layers.showPolygons]);

  useEffect(() => {
    const sGroup = surveyLabelsGroupRef.current;
    if (!sGroup) return;

    sGroup.clearLayers();

    if (!layers.showSurveyNumbers) return;

    parcels.forEach((parcel) => {
      if (!parcel || !parcel.surveyNumber || !isValidCoordinate(parcel.coordinates)) return;

      const labelIcon = L.divIcon({
        className: 'survey-number-label-icon',
        html: `
          <div style="
            font-size: 10px;
            font-weight: 600;
            color: #1e293b;
            background: rgba(255, 255, 255, 0.95);
            padding: 2px 6px;
            border-radius: 6px;
            border: 1px solid rgba(226, 232, 240, 0.85);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
            transform: translate(-50%, -150%);
            white-space: nowrap;
            pointer-events: none;
          ">
            ${escapeHtml(parcel.surveyNumber)}
          </div>
        `,
        iconSize: [0, 0]
      });

      const labelMarker = L.marker(parcel.coordinates, { icon: labelIcon, interactive: false });
      sGroup.addLayer(labelMarker);
    });
  }, [parcels, layers.showSurveyNumbers]);

  useEffect(() => {
    const markGroup = markersGroupRef.current;
    if (!markGroup) return;

    markGroup.clearLayers();
    markersMapRef.current.clear();

    parcels.forEach((parcel) => {
      if (!parcel || !isValidCoordinate(parcel.coordinates)) return;

      const isSelected = selectedParcel?.id === parcel.id;
      const customIcon = createMarkerIcon(parcel, isSelected);
      const marker = L.marker(parcel.coordinates, { icon: customIcon });

      marker.on('click', () => {
        onSelectParcelRef.current(parcel);
      });

      marker.on('dblclick', () => {
        onOpenDetailsRef.current(parcel);
      });

      const popupNode = createSafePopup(parcel, (p) => onOpenDetailsRef.current(p));
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
      marker.bindPopup(popupNode, {
        maxWidth: isMobile ? window.innerWidth - 48 : 300,
        autoPanPadding: L.point(16, 120)
      });

      markGroup.addLayer(marker);
      markersMapRef.current.set(parcel.id, { marker, parcel });
    });
  }, [parcels]);

  useEffect(() => {
    const selId = selectedParcel?.id;

    markersMapRef.current.forEach(({ marker, parcel }, id) => {
      const isSelected = id === selId;
      marker.setIcon(createMarkerIcon(parcel, isSelected));
    });

    polygonsMapRef.current.forEach(({ polygon, parcel }, id) => {
      const isSelected = id === selId;
      const baseColor = TYPE_COLORS[parcel.propertyType] || '#059669';
      polygon.setStyle({
        color: isSelected ? '#0f172a' : baseColor,
        fillColor: baseColor,
        fillOpacity: isSelected ? 0.45 : 0.2,
        weight: isSelected ? 2.5 : 1.5,
        dashArray: isSelected ? undefined : '3, 3'
      });
    });
  }, [selectedParcel]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!selectedParcel || !map) return;
    if (!isValidCoordinate(selectedParcel.coordinates)) return;

    try {
      map.stop();
      isProgrammaticMoveRef.current = true;
      const mapSize = map.getSize();
      if (mapSize && mapSize.x > 0 && mapSize.y > 0) {
        map.setView(selectedParcel.coordinates, 15, {
          animate: true
        });
      } else {
        map.setView(selectedParcel.coordinates, 15);
      }
    } catch {
      try {
        map.setView(selectedParcel.coordinates, 15);
      } catch {}
    }
  }, [selectedParcel]);

  return (
    <div className="relative w-screen h-[100dvh] overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full z-0 select-none" />
    </div>
  );
};
