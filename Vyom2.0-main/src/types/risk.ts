/**
 * VYOM Catastrophe Risk Intelligence Platform
 * Core Type Definitions
 */

export type TamilNaduMicroZoneId =
  | 'chennai'
  | 'cuddalore'
  | 'nagapattinam'
  | 'thoothukudi'
  | 'tiruvallur'
  | 'kanchipuram'
  | 'thanjavur'
  | 'coimbatore'
  | 'nilgiris';

export type HazardLayerType = 'flood' | 'cyclone' | 'rainfall' | 'storm_surge';

export interface MicroZoneDetails {
  id: TamilNaduMicroZoneId;
  name: string;
  regionalTitle: string;
  lat: number;
  lng: number;
  coastal: boolean;
  elevationMeters: number;
  hazardScores: {
    flood: number; // 0 - 100
    cyclone: number; // 0 - 100
    rainfall: number; // 0 - 100
    storm_surge: number; // 0 - 100
  };
  totalExposedValueInr: number;
  expectedAnnualLossInr: number;
  vulnerabilityGrade: 'Extreme' | 'High' | 'Moderate' | 'Guarded';
  historicalEventsCount: number;
  primaryRiskDriver: string;
  svgPath: string; // Projected path for geospatial SVG map
  centerSvg: { x: number; y: number };
}

export type ConstructionCategory =
  | 'TN-RCC-2024'
  | 'TN-Masonry'
  | 'TN-Industrial-PEB'
  | 'TN-Agri-Paddy';

export type AssetType =
  | 'Commercial'
  | 'Industrial'
  | 'Residential'
  | 'Critical Infrastructure'
  | 'Agricultural';

export interface AssetRecord {
  id: string;
  name: string;
  type: AssetType;
  zone: TamilNaduMicroZoneId;
  lat: number;
  lng: number;
  insuredValueInr: number;
  constructionCategory: ConstructionCategory;
  yearBuilt: number;
  plinthHeightMeters: number;
  deductibleInr: number;
  limitInr: number;
  isDemonstrationData: boolean;
  createdAt: string;
}

export interface VulnerabilityPoint {
  intensity: number; // e.g. rainfall mm or wind km/h or surge m
  damageRatio: number; // 0.00 to 1.00 (0% to 100%)
}

export interface VulnerabilityCurveDef {
  id: ConstructionCategory;
  name: string;
  hazardType: 'flood' | 'wind' | 'surge';
  description: string;
  geographicSuitability: string;
  status: 'Proposed Calibration' | 'Verified TN Beta';
  sourceReference: string;
  curvePoints: VulnerabilityPoint[];
}

export interface LossAnatomyStep {
  stepNumber: number;
  title: string;
  metricLabel: string;
  metricValue: string | number;
  units: string;
  formulaOrMethod: string;
  intermediateValues: Record<string, string | number>;
  sourceAndVersion: string;
  assumptions: string;
  limitations: string;
}

export interface LossAnatomyTrace {
  assetId?: string;
  assetName: string;
  zoneId: TamilNaduMicroZoneId;
  hazardType: HazardLayerType;
  hazardIntensity: number;
  hazardUnits: string;
  insuredValueInr: number;
  damageRatioPct: number;
  grossDamageInr: number;
  netLossInr: number;
  ealInr: number;
  pml100Inr: number;
  technicalRateBps: number;
  steps: LossAnatomyStep[];
  isIllustrativeExample: boolean;
  computedAt: string;
}

export interface SimulationParameters {
  rainfallAnomalyPct: number; // -50% to +150%
  stormSurgeHeightMeters: number; // 0m to 6m
  windSpeedChangeKmh: number; // -30 to +80 km/h
  zoneId: TamilNaduMicroZoneId;
  assetInsuredValueInr: number;
  plinthInterventionMeters: number; // 0 to 2.5m
  constructionCategory: ConstructionCategory;
}

export interface SimulationResult {
  baselineGrossLossInr: number;
  scenarioGrossLossInr: number;
  absoluteChangeInr: number;
  percentageChange: number;
  baselineDamageRatioPct: number;
  scenarioDamageRatioPct: number;
  resilienceSavingsInr: number;
  exceedsBounds: boolean;
  boundaryWarning?: string;
}

export interface HistoricalEvent {
  id: string;
  name: string;
  year: number;
  type: 'Cyclone' | 'Extreme Flood' | 'Storm Surge' | 'Tsunami';
  affectedDistricts: string[];
  peakIntensity: string;
  estimatedEconomicLossInrCrore: number;
  insuredLossInrCrore: number;
  insuranceClaimRatioPct: number;
  keyLessons: string;
  dataConfidence: 'High' | 'Medium' | 'Synthesized Historical Record';
}

export interface DataTrustItem {
  id: string;
  datasetName: string;
  owner: string;
  licence: string;
  coverage: string;
  spatialResolution: string;
  timePeriod: string;
  freshnessTimestamp: string;
  unitsAndCRS: string;
  validationStatus: 'Verified Official' | 'Modelled Synthetic' | 'Research Beta';
  transformationVersion: string;
  limitations: string;
}

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  role: 'Catastrophe Risk Underwriter' | 'Risk Manager' | 'Actuary' | 'Auditor';
  organization: string;
  token?: string;
}
