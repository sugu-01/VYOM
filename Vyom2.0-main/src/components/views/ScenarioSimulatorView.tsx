import React, { useState } from 'react';
import {
  AssetRecord,
  ConstructionCategory,
  SimulationParameters,
  TamilNaduMicroZoneId,
} from '../../types/risk';
import { runScenarioSimulation, formatINR, formatExactINR } from '../../utils/catRiskEngine';
import { TAMIL_NADU_ZONES, VULNERABILITY_CURVES } from '../../data/tamilNaduGeodata';
import {
  SlidersHorizontal,
  RotateCcw,
  Download,
  AlertTriangle,
  TrendingUp,
  Shield,
  Layers,
  CheckCircle,
} from 'lucide-react';

interface ScenarioSimulatorViewProps {
  assets: AssetRecord[];
  selectedZone: TamilNaduMicroZoneId;
}

export const ScenarioSimulatorView: React.FC<ScenarioSimulatorViewProps> = ({
  assets,
  selectedZone,
}) => {
  // Default simulation parameters
  const [params, setParams] = useState<SimulationParameters>({
    rainfallAnomalyPct: 40, // +40% rainfall deluge anomaly
    stormSurgeHeightMeters: 1.5, // 1.5m coastal storm surge
    windSpeedChangeKmh: 25, // +25 km/h cyclonic gust
    zoneId: selectedZone,
    assetInsuredValueInr: 250000000, // ₹25 Cr default portfolio sample
    plinthInterventionMeters: 0.8, // 0.8m plinth civil barrier
    constructionCategory: 'TN-RCC-2024',
  });

  const result = runScenarioSimulation(params);
  const zoneData = TAMIL_NADU_ZONES[params.zoneId];

  const handleReset = () => {
    setParams({
      rainfallAnomalyPct: 0,
      stormSurgeHeightMeters: 0,
      windSpeedChangeKmh: 0,
      zoneId: selectedZone,
      assetInsuredValueInr: 250000000,
      plinthInterventionMeters: 0,
      constructionCategory: 'TN-RCC-2024',
    });
  };

  const handleExportScenarioJSON = () => {
    const payload = {
      scenarioParameters: params,
      simulationResult: result,
      zoneContext: zoneData,
      generatedTimestamp: new Date().toISOString(),
      disclaimer: 'This report supports expert review and is not an automatic underwriting decision.',
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VYOM_Scenario_${params.zoneId}_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg bg-[#0e131b] border border-[#1a2230]">
        <div>
          <h2 className="text-base font-semibold text-[#f8fafc]">
            Interactive Catastrophe Scenario Simulator
          </h2>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            Evaluate climate stress, hydro-meteorological anomalies, and civil plinth defense ROI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#121822] hover:bg-[#1a2332] border border-[#232f42] text-xs font-mono text-[#cbd5e1] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Baseline</span>
          </button>
          <button
            onClick={handleExportScenarioJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#d4af37]/20 hover:bg-[#d4af37]/30 border border-[#d4af37]/50 text-xs font-mono text-[#dfba4f] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Scenario</span>
          </button>
        </div>
      </div>

      {/* Boundary Warning Callout (if inputs exceed calibrated limits) */}
      {result.exceedsBounds && (
        <div className="p-3.5 rounded-lg bg-amber-950/30 border border-amber-800/50 flex items-start gap-3 text-xs text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold font-mono uppercase text-[11px] text-amber-300">
              Input Boundary Violation Warning
            </div>
            <p className="mt-0.5 text-amber-200/90 leading-relaxed font-mono">
              {result.boundaryWarning}
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Parameter Sliders vs Result Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Simulation Sliders (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-lg bg-[#0e131b] border border-[#1a2230] space-y-5">
          <div className="text-xs font-semibold text-[#f8fafc] uppercase tracking-wider font-mono border-b border-[#161f2c] pb-2">
            Scenario Stress Parameters
          </div>

          {/* Region / Micro-Zone */}
          <div>
            <label className="block text-xs font-medium text-[#cbd5e1] mb-1">
              Target Micro-Zone Region
            </label>
            <select
              value={params.zoneId}
              onChange={(e) =>
                setParams({ ...params, zoneId: e.target.value as TamilNaduMicroZoneId })
              }
              className="w-full py-2 px-3 rounded bg-[#090b0e] border border-[#1f293a] text-xs font-mono text-[#f8fafc] focus:border-[#d4af37] outline-none cursor-pointer"
            >
              {Object.values(TAMIL_NADU_ZONES).map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} ({z.regionalTitle})
                </option>
              ))}
            </select>
          </div>

          {/* Construction & Vulnerability Curve */}
          <div>
            <label className="block text-xs font-medium text-[#cbd5e1] mb-1">
              Structural Vulnerability Class
            </label>
            <select
              value={params.constructionCategory}
              onChange={(e) =>
                setParams({
                  ...params,
                  constructionCategory: e.target.value as ConstructionCategory,
                })
              }
              className="w-full py-2 px-3 rounded bg-[#090b0e] border border-[#1f293a] text-xs font-mono text-[#f8fafc] focus:border-[#d4af37] outline-none cursor-pointer"
            >
              {Object.values(VULNERABILITY_CURVES).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} — {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Asset Insured Value */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-[#94a3b8]">Insured Value Sum (TIV):</span>
              <span className="text-[#dfba4f] font-semibold">
                {formatINR(params.assetInsuredValueInr)}
              </span>
            </div>
            <input
              type="range"
              min="10000000"
              max="10000000000"
              step="10000000"
              value={params.assetInsuredValueInr}
              onChange={(e) =>
                setParams({ ...params, assetInsuredValueInr: Number(e.target.value) })
              }
              className="w-full accent-[#d4af37] cursor-pointer"
            />
          </div>

          {/* Rainfall Anomaly */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-[#94a3b8]">Rainfall Precipitation Anomaly:</span>
              <span
                className={`font-semibold ${
                  params.rainfallAnomalyPct > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {params.rainfallAnomalyPct > 0 ? `+${params.rainfallAnomalyPct}%` : `${params.rainfallAnomalyPct}%`}
              </span>
            </div>
            <input
              type="range"
              min="-60"
              max="150"
              step="5"
              value={params.rainfallAnomalyPct}
              onChange={(e) =>
                setParams({ ...params, rainfallAnomalyPct: Number(e.target.value) })
              }
              className="w-full accent-[#d4af37] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#64748b] font-mono mt-1">
              <span>-60% (Drought)</span>
              <span>Baseline (0%)</span>
              <span>+150% (Historic Deluge)</span>
            </div>
          </div>

          {/* Storm Surge Height */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-[#94a3b8]">Coastal Storm Surge Height:</span>
              <span className="text-amber-400 font-semibold">{params.stormSurgeHeightMeters}m</span>
            </div>
            <input
              type="range"
              min="0"
              max="5.5"
              step="0.25"
              value={params.stormSurgeHeightMeters}
              onChange={(e) =>
                setParams({ ...params, stormSurgeHeightMeters: Number(e.target.value) })
              }
              className="w-full accent-[#d4af37] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#64748b] font-mono mt-1">
              <span>0m (Astronomical Tide Only)</span>
              <span>2.5m (Cyclone Gaja)</span>
              <span>5.5m (Max Surge Envelope)</span>
            </div>
          </div>

          {/* Plinth Defense Barrier */}
          <div className="p-3.5 rounded bg-[#090b0e] border border-[#d4af37]/30 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#dfba4f] font-medium flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>Civil Plinth / Barrier Intervention:</span>
              </span>
              <span className="text-[#f8fafc] font-bold">{params.plinthInterventionMeters}m</span>
            </div>
            <input
              type="range"
              min="0"
              max="2.5"
              step="0.1"
              value={params.plinthInterventionMeters}
              onChange={(e) =>
                setParams({ ...params, plinthInterventionMeters: Number(e.target.value) })
              }
              className="w-full accent-[#d4af37] cursor-pointer"
            />
            <div className="text-[10px] text-[#64748b] font-mono leading-relaxed">
              Elevating the plinth or installing mechanical flood gates reduces effective inundation
              depth directly at the structural boundary.
            </div>
          </div>
        </div>

        {/* Right Column: Comparative Analytical Results (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Comparison Cards */}
          <div className="p-5 rounded-lg bg-[#0e131b] border border-[#1a2230] space-y-4">
            <div className="text-xs font-semibold text-[#f8fafc] uppercase tracking-wider font-mono border-b border-[#161f2c] pb-2">
              Baseline vs. Scenario Comparison
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Baseline Loss */}
              <div className="p-3 rounded bg-[#090b0e] border border-[#161f2c] font-mono">
                <div className="text-[10px] text-[#64748b]">Baseline Gross Loss</div>
                <div className="text-base font-semibold text-[#cbd5e1] mt-1 tabular-nums">
                  {formatINR(result.baselineGrossLossInr)}
                </div>
                <div className="text-[10px] text-[#94a3b8] mt-0.5">
                  MDR: {result.baselineDamageRatioPct}%
                </div>
              </div>

              {/* Scenario Loss */}
              <div className="p-3 rounded bg-[#090b0e] border border-[#232f42] font-mono">
                <div className="text-[10px] text-[#64748b]">Scenario Gross Loss</div>
                <div className="text-base font-semibold text-[#dfba4f] mt-1 tabular-nums">
                  {formatINR(result.scenarioGrossLossInr)}
                </div>
                <div className="text-[10px] text-[#d4af37] mt-0.5">
                  MDR: {result.scenarioDamageRatioPct}%
                </div>
              </div>
            </div>

            {/* Absolute & Percentage Variance */}
            <div className="p-3.5 rounded bg-[#090b0e] border border-[#1a2230] font-mono text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[#94a3b8]">Net Loss Variance:</span>
                <span
                  className={`font-bold tabular-nums ${
                    result.absoluteChangeInr > 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {result.absoluteChangeInr > 0 ? '+' : ''}
                  {formatExactINR(result.absoluteChangeInr)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#94a3b8]">Relative Shift:</span>
                <span
                  className={`font-bold tabular-nums ${
                    result.percentageChange > 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {result.percentageChange > 0 ? '+' : ''}
                  {result.percentageChange}%
                </span>
              </div>
            </div>

            {/* Mitigation ROI (Resilience Savings) */}
            {params.plinthInterventionMeters > 0 && (
              <div className="p-3.5 rounded bg-emerald-950/20 border border-emerald-800/40 text-xs font-mono space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Plinth Resilience Savings</span>
                </div>
                <div className="text-lg font-bold text-emerald-300 tabular-nums">
                  {formatINR(result.resilienceSavingsInr)}
                </div>
                <div className="text-[10px] text-[#94a3b8] leading-relaxed">
                  Avoided financial destruction strictly achieved by {params.plinthInterventionMeters}m
                  plinth elevation during this event scenario.
                </div>
              </div>
            )}
          </div>

          {/* Underwriting Actionability Summary */}
          <div className="p-4 rounded-lg bg-[#0b0e14] border border-[#161f2c] text-[11px] text-[#94a3b8] space-y-2 leading-relaxed">
            <div className="font-semibold text-[#f8fafc] font-mono text-xs">
              Actuarial Interpretation
            </div>
            <p>
              In {zoneData.name}, precipitation increases compound non-linearly due to saturated soil
              antecedent moisture conditions and local estuary elevation ({zoneData.elevationMeters}m MSL).
            </p>
            <div className="pt-2 border-t border-[#161f2c] text-[10px] text-[#556377] font-mono">
              “This report supports expert review and is not an automatic underwriting decision.”
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
