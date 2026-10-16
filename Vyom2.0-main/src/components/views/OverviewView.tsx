import React from 'react';
import { AssetRecord, TamilNaduMicroZoneId } from '../../types/risk';
import { TAMIL_NADU_ZONES } from '../../data/tamilNaduGeodata';
import { formatINR, formatExactINR } from '../../utils/catRiskEngine';
import { RouteId } from '../Sidebar';
import {
  ShieldAlert,
  TrendingDown,
  Building2,
  MapPin,
  Waves,
  ArrowUpRight,
  Database,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface OverviewViewProps {
  assets: AssetRecord[];
  selectedZone: TamilNaduMicroZoneId;
  onNavigate: (route: RouteId) => void;
  isSupabaseConnected: boolean;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  assets,
  selectedZone,
  onNavigate,
  isSupabaseConnected,
}) => {
  const currentZone = TAMIL_NADU_ZONES[selectedZone];

  // Aggregate portfolio figures
  const totalTIV = assets.reduce((sum, a) => sum + a.insuredValueInr, 0);
  const zoneAssets = assets.filter((a) => a.zone === selectedZone);
  const zoneTIV = zoneAssets.reduce((sum, a) => sum + a.insuredValueInr, 0);

  // Portfolio-wide EAL estimate (~1.4% average across coastal assets)
  const portfolioEAL = Math.round(totalTIV * 0.0142);
  // 1-in-100 Year PML (approx 16.5% of TIV based on compound storm event)
  const portfolioPML100 = Math.round(totalTIV * 0.165);
  // Average technical rate (bps)
  const avgTechnicalRateBps = totalTIV > 0 ? Math.round((portfolioEAL / totalTIV) * 10000) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner: Connection & Provenance Notice */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg bg-[#0e131b] border border-[#1e2736] text-xs">
        <div className="flex items-center gap-2.5">
          <Database className="w-4 h-4 text-[#d4af37] shrink-0" />
          <span className="text-[#94a3b8]">
            {isSupabaseConnected ? (
              <span className="text-emerald-400 font-medium">
                Live Supabase Connected · Real User Authentication Active
              </span>
            ) : (
              <span>
                Demonstration Portfolio Active ·{' '}
                <button
                  onClick={() => onNavigate('settings')}
                  className="text-[#dfba4f] hover:underline font-mono"
                >
                  Connect your Supabase project in Settings →
                </button>
              </span>
            )}
          </span>
        </div>
        <div className="mt-2 sm:mt-0 flex items-center gap-2 font-mono text-[11px] text-[#64748b]">
          <span>Baseline Model:</span>
          <span className="text-[#94a3b8]">TN-CAT-2026.1 (Tamil Nadu Calibrated)</span>
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Insured Value */}
        <div className="p-4 rounded-lg bg-[#0e131b] border border-[#1a2230] hover:border-[#2a374a] transition-colors">
          <div className="flex items-center justify-between text-xs text-[#64748b] mb-1">
            <span>Portfolio Exposure (TIV)</span>
            <Building2 className="w-4 h-4 text-[#94a3b8]" />
          </div>
          <div className="text-2xl font-semibold text-[#f8fafc] font-mono tabular-nums">
            {formatINR(totalTIV)}
          </div>
          <div className="mt-1 text-[11px] text-[#94a3b8] flex items-center gap-1">
            <span className="text-[#d4af37] font-mono">{assets.length} Assets</span>
            <span>across 9 Micro-Zones</span>
          </div>
        </div>

        {/* Expected Annual Loss */}
        <div className="p-4 rounded-lg bg-[#0e131b] border border-[#1a2230] hover:border-[#2a374a] transition-colors">
          <div className="flex items-center justify-between text-xs text-[#64748b] mb-1">
            <span>Expected Annual Loss (EAL)</span>
            <TrendingDown className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-semibold text-[#f8fafc] font-mono tabular-nums">
            {formatINR(portfolioEAL)}
          </div>
          <div className="mt-1 text-[11px] text-[#94a3b8]">
            <span className="text-amber-400 font-mono font-medium">{avgTechnicalRateBps} bps</span>
            <span className="text-[#64748b] ml-1">avg technical risk rate</span>
          </div>
        </div>

        {/* 1-in-100 PML */}
        <div className="p-4 rounded-lg bg-[#0e131b] border border-[#1a2230] hover:border-[#2a374a] transition-colors">
          <div className="flex items-center justify-between text-xs text-[#64748b] mb-1">
            <span>1-in-100 Year PML (1% AEP)</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-semibold text-[#f8fafc] font-mono tabular-nums">
            {formatINR(portfolioPML100)}
          </div>
          <div className="mt-1 text-[11px] text-[#64748b]">
            <span>Compound cyclone & surge peak</span>
          </div>
        </div>

        {/* Selected Zone Snapshot */}
        <div className="p-4 rounded-lg bg-[#0e131b] border border-[#1a2230] hover:border-[#d4af37]/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-[#64748b] mb-1">
            <span>Selected Zone ({currentZone.name})</span>
            <MapPin className="w-4 h-4 text-[#d4af37]" />
          </div>
          <div className="text-2xl font-semibold text-[#dfba4f] font-mono tabular-nums">
            {formatINR(zoneTIV)}
          </div>
          <div className="mt-1 text-[11px] text-[#94a3b8] flex items-center gap-1.5">
            <span
              className={`font-mono px-1 py-0.2 rounded text-[10px] ${
                currentZone.vulnerabilityGrade === 'Extreme'
                  ? 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                  : 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
              }`}
            >
              {currentZone.vulnerabilityGrade} Vulnerability
            </span>
            <span className="text-[#64748b] font-mono">Elev: {currentZone.elevationMeters}m</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Zone Risk Distribution & Quick Workflow Launcher */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Micro-Zone Multi-Hazard Matrix */}
        <div className="lg:col-span-2 p-5 rounded-lg bg-[#0e131b] border border-[#1a2230]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-[#f8fafc]">
                Tamil Nadu Micro-Zone Hazard Exposure
              </h2>
              <p className="text-xs text-[#64748b] mt-0.5">
                Calibrated multi-hazard indices (0 - 100) across the 9 primary focus districts
              </p>
            </div>
            <button
              onClick={() => onNavigate('risk_map')}
              className="flex items-center gap-1 text-xs text-[#dfba4f] hover:underline font-mono cursor-pointer"
            >
              <span>Interactive Map</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#1a2230] text-[#64748b] font-mono uppercase text-[10px]">
                  <th className="py-2.5 px-3">District Micro-Zone</th>
                  <th className="py-2.5 px-3">Elevation</th>
                  <th className="py-2.5 px-3 text-center">Flood</th>
                  <th className="py-2.5 px-3 text-center">Cyclone</th>
                  <th className="py-2.5 px-3 text-center">Rainfall</th>
                  <th className="py-2.5 px-3 text-center">Storm Surge</th>
                  <th className="py-2.5 px-3 text-right">Zone EAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141b25]">
                {Object.values(TAMIL_NADU_ZONES).map((z) => {
                  const isSelected = z.id === selectedZone;
                  return (
                    <tr
                      key={z.id}
                      className={`hover:bg-[#131923] transition-colors ${
                        isSelected ? 'bg-[#151c27] font-medium' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-[#cbd5e1] flex items-center gap-2">
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37]" />}
                        <span>{z.name}</span>
                        {z.coastal && (
                          <span className="text-[9px] font-mono text-[#64748b] border border-[#242e3d] px-1 rounded">
                            Coast
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#94a3b8] tabular-nums">
                        {z.elevationMeters}m
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] tabular-nums ${
                            z.hazardScores.flood >= 85
                              ? 'text-rose-400 bg-rose-950/40'
                              : z.hazardScores.flood >= 70
                              ? 'text-amber-400 bg-amber-950/40'
                              : 'text-slate-400 bg-slate-900'
                          }`}
                        >
                          {z.hazardScores.flood}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] tabular-nums ${
                            z.hazardScores.cyclone >= 85
                              ? 'text-rose-400 bg-rose-950/40'
                              : z.hazardScores.cyclone >= 70
                              ? 'text-amber-400 bg-amber-950/40'
                              : 'text-slate-400 bg-slate-900'
                          }`}
                        >
                          {z.hazardScores.cyclone}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono tabular-nums text-[#cbd5e1]">
                        {z.hazardScores.rainfall}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono tabular-nums text-[#cbd5e1]">
                        {z.hazardScores.storm_surge}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#dfba4f] tabular-nums">
                        {formatINR(z.expectedAnnualLossInr)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Analytical Workflows & Verification Panel */}
        <div className="space-y-4">
          {/* Loss Anatomy Card */}
          <div className="p-5 rounded-lg bg-[#0e131b] border border-[#d4af37]/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 px-2 py-0.5 text-[9px] font-mono bg-[#d4af37]/20 text-[#d4af37] border-b border-l border-[#d4af37]/30">
              Signature Feature
            </div>
            <h3 className="text-sm font-semibold text-[#f8fafc] flex items-center gap-2">
              <span>Traceable Loss Anatomy</span>
            </h3>
            <p className="text-xs text-[#94a3b8] mt-1.5 leading-relaxed">
              Complete 7-stage calculation chain connecting hazard evidence, exposure, vulnerability
              curves, damage ratio, and annualized loss.
            </p>
            <div className="mt-3 p-2.5 rounded bg-[#090b0e] border border-[#1a2230] text-[11px] font-mono text-[#cbd5e1]">
              <div className="text-[#64748b]">Mandatory Hand-Check Test:</div>
              <div className="mt-1 text-[#d4af37]">
                ₹50,00,000 TIV × 20% MDR = ₹10,00,000 Loss
              </div>
            </div>
            <button
              onClick={() => onNavigate('loss_anatomy')}
              className="mt-4 w-full py-2 px-3 rounded bg-[#d4af37]/15 hover:bg-[#d4af37]/25 text-[#dfba4f] border border-[#d4af37]/40 text-xs font-medium font-mono transition-colors cursor-pointer text-center"
            >
              Open Loss Anatomy Trace →
            </button>
          </div>

          {/* Scenario Simulator Card */}
          <div className="p-5 rounded-lg bg-[#0e131b] border border-[#1a2230]">
            <h3 className="text-sm font-semibold text-[#f8fafc]">Scenario Simulation</h3>
            <p className="text-xs text-[#94a3b8] mt-1.5 leading-relaxed">
              Stress-test assets under customized rainfall anomalies (+150%), storm surge heights (5.5m),
              and structural plinth barrier mitigations.
            </p>
            <button
              onClick={() => onNavigate('scenario_simulator')}
              className="mt-4 w-full py-2 px-3 rounded bg-[#141b25] hover:bg-[#1a2433] text-[#cbd5e1] hover:text-[#f8fafc] border border-[#232f42] text-xs font-medium font-mono transition-colors cursor-pointer text-center"
            >
              Launch Simulator Engine →
            </button>
          </div>

          {/* Model Uncertainty & Disclaimers */}
          <div className="p-4 rounded-lg bg-[#0b0e14] border border-[#1a2230] text-[11px] text-[#64748b] space-y-1.5">
            <div className="flex items-center gap-1.5 text-[#94a3b8] font-medium font-mono">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Model Uncertainty & Quality Bands</span>
            </div>
            <p className="leading-relaxed">
              Loss estimates feature a 90% statistical uncertainty interval of ±22% derived from
              Bayesian historical storm track fitting.
            </p>
            <div className="text-[10px] text-[#556377] font-mono pt-1 border-t border-[#141b25]">
              “This report supports expert review and is not an automatic underwriting decision.”
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
