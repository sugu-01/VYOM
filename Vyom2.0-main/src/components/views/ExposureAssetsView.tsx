import React, { useState } from 'react';
import { AssetRecord, ConstructionCategory, TamilNaduMicroZoneId, AssetType } from '../../types/risk';
import { TAMIL_NADU_ZONES } from '../../data/tamilNaduGeodata';
import { formatINR, formatExactINR } from '../../utils/catRiskEngine';
import { supabaseService } from '../../services/supabaseClient';
import {
  Building2,
  Search,
  Filter,
  Plus,
  Upload,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle,
  FileText,
  FileCode,
} from 'lucide-react';

interface ExposureAssetsViewProps {
  assets: AssetRecord[];
  onRefreshAssets: () => void;
  selectedZone: TamilNaduMicroZoneId;
}

export const ExposureAssetsView: React.FC<ExposureAssetsViewProps> = ({
  assets,
  onRefreshAssets,
  selectedZone,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterZone, setFilterZone] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortField, setSortField] = useState<'name' | 'value' | 'zone'>('value');
  const [sortAsc, setSortAsc] = useState(false);

  // Import Modal State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importRawText, setImportRawText] = useState('');
  const [importType, setImportType] = useState<'csv' | 'geojson'>('csv');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [parsedPreviewAssets, setParsedPreviewAssets] = useState<AssetRecord[]>([]);

  // Add Asset Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newAsset, setNewAsset] = useState<Partial<AssetRecord>>({
    name: '',
    type: 'Commercial',
    zone: selectedZone,
    lat: TAMIL_NADU_ZONES[selectedZone].lat,
    lng: TAMIL_NADU_ZONES[selectedZone].lng,
    insuredValueInr: 50000000,
    constructionCategory: 'TN-RCC-2024',
    yearBuilt: 2022,
    plinthHeightMeters: 1.0,
    deductibleInr: 250000,
    limitInr: 50000000,
  });

  // Filter & Search
  const filteredAssets = assets
    .filter((a) => {
      const matchSearch =
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchZone = filterZone === 'all' || a.zone === filterZone;
      const matchType = filterType === 'all' || a.type === filterType;
      return matchSearch && matchZone && matchType;
    })
    .sort((a, b) => {
      if (sortField === 'value') {
        return sortAsc
          ? a.insuredValueInr - b.insuredValueInr
          : b.insuredValueInr - a.insuredValueInr;
      } else if (sortField === 'name') {
        return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      } else {
        return sortAsc ? a.zone.localeCompare(b.zone) : b.zone.localeCompare(a.zone);
      }
    });

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'id',
      'name',
      'type',
      'zone',
      'lat',
      'lng',
      'insured_value_inr',
      'construction_category',
      'year_built',
      'plinth_height_meters',
      'deductible_inr',
      'limit_inr',
    ];

    const rows = filteredAssets.map((a) => [
      a.id,
      `"${a.name.replace(/"/g, '""')}"`,
      a.type,
      a.zone,
      a.lat,
      a.lng,
      a.insuredValueInr,
      a.constructionCategory,
      a.yearBuilt,
      a.plinthHeightMeters,
      a.deductibleInr,
      a.limitInr,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VYOM_Assets_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Sample CSV Template Download
  const handleDownloadSampleCSV = () => {
    const sample = `id,name,type,zone,lat,lng,insured_value_inr,construction_category,year_built,plinth_height_meters,deductible_inr,limit_inr
AST-TN-SAMPLE-01,Madras Medical Research Center,Commercial,chennai,13.0827,80.2707,350000000,TN-RCC-2024,2018,1.5,5000000,350000000
AST-TN-SAMPLE-02,Cuddalore Coastal Cold Storage,Industrial,cuddalore,11.7480,79.7714,120000000,TN-Industrial-PEB,2020,0.8,2000000,120000000
AST-TN-SAMPLE-03,Thanjavur Delta Seed Silos,Agricultural,thanjavur,10.7870,79.1378,65000000,TN-Agri-Paddy,2016,0.5,1000000,65000000`;

    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'VYOM_Asset_Import_Template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  // CSV and GeoJSON Validation Engine
  const handleValidateImport = () => {
    const errors: string[] = [];
    const parsed: AssetRecord[] = [];

    if (!importRawText.trim()) {
      setValidationErrors(['Input data is empty. Please paste CSV text or GeoJSON.']);
      return;
    }

    if (importType === 'csv') {
      const lines = importRawText.trim().split('\n');
      if (lines.length < 2) {
        setValidationErrors(['CSV must contain a header row and at least one data row.']);
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const required = ['name', 'zone', 'lat', 'lng', 'insured_value_inr'];
      const missing = required.filter((r) => !headers.includes(r));
      if (missing.length > 0) {
        errors.push(`Missing mandatory CSV column headers: ${missing.join(', ')}`);
      }

      const nameIdx = headers.indexOf('name');
      const zoneIdx = headers.indexOf('zone');
      const latIdx = headers.indexOf('lat');
      const lngIdx = headers.indexOf('lng');
      const valIdx = headers.indexOf('insured_value_inr');
      const constrIdx = headers.indexOf('construction_category');
      const typeIdx = headers.indexOf('type');

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));

        const name = cols[nameIdx];
        const zone = (cols[zoneIdx] || '').toLowerCase() as TamilNaduMicroZoneId;
        const lat = parseFloat(cols[latIdx]);
        const lng = parseFloat(cols[lngIdx]);
        const value = parseFloat(cols[valIdx]);

        if (!name) {
          errors.push(`Row ${i + 1}: Name is required.`);
        }
        if (!TAMIL_NADU_ZONES[zone]) {
          errors.push(
            `Row ${i + 1}: Unknown zone "${zone}". Valid zones: ${Object.keys(TAMIL_NADU_ZONES).join(', ')}`
          );
        }
        // Geographic coordinate bounding check for Tamil Nadu (Lat 8° to 14°N, Lng 76° to 81°E)
        if (isNaN(lat) || lat < 8.0 || lat > 14.0) {
          errors.push(
            `Row ${i + 1}: Invalid latitude ${lat}. Must be within Tamil Nadu bounds (8.0°N to 14.0°N).`
          );
        }
        if (isNaN(lng) || lng < 76.0 || lng > 81.0) {
          errors.push(
            `Row ${i + 1}: Invalid longitude ${lng}. Must be within Tamil Nadu bounds (76.0°E to 81.0°E).`
          );
        }
        if (isNaN(value) || value <= 0) {
          errors.push(`Row ${i + 1}: Insured value must be a positive number.`);
        }

        if (errors.length === 0) {
          parsed.push({
            id: `AST-IMP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
            name: name,
            type: (cols[typeIdx] as AssetType) || 'Commercial',
            zone: zone,
            lat,
            lng,
            insuredValueInr: value,
            constructionCategory: (cols[constrIdx] as ConstructionCategory) || 'TN-RCC-2024',
            yearBuilt: 2020,
            plinthHeightMeters: 1.0,
            deductibleInr: Math.round(value * 0.01),
            limitInr: value,
            isDemonstrationData: false,
            createdAt: new Date().toISOString(),
          });
        }
      }
    } else {
      // GeoJSON validation
      try {
        const json = JSON.parse(importRawText);
        if (json.type !== 'FeatureCollection' || !Array.isArray(json.features)) {
          errors.push('GeoJSON must be a valid FeatureCollection with a features array.');
        } else {
          json.features.forEach((feat: any, idx: number) => {
            if (feat.geometry?.type !== 'Point' || !Array.isArray(feat.geometry.coordinates)) {
              errors.push(`Feature ${idx + 1}: Geometry must be a Point with [longitude, latitude].`);
            } else {
              const [lng, lat] = feat.geometry.coordinates;
              const props = feat.properties || {};
              const name = props.name || `Imported Asset ${idx + 1}`;
              const zone = (props.zone || 'chennai').toLowerCase() as TamilNaduMicroZoneId;
              const val = parseFloat(props.insured_value_inr || props.value || 50000000);

              if (lat < 8.0 || lat > 14.0 || lng < 76.0 || lng > 81.0) {
                errors.push(
                  `Feature ${idx + 1} (${name}): Coordinates [${lng}, ${lat}] outside Tamil Nadu boundary.`
                );
              } else {
                parsed.push({
                  id: `AST-GEO-${idx + 1}`,
                  name,
                  type: props.type || 'Commercial',
                  zone: TAMIL_NADU_ZONES[zone] ? zone : 'chennai',
                  lat,
                  lng,
                  insuredValueInr: val,
                  constructionCategory: props.constructionCategory || 'TN-RCC-2024',
                  yearBuilt: 2021,
                  plinthHeightMeters: 1.0,
                  deductibleInr: 500000,
                  limitInr: val,
                  isDemonstrationData: false,
                  createdAt: new Date().toISOString(),
                });
              }
            }
          });
        }
      } catch (err: any) {
        errors.push(`Invalid JSON formatting: ${err.message}`);
      }
    }

    setValidationErrors(errors);
    setParsedPreviewAssets(errors.length === 0 ? parsed : []);
  };

  const handleCommitImport = async () => {
    if (parsedPreviewAssets.length === 0) return;
    for (const asset of parsedPreviewAssets) {
      await supabaseService.saveAsset(asset);
    }
    setImportModalOpen(false);
    setImportRawText('');
    setParsedPreviewAssets([]);
    onRefreshAssets();
  };

  const handleSaveNewAsset = async () => {
    if (!newAsset.name || !newAsset.insuredValueInr) return;
    const toSave: AssetRecord = {
      id: `AST-TN-${Date.now().toString().slice(-5)}`,
      name: newAsset.name,
      type: newAsset.type || 'Commercial',
      zone: newAsset.zone || selectedZone,
      lat: Number(newAsset.lat) || 13.08,
      lng: Number(newAsset.lng) || 80.27,
      insuredValueInr: Number(newAsset.insuredValueInr),
      constructionCategory: newAsset.constructionCategory || 'TN-RCC-2024',
      yearBuilt: Number(newAsset.yearBuilt) || 2022,
      plinthHeightMeters: Number(newAsset.plinthHeightMeters) || 1.0,
      deductibleInr: Number(newAsset.deductibleInr) || 0,
      limitInr: Number(newAsset.limitInr) || Number(newAsset.insuredValueInr),
      isDemonstrationData: false,
      createdAt: new Date().toISOString(),
    };

    await supabaseService.saveAsset(toSave);
    setAddModalOpen(false);
    onRefreshAssets();
  };

  const handleDeleteAsset = async (id: string) => {
    if (confirm('Remove this asset from the portfolio exposure register?')) {
      await supabaseService.deleteAsset(id);
      onRefreshAssets();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg bg-[#0e131b] border border-[#1a2230]">
        <div>
          <h2 className="text-base font-semibold text-[#f8fafc]">
            Exposed Assets & Spatial Register
          </h2>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            Manage portfolio assets with verified coordinates (EPSG:4326), construction categories, and
            insured values.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadSampleCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#121822] hover:bg-[#1a2332] border border-[#232f42] text-xs font-mono text-[#cbd5e1] transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Sample CSV</span>
          </button>
          <button
            onClick={() => setImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#121822] hover:bg-[#1a2332] border border-[#232f42] text-xs font-mono text-[#cbd5e1] transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[#dfba4f]" />
            <span>Import CSV / GeoJSON</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#121822] hover:bg-[#1a2332] border border-[#232f42] text-xs font-mono text-[#cbd5e1] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-[#d4af37]/20 hover:bg-[#d4af37]/30 border border-[#d4af37]/50 text-xs font-mono text-[#dfba4f] transition-colors cursor-pointer font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Add Asset</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-[#64748b] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by asset name or identifier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded bg-[#0e131b] border border-[#1a2230] text-xs text-[#f8fafc] font-mono focus:border-[#d4af37] outline-none"
          />
        </div>

        {/* Filter Zone */}
        <div>
          <select
            value={filterZone}
            onChange={(e) => setFilterZone(e.target.value)}
            className="w-full py-2 px-3 rounded bg-[#0e131b] border border-[#1a2230] text-xs font-mono text-[#f8fafc] focus:border-[#d4af37] outline-none cursor-pointer"
          >
            <option value="all">All Micro-Zones</option>
            {Object.values(TAMIL_NADU_ZONES).map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Type */}
        <div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full py-2 px-3 rounded bg-[#0e131b] border border-[#1a2230] text-xs font-mono text-[#f8fafc] focus:border-[#d4af37] outline-none cursor-pointer"
          >
            <option value="all">All Asset Typologies</option>
            <option value="Commercial">Commercial</option>
            <option value="Industrial">Industrial</option>
            <option value="Residential">Residential</option>
            <option value="Critical Infrastructure">Critical Infrastructure</option>
            <option value="Agricultural">Agricultural</option>
          </select>
        </div>
      </div>

      {/* Assets Table */}
      <div className="rounded-lg bg-[#0e131b] border border-[#1a2230] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1a2230] bg-[#090b0e] text-[#64748b] font-mono uppercase text-[10px]">
                <th className="py-3 px-4">Asset Identifier & Name</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Micro-Zone</th>
                <th className="py-3 px-3">Coordinates (EPSG:4326)</th>
                <th className="py-3 px-3">Vulnerability Model</th>
                <th className="py-3 px-3">Plinth</th>
                <th className="py-3 px-3 text-right">Insured Value (TIV)</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141b25]">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-[#64748b] font-mono">
                    No assets matched your search query.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => {
                  const zone = TAMIL_NADU_ZONES[asset.zone];
                  return (
                    <tr key={asset.id} className="hover:bg-[#121822] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#f8fafc]">{asset.name}</div>
                        <div className="text-[10px] font-mono text-[#64748b] flex items-center gap-1.5 mt-0.5">
                          <span>{asset.id}</span>
                          {asset.isDemonstrationData && (
                            <span className="text-[9px] text-[#dfba4f] border border-[#d4af37]/30 px-1 rounded">
                              Demo Fixture
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[#cbd5e1] font-mono">{asset.type}</td>
                      <td className="py-3 px-3 font-mono text-[#94a3b8]">{zone?.name || asset.zone}</td>
                      <td className="py-3 px-3 font-mono text-[#64748b] text-[11px] tabular-nums">
                        {asset.lat.toFixed(4)}°N, {asset.lng.toFixed(4)}°E
                      </td>
                      <td className="py-3 px-3 font-mono text-[#dfba4f] text-[11px]">
                        {asset.constructionCategory}
                      </td>
                      <td className="py-3 px-3 font-mono text-[#cbd5e1] text-[11px] tabular-nums">
                        {asset.plinthHeightMeters}m
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[#f8fafc] font-semibold text-xs tabular-nums">
                        {formatINR(asset.insuredValueInr)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleDeleteAsset(asset.id)}
                          className="p-1 text-[#64748b] hover:text-rose-400 transition-colors cursor-pointer"
                          title="Remove Asset"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-lg bg-[#0e131b] border border-[#232f42] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1a2230] pb-3">
              <h3 className="text-sm font-semibold text-[#f8fafc]">
                Import Portfolio Exposure (CSV / GeoJSON)
              </h3>
              <button
                onClick={() => setImportModalOpen(false)}
                className="text-[#64748b] hover:text-[#f8fafc] text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setImportType('csv')}
                className={`py-1.5 px-3 rounded text-xs font-mono transition-colors cursor-pointer ${
                  importType === 'csv'
                    ? 'bg-[#d4af37]/20 text-[#dfba4f] border border-[#d4af37]/40'
                    : 'text-[#94a3b8] hover:bg-[#161f2c]'
                }`}
              >
                CSV Format
              </button>
              <button
                onClick={() => setImportType('geojson')}
                className={`py-1.5 px-3 rounded text-xs font-mono transition-colors cursor-pointer ${
                  importType === 'geojson'
                    ? 'bg-[#d4af37]/20 text-[#dfba4f] border border-[#d4af37]/40'
                    : 'text-[#94a3b8] hover:bg-[#161f2c]'
                }`}
              >
                GeoJSON FeatureCollection
              </button>
            </div>

            <div>
              <label className="block text-xs font-mono text-[#94a3b8] mb-1">
                Paste Raw {importType.toUpperCase()} Content:
              </label>
              <textarea
                rows={7}
                value={importRawText}
                onChange={(e) => setImportRawText(e.target.value)}
                placeholder={
                  importType === 'csv'
                    ? 'name,zone,lat,lng,insured_value_inr,construction_category...'
                    : '{"type": "FeatureCollection", "features": [...]}'
                }
                className="w-full p-3 rounded bg-[#090b0e] border border-[#1f293a] text-xs font-mono text-[#f8fafc] focus:border-[#d4af37] outline-none"
              />
            </div>

            {/* Validation Feedback */}
            {validationErrors.length > 0 && (
              <div className="p-3 rounded bg-rose-950/30 border border-rose-800/40 text-xs font-mono text-rose-300 space-y-1 max-h-32 overflow-y-auto">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Validation Invariant Errors:</span>
                </div>
                {validationErrors.map((err, i) => (
                  <div key={i} className="text-[11px] text-rose-200">
                    • {err}
                  </div>
                ))}
              </div>
            )}

            {parsedPreviewAssets.length > 0 && (
              <div className="p-3 rounded bg-emerald-950/20 border border-emerald-800/40 text-xs font-mono text-emerald-300 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Validation Passed: {parsedPreviewAssets.length} assets ready for write</span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1a2230]">
              <button
                onClick={handleValidateImport}
                className="py-1.5 px-3 rounded bg-[#161f2c] hover:bg-[#1e2a3c] text-xs font-mono text-[#cbd5e1] transition-colors cursor-pointer"
              >
                Validate Geometry & Bounds
              </button>
              <button
                onClick={handleCommitImport}
                disabled={parsedPreviewAssets.length === 0}
                className={`py-1.5 px-4 rounded text-xs font-mono transition-colors ${
                  parsedPreviewAssets.length > 0
                    ? 'bg-[#d4af37] hover:bg-[#dfba4f] text-[#0a0d13] font-semibold cursor-pointer'
                    : 'bg-[#1a2230] text-[#64748b] cursor-not-allowed'
                }`}
              >
                Confirm & Write to Database
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Asset Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-lg bg-[#0e131b] border border-[#232f42] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1a2230] pb-3">
              <h3 className="text-sm font-semibold text-[#f8fafc]">Register New Asset</h3>
              <button
                onClick={() => setAddModalOpen(false)}
                className="text-[#64748b] hover:text-[#f8fafc] text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#94a3b8] mb-1 font-mono">Asset Name</label>
                <input
                  type="text"
                  value={newAsset.name}
                  onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                  placeholder="e.g. SIPCOT Ennore Logistics Depot"
                  className="w-full py-1.5 px-2.5 rounded bg-[#090b0e] border border-[#1f293a] text-[#f8fafc] font-mono outline-none focus:border-[#d4af37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#94a3b8] mb-1 font-mono">Micro-Zone</label>
                  <select
                    value={newAsset.zone}
                    onChange={(e) => {
                      const z = e.target.value as TamilNaduMicroZoneId;
                      setNewAsset({
                        ...newAsset,
                        zone: z,
                        lat: TAMIL_NADU_ZONES[z].lat,
                        lng: TAMIL_NADU_ZONES[z].lng,
                      });
                    }}
                    className="w-full py-1.5 px-2.5 rounded bg-[#090b0e] border border-[#1f293a] text-[#f8fafc] font-mono outline-none focus:border-[#d4af37] cursor-pointer"
                  >
                    {Object.values(TAMIL_NADU_ZONES).map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#94a3b8] mb-1 font-mono">Asset Typology</label>
                  <select
                    value={newAsset.type}
                    onChange={(e) => setNewAsset({ ...newAsset, type: e.target.value as AssetType })}
                    className="w-full py-1.5 px-2.5 rounded bg-[#090b0e] border border-[#1f293a] text-[#f8fafc] font-mono outline-none focus:border-[#d4af37] cursor-pointer"
                  >
                    <option value="Commercial">Commercial</option>
                    <option value="Industrial">Industrial</option>
                    <option value="Residential">Residential</option>
                    <option value="Critical Infrastructure">Critical Infrastructure</option>
                    <option value="Agricultural">Agricultural</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#94a3b8] mb-1 font-mono">Insured Value (INR ₹)</label>
                  <input
                    type="number"
                    value={newAsset.insuredValueInr}
                    onChange={(e) =>
                      setNewAsset({ ...newAsset, insuredValueInr: Number(e.target.value) })
                    }
                    className="w-full py-1.5 px-2.5 rounded bg-[#090b0e] border border-[#1f293a] text-[#f8fafc] font-mono outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div>
                  <label className="block text-[#94a3b8] mb-1 font-mono">Vulnerability Curve</label>
                  <select
                    value={newAsset.constructionCategory}
                    onChange={(e) =>
                      setNewAsset({
                        ...newAsset,
                        constructionCategory: e.target.value as ConstructionCategory,
                      })
                    }
                    className="w-full py-1.5 px-2.5 rounded bg-[#090b0e] border border-[#1f293a] text-[#f8fafc] font-mono outline-none focus:border-[#d4af37] cursor-pointer"
                  >
                    <option value="TN-RCC-2024">TN-RCC-2024</option>
                    <option value="TN-Industrial-PEB">TN-Industrial-PEB</option>
                    <option value="TN-Masonry">TN-Masonry</option>
                    <option value="TN-Agri-Paddy">TN-Agri-Paddy</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#94a3b8] mb-1 font-mono">Latitude (°N)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newAsset.lat}
                    onChange={(e) => setNewAsset({ ...newAsset, lat: Number(e.target.value) })}
                    className="w-full py-1.5 px-2.5 rounded bg-[#090b0e] border border-[#1f293a] text-[#f8fafc] font-mono outline-none focus:border-[#d4af37]"
                  />
                </div>
                <div>
                  <label className="block text-[#94a3b8] mb-1 font-mono">Longitude (°E)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newAsset.lng}
                    onChange={(e) => setNewAsset({ ...newAsset, lng: Number(e.target.value) })}
                    className="w-full py-1.5 px-2.5 rounded bg-[#090b0e] border border-[#1f293a] text-[#f8fafc] font-mono outline-none focus:border-[#d4af37]"
                  />
                </div>
                <div>
                  <label className="block text-[#94a3b8] mb-1 font-mono">Plinth (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newAsset.plinthHeightMeters}
                    onChange={(e) =>
                      setNewAsset({ ...newAsset, plinthHeightMeters: Number(e.target.value) })
                    }
                    className="w-full py-1.5 px-2.5 rounded bg-[#090b0e] border border-[#1f293a] text-[#f8fafc] font-mono outline-none focus:border-[#d4af37]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#1a2230]">
              <button
                onClick={() => setAddModalOpen(false)}
                className="py-1.5 px-3 rounded text-xs font-mono text-[#94a3b8] hover:text-[#f8fafc] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNewAsset}
                className="py-1.5 px-4 rounded bg-[#d4af37] hover:bg-[#dfba4f] text-[#0a0d13] font-semibold font-mono text-xs cursor-pointer"
              >
                Save Asset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
