import React, { useState } from 'react';
import { supabaseService, SupabaseConfigState } from '../../services/supabaseClient';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Shield,
  Key,
  Terminal,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface SettingsViewProps {
  onConnectionChange: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onConnectionChange }) => {
  const currentConfig = supabaseService.getConfigState();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey.startsWith('eyJ') ? '' : currentConfig.anonKey);
  const [isTesting, setIsTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSQL, setCopiedSQL] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  const handleTestAndSave = async () => {
    setIsTesting(true);
    setFeedback(null);

    const res = await supabaseService.setCredentials(url, anonKey);
    setIsTesting(false);

    if (res.success) {
      setFeedback({
        success: true,
        message: 'Successfully connected to your Supabase project! Client is active and authenticated.',
      });
      onConnectionChange();
    } else {
      setFeedback({
        success: false,
        message: res.error || 'Failed to connect. Please verify your Supabase URL and Anon Key.',
      });
    }
  };

  const handleDisconnect = () => {
    supabaseService.clearCredentials();
    setUrl('');
    setAnonKey('');
    setFeedback({
      success: true,
      message: 'Supabase credentials cleared. Switched to isolated local demonstration mode.',
    });
    onConnectionChange();
  };

  const sqlSchemaScript = `-- ==============================================================================
-- VYOM Catastrophe Intelligence Platform — Supabase SQL Migration
-- Run this in your Supabase Project -> SQL Editor to initialize tables and RLS
-- ==============================================================================

-- 1. Create Assets Exposure Table
create table if not exists public.assets (
  id text primary key,
  name text not null,
  type text not null,
  zone text not null,
  lat double precision not null,
  lng double precision not null,
  insured_value_inr numeric not null,
  construction_category text not null,
  year_built integer default 2020,
  plinth_height_meters numeric default 1.0,
  deductible_inr numeric default 0,
  limit_inr numeric not null,
  user_id uuid references auth.users default auth.uid(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS)
alter table public.assets enable row level security;

-- 3. RLS Policies: Allow authenticated users to manage their own portfolio assets
create policy "Users can select own assets"
  on public.assets for select
  using (auth.uid() = user_id or user_id is null);

create policy "Users can insert own assets"
  on public.assets for insert
  with check (auth.uid() = user_id or auth.uid() is not null);

create policy "Users can update own assets"
  on public.assets for update
  using (auth.uid() = user_id);

create policy "Users can delete own assets"
  on public.assets for delete
  using (auth.uid() = user_id);

-- 4. Create Audit Traces Table
create table if not exists public.audit_traces (
  id uuid primary key default gen_random_uuid(),
  asset_id text references public.assets(id) on delete set null,
  peril_type text not null,
  hazard_intensity numeric not null,
  computed_loss_inr numeric not null,
  trace_payload jsonb not null,
  user_id uuid references auth.users default auth.uid(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.audit_traces enable row level security;

create policy "Users can read own audit traces"
  on public.audit_traces for select
  using (auth.uid() = user_id);
`;

  const handleCopySQL = () => {
    navigator.clipboard.writeText(sqlSchemaScript);
    setCopiedSQL(true);
    setTimeout(() => setCopiedSQL(false), 2000);
  };

  const handleCopyEnv = () => {
    const envText = `VITE_SUPABASE_URL="${url || 'https://your-project.supabase.co'}"\nVITE_SUPABASE_ANON_KEY="${anonKey || 'your-anon-public-key'}"`;
    navigator.clipboard.writeText(envText);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header Banner */}
      <div className="p-4 rounded-lg bg-[#0e131b] border border-[#1a2230]">
        <h2 className="text-base font-semibold text-[#f8fafc]">
          System Settings & Supabase Storage Connection
        </h2>
        <p className="text-xs text-[#94a3b8] mt-0.5">
          Connect your custom Supabase PostgreSQL database and Supabase Auth. Never enter private
          service-role keys here; only the public Anon key is required.
        </p>
      </div>

      {/* Supabase Connection Form */}
      <div className="p-5 rounded-lg bg-[#0e131b] border border-[#1a2230] space-y-4">
        <div className="flex items-center justify-between border-b border-[#161f2c] pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#d4af37]" />
            <h3 className="text-sm font-semibold text-[#f8fafc]">Supabase Project Credentials</h3>
          </div>
          <span
            className={`font-mono text-[10px] px-2 py-0.5 rounded ${
              currentConfig.isConnected
                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                : 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
            }`}
          >
            {currentConfig.isConnected ? 'Connected' : 'Demo Local Mode'}
          </span>
        </div>

        {/* Form Inputs */}
        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-[#cbd5e1] font-mono text-[11px] mb-1">
              Supabase Project URL:
            </label>
            <input
              type="text"
              placeholder="https://your-project.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full py-2 px-3 rounded bg-[#090b0e] border border-[#1f293a] text-[#f8fafc] font-mono text-xs focus:border-[#d4af37] outline-none"
            />
            <span className="text-[10px] text-[#64748b] mt-1 block">
              Found in your Supabase Dashboard → Settings → API → Project URL.
            </span>
          </div>

          <div>
            <label className="block text-[#cbd5e1] font-mono text-[11px] mb-1">
              Supabase Public Anon Key (anon/public):
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              className="w-full py-2 px-3 rounded bg-[#090b0e] border border-[#1f293a] text-[#f8fafc] font-mono text-xs focus:border-[#d4af37] outline-none"
            />
            <span className="text-[10px] text-[#64748b] mt-1 block">
              Found in your Supabase Dashboard → Settings → API → Project API Keys (anon public).
            </span>
          </div>
        </div>

        {/* Feedback message */}
        {feedback && (
          <div
            className={`p-3 rounded text-xs font-mono flex items-start gap-2 ${
              feedback.success
                ? 'bg-emerald-950/30 border border-emerald-800/40 text-emerald-300'
                : 'bg-rose-950/30 border border-rose-800/40 text-rose-300'
            }`}
          >
            {feedback.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>{feedback.message}</div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[#161f2c]">
          <button
            onClick={handleDisconnect}
            className="text-xs font-mono text-[#64748b] hover:text-rose-400 transition-colors cursor-pointer"
          >
            Clear Stored Credentials
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleCopyEnv}
              className="py-1.5 px-3 rounded bg-[#141b25] hover:bg-[#1a2332] border border-[#232f42] text-xs font-mono text-[#cbd5e1] transition-colors cursor-pointer"
            >
              {copiedEnv ? 'Copied .env' : 'Copy .env variables'}
            </button>
            <button
              onClick={handleTestAndSave}
              disabled={isTesting}
              className="py-1.5 px-4 rounded bg-[#d4af37] hover:bg-[#dfba4f] text-[#0a0d13] font-semibold font-mono text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isTesting ? 'Verifying...' : 'Save & Connect Supabase'}
            </button>
          </div>
        </div>
      </div>

      {/* SQL Migration Script Ready-to-Copy */}
      <div className="p-5 rounded-lg bg-[#0e131b] border border-[#1a2230] space-y-3">
        <div className="flex items-center justify-between border-b border-[#161f2c] pb-3">
          <div>
            <h3 className="text-sm font-semibold text-[#f8fafc]">
              Supabase SQL Migration Schema & RLS Policies
            </h3>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              Paste this in your Supabase project’s SQL Editor to instantiate the schema.
            </p>
          </div>
          <button
            onClick={handleCopySQL}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#16202c] hover:bg-[#1e2a3c] border border-[#d4af37]/40 text-xs font-mono text-[#dfba4f] transition-colors cursor-pointer"
          >
            {copiedSQL ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSQL ? 'Copied SQL' : 'Copy Migration SQL'}</span>
          </button>
        </div>

        <pre className="p-4 rounded bg-[#080a0e] border border-[#161f2c] text-[11px] font-mono text-[#94a3b8] overflow-x-auto max-h-64 leading-relaxed">
          {sqlSchemaScript}
        </pre>
      </div>

      {/* Local PowerShell Setup Command Instructions */}
      <div className="p-5 rounded-lg bg-[#0e131b] border border-[#1a2230] space-y-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#d4af37]" />
          <h3 className="text-sm font-semibold text-[#f8fafc]">
            Windows PowerShell Setup (Local Execution)
          </h3>
        </div>
        <p className="text-xs text-[#94a3b8]">
          To run VYOM locally in `C:\Users\SMART TECHNOLOGY\Desktop\vyom-risk-platform`:
        </p>
        <pre className="p-3 rounded bg-[#080a0e] border border-[#161f2c] text-[11px] font-mono text-[#cbd5e1] overflow-x-auto leading-relaxed">
{`# 1. Clone or navigate to local directory
cd "C:\\Users\\SMART TECHNOLOGY\\Desktop\\vyom-risk-platform"

# 2. Install dependencies
npm install

# 3. Configure environment variables in .env
Copy-Item .env.example .env

# 4. Start full-stack development server
npm run dev`}
        </pre>
      </div>
    </div>
  );
};
