import React from 'react';
import { DATA_TRUST_REGISTRY } from '../../data/tamilNaduGeodata';
import { ShieldCheck, Database, CheckCircle2, AlertCircle, FileCheck, Info } from 'lucide-react';

export const DataTrustCenterView: React.FC = () => {
  // Explicitly reproducible trust score formula
  // Score = 0.3 * Completeness (95%) + 0.25 * Resolution (90%) + 0.25 * Freshness (92%) + 0.20 * Official Verification (94%) = 92.8%
  const trustScoreComponents = [
    { label: 'Spatial & Temporal Completeness', score: 95, weight: '30%' },
    { label: 'Resolution & DEM Accuracy', score: 90, weight: '25%' },
    { label: 'Sensor Freshness & Cadence', score: 92, weight: '25%' },
    { label: 'Official Sourced Provenance', score: 94, weight: '20%' },
  ];
  const overallTrustScore = 92.8;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 rounded-lg bg-[#0e131b] border border-[#1a2230]">
        <h2 className="text-base font-semibold text-[#f8fafc]">
          Data Trust Center & Sensor Provenance
        </h2>
        <p className="text-xs text-[#94a3b8] mt-0.5">
          Verifiable sensor origins, coordinate standards, licence agreements, and transformation
          audits.
        </p>
      </div>

      {/* Reproducible Trust Score Card */}
      <div className="p-5 rounded-lg bg-[#0e131b] border border-[#1a2230] grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-4 flex flex-col items-center justify-center p-4 rounded bg-[#090b0e] border border-[#161f2c] text-center">
          <div className="text-[10px] font-mono uppercase text-[#64748b]">
            Reproducible Provenance Score
          </div>
          <div className="text-4xl font-bold font-mono text-[#dfba4f] mt-1 tabular-nums">
            {overallTrustScore}
            <span className="text-sm font-normal text-[#64748b]">/100</span>
          </div>
          <div className="mt-2 text-[10px] text-emerald-400 font-mono flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>High Actuarial Reliability</span>
          </div>
        </div>

        <div className="md:col-span-8 space-y-3">
          <div className="text-xs font-semibold text-[#f8fafc] font-mono">
            Auditable Scoring Formula Breakdown
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            {trustScoreComponents.map((c, i) => (
              <div
                key={i}
                className="p-2.5 rounded bg-[#090b0e] border border-[#141b25] flex justify-between items-center"
              >
                <div>
                  <div className="text-[#cbd5e1] text-[11px]">{c.label}</div>
                  <div className="text-[10px] text-[#64748b]">Weight: {c.weight}</div>
                </div>
                <div className="text-[#dfba4f] font-semibold text-sm tabular-nums">
                  {c.score}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Registered Datasets Table */}
      <div className="space-y-4">
        <div className="text-xs font-semibold font-mono uppercase tracking-wider text-[#64748b]">
          Dataset Registry & Custodianship
        </div>

        {DATA_TRUST_REGISTRY.map((item) => (
          <div
            key={item.id}
            className="p-5 rounded-lg bg-[#0e131b] border border-[#1a2230] hover:border-[#283548] transition-all space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#161f2c] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[#dfba4f] font-semibold">{item.id}</span>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                      item.validationStatus === 'Verified Official'
                        ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/40'
                        : 'text-amber-400 bg-amber-950/40 border border-amber-800/40'
                    }`}
                  >
                    {item.validationStatus}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-[#f8fafc] mt-1">{item.datasetName}</h3>
                <div className="text-xs text-[#94a3b8] mt-0.5">Owner / Custodian: {item.owner}</div>
              </div>

              <div className="text-xs font-mono text-[#64748b] sm:text-right">
                <div>Licence: {item.licence}</div>
                <div className="text-[#cbd5e1] mt-0.5">Updated: {item.freshnessTimestamp}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded bg-[#090b0e] border border-[#141b25]">
                <div className="text-[10px] text-[#64748b]">Coverage & Resolution</div>
                <div className="text-[#cbd5e1] mt-0.5 text-[11px]">{item.coverage}</div>
                <div className="text-[#94a3b8] text-[10px] mt-0.5">{item.spatialResolution}</div>
              </div>

              <div className="p-2.5 rounded bg-[#090b0e] border border-[#141b25]">
                <div className="text-[10px] text-[#64748b]">Units & Coordinate System</div>
                <div className="text-[#cbd5e1] mt-0.5 text-[11px]">{item.unitsAndCRS}</div>
                <div className="text-[#94a3b8] text-[10px] mt-0.5">Time: {item.timePeriod}</div>
              </div>

              <div className="p-2.5 rounded bg-[#090b0e] border border-[#141b25]">
                <div className="text-[10px] text-[#64748b]">Pipeline Version</div>
                <div className="text-[#cbd5e1] mt-0.5 text-[11px]">{item.transformationVersion}</div>
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#090b0e] border border-[#141b25] text-xs">
              <span className="font-mono text-rose-400 font-medium text-[10px] uppercase">
                Known Boundary Limitations:{' '}
              </span>
              <span className="text-[#94a3b8] text-[11px]">{item.limitations}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
