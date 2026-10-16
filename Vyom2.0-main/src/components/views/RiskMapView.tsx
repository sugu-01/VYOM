import React, { useState, useRef, useEffect } from 'react';
import { AssetRecord, HazardLayerType, TamilNaduMicroZoneId } from '../../types/risk';
import { TAMIL_NADU_ZONES } from '../../data/tamilNaduGeodata';
import { formatINR } from '../../utils/catRiskEngine';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
  Layers,
  Info,
  MapPin,
  Compass,
  Building,
  Shield,
  Eye,
  AlertCircle,
} from 'lucide-react';

// Windy & Leaflet are loaded via script tags in index.html (global L and windyInit)
declare const L: any;
declare function windyInit(options: any, callback: (api: any) => void): void;

interface RiskMapViewProps {
  assets: AssetRecord[];
  selectedZone: TamilNaduMicroZoneId;
  onSelectZone: (zone: TamilNaduMicroZoneId) => void;
  onSelectAsset?: (asset: AssetRecord) => void;
}

const WINDY_KEY = import.meta.env.VITE_WINDY_API_KEY || '';

/** Map Vyom hazard tabs to Windy weather overlay names */
const HAZARD_TO_WINDY_OVERLAY: Record<HazardLayerType, string> = {
  flood: 'rain',
  cyclone: 'wind',
  rainfall: 'rainAccu',
  storm_surge: 'waves',
};

const HAZARD_ZONE_COLORS: Record<HazardLayerType, string> = {
  flood: '#1e90ff',
  cyclone: '#ef4444',
  rainfall: '#10b981',
  storm_surge: '#d97706',
};

/**
 * Build a Leaflet polygon for a zone using an approximate hexagon around its centre.
 */
function makeZonePolygon(zoneId: TamilNaduMicroZoneId) {
  const z = TAMIL_NADU_ZONES[zoneId];
  const sizeMap: Record<TamilNaduMicroZoneId, number> = {
    chennai: 0.18, tiruvallur: 0.28, kanchipuram: 0.25,
    cuddalore: 0.30, nagapattinam: 0.28, thanjavur: 0.30,
    thoothukudi: 0.35, coimbatore: 0.30, nilgiris: 0.22,
  };
  const r = sizeMap[zoneId] || 0.25;
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    pts.push([z.lat + r * Math.sin(angle), z.lng + r * Math.cos(angle) * 1.1]);
  }
  return { zoneId, center: [z.lat, z.lng] as [number, number], ring: pts };
}

