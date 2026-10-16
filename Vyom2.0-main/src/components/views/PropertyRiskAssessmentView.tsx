import React, { FormEvent, useEffect, useState } from "react";
import {
  AssessmentHistoryItem,
  LocationRiskEvidence,
  PropertyRiskPricingResult,
  supabaseService,
} from "../../services/supabaseClient";
import { completeAssessment } from "../../utils/propertyRiskCompletion";

type LocationTier = "Tier1" | "Tier2" | "Tier3";

interface DistrictPreset {
  name: string;
  latitude: number;
  longitude: number;
}

const DISTRICT_PRESETS: DistrictPreset[] = [
  { name: "Chennai",        latitude: 13.08784, longitude: 80.27847 },
  { name: "Coimbatore",     latitude: 11.00555, longitude: 76.96612 },
  { name: "Madurai",        latitude:  9.91900, longitude: 78.11953 },
  { name: "Tiruchirappalli", latitude: 10.81550, longitude: 78.69651 },
  { name: "Salem",          latitude: 11.65376, longitude: 78.15538 },
  { name: "Erode",          latitude: 11.34280, longitude: 77.72741 },
  { name: "Dindigul",       latitude: 10.36896, longitude: 77.98036 },
  { name: "Karur",          latitude: 10.96041, longitude: 78.07756 },
  { name: "Tirunelveli",    latitude:  8.72742, longitude: 77.68380 },
  { name: "Thoothukudi",    latitude:  8.76735, longitude: 78.13425 },
];

const TIER_RATES: Record<LocationTier, number> = { Tier1: 2000, Tier2: 1600, Tier3: 1300 };

const formatINR = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return "Not available";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatScore = (value: number | null | undefined): string =>
  value === null || value === undefined || !Number.isFinite(value)
    ? "Unavailable"
    : `${value.toFixed(1)} / 100`;

const missingInputLabels: Record<string, string> = {
  earthquake_pga_or_active_fault_distance: "Earthquake score needs PGA and distance to an active fault line.",
  landslide_slope_lsi_or_24h_rainfall: "Landslide score needs slope angle, LSI, and 24-hour rainfall.",
  overall_score_requires_all_three_hazard_scores: "Overall score is withheld until all three hazard scores can be calculated.",
  property_or_ward_hazard_overlap_percentage: "Exact spatial overlap needs hazard-zone geometry and property or ward boundaries.",
  flood_percent_or_overlap: "Flood score needs a flood percentage or verified property-level flood overlap.",
  flood_dfsi_or_matching_district: "No matching district flood severity record was found for this coordinate.",
  earthquake_estimated_from_seismic_zone: "Earthquake score is estimated from the BIS IS 1893 seismic zone (no PGA / fault-distance data).",
};

const scoreStatusLabel = (status: string | undefined): string => {
  switch (status) {
    case "district_proxy_not_property_overlap":
      return "Estimate from district-level data (not property-level overlap)";
    case "calculated_from_property_flood_overlap":
      return "Calculated from provided property-level flood overlap";
    case "unavailable_missing_pga_or_fault_distance":
      return "Unavailable - PGA/fault-distance data missing";
    case "unavailable_missing_slope_lsi_or_rainfall":
      return "Unavailable - slope/LSI/rainfall data missing";
    case "unavailable_requires_all_three_hazard_scores":
      return "Unavailable - all three hazard scores are required";
    case "calculated_exact_user_formula":
      return "Calculated using your exact overall-score formula";
    case "estimated_weighted_average":
      return "Estimated - weighted average of flood, earthquake and landslide scores";
    case "estimated_regional_default":
      return "Estimated - regional default (no database record for this location)";
    default:
      if (status?.startsWith("estimated_from_seismic_zone_"))
        return `Estimated from IS 1893 seismic zone ${status.replace("estimated_from_seismic_zone_", "")}`;
      return status ? status.replaceAll("_", " ") : "Unavailable";
  }
};

