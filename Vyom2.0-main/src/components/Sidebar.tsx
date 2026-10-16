import React from 'react';
import {
  LayoutDashboard,
  MapPin,
  Waves,
  Building2,
  History,
  Activity,
  SlidersHorizontal,
  FileSearch,
  BrainCircuit,
  ShieldCheck,
  FileSpreadsheet,
  Settings,
  ChevronLeft,
  ChevronRight,
  Database,
} from 'lucide-react';

export type RouteId =
  | 'overview'
  | 'risk_map'
  | 'hazard_analysis'
  | 'exposure_assets'
  | 'loss_history'
  | 'risk_modelling'
  | 'scenario_simulator'
  | 'loss_anatomy'
  | 'explainability'
  | 'data_trust'
  | 'risk_passport'
  | 'settings';

interface SidebarProps {
  currentRoute: RouteId;
  onRouteChange: (route: RouteId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isSupabaseConnected: boolean;
}

interface NavItemDef {
  id: RouteId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isSignature?: boolean;
}

export const NAV_ITEMS: NavItemDef[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'risk_map', label: 'Risk Map', icon: MapPin },
  { id: 'hazard_analysis', label: 'Hazard Analysis', icon: Waves },
  { id: 'exposure_assets', label: 'Exposure & Assets', icon: Building2 },
  { id: 'loss_history', label: 'Loss History', icon: History },
  { id: 'risk_modelling', label: 'Risk Modelling', icon: Activity },
  { id: 'scenario_simulator', label: 'Scenario Simulator', icon: SlidersHorizontal },
  { id: 'loss_anatomy', label: 'Loss Anatomy', icon: FileSearch, isSignature: true },
  { id: 'explainability', label: 'Explainability', icon: BrainCircuit },
  { id: 'data_trust', label: 'Data Trust Center', icon: ShieldCheck },
  { id: 'risk_passport', label: 'Risk Passport', icon: FileSpreadsheet },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onRouteChange,
  collapsed,
  onToggleCollapse,
  isSupabaseConnected,
}) => {
  return (
    <aside
      className={`fixed top-0 bottom-0 left-0 z-30 flex flex-col bg-[#0b0e14] border-r border-[#1a2230] transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-[#1a2230] shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded border border-[#d4af37]/40 flex items-center justify-center bg-[#131923]">
              <span className="text-[#d4af37] text-xs font-semibold font-mono">V</span>
            </div>
            <div>
              <div className="text-base font-medium tracking-[0.2em] text-[#f8fafc]">
                VYOM<span className="text-[#d4af37]">.</span>
              </div>
              <div className="text-[10px] tracking-wider text-[#64748b] uppercase font-mono">
                TN Cat Risk
              </div>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 mx-auto rounded border border-[#d4af37]/40 flex items-center justify-center bg-[#131923]">
            <span className="text-[#d4af37] text-xs font-semibold font-mono">V</span>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="p-1 rounded text-[#64748b] hover:text-[#f8fafc] hover:bg-[#161f2c] transition-colors cursor-pointer"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Database Status Strip */}
      {!collapsed && (
        <div className="px-4 py-2 border-b border-[#161e2a] bg-[#0e131b] flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2 text-[#94a3b8]">
            <Database className="w-3.5 h-3.5 text-[#d4af37]" />
            <span className="font-mono">Supabase Storage</span>
          </div>
          <span
            className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${
              isSupabaseConnected
                ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/40'
                : 'text-amber-300 bg-amber-950/40 border border-amber-800/40'
            }`}
          >
            {isSupabaseConnected ? 'Connected' : 'Demo Mode'}
          </span>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onRouteChange(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded text-xs font-medium transition-all text-left group cursor-pointer ${
                isActive
                  ? 'bg-[#18212e] text-[#f8fafc] border-l-2 border-[#d4af37] shadow-sm'
                  : 'text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#121822]'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? 'text-[#dfba4f]' : 'text-[#64748b] group-hover:text-[#94a3b8]'
                }`}
              />
              {!collapsed && (
                <div className="flex items-center justify-between w-full overflow-hidden">
                  <span className="truncate">{item.label}</span>
                  {item.isSignature && (
                    <span className="ml-1 text-[9px] font-mono tracking-wider text-[#d4af37] bg-[#d4af37]/10 px-1 py-0.2 rounded border border-[#d4af37]/30 shrink-0">
                      Signature
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      {!collapsed && (
        <div className="p-3 border-t border-[#1a2230] bg-[#0c1017] text-[10px] text-[#64748b]">
          <div className="flex items-center justify-between font-mono">
            <span>Peril Focus</span>
            <span className="text-[#94a3b8]">Tamil Nadu</span>
          </div>
          <div className="flex items-center justify-between font-mono mt-1">
            <span>CRS Baseline</span>
            <span className="text-[#94a3b8]">EPSG:4326</span>
          </div>
        </div>
      )}
    </aside>
  );
};
