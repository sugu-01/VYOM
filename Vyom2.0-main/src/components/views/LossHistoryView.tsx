import React from 'react';
import { TAMIL_NADU_HISTORICAL_EVENTS } from '../../data/tamilNaduGeodata';
import { History, ShieldAlert, TrendingDown, ExternalLink } from 'lucide-react';

export const LossHistoryView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 rounded-lg bg-[#0e131b] border border-[#1a2230]">
        <h2 className="text-base font-semibold text-[#f8fafc]">
          Historical Tamil Nadu Catastrophe Loss Registry (2004 – 2024)
        </h2>
        <p className="text-xs text-[#94a3b8] mt-0.5">
          Archived post-disaster insurance settlements, economic devastation benchmarks, and structural
          failure analyses.
        </p>
      </div>

      {/* Historical Disaster Events Cards Grid */}
      <div className="space-y-4">
        {TAMIL_NADU_HISTORICAL_EVENTS.map((evt) => (
          <div
            key={evt.id}
            className="p-5 rounded-lg bg-[#0e131b] border border-[#1a2230] hover:border-[#283548] transition-all space-y-3"
          >
            {/* Header: Title, Year, Type & Insurance Claim Ratio */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#161f2c] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-[#d4af37] bg-[#d4af37]/10 px-2 py-0.5 rounded border border-[#d4af37]/30">
                    {evt.year} · {evt.type.toUpperCase()}
                  </span>
                  <span className="text-xs font-mono text-[#64748b]">{evt.id}</span>
                </div>
                <h3 className="text-base font-semibold text-[#f8fafc] mt-1">{evt.name}</h3>
              </div>

              <div className="flex items-baseline gap-3 font-mono text-xs">
                <div>
                  <span className="text-[#64748b]">Economic Loss: </span>
                  <span className="text-[#cbd5e1] font-semibold">
                    ₹{evt.estimatedEconomicLossInrCrore.toLocaleString('en-IN')} Cr
                  </span>
                </div>
                <div>
                  <span className="text-[#64748b]">Insured Loss: </span>
                  <span className="text-[#dfba4f] font-semibold">
                    ₹{evt.insuredLossInrCrore.toLocaleString('en-IN')} Cr
                  </span>
                </div>
              </div>
            </div>

            {/* Event Metrics & Affected Areas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded bg-[#090b0e] border border-[#141b25]">
                <div className="text-[10px] font-mono uppercase text-[#64748b]">Peak Intensity</div>
                <div className="font-mono text-[#cbd5e1] text-[11px] mt-1 leading-relaxed">
                  {evt.peakIntensity}
                </div>
              </div>

              <div className="p-3 rounded bg-[#090b0e] border border-[#141b25]">
                <div className="text-[10px] font-mono uppercase text-[#64748b]">
                  Affected District Corridors
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {evt.affectedDistricts.map((d, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-mono bg-[#141b25] text-[#94a3b8] px-1.5 py-0.5 rounded"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded bg-[#090b0e] border border-[#141b25]">
                <div className="text-[10px] font-mono uppercase text-[#64748b]">
                  Insurance Penetration / Claim Ratio
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-bold font-mono text-[#dfba4f]">
                    {evt.insuranceClaimRatioPct}%
                  </span>
                  <div className="w-full bg-[#18212e] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#d4af37] h-full rounded-full"
                      style={{ width: `${evt.insuranceClaimRatioPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Key Lessons Learned */}
            <div className="p-3 rounded bg-[#090b0e] border border-[#141b25] text-xs">
              <span className="font-mono text-[#d4af37] font-medium text-[11px]">
                Engineering & Underwriting Insight:{' '}
              </span>
              <span className="text-[#94a3b8] leading-relaxed">{evt.keyLessons}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