export const PropertyRiskAssessmentView: React.FC = () => {
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [builtUpSqft, setBuiltUpSqft] = useState("1000");
  const [replacementValue, setReplacementValue] = useState("");
  const [locationTier, setLocationTier] = useState<LocationTier>("Tier2");
  const [busy, setBusy] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [savingHistory, setSavingHistory] = useState(false);
  const [error, setError] = useState("");
  const [historyNotice, setHistoryNotice] = useState("");
  const [evidenceError, setEvidenceError] = useState("");
  const [result, setResult] = useState<PropertyRiskPricingResult | null>(null);
  const [evidence, setEvidence] = useState<LocationRiskEvidence | null>(null);
  const [hazardInputs, setHazardInputs] = useState<any>(null);
  const [hazardWarning, setHazardWarning] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<AssessmentHistoryItem[]>([]);

  const handleDistrictChange = (districtName: string) => {
    setSelectedDistrict(districtName);
    if (!districtName) return;
    const preset = DISTRICT_PRESETS.find((d) => d.name === districtName);
    if (!preset) return;
    setLatitude(String(preset.latitude));
    setLongitude(String(preset.longitude));
    setAddress(`${preset.name}, Tamil Nadu, India`);
    // Apply shared editable demo defaults
    setBuiltUpSqft("1000");
    setLocationTier("Tier2");
    // Clear previous results so user sees a fresh form
    setResult(null);
    setEvidence(null);
    setError("");
    setEvidenceError("");
    setHazardWarning(null);
    setHazardInputs(null);
  };

  useEffect(() => {
    let cancelled = false;
    void supabaseService.getAssessmentHistory(5).then((response) => {
      if (!cancelled && !response.error) setHistoryItems(response.items);
    });
    return () => { cancelled = true; };
  }, []);

  const geocodeAddress = async () => {
    const query = address.trim();
    if (!query) { setError("Enter an address to find its coordinates."); return; }
    setError("");
    setGeocoding(true);
    try {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("countrycodes", "in");
      url.searchParams.set("limit", "1");
      url.searchParams.set("q", query);
      const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`Address search failed (HTTP ${response.status}).`);
      const matches = await response.json() as Array<{ lat: string; lon: string; display_name: string }>;
      if (!matches.length) throw new Error("No matching Indian address was found. Try a more specific address.");
      setLatitude(matches[0].lat);
      setLongitude(matches[0].lon);
      setAddress(matches[0].display_name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not geocode this address. You can enter coordinates manually.");
    } finally {
      setGeocoding(false);
    }
  };

  const runAssessment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setEvidenceError("");
    setHistoryNotice("");
    setResult(null);
    setEvidence(null);
    setHazardWarning(null);

    const lat = Number(latitude);
    const lng = Number(longitude);
    const area = Number(builtUpSqft);
    // Derive replacement value from Tier 2 rate (₹1600/sq ft) when left blank
    const value = replacementValue.trim() === "" ? area * TIER_RATES[locationTier] : Number(replacementValue);

    if (!latitude.trim() || !longitude.trim() || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError("Enter valid latitude and longitude coordinates.");
      return;
    }
    if (!Number.isFinite(area) || area <= 0) {
      setError("Built-up area must be greater than zero.");
      return;
    }
    if (replacementValue.trim() !== "" && (!Number.isFinite(value) || value <= 0)) {
      setError("Replacement value must be a positive number, or leave it blank to use the area-based estimate.");
      return;
    }

    setBusy(true);
    // Safety timeout: always reset loading state after 30 seconds
    const safetyTimer = setTimeout(() => {
      setBusy((current) => {
        if (current) console.warn("[Vyom] Safety timeout: resetting busy state after 30 s");
        return false;
      });
    }, 30000);
    console.log("[Vyom] Assessment started", { lat, lng, area, value, locationTier });

    try {
      // Step 1: Hazard Edge Function with AbortController (8 s hard timeout)
      console.log("[Vyom] Step 1: Fetching hazard inputs...");
      try {
        const abortCtrl = new AbortController();
        const abortTimer = setTimeout(() => {
          console.warn("[Vyom] Hazard fetch: aborting after 8 s timeout");
          abortCtrl.abort();
        }, 8000);
        const hazardResp = await supabaseService.fetchHazardInputsWithSignal(
          { latitude: lat, longitude: lng, force: true },
          abortCtrl.signal,
        );
        clearTimeout(abortTimer);
        if (hazardResp.error) {
          console.warn("[Vyom] Hazard fetch error:", hazardResp.error);
          setHazardWarning(`Hazard inputs warning: ${hazardResp.error}`);
        } else if (hazardResp.result) {
          console.log("[Vyom] Hazard inputs received:", hazardResp.result);
          setHazardInputs(hazardResp.result);
        }
      } catch (hazardErr: any) {
        const isAbort = hazardErr?.name === "AbortError";
        const msg = isAbort
          ? "Hazard inputs request timed out (8 s). Continuing with cached database inputs."
          : `Hazard inputs unavailable: ${hazardErr instanceof Error ? hazardErr.message : String(hazardErr)}`;
        console.warn("[Vyom] Hazard fetch failed:", msg);
        setHazardWarning(msg);
        // Do NOT rethrow - continue to RPC
      }

      // Step 2: Property risk & pricing RPC
      console.log("[Vyom] Step 2: Calling calculate_property_risk_and_pricing RPC...");
      let rpcResp: { result: PropertyRiskPricingResult | null; error?: string };
      try {
        rpcResp = await supabaseService.calculatePropertyRiskAndPricing({
          latitude: lat,
          longitude: lng,
          builtUpSqft: area,
          userPropertyVal: value,
          locationTier,
        });
      } catch (rpcErr: any) {
        console.error("[Vyom] RPC threw:", rpcErr);
        setError(`Assessment RPC failed: ${rpcErr instanceof Error ? rpcErr.message : String(rpcErr)}`);
        return;
      }

      console.log("[Vyom] RPC response:", rpcResp);

      if (rpcResp.error) {
        console.error("[Vyom] RPC error:", rpcResp.error);
        setError(`Assessment RPC failed: ${rpcResp.error}`);
        return;
      }
      if (!rpcResp.result) {
        console.error("[Vyom] RPC returned no result");
        setError("Supabase returned no assessment result. Check the database RPC and try again.");
        return;
      }
      setResult(completeAssessment(rpcResp.result, { latitude: lat, longitude: lng }));

      // Step 3: Location risk evidence (non-fatal)
      console.log("[Vyom] Step 3: Fetching location risk evidence...");
      try {
        const evidenceResponse = await supabaseService.assessLocationRisk({ latitude: lat, longitude: lng, radiusKm: 50 });
        console.log("[Vyom] Evidence response:", evidenceResponse);
        if (evidenceResponse.result) setEvidence(evidenceResponse.result);
        if (evidenceResponse.error) { console.warn("[Vyom] Evidence error:", evidenceResponse.error); setEvidenceError(evidenceResponse.error); }
      } catch (evErr: any) {
        console.warn("[Vyom] Evidence fetch threw:", evErr);
        setEvidenceError(evErr instanceof Error ? evErr.message : "Evidence lookup failed.");
      }

      console.log("[Vyom] Assessment complete.");
    } catch (e) {
      console.error("[Vyom] Unexpected outer error:", e);
      setError(e instanceof Error ? e.message : "Assessment failed. Check the Supabase connection and try again.");
    } finally {
      clearTimeout(safetyTimer);
      console.log("[Vyom] Finally: resetting busy state.");
      setBusy(false);
    }
  };

  const saveAssessment = async () => {
    if (!result) return;
    setSavingHistory(true);
    setHistoryNotice("");
    const lat = Number(latitude);
    const lng = Number(longitude);
    try {
      const response = await supabaseService.saveAssessmentHistory({
        label: address.trim() || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        latitude: lat,
        longitude: lng,
        propertyInputs: {
          address: address.trim() || null,
          builtUpSqft: Number(builtUpSqft),
          replacementValue: replacementValue.trim() === "" ? null : Number(replacementValue),
          locationTier,
        },
        result,
      });
      if (!response.success) {
        setHistoryNotice(response.error || "Could not save this assessment.");
      } else {
        setHistoryNotice("Assessment saved to your account history.");
        const refreshed = await supabaseService.getAssessmentHistory(5);
        if (!refreshed.error) setHistoryItems(refreshed.items);
      }
    } catch (e) {
      setHistoryNotice(e instanceof Error ? e.message : "Could not save this assessment.");
    } finally {
      setSavingHistory(false);
    }
  };

  const flood = result?.hazard_scores.flood;
  const earthquake = result?.hazard_scores.earthquake;
  const landslide = result?.hazard_scores.landslide;
  const overall = result?.hazard_scores.overall;
  const pricing = result?.pricing;

  return (
    <section className="rounded-xl border border-[#263348] bg-[#0b111a] p-5 space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-[#d4af37]">Supabase · PostGIS · Formula engine</div>
          <h3 className="mt-1 text-lg font-semibold text-[#f8fafc]">Property Risk &amp; Insurance Assessment</h3>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[#94a3b8]">
            Uses live database records where available. Where PGA, active-fault, slope, LSI or rainfall data is missing,
            the score is estimated from regional data and clearly labelled as an estimate. Exact property-boundary overlap stays unavailable until verified polygons are added.
          </p>
        </div>
        <span className="w-fit rounded border border-[#3a465a] px-2 py-1 text-[10px] font-mono text-[#cbd5e1]">PROTOTYPE / NOT AN UNDERWRITING DECISION</span>
      </div>

      <form onSubmit={runAssessment} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        <label className="md:col-span-2 xl:col-span-5 space-y-1 text-xs text-[#94a3b8]">
          <span>District preset (demo)</span>
          <select value={selectedDistrict} onChange={(e) => handleDistrictChange(e.target.value)} className="w-full rounded border border-[#29364a] bg-[#070b11] px-3 py-2 text-sm text-[#f8fafc] outline-none focus:border-[#d4af37]">
            <option value="">— Select a district to populate defaults —</option>
            {DISTRICT_PRESETS.map((d) => (
              <option key={d.name} value={d.name}>{d.name} ({d.latitude.toFixed(5)}, {d.longitude.toFixed(5)})</option>
            ))}
          </select>
        </label>
        <div className="md:col-span-2 xl:col-span-5 flex flex-col sm:flex-row gap-2">
          <label className="flex-1 space-y-1 text-xs text-[#94a3b8]">
            <span>Search address (India, optional)</span>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, area, city, Tamil Nadu" className="w-full rounded border border-[#29364a] bg-[#070b11] px-3 py-2 text-sm text-[#f8fafc] outline-none focus:border-[#d4af37]" />
          </label>
          <button type="button" onClick={geocodeAddress} disabled={geocoding} className="self-end rounded border border-[#29364a] bg-[#121822] px-4 py-2.5 text-xs font-medium text-[#cbd5e1] hover:border-[#d4af37] disabled:opacity-60">
            {geocoding ? "Searching..." : "Find coordinates"}
          </button>
        </div>
        <label className="space-y-1 text-xs text-[#94a3b8]">
          <span>Latitude *</span>
          <input required type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="e.g. 13.0827" className="w-full rounded border border-[#29364a] bg-[#070b11] px-3 py-2 text-sm text-[#f8fafc] outline-none focus:border-[#d4af37]" />
        </label>
        <label className="space-y-1 text-xs text-[#94a3b8]">
          <span>Longitude *</span>
          <input required type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="e.g. 80.2707" className="w-full rounded border border-[#29364a] bg-[#070b11] px-3 py-2 text-sm text-[#f8fafc] outline-none focus:border-[#d4af37]" />
        </label>
        <label className="space-y-1 text-xs text-[#94a3b8]">
          <span>Built-up area (sq ft)</span>
          <input type="number" min="1" step="any" value={builtUpSqft} onChange={(e) => setBuiltUpSqft(e.target.value)} className="w-full rounded border border-[#29364a] bg-[#070b11] px-3 py-2 text-sm text-[#f8fafc] outline-none focus:border-[#d4af37]" />
        </label>
        <label className="space-y-1 text-xs text-[#94a3b8]">
          <span>Location tier</span>
          <select value={locationTier} onChange={(e) => setLocationTier(e.target.value as LocationTier)} className="w-full rounded border border-[#29364a] bg-[#070b11] px-3 py-2 text-sm text-[#f8fafc] outline-none focus:border-[#d4af37]">
            <option value="Tier1">Tier 1 - Rs 2,000/sq ft</option>
            <option value="Tier2">Tier 2 - Rs 1,600/sq ft</option>
            <option value="Tier3">Tier 3 - Rs 1,300/sq ft</option>
          </select>
        </label>
        <label className="space-y-1 text-xs text-[#94a3b8]">
          <span>Replacement value (Rs, optional)</span>
          <input type="number" min="1" step="any" value={replacementValue} onChange={(e) => setReplacementValue(e.target.value)} placeholder={`Auto: ${Number(builtUpSqft || 0) * TIER_RATES[locationTier]} (${TIER_RATES[locationTier]}/sq ft)`} className="w-full rounded border border-[#29364a] bg-[#070b11] px-3 py-2 text-sm text-[#f8fafc] outline-none focus:border-[#d4af37]" />
        </label>
        <div className="md:col-span-2 xl:col-span-5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button type="submit" disabled={busy} className="rounded bg-[#d4af37] px-4 py-2.5 text-xs font-semibold text-[#111827] transition hover:bg-[#e7c756] disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? "Calculating..." : "Calculate property assessment"}
          </button>
          <p className="text-[11px] text-[#64748b]">The form does not accept manually invented overlap values; exact overlap remains unavailable until verified polygons are added.</p>
        </div>
        <p className="md:col-span-2 xl:col-span-5 text-[10px] text-[#64748b]">Address lookup by OpenStreetMap contributors. One search per click; verify the returned pin before using it.</p>
      </form>

      {error && <div role="alert" className="rounded border border-rose-800/70 bg-rose-950/30 p-3 text-xs text-rose-300">{error}</div>}
      {hazardWarning && <div role="alert" className="rounded border border-amber-800/70 bg-amber-950/30 p-3 text-xs text-amber-300 mt-2">{hazardWarning}</div>}

      {result && (
        <div className="space-y-4 border-t border-[#1b2737] pt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Overall risk score" value={formatScore(overall?.score)} detail={scoreStatusLabel(overall?.status)} />
            <Metric label="Risk tier" value={pricing?.risk_tier || "Unavailable"} detail={pricing?.tier_basis?.replaceAll("_", " ") || "Requires score or verified overlap"} />
            <Metric label="Replacement value" value={formatINR(result.property.replacement_value_inr)} detail={result.property.value_source === "user_entered" ? "User-entered amount" : `Area-based estimate - ${formatINR(result.property.rate_per_sqft_inr)}/sq ft`} />
            <Metric label="Final annual premium" value={formatINR(pricing?.final_annual_premium_inr)} detail={pricing?.risk_multiplier == null ? "Multiplier unavailable until a supported tier can be assigned" : `Base x ${pricing.risk_multiplier.toFixed(2)} risk multiplier`} />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <HazardMetric title="Flood" score={flood?.score ?? null} status={scoreStatusLabel(flood?.status)} />
            <HazardMetric title="Earthquake" score={earthquake?.score ?? null} status={scoreStatusLabel(earthquake?.status)} />
            <HazardMetric title="Landslide" score={landslide?.score ?? null} status={scoreStatusLabel(landslide?.status)} />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Metric label="Base premium (annual)" value={formatINR(pricing?.base_premium_inr)} detail={`Base rate ${((pricing?.base_rate ?? 0.0015) * 100).toFixed(2)}%`} />
            <Metric label="Expected loss estimate" value={formatINR(pricing?.expected_loss_inr)} detail={pricing?.expected_loss_status?.startsWith("estimated") ? "Estimate: Replacement value x EF x (overall score % / 100) squared" : "Replacement value x EF x (overlap % / 100) squared"} />
            <Metric label="Spatial affected-area overlap" value={result.spatial_overlap.hazard_overlap_percent == null ? "Unavailable" : `${result.spatial_overlap.hazard_overlap_percent.toFixed(2)}%`} detail={(result.spatial_overlap.status || "unavailable").replaceAll("_", " ")} />
          </div>

          {flood?.status === "district_proxy_not_property_overlap" && (
            <div className="rounded border border-amber-700/60 bg-amber-950/20 p-3 text-xs leading-relaxed text-amber-200">
              Flood score uses the district aggregate flooded-area percentage as a proxy. It is not the percentage of this property boundary intersecting a flood hazard zone.
            </div>
          )}

          {(result.missing_inputs?.length ?? 0) > 0 && (
            <div className="rounded border border-[#29364a] bg-[#080c12] p-3">
              <h4 className="text-xs font-semibold text-[#f8fafc]">Data gaps affecting this assessment</h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[#94a3b8]">
                {result.missing_inputs.map((key) => <li key={key}>{missingInputLabels[key] || key.replaceAll("_", " ")}</li>)}
              </ul>
            </div>
          )}

          {evidence && (
            <div className="rounded border border-[#243145] bg-[#080c12] p-3 space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h4 className="text-xs font-semibold text-[#f8fafc]">Spatial and historical evidence</h4>
                <a className="text-[10px] text-[#dfba4f] underline" href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=13/${latitude}/${longitude}`} target="_blank" rel="noreferrer">View location on OpenStreetMap</a>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                <EvidenceCount label="Flood polygons matched" value={evidence.counts?.flood} />
                <EvidenceCount label="Landslide district matches" value={evidence.counts?.landslide} />
                <EvidenceCount label="Historical landslide points / 50 km" value={evidence.counts?.landslide_events} />
                <EvidenceCount label="Earthquake events / 50 km" value={evidence.counts?.earthquake} />
              </div>
              {(evidence.landslide_events || []).length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="text-[10px] uppercase tracking-wide text-[#64748b]">Nearest catalogue reports</div>
                  {evidence.landslide_events.slice(0, 3).map((event) => (
                    <div key={event.catalog_event_id} className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between border-t border-[#1a2230] pt-2 text-[11px]">
                      <span className="text-[#cbd5e1]">{event.event_title} <span className="text-[#64748b]">({event.event_date || "date unknown"})</span></span>
                      <span className="text-[#dfba4f]">{Number(event.distance_km).toFixed(2)} km <a className="underline" href={event.source_url ?? undefined} target="_blank" rel="noreferrer">source</a></span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {evidenceError && <div className="text-[10px] text-amber-300">Historical evidence lookup unavailable: {evidenceError}</div>}

          {hazardInputs && (
            <div className="rounded border border-[#29364a] bg-[#080c12] p-3">
              <h4 className="text-xs font-semibold text-[#f8fafc]">Hazard inputs retrieved</h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[#94a3b8]">
                <li>Slope angle (deg): {hazardInputs.slope_angle_deg ?? "Unavailable"}</li>
                <li>LSI: {hazardInputs.lsi ?? "Unavailable"}</li>
                <li>24-hour rainfall (mm): {hazardInputs.rainfall_24h_mm ?? "Unavailable"}</li>
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button type="button" onClick={saveAssessment} disabled={savingHistory} className="rounded border border-[#d4af37]/60 bg-[#d4af37]/10 px-3 py-2 text-xs font-medium text-[#dfba4f] hover:bg-[#d4af37]/20 disabled:opacity-60">{savingHistory ? "Saving..." : "Save assessment to history"}</button>
            {historyNotice && <span role="status" className="text-[11px] text-[#cbd5e1]">{historyNotice}</span>}
          </div>
          <p className="text-[10px] leading-relaxed text-[#64748b]">Historical earthquake-event counts and landslide reports are contextual evidence only; neither is substituted for PGA, fault distance, slope, LSI, or rainfall. Results require validation and calibration before commercial underwriting use.</p>
        </div>
      )}

      {historyItems.length > 0 && (
        <div className="rounded border border-[#243145] bg-[#080c12] p-3 space-y-2">
          <h4 className="text-xs font-semibold text-[#f8fafc]">Your recent saved assessments</h4>
          {historyItems.map((item) => {
            const savedResult = item.assessment_result;
            const score = savedResult?.hazard_scores?.overall?.score;
            const tier = savedResult?.pricing?.risk_tier;
            return (
              <div key={item.id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-t border-[#1a2230] pt-2 text-[11px]">
                <div>
                  <div className="text-[#cbd5e1]">{item.label || `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`}</div>
                  <div className="text-[#64748b]">{new Date(item.created_at).toLocaleString("en-IN")}</div>
                </div>
                <div className="text-[#dfba4f]">{score == null ? "Overall score unavailable" : `${Number(score).toFixed(1)} / 100`} - {tier || "Tier unavailable"}</div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

const Metric: React.FC<{ label: string; value: string; detail: string }> = ({ label, value, detail }) => (
  <div className="rounded-lg border border-[#243145] bg-[#080c12] p-3">
    <div className="text-[10px] uppercase tracking-wide text-[#64748b]">{label}</div>
    <div className="mt-1 text-lg font-semibold text-[#f8fafc]">{value}</div>
    <div className="mt-1 text-[10px] leading-relaxed text-[#94a3b8]">{detail}</div>
  </div>
);

const EvidenceCount: React.FC<{ label: string; value: number | undefined }> = ({ label, value }) => (
  <div className="rounded border border-[#1b2737] bg-[#0b111a] p-2">
    <div className="text-base font-semibold text-[#f8fafc]">{value ?? "-"}</div>
    <div className="mt-1 text-[10px] leading-relaxed text-[#64748b]">{label}</div>
  </div>
);

const HazardMetric: React.FC<{ title: string; score: number | null; status: string }> = ({ title, score, status }) => (
  <div className="rounded-lg border border-[#243145] bg-[#080c12] p-3">
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-medium text-[#f8fafc]">{title}</span>
      <span className="font-mono text-xs text-[#dfba4f]">{formatScore(score)}</span>
    </div>
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#1b2533]">
      <div className="h-full rounded-full bg-[#d4af37]" style={{ width: `${score == null ? 0 : Math.max(0, Math.min(100, score))}%` }} />
    </div>
    <div className="mt-2 text-[10px] leading-relaxed text-[#94a3b8]">{status}</div>
  </div>
);
