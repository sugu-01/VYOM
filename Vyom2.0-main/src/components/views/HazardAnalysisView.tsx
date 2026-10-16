import React from 'react';
import { TamilNaduMicroZoneId } from '../../types/risk';
import { TAMIL_NADU_ZONES } from '../../data/tamilNaduGeodata';
import { PropertyRiskAssessmentView } from './PropertyRiskAssessmentView';
import {
  Waves,
  Wind,
  CloudRain,
  Compass,
  AlertTriangle,
  Info,
  ExternalLink,
} from 'lucide-react';

interface HazardAnalysisViewProps {
  selectedZone: TamilNaduMicroZoneId;
}

export const HazardAnalysisView: React.FC<HazardAnalysisViewProps> = ({ selectedZone }) => {
  const zone = TAMIL_NADU_ZONES[selectedZone];

  return (
    <div className="space-y-6">
      <PropertyRiskAssessmentView />
      {/* Header Banner */}
      <div className="p-4 rounded-lg bg-[#0e131b] border border-[#1a2230] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#f8fafc]">
            Hydro-Meteorological Hazard Analysis — {zone.name}
          </h2>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            Grounded in India Meteorological Department (IMD) historical tracks and TNDMA coastal
            elevation atlases.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <a
            href="https://mausam.imd.gov.in"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#121822] hover:bg-[#1a2332] border border-[#232f42] text-[#dfba4f] transition-colors"
          >
            <span>IMD Weather Services</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://www.windy.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#121822] hover:bg-[#1a2332] border border-[#232f42] text-[#cbd5e1] transition-colors"
          >
            <span>Windy Radar</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* 4 Multi-Hazard In-Depth Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Riverine & Urban Flood */}
        <div className="p-4 rounded-lg bg-[#0e131b] border border-[#1a2230] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[#64748b]">Riverine / Urban Flood</span>
            <Waves className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#f8fafc]">
            {zone.hazardScores.flood}
            <span className="text-xs font-normal text-[#64748b]">/100</span>
          </div>
          <p className="text-[11px] text-[#94a3b8] leading-relaxed">
            {zone.elevationMeters <= 5
              ? 'Extreme backwater susceptibility during high astronomical tide cycles.'
              : 'Flash catchment runoff driven by upstream reservoir discharge and stormwater choking.'}
          </p>
        </div>

        {/* Cyclone & Wind */}
        <div className="p-4 rounded-lg bg-[#0e131b] border border-[#1a2230] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[#64748b]">Cyclone & Wind Field</span>
            <Wind className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#f8fafc]">
            {zone.hazardScores.cyclone}
            <span className="text-xs font-normal text-[#64748b]">/100</span>
          </div>
          <p className="text-[11px] text-[#94a3b8] leading-relaxed">
            Directly exposed to Northeast Monsoon (Oct–Dec) Bay of Bengal cyclonic genesis tracks.
          </p>
        </div>

        {/* Extreme Rainfall */}
        <div className="p-4 rounded-lg bg-[#0e131b] border border-[#1a2230] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[#64748b]">Extreme 24-hr Deluge</span>
            <CloudRain className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#f8fafc]">
            {zone.hazardScores.rainfall}
            <span className="text-xs font-normal text-[#64748b]">/100</span>
          </div>
          <p className="text-[11px] text-[#94a3b8] leading-relaxed">
            Convective mesoscale cloud bursts yielding localized intensities &gt; 350mm per 24 hours.
          </p>
        </div>

        {/* Storm Surge */}
        <div className="p-4 rounded-lg bg-[#0e131b] border border-[#1a2230] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[#64748b]">Coastal Storm Surge</span>
            <Compass className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#f8fafc]">
            {zone.hazardScores.storm_surge}
            <span className="text-xs font-normal text-[#64748b]">/100</span>
          </div>
          <p className="text-[11px] text-[#94a3b8] leading-relaxed">
            {zone.coastal
              ? 'Bathymetric shallow shelf amplifies cyclonic wave heights between 1.5m and 4.2m.'
              : 'Inland district with zero maritime surge direct interaction.'}
          </p>
        </div>
      </div>

      {/* Compound Hazard Mechanism Breakdown */}
      <div className="p-5 rounded-lg bg-[#0e131b] border border-[#1a2230] space-y-4">
        <h3 className="text-sm font-semibold text-[#f8fafc] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#d4af37]" />
          <span>Compound Hazard Mechanism & Hydrodynamic Interaction</span>
        </h3>

        <div className="p-3.5 rounded bg-[#090b0e] border border-[#161f2c] text-xs text-[#cbd5e1] space-y-2 leading-relaxed">
          <div className="font-mono text-[#dfba4f] font-medium">
            Non-Linear Interaction Principle (Zero Double-Counting)
          </div>
          <p>
            In coastal Tamil Nadu, estimating catastrophe losses by simply summing independent flood,
            wind, and storm surge estimates produces gross double-counting. VYOM models physical
            dependency:
          </p>
          <ul className="list-disc list-inside space-y-1 text-[#94a3b8] font-mono text-[11px]">
            <li>
              <strong className="text-[#f8fafc]">Tidal Lock Mechanism:</strong> High storm surge
              elevates sea level at river mouths (Adyar, Cooum, Pennaiyar, Cauvery, Tamirabarani),
              preventing gravity outflow.
            </li>
            <li>
              <strong className="text-[#f8fafc]">Envelope Scour:</strong> High-speed cyclonic wind
              strips rooftop metal cladding (TN-Industrial-PEB), accelerating interior inventory water
              damage before physical inundation levels reach ground floors.
            </li>
            <li>
              <strong className="text-[#f8fafc]">Upstream Reservoir Dynamics:</strong> Flash
              precipitation over saturated catchments forces emergency gate releases into already
              choked delta plains.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
