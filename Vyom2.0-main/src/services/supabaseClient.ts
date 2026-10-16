/**
 * VYOM Supabase Client Service
 * Provides secure client-side integration using Supabase Anon/Public Key.
 * Supports runtime credential configuration via Settings panel or environment variables.
 */

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { AssetRecord, UserSession } from '../types/risk';
import { INITIAL_DEMO_ASSETS } from '../data/tamilNaduGeodata';

const LOCAL_STORAGE_KEY_URL = 'vyom_supabase_url';
const LOCAL_STORAGE_KEY_ANON = 'vyom_supabase_anon_key';
const LOCAL_STORAGE_KEY_DEMO_USER = 'vyom_demo_user';
const LOCAL_STORAGE_KEY_ASSETS = 'vyom_local_assets';

export interface SupabaseConfigState {
  url: string;
  anonKey: string;
  isConfigured: boolean;
  isConnected: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  errorMessage?: string;
  source: 'env' | 'user_settings' | 'none';
}

export interface PropertyRiskPricingInput {
  latitude: number;
  longitude: number;
  builtUpSqft?: number;
  userPropertyVal?: number | null;
  locationTier?: 'Tier1' | 'Tier2' | 'Tier3';
}

export interface PropertyRiskPricingResult {
  property: { built_up_area_sqft: number; location_tier: string; replacement_value_inr: number; value_source: string; rate_per_sqft_inr: number | null };
  hazard_scores: {
    flood: { score: number | null; status: string; district: string | null; dfsi: number | null; district_flood_percent_proxy: number | null };
    earthquake: { score: number | null; status: string };
    landslide: { score: number | null; status: string; district_evidence?: Record<string, unknown> };
    overall: { score: number | null; status: string };
  };
  spatial_overlap: { hazard_overlap_percent: number | null; flood_overlap_percent: number | null; status: string; note: string };
  pricing: { base_rate: number; base_premium_inr: number; risk_tier: string | null; tier_basis: string; risk_multiplier: number | null; final_annual_premium_inr: number | null; exposure_factor: number; expected_loss_inr: number | null; expected_loss_status: string };
  evidence?: { historical_earthquake_events_within_radius: number; earthquake_radius_km: number };
  missing_inputs: string[];
  method_note: string;
}

export interface LocationRiskInput {
  latitude: number;
  longitude: number;
  radiusKm?: number;
}

export interface LocationRiskEvidence {
  latitude: number;
  longitude: number;
  earthquake_radius_km: number;
  counts: { flood: number; landslide: number; landslide_events: number; earthquake: number };
  landslide_events: Array<{
    catalog_event_id: number;
    event_date: string | null;
    event_title: string;
    distance_km: number;
    source_url: string | null;
  }>;
  method_note: string;
}

export interface SaveAssessmentHistoryInput {
  label: string;
  latitude: number;
  longitude: number;
  propertyInputs: Record<string, unknown>;
  result: PropertyRiskPricingResult;
}

export interface AssessmentHistoryItem {
  id: string;
  created_at: string;
  label: string | null;
  latitude: number;
  longitude: number;
  property_inputs: Record<string, unknown>;
  assessment_result: PropertyRiskPricingResult;
  data_quality: string;
}

class SupabaseService {
  private client: SupabaseClient | null = null;
  private configState: SupabaseConfigState = {
    url: '',
    anonKey: '',
    isConfigured: false,
    isConnected: false,
    connectionStatus: 'disconnected',
    source: 'none',
  };

  constructor() {
    this.initFromStorageOrEnv();
  }

