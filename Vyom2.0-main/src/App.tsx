/**
 * VYOM — Premium Tamil Nadu Catastrophe Risk Intelligence Platform
 * Master Application Root
 */

import React, { useState, useEffect } from 'react';
import { RouteId, Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { OpeningAnimation } from './components/OpeningAnimation';
import { LoginView } from './components/LoginView';
import { OverviewView } from './components/views/OverviewView';
import { RiskMapView } from './components/views/RiskMapView';
import { HazardAnalysisView } from './components/views/HazardAnalysisView';
import { ExposureAssetsView } from './components/views/ExposureAssetsView';
import { LossHistoryView } from './components/views/LossHistoryView';
import { RiskModellingView } from './components/views/RiskModellingView';
import { ScenarioSimulatorView } from './components/views/ScenarioSimulatorView';
import { LossAnatomyView } from './components/views/LossAnatomyView';
import { ExplainabilityView } from './components/views/ExplainabilityView';
import { DataTrustCenterView } from './components/views/DataTrustCenterView';
import { RiskPassportView } from './components/views/RiskPassportView';
import { SettingsView } from './components/views/SettingsView';
import { AICopilotModal } from './components/AICopilotModal';

import { AssetRecord, TamilNaduMicroZoneId, UserSession } from './types/risk';
import { INITIAL_DEMO_ASSETS } from './data/tamilNaduGeodata';
import { supabaseService } from './services/supabaseClient';

export default function App() {
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    // Only show opening animation on initial session visit
    return !sessionStorage.getItem('vyom_intro_completed');
  });

  const [user, setUser] = useState<UserSession | null>(null);
  const [currentRoute, setCurrentRoute] = useState<RouteId>('overview');
  const [selectedZone, setSelectedZone] = useState<TamilNaduMicroZoneId>('chennai');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [copilotOpen, setCopilotOpen] = useState<boolean>(false);
  const [assets, setAssets] = useState<AssetRecord[]>(INITIAL_DEMO_ASSETS);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(false);

  // Initialize session and assets
  useEffect(() => {
    async function loadData() {
      // 1. Check Supabase connection state
      const config = supabaseService.getConfigState();
      setIsSupabaseConnected(config.isConnected);

      // 2. Check user session
      const sessionUser = await supabaseService.getCurrentSession();
      if (sessionUser) {
        setUser(sessionUser);
      }

      // 3. Load assets from Supabase or local storage
      const assetsRes = await supabaseService.getAssets();
      setAssets(assetsRes.assets);
    }

    loadData();
  }, []);

  const handleIntroComplete = () => {
    sessionStorage.setItem('vyom_intro_completed', 'true');
    setShowIntro(false);
  };

  const handleRefreshAssets = async () => {
    const assetsRes = await supabaseService.getAssets();
    setAssets(assetsRes.assets);
  };

  const handleConnectionChange = async () => {
    const config = supabaseService.getConfigState();
    setIsSupabaseConnected(config.isConnected);
    handleRefreshAssets();
  };

  const handleSignOut = async () => {
    await supabaseService.signOut();
    setUser(null);
  };

  // Render Opening Animation if active
  if (showIntro) {
    return <OpeningAnimation onComplete={handleIntroComplete} />;
  }

  // Render Login Screen if not authenticated
  if (!user) {
    return (
      <LoginView
        onLoginSuccess={(authedUser) => setUser(authedUser)}
        isSupabaseConfigured={isSupabaseConnected}
        onOpenSettings={() => {
          // Allow guest setting adjustment
        }}
      />
    );
  }

  // Authenticated Catastrophe Intelligence Terminal
  return (
    <div className="min-h-screen bg-[#07090c] text-[#f8fafc] flex">
      {/* Collapsible Sidebar */}
      <Sidebar
        currentRoute={currentRoute}
        onRouteChange={(route) => setCurrentRoute(route)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        isSupabaseConnected={isSupabaseConnected}
      />

      {/* Main Terminal Viewport */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        {/* Top Navbar */}
        <Navbar
          currentRoute={currentRoute}
          selectedZone={selectedZone}
          onSelectZone={(zone) => setSelectedZone(zone)}
          user={user}
          onSignOut={handleSignOut}
          onOpenCopilot={() => setCopilotOpen(true)}
          collapsed={sidebarCollapsed}
        />

        {/* Content Body */}
        <main className="flex-1 p-6 mt-16 max-w-7xl w-full mx-auto">
          {currentRoute === 'overview' && (
            <OverviewView
              assets={assets}
              selectedZone={selectedZone}
              onNavigate={(r) => setCurrentRoute(r)}
              isSupabaseConnected={isSupabaseConnected}
            />
          )}

          {currentRoute === 'risk_map' && (
            <RiskMapView
              assets={assets}
              selectedZone={selectedZone}
              onSelectZone={(z) => setSelectedZone(z)}
            />
          )}

          {currentRoute === 'hazard_analysis' && (
            <HazardAnalysisView selectedZone={selectedZone} />
          )}

          {currentRoute === 'exposure_assets' && (
            <ExposureAssetsView
              assets={assets}
              onRefreshAssets={handleRefreshAssets}
              selectedZone={selectedZone}
            />
          )}

          {currentRoute === 'loss_history' && <LossHistoryView />}

          {currentRoute === 'risk_modelling' && (
            <RiskModellingView selectedZone={selectedZone} />
          )}

          {currentRoute === 'scenario_simulator' && (
            <ScenarioSimulatorView assets={assets} selectedZone={selectedZone} />
          )}

          {currentRoute === 'loss_anatomy' && (
            <LossAnatomyView assets={assets} selectedZone={selectedZone} />
          )}

          {currentRoute === 'explainability' && (
            <ExplainabilityView selectedZone={selectedZone} />
          )}

          {currentRoute === 'data_trust' && <DataTrustCenterView />}

          {currentRoute === 'risk_passport' && (
            <RiskPassportView assets={assets} selectedZone={selectedZone} />
          )}

          {currentRoute === 'settings' && (
            <SettingsView onConnectionChange={handleConnectionChange} />
          )}
        </main>
      </div>

      {/* Catastrophe Vector RAG Copilot Modal */}
      <AICopilotModal
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        selectedZone={selectedZone}
        activeAsset={assets[0]}
      />
    </div>
  );
}
