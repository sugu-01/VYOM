/**
 * Completes a property assessment when the Supabase RPC returns null hazard scores.
 *
 * Earthquake: estimated from the BIS IS 1893 seismic zone factor (Tamil Nadu is mostly Zone II,
 * with Zone III in the north-east coastal belt, the Coimbatore/Nilgiris region and the far south).
 * Overall score, tier, premium and expected loss are then derived from the three hazard scores.
 *
 * Everything filled in here is flagged with an "estimated_*" status so the UI can label it.
 * All tunable numbers live in CONFIG so they can be aligned with the official formula.
 */
import type { PropertyRiskPricingResult } from "../services/supabaseClient";

export const CONFIG = {
  // IS 1893 zone factor Z; score = Z / Z_max * 100
  zoneFactor: { II: 0.1, III: 0.16, IV: 0.24, V: 0.36 } as Record<string, number>,
  zoneMaxFactor: 0.36,
  // Overall = weighted average of the three hazard scores
  weights: { flood: 0.4, earthquake: 0.3, landslide: 0.3 },
  // Regional fallbacks used only if the database returns nothing for flood / landslide
  fallbackFlood: 20,
  fallbackLandslide: 10,
  // Tier cut-offs on the overall score and the premium multiplier for each tier
  tiers: [
    { max: 25, name: "Low", multiplier: 0.9 },
    { max: 50, name: "Moderate", multiplier: 1.0 },
    { max: 75, name: "High", multiplier: 1.35 },
    { max: Infinity, name: "Extreme", multiplier: 1.8 },
  ],
};

export type SeismicZone = "II" | "III" | "IV" | "V";

/** Coarse IS 1893 zone lookup for Tamil Nadu coordinates. */
export function seismicZoneFor(lat: number, lng: number): SeismicZone {
  // North-east coastal / Chennai region and northern interior (Chennai, Kancheepuram, Vellore belt)
  if (lat >= 12.2 && lng >= 78.8 && lat <= 13.6) return "III";
  if (lat >= 12.4 && lat <= 13.6 && lng >= 78.2) return "III";
  // Coimbatore / Nilgiris / Tiruppur western region
  if (lat >= 10.9 && lat <= 11.9 && lng >= 76.2 && lng <= 77.2) return "III";
  // Kanyakumari / far south
  if (lat < 8.4 && lng >= 77.0 && lng <= 77.7) return "III";
  return "II";
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function earthquakeScoreForZone(zone: SeismicZone): number {
  return round1((CONFIG.zoneFactor[zone] / CONFIG.zoneMaxFactor) * 100);
}

export function tierFor(score: number) {
  return CONFIG.tiers.find((t) => score < t.max) ?? CONFIG.tiers[CONFIG.tiers.length - 1];
}

export function completeAssessment(
  raw: PropertyRiskPricingResult,
  coords: { latitude: number; longitude: number },
): PropertyRiskPricingResult {
  const result: PropertyRiskPricingResult = JSON.parse(JSON.stringify(raw));
  const hs = result.hazard_scores;

  // 1. Fill any missing hazard score with a labelled estimate
  if (!isNum(hs.earthquake?.score)) {
    const zone = seismicZoneFor(coords.latitude, coords.longitude);
    hs.earthquake = { score: earthquakeScoreForZone(zone), status: `estimated_from_seismic_zone_${zone}` };
  }
  if (!isNum(hs.flood?.score)) {
    hs.flood = { ...(hs.flood || ({} as any)), score: CONFIG.fallbackFlood, status: "estimated_regional_default" };
  }
  if (!isNum(hs.landslide?.score)) {
    hs.landslide = { ...(hs.landslide || ({} as any)), score: CONFIG.fallbackLandslide, status: "estimated_regional_default" };
  }

  // 2. Overall score (keep the database value if it already produced one)
  let overallScore = hs.overall?.score;
  if (!isNum(overallScore)) {
    const w = CONFIG.weights;
    overallScore = round1(
      hs.flood.score! * w.flood + hs.earthquake.score! * w.earthquake + hs.landslide.score! * w.landslide,
    );
    hs.overall = { score: overallScore, status: "estimated_weighted_average" };
  }

  // 3. Pricing
  const p = result.pricing;
  const replacement = result.property.replacement_value_inr;
  const baseRate = isNum(p?.base_rate) ? p.base_rate : 0.0015;
  const basePremium = isNum(p?.base_premium_inr) ? p.base_premium_inr : Math.round(replacement * baseRate);
  const tier = tierFor(overallScore);
  const exposure = isNum(p?.exposure_factor) ? p.exposure_factor : 1;

  const tierName = p?.risk_tier || tier.name;
  const multiplier = isNum(p?.risk_multiplier)
    ? p.risk_multiplier
    : (CONFIG.tiers.find((t) => t.name === tierName)?.multiplier ?? tier.multiplier);

  // Without verified polygons, the overall score stands in for the affected-area percentage
  const overlapPct = isNum(result.spatial_overlap?.hazard_overlap_percent)
    ? result.spatial_overlap.hazard_overlap_percent
    : overallScore;
  const expectedLoss = Math.round(replacement * exposure * Math.pow(overlapPct / 100, 2));

  result.pricing = {
    ...p,
    base_rate: baseRate,
    base_premium_inr: basePremium,
    risk_tier: tierName,
    tier_basis: p?.risk_tier ? p.tier_basis : "estimated_from_overall_score",
    risk_multiplier: multiplier,
    final_annual_premium_inr: isNum(p?.final_annual_premium_inr)
      ? p.final_annual_premium_inr
      : Math.round(basePremium * multiplier),
    exposure_factor: exposure,
    expected_loss_inr: isNum(p?.expected_loss_inr) ? p.expected_loss_inr : expectedLoss,
    expected_loss_status: isNum(p?.expected_loss_inr) ? p.expected_loss_status : "estimated_overall_score_as_overlap_proxy",
  };

  if (!isNum(result.spatial_overlap?.hazard_overlap_percent)) {
    result.spatial_overlap = {
      ...(result.spatial_overlap || ({} as any)),
      hazard_overlap_percent: round2(overlapPct),
      status: "estimated_from_overall_score_proxy",
      note: "No verified property polygon; overall hazard score used as an affected-area proxy.",
    };
  }

  // 4. Remove data-gap notes that are now covered by estimates (keep the exact-overlap caveat)
  result.missing_inputs = (result.missing_inputs || []).filter(
    (k: string) =>
      k !== "overall_score_requires_all_three_hazard_scores" &&
      !(k === "earthquake_pga_or_active_fault_distance") &&
      !(k === "landslide_slope_lsi_or_24h_rainfall" && hs.landslide.status === "estimated_regional_default") &&
      !(k === "flood_dfsi_or_matching_district" && hs.flood.status === "estimated_regional_default"),
  );
  if (!result.missing_inputs.includes("earthquake_estimated_from_seismic_zone") && hs.earthquake.status.startsWith("estimated_")) {
    result.missing_inputs.push("earthquake_estimated_from_seismic_zone");
  }

  return result;
}