  private initFromStorageOrEnv() {
    // 1. Check runtime localStorage first
    let url = '';
    let anonKey = '';
    let source: 'env' | 'user_settings' | 'none' = 'none';

    try {
      url = localStorage.getItem(LOCAL_STORAGE_KEY_URL) || '';
      anonKey = localStorage.getItem(LOCAL_STORAGE_KEY_ANON) || '';
      if (url && anonKey) {
        source = 'user_settings';
      }
    } catch {
      // ignore SSR or storage exceptions
    }

    // 2. Check import.meta.env fallback
    if (!url || !anonKey) {
      const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
      const envAnon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
      if (envUrl && envAnon && envUrl !== 'https://your-project.supabase.co') {
        url = envUrl;
        anonKey = envAnon;
        source = 'env';
      }
    }

    if (url && anonKey && url.startsWith('http')) {
      try {
        this.client = createClient(url, anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        });
        this.configState = {
          url,
          anonKey: anonKey.substring(0, 10) + '...' + anonKey.substring(anonKey.length - 6),
          isConfigured: true,
          isConnected: true,
          connectionStatus: 'connected',
          source,
        };
      } catch (err: any) {
        this.client = null;
        this.configState = {
          url,
          anonKey: '',
          isConfigured: false,
          isConnected: false,
          connectionStatus: 'error',
          errorMessage: err.message || 'Failed to initialize Supabase client',
          source,
        };
      }
    } else {
      this.client = null;
      this.configState = {
        url: '',
        anonKey: '',
        isConfigured: false,
        isConnected: false,
        connectionStatus: 'disconnected',
        source: 'none',
      };
    }
  }

  public getConfigState(): SupabaseConfigState {
    return { ...this.configState };
  }

  public async setCredentials(url: string, anonKey: string): Promise<{ success: boolean; error?: string }> {
    const trimmedUrl = url.trim();
    const trimmedKey = anonKey.trim();

    if (!trimmedUrl || !trimmedKey) {
      return { success: false, error: 'Both Supabase URL and Public Anon Key are required.' };
    }

    if (!trimmedUrl.startsWith('https://') && !trimmedUrl.startsWith('http://')) {
      return { success: false, error: 'Supabase URL must start with https://' };
    }

    try {
      const testClient = createClient(trimmedUrl, trimmedKey);
      // Test basic ping
      const { error } = await testClient.auth.getSession();
      if (error && error.message.includes('Invalid API key')) {
        return { success: false, error: 'Invalid Supabase API key provided.' };
      }

      // Persist in localStorage
      localStorage.setItem(LOCAL_STORAGE_KEY_URL, trimmedUrl);
      localStorage.setItem(LOCAL_STORAGE_KEY_ANON, trimmedKey);

      this.client = testClient;
      this.configState = {
        url: trimmedUrl,
        anonKey: trimmedKey.substring(0, 8) + '...' + trimmedKey.substring(trimmedKey.length - 4),
        isConfigured: true,
        isConnected: true,
        connectionStatus: 'connected',
        source: 'user_settings',
      };

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to connect to Supabase.' };
    }
  }

  public clearCredentials(): void {
    localStorage.removeItem(LOCAL_STORAGE_KEY_URL);
    localStorage.removeItem(LOCAL_STORAGE_KEY_ANON);
    this.client = null;
    this.configState = {
      url: '',
      anonKey: '',
      isConfigured: false,
      isConnected: false,
      connectionStatus: 'disconnected',
      source: 'none',
    };
  }

  // --- Real Supabase Auth Methods ---

  public async signUp(email: string, password: string, fullName: string) {
    if (!this.client) {
      // In Demo mode, store demo session locally
      const demoUser: UserSession = {
        id: 'usr-demo-' + Math.random().toString(36).substring(2, 9),
        email,
        fullName: fullName || email.split('@')[0],
        role: 'Catastrophe Risk Underwriter',
        organization: 'Tamil Nadu Cat Risk Intelligence',
      };
      localStorage.setItem(LOCAL_STORAGE_KEY_DEMO_USER, JSON.stringify(demoUser));
      return { user: demoUser, error: null, isDemo: true };
    }

    try {
      const { data, error } = await this.client.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            organization: 'Catastrophe Intelligence Underwriter',
          },
        },
      });

      if (error) {
        return { user: null, error: error.message, isDemo: false };
      }

      const user = data.user
        ? {
            id: data.user.id,
            email: data.user.email || email,
            fullName: data.user.user_metadata?.full_name || fullName || 'Underwriter',
            role: 'Catastrophe Risk Underwriter' as const,
            organization: 'VYOM Risk Network',
          }
        : null;

      return { user, error: null, isDemo: false };
    } catch (err: any) {
      return { user: null, error: err.message || 'Signup failed', isDemo: false };
    }
  }

  public async signIn(email: string, password: string) {
    if (!this.client) {
      // Fallback demo authentication
      const demoUser: UserSession = {
        id: 'usr-demo-session',
        email,
        fullName: email.split('@')[0].toUpperCase(),
        role: 'Catastrophe Risk Underwriter',
        organization: 'VYOM Catastrophe Intelligence',
      };
      localStorage.setItem(LOCAL_STORAGE_KEY_DEMO_USER, JSON.stringify(demoUser));
      return { user: demoUser, error: null, isDemo: true };
    }

    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { user: null, error: error.message, isDemo: false };
      }

      const user: UserSession = {
        id: data.user.id,
        email: data.user.email || email,
        fullName: data.user.user_metadata?.full_name || email.split('@')[0],
        role: 'Catastrophe Risk Underwriter',
        organization: data.user.user_metadata?.organization || 'VYOM Risk Network',
        token: data.session?.access_token,
      };

      return { user, error: null, isDemo: false };
    } catch (err: any) {
      return { user: null, error: err.message || 'Sign in error', isDemo: false };
    }
  }

  public async signOut() {
    if (this.client) {
      try {
        await this.client.auth.signOut();
      } catch (err) {
        console.error('Supabase sign out error', err);
      }
    }
    localStorage.removeItem(LOCAL_STORAGE_KEY_DEMO_USER);
  }

  public async getCurrentSession(): Promise<UserSession | null> {
    if (this.client) {
      try {
        const { data } = await this.client.auth.getSession();
        if (data.session?.user) {
          return {
            id: data.session.user.id,
            email: data.session.user.email || '',
            fullName: data.session.user.user_metadata?.full_name || 'Risk Analyst',
            role: 'Catastrophe Risk Underwriter',
            organization: 'VYOM Network',
            token: data.session.access_token,
          };
        }
      } catch {
        // Fall back to demo session
      }
    }

    const savedDemo = localStorage.getItem(LOCAL_STORAGE_KEY_DEMO_USER);
    if (savedDemo) {
      try {
        return JSON.parse(savedDemo);
      } catch {
        return null;
      }
    }
    return null;
  }

  public async resetPassword(email: string): Promise<{ success: boolean; message: string }> {
    if (!this.client) {
      return {
        success: true,
        message: 'Demo mode: In production with connected Supabase, a recovery reset email would be sent to ' + email,
      };
    }

    try {
      const { error } = await this.client.auth.resetPasswordForEmail(email);
      if (error) {
        return { success: false, message: error.message };
      }
      return { success: true, message: `Password reset instructions dispatched to ${email}` };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to dispatch password reset' };
    }
  }

  // --- Formula-based property assessment ---
  public async calculatePropertyRiskAndPricing(
    input: PropertyRiskPricingInput,
  ): Promise<{ result: PropertyRiskPricingResult | null; error?: string }> {
    if (!this.client) {
      return { result: null, error: 'Supabase is not configured. Open Settings and connect the project first.' };
    }
    try {
      const { data, error } = await this.client.rpc('calculate_property_risk_and_pricing', {
        p_lat: input.latitude,
        p_lon: input.longitude,
        p_built_sqft: input.builtUpSqft ?? 1000,
        p_user_property_val: input.userPropertyVal ?? null,
        p_location_tier: input.locationTier ?? 'Tier2',
        // Do not fabricate spatial overlap or missing hazard measurements.
        p_hazard_overlap_pct: null,
        p_flood_overlap_pct: null,
        p_pga: null,
        p_fault_distance_km: null,
        p_slope_angle_deg: null,
        p_lsi: null,
        p_rainfall_24h_mm: null,
        p_exposure_factor: 1.0,
        p_base_rate: 0.0015,
        p_earthquake_radius_km: 50,
      });
      if (error) return { result: null, error: error.message };
      return { result: (data ?? null) as PropertyRiskPricingResult | null };
    } catch (err) {
      return { result: null, error: err instanceof Error ? err.message : 'Could not run the Supabase property assessment.' };
    }
  }

  public async assessLocationRisk(
    input: LocationRiskInput,
  ): Promise<{ result: LocationRiskEvidence | null; error?: string }> {
    if (!this.client) return { result: null, error: 'Supabase is not configured.' };
    try {
      const { data, error } = await this.client.rpc('assess_location_risk', {
        p_lat: input.latitude,
        p_lon: input.longitude,
        p_earthquake_radius_km: input.radiusKm ?? 50,
      });
      if (error) return { result: null, error: error.message };
      return { result: (data ?? null) as LocationRiskEvidence | null };
    } catch (err) {
      return { result: null, error: err instanceof Error ? err.message : 'Could not load nearby hazard evidence.' };
    }
  }

  public async fetchHazardInputs(input: { latitude: number; longitude: number; force: boolean }): Promise<{ result: any; error?: string }> {
    if (!this.client) return { result: null, error: 'Supabase is not configured.' };
    try {
      const { data, error } = await this.client.functions.invoke('vyom-hazard-inputs', {
        body: JSON.stringify({ latitude: input.latitude, longitude: input.longitude, force: input.force }),
        method: 'POST',
      });
      if (error) return { result: null, error: error.message };
      return { result: data };
    } catch (err) {
      return { result: null, error: err instanceof Error ? err.message : 'Failed to invoke hazard inputs function.' };
    }
  }

  /**
   * Same as fetchHazardInputs but accepts an AbortSignal so the caller can
   * impose a hard network-level timeout via AbortController.
   */
  public async fetchHazardInputsWithSignal(
    input: { latitude: number; longitude: number; force: boolean },
    signal: AbortSignal,
  ): Promise<{ result: any; error?: string }> {
    if (!this.client) return { result: null, error: 'Supabase is not configured.' };

    const supabaseUrl = (this.client as any).supabaseUrl as string | undefined;
    const supabaseKey = (this.client as any).supabaseKey as string | undefined;
    if (!supabaseUrl || !supabaseKey) {
      return { result: null, error: 'Supabase URL/key unavailable for direct fetch.' };
    }

    const edgeFnUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/vyom-hazard-inputs`;
    try {
      const resp = await fetch(edgeFnUrl, {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ latitude: input.latitude, longitude: input.longitude, force: input.force }),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => `HTTP ${resp.status}`);
        return { result: null, error: text };
      }
      const data = await resp.json();
      return { result: data };
    } catch (err: any) {
      if (err?.name === 'AbortError') throw err; // re-throw so caller can detect abort
      return { result: null, error: err instanceof Error ? err.message : 'Failed to invoke hazard inputs function.' };
    }
  }
  public async getAssessmentHistory(
    limit = 10,
  ): Promise<{ items: AssessmentHistoryItem[]; error?: string }> {
    if (!this.client) return { items: [], error: 'Supabase is not configured.' };
    try {
      const { data: authData, error: authError } = await this.client.auth.getUser();
      if (authError) return { items: [], error: authError.message };
      if (!authData.user) return { items: [], error: 'Sign in with a Supabase account to view saved assessments.' };

      const safeLimit = Math.min(50, Math.max(1, Math.floor(limit)));
      const { data, error } = await this.client
        .from('risk_assessment_history')
        .select('id, created_at, label, latitude, longitude, property_inputs, assessment_result, data_quality')
        .order('created_at', { ascending: false })
        .limit(safeLimit);
      if (error) return { items: [], error: error.message };
      return { items: (data ?? []) as unknown as AssessmentHistoryItem[] };
    } catch (err) {
      return { items: [], error: err instanceof Error ? err.message : 'Could not load assessment history.' };
    }
  }

  public async saveAssessmentHistory(
    input: SaveAssessmentHistoryInput,
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.client) return { success: false, error: 'Supabase is not configured.' };
    try {
      const { data: authData, error: authError } = await this.client.auth.getUser();
      if (authError) return { success: false, error: authError.message };
      if (!authData.user) return { success: false, error: 'Sign in with Supabase to save private assessment history.' };

      const { error } = await this.client.from('risk_assessment_history').insert({
        user_id: authData.user.id,
        label: input.label,
        latitude: input.latitude,
        longitude: input.longitude,
        property_inputs: input.propertyInputs,
        assessment_result: input.result,
        data_quality: input.result.missing_inputs.length ? 'partial' : 'complete',
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Could not save assessment history.' };
    }
  }

  // --- Asset Storage Operations (With Fallback) ---

  public async getAssets(): Promise<{ assets: AssetRecord[]; isFromSupabase: boolean; error?: string }> {
    if (this.client) {
      try {
        const { data, error } = await this.client
          .from('assets')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const mapped: AssetRecord[] = data.map((item: any) => ({
            id: item.id || `AST-${Math.random().toString(36).substring(2, 6)}`,
            name: item.name,
            type: item.type || 'Commercial',
            zone: item.zone || 'chennai',
            lat: Number(item.lat),
            lng: Number(item.lng),
            insuredValueInr: Number(item.insured_value_inr),
            constructionCategory: item.construction_category || 'TN-RCC-2024',
            yearBuilt: Number(item.year_built) || 2020,
            plinthHeightMeters: Number(item.plinth_height_meters) || 1.0,
            deductibleInr: Number(item.deductible_inr) || 0,
            limitInr: Number(item.limit_inr) || Number(item.insured_value_inr),
            isDemonstrationData: false,
            createdAt: item.created_at || new Date().toISOString(),
          }));
          return { assets: mapped, isFromSupabase: true };
        }
      } catch {
        // Fall back to local storage
      }
    }

    // Local / Demo Assets fallback
    try {
      const local = localStorage.getItem(LOCAL_STORAGE_KEY_ASSETS);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return { assets: parsed, isFromSupabase: false };
        }
      }
    } catch {
      // ignore
    }

    // Default demonstration fixture
    return { assets: INITIAL_DEMO_ASSETS, isFromSupabase: false };
  }

  public async saveAsset(asset: AssetRecord): Promise<{ success: boolean; error?: string }> {
    if (this.client) {
      try {
        const { error } = await this.client.from('assets').upsert({
          id: asset.id,
          name: asset.name,
          type: asset.type,
          zone: asset.zone,
          lat: asset.lat,
          lng: asset.lng,
          insured_value_inr: asset.insuredValueInr,
          construction_category: asset.constructionCategory,
          year_built: asset.yearBuilt,
          plinth_height_meters: asset.plinthHeightMeters,
          deductible_inr: asset.deductibleInr,
          limit_inr: asset.limitInr,
          created_at: asset.createdAt,
        });

        if (!error) {
          return { success: true };
        }
      } catch (err: any) {
        console.warn('Could not write to Supabase assets table, saving to local store:', err.message);
      }
    }

    // Local save
    try {
      const currentRes = await this.getAssets();
      const updated = [asset, ...currentRes.assets.filter((a) => a.id !== asset.id)];
      localStorage.setItem(LOCAL_STORAGE_KEY_ASSETS, JSON.stringify(updated));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async deleteAsset(assetId: string): Promise<boolean> {
    if (this.client) {
      try {
        await this.client.from('assets').delete().eq('id', assetId);
      } catch {
        // continue to local
      }
    }

    try {
      const currentRes = await this.getAssets();
      const updated = currentRes.assets.filter((a) => a.id !== assetId);
      localStorage.setItem(LOCAL_STORAGE_KEY_ASSETS, JSON.stringify(updated));
      return true;
    } catch {
      return false;
    }
  }
}

export const supabaseService = new SupabaseService();
