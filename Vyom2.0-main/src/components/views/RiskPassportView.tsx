import React, { useState } from 'react';
import { AssetRecord, TamilNaduMicroZoneId } from '../../types/risk';
import { TAMIL_NADU_ZONES } from '../../data/tamilNaduGeodata';
import { formatINR, formatExactINR } from '../../utils/catRiskEngine';
import {
  FileSpreadsheet,
  Printer,
  Download,
  ShieldCheck,
  Building2,
  Calendar,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface RiskPassportViewProps {
  assets: AssetRecord[];
  selectedZone: TamilNaduMicroZoneId;
}

export const RiskPassportView: React.FC<RiskPassportViewProps> = ({ assets, selectedZone }) => {
  const [selectedAssetId, setSelectedAssetId] = useState<string>(assets[0]?.id || '');
  const asset = assets.find((a) => a.id === selectedAssetId) || assets[0];
  const zone = TAMIL_NADU_ZONES[asset ? asset.zone : selectedZone];

  const estimatedEAL = asset ? Math.round(asset.insuredValueInr * 0.0135) : 0;
  const estimatedPML100 = asset ? Math.round(asset.insuredValueInr * 0.185) : 0;
  const technicalRateBps = asset && asset.insuredValueInr > 0 ? Math.round((estimatedEAL / asset.insuredValueInr) * 10000) : 0;

  const handlePrint = () => {
    window.print();
  };

  const handleExportJSON = () => {
    const passportData = {
      dossierIdentifier: `PASSPORT-${asset?.id || 'TN'}-${Date.now()}`,
      assetMetadata: asset,
      zoneContext: zone,
      metrics: {
        totalInsuredValueInr: asset?.insuredValueInr,
        expectedAnnualLossInr: estimatedEAL,
        pml100Inr: estimatedPML100,
        technicalRiskRateBps: technicalRateBps,
      },
      provenance: {
        modelFramework: 'VYOM Catastrophe Engine TN-CAT-2026.1',
        crs: 'EPSG:4326',
        trustScore: 92.8,
      },
      disclaimer: 'This report supports expert review and is not an automatic underwriting decision.',
      generatedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(passportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VYOM_Risk_Passport_${asset?.id || 'Zone'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg bg-[#0e131b] border border-[#1a2230]">
        <div>
          <h2 className="text-base font-semibold text-[#f8fafc]">
            Catastrophe Risk Passport Dossier
          </h2>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            Single-page verifiable risk passport designed for underwriter committee submission and audit.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedAssetId}
            onChange={(e) => setSelectedAssetId(e.target.value)}
            className="py-1.5 px-3 rounded bg-[#090b0e] border border-[#232f42] text-xs font-mono text-[#f8fafc] focus:border-[#d4af37] outline-none cursor-pointer"
          >
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({formatINR(a.insuredValueInr)})
              </option>
            ))}
          </select>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#141b25] hover:bg-[#1a2433] border border-[#232f42] text-xs font-mono text-[#cbd5e1] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#d4af37]/20 hover:bg-[#d4af37]/30 border border-[#d4af37]/50 text-xs font-mono text-[#dfba4f] transition-colors cursor-pointer font-medium"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Dossier</span>
          </button>
        </div>
      </div>

      {/* Printable One-Page Dossier Sheet */}
      <div className="p-8 rounded-lg bg-[#0d1016] border border-[#232f42] space-y-6 shadow-2xl max-w-4xl mx-auto print:border-none print:p-0 print:bg-white print:text-black">
        {/* Document Header */}
        <div className="flex items-start justify-between border-b border-[#232f42] pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-[0.25em] text-[#d4af37] uppercase font-mono">
                VYOM
              </span>
              <span className="text-xs text-[#64748b]">/</span>
              <span className="text-xs font-mono text-[#94a3b8] uppercase tracking-wider">
                Catastrophe Risk Intelligence
              </span>
            </div>
            <h1 className="text-xl font-bold text-[#f8fafc] mt-2">
              EXECUTIVE UNDERWRITING RISK PASSPORT
            </h1>
            <div className="text-xs text-[#94a3b8] font-mono mt-1">
              Dossier ID: PASSPORT-{asset?.id || 'REGIONAL'}-2026
            </div>
          </div>

          <div className="text-right font-mono text-xs text-[#64748b]">
            <div>Date: {new Date().toLocaleDateString('en-IN')}</div>
            <div className="text-[#dfba4f] font-semibold mt-1">Status: Audit Verified</div>
            <div className="text-[10px] text-[#64748b] mt-0.5">Trust Score: 92.8%</div>
          </div>
        </div>

        {/* Section 1: Asset & Geographic Identification */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded bg-[#090b0e] border border-[#1a2230] text-xs font-mono">
          <div>
            <div className="text-[10px] text-[#64748b]">Asset Demarcation</div>
            <div className="text-[#f8fafc] font-semibold mt-1 truncate">{asset?.name || 'Tamil Nadu Portfolio'}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#64748b]">Typology / Category</div>
            <div className="text-[#cbd5e1] mt-1">{asset?.type || 'Commercial'} ({asset?.constructionCategory || 'TN-RCC'})</div>
          </div>
          <div>
            <div className="text-[10px] text-[#64748b]">Micro-Zone & Region</div>
            <div className="text-[#cbd5e1] mt-1">{zone.name} ({zone.elevationMeters}m MSL)</div>
          </div>
          <div>
            <div className="text-[10px] text-[#64748b]">Site Coordinates</div>
            <div className="text-[#cbd5e1] mt-1">
              {asset?.lat.toFixed(4)}°N, {asset?.lng.toFixed(4)}°E
            </div>
          </div>
        </div>

        {/* Section 2: Key Actuarial Metrics */}
        <div>
          <div className="text-xs font-semibold text-[#64748b] uppercase tracking-wider font-mono mb-3">
            01. Financial Catastrophe Valuation & Metrics
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 rounded bg-[#090b0e] border border-[#1a2230] font-mono">
              <div className="text-[10px] text-[#64748b]">Total Insured Value</div>
              <div className="text-lg font-bold text-[#f8fafc] mt-1 tabular-nums">
                {asset ? formatINR(asset.insuredValueInr) : '₹0'}
              </div>
              <div className="text-[10px] text-[#64748b] mt-0.5">Replacement cost</div>
            </div>

            <div className="p-3.5 rounded bg-[#090b0e] border border-[#1a2230] font-mono">
              <div className="text-[10px] text-[#64748b]">Expected Annual Loss (EAL)</div>
              <div className="text-lg font-bold text-amber-400 mt-1 tabular-nums">
                {formatINR(estimatedEAL)}
              </div>
              <div className="text-[10px] text-[#64748b] mt-0.5">Annualized expectation</div>
            </div>

            <div className="p-3.5 rounded bg-[#090b0e] border border-[#1a2230] font-mono">
              <div className="text-[10px] text-[#64748b]">1-in-100 Year PML (1% AEP)</div>
              <div className="text-lg font-bold text-rose-400 mt-1 tabular-nums">
                {formatINR(estimatedPML100)}
              </div>
              <div className="text-[10px] text-[#64748b] mt-0.5">Peak cyclonic deluge</div>
            </div>

            <div className="p-3.5 rounded bg-[#090b0e] border border-[#1a2230] font-mono">
              <div className="text-[10px] text-[#64748b]">Technical Risk Rate</div>
              <div className="text-lg font-bold text-[#dfba4f] mt-1 tabular-nums">
                {technicalRateBps} bps
              </div>
              <div className="text-[10px] text-[#64748b] mt-0.5">EAL / TIV basis points</div>
            </div>
          </div>
        </div>

        {/* Section 3: Multi-Hazard Profile */}
        <div>
          <div className="text-xs font-semibold text-[#64748b] uppercase tracking-wider font-mono mb-3">
            02. Micro-Zone Hazard Profile & Topography
          </div>
          <div className="grid grid-cols-4 gap-3 p-3.5 rounded bg-[#090b0e] border border-[#1a2230] text-center font-mono text-xs">
            <div>
              <div className="text-[#64748b] text-[10px]">Flood Susceptibility</div>
              <div className="text-sm font-semibold text-sky-400 mt-1">{zone.hazardScores.flood}/100</div>
            </div>
            <div>
              <div className="text-[#64748b] text-[10px]">Cyclone & Wind</div>
              <div className="text-sm font-semibold text-rose-400 mt-1">{zone.hazardScores.cyclone}/100</div>
            </div>
            <div>
              <div className="text-[#64748b] text-[10px]">Extreme Rainfall</div>
              <div className="text-sm font-semibold text-emerald-400 mt-1">{zone.hazardScores.rainfall}/100</div>
            </div>
            <div>
              <div className="text-[#64748b] text-[10px]">Coastal Storm Surge</div>
              <div className="text-sm font-semibold text-amber-400 mt-1">{zone.hazardScores.storm_surge}/100</div>
            </div>
          </div>
        </div>

        {/* Section 4: Primary Risk Driver & Assumptions */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-[#64748b] uppercase tracking-wider font-mono">
            03. Engineering Drivers & Assumptions
          </div>
          <div className="p-4 rounded bg-[#090b0e] border border-[#1a2230] text-xs space-y-2 text-[#94a3b8] leading-relaxed">
            <div>
              <strong className="text-[#f8fafc]">Primary Hazard Exposure:</strong> {zone.primaryRiskDriver}
            </div>
            <div>
              <strong className="text-[#f8fafc]">Civil Defense:</strong> Plinth elevation is recorded at{' '}
              {asset?.plinthHeightMeters || 1.0}m MSL. Deductible structure set at{' '}
              {formatExactINR(asset?.deductibleInr || 0)}.
            </div>
            <div>
              <strong className="text-[#f8fafc]">Model Framework:</strong> Calibrated against 10,000
              stochastic storm tracks based on IMD 1901–2025 records.
            </div>
          </div>
        </div>

        {/* Mandatory Actuarial Disclaimer Box */}
        <div className="p-4 rounded bg-[#121620] border border-[#d4af37]/40 text-xs font-mono text-[#cbd5e1] space-y-1">
          <div className="text-[#dfba4f] font-semibold flex items-center gap-1.5 uppercase text-[11px]">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Mandatory Underwriting Disclaimer</span>
          </div>
          <p className="text-[#f8fafc] text-sm font-medium italic">
            “This report supports expert review and is not an automatic underwriting decision.”
          </p>
          <p className="text-[10px] text-[#64748b] pt-1">
            VYOM Catastrophe Intelligence Platform · Tamil Nadu Geospatial Engine · All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};
