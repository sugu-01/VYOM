import React, { useState } from 'react';
import { RouteId } from './Sidebar';
import { TamilNaduMicroZoneId, UserSession } from '../types/risk';
import { TAMIL_NADU_ZONES } from '../data/tamilNaduGeodata';
import { Bot, LogOut, ChevronDown, Check } from 'lucide-react';

interface NavbarProps {
  currentRoute: RouteId;
  selectedZone: TamilNaduMicroZoneId;
  onSelectZone: (zone: TamilNaduMicroZoneId) => void;
  user: UserSession | null;
  onSignOut: () => void;
  onOpenCopilot: () => void;
  collapsed: boolean;
}

const ROUTE_NAMES: Record<RouteId, string> = {
  overview: 'Executive Portfolio Overview',
  risk_map: 'Tamil Nadu Geospatial Risk Map',
  hazard_analysis: 'Hydro-Meteorological Hazard Analysis',
  exposure_assets: 'Exposed Assets & Spatial Register',
  loss_history: 'Historical Tamil Nadu Catastrophe Losses',
  risk_modelling: 'Vulnerability Models & Probabilistic Curves',
  scenario_simulator: 'Catastrophe Scenario Simulator',
  loss_anatomy: 'Traceable Loss Anatomy',
  explainability: 'Risk Driver Attribution & Sensitivity',
  data_trust: 'Data Trust Center & Sensor Provenance',
  risk_passport: 'Underwriting Risk Passport Export',
  settings: 'System Configuration & Supabase Storage',
};

export const Navbar: React.FC<NavbarProps> = ({
  currentRoute,
  selectedZone,
  onSelectZone,
  user,
  onSignOut,
  onOpenCopilot,
  collapsed,
}) => {
  const [zoneDropdownOpen, setZoneDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const currentZoneData = TAMIL_NADU_ZONES[selectedZone];

  return (
    <header
      className={`fixed top-0 right-0 z-20 h-16 bg-[#0a0d13]/95 backdrop-blur-md border-b border-[#1a2230] px-6 transition-all duration-300 flex items-center justify-between gap-6 ${
        collapsed ? 'left-16' : 'left-64'
      }`}
    >
      {/* Zone 1: Context Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xs font-mono tracking-wider text-[#64748b] uppercase">VYOM</span>
        <span className="text-xs text-[#334155]">/</span>
        <h1 className="text-sm font-semibold tracking-wide text-[#f8fafc] truncate">
          {ROUTE_NAMES[currentRoute]}
        </h1>
      </div>

      {/* Zone 2: Micro-Zone Context Selector */}
      <div className="hidden md:flex items-center gap-3">
        <span className="text-xs text-[#64748b]">Micro-Zone Context:</span>
        <div className="relative">
          <button
            onClick={() => setZoneDropdownOpen(!zoneDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#121822] border border-[#232f42] text-xs font-mono text-[#f8fafc] hover:border-[#d4af37]/60 transition-colors cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37]" />
            <span className="font-medium">{currentZoneData.name}</span>
            <span className="text-[10px] text-[#64748b]">({currentZoneData.vulnerabilityGrade})</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#64748b]" />
          </button>

          {zoneDropdownOpen && (
            <div className="absolute right-0 mt-1 w-64 bg-[#0e131b] border border-[#232f42] rounded-md shadow-2xl py-1 z-50">
              <div className="px-3 py-1.5 text-[10px] uppercase font-mono tracking-wider text-[#64748b] border-b border-[#1a2230]">
                Select Tamil Nadu Micro-Zone
              </div>
              {Object.values(TAMIL_NADU_ZONES).map((z) => (
                <button
                  key={z.id}
                  onClick={() => {
                    onSelectZone(z.id);
                    setZoneDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-[#161f2c] transition-colors cursor-pointer ${
                    z.id === selectedZone ? 'text-[#dfba4f] bg-[#141b26]' : 'text-[#cbd5e1]'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{z.name}</span>
                    <span className="text-[10px] text-[#64748b] truncate max-w-[170px]">
                      {z.regionalTitle}
                    </span>
                  </div>
                  {z.id === selectedZone && <Check className="w-3.5 h-3.5 text-[#d4af37]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Zone 3: Primary Actions (Copilot & User Profile) */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenCopilot}
          className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#141b25] border border-[#d4af37]/40 text-[#dfba4f] hover:bg-[#d4af37]/15 hover:border-[#d4af37] text-xs font-medium transition-all shadow-sm cursor-pointer whitespace-nowrap"
        >
          <Bot className="w-3.5 h-3.5 text-[#d4af37]" />
          <span>Underwriter Copilot</span>
          <span className="text-[9px] font-mono text-[#d4af37] border border-[#d4af37]/30 px-1 py-0.2 rounded">
            RAG
          </span>
        </button>

        {/* Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded bg-[#121822] border border-[#1f293a] text-xs text-[#cbd5e1] hover:text-[#f8fafc] hover:border-[#334155] transition-colors cursor-pointer"
          >
            <div className="w-6 h-6 rounded bg-[#1e293b] border border-[#3b4759] flex items-center justify-center text-[11px] font-mono font-medium text-[#d4af37]">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <span className="hidden sm:inline font-medium text-xs max-w-[110px] truncate">
              {user?.fullName || 'Analyst'}
            </span>
            <ChevronDown className="w-3 h-3 text-[#64748b]" />
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-60 bg-[#0e131b] border border-[#232f42] rounded-md shadow-2xl py-1 z-50">
              <div className="px-3 py-2 border-b border-[#1a2230]">
                <div className="text-xs font-semibold text-[#f8fafc] truncate">
                  {user?.fullName || 'Underwriter'}
                </div>
                <div className="text-[11px] font-mono text-[#64748b] truncate">{user?.email}</div>
                <div className="mt-1 text-[10px] text-[#d4af37] font-mono">{user?.role}</div>
              </div>

              <button
                onClick={() => {
                  setProfileDropdownOpen(false);
                  onSignOut();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/30 transition-colors text-left cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect & Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