export const RiskMapView: React.FC<RiskMapViewProps> = ({
  assets,
  selectedZone,
  onSelectZone,
  onSelectAsset,
}) => {
  const [activeHazard, setActiveHazard] = useState<HazardLayerType>('flood');
  const [layerOpacity, setLayerOpacity] = useState<number>(75);
  const [showAssetMarkers, setShowAssetMarkers] = useState<boolean>(true);
  const [hoveredZone, setHoveredZone] = useState<TamilNaduMicroZoneId | null>(null);
  const [selectedAssetModal, setSelectedAssetModal] = useState<AssetRecord | null>(null);
  const [windyReady, setWindyReady] = useState(false);
  const [windyError, setWindyError] = useState('');

  const windyContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const storeRef = useRef<any>(null);
  const zoneLayersRef = useRef<any>(null); // Leaflet LayerGroup
  const assetMarkersRef = useRef<any>(null); // Leaflet LayerGroup
  const initAttemptedRef = useRef(false);

  const currentZoneData = TAMIL_NADU_ZONES[selectedZone];
  const hoveredZoneData = hoveredZone ? TAMIL_NADU_ZONES[hoveredZone] : null;

  // ─── Initialise Windy map ─────────────────────────────────────────────
  useEffect(() => {
    if (initAttemptedRef.current) return;
    initAttemptedRef.current = true;

    if (typeof windyInit !== 'function') {
      setWindyError('Windy API script not loaded. Check your internet connection.');
      return;
    }
    if (!WINDY_KEY) {
      setWindyError('VITE_WINDY_API_KEY not set in .env.local');
      return;
    }

    const options = {
      key: WINDY_KEY,
      lat: 11.0,
      lon: 79.5,
      zoom: 7,
      overlay: 'rain',
      verbose: false,
    };

    try {
      windyInit(options, (windyAPI: any) => {
        const { map, store } = windyAPI;
        mapInstanceRef.current = map;
        storeRef.current = store;

        // Create layer groups
        zoneLayersRef.current = L.layerGroup().addTo(map);
        assetMarkersRef.current = L.layerGroup().addTo(map);

        setWindyReady(true);
      });
    } catch (err: any) {
      console.error('[Vyom] Windy init failed:', err);
      setWindyError(err?.message || 'Failed to initialise Windy map.');
    }
  }, []);

  // ─── Draw zone polygons ───────────────────────────────────────────────
  useEffect(() => {
    if (!windyReady || !zoneLayersRef.current) return;
    const group = zoneLayersRef.current;
    group.clearLayers();

    const hazardColor = HAZARD_ZONE_COLORS[activeHazard];
    const zoneIds = Object.keys(TAMIL_NADU_ZONES) as TamilNaduMicroZoneId[];

    zoneIds.forEach((zId) => {
      const z = TAMIL_NADU_ZONES[zId];
      const geo = makeZonePolygon(zId);
      const score = z.hazardScores[activeHazard];
      const alpha = (0.15 + (score / 100) * 0.6) * (layerOpacity / 100);
      const isSelected = zId === selectedZone;

      const polygon = L.polygon(geo.ring, {
        color: isSelected ? '#dfba4f' : hazardColor,
        weight: isSelected ? 3 : 1.2,
        fillColor: hazardColor,
        fillOpacity: alpha,
        className: 'vyom-zone-poly',
      });

      polygon.on('click', () => onSelectZone(zId));

      polygon.on('mouseover', () => setHoveredZone(zId));
      polygon.on('mouseout', () => setHoveredZone(null));

      polygon.bindTooltip(
        `<div style="font-family:monospace;font-size:11px;color:#f8fafc;background:rgba(14,19,27,0.95);padding:6px 8px;border:1px solid #232f42;border-radius:4px;">
          <strong>${z.name}</strong><br/>
          <span style="color:#94a3b8;">${z.regionalTitle}</span><br/>
          <span style="color:#d4af37;">${activeHazard}: ${score}/100 · ${z.elevationMeters}m MSL</span>
        </div>`,
        { sticky: true, direction: 'top', className: 'vyom-zone-tooltip', opacity: 1 },
      );

      polygon.addTo(group);

      // Zone label
      const label = L.divIcon({
        className: 'vyom-zone-label',
        html: `<div style="font-family:Outfit,sans-serif;font-size:11px;font-weight:${isSelected ? 600 : 400};color:${isSelected ? '#dfba4f' : '#f1f5f9'};text-shadow:0 1px 4px #000,0 0 8px #000;white-space:nowrap;text-align:center;pointer-events:none;">${z.name}<br/><span style="font-family:monospace;font-size:9px;color:${isSelected ? '#ecd279' : '#94a3b8'};">${activeHazard.toUpperCase()}: ${score}</span></div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      L.marker(geo.center, { icon: label, interactive: false }).addTo(group);
    });
  }, [windyReady, activeHazard, layerOpacity, selectedZone, onSelectZone]);

  // ─── Switch Windy overlay when hazard tab changes ─────────────────────
  useEffect(() => {
    if (!storeRef.current) return;
    const windyOverlay = HAZARD_TO_WINDY_OVERLAY[activeHazard];
    try {
      storeRef.current.set('overlay', windyOverlay);
    } catch {
      // Some overlays may not be available in all API tiers
      console.warn(`[Vyom] Windy overlay '${windyOverlay}' unavailable, keeping current.`);
    }
  }, [activeHazard, windyReady]);

  // ─── Asset markers ────────────────────────────────────────────────────
  useEffect(() => {
    if (!windyReady || !assetMarkersRef.current) return;
    const group = assetMarkersRef.current;
    group.clearLayers();

    if (!showAssetMarkers) return;

    assets.forEach((asset) => {
      const zone = TAMIL_NADU_ZONES[asset.zone];
      if (!zone) return;

      const icon = L.divIcon({
        className: 'vyom-asset-marker',
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#d4af37;border:2px solid #090b0e;box-shadow:0 0 8px rgba(212,175,55,0.5);cursor:pointer;"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const marker = L.marker([asset.lat, asset.lng], { icon });
      marker.on('click', () => {
        setSelectedAssetModal(asset);
        onSelectZone(asset.zone);
        if (onSelectAsset) onSelectAsset(asset);
      });
      marker.addTo(group);
    });
  }, [windyReady, assets, showAssetMarkers, onSelectZone, onSelectAsset]);

  // ─── Fly to selected zone ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo(
      [currentZoneData.lat, currentZoneData.lng],
      9,
      { duration: 1.2 },
    );
  }, [selectedZone, currentZoneData.lat, currentZoneData.lng]);

  // ─── Map controls ─────────────────────────────────────────────────────
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleResetZoom = () => {
    mapInstanceRef.current?.flyTo([11.0, 79.5], 7, { duration: 0.8 });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] min-h-[680px]">
      {/* Geospatial Map Canvas Column */}
      <div className="lg:col-span-8 flex flex-col rounded-lg bg-[#0a0d13] border border-[#1a2230] relative overflow-hidden">
        {/* Top Floating Map Controls Toolbar */}
        <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-wrap items-center justify-between gap-3 pointer-events-none">
          {/* Hazard Layer Selector Tabs */}
          <div className="pointer-events-auto flex items-center p-1 rounded-md bg-[#0e131b]/95 backdrop-blur-md border border-[#232f42] shadow-xl">
            <button
              onClick={() => setActiveHazard('flood')}
              className={`px-3 py-1.5 rounded text-xs font-medium font-mono transition-colors cursor-pointer ${
                activeHazard === 'flood'
                  ? 'bg-[#1e3a8a] text-sky-200 border border-sky-500/40'
                  : 'text-[#94a3b8] hover:text-[#f8fafc]'
              }`}
            >
              Flooding (Riverine/Urban)
            </button>
            <button
              onClick={() => setActiveHazard('cyclone')}
              className={`px-3 py-1.5 rounded text-xs font-medium font-mono transition-colors cursor-pointer ${
                activeHazard === 'cyclone'
                  ? 'bg-[#7f1d1d] text-rose-200 border border-rose-500/40'
                  : 'text-[#94a3b8] hover:text-[#f8fafc]'
              }`}
            >
              Cyclone &amp; Wind
            </button>
            <button
              onClick={() => setActiveHazard('rainfall')}
              className={`px-3 py-1.5 rounded text-xs font-medium font-mono transition-colors cursor-pointer ${
                activeHazard === 'rainfall'
                  ? 'bg-[#064e3b] text-emerald-200 border border-emerald-500/40'
                  : 'text-[#94a3b8] hover:text-[#f8fafc]'
              }`}
            >
              Extreme Rainfall
            </button>
            <button
              onClick={() => setActiveHazard('storm_surge')}
              className={`px-3 py-1.5 rounded text-xs font-medium font-mono transition-colors cursor-pointer ${
                activeHazard === 'storm_surge'
                  ? 'bg-[#78350f] text-amber-200 border border-amber-500/40'
                  : 'text-[#94a3b8] hover:text-[#f8fafc]'
              }`}
            >
              Storm Surge
            </button>
          </div>

          {/* Zoom & Reset Controls */}
          <div className="pointer-events-auto flex items-center gap-1.5 p-1 rounded-md bg-[#0e131b]/95 backdrop-blur-md border border-[#232f42] shadow-xl">
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-[#cbd5e1] hover:text-[#f8fafc] hover:bg-[#1a2332] rounded transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-[#cbd5e1] hover:text-[#f8fafc] hover:bg-[#1a2332] rounded transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 text-[#cbd5e1] hover:text-[#f8fafc] hover:bg-[#1a2332] rounded transition-colors cursor-pointer"
              title="Reset View"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-[#232f42] mx-1" />
            <button
              onClick={() => setShowAssetMarkers(!showAssetMarkers)}
              className={`px-2 py-1 text-[11px] font-mono rounded transition-colors cursor-pointer flex items-center gap-1 ${
                showAssetMarkers
                  ? 'bg-[#d4af37]/20 text-[#dfba4f] border border-[#d4af37]/40'
                  : 'text-[#64748b] hover:text-[#cbd5e1]'
              }`}
            >
              <Building className="w-3 h-3" />
              <span>Assets</span>
            </button>
          </div>
        </div>

        {/* Windy Map Container — Windy requires id="windy" */}
        <div id="windy" ref={windyContainerRef} className="flex-1 w-full h-full" />

        {/* Bottom Map Legend & Opacity Slider Strip */}
        <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row items-center justify-between gap-3 p-2.5 rounded-md bg-[#0e131b]/95 backdrop-blur-md border border-[#232f42] text-xs z-[1000]">
          {/* Opacity Control */}
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-[#64748b]" />
            <span className="text-[#94a3b8] text-[11px] font-mono">Zone Opacity:</span>
            <input
              type="range"
              min="20"
              max="100"
              value={layerOpacity}
              onChange={(e) => setLayerOpacity(Number(e.target.value))}
              className="w-24 accent-[#d4af37] cursor-pointer"
            />
            <span className="font-mono text-[11px] text-[#dfba4f]">{layerOpacity}%</span>
          </div>

          {/* Gradient Legend */}
          <div className="flex items-center gap-3 text-[11px] font-mono text-[#94a3b8]">
            <span>Low Susceptibility</span>
            <div className="w-28 h-2 rounded-full bg-gradient-to-r from-slate-800 via-amber-600 to-rose-600 border border-[#1f293a]" />
            <span className="text-rose-400">Extreme Peak</span>
          </div>

          {/* Windy attribution */}
          <div className="hidden md:flex items-center gap-1.5 text-[10px] font-mono text-[#64748b]">
            <Compass className="w-3 h-3 text-[#d4af37]" />
            <span>Powered by Windy.com</span>
          </div>
        </div>

        {/* Error / missing key banner */}
        {windyError && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1001] px-3 py-1.5 rounded bg-amber-900/80 border border-amber-700 text-amber-200 text-[11px] font-mono backdrop-blur max-w-md text-center">
            {windyError}
          </div>
        )}
      </div>

      {/* Right Column: Selected-Zone Evidence & Asset Detail Panel */}
      <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto">
        {/* Selected Zone Deep-Dive Evidence Card */}
        <div className="p-5 rounded-lg bg-[#0e131b] border border-[#1a2230] space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#d4af37]">
                Selected Tamil Nadu Micro-Zone
              </div>
              <h2 className="text-lg font-semibold text-[#f8fafc] mt-0.5">{currentZoneData.name}</h2>
              <div className="text-xs text-[#94a3b8]">{currentZoneData.regionalTitle}</div>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                currentZoneData.vulnerabilityGrade === 'Extreme'
                  ? 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                  : 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
              }`}
            >
              {currentZoneData.vulnerabilityGrade}
            </span>
          </div>

          {/* Geographic Coordinates & Elevation */}
          <div className="grid grid-cols-2 gap-2.5 p-3 rounded bg-[#090b0e] border border-[#161f2c] font-mono text-xs">
            <div>
              <div className="text-[10px] text-[#64748b]">Geographic Center</div>
              <div className="text-[#cbd5e1] font-medium mt-0.5">
                {currentZoneData.lat.toFixed(4)}°N, {currentZoneData.lng.toFixed(4)}°E
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#64748b]">Mean Elevation</div>
              <div className="text-[#dfba4f] font-medium mt-0.5">
                {currentZoneData.elevationMeters}m MSL
              </div>
            </div>
          </div>

          {/* Primary Risk Driver */}
          <div className="space-y-1">
            <div className="text-xs font-medium text-[#f8fafc] flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Primary Risk Driver</span>
            </div>
            <p className="text-xs text-[#94a3b8] leading-relaxed bg-[#0a0d13] p-2.5 rounded border border-[#161f2c]">
              {currentZoneData.primaryRiskDriver}
            </p>
          </div>

          {/* Multi-Hazard Scores Bar Breakdown */}
          <div className="space-y-2 pt-2 border-t border-[#161f2c]">
            <div className="text-xs font-medium text-[#f8fafc]">Hydro-Meteorological Scores</div>

            {/* Flood */}
            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-[#cbd5e1]">Riverine & Urban Flood</span>
                <span className="text-sky-400 font-medium">{currentZoneData.hazardScores.flood}/100</span>
              </div>
              <div className="w-full h-1.5 bg-[#141b25] rounded-full overflow-hidden">
                <div className="h-full bg-sky-500 rounded-full" style={{ width: `${currentZoneData.hazardScores.flood}%` }} />
              </div>
            </div>

            {/* Cyclone */}
            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-[#cbd5e1]">Cyclone & Wind Field</span>
                <span className="text-rose-400 font-medium">{currentZoneData.hazardScores.cyclone}/100</span>
              </div>
              <div className="w-full h-1.5 bg-[#141b25] rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: `${currentZoneData.hazardScores.cyclone}%` }} />
              </div>
            </div>

            {/* Rainfall */}
            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-[#cbd5e1]">Extreme Convective Deluge</span>
                <span className="text-emerald-400 font-medium">{currentZoneData.hazardScores.rainfall}/100</span>
              </div>
              <div className="w-full h-1.5 bg-[#141b25] rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${currentZoneData.hazardScores.rainfall}%` }} />
              </div>
            </div>

            {/* Storm Surge */}
            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-[#cbd5e1]">Coastal Storm Surge</span>
                <span className="text-amber-400 font-medium">{currentZoneData.hazardScores.storm_surge}/100</span>
              </div>
              <div className="w-full h-1.5 bg-[#141b25] rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${currentZoneData.hazardScores.storm_surge}%` }} />
              </div>
            </div>
          </div>

          {/* Historical Disaster Events on Record */}
          <div className="p-3 rounded bg-[#090b0e] border border-[#161f2c] flex items-center justify-between text-xs">
            <span className="text-[#94a3b8]">Documented Disasters (1970 - 2024):</span>
            <span className="font-mono text-[#f8fafc] font-semibold">
              {currentZoneData.historicalEventsCount} Catastrophes
            </span>
          </div>
        </div>

        {/* Selected Asset Modal / Quick Popover */}
        {selectedAssetModal && (
          <div className="p-4 rounded-lg bg-[#0e131b] border border-[#d4af37]/40 space-y-2 animate-in fade-in">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono text-[#d4af37]">Selected Asset Marker</span>
                <h4 className="text-sm font-semibold text-[#f8fafc]">{selectedAssetModal.name}</h4>
              </div>
              <button
                onClick={() => setSelectedAssetModal(null)}
                className="text-[#64748b] hover:text-[#f8fafc] text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="text-xs text-[#94a3b8] font-mono grid grid-cols-2 gap-1 pt-1">
              <div>
                TIV: <span className="text-[#dfba4f]">{formatINR(selectedAssetModal.insuredValueInr)}</span>
              </div>
              <div>Type: {selectedAssetModal.type}</div>
              <div>Curve: {selectedAssetModal.constructionCategory}</div>
              <div>Plinth: {selectedAssetModal.plinthHeightMeters}m</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
